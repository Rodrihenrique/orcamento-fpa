import React, { useState } from 'react';
import { 
  X, ArrowRightLeft, CheckCircle2, XCircle, Clock,
  AlertCircle, DollarSign, Send, FileText, Check, ShieldAlert
} from 'lucide-react';
import type { BudgetTransferRequest } from '../types/governance';

interface BudgetTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  transfers: BudgetTransferRequest[];
  onCreateTransfer: (newTransfer: Omit<BudgetTransferRequest, 'id' | 'protocol' | 'createdAt' | 'status'>) => void;
  onApproveTransfer: (transferId: string) => void;
  onRejectTransfer: (transferId: string) => void;
}

const COST_CENTERS = [
  '1010 - Engenharia de Redes & Sites',
  '1020 - Operações & NOC',
  '1030 - Datacenter & Cloud TI',
  '1040 - Administrativo & Facilities',
  '1050 - Jurídico & Regulatório'
];

export const BudgetTransferModal: React.FC<BudgetTransferModalProps> = ({
  isOpen,
  onClose,
  transfers,
  onCreateTransfer,
  onApproveTransfer,
  onRejectTransfer
}) => {
  const [activeTab, setActiveTab] = useState<'NEW' | 'LIST'>('LIST');

  // Form states
  const [sourceCC, setSourceCC] = useState(COST_CENTERS[0]);
  const [targetCC, setTargetCC] = useState(COST_CENTERS[1]);
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Manutenção de Infraestrutura');
  const [effectiveMonth, setEffectiveMonth] = useState('Março/2026');
  const [justification, setJustification] = useState('');
  const [requester, setRequester] = useState('rodrigo.henrique@grupobrisanet.com.br');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount.replace(/[^\d]/g, '')) / 100 || parseFloat(amount) || 0;
    
    if (parsedAmount <= 0) {
      alert('Por favor, informe um valor válido para o remanejamento.');
      return;
    }

    if (sourceCC === targetCC) {
      alert('O Centro de Custo de Origem não pode ser igual ao de Destino.');
      return;
    }

    if (!justification.trim()) {
      alert('A justificativa técnica/gerencial é obrigatória para compliance orçamentário.');
      return;
    }

    onCreateTransfer({
      requester,
      sourceCostCenter: sourceCC,
      targetCostCenter: targetCC,
      amount: parsedAmount,
      category,
      effectiveMonth,
      justification
    });

    // Reset & switch to list
    setAmount('');
    setJustification('');
    setActiveTab('LIST');
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-md shadow-purple-200">
              <ArrowRightLeft className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900">Remanejamento Orçamentário & Suplementações</h2>
                <span className="bg-purple-100 text-purple-800 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border border-purple-200">
                  Workflow de Alçadas
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Transferência de saldo entre Centros de Custo com controle de saldo e aprovação do Controller.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 pt-3 border-b border-slate-200 bg-white flex gap-4">
          <button
            onClick={() => setActiveTab('LIST')}
            className={`pb-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'LIST'
                ? 'border-purple-600 text-purple-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            Solicitações & Status ({transfers.length})
          </button>
          <button
            onClick={() => setActiveTab('NEW')}
            className={`pb-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'NEW'
                ? 'border-purple-600 text-purple-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Send className="w-3.5 h-3.5" />
            Nova Solicitação de Remanejamento
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'NEW' ? (
            <form onSubmit={handleSubmit} className="space-y-4 max-w-2xl mx-auto">
              <div className="bg-purple-50/50 border border-purple-200/60 rounded-xl p-3.5 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
                <div className="text-xs text-purple-900 leading-relaxed">
                  <strong>Regra de Governança:</strong> Remanejamentos entre centros de custo mantêm o orçamento global inalterado (soma-zero). Valores acima de R$ 50.000,00 exigem parecer formal do Controller FP&A.
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Centro de Custo Cedente (Origem)
                  </label>
                  <select
                    value={sourceCC}
                    onChange={(e) => setSourceCC(e.target.value)}
                    className="w-full text-xs rounded-lg border border-slate-300 p-2 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  >
                    {COST_CENTERS.map(cc => (
                      <option key={cc} value={cc}>{cc}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Centro de Custo Receptor (Destino)
                  </label>
                  <select
                    value={targetCC}
                    onChange={(e) => setTargetCC(e.target.value)}
                    className="w-full text-xs rounded-lg border border-slate-300 p-2 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  >
                    {COST_CENTERS.map(cc => (
                      <option key={cc} value={cc} disabled={cc === sourceCC}>{cc}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Valor a Remanejar (R$)
                  </label>
                  <div className="relative">
                    <DollarSign className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="number"
                      placeholder="Ex: 50000"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      required
                      className="w-full pl-8 pr-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Mês de Efetivação
                  </label>
                  <select
                    value={effectiveMonth}
                    onChange={(e) => setEffectiveMonth(e.target.value)}
                    className="w-full text-xs rounded-lg border border-slate-300 p-2 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  >
                    <option value="Março/2026">Março/2026</option>
                    <option value="Abril/2026">Abril/2026</option>
                    <option value="Maio/2026">Maio/2026</option>
                    <option value="Junho/2026">Junho/2026</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Categoria da Despesa
                </label>
                <input
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full text-xs rounded-lg border border-slate-300 p-2 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  placeholder="Ex: Manutenção de Infraestrutura, Licenças, etc."
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Justificativa Técnica / Gerencial *
                </label>
                <textarea
                  rows={3}
                  value={justification}
                  onChange={(e) => setJustification(e.target.value)}
                  required
                  placeholder="Descreva o motivo da necessidade de suplementação e o impacto caso não seja aprovado..."
                  className="w-full text-xs rounded-lg border border-slate-300 p-2.5 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Solicitante
                </label>
                <input
                  type="email"
                  value={requester}
                  onChange={(e) => setRequester(e.target.value)}
                  className="w-full text-xs rounded-lg border border-slate-300 p-2 bg-slate-50 text-slate-600 focus:outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('LIST')}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  Enviar para Alçada de Aprovação
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              {transfers.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <ArrowRightLeft className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                  <p className="font-semibold text-sm">Nenhum remanejamento registrado</p>
                  <p className="text-xs text-slate-500">Clique na aba "Nova Solicitação" para cadastrar um pedido.</p>
                </div>
              ) : (
                transfers.map((req) => (
                  <div
                    key={req.id}
                    className="border border-slate-200 rounded-xl p-4 bg-slate-50/40 hover:bg-slate-50 transition-all flex flex-col md:flex-row justify-between gap-4"
                  >
                    <div className="space-y-2 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-bold text-slate-700 bg-slate-200/70 px-2 py-0.5 rounded">
                          {req.protocol}
                        </span>
                        
                        {req.status === 'APROVADO' && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded-full">
                            <CheckCircle2 className="w-3 h-3" /> Aprovado
                          </span>
                        )}
                        {req.status === 'PENDENTE' && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-full">
                            <Clock className="w-3 h-3" /> Pendente de Aprovação
                          </span>
                        )}
                        {req.status === 'REJEITADO' && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 bg-rose-100 border border-rose-200 px-2 py-0.5 rounded-full">
                            <XCircle className="w-3 h-3" /> Rejeitado
                          </span>
                        )}

                        <span className="text-xs text-slate-400 font-mono">
                          {req.createdAt}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-xs font-semibold text-slate-800">
                        <span className="text-rose-700 bg-rose-50 px-2 py-1 rounded border border-rose-200">
                          {req.sourceCostCenter}
                        </span>
                        <span className="text-slate-400 font-bold">➔</span>
                        <span className="text-emerald-700 bg-emerald-50 px-2 py-1 rounded border border-emerald-200">
                          {req.targetCostCenter}
                        </span>
                      </div>

                      <p className="text-xs text-slate-600 bg-white p-2 rounded border border-slate-200">
                        <strong className="text-slate-700">Justificativa: </strong>
                        {req.justification}
                      </p>

                      <div className="flex items-center gap-4 text-[11px] text-slate-500">
                        <span><strong>Solicitante:</strong> {req.requester}</span>
                        {req.approver && <span><strong>Aprovador:</strong> {req.approver}</span>}
                        <span><strong>Mês:</strong> {req.effectiveMonth}</span>
                      </div>
                    </div>

                    <div className="flex md:flex-col justify-between items-end shrink-0 text-right gap-2">
                      <div>
                        <div className="text-lg font-black text-purple-700 font-mono">
                          {formatCurrency(req.amount)}
                        </div>
                        <div className="text-[11px] text-slate-500 font-medium">
                          {req.category}
                        </div>
                      </div>

                      {req.status === 'PENDENTE' && (
                        <div className="flex items-center gap-1.5 pt-2">
                          <button
                            onClick={() => onApproveTransfer(req.id)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors shadow-sm"
                            title="Aprovar Remanejamento"
                          >
                            <Check className="w-3.5 h-3.5" />
                            Aprovar
                          </button>
                          <button
                            onClick={() => onRejectTransfer(req.id)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition-colors shadow-sm"
                            title="Rejeitar Remanejamento"
                          >
                            <X className="w-3.5 h-3.5" />
                            Rejeitar
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-purple-600" />
            <span>Alçadas ativas: Gerência até R$ 50k | Diretoria/FP&A acima de R$ 50k.</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 text-white font-medium hover:bg-slate-900 transition-colors shadow-sm"
          >
            Fechar
          </button>
        </div>

      </div>
    </div>
  );
};
