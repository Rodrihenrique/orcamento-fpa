import type { CostCenter, Account, OpexItem, CapexProject, CorporatePremises, VarianceItem } from '../types/budget';

export const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export const MONTHS_SHORT = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
];

export const mockCostCenters: CostCenter[] = [
  {
    id: 'cc-101',
    code: '101.01',
    name: 'Operações de Rede & Torres',
    directorate: 'Diretoria de Operações',
    manager: 'Carlos Mendes',
    coordinator: 'Rafael Silva'
  },
  {
    id: 'cc-102',
    code: '101.02',
    name: 'Infraestrutura de TI & Sistemas',
    directorate: 'Diretoria de Tecnologia',
    manager: 'Juliana Prado',
    coordinator: 'Marcos Rocha'
  },
  {
    id: 'cc-201',
    code: '201.01',
    name: 'Expansão Comercial & Vendas',
    directorate: 'Diretoria Comercial',
    manager: 'Camila Duarte',
    coordinator: 'Lucas Moura'
  },
  {
    id: 'cc-301',
    code: '301.01',
    name: 'Frotas & Logística de Campo',
    directorate: 'Diretoria de Operações',
    manager: 'Fernando Pires',
    coordinator: 'Rodrigo Henrique'
  },
  {
    id: 'cc-401',
    code: '401.01',
    name: 'Gente & Gestão (RH)',
    directorate: 'Diretoria Administrativa',
    manager: 'Patrícia Pessoa',
    coordinator: 'Mariana Costa'
  },
  {
    id: 'cc-501',
    code: '501.01',
    name: 'Controladoria & Finanças',
    directorate: 'Diretoria Financeira',
    manager: 'Roberto Santos',
    coordinator: 'Aline Nogueira'
  }
];

export const mockAccounts: Account[] = [
  { code: '3.1.01', name: 'Folha de Pagamento & Encargos', category: 'OPEX', type: 'CUSTO' },
  { code: '3.1.02', name: 'Benefícios & Onboarding de Pessoal', category: 'OPEX', type: 'CUSTO' },
  { code: '3.1.03', name: 'Equipamentos de Proteção (EPI) & Uniformes', category: 'OPEX', type: 'CUSTO' },
  { code: '3.2.01', name: 'Locação de Torres & Terrenos de Sites', category: 'OPEX', type: 'CUSTO' },
  { code: '3.2.02', name: 'Manutenção Preventiva & Corretiva de Rede', category: 'OPEX', type: 'CUSTO' },
  { code: '3.2.03', name: 'Combustível & Manutenção de Frotas', category: 'OPEX', type: 'CUSTO' },
  { code: '3.3.01', name: 'Licenças de Software & Cloud (Internacional)', category: 'OPEX', type: 'DESPESA' },
  { code: '3.4.01', name: 'Viagens, Diárias & Deslocamentos', category: 'OPEX', type: 'DESPESA' },
  { code: '4.1.01', name: 'CAPEX: Implantação de Novas Torres & Sites', category: 'CAPEX', type: 'INVESTIMENTO' },
  { code: '4.1.02', name: 'CAPEX: Expansão de Backhaul & Fibra Óptica', category: 'CAPEX', type: 'INVESTIMENTO' },
  { code: '4.1.03', name: 'CAPEX: Modernização de Data Center & Servidores', category: 'CAPEX', type: 'INVESTIMENTO' },
  { code: '4.1.04', name: 'CAPEX: Desenvolvimento de Plataformas & Sistemas', category: 'CAPEX', type: 'INVESTIMENTO' }
];

export const mockPremises: CorporatePremises = {
  usdRate: 5.45,
  eurRate: 6.05,
  ipcaRate: 4.2,
  igpmRate: 4.8,
  closingDeadline: '4º dia útil do mês subsequente',
  onboardingPack: {
    notebookPhone: 4800,
    epiUniform: 1200,
    training: 800,
    systemLicensesMonthly: 350,
    fleetMonthly: 1200
  }
};

export const mockOpexItems: OpexItem[] = [
  {
    id: 'opx-001',
    costCenterId: 'cc-301',
    accountCode: '3.2.03',
    description: 'Locação de Veículos para Equipes Técnicas de Campo',
    memory: {
      driverName: 'Veículos em Operação',
      quantity: 14,
      unitPrice: 2650,
      periodicity: 'MENSAL',
      monthsCount: 12,
      adjustmentRate: 4.8,
      adjustmentMonth: 9,
      currency: 'BRL',
      formula: '14 veículos × R$ 2.650/mês (+ 4,8% reajuste contratual a partir de Set)',
      justification: 'Atendimento aos chamados de campo nas regiões metropolitanas e interiores.',
      contractRef: 'CTR-2024/089-LOCAVEL',
      supplier: 'Movida Frotas S.A.',
      risks: [
        {
          id: 'r1',
          description: 'Aumento de sinistralidade ou manutenções extraordinárias',
          probability: 'MEDIA',
          impact: 'MEDIA',
          mitigation: 'Franquia com seguro total contratado e telemetria preventiva.'
        }
      ]
    },
    monthlyBudget: [37100, 37100, 37100, 37100, 37100, 37100, 37100, 37100, 38880, 38880, 38880, 38880],
    monthlyActual: [37100, 37100, 36500, 37100, 37800, 42100, 0, 0, 0, 0, 0, 0],
    monthlyProvision: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
  },
  {
    id: 'opx-002',
    costCenterId: 'cc-101',
    accountCode: '3.2.02',
    description: 'Manutenção Preventiva de Torres e Sistemas Irradiantes',
    memory: {
      driverName: 'Torres Ativas',
      quantity: 120,
      unitPrice: 420,
      periodicity: 'MENSAL',
      monthsCount: 12,
      currency: 'BRL',
      formula: '120 torres ativas × R$ 420/visita preventiva mensal',
      justification: 'Garantir disponibilidade SLA 99.8% e conformidade com normas regulatórias.',
      contractRef: 'CTR-TORRES-2023/11',
      supplier: 'TorreTech Engenharia',
      risks: [
        {
          id: 'r2',
          description: 'Atraso na liberação de acessos em condomínios rurais',
          probability: 'ALTA',
          impact: 'MEDIA',
          mitigation: 'Agendamento prévio de 15 dias via equipe de Relações Institucionais.'
        }
      ]
    },
    monthlyBudget: [50400, 50400, 50400, 50400, 50400, 50400, 50400, 50400, 50400, 50400, 50400, 50400],
    monthlyActual: [50400, 48200, 50400, 50400, 51000, 63800, 0, 0, 0, 0, 0, 0],
    monthlyProvision: [0, 0, 0, 0, 0, 4500, 0, 0, 0, 0, 0, 0]
  },
  {
    id: 'opx-003',
    costCenterId: 'cc-102',
    accountCode: '3.3.01',
    description: 'Licenças de Cloud e Segurança (AWS + Microsoft 365 Enterprise)',
    memory: {
      driverName: 'Usuários & Servidores Cloud',
      quantity: 95,
      unitPrice: 38,
      currency: 'USD',
      exchangeRate: 5.45,
      taxesRate: 15.5,
      periodicity: 'MENSAL',
      monthsCount: 12,
      formula: '95 users × US$ 38 × R$ 5,45 (Câmbio Oficial) × 1,155 (Tributos Internacionais)',
      justification: 'Infraestrutura corporativa de nuvem e segurança de dados.',
      contractRef: 'MS-CORP-INT-2025',
      supplier: 'Microsoft Ireland Operations',
      risks: [
        {
          id: 'r3',
          description: 'Flutuação cambial do Dólar acima de R$ 5,80',
          probability: 'MEDIA',
          impact: 'ALTA',
          mitigation: 'Premissa oficial fixada em R$ 5,45 com revisão semestral no Forecast.'
        }
      ]
    },
    monthlyBudget: [22730, 22730, 22730, 22730, 22730, 22730, 22730, 22730, 22730, 22730, 22730, 22730],
    monthlyActual: [22400, 22500, 22700, 22650, 22800, 22750, 0, 0, 0, 0, 0, 0],
    monthlyProvision: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
  },
  {
    id: 'opx-004',
    costCenterId: 'cc-401',
    accountCode: '3.1.02',
    description: 'Pacote de Onboarding para Novos Colaboradores Técnicos de Campo',
    memory: {
      driverName: 'Novas Admissões',
      quantity: 6,
      unitPrice: 6800,
      currency: 'BRL',
      periodicity: 'TRIMESTRAL',
      formula: '6 contratações no ano × R$ 6.800 (Notebook, Celular, EPI, Uniforme e Treinamento Integrado)',
      justification: 'Custo completo de contratação obrigatório conforme Guia Orçamentário.',
      supplier: 'Diversos Fornecedores Homologados',
      risks: [
        {
          id: 'r4',
          description: 'Atraso na entrega de EPIs ou notebooks de fornecedores',
          probability: 'MEDIA',
          impact: 'BAIXA',
          mitigation: 'Estoque pulmão de 2 kits mantido pelo Administrativo.'
        }
      ]
    },
    monthlyBudget: [0, 13600, 0, 0, 13600, 0, 0, 13600, 0, 0, 0, 0],
    monthlyActual: [0, 13600, 0, 0, 13200, 0, 0, 0, 0, 0, 0, 0],
    monthlyProvision: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
  },
  {
    id: 'opx-005',
    costCenterId: 'cc-101',
    accountCode: '3.2.01',
    description: 'Locação de Terrenos para Sites e Torres de Transmissão',
    memory: {
      driverName: 'Contratos de Locação Ativos',
      quantity: 45,
      unitPrice: 3200,
      currency: 'BRL',
      periodicity: 'MENSAL',
      monthsCount: 12,
      adjustmentRate: 4.2,
      adjustmentMonth: 7,
      formula: '45 contratos de locação × R$ 3.200/mês (+ 4,2% IPCA a partir de Jul)',
      justification: 'Imóveis e terrenos onde estão instaladas as torres principais de repetição.',
      contractRef: 'DIVERSOS-LOC-TERRENOS',
      supplier: 'Proprietários Rurais e Urbanos Diversos',
      risks: []
    },
    monthlyBudget: [144000, 144000, 144000, 144000, 144000, 144000, 150048, 150048, 150048, 150048, 150048, 150048],
    monthlyActual: [144000, 144000, 144000, 144000, 144000, 144000, 0, 0, 0, 0, 0, 0],
    monthlyProvision: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
  },
  {
    id: 'opx-006',
    costCenterId: 'cc-301',
    accountCode: '3.2.03',
    description: 'Abastecimento de Combustível da Frota Operacional',
    memory: {
      driverName: 'Litros Consumidos',
      quantity: 7500,
      unitPrice: 5.80,
      currency: 'BRL',
      periodicity: 'MENSAL',
      monthsCount: 12,
      formula: '7.500 litros/mês × R$ 5,80/litro médio (Cartão Ticket Log)',
      justification: 'Deslocamento das equipes de manutenção e implantação.',
      contractRef: 'CTR-TICKETLOG-2023',
      supplier: 'Ticket Log / Edenred',
      risks: [
        {
          id: 'r5',
          description: 'Aumento nos preços dos combustíveis pela Petrobras',
          probability: 'ALTA',
          impact: 'MEDIA',
          mitigation: 'Otimização de rotas com sistema de rastreamento e telemetria.'
        }
      ]
    },
    monthlyBudget: [43500, 43500, 43500, 43500, 43500, 43500, 43500, 43500, 43500, 43500, 43500, 43500],
    monthlyActual: [42100, 41800, 44200, 43000, 41200, 39500, 0, 0, 0, 0, 0, 0],
    monthlyProvision: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
  }
];

export const mockCapexProjects: CapexProject[] = [
  {
    id: 'cpx-001',
    code: 'WBS-4.1.01.001',
    name: 'Expansão Cluster Nordeste - 12 Novas Torres de Transmissão',
    costCenterId: 'cc-101',
    accountCode: '4.1.01',
    objective: 'Ampliar cobertura móvel 5G e banda larga para 8 municípios prioritários.',
    totalInvestment: 1850000,
    monthlyFiscalLaunch: [
      0, 250000, 350000, 450000, 400000, 400000, 0, 0, 0, 0, 0, 0
    ],
    monthlyActual: [
      0, 250000, 350000, 450000, 380000, 440000, 0, 0, 0, 0, 0, 0
    ],
    activationMonth: 7,
    tapStatus: 'EM_ELABORACAO',
    tapObservations: 'Área de Patrimônio coletando laudos estruturais e ARTs dos engenheiros.',
    memory: {
      driverName: 'Torres Implantadas',
      quantity: 12,
      unitPrice: 154166.67,
      currency: 'BRL',
      periodicity: 'PONTUAL',
      formula: '12 sites completos × R$ 154.166,67 médio (Obras Civis + Torres + Energia)',
      justification: 'Meta estratégica de expansão de cobertura comercial aprovada pela Diretoria.',
      contractRef: 'CTR-OBRAS-NE-001',
      supplier: 'Construtora Telco Brasil Ltda.',
      risks: [
        {
          id: 'r6',
          description: 'Atraso em licenças ambientais municipais',
          probability: 'ALTA',
          impact: 'ALTA',
          mitigation: 'Equipe jurídica dedicada em campo para acompanhamento com prefeituras.'
        }
      ]
    }
  },
  {
    id: 'cpx-002',
    code: 'WBS-4.1.02.004',
    name: 'Upgrade de Roteadores Core 100G e Swapping de Fibra',
    costCenterId: 'cc-102',
    accountCode: '4.1.02',
    objective: 'Eliminar gargalos de tráfego entre data centers e anel metropolitano.',
    totalInvestment: 680000,
    monthlyFiscalLaunch: [
      0, 0, 320000, 360000, 0, 0, 0, 0, 0, 0, 0, 0
    ],
    monthlyActual: [
      0, 0, 320000, 360000, 0, 0, 0, 0, 0, 0, 0, 0
    ],
    activationMonth: 5,
    tapStatus: 'HOMOLOGADO',
    tapObservations: 'TAP nº 2026/044 homologado por Patrimônio com vida útil de 5 anos.',
    memory: {
      currency: 'USD',
      exchangeRate: 5.45,
      taxesRate: 18.0,
      periodicity: 'PONTUAL',
      formula: 'US$ 52.000 × R$ 5,45 × 1,18 (Tributos) + R$ 345.500 (Serviços e Cabos)',
      justification: 'Aumento de 300% na capacidade de transmissão do anel central.',
      contractRef: 'CISCO-CORE-2026',
      supplier: 'Cisco Systems / Distribuidor Ingram',
      risks: []
    }
  },
  {
    id: 'cpx-003',
    code: 'WBS-4.1.04.002',
    name: 'Desenvolvimento do Novo Portal do Cliente & App Mobile',
    costCenterId: 'cc-201',
    accountCode: '4.1.04',
    objective: 'Autoatendimento, emissão de faturas e abertura de chamados técnicos.',
    totalInvestment: 360000,
    monthlyFiscalLaunch: [
      60000, 60000, 60000, 60000, 60000, 60000, 0, 0, 0, 0, 0, 0
    ],
    monthlyActual: [
      60000, 60000, 60000, 60000, 60000, 60000, 0, 0, 0, 0, 0, 0
    ],
    activationMonth: 7,
    tapStatus: 'PENDENTE',
    tapObservations: 'Aguardando publicação nas lojas de aplicativos para abertura do TAP.',
    memory: {
      currency: 'BRL',
      periodicity: 'PONTUAL',
      formula: '6 sprints mensais × R$ 60.000/sprint (Squad ágil externa)',
      justification: 'Redução esperada de 35% no volume de ligações para a central de atendimento.',
      contractRef: 'CTR-DEV-APPS-2026',
      supplier: 'Inovare Softwares Ltda.',
      risks: []
    }
  }
];

export const mockVarianceItems: VarianceItem[] = [
  {
    id: 'var-001',
    itemId: 'opx-002',
    itemType: 'OPEX',
    description: 'Manutenção Preventiva de Torres e Sistemas Irradiantes',
    costCenterName: 'Operações de Rede & Torres',
    accountName: '3.2.02 - Manutenção Preventiva & Corretiva',
    month: 5,
    budgeted: 50400,
    actual: 63800,
    variance: 13400,
    variancePercent: 26.59,
    classification: 'DESFAVORAVEL',
    nature: 'VARIACAO_VOLUME',
    justification: 'Desvio desfavorável ocasionado por fortes chuvas no interior, demandando reparos emergenciais em 18 torres afetadas por descargas atmosféricas. Custo não previsto na rotina preventiva.',
    actionPlan: {
      what: 'Instalação de para-raios reforçados e revisão dos contratos de seguro patrimonial para acionamento de franquia.',
      who: 'Rafael Silva (Coordenador de Operações)',
      when: '15/08/2026',
      impactAnnual: 13400
    },
    status: 'JUSTIFICADO'
  },
  {
    id: 'var-002',
    itemId: 'opx-001',
    itemType: 'OPEX',
    description: 'Locação de Veículos para Equipes Técnicas de Campo',
    costCenterName: 'Frotas & Logística de Campo',
    accountName: '3.2.03 - Combustível & Frotas',
    month: 5,
    budgeted: 37100,
    actual: 42100,
    variance: 5000,
    variancePercent: 13.48,
    classification: 'DESFAVORAVEL',
    nature: 'POSTERGACAO',
    justification: 'A fatura do fornecedor referente ao mês de Maio atrasou no processamento fiscal e foi lançada cumulativamente em Junho, gerando duplicidade aparente na competência.',
    actionPlan: {
      what: 'Alinhamento com o Contas a Pagar para garantir o provisionamento tempestivo (D+4) quando houver atraso no faturamento.',
      who: 'Rodrigo Henrique (Coordenador de Frotas)',
      when: '30/07/2026',
      impactAnnual: 0
    },
    status: 'JUSTIFICADO'
  },
  {
    id: 'var-003',
    itemId: 'opx-006',
    itemType: 'OPEX',
    description: 'Abastecimento de Combustível da Frota Operacional',
    costCenterName: 'Frotas & Logística de Campo',
    accountName: '3.2.03 - Combustível & Frotas',
    month: 5,
    budgeted: 43500,
    actual: 39500,
    variance: -4000,
    variancePercent: -9.20,
    classification: 'FAVORAVEL',
    nature: 'ECONOMIA_REAL',
    justification: 'Variação favorável decorrente da otimização de rotas pelo novo sistema de telemetria veicular e negociação de desconto corporativo no cartão de abastecimento.',
    status: 'APROVADO'
  },
  {
    id: 'var-004',
    itemId: 'cpx-001',
    itemType: 'CAPEX',
    description: 'Expansão Cluster Nordeste - 12 Novas Torres',
    costCenterName: 'Operações de Rede & Torres',
    accountName: '4.1.01 - CAPEX: Novas Torres',
    month: 5,
    budgeted: 400000,
    actual: 440000,
    variance: 40000,
    variancePercent: 10.0,
    classification: 'DESFAVORAVEL',
    nature: 'POSTERGACAO',
    justification: 'Antecipação de medição de obras civis da empreiteira para garantir a data de ativação no mês de Julho. O valor total do projeto permanece dentro do teto de R$ 1.850.000.',
    actionPlan: {
      what: 'Acompanhar a conclusão física das últimas 2 torres para abertura imediata do TAP no início de Julho.',
      who: 'Carlos Mendes (Gerente de Operações)',
      when: '10/07/2026',
      impactAnnual: 0
    },
    status: 'JUSTIFICADO'
  }
];
