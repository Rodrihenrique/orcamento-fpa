function doGet(e) {
  return ContentService.createTextOutput("API do Google Apps Script ativa!")
    .setMimeType(ContentService.MimeType.TEXT);
}


function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
   
    // 1. Obtém a aba "NF" (cria apenas se ela ainda não existir)
    var sheetNF = ss.getSheetByName("NF");
    if (!sheetNF) {
      sheetNF = ss.insertSheet("NF");
      sheetNF.appendRow(["Período", "Operadora", "Valor Total NF", "Arquivo", "Data Processamento"]);
      sheetNF.getRange("A1:E1").setFontWeight("bold");
    }


    // Trata e converte o valor numérico
    var valorNum = 0;
    if (data.valor && data.valor !== "Não encontrado") {
      valorNum = parseFloat(String(data.valor).replace(".", "").replace(",", "."));
    }


    // 2. Insere a nota lida na aba "NF"
    sheetNF.appendRow([
      data.periodo,
      data.operadora,
      valorNum,
      data.arquivo,
      new Date()
    ]);


    sheetNF.getRange(sheetNF.getLastRow(), 3).setNumberFormat("R$ #,##0.00");


    // 3. Soma as NFs e valida o status no DETRAF
    validarConciliacaoDetraf(ss, data.periodo, data.operadora);


    return ContentService.createTextOutput(JSON.stringify({
      "status": "success",
      "message": "Nota da " + data.operadora + " inserida na aba NF e validada!"
    })).setMimeType(ContentService.MimeType.JSON);


  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      "status": "error",
      "message": err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}


function validarConciliacaoDetraf(ss, periodo, operadora) {
  // Localiza a aba de controle existente
  var sheetDetraf = ss.getSheetByName("Controle - DETRAF E DEROAM") ||
                    ss.getSheetByName("Controle - DETRAF") ||
                    ss.getSheetByName("DETRAF");
  if (!sheetDetraf) return;


  var sheetNF = ss.getSheetByName("NF");
  var dadosNF = sheetNF.getDataRange().getValues();
 
  // 1. CALCULA A SOMA DAS NOTAS NA ABA "NF" PARA A OPERADORA E PERÍODO
  var somaNotas = 0;
  for (var i = 1; i < dadosNF.length; i++) {
    var p = String(dadosNF[i][0]);
    var op = String(dadosNF[i][1]);
    var val = parseFloat(dadosNF[i][2]) || 0;


    if (p === String(periodo) && op.toUpperCase() === String(operadora).toUpperCase()) {
      somaNotas += val;
    }
  }


  // 2. COMPARA A SOMA COM O VALOR DA ABA DE CONTROLE E DEFINE COMO "VALIDADO"
  var dadosDetraf = sheetDetraf.getDataRange().getValues();
  for (var j = 1; j < dadosDetraf.length; j++) {
    var periodoDetraf = String(dadosDetraf[j][0]);   // Coluna A: Período
    var operadoraDetraf = String(dadosDetraf[j][1]); // Coluna B: Operadora
    var valorEsperado = parseFloat(dadosDetraf[j][2]) || 0; // Coluna C: Valor Esperado


    if (periodoDetraf === String(periodo) && operadoraDetraf.toUpperCase() === String(operadora).toUpperCase()) {
      // Tolera até R$ 0.05 de variação de arredondamento
      if (Math.abs(somaNotas - valorEsperado) <= 0.05) {
        sheetDetraf.getRange(j + 1, 4).setValue("VALIDADO"); // Coluna D: Status
      } else {
        sheetDetraf.getRange(j + 1, 4).setValue("PENDENTE");
      }
      break;
    }
  }
}