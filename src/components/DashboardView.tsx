import React from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  AlertCircle, 
  CheckCircle2, 
  HardHat, 
  Receipt,
  Calendar
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import type { OpexItem, CapexProject, VarianceItem, CostCenter } from '../types/budget';
import { MONTHS_SHORT } from '../data/mockData';

interface DashboardViewProps {
  opexItems: OpexItem[];
  capexProjects: CapexProject[];
  varianceItems: VarianceItem[];
  costCenters: CostCenter[];
  onNavigateToVariance: () => void;
  onNavigateToCapex: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  opexItems,
  capexProjects,
  varianceItems,
  costCenters,
  onNavigateToVariance,
  onNavigateToCapex
}) => {
  // Totals calculations
  const totalOpexBudget = opexItems.reduce(
    (acc, item) => acc + item.monthlyBudget.reduce((a, b) => a + b, 0),
    0
  );
  
  // Realized Jan-Jun (first 6 months)
  const totalOpexActualYTD = opexItems.reduce(
    (acc, item) => acc + item.monthlyActual.slice(0, 6).reduce((a, b) => a + b, 0),
    0
  );
  const totalOpexBudgetYTD = opexItems.reduce(
    (acc, item) => acc + item.monthlyBudget.slice(0, 6).reduce((a, b) => a + b, 0),
    0
  );

  const totalCapexBudget = capexProjects.reduce(
    (acc, proj) => acc + proj.totalInvestment,
    0
  );
  const totalCapexActualYTD = capexProjects.reduce(
    (acc, proj) => acc + proj.monthlyActual.slice(0, 6).reduce((a, b) => a + b, 0),
    0
  );
  const totalCapexBudgetYTD = capexProjects.reduce(
    (acc, proj) => acc + proj.monthlyFiscalLaunch.slice(0, 6).reduce((a, b) => a + b, 0),
    0
  );

  const totalBudgetYTD = totalOpexBudgetYTD + totalCapexBudgetYTD;
  const totalActualYTD = totalOpexActualYTD + totalCapexActualYTD;
  const totalVarianceYTD = totalActualYTD - totalBudgetYTD;
  const totalVariancePercent = (totalVarianceYTD / totalBudgetYTD) * 100;

  // Monthly Chart Data (Jan to Dec)
  const monthlyData = MONTHS_SHORT.map((month, idx) => {
    const opexBudgetMonth = opexItems.reduce((acc, item) => acc + (item.monthlyBudget[idx] || 0), 0);
    const capexBudgetMonth = capexProjects.reduce((acc, proj) => acc + (proj.monthlyFiscalLaunch[idx] || 0), 0);
    const totalBudget = opexBudgetMonth + capexBudgetMonth;

    const opexActualMonth = idx < 6 ? opexItems.reduce((acc, item) => acc + (item.monthlyActual[idx] || 0), 0) : null;
    const capexActualMonth = idx < 6 ? capexProjects.reduce((acc, proj) => acc + (proj.monthlyActual[idx] || 0), 0) : null;
    const totalActual = opexActualMonth !== null && capexActualMonth !== null ? opexActualMonth + capexActualMonth : null;

    return {
      name: month,
      Orçado: totalBudget,
      Realizado: totalActual,
      OPEX_Orcado: opexBudgetMonth,
      CAPEX_Orcado: capexBudgetMonth
    };
  });

  // Pie chart by Cost Center (OPEX)
  const costCenterOpexData = costCenters.map(cc => {
    const total = opexItems
      .filter(item => item.costCenterId === cc.id)
      .reduce((acc, item) => acc + item.monthlyBudget.reduce((a, b) => a + b, 0), 0);
    return {
      name: cc.name.split(' ')[0] + ' ' + (cc.name.split(' ')[1] || ''),
      fullName: cc.name,
      value: total
    };
  }).filter(item => item.value > 0);

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#6366f1'];

  const pendingJustifications = varianceItems.filter(v => v.status === 'PENDENTE').length;

  return (
    <div className="space-y-6 pb-12">
      {/* Alert Header */}
      <div className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="bg-blue-500/30 text-blue-200 border border-blue-400/30 text-xs px-2.5 py-0.5 rounded-full font-semibold">
                Visão Executiva Consolidada
              </span>
              <span className="text-xs text-blue-200/80">Competência: 1º Semestre 2026</span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-white m-0">
              Demonstrativo de Desempenho Orçamentário
            </h2>
            <p className="text-sm text-blue-100/80 mt-1 max-w-2xl m-0">
              Acompanhamento integrado de OPEX e CAPEX conforme o regime de competência, controle de lançamentos fiscais e ativação patrimonial.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={onNavigateToVariance}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
            >
              <AlertCircle className="w-4 h-4" />
              <span>Ver {varianceItems.length} Desvios de Junho</span>
            </button>
            <button 
              onClick={onNavigateToCapex}
              className="bg-white/10 hover:bg-white/20 text-white font-semibold px-4 py-2.5 rounded-xl text-xs border border-white/20 flex items-center gap-2 transition-all cursor-pointer"
            >
              <HardHat className="w-4 h-4" />
              <span>Cronograma CAPEX & TAPs</span>
            </button>
          </div>
        </div>
      </div>

      {/* Top 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Orçado Total Anual */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-2">
            <span>Orçamento Global Aprovado</span>
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900 tracking-tight">
            {(totalOpexBudget + totalCapexBudget).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}
          </div>
          <div className="mt-3 flex items-center gap-2 text-xs text-slate-600">
            <span className="font-semibold text-blue-600">OPEX:</span> {(totalOpexBudget).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}
            <span className="text-slate-300">|</span>
            <span className="font-semibold text-indigo-600">CAPEX:</span> {(totalCapexBudget).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}
          </div>
        </div>

        {/* Card 2: Realizado YTD (Jan-Jun) */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-2">
            <span>Realizado YTD (Jan-Jun)</span>
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900 tracking-tight">
            {totalActualYTD.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}
          </div>
          <div className="mt-3 text-xs text-slate-500">
            Orçado no período: <span className="font-medium text-slate-700">{totalBudgetYTD.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}</span>
          </div>
        </div>

        {/* Card 3: Variância YTD */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-2">
            <span>Desvio Acumulado (YTD)</span>
            <div className={`p-2 rounded-lg ${totalVarianceYTD > 0 ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>
              {totalVarianceYTD > 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className={`text-2xl font-extrabold tracking-tight ${totalVarianceYTD > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
              {totalVarianceYTD > 0 ? '+' : ''}
              {totalVarianceYTD.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}
            </span>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${totalVarianceYTD > 0 ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'}`}>
              {totalVarianceYTD > 0 ? '+' : ''}{totalVariancePercent.toFixed(1)}%
            </span>
          </div>
          <div className="mt-3 text-xs text-slate-500">
            {totalVarianceYTD > 0 ? 'Desvio Desfavorável (Acima da Meta)' : 'Desvio Favorável (Economia no Período)'}
          </div>
        </div>

        {/* Card 4: Status de Governança */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-2">
            <span>Governança & Justificativas</span>
            <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-900 tracking-tight">
              {varianceItems.filter(v => v.status === 'JUSTIFICADO' || v.status === 'APROVADO').length} / {varianceItems.length}
            </span>
            <span className="text-xs text-slate-500 font-medium">Justificados</span>
          </div>
          <div className="mt-3 flex items-center gap-2 text-xs">
            {pendingJustifications > 0 ? (
              <span className="text-rose-600 font-semibold flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" /> {pendingJustifications} pendente(s) de análise
              </span>
            ) : (
              <span className="text-emerald-600 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Todas as variações justificadas
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart: Orçado vs Realizado Mensal (2 Cols) */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 m-0">
                Evolução Mensal: Orçado vs. Realizado (Jan a Dez)
              </h3>
              <p className="text-xs text-slate-500 m-0 mt-0.5">
                Valores consolidados (OPEX + Lançamentos Fiscais de CAPEX). Meses Jul-Dez representam projeção.
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-blue-500"></span>
                <span className="text-slate-600 font-medium">Orçado</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-emerald-500"></span>
                <span className="text-slate-600 font-medium">Realizado (Jan-Jun)</span>
              </div>
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={{ stroke: '#cbd5e1' }} />
                <YAxis 
                  tick={{ fontSize: 11, fill: '#64748b' }} 
                  axisLine={false}
                  tickFormatter={(val) => `R$ ${(val / 1000).toFixed(0)}k`} 
                />
                <Tooltip 
                  formatter={(val: any) => typeof val === 'number' ? val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'N/A'}
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '12px' }}
                />
                <Bar dataKey="Orçado" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={32} />
                <Bar dataKey="Realizado" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Side Chart: OPEX por Centro de Custo (1 Col) */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 m-0">
              Distribuição de OPEX por Centro de Custo
            </h3>
            <p className="text-xs text-slate-500 m-0 mt-0.5">
              Participação no orçamento anual de despesas operacionais.
            </p>
          </div>

          <div className="h-56 w-full my-2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={costCenterOpexData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {costCenterOpexData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(val: any) => typeof val === 'number' ? val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'N/A'}
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '12px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-1.5 text-xs">
            {costCenterOpexData.map((item, index) => (
              <div key={item.fullName} className="flex items-center justify-between text-slate-600">
                <div className="flex items-center gap-2 truncate pr-2">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }}></span>
                  <span className="truncate">{item.fullName}</span>
                </div>
                <span className="font-semibold text-slate-800 flex-shrink-0">
                  {item.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* DRE Gerencial Sintética */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Receipt className="w-5 h-5 text-blue-400" />
            <div>
              <h3 className="text-base font-bold text-white m-0">DRE Orçamentária Gerencial (Demonstrativo de Resultado)</h3>
              <p className="text-xs text-slate-400 m-0">Visão consolidada comparando Orçado vs. Realizado (Janeiro a Junho de 2026)</p>
            </div>
          </div>
          <span className="text-xs font-mono bg-blue-500/20 text-blue-300 border border-blue-500/30 px-3 py-1 rounded-full">
            Regime de Competência Oficial
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-600 uppercase tracking-wider">
              <tr>
                <th className="px-6 py-3.5">Linha da DRE</th>
                <th className="px-6 py-3.5 text-right">Orçado YTD (Jan-Jun)</th>
                <th className="px-6 py-3.5 text-right">Realizado YTD (Jan-Jun)</th>
                <th className="px-6 py-3.5 text-right">Variação ($)</th>
                <th className="px-6 py-3.5 text-right">Variação (%)</th>
                <th className="px-6 py-3.5 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {/* Custos Operacionais Diretos */}
              <tr className="hover:bg-slate-50/80 transition-colors">
                <td className="px-6 py-3 font-semibold text-slate-900">
                  (-) Custos de Rede & Operação (Torres, Locações, Combustível)
                </td>
                <td className="px-6 py-3 text-right font-mono text-slate-700">R$ 1.650.000</td>
                <td className="px-6 py-3 text-right font-mono text-slate-900 font-semibold">R$ 1.668.500</td>
                <td className="px-6 py-3 text-right font-mono text-rose-600 font-semibold">+R$ 18.500</td>
                <td className="px-6 py-3 text-right font-mono text-rose-600 font-semibold">+1.1%</td>
                <td className="px-6 py-3 text-center">
                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800">
                    Desfavorável
                  </span>
                </td>
              </tr>

              {/* Despesas com Pessoal & Onboarding */}
              <tr className="hover:bg-slate-50/80 transition-colors">
                <td className="px-6 py-3 font-semibold text-slate-900">
                  (-) Pessoal, Encargos & Onboarding Completo (RH)
                </td>
                <td className="px-6 py-3 text-right font-mono text-slate-700">R$ 27.200</td>
                <td className="px-6 py-3 text-right font-mono text-slate-900 font-semibold">R$ 26.800</td>
                <td className="px-6 py-3 text-right font-mono text-emerald-600 font-semibold">-R$ 400</td>
                <td className="px-6 py-3 text-right font-mono text-emerald-600 font-semibold">-1.5%</td>
                <td className="px-6 py-3 text-center">
                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                    Favorável
                  </span>
                </td>
              </tr>

              {/* Despesas com TI & Licenças Internacionais */}
              <tr className="hover:bg-slate-50/80 transition-colors">
                <td className="px-6 py-3 font-semibold text-slate-900">
                  (-) Tecnologia, Sistemas Cloud & Licenças Internacionais (USD)
                </td>
                <td className="px-6 py-3 text-right font-mono text-slate-700">R$ 136.380</td>
                <td className="px-6 py-3 text-right font-mono text-slate-900 font-semibold">R$ 135.800</td>
                <td className="px-6 py-3 text-right font-mono text-emerald-600 font-semibold">-R$ 580</td>
                <td className="px-6 py-3 text-right font-mono text-emerald-600 font-semibold">-0.4%</td>
                <td className="px-6 py-3 text-center">
                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                    Favorável
                  </span>
                </td>
              </tr>

              {/* Total OPEX */}
              <tr className="bg-slate-100/80 font-bold text-slate-900 border-t-2 border-slate-300">
                <td className="px-6 py-3.5">TOTAL OPEX (Custos e Despesas Operacionais)</td>
                <td className="px-6 py-3.5 text-right font-mono">
                  {totalOpexBudgetYTD.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </td>
                <td className="px-6 py-3.5 text-right font-mono text-blue-900">
                  {totalOpexActualYTD.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </td>
                <td className={`px-6 py-3.5 text-right font-mono ${totalOpexActualYTD > totalOpexBudgetYTD ? 'text-rose-600' : 'text-emerald-600'}`}>
                  {(totalOpexActualYTD - totalOpexBudgetYTD > 0 ? '+' : '')}
                  {(totalOpexActualYTD - totalOpexBudgetYTD).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </td>
                <td className={`px-6 py-3.5 text-right font-mono ${totalOpexActualYTD > totalOpexBudgetYTD ? 'text-rose-600' : 'text-emerald-600'}`}>
                  {(((totalOpexActualYTD - totalOpexBudgetYTD) / totalOpexBudgetYTD) * 100).toFixed(1)}%
                </td>
                <td className="px-6 py-3.5 text-center">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${totalOpexActualYTD > totalOpexBudgetYTD ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'}`}>
                    {totalOpexActualYTD > totalOpexBudgetYTD ? 'Desfavorável' : 'Favorável'}
                  </span>
                </td>
              </tr>

              {/* Linha de CAPEX / Investimentos */}
              <tr className="hover:bg-slate-50/80 transition-colors">
                <td className="px-6 py-3 font-semibold text-slate-900 flex items-center gap-2">
                  <HardHat className="w-4 h-4 text-indigo-600" />
                  CAPEX: Lançamentos Fiscais de Investimentos (Projetos em Andamento)
                </td>
                <td className="px-6 py-3 text-right font-mono text-slate-700">
                  {totalCapexBudgetYTD.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </td>
                <td className="px-6 py-3 text-right font-mono text-slate-900 font-semibold">
                  {totalCapexActualYTD.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </td>
                <td className={`px-6 py-3 text-right font-mono font-semibold ${totalCapexActualYTD > totalCapexBudgetYTD ? 'text-rose-600' : 'text-emerald-600'}`}>
                  {(totalCapexActualYTD - totalCapexBudgetYTD > 0 ? '+' : '')}
                  {(totalCapexActualYTD - totalCapexBudgetYTD).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </td>
                <td className={`px-6 py-3 text-right font-mono font-semibold ${totalCapexActualYTD > totalCapexBudgetYTD ? 'text-rose-600' : 'text-emerald-600'}`}>
                  {(((totalCapexActualYTD - totalCapexBudgetYTD) / totalCapexBudgetYTD) * 100).toFixed(1)}%
                </td>
                <td className="px-6 py-3 text-center">
                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
                    Antecipação (TAP Jul)
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
