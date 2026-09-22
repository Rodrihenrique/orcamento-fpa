import React, { useState } from 'react';
import { 
  Receipt, 
  Calculator, 
  Filter, 
  UserPlus, 
  Search,
  Trash2,
  FileSpreadsheet
} from 'lucide-react';
import type { OpexItem, CostCenter, Account, CalculationMemory } from '../types/budget';
import { MONTHS_SHORT } from '../data/mockData';
import { exportOpexToExcel } from '../services/exportService';

interface OpexGridProps {
  opexItems: OpexItem[];
  costCenters: CostCenter[];
  accounts: Account[];
  onOpenMemoryModal: (title: string, costCenterName: string, accountName: string, memory: CalculationMemory, total: number) => void;
  onDeleteOpexItem?: (id: string) => void;
}

export const OpexGrid: React.FC<OpexGridProps> = ({
  opexItems,
  costCenters,
  accounts,
  onOpenMemoryModal,
  onDeleteOpexItem
}) => {
  const [selectedCostCenter, setSelectedCostCenter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [showOnboardingModal, setShowOnboardingModal] = useState<boolean>(false);

  // Filter items
  const filteredItems = opexItems.filter(item => {
    const matchesCC = selectedCostCenter === 'ALL' || item.costCenterId === selectedCostCenter;
    const matchesSearch = item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          item.accountCode.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCC && matchesSearch;
  });

  // Calculate monthly totals
  const monthlyTotals = MONTHS_SHORT.map((_, mIdx) => 
    filteredItems.reduce((acc, item) => acc + (item.monthlyBudget[mIdx] || 0), 0)
  );
  const grandTotal = monthlyTotals.reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
              <Receipt className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-bold text-slate-900 m-0">Grade de Despesas Operacionais (OPEX)</h2>
          </div>
          <p className="text-xs text-slate-500 m-0">
            Distribuição orçamentária mensal por competência e centro de custo, com memória de cálculo auditável.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => exportOpexToExcel(filteredItems, costCenters, accounts)}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 flex items-center gap-2 transition-colors shadow-sm cursor-pointer"
            title="Exportar planilha Excel completa com fórmulas"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Exportar Excel (.xlsx)</span>
          </button>

          <button
            onClick={() => setShowOnboardingModal(true)}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 flex items-center gap-2 transition-colors shadow-sm cursor-pointer"
          >
            <UserPlus className="w-4 h-4 text-indigo-600" />
            <span>Simulador Onboarding Pack</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-[280px]">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por descrição da despesa ou conta contábil..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-xs text-slate-500">Centro de Custo:</span>
          <select
            value={selectedCostCenter}
            onChange={(e) => setSelectedCostCenter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="ALL">Todos os Centros de Custo</option>
            {costCenters.map((cc) => (
              <option key={cc.id} value={cc.id}>
                {cc.code} - {cc.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Budget Grid Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-900 text-white font-semibold">
              <tr>
                <th className="px-4 py-3.5 sticky left-0 z-20 bg-slate-900 min-w-[280px]">
                  Descrição da Despesa / Conta
                </th>
                <th className="px-3 py-3.5 min-w-[140px]">Centro de Custo</th>
                <th className="px-3 py-3.5 text-center min-w-[90px]">Memória</th>
                <th className="px-2.5 py-3.5 text-center min-w-[65px]">Ações</th>
                {MONTHS_SHORT.map((m) => (
                  <th key={m} className="px-3 py-3.5 text-right min-w-[90px] font-mono">
                    {m}
                  </th>
                ))}
                <th className="px-4 py-3.5 text-right sticky right-0 z-20 bg-slate-900 min-w-[110px] font-mono font-bold text-emerald-400">
                  Total Anual
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredItems.map((item) => {
                const cc = costCenters.find((c) => c.id === item.costCenterId);
                const acc = accounts.find((a) => a.code === item.accountCode);
                const lineTotal = item.monthlyBudget.reduce((a, b) => a + b, 0);

                return (
                  <tr key={item.id} className="hover:bg-blue-50/40 transition-colors group">
                    {/* Description & Account */}
                    <td className="px-4 py-3 sticky left-0 z-10 bg-white group-hover:bg-blue-50/40 border-r border-slate-200/80">
                      <div className="font-semibold text-slate-900 text-xs">{item.description}</div>
                      <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                        {item.accountCode} - {acc?.name || 'Conta Operacional'}
                      </div>
                    </td>

                    {/* Cost Center */}
                    <td className="px-3 py-3 text-slate-700">
                      <span className="font-medium text-slate-900 block">{cc?.name || 'Geral'}</span>
                      <span className="text-[10px] text-slate-400 font-mono">{cc?.code}</span>
                    </td>

                    {/* Memory Modal Trigger */}
                    <td className="px-3 py-3 text-center">
                      <button
                        onClick={() =>
                          onOpenMemoryModal(
                            item.description,
                            cc?.name || '',
                            `${item.accountCode} - ${acc?.name || ''}`,
                            item.memory,
                            lineTotal
                          )
                        }
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white transition-all text-[11px] font-medium border border-blue-200/80 cursor-pointer"
                        title="Ver fórmula e memória de cálculo"
                      >
                        <Calculator className="w-3.5 h-3.5" />
                        <span>Fórmula</span>
                      </button>
                    </td>

                    {/* Delete Action */}
                    <td className="px-2.5 py-3 text-center">
                      {onDeleteOpexItem && (
                        <button
                          onClick={() => {
                            if (window.confirm(`Deseja realmente excluir a despesa "${item.description}"?`)) {
                              onDeleteOpexItem(item.id);
                            }
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer inline-flex items-center justify-center"
                          title="Excluir lançamento de OPEX"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>

                    {/* 12 Months Budget */}
                    {item.monthlyBudget.map((val, idx) => (
                      <td key={idx} className="px-3 py-3 text-right font-mono text-slate-700 text-[11px]">
                        {val > 0 ? (
                          val.toLocaleString('pt-BR', { maximumFractionDigits: 0 })
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                    ))}

                    {/* Total Anual Sticky Right */}
                    <td className="px-4 py-3 text-right font-mono font-bold text-slate-900 text-xs sticky right-0 z-10 bg-slate-50 group-hover:bg-blue-100/50 border-l border-slate-200/80">
                      {lineTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}
                    </td>
                  </tr>
                );
              })}

              {/* Total Footer Row */}
              <tr className="bg-slate-900 text-white font-bold text-xs border-t-2 border-slate-700">
                <td className="px-4 py-3.5 sticky left-0 z-20 bg-slate-900 border-r border-slate-800">
                  TOTAL OPEX CONSOLIDADO
                </td>
                <td className="px-3 py-3.5 text-slate-400 font-mono text-[11px]">
                  {filteredItems.length} linhas
                </td>
                <td className="px-3 py-3.5 text-center text-slate-400">-</td>
                <td className="px-2.5 py-3.5 text-center text-slate-400">-</td>
                {monthlyTotals.map((tot, idx) => (
                  <td key={idx} className="px-3 py-3.5 text-right font-mono text-[11px] text-blue-300">
                    {tot.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                  </td>
                ))}
                <td className="px-4 py-3.5 text-right font-mono font-extrabold text-emerald-400 sticky right-0 z-20 bg-slate-900 border-l border-slate-800">
                  {grandTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Onboarding Pack Modal (Regra 2.2 c do Guia) */}
      {showOnboardingModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-bold text-slate-900 m-0">Simulador de Onboarding Pack</h3>
              </div>
              <button 
                onClick={() => setShowOnboardingModal(false)}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold px-2 py-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed m-0">
              Conforme o <strong>Item 2.2 (c) do Guia</strong>, o orçamento de novas admissões deve contemplar o <em>custo completo do colaborador</em>, e não apenas salário e encargos.
            </p>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2.5 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-200">
                <span className="text-slate-600">Notebook Corporativo & Celular (TI):</span>
                <span className="font-mono font-semibold text-slate-900">R$ 4.800 (Único)</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200">
                <span className="text-slate-600">Kit EPIs + Uniformes de Campo:</span>
                <span className="font-mono font-semibold text-slate-900">R$ 1.200 (Único)</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200">
                <span className="text-slate-600">Treinamento & Integração Obrigatória:</span>
                <span className="font-mono font-semibold text-slate-900">R$ 800 (Único)</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200">
                <span className="text-slate-600">Licenças de Softwares / Sistemas:</span>
                <span className="font-mono font-semibold text-slate-900">R$ 350 / mês</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-600">Estrutura de Frota & Combustível:</span>
                <span className="font-mono font-semibold text-slate-900">R$ 1.200 / mês</span>
              </div>
            </div>

            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3 flex items-center justify-between">
              <span className="text-xs font-bold text-indigo-900">Custo Total de Entrada (1 Técnico):</span>
              <span className="font-mono font-extrabold text-indigo-900 text-sm">R$ 6.800 + R$ 1.550/mês</span>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowOnboardingModal(false)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer"
              >
                Fechar Simulador
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
