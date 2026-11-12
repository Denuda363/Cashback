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
  exportBackupJSON,
  wipeAllLocalData,
  AppBackupData
} from './utils/storage';
import { exportCashbackToExcel, exportTandaTerimaFormat } from './utils/excelExport';
import { calculateCashback, formatRupiah, getBenefitLabel } from './utils/cashbackCalculator';
import { ActiveTab, ClaimStatus, Invoice, CashbackSettings, CustomerMaster, CustomerSummary, NavPosition, CustomerBenefitType } from './types/cashback';
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
import { ImportCustomerModal } from './components/ImportCustomerModal';
import { UserGuideModal } from './components/UserGuideModal';
import { OfflineIndicator } from './components/OfflineIndicator';
import { DisbursementModal, CustomerDisbursementData } from './components/DisbursementModal';
import { CashbackDisbursementRecords } from './components/CashbackDisbursementRecords';
import { CheckCircle2, FileSpreadsheet, Upload, BookOpen } from 'lucide-react';
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
  batchUpdateCustomersInFirestore,
  deleteAllDataFromFirestore,
  deleteAllInvoicesFromFirestore,
  restoreBackupToFirestore,
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
            console.log('Tabel Firestore berhasil otomatis dibuat/disinkronkan:', res.seededTables);
            showToast(`Firebase Cloud aktif! Data tersinkronisasi otomatis.`);
          }
        } catch (err) {
          console.warn('Auto table check error:', err);
        }

        // 3. Attach live real-time listeners for instant multi-device sync
        unsubInvoices = subscribeFirestoreInvoices((liveInvoices) => {
          if (liveInvoices && liveInvoices.length > 0) {
            setInvoices(liveInvoices);
            saveStoredInvoices(liveInvoices);
          } else {
            const local = loadStoredInvoices();
            if (local.length > 0) {
              console.log('[Firestore] Mengunggah data faktur lokal ke Firebase Cloud...');
              batchUpdateInvoicesInFirestore(local).catch((e) => console.warn('Sync local invoices error:', e));
            } else {
              setInvoices([]);
              saveStoredInvoices([]);
            }
          }
        });

        unsubCustomers = subscribeFirestoreCustomers((liveCustomers) => {
          if (liveCustomers && liveCustomers.length > 0) {
            setCustomers(liveCustomers);
            saveStoredCustomers(liveCustomers);
          } else {
            const local = loadStoredCustomers();
            if (local.length > 0) {
              console.log('[Firestore] Mengunggah master konsumen lokal ke Firebase Cloud...');
              batchUpdateCustomersInFirestore(local).catch((e) => console.warn('Sync local customers error:', e));
            } else {
              setCustomers([]);
              saveStoredCustomers([]);
            }
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
  const [isImportCustomerModalOpen, setIsImportCustomerModalOpen] = useState(false);
  const [isGuideModalOpen, setIsGuideModalOpen] = useState(false);
  const [disbursingInvoice, setDisbursingInvoice] = useState<Invoice | null>(null);
  const [disbursingCustomer, setDisbursingCustomer] = useState<CustomerSummary | null>(null);

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
    return aggregateCustomerSummaries(
      dateFilteredInvoices,
      settings.minSpendForParcel || 5000000,
      customers,
      settings.excludedCustomerNames || [],
      settings.customerBenefitOverrides || {}
    );
  }, [dateFilteredInvoices, settings.minSpendForParcel, customers, settings.excludedCustomerNames, settings.customerBenefitOverrides]);

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
  const handleImportSuccess = async (importedInvoices: Invoice[], newCustomers: CustomerMaster[]) => {
    const updatedInvoices = [...importedInvoices, ...invoices];
    setInvoices(updatedInvoices);
    saveStoredInvoices(updatedInvoices);
    await batchUpdateInvoicesInFirestore(updatedInvoices).catch((err) => console.warn('Firestore import sync:', err));

    if (newCustomers.length > 0) {
      const updatedCustomers = [...newCustomers, ...customers];
      setCustomers(updatedCustomers);
      saveStoredCustomers(updatedCustomers);
      await batchUpdateCustomersInFirestore(updatedCustomers).catch((err) => console.warn('Firestore new cust import:', err));
    }

    showToast(
      `Berhasil mengimpor ${importedInvoices.length} faktur dari Excel ke Firebase Cloud & lokal! ${
        newCustomers.length > 0 ? `(${newCustomers.length} konsumen baru didaftarkan)` : ''
      }`
    );
  };

  // Import Master Customers from Excel Handler
  const handleImportCustomersSuccess = async (importedCustomers: CustomerMaster[]) => {
    const updatedCustomers = [...importedCustomers, ...customers];
    setCustomers(updatedCustomers);
    saveStoredCustomers(updatedCustomers);

    // Sync imported customers in efficient batch to Firestore Cloud
    await batchUpdateCustomersInFirestore(updatedCustomers).catch((err) =>
      console.warn('Firestore customer import sync error:', err)
    );

    showToast(
      `Berhasil mengimpor ${importedCustomers.length} data konsumen ke Master Data & Firebase Cloud!`
    );
  };

  // Invoice Handlers
  const handleSaveInvoice = async (invoiceData: Omit<Invoice, 'id' | 'createdAt'>, invoiceId?: string) => {
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
      await saveCustomerToFirestore(newCust).catch((err) => console.warn('Firestore customer sync:', err));
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
        await saveInvoiceToFirestore(savedInvoice).catch((err) => console.warn('Firestore invoice update:', err));
      }
      showToast(`Faktur ${invoiceData.invoiceNumber} berhasil disimpan ke Firebase Cloud.`);
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
      await saveInvoiceToFirestore(newInvoice).catch((err) => console.warn('Firestore invoice add:', err));
      showToast(`Faktur ${newInvoice.invoiceNumber} (${invoiceData.customerName}) tersimpan ke Firebase Cloud.`);
    }
  };

  const handleDeleteInvoice = async (invoiceId: string) => {
    const updated = invoices.filter((inv) => inv.id !== invoiceId);
    setInvoices(updated);
    saveStoredInvoices(updated);
    await deleteInvoiceFromFirestore(invoiceId).catch((err) => console.warn('Firestore invoice delete:', err));
    showToast('Faktur berhasil dihapus dari Firebase Cloud.');
  };

  const handleUpdateStatus = async (invoiceId: string, newStatus: ClaimStatus) => {
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
      await saveInvoiceToFirestore(updatedInv).catch((err) => console.warn('Firestore status update:', err));
    }
    showToast(`Status klaim faktur berhasil diperbarui di Firebase Cloud.`);
  };

  // Reset entire invoice transactions collection (Faktur Reset)
  const handleResetAllInvoices = async () => {
    setIsSyncingWithCloud(true);
    try {
      const deletedCount = await deleteAllInvoicesFromFirestore();
      saveStoredInvoices([]);
      setInvoices([]);
      showToast(`Seluruh data faktur (${deletedCount} transaksi) berhasil di-reset dan dibersihkan dari Firebase Cloud!`);
    } catch (err: any) {
      console.error('Reset invoices error:', err);
      showToast('Gagal mereset faktur: ' + (err?.message || 'Error'));
    } finally {
      setIsSyncingWithCloud(false);
    }
  };

  // Confirm cashback disbursement with photo proof & digital signature
  const handleConfirmDisbursement = async (
    invoiceId: string,
    data: {
      disbursedDate: string;
      disbursedAt: string;
      payoutMethod: any;
      recipientName: string;
      disbursementProofPhoto?: string;
      disbursementSignature?: string;
      disbursementNotes?: string;
    }
  ) => {
    const inv = invoices.find((i) => i.id === invoiceId);
    if (!inv) return;
    const updatedInv: Invoice = {
      ...inv,
      claimStatus: 'disbursed',
      disbursedDate: data.disbursedDate,
      disbursedAt: data.disbursedAt,
      payoutMethod: data.payoutMethod,
      recipientName: data.recipientName,
      disbursementProofPhoto: data.disbursementProofPhoto,
      disbursementSignature: data.disbursementSignature,
      disbursementNotes: data.disbursementNotes,
    };
    await handleSaveInvoice(updatedInv, invoiceId);
    showToast(`Penerimaan cashback faktur ${inv.invoiceNumber} (${inv.customerName}) tersimpan ke Cloud!`);
  };

  // Confirm cashback disbursement per customer (mencairkan seluruh hak cashback konsumen)
  const handleConfirmCustomerDisbursement = async (
    customerName: string,
    data: CustomerDisbursementData
  ) => {
    setIsSyncingWithCloud(true);
    try {
      const clean = customerName.trim().toLowerCase();
      // Update all invoices for this customer to disbursed status
      const updatedInvoices = invoices.map((inv) => {
        if ((inv.customerName || '').trim().toLowerCase() === clean) {
          return {
            ...inv,
            claimStatus: 'disbursed' as const,
            disbursedDate: data.disbursedDate,
            disbursedAt: data.disbursedAt,
            payoutMethod: data.payoutMethod,
            recipientName: data.recipientName,
            disbursementProofPhoto: data.disbursementProofPhoto,
            disbursementSignature: data.disbursementSignature,
            disbursementNotes: data.disbursementNotes,
          };
        }
        return inv;
      });

      setInvoices(updatedInvoices);
      saveStoredInvoices(updatedInvoices);
      await batchUpdateInvoicesInFirestore(updatedInvoices);
      showToast(
        `Pencairan cashback konsumen ${customerName} sebesar ${formatRupiah(data.totalCashbackPaid)} berhasil dicatat & disimpan ke Cloud!`
      );
    } catch (err: any) {
      console.error('Customer disbursement sync error:', err);
      showToast('Gagal mencatat pencairan: ' + (err?.message || 'Error'));
    } finally {
      setIsSyncingWithCloud(false);
    }
  };

  // Revert customer disbursement (batalkan status pencairan konsumen)
  const handleRevertCustomerDisbursement = async (customerName: string) => {
    setIsSyncingWithCloud(true);
    try {
      const clean = customerName.trim().toLowerCase();
      const updatedInvoices = invoices.map((inv) => {
        if ((inv.customerName || '').trim().toLowerCase() === clean && inv.claimStatus === 'disbursed') {
          return {
            ...inv,
            claimStatus: 'ready' as const,
            disbursedDate: undefined,
            disbursedAt: undefined,
            disbursementProofPhoto: undefined,
            disbursementSignature: undefined,
            disbursementNotes: undefined,
          };
        }
        return inv;
      });

      setInvoices(updatedInvoices);
      saveStoredInvoices(updatedInvoices);
      await batchUpdateInvoicesInFirestore(updatedInvoices);
      showToast(`Status pencairan untuk ${customerName} berhasil dibatalkan.`);
    } catch (err: any) {
      showToast('Gagal membatalkan pencairan: ' + (err?.message || 'Error'));
    } finally {
      setIsSyncingWithCloud(false);
    }
  };

  // Toggle disqualify/exclude customer from receiving cashback
  const handleToggleExcludeCustomer = async (customerName: string) => {
    const clean = customerName.trim().toLowerCase();
    const currentList = settings.excludedCustomerNames || [];
    const exists = currentList.some((n) => n.trim().toLowerCase() === clean);
    const nextList = exists
      ? currentList.filter((n) => n.trim().toLowerCase() !== clean)
      : [...currentList, customerName.trim()];
    const nextSettings: CashbackSettings = { ...settings, excludedCustomerNames: nextList };
    setSettings(nextSettings);
    saveStoredSettings(nextSettings);
    await saveSettingsToFirestore(nextSettings).catch((err) => console.warn('Sync excluded settings:', err));
    showToast(
      exists
        ? `Hak cashback untuk ${customerName} berhasil dipulihkan.`
        : `Konsumen ${customerName} dicoret dari daftar penerima cashback.`
    );
  };

  // Set customer benefit package (Cashback + Parsel, Cashback Saja, or Parcel Saja)
  const handleSetCustomerBenefit = async (customerName: string, benefitType: CustomerBenefitType) => {
    const clean = customerName.trim().toLowerCase();
    if (!clean) return;
    const currentOverrides = { ...(settings.customerBenefitOverrides || {}) };
    currentOverrides[clean] = benefitType;
    const nextSettings: CashbackSettings = { ...settings, customerBenefitOverrides: currentOverrides };
    setSettings(nextSettings);
    saveStoredSettings(nextSettings);
    await saveSettingsToFirestore(nextSettings).catch((err) => console.warn('Sync benefit settings:', err));
    showToast(`Paket untuk ${customerName} berhasil diatur ke: "${getBenefitLabel(benefitType)}"`);
  };

  // Master Customer Handlers
  const handleSaveCustomer = async (customerData: Omit<CustomerMaster, 'id'>, customerId?: string) => {
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
        await saveCustomerToFirestore(updatedTarget).catch((err) => console.warn('Firestore customer update:', err));
      }
      showToast(`Data konsumen ${customerData.name} diperbarui di Firebase Cloud.`);
    } else {
      const newCust: CustomerMaster = {
        ...customerData,
        id: `cust-${Date.now()}`,
      };
      const updated = [newCust, ...customers];
      setCustomers(updated);
      saveStoredCustomers(updated);
      await saveCustomerToFirestore(newCust).catch((err) => console.warn('Firestore customer add:', err));
      showToast(`Konsumen ${newCust.name} (${newCust.customerCode}) tersimpan ke Firebase Cloud.`);
    }
  };

  const handleDeleteCustomer = async (customerId: string) => {
    const target = customers.find((c) => c.id === customerId);
    const updated = customers.filter((c) => c.id !== customerId);
    setCustomers(updated);
    saveStoredCustomers(updated);
    await deleteCustomerFromFirestore(customerId).catch((err) => console.warn('Firestore customer delete:', err));
    showToast(`Konsumen ${target?.name || ''} berhasil dihapus dari Firebase Cloud.`);
  };

  const handleToggleCustomerStatus = async (customerId: string) => {
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
      await saveCustomerToFirestore(targetCust).catch((err) => console.warn('Firestore status toggle:', err));
    }
  };

  const handleQuickAddMasterCustomer = async (newCustData: Omit<CustomerMaster, 'id'>) => {
    const newCust: CustomerMaster = {
      ...newCustData,
      id: `cust-${Date.now()}`,
    };
    const updated = [...customers, newCust];
    setCustomers(updated);
    saveStoredCustomers(updated);
    await saveCustomerToFirestore(newCust).catch((err) => console.warn('Firestore quick add:', err));
    showToast(`Konsumen ${newCust.name} (${newCust.customerCode}) didaftarkan ke Firebase Cloud.`);
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

  // Backup & Restore Handlers
  const handleBackupData = () => {
    try {
      exportBackupJSON(invoices, customers, settings);
      showToast(
        `Cadangan data (${invoices.length} faktur, ${customers.length} konsumen) berhasil diunduh.`
      );
    } catch (err: any) {
      console.error('Backup error:', err);
      showToast('Gagal mengunduh backup data: ' + (err?.message || 'Error'));
    }
  };

  const handleRestoreBackup = async (backup: AppBackupData) => {
    setIsSyncingWithCloud(true);
    try {
      // 1. Update React state
      setInvoices(backup.invoices);
      setCustomers(backup.customers);
      setSettings(backup.settings);

      // 2. Save to local storage
      saveStoredInvoices(backup.invoices);
      saveStoredCustomers(backup.customers);
      saveStoredSettings(backup.settings);

      // 3. Restore to Firestore Cloud
      await restoreBackupToFirestore(backup.invoices, backup.customers, backup.settings);

      showToast(
        `Data berhasil dipulihkan dari backup: ${backup.invoices.length} faktur dan ${backup.customers.length} konsumen telah aktif di cloud & lokal!`
      );
    } catch (err: any) {
      console.error('Restore error:', err);
      showToast('Gagal memulihkan data dari file backup: ' + (err?.message || 'Error'));
    } finally {
      setIsSyncingWithCloud(false);
    }
  };

  // Permanent Total Wipe Handler (Hapus All Data Permanen)
  const handleWipeAllDataPermanent = async () => {
    setIsSyncingWithCloud(true);
    try {
      // 1. Delete all invoices and customers from Cloud Firestore
      const wipeResult = await deleteAllDataFromFirestore();

      // 2. Clear local storage
      wipeAllLocalData();

      // 3. Clear local React state
      setInvoices([]);
      setCustomers([]);

      showToast(
        `Seluruh data berhasil dihapus permanen! (${wipeResult?.deletedInvoices || 0} faktur & ${wipeResult?.deletedCustomers || 0} konsumen telah dibersihkan dari Cloud & Lokal).`
      );
    } catch (err: any) {
      console.error('Wipe data error:', err);
      showToast('Gagal menghapus data di cloud: ' + (err?.message || 'Error'));
    } finally {
      setIsSyncingWithCloud(false);
    }
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
            onResetAllInvoices={handleResetAllInvoices}
            onOpenDisbursementModal={(inv) => {
              const matchedCust = customerSummaries.find(
                (c) => c.customerName.toLowerCase() === inv.customerName.toLowerCase()
              );
              if (matchedCust) {
                setDisbursingCustomer(matchedCust);
              } else {
                setDisbursingInvoice(inv);
              }
            }}
            initialCustomerFilter={customerFilterForInvoices}
            onClearCustomerFilter={() => setCustomerFilterForInvoices('')}
          />
        )}

        {/* Tab 3.5: Rekap Penerimaan Cashback (Disbursement Records & Proofs Per Konsumen) */}
        {activeTab === 'payout_records' && (
          <CashbackDisbursementRecords
            customerSummaries={customerSummaries}
            invoices={dateFilteredInvoices}
            onOpenCustomerDisbursement={(cust) => setDisbursingCustomer(cust)}
            onRevertCustomerDisbursement={handleRevertCustomerDisbursement}
            onSelectCustomerForInvoices={handleSelectCustomerForInvoices}
            onExportExcel={handleExportExcel}
            companyProfile={settings.companyProfile}
            storeName={settings.companyProfile?.companyName || settings.storeName}
          />
        )}

        {/* Tab 4: Rekap Konsumen Aggregated */}
        {activeTab === 'customers' && (
          <CustomerSummaryView
            invoices={dateFilteredInvoices}
            customerSummaries={customerSummaries}
            excludedCustomerNames={settings.excludedCustomerNames || []}
            benefitOverrides={settings.customerBenefitOverrides || {}}
            onSetCustomerBenefit={handleSetCustomerBenefit}
            onToggleExcludeCustomer={handleToggleExcludeCustomer}
            onOpenCustomerDisbursement={(cust) => setDisbursingCustomer(cust)}
            onSelectCustomerForInvoices={handleSelectCustomerForInvoices}
            onExportExcel={handleExportExcel}
            companyProfile={settings.companyProfile}
            storeName={settings.companyProfile?.companyName || settings.storeName}
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
            onOpenImportExcel={() => setIsImportCustomerModalOpen(true)}
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
            <span aria-hidden="true">·</span>
            <button
              onClick={() => setIsGuideModalOpen(true)}
              className="text-slate-800 hover:text-emerald-700 font-bold flex items-center gap-1 bg-slate-100 hover:bg-emerald-50 px-2 py-0.5 rounded-md transition-colors"
            >
              <BookOpen className="w-3.5 h-3.5 text-emerald-600" /> Buku Panduan
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

      {/* Import Master Customers from Excel Modal */}
      <ImportCustomerModal
        isOpen={isImportCustomerModalOpen}
        onClose={() => setIsImportCustomerModalOpen(false)}
        existingCustomers={customers}
        onImportSuccess={handleImportCustomersSuccess}
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

      {/* Settings Modal (% Cashback & Rules & Navigation Position & Cloud Sync & Backup & Wipe & Guide) */}
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        settings={settings}
        onSaveSettings={handleSaveSettings}
        onForceSyncCloud={handleForceSyncCloud}
        isSyncingWithCloud={isSyncingWithCloud}
        navPosition={navPosition}
        onChangeNavPosition={handleChangeNavPosition}
        invoices={invoices}
        customers={customers}
        onBackupData={handleBackupData}
        onRestoreBackup={handleRestoreBackup}
        onWipeAllDataPermanent={handleWipeAllDataPermanent}
        onOpenGuide={() => setIsGuideModalOpen(true)}
      />

      {/* Comprehensive Step-by-Step User Guide Modal */}
      <UserGuideModal
        isOpen={isGuideModalOpen}
        onClose={() => setIsGuideModalOpen(false)}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
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

      {/* Cashback Disbursement Modal with Photo & E-Signature (Per Konsumen) */}
      {(disbursingCustomer || disbursingInvoice) && (
        <DisbursementModal
          isOpen={Boolean(disbursingCustomer || disbursingInvoice)}
          onClose={() => {
            setDisbursingCustomer(null);
            setDisbursingInvoice(null);
          }}
          customer={disbursingCustomer}
          invoice={disbursingInvoice}
          onConfirmCustomerDisbursement={handleConfirmCustomerDisbursement}
          onConfirmInvoiceDisbursement={handleConfirmDisbursement}
        />
      )}

      {/* Real-time Connectivity Indicator */}
      <OfflineIndicator />

    </SmartNavigation>
  );
}
