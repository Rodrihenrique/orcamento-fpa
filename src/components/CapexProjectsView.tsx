import React, { useState } from 'react';
import { 
  HardHat, 
  Calendar, 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  Calculator, 
  FileCheck 
} from 'lucide-react';
import type { CapexProject, CostCenter, CalculationMemory } from '../types/budget';
import { MONTHS, MONTHS_SHORT } from '../data/mockData';

interface CapexProjectsViewProps {
  capexProjects: CapexProject[];
  costCenters: CostCenter[];
  onOpenMemoryModal: (title: string, costCenterName: string, accountName: string, memory: CalculationMemory, total: number) => void;
}

export const CapexProjectsView: React.FC<CapexProjectsViewProps> = ({
  capexProjects,
  costCenters,
  onOpenMemoryModal
}) => {
  const [selectedProject, setSelectedProject] = useState<CapexProject | null>(capexProjects[0]);

  const totalCapex = capexProjects.reduce((acc, p) => acc + p.totalInvestment, 0);

  const getTapBadge = (status: string) => {
    switch (status) {
      case 'HOMOLOGADO':
        return (
          <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full text-xs font-semibold">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
            <span>TAP Homologado</span>
          </span>
        );
      case 'EM_ELABORACAO':
        return (
          <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-full text-xs font-semibold">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            <span>TAP em Elaboração (Patrimônio)</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded-full text-xs font-semibold">
            <AlertCircle className="w-3.5 h-3.5 text-slate-500" />
            <span>TAP Pendente de Conclusão</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Banner */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
              <HardHat className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-bold text-slate-900 m-0">Projetos de Investimento (CAPEX)</h2>
          </div>
          <p className="text-xs text-slate-500 m-0">
            Acompanhamento com dupla datação: lançamentos fiscais mensais vs. marco de ativação/imobilização e TAP.
          </p>
        </div>

        <div className="bg-indigo-50/70 border border-indigo-100 rounded-xl px-4 py-2.5 text-right">
          <span className="text-[11px] text-indigo-700 font-medium block">Total em Investimentos Aprovados</span>
          <span className="text-lg font-extrabold text-indigo-950 font-mono">
            {totalCapex.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}
          </span>
        </div>
      </div>

      {/* Regra de Dupla Datação Banner (Item 3.1 do Guia) */}
      <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-2xl p-5 border border-slate-800 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex-shrink-0 mt-0.5">
            <Calendar className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-white m-0">
              Regra de Planejamento CAPEX: Dupla Datação Obrigatória (Item 3.1 do Guia)
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed m-0">
              Para projetos complexos, o planejamento apresenta duas referências distintas:
              <br />
              <strong>1. Lançamentos Fiscais Mensais:</strong> Previsão das notas fiscais e medições conforme a execução física da obra ou desenvolvimento.
              <br />
              <strong>2. Data de Ativação / Imobilização:</strong> Mês em que o projeto estará 100% concluído, em operação comercial e apto à formalização do <strong>TAP (Termo de Aceite Provisório/Definitivo)</strong> com a área de Patrimônio.
            </p>
          </div>
        </div>
      </div>

      {/* Project Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left List of Projects */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1">
            Projetos Estratégicos ({capexProjects.length})
          </h3>
          {capexProjects.map((project) => {
            const isSelected = selectedProject?.id === project.id;
            const cc = costCenters.find((c) => c.id === project.costCenterId);

            return (
              <div
                key={project.id}
                onClick={() => setSelectedProject(project)}
                className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-indigo-50/80 border-indigo-300 shadow-md ring-1 ring-indigo-300'
                    : 'bg-white border-slate-200/80 hover:bg-slate-50 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-mono text-[11px] font-bold text-indigo-700 bg-indigo-100/60 px-2 py-0.5 rounded">
                    {project.code}
                  </span>
                  <span className="font-mono font-bold text-slate-900 text-xs">
                    {project.totalInvestment.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}
                  </span>
                </div>

                <h4 className="text-sm font-bold text-slate-900 line-clamp-1 m-0 mb-1">
                  {project.name}
                </h4>

                <p className="text-xs text-slate-500 line-clamp-2 m-0 mb-3">
                  {project.objective}
                </p>

                <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 text-[11px]">
                  <span className="text-slate-500 truncate max-w-[140px]">{cc?.name}</span>
                  <span className="font-semibold text-indigo-900 flex items-center gap-1">
                    Ativação: {MONTHS_SHORT[project.activationMonth - 1]}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Detail Pane */}
        {selectedProject && (
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-6">
            {/* Detail Header */}
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-5">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                    {selectedProject.code}
                  </span>
                  {getTapBadge(selectedProject.tapStatus)}
                </div>
                <h3 className="text-lg font-bold text-slate-900 m-0">{selectedProject.name}</h3>
                <p className="text-xs text-slate-500 m-0 mt-1">{selectedProject.objective}</p>
              </div>

              <button
                onClick={() => {
                  const cc = costCenters.find((c) => c.id === selectedProject.costCenterId);
                  onOpenMemoryModal(
                    selectedProject.name,
                    cc?.name || '',
                    selectedProject.accountCode,
                    selectedProject.memory,
                    selectedProject.totalInvestment
                  );
                }}
                className="px-3.5 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-blue-200"
              >
                <Calculator className="w-4 h-4 text-blue-600" />
                <span>Memória de Cálculo</span>
              </button>
            </div>

            {/* Dupla Datação Visual Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Box 1: Lançamentos Fiscais */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
                  <Calendar className="w-4 h-4 text-blue-600" />
                  <span>1. Cronograma Fiscal (Medições)</span>
                </div>
                <p className="text-xs text-slate-500 m-0">
                  Desembolsos e medições distribuídos conforme execução mensal.
                </p>
                <div className="text-base font-extrabold text-slate-900 font-mono">
                  {selectedProject.totalInvestment.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}
                </div>
              </div>

              {/* Box 2: Ativação Patrimonial */}
              <div className="bg-emerald-50/60 rounded-xl p-4 border border-emerald-200 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 uppercase tracking-wider">
                  <FileCheck className="w-4 h-4 text-emerald-600" />
                  <span>2. Marco de Ativação / TAP (Item 4.3)</span>
                </div>
                <p className="text-xs text-emerald-700 m-0">
                  Mês de imobilização no ativo da empresa e emissão do TAP.
                </p>
                <div className="text-base font-extrabold text-emerald-900 font-mono">
                  {MONTHS[selectedProject.activationMonth - 1]} / 2026
                </div>
              </div>
            </div>

            {/* Timeline Month-by-Month */}
            <div>
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
                Distribuição Mensal dos Lançamentos Fiscais (Orçado vs. Realizado)
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
                {MONTHS_SHORT.map((m, idx) => {
                  const launch = selectedProject.monthlyFiscalLaunch[idx];
                  const actual = selectedProject.monthlyActual[idx];
                  const isActivationMonth = selectedProject.activationMonth === idx + 1;

                  return (
                    <div
                      key={m}
                      className={`p-2.5 rounded-xl border text-center transition-all ${
                        isActivationMonth
                          ? 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-400'
                          : launch > 0
                          ? 'bg-blue-50/50 border-blue-200'
                          : 'bg-slate-50/50 border-slate-100 opacity-60'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 mb-1">
                        <span>{m}</span>
                        {isActivationMonth && (
                          <span className="text-[9px] bg-emerald-600 text-white px-1.5 py-0.2 rounded font-mono font-bold">
                            TAP
                          </span>
                        )}
                      </div>

                      <div className="text-[11px] font-mono font-semibold text-slate-800">
                        {launch > 0 ? (
                          `R$ ${(launch / 1000).toFixed(0)}k`
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </div>

                      {/* Realizado se houver */}
                      {idx < 6 && (
                        <div className="text-[10px] font-mono text-emerald-700 mt-1 border-t border-slate-200/60 pt-0.5">
                          Real: {actual > 0 ? `R$ ${(actual / 1000).toFixed(0)}k` : '-'}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* TAP Status & Patrimônio Notes */}
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Situação do TAP (Termo de Aceite Provisório)
                </span>
                {getTapBadge(selectedProject.tapStatus)}
              </div>
              <p className="text-xs text-slate-600 leading-relaxed m-0">
                {selectedProject.tapObservations || 'Aguardando encerramento das obras para vistoria da área de Patrimônio.'}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
