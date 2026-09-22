export type ContractIndex = 'IGP-M' | 'IPCA';

export type ContractStatus = 'ATIVO' | 'EM_RENOVACAO' | 'REAJUSTADO' | 'ENCERRADO';

export interface SiteContract {
  id: string;
  siteCode: string; // Ex: CE-FOR-0012
  siteName: string;
  city: string;
  state: string;
  landlord: string; // Ex: American Tower, SBA Torres, Proprietário
  landlordType: 'TOWERCO' | 'TERRENO_PROPRIETARIO' | 'ROOFTOP_PREDIO';
  monthlyRent: number;
  index: ContractIndex;
  anniversaryMonth: number; // 1-12
  startDate: string;
  expirationDate: string;
  status: ContractStatus;
  lastAdjustmentDate?: string;
  lastAdjustmentRate?: number;
}
