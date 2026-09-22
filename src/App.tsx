import { useState } from 'react';
import { Navbar, type TabType } from './components/Navbar';
import { DashboardView } from './components/DashboardView';
import { OpexGrid } from './components/OpexGrid';
import { CapexProjectsView } from './components/CapexProjectsView';
import { VarianceAnalysisView } from './components/VarianceAnalysisView';
import { PremisesView } from './components/PremisesView';
import { DetrafView } from './components/DetrafView';
import { CalculationMemoryModal } from './components/CalculationMemoryModal';
import { NewEntryModal } from './components/NewEntryModal';
import { 
  mockCostCenters, 
  mockAccounts, 
  mockOpexItems, 
  mockCapexProjects, 
  mockVarianceItems, 
  mockPremises 
} from './data/mockData';
import { mockDetrafInvoices } from './data/mockDetrafData';
import type { CalculationMemory, VarianceItem, OpexItem } from './types/budget';
import type { DetrafInvoice } from './types/detraf';

export function App() {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [opexItems, setOpexItems] = useState<OpexItem[]>(mockOpexItems);
  const [capexProjects] = useState(mockCapexProjects);
  const [varianceItems, setVarianceItems] = useState(mockVarianceItems);
  const [premises] = useState(mockPremises);
  const [detrafInvoices, setDetrafInvoices] = useState<DetrafInvoice[]>(mockDetrafInvoices);
  const [isNewEntryModalOpen, setIsNewEntryModalOpen] = useState<boolean>(false);

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
    setActiveTab('detraf');
  };

  const handleSaveOpexItem = (newOpex: OpexItem) => {
    setOpexItems(prev => [newOpex, ...prev]);
    setActiveTab('opex');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col selection:bg-blue-500 selection:text-white">
      {/* Top Navigation com Botão Global de Ação */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenNewEntryModal={() => setIsNewEntryModalOpen(true)}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'dashboard' && (
          <DashboardView
            opexItems={opexItems}
            capexProjects={capexProjects}
            varianceItems={varianceItems}
            costCenters={mockCostCenters}
            onNavigateToVariance={() => setActiveTab('variance')}
            onNavigateToCapex={() => setActiveTab('capex')}
          />
        )}

        {activeTab === 'opex' && (
          <OpexGrid
            opexItems={opexItems}
            costCenters={mockCostCenters}
            accounts={mockAccounts}
            onOpenMemoryModal={handleOpenMemoryModal}
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
    </div>
  );
}

export default App;
