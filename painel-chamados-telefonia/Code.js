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
    administradores: administradores,
    webAppUrl: normalizarUrlPublica(obterUrlWebApp()),
    urlPortalVisitas: obterUrlPortalVisitas(),
    isUrlPortalConfigurada: Boolean(props.getProperty('URL_PORTAL_VISITAS'))
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
      { col: 19, nome: 'AVISO_4_DIAS_ENVIADO' }
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
              assunto: '[brisanet] Chamado Cancelado por Inatividade: ' + idChamado,
              idChamado: idChamado,
              titulo: tituloChamado,
              mensagem: 'Informamos que o chamado ' + idChamado + ' permaneceu por 7 dias corridos no status "Aguardando Retorno" sem manifestação ou envio dos dados solicitados, e por isso foi cancelado automaticamente pelo sistema.\n\nCaso ainda necessite de atendimento da Telefonia Brisanet, por favor registre um novo chamado na plataforma.',
              autor: 'telefonia@brisanet.com.br',
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
              assunto: '[brisanet] Aviso de Pendência (4 dias): ' + idChamado,
              idChamado: idChamado,
              titulo: tituloChamado,
              mensagem: 'Prezado(a) solicitante,\n\nIdentificamos que seu chamado encontra-se com o status "Aguardando Retorno" há 4 dias corridos.\n\nLembramos que, de acordo com as normas da Telefonia Brisanet, chamados sem manifestação por 7 dias corridos são cancelados automaticamente pelo sistema.\n\nRestam 3 dias corridos para o cancelamento automático desta solicitação. Caso ainda necessite de atendimento, acesse seu chamado pelo link abaixo e envie as informações ou documentos solicitados.',
              autor: 'telefonia@brisanet.com.br',
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
    tempoTotalHoras: linha[15],
    observacoesAdmin: String(linha[16] || ''),
    dataStatusAguardando: formatarData(linha[17]),
    aviso4DiasEnviado: linha[18] === 'SIM' || linha[18] === true
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
  if (!aba) {
    aba = ss.insertSheet('VISITAS');
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
      'MOTIVO_DECISAO'
    ];
    aba.appendRow(cabecalhos);
    aba.getRange(1, 1, 1, cabecalhos.length)
      .setBackground('#0B316D')
      .setFontColor('#FFFFFF')
      .setFontWeight('bold');
    aba.setFrozenRows(1);
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
    motivoDecisao: String(linha[19] || '')
  };
}

/**
 * Cria uma nova solicitação de visita corporativa a partir do formulário web.
 */
function criarSolicitacaoVisita(dados, arquivosBase64) {
  try {
    const props = PropertiesService.getScriptProperties();
    const spreadsheetId = props.getProperty('SPREADSHEET_ID');
    const ss = SpreadsheetApp.openById(spreadsheetId);
    const abaVisitas = garantirAbaVisitas(ss);
    const abaLog = ss.getSheetByName('LOG_INTERACOES');

    const agora = new Date();
    const anoAtual = agora.getFullYear();
    const proximaLinha = abaVisitas.getLastRow() + 1;
    const sequencial = ('0000' + (proximaLinha - 1)).slice(-4);
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

    // Enviar confirmação por e-mail ao visitante externo
    try {
      enviarEmailNotificacaoVisita({
        destinatario: emailResponsavel,
        assunto: '[brisanet] Solicitação de Visita Recebida: ' + idVisita,
        idVisita: idVisita,
        empresa: empresa,
        periodo: (dados.periodoInicio || '') + ' a ' + (dados.periodoFim || ''),
        status: 'Pendente',
        mensagem: 'Sua solicitação de visita à Brisanet foi recebida com sucesso e está em análise pela equipe administrativa e gestores anfitriões.\n\nVocê pode consultar o status, cronograma e deliberações acessando a página "Meus Chamados" pelo link abaixo.',
        linkAcompanhamento: linkAcompanhamento,
        anexos: urlsAnexos
      });
    } catch (eMail) {
      Logger.log('Aviso ao enviar e-mail de confirmação de visita: ' + eMail.message);
    }

    // Notificar administradores cadastrados
    try {
      const config = obterConfiguracoesIniciais();
      const administradores = config.administradores || [];
      const linkAdmin = urlWeb ? (urlWeb + (urlWeb.includes('?') ? '&' : '?') + 'visita=' + idVisita + '&aba=visitas') : '';

      administradores.forEach(function(adminEmail) {
        if (adminEmail && adminEmail.includes('@')) {
          enviarEmailNotificacaoVisita({
            destinatario: adminEmail,
            assunto: '[brisanet] Nova Solicitação de Visita: ' + empresa + ' (' + idVisita + ')',
            idVisita: idVisita,
            empresa: empresa,
            periodo: (dados.periodoInicio || '') + ' a ' + (dados.periodoFim || ''),
            status: 'Pendente',
            mensagem: 'Nova solicitação de visita corporativa recebida de ' + empresa + ' para o período de ' + (dados.periodoInicio || '') + ' a ' + (dados.periodoFim || '') + '. Acesse a aba Gestão de Visitas para analisar a agenda e salas.',
            linkAcompanhamento: linkAdmin,
            anexos: urlsAnexos
          });
        }
      });
    } catch (eAdminMail) {
      Logger.log('Aviso ao notificar administradores de nova visita: ' + eAdminMail.message);
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
  }
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
function obterHistoricoVisita(idVisita, token) {
  const visita = obterVisitaPorIdOuToken(idVisita, token);
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

  for (let i = 1; i < dados.length; i++) {
    if (String(dados[i][1]).trim().toUpperCase() === String(idVisita).trim().toUpperCase()) {
      const visivel = dados[i][8] === 'SIM';
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
 * Atualiza o status da visita (Aprovação, Ajuste ou Reprovação) com disparo de e-mail.
 */
function atualizarStatusVisita(idVisita, novoStatus, motivoParecer, atendenteEmail) {
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
  const emailAtendente = atendenteEmail || Session.getActiveUser().getEmail() || 'telefonia@brisanet.com.br';

  // Coluna 16: STATUS, 17: ATENDENTE, 19: DATA_DECISAO, 20: MOTIVO_DECISAO
  abaVisitas.getRange(linhaEncontrada, 16).setValue(novoStatus);
  abaVisitas.getRange(linhaEncontrada, 17).setValue(emailAtendente);
  abaVisitas.getRange(linhaEncontrada, 19).setValue(agora);
  abaVisitas.getRange(linhaEncontrada, 20).setValue(motivoParecer || '');

  // Log de Auditoria
  if (abaLog) {
    abaLog.appendRow([
      Utilities.getUuid(),
      idVisita,
      agora,
      emailAtendente,
      'Decisão de Visita (' + novoStatus + ')',
      visitaObj.status,
      novoStatus,
      motivoParecer || ('Status alterado para ' + novoStatus),
      'SIM'
    ]);
  }

  // Notificar visitante por e-mail com visual institucional
  const urlWeb = obterUrlPortalVisitas();
  const linkAcompanhamento = urlWeb ? (urlWeb + (urlWeb.includes('?') ? '&' : '?') + 'portal=visita&aba=meus&visita=' + idVisita + '&token=' + visitaObj.tokenAcesso + '&email=' + encodeURIComponent(visitaObj.responsavelEmail)) : '';

  try {
    let mensagemStatus = '';
    if (novoStatus === 'Aprovada') {
      mensagemStatus = 'Sua solicitação de visita à Brisanet foi APROVADA. Os participantes cadastrados estão autorizados a acessar as instalações e salas indicadas no itinerário oficial.';
    } else if (novoStatus === 'Ajuste Solicitado') {
      mensagemStatus = 'A equipe administrativa da Brisanet solicitou um ajuste de agenda, sala ou horário em sua visita:\n\n"' + (motivoParecer || '') + '"\n\nPor favor, acesse o link para responder com os novos horários ou esclarecimentos.';
    } else if (novoStatus === 'Reprovada') {
      mensagemStatus = 'Sua solicitação de visita à Brisanet não pôde ser aprovada no momento.\n\nMotivo: ' + (motivoParecer || 'Incompatibilidade de agenda ou indisponibilidade de salas.');
    } else {
      mensagemStatus = 'O status da sua solicitação de visita foi atualizado para: ' + novoStatus + '.\n\nParecer: ' + (motivoParecer || 'Sem observações adicionais.');
    }

    enviarEmailNotificacaoVisita({
      destinatario: visitaObj.responsavelEmail,
      assunto: '[brisanet] Visita ' + idVisita + ': ' + novoStatus,
      idVisita: idVisita,
      empresa: visitaObj.empresa,
      periodo: visitaObj.periodoInicio + ' a ' + visitaObj.periodoFim,
      status: novoStatus,
      mensagem: mensagemStatus,
      linkAcompanhamento: linkAcompanhamento,
      autorEmail: emailAtendente
    });
  } catch (eMail) {
    Logger.log('Aviso ao notificar visitante sobre status: ' + eMail.message);
  }

  return { sucesso: true, mensagem: 'Status da visita atualizado para ' + novoStatus + '.' };
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

  // Notificar atendente/admins
  try {
    const urlWeb = obterUrlWebApp();
    const linkAdmin = urlWeb ? (urlWeb + (urlWeb.includes('?') ? '&' : '?') + 'visita=' + idVisita + '&aba=visitas') : '';
    const destinatarioAdmin = visitaObj.atendente || 'telefonia@brisanet.com.br';

    enviarEmailNotificacaoVisita({
      destinatario: destinatarioAdmin,
      assunto: '[brisanet] Resposta do Visitante (' + visitaObj.empresa + '): ' + idVisita,
      idVisita: idVisita,
      empresa: visitaObj.empresa,
      periodo: visitaObj.periodoInicio + ' a ' + visitaObj.periodoFim,
      status: 'Em Análise',
      mensagem: 'O visitante ' + visitaObj.responsavelNome + ' respondeu ao chamado da visita:\n\n"' + (respostaTexto || 'Novos documentos anexados.') + '"',
      linkAcompanhamento: linkAdmin,
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
        const destinatarioAdmin = visitaAntiga.atendente || 'telefonia@brisanet.com.br';

        enviarEmailNotificacaoVisita({
          destinatario: destinatarioAdmin,
          assunto: '[brisanet] Proposta de Visita Ajustada pelo Solicitante: ' + idVisita,
          idVisita: idVisita,
          empresa: dadosVisita.empresa || visitaAntiga.empresa,
          periodo: (dadosVisita.periodoInicio || visitaAntiga.periodoInicio) + ' a ' + (dadosVisita.periodoFim || visitaAntiga.periodoFim),
          status: 'Em Análise',
          mensagem: 'O solicitante ' + (dadosVisita.responsavelNome || visitaAntiga.responsavelNome) + ' realizou os ajustes solicitados na proposta de visita:\n\n' + textoMudancas + '\n\nAcesse a aba Gestão de Visitas para deliberar sobre a nova proposta.',
          linkAcompanhamento: linkAdmin,
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
 */
function enviarEmailNotificacaoVisita(params) {
  const emailAutor = params.autorEmail || params.atendenteEmail || Session.getActiveUser().getEmail() || 'telefonia@brisanet.com.br';
  const nomeAutor = emailAutor.split('@')[0].replace('.', ' ');
  const nomeFormatado = nomeAutor.charAt(0).toUpperCase() + nomeAutor.slice(1);

  const statusCor = {
    'Aprovada': '#059669',
    'Pendente': '#0B316D',
    'Em Análise': '#D97706',
    'Ajuste Solicitado': '#EA580C',
    'Reprovada': '#DC2626'
  }[params.status] || '#0B316D';

  const link = params.linkAcompanhamento || '';

  // 1. Processar anexos físicos se fornecidos
  const blobsAnexos = [];
  if (params.anexos && Array.isArray(params.anexos)) {
    for (let i = 0; i < params.anexos.length; i++) {
      try {
        const b = obterBlobDoAnexo(params.anexos[i]);
        if (b) blobsAnexos.push(b);
      } catch (eB) {}
    }
  }

  const htmlCorpo = [
    '<!DOCTYPE html>',
    '<html>',
    '<head><meta charset="UTF-8"></head>',
    '<body style="background-color: #F8FAFC; font-family: Arial, sans-serif; margin: 0; padding: 24px;">',
    '  <div style="max-width: 600px; margin: 0 auto; background-color: #FFFFFF; border: 1px solid #E8E8E8; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">',
    '    <div style="height: 5px; background: linear-gradient(90deg, #FF5022, #E47D20);"></div>',
    '    <div style="background-color: #0B316D; padding: 24px; color: #FFFFFF;">',
    '      <div style="font-size: 19px; font-weight: 700; margin: 0;">',
    '        <span>brisanet</span> <span style="color: #94A3B8; font-weight: 300;">|</span> <span>Gestão de Visitas Corporativas</span>',
    '      </div>',
    '      <div style="font-size: 11px; font-weight: 600; color: #E2E8F0; text-transform: uppercase; letter-spacing: 1px; margin-top: 4px;">',
    '        GERÊNCIA EXECUTIVA DE TELEFONIA &bull; BRISANET',
    '      </div>',
    '    </div>',
    '    <div style="padding: 28px 24px; color: #1E293B;">',
    '      <div style="display: flex; gap: 8px; margin-bottom: 18px;">',
    '        <span style="display: inline-block; padding: 5px 12px; background-color: #EFF6FF; border: 1px solid #BFDBFE; border-radius: 8px; font-size: 13px; font-weight: 700; color: #0B316D;">Protocolo: ' + params.idVisita + '</span>',
    '        <span style="display: inline-block; padding: 5px 12px; background-color: #F1F5F9; border: 1px solid #CBD5E1; border-radius: 8px; font-size: 12px; font-weight: 700; color: ' + statusCor + ';">Status: ' + params.status + '</span>',
    '      </div>',
    '      <h2 style="margin: 0 0 14px 0; font-size: 17px; font-weight: 700; color: #0F172A;">',
    '        Solicitação de Visita &bull; ' + params.empresa,
    '      </h2>',
    '      <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 14px 16px; margin-bottom: 18px; font-size: 12px; color: #475569; line-height: 1.6;">',
    '        <div><strong>Empresa Visitante:</strong> ' + params.empresa + '</div>',
    '        <div><strong>Período Previsto:</strong> ' + (params.periodo || 'A definir') + '</div>',
    '      </div>',
    '      <div style="background-color: #F8FAFC; border-left: 4px solid #FF5022; border-top: 1px solid #E8E8E8; border-right: 1px solid #E8E8E8; border-bottom: 1px solid #E8E8E8; border-radius: 0 10px 10px 0; padding: 16px; margin-bottom: 22px;">',
    '        <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #FF5022; margin-bottom: 6px;">Parecer / Comunicado:</div>',
    '        <div style="font-size: 13px; line-height: 1.6; color: #334155; white-space: pre-wrap;">' + params.mensagem + '</div>',
    '      </div>',
    (link ? [
      '      <div style="margin: 24px 0; text-align: center;">',
      '        <a href="' + link + '" target="_blank" style="display: inline-block; width: 100%; max-width: 380px; padding: 13px 22px; background-color: #0B316D; color: #FFFFFF; font-size: 13px; font-weight: 700; text-decoration: none; border-radius: 10px; box-shadow: 0 4px 6px -1px rgba(11, 49, 109, 0.2); text-align: center; box-sizing: border-box;">',
      '          Acompanhar Solicitação de Visita &rarr;',
      '        </a>',
      '        <div style="font-size: 11px; color: #94A3B8; margin-top: 6px;">Acesse para consultar itinerário, pareceres ou enviar esclarecimentos</div>',
      '      </div>'
    ].join('\n') : ''),
    '      <div style="background-color: #FFFBEB; border: 1px solid #FDE68A; border-radius: 10px; padding: 14px 16px; margin-bottom: 15px; font-size: 12px; color: #78350F; line-height: 1.5;">',
    '        <strong>COMUNICADO:</strong> Respostas enviadas diretamente por e-mail não são processadas. ' + (link ? '<a href="' + link + '" target="_blank" style="color: #0B316D; font-weight: 700; text-decoration: underline;">Clique aqui para responder pelo painel seguro</a>.' : 'Acesse o painel web para interagir.'),
    '      </div>',
    '    </div>',
    '    <div style="background-color: #F8FAFC; padding: 16px 24px; text-align: center; font-size: 11px; color: #94A3B8; border-top: 1px solid #E8E8E8;">',
    '      Gestão de Visitas Corporativas &bull; Gerência Executiva de Telefonia &bull; brisanet',
    '    </div>',
    '  </div>',
    '</body></html>'
  ].join('\n');

  const textoPlano = [
    'Solicitação de Visita: ' + params.idVisita,
    'Empresa: ' + params.empresa,
    'Status: ' + params.status,
    '',
    'Mensagem / Parecer:',
    params.mensagem,
    '',
    (link ? 'Acesse o link seguro para acompanhar e responder:\n' + link + '\n\n' : ''),
    'Gestão de Telefonia - Brisanet'
  ].join('\n');

  const options = {
    htmlBody: htmlCorpo,
    name: 'Gestão de Visitas | brisanet',
    replyTo: emailAutor
  };
  if (blobsAnexos.length > 0) options.attachments = blobsAnexos;

  try {
    GmailApp.sendEmail(params.destinatario, params.assunto, textoPlano, options);
  } catch (e1) {
    try {
      MailApp.sendEmail({
        to: params.destinatario,
        subject: params.assunto,
        body: textoPlano,
        htmlBody: htmlCorpo,
        name: 'Gestão de Visitas | brisanet',
        replyTo: emailAutor,
        attachments: blobsAnexos
      });
    } catch (e2) {
      Logger.log('Erro ao enviar e-mail de visita: ' + e2.message);
    }
  }
}
