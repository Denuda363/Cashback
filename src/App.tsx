import React, { useState, useMemo, useEffect } from 'react';
import { 
  loadStoredInvoices, 
  saveStoredInvoices, 
  loadStoredSettings, 
  saveStoredSettings, 
  loadStoredCustomers,
  saveStoredCustomers,
  loadStoredNavPosition,
  saveStoredNavPosition,
  aggregateCustomerSummaries, 
  resetToDefaultData 
} from './utils/storage';
import { exportCashbackToExcel, exportTandaTerimaFormat } from './utils/excelExport';
import { calculateCashback } from './utils/cashbackCalculator';
import { ActiveTab, ClaimStatus, Invoice, CashbackSettings, CustomerMaster, NavPosition } from './types/cashback';
import { SmartNavigation } from './components/SmartNavigation';
import { DashboardAnalytics } from './components/DashboardAnalytics';
import { Top10Leaderboard } from './components/Top10Leaderboard';
import { InvoiceList } from './components/InvoiceList';
import { CustomerSummaryView } from './components/CustomerSummaryView';
import { MasterCustomerList } from './components/MasterCustomerList';
import { CustomerModal } from './components/CustomerModal';
import { InvoiceModal } from './components/InvoiceModal';
import { SettingsModal } from './components/SettingsModal';
import { ReceiptModal } from './components/ReceiptModal';
import { ExportModal } from './components/ExportModal';
import { CheckCircle2, FileSpreadsheet } from 'lucide-react';
import {
  testFirestoreConnection,
  seedFirestoreIfEmpty,
  subscribeFirestoreInvoices,
  subscribeFirestoreCustomers,
  subscribeFirestoreSettings,
  saveInvoiceToFirestore,
  deleteInvoiceFromFirestore,
  saveCustomerToFirestore,
  deleteCustomerFromFirestore,
  saveSettingsToFirestore,
  batchUpdateInvoicesInFirestore,
} from './services/firebase';

export default function App() {
  const [invoices, setInvoices] = useState<Invoice[]>(() => loadStoredInvoices());
  const [customers, setCustomers] = useState<CustomerMaster[]>(() => loadStoredCustomers());
  const [settings, setSettings] = useState<CashbackSettings>(() => loadStoredSettings());
  const [navPosition, setNavPosition] = useState<NavPosition>(() => loadStoredNavPosition());
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');

  // Firebase Real-time Auto-Connection State (Direct & Automatic without login)
  const [isFirebaseConnected, setIsFirebaseConnected] = useState<boolean>(true);

  // Firestore Real-time synchronization lifecycle
  useEffect(() => {
    let unsubInvoices = () => {};
    let unsubCustomers = () => {};
    let unsubSettings = () => {};

    // 1. Test Firestore Cloud connection automatically on mount
    testFirestoreConnection().then((connected) => {
      setIsFirebaseConnected(connected);
      if (connected) {
        // 2. Automatically seed Firestore if brand new & empty
        seedFirestoreIfEmpty(invoices, customers, settings).catch((err) => {
          console.warn('Seed Firestore check:', err);
        });

        // 3. Attach live real-time listeners for instant multi-device sync
        unsubInvoices = subscribeFirestoreInvoices((liveInvoices) => {
          if (liveInvoices && liveInvoices.length > 0) {
            setInvoices(liveInvoices);
            saveStoredInvoices(liveInvoices);
          }
        });

        unsubCustomers = subscribeFirestoreCustomers((liveCustomers) => {
          if (liveCustomers && liveCustomers.length > 0) {
            setCustomers(liveCustomers);
            saveStoredCustomers(liveCustomers);
          }
        });

        unsubSettings = subscribeFirestoreSettings((liveSettings) => {
          if (liveSettings) {
            setSettings(liveSettings);
            saveStoredSettings(liveSettings);
          }
        });
      }
    });

    return () => {
      unsubInvoices();
      unsubCustomers();
      unsubSettings();
    };
  }, []);

  // Modals state
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<CustomerMaster | null>(null);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [receiptInvoice, setReceiptInvoice] = useState<Invoice | null>(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  // Cross-tab filters
  const [customerFilterForInvoices, setCustomerFilterForInvoices] = useState<string>('');

  // Toast feedback state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  // Aggregated summaries & ranking
  const customerSummaries = useMemo(() => {
    return aggregateCustomerSummaries(invoices, settings.minSpendForParcel || 5000000);
  }, [invoices, settings.minSpendForParcel]);

  const totalCashbackSum = useMemo(() => {
    return invoices.reduce((sum, inv) => sum + inv.cashbackAmount, 0);
  }, [invoices]);

  // Nav Position Handler
  const handleChangeNavPosition = (pos: NavPosition) => {
    setNavPosition(pos);
    saveStoredNavPosition(pos);
    const label = pos === 'sidebar' ? 'Samping (Sidebar)' : pos === 'top' ? 'Atas (Top Bar)' : 'Bawah (Dock Jempol)';
    showToast(`Posisi navigasi dipindahkan ke: ${label}`);
  };

  // Invoice Handlers
  const handleSaveInvoice = (invoiceData: Omit<Invoice, 'id' | 'createdAt'>, invoiceId?: string) => {
    // Check if customer exists in Master Data; if not, automatically add them!
    const existingCust = customers.find(
      (c) => c.phone.trim() === invoiceData.customerPhone.trim() || c.name.toLowerCase() === invoiceData.customerName.toLowerCase()
    );

    if (!existingCust) {
      const nextCode = `CUST-${String(customers.length + 1).padStart(3, '0')}`;
      const newCust: CustomerMaster = {
        id: `cust-${Date.now()}`,
        customerCode: nextCode,
        name: invoiceData.customerName,
        phone: invoiceData.customerPhone,
        email: invoiceData.customerEmail,
        preferredPayoutMethod: invoiceData.payoutMethod,
        joinedDate: invoiceData.date,
        isActive: true,
      };
      const updatedCustomers = [...customers, newCust];
      setCustomers(updatedCustomers);
      saveStoredCustomers(updatedCustomers);
      saveCustomerToFirestore(newCust).catch((err) => console.warn('Firestore customer sync:', err));
    }

    if (invoiceId) {
      // Edit existing
      let savedInvoice: Invoice | undefined;
      const updated = invoices.map((inv) => {
        if (inv.id === invoiceId) {
          savedInvoice = { ...inv, ...invoiceData };
          return savedInvoice;
        }
        return inv;
      });
      setInvoices(updated);
      saveStoredInvoices(updated);
      if (savedInvoice) {
        saveInvoiceToFirestore(savedInvoice).catch((err) => console.warn('Firestore invoice update:', err));
      }
      showToast(`Faktur ${invoiceData.invoiceNumber} berhasil disimpan ke Firebase.`);
    } else {
      // Add new
      const newInvoice: Invoice = {
        ...invoiceData,
        id: `inv-${Date.now()}`,
        createdAt: new Date().toISOString(),
      };
      const updated = [newInvoice, ...invoices];
      setInvoices(updated);
      saveStoredInvoices(updated);
      saveInvoiceToFirestore(newInvoice).catch((err) => console.warn('Firestore invoice add:', err));
      showToast(`Faktur ${newInvoice.invoiceNumber} (${invoiceData.customerName}) tersimpan ke Firebase.`);
    }
  };

  const handleDeleteInvoice = (invoiceId: string) => {
    const updated = invoices.filter((inv) => inv.id !== invoiceId);
    setInvoices(updated);
    saveStoredInvoices(updated);
    deleteInvoiceFromFirestore(invoiceId).catch((err) => console.warn('Firestore invoice delete:', err));
    showToast('Faktur berhasil dihapus dari Firebase.');
  };

  const handleUpdateStatus = (invoiceId: string, newStatus: ClaimStatus) => {
    let updatedInv: Invoice | undefined;
    const updated = invoices.map((inv) => {
      if (inv.id === invoiceId) {
        updatedInv = {
          ...inv,
          claimStatus: newStatus,
          disbursedDate: newStatus === 'disbursed' ? (inv.disbursedDate || new Date().toISOString().split('T')[0]) : undefined,
        };
        return updatedInv;
      }
      return inv;
    });
    setInvoices(updated);
    saveStoredInvoices(updated);
    if (updatedInv) {
      saveInvoiceToFirestore(updatedInv).catch((err) => console.warn('Firestore status update:', err));
    }
    showToast(`Status klaim faktur berhasil diperbarui di Firebase.`);
  };

  // Master Customer Handlers
  const handleSaveCustomer = (customerData: Omit<CustomerMaster, 'id'>, customerId?: string) => {
    if (customerId) {
      let updatedTarget: CustomerMaster | undefined;
      const updated = customers.map((c) => {
        if (c.id === customerId) {
          updatedTarget = { ...c, ...customerData };
          return updatedTarget;
        }
        return c;
      });
      setCustomers(updated);
      saveStoredCustomers(updated);
      if (updatedTarget) {
        saveCustomerToFirestore(updatedTarget).catch((err) => console.warn('Firestore customer update:', err));
      }
      showToast(`Data konsumen ${customerData.name} diperbarui di Firebase.`);
    } else {
      const newCust: CustomerMaster = {
        ...customerData,
        id: `cust-${Date.now()}`,
      };
      const updated = [newCust, ...customers];
      setCustomers(updated);
      saveStoredCustomers(updated);
      saveCustomerToFirestore(newCust).catch((err) => console.warn('Firestore customer add:', err));
      showToast(`Konsumen ${newCust.name} (${newCust.customerCode}) tersimpan ke Firebase.`);
    }
  };

  const handleDeleteCustomer = (customerId: string) => {
    const target = customers.find((c) => c.id === customerId);
    const updated = customers.filter((c) => c.id !== customerId);
    setCustomers(updated);
    saveStoredCustomers(updated);
    deleteCustomerFromFirestore(customerId).catch((err) => console.warn('Firestore customer delete:', err));
    showToast(`Konsumen ${target?.name || ''} berhasil dihapus dari Firebase.`);
  };

  const handleToggleCustomerStatus = (customerId: string) => {
    let targetCust: CustomerMaster | undefined;
    const updated = customers.map((c) => {
      if (c.id === customerId) {
        const nextActive = !c.isActive;
        targetCust = { ...c, isActive: nextActive };
        showToast(`Status ${c.name} diubah menjadi ${nextActive ? 'Aktif' : 'Non-Aktif'}.`);
        return targetCust;
      }
      return c;
    });
    setCustomers(updated);
    saveStoredCustomers(updated);
    if (targetCust) {
      saveCustomerToFirestore(targetCust).catch((err) => console.warn('Firestore status toggle:', err));
    }
  };

  const handleQuickAddMasterCustomer = (newCustData: Omit<CustomerMaster, 'id'>) => {
    const newCust: CustomerMaster = {
      ...newCustData,
      id: `cust-${Date.now()}`,
    };
    const updated = [...customers, newCust];
    setCustomers(updated);
    saveStoredCustomers(updated);
    saveCustomerToFirestore(newCust).catch((err) => console.warn('Firestore quick add:', err));
    showToast(`Konsumen ${newCust.name} (${newCust.customerCode}) didaftarkan ke Firebase.`);
  };

  // Settings Handlers
  const handleSaveSettings = (newSettings: CashbackSettings) => {
    setSettings(newSettings);
    saveStoredSettings(newSettings);
    saveSettingsToFirestore(newSettings).catch((err) => console.warn('Firestore settings save:', err));

    // Dynamic Recalculation: Jika diatur 2% semua jadi 2%, jika 3% semua jadi 3%!
    const updatedInvoices = invoices.map((inv) => {
      const calc = calculateCashback(inv.purchaseAmount, newSettings);
      return {
        ...inv,
        cashbackPercentage: calc.effectivePercentage,
        cashbackAmount: calc.cashbackAmount,
        getParcel: inv.purchaseAmount >= (newSettings.minSpendForParcel || 5000000),
      };
    });

    setInvoices(updatedInvoices);
    saveStoredInvoices(updatedInvoices);
    batchUpdateInvoicesInFirestore(updatedInvoices).catch((err) => console.warn('Firestore batch recalc:', err));

    showToast(
      `Pengaturan disimpan ke cloud! Persentase cashback diatur ke ${newSettings.flatPercentage}%. Semua ${updatedInvoices.length} faktur otomatis sinkron!`
    );
  };

  const handleResetData = () => {
    const defaultData = resetToDefaultData();
    setInvoices(defaultData.invoices);
    setSettings(defaultData.settings);
    setCustomers(defaultData.customers);
    seedFirestoreIfEmpty(defaultData.invoices, defaultData.customers, defaultData.settings).catch((err) => {
      console.warn('Firestore reset seed:', err);
    });
    showToast('Data sampel default berhasil dimuat ulang dan disinkronkan ke Firebase.');
  };

  // Export to Excel Dialog Handler
  const handleExportExcel = () => {
    setIsExportModalOpen(true);
  };

  // Cross-navigation
  const handleSelectCustomerForInvoices = (customerName: string) => {
    setCustomerFilterForInvoices(customerName);
    setActiveTab('invoices');
  };

  return (
    <SmartNavigation
      activeTab={activeTab}
      setActiveTab={(tab) => {
        if (tab === 'settings') {
          setIsSettingsModalOpen(true);
        } else {
          setActiveTab(tab);
        }
      }}
      navPosition={navPosition}
      onChangeNavPosition={handleChangeNavPosition}
      onOpenNewInvoice={() => {
        setEditingInvoice(null);
        setIsInvoiceModalOpen(true);
      }}
      onExportExcel={handleExportExcel}
      totalInvoicesCount={invoices.length}
      totalMasterCustomersCount={customers.length}
      totalCashbackSum={totalCashbackSum}
      storeName={settings.storeName}
      isFirebaseConnected={isFirebaseConnected}
    >
      {/* Main Viewport Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-3.5 sm:py-6">
        
        {/* Toast alert */}
        {toastMessage && (
          <div className="mb-4 p-3 rounded-lg bg-slate-900 text-white text-xs font-medium flex items-center justify-between shadow-md transition-all animate-in fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>{toastMessage}</span>
            </div>
            <button
              onClick={() => setToastMessage(null)}
              className="text-slate-400 hover:text-white"
            >
              ×
            </button>
          </div>
        )}

        {/* Tab 1: Dashboard Analytics */}
        {activeTab === 'dashboard' && (
          <DashboardAnalytics
            invoices={invoices}
            settings={settings}
            customerSummaries={customerSummaries}
            onNavigateToTab={(tab) => {
              if (tab === 'settings') {
                setIsSettingsModalOpen(true);
              } else {
                setActiveTab(tab);
              }
            }}
            onOpenNewInvoice={() => {
              setEditingInvoice(null);
              setIsInvoiceModalOpen(true);
            }}
            onOpenSettings={() => setIsSettingsModalOpen(true)}
          />
        )}

        {/* Tab 2: Top 10 Leaderboard */}
        {activeTab === 'top10' && (
          <Top10Leaderboard
            customerSummaries={customerSummaries}
            invoices={invoices}
            onSelectCustomer={handleSelectCustomerForInvoices}
            onExportExcel={handleExportExcel}
          />
        )}

        {/* Tab 3: Rekap Faktur List */}
        {activeTab === 'invoices' && (
          <InvoiceList
            invoices={invoices}
            onOpenNewInvoice={() => {
              setEditingInvoice(null);
              setIsInvoiceModalOpen(true);
            }}
            onEditInvoice={(inv) => {
              setEditingInvoice(inv);
              setIsInvoiceModalOpen(true);
            }}
            onDeleteInvoice={handleDeleteInvoice}
            onViewReceipt={(inv) => setReceiptInvoice(inv)}
            onUpdateStatus={handleUpdateStatus}
            onExportExcel={handleExportExcel}
            initialCustomerFilter={customerFilterForInvoices}
            onClearCustomerFilter={() => setCustomerFilterForInvoices('')}
          />
        )}

        {/* Tab 4: Rekap Konsumen Aggregated */}
        {activeTab === 'customers' && (
          <CustomerSummaryView
            customerSummaries={customerSummaries}
            onSelectCustomerForInvoices={handleSelectCustomerForInvoices}
            onExportExcel={handleExportExcel}
          />
        )}

        {/* Tab 5: Master Data Konsumen (Master Database) */}
        {activeTab === 'master_customers' && (
          <MasterCustomerList
            customers={customers}
            invoices={invoices}
            customerSummaries={customerSummaries}
            onOpenNewCustomer={() => {
              setEditingCustomer(null);
              setIsCustomerModalOpen(true);
            }}
            onEditCustomer={(cust) => {
              setEditingCustomer(cust);
              setIsCustomerModalOpen(true);
            }}
            onDeleteCustomer={handleDeleteCustomer}
            onToggleStatus={handleToggleCustomerStatus}
            onSelectCustomerForInvoices={handleSelectCustomerForInvoices}
            onExportExcel={handleExportExcel}
          />
        )}

      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-800">{settings.storeName}</span>
            <span aria-hidden="true">·</span>
            <span>Rekapitulasi Cashback Konsumen & Master Data</span>
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <button
              onClick={() => setActiveTab('master_customers')}
              className="hover:text-slate-900"
            >
              Master Data ({customers.length} Konsumen)
            </button>
            <span aria-hidden="true">·</span>
            <button
              onClick={() => setIsSettingsModalOpen(true)}
              className="hover:text-slate-900"
            >
              Pengaturan Aturan ({settings.mode === 'flat' ? `${settings.flatPercentage}% Flat` : 'Tiered'})
            </button>
            <span aria-hidden="true">·</span>
            <button
              onClick={handleExportExcel}
              className="text-emerald-700 hover:text-emerald-800 font-semibold flex items-center gap-1"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" /> Unduh Format Excel
            </button>
          </div>
        </div>
      </footer>

      {/* Invoice Modal (Input & Edit with Live Searchable Master Customer Combobox) */}
      <InvoiceModal
        isOpen={isInvoiceModalOpen}
        onClose={() => {
          setIsInvoiceModalOpen(false);
          setEditingInvoice(null);
        }}
        onSave={handleSaveInvoice}
        editingInvoice={editingInvoice}
        settings={settings}
        existingInvoices={invoices}
        masterCustomers={customers}
        onQuickAddMasterCustomer={handleQuickAddMasterCustomer}
      />

      {/* Master Customer Modal (Create & Edit) */}
      <CustomerModal
        isOpen={isCustomerModalOpen}
        onClose={() => {
          setIsCustomerModalOpen(false);
          setEditingCustomer(null);
        }}
        onSave={handleSaveCustomer}
        editingCustomer={editingCustomer}
        existingCustomers={customers}
      />

      {/* Settings Modal (% Cashback & Rules & Navigation Position) */}
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        settings={settings}
        onSaveSettings={handleSaveSettings}
        onResetData={handleResetData}
        navPosition={navPosition}
        onChangeNavPosition={handleChangeNavPosition}
      />

      {/* Digital Receipt Modal */}
      <ReceiptModal
        invoice={receiptInvoice}
        onClose={() => setReceiptInvoice(null)}
        settings={settings}
        onMarkDisbursed={(id) => handleUpdateStatus(id, 'disbursed')}
      />

      {/* Excel Export Selection Modal */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        invoices={invoices}
        customerSummaries={customerSummaries}
        settings={settings}
        masterCustomers={customers}
        onSaveSettings={handleSaveSettings}
        onSuccessToast={showToast}
      />

    </SmartNavigation>
  );
}
