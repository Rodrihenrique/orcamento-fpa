// ==============================================================================
// CAMADA DE PERSISTÊNCIA — única que toca planilha e Drive.
// Só é chamada pela aprovação (nunca na leitura/conferência).
//
// Aba Lancamentos (cabeçalho em LANC_CAB). Nunca apagamos linha:
//   status ATIVO → SUBSTITUIDO (nova versão) ou ESTORNADO (reversão com motivo).
// Gravação sempre em lote (um setValues por operação).
// ==============================================================================

var LANC_CAB = ['id', 'lote', 'versao', 'status', 'periodo', 'tipo_brisanet', 'tipo_parceiro',
  'holding', 'direcao', 'chamadas', 'minutos', 'valor', 'hash_arquivos', 'arquivos',
  'linhas', 'usuario', 'data', 'chave', 'parser', 'obs'];
var LANC_COL = {}; LANC_CAB.forEach(function (n, i) { LANC_COL[n] = i; });

function Persist_planilha() {
  return SpreadsheetApp.openById(Config_obter('ID_PLANILHA_DESTINO'));
}

function Persist_aba(nome, cabecalho) {
  var ss = Persist_planilha();
  var aba = ss.getSheetByName(nome);
  if (!aba) {
    aba = ss.insertSheet(nome);
    aba.getRange(1, 1, 1, cabecalho.length).setValues([cabecalho]).setFontWeight('bold');
    aba.setFrozenRows(1);
  }
  return aba;
}

function Persist_periodoAnterior(aaaamm) {
  var a = parseInt(aaaamm.substring(0, 4), 10), m = parseInt(aaaamm.substring(4, 6), 10) - 1;
  if (m === 0) { m = 12; a -= 1; }
  return a + (m < 10 ? '0' : '') + m;
}

/** Lê Lancamentos uma vez e monta o contexto da validação. */
function Persist_contextoValidacao(periodo) {
  var aba = Persist_aba(Config_obter('ABA_LANCAMENTOS'), LANC_CAB);
  var dados = aba.getLastRow() > 1 ? aba.getRange(2, 1, aba.getLastRow() - 1, LANC_CAB.length).getValues() : [];
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

/** Guarda o arquivo original, intacto, em Originais/AAAAMM. Idempotente pelo hash no nome. */
function Persist_guardarOriginal(periodo, arquivo) {
  var raiz = DriveApp.getFolderById(Config_obter('ID_PASTA_RAIZ'));
  var pasta = Persist_pasta(Persist_pasta(raiz, 'Originais'), periodo);
  var nome = arquivo.hash.substring(0, 8) + '_' + arquivo.nome;
  var existente = pasta.getFilesByName(nome);
  if (existente.hasNext()) return existente.next().getUrl();
  var blob = Utilities.newBlob(Utilities.base64Decode(arquivo.base64), 'application/octet-stream', nome);
  return pasta.createFile(blob).getUrl();
}

function Persist_pasta(pai, nome) {
  var it = pai.getFoldersByName(nome);
  return it.hasNext() ? it.next() : pai.createFolder(nome);
}

/**
 * Grava um lote aprovado. Chamar SOMENTE dentro do lock.
 * 1) marca versões anteriores da mesma chave como SUBSTITUIDO (1 escrita)
 * 2) acrescenta as novas linhas (1 escrita)
 */
function Persist_gravarLote(loteId, grupos, hashes, nomesArquivos, parserId, usuario) {
  var aba = Persist_aba(Config_obter('ABA_LANCAMENTOS'), LANC_CAB);
  var agora = new Date();
  var existentes = aba.getLastRow() > 1 ? aba.getRange(2, 1, aba.getLastRow() - 1, LANC_CAB.length).getValues() : [];

  var versaoPorChave = {};
  existentes.forEach(function (r) {
    var k = r[LANC_COL.chave], v = Number(r[LANC_COL.versao]) || 1;
    if (!versaoPorChave[k] || v > versaoPorChave[k]) versaoPorChave[k] = v;
  });

  var chavesNovas = {}; grupos.forEach(function (g) { chavesNovas[g.chave] = true; });
  var mudou = false;
  existentes.forEach(function (r) {
    if (r[LANC_COL.status] === 'ATIVO' && chavesNovas[r[LANC_COL.chave]]) { r[LANC_COL.status] = 'SUBSTITUIDO'; mudou = true; }
  });
  if (mudou) aba.getRange(2, 1, existentes.length, LANC_CAB.length).setValues(existentes);

  var novas = grupos.map(function (g, i) {
    var versao = (versaoPorChave[g.chave] || 0) + 1;
    return [loteId + '-' + (i + 1), loteId, versao, 'ATIVO', g.periodo, g.tipoBrisa, g.tipoParceiro,
      g.holding, g.direcao, g.chamadas, Math.round(g.minutos * 10) / 10, Modelo_centavosParaReais(g.totalCentavos),
      hashes.join(','), nomesArquivos.join(' | '), g.linhas, usuario, agora, g.chave, parserId, ''];
  });
  if (novas.length) aba.getRange(aba.getLastRow() + 1, 1, novas.length, LANC_CAB.length).setValues(novas);
  return novas.length;
}

/** Estorna um lote: muda status para ESTORNADO e guarda o motivo. Não apaga nada. */
function Persist_estornarLote(loteId, motivo) {
  var aba = Persist_aba(Config_obter('ABA_LANCAMENTOS'), LANC_CAB);
  if (aba.getLastRow() < 2) return 0;
  var dados = aba.getRange(2, 1, aba.getLastRow() - 1, LANC_CAB.length).getValues();
  var n = 0;
  dados.forEach(function (r) {
    if (r[LANC_COL.lote] === loteId && r[LANC_COL.status] === 'ATIVO') {
      r[LANC_COL.status] = 'ESTORNADO'; r[LANC_COL.obs] = motivo; n++;
    }
  });
  if (n) aba.getRange(2, 1, dados.length, LANC_CAB.length).setValues(dados);
  return n;
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
