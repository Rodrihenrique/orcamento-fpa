// ==============================================================================
// CAMADA DE INTERFACE (servidor) — entrada do Web App e funções chamadas pela tela.
// Fluxo: api_conferir (só lê e valida) → api_aprovar (grava) → api_estornar.
// Toda função devolve { ok:true, ... } ou { ok:false, erro:'mensagem clara' }.
// ==============================================================================

function doGet() {
  var email = Session.getActiveUser().getEmail();
  if (!Config_usuarioAutorizado(email)) {
    return HtmlService.createHtmlOutput('<p style="font-family:sans-serif">Acesso não autorizado para ' +
      (email || 'este usuário') + '. Peça liberação ao responsável.</p>').setTitle('DETRAF');
  }
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('Execução DETRAF')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function Api_exigirAutorizado() {
  var faltando = Config_faltando();
  if (faltando.length) throw new Error('Configuração incompleta: ' + faltando.join(', ') + '. Rode configurarInicial().');
  var email = Session.getActiveUser().getEmail();
  if (!Config_usuarioAutorizado(email)) throw new Error('Usuário não autorizado: ' + email);
  return email;
}

/** Decodifica base64 → texto (UTF-8, com fallback ISO-8859-1) e calcula o SHA-256 dos bytes originais. */
function Api_prepararArquivo(a) {
  var bytes = Utilities.base64Decode(a.base64);
  var blob = Utilities.newBlob(bytes, 'text/plain');
  var texto = blob.getDataAsString('UTF-8');
  if (!texto || texto.indexOf(';') === -1) texto = blob.getDataAsString('ISO-8859-1');
  var hash = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, bytes)
    .map(function (b) { return ('0' + (b & 0xFF).toString(16)).slice(-2); }).join('');
  return { nome: a.nome, texto: texto, hash: hash, base64: a.base64 };
}

/** Roda leitura + cálculo + validação. Não grava nada. */
function Api_analisar(payload) {
  var arquivos = (payload.arquivos || []).map(Api_prepararArquivo);
  var leituras = arquivos.map(Parsers_ler);
  var registros = [];
  leituras.forEach(function (l) { if (l.ok) registros = registros.concat(l.registros); });

  var mapa = Eot_carregarMapa();
  var agrupado = Calculo_agrupar(registros, mapa);
  var periodo = registros.length ? registros[0].periodo : '';
  var contexto = Persist_contextoValidacao(periodo);
  contexto.periodoEsperado = payload.periodoEsperado || '';
  var validacao = Validacao_executar(leituras, agrupado, contexto);
  return { arquivos: arquivos, leituras: leituras, agrupado: agrupado, validacao: validacao, periodo: periodo };
}

function api_conferir(payload) {
  try {
    var email = Api_exigirAutorizado();
    var r = Api_analisar(payload);
    Log_registrar('CONFERIR', '', r.arquivos.map(function (a) { return a.nome; }), r.arquivos.map(function (a) { return a.hash; }),
      r.validacao.podeAprovar ? 'OK' : 'COM_ERROS', r.validacao.erros.length + ' erro(s), ' + r.validacao.avisos.length + ' aviso(s)');
    // Resposta enxuta: sem as linhas brutas (peso), só o que a tela mostra.
    return {
      ok: true, usuario: email, periodo: r.periodo,
      arquivos: r.leituras.map(function (l) {
        return { nome: l.arquivo, ok: l.ok, erro: l.erro || null, hash: l.hash || null, parser: l.parserId || null,
          linhas: l.ok ? l.registros.length : 0, rejeitadas: l.ok ? l.rejeitadas.slice(0, 100) : [],
          totalRejeitadas: l.ok ? l.rejeitadas.length : 0 };
      }),
      grupos: r.agrupado.grupos.map(function (g) {
        return { chave: g.chave, tipoBrisa: g.tipoBrisa, tipoParceiro: g.tipoParceiro, holding: g.holding, direcao: g.direcao,
          linhas: g.linhas, chamadas: g.chamadas, minutos: Math.round(g.minutos * 10) / 10, total: Modelo_centavosParaReais(g.totalCentavos) };
      }),
      totalGeral: Modelo_centavosParaReais(r.agrupado.totalCentavos),
      eotsNaoMapeadas: r.agrupado.eotsNaoMapeadas,
      erros: r.validacao.erros, avisos: r.validacao.avisos, podeAprovar: r.validacao.podeAprovar
    };
  } catch (e) {
    return { ok: false, erro: e.message };
  }
}

/** payload = { arquivos:[{nome,base64}], aceites:[idsAviso], periodoEsperado } — reprocessa tudo no servidor. */
function api_aprovar(payload) {
  var lock = LockService.getScriptLock();
  try {
    var email = Api_exigirAutorizado();
    if (!lock.tryLock(30000)) return { ok: false, erro: 'Outra aprovação está em andamento. Tente de novo em instantes.' };

    var r = Api_analisar(payload);
    var nomes = r.arquivos.map(function (a) { return a.nome; });
    var hashes = r.arquivos.map(function (a) { return a.hash; });

    if (!r.validacao.podeAprovar) {
      Log_registrar('APROVAR', '', nomes, hashes, 'RECUSADO', 'Erros bloqueantes');
      return { ok: false, erro: 'Há erros bloqueantes. Corrija e confira de novo.' };
    }
    var aceites = payload.aceites || [];
    var pendentes = r.validacao.avisos.filter(function (a) { return aceites.indexOf(a.id) === -1; });
    if (pendentes.length) return { ok: false, erro: pendentes.length + ' aviso(s) sem "li e aceito".' };

    // Última conferência: soma dos grupos = soma das linhas.
    var somaLinhas = 0; r.leituras.forEach(function (l) { l.registros.forEach(function (x) { somaLinhas += x.valorCentavos; }); });
    var somaGrupos = r.agrupado.grupos.reduce(function (s, g) { return s + g.totalCentavos; }, 0);
    if (somaLinhas !== somaGrupos) throw new Error('Soma dos grupos difere da soma das linhas. Nada foi gravado.');

    var loteId = Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'yyyyMMdd-HHmmss');
    r.arquivos.forEach(function (a) { Persist_guardarOriginal(r.periodo, a); });
    var n = Persist_gravarLote(loteId, r.agrupado.grupos, hashes, nomes, r.leituras[0].parserId, email);
    Log_registrar('APROVAR', loteId, nomes, hashes, 'GRAVADO', n + ' lançamento(s), total ' + Modelo_centavosParaReais(somaGrupos).toFixed(2));
    return { ok: true, lote: loteId, lancamentos: n, total: Modelo_centavosParaReais(somaGrupos) };
  } catch (e) {
    Log_registrar('APROVAR', '', [], [], 'ERRO', e.message);
    return { ok: false, erro: e.message };
  } finally {
    try { lock.releaseLock(); } catch (x) { /* lock não obtido */ }
  }
}

function api_estornar(loteId, motivo) {
  var lock = LockService.getScriptLock();
  try {
    Api_exigirAutorizado();
    if (!loteId || !motivo || String(motivo).trim().length < 5) return { ok: false, erro: 'Informe o lote e o motivo (mínimo 5 caracteres).' };
    if (!lock.tryLock(30000)) return { ok: false, erro: 'Outra operação em andamento. Tente de novo.' };
    var n = Persist_estornarLote(loteId, motivo);
    Log_registrar('ESTORNAR', loteId, [], [], n ? 'ESTORNADO' : 'NADA_A_ESTORNAR', motivo);
    return n ? { ok: true, estornados: n } : { ok: false, erro: 'Nenhum lançamento ATIVO no lote ' + loteId + '.' };
  } catch (e) {
    return { ok: false, erro: e.message };
  } finally {
    try { lock.releaseLock(); } catch (x) { /* ignora */ }
  }
}
