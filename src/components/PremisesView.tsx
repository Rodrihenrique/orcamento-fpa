import React from 'react';
import { 
  Settings2, 
  DollarSign, 
  TrendingUp, 
  Users, 
  ShieldAlert, 
  Clock
} from 'lucide-react';
import type { CorporatePremises } from '../types/budget';

interface PremisesViewProps {
  premises: CorporatePremises;
}

export const PremisesView: React.FC<PremisesViewProps> = ({ premises }) => {
  return (
    <div className="space-y-6 pb-12">
      {/* Banner */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
              <Settings2 className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-bold text-slate-900 m-0">Portal Oficial de Premissas Corporativas</h2>
          </div>
          <p className="text-xs text-slate-500 m-0">
            Diretrizes corporativas homologadas pela Equipe de Orçamento para o Ciclo Fiscal 2026 (Item 4.4 do Guia).
          </p>
        </div>

        <div className="bg-blue-50/70 border border-blue-100 rounded-xl px-4 py-2.5 text-right">
          <span className="text-[11px] text-blue-700 font-medium block">Status das Premissas</span>
          <span className="text-sm font-bold text-blue-950">Vigentes e Padronizadas</span>
        </div>
      </div>

      {/* Regra do Portal de Premissas (Item 4.4) */}
      <div className="bg-gradient-to-r from-slate-900 to-blue-950 text-white rounded-2xl p-5 border border-slate-800 shadow-sm flex items-start gap-3">
        <ShieldAlert className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
        <div className="text-xs space-y-1">
          <h4 className="font-bold text-white m-0">
            Referência Única Oficial (Item 4.4 do Guia Orçamentário)
          </h4>
          <p className="text-slate-300 leading-relaxed m-0">
            As informações deste portal devem ser utilizadas obrigatoriamente por todos os gestores na elaboração e revisão do orçamento. Sempre que houver atualização de uma premissa (como taxa de câmbio ou índice de inflação), as áreas devem avaliar o impacto nos valores já projetados.
          </p>
        </div>
      </div>

      {/* Grid of Premises */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Box 1: Câmbio Oficial */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
            <DollarSign className="w-4 h-4 text-emerald-600" />
            <span>Taxas de Câmbio Oficiais (USD / EUR)</span>
          </div>
          <p className="text-xs text-slate-500 m-0">
            Utilizadas obrigatoriamente para contratos internacionais e importação de equipamentos.
          </p>

          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-xs font-semibold text-slate-700">Dólar Americano (USD)</span>
              <span className="font-mono font-extrabold text-slate-900 text-sm">
                R$ {premises.usdRate.toFixed(2)}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-xs font-semibold text-slate-700">Euro (EUR)</span>
              <span className="font-mono font-extrabold text-slate-900 text-sm">
                R$ {premises.eurRate.toFixed(2)}
              </span>
            </div>
          </div>
          <span className="text-[10px] text-slate-400 block italic">
            * Cotações fixadas para todo o ciclo base 2026. Revisões avaliadas trimestralmente no Forecast.
          </span>
        </div>

        {/* Box 2: Inflação & Reajustes */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
            <TrendingUp className="w-4 h-4 text-blue-600" />
            <span>Índices de Inflação & Reajustes Contratuais</span>
          </div>
          <p className="text-xs text-slate-500 m-0">
            Índices validados pela Área de Contratos para aplicação nas datas de aniversário (Item 3.2).
          </p>

          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-xs font-semibold text-slate-700">IPCA Projetado (Serviços Gerais)</span>
              <span className="font-mono font-extrabold text-blue-900 text-sm">
                {premises.ipcaRate.toFixed(1)}% a.a.
              </span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-xs font-semibold text-slate-700">IGP-M Projetado (Locações/Frotas)</span>
              <span className="font-mono font-extrabold text-blue-900 text-sm">
                {premises.igpmRate.toFixed(1)}% a.a.
              </span>
            </div>
          </div>
          <span className="text-[10px] text-slate-400 block italic">
            * Aplicável somente a partir do mês de renovação contratual pactuado.
          </span>
        </div>

        {/* Box 3: Fechamento Contábil & Provisões */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
            <Clock className="w-4 h-4 text-amber-600" />
            <span>Regime de Competência & Provisões (Item 4.1)</span>
          </div>
          <p className="text-xs text-slate-500 m-0">
            Regras de corte mensal para reconhecimento de custos e reversão de provisões.
          </p>

          <div className="space-y-2 pt-1">
            <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-200 text-xs text-amber-950 space-y-1">
              <span className="font-bold block">Prazo Limite de Provisionamento:</span>
              <p className="m-0 font-mono font-bold text-sm text-amber-900">
                {premises.closingDeadline}
              </p>
              <p className="text-[11px] text-amber-800 m-0 pt-1">
                Custos incorridos e não faturados devem ser provisionados para evitar desvios temporais na competência.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Onboarding Pack Reference Card */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-600" />
            <div>
              <h3 className="text-base font-bold text-slate-900 m-0">
                Tabela de Custo Completo por Novo Colaborador (Onboarding Pack - Item 2.2 c)
              </h3>
              <p className="text-xs text-slate-500 m-0">
                Valores padronizados para compor o custo integral de cada nova contratação nas áreas técnicas e operacionais.
              </p>
            </div>
          </div>
          <span className="text-xs font-mono font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-3 py-1 rounded-lg">
            Pacote Técnico Padrão
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-slate-500 block">Notebook & Celular TI</span>
            <span className="font-mono font-bold text-slate-900 text-sm">
              R$ {premises.onboardingPack.notebookPhone.toLocaleString('pt-BR')} (Único)
            </span>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-slate-500 block">Kit EPIs + Uniforme</span>
            <span className="font-mono font-bold text-slate-900 text-sm">
              R$ {premises.onboardingPack.epiUniform.toLocaleString('pt-BR')} (Único)
            </span>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-slate-500 block">Treinamento & Integração</span>
            <span className="font-mono font-bold text-slate-900 text-sm">
              R$ {premises.onboardingPack.training.toLocaleString('pt-BR')} (Único)
            </span>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-slate-500 block">Licenças de Sistemas</span>
            <span className="font-mono font-bold text-slate-900 text-sm">
              R$ {premises.onboardingPack.systemLicensesMonthly.toLocaleString('pt-BR')} / mês
            </span>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-slate-500 block">Estrutura de Frota / Veículo</span>
            <span className="font-mono font-bold text-slate-900 text-sm">
              R$ {premises.onboardingPack.fleetMonthly.toLocaleString('pt-BR')} / mês
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
