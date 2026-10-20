/**
 * ============================================================================
 * ORÇAHUB / CUSTOS DO SETOR - AUTOMAÇÃO DE ABASTECIMENTO E MANUTENÇÃO DE FROTAS
 * ============================================================================
 * Setor: OPERAÇÃO E MANUTENÇÃO DE REDES
 * Arquivo: Importacao_Abastecimento_Frota.js
 * 
 * Funcionalidades:
 * 1. Monitora a pasta do Drive contendo os relatórios de faturamento CSV (Ticket Log / RFCV).
 * 2. Identifica delimitador (vírgula ou ponto e vírgula) e mapeia colunas dinamicamente:
 *    - Coluna A: NOME MOTORISTA
 *    - Coluna B: VALOR EMISSAO (convertido para formato numérico)
 *    - Coluna C: PERÍODO (identificado automaticamente como "OUTUBRO" ou conforme a data)
 *    - Coluna D: Data e Hora da Transação
 * 3. Valida e filtra motoristas pela base de colaboradores (Telefonia / Redes).
 * 4. Insere automaticamente na aba 'Base_Abastecimento' da planilha mensal
 *    (ex.: "10. CUSTOS DO SETOR - OUTUBRO - 2026").
 * 5. Move os arquivos processados para a pasta de histórico, evitando duplicidades.
 * ============================================================================
 */

// ============================================================================
// 1. CONFIGURAÇÕES GERAIS DE PASTAS E PLANILHAS
// ============================================================================
const CONFIG_FROTA = {
  // Pastas de Abastecimento (Combustível)
  PASTA_ORIGEM_ABASTECIMENTO: '1exK26bgZNurn4bh0Q5bv-f-WyM3f-fxs',      // Pasta: Combustível - Frotas Telefonia
  PASTA_PROCESSADOS_ABASTECIMENTO: '1FNAHGP3n2FZzIDC_NphwkG26G1CrQL0F', // Pasta: Arquivos Processados

  // Pastas de Manutenção
  PASTA_ORIGEM_MANUTENCAO: '1zpsygbFL4d6PtsbjN9FMVITt2ZptR8f2',
  PASTA_PROCESSADOS_MANUTENCAO: '12q2UQwRaP6vxJXtiMVC1eCThI4WG6Ko2',

  // Planilha de Destino Mensal (Pasta: CUSTOS DO SETOR > OPERAÇÃO E MANUTENÇÃO DE REDES > 2026)
  // DICA: Você pode colar o ID da planilha de Outubro aqui se desejar (código na URL entre /d/ e /edit).
  // Se deixar vazio (''), o script busca automaticamente pelo nome do arquivo no Drive.
  ID_PLANILHA_DESTINO: '', 
  NOME_PLANILHA_DESTINO: '10. CUSTOS DO SETOR - OUTUBRO - 2026',
  
  // Nomes das abas de destino
  ABA_DESTINO_ABASTECIMENTO: 'Base_Abastecimento',
  ABA_DESTINO_MANUTENCAO: 'MANUTENCAO CARROS',

  // Base de Colaboradores (Telefonia / Redes)
  FILTRAR_POR_COLABORADORES: true, // 'true' para importar apenas motoristas da base, 'false' para importar todos
  ID_PLANILHA_COLABORADORES: '1PtqV_ief0ygTXyKXYAy9hrF6uHEHWYCB37TyceDVk0o',
  ABA_COLABORADORES: 'BASE COLABORADORES TELFONIA',

  // Se true, limpa os dados antigos a partir da linha 2 antes de importar (evita deixar linhas de modelo/exemplo)
  LIMPAR_DADOS_EXISTENTES: false
};


// ============================================================================
// 2. FUNÇÃO PRINCIPAL: IMPORTAR DADOS DE ABASTECIMENTO (RFCV)
// ============================================================================
function importarDadosAbastecimento() {
  Logger.log('Iniciando importação de abastecimento para: ' + CONFIG_FROTA.NOME_PLANILHA_DESTINO);

  // 1. Obter planilha de destino
  var planilhaDestino = obterPlanilhaDestino(CONFIG_FROTA.ID_PLANILHA_DESTINO, CONFIG_FROTA.NOME_PLANILHA_DESTINO);
  if (!planilhaDestino) {
    SpreadsheetApp.getUi().alert(
      'Erro: Planilha "' + CONFIG_FROTA.NOME_PLANILHA_DESTINO + '" não encontrada no Drive.\n\n' +
      'Abra a planilha de Outubro no navegador, copie o ID na URL (entre /d/ e /edit) ' +
      'e cole no campo ID_PLANILHA_DESTINO.'
    );
    return;
  }

  var abaDestino = planilhaDestino.getSheetByName(CONFIG_FROTA.ABA_DESTINO_ABASTECIMENTO);
  if (!abaDestino) {
    SpreadsheetApp.getUi().alert('Erro: Aba "' + CONFIG_FROTA.ABA_DESTINO_ABASTECIMENTO + '" não encontrada na planilha.');
    return;
  }

  // 2. Carregar base de colaboradores para filtro
  var mapaColaboradores = {};
  if (CONFIG_FROTA.FILTRAR_POR_COLABORADORES) {
    mapaColaboradores = carregarMapaColaboradores(planilhaDestino);
  }

  // 3. Processar arquivos CSV da pasta de origem
  var pastaOrigem = DriveApp.getFolderById(CONFIG_FROTA.PASTA_ORIGEM_ABASTECIMENTO);
  var arquivos = pastaOrigem.getFiles();
  var pastaProcessados = DriveApp.getFolderById(CONFIG_FROTA.PASTA_PROCESSADOS_ABASTECIMENTO);

  var importouAlgo = false;
  var nomesNaoEncontrados = {};
  var dadosParaInserir = [];

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

          // Localizar colunas necessárias no cabeçalho do CSV
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
            Logger.log('Colunas obrigatórias ("NOME MOTORISTA" ou "VALOR EMISSAO") não encontradas em: ' + nome);
            continue;
          }

          // Montar registros das 4 colunas: [Nome, Valor, Período, Data/Hora]
          for (var r = 0; r < dados.length; r++) {
            var linha = dados[r];
            if (!linha || linha.length === 0) continue;

            var nomeOriginal = linha[indexMotorista] ? linha[indexMotorista].toString().trim() : "";
            if (!nomeOriginal) continue;

            var nomePadronizado = padronizarTexto(nomeOriginal);

            // Filtro por colaboradores cadastrados
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

            dadosParaInserir.push([
              nomeOriginal,
              valorFormatado,
              periodo,
              dataTransacao
            ]);
          }

          importouAlgo = true;
        }

        // Move o arquivo CSV processado para a pasta de histórico
        arquivo.moveTo(pastaProcessados);

      } catch (e) {
        Logger.log('Erro ao processar o arquivo ' + nome + ': ' + e.toString());
      }
    }
  }

  // 4. Inserir dados na aba 'Base_Abastecimento'
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

  // 5. Relatório e logs finais
  var listaIgnorados = Object.keys(nomesNaoEncontrados);
  if (listaIgnorados.length > 0) {
    Logger.log("Motoristas no CSV que não constam na Base Telefonia: " + listaIgnorados.join(", "));
  }

  if (importouAlgo && dadosParaInserir.length > 0) {
    SpreadsheetApp.getUi().alert('Sucesso! ' + dadosParaInserir.length + ' registros importados para a aba Base_Abastecimento da planilha de OUTUBRO.');
  } else {
    SpreadsheetApp.getUi().alert('Processo finalizado. Nenhum arquivo CSV novo ou linhas válidas encontradas para importar.');
  }
}


// ============================================================================
// 3. FUNÇÕES AUXILIARES DE SUPORTE
// ============================================================================

/**
 * Abre a planilha pelo ID ou busca pelo nome no Google Drive.
 */
function obterPlanilhaDestino(idPlanilha, nomePlanilha) {
  if (idPlanilha && idPlanilha.trim() !== '') {
    try {
      return SpreadsheetApp.openById(idPlanilha.trim());
    } catch (e) {
      Logger.log('Erro ao abrir pelo ID: ' + e.toString());
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

/**
 * Carrega mapa de colaboradores a partir da planilha de destino ou da planilha central.
 */
function carregarMapaColaboradores(planilhaDestino) {
  var mapa = {};
  var abaColab = null;

  try {
    abaColab = planilhaDestino.getSheetByName(CONFIG_FROTA.ABA_COLABORADORES);
  } catch(e) {}

  if (!abaColab && CONFIG_FROTA.ID_PLANILHA_COLABORADORES) {
    try {
      var planilhaCentral = SpreadsheetApp.openById(CONFIG_FROTA.ID_PLANILHA_COLABORADORES);
      abaColab = planilhaCentral.getSheetByName(CONFIG_FROTA.ABA_COLABORADORES);
    } catch(e) {
      Logger.log('Erro ao acessar base central de colaboradores: ' + e.toString());
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
  } else {
    Logger.log('Aviso: Aba de colaboradores não encontrada. Importação ocorrerá sem filtro.');
  }

  return mapa;
}

/**
 * Limpa acentuação, espaços duplos e padroniza para maiúsculas.
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
 * Converte valor em formato string para número decimal válido.
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
 * Identifica o mês por extenso a partir da data da transação ou do nome do arquivo.
 */
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

/**
 * Identifica se o CSV usa delimitador vírgula ou ponto e vírgula.
 */
function detectarDelimitador(linhaCabecalho) {
  var virgulas = (linhaCabecalho.match(/,/g) || []).length;
  var pontoEVirgulas = (linhaCabecalho.match(/;/g) || []).length;
  return pontoEVirgulas > virgulas ? ';' : ',';
}
