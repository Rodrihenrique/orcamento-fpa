import React from 'react';
import { 
  LayoutDashboard, 
  Receipt, 
  HardHat, 
  GitCompare, 
  Settings2,
  Calendar,
  Layers
} from 'lucide-react';

export type TabType = 'dashboard' | 'opex' | 'capex' | 'variance' | 'premises';

interface NavbarProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab }) => {
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
          <span className="text-slate-400">Diretoria de Operações & Controladoria</span>
          <span className="bg-slate-800 px-2.5 py-1 rounded text-slate-300 font-mono">
            Versão: Baseline v1.3
          </span>
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
        </nav>
      </div>
    </header>
  );
};
