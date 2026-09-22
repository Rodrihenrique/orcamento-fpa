import { useState, useMemo } from 'react';
import { Navbar, type TabType } from './components/Navbar';
import { DashboardView } from './components/DashboardView';
import { OpexGrid } from './components/OpexGrid';
import { CapexProjectsView } from './components/CapexProjectsView';
import { VarianceAnalysisView } from './components/VarianceAnalysisView';
import { PremisesView } from './components/PremisesView';
import { DetrafView } from './components/DetrafView';
import { CashFlowView } from './components/CashFlowView';
import { ContractsView } from './components/ContractsView';
import { CalculationMemoryModal } from './components/CalculationMemoryModal';
import { NewEntryModal } from './components/NewEntryModal';
import { ExecutiveReportModal } from './components/ExecutiveReportModal';
import { AuditLogModal } from './components/AuditLogModal';
import { BudgetTransferModal } from './components/BudgetTransferModal';
import { 
  mockCostCenters, 
  mockAccounts, 
  mockOpexItems, 
  mockCapexProjects, 
  mockVarianceItems, 
  mockPremises 
} from './data/mockData';
import { mockDetrafInvoices } from './data/mockDetrafData';
import { mockScenarios } from './data/mockScenariosData';
import { mockSiteContracts } from './data/mockContractsData';
import { mockAuditLogs, mockBudgetTransfers } from './data/mockGovernanceData';
import type { CalculationMemory, VarianceItem, OpexItem } from './types/budget';
import type { DetrafInvoice } from './types/detraf';
import type { ScenarioId } from './types/scenarios';
import type { AuditLogEntry, BudgetTransferRequest } from './types/governance';

export function App() {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [opexItems, setOpexItems] = useState<OpexItem[]>(mockOpexItems);
  const [capexProjects] = useState(mockCapexProjects);
  const [varianceItems, setVarianceItems] = useState(mockVarianceItems);
  const [premises] = useState(mockPremises);
  const [detrafInvoices, setDetrafInvoices] = useState<DetrafInvoice[]>(mockDetrafInvoices);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(mockAuditLogs);
  const [budgetTransfers, setBudgetTransfers] = useState<BudgetTransferRequest[]>(mockBudgetTransfers);
  
  const [isNewEntryModalOpen, setIsNewEntryModalOpen] = useState<boolean>(false);
  const [isExecutiveReportOpen, setIsExecutiveReportOpen] = useState<boolean>(false);
  const [isAuditLogOpen, setIsAuditLogOpen] = useState<boolean>(false);
  const [isBudgetTransferOpen, setIsBudgetTransferOpen] = useState<boolean>(false);
  const [currentScenarioId, setCurrentScenarioId] = useState<ScenarioId>('BUDGET_ORIGINAL');

  // Cenário selecionado e ajuste de OPEX
  const currentScenario = mockScenarios.find(s => s.id === currentScenarioId) || mockScenarios[0];

  const displayedOpexItems = useMemo(() => {
    if (currentScenario.opexMultiplier === 1.0) return opexItems;
    return opexItems.map(item => ({
      ...item,
      monthlyBudget: item.monthlyBudget.map(v => Math.round(v * currentScenario.opexMultiplier))
    }));
  }, [opexItems, currentScenario]);

  // Calculation Memory Modal state
  const [memoryModalData, setMemoryModalData] = useState<{
    isOpen: boolean;
    title: string;
    costCenterName: string;
    accountName: string;
    memory: CalculationMemory | null;
    total: number;
  }>({
    isOpen: false,
    title: '',
    costCenterName: '',
    accountName: '',
    memory: null,
    total: 0
  });

  const handleOpenMemoryModal = (
    title: string,
    costCenterName: string,
    accountName: string,
    memory: CalculationMemory,
    total: number
  ) => {
    setMemoryModalData({
      isOpen: true,
      title,
      costCenterName,
      accountName,
      memory,
      total
    });
  };

  const handleCloseMemoryModal = () => {
    setMemoryModalData(prev => ({ ...prev, isOpen: false }));
  };

  const handleSaveJustification = (updatedItem: VarianceItem) => {
    setVarianceItems(prev => prev.map(item => item.id === updatedItem.id ? updatedItem : item));
  };

  const handleSaveDetrafInvoice = (newInvoice: DetrafInvoice) => {
    setDetrafInvoices(prev => [newInvoice, ...prev]);
    
    // Registrar na Trilha de Auditoria
    const newLog: AuditLogEntry = {
      id: `AUD-${Date.now()}`,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
      user: 'rodrigo.henrique@grupobrisanet.com.br',
      action: 'IMPORTACAO_ARQUIVO',
      entity: 'DETRAF',
      entityId: newInvoice.id,
      description: `Importação de fatura DETRAF: ${newInvoice.carrierName} (${newInvoice.referenceMonth})`,
      newValue: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(newInvoice.netValue),
      justification: `Arquivo importado: ${newInvoice.invoiceNumber}`,
      ipAddress: '187.19.142.50'
    };
    setAuditLogs(prev => [newLog, ...prev]);
    setActiveTab('detraf');
  };

  const handleSaveOpexItem = (newOpex: OpexItem) => {
    setOpexItems(prev => [newOpex, ...prev]);

    // Registrar na Trilha de Auditoria
    const totalVal = newOpex.monthlyBudget.reduce((a, b) => a + b, 0);
    const newLog: AuditLogEntry = {
      id: `AUD-${Date.now()}`,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
      user: 'rodrigo.henrique@grupobrisanet.com.br',
      action: 'CRIACAO',
      entity: 'OPEX',
      entityId: newOpex.id,
      description: `Lançamento de despesa operacional: ${newOpex.description}`,
      newValue: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalVal),
      justification: 'Lançamento manual / importação de comprovante.',
      ipAddress: '187.19.142.50'
    };
    setAuditLogs(prev => [newLog, ...prev]);
    setActiveTab('opex');
  };

  const handleDeleteOpexItem = (id: string) => {
    const itemToDelete = opexItems.find(item => item.id === id);
    setOpexItems(prev => prev.filter(item => item.id !== id));

    // Registrar na Trilha de Auditoria
    const totalVal = itemToDelete ? itemToDelete.monthlyBudget.reduce((a, b) => a + b, 0) : 0;
    const newLog: AuditLogEntry = {
      id: `AUD-${Date.now()}`,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
      user: 'rodrigo.henrique@grupobrisanet.com.br',
      action: 'EXCLUSAO',
      entity: 'OPEX',
      entityId: id,
      description: `Exclusão de item de despesa: ${itemToDelete?.description || id}`,
      previousValue: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalVal),
      justification: 'Exclusão manual realizada pelo usuário na Grade OPEX.',
      ipAddress: '187.19.142.50'
    };
    setAuditLogs(prev => [newLog, ...prev]);
  };

  // Remanejamento Orçamentário
  const handleCreateTransfer = (reqData: Omit<BudgetTransferRequest, 'id' | 'protocol' | 'createdAt' | 'status'>) => {
    const newTransfer: BudgetTransferRequest = {
      ...reqData,
      id: `TRF-${Date.now()}`,
      protocol: `TRF-2026-${Math.floor(100 + Math.random() * 900)}`,
      createdAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
      status: 'PENDENTE'
    };
    setBudgetTransfers(prev => [newTransfer, ...prev]);

    // Trilha de auditoria
    const newLog: AuditLogEntry = {
      id: `AUD-${Date.now()}`,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
      user: reqData.requester,
      action: 'REMANEJAMENTO',
      entity: 'OPEX',
      entityId: newTransfer.protocol,
      description: `Solicitação de remanejamento: ${reqData.sourceCostCenter} ➔ ${reqData.targetCostCenter}`,
      newValue: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(reqData.amount),
      justification: reqData.justification,
      ipAddress: '187.19.142.50'
    };
    setAuditLogs(prev => [newLog, ...prev]);
  };

  const handleApproveTransfer = (transferId: string) => {
    const transfer = budgetTransfers.find(t => t.id === transferId);
    if (!transfer) return;

    setBudgetTransfers(prev => prev.map(t => t.id === transferId ? {
      ...t,
      status: 'APROVADO',
      approver: 'carlos.controller@grupobrisanet.com.br',
      approvalDate: new Date().toISOString().replace('T', ' ').slice(0, 19)
    } : t));

    const newLog: AuditLogEntry = {
      id: `AUD-${Date.now()}`,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
      user: 'carlos.controller@grupobrisanet.com.br',
      action: 'REMANEJAMENTO',
      entity: 'OPEX',
      entityId: transfer.protocol,
      description: `Aprovação de remanejamento orçamentário: ${transfer.sourceCostCenter} ➔ ${transfer.targetCostCenter}`,
      newValue: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(transfer.amount),
      justification: `Aprovado na alçada de controladoria. ${transfer.justification}`,
      ipAddress: '187.19.142.12'
    };
    setAuditLogs(prev => [newLog, ...prev]);
  };

  const handleRejectTransfer = (transferId: string) => {
    const transfer = budgetTransfers.find(t => t.id === transferId);
    if (!transfer) return;

    setBudgetTransfers(prev => prev.map(t => t.id === transferId ? {
      ...t,
      status: 'REJEITADO',
      approver: 'carlos.controller@grupobrisanet.com.br',
      approvalDate: new Date().toISOString().replace('T', ' ').slice(0, 19)
    } : t));

    const newLog: AuditLogEntry = {
      id: `AUD-${Date.now()}`,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
      user: 'carlos.controller@grupobrisanet.com.br',
      action: 'REMANEJAMENTO',
      entity: 'OPEX',
      entityId: transfer.protocol,
      description: `Rejeição de remanejamento: ${transfer.sourceCostCenter} ➔ ${transfer.targetCostCenter}`,
      justification: 'Rejeitado por ultrapassar limite disponível do centro cedente.',
      ipAddress: '187.19.142.12'
    };
    setAuditLogs(prev => [newLog, ...prev]);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col selection:bg-blue-500 selection:text-white">
      {/* Top Navigation com Botão Global de Ação */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenNewEntryModal={() => setIsNewEntryModalOpen(true)}
        onOpenAuditLogModal={() => setIsAuditLogOpen(true)}
        onOpenBudgetTransferModal={() => setIsBudgetTransferOpen(true)}
        currentScenarioId={currentScenarioId}
        onScenarioChange={setCurrentScenarioId}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'dashboard' && (
          <DashboardView
            opexItems={displayedOpexItems}
            capexProjects={capexProjects}
            varianceItems={varianceItems}
            costCenters={mockCostCenters}
            onNavigateToVariance={() => setActiveTab('variance')}
            onNavigateToCapex={() => setActiveTab('capex')}
            onOpenExecutiveReport={() => setIsExecutiveReportOpen(true)}
          />
        )}

        {activeTab === 'opex' && (
          <OpexGrid
            opexItems={displayedOpexItems}
            costCenters={mockCostCenters}
            accounts={mockAccounts}
            onOpenMemoryModal={handleOpenMemoryModal}
            onDeleteOpexItem={handleDeleteOpexItem}
          />
        )}

        {activeTab === 'capex' && (
          <CapexProjectsView
            capexProjects={capexProjects}
            costCenters={mockCostCenters}
            onOpenMemoryModal={handleOpenMemoryModal}
          />
        )}

        {activeTab === 'variance' && (
          <VarianceAnalysisView
            varianceItems={varianceItems}
            onSaveJustification={handleSaveJustification}
          />
        )}

        {activeTab === 'premises' && (
          <PremisesView premises={premises} />
        )}

        {activeTab === 'detraf' && (
          <DetrafView invoices={detrafInvoices} />
        )}

        {activeTab === 'cashflow' && (
          <CashFlowView
            opexItems={displayedOpexItems}
            detrafInvoices={detrafInvoices}
            costCenters={mockCostCenters}
          />
        )}

        {activeTab === 'contracts' && (
          <ContractsView contracts={mockSiteContracts} />
        )}
      </main>

      {/* Calculation Memory Modal */}
      {memoryModalData.isOpen && memoryModalData.memory && (
        <CalculationMemoryModal
          isOpen={memoryModalData.isOpen}
          onClose={handleCloseMemoryModal}
          title={memoryModalData.title}
          costCenterName={memoryModalData.costCenterName}
          accountName={memoryModalData.accountName}
          memory={memoryModalData.memory}
          totalValue={memoryModalData.total}
        />
      )}

      {/* Modal Global de Novo Lançamento / Importar Arquivo */}
      <NewEntryModal
        isOpen={isNewEntryModalOpen}
        onClose={() => setIsNewEntryModalOpen(false)}
        onSaveDetrafInvoice={handleSaveDetrafInvoice}
        onSaveOpexItem={handleSaveOpexItem}
      />

      {/* Modal de Relatório Executivo One-Pager & Impressão/PDF */}
      <ExecutiveReportModal
        isOpen={isExecutiveReportOpen}
        onClose={() => setIsExecutiveReportOpen(false)}
        opexItems={displayedOpexItems}
        capexProjects={capexProjects}
        costCenters={mockCostCenters}
        detrafInvoices={detrafInvoices}
      />

      {/* Modal de Trilha de Auditoria (Audit Log) */}
      <AuditLogModal
        isOpen={isAuditLogOpen}
        onClose={() => setIsAuditLogOpen(false)}
        logs={auditLogs}
      />

      {/* Modal de Remanejamento Orçamentário */}
      <BudgetTransferModal
        isOpen={isBudgetTransferOpen}
        onClose={() => setIsBudgetTransferOpen(false)}
        transfers={budgetTransfers}
        onCreateTransfer={handleCreateTransfer}
        onApproveTransfer={handleApproveTransfer}
        onRejectTransfer={handleRejectTransfer}
      />
    </div>
  );
}

export default App;
