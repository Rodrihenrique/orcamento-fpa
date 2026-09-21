export type Periodicity = 'MENSAL' | 'TRIMESTRAL' | 'SEMESTRAL' | 'ANUAL' | 'PONTUAL';
export type Currency = 'BRL' | 'USD' | 'EUR';
export type RiskLevel = 'BAIXA' | 'MEDIA' | 'ALTA' | 'BAIXO' | 'MEDIO' | 'ALTO';
export type TapStatus = 'PENDENTE' | 'EM_ELABORACAO' | 'HOMOLOGADO';
export type VarianceClassification = 'FAVORAVEL' | 'DESFAVORAVEL';
export type VarianceNature = 
  | 'ECONOMIA_REAL' 
  | 'POSTERGACAO' 
  | 'SEM_PROVISAO' 
  | 'VARIACAO_PRECO' 
  | 'VARIACAO_VOLUME';

export interface CostCenter {
  id: string;
  code: string;
  name: string;
  directorate: string;
  manager: string;
  coordinator: string;
}

export interface Account {
  code: string;
  name: string;
  category: 'OPEX' | 'CAPEX';
  type: 'CUSTO' | 'DESPESA' | 'INVESTIMENTO';
}

export interface RiskItem {
  id: string;
  description: string;
  probability: RiskLevel;
  impact: RiskLevel;
  mitigation: string;
}

export interface CalculationMemory {
  driverName?: string;
  quantity?: number;
  unitPrice?: number;
  periodicity: Periodicity;
  monthsCount?: number;
  adjustmentRate?: number; // %
  adjustmentMonth?: number; // 1-12
  currency: Currency;
  exchangeRate?: number;
  taxesRate?: number; // %
  formula: string;
  justification: string;
  contractRef?: string;
  supplier?: string;
  risks?: RiskItem[];
}

export interface OpexItem {
  id: string;
  costCenterId: string;
  accountCode: string;
  description: string;
  memory: CalculationMemory;
  monthlyBudget: number[]; // 12 months (Jan-Dec)
  monthlyActual: number[]; // 12 months (Jan-Dec)
  monthlyProvision: number[]; // 12 months
}

export interface CapexProject {
  id: string;
  code: string; // WBS
  name: string;
  costCenterId: string;
  accountCode: string;
  objective: string;
  totalInvestment: number;
  monthlyFiscalLaunch: number[]; // 12 months fiscal launch
  monthlyActual: number[]; // 12 months actual
  activationMonth: number; // Month when asset is activated / immobilized (1-12)
  tapStatus: TapStatus;
  tapObservations?: string;
  memory: CalculationMemory;
}

export interface ActionPlan {
  what: string;
  who: string;
  when: string;
  impactAnnual: number;
}

export interface VarianceItem {
  id: string;
  itemId: string;
  itemType: 'OPEX' | 'CAPEX';
  description: string;
  costCenterName: string;
  accountName: string;
  month: number;
  budgeted: number;
  actual: number;
  variance: number; // actual - budgeted
  variancePercent: number;
  classification: VarianceClassification;
  nature?: VarianceNature;
  justification?: string;
  actionPlan?: ActionPlan;
  status: 'PENDENTE' | 'JUSTIFICADO' | 'APROVADO';
}

export interface CorporatePremises {
  usdRate: number;
  eurRate: number;
  ipcaRate: number;
  igpmRate: number;
  closingDeadline: string;
  onboardingPack: {
    notebookPhone: number;
    epiUniform: number;
    training: number;
    systemLicensesMonthly: number;
    fleetMonthly: number;
  };
}
