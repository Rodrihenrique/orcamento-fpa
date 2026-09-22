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
    <header className="bg-slate-900 text-white sticky top-0 z-50 shadow-md">
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

      {/* Main Header */}
      <div className="px-6 py-3.5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Layers className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight text-white m-0">OrçaHub</h1>
              <span className="text-xs bg-blue-500/20 text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded-full font-medium">
                FP&A Enterprise
              </span>
            </div>
            <p className="text-xs text-slate-400 m-0">Planejamento & Acompanhamento Orçamentário (CAPEX / OPEX)</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1 bg-slate-800/80 p-1 rounded-xl border border-slate-700/60">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'dashboard'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Dashboard DRE</span>
          </button>

          <button
            onClick={() => setActiveTab('opex')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'opex'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <Receipt className="w-4 h-4" />
            <span>OPEX (Operacional)</span>
          </button>

          <button
            onClick={() => setActiveTab('capex')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'capex'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <HardHat className="w-4 h-4" />
            <span>CAPEX & Projetos</span>
          </button>

          <button
            onClick={() => setActiveTab('variance')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all relative ${
              activeTab === 'variance'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <GitCompare className="w-4 h-4" />
            <span>Acompanhamento & Desvios</span>
            <span className="w-2 h-2 rounded-full bg-amber-400 absolute top-2 right-2"></span>
          </button>

          <button
            onClick={() => setActiveTab('premises')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'premises'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <Settings2 className="w-4 h-4" />
            <span>Premissas & Drivers</span>
          </button>

          <button
            onClick={() => setActiveTab('detraf')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'detraf'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <Radio className="w-4 h-4 text-emerald-400" />
            <span>DETRAF (Interconexão)</span>
            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              Telecom
            </span>
          </button>

          <button
            onClick={() => setActiveTab('cashflow')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'cashflow'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <Banknote className="w-4 h-4 text-indigo-400" />
            <span>Fluxo de Caixa (D+N)</span>
          </button>

          <button
            onClick={() => setActiveTab('contracts')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'contracts'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <Building2 className="w-4 h-4 text-amber-400" />
            <span>Contratos de Sites (Torres)</span>
          </button>
        </nav>

        {/* Ações Globais & Governança */}
        <div className="flex items-center gap-2">
          {onOpenBudgetTransferModal && (
            <button
              onClick={onOpenBudgetTransferModal}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-purple-950/60 hover:bg-purple-900/80 text-purple-200 border border-purple-800/60 shadow-sm transition-all cursor-pointer whitespace-nowrap"
              title="Solicitar ou aprovar remanejamento orçamentário entre centros de custo"
            >
              <ArrowRightLeft className="w-3.5 h-3.5 text-purple-400" />
              <span>Remanejamento</span>
            </button>
          )}

          {onOpenAuditLogModal && (
            <button
              onClick={onOpenAuditLogModal}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 shadow-sm transition-all cursor-pointer whitespace-nowrap"
              title="Visualizar trilha de auditoria e conformidade (Audit Log)"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
              <span>Auditoria</span>
            </button>
          )}

          {/* Botão Global de Ação (Acessível em qualquer tela) */}
          <button
            onClick={onOpenNewEntryModal}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white shadow-lg shadow-emerald-500/25 transition-all cursor-pointer hover:scale-105 active:scale-95 whitespace-nowrap"
            title="Importar arquivo ou fazer lançamento manual para qualquer módulo"
          >
            <PlusCircle className="w-4 h-4" />
            <span>+ Novo Lançamento</span>
          </button>
        </div>
      </div>
    </header>
  );
};
