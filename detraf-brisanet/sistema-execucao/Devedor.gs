// ==============================================================================
// DEVEDOR (planilha ORIGINAL "DETRAF Devedor - AAAA") — só RECEBIMENTO (brisanet devedora).
//
// Modelo da planilha (conferido na real): uma aba por mês (AAAAMM); dentro dela, vários BLOCOS:
//   linha de título (azul, mesclada A:P) · cabeçalho de 16 colunas · linhas de dados (números) ·
//   linha de total (G:H = rótulo, I:O = SUM, P = "--").
// Os títulos são digitados à mão e variam ("TIM SA - BRISANET STFC", "OI STFC - BRISANET SMP"...),
// então o bloco é reconhecido por OPERADORA + TIPO DA RELACIONADA (quando existe) + TIPO BRISANET.
//
// Regra de ouro: o Devedor é uma PROJEÇÃO. A fonte da verdade é o detalhe do sistema (aba AAAAMM da
// planilha do sistema, versionado). A cada aprovação/estorno, os blocos afetados são reescritos
// a partir das linhas ATIVAS do sistema. Blocos que o sistema não toca ficam intactos.
// Roaming não é tratado aqui.
// ==============================================================================

var DEV_COLS = 16;
var DEV_AZUL = '#0B5394', DEV_CINZA_ROTULO = '#999999', DEV_CINZA_SOMA = '#434343';

function Devedor_planilha() { return SpreadsheetApp.openById(Config_obter('ID_PLANILHA_DEVEDOR')); }

/** Falha cedo (na conferência) se a planilha do Devedor não abrir para este usuário. */
function Devedor_verificar() {
  try { Devedor_planilha().getSheets(); return null; }
  catch (e) { return 'Não consegui abrir a planilha DETRAF Devedor (' + e.message + '). Confira ID_PLANILHA_DEVEDOR e o seu acesso de edição.'; }
}

function Devedor_norm(s) {
  return Modelo_removerAcentos(String(s === null || s === undefined ? '' : s).toUpperCase()).replace(/\s+/g, ' ').trim();
}

/** "TIM SA - SMS - BRISANET SMP" → { op:'TIM', tp:'SMS', tb:'SMP' }. null se não for título de bloco. */
function Devedor_parseTitulo(texto) {
  var partes = Devedor_norm(texto).split(/\s*-\s*/).filter(Boolean);
  if (partes.length < 2) return null;
  var ult = partes[partes.length - 1].match(/^BRISANET (STFC|SMP)$/);
  if (!ult) return null;
  var tokens = partes.slice(0, -1).join(' ').split(' ').filter(function (t) { return t !== 'SA'; });
  if (!tokens.length) return null;
  var tp = '';
  tokens.slice(1).forEach(function (t) { if (t === 'STFC' || t === 'SMP' || t === 'SMS') tp = t; });
  return { op: tokens[0], tp: tp, tb: ult[1] };
}

/** Chaves aceitas para um grupo: exata e, se não for SMS, a versão sem tipo da relacionada. */
function Devedor_chavesDoGrupo(g) {
  var op = Devedor_norm(Calculo_nomeOperadora(g.holding)), tp = Devedor_norm(g.tipoParceiro), tb = Devedor_norm(g.tipoBrisa);
  var ch = [op + '|' + tp + '|' + tb];
  if (tp !== 'SMS') ch.push(op + '|' + '' + '|' + tb);
  return ch;
}

/** Acha os blocos da aba: [{ titulo, cab, ini, total, chave }] (linhas 1-based). */
function Devedor_blocos(v) {
  var blocos = [];
  for (var i = 0; i + 1 < v.length; i++) {
    if (Devedor_norm(v[i + 1][0]) !== 'EOT CREDORA') continue;
    var p = Devedor_parseTitulo(v[i][0]);
    if (!p) continue;
    var j = i + 2;
    while (j < v.length && String(v[j][0]).trim() !== '') j++;          // linhas de dados têm EOT na coluna A
    blocos.push({ titulo: i + 1, cab: i + 2, ini: i + 3, total: j + 1, chave: p.op + '|' + p.tp + '|' + p.tb });
  }
  return blocos;
}

function Devedor_num(v) { var n = Modelo_numeroBR(v); return isNaN(n) ? 0 : n; }

/** Linha do detalhe do sistema (21 colunas) → linha do Devedor (16 colunas, números onde cabe). */
function Devedor_linha(d) {
  return [d[0], d[1], Devedor_num(d[2]), Devedor_num(d[3]), d[4], Devedor_num(d[5]), d[6], d[7], Devedor_num(d[8]), Devedor_num(d[9]),
    Devedor_num(d[10]), Devedor_num(d[11]), Devedor_num(d[12]), Devedor_num(d[13]), Devedor_num(d[14]), Devedor_num(d[15])];
}

function Devedor_formatarNovoBloco(aba, titulo, n) {
  var cab = titulo + 1, ini = titulo + 2, tot = ini + n;
  aba.getRange(titulo, 1, 1, DEV_COLS).merge().setBackground(DEV_AZUL).setFontColor('#FFFFFF').setFontWeight('bold');
  aba.getRange(cab, 1, 1, DEV_COLS).setBackground(DEV_AZUL).setFontColor('#FFFFFF').setFontWeight('bold');
  aba.getRange(tot, 7, 1, 2).merge().setBackground(DEV_CINZA_ROTULO).setFontWeight('bold');
  aba.getRange(tot, 9, 1, 7).setBackground(DEV_CINZA_SOMA).setFontColor('#FFFFFF').setFontWeight('bold');
}

/** Escreve (ou reescreve) um bloco. linhas = linhas de 16 colunas já convertidas. Devolve texto de log. */
function Devedor_escreverBloco(aba, bloco, linhas, tituloNovo) {
  var n = Math.max(linhas.length, 1);                                   // mantém 1 linha em branco se zerado (SUM nunca aponta p/ o total)
  var dados = linhas.length ? linhas : [Array(DEV_COLS).fill('')];
  var somas = [];
  if (bloco) {                                                          // bloco existente: ajusta o número de linhas
    var m = bloco.total - bloco.ini;
    if (n > m) aba.insertRowsAfter(m > 0 ? bloco.total - 1 : bloco.cab, n - m);
    else if (n < m) aba.deleteRows(bloco.ini + n, m - n);
    var ini = bloco.ini, tot = ini + n;
    aba.getRange(ini, 1, n, DEV_COLS).setValues(dados);
    for (var c = 9; c <= 15; c++) { var L = String.fromCharCode(64 + c); somas.push('=SUM(' + L + ini + ':' + L + (tot - 1) + ')'); }
    aba.getRange(tot, 9, 1, 7).setValues([somas.concat(['--'])]);
    return 'Devedor ' + aba.getName() + ' › ' + aba.getRange(bloco.titulo, 1).getValue() + ': ' + linhas.length + ' linha(s).';
  }
  var topo = aba.getLastRow() + 2, ini2 = topo + 2, tot2 = ini2 + n;    // bloco novo no fim da aba
  aba.getRange(topo, 1).setValue(tituloNovo);
  aba.getRange(topo + 1, 1, 1, DEV_COLS).setValues([DET_CAB.slice(0, DEV_COLS)]);
  aba.getRange(ini2, 1, n, DEV_COLS).setValues(dados);
  for (var k = 9; k <= 15; k++) { var M = String.fromCharCode(64 + k); somas.push('=SUM(' + M + ini2 + ':' + M + (tot2 - 1) + ')'); }
  aba.getRange(tot2, 7).setValue(Devedor_rotuloTotal(tituloNovo));
  aba.getRange(tot2, 9, 1, 7).setValues([somas.concat(['--'])]);
  Devedor_formatarNovoBloco(aba, topo, n);
  return 'Devedor ' + aba.getName() + ' › bloco NOVO "' + tituloNovo + '": ' + linhas.length + ' linha(s).';
}

/** "TIM SA - BRISANET STFC" → "BRISANET STFC - TIM SA" (rótulo da linha de total, como na planilha). */
function Devedor_rotuloTotal(titulo) {
  var p = String(titulo).split(' - ');
  return p.length === 2 ? p[1] + ' - ' + p[0] : titulo;
}

/**
 * Reescreve, a partir do detalhe ATIVO do sistema, os blocos de Devedor dos itens informados
 * (itens = lançamentos novos aprovados OU estornados). Só RECEBIMENTO. Devolve linhas de log.
 * Erros de uma aba/bloco viram linha de log e não derrubam os demais.
 */
function Devedor_republicar(itens) {
  var rec = (itens || []).filter(function (i) { return i.direcao === 'RECEBIMENTO'; });
  if (!rec.length) return ['Devedor: nada a atualizar (lote sem RECEBIMENTO).'];
  var porPeriodo = {};
  rec.forEach(function (i) { (porPeriodo[i.periodo] = porPeriodo[i.periodo] || {})[Calculo_tituloBloco(i)] = i; });
  var logs = [], ss = Devedor_planilha();

  Object.keys(porPeriodo).forEach(function (periodo) {
    try {
      var titulos = porPeriodo[periodo];
      var det = Persist_detalhe().getSheetByName(periodo), porTitulo = {};
      if (det && det.getLastRow() > 1) {
        det.getRange(2, 1, det.getLastRow() - 1, DET_CAB.length).getValues().forEach(function (r) {
          if (r[DET_COL.STATUS] === 'ATIVO' && titulos[r[DET_COL.BLOCO]]) (porTitulo[r[DET_COL.BLOCO]] = porTitulo[r[DET_COL.BLOCO]] || []).push(Devedor_linha(r));
        });
      }
      var aba = ss.getSheetByName(periodo);
      if (!aba) { aba = ss.insertSheet(periodo); logs.push('Devedor: aba ' + periodo + ' criada (não existia).'); }
      var blocos = Devedor_blocos(aba.getLastRow() ? aba.getRange(1, 1, aba.getLastRow(), DEV_COLS).getValues() : []);

      // Une títulos do sistema que caem no mesmo bloco da planilha (ex.: TIM STFC e TIM SMP → "TIM SA - BRISANET SMP").
      var alvo = {};                                                     // linhaDoTitulo → { bloco, linhas }
      var novos = [];
      Object.keys(titulos).forEach(function (t) {
        var g = titulos[t], chaves = Devedor_chavesDoGrupo(g), achado = null;
        blocos.forEach(function (b) { if (!achado && chaves.indexOf(b.chave) !== -1) achado = b; });
        var linhas = porTitulo[t] || [];
        if (achado) { var a = alvo[achado.titulo] || (alvo[achado.titulo] = { bloco: achado, linhas: [] }); a.linhas = a.linhas.concat(linhas); }
        else if (linhas.length) novos.push({ titulo: t.toUpperCase(), linhas: linhas });
      });
      // De baixo para cima, para que inserir/apagar linhas não desloque os blocos ainda por escrever.
      Object.keys(alvo).map(Number).sort(function (a, b) { return b - a; }).forEach(function (k) {
        try { logs.push(Devedor_escreverBloco(aba, alvo[k].bloco, alvo[k].linhas, null)); }
        catch (e) { logs.push('Devedor ' + periodo + ': bloco da linha ' + k + ' NÃO atualizado: ' + e.message); }
      });
      novos.forEach(function (nv) {
        try { logs.push(Devedor_escreverBloco(aba, null, nv.linhas, nv.titulo)); }
        catch (e) { logs.push('Devedor ' + periodo + ': bloco novo "' + nv.titulo + '" NÃO criado: ' + e.message); }
      });
    } catch (e) { logs.push('Devedor ' + periodo + ' NÃO atualizado: ' + e.message); }
  });
  return logs;
}
