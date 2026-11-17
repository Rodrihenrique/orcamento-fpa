// URL Base fixa do Jira Cloud
var URL_JIRA_BASE = "https://assets-brisanet.atlassian.net/browse/";


function atualizarNFPlanilha() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var ui = null;
  try { ui = SpreadsheetApp.getUi(); } catch (e) { ui = null; }


  var contadorFAT = 0;
  var contadorCAP = 0;


  // =========================================================================
  // ETAPA 1: PROCESSAMENTO DOS TICKETS DE FATURAMENTO (FAT-)
  // =========================================================================
  var threadsFAT = GmailApp.search('subject:FAT- AND (subject:DETRAF OR subject:DEROAM OR subject:BROKER OR subject:MOVEL OR subject:SMP OR subject:STFC)');
 
  if (threadsFAT.length > 0) {
    var emailsProcessados = [];
    for (var t = 0; t < threadsFAT.length; t++) {
      var messages = threadsFAT[t].getMessages();
      var subjectOriginal = messages[0].getSubject().trim();


      if (!eAssuntoValidoFAT(subjectOriginal)) continue;


      var param = extrairParametrosExatos(subjectOriginal);
     
      // Status Primário / Inicial por padrão
      var ultimoStatusEncontrado = "ATENTOS";
      var corpoAcumulado = "";


      // Lê da primeira até a ÚLTIMA mensagem da thread
      for (var m = 0; m < messages.length; m++) {
        var msg = messages[m];
        var textoPlain = "";
        var textoHtml = "";
       
        try { textoPlain = msg.getPlainBody() || ""; } catch (err) {}
        try { textoHtml = msg.getBody() || ""; } catch (err) {}
       
        var corpoTexto = textoPlain + " " + textoHtml;
        corpoAcumulado += " " + corpoTexto;
       
        // Verifica se a mensagem atual possui algum status
        var stExtraido = extrairUltimoStatusCorpo(corpoTexto);
       
        if (stExtraido) {
          ultimoStatusEncontrado = stExtraido;
        }
      }
     
      param.statusJira = ultimoStatusEncontrado;
      param.valor = extrairValorMonetario(subjectOriginal + " " + corpoAcumulado);


      if (param.ticket && param.operadora !== "" && param.mesCod !== "") {
        emailsProcessados.push(param);
      }
    }


    var ticketsUsados = {};
    var linhasPreenchidas = {};  
    var todasAbas = ss.getSheets();
   
    for (var a = 0; a < todasAbas.length; a++) {
      var aba = todasAbas[a];
      var dadosPlanilha = aba.getDataRange().getValues();
      var eAbaBroker = (aba.getName().toUpperCase().includes("BROKER"));


      if (eAbaBroker) {
        for (var i = 0; i < dadosPlanilha.length; i++) {
          var linha = dadosPlanilha[i];
          var relBroker  = String(linha[0]).trim().toUpperCase();
          var mesBrokerD = String(linha[3]).replace(/\D/g, "").trim();


          if (relBroker === "") continue;


          for (var e = 0; e < emailsProcessados.length; e++) {
            var itemEmail = emailsProcessados[e];
            if (!itemEmail.isBroker || ticketsUsados[itemEmail.ticket]) continue;


            var brokerBate = (relBroker === itemEmail.operadora || relBroker.includes(itemEmail.operadora) || itemEmail.operadora.includes(relBroker));
            var mesBate = (mesBrokerD !== "" && itemEmail.mesCod !== "" && mesBrokerD === itemEmail.mesCod);


            if (brokerBate && mesBate) {
              var urlExclusivaBroker = URL_JIRA_BASE + itemEmail.ticket;
              inserirLinkNativo(aba, i + 1, 12, itemEmail.ticket, urlExclusivaBroker);
             
              if (itemEmail.statusJira) {
                aba.getRange(i + 1, 13).setValue(itemEmail.statusJira);
              }
             
              ticketsUsados[itemEmail.ticket] = true;
              contadorFAT++;
              break;
            }
          }
        }
      } else {
        for (var e = 0; e < emailsProcessados.length; e++) {
          var param = emailsProcessados[e];
          if (param.isBroker || ticketsUsados[param.ticket]) continue;


          for (var i = 0; i < dadosPlanilha.length; i++) {
            var chaveLinha = aba.getName() + "_" + (i + 1);
            if (linhasPreenchidas[chaveLinha]) continue;


            var linha = dadosPlanilha[i];
            var brisaP   = String(linha[1]).trim().toUpperCase(); // Coluna B
            var opP      = String(linha[2]).trim().toUpperCase(); // Coluna C
            var relP     = String(linha[3]).trim().toUpperCase(); // Coluna D
           
            var mesP = String(linha[6]).replace(/\D/g, "").trim(); // Coluna G (AAAAMM)
            if (mesP === "" && linha[6] instanceof Date) {
              var ano = linha[6].getFullYear();
              var mes = (linha[6].getMonth() + 1).toString();
              if (mes.length === 1) mes = "0" + mes;
              mesP = ano + mes;
            }


            var mesCoincide    = (mesP !== "" && param.mesCod !== "" && mesP === param.mesCod);
            var opCoincide     = (opP !== "" && (opP === param.operadora || opP.includes(param.operadora) || param.operadora.includes(opP)));
           
            // Validações Flexíveis para Serviço Brisanet e Relacionado
            var brisaCoincide  = (param.servicoBrisa === "" || brisaP.includes(param.servicoBrisa) || param.servicoBrisa.includes(brisaP));
            var relCoincide    = checarServicoRelacionado(relP, param.servicoRel);


            if (mesCoincide && opCoincide && brisaCoincide && relCoincide) {
              var urlExclusivaDetraf = URL_JIRA_BASE + param.ticket;
             
              // Inserção estrita na Coluna V (22)
              inserirLinkNativo(aba, i + 1, 22, param.ticket, urlExclusivaDetraf);


              if (param.statusJira) {
                // Inserção do Status na Coluna W (23)
                aba.getRange(i + 1, 23).setValue(param.statusJira);
              }
             
              ticketsUsados[param.ticket] = true;
              linhasPreenchidas[chaveLinha] = true;
              contadorFAT++;
              break;
            }
          }
        }
      }
    }
  }


  // =========================================================================
  // ETAPA 2: BATIMENTO DE CAP- PELO VALOR DO ENCONTRO DE CONTAS (COLUNA Q)
  // =========================================================================
  var threadsCAP = GmailApp.search('subject:CAP-');


  if (threadsCAP.length > 0) {
    var chamadosCap = [];


    for (var tc = 0; tc < threadsCAP.length; tc++) {
      var msgsCap = threadsCAP[tc].getMessages();
      for (var mc = 0; mc < msgsCap.length; mc++) {
        var msgC = msgsCap[mc];
        var subjCap = msgC.getSubject().trim();


        var corpoCap = "";
        try { corpoCap = msgC.getPlainBody() || ""; } catch (err) {}
        try { corpoCap += " " + (msgC.getBody() || ""); } catch (err) {}


        var capParam = extrairParametrosCAP(subjCap, corpoCap);
       
        if (capParam.ticketCap !== "" && capParam.valor > 0) {
          chamadosCap.push(capParam);
        }
      }
    }


    var capsUsados = {};
    var todasAbasPlanilha = ss.getSheets();


    for (var ab = 0; ab < todasAbasPlanilha.length; ab++) {
      var abaCap = todasAbasPlanilha[ab];
      if (abaCap.getName().toUpperCase().includes("BROKER")) continue;


      var dadosPlanilhaCap = abaCap.getDataRange().getValues();


      for (var c = 0; c < chamadosCap.length; c++) {
        var itemCap = chamadosCap[c];
        if (capsUsados[itemCap.ticketCap]) continue;


        for (var iC = 0; iC < dadosPlanilhaCap.length; iC++) {
          var linhaC = dadosPlanilhaCap[iC];


          var opCapP  = String(linhaC[2]).trim().toUpperCase(); // Coluna C (Operadora)
          var valorEncontroContas = Math.abs(converterParaNumero(linhaC[16])) || Math.abs(converterParaNumero(linhaC[15]));
          var capAtual = String(linhaC[26]).trim(); // Coluna AA (27)


          var opBate = true;
          if (itemCap.operadora !== "") {
            opBate = (opCapP !== "" && (opCapP === itemCap.operadora || opCapP.includes(itemCap.operadora) || itemCap.operadora.includes(opCapP)));
            if (itemCap.operadora === "EMBRATEL" && opCapP === "CLARO") opBate = true;
          }


          var valorBate = (valorEncontroContas > 0 && Math.abs(itemCap.valor - valorEncontroContas) < 0.05);
          var celulaLivre = (capAtual === "" || capAtual === "-" || capAtual === "--");


          if (valorBate && opBate && celulaLivre) {
            var urlCap = URL_JIRA_BASE + itemCap.ticketCap;
            inserirLinkNativo(abaCap, iC + 1, 27, itemCap.ticketCap, urlCap);


            if (itemCap.dataPagamento) {
              abaCap.getRange(iC + 1, 28).setValue(itemCap.dataPagamento);
            }


            capsUsados[itemCap.ticketCap] = true;
            contadorCAP++;
            break;
          }
        }
      }
    }
  }


  exibirMensagem(ui, "✅ Sucesso!\n\n• Chamados FAT Validados: " + contadorFAT + "\n• Chamados CAP (Encontro de Contas): " + contadorCAP);
}


// ----------------------------------------------------------------------------
// EXTRACTOR COMPLETO E CORRIGIDO DE PARAMETROS EXATOS
// ----------------------------------------------------------------------------
function extrairParametrosExatos(assunto) {
  var textoLimpo = assunto.toUpperCase().replace(/\s+/g, " ").replace(/_/g, " ").replace(/\./g, "").trim();
  var matchTicket = textoLimpo.match(/FAT-\d+/i);
  var ticket = matchTicket ? matchTicket[0].toUpperCase() : "";
 
  var mesCod = "";
  var mesNome = "";
  var meses = {
    "JANEIRO": "01", "FEVEREIRO": "02", "MARCO": "03", "MARÇO": "03",
    "ABRIL": "04", "MAIO": "05", "JUNHO": "06", "JULHO": "07",
    "AGOSTO": "08", "SETEMBRO": "09", "OUTUBRO": "10", "NOVEMBRO": "11", "DEZEMBRO": "12"
  };
 
  for (var mes in meses) {
    if (textoLimpo.includes(mes)) {
      mesNome = mes;
      var matchAno = textoLimpo.match(/20\d{2}/);
      if (matchAno) {
        mesCod = matchAno[0] + meses[mes];
        break;
      }
    }
  }


  var isBroker = textoLimpo.includes("BROKER");
  var operadora = "";


  if (isBroker) {
    if (textoLimpo.includes("SINCH")) operadora = "SINCH";
    else if (textoLimpo.includes("INFOBIP")) operadora = "INFOBIP";
    else if (textoLimpo.includes("ZENVIA")) operadora = "ZENVIA";
  } else {
    if (textoLimpo.includes("SURF")) operadora = "SURF";
    else if (textoLimpo.includes("VIVO") || textoLimpo.includes("TELEFONICA")) operadora = "VIVO";
    else if (textoLimpo.includes("CLARO") || textoLimpo.includes("EMBRATEL")) operadora = "CLARO";
    else if (textoLimpo.includes("TIM")) operadora = "TIM";
    else if (textoLimpo.includes("OI") || textoLimpo.includes("OI_SA")) operadora = "OI";
  }


  // Identificação Direcionada do Serviço Brisanet
  var servicoBrisa = "";
  if (textoLimpo.includes("BRISANET STFC") || textoLimpo.includes("BRISANET FIXA")) {
    servicoBrisa = "STFC";
  } else if (
    textoLimpo.includes("BRISANET SMP") ||
    textoLimpo.includes("BRISANET MOVEL") ||
    textoLimpo.includes("BRISANET MÓVEL")
  ) {
    servicoBrisa = "SMP";
  } else if (textoLimpo.includes("BRISANET ROAMING")) {
    servicoBrisa = "ROAMING";
  }


  // Identificação do Serviço Relacionado da Operadora (Analisa termos após a operadora ou no final do texto)
  var servicoRel = "";
  var trechoOperadora = textoLimpo;
  if (operadora !== "" && textoLimpo.indexOf(operadora) !== -1) {
    trechoOperadora = textoLimpo.substring(textoLimpo.indexOf(operadora));
  }


  if (trechoOperadora.includes("STFC") || trechoOperadora.includes("FIXA") || trechoOperadora.includes("ITX")) {
    servicoRel = "STFC";
  } else if (trechoOperadora.includes("SMP") || trechoOperadora.includes("MOVEL") || trechoOperadora.includes("MÓVEL")) {
    servicoRel = "SMP";
  } else if (trechoOperadora.includes("SMS") || isBroker) {
    servicoRel = "SMS";
  } else {
    // Fallback caso a ordem dos termos no título esteja invertida
    if (textoLimpo.includes("STFC")) servicoRel = "STFC";
    else if (textoLimpo.includes("SMP")) servicoRel = "SMP";
  }


  return {
    ticket: ticket,
    mesCod: mesCod,
    mesNome: mesNome,
    operadora: operadora,
    servicoBrisa: servicoBrisa,
    servicoRel: servicoRel,
    isBroker: isBroker
  };
}


// ----------------------------------------------------------------------------
// FUNÇÕES AUXILIARES DE SUPORTE
// ----------------------------------------------------------------------------
function extrairParametrosCAP(assunto, corpo) {
  var textoCompleto = (assunto + " " + corpo).toUpperCase().replace(/\s+/g, " ");


  var matchCap = textoCompleto.match(/CAP-\d+/i);
  var ticketCap = matchCap ? matchCap[0].toUpperCase() : "";


  var matchData = textoCompleto.match(/\b\d{2}\/\d{2}\/\d{4}\b/);
  var dataPagamento = matchData ? matchData[0] : "";
  var valor = extrairValorMonetario(textoCompleto);


  var operadora = "";
  if (textoCompleto.includes("CLARO") || textoCompleto.includes("EMBRATEL")) {
    operadora = textoCompleto.includes("EMBRATEL") ? "EMBRATEL" : "CLARO";
  } else if (textoCompleto.includes("TIM")) {
    operadora = "TIM";
  } else if (textoCompleto.includes("OI") || textoCompleto.includes("OI_SA")) {
    operadora = "OI";
  } else if (textoCompleto.includes("VIVO") || textoCompleto.includes("TELEFONICA")) {
    operadora = "VIVO";
  } else if (textoCompleto.includes("SURF")) {
    operadora = "SURF";
  }


  return {
    ticketCap: ticketCap,
    dataPagamento: dataPagamento,
    operadora: operadora,
    valor: valor
  };
}


function eAssuntoValidoFAT(assunto) {
  var t = assunto.toUpperCase();
  var temSinalFaturamento = (t.includes("FAT-") && (t.includes("DETRAF") || t.includes("DEROAM") || t.includes("BROKER") || t.includes("NF") || t.includes("MOVEL") || t.includes("MÓVEL") || t.includes("SMP") || t.includes("STFC")));
  var eLixo = (t.includes("CANCELAMENTO") || t.includes("SOLICITAÇÃO") || t.includes("SOLICITACAO") || t.includes("SINISTRO") || t.includes("SUPORTE"));
  return (temSinalFaturamento && !eLixo);
}


function extrairValorMonetario(texto) {
  var match = texto.match(/R\$\s*([\d\.]+(?:,\d{2})?)/i);
  if (match) {
    return converterParaNumero(match[1]);
  }
  return 0;
}


function converterParaNumero(val) {
  if (val === null || val === undefined || val === "") return 0;
  if (typeof val === "number") return val;
  var str = String(val).replace(/[^\d,-]/g, "").replace(",", ".");
  var num = parseFloat(str);
  return isNaN(num) ? 0 : num;
}


function exibirMensagem(ui, texto) {
  if (ui) ui.alert(texto);
  else Logger.log(texto);
}


function inserirLinkNativo(aba, linha, coluna, texto, url) {
  var richText = SpreadsheetApp.newRichTextValue()
    .setText(texto)
    .setLinkUrl(url)
    .build();
  aba.getRange(linha, coluna).setRichTextValue(richText);
}


function extrairUltimoStatusCorpo(corpoTexto) {
  var texto = corpoTexto.replace(/\s+/g, " ");
 
  if (
    texto.match(/status para Solicitação concluída/i) ||
    texto.match(/Solicitação concluída/i) ||
    texto.match(/status para Concluído/i) ||
    texto.match(/Concluído/i) ||
    texto.match(/CLOSED/i) ||
    texto.match(/RESOLVED/i)
  ) {
    return "SOLICITAÇÃO CONCLUÍDA";
  }
  else if (texto.match(/Em andamento/i) || texto.match(/IN PROGRESS/i)) {
    return "EM ANDAMENTO";
  }
  else if (texto.match(/Pendente/i) || texto.match(/PENDING/i)) {
    return "PENDENTE";
  }
  else if (texto.match(/Atentos/i) || texto.match(/recebemos o seu pedido/i)) {
    return "ATENTOS";
  }
 
  return null;
}


function checarServicoRelacionado(relPlanilha, relEmail) {
  if (relEmail === "") return true;
  if (relPlanilha === relEmail) return true;
  if (relPlanilha.includes(relEmail)) return true;
  if (relPlanilha === "SMP/STFC" && (relEmail === "SMP" || relEmail === "STFC")) return true;
  return false;
}