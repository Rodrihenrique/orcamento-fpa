// ==============================================================================
// CAMADA DE PERSISTÊNCIA — única que toca planilha e Drive.
// Só é chamada pela aprovação (nunca na leitura/conferência).
//
// Destinos:
//  1) Controle › Lancamentos  : histórico versionado (ATIVO / SUBSTITUIDO / ESTORNADO)
//  2) Controle › Controle     : valor consolidado por período+tipo+operadora (colunas I/J)
//  3) Detalhe mensal › AAAAMM : linhas do arquivo (tabela única, com bloco/lote/versão/status)
//  4) Drive › Originais/AAAAMM: arquivo original intacto
// Nunca apagamos linha. Gravação sempre em lote (setValues por faixa).
// ==============================================================================

var LANC_CAB = ['id', 'lote', 'versao', 'status', 'periodo', 'tipo_brisanet', 'tipo_parceiro',
  'holding', 'direcao', 'chamadas', 'minutos', 'valor', 'hash_arquivos', 'arquivos',
  'linhas', 'usuario', 'data', 'chave', 'parser', 'obs'];
var LANC_COL = {}; LANC_CAB.forEach(function (n, i) { LANC_COL[n] = i; });

// Detalhe mensal: 16 colunas padrão (A–P) + controle (Q–U)
var DET_CAB = ['EOT Credora', 'EOT Devedora', 'P. Referência', 'P. de Tráfego', 'POI', 'Tipo Relatório',
  'Descritor de CDR', 'Grupo Horário', 'Chamadas', 'Duração em Minutos', 'Tarifa Aplicável', 'Valor Líquido',
  'Valor COFINS e PIS/PASEP', 'Valor ICMS', 'Valor Bruto', 'CN', 'Bloco', 'Lote', 'Versão', 'Status', 'Arquivo de origem'];
var DET_COL = { BLOCO: 16, LOTE: 17, VERSAO: 18, STATUS: 19 };   // índices 0-based
var DET_LOTE_LINHAS = 5000;                                      // linhas por escrita

var MESES_PT = ['JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO', 'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'];

function Persist_controle() { return SpreadsheetApp.openById(Config_obter('ID_PLANILHA_CONTROLE')); }
function Persist_detalhe() { return SpreadsheetApp.openById(Config_obter('ID_PLANILHA_DETALHE')); }

function Persist_aba(nome, cabecalho) {
  var ss = Persist_controle();
  var aba = ss.getSheetByName(nome);
  if (!aba) {
    aba = ss.insertSheet(nome);
    aba.getRange(1, 1, 1, cabecalho.length).setValues([cabecalho]).setFontWeight('bold')
      .setBackground('#FF5022').setFontColor('#FFFFFF');
    aba.setFrozenRows(1);
  }
  return aba;
}

function Persist_periodoAnterior(aaaamm) {
  var a = parseInt(aaaamm.substring(0, 4), 10), m = parseInt(aaaamm.substring(4, 6), 10) - 1;
  if (m === 0) { m = 12; a -= 1; }
  return a + (m < 10 ? '0' : '') + m;
}

function Persist_lerLancamentos() {
  var aba = Persist_aba(Config_obter('ABA_LANCAMENTOS'), LANC_CAB);
  return { aba: aba, dados: aba.getLastRow() > 1 ? aba.getRange(2, 1, aba.getLastRow() - 1, LANC_CAB.length).getValues() : [] };
}

/** Lê Lancamentos uma vez e monta o contexto da validação. */
function Persist_contextoValidacao(periodo) {
  var dados = Persist_lerLancamentos().dados;
  var ctx = {
    periodoEsperado: '', hashesAprovados: {}, ativosPorChave: {}, anteriorPorSerie: {},
    limiteVariacaoPct: Config_obter('LIMITE_VARIACAO_PCT'),
    toleranciaTotalCentavos: Config_obter('TOLERANCIA_TOTAL_CENTAVOS')
  };
  var anterior = periodo ? Persist_periodoAnterior(periodo) : '';
  dados.forEach(function (r) {
    if (r[LANC_COL.status] !== 'ATIVO') return;
    var centavos = Math.round(Number(r[LANC_COL.valor]) * 100);
    ctx.ativosPorChave[r[LANC_COL.chave]] = { valorCentavos: centavos, hash: r[LANC_COL.hash_arquivos], lote: r[LANC_COL.lote] };
    String(r[LANC_COL.hash_arquivos]).split(',').forEach(function (h) {
      if (h) ctx.hashesAprovados[h] = { lote: r[LANC_COL.lote], data: Utilities.formatDate(new Date(r[LANC_COL.data]), 'America/Sao_Paulo', 'dd/MM/yyyy HH:mm') };
    });
    if (anterior && String(r[LANC_COL.periodo]) === anterior) {
      var serie = [r[LANC_COL.tipo_brisanet], r[LANC_COL.tipo_parceiro], r[LANC_COL.holding], r[LANC_COL.direcao]].join('|');
      ctx.anteriorPorSerie[serie] = centavos;
    }
  });
  return ctx;
}

// ---- Drive: originais ---------------------------------------------------------

/** Guarda o arquivo original, intacto, em Originais/AAAAMM. Idempotente pelo hash no nome. */
function Persist_guardarOriginal(periodo, upload) {
  var pasta = Persist_pasta(DriveApp.getFolderById(Config_obter('ID_PASTA_ORIGINAIS')), periodo);
  var nome = upload.hash.substring(0, 8) + '_' + upload.nome;
  var existente = pasta.getFilesByName(nome);
  if (existente.hasNext()) return existente.next().getUrl();
  var blob = Utilities.newBlob(Utilities.base64Decode(upload.base64), 'application/octet-stream', nome);
  return pasta.createFile(blob).getUrl();
}

function Persist_pasta(pai, nome) {
  var it = pai.getFoldersByName(nome);
  return it.hasNext() ? it.next() : pai.createFolder(nome);
}

// ---- Lancamentos --------------------------------------------------------------

/**
 * Grava o lote em Lancamentos. Chamar SOMENTE dentro do lock.
 * 1) marca versões ATIVAS anteriores das mesmas chaves como SUBSTITUIDO (1 escrita)
 * 2) acrescenta as novas linhas (1 escrita)
 * Devolve { n, versaoPorChave:{chave:versão}, loteAnteriorPorChave:{chave:lote} }.
 */
function Persist_gravarLote(loteId, grupos, hashes, nomesArquivos, parserId, usuario) {
  var l = Persist_lerLancamentos(), aba = l.aba, existentes = l.dados, agora = new Date();

  var versaoPorChave = {}, loteAnteriorPorChave = {};
  existentes.forEach(function (r) {
    var k = r[LANC_COL.chave], v = Number(r[LANC_COL.versao]) || 1;
    if (!versaoPorChave[k] || v > versaoPorChave[k]) versaoPorChave[k] = v;
  });
  var chavesNovas = {}; grupos.forEach(function (g) { chavesNovas[g.chave] = true; });
  var mudou = false;
  existentes.forEach(function (r) {
    if (r[LANC_COL.status] === 'ATIVO' && chavesNovas[r[LANC_COL.chave]]) {
      r[LANC_COL.status] = 'SUBSTITUIDO'; loteAnteriorPorChave[r[LANC_COL.chave]] = r[LANC_COL.lote]; mudou = true;
    }
  });
  if (mudou) aba.getRange(2, 1, existentes.length, LANC_CAB.length).setValues(existentes);

  var novaVersao = {};
  var novas = grupos.map(function (g, i) {
    var versao = (versaoPorChave[g.chave] || 0) + 1; novaVersao[g.chave] = versao;
    return [loteId + '-' + (i + 1), loteId, versao, 'ATIVO', g.periodo, g.tipoBrisa, g.tipoParceiro,
      g.holding, g.direcao, g.chamadas, Math.round(g.minutos * 10) / 10, Modelo_centavosParaReais(g.totalCentavos),
      hashes.join(','), nomesArquivos.join(' | '), g.linhas, usuario, agora, g.chave, parserId, ''];
  });
  if (novas.length) aba.getRange(aba.getLastRow() + 1, 1, novas.length, LANC_CAB.length).setValues(novas);
  return { n: novas.length, versaoPorChave: novaVersao, loteAnteriorPorChave: loteAnteriorPorChave };
}

// ---- Controle (valor consolidado) ---------------------------------------------
// Colunas do Controle: A owner, B tipo brisanet, C operadora, D tipo relacionada,
// G período, H mês, I detraf brisanet (EMISSAO), J detraf relacionada (RECEBIMENTO, negativo).
// Colunas E, Q, S e T têm fórmula: nunca são escritas. Escrevemos só A:D e G:J,
// preservando fórmulas digitadas pelo usuário em I/J (getFormulas).

function Persist_nomeMes(aaaamm) { return MESES_PT[parseInt(String(aaaamm).substring(4, 6), 10) - 1] || ''; }

/** Atualiza (ou cria) a linha de cada grupo. Devolve um log por grupo. */
function Persist_atualizarControle(grupos) {
  var aba = Persist_controle().getSheetByName(Config_obter('ABA_CONTROLE'));
  if (!aba) throw new Error("Aba '" + Config_obter('ABA_CONTROLE') + "' não existe na planilha Controle.");
  var PRIM = 3, ULT = aba.getMaxRows();
  var n = ULT - PRIM + 1;
  var rAD = aba.getRange(PRIM, 1, n, 4), rGJ = aba.getRange(PRIM, 7, n, 4);
  var AD = rAD.getValues(), GJ = rGJ.getValues(), GJf = rGJ.getFormulas();
  var logs = [];

  grupos.forEach(function (g) {
    var op = Calculo_nomeOperadora(g.holding), idx = -1;
    for (var i = 0; i < n; i++) {
      var tb = String(AD[i][1]).trim().toUpperCase(), o = String(AD[i][2]).trim().toUpperCase(), tr = String(AD[i][3]).trim().toUpperCase();
      if (String(GJ[i][0]).trim() === g.periodo && tb === g.tipoBrisa && o === op &&
          (tr === g.tipoParceiro || tr.indexOf(g.tipoParceiro) !== -1 || g.tipoParceiro.indexOf(tr) !== -1)) { idx = i; break; }
    }
    var criou = false;
    if (idx === -1) {
      for (var j = 0; j < n; j++) if (String(AD[j][2]).trim() === '') { idx = j; break; }
      if (idx === -1) { logs.push({ chave: g.chave, ok: false, log: 'Controle cheio: sem linha livre para ' + g.chave }); return; }
      AD[idx] = ['BRISANET', g.tipoBrisa, op, g.tipoParceiro];
      GJ[idx][0] = Number(g.periodo); GJ[idx][1] = Persist_nomeMes(g.periodo);
      GJf[idx] = ['', '', '', '']; GJ[idx][2] = 0; GJ[idx][3] = 0; criou = true;
    }
    var valor = Modelo_centavosParaReais(g.totalCentavos);
    if (g.direcao === 'EMISSAO') { GJ[idx][2] = Math.abs(valor); GJf[idx][2] = ''; }
    else { GJ[idx][3] = -Math.abs(valor); GJf[idx][3] = ''; }
    logs.push({ chave: g.chave, ok: true, linha: PRIM + idx,
      log: (criou ? 'Linha criada' : 'Linha atualizada') + ' (' + (PRIM + idx) + '): coluna ' + (g.direcao === 'EMISSAO' ? 'I' : 'J') + ' = ' + valor.toFixed(2) });
  });

  // Escrita em lote: fórmula do usuário (quando preservada) ou valor.
  var saidaGJ = GJ.map(function (linha, i) { return linha.map(function (v, k) { return GJf[i][k] ? GJf[i][k] : v; }); });
  rAD.setValues(AD); rGJ.setValues(saidaGJ);
  return logs;
}

/** Desfaz no Controle o valor de um lote estornado, só se a célula ainda tiver aquele valor. */
function Persist_desfazerControle(linhasLote) {
  var aba = Persist_controle().getSheetByName(Config_obter('ABA_CONTROLE'));
  var out = [];
  linhasLote.forEach(function (r) {
    var op = Calculo_nomeOperadora(r[LANC_COL.holding]), col = r[LANC_COL.direcao] === 'EMISSAO' ? 9 : 10;
    var PRIM = 3, n = aba.getMaxRows() - PRIM + 1;
    var AD = aba.getRange(PRIM, 1, n, 4).getValues(), G = aba.getRange(PRIM, 7, n, 1).getValues();
    for (var i = 0; i < n; i++) {
      if (String(G[i][0]).trim() === String(r[LANC_COL.periodo]) && String(AD[i][1]).toUpperCase() === r[LANC_COL.tipo_brisanet] &&
          String(AD[i][2]).toUpperCase() === op) {
        var cel = aba.getRange(PRIM + i, col), esperado = (col === 10 ? -1 : 1) * Number(r[LANC_COL.valor]);
        if (Math.abs(Number(cel.getValue()) - esperado) < 0.005) { cel.setValue(0); out.push('Linha ' + (PRIM + i) + ' zerada.'); }
        else out.push('Linha ' + (PRIM + i) + ' mudou depois da carga: não alterada.');
        return;
      }
    }
  });
  return out;
}

// ---- Detalhe mensal -----------------------------------------------------------

/** Aba AAAAMM; criada copiando o Modelo (mantém formatação e cabeçalho). */
function Persist_abaDetalhe(periodo) {
  var ss = Persist_detalhe(), aba = ss.getSheetByName(periodo);
  if (aba) return aba;
  var modelo = ss.getSheetByName(Config_obter('ABA_MODELO_DETALHE'));
  if (!modelo) throw new Error("Aba '" + Config_obter('ABA_MODELO_DETALHE') + "' não existe no Detalhe mensal.");
  aba = modelo.copyTo(ss).setName(periodo);
  aba.getRange(2, 1, Math.max(aba.getMaxRows() - 1, 1), DET_CAB.length).clearContent();
  aba.setTabColor('#FF5022');
  ss.setActiveSheet(aba); ss.moveActiveSheet(ss.getNumSheets());
  return aba;
}

/**
 * Grava as linhas dos grupos no detalhe do período. Chamar dentro do lock.
 * Versões anteriores da mesma chave (lote anterior + bloco) viram SUBSTITUIDO.
 */
function Persist_gravarDetalhe(periodo, grupos, loteId, versaoPorChave, loteAnteriorPorChave) {
  var aba = Persist_abaDetalhe(periodo);

  var ultima = aba.getLastRow();
  if (ultima > 1 && Object.keys(loteAnteriorPorChave).length) {
    var rSt = aba.getRange(2, DET_COL.BLOCO + 1, ultima - 1, 4);          // Q:T
    var vals = rSt.getValues(), mudou = false;
    grupos.forEach(function (g) {
      var antigo = loteAnteriorPorChave[g.chave], bloco = Calculo_tituloBloco(g);
      if (!antigo) return;
      vals.forEach(function (v) {
        if (v[1] === antigo && v[0] === bloco && v[3] === 'ATIVO') { v[3] = 'SUBSTITUIDO'; mudou = true; }
      });
    });
    if (mudou) rSt.setValues(vals);
  }

  var linhas = [];
  grupos.forEach(function (g) {
    var bloco = Calculo_tituloBloco(g);
    g.registros.forEach(function (r) {
      var c = r.colunas, d = r.detalhe;
      linhas.push([c[0], c[1], c[2], d.periodoTrafego, d.poi, c[5], d.descritor, c[7], r.chamadas, r.minutos,
        d.tarifa, d.liquido, d.piscofins, d.icms, Modelo_centavosParaReais(r.valorCentavos), d.cn,
        bloco, loteId, versaoPorChave[g.chave], 'ATIVO', r.arquivo]);
    });
  });
  var inicio = Math.max(aba.getLastRow(), 1) + 1;
  if (inicio + linhas.length > aba.getMaxRows()) aba.insertRowsAfter(aba.getMaxRows(), inicio + linhas.length - aba.getMaxRows());
  for (var i = 0; i < linhas.length; i += DET_LOTE_LINHAS) {
    var fatia = linhas.slice(i, i + DET_LOTE_LINHAS);
    aba.getRange(inicio + i, 1, fatia.length, DET_CAB.length).setValues(fatia);
  }
  return linhas.length;
}

/** Marca as linhas do lote como ESTORNADO no detalhe do período. */
function Persist_estornarDetalhe(periodo, loteId) {
  var aba = Persist_detalhe().getSheetByName(periodo);
  if (!aba || aba.getLastRow() < 2) return 0;
  var r = aba.getRange(2, DET_COL.BLOCO + 1, aba.getLastRow() - 1, 4), v = r.getValues(), n = 0;
  v.forEach(function (x) { if (x[1] === loteId && x[3] === 'ATIVO') { x[3] = 'ESTORNADO'; n++; } });
  if (n) r.setValues(v);
  return n;
}

/** Estorna um lote: Lancamentos + detalhe + Controle. Não apaga nada. Devolve resumo. */
function Persist_estornarLote(loteId, motivo) {
  var l = Persist_lerLancamentos(), dados = l.dados, afetadas = [];
  dados.forEach(function (r) {
    if (r[LANC_COL.lote] === loteId && r[LANC_COL.status] === 'ATIVO') {
      r[LANC_COL.status] = 'ESTORNADO'; r[LANC_COL.obs] = motivo; afetadas.push(r.slice());
    }
  });
  if (!afetadas.length) return { n: 0 };
  l.aba.getRange(2, 1, dados.length, LANC_CAB.length).setValues(dados);
  var periodos = {}; afetadas.forEach(function (r) { periodos[String(r[LANC_COL.periodo])] = true; });
  var linhasDetalhe = 0;
  Object.keys(periodos).forEach(function (p) { linhasDetalhe += Persist_estornarDetalhe(p, loteId); });
  var controle = Persist_desfazerControle(afetadas);
  return { n: afetadas.length, linhasDetalhe: linhasDetalhe, controle: controle };
}

// ---- Mapa EOT (Anexo 5) -------------------------------------------------------
// Mesmas colunas lidas pelo Auditor: A=EOT, B=operadora, E=tipo, G=área, M=UF.
function Eot_carregarMapa() {
  var cache = CacheService.getScriptCache();
  var salvo = cache.get('MAPA_EOT');
  if (salvo) return JSON.parse(salvo);
  var aba = SpreadsheetApp.openById(Config_obter('ID_PLANILHA_EOT')).getSheets()[0];
  var dados = aba.getDataRange().getValues();
  var mapa = {};
  for (var i = 1; i < dados.length; i++) {
    var eot = Modelo_normalizarEot(dados[i][0]);
    if (!eot) continue;
    var uf = String(dados[i][12]).trim().toUpperCase();
    var area = String(dados[i][6]).trim().toUpperCase();
    if (!uf || uf === '-') uf = area.indexOf('NACIONAL') !== -1 ? 'NACIONAL/INTERNACIONAL' : area;
    mapa[eot] = { operadora: Calculo_operadoraDoMapa(dados[i][1]), uf: uf, tipo: String(dados[i][4]).trim().toUpperCase(), mapeada: true };
  }
  try { cache.put('MAPA_EOT', JSON.stringify(mapa), 3600); } catch (e) { /* mapa grande demais para o cache: segue sem */ }
  return mapa;
}
