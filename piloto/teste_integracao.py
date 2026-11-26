import os, subprocess, tempfile, json, time, urllib.request, uuid, concurrent.futures
from base64 import b64encode
with tempfile.TemporaryDirectory() as temp:
    pw=uuid.uuid4().hex
    env=dict(os.environ,SMARTSTOCK_DB=temp+'/db',SMARTSTOCK_USERS=json.dumps({u:dict(senha=pw,perfil=u) for u in ['gestor','operador','consulta']}))
    def start():
        proc=subprocess.Popen(['python3','piloto/app.py'],env=env,stderr=subprocess.DEVNULL)
        time.sleep(.4)
        assert proc.poll() is None
        return proc
    def api(user,data=None):
        headers={'Authorization':'Basic '+b64encode((user+':'+pw).encode()).decode(),'Content-Type':'application/json','X-SmartStock':'1'}
        req=urllib.request.Request('http://127.0.0.1:8080/api/estoque',headers=headers,data=json.dumps(data).encode() if data else None)
        try:
            with urllib.request.urlopen(req) as r: return r.status,json.load(r)
        except urllib.error.HTTPError as e: return e.code,None
    p=start()
    try:
        assert api('gestor',dict(tipo='Cadastro',sku='FO-1',nome='Papel',categoria='Escritório',unidade='un',local='Recife',minimo='2',pedido=uuid.uuid4().hex))[0]==200
        assert api('operador',dict(tipo='Entrada',sku='FO-1',local='Recife',qtd='10',pedido=uuid.uuid4().hex))[0]==200
        move=dict(tipo='Transferência',sku='FO-1',local='Recife',destino='Olinda',qtd='6',pedido=uuid.uuid4().hex)
        assert api('consulta',move)[0]==403
        assert api('operador',dict(move,tipo='Cadastro'))[0]==403
        assert api('operador',move)[0]==api('operador',move)[0]==200
        def debit(_): return api('operador',dict(move,tipo='Saída',qtd='4',pedido=uuid.uuid4().hex))[0]
        with concurrent.futures.ThreadPoolExecutor() as pool: assert sorted(pool.map(debit,range(2)))==[200,400]
        p.terminate();p.wait();p=start()
        status,state=api('consulta')
        assert status==200 and {r['local']:r['saldo'] for r in state['posicoes']}=={'RECIFE':0,'OLINDA':6000} and len(state['historico'])==4
        import sqlite3
        backup=temp+'/backup'
        with sqlite3.connect(env['SMARTSTOCK_DB']) as source, sqlite3.connect(backup) as dest: source.backup(dest)
        p.terminate();p.wait()
        env['SMARTSTOCK_DB']=backup
        p=start()
        assert api('consulta')[1]==state
        print('PASS API backup restaurado, cadastro/entrada, perfis, transferencia, retry, duas saidas, persistencia apos reinicio')
    finally: p.terminate();p.wait()
