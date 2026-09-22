import React from 'react';
import { 
  LayoutDashboard, 
  Receipt, 
  HardHat, 
  GitCompare, 
  Settings2,
  Calendar,
  Layers,
  Radio,
  PlusCircle,
  Banknote,
  Building2,
  ShieldCheck,
  ArrowRightLeft
} from 'lucide-react';
import type { ScenarioId } from '../types/scenarios';
import { mockScenarios } from '../data/mockScenariosData';

export type TabType = 'dashboard' | 'opex' | 'capex' | 'variance' | 'premises' | 'detraf' | 'cashflow' | 'contracts';

interface NavbarProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  onOpenNewEntryModal: () => void;
  onOpenAuditLogModal?: () => void;
  onOpenBudgetTransferModal?: () => void;
  currentScenarioId?: ScenarioId;
  onScenarioChange?: (scenarioId: ScenarioId) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ 
  activeTab, 
  setActiveTab, 
  onOpenNewEntryModal,
  onOpenAuditLogModal,
  onOpenBudgetTransferModal,
  currentScenarioId = 'BUDGET_ORIGINAL',
  onScenarioChange
}) => {
  return (
    <>
      {/* Barra Azul Superior (Header Principal) */}
      <header className="bg-slate-900 text-white sticky top-0 z-40 shadow-md">
        {/* Top Banner */}
        <div className="border-b border-slate-800 px-6 py-2 flex flex-wrap items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="font-medium text-slate-200">Ambiente Oficial de Orçamento</span>
            <span className="text-slate-600">|</span>
            <span className="flex items-center gap-1 text-slate-300">
              <Calendar className="w-3.5 h-3.5" /> Ciclo Fiscal 2026
            </span>
            <span className="text-slate-600">|</span>
            <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded font-mono font-semibold">
              Fechamento Junho: D+4 Útil (Em Análise)
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-slate-400 hidden md:inline">Diretoria de Operações & Controladoria</span>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-400 font-semibold">Cenário:</span>
              <select
                value={currentScenarioId}
                onChange={(e) => onScenarioChange && onScenarioChange(e.target.value as ScenarioId)}
                className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-blue-300 font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
              >
                {mockScenarios.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Main Header: Logo à Esquerda | Ações no Canto Direito */}
        <div className="px-6 py-3.5 flex items-center justify-between gap-4">
          {/* Logo & Título */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/25">
              <Layers className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold tracking-tight text-white m-0">OrçaHub</h1>
                <span className="text-xs bg-blue-500/20 text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded-full font-semibold">
                  FP&A Enterprise
                </span>
              </div>
              <p className="text-xs text-slate-400 m-0">Planejamento & Acompanhamento Orçamentário (CAPEX / OPEX)</p>
            </div>
          </div>

          {/* Botões de Ação no Canto Direito */}
          <div className="flex items-center gap-2.5">
            {onOpenBudgetTransferModal && (
              <button
                onClick={onOpenBudgetTransferModal}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-purple-950/70 hover:bg-purple-900 text-purple-200 border border-purple-800/70 shadow-sm transition-all cursor-pointer hover:scale-105 active:scale-95 whitespace-nowrap"
                title="Solicitar ou aprovar remanejamento orçamentário entre centros de custo"
              >
                <ArrowRightLeft className="w-3.5 h-3.5 text-purple-400" />
                <span>Remanejamento</span>
              </button>
            )}

            {onOpenAuditLogModal && (
              <button
                onClick={onOpenAuditLogModal}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 shadow-sm transition-all cursor-pointer hover:scale-105 active:scale-95 whitespace-nowrap"
                title="Visualizar trilha de auditoria e conformidade (Audit Log)"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
                <span>Auditoria</span>
              </button>
            )}

            <button
              onClick={onOpenNewEntryModal}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white shadow-lg shadow-emerald-500/25 transition-all cursor-pointer hover:scale-105 active:scale-95 whitespace-nowrap"
              title="Importar arquivo ou fazer lançamento manual para qualquer módulo"
            >
              <PlusCircle className="w-4 h-4" />
              <span>+ Novo Lançamento</span>
            </button>
          </div>
        </div>
      </header>

      {/* Botões Flutuantes de Navegação (Separados da Barra Azul) */}
      <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-1">
        <nav 
          className="bg-white/95 backdrop-blur-md border border-slate-200/90 shadow-lg shadow-slate-200/50 rounded-2xl p-1.5 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-1.5"
          aria-label="Navegação entre módulos"
        >
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer ${
              activeTab === 'dashboard'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
            }`}
            title="Dashboard DRE Consolidado"
          >
            <LayoutDashboard className="w-4 h-4 shrink-0" />
            <span className="truncate">Dashboard</span>
          </button>

          <button
            onClick={() => setActiveTab('opex')}
            className={`flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer ${
              activeTab === 'opex'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
            }`}
            title="Grade de Despesas Operacionais (OPEX)"
          >
            <Receipt className="w-4 h-4 shrink-0" />
            <span className="truncate">OPEX</span>
          </button>

          <button
            onClick={() => setActiveTab('capex')}
            className={`flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer ${
              activeTab === 'capex'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
            }`}
            title="Investimentos & Projetos (CAPEX)"
          >
            <HardHat className="w-4 h-4 shrink-0" />
            <span className="truncate">CAPEX</span>
          </button>

          <button
            onClick={() => setActiveTab('variance')}
            className={`flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer relative ${
              activeTab === 'variance'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
            }`}
            title="Acompanhamento Orçamentário & Análise de Desvios"
          >
            <GitCompare className="w-4 h-4 shrink-0" />
            <span className="truncate">Desvios</span>
            <span className={`w-2 h-2 rounded-full shrink-0 ${
              activeTab === 'variance' ? 'bg-amber-300' : 'bg-amber-500'
            }`}></span>
          </button>

          <button
            onClick={() => setActiveTab('premises')}
            className={`flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer ${
              activeTab === 'premises'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
            }`}
            title="Premissas Orçamentárias & Drivers"
          >
            <Settings2 className="w-4 h-4 shrink-0" />
            <span className="truncate">Premissas</span>
          </button>

          <button
            onClick={() => setActiveTab('detraf')}
            className={`flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer ${
              activeTab === 'detraf'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
            }`}
            title="DETRAF - Faturamento & Interconexão Telecom"
          >
            <Radio className={`w-4 h-4 shrink-0 ${activeTab === 'detraf' ? 'text-white' : 'text-emerald-500'}`} />
            <span className="truncate">DETRAF</span>
            <span className={`px-1 py-0.2 rounded text-[8px] font-bold uppercase shrink-0 ${
              activeTab === 'detraf'
                ? 'bg-white/20 text-white border border-white/30'
                : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
            }`}>
              Tel
            </span>
          </button>

          <button
            onClick={() => setActiveTab('cashflow')}
            className={`flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer ${
              activeTab === 'cashflow'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
            }`}
            title="Calendário de Fluxo de Caixa & Desembolso (D+N)"
          >
            <Banknote className={`w-4 h-4 shrink-0 ${activeTab === 'cashflow' ? 'text-white' : 'text-indigo-500'}`} />
            <span className="truncate">Fluxo de Caixa</span>
          </button>

          <button
            onClick={() => setActiveTab('contracts')}
            className={`flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer ${
              activeTab === 'contracts'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
            }`}
            title="Gestão de Contratos de Locação de Sites e Torres (Rent Roll)"
          >
            <Building2 className={`w-4 h-4 shrink-0 ${activeTab === 'contracts' ? 'text-white' : 'text-amber-500'}`} />
            <span className="truncate">Torres & Sites</span>
          </button>
        </nav>
      </div>
    </>
  );
};
