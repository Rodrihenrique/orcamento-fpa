// Testes das camadas puras (Modelo, Parsers, Calculo, Validacao) sem Apps Script.
// Uso: node tests/run.cjs   (a partir de detraf-brisanet/sistema-execucao)
// Os dados abaixo são sintéticos; layout das colunas segue o Auditor (0,1,2,5,7,8,9,14).
const fs = require('fs'), vm = require('vm'), path = require('path'), assert = require('assert');
const ctx = vm.createContext({ console });
['Modelo.gs', 'CtTotal.gs', 'Parsers.gs', 'Calculo.gs', 'Validacao.gs'].forEach(f =>
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

// ---- formatos reais (layouts vistos em out/2026, dados sintéticos) ----------------
t('CT: texto de PDF e RTF → centavos', () => {
  ctx.ct1 = 'Estamos encaminhando ... com a BRISANET SMP, no valor de R$ 2.238,30 (dois mil duzentos)';
  assert.strictEqual(run('CtTotal_extrairDeTexto(ct1)'), 223830);
  ctx.rtf = '{\\rtf1 Estamos encaminhando, no valor de R$ 1.480,45 (um mil quatrocentos e oitenta)\\par }';
  assert.strictEqual(run('CtTotal_extrairDeRtf(rtf)'), 148045);
  assert.strictEqual(run('CtTotal_extrairDeTexto("sem valor")'), null);
});

t('CSV Vivo (21 colunas, cabeçalho, linha 01 = total) → total declarado do próprio arquivo', () => {
  const cab = 'Credora;Devedora;Referencia;Trafego;POI;Rel;DESC;GH;Chamadas;Minutos;Tarifa;R$_Liq;PIS_Cofins;ICMS;R$_Bruto;CN;CBS;IBS_M;IBS_E;EOT_Ponta;Corredor';
  const d = (b) => ['454', 'J71', '202610', '202608', 'BRI012I', '00', 'LENV', 'N', '000000000569', '000000000588,6', '0,01499', '0', '0', '0', b, '84', '', '', '', '', ''].join(';');
  const tot = 'VIVO;BRISANET;202610;;;01;;;000000000569;000000000588,6;;0;0;0;0000000000018,00;;;;;;';
  ctx.v = { nome: 'VIVO.csv', texto: [cab, d('0000000000009,15'), d('0000000000008,85'), tot].join('\n'), hash: 'v' };
  const r = run('Parsers_ler(v)');
  assert.strictEqual(r.registros.length, 2);
  assert.strictEqual(r.totalDeclaradoCentavos, 1800);
  assert.strictEqual(r.fonteTotal, 'arquivo');
  assert.strictEqual(r.registros.reduce((s, x) => s + x.valorCentavos, 0), 1800);
});

t('CSV SURF: subtotais por EOT + linha final sem EOT → usa a final', () => {
  const l = ['A47;J72;202610;202610;SMS;00; LENS;N;155;0,0;0,05000;7,75000;0,00000;0,00000;7,75000',
    'A47;;;;;01;;;155;0,0;;7,75000;0,00000;0,00000;7,75000', 'A58;;;;;01;;;167;0,0;;8,35000;0,00000;0,00000;8,35000',
    ';;;;;01;;;322;0,0;;16,10000;0,00000;0,00000;16,10000'];
  ctx.s = { nome: 'RELAM_SMS_SURF.csv', texto: l.join('\n'), hash: 's' };
  const r = run('Parsers_ler(s)');
  assert.strictEqual(r.totalDeclaradoCentavos, 1610);
  assert.strictEqual(r.registros[0].tipoServico, 'SMS');
});

t('CSV OI sem cabeçalho: primeira linha não se perde; total vem da carta CT', () => {
  ctx.o = { nome: 'OI.csv', texto: '084;J71;202609;202609;RNTIE46B;0;LENC;R;1108;2602,4;0,00211;5,49;0,21;0;5,7;84;\n085;J72;202609;202609;CETII494;0;LENP;N;36;235,4;0,01577;0,57;0,02;0;0,59;80;',
    hash: 'o', totalDeclaradoCentavos: 629, fonteTotal: 'carta CT (rtf)' };
  const r = run('Parsers_ler(o)');
  assert.strictEqual(r.registros.length, 2);
  assert.strictEqual(r.registros[0].valorCentavos, 570);
  assert.strictEqual(r.totalDeclaradoCentavos, 629);
  assert.strictEqual(r.fonteTotal, 'carta CT (rtf)');
});

t('XLS Claro (aba DETRAF + RESUMO › Total Geral) → mesmo modelo padrão', () => {
  const cab = ['EOT Credora', 'EOT Devedora', 'Período de Referência', 'Período de Tráfego', 'Ponto de Interconexão', 'Tipo Relatório', 'Descritor de CDR', 'Grupo Horário', 'Chamadas', 'Duração em Minutos', 'Tarifa Aplicável', 'Valor Líquido', 'Valor COFINS e PIS', 'Valor ICMS', 'Valor Bruto'];
  const l1 = ['001', 'J71', '202610', '202609', 'HRCB7024', '00', 'LENI', 'D', 3453, 4194.2, 0.00715, 29.99, 1.43, 7.86, 39.28];
  const l2 = ['001', 'J71', '202610', '202609', 'HRCB7024', '00', 'LENI', 'SR', 132, 121.7, 0.00715, 0.87, 0.04, 0.23, 1.14];
  ctx.x = { nome: 'DETRAF CLARO STFC LD X BRISANET SMP 202610.xls', hash: 'x', planilha: { abas: {
    RESUMO: [[], ['Valores'], ['EOT Credora', 'EOT Devedora', 'Soma de Chamadas', 'Soma de Duração', 'Soma de Valor Bruto'], ['001', 'J71', 3585, 4315.9, 40.42], ['Total Geral', '', 3585, 4315.9, 40.42]],
    DETRAF: [cab, l1, l2] } } };
  const r = run('Parsers_ler(x)');
  assert.strictEqual(r.parserId, 'detraf-planilha');
  assert.strictEqual(r.registros.length, 2);
  assert.strictEqual(r.registros[1].grupoHorario, 'S');          // SR → S
  assert.strictEqual(r.registros[0].colunas.length, 16);
  assert.strictEqual(r.totalDeclaradoCentavos, 4042);
  assert.strictEqual(r.registros.reduce((s, x) => s + x.valorCentavos, 0), 4042);
});

t('título de bloco: credora primeiro', () => {
  ctx.gg = { direcao: 'RECEBIMENTO', tipoBrisa: 'STFC', tipoParceiro: 'STFC', holding: 'TIM_SA' };
  assert.strictEqual(run('Calculo_tituloBloco(gg)'), 'TIM STFC - brisanet STFC');
  ctx.gg = { direcao: 'EMISSAO', tipoBrisa: 'SMP', tipoParceiro: 'SMS', holding: 'TELEFONICA_MOVEL' };
  assert.strictEqual(run('Calculo_tituloBloco(gg)'), 'brisanet SMP - VIVO SMS');
});

t('detalhe por EOT: credoras e devedoras somam o grupo, com operadora/UF/tipo do mapa', () => {
  const g = run('Calculo_agrupar(leit.registros, mapa)').grupos[0];
  const soma = l => l.reduce((s, e) => s + e.valorCentavos, 0);
  assert.strictEqual(soma(g.credoras), g.totalCentavos);
  assert.strictEqual(soma(g.devedoras), g.totalCentavos);
  assert.strictEqual(g.credoras.length, 1);
  assert.strictEqual(g.credoras[0].eot, '001');
  assert.strictEqual(g.credoras[0].operadora, 'BRISANET');
  assert.strictEqual(g.credoras[0].uf, 'CE');
  assert.strictEqual(g.devedoras[0].eot, '100');
  assert.strictEqual(g.devedoras[0].operadora, 'CLARO');
  assert.strictEqual(g.credoras[0].chamadas, g.chamadas);
});

t('detalhe por EOT: EOT fora do mapa aparece marcada como não mapeada', () => {
  ctx.regs = [{ eotBilhetagem: '999', eotRelacionada: '001', chamadas: 3, minutos: 1.25, valorCentavos: 500, tipoServico: 'FIXA' },
              { eotBilhetagem: '999', eotRelacionada: '001', chamadas: 2, minutos: 0.5, valorCentavos: 250, tipoServico: 'FIXA' }];
  const l = run("Calculo_resumoEots(regs, 'eotBilhetagem', mapa, 'CLARO')");
  assert.strictEqual(l.length, 1);
  assert.strictEqual(l[0].mapeada, false);
  assert.strictEqual(l[0].chamadas, 5);
  assert.strictEqual(l[0].minutos, 1.8);   // 1,75 arredondado a 1 casa
  assert.strictEqual(l[0].valorCentavos, 750);
});

t('entrada com erro vira erro do arquivo, não derruba os demais', () => {
  ctx.e = { nome: 'x.zip', hash: 'e', erroEntrada: 'ZIP sem CSV de bilhetagem.' };
  const r = run('Parsers_ler(e)');
  assert.strictEqual(r.ok, false);
  assert.ok(/ZIP sem CSV/.test(r.erro));
});

console.log('\n' + ok + ' testes passaram');
