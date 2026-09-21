import React from 'react';
import { X, Calculator, FileText, AlertTriangle, Tag } from 'lucide-react';
import type { CalculationMemory } from '../types/budget';

interface CalculationMemoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  costCenterName: string;
  accountName: string;
  memory: CalculationMemory;
  totalValue: number;
}

export const CalculationMemoryModal: React.FC<CalculationMemoryModalProps> = ({
  isOpen,
  onClose,
  title,
  costCenterName,
  accountName,
  memory,
  totalValue
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white m-0">Memória de Cálculo & Rastreabilidade</h3>
              <p className="text-xs text-slate-400 m-0">{costCenterName} • {accountName}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto text-sm">
          {/* Title & Total Banner */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/80 rounded-xl p-4 flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-blue-700 uppercase tracking-wider">Item Orçado</span>
              <h4 className="text-base font-bold text-slate-900 m-0 mt-0.5">{title}</h4>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-500">Total Anual</span>
              <p className="text-lg font-extrabold text-blue-900 m-0">
                {totalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </p>
            </div>
          </div>

          {/* Formula Box */}
          <div className="bg-slate-900 text-slate-100 rounded-xl p-4 border border-slate-800 space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-blue-400 uppercase tracking-wider">
              <Calculator className="w-4 h-4" />
              <span>Fórmula Paramétrica de Composição</span>
            </div>
            <p className="font-mono text-sm text-emerald-400 bg-slate-950 px-3 py-2 rounded-lg border border-slate-800 break-words m-0">
              {memory.formula}
            </p>
            <p className="text-xs text-slate-400 m-0">
              Regra do Guia: Quantidade × Valor Unitário × Período de Utilização × Reajustes/Tributos.
            </p>
          </div>

          {/* Grid of Drivers and Variables */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
              <span className="text-xs text-slate-500 block">Direcionador (Driver)</span>
              <span className="font-semibold text-slate-800 text-sm">{memory.driverName || 'Valor Contratual Fixo'}</span>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
              <span className="text-xs text-slate-500 block">Quantidade</span>
              <span className="font-semibold text-slate-800 text-sm">{memory.quantity ? memory.quantity.toLocaleString('pt-BR') : 'N/A'}</span>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
              <span className="text-xs text-slate-500 block">Valor Unitário</span>
              <span className="font-semibold text-slate-800 text-sm">
                {memory.unitPrice 
                  ? memory.unitPrice.toLocaleString('pt-BR', { style: 'currency', currency: memory.currency })
                  : 'N/A'}
              </span>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
              <span className="text-xs text-slate-500 block">Periodicidade</span>
              <span className="font-semibold text-slate-800 text-sm">{memory.periodicity}</span>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
              <span className="text-xs text-slate-500 block">Moeda & Câmbio</span>
              <span className="font-semibold text-slate-800 text-sm">
                {memory.currency} {memory.exchangeRate ? `(R$ ${memory.exchangeRate.toFixed(2)})` : '(Moeda Nacional)'}
              </span>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
              <span className="text-xs text-slate-500 block">Reajuste Previsto</span>
              <span className="font-semibold text-slate-800 text-sm">
                {memory.adjustmentRate ? `+${memory.adjustmentRate}% (Mês ${memory.adjustmentMonth})` : 'Sem Reajuste'}
              </span>
            </div>
          </div>

          {/* Justification & Reference */}
          <div className="space-y-3">
            <div>
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                Justificativa da Contratação / Necessidade Operacional
              </span>
              <p className="text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs leading-relaxed m-0">
                {memory.justification}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex items-center gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                <FileText className="w-4 h-4 text-slate-500 flex-shrink-0" />
                <span className="text-slate-500">Contrato:</span>
                <span className="font-mono font-medium text-slate-800">{memory.contractRef || 'Contratação Direta / Proposta'}</span>
              </div>
              <div className="flex items-center gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                <Tag className="w-4 h-4 text-slate-500 flex-shrink-0" />
                <span className="text-slate-500">Fornecedor:</span>
                <span className="font-medium text-slate-800 truncate">{memory.supplier || 'Fornecedor Homologado'}</span>
              </div>
            </div>
          </div>

          {/* Risks & Contingencies */}
          {memory.risks && memory.risks.length > 0 && (
            <div className="border-t border-slate-200 pt-4 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-800 uppercase tracking-wider">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>Riscos, Contingências & Mitigação (Item 4.9 do Guia)</span>
              </div>
              {memory.risks.map((risk) => (
                <div key={risk.id} className="bg-amber-50/70 border border-amber-200 rounded-xl p-3 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-900">{risk.description}</span>
                    <div className="flex items-center gap-1">
                      <span className="bg-amber-200/60 text-amber-800 px-1.5 py-0.5 rounded text-[10px] font-medium">
                        Prob: {risk.probability}
                      </span>
                      <span className="bg-rose-100 text-rose-800 px-1.5 py-0.5 rounded text-[10px] font-medium">
                        Imp: {risk.impact}
                      </span>
                    </div>
                  </div>
                  <p className="text-slate-600 m-0">
                    <strong className="text-slate-700">Ação de Tratamento:</strong> {risk.mitigation}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>Memória auditável conforme Guia Orçamentário corporativo.</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-medium transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
