import React from 'react';
import { 
  XCircle, 
  Printer, 
  Building2, 
  Scale
} from 'lucide-react';
import type { OpexItem, CapexProject, CostCenter } from '../types/budget';
import type { DetrafInvoice } from '../types/detraf';

interface ExecutiveReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  opexItems: OpexItem[];
  capexProjects: CapexProject[];
  costCenters: CostCenter[];
  detrafInvoices: DetrafInvoice[];
}

export const ExecutiveReportModal: React.FC<ExecutiveReportModalProps> = ({
  isOpen,
  onClose,
  opexItems,
  capexProjects,
  costCenters,
  detrafInvoices
}) => {
  if (!isOpen) return null;

  const formatBRL = (val: number) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
  };

  // Totais
  const totalOpexBudget = opexItems.reduce(
    (acc, item) => acc + item.monthlyBudget.reduce((a, b) => a + b, 0),
    0
  );

  const totalCapexPlanned = capexProjects.reduce((acc, p) => acc + p.totalInvestment, 0);
  const totalCapexRealized = capexProjects.reduce(
    (acc, p) => acc + p.monthlyActual.reduce((a, b) => a + b, 0),
    0
  );

  const totalDetrafInbound = detrafInvoices
    .filter(i => i.direction === 'INBOUND')
    .reduce((acc, i) => acc + i.netValue, 0);

  const totalDetrafOutbound = detrafInvoices
    .filter(i => i.direction === 'OUTBOUND')
    .reduce((acc, i) => acc + i.netValue, 0);

  const netDetraf = totalDetrafInbound - totalDetrafOutbound;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto print:p-0 print:bg-white print:static">
      <div className="bg-white rounded-2xl max-w-4xl w-full p-8 shadow-2xl border border-slate-200 flex flex-col max-h-[95vh] overflow-y-auto print:max-h-none print:overflow-visible print:border-none print:shadow-none print:p-6 print:rounded-none">
        {/* Barra de Ações Superior (Oculta na Impressão) */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 print:hidden">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-md text-xs font-bold uppercase bg-blue-100 text-blue-800">
              One-Pager Executivo
            </span>
            <span className="text-xs text-slate-500 font-medium">Visualização prévia para diretoria e conselho</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-md shadow-blue-600/20 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir / Salvar PDF</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
            >
              <XCircle className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ÁREA IMPRIMÍVEL DO RELATÓRIO EXECUTIVO */}
        <div className="space-y-6 pt-4 print:pt-0">
          {/* Cabeçalho Oficial */}
          <div className="flex items-start justify-between border-b-2 border-slate-900 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-black text-sm">
                  BH
                </div>
                <h1 className="text-xl font-black text-slate-900 m-0 tracking-tight">
                  ORÇAHUB FP&A — BRISANET TELECOM
                </h1>
              </div>
              <p className="text-xs text-slate-500 mt-1 m-0">
                Relatório Mensal de Fechamento Orçamentário, CAPEX e Interconexão DETRAF
              </p>
            </div>

            <div className="text-right text-xs">
              <span className="font-bold text-slate-800 block">Competência: 2026</span>
              <span className="text-slate-400 block">Emissão: {new Date().toLocaleDateString('pt-BR')}</span>
              <span className="inline-block mt-1 px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold text-[10px] uppercase">
                Consolidado Oficial
              </span>
            </div>
          </div>

          {/* Destaques Numéricos Principais (KPI Cards) */}
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                OPEX Anual Aprovado
              </span>
              <span className="text-xl font-black text-slate-900 font-mono mt-1 block">
                {formatBRL(totalOpexBudget)}
              </span>
              <span className="text-[10px] text-slate-500 mt-1 block">
                {opexItems.length} rubricas orçamentárias ativas
              </span>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                CAPEX Planejado vs Realizado
              </span>
              <span className="text-xl font-black text-blue-700 font-mono mt-1 block">
                {formatBRL(totalCapexRealized)}
              </span>
              <span className="text-[10px] text-slate-500 mt-1 block">
                Orçado: {formatBRL(totalCapexPlanned)} ({((totalCapexRealized / totalCapexPlanned) * 100).toFixed(1)}% realizado)
              </span>
            </div>

            <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/40">
              <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block">
                DETRAF Saldo Líquido (Netting)
              </span>
              <span className="text-xl font-black text-emerald-700 font-mono mt-1 block">
                {formatBRL(netDetraf)}
              </span>
              <span className="text-[10px] text-emerald-700 font-semibold mt-1 block">
                Superávit operacional (A Receber)
              </span>
            </div>
          </div>

          {/* Tabela Resumo de OPEX por Centro de Custo */}
          <div>
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-blue-600" />
              1. Despesas Operacionais por Diretoria & Centro de Custo
            </h3>
            <table className="w-full text-left border-collapse text-xs border border-slate-200">
              <thead className="bg-slate-100 font-bold text-slate-700">
                <tr>
                  <th className="py-2 px-3 border-b border-slate-200">Centro de Custo</th>
                  <th className="py-2 px-3 border-b border-slate-200">Diretoria</th>
                  <th className="py-2 px-3 border-b border-slate-200">Gestor</th>
                  <th className="py-2 px-3 border-b border-slate-200 text-right">Orçado Anual</th>
                  <th className="py-2 px-3 border-b border-slate-200 text-right">% do Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {costCenters.map(cc => {
                  const ccTotal = opexItems
                    .filter(item => item.costCenterId === cc.id)
                    .reduce((acc, item) => acc + item.monthlyBudget.reduce((a, b) => a + b, 0), 0);
                  const share = totalOpexBudget > 0 ? (ccTotal / totalOpexBudget) * 100 : 0;

                  return (
                    <tr key={cc.id}>
                      <td className="py-1.5 px-3 font-semibold text-slate-800">
                        {cc.code} - {cc.name}
                      </td>
                      <td className="py-1.5 px-3 text-slate-600">{cc.directorate}</td>
                      <td className="py-1.5 px-3 text-slate-600">{cc.manager}</td>
                      <td className="py-1.5 px-3 text-right font-mono font-bold text-slate-900">
                        {formatBRL(ccTotal)}
                      </td>
                      <td className="py-1.5 px-3 text-right font-mono text-slate-500">
                        {share.toFixed(1)}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Tabela Resumo de DETRAF Interconexão */}
          <div>
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Scale className="w-3.5 h-3.5 text-blue-600" />
              2. Posição Financeira de Interconexão (DETRAF Bilateral)
            </h3>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-500 font-bold block mb-1">Tráfego Inbound (Terminação Ativa)</span>
                <span className="text-sm font-black text-emerald-600 font-mono block">
                  {formatBRL(totalDetrafInbound)}
                </span>
                <span className="text-[11px] text-slate-400 mt-0.5 block">
                  Receita de terminação móvel (VU-M) e fixa (TU-RL)
                </span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-500 font-bold block mb-1">Tráfego Outbound (Custos de Saída)</span>
                <span className="text-sm font-black text-rose-600 font-mono block">
                  {formatBRL(totalDetrafOutbound)}
                </span>
                <span className="text-[11px] text-slate-400 mt-0.5 block">
                  Custo pago a operadoras parceiras por chamadas originadas
                </span>
              </div>
            </div>
          </div>

          {/* Parecer de Controladoria & Assinaturas */}
          <div className="border-t border-slate-200 pt-4 space-y-3">
            <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-200 text-xs text-blue-900">
              <strong>Parecer da Controladoria:</strong> As despesas operacionais e investimentos estão aderentes às premissas corporativas aprovadas para 2026. A compensação de interconexão DETRAF mantém posição superavitária e os pagamentos de contratos de infraestrutura seguem os prazos contratuais.
            </div>

            <div className="grid grid-cols-3 gap-8 pt-8 text-center text-xs">
              <div>
                <div className="border-t border-slate-400 pt-1.5 font-bold text-slate-800">
                  Gerência de FP&A
                </div>
                <span className="text-[10px] text-slate-400">Elaboração Orçamentária</span>
              </div>

              <div>
                <div className="border-t border-slate-400 pt-1.5 font-bold text-slate-800">
                  Diretoria de Operações
                </div>
                <span className="text-[10px] text-slate-400">Validação Técnica</span>
              </div>

              <div>
                <div className="border-t border-slate-400 pt-1.5 font-bold text-slate-800">
                  Diretoria Financeira (CFO)
                </div>
                <span className="text-[10px] text-slate-400">Aprovação Executiva</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
