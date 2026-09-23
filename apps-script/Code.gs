/**
 * ============================================================================
 * ORÇAHUB - GERÊNCIA EXECUTIVA DE TELEFONIA (BRISANET TELECOM)
 * Arquivo: Code.gs
 * Função: Servidor Web App, Roteamento e RPC API (google.script.run)
 * ============================================================================
 */

/**
 * Ponto de entrada do Web App no navegador.
 */
function doGet(e) {
  return HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setTitle('OrçaHub - Gerência Executiva de Telefonia')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1.0')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * Cria o menu personalizado na barra superior do Google Planilhas.
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu("🚀 OrçaHub Telefonia")
    .addItem("🌐 Abrir Painel OrçaHub", "abrirModalWebApp")
    .addSeparator()
    .addItem("⚙️ Configurar Banco de Dados Inicial", "configurarPlanilhaInicial")
    .addItem("📧 Verificar E-mails Agora (Robô)", "executarRoboManual")
    .addSeparator()
    .addItem("⏰ Ativar Leitura Diária Automática (06:00)", "instalarGatilhoDiario")
    .addItem("🛑 Desativar Leitura Diária", "removerGatilhoDiario")
    .addToUi();
}

/**
 * Abre o Web App em uma janela modal dentro da própria planilha do Google.
 */
function abrirModalWebApp() {
  const html = HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setWidth(1280)
    .setHeight(800);
  SpreadsheetApp.getUi().showModalDialog(html, "OrçaHub - FP&A Telefonia");
}

/**
 * Executa o robô do Gmail manualmente a partir do menu da planilha.
 */
function executarRoboManual() {
  const res = verificarEmailsTelefoniaDiario();
  SpreadsheetApp.getUi().alert("OrçaHub: Varredura de e-mails concluída! Total de faturas importadas: " + res.totalProcessados);
}

// ============================================================================
// API CLIENT-SIDE (Chamadas via google.script.run pelo Frontend Index.html)
// ============================================================================

/**
 * Retorna todos os dados para carregar o Dashboard e todas as 8 telas.
 */
function apiCarregarDadosIniciais() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // Se a planilha estiver vazia, roda configuração inicial automaticamente
    if (!ss.getSheetByName("OPEX") || ss.getSheetByName("OPEX").getLastRow() <= 1) {
      configurarPlanilhaInicial();
    }

    const opex = lerDadosAba("OPEX");
    const capex = lerDadosAba("CAPEX");
    const detraf = lerDadosAba("DETRAF");
    const torres = lerDadosAba("TORRES_SITES");
    const auditoria = lerDadosAba("AUDITORIA");
    const remanejamentos = lerDadosAba("REMANEJAMENTOS");
    
    let userEmail = "";
    try {
      userEmail = Session.getActiveUser().getEmail();
    } catch (e) {
      userEmail = "usuario.telefonia@grupobrisanet.com.br";
    }

    return {
      sucesso: true,
      usuarioLogado: userEmail || "rodrigo.henrique@grupobrisanet.com.br",
      gerencia: "Gerência Executiva de Telefonia",
      dados: {
        opex: opex,
        capex: capex,
        detraf: detraf,
        torres: torres,
        auditoria: auditoria,
        remanejamentos: remanejamentos
      }
    };
  } catch (erro) {
    return {
      sucesso: false,
      mensagemErro: erro.toString()
    };
  }
}

/**
 * Salva novo lançamento (OPEX ou DETRAF) vindo do modal do Web App.
 */
function apiSalvarNovoLancamento(payload) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const userEmail = Session.getActiveUser().getEmail() || "usuario.telefonia@grupobrisanet.com.br";

    if (payload.tipo === 'DETRAF') {
      const aba = ss.getSheetByName("DETRAF");
      const id = "DET-" + Utilities.getUuid().slice(0, 8).toUpperCase();
      const numFatura = payload.numeroFatura || ("DET-" + Utilities.formatDate(new Date(), "America/Fortaleza", "yyyyMMdd-HHmm"));
      
      aba.appendRow([
        id,
        numFatura,
        payload.operadora,
        payload.sentido,
        payload.mesReferencia,
        payload.vencimento,
        payload.minutos || 0,
        payload.tipoTarifa || "VU-M",
        payload.tarifaValor || 0.0195,
        payload.valorBruto || payload.valorLiquido,
        payload.impostos || 0,
        payload.valorLiquido,
        "EM_CONCILIACAO",
        "",
        0,
        "",
        Utilities.formatDate(new Date(), "America/Fortaleza", "yyyy-MM-dd HH:mm:ss")
      ]);

      registrarAuditoria(
        "CRIACAO",
        "DETRAF",
        id,
        "Lançamento manual de fatura DETRAF: " + payload.operadora + " (" + payload.mesReferencia + ")",
        "",
        "R$ " + payload.valorLiquido.toFixed(2),
        "Inserido via Web App",
        userEmail
      );

    } else {
      // OPEX
      const aba = ss.getSheetByName("OPEX");
      const id = "OPX-" + Utilities.getUuid().slice(0, 8).toUpperCase();
      const meses = payload.meses || [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
      const total = meses.reduce(function(a, b) { return a + b; }, 0);

      aba.appendRow([
        id,
        payload.centroCustoId || "cc-101",
        payload.centroCustoNome || "101.01 - Operações de Rede & Torres",
        payload.contaContabil || "3.2.05 - Locação de Infraestrutura",
        payload.descricao,
        meses[0], meses[1], meses[2], meses[3], meses[4], meses[5],
        meses[6], meses[7], meses[8], meses[9], meses[10], meses[11],
        total,
        "APROVADO",
        "MANUAL",
        Utilities.formatDate(new Date(), "America/Fortaleza", "yyyy-MM-dd")
      ]);

      registrarAuditoria(
        "CRIACAO",
        "OPEX",
        id,
        "Lançamento de despesa operacional: " + payload.descricao,
        "",
        "R$ " + total.toFixed(2),
        "Inserido via Web App",
        userEmail
      );
    }

    return { sucesso: true };
  } catch (erro) {
    return { sucesso: false, mensagemErro: erro.toString() };
  }
}

/**
 * Exclui um lançamento na planilha e registra auditoria.
 */
function apiExcluirLancamento(id, entidade, justificativa) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const nomeAba = entidade === 'DETRAF' ? 'DETRAF' : 'OPEX';
    const aba = ss.getSheetByName(nomeAba);
    if (!aba) return { sucesso: false, mensagemErro: "Aba não encontrada" };

    const valores = aba.getDataRange().getValues();
    let linhaParaExcluir = -1;
    let descricaoItem = "";

    for (let i = 1; i < valores.length; i++) {
      if (valores[i][0] == id) {
        linhaParaExcluir = i + 1;
        descricaoItem = valores[i][4] || valores[i][1] || id;
        break;
      }
    }

    if (linhaParaExcluir !== -1) {
      aba.deleteRow(linhaParaExcluir);
      const userEmail = Session.getActiveUser().getEmail() || "usuario.telefonia@grupobrisanet.com.br";
      
      registrarAuditoria(
        "EXCLUSAO",
        entidade,
        id,
        "Exclusão de item: " + descricaoItem,
        "",
        "",
        justificativa || "Exclusão solicitada pelo usuário no OrçaHub",
        userEmail
      );

      return { sucesso: true };
    }

    return { sucesso: false, mensagemErro: "Registro não encontrado para o ID: " + id };
  } catch (erro) {
    return { sucesso: false, mensagemErro: erro.toString() };
  }
}

/**
 * Registra solicitação de remanejamento orçamentário.
 */
function apiCriarRemanejamento(payload) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const aba = ss.getSheetByName("REMANEJAMENTOS");
    const id = "TRF-" + Utilities.getUuid().slice(0, 8).toUpperCase();
    const protocolo = "TRF-2026-" + Math.floor(100 + Math.random() * 900);
    const dataCriacao = Utilities.formatDate(new Date(), "America/Fortaleza", "yyyy-MM-dd HH:mm:ss");
    const userEmail = Session.getActiveUser().getEmail() || payload.solicitante;

    aba.appendRow([
      id,
      protocolo,
      dataCriacao,
      userEmail,
      payload.ccOrigem,
      payload.ccDestino,
      payload.valor,
      payload.categoria,
      payload.mesEfetivo,
      "PENDENTE",
      payload.justificativa,
      "",
      ""
    ]);

    registrarAuditoria(
      "REMANEJAMENTO",
      "OPEX",
      protocolo,
      "Solicitação de remanejamento: " + payload.ccOrigem + " ➔ " + payload.ccDestino,
      "",
      "R$ " + payload.valor.toFixed(2),
      payload.justificativa,
      userEmail
    );

    return { sucesso: true, protocolo: protocolo };
  } catch (erro) {
    return { sucesso: false, mensagemErro: erro.toString() };
  }
}

/**
 * Aprova ou rejeita solicitação de remanejamento na alçada de Telefonia.
 */
function apiAprovarRejeitarRemanejamento(id, novoStatus, justificativa) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const aba = ss.getSheetByName("REMANEJAMENTOS");
    const valores = aba.getDataRange().getValues();
    const userEmail = Session.getActiveUser().getEmail() || "gerencia.telefonia@grupobrisanet.com.br";
    const dataAgora = Utilities.formatDate(new Date(), "America/Fortaleza", "yyyy-MM-dd HH:mm:ss");

    for (let i = 1; i < valores.length; i++) {
      if (valores[i][0] == id || valores[i][1] == id) {
        aba.getRange(i + 1, 10).setValue(novoStatus); // STATUS
        aba.getRange(i + 1, 12).setValue(userEmail);  // APROVADOR
        aba.getRange(i + 1, 13).setValue(dataAgora);  // DATA_APROVACAO

        registrarAuditoria(
          "REMANEJAMENTO",
          "OPEX",
          valores[i][1],
          (novoStatus === 'APROVADO' ? "Aprovação" : "Rejeição") + " de remanejamento: " + valores[i][4] + " ➔ " + valores[i][5],
          "",
          "R$ " + Number(valores[i][6]).toFixed(2),
          justificativa || "Avaliado pela Gerência Executiva de Telefonia",
          userEmail
        );
        return { sucesso: true };
      }
    }
    return { sucesso: false, mensagemErro: "Remanejamento não encontrado." };
  } catch (erro) {
    return { sucesso: false, mensagemErro: erro.toString() };
  }
}

/**
 * Executa o robô de e-mails sob demanda disparado pelo botão do Web App.
 */
function apiExecutarRoboEmailsManual() {
  return verificarEmailsTelefoniaDiario();
}
