/**
 * ============================================================================
 * GESTÃO DE CUSTOS DE FROTA - OPERAÇÃO E MANUTENÇÃO DE REDES
 * ============================================================================
 * Automação de Importação de Abastecimento e Manutenção (CSV -> Google Sheets)
 * 
 * Funcionalidades:
 * 1. Importação de Abastecimento (Aba: Base_Abastecimento):
 *    - Coluna A: NOME MOTORISTA
 *    - Coluna B: VALOR EMISSAO (numérico)
 *    - Coluna C: PERÍODO (mês por extenso)
 *    - Coluna D: DATA/HORA DA TRANSAÇÃO
 * 
 * 2. Importação de Manutenção (Aba: Base_Manutenção):
 *    - Coluna A: NOME MOTORISTA
 *    - Coluna B: VALOR EMISSAO (numérico)
 *    - Coluna C: TIPO ESTABELECIMENTO
 *    - Coluna D: PERÍODO (mês por extenso)
 *    - Coluna E: DATA/HORA DA TRANSAÇÃO
 * 
 * 3. Validação de Colaboradores:
 *    - Lê os colaboradores cadastrados na aba 'Custos_Totais' (Coluna A).
 *    - Filtra as transações do CSV para importar apenas os colaboradores do setor.
 * 
 * 4. Disparo:
 *    - Pode ser disparado diretamente por botões inseridos nas abas da planilha
 *      (atribuindo as funções 'importarDadosAbastecimento' e 'importarDadosManutencao')
 *      ou pelo menu superior "🚗 Gestão de Frota".
 * 
 * 5. Histórico:
 *    - Ao finalizar o processamento, move o CSV para a subpasta "Arquivos Processados".
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
  ABA_MANUTENCAO: 'Base_Manutenção', // Aceita também Base_Manutencao

  // Opção para limpar dados anteriores antes de importar (a partir da linha 2)
  // Deixe false se quiser apenas adicionar ao final (append)
  LIMPAR_DADOS_EXISTENTES: false
};


// ============================================================================
// 2. MENU SUPERIOR DO GOOGLE SHEETS
// ============================================================================
function onOpen() {
  try {
    const ui = SpreadsheetApp.getUi();
    ui.createMenu("🚗 Gestão de Frota")
      .addItem("⛽ Importar Abastecimento (CSV)", "importarDadosAbastecimento")
      .addItem("🔧 Importar Manutenção (CSV)", "importarDadosManutencao")
      .addSeparator()
      .addItem("🔍 Testar Conexões e Abas", "testarConexoes")
      .addToUi();
  } catch (e) {
    Logger.log("Menu UI não carregado (contexto sem UI): " + e.message);
  }
}


// ============================================================================
// 3. FUNÇÃO PARA O BOTÃO DA ABA 'Base_Abastecimento'
// ============================================================================
function importarDadosAbastecimento() {
  Logger.log("Iniciando importação de ABASTECIMENTO...");

  // 1. Obter a planilha atual
  var planilha = obterPlanilhaAlvo();
  if (!planilha) {
    exibirAlerta("Erro: Não foi possível identificar a planilha de destino.");
    return;
  }

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

  // 3. Processar arquivos CSV da pasta de Combustível
  var pastaOrigem = DriveApp.getFolderById(CONFIG_FROTA.PASTA_ORIGEM_COMBUSTIVEL);
  var pastaProcessados = obterOuCriarPastaProcessados(pastaOrigem, CONFIG_FROTA.PASTA_PROCESSADOS_COMBUSTIVEL);
  var arquivos = pastaOrigem.getFiles();

  var linhasParaInserir = [];
  var nomesIgnorados = {};
  var totalArquivos = 0;

  while (arquivos.hasNext()) {
    var arquivo = arquivos.next();
    var nomeArquivo = arquivo.getName();

    if (nomeArquivo.toLowerCase().indexOf('.csv') > -1) {
      if (arquivo.getSize() === 0) {
        Logger.log("Arquivo vazio ignorado: " + nomeArquivo);
        continue;
      }

      try {
        var conteudoCsv = arquivo.getBlob().getDataAsString();
        var primeiraLinha = conteudoCsv.split(/\r?\n/)[0];
        var delimitador = detectarDelimitador(primeiraLinha);
        var dados = Utilities.parseCsv(conteudoCsv, delimitador);

        if (dados.length > 0) {
          var cabecalho = dados.shift();

          // Localiza índices das colunas no CSV
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

          // Processar linhas do CSV
          for (var r = 0; r < dados.length; r++) {
            var linha = dados[r];
            if (!linha || linha.length === 0) continue;

            var nomeOriginal = linha[indexMotorista] ? linha[indexMotorista].toString().trim() : "";
            if (!nomeOriginal) continue;

            var nomePadronizado = padronizarTexto(nomeOriginal);

            // Filtro: apenas colaboradores que constam em Custos_Totais
            if (!mapaColaboradores.hasOwnProperty(nomePadronizado)) {
              nomesIgnorados[nomeOriginal] = true;
              continue;
            }

            var valorFormatado = formatarValorNumerico(linha[indexValor]);
            var dataTransacao = indexData !== -1 ? (linha[indexData] || "").toString().trim() : "";

            var periodo = "";
            if (indexPeriodo !== -1 && linha[indexPeriodo]) {
              periodo = linha[indexPeriodo].toString().trim().toUpperCase();
            } else {
              periodo = extrairPeriodo(dataTransacao, nomeArquivo, planilha.getName());
            }

            // [A: NOME MOTORISTA, B: VALOR EMISSAO, C: PERÍODO, D: DATA/HORA]
            linhasParaInserir.push([
              nomeOriginal,
              valorFormatado,
              periodo,
              dataTransacao
            ]);
          }

          totalArquivos++;
        }

        // Move arquivo processado para a subpasta de histórico
        arquivo.moveTo(pastaProcessados);

      } catch (e) {
        Logger.log("Erro ao processar arquivo " + nomeArquivo + ": " + e.toString());
      }
    }
  }

  // 4. Inserir dados na aba Base_Abastecimento
  if (linhasParaInserir.length > 0) {
    if (CONFIG_FROTA.LIMPAR_DADOS_EXISTENTES && abaDestino.getLastRow() > 1) {
      abaDestino.getRange(2, 1, abaDestino.getLastRow() - 1, 4).clearContent();
    }

    var ultimaLinha = abaDestino.getLastRow();
    if (ultimaLinha === 0) {
      abaDestino.getRange(1, 1, 1, 4).setValues([['NOME MOTORISTA', 'VALOR EMISSAO', 'PERÍODO', '']]);
      ultimaLinha = 1;
    }

    var linhaInicio = ultimaLinha + 1;
    abaDestino.getRange(linhaInicio, 1, linhasParaInserir.length, 4).setValues(linhasParaInserir);

    var msgSucesso = "✅ Sucesso! " + linhasParaInserir.length + " registro(s) de abastecimento importados (" + totalArquivos + " arquivo(s) processado(s)).";
    Logger.log(msgSucesso);
    exibirAlerta(msgSucesso);
  } else {
    var msgVazia = "Processo finalizado. Nenhum arquivo CSV novo ou linhas de colaboradores válidas para importar.";
    Logger.log(msgVazia);
    exibirAlerta(msgVazia);
  }

  // Log de colaboradores ignorados
  var listaIgnorados = Object.keys(nomesIgnorados);
  if (listaIgnorados.length > 0) {
    Logger.log("Motoristas no CSV que não constam em Custos_Totais: " + listaIgnorados.join(", "));
  }
}


// ============================================================================
// 4. FUNÇÃO PARA O BOTÃO DA ABA 'Base_Manutenção'
// ============================================================================
function importarDadosManutencao() {
  Logger.log("Iniciando importação de MANUTENÇÃO...");

  // 1. Obter a planilha atual
  var planilha = obterPlanilhaAlvo();
  if (!planilha) {
    exibirAlerta("Erro: Não foi possível identificar a planilha de destino.");
    return;
  }

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

  // 3. Processar arquivos CSV da pasta de Manutenção
  var pastaOrigem = DriveApp.getFolderById(CONFIG_FROTA.PASTA_ORIGEM_MANUTENCAO);
  var pastaProcessados = obterOuCriarPastaProcessados(pastaOrigem, CONFIG_FROTA.PASTA_PROCESSADOS_MANUTENCAO);
  var arquivos = pastaOrigem.getFiles();

  var linhasParaInserir = [];
  var nomesIgnorados = {};
  var totalArquivos = 0;

  while (arquivos.hasNext()) {
    var arquivo = arquivos.next();
    var nomeArquivo = arquivo.getName();

    if (nomeArquivo.toLowerCase().indexOf('.csv') > -1) {
      if (arquivo.getSize() === 0) {
        Logger.log("Arquivo vazio ignorado: " + nomeArquivo);
        continue;
      }

      try {
        var conteudoCsv = arquivo.getBlob().getDataAsString();
        var primeiraLinha = conteudoCsv.split(/\r?\n/)[0];
        var delimitador = detectarDelimitador(primeiraLinha);
        var dados = Utilities.parseCsv(conteudoCsv, delimitador);

        if (dados.length > 0) {
          var cabecalho = dados.shift();

          // Localiza índices das colunas no CSV
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

          // Processar linhas do CSV
          for (var r = 0; r < dados.length; r++) {
            var linha = dados[r];
            if (!linha || linha.length === 0) continue;

            var nomeOriginal = linha[indexMotorista] ? linha[indexMotorista].toString().trim() : "";
            if (!nomeOriginal) continue;

            var nomePadronizado = padronizarTexto(nomeOriginal);

            // Filtro: apenas colaboradores que constam em Custos_Totais
            if (!mapaColaboradores.hasOwnProperty(nomePadronizado)) {
              nomesIgnorados[nomeOriginal] = true;
              continue;
            }

            var valorFormatado = formatarValorNumerico(linha[indexValor]);
            var tipoEstabelecimento = indexTipoEstabelecimento !== -1 ? (linha[indexTipoEstabelecimento] || "").toString().trim() : "";
            var dataTransacao = indexData !== -1 ? (linha[indexData] || "").toString().trim() : "";

            var periodo = "";
            if (indexPeriodo !== -1 && linha[indexPeriodo]) {
              periodo = linha[indexPeriodo].toString().trim().toUpperCase();
            } else {
              periodo = extrairPeriodo(dataTransacao, nomeArquivo, planilha.getName());
            }

            // [A: NOME MOTORISTA, B: VALOR EMISSAO, C: TIPO ESTABELECIMENTO, D: Período, E: DATA/HORA]
            linhasParaInserir.push([
              nomeOriginal,
              valorFormatado,
              tipoEstabelecimento,
              periodo,
              dataTransacao
            ]);
          }

          totalArquivos++;
        }

        arquivo.moveTo(pastaProcessados);

      } catch (e) {
        Logger.log("Erro ao processar manutenção em " + nomeArquivo + ": " + e.toString());
      }
    }
  }

  // 4. Inserir dados na aba Base_Manutenção
  if (linhasParaInserir.length > 0) {
    if (CONFIG_FROTA.LIMPAR_DADOS_EXISTENTES && abaDestino.getLastRow() > 1) {
      abaDestino.getRange(2, 1, abaDestino.getLastRow() - 1, 5).clearContent();
    }

    var ultimaLinha = abaDestino.getLastRow();
    if (ultimaLinha === 0) {
      abaDestino.getRange(1, 1, 1, 5).setValues([['NOME MOTORISTA', 'VALOR EMISSAO', 'TIPO ESTABELECIMENTO', 'Período', '']]);
      ultimaLinha = 1;
    }

    var linhaInicio = ultimaLinha + 1;
    abaDestino.getRange(linhaInicio, 1, linhasParaInserir.length, 5).setValues(linhasParaInserir);

    var msgSucesso = "✅ Sucesso! " + linhasParaInserir.length + " registro(s) de manutenção importados (" + totalArquivos + " arquivo(s) processado(s)).";
    Logger.log(msgSucesso);
    exibirAlerta(msgSucesso);
  } else {
    var msgVazia = "Processo finalizado. Nenhum arquivo CSV novo de manutenção ou colaboradores válidos encontrados.";
    Logger.log(msgVazia);
    exibirAlerta(msgVazia);
  }

  var listaIgnorados = Object.keys(nomesIgnorados);
  if (listaIgnorados.length > 0) {
    Logger.log("Motoristas no CSV que não constam em Custos_Totais: " + listaIgnorados.join(", "));
  }
}


// ============================================================================
// 5. TESTE DE CONEXÕES E DIAGNÓSTICO
// ============================================================================
function testarConexoes() {
  var relatorio = [];

  var planilha = obterPlanilhaAlvo();
  if (planilha) {
    relatorio.push("✅ Planilha ativa identificada: " + planilha.getName());

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
// 6. FUNÇÕES UTILITÁRIAS
// ============================================================================

/**
 * Obtém a planilha ativa (quando clicado via botão na planilha)
 * ou localiza pelo nome na pasta 2026.
 */
function obterPlanilhaAlvo() {
  try {
    var ativa = SpreadsheetApp.getActiveSpreadsheet();
    if (ativa) return ativa;
  } catch (e) {}

  // Se executado sem contexto ativo (ex: acionador de tempo), busca na pasta 2026
  try {
    var pasta2026 = DriveApp.getFolderById(CONFIG_FROTA.PASTA_RAIZ_2026);
    var arquivos = pasta2026.getFilesByName(CONFIG_FROTA.NOME_PLANILHA_PADRAO);
    if (arquivos.hasNext()) {
      return SpreadsheetApp.open(arquivos.next());
    }
  } catch (e) {
    Logger.log("Erro ao buscar planilha na pasta 2026: " + e.message);
  }

  // Fallback geral pelo nome no Drive
  var busca = DriveApp.getFilesByName(CONFIG_FROTA.NOME_PLANILHA_PADRAO);
  if (busca.hasNext()) {
    return SpreadsheetApp.open(busca.next());
  }

  return null;
}

/**
 * Carrega a lista de nomes de colaboradores da aba 'Custos_Totais' (Coluna A).
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
 * Extrai o mês por extenso a partir da data da transação, do nome do arquivo ou da planilha.
 */
function extrairPeriodo(dataStr, nomeArquivo, nomePlanilha) {
  var mapaMeses = {
    '01': 'JANEIRO', '02': 'FEVEREIRO', '03': 'MARÇO', '04': 'ABRIL',
    '05': 'MAIO', '06': 'JUNHO', '07': 'JULHO', '08': 'AGOSTO',
    '09': 'SETEMBRO', '10': 'OUTUBRO', '11': 'NOVEMBRO', '12': 'DEZEMBRO'
  };

  if (dataStr) {
    var matchBr = dataStr.toString().match(/\d{2}\/(\d{2})\/\d{4}/);
    if (matchBr && mapaMeses[matchBr[1]]) return mapaMeses[matchBr[1]];
    var matchIso = dataStr.toString().match(/\d{4}-(\d{2})-\d{2}/);
    if (matchIso && mapaMeses[matchIso[1]]) return mapaMeses[matchIso[1]];
  }

  if (nomeArquivo) {
    var matchArq = nomeArquivo.match(/\d{4}(\d{2})\d{2}/);
    if (matchArq && mapaMeses[matchArq[1]]) return mapaMeses[matchArq[1]];
  }

  if (nomePlanilha) {
    var nomeU = nomePlanilha.toUpperCase();
    for (var cod in mapaMeses) {
      if (nomeU.indexOf(mapaMeses[cod]) > -1) return mapaMeses[cod];
    }
  }

  return 'OUTUBRO';
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
