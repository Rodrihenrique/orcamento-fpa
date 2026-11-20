// ==============================================================================
// CONFIGURAÇÃO — único lugar com IDs, nomes de abas e limites.
// Os valores ficam em Propriedades do Script (nunca no código do repositório).
// Preencha uma vez com configurarInicial() (ver README).
// ==============================================================================

var CONFIG_PADRAO = {
  // Nomes de abas (convenção documentada no README)
  ABA_CONTROLE: 'Controle - DETRAF E DEROAM',   // aba da planilha ORIGINAL de Controle (colunas I/J)
  ABA_LANCAMENTOS: 'Lancamentos',
  ABA_LOG: 'Log',
  ABA_MODELO_DETALHE: 'Modelo',   // aba de onde cada AAAAMM do detalhe mensal é copiada
  // Regras de validação
  LIMITE_VARIACAO_PCT: '30',   // aviso se o valor variar mais que isso contra o mês anterior
  TOLERANCIA_TOTAL_CENTAVOS: '1',
  // Versão registrada no log
  VERSAO_SISTEMA: '0.3.0'
};

var CONFIG_OBRIGATORIAS = [
  'ID_PLANILHA_CONTROLE',  // ORIGINAL "Controle de DETRAF BRISANET 3.0" (só colunas I/J são escritas)
  'ID_PLANILHA_DEVEDOR',   // ORIGINAL "DETRAF Devedor - AAAA" (blocos de RECEBIMENTO por mês)
  'ID_PLANILHA_DETALHE',   // planilha do SISTEMA: abas Lancamentos, Log e AAAAMM (fonte da verdade)
  'ID_PLANILHA_EOT',       // Anexo 5 (mapa EOT → operadora/UF/tipo). Opcional: GID_ABA_EOT
  'ID_PASTA_ORIGINAIS',    // pasta "Originais" no Drive (uma subpasta por período)
  'USUARIOS_AUTORIZADOS'   // e-mails separados por vírgula
];

function Config_obter(chave) {
  var v = PropertiesService.getScriptProperties().getProperty(chave);
  if (v !== null && v !== '') return v;
  return CONFIG_PADRAO.hasOwnProperty(chave) ? CONFIG_PADRAO[chave] : '';
}

function Config_faltando() {
  return CONFIG_OBRIGATORIAS.filter(function (k) { return !Config_obter(k); });
}

/**
 * Grava as propriedades. Chame passando os valores no console do editor:
 *   configurarInicial({ID_PLANILHA_CONTROLE:'...', ...})
 * Sem argumento, só confere o que falta. Nunca commite IDs no repositório.
 */
function configurarInicial(valores) {
  if (valores) PropertiesService.getScriptProperties().setProperties(valores, false);
  var faltando = Config_faltando();
  if (faltando.length) throw new Error('Faltam configurações: ' + faltando.join(', '));
  return 'Configuração completa.';
}

function Config_usuarioAutorizado(email) {
  if (!email) return false;
  var lista = Config_obter('USUARIOS_AUTORIZADOS').toLowerCase().split(',')
    .map(function (s) { return s.trim(); }).filter(Boolean);
  return lista.indexOf(String(email).toLowerCase()) !== -1;
}
