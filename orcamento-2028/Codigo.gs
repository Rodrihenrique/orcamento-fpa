/**
 * ============================================================================
 * ORÇAMENTO 2028 - GERÊNCIA EXECUTIVA DE TELEFONIA (BRISANET TELECOM)
 * Arquivo: Codigo.gs
 * ============================================================================
 */

function doGet() {
  inicializarPlanilha();
  
  const template = HtmlService.createTemplateFromFile('Index');
  
  // Pré-carrega os dados salvos da planilha diretamente no template
  try {
    const custosSalvos = obterCustosSalvos();
    template.dadosIniciaisJSON = JSON.stringify(custosSalvos);
  } catch (e) {
    console.error("Erro ao pré-carregar custos na inicialização:", e);
    template.dadosIniciaisJSON = '[]';
  }

  return template
    .evaluate()
    .setTitle('brisanet - Orçamento 2028 | OPEX e CAPEX')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1.0')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/**
 * Garante que todas as abas necessárias existam com seus cabeçalhos corretos.
 */
function inicializarPlanilha() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const abas = ['DETRAF', 'OPEX_Dados', 'CAPEX_Dados', 'Premissas', 'Importacao'];
 
  abas.forEach(nomeAba => {
    let aba = ss.getSheetByName(nomeAba);
    if (!aba) {
      aba = ss.insertSheet(nomeAba);
    }
    
    // Se a aba estiver vazia, cria os cabeçalhos
    if (aba.getLastRow() === 0) {
      if (nomeAba === 'OPEX_Dados' || nomeAba === 'CAPEX_Dados') {
        aba.appendRow([
          'ID_Sistema', 'Data Última Modificação', 'Tipo', 'Setor', 'Pacote', 
          'Nome do Custo', 'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 
          'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez', 'Total'
        ]);
        aba.getRange(1, 1, 1, 19).setFontWeight('bold').setBackground('#F1F5F9');
      } else if (nomeAba === 'Importacao') {
        aba.appendRow([
          'Tipo', 'Setor', 'Pacote', 'Conta / Descricao', 
          'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 
          'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
        ]);
        aba.getRange(1, 1, 1, 16).setFontWeight('bold').setBackground('#F1F5F9');
      }
    }
  });
}

/**
 * Carrega todos os custos salvos nas abas OPEX_Dados e CAPEX_Dados.
 * Retorna uma lista de objetos estruturados prontos para renderização.
 */
function obterCustosSalvos() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const abaOpex = ss.getSheetByName('OPEX_Dados');
  const abaCapex = ss.getSheetByName('CAPEX_Dados');
  const dados = [];

  function extrairDadosAba(aba, tipoPadrao) {
    if (!aba) return;
    const dataRange = aba.getDataRange();
    const valores = dataRange.getValues();
    if (!valores || valores.length <= 1) return;

    for (let i = 1; i < valores.length; i++) {
      const row = valores[i];
      const id = String(row[0] || '').trim();
      const tipo = String(row[2] || tipoPadrao).trim().toUpperCase();
      const setor = String(row[3] || '').trim();
      const pacote = String(row[4] || '').trim();
      const nomeCusto = String(row[5] || '').trim();

      // Pula linhas sem nome de custo
      if (!nomeCusto) continue;

      const meses = [];
      for (let j = 6; j < 18; j++) {
        let val = parseFloat(row[j]);
        meses.push(isNaN(val) ? '0.00' : val.toFixed(2));
      }
      
      let total = parseFloat(row[18]);
      if (isNaN(total)) {
        total = meses.reduce((acc, curr) => acc + parseFloat(curr), 0);
      }

      dados.push({
        id: id || ('ID_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)),
        tipo: tipo,
        setor: setor,
        pacote: pacote,
        nomeCusto: nomeCusto,
        meses: meses,
        total: total,
        isSaved: true
      });
    }
  }

  extrairDadosAba(abaOpex, 'OPEX');
  extrairDadosAba(abaCapex, 'CAPEX');

  return dados;
}

/**
 * Salva ou atualiza os lançamentos de custos nas abas correspondentes (OPEX_Dados ou CAPEX_Dados).
 */
function salvarCustos(dados) {
  if (!dados || !Array.isArray(dados) || dados.length === 0) {
    return { success: false, message: "Nenhum dado recebido para salvar." };
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const abaOpex = ss.getSheetByName('OPEX_Dados');
  const abaCapex = ss.getSheetByName('CAPEX_Dados');
  const dataAtual = new Date();

  function processarAba(aba, listaLinhas) {
    if (!aba || listaLinhas.length === 0) return;

    const dataRange = aba.getDataRange();
    const valores = dataRange.getValues();
    
    // Mapeia IDs existentes para seus números de linha (1-based)
    const mapIdLinha = {};
    for (let i = 1; i < valores.length; i++) {
      const idExistente = String(valores[i][0]).trim();
      if (idExistente) {
        mapIdLinha[idExistente] = i + 1;
      }
    }

    const linhasParaInserir = [];

    listaLinhas.forEach(linha => {
      const rowData = [
        linha.id,
        dataAtual,
        linha.tipo,
        linha.setor,
        linha.pacote,
        linha.nomeCusto,
        parseFloat(linha.meses[0]) || 0,
        parseFloat(linha.meses[1]) || 0,
        parseFloat(linha.meses[2]) || 0,
        parseFloat(linha.meses[3]) || 0,
        parseFloat(linha.meses[4]) || 0,
        parseFloat(linha.meses[5]) || 0,
        parseFloat(linha.meses[6]) || 0,
        parseFloat(linha.meses[7]) || 0,
        parseFloat(linha.meses[8]) || 0,
        parseFloat(linha.meses[9]) || 0,
        parseFloat(linha.meses[10]) || 0,
        parseFloat(linha.meses[11]) || 0,
        parseFloat(linha.total) || 0
      ];

      const rowIndex = mapIdLinha[linha.id];
      if (rowIndex) {
        aba.getRange(rowIndex, 1, 1, rowData.length).setValues([rowData]);
      } else {
        linhasParaInserir.push(rowData);
      }
    });

    if (linhasParaInserir.length > 0) {
      aba.getRange(aba.getLastRow() + 1, 1, linhasParaInserir.length, 19).setValues(linhasParaInserir);
    }
  }

  const linhasOpex = dados.filter(d => String(d.tipo).toUpperCase() === 'OPEX');
  const linhasCapex = dados.filter(d => String(d.tipo).toUpperCase() === 'CAPEX');

  processarAba(abaOpex, linhasOpex);
  processarAba(abaCapex, linhasCapex);

  return { success: true, message: "Orçamento salvo e sincronizado com sucesso na planilha!" };
}

/**
 * Obtém dados da aba 'Importacao' para um setor e tipo específicos.
 */
function obterDadosImportacao(setorFiltro, tipoFiltro) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const aba = ss.getSheetByName('Importacao');
  if (!aba) return [];

  const valores = aba.getDataRange().getValues();
  if (valores.length <= 1) return [];

  const dadosFormatados = [];

  for (let i = 1; i < valores.length; i++) {
    const linha = valores[i];
    const tipo = String(linha[0] || '').trim().toUpperCase();
    const setor = String(linha[1] || '').trim();
    const pacote = String(linha[2] || '').trim();
    const nomeCusto = String(linha[3] || '').trim().toUpperCase();

    if (tipo === String(tipoFiltro).trim().toUpperCase() && 
        setor.toLowerCase() === String(setorFiltro).trim().toLowerCase() && 
        nomeCusto) {
      const meses = [];
      for (let j = 4; j < 16; j++) {
        let val = parseFloat(linha[j]);
        meses.push(isNaN(val) ? '0.00' : val.toFixed(2));
      }
      dadosFormatados.push({ tipo, setor, pacote, nomeCusto, meses });
    }
  }
  return dadosFormatados;
}
