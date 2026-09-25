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
  return HtmlService.createTemplateFromFile('Index')
    .evaluate()
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

  for (let i = 1; i < dadosConfig.length; i++) {
    if (dadosConfig[i][0]) gerencias.push(dadosConfig[i][0]);
    if (dadosConfig[i][1]) categorias.push(dadosConfig[i][1]);
    if (dadosConfig[i][2]) administradores.push(String(dadosConfig[i][2]).trim().toLowerCase());
  }

  const isAdmin = administradores.includes(usuarioEmail.trim().toLowerCase());

  return {
    usuario: {
      email: usuarioEmail,
      nome: usuarioNome,
      isAdmin: isAdmin
    },
    gerencias: gerencias,
    categorias: categorias
  };
}

/**
 * Cria um novo chamado com upload multi-formato no Google Drive.
 */
function criarChamado(dados, arquivosBase64) {
  try {
    const props = PropertiesService.getScriptProperties();
    const spreadsheetId = props.getProperty('SPREADSHEET_ID');
    const rootFolderId = props.getProperty('ROOT_FOLDER_ID');
    
    const ss = SpreadsheetApp.openById(spreadsheetId);
    const abaChamados = ss.getSheetByName('CHAMADOS');
    const abaLog = ss.getSheetByName('LOG_INTERACOES');
    
    const agora = new Date();
    const anoAtual = agora.getFullYear();
    const proximaLinha = abaChamados.getLastRow() + 1;
    const sequencial = ('0000' + (proximaLinha - 1)).slice(-4);
    const idChamado = 'BRISA-TEL-' + anoAtual + '-' + sequencial;

    // 1. Processar e salvar múltiplos anexos no Google Drive
    const urlsAnexos = [];
    if (arquivosBase64 && arquivosBase64.length > 0 && rootFolderId) {
      const pastaRaiz = DriveApp.getFolderById(rootFolderId);
      
      // Pasta do Ano
      let pastaAno = pastaRaiz.getFoldersByName(String(anoAtual));
      pastaAno = pastaAno.hasNext() ? pastaAno.next() : pastaRaiz.createFolder(String(anoAtual));
      
      // Pasta específica do Chamado
      const pastaChamado = pastaAno.createFolder(idChamado);
      
      arquivosBase64.forEach(function(arq) {
        try {
          const contentType = arq.tipo || 'application/octet-stream';
          const bytes = Utilities.base64Decode(arq.base64.split(',')[1] || arq.base64);
          const blob = Utilities.newBlob(bytes, contentType, arq.nome);
          const arquivoSalvo = pastaChamado.createFile(blob);
          arquivoSalvo.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
          urlsAnexos.push({
            nome: arq.nome,
            url: arquivoSalvo.getUrl()
          });
        } catch (errUpload) {
          Logger.log('Erro ao salvar anexo ' + arq.nome + ': ' + errUpload.message);
        }
      });
    }

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
      JSON.stringify(urlsAnexos),
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
      'Chamado registrado com sucesso pela gerência solicitante.',
      'SIM'
    ]);

    // 4. Notificação por E-mail corporativo sem emojis
    try {
      enviarEmailNotificacao({
        destinatario: emailSolicitante,
        assunto: '[brisanet] Chamado Criado com Sucesso: ' + idChamado,
        idChamado: idChamado,
        titulo: dados.titulo,
        mensagem: 'Sua solicitação foi recebida pela Gerência Executiva de Telefonia e está aguardando triagem técnica.',
        autor: nomeSolicitante
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
  }
}

/**
 * Retorna exclusivamente os chamados pertencentes ao usuário conectado.
 */
function obterMeusChamados() {
  const props = PropertiesService.getScriptProperties();
  const spreadsheetId = props.getProperty('SPREADSHEET_ID');
  const ss = SpreadsheetApp.openById(spreadsheetId);
  const abaChamados = ss.getSheetByName('CHAMADOS');
  const usuarioEmail = Session.getActiveUser().getEmail().trim().toLowerCase();

  const dados = abaChamados.getDataRange().getValues();
  const meusChamados = [];

  for (let i = 1; i < dados.length; i++) {
    const emailLinha = String(dados[i][2]).trim().toLowerCase();
    if (emailLinha === usuarioEmail) {
      meusChamados.push(montarObjetoChamado(dados[i]));
    }
  }

  // Ordenar do mais recente para o mais antigo
  return meusChamados.reverse();
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
 * Registra feedback, troca de status ou notas internas.
 */
function adicionarInteracao(idChamado, mensagemFeedback, novoStatus, visivelSolicitante) {
  const props = PropertiesService.getScriptProperties();
  const spreadsheetId = props.getProperty('SPREADSHEET_ID');
  const ss = SpreadsheetApp.openById(spreadsheetId);
  const abaChamados = ss.getSheetByName('CHAMADOS');
  const abaLog = ss.getSheetByName('LOG_INTERACOES');
  
  const usuarioEmail = Session.getActiveUser().getEmail();
  const agora = new Date();

  const dados = abaChamados.getDataRange().getValues();
  let linhaAlvo = -1;
  let statusAnterior = '';
  let emailSolicitante = '';
  let dataInicio = null;
  let tituloChamado = '';

  for (let i = 1; i < dados.length; i++) {
    if (dados[i][0] === idChamado) {
      linhaAlvo = i + 1;
      statusAnterior = dados[i][11];
      emailSolicitante = dados[i][2];
      dataInicio = dados[i][13];
      tituloChamado = dados[i][8];
      break;
    }
  }

  if (linhaAlvo === -1) return { sucesso: false, erro: 'Chamado não localizado.' };

  const statusFinal = novoStatus || statusAnterior;
  abaChamados.getRange(linhaAlvo, 12).setValue(statusFinal);

  // Se concluído, registrar término e calcular horas
  if (statusFinal === 'Concluído') {
    abaChamados.getRange(linhaAlvo, 15).setValue(agora);
    if (dataInicio && dataInicio instanceof Date) {
      const diffMs = agora.getTime() - dataInicio.getTime();
      const diffHoras = (diffMs / (1000 * 60 * 60)).toFixed(2);
      abaChamados.getRange(linhaAlvo, 16).setValue(diffHoras);
    }
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
    mensagemFeedback,
    visivelSolicitante ? 'SIM' : 'NÃO'
  ]);

  // Notificar por e-mail APENAS se for visível ao solicitante E houver mensagem de parecer/feedback preenchida
  // Mudanças de status sem texto não disparam e-mail (conforme regra de negócio)
  const temMensagem = mensagemFeedback && mensagemFeedback.trim().length > 0;
  if (visivelSolicitante && temMensagem) {
    try {
      enviarEmailNotificacao({
        destinatario: emailSolicitante,
        assunto: '[brisanet] Novo Parecer no Chamado: ' + idChamado,
        idChamado: idChamado,
        titulo: tituloChamado,
        mensagem: mensagemFeedback,
        autor: usuarioEmail
      });
    } catch (e) {
      Logger.log('Erro de e-mail: ' + e.message);
    }
  }

  return { sucesso: true, mensagem: 'Interação registrada com sucesso.' };
}

/**
 * Retorna o histórico de interações de um chamado específico.
 */
function obterHistoricoChamado(idChamado) {
  const props = PropertiesService.getScriptProperties();
  const spreadsheetId = props.getProperty('SPREADSHEET_ID');
  const ss = SpreadsheetApp.openById(spreadsheetId);
  const abaLog = ss.getSheetByName('LOG_INTERACOES');
  
  const usuarioEmail = Session.getActiveUser().getEmail().trim().toLowerCase();
  const config = obterConfiguracoesIniciais();
  const isAdmin = config.usuario.isAdmin;

  const dados = abaLog.getDataRange().getValues();
  const logs = [];

  for (let i = 1; i < dados.length; i++) {
    if (dados[i][1] === idChamado) {
      const visivel = dados[i][8] === 'SIM';
      // Solicitante comum só vê se visivelSolicitante === SIM
      if (isAdmin || visivel) {
        logs.push({
          idLog: dados[i][0],
          dataHora: formatarData(dados[i][2]),
          autor: dados[i][3],
          tipoAcao: dados[i][4],
          statusAnterior: dados[i][5],
          novoStatus: dados[i][6],
          mensagem: dados[i][7],
          visivelSolicitante: visivel
        });
      }
    }
  }

  return logs;
}

/**
 * Template de notificação corporativa por e-mail sem emojis.
 */
function enviarEmailNotificacao(params) {
  const htmlCorpo = [
    '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #E8E8E8; border-radius: 8px; overflow: hidden;">',
    '  <div style="background-color: #0B316D; padding: 20px; color: #FFFFFF;">',
    '    <h2 style="margin: 0; font-size: 18px; font-weight: bold; letter-spacing: 0.5px;">brisanet | Gestão de Telefonia</h2>',
    '    <p style="margin: 5px 0 0 0; font-size: 12px; color: #E8E8E8; text-transform: uppercase;">Gerência Executiva de Telefonia</p>',
    '  </div>',
    '  <div style="padding: 24px; background-color: #FFFFFF; color: #1E293B;">',
    '    <div style="display: inline-block; padding: 4px 10px; background-color: #F1F5F9; border: 1px solid #E2E8F0; border-radius: 4px; font-size: 12px; font-weight: bold; color: #0B316D; margin-bottom: 15px;">',
    '      Protocolo: ' + params.idChamado,
    '    </div>',
    '    <h3 style="margin: 0 0 10px 0; font-size: 16px; color: #0B316D;">' + params.titulo + '</h3>',
    '    <p style="font-size: 14px; line-height: 1.6; color: #334155; margin-bottom: 20px;">' + params.mensagem + '</p>',
    '    <div style="border-top: 1px solid #E8E8E8; padding-top: 15px; font-size: 12px; color: #64748B;">',
    '      Atualizado por: <strong>' + params.autor + '</strong>',
    '    </div>',
    '  </div>',
    '  <div style="background-color: #F8FAFC; padding: 12px 20px; text-align: center; font-size: 11px; color: #94A3B8; border-top: 1px solid #E8E8E8;">',
    '    Mensagem automática enviada pelo Painel de Chamados Administrativos da brisanet.',
    '  </div>',
    '</div>'
  ].join('');

  MailApp.sendEmail({
    to: params.destinatario,
    subject: params.assunto,
    htmlBody: htmlCorpo
  });
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
    tempoTotalHoras: linha[15]
  };
}

function formatarData(valorData) {
  if (!valorData) return '';
  if (valorData instanceof Date) {
    return Utilities.formatDate(valorData, Session.getScriptTimeZone() || 'America/Fortaleza', 'dd/MM/yyyy HH:mm:ss');
  }
  return String(valorData);
}
