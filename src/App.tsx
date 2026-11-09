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
import { DateRangeFilterBar } from './components/DateRangeFilterBar';
import { ImportExcelModal } from './components/ImportExcelModal';
import { CheckCircle2, FileSpreadsheet, Upload } from 'lucide-react';
import {
  testFirestoreConnection,
  ensureFirestoreTablesExist,
  forceSyncAllToFirestore,
  subscribeFirestoreInvoices,
  subscribeFirestoreCustomers,
  subscribeFirestoreSettings,
  saveInvoiceToFirestore,
  deleteInvoiceFromFirestore,
  saveCustomerToFirestore,
  deleteCustomerFromFirestore,
  saveSettingsToFirestore,
  batchUpdateInvoicesInFirestore,
  FIRESTORE_DATABASE_ID,
  FIREBASE_PROJECT_ID,
} from './services/firebase';

export default function App() {
  const [invoices, setInvoices] = useState<Invoice[]>(() => loadStoredInvoices());
  const [customers, setCustomers] = useState<CustomerMaster[]>(() => loadStoredCustomers());
  const [settings, setSettings] = useState<CashbackSettings>(() => loadStoredSettings());
  const [navPosition, setNavPosition] = useState<NavPosition>(() => loadStoredNavPosition());
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');

  // Firebase Real-time Auto-Connection State (Direct & Automatic without login)
  const [isFirebaseConnected, setIsFirebaseConnected] = useState<boolean>(true);
  const [isSyncingWithCloud, setIsSyncingWithCloud] = useState<boolean>(false);

  // Firestore Real-time synchronization lifecycle
  useEffect(() => {
    let unsubInvoices = () => {};
    let unsubCustomers = () => {};
    let unsubSettings = () => {};

    // 1. Test Firestore Cloud connection automatically on mount
    testFirestoreConnection().then(async (connected) => {
      setIsFirebaseConnected(connected);
      if (connected) {
        // 2. Automatically ensure all required tables (invoices, customers, settings, system) exist in Firestore
        try {
          const res = await ensureFirestoreTablesExist(invoices, customers, settings);
          if (res.seededTables.length > 0) {
            console.log('Tabel Firestore berhasil otomatis dibuat:', res.seededTables);
            showToast(`Database Cloud siap! Tabel [${res.seededTables.join(', ')}] otomatis aktif.`);
          }
        } catch (err) {
          console.warn('Auto table check error:', err);
        }

        // 3. Attach live real-time listeners for instant multi-device sync
        let hasLoadedInvoicesOnce = false;
        unsubInvoices = subscribeFirestoreInvoices((liveInvoices) => {
          if (liveInvoices.length > 0 || hasLoadedInvoicesOnce) {
            hasLoadedInvoicesOnce = true;
            setInvoices(liveInvoices);
            saveStoredInvoices(liveInvoices);
          }
        });

        let hasLoadedCustomersOnce = false;
        unsubCustomers = subscribeFirestoreCustomers((liveCustomers) => {
          if (liveCustomers.length > 0 || hasLoadedCustomersOnce) {
            hasLoadedCustomersOnce = true;
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
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Cross-tab filters & Global Date Range Filter
  const [customerFilterForInvoices, setCustomerFilterForInvoices] = useState<string>('');
  const [startDateFilter, setStartDateFilter] = useState<string>('');
  const [endDateFilter, setEndDateFilter] = useState<string>('');

  // Toast feedback state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  // Filter invoices based on global date range (e.g. 1 Jan 2026 - 30 Des 2026)
  const dateFilteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      if (startDateFilter && inv.date < startDateFilter) return false;
      if (endDateFilter && inv.date > endDateFilter) return false;
      return true;
    });
  }, [invoices, startDateFilter, endDateFilter]);

  // Aggregated summaries & ranking based on active date range
  const customerSummaries = useMemo(() => {
    return aggregateCustomerSummaries(dateFilteredInvoices, settings.minSpendForParcel || 5000000);
  }, [dateFilteredInvoices, settings.minSpendForParcel]);

  const totalCashbackSum = useMemo(() => {
    return dateFilteredInvoices.reduce((sum, inv) => sum + inv.cashbackAmount, 0);
  }, [dateFilteredInvoices]);

  // Nav Position Handler
  const handleChangeNavPosition = (pos: NavPosition) => {
    setNavPosition(pos);
    saveStoredNavPosition(pos);
    const label = pos === 'sidebar' ? 'Samping (Sidebar)' : pos === 'top' ? 'Atas (Top Bar)' : 'Bawah (Dock Jempol)';
    showToast(`Posisi navigasi dipindahkan ke: ${label}`);
  };

  // Import Invoices from Excel Handler
  const handleImportSuccess = (importedInvoices: Invoice[], newCustomers: CustomerMaster[]) => {
    const updatedInvoices = [...importedInvoices, ...invoices];
    setInvoices(updatedInvoices);
    saveStoredInvoices(updatedInvoices);
    batchUpdateInvoicesInFirestore(updatedInvoices).catch((err) => console.warn('Firestore import sync:', err));

    if (newCustomers.length > 0) {
      const updatedCustomers = [...newCustomers, ...customers];
      setCustomers(updatedCustomers);
      saveStoredCustomers(updatedCustomers);
      newCustomers.forEach((c) => {
        saveCustomerToFirestore(c).catch((err) => console.warn('Firestore new cust import:', err));
      });
    }

    showToast(
      `Berhasil mengimpor ${importedInvoices.length} faktur dari Excel! ${
        newCustomers.length > 0 ? `(${newCustomers.length} konsumen baru didaftarkan)` : ''
      }`
    );
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

  const handleForceSyncCloud = async () => {
    setIsSyncingWithCloud(true);
    try {
      await forceSyncAllToFirestore(invoices, customers, settings);
      showToast('Seluruh tabel faktur, konsumen, & pengaturan berhasil disinkronkan ke Firebase Firestore!');
    } catch (err) {
      console.error('Force sync error:', err);
      showToast('Gagal sinkronisasi ke cloud: silakan periksa koneksi internet.');
    } finally {
      setIsSyncingWithCloud(false);
    }
  };

  const handleResetData = () => {
    const defaultData = resetToDefaultData();
    setInvoices(defaultData.invoices);
    setSettings(defaultData.settings);
    setCustomers(defaultData.customers);
    forceSyncAllToFirestore(defaultData.invoices, defaultData.customers, defaultData.settings).catch((err) => {
      console.warn('Firestore reset seed:', err);
    });
    showToast('Data sampel default berhasil dimuat ulang dan disinkronkan ke semua tabel Firebase.');
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
      onOpenImportExcel={() => setIsImportModalOpen(true)}
      totalInvoicesCount={invoices.length}
      totalMasterCustomersCount={customers.length}
      totalCashbackSum={totalCashbackSum}
      storeName={settings.storeName}
      isFirebaseConnected={isFirebaseConnected}
    >
      {/* Main Viewport Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-3.5 sm:py-6">
        
        {/* Global Date Range Filter Bar */}
        <DateRangeFilterBar
          startDate={startDateFilter}
          endDate={endDateFilter}
          onChangeStartDate={setStartDateFilter}
          onChangeEndDate={setEndDateFilter}
          onResetDates={() => {
            setStartDateFilter('');
            setEndDateFilter('');
          }}
          totalFilteredCount={dateFilteredInvoices.length}
          totalAllCount={invoices.length}
        />

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
            invoices={dateFilteredInvoices}
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
            invoices={dateFilteredInvoices}
            onSelectCustomer={handleSelectCustomerForInvoices}
            onExportExcel={handleExportExcel}
          />
        )}

        {/* Tab 3: Rekap Faktur List */}
        {activeTab === 'invoices' && (
          <InvoiceList
            invoices={dateFilteredInvoices}
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
            onOpenImportExcel={() => setIsImportModalOpen(true)}
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
            invoices={dateFilteredInvoices}
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
              onClick={() => setIsImportModalOpen(true)}
              className="text-emerald-700 hover:text-emerald-800 font-semibold flex items-center gap-1"
            >
              <Upload className="w-3.5 h-3.5" /> Import Excel
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

      {/* Import Invoices from Excel Modal */}
      <ImportExcelModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        settings={settings}
        masterCustomers={customers}
        onImportSuccess={handleImportSuccess}
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

      {/* Settings Modal (% Cashback & Rules & Navigation Position & Cloud Sync) */}
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        settings={settings}
        onSaveSettings={handleSaveSettings}
        onResetData={handleResetData}
        onForceSyncCloud={handleForceSyncCloud}
        isSyncingWithCloud={isSyncingWithCloud}
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
        invoices={dateFilteredInvoices}
        customerSummaries={customerSummaries}
        settings={settings}
        masterCustomers={customers}
        onSaveSettings={handleSaveSettings}
        onSuccessToast={showToast}
      />

    </SmartNavigation>
  );
}
