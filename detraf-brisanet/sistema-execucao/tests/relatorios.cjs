// Testes de Relatorios.gs (parte pura) sem Apps Script. Uso: node tests/relatorios.cjs
const fs = require('fs'), vm = require('vm'), path = require('path'), assert = require('assert');
const ctx = vm.createContext({ console });
['Modelo.gs', 'Calculo.gs', 'Persistencia.gs', 'Relatorios.gs'].forEach(f =>
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', f), 'utf8'), ctx, { filename: f }));
// Api_linhaEot vive em Api.gs; carrega só a função.
vm.runInContext(`function Api_linhaEot(e) { return { eot: e.eot, operadora: e.operadora, uf: e.uf, tipo: e.tipo, mapeada: e.mapeada,
  chamadas: e.chamadas, minutos: e.minutos, valor: Modelo_centavosParaReais(e.valorCentavos) }; }`, ctx);
const run = c => vm.runInContext(c, ctx);
let ok = 0; const t = (n, f) => { f(); ok++; console.log('ok  -', n); };

// Linha da aba Lancamentos na ordem de LANC_CAB
const lanc = (o) => { const r = Array(20).fill(''); const set = (k, v) => { r[run(`LANC_COL.${k}`)] = v; };
  Object.keys(o).forEach(k => set(k, o[k])); return r; };
const base = { chamadas: 10, minutos: 5, linhas: 1, usuario: 'u', data: '2026-11-19 10:00', hash_arquivos: 'h1', arquivos: 'a.csv', parser: 'p' };
ctx.L = [
  lanc({ ...base, id: 'L1-1', lote: 'L1', versao: 1, status: 'SUBSTITUIDO', periodo: '202610', tipo_brisanet: 'STFC', tipo_parceiro: 'STFC', holding: 'CLARO_FIXA', direcao: 'EMISSAO', valor: 100, chave: 'k1' }),
  lanc({ ...base, id: 'L2-1', lote: 'L2', versao: 2, status: 'ATIVO', periodo: '202610', tipo_brisanet: 'STFC', tipo_parceiro: 'STFC', holding: 'CLARO_FIXA', direcao: 'EMISSAO', valor: 150.5, chave: 'k1', data: '2026-11-20 09:00' }),
  lanc({ ...base, id: 'L2-2', lote: 'L2', versao: 1, status: 'ATIVO', periodo: '202610', tipo_brisanet: 'SMP', tipo_parceiro: 'SMP', holding: 'TIM_SA', direcao: 'RECEBIMENTO', valor: -40.25, chave: 'k2', data: '2026-11-20 09:00', chamadas: 3, minutos: 1.25 }),
  lanc({ ...base, id: 'L3-1', lote: 'L3', versao: 1, status: 'ESTORNADO', periodo: '202611', tipo_brisanet: 'SMP', tipo_parceiro: 'SMP', holding: 'TIM_SA', direcao: 'EMISSAO', valor: 999, chave: 'k3' })
];
ctx.lancs = run('L.map(function (r) { return Rel_linha(r); })');

t('linha: valor sempre positivo e operadora curta', () => {
  assert.strictEqual(run('lancs[2].valor'), 40.25);
  assert.strictEqual(run('lancs[1].operadora'), 'CLARO');
  assert.strictEqual(run('lancs[2].operadora'), 'TIM');
});
t('dashboard: só ATIVO entra; estornado e substituído ficam de fora', () => {
  const b = run('JSON.stringify(Rel_baseDashboard(lancs))');
  const m = JSON.parse(b).meses;
  assert.deepStrictEqual(Object.keys(m), ['202610']);          // 202611 só tem ESTORNADO
  assert.strictEqual(m['202610'].emissao, 150.5);               // a v1 (100) não conta
  assert.strictEqual(m['202610'].recebimento, 40.25);
  assert.strictEqual(m['202610'].chamadas, 13);
  assert.strictEqual(m['202610'].minutos, 6.3);                  // 5 + 1,25 arredondado a 1 casa
  assert.strictEqual(m['202610'].ops.CLARO.emissao, 150.5);
  assert.strictEqual(m['202610'].tipos.SMP.recebimento, 40.25);
});
t('dashboard: somas em reais não acumulam erro de ponto flutuante', () => {
  const r = run(`(function(){ var a=[]; for (var i=0;i<10;i++) a.push({status:'ATIVO',periodo:'202601',direcao:'EMISSAO',valor:0.1,chamadas:0,minutos:0,operadora:'X',tipoBrisa:'SMP'});
    return Rel_baseDashboard(a).meses['202601'].emissao; })()`);
  assert.strictEqual(r, 1);
});
t('consulta: mais recente primeiro e traz todos os status', () => {
  const c = JSON.parse(run('JSON.stringify(Rel_listaConsulta(lancs))'));
  assert.strictEqual(c.total, 4); assert.strictEqual(c.cortado, false);
  assert.strictEqual(c.linhas[0].data, '2026-11-20 09:00');
  assert.ok(c.linhas.some(l => l.status === 'ESTORNADO') && c.linhas.some(l => l.status === 'SUBSTITUIDO'));
});
t('histórico da chave: versões da mais nova para a mais antiga', () => {
  const h = JSON.parse(run(`JSON.stringify(Rel_historicoChave(lancs, 'k1'))`));
  assert.deepStrictEqual(h.map(x => x.versao), [2, 1]);
});
t('detalhe: soma por EOT só do lote+bloco pedidos', () => {
  ctx.mapa = { '001': { operadora: 'BRISANET', uf: 'CE', tipo: 'STFC', mapeada: true }, '100': { operadora: 'CLARO', uf: 'SP', tipo: 'STFC', mapeada: true } };
  const det = (b, r, ch, min, val, bloco, lote) => { const x = Array(21).fill(''); x[0] = b; x[1] = r; x[8] = ch; x[9] = min; x[14] = val; x[16] = bloco; x[17] = lote; x[19] = 'ATIVO'; return x; };
  ctx.det = [det('001', '100', 5, 2.5, 10.1, 'B1', 'L2'), det('001', '100', 3, 1, 0.2, 'B1', 'L2'), det('001', '100', 9, 9, 99, 'B1', 'L1'), det('001', '100', 9, 9, 99, 'B2', 'L2')];
  const r = JSON.parse(run(`JSON.stringify(Rel_resumoDetalhe(det, 'L2', 'B1', mapa))`));
  assert.strictEqual(r.linhas, 2);
  assert.strictEqual(r.credoras.length, 1); assert.strictEqual(r.credoras[0].eot, '001');
  assert.strictEqual(r.credoras[0].chamadas, 8); assert.strictEqual(r.credoras[0].minutos, 3.5);
  assert.strictEqual(r.credoras[0].valor, 10.3); assert.strictEqual(r.devedoras[0].operadora, 'CLARO');
});
console.log(`\n${ok} testes de relatórios passaram`);
