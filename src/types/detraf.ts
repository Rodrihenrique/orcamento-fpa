export type TrafficDirection = 'INBOUND' | 'OUTBOUND';
export type ServiceType = 'SMP' | 'STFC' | 'AMBOS';
export type TariffType = 'VU-M' | 'TU-RL' | 'TU-RIU';
export type InvoiceStatus = 'EMITIDO' | 'EM_CONCILIACAO' | 'A_VENCER' | 'PAGO' | 'VENCIDO' | 'CONTESTADO';
export type AgingBucket = 'A_VENCER' | 'ATE_30_DIAS' | 'DE_31_A_60_DIAS' | 'DE_61_A_90_DIAS' | 'ACIMA_90_DIAS';
export type DisputeStatus = 'SEM_DISPUTA' | 'EM_ANALISE' | 'ACEITA_GLOSA' | 'REJEITADA' | 'ARBITRAGEM_ANATEL';
export type DisputeReason = 
  | 'DIVERGENCIA_CDRS' 
  | 'CHAMADA_NAO_COMPLETADA' 
  | 'TARIFA_INCORRETA' 
  | 'TRAFEGO_ARTIFICIAL_FRAUDE' 
  | 'ERRO_DE_CADENCIA_30_6'
  | 'OUTRO';

export interface Carrier {
  id: string;
  name: string;
  corporateName: string;
  cnpj: string;
  eotCode: string; // Código de Prestadora Anatel (EOT / CSP)
  serviceType: ServiceType;
  color: string;
}

export interface DetrafInvoice {
  id: string;
  invoiceNumber: string; // Ex: DETRAF-2026-06-CLARO-IN
  carrierId: string;
  carrierName: string;
  direction: TrafficDirection; // INBOUND = A Receber (terminação na nossa rede) | OUTBOUND = A Pagar (terminação em terceiros)
  referenceMonth: string; // Ex: '2026-06'
  issueDate: string; // Data de envio (até 5º dia útil)
  dueDate: string; // Data de vencimento (dia 10 a 15)
  paymentDate?: string;
  
  // Tráfego e Bilhetagem
  totalMinutes: number;
  completedCalls: number;
  cadence: '30s/6s';
  tariffType: TariffType;
  tariffRate: number; // R$ por minuto (VU-M ou TU-RL)
  
  // Valores Financeiros
  grossValue: number;
  taxRate: number; // Alíquota de impostos (PIS/COFINS ~9.25%)
  taxValue: number;
  netValue: number;
  
  // Status de Cobrança e Aging
  status: InvoiceStatus;
  agingBucket: AgingBucket;
  daysOverdue: number; // 0 se não vencido, >0 se atrasado
  
  // Gestão de Glosas / Contestações
  disputedAmount: number;
  disputeStatus: DisputeStatus;
  disputeReason?: DisputeReason;
  disputeNotes?: string;
}

export interface NettingSettlement {
  carrierId: string;
  carrierName: string;
  period: string; // Ex: 'Junho/2026'
  receivableGross: number; // O que temos a receber (Inbound)
  receivableNet: number;
  payableGross: number; // O que temos a pagar (Outbound)
  payableNet: number;
  netBalance: number; // receivableNet - payableNet
  settlementType: 'SUPERAVIT' | 'DEFICIT' | 'EQUILIBRADO'; // Superavit = Recebemos líquido; Deficit = Pagamos líquido
  openReceivable: number;
  openPayable: number;
  totalGlosas: number;
}

export interface ContestationRecord {
  id: string;
  invoiceId: string;
  invoiceNumber: string;
  carrierId: string;
  carrierName: string;
  direction: TrafficDirection;
  referenceMonth: string;
  disputedMinutes: number;
  disputedValue: number;
  reason: DisputeReason;
  reasonDescription: string;
  openDate: string;
  deadline90Days: string; // Limite regulatório Anatel (90 dias)
  daysRemaining: number;
  status: DisputeStatus;
  technicalAnalysis: string;
  resolutionDate?: string;
  agreedAdjustment?: number; // Valor acatado em nota de crédito
}

export interface DetrafSimulationParams {
  carrierId: string;
  serviceType: 'SMP' | 'STFC';
  direction: TrafficDirection;
  estimatedMinutes: number;
  customTariff?: number;
  taxPercent: number;
}
