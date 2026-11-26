"""Prepara o cenário sintético em banco de homologação vazio, uma única vez."""
from contextlib import closing
import sqlite3
from app import DB, apply

def seed(db):
    # apply inicia a transação; as duas operações são confirmadas juntas.
    sku = "TESTE-LUVAS"
    prefix = "homologacao-luvas-v1"
    with db:
        if db.execute("SELECT 1 FROM event WHERE pedido=?", (prefix+"-entrada",)).fetchone():
            return
        if db.execute("SELECT 1 FROM product LIMIT 1").fetchone():
            raise SystemExit("Use um banco vazio dedicado à homologação.")
        apply(db,dict(tipo="Cadastro",sku=sku,local="Almoxarifado",nome="Luva de proteção",categoria="EPI",unidade="par",minimo=5,pedido=prefix+"-cadastro"),"homologacao","gestor")
        db.execute("INSERT INTO event(autor,tipo,sku,origem,destino,quantidade,pedido) VALUES(?,?,?,?,?,?,?)",
                   ("homologacao","Entrada",sku,"ALMOXARIFADO","",8000,prefix+"-entrada"))
        db.execute("UPDATE position SET saldo=8000 WHERE sku=? AND local='ALMOXARIFADO'",(sku,))

if __name__ == "__main__":
    with closing(sqlite3.connect(DB)) as connection:
        seed(connection)
