// ==============================================================================
// MODELO PADRÃO DE DADOS — todo parser devolve exatamente isto.
//
// Registro:
//   eotBilhetagem, eotRelacionada : string normalizada (3+ dígitos)
//   periodo       : 'AAAAMM'
//   grupoHorario  : string
//   chamadas      : inteiro
//   minutos       : número (1 casa)
//   valorCentavos : inteiro (dinheiro nunca em float)
//   colunas       : 16 strings já padronizadas (para regerar o CSV padronizado)
//   tipoServico   : 'FIXA' | 'SME' | 'SMS' (definido pelo parser, por arquivo)
//   arquivo, linhaOrigem : rastreio
//
// Resultado de parser:
//   { registros: [Registro], rejeitadas: [{linha, motivo, texto}], totalDeclaradoCentavos: inteiro|null }
// ==============================================================================

function Modelo_moedaParaCentavos(valor) {
  if (valor === null || valor === undefined) return 0;
  var s = String(valor).replace(/['"\s]/g, '');
  if (s === '') return 0;
  if (s.indexOf('.') !== -1 && s.indexOf(',') !== -1) s = s.replace(/\./g, '');
  s = s.replace(',', '.');
  var n = parseFloat(s);
  if (isNaN(n)) return NaN;
  return Math.round(n * 100);
}

function Modelo_centavosParaReais(c) {
  return Math.round(c) / 100;
}

function Modelo_normalizarEot(eot) {
  var s = String(eot === null || eot === undefined ? '' : eot).trim().toUpperCase();
  if (/^\d+$/.test(s)) while (s.length < 3) s = '0' + s;
  return s;
}

function Modelo_removerAcentos(str) {
  if (!str) return '';
  return str.replace(/[ÁÀÂÃÄ]/g, 'A').replace(/[ÉÈÊË]/g, 'E').replace(/[ÍÌÎÏ]/g, 'I')
            .replace(/[ÓÒÔÕÖ]/g, 'O').replace(/[ÚÙÛÜ]/g, 'U').replace(/Ç/g, 'C');
}
