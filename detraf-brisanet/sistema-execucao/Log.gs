// ==============================================================================
// LOG DE AUDITORIA — quem, quando, arquivo, hash, resultado, versão.
// Falha ao logar nunca derruba a operação principal.
// ==============================================================================

var LOG_CAB = ['data', 'usuario', 'acao', 'lote', 'arquivos', 'hashes', 'resultado', 'detalhe', 'versao_sistema'];

function Log_registrar(acao, loteId, arquivos, hashes, resultado, detalhe) {
  try {
    var aba = Persist_aba(Config_obter('ABA_LOG'), LOG_CAB);
    aba.appendRow([new Date(), Session.getActiveUser().getEmail(), acao, loteId || '',
      (arquivos || []).join(' | '), (hashes || []).join(','), resultado, detalhe || '', Config_obter('VERSAO_SISTEMA')]);
  } catch (e) {
    console.error('Falha ao gravar log: ' + e.message);
  }
}
