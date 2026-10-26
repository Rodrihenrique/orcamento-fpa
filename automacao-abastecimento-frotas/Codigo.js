/**
 * ============================================================================
 * GESTÃO DE CUSTOS DO SETOR - OPERAÇÃO E MANUTENÇÃO DE REDES
 * ============================================================================
 * Automação Integrada de Custos: Frota Unificada (Combustível e Manutenção)
 * e Viagens (Alimentação e Hospedagem).
 * 
 * Funcionalidades:
 * 1. Módulo de Frota Unificada (Combustível e Manutenção em Arquivo Único):
 *    - Origem: Pasta principal única no Google Drive contendo extratos (.xlsx ou .csv).
 *    - Estrutura do Arquivo Unificado (39 colunas de A até AM):
 *      • Coluna A (0):  CODIGO TRANSACAO
 *      • Coluna B (1):  CODIGO CLIENTE
 *      • Coluna C (2):  NOME REDUZIDO ('BRISANET ABASTECIMENTO' ou 'BRISANET MANUTENCAO')
 *      • Coluna D (3):  DATA TRANSACAO (Data e Hora)
 *      • Coluna E (4):  PLACA
 *      • Coluna F (5):  TIPO FROTA
 *      • Coluna G (6):  MODELO VEICULO
 *      • Coluna H (7):  NUMERO FROTA
 *      • Coluna I (8):  ANO
 *      • Coluna J (9):  MATRICULA
 *      • Coluna K (10): NOME MOTORISTA (Colaborador)
 *      • Coluna L (11): SERVICO
 *      • Coluna M (12): TIPO COMBUSTIVEL
 *      • Coluna N (13): LITROS
 *      • Coluna O (14): VL/LITRO
 *      • Coluna P (15): HODOMETRO OU HORIMETRO
 *      • Coluna Q (16): KM RODADOS OU HORAS TRABALHADAS
 *      • Coluna R (17): KM/LITRO OU LITROS/HORA
 *      • Coluna S (18): VALOR EMISSAO (Valor monetário)
 *      • Coluna T (19): CODIGO ESTABELECIMENTO
 *      • Coluna U (20): NOME ESTABELECIMENTO
 *      • Coluna V (21): TIPO ESTABELECIMENTO
 *      • Colunas W-AM:  ENDERECO, BAIRRO, CIDADE, UF, INFORMAÇÕES ADICIONAIS 1-5,
 *                       FORMA TRANSACAO, CODIGO LIBERACAO, SERIE POS, NUMERO CARTAO,
 *                       FAMILIA VEICULO, GRUPO RESTRICAO, CODIGO EMISSORA, RESPONSAVEL.
 *    - Classificação Automática pela Coluna C (NOME REDUZIDO):
 *      • 'BRISANET ABASTECIMENTO' -> grava na aba 'Base_Abastecimento'
 *      • 'BRISANET MANUTENCAO'    -> grava na aba 'Base_Manutenção'
 *    - Subpasta 'Arquivos Processados':
 *      Criada dentro da pasta principal; os arquivos processados são movidos para ela
 *      automaticamente para evitar duplicidade.
 *    - Criação Dinâmica das Pastas: O próprio script cria e conecta a pasta no Drive.
 * 
 * 2. Módulo de Viagens (Alimentação e Hospedagem):
 *    - Origem: Planilha 'CONTROLE DE VALORES - ALIMENTAÇÃO/HOSPEDAGEM-2026'
 *    - Destino: Aba 'Base_Viagens' (A:C Alimentação, D mantida intacta, F:H Hospedagem)
 *    - Gravação estrita a partir da linha 3, preservando cabeçalhos e fórmulas em A2/F2.
 * 
 * 3. Módulo de Chamados / Atividades de Manutenção:
 *    - Origem: Planilha 'CHAMADOS' (ID: 1Q3QmbHUCgAXP9acDzfDuBCc69Ge2qPzrxwUmlSbtQWU, gid 854802008).
 *    - Destino: Aba 'Atividades' (Colunas A até L).
 *    - Regras de Negócio:
 *      • Tipo fixado estritamente como 'Manutenção' (Expansões vindas de outras fontes são preservadas).
 *      • Categoria padronizada como 'CAPEX'.
 *      • Responsável Equipe: Coluna V (EQUIPE), com fallback inteligente para 'Custos_Totais' (Col A/B).
 *      • Responsável Técnico: Coluna U (COLABORADOR).
 *      • SLA / Horas: Coluna N (HORAS TRABALHADAS) em Col J, com fórmulas automáticas em Col K (=J) e L (=K).
 *      • Preservação Estrita: Linhas de 'Expansão' e cabeçalhos (linhas 1 e 2) são mantidos 100% intactos.
 *      • Filtros de Exclusão: Chamados com tecnologia '5.8' (Coluna E) e atribuídos à 'EQUIPE MNT. - INTERNA.' (Coluna V) são descartados automaticamente.
 * 
 * 4. Regras de Negócio e Filtros Estritos:
 *    - Filtro de Colaborador: Apenas colaboradores na Coluna A de 'Custos_Totais'.
 *    - Filtro Mensal Dinâmico: Apenas lançamentos do mês da planilha ativa (ex.: Outubro).
 *    - Regra de Vigência: Válido de JULHO/2026 em diante (Janeiro a Junho intactos).
 *    - Sincronização em Massa: Atualiza todas as planilhas da pasta 2026 de Julho em diante.
 * ============================================================================
 */

// ============================================================================
// 1. CONFIGURAÇÕES GERAIS
// ============================================================================
const CONFIG_GERAL = {
  // Pasta Raiz 2026 (onde ficam as planilhas mensais de custos do setor)
  PASTA_RAIZ_2026: '1P-QIZVEhADgyZk62snW9nDcV8E_4vLRU',
  NOME_PLANILHA_PADRAO: '10. CUSTOS DO SETOR - OUTUBRO - 2026',

  // Mês inicial de vigência da regra automatizada (Julho/2026 = 7)
  // Planilhas anteriores a Julho possuem formato antigo e são preservadas intactas
  MES_INICIAL_REGRA: 7,

  // ==========================================================================
  // NOVA ESTRUTURA UNIFICADA DE FROTAS (Combustível + Manutenção no mesmo arquivo)
  // ==========================================================================
  // Se os IDs estiverem vazios, o script busca em PropertiesService ou cria automaticamente no Drive
  PASTA_ORIGEM_FROTA: '', 
  PASTA_PROCESSADOS_FROTA: '',
  NOME_PASTA_FROTA: 'Frota Telefonia - Combustível e Manutenção',
  NOME_SUBPASTA_PROCESSADOS: 'Arquivos Processados',

  // Pastas legadas (utilizadas como referência de localização pai no Drive)
  PASTA_ORIGEM_COMBUSTIVEL_LEGADA: '1exK26bgZNurn4bh0Q5bv-f-WyM3f-fxs',
  PASTA_ORIGEM_MANUTENCAO_LEGADA: '1zpsygbFL4d6PtsbjN9FMVITt2ZptR8f2',

  // Planilha de Origem de Viagens (Alimentação e Hospedagem)
  ID_PLANILHA_VIAGENS_ORIGEM: '1ETgxoOa4LyfZGTMYsTgMlEPyFHCDP43VH9dUNdTqYEk',
  ABA_ORIGEM_ALIMENTACAO: 'Alimentação 2026',
  ABA_ORIGEM_HOSPEDAGEM: 'Hospedagem 2026',

  // Planilha de Origem de Chamados (Atividades de Manutenção)
  ID_PLANILHA_CHAMADOS_ORIGEM: '1Q3QmbHUCgAXP9acDzfDuBCc69Ge2qPzrxwUmlSbtQWU',
  ABA_ORIGEM_CHAMADOS: 'CHAMADOS',
  ABA_DESTINO_ATIVIDADES: 'Atividades',
  FILTRAR_CHAMADOS_POR_COLABORADORES: true, // Se true, importa apenas chamados dos colaboradores de Custos_Totais
  IGNORAR_TECNOLOGIA_5_8: true,             // Se true, descarta chamados com tecnologia 5.8 (Coluna E)

  // Nomes das Abas na Planilha Mensal de Destino
  ABA_CUSTOS_TOTAIS: 'Custos_Totais',
  COLUNA_COLABORADORES: 1, // Coluna A (onde estão os nomes oficiais dos colaboradores)

  ABA_ABASTECIMENTO: 'Base_Abastecimento',
  ABA_MANUTENCAO: 'Base_Manutenção', // Aceita também Base_Manutencao
  ABA_VIAGENS: 'Base_Viagens'
};

// Alias de retrocompatibilidade
const CONFIG_FROTA = CONFIG_GERAL;


// ============================================================================
// 2. MENU SUPERIOR DO GOOGLE SHEETS (onOpen)
// ============================================================================
function onOpen() {
  try {
    const ui = SpreadsheetApp.getUi();
    ui.createMenu("💰 Gestão de Custos")
      .addItem("⚡ Importar Dados da Aba Atual", "importarAbaAtiva")
      .addSeparator()
      .addItem("🚗 Frota: Importar Combustível e Manutenção (Arquivo Unificado)", "importarDadosFrotaUnificada")
      .addItem("⛽ Frota: Importar Apenas Abastecimento", "importarDadosAbastecimento")
      .addItem("🔧 Frota: Importar Apenas Manutenção", "importarDadosManutencao")
      .addItem("✈️ Viagens: Importar Alimentação e Hospedagem (Desta Planilha)", "importarDadosViagens")
      .addItem("📋 Atividades: Importar Chamados de Manutenção (Desta Planilha)", "importarDadosChamadosAtividades")
      .addItem("🔄 Importar TUDO (Frota + Viagens + Atividades - Desta Planilha)", "importarTodosOsCustos")
      .addSeparator()
      .addItem("🌐 Sincronizar TODAS as Planilhas (Frota + Viagens + Atividades)", "sincronizarTodasPlanilhas")
      .addItem("🚗 Sincronizar Apenas Frota em TODAS (Julho em diante)", "sincronizarFrotaTodas")
      .addItem("✈️ Sincronizar Apenas Viagens em TODAS (Julho em diante)", "sincronizarViagensTodas")
      .addItem("📋 Sincronizar Apenas Chamados em TODAS (Julho em diante)", "sincronizarChamadosTodas")
      .addSeparator()
      .addItem("📁 Criar / Verificar Pastas no Google Drive", "configurarEstruturaPastasDrive")
      .addItem("📁 Reprocessar da Pasta 'Arquivos Processados' (Frota)", "reprocessarArquivosHistorico")
      .addItem("🧹 Limpar Dados da Aba Atual", "limparAbaAtualManual")
      .addSeparator()
      .addItem("🔍 Testar Conexões e Diagnóstico", "testarConexoes")
      .addToUi();
  } catch (e) {
    Logger.log("Menu UI não carregado: " + e.message);
  }
}

/**
 * Identifica a aba atual e executa a importação correspondente.
 */
function importarAbaAtiva() {
  var planilha = SpreadsheetApp.getActiveSpreadsheet();
  if (!planilha) {
    exibirAlerta("Erro: Nenhuma planilha ativa detectada.");
    return;
  }

  var abaAtiva = planilha.getActiveSheet();
  var nomeAba = abaAtiva ? abaAtiva.getName().toLowerCase() : "";

  if (nomeAba.indexOf("abastecimento") > -1 || nomeAba.indexOf("manuten") > -1) {
    importarDadosFrotaUnificada();
  } else if (nomeAba.indexOf("viagen") > -1 || nomeAba.indexOf("viagem") > -1) {
    importarDadosViagens();
  } else if (nomeAba.indexOf("atividade") > -1) {
    importarDadosChamadosAtividades();
  } else {
    var ui = SpreadsheetApp.getUi();
    var resposta = ui.alert(
      "Importação de Custos e Atividades",
      "Você está na aba '" + abaAtiva.getName() + "'.\n\n" +
      "Deseja importar TODOS os dados (Frota Unificada, Viagens e Chamados de Atividades) para o mês desta planilha?",
      ui.ButtonSet.YES_NO
    );

    if (resposta === ui.Button.YES) {
      importarTodosOsCustos();
    }
  }
}

/**
 * Executa todas as importações (Frota Unificada + Viagens) para a planilha atual.
 */
function importarTodosOsCustos() {
  Logger.log("Iniciando importação completa (Frota Unificada + Viagens + Chamados Atividades)...");
  importarDadosFrotaUnificada();
  importarDadosViagens();
  importarDadosChamadosAtividades();
}

/**
 * Limpa manualmente os dados da aba atual de forma inteligente e segura.
 * - Para Base_Viagens: limpa apenas da linha 3 em diante em A:C e F:H, preservando Coluna D ('nome corrigido') e Coluna E.
 * - Para outras abas: limpa da linha 2 em diante.
 */
function limparAbaAtualManual() {
  var planilha = SpreadsheetApp.getActiveSpreadsheet();
  if (!planilha) return;

  var aba = planilha.getActiveSheet();
  var nomeAba = aba ? aba.getName().toLowerCase() : "";
  var lastRow = aba.getLastRow();

  if (lastRow <= 1) {
    exibirAlerta("A aba '" + aba.getName() + "' já está vazia.");
    return;
  }

  var ui = SpreadsheetApp.getUi();

  if (nomeAba.indexOf("viagen") > -1 || nomeAba.indexOf("viagem") > -1) {
    if (lastRow <= 2) {
      exibirAlerta("A aba '" + aba.getName() + "' já contém apenas os cabeçalhos.");
      return;
    }
    var confirmacao = ui.alert(
      "Limpar Dados de Viagens",
      "Deseja limpar os lançamentos de Alimentação (A:C) e Hospedagem (F:H) da aba '" + aba.getName() + "' a partir da linha 3?\n\n" +
      "• Linhas 1 e 2 (Cabeçalhos) e Coluna D ('nome corrigido') serão mantidas intactas.",
      ui.ButtonSet.YES_NO
    );
    if (confirmacao === ui.Button.YES) {
      aba.getRange(3, 1, lastRow - 2, 3).clearContent();
      aba.getRange(3, 6, lastRow - 2, 3).clearContent();
      SpreadsheetApp.flush();
      exibirAlerta("Dados de Alimentação e Hospedagem da aba '" + aba.getName() + "' limpos com sucesso. Coluna D mantida intacta.");
    }
  } else if (nomeAba.indexOf("atividade") > -1) {
    if (lastRow <= 2) {
      exibirAlerta("A aba '" + aba.getName() + "' já contém apenas os cabeçalhos.");
      return;
    }
    var confirmacaoAtiv = ui.alert(
      "Limpar Dados de Atividades",
      "Deseja limpar os lançamentos de Manutenção da aba '" + aba.getName() + "' a partir da linha 3?\n\n" +
      "• Linhas 1 e 2 (Cabeçalhos) e lançamentos de 'Expansão' serão mantidos intactos.",
      ui.ButtonSet.YES_NO
    );
    if (confirmacaoAtiv === ui.Button.YES) {
      gravarDadosNaAbaAtividades(aba, []);
      SpreadsheetApp.flush();
      exibirAlerta("Chamados de Manutenção da aba '" + aba.getName() + "' limpos com sucesso. Expansões mantidas intactas.");
    }
  } else {
    var confirmacao2 = ui.alert(
      "Limpar Dados",
      "Deseja limpar todos os lançamentos da aba '" + aba.getName() + "' (a partir da linha 2)?",
      ui.ButtonSet.YES_NO
    );
    if (confirmacao2 === ui.Button.YES) {
      aba.getRange(2, 1, lastRow - 1, aba.getLastColumn()).clearContent();
      SpreadsheetApp.flush();
      exibirAlerta("Dados da aba '" + aba.getName() + "' limpos com sucesso.");
    }
  }
}

/**
 * Permite reprocessar arquivos de frota que já estão na pasta 'Arquivos Processados'.
 */
function reprocessarArquivosHistorico() {
  var ui = SpreadsheetApp.getUi();
  var resposta = ui.alert(
    "Reprocessar Histórico de Frota",
    "Esta opção lerá os arquivos (.xlsx e .csv) já processados na pasta de histórico e extrairá apenas os lançamentos do mês da planilha atual.\n\nDeseja continuar?",
    ui.ButtonSet.YES_NO
  );

  if (resposta === ui.Button.YES) {
    importarDadosFrotaUnificada(true);
  }
}

/**
 * Ação de menu para criar ou validar a estrutura de pastas no Drive.
 */
function configurarEstruturaPastasDrive() {
  obterOuCriarEstruturaPastasFrota(true);
}


// ============================================================================
// 3. GESTÃO DA ESTRUTURA DE PASTAS NO GOOGLE DRIVE
// ============================================================================

/**
 * Obtém ou cria a nova estrutura de pastas do Google Drive para Frota:
 * Pasta Principal: 'Frota Telefonia - Combustível e Manutenção' (recebe o arquivo unificado)
 * Subpasta: 'Arquivos Processados' (recebe o arquivo após a importação para evitar duplicidade)
 */
function obterOuCriarEstruturaPastasFrota(exibirAlertaUsuario) {
  var props = PropertiesService.getScriptProperties();
  var idOrigem = CONFIG_GERAL.PASTA_ORIGEM_FROTA || props.getProperty('PASTA_ORIGEM_FROTA_UNIFICADA');
  var idProcessados = CONFIG_GERAL.PASTA_PROCESSADOS_FROTA || props.getProperty('PASTA_PROCESSADOS_FROTA_UNIFICADA');

  var pastaOrigem = null;
  var pastaProcessados = null;
  var criadaAgora = false;

  // 1. Tenta recuperar pasta de origem por ID configurado ou salvo em Properties
  if (idOrigem) {
    try {
      pastaOrigem = DriveApp.getFolderById(idOrigem);
    } catch (e) {
      Logger.log("Aviso: Pasta de origem salva não pôde ser aberta: " + e.message);
      pastaOrigem = null;
    }
  }

  // 2. Se não existir, descobre o local pai ideal e cria a pasta principal
  if (!pastaOrigem) {
    var pastaPai = null;

    // Tenta encontrar a pasta pai onde ficavam as pastas anteriores de Combustível/Manutenção
    var idsTentativas = [
      CONFIG_GERAL.PASTA_ORIGEM_COMBUSTIVEL_LEGADA,
      CONFIG_GERAL.PASTA_ORIGEM_MANUTENCAO_LEGADA,
      CONFIG_GERAL.PASTA_RAIZ_2026
    ];

    for (var i = 0; i < idsTentativas.length; i++) {
      if (!idsTentativas[i]) continue;
      try {
        var pRef = DriveApp.getFolderById(idsTentativas[i]);
        var pais = pRef.getParents();
        if (pais.hasNext()) {
          pastaPai = pais.next();
          break;
        }
      } catch (e) {}
    }

    // Se achou uma pasta pai, verifica se já existe uma pasta com o nome definido
    if (pastaPai) {
      var existentes = pastaPai.getFoldersByName(CONFIG_GERAL.NOME_PASTA_FROTA);
      if (existentes.hasNext()) {
        pastaOrigem = existentes.next();
      } else {
        pastaOrigem = pastaPai.createFolder(CONFIG_GERAL.NOME_PASTA_FROTA);
        criadaAgora = true;
      }
    } else {
      // Se não encontrou pai específico, busca ou cria na raiz do Drive
      var raiz = DriveApp.getRootFolder();
      var existentesRaiz = raiz.getFoldersByName(CONFIG_GERAL.NOME_PASTA_FROTA);
      if (existentesRaiz.hasNext()) {
        pastaOrigem = existentesRaiz.next();
      } else {
        pastaOrigem = raiz.createFolder(CONFIG_GERAL.NOME_PASTA_FROTA);
        criadaAgora = true;
      }
    }

    // Salva o ID da nova pasta de origem em PropertiesService
    props.setProperty('PASTA_ORIGEM_FROTA_UNIFICADA', pastaOrigem.getId());
  }

  // 3. Obtém ou cria a subpasta 'Arquivos Processados' dentro da pasta de origem
  if (idProcessados) {
    try {
      pastaProcessados = DriveApp.getFolderById(idProcessados);
    } catch (e) {
      pastaProcessados = null;
    }
  }

  if (!pastaProcessados) {
    var subExistentes = pastaOrigem.getFoldersByName(CONFIG_GERAL.NOME_SUBPASTA_PROCESSADOS);
    if (subExistentes.hasNext()) {
      pastaProcessados = subExistentes.next();
    } else {
      pastaProcessados = pastaOrigem.createFolder(CONFIG_GERAL.NOME_SUBPASTA_PROCESSADOS);
    }
    props.setProperty('PASTA_PROCESSADOS_FROTA_UNIFICADA', pastaProcessados.getId());
  }

  if (exibirAlertaUsuario) {
    var msg = (criadaAgora ? "✨ Nova estrutura de pastas criada no Google Drive com sucesso!\n\n" : "📁 Estrutura de Pastas Unificada (Frota):\n\n") +
              "• 📂 Pasta Principal (onde adicionar o arquivo único de Combustível + Manutenção):\n" +
              "  Nome: " + pastaOrigem.getName() + "\n" +
              "  ID: " + pastaOrigem.getId() + "\n" +
              "  Link: " + pastaOrigem.getUrl() + "\n\n" +
              "• 📁 Subpasta de Histórico (recebe o arquivo após importação):\n" +
              "  Nome: " + pastaProcessados.getName() + "\n" +
              "  ID: " + pastaProcessados.getId() + "\n" +
              "  Link: " + pastaProcessados.getUrl() + "\n\n" +
              "ℹ️ Os IDs foram salvos nas propriedades do projeto.";
    Logger.log(msg);
    exibirAlerta(msg);
  }

  return {
    pastaOrigem: pastaOrigem,
    pastaProcessados: pastaProcessados,
    criadaAgora: criadaAgora
  };
}


// ============================================================================
// 4. IMPORTAÇÃO DE FROTA UNIFICADA (Combustível e Manutenção em Arquivo Único)
// ============================================================================

/**
 * Importa o arquivo unificado contendo despesas de Combustível e Manutenção.
 * - Classifica os registros pela Coluna C (NOME REDUZIDO: 'BRISANET ABASTECIMENTO' ou 'BRISANET MANUTENCAO')
 * - Extrai o motorista da Coluna K
 * - Grava na aba 'Base_Abastecimento' e na aba 'Base_Manutenção' da linha 2 em diante.
 * - Move o arquivo processado para a subpasta 'Arquivos Processados'.
 */
function importarDadosFrotaUnificada(lerDeProcessados, tipoFiltroOpcional) {
  Logger.log("Iniciando importação de FROTA UNIFICADA (Combustível e Manutenção)...");

  // 1. Obter planilha e identificar mês/ano de competência
  var planilha = obterPlanilhaAlvo();
  if (!planilha) {
    exibirAlerta("Erro: Não foi possível identificar a planilha de destino.");
    return;
  }

  var mesAlvo = obterMesAlvoDaPlanilha(planilha);
  Logger.log("Mês alvo identificado na planilha: " + mesAlvo.nome + " (" + mesAlvo.codigo + "/" + mesAlvo.ano + ")");

  if (parseInt(mesAlvo.codigo, 10) < CONFIG_GERAL.MES_INICIAL_REGRA) {
    exibirAlerta(
      "Atenção: A planilha ativa refere-se a " + mesAlvo.nome + ".\n\n" +
      "A automação de custos está configurada exclusivamente para planilhas a partir de JULHO/2026.\n" +
      "As planilhas de meses anteriores possuem um formato diferente e foram mantidas intactas."
    );
    return;
  }

  var abaAbast = obterAbaPorNomes(planilha, [CONFIG_GERAL.ABA_ABASTECIMENTO, 'Base_Abastecimento', 'Base Abastecimento']);
  var abaManut = obterAbaPorNomes(planilha, [CONFIG_GERAL.ABA_MANUTENCAO, 'Base_Manutenção', 'Base_Manutencao', 'Base Manutenção']);

  if (!abaAbast && !abaManut) {
    exibirAlerta("Erro: Nem a aba '" + CONFIG_GERAL.ABA_ABASTECIMENTO + "' nem a aba '" + CONFIG_GERAL.ABA_MANUTENCAO + "' foram encontradas nesta planilha.");
    return;
  }

  // 2. Carregar colaboradores de referência da aba Custos_Totais (Coluna A)
  var mapaColaboradores = carregarListaColaboradores(planilha);
  if (Object.keys(mapaColaboradores).length === 0) {
    exibirAlerta("Atenção: Nenhum colaborador foi encontrado na aba '" + CONFIG_GERAL.ABA_CUSTOS_TOTAIS + "' (Coluna A).\nVerifique se a aba está preenchida.");
    return;
  }

  // 3. Obter ou criar a estrutura de pastas unificada da frota
  var estruturaPastas = obterOuCriarEstruturaPastasFrota(false);
  var pastaOrigem = estruturaPastas.pastaOrigem;
  var pastaProcessados = estruturaPastas.pastaProcessados;

  var pastaLeitura = (lerDeProcessados === true) ? pastaProcessados : pastaOrigem;
  var arquivos = pastaLeitura.getFiles();

  if (!arquivos.hasNext() && !lerDeProcessados) {
    var ui = SpreadsheetApp.getUi();
    var resp = ui.alert(
      "Nenhum Arquivo Novo na Pasta Unificada",
      "Não há arquivos (.xlsx ou .csv) na pasta unificada:\n'" + pastaOrigem.getName() + "'\n\n" +
      "• Link da Pasta: " + pastaOrigem.getUrl() + "\n\n" +
      "Deseja buscar nos arquivos já processados para extrair os lançamentos de " + mesAlvo.nome + "?",
      ui.ButtonSet.YES_NO
    );
    if (resp === ui.Button.YES) {
      importarDadosFrotaUnificada(true, tipoFiltroOpcional);
      return;
    } else {
      return;
    }
  }

  var linhasAbast = [];
  var linhasManut = [];
  var nomesIgnorados = {};
  var stats = { linhasOutrosMeses: 0, totalLidos: 0 };
  var totalArquivos = 0;

  while (arquivos.hasNext()) {
    var arquivo = arquivos.next();
    var nomeArquivo = arquivo.getName();
    var nomeLower = nomeArquivo.toLowerCase();

    if (nomeLower.indexOf('.xlsx') > -1 || nomeLower.indexOf('.csv') > -1) {
      if (arquivo.getSize() === 0) {
        Logger.log("Arquivo vazio ignorado: " + nomeArquivo);
        continue;
      }

      try {
        var dadosLidos = processarArquivoFrotaUnificadaEmLotes(arquivo, mapaColaboradores, mesAlvo, nomesIgnorados, stats);

        if (dadosLidos.abastecimento && dadosLidos.abastecimento.length > 0) {
          for (var a = 0; a < dadosLidos.abastecimento.length; a++) {
            linhasAbast.push(dadosLidos.abastecimento[a]);
          }
        }

        if (dadosLidos.manutencao && dadosLidos.manutencao.length > 0) {
          for (var m = 0; m < dadosLidos.manutencao.length; m++) {
            linhasManut.push(dadosLidos.manutencao[m]);
          }
        }

        totalArquivos++;

        if (!lerDeProcessados) {
          arquivo.moveTo(pastaProcessados);
        }
      } catch (e) {
        Logger.log("Erro ao processar arquivo unificado " + nomeArquivo + ": " + e.toString());
      }
    }
  }

  // 4. REGRA DE LIMPEZA E RELANÇAMENTO (Sem acúmulo / sem duplicidade)
  var atualizouAbast = false;
  var atualizouManut = false;

  if (abaAbast && (!tipoFiltroOpcional || tipoFiltroOpcional === 'ABASTECIMENTO' || tipoFiltroOpcional === 'AMBOS')) {
    gravarLinhasNaAba(abaAbast, linhasAbast, 4, ['NOME MOTORISTA', 'VALOR EMISSAO', 'PERÍODO', 'DATA/HORA']);
    atualizouAbast = true;
  }

  if (abaManut && (!tipoFiltroOpcional || tipoFiltroOpcional === 'MANUTENCAO' || tipoFiltroOpcional === 'AMBOS')) {
    gravarLinhasNaAba(abaManut, linhasManut, 5, ['NOME MOTORISTA', 'VALOR EMISSAO', 'TIPO ESTABELECIMENTO', 'PERÍODO', 'DATA/HORA']);
    atualizouManut = true;
  }

  var msgSucesso = "✅ Importação de Frota Unificada Concluída para " + mesAlvo.nome + "!\n\n";
  if (atualizouAbast) {
    msgSucesso += "• ⛽ Abastecimento: " + linhasAbast.length + " registro(s) lançados em 'Base_Abastecimento'\n";
  }
  if (atualizouManut) {
    msgSucesso += "• 🔧 Manutenção: " + linhasManut.length + " registro(s) lançados em 'Base_Manutenção'\n";
  }
  msgSucesso += "\n• Arquivos analisados: " + totalArquivos + "\n" +
                "• Linhas totais analisadas: " + stats.totalLidos + "\n" +
                "• Registros de outros meses desconsiderados: " + stats.linhasOutrosMeses;

  Logger.log(msgSucesso);
  exibirAlerta(msgSucesso);

  var listaIgnorados = Object.keys(nomesIgnorados);
  if (listaIgnorados.length > 0) {
    Logger.log("Motoristas nos arquivos que não constam em Custos_Totais: " + listaIgnorados.join(", "));
  }
}

/**
 * Funções de compatibilidade para importar apenas Abastecimento ou apenas Manutenção
 */
function importarDadosAbastecimento(lerDeProcessados) {
  importarDadosFrotaUnificada(lerDeProcessados, 'ABASTECIMENTO');
}

function importarDadosManutencao(lerDeProcessados) {
  importarDadosFrotaUnificada(lerDeProcessados, 'MANUTENCAO');
}


// ============================================================================
// 5. IMPORTAÇÃO DE VIAGENS (Alimentação e Hospedagem - Aba: Base_Viagens)
// ============================================================================

/**
 * Importa os custos de Alimentação e Hospedagem da planilha de Viagens
 * para a aba 'Base_Viagens' da planilha mensal ativa.
 */
function importarDadosViagens(planilhaAlvo, silencioso) {
  Logger.log("Iniciando importação de VIAGENS (Alimentação e Hospedagem)...");

  var planilha = planilhaAlvo || obterPlanilhaAlvo();
  if (!planilha) {
    if (!silencioso) exibirAlerta("Erro: Não foi possível identificar a planilha de destino.");
    return { alimentacao: 0, hospedagem: 0, erro: "Planilha alvo não encontrada" };
  }

  var mesAlvo = obterMesAlvoDaPlanilha(planilha);
  Logger.log("Mês alvo identificado na planilha: " + mesAlvo.nome + " (" + mesAlvo.codigo + "/" + mesAlvo.ano + ")");

  if (parseInt(mesAlvo.codigo, 10) < CONFIG_GERAL.MES_INICIAL_REGRA) {
    if (!silencioso) {
      exibirAlerta(
        "Atenção: A planilha ativa refere-se a " + mesAlvo.nome + ".\n\n" +
        "A automação de custos de viagens está configurada exclusivamente para planilhas a partir de JULHO/2026.\n" +
        "As planilhas de meses anteriores possuem um formato diferente e foram mantidas intactas."
      );
    }
    return { alimentacao: 0, hospedagem: 0, erro: "Mês anterior a Julho" };
  }

  var abaDestino = obterAbaPorNomes(planilha, [CONFIG_GERAL.ABA_VIAGENS, 'Base_Viagens', 'Base Viagens', 'Viagens']);
  if (!abaDestino) {
    if (!silencioso) exibirAlerta("Erro: A aba '" + CONFIG_GERAL.ABA_VIAGENS + "' não foi encontrada na planilha '" + planilha.getName() + "'.");
    return { alimentacao: 0, hospedagem: 0, erro: "Aba Base_Viagens não encontrada" };
  }

  // 1. Carregar lista de colaboradores de referência da aba Custos_Totais (Coluna A)
  var mapaColaboradores = carregarListaColaboradores(planilha);
  if (Object.keys(mapaColaboradores).length === 0) {
    if (!silencioso) {
      exibirAlerta("Atenção: Nenhum colaborador foi encontrado na aba '" + CONFIG_GERAL.ABA_CUSTOS_TOTAIS + "' (Coluna A).\nVerifique se a aba está preenchida.");
    }
    return { alimentacao: 0, hospedagem: 0, erro: "Sem colaboradores em Custos_Totais" };
  }

  // 2. Conectar à planilha de origem de Viagens
  var ssOrigem;
  try {
    ssOrigem = SpreadsheetApp.openById(CONFIG_GERAL.ID_PLANILHA_VIAGENS_ORIGEM);
  } catch (e) {
    var errOrigem = "Erro ao acessar a planilha de viagens de origem (" + CONFIG_GERAL.ID_PLANILHA_VIAGENS_ORIGEM + "): " + e.message;
    Logger.log(errOrigem);
    if (!silencioso) exibirAlerta(errOrigem);
    return { alimentacao: 0, hospedagem: 0, erro: errOrigem };
  }

  // 3. Extrair dados de Alimentação
  var dadosAlimentacao = extrairRegistrosViagensOrigem(
    ssOrigem,
    [CONFIG_GERAL.ABA_ORIGEM_ALIMENTACAO, 'Alimentação 2026', 'Alimentacao 2026', 'Alimentação', 'Alimentacao'],
    'ALIMENTACAO',
    mesAlvo,
    mapaColaboradores
  );

  // 4. Extrair dados de Hospedagem
  var dadosHospedagem = extrairRegistrosViagensOrigem(
    ssOrigem,
    [CONFIG_GERAL.ABA_ORIGEM_HOSPEDAGEM, 'Hospedagem 2026', 'Hospedagem', 'Hospedagens 2026', 'Hospedagens'],
    'HOSPEDAGEM',
    mesAlvo,
    mapaColaboradores
  );

  // 5. Gravar dados na aba Base_Viagens (limpando linha 3+ em A:C e F:H e mantendo Coluna D intacta)
  gravarDadosNaAbaViagens(abaDestino, dadosAlimentacao.linhas, dadosHospedagem.linhas);

  var totalAlim = dadosAlimentacao.linhas.length;
  var totalHosp = dadosHospedagem.linhas.length;

  var msgSucesso = "✅ Sucesso! Lançamentos de Viagens de " + mesAlvo.nome + " importados para 'Base_Viagens':\n\n" +
                   "🍽️ Alimentação (Colunas A a C): " + totalAlim + " registro(s)\n" +
                   "🏨 Hospedagem (Colunas F a H): " + totalHosp + " registro(s)\n\n" +
                   "• Linhas 1 e 2 (Cabeçalhos) e Coluna D ('nome corrigido') foram mantidas intactas.\n" +
                   "• Registros filtrados exclusivamente pelos colaboradores de 'Custos_Totais' e competência de " + mesAlvo.nome + ".";

  Logger.log(msgSucesso);
  if (!silencioso) exibirAlerta(msgSucesso);

  return { alimentacao: totalAlim, hospedagem: totalHosp };
}

/**
 * Lê uma aba de origem da planilha de Viagens (Alimentação ou Hospedagem),
 * filtra rigorosamente pelo colaborador e pelo mês da competência.
 */
function extrairRegistrosViagensOrigem(ssOrigem, nomesPossiveisAba, tipoViagem, mesAlvo, mapaColaboradores) {
  var aba = obterAbaPorNomes(ssOrigem, nomesPossiveisAba);
  if (!aba) {
    Logger.log("Aba de viagens '" + nomesPossiveisAba.join(" / ") + "' não encontrada na origem.");
    return { linhas: [] };
  }

  var totalLinhas = aba.getLastRow();
  var totalColunas = aba.getLastColumn();

  if (totalLinhas <= 1 || totalColunas === 0) {
    return { linhas: [] };
  }

  // 1. Mapeamento das colunas pelo cabeçalho
  var cabecalho = aba.getRange(1, 1, 1, totalColunas).getValues()[0];

  var idxColaborador = -1;
  var idxValorDiaria = -1;
  var idxValorTotal = -1;
  var idxValorGenerico = -1;
  var idxMesSap = -1;
  var idxMesRef = -1;

  for (var c = 0; c < cabecalho.length; c++) {
    var col = padronizarTexto(cabecalho[c]);
    if (!col) continue;

    // 1. Mapeamento exato pelos nomes oficiais da planilha
    if (col === 'COLABORADOR') {
      idxColaborador = c;
    } else if (col === 'VALOR DIARIA') {
      idxValorDiaria = c;
    } else if (col === 'VALOR TOTAL') {
      idxValorTotal = c;
    } else if (col === 'MES DE LANCAMENTO - SAP' || col === 'MES DO LANCAMENTO - SAP') {
      idxMesSap = c;
    } else if (col === 'MES DE REFERENCIA') {
      idxMesRef = c;
    }

    // 2. Mapeamentos complementares e flexíveis
    if (idxColaborador === -1) {
      if (col === 'NOME' || col === 'SOLICITANTE' || col === 'FUNCIONARIO' || col === 'NOME COLABORADOR' || col === 'NOME DO COLABORADOR') {
        idxColaborador = c;
      } else if (col.indexOf('COLABORADOR') > -1) {
        idxColaborador = c;
      }
    }

    // Identifica se a coluna é de quantidade ou número de dias (NUNCA deve ser tratada como valor em R$)
    var ehContagem = (
      col.indexOf('QUANTIDADE') > -1 ||
      col.indexOf('QTD') > -1 ||
      col.indexOf('NUMERO') > -1 ||
      col.indexOf('NUM') > -1 ||
      col.indexOf('Nº') > -1 ||
      col.indexOf('TOTAL DIAR') > -1 ||
      (col.indexOf('DIAR') > -1 && col.indexOf('VALOR') === -1) ||
      (col.indexOf('DIAS') > -1 && col.indexOf('VALOR') === -1)
    );

    if (!ehContagem) {
      // VALOR DA DIÁRIA (específico de hospedagem: 'VALOR DIARIA', 'VALOR DA DIARIA', 'VALOR DE DIARIA')
      if (idxValorDiaria === -1 && col.indexOf('VALOR') > -1 && col.indexOf('DIAR') > -1) {
        idxValorDiaria = c;
      }
      // VALOR TOTAL (ex: 'VALOR TOTAL', 'TOTAL SOLICITADO', 'TOTAL PAGO')
      else if (idxValorTotal === -1 && (col === 'VALOR TOTAL' || col.indexOf('VALOR TOTAL') > -1)) {
        idxValorTotal = c;
      }
      // VALOR GENÉRICO (ex: 'VALOR', 'VALOR PAGO', 'VALOR LIQUIDO', 'VALOR SOLICITADO')
      else if (idxValorGenerico === -1 && col.indexOf('VALOR') > -1) {
        idxValorGenerico = c;
      }
    }

    // Mês do Lançamento SAP
    if (idxMesSap === -1 && (col.indexOf('SAP') > -1 || col.indexOf('LANCAMENTO') > -1 || col.indexOf('LANÇAMENTO') > -1)) {
      idxMesSap = c;
    }

    // Mês de Referência (fallback)
    if (idxMesRef === -1 && (col.indexOf('REFERENCIA') > -1 || col.indexOf('REFERÊNCIA') > -1 || col.indexOf('PERIODO') > -1 || col.indexOf('PERÍODO') > -1 || col === 'MES' || col === 'MÊS')) {
      idxMesRef = c;
    }
  }

  // Define a coluna correta de valor de acordo com o tipo da despesa
  var idxValorEscolhido = -1;
  if (tipoViagem === 'HOSPEDAGEM') {
    // Na hospedagem, a prioridade máxima é a coluna de diária ('VALOR DIARIA')
    if (idxValorDiaria !== -1) {
      idxValorEscolhido = idxValorDiaria;
    } else if (idxValorTotal !== -1) {
      idxValorEscolhido = idxValorTotal;
    } else {
      idxValorEscolhido = idxValorGenerico;
    }
  } else {
    // Na alimentação, a prioridade é o valor total
    if (idxValorTotal !== -1) {
      idxValorEscolhido = idxValorTotal;
    } else if (idxValorGenerico !== -1) {
      idxValorEscolhido = idxValorGenerico;
    } else {
      idxValorEscolhido = idxValorDiaria;
    }
  }

  if (idxColaborador === -1 || idxValorEscolhido === -1) {
    Logger.log("Colunas essenciais não mapeadas na aba de viagens (" + tipoViagem + "). Colaborador=" + idxColaborador + ", Valor=" + idxValorEscolhido);
    return { linhas: [] };
  }

  var idxMesEscolhido = idxMesSap !== -1 ? idxMesSap : idxMesRef;

  var linhasFiltradas = [];

  // 2. Leitura em lotes de 2.000 linhas
  var TAMANHO_LOTE = 2000;
  for (var inicio = 2; inicio <= totalLinhas; inicio += TAMANHO_LOTE) {
    var qtd = Math.min(TAMANHO_LOTE, totalLinhas - inicio + 1);
    var bloco = aba.getRange(inicio, 1, qtd, totalColunas).getValues();

    for (var r = 0; r < bloco.length; r++) {
      var linha = bloco[r];
      if (!linha || linha.length === 0) continue;

      var nomeOriginal = linha[idxColaborador] ? linha[idxColaborador].toString().trim() : "";
      if (!nomeOriginal) continue;

      var nomePadronizado = padronizarTexto(nomeOriginal);

      // 1º FILTRO: Colaborador precisa constar na aba Custos_Totais
      if (!mapaColaboradores.hasOwnProperty(nomePadronizado)) {
        continue;
      }

      // 2º FILTRO: Mês do Lançamento SAP (ou Referência)
      var mesRaw = idxMesEscolhido !== -1 ? linha[idxMesEscolhido] : "";
      var ehDoMes = valorPertenceAoMesViagens(mesRaw, mesAlvo);

      if (!ehDoMes) {
        continue;
      }

      var valorRaw = linha[idxValorEscolhido];
      var valorFormatado = formatarValorNumerico(valorRaw);

      if (valorFormatado === 0 && (valorRaw === "" || valorRaw === null || valorRaw === undefined)) {
        continue;
      }

      var mesSapStr = mesRaw ? mesRaw.toString().trim() : mesAlvo.nome;

      linhasFiltradas.push([
        nomeOriginal,
        valorFormatado,
        mesSapStr
      ]);
    }

    bloco = null;
  }

  return { linhas: linhasFiltradas };
}

/**
 * Grava os lançamentos de Alimentação e Hospedagem na aba 'Base_Viagens'.
 * - Limpa rigorosamente da linha 3 em diante em A:C e F:H.
 * - Preserva cabeçalhos (linhas 1 e 2), Coluna D ('nome corrigido') e Coluna E intactas.
 */
function gravarDadosNaAbaViagens(abaViagens, linhasAlimentacao, linhasHospedagem) {
  var lastRowAtual = abaViagens.getLastRow();

  // 1. Limpa dados anteriores da linha 3 em diante (apenas A:C e F:H)
  if (lastRowAtual > 2) {
    abaViagens.getRange(3, 1, lastRowAtual - 2, 3).clearContent(); // A:C (Alimentação)
    abaViagens.getRange(3, 6, lastRowAtual - 2, 3).clearContent(); // F:H (Hospedagem)
    SpreadsheetApp.flush();
  }

  // 2. Garante cabeçalhos estruturais se a aba estiver em branco
  if (abaViagens.getLastRow() === 0) {
    abaViagens.getRange(1, 1, 1, 3).setValues([['Alimentação', '', '']]);
    abaViagens.getRange(1, 6, 1, 3).setValues([['Hospedagem', '', '']]);
    abaViagens.getRange(2, 1, 1, 8).setValues([[
      'COLABORADOR', 'VALOR TOTAL', 'MÊS DO LANÇAMENTO - SAP',
      'nome corrigido', '',
      'COLABORADOR', 'VALOR DIÁRIA', 'MÊS DO LANÇAMENTO - SAP'
    ]]);
  }

  // 3. Grava Alimentação (Colunas A, B, C a partir da linha 3)
  if (linhasAlimentacao && linhasAlimentacao.length > 0) {
    abaViagens.getRange(3, 1, linhasAlimentacao.length, 3).setValues(linhasAlimentacao);
    abaViagens.getRange(3, 2, linhasAlimentacao.length, 1).setNumberFormat('"R$"\\ #,##0.00');
  }

  // 4. Grava Hospedagem (Colunas F, G, H a partir da linha 3)
  if (linhasHospedagem && linhasHospedagem.length > 0) {
    abaViagens.getRange(3, 6, linhasHospedagem.length, 3).setValues(linhasHospedagem);
    abaViagens.getRange(3, 7, linhasHospedagem.length, 1).setNumberFormat('"R$"\\ #,##0.00');
  }
}

/**
 * Valida se um valor de mês da planilha de viagens corresponde ao mês alvo.
 */
function valorPertenceAoMesViagens(valorRaw, mesAlvo) {
  if (valorRaw === null || valorRaw === undefined || valorRaw === "") return false;

  // Se for Date
  if (Object.prototype.toString.call(valorRaw) === '[object Date]') {
    var mesZeroIdx = valorRaw.getMonth();
    var mesCod = String(mesZeroIdx + 1);
    if (mesCod.length === 1) mesCod = '0' + mesCod;
    return mesCod === mesAlvo.codigo;
  }

  var str = padronizarTexto(valorRaw);
  if (!str) return false;

  // 1. Busca pelo nome do mês
  if (str.indexOf(mesAlvo.nome) > -1) return true;

  // 2. Busca pelo código de 2 dígitos (ex: /10/ ou -10- ou 10/2026)
  if (str.indexOf('/' + mesAlvo.codigo + '/') > -1 ||
      str.indexOf('-' + mesAlvo.codigo + '-') > -1 ||
      str.indexOf('/' + mesAlvo.codigo) > -1 ||
      str.indexOf(mesAlvo.codigo + '/') > -1) {
    return true;
  }

  // 3. Verificação de número isolado
  var num = parseInt(str, 10);
  if (!isNaN(num) && num === parseInt(mesAlvo.codigo, 10)) {
    return true;
  }

  // 4. Mapeamento de nomes de meses em texto
  var mesesNomes = [
    { cod: '01', nomes: ['JANEIRO', 'JAN'] },
    { cod: '02', nomes: ['FEVEREIRO', 'FEV'] },
    { cod: '03', nomes: ['MARCO', 'MAR'] },
    { cod: '04', nomes: ['ABRIL', 'ABR'] },
    { cod: '05', nomes: ['MAIO', 'MAI'] },
    { cod: '06', nomes: ['JUNHO', 'JUN'] },
    { cod: '07', nomes: ['JULHO', 'JUL'] },
    { cod: '08', nomes: ['AGOSTO', 'AGO'] },
    { cod: '09', nomes: ['SETEMBRO', 'SET'] },
    { cod: '10', nomes: ['OUTUBRO', 'OUT'] },
    { cod: '11', nomes: ['NOVEMBRO', 'NOV'] },
    { cod: '12', nomes: ['DEZEMBRO', 'DEZ'] }
  ];

  for (var m = 0; m < mesesNomes.length; m++) {
    var item = mesesNomes[m];
    for (var n = 0; n < item.nomes.length; n++) {
      if (str.indexOf(item.nomes[n]) > -1) {
        return item.cod === mesAlvo.codigo;
      }
    }
  }

  return false;
}



// ============================================================================
// 6. IMPORTAÇÃO DE CHAMADOS / ATIVIDADES DE MANUTENÇÃO (Aba: Atividades)
// ============================================================================

/**
 * Mapeamento de Estados/UFs para Código de Projeto e Diagrama de Rede do Setor.
 */
const MAPA_UF_PROJETO_ATIVIDADES = {
  'CEARA': { proj: 'CE01', diag: '4023987 0020', estado: 'Ceará' },
  'CE': { proj: 'CE01', diag: '4023987 0020', estado: 'Ceará' },
  'RIO GRANDE DO NORTE': { proj: 'RN01', diag: '4023989 0020', estado: 'Rio Grande do Norte' },
  'RN': { proj: 'RN01', diag: '4023989 0020', estado: 'Rio Grande do Norte' },
  'PARAIBA': { proj: 'PB01', diag: '4023990 0020', estado: 'Paraíba' },
  'PB': { proj: 'PB01', diag: '4023990 0020', estado: 'Paraíba' },
  'PERNAMBUCO': { proj: 'PE01', diag: '4023995 0020', estado: 'Pernambuco' },
  'PE': { proj: 'PE01', diag: '4023995 0020', estado: 'Pernambuco' },
  'PIAUI': { proj: 'PI01', diag: '4023991 0020', estado: 'Piauí' },
  'PI': { proj: 'PI01', diag: '4023991 0020', estado: 'Piauí' }
};

/**
 * Importa os chamados de manutenção da planilha de Chamados
 * para a aba 'Atividades' da planilha mensal ativa.
 */
function importarDadosChamadosAtividades(planilhaAlvo, silencioso) {
  Logger.log("Iniciando importação de CHAMADOS (Aba Atividades)...");

  var planilha = planilhaAlvo || obterPlanilhaAlvo();
  if (!planilha) {
    if (!silencioso) exibirAlerta("Erro: Não foi possível identificar a planilha de destino.");
    return { chamados: 0, expansao: 0, erro: "Planilha alvo não encontrada" };
  }

  var mesAlvo = obterMesAlvoDaPlanilha(planilha);
  Logger.log("Mês alvo identificado na planilha: " + mesAlvo.nome + " (" + mesAlvo.codigo + "/" + mesAlvo.ano + ")");

  if (parseInt(mesAlvo.codigo, 10) < CONFIG_GERAL.MES_INICIAL_REGRA) {
    if (!silencioso) {
      exibirAlerta(
        "Atenção: A planilha ativa refere-se a " + mesAlvo.nome + ".\n\n" +
        "A automação de atividades está configurada exclusivamente para planilhas a partir de JULHO/2026.\n" +
        "As planilhas de meses anteriores possuem um formato diferente e foram mantidas intactas."
      );
    }
    return { chamados: 0, expansao: 0, erro: "Mês anterior a Julho" };
  }

  var abaAtividades = obterAbaPorNomes(planilha, [CONFIG_GERAL.ABA_DESTINO_ATIVIDADES, 'Atividades', 'ATIVIDADES']);
  if (!abaAtividades) {
    if (!silencioso) exibirAlerta("Erro: A aba '" + CONFIG_GERAL.ABA_DESTINO_ATIVIDADES + "' não foi encontrada na planilha '" + planilha.getName() + "'.");
    return { chamados: 0, expansao: 0, erro: "Aba Atividades não encontrada" };
  }

  // 1. Carregar colaboradores e equipes da aba Custos_Totais
  var mapaColaboradoresEquipes = carregarMapaEquipesColaboradores(planilha);
  if (Object.keys(mapaColaboradoresEquipes).length === 0) {
    if (!silencioso) {
      exibirAlerta("Atenção: Nenhum colaborador foi encontrado na aba '" + CONFIG_GERAL.ABA_CUSTOS_TOTAIS + "'.\nVerifique se a aba está preenchida.");
    }
    return { chamados: 0, expansao: 0, erro: "Sem colaboradores em Custos_Totais" };
  }

  // 2. Conectar à planilha de origem de Chamados
  var ssOrigem;
  try {
    ssOrigem = SpreadsheetApp.openById(CONFIG_GERAL.ID_PLANILHA_CHAMADOS_ORIGEM);
  } catch (e) {
    var errOrigem = "Erro ao acessar a planilha de chamados de origem (" + CONFIG_GERAL.ID_PLANILHA_CHAMADOS_ORIGEM + "): " + e.message;
    Logger.log(errOrigem);
    if (!silencioso) exibirAlerta(errOrigem);
    return { chamados: 0, expansao: 0, erro: errOrigem };
  }

  // 3. Extrair chamados de manutenção para o mês alvo
  var registrosChamados;
  try {
    registrosChamados = extrairRegistrosChamadosOrigem(ssOrigem, mesAlvo, mapaColaboradoresEquipes);
  } catch (e) {
    var errExtrair = "Erro ao extrair chamados da aba '" + CONFIG_GERAL.ABA_ORIGEM_CHAMADOS + "': " + e.message;
    Logger.log(errExtrair);
    if (!silencioso) exibirAlerta(errExtrair);
    return { chamados: 0, expansao: 0, erro: errExtrair };
  }

  // 4. Gravar na aba Atividades (preservando linhas de Expansão)
  var resultadoGravacao = gravarDadosNaAbaAtividades(abaAtividades, registrosChamados);

  SpreadsheetApp.flush();

  var resumo = "🎉 Importação de Atividades Concluída!\n\n" +
               "Planilha: " + planilha.getName() + "\n" +
               "Mês: " + mesAlvo.nome + "/" + mesAlvo.ano + "\n\n" +
               "• 📋 Chamados de Manutenção importados: " + resultadoGravacao.manutencaoInserida + "\n" +
               "• 🏗️ Linhas de Expansão preservadas: " + resultadoGravacao.expansaoPreservada + "\n" +
               "• 📊 Total de atividades na aba: " + resultadoGravacao.totalGravado + "\n\n" +
               "ℹ️ Todos os chamados foram classificados como Tipo 'Manutenção' e Categoria 'CAPEX'.";

  Logger.log(resumo);
  if (!silencioso) {
    exibirAlerta(resumo);
  }

  return {
    chamados: resultadoGravacao.manutencaoInserida,
    expansao: resultadoGravacao.expansaoPreservada,
    total: resultadoGravacao.totalGravado
  };
}

/**
 * Extrai e filtra os chamados da planilha de origem para o mês da planilha alvo.
 */
function extrairRegistrosChamadosOrigem(ssOrigem, mesAlvo, mapaColaboradoresEquipes) {
  var abaChamados = obterAbaPorNomes(ssOrigem, [CONFIG_GERAL.ABA_ORIGEM_CHAMADOS, 'CHAMADOS', 'Chamados']);
  if (!abaChamados) {
    throw new Error("Aba '" + CONFIG_GERAL.ABA_ORIGEM_CHAMADOS + "' não encontrada na planilha de origem.");
  }

  var valores = abaChamados.getDataRange().getValues();
  if (!valores || valores.length <= 1) {
    return [];
  }

  // 1. Identificar a linha de cabeçalho dinamicamente nas primeiras 5 linhas
  var linhaCabecalho = -1;
  var colMap = {
    chamado: 0,
    site: 1,
    tecnologia: 4,
    uf: 6,
    horasTrabalhadas: 13,
    mes: 14,
    ano: 15,
    categoria: 17,
    colaborador: 20,
    equipe: 21,
    abertura: 7,
    atendimento: 9
  };

  for (var r = 0; r < Math.min(5, valores.length); r++) {
    var linha = valores[r];
    var linhaTxt = linha.map(function(c) { return padronizarTexto(c); });
    var achouChamado = false;
    for (var c = 0; c < linhaTxt.length; c++) {
      var h = linhaTxt[c];
      if (h === "NO DO CHAMADO" || h === "Nº DO CHAMADO" || h === "NUMERO DO CHAMADO" || h === "CHAMADO" || (h.indexOf("CHAMADO") > -1 && h.indexOf("ORIGEM") === -1 && h.indexOf("FINALIZADO") === -1)) {
        colMap.chamado = c;
        achouChamado = true;
      }
      else if (h === "SITE") { colMap.site = c; }
      else if (h === "TECNOLOGIA") { colMap.tecnologia = c; }
      else if (h === "UF" || h === "ESTADO") { colMap.uf = c; }
      else if (h.indexOf("HORAS TRABALHADA") > -1 || h === "HORAS") { colMap.horasTrabalhadas = c; }
      else if (h === "MES") { colMap.mes = c; }
      else if (h === "ANO") { colMap.ano = c; }
      else if (h === "CATEGORIA") { colMap.categoria = c; }
      else if (h === "COLABORADOR" || h.indexOf("TECNICO") > -1) { colMap.colaborador = c; }
      else if (h === "EQUIPE") { colMap.equipe = c; }
      else if (h.indexOf("ABERTURA") > -1 && h.indexOf("DATA") > -1) { colMap.abertura = c; }
      else if (h.indexOf("ATENDIMENTO") > -1 && h.indexOf("DATA") > -1) { colMap.atendimento = c; }
    }
    if (achouChamado) {
      linhaCabecalho = r;
      break;
    }
  }

  var inicioDados = linhaCabecalho >= 0 ? linhaCabecalho + 1 : 2;
  var registros = [];

  for (var i = inicioDados; i < valores.length; i++) {
    var row = valores[i];
    var chamado = row[colMap.chamado];
    var site = row[colMap.site];
    var catIndex = (colMap.categoria !== undefined && colMap.categoria !== null && colMap.categoria >= 0) ? colMap.categoria : 17;
    var categoria = row[catIndex];

    // Pula linhas totalmente vazias
    if ((chamado === undefined || chamado === null || chamado === "") &&
        (!site || site.toString().trim() === "") &&
        (!categoria || categoria.toString().trim() === "")) {
      continue;
    }

    // Validação de Mês e Ano
    var mesStr = row[colMap.mes] ? row[colMap.mes].toString().trim() : "";
    var anoStr = row[colMap.ano] ? row[colMap.ano].toString().replace('.0', '').trim() : "";
    var pertenceAoMes = false;

    if (mesStr && anoStr) {
      var mesPad = padronizarTexto(mesStr);
      if (mesPad.indexOf(mesAlvo.nome) > -1 && anoStr === mesAlvo.ano) {
        pertenceAoMes = true;
      }
    } else {
      // Fallback por data de abertura ou atendimento se mes/ano estiverem em branco
      var dataRef = row[colMap.atendimento] || row[colMap.abertura];
      if (dataRef instanceof Date) {
        var codMes = ("0" + (dataRef.getMonth() + 1)).slice(-2);
        var anoRef = dataRef.getFullYear().toString();
        if (codMes === mesAlvo.codigo && anoRef === mesAlvo.ano) {
          pertenceAoMes = true;
        }
      }
    }

    if (!pertenceAoMes) {
      continue;
    }

    // REGRA DE EXCLUSÃO 1: Remover chamados com tecnologia '5.8' (Coluna E)
    if (CONFIG_GERAL.IGNORAR_TECNOLOGIA_5_8) {
      var tecIndex = (colMap.tecnologia !== undefined && colMap.tecnologia !== null && colMap.tecnologia >= 0) ? colMap.tecnologia : 4;
      var tecRaw = row[tecIndex] ? row[tecIndex].toString().trim() : "";
      var tecPad = padronizarTexto(tecRaw).replace(',', '.');
      if (tecPad === "5.8" || tecPad.indexOf("5.8") > -1) {
        Logger.log("Chamado ignorado (Tecnologia 5.8 na Coluna E): " + chamado + " | Site: " + site);
        continue;
      }
    }

    // Colaborador (Coluna U)
    var colabRaw = row[colMap.colaborador] ? row[colMap.colaborador].toString().trim() : "";
    var colabPad = padronizarTexto(colabRaw);

    // Validação de Colaborador (se configurado para filtrar por Custos_Totais)
    if (CONFIG_GERAL.FILTRAR_CHAMADOS_POR_COLABORADORES) {
      if (mapaColaboradoresEquipes && Object.keys(mapaColaboradoresEquipes).length > 0) {
        if (!colabPad || !mapaColaboradoresEquipes[colabPad]) {
          // Colaborador não pertence a este setor/planilha de custos
          continue;
        }
      }
    }

    // Resolução de Equipe (Coluna V com fallback para Custos_Totais)
    var equipeRaw = row[colMap.equipe] ? row[colMap.equipe].toString().trim() : "";
    var equipePad = padronizarTexto(equipeRaw);

    // REGRA DE EXCLUSÃO 2: Remover chamados atribuídos a EQUIPE MNT. INTERNA (Coluna V)
    if (equipePad.indexOf("INTERNA") > -1) {
      Logger.log("Chamado ignorado (EQUIPE MNT. INTERNA na Coluna V): " + chamado + " | Colaborador: " + colabRaw);
      continue;
    }

    var equipeFinal = "";

    if (equipeRaw && equipeRaw !== "#N/A" && equipeRaw !== "#REF!" && equipeRaw !== "-") {
      equipeFinal = formatarNomeEquipe(equipeRaw);
    } else if (mapaColaboradoresEquipes && mapaColaboradoresEquipes[colabPad]) {
      equipeFinal = formatarNomeEquipe(mapaColaboradoresEquipes[colabPad].equipe || "");
    }

    // Validação de segurança: se a equipe resolvida também for interna, ignora
    var equipeFinalPad = padronizarTexto(equipeFinal);
    if (equipeFinalPad.indexOf("INTERNA") > -1) {
      Logger.log("Chamado ignorado (Equipe resolvida como INTERNA): " + chamado + " | Equipe: " + equipeFinal);
      continue;
    }

    if (!equipeFinal) {
      equipeFinal = "A DEFINIR";
    }

    // UF, Projeto e Diagrama
    var ufRaw = row[colMap.uf] ? row[colMap.uf].toString().trim() : "";
    var infoProj = mapearProjetoEDiagrama(ufRaw);

    // Horas Trabalhadas (SLA Hora)
    var horasRaw = row[colMap.horasTrabalhadas];
    var horasTratadas = tratarHorasTrabalhadasChamado(horasRaw);

    // Mapeamento dos 10 campos base da linha de Atividades
    var servico = (categoria !== undefined && categoria !== null && categoria.toString().trim() !== "") ? categoria.toString().trim() : "OUTROS";
    var tipo = "Manutenção"; // Regra 1: tudo que vem de CHAMADOS é Manutenção
    var categoriaAtiv = "CAPEX"; // Regra 2: padronizado CAPEX
    var siteStr = site ? site.toString().trim() : "";
    var responsavelTecnico = (mapaColaboradoresEquipes && mapaColaboradoresEquipes[colabPad])
      ? mapaColaboradoresEquipes[colabPad].nomeOficial
      : colabRaw;

    registros.push([
      servico,             // Col A: Serviço
      tipo,                // Col B: Tipo
      categoriaAtiv,       // Col C: Categoria
      siteStr,             // Col D: Site
      infoProj.estado,     // Col E: Estado
      infoProj.proj,       // Col F: Projeto
      infoProj.diag,       // Col G: Diagrama de Rede
      equipeFinal,         // Col H: Responsável Equipe
      responsavelTecnico,  // Col I: Responsável Técnico
      horasTratadas        // Col J: SLA Hora
    ]);
  }

  return registros;
}

/**
 * Grava os chamados de manutenção na aba 'Atividades', preservando
 * estritamente as linhas existentes de 'Expansão'.
 */
function gravarDadosNaAbaAtividades(abaAtividades, linhasManutencaoNovas) {
  var ultimaLinhaExistente = abaAtividades.getLastRow();
  var linhasExpansaoPreservadas = [];

  if (ultimaLinhaExistente >= 3) {
    var numLinhasExistentes = ultimaLinhaExistente - 2;
    var valoresExistentes = abaAtividades.getRange(3, 1, numLinhasExistentes, 12).getValues();
    var formulasExistentes = abaAtividades.getRange(3, 1, numLinhasExistentes, 12).getFormulas();

    for (var i = 0; i < valoresExistentes.length; i++) {
      var tipo = valoresExistentes[i][1] ? valoresExistentes[i][1].toString().trim() : "";
      var servico = valoresExistentes[i][0] ? valoresExistentes[i][0].toString().trim() : "";

      // Preserva linhas que NÃO sejam "Manutenção" e que tenham conteúdo (ex: Expansão)
      if (tipo && tipo.toLowerCase() !== "manutenção" && tipo.toLowerCase() !== "manutencao" && servico !== "") {
        var linhaPreservada = [];
        for (var c = 0; c < 12; c++) {
          var formula = formulasExistentes[i][c];
          linhaPreservada.push(formula ? formula : valoresExistentes[i][c]);
        }
        linhasExpansaoPreservadas.push(linhaPreservada);
      }
    }
  }

  // Montar array consolidado final
  var dadosFinais = [];
  var linhaAtualNaPlanilha = 3;

  // 1. Inserir primeiro as linhas de Expansão (reajustando fórmulas de linha)
  for (var e = 0; e < linhasExpansaoPreservadas.length; e++) {
    var linhaExp = linhasExpansaoPreservadas[e].slice();
    linhaExp[10] = "=J" + linhaAtualNaPlanilha;
    linhaExp[11] = "=K" + linhaAtualNaPlanilha;
    dadosFinais.push(linhaExp);
    linhaAtualNaPlanilha++;
  }

  // 2. Inserir as novas linhas de Manutenção extraídas da aba CHAMADOS
  for (var m = 0; m < linhasManutencaoNovas.length; m++) {
    var linhaManut = linhasManutencaoNovas[m].slice();
    var horasVal = linhaManut[9]; // SLA Hora
    var linhaCompleta = [
      linhaManut[0], // A: Serviço
      linhaManut[1], // B: Tipo ("Manutenção")
      linhaManut[2], // C: Categoria ("CAPEX")
      linhaManut[3], // D: Site
      linhaManut[4], // E: Estado
      linhaManut[5], // F: Projeto
      linhaManut[6], // G: Diagrama de Rede
      linhaManut[7], // H: Responsável Equipe
      linhaManut[8], // I: Responsável Técnico
      horasVal,      // J: SLA Hora
      "=J" + linhaAtualNaPlanilha, // K: SLA Decimal
      "=K" + linhaAtualNaPlanilha  // L: Horas Totais
    ];
    dadosFinais.push(linhaCompleta);
    linhaAtualNaPlanilha++;
  }

  // Se houver linhas antigas para limpar além das novas
  if (ultimaLinhaExistente >= 3) {
    var rangeLimpar = abaAtividades.getRange(3, 1, Math.max(ultimaLinhaExistente - 2, dadosFinais.length > 0 ? dadosFinais.length : 1), 12);
    rangeLimpar.clearContent();
  }

  if (dadosFinais.length > 0) {
    var rangeDestino = abaAtividades.getRange(3, 1, dadosFinais.length, 12);
    rangeDestino.setValues(dadosFinais);

    // Formatar coluna J como tempo e K/L como decimais
    abaAtividades.getRange(3, 10, dadosFinais.length, 1).setNumberFormat("[h]:mm:ss");
    abaAtividades.getRange(3, 11, dadosFinais.length, 2).setNumberFormat("0.0000000000");
  }

  return {
    totalGravado: dadosFinais.length,
    expansaoPreservada: linhasExpansaoPreservadas.length,
    manutencaoInserida: linhasManutencaoNovas.length
  };
}

/**
 * Converte qualquer formato de hora/duração em fração decimal de dia (compatível com formato de hora do Sheets).
 */
function tratarHorasTrabalhadasChamado(val) {
  if (val === undefined || val === null || val === '') return 0;
  if (typeof val === 'number') return val;
  if (val instanceof Date) {
    var hours = val.getHours();
    var minutes = val.getMinutes();
    var seconds = val.getSeconds();
    return (hours + minutes / 60 + seconds / 3600) / 24;
  }
  if (typeof val === 'string') {
    var str = val.trim();
    if (str.indexOf(':') > -1) {
      var parts = str.split(':');
      var h = parseFloat(parts[0]) || 0;
      var m = parseFloat(parts[1]) || 0;
      var s = parseFloat(parts[2]) || 0;
      return (h + m / 60 + s / 3600) / 24;
    }
    var num = parseFloat(str.replace(',', '.'));
    return isNaN(num) ? 0 : num;
  }
  return 0;
}

/**
 * Mapeia o Estado/UF para o Projeto e Diagrama de Rede correspondente.
 */
function mapearProjetoEDiagrama(ufBruta) {
  if (!ufBruta) return { estado: '', proj: 'N/A', diag: 'N/A' };
  var ufPad = padronizarTexto(ufBruta);
  if (MAPA_UF_PROJETO_ATIVIDADES[ufPad]) {
    return MAPA_UF_PROJETO_ATIVIDADES[ufPad];
  }
  var estadoFormatado = ufBruta.toString().trim();
  return {
    estado: estadoFormatado,
    proj: estadoFormatado.length === 2 ? estadoFormatado.toUpperCase() + '01' : 'N/A',
    diag: 'N/A'
  };
}

/**
 * Formata o nome da equipe removendo o texto 'MNT.' e padronizando para 'EQUIPE - 01', 'EQUIPE - 02', etc.
 */
function formatarNomeEquipe(equipeBruta) {
  if (!equipeBruta) return "";
  var str = equipeBruta.toString().trim();

  // Remove variações de MNT. ou MNT
  str = str.replace(/MNT\.?/gi, "").trim();

  // Extrai número da equipe se houver (ex.: 01, 02, 1, 2)
  var matchNum = str.match(/(?:EQUIPE\s*[-–—]?\s*)?(\d+)/i);
  if (matchNum) {
    var num = matchNum[1];
    var numPad = num.length === 1 ? "0" + num : num;
    return "EQUIPE - " + numPad;
  }

  // Normaliza hífens e espaços extras
  str = str.replace(/\s*-\s*/g, " - ").replace(/\s+/g, " ").trim();
  return str;
}

/**
 * Carrega mapa de colaboradores e equipes da aba 'Custos_Totais' (Colunas A e B).
 */
function carregarMapaEquipesColaboradores(planilha) {
  var mapa = {};
  if (!planilha) return mapa;

  var abaCustos = planilha.getSheetByName(CONFIG_GERAL.ABA_CUSTOS_TOTAIS);
  if (!abaCustos) return mapa;

  var ultimaLinha = abaCustos.getLastRow();
  if (ultimaLinha <= 2) return mapa;

  var valores = abaCustos.getRange(3, 1, ultimaLinha - 2, 2).getValues();

  for (var i = 0; i < valores.length; i++) {
    var nome = valores[i][0];
    var equipe = valores[i][1];
    if (nome) {
      var padronizado = padronizarTexto(nome);
      if (padronizado && padronizado !== "COLABORADOR" && padronizado !== "TOTAL") {
        var equipeLimpa = "";
        if (equipe) {
          equipeLimpa = formatarNomeEquipe(equipe);
        }
        mapa[padronizado] = {
          nomeOficial: nome.toString().trim(),
          equipe: equipeLimpa
        };
      }
    }
  }

  return mapa;
}

// ============================================================================
// 7. SINCRONIZAÇÃO EM MASSA MULTI-PLANILHAS (PASTA 2026)
// ============================================================================

/**
 * Ponto de entrada: Sincroniza Frota e Viagens em todas as planilhas da pasta 2026 (>= Julho).
 */
function sincronizarTodasPlanilhas() {
  var ui = SpreadsheetApp.getUi();
  var confirmacao = ui.alert(
    "🌐 Sincronização Completa de Custos (Pasta 2026)",
    "Esta ação sincronizará TODOS os custos em TODAS as planilhas da pasta 2026 do mês de JULHO em diante:\n\n" +
    "• 🚗 Frota Unificada (Combustível e Manutenção)\n" +
    "• ✈️ Viagens (Alimentação e Hospedagem)\n\n" +
    "• As planilhas anteriores a Julho/2026 serão mantidas intactas.\n" +
    "• Coluna D ('nome corrigido') da aba Base_Viagens será mantida intacta.\n\n" +
    "Deseja iniciar a sincronização completa?",
    ui.ButtonSet.YES_NO
  );

  if (confirmacao !== ui.Button.YES) return;

  var relatorioFrota = sincronizarPlanilhasPasta2026('AMBOS', true);
  var relatorioViagens = sincronizarViagensTodas(true);
  var relatorioChamados = sincronizarChamadosTodas(true);

  var msgFinal = "🎉 Sincronização Completa Finalizada!\n\n" +
                 "--- 🚗 FROTA UNIFICADA ---\n" + (relatorioFrota && relatorioFrota.length > 0 ? relatorioFrota.join("\n") : "Concluído") + "\n\n" +
                 "--- ✈️ VIAGENS ---\n" + (relatorioViagens && relatorioViagens.length > 0 ? relatorioViagens.join("\n") : "Concluído") + "\n\n" +
                 "--- 📋 ATIVIDADES (CHAMADOS) ---\n" + (relatorioChamados && relatorioChamados.length > 0 ? relatorioChamados.join("\n") : "Concluído") + "\n\n" +
                 "ℹ️ Planilhas de Janeiro a Junho foram mantidas intactas.\n" +
                 "ℹ️ Linhas de Expansão foram preservadas intactas.";
  Logger.log(msgFinal);
  exibirAlerta(msgFinal);
}

/**
 * Ponto de entrada: Sincroniza apenas Frota em todas as planilhas da pasta 2026 (>= Julho).
 */
function sincronizarFrotaTodas() {
  sincronizarPlanilhasPasta2026('AMBOS');
}

/**
 * Ponto de entrada: Sincroniza apenas Abastecimento em todas as planilhas da pasta 2026 (>= Julho).
 */
function sincronizarAbastecimentoTodas() {
  sincronizarPlanilhasPasta2026('ABASTECIMENTO');
}

/**
 * Ponto de entrada: Sincroniza apenas Manutenção em todas as planilhas da pasta 2026 (>= Julho).
 */
function sincronizarManutencaoTodas() {
  sincronizarPlanilhasPasta2026('MANUTENCAO');
}

/**
 * Ponto de entrada: Sincroniza Viagens (Alimentação e Hospedagem) em todas as planilhas da pasta 2026 (>= Julho).
 */
function sincronizarViagensTodas(modoSilencioso) {
  if (!modoSilencioso) {
    var ui = SpreadsheetApp.getUi();
    var confirmacao = ui.alert(
      "✈️ Sincronização de Viagens (Pasta 2026)",
      "Esta ação identificará as planilhas da pasta 2026 de JULHO em diante e preencherá automaticamente a aba 'Base_Viagens' com Alimentação e Hospedagem.\n\n" +
      "• Origem: Planilha CONTROLE DE VALORES - ALIMENTAÇÃO/HOSPEDAGEM-2026.\n" +
      "• Filtro: Apenas os colaboradores da aba 'Custos_Totais' de cada planilha.\n" +
      "• Coluna D ('nome corrigido') será mantida intacta.\n" +
      "• Planilhas anteriores a Julho/2026 serão mantidas intactas.\n\n" +
      "Deseja iniciar a sincronização agora?",
      ui.ButtonSet.YES_NO
    );
    if (confirmacao !== ui.Button.YES) return [];
  }

  var pasta2026;
  try {
    pasta2026 = DriveApp.getFolderById(CONFIG_GERAL.PASTA_RAIZ_2026);
  } catch (e) {
    var errPasta = "Erro ao acessar a pasta 2026: " + e.message;
    if (!modoSilencioso) exibirAlerta(errPasta);
    return [errPasta];
  }

  var arquivosPasta = pasta2026.getFiles();
  var planilhasElegiveis = [];

  while (arquivosPasta.hasNext()) {
    var arq = arquivosPasta.next();
    if (arq.getMimeType() === MimeType.GOOGLE_SHEETS) {
      var nomeArq = arq.getName();
      var mesInfo = extrairMesDeTexto(nomeArq);
      if (mesInfo && parseInt(mesInfo.codigo, 10) >= CONFIG_GERAL.MES_INICIAL_REGRA) {
        planilhasElegiveis.push({
          id: arq.getId(),
          nome: nomeArq,
          mesInfo: mesInfo
        });
      }
    }
  }

  if (planilhasElegiveis.length === 0) {
    var errSemPlanilhas = "Nenhuma planilha elegível (de JULHO em diante) foi encontrada na pasta 2026.";
    if (!modoSilencioso) exibirAlerta(errSemPlanilhas);
    return [errSemPlanilhas];
  }

  planilhasElegiveis.sort(function(a, b) {
    return parseInt(a.mesInfo.codigo, 10) - parseInt(b.mesInfo.codigo, 10);
  });

  var relatorio = [];

  for (var i = 0; i < planilhasElegiveis.length; i++) {
    var item = planilhasElegiveis[i];
    var mesInfo = item.mesInfo;
    var nomeMes = mesInfo.nome;

    try {
      var ssTarget = SpreadsheetApp.openById(item.id);
      var res = importarDadosViagens(ssTarget, true);
      if (res && !res.erro) {
        relatorio.push("✈️ " + nomeMes + ": " + res.alimentacao + " alimentações | " + res.hospedagem + " hospedagens lançadas.");
      } else {
        relatorio.push("⚠️ " + nomeMes + ": " + (res.erro || "Falha na importação"));
      }
    } catch (e) {
      Logger.log("Erro ao sincronizar viagens para " + item.nome + ": " + e.message);
      relatorio.push("❌ " + nomeMes + ": Erro (" + e.message + ")");
    }
  }

  if (!modoSilencioso) {
    var msgFinal = "🎉 Sincronização de Viagens Concluída!\n\n" +
                   relatorio.join("\n") +
                   "\n\nℹ️ Planilhas de Janeiro a Junho foram mantidas intactas.\n" +
                   "ℹ️ Coluna D ('nome corrigido') mantida intacta.";
    Logger.log(msgFinal);
    exibirAlerta(msgFinal);
  }

  return relatorio;
}

/**
 * Ponto de entrada: Sincroniza Chamados (Aba Atividades) em todas as planilhas da pasta 2026 (>= Julho).
 */
function sincronizarChamadosTodas(modoSilencioso) {
  if (!modoSilencioso) {
    var ui = SpreadsheetApp.getUi();
    var confirmacao = ui.alert(
      "📋 Sincronização de Chamados / Atividades (Pasta 2026)",
      "Esta ação identificará as planilhas da pasta 2026 de JULHO em diante e preencherá automaticamente a aba 'Atividades' com os chamados de manutenção.\n\n" +
      "• Origem: Planilha CHAMADOS.\n" +
      "• Tipo: 'Manutenção' e Categoria: 'CAPEX'.\n" +
      "• Linhas de 'Expansão' existentes serão mantidas intactas.\n" +
      "• Planilhas anteriores a Julho/2026 serão mantidas intactas.\n\n" +
      "Deseja iniciar a sincronização agora?",
      ui.ButtonSet.YES_NO
    );
    if (confirmacao !== ui.Button.YES) return [];
  }

  var pasta2026;
  try {
    pasta2026 = DriveApp.getFolderById(CONFIG_GERAL.PASTA_RAIZ_2026);
  } catch (e) {
    var errPasta = "Erro ao acessar pasta raiz 2026 no Google Drive: " + e.message;
    if (!modoSilencioso) exibirAlerta(errPasta);
    return [errPasta];
  }

  var arquivos = pasta2026.getFiles();
  var planilhasElegiveis = [];

  while (arquivos.hasNext()) {
    var arq = arquivos.next();
    if (arq.getMimeType() === MimeType.GOOGLE_SHEETS) {
      var nomeArq = arq.getName();
      var mesInfo = extrairMesDeTexto(nomeArq);
      if (mesInfo && parseInt(mesInfo.codigo, 10) >= CONFIG_GERAL.MES_INICIAL_REGRA) {
        planilhasElegiveis.push({
          id: arq.getId(),
          nome: nomeArq,
          mesInfo: mesInfo
        });
      }
    }
  }

  if (planilhasElegiveis.length === 0) {
    var msgVazia = "Nenhuma planilha elegível (Julho em diante) encontrada na pasta 2026.";
    if (!modoSilencioso) exibirAlerta(msgVazia);
    return [msgVazia];
  }

  planilhasElegiveis.sort(function(a, b) {
    return parseInt(a.mesInfo.codigo, 10) - parseInt(b.mesInfo.codigo, 10);
  });

  var relatorio = [];
  for (var i = 0; i < planilhasElegiveis.length; i++) {
    var item = planilhasElegiveis[i];
    try {
      var ss = SpreadsheetApp.openById(item.id);
      var res = importarDadosChamadosAtividades(ss, true);
      if (res.erro) {
        relatorio.push("• " + item.mesInfo.nome + ": Erro (" + res.erro + ")");
      } else {
        relatorio.push("• " + item.mesInfo.nome + ": " + res.chamados + " chamados importados (" + res.expansao + " expansões mantidas)");
      }
    } catch (err) {
      relatorio.push("• " + item.mesInfo.nome + ": Falha na execução (" + err.message + ")");
    }
  }

  if (!modoSilencioso) {
    var msgFinal = "🎉 Sincronização de Chamados Concluída!\n\n" +
                   "--- 📋 RESULTADO POR PLANILHA ---\n" +
                   relatorio.join("\n") + "\n\n" +
                   "ℹ️ Linhas de Expansão foram preservadas intactas.";
    exibirAlerta(msgFinal);
  }

  return relatorio;
}


/**
 * Localiza todas as planilhas da pasta 2026 a partir de Julho/2026 e preenche suas abas de frota
 * a partir do arquivo unificado no Drive. Preserva as de Janeiro a Junho intactas.
 */
function sincronizarPlanilhasPasta2026(tipo, modoSilencioso) {
  var tipoLabel = (tipo === 'ABASTECIMENTO') ? "Abastecimento" : (tipo === 'MANUTENCAO' ? "Manutenção" : "Frota Unificada (Combustível e Manutenção)");

  if (!modoSilencioso) {
    var ui = SpreadsheetApp.getUi();
    var confirmacao = ui.alert(
      "🌐 Sincronização Multi-Planilhas de Frota (Pasta 2026)",
      "Esta ação identificará as planilhas da pasta 2026 do mês de JULHO em diante (Julho a Outubro e próximos meses) e preencherá automaticamente os dados de " + tipoLabel + " a partir do arquivo unificado.\n\n" +
      "• As planilhas anteriores a Julho/2026 serão mantidas intactas.\n" +
      "• Cada mês receberá apenas os seus lançamentos, validados pelos colaboradores daquela planilha.\n" +
      "• Os dados anteriores de cada aba serão limpos e relançados a partir da linha 2.\n\n" +
      "Deseja iniciar a sincronização agora?",
      ui.ButtonSet.YES_NO
    );

    if (confirmacao !== ui.Button.YES) return [];
  }

  var pasta2026;
  try {
    pasta2026 = DriveApp.getFolderById(CONFIG_GERAL.PASTA_RAIZ_2026);
  } catch (e) {
    var errPasta = "Erro ao acessar a pasta 2026 no Google Drive: " + e.message;
    if (!modoSilencioso) exibirAlerta(errPasta);
    return [errPasta];
  }

  var arquivosPasta = pasta2026.getFiles();
  var planilhasElegiveis = [];

  while (arquivosPasta.hasNext()) {
    var arq = arquivosPasta.next();
    if (arq.getMimeType() === MimeType.GOOGLE_SHEETS) {
      var nomeArq = arq.getName();
      var mesInfo = extrairMesDeTexto(nomeArq);
      if (mesInfo && parseInt(mesInfo.codigo, 10) >= CONFIG_GERAL.MES_INICIAL_REGRA) {
        planilhasElegiveis.push({
          id: arq.getId(),
          nome: nomeArq,
          mesInfo: mesInfo
        });
      }
    }
  }

  if (planilhasElegiveis.length === 0) {
    var errSemPlanilhas = "Nenhuma planilha elegível (de JULHO em diante) foi encontrada na pasta 2026.";
    if (!modoSilencioso) exibirAlerta(errSemPlanilhas);
    return [errSemPlanilhas];
  }

  planilhasElegiveis.sort(function(a, b) {
    return parseInt(a.mesInfo.codigo, 10) - parseInt(b.mesInfo.codigo, 10);
  });

  // Montar estruturas de meses e carregar colaboradores de cada planilha
  var mesesAlvoMap = {};
  var colaboradoresPorMes = {};
  var planilhasInstancias = {};

  for (var p = 0; p < planilhasElegiveis.length; p++) {
    var pItem = planilhasElegiveis[p];
    var cod = pItem.mesInfo.codigo;
    mesesAlvoMap[cod] = pItem.mesInfo;

    try {
      var ss = SpreadsheetApp.openById(pItem.id);
      planilhasInstancias[cod] = ss;
      colaboradoresPorMes[cod] = carregarListaColaboradores(ss);
    } catch (e) {
      Logger.log("Erro ao abrir planilha " + pItem.nome + ": " + e.message);
      colaboradoresPorMes[cod] = {};
    }
  }

  var relatorio = [];

  // Obter pastas da frota unificada
  var estruturaPastas = obterOuCriarEstruturaPastasFrota(false);
  var dadosFrota = processarExtratosUnificadosMultiMeses(
    estruturaPastas.pastaOrigem,
    estruturaPastas.pastaProcessados,
    mesesAlvoMap,
    colaboradoresPorMes
  );

  for (var i = 0; i < planilhasElegiveis.length; i++) {
    var codMes = planilhasElegiveis[i].mesInfo.codigo;
    var nomeMes = planilhasElegiveis[i].mesInfo.nome;
    var ssPlanilha = planilhasInstancias[codMes];
    if (!ssPlanilha) continue;

    var resumoMes = [];

    // Grava Abastecimento
    if (tipo === 'ABASTECIMENTO' || tipo === 'AMBOS') {
      var abaAbast = obterAbaPorNomes(ssPlanilha, [CONFIG_GERAL.ABA_ABASTECIMENTO, 'Base_Abastecimento', 'Base Abastecimento']);
      if (abaAbast) {
        var linhasA = dadosFrota.abastecimento[codMes] || [];
        gravarLinhasNaAba(abaAbast, linhasA, 4, ['NOME MOTORISTA', 'VALOR EMISSAO', 'PERÍODO', 'DATA/HORA']);
        resumoMes.push("⛽ " + linhasA.length + " abastecimentos");
      }
    }

    // Grava Manutenção
    if (tipo === 'MANUTENCAO' || tipo === 'AMBOS') {
      var abaManut = obterAbaPorNomes(ssPlanilha, [CONFIG_GERAL.ABA_MANUTENCAO, 'Base_Manutenção', 'Base_Manutencao', 'Base Manutenção']);
      if (abaManut) {
        var linhasM = dadosFrota.manutencao[codMes] || [];
        gravarLinhasNaAba(abaManut, linhasM, 5, ['NOME MOTORISTA', 'VALOR EMISSAO', 'TIPO ESTABELECIMENTO', 'PERÍODO', 'DATA/HORA']);
        resumoMes.push("🔧 " + linhasM.length + " manutenções");
      }
    }

    relatorio.push("🚗 " + nomeMes + ": " + (resumoMes.length > 0 ? resumoMes.join(" | ") : "Nenhum dado lançado"));
  }

  if (!modoSilencioso) {
    var msgFinal = "🎉 Sincronização de Frota Concluída!\n\n" +
                   relatorio.join("\n") +
                   "\n\nℹ️ Planilhas de Janeiro a Junho foram mantidas intactas.";
    Logger.log(msgFinal);
    exibirAlerta(msgFinal);
  }

  return relatorio;
}

/**
 * Lê os arquivos unificados novos e processados da pasta de Frota e distribui os lançamentos por mês e tipo.
 */
function processarExtratosUnificadosMultiMeses(pastaOrigem, pastaProcessados, mesesAlvoMap, colaboradoresPorMes) {
  var linhasPorMes = {
    abastecimento: {},
    manutencao: {}
  };

  for (var cod in mesesAlvoMap) {
    linhasPorMes.abastecimento[cod] = [];
    linhasPorMes.manutencao[cod] = [];
  }

  var chavesDeduplicacao = {};
  var arquivosParaLer = [];
  var arquivosParaMover = [];
  var idsLidos = {};

  function coletarArquivos(pasta, ehOrigem) {
    if (!pasta) return;
    var files = pasta.getFiles();
    while (files.hasNext()) {
      var f = files.next();
      var id = f.getId();
      var nome = f.getName().toLowerCase();
      if ((nome.indexOf('.xlsx') > -1 || nome.indexOf('.csv') > -1) && !idsLidos[id]) {
        if (f.getSize() > 0) {
          arquivosParaLer.push(f);
          idsLidos[id] = true;
          if (ehOrigem) arquivosParaMover.push(f);
        }
      }
    }
  }

  coletarArquivos(pastaOrigem, true);
  coletarArquivos(pastaProcessados, false);

  for (var i = 0; i < arquivosParaLer.length; i++) {
    var arq = arquivosParaLer[i];
    processarArquivoUnificadoMultiMesesEmLotes(arq, mesesAlvoMap, colaboradoresPorMes, linhasPorMes, chavesDeduplicacao);
  }

  // Move novos arquivos para processados
  for (var m = 0; m < arquivosParaMover.length; m++) {
    try {
      arquivosParaMover[m].moveTo(pastaProcessados);
    } catch (e) {
      Logger.log("Aviso ao mover arquivo processado: " + e.message);
    }
  }

  return linhasPorMes;
}

/**
 * Roteia o processamento multi-meses por tipo de arquivo (.xlsx ou .csv).
 */
function processarArquivoUnificadoMultiMesesEmLotes(arquivo, mesesAlvoMap, colaboradoresPorMes, linhasPorMes, chavesDeduplicacao) {
  var nomeLower = arquivo.getName().toLowerCase();
  if (nomeLower.indexOf('.xlsx') > -1) {
    processarXlsxUnificadoMultiMeses(arquivo, mesesAlvoMap, colaboradoresPorMes, linhasPorMes, chavesDeduplicacao);
  } else if (nomeLower.indexOf('.csv') > -1) {
    processarCsvUnificadoMultiMeses(arquivo, mesesAlvoMap, colaboradoresPorMes, linhasPorMes, chavesDeduplicacao);
  }
}

/**
 * Lê arquivo Excel (.xlsx) unificado em lotes e distribui as transações por mês e tipo.
 */
function processarXlsxUnificadoMultiMeses(arquivo, mesesAlvoMap, colaboradoresPorMes, linhasPorMes, chavesDeduplicacao) {
  var nomeArquivo = arquivo.getName();
  var tempId = converterXlsxParaPlanilhaTemporaria(arquivo);
  if (!tempId) return;

  try {
    var tempPlanilha = SpreadsheetApp.openById(tempId);
    var fusoTemp = tempPlanilha.getSpreadsheetTimeZone();
    var sheets = tempPlanilha.getSheets();
    var sheet = sheets[0];

    for (var s = 0; s < sheets.length; s++) {
      if (sheets[s].getLastRow() > 1) {
        sheet = sheets[s];
        break;
      }
    }

    var totalLinhas = sheet.getLastRow();
    var totalColunas = sheet.getLastColumn();
    if (totalLinhas <= 1 || totalColunas === 0) return;

    var cabecalho = sheet.getRange(1, 1, 1, totalColunas).getValues()[0];
    var idx = mapearIndicesColunas(cabecalho);
    if (idx.indexMotorista === -1 || idx.indexValor === -1) return;

    var TAMANHO_LOTE = 2000;
    for (var inicio = 2; inicio <= totalLinhas; inicio += TAMANHO_LOTE) {
      var qtd = Math.min(TAMANHO_LOTE, totalLinhas - inicio + 1);
      var bloco = sheet.getRange(inicio, 1, qtd, totalColunas).getValues();

      for (var r = 0; r < bloco.length; r++) {
        var linha = bloco[r];
        if (!linha || linha.length === 0) continue;

        var nomeOriginal = linha[idx.indexMotorista] ? linha[idx.indexMotorista].toString().trim() : "";
        if (!nomeOriginal) continue;

        var valorDataRaw = idx.indexData !== -1 ? linha[idx.indexData] : "";
        var periodoStr = idx.indexPeriodo !== -1 ? (linha[idx.indexPeriodo] || "").toString().trim() : "";

        var infoData = formatarDataTransacao(valorDataRaw, fusoTemp);
        var mesCod = infoData.mes;

        if (!mesCod && periodoStr) {
          var mComp = extrairComponentesData(periodoStr);
          if (mComp) mesCod = mComp.mes;
        }

        if (!mesCod || !mesesAlvoMap[mesCod]) continue;

        var mapaColabMes = colaboradoresPorMes[mesCod] || {};
        var nomePadronizado = padronizarTexto(nomeOriginal);
        if (!mapaColabMes.hasOwnProperty(nomePadronizado)) continue;

        var tipoTransacao = classificarTipoTransacao(linha, idx);
        var valorFormatado = formatarValorNumerico(linha[idx.indexValor]);

        // Anti-duplicação por transação
        var chaveTransacao = mesCod + '|' + tipoTransacao + '|' + nomePadronizado + '|' + valorFormatado + '|' + infoData.str;
        if (chavesDeduplicacao[chaveTransacao]) continue;
        chavesDeduplicacao[chaveTransacao] = true;

        var mesNome = mesesAlvoMap[mesCod].nome;

        if (tipoTransacao === 'ABASTECIMENTO') {
          linhasPorMes.abastecimento[mesCod].push([
            nomeOriginal,
            valorFormatado,
            mesNome,
            infoData.str
          ]);
        } else {
          var tipoEstab = idx.indexTipoEstabelecimento !== -1 ? (linha[idx.indexTipoEstabelecimento] || "").toString().trim() : "";
          linhasPorMes.manutencao[mesCod].push([
            nomeOriginal,
            valorFormatado,
            tipoEstab,
            mesNome,
            infoData.str
          ]);
        }
      }

      bloco = null;
    }

  } finally {
    try {
      DriveApp.getFileById(tempId).setTrashed(true);
    } catch (e) {}
  }
}

/**
 * Lê arquivo CSV unificado linha a linha e distribui as transações por mês e tipo.
 */
function processarCsvUnificadoMultiMeses(arquivo, mesesAlvoMap, colaboradoresPorMes, linhasPorMes, chavesDeduplicacao) {
  var nomeArquivo = arquivo.getName();
  var blob = arquivo.getBlob();
  var conteudoCsv = blob.getDataAsString();

  if (!conteudoCsv || conteudoCsv.trim() === "") return;

  var linhasTexto = conteudoCsv.split(/\r?\n/);
  conteudoCsv = null;

  if (linhasTexto.length <= 1) return;

  var delimitador = detectarDelimitador(linhasTexto[0]);
  var cabecalho = Utilities.parseCsv(linhasTexto[0], delimitador)[0];
  var idx = mapearIndicesColunas(cabecalho);
  if (idx.indexMotorista === -1 || idx.indexValor === -1) return;

  for (var r = 1; r < linhasTexto.length; r++) {
    var linhaStr = linhasTexto[r];
    if (!linhaStr || linhaStr.trim() === "") continue;

    var parsed = Utilities.parseCsv(linhaStr, delimitador);
    if (!parsed || parsed.length === 0) continue;
    var linhaArr = parsed[0];
    if (!linhaArr || linhaArr.length === 0) continue;

    var nomeOriginal = linhaArr[idx.indexMotorista] ? linhaArr[idx.indexMotorista].toString().trim() : "";
    if (!nomeOriginal) continue;

    var valorDataRaw = idx.indexData !== -1 ? linhaArr[idx.indexData] : "";
    var periodoStr = idx.indexPeriodo !== -1 ? (linhaArr[idx.indexPeriodo] || "").toString().trim() : "";

    var infoData = formatarDataTransacao(valorDataRaw);
    var mesCod = infoData.mes;

    if (!mesCod && periodoStr) {
      var mComp = extrairComponentesData(periodoStr);
      if (mComp) mesCod = mComp.mes;
    }

    if (!mesCod || !mesesAlvoMap[mesCod]) continue;

    var mapaColabMes = colaboradoresPorMes[mesCod] || {};
    var nomePadronizado = padronizarTexto(nomeOriginal);
    if (!mapaColabMes.hasOwnProperty(nomePadronizado)) continue;

    var tipoTransacao = classificarTipoTransacao(linhaArr, idx);
    var valorFormatado = formatarValorNumerico(linhaArr[idx.indexValor]);

    var chaveTransacao = mesCod + '|' + tipoTransacao + '|' + nomePadronizado + '|' + valorFormatado + '|' + infoData.str;
    if (chavesDeduplicacao[chaveTransacao]) continue;
    chavesDeduplicacao[chaveTransacao] = true;

    var mesNome = mesesAlvoMap[mesCod].nome;

    if (tipoTransacao === 'ABASTECIMENTO') {
      linhasPorMes.abastecimento[mesCod].push([
        nomeOriginal,
        valorFormatado,
        mesNome,
        infoData.str
      ]);
    } else {
      var tipoEstab = idx.indexTipoEstabelecimento !== -1 ? (linhaArr[idx.indexTipoEstabelecimento] || "").toString().trim() : "";
      linhasPorMes.manutencao[mesCod].push([
        nomeOriginal,
        valorFormatado,
        tipoEstab,
        mesNome,
        infoData.str
      ]);
    }
  }

  linhasTexto = null;
}

/**
 * Função utilitária para gravar matriz em aba, limpando da linha 2 em diante e formatando como moeda.
 */
function gravarLinhasNaAba(abaDestino, linhasParaInserir, qtdColunas, cabecalhoPadrao) {
  var linhasAtuais = abaDestino.getLastRow();
  if (linhasAtuais > 1) {
    abaDestino.getRange(2, 1, linhasAtuais - 1, abaDestino.getLastColumn()).clearContent();
    SpreadsheetApp.flush();
  }

  if (abaDestino.getLastRow() === 0) {
    abaDestino.getRange(1, 1, 1, qtdColunas).setValues([cabecalhoPadrao]);
  }

  if (linhasParaInserir && linhasParaInserir.length > 0) {
    abaDestino.getRange(2, 1, linhasParaInserir.length, qtdColunas).setValues(linhasParaInserir);
    abaDestino.getRange(2, 2, linhasParaInserir.length, 1).setNumberFormat('"R$"\\ #,##0.00');
  }
}


// ============================================================================
// 7. DIAGNÓSTICO E TESTES DE CONEXÃO
// ============================================================================

/**
 * Executa testes completos nas pastas do Drive, planilhas e abas de destino.
 */
function testarConexoes() {
  var relatorio = [];

  var planilha = obterPlanilhaAlvo();
  if (planilha) {
    var mesAlvo = obterMesAlvoDaPlanilha(planilha);
    relatorio.push("✅ Planilha ativa: " + planilha.getName());
    relatorio.push("📅 Mês de competência identificado: " + mesAlvo.nome + " (" + mesAlvo.codigo + "/" + mesAlvo.ano + ")");

    var aColab = planilha.getSheetByName(CONFIG_GERAL.ABA_CUSTOS_TOTAIS);
    if (aColab) {
      var mapa = carregarListaColaboradores(planilha);
      var total = Object.keys(mapa).length;
      relatorio.push("✅ Aba '" + CONFIG_GERAL.ABA_CUSTOS_TOTAIS + "': " + total + " colaboradores carregados na Coluna A.");
    } else {
      relatorio.push("❌ Aba '" + CONFIG_GERAL.ABA_CUSTOS_TOTAIS + "' NÃO encontrada na planilha.");
    }

    var aAbast = obterAbaPorNomes(planilha, [CONFIG_GERAL.ABA_ABASTECIMENTO, 'Base_Abastecimento', 'Base Abastecimento']);
    relatorio.push(aAbast ? "✅ Aba de Abastecimento encontrada." : "❌ Aba '" + CONFIG_GERAL.ABA_ABASTECIMENTO + "' NÃO encontrada.");

    var aManut = obterAbaPorNomes(planilha, [CONFIG_GERAL.ABA_MANUTENCAO, 'Base_Manutenção', 'Base_Manutencao']);
    relatorio.push(aManut ? "✅ Aba de Manutenção encontrada." : "❌ Aba '" + CONFIG_GERAL.ABA_MANUTENCAO + "' NÃO encontrada.");

    var aViagens = obterAbaPorNomes(planilha, [CONFIG_GERAL.ABA_VIAGENS, 'Base_Viagens', 'Base Viagens', 'Viagens']);
    relatorio.push(aViagens ? "✅ Aba de Viagens ('Base_Viagens') encontrada." : "❌ Aba '" + CONFIG_GERAL.ABA_VIAGENS + "' NÃO encontrada.");

    var aAtividades = obterAbaPorNomes(planilha, [CONFIG_GERAL.ABA_DESTINO_ATIVIDADES, 'Atividades', 'ATIVIDADES']);
    relatorio.push(aAtividades ? "✅ Aba de Atividades ('Atividades') encontrada (" + Math.max(0, aAtividades.getLastRow() - 2) + " linhas de dados)." : "❌ Aba '" + CONFIG_GERAL.ABA_DESTINO_ATIVIDADES + "' NÃO encontrada.");
  } else {
    relatorio.push("❌ Planilha não identificada.");
  }

  // Conexão com a planilha de origem de Viagens
  try {
    var ssViagens = SpreadsheetApp.openById(CONFIG_GERAL.ID_PLANILHA_VIAGENS_ORIGEM);
    relatorio.push("✅ Planilha Origem Viagens conectada: '" + ssViagens.getName() + "'");

    var abaAlim = obterAbaPorNomes(ssViagens, [CONFIG_GERAL.ABA_ORIGEM_ALIMENTACAO, 'Alimentação 2026', 'Alimentacao 2026', 'Alimentação', 'Alimentacao']);
    if (abaAlim) {
      var cabAlim = abaAlim.getRange(1, 1, 1, abaAlim.getLastColumn()).getValues()[0].filter(function(x){ return x !== ""; }).join(" | ");
      relatorio.push("  • Aba Alimentação: " + abaAlim.getLastRow() + " linhas (Colunas: " + cabAlim + ")");
    } else {
      relatorio.push("  ❌ Aba Alimentação NÃO encontrada");
    }

    var abaHosp = obterAbaPorNomes(ssViagens, [CONFIG_GERAL.ABA_ORIGEM_HOSPEDAGEM, 'Hospedagem 2026', 'Hospedagem', 'Hospedagens 2026', 'Hospedagens']);
    if (abaHosp) {
      var cabHosp = abaHosp.getRange(1, 1, 1, abaHosp.getLastColumn()).getValues()[0].filter(function(x){ return x !== ""; }).join(" | ");
      relatorio.push("  • Aba Hospedagem: " + abaHosp.getLastRow() + " linhas (Colunas: " + cabHosp + ")");
    } else {
      relatorio.push("  ❌ Aba Hospedagem NÃO encontrada");
    }
  } catch (e) {
    relatorio.push("❌ Erro ao acessar Planilha Origem Viagens: " + e.message);
  }

  // Conexão com a planilha de origem de Chamados
  try {
    var ssChamados = SpreadsheetApp.openById(CONFIG_GERAL.ID_PLANILHA_CHAMADOS_ORIGEM);
    relatorio.push("✅ Planilha Origem Chamados conectada: '" + ssChamados.getName() + "'");

    var abaChamados = obterAbaPorNomes(ssChamados, [CONFIG_GERAL.ABA_ORIGEM_CHAMADOS, 'CHAMADOS', 'Chamados']);
    if (abaChamados) {
      relatorio.push("  • Aba CHAMADOS: " + abaChamados.getLastRow() + " linhas totais.");
    } else {
      relatorio.push("  ❌ Aba CHAMADOS NÃO encontrada.");
    }
  } catch (e) {
    relatorio.push("❌ Erro ao acessar Planilha Origem Chamados: " + e.message);
  }

  // Listagem da Pasta 2026
  try {
    var pasta2026 = DriveApp.getFolderById(CONFIG_GERAL.PASTA_RAIZ_2026);
    var arqs = pasta2026.getFiles();
    var planilhasIdentificadas = [];
    while (arqs.hasNext()) {
      var a = arqs.next();
      if (a.getMimeType() === MimeType.GOOGLE_SHEETS) {
        var m = extrairMesDeTexto(a.getName());
        if (m && parseInt(m.codigo, 10) >= CONFIG_GERAL.MES_INICIAL_REGRA) {
          planilhasIdentificadas.push(m.nome + " (" + a.getName() + ")");
        }
      }
    }
    relatorio.push("📁 Planilhas elegíveis na pasta 2026 (Julho em diante): " + (planilhasIdentificadas.length > 0 ? planilhasIdentificadas.join(", ") : "Nenhuma encontrada."));
  } catch (e) {
    relatorio.push("❌ Erro ao listar pasta 2026: " + e.message);
  }

  // Nova Estrutura Unificada de Frota no Drive
  try {
    var estruturaPastas = obterOuCriarEstruturaPastasFrota(false);
    var pOrigem = estruturaPastas.pastaOrigem;
    var pProcessados = estruturaPastas.pastaProcessados;

    relatorio.push("✅ Pasta Frota Unificada (Entrada): '" + pOrigem.getName() + "' (ID: " + pOrigem.getId() + ")");
    relatorio.push("✅ Subpasta Histórico (Processados): '" + pProcessados.getName() + "' (ID: " + pProcessados.getId() + ")");

    var arqsNovos = pOrigem.getFiles();
    var qtdNovos = 0;
    while (arqsNovos.hasNext()) {
      var fn = arqsNovos.next().getName().toLowerCase();
      if (fn.indexOf('.xlsx') > -1 || fn.indexOf('.csv') > -1) qtdNovos++;
    }
    relatorio.push("  • Arquivos novos aguardando importação: " + qtdNovos);

    var arqsProc = pProcessados.getFiles();
    var qtdProc = 0;
    while (arqsProc.hasNext()) {
      var fp = arqsProc.next().getName().toLowerCase();
      if (fp.indexOf('.xlsx') > -1 || fp.indexOf('.csv') > -1) qtdProc++;
    }
    relatorio.push("  • Arquivos já arquivados em processados: " + qtdProc);

  } catch (e) {
    relatorio.push("❌ Erro ao validar estrutura de pastas de Frota: " + e.message);
  }

  var msg = relatorio.join("\n");
  Logger.log(msg);
  exibirAlerta("Diagnóstico de Conexões e Estruturas:\n\n" + msg);
}


// ============================================================================
// 8. MOTOR DE PROCESSAMENTO EM LOTES (.XLSX / .CSV UNIFICADO)
// ============================================================================

/**
 * Processa um arquivo unificado (.xlsx ou .csv) em lotes, classificando cada linha
 * em 'ABASTECIMENTO' ou 'MANUTENCAO' com base na Coluna C (NOME REDUZIDO).
 */
function processarArquivoFrotaUnificadaEmLotes(arquivo, mapaColaboradores, mesAlvo, nomesIgnorados, stats) {
  var nomeArquivo = arquivo.getName();
  var nomeLower = nomeArquivo.toLowerCase();

  if (nomeLower.indexOf('.xlsx') > -1) {
    return processarXlsxFrotaUnificadaEmLotes(arquivo, mapaColaboradores, mesAlvo, nomesIgnorados, stats);
  } else if (nomeLower.indexOf('.csv') > -1) {
    return processarCsvFrotaUnificadaEmLotes(arquivo, mapaColaboradores, mesAlvo, nomesIgnorados, stats);
  }

  return { abastecimento: [], manutencao: [] };
}

/**
 * Processa arquivo Excel (.xlsx) convertendo para planilha temporária e lendo em blocos
 * de linhas (chunks) para NUNCA estourar a memória do Google Apps Script.
 */
function processarXlsxFrotaUnificadaEmLotes(arquivo, mapaColaboradores, mesAlvo, nomesIgnorados, stats) {
  var nomeArquivo = arquivo.getName();
  var tempId = converterXlsxParaPlanilhaTemporaria(arquivo);
  if (!tempId) {
    throw new Error("Não foi possível processar o arquivo Excel (.xlsx). Verifique as permissões de acesso ao Google Drive.");
  }

  var resultado = {
    abastecimento: [],
    manutencao: []
  };

  try {
    var tempPlanilha = SpreadsheetApp.openById(tempId);
    var fusoTemp = tempPlanilha.getSpreadsheetTimeZone(); // Preserva fuso exato da conversão do Excel
    var sheets = tempPlanilha.getSheets();
    var sheet = sheets[0];

    // Localiza a primeira aba que contenha dados
    for (var s = 0; s < sheets.length; s++) {
      if (sheets[s].getLastRow() > 1) {
        sheet = sheets[s];
        break;
      }
    }

    var totalLinhas = sheet.getLastRow();
    var totalColunas = sheet.getLastColumn();

    if (totalLinhas <= 1 || totalColunas === 0) {
      Logger.log("Arquivo sem registros ou vazio: " + nomeArquivo);
      return resultado;
    }

    // 1. Lê APENAS a 1ª linha (cabeçalho) para descobrir os índices das colunas
    var cabecalho = sheet.getRange(1, 1, 1, totalColunas).getValues()[0];
    var idx = mapearIndicesColunas(cabecalho);

    if (idx.indexMotorista === -1 || idx.indexValor === -1) {
      Logger.log("Colunas obrigatórias não encontradas no arquivo Excel: " + nomeArquivo);
      return resultado;
    }

    // 2. Lê os dados em blocos (chunks) de 2.000 linhas
    var TAMANHO_LOTE = 2000;
    for (var inicio = 2; inicio <= totalLinhas; inicio += TAMANHO_LOTE) {
      var qtd = Math.min(TAMANHO_LOTE, totalLinhas - inicio + 1);
      var bloco = sheet.getRange(inicio, 1, qtd, totalColunas).getValues();

      for (var r = 0; r < bloco.length; r++) {
        var linha = bloco[r];
        if (!linha || linha.length === 0) continue;

        stats.totalLidos++;

        var nomeOriginal = linha[idx.indexMotorista] ? linha[idx.indexMotorista].toString().trim() : "";
        if (!nomeOriginal) continue;

        var nomePadronizado = padronizarTexto(nomeOriginal);

        // 1º FILTRO: Colaborador precisa constar na aba Custos_Totais
        if (!mapaColaboradores.hasOwnProperty(nomePadronizado)) {
          nomesIgnorados[nomeOriginal] = true;
          continue;
        }

        var valorDataRaw = idx.indexData !== -1 ? linha[idx.indexData] : "";
        var periodoStr = idx.indexPeriodo !== -1 ? (linha[idx.indexPeriodo] || "").toString().trim() : "";

        // Formata data e horário preservando o fuso de origem do Excel
        var infoData = formatarDataTransacao(valorDataRaw, fusoTemp);

        // 2º FILTRO: Transação precisa pertencer ao mês da planilha
        var ehDoMes = transacaoPertenceAoMes(infoData, periodoStr, mesAlvo, nomeArquivo);
        if (!ehDoMes) {
          stats.linhasOutrosMeses++;
          continue;
        }

        var valorFormatado = formatarValorNumerico(linha[idx.indexValor]);
        var tipoTransacao = classificarTipoTransacao(linha, idx);

        if (tipoTransacao === 'ABASTECIMENTO') {
          // [A: NOME MOTORISTA, B: VALOR EMISSAO, C: PERÍODO, D: DATA/HORA]
          resultado.abastecimento.push([
            nomeOriginal,
            valorFormatado,
            mesAlvo.nome,
            infoData.str
          ]);
        } else {
          // MANUTENCAO: [A: NOME MOTORISTA, B: VALOR EMISSAO, C: TIPO ESTABELECIMENTO, D: PERÍODO, E: DATA/HORA]
          var tipoEstab = idx.indexTipoEstabelecimento !== -1 ? (linha[idx.indexTipoEstabelecimento] || "").toString().trim() : "";
          resultado.manutencao.push([
            nomeOriginal,
            valorFormatado,
            tipoEstab,
            mesAlvo.nome,
            infoData.str
          ]);
        }
      }

      bloco = null;
    }

  } finally {
    try {
      DriveApp.getFileById(tempId).setTrashed(true);
    } catch (e) {
      Logger.log("Aviso ao remover temporário: " + e.message);
    }
  }

  return resultado;
}

/**
 * Processa arquivo CSV linha a linha sem carregar matrizes 2D gigantes em memória.
 */
function processarCsvFrotaUnificadaEmLotes(arquivo, mapaColaboradores, mesAlvo, nomesIgnorados, stats) {
  var nomeArquivo = arquivo.getName();
  var blob = arquivo.getBlob();
  var conteudoCsv = blob.getDataAsString();

  var resultado = {
    abastecimento: [],
    manutencao: []
  };

  if (!conteudoCsv || conteudoCsv.trim() === "") {
    return resultado;
  }

  var linhasTexto = conteudoCsv.split(/\r?\n/);
  conteudoCsv = null;

  if (linhasTexto.length <= 1) {
    return resultado;
  }

  var delimitador = detectarDelimitador(linhasTexto[0]);
  var cabecalho = Utilities.parseCsv(linhasTexto[0], delimitador)[0];
  var idx = mapearIndicesColunas(cabecalho);

  if (idx.indexMotorista === -1 || idx.indexValor === -1) {
    Logger.log("Colunas obrigatórias não encontradas no CSV: " + nomeArquivo);
    return resultado;
  }

  for (var r = 1; r < linhasTexto.length; r++) {
    var linhaStr = linhasTexto[r];
    if (!linhaStr || linhaStr.trim() === "") continue;

    var parsed = Utilities.parseCsv(linhaStr, delimitador);
    if (!parsed || parsed.length === 0) continue;
    var linhaArr = parsed[0];
    if (!linhaArr || linhaArr.length === 0) continue;

    stats.totalLidos++;

    var nomeOriginal = linhaArr[idx.indexMotorista] ? linhaArr[idx.indexMotorista].toString().trim() : "";
    if (!nomeOriginal) continue;

    var nomePadronizado = padronizarTexto(nomeOriginal);

    // 1º FILTRO: Colaborador precisa constar na aba Custos_Totais
    if (!mapaColaboradores.hasOwnProperty(nomePadronizado)) {
      nomesIgnorados[nomeOriginal] = true;
      continue;
    }

    var valorDataRaw = idx.indexData !== -1 ? linhaArr[idx.indexData] : "";
    var periodoStr = idx.indexPeriodo !== -1 ? (linhaArr[idx.indexPeriodo] || "").toString().trim() : "";

    var infoData = formatarDataTransacao(valorDataRaw);

    // 2º FILTRO: Transação pertence ao mês da planilha
    var ehDoMes = transacaoPertenceAoMes(infoData, periodoStr, mesAlvo, nomeArquivo);
    if (!ehDoMes) {
      stats.linhasOutrosMeses++;
      continue;
    }

    var valorFormatado = formatarValorNumerico(linhaArr[idx.indexValor]);
    var tipoTransacao = classificarTipoTransacao(linhaArr, idx);

    if (tipoTransacao === 'ABASTECIMENTO') {
      resultado.abastecimento.push([
        nomeOriginal,
        valorFormatado,
        mesAlvo.nome,
        infoData.str
      ]);
    } else {
      var tipoEstab = idx.indexTipoEstabelecimento !== -1 ? (linhaArr[idx.indexTipoEstabelecimento] || "").toString().trim() : "";
      resultado.manutencao.push([
        nomeOriginal,
        valorFormatado,
        tipoEstab,
        mesAlvo.nome,
        infoData.str
      ]);
    }
  }

  linhasTexto = null;
  return resultado;
}

/**
 * Converte arquivo Excel (.xlsx) em planilha temporária do Google Sheets.
 * Usa o serviço nativo do Drive ou UrlFetch com streaming direto de Blob (sem carregar getBytes na memória JS).
 */
function converterXlsxParaPlanilhaTemporaria(arquivo) {
  var blob = arquivo.getBlob();
  var tempId = null;

  // 1. Tenta usar o serviço avançado do Drive se estiver habilitado
  if (typeof Drive !== 'undefined' && Drive.Files) {
    try {
      if (Drive.Files.insert) {
        var res = {
          title: '[TEMP_CONV] ' + arquivo.getName(),
          mimeType: MimeType.GOOGLE_SHEETS
        };
        var novo = Drive.Files.insert(res, blob, { convert: true });
        if (novo && novo.id) tempId = novo.id;
      } else if (Drive.Files.create) {
        var resCreate = {
          name: '[TEMP_CONV] ' + arquivo.getName(),
          mimeType: MimeType.GOOGLE_SHEETS
        };
        var novoCreate = Drive.Files.create(resCreate, blob);
        if (novoCreate && novoCreate.id) tempId = novoCreate.id;
      }
    } catch (e) {
      Logger.log("Aviso: Falha ao converter via Drive Service: " + e.message);
    }
  }

  // 2. Fallback direto via REST API do Drive usando Blob direto (SEM blob.getBytes())
  if (!tempId) {
    try {
      var url = 'https://www.googleapis.com/upload/drive/v2/files?uploadType=media&convert=true';
      var params = {
        method: 'post',
        headers: {
          'Authorization': 'Bearer ' + ScriptApp.getOAuthToken()
        },
        contentType: blob.getContentType() || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        payload: blob,
        muteHttpExceptions: true
      };
      var resposta = UrlFetchApp.fetch(url, params);
      var code = resposta.getResponseCode();
      if (code >= 200 && code < 300) {
        var json = JSON.parse(resposta.getContentText());
        if (json && json.id) tempId = json.id;
      } else {
        Logger.log("Erro HTTP ao converter via UrlFetch: " + code + " - " + resposta.getContentText());
      }
    } catch (e) {
      Logger.log("Aviso ao converter via UrlFetch: " + e.message);
    }
  }

  return tempId;
}

/**
 * Localiza os índices de todas as colunas obrigatórias e opcionais pelo cabeçalho
 * para o layout unificado de 39 colunas (A até AM).
 */
function mapearIndicesColunas(cabecalho) {
  var indexMotorista = -1;
  var indexValor = -1;
  var indexTipoEstabelecimento = -1;
  var indexPeriodo = -1;
  var indexData = -1;
  var indexNomeReduzido = -1;
  var indexServico = -1;
  var indexPlaca = -1;

  for (var c = 0; c < cabecalho.length; c++) {
    var col = padronizarTexto(cabecalho[c]);
    if (!col) continue;

    // NOME REDUZIDO (Coluna C - Identifica 'BRISANET ABASTECIMENTO' ou 'BRISANET MANUTENCAO')
    if (col === 'NOME REDUZIDO' || col === 'REDUZIDO' || col.indexOf('NOME REDUZIDO') > -1) {
      if (indexNomeReduzido === -1) indexNomeReduzido = c;
    }

    // MOTORISTA / CONDUTOR (Coluna K)
    if (col === 'NOME MOTORISTA' || col === 'NOME DO MOTORISTA' || col === 'NOME CONDUTOR' || col === 'NOME DO CONDUTOR') {
      if (indexMotorista === -1) indexMotorista = c;
    } else if (indexMotorista === -1 && (col.indexOf('MOTORISTA') > -1 || col.indexOf('CONDUTOR') > -1)) {
      indexMotorista = c;
    }

    // VALOR EMISSÃO / VALOR TOTAL (Coluna S)
    if (col === 'VALOR EMISSAO' || col === 'VALOR DA EMISSAO' || col === 'VALOR TOTAL' || col === 'VALOR BRUTO' || col === 'VALOR LIQUIDO' || col === 'VALOR TRANSACAO') {
      if (indexValor === -1) indexValor = c;
    } else if (indexValor === -1 && col.indexOf('VALOR') > -1 && col.indexOf('UNIT') === -1 && col.indexOf('LITRO') === -1 && col.indexOf('VL/') === -1) {
      indexValor = c;
    }

    // TIPO ESTABELECIMENTO (Coluna V / índice 21)
    var ehCodigoOuNomeEstab = (col.indexOf('CODIGO') > -1 || col.indexOf('COD') > -1 || col.indexOf('NOME') > -1);
    if (!ehCodigoOuNomeEstab) {
      if (col === 'TIPO ESTABELECIMENTO' || col === 'TIPO DE ESTABELECIMENTO' || (col.indexOf('TIPO') > -1 && col.indexOf('ESTABELECIMENTO') > -1)) {
        indexTipoEstabelecimento = c;
      } else if (indexTipoEstabelecimento === -1 && (col === 'RAMO' || col.indexOf('RAMO') > -1 || col === 'SEGMENTO' || col.indexOf('SEGMENTO') > -1)) {
        indexTipoEstabelecimento = c;
      }
    }

    // DATA / HORA (Coluna D)
    if (col === 'DATA TRANSACAO' || col === 'DATA/HORA TRANSACAO' || col === 'DATA HORA TRANSACAO' || col === 'DATA/HORA' || col === 'DATA HORA' || col === 'DATA EMISSAO') {
      if (indexData === -1) indexData = c;
    } else if (indexData === -1 && col.indexOf('DATA') > -1 && col.indexOf('VALOR') === -1 && col.indexOf('NASC') === -1 && col.indexOf('VENC') === -1) {
      indexData = c;
    }

    // PERÍODO
    if (col === 'PERIODO' || col === 'PERIODO DE CONSUMO' || col === 'MES' || col === 'COMPETENCIA' || col === 'REFERENCIA') {
      if (indexPeriodo === -1) indexPeriodo = c;
    }

    // SERVICO (Coluna L)
    if (col === 'SERVICO' || col === 'SERVICOS' || col === 'TIPO SERVICO') {
      if (indexServico === -1) indexServico = c;
    }

    // PLACA (Coluna E)
    if (col === 'PLACA' || col === 'PLACA VEICULO') {
      if (indexPlaca === -1) indexPlaca = c;
    }
  }

  // Fallback posicional estrito para o layout oficial padrão de 39 colunas
  if (cabecalho.length >= 22) {
    if (indexNomeReduzido === -1 && cabecalho.length > 2) indexNomeReduzido = 2; // Coluna C (idx 2)
    if (indexData === -1 && cabecalho.length > 3) indexData = 3;                 // Coluna D (idx 3)
    if (indexMotorista === -1 && cabecalho.length > 10) indexMotorista = 10;     // Coluna K (idx 10)
    if (indexValor === -1 && cabecalho.length > 18) indexValor = 18;             // Coluna S (idx 18)
    if ((indexTipoEstabelecimento === -1 || indexTipoEstabelecimento === 19 || indexTipoEstabelecimento === 20) && cabecalho.length > 21) {
      indexTipoEstabelecimento = 21; // Coluna V (idx 21 - TIPO ESTABELECIMENTO)
    }
  }

  return {
    indexMotorista: indexMotorista,
    indexValor: indexValor,
    indexTipoEstabelecimento: indexTipoEstabelecimento,
    indexPeriodo: indexPeriodo,
    indexData: indexData,
    indexNomeReduzido: indexNomeReduzido,
    indexServico: indexServico,
    indexPlaca: indexPlaca
  };
}

/**
 * Classifica a linha entre 'ABASTECIMENTO' e 'MANUTENCAO' com base na Coluna C (NOME REDUZIDO).
 */
function classificarTipoTransacao(linha, idx) {
  var textoReduzido = (idx.indexNomeReduzido !== -1 && linha[idx.indexNomeReduzido]) ? padronizarTexto(linha[idx.indexNomeReduzido]) : "";

  if (textoReduzido.indexOf('ABASTECIMENTO') > -1) {
    return 'ABASTECIMENTO';
  }
  if (textoReduzido.indexOf('MANUTENCAO') > -1 || textoReduzido.indexOf('MANUT') > -1) {
    return 'MANUTENCAO';
  }

  // Fallbacks complementares (caso a coluna NOME REDUZIDO venha em branco ou diferente)
  var servico = (idx.indexServico !== -1 && linha[idx.indexServico]) ? padronizarTexto(linha[idx.indexServico]) : "";
  if (servico.indexOf('ABASTECIMENTO') > -1 || servico.indexOf('COMBUST') > -1) {
    return 'ABASTECIMENTO';
  }
  if (servico.indexOf('MANUTENCAO') > -1 || servico.indexOf('PECA') > -1 || servico.indexOf('OFICINA') > -1 || servico.indexOf('MECANICA') > -1) {
    return 'MANUTENCAO';
  }

  return 'ABASTECIMENTO';
}

/**
 * Formata valores de data aceitando objetos Date do Excel, números seriais ou strings de texto.
 * Permite passar o fuso horário original da planilha convertida para não distorcer o horário com fusos externos.
 */
function formatarDataTransacao(valorData, fusoOrigem) {
  if (valorData === undefined || valorData === null || valorData === "") {
    return { str: "", mes: null, ano: null };
  }

  var fuso = fusoOrigem || 'America/Fortaleza';

  // Se for objeto Date do JavaScript
  if (Object.prototype.toString.call(valorData) === '[object Date]') {
    var dataStr = Utilities.formatDate(valorData, fuso, "dd/MM/yyyy HH:mm:ss");
    var m = Utilities.formatDate(valorData, fuso, "MM");
    var a = Utilities.formatDate(valorData, fuso, "yyyy");
    return { str: dataStr, mes: m, ano: a };
  }

  // Se for número serial do Excel (ex: 45566.523)
  if (typeof valorData === 'number') {
    var dataBase = new Date(1899, 11, 30);
    var milissegundos = Math.round(valorData * 86400000);
    var dataObj = new Date(dataBase.getTime() + milissegundos);
    var dStr = Utilities.formatDate(dataObj, fuso, "dd/MM/yyyy HH:mm:ss");
    var mesNum = Utilities.formatDate(dataObj, fuso, "MM");
    var anoNum = Utilities.formatDate(dataObj, fuso, "yyyy");
    return { str: dStr, mes: mesNum, ano: anoNum };
  }

  // Se for texto / string
  var s = valorData.toString().trim();
  var componentes = extrairComponentesData(s);
  if (componentes) {
    return {
      str: s,
      mes: componentes.mes,
      ano: componentes.ano
    };
  }

  return { str: s, mes: null, ano: null };
}

/**
 * Extrai o mês e ano do nome da planilha de destino (ex: "10. CUSTOS DO SETOR - OUTUBRO - 2026").
 */
function extrairMesDeTexto(texto) {
  if (!texto) return null;
  var txt = padronizarTexto(texto);

  var meses = [
    { nome: 'JANEIRO', codigo: '01' },
    { nome: 'FEVEREIRO', codigo: '02' },
    { nome: 'MARCO', codigo: '03' },
    { nome: 'ABRIL', codigo: '04' },
    { nome: 'MAIO', codigo: '05' },
    { nome: 'JUNHO', codigo: '06' },
    { nome: 'JULHO', codigo: '07' },
    { nome: 'AGOSTO', codigo: '08' },
    { nome: 'SETEMBRO', codigo: '09' },
    { nome: 'OUTUBRO', codigo: '10' },
    { nome: 'NOVEMBRO', codigo: '11' },
    { nome: 'DEZEMBRO', codigo: '12' }
  ];

  for (var i = 0; i < meses.length; i++) {
    if (txt.indexOf(meses[i].nome) > -1) {
      var matchAno = txt.match(/20\d{2}/);
      return {
        nome: meses[i].nome,
        codigo: meses[i].codigo,
        ano: matchAno ? matchAno[0] : "2026"
      };
    }
  }

  var matchNum = txt.match(/(?:^|\D)(0[1-9]|1[0-2])(?:\D|$)/);
  if (matchNum) {
    var cod = matchNum[1];
    var idx = parseInt(cod, 10) - 1;
    var matchAno2 = txt.match(/20\d{2}/);
    return {
      nome: meses[idx].nome,
      codigo: cod,
      ano: matchAno2 ? matchAno2[0] : "2026"
    };
  }

  return null;
}

/**
 * Identifica o mês de competência a partir do nome da planilha.
 */
function obterMesAlvoDaPlanilha(planilha) {
  var nomePlanilha = planilha ? planilha.getName() : "";
  var mesInfo = extrairMesDeTexto(nomePlanilha);

  if (mesInfo) {
    return mesInfo;
  }

  // Fallback padrão: Outubro/2026
  return {
    nome: 'OUTUBRO',
    codigo: '10',
    ano: '2026'
  };
}

/**
 * Valida com rigor se a transação do extrato pertence à competência da planilha.
 */
function transacaoPertenceAoMes(infoData, periodoStr, mesAlvo, nomeArquivo) {
  // 1. Checa pela data/hora da transação
  if (infoData && infoData.mes) {
    if (infoData.mes === mesAlvo.codigo) {
      if (infoData.ano && mesAlvo.ano && infoData.ano !== mesAlvo.ano) {
        return false;
      }
      return true;
    } else {
      return false;
    }
  }

  // 2. Se a data não pôde ser analisada, checa pela coluna de período
  if (periodoStr) {
    var compPeriodo = extrairComponentesData(periodoStr);
    if (compPeriodo && compPeriodo.mes) {
      return compPeriodo.mes === mesAlvo.codigo;
    }

    var periodoNorm = padronizarTexto(periodoStr);
    if (periodoNorm.indexOf(mesAlvo.nome) > -1 || periodoNorm.indexOf('/' + mesAlvo.codigo) > -1) {
      return true;
    }
  }

  // 3. Fallback: Se o próprio arquivo for segregado mensalmente
  if (nomeArquivo) {
    var mesArquivo = extrairMesDeTexto(nomeArquivo);
    if (mesArquivo && mesArquivo.codigo === mesAlvo.codigo) {
      return true;
    }
  }

  return false;
}

/**
 * Extrai mês e ano de padrões dd/mm/aaaa ou aaaa-mm-dd.
 */
function extrairComponentesData(dataStr) {
  if (!dataStr) return null;

  // Formato dd/mm/aaaa ou d/m/aaaa
  var matchBR = dataStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (matchBR) {
    var mesBR = matchBR[2].length === 1 ? '0' + matchBR[2] : matchBR[2];
    var anoBR = matchBR[3].length === 2 ? '20' + matchBR[3] : matchBR[3];
    return { dia: matchBR[1], mes: mesBR, ano: anoBR };
  }

  // Formato aaaa-mm-dd
  var matchISO = dataStr.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (matchISO) {
    var mesISO = matchISO[2].length === 1 ? '0' + matchISO[2] : matchISO[2];
    return { dia: matchISO[3], mes: mesISO, ano: matchISO[1] };
  }

  // Formato mm/aaaa
  var matchMesAno = dataStr.match(/^(\d{1,2})\/(\d{2,4})$/);
  if (matchMesAno) {
    var mesMA = matchMesAno[1].length === 1 ? '0' + matchMesAno[1] : matchMesAno[1];
    var anoMA = matchMesAno[2].length === 2 ? '20' + matchMesAno[2] : matchMesAno[2];
    return { dia: '01', mes: mesMA, ano: anoMA };
  }

  return null;
}

/**
 * Retorna a planilha de destino correta (a ativa no momento, ou por ID).
 */
function obterPlanilhaAlvo() {
  try {
    var ativa = SpreadsheetApp.getActiveSpreadsheet();
    if (ativa) return ativa;
  } catch (e) {}

  var arquivos = DriveApp.getFilesByName(CONFIG_GERAL.NOME_PLANILHA_PADRAO);
  if (arquivos.hasNext()) {
    var arquivo = arquivos.next();
    return SpreadsheetApp.openById(arquivo.getId());
  }

  try {
    var pasta2026 = DriveApp.getFolderById(CONFIG_GERAL.PASTA_RAIZ_2026);
    var arqsPasta = pasta2026.getFiles();
    while (arqsPasta.hasNext()) {
      var arq = arqsPasta.next();
      if (arq.getMimeType() === MimeType.GOOGLE_SHEETS) {
        return SpreadsheetApp.openById(arq.getId());
      }
    }
  } catch (e) {}

  return null;
}

/**
 * Carrega os colaboradores oficiais da Coluna A da aba 'Custos_Totais'.
 */
function carregarListaColaboradores(planilha) {
  var mapa = {};
  if (!planilha) return mapa;

  var abaCustos = planilha.getSheetByName(CONFIG_GERAL.ABA_CUSTOS_TOTAIS);
  if (!abaCustos) {
    Logger.log("Aba '" + CONFIG_GERAL.ABA_CUSTOS_TOTAIS + "' não encontrada na planilha.");
    return mapa;
  }

  var ultimaLinha = abaCustos.getLastRow();
  if (ultimaLinha <= 1) return mapa;

  var valores = abaCustos.getRange(2, CONFIG_GERAL.COLUNA_COLABORADORES, ultimaLinha - 1, 1).getValues();

  for (var i = 0; i < valores.length; i++) {
    var nome = valores[i][0];
    if (nome) {
      var nomeLimpo = nome.toString().trim();
      var padronizado = padronizarTexto(nomeLimpo);
      if (padronizado && padronizado !== "NOME" && padronizado !== "COLABORADOR" && padronizado !== "TOTAL") {
        mapa[padronizado] = nomeLimpo;
      }
    }
  }

  return mapa;
}

/**
 * Retorna a primeira aba que coincida com um dos nomes alternativos fornecidos.
 */
function obterAbaPorNomes(planilha, nomes) {
  if (!planilha || !nomes) return null;
  for (var i = 0; i < nomes.length; i++) {
    var aba = planilha.getSheetByName(nomes[i]);
    if (aba) return aba;
  }
  return null;
}

/**
 * Remove acentuação, espaços extras e padroniza para maiúsculas.
 */
function padronizarTexto(texto) {
  if (!texto) return "";
  return texto.toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase();
}

/**
 * Converte qualquer valor em número decimal real (Float).
 */
function formatarValorNumerico(valor) {
  if (valor === undefined || valor === null || valor === "") return 0;
  if (typeof valor === 'number') return valor;

  var str = valor.toString().replace(/R\$/g, '').trim();
  if (str.indexOf(',') > -1 && str.indexOf('.') > -1) {
    str = str.replace(/\./g, '').replace(',', '.');
  } else if (str.indexOf(',') > -1) {
    str = str.replace(',', '.');
  }

  var num = parseFloat(str);
  return isNaN(num) ? 0 : num;
}

/**
 * Detecta automaticamente o delimitador de um arquivo CSV (; ou ,).
 */
function detectarDelimitador(linhaCabecalho) {
  var virgulas = (linhaCabecalho.match(/,/g) || []).length;
  var pontoVirgulas = (linhaCabecalho.match(/;/g) || []).length;
  return pontoVirgulas >= virgulas ? ";" : ",";
}

/**
 * Exibe alerta visual se executado no Sheets ou grava no Logger se for em segundo plano.
 */
function exibirAlerta(msg) {
  try {
    SpreadsheetApp.getUi().alert(msg);
  } catch (e) {
    Logger.log(msg);
  }
}
