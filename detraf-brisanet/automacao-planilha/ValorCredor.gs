// ==============================================================================
// MENU SUPERIOR
// ==============================================================================
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('🚀 ATUALIZAR DETRAF')
    .addItem('🔄 Executar Atualização de Valores', 'atualizarDetrafPlanilha')
    .addSeparator()
    .addItem('💲 Executar Atualização de NFs (Jira)', 'atualizarNFPlanilha')
    .addToUi();
}


// ==============================================================================
// CONFIGURAÇÕES GERAIS E ORGANIZAÇÃO DO DRIVE
// ==============================================================================
var NOME_ABA = "Controle - DETRAF E DEROAM";


var ID_PASTA_DADOS = "1Ca3Uy_5kT4MlQlXllnoTt4aE0KcIous-";  
var ID_PASTA_EXTRA = "1mKE3Xd9thiktxEeqk6O32C5T91SwjfRD";  
var ID_PASTA_RESUMO = "1yNDmnrEoGXew_zTv2aaXNzuvS1-eo7cT";


// MAPA PADRONIZADO CONFORME MANUAL DO USUÁRIO
var MAPA_OPERADORAS = [
  // BRISANET (STFC)
  { assunto: "DETRAF BRISANET - CLARO FIXA_ITX",          tipoBrisa: "STFC", operadora: "CLARO", tipoRel: "STFC" },
  { assunto: "DETRAF BRISANET - CLARO_ITX",               tipoBrisa: "STFC", operadora: "CLARO", tipoRel: "SMP"  },
  { assunto: "DETRAF BRISANET - OI S.A._ITX",             tipoBrisa: "STFC", operadora: "OI",    tipoRel: "STFC" },
  { assunto: "DETRAF BRISANET - SURF_TELECOM_ITX",        tipoBrisa: "STFC", operadora: "SURF",  tipoRel: "STFC" },
  { assunto: "DETRAF BRISANET - SURF_TELECOM_ITX",        tipoBrisa: "STFC", operadora: "SURF",  tipoRel: "SMP"  },
  { assunto: "DETRAF BRISANET - TIM SA_ITX",              tipoBrisa: "STFC", operadora: "TIM",   tipoRel: "STFC" },
  { assunto: "DETRAF BRISANET - TIM SA_ITX",              tipoBrisa: "STFC", operadora: "TIM",   tipoRel: "SMP/STFC" },
  { assunto: "DETRAF BRISANET - TELEFONICA MOVEL_ITX",    tipoBrisa: "STFC", operadora: "VIVO",  tipoRel: "SMP"  },
  { assunto: "DETRAF BRISANET - TELEFONICA FIXA_ITX",     tipoBrisa: "STFC", operadora: "VIVO",  tipoRel: "STFC" },
 
  // BRISANET MÓVEL (SMP)
  { assunto: "DETRAF BRISANET_MOVEL - CLARO_SMS",         tipoBrisa: "SMP",  operadora: "CLARO", tipoRel: "SMS"  },
  { assunto: "DETRAF BRISANET_MOVEL - CLARO FIXA_ITX",    tipoBrisa: "SMP",  operadora: "CLARO", tipoRel: "STFC" },
  { assunto: "DETRAF BRISANET_MOVEL - OI S.A._ITX",       tipoBrisa: "SMP",  operadora: "OI",    tipoRel: "STFC" },
  { assunto: "DETRAF BRISANET_MOVEL - SURF_TELECOM_ITX",  tipoBrisa: "SMP",  operadora: "SURF",  tipoRel: "STFC" },
  { assunto: "DETRAF BRISANET_MOVEL - SURF_TELECOM_ITX",  tipoBrisa: "SMP",  operadora: "SURF",  tipoRel: "SMP"  },
  { assunto: "DETRAF BRISANET_MOVEL - SURF_TELECOM_SMS",  tipoBrisa: "SMP",  operadora: "SURF",  tipoRel: "SMS"  },
  { assunto: "DETRAF BRISANET_MOVEL - TIM SA_SMS",        tipoBrisa: "SMP",  operadora: "TIM",   tipoRel: "SMS"  },
  { assunto: "DETRAF BRISANET_MOVEL - TIM SA_ITX",        tipoBrisa: "SMP",  operadora: "TIM",   tipoRel: "STFC" },
  { assunto: "DETRAF BRISANET_MOVEL - TELEFONICA MOVEL_SMS", tipoBrisa: "SMP", operadora: "VIVO", tipoRel: "SMS" },
  { assunto: "DETRAF BRISANET_MOVEL - TELEFONICA FIXA_ITX",  tipoBrisa: "SMP", operadora: "VIVO", tipoRel: "STFC" },
 
  // MÓVEL LOCAL / HOME
  { assunto: "DETRAF BRISANET MÓVEL - VIVO LOCAL",        tipoBrisa: "SMP",  operadora: "VIVO",  tipoRel: "SMP" },
  { assunto: "DETRAF BRISANET MÓVEL - CLARO SA LOCAL",    tipoBrisa: "SMP",  operadora: "CLARO", tipoRel: "SMP" },
  { assunto: "DETRAF BRISANET MÓVEL - TIM SA LOCAL",      tipoBrisa: "SMP",  operadora: "TIM",   tipoRel: "SMP" },
  { assunto: "DETRAF BRISANET MÓVEL - VIVO LOCAL",        tipoBrisa: "SMP",  operadora: "VIVO",  tipoRel: "LOCAL" },
  { assunto: "DETRAF BRISANET MÓVEL - CLARO SA LOCAL",    tipoBrisa: "SMP",  operadora: "CLARO", tipoRel: "LOCAL" },
  { assunto: "DETRAF BRISANET MÓVEL - TIM SA LOCAL",      tipoBrisa: "SMP",  operadora: "TIM",   tipoRel: "LOCAL" }
];


// ==============================================================================
// FUNÇÃO PRINCIPAL
// ==============================================================================
function atualizarDetrafPlanilha() {
  var pastaRtf, pastaCsv, pastaXls;
  try {
    pastaCsv = DriveApp.getFolderById(ID_PASTA_DADOS);
    pastaXls = DriveApp.getFolderById(ID_PASTA_EXTRA);
    pastaRtf = DriveApp.getFolderById(ID_PASTA_RESUMO);
  } catch (erroDrive) {
    SpreadsheetApp.getUi().alert("❌ ERRO NO GOOGLE DRIVE!");
    return;
  }
 
  var planilha = SpreadsheetApp.getActiveSpreadsheet();
  var aba = planilha.getSheetByName(NOME_ABA);
  if (!aba) return;
 
  var dadosPlanilha = aba.getDataRange().getDisplayValues();
  var contadorPreenchidos = 0;
 
  planilha.toast("Iniciando a busca de e-mails...", "Robô DETRAF", 5);
 
  for (var i = 0; i < dadosPlanilha.length; i++) {
    var linha = dadosPlanilha[i];
    var tipoBrisaP   = String(linha[1]).trim().toUpperCase();
    var operadoraP   = String(linha[2]).trim().toUpperCase();
    var tipoRelP     = String(linha[3]).trim().toUpperCase();
    var mesCodP      = String(linha[6]).trim();              
    var valorColunaI = linha[8];                            
   
    // BLOQUEIO EXPRESSO PARA ROAMING
    if (tipoBrisaP === "ROAMING" || tipoRelP === "ROAMING") {
      continue;
    }
   
    var exigeSME = false;
    if (tipoBrisaP === "SMP" && tipoRelP === "SMP" && operadoraP !== "SURF") exigeSME = true;
    if (tipoRelP === "LOCAL") exigeSME = true;
   
    if (celulaEstaVazia(valorColunaI) && mesCodP.length === 6) {
      var regra = encontrarRegra(tipoBrisaP, operadoraP, tipoRelP);
     
      if (regra) {
       
        var queryBusca = gerarQueryGmail(regra.assunto, mesCodP);
       
        try {
          var threads = GmailApp.search(queryBusca, 0, 15);
          var achouEmailValido = false;
         
          for (var t = 0; t < threads.length; t++) {
            if(achouEmailValido) break;
            var mensagens = threads[t].getMessages();
            for (var m = 0; m < mensagens.length; m++) {
              var subjectEmail = mensagens[m].getSubject();
              var subjectEmailLimpo = limparTextoBusca(subjectEmail);
              var assuntoEsperadoLimpo = limparTextoBusca(regra.assunto);
             
              if (subjectEmailLimpo.includes(assuntoEsperadoLimpo)) {
                achouEmailValido = true;
                var anexos = mensagens[m].getAttachments();
                for (var a = 0; a < anexos.length; a++) {
                  var anexo = anexos[a];
                  var nomeAnexo = anexo.getName().toUpperCase();
                  if (nomeAnexo.startsWith('NF') || nomeAnexo.endsWith('.PDF')) continue;
                 
                  if (nomeAnexo.endsWith('.ZIP')) {
                    var descompactados = Utilities.unzip(anexo);
                    for(var u=0; u < descompactados.length; u++) {
                      salvarArquivoNaPastaCorreta(descompactados[u], pastaRtf, pastaCsv, pastaXls);
                    }
                  } else {
                    salvarArquivoNaPastaCorreta(anexo, pastaRtf, pastaCsv, pastaXls);
                  }
                }
                Utilities.sleep(1000);
                break;
              }
            }
          }
        } catch(erroGmail) {}
       
        var arquivosExistentes = buscarArquivosNoDrive(mesCodP, regra, exigeSME, pastaCsv, pastaXls);
        var valorCalculado = 0;
        var achouArquivo = false;
       
        if (arquivosExistentes.length > 0) {
          achouArquivo = true;
          for (var a = 0; a < arquivosExistentes.length; a++) {
            var conteudoTexto = decodificarArquivo(arquivosExistentes[a].getBlob());
            if (conteudoTexto) {
               valorCalculado += calcularSomaArquivo(conteudoTexto);
            }
          }
        }
       
        if (!achouArquivo || valorCalculado === 0) {
           var rtfValor = extrairValorDoRTF(pastaRtf, mesCodP, regra, exigeSME);
           if (rtfValor !== null) {
              valorCalculado = rtfValor;
              achouArquivo = true;
           }
        }
       
        if (achouArquivo) {
          aba.getRange(i + 1, 9).setValue(valorCalculado);
          contadorPreenchidos++;
        }
      }
    }
  }
  SpreadsheetApp.getUi().alert("Processamento Concluído!\n\nForam processadas e preenchidas " + contadorPreenchidos + " linha(s) pendentes.");
}


// ==============================================================================
// GERAÇÃO DE QUERY DO GMAIL
// ==============================================================================
function gerarQueryGmail(assunto, mesCod) {
  if (!mesCod || !assunto) return "";
 
  var strMes = String(mesCod).trim().replace(/[^0-9]/g, '');
  if (strMes.length < 6) return "";


  var ano = strMes.substring(0, 4);
  var mesNum = parseInt(strMes.substring(4, 6), 10);
  var mesesNomes = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
  var nomeMes = mesesNomes[mesNum - 1];
 
  var assuntoLimpo = assunto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]/g, " ");
  var palavras = assuntoLimpo.split(/\s+/);
  var query = "";
 
  for (var p = 0; p < palavras.length; p++) {
     if (palavras[p].length > 1 || palavras[p].toUpperCase() === "OI") {
        query += "subject:(" + palavras[p] + ") ";
     }
  }
  query += "subject:(" + nomeMes + ") " + ano + " has:attachment";
  return query;
}


// ==============================================================================
// EXTRATOR DO RTF
// ==============================================================================
function extrairValorDoRTF(pastaRtf, mesCod, regra, exigeSME) {
  try {
    var arquivos = pastaRtf.getFiles();
    while (arquivos.hasNext()) {
      var arq = arquivos.next();
      var nome = arq.getName().toUpperCase();
     
      if (testarMes(nome, mesCod) && !arq.isTrashed()) {
         if (validarArquivoParaRegra(nome, regra, exigeSME)) {
             var texto = arq.getBlob().getDataAsString("UTF-8");
             var match = texto.match(/R\$\s*([\d\.]+,[\d]{2})/);
             if (match) {
                var valorFinal = parseFloat(match[1].replace(/\./g, '').replace(',', '.'));
                if (!isNaN(valorFinal)) return valorFinal;
             }
         }
      }
    }
  } catch(e) {}
  return null;
}


// ==============================================================================
// CÁLCULO DIRETO DO CSV TURBINADO
// ==============================================================================
function calcularSomaArquivo(textoConteudo) {
  var linhas = textoConteudo.split(/\r?\n/);
  var somaTotal = 0;
  var achouLinhaValida = false;
 
  for (var i = 0; i < linhas.length; i++) {
    var linha = linhas[i].trim();
    if (linha === "") continue;
   
    var colunas = linha.split(';');
    if (colunas.length >= 15) {
      var tipoRelatorio = colunas[5] ? String(colunas[5]).replace(/['"]/g, '').trim() : "";
      var tipoLimpo = tipoRelatorio.split(/[A-Za-z\s]+/)[0];
      if (tipoLimpo === "0" || tipoLimpo === "00") {
         var valorTexto = colunas[14] ? String(colunas[14]).replace(/['"]/g, '').trim() : "0";
         var valorNumero = parseFloat(valorTexto.replace(/\./g, '').replace(',', '.'));
         if (!isNaN(valorNumero)) {
            somaTotal += valorNumero;
            achouLinhaValida = true;
         }
      }
    }
  }
 
  if (!achouLinhaValida || somaTotal === 0) {
     somaTotal = 0;
     for (var i = 0; i < linhas.length; i++) {
        var linha = linhas[i].trim();
        if (linha === "") continue;
        var colunas = linha.split(';');
        if (colunas.length >= 15) {
           var tipoRegistro = String(colunas[0]).replace(/['"]/g, '').trim();
           if (tipoRegistro === "10" || tipoRegistro === "20" || tipoRegistro === "30") {
              var valorTexto = colunas[14] ? String(colunas[14]).replace(/['"]/g, '').trim() : "0";
              var valorNumero = parseFloat(valorTexto.replace(/\./g, '').replace(',', '.'));
              if (!isNaN(valorNumero)) somaTotal += valorNumero;
           }
        }
     }
  }
  return somaTotal;
}


// ==============================================================================
// FILTRO DE VALIDAÇÃO GERAL
// ==============================================================================
function validarArquivoParaRegra(nomeArq, regra, exigeSME) {
  var nomeLimpo = nomeArq.toUpperCase().replace(/[-_\s\.]/g, "");
  var assLimpo = regra.assunto.toUpperCase().replace(/[-_\s\.]/g, "");
 
  var isFileSME = nomeLimpo.includes("SME") || nomeLimpo.includes("HOME") || nomeLimpo.includes("LOCAL");
  if (exigeSME) {
      if (!isFileSME) return false;
      var op = regra.operadora.toUpperCase().replace(/[-_\s\.]/g, "");
      if (op === "VIVO" && !nomeLimpo.includes("VIVO") && !nomeLimpo.includes("TELEFONICA")) return false;
      if (op === "CLARO" && !nomeLimpo.includes("CLARO")) return false;
      if (op === "TIM" && !nomeLimpo.includes("TIM")) return false;
      return true;
  } else {
      if (isFileSME) return false;
  }
 
  var isRuleMovelOwner = assLimpo.includes("BRISANETMOVEL");
  var isFileMovelOwner = nomeLimpo.includes("BRISANETMOVEL");
  if (isRuleMovelOwner !== isFileMovelOwner) return false;
 
  var isRuleFixa = assLimpo.includes("FIXA");
  var isFileFixa = nomeLimpo.includes("FIXA");
  if (isRuleFixa !== isFileFixa) return false;


  var isRuleSMS = assLimpo.includes("SMS");
  var isFileSMS = nomeLimpo.includes("SMS");
  if (isRuleSMS !== isFileSMS) return false;
 
  var parts = regra.assunto.split('-');
  if (parts.length > 1) {
      var partnerStr = parts[1].toUpperCase().replace(/[-_\s\.]/g, "");
      if (!nomeLimpo.includes(partnerStr)) return false;
  } else {
      var op = regra.operadora.toUpperCase().replace(/[-_\s\.]/g, "");
      if (!nomeLimpo.includes(op)) return false;
  }
 
  return true;
}


// ==============================================================================
// VERIFICADOR DE MÊS
// ==============================================================================
function testarMes(nome, mesCod) {
   var tag1 = "_" + mesCod + "_";
   var tag2 = "_" + mesCod + ".";
   return nome.includes(tag1) || nome.includes(tag2);
}


// ==============================================================================
// SALVAMENTO E HIGIENIZAÇÃO DE ARQUIVOS NO DRIVE
// ==============================================================================
function salvarArquivoNaPastaCorreta(arq, pastaRtf, pastaCsv, pastaXls) {
  var nomeArq = arq.getName().toUpperCase();
 
  if (nomeArq.endsWith('.RTF')) {
    salvarSeNaoExistir(pastaRtf, arq);
  } else if (nomeArq.endsWith('.CSV')) {
    var arquivoHigienizado = higienizarCsvGeral(arq);
    salvarSeNaoExistir(pastaCsv, arquivoHigienizado);
  } else if (nomeArq.endsWith('.XLS') || nomeArq.endsWith('.XLSX')) {
    salvarSeNaoExistir(pastaXls, arq);
  }
}


// ==============================================================================
// FAXINA DE PONTOS DE MILHAR NO CSV
// ==============================================================================
function higienizarCsvGeral(blobArq) {
  var nome = blobArq.getName();
  var conteudoOriginal = decodificarArquivo(blobArq);
 
  if (!conteudoOriginal) return blobArq;


  var linhas = conteudoOriginal.split(/\r?\n/);
  var novoConteudo = [];
  var alterouAlgo = false;


  for (var i = 0; i < linhas.length; i++) {
    var linha = linhas[i];
    if (linha.trim() === "") {
      novoConteudo.push(linha);
      continue;
    }
   
    var colunas = linha.split(';');
   
    if (colunas.length >= 15) {
      var valorTexto = String(colunas[14]).trim();
     
      if (valorTexto.includes('.') && valorTexto.includes(',')) {
        colunas[14] = valorTexto.replace(/\./g, '');
        linha = colunas.join(';');
        alterouAlgo = true;
      }
    }
    novoConteudo.push(linha);
  }


  if (alterouAlgo) {
    var stringCorrigida = novoConteudo.join('\r\n');
    return Utilities.newBlob(stringCorrigida, 'text/csv', nome);
  }
 
  return blobArq;
}


// ==============================================================================
// FUNÇÕES AUXILIARES DE DRIVE E LEITURA
// ==============================================================================
function decodificarArquivo(blob) {
  try {
    var bytes = blob.getBytes();
    if (bytes.length > 1 && bytes[0] === -1 && bytes[1] === -2) return blob.getDataAsString("UTF-16LE");
    if (bytes.length > 1 && bytes[0] === -2 && bytes[1] === -1) return blob.getDataAsString("UTF-16BE");
   
    var conteudo = blob.getDataAsString("UTF-8");
    if (!conteudo || conteudo.indexOf(';') === -1) {
       conteudo = blob.getDataAsString("ISO-8859-1");
    }
    return conteudo;
  } catch(e) { return ""; }
}


function buscarArquivosNoDrive(mesCod, regra, exigeSME, pastaCsv, pastaXls) {
  var resultados = [];
  try {
    var arquivosCsv = pastaCsv.getFiles();
    while (arquivosCsv.hasNext()) {
      var arq = arquivosCsv.next();
      var nome = arq.getName().toUpperCase();
      if (testarMes(nome, mesCod) && !arq.isTrashed()) {
         if (validarArquivoParaRegra(nome, regra, exigeSME)) resultados.push(arq);
      }
    }
  } catch(e) {}
 
  if (resultados.length > 0) return resultados;
 
  try {
    var arquivosXls = pastaXls.getFiles();
    while (arquivosXls.hasNext()) {
      var arq = arquivosXls.next();
      var nome = arq.getName().toUpperCase();
      if (testarMes(nome, mesCod) && !arq.isTrashed()) {
         if (validarArquivoParaRegra(nome, regra, exigeSME)) resultados.push(arq);
      }
    }
  } catch(e) {}
  return resultados;
}


function salvarSeNaoExistir(pasta, blobArq) {
  try {
    var nome = blobArq.getName();
    var arquivos = pasta.getFilesByName(nome);
    var existe = false;
    while(arquivos.hasNext()) {
       var f = arquivos.next();
       if (!f.isTrashed()) { existe = true; break; }
    }
    if (!existe) pasta.createFile(blobArq);
  } catch(e) {}
}


function limparTextoBusca(texto) {
  return texto.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[\s\-\/\_\.]/g, '');
}


function celulaEstaVazia(val) {
  if (val === null || val === undefined || val === "") return true;
  var str = String(val).trim().toUpperCase();
  return (str === "" || str === "R$ 0,00" || str === "R$ 0.00" || str === "0" || str === "0,00" || str === "0.00");
}


function encontrarRegra(tipoBrisa, operadora, tipoRel) {
  for (var r = 0; r < MAPA_OPERADORAS.length; r++) {
    var op = MAPA_OPERADORAS[r];
    if (op.tipoBrisa === tipoBrisa && op.operadora === operadora && op.tipoRel === tipoRel) return op;
  }
  return null;
}