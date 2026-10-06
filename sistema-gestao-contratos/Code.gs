/**
 * ============================================================================
 * SISTEMA DE GESTÃO E ACOMPANHAMENTO DE CONTRATOS - BRISANET
 * Google Apps Script - Backend (Code.gs)
 * ============================================================================
 */

// Configurações Globais
var CONFIG = {
  // ID da Planilha Principal
  SPREADSHEET_ID: '1HUIi3NBEp4N-fJqByEKC_ZFRAqMi82sVk670ry0MZ6I',
  // Linha inicial obrigatória para inserção de novos contratos
  MIN_DATA_ROW: 18,
  // GID da aba de Cadastro (padrão)
  SHEET_GID: '531593901',
  // Nomes possíveis para a aba de cadastro (com prioridade)
  TARGET_SHEET_NAMES: [
    'Cadastro Contratos',
    'Cadastro e memória de cálculo dos contratos',
    'Cadastro de Contratos',
    'Cadastro'
  ],
  // Nome da aba de logs de alterações
  LOG_SHEET_NAME: 'Histórico de Alterações',
  // Nome da pasta raiz no Google Drive para os arquivos anexados
  DRIVE_FOLDER_NAME: 'Contratos - Anexos',
  // Prefixo para protocolo formatado
  PROTOCOL_PREFIX: 'BRISA-CON'
};

/**
 * Ponto de entrada do Web App
 */
function doGet(e) {
  var template = HtmlService.createTemplateFromFile('Index');
  return template.evaluate()
    .setTitle('Painel de Contratos | Gestão de Fornecedores')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1.0')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * Cria menu personalizado na planilha quando aberta no Google Sheets
 */
function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('Gestão de Contratos')
    .addItem('Abrir Painel no Navegador (Web)', 'abrirLinkWebApp')
    .addItem('Abrir Formulário (Modal)', 'abrirModalContratos')
    .addItem('Abrir Painel Lateral (Sidebar)', 'abrirSidebarContratos')
    .addSeparator()
    .addItem('Verificar Aba de Contratos Detectada', 'verificarAbaDetectada')
    .addItem('Abrir Pasta de Anexos no Drive', 'abrirPastaAnexosDrive')
    .addItem('Configurar / Verificar Pasta do Drive', 'configurarPastaDrive')
    .addToUi();
}

/**
 * Diagnóstico para o usuário conferir qual aba e linha estão ativas na planilha
 */
function verificarAbaDetectada() {
  var ss = obterPlanilha_();
  var sheet = obterAbaContratos_();
  var headerRow = obterLinhaCabecalho_(sheet);
  var lastRow = sheet.getLastRow();
  var ui = SpreadsheetApp.getUi();

  ui.alert(
    'Diagnóstico da Planilha',
    'Planilha: ' + ss.getName() + '\n' +
    'Aba de Contratos: "' + sheet.getName() + '" (GID: ' + sheet.getSheetId() + ')\n' +
    'Linha de Cabeçalho: ' + headerRow + '\n' +
    'Última Linha: ' + lastRow + '\n\n' +
    'Os novos contratos serão inseridos diretamente nesta aba.',
    ui.ButtonSet.OK
  );
}

/**
 * Abre o formulário em janela modal dentro do Google Sheets
 */
function abrirModalContratos() {
  var html = HtmlService.createTemplateFromFile('Index').evaluate()
    .setWidth(1200)
    .setHeight(800)
    .setTitle('Painel de Contratos | Gestão de Fornecedores');
  SpreadsheetApp.getUi().showModalDialog(html, 'Painel de Contratos');
}

/**
 * Abre o formulário na barra lateral do Google Sheets
 */
function abrirSidebarContratos() {
  var html = HtmlService.createTemplateFromFile('Index').evaluate()
    .setTitle('Painel de Contratos');
  SpreadsheetApp.getUi().showSidebar(html);
}

/**
 * Exibe o link do Web App publicado
 */
function abrirLinkWebApp() {
  var url = ScriptApp.getService().getUrl();
  var ui = SpreadsheetApp.getUi();
  if (url) {
    var html = HtmlService.createHtmlOutput(
      '<div style="font-family:sans-serif;padding:16px;">' +
      '<p>Acesse o sistema diretamente pelo link:</p>' +
      '<p><a href="' + url + '" target="_blank" style="color:#1d4ed8;font-weight:bold;">' + url + '</a></p>' +
      '</div>'
    ).setWidth(500).setHeight(150);
    ui.showModalDialog(html, 'Link do Sistema Web');
  } else {
    ui.alert(
      'Sistema não publicado',
      'Para obter o link público, publique o projeto em: Implantar > Nova Implantação > Tipo: App da Web.',
      ui.ButtonSet.OK
    );
  }
}

/**
 * Abre diretamente a pasta de anexos do Drive
 */
function abrirPastaAnexosDrive() {
  var folder = obterOuCriarPastaAnexos_();
  var url = folder.getUrl();
  var html = HtmlService.createHtmlOutput(
    '<div style="font-family:sans-serif;padding:16px;">' +
    '<p>Pasta de Anexos do Google Drive:</p>' +
    '<p><a href="' + url + '" target="_blank" style="color:#1d4ed8;font-weight:bold;">Abrir Pasta no Google Drive</a></p>' +
    '</div>'
  ).setWidth(400).setHeight(130);
  SpreadsheetApp.getUi().showModalDialog(html, 'Pasta de Anexos');
}

/**
 * Garante a criação da pasta e salva no ScriptProperties
 */
function configurarPastaDrive() {
  var folder = obterOuCriarPastaAnexos_();
  var ui = SpreadsheetApp.getUi();
  ui.alert(
    'Pasta de Anexos Pronta',
    'A pasta "' + folder.getName() + '" foi verificada com sucesso no Google Drive.\nURL: ' + folder.getUrl(),
    ui.ButtonSet.OK
  );
}

/**
 * Obtém a planilha ativa ou abre pelo ID configurado
 */
function obterPlanilha_() {
  try {
    var activeSs = SpreadsheetApp.getActiveSpreadsheet();
    if (activeSs) {
      // Salvar ID da planilha ativa para uso no Web App independente
      try {
        PropertiesService.getScriptProperties().setProperty('ACTIVE_SPREADSHEET_ID', activeSs.getId());
      } catch (pe) {}
      return activeSs;
    }
  } catch (e) {
    // Caso executado fora do contexto da planilha
  }

  var props = PropertiesService.getScriptProperties();
  var savedId = props.getProperty('ACTIVE_SPREADSHEET_ID');
  if (savedId) {
    try {
      return SpreadsheetApp.openById(savedId);
    } catch (e) {}
  }

  return SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
}

/**
 * Localiza a aba correta de cadastro de contratos através de validação rigorosa de cabeçalhos
 */
function obterAbaContratos_() {
  var ss = obterPlanilha_();
  var sheets = ss.getSheets();

  // 1. Prioridade Máxima: Procurar aba pelo cabeçalho oficial que contém "fornecedor" e ("objeto" ou "cnpj" ou "id")
  for (var j = 0; j < sheets.length; j++) {
    var s = sheets[j];
    var maxRowsToCheck = Math.min(s.getLastRow(), 20);
    if (maxRowsToCheck >= 1) {
      var headerValues = s.getRange(1, 1, maxRowsToCheck, Math.min(s.getLastColumn(), 35)).getValues();
      for (var r = 0; r < headerValues.length; r++) {
        var rowText = headerValues[r].map(function(cell) { return String(cell).toLowerCase().trim(); });
        var hasFornecedor = rowText.some(function(col) { return col.indexOf('fornecedor') !== -1; });
        var hasObjeto = rowText.some(function(col) { return col.indexOf('objeto') !== -1; });
        var hasCnpj = rowText.some(function(col) { return col.indexOf('cnpj') !== -1; });
        var hasCentroCusto = rowText.some(function(col) { return col.indexOf('centro de custo') !== -1; });

        // A aba de contratos possui obrigatoriamente Fornecedor e (Objeto ou CNPJ ou Centro de Custo)
        if (hasFornecedor && (hasObjeto || hasCnpj || hasCentroCusto)) {
          return s;
        }
      }
    }
  }

  // 2. Procurar pelos nomes conhecidos da aba de cadastro
  for (var k = 0; k < CONFIG.TARGET_SHEET_NAMES.length; k++) {
    var sheet = ss.getSheetByName(CONFIG.TARGET_SHEET_NAMES[k]);
    if (sheet) return sheet;
  }

  // 3. Procurar por qualquer aba cujo nome contenha "cadastro"
  for (var m = 0; m < sheets.length; m++) {
    var nameLower = sheets[m].getName().toLowerCase();
    if (nameLower.indexOf('cadastro') !== -1) {
      return sheets[m];
    }
  }

  // 4. Fallback seguro
  return sheets[0];
}

/**
 * Localiza a linha do cabeçalho na aba de cadastro
 */
function obterLinhaCabecalho_(sheet) {
  var maxCheck = Math.min(sheet.getLastRow(), 20);
  if (maxCheck < 1) return 1;

  var values = sheet.getRange(1, 1, maxCheck, Math.min(sheet.getLastColumn(), 32)).getValues();
  for (var r = 0; r < values.length; r++) {
    var rowText = values[r].map(function(c) { return String(c).toLowerCase().trim(); });
    var hasId = rowText.some(function(c) { return c === 'id' || c.indexOf('id') !== -1; });
    var hasFornecedor = rowText.some(function(c) { return c.indexOf('fornecedor') !== -1; });
    var hasObjeto = rowText.some(function(c) { return c.indexOf('objeto') !== -1; });
    if (hasFornecedor && (hasObjeto || hasId)) {
      return r + 1; // 1-indexado
    }
  }
  return 1;
}

/**
 * Obtém ou cria a pasta de anexos no Google Drive
 */
function obterOuCriarPastaAnexos_() {
  var props = PropertiesService.getScriptProperties();
  var savedFolderId = props.getProperty('CONTRACTS_ATTACHMENT_FOLDER_ID');

  if (savedFolderId) {
    try {
      var folder = DriveApp.getFolderById(savedFolderId);
      if (folder && !folder.isTrashed()) {
        return folder;
      }
    } catch (e) {
      // ID inválido ou pasta excluída, recriar
    }
  }

  // Buscar pasta existente com o nome
  var folders = DriveApp.getFoldersByName(CONFIG.DRIVE_FOLDER_NAME);
  if (folders.hasNext()) {
    var existingFolder = folders.next();
    props.setProperty('CONTRACTS_ATTACHMENT_FOLDER_ID', existingFolder.getId());
    return existingFolder;
  }

  // Criar nova pasta
  var newFolder = DriveApp.createFolder(CONFIG.DRIVE_FOLDER_NAME);
  newFolder.setDescription('Pasta de armazenamento de contratos e documentos anexados via Sistema de Gestão de Contratos.');
  props.setProperty('CONTRACTS_ATTACHMENT_FOLDER_ID', newFolder.getId());
  return newFolder;
}

/**
 * Obtém os dados iniciais para carregar a interface (Next ID, Estatísticas, Lista, Opções)
 */
function getInitialData() {
  try {
    var sheet = obterAbaContratos_();
    var headerRow = obterLinhaCabecalho_(sheet);
    var lastRow = sheet.getLastRow();
    var folder = obterOuCriarPastaAnexos_();
    var userEmail = '';

    try {
      userEmail = Session.getActiveUser().getEmail();
      if (!userEmail) {
        userEmail = Session.getEffectiveUser().getEmail();
      }
    } catch (e) {
      userEmail = 'usuario.compras@grupobrisanet.com.br';
    }

    if (!userEmail) {
      userEmail = 'usuario.compras@grupobrisanet.com.br';
    }

    var contracts = [];
    var maxId = 0;
    var centrosCusto = {};
    var categorias = {};
    var fornecedores = {};
    var contasContabeis = {};
    var gerentes = {};
    var administrativos = {};

    var totalContratos = 0;
    var contratosAtivos = 0;
    var contratosRiscoAlto = 0;
    var somaValorMensal = 0;

    if (lastRow > headerRow) {
      var numRows = lastRow - headerRow;
      // Ler colunas de A (1) a AF (32)
      var range = sheet.getRange(headerRow + 1, 1, numRows, 32);
      var values = range.getValues();

      for (var i = 0; i < values.length; i++) {
        var row = values[i];
        var rawId = row[0];
        var fornecedor = String(row[3] || '').trim();

        // Ignorar linhas vazias
        if (!rawId && !fornecedor) continue;

        var numId = parseInt(rawId, 10);
        if (!isNaN(numId) && numId > maxId) {
          maxId = numId;
        }

        var status = String(row[9] || '').trim();
        var risco = String(row[28] || '').trim();
        var valorLancamento = parseFloat(row[14]) || 0;
        var valorOrçado = parseFloat(row[25]) || valorLancamento;

        totalContratos++;
        if (status.toLowerCase() === 'ativo') {
          contratosAtivos++;
        }
        if (risco.toLowerCase() === 'alto') {
          contratosRiscoAlto++;
        }
        somaValorMensal += valorLancamento;

        // Coletar opções para autocomplete
        if (row[1]) centrosCusto[String(row[1]).trim()] = true;
        if (row[2]) categorias[String(row[2]).trim()] = true;
        if (row[3]) fornecedores[String(row[3]).trim()] = true;
        if (row[6]) gerentes[String(row[6]).trim()] = true;
        if (row[7]) administrativos[String(row[7]).trim()] = true;
        if (row[26]) contasContabeis[String(row[26]).trim()] = true;

        var protocol = formatarProtocolo_(rawId);

        contracts.push({
          rowNumber: headerRow + 1 + i,
          id: rawId,
          protocol: protocol,
          centroCusto: row[1] || '',
          categoria: row[2] || '',
          fornecedor: row[3] || '',
          cnpj: row[4] || '',
          objeto: row[5] || '',
          gerente: row[6] || '',
          administrativo: row[7] || '',
          tipo: row[8] || '',
          status: status || 'Ativo',
          inicioVigencia: formatarDataExibicao_(row[10]),
          fimVigencia: formatarDataExibicao_(row[11]),
          renovacaoAutomatica: row[12] || 'Não',
          moeda: row[13] || 'BRL',
          valorLancamento: valorLancamento,
          periodicidade: row[15] || 'Mensal',
          primeiraCompetencia: formatarDataExibicao_(row[16]),
          dataReajuste: formatarDataExibicao_(row[17]),
          indice: row[18] || '',
          reajusteManual: row[19] || '',
          reajusteAplicado: row[20] || '',
          impostos: row[21] || '',
          taxaCambio: row[22] || 1,
          valorBaseBRL: row[23] || valorLancamento,
          contingencia: row[24] || '',
          valorOrcado: valorOrçado,
          contaContabil: row[26] || '',
          contratoPo: row[27] || '',
          risco: risco || 'Baixo',
          descricaoRisco: row[29] || '',
          memoriaCalculo: row[30] || '',
          observacoes: row[31] || ''
        });
      }
    }

    var nextId = maxId > 0 ? (maxId + 1) : 1;
    var nextProtocol = formatarProtocolo_(nextId);

    return {
      success: true,
      nextId: nextId,
      nextProtocol: nextProtocol,
      userEmail: userEmail,
      spreadsheetName: sheet.getParent().getName(),
      sheetName: sheet.getName(),
      headerRow: headerRow,
      folderUrl: folder.getUrl(),
      spreadsheetUrl: obterPlanilha_().getUrl(),
      summary: {
        totalContratos: totalContratos,
        contratosAtivos: contratosAtivos,
        contratosRiscoAlto: contratosRiscoAlto,
        somaValorMensal: somaValorMensal
      },
      contracts: contracts,
      autocomplete: {
        centrosCusto: Object.keys(centrosCusto),
        categorias: Object.keys(categorias),
        fornecedores: Object.keys(fornecedores),
        contasContabeis: Object.keys(contasContabeis),
        gerentes: Object.keys(gerentes),
        administrativos: Object.keys(administrativos)
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Salva um novo contrato na planilha e processa arquivos anexados no Drive
 * @param {Object} data - Objeto com os campos do formulário
 * @param {Array} files - Lista de arquivos { name, mimeType, base64 }
 */
function salvarContrato(data, files) {
  try {
    if (!data) {
      throw new Error('Dados do contrato não fornecidos.');
    }

    var sheet = obterAbaContratos_();
    var headerRow = obterLinhaCabecalho_(sheet);
    var lastRow = sheet.getLastRow();

    // 1. Determinar o ID caso não informado
    var idFinal = data.id;
    if (!idFinal || String(idFinal).trim() === '') {
      var maxId = 0;
      if (lastRow > headerRow) {
        var ids = sheet.getRange(headerRow + 1, 1, lastRow - headerRow, 1).getValues();
        for (var i = 0; i < ids.length; i++) {
          var val = parseInt(ids[i][0], 10);
          if (!isNaN(val) && val > maxId) maxId = val;
        }
      }
      idFinal = maxId > 0 ? (maxId + 1) : 1;
    }

    var protocol = formatarProtocolo_(idFinal);

    // 2. Upload de arquivos no Google Drive
    var fileUrls = [];
    var folderUrl = '';

    if (files && files.length > 0) {
      var rootFolder = obterOuCriarPastaAnexos_();
      folderUrl = rootFolder.getUrl();

      // Criar subpasta organizada por contrato
      var subFolderName = protocol + ' - ' + (data.fornecedor || 'Fornecedor').substring(0, 30).trim();
      var contractFolder;
      var existingSub = rootFolder.getFoldersByName(subFolderName);
      if (existingSub.hasNext()) {
        contractFolder = existingSub.next();
      } else {
        contractFolder = rootFolder.createFolder(subFolderName);
      }
      folderUrl = contractFolder.getUrl();

      for (var f = 0; f < files.length; f++) {
        var fileObj = files[f];
        if (fileObj && fileObj.base64 && fileObj.name) {
          var decodedBytes = Utilities.base64Decode(fileObj.base64);
          var blob = Utilities.newBlob(decodedBytes, fileObj.mimeType || 'application/octet-stream', fileObj.name);
          var createdFile = contractFolder.createFile(blob);
          
          // Tentar definir permissão de visualização para facilidade de auditoria
          try {
            createdFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
          } catch (pe) {
            // Caso domínio corporativo proíba link público, manter padrão
          }

          fileUrls.push({
            name: fileObj.name,
            url: createdFile.getUrl()
          });
        }
      }
    }

    // 3. Formatar links para armazenamento na planilha
    var linksTexto = '';
    if (fileUrls.length > 0) {
      linksTexto = fileUrls.map(function(item) {
        return item.name + ': ' + item.url;
      }).join('\n');
      if (folderUrl) {
        linksTexto += '\nPasta Drive: ' + folderUrl;
      }
    }

    // Montar Fonte / Memória de cálculo incluindo arquivos caso não digitado
    var memoriaFinal = (data.memoriaCalculo || '').trim();
    if (linksTexto) {
      if (memoriaFinal) {
        memoriaFinal += '\n\n[Anexos Drive]:\n' + linksTexto;
      } else {
        memoriaFinal = '[Anexos Drive]:\n' + linksTexto;
      }
    }

    // 4. Cálculos Automáticos de Colunas Financeiras
    var moeda = data.moeda || 'BRL';
    var valorLancamento = normalizarNumero_(data.valorLancamento);
    var taxaCambio = 1;

    // Buscar taxa de câmbio se em moeda estrangeira
    if (moeda === 'USD') taxaCambio = 5.3;
    else if (moeda === 'EUR') taxaCambio = 5.9;
    else if (moeda === 'GBP') taxaCambio = 6.8;

    // Reajuste aplicado
    var reajusteManual = normalizarPorcentagem_(data.reajusteManual);
    var reajusteAplicado = '';
    if (reajusteManual !== '') {
      reajusteAplicado = reajusteManual;
    } else if (data.indice === 'IPCA') {
      reajusteAplicado = 0.0428;
    } else if (data.indice === 'IGP-M') {
      reajusteAplicado = 0.0411;
    } else if (data.indice === 'Sem reajuste') {
      reajusteAplicado = 0;
    }

    var contingencia = normalizarPorcentagem_(data.contingencia);
    var valorBaseBRL = valorLancamento * taxaCambio;
    var valorOrcado = valorBaseBRL;
    if (contingencia !== '' && typeof contingencia === 'number') {
      valorOrcado = valorBaseBRL * (1 + contingencia);
    }

    // 5. Mapeamento das 32 Colunas (A até AF)
    // A: ID
    // B: Centro de custo
    // C: Categoria/Pacote
    // D: Fornecedor
    // E: CNPJ
    // F: Objeto do contrato
    // G: Gerente/Coordenador
    // H: Administrativo
    // I: Tipo
    // J: Status
    // K: Início da vigência
    // L: Fim da vigência
    // M: Renovação automática
    // N: Moeda
    // O: Valor por lançamento
    // P: Periodicidade
    // Q: 1ª competência
    // R: Data do reajuste
    // S: Índice
    // T: Reajuste manual (%)
    // U: Reajuste aplicado (%) (calculado)
    // V: Impostos/encargos (%)
    // W: Taxa de câmbio
    // X: Valor base em BRL (calculado)
    // Y: Contingência (%)
    // Z: Valor orçado por lançamento (calculado)
    // AA: Conta contábil
    // AB: Contrato/PO
    // AC: Risco
    // AD: Descrição do risco/contingência
    // AE: Fonte/Memória de cálculo
    // AF: Observações

    var novaLinha = [
      idFinal,                                    // A (1)
      data.centroCusto || '',                     // B (2)
      data.categoria || '',                       // C (3)
      data.fornecedor || '',                      // D (4)
      formatarCnpjLimpo_(data.cnpj),              // E (5)
      data.objeto || '',                          // F (6)
      data.gerente || '',                         // G (7)
      data.administrativo || '',                  // H (8)
      data.tipo || 'Vigente',                     // I (9)
      data.status || 'Ativo',                     // J (10)
      formatarDataParaPlanilha_(data.inicioVigencia), // K (11)
      formatarDataParaPlanilha_(data.fimVigencia),    // L (12)
      data.renovacaoAutomatica || 'Não',          // M (13)
      moeda,                                      // N (14)
      valorLancamento,                            // O (15)
      data.periodicidade || 'Mensal',             // P (16)
      formatarDataParaPlanilha_(data.primeiraCompetencia), // Q (17)
      formatarDataParaPlanilha_(data.dataReajuste),       // R (18)
      data.indice || 'Sem reajuste',              // S (19)
      reajusteManual,                             // T (20)
      reajusteAplicado,                           // U (21)
      normalizarPorcentagem_(data.impostos),      // V (22) Impostos
      taxaCambio,                                 // W (23) Taxa Câmbio
      valorBaseBRL,                               // X (24) Valor Base BRL
      contingencia,                               // Y (25) Contingência (%)
      valorOrcado,                                // Z (26) Valor Orçado por Lançamento
      data.contaContabil || '',                   // AA (27) Conta contábil
      data.contratoPo || '',                      // AB (28) Contrato/PO
      data.risco || 'Baixo',                      // AC (29) Risco
      data.descricaoRisco || '',                  // AD (30) Descrição risco
      memoriaFinal,                               // AE (31) Fonte/Memória de cálculo
      data.observacoes || ''                      // AF (32) Observações
    ];

    // Localizar a linha exata de inserção no cadastro (ESTRITAMENTE A PARTIR DA LINHA 18):
    var minRow = CONFIG.MIN_DATA_ROW || 18;
    var targetRow = -1;
    var maxCheckRows = Math.max(lastRow, minRow);

    if (maxCheckRows >= minRow) {
      var numRowsToCheck = maxCheckRows - minRow + 1;
      var checkRange = sheet.getRange(minRow, 1, numRowsToCheck, 4).getValues();
      for (var r = 0; r < checkRange.length; r++) {
        var idCell = String(checkRange[r][0] || '').trim();
        var fornCell = String(checkRange[r][3] || '').trim();
        // Primeiro slot livre encontrado a partir da linha 18
        if (idCell === '' && fornCell === '') {
          targetRow = minRow + r;
          break;
        }
      }
    }

    // Se todas as linhas até lastRow estiverem ocupadas, insere na próxima linha disponível após minRow
    if (targetRow === -1) {
      targetRow = Math.max(minRow, lastRow + 1);
    }

    // Garantir que a linha existe na planilha (expandir se necessário)
    if (targetRow > sheet.getMaxRows()) {
      sheet.insertRowsAfter(sheet.getMaxRows(), 5);
    }

    // Se houver linha anterior com fórmulas, replicar fórmulas e formatos
    var refRow = targetRow > (headerRow + 1) ? (targetRow - 1) : (headerRow + 1);
    if (refRow !== targetRow && refRow <= lastRow) {
      try {
        var prevRange = sheet.getRange(refRow, 1, 1, 32);
        var targetRange = sheet.getRange(targetRow, 1, 1, 32);

        // Copiar formatação
        prevRange.copyTo(targetRange, SpreadsheetApp.CopyPasteType.PASTE_FORMAT, false);

        // Verificar e copiar fórmulas existentes
        var prevFormulas = prevRange.getFormulasR1C1()[0];
        for (var c = 0; c < prevFormulas.length; c++) {
          if (prevFormulas[c] && prevFormulas[c] !== '') {
            // Se for coluna de cálculo (U=20, V=21, W=22, X=23, Z=25) e tiver fórmula
            if (c === 20 || c === 21 || c === 22 || c === 23 || c === 25) {
              novaLinha[c] = prevFormulas[c];
            }
          }
        }
      } catch (copyErr) {
        // Fallback gracioso
      }
    }

    // Inserir os dados na planilha na linha exata
    sheet.getRange(targetRow, 1, 1, 32).setValues([novaLinha]);

    // Forçar atualização do Google Sheets imediatamente
    SpreadsheetApp.flush();

    // Garantir formatação consistente das células numéricas e de texto
    try {
      sheet.getRange(targetRow, 1).setHorizontalAlignment('center');
      sheet.getRange(targetRow, 5).setNumberFormat('@'); // CNPJ como texto
      sheet.getRange(targetRow, 15).setNumberFormat('R$ #,##0.00'); // Valor por lançamento
      if (typeof novaLinha[20] === 'number') sheet.getRange(targetRow, 21).setNumberFormat('0.00%');
      if (typeof novaLinha[24] === 'number') sheet.getRange(targetRow, 25).setNumberFormat('0.00%');
      sheet.getRange(targetRow, 26).setNumberFormat('R$ #,##0.00'); // Valor orçado
    } catch (fmtErr) {
      // Ignorar se formatação secundária falhar
    }

    return {
      success: true,
      id: idFinal,
      protocol: protocol,
      spreadsheetName: sheet.getParent().getName(),
      sheetName: sheet.getName(),
      rowNumber: targetRow,
      filesUploaded: fileUrls.length,
      fileUrls: fileUrls,
      folderUrl: folderUrl
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Retorna lista de contratos atualizada
 */
function listarContratos() {
  var init = getInitialData();
  if (init.success) {
    return {
      success: true,
      contracts: init.contracts,
      summary: init.summary
    };
  }
  return init;
}

// ============================================================================
// FUNÇÕES AUXILIARES DE FORMATAÇÃO E CONVERSÃO
// ============================================================================

function formatarProtocolo_(id) {
  if (!id) return '';
  var num = parseInt(id, 10);
  if (!isNaN(num)) {
    var padded = ('0000' + num).slice(-4);
    var ano = new Date().getFullYear();
    return CONFIG.PROTOCOL_PREFIX + '-' + ano + '-' + padded;
  }
  return String(id);
}

function normalizarNumero_(valor) {
  if (valor === null || valor === undefined || valor === '') return 0;
  if (typeof valor === 'number') return valor;
  var str = String(valor).trim();
  // Remover R$, $, espaços
  str = str.replace(/[R$\s]/g, '');
  // Converter 1.234,56 -> 1234.56
  if (str.indexOf(',') !== -1) {
    str = str.replace(/\./g, '').replace(',', '.');
  }
  var parsed = parseFloat(str);
  return isNaN(parsed) ? 0 : parsed;
}

function normalizarPorcentagem_(valor) {
  if (valor === null || valor === undefined || valor === '') return '';
  if (typeof valor === 'number') return valor;
  var str = String(valor).trim().replace(/%/g, '');
  if (str.indexOf(',') !== -1) {
    str = str.replace(/\./g, '').replace(',', '.');
  }
  var parsed = parseFloat(str);
  if (isNaN(parsed)) return '';
  // Se digitado "5" ou "4.28", converter para 0.05 ou 0.0428 caso > 1
  if (parsed > 1) {
    return parsed / 100;
  }
  return parsed;
}

function formatarCnpjLimpo_(cnpj) {
  if (!cnpj) return '';
  var s = String(cnpj).replace(/\D/g, '');
  if (s.length === 14) {
    return s.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
  }
  return cnpj;
}

function formatarDataParaPlanilha_(dataStr) {
  if (!dataStr) return '';
  if (dataStr instanceof Date) {
    return Utilities.formatDate(dataStr, Session.getScriptTimeZone() || 'America/Fortaleza', 'yyyy-MM-dd');
  }
  var s = String(dataStr).trim();
  if (s.toLowerCase() === 'não tem' || s.toLowerCase() === 'nao tem') return 'Não tem ';
  // Se for DD/MM/AAAA converter para AAAA-MM-DD
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) {
    var partes = s.split('/');
    return partes[2] + '-' + partes[1] + '-' + partes[0];
  }
  return s;
}

function formatarDataExibicao_(val) {
  if (!val) return '';
  if (val instanceof Date) {
    return Utilities.formatDate(val, Session.getScriptTimeZone() || 'America/Fortaleza', 'dd/MM/yyyy');
  }
  var s = String(val).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    var p = s.substring(0, 10).split('-');
    return p[2] + '/' + p[1] + '/' + p[0];
  }
  return s;
}

function formatarDataHoraExibicao_(val) {
  if (!val) return '';
  if (val instanceof Date) {
    return Utilities.formatDate(val, Session.getScriptTimeZone() || 'America/Fortaleza', 'dd/MM/yyyy HH:mm:ss');
  }
  return String(val);
}

/**
 * Obtém ou cria a aba de histórico de alterações de contratos
 */
function obterAbaLogs_() {
  var ss = obterPlanilha_();
  var sheet = ss.getSheetByName(CONFIG.LOG_SHEET_NAME);
  if (!sheet) {
    sheet = ss.getSheetByName('Histórico de alterações do orçamento');
  }
  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.LOG_SHEET_NAME);
    var headers = [
      'Data/Hora',
      'ID Contrato',
      'Protocolo',
      'Fornecedor',
      'Campo Alterado',
      'Valor Anterior',
      'Novo Valor',
      'Usuário',
      'Notificação Enviada'
    ];
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#E8E8E8');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

/**
 * Registra uma alteração no log
 */
function registrarLogAlteracao_(contractId, protocol, fornecedor, campo, valorAnterior, novoValor, usuario, notificacao) {
  try {
    var logSheet = obterAbaLogs_();
    var nowStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'America/Fortaleza', 'dd/MM/yyyy HH:mm:ss');
    var rowData = [
      nowStr,
      contractId || '',
      protocol || '',
      fornecedor || '',
      campo || '',
      String(valorAnterior || ''),
      String(novoValor || ''),
      usuario || '',
      notificacao || 'Não'
    ];
    logSheet.appendRow(rowData);
    SpreadsheetApp.flush();
  } catch (e) {
    Logger.log('Erro ao registrar log: ' + e.message);
  }
}

/**
 * Atualiza o campo de notas/observações de um contrato diretamente na planilha
 * @param {string|number} contractId - ID do contrato
 * @param {number} rowNumber - Linha sugerida da planilha (opcional)
 * @param {string} novaNota - Novo texto da nota/acordo
 * @param {string} motivo - Motivo opcional da alteração
 */
function atualizarNotasContrato(contractId, rowNumber, novaNota, motivo) {
  try {
    if (!contractId && !rowNumber) {
      throw new Error('Identificador do contrato não informado.');
    }

    var sheet = obterAbaContratos_();
    var headerRow = obterLinhaCabecalho_(sheet);
    var targetRow = -1;

    // 1. Validar se rowNumber fornecido corresponde ao ID
    if (rowNumber && rowNumber > headerRow) {
      var idNaLinha = String(sheet.getRange(rowNumber, 1).getValue()).trim();
      if (idNaLinha === String(contractId).trim()) {
        targetRow = rowNumber;
      }
    }

    // 2. Se não bateu ou não informado, procurar a linha pelo ID
    if (targetRow === -1) {
      var lastRow = sheet.getLastRow();
      if (lastRow > headerRow) {
        var ids = sheet.getRange(headerRow + 1, 1, lastRow - headerRow, 1).getValues();
        for (var i = 0; i < ids.length; i++) {
          if (String(ids[i][0]).trim() === String(contractId).trim()) {
            targetRow = headerRow + 1 + i;
            break;
          }
        }
      }
    }

    if (targetRow === -1) {
      throw new Error('Contrato com ID ' + contractId + ' não foi localizado na planilha.');
    }

    // Coluna AF (32) é Observações / Notas
    var rangeNota = sheet.getRange(targetRow, 32);
    var valorAnterior = String(rangeNota.getValue() || '');

    // Atualizar valor
    rangeNota.setValue(novaNota);
    SpreadsheetApp.flush();

    // Dados do contrato para o log
    var fornecedor = String(sheet.getRange(targetRow, 4).getValue() || '');
    var protocol = formatarProtocolo_(contractId);
    var usuario = '';
    try {
      usuario = Session.getActiveUser().getEmail() || Session.getEffectiveUser().getEmail();
    } catch (ue) {
      usuario = 'usuario.compras@grupobrisanet.com.br';
    }
    if (!usuario) usuario = 'usuario.compras@grupobrisanet.com.br';

    // Registrar no histórico
    registrarLogAlteracao_(contractId, protocol, fornecedor, 'Notas / Observações', valorAnterior, novaNota, usuario, 'Não');

    return {
      success: true,
      contractId: contractId,
      protocol: protocol,
      rowNumber: targetRow,
      valorAnterior: valorAnterior,
      novoValor: novaNota,
      usuario: usuario,
      dataHora: Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'America/Fortaleza', 'dd/MM/yyyy HH:mm:ss')
    };
  } catch (err) {
    return {
      success: false,
      error: err.message
    };
  }
}

/**
 * Retorna todo o histórico de alterações registradas para um determinado contrato
 * @param {string|number} contractId - ID do contrato
 */
function obterHistoricoContrato(contractId) {
  try {
    var logSheet = obterAbaLogs_();
    var lastRow = logSheet.getLastRow();
    var history = [];

    if (lastRow > 1) {
      var numCols = Math.min(logSheet.getLastColumn(), 9);
      var values = logSheet.getRange(2, 1, lastRow - 1, numCols).getValues();
      for (var i = 0; i < values.length; i++) {
        var rowId = String(values[i][1] || '').trim();
        if (rowId === String(contractId).trim()) {
          history.push({
            dataHora: formatarDataHoraExibicao_(values[i][0]),
            id: values[i][1],
            protocol: values[i][2],
            fornecedor: values[i][3],
            campo: values[i][4],
            valorAnterior: values[i][5],
            novoValor: values[i][6],
            usuario: values[i][7],
            notificacao: values[i][8]
          });
        }
      }
    }

    // Mais recente primeiro
    history.reverse();

    return {
      success: true,
      contractId: contractId,
      history: history
    };
  } catch (err) {
    return {
      success: false,
      error: err.message,
      history: []
    };
  }
}

/**
 * Envia notificação por e-mail sobre alterações / novos registros no contrato
 * @param {Object} dados - Informações de contrato, destinatários e mensagem
 */
function enviarEmailRegistro(dados) {
  try {
    if (!dados || !dados.destinatarios) {
      throw new Error('Informe ao menos um endereço de e-mail de destinatário.');
    }

    // Tratar destinatários
    var rawList = String(dados.destinatarios).split(/[,;]/);
    var validEmails = [];
    var emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    for (var i = 0; i < rawList.length; i++) {
      var email = rawList[i].trim();
      if (email && emailRegex.test(email)) {
        validEmails.push(email);
      }
    }

    if (validEmails.length === 0) {
      throw new Error('Nenhum e-mail de destinatário válido foi informado.');
    }

    var usuario = '';
    try {
      usuario = Session.getActiveUser().getEmail() || Session.getEffectiveUser().getEmail();
    } catch (e) {
      usuario = 'usuario.compras@grupobrisanet.com.br';
    }
    if (!usuario) usuario = 'usuario.compras@grupobrisanet.com.br';

    var protocol = dados.protocol || formatarProtocolo_(dados.id);
    var fornecedor = dados.fornecedor || 'Fornecedor';
    var objeto = dados.objeto || 'Contrato de Fornecimento';
    var notaAlteracao = dados.mensagem || dados.novaNota || dados.observacoes || 'Atualização cadastral realizada.';
    var nowStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'America/Fortaleza', 'dd/MM/yyyy HH:mm');

    var ssUrl = obterPlanilha_().getUrl();
    var folderUrl = obterOuCriarPastaAnexos_().getUrl();

    var assunto = dados.assunto || ('[a brisanet] Registro de Alteração Contratual - ' + protocol + ' (' + fornecedor + ')');

    // Corpo HTML do e-mail com a identidade visual oficial da brisanet
    var htmlBody = 
      '<div style="font-family:\'Figtree\',Arial,sans-serif;background-color:#f8fafc;padding:24px;color:#0B316D;">' +
        '<div style="max-width:620px;margin:0 auto;background:#ffffff;border:1px solid #E8E8E8;border-radius:12px;overflow:hidden;box-shadow:0 4px 12px rgba(11,49,109,0.06);">' +
          
          '<div style="background:#2242D4;padding:20px 24px;">' +
            '<span style="background:#FF5022;color:#ffffff;font-size:12px;font-weight:800;padding:4px 10px;border-radius:6px;letter-spacing:0.5px;text-transform:lowercase;">brisanet</span>' +
            '<h2 style="color:#ffffff;margin:8px 0 0 0;font-size:18px;font-weight:700;">Registro de Alteração Contratual</h2>' +
            '<p style="color:#bfdbfe;margin:2px 0 0 0;font-size:11px;letter-spacing:0.8px;text-transform:lowercase;">suporte técnico · brisanet</p>' +
          '</div>' +

          '<div style="padding:24px;">' +
            '<p style="font-size:14px;line-height:1.6;color:#334155;margin-top:0;">' +
              'Olá,<br><br>' +
              'Informamos que foi registrado um novo acordo ou atualização no contrato corporativo detalhado abaixo:' +
            '</p>' +

            '<div style="background:#f0f3ff;border-left:4px solid #2242D4;border-radius:6px;padding:16px;margin:20px 0;">' +
              '<table style="width:100%;font-size:13px;border-collapse:collapse;">' +
                '<tr>' +
                  '<td style="padding:4px 0;color:#64748b;font-weight:600;width:110px;">Protocolo:</td>' +
                  '<td style="padding:4px 0;color:#0B316D;font-weight:700;">' + protocol + ' (ID ' + (dados.id || dados.contractId || '-') + ')</td>' +
                '</tr>' +
                '<tr>' +
                  '<td style="padding:4px 0;color:#64748b;font-weight:600;">Fornecedor:</td>' +
                  '<td style="padding:4px 0;color:#0B316D;font-weight:700;">' + fornecedor + '</td>' +
                '</tr>' +
                '<tr>' +
                  '<td style="padding:4px 0;color:#64748b;font-weight:600;">Objeto:</td>' +
                  '<td style="padding:4px 0;color:#334155;">' + objeto + '</td>' +
                '</tr>' +
                '<tr>' +
                  '<td style="padding:4px 0;color:#64748b;font-weight:600;">Status:</td>' +
                  '<td style="padding:4px 0;"><span style="background:#D0FF60;color:#0B316D;font-weight:700;padding:2px 8px;border-radius:999px;font-size:11px;">' + (dados.status || 'Ativo') + '</span></td>' +
                '</tr>' +
              '</table>' +
            '</div>' +

            '<div style="background:#ffffff;border:1px solid #E8E8E8;border-radius:8px;padding:16px;margin:20px 0;">' +
              '<h4 style="margin:0 0 8px 0;font-size:12px;font-weight:800;color:#FF5022;text-transform:uppercase;letter-spacing:0.5px;">Nota / Acordo Registrado:</h4>' +
              '<p style="margin:0;font-size:13px;color:#0B316D;white-space:pre-wrap;line-height:1.6;">' + notaAlteracao + '</p>' +
            '</div>' +

            '<p style="font-size:12px;color:#64748b;margin:16px 0 24px 0;">' +
              '<strong>Registrado por:</strong> ' + usuario + '<br>' +
              '<strong>Data e hora:</strong> ' + nowStr +
            '</p>' +

            '<div style="text-align:center;margin-top:24px;">' +
              '<a href="' + ssUrl + '" target="_blank" style="display:inline-block;background:#2242D4;color:#ffffff;text-decoration:none;font-weight:700;font-size:13px;padding:10px 20px;border-radius:6px;margin-right:10px;">Abrir Planilha de Contratos</a>' +
              '<a href="' + folderUrl + '" target="_blank" style="display:inline-block;background:#E8E8E8;color:#0B316D;text-decoration:none;font-weight:700;font-size:13px;padding:10px 20px;border-radius:6px;">Acessar Pasta no Drive</a>' +
            '</div>' +

          '</div>' +

          '<div style="background:#f8fafc;border-top:1px solid #E8E8E8;padding:14px 24px;text-align:center;font-size:11px;color:#94a3b8;">' +
            'Este é um comunicado automático gerado pelo Sistema de Gestão de Contratos · a brisanet' +
          '</div>' +

        '</div>' +
      '</div>';

    MailApp.sendEmail({
      to: validEmails.join(','),
      subject: assunto,
      htmlBody: htmlBody
    });

    registrarLogAlteracao_(dados.id || dados.contractId, protocol, fornecedor, 'Notificação por E-mail', '', notaAlteracao, usuario, validEmails.join(', '));

    return {
      success: true,
      recipientsCount: validEmails.length,
      recipients: validEmails
    };
  } catch (err) {
    return {
      success: false,
      error: err.message
    };
  }
}
