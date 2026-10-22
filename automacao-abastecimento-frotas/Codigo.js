/**
 * ============================================================================
 * GESTÃO DE CUSTOS DO SETOR - OPERAÇÃO E MANUTENÇÃO DE REDES
 * ============================================================================
 * Automação Integrada de Custos: Frota (Abastecimento / Manutenção) e Viagens (Alimentação / Hospedagem)
 * 
 * Funcionalidades:
 * 1. Módulo de Viagens (Alimentação e Hospedagem):
 *    - Origem: Planilha 'CONTROLE DE VALORES - ALIMENTAÇÃO/HOSPEDAGEM-2026'
 *    - Destino: Aba 'Base_Viagens'
 *    - Estrutura da Aba:
 *      • Linha 1: Cabeçalhos de Seção ('Alimentação' acima de A:C; 'Hospedagem' acima de F:H)
 *      • Linha 2: Cabeçalhos de Colunas (A: Colaborador, B: Valor Total, C: Mês Lançamento - SAP,
 *                 D: nome corrigido, E: [Espaço], F: Colaborador, G: Valor Diária, H: Mês Lançamento - SAP)
 *      • Linha 3 em diante: Lançamentos
 *    - Regra de Limpeza: Limpa rigorosamente da linha 3 em diante apenas nas colunas A:C e F:H.
 *      Preserva cabeçalhos (linhas 1 e 2), Coluna D ('nome corrigido') e Coluna E intactas.
 *    - Filtro por Colaborador: Apenas colaboradores listados na Coluna A da aba 'Custos_Totais'.
 *    - Filtro por Mês: Apenas lançamentos referentes ao mês da planilha (ex.: Outubro).
 * 
 * 2. Módulo de Frota (Abastecimento e Manutenção):
 *    - Suporte a Arquivos Excel (.xlsx) e CSV em Lotes (Chunks) com baixo consumo de memória.
 *    - Preservação do fuso de origem do Excel, garantindo a hora real do cupom fiscal.
 *    - Abas 'Base_Abastecimento' e 'Base_Manutenção' limpas e relançadas da linha 2 em diante.
 *    - Deduplicação por transação (Motorista + Valor + Data/Hora) entre múltiplos arquivos.
 * 
 * 3. Regra de Abrangência Temporal (Julho/2026 em diante):
 *    - Válido exclusivamente para as planilhas a partir de JULHO/2026 (Julho, Agosto, Setembro, Outubro, etc.).
 *    - Planilhas de Janeiro a Junho possuem formato antigo e são mantidas intactas.
 * 
 * 4. Sincronização Multi-Planilhas em Lote (Pasta 2026):
 *    - Permite sincronizar todas as planilhas da pasta 2026 (>= Julho) em uma única execução
 *      (Frota Completa, Viagens Completa ou Ambos).
 * 
 * 5. Menu Superior Automático (onOpen):
 *    - Cria o menu "💰 Gestão de Custos" integrando todas as opções em um só lugar.
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

  // Pastas de Combustível (Abastecimento)
  PASTA_ORIGEM_COMBUSTIVEL: '1exK26bgZNurn4bh0Q5bv-f-WyM3f-fxs',
  PASTA_PROCESSADOS_COMBUSTIVEL: '1FNAHGP3n2FZzIDC_NphwkG26G1CrQL0F',

  // Pastas de Manutenção
  PASTA_ORIGEM_MANUTENCAO: '1zpsygbFL4d6PtsbjN9FMVITt2ZptR8f2',
  PASTA_PROCESSADOS_MANUTENCAO: '12q2UQwRaP6vxJXtiMVC1eCThI4WG6Ko2',

  // Planilha de Origem de Viagens (Alimentação e Hospedagem)
  ID_PLANILHA_VIAGENS_ORIGEM: '1ETgxoOa4LyfZGTMYsTgMlEPyFHCDP43VH9dUNdTqYEk',
  ABA_ORIGEM_ALIMENTACAO: 'Alimentação 2026',
  ABA_ORIGEM_HOSPEDAGEM: 'Hospedagem 2026',

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
      .addItem("⛽ Frota: Importar Abastecimento (Desta Planilha)", "importarDadosAbastecimento")
      .addItem("🔧 Frota: Importar Manutenção (Desta Planilha)", "importarDadosManutencao")
      .addItem("✈️ Viagens: Importar Alimentação e Hospedagem (Desta Planilha)", "importarDadosViagens")
      .addItem("🔄 Importar TUDO (Frota + Viagens - Desta Planilha)", "importarTodosOsCustos")
      .addSeparator()
      .addItem("🌐 Sincronizar TODAS as Planilhas (Frota + Viagens)", "sincronizarTodasPlanilhas")
      .addItem("⛽ Sincronizar Apenas Frota em TODAS (Julho em diante)", "sincronizarFrotaTodas")
      .addItem("✈️ Sincronizar Apenas Viagens em TODAS (Julho em diante)", "sincronizarViagensTodas")
      .addSeparator()
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

  if (nomeAba.indexOf("abastecimento") > -1) {
    importarDadosAbastecimento();
  } else if (nomeAba.indexOf("manuten") > -1) {
    importarDadosManutencao();
  } else if (nomeAba.indexOf("viagen") > -1 || nomeAba.indexOf("viagem") > -1) {
    importarDadosViagens();
  } else {
    var ui = SpreadsheetApp.getUi();
    var resposta = ui.alert(
      "Importação de Custos",
      "Você está na aba '" + abaAtiva.getName() + "'.\n\n" +
      "Deseja importar TODOS os custos (Abastecimento, Manutenção e Viagens) para o mês desta planilha?",
      ui.ButtonSet.YES_NO
    );

    if (resposta === ui.Button.YES) {
      importarTodosOsCustos();
    }
  }
}

/**
 * Executa todas as importações (Abastecimento, Manutenção e Viagens) para a planilha atual.
 */
function importarTodosOsCustos() {
  Logger.log("Iniciando importação completa (Abastecimento + Manutenção + Viagens)...");
  importarDadosAbastecimento();
  importarDadosManutencao();
  importarDadosViagens();
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
    "Esta opção lerá os arquivos (.xlsx e .csv) já processados no Drive e filtrará apenas o mês da planilha atual.\n\nDeseja continuar?",
    ui.ButtonSet.YES_NO
  );

  if (resposta === ui.Button.YES) {
    importarDadosAbastecimento(true);
    importarDadosManutencao(true);
  }
}


// ============================================================================
// 3. IMPORTAÇÃO DE ABASTECIMENTO (Aba: Base_Abastecimento)
// ============================================================================
function importarDadosAbastecimento(lerDeProcessados) {
  Logger.log("Iniciando importação de ABASTECIMENTO...");

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

  var abaDestino = obterAbaPorNomes(planilha, [CONFIG_GERAL.ABA_ABASTECIMENTO, 'Base_Abastecimento', 'Base Abastecimento']);
  if (!abaDestino) {
    exibirAlerta("Erro: A aba '" + CONFIG_GERAL.ABA_ABASTECIMENTO + "' não foi encontrada na planilha atual.");
    return;
  }

  // 2. Carregar colaboradores de referência da aba Custos_Totais (Coluna A)
  var mapaColaboradores = carregarListaColaboradores(planilha);
  if (Object.keys(mapaColaboradores).length === 0) {
    exibirAlerta("Atenção: Nenhum colaborador foi encontrado na aba '" + CONFIG_GERAL.ABA_CUSTOS_TOTAIS + "' (Coluna A).\nVerifique se a aba está preenchida.");
    return;
  }

  // 3. Obter pasta de origem
  var pastaOrigem = DriveApp.getFolderById(CONFIG_GERAL.PASTA_ORIGEM_COMBUSTIVEL);
  var pastaProcessados = obterOuCriarPastaProcessados(pastaOrigem, CONFIG_GERAL.PASTA_PROCESSADOS_COMBUSTIVEL);

  var pastaLeitura = (lerDeProcessados === true) ? pastaProcessados : pastaOrigem;
  var arquivos = pastaLeitura.getFiles();

  if (!arquivos.hasNext() && !lerDeProcessados) {
    var ui = SpreadsheetApp.getUi();
    var resp = ui.alert(
      "Nenhum Arquivo Novo",
      "Não há arquivos (.xlsx ou .csv) na pasta 'Combustível - Frotas Telefonia'.\n\n" +
      "Deseja buscar nos arquivos já processados para extrair os lançamentos de " + mesAlvo.nome + "?",
      ui.ButtonSet.YES_NO
    );
    if (resp === ui.Button.YES) {
      importarDadosAbastecimento(true);
      return;
    } else {
      return;
    }
  }

  var linhasParaInserir = [];
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
        var linhasArquivo = processarArquivoEmLotes(arquivo, 'ABASTECIMENTO', mapaColaboradores, mesAlvo, nomesIgnorados, stats);

        if (linhasArquivo && linhasArquivo.length > 0) {
          for (var k = 0; k < linhasArquivo.length; k++) {
            linhasParaInserir.push(linhasArquivo[k]);
          }
          linhasArquivo = null;
        }

        totalArquivos++;

        if (!lerDeProcessados) {
          arquivo.moveTo(pastaProcessados);
        }

      } catch (e) {
        Logger.log("Erro ao processar abastecimento em " + nomeArquivo + ": " + e.toString());
      }
    }
  }

  // 4. REGRA DE LIMPEZA E RELANÇAMENTO (Sem acúmulo / sem duplicidade)
  if (linhasParaInserir.length > 0) {
    // 1º: Limpa SEMPRE todos os dados anteriores da linha 2 em diante
    var linhasAtuais = abaDestino.getLastRow();
    if (linhasAtuais > 1) {
      abaDestino.getRange(2, 1, linhasAtuais - 1, abaDestino.getLastColumn()).clearContent();
      SpreadsheetApp.flush();
    }

    // 2º: Garante cabeçalho se a aba estiver vazia
    if (abaDestino.getLastRow() === 0) {
      abaDestino.getRange(1, 1, 1, 4).setValues([['NOME MOTORISTA', 'VALOR EMISSAO', 'PERÍODO', 'DATA/HORA']]);
    }

    // 3º: Grava os novos dados SEMPRE a partir da linha 2
    abaDestino.getRange(2, 1, linhasParaInserir.length, 4).setValues(linhasParaInserir);
    abaDestino.getRange(2, 2, linhasParaInserir.length, 1).setNumberFormat('"R$"\\ #,##0.00');

    var msgSucesso = "✅ Sucesso! " + linhasParaInserir.length + " registro(s) de abastecimento de " + mesAlvo.nome + " lançados na aba 'Base_Abastecimento'.\n\n" +
                     "• Os dados anteriores foram limpos e relançados com sucesso.\n" +
                     "• " + stats.linhasOutrosMeses + " registros de outros meses foram filtrados e desconsiderados.";
    if (stats.totalLidos > 0) {
      msgSucesso += "\n• Total de linhas analisadas no arquivo: " + stats.totalLidos + ".";
    }
    Logger.log(msgSucesso);
    exibirAlerta(msgSucesso);
  } else {
    var msgVazia = "Processo finalizado. Nenhum lançamento correspondente ao mês de " + mesAlvo.nome + " foi encontrado nos arquivos.";
    if (stats.linhasOutrosMeses > 0) {
      msgVazia += "\n\n(Foram ignorados " + stats.linhasOutrosMeses + " registros pertencentes a outros meses).";
    }
    Logger.log(msgVazia);
    exibirAlerta(msgVazia);
  }

  var listaIgnorados = Object.keys(nomesIgnorados);
  if (listaIgnorados.length > 0) {
    Logger.log("Motoristas nos arquivos que não constam em Custos_Totais: " + listaIgnorados.join(", "));
  }
}


// ============================================================================
// 4. IMPORTAÇÃO DE MANUTENÇÃO (Aba: Base_Manutenção)
// ============================================================================
function importarDadosManutencao(lerDeProcessados) {
  Logger.log("Iniciando importação de MANUTENÇÃO...");

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

  var abaDestino = obterAbaPorNomes(planilha, [CONFIG_GERAL.ABA_MANUTENCAO, 'Base_Manutenção', 'Base_Manutencao', 'Base Manutenção']);
  if (!abaDestino) {
    exibirAlerta("Erro: A aba '" + CONFIG_GERAL.ABA_MANUTENCAO + "' não foi encontrada na planilha atual.");
    return;
  }

  // 2. Carregar colaboradores de referência da aba Custos_Totais (Coluna A)
  var mapaColaboradores = carregarListaColaboradores(planilha);
  if (Object.keys(mapaColaboradores).length === 0) {
    exibirAlerta("Atenção: Nenhum colaborador foi encontrado na aba '" + CONFIG_GERAL.ABA_CUSTOS_TOTAIS + "' (Coluna A).\nVerifique se a aba está preenchida.");
    return;
  }

  // 3. Obter pasta de origem
  var pastaOrigem = DriveApp.getFolderById(CONFIG_GERAL.PASTA_ORIGEM_MANUTENCAO);
  var pastaProcessados = obterOuCriarPastaProcessados(pastaOrigem, CONFIG_GERAL.PASTA_PROCESSADOS_MANUTENCAO);

  var pastaLeitura = (lerDeProcessados === true) ? pastaProcessados : pastaOrigem;
  var arquivos = pastaLeitura.getFiles();

  if (!arquivos.hasNext() && !lerDeProcessados) {
    var ui = SpreadsheetApp.getUi();
    var resp = ui.alert(
      "Nenhum Arquivo Novo",
      "Não há arquivos (.xlsx ou .csv) na pasta 'Manutenção - Frota Telefonia'.\n\n" +
      "Deseja buscar nos arquivos já processados para extrair os lançamentos de " + mesAlvo.nome + "?",
      ui.ButtonSet.YES_NO
    );
    if (resp === ui.Button.YES) {
      importarDadosManutencao(true);
      return;
    } else {
      return;
    }
  }

  var linhasParaInserir = [];
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
        var linhasArquivo = processarArquivoEmLotes(arquivo, 'MANUTENCAO', mapaColaboradores, mesAlvo, nomesIgnorados, stats);

        if (linhasArquivo && linhasArquivo.length > 0) {
          for (var k = 0; k < linhasArquivo.length; k++) {
            linhasParaInserir.push(linhasArquivo[k]);
          }
          linhasArquivo = null;
        }

        totalArquivos++;

        if (!lerDeProcessados) {
          arquivo.moveTo(pastaProcessados);
        }

      } catch (e) {
        Logger.log("Erro ao processar manutenção em " + nomeArquivo + ": " + e.toString());
      }
    }
  }

  // 4. REGRA DE LIMPEZA E RELANÇAMENTO (Sem acúmulo / sem duplicidade)
  if (linhasParaInserir.length > 0) {
    var linhasAtuais = abaDestino.getLastRow();
    if (linhasAtuais > 1) {
      abaDestino.getRange(2, 1, linhasAtuais - 1, abaDestino.getLastColumn()).clearContent();
      SpreadsheetApp.flush();
    }

    if (abaDestino.getLastRow() === 0) {
      abaDestino.getRange(1, 1, 1, 5).setValues([['NOME MOTORISTA', 'VALOR EMISSAO', 'TIPO ESTABELECIMENTO', 'PERÍODO', 'DATA/HORA']]);
    }

    abaDestino.getRange(2, 1, linhasParaInserir.length, 5).setValues(linhasParaInserir);
    abaDestino.getRange(2, 2, linhasParaInserir.length, 1).setNumberFormat('"R$"\\ #,##0.00');

    var msgSucesso = "✅ Sucesso! " + linhasParaInserir.length + " registro(s) de manutenção de " + mesAlvo.nome + " lançados na aba 'Base_Manutenção'.\n\n" +
                     "• Os dados anteriores foram limpos e relançados com sucesso.\n" +
                     "• " + stats.linhasOutrosMeses + " registros de outros meses foram filtrados e desconsiderados.";
    if (stats.totalLidos > 0) {
      msgSucesso += "\n• Total de linhas analisadas no arquivo: " + stats.totalLidos + ".";
    }
    Logger.log(msgSucesso);
    exibirAlerta(msgSucesso);
  } else {
    var msgVazia = "Processo finalizado. Nenhum lançamento de manutenção correspondente ao mês de " + mesAlvo.nome + " foi encontrado.";
    if (stats.linhasOutrosMeses > 0) {
      msgVazia += "\n\n(Foram ignorados " + stats.linhasOutrosMeses + " registros pertencentes a outros meses).";
    }
    Logger.log(msgVazia);
    exibirAlerta(msgVazia);
  }

  var listaIgnorados = Object.keys(nomesIgnorados);
  if (listaIgnorados.length > 0) {
    Logger.log("Motoristas nos arquivos que não constam em Custos_Totais: " + listaIgnorados.join(", "));
  }
}


// ============================================================================
// 5. IMPORTAÇÃO DE VIAGENS (Aba: Base_Viagens)
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
                   "• Filtrados rigorosamente pelos colaboradores da aba 'Custos_Totais'.\n" +
                   "• Linha 1 e 2 (Cabeçalhos) e Coluna D ('nome corrigido') mantidas intactas.\n" +
                   "• Dados anteriores da linha 3 em diante foram limpos e relançados.";

  Logger.log(msgSucesso);
  if (!silencioso) {
    exibirAlerta(msgSucesso);
  }

  return {
    alimentacao: totalAlim,
    hospedagem: totalHosp,
    outrosMesesAlim: dadosAlimentacao.stats.linhasOutrosMeses,
    outrosMesesHosp: dadosHospedagem.stats.linhasOutrosMeses
  };
}

/**
 * Extrai registros de uma aba da planilha de Viagens (Alimentação ou Hospedagem),
 * aplicando os filtros de mês e de colaboradores autorizados.
 */
function extrairRegistrosViagensOrigem(ssOrigem, nomesPossiveisAba, tipoViagem, mesAlvo, mapaColaboradores) {
  var aba = obterAbaPorNomes(ssOrigem, nomesPossiveisAba);
  if (!aba) {
    Logger.log("Aba de origem para " + tipoViagem + " não encontrada na planilha de viagens.");
    return { linhas: [], stats: { totalLidos: 0, linhasOutrosMeses: 0 } };
  }

  var lastRow = aba.getLastRow();
  var lastCol = aba.getLastColumn();
  if (lastRow <= 1 || lastCol === 0) {
    return { linhas: [], stats: { totalLidos: 0, linhasOutrosMeses: 0 } };
  }

  var dados = aba.getRange(1, 1, lastRow, lastCol).getValues();

  // Localiza a linha do cabeçalho (pode estar na linha 1 ou 2)
  var linhaCabecalhoIdx = -1;
  for (var r = 0; r < Math.min(5, dados.length); r++) {
    var linha = dados[r];
    for (var c = 0; c < linha.length; c++) {
      var txt = padronizarTexto(linha[c]);
      if (txt === 'COLABORADOR' || txt === 'NOME' || txt === 'FUNCIONARIO' || txt === 'SOLICITANTE' || txt === 'NOME COLABORADOR') {
        linhaCabecalhoIdx = r;
        break;
      }
    }
    if (linhaCabecalhoIdx !== -1) break;
  }

  if (linhaCabecalhoIdx === -1) {
    linhaCabecalhoIdx = 0;
  }

  var cabecalho = dados[linhaCabecalhoIdx];
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
      col.indexOf('QTD') > -1 ||
      col.indexOf('QUANTIDADE') > -1 ||
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

  // Define a coluna de valor com prioridade estrita de acordo com o tipo
  var idxValor = -1;
  if (tipoViagem === 'HOSPEDAGEM') {
    // Para Hospedagem, a coluna da aba de destino é 'VALOR DIÁRIA', portanto priorizamos VALOR DA DIÁRIA
    if (idxValorDiaria !== -1) {
      idxValor = idxValorDiaria;
    } else if (idxValorTotal !== -1) {
      idxValor = idxValorTotal;
    } else if (idxValorGenerico !== -1) {
      idxValor = idxValorGenerico;
    }
  } else {
    // Para Alimentação, priorizamos VALOR TOTAL
    if (idxValorTotal !== -1) {
      idxValor = idxValorTotal;
    } else if (idxValorGenerico !== -1) {
      idxValor = idxValorGenerico;
    } else if (idxValorDiaria !== -1) {
      idxValor = idxValorDiaria;
    }
  }

  Logger.log("Mapeamento colunas " + tipoViagem + ": Colaborador=" + idxColaborador + " ('" + (idxColaborador !== -1 ? cabecalho[idxColaborador] : "NÃO") + "'), Valor=" + idxValor + " ('" + (idxValor !== -1 ? cabecalho[idxValor] : "NÃO") + "'), MesSAP=" + idxMesSap + " ('" + (idxMesSap !== -1 ? cabecalho[idxMesSap] : "NÃO") + "')");

  var linhasFiltradas = [];
  var stats = { totalLidos: 0, linhasOutrosMeses: 0 };

  for (var i = linhaCabecalhoIdx + 1; i < dados.length; i++) {
    var row = dados[i];
    if (!row || row.length === 0) continue;

    var nomeRaw = idxColaborador !== -1 && row[idxColaborador] ? row[idxColaborador].toString().trim() : "";
    if (!nomeRaw) continue;

    stats.totalLidos++;

    // 1º FILTRO: Colaborador precisa constar na aba Custos_Totais
    var nomePadrao = padronizarTexto(nomeRaw);
    if (!mapaColaboradores.hasOwnProperty(nomePadrao)) {
      continue;
    }

    // 2º FILTRO: Mês de competência
    var valorMesSap = idxMesSap !== -1 ? row[idxMesSap] : "";
    var valorMesRef = idxMesRef !== -1 ? row[idxMesRef] : "";

    var ehDoMes = false;
    if (valorMesSap) {
      ehDoMes = valorPertenceAoMesViagens(valorMesSap, mesAlvo);
    }
    if (!ehDoMes && valorMesRef) {
      ehDoMes = valorPertenceAoMesViagens(valorMesRef, mesAlvo);
    }

    if (!ehDoMes) {
      stats.linhasOutrosMeses++;
      continue;
    }

    // Extrai o valor monetário correto
    var valorRaw = 0;
    if (tipoViagem === 'HOSPEDAGEM') {
      if (idxValorDiaria !== -1 && row[idxValorDiaria] !== undefined && row[idxValorDiaria] !== null && row[idxValorDiaria] !== "") {
        valorRaw = row[idxValorDiaria];
      } else if (idxValorTotal !== -1 && row[idxValorTotal] !== undefined && row[idxValorTotal] !== null && row[idxValorTotal] !== "") {
        valorRaw = row[idxValorTotal];
      } else if (idxValor !== -1 && row[idxValor] !== undefined && row[idxValor] !== null && row[idxValor] !== "") {
        valorRaw = row[idxValor];
      }
    } else {
      if (idxValorTotal !== -1 && row[idxValorTotal] !== undefined && row[idxValorTotal] !== null && row[idxValorTotal] !== "") {
        valorRaw = row[idxValorTotal];
      } else if (idxValor !== -1 && row[idxValor] !== undefined && row[idxValor] !== null && row[idxValor] !== "") {
        valorRaw = row[idxValor];
      }
    }

    var valorFormatado = formatarValorNumerico(valorRaw);

    // Formata o mês em Title Case (ex.: 'Outubro') para ficar exatamente como no padrão da planilha
    var mesTexto = "Outubro";
    if (valorMesSap && typeof valorMesSap === 'string' && valorMesSap.trim() !== "") {
      var vSapTrim = valorMesSap.trim();
      if (vSapTrim.length > 2 && vSapTrim.toLowerCase().indexOf(mesAlvo.nome.toLowerCase()) > -1) {
        mesTexto = vSapTrim.charAt(0).toUpperCase() + vSapTrim.slice(1).toLowerCase();
      } else {
        mesTexto = vSapTrim;
      }
    } else if (mesAlvo && mesAlvo.nome) {
      mesTexto = mesAlvo.nome.charAt(0).toUpperCase() + mesAlvo.nome.slice(1).toLowerCase();
    }

    // Linha de saída: [COLABORADOR, VALOR, MÊS]
    linhasFiltradas.push([
      nomeRaw,
      valorFormatado,
      mesTexto
    ]);
  }

  return { linhas: linhasFiltradas, stats: stats };
}

/**
 * Limpa e grava os lançamentos de Alimentação e Hospedagem na aba 'Base_Viagens'.
 * Garante que a Coluna D ('nome corrigido') e a Coluna E não sejam tocadas.
 */
function gravarDadosNaAbaViagens(abaViagens, linhasAlimentacao, linhasHospedagem) {
  var lastRow = abaViagens.getLastRow();

  // 1. Limpa os dados anteriores da linha 3 em diante em A:C e F:H
  if (lastRow > 2) {
    var qtdParaLimpar = lastRow - 2;
    abaViagens.getRange(3, 1, qtdParaLimpar, 3).clearContent();
    abaViagens.getRange(3, 6, qtdParaLimpar, 3).clearContent();
    SpreadsheetApp.flush();
  }

  // 2. Garante cabeçalhos de seção na linha 1 caso não existam
  var a1Val = abaViagens.getRange(1, 1).getValue();
  var g1Val = abaViagens.getRange(1, 7).getValue();
  if (!a1Val) abaViagens.getRange(1, 1).setValue('Alimentação');
  if (!g1Val) abaViagens.getRange(1, 7).setValue('Hospedagem');

  // 3. Garante cabeçalhos limpos de texto puro na linha 2
  // Isso remove qualquer fórmula residual antiga (como IMPORTRANGE ou QUERY) que cause erro #REF! em A2 e F2
  abaViagens.getRange(2, 1, 1, 3).setValues([
    ['COLABORADOR', 'VALOR TOTAL', 'MÊS DO LANÇAMENTO - SAP']
  ]);
  abaViagens.getRange(2, 6, 1, 3).setValues([
    ['COLABORADOR', 'VALOR DIÁRIA', 'MÊS DE LANÇAMENTO - SAP']
  ]);

  // Se D2 ou I2 ('nome corrigido') estiverem vazios, preenche o cabeçalho
  if (!abaViagens.getRange(2, 4).getValue()) {
    abaViagens.getRange(2, 4).setValue('nome corrigido');
  }
  if (!abaViagens.getRange(2, 9).getValue()) {
    abaViagens.getRange(2, 9).setValue('nome corrigido');
  }

  // 4. Grava Alimentação em A:C a partir da linha 3
  if (linhasAlimentacao && linhasAlimentacao.length > 0) {
    abaViagens.getRange(3, 1, linhasAlimentacao.length, 3).setValues(linhasAlimentacao);
    abaViagens.getRange(3, 2, linhasAlimentacao.length, 1).setNumberFormat('"R$"\\ #,##0.00');
  }

  // 5. Grava Hospedagem em F:H a partir da linha 3
  if (linhasHospedagem && linhasHospedagem.length > 0) {
    abaViagens.getRange(3, 6, linhasHospedagem.length, 3).setValues(linhasHospedagem);
    abaViagens.getRange(3, 7, linhasHospedagem.length, 1).setNumberFormat('"R$"\\ #,##0.00');
  }

  SpreadsheetApp.flush();
}

/**
 * Validador altamente flexível para verificar se um valor de mês da planilha de viagens
 * pertence ao mês da planilha de destino (aceita texto, código numérico, datas, etc.).
 */
function valorPertenceAoMesViagens(valorRaw, mesAlvo) {
  if (valorRaw === undefined || valorRaw === null || valorRaw === "") return false;

  // 1. Objeto Date
  if (valorRaw instanceof Date && !isNaN(valorRaw.getTime())) {
    var mesDate = Utilities.formatDate(valorRaw, 'GMT', 'MM');
    var anoDate = Utilities.formatDate(valorRaw, 'GMT', 'yyyy');
    if (mesDate === mesAlvo.codigo && (!mesAlvo.ano || anoDate === mesAlvo.ano)) {
      return true;
    }
    return false;
  }

  // 2. Número (código simples do mês ou número serial do Excel)
  if (typeof valorRaw === 'number') {
    if (valorRaw === parseInt(mesAlvo.codigo, 10)) {
      return true;
    }
    if (valorRaw > 40000 && valorRaw < 60000) {
      var dObj = new Date(Math.round((valorRaw - 25569) * 86400 * 1000));
      if (!isNaN(dObj.getTime())) {
        var mSerial = Utilities.formatDate(dObj, 'GMT', 'MM');
        var aSerial = Utilities.formatDate(dObj, 'GMT', 'yyyy');
        return (mSerial === mesAlvo.codigo && (!mesAlvo.ano || aSerial === mesAlvo.ano));
      }
    }
  }

  // 3. String de texto
  var str = valorRaw.toString().trim();
  if (!str) return false;

  var norm = padronizarTexto(str);

  // Nome completo do mês (ex.: OUTUBRO)
  if (norm === mesAlvo.nome || norm.indexOf(mesAlvo.nome) > -1) {
    var matchAno = str.match(/\b(20\d{2})\b/);
    if (matchAno && mesAlvo.ano && matchAno[1] !== mesAlvo.ano) {
      return false;
    }
    return true;
  }

  // Abreviação de 3 letras
  var mapaAbrev = {
    '01': 'JAN', '02': 'FEV', '03': 'MAR', '04': 'ABR',
    '05': 'MAI', '06': 'JUN', '07': 'JUL', '08': 'AGO',
    '09': 'SET', '10': 'OUT', '11': 'NOV', '12': 'DEZ'
  };
  var abrev = mapaAbrev[mesAlvo.codigo];
  if (abrev) {
    if (norm === abrev || norm.indexOf(abrev + '/') > -1 || norm.indexOf(abrev + ' ') > -1 || norm.indexOf(abrev + '-') > -1) {
      var matchAnoAbr = str.match(/\b(20\d{2})\b/);
      if (matchAnoAbr && mesAlvo.ano && matchAnoAbr[1] !== mesAlvo.ano) {
        return false;
      }
      return true;
    }
  }

  // Padrão numérico: DD/MM/YYYY ou MM/YYYY ou YYYY-MM
  var matchBr = str.match(/(?:^|[^\d])(\d{1,2})[\/\-](\d{2,4})(?:[^\d]|$)/);
  if (matchBr) {
    var m = matchBr[1].length === 1 ? '0' + matchBr[1] : matchBr[1];
    var a = matchBr[2].length === 2 ? '20' + matchBr[2] : matchBr[2];
    if (m === mesAlvo.codigo && (!mesAlvo.ano || a === mesAlvo.ano)) {
      return true;
    }
  }

  // Código isolado: "10"
  if (str === mesAlvo.codigo || str === parseInt(mesAlvo.codigo, 10).toString()) {
    return true;
  }

  return false;
}


// ============================================================================
// 6. SINCRONIZAÇÃO MULTI-PLANILHAS (PASTA 2026 - JULHO EM DIANTE)
// ============================================================================

/**
 * Ponto de entrada: Sincroniza Frota e Viagens em todas as planilhas da pasta 2026 (>= Julho).
 */
function sincronizarTodasPlanilhas() {
  var ui = SpreadsheetApp.getUi();
  var confirmacao = ui.alert(
    "🌐 Sincronização Completa de Custos (Pasta 2026)",
    "Esta ação sincronizará TODOS os custos em TODAS as planilhas da pasta 2026 do mês de JULHO em diante:\n\n" +
    "• ⛽ Combustível (Base_Abastecimento)\n" +
    "• 🔧 Manutenção (Base_Manutenção)\n" +
    "• ✈️ Viagens (Base_Viagens: Alimentação e Hospedagem)\n\n" +
    "• As planilhas anteriores a Julho/2026 serão mantidas intactas.\n" +
    "• Coluna D ('nome corrigido') da aba Base_Viagens será mantida intacta.\n\n" +
    "Deseja iniciar a sincronização completa?",
    ui.ButtonSet.YES_NO
  );

  if (confirmacao !== ui.Button.YES) return;

  var relatorioFrota = sincronizarPlanilhasPasta2026('AMBOS', true);
  var relatorioViagens = sincronizarViagensTodas(true);

  var msgFinal = "🎉 Sincronização Completa Finalizada!\n\n" +
                 "--- 🚗 FROTA ---\n" + (relatorioFrota && relatorioFrota.length > 0 ? relatorioFrota.join("\n") : "Concluído") + "\n\n" +
                 "--- ✈️ VIAGENS ---\n" + (relatorioViagens && relatorioViagens.length > 0 ? relatorioViagens.join("\n") : "Concluído") + "\n\n" +
                 "ℹ️ Planilhas de Janeiro a Junho foram mantidas intactas.";
  Logger.log(msgFinal);
  exibirAlerta(msgFinal);
}

/**
 * Ponto de entrada: Sincroniza apenas Frota (Abastecimento e Manutenção) em todas as planilhas da pasta 2026 (>= Julho).
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
 * Localiza todas as planilhas da pasta 2026 a partir de Julho/2026 e preenche suas abas de frota.
 * Preserva intactas as planilhas de meses anteriores (Janeiro a Junho).
 */
function sincronizarPlanilhasPasta2026(tipo, modoSilencioso) {
  var tipoLabel = (tipo === 'ABASTECIMENTO') ? "Abastecimento" : (tipo === 'MANUTENCAO' ? "Manutenção" : "Abastecimento e Manutenção");

  if (!modoSilencioso) {
    var ui = SpreadsheetApp.getUi();
    var confirmacao = ui.alert(
      "🌐 Sincronização Multi-Planilhas de Frota (Pasta 2026)",
      "Esta ação identificará as planilhas da pasta 2026 do mês de JULHO em diante (Julho a Outubro e próximos meses) e preencherá automaticamente os dados de " + tipoLabel + ".\n\n" +
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

  // 1. Localizar planilhas elegíveis (de Julho em diante)
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

  // Ordena por mês: 07, 08, 09, 10, 11, 12...
  planilhasElegiveis.sort(function(a, b) {
    return parseInt(a.mesInfo.codigo, 10) - parseInt(b.mesInfo.codigo, 10);
  });

  // 2. Montar estruturas de meses e carregar colaboradores de cada planilha
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

  // 3. Processar ABASTECIMENTO
  if (tipo === 'ABASTECIMENTO' || tipo === 'AMBOS') {
    var dadosAbast = processarExtratosParaMultiMeses(
      CONFIG_GERAL.PASTA_ORIGEM_COMBUSTIVEL,
      CONFIG_GERAL.PASTA_PROCESSADOS_COMBUSTIVEL,
      'ABASTECIMENTO',
      mesesAlvoMap,
      colaboradoresPorMes
    );

    for (var a = 0; a < planilhasElegiveis.length; a++) {
      var codA = planilhasElegiveis[a].mesInfo.codigo;
      var nomeA = planilhasElegiveis[a].mesInfo.nome;
      var ssA = planilhasInstancias[codA];
      if (!ssA) continue;

      var abaAbast = obterAbaPorNomes(ssA, [CONFIG_GERAL.ABA_ABASTECIMENTO, 'Base_Abastecimento', 'Base Abastecimento']);
      if (!abaAbast) {
        relatorio.push("⚠️ " + nomeA + ": Aba '" + CONFIG_GERAL.ABA_ABASTECIMENTO + "' não encontrada.");
        continue;
      }

      var linhasA = dadosAbast[codA] || [];
      gravarLinhasNaAba(abaAbast, linhasA, 4, ['NOME MOTORISTA', 'VALOR EMISSAO', 'PERÍODO', 'DATA/HORA']);
      relatorio.push("⛽ " + nomeA + ": " + linhasA.length + " abastecimentos lançados.");
    }
  }

  // 4. Processar MANUTENÇÃO
  if (tipo === 'MANUTENCAO' || tipo === 'AMBOS') {
    var dadosManut = processarExtratosParaMultiMeses(
      CONFIG_GERAL.PASTA_ORIGEM_MANUTENCAO,
      CONFIG_GERAL.PASTA_PROCESSADOS_MANUTENCAO,
      'MANUTENCAO',
      mesesAlvoMap,
      colaboradoresPorMes
    );

    for (var m = 0; m < planilhasElegiveis.length; m++) {
      var codM = planilhasElegiveis[m].mesInfo.codigo;
      var nomeM = planilhasElegiveis[m].mesInfo.nome;
      var ssM = planilhasInstancias[codM];
      if (!ssM) continue;

      var abaManut = obterAbaPorNomes(ssM, [CONFIG_GERAL.ABA_MANUTENCAO, 'Base_Manutenção', 'Base_Manutencao', 'Base Manutenção']);
      if (!abaManut) {
        relatorio.push("⚠️ " + nomeM + ": Aba '" + CONFIG_GERAL.ABA_MANUTENCAO + "' não encontrada.");
        continue;
      }

      var linhasM = dadosManut[codM] || [];
      gravarLinhasNaAba(abaManut, linhasM, 5, ['NOME MOTORISTA', 'VALOR EMISSAO', 'TIPO ESTABELECIMENTO', 'PERÍODO', 'DATA/HORA']);
      relatorio.push("🔧 " + nomeM + ": " + linhasM.length + " manutenções lançadas.");
    }
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
 * Lê os arquivos novos e processados de uma pasta e distribui os lançamentos por mês.
 */
function processarExtratosParaMultiMeses(idPastaOrigem, idPastaProcessados, tipo, mesesAlvoMap, colaboradoresPorMes) {
  var linhasPorMes = {};
  for (var cod in mesesAlvoMap) {
    linhasPorMes[cod] = [];
  }

  var chavesDeduplicacao = {};

  var pastaOrigem = DriveApp.getFolderById(idPastaOrigem);
  var pastaProcessados = obterOuCriarPastaProcessados(pastaOrigem, idPastaProcessados);

  var arquivosParaLer = [];
  var arquivosParaMover = [];
  var idsLidos = {};

  function coletarArquivos(pasta, ehOrigem) {
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
    processarArquivoMultiMesesEmLotes(arq, tipo, mesesAlvoMap, colaboradoresPorMes, linhasPorMes, chavesDeduplicacao);
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
function processarArquivoMultiMesesEmLotes(arquivo, tipo, mesesAlvoMap, colaboradoresPorMes, linhasPorMes, chavesDeduplicacao) {
  var nomeLower = arquivo.getName().toLowerCase();
  if (nomeLower.indexOf('.xlsx') > -1) {
    processarXlsxMultiMeses(arquivo, tipo, mesesAlvoMap, colaboradoresPorMes, linhasPorMes, chavesDeduplicacao);
  } else if (nomeLower.indexOf('.csv') > -1) {
    processarCsvMultiMeses(arquivo, tipo, mesesAlvoMap, colaboradoresPorMes, linhasPorMes, chavesDeduplicacao);
  }
}

/**
 * Lê arquivo Excel (.xlsx) particionado em lotes e distribui as transações por mês.
 */
function processarXlsxMultiMeses(arquivo, tipo, mesesAlvoMap, colaboradoresPorMes, linhasPorMes, chavesDeduplicacao) {
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

        // Se o mês não faz parte da regra (ex.: Jan a Junho), ignora
        if (!mesCod || !mesesAlvoMap[mesCod]) continue;

        var mapaColabMes = colaboradoresPorMes[mesCod] || {};
        var nomePadronizado = padronizarTexto(nomeOriginal);

        // Valida se colaborador pertence a esse mês
        if (!mapaColabMes.hasOwnProperty(nomePadronizado)) continue;

        var valorFormatado = formatarValorNumerico(linha[idx.indexValor]);

        // Anti-duplicação por transação
        var chaveTransacao = mesCod + '|' + nomePadronizado + '|' + valorFormatado + '|' + infoData.str;
        if (chavesDeduplicacao[chaveTransacao]) continue;
        chavesDeduplicacao[chaveTransacao] = true;

        var mesNome = mesesAlvoMap[mesCod].nome;

        if (tipo === 'ABASTECIMENTO') {
          linhasPorMes[mesCod].push([
            nomeOriginal,
            valorFormatado,
            mesNome,
            infoData.str
          ]);
        } else {
          var tipoEstab = idx.indexTipoEstabelecimento !== -1 ? (linha[idx.indexTipoEstabelecimento] || "").toString().trim() : "";
          linhasPorMes[mesCod].push([
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
 * Lê arquivo CSV linha a linha e distribui as transações por mês.
 */
function processarCsvMultiMeses(arquivo, tipo, mesesAlvoMap, colaboradoresPorMes, linhasPorMes, chavesDeduplicacao) {
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

    var valorFormatado = formatarValorNumerico(linhaArr[idx.indexValor]);

    var chaveTransacao = mesCod + '|' + nomePadronizado + '|' + valorFormatado + '|' + infoData.str;
    if (chavesDeduplicacao[chaveTransacao]) continue;
    chavesDeduplicacao[chaveTransacao] = true;

    var mesNome = mesesAlvoMap[mesCod].nome;

    if (tipo === 'ABASTECIMENTO') {
      linhasPorMes[mesCod].push([
        nomeOriginal,
        valorFormatado,
        mesNome,
        infoData.str
      ]);
    } else {
      var tipoEstab = idx.indexTipoEstabelecimento !== -1 ? (linhaArr[idx.indexTipoEstabelecimento] || "").toString().trim() : "";
      linhasPorMes[mesCod].push([
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
 * Limpa dados existentes da linha 2 em diante e grava novos dados na aba de destino (para frota).
 */
function gravarLinhasNaAba(abaDestino, linhasParaInserir, qtdColunas, cabecalhoPadrao) {
  var linhasAtuais = abaDestino.getLastRow();
  if (linhasAtuais > 1) {
    abaDestino.getRange(2, 1, linhasAtuais - 1, Math.max(abaDestino.getLastColumn(), qtdColunas)).clearContent();
    SpreadsheetApp.flush();
  }

  if (abaDestino.getLastRow() === 0 && cabecalhoPadrao) {
    abaDestino.getRange(1, 1, 1, qtdColunas).setValues([cabecalhoPadrao]);
  }

  if (linhasParaInserir && linhasParaInserir.length > 0) {
    abaDestino.getRange(2, 1, linhasParaInserir.length, qtdColunas).setValues(linhasParaInserir);
    abaDestino.getRange(2, 2, linhasParaInserir.length, 1).setNumberFormat('"R$"\\ #,##0.00');
  }
}


// ============================================================================
// 7. TESTE DE CONEXÕES E DIAGNÓSTICO
// ============================================================================
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
      relatorio.push("  • Aba Alimentação: " + abaAlim.getLastRow() + " linhas");
      relatorio.push("    Colunas: " + cabAlim);
    } else {
      relatorio.push("  ❌ Aba Alimentação NÃO encontrada");
    }

    var abaHosp = obterAbaPorNomes(ssViagens, [CONFIG_GERAL.ABA_ORIGEM_HOSPEDAGEM, 'Hospedagem 2026', 'Hospedagem', 'Hospedagens 2026', 'Hospedagens']);
    if (abaHosp) {
      var cabHosp = abaHosp.getRange(1, 1, 1, abaHosp.getLastColumn()).getValues()[0].filter(function(x){ return x !== ""; }).join(" | ");
      relatorio.push("  • Aba Hospedagem: " + abaHosp.getLastRow() + " linhas");
      relatorio.push("    Colunas: " + cabHosp);
    } else {
      relatorio.push("  ❌ Aba Hospedagem NÃO encontrada");
    }
  } catch (e) {
    relatorio.push("❌ Erro ao acessar Planilha Origem Viagens: " + e.message);
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

  // Pastas de Combustível e Manutenção
  try {
    var pComb = DriveApp.getFolderById(CONFIG_GERAL.PASTA_ORIGEM_COMBUSTIVEL);
    relatorio.push("✅ Pasta Origem Combustível: " + pComb.getName());
  } catch (e) {
    relatorio.push("❌ Erro Pasta Combustível: " + e.message);
  }

  try {
    var pManut = DriveApp.getFolderById(CONFIG_GERAL.PASTA_ORIGEM_MANUTENCAO);
    relatorio.push("✅ Pasta Origem Manutenção: " + pManut.getName());
  } catch (e) {
    relatorio.push("❌ Erro Pasta Manutenção: " + e.message);
  }

  var msg = relatorio.join("\n");
  Logger.log(msg);
  exibirAlerta("Diagnóstico de Conexões e Estruturas:\n\n" + msg);
}


// ============================================================================
// 8. FUNÇÕES AUXILIARES DE SUPORTE (EXCEL, CSV, DATAS E FORMATAÇÃO)
// ============================================================================

/**
 * Processa um arquivo (.xlsx ou .csv) em lotes com baixíssimo consumo de memória,
 * filtrando diretamente os colaboradores do setor e o mês da planilha ativa.
 */
function processarArquivoEmLotes(arquivo, tipo, mapaColaboradores, mesAlvo, nomesIgnorados, stats) {
  var nomeArquivo = arquivo.getName();
  var nomeLower = nomeArquivo.toLowerCase();

  if (nomeLower.indexOf('.xlsx') > -1) {
    return processarXlsxEmLotes(arquivo, tipo, mapaColaboradores, mesAlvo, nomesIgnorados, stats);
  } else if (nomeLower.indexOf('.csv') > -1) {
    return processarCsvEmLotes(arquivo, tipo, mapaColaboradores, mesAlvo, nomesIgnorados, stats);
  }

  return [];
}

/**
 * Processa arquivo Excel (.xlsx) convertendo para planilha temporária e lendo em blocos
 * de linhas (chunks) para NUNCA estourar a memória do Google Apps Script.
 */
function processarXlsxEmLotes(arquivo, tipo, mapaColaboradores, mesAlvo, nomesIgnorados, stats) {
  var nomeArquivo = arquivo.getName();
  var tempId = converterXlsxParaPlanilhaTemporaria(arquivo);
  if (!tempId) {
    throw new Error("Não foi possível processar o arquivo Excel (.xlsx). Verifique as permissões de acesso ao Google Drive.");
  }

  var linhasFiltradas = [];

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
      return [];
    }

    // 1. Lê APENAS a 1ª linha (cabeçalho) para descobrir os índices das colunas
    var cabecalho = sheet.getRange(1, 1, 1, totalColunas).getValues()[0];
    var idx = mapearIndicesColunas(cabecalho);

    if (idx.indexMotorista === -1 || idx.indexValor === -1) {
      Logger.log("Colunas obrigatórias não encontradas no arquivo Excel: " + nomeArquivo);
      return [];
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

        if (tipo === 'ABASTECIMENTO') {
          // [A: NOME MOTORISTA, B: VALOR EMISSAO, C: PERÍODO, D: DATA/HORA]
          linhasFiltradas.push([
            nomeOriginal,
            valorFormatado,
            mesAlvo.nome,
            infoData.str
          ]);
        } else {
          // MANUTENCAO: [A: NOME MOTORISTA, B: VALOR EMISSAO, C: TIPO ESTABELECIMENTO, D: PERÍODO, E: DATA/HORA]
          var tipoEstab = idx.indexTipoEstabelecimento !== -1 ? (linha[idx.indexTipoEstabelecimento] || "").toString().trim() : "";
          linhasFiltradas.push([
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

  return linhasFiltradas;
}

/**
 * Processa arquivo CSV linha a linha sem carregar matrizes 2D gigantes em memória.
 */
function processarCsvEmLotes(arquivo, tipo, mapaColaboradores, mesAlvo, nomesIgnorados, stats) {
  var nomeArquivo = arquivo.getName();
  var blob = arquivo.getBlob();
  var conteudoCsv = blob.getDataAsString();

  if (!conteudoCsv || conteudoCsv.trim() === "") {
    return [];
  }

  var linhasTexto = conteudoCsv.split(/\r?\n/);
  conteudoCsv = null;

  if (linhasTexto.length <= 1) {
    return [];
  }

  var delimitador = detectarDelimitador(linhasTexto[0]);
  var cabecalho = Utilities.parseCsv(linhasTexto[0], delimitador)[0];
  var idx = mapearIndicesColunas(cabecalho);

  if (idx.indexMotorista === -1 || idx.indexValor === -1) {
    Logger.log("Colunas obrigatórias não encontradas no CSV: " + nomeArquivo);
    return [];
  }

  var linhasFiltradas = [];

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

    if (tipo === 'ABASTECIMENTO') {
      linhasFiltradas.push([
        nomeOriginal,
        valorFormatado,
        mesAlvo.nome,
        infoData.str
      ]);
    } else {
      var tipoEstab = idx.indexTipoEstabelecimento !== -1 ? (linhaArr[idx.indexTipoEstabelecimento] || "").toString().trim() : "";
      linhasFiltradas.push([
        nomeOriginal,
        valorFormatado,
        tipoEstab,
        mesAlvo.nome,
        infoData.str
      ]);
    }
  }

  linhasTexto = null;
  return linhasFiltradas;
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
 * Localiza os índices de todas as colunas obrigatórias e opcionais pelo cabeçalho.
 */
function mapearIndicesColunas(cabecalho) {
  var indexMotorista = -1;
  var indexValor = -1;
  var indexTipoEstabelecimento = -1;
  var indexPeriodo = -1;
  var indexData = -1;

  for (var c = 0; c < cabecalho.length; c++) {
    var col = padronizarTexto(cabecalho[c]);
    if (!col) continue;

    // MOTORISTA / CONDUTOR
    if (col === 'NOME MOTORISTA' || col === 'NOME DO MOTORISTA' || col === 'NOME CONDUTOR' || col === 'NOME DO CONDUTOR') {
      indexMotorista = c;
    } else if (indexMotorista === -1 && (col.indexOf('MOTORISTA') > -1 || col.indexOf('CONDUTOR') > -1)) {
      indexMotorista = c;
    }

    // VALOR
    if (col === 'VALOR EMISSAO' || col === 'VALOR TOTAL' || col === 'VALOR BRUTO' || col === 'VALOR LIQUIDO' || col === 'VALOR TRANSACAO' || col === 'VALOR TRANSACAO R$' || col === 'VALOR R$') {
      indexValor = c;
    } else if (indexValor === -1 && col.indexOf('VALOR') > -1 && col.indexOf('UNIT') === -1 && col.indexOf('LITRO') === -1) {
      indexValor = c;
    }

    // TIPO ESTABELECIMENTO (para manutenção)
    if (col === 'TIPO ESTABELECIMENTO' || col === 'TIPO DE ESTABELECIMENTO') {
      indexTipoEstabelecimento = c;
    } else if (indexTipoEstabelecimento === -1 && (col.indexOf('ESTABELECIMENTO') > -1 || col.indexOf('RAMO') > -1 || col.indexOf('SEGMENTO') > -1 || col.indexOf('SERVICO') > -1)) {
      indexTipoEstabelecimento = c;
    }

    // PERÍODO
    if (col === 'PERIODO' || col === 'PERIODO DE CONSUMO' || col === 'MES' || col === 'COMPETENCIA' || col === 'REFERENCIA') {
      indexPeriodo = c;
    }

    // DATA / HORA
    if (col === 'DATA TRANSACAO' || col === 'DATA/HORA TRANSACAO' || col === 'DATA HORA TRANSACAO' || col === 'DATA/HORA' || col === 'DATA HORA' || col === 'DATA EMISSAO') {
      indexData = c;
    } else if (indexData === -1 && col.indexOf('DATA') > -1 && col.indexOf('VALOR') === -1 && col.indexOf('NASC') === -1 && col.indexOf('VENC') === -1) {
      indexData = c;
    }
  }

  return {
    indexMotorista: indexMotorista,
    indexValor: indexValor,
    indexTipoEstabelecimento: indexTipoEstabelecimento,
    indexPeriodo: indexPeriodo,
    indexData: indexData
  };
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
  if (valorData instanceof Date && !isNaN(valorData.getTime())) {
    var strFormatada = Utilities.formatDate(valorData, fuso, 'dd/MM/yyyy HH:mm:ss');
    var mes = Utilities.formatDate(valorData, fuso, 'MM');
    var ano = Utilities.formatDate(valorData, fuso, 'yyyy');
    return { str: strFormatada, mes: mes, ano: ano };
  }

  // Se for número serial do Excel (ex.: 45580.45)
  if (typeof valorData === 'number' && valorData > 40000 && valorData < 60000) {
    var dataObj = new Date(Math.round((valorData - 25569) * 86400 * 1000));
    if (!isNaN(dataObj.getTime())) {
      var strFormatadaNum = Utilities.formatDate(dataObj, 'GMT', 'dd/MM/yyyy HH:mm:ss');
      var mesNum = Utilities.formatDate(dataObj, 'GMT', 'MM');
      var anoNum = Utilities.formatDate(dataObj, 'GMT', 'yyyy');
      return { str: strFormatadaNum, mes: mesNum, ano: anoNum };
    }
  }

  // Se for string
  var str = valorData.toString().trim();
  var comp = extrairComponentesData(str);
  if (comp) {
    return { str: str, mes: comp.mes, ano: comp.ano };
  }

  return { str: str, mes: null, ano: null };
}

/**
 * Extrai código do mês ('01'..'12'), nome oficial e ano a partir de uma string ou título de planilha.
 */
function extrairMesDeTexto(texto) {
  if (!texto) return null;
  var str = texto.toString();
  var padrao = padronizarTexto(str);

  var mapaMeses = {
    'JANEIRO': '01',
    'FEVEREIRO': '02',
    'MARCO': '03',
    'MARÇO': '03',
    'ABRIL': '04',
    'MAIO': '05',
    'JUNHO': '06',
    'JULHO': '07',
    'AGOSTO': '08',
    'SETEMBRO': '09',
    'OUTUBRO': '10',
    'NOVEMBRO': '11',
    'DEZEMBRO': '12'
  };

  for (var mNome in mapaMeses) {
    if (padrao.indexOf(mNome) > -1) {
      var matchAno = str.match(/\b(20\d{2})\b/);
      var ano = matchAno ? matchAno[1] : '2026';
      return {
        codigo: mapaMeses[mNome],
        nome: (mNome === 'MARCO') ? 'MARÇO' : mNome,
        ano: ano
      };
    }
  }

  return null;
}

/**
 * Identifica o mês e ano no título da planilha ativa.
 */
function obterMesAlvoDaPlanilha(planilha) {
  var nomePlanilha = (planilha ? planilha.getName() : CONFIG_GERAL.NOME_PLANILHA_PADRAO);
  var mesInfo = extrairMesDeTexto(nomePlanilha);
  if (mesInfo) return mesInfo;

  return {
    codigo: '10',
    nome: 'OUTUBRO',
    ano: '2026'
  };
}

/**
 * Valida se uma transação pertence ao mês da planilha ativa (para frota).
 */
function transacaoPertenceAoMes(infoData, periodoStr, mesAlvo, nomeArquivo) {
  // 1. Validação pela data da transação
  if (infoData && infoData.mes) {
    if (infoData.mes === mesAlvo.codigo) {
      if (!mesAlvo.ano || !infoData.ano || infoData.ano === mesAlvo.ano) {
        return true;
      }
    }
    return false;
  }

  // 2. Validação pela coluna período (se existir)
  if (periodoStr) {
    var pNorm = padronizarTexto(periodoStr);
    if (pNorm === mesAlvo.nome) return true;

    var mPeriodo = periodoStr.toString().match(/(\d{1,2})[\/\-](\d{4})/);
    if (mPeriodo) {
      var mesP = mPeriodo[1].length === 1 ? '0' + mPeriodo[1] : mPeriodo[1];
      var anoP = mPeriodo[2];
      if (mesP === mesAlvo.codigo && (!mesAlvo.ano || anoP === mesAlvo.ano)) {
        return true;
      }
    }
  }

  // 3. Validação pelo nome do arquivo como último recurso
  if (nomeArquivo) {
    var matchArq = nomeArquivo.match(/\d{4}(\d{2})\d{2}/);
    if (matchArq && matchArq[1] === mesAlvo.codigo) {
      return true;
    }
  }

  return false;
}

/**
 * Extrai dia, mês e ano de strings variadas de data.
 */
function extrairComponentesData(dataStr) {
  if (!dataStr) return null;
  var str = dataStr.toString().trim();

  // Formato brasileiro: DD/MM/YYYY ou DD/MM/YY
  var matchBr = str.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (matchBr) {
    var dia = matchBr[1].length === 1 ? '0' + matchBr[1] : matchBr[1];
    var mes = matchBr[2].length === 1 ? '0' + matchBr[2] : matchBr[2];
    var ano = matchBr[3].length === 2 ? '20' + matchBr[3] : matchBr[3];
    return { dia: dia, mes: mes, ano: ano };
  }

  // Formato ISO: YYYY-MM-DD
  var matchIso = str.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (matchIso) {
    var anoIso = matchIso[1];
    var mesIso = matchIso[2].length === 1 ? '0' + matchIso[2] : matchIso[2];
    var diaIso = matchIso[3].length === 1 ? '0' + matchIso[3] : matchIso[3];
    return { dia: diaIso, mes: mesIso, ano: anoIso };
  }

  return null;
}

/**
 * Obtém a planilha ativa ou localiza pelo nome na pasta 2026.
 */
function obterPlanilhaAlvo() {
  try {
    var ativa = SpreadsheetApp.getActiveSpreadsheet();
    if (ativa) return ativa;
  } catch (e) {}

  try {
    var pasta2026 = DriveApp.getFolderById(CONFIG_GERAL.PASTA_RAIZ_2026);
    var arquivos = pasta2026.getFilesByName(CONFIG_GERAL.NOME_PLANILHA_PADRAO);
    if (arquivos.hasNext()) {
      return SpreadsheetApp.open(arquivos.next());
    }
  } catch (e) {
    Logger.log("Erro ao buscar planilha na pasta 2026: " + e.message);
  }

  var busca = DriveApp.getFilesByName(CONFIG_GERAL.NOME_PLANILHA_PADRAO);
  if (busca.hasNext()) {
    return SpreadsheetApp.open(busca.next());
  }

  return null;
}

/**
 * Carrega a lista de colaboradores da aba 'Custos_Totais' (Coluna A).
 */
function carregarListaColaboradores(planilha) {
  var mapa = {};
  if (!planilha) return mapa;

  var aba = planilha.getSheetByName(CONFIG_GERAL.ABA_CUSTOS_TOTAIS);
  if (!aba) return mapa;

  var ultimaLinha = aba.getLastRow();
  if (ultimaLinha < 1) return mapa;

  var valores = aba.getRange(1, CONFIG_GERAL.COLUNA_COLABORADORES, ultimaLinha, 1).getValues();
  var cabecalhos = ['NOME', 'COLABORADOR', 'NOME COLABORADOR', 'FUNCIONARIO', 'MOTORISTA', 'CONDUTOR', 'COLABORADORES', 'NOMES'];

  for (var i = 0; i < valores.length; i++) {
    var nome = valores[i][0];
    if (!nome) continue;

    var nomePadrao = padronizarTexto(nome);
    if (!nomePadrao) continue;

    if (i === 0 && cabecalhos.indexOf(nomePadrao) > -1) {
      continue;
    }

    mapa[nomePadrao] = true;
  }

  Logger.log("Carregados " + Object.keys(mapa).length + " colaboradores de '" + CONFIG_GERAL.ABA_CUSTOS_TOTAIS + "'.");
  return mapa;
}

/**
 * Busca uma aba na planilha testando múltiplos nomes (com/sem acento).
 */
function obterAbaPorNomes(planilha, nomes) {
  for (var i = 0; i < nomes.length; i++) {
    var aba = planilha.getSheetByName(nomes[i]);
    if (aba) return aba;
  }
  return null;
}

/**
 * Obtém a pasta 'Arquivos Processados' por ID ou cria automaticamente dentro da pasta de origem.
 */
function obterOuCriarPastaProcessados(pastaOrigem, idSugerido) {
  if (idSugerido) {
    try {
      return DriveApp.getFolderById(idSugerido);
    } catch (e) {}
  }

  var subpastas = pastaOrigem.getFoldersByName("Arquivos Processados");
  if (subpastas.hasNext()) {
    return subpastas.next();
  }

  return pastaOrigem.createFolder("Arquivos Processados");
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
    .toUpperCase()
    .replace(/\s+/g, ' ');
}

/**
 * Converte valor string (ex: "253,85" ou "2.148,00") para número real no Sheets.
 */
function formatarValorNumerico(valor) {
  if (valor === undefined || valor === null || valor === "") return "";
  if (typeof valor === 'number') return valor;
  var str = valor.toString().trim().replace(/^R\$\s*/i, '');
  if (str.indexOf(',') > -1) {
    str = str.replace(/\./g, '').replace(',', '.');
  }
  var num = parseFloat(str);
  return isNaN(num) ? valor : num;
}

/**
 * Detecta se o CSV é delimitado por vírgula ou ponto e vírgula.
 */
function detectarDelimitador(linhaCabecalho) {
  var virgulas = (linhaCabecalho.match(/,/g) || []).length;
  var pontoEVirgulas = (linhaCabecalho.match(/;/g) || []).length;
  return pontoEVirgulas > virgulas ? ';' : ',';
}

/**
 * Exibe alerta na interface ou registra no Logger.
 */
function exibirAlerta(msg) {
  try {
    SpreadsheetApp.getUi().alert(msg);
  } catch (e) {
    Logger.log("Alerta: " + msg);
  }
}
