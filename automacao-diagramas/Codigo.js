/**
 * ============================================================================
 * AUTOMAÇÃO DE INTEGRAÇÕES & DIAGRAMAS 5G — BRISANET TELECOMUNICAÇÕES
 * Módulo: Tabela Única Consolidada, Conciliação Sytex e Matriz de Diagramas
 * ============================================================================
 */

// ============================================================================
// CONFIGURAÇÃO GLOBAL E IDs OFICIAIS
// ============================================================================
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
  idOrigemIntegracao: '1_DW_lJl0wsgXrjnJOEhD1vo-tLDzvTnE8u-fUIhhwK4',
  gidOrigemIntegracao: '1755873954',
  abaOrigemIntegracao: 'INTEGRAÇÃO DE SITES',
  linhaCabecalhoIntegracao: 2, // Cabeçalhos na linha 2; dados na linha 3 em diante
  colIntegracaoSite: 0,        // Coluna A: SITE
  colIntegracaoStatus: 2,      // Coluna C: STATUS (CONCLUIDO, EM ATENDIMENTO)
  colIntegracaoVendor: 5,      // Coluna F: VENDOR (HUAWEI, FIBERHOME, etc.)
  colIntegracaoReport: 11,     // Coluna L: REPORT / INTEGRADOR (BRISANET, FIBERHOME)
  colIntegracaoDataFim: 15,    // Coluna P: CHAMADO FINALIZADO (Data)
  colIntegracaoHoraFim: 16,    // Coluna Q: HORA DE FINALIZAÇÃO
  colIntegracaoMes: 18,        // Coluna S: MÊS (JANEIRO, FEVEREIRO, ..., OUTUBRO)
  colIntegracaoAno: 19,        // Coluna T: ANO (2026)

  // 4. Planilha Oficial de Diagramas 5G (Mapeamento Multi-Estados / Multi-Colunas)
  idOrigemDiagramas: '1fd5sieHnEMixKJh8T7qYNwZfecL453cGqqkYl41VdaA',
  gidOrigemDiagramas: '1306115678',
  abaOrigemDiagramas: 'Diagramas - 5G'
};

// ============================================================================
// MENU PERSONALIZADO (ONOPEN)
// ============================================================================
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('🔄 Automação 5G')
    .addItem('🚀 Sincronizar Tudo (Sytex + Diagramas)', 'executarSincronizacaoCompleta')
    .addSeparator()
    .addItem('📡 Testar Conexão com Sytex (API)', 'testarConexaoSytexMenu')
    .addItem('📋 Conciliar Apenas Integrações', 'conciliarChamadosMenu')
    .addItem('🗺️ Atualizar Apenas Diagramas', 'atualizarDiagramasMenu')
    .addSeparator()
    .addItem('⚙️ Configurar Acesso Sytex', 'configurarCredenciaisSytexMenu')
    .addToUi();
}

// ============================================================================
// FLUXO PRINCIPAL: SINCRONIZAÇÃO COMPLETA
// ============================================================================
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

    // 2. Extrai e filtra chamados da planilha de Integrações para o mês (1 linha por chamado)
    spreadsheet.toast('Carregando chamados de Integração de Sites...', 'Etapa 2/4', -1);
    const chamadosIntegracao = carregarChamadosIntegracao(mesInfo);
    const totalChamadosMes = chamadosIntegracao.length;

    // 3. Extrai lista de sites únicos para varredura multi-colunas na aba de diagramas
    const sitesAlvo = Array.from(new Set(chamadosIntegracao.map(ch => ch.site)));
    spreadsheet.toast(`Buscando diagramas de Tecnologia para ${sitesAlvo.length} sites...`, 'Etapa 3/4', -1);
    const mapaDiagramas = carregarMapaHierarquiaDiagramas(sitesAlvo);

    // 4. Cruza os chamados, aplica o filtro de Tecnologia e gera as 10 colunas
    spreadsheet.toast('Conciliando dados e gerando tabela unificada...', 'Etapa 4/4', -1);
    const resultado = gerarLinhasTabelaUnica(chamadosIntegracao, mapaDiagramas, sitesSytex);

    // 5. Grava a tabela e atualiza os cartões de indicadores
    gravarTabelaUnicaNaAba(planDestino, resultado.linhas, destinoInfo.nomeAba, resultado.totais);

    spreadsheet.toast('Sincronização finalizada com sucesso!', 'Concluído', 5);

    const periodoStr = `${mesInfo.chave}/${mesInfo.ano}`;

    if (totalChamadosMes === 0) {
      const msgVazio = `⚠️ Nenhum chamado foi encontrado na planilha de Integrações para o período "${periodoStr}".\n\n` +
        `• Sites retornados pelo Sytex: ${sitesSytex.length}\n` +
        `• Chamados finalizados em ${periodoStr}: 0\n\n` +
        `💡 DICA:\nNa planilha oficial 'INTEGRAÇÃO DE SITES', os chamados cadastrados atualmente vão até OUTUBRO/2026.\n` +
        `Para testar a tabela preenchida com dados reais, abra a aba OUT/2026 e execute a sincronização!`;

      ui.alert('Aviso de Dados do Mês', msgVazio, ui.ButtonSet.OK);
      return;
    }

    // Relatório visual final de sucesso
    const msg = `✅ Sincronização Concluída com Sucesso!\n\n` +
      `📍 Aba de Destino: ${destinoInfo.nomeAba} (${periodoStr})\n` +
      `• Total de chamados no mês (1 linha por chamado): ${resultado.linhas.length}\n` +
      `• Sites únicos envolvidos: ${sitesAlvo.length}\n` +
      `• Sites ativos validados no Sytex (.xlsx): ${sitesSytex.length}\n\n` +
      `📊 Distribuição por Integrador:\n` +
      `   • BRISANET: ${resultado.totais.brisanet} chamados\n` +
      `   • FIBERHOME: ${resultado.totais.fiberhome} chamados\n` +
      `   • Outros/Demais: ${resultado.totais.outros} chamados\n\n` +
      `🗺️ Diagramas de Mão de Obra (Tecnologia):\n` +
      `   • Diagramas vinculados com sucesso: ${resultado.totais.comDiagrama}\n` +
      `   • Pendentes de diagrama: ${resultado.totais.semDiagrama}`;

    ui.alert('✅ Sincronização 5G Concluída', msg, ui.ButtonSet.OK);

  } catch (erro) {
    ui.alert('❌ Erro na Sincronização', 'Não foi possível concluir a rotina.\n\nDetalhes: ' + erro.message, ui.ButtonSet.OK);
  }
}

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

function conciliarChamadosMenu() {
  executarSincronizacaoCompleta();
}

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

    const rangeSites = planDestino.getRange(`C${CONFIG.linhaDadosInicial}:C${maxLinhas}`);
    const sites = rangeSites.getValues();
    const sitesAlvo = sites.map(s => higienizarCodigoSite(s[0])).filter(s => s.length > 0);

    const mapaDiagramas = carregarMapaHierarquiaDiagramas(sitesAlvo);
    const rangeColsDiagramas = planDestino.getRange(`G${CONFIG.linhaDadosInicial}:J${maxLinhas}`);
    const dadosDiagExistentes = rangeColsDiagramas.getValues();

    let atualizados = 0;
    for (let i = 0; i < sites.length; i++) {
      const site = higienizarCodigoSite(sites[i][0]);
      if (site && mapaDiagramas[site]) {
        const d = mapaDiagramas[site];
        dadosDiagExistentes[i][0] = d.projeto || dadosDiagExistentes[i][0];   // Col G (Projeto)
        dadosDiagExistentes[i][1] = d.maoDeObra || dadosDiagExistentes[i][1]; // Col H (Mão de Obra)
        dadosDiagExistentes[i][2] = '-';                                      // Col I (Serviço Terceiro)
        dadosDiagExistentes[i][3] = d.situacao || 'OK';                      // Col J (Situação)
        atualizados++;
      }
    }

    rangeColsDiagramas.setValues(dadosDiagExistentes);
    spreadsheet.toast('Diagramas atualizados!', 'Concluído', 3);
    ui.alert('🗺️ Diagramas Atualizados', `Foram atualizados os diagramas de ${atualizados} chamados na tabela.`, ui.ButtonSet.OK);
  } catch (erro) {
    ui.alert('❌ Erro ao Atualizar Diagramas', erro.message, ui.ButtonSet.OK);
  }
}

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
function obterSitesSytexEmMemoria() {
  const usuario = CONFIG.sytexUsuario;
  const senha = obterSenhaSytex();

  if (!senha) {
    throw new Error('Senha do Sytex não configurada. Use o menu "🔄 Automação 5G > ⚙️ Configurar Acesso Sytex".');
  }

  const credenciaisBase64 = Utilities.base64Encode(`${usuario}:${senha}`);
  const opcoes = {
    method: 'GET',
    headers: {
      'Authorization': `Basic ${credenciaisBase64}`
    },
    muteHttpExceptions: true
  };

  const resposta = UrlFetchApp.fetch(CONFIG.sytexUrl, opcoes);
  const codigoStatus = resposta.getResponseCode();

  if (codigoStatus !== 200) {
    throw new Error(`Falha na requisição ao Sytex (HTTP ${codigoStatus}): ${resposta.getContentText().slice(0, 200)}`);
  }

  const blob = resposta.getBlob().setName('sytex_export_temp.xlsx');
  let tempFileId = null;

  try {
    tempFileId = converterXlsxParaGoogleSheet(blob);
    const ssTemp = SpreadsheetApp.openById(tempFileId);
    const abaTemp = ssTemp.getSheets()[0];
    const dados = abaTemp.getDataRange().getValues();

    if (dados.length <= 1) {
      return [];
    }

    let colSiteIdx = 0;
    const cabecalho = dados[0];
    for (let c = 0; c < cabecalho.length; c++) {
      const colNome = normalizarTexto(cabecalho[c]);
      if (colNome.includes('site') || colNome.includes('codigo') || colNome.includes('id site') || colNome.includes('sigla')) {
        colSiteIdx = c;
        break;
      }
    }

    const sitesEncontrados = new Set();
    for (let r = 1; r < dados.length; r++) {
      const valorCelula = dados[r][colSiteIdx];
      if (valorCelula !== undefined && valorCelula !== null && valorCelula !== '') {
        const siteHigienizado = higienizarCodigoSite(valorCelula);
        if (siteHigienizado.length >= 3) {
          sitesEncontrados.add(siteHigienizado);
        }
      }
    }

    return Array.from(sitesEncontrados);

  } finally {
    if (tempFileId) {
      try {
        DriveApp.getFileById(tempFileId).setTrashed(true);
      } catch (e) {
        console.warn('Não foi possível remover arquivo temporário: ' + e.message);
      }
    }
  }
}

function converterXlsxParaGoogleSheet(blob) {
  const metadata = {
    title: 'temp_sytex_conversion_' + new Date().getTime(),
    mimeType: 'application/vnd.google-apps.spreadsheet'
  };

  const boundary = '-------314159265358979323846';
  const delimiter = '\r\n--' + boundary + '\r\n';
  const closeDelim = '\r\n--' + boundary + '--';

  const base64Data = Utilities.base64Encode(blob.getBytes());
  const multipartRequestBody =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    'Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet\r\n' +
    'Content-Transfer-Encoding: base64\r\n\r\n' +
    base64Data +
    closeDelim;

  const url = 'https://www.googleapis.com/upload/drive/v2/files?uploadType=multipart&convert=true';

  const resposta = UrlFetchApp.fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + ScriptApp.getOAuthToken(),
      'Content-Type': 'multipart/related; boundary=' + boundary
    },
    payload: multipartRequestBody,
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
// MÓDULO 2: PROCESSAMENTO DA PLANILHA DE INTEGRAÇÕES (1 LINHA POR CHAMADO)
// ============================================================================
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
    return [];
  }

  const chamados = [];
  const mesAlvoNorm = normalizarTexto(mesInfo.nomeMes);
  const anoAlvoStr = String(mesInfo.ano);

  // Varre a partir da linha 3 (índice 2)
  for (let r = CONFIG.linhaCabecalhoIntegracao; r < dados.length; r++) {
    const linha = dados[r];
    const siteRaw = linha[CONFIG.colIntegracaoSite];
    const statusRaw = (linha[CONFIG.colIntegracaoStatus] || '').toString().trim().toUpperCase();
    const vendorRaw = (linha[CONFIG.colIntegracaoVendor] || '').toString().trim().toUpperCase();
    const reportRaw = (linha[CONFIG.colIntegracaoReport] || '').toString().trim().toUpperCase();
    const dataRaw = linha[CONFIG.colIntegracaoDataFim];
    const mesColRaw = linha[CONFIG.colIntegracaoMes];
    const anoColRaw = linha[CONFIG.colIntegracaoAno];

    if (!siteRaw) continue;

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

    // Inclui chamados que pertencem ao mês ativo
    if (pertenceAoMes) {
      const siteLimpo = higienizarCodigoSite(siteRaw);
      const dataFormatada = dataFinalizadaObj ? formatarDataBR(dataFinalizadaObj) : String(dataRaw);

      chamados.push({
        linhaOrigem: r + 1,
        site: siteLimpo,
        siteOriginal: String(siteRaw).trim(),
        status: statusRaw,
        vendor: vendorRaw,
        integrador: reportRaw || 'BRISANET',
        dataFinalizacao: dataFormatada,
        chamado: `TK-${siteLimpo}-${mesInfo.ano}-${r + 1}`
      });
    }
  }

  return chamados;
}

// ============================================================================
// MÓDULO 3: MAPEAMENTO MULTI-COLUNAS DE DIAGRAMAS 5G (FOCO EM TECNOLOGIA)
// ============================================================================
function carregarMapaHierarquiaDiagramas(sitesAlvoList) {
  const ss = SpreadsheetApp.openById(CONFIG.idOrigemDiagramas);
  let aba = ss.getSheetByName(CONFIG.abaOrigemDiagramas);

  if (!aba && CONFIG.gidOrigemDiagramas) {
    const abas = ss.getSheets();
    for (let i = 0; i < abas.length; i++) {
      if (abas[i].getSheetId().toString() === CONFIG.gidOrigemDiagramas.toString()) {
        aba = abas[i];
        break;
      }
    }
  }
  if (!aba) aba = ss.getSheets()[0];

  const mapa = {};
  const sitesPendentes = new Set((sitesAlvoList || []).map(s => higienizarCodigoSite(s)));
  const totalColsAba = aba.getLastColumn();
  const maxLinhasAba = aba.getLastRow();

  // A aba Diagramas - 5G é dividida em grupos horizontais de 4 colunas por Estado (CE, RN, PB, PI, PE, BA, SE, MA, AL, MS, GO...)
  // Cada grupo possui: Subcol 0 (Cidade/Torre), Subcol 1 (Descrição), Subcol 2 (Código Diagrama)
  for (let c = 1; c <= totalColsAba; c += 4) {
    if (sitesPendentes.size === 0) break; // Interrompe se todos os sites já foram encontrados

    const numLinhas = Math.min(maxLinhasAba, 75000);
    const dadosGrupo = aba.getRange(1, c, numLinhas, 3).getValues();

    let projetoAtual = '';
    let sobTecnologia = false;

    for (let r = 0; r < dadosGrupo.length; r++) {
      const col0 = (dadosGrupo[r][0] || '').toString().trim();
      const col1 = (dadosGrupo[r][1] || '').toString().trim();
      const col2 = (dadosGrupo[r][2] || '').toString().trim();

      if (!col0 && !col1 && !col2) continue;

      const col0Lower = normalizarTexto(col0);
      const col1Lower = normalizarTexto(col1);

      // 1. Detecta cabeçalho de Torre no grupo (ex: WL_PI-CPI0003-PI-CPI100-BRIT)
      const ehFilha = col1Lower.includes('mão de obra') || col1Lower.includes('mao de obra') ||
                      col1Lower.includes('serv') || col1Lower.includes('materiais') ||
                      col1Lower.includes('regulariz') || col1Lower.includes('postes');

      const ehCabecalhoTorre = (col0Lower === 'torre' || col0Lower.includes('torre')) ||
                               (!ehFilha && (col1Lower.startsWith('wl_') || (col1Lower.startsWith('torre') && !col1Lower.includes('torre 5g -'))));

      if (ehCabecalhoTorre && !ehFilha) {
        projetoAtual = col1;
        sobTecnologia = false;
      }

      // 2. Detecta início ou término da seção de Tecnologia
      if (col1Lower.startsWith('tecnologia') || (col1Lower.includes('tecnologia') && !ehFilha)) {
        sobTecnologia = true;
      } else if (
        col1Lower.startsWith('montagem') || col1Lower.includes('m.torre') || col1Lower.startsWith('infra') || 
        col1Lower.startsWith('projetos') || col1Lower.startsWith('cabeamento') || col1Lower.startsWith('regulariz') || 
        col1Lower.startsWith('terreno') || col1Lower.startsWith('instalacao') || col1Lower.startsWith('implantacao') ||
        col1Lower.startsWith('auditoria') || col1Lower.startsWith('ciap') || col1Lower.startsWith('redes moveis')
      ) {
        sobTecnologia = false;
      }

      // 3. Procura EXCLUSIVAMENTE a linha de Mão de Obra de Tecnologia (ignora M.torre, Civil, FTTH, etc.)
      const ehMaoDeObra = col1Lower.includes('mão de obra') || col1Lower.includes('mao de obra');
      const ehOutraCategoria = col1Lower.includes('m.torre') || col1Lower.includes('civil') || col1Lower.includes('eletrica') || 
                               col1Lower.includes('ftth') || col1Lower.includes('redes') || col1Lower.includes('moveis') || 
                               col1Lower.includes('cf') || col1Lower.includes('aud') || col1Lower.includes('cad');

      if (ehMaoDeObra && !ehOutraCategoria) {
        const ehTecnologia = col1Lower.includes('tec') || sobTecnologia;
        if (ehTecnologia) {
          const site = extrairSiteDaDescricao(col1) || extrairSiteDaDescricao(projetoAtual);
          if (site && col2) {
            const diagCod = col2.replace(/\.0$/, '');
            // Se ainda não salvou este site, ou se este registro tem 'tecnologia' explícito na descrição
            if (!mapa[site] || col1Lower.includes('tecnologia') || col1Lower.includes('tec')) {
              mapa[site] = {
                site: site,
                projeto: projetoAtual,
                categoria: 'Tecnologia',
                maoDeObra: diagCod,
                situacao: 'OK'
              };
              sitesPendentes.delete(site);
            }
          }
        }
      }
    }
  }

  return mapa;
}

function extrairSiteDaDescricao(texto) {
  if (!texto) return '';
  const match = texto.match(/(?:^|[^A-Za-z0-9])([A-Z]{2,5}\d{2,5})(?=[^A-Za-z0-9]|$)/i);
  return match ? match[1].toUpperCase() : '';
}

// ============================================================================
// MÓDULO 4: CONCILIAÇÃO E MONTAGEM DA TABELA ÚNICA (10 COLUNAS)
// ============================================================================
function gerarLinhasTabelaUnica(chamadosIntegracao, mapaDiagramas, sitesSytex) {
  const linhas = [];
  const totais = {
    brisanet: 0,
    fiberhome: 0,
    outros: 0,
    comDiagrama: 0,
    semDiagrama: 0
  };

  const setSitesSytex = new Set((sitesSytex || []).map(s => higienizarCodigoSite(s)));

  for (let i = 0; i < chamadosIntegracao.length; i++) {
    const ch = chamadosIntegracao[i];
    const diag = mapaDiagramas[ch.site] || {};

    const dataFinalizacao = ch.dataFinalizacao || '';
    const categoria = 'Tecnologia'; // Foco exclusivo em Tecnologia
    const codigoSite = ch.site;
    const vendor = ch.vendor || '';
    const integrador = ch.integrador || '';
    const ticket = ch.chamado || '';
    const projeto = diag.projeto || '-';
    const maoDeObra = diag.maoDeObra || '-';
    const servTerc = '-'; // Foco em Mão de Obra
    const situacao = diag.maoDeObra ? 'OK' : 'Pendente';

    // Contadores para o resumo nos cartões
    if (integrador.includes('BRISANET')) totais.brisanet++;
    else if (integrador.includes('FIBERHOME')) totais.fiberhome++;
    else totais.outros++;

    if (diag.maoDeObra) totais.comDiagrama++;
    else totais.semDiagrama++;

    linhas.push([
      dataFinalizacao, // Col 1 (A): Data de Finalização
      categoria,       // Col 2 (B): Frente / Categoria (Tecnologia)
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

function gravarTabelaUnicaNaAba(planDestino, linhasDados, nomeAba, totais) {
  // 1. Limpa completamente linhas 1 a 4 para eliminar resíduos de textos antigos
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

  // 3. Cartões Indicadores nas Linhas 2 e 3 com Valores Numéricos (imune a incompatibilidade de idioma/locale)
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
function higienizarCodigoSite(codigoBruto) {
  if (!codigoBruto) return '';
  return codigoBruto.toString().trim().replace(/\.\d+.*$/, '').toUpperCase();
}

function normalizarTexto(texto) {
  if (!texto) return '';
  return texto.toString().trim().toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

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

  let abaPadrao = ss.getSheetByName(CONFIG.abaDestinoPadrao);
  if (!abaPadrao) {
    abaPadrao = abaAtiva;
  }

  const mesAnoPadrao = extrairMesAnoAba(abaPadrao.getName()) || {
    mesIndex: 9,
    ano: 2026,
    chave: 'OUT',
    nomeMes: 'OUTUBRO'
  };

  return { planDestino: abaPadrao, nomeAba: abaPadrao.getName(), mesInfo: mesAnoPadrao };
}

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

function formatarDataBR(data) {
  if (!data || !(data instanceof Date)) return '';
  const d = String(data.getDate()).padStart(2, '0');
  const m = String(data.getMonth() + 1).padStart(2, '0');
  const y = data.getFullYear();
  return `${d}/${m}/${y}`;
}

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

  const matchNum = limpo.match(/\b(0?[1-9]|1[0-2])[\/\-](20\d\d)\b/);
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
