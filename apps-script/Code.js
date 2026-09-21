/**
 * OrçaHub - Sistema de Planejamento e Acompanhamento Orçamentário
 * Backend Google Apps Script (Code.gs)
 */

// Retorna a página Web principal
function doGet(e) {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('OrçaHub - Gestão Orçamentária')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/**
 * Função utilitária para obter a planilha ativa ou vinculada
 */
function getSpreadsheet() {
  // Se o script estiver embutido na planilha, usa getActiveSpreadsheet()
  // Caso seja um script autônomo, substitua pelo ID da sua planilha:
  // return SpreadsheetApp.openById("SEU_ID_DA_PLANILHA_AQUI");
  return SpreadsheetApp.getActiveSpreadsheet();
}

/**
 * Retorna todos os dados iniciais do sistema em uma única chamada (Alta Performance)
 */
function getInitialData() {
  const ss = getSpreadsheet();
  
  return {
    premises: getPremisesData(ss),
    costCenters: getCostCentersData(ss),
    accounts: getAccountsData(ss),
    opexItems: getOpexData(ss),
    capexProjects: getCapexData(ss),
    varianceItems: getVarianceData(ss)
  };
}

function getPremisesData(ss) {
  const sheet = ss.getSheetByName('Premissas');
  if (!sheet) return null;
  const data = sheet.getDataRange().getValues();
  const premises = {};
  for (let i = 1; i < data.length; i++) {
    premises[data[i][0]] = data[i][1];
  }
  return premises;
}

function getCostCentersData(ss) {
  const sheet = ss.getSheetByName('CentrosDeCusto');
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  const list = [];
  for (let i = 1; i < data.length; i++) {
    list.push({
      id: data[i][0],
      code: data[i][1],
      name: data[i][2],
      directorate: data[i][3],
      manager: data[i][4],
      coordinator: data[i][5]
    });
  }
  return list;
}

function getAccountsData(ss) {
  const sheet = ss.getSheetByName('Contas');
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  const list = [];
  for (let i = 1; i < data.length; i++) {
    list.push({
      code: data[i][0],
      name: data[i][1],
      category: data[i][2],
      type: data[i][3]
    });
  }
  return list;
}

function getOpexData(ss) {
  const sheet = ss.getSheetByName('OPEX');
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  const list = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    list.push({
      id: row[0],
      costCenterId: row[1],
      accountCode: row[2],
      description: row[3],
      memory: {
        formula: row[4],
        driverName: row[5],
        quantity: Number(row[6]) || 0,
        unitPrice: Number(row[7]) || 0,
        periodicity: row[8],
        currency: row[9] || 'BRL',
        supplier: row[10],
        contractRef: row[11],
        justification: row[12]
      },
      // Meses de Jan (col 13) a Dez (col 24)
      monthlyBudget: row.slice(13, 25).map(v => Number(v) || 0),
      totalAnnual: Number(row[25]) || 0
    });
  }
  return list;
}

function getCapexData(ss) {
  const sheet = ss.getSheetByName('CAPEX');
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  const list = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    list.push({
      id: row[0],
      code: row[1], // WBS
      name: row[2],
      costCenterId: row[3],
      accountCode: row[4],
      objective: row[5],
      totalInvestment: Number(row[6]) || 0,
      activationMonth: Number(row[7]) || 1, // 1-12
      tapStatus: row[8],
      tapObservations: row[9],
      // Lançamentos fiscais mensais de Jan (col 10) a Dez (col 21)
      monthlyFiscalLaunch: row.slice(10, 22).map(v => Number(v) || 0)
    });
  }
  return list;
}

function getVarianceData(ss) {
  const sheet = ss.getSheetByName('Justificativas');
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  const list = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    list.push({
      id: row[0],
      itemId: row[1],
      description: row[2],
      costCenterName: row[3],
      month: Number(row[4]) || 5, // 0-indexed ou 1-indexed
      budgeted: Number(row[5]) || 0,
      actual: Number(row[6]) || 0,
      variance: Number(row[7]) || 0,
      variancePercent: Number(row[8]) || 0,
      classification: row[9],
      nature: row[10],
      justification: row[11],
      actionPlan: {
        what: row[12],
        who: row[13],
        when: row[14]
      },
      status: row[15]
    });
  }
  return list;
}

/**
 * Salva ou atualiza uma Justificativa 5W2H com LockService para evitar concorrência
 */
function saveJustification(payload) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000); // Aguarda até 10 segundos para obter exclusividade
    
    const ss = getSpreadsheet();
    let sheet = ss.getSheetByName('Justificativas');
    if (!sheet) {
      sheet = ss.insertSheet('Justificativas');
      sheet.appendRow([
        'ID', 'ID_Item', 'Descricao', 'CentroDeCusto', 'Mes', 'Orcado', 'Realizado',
        'Desvio', 'DesvioPct', 'Classificacao', 'Natureza', 'Justificativa',
        'Acao_5W2H', 'Responsavel', 'Prazo', 'Status', 'DataRegistro'
      ]);
    }
    
    const data = sheet.getDataRange().getValues();
    let rowIndex = -1;
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === payload.id) {
        rowIndex = i + 1;
        break;
      }
    }
    
    const newRow = [
      payload.id,
      payload.itemId,
      payload.description,
      payload.costCenterName,
      payload.month,
      payload.budgeted,
      payload.actual,
      payload.variance,
      payload.variancePercent,
      payload.classification,
      payload.nature,
      payload.justification,
      payload.actionPlan ? payload.actionPlan.what : '',
      payload.actionPlan ? payload.actionPlan.who : '',
      payload.actionPlan ? payload.actionPlan.when : '',
      'JUSTIFICADO',
      new Date().toISOString()
    ];
    
    if (rowIndex > 0) {
      sheet.getRange(rowIndex, 1, 1, newRow.length).setValues([newRow]);
    } else {
      sheet.appendRow(newRow);
    }
    
    return { success: true, message: 'Justificativa registrada com sucesso!' };
  } catch (error) {
    return { success: false, message: error.toString() };
  } finally {
    lock.releaseLock();
  }
}

/**
 * FUNÇÃO DE SETUP AUTOMÁTICO
 * Cria e formata todas as abas e cabeçalhos com dados iniciais se a planilha estiver vazia.
 * Execute esta função apenas UMA VEZ no editor do Apps Script!
 */
function setupSpreadsheet() {
  const ss = getSpreadsheet();
  
  // 1. Aba Premissas
  let sPremissas = ss.getSheetByName('Premissas') || ss.insertSheet('Premissas');
  sPremissas.clear();
  sPremissas.appendRow(['Chave', 'Valor', 'Descricao']);
  sPremissas.appendRow(['USD_RATE', 5.45, 'Taxa de Câmbio Oficial Dólar']);
  sPremissas.appendRow(['EUR_RATE', 6.05, 'Taxa de Câmbio Oficial Euro']);
  sPremissas.appendRow(['IPCA_RATE', 4.2, 'Índice de Inflação IPCA % a.a.']);
  sPremissas.appendRow(['IGPM_RATE', 4.8, 'Índice de Reajuste IGP-M % a.a.']);
  sPremissas.appendRow(['CLOSING_DEADLINE', '4º dia útil do mês subsequente', 'Prazo de fechamento e provisões']);
  sPremissas.appendRow(['ONBOARDING_NOTEBOOK', 4800, 'Custo Notebook e Celular TI']);
  sPremissas.appendRow(['ONBOARDING_EPI', 1200, 'Kit EPI e Uniformes']);
  sPremissas.appendRow(['ONBOARDING_TRAINING', 800, 'Treinamento de Integração']);
  sPremissas.appendRow(['ONBOARDING_LICENSES_MONTHLY', 350, 'Licenças mensais']);
  sPremissas.appendRow(['ONBOARDING_FLEET_MONTHLY', 1200, 'Frota mensal por técnico']);
  
  // 2. Aba CentrosDeCusto
  let sCC = ss.getSheetByName('CentrosDeCusto') || ss.insertSheet('CentrosDeCusto');
  sCC.clear();
  sCC.appendRow(['ID', 'Codigo', 'Nome', 'Diretoria', 'Gerente', 'Coordenador']);
  sCC.appendRow(['cc-101', '101.01', 'Operações de Rede & Torres', 'Diretoria de Operações', 'Carlos Mendes', 'Rafael Silva']);
  sCC.appendRow(['cc-102', '101.02', 'Infraestrutura de TI & Sistemas', 'Diretoria de Tecnologia', 'Juliana Prado', 'Marcos Rocha']);
  sCC.appendRow(['cc-201', '201.01', 'Expansão Comercial & Vendas', 'Diretoria Comercial', 'Camila Duarte', 'Lucas Moura']);
  sCC.appendRow(['cc-301', '301.01', 'Frotas & Logística de Campo', 'Diretoria de Operações', 'Fernando Pires', 'Rodrigo Henrique']);
  sCC.appendRow(['cc-401', '401.01', 'Gente & Gestão (RH)', 'Diretoria Administrativa', 'Patrícia Pessoa', 'Mariana Costa']);
  
  // 3. Aba Contas
  let sContas = ss.getSheetByName('Contas') || ss.insertSheet('Contas');
  sContas.clear();
  sContas.appendRow(['Codigo', 'Nome', 'Categoria', 'Tipo']);
  sContas.appendRow(['3.1.01', 'Folha de Pagamento & Encargos', 'OPEX', 'CUSTO']);
  sContas.appendRow(['3.1.02', 'Benefícios & Onboarding de Pessoal', 'OPEX', 'CUSTO']);
  sContas.appendRow(['3.2.01', 'Locação de Torres & Terrenos', 'OPEX', 'CUSTO']);
  sContas.appendRow(['3.2.02', 'Manutenção Preventiva de Rede', 'OPEX', 'CUSTO']);
  sContas.appendRow(['3.2.03', 'Combustível & Frotas', 'OPEX', 'CUSTO']);
  sContas.appendRow(['3.3.01', 'Licenças de Software & Cloud (USD)', 'OPEX', 'DESPESA']);
  sContas.appendRow(['4.1.01', 'CAPEX: Implantação de Torres & Sites', 'CAPEX', 'INVESTIMENTO']);
  sContas.appendRow(['4.1.02', 'CAPEX: Expansão de Backhaul & Fibra', 'CAPEX', 'INVESTIMENTO']);
  
  // 4. Aba OPEX
  let sOpex = ss.getSheetByName('OPEX') || ss.insertSheet('OPEX');
  sOpex.clear();
  sOpex.appendRow([
    'ID', 'ID_CentroCusto', 'CodigoConta', 'Descricao', 'Formula', 'Driver', 'Quantidade',
    'ValorUnitario', 'Periodicidade', 'Moeda', 'Fornecedor', 'Contrato', 'Justificativa',
    'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez', 'TotalAnual'
  ]);
  sOpex.appendRow([
    'opx-001', 'cc-301', '3.2.03', 'Locação de Veículos para Equipes Técnicas',
    '14 veículos × R$ 2.650/mês (+ 4,8% reajuste em Set)', 'Veículos', 14, 2650, 'MENSAL', 'BRL',
    'Movida Frotas S.A.', 'CTR-2024/089', 'Atendimento de chamados operacionais em campo.',
    37100, 37100, 37100, 37100, 37100, 37100, 37100, 37100, 38880, 38880, 38880, 38880, 452320
  ]);
  sOpex.appendRow([
    'opx-002', 'cc-101', '3.2.02', 'Manutenção Preventiva de Torres',
    '120 torres × R$ 420/visita mensal', 'Torres Ativas', 120, 420, 'MENSAL', 'BRL',
    'TorreTech Engenharia', 'CTR-TORRES-2023', 'Garantir SLA 99.8% e conformidade regulatória.',
    50400, 50400, 50400, 50400, 50400, 50400, 50400, 50400, 50400, 50400, 50400, 50400, 604800
  ]);
  sOpex.appendRow([
    'opx-003', 'cc-102', '3.3.01', 'Licenças Cloud e Segurança (USD)',
    '95 users × US$ 38 × R$ 5,45 × 1,155 (Tributos)', 'Usuários Cloud', 95, 38, 'MENSAL', 'USD',
    'Microsoft Operations', 'MS-CORP-INT', 'Infraestrutura corporativa de nuvem.',
    22730, 22730, 22730, 22730, 22730, 22730, 22730, 22730, 22730, 22730, 22730, 22730, 272760
  ]);
  
  // 5. Aba CAPEX
  let sCapex = ss.getSheetByName('CAPEX') || ss.insertSheet('CAPEX');
  sCapex.clear();
  sCapex.appendRow([
    'ID', 'WBS', 'Nome', 'ID_CentroCusto', 'CodigoConta', 'Objetivo',
    'InvestimentoTotal', 'MesAtivacao', 'StatusTAP', 'ObsTAP',
    'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
  ]);
  sCapex.appendRow([
    'cpx-001', 'WBS-4.1.01.001', 'Expansão Cluster Nordeste - 12 Novas Torres',
    'cc-101', '4.1.01', 'Ampliar cobertura 5G para 8 municípios prioritários.',
    1850000, 7, 'EM_ELABORACAO', 'Área de Patrimônio coletando laudos e ARTs.',
    0, 250000, 350000, 450000, 400000, 400000, 0, 0, 0, 0, 0, 0
  ]);
  sCapex.appendRow([
    'cpx-002', 'WBS-4.1.02.004', 'Upgrade Roteadores Core 100G & Fibra',
    'cc-102', '4.1.02', 'Eliminar gargalos entre data centers e anel metropolitano.',
    680000, 5, 'HOMOLOGADO', 'TAP nº 2026/044 homologado por Patrimônio com vida útil de 5 anos.',
    0, 0, 320000, 360000, 0, 0, 0, 0, 0, 0, 0, 0
  ]);
  
  // 6. Aba Justificativas
  let sJust = ss.getSheetByName('Justificativas') || ss.insertSheet('Justificativas');
  sJust.clear();
  sJust.appendRow([
    'ID', 'ID_Item', 'Descricao', 'CentroDeCusto', 'Mes', 'Orcado', 'Realizado',
    'Desvio', 'DesvioPct', 'Classificacao', 'Natureza', 'Justificativa',
    'Acao_5W2H', 'Responsavel', 'Prazo', 'Status', 'DataRegistro'
  ]);
  sJust.appendRow([
    'var-001', 'opx-002', 'Manutenção Preventiva de Torres', 'Operações de Rede & Torres', 5,
    50400, 63800, 13400, 26.59, 'DESFAVORAVEL', 'VARIACAO_VOLUME',
    'Desvio por fortes chuvas no interior com descargas atmosféricas em 18 torres.',
    'Instalação de para-raios reforçados e acionamento de seguro.', 'Rafael Silva', '15/08/2026',
    'JUSTIFICADO', new Date().toISOString()
  ]);
  sJust.appendRow([
    'var-002', 'opx-001', 'Locação de Veículos para Equipes', 'Frotas & Logística de Campo', 5,
    37100, 42100, 5000, 13.48, 'DESFAVORAVEL', 'POSTERGACAO',
    'Fatura de Maio atrasou e foi lançada cumulativamente em Junho.',
    'Garantir provisionamento tempestivo em D+4.', 'Rodrigo Henrique', '30/07/2026',
    'JUSTIFICADO', new Date().toISOString()
  ]);

  SpreadsheetApp.flush();
  Logger.log('Estrutura de tabelas e dados iniciais criada com sucesso!');
}
