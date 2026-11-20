// ==============================================================================
// CAMADA DE REGRA DE NEGÓCIO — classifica linhas e agrupa em projeções.
// Função pura: recebe registros + mapa EOT, não toca em planilha nem Drive.
// Lógica portada de auditor-web-app/Codigo.gs → auditarLote / obterDadosEot.
//
// Diferença proposital: a direção (EMISSAO/RECEBIMENTO) é decidida POR GRUPO
// e vai junto na chave única; o Auditor atual usa uma direção só para o lote.
// ==============================================================================

function Calculo_operadoraDoMapa(txt) {
  var s = Modelo_removerAcentos(String(txt || '').toUpperCase());
  if (s.indexOf('CLARO') !== -1) return 'CLARO';
  if (s.indexOf('VIVO') !== -1 || s.indexOf('TELEFONICA') !== -1) return 'VIVO';
  if (s.indexOf('TIM') !== -1) return 'TIM';
  if (s.indexOf('BRISANET') !== -1) return 'BRISANET';
  if (s.indexOf('OI') !== -1) return 'OI';
  if (s.indexOf('ALGAR') !== -1) return 'ALGAR';
  return String(txt || '').toUpperCase();
}

/** Dados de uma EOT: do mapa, ou fallback quando não mapeada. */
function Calculo_dadosEot(eot, mapa, operadoraBase, tipoServico) {
  var m = mapa[Modelo_normalizarEot(eot)];
  if (m) return m;
  var op = operadoraBase || 'DESCONHECIDA';
  var tipo = 'SMP';
  if (tipoServico === 'FIXA' || op.indexOf('FIXA') !== -1 || op.indexOf('STFC') !== -1) tipo = 'STFC';
  else if (tipoServico === 'SMS') tipo = 'SMS';
  return { operadora: op, uf: 'Auto', tipo: tipo, mapeada: false };
}

/** Operadora parceira "base" do lote (a que não é brisanet), como no Auditor. */
function Calculo_operadoraBase(registros, mapa) {
  var achadas = {};
  registros.forEach(function (r) {
    [r.eotBilhetagem, r.eotRelacionada].forEach(function (e) {
      if (mapa[e]) achadas[mapa[e].operadora] = true;
    });
  });
  var lista = Object.keys(achadas).filter(function (o) { return o !== 'BRISANET'; });
  return lista.length ? lista[0].replace(' FIXA', '') : '';
}

function Calculo_holding(operadora, tipoParceiro) {
  var op = String(operadora || '').toUpperCase().replace(' FIXA', '').replace(' MOVEL', '').trim();
  var limpa = Modelo_removerAcentos(op);
  if (limpa.indexOf('CLARO') !== -1) return tipoParceiro === 'STFC' ? 'CLARO_FIXA' : 'CLARO';
  if (limpa.indexOf('VIVO') !== -1 || limpa.indexOf('TELEFONICA') !== -1) return tipoParceiro === 'STFC' ? 'TELEFONICA_FIXA' : 'TELEFONICA_MOVEL';
  if (limpa.indexOf('TIM') !== -1) return 'TIM_SA';
  if (limpa.indexOf('SURF') !== -1) return 'SURF_TELECOM';
  if (limpa.indexOf('OI') !== -1) return 'OI_SA';
  return op;
}

/**
 * Agrupa registros em projeções. Cada grupo tem chave única:
 *   AAAAMM|tipoBrisa|tipoParceiro|holding|direcao
 * Devolve { grupos:[...], eotsNaoMapeadas:[...], totalCentavos }
 */
function Calculo_agrupar(registros, mapa) {
  var base = Calculo_operadoraBase(registros, mapa);
  var grupos = {}, naoMapeadas = {}, total = 0;

  registros.forEach(function (r) {
    total += r.valorCentavos;
    var iB = Calculo_dadosEot(r.eotBilhetagem, mapa, base, r.tipoServico);
    var iR = Calculo_dadosEot(r.eotRelacionada, mapa, base, r.tipoServico);
    if (!mapa[r.eotBilhetagem] && r.eotBilhetagem) naoMapeadas[r.eotBilhetagem] = true;
    if (!mapa[r.eotRelacionada] && r.eotRelacionada) naoMapeadas[r.eotRelacionada] = true;

    var bBrisa = iB.operadora === 'BRISANET', rBrisa = iR.operadora === 'BRISANET';

    var opParceira = base;
    if (bBrisa && !rBrisa && iR.operadora !== 'DESCONHECIDA') opParceira = iR.operadora;
    else if (!bBrisa && rBrisa && iB.operadora !== 'DESCONHECIDA') opParceira = iB.operadora;
    else if (!bBrisa && !rBrisa) {
      if (iB.operadora !== 'DESCONHECIDA' && iB.operadora !== 'BRISANET') opParceira = iB.operadora;
      else if (iR.operadora !== 'DESCONHECIDA' && iR.operadora !== 'BRISANET') opParceira = iR.operadora;
    }

    var tBrisa = 'SMP', tParceiro = 'SMP';
    if (r.tipoServico === 'SMS') { tBrisa = 'SMP'; tParceiro = 'SMS'; }
    else if (bBrisa) { tBrisa = iB.tipo || 'SMP'; tParceiro = iR.tipo || 'SMP'; }
    else if (rBrisa) { tBrisa = iR.tipo || 'SMP'; tParceiro = iB.tipo || 'SMP'; }
    else { tBrisa = tParceiro = (r.tipoServico === 'FIXA') ? 'STFC' : 'SMP'; }

    var holding = Calculo_holding(opParceira, tParceiro);
    var direcao = bBrisa ? 'EMISSAO' : 'RECEBIMENTO';
    var chave = [r.periodo, tBrisa, tParceiro, holding, direcao].join('|');

    var g = grupos[chave];
    if (!g) {
      g = grupos[chave] = {
        chave: chave, periodo: r.periodo, tipoBrisa: tBrisa, tipoParceiro: tParceiro,
        holding: holding, direcao: direcao,
        totalCentavos: 0, chamadas: 0, minutos: 0, linhas: 0, registros: []
      };
    }
    g.totalCentavos += r.valorCentavos;
    g.chamadas += r.chamadas;
    g.minutos += r.minutos;
    g.linhas += 1;
    g.registros.push(r);
  });

  return {
    grupos: Object.keys(grupos).map(function (k) { return grupos[k]; }),
    eotsNaoMapeadas: Object.keys(naoMapeadas),
    totalCentavos: total
  };
}
