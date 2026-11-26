(() => {
  const panel = document.createElement('section');
  panel.id = 'operacoes';
  panel.className = 'hide';
  panel.innerHTML = `
    <div class="operation-grid">
      <div class="panel">
        <h2>Entrada em lote</h2>
        <form id="demo-lot">
          <label>Material <select name="kind"><option value="equipment">Rastreador</option><option value="chips">Chip</option><option value="tags">Tag</option></select></label>
          <label>Unidade <select name="unit"></select></label>
          <label>Identificadores fictícios
            <textarea name="ids" rows="4" required placeholder="Um identificador por linha"></textarea>
          </label>
          <small>Informe 15 dígitos para rastreadores e tags, ou 19–20 para chips.</small>
          <button class="btn" type="submit">Registrar lote</button>
        </form>
        <ul id="demo-lot-history"></ul>
      </div>
      <div class="panel">
        <h2>Transferir rastreador</h2>
        <form id="demo-transfer">
          <label>Rastreador disponível <select name="asset" required></select></label>
          <label>Unidade de destino <select name="unit"></select></label>
          <button class="btn" type="submit">Enviar para conferência</button>
        </form>
        <h3>Conferência e histórico</h3>
        <div id="demo-transfer-history"></div>
      </div>
    </div>
    <output id="demo-operation-notice" role="status"></output>`;
  document.querySelector('main').append(panel);

  const units = ['Unidade Central', 'Unidade Norte', 'Unidade Sul', 'Unidade Regional', 'Unidade Oeste'];
  const labels = { equipment: 'Rastreador', chips: 'Chip', tags: 'Tag' };
  const keys = { equipment: 'imei', chips: 'iccid', tags: 'id' };
  const lot = panel.querySelector('#demo-lot');
  const transfer = panel.querySelector('#demo-transfer');
  const notice = panel.querySelector('output');
  for (const select of [lot.elements.unit, transfer.elements.unit]) {
    select.replaceChildren(...units.map(unit => new Option(unit, unit)));
  }
  db.demoLots ??= [];
  db.demoTransfers ??= [];

  const pending = id => db.demoTransfers.some(item => item.asset === id && item.status === 'Em trânsito');
  const available = asset => asset.status === 'PRONTO' && units.includes(asset.local) && !pending(asset.imei);
  const announce = message => { notice.textContent = message; };

  function refresh() {
    const assets = db.equipment.filter(available);
    const select = transfer.elements.asset;
    const selectedAsset = select.value;
    select.replaceChildren(...assets.map(asset => new Option(asset.imei + ' · ' + asset.local, asset.imei)));
    if (assets.some(asset => asset.imei === selectedAsset)) select.value = selectedAsset;
    if (!assets.length) select.add(new Option('Nenhum rastreador pronto', ''));
    transfer.querySelector('button').disabled = !assets.length;

    panel.querySelector('#demo-lot-history').replaceChildren(...db.demoLots.slice(0, 12).map(item => {
      const li = document.createElement('li');
      li.textContent = item.id + ' · ' + labels[item.kind] + ' · ' + item.count + ' item(ns) · ' + item.unit;
      return li;
    }));

    panel.querySelector('#demo-transfer-history').replaceChildren(...db.demoTransfers.map(item => {
      const entry = document.createElement('article');
      const summary = document.createElement('p');
      summary.textContent = item.id + ' · ' + item.asset + ' · ' + item.from + ' → ' + item.to + ' · ' + item.status
        + (item.reason ? ' · ' + item.reason : '');
      entry.append(summary);
      if (item.status === 'Em trânsito') {
        const actions = document.createElement('div');
        actions.className = 'operation-actions';
        for (const [label, accepted] of [['Confirmar recebimento', true], ['Recusar recebimento', false]]) {
          const button = document.createElement('button');
          button.type = 'button';
          button.className = 'btn';
          button.textContent = label;
          button.onclick = () => reconcile(item, accepted);
          actions.append(button);
        }
        entry.append(actions);
      }
      return entry;
    }));
  }

  function reconcile(item, accepted) {
    if (item.status !== 'Em trânsito') return;
    const asset = db.equipment.find(entry => entry.imei === item.asset);
    if (!asset || asset.local !== item.from || asset.status !== 'PRONTO') {
      announce('O rastreador mudou de situação após o envio. Revise a custódia no cadastro.');
      return;
    }
    const reason = accepted ? '' : window.prompt('Informe o motivo da recusa:')?.trim();
    if (!accepted && !reason) return;
    item.status = accepted ? 'Recebido' : 'Recusado';
    item.reason = reason;
    if (accepted) asset.local = item.to;
    log('CONFERÊNCIA DE TRANSFERÊNCIA', item.asset, 'Equipe demonstrativa', item.status + ' · ' + item.id);
    save();
    refresh();
    announce(accepted ? 'Recebimento confirmado e custódia atualizada.' : 'Recusa registrada. O rastreador está disponível na origem.');
  }

  lot.onsubmit = event => {
    event.preventDefault();
    const { kind, unit, ids } = Object.fromEntries(new FormData(lot));
    const values = ids.split(/\r?\n/).map(value => value.trim()).filter(Boolean);
    const pattern = kind === 'chips' ? /^\d{19,20}$/ : /^\d{15}$/;
    if (!values.length || values.some(value => !pattern.test(value))) {
      announce('Confira o tamanho dos identificadores. Nenhum registro foi gravado.');
      return;
    }
    const collection = db[kind];
    if (new Set(values).size !== values.length || values.some(value => collection.some(item => item[keys[kind]] === value))) {
      announce('Há identificadores duplicados. Nenhum registro foi gravado.');
      return;
    }
    const id = 'LT-' + (db.demoLots.length + 1);
    for (const value of values) {
      const common = { portfolioDemo: true, autor: 'Equipe demonstrativa', lote: id };
      if (kind === 'equipment') collection.push({ ...common, imei: value, modelo: 'Rastreador Demo', status: 'PRONTO', local: unit, origem: 'Novo', chip: null });
      if (kind === 'chips') collection.push({ ...common, iccid: value, linha: 'Não informado', operadora: 'Demonstração', local: unit, imei: null });
      if (kind === 'tags') collection.push({ ...common, id: value, modelo: 'TAG', status: 'PRONTO', local: unit, ativacao: 'NÃO CONFIRMADA' });
    }
    db.demoLots.unshift({ id, kind, unit, count: values.length });
    log('ENTRADA EM LOTE', id, 'Equipe demonstrativa', labels[kind] + ' · ' + unit + ' · ' + values.length + ' item(ns)');
    lot.elements.ids.value = '';
    save();
    refresh();
    announce(id + ' registrado.');
  };

  transfer.onsubmit = event => {
    event.preventDefault();
    const asset = db.equipment.find(item => item.imei === transfer.elements.asset.value);
    const to = transfer.elements.unit.value;
    if (!asset || !available(asset) || asset.local === to) {
      announce('Selecione um rastreador pronto e um destino diferente da origem.');
      return;
    }
    const id = 'TR-' + (db.demoTransfers.length + 1);
    db.demoTransfers.unshift({ id, asset: asset.imei, from: asset.local, to, status: 'Em trânsito' });
    log('ENVIO DE TRANSFERÊNCIA', asset.imei, 'Equipe demonstrativa', id + ' · ' + asset.local + ' → ' + to);
    save();
    refresh();
    announce(id + ' aguardando conferência.');
  };

  document.addEventListener('DOMContentLoaded', () => {
    const nav = document.getElementById('nav');
    nav.querySelector('[data-tab="operacoes"]').addEventListener('click', refresh);
    function openSection() {
      const target = location.hash.slice(1);
      for (const button of nav.querySelectorAll('button[data-tab]')) {
        if (button.dataset.tab === target) button.click();
      }
    }
    openSection();
    window.addEventListener('hashchange', openSection);
  });
})();
