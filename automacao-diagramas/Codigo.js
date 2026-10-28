/**
 * AUTOMAÇÃO DE DIAGRAMAS 5G | INTEGRAÇÃO DE SITES
 * 
 * Módulo para busca e preenchimento automatizado de chamados de integração (5G)
 * e diagramas entre a planilha de controle mensal, a planilha de chamados de integração
 * e a matriz de diagramas.
 */

/**
 * Configurações Gerais do Módulo
 */
const CONFIG = {
  // Planilha de Destino (Planilha de Controle Mensal)
  idDestino: '1672Af0imskRY3ywO7H089Z_unKtXpw7jSHnLSDqAFPw',
  abaDestinoPadrao: 'OUT/2026',
  linhaInicial: 4,

  // Planilha 1: Chamados de Integração (INTEGRAÇÃO E EXPANSÃO DE SITES 2026)
  idOrigemIntegracao: '1_DW_lJl0wsgXrjnJOEhD1vo-tLDzvTnE8u-fUIhhwK4',
  gidOrigemIntegracao: '1755873954',
  nomePlanilhaIntegracao: 'INTEGRAÇÃO E EXPANSÃO DE SITES 2026',
  abaOrigemIntegracao: 'INTEGRAÇÃO DE SITES',
  colOrigemSite: 0,              // Coluna A (índice 0: Código do Site)
  colOrigemDataFinalizacao: 15,  // Coluna P (índice 15: Data de Finalização)
  colDestinoSitesIntegrados: 'K', // Grava os sites importados na Coluna K (Integrado por nós)

  // Planilha 2: Matriz Oficial de Diagramas 5G
  idOrigemDiagramas: '1fd5sieHnEMixKJh8T7qYNwZfecL453cGqqkYl41VdaA',
  abaOrigemDiagramas: 'Diagramas - 5G'
};

/**
 * Cria o menu personalizado "🔄 Atualizar Diagramas" na barra superior ao abrir a planilha.
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('🔄 Atualizar Diagramas')
    .addItem('🚀 Sincronizar Tudo (Importar Sites + Buscar Diagramas)', 'sincronizarTudo')
    .addSeparator()
    .addItem('📥 1. Importar Chamados de Integração (Coluna K)', 'importarSitesIntegracaoMenu')
    .addItem('🔍 2. Buscar Diagramas (Colunas I e L)', 'preencherDiagramasMenu')
    .addToUi();
}

/**
 * FLUXO COMPLETO: Importa chamados do mês para a Coluna K e em seguida preenche os diagramas nas Colunas I e L.
 */
function sincronizarTudo() {
  const ui = SpreadsheetApp.getUi();
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();

  spreadsheet.toast('Iniciando sincronização completa...', 'Processando', -1);

  try {
    const destinoInfo = obterPlanilhaDestinoEAba(spreadsheet);
    const planDestino = destinoInfo.planDestino;
    const mesInfo = destinoInfo.mesInfo;

    // 1. Importa os chamados de integração para a Coluna K
    const resultadoImportacao = executarImportacaoIntegracao(planDestino, mesInfo);

    // 2. Preenche os diagramas para as Colunas I e L
    const relatorioDiagramas = executarPreenchimentoDiagramas(planDestino);

    spreadsheet.toast('Sincronização finalizada com sucesso!', 'Concluído', 4);

    // Resumo consolidado
    let mensagemFinal = `✅ Sincronização Concluída (${destinoInfo.nomeAba})!\n\n` +
      `📥 Chamados de Integração (Planilha: ${CONFIG.nomePlanilhaIntegracao}):\n` +
      `   • Linhas analisadas: ${resultadoImportacao.processados}\n` +
      `   • Sites filtrados para o mês (${mesInfo ? mesInfo.chave + '/' + mesInfo.ano : 'Geral'}): ${resultadoImportacao.importados}\n` +
      `   • Gravados na Coluna ${CONFIG.colDestinoSitesIntegrados} (a partir da linha ${CONFIG.linhaInicial})\n\n` +
      `🔍 Busca de Diagramas (Planilha: ${CONFIG.abaOrigemDiagramas}):\n`;

    relatorioDiagramas.forEach(r => {
      mensagemFinal += `   • ${r.nome}: ${r.encontrados} encontrados de ${r.processados} sites\n`;
    });

    ui.alert('✅ Sincronização Concluída', mensagemFinal, ui.ButtonSet.OK);

  } catch (erro) {
    ui.alert('❌ Erro na Sincronização', 'Detalhe do erro: ' + erro.message, ui.ButtonSet.OK);
  }
}

/**
 * Menu acionado: Apenas importa os sites da planilha de integração.
 */
function importarSitesIntegracaoMenu() {
  const ui = SpreadsheetApp.getUi();
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();

  spreadsheet.toast('Buscando chamados de integração...', 'Processando', -1);

  try {
    const destinoInfo = obterPlanilhaDestinoEAba(spreadsheet);
    const resultado = executarImportacaoIntegracao(destinoInfo.planDestino, destinoInfo.mesInfo);

    spreadsheet.toast('Importação concluída!', 'Concluído', 3);

    const periodo = destinoInfo.mesInfo ? `${destinoInfo.mesInfo.chave}/${destinoInfo.mesInfo.ano}` : destinoInfo.nomeAba;
    const msg = `Resumo da Importação:\n\n` +
      `📍 Aba de Destino: ${destinoInfo.nomeAba} (${periodo})\n` +
      `• Linhas analisadas na origem: ${resultado.processados}\n` +
      `• Sites finalizados no mês: ${resultado.importados}\n` +
      `• Preenchidos na Coluna ${CONFIG.colDestinoSitesIntegrados} a partir da linha ${CONFIG.linhaInicial}.`;

    ui.alert('📥 Chamados Importados', msg, ui.ButtonSet.OK);
  } catch (erro) {
    ui.alert('❌ Erro na Importação', 'Detalhe do erro: ' + erro.message, ui.ButtonSet.OK);
  }
}

/**
 * Menu acionado: Apenas busca os diagramas nas colunas I e L.
 */
function preencherDiagramasMenu() {
  const ui = SpreadsheetApp.getUi();
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();

  spreadsheet.toast('Buscando diagramas...', 'Processando', -1);

  try {
    const destinoInfo = obterPlanilhaDestinoEAba(spreadsheet);
    const relatorio = executarPreenchimentoDiagramas(destinoInfo.planDestino);

    spreadsheet.toast('Diagramas atualizados!', 'Concluído', 3);

    let mensagemFinal = `Resumo da Atualização de Diagramas (${destinoInfo.nomeAba}):\n\n`;
    relatorio.forEach(r => {
      mensagemFinal += `📍 ${r.nome}:\n` +
        `   • Sites processados: ${r.processados}\n` +
        `   • Diagramas encontrados: ${r.encontrados}\n\n`;
    });

    ui.alert('✅ Diagramas Atualizados!', mensagemFinal, ui.ButtonSet.OK);
  } catch (erro) {
    ui.alert('❌ Erro na Atualização', 'Detalhe do erro: ' + erro.message, ui.ButtonSet.OK);
  }
}

// Retrocompatibilidade para quem chama preencherDiagramas diretamente
function preencherDiagramas() {
  sincronizarTudo();
}

/**
 * Realiza a leitura da planilha INTEGRAÇÃO E EXPANSÃO DE SITES 2026, filtra pela data
 * de finalização (Coluna P) conforme o mês/ano da aba ativa e grava os códigos de site na Coluna K.
 */
function executarImportacaoIntegracao(planDestino, mesInfo) {
  const ssIntegracao = obterPlanilhaIntegracao();
  let planIntegracao = ssIntegracao.getSheetByName(CONFIG.abaOrigemIntegracao);
  
  // Fallback por GID caso o nome da aba tenha sofrido alterações
  if (!planIntegracao && CONFIG.gidOrigemIntegracao) {
    const abas = ssIntegracao.getSheets();
    for (let i = 0; i < abas.length; i++) {
      if (abas[i].getSheetId().toString() === CONFIG.gidOrigemIntegracao.toString()) {
        planIntegracao = abas[i];
        break;
      }
    }
  }

  if (!planIntegracao) {
    throw new Error(`Aba "${CONFIG.abaOrigemIntegracao}" (GID: ${CONFIG.gidOrigemIntegracao}) não encontrada na planilha "${ssIntegracao.getName()}".`);
  }

  const dados = planIntegracao.getDataRange().getValues();
  if (dados.length <= 1) {
    return { processados: 0, importados: 0, sites: [] };
  }

  let processados = 0;
  const sitesFiltrados = [];

  // Linha 1 é cabeçalho; varre a partir da linha 2
  for (let r = 1; r < dados.length; r++) {
    const linha = dados[r];
    const siteRaw = linha[CONFIG.colOrigemSite];
    const dataRaw = linha[CONFIG.colOrigemDataFinalizacao];

    if (!siteRaw || siteRaw.toString().trim() === "") continue;
    processados++;

    const dataFinalizacao = extrairData(dataRaw);
    if (dataFinalizacao && mesInfo) {
      if (
        dataFinalizacao.getFullYear() === mesInfo.ano &&
        dataFinalizacao.getMonth() === mesInfo.mesIndex
      ) {
        const siteFormatado = siteRaw.toString().trim();
        // Evita códigos duplicados no mesmo lote
        if (!sitesFiltrados.includes(siteFormatado)) {
          sitesFiltrados.push(siteFormatado);
        }
      }
    }
  }

  // Limpa os dados anteriores da coluna destino a partir da linha inicial
  const maxLinhasDestino = planDestino.getLastRow();
  const colIdx = colParaIndice(CONFIG.colDestinoSitesIntegrados);
  if (maxLinhasDestino >= CONFIG.linhaInicial) {
    planDestino.getRange(CONFIG.linhaInicial, colIdx, maxLinhasDestino - CONFIG.linhaInicial + 1, 1).clearContent();
  }

  // Grava a lista atualizada de sites na coluna destino
  if (sitesFiltrados.length > 0) {
    const valoresGravar = sitesFiltrados.map(s => [s]);
    planDestino.getRange(CONFIG.linhaInicial, colIdx, valoresGravar.length, 1).setValues(valoresGravar);
  }

  return {
    processados: processados,
    importados: sitesFiltrados.length,
    sites: sitesFiltrados
  };
}

/**
 * Executa a busca otimizada dos diagramas na matriz oficial de Diagramas - 5G.
 */
function executarPreenchimentoDiagramas(planDestino) {
  const ssOrigem = SpreadsheetApp.openById(CONFIG.idOrigemDiagramas);
  const planOrigem = ssOrigem.getSheetByName(CONFIG.abaOrigemDiagramas);
  if (!planOrigem) {
    throw new Error(`Aba de origem "${CONFIG.abaOrigemDiagramas}" não encontrada na planilha de diagramas.`);
  }

  // Pré-normalização em memória (O(1) lookups)
  const dadosOrigemBrutos = planOrigem.getDataRange().getValues();
  const dadosOrigemNormalizados = dadosOrigemBrutos.map(linha =>
    linha.map(celula => normalizarTexto(celula))
  );

  const tarefas = [
    {
      nome: "Coluna H (Outros Vendors)",
      colSite: "H",
      colDiagrama: "I",
      categoria: planDestino.getRange("H2").getValue(),
      subCategoria: planDestino.getRange("I3").getValue()
    },
    {
      nome: "Coluna K (Integrado por nós - Huawei)",
      colSite: "K",
      colDiagrama: "L",
      categoria: planDestino.getRange("K2").getValue(),
      subCategoria: planDestino.getRange("L3").getValue()
    }
  ];

  const relatorio = [];
  for (const tarefa of tarefas) {
    const resultado = processarParDeColunas(
      planDestino,
      dadosOrigemBrutos,
      dadosOrigemNormalizados,
      tarefa,
      CONFIG.linhaInicial
    );
    relatorio.push(resultado);
  }

  return relatorio;
}

/**
 * Função modular para processar uma coluna de sites e preencher a coluna do diagrama correspondente.
 */
function processarParDeColunas(planDestino, dadosOrigem, dadosOrigemNorm, config, linhaInicial) {
  const maxLinhasAba = planDestino.getLastRow();
  if (maxLinhasAba < linhaInicial) {
    return { nome: config.nome, processados: 0, encontrados: 0 };
  }

  const rangeSites = planDestino.getRange(`${config.colSite}${linhaInicial}:${config.colSite}${maxLinhasAba}`);
  const sites = rangeSites.getValues();

  let ultimaLinhaComDados = -1;
  for (let i = sites.length - 1; i >= 0; i--) {
    if (sites[i][0] && sites[i][0].toString().trim() !== "") {
      ultimaLinhaComDados = i;
      break;
    }
  }

  if (ultimaLinhaComDados === -1) {
    return { nome: config.nome, processados: 0, encontrados: 0 };
  }

  const catNorm = normalizarTexto(config.categoria).includes("tecnologia") ? "tecnologia" : normalizarTexto(config.categoria);
  const subNorm = normalizarTexto(config.subCategoria);

  let processados = 0;
  let encontrados = 0;
  const resultados = [];

  for (let i = 0; i <= ultimaLinhaComDados; i++) {
    const site = sites[i][0];
    if (site && site.toString().trim() !== "") {
      processados++;
      const diagrama = buscarDiagramaOtimizado(dadosOrigem, dadosOrigemNorm, site, catNorm, subNorm);
      resultados.push([diagrama]);
      if (diagrama !== "Não encontrado" && diagrama !== "") {
        encontrados++;
      }
    } else {
      resultados.push([""]);
    }
  }

  const rangeDestino = planDestino.getRange(linhaInicial, colParaIndice(config.colDiagrama), resultados.length, 1);
  rangeDestino.setValues(resultados);

  return { nome: config.nome, processados, encontrados };
}

/**
 * Busca rápida com matriz normalizada e verificação de regex de palavra inteira.
 */
function buscarDiagramaOtimizado(dadosOrigem, dadosOrigemNorm, siteCode, catNorm, subNorm) {
  const siteNorm = normalizarTexto(siteCode);
  if (!siteNorm) return "";

  const siteRegex = new RegExp(`(^|[^a-z0-9])${siteNorm}([^a-z0-9]|$)`, 'i');

  for (let r = 0; r < dadosOrigemNorm.length; r++) {
    for (let c = 0; c < dadosOrigemNorm[r].length; c++) {
      const conteudo = dadosOrigemNorm[r][c];

      if (conteudo.includes(catNorm) && conteudo.includes(subNorm) && siteRegex.test(conteudo)) {
        if (c + 1 < dadosOrigem[r].length) {
          return dadosOrigem[r][c + 1];
        }
      }
    }
  }
  return "Não encontrado";
}

/**
 * Identifica dinamicamente a planilha de destino e a aba ativa (com extração de mês/ano).
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

  // Fallback: se a aba ativa não for uma aba mensal, usa a aba padrão definida no CONFIG
  const planPadrao = ss.getSheetByName(CONFIG.abaDestinoPadrao);
  if (planPadrao) {
    const mesAnoPadrao = extrairMesAnoAba(CONFIG.abaDestinoPadrao);
    return { planDestino: planPadrao, nomeAba: CONFIG.abaDestinoPadrao, mesInfo: mesAnoPadrao };
  }

  return { planDestino: abaAtiva, nomeAba: nomeAbaAtiva, mesInfo: null };
}

/**
 * Obtém a planilha de integração por ID configurado ou via busca de nome no Google Drive.
 */
function obterPlanilhaIntegracao() {
  if (CONFIG.idOrigemIntegracao && CONFIG.idOrigemIntegracao.trim() !== '') {
    return SpreadsheetApp.openById(CONFIG.idOrigemIntegracao);
  }

  const arquivos = DriveApp.getFilesByName(CONFIG.nomePlanilhaIntegracao);
  if (arquivos.hasNext()) {
    return SpreadsheetApp.open(arquivos.next());
  }

  throw new Error(`Planilha "${CONFIG.nomePlanilhaIntegracao}" não foi encontrada no Google Drive. Defina 'idOrigemIntegracao' em CONFIG.`);
}

/**
 * Extrai e normaliza objeto Date a partir de formatos variados (Date, DD/MM/YYYY, ISO, Serial).
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
 * Identifica o mês e o ano a partir do nome da aba (ex: "OUT/2026", "NOV/2026", "Outubro 2026").
 */
function extrairMesAnoAba(nomeAba) {
  if (!nomeAba) return null;
  const mapaMeses = {
    'jan': 0, 'janeiro': 0,
    'fev': 1, 'fevereiro': 1,
    'mar': 2, 'marco': 2, 'março': 2,
    'abr': 3, 'abril': 3,
    'mai': 4, 'maio': 4,
    'jun': 5, 'junho': 5,
    'jul': 6, 'julho': 6,
    'ago': 7, 'agosto': 7,
    'set': 8, 'setembro': 8,
    'out': 9, 'outubro': 9,
    'nov': 10, 'novembro': 10,
    'dez': 11, 'dezembro': 11
  };

  const limpo = normalizarTexto(nomeAba);
  for (const [chave, mesIdx] of Object.entries(mapaMeses)) {
    if (limpo.includes(chave)) {
      const matchAno = limpo.match(/\b(20\d\d)\b/);
      const ano = matchAno ? parseInt(matchAno[1], 10) : new Date().getFullYear();
      return { mesIndex: mesIdx, ano: ano, chave: chave.toUpperCase() };
    }
  }

  const matchNum = limpo.match(/(\d{1,2})\s*[\/_-]\s*(20\d\d)/);
  if (matchNum) {
    const mesNum = parseInt(matchNum[1], 10);
    if (mesNum >= 1 && mesNum <= 12) {
      return { mesIndex: mesNum - 1, ano: parseInt(matchNum[2], 10), chave: 'MÊS ' + mesNum };
    }
  }

  return null;
}

/**
 * Converte letra de coluna para número (ex: "A" -> 1, "I" -> 9, "K" -> 11, "L" -> 12).
 */
function colParaIndice(coluna) {
  let num = 0;
  const col = coluna.toUpperCase();
  for (let i = 0; i < col.length; i++) {
    num = num * 26 + (col.charCodeAt(i) - 64);
  }
  return num;
}

/**
 * Função auxiliar: Normaliza o texto (remove acentos e converte para minúsculas).
 */
function normalizarTexto(texto) {
  if (texto === null || texto === undefined) return "";
  return texto.toString().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}
