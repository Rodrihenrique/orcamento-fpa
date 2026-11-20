// ==============================================================================
// CAMADA DE LEITURA — um parser por formato, todos devolvem o modelo padrão.
// Formato novo = parser novo + uma linha em PARSERS. Nada mais muda.
//
// Contrato do parser:
//   { id, nome,
//     detectar(arquivo) -> 0..1 (confiança),
//     parsear(arquivo)  -> { registros, rejeitadas, totalDeclaradoCentavos } }
// arquivo = { nome, texto?, planilha?, hash, totalDeclaradoCentavos? }
//   texto    : conteúdo CSV (CSV direto, ou CSV extraído de ZIP no servidor)
//   planilha : { abas: { <nome>: [[células]] } } (XLS/XLSX lidos no navegador)
//   totalDeclaradoCentavos : total vindo de fora (carta CT em RTF/PDF), usado se o
//                            próprio arquivo não traz total.
//
// Formatos cobertos (layouts vistos em arquivos reais de set–out/2026):
//   CSV bilhetagem  : TIM, SURF, OI (sem cabeçalho, 17 col.), Vivo (21 col., linha tipo 01 = total)
//   ZIP             : CSV + CT (pdf/rtf) + resumo → aberto em Entrada.gs, cai no parser CSV
//   XLS/XLSX Claro  : aba DETRAF (15 col.) + aba RESUMO (linha "Total Geral")
// Ainda sem parser: PDF de detalhamento. PDF só é confiável se tiver texto (não escaneado);
// PDF escaneado exigiria OCR. Os PDFs vistos até agora são só cartas CT e logs.
// ==============================================================================

// Posição das colunas padrão (modelo de 16 colunas)
var COL = { EOT_B: 0, EOT_R: 1, MES_REF: 2, MES_TRAF: 3, POI: 4, TIPO_REL: 5, DESC: 6, GH: 7,
            QTDE: 8, MIN: 9, TARIFA: 10, LIQ: 11, PIS: 12, ICMS: 13, BRUTO: 14, CN: 15 };

/** Monta o Registro padrão a partir das 16 colunas já padronizadas. null + motivo se valor inválido. */
function Parsers_registroDeColunas(c, arquivo, linhaOrigem) {
  var cent = Modelo_moedaParaCentavos(c[COL.BRUTO]);
  if (isNaN(cent)) return { erro: 'Valor não numérico: "' + c[COL.BRUTO] + '"' };
  return { registro: {
    eotBilhetagem: c[COL.EOT_B],
    eotRelacionada: c[COL.EOT_R],
    periodo: (c[COL.MES_REF] || '').trim(),
    grupoHorario: c[COL.GH],
    chamadas: parseInt(c[COL.QTDE], 10) || 0,
    minutos: parseFloat(String(c[COL.MIN] || '0').replace(',', '.')) || 0,
    valorCentavos: cent,
    colunas: c,
    detalhe: {
      periodoTrafego: (c[COL.MES_TRAF] || '').trim(), poi: c[COL.POI], descritor: (c[COL.DESC] || '').trim(),
      tarifa: Modelo_numeroBR(c[COL.TARIFA]) || 0, liquido: Modelo_numeroBR(c[COL.LIQ]) || 0,
      piscofins: Modelo_numeroBR(c[COL.PIS]) || 0, icms: Modelo_numeroBR(c[COL.ICMS]) || 0, cn: c[COL.CN]
    },
    tipoServico: 'FIXA',
    arquivo: arquivo, linhaOrigem: linhaOrigem
  } };
}

/** Regra do Auditor: SME pelo nome do arquivo; minutos todos zerados = SMS. */
function Parsers_tipoServico(nomeArquivo, registros) {
  if (String(nomeArquivo || '').toUpperCase().indexOf('SME') !== -1) return 'SME';
  if (registros.length && registros.every(function (x) { return x.minutos === 0; })) return 'SMS';
  return 'FIXA';
}

// ---- Parser: DETRAF CSV (bilhetagem, separador ';') -------------------------
// Regras portadas de auditor-web-app/Codigo.gs → padronizarLinhaDetraf.
// Cabeçalho, quando existe, cai fora sozinho (tipo_relatorio não é 0/00) e aparece
// nas linhas descartadas. A OI não tem cabeçalho.

var ParserDetrafCsv = {
  id: 'detraf-csv',
  nome: 'DETRAF CSV (bilhetagem)',

  detectar: function (arquivo) {
    if (arquivo.planilha || arquivo.texto === undefined) return 0;
    var ehCsv = /\.csv$/i.test(arquivo.nome || '');
    var linhas = String(arquivo.texto || '').split(/\r?\n/).slice(0, 20);
    var comPontoEVirgula = linhas.filter(function (l) { return l.split(';').length >= 6; }).length;
    if (!ehCsv && comPontoEVirgula === 0) return 0;
    return comPontoEVirgula > 0 ? (ehCsv ? 0.95 : 0.6) : 0.2;
  },

  parsear: function (arquivo) {
    var isSme = String(arquivo.nome || '').toUpperCase().indexOf('SME') !== -1;
    var linhas = String(arquivo.texto || '').split(/\r?\n/);
    var registros = [], rejeitadas = [], linhasTotal = [];

    for (var i = 0; i < linhas.length; i++) {
      var bruta = linhas[i].trim();
      if (bruta === '') continue;
      var r = ParserDetrafCsv._linha(bruta, isSme);
      if (r.rejeicao) {
        rejeitadas.push({ linha: i + 1, motivo: r.rejeicao, texto: bruta.substring(0, 200) });
        if (r.tipo === '01') linhasTotal.push(r.cols);
        continue;
      }
      var m = Parsers_registroDeColunas(r.colunas, arquivo.nome, i + 1);
      if (m.erro) { rejeitadas.push({ linha: i + 1, motivo: m.erro, texto: bruta.substring(0, 200) }); continue; }
      registros.push(m.registro);
    }
    var tipo = Parsers_tipoServico(arquivo.nome, registros);
    registros.forEach(function (x) { x.tipoServico = tipo; });

    return { registros: registros, rejeitadas: rejeitadas,
             totalDeclaradoCentavos: ParserDetrafCsv._totalDeclarado(linhasTotal) };
  },

  /**
   * Linhas tipo_relatorio 01 são totais. Vivo traz uma só (total geral). SURF traz
   * subtotais por EOT + uma linha final com EOTs vazias. Sem 01: null.
   */
  _totalDeclarado: function (linhasTotal) {
    if (!linhasTotal.length) return null;
    var alvo = null;
    if (linhasTotal.length === 1) alvo = linhasTotal[0];
    else {
      linhasTotal.forEach(function (c) {
        if (!String(c[0] || '').trim() && !String(c[1] || '').trim()) alvo = c;
      });
    }
    if (!alvo) return null;
    var cent = Modelo_moedaParaCentavos(alvo[COL.BRUTO]);
    return isNaN(cent) ? null : cent;
  },

  /** Devolve { colunas:[16 strings] } ou { rejeicao, tipo, cols } */
  _linha: function (linhaBruta, isSme) {
    var col = linhaBruta.split(';');
    if (col.length < 6) return { rejeicao: 'Menos de 6 colunas' };
    var tipoRel = col[5] ? String(col[5]).trim() : '';
    if (tipoRel !== '0' && tipoRel !== '00') {
      return { rejeicao: 'Cabeçalho/subtotal (tipo_relatorio = "' + tipoRel + '")', tipo: tipoRel, cols: col };
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

// ---- Parser: planilha DETRAF (XLS/XLSX, ex.: Claro) --------------------------
// Aba de dados com 15 colunas (EOT Credora … Valor Bruto) e aba RESUMO com a linha
// "Total Geral". Chega pronta do navegador em arquivo.planilha.abas.

var ParserPlanilhaDetraf = {
  id: 'detraf-planilha',
  nome: 'DETRAF planilha (XLS/XLSX)',

  _abaDados: function (planilha) {
    var abas = (planilha && planilha.abas) || {};
    var achada = null;
    Object.keys(abas).forEach(function (nome) {
      var h = (abas[nome][0] || [])[0];
      if (!achada && /^(EOT\s*Credora|CREDORA)$/i.test(String(h || '').trim())) achada = nome;
    });
    return achada;
  },

  detectar: function (arquivo) {
    if (!arquivo.planilha) return 0;
    return ParserPlanilhaDetraf._abaDados(arquivo.planilha) ? 0.95 : 0;
  },

  parsear: function (arquivo) {
    var abas = arquivo.planilha.abas;
    var nomeAba = ParserPlanilhaDetraf._abaDados(arquivo.planilha);
    var linhas = abas[nomeAba];
    var registros = [], rejeitadas = [];

    for (var i = 1; i < linhas.length; i++) {
      var l = linhas[i];
      if (!l || l.every(function (x) { return x === '' || x === null || x === undefined; })) continue;
      var tipoRel = String(l[5] === undefined ? '' : l[5]).trim();
      if (tipoRel !== '0' && tipoRel !== '00') {
        rejeitadas.push({ linha: i + 1, motivo: 'Subtotal (tipo_relatorio = "' + tipoRel + '")', texto: l.join(';').substring(0, 200) });
        continue;
      }
      var n = function (k) { return Modelo_numeroBR(l[k]); };
      var c = [Modelo_normalizarEot(l[0]), Modelo_normalizarEot(l[1]), String(l[2]).trim(), String(l[3]).trim(), String(l[4]).trim(),
        tipoRel, String(l[6]).trim(), String(l[7]).trim().toUpperCase().indexOf('SR') !== -1 ? 'S' : String(l[7]).trim(),
        String(Math.round(n(8)) || 0), Modelo_numeroParaBR(Math.round((n(9) + Number.EPSILON) * 10) / 10, 1),
        Modelo_numeroParaBR(n(10), 5), Modelo_numeroParaBR(n(11), 2), Modelo_numeroParaBR(n(12), 2),
        Modelo_numeroParaBR(n(13), 2), Modelo_numeroParaBR(n(14), 2), String(l[15] === undefined ? '' : l[15]).trim()];
      var m = Parsers_registroDeColunas(c, arquivo.nome, i + 1);
      if (m.erro) { rejeitadas.push({ linha: i + 1, motivo: m.erro, texto: l.join(';').substring(0, 200) }); continue; }
      registros.push(m.registro);
    }
    var tipo = Parsers_tipoServico(arquivo.nome, registros);
    registros.forEach(function (x) { x.tipoServico = tipo; });
    return { registros: registros, rejeitadas: rejeitadas, totalDeclaradoCentavos: ParserPlanilhaDetraf._totalResumo(abas) };
  },

  /** Aba RESUMO: linha cujo primeiro texto é "Total Geral"; o valor bruto é a última célula numérica. */
  _totalResumo: function (abas) {
    var achou = null;
    Object.keys(abas).forEach(function (nome) {
      if (!/^RESUMO/i.test(nome)) return;
      abas[nome].forEach(function (l) {
        if (l.some(function (x) { return /^Total Geral$/i.test(String(x).trim()); })) achou = l;
      });
    });
    if (!achou) return null;
    var nums = achou.filter(function (x) { return typeof x === 'number'; });
    return nums.length ? Math.round(nums[nums.length - 1] * 100) : null;
  }
};

// ---- Registro de parsers ------------------------------------------------------
var PARSERS = [ParserDetrafCsv, ParserPlanilhaDetraf];

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
    if (arquivo.erroEntrada) return { ok: false, arquivo: arquivo.nome, erro: arquivo.erroEntrada };
    var det = Parsers_detectar(arquivo);
    if (!det) {
      return { ok: false, arquivo: arquivo.nome, erro: 'Formato não reconhecido. Formatos suportados: ' +
        PARSERS.map(function (p) { return p.nome; }).join(', ') };
    }
    var res = det.parser.parsear(arquivo);
    res.ok = true; res.arquivo = arquivo.nome; res.hash = arquivo.hash;
    res.parserId = det.parser.id; res.confianca = det.confianca;
    res.origem = arquivo.origem || arquivo.nome;
    // O total do próprio arquivo vale mais; a carta CT só entra como fallback.
    res.fonteTotal = res.totalDeclaradoCentavos !== null && res.totalDeclaradoCentavos !== undefined ? 'arquivo' : null;
    if (res.fonteTotal === null && arquivo.totalDeclaradoCentavos !== undefined && arquivo.totalDeclaradoCentavos !== null) {
      res.totalDeclaradoCentavos = arquivo.totalDeclaradoCentavos;
      res.fonteTotal = arquivo.fonteTotal || 'carta CT';
    }
    return res;
  } catch (e) {
    return { ok: false, arquivo: arquivo.nome, erro: 'Falha ao ler: ' + e.message };
  }
}
