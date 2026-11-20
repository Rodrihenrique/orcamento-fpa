// ==============================================================================
// CONTROLE (planilha ORIGINAL "Controle de DETRAF BRISANET", aba "Controle - DETRAF E DEROAM")
//
// Modelo da aba (conferido na planilha real):
//  - linhas 1–2: cabeçalho; a cada mês há um BLOCO de 21 linhas: 1 linha de totais (G = período,
//    colunas I.. com SUM) + 20 linhas fixas de operadora (A=BRISANET, B tipo brisanet, C operadora,
//    D tipo da relacionada, G=AAAAMM, H=nome do mês).
//  - I = Detraf Brisanet (a receber, positivo)  ·  J = Detraf Relacionada (a pagar, NEGATIVO).
//  - Todo o resto (E, Q, R, S, T… fórmulas e status) é da planilha: o sistema NUNCA escreve lá.
//
// Regras:
//  - o sistema só escreve em I/J de linhas que JÁ existem; nunca cria linha nem bloco;
//  - bloco ou linha ausente = ERRO na conferência (nada é gravado);
//  - célula com valor diferente do que o sistema gravou antes (digitado à mão) = AVISO de
//    sobrescrita, que exige "li e aceito";
//  - fórmula do usuário é preservada quando o valor já é o mesmo.
// ==============================================================================

var CTRL_PRIM = 3;         // primeira linha lida (1-based)
var CTRL_COL_I = 9, CTRL_COL_J = 10;

function Controle_norm(s) {
  return Modelo_removerAcentos(String(s === null || s === undefined ? '' : s).toUpperCase()).replace(/\s+/g, ' ').trim();
}

function Controle_a1(linha, col) { return (col === CTRL_COL_I ? 'I' : 'J') + linha; }

/** Lê A:J do Controle (valores) e I:J (fórmulas) de uma vez. */
function Controle_ler() {
  var aba = Persist_controle().getSheetByName(Config_obter('ABA_CONTROLE'));
  if (!aba) throw new Error("Aba '" + Config_obter('ABA_CONTROLE') + "' não existe na planilha de Controle.");
  var n = Math.max(aba.getLastRow() - CTRL_PRIM + 1, 1);
  return { aba: aba, n: n, v: aba.getRange(CTRL_PRIM, 1, n, 10).getValues(), f: aba.getRange(CTRL_PRIM, 9, n, 2).getFormulas() };
}

/**
 * Acha a linha do item (período + tipo brisanet + operadora + tipo da relacionada).
 * Devolve { idx, bloco:true|false, periodoDigitado:'2026011'|'' }. idx = -1 se não achou.
 * Tolera erro de digitação na coluna G (ex.: "2026011") quando ano e nome do mês (H) batem.
 */
function Controle_acharLinha(d, item) {
  var op = Controle_norm(Calculo_nomeOperadora(item.holding)), tb = Controle_norm(item.tipoBrisa), tp = Controle_norm(item.tipoParceiro);
  var mes = Controle_norm(Persist_nomeMes(item.periodo)), ano = String(item.periodo).substring(0, 4);
  var bloco = false, exato = -1, parcial = -1, digitado = '';
  for (var i = 0; i < d.n; i++) {
    var r = d.v[i], g = String(r[6]).trim();
    var doPeriodo = g === String(item.periodo) || (g.length > 6 && g.indexOf(ano) === 0 && Controle_norm(r[7]) === mes);
    if (!doPeriodo || Controle_norm(r[2]) === '') continue;      // só linhas de operadora do período
    bloco = true;
    if (Controle_norm(r[2]) !== op || Controle_norm(r[1]) !== tb) continue;
    var tr = Controle_norm(r[3]);
    if (tr === tp) { exato = i; digitado = g === String(item.periodo) ? '' : g; break; }
    if (parcial === -1 && tr && (tr.indexOf(tp) !== -1 || tp.indexOf(tr) !== -1)) { parcial = i; digitado = g === String(item.periodo) ? '' : g; }
  }
  var idx = exato !== -1 ? exato : parcial;
  return { idx: idx, bloco: bloco, periodoDigitado: idx === -1 ? '' : digitado };
}

/** Soma por célula (idx|col) o valor assinado de uma lista de itens. Itens sem linha são devolvidos em perdidos. */
function Controle_somarCelulas(d, itens) {
  var cel = {}, perdidos = [];
  itens.forEach(function (it) {
    var a = Controle_acharLinha(d, it);
    if (a.idx === -1) { perdidos.push({ item: it, bloco: a.bloco }); return; }
    var col = it.direcao === 'EMISSAO' ? CTRL_COL_I : CTRL_COL_J, k = a.idx + '|' + col;
    var c = cel[k] || (cel[k] = { idx: a.idx, col: col, valor: 0, periodoDigitado: a.periodoDigitado, itens: [] });
    c.valor += (col === CTRL_COL_I ? 1 : -1) * Math.abs(it.valor);
    c.itens.push(it);
  });
  Object.keys(cel).forEach(function (k) { cel[k].valor = Math.round(cel[k].valor * 100) / 100; });
  return { celulas: cel, perdidos: perdidos };
}

function Controle_rotulo(d, c) {
  var r = d.v[c.idx];
  return Controle_a1(CTRL_PRIM + c.idx, c.col) + ' (' + r[2] + ' ' + r[1] + '→' + r[3] + ')';
}

/**
 * Plano de gravação no Controle. NÃO grava. grupos = grupos novos do lote; ativos = itens ATIVOS
 * atuais (Persist_itemAtivo). Devolve { dados, operacoes, erros, avisos }.
 * Cada operação: { idx, col, atual, esperado, novo, acao: 'IGUAL'|'ESCREVER'|'SOBRESCREVER', rotulo }.
 */
function Controle_planejar(grupos, ativos) {
  var d = Controle_ler(), erros = [], avisos = [];
  var novos = grupos.map(function (g) {
    return { chave: g.chave, periodo: g.periodo, tipoBrisa: g.tipoBrisa, tipoParceiro: g.tipoParceiro, holding: g.holding,
      direcao: g.direcao, valor: Modelo_centavosParaReais(g.totalCentavos) };
  });
  var chavesNovas = {}; novos.forEach(function (n) { chavesNovas[n.chave] = true; });
  var periodos = {}; novos.forEach(function (n) { periodos[n.periodo] = true; });
  var anteriores = (ativos || []).filter(function (a) { return periodos[a.periodo]; });
  var efetivos = anteriores.filter(function (a) { return !chavesNovas[a.chave]; }).concat(novos);

  var antes = Controle_somarCelulas(d, anteriores).celulas;
  var depois = Controle_somarCelulas(d, efetivos);

  var periodosSemBloco = {};
  depois.perdidos.forEach(function (p) {
    if (!chavesNovas[p.item.chave]) return;                      // só importa o que este lote vai gravar
    if (!p.bloco) {
      if (periodosSemBloco[p.item.periodo]) return; periodosSemBloco[p.item.periodo] = true;
      erros.push({ codigo: 'CONTROLE_BLOCO_AUSENTE', detalhe: null, mensagem: 'O Controle não tem o bloco de ' + Persist_nomeMes(p.item.periodo) +
        ' (linhas com período ' + p.item.periodo + ' na coluna G). Crie o bloco do mês (cópia do mês anterior) e confira de novo. Nada foi gravado.' });
    } else {
      erros.push({ codigo: 'CONTROLE_LINHA_AUSENTE', detalhe: null, mensagem: 'O bloco ' + p.item.periodo + ' do Controle não tem a linha ' +
        Calculo_nomeOperadora(p.item.holding) + ' · ' + p.item.tipoBrisa + ' → ' + p.item.tipoParceiro + '. Adicione a linha e confira de novo.' });
    }
  });

  var operacoes = [];
  Object.keys(depois.celulas).forEach(function (k) {
    var c = depois.celulas[k];
    if (!c.itens.some(function (it) { return chavesNovas[it.chave]; })) return;   // célula sem grupo novo: não mexe
    var f = d.f[c.idx][c.col - CTRL_COL_I], bruto = d.v[c.idx][c.col - 1];
    var atual = bruto === '' || bruto === null ? 0 : Number(bruto);
    var esperado = antes[k] ? antes[k].valor : 0;
    var op = { idx: c.idx, col: c.col, atual: atual, esperado: esperado, novo: c.valor, rotulo: Controle_rotulo(d, c), formula: f || '' };
    if (!isNaN(atual) && Math.abs(atual - c.valor) < 0.005) op.acao = 'IGUAL';
    else if (!isNaN(atual) && (Math.abs(atual) < 0.005 || Math.abs(atual - esperado) < 0.005)) op.acao = 'ESCREVER';
    else {
      op.acao = 'SOBRESCREVER';
      avisos.push({ id: 'CONTROLE_SOBRESCREVE:' + Controle_a1(CTRL_PRIM + c.idx, c.col), detalhe: null,
        mensagem: 'Controle ' + op.rotulo + ' já tem ' + (isNaN(atual) ? '"' + bruto + '"' : 'R$ ' + atual.toFixed(2)) + (f ? ' (fórmula ' + f + ')' : '') +
          ', que não veio deste sistema. Aprovar vai trocar por R$ ' + c.valor.toFixed(2) + '.' });
    }
    if (c.periodoDigitado) avisos.push({ id: 'CONTROLE_PERIODO_DIGITADO:' + (CTRL_PRIM + c.idx), detalhe: null,
      mensagem: 'A linha ' + (CTRL_PRIM + c.idx) + ' do Controle tem período "' + c.periodoDigitado + '" na coluna G (esperado ' + c.itens[0].periodo +
        '). Reconheci pelo mês e ano; corrija a coluna G quando puder.' });
    operacoes.push(op);
  });
  // Um aviso de período digitado por linha (várias células da mesma linha geram repetidos).
  var vistos = {}; avisos = avisos.filter(function (a) { if (vistos[a.id]) return false; vistos[a.id] = true; return true; });
  return { dados: d, operacoes: operacoes, erros: erros, avisos: avisos };
}

/** Grava o plano: só I:J, em uma escrita, preservando fórmulas que não mudaram. Devolve linhas de log. */
function Controle_aplicar(plano) {
  var d = plano.dados, mudar = plano.operacoes.filter(function (o) { return o.acao !== 'IGUAL'; });
  if (!mudar.length) return ['Controle: nada a alterar (valores já iguais).'];
  var saida = d.v.map(function (r, i) { return [d.f[i][0] || r[8], d.f[i][1] || r[9]]; });
  var logs = [];
  mudar.forEach(function (o) {
    saida[o.idx][o.col - CTRL_COL_I] = o.novo;
    logs.push('Controle ' + o.rotulo + ': ' + o.atual.toFixed(2) + ' → ' + o.novo.toFixed(2) + (o.acao === 'SOBRESCREVER' ? ' (valor anterior era manual)' : ''));
  });
  d.aba.getRange(CTRL_PRIM, CTRL_COL_I, d.n, 2).setValues(saida);
  return logs;
}

/**
 * Estorno: cada célula volta à soma dos lançamentos que continuam ATIVOS, mas só se ela ainda
 * valer o que o sistema gravou (alguém pode ter mexido depois). itens = lançamentos estornados.
 */
function Controle_desfazer(itens, antes, depois) {
  var d = Controle_ler(), periodos = {};
  itens.forEach(function (i) { periodos[i.periodo] = true; });
  var daqui = function (lista) { return lista.filter(function (a) { return periodos[a.periodo]; }); };
  var A = Controle_somarCelulas(d, daqui(antes)).celulas, D = Controle_somarCelulas(d, daqui(depois)).celulas;
  var saida = d.v.map(function (r, i) { return [d.f[i][0] || r[8], d.f[i][1] || r[9]]; });
  var logs = [], mudou = false;
  Object.keys(A).forEach(function (k) {
    var c = A[k], alvo = D[k] ? D[k].valor : 0;
    if (!c.itens.some(function (it) { return it.lote === itens[0].lote; })) return;    // célula não pertence ao lote estornado
    var rot = Controle_rotulo(d, c), atual = Number(d.v[c.idx][c.col - 1]) || 0;
    if (Math.abs(atual - alvo) < 0.005) { logs.push('Controle ' + rot + ': já vale ' + alvo.toFixed(2) + '.'); return; }
    if (Math.abs(atual - c.valor) < 0.005) { saida[c.idx][c.col - CTRL_COL_I] = alvo; mudou = true; logs.push('Controle ' + rot + ': ' + atual.toFixed(2) + ' → ' + alvo.toFixed(2) + '.'); }
    else logs.push('Controle ' + rot + ' mudou depois da carga: não alterada.');
  });
  if (mudou) d.aba.getRange(CTRL_PRIM, CTRL_COL_I, d.n, 2).setValues(saida);
  return logs;
}
