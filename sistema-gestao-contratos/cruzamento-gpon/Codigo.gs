/**
 * =========================================================================================
 * GOOGLE APPS SCRIPT: CRUZAMENTO E TRATAMENTO DE DADOS DE SITES GPON
 * PROJETO: SISTEMA DE GESTÃO DE CONTRATOS - ORÇAMENTO FPA
 * =========================================================================================
 * 
 * Descrição:
 * Este script automatiza o cruzamento de dados de 3 planilhas de origem, filtrando os sites únicos
 * a partir da Planilha 01 (DEMANDAS COMPRAS - NEGOCIAÇÕES GPON, Coluna C), buscando as informações
 * complementares nas Planilhas 02 e 03 com lógica de fallback em cascata.
 * 
 * Regras de Negócio:
 * 1. Base Primária: Sites únicos extraídos da Planilha 01 (Coluna C).
 * 2. Busca em Cascata: Se um dado estiver em branco na Planilha 01, busca na Planilha 02.
 *    Se ainda estiver em branco, busca na Planilha 03.
 * 3. Fallback Geral: Qualquer campo não localizado após a consulta nas 3 planilhas recebe o valor "NÃO ENCONTRADO".
 * 4. Padronização: Todos os textos gerados na planilha de destino são padronizados em MAIÚSCULAS.
 * 5. Destino: Gravação formatada na aba "Links - Tratados" da Planilha de Destino.
 * 
 * Planilhas Envolvidas:
 * - Planilha 01: 1-f3NXFp4rCGhhBHgkf0hPq2e_93hFTNRHpM-f37Rra4 (Aba: NEGOCIAÇÕES GPON)
 * - Planilha 02: 1uelDTBNV-cVVqTjBIK0BxfyGs4EPi-WzRL1Vh8ne56g (Filtro Operacional / GID 0)
 * - Planilha 03: 16VUOaCDOYX634ZzsIWGySGQZGciOeVdLLB3x6FOp1IQ (GID: 7198436)
 * - Planilha Destino: 1HUIi3NBEp4N-fJqByEKC_ZFRAqMi82sVk670ry0MZ6I (Aba: Links - Tratados)
 * =========================================================================================
 */

// ==========================================
// 1. CONFIGURAÇÕES GERAIS
// ==========================================
const CONFIG = {
  PLANILHA_1: {
    ID: '1-f3NXFp4rCGhhBHgkf0hPq2e_93hFTNRHpM-f37Rra4',
    NOME_ABA: 'NEGOCIAÇÕES GPON',
    COLUNA_SITE_INDEX: 2 // Coluna C (0=A, 1=B, 2=C)
  },
  PLANILHA_2: {
    ID: '1uelDTBNV-cVVqTjBIK0BxfyGs4EPi-WzRL1Vh8ne56g',
    NOME_ABA: '', // Vazio = busca por GID ou 1ª aba
    GID: '0'
  },
  PLANILHA_3: {
    ID: '16VUOaCDOYX634ZzsIWGySGQZGciOeVdLLB3x6FOp1IQ',
    NOME_ABA: '',
    GID: '7198436' // GID da aba informada
  },
  DESTINO: {
    ID: '1HUIi3NBEp4N-fJqByEKC_ZFRAqMi82sVk670ry0MZ6I',
    NOME_ABA: 'Links - Tratados',
    GID: '1200272248'
  },
  VALOR_PADRAO_NAO_ENCONTRADO: 'NÃO ENCONTRADO',
  
  // Ordem e nomenclatura oficial das 12 colunas de saída
  COLUNAS_SOLICITADAS: [
    'SITES',
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
// 2. DICIONÁRIO DE SINÔNIMOS (FUZZY MATCHER VIA REGEX)
// Identifica colunas mesmo com pequenas variações de acentuação ou nomenclatura
// ==========================================
const CAMPOS_MAP = {
  'SITES': [
    /^sites?$/i, /^id[\s_-]?site$/i, /^esta[cç][aã]o$/i, /^c[oó]digo[\s_-]?site$/i, /^nome[\s_-]?site$/i
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
  SpreadsheetApp.getUi()
    .createMenu('🚀 Integração GPON')
    .addItem('🔄 Cruzar e Atualizar Dados', 'cruzarDadosPlanilhas')
    .addSeparator()
    .addItem('🔍 Diagnosticar Colunas das Planilhas', 'diagnosticarPlanilhas')
    .addToUi();
}

// ==========================================
// 4. MOTOR PRINCIPAL DE PROCESSAMENTO
// ==========================================
function cruzarDadosPlanilhas() {
  const tempoInicio = new Date();
  Logger.log('>>> [INÍCIO] Iniciando processo de cruzamento de dados GPON...');

  // -------------------------------------------------------------
  // ETAPA 1: Carregar Planilha 01 e Extrair SITES ÚNICOS (Coluna C)
  // -------------------------------------------------------------
  const ss1 = abrirPlanilhaSegura(CONFIG.PLANILHA_1.ID, 'Planilha 01 (DEMANDAS COMPRAS)');
  const aba1 = obterAbaPorNomeOuIndice(ss1, CONFIG.PLANILHA_1.NOME_ABA, 0);
  const dados1 = aba1.getDataRange().getValues();

  if (dados1.length < 2) {
    throw new Error('A Planilha 01 (NEGOCIAÇÕES GPON) não possui linhas de dados suficientes.');
  }

  const infoHeader1 = detectarCabecalho(dados1);
  const mapaColunas1 = mapearIndicesColunas(infoHeader1.headers);
  const colSiteIndexP1 = CONFIG.PLANILHA_1.COLUNA_SITE_INDEX !== undefined 
    ? CONFIG.PLANILHA_1.COLUNA_SITE_INDEX 
    : (mapaColunas1['SITES'] !== undefined ? mapaColunas1['SITES'] : 2);

  const sitesUnicosList = [];
  const dadosConsolidados = new Map(); // siteKey -> objeto acumulador de campos

  for (let r = infoHeader1.rowIndex + 1; r < dados1.length; r++) {
    const row = dados1[r];
    const rawSite = row[colSiteIndexP1];
    const siteKey = normalizarChave(rawSite);

    if (!siteKey) continue; // Ignora linhas sem nome de site

    if (!dadosConsolidados.has(siteKey)) {
      sitesUnicosList.push(siteKey);
      dadosConsolidados.set(siteKey, {
        SITES: String(rawSite).trim().toUpperCase()
      });
    }

    // Coleta dados já existentes na Planilha 01 para este site
    const reg = dadosConsolidados.get(siteKey);
    preencherCamposDaLinha(reg, row, mapaColunas1);
  }

  Logger.log(`[ETAPA 1] Sites únicos extraídos da Planilha 01: ${sitesUnicosList.length}`);

  // -------------------------------------------------------------
  // ETAPA 2: Cruzar com Planilha 02 (Operacional / Ativação)
  // -------------------------------------------------------------
  try {
    const ss2 = abrirPlanilhaSegura(CONFIG.PLANILHA_2.ID, 'Planilha 02');
    const aba2 = obterAbaPorGidOuNome(ss2, CONFIG.PLANILHA_2.GID, CONFIG.PLANILHA_2.NOME_ABA);
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
        Logger.log('[ETAPA 2] Cruzamento com Planilha 02 executado com sucesso.');
      } else {
        Logger.log('[AVISO ETAPA 2] Coluna de Site não detectada na Planilha 02.');
      }
    }
  } catch (errP2) {
    Logger.log(`[AVISO ETAPA 2] Erro ao processar Planilha 02: ${errP2.message}`);
  }

  // -------------------------------------------------------------
  // ETAPA 3: Cruzar com Planilha 03 (Contratos / Finanças - GID 7198436)
  // -------------------------------------------------------------
  try {
    const ss3 = abrirPlanilhaSegura(CONFIG.PLANILHA_3.ID, 'Planilha 03');
    const aba3 = obterAbaPorGidOuNome(ss3, CONFIG.PLANILHA_3.GID, CONFIG.PLANILHA_3.NOME_ABA);
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
        Logger.log('[ETAPA 3] Cruzamento com Planilha 03 executado com sucesso.');
      } else {
        Logger.log('[AVISO ETAPA 3] Coluna de Site não detectada na Planilha 03.');
      }
    }
  } catch (errP3) {
    Logger.log(`[AVISO ETAPA 3] Erro ao processar Planilha 03: ${errP3.message}`);
  }

  // -------------------------------------------------------------
  // ETAPA 4: Tratamento, Padronização em MAIÚSCULAS e Fallback Geral
  // -------------------------------------------------------------
  const matrizDestino = [];

  for (const siteKey of sitesUnicosList) {
    const reg = dadosConsolidados.get(siteKey);
    const linhaTratada = CONFIG.COLUNAS_SOLICITADAS.map(nomeColuna => {
      const valorBruto = reg[nomeColuna];
      return tratarValorPadronizado(nomeColuna, valorBruto);
    });
    matrizDestino.push(linhaTratada);
  }

  Logger.log(`[ETAPA 4] Matriz final tratada montada com ${matrizDestino.length} registros.`);

  // -------------------------------------------------------------
  // ETAPA 5: Gravação e Formatação na Planilha Destino
  // -------------------------------------------------------------
  gravarPlanilhaDestino(matrizDestino);

  const tempoTotal = ((new Date() - tempoInicio) / 1000).toFixed(1);
  const msgSucesso = `Cruzamento finalizado com sucesso!\n\n` +
                     `• Total de Sites Únicos processados: ${matrizDestino.length}\n` +
                     `• Tempo de execução: ${tempoTotal} segundos\n` +
                     `• Regra de Fallback: "NÃO ENCONTRADO" aplicado nos campos ausentes\n` +
                     `• Padrão de texto: MAIÚSCULO em todas as colunas textuais\n` +
                     `• Destino: Aba "${CONFIG.DESTINO.NOME_ABA}" atualizada.`;

  Logger.log(msgSucesso);
  try {
    SpreadsheetApp.getUi().alert('✅ Processo Concluído', msgSucesso, SpreadsheetApp.getUi().ButtonSet.OK);
  } catch(e) {}
}

// ==========================================
// 5. TRATAMENTO, PADRONIZAÇÃO E FORMATAÇÃO
// ==========================================
function tratarValorPadronizado(nomeColuna, valor) {
  // Se estiver nulo, indefinido, vazio ou apenas espaços: aplica fallback padrão
  if (valor === null || valor === undefined || String(valor).trim() === '') {
    return CONFIG.VALOR_PADRAO_NAO_ENCONTRADO;
  }

  switch (nomeColuna) {
    case 'SITES':
      return String(valor).trim().toUpperCase();

    case 'POPULAÇÃO':
      if (typeof valor === 'number') return valor;
      const cleanPopStr = String(valor).replace(/[^\d]/g, '');
      if (!cleanPopStr) return CONFIG.VALOR_PADRAO_NAO_ENCONTRADO;
      const numPop = parseInt(cleanPopStr, 10);
      return isNaN(numPop) ? CONFIG.VALOR_PADRAO_NAO_ENCONTRADO : numPop;

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
      return isNaN(numFloat) ? CONFIG.VALOR_PADRAO_NAO_ENCONTRADO : numFloat;

    case 'DATA DE ATIVAÇÃO':
    case 'DATA ASSINATURA DO CONTRATO':
      return formatarData(valor);

    case 'TAXA DE INSTALAÇÃO':
      const strTaxa = String(valor).trim().toUpperCase();
      if (/^(SIM|S|YES)$/i.test(strTaxa)) return 'SIM';
      if (/^(N[AÃ]O|N|NO|ISENTO)$/i.test(strTaxa)) return 'NÃO';
      return strTaxa || CONFIG.VALOR_PADRAO_NAO_ENCONTRADO;

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
      // Campos de texto geral (FORNECEDOR, TIPO DE ATENDIMENTO, PLANO CONTRATADO)
      return String(valor).trim().toUpperCase();
  }
}

function formatarData(val) {
  if (!val) return CONFIG.VALOR_PADRAO_NAO_ENCONTRADO;
  
  if (val instanceof Date) {
    if (isNaN(val.getTime())) return CONFIG.VALOR_PADRAO_NAO_ENCONTRADO;
    return Utilities.formatDate(val, Session.getScriptTimeZone() || 'America/Sao_Paulo', 'dd/MM/yyyy');
  }

  if (typeof val === 'string') {
    val = val.trim();
    if (!val) return CONFIG.VALOR_PADRAO_NAO_ENCONTRADO;
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
  const ssDestino = abrirPlanilhaSegura(CONFIG.DESTINO.ID, 'Planilha Destino');
  let abaDestino = obterAbaPorGidOuNome(ssDestino, CONFIG.DESTINO.GID, CONFIG.DESTINO.NOME_ABA);

  if (!abaDestino) {
    abaDestino = ssDestino.insertSheet(CONFIG.DESTINO.NOME_ABA);
  }

  // Limpa completamente os dados e formatações anteriores
  abaDestino.clear();

  // 1. Cabeçalho estilizado
  const cabecalhos = [CONFIG.COLUNAS_SOLICITADAS];
  const rangeHeader = abaDestino.getRange(1, 1, 1, cabecalhos[0].length);
  rangeHeader.setValues(cabecalhos)
    .setFontWeight('bold')
    .setFontColor('#FFFFFF')
    .setBackground('#1B365D') // Azul corporativo elegante
    .setHorizontalAlignment('center')
    .setVerticalAlignment('middle');

  abaDestino.setRowHeight(1, 36);
  abaDestino.setFrozenRows(1);

  if (matrizDados.length === 0) return;

  // 2. Gravação em lote dos dados (Ultra rápida)
  const totalLinhas = matrizDados.length;
  const totalColunas = matrizDados[0].length;
  const rangeDados = abaDestino.getRange(2, 1, totalLinhas, totalColunas);
  rangeDados.setValues(matrizDados);
  rangeDados.setVerticalAlignment('middle');

  // 3. Formatações Numéricas
  // Coluna 2 (POPULAÇÃO) -> Separador de milhar
  abaDestino.getRange(2, 2, totalLinhas, 1).setNumberFormat('#,##0');
  // Coluna 7 (VALOR DA CONTRATAÇÃO) -> Moeda Real
  abaDestino.getRange(2, 7, totalLinhas, 1).setNumberFormat('"R$"\\ #,##0.00');
  // Coluna 9 (VALOR INSTALAÇÃO) -> Moeda Real
  abaDestino.getRange(2, 9, totalLinhas, 1).setNumberFormat('"R$"\\ #,##0.00');

  // 4. Alinhamentos Visuais
  abaDestino.getRange(2, 1, totalLinhas, 1).setHorizontalAlignment('left');    // SITES
  abaDestino.getRange(2, 2, totalLinhas, 1).setHorizontalAlignment('right');   // POPULAÇÃO
  abaDestino.getRange(2, 3, totalLinhas, 1).setHorizontalAlignment('center');  // MÊS DE ATIVAÇÃO
  abaDestino.getRange(2, 4, totalLinhas, 3).setHorizontalAlignment('left');    // FORNECEDOR, ATENDIMENTO, PLANO
  abaDestino.getRange(2, 7, totalLinhas, 1).setHorizontalAlignment('right');   // VALOR DA CONTRATAÇÃO
  abaDestino.getRange(2, 8, totalLinhas, 1).setHorizontalAlignment('center');  // TAXA DE INSTALAÇÃO
  abaDestino.getRange(2, 9, totalLinhas, 1).setHorizontalAlignment('right');   // VALOR INSTALAÇÃO
  abaDestino.getRange(2, 10, totalLinhas, 3).setHorizontalAlignment('center'); // DATAS E VIGÊNCIA

  // 5. Ajuste automático de largura de colunas
  for (let c = 1; c <= totalColunas; c++) {
    abaDestino.autoResizeColumn(c);
  }
}

// ==========================================
// 7. FUNÇÕES AUXILIARES DE SUPORTE
// ==========================================
function preencherCamposDaLinha(objetoDestino, row, mapaColunas) {
  for (const campo of CONFIG.COLUNAS_SOLICITADAS) {
    if (campo === 'SITES') continue;
    
    // Regra de Fallback em Cascata: Só preenche se o campo ainda estiver vazio no objeto
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
      if (/site|fornecedor|operadora|contrato|ativa[cç][aã]o/i.test(cellText)) {
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

    for (const campo in CAMPOS_MAP) {
      if (mapa[campo] !== undefined) continue;
      const regexes = CAMPOS_MAP[campo];
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
    throw new Error(`Falha ao abrir ${apelido} (ID: ${id}). Verifique se a conta logada tem permissão de leitura.`);
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
// 8. DIAGNÓSTICO DAS PLANILHAS (LOG DE AUDITORIA)
// ==========================================
function diagnosticarPlanilhas() {
  Logger.log('=== [AUDITORIA] INICIANDO DIAGNÓSTICO DAS 4 PLANILHAS ===');
  const planilhas = [
    { nome: 'Planilha 01 (DEMANDAS COMPRAS)', config: CONFIG.PLANILHA_1 },
    { nome: 'Planilha 02 (Operacional)', config: CONFIG.PLANILHA_2 },
    { nome: 'Planilha 03 (Contratos/Finanças)', config: CONFIG.PLANILHA_3 },
    { nome: 'Planilha Destino (Links - Tratados)', config: CONFIG.DESTINO }
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
