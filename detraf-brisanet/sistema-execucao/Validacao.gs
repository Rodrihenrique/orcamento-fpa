// ==============================================================================
// VALIDAÇÃO — alimenta a tela de conferência. Função pura.
//   erro  : bloqueia a aprovação
//   aviso : exige "li e aceito" (aceite por id)
//
// contexto = {
//   periodoEsperado : 'AAAAMM' | '',
//   hashesAprovados : { hash: {lote, data} },
//   ativosPorChave  : { chave: {valorCentavos, hash, lote} },   // lançamentos ATIVOS
//   anteriorPorSerie: { serieSemPeriodo: valorCentavos },       // mês anterior
//   limiteVariacaoPct, toleranciaTotalCentavos
// }
// ==============================================================================

function Validacao_executar(leituras, agrupado, contexto) {
  var erros = [], avisos = [];
  var E = function (codigo, mensagem, detalhe) { erros.push({ codigo: codigo, mensagem: mensagem, detalhe: detalhe || null }); };
  var A = function (id, mensagem, detalhe) { avisos.push({ id: id, mensagem: mensagem, detalhe: detalhe || null }); };

  // 1) arquivos que falharam / duplicados por hash
  leituras.forEach(function (l) {
    if (!l.ok) { E('ARQUIVO_ILEGIVEL', l.arquivo + ': ' + l.erro); return; }
    var j = contexto.hashesAprovados[l.hash];
    if (j) E('ARQUIVO_JA_APROVADO', l.arquivo + ' já foi aprovado em ' + j.data + ' (lote ' + j.lote + '). Estorne o lote antes de reprocessar.');
    if (!l.registros.length) E('SEM_LINHAS_VALIDAS', l.arquivo + ': nenhuma linha de bilhetagem válida.');
  });

  // 2) período
  var periodos = {};
  leituras.forEach(function (l) { (l.registros || []).forEach(function (r) { periodos[r.periodo] = (periodos[r.periodo] || 0) + 1; }); });
  var listaPeriodos = Object.keys(periodos);
  listaPeriodos.forEach(function (p) {
    if (!/^\d{4}(0[1-9]|1[0-2])$/.test(p)) E('PERIODO_INVALIDO', 'Período fora do padrão AAAAMM: "' + p + '" (' + periodos[p] + ' linhas).');
  });
  if (listaPeriodos.length > 1) E('MULTIPLOS_PERIODOS', 'O lote tem mais de um período: ' + listaPeriodos.join(', ') + '. Suba um período por vez.');
  if (listaPeriodos.length === 1 && contexto.periodoEsperado && listaPeriodos[0] !== contexto.periodoEsperado) {
    A('PERIODO_INESPERADO', 'Período do arquivo (' + listaPeriodos[0] + ') difere do esperado (' + contexto.periodoEsperado + ').');
  }

  // 3) total do arquivo × soma das linhas (só quando o parser sabe o total)
  var tol = Number(contexto.toleranciaTotalCentavos || 1);
  leituras.forEach(function (l) {
    if (!l.ok || l.totalDeclaradoCentavos === null || l.totalDeclaradoCentavos === undefined) return;
    var soma = l.registros.reduce(function (s, r) { return s + r.valorCentavos; }, 0);
    if (Math.abs(soma - l.totalDeclaradoCentavos) > tol) {
      E('TOTAL_DIVERGENTE', l.arquivo + ': soma das linhas ' + Modelo_centavosParaReais(soma).toFixed(2) +
        ' ≠ total do arquivo ' + Modelo_centavosParaReais(l.totalDeclaradoCentavos).toFixed(2));
    }
  });
  var semTotal = leituras.filter(function (l) { return l.ok && (l.totalDeclaradoCentavos === null || l.totalDeclaradoCentavos === undefined); });
  if (semTotal.length) A('SEM_TOTAL_DECLARADO', 'Não foi possível conferir o total contra o arquivo: ' +
    semTotal.map(function (l) { return l.arquivo; }).join(', ') + ' (o arquivo não traz total e a carta CT não foi lida).');

  // 4) linhas rejeitadas — nunca somem em silêncio
  var rej = 0; leituras.forEach(function (l) { rej += (l.rejeitadas || []).length; });
  var rejValor = [];
  leituras.forEach(function (l) { (l.rejeitadas || []).forEach(function (x) { if (/Valor não numérico/.test(x.motivo)) rejValor.push(x); }); });
  if (rejValor.length) E('VALOR_NAO_NUMERICO', rejValor.length + ' linha(s) com valor não numérico.', rejValor.slice(0, 20));
  if (rej - rejValor.length > 0) A('LINHAS_REJEITADAS', (rej - rejValor.length) + ' linha(s) descartadas (cabeçalho/subtotal). Veja a lista.');

  // 5) campos vazios
  var vazios = 0;
  leituras.forEach(function (l) { (l.registros || []).forEach(function (r) {
    if (!r.eotBilhetagem || !r.eotRelacionada || !r.periodo) vazios++;
  }); });
  if (vazios) A('CAMPOS_VAZIOS', vazios + ' linha(s) com EOT ou período vazio.');

  // 6) duplicidade de linhas idênticas dentro do lote
  var vistos = {}, dup = 0;
  leituras.forEach(function (l) { (l.registros || []).forEach(function (r) {
    var k = r.colunas.join(';');
    if (vistos[k]) dup++; else vistos[k] = true;
  }); });
  if (dup) A('LINHAS_DUPLICADAS', dup + ' linha(s) idêntica(s) repetida(s) no lote. Pode ser legítimo; confira.');

  // 7) EOT sem mapeamento
  if (agrupado.eotsNaoMapeadas.length) A('EOT_NAO_MAPEADA', agrupado.eotsNaoMapeadas.length + ' EOT sem cadastro no Anexo 5.', agrupado.eotsNaoMapeadas);

  // 8) por grupo: já existe valor ativo? variação contra mês anterior?
  var limite = Number(contexto.limiteVariacaoPct || 30);
  agrupado.grupos.forEach(function (g) {
    var ativo = contexto.ativosPorChave[g.chave];
    if (ativo && ativo.valorCentavos !== g.totalCentavos) {
      A('SUBSTITUI_VALIDADO:' + g.chave, 'Já existe valor validado para ' + g.chave + ' (' +
        Modelo_centavosParaReais(ativo.valorCentavos).toFixed(2) + '). Aprovar cria nova versão e mantém a anterior no histórico.');
    }
    var serie = [g.tipoBrisa, g.tipoParceiro, g.holding, g.direcao].join('|');
    var ant = contexto.anteriorPorSerie[serie];
    if (ant && ant !== 0) {
      var pct = (g.totalCentavos - ant) / Math.abs(ant) * 100;
      if (Math.abs(pct) > limite) A('VARIACAO:' + g.chave, 'Variação de ' + pct.toFixed(1) + '% contra o mês anterior em ' + g.chave + '.');
    }
  });

  return { erros: erros, avisos: avisos, podeAprovar: erros.length === 0 };
}
