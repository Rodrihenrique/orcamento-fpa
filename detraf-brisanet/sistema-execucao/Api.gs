// ==============================================================================
// CAMADA DE INTERFACE (servidor) — entrada do Web App e funções chamadas pela tela.
// Fluxo: api_conferir (só lê e valida) → api_aprovar (grava) → api_estornar.
// Toda função devolve { ok:true, ... } ou { ok:false, erro:'mensagem clara' }.
// O servidor reprocessa tudo na aprovação: não confia no que a tela já calculou.
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

/** Roda entrada + leitura + cálculo + validação. Não grava nada. */
function Api_analisar(payload) {
  var expandidos = (payload.arquivos || []).map(Entrada_expandir);
  var uploads = expandidos.map(function (e) { return e.upload; });
  var logicos = [];
  expandidos.forEach(function (e) { logicos = logicos.concat(e.logicos); });
  var leituras = logicos.map(Parsers_ler);

  var registros = [];
  leituras.forEach(function (l) { if (l.ok) registros = registros.concat(l.registros); });

  var agrupado = Calculo_agrupar(registros, Eot_carregarMapa());
  var periodo = registros.length ? registros[0].periodo : '';
  var contexto = Persist_contextoValidacao(periodo);
  contexto.periodoEsperado = payload.periodoEsperado || '';
  var validacao = Validacao_executar(leituras, agrupado, contexto);

  // Destinos originais: simula a gravação no Controle (sem gravar) e confere acesso ao Devedor.
  var plano = null;
  if (agrupado.grupos.length) {
    try { plano = Controle_planejar(agrupado.grupos, contexto.ativos); }
    catch (e) { validacao.erros.push({ codigo: 'CONTROLE_ILEGIVEL', detalhe: null, mensagem: 'Não consegui ler o Controle: ' + e.message }); }
    if (plano) {
      plano.erros.forEach(function (x) { validacao.erros.push(x); });
      plano.avisos.forEach(function (x) { validacao.avisos.push(x); });
    }
    if (agrupado.grupos.some(function (g) { return g.direcao === 'RECEBIMENTO'; })) {
      var falhaDevedor = Devedor_verificar();
      if (falhaDevedor) validacao.erros.push({ codigo: 'DEVEDOR_INACESSIVEL', detalhe: null, mensagem: falhaDevedor });
    }
    validacao.podeAprovar = validacao.erros.length === 0;
  }
  return { uploads: uploads, leituras: leituras, agrupado: agrupado, validacao: validacao, periodo: periodo, plano: plano };
}

/** Linha de EOT para a tela (valor em reais). */
function Api_linhaEot(e) {
  return { eot: e.eot, operadora: e.operadora, uf: e.uf, tipo: e.tipo, mapeada: e.mapeada,
           chamadas: e.chamadas, minutos: e.minutos, valor: Modelo_centavosParaReais(e.valorCentavos) };
}

function api_conferir(payload) {
  try {
    var email = Api_exigirAutorizado();
    var r = Api_analisar(payload);
    Log_registrar('CONFERIR', '', r.uploads.map(function (a) { return a.nome; }), r.uploads.map(function (a) { return a.hash; }),
      r.validacao.podeAprovar ? 'OK' : 'COM_ERROS', r.validacao.erros.length + ' erro(s), ' + r.validacao.avisos.length + ' aviso(s)');
    // Resposta enxuta: sem as linhas brutas (peso), só o que a tela mostra.
    return {
      ok: true, usuario: email, periodo: r.periodo,
      arquivos: r.leituras.map(function (l) {
        return { nome: l.arquivo, origem: l.origem || l.arquivo, ok: l.ok, erro: l.erro || null, hash: l.hash || null, parser: l.parserId || null,
          linhas: l.ok ? l.registros.length : 0, rejeitadas: l.ok ? l.rejeitadas.slice(0, 100) : [],
          totalRejeitadas: l.ok ? l.rejeitadas.length : 0,
          somaLinhas: l.ok ? Modelo_centavosParaReais(l.registros.reduce(function (s, x) { return s + x.valorCentavos; }, 0)) : null,
          totalDeclarado: l.ok && l.totalDeclaradoCentavos !== null && l.totalDeclaradoCentavos !== undefined ? Modelo_centavosParaReais(l.totalDeclaradoCentavos) : null,
          fonteTotal: l.fonteTotal || null };
      }),
      grupos: r.agrupado.grupos.map(function (g) {
        return { chave: g.chave, tipoBrisa: g.tipoBrisa, tipoParceiro: g.tipoParceiro, holding: g.holding, direcao: g.direcao,
          bloco: Calculo_tituloBloco(g),
          linhas: g.linhas, chamadas: g.chamadas, minutos: Math.round(g.minutos * 10) / 10, total: Modelo_centavosParaReais(g.totalCentavos),
          credoras: g.credoras.map(Api_linhaEot), devedoras: g.devedoras.map(Api_linhaEot) };
      }),
      chamadasGeral: r.agrupado.grupos.reduce(function (s, g) { return s + g.chamadas; }, 0),
      minutosGeral: Math.round(r.agrupado.grupos.reduce(function (s, g) { return s + g.minutos; }, 0) * 10) / 10,
      totalGeral: Modelo_centavosParaReais(r.agrupado.totalCentavos),
      eotsNaoMapeadas: r.agrupado.eotsNaoMapeadas,
      erros: r.validacao.erros, avisos: r.validacao.avisos, podeAprovar: r.validacao.podeAprovar
    };
  } catch (e) {
    return { ok: false, erro: e.message };
  }
}

/** payload = { arquivos:[{nome,base64,extras}], aceites:[idsAviso], periodoEsperado } */
function api_aprovar(payload) {
  var lock = LockService.getScriptLock();
  var temLock = false;
  try {
    var email = Api_exigirAutorizado();
    if (!lock.tryLock(30000)) return { ok: false, erro: 'Outra aprovação está em andamento. Tente de novo em instantes.' };
    temLock = true;

    var r = Api_analisar(payload);
    var nomes = r.uploads.map(function (a) { return a.nome; });
    var hashes = r.uploads.map(function (a) { return a.hash; });

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
    var parserId = r.leituras.map(function (l) { return l.parserId; }).filter(function (v, i, a) { return v && a.indexOf(v) === i; }).join('+');

    // Ordem: Lancamentos (versão) → detalhe → Controle → originais. Cada etapa é lote.
    var lanc = Persist_gravarLote(loteId, r.agrupado.grupos, hashes, nomes, parserId, email);
    var nDet = Persist_gravarDetalhe(r.periodo, r.agrupado.grupos, loteId, lanc.versaoPorChave, lanc.loteAnteriorPorChave);
    var logsControle, logsDevedor;
    try { logsControle = Controle_aplicar(r.plano); } catch (e) { logsControle = ['Controle NÃO atualizado: ' + e.message + ' (lançamentos já gravados; corrija e use o estorno do lote se precisar refazer).']; }
    try {
      var itensNovos = r.agrupado.grupos.map(function (g) { return { chave: g.chave, periodo: g.periodo, tipoBrisa: g.tipoBrisa, tipoParceiro: g.tipoParceiro, holding: g.holding, direcao: g.direcao }; });
      logsDevedor = Devedor_republicar(itensNovos);
    } catch (e) { logsDevedor = ['Devedor NÃO atualizado: ' + e.message]; }
    r.uploads.forEach(function (u) { Persist_guardarOriginal(r.periodo, u); });

    Log_registrar('APROVAR', loteId, nomes, hashes, 'GRAVADO',
      lanc.n + ' lançamento(s), ' + nDet + ' linha(s) de detalhe, total ' + Modelo_centavosParaReais(somaGrupos).toFixed(2));
    return { ok: true, lote: loteId, lancamentos: lanc.n, linhasDetalhe: nDet, total: Modelo_centavosParaReais(somaGrupos),
             controle: logsControle, devedor: logsDevedor };
  } catch (e) {
    Log_registrar('APROVAR', '', [], [], 'ERRO', e.message);
    return { ok: false, erro: e.message };
  } finally {
    if (temLock) { try { lock.releaseLock(); } catch (x) { /* já liberado */ } }
  }
}

function api_estornar(loteId, motivo) {
  var lock = LockService.getScriptLock();
  var temLock = false;
  try {
    Api_exigirAutorizado();
    if (!loteId || !motivo || String(motivo).trim().length < 5) return { ok: false, erro: 'Informe o lote e o motivo (mínimo 5 caracteres).' };
    if (!lock.tryLock(30000)) return { ok: false, erro: 'Outra operação em andamento. Tente de novo.' };
    temLock = true;
    var res = Persist_estornarLote(String(loteId).trim(), String(motivo).trim());
    Log_registrar('ESTORNAR', loteId, [], [], res.n ? 'ESTORNADO' : 'NADA_A_ESTORNAR',
      res.n ? res.n + ' lançamento(s); ' + res.controle.concat(res.devedor || []).join(' ') : String(motivo));
    return res.n ? { ok: true, estornados: res.n, linhasDetalhe: res.linhasDetalhe, controle: res.controle, devedor: res.devedor }
                 : { ok: false, erro: 'Nenhum lançamento ATIVO no lote ' + loteId + '.' };
  } catch (e) {
    return { ok: false, erro: e.message };
  } finally {
    if (temLock) { try { lock.releaseLock(); } catch (x) { /* ignora */ } }
  }
}

// ---- Relatórios (somente leitura) ---------------------------------------------

/** Dashboard: base mensal das versões ATIVAS. Filtros e totais são calculados na tela. */
function api_dashboard() {
  try {
    Api_exigirAutorizado();
    var base = Rel_baseDashboard(Rel_lerTodos());
    return { ok: true, meses: base.meses, geradoEm: Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'dd/MM/yyyy HH:mm') };
  } catch (e) {
    return { ok: false, erro: e.message };
  }
}

/** Consulta: todos os lançamentos (ATIVO, SUBSTITUIDO, ESTORNADO), mais recentes primeiro. */
function api_consulta() {
  try {
    Api_exigirAutorizado();
    var l = Rel_listaConsulta(Rel_lerTodos());
    return { ok: true, linhas: l.linhas, total: l.total, cortado: l.cortado };
  } catch (e) {
    return { ok: false, erro: e.message };
  }
}

/** Detalhe de um lançamento: versões, soma por EOT e arquivos originais. */
function api_detalheLancamento(id) {
  try {
    Api_exigirAutorizado();
    var d = Rel_detalheLancamento(String(id));
    return { ok: true, lancamento: d.lancamento, bloco: d.bloco, historico: d.historico, eots: d.eots, originais: d.originais };
  } catch (e) {
    return { ok: false, erro: e.message };
  }
}
