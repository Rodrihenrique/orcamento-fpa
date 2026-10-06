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
  // Nome da aba de usuários com acesso
  ACCESS_SHEET_NAME: 'Acessos',
  // Nome da pasta raiz no Google Drive para os arquivos anexados
  DRIVE_FOLDER_NAME: 'Contratos - Anexos',
  // Prefixo para protocolo formatado
  PROTOCOL_PREFIX: 'BRISA-CON',
  // Fuso horário oficial para registro e exibição de datas e logs (Horário de Brasília/Nordeste UTC-3)
  TIMEZONE: 'America/Fortaleza'
};

/**
 * Retorna o fuso horário oficial adotado no sistema
 */
function obterTimezoneOficial_() {
  return CONFIG.TIMEZONE || 'America/Fortaleza';
}

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
    .addItem('Verificar Vencimentos e Disparar Alertas Agora', 'verificarVencimentosManualmente')
    .addItem('Configurar Verificação Diária Automática (08:00)', 'configurarGatilhoDiario')
    .addItem('Verificar Usuários com Acesso (Aba Acessos)', 'verificarUsuariosAcessosMenu')
    .addSeparator()
    .addItem('Autorizar Permissões de E-mail / Sistema', 'autorizarPermissoes')
    .addItem('Verificar Aba de Contratos Detectada', 'verificarAbaDetectada')
    .addItem('Abrir Pasta de Anexos no Drive', 'abrirPastaAnexosDrive')
    .addItem('Configurar / Verificar Pasta do Drive', 'configurarPastaDrive')
    .addToUi();
}

/**
 * Função para forçar a autorização de permissões de envio de e-mail e acesso do sistema.
 * Execute-a diretamente no editor do Apps Script (botão Executar) ou pelo menu da planilha.
 */
function autorizarPermissoes() {
  var quota = MailApp.getRemainingDailyQuota();
  var user = '';
  try {
    user = Session.getActiveUser().getEmail() || Session.getEffectiveUser().getEmail();
  } catch (e) {
    user = 'Usuário autenticado';
  }

  Logger.log('Autorização concluída com sucesso!');
  Logger.log('Usuário: ' + user);
  Logger.log('Cota diária restante de e-mails: ' + quota);

  try {
    var ui = SpreadsheetApp.getUi();
    ui.alert(
      'Permissões Autorizadas com Sucesso',
      'Conta autorizada: ' + user + '\n' +
      'Cota restante de envio: ' + quota + ' e-mails/dia.\n\n' +
      'As permissões de Planilha, Drive e Envio de E-mails foram concedidas com sucesso!',
      ui.ButtonSet.OK
    );
  } catch (err) {
    // Caso executado direto pelo editor de scripts
  }

  return {
    success: true,
    user: user,
    remainingQuota: quota
  };
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
    var contratosVencendo90Dias = 0;
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

        var diasParaVencer = calcularDiasParaVencer_(row[11]);
        var riscoVencimento = (diasParaVencer !== null && diasParaVencer <= 90);

        totalContratos++;
        var statusLower = status.toLowerCase();
        if (statusLower === 'ativo') {
          contratosAtivos++;
        }
        if (risco.toLowerCase() === 'alto' || (riscoVencimento && statusLower !== 'encerrado' && statusLower !== 'cancelado')) {
          contratosRiscoAlto++;
        }
        if (riscoVencimento && statusLower !== 'encerrado' && statusLower !== 'cancelado') {
          contratosVencendo90Dias++;
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
          diasParaVencer: diasParaVencer,
          riscoVencimento: riscoVencimento,
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
        contratosVencendo90Dias: contratosVencendo90Dias,
        somaValorMensal: somaValorMensal
      },
      usuariosAcessos: obterUsuariosAcessos_(),
      listaEmailsAcessos: obterListaEmailsAcessos_(),
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

    // Registrar log de cadastro inicial no histórico
    var usuarioCad = '';
    try {
      usuarioCad = Session.getActiveUser().getEmail() || Session.getEffectiveUser().getEmail();
    } catch (ue) {
      usuarioCad = 'usuario.compras@grupobrisanet.com.br';
    }
    if (!usuarioCad) usuarioCad = 'usuario.compras@grupobrisanet.com.br';
    registrarLogAlteracao_(idFinal, protocol, data.fornecedor || '', 'Cadastro Inicial', '', 'Contrato cadastrado no sistema', usuarioCad, 'Não');

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
      summary: init.summary,
      usuariosAcessos: init.usuariosAcessos,
      listaEmailsAcessos: init.listaEmailsAcessos
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
    return Utilities.formatDate(dataStr, obterTimezoneOficial_(), 'yyyy-MM-dd');
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
    return Utilities.formatDate(val, obterTimezoneOficial_(), 'dd/MM/yyyy');
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
    return Utilities.formatDate(val, obterTimezoneOficial_(), 'dd/MM/yyyy HH:mm:ss');
  }
  return String(val);
}

/**
 * Converte diferentes formatos de data (Date, AAAA-MM-DD, DD/MM/AAAA) em objeto Date zerado
 */
function converterParaData_(val) {
  if (!val) return null;
  if (val instanceof Date) {
    return new Date(val.getFullYear(), val.getMonth(), val.getDate());
  }
  var s = String(val).trim();
  if (s.toLowerCase().indexOf('não') !== -1 || s.toLowerCase().indexOf('nao') !== -1) return null;
  // AAAA-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    var p = s.substring(0, 10).split('-');
    return new Date(parseInt(p[0], 10), parseInt(p[1], 10) - 1, parseInt(p[2], 10));
  }
  // DD/MM/AAAA
  if (/^\d{1,2}\/\d{1,2}\/\d{4}/.test(s)) {
    var p = s.split('/');
    return new Date(parseInt(p[2], 10), parseInt(p[1], 10) - 1, parseInt(p[0], 10));
  }
  var parsed = new Date(s);
  if (!isNaN(parsed.getTime())) {
    return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
  }
  return null;
}

/**
 * Calcula a quantidade de dias restantes para o vencimento em relação ao dia de hoje (00:00:00)
 * Retorna número inteiro de dias (positivo = a vencer, 0 = vence hoje, negativo = vencido) ou null
 */
function calcularDiasParaVencer_(val) {
  var d = converterParaData_(val);
  if (!d) return null;
  var hoje = new Date();
  var hojeZerado = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  var diffTime = d.getTime() - hojeZerado.getTime();
  var diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

/**
 * Converte data/hora para timestamp para ordenacao segura
 */
function converterParaDataHoraValida_(val) {
  if (!val) return null;
  if (val instanceof Date) return val;
  var s = String(val).trim();
  var m1 = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
  if (m1) {
    var d = parseInt(m1[1], 10);
    var mo = parseInt(m1[2], 10) - 1;
    var y = parseInt(m1[3], 10);
    var h = m1[4] ? parseInt(m1[4], 10) : 0;
    var mi = m1[5] ? parseInt(m1[5], 10) : 0;
    var sec = m1[6] ? parseInt(m1[6], 10) : 0;
    return new Date(y, mo, d, h, mi, sec);
  }
  var parsed = new Date(s);
  return isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Normaliza ID para comparacao resiliente (lida com 1.0, 1, #1, espacos e numeros)
 */
function normalizarIdParaComparacao_(val) {
  if (val === null || val === undefined) return '';
  var s = String(val).trim();
  s = s.replace(/^#\s*/, '').replace(/^id\s*:?\s*/i, '');
  if (/^\d+\.0+$/.test(s)) {
    s = s.split('.')[0];
  }
  if (/^\d+$/.test(s)) {
    var n = parseInt(s, 10);
    if (!isNaN(n)) return String(n);
  }
  return s.toLowerCase();
}

/**
 * Extrai numero sequencial do protocolo (ex: BRISA-CON-2026-0001 -> 1)
 */
function extrairNumeroDoProtocolo_(proto) {
  if (!proto) return null;
  var s = String(proto).trim();
  var m = s.match(/-(\d+)$/);
  if (m) {
    var n = parseInt(m[1], 10);
    return isNaN(n) ? null : String(n);
  }
  var m2 = s.match(/\b(\d+)\b/);
  if (m2) {
    var n2 = parseInt(m2[1], 10);
    return isNaN(n2) ? null : String(n2);
  }
  return null;
}

/**
 * Obtem ou cria a aba de historico de alteracoes de contratos com busca ampla de nomes
 */
function obterAbaLogs_() {
  var ss = obterPlanilha_();
  var candidateNames = [
    CONFIG.LOG_SHEET_NAME,
    'Histórico de Alterações',
    'Historico de Alteracoes',
    'Histórico de alterações',
    'Historico de alteracoes',
    'Alterações',
    'Alteracoes',
    'Histórico de alterações do orçamento',
    'Historico de alteracoes do orcamento',
    'Histórico',
    'Historico',
    'Logs'
  ];

  for (var i = 0; i < candidateNames.length; i++) {
    var s = ss.getSheetByName(candidateNames[i]);
    if (s) return s;
  }

  // Se nao encontrou por nome exato, buscar por palavra-chave no nome da aba
  var allSheets = ss.getSheets();
  for (var j = 0; j < allSheets.length; j++) {
    var nameLower = allSheets[j].getName().toLowerCase();
    if (nameLower.indexOf('altera') !== -1 || nameLower.indexOf('hist') !== -1 || nameLower.indexOf('log') !== -1) {
      return allSheets[j];
    }
  }

  var sheet = ss.insertSheet(CONFIG.LOG_SHEET_NAME);
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
  return sheet;
}

/**
 * Registra uma alteracao no log da planilha
 */
function registrarLogAlteracao_(contractId, protocol, fornecedor, campo, valorAnterior, novoValor, usuario, notificacao) {
  try {
    var logSheet = obterAbaLogs_();
    var nowStr = Utilities.formatDate(new Date(), obterTimezoneOficial_(), 'dd/MM/yyyy HH:mm:ss');
    var rowData = [
      nowStr,
      contractId !== undefined && contractId !== null ? String(contractId) : '',
      protocol || (contractId ? formatarProtocolo_(contractId) : ''),
      fornecedor || '',
      campo || '',
      String(valorAnterior !== null && valorAnterior !== undefined ? valorAnterior : ''),
      String(novoValor !== null && novoValor !== undefined ? novoValor : ''),
      usuario || '',
      notificacao || 'Não'
    ];

    var lastRow = logSheet.getLastRow();
    if (lastRow === 0) {
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
      logSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      logSheet.getRange(2, 1).setNumberFormat('@');
      logSheet.getRange(2, 1, 1, rowData.length).setValues([rowData]);
    } else {
      var headerRow = 1;
      var valA1 = String(logSheet.getRange(1, 1).getValue() || '').trim().toLowerCase();
      if (valA1 !== 'data/hora' && valA1 !== 'data') {
        for (var r = 1; r <= Math.min(lastRow, 10); r++) {
          var rText = String(logSheet.getRange(r, 1).getValue() || '').trim().toLowerCase();
          if (rText === 'data/hora' || rText === 'data' || rText === 'versão' || rText === 'versao') {
            headerRow = r;
            break;
          }
        }
      }

      var targetRow = -1;
      if (lastRow > headerRow) {
        var numCheck = Math.min(lastRow - headerRow, 500);
        var checkVals = logSheet.getRange(headerRow + 1, 1, numCheck, 2).getValues();
        for (var k = 0; k < checkVals.length; k++) {
          if (String(checkVals[k][0] || '').trim() === '' && String(checkVals[k][1] || '').trim() === '') {
            targetRow = headerRow + 1 + k;
            break;
          }
        }
      }

      if (targetRow === -1) {
        targetRow = lastRow + 1;
      }

      logSheet.getRange(targetRow, 1).setNumberFormat('@');
      logSheet.getRange(targetRow, 1, 1, rowData.length).setValues([rowData]);
    }
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
      dataHora: Utilities.formatDate(new Date(), obterTimezoneOficial_(), 'dd/MM/yyyy HH:mm:ss')
    };
  } catch (err) {
    return {
      success: false,
      error: err.message
    };
  }
}

/**
 * Extrai historico de alteracoes de uma aba especifica com mapeamento inteligente de colunas
 */
function extrairLogsDaAba_(sheet, targetId, targetProtocol) {
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  if (lastRow < 2 || lastCol < 2) return [];

  var numCols = Math.min(lastCol, 15);
  var values = sheet.getRange(1, 1, lastRow, numCols).getValues();
  if (!values || values.length === 0) return [];

  // Mapear cabecalhos dinamicamente
  var headerRowIdx = -1;
  var colMap = {
    dataHora: 0,
    id: 1,
    protocol: 2,
    fornecedor: 3,
    campo: 4,
    valorAnterior: 5,
    novoValor: 6,
    usuario: 7,
    notificacao: 8
  };

  for (var r = 0; r < Math.min(values.length, 10); r++) {
    var rowText = values[r].map(function(v) { return String(v || '').toLowerCase(); }).join(' | ');
    if (rowText.indexOf('id') !== -1 || rowText.indexOf('campo alterado') !== -1 || rowText.indexOf('item alterado') !== -1 || rowText.indexOf('protocolo') !== -1) {
      headerRowIdx = r;
      var hRow = values[r];
      for (var c = 0; c < hRow.length; c++) {
        var hText = String(hRow[c] || '').toLowerCase().trim();
        if (hText.indexOf('data') !== -1) colMap.dataHora = c;
        else if (hText === 'id' || hText.indexOf('id contrato') !== -1 || hText === 'id do contrato') colMap.id = c;
        else if (hText.indexOf('protocolo') !== -1) colMap.protocol = c;
        else if (hText.indexOf('fornecedor') !== -1) colMap.fornecedor = c;
        else if (hText.indexOf('campo') !== -1 || hText.indexOf('item alterado') !== -1) colMap.campo = c;
        else if (hText.indexOf('anterior') !== -1) colMap.valorAnterior = c;
        else if (hText.indexOf('novo') !== -1) colMap.novoValor = c;
        else if (hText.indexOf('usu') !== -1 || hText.indexOf('respons') !== -1) colMap.usuario = c;
        else if (hText.indexOf('notif') !== -1 || hText.indexOf('e-mail') !== -1 || hText.indexOf('email') !== -1) colMap.notificacao = c;
      }
      break;
    }
  }

  var startRow = headerRowIdx !== -1 ? (headerRowIdx + 1) : 1;
  var logs = [];

  var targetIdNorm = normalizarIdParaComparacao_(targetId);
  var targetProtoNorm = normalizarIdParaComparacao_(targetProtocol || (targetId ? formatarProtocolo_(targetId) : ''));
  var targetProtoNum = extrairNumeroDoProtocolo_(targetProtocol) || extrairNumeroDoProtocolo_(targetId);

  for (var i = startRow; i < values.length; i++) {
    var row = values[i];
    var valData = row[colMap.dataHora];
    var valId = row[colMap.id];
    var valProto = row[colMap.protocol];
    var valForn = row[colMap.fornecedor];
    var valCampo = row[colMap.campo];
    var valAnt = row[colMap.valorAnterior];
    var valNov = row[colMap.novoValor];
    var valUser = row[colMap.usuario];
    var valNotif = row[colMap.notificacao];

    if (!valId && !valProto && !valCampo && !valNov) continue;

    var rowIdNorm = normalizarIdParaComparacao_(valId);
    var rowProtoNorm = normalizarIdParaComparacao_(valProto);
    var rowProtoNum = extrairNumeroDoProtocolo_(valProto) || extrairNumeroDoProtocolo_(valId);

    var match = false;

    // 1. Comparacao direta de ID normalizado (ex: 1 vs 1, 1.0 vs 1, #1 vs 1)
    if (rowIdNorm && targetIdNorm && rowIdNorm === targetIdNorm) {
      match = true;
    }
    // 2. Comparacao de Protocolo normalizado
    else if (targetProtoNorm && (rowProtoNorm === targetProtoNorm || rowIdNorm === targetProtoNorm)) {
      match = true;
    }
    // 3. Comparacao de numero do protocolo com ID alvo
    else if (targetIdNorm && (rowProtoNum === targetIdNorm || rowIdNorm === targetProtoNum)) {
      match = true;
    }
    // 4. Comparacao de numero do protocolo do alvo com o ID da linha
    else if (targetProtoNum && (rowIdNorm === targetProtoNum || rowProtoNum === targetProtoNum)) {
      match = true;
    }
    // 5. Caso o ID alvo esteja contido no protocolo da linha
    else if (rowProtoNorm && targetIdNorm && targetIdNorm !== '' && rowProtoNorm.indexOf(targetIdNorm) !== -1) {
      match = true;
    }

    if (match) {
      logs.push({
        dataHora: formatarDataHoraExibicao_(valData),
        id: valId !== undefined && valId !== null ? String(valId) : (targetId || ''),
        protocol: valProto ? String(valProto) : (targetProtocol || (targetId ? formatarProtocolo_(targetId) : '')),
        fornecedor: valForn ? String(valForn) : '',
        campo: valCampo ? String(valCampo) : 'Alteração',
        valorAnterior: valAnt !== null && valAnt !== undefined ? String(valAnt) : '',
        novoValor: valNov !== null && valNov !== undefined ? String(valNov) : '',
        usuario: valUser ? String(valUser) : 'Sistema',
        notificacao: valNotif ? String(valNotif) : 'Não'
      });
    }
  }

  return logs;
}

/**
 * Retorna todo o historico de alteracoes registradas para um determinado contrato
 * @param {string|number} contractId - ID do contrato
 * @param {string} [protocol] - Protocolo formatado opcional do contrato
 */
function obterHistoricoContrato(contractId, protocol) {
  try {
    var ss = obterPlanilha_();
    var history = [];

    var candidateNames = [
      CONFIG.LOG_SHEET_NAME,
      'Histórico de Alterações',
      'Historico de Alteracoes',
      'Histórico de alterações',
      'Historico de alteracoes',
      'Alterações',
      'Alteracoes',
      'Histórico de alterações do orçamento',
      'Historico de alteracoes do orcamento',
      'Histórico',
      'Historico',
      'Logs'
    ];

    var visitedSheets = {};
    for (var s = 0; s < candidateNames.length; s++) {
      var sName = candidateNames[s];
      var sheet = ss.getSheetByName(sName);
      if (sheet && !visitedSheets[sheet.getName()]) {
        visitedSheets[sheet.getName()] = true;
        var sheetLogs = extrairLogsDaAba_(sheet, contractId, protocol);
        if (sheetLogs && sheetLogs.length > 0) {
          history = history.concat(sheetLogs);
        }
      }
    }

    // Se ainda nao encontrou em nenhuma das candidatas, varrer todas as abas
    if (history.length === 0) {
      var allSheets = ss.getSheets();
      for (var a = 0; a < allSheets.length; a++) {
        var sh = allSheets[a];
        if (!visitedSheets[sh.getName()]) {
          var nLower = sh.getName().toLowerCase();
          if (nLower.indexOf('altera') !== -1 || nLower.indexOf('hist') !== -1 || nLower.indexOf('log') !== -1) {
            visitedSheets[sh.getName()] = true;
            var logs = extrairLogsDaAba_(sh, contractId, protocol);
            if (logs && logs.length > 0) {
              history = history.concat(logs);
            }
          }
        }
      }
    }

    // Ordenar do mais recente para o mais antigo
    history.sort(function(a, b) {
      var dateA = converterParaDataHoraValida_(a.dataHora);
      var dateB = converterParaDataHoraValida_(b.dataHora);
      if (dateA && dateB) return dateB.getTime() - dateA.getTime();
      return 0;
    });

    return {
      success: true,
      contractId: contractId,
      protocol: protocol || (contractId ? formatarProtocolo_(contractId) : ''),
      history: history
    };
  } catch (err) {
    Logger.log('Erro ao obter histórico do contrato: ' + err.message);
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
    var nowStr = Utilities.formatDate(new Date(), obterTimezoneOficial_(), 'dd/MM/yyyy HH:mm');

    var ssUrl = obterPlanilha_().getUrl();
    var folderUrl = obterOuCriarPastaAnexos_().getUrl();

    var idDisplay = 'Contrato #' + (dados.id || dados.contractId || '-');
    var assunto = dados.assunto || ('[a brisanet] Registro Contratual - ' + idDisplay + ' (' + fornecedor + ')');

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
                  '<td style="padding:4px 0;color:#64748b;font-weight:600;width:110px;">Contrato:</td>' +
                  '<td style="padding:4px 0;color:#0B316D;font-weight:700;">' + idDisplay + '</td>' +
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

// ============================================================================
// GESTÃO DE ACESSOS E DESTINATÁRIOS (ABA ACESSOS)
// ============================================================================

/**
 * Obtém ou cria a aba "Acessos" onde ficam registrados os colaboradores e e-mails
 */
function obterAbaAcessos_() {
  var ss = obterPlanilha_();
  var sheet = ss.getSheetByName(CONFIG.ACCESS_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.ACCESS_SHEET_NAME);
    var headers = ['Colaborador', 'E-mail'];
    sheet.getRange(1, 1, 1, 2).setValues([headers]);
    sheet.getRange(1, 1, 1, 2).setFontWeight('bold').setBackground('#E8E8E8');
    sheet.setFrozenRows(1);
    sheet.setColumnWidth(1, 260);
    sheet.setColumnWidth(2, 320);
  }
  return sheet;
}

/**
 * Lê todos os colaboradores e e-mails válidos da aba "Acessos" a partir da linha 2
 */
function obterUsuariosAcessos_() {
  try {
    var sheet = obterAbaAcessos_();
    var lastRow = sheet.getLastRow();
    var usuarios = [];
    if (lastRow >= 2) {
      var values = sheet.getRange(2, 1, lastRow - 1, 2).getValues();
      var emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      for (var i = 0; i < values.length; i++) {
        var nome = String(values[i][0] || '').trim();
        var email = String(values[i][1] || '').trim();
        if (email && emailRegex.test(email)) {
          usuarios.push({
            linha: i + 2,
            nome: nome || 'Colaborador',
            email: email
          });
        }
      }
    }
    return usuarios;
  } catch (e) {
    Logger.log('Erro ao ler usuários de acesso: ' + e.message);
    return [];
  }
}

/**
 * Retorna lista única de e-mails cadastrados na aba Acessos
 */
function obterListaEmailsAcessos_() {
  var usuarios = obterUsuariosAcessos_();
  var emails = [];
  for (var i = 0; i < usuarios.length; i++) {
    if (emails.indexOf(usuarios[i].email) === -1) {
      emails.push(usuarios[i].email);
    }
  }
  return emails;
}

/**
 * Diagnóstico rápido pelo menu da planilha para conferir quem está cadastrado na aba Acessos
 */
function verificarUsuariosAcessosMenu() {
  var usuarios = obterUsuariosAcessos_();
  var ui = SpreadsheetApp.getUi();
  if (usuarios.length === 0) {
    ui.alert(
      'Aba Acessos',
      'Nenhum colaborador com e-mail válido foi encontrado na aba "' + CONFIG.ACCESS_SHEET_NAME + '".\n\n' +
      'Preencha a aba a partir da linha 2:\nColuna A: Colaborador\nColuna B: E-mail',
      ui.ButtonSet.OK
    );
    return;
  }
  var listaTexto = usuarios.map(function(u) { return '• ' + u.nome + ' <' + u.email + '>'; }).join('\n');
  ui.alert(
    'Usuários Cadastrados na Aba Acessos (' + usuarios.length + ')',
    'Estes e-mails receberão os alertas automáticos de vencimento de contratos (90, 60, 30 e 7 dias):\n\n' + listaTexto,
    ui.ButtonSet.OK
  );
}

// ============================================================================
// MOTOR DE ALERTAS AUTOMÁTICOS DE RISCO DE VENCIMENTO (90, 60, 30 E 7 DIAS)
// ============================================================================

/**
 * Verifica contratos próximos do vencimento e dispara alertas por e-mail para os usuários da aba Acessos
 * Marcos de antecedência: 90 dias, 60 dias, 30 dias e 7 dias (alerta crítico).
 */
function verificarVencimentosEEnviarAlertas() {
  try {
    var sheet = obterAbaContratos_();
    var headerRow = obterLinhaCabecalho_(sheet);
    var lastRow = sheet.getLastRow();

    // 1. Obter destinatários cadastrados na aba Acessos
    var emailsDestino = obterListaEmailsAcessos_();
    if (!emailsDestino || emailsDestino.length === 0) {
      Logger.log('Nenhum e-mail de colaborador foi encontrado na aba ' + CONFIG.ACCESS_SHEET_NAME);
      return {
        success: false,
        message: 'Nenhum e-mail de colaborador foi encontrado na aba "' + CONFIG.ACCESS_SHEET_NAME + '". Preencha a aba para ativar os envios.',
        alertasEnviadosCount: 0,
        totalContratosEmRisco: 0,
        destinatarios: []
      };
    }

    if (lastRow <= headerRow) {
      return {
        success: true,
        message: 'Nenhum contrato encontrado para verificação.',
        alertasEnviadosCount: 0,
        totalContratosEmRisco: 0,
        destinatarios: emailsDestino
      };
    }

    // 2. Mapear alertas já enviados para evitar repetições indesejadas
    var logSheet = obterAbaLogs_();
    var lastLogRow = logSheet.getLastRow();
    var alertasJaDisparados = {};
    if (lastLogRow > 1) {
      var logValues = logSheet.getRange(2, 1, lastLogRow - 1, 7).getValues();
      for (var l = 0; l < logValues.length; l++) {
        var logId = String(logValues[l][1] || '').trim();
        var logCampo = String(logValues[l][4] || '').trim();
        var logNovo = String(logValues[l][6] || '').trim();
        if (logCampo.indexOf('Alerta de Vencimento') !== -1) {
          var chave = logId + '::' + logCampo + '::' + logNovo;
          alertasJaDisparados[chave] = true;
        }
      }
    }

    // 3. Ler contratos cadastrados
    var numRows = lastRow - headerRow;
    var values = sheet.getRange(headerRow + 1, 1, numRows, 32).getValues();
    var alertasEnviados = [];
    var contratosEmRiscoCount = 0;

    for (var i = 0; i < values.length; i++) {
      var row = values[i];
      var rawId = row[0];
      var fornecedor = String(row[3] || '').trim();
      if (!rawId && !fornecedor) continue;

      var status = String(row[9] || 'Ativo').trim();
      var statusLower = status.toLowerCase();
      // Não alertar contratos já encerrados ou cancelados
      if (statusLower.indexOf('encerr') !== -1 || statusLower.indexOf('cancel') !== -1) {
        continue;
      }

      var fimVigenciaRaw = row[11];
      var diasRestantes = calcularDiasParaVencer_(fimVigenciaRaw);
      if (diasRestantes === null) continue;

      var fimVigenciaFormatado = formatarDataExibicao_(fimVigenciaRaw);

      // Regra de Risco: contratos com <= 90 dias
      if (diasRestantes <= 90) {
        contratosEmRiscoCount++;
      }

      // Determinar o marco aplicável (90, 60, 30 ou 7 dias)
      var marco = null;
      if (diasRestantes <= 7 && diasRestantes >= 0) {
        marco = 7;
      } else if (diasRestantes <= 30 && diasRestantes > 7) {
        marco = 30;
      } else if (diasRestantes <= 60 && diasRestantes > 30) {
        marco = 60;
      } else if (diasRestantes <= 90 && diasRestantes > 60) {
        marco = 90;
      }

      if (marco === null) continue;

      var nomeCampoAlerta = 'Alerta de Vencimento (' + marco + ' dias)';
      var valorReferencia = 'Vencimento: ' + fimVigenciaFormatado;
      var chaveVerificacao = rawId + '::' + nomeCampoAlerta + '::' + valorReferencia;

      // Se o alerta para este marco com esta data já foi enviado, não repete
      if (alertasJaDisparados[chaveVerificacao]) {
        continue;
      }

      // Preparar dados e disparar o e-mail de alerta
      var dadosAlerta = {
        id: rawId,
        protocol: formatarProtocolo_(rawId),
        fornecedor: fornecedor,
        objeto: row[5] || '',
        status: status,
        fimVigencia: fimVigenciaFormatado,
        diasRestantes: diasRestantes,
        marco: marco,
        valorLancamento: row[14] || 0,
        moeda: row[13] || 'BRL',
        gerente: row[6] || '',
        administrativo: row[7] || '',
        destinatarios: emailsDestino
      };

      var envioRes = enviarEmailAlertaVencimento_(dadosAlerta);
      if (envioRes.success) {
        registrarLogAlteracao_(
          rawId,
          dadosAlerta.protocol,
          fornecedor,
          nomeCampoAlerta,
          '',
          valorReferencia,
          'Sistema Automático',
          emailsDestino.join(', ')
        );
        alertasJaDisparados[chaveVerificacao] = true;
        alertasEnviados.push('Contrato #' + rawId + ' (' + fornecedor + '): marco de ' + marco + ' dias (' + diasRestantes + 'd restantes)');
      }
    }

    return {
      success: true,
      alertasEnviadosCount: alertasEnviados.length,
      contratosAlertados: alertasEnviados,
      totalContratosEmRisco: contratosEmRiscoCount,
      destinatarios: emailsDestino
    };
  } catch (err) {
    Logger.log('Erro na verificação de vencimentos: ' + err.message);
    return {
      success: false,
      error: err.message,
      alertasEnviadosCount: 0,
      totalContratosEmRisco: 0,
      destinatarios: []
    };
  }
}

/**
 * Envia e-mail corporativo formatado de alerta de vencimento para a equipe
 */
function enviarEmailAlertaVencimento_(dados) {
  try {
    var validEmails = dados.destinatarios || [];
    if (validEmails.length === 0) {
      throw new Error('Nenhum e-mail de destinatário informado.');
    }

    var idDisplay = 'Contrato #' + dados.id;
    var assunto = dados.marco === 7 ?
      '[a brisanet] ALERTA CRÍTICO: Vencimento em 7 dias - ' + idDisplay + ' (' + dados.fornecedor + ')' :
      '[a brisanet] Alerta de Vencimento (' + dados.marco + ' dias) - ' + idDisplay + ' (' + dados.fornecedor + ')';

    var corMarco = '#2242D4'; // 90 dias (azul)
    var textoMarco = 'Antecedência de 90 dias';
    if (dados.marco === 60) {
      corMarco = '#E47D20'; // 60 dias (laranja)
      textoMarco = 'Antecedência de 60 dias';
    } else if (dados.marco === 30) {
      corMarco = '#9F4016'; // 30 dias (terracota)
      textoMarco = 'Atenção: 30 dias para o vencimento';
    } else if (dados.marco === 7) {
      corMarco = '#DA2468'; // 7 dias (magenta/crítico)
      textoMarco = 'Urgência Máxima: Últimos 7 dias de vigência';
    }

    var ssUrl = obterPlanilha_().getUrl();
    var folderUrl = obterOuCriarPastaAnexos_().getUrl();
    var nowStr = Utilities.formatDate(new Date(), obterTimezoneOficial_(), 'dd/MM/yyyy HH:mm');

    var htmlBody = 
      '<div style="font-family:\'Figtree\',Arial,sans-serif;background-color:#f8fafc;padding:24px;color:#0B316D;">' +
        '<div style="max-width:620px;margin:0 auto;background:#ffffff;border:1px solid #E8E8E8;border-radius:12px;overflow:hidden;box-shadow:0 4px 12px rgba(11,49,109,0.06);">' +
          
          '<div style="background:#0B316D;padding:20px 24px;border-bottom:4px solid ' + corMarco + ';">' +
            '<div style="display:flex;align-items:center;justify-content:space-between;">' +
              '<span style="background:#FF5022;color:#ffffff;font-size:12px;font-weight:800;padding:4px 10px;border-radius:6px;letter-spacing:0.5px;text-transform:lowercase;">brisanet</span>' +
              '<span style="background:' + corMarco + ';color:#ffffff;font-size:11px;font-weight:700;padding:3px 10px;border-radius:999px;">' + textoMarco + '</span>' +
            '</div>' +
            '<h2 style="color:#ffffff;margin:12px 0 0 0;font-size:18px;font-weight:700;">Alerta de Risco de Vencimento Contratual</h2>' +
            '<p style="color:#bfdbfe;margin:2px 0 0 0;font-size:11px;letter-spacing:0.8px;text-transform:lowercase;">gestão e governança de contratos · acompanhamento de vigência</p>' +
          '</div>' +

          '<div style="padding:24px;">' +
            '<p style="font-size:14px;line-height:1.6;color:#334155;margin-top:0;">' +
              'Prezados,<br><br>' +
              'Identificamos que o contrato abaixo atingiu o marco de <strong>' + dados.marco + ' dias de antecedência</strong> para o término de sua vigência. ' +
              'Favor avaliar com a equipe a necessidade de renovação, aditivo ou encerramento das atividades com o fornecedor.' +
            '</p>' +

            '<div style="background:#f0f3ff;border-left:4px solid ' + corMarco + ';border-radius:6px;padding:16px;margin:20px 0;">' +
              '<table style="width:100%;font-size:13px;border-collapse:collapse;">' +
                '<tr>' +
                  '<td style="padding:5px 0;color:#64748b;font-weight:600;width:130px;">Contrato:</td>' +
                  '<td style="padding:5px 0;color:#0B316D;font-weight:800;">' + idDisplay + '</td>' +
                '</tr>' +
                '<tr>' +
                  '<td style="padding:5px 0;color:#64748b;font-weight:600;">Fornecedor:</td>' +
                  '<td style="padding:5px 0;color:#0B316D;font-weight:700;">' + dados.fornecedor + '</td>' +
                '</tr>' +
                '<tr>' +
                  '<td style="padding:5px 0;color:#64748b;font-weight:600;">Objeto:</td>' +
                  '<td style="padding:5px 0;color:#334155;">' + (dados.objeto || '-') + '</td>' +
                '</tr>' +
                '<tr>' +
                  '<td style="padding:5px 0;color:#64748b;font-weight:600;">Fim da Vigência:</td>' +
                  '<td style="padding:5px 0;color:#b91c1c;font-weight:800;font-size:14px;">' + dados.fimVigencia + ' (' + dados.diasRestantes + ' dias restantes)</td>' +
                '</tr>' +
                '<tr>' +
                  '<td style="padding:5px 0;color:#64748b;font-weight:600;">Status Atual:</td>' +
                  '<td style="padding:5px 0;"><span style="background:#D0FF60;color:#0B316D;font-weight:700;padding:2px 8px;border-radius:999px;font-size:11px;">' + (dados.status || 'Ativo') + '</span></td>' +
                '</tr>' +
                '<tr>' +
                  '<td style="padding:5px 0;color:#64748b;font-weight:600;">Valor Lançamento:</td>' +
                  '<td style="padding:5px 0;color:#0B316D;font-weight:600;">' + (dados.moeda || 'BRL') + ' ' + (parseFloat(dados.valorLancamento) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) + '</td>' +
                '</tr>' +
                (dados.gerente ? '<tr><td style="padding:5px 0;color:#64748b;font-weight:600;">Gerente:</td><td style="padding:5px 0;color:#334155;">' + dados.gerente + '</td></tr>' : '') +
                (dados.administrativo ? '<tr><td style="padding:5px 0;color:#64748b;font-weight:600;">Administrativo:</td><td style="padding:5px 0;color:#334155;">' + dados.administrativo + '</td></tr>' : '') +
              '</table>' +
            '</div>' +

            '<div style="background:#fffbeb;border:1px solid #fef3c7;border-radius:8px;padding:14px;margin:20px 0;">' +
              '<h4 style="margin:0 0 6px 0;font-size:12px;font-weight:800;color:#b45309;text-transform:uppercase;letter-spacing:0.5px;">Ação Recomendada:</h4>' +
              '<p style="margin:0;font-size:13px;color:#92400e;line-height:1.5;">' +
                '1. Alinhe com a liderança e o fornecedor a prorrogação ou encerramento deste contrato.<br>' +
                '2. Caso o contrato seja renovado ou prorrogado, acesse os <strong>Detalhes do Contrato</strong> no sistema e atualize o campo <strong>Fim da Vigência</strong> para que novos alertas sejam redefinidos para a nova data.' +
              '</p>' +
            '</div>' +

            '<div style="text-align:center;margin-top:24px;">' +
              '<a href="' + ssUrl + '" target="_blank" style="display:inline-block;background:#2242D4;color:#ffffff;text-decoration:none;font-weight:700;font-size:13px;padding:10px 20px;border-radius:6px;margin-right:10px;">Abrir Planilha de Contratos</a>' +
              '<a href="' + folderUrl + '" target="_blank" style="display:inline-block;background:#E8E8E8;color:#0B316D;text-decoration:none;font-weight:700;font-size:13px;padding:10px 20px;border-radius:6px;">Acessar Pasta no Drive</a>' +
            '</div>' +

          '</div>' +

          '<div style="background:#f8fafc;border-top:1px solid #E8E8E8;padding:14px 24px;text-align:center;font-size:11px;color:#94a3b8;">' +
            'Este alerta automático foi emitido com base nos colaboradores cadastrados na aba Acessos · a brisanet (' + nowStr + ')' +
          '</div>' +

        '</div>' +
      '</div>';

    MailApp.sendEmail({
      to: validEmails.join(','),
      subject: assunto,
      htmlBody: htmlBody
    });

    return {
      success: true,
      recipients: validEmails
    };
  } catch (err) {
    Logger.log('Erro ao enviar e-mail de alerta de vencimento: ' + err.message);
    return {
      success: false,
      error: err.message
    };
  }
}

/**
 * Configura gatilho diário automático (às 08:00) para verificação de vencimentos
 */
function configurarGatilhoDiario() {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'verificarVencimentosEEnviarAlertas') {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }

  ScriptApp.newTrigger('verificarVencimentosEEnviarAlertas')
    .timeBased()
    .atHour(8)
    .everyDays(1)
    .create();

  try {
    var ui = SpreadsheetApp.getUi();
    ui.alert(
      'Gatilho Diário Configurado',
      'O sistema verificará diariamente às 08:00 todos os contratos próximos do vencimento (90, 60, 30 e 7 dias) e disparará os alertas por e-mail para todos os colaboradores cadastrados na aba "' + CONFIG.ACCESS_SHEET_NAME + '".',
      ui.ButtonSet.OK
    );
  } catch (e) {}

  return {
    success: true,
    message: 'Gatilho diário automático configurado com sucesso para as 08:00.'
  };
}

/**
 * Executa verificação manual e exibe resultado ao usuário
 */
function verificarVencimentosManualmente() {
  var res = verificarVencimentosEEnviarAlertas();
  try {
    var ui = SpreadsheetApp.getUi();
    var msg = 'Diagnóstico de Vencimentos Concluído.\n\n';
    if (res.alertasEnviadosCount > 0) {
      msg += 'Alertas disparados agora: ' + res.alertasEnviadosCount + ' e-mail(s).\n' +
             'Destinatários notificados: ' + res.destinatarios.join(', ') + '\n\n' +
             'Contratos alertados:\n' + res.contratosAlertados.join('\n');
    } else {
      msg += 'Nenhum contrato atingiu novos marcos de alerta de vencimento hoje.\n' +
             'Total de contratos com risco de vencimento (<= 90 dias): ' + res.totalContratosEmRisco + '\n' +
             'Colaboradores cadastrados na aba Acessos: ' + res.destinatarios.length;
    }
    ui.alert('Alerta de Vencimentos', msg, ui.ButtonSet.OK);
  } catch (e) {}
  return res;
}

// ============================================================================
// ATUALIZAÇÃO DE CAMPO INDIVIDUAL (EDIÇÃO VIA LÁPIS COM LOG EXCLUSIVO DO CAMPO)
// ============================================================================

/**
 * Atualiza um único campo específico do contrato diretamente na célula da planilha
 * e registra no histórico de auditoria estritamente a alteração desse campo.
 * @param {string|number} contractId - ID do contrato
 * @param {number} [rowNumber] - Linha sugerida na planilha
 * @param {string} chaveCampo - Identificador do campo alterado
 * @param {*} novoValor - Novo valor informado pelo usuário
 */
function atualizarCampoIndividual(contractId, rowNumber, chaveCampo, novoValor) {
  try {
    if (!contractId && !rowNumber) {
      throw new Error('Identificador do contrato não informado.');
    }
    if (!chaveCampo) {
      throw new Error('Campo para alteração não informado.');
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
      throw new Error('Contrato #' + contractId + ' não foi localizado na planilha.');
    }

    // Mapa de campos para coluna da planilha (1-indexed, 1 a 32) e nome amigável
    var mapaCampos = {
      centroCusto: { col: 2, nome: 'Centro de Custo', tipo: 'text' },
      categoria: { col: 3, nome: 'Categoria / Pacote', tipo: 'text' },
      fornecedor: { col: 4, nome: 'Fornecedor', tipo: 'text' },
      cnpj: { col: 5, nome: 'CNPJ', tipo: 'cnpj' },
      objeto: { col: 6, nome: 'Objeto do Contrato', tipo: 'text' },
      gerente: { col: 7, nome: 'Gerente / Coordenador', tipo: 'text' },
      administrativo: { col: 8, nome: 'Apoio Administrativo', tipo: 'text' },
      tipo: { col: 9, nome: 'Tipo', tipo: 'select' },
      status: { col: 10, nome: 'Status', tipo: 'select' },
      inicioVigencia: { col: 11, nome: 'Início da Vigência', tipo: 'date' },
      fimVigencia: { col: 12, nome: 'Fim da Vigência', tipo: 'date' },
      renovacaoAutomatica: { col: 13, nome: 'Renovação Automática', tipo: 'select' },
      moeda: { col: 14, nome: 'Moeda', tipo: 'select' },
      valorLancamento: { col: 15, nome: 'Valor por Lançamento', tipo: 'number' },
      periodicidade: { col: 16, nome: 'Periodicidade', tipo: 'select' },
      primeiraCompetencia: { col: 17, nome: '1ª Competência', tipo: 'date' },
      dataReajuste: { col: 18, nome: 'Data do Reajuste', tipo: 'date' },
      indice: { col: 19, nome: 'Índice de Reajuste', tipo: 'select' },
      reajusteManual: { col: 20, nome: 'Reajuste Manual (%)', tipo: 'percent' },
      impostos: { col: 22, nome: 'Impostos (%)', tipo: 'percent' },
      contingencia: { col: 25, nome: 'Contingência (%)', tipo: 'percent' },
      contaContabil: { col: 27, nome: 'Conta Contábil', tipo: 'text' },
      contratoPo: { col: 28, nome: 'Contrato / PO', tipo: 'text' },
      risco: { col: 29, nome: 'Nível de Risco', tipo: 'select' },
      descricaoRisco: { col: 30, nome: 'Descrição do Risco', tipo: 'text' },
      memoriaCalculo: { col: 31, nome: 'Fonte / Memória de Cálculo', tipo: 'textarea' },
      observacoes: { col: 32, nome: 'Notas / Observações', tipo: 'textarea' }
    };

    var configCampo = mapaCampos[chaveCampo];
    if (!configCampo) {
      throw new Error('Campo "' + chaveCampo + '" não é reconhecido para edição.');
    }

    var colIndex = configCampo.col;
    var range = sheet.getRange(targetRow, colIndex);
    var valorAnteriorRaw = range.getValue();

    // Formatar valor anterior e novo valor
    var valorAnteriorFormatado = '';
    var novoValorFormatado = '';
    var valorParaGravar = novoValor;

    if (configCampo.tipo === 'date') {
      valorAnteriorFormatado = formatarDataExibicao_(valorAnteriorRaw);
      valorParaGravar = formatarDataParaPlanilha_(novoValor);
      novoValorFormatado = formatarDataExibicao_(valorParaGravar);
    } else if (configCampo.tipo === 'cnpj') {
      valorAnteriorFormatado = formatarCnpjLimpo_(valorAnteriorRaw);
      valorParaGravar = formatarCnpjLimpo_(novoValor);
      novoValorFormatado = valorParaGravar;
    } else if (configCampo.tipo === 'number') {
      var numAnt = parseFloat(valorAnteriorRaw) || 0;
      valorAnteriorFormatado = numAnt.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      valorParaGravar = normalizarNumero_(novoValor);
      novoValorFormatado = (parseFloat(valorParaGravar) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    } else if (configCampo.tipo === 'percent') {
      var pctAnt = normalizarPorcentagem_(valorAnteriorRaw);
      valorAnteriorFormatado = pctAnt !== '' ? (pctAnt * 100).toFixed(2) + '%' : '-';
      valorParaGravar = normalizarPorcentagem_(novoValor);
      novoValorFormatado = valorParaGravar !== '' ? (valorParaGravar * 100).toFixed(2) + '%' : '-';
    } else {
      valorAnteriorFormatado = String(valorAnteriorRaw !== null && valorAnteriorRaw !== undefined ? valorAnteriorRaw : '').trim();
      valorParaGravar = String(novoValor !== null && novoValor !== undefined ? novoValor : '').trim();
      novoValorFormatado = valorParaGravar;
    }

    // Gravar o novo valor na célula
    range.setValue(valorParaGravar);

    // Se for campo financeiro, recalcular colunas dependentes caso não contenham fórmulas
    var moeda = String(sheet.getRange(targetRow, 14).getValue() || 'BRL');
    var valorLanc = parseFloat(sheet.getRange(targetRow, 15).getValue()) || 0;
    var indice = String(sheet.getRange(targetRow, 19).getValue() || 'Sem reajuste');
    var reajusteMan = normalizarPorcentagem_(sheet.getRange(targetRow, 20).getValue());
    var conting = normalizarPorcentagem_(sheet.getRange(targetRow, 25).getValue());

    var taxaCambio = 1;
    if (moeda === 'USD') taxaCambio = 5.3;
    else if (moeda === 'EUR') taxaCambio = 5.9;
    else if (moeda === 'GBP') taxaCambio = 6.8;

    var reajusteAplicado = '';
    if (reajusteMan !== '') {
      reajusteAplicado = reajusteMan;
    } else if (indice === 'IPCA') {
      reajusteAplicado = 0.0428;
    } else if (indice === 'IGP-M') {
      reajusteAplicado = 0.0411;
    } else if (indice === 'Sem reajuste') {
      reajusteAplicado = 0;
    }

    var valorBaseBRL = valorLanc * taxaCambio;
    var valorOrcado = valorBaseBRL;
    if (conting !== '' && typeof conting === 'number') {
      valorOrcado = valorBaseBRL * (1 + conting);
    }

    // Verificar se as células têm fórmulas antes de sobrepor
    var formulas = sheet.getRange(targetRow, 21, 1, 6).getFormulasR1C1()[0];
    // Col 21 (U): reajusteAplicado
    if (!formulas[0] && reajusteAplicado !== '') sheet.getRange(targetRow, 21).setValue(reajusteAplicado);
    // Col 23 (W): taxaCambio
    if (!formulas[2]) sheet.getRange(targetRow, 23).setValue(taxaCambio);
    // Col 24 (X): valorBaseBRL
    if (!formulas[3]) sheet.getRange(targetRow, 24).setValue(valorBaseBRL);
    // Col 26 (Z): valorOrcado
    if (!formulas[5]) sheet.getRange(targetRow, 26).setValue(valorOrcado);

    SpreadsheetApp.flush();

    // Obter usuário e dados adicionais para o log
    var usuario = '';
    try {
      usuario = Session.getActiveUser().getEmail() || Session.getEffectiveUser().getEmail();
    } catch (ue) {
      usuario = 'usuario.compras@grupobrisanet.com.br';
    }
    if (!usuario) usuario = 'usuario.compras@grupobrisanet.com.br';

    var fornecedor = String(sheet.getRange(targetRow, 4).getValue() || '');
    var protocol = formatarProtocolo_(contractId);

    // Registrar EXCLUSIVAMENTE o log desta alteração única
    registrarLogAlteracao_(
      contractId,
      protocol,
      fornecedor,
      configCampo.nome,
      valorAnteriorFormatado,
      novoValorFormatado,
      usuario,
      'Não'
    );

    var dataFimRow = sheet.getRange(targetRow, 12).getValue();
    var diasParaVencer = calcularDiasParaVencer_(dataFimRow);
    var nowStr = Utilities.formatDate(new Date(), obterTimezoneOficial_(), 'dd/MM/yyyy HH:mm:ss');

    return {
      success: true,
      contractId: contractId,
      protocol: protocol,
      rowNumber: targetRow,
      chaveCampo: chaveCampo,
      campoFormatado: configCampo.nome,
      valorAnterior: valorAnteriorFormatado,
      novoValor: novoValorFormatado,
      novoValorRaw: valorParaGravar,
      diasParaVencer: diasParaVencer,
      fimVigenciaFormatado: formatarDataExibicao_(dataFimRow),
      valorBaseBRL: valorBaseBRL,
      valorOrcado: valorOrcado,
      reajusteAplicado: reajusteAplicado,
      usuario: usuario,
      dataHora: nowStr
    };
  } catch (err) {
    Logger.log('Erro ao atualizar campo individual: ' + err.message);
    return {
      success: false,
      error: err.message
    };
  }
}

// ============================================================================
// ATUALIZAÇÃO COMPLETA DE CONTRATO (MODAL DE DETALHES COM LOG DETALHADO)
// ============================================================================

/**
 * Atualiza os dados completos de um contrato diretamente na planilha e registra alterações no log
 * @param {Object} dados - Objeto com os campos atualizados do contrato
 */
function atualizarContratoCompleto(dados) {
  try {
    if (!dados || !dados.id) {
      throw new Error('ID do contrato não informado para atualização.');
    }

    var sheet = obterAbaContratos_();
    var headerRow = obterLinhaCabecalho_(sheet);
    var targetRow = -1;

    // 1. Validar rowNumber ou localizar por ID
    if (dados.rowNumber && dados.rowNumber > headerRow) {
      var idNaLinha = String(sheet.getRange(dados.rowNumber, 1).getValue()).trim();
      if (idNaLinha === String(dados.id).trim()) {
        targetRow = dados.rowNumber;
      }
    }

    if (targetRow === -1) {
      var lastRow = sheet.getLastRow();
      if (lastRow > headerRow) {
        var ids = sheet.getRange(headerRow + 1, 1, lastRow - headerRow, 1).getValues();
        for (var i = 0; i < ids.length; i++) {
          if (String(ids[i][0]).trim() === String(dados.id).trim()) {
            targetRow = headerRow + 1 + i;
            break;
          }
        }
      }
    }

    if (targetRow === -1) {
      throw new Error('Contrato #' + dados.id + ' não foi localizado na planilha.');
    }

    // 2. Ler valores atuais da linha
    var valoresAtuais = sheet.getRange(targetRow, 1, 1, 32).getValues()[0];

    // 3. Processar cálculos financeiros
    var moeda = dados.moeda || valoresAtuais[13] || 'BRL';
    var valorLancamento = dados.valorLancamento !== undefined ? normalizarNumero_(dados.valorLancamento) : (valoresAtuais[14] || 0);
    var taxaCambio = 1;
    if (moeda === 'USD') taxaCambio = 5.3;
    else if (moeda === 'EUR') taxaCambio = 5.9;
    else if (moeda === 'GBP') taxaCambio = 6.8;

    var reajusteManual = dados.reajusteManual !== undefined ? normalizarPorcentagem_(dados.reajusteManual) : valoresAtuais[19];
    var reajusteAplicado = '';
    var indice = dados.indice || valoresAtuais[18] || 'Sem reajuste';
    if (reajusteManual !== '') {
      reajusteAplicado = reajusteManual;
    } else if (indice === 'IPCA') {
      reajusteAplicado = 0.0428;
    } else if (indice === 'IGP-M') {
      reajusteAplicado = 0.0411;
    } else if (indice === 'Sem reajuste') {
      reajusteAplicado = 0;
    }

    var contingencia = dados.contingencia !== undefined ? normalizarPorcentagem_(dados.contingencia) : valoresAtuais[24];
    var valorBaseBRL = valorLancamento * taxaCambio;
    var valorOrcado = valorBaseBRL;
    if (contingencia !== '' && typeof contingencia === 'number') {
      valorOrcado = valorBaseBRL * (1 + contingencia);
    }

    // 4. Montar nova linha com dados formatados
    var dataInicioFormatada = dados.inicioVigencia !== undefined ? formatarDataParaPlanilha_(dados.inicioVigencia) : valoresAtuais[10];
    var dataFimFormatada = dados.fimVigencia !== undefined ? formatarDataParaPlanilha_(dados.fimVigencia) : valoresAtuais[11];
    var dataCompetenciaFormatada = dados.primeiraCompetencia !== undefined ? formatarDataParaPlanilha_(dados.primeiraCompetencia) : valoresAtuais[16];
    var dataReajusteFormatada = dados.dataReajuste !== undefined ? formatarDataParaPlanilha_(dados.dataReajuste) : valoresAtuais[17];

    var novaLinha = [
      dados.id,                                              // A (1) ID
      dados.centroCusto !== undefined ? (dados.centroCusto || '') : valoresAtuais[1],         // B (2)
      dados.categoria !== undefined ? (dados.categoria || '') : valoresAtuais[2],             // C (3)
      dados.fornecedor !== undefined ? (dados.fornecedor || '') : valoresAtuais[3],           // D (4)
      dados.cnpj !== undefined ? formatarCnpjLimpo_(dados.cnpj) : valoresAtuais[4],          // E (5)
      dados.objeto !== undefined ? (dados.objeto || '') : valoresAtuais[5],                   // F (6)
      dados.gerente !== undefined ? (dados.gerente || '') : valoresAtuais[6],                 // G (7)
      dados.administrativo !== undefined ? (dados.administrativo || '') : valoresAtuais[7],   // H (8)
      dados.tipo !== undefined ? (dados.tipo || 'Vigente') : valoresAtuais[8],                // I (9)
      dados.status !== undefined ? (dados.status || 'Ativo') : valoresAtuais[9],              // J (10)
      dataInicioFormatada,                                   // K (11)
      dataFimFormatada,                                      // L (12)
      dados.renovacaoAutomatica !== undefined ? (dados.renovacaoAutomatica || 'Não') : valoresAtuais[12], // M (13)
      moeda,                                                 // N (14)
      valorLancamento,                                       // O (15)
      dados.periodicidade !== undefined ? (dados.periodicidade || 'Mensal') : valoresAtuais[15], // P (16)
      dataCompetenciaFormatada,                              // Q (17)
      dataReajusteFormatada,                                 // R (18)
      indice,                                                // S (19)
      reajusteManual,                                        // T (20)
      reajusteAplicado,                                      // U (21)
      dados.impostos !== undefined ? normalizarPorcentagem_(dados.impostos) : valoresAtuais[21], // V (22)
      taxaCambio,                                            // W (23)
      valorBaseBRL,                                          // X (24)
      contingencia,                                          // Y (25)
      valorOrcado,                                           // Z (26)
      dados.contaContabil !== undefined ? (dados.contaContabil || '') : valoresAtuais[26],    // AA (27)
      dados.contratoPo !== undefined ? (dados.contratoPo || '') : valoresAtuais[27],         // AB (28)
      dados.risco !== undefined ? (dados.risco || 'Baixo') : valoresAtuais[28],               // AC (29)
      dados.descricaoRisco !== undefined ? (dados.descricaoRisco || '') : valoresAtuais[29], // AD (30)
      dados.memoriaCalculo !== undefined ? (dados.memoriaCalculo || '') : valoresAtuais[30], // AE (31)
      dados.observacoes !== undefined ? (dados.observacoes || '') : valoresAtuais[31]        // AF (32)
    ];

    // Preservar fórmulas pré-existentes na planilha
    var formulas = sheet.getRange(targetRow, 1, 1, 32).getFormulasR1C1()[0];
    for (var f = 0; f < formulas.length; f++) {
      if (formulas[f] && formulas[f] !== '') {
        if (f === 20 || f === 21 || f === 22 || f === 23 || f === 25) {
          novaLinha[f] = formulas[f];
        }
      }
    }

    // 5. Comparar campos alterados para auditoria e logs
    var nomesCampos = [
      'ID', 'Centro de Custo', 'Categoria / Pacote', 'Fornecedor', 'CNPJ',
      'Objeto do Contrato', 'Gerente / Coordenador', 'Apoio Administrativo', 'Tipo', 'Status',
      'Início da Vigência', 'Fim da Vigência', 'Renovação Automática', 'Moeda', 'Valor por Lançamento',
      'Periodicidade', '1ª Competência', 'Data do Reajuste', 'Índice', 'Reajuste Manual (%)',
      'Reajuste Aplicado (%)', 'Impostos (%)', 'Taxa de Câmbio', 'Valor Base BRL', 'Contingência (%)',
      'Valor Orçado', 'Conta Contábil', 'Contrato / PO', 'Risco', 'Descrição do Risco',
      'Memória de Cálculo', 'Notas / Observações'
    ];

    var diffs = [];
    for (var col = 1; col < 32; col++) {
      var vAnt = valoresAtuais[col];
      var vNov = novaLinha[col];

      var strAnt = String(vAnt !== null && vAnt !== undefined ? vAnt : '').trim();
      var strNov = String(vNov !== null && vNov !== undefined ? vNov : '').trim();

      if (col === 10 || col === 11 || col === 16 || col === 17) {
        strAnt = formatarDataExibicao_(vAnt);
        strNov = formatarDataExibicao_(vNov);
      } else if (col === 14 || col === 23 || col === 25) {
        var numAnt = parseFloat(vAnt) || 0;
        var numNov = parseFloat(vNov) || 0;
        if (Math.abs(numAnt - numNov) > 0.009) {
          strAnt = 'R$ ' + numAnt.toFixed(2);
          strNov = 'R$ ' + numNov.toFixed(2);
        } else {
          continue;
        }
      }

      if (strAnt !== strNov) {
        diffs.push({
          coluna: col + 1,
          campo: nomesCampos[col] || ('Coluna ' + (col + 1)),
          valorAnterior: strAnt,
          novoValor: strNov
        });
      }
    }

    // 6. Gravar nova linha na planilha
    sheet.getRange(targetRow, 1, 1, 32).setValues([novaLinha]);
    SpreadsheetApp.flush();

    // 7. Obter usuário ativo e registrar histórico
    var usuario = '';
    try {
      usuario = Session.getActiveUser().getEmail() || Session.getEffectiveUser().getEmail();
    } catch (ue) {
      usuario = 'usuario.compras@grupobrisanet.com.br';
    }
    if (!usuario) usuario = 'usuario.compras@grupobrisanet.com.br';

    var protocol = formatarProtocolo_(dados.id);
    var fornecedorFinal = novaLinha[3] || 'Fornecedor';

    for (var d = 0; d < diffs.length; d++) {
      registrarLogAlteracao_(
        dados.id,
        protocol,
        fornecedorFinal,
        diffs[d].campo,
        diffs[d].valorAnterior,
        diffs[d].novoValor,
        usuario,
        'Edição no Painel de Detalhes'
      );
    }

    var diasParaVencer = calcularDiasParaVencer_(novaLinha[11]);

    return {
      success: true,
      contractId: dados.id,
      protocol: protocol,
      rowNumber: targetRow,
      changesCount: diffs.length,
      changes: diffs,
      diasParaVencer: diasParaVencer,
      novoFimVigencia: formatarDataExibicao_(novaLinha[11]),
      usuario: usuario
    };
  } catch (err) {
    Logger.log('Erro ao atualizar contrato: ' + err.message);
    return {
      success: false,
      error: err.message
    };
  }
}
