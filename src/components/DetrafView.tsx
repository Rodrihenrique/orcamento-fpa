import React, { useState, useMemo } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Scale,
  Clock,
  AlertTriangle,
  FileText,
  Calculator,
  Filter,
  CheckCircle2,
  XCircle,
  Info,
  Building2,
  PlusCircle
} from 'lucide-react';
import {
  mockCarriers,
  mockDetrafInvoices,
  mockNettingSettlements,
  mockContestations
} from '../data/mockDetrafData';
import { NewEntryModal } from './NewEntryModal';
import type {
  DetrafInvoice,
  ContestationRecord
} from '../types/detraf';

export const DetrafView: React.FC = () => {
  // Sub-aba ativa
  const [activeSubTab, setActiveSubTab] = useState<'painel' | 'receber' | 'pagar' | 'glosas' | 'calculadora'>('painel');

  // Estado dos Lançamentos de DETRAF
  const [invoices, setInvoices] = useState<DetrafInvoice[]>(mockDetrafInvoices);
  const [isEntryModalOpen, setIsEntryModalOpen] = useState<boolean>(false);

  const handleSaveDetrafInvoice = (newInvoice: DetrafInvoice) => {
    setInvoices(prev => [newInvoice, ...prev]);
  };

  // Filtros
  const [selectedCarrier, setSelectedCarrier] = useState<string>('TODAS');
  const [selectedStatus, setSelectedStatus] = useState<string>('TODOS');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Estado da Calculadora / Simulador
  const [simMinutesIn, setSimMinutesIn] = useState<number>(10000000);
  const [simMinutesOut, setSimMinutesOut] = useState<number>(8500000);
  const [simVumRate, setSimVumRate] = useState<number>(0.0195);
  const [simTaxRate, setSimTaxRate] = useState<number>(9.25);
  const [simCarrier, setSimCarrier] = useState<string>('claro');

  // Modal de Detalhes da Fatura
  const [selectedInvoice, setSelectedInvoice] = useState<DetrafInvoice | null>(null);

  // Modal de Detalhes da Glosa / Contestação
  const [selectedContestation, setSelectedContestation] = useState<ContestationRecord | null>(null);

  // Formatação de Moeda
  const formatBRL = (val: number) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const formatNumber = (val: number) => {
    return val.toLocaleString('pt-BR');
  };

  // Métricas Consolidadas
  const summaryMetrics = useMemo(() => {
    const totalReceivableGross = invoices
      .filter(i => i.direction === 'INBOUND')
      .reduce((acc, i) => acc + i.grossValue, 0);

    const totalReceivableNet = invoices
      .filter(i => i.direction === 'INBOUND')
      .reduce((acc, i) => acc + i.netValue, 0);

    const totalPayableGross = invoices
      .filter(i => i.direction === 'OUTBOUND')
      .reduce((acc, i) => acc + i.grossValue, 0);

    const totalPayableNet = invoices
      .filter(i => i.direction === 'OUTBOUND')
      .reduce((acc, i) => acc + i.netValue, 0);

    // Saldo Líquido de Netting
    const netSettlementBalance = totalReceivableNet - totalPayableNet;

    // Valores em Aberto (A_VENCER ou VENCIDO ou CONTESTADO)
    const openReceivables = invoices
      .filter(i => i.direction === 'INBOUND' && i.status !== 'PAGO')
      .reduce((acc, i) => acc + i.netValue, 0);

    const openPayables = invoices
      .filter(i => i.direction === 'OUTBOUND' && i.status !== 'PAGO')
      .reduce((acc, i) => acc + i.netValue, 0);

    // Valores Vencidos (Aging > 0)
    const overdueReceivables = invoices
      .filter(i => i.direction === 'INBOUND' && i.status === 'VENCIDO')
      .reduce((acc, i) => acc + i.netValue, 0);

    // Total em Glosas / Contestações Ativas
    const totalDisputed = mockContestations
      .filter(c => c.status === 'EM_ANALISE' || c.status === 'ARBITRAGEM_ANATEL')
      .reduce((acc, c) => acc + c.disputedValue, 0);

    const totalMinutesProcessed = invoices
      .reduce((acc, i) => acc + i.totalMinutes, 0);

    return {
      totalReceivableGross,
      totalReceivableNet,
      totalPayableGross,
      totalPayableNet,
      netSettlementBalance,
      openReceivables,
      openPayables,
      overdueReceivables,
      totalDisputed,
      totalMinutesProcessed
    };
  }, [invoices]);

  // Filtragem de Faturas
  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv => {
      const matchCarrier = selectedCarrier === 'TODAS' || inv.carrierId === selectedCarrier;
      const matchStatus = selectedStatus === 'TODOS' || inv.status === selectedStatus;
      const matchSearch = inv.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          inv.carrierName.toLowerCase().includes(searchTerm.toLowerCase());
      return matchCarrier && matchStatus && matchSearch;
    });
  }, [invoices, selectedCarrier, selectedStatus, searchTerm]);

  // Cálculos da Simulação
  const simCalculations = useMemo(() => {
    const grossIn = simMinutesIn * simVumRate;
    const taxesIn = grossIn * (simTaxRate / 100);
    const netIn = grossIn - taxesIn;

    const grossOut = simMinutesOut * simVumRate;
    const taxesOut = grossOut * (simTaxRate / 100);
    const netOut = grossOut - taxesOut;

    const netBalance = netIn - netOut;

    return {
      grossIn,
      taxesIn,
      netIn,
      grossOut,
      taxesOut,
      netOut,
      netBalance
    };
  }, [simMinutesIn, simMinutesOut, simVumRate, simTaxRate]);

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Top Banner de Contexto Setorial */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 rounded-2xl p-6 text-white border border-blue-900/40 shadow-xl shadow-blue-950/20">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-500/30">
                Regulatório Anatel / ABR Telecom
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Cadência 30s / 6s
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Compensação Bilateral
              </span>
            </div>
            <h2 className="text-2xl font-black tracking-tight text-white m-0">
              DETRAF & Interconexão de Redes (Atacado)
            </h2>
            <p className="text-sm text-slate-300 mt-1 max-w-3xl leading-relaxed">
              Gestão financeira de tráfego de voz e interconexão (SMP 5G e STFC). Apuração de receitas de terminação ativa (VU-M / TU-RL), custos de saída, conciliação de CDRs, compensação financeira (*netting*) e controle de glosas regulatórias.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 bg-slate-800/80 p-3 rounded-xl border border-slate-700/60">
            <div className="text-right">
              <div className="text-xs text-slate-400 font-medium">Saldo Líquido Netting (Junho)</div>
              <div className="text-xl font-black text-emerald-400">
                {formatBRL(summaryMetrics.netSettlementBalance)}
              </div>
              <span className="text-[10px] text-emerald-300/80 font-semibold uppercase">Superávit a Receber</span>
            </div>
            <div className="w-[1px] h-10 bg-slate-700 mx-1"></div>
            <div className="text-right">
              <div className="text-xs text-slate-400 font-medium">Tráfego Cursado YTD</div>
              <div className="text-lg font-black text-slate-200">
                {(summaryMetrics.totalMinutesProcessed / 1000000).toFixed(1)}M min
              </div>
              <span className="text-[10px] text-slate-400">SMP 5G + STFC</span>
            </div>
          </div>
        </div>

        {/* Sub-abas de Navegação */}
        <div className="flex flex-wrap gap-2 mt-6 pt-4 border-t border-slate-800">
          <button
            onClick={() => setActiveSubTab('painel')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeSubTab === 'painel'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Scale className="w-4 h-4" />
            <span>Visão Executiva & Netting</span>
          </button>

          <button
            onClick={() => setActiveSubTab('receber')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeSubTab === 'receber'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <ArrowDownLeft className="w-4 h-4 text-emerald-400" />
            <span>DETRAF Inbound (A Receber)</span>
            <span className="px-1.5 py-0.2 bg-emerald-950/80 border border-emerald-500/40 rounded text-[10px] text-emerald-300 font-mono">
              {invoices.filter(i => i.direction === 'INBOUND').length}
            </span>
          </button>

          <button
            onClick={() => setActiveSubTab('pagar')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeSubTab === 'pagar'
                ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/30'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <ArrowUpRight className="w-4 h-4 text-rose-400" />
            <span>DETRAF Outbound (A Pagar)</span>
            <span className="px-1.5 py-0.2 bg-rose-950/80 border border-rose-500/40 rounded text-[10px] text-rose-300 font-mono">
              {invoices.filter(i => i.direction === 'OUTBOUND').length}
            </span>
          </button>

          <button
            onClick={() => setActiveSubTab('glosas')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all relative ${
              activeSubTab === 'glosas'
                ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/30'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <AlertTriangle className="w-4 h-4 text-amber-300" />
            <span>Glosas & Reconciliação CDRs</span>
            <span className="px-1.5 py-0.2 bg-amber-950/80 border border-amber-500/40 rounded text-[10px] text-amber-300 font-mono">
              {mockContestations.filter(c => c.status === 'EM_ANALISE').length} abertas
            </span>
          </button>

          <button
            onClick={() => setActiveSubTab('calculadora')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ml-auto ${
              activeSubTab === 'calculadora'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Calculator className="w-4 h-4 text-indigo-300" />
            <span>Simulador & Calculadora</span>
          </button>

          <button
            onClick={() => setIsEntryModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white shadow-lg shadow-emerald-500/25 transition-all cursor-pointer hover:scale-105 active:scale-95"
          >
            <PlusCircle className="w-4 h-4" />
            <span>+ Novo Lançamento / Importar</span>
          </button>
        </div>
      </div>

      {/* ========================================================== */}
      {/* SUB-ABA 1: VISÃO EXECUTIVA & NETTING                        */}
      {/* ========================================================== */}
      {activeSubTab === 'painel' && (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Total a Receber */}
            <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Valores a Receber (Inbound)
                </span>
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <ArrowDownLeft className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2 text-2xl font-black text-slate-800">
                {formatBRL(summaryMetrics.totalReceivableNet)}
              </div>
              <div className="mt-2 flex items-center justify-between text-xs text-slate-500 border-t border-slate-100 pt-2">
                <span>Em Aberto:</span>
                <span className="font-bold text-emerald-600 font-mono">
                  {formatBRL(summaryMetrics.openReceivables)}
                </span>
              </div>
            </div>

            {/* Card 2: Total a Pagar */}
            <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Valores a Pagar (Outbound)
                </span>
                <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                  <ArrowUpRight className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2 text-2xl font-black text-slate-800">
                {formatBRL(summaryMetrics.totalPayableNet)}
              </div>
              <div className="mt-2 flex items-center justify-between text-xs text-slate-500 border-t border-slate-100 pt-2">
                <span>Em Aberto:</span>
                <span className="font-bold text-rose-600 font-mono">
                  {formatBRL(summaryMetrics.openPayables)}
                </span>
              </div>
            </div>

            {/* Card 3: Saldo Líquido de Compensação */}
            <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Netting Líquido (Bilateral)
                </span>
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Scale className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2 text-2xl font-black text-emerald-600">
                {formatBRL(summaryMetrics.netSettlementBalance)}
              </div>
              <div className="mt-2 flex items-center justify-between text-xs text-slate-500 border-t border-slate-100 pt-2">
                <span>Posição Global:</span>
                <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[10px] uppercase">
                  Superavitária (+23,5%)
                </span>
              </div>
            </div>

            {/* Card 4: Glosas & Valores Vencidos */}
            <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Glosas em Disputa (CDRs)
                </span>
                <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2 text-2xl font-black text-amber-600">
                {formatBRL(summaryMetrics.totalDisputed)}
              </div>
              <div className="mt-2 flex items-center justify-between text-xs text-slate-500 border-t border-slate-100 pt-2">
                <span>Vencidos s/ Disputa:</span>
                <span className="font-bold text-rose-600 font-mono">
                  {formatBRL(summaryMetrics.overdueReceivables)}
                </span>
              </div>
            </div>
          </div>

          {/* Matriz de Netting (Compensação por Operadora) */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4 bg-slate-50/50">
              <div>
                <h3 className="text-base font-bold text-slate-800 m-0 flex items-center gap-2">
                  <Scale className="w-5 h-5 text-blue-600" />
                  Matriz de Compensação Financeira Bilateral (Netting Junho/2026)
                </h3>
                <p className="text-xs text-slate-500 m-0 mt-0.5">
                  Liquidação financeira líquida das obrigações recíprocas de interconexão conforme regulamentação da Anatel.
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                <span>Superávit (Receber)</span>
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-rose-500 ml-2"></span>
                <span>Déficit (Pagar)</span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-600 font-semibold uppercase tracking-wider">
                    <th className="py-3.5 px-4">Operadora Parceira</th>
                    <th className="py-3.5 px-4 text-right">A Receber (Inbound Líq.)</th>
                    <th className="py-3.5 px-4 text-right">A Pagar (Outbound Líq.)</th>
                    <th className="py-3.5 px-4 text-right">Saldo Líquido (Netting)</th>
                    <th className="py-3.5 px-4 text-center">Status Compensação</th>
                    <th className="py-3.5 px-4 text-right">Saldo em Aberto</th>
                    <th className="py-3.5 px-4 text-right">Glosas Ativas</th>
                    <th className="py-3.5 px-4 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {mockNettingSettlements.map((item) => (
                    <tr key={item.carrierId} className="hover:bg-blue-50/40 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-900 flex items-center gap-2.5">
                        <span
                          className="w-3 h-3 rounded-full"
                          style={{
                            backgroundColor:
                              mockCarriers.find(c => c.id === item.carrierId)?.color || '#94A3B8'
                          }}
                        ></span>
                        {item.carrierName}
                      </td>

                      <td className="py-3 px-4 text-right font-mono text-emerald-600 font-semibold">
                        {formatBRL(item.receivableNet)}
                      </td>

                      <td className="py-3 px-4 text-right font-mono text-rose-600 font-semibold">
                        {formatBRL(item.payableNet)}
                      </td>

                      <td className="py-3 px-4 text-right font-mono font-bold">
                        <span
                          className={
                            item.netBalance >= 0 ? 'text-emerald-700' : 'text-rose-700'
                          }
                        >
                          {item.netBalance >= 0 ? '+' : ''}
                          {formatBRL(item.netBalance)}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            item.settlementType === 'SUPERAVIT'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : 'bg-rose-100 text-rose-800 border border-rose-200'
                          }`}
                        >
                          {item.settlementType === 'SUPERAVIT' ? 'Receber Líquido' : 'Pagar Líquido'}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right font-mono text-slate-800 font-semibold">
                        {formatBRL(item.openReceivable)}
                      </td>

                      <td className="py-3 px-4 text-right font-mono">
                        {item.totalGlosas > 0 ? (
                          <span className="text-amber-600 font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                            {formatBRL(item.totalGlosas)}
                          </span>
                        ) : (
                          <span className="text-slate-400">R$ 0,00</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => {
                            setSelectedCarrier(item.carrierId);
                            setActiveSubTab('receber');
                          }}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-blue-600 hover:text-white rounded-lg text-slate-700 font-bold text-[11px] transition-all cursor-pointer"
                        >
                          Ver Faturas
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-100/80 font-bold text-slate-900 border-t-2 border-slate-300">
                    <td className="py-3.5 px-4 uppercase text-[11px]">Total Consolidado</td>
                    <td className="py-3.5 px-4 text-right font-mono text-emerald-700">
                      {formatBRL(summaryMetrics.totalReceivableNet)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-rose-700">
                      {formatBRL(summaryMetrics.totalPayableNet)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-emerald-800 text-sm">
                      +{formatBRL(summaryMetrics.netSettlementBalance)}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="px-2 py-0.5 rounded bg-emerald-200 text-emerald-900 text-[10px] uppercase font-black">
                        Superávit Líquido
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-slate-900">
                      {formatBRL(summaryMetrics.openReceivables)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-amber-700">
                      {formatBRL(summaryMetrics.totalDisputed)}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Painel Regulatório & Boas Práticas Anatel */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50/40 p-5 rounded-2xl border border-blue-100">
              <div className="flex items-center gap-2 text-blue-800 font-bold text-xs uppercase tracking-wider mb-2">
                <Info className="w-4 h-4 text-blue-600" />
                Cadência 30s / 6s (Anatel RGI)
              </div>
              <p className="text-xs text-slate-600 leading-relaxed m-0">
                A tarifação de interconexão no Brasil obedece à regra de tarifação mínima de <strong>30 segundos</strong> iniciais, e a partir daí tarifada em blocos de <strong>6 segundos</strong>. Discrepâncias de cadência geram glosas técnicas automáticas.
              </p>
            </div>

            <div className="bg-gradient-to-br from-emerald-50 to-teal-50/40 p-5 rounded-2xl border border-emerald-100">
              <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs uppercase tracking-wider mb-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Prazo de Envio & Compensação
              </div>
              <p className="text-xs text-slate-600 leading-relaxed m-0">
                O arquivo DETRAF deve ser disponibilizado até o <strong>5º dia útil</strong> de cada mês, com pagamento previsto até o dia 10 a 15. A liquidação deve priorizar o acerto financeiro compensado (Netting).
              </p>
            </div>

            <div className="bg-gradient-to-br from-amber-50 to-orange-50/40 p-5 rounded-2xl border border-amber-100">
              <div className="flex items-center gap-2 text-amber-800 font-bold text-xs uppercase tracking-wider mb-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                Prazo de Contestação de 90 Dias
              </div>
              <p className="text-xs text-slate-600 leading-relaxed m-0">
                A prestadora devedora possui prazo regulatório improrrogável de <strong>90 dias</strong> após a emissão do DETRAF para apresentar glosas fundamentadas em divergência de CDRs ou tráfego indevido.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================== */}
      {/* SUB-ABA 2: DETRAF INBOUND (A RECEBER)                       */}
      {/* ========================================================== */}
      {activeSubTab === 'receber' && (
        <div className="space-y-6">
          {/* Filtros e Barra de Ação */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-slate-400" />
                <select
                  value={selectedCarrier}
                  onChange={(e) => setSelectedCarrier(e.target.value)}
                  className="text-xs font-semibold bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="TODAS">Todas as Operadoras</option>
                  {mockCarriers.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-slate-400" />
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="text-xs font-semibold bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="TODOS">Todos os Status</option>
                  <option value="A_VENCER">A Vencer</option>
                  <option value="VENCIDO">Vencidos (Em Atraso)</option>
                  <option value="CONTESTADO">Contestados / Glosa</option>
                  <option value="PAGO">Liquidados (Pagos)</option>
                </select>
              </div>

              <input
                type="text"
                placeholder="Buscar por fatura ou operadora..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="text-xs bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 w-56"
              />
            </div>

            <div className="text-xs text-slate-500 font-medium">
              Exibindo <strong>{filteredInvoices.filter(i => i.direction === 'INBOUND').length}</strong> faturas de tráfego entrante
            </div>
          </div>

          {/* Tabela de Faturas Inbound */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-600 font-semibold uppercase tracking-wider">
                    <th className="py-3.5 px-4">Nº DETRAF</th>
                    <th className="py-3.5 px-4">Operadora Devedora</th>
                    <th className="py-3.5 px-4 text-center">Ref. / Vencimento</th>
                    <th className="py-3.5 px-4 text-right">Minutos Cursados</th>
                    <th className="py-3.5 px-4 text-right">Tarifa (R$/min)</th>
                    <th className="py-3.5 px-4 text-right">Valor Bruto</th>
                    <th className="py-3.5 px-4 text-right">Valor Líquido</th>
                    <th className="py-3.5 px-4 text-center">Status / Aging</th>
                    <th className="py-3.5 px-4 text-right">Glosa</th>
                    <th className="py-3.5 px-4 text-center">Detalhes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {filteredInvoices
                    .filter(i => i.direction === 'INBOUND')
                    .map((inv) => (
                      <tr key={inv.id} className="hover:bg-emerald-50/30 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-blue-700">
                          {inv.invoiceNumber}
                        </td>

                        <td className="py-3 px-4 font-bold text-slate-900">
                          {inv.carrierName}
                        </td>

                        <td className="py-3 px-4 text-center">
                          <div className="font-semibold text-slate-800">{inv.referenceMonth}</div>
                          <div className="text-[10px] text-slate-400">Venc: {inv.dueDate}</div>
                        </td>

                        <td className="py-3 px-4 text-right font-mono text-slate-800">
                          {formatNumber(inv.totalMinutes)}
                        </td>

                        <td className="py-3 px-4 text-right font-mono text-slate-600">
                          R$ {inv.tariffRate.toFixed(4)} ({inv.tariffType})
                        </td>

                        <td className="py-3 px-4 text-right font-mono text-slate-500">
                          {formatBRL(inv.grossValue)}
                        </td>

                        <td className="py-3 px-4 text-right font-mono font-bold text-emerald-600">
                          {formatBRL(inv.netValue)}
                        </td>

                        <td className="py-3 px-4 text-center">
                          {inv.status === 'PAGO' && (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800 border border-emerald-200">
                              Liquidado
                            </span>
                          )}
                          {inv.status === 'A_VENCER' && (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-blue-100 text-blue-800 border border-blue-200">
                              A Vencer
                            </span>
                          )}
                          {inv.status === 'VENCIDO' && (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-rose-100 text-rose-800 border border-rose-200">
                              Atraso ({inv.daysOverdue}d)
                            </span>
                          )}
                          {inv.status === 'CONTESTADO' && (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-amber-100 text-amber-800 border border-amber-200">
                              Em Glosa
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-right font-mono">
                          {inv.disputedAmount > 0 ? (
                            <span className="text-amber-600 font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                              {formatBRL(inv.disputedAmount)}
                            </span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => setSelectedInvoice(inv)}
                            className="p-1.5 hover:bg-slate-200 text-slate-600 hover:text-blue-700 rounded-lg transition-colors cursor-pointer"
                            title="Ver Detalhes do Faturamento"
                          >
                            <FileText className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================== */}
      {/* SUB-ABA 3: DETRAF OUTBOUND (A PAGAR)                        */}
      {/* ========================================================== */}
      {activeSubTab === 'pagar' && (
        <div className="space-y-6">
          {/* Barra de Filtros */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-slate-400" />
                <select
                  value={selectedCarrier}
                  onChange={(e) => setSelectedCarrier(e.target.value)}
                  className="text-xs font-semibold bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="TODAS">Todas as Operadoras</option>
                  {mockCarriers.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-slate-400" />
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="text-xs font-semibold bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="TODOS">Todos os Status</option>
                  <option value="A_VENCER">A Vencer</option>
                  <option value="VENCIDO">Vencidos (Em Atraso)</option>
                  <option value="PAGO">Liquidados</option>
                </select>
              </div>

              <input
                type="text"
                placeholder="Buscar por fatura de terceiros..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="text-xs bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 w-56"
              />
            </div>

            <div className="text-xs text-slate-500 font-medium">
              Exibindo <strong>{filteredInvoices.filter(i => i.direction === 'OUTBOUND').length}</strong> faturas de saída
            </div>
          </div>

          {/* Tabela Outbound */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-600 font-semibold uppercase tracking-wider">
                    <th className="py-3.5 px-4">Nº DETRAF</th>
                    <th className="py-3.5 px-4">Operadora Credora</th>
                    <th className="py-3.5 px-4 text-center">Ref. / Vencimento</th>
                    <th className="py-3.5 px-4 text-right">Minutos Saindo</th>
                    <th className="py-3.5 px-4 text-right">Tarifa (R$/min)</th>
                    <th className="py-3.5 px-4 text-right">Valor Bruto</th>
                    <th className="py-3.5 px-4 text-right">Valor Líquido</th>
                    <th className="py-3.5 px-4 text-center">Status Pagamento</th>
                    <th className="py-3.5 px-4 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {filteredInvoices
                    .filter(i => i.direction === 'OUTBOUND')
                    .map((inv) => (
                      <tr key={inv.id} className="hover:bg-rose-50/30 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-blue-700">
                          {inv.invoiceNumber}
                        </td>

                        <td className="py-3 px-4 font-bold text-slate-900">
                          {inv.carrierName}
                        </td>

                        <td className="py-3 px-4 text-center">
                          <div className="font-semibold text-slate-800">{inv.referenceMonth}</div>
                          <div className="text-[10px] text-slate-400">Venc: {inv.dueDate}</div>
                        </td>

                        <td className="py-3 px-4 text-right font-mono text-slate-800">
                          {formatNumber(inv.totalMinutes)}
                        </td>

                        <td className="py-3 px-4 text-right font-mono text-slate-600">
                          R$ {inv.tariffRate.toFixed(4)} ({inv.tariffType})
                        </td>

                        <td className="py-3 px-4 text-right font-mono text-slate-500">
                          {formatBRL(inv.grossValue)}
                        </td>

                        <td className="py-3 px-4 text-right font-mono font-bold text-rose-600">
                          {formatBRL(inv.netValue)}
                        </td>

                        <td className="py-3 px-4 text-center">
                          {inv.status === 'PAGO' ? (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800 border border-emerald-200">
                              Liquidado
                            </span>
                          ) : inv.status === 'A_VENCER' ? (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-blue-100 text-blue-800 border border-blue-200">
                              Programado Netting
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-rose-100 text-rose-800 border border-rose-200">
                              Em Aberto
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => setSelectedInvoice(inv)}
                            className="p-1.5 hover:bg-slate-200 text-slate-600 hover:text-blue-700 rounded-lg transition-colors cursor-pointer"
                            title="Ver Detalhes do Custo"
                          >
                            <FileText className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================== */}
      {/* SUB-ABA 4: GLOSAS & RECONCILIAÇÃO CDRs                     */}
      {/* ========================================================== */}
      {activeSubTab === 'glosas' && (
        <div className="space-y-6">
          {/* Card Alerta de Prazos da Anatel */}
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-amber-500/20">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-black text-amber-900 m-0">
                  Monitoramento do Prazo Regulatório de 90 Dias (Anatel RGI)
                </h4>
                <p className="text-xs text-amber-800/90 m-0 mt-0.5 max-w-2xl">
                  Glosas de interconexão que não forem respondidas ou pacificadas dentro do prazo de 90 dias prescrevem administrativamente ou são remetidas à Câmara de Resolução de Conflitos da ABR Telecom / Anatel.
                </p>
              </div>
            </div>

            <div className="text-right shrink-0">
              <div className="text-xs text-amber-800 font-medium">Glosas em Análise Crítica (&lt; 30 dias):</div>
              <div className="text-xl font-black text-rose-600 font-mono">1 Caso Urgente</div>
            </div>
          </div>

          {/* Tabela de Glosas & Contestações */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <h3 className="text-base font-bold text-slate-800 m-0">
                Contestações e Disputas Técnicas de Bilhetagem (CDRs)
              </h3>
              <p className="text-xs text-slate-500 m-0 mt-0.5">
                Acompanhamento das divergências de tráfego, fraudes alegadas e conciliações de minutos com as parceiras.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-600 font-semibold uppercase tracking-wider">
                    <th className="py-3.5 px-4">Protocolo / Fatura</th>
                    <th className="py-3.5 px-4">Operadora</th>
                    <th className="py-3.5 px-4">Motivo Regulatório</th>
                    <th className="py-3.5 px-4 text-right">Minutos Glosados</th>
                    <th className="py-3.5 px-4 text-right">Valor em Disputa</th>
                    <th className="py-3.5 px-4 text-center">Prazo 90 Dias</th>
                    <th className="py-3.5 px-4 text-center">Status</th>
                    <th className="py-3.5 px-4 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {mockContestations.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-mono font-bold text-blue-700">{c.id.toUpperCase()}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{c.invoiceNumber}</div>
                      </td>

                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        {c.carrierName}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-800">
                          {c.reason === 'DIVERGENCIA_CDRS' && 'Divergência de Bilhetes (CDRs)'}
                          {c.reason === 'CHAMADA_NAO_COMPLETADA' && 'Chamadas Não Completadas'}
                          {c.reason === 'TRAFEGO_ARTIFICIAL_FRAUDE' && 'Tráfego Artificial / Bypass'}
                          {c.reason === 'ERRO_DE_CADENCIA_30_6' && 'Erro de Cadência 30s/6s'}
                        </div>
                        <div className="text-[10px] text-slate-500 line-clamp-1 max-w-xs">
                          {c.reasonDescription}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono text-slate-800">
                        {formatNumber(c.disputedMinutes)}
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono font-bold text-amber-600">
                        {formatBRL(c.disputedValue)}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <div className="font-semibold text-slate-700">{c.deadline90Days}</div>
                        {c.daysRemaining > 0 ? (
                          <div
                            className={`text-[10px] font-bold ${
                              c.daysRemaining <= 30 ? 'text-rose-600' : 'text-amber-600'
                            }`}
                          >
                            Restam {c.daysRemaining} dias
                          </div>
                        ) : (
                          <div className="text-[10px] font-bold text-slate-400">Prazo Concluído</div>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        {c.status === 'EM_ANALISE' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-100 text-amber-800 border border-amber-200">
                            Em Análise Técnica
                          </span>
                        )}
                        {c.status === 'ACEITA_GLOSA' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800 border border-emerald-200">
                            Glosa Acatada
                          </span>
                        )}
                        {c.status === 'ARBITRAGEM_ANATEL' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-purple-100 text-purple-800 border border-purple-200">
                            Arbitragem Anatel
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => setSelectedContestation(c)}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-amber-600 hover:text-white rounded-lg text-slate-700 font-bold text-[11px] transition-all cursor-pointer"
                        >
                          Parecer Técnico
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================== */}
      {/* SUB-ABA 5: SIMULADOR & CALCULADORA DETRAF                  */}
      {/* ========================================================== */}
      {activeSubTab === 'calculadora' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Painel de Parâmetros de Entrada */}
          <div className="lg:col-span-5 bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-5">
            <div>
              <h3 className="text-base font-bold text-slate-800 m-0 flex items-center gap-2">
                <Calculator className="w-5 h-5 text-indigo-600" />
                Parâmetros de Simulação de Tráfego
              </h3>
              <p className="text-xs text-slate-500 m-0 mt-0.5">
                Projeção paramétrica de receitas e custos de interconexão baseada no modelo regulado da Anatel.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Operadora Parceira de Referência
                </label>
                <select
                  value={simCarrier}
                  onChange={(e) => setSimCarrier(e.target.value)}
                  className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {mockCarriers.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.serviceType})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Minutos de Entrada Projetados (Inbound / Terminação Ativa)
                </label>
                <input
                  type="number"
                  step="100000"
                  value={simMinutesIn}
                  onChange={(e) => setSimMinutesIn(Number(e.target.value))}
                  className="w-full text-xs font-mono font-bold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Volume de chamadas que nossa rede 5G receberá de outras operadoras.
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Minutos de Saída Projetados (Outbound / Terminação Passiva)
                </label>
                <input
                  type="number"
                  step="100000"
                  value={simMinutesOut}
                  onChange={(e) => setSimMinutesOut(Number(e.target.value))}
                  className="w-full text-xs font-mono font-bold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Volume de chamadas que nossos assinantes originarão para redes terceiras.
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tarifa VU-M / TU-RL (R$/min)
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    value={simVumRate}
                    onChange={(e) => setSimVumRate(Number(e.target.value))}
                    className="w-full text-xs font-mono font-bold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <span className="text-[10px] text-slate-400">Padrão Anatel 2026</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Alíquota Tributária (PIS/COFINS %)
                  </label>
                  <input
                    type="number"
                    step="0.05"
                    value={simTaxRate}
                    onChange={(e) => setSimTaxRate(Number(e.target.value))}
                    className="w-full text-xs font-mono font-bold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <span className="text-[10px] text-slate-400">Regime Não-Cumulativo</span>
                </div>
              </div>

              {/* Botões de Predefinição Rápida */}
              <div className="pt-2 border-t border-slate-100">
                <span className="text-[11px] font-bold text-slate-500 block mb-2">Cenários Prontos:</span>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => {
                      setSimMinutesIn(15000000);
                      setSimMinutesOut(10000000);
                      setSimVumRate(0.0195);
                    }}
                    className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold cursor-pointer transition-colors"
                  >
                    +50% Expansão 5G
                  </button>
                  <button
                    onClick={() => {
                      setSimMinutesIn(8000000);
                      setSimMinutesOut(9500000);
                      setSimVumRate(0.0180);
                    }}
                    className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold cursor-pointer transition-colors"
                  >
                    Cenário Conservador
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Painel de Resultados da Projeção */}
          <div className="lg:col-span-7 space-y-5">
            <div className="bg-gradient-to-br from-slate-900 to-indigo-950 rounded-2xl p-6 text-white border border-indigo-900/40 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-300">
                  Resultado Financeiro Projetado (Netting)
                </span>
                <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] font-bold uppercase">
                  Regime de Competência
                </span>
              </div>

              <div className="text-3xl font-black text-white">
                <span className={simCalculations.netBalance >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                  {simCalculations.netBalance >= 0 ? '+' : ''}
                  {formatBRL(simCalculations.netBalance)}
                </span>
              </div>
              <div className="text-xs text-indigo-200 mt-1">
                {simCalculations.netBalance >= 0
                  ? 'Superávit líquido de interconexão a ser recebido da parceira.'
                  : 'Déficit líquido de interconexão a ser pago à parceira.'}
              </div>

              {/* Detalhamento Inbound vs Outbound */}
              <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-indigo-900/60">
                <div className="bg-slate-800/60 p-4 rounded-xl border border-indigo-900/30">
                  <div className="text-xs text-emerald-300 font-bold flex items-center gap-1.5">
                    <ArrowDownLeft className="w-3.5 h-3.5" />
                    Receita de Interconexão (In)
                  </div>
                  <div className="text-lg font-black text-white mt-1">
                    {formatBRL(simCalculations.netIn)}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1">
                    Bruto: {formatBRL(simCalculations.grossIn)} | Impostos: {formatBRL(simCalculations.taxesIn)}
                  </div>
                </div>

                <div className="bg-slate-800/60 p-4 rounded-xl border border-indigo-900/30">
                  <div className="text-xs text-rose-300 font-bold flex items-center gap-1.5">
                    <ArrowUpRight className="w-3.5 h-3.5" />
                    Custo de Interconexão (Out)
                  </div>
                  <div className="text-lg font-black text-white mt-1">
                    {formatBRL(simCalculations.netOut)}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1">
                    Bruto: {formatBRL(simCalculations.grossOut)} | Impostos: {formatBRL(simCalculations.taxesOut)}
                  </div>
                </div>
              </div>
            </div>

            {/* Demonstração Sintética do Cálculo */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-3">
              <h4 className="text-xs font-bold uppercase text-slate-700 tracking-wider m-0">
                Memória da Fórmula Regulatória de Interconexão
              </h4>

              <div className="p-4 bg-slate-50 rounded-xl font-mono text-xs text-slate-800 space-y-2 border border-slate-200/60">
                <div className="flex justify-between">
                  <span>Receita Bruta = Minutos IN × Tarifa VU-M:</span>
                  <span className="font-bold">{formatNumber(simMinutesIn)} × R$ {simVumRate.toFixed(4)} = {formatBRL(simCalculations.grossIn)}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>(-) PIS/COFINS ({simTaxRate}%):</span>
                  <span>- {formatBRL(simCalculations.taxesIn)}</span>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-1 font-bold text-emerald-600">
                  <span>(=) Receita Líquida Inbound:</span>
                  <span>{formatBRL(simCalculations.netIn)}</span>
                </div>
                <div className="flex justify-between text-rose-600 border-t border-slate-200 pt-1 font-bold">
                  <span>(-) Custo Líquido Outbound:</span>
                  <span>- {formatBRL(simCalculations.netOut)}</span>
                </div>
                <div className="flex justify-between border-t-2 border-slate-300 pt-2 font-black text-slate-900 text-sm">
                  <span>(=) Saldo Líquido de Compensação (Netting):</span>
                  <span className={simCalculations.netBalance >= 0 ? 'text-emerald-700' : 'text-rose-700'}>
                    {formatBRL(simCalculations.netBalance)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================== */}
      {/* MODAL DE DETALHES DA FATURA                                */}
      {/* ========================================================== */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-scaleUp">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                  Documento DETRAF Oficial
                </span>
                <h3 className="text-base font-bold text-slate-800 m-0 mt-1">
                  {selectedInvoice.invoiceNumber}
                </h3>
              </div>
              <button
                onClick={() => setSelectedInvoice(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Operadora:</span>
                <span className="font-bold text-slate-800">{selectedInvoice.carrierName}</span>
              </div>

              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Fluxo:</span>
                <span className="font-bold">
                  {selectedInvoice.direction === 'INBOUND' ? 'Inbound (A Receber)' : 'Outbound (A Pagar)'}
                </span>
              </div>

              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Mês de Referência:</span>
                <span className="font-bold text-slate-800">{selectedInvoice.referenceMonth}</span>
              </div>

              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Data de Vencimento:</span>
                <span className="font-bold text-slate-800">{selectedInvoice.dueDate}</span>
              </div>

              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Minutos Cursados:</span>
                <span className="font-mono font-bold text-slate-800">
                  {formatNumber(selectedInvoice.totalMinutes)} min (Cadência {selectedInvoice.cadence})
                </span>
              </div>

              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Tarifa Regulada Aplicada:</span>
                <span className="font-mono font-bold text-slate-800">
                  R$ {selectedInvoice.tariffRate.toFixed(4)} / min ({selectedInvoice.tariffType})
                </span>
              </div>

              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Valor Bruto Faturado:</span>
                <span className="font-mono font-bold text-slate-800">{formatBRL(selectedInvoice.grossValue)}</span>
              </div>

              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Tributos (PIS/COFINS):</span>
                <span className="font-mono font-bold text-slate-800">- {formatBRL(selectedInvoice.taxValue)}</span>
              </div>

              <div className="flex justify-between py-2 bg-slate-50 px-3 rounded-lg border border-slate-200">
                <span className="font-bold text-slate-700">Valor Líquido da Fatura:</span>
                <span className="font-mono font-black text-emerald-600 text-sm">
                  {formatBRL(selectedInvoice.netValue)}
                </span>
              </div>

              {selectedInvoice.disputedAmount > 0 && (
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 mt-2">
                  <div className="font-bold text-amber-800 flex items-center gap-1 mb-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Valor Glosado / Contestado: {formatBRL(selectedInvoice.disputedAmount)}
                  </div>
                  <p className="text-[11px] text-amber-700 m-0">
                    {selectedInvoice.disputeNotes}
                  </p>
                </div>
              )}
            </div>

            <div className="mt-6">
              <button
                onClick={() => setSelectedInvoice(null)}
                className="w-full py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================== */}
      {/* MODAL DE DETALHES DA GLOSA / CONTESTAÇÃO                   */}
      {/* ========================================================== */}
      {selectedContestation && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-scaleUp">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 bg-amber-50 px-2 py-0.5 rounded">
                  Parecer Técnico de Glosa Anatel
                </span>
                <h3 className="text-base font-bold text-slate-800 m-0 mt-1">
                  {selectedContestation.id.toUpperCase()} - {selectedContestation.carrierName}
                </h3>
              </div>
              <button
                onClick={() => setSelectedContestation(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Fatura de Origem:</span>
                <span className="font-mono font-bold text-blue-700">{selectedContestation.invoiceNumber}</span>
              </div>

              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Valor em Disputa:</span>
                <span className="font-mono font-bold text-amber-600">{formatBRL(selectedContestation.disputedValue)}</span>
              </div>

              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Minutos Contestados:</span>
                <span className="font-mono font-bold text-slate-800">{formatNumber(selectedContestation.disputedMinutes)} min</span>
              </div>

              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Limite de 90 Dias (Anatel):</span>
                <span className="font-bold text-rose-600">{selectedContestation.deadline90Days} ({selectedContestation.daysRemaining} dias restantes)</span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 mt-2">
                <span className="font-bold text-slate-700 block mb-1">Motivo e Descrição da Discrepância:</span>
                <p className="text-[11px] text-slate-600 m-0 leading-relaxed">
                  {selectedContestation.reasonDescription}
                </p>
              </div>

              <div className="p-3 bg-blue-50 rounded-xl border border-blue-200 mt-2">
                <span className="font-bold text-blue-800 block mb-1">Análise Técnica da Engenharia O&M 5G:</span>
                <p className="text-[11px] text-blue-700 m-0 leading-relaxed">
                  {selectedContestation.technicalAnalysis}
                </p>
              </div>
            </div>

            <div className="mt-6">
              <button
                onClick={() => setSelectedContestation(null)}
                className="w-full py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Novo Lançamento / Importar Arquivo */}
      <NewEntryModal
        isOpen={isEntryModalOpen}
        onClose={() => setIsEntryModalOpen(false)}
        onSaveDetrafInvoice={handleSaveDetrafInvoice}
      />
    </div>
  );
};
