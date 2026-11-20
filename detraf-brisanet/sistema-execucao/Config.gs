// ==============================================================================
// CONFIGURAÇÃO — único lugar com IDs, nomes de abas e limites.
// Os valores ficam em Propriedades do Script (nunca no código).
// Preencha uma vez rodando configurarInicial() pelo editor (ver README).
// ==============================================================================

var CONFIG_PADRAO = {
  // Nomes de abas (convenção documentada no README)
  ABA_LANCAMENTOS: 'Lancamentos',
  ABA_LOG: 'Log',
  // Regras de validação
  LIMITE_VARIACAO_PCT: '30',   // aviso se o valor variar mais que isso contra o mês anterior
  TOLERANCIA_TOTAL_CENTAVOS: '1',
  // Versão do parser registrada no log
  VERSAO_SISTEMA: '0.1.0-esboco'
};

var CONFIG_OBRIGATORIAS = [
  'ID_PLANILHA_DESTINO',   // planilha onde Lancamentos e Log são gravados
  'ID_PLANILHA_EOT',       // planilha do Anexo 5 (mapa EOT → operadora/UF/tipo)
  'ID_PASTA_RAIZ',         // pasta raiz no Drive (originais por período)
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

/** Rode uma vez no editor, passando os valores reais. Não commite os IDs. */
function configurarInicial() {
  var valores = {
    // ID_PLANILHA_DESTINO: '...',
    // ID_PLANILHA_EOT: '...',
    // ID_PASTA_RAIZ: '...',
    // USUARIOS_AUTORIZADOS: 'fulano@empresa.com,ciclano@empresa.com'
  };
  PropertiesService.getScriptProperties().setProperties(valores, false);
  var faltando = Config_faltando();
  if (faltando.length) throw new Error('Faltam configurações: ' + faltando.join(', '));
}

function Config_usuarioAutorizado(email) {
  if (!email) return false;
  var lista = Config_obter('USUARIOS_AUTORIZADOS').toLowerCase().split(',')
    .map(function (s) { return s.trim(); }).filter(Boolean);
  return lista.indexOf(String(email).toLowerCase()) !== -1;
}
