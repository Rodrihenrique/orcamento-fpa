import React, { useState, useMemo } from 'react';
import { 
  Building2, 
  Search, 
  TrendingUp, 
  Calculator, 
  CheckCircle2, 
  AlertTriangle,
  Radio,
  FileSpreadsheet
} from 'lucide-react';
import type { SiteContract, ContractIndex, ContractStatus } from '../types/contracts';
import { MONTHS } from '../data/mockData';
import * as XLSX from 'xlsx';

interface ContractsViewProps {
  contracts: SiteContract[];
}

export const ContractsView: React.FC<ContractsViewProps> = ({ contracts }) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedIndex, setSelectedIndex] = useState<'ALL' | ContractIndex>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<'ALL' | ContractStatus>('ALL');

  // Parâmetros do Simulador de Reajuste
  const [simIgpmRate, setSimIgpmRate] = useState<number>(4.8);
  const [simIpcaRate, setSimIpcaRate] = useState<number>(4.2);

  const formatBRL = (val: number) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  // Filtros
  const filteredContracts = useMemo(() => {
    return contracts.filter((ctr) => {
      const matchSearch = 
        ctr.siteCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ctr.siteName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ctr.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ctr.landlord.toLowerCase().includes(searchTerm.toLowerCase());

      const matchIndex = selectedIndex === 'ALL' || ctr.index === selectedIndex;
      const matchStatus = selectedStatus === 'ALL' || ctr.status === selectedStatus;

      return matchSearch && matchIndex && matchStatus;
    });
  }, [contracts, searchTerm, selectedIndex, selectedStatus]);

  // Métricas Consolidadas
  const totalMonthlyRent = useMemo(() => {
    return contracts.reduce((acc, c) => acc + c.monthlyRent, 0);
  }, [contracts]);

  const annualProjectedRent = totalMonthlyRent * 12;
  const averageRentPerSite = contracts.length > 0 ? totalMonthlyRent / contracts.length : 0;

  // Impacto do Reajuste Simulado
  const simulatedAdjustmentImpact = useMemo(() => {
    return contracts.reduce((acc, c) => {
      const rate = c.index === 'IGP-M' ? simIgpmRate : simIpcaRate;
      const monthlyIncrease = c.monthlyRent * (rate / 100);
      const remainingMonths = Math.max(1, 12 - c.anniversaryMonth + 1);
      return acc + (monthlyIncrease * remainingMonths);
    }, 0);
  }, [contracts, simIgpmRate, simIpcaRate]);

  // Exportar Rent Roll para Excel
  const handleExportExcel = () => {
    const rows = [
      ['ORÇAHUB FP&A - RENT ROLL DE SITES & INFRAESTRUTURA (TORRES)'],
      ['Data de Emissão:', new Date().toLocaleString('pt-BR')],
      [],
      [
        'Cód. Site',
        'Nome do Site',
        'Cidade',
        'UF',
        'Locador / TowerCo',
        'Tipo de Instalação',
        'Aluguel Mensal (R$)',
        'Índice',
        'Mês de Reajuste',
        'Início Contrato',
        'Vencimento Contrato',
        'Status'
      ],
      ...filteredContracts.map((c) => [
        c.siteCode,
        c.siteName,
        c.city,
        c.state,
        c.landlord,
        c.landlordType,
        c.monthlyRent,
        c.index,
        MONTHS[c.anniversaryMonth - 1] || c.anniversaryMonth,
        c.startDate,
        c.expirationDate,
        c.status
      ])
    ];

    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Rent Roll');
    XLSX.writeFile(wb, 'OrcaHub_RentRoll_Torres_2026.xlsx');
  };

  return (
    <div className="space-y-6 pb-12 animate-fadeIn">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 rounded-2xl p-6 text-white border border-blue-900/40 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase bg-blue-500/20 text-blue-300 border border-blue-500/30">
                Infraestrutura de Rede Móvel 5G
              </span>
              <span className="text-xs text-slate-400">Conta Contábil: 3.2.01 (Locação de Sites)</span>
            </div>
            <h2 className="text-2xl font-black text-white m-0">
              Gestão de Contratos de Torres & Sites (Rent Roll)
            </h2>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
              Controle dos contratos de locação de infraestrutura passiva (TowerCos, Rooftops e Terrenos Greenfield) com projeção automatizada do impacto de reajustes por IGP-M e IPCA.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleExportExcel}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20 transition-all flex items-center gap-2 cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Exportar Rent Roll (.xlsx)</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Sites Contratados Ativos
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Radio className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900 font-mono">
            {contracts.length} sites
          </div>
          <div className="mt-2 text-xs text-slate-500">
            Torres próprias e compartilhadas
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Custo Mensal de Locação
            </span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900 font-mono">
            {formatBRL(totalMonthlyRent)}
          </div>
          <div className="mt-2 text-xs text-indigo-600 font-semibold flex items-center justify-between">
            <span>Base mensal (OPEX 3.2.01)</span>
            <span className="text-slate-400 font-mono">Anual: {formatBRL(annualProjectedRent)}</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Média por Site
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Calculator className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-emerald-600 font-mono">
            {formatBRL(averageRentPerSite)}
          </div>
          <div className="mt-2 text-xs text-slate-500">
            Custo médio de locação por ponto
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Impacto Anual de Reajuste
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-amber-600 font-mono">
            + {formatBRL(simulatedAdjustmentImpact)}
          </div>
          <div className="mt-2 text-xs text-slate-500">
            Acréscimo acumulado projetado no ano
          </div>
        </div>
      </div>

      {/* Painel do Simulador de Reajuste */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-3 mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 m-0 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              Simulador de Sensibilidade de Reajuste dos Contratos
            </h3>
            <p className="text-xs text-slate-500 m-0 mt-0.5">
              Ajuste as taxas projetadas dos índices para calcular o impacto imediato no orçamento anual de locação.
            </p>
          </div>

          <div className="flex items-center gap-6 text-xs">
            <div className="flex items-center gap-2">
              <label className="font-bold text-slate-700">IGP-M Projetado (%):</label>
              <input
                type="number"
                step="0.1"
                value={simIgpmRate}
                onChange={(e) => setSimIgpmRate(Number(e.target.value))}
                className="w-20 px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold text-slate-900 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <label className="font-bold text-slate-700">IPCA Projetado (%):</label>
              <input
                type="number"
                step="0.1"
                value={simIpcaRate}
                onChange={(e) => setSimIpcaRate(Number(e.target.value))}
                className="w-20 px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold text-slate-900 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Tabela de Contratos (Rent Roll) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {/* Barra de Filtros */}
        <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4 bg-slate-50/50">
          <div className="flex items-center gap-3 flex-1 min-w-[280px]">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por código do site, cidade, locador ou operadora..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-slate-700">Índice:</span>
            <select
              value={selectedIndex}
              onChange={(e) => setSelectedIndex(e.target.value as any)}
              className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="ALL">Todos os Índices</option>
              <option value="IGP-M">IGP-M</option>
              <option value="IPCA">IPCA</option>
            </select>

            <span className="text-xs font-bold text-slate-700 ml-2">Status:</span>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as any)}
              className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="ALL">Todos os Status</option>
              <option value="ATIVO">Ativo</option>
              <option value="REAJUSTADO">Reajustado</option>
              <option value="EM_RENOVACAO">Em Renovação</option>
            </select>
          </div>
        </div>

        {/* Tabela */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-900 text-white font-semibold">
              <tr>
                <th className="py-3.5 px-4 min-w-[120px]">Cód. Site</th>
                <th className="py-3.5 px-4 min-w-[180px]">Nome do Site</th>
                <th className="py-3.5 px-4 min-w-[140px]">Cidade / UF</th>
                <th className="py-3.5 px-4 min-w-[180px]">Locador / TowerCo</th>
                <th className="py-3.5 px-4 text-right min-w-[120px] font-mono">Aluguel Atual</th>
                <th className="py-3.5 px-4 text-center min-w-[90px]">Índice</th>
                <th className="py-3.5 px-4 text-center min-w-[110px]">Mês Aniversário</th>
                <th className="py-3.5 px-4 text-center min-w-[110px]">Vencimento</th>
                <th className="py-3.5 px-4 text-center min-w-[110px]">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredContracts.map((ctr) => (
                <tr key={ctr.id} className="hover:bg-blue-50/30 transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-blue-600">
                    {ctr.siteCode}
                  </td>
                  <td className="py-3 px-4 font-semibold text-slate-900">
                    {ctr.siteName}
                  </td>
                  <td className="py-3 px-4 text-slate-600">
                    {ctr.city} - {ctr.state}
                  </td>
                  <td className="py-3 px-4 text-slate-800">
                    <span className="font-medium block">{ctr.landlord}</span>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider">{ctr.landlordType}</span>
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                    {formatBRL(ctr.monthlyRent)}
                  </td>
                  <td className="py-3 px-4 text-center font-bold">
                    <span className={`px-2 py-0.5 rounded text-[10px] ${
                      ctr.index === 'IGP-M' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                    }`}>
                      {ctr.index}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center text-slate-700 font-medium">
                    {MONTHS[ctr.anniversaryMonth - 1]} (Mês {ctr.anniversaryMonth})
                  </td>
                  <td className="py-3 px-4 text-center font-mono text-slate-500">
                    {ctr.expirationDate}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider inline-flex items-center gap-1 ${
                      ctr.status === 'REAJUSTADO'
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        : ctr.status === 'EM_RENOVACAO'
                        ? 'bg-amber-100 text-amber-800 border border-amber-200'
                        : 'bg-blue-100 text-blue-800 border border-blue-200'
                    }`}>
                      {ctr.status === 'REAJUSTADO' && <CheckCircle2 className="w-3 h-3" />}
                      {ctr.status === 'EM_RENOVACAO' && <AlertTriangle className="w-3 h-3" />}
                      <span>{ctr.status}</span>
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
