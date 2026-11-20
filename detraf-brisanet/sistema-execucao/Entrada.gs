// ==============================================================================
// ENTRADA — transforma cada upload (bytes originais) em "arquivos lógicos" que os
// parsers entendem. Só lê; não grava nada.
//
//   .csv           → 1 arquivo lógico (texto)
//   .zip           → abre no servidor (Utilities.unzip): usa o CSV; total da carta CT
//                    em RTF é lido aqui; total da CT em PDF vem do navegador (extras.totalCT)
//   .xls / .xlsx   → o navegador converte (SheetJS) e manda extras.planilha
//
// upload = { nome, base64, extras?: { planilha?, totalCT?, fonteTotal? } }
// ==============================================================================

function Entrada_hash(bytes) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, bytes)
    .map(function (b) { return ('0' + (b & 0xFF).toString(16)).slice(-2); }).join('');
}

function Entrada_texto(blob) {
  var t = blob.getDataAsString('UTF-8');
  if (!t || t.indexOf(';') === -1 || t.indexOf('�') !== -1) t = blob.getDataAsString('ISO-8859-1');
  return t;
}

/** Devolve { upload: {nome, base64, hash}, logicos: [arquivo] }. Nunca lança: erro vira arquivo lógico com .erroEntrada. */
function Entrada_expandir(up) {
  var bytes = Utilities.base64Decode(up.base64);
  var hash = Entrada_hash(bytes);
  var extras = up.extras || {};
  var resultado = { upload: { nome: up.nome, base64: up.base64, hash: hash }, logicos: [] };
  try {
    if (/\.zip$/i.test(up.nome)) {
      var partes = Utilities.unzip(Utilities.newBlob(bytes, 'application/zip', up.nome));
      var csvs = partes.filter(function (b) { return /\.csv$/i.test(b.getName()); });
      if (!csvs.length) { resultado.logicos.push({ nome: up.nome, hash: hash, erroEntrada: 'ZIP sem CSV de bilhetagem.' }); return resultado; }
      var totalCt = null, fonte = null;
      partes.forEach(function (b) {
        if (totalCt === null && /\.rtf$/i.test(b.getName())) {
          totalCt = CtTotal_extrairDeRtf(b.getDataAsString('ISO-8859-1')); fonte = 'carta CT (rtf)';
        }
      });
      if (totalCt === null && extras.totalCT !== undefined && extras.totalCT !== null) { totalCt = extras.totalCT; fonte = extras.fonteTotal || 'carta CT (pdf)'; }
      csvs.forEach(function (b) {
        resultado.logicos.push({ nome: b.getName(), texto: Entrada_texto(b), hash: hash, origem: up.nome,
          totalDeclaradoCentavos: csvs.length === 1 ? totalCt : null, fonteTotal: fonte });
      });
    } else if (/\.(xls|xlsx)$/i.test(up.nome)) {
      if (!extras.planilha) resultado.logicos.push({ nome: up.nome, hash: hash, erroEntrada: 'Planilha não foi lida no navegador. Recarregue a página e envie de novo.' });
      else resultado.logicos.push({ nome: up.nome, planilha: extras.planilha, hash: hash, origem: up.nome });
    } else if (/\.csv$/i.test(up.nome)) {
      resultado.logicos.push({ nome: up.nome, texto: Entrada_texto(Utilities.newBlob(bytes, 'text/csv', up.nome)), hash: hash, origem: up.nome });
    } else {
      resultado.logicos.push({ nome: up.nome, hash: hash, erroEntrada: 'Extensão não suportada. Use .csv, .zip, .xls ou .xlsx.' });
    }
  } catch (e) {
    resultado.logicos.push({ nome: up.nome, hash: hash, erroEntrada: 'Falha ao abrir o arquivo: ' + e.message });
  }
  return resultado;
}
