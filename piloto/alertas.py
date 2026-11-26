"""Entrega avisos pendentes via SMTP com TLS. Executar periodicamente no servidor."""
import argparse
import json
import os
import smtplib
import sqlite3
import ssl
import uuid
from contextlib import closing
from email.message import EmailMessage
from email.utils import parseaddr


def send(row, recipient):
    sender = os.environ["SMARTSTOCK_FROM"]
    if not recipient or parseaddr(recipient)[1] != recipient or "@" not in recipient:
        raise ValueError("Configure um destinatário válido para a unidade.")
    msg = EmailMessage()
    msg["From"], msg["To"] = sender, recipient
    msg["Message-ID"] = "<" + row["id"] + "@" + sender.rsplit("@",1)[-1] + ">"
    msg["Subject"] = "SmartStock | Estoque mínimo atingido"
    msg.set_content(f"Material: {row['material']}\nLocal: {row['local']}\nSaldo após a retirada: {row['saldo']} {row['medida']}\nMínimo: {row['minimo']} {row['medida']}\nProvidencie a compra para reposição.")
    with smtplib.SMTP_SSL(os.environ["SMARTSTOCK_SMTP_HOST"], int(os.getenv("SMARTSTOCK_SMTP_PORT","465")), timeout=15, context=ssl.create_default_context()) as smtp:
        smtp.login(os.environ["SMARTSTOCK_SMTP_USER"],os.environ["SMARTSTOCK_SMTP_PASSWORD"])
        smtp.send_message(msg)


def deliver(db, postgres, recipients, default, sender=send):
    table = "public.ss_email_estoque" if postgres else "ss_email_estoque"
    now = "extract(epoch from now())::bigint" if postgres else "unixepoch()"
    lock = " FOR UPDATE SKIP LOCKED" if postgres else ""
    mark = "%s" if postgres else "?"
    failures = 0
    for _ in range(100):
        token = uuid.uuid4().hex
        with (db.transaction() if postgres else db):
            row = db.execute(f"""UPDATE {table} SET token={mark},proxima={now}+300
              WHERE id=(SELECT id FROM {table} WHERE enviado=0 AND proxima<={now}
              ORDER BY proxima,id LIMIT 1{lock}) RETURNING *""",(token,)).fetchone()
        if not row:
            break
        try:
            recipient = recipients.get(str(row["unidade_id"]),default)
            sender(row,recipient)
            sent = 1
        except (OSError, smtplib.SMTPException, KeyError, ValueError):
            sent = 0
            failures += 1
        with (db.transaction() if postgres else db):
            db.execute(f"UPDATE {table} SET enviado={mark},proxima={now}+300,token=NULL WHERE id={mark} AND token={mark}",(sent,row["id"],token))
    return failures


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--postgres", action="store_true")
    args = parser.parse_args()
    if args.postgres:
        import psycopg
        from psycopg.rows import dict_row
        # Use transaction() below; Connection context would close after each batch.
        conn = psycopg.connect(os.environ["SMARTSTOCK_ALERT_DSN"], row_factory=dict_row, autocommit=True)
    else:
        conn = sqlite3.connect(os.environ["SMARTSTOCK_DB"], timeout=8)
        conn.row_factory = sqlite3.Row
    with closing(conn):
        failures = deliver(conn,args.postgres,json.loads(os.getenv("SMARTSTOCK_MANAGER_BY_UNIT","{}")),None if args.postgres else os.getenv("SMARTSTOCK_MANAGER_EMAIL"))
    if failures:
        raise SystemExit(f"{failures} aviso(s) aguardam nova tentativa. Confira destinatários e SMTP.")
