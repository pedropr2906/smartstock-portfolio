'use strict';
const el = id => document.getElementById(id);
const cadastro = el('cadastro'), movimento = el('movimento');
const format = value => (value / 1000).toLocaleString('pt-BR');
let state;
function render() {
  const body = el('posicoes');
  body.replaceChildren();
  for (const p of state.posicoes) {
    const labels = [p.sku, p.nome, p.categoria, p.local];
    if (!labels.join(' ').toLocaleLowerCase().includes(el('busca').value.trim().toLocaleLowerCase())) continue;
    const row = body.insertRow();
    const status = p.saldo === 0 ? 'Sem estoque' : p.saldo <= p.minimo ? 'Repor' : 'Disponível';
    for (const value of [...labels, format(p.saldo) + ' ' + p.unidade, format(p.minimo), status]) row.insertCell().textContent = value;
  }
  if (!body.rows.length) {
    const cell = body.insertRow().insertCell();
    cell.colSpan = 7;
    cell.textContent = 'Nenhum produto encontrado.';
  }
}
async function refresh() {
  try {
    const response = await fetch('/api/estoque');
    if (!response.ok) throw Error();
    state = await response.json();
    render();
    const select = movimento.elements.posicao, previous = select.value;
    select.replaceChildren(...state.posicoes.map(p => new Option([p.sku,p.nome,p.local].join(' · '),JSON.stringify([p.sku,p.local]))));
    if ([...select.options].some(o => o.value === previous)) select.value = previous;
    movimento.querySelector('button').disabled = !select.value;
    cadastro.closest('section').hidden = state.perfil !== 'gestor';
    movimento.closest('section').hidden = state.perfil === 'consulta';
    const history = el('historico');
    history.replaceChildren();
    for (const e of state.historico) {
      const item = document.createElement('li');
      item.textContent = [new Date(e.instante.replace(' ','T')+'Z').toLocaleString('pt-BR'),e.autor,e.tipo,e.sku,e.origem,e.destino,e.tipo === 'Cadastro' ? '' : format(e.quantidade)].filter(Boolean).join(' · ');
      history.append(item);
    }
    if (!history.children.length) history.append(Object.assign(document.createElement('li'),{textContent:'Nenhum registro.'}));
    el('status').textContent = 'Saldos atualizados.';
  } catch {
    el('status').textContent = 'Falha ao consultar o servidor. Atualize os saldos para tentar novamente.';
  }
}
for (const form of [cadastro,movimento]) {
  let pending;
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const button = form.querySelector('button'), output = form.querySelector('output');
    if (button.disabled) return;
    const data = Object.fromEntries(new FormData(form));
    if (form === cadastro) data.tipo = 'Cadastro';
    else [data.sku,data.local] = JSON.parse(data.posicao);
    const signature = JSON.stringify(data);
    if (pending?.signature !== signature) pending = {signature,id:crypto.randomUUID()};
    button.disabled = true;
    try {
      const response = await fetch('/api/estoque',{method:'POST',headers:{'Content-Type':'application/json','X-SmartStock':'1'},body:JSON.stringify({...data,pedido:pending.id})});
      const result = await response.json();
      if (!response.ok) throw Error(result.erro || 'Falha no registro.');
      pending = null;
      form.reset();
      movimento.elements.tipo.dispatchEvent(new Event('change'));
      output.textContent = 'Registro confirmado.';
      await refresh();
    } catch (error) {
      output.textContent = error.message;
    } finally {
      button.disabled = form === movimento && !movimento.elements.posicao.value;
    }
  });
}
movimento.elements.tipo.addEventListener('change', () => {
  const input = movimento.elements.destino;
  input.required = movimento.elements.tipo.value === 'Transferência';
  input.parentElement.hidden = !input.required;
});
el('busca').addEventListener('input', () => state && render());
el('atualizar').addEventListener('click', refresh);
movimento.querySelector('button').disabled = true;
refresh();
