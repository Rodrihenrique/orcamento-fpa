import React, { useState } from 'react';
import {
  XCircle,
  UploadCloud,
  CheckCircle2,
  PhoneCall,
  Receipt,
  FileUp
} from 'lucide-react';
import { mockCarriers } from '../data/mockDetrafData';
import type { DetrafInvoice, TrafficDirection, TariffType, InvoiceStatus } from '../types/detraf';
import type { OpexItem } from '../types/budget';

interface NewEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveDetrafInvoice: (newInvoice: DetrafInvoice) => void;
  onSaveOpexItem?: (newOpex: OpexItem) => void;
}

export const NewEntryModal: React.FC<NewEntryModalProps> = ({
  isOpen,
  onClose,
  onSaveDetrafInvoice,
  onSaveOpexItem
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'manual'>('upload');

  // === ESTADO DA ABA 1: UPLOAD DE ARQUIVO ===
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isProcessingFile, setIsProcessingFile] = useState<boolean>(false);
  const [parsedPreview, setParsedPreview] = useState<{
    carrierId: string;
    carrierName: string;
    direction: TrafficDirection;
    referenceMonth: string;
    dueDate: string;
    totalMinutes: number;
    tariffType: TariffType;
    tariffRate: number;
    grossValue: number;
    taxValue: number;
    netValue: number;
  } | null>(null);

  // === ESTADO DA ABA 2: FORMULÁRIO MANUAL ===
  const [entryType, setEntryType] = useState<'DETRAF' | 'BOLETO_OPEX'>('DETRAF');
  const [carrierId, setCarrierId] = useState<string>('claro');
  const [direction, setDirection] = useState<TrafficDirection>('INBOUND');
  const [tariffType, setTariffType] = useState<TariffType>('VU-M');
  const [referenceMonth, setReferenceMonth] = useState<string>('2026-07');
  const [dueDate, setDueDate] = useState<string>('2026-08-15');
  const [totalMinutes, setTotalMinutes] = useState<number>(5000000);
  const [tariffRate, setTariffRate] = useState<number>(0.0195);
  const [taxPercent, setTaxPercent] = useState<number>(9.25);
  const [manualInvoiceNumber, setManualInvoiceNumber] = useState<string>('');
  const [status, setStatus] = useState<InvoiceStatus>('A_VENCER');
  const [notes, setNotes] = useState<string>('');

  // Estados específicos para OPEX
  const [opexSupplier, setOpexSupplier] = useState<string>('');
  const [opexValue, setOpexValue] = useState<number>(15000);
  const [opexBarcode, setOpexBarcode] = useState<string>('');

  if (!isOpen) return null;

  // Formatação de Moeda
  const formatBRL = (val: number) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const formatNumber = (val: number) => {
    return val.toLocaleString('pt-BR');
  };

  // Cálculos dinâmicos do formulário manual
  const calculatedGross = totalMinutes * tariffRate;
  const calculatedTax = calculatedGross * (taxPercent / 100);
  const calculatedNet = calculatedGross - calculatedTax;

  // === SIMULAÇÃO DE PARSING DO ARQUIVO CARREGADO ===
  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    setIsProcessingFile(true);

    // Simula a leitura e extração inteligente do arquivo (.pdf, .xlsx, .zip)
    setTimeout(() => {
      const fileNameLower = file.name.toLowerCase();
      let inferredCarrier = 'claro';
      let inferredCarrierName = 'Claro Brasil';
      let inferredDirection: TrafficDirection = 'INBOUND';
      let inferredMinutes = 8500000;
      let inferredRate = 0.0195;

      if (fileNameLower.includes('vivo') || fileNameLower.includes('telefonica')) {
        inferredCarrier = 'vivo';
        inferredCarrierName = 'Telefônica / Vivo';
        inferredMinutes = 11200000;
        inferredRate = 0.0192;
      } else if (fileNameLower.includes('tim')) {
        inferredCarrier = 'tim';
        inferredCarrierName = 'TIM Brasil';
        inferredMinutes = 7400000;
        inferredRate = 0.0198;
      } else if (fileNameLower.includes('algar')) {
        inferredCarrier = 'algar';
        inferredCarrierName = 'Algar Telecom';
        inferredMinutes = 1950000;
        inferredRate = 0.0098;
      }

      if (fileNameLower.includes('out') || fileNameLower.includes('saida') || fileNameLower.includes('pagar')) {
        inferredDirection = 'OUTBOUND';
      }

      const gross = inferredMinutes * inferredRate;
      const tax = gross * 0.0925;
      const net = gross - tax;

      setParsedPreview({
        carrierId: inferredCarrier,
        carrierName: inferredCarrierName,
        direction: inferredDirection,
        referenceMonth: '2026-07',
        dueDate: '2026-08-15',
        totalMinutes: inferredMinutes,
        tariffType: 'VU-M',
        tariffRate: inferredRate,
        grossValue: gross,
        taxValue: tax,
        netValue: net
      });

      setIsProcessingFile(false);
    }, 600);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleSaveUpload = () => {
    if (!parsedPreview) return;

    const newInvoice: DetrafInvoice = {
      id: `inv-${Date.now()}`,
      invoiceNumber: `DETRAF-${parsedPreview.referenceMonth.replace('-', '')}-${parsedPreview.carrierId.toUpperCase()}-${parsedPreview.direction === 'INBOUND' ? 'IN' : 'OUT'}`,
      carrierId: parsedPreview.carrierId,
      carrierName: parsedPreview.carrierName,
      direction: parsedPreview.direction,
      referenceMonth: parsedPreview.referenceMonth,
      issueDate: new Date().toISOString().split('T')[0],
      dueDate: parsedPreview.dueDate,
      totalMinutes: parsedPreview.totalMinutes,
      completedCalls: Math.round(parsedPreview.totalMinutes / 2),
      cadence: '30s/6s',
      tariffType: parsedPreview.tariffType,
      tariffRate: parsedPreview.tariffRate,
      grossValue: parsedPreview.grossValue,
      taxRate: 0.0925,
      taxValue: parsedPreview.taxValue,
      netValue: parsedPreview.netValue,
      status: 'A_VENCER',
      agingBucket: 'A_VENCER',
      daysOverdue: 0,
      disputedAmount: 0,
      disputeStatus: 'SEM_DISPUTA'
    };

    onSaveDetrafInvoice(newInvoice);
    onClose();
  };

  const handleSaveManual = (e: React.FormEvent) => {
    e.preventDefault();

    if (entryType === 'BOLETO_OPEX') {
      const monthIndex = referenceMonth ? parseInt(referenceMonth.split('-')[1], 10) - 1 : 5;
      const actuals = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
      const validMonth = monthIndex >= 0 && monthIndex < 12 ? monthIndex : 5;
      actuals[validMonth] = Number(opexValue) || 15000;

      const newOpex: OpexItem = {
        id: `opex-man-${Date.now()}`,
        costCenterId: 'cc-om5g',
        accountCode: '3.1.02.01',
        description: `${opexSupplier || 'Fornecedor de Rede'} (Boleto Manual)`,
        monthlyBudget: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        monthlyActual: actuals,
        monthlyProvision: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        memory: {
          periodicity: 'MENSAL',
          currency: 'BRL',
          formula: `Fatura Lançada Manualmente = ${formatBRL(Number(opexValue) || 15000)}`,
          justification: `Lançamento manual de ${opexSupplier || 'Fornecedor'}. Vencimento: ${dueDate}. ${opexBarcode ? 'Linha Digitável: ' + opexBarcode : ''}`,
          supplier: opexSupplier || 'Fornecedor Avulso'
        }
      };

      if (onSaveOpexItem) {
        onSaveOpexItem(newOpex);
      }
      onClose();
      return;
    }

    const selectedCarrierObj = mockCarriers.find(c => c.id === carrierId);
    const invoiceNum = manualInvoiceNumber.trim() || 
      `DETRAF-${referenceMonth.replace('-', '')}-${carrierId.toUpperCase()}-${direction === 'INBOUND' ? 'IN' : 'OUT'}`;

    const newInvoice: DetrafInvoice = {
      id: `inv-man-${Date.now()}`,
      invoiceNumber: invoiceNum,
      carrierId: carrierId,
      carrierName: selectedCarrierObj?.name || 'Operadora',
      direction: direction,
      referenceMonth: referenceMonth,
      issueDate: new Date().toISOString().split('T')[0],
      dueDate: dueDate,
      totalMinutes: Number(totalMinutes),
      completedCalls: Math.round(Number(totalMinutes) / 2),
      cadence: '30s/6s',
      tariffType: tariffType,
      tariffRate: Number(tariffRate),
      grossValue: calculatedGross,
      taxRate: taxPercent / 100,
      taxValue: calculatedTax,
      netValue: calculatedNet,
      status: status,
      agingBucket: 'A_VENCER',
      daysOverdue: 0,
      disputedAmount: 0,
      disputeStatus: 'SEM_DISPUTA',
      disputeNotes: notes || undefined
    };

    onSaveDetrafInvoice(newInvoice);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 animate-scaleUp max-h-[90vh] flex flex-col">
        {/* Cabeçalho do Modal */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-100 text-blue-800 border border-blue-200">
                Entrada de Documentos
              </span>
              <span className="text-xs text-slate-400">|</span>
              <span className="text-xs font-semibold text-slate-500">OrçaHub FP&A</span>
            </div>
            <h2 className="text-lg font-black text-slate-800 m-0 mt-1">
              Novo Lançamento / Importar Documento
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
          >
            <XCircle className="w-5 h-5" />
          </button>
        </div>

        {/* Abas de Navegação (Upload vs Manual) */}
        <div className="flex border-b border-slate-200 mt-4">
          <button
            onClick={() => setActiveTab('upload')}
            className={`flex items-center gap-2 px-5 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'upload'
                ? 'border-blue-600 text-blue-600 bg-blue-50/40'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileUp className="w-4 h-4" />
            <span>📁 Importar Arquivo (PDF / Excel / ZIP)</span>
          </button>

          <button
            onClick={() => setActiveTab('manual')}
            className={`flex items-center gap-2 px-5 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'manual'
                ? 'border-blue-600 text-blue-600 bg-blue-50/40'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Receipt className="w-4 h-4" />
            <span>✍️ Lançamento Manual Direto</span>
          </button>
        </div>

        {/* Conteúdo do Modal (Scrollável) */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
          {/* ========================================================== */}
          {/* ABA 1: IMPORTAÇÃO POR ARQUIVO (DRAG & DROP)                */}
          {/* ========================================================== */}
          {activeTab === 'upload' && (
            <div className="space-y-4">
              {/* Área de Drag & Drop */}
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer ${
                  isDragging
                    ? 'border-blue-500 bg-blue-50/60'
                    : 'border-slate-300 hover:border-blue-400 bg-slate-50/50'
                }`}
                onClick={() => document.getElementById('file-upload-input')?.click()}
              >
                <input
                  id="file-upload-input"
                  type="file"
                  accept=".pdf,.xlsx,.xls,.csv,.zip"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      handleFileSelect(e.target.files[0]);
                    }
                  }}
                />

                <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mx-auto mb-3">
                  <UploadCloud className="w-6 h-6" />
                </div>

                <div className="text-sm font-bold text-slate-800">
                  {selectedFile ? selectedFile.name : 'Arraste e solte o arquivo aqui ou clique para selecionar'}
                </div>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  Compatível com <strong>PDF</strong> (faturas/boletos), <strong>Excel / CSV</strong> (resumos de DETRAF) e <strong>ZIP</strong> (pacotes de bilhetagem de operadoras).
                </p>
              </div>

              {/* Feedback de Processamento */}
              {isProcessingFile && (
                <div className="flex items-center justify-center gap-2 p-4 bg-blue-50 text-blue-700 rounded-xl text-xs font-semibold">
                  <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  <span>Extraindo dados e conciliando regras de interconexão...</span>
                </div>
              )}

              {/* Prévia dos Dados Extraídos */}
              {parsedPreview && !isProcessingFile && (
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-700 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      Dados Extraídos com Sucesso
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Revise os campos antes de confirmar
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                    <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                      <span className="text-slate-400 block text-[10px]">Operadora</span>
                      <span className="font-bold text-slate-800">{parsedPreview.carrierName}</span>
                    </div>

                    <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                      <span className="text-slate-400 block text-[10px]">Sentido de Tráfego</span>
                      <span className="font-bold text-slate-800">
                        {parsedPreview.direction === 'INBOUND' ? 'Inbound (A Receber)' : 'Outbound (A Pagar)'}
                      </span>
                    </div>

                    <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                      <span className="text-slate-400 block text-[10px]">Competência / Vencimento</span>
                      <span className="font-bold text-slate-800">{parsedPreview.referenceMonth} | {parsedPreview.dueDate}</span>
                    </div>

                    <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                      <span className="text-slate-400 block text-[10px]">Minutos Cursados</span>
                      <span className="font-mono font-bold text-slate-800">{formatNumber(parsedPreview.totalMinutes)} min</span>
                    </div>

                    <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                      <span className="text-slate-400 block text-[10px]">Tarifa Aplicada</span>
                      <span className="font-mono font-bold text-slate-800">R$ {parsedPreview.tariffRate.toFixed(4)} ({parsedPreview.tariffType})</span>
                    </div>

                    <div className="bg-emerald-50 p-2.5 rounded-xl border border-emerald-200">
                      <span className="text-emerald-700 block text-[10px] font-bold">Valor Líquido</span>
                      <span className="font-mono font-black text-emerald-700 text-sm">{formatBRL(parsedPreview.netValue)}</span>
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      onClick={handleSaveUpload}
                      className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-500/20 cursor-pointer flex items-center justify-center gap-2"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Confirmar e Inserir no OrçaHub</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========================================================== */}
          {/* ABA 2: FORMULÁRIO MANUAL DIRETO                            */}
          {/* ========================================================== */}
          {activeTab === 'manual' && (
            <form onSubmit={handleSaveManual} className="space-y-4">
              {/* Tipo de Lançamento */}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setEntryType('DETRAF')}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-2 ${
                    entryType === 'DETRAF'
                      ? 'bg-blue-50 border-blue-500 text-blue-700'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <PhoneCall className="w-4 h-4" />
                  <span>DETRAF (Interconexão)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setEntryType('BOLETO_OPEX')}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-2 ${
                    entryType === 'BOLETO_OPEX'
                      ? 'bg-blue-50 border-blue-500 text-blue-700'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Receipt className="w-4 h-4" />
                  <span>Boleto / NF (OPEX Geral)</span>
                </button>
              </div>

              {/* Campos para DETRAF */}
              {entryType === 'DETRAF' ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Operadora Parceira
                      </label>
                      <select
                        value={carrierId}
                        onChange={(e) => setCarrierId(e.target.value)}
                        className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {mockCarriers.map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Sentido do Tráfego
                      </label>
                      <select
                        value={direction}
                        onChange={(e) => setDirection(e.target.value as TrafficDirection)}
                        className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="INBOUND">Inbound - Terminação Ativa (A Receber)</option>
                        <option value="OUTBOUND">Outbound - Terminação em Terceiros (A Pagar)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Mês de Referência (Competência)
                      </label>
                      <input
                        type="month"
                        value={referenceMonth}
                        onChange={(e) => setReferenceMonth(e.target.value)}
                        className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Data de Vencimento
                      </label>
                      <input
                        type="date"
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                        className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Minutos Cursados
                      </label>
                      <input
                        type="number"
                        step="10000"
                        value={totalMinutes}
                        onChange={(e) => setTotalMinutes(Number(e.target.value))}
                        className="w-full text-xs font-mono font-bold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Tarifa (R$/min)
                      </label>
                      <input
                        type="number"
                        step="0.0001"
                        value={tariffRate}
                        onChange={(e) => setTariffRate(Number(e.target.value))}
                        className="w-full text-xs font-mono font-bold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Tipo de Tarifa
                      </label>
                      <select
                        value={tariffType}
                        onChange={(e) => setTariffType(e.target.value as TariffType)}
                        className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="VU-M">VU-M (Móvel SMP)</option>
                        <option value="TU-RL">TU-RL (Fixa STFC Local)</option>
                        <option value="TU-RIU">TU-RIU (Interurbana)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Nº da Fatura (Opcional)
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: DETRAF-202607-VIVO"
                        value={manualInvoiceNumber}
                        onChange={(e) => setManualInvoiceNumber(e.target.value)}
                        className="w-full text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Alíquota Tributária (%)
                      </label>
                      <input
                        type="number"
                        step="0.05"
                        value={taxPercent}
                        onChange={(e) => setTaxPercent(Number(e.target.value))}
                        className="w-full text-xs font-mono font-bold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Status do Lançamento
                      </label>
                      <select
                        value={status}
                        onChange={(e) => setStatus(e.target.value as InvoiceStatus)}
                        className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="A_VENCER">A Vencer</option>
                        <option value="EM_CONCILIACAO">Em Conciliação</option>
                        <option value="PAGO">Liquidado (Pago)</option>
                        <option value="VENCIDO">Vencido</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Observações / Justificativa (Opcional)
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Lançamento provisório de fechamento D+4..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Resumo Financeiro Automático */}
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs flex items-center justify-between">
                    <div>
                      <span className="text-slate-500 block">Bruto: {formatBRL(calculatedGross)}</span>
                      <span className="text-slate-400 block text-[10px]">PIS/COFINS ({taxPercent}%): - {formatBRL(calculatedTax)}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Valor Líquido</span>
                      <span className="text-base font-black text-emerald-600 font-mono">
                        {formatBRL(calculatedNet)}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                /* Formulário para Boleto / NF OPEX */
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Fornecedor / Concessionária
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: Enel / TowerCo / Licenças"
                        value={opexSupplier}
                        onChange={(e) => setOpexSupplier(e.target.value)}
                        className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Valor do Boleto (R$)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="0,00"
                        value={opexValue}
                        onChange={(e) => setOpexValue(Number(e.target.value))}
                        className="w-full text-xs font-mono font-bold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Competência
                      </label>
                      <input
                        type="month"
                        value={referenceMonth}
                        onChange={(e) => setReferenceMonth(e.target.value)}
                        className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Vencimento
                      </label>
                      <input
                        type="date"
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                        className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Linha Digitável / Código de Barras (Opcional)
                    </label>
                    <input
                      type="text"
                      placeholder="00000.00000 00000.000000 00000.000000 0 0000000000"
                      value={opexBarcode}
                      onChange={(e) => setOpexBarcode(e.target.value)}
                      className="w-full text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              )}

              {/* Botão de Envio */}
              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-500/20 cursor-pointer flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Salvar Lançamento no Sistema</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
