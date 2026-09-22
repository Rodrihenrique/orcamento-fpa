/**
 * ============================================================================
 * ORÇAHUB - AUTOMAÇÃO GMAIL -> GOOGLE DRIVE -> DETRAF & BOLETOS
 * ============================================================================
 * Desenvolvido para: telefonia.administrativo@grupobrisanet.com.br
 * Pasta Raiz do Drive: 16qP-IlIk0MpMeVCpfzuMb9fa4cI4MoTS
 * 
 * Funcionalidades:
 * 1. Monitora o Gmail buscando e-mails com boletos, NFs e arquivos de DETRAF.
 * 2. Cria e organiza a estrutura completa de pastas no Google Drive.
 * 3. Faz a triagem automática: Boletos/NFs vs. DETRAF Interconexão.
 * 4. Descompacta arquivos .ZIP automaticamente (extraindo relatórios e CDRs).
 * 5. Registra todos os arquivos recebidos em uma Planilha Central de Controle.
 * 6. Marca os e-mails com a etiqueta "OrçaHub/Processado" para evitar duplicidade.
 * ============================================================================
 */

// CONFIGURAÇÕES GERAIS
const CONFIG = {
  ROOT_FOLDER_ID: '16qP-IlIk0MpMeVCpfzuMb9fa4cI4MoTS',
  LABEL_NAME: 'OrçaHub/Processado',
  SEARCH_QUERY: 'has:attachment (boleto OR fatura OR detraf OR interconexão OR interconexao OR "nota fiscal" OR nf OR danfe OR vum OR "abr telecom" OR claro OR vivo OR tim OR algar) -label:"OrçaHub/Processado"',
  MAX_THREADS_PER_RUN: 20 // Processa até 20 conversas por execução para não estourar tempo
};

/**
 * 1. FUNÇÃO DE CONFIGURAÇÃO INICIAL (Execute esta função primeiro!)
 * Cria a estrutura de pastas e a planilha de controle no seu Google Drive.
 */
function setupEnvironment() {
  Logger.log('Iniciando configuração da estrutura de pastas no Google Drive...');
  
  const rootFolder = DriveApp.getFolderById(CONFIG.ROOT_FOLDER_ID);
  
  // 1. Pastas de Entrada
  const pastaEntrada = getOrCreateFolder(rootFolder, '01_Entrada');
  getOrCreateFolder(pastaEntrada, 'Boletos_e_NFs');
  getOrCreateFolder(pastaEntrada, 'DETRAF_Interconexao');
  
  // 2. Pastas de Processados por Ano/Mês
  const pastaProcessados = getOrCreateFolder(rootFolder, '02_Processados');
  const anoAtual = new Date().getFullYear().toString();
  const pastaAno = getOrCreateFolder(pastaProcessados, anoAtual);
  getOrCreateFolder(pastaAno, 'Boletos_OPEX');
  const pastaDetrafAno = getOrCreateFolder(pastaAno, 'DETRAF');
  getOrCreateFolder(pastaDetrafAno, 'Claro');
  getOrCreateFolder(pastaDetrafAno, 'Vivo');
  getOrCreateFolder(pastaDetrafAno, 'TIM');
  getOrCreateFolder(pastaDetrafAno, 'Algar');
  getOrCreateFolder(pastaDetrafAno, 'Outras_PPPs');
  
  // 3. Pastas de Divergências e Glosas
  const pastaDivergencias = getOrCreateFolder(rootFolder, '03_Divergencias_e_Glosas');
  getOrCreateFolder(pastaDivergencias, 'Boletos_Duplicados_ou_Ilegiveis');
  getOrCreateFolder(pastaDivergencias, 'DETRAF_Glosas_em_Disputa');
  
  // 4. Pasta de Bases Consolidadas
  const pastaBases = getOrCreateFolder(rootFolder, '04_Bases_Consolidadas');
  
  // 5. Criação da Planilha Central de Controle de Documentos
  getOrCreateControlSpreadsheet(pastaBases, 'Base_Controle_Documentos_Recebidos');
  
  // 6. Criação da Etiqueta no Gmail se não existir
  getOrCreateGmailLabel(CONFIG.LABEL_NAME);
  
  Logger.log('✅ Estrutura criada com sucesso no Google Drive!');
}

/**
 * 2. FUNÇÃO PRINCIPAL DE PROCESSAMENTO DE E-MAILS
 * Varre o Gmail, baixa os anexos, descompacta ZIPs e salva no Drive.
 */
function processarEmailsRecebidos() {
  Logger.log('Iniciando varredura de e-mails recebidos...');
  
  const rootFolder = DriveApp.getFolderById(CONFIG.ROOT_FOLDER_ID);
  const pastaEntrada = getOrCreateFolder(rootFolder, '01_Entrada');
  const pastaBoletos = getOrCreateFolder(pastaEntrada, 'Boletos_e_NFs');
  const pastaDetraf = getOrCreateFolder(pastaEntrada, 'DETRAF_Interconexao');
  
  const pastaBases = getOrCreateFolder(rootFolder, '04_Bases_Consolidadas');
  const controleSheet = getOrCreateControlSpreadsheet(pastaBases, 'Base_Controle_Documentos_Recebidos');
  
  const labelProcessado = getOrCreateGmailLabel(CONFIG.LABEL_NAME);
  const threads = GmailApp.search(CONFIG.SEARCH_QUERY, 0, CONFIG.MAX_THREADS_PER_RUN);
  
  Logger.log('Threads encontradas para processamento: ' + threads.length);
  
  for (let t = 0; t < threads.length; t++) {
    const thread = threads[t];
    const messages = thread.getMessages();
    
    for (let m = 0; m < messages.length; m++) {
      const message = messages[m];
      const attachments = message.getAttachments();
      
      if (attachments.length === 0) continue;
      
      const subject = message.getSubject();
      const from = message.getFrom();
      const date = message.getDate();
      const isDetraf = verificarSeEhDetraf(subject, from, attachments);
      
      const targetFolder = isDetraf ? pastaDetraf : pastaBoletos;
      const categoria = isDetraf ? 'DETRAF' : 'BOLETO_OU_NF';
      
      for (let a = 0; a < attachments.length; a++) {
        const attachment = attachments[a];
        const fileName = attachment.getName();
        const contentType = attachment.getContentType();
        
        // TRATAMENTO DE ARQUIVO ZIP
        if (fileName.toLowerCase().endsWith('.zip') || contentType === 'application/zip') {
          Logger.log('Arquivo ZIP detectado: ' + fileName + '. Descompactando...');
          
          const nomePastaZip = fileName.replace(/\.[^/.]+$/, '') + '_' + Utilities.formatDate(date, 'GMT-3', 'yyyyMMdd_HHmmss');
          const subpastaZip = getOrCreateFolder(targetFolder, nomePastaZip);
          
          try {
            const unzippedFiles = Utilities.unzip(attachment);
            for (let u = 0; u < unzippedFiles.length; u++) {
              const unzippedBlob = unzippedFiles[u];
              const driveFile = subpastaZip.createFile(unzippedBlob);
              
              registrarNaPlanilha(controleSheet, [
                Utilities.formatDate(date, 'GMT-3', 'yyyy-MM-dd HH:mm:ss'),
                from,
                subject,
                categoria,
                fileName + ' -> ' + unzippedBlob.getName(),
                formatBytes(unzippedBlob.getBytes().length),
                driveFile.getUrl(),
                'DESCOMPACTADO_ZIP'
              ]);
            }
          } catch (e) {
            Logger.log('Erro ao descompactar ZIP (' + fileName + '): ' + e.message);
            // Salva o zip original caso falhe o unzip
            const driveFile = targetFolder.createFile(attachment);
            registrarNaPlanilha(controleSheet, [
              Utilities.formatDate(date, 'GMT-3', 'yyyy-MM-dd HH:mm:ss'),
              from,
              subject,
              categoria,
              fileName,
              formatBytes(attachment.getSize()),
              driveFile.getUrl(),
              'ZIP_ORIGINAL_ERRO_UNZIP'
            ]);
          }
        } else {
          // ARQUIVOS NORMAIS (PDF, XLSX, CSV, TXT)
          const driveFile = targetFolder.createFile(attachment);
          
          registrarNaPlanilha(controleSheet, [
            Utilities.formatDate(date, 'GMT-3', 'yyyy-MM-dd HH:mm:ss'),
            from,
            subject,
            categoria,
            fileName,
            formatBytes(attachment.getSize()),
            driveFile.getUrl(),
            'RECEBIDO_ENTRADA'
          ]);
        }
      }
    }
    
    // Marca a conversa no Gmail como processada para nunca duplicar
    thread.addLabel(labelProcessado);
  }
  
  Logger.log('✅ Varredura concluída com sucesso!');
}

/**
 * 3. CONFIGURAR GATILHO AUTOMÁTICO (TRIGGER)
 * Agenda a execução automática a cada 30 minutos.
 */
function configurarGatilhoAutomatico() {
  // Remove gatilhos anteriores da mesma função para não duplicar
  const triggers = ScriptApp.getProjectTriggers();
  for (let i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'processarEmailsRecebidos') {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }
  
  // Cria novo gatilho a cada 30 minutos
  ScriptApp.newTrigger('processarEmailsRecebidos')
    .timeBased()
    .everyMinutes(30)
    .create();
    
  Logger.log('✅ Gatilho automático configurado para executar a cada 30 minutos!');
}

// ============================================================================
// FUNÇÕES AUXILIARES
// ============================================================================

function verificarSeEhDetraf(subject, from, attachments) {
  const texto = (subject + ' ' + from).toLowerCase();
  
  // Palavras-chave típicas de DETRAF e Interconexão
  if (texto.includes('detraf') || 
      texto.includes('interconexao') || 
      texto.includes('interconexão') || 
      texto.includes('abr telecom') || 
      texto.includes('vum') || 
      texto.includes('tu-rl') || 
      texto.includes('snoa') || 
      texto.includes('declaracao de trafego') ||
      texto.includes('declaração de tráfego')) {
    return true;
  }
  
  // Checagem pelo nome dos anexos
  for (let i = 0; i < attachments.length; i++) {
    const nome = attachments[i].getName().toLowerCase();
    if (nome.includes('detraf') || nome.includes('interconex') || nome.includes('vum')) {
      return true;
    }
  }
  
  return false;
}

function getOrCreateFolder(parentFolder, folderName) {
  const folders = parentFolder.getFoldersByName(folderName);
  if (folders.hasNext()) {
    return folders.next();
  }
  return parentFolder.createFolder(folderName);
}

function getOrCreateGmailLabel(labelName) {
  let label = GmailApp.getUserLabelByName(labelName);
  if (!label) {
    label = GmailApp.createLabel(labelName);
  }
  return label;
}

function getOrCreateControlSpreadsheet(parentFolder, sheetName) {
  const files = parentFolder.getFilesByName(sheetName);
  if (files.hasNext()) {
    const file = files.next();
    return SpreadsheetApp.openById(file.getId());
  }
  
  // Se não existir, cria a planilha com cabeçalhos profissionais
  const ss = SpreadsheetApp.create(sheetName);
  const sheet = ss.getActiveSheet();
  sheet.setName('Documentos_Recebidos');
  
  const headers = [
    'Data/Hora Recebimento',
    'Remetente',
    'Assunto do E-mail',
    'Categoria',
    'Nome do Arquivo',
    'Tamanho',
    'Link no Google Drive',
    'Status Processamento'
  ];
  
  sheet.appendRow(headers);
  sheet.getRange(1, 1, 1, headers.length)
    .setBackground('#1E293B')
    .setFontColor('#FFFFFF')
    .setFontWeight('bold');
    
  sheet.setFrozenRows(1);
  
  // Move o arquivo para a pasta designada
  const file = DriveApp.getFileById(ss.getId());
  parentFolder.addFile(file);
  DriveApp.getRootFolder().removeFile(file);
  
  return ss;
}

function registrarNaPlanilha(spreadsheet, rowData) {
  const sheet = spreadsheet.getSheetByName('Documentos_Recebidos') || spreadsheet.getActiveSheet();
  sheet.appendRow(rowData);
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
