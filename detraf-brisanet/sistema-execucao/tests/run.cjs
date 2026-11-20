// Testes das camadas puras (Modelo, Parsers, Calculo, Validacao) sem Apps Script.
// Uso: node tests/run.cjs   (a partir de detraf-brisanet/sistema-execucao)
// Os dados abaixo são sintéticos; layout das colunas segue o Auditor (0,1,2,5,7,8,9,14).
const fs = require('fs'), vm = require('vm'), path = require('path'), assert = require('assert');
const ctx = vm.createContext({ console });
['Modelo.gs', 'Parsers.gs', 'Calculo.gs', 'Validacao.gs'].forEach(f =>
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', f), 'utf8'), ctx, { filename: f }));
const run = code => vm.runInContext(code, ctx);

// col: 0 eotB;1 eotR;2 mes;3;4;5 tipoRel;6;7 grupo;8 qtde;9 min;10-13;14 valor;15
const linha = (b, r, mes, tipo, qtde, min, valor) =>
  [b, r, mes, '', '', tipo, '', 'N', qtde, min, '0', '0', '0', '0', valor, ''].join(';');

let ok = 0;
const t = (nome, fn) => { fn(); ok++; console.log('ok  -', nome); };

t('moeda: milhar+vírgula, só vírgula, só ponto, aspas', () => {
  assert.strictEqual(run('Modelo_moedaParaCentavos("1.333,42")'), 133342);
  assert.strictEqual(run('Modelo_moedaParaCentavos("12,5")'), 1250);
  assert.strictEqual(run('Modelo_moedaParaCentavos("12.50")'), 1250);
  assert.strictEqual(run('Modelo_moedaParaCentavos("\\"1.000,00\\"")'), 100000);
  assert.ok(Number.isNaN(run('Modelo_moedaParaCentavos("abc")')));
});

const mapa = {
  '001': { operadora: 'BRISANET', uf: 'CE', tipo: 'STFC', mapeada: true },
  '100': { operadora: 'CLARO', uf: 'SP', tipo: 'STFC', mapeada: true }
};
ctx.mapa = mapa;

const csv = [
  'cabecalho;qualquer;coisa;a;b;tipo;x',                 // rejeitada (<6 colunas válidas / tipo != 0)
  linha('1', '100', '202610', '0', '10', '5,0', '1.000,50'),
  linha('1', '100', '202610', '0', '2', '1,0', '99,50'),
  linha('1', '100', '202610', '1', '0', '0', '5.000,00'),   // subtotal (tipo 1) → rejeitada
  linha('1', '100', '202610', '0', '1', '1,0', 'xx')         // valor inválido → rejeitada com motivo
].join('\n');

ctx.arq = { nome: 'CLARO_202610_C_ITX.csv', texto: csv, hash: 'h1' };

t('parser CSV: separa válidas e rejeitadas, soma em centavos', () => {
  const r = run('Parsers_ler(arq)');
  assert.strictEqual(r.ok, true);
  assert.strictEqual(r.registros.length, 2);
  assert.strictEqual(r.rejeitadas.length, 3);
  // 1.000,50 + 99,50 = 1.100,00 → 110000 centavos
  assert.strictEqual(r.registros.reduce((s, x) => s + x.valorCentavos, 0), 110000);
  assert.strictEqual(r.registros[0].eotBilhetagem, '001'); // normalizou EOT
  assert.strictEqual(r.registros[0].colunas.length, 16);
});

t('agrupar: direção EMISSAO quando brisanet é a bilhetagem; chave única', () => {
  ctx.leit = run('Parsers_ler(arq)');
  const ag = run('Calculo_agrupar(leit.registros, mapa)');
  assert.strictEqual(ag.grupos.length, 1);
  assert.strictEqual(ag.grupos[0].direcao, 'EMISSAO');
  assert.strictEqual(ag.grupos[0].chave, '202610|STFC|STFC|CLARO_FIXA|EMISSAO');
  assert.strictEqual(ag.totalCentavos, 110000);
  assert.strictEqual(ag.eotsNaoMapeadas.length, 0);
});

const ctxVal = (extra = {}) => Object.assign({
  periodoEsperado: '', hashesAprovados: {}, ativosPorChave: {}, anteriorPorSerie: {},
  limiteVariacaoPct: 30, toleranciaTotalCentavos: 1
}, extra);

t('validação: erro por valor não numérico bloqueia', () => {
  ctx.ag = run('Calculo_agrupar(leit.registros, mapa)');
  ctx.cv = ctxVal();
  const v = run('Validacao_executar([leit], ag, cv)');
  assert.ok(v.erros.some(e => e.codigo === 'VALOR_NAO_NUMERICO'));
  assert.strictEqual(v.podeAprovar, false);
});

t('validação: hash já aprovado bloqueia (idempotência)', () => {
  ctx.cv = ctxVal({ hashesAprovados: { h1: { lote: 'L1', data: '01/10/2026' } } });
  const v = run('Validacao_executar([leit], ag, cv)');
  assert.ok(v.erros.some(e => e.codigo === 'ARQUIVO_JA_APROVADO'));
});

// arquivo limpo
ctx.arq2 = { nome: 'CLARO_202610_C_ITX.csv', texto: linha('1', '100', '202610', '0', '10', '5,0', '1.000,00'), hash: 'h2' };
ctx.leit2 = run('Parsers_ler(arq2)');
ctx.ag2 = run('Calculo_agrupar(leit2.registros, mapa)');

t('validação: arquivo limpo aprova; avisa que não confere total declarado', () => {
  ctx.cv = ctxVal();
  const v = run('Validacao_executar([leit2], ag2, cv)');
  assert.strictEqual(v.podeAprovar, true);
  assert.ok(v.avisos.some(a => a.id === 'SEM_TOTAL_DECLARADO'));
});

t('validação: variação > limite e substituição de valor validado viram aviso', () => {
  ctx.cv = ctxVal({
    anteriorPorSerie: { 'STFC|STFC|CLARO_FIXA|EMISSAO': 50000 },
    ativosPorChave: { '202610|STFC|STFC|CLARO_FIXA|EMISSAO': { valorCentavos: 90000, hash: 'x', lote: 'L0' } }
  });
  const v = run('Validacao_executar([leit2], ag2, cv)');
  assert.ok(v.avisos.some(a => a.id.startsWith('VARIACAO:')));
  assert.ok(v.avisos.some(a => a.id.startsWith('SUBSTITUI_VALIDADO:')));
  assert.strictEqual(v.podeAprovar, true);
});

t('validação: dois períodos no lote bloqueia', () => {
  ctx.arq3 = { nome: 'X.csv', texto: linha('1', '100', '202610', '0', '1', '1,0', '1,00') + '\n' + linha('1', '100', '202611', '0', '1', '1,0', '1,00'), hash: 'h3' };
  ctx.leit3 = run('Parsers_ler(arq3)');
  ctx.ag3 = run('Calculo_agrupar(leit3.registros, mapa)');
  ctx.cv = ctxVal();
  const v = run('Validacao_executar([leit3], ag3, cv)');
  assert.ok(v.erros.some(e => e.codigo === 'MULTIPLOS_PERIODOS'));
});

t('parser: formato não reconhecido não derruba (erro isolado)', () => {
  ctx.arq4 = { nome: 'nota.pdf', texto: '%PDF-1.4 ...', hash: 'h4' };
  const r = run('Parsers_ler(arq4)');
  assert.strictEqual(r.ok, false);
  assert.ok(/não reconhecido/.test(r.erro));
});

console.log('\n' + ok + ' testes passaram');
