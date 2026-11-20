// ==============================================================================
// CAMADA DE RELATÓRIOS — só leitura. Alimenta o Dashboard e a Consulta.
// Fonte única: aba Lancamentos (histórico versionado). Não lê a aba Controle,
// porque ela mistura valores do sistema com digitação manual.
//  - Dashboard: soma só linhas ATIVO (a versão vigente de cada projeção).
//  - Consulta : lista tudo (ATIVO, SUBSTITUIDO, ESTORNADO) para auditoria.
// Funções Rel_* sem acesso a planilha são puras e têm teste em tests/relatorios.cjs.
// ==============================================================================

var REL_LIMITE_LINHAS_CONSULTA = 3000;   // teto de lançamentos devolvidos à tela (mais recentes primeiro)

/** Converte uma linha da aba Lancamentos em objeto simples (sem Date: google.script.run não leva Date). */
function Rel_linha(r, fmtData) {
  var valor = Math.abs(Number(r[LANC_COL.valor]) || 0);
  var d = r[LANC_COL.data];
  return {
    id: String(r[LANC_COL.id]), lote: String(r[LANC_COL.lote]), versao: Number(r[LANC_COL.versao]) || 1,
    status: String(r[LANC_COL.status]), periodo: String(r[LANC_COL.periodo]),
    tipoBrisa: String(r[LANC_COL.tipo_brisanet]), tipoParceiro: String(r[LANC_COL.tipo_parceiro]),
    holding: String(r[LANC_COL.holding]), operadora: Calculo_nomeOperadora(r[LANC_COL.holding]),
    direcao: String(r[LANC_COL.direcao]),
    chamadas: Number(r[LANC_COL.chamadas]) || 0, minutos: Number(r[LANC_COL.minutos]) || 0, valor: valor,
    arquivos: String(r[LANC_COL.arquivos]), hashes: String(r[LANC_COL.hash_arquivos]),
    linhas: Number(r[LANC_COL.linhas]) || 0, usuario: String(r[LANC_COL.usuario]),
    data: d instanceof Date ? (fmtData ? fmtData(d) : d.toISOString()) : String(d || ''),
    chave: String(r[LANC_COL.chave]), parser: String(r[LANC_COL.parser]), obs: String(r[LANC_COL.obs] || '')
  };
}

function Rel_soma(a, b) { return Math.round((a + b) * 100) / 100; }

/**
 * Base do dashboard: só ATIVO. emissao = brisanet credora (a receber);
 * recebimento = brisanet devedora (a pagar). Valores em reais, positivos.
 * { meses: { AAAAMM: { emissao, recebimento, chamadas, minutos,
 *                      ops:{OP:{emissao,recebimento}}, tipos:{TIPO:{emissao,recebimento}} } } }
 */
function Rel_baseDashboard(lancs) {
  var meses = {};
  lancs.forEach(function (l) {
    if (l.status !== 'ATIVO') return;
    var m = meses[l.periodo];
    if (!m) m = meses[l.periodo] = { emissao: 0, recebimento: 0, chamadas: 0, minutos: 0, ops: {}, tipos: {} };
    var campo = l.direcao === 'EMISSAO' ? 'emissao' : 'recebimento';
    m[campo] = Rel_soma(m[campo], l.valor);
    m.chamadas += l.chamadas; m.minutos = Math.round((m.minutos + l.minutos) * 10) / 10;
    [['ops', l.operadora], ['tipos', l.tipoBrisa]].forEach(function (par) {
      var mapa = m[par[0]], k = par[1] || '—';
      if (!mapa[k]) mapa[k] = { emissao: 0, recebimento: 0 };
      mapa[k][campo] = Rel_soma(mapa[k][campo], l.valor);
    });
  });
  return { meses: meses };
}

/** Lista para a Consulta: mais recentes primeiro (data, depois id), com teto. */
function Rel_listaConsulta(lancs) {
  var lista = lancs.slice().sort(function (a, b) {
    return a.data < b.data ? 1 : a.data > b.data ? -1 : (a.id < b.id ? 1 : -1);
  });
  var total = lista.length;
  return { linhas: lista.slice(0, REL_LIMITE_LINHAS_CONSULTA), total: total, cortado: total > REL_LIMITE_LINHAS_CONSULTA };
}

/** Versões da mesma projeção (mesma chave), da mais nova para a mais antiga. */
function Rel_historicoChave(lancs, chave) {
  return lancs.filter(function (l) { return l.chave === chave; })
    .sort(function (a, b) { return b.versao - a.versao; });
}

/**
 * Soma por EOT das linhas do detalhe mensal de UM lançamento.
 * linhasDet: linhas da aba AAAAMM (ver DET_CAB). Filtra por lote + bloco.
 * Devolve { credoras, devedoras, linhas } no mesmo formato da conferência.
 */
function Rel_resumoDetalhe(linhasDet, lote, bloco, mapa) {
  var registros = [];
  linhasDet.forEach(function (c) {
    if (String(c[DET_COL.LOTE]) !== lote || String(c[DET_COL.BLOCO]) !== bloco) return;
    registros.push({
      eotBilhetagem: String(c[0]), eotRelacionada: String(c[1]),
      chamadas: Number(c[8]) || 0, minutos: Number(c[9]) || 0,
      valorCentavos: Math.round((Number(c[14]) || 0) * 100), tipoServico: ''
    });
  });
  var base = Calculo_operadoraBase(registros, mapa);
  return {
    linhas: registros.length,
    credoras: Calculo_resumoEots(registros, 'eotBilhetagem', mapa, base).map(Api_linhaEot),
    devedoras: Calculo_resumoEots(registros, 'eotRelacionada', mapa, base).map(Api_linhaEot)
  };
}

// ---- Acesso a planilha/Drive (fino, sem regra) ---------------------------------

function Rel_lerTodos() {
  var fmt = function (d) { return Utilities.formatDate(d, 'America/Sao_Paulo', 'yyyy-MM-dd HH:mm'); };
  return Persist_lerLancamentos().dados.map(function (r) { return Rel_linha(r, fmt); });
}

/** Links dos arquivos originais do lançamento: Originais/AAAAMM/<hash8>_<nome>. */
function Rel_linksOriginais(periodo, hashes) {
  var out = [];
  try {
    var pai = DriveApp.getFolderById(Config_obter('ID_PASTA_ORIGINAIS'));
    var it = pai.getFoldersByName(periodo);
    if (!it.hasNext()) return out;
    var pasta = it.next();
    String(hashes).split(',').forEach(function (h) {
      if (!h) return;
      var arqs = pasta.getFiles();
      while (arqs.hasNext()) {
        var a = arqs.next();
        if (a.getName().indexOf(h.substring(0, 8) + '_') === 0) { out.push({ nome: a.getName().substring(9), url: a.getUrl() }); break; }
      }
    });
  } catch (e) { /* sem acesso ao Drive: a tela mostra só o que tem */ }
  return out;
}

/** Detalhe de um lançamento: histórico de versões + soma por EOT + originais. */
function Rel_detalheLancamento(id) {
  var todos = Rel_lerTodos();
  var alvo = todos.filter(function (l) { return l.id === id; })[0];
  if (!alvo) throw new Error('Lançamento não encontrado: ' + id);
  var bloco = Calculo_tituloBloco({ holding: alvo.holding, direcao: alvo.direcao, tipoBrisa: alvo.tipoBrisa, tipoParceiro: alvo.tipoParceiro });
  var eots = { credoras: [], devedoras: [], linhas: 0, aviso: '' };
  var aba = Persist_detalhe().getSheetByName(alvo.periodo);
  if (!aba || aba.getLastRow() < 2) {
    eots.aviso = 'A aba ' + alvo.periodo + ' do detalhe mensal não tem linhas.';
  } else {
    var det = aba.getRange(2, 1, aba.getLastRow() - 1, DET_CAB.length).getValues();
    eots = Rel_resumoDetalhe(det, alvo.lote, bloco, Eot_carregarMapa());
    eots.aviso = eots.linhas ? '' : 'Nenhuma linha deste lote no detalhe mensal.';
  }
  return { lancamento: alvo, bloco: bloco, historico: Rel_historicoChave(todos, alvo.chave), eots: eots,
           originais: Rel_linksOriginais(alvo.periodo, alvo.hashes) };
}
