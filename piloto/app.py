"""Aplicação WSGI de estoque. Uma instalação e um banco por empresa."""
import base64
import hashlib
import hmac
import json
import os
import sqlite3
import unicodedata
from contextlib import closing
from decimal import Decimal, InvalidOperation
from pathlib import Path

ROOT = Path(__file__).resolve().parent
DB = os.environ["SMARTSTOCK_DB"]
USERS = json.loads(os.environ["SMARTSTOCK_USERS"])
if not USERS or any(not user or len(account["senha"]) < 12 or account["perfil"] not in ("gestor", "operador", "consulta") for user, account in USERS.items()):
    raise ValueError("Configure usuários, perfis e senhas individuais de pelo menos 12 caracteres.")
SCHEMA = """
CREATE TABLE IF NOT EXISTS product(sku TEXT PRIMARY KEY, nome TEXT, categoria TEXT, unidade TEXT, minimo INTEGER);
CREATE TABLE IF NOT EXISTS position(sku TEXT, local TEXT, saldo INTEGER NOT NULL CHECK(saldo BETWEEN 0 AND 1000000000000000), PRIMARY KEY(sku,local));
CREATE TABLE IF NOT EXISTS event(id INTEGER PRIMARY KEY, instante TEXT DEFAULT CURRENT_TIMESTAMP, autor TEXT, tipo TEXT, sku TEXT, origem TEXT, destino TEXT, quantidade INTEGER, pedido TEXT UNIQUE);
"""
with closing(sqlite3.connect(DB)) as db:
    db.executescript(SCHEMA)


def field(data, name, limit=60):
    value = data.get(name)
    if not isinstance(value, str) or not 0 < len(value.strip()) <= limit:
        raise ValueError("Campo inválido: " + name)
    return unicodedata.normalize("NFC", value.strip())


def quantity(value):
    try:
        number = Decimal(str(value))
        if number.is_finite() and 0 <= number <= 10**9 and number * 1000 == int(number * 1000):
            return int(number * 1000)
    except (ValueError, InvalidOperation):
        pass
    raise ValueError("Quantidade inválida. Use até três casas decimais.")


def apply(db, data, user, role):
    kind = field(data, "tipo")
    if role == "consulta" or (kind == "Cadastro" and role != "gestor"):
        raise PermissionError
    key = field(data, "pedido", 80)
    sku = field(data, "sku", 40).upper()
    location = field(data, "local").upper()
    db.execute("BEGIN IMMEDIATE")
    existing = db.execute("SELECT autor FROM event WHERE pedido=?", (key,)).fetchone()
    if existing:
        if existing[0] != user:
            raise ValueError("Identificador de operação em uso.")
        return
    target = ""
    if kind == "Cadastro":
        unit = field(data, "unidade")
        if unit not in ("un", "kg", "m", "L", "cx"):
            raise ValueError("Unidade inválida.")
        if db.execute("SELECT 1 FROM product WHERE sku=?", (sku,)).fetchone():
            raise ValueError("Código já cadastrado.")
        db.execute("INSERT INTO product VALUES(?,?,?,?,?)", (sku, field(data,"nome",100), field(data,"categoria"), unit, quantity(data.get("minimo"))))
        db.execute("INSERT INTO position VALUES(?,?,0)", (sku, location))
        qty = 0
    else:
        if kind not in ("Entrada", "Saída", "Transferência"):
            raise ValueError("Operação inválida.")
        qty = quantity(data.get("qtd"))
        row = db.execute("SELECT saldo FROM position WHERE sku=? AND local=?", (sku,location)).fetchone()
        if not qty or row is None or (kind != "Entrada" and row[0] < qty):
            raise ValueError("Confira o local, a quantidade e o saldo disponível.")
        if kind == "Transferência":
            target = field(data,"destino").upper()
            if target == location:
                raise ValueError("Origem e destino devem ser diferentes.")
            db.execute("INSERT INTO position VALUES(?,?,?) ON CONFLICT(sku,local) DO UPDATE SET saldo=saldo+excluded.saldo", (sku,target,qty))
        db.execute("UPDATE position SET saldo=saldo+? WHERE sku=? AND local=?", (qty if kind == "Entrada" else -qty,sku,location))
    db.execute("INSERT INTO event(autor,tipo,sku,origem,destino,quantidade,pedido) VALUES(?,?,?,?,?,?,?)", (user,kind,sku,location,target,qty,key))


def application(env, start):
    def reply(status, payload, mime="application/json", headers=()):
        start(status, [("Content-Type",mime), ("Cache-Control","no-store"), ("X-Content-Type-Options","nosniff"), *headers])
        return [payload if isinstance(payload,bytes) else json.dumps(payload,ensure_ascii=False).encode()]
    try:
        scheme, token = env.get("HTTP_AUTHORIZATION","").split()
        user, password = base64.b64decode(token,validate=True).decode().split(":",1)
        account = USERS.get(user,{})
        valid = hmac.compare_digest(hashlib.sha256(password.encode()).digest(), hashlib.sha256(account.get("senha","").encode()).digest())
        if scheme.lower() != "basic" or not valid or not account:
            raise ValueError
    except (ValueError, UnicodeError):
        return reply("401 Unauthorized", {}, headers=[("WWW-Authenticate",'Basic realm="SmartStock", charset="UTF-8"')])
    path = env["PATH_INFO"]
    method = env["REQUEST_METHOD"]
    assets = {"/":(ROOT/"index.html","text/html; charset=utf-8"), "/app.js":(ROOT/"app.js","text/javascript"), "/portfolio.css":(ROOT.parent/"portfolio.css","text/css")}
    if method == "GET" and path in assets:
        file, mime = assets[path]
        return reply("200 OK",file.read_bytes(),mime)
    if path != "/api/estoque":
        return reply("404 Not Found",{})
    try:
        with closing(sqlite3.connect(DB,timeout=8)) as db, db:
            if method == "POST":
                if env.get("CONTENT_TYPE") != "application/json" or env.get("HTTP_X_SMARTSTOCK") != "1":
                    return reply("415 Unsupported Media Type",{})
                length = int(env.get("CONTENT_LENGTH") or 0)
                if not 0 < length <= 8192:
                    return reply("413 Payload Too Large",{})
                data = json.loads(env["wsgi.input"].read(length))
                if not isinstance(data,dict):
                    raise ValueError("Formato inválido.")
                apply(db,data,user,account["perfil"])
                return reply("200 OK",{"ok":True})
            if method != "GET":
                return reply("405 Method Not Allowed",{})
            db.row_factory = sqlite3.Row
            db.execute("BEGIN")
            positions = db.execute("SELECT * FROM product JOIN position USING(sku) ORDER BY nome,local")
            rows = list(map(dict,positions))
            events = db.execute("SELECT instante,autor,tipo,sku,origem,destino,quantidade FROM event ORDER BY id DESC LIMIT 100")
            return reply("200 OK",dict(posicoes=rows,historico=list(map(dict,events)),perfil=account["perfil"]))
    except PermissionError:
        return reply("403 Forbidden",{"erro":"Perfil sem permissão."})
    except (ValueError,sqlite3.IntegrityError) as error:
        return reply("400 Bad Request",{"erro":str(error) if isinstance(error,ValueError) else "Limite de saldo excedido."})
    except sqlite3.OperationalError:
        return reply("503 Service Unavailable",{"erro":"Banco indisponível. Tente novamente."})


if __name__ == "__main__":
    from wsgiref.simple_server import make_server
    make_server("127.0.0.1", 8080, application).serve_forever()
