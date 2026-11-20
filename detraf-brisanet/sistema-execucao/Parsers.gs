// ==============================================================================
// CAMADA DE LEITURA — um parser por formato, todos devolvem o modelo padrão.
// Formato novo = parser novo + uma linha em PARSERS. Nada mais muda.
//
// Contrato do parser:
//   { id, nome,
//     detectar(arquivo) -> 0..1 (confiança),
//     parsear(arquivo)  -> { registros, rejeitadas, totalDeclaradoCentavos } }
// arquivo = { nome, texto, hash }
//
// Formatos previstos (ainda não implementados): XLS/XLSX, ZIP, PDF.
//  - XLS/XLSX/ZIP: hoje o Auditor converte no navegador (SheetJS/JSZip). Falta
//    definir o layout real das planilhas para escrever o parser.
//  - PDF: parser por texto só é confiável se o PDF for gerado (não escaneado).
//    Se for imagem, precisa de OCR. Não prometer antes de testar arquivo real.
// ==============================================================================

// ---- Parser: DETRAF CSV (bilhetagem, separador ';') -------------------------
// Regras portadas de auditor-web-app/Codigo.gs → padronizarLinhaDetraf
// (mesma lógica de colunas 0,1,5,7,8,9,14), agora devolvendo o modelo padrão.

var ParserDetrafCsv = {
  id: 'detraf-csv',
  nome: 'DETRAF CSV (bilhetagem)',

  detectar: function (arquivo) {
    var ehCsv = /\.csv$/i.test(arquivo.nome || '');
    var linhas = String(arquivo.texto || '').split(/\r?\n/).slice(0, 20);
    var comPontoEVirgula = linhas.filter(function (l) { return l.split(';').length >= 6; }).length;
    if (!ehCsv && comPontoEVirgula === 0) return 0;
    return comPontoEVirgula > 0 ? (ehCsv ? 0.95 : 0.6) : 0.2;
  },

  parsear: function (arquivo) {
    var nomeUp = String(arquivo.nome || '').toUpperCase();
    var isSme = nomeUp.indexOf('SME') !== -1;
    var linhas = String(arquivo.texto || '').split(/\r?\n/);
    var registros = [], rejeitadas = [];

    for (var i = 0; i < linhas.length; i++) {
      var bruta = linhas[i].trim();
      if (bruta === '') continue;
      var r = ParserDetrafCsv._linha(bruta, isSme);
      if (r.rejeicao) {
        rejeitadas.push({ linha: i + 1, motivo: r.rejeicao, texto: bruta.substring(0, 200) });
        continue;
      }
      var c = r.colunas;
      var cent = Modelo_moedaParaCentavos(c[14]);
      if (isNaN(cent)) {
        rejeitadas.push({ linha: i + 1, motivo: 'Valor não numérico: "' + c[14] + '"', texto: bruta.substring(0, 200) });
        continue;
      }
      registros.push({
        eotBilhetagem: c[0],
        eotRelacionada: c[1],
        periodo: (c[2] || '').trim(),
        grupoHorario: c[7],
        chamadas: parseInt(c[8], 10) || 0,
        minutos: parseFloat(String(c[9] || '0').replace(',', '.')) || 0,
        valorCentavos: cent,
        colunas: c,
        tipoServico: 'FIXA',
        arquivo: arquivo.nome,
        linhaOrigem: i + 1
      });
    }

    // Mesma regra do Auditor: tudo com minutos zerados é SMS; nome com SME é SME.
    var tipo = 'FIXA';
    if (isSme) tipo = 'SME';
    else if (registros.length && registros.every(function (x) { return x.minutos === 0; })) tipo = 'SMS';
    registros.forEach(function (x) { x.tipoServico = tipo; });

    // Total declarado: ainda não sabemos onde o arquivo traz o total (ver README, pergunta 2).
    return { registros: registros, rejeitadas: rejeitadas, totalDeclaradoCentavos: null };
  },

  /** Devolve { colunas:[16 strings] } ou { rejeicao:'motivo' } */
  _linha: function (linhaBruta, isSme) {
    var col = linhaBruta.split(';');
    if (col.length < 6) return { rejeicao: 'Menos de 6 colunas' };
    var tipoRel = col[5] ? String(col[5]).trim() : '';
    if (tipoRel !== '0' && tipoRel !== '00') {
      return { rejeicao: 'Linha de cabeçalho/subtotal (tipo_relatorio = "' + tipoRel + '")' };
    }
    col[0] = Modelo_normalizarEot(col[0]);
    col[1] = Modelo_normalizarEot(col[1]);
    if (col[7] && String(col[7]).toUpperCase().indexOf('SR') !== -1) col[7] = 'S';

    for (var c = 9; c <= 14; c++) {
      if (c === 9) {
        var f = parseFloat((col[c] ? String(col[c]).trim() : '0').replace(',', '.'));
        if (isNaN(f)) f = 0;
        col[c] = (Math.round((f + Number.EPSILON) * 10) / 10).toFixed(1).replace('.', ',');
      } else if (col[c]) {
        var v = String(col[c]).trim();
        var temPonto = v.indexOf('.') !== -1, temVirg = v.indexOf(',') !== -1;
        if (c === 14 && temPonto && temVirg) col[c] = v.replace(/\./g, '');
        else if (temPonto && !temVirg) col[c] = v.replace('.', ',');
      }
    }
    if (isSme && col.length > 16 && String(col[8]).trim() === '') col.splice(8, 1);

    var padrao = [];
    for (var i = 0; i < 16; i++) padrao.push(i < col.length ? String(col[i]).trim() : '');
    return { colunas: padrao };
  }
};

// ---- Registro de parsers ------------------------------------------------------
var PARSERS = [ParserDetrafCsv];

/** Escolhe o parser de maior confiança. Sem parser com confiança >= 0.5, devolve null. */
function Parsers_detectar(arquivo) {
  var melhor = null, melhorScore = 0;
  PARSERS.forEach(function (p) {
    var s = p.detectar(arquivo);
    if (s > melhorScore) { melhor = p; melhorScore = s; }
  });
  return melhorScore >= 0.5 ? { parser: melhor, confianca: melhorScore } : null;
}

/** Lê um arquivo isolando erro: falha em um não derruba os outros. */
function Parsers_ler(arquivo) {
  try {
    var det = Parsers_detectar(arquivo);
    if (!det) {
      return { ok: false, arquivo: arquivo.nome, erro: 'Formato não reconhecido. Formatos suportados: ' +
        PARSERS.map(function (p) { return p.nome; }).join(', ') };
    }
    var res = det.parser.parsear(arquivo);
    res.ok = true; res.arquivo = arquivo.nome; res.hash = arquivo.hash;
    res.parserId = det.parser.id; res.confianca = det.confianca;
    return res;
  } catch (e) {
    return { ok: false, arquivo: arquivo.nome, erro: 'Falha ao ler: ' + e.message };
  }
}
