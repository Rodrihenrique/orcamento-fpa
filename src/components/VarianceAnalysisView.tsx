import React, { useState } from 'react';
import { 
  GitCompare, 
  TrendingUp, 
  TrendingDown, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  FileText, 
  Edit3, 
  Calendar,
  Save,
  X
} from 'lucide-react';
import type { VarianceItem, VarianceNature } from '../types/budget';
import { MONTHS } from '../data/mockData';

interface VarianceAnalysisViewProps {
  varianceItems: VarianceItem[];
  onSaveJustification: (updatedItem: VarianceItem) => void;
}

export const VarianceAnalysisView: React.FC<VarianceAnalysisViewProps> = ({
  varianceItems,
  onSaveJustification
}) => {
  const [selectedMonth, setSelectedMonth] = useState<number>(5); // 5 = Junho (0-indexed)
  const [editingItem, setEditingItem] = useState<VarianceItem | null>(null);

  // Form states
  const [nature, setNature] = useState<VarianceNature>('VARIACAO_VOLUME');
  const [justificationText, setJustificationText] = useState<string>('');
  const [actionWhat, setActionWhat] = useState<string>('');
  const [actionWho, setActionWho] = useState<string>('');
  const [actionWhen, setActionWhen] = useState<string>('');

  const openEditModal = (item: VarianceItem) => {
    setEditingItem(item);
    setNature(item.nature || 'VARIACAO_VOLUME');
    setJustificationText(item.justification || '');
    setActionWhat(item.actionPlan?.what || '');
    setActionWho(item.actionPlan?.who || '');
    setActionWhen(item.actionPlan?.when || '');
  };

  const handleSave = () => {
    if (!editingItem) return;

    const updated: VarianceItem = {
      ...editingItem,
      nature,
      justification: justificationText,
      status: 'JUSTIFICADO',
      actionPlan: actionWhat ? {
        what: actionWhat,
        who: actionWho,
        when: actionWhen,
        impactAnnual: editingItem.variance
      } : undefined
    };

    onSaveJustification(updated);
    setEditingItem(null);
  };

  const getNatureLabel = (n?: VarianceNature) => {
    switch (n) {
      case 'ECONOMIA_REAL':
        return <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded text-[11px] font-semibold">Economia Real</span>;
      case 'POSTERGACAO':
        return <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded text-[11px] font-semibold">Postergação / Timing</span>;
      case 'SEM_PROVISAO':
        return <span className="bg-purple-100 text-purple-800 px-2 py-0.5 rounded text-[11px] font-semibold">Sem Provisão Tempestiva</span>;
      case 'VARIACAO_PRECO':
        return <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-[11px] font-semibold">Variação de Preço/Câmbio</span>;
      default:
        return <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[11px] font-semibold">Variação de Volume</span>;
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Banner */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-lg bg-amber-50 text-amber-600">
              <GitCompare className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-bold text-slate-900 m-0">Acompanhamento Mensal & Análise de Desvios</h2>
          </div>
          <p className="text-xs text-slate-500 m-0">
            Comparativo Orçado vs. Realizado (Item 4.10 do Guia) com justificativa de causa-raiz e planos de ação 5W2H.
          </p>
        </div>

        {/* Month Selector */}
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl p-1.5">
          <Calendar className="w-4 h-4 text-slate-500 ml-2" />
          <span className="text-xs text-slate-600 font-medium">Competência:</span>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            {MONTHS.slice(0, 6).map((m, idx) => (
              <option key={m} value={idx}>
                {m} / 2026 {idx === 5 ? '(Fechamento Atual)' : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Regra de Análise de Desvios (Item 4.10 do Guia) */}
      <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-300/60 rounded-2xl p-4 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-slate-700 space-y-1">
          <p className="font-bold text-amber-950 m-0">Diretriz do Guia Orçamentário (Item 4.10):</p>
          <p className="m-0 leading-relaxed">
            Uma variação <strong>favorável</strong> pode decorrer de economia real ou de simples postergação/falta de provisão. Uma variação <strong>desfavorável</strong> exige imediata investigação da causa raiz e formulação de plano de ação formal com responsável e prazo.
          </p>
        </div>
      </div>

      {/* Variance Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-900 text-white font-semibold">
              <tr>
                <th className="px-4 py-3.5 min-w-[220px]">Item / Descrição</th>
                <th className="px-3 py-3.5 min-w-[140px]">Centro de Custo</th>
                <th className="px-3 py-3.5 text-right font-mono min-w-[100px]">Orçado</th>
                <th className="px-3 py-3.5 text-right font-mono min-w-[100px]">Realizado</th>
                <th className="px-3 py-3.5 text-right font-mono min-w-[100px]">Desvio ($)</th>
                <th className="px-3 py-3.5 text-right font-mono min-w-[90px]">Desvio (%)</th>
                <th className="px-3 py-3.5 text-center min-w-[110px]">Classificação</th>
                <th className="px-3 py-3.5 text-center min-w-[130px]">Natureza</th>
                <th className="px-3 py-3.5 text-center min-w-[100px]">Status</th>
                <th className="px-4 py-3.5 text-center min-w-[110px]">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {varianceItems.map((item) => {
                const isFavorable = item.classification === 'FAVORAVEL';

                return (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900 text-xs">{item.description}</div>
                      <div className="text-[11px] text-slate-500 font-mono mt-0.5">{item.accountName}</div>
                    </td>

                    <td className="px-3 py-3 text-slate-700">
                      <span className="font-medium text-slate-800">{item.costCenterName}</span>
                    </td>

                    <td className="px-3 py-3 text-right font-mono text-slate-700">
                      {item.budgeted.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}
                    </td>

                    <td className="px-3 py-3 text-right font-mono font-bold text-slate-900">
                      {item.actual.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}
                    </td>

                    <td className={`px-3 py-3 text-right font-mono font-bold ${isFavorable ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {item.variance > 0 ? '+' : ''}
                      {item.variance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}
                    </td>

                    <td className={`px-3 py-3 text-right font-mono font-bold ${isFavorable ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {item.variancePercent > 0 ? '+' : ''}{item.variancePercent.toFixed(1)}%
                    </td>

                    <td className="px-3 py-3 text-center">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${
                        isFavorable ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        {isFavorable ? <TrendingDown className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />}
                        {item.classification}
                      </span>
                    </td>

                    <td className="px-3 py-3 text-center">
                      {getNatureLabel(item.nature)}
                    </td>

                    <td className="px-3 py-3 text-center">
                      {item.status === 'APROVADO' ? (
                        <span className="text-emerald-700 font-semibold inline-flex items-center gap-1 text-[11px]">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Aprovado
                        </span>
                      ) : item.status === 'JUSTIFICADO' ? (
                        <span className="text-blue-700 font-semibold inline-flex items-center gap-1 text-[11px]">
                          <Clock className="w-3.5 h-3.5" /> Justificado
                        </span>
                      ) : (
                        <span className="text-rose-700 font-semibold inline-flex items-center gap-1 text-[11px]">
                          <AlertCircle className="w-3.5 h-3.5" /> Pendente
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => openEditModal(item)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-blue-600 hover:text-white text-slate-700 transition-all font-medium text-[11px] cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>{item.justification ? 'Editar' : 'Justificar'}</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Justification & 5W2H Action Plan Modal */}
      {editingItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-amber-400" />
                <div>
                  <h3 className="text-base font-bold text-white m-0">Justificativa de Variação Orçamentária</h3>
                  <p className="text-xs text-slate-400 m-0">{editingItem.costCenterName} • {editingItem.description}</p>
                </div>
              </div>
              <button 
                onClick={() => setEditingItem(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form Body */}
            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
              {/* Summary of Variance */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 grid grid-cols-3 gap-3 text-center">
                <div>
                  <span className="text-slate-500 block text-[11px]">Orçado no Mês</span>
                  <span className="font-mono font-bold text-slate-900 text-sm">
                    {editingItem.budgeted.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Realizado Contábil</span>
                  <span className="font-mono font-bold text-slate-900 text-sm">
                    {editingItem.actual.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Desvio Apurado</span>
                  <span className={`font-mono font-bold text-sm ${editingItem.variance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                    {editingItem.variance > 0 ? '+' : ''}
                    {editingItem.variance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
                </div>
              </div>

              {/* Nature Select */}
              <div>
                <label className="font-bold text-slate-800 block mb-1">
                  Natureza / Causa-Raiz do Desvio (Item 4.10 do Guia):
                </label>
                <select
                  value={nature}
                  onChange={(e) => setNature(e.target.value as VarianceNature)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="VARIACAO_VOLUME">Variação de Volume (Maior consumo / novos sites / mais viagens)</option>
                  <option value="VARIACAO_PRECO">Variação de Preço ou Câmbio (Aumento de tarifas ou flutuação do dólar)</option>
                  <option value="POSTERGACAO">Postergação / Calendário (Atividade adiada ou faturamento atrasado)</option>
                  <option value="SEM_PROVISAO">Ausência de Provisão Tempestiva (Custo incorrido não provisionado em D+4)</option>
                  <option value="ECONOMIA_REAL">Economia Real (Renegociação de contrato ou ganho de eficiência)</option>
                </select>
              </div>

              {/* Justification Text */}
              <div>
                <label className="font-bold text-slate-800 block mb-1">
                  Parecer Explicativo do Gestor (Obrigatório):
                </label>
                <textarea
                  rows={4}
                  value={justificationText}
                  onChange={(e) => setJustificationText(e.target.value)}
                  placeholder="Explique a causa raiz do desvio e se ele é pontual ou recorrente para os próximos meses..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs leading-relaxed focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              {/* Action Plan 5W2H */}
              <div className="border-t border-slate-200 pt-3 space-y-3">
                <span className="font-bold text-slate-900 uppercase tracking-wider block">
                  Plano de Ação Corretiva (5W2H) - Obrigatório para Desvios Desfavoráveis
                </span>

                <div>
                  <label className="text-slate-600 block mb-1">O que será feito (Ação):</label>
                  <input
                    type="text"
                    value={actionWhat}
                    onChange={(e) => setActionWhat(e.target.value)}
                    placeholder="Ex: Renegociar contrato, instalar para-raios reforçados, etc."
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-600 block mb-1">Quem (Responsável):</label>
                    <input
                      type="text"
                      value={actionWho}
                      onChange={(e) => setActionWho(e.target.value)}
                      placeholder="Ex: Rafael Silva (Coord. Operações)"
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-slate-600 block mb-1">Até Quando (Prazo):</label>
                    <input
                      type="text"
                      value={actionWhen}
                      onChange={(e) => setActionWhen(e.target.value)}
                      placeholder="Ex: 15/08/2026"
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                A justificativa será enviada para homologação da Gerência Executiva de Telefonia.
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setEditingItem(null)}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-100 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>Salvar Justificativa</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
