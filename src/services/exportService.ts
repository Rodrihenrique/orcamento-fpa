import * as XLSX from 'xlsx';
import type { OpexItem, CostCenter, Account } from '../types/budget';
import type { DetrafInvoice, NettingSettlement } from '../types/detraf';
import { MONTHS_SHORT } from '../data/mockData';

/**
 * Exporta a Grade de OPEX consolidada para formato Excel (.xlsx)
 */
export const exportOpexToExcel = (
  opexItems: OpexItem[],
  costCenters: CostCenter[],
  accounts: Account[],
  fileName: string = 'OrcaHub_Grade_OPEX_2026.xlsx'
) => {
  // Cabeçalho e linhas
  const rows: any[] = [];

  // Título e Metadados
  rows.push(['ORÇAHUB FP&A - GRADE DE DESPESAS OPERACIONAIS (OPEX) 2026']);
  rows.push(['Data de Emissão:', new Date().toLocaleString('pt-BR')]);
  rows.push([]);

  // Cabeçalho das colunas
  const header = [
    'Cód. CC',
    'Centro de Custo',
    'Cód. Conta',
    'Conta Contábil',
    'Descrição da Despesa / Fornecedor',
    'Fórmula / Memória de Cálculo',
    ...MONTHS_SHORT,
    'Total Anual (R$)'
  ];
  rows.push(header);

  // Linhas de dados
  let grandTotal = 0;
  const monthlySums = new Array(12).fill(0);

  opexItems.forEach((item) => {
    const cc = costCenters.find((c) => c.id === item.costCenterId);
    const acc = accounts.find((a) => a.code === item.accountCode);
    const lineTotal = item.monthlyBudget.reduce((a, b) => a + b, 0);
    grandTotal += lineTotal;

    item.monthlyBudget.forEach((val, idx) => {
      monthlySums[idx] += val || 0;
    });

    rows.push([
      cc?.code || '',
      cc?.name || 'Geral',
      item.accountCode,
      acc?.name || 'Operacional',
      item.description,
      item.memory?.formula || item.memory?.justification || '-',
      ...item.monthlyBudget.map((v) => Number(v) || 0),
      lineTotal
    ]);
  });

  // Linha de Total Consolidado
  rows.push([]);
  rows.push([
    'TOTAL',
    'CONSOLIDADO',
    '-',
    '-',
    `${opexItems.length} despesas ativas`,
    'Soma das competências',
    ...monthlySums,
    grandTotal
  ]);

  // Criação da planilha
  const worksheet = XLSX.utils.aoa_to_sheet(rows);

  // Ajuste de largura das colunas
  worksheet['!cols'] = [
    { wch: 12 }, // Cód CC
    { wch: 28 }, // Nome CC
    { wch: 14 }, // Cód Conta
    { wch: 30 }, // Nome Conta
    { wch: 42 }, // Descrição
    { wch: 45 }, // Fórmula
    ...MONTHS_SHORT.map(() => ({ wch: 14 })), // Jan-Dez
    { wch: 18 } // Total Anual
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Grade de OPEX');

  // Disparo do download
  XLSX.writeFile(workbook, fileName);
};

/**
 * Exporta o extrato de DETRAF e a Matriz de Netting para Excel (.xlsx) com múltiplas abas
 */
export const exportDetrafToExcel = (
  invoices: DetrafInvoice[],
  nettingSummaries: NettingSettlement[],
  fileName: string = 'OrcaHub_DETRAF_Interconexao_2026.xlsx'
) => {
  const workbook = XLSX.utils.book_new();

  // === ABA 1: FATURAS DETRAF (INBOUND & OUTBOUND) ===
  const invRows: any[] = [];
  invRows.push(['ORÇAHUB TELECOM - EXTRATO DE FATURAS DETRAF (INTERCONEXÃO)']);
  invRows.push(['Gerado em:', new Date().toLocaleString('pt-BR')]);
  invRows.push([]);

  invRows.push([
    'Nº Fatura',
    'Operadora',
    'Sentido do Tráfego',
    'Competência',
    'Data Emissão',
    'Vencimento',
    'Minutos Cursados',
    'Tarifa (R$/min)',
    'Tipo de Tarifa',
    'Valor Bruto (R$)',
    'Impostos (PIS/COFINS)',
    'Valor Líquido (R$)',
    'Status',
    'Valor Contestado (R$)',
    'Status Contestação',
    'Observações'
  ]);

  invoices.forEach((inv) => {
    invRows.push([
      inv.invoiceNumber,
      inv.carrierName,
      inv.direction === 'INBOUND' ? 'Inbound (A Receber)' : 'Outbound (A Pagar)',
      inv.referenceMonth,
      inv.issueDate,
      inv.dueDate,
      inv.totalMinutes,
      inv.tariffRate,
      inv.tariffType,
      inv.grossValue,
      inv.taxValue,
      inv.netValue,
      inv.status,
      inv.disputedAmount || 0,
      inv.disputeStatus,
      inv.disputeNotes || '-'
    ]);
  });

  const wsInvoices = XLSX.utils.aoa_to_sheet(invRows);
  wsInvoices['!cols'] = [
    { wch: 28 }, { wch: 22 }, { wch: 22 }, { wch: 14 },
    { wch: 14 }, { wch: 14 }, { wch: 18 }, { wch: 15 },
    { wch: 14 }, { wch: 16 }, { wch: 16 }, { wch: 16 },
    { wch: 16 }, { wch: 18 }, { wch: 18 }, { wch: 30 }
  ];
  XLSX.utils.book_append_sheet(workbook, wsInvoices, 'Faturas DETRAF');

  // === ABA 2: MATRIZ DE NETTING (COMPENSAÇÃO BILATERAL) ===
  const netRows: any[] = [];
  netRows.push(['ORÇAHUB TELECOM - MATRIZ DE NETTING & COMPENSAÇÃO BILATERAL']);
  netRows.push(['Competência de Análise: 2026-07 | Regra de Liquidação D+4']);
  netRows.push([]);

  netRows.push([
    'Operadora Parceira',
    'Total a Receber (Inbound R$)',
    'Total a Pagar (Outbound R$)',
    'Saldo Líquido Netting (R$)',
    'Posição da Brisanet',
    'Status de Liquidação'
  ]);

  (nettingSummaries || []).forEach((net: any) => {
    const inVal = Number(net.receivableNet ?? net.inboundAmount ?? 0);
    const outVal = Number(net.payableNet ?? net.outboundAmount ?? 0);
    const balance = Number(net.netBalance ?? net.netAmount ?? (inVal - outVal));
    const pos = balance >= 0 ? 'CREDORA (A Receber)' : 'DEVEDORA (A Pagar)';
    const st = net.settlementType || net.status || (balance >= 0 ? 'SUPERAVIT' : 'DEFICIT');

    netRows.push([
      net.carrierName || 'Operadora',
      inVal,
      outVal,
      balance,
      pos,
      st
    ]);
  });

  const wsNetting = XLSX.utils.aoa_to_sheet(netRows);
  wsNetting['!cols'] = [
    { wch: 25 }, { wch: 26 }, { wch: 26 }, { wch: 24 }, { wch: 24 }, { wch: 20 }
  ];
  XLSX.utils.book_append_sheet(workbook, wsNetting, 'Matriz de Netting');

  // Download do arquivo
  XLSX.writeFile(workbook, fileName);
};
