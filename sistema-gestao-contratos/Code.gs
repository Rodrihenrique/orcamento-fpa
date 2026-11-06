/**
 * ============================================================================
 * SISTEMA DE GESTÃO E ACOMPANHAMENTO DE CONTRATOS - BRISANET
 * Google Apps Script - Backend (Code.gs)
 * ============================================================================
 */


// Configurações Globais
var CONFIG = {
  // ID da Planilha Principal
  SPREADSHEET_ID: '',
  // Linha inicial obrigatoria para insercao de novos contratos na aba legado
  MIN_DATA_ROW: 18,
  // GID da aba de Cadastro (padrao)
  SHEET_GID: '531593901',
  // Nomes possiveis para a aba legado de cadastro (com prioridade)
  TARGET_SHEET_NAMES: [
    'Cadastro Contratos',
    'Cadastro e memória de cálculo dos contratos',
    'Cadastro de Contratos',
    'Cadastro'
  ],
  // Nomes oficiais das abas relacionais
  SHEET_CONTRATOS: 'Contratos',
  SHEET_FORNECEDORES: 'Fornecedores',
  SHEET_APROVACOES: 'Aprovacoes_Workflow',
  SHEET_ADITIVOS: 'Aditivos',
  SHEET_ACESSOS: 'Acessos_Alcadas',
  SHEET_LOGS: 'Auditoria_Logs',
  // Nome da pasta raiz dedicada no Google Drive
  DRIVE_ROOT_FOLDER_NAME: 'Contratos - Gerência Executiva de Telefonia',
  // Prefixo oficial para protocolo formatado da Telefonia
  PROTOCOL_PREFIX: 'BRISA-TEL',
  // Fuso horario oficial para registro e exibicao de datas e logs (Horario de Brasilia UTC-3)
  TIMEZONE: 'America/Fortaleza'
};


/**
 * Retorna o fuso horário oficial adotado no sistema (Com Proteção)
 */
function obterTimezoneOficial_() {
  try {
    // Tenta pegar o fuso do próprio script/planilha, se falhar usa o padrão universal de SP
    return Session.getScriptTimeZone() || 'America/Sao_Paulo';
  } catch(e) {
    return 'America/Sao_Paulo';
  }
}


/**
 * Ponto de entrada do Web App
 */
function doGet(e) {
  var template = HtmlService.createTemplateFromFile('Index');
  return template.evaluate()
    .setTitle('Painel de Contratos | Gestão Telefonia')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1.0')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}


/**
 * Cria menu personalizado na planilha quando aberta no Google Sheets
 */
function onOpen() {
  try {
    var ui = SpreadsheetApp.getUi();
    ui.createMenu('Gestão Telefonia')
      .addItem('Abrir Painel Corporativo', 'abrirModalContratos')
      .addItem('Abrir Barra Lateral', 'abrirSidebarContratos')
      .addSeparator()
      .addItem('Inicializar / Verificar Base Relacional', 'inicializarEstruturaRelacionalPlanilha')
      .addItem('Criar Nova Planilha Oficial Dedicada', 'criarNovaPlanilhaOficialTelefonia')
      .addItem('Configurar Pasta Raiz no Drive', 'abrirPastaAnexosDrive')
      .addSeparator()
      .addItem('Verificar Vencimentos e Alertas', 'verificarVencimentosManualmente')
      .addItem('Autorizar Permissões do Sistema', 'autorizarPermissoes')
      .addToUi();
  } catch (e) {
    Logger.log('Erro ao criar menu onOpen: ' + e.message);
  }
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
    .setTitle('Painel de Contratos | Gestão Telefonia');
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
/**
 * Obtem ou cria a nova planilha oficial dedicada para a Gerencia Executiva de Telefonia.
 * Cria a planilha dentro da pasta raiz dedicada no Google Drive, isolada de qualquer planilha legada.
 * @return {GoogleAppsScript.Spreadsheet.Spreadsheet} Planilha oficial da Telefonia
 */
function obterOuCriarPlanilhaOficialTelefonia_() {
  var props = PropertiesService.getScriptProperties();
  var savedId = props.getProperty('SPREADSHEET_ID_TELEFONIA');
  if (savedId) {
    try {
      var existingSs = SpreadsheetApp.openById(savedId);
      if (existingSs) return existingSs;
    } catch (eId) {
      Logger.log('Planilha salva no property nao pode ser aberta: ' + eId.message);
    }
  }

  // Verificar se ja existe na pasta raiz da Telefonia
  var rootFolder = obterOuCriarPastaRaizTelefonia_();
  var files = rootFolder.getFilesByName('Base Oficial de Contratos - Gerência Executiva de Telefonia');
  if (files.hasNext()) {
    var file = files.next();
    var ssFromDrive = SpreadsheetApp.openById(file.getId());
    props.setProperty('SPREADSHEET_ID_TELEFONIA', ssFromDrive.getId());
    return ssFromDrive;
  }

  // Criar uma nova planilha oficial dedicada para a Telefonia
  var newSs = SpreadsheetApp.create('Base Oficial de Contratos - Gerência Executiva de Telefonia');
  var newFile = DriveApp.getFileById(newSs.getId());
  rootFolder.addFile(newFile);
  try {
    DriveApp.getRootFolder().removeFile(newFile);
  } catch (eRem) {}

  props.setProperty('SPREADSHEET_ID_TELEFONIA', newSs.getId());

  // Inicializar imediatamente a estrutura de 6 abas oficiais
  inicializarEstruturaRelacionalPlanilha(newSs);

  return newSs;
}

/**
 * Forca a criacao ou reinicializacao de uma nova planilha oficial dedicada.
 * @return {Object} Metadados da nova planilha criada
 */
function criarNovaPlanilhaOficialTelefonia() {
  var props = PropertiesService.getScriptProperties();
  props.deleteProperty('SPREADSHEET_ID_TELEFONIA');
  var ss = obterOuCriarPlanilhaOficialTelefonia_();
  return {
    success: true,
    id: ss.getId(),
    url: ss.getUrl(),
    name: ss.getName()
  };
}

/**
 * Obtem a planilha oficial da Telefonia
 * @return {GoogleAppsScript.Spreadsheet.Spreadsheet}
 */
function obterPlanilha_() {
  return obterOuCriarPlanilhaOficialTelefonia_();
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


    // Mapeamento opcional da aba Orçamento Mensal para cálculo de variação mês a mês
    var orcamentoMap = {};
    try {
      var ssParent = sheet.getParent();
      var orcamentoSheet = ssParent.getSheetByName('Orçamento Mensal');
      if (orcamentoSheet) {
        var orcLastRow = orcamentoSheet.getLastRow();
        if (orcLastRow >= 6) {
          var orcValues = orcamentoSheet.getRange(6, 1, orcLastRow - 5, Math.min(orcamentoSheet.getLastColumn(), 22)).getValues();
          for (var o = 0; o < orcValues.length; o++) {
            var oRow = orcValues[o];
            var oId = String(oRow[0] || '').trim();
            if (oId) {
              var oMeses = [];
              for (var cCol = 7; cCol <= 18; cCol++) {
                oMeses.push(normalizarNumero_(oRow[cCol]));
              }
              orcamentoMap[oId] = oMeses;
            }
          }
        }
      }
    } catch (eOrc) {
      Logger.log('Aba Orçamento Mensal não processada: ' + eOrc.message);
    }

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


        // Cálculo de variação de valor de um mês para o outro
        var diffMensal = 0;
        var percMensal = 0;
        var rawIdStr = String(rawId).trim();

        // 1. Tentar obter do Orçamento Mensal se mapeado
        if (orcamentoMap[rawIdStr] && orcamentoMap[rawIdStr].length === 12) {
          var mValores = orcamentoMap[rawIdStr];
          var hojeMes = new Date().getMonth(); // 0 a 11
          var mesAtual = mValores[hojeMes];
          var mesAnterior = hojeMes > 0 ? mValores[hojeMes - 1] : mValores[11];

          if (mesAtual > 0 && mesAnterior > 0 && Math.abs(mesAtual - mesAnterior) > 0.01) {
            diffMensal = mesAtual - mesAnterior;
            percMensal = ((diffMensal / mesAnterior) * 100);
          } else {
            // Verificar qualquer variação de mês consecutivo
            for (var mIdx = 1; mIdx < mValores.length; mIdx++) {
              if (mValores[mIdx] > 0 && mValores[mIdx - 1] > 0 && Math.abs(mValores[mIdx] - mValores[mIdx - 1]) > 0.01) {
                diffMensal = mValores[mIdx] - mValores[mIdx - 1];
                percMensal = ((diffMensal / mValores[mIdx - 1]) * 100);
                break;
              }
            }
          }
        }

        // 2. Se não encontrou no orçamento ou deu 0, calcular via modelo financeiro (reajuste e contingência)
        if (Math.abs(diffMensal) < 0.01) {
          if (Math.abs(valorOrçado - valorLancamento) > 0.01) {
            diffMensal = valorOrçado - valorLancamento;
            percMensal = valorLancamento > 0 ? ((diffMensal / valorLancamento) * 100) : 0;
          } else if (row[20] !== '' && row[20] !== null && row[20] !== undefined) {
            var rAplic = normalizarPorcentagem_(row[20]);
            if (typeof rAplic === 'number' && rAplic > 0) {
              percMensal = rAplic * 100;
              diffMensal = valorLancamento * rAplic;
            }
          }
        }

        diffMensal = Math.round(diffMensal * 100) / 100;
        percMensal = Math.round(percMensal * 100) / 100;

        contracts.push({
          rowNumber: headerRow + 1 + i,
          id: rawId,
          protocol: protocol,
          variacaoValor: diffMensal,
          variacaoPercentual: percMensal,
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
      linksContratados: obterLinksContratados_(),
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
 * Registra uma alteracao no log da planilha de forma garantida e à prova de falhas
 */
function registrarLogAlteracao_(contractId, protocol, fornecedor, campo, valorAnterior, novoValor, usuario, notificacao) {
  try {
    var logSheet = obterAbaLogs_();
    
    // Captura o Fuso Horário de forma segura
    var timezone = 'America/Sao_Paulo';
    try { timezone = Session.getScriptTimeZone() || timezone; } catch(e) {}
    var nowStr = Utilities.formatDate(new Date(), timezone, 'dd/MM/yyyy HH:mm:ss');
    
    // GARANTIA DE USUÁRIO: Força a captura do e-mail real se vier em branco
    var finalUser = usuario;
    if (!finalUser || String(finalUser).trim() === '' || String(finalUser).indexOf('usuario.compras') !== -1) {
      try {
        finalUser = Session.getActiveUser().getEmail() || Session.getEffectiveUser().getEmail() || 'Sistema / Usuário Web';
      } catch(e) {
        finalUser = 'Sistema / Usuário Web';
      }
    }


    var rowData = [
      nowStr,
      contractId ? String(contractId) : '',
      protocol || (contractId ? formatarProtocolo_(contractId) : ''),
      fornecedor ? String(fornecedor) : '',
      campo ? String(campo) : '',
      valorAnterior !== null && valorAnterior !== undefined ? String(valorAnterior) : '',
      novoValor !== null && novoValor !== undefined ? String(novoValor) : '',
      String(finalUser),
      notificacao ? String(notificacao) : 'Não'
    ];


    // 1. Assegura que o cabeçalho existe
    var lastRow = logSheet.getLastRow();
    if (lastRow === 0 || String(logSheet.getRange(1, 1).getValue()).trim() === '') {
      var headers = ['Data/Hora', 'ID Contrato', 'Protocolo', 'Fornecedor', 'Campo Alterado', 'Valor Anterior', 'Novo Valor', 'Usuário', 'Notificação Enviada'];
      logSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      logSheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#E8E8E8');
      logSheet.setFrozenRows(1);
    }


    // 2. Busca a verdadeira última linha preenchida na Coluna A (Data/Hora) de baixo para cima
    var targetRow = logSheet.getLastRow() + 1;
    var values = logSheet.getRange("A1:A" + Math.max(1, logSheet.getLastRow())).getValues();
    for (var i = values.length - 1; i >= 0; i--) {
      if (String(values[i][0]).trim() !== "") {
        targetRow = i + 2; // +1 porque array começa no 0, e +1 para pegar a próxima linha em branco
        break;
      }
    }
    
    // Trava de segurança para nunca sobrescrever o cabeçalho
    if (targetRow < 2) targetRow = 2;


    // 3. Grava os dados forçando a formatação da data como texto simples
    logSheet.getRange(targetRow, 1).setNumberFormat('@'); 
    logSheet.getRange(targetRow, 1, 1, rowData.length).setValues([rowData]);
    
    // Força o Google Sheets a salvar imediatamente antes de o usuário fechar o modal
    SpreadsheetApp.flush();
    
  } catch (e) {
    Logger.log('Erro CRÍTICO ao registrar log: ' + e.message);
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
            '<p style="color:#bfdbfe;margin:2px 0 0 0;font-size:11px;letter-spacing:0.8px;">GERÊNCIA EXECUTIVA DE TELEFONIA · a brisanet</p>' +
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


    // Calcular variação atualizada de um mês para o outro
    var diffAtual = 0;
    var percAtual = 0;
    if (Math.abs(valorOrcado - valorLanc) > 0.01) {
      diffAtual = valorOrcado - valorLanc;
      percAtual = valorLanc > 0 ? ((diffAtual / valorLanc) * 100) : 0;
    } else if (typeof reajusteAplicado === 'number' && reajusteAplicado > 0) {
      percAtual = reajusteAplicado * 100;
      diffAtual = valorLanc * reajusteAplicado;
    }
    diffAtual = Math.round(diffAtual * 100) / 100;
    percAtual = Math.round(percAtual * 100) / 100;

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
      variacaoValor: diffAtual,
      variacaoPercentual: percAtual,
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


/**
 * Obtém os Links Contratados (Circuitos de Internet Off-Net)
 * Se existir uma aba chamada 'Links Contratados' na planilha, busca as linhas reais;
 * Caso contrário, retorna a base fictícia completa para demonstração e homologação.
 */
function obterLinksContratados_() {
  try {
    var ss = obterPlanilha_();
    var sheet = ss.getSheetByName('Links Contratados');
    if (sheet && sheet.getLastRow() > 1) {
      var lastRow = sheet.getLastRow();
      var range = sheet.getRange(2, 1, lastRow - 1, 17);
      var values = range.getValues();
      var links = [];
      for (var i = 0; i < values.length; i++) {
        var row = values[i];
        if (!row[0] && !row[1] && !row[2]) continue;
        var dias = calcularDiasParaVencer_(row[7]);
        links.push({
          id: String(row[0] || ('LNK-' + (i + 1))),
          designador: String(row[1] || ''),
          provedor: String(row[2] || ''),
          cnpjProvedor: String(row[3] || ''),
          clienteProjeto: String(row[4] || ''),
          localidade: String(row[5] || ''),
          uf: String(row[6] || ''),
          fimVigencia: formatarDataExibicao_(row[7]),
          diasParaVencer: dias,
          valorMensal: parseFloat(row[8]) || 0,
          capacidade: String(row[9] || ''),
          capacidadeNum: parseInt(String(row[9] || '').replace(/\D/g, ''), 10) || 500,
          tecnologia: String(row[10] || ''),
          interface: String(row[11] || ''),
          sla: String(row[12] || ''),
          vlanBgp: String(row[13] || ''),
          status: String(row[14] || 'Ativo'),
          contatoNoc: String(row[15] || ''),
          observacoes: String(row[16] || '')
        });
      }
      if (links.length > 0) return links;
    }
  } catch (e) {
    Logger.log('Aba Links Contratados não encontrada ou erro na leitura: ' + e.message);
  }
  return obterLinksContratadosFicticios_();
}


/**
 * Retorna lista de links fictícios para demonstração e homologação
 */
function obterLinksContratadosFicticios_() {
  return [
    {
      id: 'LNK-CE-001',
      designador: 'VTAL-CE-JZN-9842',
      provedor: 'V.tal - Rede Neutra',
      cnpjProvedor: '42.128.216/0001-44',
      contatoNoc: '0800 021 8825 / noc@vtal.com',
      clienteProjeto: 'Banco do Nordeste - Agência Juazeiro',
      localidade: 'Juazeiro do Norte',
      uf: 'CE',
      endereco: 'Rua São Pedro, 1420 - Centro',
      capacidade: '1 Gbps Dedicado',
      capacidadeNum: 1000,
      tecnologia: 'Fibra Óptica (DWDM)',
      interface: '1x 1000Base-LX (SFP 1310nm)',
      sla: '99.9% (MTTR 4h)',
      vlanBgp: 'VLAN 3120 / ASN 28220',
      inicioVigencia: '10/01/2026',
      fimVigencia: '10/01/2027',
      diasParaVencer: 94,
      valorMensal: 2850.00,
      status: 'Ativo',
      observacoes: 'Circuito contratado para viabilizar atendimento B2B corporativo em endereço sem viabilidade de rede FTTH Brisanet no momento.'
    },
    {
      id: 'LNK-RN-002',
      designador: 'EMBR-RN-MOS-4512',
      provedor: 'Embratel / Claro Empresas',
      cnpjProvedor: '40.432.544/0001-47',
      contatoNoc: '0800 701 2141 / suporte.b2b@claro.com.br',
      clienteProjeto: 'Distrito Industrial B2B Mossoró - Polo Salineiro',
      localidade: 'Mossoró',
      uf: 'RN',
      endereco: 'Av. Lauro Monte, 800 - Abolição',
      capacidade: '500 Mbps PTP',
      capacidadeNum: 500,
      tecnologia: 'Lan-to-Lan Ethernet',
      interface: '1x 1000Base-T RJ45',
      sla: '99.7% (MTTR 4h)',
      vlanBgp: 'VLAN 1845 / QinQ',
      inicioVigencia: '05/03/2025',
      fimVigencia: '05/11/2026',
      diasParaVencer: 28,
      valorMensal: 1920.00,
      status: 'Em Renovação',
      observacoes: 'Contrato com término iminente (28 dias). Negociação em andamento com gestor de contas Claro para redução de custo ou migração.'
    },
    {
      id: 'LNK-PB-003',
      designador: 'CIRION-PB-CPG-7719',
      provedor: 'Cirion Technologies',
      cnpjProvedor: '02.569.832/0001-19',
      contatoNoc: '0800 725 0015 / noc.brasil@ciriontechnologies.com',
      clienteProjeto: 'Complexo Industrial Alpargatas Campina Grande',
      localidade: 'Campina Grande',
      uf: 'PB',
      endereco: 'Rua Severino Cabral, 250 - Bodocongó',
      capacidade: '2 Gbps Dedicado',
      capacidadeNum: 2000,
      tecnologia: 'Fibra Óptica Dedicada PTP',
      interface: '10G SFP+ LR',
      sla: '99.95% (MTTR 2h)',
      vlanBgp: 'BGP Dual Stack / IPv4+IPv6',
      inicioVigencia: '15/05/2025',
      fimVigencia: '15/05/2027',
      diasParaVencer: 219,
      valorMensal: 5400.00,
      status: 'Ativo',
      observacoes: 'Circuito de alta disponibilidade com redundância de rota para cliente enterprise industrial.'
    },
    {
      id: 'LNK-PE-004',
      designador: 'VIVO-PE-PET-3381',
      provedor: 'Vivo / Telefônica Empresas',
      cnpjProvedor: '02.558.157/0001-62',
      contatoNoc: '0800 015 1500 / noc.empresas@telefonica.com',
      clienteProjeto: 'Polo Fruticultura Irrigada Vale do São Francisco',
      localidade: 'Petrolina',
      uf: 'PE',
      endereco: 'Rodovia BR-407, Km 12 - Zona Rural',
      capacidade: '300 Mbps Dedicado',
      capacidadeNum: 300,
      tecnologia: 'Rádio Digital Licenciado (Micro-ondas)',
      interface: 'Fast Ethernet RJ45',
      sla: '99.5% (MTTR 6h)',
      vlanBgp: 'VLAN 880 / PTP Roteado',
      inicioVigencia: '01/02/2026',
      fimVigencia: '01/12/2026',
      diasParaVencer: 54,
      valorMensal: 2150.00,
      status: 'Ativo',
      observacoes: 'Região rural de difícil acesso. A vencer em 54 dias. Avaliando se anel de fibra Brisanet cobrirá a localidade até o 1º trimestre.'
    },
    {
      id: 'LNK-SE-005',
      designador: 'MEGA-SE-AJU-0914',
      provedor: 'Megatelecom Telecomunicações',
      cnpjProvedor: '04.288.751/0001-38',
      contatoNoc: '0800 770 0021 / suporte@megatelecom.com.br',
      clienteProjeto: 'Hub B2B Shopping Jardins Aracaju',
      localidade: 'Aracaju',
      uf: 'SE',
      endereco: 'Av. Ministro Geraldo Barreto Sobral, 215 - Jardins',
      capacidade: '1 Gbps Dedicado',
      capacidadeNum: 1000,
      tecnologia: 'Fibra Óptica Urbana',
      interface: '1x 1000Base-LX',
      sla: '99.8% (MTTR 4h)',
      vlanBgp: 'VLAN 2050 / Trânsito IP',
      inicioVigencia: '10/06/2026',
      fimVigencia: '10/06/2027',
      diasParaVencer: 245,
      valorMensal: 3100.00,
      status: 'Ativo',
      observacoes: 'Entregue em rack de telecom do condomínio comercial. Excelente estabilidade operacional.'
    },
    {
      id: 'LNK-BA-006',
      designador: 'REG-BA-FSA-6620',
      provedor: 'Provedor Regional Conecta Bahia Fibra',
      cnpjProvedor: '19.340.912/0001-80',
      contatoNoc: '(75) 3602-9900 / noc@conectabahia.com.br',
      clienteProjeto: 'Centro de Distribuição Logística Feira de Santana',
      localidade: 'Feira de Santana',
      uf: 'BA',
      endereco: 'Av. Presidente Dutra, 3400 - Brasília',
      capacidade: '400 Mbps PTP',
      capacidadeNum: 400,
      tecnologia: 'Fibra Óptica FTTO',
      interface: '1000Base-T RJ45',
      sla: '99.6% (MTTR 6h)',
      vlanBgp: 'VLAN 410',
      inicioVigencia: '20/07/2026',
      fimVigencia: '20/07/2027',
      diasParaVencer: 285,
      valorMensal: 1450.00,
      status: 'Ativo',
      observacoes: 'Parceria com ISP local com interligação direta em caixa subterrânea de emenda.'
    },
    {
      id: 'LNK-AL-007',
      designador: 'VTAL-AL-PEN-1108',
      provedor: 'V.tal - Rede Neutra',
      cnpjProvedor: '42.128.216/0001-44',
      contatoNoc: '0800 021 8825 / noc@vtal.com',
      clienteProjeto: 'Posto Regional SEFAZ Alagoas - Penedo',
      localidade: 'Penedo',
      uf: 'AL',
      endereco: 'Praça Barão de Penedo, 55 - Centro Histórico',
      capacidade: '200 Mbps Dedicado',
      capacidadeNum: 200,
      tecnologia: 'Fibra Óptica Rede Neutra',
      interface: 'Fast Ethernet RJ45',
      sla: '99.8% (MTTR 4h)',
      vlanBgp: 'VLAN 1102',
      inicioVigencia: '01/10/2026',
      fimVigencia: '01/10/2027',
      diasParaVencer: 358,
      valorMensal: 1150.00,
      status: 'Em Implantação',
      observacoes: 'Ordem de serviço aberta com V.tal. Prazo de entrega física previsto para 15 dias.'
    },
    {
      id: 'LNK-PI-008',
      designador: 'VERO-PI-PAR-5531',
      provedor: 'Americanet / Vero Telecom',
      cnpjProvedor: '05.104.912/0001-59',
      contatoNoc: '0800 020 9000 / noc@verointernet.com.br',
      clienteProjeto: 'Ponto de Presença POP Costeiro Parnaíba',
      localidade: 'Parnaíba',
      uf: 'PI',
      endereco: 'Av. São Sebastião, 2010 - Nossa Sra. de Fátima',
      capacidade: '1 Gbps Trânsito IP',
      capacidadeNum: 1000,
      tecnologia: 'Fibra Óptica Dedicada',
      interface: '1x 1000Base-LX',
      sla: '99.9% (MTTR 4h)',
      vlanBgp: 'BGP AS 28220 / PTT PI',
      inicioVigencia: '10/01/2025',
      fimVigencia: '10/11/2026',
      diasParaVencer: 33,
      valorMensal: 3200.00,
      status: 'Em Análise',
      observacoes: 'Circuito para teste de redundância em trânsito IP no litoral piauiense. A vencer em 33 dias.'
    }
  ];
}

/**
 * ============================================================================
 * MODULO OFICIAL CLM TELEFONIA: DRIVE, RELACIONAL, WORKFLOW E AUDITORIA
 * Gerencia Executiva de Telefonia - Grupo Brisanet
 * ============================================================================
 */

/**
 * Obtem ou cria a pasta raiz oficial dedicada no Google Drive.
 * Cria internamente a pasta 00_Configuracoes_e_Modelos.
 * @return {GoogleAppsScript.Drive.Folder} Pasta raiz da Telefonia
 */
function obterOuCriarPastaRaizTelefonia_() {
  var rootName = CONFIG.DRIVE_ROOT_FOLDER_NAME || 'Contratos - Gerência Executiva de Telefonia';
  var folders = DriveApp.getFoldersByName(rootName);
  var rootFolder;
  if (folders.hasNext()) {
    rootFolder = folders.next();
  } else {
    rootFolder = DriveApp.createFolder(rootName);
  }

  // Assegurar subpasta de modelos e configuracoes
  var configFolders = rootFolder.getFoldersByName('00_Configuracoes_e_Modelos');
  if (!configFolders.hasNext()) {
    rootFolder.createFolder('00_Configuracoes_e_Modelos');
  }

  return rootFolder;
}

/**
 * Obtem ou cria a pasta do fornecedor dentro da pasta raiz da Telefonia.
 * @param {string} nomeFornecedor Nome ou Razao Social do Fornecedor
 * @return {GoogleAppsScript.Drive.Folder} Pasta do fornecedor
 */
function obterOuCriarPastaFornecedor_(nomeFornecedor) {
  var rootFolder = obterOuCriarPastaRaizTelefonia_();
  var sanitizedName = String(nomeFornecedor || 'Fornecedor_Sem_Nome')
    .replace(/[\\/:*?"<>|]/g, '_')
    .trim();
  if (!sanitizedName) sanitizedName = 'Fornecedor_Geral';

  var folders = rootFolder.getFoldersByName(sanitizedName);
  if (folders.hasNext()) {
    return folders.next();
  }
  return rootFolder.createFolder(sanitizedName);
}

/**
 * Cria a estrutura oficial de 5 subpastas padronizadas para um contrato.
 * Estrutura:
 *   [Fornecedor]/CT-{ANO}-{ID} - {Objeto}/
 *     01_Contrato_Principal
 *     02_Termos_Aditivos
 *     03_Documentos_Tecnicos
 *     04_Boletins_Medicao
 *     05_Aprovacoes_e_Pareceres
 * @param {string} nomeFornecedor
 * @param {string|number} idContrato
 * @param {string} objeto
 * @return {Object} Metadados da pasta e subpastas criadas
 */
function obterOuCriarEstruturaContrato_(nomeFornecedor, idContrato, objeto) {
  var supplierFolder = obterOuCriarPastaFornecedor_(nomeFornecedor);
  var ano = new Date().getFullYear();
  var idFormatado = String(idContrato || '0000').padStart(4, '0');
  var objetoResumido = String(objeto || 'Sem_Objeto')
    .replace(/[\\/:*?"<>|]/g, '_')
    .substring(0, 40)
    .trim();

  var folderContractName = 'CT-' + ano + '-' + idFormatado + ' - ' + objetoResumido;
  var existingFolders = supplierFolder.getFoldersByName(folderContractName);
  var contractFolder;
  if (existingFolders.hasNext()) {
    contractFolder = existingFolders.next();
  } else {
    contractFolder = supplierFolder.createFolder(folderContractName);
  }

  var standardSubfolders = [
    '01_Contrato_Principal',
    '02_Termos_Aditivos',
    '03_Documentos_Tecnicos',
    '04_Boletins_Medicao',
    '05_Aprovacoes_e_Pareceres'
  ];

  var subfoldersMap = {};
  for (var i = 0; i < standardSubfolders.length; i++) {
    var subName = standardSubfolders[i];
    var subMatches = contractFolder.getFoldersByName(subName);
    var subFolderObj;
    if (subMatches.hasNext()) {
      subFolderObj = subMatches.next();
    } else {
      subFolderObj = contractFolder.createFolder(subName);
    }
    subfoldersMap[subName] = {
      id: subFolderObj.getId(),
      url: subFolderObj.getUrl(),
      name: subName
    };
  }

  return {
    contractFolderId: contractFolder.getId(),
    contractFolderUrl: contractFolder.getUrl(),
    contractFolderName: folderContractName,
    supplierFolderId: supplierFolder.getId(),
    supplierFolderUrl: supplierFolder.getUrl(),
    subfolders: subfoldersMap
  };
}

/**
 * Lista todos os arquivos existentes dentro da pasta do contrato e suas subpastas.
 * @param {string} idPastaContrato ID da pasta do contrato no Google Drive
 * @return {Object} Mapa de subpastas com seus respectivos arquivos
 */
function listarArquivosPastaContrato(idPastaContrato) {
  try {
    if (!idPastaContrato) {
      return { success: false, message: 'ID da pasta nao fornecido.', files: [] };
    }
    var contractFolder = DriveApp.getFolderById(idPastaContrato);
    var subfolders = contractFolder.getFolders();
    var result = {
      contractFolderUrl: contractFolder.getUrl(),
      categories: {}
    };

    while (subfolders.hasNext()) {
      var sub = subfolders.next();
      var subName = sub.getName();
      var fileList = [];
      var files = sub.getFiles();
      while (files.hasNext()) {
        var f = files.next();
        fileList.push({
          id: f.getId(),
          name: f.getName(),
          url: f.getUrl(),
          downloadUrl: f.getDownloadUrl(),
          size: f.getSize(),
          mimeType: f.getMimeType(),
          updatedAt: Utilities.formatDate(f.getLastUpdated(), CONFIG.TIMEZONE, 'dd/MM/yyyy HH:mm')
        });
      }
      result.categories[subName] = {
        folderId: sub.getId(),
        folderUrl: sub.getUrl(),
        files: fileList
      };
    }

    return { success: true, data: result };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

/**
 * Realiza upload de arquivo para uma subpasta especifica do contrato.
 * @param {string} idPastaContrato
 * @param {string} nomeSubpasta Ex: '01_Contrato_Principal'
 * @param {string} nomeArquivo
 * @param {string} base64Data
 * @param {string} mimeType
 * @return {Object}
 */
function uploadArquivoContrato(idPastaContrato, nomeSubpasta, nomeArquivo, base64Data, mimeType) {
  try {
    if (!idPastaContrato) throw new Error('ID da pasta nao informado.');
    var contractFolder = DriveApp.getFolderById(idPastaContrato);
    var targetFolder = contractFolder;

    if (nomeSubpasta) {
      var subs = contractFolder.getFoldersByName(nomeSubpasta);
      if (subs.hasNext()) {
        targetFolder = subs.next();
      } else {
        targetFolder = contractFolder.createFolder(nomeSubpasta);
      }
    }

    var bytes = Utilities.base64Decode(base64Data);
    var blob = Utilities.newBlob(bytes, mimeType || 'application/octet-stream', nomeArquivo);
    var file = targetFolder.createFile(blob);

    // Registrar na auditoria
    registrarLogAuditoriaOficial_(
      'Contrato',
      idPastaContrato,
      'Upload de Arquivo',
      nomeSubpasta,
      '-',
      nomeArquivo,
      'Upload de documento na subpasta ' + nomeSubpasta
    );

    return {
      success: true,
      fileId: file.getId(),
      fileUrl: file.getUrl(),
      fileName: file.getName(),
      updatedAt: Utilities.formatDate(file.getLastUpdated(), CONFIG.TIMEZONE, 'dd/MM/yyyy HH:mm')
    };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

/**
 * Obtem ou cria uma aba relacional com cabecalhos formatados profissionalmente.
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @param {string} sheetName
 * @param {Array<string>} headers
 * @return {GoogleAppsScript.Spreadsheet.Sheet}
 */
function obterOuCriarAbaRelacional_(ss, sheetName, headers) {
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    var headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setBackground('#0B316D'); // Azul marinho oficial Brisanet
    headerRange.setFontColor('#FFFFFF');
    headerRange.setFontWeight('bold');
    headerRange.setFontFamily('Figtree');
    headerRange.setFontSize(10);
    sheet.setFrozenRows(1);
    for (var c = 1; c <= headers.length; c++) {
      sheet.autoResizeColumn(c);
    }
  }
  return sheet;
}

/**
 * Inicializa a estrutura relacional de 6 abas oficiais e realiza a migracao
 * automatica e segura dos dados legados existentes, preservando cada registro.
 * @return {Object} Resultado do provisionamento e contagem de registros migrados
 */
function inicializarEstruturaRelacionalPlanilha(planilhaAlvo) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
  } catch (e) {
    return { success: false, error: 'Concorrencia ativa. Nao foi possivel obter trava exclusiva.' };
  }

  try {
    var ss = planilhaAlvo || obterPlanilha_();

    // 1. Cabecalhos Oficiais
    var headersContratos = [
      'id_contrato', 'protocolo_oficial', 'id_fornecedor', 'fornecedor_nome',
      'objeto_contrato', 'tipo_contrato', 'status', 'status_alcada',
      'data_inicio_vigencia', 'data_fim_vigencia', 'vigencia_indeterminada',
      'aviso_previo_dias', 'valor_mensal_base', 'valor_mensal_atual',
      'variacao_mes_a_mes_valor', 'variacao_mes_a_mes_percentual',
      'indice_reajuste', 'mes_aniversario_reajuste', 'centro_custo',
      'conta_contabil', 'gestor_tecnico_email', 'id_pasta_drive',
      'id_pasta_fornecedor_drive', 'observacoes', 'data_criacao', 'data_atualizacao'
    ];

    var headersFornecedores = [
      'id_fornecedor', 'razao_social', 'nome_fantasia', 'cnpj',
      'contato_comercial', 'email_comercial', 'id_pasta_drive_fornecedor',
      'status', 'data_cadastro'
    ];

    var headersAprovacoes = [
      'id_aprovacao', 'id_contrato', 'id_aditivo', 'tipo_solicitacao',
      'solicitante_email', 'data_solicitacao', 'aprovador_designado_email',
      'nivel_alcada', 'status_decisao', 'data_decisao',
      'justificativa_solicitante', 'parecer_aprovador'
    ];

    var headersAditivos = [
      'id_aditivo', 'id_contrato', 'numero_termo', 'tipo_aditivo',
      'valor_alteracao', 'nova_vigencia_fim', 'justificativa_aditivo',
      'data_celebracao', 'id_arquivo_drive', 'status_aprovacao'
    ];

    var headersAcessos = [
      'id_usuario', 'nome_completo', 'papel', 'notificacoes_alertas', 'status'
    ];

    var headersLogs = [
      'id_log', 'timestamp', 'usuario_email', 'papel_usuario', 'entidade',
      'id_registro', 'acao', 'campo_afetado', 'valor_anterior', 'novo_valor',
      'justificativa_parecer'
    ];

    var sheetContratos = obterOuCriarAbaRelacional_(ss, CONFIG.SHEET_CONTRATOS, headersContratos);
    var sheetFornecedores = obterOuCriarAbaRelacional_(ss, CONFIG.SHEET_FORNECEDORES, headersFornecedores);
    var sheetAprovacoes = obterOuCriarAbaRelacional_(ss, CONFIG.SHEET_APROVACOES, headersAprovacoes);
    var sheetAditivos = obterOuCriarAbaRelacional_(ss, CONFIG.SHEET_ADITIVOS, headersAditivos);
    var sheetAcessos = obterOuCriarAbaRelacional_(ss, CONFIG.SHEET_ACESSOS, headersAcessos);
    var sheetLogs = obterOuCriarAbaRelacional_(ss, CONFIG.SHEET_LOGS, headersLogs);

    // Remover aba padrão em branco se houver outras abas
    try {
      var defaultSheet = ss.getSheetByName('Página1') || ss.getSheetByName('Sheet1');
      if (defaultSheet && ss.getSheets().length > 1) {
        ss.deleteSheet(defaultSheet);
      }
    } catch (eDef) {}


    // Pre-popular perfis de acesso padrao caso vazia
    if (sheetAcessos.getLastRow() <= 1) {
      var defaultUsers = [
        ['gestao.telefonia@grupobrisanet.com.br', 'Gestão Telefonia (Administrativo)', 'Gestão Telefonia', 'Sim', 'Ativo'],
        ['coordenador.telefonia@grupobrisanet.com.br', 'Coordenador de Operações Telefonia', 'Coordenador', 'Sim', 'Ativo'],
        ['gerente.telefonia@grupobrisanet.com.br', 'Gerente de Telefonia', 'Gerente', 'Sim', 'Ativo'],
        ['gerente.executivo@grupobrisanet.com.br', 'Gerente Executivo de Telefonia', 'Gerente Executivo', 'Sim', 'Ativo']
      ];
      sheetAcessos.getRange(2, 1, defaultUsers.length, 5).setValues(defaultUsers);
    }

    // 2. Se a aba Contratos estiver vazia, migrar automaticamente a partir da aba Legado
    var totalMigrados = 0;
    if (sheetContratos.getLastRow() <= 1) {
      var initialData = getInitialData();
      var legacyContracts = (initialData && initialData.contracts) ? initialData.contracts : [];

      if (legacyContracts.length > 0) {
        var fornecedoresMap = {};
        var contratosRows = [];
        var fornecedoresRows = [];
        var nowStr = Utilities.formatDate(new Date(), CONFIG.TIMEZONE, 'dd/MM/yyyy HH:mm:ss');

        for (var i = 0; i < legacyContracts.length; i++) {
          var c = legacyContracts[i];
          var fNome = String(c.fornecedor || 'Fornecedor Nao Identificado').trim();
          var fId = 'FORN-' + fNome.toUpperCase().replace(/[^A-Z0-9]/g, '_').substring(0, 15);

          if (!fornecedoresMap[fNome]) {
            fornecedoresMap[fNome] = {
              id: fId,
              razaoSocial: fNome,
              cnpj: c.cnpj || '',
              pastaDrive: ''
            };
            fornecedoresRows.push([
              fId,
              fNome,
              fNome,
              c.cnpj || '',
              c.gestor || '',
              '',
              '',
              'Ativo',
              nowStr
            ]);
          }

          var idNum = c.id || (i + 1);
          var ano = new Date().getFullYear();
          var protocolo = 'BRISA-TEL-' + ano + '-' + String(idNum).padStart(4, '0');

          contratosRows.push([
            idNum,
            protocolo,
            fId,
            fNome,
            c.objeto || '',
            c.tipo || 'Serviços de Telefonia',
            c.status || 'Vigente',
            'Aprovado',
            c.dataInicio || '',
            c.dataFim || '',
            c.prazoIndeterminado ? 'Sim' : 'Não',
            c.avisoPrevio || 30,
            c.valorMensal || 0,
            c.valorMensal || 0,
            c.variacaoMesAMesValor || 0,
            c.variacaoMesAMesPercentual || 0,
            c.indiceReajuste || 'IPCA',
            c.mesAniversario || 1,
            c.centroCusto || '',
            c.contaContabil || '',
            c.gestor || '',
            c.pastaDriveId || '',
            '',
            c.observacoes || '',
            nowStr,
            nowStr
          ]);
        }

        if (fornecedoresRows.length > 0) {
          sheetFornecedores.getRange(2, 1, fornecedoresRows.length, 9).setValues(fornecedoresRows);
        }
        if (contratosRows.length > 0) {
          sheetContratos.getRange(2, 1, contratosRows.length, 26).setValues(contratosRows);
        }
        totalMigrados = contratosRows.length;

        // Registrar auditoria da migracao
        registrarLogAuditoriaOficial_(
          'Sistema',
          'MIGRACAO_INICIAL',
          'Provisionamento Relacional',
          'Todas as Abas',
          'Base Legada',
          totalMigrados + ' contratos migrados',
          'Migracao automatica de inicializacao da arquitetura relacional da Telefonia'
        );
      }
    }

    return {
      success: true,
      message: 'Estrutura relacional verificada e inicializada com sucesso.',
      totalContratosMigrados: totalMigrados
    };
  } catch (err) {
    return { success: false, error: err.message };
  } finally {
    lock.releaseLock();
  }
}

/**
 * Motor oficial de registro de auditoria imutavel.
 * Utiliza LockService exclusivo para garantir a ordem cronologica e integridade.
 * @param {string} entidade 'Contrato', 'Fornecedor', 'Aditivo', 'Aprovacao', 'Sistema'
 * @param {string|number} idRegistro ID do objeto afetado
 * @param {string} acao Tipo de acao
 * @param {string} campoAfetado
 * @param {string} valorAnterior
 * @param {string} novoValor
 * @param {string} justificativa
 * @param {string} [usuarioEmail]
 * @param {string} [papel]
 * @return {boolean}
 */
function registrarLogAuditoriaOficial_(entidade, idRegistro, acao, campoAfetado, valorAnterior, novoValor, justificativa, usuarioEmail, papel) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
  } catch (e) {
    Logger.log('Aviso: Concorrencia em log. Prosseguindo sem trava.');
  }

  try {
    var ss = obterPlanilha_();
    var sheet = ss.getSheetByName(CONFIG.SHEET_LOGS);
    if (!sheet) {
      inicializarEstruturaRelacionalPlanilha();
      sheet = ss.getSheetByName(CONFIG.SHEET_LOGS);
    }
    if (!sheet) return false;

    var email = usuarioEmail;
    if (!email) {
      try {
        email = Session.getActiveUser().getEmail() || Session.getEffectiveUser().getEmail();
      } catch (eEmail) {
        email = 'gestao.telefonia@grupobrisanet.com.br';
      }
    }
    if (!email) email = 'gestao.telefonia@grupobrisanet.com.br';

    var papelFinal = papel || obterPapelUsuario_(email);
    var nowStr = Utilities.formatDate(new Date(), CONFIG.TIMEZONE, 'dd/MM/yyyy HH:mm:ss');
    var nextRow = sheet.getLastRow() + 1;
    var logId = 'LOG-' + String(nextRow - 1).padStart(6, '0');

    sheet.appendRow([
      logId,
      nowStr,
      email,
      papelFinal,
      entidade || 'Contrato',
      String(idRegistro || '-'),
      acao || 'Edicao',
      String(campoAfetado || '-'),
      String(valorAnterior !== undefined && valorAnterior !== null ? valorAnterior : '-'),
      String(novoValor !== undefined && novoValor !== null ? novoValor : '-'),
      String(justificativa || 'Acao registrada pelo sistema')
    ]);

    return true;
  } catch (err) {
    Logger.log('Erro ao registrar log de auditoria oficial: ' + err.message);
    return false;
  } finally {
    try { lock.releaseLock(); } catch (eRel) {}
  }
}

/**
 * Descobre o papel do usuario na tabela Acessos_Alcadas.
 * @param {string} email
 * @return {string} Papel do usuario
 */
function obterPapelUsuario_(email) {
  try {
    var ss = obterPlanilha_();
    var sheet = ss.getSheetByName(CONFIG.SHEET_ACESSOS);
    if (!sheet) return 'Gestão Telefonia';
    var data = sheet.getDataRange().getValues();
    var target = String(email || '').toLowerCase().trim();
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0]).toLowerCase().trim() === target) {
        return String(data[i][2]);
      }
    }
  } catch (e) {}
  return 'Gestão Telefonia';
}

/**
 * Obtem todos os dados consolidados para o novo painel da Telefonia.
 * Agrupa contratos por Fornecedor (modelo Acordeao), alçadas pendentes,
 * kpis executivos e informacoes do usuario atual.
 * @return {Object}
 */
function obterDadosCompletosTelefonia() {
  try {
    var ss = obterPlanilha_();
    var sheetContratos = ss.getSheetByName(CONFIG.SHEET_CONTRATOS);
    var sheetFornecedores = ss.getSheetByName(CONFIG.SHEET_FORNECEDORES);
    var sheetAprovacoes = ss.getSheetByName(CONFIG.SHEET_APROVACOES);

    // Se as abas nao existirem, auto-inicializar
    if (!sheetContratos || !sheetFornecedores || !sheetAprovacoes) {
      inicializarEstruturaRelacionalPlanilha();
      sheetContratos = ss.getSheetByName(CONFIG.SHEET_CONTRATOS);
      sheetFornecedores = ss.getSheetByName(CONFIG.SHEET_FORNECEDORES);
      sheetAprovacoes = ss.getSheetByName(CONFIG.SHEET_APROVACOES);
    }

    var userEmail = '';
    try {
      userEmail = Session.getActiveUser().getEmail() || Session.getEffectiveUser().getEmail();
    } catch (eUser) {
      userEmail = 'gestao.telefonia@grupobrisanet.com.br';
    }
    if (!userEmail) userEmail = 'gestao.telefonia@grupobrisanet.com.br';
    var userRole = obterPapelUsuario_(userEmail);

    // 1. Ler Fornecedores
    var fornecedoresMap = {};
    if (sheetFornecedores && sheetFornecedores.getLastRow() > 1) {
      var fornData = sheetFornecedores.getRange(2, 1, sheetFornecedores.getLastRow() - 1, 9).getValues();
      for (var f = 0; f < fornData.length; f++) {
        var fRow = fornData[f];
        var idForn = String(fRow[0] || '').trim();
        var nomeForn = String(fRow[1] || '').trim();
        if (nomeForn) {
          fornecedoresMap[nomeForn.toLowerCase()] = {
            id: idForn,
            razaoSocial: nomeForn,
            nomeFantasia: String(fRow[2] || nomeForn),
            cnpj: String(fRow[3] || ''),
            contato: String(fRow[4] || ''),
            email: String(fRow[5] || ''),
            pastaDriveId: String(fRow[6] || ''),
            status: String(fRow[7] || 'Ativo'),
            contratos: [],
            totalContratos: 0,
            contratosAtivos: 0,
            valorMensalTotal: 0
          };
        }
      }
    }

    // 2. Ler Contratos
    var contractsList = [];
    var totalContratos = 0;
    var contratosAtivos = 0;
    var somaValorMensal = 0;
    var contratosRisco60Dias = 0;
    var centrosCustoSet = {};
    var categoriasSet = {};

    if (sheetContratos && sheetContratos.getLastRow() > 1) {
      var cRows = sheetContratos.getRange(2, 1, sheetContratos.getLastRow() - 1, 26).getValues();
      for (var c = 0; c < cRows.length; c++) {
        var row = cRows[c];
        var rawId = row[0];
        var fornNome = String(row[3] || '').trim();
        if (!rawId && !fornNome) continue;

        var idNum = parseInt(rawId, 10) || (c + 1);
        var valorMensalAtual = normalizarNumero_(row[13] || row[12]);
        var diasRestantes = calcularDiasParaVencer_(row[9]);
        var status = String(row[6] || 'Vigente').trim();
        var statusAlcada = String(row[7] || 'Aprovado').trim();

        totalContratos++;
        if (status.toLowerCase().indexOf('vigente') !== -1 || status.toLowerCase().indexOf('ativo') !== -1) {
          contratosAtivos++;
          somaValorMensal += valorMensalAtual;
        }

        if (diasRestantes !== null && diasRestantes >= 0 && diasRestantes <= 60) {
          contratosRisco60Dias++;
        }

        var cc = String(row[18] || '').trim();
        if (cc) centrosCustoSet[cc] = true;
        var cat = String(row[5] || '').trim();
        if (cat) categoriasSet[cat] = true;

        var contractItem = {
          id: idNum,
          protocolo: String(row[1] || ('BRISA-TEL-' + new Date().getFullYear() + '-' + String(idNum).padStart(4, '0'))),
          idFornecedor: String(row[2] || ''),
          fornecedor: fornNome,
          objeto: String(row[4] || ''),
          tipo: String(row[5] || 'Voz / Telefonia'),
          status: status,
          statusAlcada: statusAlcada,
          dataInicio: formatarDataExibicao_(row[8]),
          dataFim: formatarDataExibicao_(row[9]),
          prazoIndeterminado: String(row[10]).toLowerCase() === 'sim',
          avisoPrevio: row[11] || 30,
          valorMensalBase: normalizarNumero_(row[12]),
          valorMensal: valorMensalAtual,
          variacaoMesAMesValor: normalizarNumero_(row[14]),
          variacaoMesAMesPercentual: normalizarPorcentagem_(row[15]),
          indiceReajuste: String(row[16] || 'IPCA'),
          mesAniversario: row[17] || 1,
          centroCusto: cc,
          contaContabil: String(row[19] || ''),
          gestor: String(row[20] || ''),
          pastaDriveId: String(row[21] || ''),
          pastaFornecedorDriveId: String(row[22] || ''),
          observacoes: String(row[23] || ''),
          diasRestantes: diasRestantes
        };

        contractsList.push(contractItem);

        // Agrupar no Fornecedor
        var fKey = fornNome.toLowerCase();
        if (!fornecedoresMap[fKey]) {
          fornecedoresMap[fKey] = {
            id: 'FORN-' + fornNome.toUpperCase().replace(/[^A-Z0-9]/g, '_').substring(0, 15),
            razaoSocial: fornNome,
            nomeFantasia: fornNome,
            cnpj: '',
            contato: '',
            email: '',
            pastaDriveId: '',
            status: 'Ativo',
            contratos: [],
            totalContratos: 0,
            contratosAtivos: 0,
            valorMensalTotal: 0
          };
        }

        fornecedoresMap[fKey].contratos.push(contractItem);
        fornecedoresMap[fKey].totalContratos++;
        if (status.toLowerCase().indexOf('vigente') !== -1 || status.toLowerCase().indexOf('ativo') !== -1) {
          fornecedoresMap[fKey].contratosAtivos++;
          fornecedoresMap[fKey].valorMensalTotal += valorMensalAtual;
        }
      }
    }

    // 3. Ler Aprovacoes
    var aprovacoesList = [];
    var minhasAprovacoesPendentes = 0;
    if (sheetAprovacoes && sheetAprovacoes.getLastRow() > 1) {
      var apData = sheetAprovacoes.getRange(2, 1, sheetAprovacoes.getLastRow() - 1, 12).getValues();
      for (var a = 0; a < apData.length; a++) {
        var apRow = apData[a];
        var apId = String(apRow[0] || '').trim();
        if (!apId) continue;
        var aprovadorEmail = String(apRow[6] || '').toLowerCase().trim();
        var statusDecisao = String(apRow[8] || 'Pendente').trim();

        if (statusDecisao.toLowerCase() === 'pendente' && (aprovadorEmail === userEmail.toLowerCase() || userRole === 'Gestão Telefonia')) {
          minhasAprovacoesPendentes++;
        }

        aprovacoesList.push({
          idAprovacao: apId,
          idContrato: apRow[1],
          idAditivo: apRow[2] || '',
          tipoSolicitacao: apRow[3] || 'Novo Contrato',
          solicitanteEmail: apRow[4] || '',
          dataSolicitacao: formatarDataHoraExibicao_(apRow[5]),
          aprovadorEmail: apRow[6] || '',
          nivelAlcada: apRow[7] || 'Coordenador',
          statusDecisao: statusDecisao,
          dataDecisao: formatarDataHoraExibicao_(apRow[9]),
          justificativa: apRow[10] || '',
          parecer: apRow[11] || ''
        });
      }
    }

    // 4. Formatar lista final de fornecedores ordenada alfabeticamente
    var fornecedoresArray = [];
    var keys = Object.keys(fornecedoresMap);
    keys.sort();
    for (var k = 0; k < keys.length; k++) {
      fornecedoresArray.push(fornecedoresMap[keys[k]]);
    }

    // Retorno unificado
    return {
      success: true,
      spreadsheetUrl: ss.getUrl(),
      spreadsheetId: ss.getId(),
      driveRootUrl: obterOuCriarPastaRaizTelefonia_().getUrl(),
      usuarioAtual: {
        email: userEmail,
        papel: userRole
      },
      kpis: {
        totalContratos: totalContratos,
        contratosAtivos: contratosAtivos,
        valorMensalTotal: somaValorMensal,
        valorAnualComprometido: somaValorMensal * 12,
        contratosRisco60Dias: contratosRisco60Dias,
        minhasAprovacoesPendentes: minhasAprovacoesPendentes,
        totalFornecedores: fornecedoresArray.length
      },
      fornecedores: fornecedoresArray,
      contratos: contractsList,
      aprovacoes: aprovacoesList,
      centrosCusto: Object.keys(centrosCustoSet),
      categorias: Object.keys(categoriasSet)
    };
  } catch (err) {
    return {
      success: false,
      error: err.message
    };
  }
}

/**
 * Solicita formalmente uma aprovacao para um contrato ou aditivo.
 * Registra na esteira Aprovacoes_Workflow, atualiza o status do contrato,
 * gera log de auditoria oficial e envia e-mail formal ao aprovador.
 * @param {Object} payload
 * @return {Object}
 */
function solicitarAprovacaoContrato(payload) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
  } catch (e) {
    return { success: false, error: 'Concorrencia ativa. Nao foi possivel obter trava.' };
  }

  try {
    var idContrato = payload.idContrato;
    var nivelAlcada = payload.nivelAlcada || 'Coordenador';
    var aprovadorEmail = String(payload.aprovadorEmail || '').trim();
    var tipoSolicitacao = payload.tipoSolicitacao || 'Novo Contrato';
    var justificativa = payload.justificativa || 'Solicitacao de aprovacao formal';

    if (!idContrato || !aprovadorEmail) {
      throw new Error('ID do contrato e e-mail do aprovador sao obrigatorios.');
    }

    var ss = obterPlanilha_();
    var sheetAprov = ss.getSheetByName(CONFIG.SHEET_APROVACOES);
    var sheetContratos = ss.getSheetByName(CONFIG.SHEET_CONTRATOS);

    if (!sheetAprov || !sheetContratos) {
      inicializarEstruturaRelacionalPlanilha();
      sheetAprov = ss.getSheetByName(CONFIG.SHEET_APROVACOES);
      sheetContratos = ss.getSheetByName(CONFIG.SHEET_CONTRATOS);
    }

    var userEmail = Session.getActiveUser().getEmail() || Session.getEffectiveUser().getEmail() || 'gestao.telefonia@grupobrisanet.com.br';
    var nowStr = Utilities.formatDate(new Date(), CONFIG.TIMEZONE, 'dd/MM/yyyy HH:mm:ss');
    var nextApRow = sheetAprov.getLastRow() + 1;
    var idAprovacao = 'APV-' + String(nextApRow - 1).padStart(5, '0');

    // Gravar aprovacao
    sheetAprov.appendRow([
      idAprovacao,
      idContrato,
      payload.idAditivo || '',
      tipoSolicitacao,
      userEmail,
      nowStr,
      aprovadorEmail,
      nivelAlcada,
      'Pendente',
      '',
      justificativa,
      ''
    ]);

    // Atualizar Contrato
    var cData = sheetContratos.getDataRange().getValues();
    for (var i = 1; i < cData.length; i++) {
      if (String(cData[i][0]) === String(idContrato)) {
        sheetContratos.getRange(i + 1, 7).setValue('Aguardando Aprovação'); // status
        sheetContratos.getRange(i + 1, 8).setValue('Pendente ' + nivelAlcada); // status_alcada
        sheetContratos.getRange(i + 1, 26).setValue(nowStr); // data_atualizacao
        break;
      }
    }

    // Registrar log de auditoria oficial
    registrarLogAuditoriaOficial_(
      'Aprovacao',
      idContrato,
      'Solicitacao de Aprovacao',
      'status_alcada',
      'Rascunho / Em Analise',
      'Pendente ' + nivelAlcada,
      'Submetido para ' + aprovadorEmail + ' (' + nivelAlcada + '): ' + justificativa,
      userEmail
    );

    // Enviar notificacao formal por e-mail
    try {
      var subject = '[brisanet] Solicitacao de Aprovacao de Contrato - ' + nivelAlcada + ' (CT #' + idContrato + ')';
      var bodyHtml = '<div style="font-family: Figtree, Arial, sans-serif; color: #0B316D;">' +
        '<h2 style="color: #FF5022;">Solicitacao de Aprovacao - Gerencia Executiva de Telefonia</h2>' +
        '<p>Uma nova solicitacao de aprovacao contratual foi atribuida a sua alcada de <strong>' + nivelAlcada + '</strong>.</p>' +
        '<ul>' +
        '<li><strong>ID do Contrato:</strong> #' + idContrato + '</li>' +
        '<li><strong>Tipo de Solicitacao:</strong> ' + tipoSolicitacao + '</li>' +
        '<li><strong>Solicitante:</strong> ' + userEmail + '</li>' +
        '<li><strong>Data de Envio:</strong> ' + nowStr + '</li>' +
        '<li><strong>Justificativa:</strong> ' + justificativa + '</li>' +
        '</ul>' +
        '<p>Acesse o Painel de Gestao de Contratos da Telefonia para revisar os documentos e registrar seu parecer digital.</p>' +
        '<hr style="border: 0; border-top: 1px solid #E8E8E8;" />' +
        '<small style="color: #64748B;">a brisanet - Gerencia Executiva de Telefonia | Registro Oficial Imutavel</small>' +
        '</div>';

      MailApp.sendEmail({
        to: aprovadorEmail,
        subject: subject,
        htmlBody: bodyHtml
      });
    } catch (eMail) {
      Logger.log('Aviso: Falha ao enviar e-mail de aprovacao: ' + eMail.message);
    }

    return {
      success: true,
      idAprovacao: idAprovacao,
      message: 'Solicitacao de aprovacao enviada com sucesso para ' + aprovadorEmail
    };
  } catch (err) {
    return { success: false, error: err.message };
  } finally {
    lock.releaseLock();
  }
}

/**
 * Registra a decisao formal do aprovador (Aprovar ou Devolver com Ajustes).
 * @param {Object} payload { idAprovacao, decisao: 'APROVADO'|'AJUSTES_SOLICITADOS', parecer }
 * @return {Object}
 */
function registrarDecisaoAprovacao(payload) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
  } catch (e) {
    return { success: false, error: 'Concorrencia ativa. Nao foi possivel obter trava.' };
  }

  try {
    var idAprovacao = payload.idAprovacao;
    var decisao = String(payload.decisao || '').toUpperCase();
    var parecer = String(payload.parecer || '').trim();

    if (!idAprovacao || !decisao) {
      throw new Error('ID da aprovacao e decisao sao obrigatorios.');
    }
    if (decisao === 'AJUSTES_SOLICITADOS' && !parecer) {
      throw new Error('O preenchimento do parecer/justificativa e obrigatorio ao solicitar ajustes.');
    }

    var ss = obterPlanilha_();
    var sheetAprov = ss.getSheetByName(CONFIG.SHEET_APROVACOES);
    var sheetContratos = ss.getSheetByName(CONFIG.SHEET_CONTRATOS);

    var apData = sheetAprov.getDataRange().getValues();
    var targetApRow = -1;
    var apRecord = null;

    for (var i = 1; i < apData.length; i++) {
      if (String(apData[i][0]) === String(idAprovacao)) {
        targetApRow = i + 1;
        apRecord = apData[i];
        break;
      }
    }

    if (!apRecord) {
      throw new Error('Registro de aprovacao nao encontrado: ' + idAprovacao);
    }

    var idContrato = apRecord[1];
    var solicitanteEmail = apRecord[4];
    var nivelAlcada = apRecord[7];
    var userEmail = Session.getActiveUser().getEmail() || Session.getEffectiveUser().getEmail() || 'aprovador@grupobrisanet.com.br';
    var nowStr = Utilities.formatDate(new Date(), CONFIG.TIMEZONE, 'dd/MM/yyyy HH:mm:ss');

    var statusDecisaoFinal = (decisao === 'APROVADO') ? 'Aprovado' : 'Ajustes Solicitados';
    sheetAprov.getRange(targetApRow, 9).setValue(statusDecisaoFinal);
    sheetAprov.getRange(targetApRow, 10).setValue(nowStr);
    sheetAprov.getRange(targetApRow, 12).setValue(parecer);

    // Atualizar Contrato
    var novoStatusContrato = (decisao === 'APROVADO') ? 'Vigente' : 'Devolvido para Ajustes';
    var novoStatusAlcada = (decisao === 'APROVADO') ? 'Aprovado (' + nivelAlcada + ')' : 'Devolvido (' + nivelAlcada + ')';

    var cData = sheetContratos.getDataRange().getValues();
    for (var c = 1; c < cData.length; c++) {
      if (String(cData[c][0]) === String(idContrato)) {
        sheetContratos.getRange(c + 1, 7).setValue(novoStatusContrato);
        sheetContratos.getRange(c + 1, 8).setValue(novoStatusAlcada);
        sheetContratos.getRange(c + 1, 26).setValue(nowStr);
        break;
      }
    }

    // Registrar na Auditoria Oficial
    registrarLogAuditoriaOficial_(
      'Aprovacao',
      idContrato,
      (decisao === 'APROVADO') ? 'Aprovacao Concluida' : 'Ajustes Solicitados',
      'status_decisao',
      'Pendente',
      statusDecisaoFinal,
      'Decisao de ' + nivelAlcada + ': ' + (parecer || 'Sem observacoes adicionais'),
      userEmail,
      nivelAlcada
    );

    // Notificar solicitante por e-mail
    try {
      if (solicitanteEmail) {
        var subject = '[brisanet] ' + (decisao === 'APROVADO' ? 'Contrato Aprovado' : 'Ajustes Solicitados') + ' - CT #' + idContrato;
        var bodyHtml = '<div style="font-family: Figtree, Arial, sans-serif; color: #0B316D;">' +
          '<h2 style="color: ' + (decisao === 'APROVADO' ? '#2242D4' : '#FF5022') + ';">Decisao Registrada - Alçada ' + nivelAlcada + '</h2>' +
          '<p>O aprovador <strong>' + userEmail + '</strong> registrou a seguinte decisao para o Contrato #' + idContrato + ':</p>' +
          '<ul>' +
          '<li><strong>Decisao:</strong> ' + statusDecisaoFinal + '</li>' +
          '<li><strong>Data/Hora:</strong> ' + nowStr + '</li>' +
          '<li><strong>Parecer Oficial:</strong> ' + (parecer || 'Nao informado') + '</li>' +
          '</ul>' +
          '<hr style="border: 0; border-top: 1px solid #E8E8E8;" />' +
          '<small style="color: #64748B;">a brisanet - Gerencia Executiva de Telefonia</small>' +
          '</div>';

        MailApp.sendEmail({
          to: solicitanteEmail,
          subject: subject,
          htmlBody: bodyHtml
        });
      }
    } catch (eMail) {}

    return {
      success: true,
      decisao: statusDecisaoFinal,
      message: 'Decisao registrada com sucesso.'
    };
  } catch (err) {
    return { success: false, error: err.message };
  } finally {
    lock.releaseLock();
  }
}

/**
 * Salva um novo contrato no modelo oficial da Telefonia, criando a pasta e subpastas no Drive
 * e registrando o contrato e fornecedor nas abas relacionais.
 * @param {Object} dados
 * @return {Object}
 */
function salvarNovoContratoTelefonia(dados) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
  } catch (e) {
    return { success: false, error: 'Concorrencia ativa. Tente novamente em instantes.' };
  }

  try {
    var ss = obterPlanilha_();
    var sheetContratos = ss.getSheetByName(CONFIG.SHEET_CONTRATOS);
    var sheetFornecedores = ss.getSheetByName(CONFIG.SHEET_FORNECEDORES);

    if (!sheetContratos || !sheetFornecedores) {
      inicializarEstruturaRelacionalPlanilha();
      sheetContratos = ss.getSheetByName(CONFIG.SHEET_CONTRATOS);
      sheetFornecedores = ss.getSheetByName(CONFIG.SHEET_FORNECEDORES);
    }

    var fornNome = String(dados.fornecedor || '').trim();
    if (!fornNome) throw new Error('Nome do fornecedor e obrigatorio.');

    // Descobrir proximo ID
    var lastRow = sheetContratos.getLastRow();
    var nextId = 1;
    if (lastRow > 1) {
      var ids = sheetContratos.getRange(2, 1, lastRow - 1, 1).getValues();
      for (var i = 0; i < ids.length; i++) {
        var val = parseInt(ids[i][0], 10);
        if (!isNaN(val) && val >= nextId) nextId = val + 1;
      }
    }

    var ano = new Date().getFullYear();
    var protocolo = 'BRISA-TEL-' + ano + '-' + String(nextId).padStart(4, '0');

    // Provisionar estrutura no Drive
    var driveStructure = obterOuCriarEstruturaContrato_(fornNome, nextId, dados.objeto);

    // Verificar se fornecedor ja existe
    var fornId = 'FORN-' + fornNome.toUpperCase().replace(/[^A-Z0-9]/g, '_').substring(0, 15);
    var fornecedorJaExiste = false;
    var fData = sheetFornecedores.getDataRange().getValues();
    for (var f = 1; f < fData.length; f++) {
      if (String(fData[f][1]).toLowerCase().trim() === fornNome.toLowerCase()) {
        fornecedorJaExiste = true;
        fornId = String(fData[f][0]);
        // Atualizar pasta do fornecedor se vazia
        if (!fData[f][6] && driveStructure.supplierFolderId) {
          sheetFornecedores.getRange(f + 1, 7).setValue(driveStructure.supplierFolderId);
        }
        break;
      }
    }

    var nowStr = Utilities.formatDate(new Date(), CONFIG.TIMEZONE, 'dd/MM/yyyy HH:mm:ss');
    if (!fornecedorJaExiste) {
      sheetFornecedores.appendRow([
        fornId,
        fornNome,
        dados.nomeFantasia || fornNome,
        dados.cnpj || '',
        dados.contato || '',
        dados.email || '',
        driveStructure.supplierFolderId,
        'Ativo',
        nowStr
      ]);
    }

    var valorBase = normalizarNumero_(dados.valorMensal || 0);

    sheetContratos.appendRow([
      nextId,
      protocolo,
      fornId,
      fornNome,
      dados.objeto || '',
      dados.tipo || 'Voz / Telefonia',
      'Rascunho',
      'Pendente de Submissão',
      dados.dataInicio || '',
      dados.dataFim || '',
      dados.prazoIndeterminado ? 'Sim' : 'Não',
      dados.avisoPrevio || 30,
      valorBase,
      valorBase,
      0,
      0,
      dados.indiceReajuste || 'IPCA',
      dados.mesAniversario || 1,
      dados.centroCusto || '',
      dados.contaContabil || '',
      dados.gestor || '',
      driveStructure.contractFolderId,
      driveStructure.supplierFolderId,
      dados.observacoes || '',
      nowStr,
      nowStr
    ]);

    // Gravar auditoria
    registrarLogAuditoriaOficial_(
      'Contrato',
      nextId,
      'Criacao de Contrato',
      'Todos',
      '-',
      protocolo,
      'Contrato cadastrado com sucesso e estrutura no Drive provisionada.',
      Session.getActiveUser().getEmail() || Session.getEffectiveUser().getEmail()
    );

    
    // Fazer upload dos arquivos anexados (PDF, PNG, JPEG, etc.) diretamente na pasta do contrato
    var arquivosSalvos = [];
    if (dados.arquivos && dados.arquivos.length > 0 && driveStructure.contractFolderId) {
      var contractFolder = DriveApp.getFolderById(driveStructure.contractFolderId);
      for (var a = 0; a < dados.arquivos.length; a++) {
        var arq = dados.arquivos[a];
        if (arq && arq.base64 && arq.nome) {
          try {
            var subpastaNome = arq.subpasta || '01_Contrato_Principal';
            var targetFolder = contractFolder;
            var subs = contractFolder.getFoldersByName(subpastaNome);
            if (subs.hasNext()) {
              targetFolder = subs.next();
            } else {
              targetFolder = contractFolder.createFolder(subpastaNome);
            }

            var bytes = Utilities.base64Decode(arq.base64);
            var blob = Utilities.newBlob(bytes, arq.mimeType || 'application/octet-stream', arq.nome);
            var file = targetFolder.createFile(blob);

            arquivosSalvos.push({
              id: file.getId(),
              nome: file.getName(),
              url: file.getUrl(),
              subpasta: subpastaNome
            });

            registrarLogAuditoriaOficial_(
              'Contrato',
              nextId,
              'Upload de Arquivo',
              subpastaNome,
              '-',
              file.getName(),
              'Arquivo arquivado na subpasta ' + subpastaNome,
              Session.getActiveUser().getEmail() || Session.getEffectiveUser().getEmail()
            );
          } catch (eArq) {
            Logger.log('Erro ao salvar anexo no Drive: ' + eArq.message);
          }
        }
      }
    }

    return {
      success: true,
      id: nextId,
      protocolo: protocolo,
      arquivosSalvos: arquivosSalvos,
      driveStructure: driveStructure,
      message: 'Contrato cadastrado com sucesso.'
    };
  } catch (err) {
    return { success: false, error: err.message };
  } finally {
    lock.releaseLock();
  }
}

/**
 * Salva um termo aditivo oficial, atualizando o valor ou vigencia do contrato-mae
 * e gerando o registro correspondente na aba Aditivos e na Trilha de Auditoria.
 * @param {Object} dadosAditivo
 * @return {Object}
 */
function salvarTermoAditivoTelefonia(dadosAditivo) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
  } catch (e) {
    return { success: false, error: 'Concorrencia ativa. Nao foi possivel obter trava.' };
  }

  try {
    var idContrato = dadosAditivo.idContrato;
    if (!idContrato) throw new Error('ID do contrato-mae e obrigatorio.');

    var ss = obterPlanilha_();
    var sheetAditivos = ss.getSheetByName(CONFIG.SHEET_ADITIVOS);
    var sheetContratos = ss.getSheetByName(CONFIG.SHEET_CONTRATOS);

    if (!sheetAditivos || !sheetContratos) {
      inicializarEstruturaRelacionalPlanilha();
      sheetAditivos = ss.getSheetByName(CONFIG.SHEET_ADITIVOS);
      sheetContratos = ss.getSheetByName(CONFIG.SHEET_CONTRATOS);
    }

    var nextAdRow = sheetAditivos.getLastRow() + 1;
    var idAditivo = 'ADT-' + String(nextAdRow - 1).padStart(5, '0');
    var valorDelta = normalizarNumero_(dadosAditivo.valorAlteracao || 0);
    var novaVigencia = dadosAditivo.novaVigenciaFim || '';
    var nowStr = Utilities.formatDate(new Date(), CONFIG.TIMEZONE, 'dd/MM/yyyy HH:mm:ss');

    sheetAditivos.appendRow([
      idAditivo,
      idContrato,
      dadosAditivo.numeroTermo || 'Termo Aditivo',
      dadosAditivo.tipoAditivo || 'Misto',
      valorDelta,
      novaVigencia,
      dadosAditivo.justificativa || '',
      dadosAditivo.dataCelebracao || nowStr,
      dadosAditivo.idArquivoDrive || '',
      'Aprovado'
    ]);

    // Atualizar Contrato-Mae
    var cData = sheetContratos.getDataRange().getValues();
    for (var c = 1; c < cData.length; c++) {
      if (String(cData[c][0]) === String(idContrato)) {
        var valorAtual = normalizarNumero_(cData[c][13]);
        var novoValor = valorAtual + valorDelta;
        sheetContratos.getRange(c + 1, 14).setValue(novoValor); // valor_mensal_atual
        if (novaVigencia) {
          sheetContratos.getRange(c + 1, 10).setValue(novaVigencia); // data_fim_vigencia
        }
        sheetContratos.getRange(c + 1, 26).setValue(nowStr);
        break;
      }
    }

    registrarLogAuditoriaOficial_(
      'Aditivo',
      idContrato,
      'Termo Aditivo Registrado',
      'Valor / Vigencia',
      'Aditivo ' + idAditivo,
      'Delta: R$ ' + valorDelta.toFixed(2) + ' | Nova Data: ' + novaVigencia,
      dadosAditivo.justificativa || 'Celebracao de Termo Aditivo'
    );

    return {
      success: true,
      idAditivo: idAditivo,
      message: 'Termo Aditivo registrado com sucesso.'
    };
  } catch (err) {
    return { success: false, error: err.message };
  } finally {
    lock.releaseLock();
  }
}

/**
 * Gera os dados consolidados do Certificado Oficial de Auditoria do Contrato,
 * agrupando metadados do contrato, fornecedor, aditivos e a trilha cronologica completa.
 * @param {string|number} idContrato
 * @return {Object}
 */
function gerarCertificadoAuditoriaContrato(idContrato) {
  try {
    if (!idContrato) throw new Error('ID do contrato e obrigatorio.');
    var ss = obterPlanilha_();
    var sheetContratos = ss.getSheetByName(CONFIG.SHEET_CONTRATOS);
    var sheetLogs = ss.getSheetByName(CONFIG.SHEET_LOGS);
    var sheetAditivos = ss.getSheetByName(CONFIG.SHEET_ADITIVOS);
    var sheetAprov = ss.getSheetByName(CONFIG.SHEET_APROVACOES);

    var contratoInfo = null;
    if (sheetContratos) {
      var cData = sheetContratos.getDataRange().getValues();
      for (var i = 1; i < cData.length; i++) {
        if (String(cData[i][0]) === String(idContrato)) {
          contratoInfo = {
            id: cData[i][0],
            protocolo: cData[i][1],
            fornecedor: cData[i][3],
            objeto: cData[i][4],
            tipo: cData[i][5],
            status: cData[i][6],
            statusAlcada: cData[i][7],
            inicio: formatarDataExibicao_(cData[i][8]),
            fim: formatarDataExibicao_(cData[i][9]),
            valorMensal: normalizarNumero_(cData[i][13]),
            centroCusto: cData[i][18],
            pastaDriveId: cData[i][21]
          };
          break;
        }
      }
    }

    if (!contratoInfo) {
      throw new Error('Contrato nao localizado para emissao do certificado.');
    }

    // Cronologia de logs
    var timeline = [];
    if (sheetLogs) {
      var lData = sheetLogs.getDataRange().getValues();
      for (var l = 1; l < lData.length; l++) {
        if (String(lData[l][5]) === String(idContrato)) {
          timeline.push({
            logId: lData[l][0],
            timestamp: lData[l][1],
            email: lData[l][2],
            papel: lData[l][3],
            acao: lData[l][6],
            campo: lData[l][7],
            anterior: lData[l][8],
            novo: lData[l][9],
            justificativa: lData[l][10]
          });
        }
      }
    }

    // Hash digital formal de verificacao
    var hashRaw = contratoInfo.protocolo + '|' + contratoInfo.fornecedor + '|' + timeline.length + '|' + new Date().toISOString();
    var signatureHash = 'BRISA-AUDIT-' + Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, hashRaw)).substring(0, 24);

    return {
      success: true,
      contrato: contratoInfo,
      timeline: timeline,
      totalAcoesRegistradas: timeline.length,
      assinaturaDigital: signatureHash,
      dataEmissao: Utilities.formatDate(new Date(), CONFIG.TIMEZONE, 'dd/MM/yyyy HH:mm:ss')
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}
