'use strict';
const products = [
  ['P-101', 'Luva de proteção', 'Suprimentos', 'par', 5, 'Almoxarifado', 8],
  ['P-102', 'Cabo de rede', 'Manutenção', 'm', 15, 'Oficina', 10],
  ['P-103', 'Caixa para expedição', 'Embalagens', 'cx', 4, 'Depósito', 12]
].map(([sku, nome, categoria, unidade, minimo, local, saldo]) => ({
  sku, nome, categoria, unidade, minimo, locais: new Map([[local, saldo * 1000]])
}));
const cadastro = document.querySelector('#cadastro');
const movimento = document.querySelector('#movimento');
const busca = document.querySelector('#busca');
const historico = [];
const normal = value => value.trim().normalize('NFC').toLocaleLowerCase('pt-BR');
const format = n => n.toLocaleString('pt-BR', {maximumFractionDigits: 3});
function display() {
  const body = document.querySelector('#posicoes');
  const select = movimento.elements.posicao;
  const previous = select.value;
  body.replaceChildren();
  select.replaceChildren();
  for (const p of products) {
    for (const [local, units] of p.locais) {
      const key = JSON.stringify([p.sku, local]);
      select.add(new Option(p.sku + ' · ' + p.nome + ' · ' + local, key));
      if (key === previous) select.value = key;
      const fields = [p.sku, p.nome, p.categoria, local];
      if (!normal(fields.join(' ')).includes(normal(busca.value))) continue;
      const saldo = units / 1000;
      const row = body.insertRow();
      for (const field of [...fields, format(saldo) + ' ' + p.unidade, format(p.minimo), saldo === 0 ? 'Sem estoque' : saldo <= p.minimo ? 'Repor' : 'Disponível']) {
        row.insertCell().textContent = field;
      }
    }
  }
  if (!body.rows.length) {
    const cell = body.insertRow().insertCell();
    cell.colSpan = 7;
    cell.textContent = 'Nenhum produto encontrado.';
  }
}
function message(form, text) {
  form.querySelector('output').textContent = text;
}
cadastro.addEventListener('submit', event => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(cadastro));
  const [sku, nome, categoria, local] = [data.sku, data.nome, data.categoria, data.local].map(v => v.trim());
  if (![sku, nome, categoria, local].every(Boolean)) return message(cadastro, 'Preencha todos os campos.');
  if (products.some(p => normal(p.sku) === normal(sku))) return message(cadastro, 'Este código já existe.');
  products.push({sku, nome, categoria, unidade: data.unidade, minimo: Number(data.minimo), locais: new Map([[local, 0]])});
  cadastro.reset();
  display();
  movimento.elements.posicao.value = JSON.stringify([sku, local]);
  message(cadastro, 'Produto cadastrado. Registre a primeira entrada.');
});
const destination = movimento.elements.destino;
movimento.elements.tipo.addEventListener('change', () => {
  destination.required = movimento.elements.tipo.value === 'Transferência';
  destination.parentElement.hidden = !destination.required;
});
movimento.addEventListener('submit', event => {
  event.preventDefault();
  const [sku, local] = JSON.parse(movimento.elements.posicao.value);
  const p = products.find(item => item.sku === sku);
  const tipo = movimento.elements.tipo.value;
  const qty = Math.round(Number(movimento.elements.qtd.value) * 1000);
  const balance = p.locais.get(local);
  if (qty <= 0 || !Number.isSafeInteger(qty)) return message(movimento, 'Informe uma quantidade válida.');
  if (tipo !== 'Entrada' && qty > balance) return message(movimento, 'Saldo insuficiente no local de origem.');
  let path = local;
  if (tipo === 'Transferência') {
    const name = destination.value.trim();
    if (!name || normal(name) === normal(local)) return message(movimento, 'Escolha um destino diferente da origem.');
    const target = [...p.locais.keys()].find(k => normal(k) === normal(name)) ?? name;
    p.locais.set(target, (p.locais.get(target) ?? 0) + qty);
    path += ' → ' + target;
  }
  p.locais.set(local, balance + (tipo === 'Entrada' ? qty : -qty));
  const current = p.locais.get(local) / 1000;
  if (tipo !== 'Entrada' && balance / 1000 > p.minimo && current <= p.minimo) {
    const aviso = document.querySelector('#aviso');
    aviso.hidden = false;
    aviso.querySelector('p').textContent = p.nome + ' · ' + local + ' · Saldo: ' + format(current) + ' ' + p.unidade + '. Mínimo: ' + format(p.minimo) + ' ' + p.unidade + '. Providencie a compra para reposição. Simulação sem envio.';
  }
  const entry = document.createElement('li');
  entry.textContent = [new Date().toLocaleTimeString('pt-BR'), tipo, p.sku, format(qty / 1000) + ' ' + p.unidade, path].join(' · ');
  const log = document.querySelector('#historico');
  if (!historico.length) log.replaceChildren();
  historico.push(entry.textContent);
  log.prepend(entry);
  movimento.elements.qtd.value = '';
  display();
  message(movimento, 'Movimento registrado.');
});
busca.addEventListener('input', display);
display();
