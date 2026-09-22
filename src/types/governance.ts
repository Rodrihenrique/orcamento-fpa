export type AuditAction = 
  | 'CRIACAO' 
  | 'EXCLUSAO' 
  | 'EDICAO' 
  | 'REMANEJAMENTO' 
  | 'CONTESTACAO_ANATEL'
  | 'IMPORTACAO_ARQUIVO';

export type AuditEntity = 'OPEX' | 'DETRAF' | 'CAPEX' | 'CONTRATO' | 'FLUXO_CAIXA';

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  user: string;
  action: AuditAction;
  entity: AuditEntity;
  entityId: string;
  description: string;
  previousValue?: string | number;
  newValue?: string | number;
  justification?: string;
  ipAddress?: string;
}

export type TransferStatus = 'PENDENTE' | 'APROVADO' | 'REJEITADO';

export interface BudgetTransferRequest {
  id: string;
  protocol: string;
  createdAt: string;
  requester: string;
  approver?: string;
  sourceCostCenter: string;
  targetCostCenter: string;
  amount: number;
  category: string;
  status: TransferStatus;
  justification: string;
  effectiveMonth: string;
  approvalDate?: string;
}
