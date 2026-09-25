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
  const template = HtmlService.createTemplateFromFile('Index');

  // Capturar parâmetros de URL para redirecionamento direto a um chamado
  const idChamadoParam = (e && e.parameter && (e.parameter.chamado || e.parameter.id)) ? String(e.parameter.chamado || e.parameter.id).trim() : '';
  const abaParam = (e && e.parameter && e.parameter.aba) ? String(e.parameter.aba).trim() : '';

  template.urlParamChamado = idChamadoParam;
  template.urlParamAba = abaParam;

  return template
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
    categorias: categorias,
    webAppUrl: obterUrlWebApp()
  };
}

/**
 * Salva arquivos codificados em Base64 no Google Drive na pasta do chamado.
 * Retorna array de objetos com { nome, url }.
 */
function salvarAnexosNoDrive(idChamado, arquivosBase64) {
  const anexosSalvos = [];
  if (!arquivosBase64 || arquivosBase64.length === 0) return anexosSalvos;

  try {
    const props = PropertiesService.getScriptProperties();
    const rootFolderId = props.getProperty('ROOT_FOLDER_ID');
    if (!rootFolderId) return anexosSalvos;

    const pastaRaiz = DriveApp.getFolderById(rootFolderId);
    const anoAtual = new Date().getFullYear();

    // Pasta do Ano
    let pastaAno = pastaRaiz.getFoldersByName(String(anoAtual));
    pastaAno = pastaAno.hasNext() ? pastaAno.next() : pastaRaiz.createFolder(String(anoAtual));

    // Pasta do Chamado
    let pastaChamado = pastaAno.getFoldersByName(idChamado);
    pastaChamado = pastaChamado.hasNext() ? pastaChamado.next() : pastaAno.createFolder(idChamado);

    arquivosBase64.forEach(function(arq) {
      try {
        const contentType = arq.tipo || 'application/octet-stream';
        const bytes = Utilities.base64Decode(arq.base64.split(',')[1] || arq.base64);
        const blob = Utilities.newBlob(bytes, contentType, arq.nome);
        const arquivoSalvo = pastaChamado.createFile(blob);
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
  try {
    const props = PropertiesService.getScriptProperties();
    const spreadsheetId = props.getProperty('SPREADSHEET_ID');
    
    const ss = SpreadsheetApp.openById(spreadsheetId);
    const abaChamados = ss.getSheetByName('CHAMADOS');
    const abaLog = ss.getSheetByName('LOG_INTERACOES');
    
    const agora = new Date();
    const anoAtual = agora.getFullYear();
    const proximaLinha = abaChamados.getLastRow() + 1;
    const sequencial = ('0000' + (proximaLinha - 1)).slice(-4);
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
 * Registra feedback, troca de status ou notas internas com suporte a anexos.
 */
function adicionarInteracao(idChamado, mensagemFeedback, novoStatus, visivelSolicitante, arquivosBase64) {
  const props = PropertiesService.getScriptProperties();
  const spreadsheetId = props.getProperty('SPREADSHEET_ID');
  const ss = SpreadsheetApp.openById(spreadsheetId);
  const abaChamados = ss.getSheetByName('CHAMADOS');
  const abaLog = ss.getSheetByName('LOG_INTERACOES');
  
  const usuarioEmail = Session.getActiveUser().getEmail() || '';
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

  // Processar novos anexos do atendente (se houver)
  const novosAnexos = salvarAnexosNoDrive(idChamado, arquivosBase64);
  if (novosAnexos.length > 0) {
    anexosExistentes = anexosExistentes.concat(novosAnexos);
    abaChamados.getRange(linhaAlvo, 11).setValue(JSON.stringify(sanitizarAnexosParaPlanilha(anexosExistentes)));
  }

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
        assunto: '[brisanet] Novo Parecer no Chamado: ' + idChamado,
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
    chamadoAtualizado: { anexos: sanitizarAnexosParaPlanilha(anexosExistentes) } 
  };
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
 * Registra a resposta ou esclarecimento do usuário solicitante pela aba Meus Chamados.
 * Suporta texto e/ou upload de múltiplos anexos.
 */
function adicionarRespostaSolicitante(idChamado, respostaTexto, arquivosBase64) {
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

    const usuarioEmail = Session.getActiveUser().getEmail() || 'solicitante@brisanet.com.br';
    const agora = new Date();

    const dados = abaChamados.getDataRange().getValues();
    let linhaAlvo = -1;
    let statusAtual = '';
    let atendenteEmail = '';
    let tituloChamado = '';
    let anexosExistentes = [];

    for (let i = 1; i < dados.length; i++) {
      if (dados[i][0] === idChamado) {
        linhaAlvo = i + 1;
        statusAtual = dados[i][11];
        atendenteEmail = dados[i][12];
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

    // Notifica o atendente responsável por e-mail (se houver analista atribuído)
    if (atendenteEmail && atendenteEmail.includes('@')) {
      try {
        enviarEmailNotificacao({
          destinatario: atendenteEmail,
          assunto: '[brisanet] Resposta do Solicitante: ' + idChamado,
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
 * Retorna a URL publicada do Web App, com cache em ScriptProperties.
 */
function obterUrlWebApp() {
  let url = '';
  try {
    url = ScriptApp.getService().getUrl();
    if (url && url.length > 5) {
      try {
        const props = PropertiesService.getScriptProperties();
        if (props.getProperty('WEB_APP_URL') !== url) {
          props.setProperty('WEB_APP_URL', url);
        }
      } catch (eProp) {}
      return url;
    }
  } catch (err) {
    Logger.log('Aviso ao obter URL via ScriptApp: ' + err.message);
  }

  try {
    const props = PropertiesService.getScriptProperties();
    const salva = props.getProperty('WEB_APP_URL');
    if (salva) return salva;
  } catch (e2) {}

  return '';
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
 * Template corporativo oficial de notificação por e-mail (brisanet).
 * Utiliza tipografia e paleta do projeto (Navy #0B316D, Laranja #FF5022, Cinza #E8E8E8).
 * Envia via GmailApp em nome do usuário conectado com os arquivos fisicamente anexados (attachments)
 * e disponibiliza botões de DOWNLOAD DIRETO dos arquivos no corpo da mensagem.
 */
function enviarEmailNotificacao(params) {
  const emailAtendente = params.autor || Session.getActiveUser().getEmail() || 'telefonia@brisanet.com.br';
  const nomeAtendente = emailAtendente.split('@')[0].replace('.', ' ');
  const nomeFormatado = nomeAtendente.charAt(0).toUpperCase() + nomeAtendente.slice(1);

  // Link direto para o chamado no painel web
  const abaAlvo = params.aba || 'meus';
  const urlBase = params.webAppUrl || obterUrlWebApp();
  let linkChamado = '';
  if (urlBase) {
    const sep = urlBase.includes('?') ? '&' : '?';
    linkChamado = urlBase + sep + 'chamado=' + encodeURIComponent(params.idChamado) + '&aba=' + encodeURIComponent(abaAlvo);
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
      '          Protocolo: ' + params.idChamado + ' <span style="color: #2242D4; font-size: 12px; margin-left: 4px;">&#8599;</span>',
      '        </a>',
      '      </div>'
    ].join('\n') : [
      '      <div style="display: inline-block; padding: 5px 12px; background-color: #F1F5F9; border: 1px solid #E2E8F0; border-radius: 8px; font-family: \'Rubik\', sans-serif; font-size: 13px; font-weight: 700; color: #0B316D; margin-bottom: 18px;">',
      '        Protocolo: ' + params.idChamado,
      '      </div>'
    ].join('\n')),
    '      ',
    '      <!-- Assunto -->',
    '      <h2 style="margin: 0 0 16px 0; font-size: 16px; font-weight: 700; color: #0F172A; line-height: 1.4;">',
    '        ' + params.titulo,
    '      </h2>',
    '      ',
    '      <!-- Parecer Técnico / Mensagem -->',
    '      <div style="background-color: #F8FAFC; border-left: 4px solid #FF5022; border-top: 1px solid #E8E8E8; border-right: 1px solid #E8E8E8; border-bottom: 1px solid #E8E8E8; border-radius: 0 10px 10px 0; padding: 16px; margin-bottom: 22px;">',
    '        <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #FF5022; margin-bottom: 6px;">',
    '          Mensagem / Parecer:',
    '        </div>',
    '        <div style="font-size: 14px; line-height: 1.6; color: #334155; white-space: pre-wrap;">' + params.mensagem + '</div>',
    '      </div>',
    '      ',
    htmlAnexos,
    '      ',
    '      <!-- Atendente Responsável -->',
    '      <div style="font-size: 12px; color: #64748B; margin-bottom: 20px;">',
    '        Atendente responsável: <strong style="color: #0F172A;">' + emailAtendente + '</strong>',
    '      </div>',
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
    '          Respostas enviadas diretamente por e-mail <strong>não são recebidas nem monitoradas</strong>. ' + (linkChamado ? 'Para responder ao atendente, enviar esclarecimentos ou anexar novos documentos, <a href="' + linkChamado + '" target="_blank" style="color: #0B316D; font-weight: 700; text-decoration: underline;">clique aqui para acessar diretamente seu chamado em Meus Chamados</a>.' : 'Para responder ao atendente, enviar esclarecimentos ou anexar novos documentos, acesse a aba <strong>Meus Chamados</strong> no Painel Web.'),
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
    'Chamado: ' + params.idChamado,
    'Assunto: ' + params.titulo,
    '',
    'Mensagem / Parecer:',
    params.mensagem,
    '',
    (linkChamado ? 'Link direto para o chamado no painel:\n' + linkChamado + '\n\n' : ''),
    (params.anexos && params.anexos.length > 0 ? 'Anexos para download:\n' + params.anexos.map(function(a) { 
      const id = a.id || extrairIdDrive(a.url);
      const dl = a.downloadUrl || (id ? 'https://drive.google.com/uc?export=download&id=' + id : a.url);
      return '- ' + a.nome + ': ' + dl;
    }).join('\n') : ''),
    '',
    'Atendente: ' + emailAtendente,
    '',
    'COMUNICADO: NÃO RESPONDA A ESTE E-MAIL.',
    (linkChamado ? 'Para responder ou anexar arquivos, acesse o link:\n' + linkChamado : 'Acesse a aba Meus Chamados no Painel Web para interagir.')
  ].join('\n');

  const options = {
    htmlBody: htmlCorpo,
    name: nomeFormatado + ' | Gestão de Telefonia brisanet',
    replyTo: 'nao-responda@grupobrisanet.com.br'
  };

  if (blobsAnexos.length > 0) {
    options.attachments = blobsAnexos;
  }

  const mailAppOptions = {
    to: params.destinatario,
    subject: params.assunto,
    body: textoPlano,
    htmlBody: htmlCorpo,
    name: nomeFormatado + ' | Gestão de Telefonia brisanet',
    replyTo: 'nao-responda@grupobrisanet.com.br'
  };

  if (blobsAnexos.length > 0) {
    mailAppOptions.attachments = blobsAnexos;
  }

  let enviado = false;
  try {
    GmailApp.sendEmail(params.destinatario, params.assunto, textoPlano, options);
    enviado = true;
  } catch (errGmail) {
    Logger.log('Aviso GmailApp: ' + errGmail.message + ' - utilizando MailApp...');
  }

  if (!enviado) {
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
