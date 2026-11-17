function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
      .setTitle('Auditor Inteligente DETRAF GFX')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}


// ==============================================================================
// BANCO DE DADOS DINAMICO E CONTROLE
// ==============================================================================
var ID_PLANILHA_ANEXO5 = "10mnzz9mTOOWeGrxsIaVWR6qpwcdACiHFbiZoAE8L4js";
var MAPA_EOT_CACHE = null;


var ID_PLANILHA_CONTROLE = "1A6mvX9mvt4wuoJByg-5Uyuc6zssyoaEsrx0viVNnrFM";
var NOME_ABA_CONTROLE = "Controle - DETRAF E DEROAM";


var ID_PASTA_RAIZ_PROJETO = "1gOlfocjEuQzyY2ngxg_FLSrPdmP0PVPx";


function removerAcentos(str) {
    if (!str) return "";
    return str.replace(/[ÁÀÂÃÄ]/g, "A")
              .replace(/[ÉÈÊË]/g, "E")
              .replace(/[ÍÌÎÏ]/g, "I")
              .replace(/[ÓÒÔÕÖ]/g, "O")
              .replace(/[ÚÙÛÜ]/g, "U")
              .replace(/Ç/g, "C");
}


function carregarMapaEot() {
  if (MAPA_EOT_CACHE) return MAPA_EOT_CACHE;
  var mapa = {};
  try {
    var planilha = SpreadsheetApp.openById(ID_PLANILHA_ANEXO5);
    var aba = planilha.getSheets()[0];
    var dados = aba.getDataRange().getValues();
    for (var i = 1; i < dados.length; i++) {
      var eotBruto = String(dados[i][0]).trim();
      var operadoraBruta = String(dados[i][1]).trim().toUpperCase();
      var tipoBruto = String(dados[i][4]).trim().toUpperCase();
     
      var ufPlanilha = String(dados[i][12]).trim().toUpperCase();
      var areaPrestacao = String(dados[i][6]).trim().toUpperCase();
     
      var ufBruta = ufPlanilha;
      if (!ufBruta || ufBruta === "" || ufBruta === "-") {
          if (areaPrestacao.indexOf("NACIONAL") !== -1) {
              ufBruta = "NACIONAL/INTERNACIONAL";
          } else {
              ufBruta = areaPrestacao;
          }
      }
     
      if (eotBruto && eotBruto !== "") {
        var eot = normalizarEot(eotBruto);
        var operadora = operadoraBruta;
        var opLimpaAcentos = removerAcentos(operadoraBruta);
       
        if (opLimpaAcentos.indexOf("CLARO") !== -1) operadora = "CLARO";
        else if (opLimpaAcentos.indexOf("VIVO") !== -1 || opLimpaAcentos.indexOf("TELEFONICA") !== -1) operadora = "VIVO";
        else if (opLimpaAcentos.indexOf("TIM") !== -1) operadora = "TIM";
        else if (opLimpaAcentos.indexOf("BRISANET") !== -1) operadora = "BRISANET";
        else if (opLimpaAcentos.indexOf("OI") !== -1 || opLimpaAcentos.indexOf("OISA") !== -1) operadora = "OI";
        else if (opLimpaAcentos.indexOf("ALGAR") !== -1) operadora = "ALGAR";
       
        mapa[eot] = { operadora: operadora, uf: ufBruta, tipo: tipoBruto };
      }
    }
    MAPA_EOT_CACHE = mapa;
  } catch(e) {
    throw new Error("Erro ao acessar a planilha do Anexo 5. Verifique permissoes.");
  }
  return MAPA_EOT_CACHE;
}


// ==============================================================================
// NUCLEO DE PADRONIZACAO RIGIDA E AUTO-MAPEAMENTO
// ==============================================================================
function normalizarEot(eot) {
  var str = String(eot).trim().toUpperCase();
  if (/^\d+$/.test(str)) {
      while (str.length < 3) {
          str = "0" + str;
      }
  }
  return str;
}


function padronizarLinhaDetraf(linhaBruta, isSme) {
  var colunas = linhaBruta.split(';');
  if (colunas.length < 6) return null;
 
  var tipoRelatorio = colunas[5] ? String(colunas[5]).trim() : "";
  if (tipoRelatorio !== "0" && tipoRelatorio !== "00") return null;
 
  colunas[0] = normalizarEot(colunas[0]);
  colunas[1] = normalizarEot(colunas[1]);


  if (colunas[7]) {
      var grupoHorario = String(colunas[7]).toUpperCase();
      if (grupoHorario.indexOf("SR") !== -1) {
          colunas[7] = "S";
      }
  }


  // Bloco de limpeza: Trata Minutos e Valores Financeiros
  for (var c = 9; c <= 14; c++) {
      if (c === 9) {
          var valorMin = colunas[c] ? String(colunas[c]).trim().replace(',', '.') : "0";
          var minutosFloat = parseFloat(valorMin);
          if (isNaN(minutosFloat)) minutosFloat = 0;
         
          var minutosArredondados = Math.round((minutosFloat + Number.EPSILON) * 10) / 10;
          colunas[c] = minutosArredondados.toFixed(1).replace('.', ',');
      } else if (c === 14) {
          // AQUI É A MÁGICA DOS MILHARES!
          if (colunas[c]) {
              var valorDinheiro = String(colunas[c]).trim();
             
              // Se tiver os dois (Ponto de milhar + Vírgula do centavo), arranca o ponto!
              if (valorDinheiro.indexOf('.') !== -1 && valorDinheiro.indexOf(',') !== -1) {
                  colunas[c] = valorDinheiro.replace(/\./g, '');
              }
              // Se tiver SÓ ponto (Padrão americano), troca por vírgula.
              else if (valorDinheiro.indexOf('.') !== -1 && valorDinheiro.indexOf(',') === -1) {
                  colunas[c] = valorDinheiro.replace('.', ',');
              }
          }
      } else {
          if (colunas[c]) {
              var valorStr = String(colunas[c]).trim();
              if (valorStr.indexOf('.') !== -1 && valorStr.indexOf(',') === -1) {
                  colunas[c] = valorStr.replace('.', ',');
              }
          }
      }
  }
 
  if (isSme) {
      if (colunas.length > 16 && String(colunas[8]).trim() === "") {
          colunas.splice(8, 1);
      }
  }
 
  var colunasPadrao = [];
  for (var i = 0; i < 16; i++) {
      if (i < colunas.length) {
          colunasPadrao.push(String(colunas[i]).trim());
      } else {
          colunasPadrao.push("");
      }
  }
  return colunasPadrao.join(';');
}


function obterDadosEot(eotCode, fallbackOperadoraSugerida, tipoServicoFallback) {
  var mapaEotDinâmico = carregarMapaEot();
  var codeStr = normalizarEot(eotCode);
 
  if (mapaEotDinâmico[codeStr]) {
    return mapaEotDinâmico[codeStr];
  }
 
  var opFallback = fallbackOperadoraSugerida ? fallbackOperadoraSugerida : "DESCONHECIDA";
  var tipoFallback = "SMP";
 
  if (tipoServicoFallback === "FIXA" || opFallback.indexOf("FIXA") !== -1 || opFallback.indexOf("STFC") !== -1) {
      tipoFallback = "STFC";
  } else if (tipoServicoFallback === "SMS") {
      tipoFallback = "SMS";
  }
  return { operadora: opFallback, uf: "Auto", tipo: tipoFallback };
}


// ==============================================================================
// FASE 1: AUDITORIA E LEITURA (INTELIGÊNCIA AUTOMÁTICA)
// ==============================================================================
function auditarLote(arquivos) {
  try {
    var todasAsLinhasValidas = [];
    var linhasRemovidasSubtotais = 0;
    var linhasExpurgadasDetalhes = [];
   
    var credorasDetectadas = {};
    var devedorasDetectadas = {};
    var eotsNaoMapeadas = [];
   
    var contBrisaCredora = 0;
    var contBrisaDevedora = 0;
    var isSmeDetectadoGlobal = false;


    for (var f = 0; f < arquivos.length; f++) {
      var nomeArq = arquivos[f].nome.toUpperCase();
      var isSme = false;
      if (nomeArq.indexOf("SME") !== -1) {
          isSme = true;
          isSmeDetectadoGlobal = true;
      }


      var blobTemp = Utilities.newBlob(Utilities.base64Decode(arquivos[f].base64), 'text/csv');
      var conteudoTexto = blobTemp.getDataAsString("UTF-8");
      if (!conteudoTexto || conteudoTexto.indexOf(';') === -1) {
        conteudoTexto = blobTemp.getDataAsString("ISO-8859-1");
      }
     
      var linhas = conteudoTexto.split(/\r?\n/);
      var linhasValidasDesteArquivo = [];
      var arquivoTemMinutosZerados = true;
      var hasValidLinesInFile = false;


      for (var i = 0; i < linhas.length; i++) {
        var linhaBruta = linhas[i].trim();
        if (linhaBruta === "") continue;
       
        var linhaLimpa = padronizarLinhaDetraf(linhaBruta, isSme);
       
        if (linhaLimpa) {
            hasValidLinesInFile = true;
            linhasValidasDesteArquivo.push(linhaLimpa);
           
            var colunas = linhaLimpa.split(';');
            var eotB = colunas[0];
            var eotR = colunas[1];
           
            var strMinutos = colunas[9] ? String(colunas[9]).trim().replace(',', '.') : "0";
            if (strMinutos === "") strMinutos = "0";
            var minVal = parseFloat(strMinutos);
            if (isNaN(minVal)) minVal = 0;
           
            if (minVal !== 0) {
                arquivoTemMinutosZerados = false;
            }
           
            var mapaEotAtual = carregarMapaEot();
           
            if (eotB && !mapaEotAtual[eotB] && eotsNaoMapeadas.indexOf(eotB) === -1) eotsNaoMapeadas.push(eotB);
            if (eotR && !mapaEotAtual[eotR] && eotsNaoMapeadas.indexOf(eotR) === -1) eotsNaoMapeadas.push(eotR);


            if (eotB && mapaEotAtual[eotB]) {
                credorasDetectadas[mapaEotAtual[eotB].operadora] = true;
                if (mapaEotAtual[eotB].operadora === "BRISANET") contBrisaCredora++;
            }
            if (eotR && mapaEotAtual[eotR]) {
                devedorasDetectadas[mapaEotAtual[eotR].operadora] = true;
                if (mapaEotAtual[eotR].operadora === "BRISANET") contBrisaDevedora++;
            }
        } else {
            linhasRemovidasSubtotais++;
            if (linhasExpurgadasDetalhes.length < 100) {
                linhasExpurgadasDetalhes.push(linhaBruta);
            }
        }
      }
     
      var tipoServicoDoArquivo = "FIXA";
      if (isSme) {
          tipoServicoDoArquivo = "SME";
      } else if (hasValidLinesInFile && arquivoTemMinutosZerados) {
          tipoServicoDoArquivo = "SMS";
      }


      for (var k = 0; k < linhasValidasDesteArquivo.length; k++) {
          todasAsLinhasValidas.push({
              linhaLimpa: linhasValidasDesteArquivo[k],
              tipoServicoFile: tipoServicoDoArquivo
          });
      }
    }
   
    if (todasAsLinhasValidas.length === 0) {
      return { sucesso: false, bloqueado: true, motivo: "Nenhuma linha de bilhetagem pura (tipo_relatorio = 0) foi encontrada." };
    }


    var direcaoFaturamentoSugerida = (contBrisaCredora > contBrisaDevedora) ? "EMISSAO" : "RECEBIMENTO";


    var arrCredoras = Object.keys(credorasDetectadas);
    var arrDevedoras = Object.keys(devedorasDetectadas);
   
    var strCredora = arrCredoras.length > 0 ? arrCredoras.join(" / ") : "Não identificada";
    var strDevedora = arrDevedoras.length > 0 ? arrDevedoras.join(" / ") : "Não identificada";
    var relacionamentoDetectado = "Credora: " + strCredora + " -> Devedora: " + strDevedora;


    var operadorasEncontradas = arrCredoras.concat(arrDevedoras).filter(function(v, i, a) { return a.indexOf(v) === i; });
    var operadoraBaseSugerida = "";
   
    var indexBrisa = operadorasEncontradas.indexOf("BRISANET");
    if (indexBrisa > -1) {
        operadorasEncontradas.splice(indexBrisa, 1);
    }
    if (operadorasEncontradas.length > 0) {
        operadoraBaseSugerida = operadorasEncontradas[0].replace(" FIXA", "");
    }


    var trackerMes = {};
    var gruposProjecoes = {};
    var relatorioGeralLinhasLimpidas = [];
   
    for (var j = 0; j < todasAsLinhasValidas.length; j++) {
      var item = todasAsLinhasValidas[j];
      var cols = item.linhaLimpa.split(';');
      relatorioGeralLinhasLimpidas.push(item.linhaLimpa);
     
      var mesRef = cols[2] ? cols[2].trim() : "";
      if (mesRef.length === 6) trackerMes[mesRef] = true;


      var eotB = cols[0];
      var eotR = cols[1];
     
      var infoB = obterDadosEot(eotB, operadoraBaseSugerida, item.tipoServicoFile);
      var infoR = obterDadosEot(eotR, operadoraBaseSugerida, item.tipoServicoFile);
     
      var isBBrisa = (infoB.operadora === "BRISANET");
      var isRBrisa = (infoR.operadora === "BRISANET");
     
      var operadoraParceiraLinha = operadoraBaseSugerida;
      if (isBBrisa && !isRBrisa && infoR.operadora !== "DESCONHECIDA") {
          operadoraParceiraLinha = infoR.operadora;
      } else if (!isBBrisa && isRBrisa && infoB.operadora !== "DESCONHECIDA") {
          operadoraParceiraLinha = infoB.operadora;
      } else if (!isBBrisa && !isRBrisa) {
          if (infoB.operadora !== "DESCONHECIDA" && infoB.operadora !== "BRISANET") operadoraParceiraLinha = infoB.operadora;
          else if (infoR.operadora !== "DESCONHECIDA" && infoR.operadora !== "BRISANET") operadoraParceiraLinha = infoR.operadora;
      }


      var tipoBrisaNestaLinha = "SMP";
      var tipoParceiroNestaLinha = "SMP";
     
      if (item.tipoServicoFile === "SMS") {
          tipoBrisaNestaLinha = "SMP";
          tipoParceiroNestaLinha = "SMS";
      } else {
          if (isBBrisa) {
              tipoBrisaNestaLinha = infoB.tipo || "SMP";
              tipoParceiroNestaLinha = infoR.tipo || "SMP";
          } else if (isRBrisa) {
              tipoBrisaNestaLinha = infoR.tipo || "SMP";
              tipoParceiroNestaLinha = infoB.tipo || "SMP";
          } else {
              tipoBrisaNestaLinha = (item.tipoServicoFile === "FIXA") ? "STFC" : "SMP";
              tipoParceiroNestaLinha = (item.tipoServicoFile === "FIXA") ? "STFC" : "SMP";
          }
      }
     
      var holdingParceiro = operadoraParceiraLinha.toUpperCase().replace(" FIXA", "").replace(" MOVEL", "").trim();
      var holdingLimpa = removerAcentos(holdingParceiro);
     
      if (holdingLimpa.indexOf("CLARO") !== -1) {
          holdingParceiro = (tipoParceiroNestaLinha === "STFC") ? "CLARO_FIXA" : "CLARO";
      } else if (holdingLimpa.indexOf("VIVO") !== -1 || holdingLimpa.indexOf("TELEFONICA") !== -1) {
          holdingParceiro = (tipoParceiroNestaLinha === "STFC") ? "TELEFONICA_FIXA" : "TELEFONICA_MOVEL";
      } else if (holdingLimpa.indexOf("TIM") !== -1) {
          holdingParceiro = "TIM_SA";
      } else if (holdingLimpa.indexOf("OI") !== -1) {
          holdingParceiro = "OI_SA";
      } else if (holdingLimpa.indexOf("SURF") !== -1) {
          holdingParceiro = "SURF_TELECOM";
      }


      var direcaoLinha = isBBrisa ? "EMISSAO" : "RECEBIMENTO";


      var chaveGrupo = tipoBrisaNestaLinha + "|" + tipoParceiroNestaLinha + "|" + holdingParceiro + "|" + direcaoLinha;
     
      if (!gruposProjecoes[chaveGrupo]) {
          gruposProjecoes[chaveGrupo] = {
              tipoBrisa: tipoBrisaNestaLinha,
              tipoParceiro: tipoParceiroNestaLinha,
              holdingParceiro: holdingParceiro,
              direcao: direcaoLinha,
              linhas: []
          };
      }
      gruposProjecoes[chaveGrupo].linhas.push(item.linhaLimpa);
    }
   
    var mesesEncontrados = Object.keys(trackerMes);
    if (mesesEncontrados.length > 1) {
      return { sucesso: false, bloqueado: true, motivo: "Multiplos Meses de Referencia identificados: " + mesesEncontrados.join(", ") + ". O lote deve ter o mesmo periodo." };
    }


    var mesSugerido = mesesEncontrados.length === 1 ? mesesEncontrados[0] : "";
    var relatorioGeral = analisarLinhasParaRelatorio(relatorioGeralLinhasLimpidas, operadoraBaseSugerida, "SMP", "SMP");
   
    var projecoesFinais = [];
    for (var chave in gruposProjecoes) {
        var g = gruposProjecoes[chave];
       
        var tituloDisplay = g.tipoBrisa + " (" + g.holdingParceiro + ")";
        if (g.tipoParceiro === "SMS") {
            tituloDisplay += " - SMS";
        } else if (g.tipoBrisa === "SMP" && g.tipoParceiro === "SMP") {
            if (g.holdingParceiro !== "SURF_TELECOM") {
                tituloDisplay += " - SME";
            }
        }


        var rel = analisarLinhasParaRelatorio(g.linhas, g.holdingParceiro, g.tipoBrisa, g.tipoParceiro);
        projecoesFinais.push({
            titulo: tituloDisplay,
            relatorio: rel,
            holdingParceiro: g.holdingParceiro,
            tipoBrisa: g.tipoBrisa,
            tipoParceiro: g.tipoParceiro,
            direcao: g.direcao
        });
    }


    return {
      sucesso: true,
      bloqueado: false,
      linhasValidas: todasAsLinhasValidas.length,
      linhasRemovidas: linhasRemovidasSubtotais,
      linhasExpurgadas: linhasExpurgadasDetalhes,
      eotsNaoMapeadas: eotsNaoMapeadas,
      relacionamento: relacionamentoDetectado,
      mesSugerido: mesSugerido,
      operadoraSugerida: operadoraBaseSugerida,
      direcaoSugerida: direcaoFaturamentoSugerida,
      relatorioGeral: relatorioGeral,
      projecoes: projecoesFinais
    };


  } catch (erro) {
    return { sucesso: false, erro: erro.toString() };
  }
}


// ==============================================================================
// INJEÇÃO MANUAL NA PLANILHA DE CONTROLE
// ==============================================================================
function forcarAtualizacaoPlanilhaManual(anoMes, tipoBrisa, holdingParceiro, tipoParceiro, valorBruto, colunaDestino) {
  try {
    var valorCalculado = parseFloat(valorBruto);
    if(isNaN(valorCalculado)) valorCalculado = 0;


    var planilha;
    try {
        planilha = SpreadsheetApp.openById(ID_PLANILHA_CONTROLE);
    } catch(e) {
        return { success: false, log: "Acesso Negado à Planilha de Controle. O ID está correto?" };
    }
   
    var aba = planilha.getSheetByName(NOME_ABA_CONTROLE);
    if (!aba) return { success: false, log: "Erro: A aba '" + NOME_ABA_CONTROLE + "' não foi encontrada." };


    var dados = aba.getDataRange().getDisplayValues();
    var opLimpa = holdingParceiro.replace("_FIXA", "").replace("_MOVEL", "").replace("_SA", "").replace("TELEFONICA", "VIVO").replace("SURF_TELECOM", "SURF").trim();
   
    var tipoRelEsperado = tipoParceiro;


    for (var i = 0; i < dados.length; i++) {
      var linha = dados[i];
      var tipoBrisaP = String(linha[1]).trim().toUpperCase();
      var operadoraP = String(linha[2]).trim().toUpperCase();
      var tipoRelP   = String(linha[3]).trim().toUpperCase();
      var mesCodP    = String(linha[6]).trim();              


      if (mesCodP === anoMes && tipoBrisaP === tipoBrisa && operadoraP === opLimpa) {
        if (tipoRelP === tipoRelEsperado || tipoRelP.indexOf(tipoRelEsperado) !== -1 || tipoRelEsperado.indexOf(tipoRelP) !== -1) {
         
          var valorFinal = (colunaDestino === 10) ? -Math.abs(valorCalculado) : Math.abs(valorCalculado);
         
          aba.getRange(i + 1, colunaDestino).setValue(valorFinal);


          var nomeColunaLog = (colunaDestino === 9) ? "I (Crédito)" : "J (Débito)";
          return { success: true, log: "✅ SUCESSO!\n\nO valor de R$ " + valorFinal.toFixed(2) + " foi lançado perfeitamente na Coluna " + nomeColunaLog + ".\n\nAlvo: " + opLimpa + " | Mês: " + mesCodP };
        }
      }
    }
   
    return { success: false, log: "❌ ERRO: Linha não encontrada na Planilha de Controle.\n\nTentamos procurar exatamente por:\n- Mês: " + anoMes + "\n- Brisa: " + tipoBrisa + "\n- Parceiro: " + opLimpa + "\n- Tipo Serviço: " + tipoRelEsperado + "\n\nVerifique se essa combinação existe na sua aba." };
  } catch(e) {
    return { success: false, log: "Erro Crítico de execução: " + e.message };
  }
}


// ==============================================================================
// FASE 2: SALVAR ARQUIVOS AUTOMÁTICO
// ==============================================================================
function salvarLoteGFX(dados) {
  try {
    var emailUsuarioLogado = Session.getActiveUser().getEmail();
     
    var operadoraBase = dados.operadora.toUpperCase();
    var anoMes = dados.anoMes;
    var direcaoFaturamento = dados.direcaoFaturamento || "RECEBIMENTO";
    var isSobrescrever = dados.sobrescrever === true;
   
    var todasAsLinhasValidas = [];
   
    for (var f = 0; f < dados.arquivos.length; f++) {
      var blobTemp = Utilities.newBlob(Utilities.base64Decode(dados.arquivos[f].base64), 'text/csv');
      var conteudoTexto = blobTemp.getDataAsString("UTF-8");
      if (!conteudoTexto || conteudoTexto.indexOf(';') === -1) {
        conteudoTexto = blobTemp.getDataAsString("ISO-8859-1");
      }
     
      var nomeArq = dados.arquivos[f].nome.toUpperCase();
      var isSmeArquivo = (nomeArq.indexOf("SME") !== -1);
     
      var linhas = conteudoTexto.split(/\r?\n/);
      var linhasValidasDesteArquivo = [];
      var arquivoTemMinutosZerados = true;
      var hasValidLinesInFile = false;


      for (var i = 0; i < linhas.length; i++) {
        var linha = linhas[i].trim();
        if (linha === "") continue;
       
        var linhaLimpa = padronizarLinhaDetraf(linha, isSmeArquivo);
        if (linhaLimpa) {
            hasValidLinesInFile = true;
            linhasValidasDesteArquivo.push(linhaLimpa);
           
            var colunas = linhaLimpa.split(';');
            var strMinutos = colunas[9] ? String(colunas[9]).trim().replace(',', '.') : "0";
            if (strMinutos === "") strMinutos = "0";
            var minVal = parseFloat(strMinutos);
            if (isNaN(minVal)) minVal = 0;
           
            if (minVal !== 0) {
                arquivoTemMinutosZerados = false;
            }
        }
      }
     
      var tipoServicoDoArquivo = "FIXA";
      if (isSmeArquivo) {
          tipoServicoDoArquivo = "SME";
      } else if (hasValidLinesInFile && arquivoTemMinutosZerados) {
          tipoServicoDoArquivo = "SMS";
      }


      for (var k = 0; k < linhasValidasDesteArquivo.length; k++) {
          todasAsLinhasValidas.push({
              linhaLimpa: linhasValidasDesteArquivo[k],
              tipoServicoFile: tipoServicoDoArquivo
          });
      }
    }
   
    var gruposProjecoes = {};
    for (var j = 0; j < todasAsLinhasValidas.length; j++) {
      var item = todasAsLinhasValidas[j];
      var cols = item.linhaLimpa.split(';');
      var eotB = cols[0];
      var eotR = cols[1];
     
      var infoB = obterDadosEot(eotB, operadoraBase, "SMP");
      var infoR = obterDadosEot(eotR, operadoraBase, "SMP");
     
      var isBBrisa = (infoB.operadora === "BRISANET");
      var isRBrisa = (infoR.operadora === "BRISANET");
     
      var operadoraParceiraLinha = operadoraBase;
      if (isBBrisa && !isRBrisa && infoR.operadora !== "DESCONHECIDA") {
          operadoraParceiraLinha = infoR.operadora;
      } else if (!isBBrisa && isRBrisa && infoB.operadora !== "DESCONHECIDA") {
          operadoraParceiraLinha = infoB.operadora;
      } else if (!isBBrisa && !isRBrisa) {
          if (infoB.operadora !== "DESCONHECIDA" && infoB.operadora !== "BRISANET") operadoraParceiraLinha = infoB.operadora;
          else if (infoR.operadora !== "DESCONHECIDA" && infoR.operadora !== "BRISANET") operadoraParceiraLinha = infoR.operadora;
      }


      var tipoBrisaNestaLinha = "SMP";
      var tipoParceiroNestaLinha = "SMP";
     
      if (item.tipoServicoFile === "SMS") {
          tipoBrisaNestaLinha = "SMP";
          tipoParceiroNestaLinha = "SMS";
      } else {
          if (isBBrisa) {
              tipoBrisaNestaLinha = infoB.tipo || "SMP";
              tipoParceiroNestaLinha = infoR.tipo || "SMP";
          } else if (isRBrisa) {
              tipoBrisaNestaLinha = infoR.tipo || "SMP";
              tipoParceiroNestaLinha = infoB.tipo || "SMP";
          } else {
              tipoBrisaNestaLinha = "SMP";
              tipoParceiroNestaLinha = "SMP";
          }
      }
     
      var holdingParceiro = operadoraParceiraLinha.toUpperCase().replace(" FIXA", "").replace(" MOVEL", "").trim();
      var holdingLimpa = removerAcentos(holdingParceiro);
     
      if (holdingLimpa.indexOf("CLARO") !== -1) {
          holdingParceiro = (tipoParceiroNestaLinha === "STFC") ? "CLARO_FIXA" : "CLARO";
      } else if (holdingLimpa.indexOf("VIVO") !== -1 || holdingLimpa.indexOf("TELEFONICA") !== -1) {
          holdingParceiro = (tipoParceiroNestaLinha === "STFC") ? "TELEFONICA_FIXA" : "TELEFONICA_MOVEL";
      } else if (holdingLimpa.indexOf("TIM") !== -1) {
          holdingParceiro = "TIM_SA";
      } else if (holdingLimpa.indexOf("OI") !== -1) {
          holdingParceiro = "OI_SA";
      } else if (holdingLimpa.indexOf("SURF") !== -1) {
          holdingParceiro = "SURF_TELECOM";
      }


      var direcaoLinha = isBBrisa ? "EMISSAO" : "RECEBIMENTO";


      var chaveGrupo = tipoBrisaNestaLinha + "|" + tipoParceiroNestaLinha + "|" + holdingParceiro + "|" + direcaoLinha;
      if (!gruposProjecoes[chaveGrupo]) {
          gruposProjecoes[chaveGrupo] = {
              tipoBrisa: tipoBrisaNestaLinha,
              tipoParceiro: tipoParceiroNestaLinha,
              holdingParceiro: holdingParceiro,
              direcao: direcaoLinha,
              linhas: []
          };
      }
      gruposProjecoes[chaveGrupo].linhas.push(item.linhaLimpa);
    }


    var pastaProjeto;
    try {
        pastaProjeto = DriveApp.getFolderById(ID_PASTA_RAIZ_PROJETO);
    } catch(e) {
        return { sucesso: false, erro: "Acesso Negado a pasta raiz '1- Projeto de DETRAF'. Verifique se o ID esta correto e se possui permissoes." };
    }


    if (!isSobrescrever) {
        for (var chave in gruposProjecoes) {
            var g = gruposProjecoes[chave];
            var pastaOperadoraCheck = resolverPastaDestino(pastaProjeto, direcaoFaturamento, g.tipoBrisa, g.holdingParceiro);
            var nomeBaseParaBusca = gerarNomeBaseBusca(g.holdingParceiro, g.tipoBrisa, g.tipoParceiro, anoMes, direcaoFaturamento);
            var iteradorBusca = pastaOperadoraCheck.searchFiles("title contains '" + nomeBaseParaBusca + "'");
           
            if (iteradorBusca.hasNext()) {
                return {
                    sucesso: false,
                    requerConfirmacao: true,
                    mensagem: "Esse arquivo já foi analisado e armazenado, deseja substituir no drive?"
                };
            }
        }
    }


    var dataBaseExata = new Date();
    var nomesJaUtilizadosNesteLote = {};


    var resultadosFinais = [];
    var planilhasAtualizadasContagem = 0;
    var logsPlanilha = [];
   
    for (var chave in gruposProjecoes) {
        var g = gruposProjecoes[chave];
        var rel = analisarLinhasParaRelatorio(g.linhas, g.holdingParceiro, g.tipoBrisa, g.tipoParceiro);
       
        var nomeArquivoNovo = "";
        var tsUnico = "";
        var tentativasSegundo = 0;
       
        do {
            var dataAjustada = new Date(dataBaseExata.getTime() + (tentativasSegundo * 1000));
            tsUnico = Utilities.formatDate(dataAjustada, Session.getScriptTimeZone(), "yyyyMMddHHmmss");
           
            nomeArquivoNovo = gerarNomeArquivoGFX_Dinamico(g.holdingParceiro, g.tipoBrisa, g.tipoParceiro, anoMes, tsUnico, direcaoFaturamento);
            tentativasSegundo++;
        } while (nomesJaUtilizadosNesteLote[nomeArquivoNovo]);
       
        nomesJaUtilizadosNesteLote[nomeArquivoNovo] = true;
       
        var pastaOperadora = resolverPastaDestino(pastaProjeto, direcaoFaturamento, g.tipoBrisa, g.holdingParceiro);


        var nomeBaseParaBusca = gerarNomeBaseBusca(g.holdingParceiro, g.tipoBrisa, g.tipoParceiro, anoMes, direcaoFaturamento);
        var iteradorBusca = pastaOperadora.searchFiles("title contains '" + nomeBaseParaBusca + "'");
       
        var arqDrive;
        var statusSistema = "Criado com Sucesso";
        var isDuplicado = false;
       
        if (iteradorBusca.hasNext()) {
            var arqAntigo = iteradorBusca.next();
            arqAntigo.setTrashed(true);
            statusSistema = "Substituído com Sucesso";
            isDuplicado = true;
        }
       
        var blob = Utilities.newBlob(g.linhas.join("\r\n"), 'text/csv', nomeArquivoNovo);
        arqDrive = pastaOperadora.createFile(blob);
       
        if (emailUsuarioLogado && emailUsuarioLogado !== "") {
            try {
                arqDrive.setDescription("Arquivo gerado pelo usuário: " + emailUsuarioLogado);
            } catch(e) {}
        }
       
        var atualizouObj = atualizarPlanilhaControle(anoMes, g.tipoBrisa, g.holdingParceiro, g.tipoParceiro, rel.valorTotal, direcaoFaturamento);
        if (atualizouObj.success) {
            planilhasAtualizadasContagem++;
        }
        logsPlanilha.push(atualizouObj.log);
       
        var emailObj = null;
        if (direcaoFaturamento === "EMISSAO") {
            emailObj = gerarModeloEmail(g.holdingParceiro, g.tipoBrisa, anoMes);
        }
       
        var tituloDisplay = g.tipoBrisa + " (" + g.holdingParceiro + ")";
        if (g.tipoParceiro === "SMS") {
            tituloDisplay += " - SMS";
        } else if (g.tipoBrisa === "SMP" && g.tipoParceiro === "SMP") {
            if (g.holdingParceiro !== "SURF_TELECOM") {
                tituloDisplay += " - SME";
            }
        }
       
        resultadosFinais.push({
            tipo: tituloDisplay,
            nome: arqDrive.getName(),
            url: arqDrive.getUrl(),
            id: arqDrive.getId(),
            pastaUrl: pastaOperadora.getUrl(),
            relatorio: rel,
            email: emailObj,
            status: statusSistema,
            duplicado: isDuplicado
        });
    }


    if (dados.relatoriosIndividuais && dados.relatoriosIndividuais.length > 0) {
        var pastaHistorico = obterOuCriarPasta(pastaProjeto, "Historico de Relatorios");
       
        for (var k = 0; k < dados.relatoriosIndividuais.length; k++) {
            var item = dados.relatoriosIndividuais[k];
            var nomeHistoricoBase = "Brisanet " + item.titulo + " - " + anoMes;
           
            var iteradorAntigos = pastaHistorico.searchFiles("title contains '" + nomeHistoricoBase + "'");
            while (iteradorAntigos.hasNext()) {
                iteradorAntigos.next().setTrashed(true);
            }
           
            var nomeHistoricoFinal = nomeHistoricoBase + ".html";
            var arqHist = pastaHistorico.createFile(nomeHistoricoFinal, item.html, MimeType.HTML);
           
            if (emailUsuarioLogado && emailUsuarioLogado !== "") {
                try { arqHist.setDescription("Relatório atualizado pelo usuário: " + emailUsuarioLogado); } catch(e) {}
            }
        }
    }
   
    return { sucesso: true, arquivosSalvos: resultadosFinais, planilhasAtualizadas: planilhasAtualizadasContagem, logsPlanilha: logsPlanilha };
   
  } catch (erro) {
    return { sucesso: false, erro: erro.toString() };
  }
}


function atualizarPlanilhaControle(mesRef, tipoBrisa, holdingParceiro, tipoParceiro, valorCalculado, direcaoFaturamento) {
  try {
    var planilha;
    try {
        planilha = SpreadsheetApp.openById(ID_PLANILHA_CONTROLE);
    } catch(e) {
        return { success: false, log: "Acesso Negado a Planilha de Controle. Verifique o ID ou permissoes. (" + e.message + ")" };
    }
   
    var aba = planilha.getSheetByName(NOME_ABA_CONTROLE);
    if (!aba) return { success: false, log: "Erro: A aba '" + NOME_ABA_CONTROLE + "' nao existe." };


    var dados = aba.getDataRange().getDisplayValues();
    var opLimpa = holdingParceiro.replace("_FIXA", "").replace("_MOVEL", "").replace("_SA", "").replace("TELEFONICA", "VIVO").replace("SURF_TELECOM", "SURF").trim();
   
    var tipoRelEsperado = tipoParceiro;


    for (var i = 0; i < dados.length; i++) {
      var linha = dados[i];
      var tipoBrisaP = String(linha[1]).trim().toUpperCase();
      var operadoraP = String(linha[2]).trim().toUpperCase();
      var tipoRelP   = String(linha[3]).trim().toUpperCase();
      var mesCodP    = String(linha[6]).trim();              


      if (mesCodP === mesRef && tipoBrisaP === tipoBrisa && operadoraP === opLimpa) {
        if (tipoRelP === tipoRelEsperado || tipoRelP.indexOf(tipoRelEsperado) !== -1 || tipoRelEsperado.indexOf(tipoRelP) !== -1) {
         
          var colunaDestino = (direcaoFaturamento === "EMISSAO") ? 9 : 10;
         
          var valorFinal = (colunaDestino === 10) ? -Math.abs(valorCalculado) : Math.abs(valorCalculado);
         
          aba.getRange(i + 1, colunaDestino).setValue(valorFinal);


          var nomeColunaLog = (colunaDestino === 9) ? "I (Crédito)" : "J (Débito)";
          return { success: true, log: "Sucesso! Mes " + mesRef + " ("+opLimpa+") preenchido com R$ " + valorFinal.toFixed(2) + " na Coluna " + nomeColunaLog };
        }
      }
    }
   
    return { success: false, log: "Linha nao encontrada na aba '"+NOME_ABA_CONTROLE+"': Mes=" + mesRef + " | Brisa=" + tipoBrisa + " | Op=" + opLimpa + " | Relacionada=" + tipoRelEsperado };
  } catch(e) {
    return { success: false, log: "Erro Critico no script de integracao: " + e.message };
  }
}


function obterOuCriarPasta(pastaPai, nomePasta) {
  var pastas = pastaPai.getFoldersByName(nomePasta);
  if (pastas.hasNext()) {
    return pastas.next();
  }
  return pastaPai.createFolder(nomePasta);
}


function resolverPastaDestino(pastaProjeto, direcaoFaturamento, tipoBrisa, holdingParceiro) {
    var pastaPadronizados = obterOuCriarPasta(pastaProjeto, "Arquivos Padronizados");
    var nomeDirecao = (direcaoFaturamento === "RECEBIMENTO") ? "Detraf Recebido" : "Detraf Enviado";
    var pastaDirecao = obterOuCriarPasta(pastaPadronizados, nomeDirecao);


    var nomeTipo = (tipoBrisa === "STFC") ? "Brisanet Fixo" : "Brisanet Móvel";
    var pastaTipo = obterOuCriarPasta(pastaDirecao, nomeTipo);


    var nomeOpBase = holdingParceiro.replace("_FIXA", "").replace("_MOVEL", "").replace("_SA", "").replace("TELEFONICA", "VIVO").trim();
    var nomeOperadora = nomeOpBase.charAt(0).toUpperCase() + nomeOpBase.slice(1).toLowerCase();
   
    if(nomeOperadora === "Oi") nomeOperadora = "Oi";


    return obterOuCriarPasta(pastaTipo, nomeOperadora);
}


function gerarNomeBaseBusca(holdingParceiro, tipoBrisa, tipoParceiro, anoMes, direcao) {
    if (direcao === "EMISSAO") {
        var opNomeEmail = holdingParceiro;
        if (holdingParceiro.indexOf("CLARO") !== -1) opNomeEmail = "CLARO_SA";
        else if (holdingParceiro.indexOf("TIM") !== -1) opNomeEmail = "TIM_SA";
        else if (holdingParceiro.indexOf("TELEFONICA") !== -1 || holdingParceiro.indexOf("VIVO") !== -1) opNomeEmail = "VIVO";
        else if (holdingParceiro.indexOf("OI") !== -1) opNomeEmail = "OI_SA";
       
        var tipoBrisaStr = (tipoBrisa === "STFC") ? "FIXA" : "MOVEL";
        return "DETRAF_BRISANET_" + tipoBrisaStr + "_" + opNomeEmail + "_LOCAL_" + anoMes;
    } else {
        if (tipoParceiro === "SMS") {
            return holdingParceiro + "_" + anoMes + "_C_SMS_";
        } else if (tipoBrisa === "SMP" && tipoParceiro === "SMP") {
            if (holdingParceiro === "SURF_TELECOM") {
                return holdingParceiro + "_" + anoMes + "_C_ITX_";
            }
            return holdingParceiro + "_" + anoMes + "_C_ITX_SME_";
        } else {
            return holdingParceiro + "_" + anoMes + "_C_ITX_";
        }
    }
}


function gerarModeloEmail(holdingParceiro, tipoBrisa, anoMes) {
    var ano = "";
    var mesNum = "";
    if(anoMes && anoMes.length >= 6) {
        ano = anoMes.substring(0, 4);
        mesNum = anoMes.substring(4, 6);
    }
   
    var meses = {
        "01": "Janeiro", "02": "Fevereiro", "03": "Marco", "04": "Abril",
        "05": "Maio", "06": "Junho", "07": "Julho", "08": "Agosto",
        "09": "Setembro", "10": "Outubro", "11": "Novembro", "12": "Dezembro"
    };
   
    var mesExtenso = meses[mesNum] ? meses[mesNum] : "Mes " + mesNum;
    var mesExtensoUpper = mesExtenso.toUpperCase();
    var tipoBrisaStr = (tipoBrisa === "STFC") ? "FIXA" : "MOVEL";
   
    var opNomeEmail = holdingParceiro.toUpperCase().replace("_FIXA", "").replace("_MOVEL", "").trim();
    if (opNomeEmail.indexOf("CLARO") !== -1) opNomeEmail = "CLARO";
    else if (opNomeEmail.indexOf("TIM") !== -1) opNomeEmail = "TIM";
    else if (opNomeEmail.indexOf("TELEFONICA") !== -1 || opNomeEmail.indexOf("VIVO") !== -1) opNomeEmail = "VIVO";
    else if (opNomeEmail.indexOf("OI") !== -1) opNomeEmail = "OI";


    var opSa = opNomeEmail;
    if (opNomeEmail === "CLARO" || opNomeEmail === "TIM" || opNomeEmail === "OI" || opNomeEmail === "VIVO") {
        opSa = opNomeEmail + " SA";
    }


    var assunto = "DETRAF BRISANET " + tipoBrisaStr + " - " + opNomeEmail + " LOCAL - " + mesExtensoUpper + "/ " + ano;
   
    var corpo = "Prezado(a),\n\n" +
                "Estamos encaminhando nesta data, o DETRAF de ITX LOCAL - referente ao mes de " + mesExtenso + " de " + ano + " com a " + opSa + ", conforme detalhamento em anexo.\n\n" +
                "Por gentileza, validar o recebimento.\n\n" +
                "Atenciosamente,\n" +
                "Sua Assinatura";


    return { assunto: assunto, corpo: corpo };
}


function gerarNomeArquivoGFX_Dinamico(holdingParceiro, tipoBrisa, tipoParceiro, anoMes, timestamp, direcao) {
    if (direcao === "EMISSAO") {
        var opNomeEmail = holdingParceiro;
        if (holdingParceiro.indexOf("CLARO") !== -1) opNomeEmail = "CLARO_SA";
        else if (holdingParceiro.indexOf("TIM") !== -1) opNomeEmail = "TIM_SA";
        else if (holdingParceiro.indexOf("TELEFONICA") !== -1 || holdingParceiro.indexOf("VIVO") !== -1) opNomeEmail = "VIVO";
        else if (holdingParceiro.indexOf("OI") !== -1) opNomeEmail = "OI_SA";
       
        var tipoBrisaStr = (tipoBrisa === "STFC") ? "FIXA" : "MOVEL";
        return "DETRAF_BRISANET_" + tipoBrisaStr + "_" + opNomeEmail + "_LOCAL_" + anoMes + "_" + timestamp + ".csv";
    } else {
        if (tipoParceiro === "SMS") {
            return holdingParceiro + "_" + anoMes + "_C_SMS_" + timestamp + ".csv";
        } else if (tipoBrisa === "SMP" && tipoParceiro === "SMP") {
            if (holdingParceiro === "SURF_TELECOM") {
                return holdingParceiro + "_" + anoMes + "_C_ITX_" + timestamp + ".csv";
            }
            return holdingParceiro + "_" + anoMes + "_C_ITX_SME_" + timestamp + ".csv";
        } else {
            return holdingParceiro + "_" + anoMes + "_C_ITX_" + timestamp + ".csv";
        }
    }
}


function analisarLinhasParaRelatorio(linhasDetalhamento, fallbackOperadora, forceTipoBrisa, forceTipoParceiro) {
  var eotBilhetagemMap = {};
  var eotRelacionadaMap = {};
  var valorTotalGeral = 0;
  var totalChamadasGeral = 0;
  var totalMinutosGeral = 0;
 
  for (var i = 0; i < linhasDetalhamento.length; i++) {
    var colunas = linhasDetalhamento[i].split(';');
    var eotB = colunas[0];
    var eotR = colunas[1];
    var qtde = parseInt(colunas[8], 10) || 0;
    var minutos = parseFloat(colunas[9] ? String(colunas[9]).replace(',', '.') : 0) || 0;
   
    // ==========================================
    // A BLINDAGEM MÁXIMA E FINAL
    // ==========================================
    var strValorCru = colunas[14] ? String(colunas[14]).trim() : "0";
   
    // Se tiver aspas (ex: "1.333,42"), arranca-as primeiro
    strValorCru = strValorCru.replace(/['"]/g, '');
   
    // Se tiver ponto e vírgula, o ponto é milhar. Arranca o ponto!
    if (strValorCru.indexOf('.') !== -1 && strValorCru.indexOf(',') !== -1) {
        strValorCru = strValorCru.replace(/\./g, '');
    }
    // Substitui a vírgula final por ponto para o JavaScript conseguir somar
    var valor = parseFloat(strValorCru.replace(',', '.')) || 0;
   
    valorTotalGeral += valor;
    totalChamadasGeral += qtde;
    totalMinutosGeral += minutos;
   
    if (eotB) {
      if (!eotBilhetagemMap[eotB]) {
         var infoB = obterDadosEot(eotB, fallbackOperadora, "SMP");
         if (infoB.operadora === "BRISANET") infoB.tipo = forceTipoBrisa;
         else infoB.tipo = forceTipoParceiro;
         
         eotBilhetagemMap[eotB] = { valor: 0, chamadas: 0, minutos: 0, operadora: infoB.operadora, uf: infoB.uf, tipo: infoB.tipo };
      }
      eotBilhetagemMap[eotB].valor += valor;
      eotBilhetagemMap[eotB].chamadas += qtde;
      eotBilhetagemMap[eotB].minutos += minutos;
    }
   
    if (eotR) {
      if (!eotRelacionadaMap[eotR]) {
         var infoR = obterDadosEot(eotR, fallbackOperadora, "SMP");
         if (infoR.operadora === "BRISANET") infoR.tipo = forceTipoBrisa;
         else infoR.tipo = forceTipoParceiro;
         
         eotRelacionadaMap[eotR] = { valor: 0, chamadas: 0, minutos: 0, operadora: infoR.operadora, uf: infoR.uf, tipo: infoR.tipo };
      }
      eotRelacionadaMap[eotR].valor += valor;
      eotRelacionadaMap[eotR].chamadas += qtde;
      eotRelacionadaMap[eotR].minutos += minutos;
    }
  }
 
  var listaBilhetagem = [];
  for (var k1 in eotBilhetagemMap) {
    listaBilhetagem.push({
      eot: k1, nome: eotBilhetagemMap[k1].operadora, uf: eotBilhetagemMap[k1].uf, tipo: eotBilhetagemMap[k1].tipo,
      valor: eotBilhetagemMap[k1].valor, chamadas: eotBilhetagemMap[k1].chamadas, minutos: eotBilhetagemMap[k1].minutos
    });
  }
 
  var listaRelacionada = [];
  for (var k2 in eotRelacionadaMap) {
    listaRelacionada.push({
      eot: k2, nome: eotRelacionadaMap[k2].operadora, uf: eotRelacionadaMap[k2].uf, tipo: eotRelacionadaMap[k2].tipo,
      valor: eotRelacionadaMap[k2].valor, chamadas: eotRelacionadaMap[k2].chamadas, minutos: eotRelacionadaMap[k2].minutos
    });
  }
 
  return {
    valorTotal: valorTotalGeral, totalChamadas: totalChamadasGeral, totalMinutos: totalMinutosGeral,
    detalheBilhetagem: listaBilhetagem, detalheRelacionada: listaRelacionada
  };
}


function carregarRelatorioHtml(id) {
  try {
    var conteudo = DriveApp.getFileById(id).getBlob().getDataAsString();
    return { sucesso: true, html: conteudo };
  } catch(e) {
    return { sucesso: false, erro: e.toString() };
  }
}


function parseMoedaAbsoluta(val) {
  if (val === null || val === undefined) return 0;
  var str = String(val);
  var soNumeros = str.replace(/[^\d,]/g, '');
  if (soNumeros === "") return 0;
  var numero = parseFloat(soNumeros.replace(',', '.'));
  return isNaN(numero) ? 0 : numero;
}


function obterDadosDashboard() {
  try {
    var planilha = SpreadsheetApp.openById(ID_PLANILHA_CONTROLE);
    var aba = planilha.getSheetByName(NOME_ABA_CONTROLE);
    var dados = aba.getDataRange().getDisplayValues();


    var baseMensal = {};


    for (var i = 3; i < dados.length; i++) {
      var linha = dados[i];
      var tipoBrisaStr = String(linha[1]).trim().toUpperCase();
      var opStr = String(linha[2]).trim().toUpperCase();        
      var mesStr = String(linha[6]).trim();                      


      if (!mesStr.match(/^\d{6}$/) || opStr === "") continue;


      var valCredora = parseMoedaAbsoluta(linha[8]);
      var valDevedora = parseMoedaAbsoluta(linha[9]);


      if (!baseMensal[mesStr]) {
        baseMensal[mesStr] = {
          credora: 0,
          devedora: 0,
          ops: {},
          tipos: {}
        };
      }


      baseMensal[mesStr].credora += valCredora;
      baseMensal[mesStr].devedora += valDevedora;


      if (!baseMensal[mesStr].ops[opStr]) baseMensal[mesStr].ops[opStr] = { credora: 0, devedora: 0 };
      baseMensal[mesStr].ops[opStr].credora += valCredora;
      baseMensal[mesStr].ops[opStr].devedora += valDevedora;


      if (!baseMensal[mesStr].tipos[tipoBrisaStr]) baseMensal[mesStr].tipos[tipoBrisaStr] = { credora: 0, devedora: 0 };
      baseMensal[mesStr].tipos[tipoBrisaStr].credora += valCredora;
      baseMensal[mesStr].tipos[tipoBrisaStr].devedora += valDevedora;
    }


    return { sucesso: true, dadosMensais: baseMensal };


  } catch (e) {
    return { sucesso: false, erro: e.message };
  }
}