/**
 * ============================================================================
 * ORÇAMENTO 2028 - GERÊNCIA EXECUTIVA DE TELEFONIA (BRISANET TELECOM)
 * Arquivo: Codigo.gs
 * ============================================================================
 */

function doGet() {
  inicializarPlanilha();
  
  const template = HtmlService.createTemplateFromFile('Index');
  
  // Pré-carrega os dados salvos da planilha diretamente no template
  try {
    const custosSalvos = obterCustosSalvos();
    template.dadosIniciaisJSON = JSON.stringify(custosSalvos);
  } catch (e) {
    console.error("Erro ao pré-carregar custos na inicialização:", e);
    template.dadosIniciaisJSON = '[]';
  }

  return template
    .evaluate()
    .setTitle('brisanet - Orçamento 2028 | OPEX e CAPEX')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1.0')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/**
 * Garante que todas as abas necessárias existam com seus cabeçalhos corretos.
 */
function inicializarPlanilha() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const abas = ['DETRAF', 'OPEX_Dados', 'CAPEX_Dados', 'Premissas', 'Importacao'];
 
  abas.forEach(nomeAba => {
    let aba = ss.getSheetByName(nomeAba);
    if (!aba) {
      aba = ss.insertSheet(nomeAba);
    }
    
    // Se a aba estiver vazia, cria os cabeçalhos
    if (aba.getLastRow() === 0) {
      if (nomeAba === 'OPEX_Dados' || nomeAba === 'CAPEX_Dados') {
        aba.appendRow([
          'ID_Sistema', 'Data Última Modificação', 'Tipo', 'Setor', 'Pacote', 
          'Nome do Custo', 'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 
          'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez', 'Total'
        ]);
        aba.getRange(1, 1, 1, 19).setFontWeight('bold').setBackground('#F1F5F9');
      } else if (nomeAba === 'Importacao') {
        aba.appendRow([
          'Tipo', 'Setor', 'Pacote', 'Conta / Descricao', 
          'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 
          'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
        ]);
        aba.getRange(1, 1, 1, 16).setFontWeight('bold').setBackground('#F1F5F9');
      }
    }
  });
}

/**
 * Carrega todos os custos salvos nas abas OPEX_Dados e CAPEX_Dados.
 * Retorna uma lista de objetos estruturados prontos para renderização.
 */
function obterCustosSalvos() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const abaOpex = ss.getSheetByName('OPEX_Dados');
  const abaCapex = ss.getSheetByName('CAPEX_Dados');
  const dados = [];
  const mapIndices = {};

  function normalizarTexto(str) {
    return String(str || '')
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, ' ')
      .trim()
      .toUpperCase();
  }

  function gerarChaveCusto(tipo, setor, pacote, nomeCusto) {
    return normalizarTexto(tipo) + '|||' + normalizarTexto(setor) + '|||' + normalizarTexto(pacote) + '|||' + normalizarTexto(nomeCusto);
  }

  function extrairDadosAba(aba, tipoPadrao) {
    if (!aba) return;
    const dataRange = aba.getDataRange();
    const valores = dataRange.getValues();
    if (!valores || valores.length <= 1) return;

    for (let i = 1; i < valores.length; i++) {
      const row = valores[i];
      const id = String(row[0] || '').trim();
      const tipo = String(row[2] || tipoPadrao).trim().toUpperCase();
      const setor = String(row[3] || '').trim();
      const pacote = String(row[4] || '').trim();
      const nomeCusto = String(row[5] || '').trim();

      // Pula linhas sem nome de custo
      if (!nomeCusto) continue;

      const meses = [];
      for (let j = 6; j < 18; j++) {
        let val = parseFloat(row[j]);
        meses.push(isNaN(val) ? '0.00' : val.toFixed(2));
      }
      
      let total = parseFloat(row[18]);
      if (isNaN(total)) {
        total = meses.reduce((acc, curr) => acc + parseFloat(curr), 0);
      }

      const chave = gerarChaveCusto(tipo, setor, pacote, nomeCusto);
      const registro = {
        id: id || ('ID_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)),
        tipo: tipo,
        setor: setor,
        pacote: pacote,
        nomeCusto: nomeCusto,
        meses: meses,
        total: total,
        isSaved: false
      };

      // Trava contra duplicidades na leitura: se já existir, atualiza com a ocorrência mais recente
      if (mapIndices[chave] !== undefined) {
        dados[mapIndices[chave]] = registro;
      } else {
        mapIndices[chave] = dados.length;
        dados.push(registro);
      }
    }
  }

  extrairDadosAba(abaOpex, 'OPEX');
  extrairDadosAba(abaCapex, 'CAPEX');

  return dados;
}

/**
 * Salva ou atualiza os lançamentos de custos nas abas correspondentes (OPEX_Dados ou CAPEX_Dados).
 * TRAVA ANTI-DUPLICAÇÃO:
 * Se já existir registro para o mesmo Setor + Pacote + Nome do Custo (ou mesmo ID),
 * substitui a linha existente diretamente na planilha, evitando qualquer duplicidade.
 */
function salvarCustos(dados) {
  if (!dados || !Array.isArray(dados) || dados.length === 0) {
    return { success: false, message: "Nenhum dado recebido para salvar." };
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const abaOpex = ss.getSheetByName('OPEX_Dados');
  const abaCapex = ss.getSheetByName('CAPEX_Dados');
  const dataAtual = new Date();

  function normalizarTexto(str) {
    return String(str || '')
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, ' ')
      .trim()
      .toUpperCase();
  }

  function gerarChaveNegocio(setor, pacote, nomeCusto) {
    return normalizarTexto(setor) + '|||' + normalizarTexto(pacote) + '|||' + normalizarTexto(nomeCusto);
  }

  function processarAba(aba, listaLinhas) {
    if (!aba || listaLinhas.length === 0) return;

    const dataRange = aba.getDataRange();
    const valores = dataRange.getValues();
    
    // Mapeia tanto por ID_Sistema quanto pela Chave Composta de Negócio (Setor|Pacote|NomeCusto)
    const mapIdLinha = {};
    const mapChaveLinha = {};

    for (let i = 1; i < valores.length; i++) {
      const idExistente = String(valores[i][0] || '').trim();
      const setorExistente = valores[i][3];
      const pacoteExistente = valores[i][4];
      const nomeExistente = valores[i][5];
      const chaveExistente = gerarChaveNegocio(setorExistente, pacoteExistente, nomeExistente);
      
      const rowIndex = i + 1; // 1-based index na planilha
      if (idExistente) {
        mapIdLinha[idExistente] = rowIndex;
      }
      if (chaveExistente !== '||||||') {
        mapChaveLinha[chaveExistente] = rowIndex;
      }
    }

    const linhasParaInserir = [];

    listaLinhas.forEach(linha => {
      const nomeCustoLimpo = String(linha.nomeCusto || '').trim();
      if (!nomeCustoLimpo) return;

      const chaveLinha = gerarChaveNegocio(linha.setor, linha.pacote, nomeCustoLimpo);
      
      // Trava anti-duplicação: localiza linha existente por ID ou pela chave (Setor + Pacote + Nome)
      let rowIndex = (linha.id && mapIdLinha[linha.id]) ? mapIdLinha[linha.id] : mapChaveLinha[chaveLinha];
      
      let idFinal = linha.id;
      if (rowIndex) {
        // Se a linha já existia na planilha por chave de negócio, preserva o ID original
        const idExistenteNaPlanilha = String(valores[rowIndex - 1][0] || '').trim();
        if (idExistenteNaPlanilha) {
          idFinal = idExistenteNaPlanilha;
        }
      } else {
        if (!idFinal) {
          idFinal = 'ID_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        }
      }

      const rowData = [
        idFinal,
        dataAtual,
        linha.tipo,
        linha.setor,
        linha.pacote,
        nomeCustoLimpo,
        parseFloat(linha.meses[0]) || 0,
        parseFloat(linha.meses[1]) || 0,
        parseFloat(linha.meses[2]) || 0,
        parseFloat(linha.meses[3]) || 0,
        parseFloat(linha.meses[4]) || 0,
        parseFloat(linha.meses[5]) || 0,
        parseFloat(linha.meses[6]) || 0,
        parseFloat(linha.meses[7]) || 0,
        parseFloat(linha.meses[8]) || 0,
        parseFloat(linha.meses[9]) || 0,
        parseFloat(linha.meses[10]) || 0,
        parseFloat(linha.meses[11]) || 0,
        parseFloat(linha.total) || 0
      ];

      if (rowIndex) {
        // ATUALIZA A LINHA EXISTENTE (substitui sem duplicar)
        aba.getRange(rowIndex, 1, 1, rowData.length).setValues([rowData]);
      } else {
        // INSERE NOVA LINHA
        linhasParaInserir.push(rowData);
        const novoRowIndex = aba.getLastRow() + linhasParaInserir.length;
        mapIdLinha[idFinal] = novoRowIndex;
        mapChaveLinha[chaveLinha] = novoRowIndex;
      }
    });

    if (linhasParaInserir.length > 0) {
      aba.getRange(aba.getLastRow() + 1, 1, linhasParaInserir.length, 19).setValues(linhasParaInserir);
    }
  }

  const linhasOpex = dados.filter(d => String(d.tipo).toUpperCase() === 'OPEX');
  const linhasCapex = dados.filter(d => String(d.tipo).toUpperCase() === 'CAPEX');

  processarAba(abaOpex, linhasOpex);
  processarAba(abaCapex, linhasCapex);

  return { success: true, message: "Dados sincronizados com sucesso na planilha sem duplicidade!" };
}

/**
 * Obtém dados da aba 'Importacao' para um setor e tipo específicos.
 */
function obterDadosImportacao(setorFiltro, tipoFiltro) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const aba = ss.getSheetByName('Importacao');
  if (!aba) return [];

  const valores = aba.getDataRange().getValues();
  if (valores.length <= 1) return [];

  const dadosFormatados = [];

  for (let i = 1; i < valores.length; i++) {
    const linha = valores[i];
    const tipo = String(linha[0] || '').trim().toUpperCase();
    const setor = String(linha[1] || '').trim();
    const pacote = String(linha[2] || '').trim();
    const nomeCusto = String(linha[3] || '').trim().toUpperCase();

    if (tipo === String(tipoFiltro).trim().toUpperCase() && 
        setor.toLowerCase() === String(setorFiltro).trim().toLowerCase() && 
        nomeCusto) {
      const meses = [];
      for (let j = 4; j < 16; j++) {
        let val = parseFloat(linha[j]);
        meses.push(isNaN(val) ? '0.00' : val.toFixed(2));
      }
      dadosFormatados.push({ tipo, setor, pacote, nomeCusto, meses });
    }
  }
  return dadosFormatados;
}
