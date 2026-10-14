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

    function padronizarTexto(str) {
    if (!str) return '';
    return String(str)
      .replace(/\u00C3\u00A1|\u00C3\u00A0/gi, 'A')
      .replace(/\u00C3\u00A9|\u00C3\u00AA/gi, 'E')
      .replace(/\u00C3\u00AD|\u00C3\u00AC/gi, 'I')
      .replace(/\u00C3\u00B3|\u00C3\u00B4|\u00C3\u00B5/gi, 'O')
      .replace(/\u00C3\u00BA|\u00C3\u00BC/gi, 'U')
      .replace(/\u00C3\u00A7/gi, 'C')
      .replace(/\u00C3\u00A3/gi, 'A')
      .replace(/\u00C3\u0192/gi, 'A')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[,;–—−\-_]/g, ' ')
      .replace(/[^\w\s]/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .toUpperCase();
  }

  function normalizarTexto(str) {
    return padronizarTexto(str);
  }

  function extrairCodigoConta(str) {
    const m = String(str || '').match(/^\d+/);
    return m ? m[0] : '';
  }

  function gerarChaveCusto(tipo, setor, pacote, nomeCusto) {
    return normalizarTexto(tipo) + '|||' + normalizarTexto(setor) + '|||' + normalizarTexto(pacote) + '|||' + normalizarTexto(nomeCusto);
  }

  function gerarChaveCodigo(tipo, setor, pacote, nomeCusto) {
    const cod = extrairCodigoConta(nomeCusto);
    return cod ? (normalizarTexto(tipo) + '|||' + normalizarTexto(setor) + '|||' + normalizarTexto(pacote) + '|||COD_' + cod) : '';
  }

  function extrairDadosAba(aba, tipoPadrao) {
    if (!aba) return;
    const dataRange = aba.getDataRange();
    const valores = dataRange.getValues();
    if (!valores || valores.length <= 1) return;

    const mapChave = new Map();
    const mapCod = new Map();

    for (let i = 1; i < valores.length; i++) {
      const row = valores[i];
      const id = String(row[0] || '').trim();
      const tipo = String(row[2] || tipoPadrao).trim().toUpperCase();
      const setor = String(row[3] || '').trim();
      const pacote = String(row[4] || '').trim();
      const nomeCusto = String(row[5] || '').trim();

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
      const chaveCod = gerarChaveCodigo(tipo, setor, pacote, nomeCusto);

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

      // Trava contra duplicidades na leitura: atualiza ocorrência existente ou insere
      if (mapChave.has(chave)) {
        const idx = mapChave.get(chave);
        dados[idx] = registro;
      } else if (chaveCod && mapCod.has(chaveCod)) {
        const idx = mapCod.get(chaveCod);
        dados[idx] = registro;
      } else {
        const novoIdx = dados.length;
        dados.push(registro);
        mapChave.set(chave, novoIdx);
        if (chaveCod) mapCod.set(chaveCod, novoIdx);
      }
    }
  }

  extrairDadosAba(abaOpex, 'OPEX');
  extrairDadosAba(abaCapex, 'CAPEX');

  return dados;
}

/**
 * Salva ou atualiza os lançamentos de custos nas abas correspondentes (OPEX_Dados ou CAPEX_Dados).
 * TRAVA ANTI-DUPLICAÇÃO E SUBSTITUIÇÃO:
 * - Se já existir registro para o mesmo Setor + Pacote + Nome/Código de Custo (ou mesmo ID),
 *   substitui a linha existente diretamente na planilha com os novos valores, sem criar duplicatas.
 * - Caso existam duplicidades residuais antigas na planilha, consolida em um único registro limpo.
 */
function salvarCustos(dados) {
  if (!dados || !Array.isArray(dados) || dados.length === 0) {
    return { success: false, message: "Nenhum dado recebido para salvar." };
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const abaOpex = ss.getSheetByName('OPEX_Dados');
  const abaCapex = ss.getSheetByName('CAPEX_Dados');
  const dataAtual = new Date();

  function padronizarTexto(str) {
    if (!str) return '';
    return String(str)
      .replace(/\u00C3\u00A1|\u00C3\u00A0/gi, 'A')
      .replace(/\u00C3\u00A9|\u00C3\u00AA/gi, 'E')
      .replace(/\u00C3\u00AD|\u00C3\u00AC/gi, 'I')
      .replace(/\u00C3\u00B3|\u00C3\u00B4|\u00C3\u00B5/gi, 'O')
      .replace(/\u00C3\u00BA|\u00C3\u00BC/gi, 'U')
      .replace(/\u00C3\u00A7/gi, 'C')
      .replace(/\u00C3\u00A3/gi, 'A')
      .replace(/\u00C3\u0192/gi, 'A')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[,;–—−\-_]/g, ' ')
      .replace(/[^\w\s]/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .toUpperCase();
  }

  function normalizarTexto(str) {
    return padronizarTexto(str);
  }

  function extrairCodigoConta(str) {
    const m = String(str || '').match(/^\d+/);
    return m ? m[0] : '';
  }

  function gerarChaveNegocio(setor, pacote, nomeCusto) {
    return normalizarTexto(setor) + '|||' + normalizarTexto(pacote) + '|||' + normalizarTexto(nomeCusto);
  }

  function gerarChaveCodigo(setor, pacote, nomeCusto) {
    const cod = extrairCodigoConta(nomeCusto);
    return cod ? (normalizarTexto(setor) + '|||' + normalizarTexto(pacote) + '|||COD_' + cod) : '';
  }

  function processarAba(aba, listaLinhas) {
    if (!aba) return;

    const dataRange = aba.getDataRange();
    const valores = dataRange.getValues();
    
    // Mapeamento dos IDs existentes na planilha para preservar identificadores estáveis
    const mapIdExistente = new Map();
    const mapChaveExistente = new Map();

    for (let i = 1; i < valores.length; i++) {
      const row = valores[i];
      const idExistente = String(row[0] || '').trim();
      const setorExistente = row[3];
      const pacoteExistente = row[4];
      const nomeExistente = row[5];
      if (!nomeExistente) continue;

      const chave = gerarChaveNegocio(setorExistente, pacoteExistente, nomeExistente);
      const chaveCod = gerarChaveCodigo(setorExistente, pacoteExistente, nomeExistente);

      if (idExistente && !mapIdExistente.has(idExistente)) {
        mapIdExistente.set(idExistente, idExistente);
      }
      if (!mapChaveExistente.has(chave)) {
        mapChaveExistente.set(chave, idExistente);
      }
      if (chaveCod && !mapChaveExistente.has(chaveCod)) {
        mapChaveExistente.set(chaveCod, idExistente);
      }
    }

    // Monta a nova lista de linhas a partir do que está atualmente ativo na interface
    // TRAVA ANTI-DUPLICAÇÃO: Deduplica por chave composta única
    const mapLinhasFinais = new Map();

    listaLinhas.forEach(linha => {
      const nomeCustoLimpo = String(linha.nomeCusto || '').trim();
      if (!nomeCustoLimpo) return;

      const chaveLinha = gerarChaveNegocio(linha.setor, linha.pacote, nomeCustoLimpo);
      const chaveCodLinha = gerarChaveCodigo(linha.setor, linha.pacote, nomeCustoLimpo);

      const mesesVals = [];
      for (let m = 0; m < 12; m++) {
        mesesVals.push(parseFloat(linha.meses[m]) || 0);
      }
      const totalVal = parseFloat(linha.total) || mesesVals.reduce((acc, curr) => acc + curr, 0);

      // Preserva ID se já existia na planilha ou gera um novo ID estável
      let idFinal = linha.id || '';
      if (!idFinal || !mapIdExistente.has(idFinal)) {
        if (mapChaveExistente.has(chaveLinha)) {
          idFinal = mapChaveExistente.get(chaveLinha);
        } else if (chaveCodLinha && mapChaveExistente.has(chaveCodLinha)) {
          idFinal = mapChaveExistente.get(chaveCodLinha);
        }
      }
      if (!idFinal) {
        idFinal = 'ID_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      }

      const registroFormatado = [
        idFinal,
        dataAtual,
        linha.tipo,
        linha.setor,
        linha.pacote,
        nomeCustoLimpo,
        ...mesesVals,
        totalVal
      ];

      // Atualiza ou insere na coleção final única
      mapLinhasFinais.set(chaveLinha, registroFormatado);
    });

    const linhasFinais = Array.from(mapLinhasFinais.values());
    const totalLinhasPlanilha = aba.getLastRow();

    if (linhasFinais.length > 0) {
      // Grava em lote na planilha a partir da linha 2
      aba.getRange(2, 1, linhasFinais.length, 19).setValues(linhasFinais);

      // Limpa linhas excedentes antigas (ex: pacotes ou custos excluídos)
      if (totalLinhasPlanilha > linhasFinais.length + 1) {
        const qtdExcesso = totalLinhasPlanilha - (linhasFinais.length + 1);
        aba.getRange(linhasFinais.length + 2, 1, qtdExcesso, 19).clearContent();
      }
    } else if (totalLinhasPlanilha > 1) {
      // Se não sobrou nenhum lançamento ativo, limpa toda a aba a partir da linha 2
      aba.getRange(2, 1, totalLinhasPlanilha - 1, 19).clearContent();
    }
  }

  const linhasOpex = dados.filter(d => String(d.tipo).toUpperCase() === 'OPEX');
  const linhasCapex = dados.filter(d => String(d.tipo).toUpperCase() === 'CAPEX');

  processarAba(abaOpex, linhasOpex);
  processarAba(abaCapex, linhasCapex);

  return { success: true, message: "Dados sincronizados com sucesso na planilha sem duplicidade!" };
}

/**
 * Salva ou atualiza os lançamentos de um ÚNICO setor na aba correspondente (OPEX_Dados ou CAPEX_Dados).
 * ENVIO INDIVIDUAL POR SETOR:
 * - Localiza a aba correta (OPEX_Dados ou CAPEX_Dados).
 * - Preserva integralmente os lançamentos de TODOS os outros setores.
 * - Para o setor especificado, substitui suas linhas pelos novos dados enviados,
 *   garantindo que se um pacote/linha foi removido desse setor, ele é removido da planilha.
 * - Deduplica e grava em lote, limpando qualquer excesso no final da planilha.
 */
function salvarCustosSetor(tipo, setor, dadosSetor) {
  if (!tipo || !setor) {
    return { success: false, message: "Tipo ou Setor não especificados." };
  }
  dadosSetor = dadosSetor || [];

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const nomeAba = String(tipo).toUpperCase() === 'OPEX' ? 'OPEX_Dados' : 'CAPEX_Dados';
  const aba = ss.getSheetByName(nomeAba);
  if (!aba) {
    return { success: false, message: "Aba " + nomeAba + " não encontrada na planilha." };
  }

  const dataAtual = new Date();

  function padronizarTexto(str) {
    if (!str) return '';
    return String(str)
      .replace(/\u00C3\u00A1|\u00C3\u00A0/gi, 'A')
      .replace(/\u00C3\u00A9|\u00C3\u00AA/gi, 'E')
      .replace(/\u00C3\u00AD|\u00C3\u00AC/gi, 'I')
      .replace(/\u00C3\u00B3|\u00C3\u00B4|\u00C3\u00B5/gi, 'O')
      .replace(/\u00C3\u00BA|\u00C3\u00BC/gi, 'U')
      .replace(/\u00C3\u00A7/gi, 'C')
      .replace(/\u00C3\u00A3/gi, 'A')
      .replace(/\u00C3\u0192/gi, 'A')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[,;–—−\-_]/g, ' ')
      .replace(/[^\w\s]/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .toUpperCase();
  }

  function normalizarTexto(str) {
    return padronizarTexto(str);
  }

  function extrairCodigoConta(str) {
    const m = String(str || '').match(/^\d+/);
    return m ? m[0] : '';
  }

  function gerarChaveNegocio(sSetor, sPacote, sNomeCusto) {
    return normalizarTexto(sSetor) + '|||' + normalizarTexto(sPacote) + '|||' + normalizarTexto(sNomeCusto);
  }

  function gerarChaveCodigo(sSetor, sPacote, sNomeCusto) {
    const cod = extrairCodigoConta(sNomeCusto);
    return cod ? (normalizarTexto(sSetor) + '|||' + normalizarTexto(sPacote) + '|||COD_' + cod) : '';
  }

  const setorAlvoNorm = normalizarTexto(setor);
  const dataRange = aba.getDataRange();
  const valores = dataRange.getValues();

  // 1. Separa linhas que pertencem a OUTROS setores (permanecem intactas)
  // e mapeia linhas existentes do setor alvo para preservar identificadores estáveis
  const linhasOutrosSetores = [];
  const mapIdExistenteSetor = new Map();
  const mapChaveExistenteSetor = new Map();

  for (let i = 1; i < valores.length; i++) {
    const row = valores[i];
    const setorRow = String(row[3] || '').trim();
    const nomeCustoRow = String(row[5] || '').trim();
    if (!nomeCustoRow) continue;

    if (normalizarTexto(setorRow) !== setorAlvoNorm) {
      linhasOutrosSetores.push(row);
    } else {
      const idExistente = String(row[0] || '').trim();
      const pacoteRow = String(row[4] || '').trim();
      const chave = gerarChaveNegocio(setorRow, pacoteRow, nomeCustoRow);
      const chaveCod = gerarChaveCodigo(setorRow, pacoteRow, nomeCustoRow);

      if (idExistente && !mapIdExistenteSetor.has(idExistente)) {
        mapIdExistenteSetor.set(idExistente, idExistente);
      }
      if (!mapChaveExistenteSetor.has(chave)) {
        mapChaveExistenteSetor.set(chave, idExistente);
      }
      if (chaveCod && !mapChaveExistenteSetor.has(chaveCod)) {
        mapChaveExistenteSetor.set(chaveCod, idExistente);
      }
    }
  }

  // 2. Monta as novas linhas do setor alvo enviadas da interface (deduplicadas)
  const mapLinhasNovasSetor = new Map();

  dadosSetor.forEach(linha => {
    const nomeCustoLimpo = String(linha.nomeCusto || '').trim();
    if (!nomeCustoLimpo) return;

    const chaveLinha = gerarChaveNegocio(setor, linha.pacote, nomeCustoLimpo);
    const chaveCodLinha = gerarChaveCodigo(setor, linha.pacote, nomeCustoLimpo);

    const mesesVals = [];
    for (let m = 0; m < 12; m++) {
      mesesVals.push(parseFloat(linha.meses[m]) || 0);
    }
    const totalVal = parseFloat(linha.total) || mesesVals.reduce((acc, curr) => acc + curr, 0);

    let idFinal = linha.id || '';
    if (!idFinal || !mapIdExistenteSetor.has(idFinal)) {
      if (mapChaveExistenteSetor.has(chaveLinha)) {
        idFinal = mapChaveExistenteSetor.get(chaveLinha);
      } else if (chaveCodLinha && mapChaveExistenteSetor.has(chaveCodLinha)) {
        idFinal = mapChaveExistenteSetor.get(chaveCodLinha);
      }
    }
    if (!idFinal) {
      idFinal = 'ID_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    const registroFormatado = [
      idFinal,
      dataAtual,
      tipo,
      setor,
      linha.pacote,
      nomeCustoLimpo,
      ...mesesVals,
      totalVal
    ];

    mapLinhasNovasSetor.set(chaveLinha, registroFormatado);
  });

  const linhasNovasDesteSetor = Array.from(mapLinhasNovasSetor.values());

  // 3. Junta as linhas dos outros setores com as linhas atualizadas deste setor
  const todasLinhasFinais = linhasOutrosSetores.concat(linhasNovasDesteSetor);
  const totalLinhasPlanilha = aba.getLastRow();

  if (todasLinhasFinais.length > 0) {
    aba.getRange(2, 1, todasLinhasFinais.length, 19).setValues(todasLinhasFinais);

    if (totalLinhasPlanilha > todasLinhasFinais.length + 1) {
      const qtdExcesso = totalLinhasPlanilha - (todasLinhasFinais.length + 1);
      aba.getRange(todasLinhasFinais.length + 2, 1, qtdExcesso, 19).clearContent();
    }
  } else if (totalLinhasPlanilha > 1) {
    aba.getRange(2, 1, totalLinhasPlanilha - 1, 19).clearContent();
  }

  return { success: true, message: "Setor " + setor + " salvo com sucesso na planilha!" };
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
