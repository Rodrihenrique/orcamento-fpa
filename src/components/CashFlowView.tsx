import React, { useState, useMemo } from 'react';
import { 
  Calendar as CalendarIcon, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Scale, 
  CheckCircle2, 
  Clock, 
  AlertCircle
} from 'lucide-react';
import type { OpexItem, CostCenter } from '../types/budget';
import type { DetrafInvoice } from '../types/detraf';

interface CashFlowViewProps {
  opexItems: OpexItem[];
  detrafInvoices: DetrafInvoice[];
  costCenters: CostCenter[];
}

interface CashTransaction {
  id: string;
  dueDate: string; // YYYY-MM-DD
  day: number; // 1-31
  description: string;
  entityName: string;
  category: 'OPEX' | 'DETRAF';
  direction: 'INFLOW' | 'OUTFLOW';
  grossValue: number;
  netValue: number;
  status: 'LIQUIDADO' | 'AGENDADO' | 'PENDENTE';
  costCenterName?: string;
  barcode?: string;
}

export const CashFlowView: React.FC<CashFlowViewProps> = ({
  opexItems,
  detrafInvoices,
  costCenters
}) => {
  const [selectedMonth, setSelectedMonth] = useState<string>('2026-07');
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [filterDirection, setFilterDirection] = useState<'ALL' | 'INFLOW' | 'OUTFLOW'>('ALL');
  const [filterCategory, setFilterCategory] = useState<'ALL' | 'OPEX' | 'DETRAF'>('ALL');

  const formatBRL = (val: number) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  // 1. Constrói transações de caixa a partir do DETRAF e do OPEX
  const transactions: CashTransaction[] = useMemo(() => {
    const list: CashTransaction[] = [];

    // Faturas DETRAF
    detrafInvoices.forEach((inv) => {
      const day = inv.dueDate ? parseInt(inv.dueDate.split('-')[2], 10) : 15;
      list.push({
        id: `cf-detraf-${inv.id}`,
        dueDate: inv.dueDate,
        day: isNaN(day) ? 15 : day,
        description: `DETRAF ${inv.referenceMonth} - ${inv.direction === 'INBOUND' ? 'Terminação Ativa (VU-M)' : 'Terminação em Terceiros'}`,
        entityName: inv.carrierName,
        category: 'DETRAF',
        direction: inv.direction === 'INBOUND' ? 'INFLOW' : 'OUTFLOW',
        grossValue: inv.grossValue,
        netValue: inv.netValue,
        status: inv.status === 'PAGO' ? 'LIQUIDADO' : 'AGENDADO',
        costCenterName: 'Atacado & Interconexão'
      });
    });

    // Despesas de OPEX mapeadas para vencimentos típicos do mês
    opexItems.forEach((item, idx) => {
      const cc = costCenters.find((c) => c.id === item.costCenterId);
      const val = item.monthlyBudget[6] || item.monthlyBudget[5] || 25000;
      if (val <= 0) return;

      // Distribuição de vencimentos: Dia 10 (Frotas/TI), Dia 15 (Concessionárias/Energia), Dia 20 (Locação de Torres)
      let day = 15;
      if (item.accountCode === '3.2.01') day = 20; // Torres
      else if (item.accountCode === '3.2.03') day = 10; // Frotas
      else if (item.accountCode === '3.3.01') day = 5; // Software / Cloud
      else day = 12 + (idx % 14);

      const dayStr = day.toString().padStart(2, '0');
      const dueDate = `${selectedMonth}-${dayStr}`;

      list.push({
        id: `cf-opex-${item.id}`,
        dueDate: dueDate,
        day: day,
        description: item.description,
        entityName: item.memory?.supplier || 'Fornecedor Credenciado',
        category: 'OPEX',
        direction: 'OUTFLOW',
        grossValue: val,
        netValue: val,
        status: day <= 15 ? 'LIQUIDADO' : 'AGENDADO',
        costCenterName: cc?.name || 'Operacional',
        barcode: item.memory?.justification?.includes('Linha Digitável')
          ? item.memory.justification.split('Linha Digitável: ')[1]?.split('.')[0]
          : undefined
      });
    });

    return list.sort((a, b) => a.day - b.day);
  }, [detrafInvoices, opexItems, costCenters, selectedMonth]);

  // Transações filtradas
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      const matchDay = selectedDay === null || tx.day === selectedDay;
      const matchDir = filterDirection === 'ALL' || tx.direction === filterDirection;
      const matchCat = filterCategory === 'ALL' || tx.category === filterCategory;
      return matchDay && matchDir && matchCat;
    });
  }, [transactions, selectedDay, filterDirection, filterCategory]);

  // Métricas do Mês
  const totalInflow = useMemo(
    () => transactions.filter((t) => t.direction === 'INFLOW').reduce((acc, t) => acc + t.netValue, 0),
    [transactions]
  );

  const totalOutflow = useMemo(
    () => transactions.filter((t) => t.direction === 'OUTFLOW').reduce((acc, t) => acc + t.netValue, 0),
    [transactions]
  );

  const netCashFlow = totalInflow - totalOutflow;

  const upcoming7Days = useMemo(() => {
    const todayDay = 15;
    return transactions
      .filter((t) => t.day >= todayDay && t.day <= todayDay + 7 && t.direction === 'OUTFLOW')
      .reduce((acc, t) => acc + t.netValue, 0);
  }, [transactions]);

  // Contagem por dia para o calendário
  const daysInMonth = 31;
  const calendarDays = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  return (
    <div className="space-y-6 pb-12 animate-fadeIn">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 text-white border border-indigo-900/40 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                Tesouraria & Contas a Pagar / Receber
              </span>
              <span className="text-xs text-slate-400">Regime de Caixa (D+N)</span>
            </div>
            <h2 className="text-2xl font-black text-white m-0">
              Fluxo de Caixa & Cronograma de Desembolso
            </h2>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
              Programação diária de liquidação financeira de boletos e faturas de OPEX (concessionárias de energia e aluguel de torres) sincronizada com os recebimentos e compensações bilaterais de DETRAF.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700/60 flex items-center gap-2 text-xs">
              <CalendarIcon className="w-4 h-4 text-indigo-400" />
              <span className="text-slate-300 font-semibold">Competência:</span>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-white font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards de Liquidez */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Entradas Previstas (Recebimentos)
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <ArrowDownLeft className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900 font-mono">
            {formatBRL(totalInflow)}
          </div>
          <div className="mt-2 text-xs text-emerald-600 font-semibold">
            DETRAF Inbound & Interconexão
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Saídas Previstas (Desembolsos)
            </span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900 font-mono">
            {formatBRL(totalOutflow)}
          </div>
          <div className="mt-2 text-xs text-rose-600 font-semibold">
            Boletos OPEX + DETRAF Outbound
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Saldo Líquido Projetado
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Scale className="w-4 h-4" />
            </div>
          </div>
          <div className={`mt-2 text-2xl font-black font-mono ${netCashFlow >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
            {netCashFlow >= 0 ? '+' : ''}{formatBRL(netCashFlow)}
          </div>
          <div className="mt-2 text-xs text-slate-500">
            {netCashFlow >= 0 ? 'Superávit financeiro de caixa' : 'Necessidade líquida de caixa'}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Desembolsos Próximos 7 Dias
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-amber-600 font-mono">
            {formatBRL(upcoming7Days)}
          </div>
          <div className="mt-2 text-xs text-slate-500">
            Vencimentos críticos de D+1 a D+7
          </div>
        </div>
      </div>

      {/* Calendário Interativo de Dias do Mês */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 m-0 flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-indigo-600" />
              Calendário de Vencimentos Diários — {selectedMonth}
            </h3>
            <p className="text-xs text-slate-500 m-0 mt-0.5">
              Clique em um dia específico para filtrar os lançamentos e conferir os valores a pagar e receber.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs">
            {selectedDay !== null && (
              <button
                onClick={() => setSelectedDay(null)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg transition-colors cursor-pointer"
              >
                Limpar Filtro de Dia (Ver Todos)
              </button>
            )}
            <span className="flex items-center gap-1 text-slate-600 font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Entradas
            </span>
            <span className="flex items-center gap-1 text-slate-600 font-medium ml-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span> Saídas
            </span>
          </div>
        </div>

        {/* Grade de Dias */}
        <div className="grid grid-cols-7 sm:grid-cols-10 md:grid-cols-16 lg:grid-cols-31 gap-2 pt-2">
          {calendarDays.map((day) => {
            const dayTxs = transactions.filter((t) => t.day === day);
            const hasInflow = dayTxs.some((t) => t.direction === 'INFLOW');
            const hasOutflow = dayTxs.some((t) => t.direction === 'OUTFLOW');
            const isSelected = selectedDay === day;

            return (
              <button
                key={day}
                onClick={() => setSelectedDay(selectedDay === day ? null : day)}
                className={`p-2 rounded-xl text-center border transition-all cursor-pointer flex flex-col items-center justify-between min-h-[58px] ${
                  isSelected
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-md scale-105'
                    : dayTxs.length > 0
                    ? 'bg-slate-50 border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/40 text-slate-800'
                    : 'bg-white border-slate-100 text-slate-400 hover:bg-slate-50'
                }`}
              >
                <span className={`text-xs font-black ${isSelected ? 'text-white' : 'text-slate-700'}`}>
                  {day}
                </span>

                <div className="flex gap-1 mt-1">
                  {hasInflow && (
                    <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-emerald-300' : 'bg-emerald-500'}`}></span>
                  )}
                  {hasOutflow && (
                    <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-rose-300' : 'bg-rose-500'}`}></span>
                  )}
                </div>

                <span className={`text-[9px] font-mono mt-0.5 ${isSelected ? 'text-indigo-100' : 'text-slate-400'}`}>
                  {dayTxs.length > 0 ? `${dayTxs.length} lç` : '-'}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tabela de Transações de Caixa */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {/* Barra de Filtros */}
        <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-slate-700">Filtrar Sentido:</span>
            <div className="flex bg-slate-200/80 p-1 rounded-xl text-xs font-semibold">
              <button
                onClick={() => setFilterDirection('ALL')}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                  filterDirection === 'ALL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                }`}
              >
                Todos
              </button>
              <button
                onClick={() => setFilterDirection('OUTFLOW')}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                  filterDirection === 'OUTFLOW' ? 'bg-rose-600 text-white shadow-xs' : 'text-slate-600'
                }`}
              >
                A Pagar (Saídas)
              </button>
              <button
                onClick={() => setFilterDirection('INFLOW')}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                  filterDirection === 'INFLOW' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600'
                }`}
              >
                A Receber (Entradas)
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-slate-700">Categoria:</span>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value as any)}
              className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="ALL">Todas as Categorias</option>
              <option value="OPEX">OPEX (Concessionárias & Torres)</option>
              <option value="DETRAF">DETRAF (Interconexão Telecom)</option>
            </select>
          </div>
        </div>

        {/* Tabela */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-900 text-white font-semibold">
              <tr>
                <th className="py-3.5 px-4 min-w-[100px]">Data Venc.</th>
                <th className="py-3.5 px-4 min-w-[180px]">Fornecedor / Operadora</th>
                <th className="py-3.5 px-4 min-w-[260px]">Descrição do Lançamento</th>
                <th className="py-3.5 px-4 min-w-[140px]">Centro de Custo</th>
                <th className="py-3.5 px-4 text-center min-w-[100px]">Categoria</th>
                <th className="py-3.5 px-4 text-center min-w-[110px]">Status</th>
                <th className="py-3.5 px-4 text-right min-w-[130px] font-mono">Valor Líquido</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTransactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-indigo-50/30 transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-slate-900">
                    {tx.dueDate}
                  </td>
                  <td className="py-3 px-4 font-semibold text-slate-800">
                    {tx.entityName}
                  </td>
                  <td className="py-3 px-4 text-slate-700">
                    <div className="font-medium text-slate-900">{tx.description}</div>
                    {tx.barcode && (
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5 truncate max-w-xs">
                        {tx.barcode}
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-4 text-slate-600">
                    {tx.costCenterName}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        tx.category === 'DETRAF'
                          ? 'bg-blue-100 text-blue-800 border border-blue-200'
                          : 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                      }`}
                    >
                      {tx.category}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider inline-flex items-center gap-1 ${
                        tx.status === 'LIQUIDADO'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : 'bg-amber-100 text-amber-800 border border-amber-200'
                      }`}
                    >
                      {tx.status === 'LIQUIDADO' ? (
                        <>
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Liquidado</span>
                        </>
                      ) : (
                        <>
                          <Clock className="w-3 h-3" />
                          <span>Agendado</span>
                        </>
                      )}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-xs">
                    <span className={tx.direction === 'INFLOW' ? 'text-emerald-600' : 'text-rose-600'}>
                      {tx.direction === 'INFLOW' ? '+' : '-'} {formatBRL(tx.netValue)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
