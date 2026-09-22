import React from 'react';
import { 
  XCircle, 
  Printer, 
  ShieldAlert, 
  Scale, 
  FileText 
} from 'lucide-react';
import type { ContestationRecord } from '../types/detraf';

interface ContestationDossierModalProps {
  isOpen: boolean;
  onClose: () => void;
  contestation: ContestationRecord | null;
}

export const ContestationDossierModal: React.FC<ContestationDossierModalProps> = ({
  isOpen,
  onClose,
  contestation
}) => {
  if (!isOpen || !contestation) return null;

  const formatBRL = (val: number) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const originalEstimate = contestation.disputedValue * 3.8;
  const acceptedValue = originalEstimate - contestation.disputedValue;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto print:p-0 print:bg-white print:static">
      <div className="bg-white rounded-2xl max-w-3xl w-full p-8 shadow-2xl border border-slate-200 flex flex-col max-h-[95vh] overflow-y-auto print:max-h-none print:overflow-visible print:border-none print:shadow-none print:p-6 print:rounded-none">
        {/* Barra de Ações Superior (Oculta na Impressão) */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 print:hidden">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-md text-xs font-bold uppercase bg-amber-100 text-amber-800 border border-amber-200">
              Dossiê Regulatório Anatel (90 Dias)
            </span>
            <span className="text-xs text-slate-500 font-medium">Documento formal de contestação de interconexão</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-md shadow-amber-600/20 cursor-pointer"
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

        {/* ÁREA IMPRIMÍVEL DO DOSSIÊ */}
        <div className="space-y-6 pt-4 print:pt-0">
          {/* Cabeçalho Oficial */}
          <div className="flex items-start justify-between border-b-2 border-slate-900 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-600 text-white flex items-center justify-center font-black text-sm">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <h1 className="text-lg font-black text-slate-900 m-0 tracking-tight">
                  NOTIFICAÇÃO FORMAL DE CONTESTAÇÃO DE DETRAF
                </h1>
              </div>
              <p className="text-xs text-slate-500 mt-1 m-0">
                Fundamentada no Regulamento Geral de Interconexão (RGI - Resolução nº 693/2017 da Anatel)
              </p>
            </div>

            <div className="text-right text-xs">
              <span className="font-bold text-slate-900 block font-mono">PROTOCOLO: {contestation.id.toUpperCase()}</span>
              <span className="text-slate-500 block">Data de Abertura: {contestation.openDate}</span>
              <span className="text-amber-700 font-bold block mt-1">Prazo Legal: {contestation.daysRemaining} dias restantes</span>
            </div>
          </div>

          {/* Dados das Partes e da Fatura */}
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Prestadora Notificante</span>
              <span className="font-bold text-slate-900 block">BRISANET TELECOMUNICAÇÕES S.A.</span>
              <span className="text-slate-500 block">CNPJ: 04.601.397/0001-28</span>
              <span className="text-slate-500 block">Outorgas: SMP (Móvel 5G) e STFC (Fixa)</span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Prestadora Notificada</span>
              <span className="font-bold text-slate-900 block">{contestation.carrierName}</span>
              <span className="text-slate-500 block">Fatura Contestada: {contestation.invoiceNumber}</span>
              <span className="text-slate-500 block">Mês de Competência: {contestation.referenceMonth}</span>
            </div>
          </div>

          {/* Quadro de Valores & Discriminação da Glosa */}
          <div>
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Scale className="w-3.5 h-3.5 text-amber-600" />
              1. Demonstrativo Financeiro da Glosa
            </h3>
            <table className="w-full text-left border-collapse text-xs border border-slate-200">
              <thead className="bg-slate-100 font-bold text-slate-700">
                <tr>
                  <th className="py-2 px-3 border-b border-slate-200">Item / Especificação</th>
                  <th className="py-2 px-3 border-b border-slate-200 text-right">Minutos Apurados</th>
                  <th className="py-2 px-3 border-b border-slate-200 text-right">Tarifa Base</th>
                  <th className="py-2 px-3 border-b border-slate-200 text-right">Valor Total (R$)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                <tr>
                  <td className="py-2 px-3 text-slate-800">Valor Faturado pela {contestation.carrierName}</td>
                  <td className="py-2 px-3 text-right font-mono">-</td>
                  <td className="py-2 px-3 text-right font-mono">-</td>
                  <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                    {formatBRL(originalEstimate)}
                  </td>
                </tr>
                <tr className="bg-amber-50/50">
                  <td className="py-2 px-3 text-amber-900 font-semibold">
                    (-) Parcela Contestada / Glosa Técnica ({contestation.reasonDescription})
                  </td>
                  <td className="py-2 px-3 text-right font-mono text-amber-900 font-bold">
                    {contestation.disputedMinutes.toLocaleString('pt-BR')} min
                  </td>
                  <td className="py-2 px-3 text-right font-mono text-amber-900 font-bold">-</td>
                  <td className="py-2 px-3 text-right font-mono font-black text-rose-600">
                    - {formatBRL(contestation.disputedValue)}
                  </td>
                </tr>
                <tr className="bg-emerald-50/60 font-bold">
                  <td className="py-2 px-3 text-emerald-950">
                    (=) Valor Incontroverso Reconhecido para Liquidação Líquida
                  </td>
                  <td className="py-2 px-3 text-right font-mono text-emerald-950">-</td>
                  <td className="py-2 px-3 text-right font-mono text-emerald-950">-</td>
                  <td className="py-2 px-3 text-right font-mono font-black text-emerald-700">
                    {formatBRL(acceptedValue)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Fundamentação Técnica & Análise dos CDRs */}
          <div className="space-y-3 text-xs">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5 m-0">
              <FileText className="w-3.5 h-3.5 text-blue-600" />
              2. Fundamentação Técnica e Evidências Extraídas dos CDRs
            </h3>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-slate-700 leading-relaxed">
              <p className="m-0">
                <strong>Motivo da Contestação:</strong> {contestation.reasonDescription}
              </p>
              <p className="m-0 text-slate-600">
                {contestation.technicalAnalysis || 'A conciliação bilateral entre a bilhetagem dos SBCs (Session Border Controllers) da Brisanet e o espelho DETRAF revelou divergência material superior à tolerância técnica admitida pelo Regulamento Geral de Interconexão (RGI). Chamadas com cadência incorreta e registros não encontrados nos pontos de interconexão física (POI) foram devidamente glosados.'}
              </p>
              <p className="m-0 text-[11px] text-slate-500 font-mono">
                Anexo Técnico: Arquivo CSV de bilhetagem com carimbos de data/hora (CDR_BRISANET_{contestation.referenceMonth}.csv) encaminhado em conjunto.
              </p>
            </div>
          </div>

          {/* Parecer Regulatório & Assinaturas */}
          <div className="border-t border-slate-200 pt-4 space-y-3 text-xs">
            <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-amber-900 text-[11px] leading-relaxed">
              <strong>Nota Regulatória:</strong> Nos termos do Artigo 48 do RGI/Anatel, o valor incontroverso de <strong>{formatBRL(acceptedValue)}</strong> será processado na compensação financeira bilateral (*netting*), ficando o valor glosado de <strong>{formatBRL(contestation.disputedValue)}</strong> suspenso até a conclusão da análise técnica entre as partes no prazo de até 30 dias úteis.
            </div>

            <div className="grid grid-cols-2 gap-12 pt-8 text-center">
              <div>
                <div className="border-t border-slate-400 pt-1.5 font-bold text-slate-900">
                  Gerência de Interconexão & Atacado
                </div>
                <span className="text-[10px] text-slate-500">Engenharia de Tráfego & Mediação</span>
              </div>

              <div>
                <div className="border-t border-slate-400 pt-1.5 font-bold text-slate-900">
                  Controladoria & Jurídico Regulatório
                </div>
                <span className="text-[10px] text-slate-500">Representação Legal Brisanet</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
