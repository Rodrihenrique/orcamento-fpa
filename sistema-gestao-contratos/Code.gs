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
  // GID da aba de Cadastro (padrão)
  SHEET_GID: '531593901',
  // Nomes possíveis para a aba de cadastro
  TARGET_SHEET_NAMES: [
    'Cadastro e memória de cálculo dos contratos',
    'Cadastro Contratos',
    'Cadastro'
  ],
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
    .addItem('Abrir Pasta de Anexos no Drive', 'abrirPastaAnexosDrive')
    .addItem('Configurar / Verificar Pasta do Drive', 'configurarPastaDrive')
    .addToUi();
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
    if (activeSs) return activeSs;
  } catch (e) {
    // Caso executado fora do contexto da planilha
  }
  return SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
}

/**
 * Localiza a aba correta de cadastro de contratos
 */
function obterAbaContratos_() {
  var ss = obterPlanilha_();
  var sheets = ss.getSheets();

  // 1. Tentar por GID se coincidir
  for (var i = 0; i < sheets.length; i++) {
    if (String(sheets[i].getSheetId()) === CONFIG.SHEET_GID) {
      return sheets[i];
    }
  }

  // 2. Tentar pelos nomes conhecidos
  for (var k = 0; k < CONFIG.TARGET_SHEET_NAMES.length; k++) {
    var sheet = ss.getSheetByName(CONFIG.TARGET_SHEET_NAMES[k]);
    if (sheet) return sheet;
  }

  // 3. Procurar por cabeçalho com coluna "Objeto do contrato" ou "Fornecedor"
  for (var j = 0; j < sheets.length; j++) {
    var s = sheets[j];
    var lastRow = Math.min(s.getLastRow(), 10);
    if (lastRow >= 1) {
      var headerValues = s.getRange(1, 1, lastRow, Math.min(s.getLastColumn(), 35)).getValues();
      for (var r = 0; r < headerValues.length; r++) {
        var rowText = headerValues[r].join(' ').toLowerCase();
        if (rowText.indexOf('objeto do contrato') !== -1 || rowText.indexOf('fornecedor') !== -1) {
          return s;
        }
      }
    }
  }

  // Fallback: primeira aba
  return sheets[0];
}

/**
 * Localiza a linha do cabeçalho na aba de cadastro
 */
function obterLinhaCabecalho_(sheet) {
  var maxCheck = Math.min(sheet.getLastRow(), 15);
  if (maxCheck < 1) return 1;

  var values = sheet.getRange(1, 1, maxCheck, Math.min(sheet.getLastColumn(), 32)).getValues();
  for (var r = 0; r < values.length; r++) {
    var rowText = values[r].map(function(c) { return String(c).toLowerCase().trim(); });
    if (rowText.indexOf('id') !== -1 && rowText.indexOf('fornecedor') !== -1) {
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

    // Localizar a próxima linha disponível
    var targetRow = lastRow + 1;

    // Se houver linha anterior com fórmulas, replicar fórmulas e formatos
    if (lastRow > headerRow) {
      try {
        var prevRange = sheet.getRange(lastRow, 1, 1, 32);
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

    // Inserir os dados na planilha
    sheet.getRange(targetRow, 1, 1, 32).setValues([novaLinha]);

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
