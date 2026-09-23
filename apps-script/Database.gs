/**
 * ============================================================================
 * ORÇAHUB - GERÊNCIA EXECUTIVA DE TELEFONIA (BRISANET TELECOM)
 * Arquivo: Database.gs
 * Função: Gerenciador do Banco de Dados no Google Planilhas (Google Sheets)
 * ============================================================================
 */

/**
 * Cria e formata todas as abas necessárias com cabeçalhos e dados fictícios completos para apresentação.
 * Execute esta função UMA VEZ no editor do Apps Script para configurar a planilha.
 */
function configurarPlanilhaInicial() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // 1. Configurações
  const abaConfig = obterOuCriarAba(ss, "CONFIGURACOES", [
    "CHAVE", "VALOR", "DESCRICAO"
  ]);
  if (abaConfig.getLastRow() === 1) {
    abaConfig.appendRow(["EMAIL_MONITORADO", "telefonia.administrativo@grupobrisanet.com.br", "Caixa de e-mail monitorada pelo robô diário"]);
    abaConfig.appendRow(["PASTA_DRIVE_FATURAS", "OrçaHub - Faturas Telefonia", "Nome da pasta no Google Drive para salvar anexos"]);
    abaConfig.appendRow(["GERENCIA", "Gerência Executiva de Telefonia", "Unidade orçamentária titular"]);
    abaConfig.appendRow(["CENARIO_ATIVO", "BUDGET_ORIGINAL", "Cenário base ativo"]);
  }

  // 2. OPEX
  const abaOpex = obterOuCriarAba(ss, "OPEX", [
    "ID", "CENTRO_CUSTO_ID", "CENTRO_CUSTO_NOME", "CONTA_CONTABIL", "DESCRICAO",
    "JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ",
    "TOTAL_ORCADO", "STATUS", "ORIGEM", "CRIADO_EM"
  ]);
  if (abaOpex.getLastRow() === 1) {
    popularOpexInicial(abaOpex);
  }

  // 3. CAPEX
  const abaCapex = obterOuCriarAba(ss, "CAPEX", [
    "ID", "NOME_PROJETO", "CENTRO_CUSTO", "INVESTIMENTO_TOTAL", "STATUS", "PERCENTUAL_EXECUTADO",
    "JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"
  ]);
  if (abaCapex.getLastRow() === 1) {
    popularCapexInicial(abaCapex);
  }

  // 4. DETRAF
  const abaDetraf = obterOuCriarAba(ss, "DETRAF", [
    "ID", "NUMERO_FATURA", "OPERADORA", "SENTIDO", "MES_REFERENCIA", "VENCIMENTO",
    "MINUTOS_TARIFA", "TIPO_TARIFA", "VALOR_TARIFA", "VALOR_BRUTO", "IMPOSTOS", "VALOR_LIQUIDO",
    "STATUS", "GLOSA_MOTIVO", "GLOSA_VALOR", "LINK_DRIVE", "DATA_CADASTRO"
  ]);
  if (abaDetraf.getLastRow() === 1) {
    popularDetrafInicial(abaDetraf);
  }

  // 5. TORRES E SITES
  const abaTorres = obterOuCriarAba(ss, "TORRES_SITES", [
    "ID", "SITE_ID", "NOME_SITE", "CIDADE_UF", "PROVEDOR_TORRE", "TIPO_COMPARTILHAMENTO",
    "ALUGUEL_MENSAL", "INDICE_REAJUSTE", "MES_ANIVERSARIO", "STATUS"
  ]);
  if (abaTorres.getLastRow() === 1) {
    popularTorresInicial(abaTorres);
  }

  // 6. FLUXO DE CAIXA
  const abaFluxo = obterOuCriarAba(ss, "FLUXO_CAIXA", [
    "ID", "DATA_LIQUIDACAO", "TIPO", "CATEGORIA", "DESCRICAO", "VALOR", "STATUS", "ORIGEM"
  ]);
  if (abaFluxo.getLastRow() === 1) {
    popularFluxoCaixaInicial(abaFluxo);
  }

  // 7. AUDITORIA
  const abaAuditoria = obterOuCriarAba(ss, "AUDITORIA", [
    "ID", "TIMESTAMP", "USUARIO", "ACAO", "ENTIDADE", "ENTIDADE_ID", "DESCRICAO",
    "VALOR_ANTERIOR", "VALOR_NOVO", "JUSTIFICATIVA"
  ]);
  if (abaAuditoria.getLastRow() === 1) {
    popularAuditoriaInicial(abaAuditoria);
  }

  // 8. REMANEJAMENTOS
  const abaRemanejamento = obterOuCriarAba(ss, "REMANEJAMENTOS", [
    "ID", "PROTOCOLO", "DATA_SOLICITACAO", "SOLICITANTE", "CC_ORIGEM", "CC_DESTINO",
    "VALOR", "CATEGORIA", "MES_EFETIVO", "STATUS", "JUSTIFICATIVA", "APROVADOR", "DATA_APROVACAO"
  ]);
  if (abaRemanejamento.getLastRow() === 1) {
    popularRemanejamentosInicial(abaRemanejamento);
  }

  SpreadsheetApp.getUi().alert("OrçaHub: Banco de dados configurado com sucesso com todos os exemplos fictícios de apresentação!");
}

/**
 * Obtém ou cria uma aba, aplicando estilo ao cabeçalho.
 */
function obterOuCriarAba(ss, nome, cabecalhos) {
  let aba = ss.getSheetByName(nome);
  if (!aba) {
    aba = ss.insertSheet(nome);
  }
  
  if (aba.getLastRow() === 0) {
    aba.appendRow(cabecalhos);
    const range = aba.getRange(1, 1, 1, cabecalhos.length);
    range.setBackground("#0F172A"); // Slate 900
    range.setFontColor("#FFFFFF");
    range.setFontWeight("bold");
    range.setFontSize(10);
    aba.setFrozenRows(1);
  }
  return aba;
}

/**
 * Lê todos os registros de uma aba e converte para Array de Objetos.
 */
function lerDadosAba(nomeAba) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const aba = ss.getSheetByName(nomeAba);
  if (!aba || aba.getLastRow() <= 1) return [];

  const valores = aba.getDataRange().getValues();
  const cabecalhos = valores[0];
  const resultado = [];

  for (let i = 1; i < valores.length; i++) {
    const linha = valores[i];
    const item = {};
    for (let j = 0; j < cabecalhos.length; j++) {
      item[cabecalhos[j]] = linha[j];
    }
    resultado.push(item);
  }
  return resultado;
}

/**
 * Registra evento na trilha de auditoria
 */
function registrarAuditoria(acao, entidade, entidadeId, descricao, valorAnterior, valorNovo, justificativa, usuario) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const aba = ss.getSheetByName("AUDITORIA");
    if (!aba) return;

    const id = "AUD-" + Utilities.getUuid().slice(0, 8).toUpperCase();
    const timestamp = Utilities.formatDate(new Date(), "America/Fortaleza", "yyyy-MM-dd HH:mm:ss");
    const userEmail = usuario || Session.getActiveUser().getEmail() || "sistema.telefonia@grupobrisanet.com.br";

    aba.appendRow([
      id,
      timestamp,
      userEmail,
      acao,
      entidade,
      entidadeId,
      descricao,
      valorAnterior || "",
      valorNovo || "",
      justificativa || ""
    ]);
  } catch (e) {
    Logger.log("Erro ao registrar auditoria: " + e.toString());
  }
}

/**
 * Carga inicial de dados representativos para a Gerência Executiva de Telefonia
 */
function popularOpexInicial(aba) {
  const itens = [
    ["OPX-001", "cc-101", "101.01 - Operações de Rede & Torres", "3.2.02 - Energia Elétrica Sites", "Energia Elétrica Estações Rádio Base (ERBs)", 240000, 245000, 250000, 242000, 248000, 255000, 260000, 258000, 262000, 265000, 270000, 275000, 3070000, "APROVADO", "MANUAL", "2026-01-05"],
    ["OPX-002", "cc-101", "101.01 - Operações de Rede & Torres", "3.2.05 - Locação de Infraestrutura", "Aluguel de Espaço em Torres (American Tower / SBA)", 185000, 185000, 185000, 188000, 188000, 188000, 192000, 192000, 192000, 195000, 195000, 195000, 2280000, "APROVADO", "MANUAL", "2026-01-05"],
    ["OPX-003", "cc-102", "101.02 - Core de Telefonia & TI Telecom", "3.2.10 - Licenciamento Software Core", "Suporte e Manutenção Core de Telefonia (IMS/SBC/HSS)", 95000, 95000, 95000, 95000, 95000, 95000, 98000, 98000, 98000, 98000, 98000, 98000, 1168000, "APROVADO", "MANUAL", "2026-01-05"],
    ["OPX-004", "cc-201", "201.01 - Interconexão & DETRAF", "3.2.14 - Tarifa Interconexão Outbound", "Custos de Terminação em Redes Móveis de Terceiros (VU-M)", 320000, 315000, 330000, 325000, 340000, 335000, 350000, 345000, 360000, 355000, 370000, 365000, 4110000, "APROVADO", "MANUAL", "2026-01-05"],
    ["OPX-005", "cc-301", "301.01 - Manutenção de Campo & Sites Móveis", "3.2.08 - Combustível & Geradores", "Diesel para Grupos Moto-Geradores de Sites Estratégicos", 42000, 40000, 45000, 43000, 48000, 46000, 50000, 47000, 52000, 49000, 55000, 53000, 570000, "APROVADO", "MANUAL", "2026-01-05"],
    ["OPX-006", "cc-401", "401.01 - Qualidade & Regulatório Anatel", "3.2.20 - Taxas Regulatórias FISTEL/TFI", "Taxa de Fiscalização de Instalação e Funcionamento Anatel", 85000, 85000, 120000, 85000, 85000, 85000, 85000, 85000, 85000, 85000, 85000, 85000, 1085000, "APROVADO", "MANUAL", "2026-01-05"]
  ];
  itens.forEach(function(r) { aba.appendRow(r); });
}

function popularCapexInicial(aba) {
  const itens = [
    ["CPX-001", "Expansão de Cobertura 5G - Interior Ceará & RN", "101.01 - Operações de Rede & Torres", 8500000, "EM_ANDAMENTO", 45, 650000, 720000, 810000, 780000, 890000, 950000, 0, 0, 0, 0, 0, 0],
    ["CPX-002", "Modernização de Baterias de Lítio em Sites Críticos", "101.01 - Operações de Rede & Torres", 2400000, "EM_ANDAMENTO", 60, 280000, 310000, 390000, 420000, 0, 0, 0, 0, 0, 0, 0, 0],
    ["CPX-003", "Upgrade de Capacidade SBC & Gateways de Interconexão", "101.02 - Core de Telefonia & TI Telecom", 1200000, "CONCLUIDO", 100, 400000, 500000, 300000, 0, 0, 0, 0, 0, 0, 0, 0, 0]
  ];
  itens.forEach(function(r) { aba.appendRow(r); });
}

function popularDetrafInicial(aba) {
  const itens = [
    ["DET-2026-01", "DET-2026-06-CLARO-IN", "Claro Telecom", "INBOUND", "2026-06", "2026-07-15", 1420500, "VU-M", 0.0195, 27700, 2562, 25138, "CONCILIADO", "", 0, "", "2026-06-10"],
    ["DET-2026-02", "DET-2026-06-TIM-OUT", "TIM Brasil", "OUTBOUND", "2026-06", "2026-07-15", 2150000, "VU-M", 0.0210, 45150, 4176, 40974, "CONTESTADO", "DIVERGENCIA_CDRS", 48910, "", "2026-06-12"],
    ["DET-2026-03", "DET-2026-06-VIVO-IN", "Telefônica Vivo", "INBOUND", "2026-06", "2026-07-15", 3890000, "VU-M", 0.0195, 75855, 7016, 68839, "A_VENCER", "", 0, "", "2026-06-14"],
    ["DET-2026-04", "DET-2026-06-ALGAR-OUT", "Algar Telecom", "OUTBOUND", "2026-06", "2026-07-15", 480000, "TU-RL", 0.0085, 4080, 377, 3703, "CONCILIADO", "", 0, "", "2026-06-15"]
  ];
  itens.forEach(function(r) { aba.appendRow(r); });
}

function popularTorresInicial(aba) {
  const itens = [
    ["CTR-TWR-001", "BR-CE-JUA-004", "Site Juazeiro Centro", "Juazeiro do Norte/CE", "American Tower do Brasil", "Greenfield 60m", 12500, "IGP-M", "Agosto", "ATIVO"],
    ["CTR-TWR-002", "BR-CE-FOR-019", "Site Aldeota Prime", "Fortaleza/CE", "SBA Torres Brasil", "Rooftop Topo Edifício", 9800, "IPCA", "Novembro", "ATIVO"],
    ["CTR-TWR-003", "BR-RN-MOS-008", "Site Mossoró Oeste", "Mossoró/RN", "Telxius Torres Brasil", "Greenfield 50m", 11200, "IGP-M", "Março", "REAJUSTADO"],
    ["CTR-TWR-004", "BR-PB-PAT-002", "Site Patos Rodoanel", "Patos/PB", "IHS Towers", "Monopolo 40m", 8400, "IPCA", "Outubro", "ATIVO"]
  ];
  itens.forEach(function(r) { aba.appendRow(r); });
}

function popularFluxoCaixaInicial(aba) {
  const itens = [
    ["FLX-001", "2026-07-05", "SAIDA", "Infraestrutura", "Enel Ceará - Energia Estações Juazeiro", 85400, "PREVISTO", "OPEX"],
    ["FLX-002", "2026-07-10", "ENTRADA", "Interconexão", "Claro Telecom - Faturamento Terminação VU-M", 25138, "LIQUIDADO", "DETRAF"],
    ["FLX-003", "2026-07-12", "SAIDA", "Locação", "American Tower do Brasil - Aluguel Sites", 62500, "PREVISTO", "CONTRATOS"],
    ["FLX-004", "2026-07-15", "ENTRADA", "Interconexão", "Telefônica Vivo - Compensação Bilateral Netting", 68839, "PREVISTO", "DETRAF"],
    ["FLX-005", "2026-07-15", "SAIDA", "Interconexão", "TIM Brasil - Tráfego Móvel Outbound (Incontroverso)", 40974, "PREVISTO", "DETRAF"],
    ["FLX-006", "2026-07-20", "SAIDA", "TI Core", "Licenciamento & Suporte Plataforma IMS/SBC", 95000, "PREVISTO", "OPEX"],
    ["FLX-007", "2026-07-25", "SAIDA", "Combustível", "Abastecimento Geradores Diesel Sites Críticos", 42000, "PREVISTO", "OPEX"]
  ];
  itens.forEach(function(r) { aba.appendRow(r); });
}

function popularAuditoriaInicial(aba) {
  const itens = [
    ["AUD-001", "2026-06-20 09:14:22", "rodrigo.henrique@grupobrisanet.com.br", "CONTESTACAO_ANATEL", "DETRAF", "CONT-2026-001", "Abertura de dossiê de glosa formal contra TIM Brasil S.A. (Resolução 693/2017)", "", "R$ 48.910,00", "Divergência de tarifação SMP vs LD."],
    ["AUD-002", "2026-06-18 16:45:10", "carlos.telefonia@grupobrisanet.com.br", "REMANEJAMENTO", "OPEX", "TRF-2026-088", "Aprovação de suplementação de verba do CC 1020 para CC 1010", "R$ 0,00", "R$ 150.000,00", "Aceleração do swap de baterias de lítio."],
    ["AUD-003", "2026-06-15 11:30:05", "telefonia.administrativo@grupobrisanet.com.br", "IMPORTACAO_ARQUIVO", "DETRAF", "IMP-FILE-889", "Importação e parsing de CDRs bilaterais da Claro Telecom", "", "1.420.500 minutos", "Fechamento de interconexão periódica."]
  ];
  itens.forEach(function(r) { aba.appendRow(r); });
}

function popularRemanejamentosInicial(aba) {
  const itens = [
    ["TRF-001", "TRF-2026-088", "2026-06-18 14:10:00", "fernando.engenharia@grupobrisanet.com.br", "101.02 - Core de Telefonia & TI Telecom", "101.01 - Operações de Rede & Torres", 150000, "Manutenção de Infraestrutura", "Julho/2026", "APROVADO", "Aceleração do swap de baterias de lítio nos sites estratégicos de Juazeiro do Norte.", "carlos.telefonia@grupobrisanet.com.br", "2026-06-18 16:45:10"],
    ["TRF-002", "TRF-2026-092", "2026-06-22 08:30:00", "mariana.ti@grupobrisanet.com.br", "401.01 - Qualidade & Regulatório Anatel", "101.02 - Core de Telefonia & TI Telecom", 65000, "Licenciamento & Software Core", "Julho/2026", "PENDENTE", "Upgrade de capacidade de nós de banco de dados para suportar volumetria de conciliação de CDRs.", "", ""]
  ];
  itens.forEach(function(r) { aba.appendRow(r); });
}
