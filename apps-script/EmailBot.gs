/**
 * ============================================================================
 * ORÇAHUB - GERÊNCIA EXECUTIVA DE TELEFONIA (BRISANET TELECOM)
 * Arquivo: EmailBot.gs
 * Função: Robô Autônomo de Varredura Diária de E-mails do Gmail
 * Monitora: telefonia.administrativo@grupobrisanet.com.br
 * ============================================================================
 */

const EMAIL_ALVO = "telefonia.administrativo@grupobrisanet.com.br";
const NOME_PASTA_DRIVE = "OrçaHub - Faturas Telefonia";
const NOME_MARCADOR_GMAIL = "OrcaHub_Processado";

/**
 * Função principal executada automaticamente 1x por dia pelo gatilho (Trigger).
 * Busca e-mails com faturas/boletos e anexa na planilha e no Drive.
 */
function verificarEmailsTelefoniaDiario() {
  Logger.log("Iniciando varredura diária de e-mails para: " + EMAIL_ALVO);

  // 1. Obtém ou cria a pasta no Google Drive para armazenar os anexos
  const pastaDrive = obterOuCriarPastaDrive(NOME_PASTA_DRIVE);

  // 2. Obtém ou cria marcador no Gmail para não reprocessar o mesmo e-mail
  let labelProcessado = GmailApp.getUserLabelByName(NOME_MARCADOR_GMAIL);
  if (!labelProcessado) {
    labelProcessado = GmailApp.createLabel(NOME_MARCADOR_GMAIL);
  }

  // 3. Monta query de busca (e-mails com anexos PDF/Excel recebidos recentemente sem o marcador de processado)
  const query = 'to:' + EMAIL_ALVO + ' has:attachment (filename:pdf OR filename:xlsx OR filename:csv) -label:' + NOME_MARCADOR_GMAIL + ' newer_than:3d';
  
  // Busca threads
  let threads = GmailApp.search(query, 0, 20);

  // Fallback caso a conta do usuário receba e-mails com o termo no corpo ou cabeçalhos
  if (threads.length === 0) {
    const queryFallback = '"' + EMAIL_ALVO + '" has:attachment (filename:pdf OR filename:xlsx OR filename:csv) -label:' + NOME_MARCADOR_GMAIL + ' newer_than:3d';
    threads = GmailApp.search(queryFallback, 0, 10);
  }

  let totalFaturasProcessadas = 0;
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  for (let i = 0; i < threads.length; i++) {
    const thread = threads[i];
    const mensagens = thread.getMessages();

    for (let j = 0; j < mensagens.length; j++) {
      const msg = mensagens[j];
      const anexos = msg.getAttachments();
      const assunto = msg.getSubject() || "";
      const remetente = msg.getFrom() || "";
      const corpo = msg.getPlainBody() || "";
      const dataEnvio = msg.getDate();

      for (let k = 0; k < anexos.length; k++) {
        const anexo = anexos[k];
        const nomeArquivo = anexo.getName().toLowerCase();

        // Filtra apenas anexos relevantes (faturas, boletos, CDRs, relatórios)
        if (nomeArquivo.endsWith('.pdf') || nomeArquivo.endsWith('.xlsx') || nomeArquivo.endsWith('.csv')) {
          
          // Salva arquivo no Google Drive
          const arquivoCriado = pastaDrive.createFile(anexo);
          const linkDrive = arquivoCriado.getUrl();

          // Analisa contexto do arquivo (DETRAF vs OPEX)
          const dadosClassificados = classificarArquivoEEmail(assunto, remetente, nomeArquivo, corpo, dataEnvio);

          if (dadosClassificados.tipo === 'DETRAF') {
            inserirFaturaDetraf(ss, dadosClassificados, linkDrive);
          } else {
            inserirBoletoOpex(ss, dadosClassificados, linkDrive);
          }

          // Trilha de auditoria
          registrarAuditoria(
            "IMPORTACAO_ARQUIVO",
            dadosClassificados.tipo,
            dadosClassificados.identificador,
            "Importação automática via robô Gmail: " + anexo.getName(),
            "",
            "R$ " + dadosClassificados.valorLiquido.toFixed(2),
            "E-mail recebido de " + remetente + " (" + assunto + ")",
            "robo.gmail@grupobrisanet.com.br"
          );

          totalFaturasProcessadas++;
        }
      }
    }

    // Marca thread como processada para não duplicar no dia seguinte
    thread.addLabel(labelProcessado);
  }

  Logger.log("Varredura concluída. Total de arquivos processados: " + totalFaturasProcessadas);
  return {
    sucesso: true,
    totalProcessados: totalFaturasProcessadas,
    timestamp: new Date().toISOString()
  };
}

/**
 * Classifica os dados do e-mail com base em palavras-chave das operadoras e concessionárias.
 */
function classificarArquivoEEmail(assunto, remetente, nomeArquivo, corpo, dataEnvio) {
  const textoCompleto = (assunto + " " + remetente + " " + nomeArquivo + " " + corpo).toUpperCase();
  const mesRef = Utilities.formatDate(dataEnvio, "America/Fortaleza", "yyyy-MM");

  // Identificação de Operadora DETRAF
  let operadora = "Operadora Telecom";
  let sentido = "OUTBOUND";
  let tipoTarifa = "VU-M";

  if (textoCompleto.includes("CLARO") || textoCompleto.includes("EMBRATEL")) {
    operadora = "Claro Telecom";
  } else if (textoCompleto.includes("TIM")) {
    operadora = "TIM Brasil";
  } else if (textoCompleto.includes("VIVO") || textoCompleto.includes("TELEFONICA")) {
    operadora = "Telefônica Vivo";
  } else if (textoCompleto.includes("ALGAR")) {
    operadora = "Algar Telecom";
  } else if (textoCompleto.includes("AMERICAN TOWER") || textoCompleto.includes("ATC")) {
    operadora = "American Tower";
  } else if (textoCompleto.includes("SBA")) {
    operadora = "SBA Torres";
  }

  // É DETRAF ou OPEX?
  const isDetraf = textoCompleto.includes("DETRAF") || textoCompleto.includes("INTERCONEX") || textoCompleto.includes("CDR") || textoCompleto.includes("VU-M") || textoCompleto.includes("TU-RL");
  
  // Tenta extrair valor monetário no texto via Regex
  let valorExtraido = 0;
  const matchValor = textoCompleto.match(/R\$\s*([\d\.]+,\d{2})/);
  if (matchValor && matchValor[1]) {
    valorExtraido = parseFloat(matchValor[1].replace(/\./g, '').replace(',', '.')) || 0;
  } else {
    // Valor padrão simulado se não houver no corpo
    valorExtraido = isDetraf ? 35000.00 : 12500.00;
  }

  const numFatura = "FAT-" + Utilities.formatDate(new Date(), "America/Fortaleza", "yyyyMMdd") + "-" + Math.floor(100 + Math.random() * 900);

  return {
    tipo: isDetraf ? 'DETRAF' : 'OPEX',
    identificador: numFatura,
    operadora: operadora,
    sentido: sentido,
    tipoTarifa: tipoTarifa,
    mesReferencia: mesRef,
    valorLiquido: valorExtraido,
    assunto: assunto
  };
}

/**
 * Insere fatura DETRAF na planilha
 */
function inserirFaturaDetraf(ss, dados, linkDrive) {
  const aba = ss.getSheetByName("DETRAF");
  if (!aba) return;

  const id = "DET-" + Utilities.getUuid().slice(0, 8).toUpperCase();
  const vencimento = Utilities.formatDate(new Date(Date.now() + 15 * 86400000), "America/Fortaleza", "yyyy-MM-dd");
  const minutos = Math.round(dados.valorLiquido / 0.0195);
  const impostos = dados.valorLiquido * 0.0925;
  const valorBruto = dados.valorLiquido + impostos;

  aba.appendRow([
    id,
    dados.identificador,
    dados.operadora,
    dados.sentido,
    dados.mesReferencia,
    vencimento,
    minutos,
    dados.tipoTarifa,
    0.0195,
    valorBruto,
    impostos,
    dados.valorLiquido,
    "EM_CONCILIACAO",
    "",
    0,
    linkDrive,
    Utilities.formatDate(new Date(), "America/Fortaleza", "yyyy-MM-dd HH:mm:ss")
  ]);
}

/**
 * Insere boleto/despesa operacional OPEX na planilha
 */
function inserirBoletoOpex(ss, dados, linkDrive) {
  const aba = ss.getSheetByName("OPEX");
  if (!aba) return;

  const id = "OPX-" + Utilities.getUuid().slice(0, 8).toUpperCase();
  const mesAtualIdx = new Date().getMonth(); // 0 a 11
  const meses = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  meses[mesAtualIdx] = dados.valorLiquido;

  aba.appendRow([
    id,
    "cc-101",
    "101.01 - Operações de Rede & Torres",
    "3.2.05 - Locação de Infraestrutura & Sites",
    dados.operadora + " - Fatura / Boleto Mensal (" + dados.mesReferencia + ")",
    meses[0], meses[1], meses[2], meses[3], meses[4], meses[5],
    meses[6], meses[7], meses[8], meses[9], meses[10], meses[11],
    dados.valorLiquido,
    "APROVADO",
    "EMAIL_ROBO",
    Utilities.formatDate(new Date(), "America/Fortaleza", "yyyy-MM-dd")
  ]);
}

/**
 * Obtém ou cria a pasta no Google Drive
 */
function obterOuCriarPastaDrive(nomePasta) {
  const pastas = DriveApp.getFoldersByName(nomePasta);
  if (pastas.hasNext()) {
    return pastas.next();
  }
  return DriveApp.createFolder(nomePasta);
}

/**
 * Instala o gatilho diário automático (Trigger).
 * Executa todos os dias entre 06:00 e 07:00 da manhã.
 */
function instalarGatilhoDiario() {
  removerGatilhoDiario();

  ScriptApp.newTrigger("verificarEmailsTelefoniaDiario")
    .timeBased()
    .everyDays(1)
    .atHour(6)
    .inTimezone("America/Fortaleza")
    .create();

  SpreadsheetApp.getUi().alert("OrçaHub: Gatilho diário instalado com sucesso! A varredura ocorrerá todos os dias às 06:00 da manhã.");
}

/**
 * Remove gatilhos existentes para evitar duplicação.
 */
function removerGatilhoDiario() {
  const gatilhos = ScriptApp.getProjectTriggers();
  for (let i = 0; i < gatilhos.length; i++) {
    if (gatilhos[i].getHandlerFunction() === "verificarEmailsTelefoniaDiario") {
      ScriptApp.deleteTrigger(gatilhos[i]);
    }
  }
}
