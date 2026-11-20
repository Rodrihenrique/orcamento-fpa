// Testa Persistencia.gs com uma planilha simulada em memória (sem Apps Script).
// Uso: node tests/persistencia.cjs
const fs = require('fs'), vm = require('vm'), path = require('path'), assert = require('assert');

class Aba {
  constructor(nome, linhas = 1, colunas = 40) { this.nome = nome; this.g = Array.from({ length: linhas }, () => Array(colunas).fill('')); this.f = this.g.map(l => l.map(() => '')); this.cols = colunas; }
  getName() { return this.nome; } setName(n) { this.nome = n; return this; }
  getMaxRows() { return this.g.length; }
  getLastRow() { let u = 0; this.g.forEach((l, i) => { if (l.some(x => x !== '')) u = i + 1; }); return u; }
  insertRowsAfter(_, n) { for (let i = 0; i < n; i++) { this.g.push(Array(this.cols).fill('')); this.f.push(Array(this.cols).fill('')); } }
  setFrozenRows() {} setTabColor() {} getNumSheets() { return 0; }
  getRange(r, c, nr = 1, nc = 1) {
    const s = this;
    return {
      getValues: () => s.g.slice(r - 1, r - 1 + nr).map(l => l.slice(c - 1, c - 1 + nc)),
      getFormulas: () => s.f.slice(r - 1, r - 1 + nr).map(l => l.slice(c - 1, c - 1 + nc)),
      setValues: (v) => { v.forEach((l, i) => l.forEach((x, j) => { while (s.g.length < r + i) { s.g.push(Array(s.cols).fill('')); s.f.push(Array(s.cols).fill('')); }
        if (typeof x === 'string' && x[0] === '=') { s.f[r - 1 + i][c - 1 + j] = x; s.g[r - 1 + i][c - 1 + j] = 0; } else { s.g[r - 1 + i][c - 1 + j] = x; s.f[r - 1 + i][c - 1 + j] = ''; } })); return this; },
      setValue: (x) => { s.g[r - 1][c - 1] = x; }, getValue: () => s.g[r - 1][c - 1],
      clearContent: () => { for (let i = 0; i < nr; i++) for (let j = 0; j < nc; j++) { s.g[r - 1 + i][c - 1 + j] = ''; } },
      setFontWeight() { return this; }, setBackground() { return this; }, setFontColor() { return this; }
    };
  }
  copyTo(ss) { const n = new Aba('Cópia de ' + this.nome, this.g.length, this.cols); n.g = this.g.map(l => l.slice()); ss.abas.push(n); return n; }
}
class Plan { constructor(abas) { this.abas = abas; } getSheetByName(n) { return this.abas.find(a => a.nome === n) || null; } insertSheet(n) { const a = new Aba(n, 1); this.abas.push(a); return a; }
  setActiveSheet() {} moveActiveSheet() {} getNumSheets() { return this.abas.length; } }

const controle = new Plan([new Aba('Controle', 12, 31), new Aba('Lancamentos', 1, 20), new Aba('Log', 1, 9)]);
const detalhe = new Plan([(() => { const m = new Aba('Modelo', 40, 21); m.g[0] = ['h'].concat(Array(20).fill('h')); return m; })()]);
// linha existente no Controle: BRISANET | STFC | CLARO | STFC | período 202610 com J já preenchido por fórmula do usuário
controle.getSheetByName('Lancamentos').g[0] = Array(20).fill('h');   // cabeçalho (a planilha real já vem com ele)
const C = controle.getSheetByName('Controle');
C.g[2][0] = 'BRISANET'; C.g[2][1] = 'STFC'; C.g[2][2] = 'CLARO'; C.g[2][3] = 'STFC'; C.g[2][6] = 202610; C.g[2][7] = 'OUTUBRO';
C.g[2][9] = 0; C.f[2][9] = '=-100-5';

const props = { ID_PLANILHA_CONTROLE: 'c', ID_PLANILHA_DETALHE: 'd' };
const ctx = vm.createContext({ console, Utilities: { formatDate: () => 'x' },
  PropertiesService: { getScriptProperties: () => ({ getProperty: k => props[k] || null }) },
  SpreadsheetApp: { openById: id => id === 'c' ? controle : detalhe } });
['Modelo.gs', 'Config.gs', 'Calculo.gs', 'Persistencia.gs'].forEach(f => vm.runInContext(fs.readFileSync(path.join(__dirname, '..', f), 'utf8'), ctx, { filename: f }));
const run = c => vm.runInContext(c, ctx);

const reg = (v) => ({ colunas: ['001', 'J71', '202610', '202609', 'P', '00', 'LENV', 'N', '10', '5,0', '0,01', '1,00', '0,10', '0,20', '1,30', '81'],
  chamadas: 10, minutos: 5, valorCentavos: v, arquivo: 'a.csv', detalhe: { periodoTrafego: '202609', poi: 'P', descritor: 'LENV', tarifa: 0.01, liquido: 1, piscofins: 0.1, icms: 0.2, cn: '81' } });
const grupo = (chave, dir, tb, tp, hold, v) => ({ chave, periodo: '202610', tipoBrisa: tb, tipoParceiro: tp, holding: hold, direcao: dir, totalCentavos: v, chamadas: 10, minutos: 5, linhas: 1, registros: [reg(v)] });
ctx.gs1 = [grupo('202610|STFC|STFC|CLARO_FIXA|EMISSAO', 'EMISSAO', 'STFC', 'STFC', 'CLARO_FIXA', 190672),
           grupo('202610|STFC|SMP|TIM_SA|RECEBIMENTO', 'RECEBIMENTO', 'STFC', 'SMP', 'TIM_SA', 28467)];
let ok = 0; const t = (n, f) => { f(); ok++; console.log('ok  -', n); };

t('1ª aprovação: Lancamentos v1, detalhe AAAAMM criado, Controle atualizado e criado', () => {
  const l = run('Persist_gravarLote("L1", gs1, ["h1"], ["a.csv"], "detraf-csv", "u@x")');
  assert.strictEqual(l.n, 2); assert.strictEqual(l.versaoPorChave['202610|STFC|STFC|CLARO_FIXA|EMISSAO'], 1);
  const nd = run('Persist_gravarDetalhe("202610", gs1, "L1", { "202610|STFC|STFC|CLARO_FIXA|EMISSAO": 1, "202610|STFC|SMP|TIM_SA|RECEBIMENTO": 1 }, {})');
  assert.strictEqual(nd, 2);
  const ab = detalhe.getSheetByName('202610'); assert.ok(ab);
  assert.strictEqual(ab.g[1][14], 1906.72); assert.strictEqual(ab.g[1][16], 'brisanet STFC - CLARO STFC'); assert.strictEqual(ab.g[1][19], 'ATIVO');
  const lg = run('Persist_atualizarControle(gs1)');
  assert.strictEqual(lg.length, 2);
  assert.strictEqual(C.g[2][8], 1906.72);                    // I (emissão) na linha existente
  assert.strictEqual(C.f[2][9], '=-100-5');                  // fórmula do usuário em J preservada
  assert.strictEqual(C.g[3][2], 'TIM'); assert.strictEqual(C.g[3][3], 'SMP'); assert.strictEqual(C.g[3][9], -284.67);  // linha criada, J negativo
  assert.strictEqual(C.g[3][7], 'OUTUBRO');
});

t('reaprovação de valor diferente: v2 e a v1 vira SUBSTITUIDO (Lancamentos e detalhe)', () => {
  ctx.gs2 = [grupo('202610|STFC|STFC|CLARO_FIXA|EMISSAO', 'EMISSAO', 'STFC', 'STFC', 'CLARO_FIXA', 200000)];
  const l = run('Persist_gravarLote("L2", gs2, ["h2"], ["b.csv"], "detraf-csv", "u@x")');
  assert.strictEqual(l.versaoPorChave['202610|STFC|STFC|CLARO_FIXA|EMISSAO'], 2);
  assert.strictEqual(l.loteAnteriorPorChave['202610|STFC|STFC|CLARO_FIXA|EMISSAO'], 'L1');
  ctx.versoes = l.versaoPorChave; ctx.ant = l.loteAnteriorPorChave;
  run('Persist_gravarDetalhe("202610", gs2, "L2", versoes, ant)');
  const ab = detalhe.getSheetByName('202610');
  const status = [ab.g[1][19], ab.g[2][19], ab.g[3][19]];
  assert.deepStrictEqual(status, ['SUBSTITUIDO', 'ATIVO', 'ATIVO']);   // linha1 = L1 claro (substituída), linha2 = L1 tim, linha3 = L2
  const lanc = controle.getSheetByName('Lancamentos');
  assert.deepStrictEqual([lanc.g[1][3], lanc.g[2][3], lanc.g[3][3]], ['SUBSTITUIDO', 'ATIVO', 'ATIVO']);
  run('Persist_atualizarControle(gs2)'); assert.strictEqual(C.g[2][8], 2000);
});

t('estorno do lote L2: Lancamentos, detalhe e Controle (zera só se a célula ainda vale o lote)', () => {
  const r = run('Persist_estornarLote("L2", "carga aprovada por engano")');
  assert.strictEqual(r.n, 1); assert.strictEqual(r.linhasDetalhe, 1);
  assert.strictEqual(C.g[2][8], 0);
  const ab = detalhe.getSheetByName('202610'); assert.strictEqual(ab.g[3][19], 'ESTORNADO');
  assert.strictEqual(controle.getSheetByName('Lancamentos').g[3][3], 'ESTORNADO');
  assert.strictEqual(controle.getSheetByName('Lancamentos').g[3][19], 'carga aprovada por engano');
  assert.strictEqual(run('Persist_estornarLote("L2", "de novo")').n, 0);   // idempotente
});

t('estorno não mexe no Controle se alguém alterou o valor depois da carga', () => {
  C.g[3][9] = -999;                                                      // usuário mexeu no J do TIM
  const r = run('Persist_estornarLote("L1", "teste")');
  assert.strictEqual(C.g[3][9], -999);
  assert.ok(r.controle.some(x => /não alterada/.test(x)));
});

console.log('\n' + ok + ' testes de persistência passaram');
