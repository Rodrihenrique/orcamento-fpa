/**
 * ============================================================================
 * AUTOMAÇÃO DE DIAGRAMAS E INTEGRAÇÕES 5G
 * ============================================================================
 * Módulo para ingestão de dados via API Sytex (.xlsx), conciliação em memória
 * com a planilha oficial de Integrações e enriquecimento automático com a
 * matriz hierárquica de Diagramas de Rede 5G (Mão de Obra e Serviço Terceiro).
 * 
 * Repositório: https://github.com/Rodrihenrique/orcamento-fpa
 * Módulo: automacao-diagramas
 * ============================================================================
 */

/**
 * Configurações Gerais e Parâmetros Operacionais
 */
const CONFIG = {
  // 1. Planilha de Destino Oficial (Tabela Única Consolidada)
  idDestino: '1_QIjeOwBFqW5BzEEq4OCCIWKFG7O8-YONGIoH5R9za8',
  abaDestinoPadrao: 'OUT/2026',
  linhaCabecalho: 4,
  linhaDadosInicial: 5,

  // 2. Conector API Sytex (Fonte Mestra de Sites Ativos)
  sytexUrl: 'https://app.sytex.io/api/datareport/7bc528d3-2b34-4bc1-b6df-59eff2ccceb9/export/?org_id=181',
  sytexUsuario: 'riltomar@grupobrisanet.com.br',
  sytexSenha: '', // Se vazio, busca em PropertiesService ou solicita ao usuário

  // 3. Planilha Oficial de Integrações (Atribuição de Vendor & Integrador)
  idOrigemIntegracao: '19C0e5op2QHsXxmgOsLbO-zz-RP1yajM-UxUd_9rzhiI',
  gidOrigemIntegracao: '1755873954',
  abaOrigemIntegracao: 'INTEGRAÇÃO DE SITES',
  linhaCabecalhoIntegracao: 2, // Cabeçalhos na linha 2; dados na linha 3 em diante
  colIntegracaoSite: 0,        // Coluna A: SITE
  colIntegracaoVendor: 5,      // Coluna F: VENDOR (HUAWEI, FIBERHOME, etc.)
  colIntegracaoReport: 11,     // Coluna L: REPORT / INTEGRADOR (BRISANET, FIBERHOME)
  colIntegracaoDataFim: 15,    // Coluna P: CHAMADO FINALIZADO (Data)
  colIntegracaoHoraFim: 16,    // Coluna Q: HORA DE FINALIZAÇÃO
  colIntegracaoMes: 18,        // Coluna S: MÊS (JANEIRO, FEVEREIRO, ..., OUTUBRO)
  colIntegracaoAno: 19,        // Coluna T: ANO (2026)

  // 4. Planilha Oficial de Diagramas 5G (Mão de Obra e Serviço Terceiro)
  idOrigemDiagramas: '1fd5sieHnEMixKJh8T7qYNwZfecL453cGqqkYl41VdaA',
  abaOrigemDiagramas: 'Diagramas - 5G'
};

/**
 * Disparador nativo: Cria o menu personalizado "🔄 Automação 5G" ao abrir a planilha.
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('🔄 Automação 5G')
    .addItem('🚀 Sincronizar Tudo (Sytex ➔ Integração ➔ Diagramas)', 'executarSincronizacaoCompleta')
    .addSeparator()
    .addItem('📡 1. Testar Ingestão Sytex API (.xlsx)', 'testarConexaoSytexMenu')
    .addItem('📋 2. Conciliar Apenas Integração e Sytex', 'conciliarChamadosMenu')
    .addItem('🗺️ 3. Atualizar Apenas Diagramas de Rede', 'atualizarDiagramasMenu')
    .addSeparator()
    .addItem('⚙️ Configurar Acesso Sytex (Senha)', 'configurarCredenciaisSytexMenu')
    .addToUi();
}

/**
 * FLUXO PRINCIPAL: Executa o ciclo completo ponta a ponta:
 * 1. Baixa e higieniza os sites do relatório da API Sytex (.xlsx em memória sem necessidade de serviços avançados).
 * 2. Cruza com os chamados finalizados do mês da planilha de Integrações.
 * 3. Enriquece com a matriz de Diagramas 5G (Projeto, Mão de Obra e Serviço Terceiro).
 * 4. Renderiza a Tabela Única de 10 Colunas e os Indicadores de Topo na aba ativa.
 */
function executarSincronizacaoCompleta() {
  const ui = SpreadsheetApp.getUi();
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();

  spreadsheet.toast('Iniciando sincronização completa...', 'Processando', -1);

  try {
    const destinoInfo = obterPlanilhaDestinoEAba(spreadsheet);
    const planDestino = destinoInfo.planDestino;
    const mesInfo = destinoInfo.mesInfo;

    if (!mesInfo) {
      throw new Error(`A aba ativa "${destinoInfo.nomeAba}" não possui formato de mês válido (ex.: OUT/2026, NOV/2026).`);
    }

    // 1. Obtém e higieniza a lista de sites do Sytex (.xlsx)
    spreadsheet.toast('Baixando dados do Sytex via API...', 'Etapa 1/4', -1);
    const sitesSytex = obterSitesSytexEmMemoria();

    // 2. Extrai e filtra chamados da planilha de Integrações para o mês
    spreadsheet.toast('Carregando chamados de Integração de Sites...', 'Etapa 2/4', -1);
    const mapaChamados = carregarChamadosIntegracao(mesInfo);
    const totalChamadosMes = Object.keys(mapaChamados).length;

    // 3. Carrega a matriz oficial de Diagramas 5G
    spreadsheet.toast('Mapeando base de diagramas 5G...', 'Etapa 3/4', -1);
    const mapaDiagramas = carregarMapaHierarquiaDiagramas();

    // 4. Executa a conciliação em memória e gera as 10 colunas
    spreadsheet.toast('Conciliando dados e gerando tabela unificada...', 'Etapa 4/4', -1);
    const resultado = gerarLinhasTabelaUnica(sitesSytex, mapaChamados, mapaDiagramas);

    // 5. Grava a tabela e atualiza os cartões de indicadores
    gravarTabelaUnicaNaAba(planDestino, resultado.linhas, destinoInfo.nomeAba, resultado.totais);

    spreadsheet.toast('Sincronização finalizada com sucesso!', 'Concluído', 5);

    const periodoStr = `${mesInfo.chave}/${mesInfo.ano}`;

    // Alerta se não houver chamados no mês pesquisado
    if (totalChamadosMes === 0) {
      const msgVazio = `⚠️ Atenção: Nenhum chamado com Integrador (Coluna L) foi encontrado na planilha de Integrações para o período "${periodoStr}".\n\n` +
        `• Sites retornados pelo Sytex: ${sitesSytex.length}\n` +
        `• Chamados finalizados em ${periodoStr}: 0\n\n` +
        `💡 DICA IMPORTANTE:\nNa planilha oficial 'INTEGRAÇÃO DE SITES', os chamados cadastrados atualmente vão até OUTUBRO/2026 (Novembro ainda não foi alimentado na origem).\n\n` +
        `Para testar a tabela preenchida com dados reais, abra a aba OUT/2026 (ou crie uma aba OUT/2026) e execute a sincronização!`;

      ui.alert('Aviso de Dados do Mês', msgVazio, ui.ButtonSet.OK);
      return;
    }

    // Relatório visual final de sucesso
    const msg = `✅ Sincronização Concluída com Sucesso!\n\n` +
      `📍 Aba de Destino: ${destinoInfo.nomeAba} (${periodoStr})\n` +
      `• Sites extraídos do Sytex (.xlsx): ${sitesSytex.length}\n` +
      `• Chamados finalizados no mês: ${totalChamadosMes}\n` +
      `• Sites validados e conciliados: ${resultado.linhas.length}\n\n` +
      `📊 Distribuição por Integrador:\n` +
      `   • BRISANET: ${resultado.totais.brisanet} sites\n` +
      `   • FIBERHOME: ${resultado.totais.fiberhome} sites\n` +
      `   • Outros/Demais: ${resultado.totais.outros} sites\n\n` +
      `🗺️ Diagramas de Rede:\n` +
      `   • Diagramas vinculados com sucesso: ${resultado.totais.comDiagrama}\n` +
      `   • Pendentes de diagrama: ${resultado.totais.semDiagrama}`;

    ui.alert('✅ Sincronização 5G Concluída', msg, ui.ButtonSet.OK);

  } catch (erro) {
    ui.alert('❌ Erro na Sincronização', 'Não foi possível concluir a rotina.\n\nDetalhes: ' + erro.message, ui.ButtonSet.OK);
  }
}

/**
 * Menu acionado: Testa a chamada à API do Sytex e exibe uma amostra dos sites higienizados.
 */
function testarConexaoSytexMenu() {
  const ui = SpreadsheetApp.getUi();
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();

  spreadsheet.toast('Testando comunicação com o Sytex...', 'Conectando', -1);

  try {
    const sites = obterSitesSytexEmMemoria();
    spreadsheet.toast('Comunicação OK!', 'Sucesso', 3);

    const amostra = sites.slice(0, 10).join(', ');
    const msg = `Conexão com a API do Sytex estabelecida com sucesso!\n\n` +
      `• Total de sites higienizados extraídos: ${sites.length}\n` +
      `• Primeiros 10 sites encontrados:\n${amostra}...`;

    ui.alert('📡 Teste Sytex Concluído', msg, ui.ButtonSet.OK);
  } catch (erro) {
    ui.alert('❌ Erro de Conexão com o Sytex', erro.message, ui.ButtonSet.OK);
  }
}

/**
 * Menu acionado: Apenas concilia Sytex e Integrações, preenchendo a tabela com os dados conhecidos.
 */
function conciliarChamadosMenu() {
  executarSincronizacaoCompleta();
}

/**
 * Menu acionado: Atualiza os diagramas (Mão de Obra e Serviço Terceiro) para os sites já listados na tabela.
 */
function atualizarDiagramasMenu() {
  const ui = SpreadsheetApp.getUi();
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();

  spreadsheet.toast('Atualizando diagramas da tabela...', 'Processando', -1);

  try {
    const destinoInfo = obterPlanilhaDestinoEAba(spreadsheet);
    const planDestino = destinoInfo.planDestino;
    const maxLinhas = planDestino.getLastRow();

    if (maxLinhas < CONFIG.linhaDadosInicial) {
      ui.alert('Aviso', 'Não há dados de sites a partir da linha ' + CONFIG.linhaDadosInicial + ' para atualizar.', ui.ButtonSet.OK);
      return;
    }

    const mapaDiagramas = carregarMapaHierarquiaDiagramas();
    const rangeSites = planDestino.getRange(`C${CONFIG.linhaDadosInicial}:C${maxLinhas}`);
    const sites = rangeSites.getValues();

    const rangeColsDiagramas = planDestino.getRange(`G${CONFIG.linhaDadosInicial}:J${maxLinhas}`);
    const dadosDiagExistentes = rangeColsDiagramas.getValues();

    let atualizados = 0;
    for (let i = 0; i < sites.length; i++) {
      const site = higienizarCodigoSite(sites[i][0]);
      if (site && mapaDiagramas[site]) {
        const d = mapaDiagramas[site];
        dadosDiagExistentes[i][0] = d.projeto || dadosDiagExistentes[i][0];   // Col G (Projeto)
        dadosDiagExistentes[i][1] = d.maoDeObra || dadosDiagExistentes[i][1]; // Col H (Mão de Obra)
        dadosDiagExistentes[i][2] = d.servTerc || dadosDiagExistentes[i][2];  // Col I (Serviço Terceiro)
        dadosDiagExistentes[i][3] = d.situacao || 'OK';                      // Col J (Situação)
        atualizados++;
      }
    }

    rangeColsDiagramas.setValues(dadosDiagExistentes);
    spreadsheet.toast('Diagramas atualizados!', 'Concluído', 3);

    ui.alert('🗺️ Diagramas Atualizados', `Foram atualizados os diagramas de ${atualizados} sites na tabela.`, ui.ButtonSet.OK);

  } catch (erro) {
    ui.alert('❌ Erro ao Atualizar Diagramas', erro.message, ui.ButtonSet.OK);
  }
}

/**
 * Menu acionado: Permite ao usuário cadastrar a senha de acesso da API do Sytex com segurança.
 */
function configurarCredenciaisSytexMenu() {
  const ui = SpreadsheetApp.getUi();
  const resposta = ui.prompt(
    '⚙️ Configuração de Acesso Sytex',
    `Informe a senha de acesso para o usuário:\n${CONFIG.sytexUsuario}`,
    ui.ButtonSet.OK_CANCEL
  );

  if (resposta.getSelectedButton() === ui.Button.OK) {
    const senha = resposta.getResponseText().trim();
    if (senha) {
      PropertiesService.getUserProperties().setProperty('SYTEX_SENHA', senha);
      ui.alert('✅ Sucesso', 'Senha do Sytex armazenada com segurança!', ui.ButtonSet.OK);
    } else {
      ui.alert('Aviso', 'Nenhuma senha informada.', ui.ButtonSet.OK);
    }
  }
}

// ============================================================================
// MÓDULO 1: INGESTÃO DA API SYTEX (.XLSX)
// ============================================================================

/**
 * Conecta ao endpoint do DataReport do Sytex, baixa o .xlsx em memória,
 * converte via chamada nativa de API sem necessidade de ativar serviços avançados,
 * extrai os sites higienizados e descarta a planilha temporária.
 */
function obterSitesSytexEmMemoria() {
  const usuario = CONFIG.sytexUsuario;
  const senha = obterSenhaSytex();

  if (!senha) {
    throw new Error('Senha do Sytex não configurada. Use o menu "🔄 Automação 5G > ⚙️ Configurar Acesso Sytex".');
  }

  const base64Creds = Utilities.base64Encode(`${usuario}:${senha}`);
  const params = {
    method: 'GET',
    headers: {
      'Authorization': 'Basic ' + base64Creds
    },
    muteHttpExceptions: true
  };

  const resposta = UrlFetchApp.fetch(CONFIG.sytexUrl, params);
  const status = resposta.getResponseCode();

  if (status !== 200) {
    throw new Error(`Falha ao conectar na API Sytex (HTTP ${status}): ${resposta.getContentText().slice(0, 200)}`);
  }

  const blob = resposta.getBlob();
  let tempFileId = null;

  try {
    tempFileId = converterXlsxParaGoogleSheet(blob);

    const ssTemp = SpreadsheetApp.openById(tempFileId);
    const abaTemp = ssTemp.getSheets()[0];
    const dados = abaTemp.getDataRange().getValues();

    if (dados.length <= 1) {
      return [];
    }

    // Detector inteligente de coluna de sites (cabeçalho ou padrão de texto)
    const colInfo = detectarColunaSiteEmDados(dados);
    const colSiteIdx = colInfo.colIdx;
    const linhaInicio = colInfo.linhaInicio;

    const sitesUnicos = [];
    for (let r = linhaInicio; r < dados.length; r++) {
      const siteRaw = dados[r][colSiteIdx];
      const siteLimpo = higienizarCodigoSite(siteRaw);
      if (siteLimpo && !sitesUnicos.includes(siteLimpo)) {
        sitesUnicos.push(siteLimpo);
      }
    }

    return sitesUnicos;

  } finally {
    if (tempFileId) {
      try {
        DriveApp.getFileById(tempFileId).setTrashed(true);
      } catch (e) {
        console.warn('Aviso: Falha ao enviar para lixeira temp file ' + tempFileId + ': ' + e.message);
      }
    }
  }
}

/**
 * Localiza com inteligência qual coluna contém os códigos de site
 * analisando cabeçalhos das primeiras linhas ou padrões alfanuméricos de site.
 */
function detectarColunaSiteEmDados(dados) {
  // 1. Procura em cabeçalhos nas primeiras 3 linhas
  for (let r = 0; r < Math.min(3, dados.length); r++) {
    for (let c = 0; c < dados[r].length; c++) {
      const nome = normalizarTexto(dados[r][c]);
      if (nome.includes('site') || nome.includes('codigo') || nome.includes('estacao') || nome.includes('localizacao')) {
        return { linhaInicio: r + 1, colIdx: c };
      }
    }
  }

  // 2. Se não achou por cabeçalho, procura a coluna com maior concentração de padrão de site (ex: CEFOR01, BCE0007)
  let melhorCol = 0;
  let maxMatches = 0;
  const numCols = dados[0] ? dados[0].length : 0;

  for (let c = 0; c < numCols; c++) {
    let matches = 0;
    for (let r = 0; r < Math.min(30, dados.length); r++) {
      const val = (dados[r][c] || '').toString().trim();
      if (/^[A-Z]{2,4}\d{2,4}/i.test(val)) matches++;
    }
    if (matches > maxMatches) {
      maxMatches = matches;
      melhorCol = c;
    }
  }

  return { linhaInicio: 1, colIdx: melhorCol };
}

/**
 * Converte um arquivo binário .xlsx para uma planilha Google temporária
 * utilizando a API REST nativa do Drive com o token OAuth da própria sessão.
 */
function converterXlsxParaGoogleSheet(blob) {
  const boundary = '-------314159265358979323846';
  const delimiter = '\r\n--' + boundary + '\r\n';
  const close_delim = '\r\n--' + boundary + '--';

  const metadata = {
    title: 'temp_sytex_' + new Date().getTime(),
    mimeType: MimeType.GOOGLE_SHEETS
  };

  const base64Data = Utilities.base64Encode(blob.getBytes());
  const requestBody =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    'Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet\r\n' +
    'Content-Transfer-Encoding: base64\r\n\r\n' +
    base64Data +
    close_delim;

  const url = 'https://www.googleapis.com/upload/drive/v2/files?uploadType=multipart&convert=true';
  const resposta = UrlFetchApp.fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + ScriptApp.getOAuthToken(),
      'Content-Type': 'multipart/related; boundary=' + boundary
    },
    payload: requestBody,
    muteHttpExceptions: true
  });

  const statusCode = resposta.getResponseCode();
  const respostaTexto = resposta.getContentText();

  if (statusCode >= 200 && statusCode < 300) {
    const json = JSON.parse(respostaTexto);
    return json.id;
  }

  throw new Error(`Falha ao converter arquivo .xlsx (HTTP ${statusCode}): ${respostaTexto.slice(0, 300)}`);
}

/**
 * Obtém a senha do Sytex (via CONFIG em código ou via PropertiesService).
 */
function obterSenhaSytex() {
  if (CONFIG.sytexSenha && CONFIG.sytexSenha.trim() !== '') {
    return CONFIG.sytexSenha.trim();
  }
  const prop = PropertiesService.getUserProperties().getProperty('SYTEX_SENHA');
  if (prop && prop.trim() !== '') {
    return prop.trim();
  }
  const scriptProp = PropertiesService.getScriptProperties().getProperty('SYTEX_SENHA');
  return scriptProp ? scriptProp.trim() : '';
}

// ============================================================================
// MÓDULO 2: PROCESSAMENTO DA PLANILHA DE INTEGRAÇÕES
// ============================================================================

/**
 * Abre a planilha oficial de INTEGRAÇÃO DE SITES, filtra os chamados pelo mês/ano
 * tanto pela Data de Finalização (Col P) quanto pelas Colunas S (Mês) e T (Ano),
 * garantindo compatibilidade total.
 */
function carregarChamadosIntegracao(mesInfo) {
  const ss = SpreadsheetApp.openById(CONFIG.idOrigemIntegracao);
  let aba = ss.getSheetByName(CONFIG.abaOrigemIntegracao);

  if (!aba && CONFIG.gidOrigemIntegracao) {
    const abas = ss.getSheets();
    for (let i = 0; i < abas.length; i++) {
      if (abas[i].getSheetId().toString() === CONFIG.gidOrigemIntegracao.toString()) {
        aba = abas[i];
        break;
      }
    }
  }

  if (!aba) {
    throw new Error(`Aba "${CONFIG.abaOrigemIntegracao}" não foi encontrada na planilha de integrações.`);
  }

  const dados = aba.getDataRange().getValues();
  if (dados.length <= CONFIG.linhaCabecalhoIntegracao) {
    return {};
  }

  const mapa = {};
  const mesAlvoNorm = normalizarTexto(mesInfo.nomeMes);
  const anoAlvoStr = String(mesInfo.ano);

  // Varre a partir da linha 3 (índice 2)
  for (let r = CONFIG.linhaCabecalhoIntegracao; r < dados.length; r++) {
    const linha = dados[r];
    const siteRaw = linha[CONFIG.colIntegracaoSite];
    const reportRaw = linha[CONFIG.colIntegracaoReport];
    const dataRaw = linha[CONFIG.colIntegracaoDataFim];
    const mesColRaw = linha[CONFIG.colIntegracaoMes];
    const anoColRaw = linha[CONFIG.colIntegracaoAno];

    if (!siteRaw) continue;

    // Regra: Não importar se a coluna L (REPORT / Integrador) estiver vazia
    if (!reportRaw || reportRaw.toString().trim() === '') continue;

    // Validação de Mês e Ano: verifica por data ou pelas colunas textuais S e T
    let pertenceAoMes = false;
    let dataFinalizadaObj = extrairData(dataRaw);

    if (dataFinalizadaObj) {
      if (dataFinalizadaObj.getFullYear() === mesInfo.ano && dataFinalizadaObj.getMonth() === mesInfo.mesIndex) {
        pertenceAoMes = true;
      }
    }

    // Validação complementar pelas Colunas S (Mês) e T (Ano)
    if (!pertenceAoMes && mesColRaw && anoColRaw) {
      const mesLinhaNorm = normalizarTexto(mesColRaw);
      const anoLinhaStr = String(anoColRaw).trim();
      if (mesLinhaNorm.includes(mesAlvoNorm) && anoLinhaStr.includes(anoAlvoStr)) {
        pertenceAoMes = true;
        if (!dataFinalizadaObj) dataFinalizadaObj = new Date(mesInfo.ano, mesInfo.mesIndex, 1);
      }
    }

    if (pertenceAoMes) {
      const siteLimpo = higienizarCodigoSite(siteRaw);
      const vendorStr = (linha[CONFIG.colIntegracaoVendor] || '').toString().trim().toUpperCase();
      const integradorStr = reportRaw.toString().trim().toUpperCase();
      const dataFormatada = dataFinalizadaObj ? formatarDataBR(dataFinalizadaObj) : String(dataRaw);

      if (!mapa[siteLimpo]) {
        mapa[siteLimpo] = {
          site: siteLimpo,
          vendor: vendorStr,
          integrador: integradorStr,
          dataFinalizacao: dataFormatada,
          chamado: `TK-${siteLimpo}-${mesInfo.ano}`
        };
      }
    }
  }

  return mapa;
}

// ============================================================================
// MÓDULO 3: MAPEAMENTO DA HIERARQUIA DE DIAGRAMAS 5G
// ============================================================================

/**
 * Carrega a base oficial de diagramas 5G e indexa por código de site higienizado,
 * capturando Torre/Projeto, Mão de Obra (... 0020) e Serviço Terceiro (... 0030).
 */
function carregarMapaHierarquiaDiagramas() {
  const ss = SpreadsheetApp.openById(CONFIG.idOrigemDiagramas);
  const aba = ss.getSheetByName(CONFIG.abaOrigemDiagramas);
  if (!aba) {
    throw new Error(`Aba "${CONFIG.abaOrigemDiagramas}" não encontrada na planilha de diagramas.`);
  }

  const dados = aba.getDataRange().getValues();
  const mapa = {};

  let projetoAtual = '';
  let categoriaAtual = 'Tecnologia';

  for (let r = 0; r < dados.length; r++) {
    const linha = dados[r];
    if (!linha || linha.length === 0) continue;

    const col0 = normalizarTexto(linha[0]);
    const col1 = (linha[1] || '').toString().trim();
    const col1Norm = normalizarTexto(col1);

    // 1. Detecta se é linha filha de itens ou de categoria
    const ehLinhaFilha = col1Norm.includes('mao de obra') || 
                         col1Norm.includes('serv') || 
                         col1Norm.includes('materiais') || 
                         col1Norm.includes('regulariz') || 
                         col1Norm.includes('postes') ||
                         col1Norm.startsWith('tecnologia') ||
                         col1Norm.startsWith('infra') ||
                         col1Norm.startsWith('projetos ftth');

    // 2. Detecta início de bloco de Torre / Projeto (Col 0 é "Torre" ou Col 1 começa com "WL_" sem ser filha)
    if (!ehLinhaFilha && (col0.includes('torre') || (col1Norm.startsWith('wl_') && !col1Norm.includes(' - ')))) {
      projetoAtual = col1;
    }

    // 3. Detecta categoria em vermelho
    if (col1Norm.startsWith('tecnologia') || col1Norm.startsWith('infra civil') || col1Norm.startsWith('infra eletrica') || col1Norm.startsWith('projetos ftth')) {
      if (col1Norm.startsWith('tecnologia')) categoriaAtual = 'Tecnologia';
      else if (col1Norm.startsWith('infra civil')) categoriaAtual = 'Infra Civil';
      else if (col1Norm.startsWith('infra eletrica')) categoriaAtual = 'Infra Eletrica';
      else if (col1Norm.startsWith('projetos ftth')) categoriaAtual = 'Projetos FTTH';
    }

    // 4. Detecta linhas filhas de diagrama (Mão de Obra e Serviço Terceiro)
    if (col1Norm.includes('mao de obra') || col1Norm.includes('serv. terc') || col1Norm.includes('servico terceiro')) {
      const siteExtraido = extrairSiteDaDescricao(col1);
      if (!siteExtraido) continue;

      let diagCod = '';
      for (let c = 2; c < linha.length; c++) {
        const val = (linha[c] || '').toString().trim();
        if (val && val !== '-' && val !== '#N/A') {
          diagCod = val.replace(/\.0$/, '');
          break;
        }
      }

      if (!mapa[siteExtraido]) {
        mapa[siteExtraido] = {
          site: siteExtraido,
          projeto: projetoAtual,
          categoria: categoriaAtual,
          maoDeObra: '',
          servTerc: '',
          situacao: 'OK'
        };
      } else {
        if (!mapa[siteExtraido].projeto && projetoAtual) {
          mapa[siteExtraido].projeto = projetoAtual;
        }
        if (!mapa[siteExtraido].categoria && categoriaAtual) {
          mapa[siteExtraido].categoria = categoriaAtual;
        }
      }

      if (col1Norm.includes('mao de obra')) {
        mapa[siteExtraido].maoDeObra = diagCod;
      } else if (col1Norm.includes('serv. terc') || col1Norm.includes('servico terceiro')) {
        mapa[siteExtraido].servTerc = diagCod;
      }
    }
  }

  return mapa;
}

/**
 * Extrai o código do site a partir da descrição da linha de diagrama
 * (ex.: "Mão de obra Tecnologia - WL_AL-MCO0064-A" ➔ "MCO0064").
 */
function extrairSiteDaDescricao(texto) {
  if (!texto) return '';
  // Procura padrão alfanumérico de site (2 a 5 letras seguidas de 2 a 5 números)
  // delimitado por caracteres não-alfanuméricos (traços, underscores, barras, espaços)
  const match = texto.match(/(?:^|[^A-Za-z0-9])([A-Z]{2,5}\d{2,5})(?=[^A-Za-z0-9]|$)/i);
  return match ? match[1].toUpperCase() : '';
}

// ============================================================================
// MÓDULO 4: CONCILIAÇÃO E MONTAGEM DA TABELA ÚNICA (10 COLUNAS)
// ============================================================================

/**
 * Cruza os sites do Sytex com os chamados de integração e diagramas,
 * retornando a matriz formatada para a Tabela Única.
 */
function gerarLinhasTabelaUnica(sitesSytex, mapaChamados, mapaDiagramas) {
  const linhas = [];
  const totais = {
    brisanet: 0,
    fiberhome: 0,
    outros: 0,
    comDiagrama: 0,
    semDiagrama: 0
  };

  // Itera sobre os sites validados do Sytex
  for (let i = 0; i < sitesSytex.length; i++) {
    const site = sitesSytex[i];

    // Regra: O site deve existir no Sytex E possuir chamado finalizado na planilha de Integrações
    if (!mapaChamados[site]) continue;

    const chamado = mapaChamados[site];
    const diag = mapaDiagramas[site] || {};

    const dataFinalizacao = chamado.dataFinalizacao || '';
    const categoria = diag.categoria || 'Tecnologia';
    const codigoSite = site;
    const vendor = chamado.vendor || '';
    const integrador = chamado.integrador || '';
    const ticket = chamado.chamado || '';
    const projeto = diag.projeto || '';
    const maoDeObra = diag.maoDeObra || '';
    const servTerc = diag.servTerc || '';
    const situacao = (maoDeObra || servTerc) ? 'OK' : 'Pendente';

    // Contadores para o resumo
    if (integrador.includes('BRISANET')) totais.brisanet++;
    else if (integrador.includes('FIBERHOME')) totais.fiberhome++;
    else totais.outros++;

    if (maoDeObra || servTerc) totais.comDiagrama++;
    else totais.semDiagrama++;

    linhas.push([
      dataFinalizacao, // Col 1 (A): Data de Finalização
      categoria,       // Col 2 (B): Frente / Categoria
      codigoSite,      // Col 3 (C): Código do Site
      vendor,          // Col 4 (D): Vendor
      integrador,      // Col 5 (E): Integrador
      ticket,          // Col 6 (F): Chamado / Ticket
      projeto,         // Col 7 (G): Projeto
      maoDeObra,       // Col 8 (H): Mão de Obra (Diagrama)
      servTerc,        // Col 9 (I): Serviço Terceiro (Diagrama)
      situacao         // Col 10 (J): Situação do Diagrama
    ]);
  }

  return { linhas, totais };
}

/**
 * Renderiza o Banner de Título (Linha 1), os Cartões Indicadores (Linhas 2 e 3),
 * o Cabeçalho Oficial (Linha 4) e o corpo de dados da Tabela Única (Linha 5 em diante).
 */
function gravarTabelaUnicaNaAba(planDestino, linhasDados, nomeAba, totais) {
  // 1. Limpa completamente as linhas 1 a 4 para eliminar resíduos de textos antigos
  planDestino.getRange(1, 1, 4, 10).clear({ contentsOnly: true, formatOnly: true });

  // 2. Banner de Título Superior na Linha 1 (Mesclado A1:J1)
  const rangeTitulo = planDestino.getRange("A1:J1");
  rangeTitulo.merge();
  rangeTitulo.setValue(`PAINEL DE INTEGRAÇÕES & DIAGRAMAS 5G — ${nomeAba}`);
  rangeTitulo.setBackground("#0f243e");
  rangeTitulo.setFontColor("#ffffff");
  rangeTitulo.setFontWeight("bold");
  rangeTitulo.setFontSize(12);
  rangeTitulo.setHorizontalAlignment("center");

  // 3. Cartões Indicadores nas Linhas 2 e 3 com Valores Consolidados (evita #ERROR! por localidade)
  const valBrisanet = totais ? totais.brisanet : 0;
  const valFiberhome = totais ? totais.fiberhome : 0;
  const valOutros = totais ? totais.outros : 0;
  const totalGeral = (linhasDados && linhasDados.length > 0) ? linhasDados.length : 0;

  // Cartão 1: Brisanet (A2:B3)
  const c1Tit = planDestino.getRange("A2:B2");
  c1Tit.merge().setValue("🟢 Integrado por nós (Brisanet)").setFontWeight("bold").setFontSize(10).setBackground("#e2f0d9").setFontColor("#385723").setHorizontalAlignment("center");
  const c1Val = planDestino.getRange("A3:B3");
  c1Val.merge().setValue(valBrisanet).setFontWeight("bold").setFontSize(14).setBackground("#e2f0d9").setFontColor("#385723").setHorizontalAlignment("center");

  // Cartão 2: Fiberhome (C2:D3)
  const c2Tit = planDestino.getRange("C2:D2");
  c2Tit.merge().setValue("🔵 Outros Vendors (Fiberhome)").setFontWeight("bold").setFontSize(10).setBackground("#ddebf7").setFontColor("#1f4e78").setHorizontalAlignment("center");
  const c2Val = planDestino.getRange("C3:D3");
  c2Val.merge().setValue(valFiberhome).setFontWeight("bold").setFontSize(14).setBackground("#ddebf7").setFontColor("#1f4e78").setHorizontalAlignment("center");

  // Cartão 3: Demais Integradores (E2:F3)
  const c3Tit = planDestino.getRange("E2:F2");
  c3Tit.merge().setValue("🟣 Demais Integradores").setFontWeight("bold").setFontSize(10).setBackground("#f2f2f2").setFontColor("#595959").setHorizontalAlignment("center");
  const c3Val = planDestino.getRange("E3:F3");
  c3Val.merge().setValue(valOutros).setFontWeight("bold").setFontSize(14).setBackground("#f2f2f2").setFontColor("#595959").setHorizontalAlignment("center");

  // Cartão 4: Total Geral (G2:H3)
  const c4Tit = planDestino.getRange("G2:H2");
  c4Tit.merge().setValue("⚪ Total Geral do Mês").setFontWeight("bold").setFontSize(10).setBackground("#fff2cc").setFontColor("#7f6000").setHorizontalAlignment("center");
  const c4Val = planDestino.getRange("G3:H3");
  c4Val.merge().setValue(totalGeral).setFontWeight("bold").setFontSize(14).setBackground("#fff2cc").setFontColor("#7f6000").setHorizontalAlignment("center");

  // Cartão 5: Referência (I2:J3)
  const c5Tit = planDestino.getRange("I2:J2");
  c5Tit.merge().setValue("📅 Referência").setFontWeight("bold").setFontSize(10).setBackground("#eaecf0").setFontColor("#333333").setHorizontalAlignment("center");
  const c5Val = planDestino.getRange("I3:J3");
  c5Val.merge().setValue(nomeAba).setFontWeight("bold").setFontSize(14).setBackground("#eaecf0").setFontColor("#333333").setHorizontalAlignment("center");

  // 4. Cabeçalho Oficial das 10 Colunas na Linha 4 (A4:J4)
  const cabecalhos = [
    'Data de Finalização',
    'Frente / Categoria',
    'Código do Site',
    'Vendor',
    'Integrador',
    'Chamado / Ticket',
    'Projeto',
    'Mão de Obra (Diagrama)',
    'Serviço Terceiro (Diagrama)',
    'Situação do Diagrama'
  ];

  const rangeCabecalho = planDestino.getRange(CONFIG.linhaCabecalho, 1, 1, 10);
  rangeCabecalho.setValues([cabecalhos]);
  rangeCabecalho.setBackground('#1f4e78');
  rangeCabecalho.setFontColor('#ffffff');
  rangeCabecalho.setFontWeight('bold');
  rangeCabecalho.setHorizontalAlignment('center');

  // 5. Limpa os dados antigos a partir da linha 5
  const maxLinhas = Math.max(planDestino.getLastRow(), 50);
  if (maxLinhas >= CONFIG.linhaDadosInicial) {
    planDestino.getRange(CONFIG.linhaDadosInicial, 1, maxLinhas - CONFIG.linhaDadosInicial + 1, 10).clear({ contentsOnly: true });
  }

  // 6. Grava os novos dados conciliados (se houver)
  if (linhasDados && linhasDados.length > 0) {
    const rangeDados = planDestino.getRange(CONFIG.linhaDadosInicial, 1, linhasDados.length, 10);
    rangeDados.setValues(linhasDados);
    rangeDados.setHorizontalAlignment('center');

    planDestino.getRange(CONFIG.linhaDadosInicial, 1, linhasDados.length, 1).setHorizontalAlignment('center');
    planDestino.getRange(CONFIG.linhaDadosInicial, 3, linhasDados.length, 1).setFontWeight('bold');
    planDestino.getRange(CONFIG.linhaDadosInicial, 7, linhasDados.length, 1).setHorizontalAlignment('left');
  }
}

// ============================================================================
// FUNÇÕES AUXILIARES E UTILITÁRIOS
// ============================================================================

/**
 * Remove ponto e números subsequentes de códigos de sites (ex.: "BCE0007.1" ➔ "BCE0007").
 */
function higienizarCodigoSite(codigoBruto) {
  if (!codigoBruto) return '';
  return codigoBruto.toString().trim().replace(/\.\d+.*$/, '').toUpperCase();
}

/**
 * Identifica a planilha e aba ativa (ou padrão) e extrai o mês/ano.
 */
function obterPlanilhaDestinoEAba(spreadsheet) {
  let ss = spreadsheet;
  if (!ss && CONFIG.idDestino) {
    ss = SpreadsheetApp.openById(CONFIG.idDestino);
  } else if (!ss) {
    ss = SpreadsheetApp.getActiveSpreadsheet();
  }

  const abaAtiva = ss.getActiveSheet();
  const nomeAbaAtiva = abaAtiva.getName();
  const mesAnoAtivo = extrairMesAnoAba(nomeAbaAtiva);

  if (mesAnoAtivo) {
    return { planDestino: abaAtiva, nomeAba: nomeAbaAtiva, mesInfo: mesAnoAtivo };
  }

  const planPadrao = ss.getSheetByName(CONFIG.abaDestinoPadrao);
  if (planPadrao) {
    const mesAnoPadrao = extrairMesAnoAba(CONFIG.abaDestinoPadrao);
    return { planDestino: planPadrao, nomeAba: CONFIG.abaDestinoPadrao, mesInfo: mesAnoPadrao };
  }

  return { planDestino: abaAtiva, nomeAba: nomeAbaAtiva, mesInfo: null };
}

/**
 * Converte valor variado para objeto Date.
 */
function extrairData(valor) {
  if (!valor) return null;
  if (valor instanceof Date) return isNaN(valor.getTime()) ? null : valor;
  if (typeof valor === 'number') {
    return new Date(Math.round((valor - 25569) * 86400 * 1000));
  }
  if (typeof valor === 'string') {
    const str = valor.trim();
    const ddmmyyyy = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
    if (ddmmyyyy) {
      let dia = parseInt(ddmmyyyy[1], 10);
      let mes = parseInt(ddmmyyyy[2], 10) - 1;
      let ano = parseInt(ddmmyyyy[3], 10);
      if (ano < 100) ano += 2000;
      return new Date(ano, mes, dia);
    }
    const iso = str.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
    if (iso) {
      return new Date(parseInt(iso[1], 10), parseInt(iso[2], 10) - 1, parseInt(iso[3], 10));
    }
    const parsed = new Date(str);
    if (!isNaN(parsed.getTime())) return parsed;
  }
  return null;
}

/**
 * Formata data no padrão brasileiro DD/MM/YYYY.
 */
function formatarDataBR(data) {
  if (!data || !(data instanceof Date)) return '';
  const d = String(data.getDate()).padStart(2, '0');
  const m = String(data.getMonth() + 1).padStart(2, '0');
  const y = data.getFullYear();
  return `${d}/${m}/${y}`;
}

/**
 * Identifica mês e ano a partir do nome da aba (ex.: "NOV/2026", "11/2026", "Novembro 2026").
 */
function extrairMesAnoAba(nomeAba) {
  if (!nomeAba) return null;
  const mapaMeses = {
    'jan': { idx: 0, nome: 'JANEIRO' },
    'fev': { idx: 1, nome: 'FEVEREIRO' },
    'mar': { idx: 2, nome: 'MARÇO' },
    'abr': { idx: 3, nome: 'ABRIL' },
    'mai': { idx: 4, nome: 'MAIO' },
    'jun': { idx: 5, nome: 'JUNHO' },
    'jul': { idx: 6, nome: 'JULHO' },
    'ago': { idx: 7, nome: 'AGOSTO' },
    'set': { idx: 8, nome: 'SETEMBRO' },
    'out': { idx: 9, nome: 'OUTUBRO' },
    'nov': { idx: 10, nome: 'NOVEMBRO' },
    'dez': { idx: 11, nome: 'DEZEMBRO' }
  };

  const limpo = normalizarTexto(nomeAba);
  for (const [chave, info] of Object.entries(mapaMeses)) {
    if (limpo.includes(chave)) {
      const matchAno = limpo.match(/\b(20\d\d)\b/);
      const ano = matchAno ? parseInt(matchAno[1], 10) : new Date().getFullYear();
      return { mesIndex: info.idx, ano: ano, chave: chave.toUpperCase(), nomeMes: info.nome };
    }
  }

  const matchNum = limpo.match(/(\d{1,2})\s*[\/_-]\s*(20\d\d)/);
  if (matchNum) {
    const mesNum = parseInt(matchNum[1], 10);
    if (mesNum >= 1 && mesNum <= 12) {
      const chaves = Object.keys(mapaMeses);
      const chave = chaves[mesNum - 1];
      return { mesIndex: mesNum - 1, ano: parseInt(matchNum[2], 10), chave: chave.toUpperCase(), nomeMes: mapaMeses[chave].nome };
    }
  }

  return null;
}

/**
 * Normaliza strings removendo acentos e convertendo para minúsculas.
 */
function normalizarTexto(texto) {
  if (texto === null || texto === undefined) return '';
  return texto.toString().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}
