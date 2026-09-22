export type ScenarioId = 'BUDGET_ORIGINAL' | 'FORECAST_6_6' | 'CENARIO_OTIMISTA' | 'CENARIO_ESTRESSADO';

export interface ScenarioDefinition {
  id: ScenarioId;
  name: string;
  badge: string;
  badgeColor: string;
  description: string;
  assumptions: {
    usdRate: number;
    ipcaRate: number;
    igpmRate: number;
    energyAdjustmentRate: number;
    trafficGrowthRate: number;
  };
  opexMultiplier: number;
  detrafRevenueMultiplier: number;
  detrafCostMultiplier: number;
}
