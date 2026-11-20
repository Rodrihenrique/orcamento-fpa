// ==============================================================================
// TOTAL DECLARADO NA CARTA (CT) DA OPERADORA — função pura.
// Formatos vistos nos arquivos reais (out/2026):
//   TIM e SURF : _CT.pdf  → "... no valor de R$ 2.238,30 (dois mil ...)"
//   OI         : CT_ENVIO_*.rtf → mesmo texto, dentro de RTF
// PDF: o texto é extraído no navegador (pdf.js) e chega aqui só como string.
// ==============================================================================

/** Texto da CT → centavos, ou null. Prefere "valor de R$ X"; senão o primeiro "R$ X". */
function CtTotal_extrairDeTexto(texto) {
  var t = String(texto || '').replace(/\s+/g, ' ');
  var m = /valor\s+de\s+R\$\s*([\d.]+,\d{2})/i.exec(t) || /R\$\s*([\d.]+,\d{2})/i.exec(t);
  if (!m) return null;
  var c = Modelo_moedaParaCentavos(m[1]);
  return isNaN(c) ? null : c;
}

/** RTF → texto simples (decodifica \'e7 e remove comandos) → total. */
function CtTotal_extrairDeRtf(rtf) {
  var t = String(rtf || '')
    .replace(/\\'([0-9a-fA-F]{2})/g, function (_, h) { return String.fromCharCode(parseInt(h, 16)); })
    .replace(/\\par[d]?\b/g, ' ')
    .replace(/\\[a-zA-Z]+-?\d* ?/g, '')
    .replace(/[{}]/g, '');
  return CtTotal_extrairDeTexto(t);
}
