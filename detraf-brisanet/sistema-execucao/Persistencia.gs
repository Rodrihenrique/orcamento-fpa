// ==============================================================================
// CAMADA DE PERSISTÊNCIA — única que toca planilha e Drive.
// Só é chamada pela aprovação (nunca na leitura/conferência).
//
// Destinos:
//  1) Controle › Lancamentos  : histórico versionado (ATIVO / SUBSTITUIDO / ESTORNADO)
//  2) Controle (original) › "Controle - DETRAF E DEROAM": colunas I/J das linhas já existentes (Controle.gs)
//  3) Sistema › AAAAMM        : registro completo das linhas (bloco/lote/versão/status) — fonte da verdade
//  4) DETRAF Devedor (original) › AAAAMM: projeção das versões vigentes no modelo da planilha (Devedor.gs)
//  5) Drive › Originais/AAAAMM: arquivo original intacto
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

/** Planilha ORIGINAL de Controle (só a aba de controle é tocada; nunca criamos abas nela). */
function Persist_controle() { return SpreadsheetApp.openById(Config_obter('ID_PLANILHA_CONTROLE')); }
/** Planilha do sistema: abas Lancamentos, Log e AAAAMM. Sem ID próprio, usa a do detalhe. */
function Persist_sistema() { return SpreadsheetApp.openById(Config_obter('ID_PLANILHA_SISTEMA') || Config_obter('ID_PLANILHA_DETALHE')); }
function Persist_detalhe() { return Persist_sistema(); }

/** Nome do mês em português ('202610' → 'OUTUBRO'). */
function Persist_nomeMes(aaaamm) { return MESES_PT[parseInt(String(aaaamm).substring(4, 6), 10) - 1] || ''; }

function Persist_aba(nome, cabecalho) {
  var ss = Persist_sistema();
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

/** Linha de Lancamentos → item enxuto usado por Controle.gs e Devedor.gs (valor em reais). */
function Persist_itemAtivo(r) {
  return { chave: r[LANC_COL.chave], lote: r[LANC_COL.lote], periodo: String(r[LANC_COL.periodo]), tipoBrisa: r[LANC_COL.tipo_brisanet],
    tipoParceiro: r[LANC_COL.tipo_parceiro], holding: r[LANC_COL.holding], direcao: r[LANC_COL.direcao], valor: Number(r[LANC_COL.valor]) };
}

/** Lê Lancamentos uma vez e monta o contexto da validação. */
function Persist_contextoValidacao(periodo) {
  var dados = Persist_lerLancamentos().dados;
  var ctx = {
    periodoEsperado: '', hashesAprovados: {}, ativosPorChave: {}, anteriorPorSerie: {}, ativos: [],
    limiteVariacaoPct: Config_obter('LIMITE_VARIACAO_PCT'),
    toleranciaTotalCentavos: Config_obter('TOLERANCIA_TOTAL_CENTAVOS')
  };
  var anterior = periodo ? Persist_periodoAnterior(periodo) : '';
  dados.forEach(function (r) {
    if (r[LANC_COL.status] !== 'ATIVO') return;
    var centavos = Math.round(Number(r[LANC_COL.valor]) * 100);
    ctx.ativosPorChave[r[LANC_COL.chave]] = { valorCentavos: centavos, hash: r[LANC_COL.hash_arquivos], lote: r[LANC_COL.lote] };
    ctx.ativos.push(Persist_itemAtivo(r));
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

// ---- Detalhe mensal -----------------------------------------------------------

/** Aba AAAAMM; criada copiando o Modelo (mantém formatação e cabeçalho). */
function Persist_abaDetalhe(periodo) {
  var ss = Persist_detalhe(), aba = ss.getSheetByName(periodo);
  if (aba) return aba;
  var modelo = ss.getSheetByName(Config_obter('ABA_MODELO_DETALHE'));
  if (modelo) {
    aba = modelo.copyTo(ss).setName(periodo);
    aba.getRange(2, 1, Math.max(aba.getMaxRows() - 1, 1), DET_CAB.length).clearContent();
    ss.setActiveSheet(aba); ss.moveActiveSheet(ss.getNumSheets());
  } else {   // sem aba Modelo: cria em branco com o cabeçalho padrão
    aba = ss.insertSheet(periodo);
    aba.getRange(1, 1, 1, DET_CAB.length).setValues([DET_CAB]).setFontWeight('bold');
    aba.setFrozenRows(1);
  }
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

/** Estorna um lote: Lancamentos + detalhe + Controle + Devedor. Não apaga histórico. Devolve resumo. */
function Persist_estornarLote(loteId, motivo) {
  var l = Persist_lerLancamentos(), dados = l.dados, afetadas = [];
  var antes = dados.filter(function (r) { return r[LANC_COL.status] === 'ATIVO'; }).map(Persist_itemAtivo);
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
  var depois = dados.filter(function (r) { return r[LANC_COL.status] === 'ATIVO'; }).map(Persist_itemAtivo);
  var itens = afetadas.map(Persist_itemAtivo), controle, devedor;
  try { controle = Controle_desfazer(itens, antes, depois); } catch (e) { controle = ['Controle não ajustado: ' + e.message]; }
  try { devedor = Devedor_republicar(itens); } catch (e) { devedor = ['Devedor não ajustado: ' + e.message]; }
  return { n: afetadas.length, linhasDetalhe: linhasDetalhe, controle: controle, devedor: devedor };
}

// ---- Mapa EOT (Anexo 5) -------------------------------------------------------
// Mesmas colunas lidas pelo Auditor: A=EOT, B=operadora, E=tipo, G=área, M=UF.
function Eot_carregarMapa() {
  var cache = CacheService.getScriptCache();
  var salvo = cache.get('MAPA_EOT');
  if (salvo) return JSON.parse(salvo);
  var ss = SpreadsheetApp.openById(Config_obter('ID_PLANILHA_EOT')), aba = null;
  var gid = Config_obter('GID_ABA_EOT');           // opcional: aba específica (gid do link da planilha)
  if (gid) ss.getSheets().forEach(function (s) { if (String(s.getSheetId()) === String(gid)) aba = s; });
  if (!aba) aba = ss.getSheets()[0];
  var dados = aba.getDataRange().getValues();
  var mapa = {}, n = 0;
  for (var i = 1; i < dados.length; i++) {
    var eot = Modelo_normalizarEot(dados[i][0]);
    if (!eot) continue;
    var uf = String(dados[i][12]).trim().toUpperCase();
    var area = String(dados[i][6]).trim().toUpperCase();
    if (!uf || uf === '-') uf = area.indexOf('NACIONAL') !== -1 ? 'NACIONAL/INTERNACIONAL' : area;
    mapa[eot] = { operadora: Calculo_operadoraDoMapa(dados[i][1]), uf: uf, tipo: String(dados[i][4]).trim().toUpperCase(), mapeada: true };
    n++;
  }
  // Guarda de layout: o Anexo 5 tem milhares de EOTs; poucas significa aba/colunas erradas.
  if (n < 50) throw new Error("Anexo 5: só " + n + " EOT(s) lidas na aba '" + aba.getName() + "'. Confira GID_ABA_EOT e as colunas (A=EOT, B=operadora, E=tipo, G=área, M=UF).");
  try { cache.put('MAPA_EOT', JSON.stringify(mapa), 3600); } catch (e) { /* mapa grande demais para o cache: segue sem */ }
  return mapa;
}
