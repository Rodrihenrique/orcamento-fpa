/**
 * ============================================================================
 * ORÇAHUB / CUSTOS DO SETOR - AUTOMAÇÃO DE ABASTECIMENTO E MANUTENÇÃO DE FROTAS
 * ============================================================================
 * Setor: OPERAÇÃO E MANUTENÇÃO DE REDES
 * Módulo: automacao-abastecimento-frotas
 * Arquivo: Codigo.js
 * 
 * Funcionalidades:
 * 1. Processa automaticamente extratos de abastecimento (RFCV_*.csv) e manutenção.
 * 2. Suporta delimitadores dinâmicos (vírgula ou ponto e vírgula).
 * 3. Formata e insere os dados na planilha mensal do setor:
 *    - Coluna A: NOME MOTORISTA
 *    - Coluna B: VALOR EMISSAO (numérico)
 *    - Coluna C: PERÍODO (mês por extenso)
 *    - Coluna D: Data e Hora da transação
 * 4. Valida e filtra motoristas pela Base de Colaboradores (Telefonia / Redes).
 * 5. Move arquivos processados para pasta de histórico para evitar duplicidade.
 * 6. Fornece menu interativo no Google Sheets e suporte a gatilhos automáticos.
 * ============================================================================
 */

// ============================================================================
// 1. CONFIGURAÇÕES PRINCIPAIS
// ============================================================================
const CONFIG_FROTA = {
  // Pastas de Abastecimento no Google Drive
  PASTA_ORIGEM_ABASTECIMENTO: '1exK26bgZNurn4bh0Q5bv-f-WyM3f-fxs',      // Pasta: Combustível - Frotas Telefonia
  PASTA_PROCESSADOS_ABASTECIMENTO: '1FNAHGP3n2FZzIDC_NphwkG26G1CrQL0F', // Pasta: Arquivos Processados

  // Pastas de Manutenção no Google Drive
  PASTA_ORIGEM_MANUTENCAO: '1zpsygbFL4d6PtsbjN9FMVITt2ZptR8f2',
  PASTA_PROCESSADOS_MANUTENCAO: '12q2UQwRaP6vxJXtiMVC1eCThI4WG6Ko2',

  // Planilha de Destino Mensal (CUSTOS DO SETOR > OPERAÇÃO E MANUTENÇÃO DE REDES > 2026)
  // DICA: Você pode colar o ID da planilha de Outubro aqui (código na URL entre /d/ e /edit).
  // Se deixar vazio (''), o script buscará automaticamente pelo nome exato no Drive.
  ID_PLANILHA_DESTINO: '', 
  NOME_PLANILHA_DESTINO: '10. CUSTOS DO SETOR - OUTUBRO - 2026',
  
  // Nomes das abas de destino dentro da planilha mensal
  ABA_DESTINO_ABASTECIMENTO: 'Base_Abastecimento',
  ABA_DESTINO_MANUTENCAO: 'MANUTENCAO CARROS',

  // Base de Colaboradores (para filtrar os motoristas que pertencem ao setor)
  FILTRAR_POR_COLABORADORES: true,
  ID_PLANILHA_COLABORADORES: '1PtqV_ief0ygTXyKXYAy9hrF6uHEHWYCB37TyceDVk0o',
  ABA_COLABORADORES: 'BASE COLABORADORES TELFONIA',

  // Limpeza de dados antigos da aba (a partir da linha 2)
  // Deixe 'true' caso a aba tenha vindo com linhas de exemplo de meses anteriores
  LIMPAR_DADOS_EXISTENTES: false
};


// ============================================================================
// 2. MENU SUPERIOR DO GOOGLE PLANILHAS
// ============================================================================
function onOpen() {
  try {
    const ui = SpreadsheetApp.getUi();
    ui.createMenu("🚗 Gestão de Frota")
      .addItem("⛽ Importar Abastecimento (Outubro)", "importarDadosAbastecimento")
      .addItem("🔧 Importar Manutenção", "importarDadosManutencao")
      .addSeparator()
      .addItem("🔍 Testar Conexões (Pastas e Planilha)", "testarConexoes")
      .addSeparator()
      .addItem("⏰ Ativar Leitura Diária Automática (07:00)", "instalarGatilhoAutomatico")
      .addItem("🛑 Desativar Leitura Automática", "removerGatilhos")
      .addToUi();
  } catch (e) {
    // Caso seja executado em projeto independente sem interface de planilha vinculada
    Logger.log("Interface UI não disponível neste contexto: " + e.message);
  }
}


// ============================================================================
// 3. IMPORTAÇÃO DE ABASTECIMENTO (RFCV_*.csv)
// ============================================================================
function importarDadosAbastecimento() {
  Logger.log("Iniciando importação de abastecimento para: " + CONFIG_FROTA.NOME_PLANILHA_DESTINO);

  // 1. Obter planilha de destino
  var planilhaDestino = obterPlanilhaDestino(CONFIG_FROTA.ID_PLANILHA_DESTINO, CONFIG_FROTA.NOME_PLANILHA_DESTINO);
  if (!planilhaDestino) {
    exibirAlerta(
      'Erro: Planilha "' + CONFIG_FROTA.NOME_PLANILHA_DESTINO + '" não encontrada no Drive.\n\n' +
      'Abra a planilha de Outubro no navegador, copie o ID na barra de URL (entre /d/ e /edit) ' +
      'e cole no campo ID_PLANILHA_DESTINO no código.'
    );
    return;
  }

  var abaDestino = planilhaDestino.getSheetByName(CONFIG_FROTA.ABA_DESTINO_ABASTECIMENTO);
  if (!abaDestino) {
    exibirAlerta('Erro: Aba "' + CONFIG_FROTA.ABA_DESTINO_ABASTECIMENTO + '" não encontrada na planilha de destino.');
    return;
  }

  // 2. Carregar mapa de colaboradores do setor
  var mapaColaboradores = {};
  if (CONFIG_FROTA.FILTRAR_POR_COLABORADORES) {
    mapaColaboradores = carregarMapaColaboradores(planilhaDestino);
  }

  // 3. Processar arquivos CSV da pasta de abastecimento
  var pastaOrigem = DriveApp.getFolderById(CONFIG_FROTA.PASTA_ORIGEM_ABASTECIMENTO);
  var arquivos = pastaOrigem.getFiles();
  var pastaProcessados = DriveApp.getFolderById(CONFIG_FROTA.PASTA_PROCESSADOS_ABASTECIMENTO);

  var importouAlgo = false;
  var nomesNaoEncontrados = {};
  var dadosParaInserir = [];
  var arquivosProcessadosQtd = 0;

  while (arquivos.hasNext()) {
    var arquivo = arquivos.next();
    var nome = arquivo.getName();

    if (nome.toLowerCase().indexOf('.csv') > -1) {
      if (arquivo.getSize() === 0) {
        Logger.log('Arquivo vazio ignorado: ' + nome);
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
            Logger.log('Colunas obrigatórias não encontradas no arquivo: ' + nome);
            continue;
          }

          // Filtra e formata os dados para o padrão de 4 colunas da aba
          for (var r = 0; r < dados.length; r++) {
            var linha = dados[r];
            if (!linha || linha.length === 0) continue;

            var nomeOriginal = linha[indexMotorista] ? linha[indexMotorista].toString().trim() : "";
            if (!nomeOriginal) continue;

            var nomePadronizado = padronizarTexto(nomeOriginal);

            // Validação por colaborador
            if (CONFIG_FROTA.FILTRAR_POR_COLABORADORES && Object.keys(mapaColaboradores).length > 0) {
              if (!mapaColaboradores.hasOwnProperty(nomePadronizado)) {
                nomesNaoEncontrados[nomeOriginal] = true;
                continue;
              }
            }

            var valorFormatado = formatarValorNumerico(linha[indexValor]);
            var dataTransacao = indexData !== -1 ? (linha[indexData] || "").toString().trim() : "";

            var periodo = "";
            if (indexPeriodo !== -1 && linha[indexPeriodo]) {
              periodo = linha[indexPeriodo].toString().trim().toUpperCase();
            } else {
              periodo = identificarPeriodo(dataTransacao, nome);
            }

            // [A: NOME MOTORISTA, B: VALOR EMISSAO, C: PERÍODO, D: DATA/HORA]
            dadosParaInserir.push([
              nomeOriginal,
              valorFormatado,
              periodo,
              dataTransacao
            ]);
          }

          importouAlgo = true;
          arquivosProcessadosQtd++;
        }

        // Move o arquivo processado para a pasta de histórico
        arquivo.moveTo(pastaProcessados);

      } catch (e) {
        Logger.log('Erro ao processar arquivo ' + nome + ': ' + e.toString());
      }
    }
  }

  // 4. Inserir registros na aba de destino
  if (dadosParaInserir.length > 0) {
    if (CONFIG_FROTA.LIMPAR_DADOS_EXISTENTES && abaDestino.getLastRow() > 1) {
      abaDestino.getRange(2, 1, abaDestino.getLastRow() - 1, 4).clearContent();
    }

    var ultimaLinha = abaDestino.getLastRow();

    if (ultimaLinha === 0) {
      abaDestino.getRange(1, 1, 1, 4).setValues([['NOME MOTORISTA', 'VALOR EMISSAO', 'PERÍODO', '']]);
      ultimaLinha = 1;
    }

    var linhaInicio = ultimaLinha + 1;
    abaDestino.getRange(linhaInicio, 1, dadosParaInserir.length, 4).setValues(dadosParaInserir);
  }

  // 5. Exibir logs e relatório final
  var listaIgnorados = Object.keys(nomesNaoEncontrados);
  if (listaIgnorados.length > 0) {
    Logger.log("Motoristas no CSV que não constam na Base Telefonia: " + listaIgnorados.join(", "));
  }

  var msg = "";
  if (importouAlgo && dadosParaInserir.length > 0) {
    msg = 'Sucesso! ' + dadosParaInserir.length + ' registros importados para a aba "' + CONFIG_FROTA.ABA_DESTINO_ABASTECIMENTO + '" da planilha de Outubro (' + arquivosProcessadosQtd + ' arquivo(s) processado(s)).';
  } else {
    msg = 'Processo finalizado. Nenhum arquivo CSV novo ou linhas válidas encontradas para importar.';
  }

  Logger.log(msg);
  exibirAlerta(msg);
}


// ============================================================================
// 4. IMPORTAÇÃO DE MANUTENÇÃO (CARROS)
// ============================================================================
function importarDadosManutencao() {
  Logger.log("Iniciando importação de manutenção para: " + CONFIG_FROTA.NOME_PLANILHA_DESTINO);

  var planilhaDestino = obterPlanilhaDestino(CONFIG_FROTA.ID_PLANILHA_DESTINO, CONFIG_FROTA.NOME_PLANILHA_DESTINO);
  if (!planilhaDestino) {
    exibirAlerta('Erro: Planilha "' + CONFIG_FROTA.NOME_PLANILHA_DESTINO + '" não encontrada.');
    return;
  }

  var abaDestino = planilhaDestino.getSheetByName(CONFIG_FROTA.ABA_DESTINO_MANUTENCAO);
  if (!abaDestino) {
    exibirAlerta('Erro: Aba "' + CONFIG_FROTA.ABA_DESTINO_MANUTENCAO + '" não encontrada.');
    return;
  }

  var mapaColaboradores = {};
  if (CONFIG_FROTA.FILTRAR_POR_COLABORADORES) {
    mapaColaboradores = carregarMapaColaboradoresCompleto(planilhaDestino);
  }

  var pastaOrigem = DriveApp.getFolderById(CONFIG_FROTA.PASTA_ORIGEM_MANUTENCAO);
  var arquivos = pastaOrigem.getFiles();
  var pastaProcessados = DriveApp.getFolderById(CONFIG_FROTA.PASTA_PROCESSADOS_MANUTENCAO);

  var importouAlgo = false;
  var nomesNaoEncontrados = {};

  while (arquivos.hasNext()) {
    var arquivo = arquivos.next();
    var nome = arquivo.getName();

    if (nome.toLowerCase().indexOf('.csv') > -1) {
      if (arquivo.getSize() === 0) continue;

      try {
        var conteudoCsv = arquivo.getBlob().getDataAsString();
        var primeiraLinha = conteudoCsv.split(/\r?\n/)[0];
        var delimitador = detectarDelimitador(primeiraLinha);
        var dados = Utilities.parseCsv(conteudoCsv, delimitador);

        if (dados.length > 0) {
          var cabecalho = dados.shift();

          var indexMotorista = -1;
          var indexServico = -1;

          for (var c = 0; c < cabecalho.length; c++) {
            var col = padronizarTexto(cabecalho[c]);
            if (col === 'NOME MOTORISTA') indexMotorista = c;
            if (col === 'SERVICO' || col === 'SERVIÇO') indexServico = c;
          }

          if (indexMotorista === -1 || indexServico === -1) {
            Logger.log('Colunas obrigatórias não encontradas no arquivo: ' + nome);
            continue;
          }

          var indexInsercaoEquipe = indexServico;
          cabecalho.splice(indexInsercaoEquipe, 0, 'EQUIPE');
          while (cabecalho.length < 40) cabecalho.push("");
          cabecalho[40] = 'GERENTE';

          var dadosFiltrados = [];

          for (var r = 0; r < dados.length; r++) {
            var linha = dados[r];
            var nomeOriginal = linha[indexMotorista] ? linha[indexMotorista].toString().trim() : "";
            var nomePadronizado = padronizarTexto(nomeOriginal);

            if (mapaColaboradores.hasOwnProperty(nomePadronizado)) {
              var colab = mapaColaboradores[nomePadronizado];
              linha.splice(indexInsercaoEquipe, 0, colab.equipe);
              while (linha.length < 40) linha.push("");
              linha[40] = colab.gerente;
              dadosFiltrados.push(linha);
            } else if (nomePadronizado !== "") {
              nomesNaoEncontrados[nomeOriginal] = true;
            }
          }

          var ultimaLinha = abaDestino.getLastRow();
          if (ultimaLinha === 0) {
            abaDestino.getRange(1, 1, 1, cabecalho.length).setValues([cabecalho]);
            ultimaLinha = 1;
          }

          if (dadosFiltrados.length > 0) {
            var linhaInicio = ultimaLinha + 1;
            abaDestino.getRange(linhaInicio, 1, dadosFiltrados.length, dadosFiltrados[0].length).setValues(dadosFiltrados);
            importouAlgo = true;
          }
        }

        arquivo.moveTo(pastaProcessados);

      } catch (e) {
        Logger.log('Erro ao processar manutenção: ' + e.toString());
      }
    }
  }

  if (importouAlgo) {
    exibirAlerta('Importação de Manutenção concluída com sucesso!');
  } else {
    exibirAlerta('Processo finalizado. Nenhum arquivo CSV novo de manutenção encontrado.');
  }
}


// ============================================================================
// 5. TESTE DE CONEXÕES E DIAGNÓSTICO
// ============================================================================
function testarConexoes() {
  var relatorio = [];

  // Testar Planilha de Destino
  try {
    var pDest = obterPlanilhaDestino(CONFIG_FROTA.ID_PLANILHA_DESTINO, CONFIG_FROTA.NOME_PLANILHA_DESTINO);
    if (pDest) {
      relatorio.push("✅ Planilha de Destino encontrada: " + pDest.getName());
      var aAbast = pDest.getSheetByName(CONFIG_FROTA.ABA_DESTINO_ABASTECIMENTO);
      relatorio.push(aAbast ? "✅ Aba '" + CONFIG_FROTA.ABA_DESTINO_ABASTECIMENTO + "' encontrada." : "❌ Aba '" + CONFIG_FROTA.ABA_DESTINO_ABASTECIMENTO + "' NÃO encontrada.");
    } else {
      relatorio.push("❌ Planilha de Destino NÃO encontrada.");
    }
  } catch (e) {
    relatorio.push("❌ Erro ao acessar planilha: " + e.message);
  }

  // Testar Pastas do Drive
  try {
    var pOrigem = DriveApp.getFolderById(CONFIG_FROTA.PASTA_ORIGEM_ABASTECIMENTO);
    relatorio.push("✅ Pasta Origem Abastecimento: " + pOrigem.getName());
  } catch (e) {
    relatorio.push("❌ Erro na Pasta Origem: " + e.message);
  }

  try {
    var pProc = DriveApp.getFolderById(CONFIG_FROTA.PASTA_PROCESSADOS_ABASTECIMENTO);
    relatorio.push("✅ Pasta Processados: " + pProc.getName());
  } catch (e) {
    relatorio.push("❌ Erro na Pasta Processados: " + e.message);
  }

  // Testar Base de Colaboradores
  try {
    var mapa = carregarMapaColaboradores(pDest);
    relatorio.push("✅ Base de Colaboradores carregada: " + Object.keys(mapa).length + " registros.");
  } catch (e) {
    relatorio.push("❌ Erro na Base de Colaboradores: " + e.message);
  }

  var msgCompleta = relatorio.join("\n");
  Logger.log(msgCompleta);
  exibirAlerta("Diagnóstico de Conexões:\n\n" + msgCompleta);
}


// ============================================================================
// 6. GATILHOS TEMPORAIS (TRIGGERS)
// ============================================================================
function instalarGatilhoAutomatico() {
  removerGatilhos();
  ScriptApp.newTrigger('importarDadosAbastecimento')
    .timeBased()
    .atHour(7)
    .everyDays(1)
    .inTimezone('America/Fortaleza')
    .create();

  exibirAlerta("Gatilho automático configurado com sucesso! A importação rodará diariamente às 07:00.");
}

function removerGatilhos() {
  var gatilhos = ScriptApp.getProjectTriggers();
  for (var i = 0; i < gatilhos.length; i++) {
    if (gatilhos[i].getHandlerFunction() === 'importarDadosAbastecimento') {
      ScriptApp.deleteTrigger(gatilhos[i]);
    }
  }
}


// ============================================================================
// 7. FUNÇÕES UTILITÁRIAS
// ============================================================================

function obterPlanilhaDestino(idPlanilha, nomePlanilha) {
  if (idPlanilha && idPlanilha.trim() !== '') {
    try {
      return SpreadsheetApp.openById(idPlanilha.trim());
    } catch (e) {
      Logger.log('Erro ao abrir por ID: ' + e.toString());
    }
  }

  if (nomePlanilha && nomePlanilha.trim() !== '') {
    var arquivos = DriveApp.getFilesByName(nomePlanilha.trim());
    if (arquivos.hasNext()) {
      return SpreadsheetApp.open(arquivos.next());
    }
  }

  return null;
}

function carregarMapaColaboradores(planilhaDestino) {
  var mapa = {};
  var abaColab = null;

  try {
    if (planilhaDestino) {
      abaColab = planilhaDestino.getSheetByName(CONFIG_FROTA.ABA_COLABORADORES);
    }
  } catch(e) {}

  if (!abaColab && CONFIG_FROTA.ID_PLANILHA_COLABORADORES) {
    try {
      var planilhaCentral = SpreadsheetApp.openById(CONFIG_FROTA.ID_PLANILHA_COLABORADORES);
      abaColab = planilhaCentral.getSheetByName(CONFIG_FROTA.ABA_COLABORADORES);
    } catch(e) {
      Logger.log('Erro ao abrir base central de colaboradores: ' + e.toString());
    }
  }

  if (abaColab) {
    var dados = abaColab.getDataRange().getValues();
    var indiceNome = 5; // Coluna F
    for (var i = 1; i < dados.length; i++) {
      var nome = dados[i][indiceNome];
      if (nome) {
        mapa[padronizarTexto(nome)] = true;
      }
    }
  }

  return mapa;
}

function carregarMapaColaboradoresCompleto(planilhaDestino) {
  var mapa = {};
  var abaColab = null;

  try {
    if (planilhaDestino) {
      abaColab = planilhaDestino.getSheetByName(CONFIG_FROTA.ABA_COLABORADORES);
    }
  } catch(e) {}

  if (!abaColab && CONFIG_FROTA.ID_PLANILHA_COLABORADORES) {
    try {
      var planilhaCentral = SpreadsheetApp.openById(CONFIG_FROTA.ID_PLANILHA_COLABORADORES);
      abaColab = planilhaCentral.getSheetByName(CONFIG_FROTA.ABA_COLABORADORES);
    } catch(e) {
      Logger.log('Erro ao abrir base central: ' + e.toString());
    }
  }

  if (abaColab) {
    var dados = abaColab.getDataRange().getValues();
    var indiceNome = 5;
    var indiceGerente = 13;
    var indiceEquipe = 16;

    for (var i = 1; i < dados.length; i++) {
      var nome = dados[i][indiceNome];
      if (nome) {
        mapa[padronizarTexto(nome)] = {
          gerente: dados[i][indiceGerente],
          equipe: dados[i][indiceEquipe]
        };
      }
    }
  }

  return mapa;
}

function padronizarTexto(texto) {
  if (!texto) return "";
  return texto.toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, ' ');
}

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

function identificarPeriodo(dataStr, nomeArquivo) {
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

  return 'OUTUBRO';
}

function detectarDelimitador(linhaCabecalho) {
  var virgulas = (linhaCabecalho.match(/,/g) || []).length;
  var pontoEVirgulas = (linhaCabecalho.match(/;/g) || []).length;
  return pontoEVirgulas > virgulas ? ';' : ',';
}

function exibirAlerta(msg) {
  try {
    SpreadsheetApp.getUi().alert(msg);
  } catch (e) {
    Logger.log("Alerta (UI indisponível): " + msg);
  }
}
