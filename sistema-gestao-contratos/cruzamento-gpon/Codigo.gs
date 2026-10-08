/**
 * =========================================================================================
 * GOOGLE APPS SCRIPT: CRUZAMENTO E TRATAMENTO DE DADOS DE SITES GPON
 * PROJETO: SISTEMA DE GESTÃO DE CONTRATOS - ORÇAMENTO FPA
 * =========================================================================================
 * 
 * Descrição:
 * Este script automatiza o cruzamento de dados de planilhas de origem, filtrando os sites únicos
 * a partir da Planilha 01 (DEMANDAS COMPRAS - NEGOCIAÇÕES GPON, Coluna C), buscando o STATUS na
 * planilha VISTORIA DE SITES (aba DASH) e as informações complementares nas Planilhas 02 e 03
 * com lógica de fallback em cascata.
 * 
 * Regras de Negócio:
 * 1. Base Primária: Sites únicos extraídos da Planilha 01 (Coluna C).
 * 2. Coluna STATUS: Comparação entre o Site (Coluna C da P1) e a Coluna A da planilha VISTORIA
 *    DE SITES (aba DASH). Caso haja correspondência, obtém o STATUS da Coluna C. Se não constar,
 *    marca como "NÃO ENCONTRADO".
 * 3. Busca em Cascata: Se um dado operacional/financeiro estiver em branco na Planilha 01, busca
 *    na Planilha 02. Se ainda estiver em branco, busca na Planilha 03.
 * 4. Fallback Geral: Qualquer campo não localizado após consulta recebe "NÃO ENCONTRADO".
 * 5. Padronização: Todos os textos gerados na planilha destino são convertidos para MAIÚSCULAS.
 * 6. Destino: Gravação formatada na aba "Links - Tratados" da Planilha de Destino.
 * 
 * Planilhas Envolvidas:
 * - Planilha 01: 1-f3NXFp4rCGhhBHgkf0hPq2e_93hFTNRHpM-f37Rra4 (Aba: NEGOCIAÇÕES GPON)
 * - VISTORIA DE SITES: 1CmuhQSiBPeYmMpi0hn2RfpCQRRjFBa8bs52v0Dt_vIc (Aba: DASH / GID: 1376772865)
 * - Planilha 02: 1uelDTBNV-cVVqTjBIK0BxfyGs4EPi-WzRL1Vh8ne56g (Filtro Operacional / GID 0)
 * - Planilha 03: 16VUOaCDOYX634ZzsIWGySGQZGciOeVdLLB3x6FOp1IQ (GID: 7198436)
 * - Planilha Destino: 1HUIi3NBEp4N-fJqByEKC_ZFRAqMi82sVk670ry0MZ6I (Aba: Links - Tratados)
 * =========================================================================================
 */

// ==========================================
// 1. CONFIGURAÇÕES GERAIS DAS PLANILHAS
// ==========================================
const CONFIG_GPON = {
  PLANILHA_1: {
    ID: '1-f3NXFp4rCGhhBHgkf0hPq2e_93hFTNRHpM-f37Rra4',
    NOME_ABA: 'NEGOCIAÇÕES GPON',
    COLUNA_SITE_INDEX: 2 // Coluna C (0=A, 1=B, 2=C)
  },
  PLANILHA_VISTORIA: {
    ID: '1CmuhQSiBPeYmMpi0hn2RfpCQRRjFBa8bs52v0Dt_vIc',
    NOME_ABA: 'DASH',
    GID: '1376772865',
    COLUNA_SITE_INDEX: 0,   // Coluna A (0=A)
    COLUNA_STATUS_INDEX: 2  // Coluna C (2=C)
  },
  PLANILHA_2: {
    ID: '1uelDTBNV-cVVqTjBIK0BxfyGs4EPi-WzRL1Vh8ne56g',
    NOME_ABA: '', // Vazio = busca por GID ou 1ª aba
    GID: '0'
  },
  PLANILHA_3: {
    ID: '16VUOaCDOYX634ZzsIWGySGQZGciOeVdLLB3x6FOp1IQ',
    NOME_ABA: '',
    GID: '7198436' // GID informado
  },
  DESTINO: {
    ID: '1HUIi3NBEp4N-fJqByEKC_ZFRAqMi82sVk670ry0MZ6I',
    NOME_ABA: 'Links - Tratados',
    GID: '1200272248'
  },
  VALOR_PADRAO_NAO_ENCONTRADO: 'NÃO ENCONTRADO',
  
  // Ordem oficial das 13 colunas na planilha de destino
  COLUNAS_SOLICITADAS: [
    'SITES',
    'STATUS',
    'POPULAÇÃO',
    'MÊS DE ATIVAÇÃO',
    'FORNECEDOR',
    'TIPO DE ATENDIMENTO',
    'PLANO CONTRATADO',
    'VALOR DA CONTRATAÇÃO',
    'TAXA DE INSTALAÇÃO',
    'VALOR INSTALAÇÃO',
    'DATA DE ATIVAÇÃO',
    'DATA ASSINATURA DO CONTRATO',
    'VIGÊNCIA DO CONTRATO'
  ]
};

// ==========================================
// 2. DICIONÁRIO DE SINÔNIMOS (REGEX TOLERANTE)
// ==========================================
const CAMPOS_MAP_GPON = {
  'SITES': [
    /^sites?$/i, /^id[\s_-]?site$/i, /^esta[cç][aã]o$/i, /^c[oó]digo[\s_-]?site$/i, /^nome[\s_-]?site$/i
  ],
  'STATUS': [
    /^status$/i, /^situa[cç][aã]o$/i, /^status[\s_-]?site$/i, /^status[\s_-]?vistoria$/i
  ],
  'POPULAÇÃO': [
    /^popula[cç][aã]o$/i, /^habitantes$/i, /^pop$/i, /^qtd[\s_-]?popula[cç][aã]o$/i
  ],
  'MÊS DE ATIVAÇÃO': [
    /^m[eê]s[\s_-]?(de[\s_-]?)?ativa[cç][aã]o$/i, /^m[eê]s[\s_-]?(de[\s_-]?)?previs[aã]o$/i,
    /^previs[aã]o[\s_-]?(de[\s_-]?)?ativa[cç][aã]o$/i, /^m[eê]s$/i
  ],
  'FORNECEDOR': [
    /^fornecedor$/i, /^operadora$/i, /^provedor$/i, /^prestador(a)?$/i, /^parceiro$/i, /^empresa$/i,
    /^fornecedor[\s/_-]+operadora$/i
  ],
  'TIPO DE ATENDIMENTO': [
    /^tipo[\s_-]?(de[\s_-]?)?atendimento$/i, /^tipo[\s_-]?atend\.?$/i, /^tipo[\s_-]?(de[\s_-]?)?acesso$/i,
    /^tecnologia$/i, /^meio[\s_-]?(de[\s_-]?)?acesso$/i, /^tipo$/i
  ],
  'PLANO CONTRATADO': [
    /^plano[\s_-]?contratado$/i, /^plano$/i, /^velocidade$/i, /^banda$/i, /^capacidade$/i, /^circuito$/i,
    /^megas?$/i, /^link$/i
  ],
  'VALOR DA CONTRATAÇÃO': [
    /^valor[\s_-]?(da[\s_-]?)?contrata[cç][aã]o$/i, /^valor[\s_-]?mensal$/i, /^mensalidade$/i,
    /^mrc$/i, /^valor[\s_-]?link$/i, /^valor[\s_-]?\(r\$\)$/i, /^valor$/i
  ],
  'TAXA DE INSTALAÇÃO': [
    /^taxa[\s_-]?(de[\s_-]?)?instala[cç][aã]o$/i, /^tem[\s_-]?taxa$/i, /^isento$/i, /^taxa$/i
  ],
  'VALOR INSTALAÇÃO': [
    /^valor[\s_-]?(da[\s_-]?)?instala[cç][aã]o$/i, /^valor[\s_-]?taxa$/i, /^otc$/i,
    /^custo[\s_-]?(de[\s_-]?)?instala[cç][aã]o$/i
  ],
  'DATA DE ATIVAÇÃO': [
    /^data[\s_-]?(de[\s_-]?)?ativa[cç][aã]o$/i, /^dt[\s_-]?ativa[cç][aã]o$/i, /^data[\s_-]?ativado$/i,
    /^ativado[\s_-]?em$/i, /^dt[\s_-]?ativ\.?$/i
  ],
  'DATA ASSINATURA DO CONTRATO': [
    /^data[\s_-]?(da[\s_-]?)?assinatura([\s_-]?do[\s_-]?contrato)?$/i, /^dt[\s_-]?assinatura$/i,
    /^data[\s_-]?contrato$/i, /^assinatura[\s_-]?contrato$/i, /^assinatura$/i
  ],
  'VIGÊNCIA DO CONTRATO': [
    /^vig[eê]ncia([\s_-]?do[\s_-]?contrato)?$/i, /^prazo([\s_-]?do[\s_-]?contrato)?$/i,
    /^prazo[\s_-]?vig[eê]ncia$/i, /^tempo[\s_-]?contrato$/i, /^vig[eê]ncia[\s_-]?\(meses\)$/i
  ]
};

// ==========================================
// 3. MENU PERSONALIZADO NO GOOGLE SHEETS
// ==========================================
function onOpen() {
  adicionarMenuGPON();
}

function adicionarMenuGPON() {
  try {
    SpreadsheetApp.getUi()
      .createMenu('🚀 Integração GPON')
      .addItem('🔄 Cruzar e Atualizar Dados', 'cruzarDadosPlanilhas')
      .addSeparator()
      .addItem('🔍 Diagnosticar Colunas das Planilhas', 'diagnosticarPlanilhas')
      .addToUi();
  } catch(e) {}
}

// ==========================================
// 4. MOTOR PRINCIPAL DE PROCESSAMENTO
// ==========================================
function cruzarDadosPlanilhas() {
  const tempoInicio = new Date();
  Logger.log('>>> [INÍCIO] Cruzamento de dados GPON...');

  // -------------------------------------------------------------
  // ETAPA 1: Planilha 01 - Extração dos SITES ÚNICOS (Coluna C)
  // -------------------------------------------------------------
  const ss1 = abrirPlanilhaSegura(CONFIG_GPON.PLANILHA_1.ID, 'Planilha 01 (DEMANDAS COMPRAS)');
  const aba1 = obterAbaPorNomeOuIndice(ss1, CONFIG_GPON.PLANILHA_1.NOME_ABA, 0);
  const dados1 = aba1.getDataRange().getValues();

  if (dados1.length < 2) {
    throw new Error('A Planilha 01 (NEGOCIAÇÕES GPON) não possui linhas de dados suficientes.');
  }

  const infoHeader1 = detectarCabecalho(dados1);
  const mapaColunas1 = mapearIndicesColunas(infoHeader1.headers);
  const colSiteIndexP1 = CONFIG_GPON.PLANILHA_1.COLUNA_SITE_INDEX;

  const sitesUnicosList = [];
  const dadosConsolidados = new Map();

  for (let r = infoHeader1.rowIndex + 1; r < dados1.length; r++) {
    const row = dados1[r];
    const rawSite = row[colSiteIndexP1];
    const siteKey = normalizarChave(rawSite);

    if (!siteKey) continue;

    if (!dadosConsolidados.has(siteKey)) {
      sitesUnicosList.push(siteKey);
      dadosConsolidados.set(siteKey, {
        SITES: String(rawSite).trim().toUpperCase()
      });
    }

    const reg = dadosConsolidados.get(siteKey);
    preencherCamposDaLinha(reg, row, mapaColunas1);
  }

  Logger.log(`[ETAPA 1] Sites únicos extraídos da Planilha 01: ${sitesUnicosList.length}`);

  // -------------------------------------------------------------
  // ETAPA 2: Planilha VISTORIA DE SITES - Busca da Coluna STATUS
  // Compara Coluna C de Demandas Compras com Coluna A da aba DASH,
  // pegando o STATUS da Coluna C de Vistoria de Sites.
  // -------------------------------------------------------------
  try {
    const ssVistoria = abrirPlanilhaSegura(CONFIG_GPON.PLANILHA_VISTORIA.ID, 'Planilha VISTORIA DE SITES');
    const abaVistoria = obterAbaPorGidOuNome(ssVistoria, CONFIG_GPON.PLANILHA_VISTORIA.GID, CONFIG_GPON.PLANILHA_VISTORIA.NOME_ABA);
    const dadosVistoria = abaVistoria.getDataRange().getValues();

    if (dadosVistoria.length >= 2) {
      const infoHeaderVistoria = detectarCabecalho(dadosVistoria);
      const colSiteVistoria = CONFIG_GPON.PLANILHA_VISTORIA.COLUNA_SITE_INDEX;
      const colStatusVistoria = CONFIG_GPON.PLANILHA_VISTORIA.COLUNA_STATUS_INDEX;

      let statusEncontrados = 0;
      for (let r = infoHeaderVistoria.rowIndex + 1; r < dadosVistoria.length; r++) {
        const row = dadosVistoria[r];
        const siteKey = normalizarChave(row[colSiteVistoria]);

        if (siteKey && dadosConsolidados.has(siteKey)) {
          const rawStatus = row[colStatusVistoria];
          if (rawStatus !== null && rawStatus !== undefined && String(rawStatus).trim() !== '') {
            const reg = dadosConsolidados.get(siteKey);
            // Preenche se ainda não tiver status definido
            if (!reg.STATUS || reg.STATUS === CONFIG_GPON.VALOR_PADRAO_NAO_ENCONTRADO) {
              reg.STATUS = String(rawStatus).trim().toUpperCase();
              statusEncontrados++;
            }
          }
        }
      }
      Logger.log(`[ETAPA 2 - VISTORIA] STATUS vinculado para ${statusEncontrados} sites.`);
    }
  } catch (errVistoria) {
    Logger.log(`[AVISO ETAPA 2 - VISTORIA] Erro na planilha VISTORIA DE SITES: ${errVistoria.message}`);
  }

  // -------------------------------------------------------------
  // ETAPA 3: Cruzar com Planilha 02 (Operacional / Ativação)
  // -------------------------------------------------------------
  try {
    const ss2 = abrirPlanilhaSegura(CONFIG_GPON.PLANILHA_2.ID, 'Planilha 02');
    const aba2 = obterAbaPorGidOuNome(ss2, CONFIG_GPON.PLANILHA_2.GID, CONFIG_GPON.PLANILHA_2.NOME_ABA);
    const dados2 = aba2.getDataRange().getValues();

    if (dados2.length >= 2) {
      const infoHeader2 = detectarCabecalho(dados2);
      const mapaColunas2 = mapearIndicesColunas(infoHeader2.headers);
      const colSiteIndexP2 = mapaColunas2['SITES'];

      if (colSiteIndexP2 !== undefined) {
        for (let r = infoHeader2.rowIndex + 1; r < dados2.length; r++) {
          const row = dados2[r];
          const siteKey = normalizarChave(row[colSiteIndexP2]);
          if (siteKey && dadosConsolidados.has(siteKey)) {
            const reg = dadosConsolidados.get(siteKey);
            preencherCamposDaLinha(reg, row, mapaColunas2);
          }
        }
        Logger.log('[ETAPA 3] Cruzamento com Planilha 02 concluído.');
      }
    }
  } catch (errP2) {
    Logger.log(`[AVISO ETAPA 3] Erro na Planilha 02: ${errP2.message}`);
  }

  // -------------------------------------------------------------
  // ETAPA 4: Cruzar com Planilha 03 (Contratos / Finanças - GID 7198436)
  // -------------------------------------------------------------
  try {
    const ss3 = abrirPlanilhaSegura(CONFIG_GPON.PLANILHA_3.ID, 'Planilha 03');
    const aba3 = obterAbaPorGidOuNome(ss3, CONFIG_GPON.PLANILHA_3.GID, CONFIG_GPON.PLANILHA_3.NOME_ABA);
    const dados3 = aba3.getDataRange().getValues();

    if (dados3.length >= 2) {
      const infoHeader3 = detectarCabecalho(dados3);
      const mapaColunas3 = mapearIndicesColunas(infoHeader3.headers);
      const colSiteIndexP3 = mapaColunas3['SITES'];

      if (colSiteIndexP3 !== undefined) {
        for (let r = infoHeader3.rowIndex + 1; r < dados3.length; r++) {
          const row = dados3[r];
          const siteKey = normalizarChave(row[colSiteIndexP3]);
          if (siteKey && dadosConsolidados.has(siteKey)) {
            const reg = dadosConsolidados.get(siteKey);
            preencherCamposDaLinha(reg, row, mapaColunas3);
          }
        }
        Logger.log('[ETAPA 4] Cruzamento com Planilha 03 concluído.');
      }
    }
  } catch (errP3) {
    Logger.log(`[AVISO ETAPA 4] Erro na Planilha 03: ${errP3.message}`);
  }

  // -------------------------------------------------------------
  // ETAPA 5: Tratamento, Padronização em MAIÚSCULAS e Fallback Geral
  // -------------------------------------------------------------
  const matrizDestino = [];

  for (const siteKey of sitesUnicosList) {
    const reg = dadosConsolidados.get(siteKey);
    const linhaTratada = CONFIG_GPON.COLUNAS_SOLICITADAS.map(nomeColuna => {
      const valorBruto = reg[nomeColuna];
      return tratarValorPadronizado(nomeColuna, valorBruto);
    });
    matrizDestino.push(linhaTratada);
  }

  Logger.log(`[ETAPA 5] Matriz final tratada montada com ${matrizDestino.length} registros e ${CONFIG_GPON.COLUNAS_SOLICITADAS.length} colunas.`);

  // -------------------------------------------------------------
  // ETAPA 6: Gravação na Planilha Destino ("Links - Tratados")
  // -------------------------------------------------------------
  gravarPlanilhaDestino(matrizDestino);

  const tempoTotal = ((new Date() - tempoInicio) / 1000).toFixed(1);
  const msgSucesso = `Cruzamento finalizado com sucesso!\n\n` +
                     `• Total de Sites Únicos processados: ${matrizDestino.length}\n` +
                     `• Total de Colunas geradas: ${CONFIG_GPON.COLUNAS_SOLICITADAS.length}\n` +
                     `• Coluna Nova: STATUS (obtida de VISTORIA DE SITES - DASH)\n` +
                     `• Tempo de execução: ${tempoTotal} segundos\n` +
                     `• Regra de Fallback: "NÃO ENCONTRADO" para campos ausentes\n` +
                     `• Padrão de texto: MAIÚSCULO em todas as colunas textuais\n` +
                     `• Destino: Aba "${CONFIG_GPON.DESTINO.NOME_ABA}" atualizada.`;

  Logger.log(msgSucesso);
  try {
    SpreadsheetApp.getUi().alert('✅ Processo Concluído', msgSucesso, SpreadsheetApp.getUi().ButtonSet.OK);
  } catch(e) {}
}

// ==========================================
// 5. TRATAMENTO, PADRONIZAÇÃO E FORMATAÇÃO
// ==========================================
function tratarValorPadronizado(nomeColuna, valor) {
  if (valor === null || valor === undefined || String(valor).trim() === '') {
    return CONFIG_GPON.VALOR_PADRAO_NAO_ENCONTRADO;
  }

  switch (nomeColuna) {
    case 'SITES':
    case 'STATUS':
      return String(valor).trim().toUpperCase();

    case 'POPULAÇÃO':
      if (typeof valor === 'number') return valor;
      const cleanPopStr = String(valor).replace(/[^\d]/g, '');
      if (!cleanPopStr) return CONFIG_GPON.VALOR_PADRAO_NAO_ENCONTRADO;
      const numPop = parseInt(cleanPopStr, 10);
      return isNaN(numPop) ? CONFIG_GPON.VALOR_PADRAO_NAO_ENCONTRADO : numPop;

    case 'VALOR DA CONTRATAÇÃO':
    case 'VALOR INSTALAÇÃO':
      if (typeof valor === 'number') return valor;
      let cleanVal = String(valor).replace(/R\$\s?/gi, '').trim();
      if (cleanVal.includes(',') && cleanVal.includes('.')) {
        cleanVal = cleanVal.replace(/\./g, '').replace(',', '.');
      } else if (cleanVal.includes(',')) {
        cleanVal = cleanVal.replace(',', '.');
      }
      const numFloat = parseFloat(cleanVal);
      return isNaN(numFloat) ? CONFIG_GPON.VALOR_PADRAO_NAO_ENCONTRADO : numFloat;

    case 'DATA DE ATIVAÇÃO':
    case 'DATA ASSINATURA DO CONTRATO':
      return formatarData(valor);

    case 'TAXA DE INSTALAÇÃO':
      const strTaxa = String(valor).trim().toUpperCase();
      if (/^(SIM|S|YES)$/i.test(strTaxa)) return 'SIM';
      if (/^(N[AÃ]O|N|NO|ISENTO)$/i.test(strTaxa)) return 'NÃO';
      return strTaxa || CONFIG_GPON.VALOR_PADRAO_NAO_ENCONTRADO;

    case 'MÊS DE ATIVAÇÃO':
      if (valor instanceof Date) {
        return Utilities.formatDate(valor, Session.getScriptTimeZone() || 'America/Sao_Paulo', 'MM/yyyy').toUpperCase();
      }
      return String(valor).trim().toUpperCase();

    case 'VIGÊNCIA DO CONTRATO':
      const strVig = String(valor).trim().toUpperCase();
      if (/^\d+$/.test(strVig)) return `${strVig} MESES`;
      return strVig;

    default:
      // FORNECEDOR, TIPO DE ATENDIMENTO, PLANO CONTRATADO
      return String(valor).trim().toUpperCase();
  }
}

function formatarData(val) {
  if (!val) return CONFIG_GPON.VALOR_PADRAO_NAO_ENCONTRADO;
  
  if (val instanceof Date) {
    if (isNaN(val.getTime())) return CONFIG_GPON.VALOR_PADRAO_NAO_ENCONTRADO;
    return Utilities.formatDate(val, Session.getScriptTimeZone() || 'America/Sao_Paulo', 'dd/MM/yyyy');
  }

  if (typeof val === 'string') {
    val = val.trim();
    if (!val) return CONFIG_GPON.VALOR_PADRAO_NAO_ENCONTRADO;
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(val)) return val;

    const matchIso = val.match(/^(\d{4})[-/](\d{2})[-/](\d{2})/);
    if (matchIso) {
      return `${matchIso[3]}/${matchIso[2]}/${matchIso[1]}`;
    }

    const d = new Date(val);
    if (!isNaN(d.getTime())) {
      return Utilities.formatDate(d, Session.getScriptTimeZone() || 'America/Sao_Paulo', 'dd/MM/yyyy');
    }
  }

  return String(val).trim().toUpperCase();
}

// ==========================================
// 6. GRAVAÇÃO NA PLANILHA DESTINO
// ==========================================
function gravarPlanilhaDestino(matrizDados) {
  const ssDestino = abrirPlanilhaSegura(CONFIG_GPON.DESTINO.ID, 'Planilha Destino');
  let abaDestino = obterAbaPorGidOuNome(ssDestino, CONFIG_GPON.DESTINO.GID, CONFIG_GPON.DESTINO.NOME_ABA);

  if (!abaDestino) {
    abaDestino = ssDestino.insertSheet(CONFIG_GPON.DESTINO.NOME_ABA);
  }

  abaDestino.clear();

  // Cabeçalho estilizado
  const cabecalhos = [CONFIG_GPON.COLUNAS_SOLICITADAS];
  const rangeHeader = abaDestino.getRange(1, 1, 1, cabecalhos[0].length);
  rangeHeader.setValues(cabecalhos)
    .setFontWeight('bold')
    .setFontColor('#FFFFFF')
    .setBackground('#1B365D')
    .setHorizontalAlignment('center')
    .setVerticalAlignment('middle');

  abaDestino.setRowHeight(1, 36);
  abaDestino.setFrozenRows(1);

  if (matrizDados.length === 0) return;

  const totalLinhas = matrizDados.length;
  const totalColunas = matrizDados[0].length;
  const rangeDados = abaDestino.getRange(2, 1, totalLinhas, totalColunas);
  rangeDados.setValues(matrizDados);
  rangeDados.setVerticalAlignment('middle');

  // Formatações Numéricas
  // Coluna 3: POPULAÇÃO
  abaDestino.getRange(2, 3, totalLinhas, 1).setNumberFormat('#,##0');
  // Coluna 8: VALOR DA CONTRATAÇÃO
  abaDestino.getRange(2, 8, totalLinhas, 1).setNumberFormat('"R$"\\ #,##0.00');
  // Coluna 10: VALOR INSTALAÇÃO
  abaDestino.getRange(2, 10, totalLinhas, 1).setNumberFormat('"R$"\\ #,##0.00');

  // Alinhamentos Visuais
  abaDestino.getRange(2, 1, totalLinhas, 1).setHorizontalAlignment('left');    // 1: SITES
  abaDestino.getRange(2, 2, totalLinhas, 1).setHorizontalAlignment('center');  // 2: STATUS
  abaDestino.getRange(2, 3, totalLinhas, 1).setHorizontalAlignment('right');   // 3: POPULAÇÃO
  abaDestino.getRange(2, 4, totalLinhas, 1).setHorizontalAlignment('center');  // 4: MÊS DE ATIVAÇÃO
  abaDestino.getRange(2, 5, totalLinhas, 3).setHorizontalAlignment('left');    // 5,6,7: FORNECEDOR, ATENDIMENTO, PLANO
  abaDestino.getRange(2, 8, totalLinhas, 1).setHorizontalAlignment('right');   // 8: VALOR DA CONTRATAÇÃO
  abaDestino.getRange(2, 9, totalLinhas, 1).setHorizontalAlignment('center');  // 9: TAXA DE INSTALAÇÃO
  abaDestino.getRange(2, 10, totalLinhas, 1).setHorizontalAlignment('right');  // 10: VALOR INSTALAÇÃO
  abaDestino.getRange(2, 11, totalLinhas, 3).setHorizontalAlignment('center'); // 11,12,13: DATAS E VIGÊNCIA

  for (let c = 1; c <= totalColunas; c++) {
    abaDestino.autoResizeColumn(c);
  }
}

// ==========================================
// 7. FUNÇÕES AUXILIARES
// ==========================================
function preencherCamposDaLinha(objetoDestino, row, mapaColunas) {
  for (const campo of CONFIG_GPON.COLUNAS_SOLICITADAS) {
    if (campo === 'SITES' || campo === 'STATUS') continue; // Tratados de forma específica
    
    const jaPossuiValor = objetoDestino[campo] !== undefined && 
                          objetoDestino[campo] !== null && 
                          String(objetoDestino[campo]).trim() !== '';

    if (!jaPossuiValor) {
      const colIdx = mapaColunas[campo];
      if (colIdx !== undefined && colIdx < row.length) {
        const val = row[colIdx];
        if (val !== null && val !== undefined && String(val).trim() !== '') {
          objetoDestino[campo] = val;
        }
      }
    }
  }
}

function detectarCabecalho(matriz) {
  for (let r = 0; r < Math.min(5, matriz.length); r++) {
    const row = matriz[r];
    for (let c = 0; c < row.length; c++) {
      const cellText = String(row[c]).trim().toLowerCase();
      if (/site|fornecedor|operadora|contrato|ativa[cç][aã]o|status/i.test(cellText)) {
        return { rowIndex: r, headers: row };
      }
    }
  }
  return { rowIndex: 0, headers: matriz[0] };
}

function mapearIndicesColunas(headers) {
  const mapa = {};
  for (let c = 0; c < headers.length; c++) {
    const headerStr = String(headers[c]).trim();
    if (!headerStr) continue;

    for (const campo in CAMPOS_MAP_GPON) {
      if (mapa[campo] !== undefined) continue;
      const regexes = CAMPOS_MAP_GPON[campo];
      for (const rx of regexes) {
        if (rx.test(headerStr)) {
          mapa[campo] = c;
          break;
        }
      }
    }
  }
  return mapa;
}

function normalizarChave(valor) {
  if (valor === null || valor === undefined) return '';
  return String(valor)
    .trim()
    .toUpperCase()
    .replace(/\s+/g, ' ');
}

function abrirPlanilhaSegura(id, apelido) {
  try {
    return SpreadsheetApp.openById(id);
  } catch (e) {
    throw new Error(`Falha ao abrir ${apelido} (ID: ${id}). Verifique permissões da conta Google.`);
  }
}

function obterAbaPorGidOuNome(spreadsheet, gid, nomeAba) {
  if (nomeAba) {
    const abaPorNome = spreadsheet.getSheetByName(nomeAba);
    if (abaPorNome) return abaPorNome;
  }
  if (gid !== undefined && gid !== null && gid !== '') {
    const sheets = spreadsheet.getSheets();
    for (const sh of sheets) {
      if (sh.getSheetId().toString() === gid.toString()) {
        return sh;
      }
    }
  }
  return spreadsheet.getSheets()[0];
}

function obterAbaPorNomeOuIndice(spreadsheet, nomeAba, index) {
  if (nomeAba) {
    const aba = spreadsheet.getSheetByName(nomeAba);
    if (aba) return aba;
  }
  return spreadsheet.getSheets()[index || 0];
}

// ==========================================
// 8. DIAGNÓSTICO DAS PLANILHAS
// ==========================================
function diagnosticarPlanilhas() {
  Logger.log('=== [AUDITORIA] INICIANDO DIAGNÓSTICO DAS PLANILHAS ===');
  const planilhas = [
    { nome: 'Planilha 01 (DEMANDAS COMPRAS)', config: CONFIG_GPON.PLANILHA_1 },
    { nome: 'VISTORIA DE SITES (DASH)', config: CONFIG_GPON.PLANILHA_VISTORIA },
    { nome: 'Planilha 02 (Operacional)', config: CONFIG_GPON.PLANILHA_2 },
    { nome: 'Planilha 03 (Contratos/Finanças)', config: CONFIG_GPON.PLANILHA_3 },
    { nome: 'Planilha Destino (Links - Tratados)', config: CONFIG_GPON.DESTINO }
  ];

  for (const p of planilhas) {
    Logger.log(`\n--- ${p.nome} [ID: ${p.config.ID}] ---`);
    try {
      const ss = SpreadsheetApp.openById(p.config.ID);
      Logger.log(`Título da Planilha: "${ss.getName()}"`);
      const sheets = ss.getSheets();
      sheets.forEach((sh, idx) => {
        Logger.log(`  [Aba ${idx + 1}] "${sh.getName()}" | GID: ${sh.getSheetId()} | Linhas: ${sh.getLastRow()} | Colunas: ${sh.getLastColumn()}`);
        if (sh.getLastRow() > 0) {
          const l1 = sh.getRange(1, 1, 1, Math.min(15, sh.getLastColumn())).getValues()[0];
          Logger.log(`    Cabeçalho L1: ${JSON.stringify(l1)}`);
        }
      });
    } catch (e) {
      Logger.log(`ERRO ao acessar ${p.nome}: ${e.message}`);
    }
  }
  Logger.log('\n=== DIAGNÓSTICO CONCLUÍDO ===');
  try {
    SpreadsheetApp.getUi().alert('Diagnóstico Concluído', 'Verifique o menu Visualizar > Registros de Execução no Apps Script.', SpreadsheetApp.getUi().ButtonSet.OK);
  } catch(e) {}
}
