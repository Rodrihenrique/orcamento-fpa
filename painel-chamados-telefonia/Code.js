/**
 * =========================================================================================
 * PAINEL DE CHAMADOS ADMINISTRATIVOS | GESTÃO DE TELEFONIA
 * GERÊNCIA EXECUTIVA DE TELEFONIA | BRISANET
 * -----------------------------------------------------------------------------------------
 * Arquivo: Code.js
 * Descrição: Backend central do Web App Google Apps Script.
 * =========================================================================================
 */

function doGet(e) {
  const params = (e && e.parameter) ? e.parameter : {};
  const portalParam = (params.portal || params.p || params.form || '').toLowerCase();
  const abaParam = (params.aba || '').toLowerCase();
  const temVisita = !!params.visita;
  
  let usuarioEmail = '';
  try {
    usuarioEmail = Session.getActiveUser().getEmail() || '';
  } catch (err) {}

  // Roteamento inteligente:
  // 1. Se explicitamente solicitado o portal de visitas (?portal=visita ou ?form=visita)
  // 2. Ou se for link com protocolo/token de visitante (e não for a aba administrativa interna 'visitas')
  // 3. Ou se for usuário externo anônimo (sem conta corporativa Google ativa)
  const isPortalVisita = portalParam === 'visita' || 
                         portalParam === 'visitas' || 
                         (temVisita && abaParam !== 'visitas' && params.token) ||
                         (!usuarioEmail && abaParam !== 'admin' && abaParam !== 'chamados' && abaParam !== 'fila');

  if (isPortalVisita) {
    return HtmlService.createHtmlOutputFromFile('PortalVisitas')
      .setTitle('Portal de Visitas Corporativas | Brisanet')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1.0')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }

  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('Painel de Chamados Administrativos | Gestão de Telefonia')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1.0')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * Retorna as configurações iniciais do usuário e dados dinâmicos da planilha.
 */
function obterConfiguracoesIniciais() {
  const props = PropertiesService.getScriptProperties();
  const spreadsheetId = props.getProperty('SPREADSHEET_ID');
  
  if (!spreadsheetId) {
    throw new Error('Sistema não inicializado. Execute primeiro a função setupSistema() no Apps Script.');
  }

  const ss = SpreadsheetApp.openById(spreadsheetId);
  const abaConfig = ss.getSheetByName('CONFIGURACOES');
  
  const usuarioEmail = Session.getActiveUser().getEmail() || 'usuario@brisanet.com.br';
  let usuarioNome = usuarioEmail.split('@')[0].replace('.', ' ');
  usuarioNome = usuarioNome.charAt(0).toUpperCase() + usuarioNome.slice(1);

  // Leitura dinâmica das configurações
  const dadosConfig = abaConfig.getDataRange().getValues();
  const gerencias = [];
  const categorias = [];
  const administradores = [];

  // Incluir o proprietário da planilha como administrador automático
  try {
    const dono = ss.getOwner();
    if (dono && dono.getEmail()) {
      const emailDono = dono.getEmail().trim().toLowerCase();
      if (emailDono && administradores.indexOf(emailDono) === -1) {
        administradores.push(emailDono);
      }
    }
  } catch (eOwner) {}

  for (let i = 1; i < dadosConfig.length; i++) {
    if (dadosConfig[i][0]) gerencias.push(String(dadosConfig[i][0]).trim());
    if (dadosConfig[i][1]) categorias.push(String(dadosConfig[i][1]).trim());
    if (dadosConfig[i][2]) {
      // Suporte a múltiplos e-mails por linha/célula separados por vírgula, ponto-e-vírgula ou espaço
      const partes = String(dadosConfig[i][2]).split(/[,;\s]+/);
      partes.forEach(function(emailRaw) {
        const emailLimpo = emailRaw.trim().toLowerCase();
        if (emailLimpo && emailLimpo.includes('@') && administradores.indexOf(emailLimpo) === -1) {
          administradores.push(emailLimpo);
        }
      });
    }
  }

  const emailUsuarioLimpo = String(usuarioEmail).trim().toLowerCase();
  const isAdmin = administradores.indexOf(emailUsuarioLimpo) !== -1;

  return {
    usuario: {
      email: usuarioEmail,
      nome: usuarioNome,
      isAdmin: isAdmin
    },
    gerencias: gerencias,
    categorias: categorias,
    administradores: administradores,
    webAppUrl: normalizarUrlPublica(obterUrlWebApp()),
    urlPortalVisitas: obterUrlPortalVisitas(),
    isUrlPortalConfigurada: Boolean(props.getProperty('URL_PORTAL_VISITAS'))
  };
}

/**
 * Retorna o e-mail do administrador padrão cadastrado no sistema (ou o usuário ativo da sessão)
 * sem utilizar endereços inexistentes como telefonia@brisanet.com.br.
 */
function obterEmailAdminPadrao() {
  const usuarioAtivo = (Session.getActiveUser().getEmail() || '').trim().toLowerCase();
  if (usuarioAtivo && usuarioAtivo.includes('@') && usuarioAtivo !== 'usuario@brisanet.com.br' && usuarioAtivo.indexOf('telefonia@') === -1) {
    return usuarioAtivo;
  }
  try {
    const config = obterConfiguracoesIniciais();
    if (config.administradores && config.administradores.length > 0) {
      for (let i = 0; i < config.administradores.length; i++) {
        const adm = String(config.administradores[i] || '').trim().toLowerCase();
        if (adm && adm.includes('@') && adm.indexOf('telefonia@') === -1) {
          return adm;
        }
      }
    }
  } catch (e) {}
  return (usuarioAtivo && usuarioAtivo.indexOf('telefonia@') === -1) ? usuarioAtivo : '';
}

/**
 * Concede permissão de edição a uma pasta/arquivo no Google Drive SEM enviar e-mail de notificação.
 * Utiliza a API REST v3 do Google Drive com sendNotificationEmail=false.
 */
function adicionarPermissaoDriveSemNotificacao(fileId, email, role) {
  if (!fileId || !email || !email.includes('@')) return;
  try {
    const url = 'https://www.googleapis.com/drive/v3/files/' + encodeURIComponent(fileId) + '/permissions?sendNotificationEmail=false&supportsAllDrives=true';
    const payload = JSON.stringify({
      role: role || 'writer',
      type: 'user',
      emailAddress: email.trim().toLowerCase()
    });
    UrlFetchApp.fetch(url, {
      method: 'post',
      contentType: 'application/json',
      headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() },
      payload: payload,
      muteHttpExceptions: true
    });
  } catch (errDrive) {
    Logger.log('Aviso ao conceder permissão Drive sem e-mail: ' + errDrive.message);
  }
}

/**
 * Salva arquivos codificados em Base64 no Google Drive na pasta do chamado.
 * Garante permissões adequadas de leitura/download para todos os administradores cadastrados sem disparar e-mails de notificação do Drive.
 * Retorna array de objetos com { nome, url, id, downloadUrl }.
 */
function salvarAnexosNoDrive(idChamado, arquivosBase64) {
  const anexosSalvos = [];
  if (!arquivosBase64 || arquivosBase64.length === 0) return anexosSalvos;

  try {
    const props = PropertiesService.getScriptProperties();
    const rootFolderId = props.getProperty('ROOT_FOLDER_ID');
    if (!rootFolderId) return anexosSalvos;

    const pastaRaiz = DriveApp.getFolderById(rootFolderId);
    try {
      pastaRaiz.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    } catch (eR) {}

    const anoAtual = new Date().getFullYear();

    // Pasta do Ano
    let pastaAno = pastaRaiz.getFoldersByName(String(anoAtual));
    pastaAno = pastaAno.hasNext() ? pastaAno.next() : pastaRaiz.createFolder(String(anoAtual));
    try {
      pastaAno.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    } catch (eA) {}

    // Pasta do Chamado
    let pastaChamado = pastaAno.getFoldersByName(idChamado);
    pastaChamado = pastaChamado.hasNext() ? pastaChamado.next() : pastaAno.createFolder(idChamado);
    try {
      pastaChamado.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    } catch (eP) {}

    // Compartilhar pasta do chamado com os administradores cadastrados SEM disparar e-mail de notificação do Google Drive
    try {
      const config = obterConfiguracoesIniciais();
      const administradores = config.administradores || [];
      const pastaChamadoId = pastaChamado.getId();
      administradores.forEach(function(email) {
        if (email && email.includes('@')) {
          adicionarPermissaoDriveSemNotificacao(pastaChamadoId, email, 'writer');
        }
      });
    } catch (eCfg) {}

    arquivosBase64.forEach(function(arq) {
      try {
        const contentType = arq.tipo || 'application/octet-stream';
        const bytes = Utilities.base64Decode(arq.base64.split(',')[1] || arq.base64);
        const blob = Utilities.newBlob(bytes, contentType, arq.nome);
        const arquivoSalvo = pastaChamado.createFile(blob);
        try {
          arquivoSalvo.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        } catch (eFileShare) {}

        const fileId = arquivoSalvo.getId();
        const downloadUrl = 'https://drive.google.com/uc?export=download&id=' + fileId;
        anexosSalvos.push({
          nome: arq.nome,
          url: arquivoSalvo.getUrl(),
          id: fileId,
          downloadUrl: downloadUrl,
          blob: blob
        });
      } catch (errUpload) {
        Logger.log('Erro ao salvar anexo ' + arq.nome + ': ' + errUpload.message);
      }
    });
  } catch (err) {
    Logger.log('Erro geral ao processar anexos no Drive: ' + err.message);
  }

  return anexosSalvos;
}

/**
 * Permite que administradores e usuários autorizados baixem qualquer anexo diretamente
 * através do backend do Apps Script, sem depender de permissões diretas de URL do Drive no navegador.
 */
function obterArquivoParaDownload(fileId) {
  try {
    if (!fileId) return { sucesso: false, erro: 'ID do arquivo não fornecido.' };

    const arquivo = DriveApp.getFileById(fileId);
    if (!arquivo) return { sucesso: false, erro: 'Arquivo não localizado no Google Drive.' };

    const blob = arquivo.getBlob();
    const nome = arquivo.getName();
    const contentType = blob.getContentType() || 'application/octet-stream';
    const base64 = Utilities.base64Encode(blob.getBytes());

    return {
      sucesso: true,
      nome: nome,
      contentType: contentType,
      base64: 'data:' + contentType + ';base64,' + base64
    };
  } catch (err) {
    Logger.log('Erro ao obter arquivo para download: ' + err.message);
    return { sucesso: false, erro: err.message };
  }
}

/**
 * Sincroniza permissões da pasta raiz e de todos os arquivos/pastas existentes no Drive
 * para garantir que todos os administradores cadastrados na planilha tenham acesso total.
 */
function sincronizarPermissoesDriveComAdmins() {
  try {
    const props = PropertiesService.getScriptProperties();
    const rootFolderId = props.getProperty('ROOT_FOLDER_ID');
    if (!rootFolderId) return { sucesso: false, erro: 'ROOT_FOLDER_ID não configurado.' };

    const config = obterConfiguracoesIniciais();
    const administradores = config.administradores || [];

    const pastaRaiz = DriveApp.getFolderById(rootFolderId);
    try {
      pastaRaiz.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    } catch (e) {}

    administradores.forEach(function(adminEmail) {
      if (adminEmail && adminEmail.includes('@')) {
        adicionarPermissaoDriveSemNotificacao(rootFolderId, adminEmail, 'writer');
      }
    });

    const subPastas = pastaRaiz.getFolders();
    let totalPastas = 0;
    let totalArquivos = 0;

    while (subPastas.hasNext()) {
      const pAno = subPastas.next();
      totalPastas++;
      try { pAno.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch (e) {}
      administradores.forEach(function(email) {
        adicionarPermissaoDriveSemNotificacao(pAno.getId(), email, 'writer');
      });

      const pChamados = pAno.getFolders();
      while (pChamados.hasNext()) {
        const pCh = pChamados.next();
        totalPastas++;
        try { pCh.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch (e) {}
        administradores.forEach(function(email) {
          adicionarPermissaoDriveSemNotificacao(pCh.getId(), email, 'writer');
        });

        const arqs = pCh.getFiles();
        while (arqs.hasNext()) {
          const arq = arqs.next();
          totalArquivos++;
          try { arq.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch (e) {}
          administradores.forEach(function(email) {
            adicionarPermissaoDriveSemNotificacao(arq.getId(), email, 'writer');
          });
        }
      }
    }

    return {
      sucesso: true,
      mensagem: 'Permissões do Google Drive sincronizadas com sucesso para ' + administradores.length + ' administradores. (' + totalPastas + ' pastas e ' + totalArquivos + ' arquivos liberados).'
    };
  } catch (err) {
    Logger.log('Erro ao sincronizar permissões do Drive: ' + err.message);
    return { sucesso: false, erro: err.message };
  }
}

/**
 * Remove propriedades não serializáveis (como Blobs em memória) antes de salvar na planilha.
 */
function sanitizarAnexosParaPlanilha(listaAnexos) {
  if (!Array.isArray(listaAnexos)) return [];
  return listaAnexos.map(function(a) {
    const id = a.id || extrairIdDrive(a.url) || '';
    return {
      nome: a.nome || 'Arquivo',
      url: a.url || '',
      id: id,
      downloadUrl: a.downloadUrl || (id ? 'https://drive.google.com/uc?export=download&id=' + id : (a.url || ''))
    };
  });
}

/**
 * Cria um novo chamado com upload multi-formato no Google Drive.
 */
function criarChamado(dados, arquivosBase64) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
  } catch (eLock) {
    return { sucesso: false, erro: 'Sistema ocupado no momento. Por favor, tente novamente em instantes.' };
  }

  try {
    const props = PropertiesService.getScriptProperties();
    const spreadsheetId = props.getProperty('SPREADSHEET_ID');
    
    const ss = SpreadsheetApp.openById(spreadsheetId);
    const abaChamados = ss.getSheetByName('CHAMADOS');
    const abaLog = ss.getSheetByName('LOG_INTERACOES');
    
    const agora = new Date();
    const anoAtual = agora.getFullYear();

    SpreadsheetApp.flush();
    const dadosExistentes = abaChamados.getDataRange().getValues();
    let maxSeq = 0;
    for (let i = 1; i < dadosExistentes.length; i++) {
      const celulaId = String(dadosExistentes[i][0] || '').trim();
      const match = celulaId.match(/BRISA-TEL-(\d{4})-(\d+)/i);
      if (match && match[1] === String(anoAtual)) {
        const num = parseInt(match[2], 10);
        if (!isNaN(num) && num > maxSeq) {
          maxSeq = num;
        }
      }
    }
    const proximoNum = maxSeq + 1;
    const sequencial = ('0000' + proximoNum).slice(-4);
    const idChamado = 'BRISA-TEL-' + anoAtual + '-' + sequencial;

    // 1. Processar e salvar múltiplos anexos no Google Drive
    const urlsAnexos = salvarAnexosNoDrive(idChamado, arquivosBase64);

    const emailSolicitante = Session.getActiveUser().getEmail() || dados.email || 'usuario@brisanet.com.br';
    const nomeSolicitante = dados.nome || emailSolicitante.split('@')[0];

    // 2. Gravar na aba CHAMADOS
    abaChamados.appendRow([
      idChamado,
      agora,
      emailSolicitante,
      nomeSolicitante,
      dados.gerencia,
      dados.categoria,
      dados.subcategoria || '',
      dados.prioridade || 'Média',
      dados.titulo,
      dados.descricao,
      JSON.stringify(sanitizarAnexosParaPlanilha(urlsAnexos)),
      'Aberto',
      '', // Atendente responsável
      '', // Início atendimento
      '', // Conclusão
      ''  // Tempo total horas
    ]);

    // 3. Gravar na aba LOG_INTERACOES (Auditoria)
    abaLog.appendRow([
      Utilities.getUuid(),
      idChamado,
      agora,
      emailSolicitante,
      'Abertura',
      '',
      'Aberto',
      dados.descricao ? ('Abertura do Chamado:\n' + dados.descricao) : 'Chamado registrado com sucesso pela gerência solicitante.',
      'SIM'
    ]);
    SpreadsheetApp.flush();

    // 4. Notificação por E-mail corporativo (assunto padronizado para agrupamento em thread)
    try {
      enviarEmailNotificacao({
        destinatario: emailSolicitante,
        assunto: '[brisanet] Chamado ' + idChamado + ' - ' + dados.titulo,
        idChamado: idChamado,
        titulo: dados.titulo,
        mensagem: 'Sua solicitação foi recebida pela Gerência Executiva de Telefonia e está aguardando triagem técnica.' + (dados.descricao ? '\n\nDescrição inicial da solicitação:\n' + dados.descricao : ''),
        autor: nomeSolicitante,
        anexos: urlsAnexos,
        aba: 'meus'
      });
    } catch (eMail) {
      Logger.log('Erro ao enviar e-mail: ' + eMail.message);
    }

    return {
      sucesso: true,
      idChamado: idChamado,
      mensagem: 'Chamado ' + idChamado + ' aberto com sucesso.'
    };
  } catch (error) {
    Logger.log('Erro ao criar chamado: ' + error.message);
    return { sucesso: false, erro: error.message };
  } finally {
    try { lock.releaseLock(); } catch (e) {}
  }
}

/**
 * Retorna os chamados de telefonia e as visitas corporativas pertencentes ao usuário.
 * Suporta usuário corporativo logado ou parâmetros de fallback (e-mail ou token do visitante).
 */
function obterMeusChamados(emailFallback, tokenFallback) {
  const props = PropertiesService.getScriptProperties();
  const spreadsheetId = props.getProperty('SPREADSHEET_ID');
  const ss = SpreadsheetApp.openById(spreadsheetId);
  const abaChamados = ss.getSheetByName('CHAMADOS');
  const abaVisitas = ss.getSheetByName('VISITAS');

  let usuarioEmail = '';
  try {
    usuarioEmail = Session.getActiveUser().getEmail().trim().toLowerCase();
  } catch (e) {}

  const emailAlvo = (emailFallback && emailFallback.trim()) ? emailFallback.trim().toLowerCase() : usuarioEmail;
  const tokenAlvo = (tokenFallback && tokenFallback.trim()) ? tokenFallback.trim() : '';

  const listaItens = [];

  // 1. Chamados de Telefonia
  if (abaChamados && emailAlvo) {
    const dadosCh = abaChamados.getDataRange().getValues();
    for (let i = 1; i < dadosCh.length; i++) {
      const emailLinha = String(dadosCh[i][2]).trim().toLowerCase();
      if (emailLinha === emailAlvo) {
        const ch = montarObjetoChamado(dadosCh[i]);
        ch.tipoItem = 'CHAMADO';
        listaItens.push(ch);
      }
    }
  }

  // 2. Solicitações de Visita Corporativa
  if (abaVisitas && (emailAlvo || tokenAlvo)) {
    const dadosVis = abaVisitas.getDataRange().getValues();
    for (let j = 1; j < dadosVis.length; j++) {
      const emailVisita = String(dadosVis[j][4]).trim().toLowerCase();
      const tokenVisita = String(dadosVis[j][17] || '').trim();

      const bateEmail = emailAlvo && (emailVisita === emailAlvo);
      const bateToken = tokenAlvo && (tokenVisita === tokenAlvo);

      if (bateEmail || bateToken) {
        const v = montarObjetoVisita(dadosVis[j]);
        listaItens.push({
          idChamado: v.idVisita,
          dataCriacao: v.dataCriacao,
          solicitanteNome: v.responsavelNome,
          solicitanteEmail: v.responsavelEmail,
          gerencia: v.empresa,
          categoria: 'Visita Corporativa',
          prioridade: 'Normal',
          titulo: 'Visita Corporativa • ' + v.empresa + ' (' + v.periodoInicio + ' a ' + v.periodoFim + ')',
          status: v.status,
          atendente: v.atendente,
          tipoItem: 'VISITA',
          tokenAcesso: v.tokenAcesso,
          anexos: v.anexos,
          dadosVisita: v
        });
      }
    }
  }

  // Ordenar do mais recente para o mais antigo
  return listaItens.reverse();
}

/**
 * Garante a criação dos cabeçalhos das colunas de observações e pendências na aba CHAMADOS.
 * Coluna 17: OBSERVACOES_ADMIN
 * Coluna 18: DATA_STATUS_AGUARDANDO
 * Coluna 19: AVISO_4_DIAS_ENVIADO
 */
function garantirCabecalhosChamados(abaChamados) {
  if (!abaChamados) return;
  try {
    const cabecalhosDesejados = [
      { col: 17, nome: 'OBSERVACOES_ADMIN' },
      { col: 18, nome: 'DATA_STATUS_AGUARDANDO' },
      { col: 19, nome: 'AVISO_4_DIAS_ENVIADO' },
      { col: 20, nome: 'EMAILS_ACOMPANHANTES' }
    ];
    cabecalhosDesejados.forEach(function(item) {
      const valAtual = abaChamados.getRange(1, item.col).getValue();
      if (!valAtual || String(valAtual).trim() === '') {
        abaChamados.getRange(1, item.col).setValue(item.nome)
          .setBackground('#0B316D')
          .setFontColor('#FFFFFF')
          .setFontWeight('bold');
      }
    });
  } catch (eH) {
    Logger.log('Aviso em garantirCabecalhosChamados: ' + eH.message);
  }
}

/**
 * Salva notas e links clicáveis inseridos pelo administrador na Fila Geral de Atendimentos.
 */
function salvarObservacaoAdminChamado(idChamado, observacao) {
  try {
    const config = obterConfiguracoesIniciais();
    if (!config.usuario.isAdmin) {
      return { sucesso: false, erro: 'Acesso restrito aos administradores.' };
    }

    const props = PropertiesService.getScriptProperties();
    const spreadsheetId = props.getProperty('SPREADSHEET_ID');
    const ss = SpreadsheetApp.openById(spreadsheetId);
    const abaChamados = ss.getSheetByName('CHAMADOS');
    const abaLog = ss.getSheetByName('LOG_INTERACOES');

    garantirCabecalhosChamados(abaChamados);

    const dados = abaChamados.getDataRange().getValues();
    let linhaAlvo = -1;
    for (let i = 1; i < dados.length; i++) {
      if (String(dados[i][0]).trim().toUpperCase() === String(idChamado).trim().toUpperCase()) {
        linhaAlvo = i + 1;
        break;
      }
    }

    if (linhaAlvo === -1) {
      return { sucesso: false, erro: 'Chamado ' + idChamado + ' não encontrado.' };
    }

    const textoObs = String(observacao || '').trim();
    abaChamados.getRange(linhaAlvo, 17).setValue(textoObs);

    // Gravar log de auditoria interno
    if (abaLog) {
      const agora = new Date();
      const adminEmail = Session.getActiveUser().getEmail() || 'admin@brisanet.com.br';
      abaLog.appendRow([
        Utilities.getUuid(),
        idChamado,
        agora,
        adminEmail,
        'Nota Interna / Observação',
        '',
        '',
        'Observação administrativa atualizada:\n' + (textoObs || '(Observação removida)'),
        'NÃO' // Visível apenas para administradores
      ]);
    }

    return {
      sucesso: true,
      idChamado: idChamado,
      observacoesAdmin: textoObs,
      mensagem: 'Observação salva com sucesso.'
    };
  } catch (err) {
    Logger.log('Erro ao salvar observação admin: ' + err.message);
    return { sucesso: false, erro: err.message };
  }
}

/**
 * Sanitiza e valida uma string de e-mails de acompanhantes separados por vírgula/espaço.
 */
function sanitizarEmailsAcompanhantes(strEmails) {
  if (!strEmails) return '';
  const partes = String(strEmails).split(/[,;\s]+/);
  const emailsValidos = [];
  const regexEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  partes.forEach(function(p) {
    const limpo = p.trim().toLowerCase();
    if (limpo && regexEmail.test(limpo)) {
      if (limpo.indexOf('nao-responda') === -1 &&
          limpo.indexOf('mailer-daemon') === -1 &&
          limpo.indexOf('delivery') === -1 &&
          limpo.indexOf('subsystem') === -1 &&
          limpo.indexOf('googlemail.com') === -1 &&
          limpo.indexOf('postmaster') === -1 &&
          limpo.indexOf('daemon') === -1 &&
          limpo.indexOf('telefonia@') === -1) {
        if (emailsValidos.indexOf(limpo) === -1) {
          emailsValidos.push(limpo);
        }
      }
    }
  });
  
  return emailsValidos.join(', ');
}

/**
 * Permite ao atendente salvar ou atualizar a lista de usuários acompanhantes de um chamado.
 */
function atualizarAcompanhantesChamado(idChamado, emailsAcompanhantes) {
  try {
    const props = PropertiesService.getScriptProperties();
    const spreadsheetId = props.getProperty('SPREADSHEET_ID');
    const ss = SpreadsheetApp.openById(spreadsheetId);
    const abaChamados = ss.getSheetByName('CHAMADOS');
    if (!abaChamados) return { sucesso: false, erro: 'Aba CHAMADOS não encontrada.' };
    
    garantirCabecalhosChamados(abaChamados);

    const dados = abaChamados.getDataRange().getValues();
    let linhaAlvo = -1;
    for (let i = 1; i < dados.length; i++) {
      if (String(dados[i][0]).trim().toUpperCase() === String(idChamado).trim().toUpperCase()) {
        linhaAlvo = i + 1;
        break;
      }
    }

    if (linhaAlvo === -1) return { sucesso: false, erro: 'Chamado ' + idChamado + ' não encontrado.' };

    const emailsSanitizados = sanitizarEmailsAcompanhantes(emailsAcompanhantes);
    abaChamados.getRange(linhaAlvo, 20).setValue(emailsSanitizados);

    return {
      sucesso: true,
      mensagem: 'Lista de acompanhantes atualizada com sucesso!',
      emailsAcompanhantes: emailsSanitizados
    };
  } catch (err) {
    Logger.log('Erro ao atualizar acompanhantes: ' + err.message);
    return { sucesso: false, erro: err.message };
  }
}

/**
 * Busca no log a última data em que o chamado foi alterado para o status 'Aguardando Retorno'.
 */
function buscarDataUltimaMudancaAguardando(abaLog, idChamado) {
  if (!abaLog) return null;
  try {
    const dados = abaLog.getDataRange().getValues();
    for (let i = dados.length - 1; i >= 1; i--) {
      if (String(dados[i][1]).trim().toUpperCase() === String(idChamado).trim().toUpperCase()) {
        const novoStatus = String(dados[i][6] || '').trim();
        if (novoStatus === 'Aguardando Retorno' && dados[i][2] instanceof Date) {
          return dados[i][2];
        }
      }
    }
  } catch (eLog) {
    Logger.log('Aviso ao buscar data de log: ' + eLog.message);
  }
  return null;
}

/**
 * Rotina automática de controle de pendências para chamados com status "Aguardando Retorno".
 * Regras (dias corridos):
 * - No 4º dia corrido: envia notificação de alerta informando prazo restante de 3 dias para cancelamento.
 * - No 7º dia corrido: cancela automaticamente o chamado por inatividade e notifica o solicitante.
 */
function processarPendenciasAguardandoRetorno(ss) {
  try {
    if (!ss) {
      const props = PropertiesService.getScriptProperties();
      const spreadsheetId = props.getProperty('SPREADSHEET_ID');
      if (!spreadsheetId) return;
      ss = SpreadsheetApp.openById(spreadsheetId);
    }
    const abaChamados = ss.getSheetByName('CHAMADOS');
    const abaLog = ss.getSheetByName('LOG_INTERACOES');
    if (!abaChamados) return;

    garantirCabecalhosChamados(abaChamados);

    const dados = abaChamados.getDataRange().getValues();
    const agora = new Date();

    for (let i = 1; i < dados.length; i++) {
      const status = String(dados[i][11] || '').trim();
      if (status !== 'Aguardando Retorno') continue;

      const linhaSheet = i + 1;
      const idChamado = String(dados[i][0] || '').trim();
      const emailSolicitante = String(dados[i][2] || '').trim();
      const tituloChamado = String(dados[i][8] || '').trim();
      let dataEntrada = dados[i][17]; // Coluna 18 (0-indexed 17)
      const aviso4Dias = String(dados[i][18] || '').trim().toUpperCase(); // Coluna 19 (0-indexed 18)

      // Fallback: se dataEntrada não estiver preenchida, buscar no log ou usar dataCriacao
      if (!dataEntrada || !(dataEntrada instanceof Date)) {
        dataEntrada = buscarDataUltimaMudancaAguardando(abaLog, idChamado);
        if (!dataEntrada && dados[i][1] instanceof Date) {
          dataEntrada = dados[i][1];
        }
        if (dataEntrada instanceof Date) {
          abaChamados.getRange(linhaSheet, 18).setValue(dataEntrada);
        } else {
          dataEntrada = agora;
          abaChamados.getRange(linhaSheet, 18).setValue(agora);
        }
      }

      // Calcular diferença em dias corridos
      const diffMs = agora.getTime() - dataEntrada.getTime();
      const diffDias = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      // Caso 1: 7 ou mais dias corridos -> Cancelar Chamado
      if (diffDias >= 7) {
        abaChamados.getRange(linhaSheet, 12).setValue('Cancelado');
        abaChamados.getRange(linhaSheet, 15).setValue(agora); // DATA_CONCLUSAO
        abaChamados.getRange(linhaSheet, 18).clearContent();
        abaChamados.getRange(linhaSheet, 19).clearContent();

        // Registrar no LOG_INTERACOES
        if (abaLog) {
          abaLog.appendRow([
            Utilities.getUuid(),
            idChamado,
            agora,
            'Sistema Brisanet',
            'Cancelamento Automático por Inatividade',
            'Aguardando Retorno',
            'Cancelado',
            'Chamado cancelado automaticamente após 7 dias corridos sem manifestação do solicitante.',
            'SIM'
          ]);
        }

        // Notificar Solicitante por E-mail
        if (emailSolicitante && emailSolicitante.includes('@')) {
          try {
            enviarEmailNotificacao({
              destinatario: emailSolicitante,
              assunto: '[brisanet] Chamado ' + idChamado + ' - ' + tituloChamado,
              idChamado: idChamado,
              titulo: tituloChamado,
              mensagem: 'Informamos que o chamado ' + idChamado + ' permaneceu por 7 dias corridos no status "Aguardando Retorno" sem manifestação ou envio dos dados solicitados, e por isso foi cancelado automaticamente pelo sistema.\n\nCaso ainda necessite de atendimento da Telefonia Brisanet, por favor registre um novo chamado na plataforma.',
              autor: obterEmailAdminPadrao(),
              anexos: [],
              aba: 'meus'
            });
          } catch (eMail) {
            Logger.log('Erro ao enviar e-mail de cancelamento automático: ' + eMail.message);
          }
        }
      } 
      // Caso 2: Entre 4 e 6 dias corridos e ainda não notificado -> Enviar Aviso
      else if (diffDias >= 4 && aviso4Dias !== 'SIM') {
        abaChamados.getRange(linhaSheet, 19).setValue('SIM');

        // Registrar no LOG_INTERACOES
        if (abaLog) {
          abaLog.appendRow([
            Utilities.getUuid(),
            idChamado,
            agora,
            'Sistema Brisanet',
            'Aviso de Pendência (4 dias)',
            'Aguardando Retorno',
            'Aguardando Retorno',
            'Notificação de pendência enviada ao solicitante informando prazo restante de 3 dias corridos antes do cancelamento automático.',
            'SIM'
          ]);
        }

        // Notificar Solicitante por E-mail
        if (emailSolicitante && emailSolicitante.includes('@')) {
          try {
            enviarEmailNotificacao({
              destinatario: emailSolicitante,
              assunto: '[brisanet] Chamado ' + idChamado + ' - ' + tituloChamado,
              idChamado: idChamado,
              titulo: tituloChamado,
              mensagem: 'Prezado(a) solicitante,\n\nIdentificamos que seu chamado encontra-se com o status "Aguardando Retorno" há 4 dias corridos.\n\nLembramos que, de acordo com as normas da Telefonia Brisanet, chamados sem manifestação por 7 dias corridos são cancelados automaticamente pelo sistema.\n\nRestam 3 dias corridos para o cancelamento automático desta solicitação. Caso ainda necessite de atendimento, acesse seu chamado pelo link abaixo e envie as informações ou documentos solicitados.',
              autor: obterEmailAdminPadrao(),
              anexos: [],
              aba: 'meus'
            });
          } catch (eMail4) {
            Logger.log('Erro ao enviar aviso de 4 dias: ' + eMail4.message);
          }
        }
      }
    }
  } catch (err) {
    Logger.log('Erro em processarPendenciasAguardandoRetorno: ' + err.message);
  }
}

/**
 * Função executável via acionador diário do Google Apps Script (Time-driven trigger).
 */
function executarRotinaPendenciasDiarias() {
  processarPendenciasAguardandoRetorno(null);
}

/**
 * Retorna a fila administrativa consolidada e indicadores executivos de KPI.
 */
function obterFilaAdmin(filtroPeriodo) {
  const config = obterConfiguracoesIniciais();
  if (!config.usuario.isAdmin) {
    throw new Error('Acesso restrito à Gerência Executiva de Telefonia.');
  }

  const props = PropertiesService.getScriptProperties();
  const spreadsheetId = props.getProperty('SPREADSHEET_ID');
  const ss = SpreadsheetApp.openById(spreadsheetId);
  const abaChamados = ss.getSheetByName('CHAMADOS');

  // Executar rotina automática de pendências antes da leitura dos chamados
  try {
    processarPendenciasAguardandoRetorno(ss);
  } catch (ePend) {
    Logger.log('Aviso ao processar pendências em obterFilaAdmin: ' + ePend.message);
  }

  const dados = abaChamados.getDataRange().getValues();
  const chamados = [];
  
  const mesFiltro = filtroPeriodo && filtroPeriodo.mes ? filtroPeriodo.mes : 'todos';
  const anoFiltro = filtroPeriodo && filtroPeriodo.ano ? String(filtroPeriodo.ano) : '';

  let novosSemAtendente = 0;
  let emAtendimento = 0;
  let concluidos = 0;
  let tempoTotalHorasResolucao = 0;
  let qtdComTempo = 0;

  for (let i = 1; i < dados.length; i++) {
    const dataCriacaoValor = dados[i][1];
    
    // Filtragem por período de criação se data válida
    if (dataCriacaoValor instanceof Date) {
      const mesItem = ('0' + (dataCriacaoValor.getMonth() + 1)).slice(-2);
      const anoItem = String(dataCriacaoValor.getFullYear());

      if (anoFiltro && anoItem !== anoFiltro) continue;
      if (mesFiltro !== 'todos' && mesItem !== mesFiltro) continue;
    }

    const item = montarObjetoChamado(dados[i]);
    chamados.push(item);

    if (item.status === 'Aberto') {
      novosSemAtendente++;
    } else if (item.status === 'Em Atendimento' || item.status === 'Aguardando Retorno') {
      emAtendimento++;
    } else if (item.status === 'Concluído') {
      concluidos++;
      if (item.tempoTotalHoras && !isNaN(item.tempoTotalHoras)) {
        tempoTotalHorasResolucao += parseFloat(item.tempoTotalHoras);
        qtdComTempo++;
      }
    }
  }

  const tempoMedioHoras = qtdComTempo > 0 ? (tempoTotalHorasResolucao / qtdComTempo).toFixed(1) : '0.0';
  const taxaResolucao = chamados.length > 0 ? Math.round((concluidos / chamados.length) * 100) : 100;

  return {
    kpis: {
      novosSemAtendente: novosSemAtendente,
      emAtendimento: emAtendimento,
      concluidos: concluidos,
      tempoMedioHoras: tempoMedioHoras,
      taxaResolucao: taxaResolucao + '%'
    },
    chamados: chamados.reverse()
  };
}

/**
 * Assumir chamado pela equipe administrativa.
 */
function assumirChamado(idChamado) {
  const props = PropertiesService.getScriptProperties();
  const spreadsheetId = props.getProperty('SPREADSHEET_ID');
  const ss = SpreadsheetApp.openById(spreadsheetId);
  const abaChamados = ss.getSheetByName('CHAMADOS');
  const abaLog = ss.getSheetByName('LOG_INTERACOES');
  
  const usuarioEmail = Session.getActiveUser().getEmail();
  const agora = new Date();

  const dados = abaChamados.getDataRange().getValues();
  let linhaAlvo = -1;
  let emailSolicitante = '';
  let tituloChamado = '';

  for (let i = 1; i < dados.length; i++) {
    if (dados[i][0] === idChamado) {
      linhaAlvo = i + 1;
      emailSolicitante = dados[i][2];
      tituloChamado = dados[i][8];
      break;
    }
  }

  if (linhaAlvo === -1) {
    return { sucesso: false, erro: 'Chamado não encontrado.' };
  }

  // Atualizar Atendente, Data Início e Status
  abaChamados.getRange(linhaAlvo, 12).setValue('Em Atendimento');
  abaChamados.getRange(linhaAlvo, 13).setValue(usuarioEmail);
  abaChamados.getRange(linhaAlvo, 14).setValue(agora);

  // Registrar no Log
  abaLog.appendRow([
    Utilities.getUuid(),
    idChamado,
    agora,
    usuarioEmail,
    'Atribuição',
    'Aberto',
    'Em Atendimento',
    'O analista ' + usuarioEmail + ' assumiu o atendimento da solicitação.',
    'SIM'
  ]);

  return { sucesso: true, mensagem: 'Chamado assumido com sucesso.' };
}

/**
 * Registra feedback, troca de status ou notas internas com suporte a anexos e gestão de acompanhantes.
 */
function adicionarInteracao(idChamado, mensagemFeedback, novoStatus, visivelSolicitante, arquivosBase64, emailsAcompanhantes, emailAtendenteParam) {
  const props = PropertiesService.getScriptProperties();
  const spreadsheetId = props.getProperty('SPREADSHEET_ID');
  const ss = SpreadsheetApp.openById(spreadsheetId);
  const abaChamados = ss.getSheetByName('CHAMADOS');
  const abaLog = ss.getSheetByName('LOG_INTERACOES');
  
  const usuarioEmail = (emailAtendenteParam && emailAtendenteParam.includes('@'))
    ? emailAtendenteParam.trim().toLowerCase()
    : ((Session.getActiveUser().getEmail() || '').trim().toLowerCase() || obterEmailAdminPadrao());
  const agora = new Date();

  const dados = abaChamados.getDataRange().getValues();
  let linhaAlvo = -1;
  let statusAnterior = '';
  let emailSolicitante = '';
  let dataInicio = null;
  let tituloChamado = '';
  let anexosExistentes = [];

  for (let i = 1; i < dados.length; i++) {
    if (dados[i][0] === idChamado) {
      linhaAlvo = i + 1;
      statusAnterior = dados[i][11];
      emailSolicitante = dados[i][2];
      dataInicio = dados[i][13];
      tituloChamado = dados[i][8];
      try {
        if (dados[i][10]) anexosExistentes = JSON.parse(dados[i][10]);
      } catch (e) {
        anexosExistentes = [];
      }
      break;
    }
  }

  if (linhaAlvo === -1) return { sucesso: false, erro: 'Chamado não localizado.' };

  // Atualizar lista de acompanhantes se fornecida pelo atendente
  garantirCabecalhosChamados(abaChamados);
  let emailsAcompFinal = String(dados[linhaAlvo - 1][19] || '').trim();
  if (emailsAcompanhantes !== undefined && emailsAcompanhantes !== null) {
    emailsAcompFinal = sanitizarEmailsAcompanhantes(emailsAcompanhantes);
    abaChamados.getRange(linhaAlvo, 20).setValue(emailsAcompFinal);
  }

  // Processar novos anexos do atendente (se houver)
  const novosAnexos = salvarAnexosNoDrive(idChamado, arquivosBase64);
  if (novosAnexos.length > 0) {
    anexosExistentes = anexosExistentes.concat(novosAnexos);
    abaChamados.getRange(linhaAlvo, 11).setValue(JSON.stringify(sanitizarAnexosParaPlanilha(anexosExistentes)));
  }

  const statusFinal = novoStatus || statusAnterior;
  abaChamados.getRange(linhaAlvo, 12).setValue(statusFinal);

  // Se concluído ou cancelado, registrar término e calcular horas
  if (statusFinal === 'Concluído' || statusFinal === 'Cancelado') {
    abaChamados.getRange(linhaAlvo, 15).setValue(agora);
    if (dataInicio && dataInicio instanceof Date) {
      const diffMs = agora.getTime() - dataInicio.getTime();
      const diffHoras = (diffMs / (1000 * 60 * 60)).toFixed(2);
      abaChamados.getRange(linhaAlvo, 16).setValue(diffHoras);
    }
  }

  // Controle de pendências:
  if (statusFinal === 'Aguardando Retorno' && statusAnterior !== 'Aguardando Retorno') {
    abaChamados.getRange(linhaAlvo, 18).setValue(agora); // DATA_STATUS_AGUARDANDO
    abaChamados.getRange(linhaAlvo, 19).setValue('NÃO'); // AVISO_4_DIAS_ENVIADO
  } else if (statusFinal !== 'Aguardando Retorno') {
    abaChamados.getRange(linhaAlvo, 18).clearContent();
    abaChamados.getRange(linhaAlvo, 19).clearContent();
  }

  // Montar texto de log
  let textoLog = mensagemFeedback ? mensagemFeedback.trim() : '';
  if (novosAnexos.length > 0) {
    const listaTxt = novosAnexos.map(function(a) { return a.nome + ' (' + a.url + ')'; }).join('\n');
    textoLog = textoLog ? (textoLog + '\n\nAnexos adicionados:\n' + listaTxt) : ('Anexos adicionados:\n' + listaTxt);
  }

  // Registrar Log
  abaLog.appendRow([
    Utilities.getUuid(),
    idChamado,
    agora,
    usuarioEmail,
    novoStatus ? 'Mudança de Status' : 'Feedback',
    statusAnterior,
    statusFinal,
    textoLog,
    visivelSolicitante ? 'SIM' : 'NÃO'
  ]);

  // Notificar por e-mail APENAS se for visível ao solicitante E houver texto ou anexos
  const temConteudo = textoLog.length > 0;
  if (visivelSolicitante && temConteudo) {
    try {
      enviarEmailNotificacao({
        destinatario: emailSolicitante,
        cc: emailsAcompFinal,
        assunto: '[brisanet] Chamado ' + idChamado + ' - ' + tituloChamado,
        idChamado: idChamado,
        titulo: tituloChamado,
        mensagem: mensagemFeedback ? mensagemFeedback.trim() : 'Novo parecer e documento(s) anexado(s) pelo atendente.',
        autor: usuarioEmail,
        anexos: novosAnexos,
        aba: 'meus'
      });
    } catch (e) {
      Logger.log('Erro de e-mail: ' + e.message);
    }
  }

  return { 
    sucesso: true, 
    mensagem: 'Interação registrada com sucesso.', 
    chamadoAtualizado: { 
      anexos: sanitizarAnexosParaPlanilha(anexosExistentes),
      emailsAcompanhantes: emailsAcompFinal
    } 
  };
}

/**
 * Atualiza o status do chamado diretamente pela listagem rápida (Fila Geral).
 */
function alterarStatusChamadoDireto(idChamado, novoStatus) {
  try {
    const statusValidos = ['Aberto', 'Em Atendimento', 'Aguardando Retorno', 'Concluído', 'Cancelado'];
    if (!statusValidos.includes(novoStatus)) {
      return { sucesso: false, erro: 'Status inválido: ' + novoStatus };
    }
    const res = adicionarInteracao(
      idChamado, 
      'Status atualizado para "' + novoStatus + '" diretamente pela listagem da Fila Geral.', 
      novoStatus, 
      false, 
      []
    );
    return { sucesso: res.sucesso, novoStatus: novoStatus };
  } catch (err) {
    return { sucesso: false, erro: err.message };
  }
}

/**
 * Retorna o histórico de interações de um chamado específico.
 */
function obterHistoricoChamado(idChamado) {
  const props = PropertiesService.getScriptProperties();
  const spreadsheetId = props.getProperty('SPREADSHEET_ID');
  const ss = SpreadsheetApp.openById(spreadsheetId);
  const abaLog = ss.getSheetByName('LOG_INTERACOES');
  if (!abaLog) return [];
  
  let isAdmin = false;
  try {
    const config = obterConfiguracoesIniciais();
    isAdmin = config.usuario.isAdmin;
  } catch (e) {}

  const dados = abaLog.getDataRange().getValues();
  const logs = [];
  const idProcurado = String(idChamado || '').trim().toUpperCase();

  for (let i = 1; i < dados.length; i++) {
    const idItem = String(dados[i][1] != null ? dados[i][1] : '').trim().toUpperCase();
    if (idItem === idProcurado) {
      const visivelVal = String(dados[i][8] != null ? dados[i][8] : '').trim().toUpperCase();
      const visivel = visivelVal === 'SIM' || visivelVal === 'TRUE';
      // Solicitante comum só vê se visivelSolicitante === SIM
      if (isAdmin || visivel) {
        logs.push({
          idLog: String(dados[i][0] != null ? dados[i][0] : ''),
          dataHora: formatarData(dados[i][2]),
          autor: String(dados[i][3] != null ? dados[i][3] : ''),
          tipoAcao: String(dados[i][4] != null ? dados[i][4] : ''),
          statusAnterior: String(dados[i][5] != null ? dados[i][5] : ''),
          novoStatus: String(dados[i][6] != null ? dados[i][6] : ''),
          mensagem: String(dados[i][7] != null ? dados[i][7] : ''),
          visivelSolicitante: visivel
        });
      }
    }
  }

  return logs;
}

/**
 * Registra a resposta ou esclarecimento do usuário solicitante pela aba Meus Chamados.
 * Suporta texto e/ou upload de múltiplos anexos.
 */
function adicionarRespostaSolicitante(idChamado, respostaTexto, arquivosBase64, emailSolicitanteParam) {
  try {
    const temTexto = respostaTexto && respostaTexto.trim().length > 0;
    const temArquivos = arquivosBase64 && arquivosBase64.length > 0;

    if (!temTexto && !temArquivos) {
      return { sucesso: false, erro: 'Digite uma resposta ou anexe um arquivo antes de enviar.' };
    }

    const props = PropertiesService.getScriptProperties();
    const spreadsheetId = props.getProperty('SPREADSHEET_ID');
    const ss = SpreadsheetApp.openById(spreadsheetId);
    const abaChamados = ss.getSheetByName('CHAMADOS');
    const abaLog = ss.getSheetByName('LOG_INTERACOES');

    const usuarioEmail = (emailSolicitanteParam && emailSolicitanteParam.includes('@'))
      ? emailSolicitanteParam.trim().toLowerCase()
      : ((Session.getActiveUser().getEmail() || '').trim().toLowerCase() || 'solicitante@brisanet.com.br');
    const agora = new Date();

    const dados = abaChamados.getDataRange().getValues();
    let linhaAlvo = -1;
    let statusAtual = '';
    let atendenteEmail = '';
    let tituloChamado = '';
    let emailsAcompanhantes = '';
    let anexosExistentes = [];

    for (let i = 1; i < dados.length; i++) {
      if (dados[i][0] === idChamado) {
        linhaAlvo = i + 1;
        statusAtual = dados[i][11];
        atendenteEmail = dados[i][12];
        tituloChamado = dados[i][8];
        emailsAcompanhantes = String(dados[i][19] || '').trim();
        try {
          if (dados[i][10]) anexosExistentes = JSON.parse(dados[i][10]);
        } catch (e) {
          anexosExistentes = [];
        }
        break;
      }
    }

    if (linhaAlvo === -1) return { sucesso: false, erro: 'Chamado não localizado.' };
    if (statusAtual === 'Concluído' || statusAtual === 'Cancelado') {
      return { sucesso: false, erro: 'Este chamado já foi finalizado e não aceita novas interações.' };
    }

    // Processar novos anexos do solicitante (se houver)
    const novosAnexos = salvarAnexosNoDrive(idChamado, arquivosBase64);
    if (novosAnexos.length > 0) {
      anexosExistentes = anexosExistentes.concat(novosAnexos);
      abaChamados.getRange(linhaAlvo, 11).setValue(JSON.stringify(sanitizarAnexosParaPlanilha(anexosExistentes)));
    }

    // Se estava Aguardando Retorno, volta automaticamente para Em Atendimento
    let novoStatus = statusAtual;
    if (statusAtual === 'Aguardando Retorno') {
      novoStatus = 'Em Atendimento';
      abaChamados.getRange(linhaAlvo, 12).setValue(novoStatus);
      abaChamados.getRange(linhaAlvo, 18).clearContent();
      abaChamados.getRange(linhaAlvo, 19).clearContent();
    }

    // Montar texto de log
    let textoLog = temTexto ? respostaTexto.trim() : '';
    if (novosAnexos.length > 0) {
      const listaTxt = novosAnexos.map(function(a) { return a.nome + ' (' + a.url + ')'; }).join('\n');
      textoLog = textoLog ? (textoLog + '\n\nAnexos adicionados:\n' + listaTxt) : ('Anexos adicionados:\n' + listaTxt);
    }

    // Grava no Log de Interações com tipo de ação exclusivo do solicitante
    abaLog.appendRow([
      Utilities.getUuid(),
      idChamado,
      agora,
      usuarioEmail,
      'Resposta do Solicitante',
      statusAtual,
      novoStatus,
      textoLog,
      'SIM'
    ]);

    // Notifica o atendente responsável por e-mail (e eventuais acompanhantes em cópia)
    if (atendenteEmail && atendenteEmail.includes('@')) {
      try {
        enviarEmailNotificacao({
          destinatario: atendenteEmail,
          cc: emailsAcompanhantes,
          assunto: '[brisanet] Chamado ' + idChamado + ' - ' + tituloChamado,
          idChamado: idChamado,
          titulo: tituloChamado,
          mensagem: 'O solicitante adicionou uma nova resposta ao chamado:\n\n"' + (temTexto ? respostaTexto.trim() : 'Novo(s) arquivo(s) anexado(s) pelo solicitante.') + '"',
          autor: usuarioEmail,
          anexos: novosAnexos,
          aba: 'fila'
        });
      } catch (eMail) {
        Logger.log('Erro ao notificar atendente: ' + eMail.message);
      }
    }

    return { 
      sucesso: true, 
      mensagem: 'Resposta enviada com sucesso!', 
      chamadoAtualizado: { anexos: sanitizarAnexosParaPlanilha(anexosExistentes) } 
    };
  } catch (err) {
    Logger.log('Erro em adicionarRespostaSolicitante: ' + err.message);
    return { sucesso: false, erro: err.message };
  }
}

/**
 * Extrai o ID de um arquivo a partir da URL do Google Drive.
 */
function extrairIdDrive(url) {
  if (!url) return null;
  const match = url.match(/\/d\/([-\w]{25,})/i) || url.match(/id=([-\w]{25,})/i) || url.match(/[-\w]{25,}/);
  return match ? (match[1] || match[0]) : null;
}

/**
 * Converte um objeto de anexo { nome, url, id, blob } em um Blob do Google Apps Script para anexo físico no e-mail.
 */
function obterBlobDoAnexo(anexo) {
  try {
    if (!anexo) return null;
    // 1. Se o Blob já estiver em memória (do upload atual), use diretamente
    if (anexo.blob && typeof anexo.blob.getBytes === 'function') {
      return anexo.blob;
    }
    // 2. Tentar recuperar o arquivo diretamente pelo ID do Google Drive
    let fileId = anexo.id;
    if (!fileId && anexo.url) {
      fileId = extrairIdDrive(anexo.url);
    }
    if (fileId) {
      const file = DriveApp.getFileById(fileId);
      const blob = file.getBlob();
      if (anexo.nome) {
        blob.setName(anexo.nome);
      }
      return blob;
    }
  } catch (err) {
    Logger.log('Erro ao obter blob do anexo ' + (anexo.nome || '') + ': ' + err.message);
  }
  return null;
}

/**
 * Retorna a URL publicada do Web App, com normalização para o formato universal.
 */
function obterUrlWebApp() {
  let url = '';
  try {
    url = ScriptApp.getService().getUrl();
    if (url && url.length > 5) {
      const urlNorm = normalizarUrlPublica(url);
      try {
        const props = PropertiesService.getScriptProperties();
        if (props.getProperty('WEB_APP_URL') !== urlNorm) {
          props.setProperty('WEB_APP_URL', urlNorm);
        }
      } catch (eProp) {}
      return urlNorm;
    }
  } catch (err) {
    Logger.log('Aviso ao obter URL via ScriptApp: ' + err.message);
  }

  try {
    const props = PropertiesService.getScriptProperties();
    const salva = props.getProperty('WEB_APP_URL');
    if (salva) return normalizarUrlPublica(salva);
  } catch (e2) {}

  return '';
}

/**
 * Retorna a URL universal pública do Portal de Visitas Externas.
 * Se configurada URL específica nas ScriptProperties (URL_PORTAL_VISITAS) ou na planilha (CONFIGURACOES!D2),
 * utiliza ela com prioridade absoluta.
 * Caso contrário, normaliza a URL retornada por ScriptApp.getService().getUrl().
 */
function obterUrlPortalVisitas() {
  const props = PropertiesService.getScriptProperties();
  let urlEspecifica = props.getProperty('URL_PORTAL_VISITAS');

  // Fallback 1: Verificar se foi gravada na aba CONFIGURACOES célula D2
  if (!urlEspecifica) {
    try {
      const spreadsheetId = props.getProperty('SPREADSHEET_ID');
      if (spreadsheetId) {
        const ss = SpreadsheetApp.openById(spreadsheetId);
        const abaConfig = ss.getSheetByName('CONFIGURACOES');
        if (abaConfig) {
          const valorD2 = String(abaConfig.getRange('D2').getValue() || '').trim();
          if (valorD2.startsWith('http')) {
            urlEspecifica = valorD2;
            props.setProperty('URL_PORTAL_VISITAS', normalizarUrlPublica(valorD2));
          }
        }
      }
    } catch (eSheet) {}
  }

  // Fallback 2: URL Oficial da Implantação Externa registrada no projeto
  if (!urlEspecifica) {
    urlEspecifica = 'https://script.google.com/macros/s/AKfycbxPsXwK2d71IB47RZCIInk6LF_8jEtSLsc34rpH0p012JpDpP-qWV95_kBLRsG5MNst/exec';
    try {
      props.setProperty('URL_PORTAL_VISITAS', urlEspecifica);
    } catch (eP) {}
  }

  if (urlEspecifica && urlEspecifica.trim().startsWith('http')) {
    return normalizarUrlPublica(urlEspecifica.trim());
  }

  const urlBase = obterUrlWebApp();
  return normalizarUrlPublica(urlBase);
}

/**
 * Normaliza URLs do Google Apps Script para a URL pública universal (https://script.google.com/macros/s/...),
 * removendo prefixos restritivos de domínio corporativo (/a/macros/dominio.com.br/s/...)
 * e números de conta Google (/u/0/, /u/1/) para garantir que qualquer usuário acesse a página sem erro do Drive.
 */
function normalizarUrlPublica(url) {
  if (!url || typeof url !== 'string') return '';
  let limpa = url.trim().split('#')[0].split('?')[0];

  // Substitui /a/macros/dominio/s/ ou /a/dominio/macros/s/ por /macros/s/
  limpa = limpa.replace(/https?:\/\/script\.google\.com\/a\/macros\/[^\/]+\/s\//i, 'https://script.google.com/macros/s/');
  limpa = limpa.replace(/https?:\/\/script\.google\.com\/a\/[^\/]+\/macros\/s\//i, 'https://script.google.com/macros/s/');

  // Remove prefixos /u/0/, /u/1/ que forçam conta específica do navegador
  limpa = limpa.replace(/https?:\/\/script\.google\.com\/u\/\d+\/macros\/s\//i, 'https://script.google.com/macros/s/');

  return limpa;
}

/**
 * Permite que o administrador configure a URL pública oficial do Portal de Visitas.
 * Grava nas ScriptProperties e na aba CONFIGURACOES da planilha.
 */
function configurarUrlPortalVisitas(url) {
  let isAdmin = false;
  try {
    const config = obterConfiguracoesIniciais();
    isAdmin = config.usuario.isAdmin;
  } catch (e) {
    isAdmin = true; // Permite execução direta pelo editor do Apps Script
  }

  if (!isAdmin) {
    throw new Error('Apenas administradores podem configurar a URL do portal.');
  }

  const limpa = normalizarUrlPublica(url);
  if (!limpa || !limpa.startsWith('http')) {
    throw new Error('URL inválida. A URL deve começar com https://script.google.com/macros/s/...');
  }

  const props = PropertiesService.getScriptProperties();
  props.setProperty('URL_PORTAL_VISITAS', limpa);

  // Também persiste na planilha aba CONFIGURACOES (coluna D)
  try {
    const spreadsheetId = props.getProperty('SPREADSHEET_ID');
    if (spreadsheetId) {
      const ss = SpreadsheetApp.openById(spreadsheetId);
      const abaConfig = ss.getSheetByName('CONFIGURACOES');
      if (abaConfig) {
        abaConfig.getRange('D1').setValue('URL_PORTAL_VISITAS');
        abaConfig.getRange('D2').setValue(limpa);
      }
    }
  } catch (eSheet) {}

  return { sucesso: true, url: limpa, mensagem: 'URL da Implantação Externa configurada com sucesso!' };
}

/**
 * Utilitário executável diretamente pelo editor do Google Apps Script.
 * Substitua a variável abaixo pela URL da sua Implantação Externa
 * (com 'Quem pode acessar: Qualquer pessoa') e clique no botão 'Executar'.
 */
function definirUrlExternaManual() {
  const urlExterna = "https://script.google.com/macros/s/AKfycbxPsXwK2d71IB47RZCIInk6LF_8jEtSLsc34rpH0p012JpDpP-qWV95_kBLRsG5MNst/exec";
  const res = configurarUrlPortalVisitas(urlExterna);
  Logger.log('Configuração concluída: ' + JSON.stringify(res));
  return res;
}

/**
 * Retorna os detalhes de um chamado específico pelo seu ID (Protocolo).
 * Permite que a interface abra o chamado imediatamente via link direto de e-mail.
 */
function obterChamadoPorId(idChamado) {
  if (!idChamado) return null;
  const config = obterConfiguracoesIniciais();
  const usuarioEmail = config.usuario.email.trim().toLowerCase();

  const props = PropertiesService.getScriptProperties();
  const spreadsheetId = props.getProperty('SPREADSHEET_ID');
  const ss = SpreadsheetApp.openById(spreadsheetId);
  const abaChamados = ss.getSheetByName('CHAMADOS');

  const dados = abaChamados.getDataRange().getValues();
  for (let i = 1; i < dados.length; i++) {
    if (String(dados[i][0]).trim().toUpperCase() === String(idChamado).trim().toUpperCase()) {
      const emailSolicitante = String(dados[i][2]).trim().toLowerCase();
      // Permitir acesso se for Administrador ou se for o próprio Solicitante
      if (config.usuario.isAdmin || emailSolicitante === usuarioEmail) {
        return montarObjetoChamado(dados[i]);
      } else {
        throw new Error('Você não tem permissão para visualizar este chamado.');
      }
    }
  }
  return null;
}

/**
 * Recupera o histórico cronológico de interações públicas de um chamado
 * para montagem da timeline corporativa em notificações por e-mail.
 */
function obterHistoricoLogsParaEmail(idChamado) {
  try {
    const props = PropertiesService.getScriptProperties();
    const spreadsheetId = props.getProperty('SPREADSHEET_ID');
    if (!spreadsheetId) return [];
    const ss = SpreadsheetApp.openById(spreadsheetId);
    
    // Garante leitura imediata dos dados mais recentes gravados
    SpreadsheetApp.flush();
    
    const abaLog = ss.getSheetByName('LOG_INTERACOES');
    if (!abaLog) return [];
    
    const dados = abaLog.getDataRange().getValues();
    const logs = [];
    const idProcurado = String(idChamado || '').trim().toUpperCase();
    
    for (let i = 1; i < dados.length; i++) {
      const idItem = String(dados[i][1] != null ? dados[i][1] : '').trim().toUpperCase();
      if (idItem === idProcurado) {
        const visivelVal = String(dados[i][8] != null ? dados[i][8] : '').trim().toUpperCase();
        const visivel = visivelVal === 'SIM' || visivelVal === 'TRUE';
        
        // Apenas mensagens visíveis ao solicitante compõem a timeline pública da conversa
        if (visivel) {
          const msg = String(dados[i][7] != null ? dados[i][7] : '').trim();
          if (msg.length > 0) {
            logs.push({
              dataHora: formatarData(dados[i][2]),
              dataRaw: (dados[i][2] instanceof Date) ? dados[i][2].getTime() : i,
              autor: String(dados[i][3] != null ? dados[i][3] : '').trim(),
              tipoAcao: String(dados[i][4] != null ? dados[i][4] : '').trim(),
              statusAnterior: String(dados[i][5] != null ? dados[i][5] : '').trim(),
              novoStatus: String(dados[i][6] != null ? dados[i][6] : '').trim(),
              mensagem: msg
            });
          }
        }
      }
    }
    
    // Ordenação cronológica (do mais antigo para o mais recente)
    logs.sort(function(a, b) {
      return a.dataRaw - b.dataRaw;
    });
    
    return logs;
  } catch (err) {
    Logger.log('Aviso ao obter histórico de logs para e-mail: ' + err.message);
    return [];
  }
}

/**
 * Converte URLs em links HTML clicáveis e sanitiza caracteres para prevenção de injeção.
 */
function formatarTextoComLinksHtml(texto) {
  if (!texto) return '';
  const safeTexto = String(texto)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  
  const urlRegex = /(https?:\/\/[^\s<]+)/g;
  return safeTexto.replace(urlRegex, function(url) {
    return '<a href="' + url + '" target="_blank" style="color: #0B316D; text-decoration: underline; font-weight: 600;">' + url + '</a>';
  });
}

/**
 * Monta o bloco HTML da Linha do Tempo da conversa para inclusão no corpo do e-mail.
 */
function montarHtmlTimelineEmail(logs, emailSolicitante) {
  if (!logs || logs.length === 0) return '';
  
  const total = logs.length;
  const cardsHtml = logs.map(function(item, idx) {
    const isUltima = idx === total - 1;
    const autorLimpo = String(item.autor || 'Sistema Brisanet').trim();
    const nomeAutor = autorLimpo.includes('@') ? autorLimpo.split('@')[0].replace('.', ' ') : autorLimpo;
    const nomeFormatado = nomeAutor.charAt(0).toUpperCase() + nomeAutor.slice(1);
    
    const tipo = String(item.tipoAcao || '').toLowerCase();
    const isSolicitante = tipo.includes('solicitante') || tipo.includes('visitante') || (emailSolicitante && autorLimpo.toLowerCase() === emailSolicitante.toLowerCase());
    const isSistema = tipo.includes('aviso') || tipo.includes('cancelado') || autorLimpo.toLowerCase().includes('sistema');
    
    let corBorda = '#0B316D';
    let corBadge = '#EFF6FF';
    let corBadgeTexto = '#1D4ED8';
    let rotuloPapel = 'Atendente / Equipe';
    
    if (isSistema) {
      corBorda = '#D97706';
      corBadge = '#FEF3C7';
      corBadgeTexto = '#B45309';
      rotuloPapel = 'Sistema';
    } else if (isSolicitante) {
      corBorda = '#2563EB';
      corBadge = '#F1F5F9';
      corBadgeTexto = '#334155';
      rotuloPapel = tipo.includes('visitante') ? 'Visitante / Empresa' : 'Solicitante';
    } else {
      corBorda = '#FF5022';
      corBadge = '#FFF1EE';
      corBadgeTexto = '#C23610';
      rotuloPapel = 'Atendente Telefonia';
    }
    
    const badgeStatus = (item.novoStatus ? '<span style="font-size: 10px; font-weight: 700; color: #475569; background-color: #E2E8F0; padding: 2px 7px; border-radius: 4px; margin-left: 6px;">Status: ' + item.novoStatus + '</span>' : '');
    const badgeMaisRecente = (isUltima && total > 1) ? '<span style="font-size: 10px; font-weight: 700; color: #FFFFFF; background-color: #059669; padding: 2px 7px; border-radius: 4px; margin-left: 6px; text-transform: uppercase;">Mais Recente</span>' : '';
    
    return [
      '<div style="margin-bottom: 12px; background-color: #FFFFFF; border: 1px solid #E2E8F0; border-left: 4px solid ' + corBorda + '; border-radius: 0 10px 10px 0; padding: 12px 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.02);' + (isUltima ? ' background-color: #FAFCFF;' : '') + '">',
      '  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 6px;">',
      '    <tr>',
      '      <td style="vertical-align: middle;">',
      '        <div style="font-size: 12px; font-weight: 700; color: #0F172A;">',
      '          ' + nomeFormatado + ' ',
      '          <span style="font-size: 10px; font-weight: 700; color: ' + corBadgeTexto + '; background-color: ' + corBadge + '; padding: 2px 7px; border-radius: 4px; text-transform: uppercase; margin-left: 4px;">' + (item.tipoAcao || rotuloPapel) + '</span>',
      '          ' + badgeStatus,
      '          ' + badgeMaisRecente,
      '        </div>',
      '        <div style="font-size: 11px; color: #64748B; margin-top: 2px;">' + autorLimpo + '</div>',
      '      </td>',
      '      <td style="text-align: right; vertical-align: top; white-space: nowrap; font-size: 11px; color: #94A3B8; font-weight: 600;">',
      '        ' + item.dataHora,
      '      </td>',
      '    </tr>',
      '  </table>',
      '  <div style="font-size: 13px; line-height: 1.6; color: #334155; white-space: pre-wrap; word-break: break-word; border-top: 1px dashed #E2E8F0; padding-top: 8px; margin-top: 6px;">' + formatarTextoComLinksHtml(item.mensagem) + '</div>',
      '</div>'
    ].join('\n');
  }).join('\n');

  return [
    '<div style="margin-top: 24px; margin-bottom: 22px;">',
    '  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 12px; border-bottom: 2px solid #E2E8F0; padding-bottom: 6px;">',
    '    <tr>',
    '      <td style="font-size: 12px; font-weight: 700; color: #0B316D; text-transform: uppercase; letter-spacing: 0.6px;">',
    '        Linha do Tempo da Conversa &bull; Histórico Completo',
    '      </td>',
    '      <td style="text-align: right; font-size: 11px; color: #64748B; font-weight: 600;">',
    '        ' + total + ' interação(ões)',
    '      </td>',
    '    </tr>',
    '  </table>',
    '  <div style="font-size: 12px; color: #64748B; margin-bottom: 12px; line-height: 1.4;">',
    '    Acompanhe abaixo o histórico cronológico de todas as mensagens e pareceres registrados para este chamado:',
    '  </div>',
    cardsHtml,
    '</div>'
  ].join('\n');
}

/**
 * Monta o histórico textual da conversa para o corpo em texto plano (fallback).
 */
function montarTextoPlanoTimeline(logs) {
  if (!logs || logs.length === 0) return '';
  const linhas = [
    '',
    '------------------------------------------------------------',
    'HISTÓRICO DA CONVERSA / TIMELINE DO CHAMADO',
    '------------------------------------------------------------'
  ];
  for (let i = 0; i < logs.length; i++) {
    const item = logs[i];
    const tagRecente = (i === logs.length - 1 && logs.length > 1) ? ' [Mais recente]' : '';
    const header = '[' + item.dataHora + '] ' + item.autor + ' (' + (item.tipoAcao || 'Interação') + ')' + (item.novoStatus ? ' [Status: ' + item.novoStatus + ']' : '') + tagRecente + ':';
    linhas.push(header);
    linhas.push(item.mensagem);
    linhas.push('');
  }
  linhas.push('------------------------------------------------------------');
  return linhas.join('\n');
}

/**
 * Template corporativo oficial de notificação por e-mail (brisanet).
 * Utiliza tipografia e paleta do projeto (Navy #0B316D, Laranja #FF5022, Cinza #E8E8E8).
 * Agrupa todas as respostas de um chamado na mesma conversa (Thread) e apresenta a
 * timeline completa de todas as interações trocadas.
 */
function enviarEmailNotificacao(params) {
  const idChamado = params.idChamado;
  const titulo = params.titulo || 'Atendimento Telefonia';
  const emailAtendente = (params.autor && params.autor.indexOf('telefonia@') === -1) 
    ? params.autor 
    : (Session.getActiveUser().getEmail() || obterEmailAdminPadrao());
  const nomeAtendente = emailAtendente.includes('@') ? emailAtendente.split('@')[0].replace('.', ' ') : 'Atendimento Telefonia';
  const nomeFormatado = nomeAtendente.charAt(0).toUpperCase() + nomeAtendente.slice(1);

  // Assunto unificado: todas as mensagens do ciclo de vida deste chamado utilizam o mesmo assunto,
  // garantindo agrupamento nativo em thread no Gmail, Outlook e outros clientes de e-mail.
  const assuntoUnificado = '[brisanet] Chamado ' + idChamado + ' - ' + titulo;

  // Link direto para o chamado no painel web
  const abaAlvo = params.aba || 'meus';
  const urlBase = params.webAppUrl || obterUrlWebApp();
  let linkChamado = '';
  if (urlBase) {
    const sep = urlBase.includes('?') ? '&' : '?';
    linkChamado = urlBase + sep + 'chamado=' + encodeURIComponent(idChamado) + '&aba=' + encodeURIComponent(abaAlvo);
  }

  // 1. Coletar Blobs dos anexos para envio como anexos físicos nativos no e-mail
  const blobsAnexos = [];
  let tamanhoTotalBytes = 0;
  const LIMITE_ANEXOS_BYTES = 20 * 1024 * 1024; // 20 MB limite seguro para envio de e-mails corporativos

  if (params.anexos && Array.isArray(params.anexos)) {
    for (let i = 0; i < params.anexos.length; i++) {
      const anexo = params.anexos[i];
      try {
        const blob = obterBlobDoAnexo(anexo);
        if (blob) {
          const tamanho = blob.getBytes().length;
          if (tamanhoTotalBytes + tamanho <= LIMITE_ANEXOS_BYTES) {
            blobsAnexos.push(blob);
            tamanhoTotalBytes += tamanho;
          } else {
            Logger.log('Anexo ' + (anexo.nome || '') + ' ultrapassou o limite total de 20MB. Disponível via link direto.');
          }
        }
      } catch (errBlob) {
        Logger.log('Erro ao processar blob do anexo para e-mail: ' + errBlob.message);
      }
    }
  }

  // 2. Montar bloco HTML destacado para os anexos no corpo do e-mail com BOTÕES DE DOWNLOAD DIRETO
  let htmlAnexos = '';
  if (params.anexos && params.anexos.length > 0) {
    const cardsAnexos = params.anexos.map(function(a) {
      const fileId = a.id || extrairIdDrive(a.url);
      const downloadUrl = a.downloadUrl || (fileId ? 'https://drive.google.com/uc?export=download&id=' + fileId : a.url);
      const viewUrl = a.url || (fileId ? 'https://drive.google.com/file/d/' + fileId + '/view' : '#');

      return [
        '<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 10px; background-color: #FFFFFF; border: 1px solid #CBD5E1; border-radius: 8px;">',
        '  <tr>',
        '    <td style="padding: 12px 14px; vertical-align: middle;">',
        '      <div style="font-size: 13px; font-weight: 700; color: #0F172A; margin-bottom: 2px;">',
        '        <span style="color: #FF5022; font-size: 14px; font-weight: bold; margin-right: 6px;">&bull;</span>' + a.nome,
        '      </div>',
        '      <div style="font-size: 11px; color: #64748B; padding-left: 14px;">',
        '        Documento anexado à solicitação',
        '      </div>',
        '    </td>',
        '    <td style="padding: 12px 14px; text-align: right; vertical-align: middle; white-space: nowrap;">',
        '      <a href="' + downloadUrl + '" target="_blank" style="display: inline-block; padding: 7px 14px; background-color: #FF5022; color: #FFFFFF; font-size: 11px; font-weight: 700; text-decoration: none; border-radius: 6px; margin-right: 6px;">Baixar Arquivo</a>',
        '      <a href="' + viewUrl + '" target="_blank" style="display: inline-block; padding: 7px 12px; background-color: #EFF6FF; border: 1px solid #BFDBFE; color: #2242D4; font-size: 11px; font-weight: 700; text-decoration: none; border-radius: 6px;">Ver no Drive</a>',
        '    </td>',
        '  </tr>',
        '</table>'
      ].join('\n');
    }).join('\n');

    htmlAnexos = [
      '<div style="background-color: #F8FAFC; border: 1px solid #CBD5E1; border-radius: 12px; padding: 18px 20px; margin-bottom: 22px;">',
      '  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 10px; border-bottom: 1px solid #E2E8F0; padding-bottom: 8px;">',
      '    <tr>',
      '      <td style="font-size: 12px; font-weight: 700; color: #0B316D; text-transform: uppercase; letter-spacing: 0.5px;">',
      '        Documentos e Arquivos Anexados',
      '      </td>',
      '      <td style="text-align: right;">',
      '        <span style="background-color: #E2E8F0; color: #334155; font-size: 10px; font-weight: 700; padding: 3px 8px; border-radius: 6px;">' + params.anexos.length + ' arquivo(s)</span>',
      '      </td>',
      '    </tr>',
      '  </table>',
      '  <div style="font-size: 12px; color: #475569; margin-bottom: 12px; line-height: 1.5;">',
      '    Clique em <strong>Baixar Arquivo</strong> para salvar o documento diretamente em seu dispositivo, ou visualize online. Os arquivos também foram anexados a este e-mail para download.',
      '  </div>',
      cardsAnexos,
      '</div>'
    ].join('\n');
  }

  // 3. Obter histórico cronológico de interações do chamado para montagem da timeline da conversa
  let historicoLogs = [];
  try {
    historicoLogs = obterHistoricoLogsParaEmail(idChamado);
  } catch (eH) {
    Logger.log('Aviso ao carregar histórico de interações: ' + eH.message);
  }

  // Garante que a mensagem atual esteja representada na timeline
  const msgAtualLimpa = String(params.mensagem || '').trim();
  if (msgAtualLimpa) {
    const jaContemMsg = historicoLogs.some(function(item) {
      return item.mensagem && (item.mensagem.indexOf(msgAtualLimpa) !== -1 || msgAtualLimpa.indexOf(item.mensagem) !== -1);
    });
    if (!jaContemMsg) {
      historicoLogs.push({
        dataHora: formatarData(new Date()),
        dataRaw: Date.now(),
        autor: emailAtendente,
        tipoAcao: 'Mensagem / Parecer',
        statusAnterior: '',
        novoStatus: '',
        mensagem: msgAtualLimpa
      });
    }
  }

  const htmlTimeline = montarHtmlTimelineEmail(historicoLogs, params.destinatario);
  const textoPlanoTimeline = montarTextoPlanoTimeline(historicoLogs);

  const listaCc = sanitizarEmailsAcompanhantes(params.cc);

  const htmlCorpo = [
    '<!DOCTYPE html>',
    '<html>',
    '<head>',
    '  <meta charset="UTF-8">',
    '  <style>',
    '    @import url("https://fonts.googleapis.com/css2?family=Figtree:wght@400;600;700&family=Rubik:wght@500;700&display=swap");',
    '    body { font-family: "Figtree", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background-color: #F8FAFC; margin: 0; padding: 20px; }',
    '  </style>',
    '</head>',
    '<body style="background-color: #F8FAFC; font-family: \'Figtree\', Arial, sans-serif; margin: 0; padding: 24px;">',
    '  <div style="max-width: 600px; margin: 0 auto; background-color: #FFFFFF; border: 1px solid #E8E8E8; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">',
    '    <!-- Barra de Destaque Laranja Brisa -->',
    '    <div style="height: 5px; background: linear-gradient(90deg, #FF5022, #E47D20);"></div>',
    '    ',
    '    <!-- Header Institucional Azul Marinho -->',
    '    <div style="background-color: #0B316D; padding: 24px; color: #FFFFFF;">',
    '      <div style="font-size: 19px; font-weight: 700; letter-spacing: -0.3px; margin: 0;">',
    '        <span style="font-weight: 700;">brisanet</span> <span style="color: #94A3B8; font-weight: 300;">|</span> <span>Gestão de Telefonia</span>',
    '      </div>',
    '      <div style="font-size: 11px; font-weight: 600; color: #E2E8F0; text-transform: uppercase; letter-spacing: 1px; margin-top: 4px;">',
    '        GERÊNCIA EXECUTIVA DE TELEFONIA &bull; BRISANET',
    '      </div>',
    '    </div>',
    '    ',
    '    <!-- Conteúdo Principal -->',
    '    <div style="padding: 28px 24px; color: #1E293B;">',
    '      <!-- Protocolo -->',
    (linkChamado ? [
      '      <div style="margin-bottom: 18px;">',
      '        <a href="' + linkChamado + '" target="_blank" style="display: inline-block; padding: 6px 14px; background-color: #EFF6FF; border: 1px solid #BFDBFE; border-radius: 8px; font-family: \'Rubik\', sans-serif; font-size: 13px; font-weight: 700; color: #0B316D; text-decoration: none;" title="Abrir chamado no painel">',
      '          Protocolo: ' + idChamado + ' <span style="color: #2242D4; font-size: 12px; margin-left: 4px;">&#8599;</span>',
      '        </a>',
      '      </div>'
    ].join('\n') : [
      '      <div style="display: inline-block; padding: 5px 12px; background-color: #F1F5F9; border: 1px solid #E2E8F0; border-radius: 8px; font-family: \'Rubik\', sans-serif; font-size: 13px; font-weight: 700; color: #0B316D; margin-bottom: 18px;">',
      '        Protocolo: ' + idChamado,
      '      </div>'
    ].join('\n')),
    '      ',
    '      <!-- Assunto -->',
    '      <h2 style="margin: 0 0 16px 0; font-size: 16px; font-weight: 700; color: #0F172A; line-height: 1.4;">',
    '        ' + titulo,
    '      </h2>',
    '      ',
    '      <!-- Parecer Técnico / Mensagem Mais Recente -->',
    '      <div style="background-color: #F8FAFC; border-left: 4px solid #FF5022; border-top: 1px solid #E8E8E8; border-right: 1px solid #E8E8E8; border-bottom: 1px solid #E8E8E8; border-radius: 0 10px 10px 0; padding: 16px; margin-bottom: 22px;">',
    '        <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #FF5022; margin-bottom: 6px;">',
    '          Última Mensagem / Parecer:',
    '        </div>',
    '        <div style="font-size: 14px; line-height: 1.6; color: #334155; white-space: pre-wrap;">' + formatarTextoComLinksHtml(params.mensagem) + '</div>',
    '      </div>',
    '      ',
    htmlAnexos,
    '      ',
    '      <!-- Atendente Responsável -->',
    '      <div style="font-size: 12px; color: #64748B; margin-bottom: 8px;">',
    '        Responsável pela atualização: <strong style="color: #0F172A;">' + emailAtendente + '</strong>',
    '      </div>',
    (listaCc ? [
      '      <!-- Acompanhantes em Cópia (CC) -->',
      '      <div style="font-size: 11px; color: #64748B; margin-bottom: 20px; background-color: #F1F5F9; border-radius: 6px; padding: 6px 10px; display: inline-block;">',
      '        Acompanhantes notificados: <strong style="color: #0B316D;">' + listaCc + '</strong>',
      '      </div>'
    ].join('\n') : ''),
    '      ',
    htmlTimeline,
    '      ',
    (linkChamado ? [
      '      <!-- Botão Direto para o Chamado -->',
      '      <div style="margin: 22px 0 24px 0; text-align: center;">',
      '        <a href="' + linkChamado + '" target="_blank" style="display: inline-block; width: 100%; max-width: 380px; padding: 13px 22px; background-color: #0B316D; color: #FFFFFF; font-size: 13px; font-weight: 700; text-decoration: none; border-radius: 10px; box-shadow: 0 4px 6px -1px rgba(11, 49, 109, 0.2); text-align: center; box-sizing: border-box; letter-spacing: 0.3px;">',
      '          ' + (abaAlvo === 'fila' ? 'Atender Chamado na Fila Geral &rarr;' : 'Visualizar Chamado em Meus Chamados &rarr;'),
      '        </a>',
      '        <div style="font-size: 11px; color: #94A3B8; margin-top: 6px;">',
      '          Clique para abrir diretamente este chamado na plataforma',
      '        </div>',
      '      </div>'
    ].join('\n') : ''),
    '      ',
    '      <!-- AVISO DE NÃO RESPONDER POR E-MAIL -->',
    '      <div style="background-color: #FFFBEB; border: 1px solid #FDE68A; border-radius: 10px; padding: 14px 16px; margin-bottom: 15px;">',
    '        <div style="font-size: 11px; font-weight: 700; color: #92400E; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">',
    '          COMUNICADO: NÃO RESPONDA A ESTE E-MAIL',
    '        </div>',
    '        <div style="font-size: 12px; color: #78350F; line-height: 1.5;">',
    '          Respostas enviadas diretamente por e-mail <strong>não são processadas</strong>. ' + (linkChamado ? 'Para responder ao atendente, enviar esclarecimentos ou anexar novos documentos, <a href="' + linkChamado + '" target="_blank" style="color: #0B316D; font-weight: 700; text-decoration: underline;">clique aqui para acessar diretamente seu chamado em Meus Chamados</a>.' : 'Para responder ao atendente, enviar esclarecimentos ou anexar novos documentos, acesse a aba <strong>Meus Chamados</strong> no Painel Web.'),
    '        </div>',
    '      </div>',
    '    </div>',
    '    ',
    '    <!-- Rodapé Corporativo -->',
    '    <div style="background-color: #F8FAFC; padding: 16px 24px; text-align: center; font-size: 11px; color: #94A3B8; border-top: 1px solid #E8E8E8;">',
    '      Mensagem automática enviada pelo Painel de Chamados Administrativos da Telefonia &bull; brisanet',
    '    </div>',
    '  </div>',
    '</body>',
    '</html>'
  ].join('\n');

  const textoPlano = [
    'Chamado: ' + idChamado,
    'Assunto: ' + titulo,
    '',
    'ÚLTIMA MENSAGEM / PARECER:',
    params.mensagem,
    '',
    (listaCc ? 'Acompanhantes em cópia (CC): ' + listaCc + '\n\n' : ''),
    (params.anexos && params.anexos.length > 0 ? 'Anexos para download:\n' + params.anexos.map(function(a) { 
      const id = a.id || extrairIdDrive(a.url);
      const dl = a.downloadUrl || (id ? 'https://drive.google.com/uc?export=download&id=' + id : a.url);
      return '- ' + a.nome + ': ' + dl;
    }).join('\n') + '\n\n' : ''),
    textoPlanoTimeline,
    '',
    (linkChamado ? 'Link direto para o chamado no painel:\n' + linkChamado + '\n\n' : ''),
    'Responsável: ' + emailAtendente,
    '',
    'COMUNICADO: NÃO RESPONDA A ESTE E-MAIL.',
    (linkChamado ? 'Para responder ou anexar arquivos, acesse o link:\n' + linkChamado : 'Acesse a aba Meus Chamados no Painel Web para interagir.')
  ].join('\n');

  // 4. Validação rigorosa dos destinatários: impede o envio para robôs de erro ou e-mails inexistentes
  const destPrincipal = String(params.destinatario || '').trim().toLowerCase();
  if (!destPrincipal ||
      !destPrincipal.includes('@') ||
      destPrincipal.indexOf('mailer-daemon') !== -1 ||
      destPrincipal.indexOf('googlemail.com') !== -1 ||
      destPrincipal.indexOf('delivery') !== -1 ||
      destPrincipal.indexOf('subsystem') !== -1 ||
      destPrincipal.indexOf('postmaster') !== -1 ||
      destPrincipal.indexOf('daemon') !== -1 ||
      destPrincipal.indexOf('nao-responda') !== -1 ||
      destPrincipal.indexOf('telefonia@') !== -1) {
    Logger.log('Envio de e-mail cancelado: destinatário inválido ou robô (' + destPrincipal + ')');
    return;
  }

  // Sanitiza a lista de acompanhantes em CC (excluindo o destinatário principal se estiver repetido)
  const ccList = [];
  if (listaCc) {
    listaCc.split(/[,;\s]+/).forEach(function(em) {
      const emLimpo = em.trim().toLowerCase();
      if (emLimpo && emLimpo.includes('@') && ccList.indexOf(emLimpo) === -1 && emLimpo !== destPrincipal) {
        if (emLimpo.indexOf('nao-responda') === -1 &&
            emLimpo.indexOf('mailer-daemon') === -1 &&
            emLimpo.indexOf('delivery') === -1 &&
            emLimpo.indexOf('subsystem') === -1 &&
            emLimpo.indexOf('googlemail.com') === -1 &&
            emLimpo.indexOf('postmaster') === -1 &&
            emLimpo.indexOf('daemon') === -1 &&
            emLimpo.indexOf('telefonia@') === -1) {
          ccList.push(emLimpo);
        }
      }
    });
  }
  const ccFinal = ccList.join(', ');

  const replyToFinal = (emailAtendente && emailAtendente.includes('@') && emailAtendente.indexOf('telefonia@') === -1 && emailAtendente.indexOf('mailer-daemon') === -1)
    ? emailAtendente.trim().toLowerCase()
    : obterEmailAdminPadrao();

  const options = {
    htmlBody: htmlCorpo,
    name: nomeFormatado + ' | Gestão de Telefonia brisanet',
    replyTo: replyToFinal
  };

  if (ccFinal) {
    options.cc = ccFinal;
  }

  if (blobsAnexos.length > 0) {
    options.attachments = blobsAnexos;
  }

  const mailAppOptions = {
    to: destPrincipal,
    subject: assuntoUnificado,
    body: textoPlano,
    htmlBody: htmlCorpo,
    name: nomeFormatado + ' | Gestão de Telefonia brisanet',
    replyTo: replyToFinal
  };

  if (ccFinal) {
    mailAppOptions.cc = ccFinal;
  }

  if (blobsAnexos.length > 0) {
    mailAppOptions.attachments = blobsAnexos;
  }

  // 5. Envio limpo e agrupado na conversa do Gmail pelo assunto unificado
  let enviado = false;
  try {
    GmailApp.sendEmail(destPrincipal, assuntoUnificado, textoPlano, options);
    enviado = true;
  } catch (errGmail) {
    Logger.log('Aviso GmailApp: ' + errGmail.message + ' - utilizando MailApp...');
    try {
      MailApp.sendEmail(mailAppOptions);
      enviado = true;
    } catch (errMail) {
      Logger.log('Erro MailApp com anexos: ' + errMail.message + ' - tentando fallback sem anexo físico...');
      try {
        delete mailAppOptions.attachments;
        MailApp.sendEmail(mailAppOptions);
        enviado = true;
      } catch (errFinal) {
        Logger.log('Erro crítico ao enviar e-mail: ' + errFinal.message);
      }
    }
  }
}

function montarObjetoChamado(linha) {
  let anexos = [];
  try {
    if (linha[10]) anexos = JSON.parse(linha[10]);
  } catch (e) {
    anexos = [];
  }

  return {
    idChamado: linha[0],
    dataCriacao: formatarData(linha[1]),
    solicitanteEmail: linha[2],
    solicitanteNome: linha[3],
    gerencia: linha[4],
    categoria: linha[5],
    subcategoria: linha[6],
    prioridade: linha[7],
    titulo: linha[8],
    descricao: linha[9],
    anexos: anexos,
    status: linha[11],
    atendente: linha[12],
    dataInicio: formatarData(linha[13]),
    dataConclusao: formatarData(linha[14]),
    tempoTotalHoras: linha[15],
    observacoesAdmin: String(linha[16] || ''),
    dataStatusAguardando: formatarData(linha[17]),
    aviso4DiasEnviado: linha[18] === 'SIM' || linha[18] === true,
    emailsAcompanhantes: sanitizarEmailsAcompanhantes(String(linha[19] || ''))
  };
}

function formatarData(valorData) {
  if (!valorData) return '';
  if (valorData instanceof Date) {
    const tz = Session.getScriptTimeZone() || 'America/Fortaleza';
    const h = valorData.getHours();
    const m = valorData.getMinutes();
    const s = valorData.getSeconds();
    if (h === 0 && m === 0 && s === 0) {
      return Utilities.formatDate(valorData, tz, 'dd/MM/yyyy');
    }
    return Utilities.formatDate(valorData, tz, 'dd/MM/yyyy HH:mm');
  }
  const str = String(valorData).trim();
  const matchIso = str.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/);
  if (matchIso) {
    const d = matchIso[3] + '/' + matchIso[2] + '/' + matchIso[1];
    return matchIso[4] ? d + ' às ' + matchIso[4] + ':' + matchIso[5] : d;
  }
  return str;
}

// =========================================================================
// MÓDULO EXECUTIVO DE GESTÃO DE VISITAS CORPORATIVAS | BRISANET
// =========================================================================

/**
 * Garante que a aba VISITAS exista na planilha com cabeçalhos padronizados.
 */
function garantirAbaVisitas(ss) {
  let aba = ss.getSheetByName('VISITAS');
  const cabecalhos = [
    'ID_VISITA',
    'DATA_CRIACAO',
    'EMPRESA_VISITANTE',
    'RESPONSAVEL_NOME',
    'RESPONSAVEL_EMAIL',
    'RESPONSAVEL_TELEFONE',
    'PERIODO_INICIO',
    'PERIODO_FIM',
    'DADOS_PARTICIPANTES',
    'DADOS_ANFITRIOES',
    'DADOS_CRONOGRAMA',
    'DADOS_ITINERARIO',
    'DADOS_TOUR',
    'OBSERVACOES',
    'ANEXOS',
    'STATUS',
    'ATENDENTE_RESPONSAVEL',
    'TOKEN_ACESSO',
    'DATA_DECISAO',
    'MOTIVO_DECISAO',
    'EMAILS_ACOMPANHANTES'
  ];
  if (!aba) {
    aba = ss.insertSheet('VISITAS');
    aba.appendRow(cabecalhos);
    aba.getRange(1, 1, 1, cabecalhos.length)
      .setBackground('#0B316D')
      .setFontColor('#FFFFFF')
      .setFontWeight('bold');
    aba.setFrozenRows(1);
  } else {
    // Garantir cabeçalho EMAILS_ACOMPANHANTES na coluna 21
    try {
      const valAtual = aba.getRange(1, 21).getValue();
      if (!valAtual || String(valAtual).trim() === '') {
        aba.getRange(1, 21).setValue('EMAILS_ACOMPANHANTES')
          .setBackground('#0B316D')
          .setFontColor('#FFFFFF')
          .setFontWeight('bold');
      }
    } catch (eH) {}
  }
  return aba;
}

/**
 * Converte uma linha da aba VISITAS em um objeto JavaScript.
 */
function montarObjetoVisita(linha) {
  let participantes = [];
  let anfitrioes = [];
  let cronograma = [];
  let itinerario = [];
  let tour = [];
  let anexos = [];

  try { if (linha[8]) participantes = JSON.parse(linha[8]); } catch (e) {}
  try { if (linha[9]) anfitrioes = JSON.parse(linha[9]); } catch (e) {}
  try { if (linha[10]) cronograma = JSON.parse(linha[10]); } catch (e) {}
  try { if (linha[11]) itinerario = JSON.parse(linha[11]); } catch (e) {}
  try {
    if (linha[12]) {
      const parsed = JSON.parse(linha[12]);
      if (Array.isArray(parsed)) tour = parsed;
      else if (parsed) tour = [String(parsed)];
    }
  } catch (e) {
    if (linha[12]) {
      tour = String(linha[12]).split(/[\n,;]+/).map(function(s) { return s.trim(); }).filter(Boolean);
      if (tour.length === 0) tour = [String(linha[12])];
    }
  }
  try { if (linha[14]) anexos = JSON.parse(linha[14]); } catch (e) {}

  return {
    idVisita: String(linha[0] || ''),
    dataCriacao: formatarData(linha[1]),
    empresa: String(linha[2] || ''),
    responsavelNome: String(linha[3] || ''),
    responsavelEmail: String(linha[4] || ''),
    responsavelTelefone: String(linha[5] || ''),
    periodoInicio: formatarData(linha[6]),
    periodoFim: formatarData(linha[7]),
    participantes: participantes,
    anfitrioes: anfitrioes,
    cronograma: cronograma,
    itinerario: itinerario,
    tour: tour,
    observacoes: String(linha[13] || ''),
    anexos: anexos,
    status: String(linha[15] || 'Pendente'),
    atendente: String(linha[16] || ''),
    tokenAcesso: String(linha[17] || ''),
    dataDecisao: formatarData(linha[18]),
    motivoDecisao: String(linha[19] || ''),
    emailsAcompanhantes: sanitizarEmailsAcompanhantes(String(linha[20] || ''))
  };
}

/**
 * Permite ao atendente salvar ou atualizar a lista de usuários acompanhantes de uma visita corporativa.
 */
function atualizarAcompanhantesVisita(idVisita, emailsAcompanhantes) {
  try {
    const props = PropertiesService.getScriptProperties();
    const spreadsheetId = props.getProperty('SPREADSHEET_ID');
    const ss = SpreadsheetApp.openById(spreadsheetId);
    const abaVisitas = garantirAbaVisitas(ss);
    if (!abaVisitas) return { sucesso: false, erro: 'Aba VISITAS não encontrada.' };

    const dados = abaVisitas.getDataRange().getValues();
    let linhaAlvo = -1;
    for (let i = 1; i < dados.length; i++) {
      if (String(dados[i][0]).trim().toUpperCase() === String(idVisita).trim().toUpperCase()) {
        linhaAlvo = i + 1;
        break;
      }
    }

    if (linhaAlvo === -1) return { sucesso: false, erro: 'Visita ' + idVisita + ' não encontrada.' };

    const emailsSanitizados = sanitizarEmailsAcompanhantes(emailsAcompanhantes);
    abaVisitas.getRange(linhaAlvo, 21).setValue(emailsSanitizados);

    return {
      sucesso: true,
      mensagem: 'Lista de acompanhantes da visita atualizada com sucesso!',
      emailsAcompanhantes: emailsSanitizados
    };
  } catch (err) {
    Logger.log('Erro ao atualizar acompanhantes da visita: ' + err.message);
    return { sucesso: false, erro: err.message };
  }
}

/**
 * Cria uma nova solicitação de visita corporativa a partir do formulário web.
 */
function criarSolicitacaoVisita(dados, arquivosBase64) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
  } catch (eLock) {
    return { sucesso: false, erro: 'Sistema ocupado no momento. Por favor, tente novamente em instantes.' };
  }

  try {
    const props = PropertiesService.getScriptProperties();
    const spreadsheetId = props.getProperty('SPREADSHEET_ID');
    const ss = SpreadsheetApp.openById(spreadsheetId);
    const abaVisitas = garantirAbaVisitas(ss);
    const abaLog = ss.getSheetByName('LOG_INTERACOES');

    const agora = new Date();
    const anoAtual = agora.getFullYear();

    SpreadsheetApp.flush();
    const dadosExistentes = abaVisitas.getDataRange().getValues();
    let maxSeq = 0;
    for (let i = 1; i < dadosExistentes.length; i++) {
      const celulaId = String(dadosExistentes[i][0] || '').trim();
      const match = celulaId.match(/BRISA-VIS-(\d{4})-(\d+)/i);
      if (match && match[1] === String(anoAtual)) {
        const num = parseInt(match[2], 10);
        if (!isNaN(num) && num > maxSeq) {
          maxSeq = num;
        }
      }
    }
    const proximoNum = maxSeq + 1;
    const sequencial = ('0000' + proximoNum).slice(-4);
    const idVisita = 'BRISA-VIS-' + anoAtual + '-' + sequencial;
    const tokenAcesso = Utilities.getUuid().replace(/-/g, '').substring(0, 16);

    // Salvar anexos e apresentações no Google Drive
    const urlsAnexos = salvarAnexosNoDrive(idVisita, arquivosBase64);

    const emailResponsavel = String(dados.responsavelEmail || '').trim().toLowerCase();
    const nomeResponsavel = String(dados.responsavelNome || '').trim();
    const empresa = String(dados.empresa || '').trim();

    abaVisitas.appendRow([
      idVisita,
      agora,
      empresa,
      nomeResponsavel,
      emailResponsavel,
      String(dados.responsavelTelefone || '').trim(),
      dados.periodoInicio || '',
      dados.periodoFim || '',
      JSON.stringify(dados.participantes || []),
      JSON.stringify(dados.anfitrioes || []),
      JSON.stringify(dados.cronograma || []),
      JSON.stringify(dados.itinerario || []),
      JSON.stringify(dados.tour || []),
      String(dados.observacoes || ''),
      JSON.stringify(sanitizarAnexosParaPlanilha(urlsAnexos)),
      'Pendente',
      '', // Atendente
      tokenAcesso,
      '', // Data decisão
      ''  // Motivo decisão
    ]);

    // Gravar log de auditoria
    if (abaLog) {
      abaLog.appendRow([
        Utilities.getUuid(),
        idVisita,
        agora,
        emailResponsavel,
        'Solicitação de Visita',
        '',
        'Pendente',
        'Visita solicitada pela empresa ' + empresa + ' (' + nomeResponsavel + '). Total de visitantes: ' + (dados.participantes ? dados.participantes.length : 0),
        'SIM'
      ]);
    }
    SpreadsheetApp.flush();

    // Se a origem do formulário enviou a URL pública do portal e ainda não temos uma URL configurada manualmente, memorizar
    if (dados && dados.portalUrl && typeof dados.portalUrl === 'string' && dados.portalUrl.startsWith('http')) {
      const urlOrigemNorm = normalizarUrlPublica(dados.portalUrl);
      const urlSalva = props.getProperty('URL_PORTAL_VISITAS');
      if (!urlSalva && urlOrigemNorm) {
        try {
          props.setProperty('URL_PORTAL_VISITAS', urlOrigemNorm);
        } catch (eProp) {}
      }
    }

    // Link com Token seguro para acompanhamento pelo visitante externo no Portal de Visitas
    const urlWeb = obterUrlPortalVisitas();
    const linkAcompanhamento = urlWeb ? (urlWeb + (urlWeb.includes('?') ? '&' : '?') + 'portal=visita&aba=meus&visita=' + idVisita + '&token=' + tokenAcesso + '&email=' + encodeURIComponent(emailResponsavel)) : '';

    // Enviar confirmação por e-mail exclusivamente ao visitante externo (sem cópia para outros administradores)
    try {
      enviarEmailNotificacaoVisita({
        destinatario: emailResponsavel,
        assunto: '[brisanet] Visita ' + idVisita + ' - ' + empresa,
        idVisita: idVisita,
        empresa: empresa,
        periodo: (dados.periodoInicio || '') + ' a ' + (dados.periodoFim || ''),
        status: 'Pendente',
        mensagem: 'Sua solicitação de visita à Brisanet foi recebida com sucesso e está em análise pela equipe administrativa e gestores anfitriões.\n\nVocê pode consultar o status, cronograma e deliberações acessando a página "Meus Chamados" pelo link abaixo.',
        linkAcompanhamento: linkAcompanhamento,
        autorEmail: emailResponsavel,
        anexos: urlsAnexos
      });
    } catch (eMail) {
      Logger.log('Aviso ao enviar e-mail de confirmação de visita: ' + eMail.message);
    }

    return {
      sucesso: true,
      idVisita: idVisita,
      tokenAcesso: tokenAcesso,
      mensagem: 'Solicitação de visita registrada com sucesso sob o protocolo ' + idVisita + '.'
    };
  } catch (err) {
    Logger.log('Erro em criarSolicitacaoVisita: ' + err.message);
    return { sucesso: false, erro: err.message };
  } finally {
    try { lock.releaseLock(); } catch (e) {}
  }
}

/**
 * Detecta e corrige automaticamente qualquer duplicidade de protocolo na aba VISITAS.
 * Reatribui novos protocolos únicos e separa os históricos correspondentes no LOG_INTERACOES.
 */
function corrigirProtocolosDuplicadosVisitas(ss) {
  if (!ss) return;
  const abaVisitas = ss.getSheetByName('VISITAS');
  if (!abaVisitas) return;
  const abaLog = ss.getSheetByName('LOG_INTERACOES');

  SpreadsheetApp.flush();
  const dados = abaVisitas.getDataRange().getValues();
  if (dados.length <= 2) return;

  const anoAtual = new Date().getFullYear();
  let maxSeq = 0;
  for (let i = 1; i < dados.length; i++) {
    const idAtual = String(dados[i][0] || '').trim();
    const match = idAtual.match(/BRISA-VIS-(\d{4})-(\d+)/i);
    if (match && match[1] === String(anoAtual)) {
      const num = parseInt(match[2], 10);
      if (!isNaN(num) && num > maxSeq) maxSeq = num;
    }
  }

  const protocolosVistos = new Map();
  const duplicatas = [];

  for (let i = 1; i < dados.length; i++) {
    const idAtual = String(dados[i][0] || '').trim();
    if (!idAtual) continue;
    const idUpper = idAtual.toUpperCase();

    if (protocolosVistos.has(idUpper)) {
      duplicatas.push({
        rowIndex: i + 1,
        idAntigo: idAtual,
        empresa: String(dados[i][2] || '').trim(),
        email: String(dados[i][4] || '').trim().toLowerCase()
      });
    } else {
      protocolosVistos.set(idUpper, {
        rowIndex: i + 1,
        empresa: String(dados[i][2] || '').trim(),
        email: String(dados[i][4] || '').trim().toLowerCase()
      });
    }
  }

  if (duplicatas.length === 0) return;

  Logger.log('Saneamento: Detectadas ' + duplicatas.length + ' visitas com protocolo duplicado.');

  duplicatas.forEach(function(dup) {
    maxSeq++;
    const novoSequencial = ('0000' + maxSeq).slice(-4);
    const novoId = 'BRISA-VIS-' + anoAtual + '-' + novoSequencial;

    Logger.log('Corrigindo visita linha ' + dup.rowIndex + ' (' + dup.empresa + '): ' + dup.idAntigo + ' -> ' + novoId);
    abaVisitas.getRange(dup.rowIndex, 1).setValue(novoId);

    // Atualizar LOG_INTERACOES para separar os históricos entre as empresas
    if (abaLog) {
      const dadosLog = abaLog.getDataRange().getValues();
      for (let j = 1; j < dadosLog.length; j++) {
        const idLogVisita = String(dadosLog[j][1] || '').trim().toUpperCase();
        if (idLogVisita === dup.idAntigo.toUpperCase()) {
          const autorLog = String(dadosLog[j][3] || '').trim().toLowerCase();
          const msgLog = String(dadosLog[j][7] || '').toLowerCase();
          const emailNorm = dup.email.toLowerCase();
          const empNorm = dup.empresa.toLowerCase();

          const pertenceAEstaEmpresa = 
            (emailNorm && autorLog === emailNorm) ||
            (empNorm && msgLog.includes(empNorm)) ||
            (emailNorm && msgLog.includes(emailNorm));

          if (pertenceAEstaEmpresa) {
            abaLog.getRange(j + 1, 2).setValue(novoId);
          }
        }
      }
    }
  });

  SpreadsheetApp.flush();
}

/**
 * Retorna a fila administrativa de visitas e os indicadores KPI.
 */
function obterFilaVisitas(filtro) {
  const config = obterConfiguracoesIniciais();
  if (!config.usuario.isAdmin) {
    throw new Error('Acesso restrito à equipe administrativa.');
  }

  const props = PropertiesService.getScriptProperties();
  const spreadsheetId = props.getProperty('SPREADSHEET_ID');
  const ss = SpreadsheetApp.openById(spreadsheetId);
  const abaVisitas = garantirAbaVisitas(ss);

  // Auto-reparar qualquer protocolo duplicado para garantir separação estrita de históricos
  try {
    corrigirProtocolosDuplicadosVisitas(ss);
  } catch (eCorr) {
    Logger.log('Aviso ao corrigir protocolos duplicados: ' + eCorr.message);
  }

  const dados = abaVisitas.getDataRange().getValues();
  const visitas = [];

  let pendentes = 0;
  let aprovadas = 0;
  let ajustes = 0;
  let totalVisitantes = 0;

  for (let i = 1; i < dados.length; i++) {
    const item = montarObjetoVisita(dados[i]);
    const numParticipantes = item.participantes ? item.participantes.length : 0;

    if (item.status === 'Pendente' || item.status === 'Em Análise') pendentes++;
    if (item.status === 'Aprovada') {
      aprovadas++;
      totalVisitantes += numParticipantes;
    }
    if (item.status === 'Ajuste Solicitado') ajustes++;

    visitas.push(item);
  }

  // Ordenar da mais recente para a mais antiga
  visitas.reverse();

  return {
    visitas: visitas,
    kpis: {
      pendentes: pendentes,
      aprovadas: aprovadas,
      ajustes: ajustes,
      totalVisitantes: totalVisitantes
    }
  };
}

/**
 * Retorna a lista de visitas filtradas por e-mail, protocolo ou token,
 * utilizada exclusivamente pelo Portal de Visitas Externas.
 */
/**
 * Retorna a lista de visitas filtradas exclusivamente por e-mail ou token seguro.
 * Utilizada pelo Portal de Visitas Externas.
 * Por segurança e privacidade corporativa, NÃO permite busca por protocolo nem empresa,
 * impedindo que usuários externos visualizem dados de outras empresas.
 */
function obterMinhasVisitasPortal(emailConsulta, token) {
  const props = PropertiesService.getScriptProperties();
  const spreadsheetId = props.getProperty('SPREADSHEET_ID');
  if (!spreadsheetId) return [];

  const ss = SpreadsheetApp.openById(spreadsheetId);
  const abaVisitas = ss.getSheetByName('VISITAS');
  if (!abaVisitas) return [];

  const emailAlvo = (emailConsulta || '').trim().toLowerCase();
  const tokenAlvo = (token || '').trim();

  // Segurança: exige e-mail com formato válido ou token de acesso seguro
  const temEmailValido = emailAlvo && emailAlvo.includes('@') && emailAlvo.includes('.');
  if (!temEmailValido && !tokenAlvo) return [];

  const dados = abaVisitas.getDataRange().getValues();
  const resultados = [];

  for (let i = 1; i < dados.length; i++) {
    const v = montarObjetoVisita(dados[i]);
    const emailResp = (v.responsavelEmail || '').trim().toLowerCase();
    const tokenGravado = (v.tokenAcesso || '').trim();

    const bateToken = tokenAlvo && (tokenGravado === tokenAlvo);
    // Correspondência estrita e exata por e-mail
    const bateEmail = temEmailValido && (emailResp === emailAlvo);

    if (bateToken || bateEmail) {
      resultados.push(v);
    }
  }

  // Ordenar da mais recente para a mais antiga
  return resultados.reverse();
}

/**
 * Recupera os dados da visita por ID ou Token seguro.
 * Protegido: exige perfil administrativo, domínio Brisanet, Token seguro ou correspondência de e-mail.
 */
function obterVisitaPorIdOuToken(idVisita, token, emailConsulta) {
  if (!idVisita) return null;

  const props = PropertiesService.getScriptProperties();
  const spreadsheetId = props.getProperty('SPREADSHEET_ID');
  const ss = SpreadsheetApp.openById(spreadsheetId);
  const abaVisitas = garantirAbaVisitas(ss);

  let isAdmin = false;
  let usuarioEmail = '';
  try {
    const config = obterConfiguracoesIniciais();
    isAdmin = config.usuario.isAdmin;
    usuarioEmail = (config.usuario.email || '').toLowerCase().trim();
  } catch (e) {}

  const emailVerificar = (emailConsulta || usuarioEmail || '').toLowerCase().trim();

  const dados = abaVisitas.getDataRange().getValues();
  for (let i = 1; i < dados.length; i++) {
    if (String(dados[i][0]).trim().toUpperCase() === String(idVisita).trim().toUpperCase()) {
      const tokenGravado = String(dados[i][17] || '').trim();
      const emailResp = String(dados[i][4] || '').trim().toLowerCase();

      const isInternal = usuarioEmail && (usuarioEmail.endsWith('@brisanet.com.br') || usuarioEmail.endsWith('@grupobrisanet.com.br'));
      const bateToken = token && tokenGravado && (token === tokenGravado);
      const bateEmail = emailVerificar && emailResp && (emailVerificar === emailResp);

      if (isAdmin || isInternal || bateToken || bateEmail) {
        return montarObjetoVisita(dados[i]);
      } else {
        throw new Error('Acesso não autorizado. Por favor, acesse pelo link oficial enviado ao seu e-mail ou utilize o e-mail cadastrado na solicitação.');
      }
    }
  }

  return null;
}

/**
 * Retorna o histórico de pareceres e eventos de uma solicitação de visita.
 * Acesso autorizado para Administradores ou visitantes portando o Token seguro.
 */
function obterHistoricoVisita(idVisita, token, emailConsulta) {
  const visita = obterVisitaPorIdOuToken(idVisita, token, emailConsulta);
  if (!visita) return [];

  let isAdmin = false;
  try {
    const config = obterConfiguracoesIniciais();
    isAdmin = config.usuario.isAdmin;
  } catch (e) {}

  const props = PropertiesService.getScriptProperties();
  const spreadsheetId = props.getProperty('SPREADSHEET_ID');
  const ss = SpreadsheetApp.openById(spreadsheetId);
  const abaLog = ss.getSheetByName('LOG_INTERACOES');
  if (!abaLog) return [];

  const dados = abaLog.getDataRange().getValues();
  const logs = [];
  const idProcurado = String(idVisita || '').trim().toUpperCase();

  const emailVisita = String(visita.responsavelEmail || '').toLowerCase().trim();
  const empresaVisita = String(visita.empresa || '').toLowerCase().trim();

  for (let i = 1; i < dados.length; i++) {
    const idItem = String(dados[i][1] != null ? dados[i][1] : '').trim().toUpperCase();
    if (idItem === idProcurado) {
      const visivelVal = String(dados[i][8] != null ? dados[i][8] : '').trim().toUpperCase();
      const visivel = visivelVal === 'SIM' || visivelVal === 'TRUE';

      // Sigilo corporativo: visitantes externos NUNCA visualizam logs de outras empresas
      if (!isAdmin) {
        const autorLog = String(dados[i][3] != null ? dados[i][3] : '').trim().toLowerCase();
        const msgLog = String(dados[i][7] != null ? dados[i][7] : '').toLowerCase();
        const isLogDaMesmaEmpresa = 
          autorLog.endsWith('@brisanet.com.br') || 
          autorLog.endsWith('@grupobrisanet.com.br') || 
          (emailVisita && autorLog === emailVisita) ||
          (empresaVisita && msgLog.includes(empresaVisita));
        
        if (!isLogDaMesmaEmpresa) continue;
      }

      if (isAdmin || visivel) {
        logs.push({
          idLog: String(dados[i][0] != null ? dados[i][0] : ''),
          dataHora: formatarData(dados[i][2]),
          autor: String(dados[i][3] != null ? dados[i][3] : ''),
          tipoAcao: String(dados[i][4] != null ? dados[i][4] : ''),
          statusAnterior: String(dados[i][5] != null ? dados[i][5] : ''),
          novoStatus: String(dados[i][6] != null ? dados[i][6] : ''),
          mensagem: String(dados[i][7] != null ? dados[i][7] : ''),
          visivelSolicitante: visivel
        });
      }
    }
  }

  return logs;
}


/**
 * Atribui um atendente responsável para a solicitação de visita corporativa.
 */
function atribuirVisita(idVisita, atendenteEmail) {
  let isAdmin = false;
  try {
    const config = obterConfiguracoesIniciais();
    isAdmin = config.usuario.isAdmin;
  } catch (e) {}

  const atendenteFinal = atendenteEmail ? atendenteEmail.trim().toLowerCase() : (Session.getActiveUser().getEmail() || '').trim().toLowerCase();

  if (!isAdmin && !atendenteFinal) {
    throw new Error('Apenas administradores podem atribuir responsáveis para a visita.');
  }

  const props = PropertiesService.getScriptProperties();
  const spreadsheetId = props.getProperty('SPREADSHEET_ID');
  const ss = SpreadsheetApp.openById(spreadsheetId);
  const abaVisitas = garantirAbaVisitas(ss);
  const abaLog = ss.getSheetByName('LOG_INTERACOES');

  const dados = abaVisitas.getDataRange().getValues();
  let linhaEncontrada = -1;
  let visitaObj = null;

  for (let i = 1; i < dados.length; i++) {
    if (String(dados[i][0]).trim().toUpperCase() === String(idVisita).trim().toUpperCase()) {
      linhaEncontrada = i + 1;
      visitaObj = montarObjetoVisita(dados[i]);
      break;
    }
  }

  if (linhaEncontrada === -1 || !visitaObj) {
    throw new Error('Visita não encontrada: ' + idVisita);
  }

  const statusAnterior = visitaObj.status;
  let novoStatus = statusAnterior;

  // Se estiver Pendente, avança para "Em Análise" automaticamente
  if (statusAnterior === 'Pendente') {
    novoStatus = 'Em Análise';
    abaVisitas.getRange(linhaEncontrada, 16).setValue(novoStatus); // Coluna 16: STATUS
  }

  abaVisitas.getRange(linhaEncontrada, 17).setValue(atendenteFinal); // Coluna 17: ATENDENTE

  // Gravar no log de interações
  if (abaLog) {
    const agora = new Date();
    const adminExecutor = Session.getActiveUser().getEmail() || atendenteFinal;
    abaLog.appendRow([
      Utilities.getUuid(),
      idVisita,
      agora,
      adminExecutor,
      'Atribuição de Responsável',
      statusAnterior,
      novoStatus,
      'Atendente responsável definido como: ' + atendenteFinal,
      'NÃO' // Log interno para a equipe administrativa
    ]);
  }

  return {
    sucesso: true,
    novoStatus: novoStatus,
    atendente: atendenteFinal,
    mensagem: 'Visita atribuída a ' + atendenteFinal + ' com sucesso.'
  };
}

/**
 * Atualiza o status da visita (Aprovação, Ajuste ou Reprovação) com disparo de e-mail e gestão de acompanhantes.
 */
function atualizarStatusVisita(idVisita, novoStatus, motivoParecer, atendenteEmail, emailsAcompanhantes, novosArquivosBase64) {
  let isAdmin = false;
  try {
    const config = obterConfiguracoesIniciais();
    isAdmin = config.usuario.isAdmin;
  } catch (e) {}

  const props = PropertiesService.getScriptProperties();
  const spreadsheetId = props.getProperty('SPREADSHEET_ID');
  const ss = SpreadsheetApp.openById(spreadsheetId);
  const abaVisitas = garantirAbaVisitas(ss);
  const abaLog = ss.getSheetByName('LOG_INTERACOES');

  const dados = abaVisitas.getDataRange().getValues();
  let linhaEncontrada = -1;
  let visitaObj = null;

  for (let i = 1; i < dados.length; i++) {
    if (String(dados[i][0]).trim().toUpperCase() === String(idVisita).trim().toUpperCase()) {
      linhaEncontrada = i + 1;
      visitaObj = montarObjetoVisita(dados[i]);
      break;
    }
  }

  if (linhaEncontrada === -1 || !visitaObj) {
    throw new Error('Visita não encontrada: ' + idVisita);
  }

  const agora = new Date();
  const emailAtendente = (atendenteEmail && atendenteEmail.indexOf('telefonia@') === -1)
    ? atendenteEmail
    : (Session.getActiveUser().getEmail() || (visitaObj.atendente && visitaObj.atendente.indexOf('telefonia@') === -1 ? visitaObj.atendente : obterEmailAdminPadrao()));

  // Atualizar lista de acompanhantes se fornecida pelo atendente
  let emailsAcompFinal = visitaObj.emailsAcompanhantes || '';
  if (emailsAcompanhantes !== undefined && emailsAcompanhantes !== null) {
    emailsAcompFinal = sanitizarEmailsAcompanhantes(emailsAcompanhantes);
    abaVisitas.getRange(linhaEncontrada, 21).setValue(emailsAcompFinal);
  }

  // Salvar novos anexos se fornecidos pelo atendente na deliberação
  let novosAnexosSalvos = [];
  if (novosArquivosBase64 && Array.isArray(novosArquivosBase64) && novosArquivosBase64.length > 0) {
    novosAnexosSalvos = salvarAnexosNoDrive(idVisita, novosArquivosBase64);
    if (novosAnexosSalvos.length > 0) {
      const anexosAtualizados = (visitaObj.anexos || []).concat(novosAnexosSalvos);
      abaVisitas.getRange(linhaEncontrada, 15).setValue(JSON.stringify(sanitizarAnexosParaPlanilha(anexosAtualizados)));
      visitaObj.anexos = anexosAtualizados;
    }
  }

  // Coluna 16: STATUS, 17: ATENDENTE, 19: DATA_DECISAO, 20: MOTIVO_DECISAO
  abaVisitas.getRange(linhaEncontrada, 16).setValue(novoStatus);
  abaVisitas.getRange(linhaEncontrada, 17).setValue(emailAtendente);
  abaVisitas.getRange(linhaEncontrada, 19).setValue(agora);
  abaVisitas.getRange(linhaEncontrada, 20).setValue(motivoParecer || '');

  // Log de Auditoria
  if (abaLog) {
    let msgAuditoria = motivoParecer || ('Status alterado para ' + novoStatus);
    if (novosAnexosSalvos.length > 0) {
      msgAuditoria += '\n\nAnexos adicionados pelo atendente: ' + novosAnexosSalvos.map(function(a) { return a.nome; }).join(', ');
    }
    abaLog.appendRow([
      Utilities.getUuid(),
      idVisita,
      agora,
      emailAtendente,
      'Decisão de Visita (' + novoStatus + ')',
      visitaObj.status,
      novoStatus,
      msgAuditoria,
      'SIM'
    ]);
  }

  // Notificar visitante por e-mail com visual institucional
  const urlWeb = obterUrlPortalVisitas();
  const linkAcompanhamento = urlWeb ? (urlWeb + (urlWeb.includes('?') ? '&' : '?') + 'portal=visita&aba=meus&visita=' + idVisita + '&token=' + visitaObj.tokenAcesso + '&email=' + encodeURIComponent(visitaObj.responsavelEmail)) : '';

  try {
    let mensagemStatus = '';
    const parecerTxt = String(motivoParecer || '').trim();
    if (novoStatus === 'Aprovada') {
      mensagemStatus = 'Sua solicitação de visita à Brisanet foi APROVADA. Os participantes cadastrados estão autorizados a acessar as instalações e salas indicadas no itinerário oficial.' + (parecerTxt ? '\n\nOrientações / Observações do Atendente:\n' + parecerTxt : '');
    } else if (novoStatus === 'Ajuste Solicitado') {
      mensagemStatus = 'A equipe administrativa da Brisanet solicitou um ajuste de agenda, sala ou horário em sua visita:\n\n"' + (parecerTxt || 'Favor revisar o itinerário ou cronograma proposto.') + '"\n\nPor favor, acesse o link para responder com os novos horários ou esclarecimentos.';
    } else if (novoStatus === 'Reprovada') {
      mensagemStatus = 'Sua solicitação de visita à Brisanet não pôde ser aprovada no momento.\n\nMotivo / Justificativa:\n' + (parecerTxt || 'Incompatibilidade de agenda ou indisponibilidade de salas.');
    } else {
      mensagemStatus = 'O status da sua solicitação de visita foi atualizado para: ' + novoStatus + '.\n\nParecer do Atendente:\n' + (parecerTxt || 'Sem observações adicionais.');
    }

    enviarEmailNotificacaoVisita({
      destinatario: visitaObj.responsavelEmail,
      cc: emailsAcompFinal,
      assunto: '[brisanet] Visita ' + idVisita + ' - ' + visitaObj.empresa,
      idVisita: idVisita,
      empresa: visitaObj.empresa,
      periodo: visitaObj.periodoInicio + ' a ' + visitaObj.periodoFim,
      status: novoStatus,
      mensagem: mensagemStatus,
      linkAcompanhamento: linkAcompanhamento,
      autorEmail: emailAtendente,
      anexos: (novosAnexosSalvos.length > 0 ? novosAnexosSalvos : (visitaObj.anexos || []))
    });
  } catch (eMail) {
    Logger.log('Aviso ao notificar visitante sobre status: ' + eMail.message);
  }

  return {
    sucesso: true,
    mensagem: 'Status da visita atualizado para ' + novoStatus + '.',
    emailsAcompanhantes: emailsAcompFinal
  };
}

/**
 * Permite ao visitante externo enviar respostas e novos anexos via link seguro.
 */
function adicionarRespostaVisitante(idVisita, token, respostaTexto, arquivosBase64) {
  const props = PropertiesService.getScriptProperties();
  const spreadsheetId = props.getProperty('SPREADSHEET_ID');
  const ss = SpreadsheetApp.openById(spreadsheetId);
  const abaVisitas = garantirAbaVisitas(ss);
  const abaLog = ss.getSheetByName('LOG_INTERACOES');

  const dados = abaVisitas.getDataRange().getValues();
  let linhaEncontrada = -1;
  let visitaObj = null;

  for (let i = 1; i < dados.length; i++) {
    if (String(dados[i][0]).trim().toUpperCase() === String(idVisita).trim().toUpperCase()) {
      linhaEncontrada = i + 1;
      visitaObj = montarObjetoVisita(dados[i]);
      break;
    }
  }

  if (linhaEncontrada === -1 || !visitaObj) {
    throw new Error('Visita não encontrada.');
  }

  if (visitaObj.tokenAcesso !== token) {
    throw new Error('Token de acesso inválido.');
  }

  const agora = new Date();
  const novosAnexos = salvarAnexosNoDrive(idVisita, arquivosBase64);

  // Atualizar lista de anexos
  let anexosExistentes = visitaObj.anexos || [];
  if (novosAnexos.length > 0) {
    anexosExistentes = anexosExistentes.concat(novosAnexos);
    abaVisitas.getRange(linhaEncontrada, 15).setValue(JSON.stringify(sanitizarAnexosParaPlanilha(anexosExistentes)));
  }

  // Se o status estava 'Ajuste Solicitado', volta para 'Em Análise'
  if (visitaObj.status === 'Ajuste Solicitado') {
    abaVisitas.getRange(linhaEncontrada, 16).setValue('Em Análise');
  }

  // Gravar no log de interações
  let textoLog = respostaTexto ? respostaTexto.trim() : '';
  if (novosAnexos.length > 0) {
    const nomes = novosAnexos.map(function(a) { return a.nome; }).join(', ');
    textoLog += (textoLog ? '\n\n' : '') + 'Anexos adicionados pelo visitante: ' + nomes;
  }

  if (abaLog) {
    abaLog.appendRow([
      Utilities.getUuid(),
      idVisita,
      agora,
      visitaObj.responsavelEmail,
      'Resposta do Visitante',
      visitaObj.status,
      (visitaObj.status === 'Ajuste Solicitado' ? 'Em Análise' : visitaObj.status),
      textoLog,
      'SIM'
    ]);
  }

  // Notificar atendente/admins e acompanhantes em cópia
  try {
    const urlWeb = obterUrlWebApp();
    const linkAdmin = urlWeb ? (urlWeb + (urlWeb.includes('?') ? '&' : '?') + 'visita=' + idVisita + '&aba=visitas') : '';
    const destinatarioAdmin = (visitaObj.atendente && visitaObj.atendente.indexOf('telefonia@') === -1)
      ? visitaObj.atendente
      : obterEmailAdminPadrao();

    enviarEmailNotificacaoVisita({
      destinatario: destinatarioAdmin,
      cc: visitaObj.emailsAcompanhantes,
      assunto: '[brisanet] Visita ' + idVisita + ' - ' + visitaObj.empresa,
      idVisita: idVisita,
      empresa: visitaObj.empresa,
      periodo: visitaObj.periodoInicio + ' a ' + visitaObj.periodoFim,
      status: 'Em Análise',
      mensagem: 'O visitante ' + visitaObj.responsavelNome + ' respondeu ao chamado da visita:\n\n"' + (respostaTexto || 'Novos documentos anexados.') + '"',
      linkAcompanhamento: linkAdmin,
      autorEmail: visitaObj.responsavelEmail,
      anexos: novosAnexos
    });
  } catch (eNotif) {
    Logger.log('Aviso ao notificar admin de resposta de visitante: ' + eNotif.message);
  }

  return { sucesso: true, mensagem: 'Resposta enviada com sucesso!' };
}

/**
 * Salva as alterações de uma proposta de visita corporativa.
 * Permissões e regras:
 * - Administradores podem editar a qualquer momento.
 * - Solicitantes externos podem editar APENAS se o status for "Ajuste Solicitado" e com token válido.
 * - Todas as alterações são auditadas e registradas na aba LOG_INTERACOES.
 * - Quando o solicitante salva os ajustes, o status retorna para "Em Análise" e notifica o atendente/admin.
 */
function salvarEdicaoVisita(dadosVisita, tokenAcesso) {
  try {
    const idVisita = String(dadosVisita.idVisita || '').trim();
    if (!idVisita) {
      return { sucesso: false, erro: 'Protocolo da visita não informado.' };
    }

    const props = PropertiesService.getScriptProperties();
    const spreadsheetId = props.getProperty('SPREADSHEET_ID');
    const ss = SpreadsheetApp.openById(spreadsheetId);
    const abaVisitas = garantirAbaVisitas(ss);
    const abaLog = ss.getSheetByName('LOG_INTERACOES');

    let isAdmin = false;
    let usuarioEmail = '';
    try {
      const config = obterConfiguracoesIniciais();
      isAdmin = config.usuario.isAdmin;
      usuarioEmail = (config.usuario.email || '').trim().toLowerCase();
    } catch (e) {}

    const dados = abaVisitas.getDataRange().getValues();
    let linhaEncontrada = -1;
    let visitaAntiga = null;

    for (let i = 1; i < dados.length; i++) {
      if (String(dados[i][0]).trim().toUpperCase() === idVisita.toUpperCase()) {
        linhaEncontrada = i + 1;
        visitaAntiga = montarObjetoVisita(dados[i]);
        break;
      }
    }

    if (linhaEncontrada === -1 || !visitaAntiga) {
      return { sucesso: false, erro: 'Visita ' + idVisita + ' não encontrada.' };
    }

    const tokenEsperado = String(visitaAntiga.tokenAcesso || '').trim();
    const tokenFornecido = String(tokenAcesso || '').trim();
    const isTokenValido = tokenFornecido && (tokenFornecido === tokenEsperado);

    // Validação de Permissão:
    // 1. Administrador: permitido a qualquer momento
    // 2. Solicitante externo: permitido APENAS se status === 'Ajuste Solicitado' e com token/email válido
    if (!isAdmin) {
      const emailResp = (visitaAntiga.responsavelEmail || '').toLowerCase().trim();
      const bateEmail = usuarioEmail && (usuarioEmail === emailResp);

      if (!isTokenValido && !bateEmail) {
        return { sucesso: false, erro: 'Acesso não autorizado para editar esta visita.' };
      }

      if (visitaAntiga.status !== 'Ajuste Solicitado') {
        return {
          sucesso: false,
          erro: 'A proposta de visita só pode ser editada quando o status for "Ajuste Solicitado". O status atual é "' + visitaAntiga.status + '".'
        };
      }
    }

    // Identificar alterações realizadas (Diff para auditoria no LOG_INTERACOES)
    const mudancas = [];
    if (dadosVisita.empresa && dadosVisita.empresa !== visitaAntiga.empresa) {
      mudancas.push('Empresa alterada de "' + visitaAntiga.empresa + '" para "' + dadosVisita.empresa + '"');
    }
    if (dadosVisita.responsavelNome && dadosVisita.responsavelNome !== visitaAntiga.responsavelNome) {
      mudancas.push('Responsável alterado de "' + visitaAntiga.responsavelNome + '" para "' + dadosVisita.responsavelNome + '"');
    }
    if (dadosVisita.responsavelTelefone && dadosVisita.responsavelTelefone !== visitaAntiga.responsavelTelefone) {
      mudancas.push('Telefone alterado de "' + visitaAntiga.responsavelTelefone + '" para "' + dadosVisita.responsavelTelefone + '"');
    }
    if (dadosVisita.periodoInicio && dadosVisita.periodoInicio !== visitaAntiga.periodoInicio) {
      mudancas.push('Período Início alterado de "' + visitaAntiga.periodoInicio + '" para "' + dadosVisita.periodoInicio + '"');
    }
    if (dadosVisita.periodoFim && dadosVisita.periodoFim !== visitaAntiga.periodoFim) {
      mudancas.push('Período Término alterado de "' + visitaAntiga.periodoFim + '" para "' + dadosVisita.periodoFim + '"');
    }

    const qtdPartAntiga = (visitaAntiga.participantes || []).length;
    const qtdPartNova = (dadosVisita.participantes || []).length;
    if (qtdPartAntiga !== qtdPartNova || JSON.stringify(dadosVisita.participantes) !== JSON.stringify(visitaAntiga.participantes)) {
      mudancas.push('Comitiva de Visitantes atualizada (' + qtdPartNova + ' participante(s))');
    }

    const qtdAnfAntiga = (visitaAntiga.anfitrioes || []).length;
    const qtdAnfNova = (dadosVisita.anfitrioes || []).length;
    if (qtdAnfAntiga !== qtdAnfNova || JSON.stringify(dadosVisita.anfitrioes) !== JSON.stringify(visitaAntiga.anfitrioes)) {
      mudancas.push('Anfitriões Brisanet atualizados (' + qtdAnfNova + ' anfitrião(ões))');
    }

    if (JSON.stringify(dadosVisita.cronograma) !== JSON.stringify(visitaAntiga.cronograma)) {
      mudancas.push('Cronograma de atividades atualizado');
    }

    if (JSON.stringify(dadosVisita.itinerario) !== JSON.stringify(visitaAntiga.itinerario)) {
      mudancas.push('Itinerário físico e salas reservadas atualizados');
    }

    if (JSON.stringify(dadosVisita.tour) !== JSON.stringify(visitaAntiga.tour)) {
      mudancas.push('Setores do tour técnico atualizados');
    }

    if (dadosVisita.observacoes !== undefined && dadosVisita.observacoes !== visitaAntiga.observacoes) {
      mudancas.push('Observações gerais atualizadas');
    }

    const textoMudancas = mudancas.length > 0 ? ('Alterações realizadas no formulário:\n• ' + mudancas.join('\n• ')) : 'Edição salva sem alterações nos campos estruturais.';

    // Atualizar colunas na aba VISITAS:
    // Col 3: EMPRESA_VISITANTE
    if (dadosVisita.empresa) abaVisitas.getRange(linhaEncontrada, 3).setValue(dadosVisita.empresa);
    // Col 4: RESPONSAVEL_NOME
    if (dadosVisita.responsavelNome) abaVisitas.getRange(linhaEncontrada, 4).setValue(dadosVisita.responsavelNome);
    // Col 5: RESPONSAVEL_EMAIL
    if (dadosVisita.responsavelEmail) abaVisitas.getRange(linhaEncontrada, 5).setValue(dadosVisita.responsavelEmail);
    // Col 6: RESPONSAVEL_TELEFONE
    if (dadosVisita.responsavelTelefone) abaVisitas.getRange(linhaEncontrada, 6).setValue(dadosVisita.responsavelTelefone);
    // Col 7: PERIODO_INICIO
    if (dadosVisita.periodoInicio) abaVisitas.getRange(linhaEncontrada, 7).setValue(dadosVisita.periodoInicio);
    // Col 8: PERIODO_FIM
    if (dadosVisita.periodoFim) abaVisitas.getRange(linhaEncontrada, 8).setValue(dadosVisita.periodoFim);
    // Col 9: DADOS_PARTICIPANTES
    if (dadosVisita.participantes) abaVisitas.getRange(linhaEncontrada, 9).setValue(JSON.stringify(dadosVisita.participantes));
    // Col 10: DADOS_ANFITRIOES
    if (dadosVisita.anfitrioes) abaVisitas.getRange(linhaEncontrada, 10).setValue(JSON.stringify(dadosVisita.anfitrioes));
    // Col 11: DADOS_CRONOGRAMA
    if (dadosVisita.cronograma) abaVisitas.getRange(linhaEncontrada, 11).setValue(JSON.stringify(dadosVisita.cronograma));
    // Col 12: DADOS_ITINERARIO
    if (dadosVisita.itinerario) abaVisitas.getRange(linhaEncontrada, 12).setValue(JSON.stringify(dadosVisita.itinerario));
    // Col 13: DADOS_TOUR
    if (dadosVisita.tour) abaVisitas.getRange(linhaEncontrada, 13).setValue(JSON.stringify(dadosVisita.tour));
    // Col 14: OBSERVACOES
    if (dadosVisita.observacoes !== undefined) abaVisitas.getRange(linhaEncontrada, 14).setValue(dadosVisita.observacoes);

    let statusFinal = visitaAntiga.status;
    const agora = new Date();

    // Se o solicitante editou em "Ajuste Solicitado", retorna para "Em Análise"
    if (!isAdmin && visitaAntiga.status === 'Ajuste Solicitado') {
      statusFinal = 'Em Análise';
      abaVisitas.getRange(linhaEncontrada, 16).setValue(statusFinal);
    }

    const autorAcao = usuarioEmail || (isAdmin ? 'Administrador Brisanet' : visitaAntiga.responsavelEmail);
    const tipoAcao = isAdmin ? 'Edição de Visita (Administrador)' : 'Ajuste de Proposta (Solicitante)';

    // Gravar no LOG_INTERACOES (Auditoria obrigatória de alterações)
    if (abaLog) {
      abaLog.appendRow([
        Utilities.getUuid(),
        idVisita,
        agora,
        autorAcao,
        tipoAcao,
        visitaAntiga.status,
        statusFinal,
        textoMudancas,
        'SIM'
      ]);
    }

    // Se o solicitante ajustou a proposta, notificar o atendente e a equipe administrativa
    if (!isAdmin && visitaAntiga.status === 'Ajuste Solicitado') {
      try {
        const urlWeb = obterUrlWebApp();
        const linkAdmin = urlWeb ? (urlWeb + (urlWeb.includes('?') ? '&' : '?') + 'visita=' + idVisita + '&aba=visitas') : '';
        const destinatarioAdmin = (visitaAntiga.atendente && visitaAntiga.atendente.indexOf('telefonia@') === -1)
          ? visitaAntiga.atendente
          : obterEmailAdminPadrao();

        enviarEmailNotificacaoVisita({
          destinatario: destinatarioAdmin,
          cc: visitaAntiga.emailsAcompanhantes,
          assunto: '[brisanet] Visita ' + idVisita + ' - ' + (dadosVisita.empresa || visitaAntiga.empresa),
          idVisita: idVisita,
          empresa: dadosVisita.empresa || visitaAntiga.empresa,
          periodo: (dadosVisita.periodoInicio || visitaAntiga.periodoInicio) + ' a ' + (dadosVisita.periodoFim || visitaAntiga.periodoFim),
          status: 'Em Análise',
          mensagem: 'O solicitante ' + (dadosVisita.responsavelNome || visitaAntiga.responsavelNome) + ' realizou os ajustes solicitados na proposta de visita:\n\n' + textoMudancas + '\n\nAcesse a aba Gestão de Visitas para deliberar sobre a nova proposta.',
          linkAcompanhamento: linkAdmin,
          autorEmail: visitaAntiga.responsavelEmail,
          anexos: []
        });
      } catch (eMail) {
        Logger.log('Erro ao notificar admin sobre ajuste de visita: ' + eMail.message);
      }
    }

    return {
      sucesso: true,
      idVisita: idVisita,
      novoStatus: statusFinal,
      mudancas: mudancas,
      mensagem: 'Proposta de visita atualizada com sucesso!'
    };
  } catch (err) {
    Logger.log('Erro em salvarEdicaoVisita: ' + err.message);
    return { sucesso: false, erro: err.message };
  }
}

/**
 * Template corporativo oficial de e-mail para Gestão de Visitas Externas (brisanet).
 * Mantém todos os e-mails na mesma conversa (thread) com timeline cronológica completa.
 */
function enviarEmailNotificacaoVisita(params) {
  const idVisita = params.idVisita;
  const empresaTitulo = String(params.empresa || '').trim() || 'Visita Corporativa';
  const emailAutor = (params.autorEmail && params.autorEmail.indexOf('telefonia@') === -1)
    ? params.autorEmail
    : ((params.atendenteEmail && params.atendenteEmail.indexOf('telefonia@') === -1)
      ? params.atendenteEmail
      : (Session.getActiveUser().getEmail() || obterEmailAdminPadrao()));
  const nomeAutor = emailAutor.includes('@') ? emailAutor.split('@')[0].replace('.', ' ') : 'Gestão de Visitas';
  const nomeFormatado = nomeAutor.charAt(0).toUpperCase() + nomeAutor.slice(1);

  const statusCor = {
    'Aprovada': '#059669',
    'Pendente': '#0B316D',
    'Em Análise': '#D97706',
    'Ajuste Solicitado': '#EA580C',
    'Reprovada': '#DC2626'
  }[params.status] || '#0B316D';

  const link = params.linkAcompanhamento || '';

  // 1. Coletar Blobs dos anexos para envio como anexos físicos nativos no e-mail (até 20MB)
  const blobsAnexos = [];
  let tamanhoTotalBytes = 0;
  const LIMITE_ANEXOS_BYTES = 20 * 1024 * 1024;

  if (params.anexos && Array.isArray(params.anexos)) {
    for (let i = 0; i < params.anexos.length; i++) {
      const anexo = params.anexos[i];
      try {
        const blob = obterBlobDoAnexo(anexo);
        if (blob) {
          const tamanho = blob.getBytes().length;
          if (tamanhoTotalBytes + tamanho <= LIMITE_ANEXOS_BYTES) {
            blobsAnexos.push(blob);
            tamanhoTotalBytes += tamanho;
          } else {
            Logger.log('Anexo de visita ' + (anexo.nome || '') + ' ultrapassou o limite total de 20MB.');
          }
        }
      } catch (errBlob) {
        Logger.log('Erro ao processar blob do anexo de visita para e-mail: ' + errBlob.message);
      }
    }
  }

  // 2. Montar bloco HTML destacado para os anexos no corpo do e-mail com BOTÕES DE DOWNLOAD DIRETO
  let htmlAnexos = '';
  if (params.anexos && params.anexos.length > 0) {
    const cardsAnexos = params.anexos.map(function(a) {
      const fileId = a.id || extrairIdDrive(a.url);
      const downloadUrl = a.downloadUrl || (fileId ? 'https://drive.google.com/uc?export=download&id=' + fileId : a.url);
      const viewUrl = a.url || (fileId ? 'https://drive.google.com/file/d/' + fileId + '/view' : '#');

      return [
        '<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 10px; background-color: #FFFFFF; border: 1px solid #CBD5E1; border-radius: 8px;">',
        '  <tr>',
        '    <td style="padding: 12px 14px; vertical-align: middle;">',
        '      <div style="font-size: 13px; font-weight: 700; color: #0F172A; margin-bottom: 2px;">',
        '        <span style="color: #FF5022; font-size: 14px; font-weight: bold; margin-right: 6px;">&bull;</span>' + a.nome,
        '      </div>',
        '      <div style="font-size: 11px; color: #64748B; padding-left: 14px;">',
        '        Documento / Pauta anexada à visita corporativa',
        '      </div>',
        '    </td>',
        '    <td style="padding: 12px 14px; text-align: right; vertical-align: middle; white-space: nowrap;">',
        '      <a href="' + downloadUrl + '" target="_blank" style="display: inline-block; padding: 7px 14px; background-color: #FF5022; color: #FFFFFF; font-size: 11px; font-weight: 700; text-decoration: none; border-radius: 6px; margin-right: 6px;">Baixar Arquivo</a>',
        '      <a href="' + viewUrl + '" target="_blank" style="display: inline-block; padding: 7px 12px; background-color: #EFF6FF; border: 1px solid #BFDBFE; color: #2242D4; font-size: 11px; font-weight: 700; text-decoration: none; border-radius: 6px;">Ver no Drive</a>',
        '    </td>',
        '  </tr>',
        '</table>'
      ].join('\n');
    }).join('\n');

    htmlAnexos = [
      '<div style="background-color: #F8FAFC; border: 1px solid #CBD5E1; border-radius: 12px; padding: 18px 20px; margin-bottom: 22px;">',
      '  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 10px; border-bottom: 1px solid #E2E8F0; padding-bottom: 8px;">',
      '    <tr>',
      '      <td style="font-size: 12px; font-weight: 700; color: #0B316D; text-transform: uppercase; letter-spacing: 0.5px;">',
      '        Documentos e Pautas Anexadas',
      '      </td>',
      '      <td style="text-align: right;">',
      '        <span style="background-color: #E2E8F0; color: #334155; font-size: 10px; font-weight: 700; padding: 3px 8px; border-radius: 6px;">' + params.anexos.length + ' arquivo(s)</span>',
      '      </td>',
      '    </tr>',
      '  </table>',
      '  <div style="font-size: 12px; color: #475569; margin-bottom: 12px; line-height: 1.5;">',
      '    Clique em <strong>Baixar Arquivo</strong> para salvar o documento diretamente em seu dispositivo, ou visualize online. Os arquivos também foram anexados a este e-mail para download.',
      '  </div>',
      cardsAnexos,
      '</div>'
    ].join('\n');
  }

  // 3. Obter histórico cronológico de interações da visita para a timeline
  let historicoLogs = [];
  try {
    historicoLogs = obterHistoricoLogsParaEmail(idVisita);
  } catch (eH) {
    Logger.log('Aviso ao carregar histórico de visita para e-mail: ' + eH.message);
  }

  // Garante que a mensagem atual esteja representada na timeline
  const msgAtualLimpa = String(params.mensagem || '').trim();
  if (msgAtualLimpa) {
    const jaContemMsg = historicoLogs.some(function(item) {
      return item.mensagem && (item.mensagem.indexOf(msgAtualLimpa) !== -1 || msgAtualLimpa.indexOf(item.mensagem) !== -1);
    });
    if (!jaContemMsg) {
      historicoLogs.push({
        dataHora: formatarData(new Date()),
        dataRaw: Date.now(),
        autor: emailAutor,
        tipoAcao: 'Mensagem / Deliberação',
        statusAnterior: '',
        novoStatus: params.status || '',
        mensagem: msgAtualLimpa
      });
    }
  }

  const htmlTimeline = montarHtmlTimelineEmail(historicoLogs, params.destinatario);
  const textoPlanoTimeline = montarTextoPlanoTimeline(historicoLogs);

  const listaCc = sanitizarEmailsAcompanhantes(params.cc);

  const htmlCorpo = [
    '<!DOCTYPE html>',
    '<html>',
    '<head>',
    '  <meta charset="UTF-8">',
    '  <style>',
    '    @import url("https://fonts.googleapis.com/css2?family=Figtree:wght@400;600;700&family=Rubik:wght@500;700&display=swap");',
    '    body { font-family: "Figtree", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background-color: #F8FAFC; margin: 0; padding: 20px; }',
    '  </style>',
    '</head>',
    '<body style="background-color: #F8FAFC; font-family: \'Figtree\', Arial, sans-serif; margin: 0; padding: 24px;">',
    '  <div style="max-width: 600px; margin: 0 auto; background-color: #FFFFFF; border: 1px solid #E8E8E8; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">',
    '    <div style="height: 5px; background: linear-gradient(90deg, #FF5022, #E47D20);"></div>',
    '    ',
    '    <div style="background-color: #0B316D; padding: 24px; color: #FFFFFF;">',
    '      <div style="font-size: 19px; font-weight: 700; margin: 0;">',
    '        <span>brisanet</span> <span style="color: #94A3B8; font-weight: 300;">|</span> <span>Gestão de Visitas Corporativas</span>',
    '      </div>',
    '      <div style="font-size: 11px; font-weight: 600; color: #E2E8F0; text-transform: uppercase; letter-spacing: 1px; margin-top: 4px;">',
    '        GERÊNCIA EXECUTIVA DE TELEFONIA &bull; BRISANET',
    '      </div>',
    '    </div>',
    '    ',
    '    <div style="padding: 28px 24px; color: #1E293B;">',
    '      <div style="display: flex; gap: 8px; margin-bottom: 18px;">',
    (link ? [
      '        <a href="' + link + '" target="_blank" style="display: inline-block; padding: 6px 14px; background-color: #EFF6FF; border: 1px solid #BFDBFE; border-radius: 8px; font-family: \'Rubik\', sans-serif; font-size: 13px; font-weight: 700; color: #0B316D; text-decoration: none;" title="Abrir visita no portal">',
      '          Protocolo: ' + idVisita + ' <span style="color: #2242D4; font-size: 12px; margin-left: 4px;">&#8599;</span>',
      '        </a>'
    ].join('\n') : [
      '        <span style="display: inline-block; padding: 5px 12px; background-color: #EFF6FF; border: 1px solid #BFDBFE; border-radius: 8px; font-family: \'Rubik\', sans-serif; font-size: 13px; font-weight: 700; color: #0B316D;">Protocolo: ' + idVisita + '</span>'
    ].join('\n')),
    '        <span style="display: inline-block; padding: 5px 12px; background-color: #F1F5F9; border: 1px solid #CBD5E1; border-radius: 8px; font-size: 12px; font-weight: 700; color: ' + statusCor + ';">Status: ' + params.status + '</span>',
    '      </div>',
    '      ',
    '      <h2 style="margin: 0 0 14px 0; font-size: 16px; font-weight: 700; color: #0F172A; line-height: 1.4;">',
    '        Solicitação de Visita &bull; ' + empresaTitulo,
    '      </h2>',
    '      ',
    '      <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 14px 16px; margin-bottom: 18px; font-size: 12px; color: #475569; line-height: 1.6;">',
    '        <div><strong>Empresa Visitante:</strong> ' + empresaTitulo + '</div>',
    '        <div><strong>Período Previsto:</strong> ' + (params.periodo || 'A definir') + '</div>',
    '      </div>',
    '      ',
    '      <!-- Parecer Técnico / Mensagem Mais Recente -->',
    '      <div style="background-color: #F8FAFC; border-left: 4px solid #FF5022; border-top: 1px solid #E8E8E8; border-right: 1px solid #E8E8E8; border-bottom: 1px solid #E8E8E8; border-radius: 0 10px 10px 0; padding: 16px; margin-bottom: 22px;">',
    '        <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #FF5022; margin-bottom: 6px;">',
    '          Última Mensagem / Parecer:',
    '        </div>',
    '        <div style="font-size: 14px; line-height: 1.6; color: #334155; white-space: pre-wrap;">' + formatarTextoComLinksHtml(params.mensagem) + '</div>',
    '      </div>',
    '      ',
    htmlAnexos,
    '      ',
    '      <!-- Responsável pela Atualização -->',
    '      <div style="font-size: 12px; color: #64748B; margin-bottom: 8px;">',
    '        Responsável pela atualização: <strong style="color: #0F172A;">' + emailAutor + '</strong>',
    '      </div>',
    (listaCc ? [
      '      <!-- Acompanhantes em Cópia (CC) -->',
      '      <div style="font-size: 11px; color: #64748B; margin-bottom: 20px; background-color: #F1F5F9; border-radius: 6px; padding: 6px 10px; display: inline-block;">',
      '        Acompanhantes notificados: <strong style="color: #0B316D;">' + listaCc + '</strong>',
      '      </div>'
    ].join('\n') : ''),
    '      ',
    htmlTimeline,
    '      ',
    (link ? [
      '      <!-- Botão Direto para o Portal da Visita -->',
      '      <div style="margin: 22px 0 24px 0; text-align: center;">',
      '        <a href="' + link + '" target="_blank" style="display: inline-block; width: 100%; max-width: 380px; padding: 13px 22px; background-color: #0B316D; color: #FFFFFF; font-size: 13px; font-weight: 700; text-decoration: none; border-radius: 10px; box-shadow: 0 4px 6px -1px rgba(11, 49, 109, 0.2); text-align: center; box-sizing: border-box; letter-spacing: 0.3px;">',
      '          Acompanhar Solicitação de Visita &rarr;',
      '        </a>',
      '        <div style="font-size: 11px; color: #94A3B8; margin-top: 6px;">',
      '          Acesse para consultar itinerário, pareceres ou enviar esclarecimentos',
      '        </div>',
      '      </div>'
    ].join('\n') : ''),
    '      ',
    '      <!-- AVISO DE NÃO RESPONDER POR E-MAIL -->',
    '      <div style="background-color: #FFFBEB; border: 1px solid #FDE68A; border-radius: 10px; padding: 14px 16px; margin-bottom: 15px;">',
    '        <div style="font-size: 11px; font-weight: 700; color: #92400E; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">',
    '          COMUNICADO: NÃO RESPONDA A ESTE E-MAIL',
    '        </div>',
    '        <div style="font-size: 12px; color: #78350F; line-height: 1.5;">',
    '          Respostas enviadas diretamente por e-mail <strong>não são processadas</strong>. ' + (link ? 'Para responder ao atendente, enviar esclarecimentos ou anexar novos documentos, <a href="' + link + '" target="_blank" style="color: #0B316D; font-weight: 700; text-decoration: underline;">clique aqui para acessar diretamente o portal de visita</a>.' : 'Acesse o portal da visita no Painel Web para interagir.'),
    '        </div>',
    '      </div>',
    '    </div>',
    '    ',
    '    <!-- Rodapé Corporativo -->',
    '    <div style="background-color: #F8FAFC; padding: 16px 24px; text-align: center; font-size: 11px; color: #94A3B8; border-top: 1px solid #E8E8E8;">',
    '      Gestão de Visitas Corporativas &bull; Gerência Executiva de Telefonia &bull; brisanet',
    '    </div>',
    '  </div>',
    '</body>',
    '</html>'
  ].join('\n');

  const textoPlano = [
    'Solicitação de Visita: ' + idVisita,
    'Empresa: ' + empresaTitulo,
    'Status: ' + params.status,
    '',
    'ÚLTIMA MENSAGEM / PARECER:',
    params.mensagem,
    '',
    (listaCc ? 'Acompanhantes em cópia (CC): ' + listaCc + '\n\n' : ''),
    (params.anexos && params.anexos.length > 0 ? 'Anexos para download:\n' + params.anexos.map(function(a) { 
      const id = a.id || extrairIdDrive(a.url);
      const dl = a.downloadUrl || (id ? 'https://drive.google.com/uc?export=download&id=' + id : a.url);
      return '- ' + a.nome + ': ' + dl;
    }).join('\n') + '\n\n' : ''),
    textoPlanoTimeline,
    '',
    (link ? 'Link direto para acompanhar e responder:\n' + link + '\n\n' : ''),
    'Responsável: ' + emailAutor,
    '',
    'COMUNICADO: NÃO RESPONDA A ESTE E-MAIL.',
    (link ? 'Para responder ou anexar arquivos, acesse o link:\n' + link : 'Acesse o Portal de Visitas no Painel Web.')
  ].join('\n');

  const assuntoUnificado = '[brisanet] Visita ' + idVisita + ' - ' + empresaTitulo;

  // 4. Validação rigorosa dos destinatários: impede o envio para robôs de erro ou e-mails inexistentes
  const destPrincipal = String(params.destinatario || '').trim().toLowerCase();
  if (!destPrincipal ||
      !destPrincipal.includes('@') ||
      destPrincipal.indexOf('mailer-daemon') !== -1 ||
      destPrincipal.indexOf('googlemail.com') !== -1 ||
      destPrincipal.indexOf('delivery') !== -1 ||
      destPrincipal.indexOf('subsystem') !== -1 ||
      destPrincipal.indexOf('postmaster') !== -1 ||
      destPrincipal.indexOf('daemon') !== -1 ||
      destPrincipal.indexOf('nao-responda') !== -1 ||
      destPrincipal.indexOf('telefonia@') !== -1) {
    Logger.log('Envio de e-mail de visita cancelado: destinatário inválido ou robô (' + destPrincipal + ')');
    return;
  }

  // Sanitiza a lista de acompanhantes em CC (excluindo o destinatário principal se estiver repetido)
  const ccList = [];
  if (listaCc) {
    listaCc.split(/[,;\s]+/).forEach(function(em) {
      const emLimpo = em.trim().toLowerCase();
      if (emLimpo && emLimpo.includes('@') && ccList.indexOf(emLimpo) === -1 && emLimpo !== destPrincipal) {
        if (emLimpo.indexOf('nao-responda') === -1 &&
            emLimpo.indexOf('mailer-daemon') === -1 &&
            emLimpo.indexOf('delivery') === -1 &&
            emLimpo.indexOf('subsystem') === -1 &&
            emLimpo.indexOf('googlemail.com') === -1 &&
            emLimpo.indexOf('postmaster') === -1 &&
            emLimpo.indexOf('daemon') === -1 &&
            emLimpo.indexOf('telefonia@') === -1) {
          ccList.push(emLimpo);
        }
      }
    });
  }
  const ccFinal = ccList.join(', ');

  const replyToFinal = (emailAutor && emailAutor.includes('@') && emailAutor.indexOf('telefonia@') === -1 && emailAutor.indexOf('mailer-daemon') === -1)
    ? emailAutor.trim().toLowerCase()
    : obterEmailAdminPadrao();

  const options = {
    htmlBody: htmlCorpo,
    name: nomeFormatado + ' | Gestão de Visitas brisanet',
    replyTo: replyToFinal
  };
  if (ccFinal) options.cc = ccFinal;
  if (blobsAnexos.length > 0) options.attachments = blobsAnexos;

  const mailAppOptions = {
    to: destPrincipal,
    subject: assuntoUnificado,
    body: textoPlano,
    htmlBody: htmlCorpo,
    name: nomeFormatado + ' | Gestão de Visitas brisanet',
    replyTo: replyToFinal
  };
  if (ccFinal) mailAppOptions.cc = ccFinal;
  if (blobsAnexos.length > 0) mailAppOptions.attachments = blobsAnexos;

  // 5. Envio limpo e agrupado na conversa do Gmail pelo assunto unificado
  let enviado = false;
  try {
    GmailApp.sendEmail(destPrincipal, assuntoUnificado, textoPlano, options);
    enviado = true;
  } catch (errGmail) {
    Logger.log('Aviso GmailApp Visita: ' + errGmail.message + ' - utilizando MailApp...');
    try {
      MailApp.sendEmail(mailAppOptions);
      enviado = true;
    } catch (errMail) {
      Logger.log('Erro MailApp Visita com anexos: ' + errMail.message + ' - tentando fallback sem anexo físico...');
      try {
        delete mailAppOptions.attachments;
        MailApp.sendEmail(mailAppOptions);
        enviado = true;
      } catch (errFinal) {
        Logger.log('Erro crítico ao enviar e-mail de visita: ' + errFinal.message);
      }
    }
  }
}
