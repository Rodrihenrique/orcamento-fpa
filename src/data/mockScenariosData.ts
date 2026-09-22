import type { ScenarioDefinition } from '../types/scenarios';

export const mockScenarios: ScenarioDefinition[] = [
  {
    id: 'BUDGET_ORIGINAL',
    name: 'Budget Original Aprovado',
    badge: 'Baseline Oficial',
    badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
    description: 'Linha de base aprovada pelo Conselho de Administração para o exercício fiscal de 2026.',
    assumptions: {
      usdRate: 5.45,
      ipcaRate: 4.2,
      igpmRate: 4.8,
      energyAdjustmentRate: 6.5,
      trafficGrowthRate: 10.0
    },
    opexMultiplier: 1.0,
    detrafRevenueMultiplier: 1.0,
    detrafCostMultiplier: 1.0
  },
  {
    id: 'FORECAST_6_6',
    name: 'Rolling Forecast (6+6)',
    badge: 'Realizado + Projetado',
    badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    description: 'Consolidação dos meses realizados (Jan-Jun) com nova projeção calibrada para o 2º semestre.',
    assumptions: {
      usdRate: 5.58,
      ipcaRate: 4.5,
      igpmRate: 5.1,
      energyAdjustmentRate: 7.2,
      trafficGrowthRate: 12.5
    },
    opexMultiplier: 1.035,
    detrafRevenueMultiplier: 1.08,
    detrafCostMultiplier: 1.04
  },
  {
    id: 'CENARIO_OTIMISTA',
    name: 'Cenário Otimista (Expansão 5G)',
    badge: 'Upside +15%',
    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    description: 'Aceleração de ativação de usuários 5G, aumento de tráfego de interconexão e eficiência operacional de custos.',
    assumptions: {
      usdRate: 5.20,
      ipcaRate: 3.8,
      igpmRate: 3.9,
      energyAdjustmentRate: 4.5,
      trafficGrowthRate: 25.0
    },
    opexMultiplier: 0.96,
    detrafRevenueMultiplier: 1.20,
    detrafCostMultiplier: 1.05
  },
  {
    id: 'CENARIO_ESTRESSADO',
    name: 'Cenário Estressado (Choque Inflação/Dólar)',
    badge: 'Downside Stress',
    badgeColor: 'bg-rose-100 text-rose-800 border-rose-200',
    description: 'Alta cambial (USD R$ 6,20), pressão nos custos de energia (+12%) e reajuste contratual de torres via IGP-M (+8,5%).',
    assumptions: {
      usdRate: 6.20,
      ipcaRate: 6.5,
      igpmRate: 8.5,
      energyAdjustmentRate: 12.0,
      trafficGrowthRate: 2.0
    },
    opexMultiplier: 1.145,
    detrafRevenueMultiplier: 0.95,
    detrafCostMultiplier: 1.18
  }
];
