/**
 * ============================================================================
 * GESTÃO DE CUSTOS DE FROTA - OPERAÇÃO E MANUTENÇÃO DE REDES
 * ============================================================================
 * Automação de Importação de Abastecimento e Manutenção (.xlsx / .csv -> Google Sheets)
 * 
 * Funcionalidades:
 * 1. Suporte a Arquivos Excel (.xlsx) e CSV:
 *    - Lê diretamente os arquivos no formato nativo .xlsx baixados dos sistemas de frota.
 *    - Também mantém compatibilidade com arquivos .csv.
 * 
 * 2. Regra Estrita de Limpeza e Relançamento (Anti-Duplicação):
 *    - Ao rodar a importação, os dados anteriores da aba (da linha 2 em diante) são
 *      SEMPRE apagados, e os novos dados são gravados a partir da linha 2.
 *    - Nunca duplica ou acumula linhas abaixo de importações antigas.
 * 
 * 3. Filtro Mensal Dinâmico:
 *    - Identifica o mês e ano da planilha ativa (ex.: "10. CUSTOS DO SETOR - OUTUBRO - 2026").
 *    - Importa única e exclusivamente os lançamentos de Outubro em Outubro, Novembro em
 *      Novembro, e assim por diante. Linhas de outros meses são ignoradas.
 * 
 * 4. Validação por Colaboradores:
 *    - Lê a lista de colaboradores na Coluna A da aba 'Custos_Totais'.
 *    - Apenas lançamentos dos motoristas do setor são trazidos para a planilha.
 * 
 * 5. Colunas das Abas:
 *    - Base_Abastecimento (4 colunas): NOME MOTORISTA | VALOR EMISSAO | PERÍODO | DATA/HORA
 *    - Base_Manutenção (5 colunas): NOME MOTORISTA | VALOR EMISSAO | TIPO ESTABELECIMENTO | PERÍODO | DATA/HORA
 * 
 * 6. Menu Superior Automático (onOpen):
 *    - Cria o menu "🚗 Gestão de Frota" na barra de ferramentas da planilha.
 * ============================================================================
 */

// ============================================================================
// 1. CONFIGURAÇÕES GERAIS
// ============================================================================
const CONFIG_FROTA = {
  // Pasta Raiz 2026 (onde ficam as planilhas mensais)
  PASTA_RAIZ_2026: '1P-QIZVEhADgyZk62snW9nDcV8E_4vLRU',
  NOME_PLANILHA_PADRAO: '10. CUSTOS DO SETOR - OUTUBRO - 2026',

  // Pastas de Combustível (Abastecimento)
  PASTA_ORIGEM_COMBUSTIVEL: '1exK26bgZNurn4bh0Q5bv-f-WyM3f-fxs',
  PASTA_PROCESSADOS_COMBUSTIVEL: '1FNAHGP3n2FZzIDC_NphwkG26G1CrQL0F',

  // Pastas de Manutenção
  PASTA_ORIGEM_MANUTENCAO: '1zpsygbFL4d6PtsbjN9FMVITt2ZptR8f2',
  PASTA_PROCESSADOS_MANUTENCAO: '12q2UQwRaP6vxJXtiMVC1eCThI4WG6Ko2',

  // Nomes das Abas na Planilha
  ABA_CUSTOS_TOTAIS: 'Custos_Totais',
  COLUNA_COLABORADORES: 1, // Coluna A (onde estão os nomes dos colaboradores)

  ABA_ABASTECIMENTO: 'Base_Abastecimento',
  ABA_MANUTENCAO: 'Base_Manutenção' // Aceita também Base_Manutencao
};


// ============================================================================
// 2. MENU SUPERIOR DO GOOGLE SHEETS (onOpen)
// ============================================================================
function onOpen() {
  try {
    const ui = SpreadsheetApp.getUi();
    ui.createMenu("🚗 Gestão de Frota")
      .addItem("⚡ Importar Dados da Aba Atual", "importarAbaAtiva")
      .addSeparator()
      .addItem("⛽ Importar Abastecimento (.xlsx / .csv)", "importarDadosAbastecimento")
      .addItem("🔧 Importar Manutenção (.xlsx / .csv)", "importarDadosManutencao")
      .addItem("🔄 Importar Tudo (Abastecimento + Manutenção)", "importarTodosOsCustos")
      .addSeparator()
      .addItem("📁 Reprocessar da Pasta 'Arquivos Processados'", "reprocessarArquivosHistorico")
      .addItem("🧹 Limpar Dados da Aba Atual", "limparAbaAtualManual")
      .addSeparator()
      .addItem("🔍 Testar Conexões e Colaboradores", "testarConexoes")
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
  } else {
    var ui = SpreadsheetApp.getUi();
    var resposta = ui.alert(
      "Importação de Frota",
      "Você está na aba '" + abaAtiva.getName() + "'.\n\n" +
      "Deseja importar ambos os extratos (Abastecimento e Manutenção) para o mês desta planilha?",
      ui.ButtonSet.YES_NO
    );

    if (resposta === ui.Button.YES) {
      importarTodosOsCustos();
    }
  }
}

/**
 * Executa tanto Abastecimento quanto Manutenção em sequência.
 */
function importarTodosOsCustos() {
  Logger.log("Iniciando importação completa (Abastecimento + Manutenção)...");
  importarDadosAbastecimento();
  importarDadosManutencao();
}

/**
 * Limpa manualmente os dados da aba atual da linha 2 em diante.
 */
function limparAbaAtualManual() {
  var planilha = SpreadsheetApp.getActiveSpreadsheet();
  if (!planilha) return;

  var aba = planilha.getActiveSheet();
  if (aba.getLastRow() > 1) {
    var ui = SpreadsheetApp.getUi();
    var confirmacao = ui.alert(
      "Limpar Dados",
      "Deseja limpar todos os lançamentos da aba '" + aba.getName() + "' (a partir da linha 2)?",
      ui.ButtonSet.YES_NO
    );
    if (confirmacao === ui.Button.YES) {
      aba.getRange(2, 1, aba.getLastRow() - 1, aba.getLastColumn()).clearContent();
      SpreadsheetApp.flush();
      exibirAlerta("Dados da aba '" + aba.getName() + "' limpos com sucesso.");
    }
  } else {
    exibirAlerta("A aba '" + aba.getName() + "' já está vazia.");
  }
}

/**
 * Permite reprocessar arquivos que já estão na pasta 'Arquivos Processados'.
 */
function reprocessarArquivosHistorico() {
  var ui = SpreadsheetApp.getUi();
  var resposta = ui.alert(
    "Reprocessar Histórico",
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

  var abaDestino = obterAbaPorNomes(planilha, [CONFIG_FROTA.ABA_ABASTECIMENTO, 'Base_Abastecimento', 'Base Abastecimento']);
  if (!abaDestino) {
    exibirAlerta("Erro: A aba '" + CONFIG_FROTA.ABA_ABASTECIMENTO + "' não foi encontrada na planilha atual.");
    return;
  }

  // 2. Carregar colaboradores de referência da aba Custos_Totais (Coluna A)
  var mapaColaboradores = carregarListaColaboradores(planilha);
  if (Object.keys(mapaColaboradores).length === 0) {
    exibirAlerta("Atenção: Nenhum colaborador foi encontrado na aba '" + CONFIG_FROTA.ABA_CUSTOS_TOTAIS + "' (Coluna A).\nVerifique se a aba está preenchida.");
    return;
  }

  // 3. Obter pasta de origem
  var pastaOrigem = DriveApp.getFolderById(CONFIG_FROTA.PASTA_ORIGEM_COMBUSTIVEL);
  var pastaProcessados = obterOuCriarPastaProcessados(pastaOrigem, CONFIG_FROTA.PASTA_PROCESSADOS_COMBUSTIVEL);

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
  var linhasOutrosMesesQtd = 0;
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
        var dados = extrairMatrizDeDados(arquivo);

        if (dados && dados.length > 0) {
          var cabecalho = dados.shift();

          // Localiza índices das colunas
          var indexMotorista = -1;
          var indexValor = -1;
          var indexData = -1;
          var indexPeriodo = -1;

          for (var c = 0; c < cabecalho.length; c++) {
            var col = padronizarTexto(cabecalho[c]);

            if (col === 'NOME MOTORISTA' || (indexMotorista === -1 && (col.indexOf('MOTORISTA') > -1 || col.indexOf('CONDUTOR') > -1))) {
              indexMotorista = c;
            }
            if (col === 'VALOR EMISSAO' || (indexValor === -1 && (col.indexOf('VALOR EMISSAO') > -1 || col === 'VALOR TOTAL' || col === 'VALOR BRUTO' || col === 'VALOR'))) {
              indexValor = c;
            }
            if (col === 'PERIODO' || col === 'PERIODO DE CONSUMO' || col === 'MES') {
              indexPeriodo = c;
            }
            if (col === 'DATA TRANSACAO' || col === 'DATA/HORA TRANSACAO' || col === 'DATA HORA TRANSACAO' || col === 'DATA/HORA' || col === 'DATA HORA') {
              indexData = c;
            } else if (indexData === -1 && col.indexOf('DATA') > -1 && col.indexOf('VALOR') === -1 && col.indexOf('NASC') === -1) {
              indexData = c;
            }
          }

          if (indexMotorista === -1 || indexValor === -1) {
            Logger.log("Colunas obrigatórias não encontradas no arquivo: " + nomeArquivo);
            continue;
          }

          // Processar linhas com FILTROS DE COLABORADOR E MÊS
          for (var r = 0; r < dados.length; r++) {
            var linha = dados[r];
            if (!linha || linha.length === 0) continue;

            var nomeOriginal = linha[indexMotorista] ? linha[indexMotorista].toString().trim() : "";
            if (!nomeOriginal) continue;

            var nomePadronizado = padronizarTexto(nomeOriginal);

            // 1º FILTRO: Colaborador precisa constar em Custos_Totais
            if (!mapaColaboradores.hasOwnProperty(nomePadronizado)) {
              nomesIgnorados[nomeOriginal] = true;
              continue;
            }

            var valorDataRaw = indexData !== -1 ? linha[indexData] : "";
            var periodoCsv = indexPeriodo !== -1 ? (linha[indexPeriodo] || "").toString().trim() : "";

            // Formatar data e extrair componentes
            var infoData = formatarDataTransacao(valorDataRaw);

            // 2º FILTRO: Apenas transações que pertencem ao mês da planilha
            var ehDoMes = transacaoPertenceAoMes(infoData, periodoCsv, mesAlvo, nomeArquivo);
            if (!ehDoMes) {
              linhasOutrosMesesQtd++;
              continue;
            }

            var valorFormatado = formatarValorNumerico(linha[indexValor]);

            // [A: NOME MOTORISTA, B: VALOR EMISSAO, C: PERÍODO, D: DATA/HORA]
            linhasParaInserir.push([
              nomeOriginal,
              valorFormatado,
              mesAlvo.nome,
              infoData.str
            ]);
          }

          totalArquivos++;
        }

        if (!lerDeProcessados) {
          arquivo.moveTo(pastaProcessados);
        }

      } catch (e) {
        Logger.log("Erro ao processar arquivo " + nomeArquivo + ": " + e.toString());
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
      abaDestino.getRange(1, 1, 1, 4).setValues([['NOME MOTORISTA', 'VALOR EMISSAO', 'PERÍODO', '']]);
    }

    // 3º: Grava os novos dados SEMPRE a partir da linha 2
    abaDestino.getRange(2, 1, linhasParaInserir.length, 4).setValues(linhasParaInserir);

    var msgSucesso = "✅ Sucesso! " + linhasParaInserir.length + " registro(s) de " + mesAlvo.nome + " lançados na aba 'Base_Abastecimento'.\n\n" +
                     "• Os dados anteriores foram limpos e relançados com sucesso.\n" +
                     "• " + linhasOutrosMesesQtd + " registros de outros meses foram filtrados e desconsiderados.";
    Logger.log(msgSucesso);
    exibirAlerta(msgSucesso);
  } else {
    var msgVazia = "Processo finalizado. Nenhum lançamento correspondente ao mês de " + mesAlvo.nome + " foi encontrado nos arquivos.";
    if (linhasOutrosMesesQtd > 0) {
      msgVazia += "\n\n(Foram ignorados " + linhasOutrosMesesQtd + " registros pertencentes a outros meses).";
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

  var abaDestino = obterAbaPorNomes(planilha, [CONFIG_FROTA.ABA_MANUTENCAO, 'Base_Manutenção', 'Base_Manutencao', 'Base Manutenção']);
  if (!abaDestino) {
    exibirAlerta("Erro: A aba '" + CONFIG_FROTA.ABA_MANUTENCAO + "' não foi encontrada na planilha atual.");
    return;
  }

  // 2. Carregar colaboradores de referência da aba Custos_Totais (Coluna A)
  var mapaColaboradores = carregarListaColaboradores(planilha);
  if (Object.keys(mapaColaboradores).length === 0) {
    exibirAlerta("Atenção: Nenhum colaborador foi encontrado na aba '" + CONFIG_FROTA.ABA_CUSTOS_TOTAIS + "' (Coluna A).\nVerifique se a aba está preenchida.");
    return;
  }

  // 3. Obter pasta de origem
  var pastaOrigem = DriveApp.getFolderById(CONFIG_FROTA.PASTA_ORIGEM_MANUTENCAO);
  var pastaProcessados = obterOuCriarPastaProcessados(pastaOrigem, CONFIG_FROTA.PASTA_PROCESSADOS_MANUTENCAO);

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
  var linhasOutrosMesesQtd = 0;
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
        var dados = extrairMatrizDeDados(arquivo);

        if (dados && dados.length > 0) {
          var cabecalho = dados.shift();

          // Localiza índices das colunas
          var indexMotorista = -1;
          var indexValor = -1;
          var indexTipoEstabelecimento = -1;
          var indexPeriodo = -1;
          var indexData = -1;

          for (var c = 0; c < cabecalho.length; c++) {
            var col = padronizarTexto(cabecalho[c]);

            if (col === 'NOME MOTORISTA' || (indexMotorista === -1 && (col.indexOf('MOTORISTA') > -1 || col.indexOf('CONDUTOR') > -1))) {
              indexMotorista = c;
            }
            if (col === 'VALOR EMISSAO' || (indexValor === -1 && (col.indexOf('VALOR EMISSAO') > -1 || col === 'VALOR TOTAL' || col === 'VALOR BRUTO' || col === 'VALOR'))) {
              indexValor = c;
            }
            if (col === 'TIPO ESTABELECIMENTO' || col === 'TIPO DE ESTABELECIMENTO') {
              indexTipoEstabelecimento = c;
            } else if (indexTipoEstabelecimento === -1 && (col.indexOf('ESTABELECIMENTO') > -1 || col.indexOf('RAMO') > -1 || col.indexOf('SEGMENTO') > -1)) {
              indexTipoEstabelecimento = c;
            }
            if (col === 'PERIODO' || col === 'PERIODO DE CONSUMO' || col === 'MES') {
              indexPeriodo = c;
            }
            if (col === 'DATA TRANSACAO' || col === 'DATA/HORA TRANSACAO' || col === 'DATA HORA TRANSACAO' || col === 'DATA/HORA' || col === 'DATA HORA') {
              indexData = c;
            } else if (indexData === -1 && col.indexOf('DATA') > -1 && col.indexOf('VALOR') === -1 && col.indexOf('NASC') === -1) {
              indexData = c;
            }
          }

          if (indexMotorista === -1 || indexValor === -1) {
            Logger.log("Colunas obrigatórias não encontradas no arquivo: " + nomeArquivo);
            continue;
          }

          // Processar linhas com FILTROS DE COLABORADOR E MÊS
          for (var r = 0; r < dados.length; r++) {
            var linha = dados[r];
            if (!linha || linha.length === 0) continue;

            var nomeOriginal = linha[indexMotorista] ? linha[indexMotorista].toString().trim() : "";
            if (!nomeOriginal) continue;

            var nomePadronizado = padronizarTexto(nomeOriginal);

            // 1º FILTRO: Colaborador precisa constar em Custos_Totais
            if (!mapaColaboradores.hasOwnProperty(nomePadronizado)) {
              nomesIgnorados[nomeOriginal] = true;
              continue;
            }

            var valorDataRaw = indexData !== -1 ? linha[indexData] : "";
            var periodoCsv = indexPeriodo !== -1 ? (linha[indexPeriodo] || "").toString().trim() : "";

            var infoData = formatarDataTransacao(valorDataRaw);

            // 2º FILTRO: Apenas transações do mês da planilha
            var ehDoMes = transacaoPertenceAoMes(infoData, periodoCsv, mesAlvo, nomeArquivo);
            if (!ehDoMes) {
              linhasOutrosMesesQtd++;
              continue;
            }

            var valorFormatado = formatarValorNumerico(linha[indexValor]);
            var tipoEstabelecimento = indexTipoEstabelecimento !== -1 ? (linha[indexTipoEstabelecimento] || "").toString().trim() : "";

            // [A: NOME MOTORISTA, B: VALOR EMISSAO, C: TIPO ESTABELECIMENTO, D: Período, E: DATA/HORA]
            linhasParaInserir.push([
              nomeOriginal,
              valorFormatado,
              tipoEstabelecimento,
              mesAlvo.nome,
              infoData.str
            ]);
          }

          totalArquivos++;
        }

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
      abaDestino.getRange(1, 1, 1, 5).setValues([['NOME MOTORISTA', 'VALOR EMISSAO', 'TIPO ESTABELECIMENTO', 'Período', '']]);
    }

    abaDestino.getRange(2, 1, linhasParaInserir.length, 5).setValues(linhasParaInserir);

    var msgSucesso = "✅ Sucesso! " + linhasParaInserir.length + " registro(s) de manutenção de " + mesAlvo.nome + " lançados na aba 'Base_Manutenção'.\n\n" +
                     "• Os dados anteriores foram limpos e relançados com sucesso.\n" +
                     "• " + linhasOutrosMesesQtd + " registros de outros meses foram filtrados e desconsiderados.";
    Logger.log(msgSucesso);
    exibirAlerta(msgSucesso);
  } else {
    var msgVazia = "Processo finalizado. Nenhum lançamento de manutenção correspondente ao mês de " + mesAlvo.nome + " foi encontrado.";
    if (linhasOutrosMesesQtd > 0) {
      msgVazia += "\n\n(Foram ignorados " + linhasOutrosMesesQtd + " registros pertencentes a outros meses).";
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
// 5. TESTE DE CONEXÕES E DIAGNÓSTICO
// ============================================================================
function testarConexoes() {
  var relatorio = [];

  var planilha = obterPlanilhaAlvo();
  if (planilha) {
    var mesAlvo = obterMesAlvoDaPlanilha(planilha);
    relatorio.push("✅ Planilha ativa: " + planilha.getName());
    relatorio.push("📅 Mês de competência identificado: " + mesAlvo.nome + " (" + mesAlvo.codigo + "/" + mesAlvo.ano + ")");

    var aColab = planilha.getSheetByName(CONFIG_FROTA.ABA_CUSTOS_TOTAIS);
    if (aColab) {
      var mapa = carregarListaColaboradores(planilha);
      var total = Object.keys(mapa).length;
      relatorio.push("✅ Aba '" + CONFIG_FROTA.ABA_CUSTOS_TOTAIS + "': " + total + " colaboradores carregados na Coluna A.");
    } else {
      relatorio.push("❌ Aba '" + CONFIG_FROTA.ABA_CUSTOS_TOTAIS + "' NÃO encontrada na planilha.");
    }

    var aAbast = obterAbaPorNomes(planilha, [CONFIG_FROTA.ABA_ABASTECIMENTO, 'Base_Abastecimento', 'Base Abastecimento']);
    relatorio.push(aAbast ? "✅ Aba de Abastecimento encontrada." : "❌ Aba '" + CONFIG_FROTA.ABA_ABASTECIMENTO + "' NÃO encontrada.");

    var aManut = obterAbaPorNomes(planilha, [CONFIG_FROTA.ABA_MANUTENCAO, 'Base_Manutenção', 'Base_Manutencao']);
    relatorio.push(aManut ? "✅ Aba de Manutenção encontrada." : "❌ Aba '" + CONFIG_FROTA.ABA_MANUTENCAO + "' NÃO encontrada.");
  } else {
    relatorio.push("❌ Planilha não identificada.");
  }

  try {
    var pComb = DriveApp.getFolderById(CONFIG_FROTA.PASTA_ORIGEM_COMBUSTIVEL);
    relatorio.push("✅ Pasta Origem Combustível: " + pComb.getName());
  } catch (e) {
    relatorio.push("❌ Erro Pasta Combustível: " + e.message);
  }

  try {
    var pManut = DriveApp.getFolderById(CONFIG_FROTA.PASTA_ORIGEM_MANUTENCAO);
    relatorio.push("✅ Pasta Origem Manutenção: " + pManut.getName());
  } catch (e) {
    relatorio.push("❌ Erro Pasta Manutenção: " + e.message);
  }

  var msg = relatorio.join("\n");
  Logger.log(msg);
  exibirAlerta("Diagnóstico de Conexões:\n\n" + msg);
}


// ============================================================================
// 6. FUNÇÕES AUXILIARES DE SUPORTE (EXCEL, CSV E DATAS)
// ============================================================================

/**
 * Lê a matriz de dados tanto de arquivos Excel (.xlsx) quanto de arquivos CSV (.csv).
 */
function extrairMatrizDeDados(arquivo) {
  var nomeLower = arquivo.getName().toLowerCase();

  if (nomeLower.indexOf('.xlsx') > -1) {
    return converterExcelParaMatriz(arquivo);
  } else {
    var conteudoCsv = arquivo.getBlob().getDataAsString();
    var primeiraLinha = conteudoCsv.split(/\r?\n/)[0];
    var delimitador = detectarDelimitador(primeiraLinha);
    return Utilities.parseCsv(conteudoCsv, delimitador);
  }
}

/**
 * Converte arquivo Excel (.xlsx) em matriz de valores de forma compatível e segura.
 */
function converterExcelParaMatriz(arquivo) {
  var blob = arquivo.getBlob();
  var tempId = null;

  // 1. Tenta usar o serviço avançado do Drive se estiver habilitado
  if (typeof Drive !== 'undefined') {
    try {
      if (Drive.Files && Drive.Files.create) {
        var res = { name: '[TEMP_CONV] ' + arquivo.getName(), mimeType: MimeType.GOOGLE_SHEETS };
        var novo = Drive.Files.create(res, blob);
        tempId = novo.id;
      } else if (Drive.Files && Drive.Files.insert) {
        var res = { title: '[TEMP_CONV] ' + arquivo.getName(), mimeType: MimeType.GOOGLE_SHEETS };
        var novo = Drive.Files.insert(res, blob, { convert: true });
        tempId = novo.id;
      }
    } catch (e) {
      Logger.log("Aviso: Falha ao converter via Drive Service: " + e.message);
    }
  }

  // 2. Fallback direto via REST API do Drive (funciona sem precisar ativar serviço na barra lateral)
  if (!tempId) {
    try {
      var url = 'https://www.googleapis.com/upload/drive/v2/files?uploadType=media&convert=true';
      var params = {
        method: 'post',
        headers: {
          'Authorization': 'Bearer ' + ScriptApp.getOAuthToken()
        },
        contentType: blob.getContentType(),
        payload: blob.getBytes(),
        muteHttpExceptions: true
      };
      var resposta = UrlFetchApp.fetch(url, params);
      var json = JSON.parse(resposta.getContentText());
      if (json && json.id) {
        tempId = json.id;
      }
    } catch (e) {
      Logger.log("Aviso: Falha ao converter via UrlFetch: " + e.message);
    }
  }

  if (!tempId) {
    throw new Error("Não foi possível ler o arquivo Excel (.xlsx). Verifique as permissões de acesso ao Google Drive.");
  }

  // Lê os dados da planilha temporária
  var tempPlanilha = SpreadsheetApp.openById(tempId);
  var dados = tempPlanilha.getSheets()[0].getDataRange().getValues();

  // Exclui a planilha temporária
  try {
    DriveApp.getFileById(tempId).setTrashed(true);
  } catch (e) {}

  return dados;
}

/**
 * Formata valores de data aceitando tanto objetos Date nativos do Excel quanto strings de texto.
 */
function formatarDataTransacao(valorData) {
  if (valorData === undefined || valorData === null || valorData === "") {
    return { str: "", mes: null, ano: null };
  }

  // Se for objeto Date do JavaScript (comum ao ler .xlsx convertido)
  if (valorData instanceof Date && !isNaN(valorData.getTime())) {
    var strFormatada = Utilities.formatDate(valorData, 'America/Fortaleza', 'dd/MM/yyyy HH:mm:ss');
    var mes = Utilities.formatDate(valorData, 'America/Fortaleza', 'MM');
    var ano = Utilities.formatDate(valorData, 'America/Fortaleza', 'yyyy');
    return { str: strFormatada, mes: mes, ano: ano };
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
 * Identifica o mês e ano no título da planilha ativa.
 */
function obterMesAlvoDaPlanilha(planilha) {
  var nomePlanilha = (planilha ? planilha.getName() : CONFIG_FROTA.NOME_PLANILHA_PADRAO).toUpperCase();
  var padrao = padronizarTexto(nomePlanilha);

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

  var mesCodigo = '10';
  var mesNome = 'OUTUBRO';

  for (var mNome in mapaMeses) {
    if (padrao.indexOf(mNome) > -1) {
      mesCodigo = mapaMeses[mNome];
      mesNome = (mNome === 'MARCO') ? 'MARÇO' : mNome;
      break;
    }
  }

  var matchAno = nomePlanilha.match(/\b(20\d{2})\b/);
  var ano = matchAno ? matchAno[1] : '2026';

  return {
    codigo: mesCodigo, // "10"
    nome: mesNome,     // "OUTUBRO"
    ano: ano           // "2026"
  };
}

/**
 * Valida se uma transação pertence ao mês da planilha ativa.
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
    var pasta2026 = DriveApp.getFolderById(CONFIG_FROTA.PASTA_RAIZ_2026);
    var arquivos = pasta2026.getFilesByName(CONFIG_FROTA.NOME_PLANILHA_PADRAO);
    if (arquivos.hasNext()) {
      return SpreadsheetApp.open(arquivos.next());
    }
  } catch (e) {
    Logger.log("Erro ao buscar planilha na pasta 2026: " + e.message);
  }

  var busca = DriveApp.getFilesByName(CONFIG_FROTA.NOME_PLANILHA_PADRAO);
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

  var aba = planilha.getSheetByName(CONFIG_FROTA.ABA_CUSTOS_TOTAIS);
  if (!aba) return mapa;

  var ultimaLinha = aba.getLastRow();
  if (ultimaLinha < 1) return mapa;

  var valores = aba.getRange(1, CONFIG_FROTA.COLUNA_COLABORADORES, ultimaLinha, 1).getValues();
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

  Logger.log("Carregados " + Object.keys(mapa).length + " colaboradores de '" + CONFIG_FROTA.ABA_CUSTOS_TOTAIS + "'.");
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
