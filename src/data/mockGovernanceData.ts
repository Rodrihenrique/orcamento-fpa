import type { AuditLogEntry, BudgetTransferRequest } from '../types/governance';

export const mockAuditLogs: AuditLogEntry[] = [
  {
    id: 'AUD-2026-001',
    timestamp: '2026-03-22 09:14:22',
    user: 'rodrigo.henrique@grupobrisanet.com.br',
    action: 'CONTESTACAO_ANATEL',
    entity: 'DETRAF',
    entityId: 'CONT-2026-001',
    description: 'Abertura de dossiê de glosa formal contra TIM Brasil S.A. (Resolução 693/2017)',
    newValue: 'R$ 48.910,00',
    justification: 'Divergência de tarifação SMP vs LD e tráfego fantasma na rota Nordeste 3G.',
    ipAddress: '187.19.142.50'
  },
  {
    id: 'AUD-2026-002',
    timestamp: '2026-03-21 16:45:10',
    user: 'carlos.telefonia@grupobrisanet.com.br',
    action: 'REMANEJAMENTO',
    entity: 'OPEX',
    entityId: 'TRF-2026-088',
    description: 'Aprovação de suplementação de verba do CC 1020 para CC 1010',
    previousValue: 'R$ 0,00',
    newValue: 'R$ 150.000,00',
    justification: 'Aceleração do swap de baterias de lítio nos sites estratégicos de Juazeiro do Norte.',
    ipAddress: '187.19.142.12'
  },
  {
    id: 'AUD-2026-003',
    timestamp: '2026-03-20 11:30:05',
    user: 'telefonia.administrativo@grupobrisanet.com.br',
    action: 'IMPORTACAO_ARQUIVO',
    entity: 'DETRAF',
    entityId: 'IMP-FILE-889',
    description: 'Importação e parsing de CDRs bilaterais da Claro Telecom (Fevereiro/2026)',
    newValue: '1.420.500 minutos',
    justification: 'Fechamento de interconexão periódica.',
    ipAddress: '187.19.142.33'
  },
  {
    id: 'AUD-2026-004',
    timestamp: '2026-03-19 14:20:18',
    user: 'mariana.infra@grupobrisanet.com.br',
    action: 'EDICAO',
    entity: 'CONTRATO',
    entityId: 'CTR-TWR-001',
    description: 'Aplicação de reajuste anual de índice contratual (IGP-M)',
    previousValue: 'R$ 12.500,00 /mês',
    newValue: 'R$ 13.062,50 /mês (+4.5%)',
    justification: 'Aniversário contratual do contrato Torre American Tower Fortaleza.',
    ipAddress: '187.19.142.84'
  },
  {
    id: 'AUD-2026-005',
    timestamp: '2026-03-18 10:05:44',
    user: 'rodrigo.henrique@grupobrisanet.com.br',
    action: 'EXCLUSAO',
    entity: 'OPEX',
    entityId: 'OPX-DEL-042',
    description: 'Exclusão de lançamento duplicado de licença de software de bilhetagem',
    previousValue: 'R$ 22.400,00',
    justification: 'Duplicidade identificada com a nota fiscal nº 90812 já provisionada no CAPEX.',
    ipAddress: '187.19.142.50'
  }
];

export const mockBudgetTransfers: BudgetTransferRequest[] = [
  {
    id: 'TRF-001',
    protocol: 'TRF-2026-088',
    createdAt: '2026-03-21 14:10:00',
    requester: 'fernando.engenharia@grupobrisanet.com.br',
    approver: 'carlos.telefonia@grupobrisanet.com.br',
    sourceCostCenter: '1020 - Operações & NOC',
    targetCostCenter: '1010 - Engenharia de Redes & Sites',
    amount: 150000,
    category: 'Manutenção de Infraestrutura',
    status: 'APROVADO',
    justification: 'Aceleração do swap de baterias de lítio nos sites estratégicos de Juazeiro do Norte para suportar expansão 5G.',
    effectiveMonth: 'Março/2026',
    approvalDate: '2026-03-21 16:45:10'
  },
  {
    id: 'TRF-002',
    protocol: 'TRF-2026-092',
    createdAt: '2026-03-22 08:30:00',
    requester: 'mariana.ti@grupobrisanet.com.br',
    sourceCostCenter: '1040 - Administrativo & Facilities',
    targetCostCenter: '1030 - Datacenter & Cloud TI',
    amount: 65000,
    category: 'Licenciamento & Software Core',
    status: 'PENDENTE',
    justification: 'Upgrade de capacidade de nós de banco de dados para suportar volumetria de conciliação de CDRs no OrçaHub.',
    effectiveMonth: 'Abril/2026'
  },
  {
    id: 'TRF-003',
    protocol: 'TRF-2026-079',
    createdAt: '2026-03-15 11:20:00',
    requester: 'lucas.comercial@grupobrisanet.com.br',
    approver: 'carlos.telefonia@grupobrisanet.com.br',
    sourceCostCenter: '1010 - Engenharia de Redes & Sites',
    targetCostCenter: '1040 - Administrativo & Facilities',
    amount: 30000,
    category: 'Consultoria Externa',
    status: 'REJEITADO',
    justification: 'Contratação de consultoria externa de benchmarking de mercado.',
    effectiveMonth: 'Março/2026',
    approvalDate: '2026-03-16 09:15:00'
  }
];
