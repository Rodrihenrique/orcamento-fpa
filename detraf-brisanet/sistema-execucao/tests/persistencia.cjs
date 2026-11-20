// Testa Persistencia.gs + Controle.gs + Devedor.gs com planilhas simuladas em memória (sem Apps Script).
// Uso: node tests/persistencia.cjs
const fs = require('fs'), vm = require('vm'), path = require('path'), assert = require('assert');

class Aba {
  constructor(nome, linhas = 1, colunas = 40) { this.nome = nome; this.cols = colunas; this.g = []; this.f = []; this.merges = []; for (let i = 0; i < linhas; i++) this._nova(this.g.length); }
  _nova(pos) { this.g.splice(pos, 0, Array(this.cols).fill('')); this.f.splice(pos, 0, Array(this.cols).fill('')); }
  getName() { return this.nome; } setName(n) { this.nome = n; return this; }
  getMaxRows() { return this.g.length; }
  getLastRow() { let u = 0; this.g.forEach((l, i) => { if (l.some(x => x !== '')) u = i + 1; }); return u; }
  insertRowsAfter(r, n) { for (let i = 0; i < n; i++) this._nova(r); }
  deleteRows(r, n) { this.g.splice(r - 1, n); this.f.splice(r - 1, n); }
  setFrozenRows() {} setTabColor() {}
  getRange(r, c, nr = 1, nc = 1) {
    const s = this, self = {
      getValues: () => { while (s.g.length < r - 1 + nr) s._nova(s.g.length); return s.g.slice(r - 1, r - 1 + nr).map(l => l.slice(c - 1, c - 1 + nc)); },
      getFormulas: () => s.f.slice(r - 1, r - 1 + nr).map(l => l.slice(c - 1, c - 1 + nc)),
      setValues: (v) => { v.forEach((l, i) => l.forEach((x, j) => { while (s.g.length < r + i) s._nova(s.g.length);
        if (typeof x === 'string' && x[0] === '=') { s.f[r - 1 + i][c - 1 + j] = x; s.g[r - 1 + i][c - 1 + j] = 0; } else { s.g[r - 1 + i][c - 1 + j] = x; s.f[r - 1 + i][c - 1 + j] = ''; } })); return self; },
      setValue: (x) => self.setValues([[x]]), getValue: () => s.g[r - 1][c - 1],
      clearContent: () => { for (let i = 0; i < nr; i++) for (let j = 0; j < nc; j++) s.g[r - 1 + i][c - 1 + j] = ''; return self; },
      merge: () => { s.merges.push([r, c, nr, nc]); return self; },
      setFontWeight: () => self, setBackground: () => self, setFontColor: () => self
    };
    return self;
  }
  copyTo(ss) { const n = new Aba('Cópia de ' + this.nome, 0, this.cols); n.g = this.g.map(l => l.slice()); n.f = this.f.map(l => l.slice()); ss.abas.push(n); return n; }
}
class Plan { constructor(abas) { this.abas = abas; } getSheetByName(n) { return this.abas.find(a => a.nome === n) || null; }
  getSheets() { return this.abas; } insertSheet(n) { const a = new Aba(n, 1); this.abas.push(a); return a; }
  setActiveSheet() {} moveActiveSheet() {} getNumSheets() { return this.abas.length; } }

const controle = new Plan([new Aba('Controle - DETRAF E DEROAM', 8, 31)]);
const sistema = new Plan([new Aba('Lancamentos', 1, 20), new Aba('Log', 1, 9)]);
const devedor = new Plan([]);
sistema.getSheetByName('Lancamentos').g[0] = Array(20).fill('h');

const C = controle.getSheetByName('Controle - DETRAF E DEROAM');
const linhaC = (i, b, op, tp, per = 202610, mes = 'OUTUBRO') => { C.g[i][0] = 'BRISANET'; C.g[i][1] = b; C.g[i][2] = op; C.g[i][3] = tp; C.g[i][6] = per; C.g[i][7] = mes; };
C.g[2][6] = 202610;                                      // linha 3 = totais do bloco (sem operadora)
linhaC(3, 'STFC', 'CLARO', 'STFC'); C.g[3][9] = 0; C.f[3][9] = '=-100-5';   // J com fórmula do usuário (somente leitura do valor)
linhaC(4, 'STFC', 'TIM', 'SMP');
linhaC(5, 'STFC', 'VIVO', 'STFC', '2026010');           // erro de digitação real na coluna G
const header = ['EOT Credora', 'EOT Devedora', 'P. Referência', 'P. de Tráfego', 'POI', 'Tipo Relatório', 'Descritor de CDR', 'Grupo Horário', 'Chamadas', 'Duração em Minutos', 'Tarifa Aplicável', 'Valor Líquido', 'Valor COFINS e PIS/PASEP', 'Valor ICMS', 'Valor Bruto', 'CN'];
const D = new Aba('202610', 1, 16); devedor.abas.push(D);
D.g = []; D.f = [];
const add = (arr) => { const l = Array(16).fill(''); arr.forEach((x, i) => l[i] = x); D.g.push(l); D.f.push(Array(16).fill('')); };
add([]); add(['TIM SA - BRISANET STFC']); add(header); add([72, 'F79', 202610, 202609, 'P', 0, 'LENV', 'N', 1, 1, 0.01, 9, 9, 9, 9, 81]); add([73, 'A94', 202610, 202609, 'P', 0, 'LENV', 'N', 1, 1, 0.01, 9, 9, 9, 9, 81]);
add(['', '', '', '', '', '', 'BRISANET STFC - TIM SA', '', 2]);                 // linha 6 = total
add([]); add(['CLARO STFC - BRISANET SMP']); add(header); add([80, 'C30', 202610, 202609, 'P', 0, 'LENV', 'N', 5, 5, 0.01, 5, 5, 5, 5, 81]); add(['', '', '', '', '', '', 'BRISANET SMP - CLARO STFC']);

const props = { ID_PLANILHA_CONTROLE: 'c', ID_PLANILHA_DETALHE: 's', ID_PLANILHA_DEVEDOR: 'd' };
const ctx = vm.createContext({ console, Utilities: { formatDate: () => 'x' },
  PropertiesService: { getScriptProperties: () => ({ getProperty: k => props[k] || null }) },
  SpreadsheetApp: { openById: id => id === 'c' ? controle : id === 'd' ? devedor : sistema } });
['Modelo.gs', 'Config.gs', 'Calculo.gs', 'Persistencia.gs', 'Controle.gs', 'Devedor.gs'].forEach(f => vm.runInContext(fs.readFileSync(path.join(__dirname, '..', f), 'utf8'), ctx, { filename: f }));
const run = c => vm.runInContext(c, ctx);

const reg = (v) => ({ colunas: ['001', 'J71', '202610', '202609', 'P', '00', 'LENV', 'N', '10', '5,0', '0,01', '1,00', '0,10', '0,20', '1,30', '81'],
  chamadas: 10, minutos: 5, valorCentavos: v, arquivo: 'a.csv', detalhe: { periodoTrafego: '202609', poi: 'P', descritor: 'LENV', tarifa: 0.01, liquido: 1, piscofins: 0.1, icms: 0.2, cn: '81' } });
const grupo = (chave, dir, tb, tp, hold, v) => ({ chave, periodo: '202610', tipoBrisa: tb, tipoParceiro: tp, holding: hold, direcao: dir, totalCentavos: v, chamadas: 10, minutos: 5, linhas: 1, registros: [reg(v)] });
const K_CLARO = '202610|STFC|STFC|CLARO_FIXA|EMISSAO', K_TIM = '202610|STFC|SMP|TIM_SA|RECEBIMENTO';
ctx.gs1 = [grupo(K_CLARO, 'EMISSAO', 'STFC', 'STFC', 'CLARO_FIXA', 190672), grupo(K_TIM, 'RECEBIMENTO', 'STFC', 'SMP', 'TIM_SA', 28467)];
let ok = 0; const t = (n, f) => { f(); ok++; console.log('ok  -', n); };
const ativos = () => run('Persist_lerLancamentos().dados.filter(function (r) { return r[LANC_COL.status] === "ATIVO"; }).map(Persist_itemAtivo)');

t('plano da 1ª carga: sem erros; CLARO escreve em I, TIM em J; fórmula do usuário em J do CLARO não conflita', () => {
  ctx.gx = ctx.gs1;
  const p = run('Controle_planejar(gx, [])');
  assert.strictEqual(p.erros.length, 0);
  const porCel = Object.fromEntries(p.operacoes.map(o => [o.rotulo.split(' ')[0], o]));
  assert.strictEqual(porCel['I4'].novo, 1906.72); assert.strictEqual(porCel['I4'].acao, 'ESCREVER');
  assert.strictEqual(porCel['J5'].novo, -284.67);
  assert.strictEqual(C.g[3][8], '');                                   // planejar NÃO grava
});

t('aprovação completa: Lancamentos v1, detalhe, Controle (I/J) e Devedor (bloco reescrito, outro bloco intacto)', () => {
  ctx.gx = ctx.gs1; ctx.plano = run('Controle_planejar(gx, [])');
  const l = run('Persist_gravarLote("L1", gx, ["h1"], ["a.csv"], "detraf-csv", "u@x")');
  assert.strictEqual(l.n, 2);
  run('Persist_gravarDetalhe("202610", gx, "L1", { "' + K_CLARO + '": 1, "' + K_TIM + '": 1 }, {})');
  const lc = run('Controle_aplicar(plano)');
  assert.strictEqual(lc.length, 2);
  assert.strictEqual(C.g[3][8], 1906.72); assert.strictEqual(C.g[3][9], 0); assert.strictEqual(C.f[3][9], '=-100-5');   // J do CLARO intocado
  assert.strictEqual(C.g[4][9], -284.67);
  assert.strictEqual(C.g[2][8], '');                                    // linha de totais do bloco não é tocada
  const ld = run('Devedor_republicar(gs1.map(function (g) { return { chave: g.chave, periodo: g.periodo, tipoBrisa: g.tipoBrisa, tipoParceiro: g.tipoParceiro, holding: g.holding, direcao: g.direcao }; }))');
  assert.ok(ld.some(x => /TIM SA - BRISANET STFC.*1 linha/.test(x)), ld.join('|'));
  // bloco TIM tinha 2 linhas de dados, agora 1 (linhas 4..) e total logo abaixo com SUM
  assert.strictEqual(D.g[3][14], 284.67); assert.strictEqual(D.g[3][0], '001');
  assert.strictEqual(D.f[4][8], '=SUM(I4:I4)'); assert.strictEqual(D.g[4][6], 'BRISANET STFC - TIM SA'); assert.strictEqual(D.g[4][15], '--');
  const claro = D.g.findIndex(l => l[0] === 'CLARO STFC - BRISANET SMP');
  assert.strictEqual(D.g[claro + 2][0], 80);                           // bloco CLARO preservado
  assert.strictEqual(ld.filter(x => /CLARO/.test(x)).length, 0);       // EMISSAO nunca vai ao Devedor
});

t('bloco/linha ausente no Controle vira ERRO e nada é planejado para gravar', () => {
  ctx.gx = [grupo('202611|STFC|STFC|CLARO_FIXA|EMISSAO', 'EMISSAO', 'STFC', 'STFC', 'CLARO_FIXA', 100)]; ctx.gx[0].periodo = '202611';
  const p = run('Controle_planejar(gx, [])');
  assert.strictEqual(p.erros.length, 1); assert.strictEqual(p.erros[0].codigo, 'CONTROLE_BLOCO_AUSENTE'); assert.strictEqual(p.operacoes.length, 0);
  ctx.gx = [grupo('202610|SMP|SMP|OI_SA|EMISSAO', 'EMISSAO', 'SMP', 'SMP', 'OI_SA', 100)];
  const q = run('Controle_planejar(gx, [])'); assert.strictEqual(q.erros[0].codigo, 'CONTROLE_LINHA_AUSENTE');
});

t('valor digitado à mão no Controle: AVISO de sobrescrita; período com erro de digitação é reconhecido (aviso)', () => {
  C.g[5][8] = 777;                                                      // alguém digitou na linha VIVO (G = "2026010")
  ctx.gx = [grupo('202610|STFC|STFC|TELEFONICA_FIXA|EMISSAO', 'EMISSAO', 'STFC', 'STFC', 'TELEFONICA_FIXA', 5000)];
  const p = run('Controle_planejar(gx, [])');
  assert.strictEqual(p.erros.length, 0);
  assert.ok(p.avisos.some(a => /^CONTROLE_SOBRESCREVE:I6/.test(a.id)));
  assert.ok(p.avisos.some(a => /^CONTROLE_PERIODO_DIGITADO/.test(a.id)));
  assert.strictEqual(p.operacoes[0].acao, 'SOBRESCREVER'); assert.strictEqual(C.g[5][8], 777);
  C.g[5][8] = '';
});

t('reaprovação de valor diferente: v2, v1 SUBSTITUIDO; Controle muda de 1906,72 para 2000,00 sem aviso', () => {
  ctx.gs2 = [grupo(K_CLARO, 'EMISSAO', 'STFC', 'STFC', 'CLARO_FIXA', 200000)];
  ctx.at = ativos();
  const plano = run('Controle_planejar(gs2, at)');
  assert.strictEqual(plano.avisos.length, 0); assert.strictEqual(plano.operacoes[0].acao, 'ESCREVER');
  const l = run('Persist_gravarLote("L2", gs2, ["h2"], ["b.csv"], "detraf-csv", "u@x")');
  assert.strictEqual(l.versaoPorChave[K_CLARO], 2); assert.strictEqual(l.loteAnteriorPorChave[K_CLARO], 'L1');
  ctx.versoes = l.versaoPorChave; ctx.ant = l.loteAnteriorPorChave;
  run('Persist_gravarDetalhe("202610", gs2, "L2", versoes, ant)');
  ctx.p2 = plano; run('Controle_aplicar(p2)');
  assert.strictEqual(C.g[3][8], 2000);
  const lanc = sistema.getSheetByName('Lancamentos');
  assert.deepStrictEqual([lanc.g[1][3], lanc.g[2][3], lanc.g[3][3]], ['SUBSTITUIDO', 'ATIVO', 'ATIVO']);
});

t('estorno do L2: Controle zera (a v1 já estava SUBSTITUIDA e não é reativada) e Lancamentos/detalhe marcados ESTORNADO', () => {
  const r = run('Persist_estornarLote("L2", "carga aprovada por engano")');
  assert.strictEqual(r.n, 1); assert.strictEqual(r.linhasDetalhe, 1);
  assert.strictEqual(C.g[3][8], 0);                                     // L1 foi SUBSTITUIDO: sem lançamento ativo → zero (histórico preservado)
  assert.strictEqual(sistema.getSheetByName('202610').g[3][19], 'ESTORNADO');
  assert.strictEqual(sistema.getSheetByName('Lancamentos').g[3][19], 'carga aprovada por engano');
  assert.strictEqual(run('Persist_estornarLote("L2", "de novo")').n, 0);
});

t('estorno do L1 (TIM): Devedor fica com bloco vazio (1 linha em branco), SUM não aponta para o total', () => {
  const r = run('Persist_estornarLote("L1", "teste")');
  assert.ok(r.devedor.some(x => /TIM SA - BRISANET STFC.*0 linha/.test(x)), r.devedor.join('|'));
  assert.strictEqual(D.g[3][0], ''); assert.strictEqual(D.f[4][8], '=SUM(I4:I4)');
});

t('estorno não mexe no Controle se alguém alterou o valor depois da carga', () => {
  ctx.gs3 = [grupo(K_TIM, 'RECEBIMENTO', 'STFC', 'SMP', 'TIM_SA', 10000)];
  ctx.at3 = ativos(); const plano = run('Controle_planejar(gs3, at3)');
  const l = run('Persist_gravarLote("L3", gs3, ["h3"], ["c.csv"], "detraf-csv", "u@x")');
  ctx.p3 = plano; run('Controle_aplicar(p3)'); assert.strictEqual(C.g[4][9], -100);
  C.g[4][9] = -999;                                                    // usuário mexeu no J do TIM
  const r = run('Persist_estornarLote("L3", "teste")');
  assert.strictEqual(C.g[4][9], -999); assert.ok(r.controle.some(x => /mudou depois da carga/.test(x)), r.controle.join('|'));
});

t('Devedor: bloco inexistente é criado no fim da aba; aba do mês inexistente é criada', () => {
  const itens = [{ periodo: '202610', tipoBrisa: 'SMP', tipoParceiro: 'SMP', holding: 'OI_SA', direcao: 'RECEBIMENTO' }];
  ctx.itensOi = itens;
  const det = sistema.getSheetByName('202610'); const n = det.getLastRow();
  det.g[n] = ['9', 'X1', '202610', '202609', 'P', '0', 'LENV', 'N', '3', '2,5', '0,01', '1,5', '0,1', '0,2', '1,8', '81', 'OI SMP - brisanet SMP', 'L9', 1, 'ATIVO', 'a.csv'];
  const ld = run('Devedor_republicar(itensOi)');
  assert.ok(ld.some(x => /bloco NOVO "OI SMP - BRISANET SMP"/.test(x)), ld.join('|'));
  const i = D.g.findIndex(l => l[0] === 'OI SMP - BRISANET SMP');
  assert.ok(i > 0); assert.strictEqual(D.g[i + 2][14], 1.8); assert.strictEqual(D.g[i + 3][6], 'BRISANET SMP - OI SMP');
  run('Devedor_republicar([{ periodo: "202611", tipoBrisa: "SMP", tipoParceiro: "SMP", holding: "OI_SA", direcao: "RECEBIMENTO" }])');
  assert.ok(devedor.getSheetByName('202611'));
});

t('Devedor: títulos digitados à mão são reconhecidos (variações de espaço, SA, SMS)', () => {
  const p = x => run('JSON.stringify(Devedor_parseTitulo(' + JSON.stringify(x) + '))');
  assert.strictEqual(p(' OI STFC - BRISANET STFC '), '{"op":"OI","tp":"STFC","tb":"STFC"}');
  assert.strictEqual(p('TIM SA - SMS - BRISANET SMP'), '{"op":"TIM","tp":"SMS","tb":"SMP"}');
  assert.strictEqual(p('TIM SA - BRISANET SMP '), '{"op":"TIM","tp":"","tb":"SMP"}');
  assert.strictEqual(p('CLARO SMP -  BRISANET SMP'), '{"op":"CLARO","tp":"SMP","tb":"SMP"}');
  assert.strictEqual(p('EOT Credora'), 'null');
});

console.log('\n' + ok + ' testes de persistência passaram');
