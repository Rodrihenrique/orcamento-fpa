function buscarDadosDetrafV3() {
  var urlOrigem = "https://docs.google.com/spreadsheets/d/1A6mvX9mvt4wuoJByg-5Uyuc6zssyoaEsrx0viVNnrFM/edit";
  var ssOrigem = SpreadsheetApp.openByUrl(urlOrigem);
 
  // ==========================================
  // 1. BUSCA DADOS STFC E SMP
  // ==========================================
  var abaOrigem1 = ssOrigem.getSheetByName("Controle - DETRAF E DEROAM");
  // O getRange precisa ir até a coluna V para capturar a data
  var dados1 = abaOrigem1.getRange("A:V").getValues();
 
  var resultadosSTFC = [];
  var resultadosSMP = [];
 
  for (var i = 0; i < dados1.length; i++) {
    var linha = dados1[i];
    var tipo = linha[1]; // Col B
   
    if (tipo === "STFC" || tipo === "SMP") {
      var operadora = linha[2];  // Col C
      var bk = linha[4];         // Col E (B&K)
      var periodo = linha[6];    // Col G
      var valorNormal = linha[8];// Col I
      var valorBk = linha[10];   // Col K
      var nf = linha[20];        // Col U
      var dataFat = linha[21];   // Col V (Índice 21 - Data de Faturamento)
     
      var valorFinal = (bk === "B&K") ? valorBk : valorNormal;
     
      var linhaMontada = [operadora, periodo, valorFinal, nf, dataFat];
     
      if (tipo === "STFC") resultadosSTFC.push(linhaMontada);
      if (tipo === "SMP") resultadosSMP.push(linhaMontada);
    }
  }
 
  // ==========================================
  // 2. BUSCA DADOS BROKERS
  // ==========================================
  var abaOrigem2 = ssOrigem.getSheetByName("BROKER - SMS");
  // O getRange precisa ir até a coluna Q para capturar a data
  var dados2 = abaOrigem2.getRange("A:Q").getValues();
 
  var resultadosBroker = [];
 
  for (var j = 0; j < dados2.length; j++) {
    var linhaB = dados2[j];
    var tipoB = linhaB[1];
   
    if (tipoB === "SMS") {
      var broker = linhaB[0];  
      var periodoB = linhaB[3];
      var valorB = linhaB[5];  
      var nfB = linhaB[10];    
      var dataFatB = linhaB[16]; // Col Q (Índice 16 - Data)
     
      resultadosBroker.push([broker, periodoB, valorB, nfB, dataFatB]);
    }
  }
 
  // ==========================================
  // 3. CONSTRUÇÃO DO LAYOUT NA ABA ATUAL
  // ==========================================
  var ssDestino = SpreadsheetApp.getActiveSpreadsheet();
  var abaDestino = ssDestino.getSheetByName("DADOS PARA FATURAMENTO");
 
  abaDestino.setFrozenRows(2);
  var corFundo = "#0A2B4E";
 
  // Limpa os cabeçalhos (ajustado para ir até a coluna Q para suportar as 5 colunas do broker)
  abaDestino.getRange("A1:Q1").clearFormat().clearContent();
 
  // Layout alargado com 5 colunas para cada seção
  abaDestino.getRange("A1:E1").merge().setValue("BRISANET STFC").setBackground(corFundo).setFontColor("white").setFontWeight("bold").setHorizontalAlignment("center");
  abaDestino.getRange("G1:K1").merge().setValue("BRISANET SMP").setBackground(corFundo).setFontColor("white").setFontWeight("bold").setHorizontalAlignment("center");
  abaDestino.getRange("M1:Q1").merge().setValue("BRISANET BROKERS").setBackground(corFundo).setFontColor("white").setFontWeight("bold").setHorizontalAlignment("center");
 
  var cabecalho5 = [["OPERADORA", "PER. DO TRÁF", "BRISANET", "NF BRISANET", "DATA FAT."]];
  var cabecalhoBroker = [["BROKER", "PER. DO TRÁF", "BRISANET", "NF BRISANET", "DATA FAT."]];
 
  abaDestino.getRange("A2:E2").setValues(cabecalho5).setBackground(corFundo).setFontColor("white").setFontWeight("bold").setHorizontalAlignment("center");
  abaDestino.getRange("G2:K2").setValues(cabecalho5).setBackground(corFundo).setFontColor("white").setFontWeight("bold").setHorizontalAlignment("center");
  abaDestino.getRange("M2:Q2").setValues(cabecalhoBroker).setBackground(corFundo).setFontColor("white").setFontWeight("bold").setHorizontalAlignment("center");
           
  abaDestino.setColumnWidth(6, 30);
  abaDestino.setColumnWidth(12, 30);
 
  // ==========================================
  // 4. INSERÇÃO DOS DADOS
  // ==========================================
  var ultimaLinha = abaDestino.getMaxRows();
  if (ultimaLinha > 2) {
    // Ajustado para limpar até a coluna Q
    abaDestino.getRange(3, 1, ultimaLinha - 2, 17).clearContent().clearFormat();
  }
 
  if (resultadosSTFC.length > 0) {
    abaDestino.getRange(3, 1, resultadosSTFC.length, 5).setValues(resultadosSTFC);
    abaDestino.getRange(3, 3, resultadosSTFC.length, 1).setNumberFormat("R$ #,##0.00");
    abaDestino.getRange(3, 5, resultadosSTFC.length, 1).setNumberFormat("dd/MM/yyyy");
  }
 
  if (resultadosSMP.length > 0) {
    abaDestino.getRange(3, 7, resultadosSMP.length, 5).setValues(resultadosSMP);
    abaDestino.getRange(3, 9, resultadosSMP.length, 1).setNumberFormat("R$ #,##0.00");
    abaDestino.getRange(3, 11, resultadosSMP.length, 1).setNumberFormat("dd/MM/yyyy");
  }
 
  if (resultadosBroker.length > 0) {
    // Inserindo 5 colunas para os Brokers
    abaDestino.getRange(3, 13, resultadosBroker.length, 5).setValues(resultadosBroker);
    abaDestino.getRange(3, 15, resultadosBroker.length, 1).setNumberFormat("R$ #,##0.00");
    abaDestino.getRange(3, 17, resultadosBroker.length, 1).setNumberFormat("dd/MM/yyyy");
  }
 
  // Ajuste do alinhamento centralizado
  var colunasCentralizadas = ["B", "D", "E", "H", "J", "K", "N", "P", "Q"];
  for (var c = 0; c < colunasCentralizadas.length; c++) {
    abaDestino.getRange(colunasCentralizadas[c] + "3:" + colunasCentralizadas[c]).setHorizontalAlignment("center");
  }
 
  SpreadsheetApp.getUi().alert("✅ O novo script V3 rodou e puxou as datas!");
}