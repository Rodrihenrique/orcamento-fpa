/**
 * =========================================================================================
 * PAINEL DE CHAMADOS ADMINISTRATIVOS | GESTÃO DE TELEFONIA
 * GERÊNCIA EXECUTIVA DE TELEFONIA | BRISANET
 * -----------------------------------------------------------------------------------------
 * Arquivo: Setup.js
 * Descrição: Script de inicialização automática (1 clique).
 * Cria a pasta no Google Drive, a planilha no Google Sheets, formata abas com visual
 * corporativo (sem emojis, cabeçalhos em Azul Marinho #0B316D), popula dados iniciais
 * e armazena os IDs no ScriptProperties.
 * =========================================================================================
 */

const SETUP_CONFIG = {
  FOLDER_NAME: 'Chamados_Gestao_Telefonia',
  SPREADSHEET_NAME: 'Base_Dados_Chamados_Telefonia_Brisanet',
  BRAND_NAVY: '#0B316D',
  TEXT_WHITE: '#FFFFFF',
  BORDER_COLOR: '#E8E8E8',
  FONT_FAMILY: 'Figtree',
  
  SHEETS: {
    CHAMADOS: 'CHAMADOS',
    LOG: 'LOG_INTERACOES',
    CONFIG: 'CONFIGURACOES'
  }
};

/**
 * Função principal de inicialização do sistema.
 * Execute esta função diretamente pelo editor do Google Apps Script.
 */
function setupSistema() {
  Logger.log('>>> Iniciando configuração automática do ambiente brisanet...');
  
  // 1. Obter ou Criar Pasta no Google Drive
  const pastaRaiz = obterOuCriarPasta(SETUP_CONFIG.FOLDER_NAME);
  const folderId = pastaRaiz.getId();
  Logger.log('Pasta no Drive configurada: ' + pastaRaiz.getName() + ' (ID: ' + folderId + ')');

  // 2. Obter ou Criar Planilha no Google Sheets dentro da pasta
  const planilha = obterOuCriarPlanilha(pastaRaiz, SETUP_CONFIG.SPREADSHEET_NAME);
  const spreadsheetId = planilha.getId();
  Logger.log('Planilha configurada: ' + planilha.getName() + ' (ID: ' + spreadsheetId + ')');

  // 3. Estruturar e Formatar as Abas
  configurarAbaChamados(planilha);
  configurarAbaLogInteracoes(planilha);
  configurarAbaConfiguracoes(planilha);

  // 4. Configurar permissões de acesso no domínio para execução como 'USER_ACCESSING'
  try {
    pastaRaiz.setSharing(DriveApp.Access.DOMAIN_WITH_LINK, DriveApp.Permission.EDIT);
    const arquivoPlanilha = DriveApp.getFileById(spreadsheetId);
    arquivoPlanilha.setSharing(DriveApp.Access.DOMAIN_WITH_LINK, DriveApp.Permission.EDIT);
    Logger.log('Permissões de edição no domínio configuradas com sucesso.');
  } catch (errPerm) {
    Logger.log('Aviso ao aplicar compartilhamento de domínio: ' + errPerm.message);
  }

  // 5. Salvar referências de forma persistente nas ScriptProperties
  const props = PropertiesService.getScriptProperties();
  props.setProperties({
    'SPREADSHEET_ID': spreadsheetId,
    'ROOT_FOLDER_ID': folderId,
    'SETUP_DATA_EXECUCAO': new Date().toISOString()
  });

  Logger.log('================================================================');
  Logger.log('CONFIGURAÇÃO CONCLUÍDA COM SUCESSO!');
  Logger.log('Planilha URL: ' + planilha.getUrl());
  Logger.log('Pasta Drive URL: ' + pastaRaiz.getUrl());
  Logger.log('================================================================');

  return {
    status: 'SUCESSO',
    spreadsheetId: spreadsheetId,
    spreadsheetUrl: planilha.getUrl(),
    folderId: folderId,
    folderUrl: pastaRaiz.getUrl()
  };
}

/**
 * Garante que a pasta raiz e a planilha possuam permissão de edição no domínio.
 * Execute esta função caso tenha criado o ambiente anteriormente e deseje habilitar
 * o envio de e-mails em nome de cada atendente sob USER_ACCESSING.
 */
function garantirPermissoesAmbiente() {
  const props = PropertiesService.getScriptProperties();
  const folderId = props.getProperty('ROOT_FOLDER_ID');
  const spreadsheetId = props.getProperty('SPREADSHEET_ID');

  if (folderId) {
    try {
      DriveApp.getFolderById(folderId).setSharing(DriveApp.Access.DOMAIN_WITH_LINK, DriveApp.Permission.EDIT);
      Logger.log('Pasta do Drive compartilhada com o domínio.');
    } catch (e) {
      Logger.log('Aviso pasta: ' + e.message);
    }
  }

  if (spreadsheetId) {
    try {
      DriveApp.getFileById(spreadsheetId).setSharing(DriveApp.Access.DOMAIN_WITH_LINK, DriveApp.Permission.EDIT);
      Logger.log('Planilha compartilhada com o domínio.');
    } catch (e) {
      Logger.log('Aviso planilha: ' + e.message);
    }
  }

  return 'Permissões atualizadas com sucesso!';
}

/**
 * Cria ou recupera a pasta raiz no Google Drive.
 */
function obterOuCriarPasta(nomePasta) {
  const pastas = DriveApp.getFoldersByName(nomePasta);
  if (pastas.hasNext()) {
    return pastas.next();
  }
  return DriveApp.createFolder(nomePasta);
}

/**
 * Cria ou recupera a planilha dentro da pasta especificada.
 */
function obterOuCriarPlanilha(pasta, nomePlanilha) {
  const arquivos = pasta.getFilesByName(nomePlanilha);
  if (arquivos.hasNext()) {
    const arquivo = arquivos.next();
    return SpreadsheetApp.openById(arquivo.getId());
  }
  
  const novaPlanilha = SpreadsheetApp.create(nomePlanilha);
  const arquivoOriginal = DriveApp.getFileById(novaPlanilha.getId());
  
  // Mover para a pasta correta do projeto
  pasta.addFile(arquivoOriginal);
  DriveApp.getRootFolder().removeFile(arquivoOriginal);
  
  return novaPlanilha;
}

/**
 * Configura e estiliza a aba CHAMADOS (Tabela Mestre).
 */
function configurarAbaChamados(planilha) {
  let aba = planilha.getSheetByName(SETUP_CONFIG.SHEETS.CHAMADOS);
  if (!aba) {
    aba = planilha.insertSheet(SETUP_CONFIG.SHEETS.CHAMADOS);
  }

  const cabecalhos = [
    'ID_CHAMADO',
    'DATA_CRIACAO',
    'SOLICITANTE_EMAIL',
    'SOLICITANTE_NOME',
    'GERENCIA',
    'CATEGORIA',
    'SUBCATEGORIA',
    'PRIORIDADE',
    'TITULO',
    'DESCRICAO',
    'URL_ANEXOS',
    'STATUS',
    'ATENDENTE_RESPONSAVEL',
    'DATA_INICIO_ATENDIMENTO',
    'DATA_CONCLUSAO',
    'TEMPO_TOTAL_HORAS'
  ];

  aplicarEstiloCabecalho(aba, cabecalhos);

  // Formatação de colunas de Data/Hora (Colunas B, N, O)
  aba.getRange('B2:B').setNumberFormat('dd/MM/yyyy HH:mm:ss');
  aba.getRange('N2:N').setNumberFormat('dd/MM/yyyy HH:mm:ss');
  aba.getRange('O2:O').setNumberFormat('dd/MM/yyyy HH:mm:ss');
  
  // Formatação da coluna de Horas (Coluna P)
  aba.getRange('P2:P').setNumberFormat('0.00');
}

/**
 * Configura e estiliza a aba LOG_INTERACOES (Auditoria e Feedbacks).
 */
function configurarAbaLogInteracoes(planilha) {
  let aba = planilha.getSheetByName(SETUP_CONFIG.SHEETS.LOG);
  if (!aba) {
    aba = planilha.insertSheet(SETUP_CONFIG.SHEETS.LOG);
  }

  const cabecalhos = [
    'ID_LOG',
    'ID_CHAMADO',
    'DATA_HORA',
    'AUTOR_EMAIL',
    'TIPO_ACAO',
    'STATUS_ANTERIOR',
    'NOVO_STATUS',
    'MENSAGEM_FEEDBACK',
    'VISIVEL_SOLICITANTE'
  ];

  aplicarEstiloCabecalho(aba, cabecalhos);

  // Formatação de Data/Hora na coluna C
  aba.getRange('C2:C').setNumberFormat('dd/MM/yyyy HH:mm:ss');
}

/**
 * Configura e popula a aba CONFIGURACOES com dados dinâmicos iniciais.
 */
function configurarAbaConfiguracoes(planilha) {
  let aba = planilha.getSheetByName(SETUP_CONFIG.SHEETS.CONFIG);
  if (!aba) {
    aba = planilha.insertSheet(SETUP_CONFIG.SHEETS.CONFIG);
  }

  const cabecalhos = [
    'GERENCIAS_CADASTRADAS',
    'CATEGORIAS_TELEFONIA',
    'ADMINISTRADORES_AUTORIZADOS'
  ];

  aplicarEstiloCabecalho(aba, cabecalhos);

  // Remover a aba padrão 'Página1' ou 'Sheet1' se ainda existir
  const abaPadrao = planilha.getSheetByName('Página1') || planilha.getSheetByName('Sheet1');
  if (abaPadrao && planilha.getSheets().length > 1) {
    try {
      planilha.deleteSheet(abaPadrao);
    } catch (e) {
      Logger.log('Aba padrão preservada ou já removida.');
    }
  }

  // Preencher dados padrão caso a aba esteja vazia
  if (aba.getLastRow() <= 1) {
    const gerencias = [
      ['Gerência Executiva de Telefonia'],
      ['Gerência O&M 5G'],
      ['Gerência de Engenharia de Redes'],
      ['Gerência Comercial B2B'],
      ['Gerência de Atendimento ao Cliente'],
      ['Gerência de Tecnologia da Informação'],
      ['Gerência de Suprimentos e Logística'],
      ['Gerência de Recursos Humanos'],
      ['Gerência Jurídica e Regulatória']
    ];

    const categoriasTelefonia = [
      ['Solicitação de Linha Móvel Corporativa'],
      ['Troca de Aparelho / Chip'],
      ['Portabilidade Numérica'],
      ['Desconexão / Cancelamento de Linha'],
      ['Alteração de Plano / Pacote de Dados'],
      ['Suporte Técnico / Falha de Sinal'],
      ['Contestação de Fatura / Cobrança'],
      ['Outras Demandas de Telefonia']
    ];

    // Incluir o e-mail do executor como primeiro administrador
    const usuarioAtual = Session.getActiveUser().getEmail() || 'admin@brisanet.com.br';
    const administradores = [
      [usuarioAtual]
    ];

    aba.getRange(2, 1, gerencias.length, 1).setValues(gerencias);
    aba.getRange(2, 2, categoriasTelefonia.length, 1).setValues(categoriasTelefonia);
    aba.getRange(2, 3, administradores.length, 1).setValues(administradores);

    aba.autoResizeColumns(1, 3);
  }
}

/**
 * Função utilitária para padronizar cabeçalhos com o padrão visual corporativo.
 */
function aplicarEstiloCabecalho(aba, cabecalhos) {
  if (aba.getMaxColumns() < cabecalhos.length) {
    aba.insertColumnsAfter(aba.getMaxColumns(), cabecalhos.length - aba.getMaxColumns());
  }

  const rangeCabecalho = aba.getRange(1, 1, 1, cabecalhos.length);
  rangeCabecalho.setValues([cabecalhos]);

  rangeCabecalho
    .setBackground(SETUP_CONFIG.BRAND_NAVY) // #0B316D
    .setFontColor(SETUP_CONFIG.TEXT_WHITE)   // #FFFFFF
    .setFontWeight('bold')
    .setFontFamily(SETUP_CONFIG.FONT_FAMILY)
    .setHorizontalAlignment('center')
    .setVerticalAlignment('middle');

  aba.setRowHeight(1, 40);
  aba.setFrozenRows(1);

  if (!aba.getFilter()) {
    try {
      rangeCabecalho.createFilter();
    } catch (e) {
      Logger.log('Filtro já existente na aba: ' + aba.getName());
    }
  }

  aba.autoResizeColumns(1, cabecalhos.length);
}

/**
 * Retorna os IDs e parâmetros persistidos do sistema.
 */
function getSystemProperties() {
  const props = PropertiesService.getScriptProperties();
  return {
    spreadsheetId: props.getProperty('SPREADSHEET_ID'),
    rootFolderId: props.getProperty('ROOT_FOLDER_ID'),
    dataSetup: props.getProperty('SETUP_DATA_EXECUCAO')
  };
}
