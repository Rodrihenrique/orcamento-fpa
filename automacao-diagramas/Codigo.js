/**
 * AUTOMAÇÃO DE DIAGRAMAS 5G | INTEGRAÇÃO DE SITES
 * 
 * Módulo para busca e preenchimento automatizado de diagramas de integração (5G)
 * entre a planilha de controle mensal e a planilha matriz de diagramas.
 */

/**
 * Cria o menu personalizado "🔄 Atualizar Diagramas" na barra superior ao abrir a planilha.
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('🔄 Atualizar Diagramas')
    .addItem('Rodar Script de Busca', 'preencherDiagramas')
    .addToUi();
}

/**
 * Função principal para buscar e preencher os diagramas de integração.
 */
function preencherDiagramas() {
  const ui = SpreadsheetApp.getUi();
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  
  // Feedback visual de início
  spreadsheet.toast('Buscando dados na planilha de origem... Isso pode levar alguns segundos.', 'Processamento Iniciado', -1);
  
  try {
    // 1. Configurações de IDs e abas
    const CONFIG = {
      idDestino: '1672Af0imskRY3ywO7H089Z_unKtXpw7jSHnLSDqAFPw',
      abaDestinoNome: 'OUT/2026',
      idOrigem: '1fd5sieHnEMixKJh8T7qYNwZfecL453cGqqkYl41VdaA',
      abaOrigemNome: 'Diagramas - 5G',
      linhaInicial: 4
    };
    
    // 2. Conexão e validação das planilhas e abas
    const ssDestino = SpreadsheetApp.openById(CONFIG.idDestino);
    const planDestino = ssDestino.getSheetByName(CONFIG.abaDestinoNome);
    if (!planDestino) {
      throw new Error(`Aba de destino "${CONFIG.abaDestinoNome}" não foi encontrada na planilha de destino.`);
    }

    const ssOrigem = SpreadsheetApp.openById(CONFIG.idOrigem);
    const planOrigem = ssOrigem.getSheetByName(CONFIG.abaOrigemNome);
    if (!planOrigem) {
      throw new Error(`Aba de origem "${CONFIG.abaOrigemNome}" não foi encontrada na planilha de origem.`);
    }

    // 3. Pré-processamento e normalização da base de origem UMA ÚNICA VEZ
    // (Otimização crítica de performance: evita re-normalizar milhões de vezes em loop)
    const dadosOrigemBrutos = planOrigem.getDataRange().getValues();
    const dadosOrigemNormalizados = dadosOrigemBrutos.map(linha => 
      linha.map(celula => normalizarTexto(celula))
    );

    // 4. Parâmetros das colunas a processar (regras de cabeçalhos)
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

    // 5. Executa cada lote
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
    
    // Conclusão do toast
    spreadsheet.toast('Atualização finalizada com sucesso!', 'Concluído', 4);
    
    // 6. Mensagem de resumo para o usuário
    let mensagemFinal = "Resumo da Atualização:\n\n";
    relatorio.forEach(r => {
      mensagemFinal += `📍 ${r.nome}:\n` +
                       `   • Sites processados: ${r.processados}\n` +
                       `   • Diagramas encontrados: ${r.encontrados}\n\n`;
    });
      
    ui.alert('✅ Diagramas Atualizados!', mensagemFinal, ui.ButtonSet.OK);
    
  } catch (erro) {
    ui.alert('❌ Erro na Execução', 'Não foi possível concluir a atualização.\n\nDetalhes: ' + erro.message, ui.ButtonSet.OK);
  }
}

/**
 * Função modular para processar uma coluna de sites e preencher a coluna do diagrama correspondente.
 */
function processarParDeColunas(planDestino, dadosOrigem, dadosOrigemNorm, config, linhaInicial) {
  const maxLinhasAba = planDestino.getLastRow();
  if (maxLinhasAba < linhaInicial) {
    return { nome: config.nome, processados: 0, encontrados: 0 };
  }

  // Lê todos os sites a partir da linha inicial até a última linha da planilha
  const rangeSites = planDestino.getRange(`${config.colSite}${linhaInicial}:${config.colSite}${maxLinhasAba}`);
  const sites = rangeSites.getValues();

  // Encontra a última linha que realmente contém um código de site preenchido
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

  // Grava em lote apenas no intervalo necessário
  const rangeDestino = planDestino.getRange(linhaInicial, colParaIndice(config.colDiagrama), resultados.length, 1);
  rangeDestino.setValues(resultados);

  return { nome: config.nome, processados, encontrados };
}

/**
 * Busca rápida usando a matriz já pré-normalizada e regex de delimitação de palavra.
 */
function buscarDiagramaOtimizado(dadosOrigem, dadosOrigemNorm, siteCode, catNorm, subNorm) {
  const siteNorm = normalizarTexto(siteCode);
  if (!siteNorm) return "";

  // Regex para evitar falsos positivos (ex.: código 'SP01' dar match em 'SP012')
  const siteRegex = new RegExp(`(^|[^a-z0-9])${siteNorm}([^a-z0-9]|$)`, 'i');

  for (let r = 0; r < dadosOrigemNorm.length; r++) {
    for (let c = 0; c < dadosOrigemNorm[r].length; c++) {
      const conteudo = dadosOrigemNorm[r][c];

      if (conteudo.includes(catNorm) && conteudo.includes(subNorm) && siteRegex.test(conteudo)) {
        if (c + 1 < dadosOrigem[r].length) {
          return dadosOrigem[r][c + 1]; // Retorna a célula imediatamente à direita
        }
      }
    }
  }
  return "Não encontrado";
}

/**
 * Converte letra da coluna para número (ex: "I" -> 9, "L" -> 12).
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
