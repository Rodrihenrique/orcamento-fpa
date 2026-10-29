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
  colIntegracaoResponsavel: 20, // Coluna U: RESPONSÁVEL PELA INTEGRAÇÃO (IRINEU, BRUNO, CICERO REIS, VINÍCIUS, HUAWEI)

  // 4. Planilha Oficial de Diagramas 5G (Mapeamento Multi-Estados / Multi-Colunas)
  idOrigemDiagramas: '1fd5sieHnEMixKJh8T7qYNwZfecL453cGqqkYl41VdaA',
  gidOrigemDiagramas: '1306115678',
  abaOrigemDiagramas: 'Diagramas - 5G',

  // 5. Planilha Oficial de Projetos Ativos (Validação da Situação do Diagrama: Ativo vs Aberto)
  idOrigemProjetosAtivos: '1wttzUGyQy0xzfNM4t7-8hQBlzIM2V3QUH0DpW5vkuuQ',
  gidOrigemProjetosAtivos: '2007443937',
  abaOrigemProjetosAtivos: '5G ok'
};

// ============================================================================
// MENU PERSONALIZADO (ONOPEN)
// ============================================================================
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('🔄 Automação 5G')
    .addItem('🚀 Sincronizar Tudo (Sytex + Diagramas)', 'executarSincronizacaoCompleta')
    .addSeparator()
    .addItem('📥 Baixar e Salvar Relatório Sytex no Google Drive', 'salvarRelatorioCompletoSytexNoDriveMenu')
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

    // 1. Obtém e higieniza a lista de sites ATIVOS do Sytex (.xlsx)
    spreadsheet.toast('Baixando dados do Sytex via API...', 'Etapa 1/5', -1);
    const resSytex = obterSitesSytexEmMemoria(mesInfo);
    const mapaSytex = resSytex.mapaSitesSytex || resSytex;
    const mapaStatusGeralSytex = resSytex.mapaStatusGeralSytex || {};
    const sitesSytexList = Object.keys(mapaSytex);

    // 2. Extrai chamados da planilha de Integrações para o mês (validados estritamente com Sytex Ativo e Concluídos)
    spreadsheet.toast('Carregando chamados de Integração de Sites...', 'Etapa 2/5', -1);
    const resIntegracao = carregarChamadosIntegracao(mesInfo, mapaSytex);
    const chamadosIntegracao = resIntegracao.chamadosMes || [];
    const mapaGeralIntegracao = resIntegracao.mapaGeralPorSite || {};
    const totalChamadosPlanilha = chamadosIntegracao.length;

    // 2.1 Identifica sites ATIVOS do Sytex que NÃO estão na lista de chamados do mês
    const sitesNaIntegracao = new Set(chamadosIntegracao.map(ch => extrairCodigoSiteCanonico(ch.site)));
    const sitesFaltantesNoIntegracao = [];

    for (let s = 0; s < sitesSytexList.length; s++) {
      const siteSytex = extrairCodigoSiteCanonico(sitesSytexList[s]);
      if (!sitesNaIntegracao.has(siteSytex)) {
        sitesFaltantesNoIntegracao.push(siteSytex);
      }
    }

    // 2.2 Adiciona os sites do Sytex que não estavam na lista do mês:
    // Se o site existir na Planilha de Integração (em qualquer linha), recupera Responsável, Vendor e Integrador!
    // Se REALMENTE não existir na Planilha de Integração, marca Integrador = 'NÃO ENCONTRADO'
    for (let f = 0; f < sitesFaltantesNoIntegracao.length; f++) {
      const siteFaltante = sitesFaltantesNoIntegracao[f];
      const infoSytex = mapaSytex[siteFaltante] || {};
      const infoGeral = mapaGeralIntegracao[siteFaltante];

      if (infoGeral) {
        // Encontrado na Planilha de Integração! (ex.: ITN0004, SFM0004)
        chamadosIntegracao.push({
          linhaOrigem: infoGeral.linhaOrigem || 'Integração (Geral)',
          site: siteFaltante,
          siteOriginal: infoGeral.siteOriginal || siteFaltante,
          status: infoGeral.status || 'CONCLUIDO',
          vendor: infoGeral.vendor || '-',
          integrador: infoGeral.integrador, // 'BRISANET' ou 'HUAWEI' conforme o responsável
          responsavel: infoGeral.responsavel || 'NÃO INFORMADO',
          dataFinalizacao: infoGeral.dataFinalizacao || infoSytex.data || '',
          chamado: `TK-${siteFaltante}-${mesInfo.ano}-RECUPERADO`
        });
      } else {
        // Realmente NÃO ENCONTRADO em nenhuma linha da Planilha de Integração
        chamadosIntegracao.push({
          linhaOrigem: 'Sytex',
          site: siteFaltante,
          siteOriginal: siteFaltante,
          status: 'CONCLUIDO',
          vendor: '-',
          integrador: 'NÃO ENCONTRADO',
          responsavel: 'NÃO ENCONTRADO',
          dataFinalizacao: infoSytex.data || '',
          chamado: `TK-${siteFaltante}-${mesInfo.ano}-SYTEX`
        });
      }
    }

    // 3. Extrai lista de sites únicos para varredura multi-colunas na aba de diagramas
    const sitesAlvo = Array.from(new Set(chamadosIntegracao.map(ch => ch.site)));
    spreadsheet.toast(`Buscando diagramas de Tecnologia para ${sitesAlvo.length} sites...`, 'Etapa 3/5', -1);
    const mapaDiagramas = carregarMapaHierarquiaDiagramas(sitesAlvo);

    // 4. Carrega a lista de Projetos Ativos da aba '5G ok'
    spreadsheet.toast('Consultando Projetos Ativos na aba 5G ok...', 'Etapa 4/5', -1);
    const infoProjetosAtivos = carregarProjetosAtivos5GOk();

    // 5. Cruza os chamados, aplica o filtro de Tecnologia e gera as 9 colunas (sem Chamado/Ticket)
    spreadsheet.toast('Conciliando dados e gerando tabela unificada...', 'Etapa 5/5', -1);
    const resultado = gerarLinhasTabelaUnica(chamadosIntegracao, mapaDiagramas, mapaSytex, infoProjetosAtivos);

    // 6. Grava a tabela e atualiza os cartões de indicadores
    gravarTabelaUnicaNaAba(planDestino, resultado.linhas, destinoInfo.nomeAba, resultado.totais);

    spreadsheet.toast('Sincronização finalizada com sucesso!', 'Concluído', 5);

    const periodoStr = `${mesInfo.chave}/${mesInfo.ano}`;

    if (totalChamadosPlanilha === 0 && sitesFaltantesNoIntegracao.length === 0) {
      const msgVazio = `⚠️ Nenhum chamado foi encontrado na planilha de Integrações para o período "${periodoStr}".\n\n` +
        `• Sites retornados pelo Sytex: ${sitesSytexList.length}\n` +
        `• Chamados finalizados em ${periodoStr}: 0\n\n` +
        `💡 DICA:\nNa planilha oficial 'INTEGRAÇÃO DE SITES', os chamados cadastrados atualmente vão até OUTUBRO/2026.\n` +
        `Para testar a tabela preenchida com dados reais, abra a aba OUT/2026 e execute a sincronização!`;

      ui.alert('Aviso de Dados do Mês', msgVazio, ui.ButtonSet.OK);
      return;
    }

    // Relatório visual final de sucesso
    const msg = `✅ Sincronização Concluída com Sucesso!\n\n` +
      `📍 Aba de Destino: ${destinoInfo.nomeAba} (${periodoStr})\n` +
      `• Total de registros gravados: ${resultado.linhas.length}\n` +
      `• Chamados da Planilha de Integrações: ${totalChamadosPlanilha}\n` +
      `• Sites ativos no Sytex (.xlsx): ${sitesSytexList.length}\n` +
      `• Sites do Sytex NÃO encontrados na Integração: ${sitesFaltantesNoIntegracao.length}\n\n` +
      `📊 Distribuição por Integrador:\n` +
      `   • BRISANET: ${resultado.totais.brisanet} chamados\n` +
      `   • HUAWEI: ${resultado.totais.huawei} chamados\n` +
      `   • NÃO ENCONTRADO: ${resultado.totais.naoEncontrados} chamados\n\n` +
      `🗺️ Situação dos Projetos (Validado na aba '5G ok'):\n` +
      `   • Projetos Ativos: ${resultado.totais.projetosAtivos}\n` +
      `   • Projetos Abertos: ${resultado.totais.projetosAbertos}`;

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
    const mapa = obterSitesSytexEmMemoria();
    const sites = Object.keys(mapa);
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

function salvarRelatorioCompletoSytexNoDriveMenu() {
  const ui = SpreadsheetApp.getUi();
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();

  spreadsheet.toast('Conectando à API do Sytex e baixando arquivo completo...', 'Processando', -1);

  try {
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

    const blob = resposta.getBlob();
    const dataHoraFormatada = Utilities.formatDate(new Date(), 'America/Fortaleza', 'yyyy-MM-dd_HH-mm');
    const nomePlanilha = `📊 SYTEX - Relatório Completo de Integrações (${dataHoraFormatada})`;

    // 1. Salva o arquivo Excel (.xlsx) original no Google Drive
    const arquivoXlsx = DriveApp.createFile(blob.setName(`SYTEX_Export_Original_${dataHoraFormatada}.xlsx`));

    // 2. Converte e cria a Planilha Google editável no Drive
    const fileIdGoogleSheet = converterXlsxParaGoogleSheet(blob, nomePlanilha);
    const sheetFile = DriveApp.getFileById(fileIdGoogleSheet);
    const ssSytex = SpreadsheetApp.openById(fileIdGoogleSheet);
    const abaPrincipal = ssSytex.getSheets()[0];
    const dados = abaPrincipal.getDataRange().getValues();

    // 3. Organiza nas pastas do Drive (se a planilha ativa estiver em uma pasta, move para ela)
    try {
      const activeFile = DriveApp.getFileById(spreadsheet.getId());
      const parents = activeFile.getParents();
      if (parents.hasNext()) {
        const pasta = parents.next();
        pasta.addFile(sheetFile);
        pasta.addFile(arquivoXlsx);
        DriveApp.getRootFolder().removeFile(sheetFile);
        DriveApp.getRootFolder().removeFile(arquivoXlsx);
      }
    } catch (e) {
      console.log('Arquivos mantidos na raiz do Google Drive: ' + e.message);
    }

    const urlPlanilha = sheetFile.getUrl();
    const totalLinhas = Math.max(0, dados.length - 1);
    const cabecalhos = dados.length > 0 ? dados[0] : [];

    spreadsheet.toast('Relatório do Sytex salvo no Google Drive!', 'Sucesso', 5);

    // Constrói lista formatada das colunas encontradas
    let listaColunasHtml = '';
    cabecalhos.forEach((col, idx) => {
      listaColunasHtml += `<li style="padding: 3px 0; border-bottom: 1px solid #f0f0f0;">
        <span style="display: inline-block; width: 60px; color: #1f4e78; font-weight: bold;">[Col ${idx + 1}]</span>
        <span>${col ? String(col) : '<em>(sem título)</em>'}</span>
      </li>`;
    });

    const htmlOutput = HtmlService.createHtmlOutput(`
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 13px; color: #333; padding: 5px;">
        <h3 style="color: #1f4e78; margin-top: 0; display: flex; align-items: center; gap: 8px;">
          <span>✅</span> Relatório Sytex Salvo no seu Drive!
        </h3>
        
        <p style="margin: 8px 0 14px 0; color: #555;">
          O arquivo completo com <strong>todas as colunas e registros originais</strong> foi gerado e salvo como Planilha Google no seu Drive.
        </p>

        <div style="background-color: #e8f5e9; border: 1px solid #a5d6a7; border-radius: 8px; padding: 14px; margin-bottom: 15px; text-align: center;">
          <a href="${urlPlanilha}" target="_blank" style="display: inline-block; background-color: #2e7d32; color: #ffffff; padding: 10px 18px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 13px; box-shadow: 0 2px 4px rgba(0,0,0,0.15);">
            📊 Abrir Planilha Completa do Sytex
          </a>
          <div style="margin-top: 8px; font-size: 11px; color: #43a047;">
            (Abre em uma nova aba do seu navegador)
          </div>
        </div>

        <div style="display: flex; gap: 15px; background: #f8f9fa; border: 1px solid #e9ecef; border-radius: 6px; padding: 10px 14px; margin-bottom: 15px;">
          <div><strong>Total de Linhas:</strong> ${totalLinhas} registros</div>
          <div><strong>Total de Colunas:</strong> ${cabecalhos.length} colunas</div>
        </div>

        <div style="font-weight: bold; color: #1f4e78; margin-bottom: 6px;">
          📋 Colunas Disponíveis no Relatório (${cabecalhos.length}):
        </div>
        <ul style="list-style: none; padding: 0; margin: 0; max-height: 180px; overflow-y: auto; background: #fff; border: 1px solid #ddd; border-radius: 6px; padding: 8px 12px; font-size: 12px;">
          ${listaColunasHtml}
        </ul>

        <div style="margin-top: 12px; font-size: 11px; color: #777;">
          📁 Arquivos criados no Google Drive:<br>
          • <strong>${nomePlanilha}</strong> (Google Sheets)<br>
          • <strong>SYTEX_Export_Original_${dataHoraFormatada}.xlsx</strong> (Excel)
        </div>
      </div>
    `).setWidth(600).setHeight(500);

    ui.showModalDialog(htmlOutput, '📥 Download do Relatório Sytex Concluído');

  } catch (erro) {
    ui.alert('❌ Erro ao Baixar Relatório do Sytex', erro.message, ui.ButtonSet.OK);
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
    const infoProjetosAtivos = carregarProjetosAtivos5GOk();
    const rangeColsDiagramas = planDestino.getRange(`F${CONFIG.linhaDadosInicial}:I${maxLinhas}`);
    const dadosDiagExistentes = rangeColsDiagramas.getValues();

    let atualizados = 0;
    for (let i = 0; i < sites.length; i++) {
      const site = higienizarCodigoSite(sites[i][0]);
      if (site && mapaDiagramas[site]) {
        const d = mapaDiagramas[site];
        const projNome = d.projeto || dadosDiagExistentes[i][0];
        const sit = verificarSituacaoProjeto(projNome, site, infoProjetosAtivos);

        dadosDiagExistentes[i][0] = projNome;                               // Col F (Projeto)
        dadosDiagExistentes[i][1] = d.maoDeObra || dadosDiagExistentes[i][1]; // Col G (Mão de Obra)
        dadosDiagExistentes[i][2] = '-';                                      // Col H (Serviço Terceiro)
        dadosDiagExistentes[i][3] = sit;                                      // Col I (Situação do Diagrama: Ativo vs Aberto)
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
function obterSitesSytexEmMemoria(mesInfo) {
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
      return {};
    }

    let colSiteIdx = -1;
    let colDataIdx = -1;
    let colStatusIdx = -1;
    const cabecalho = dados[0];

    for (let c = 0; c < cabecalho.length; c++) {
      const colNome = normalizarTexto(cabecalho[c]);
      if (colSiteIdx === -1 && (colNome.includes('site') || colNome.includes('codigo') || colNome.includes('id site') || colNome.includes('sigla'))) {
        colSiteIdx = c;
      }
      // Prioridade máxima para a coluna de Data de Status / Data Estado / Data Ativação
      if ((colNome.includes('data') || colNome.includes('fecha')) && (colNome.includes('status') || colNome.includes('estado') || colNome.includes('situac') || colNome.includes('ativ'))) {
        colDataIdx = c;
      }
      if (colStatusIdx === -1 && (colNome.includes('status') || colNome.includes('estado') || colNome.includes('situac'))) {
        if (!colNome.includes('data') && !colNome.includes('fecha')) {
          colStatusIdx = c;
        }
      }
    }

    if (colDataIdx === -1) {
      for (let c = 0; c < cabecalho.length; c++) {
        const colNome = normalizarTexto(cabecalho[c]);
        if (colNome.includes('data') || colNome.includes('fecha') || colNome.includes('conclus') || colNome.includes('finaliz') || colNome.includes('atend')) {
          colDataIdx = c;
          break;
        }
      }
    }

    if (colSiteIdx === -1) colSiteIdx = 0;

    const mapaSitesSytex = {};
    const mapaStatusGeralSytex = {};

    for (let r = 1; r < dados.length; r++) {
      const linha = dados[r];
      const valorCelula = linha[colSiteIdx];
      if (valorCelula !== undefined && valorCelula !== null && valorCelula !== '') {
        const siteHigienizado = higienizarCodigoSite(valorCelula);
        if (siteHigienizado.length >= 3) {
          let dataFinalObj = null;
          if (colDataIdx !== -1 && linha[colDataIdx]) {
            dataFinalObj = extrairData(linha[colDataIdx]);
          }

          let statusVal = '';
          if (colStatusIdx !== -1 && linha[colStatusIdx]) {
            statusVal = normalizarTexto(linha[colStatusIdx]);
          }

          mapaStatusGeralSytex[siteHigienizado] = statusVal;

          // Validação estrita de status: APENAS sites com status ATIVO
          // Rejeita sumariamente sites que estão Cancelado, Planejado ou Desinstalado
          const ehInvalido = statusVal && (
            statusVal.includes('cancel') || 
            statusVal.includes('planej') || 
            statusVal.includes('desinstal') || 
            statusVal.includes('rejeit') || 
            statusVal.includes('abort') ||
            statusVal.includes('desativ')
          );
          const ehAtivo = statusVal ? (statusVal.includes('ativ') || statusVal === 'ativo' || statusVal === 'activa') : false;

          if (ehInvalido || !ehAtivo) {
            continue;
          }

          // Se houver período especificado, valida o mês/ano pela data de status
          if (mesInfo) {
            if (dataFinalObj) {
              if (dataFinalObj.getFullYear() !== mesInfo.ano || dataFinalObj.getMonth() !== mesInfo.mesIndex) {
                continue;
              }
            } else if (colDataIdx !== -1) {
              // Se a coluna de data de status existe no arquivo mas está em branco para esta linha, não pertence ao mês
              continue;
            }
          }

          if (!mapaSitesSytex[siteHigienizado]) {
            mapaSitesSytex[siteHigienizado] = {
              site: siteHigienizado,
              data: dataFinalObj ? formatarDataBR(dataFinalObj) : '',
              status: statusVal
            };
          }
        }
      }
    }

    return { mapaSitesSytex, mapaStatusGeralSytex };

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

function converterXlsxParaGoogleSheet(blob, tituloPersonalizado) {
  const metadata = {
    title: tituloPersonalizado || ('temp_sytex_conversion_' + new Date().getTime()),
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
function determinarIntegrador(responsavelRaw) {
  const respNorm = normalizarTexto(responsavelRaw);

  // Se for huawei na coluna responsável -> integrador é HUAWEI
  if (respNorm.includes('huawei')) {
    return 'HUAWEI';
  }

  // Se não for Huawei -> é BRISANET independente do report ou vendor
  return 'BRISANET';
}

function carregarChamadosIntegracao(mesInfo, mapaSitesSytex) {
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
    return { chamadosMes: [], mapaGeralPorSite: {} };
  }

  const chamadosMes = [];
  const mapaGeralPorSite = {};

  // Varre a partir da linha 3 (índice 2)
  for (let r = CONFIG.linhaCabecalhoIntegracao; r < dados.length; r++) {
    const linha = dados[r];
    const siteRaw = linha[CONFIG.colIntegracaoSite];
    if (!siteRaw) continue;

    const siteCanonico = extrairCodigoSiteCanonico(siteRaw);
    if (!siteCanonico || siteCanonico.length < 3) continue;

    const statusRaw = (linha[CONFIG.colIntegracaoStatus] || '').toString().trim().toUpperCase();
    const vendorRaw = (linha[CONFIG.colIntegracaoVendor] || '').toString().trim().toUpperCase();
    const reportRaw = (linha[CONFIG.colIntegracaoReport] || '').toString().trim().toUpperCase();
    const dataRaw = linha[CONFIG.colIntegracaoDataFim];
    const responsavelRaw = (linha[CONFIG.colIntegracaoResponsavel] || '').toString().trim().toUpperCase();

    const statusNorm = normalizarTexto(statusRaw);

    const dataFinalizadaObj = extrairData(dataRaw);
    const dataFormatada = dataFinalizadaObj ? formatarDataBR(dataFinalizadaObj) : (dataRaw ? String(dataRaw) : '');
    const integradorDefinido = determinarIntegrador(responsavelRaw);

    // Validação oficial: Pela data na Coluna P (CHAMADO FINALIZADO) no mês atual
    const pertenceAoMes = verificarPertenceAoMes(dataRaw, mesInfo);

    const registroChamado = {
      linhaOrigem: r + 1,
      site: siteCanonico,
      siteOriginal: String(siteRaw).trim(),
      status: statusRaw || 'CONCLUIDO',
      vendor: vendorRaw,
      integrador: integradorDefinido,
      responsavel: responsavelRaw,
      dataFinalizacao: dataFormatada,
      pertenceAoMes: pertenceAoMes,
      chamado: `TK-${siteCanonico}-${mesInfo.ano}-${r + 1}`
    };

    // Indexa no mapa geral de todos os sites da planilha de Integração (para busca de apoio)
    // Prioriza manter a linha com responsável preenchido ou que não esteja cancelada
    const existente = mapaGeralPorSite[siteCanonico];
    if (!existente || (!existente.responsavel && responsavelRaw)) {
      mapaGeralPorSite[siteCanonico] = registroChamado;
    }

    // 1. Rejeita chamados explicitamente cancelados
    if (statusNorm.includes('cancel')) {
      continue;
    }

    // 2. Rejeita chamados que ainda estão 'EM ATENDIMENTO' ou em andamento
    // Regra oficial: apenas chamados CONCLUÍDOS entram no import
    if (statusNorm.includes('atend') || statusNorm.includes('andamento') || statusNorm.includes('planej') || statusNorm.includes('execuc')) {
      continue;
    }

    // 3. Regra de Validação Estrita com o Sytex:
    // "mesmo que na planilha esteja com data de finalização, mas no arquivo do Sytex não esteja ativo ele não deve ser importado."
    if (mapaSitesSytex && !mapaSitesSytex[siteCanonico]) {
      continue;
    }

    // 4. Se a data na Coluna P não pertencer ao mês ativo, descarta
    if (!pertenceAoMes) {
      continue;
    }

    // Adiciona à lista de chamados oficiais concluídos do mês
    chamadosMes.push(registroChamado);
  }

  return { chamadosMes, mapaGeralPorSite };
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
  return extrairCodigoSiteCanonico(texto);
}

// ============================================================================
// MÓDULO 4: VALIDAÇÃO DE SITUAÇÃO DO PROJETO NA ABA '5G ok' (ATIVO VS ABERTO)
// ============================================================================
function carregarProjetosAtivos5GOk() {
  const ss = SpreadsheetApp.openById(CONFIG.idOrigemProjetosAtivos);
  let aba = ss.getSheetByName(CONFIG.abaOrigemProjetosAtivos);

  if (!aba && CONFIG.gidOrigemProjetosAtivos) {
    const abas = ss.getSheets();
    for (let i = 0; i < abas.length; i++) {
      if (abas[i].getSheetId().toString() === CONFIG.gidOrigemProjetosAtivos.toString()) {
        aba = abas[i];
        break;
      }
    }
  }

  if (!aba) {
    aba = ss.getSheets()[0];
  }

  const dados = aba.getDataRange().getValues();
  const setProjetos = new Set();
  const setSites = new Set();

  for (let r = 0; r < dados.length; r++) {
    const celulaA = (dados[r][0] || '').toString().trim();
    if (!celulaA) continue;

    // Registra projeto original e normalizado
    setProjetos.add(celulaA.toUpperCase());
    setProjetos.add(normalizarTexto(celulaA));

    // Extrai o site do projeto (ex: WL_RN-SMU0001-... -> SMU0001)
    const siteExtraido = extrairSiteDaDescricao(celulaA);
    if (siteExtraido) {
      setSites.add(siteExtraido.toUpperCase());
    }
  }

  return { setProjetos, setSites };
}

function verificarSituacaoProjeto(projeto, site, infoProjetosAtivos) {
  if (!infoProjetosAtivos) return 'Aberto';
  const { setProjetos, setSites } = infoProjetosAtivos;

  if (projeto && projeto !== '-' && projeto.trim() !== '') {
    const projUp = projeto.trim().toUpperCase();
    const projNorm = normalizarTexto(projeto);
    if (setProjetos.has(projUp) || setProjetos.has(projNorm)) {
      return 'Ativo';
    }

    // Busca por correspondência parcial
    for (const p of setProjetos) {
      if (p && (p.includes(projNorm) || projNorm.includes(p))) {
        return 'Ativo';
      }
    }
  }

  if (site) {
    const siteUp = higienizarCodigoSite(site);
    if (setSites.has(siteUp)) {
      return 'Ativo';
    }
  }

  return 'Aberto';
}

// ============================================================================
// MÓDULO 5: CONCILIAÇÃO E MONTAGEM DA TABELA ÚNICA (9 COLUNAS)
// ============================================================================
function gerarLinhasTabelaUnica(chamadosIntegracao, mapaDiagramas, mapaSytex, infoProjetosAtivos) {
  const linhas = [];
  const totais = {
    brisanet: 0,
    huawei: 0,
    outros: 0,
    naoEncontrados: 0,
    projetosAtivos: 0,
    projetosAbertos: 0,
    comDiagrama: 0,
    semDiagrama: 0
  };

  for (let i = 0; i < chamadosIntegracao.length; i++) {
    const ch = chamadosIntegracao[i];
    const diag = mapaDiagramas[ch.site] || {};

    const dataFinalizacao = ch.dataFinalizacao || '';
    const categoria = 'Tecnologia'; // Foco exclusivo em Tecnologia
    const codigoSite = ch.site;
    const vendor = ch.vendor || '';
    const integrador = ch.integrador || '';
    const projeto = diag.projeto || '-';
    const maoDeObra = diag.maoDeObra || '-';
    const servTerc = '-'; // Foco em Mão de Obra

    // Determina a Situação do Diagrama consultando a aba '5G ok' de Projetos Ativos
    const situacao = verificarSituacaoProjeto(projeto, codigoSite, infoProjetosAtivos);

    // Contadores para o resumo nos cartões
    if (integrador === 'NÃO ENCONTRADO') {
      totais.naoEncontrados++;
      totais.outros++;
    } else if (integrador.includes('HUAWEI')) {
      totais.huawei++;
    } else if (integrador.includes('BRISANET')) {
      totais.brisanet++;
    } else {
      totais.outros++;
    }

    if (situacao === 'Ativo') totais.projetosAtivos++;
    else totais.projetosAbertos++;

    if (diag.maoDeObra) totais.comDiagrama++;
    else totais.semDiagrama++;

    // 9 Colunas Oficiais (Coluna Chamado/Ticket removida conforme solicitado)
    linhas.push([
      dataFinalizacao, // Col 1 (A): Data de Finalização
      categoria,       // Col 2 (B): Frente / Categoria (Tecnologia)
      codigoSite,      // Col 3 (C): Código do Site
      vendor,          // Col 4 (D): Vendor
      integrador,      // Col 5 (E): Integrador
      projeto,         // Col 6 (F): Projeto
      maoDeObra,       // Col 7 (G): Mão de Obra (Diagrama)
      servTerc,        // Col 8 (H): Serviço Terceiro (Diagrama)
      situacao         // Col 9 (I): Situação do Diagrama (Ativo vs Aberto)
    ]);
  }

  return { linhas, totais };
}

function gravarTabelaUnicaNaAba(planDestino, linhasDados, nomeAba, totais) {
  // 1. Limpa completamente linhas 1 a 4 e colunas 1 a 10 para eliminar resíduos de textos ou da antiga coluna J
  planDestino.getRange(1, 1, 4, 10).clear({ contentsOnly: true, formatOnly: true });

  // 2. Banner de Título Superior na Linha 1 (Mesclado A1:I1)
  const rangeTitulo = planDestino.getRange("A1:I1");
  rangeTitulo.merge();
  rangeTitulo.setValue(`PAINEL DE INTEGRAÇÕES & DIAGRAMAS 5G — ${nomeAba}`);
  rangeTitulo.setBackground("#0f243e");
  rangeTitulo.setFontColor("#ffffff");
  rangeTitulo.setFontWeight("bold");
  rangeTitulo.setFontSize(12);
  rangeTitulo.setHorizontalAlignment("center");

  // 3. Cartões Indicadores nas Linhas 2 e 3 com Valores Numéricos (imune a incompatibilidade de idioma/locale)
  const valBrisanet = totais ? totais.brisanet : 0;
  const valHuawei = totais ? (totais.huawei || 0) : 0;
  const valNaoEncontrado = totais ? (totais.naoEncontrados || 0) : 0;
  const totalGeral = (linhasDados && linhasDados.length > 0) ? linhasDados.length : 0;

  // Cartão 1: Brisanet (A2:B3)
  const c1Tit = planDestino.getRange("A2:B2");
  c1Tit.merge().setValue("🟢 Integrado por nós (Brisanet)").setFontWeight("bold").setFontSize(10).setBackground("#e2f0d9").setFontColor("#385723").setHorizontalAlignment("center");
  const c1Val = planDestino.getRange("A3:B3");
  c1Val.merge().setValue(valBrisanet).setFontWeight("bold").setFontSize(14).setBackground("#e2f0d9").setFontColor("#385723").setHorizontalAlignment("center");

  // Cartão 2: Huawei (C2:D3)
  const c2Tit = planDestino.getRange("C2:D2");
  c2Tit.merge().setValue("🔵 Integrador (Huawei)").setFontWeight("bold").setFontSize(10).setBackground("#ddebf7").setFontColor("#1f4e78").setHorizontalAlignment("center");
  const c2Val = planDestino.getRange("C3:D3");
  c2Val.merge().setValue(valHuawei).setFontWeight("bold").setFontSize(14).setBackground("#ddebf7").setFontColor("#1f4e78").setHorizontalAlignment("center");

  // Cartão 3: Não Encontrado (E2:F3)
  const c3Tit = planDestino.getRange("E2:F2");
  c3Tit.merge().setValue("🟣 Não Encontrado").setFontWeight("bold").setFontSize(10).setBackground("#f2f2f2").setFontColor("#595959").setHorizontalAlignment("center");
  const c3Val = planDestino.getRange("E3:F3");
  c3Val.merge().setValue(valNaoEncontrado).setFontWeight("bold").setFontSize(14).setBackground("#f2f2f2").setFontColor("#595959").setHorizontalAlignment("center");

  // Cartão 4: Total Geral (G2:H3)
  const c4Tit = planDestino.getRange("G2:H2");
  c4Tit.merge().setValue("⚪ Total Geral do Mês").setFontWeight("bold").setFontSize(10).setBackground("#fff2cc").setFontColor("#7f6000").setHorizontalAlignment("center");
  const c4Val = planDestino.getRange("G3:H3");
  c4Val.merge().setValue(totalGeral).setFontWeight("bold").setFontSize(14).setBackground("#fff2cc").setFontColor("#7f6000").setHorizontalAlignment("center");

  // Cartão 5: Referência (I2:I3)
  const c5Tit = planDestino.getRange("I2");
  c5Tit.setValue("📅 Ref.").setFontWeight("bold").setFontSize(10).setBackground("#eaecf0").setFontColor("#333333").setHorizontalAlignment("center");
  const c5Val = planDestino.getRange("I3");
  c5Val.setValue(nomeAba).setFontWeight("bold").setFontSize(11).setBackground("#eaecf0").setFontColor("#333333").setHorizontalAlignment("center");

  // 4. Cabeçalho Oficial das 9 Colunas na Linha 4 (A4:I4)
  const cabecalhos = [
    'Data de Finalização',
    'Frente / Categoria',
    'Código do Site',
    'Vendor',
    'Integrador',
    'Projeto',
    'Mão de Obra (Diagrama)',
    'Serviço Terceiro (Diagrama)',
    'Situação do Diagrama'
  ];

  const rangeCabecalho = planDestino.getRange(CONFIG.linhaCabecalho, 1, 1, 9);
  rangeCabecalho.setValues([cabecalhos]);
  rangeCabecalho.setBackground('#1f4e78');
  rangeCabecalho.setFontColor('#ffffff');
  rangeCabecalho.setFontWeight('bold');
  rangeCabecalho.setHorizontalAlignment('center');

  // 5. Limpa os dados e formatações antigos a partir da linha 5 (limpa 10 colunas para remover a antiga coluna J)
  const maxLinhas = Math.max(planDestino.getLastRow(), 50);
  if (maxLinhas >= CONFIG.linhaDadosInicial) {
    planDestino.getRange(CONFIG.linhaDadosInicial, 1, maxLinhas - CONFIG.linhaDadosInicial + 1, 10).clear({ contentsOnly: true, formatOnly: true });
  }

  // 6. Grava os novos dados conciliados (se houver)
  if (linhasDados && linhasDados.length > 0) {
    const rangeDados = planDestino.getRange(CONFIG.linhaDadosInicial, 1, linhasDados.length, 9);
    rangeDados.setValues(linhasDados);
    rangeDados.setHorizontalAlignment('center');

    planDestino.getRange(CONFIG.linhaDadosInicial, 1, linhasDados.length, 1).setHorizontalAlignment('center');
    planDestino.getRange(CONFIG.linhaDadosInicial, 3, linhasDados.length, 1).setFontWeight('bold');
    planDestino.getRange(CONFIG.linhaDadosInicial, 6, linhasDados.length, 1).setHorizontalAlignment('left'); // Projeto na Col F

    // Destaque visual: linhas onde o Integrador é 'NÃO ENCONTRADO'
    for (let r = 0; r < linhasDados.length; r++) {
      const rowNum = CONFIG.linhaDadosInicial + r;
      if (linhasDados[r][4] === 'NÃO ENCONTRADO') {
        planDestino.getRange(rowNum, 5).setBackground('#fff2cc').setFontColor('#c00000').setFontWeight('bold');
      }
      // Destaque para Situação do Diagrama (Coluna I - índice 8)
      if (linhasDados[r][8] === 'Ativo') {
        planDestino.getRange(rowNum, 9).setFontColor('#2e7d32').setFontWeight('bold');
      } else {
        planDestino.getRange(rowNum, 9).setFontColor('#7f6000');
      }
    }
  }
}

// ============================================================================
// FUNÇÕES AUXILIARES E UTILITÁRIOS
// ============================================================================
function extrairCodigoSiteCanonico(codigoBruto) {
  if (!codigoBruto) return '';
  let str = codigoBruto.toString().trim().toUpperCase();
  str = str.replace(/[\r\n\t\u00A0\u200B]/g, ' ').trim();
  str = str.replace(/\.0+$/, '');

  // 1. Padrão de projeto de torre (ex: WL_RN-SMU0001-... ou WL_SE-SECD0001-...)
  const matchTorre = str.match(/WL_[A-Z]{2}-([A-Z]{3,5}\d{3,5})/i);
  if (matchTorre) {
    return matchTorre[1].replace(/[-_\s]/g, '').toUpperCase();
  }

  // 2. Prefixo de estado com HÍFEN/UNDERLINE OBRIGATÓRIO (ex: CE-ITN0004, PI-SFM0004, RN-SMU0001)
  // O hífen é obrigatório e precisa vir seguido de 3 a 5 letras (ex: ITN, SECD) e 3 a 5 números.
  // Isso EVITA cortar sites válidos de 4 letras como SECD0001, SECD0004, BARA0001, etc.
  const matchEstado = str.match(/(?:^|[^A-Za-z0-9])(?:AL|BA|CE|MA|MS|PB|PE|PI|RN|SE|GO|TO)\s*[-_]\s*([A-Z]{3,5})[-_\s]?(\d{3,5})/i);
  if (matchEstado) {
    return (matchEstado[1] + matchEstado[2]).toUpperCase();
  }

  // 3. Padrão canônico de site: 3 a 5 letras seguidas de hífen/espaço opcional e 3 a 5 dígitos (ex: SECD0001, SECD0004, ITN0004, SFM0004)
  const matchGeral = str.match(/(?:^|[^A-Za-z0-9])([A-Z]{3,5})[-_\s]?(\d{3,5})(?=[^A-Za-z0-9]|$)/i);
  if (matchGeral) {
    return (matchGeral[1] + matchGeral[2]).toUpperCase();
  }

  // 4. Fallback para códigos com 2 letras (se não for sigla de estado isolada)
  const matchCurto = str.match(/(?:^|[^A-Za-z0-9])([A-Z]{2})[-_\s]?(\d{3,5})(?=[^A-Za-z0-9]|$)/i);
  if (matchCurto) {
    return (matchCurto[1] + matchCurto[2]).toUpperCase();
  }

  return str.replace(/[^A-Z0-9]/g, '');
}

function higienizarCodigoSite(codigoBruto) {
  return extrairCodigoSiteCanonico(codigoBruto);
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
    const str = valor.replace(/[\r\n\t\u00A0\u200B]/g, ' ').trim();
    const ddmmyyyy = str.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})/);
    if (ddmmyyyy) {
      let dia = parseInt(ddmmyyyy[1], 10);
      let mes = parseInt(ddmmyyyy[2], 10) - 1;
      let ano = parseInt(ddmmyyyy[3], 10);
      if (ano < 100) ano += 2000;
      return new Date(ano, mes, dia);
    }
    const iso = str.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})/);
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

/**
 * Validação de Mês e Ano oficial:
 * Conforme alinhado, a coluna S não é mais usada como filtro.
 * O critério oficial é a data na Coluna P (CHAMADO FINALIZADO).
 */
function verificarPertenceAoMes(dataRaw, mesInfo) {
  if (!mesInfo) return true;

  const dt = extrairData(dataRaw);
  if (dt) {
    return dt.getFullYear() === mesInfo.ano && dt.getMonth() === mesInfo.mesIndex;
  }

  return false;
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
