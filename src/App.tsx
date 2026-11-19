import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  loadStoredInvoices, 
  saveStoredInvoices, 
  loadStoredSettings, 
  saveStoredSettings, 
  loadStoredCustomers,
  saveStoredCustomers,
  loadStoredNavPosition,
  saveStoredNavPosition,
  loadStoredAppTheme,
  saveStoredAppTheme,
  loadStoredClockStyle,
  saveStoredClockStyle,
  loadStoredActiveTab,
  saveStoredActiveTab,
  loadStoredAppRole,
  saveStoredAppRole,
  loadStoredIsSuperUser,
  saveStoredIsSuperUser,
  loadStoredCancelRequests,
  saveStoredCancelRequests,
  loadOpenDisbursementTarget,
  saveOpenDisbursementTarget,
  clearOpenDisbursementTarget,
  clearAllDisbursementDrafts,
  aggregateCustomerSummaries,
  reconcileMasterCustomersWithInvoices,
  normalizeCustomerName,
  normalizePhone,
  isValidRealPhone,
  getNextCustomerCode,
  getTodayLocalYmd,
  exportBackupJSON,
  wipeAllLocalData,
  AppBackupData
} from './utils/storage';
import { exportCashbackToExcel, exportTandaTerimaFormat } from './utils/excelExport';
import { calculateCashback, formatRupiah, getBenefitLabel } from './utils/cashbackCalculator';
import { ActiveTab, AppRole, AppTheme, ClaimStatus, ClockStyle, DisbursementCancelRequest, Invoice, CashbackSettings, CustomerMaster, CustomerSummary, NavPosition, CustomerBenefitType } from './types/cashback';
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
import { LiveClockBanner } from './components/LiveClockBanner';
import { ImportExcelModal } from './components/ImportExcelModal';
import { ImportCustomerModal } from './components/ImportCustomerModal';
import { UserGuideModal } from './components/UserGuideModal';
import { AboutModal } from './components/AboutModal';
import { OfflineIndicator } from './components/OfflineIndicator';
import { DisbursementModal, CustomerDisbursementData } from './components/DisbursementModal';
import { CashbackDisbursementRecords } from './components/CashbackDisbursementRecords';
import { AdminPinModal } from './components/AdminPinModal';
import { AdminCancelApprovalModal } from './components/CancelRequestModal';
import { CheckCircle2, FileSpreadsheet, Upload, BookOpen, Info, Lock } from 'lucide-react';
import {
  testFirestoreConnection,
  ensureFirestoreTablesExist,
  forceSyncAllToFirestore,
  subscribeFirestoreInvoices,
  subscribeFirestoreCustomers,
  subscribeFirestoreSettings,
  subscribeFirestoreCancelRequests,
  saveInvoiceToFirestore,
  deleteInvoiceFromFirestore,
  saveCustomerToFirestore,
  deleteCustomerFromFirestore,
  saveSettingsToFirestore,
  saveCancelRequestToFirestore,
  batchUpdateInvoicesInFirestore,
  batchUpdateCustomersInFirestore,
  deleteAllDataFromFirestore,
  deleteAllInvoicesFromFirestore,
  deleteAllCancelRequestsFromFirestore,
  restoreBackupToFirestore,
  FIRESTORE_DATABASE_ID,
  FIREBASE_PROJECT_ID,
} from './services/firebase';

export default function App() {
  const [invoices, setInvoices] = useState<Invoice[]>(() => loadStoredInvoices());
  const [customers, setCustomers] = useState<CustomerMaster[]>(() => loadStoredCustomers());
  const [settings, setSettings] = useState<CashbackSettings>(() => loadStoredSettings());
  const [navPosition, setNavPosition] = useState<NavPosition>(() => loadStoredNavPosition());
  const [appTheme, setAppTheme] = useState<AppTheme>(() => loadStoredAppTheme());
  const [clockStyle, setClockStyle] = useState<ClockStyle>(() => loadStoredClockStyle());
  const [activeTab, setActiveTab] = useState<ActiveTab>(() => loadStoredActiveTab());
  const [appRole, setAppRole] = useState<AppRole>(() => loadStoredAppRole());
  const [isSuperUser, setIsSuperUser] = useState<boolean>(
    () => loadStoredAppRole() === 'admin' && loadStoredIsSuperUser()
  );
  const [cancelRequests, setCancelRequests] = useState<DisbursementCancelRequest[]>(() => loadStoredCancelRequests());
  const [isAdminPinModalOpen, setIsAdminPinModalOpen] = useState(false);
  const [isCancelApprovalsModalOpen, setIsCancelApprovalsModalOpen] = useState(false);

  const effectiveIsSuperUser = appRole === 'admin' && isSuperUser;
  const isPetugasReadOnly = appRole !== 'admin';
  const effectiveActiveTab: ActiveTab =
    appRole !== 'admin' && activeTab === 'settings' ? 'payout_records' : activeTab;

  useEffect(() => {
    saveStoredActiveTab(activeTab);
  }, [activeTab]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', appTheme);
  }, [appTheme]);

  // Firebase Real-time Auto-Connection State (Direct & Automatic without login)
  const [isFirebaseConnected, setIsFirebaseConnected] = useState<boolean>(true);
  const [isSyncingWithCloud, setIsSyncingWithCloud] = useState<boolean>(false);

  // Track initial cloud load readiness & manually deleted names in this session
  const [isReadyForAutoReconcile, setIsReadyForAutoReconcile] = useState<boolean>(false);
  const suppressedCustomerNamesRef = useRef<Set<string>>(new Set());
  const isReconcilingRef = useRef<boolean>(false);

  // Firestore Real-time synchronization lifecycle
  useEffect(() => {
    let unsubInvoices = () => {};
    let unsubCustomers = () => {};
    let unsubSettings = () => {};
    let unsubCancelRequests = () => {};
    let invoicesSnapReady = false;
    let customersSnapReady = false;

    const markReadyIfBothLoaded = () => {
      if (invoicesSnapReady && customersSnapReady) {
        setIsReadyForAutoReconcile(true);
      }
    };

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
          const nextInvoices = liveInvoices || [];
          setInvoices(nextInvoices);
          saveStoredInvoices(nextInvoices);
          invoicesSnapReady = true;
          markReadyIfBothLoaded();
        });

        unsubCustomers = subscribeFirestoreCustomers((liveCustomers) => {
          const nextCustomers = liveCustomers || [];
          setCustomers(nextCustomers);
          saveStoredCustomers(nextCustomers);
          customersSnapReady = true;
          markReadyIfBothLoaded();
        });

        unsubSettings = subscribeFirestoreSettings((liveSettings) => {
          if (liveSettings) {
            setSettings(liveSettings);
            saveStoredSettings(liveSettings);
          }
        });

        unsubCancelRequests = subscribeFirestoreCancelRequests((liveRequests) => {
          setCancelRequests(liveRequests);
          saveStoredCancelRequests(liveRequests);
        });
      } else {
        setIsReadyForAutoReconcile(true);
      }
    });

    return () => {
      unsubInvoices();
      unsubCustomers();
      unsubSettings();
      unsubCancelRequests();
    };
  }, []);

  // Keep Master Konsumen automatically aligned with real invoice data & deduplicated
  useEffect(() => {
    if (!isReadyForAutoReconcile || isReconcilingRef.current) return;
    if (invoices.length === 0 && customers.length === 0) return;

    const result = reconcileMasterCustomersWithInvoices(
      customers,
      invoices,
      suppressedCustomerNamesRef.current
    );

    if (!result.hasChanges) return;

    isReconcilingRef.current = true;
    setCustomers(result.syncedCustomers);
    saveStoredCustomers(result.syncedCustomers);

    const toSave = [...result.newCustomers, ...result.updatedCustomers];
    Promise.all([
      toSave.length > 0
        ? batchUpdateCustomersInFirestore(toSave).catch((err) => console.warn('Auto-reconcile customer save:', err))
        : Promise.resolve(),
      ...result.duplicateIdsToDelete.map((id) =>
        deleteCustomerFromFirestore(id).catch((err) => console.warn('Auto-reconcile duplicate delete:', err))
      ),
    ]).finally(() => {
      isReconcilingRef.current = false;
    });
  }, [isReadyForAutoReconcile, invoices, customers]);

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
  const [isAboutModalOpen, setIsAboutModalOpen] = useState(false);
  const [disbursingInvoice, setDisbursingInvoice] = useState<Invoice | null>(null);
  const [disbursingCustomer, setDisbursingCustomer] = useState<CustomerSummary | null>(null);

  // Cross-tab filters & Global Date Range Filter
  const [customerFilterForInvoices, setCustomerFilterForInvoices] = useState<string>('');
  const [startDateFilter, setStartDateFilter] = useState<string>('');
  const [endDateFilter, setEndDateFilter] = useState<string>('');

  // Toast feedback state with clean timer cancellation
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current !== null) {
        window.clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  const showToast = (msg: string) => {
    if (toastTimerRef.current !== null) {
      window.clearTimeout(toastTimerRef.current);
    }
    setToastMessage(msg);
    toastTimerRef.current = window.setTimeout(() => {
      setToastMessage(null);
      toastTimerRef.current = null;
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
      settings.customerBenefitOverrides || {},
      settings.customerCashbackOverrides || {}
    );
  }, [
    dateFilteredInvoices,
    settings.minSpendForParcel,
    customers,
    settings.excludedCustomerNames,
    settings.customerBenefitOverrides,
    settings.customerCashbackOverrides,
  ]);

  // Helpers to open/close disbursement modal while preserving target across refresh
  const openCustomerDisbursement = (cust: CustomerSummary) => {
    setDisbursingInvoice(null);
    setDisbursingCustomer(cust);
    saveOpenDisbursementTarget({ type: 'customer', key: normalizeCustomerName(cust.customerName) });
  };

  const openInvoiceDisbursement = (inv: Invoice) => {
    setDisbursingCustomer(null);
    setDisbursingInvoice(inv);
    saveOpenDisbursementTarget({ type: 'invoice', key: inv.id });
  };

  const closeDisbursementModal = () => {
    setDisbursingCustomer(null);
    setDisbursingInvoice(null);
    clearOpenDisbursementTarget();
  };

  // Restore open disbursement modal after a page refresh if user had it open while signing
  const [hasCheckedPendingDisbursementModal, setHasCheckedPendingDisbursementModal] = useState(false);
  useEffect(() => {
    if (hasCheckedPendingDisbursementModal) return;
    const savedTarget = loadOpenDisbursementTarget();
    if (!savedTarget) {
      setHasCheckedPendingDisbursementModal(true);
      return;
    }
    if (savedTarget.type === 'customer') {
      const targetKey = normalizeCustomerName(savedTarget.key);
      const matched = customerSummaries.find(
        (c) => normalizeCustomerName(c.customerName) === targetKey
      );
      if (matched) {
        setDisbursingCustomer(matched);
        setHasCheckedPendingDisbursementModal(true);
      }
    } else if (savedTarget.type === 'invoice') {
      const matchedInv = invoices.find((i) => i.id === savedTarget.key);
      if (matchedInv) {
        setDisbursingInvoice(matchedInv);
        setHasCheckedPendingDisbursementModal(true);
      }
    }
  }, [customerSummaries, invoices, hasCheckedPendingDisbursementModal]);

  const totalCashbackSum = useMemo(() => {
    return dateFilteredInvoices.reduce((sum, inv) => sum + inv.cashbackAmount, 0);
  }, [dateFilteredInvoices]);

  const pendingCancelRequestsCount = useMemo(
    () => cancelRequests.filter((r) => r.status === 'pending').length,
    [cancelRequests]
  );

  // Role Switch Handlers
  const handleUnlockAdmin = (level: 'admin' | 'superuser') => {
    const nextSuper = level === 'superuser';
    setAppRole('admin');
    saveStoredAppRole('admin');
    setIsSuperUser(nextSuper);
    saveStoredIsSuperUser(nextSuper);
    showToast(
      nextSuper
        ? 'Mode Super User aktif — Akses penuh & waktu penginputan (tanggal & jam) dibuka.'
        : 'Mode Admin aktif — Akses penuh dibuka.'
    );
  };

  const handleSwitchToPetugas = () => {
    setAppRole('petugas');
    saveStoredAppRole('petugas');
    setIsSuperUser(false);
    saveStoredIsSuperUser(false);
    setIsSettingsModalOpen(false);
    setIsImportModalOpen(false);
    setIsImportCustomerModalOpen(false);
    setIsCustomerModalOpen(false);
    setIsInvoiceModalOpen(false);
    setIsExportModalOpen(false);
    setIsCancelApprovalsModalOpen(false);
    showToast('Beralih ke Mode Petugas (Khusus Pencairan Cashback).');
  };

  // Nav Position Handler
  const handleChangeNavPosition = (pos: NavPosition) => {
    setNavPosition(pos);
    saveStoredNavPosition(pos);
    const label = pos === 'sidebar' ? 'Samping (Sidebar)' : pos === 'top' ? 'Atas (Top Bar)' : 'Bawah (Dock Jempol)';
    showToast(`Posisi navigasi dipindahkan ke: ${label}`);
  };

  // App Theme Handler
  const handleChangeAppTheme = (theme: AppTheme) => {
    setAppTheme(theme);
    saveStoredAppTheme(theme);
    const labelMap: Record<AppTheme, string> = {
      classic: 'Klasik 3D',
      glass: 'Glass 3D Hidup',
      '3d': '3D Spasial',
      glossy: 'Glossy 3D',
      motion3d: 'Full Animasi 3D',
      neomorph: 'Neumorfik 3D',
      emerald_gold: 'Zamrud Emas 3D',
      cyber_prism: 'Prismatik 3D',
      titanium: 'Titanium Logam 3D',
      sunset_warm: 'Kuarsa Hangat 3D',
    };
    showToast(`Tema tampilan diubah ke: ${labelMap[theme]}`);
  };

  // Clock Style Handler
  const handleChangeClockStyle = (style: ClockStyle) => {
    setClockStyle(style);
    saveStoredClockStyle(style);
    const labelMap: Record<ClockStyle, string> = {
      chronograph: 'Kronograf Gelap',
      ivory_card: 'Plakat Putih',
      flip_split: 'Kartu Flip Retro',
      nixie_amber: 'Tabung Nixie Hangat',
      emerald_matrix: 'HUD Zamrud',
      ultra_typo: 'Tipografi Editorial',
    };
    showToast(`Gaya jam diubah ke: ${labelMap[style]}`);
  };

  // Import Invoices from Excel Handler (Admin Only)
  const handleImportSuccess = async (importedInvoices: Invoice[], newCustomers: CustomerMaster[]) => {
    if (appRole !== 'admin') {
      showToast('Akses ditolak: fitur ini hanya untuk Mode Admin.');
      return;
    }
    for (const inv of importedInvoices) {
      const clean = normalizeCustomerName(inv.customerName);
      if (clean) suppressedCustomerNamesRef.current.delete(clean);
    }

    const updatedInvoices = [...importedInvoices, ...invoices];
    setInvoices(updatedInvoices);
    saveStoredInvoices(updatedInvoices);
    await batchUpdateInvoicesInFirestore(updatedInvoices).catch((err) => console.warn('Firestore import sync:', err));

    // Reconcile customers with existing + newly imported ones to prevent duplicates
    const combinedRawCustomers = [...customers, ...newCustomers];
    const reconciled = reconcileMasterCustomersWithInvoices(
      combinedRawCustomers,
      updatedInvoices,
      suppressedCustomerNamesRef.current
    );
    setCustomers(reconciled.syncedCustomers);
    saveStoredCustomers(reconciled.syncedCustomers);
    const createdOrUpdated = [...reconciled.newCustomers, ...reconciled.updatedCustomers, ...newCustomers];
    if (createdOrUpdated.length > 0) {
      await batchUpdateCustomersInFirestore(reconciled.syncedCustomers).catch((err) =>
        console.warn('Firestore new cust import:', err)
      );
    }
    if (reconciled.duplicateIdsToDelete.length > 0) {
      await Promise.all(
        reconciled.duplicateIdsToDelete.map((dupId) =>
          deleteCustomerFromFirestore(dupId).catch((err) =>
            console.warn('Firestore duplicate customer delete on import:', err)
          )
        )
      );
    }

    showToast(
      `Berhasil mengimpor ${importedInvoices.length} faktur dari Excel ke Firebase Cloud & lokal! ${
        reconciled.newCustomers.length + newCustomers.length > 0 ? `(Master konsumen tersinkronisasi)` : ''
      }`
    );
  };

  // Import Master Customers from Excel Handler (Admin Only)
  const handleImportCustomersSuccess = async (importedCustomers: CustomerMaster[]) => {
    if (appRole !== 'admin') {
      showToast('Akses ditolak: fitur ini hanya untuk Mode Admin.');
      return;
    }
    const workingList = [...customers];
    const indexByName = new Map<string, number>();
    const indexByPhone = new Map<string, number>();

    workingList.forEach((c, idx) => {
      const clean = normalizeCustomerName(c.name);
      if (clean) indexByName.set(clean, idx);
      if (isValidRealPhone(c.phone)) {
        const norm = normalizePhone(c.phone);
        if (norm.length >= 7 && !indexByPhone.has(norm)) indexByPhone.set(norm, idx);
      }
    });

    let addedCount = 0;
    let updatedCount = 0;

    for (const imp of importedCustomers) {
      const cleanName = normalizeCustomerName(imp.name);
      if (cleanName) suppressedCustomerNamesRef.current.delete(cleanName);

      const normPhone = isValidRealPhone(imp.phone) ? normalizePhone(imp.phone) : '';
      const existingIdx =
        (cleanName && indexByName.has(cleanName) ? indexByName.get(cleanName) : undefined) ??
        (normPhone && indexByPhone.has(normPhone) ? indexByPhone.get(normPhone) : undefined);

      if (existingIdx !== undefined) {
        const current = workingList[existingIdx];
        workingList[existingIdx] = {
          ...current,
          phone: isValidRealPhone(imp.phone) ? imp.phone : current.phone,
          email: imp.email || current.email,
          city: imp.city || current.city,
          address: imp.address || current.address,
          notes: imp.notes || current.notes,
        };
        updatedCount += 1;
      } else {
        const uniqueCode = getNextCustomerCode(workingList);
        const newItem: CustomerMaster = {
          ...imp,
          customerCode: imp.customerCode?.trim() || uniqueCode,
        };
        const newIdx = workingList.length;
        workingList.push(newItem);
        if (cleanName) indexByName.set(cleanName, newIdx);
        if (normPhone) indexByPhone.set(normPhone, newIdx);
        addedCount += 1;
      }
    }

    setCustomers(workingList);
    saveStoredCustomers(workingList);

    // Sync imported customers in efficient batch to Firestore Cloud
    await batchUpdateCustomersInFirestore(workingList).catch((err) =>
      console.warn('Firestore customer import sync error:', err)
    );

    showToast(
      `Import selesai: ${addedCount} konsumen baru ditambahkan${updatedCount > 0 ? `, ${updatedCount} diperbarui` : ''} ke Master Data & Firebase Cloud!`
    );
  };

  // Invoice Handlers (Admin Only)
  const handleSaveInvoice = async (invoiceData: Omit<Invoice, 'id' | 'createdAt'>, invoiceId?: string) => {
    if (appRole !== 'admin') {
      showToast('Akses ditolak: perubahan data faktur hanya untuk Mode Admin.');
      return;
    }
    const cleanTargetName = normalizeCustomerName(invoiceData.customerName);
    if (cleanTargetName) {
      suppressedCustomerNamesRef.current.delete(cleanTargetName);
    }

    // Match customer strictly by normalized name first, or by real unique phone if name matches none
    const targetNormPhone = isValidRealPhone(invoiceData.customerPhone)
      ? normalizePhone(invoiceData.customerPhone)
      : '';

    const existingCust =
      customers.find((c) => normalizeCustomerName(c.name) === cleanTargetName) ||
      (targetNormPhone
        ? customers.find((c) => isValidRealPhone(c.phone) && normalizePhone(c.phone) === targetNormPhone)
        : undefined);

    if (!existingCust) {
      const nextCode = getNextCustomerCode(customers);
      const newCust: CustomerMaster = {
        id: `cust-${Date.now()}`,
        customerCode: nextCode,
        name: invoiceData.customerName.trim().replace(/\s+/g, ' '),
        phone: invoiceData.customerPhone.trim(),
        email: invoiceData.customerEmail,
        preferredPayoutMethod: invoiceData.payoutMethod,
        joinedDate: invoiceData.date,
        createdAt: new Date().toISOString(),
        isActive: true,
      };
      const updatedCustomers = [...customers, newCust];
      setCustomers(updatedCustomers);
      saveStoredCustomers(updatedCustomers);
      await saveCustomerToFirestore(newCust).catch((err) => console.warn('Firestore customer sync:', err));
    } else if (!isValidRealPhone(existingCust.phone) && isValidRealPhone(invoiceData.customerPhone)) {
      // Upgrade placeholder phone on existing master customer with real phone from invoice
      const upgradedCust: CustomerMaster = {
        ...existingCust,
        phone: invoiceData.customerPhone.trim(),
        email: existingCust.email || invoiceData.customerEmail,
      };
      const updatedCustomers = customers.map((c) => (c.id === existingCust.id ? upgradedCust : c));
      setCustomers(updatedCustomers);
      saveStoredCustomers(updatedCustomers);
      await saveCustomerToFirestore(upgradedCust).catch((err) => console.warn('Firestore customer phone upgrade:', err));
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

    // Clear conflicting customer-level benefit override if invoice's explicit benefit differs
    const cleanName = normalizeCustomerName(invoiceData.customerName);
    const existingOverride = cleanName ? settings.customerBenefitOverrides?.[cleanName] : undefined;
    if (cleanName && existingOverride && invoiceData.benefitType && existingOverride !== invoiceData.benefitType) {
      const nextOverrides = { ...(settings.customerBenefitOverrides || {}) };
      delete nextOverrides[cleanName];
      const nextSettings: CashbackSettings = { ...settings, customerBenefitOverrides: nextOverrides };
      setSettings(nextSettings);
      saveStoredSettings(nextSettings);
      await saveSettingsToFirestore(nextSettings).catch((err) => console.warn('Sync override cleanup:', err));
    }
  };

  // Manual toggle benefit package directly from Rekap Faktur (Admin Only)
  const handleUpdateInvoiceBenefit = async (invoice: Invoice, nextBenefit: CustomerBenefitType) => {
    if (appRole !== 'admin') {
      showToast('Akses ditolak: perubahan paket hanya untuk Mode Admin.');
      return;
    }
    const calc = calculateCashback(invoice.purchaseAmount, settings);
    const updatedInv: Invoice = {
      ...invoice,
      benefitType: nextBenefit,
      getParcel: nextBenefit !== 'cashback_only',
      cashbackPercentage: nextBenefit === 'parcel_only' ? 0 : calc.effectivePercentage,
      cashbackAmount: nextBenefit === 'parcel_only' ? 0 : calc.cashbackAmount,
    };

    const updated = invoices.map((inv) => (inv.id === invoice.id ? updatedInv : inv));
    setInvoices(updated);
    saveStoredInvoices(updated);
    await saveInvoiceToFirestore(updatedInv).catch((err) => console.warn('Firestore benefit update:', err));

    const cleanName = normalizeCustomerName(invoice.customerName);
    const existingOverride = cleanName ? settings.customerBenefitOverrides?.[cleanName] : undefined;
    if (cleanName && existingOverride && existingOverride !== nextBenefit) {
      const nextOverrides = { ...(settings.customerBenefitOverrides || {}) };
      delete nextOverrides[cleanName];
      const nextSettings: CashbackSettings = { ...settings, customerBenefitOverrides: nextOverrides };
      setSettings(nextSettings);
      saveStoredSettings(nextSettings);
      await saveSettingsToFirestore(nextSettings).catch((err) => console.warn('Sync override cleanup:', err));
    }

    showToast(`Paket faktur ${invoice.invoiceNumber} diubah menjadi: "${getBenefitLabel(nextBenefit)}"`);
  };

  // Bulk update benefit package across filtered/all invoices from Rekap Faktur (Admin Only)
  const handleBulkUpdateInvoiceBenefit = async (
    invoiceIds: string[],
    nextBenefit: CustomerBenefitType
  ) => {
    if (appRole !== 'admin') {
      showToast('Akses ditolak: perubahan paket massal hanya untuk Mode Admin.');
      return;
    }
    if (!invoiceIds || invoiceIds.length === 0) return;
    const idSet = new Set(invoiceIds);
    const affectedCustomerNames = new Set<string>();
    const changedInvoices: Invoice[] = [];

    const updated = invoices.map((inv) => {
      if (!idSet.has(inv.id)) return inv;
      const cleanName = normalizeCustomerName(inv.customerName);
      if (cleanName) affectedCustomerNames.add(cleanName);

      const calc = calculateCashback(inv.purchaseAmount, settings);
      const updatedInv: Invoice = {
        ...inv,
        benefitType: nextBenefit,
        getParcel: nextBenefit !== 'cashback_only',
        cashbackPercentage: nextBenefit === 'parcel_only' ? 0 : calc.effectivePercentage,
        cashbackAmount: nextBenefit === 'parcel_only' ? 0 : calc.cashbackAmount,
      };
      changedInvoices.push(updatedInv);
      return updatedInv;
    });

    if (changedInvoices.length === 0) return;

    setInvoices(updated);
    saveStoredInvoices(updated);
    await batchUpdateInvoicesInFirestore(changedInvoices).catch((err) =>
      console.warn('Firestore bulk benefit update:', err)
    );

    // Sync/clear conflicting customer-level benefit overrides for affected customers
    const currentOverrides = settings.customerBenefitOverrides || {};
    let overridesChanged = false;
    const nextOverrides = { ...currentOverrides };
    for (const cleanName of affectedCustomerNames) {
      if (nextOverrides[cleanName] && nextOverrides[cleanName] !== nextBenefit) {
        delete nextOverrides[cleanName];
        overridesChanged = true;
      }
    }
    if (overridesChanged) {
      const nextSettings: CashbackSettings = {
        ...settings,
        customerBenefitOverrides: nextOverrides,
      };
      setSettings(nextSettings);
      saveStoredSettings(nextSettings);
      await saveSettingsToFirestore(nextSettings).catch((err) =>
        console.warn('Sync bulk override cleanup:', err)
      );
    }

    showToast(
      `Paket untuk ${changedInvoices.length} faktur berhasil diatur menjadi: "${getBenefitLabel(nextBenefit)}"`
    );
  };

  const handleDeleteInvoice = async (invoiceId: string) => {
    if (appRole !== 'admin') {
      showToast('Akses ditolak: hapus faktur hanya untuk Mode Admin.');
      return;
    }
    const updated = invoices.filter((inv) => inv.id !== invoiceId);
    setInvoices(updated);
    saveStoredInvoices(updated);
    await deleteInvoiceFromFirestore(invoiceId).catch((err) => console.warn('Firestore invoice delete:', err));
    showToast('Faktur berhasil dihapus dari Firebase Cloud.');
  };

  const handleUpdateStatus = async (invoiceId: string, newStatus: ClaimStatus) => {
    if (appRole !== 'admin') {
      showToast('Akses ditolak: perubahan status faktur hanya untuk Mode Admin.');
      return;
    }
    let updatedInv: Invoice | undefined;
    const updated = invoices.map((inv) => {
      if (inv.id === invoiceId) {
        updatedInv = {
          ...inv,
          claimStatus: newStatus,
          disbursedDate: newStatus === 'disbursed' ? (inv.disbursedDate || getTodayLocalYmd()) : undefined,
          disbursedAt: newStatus === 'disbursed' ? (inv.disbursedAt || new Date().toISOString()) : undefined,
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

  // Reset entire invoice transactions collection (Admin Only)
  const handleResetAllInvoices = async () => {
    if (appRole !== 'admin') {
      showToast('Akses ditolak: reset faktur hanya untuk Mode Admin.');
      return;
    }
    setIsSyncingWithCloud(true);
    try {
      const deletedCount = await deleteAllInvoicesFromFirestore();
      await deleteAllCancelRequestsFromFirestore().catch((err) =>
        console.warn('Reset cancel requests error:', err)
      );
      saveStoredInvoices([]);
      saveStoredCancelRequests([]);
      clearOpenDisbursementTarget();
      clearAllDisbursementDrafts();
      setInvoices([]);
      setCancelRequests([]);
      setDisbursingCustomer(null);
      setDisbursingInvoice(null);
      setReceiptInvoice(null);
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
      disbursedBy?: string;
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
      disbursedBy: data.disbursedBy,
      disbursementProofPhoto: data.disbursementProofPhoto,
      disbursementSignature: data.disbursementSignature,
      disbursementNotes: data.disbursementNotes,
    };
    const updated = invoices.map((item) => (item.id === invoiceId ? updatedInv : item));
    setInvoices(updated);
    saveStoredInvoices(updated);
    await saveInvoiceToFirestore(updatedInv).catch((err) => console.warn('Firestore disbursement update:', err));
    showToast(`Penerimaan cashback faktur ${inv.invoiceNumber} (${inv.customerName}) tersimpan ke Cloud!`);
  };

  // Confirm cashback disbursement per customer (mencairkan faktur konsumen yang belum cair dalam cakupan aktif)
  const handleConfirmCustomerDisbursement = async (
    customerName: string,
    data: CustomerDisbursementData
  ) => {
    setIsSyncingWithCloud(true);
    try {
      const clean = normalizeCustomerName(customerName);
      const scopedIdSet =
        disbursingCustomer &&
        normalizeCustomerName(disbursingCustomer.customerName) === clean &&
        disbursingCustomer.invoices &&
        disbursingCustomer.invoices.length > 0
          ? new Set(disbursingCustomer.invoices.map((i) => i.id))
          : null;

      const isTargetInvoice = (inv: Invoice) => {
        if (normalizeCustomerName(inv.customerName) !== clean) return false;
        if (scopedIdSet && !scopedIdSet.has(inv.id)) return false;
        return true;
      };

      const targetInvoices = invoices.filter(isTargetInvoice);
      const hasUndisbursedInScope = targetInvoices.some((inv) => inv.claimStatus !== 'disbursed');

      const changedInvoices: Invoice[] = [];
      let mediaAttached = false;

      // Only transition pending/ready invoices when partial undisbursed invoices exist,
      // preserving historical disbursedDate/photo/officer on earlier completed invoices.
      const updatedInvoices = invoices.map((inv) => {
        if (!isTargetInvoice(inv)) return inv;
        if (hasUndisbursedInScope && inv.claimStatus === 'disbursed') {
          return inv;
        }
        const updatedInv: Invoice = {
          ...inv,
          claimStatus: 'disbursed' as const,
          disbursedDate: data.disbursedDate,
          disbursedAt: data.disbursedAt,
          payoutMethod: data.payoutMethod,
          recipientName: data.recipientName,
          disbursedBy: data.disbursedBy,
          disbursementProofPhoto: !mediaAttached ? data.disbursementProofPhoto : undefined,
          disbursementSignature: data.disbursementSignature,
          disbursementNotes: data.disbursementNotes,
        };
        mediaAttached = true;
        changedInvoices.push(updatedInv);
        return updatedInv;
      });

      setInvoices(updatedInvoices);
      saveStoredInvoices(updatedInvoices);
      if (changedInvoices.length > 0) {
        await batchUpdateInvoicesInFirestore(changedInvoices);
      }
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
      const clean = normalizeCustomerName(customerName);
      const changedInvoices: Invoice[] = [];
      const updatedInvoices = invoices.map((inv) => {
        if (normalizeCustomerName(inv.customerName) === clean && inv.claimStatus === 'disbursed') {
          const revertedInv: Invoice = {
            ...inv,
            claimStatus: 'ready' as const,
            disbursedDate: undefined,
            disbursedAt: undefined,
            disbursedBy: undefined,
            disbursementProofPhoto: undefined,
            disbursementSignature: undefined,
            disbursementNotes: undefined,
          };
          changedInvoices.push(revertedInv);
          return revertedInv;
        }
        return inv;
      });

      setInvoices(updatedInvoices);
      saveStoredInvoices(updatedInvoices);
      if (changedInvoices.length > 0) {
        await batchUpdateInvoicesInFirestore(changedInvoices);
      }

      // Clean up any active pending/approved cancel requests for this customer as executed
      const cleanTarget = normalizeCustomerName(customerName);
      const nowIso = new Date().toISOString();
      const touchedRequests: DisbursementCancelRequest[] = [];
      const nextRequests = cancelRequests.map((req) => {
        if (
          (req.status === 'pending' || req.status === 'approved') &&
          normalizeCustomerName(req.customerName) === cleanTarget
        ) {
          const closedReq: DisbursementCancelRequest = {
            ...req,
            status: 'executed',
            reviewedAt: req.reviewedAt || nowIso,
            reviewedBy: req.reviewedBy || 'Admin',
            executedAt: nowIso,
          };
          touchedRequests.push(closedReq);
          return closedReq;
        }
        return req;
      });
      if (touchedRequests.length > 0) {
        setCancelRequests(nextRequests);
        saveStoredCancelRequests(nextRequests);
        await Promise.all(
          touchedRequests.map((req) =>
            saveCancelRequestToFirestore(req).catch((err) => console.warn('Sync closed cancel req:', err))
          )
        );
      }

      showToast(`Status pencairan untuk ${customerName} berhasil dibatalkan.`);
    } catch (err: any) {
      showToast('Gagal membatalkan pencairan: ' + (err?.message || 'Error'));
    } finally {
      setIsSyncingWithCloud(false);
    }
  };

  // Petugas: Submit cancellation request to Admin
  const handleRequestCancelDisbursement = async (
    customer: CustomerSummary,
    requestedBy: string,
    reason: string
  ) => {
    const newRequest: DisbursementCancelRequest = {
      id: `cancel-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      customerName: customer.customerName,
      customerCode: customer.customerCode,
      amount: customer.disbursedCashback,
      reason,
      requestedBy,
      requestedAt: new Date().toISOString(),
      status: 'pending',
    };

    const updatedRequests = [newRequest, ...cancelRequests];
    setCancelRequests(updatedRequests);
    saveStoredCancelRequests(updatedRequests);
    await saveCancelRequestToFirestore(newRequest);
    showToast(`Pengajuan pembatalan untuk ${customer.customerName} dikirim ke Admin untuk ACC.`);
  };

  // Admin: Approve cancellation request
  const handleApproveCancelRequest = async (requestId: string) => {
    if (appRole !== 'admin') return;
    let targetReq: DisbursementCancelRequest | undefined;
    const nextRequests = cancelRequests.map((req) => {
      if (req.id === requestId) {
        targetReq = {
          ...req,
          status: 'approved',
          reviewedAt: new Date().toISOString(),
          reviewedBy: 'Admin',
        };
        return targetReq;
      }
      return req;
    });
    setCancelRequests(nextRequests);
    saveStoredCancelRequests(nextRequests);
    if (targetReq) {
      await saveCancelRequestToFirestore(targetReq);
      showToast(`Pengajuan batal pencairan ${targetReq.customerName} telah di-ACC. Petugas kini dapat membatalkan.`);
    }
  };

  // Admin: Reject cancellation request
  const handleRejectCancelRequest = async (requestId: string) => {
    if (appRole !== 'admin') return;
    let targetReq: DisbursementCancelRequest | undefined;
    const nextRequests = cancelRequests.map((req) => {
      if (req.id === requestId) {
        targetReq = {
          ...req,
          status: 'rejected',
          reviewedAt: new Date().toISOString(),
          reviewedBy: 'Admin',
        };
        return targetReq;
      }
      return req;
    });
    setCancelRequests(nextRequests);
    saveStoredCancelRequests(nextRequests);
    if (targetReq) {
      await saveCancelRequestToFirestore(targetReq);
      showToast(`Pengajuan batal pencairan ${targetReq.customerName} ditolak.`);
    }
  };

  // Petugas: Execute disbursement cancellation after Admin ACC
  const handleExecuteApprovedCancel = async (customerName: string, requestId: string) => {
    const targetReq = cancelRequests.find((r) => r.id === requestId);
    if (!targetReq || targetReq.status !== 'approved') {
      showToast('Pembatalan membutuhkan ACC Admin terlebih dahulu.');
      return;
    }
    await handleRevertCustomerDisbursement(customerName);
  };

  // Toggle disqualify/exclude customer from receiving cashback (Admin Only)
  const handleToggleExcludeCustomer = async (customerName: string) => {
    if (appRole !== 'admin') {
      showToast('Akses ditolak: pencoretan konsumen hanya untuk Mode Admin.');
      return;
    }
    const clean = normalizeCustomerName(customerName);
    const currentList = settings.excludedCustomerNames || [];
    const exists = currentList.some((n) => normalizeCustomerName(n) === clean);
    const nextList = exists
      ? currentList.filter((n) => normalizeCustomerName(n) !== clean)
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

  // Set customer benefit package (Admin Only)
  const handleSetCustomerBenefit = async (customerName: string, benefitType: CustomerBenefitType) => {
    if (appRole !== 'admin') {
      showToast('Akses ditolak: pengaturan paket konsumen hanya untuk Mode Admin.');
      return;
    }
    const clean = normalizeCustomerName(customerName);
    if (!clean) return;
    const currentOverrides = { ...(settings.customerBenefitOverrides || {}) };
    currentOverrides[clean] = benefitType;
    const nextSettings: CashbackSettings = { ...settings, customerBenefitOverrides: currentOverrides };
    setSettings(nextSettings);
    saveStoredSettings(nextSettings);
    await saveSettingsToFirestore(nextSettings).catch((err) => console.warn('Sync benefit settings:', err));
    showToast(`Paket untuk ${customerName} berhasil diatur ke: "${getBenefitLabel(benefitType)}"`);
  };

  // Set or reset manual / rounded total cashback per customer (Admin Only)
  const handleSetCustomerCashback = async (customerName: string, manualAmount: number | null) => {
    if (appRole !== 'admin') {
      showToast('Akses ditolak: edit manual total cashback hanya untuk Mode Admin.');
      return;
    }
    const clean = normalizeCustomerName(customerName);
    if (!clean) return;
    const currentOverrides = { ...(settings.customerCashbackOverrides || {}) };
    if (manualAmount === null) {
      delete currentOverrides[clean];
    } else {
      const safeVal = Math.max(0, Math.round(Number(manualAmount) || 0));
      currentOverrides[clean] = safeVal;
    }
    const nextSettings: CashbackSettings = {
      ...settings,
      customerCashbackOverrides: currentOverrides,
    };
    setSettings(nextSettings);
    saveStoredSettings(nextSettings);
    await saveSettingsToFirestore(nextSettings).catch((err) =>
      console.warn('Sync manual cashback override settings:', err)
    );
    showToast(
      manualAmount === null
        ? `Total cashback ${customerName} dikembalikan ke hitungan otomatis faktur.`
        : `Total cashback ${customerName} diperbarui manual menjadi ${formatRupiah(Math.max(0, Math.round(Number(manualAmount) || 0)))}.`
    );
  };

  // Master Customer Handlers (Admin Only)
  const handleSaveCustomer = async (customerData: Omit<CustomerMaster, 'id'>, customerId?: string) => {
    if (appRole !== 'admin') {
      showToast('Akses ditolak: perubahan Master Konsumen hanya untuk Mode Admin.');
      return;
    }
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
        createdAt: customerData.createdAt || new Date().toISOString(),
      };
      const updated = [newCust, ...customers];
      setCustomers(updated);
      saveStoredCustomers(updated);
      await saveCustomerToFirestore(newCust).catch((err) => console.warn('Firestore customer add:', err));
      showToast(`Konsumen ${newCust.name} (${newCust.customerCode}) tersimpan ke Firebase Cloud.`);
    }
  };

  const handleDeleteCustomer = async (customerId: string) => {
    if (appRole !== 'admin') {
      showToast('Akses ditolak: hapus Master Konsumen hanya untuk Mode Admin.');
      return;
    }
    const target = customers.find((c) => c.id === customerId);
    if (target?.name) {
      const clean = normalizeCustomerName(target.name);
      if (clean) suppressedCustomerNamesRef.current.add(clean);
    }
    const updated = customers.filter((c) => c.id !== customerId);
    setCustomers(updated);
    saveStoredCustomers(updated);
    await deleteCustomerFromFirestore(customerId).catch((err) => console.warn('Firestore customer delete:', err));
    showToast(`Konsumen ${target?.name || ''} berhasil dihapus dari Firebase Cloud.`);
  };

  // Manual full reconciliation between Master Konsumen & real Rekap Faktur (Admin Only)
  const handleSyncMasterWithInvoices = async () => {
    if (appRole !== 'admin') {
      showToast('Akses ditolak: sinkronisasi Master Konsumen hanya untuk Mode Admin.');
      return;
    }
    suppressedCustomerNamesRef.current.clear();
    const result = reconcileMasterCustomersWithInvoices(customers, invoices);
    if (!result.hasChanges) {
      showToast('Master Konsumen sudah 100% sinkron dengan data real Rekap Faktur.');
      return;
    }

    setIsSyncingWithCloud(true);
    try {
      setCustomers(result.syncedCustomers);
      saveStoredCustomers(result.syncedCustomers);

      const toSave = [...result.newCustomers, ...result.updatedCustomers];
      if (toSave.length > 0) {
        await batchUpdateCustomersInFirestore(toSave);
      }
      for (const dupId of result.duplicateIdsToDelete) {
        await deleteCustomerFromFirestore(dupId);
      }

      const parts: string[] = [];
      if (result.newCustomers.length > 0) parts.push(`${result.newCustomers.length} konsumen ditambahkan dari faktur`);
      if (result.updatedCustomers.length > 0) parts.push(`${result.updatedCustomers.length} profil kontak/tanggal dilengkapi`);
      if (result.duplicateIdsToDelete.length > 0) parts.push(`${result.duplicateIdsToDelete.length} duplikat dirapikan`);
      showToast(`Sinkronisasi selesai: ${parts.join(', ')}.`);
    } catch (err: any) {
      console.error('Manual master sync error:', err);
      showToast('Gagal sinkronisasi master konsumen ke cloud: ' + (err?.message || 'Error'));
    } finally {
      setIsSyncingWithCloud(false);
    }
  };

  const handleToggleCustomerStatus = async (customerId: string) => {
    if (appRole !== 'admin') {
      showToast('Akses ditolak: perubahan status konsumen hanya untuk Mode Admin.');
      return;
    }
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
    if (appRole !== 'admin') return;
    const newCust: CustomerMaster = {
      ...newCustData,
      id: `cust-${Date.now()}`,
      createdAt: newCustData.createdAt || new Date().toISOString(),
    };
    const updated = [...customers, newCust];
    setCustomers(updated);
    saveStoredCustomers(updated);
    await saveCustomerToFirestore(newCust).catch((err) => console.warn('Firestore quick add:', err));
    showToast(`Konsumen ${newCust.name} (${newCust.customerCode}) didaftarkan ke Firebase Cloud.`);
  };

  // Settings Handlers (Admin Only)
  const handleSaveSettings = (newSettings: CashbackSettings) => {
    if (appRole !== 'admin') {
      showToast('Akses ditolak: Pengaturan hanya dapat diubah pada Mode Admin.');
      return;
    }
    setSettings(newSettings);
    saveStoredSettings(newSettings);
    saveSettingsToFirestore(newSettings).catch((err) => console.warn('Firestore settings save:', err));

    // Dynamic Recalculation: Jika diatur 2% semua jadi 2%, jika 3% semua jadi 3%, tetap pertahankan pilihan manual paket!
    const updatedInvoices = invoices.map((inv) => {
      const resolvedBenefit: CustomerBenefitType =
        inv.benefitType ||
        (inv.getParcel === false
          ? 'cashback_only'
          : inv.cashbackAmount > 0
            ? 'cashback_parcel'
            : 'parcel_only');
      const calc = calculateCashback(inv.purchaseAmount, newSettings);
      return {
        ...inv,
        benefitType: resolvedBenefit,
        getParcel: resolvedBenefit !== 'cashback_only',
        cashbackPercentage: resolvedBenefit === 'parcel_only' ? 0 : calc.effectivePercentage,
        cashbackAmount: resolvedBenefit === 'parcel_only' ? 0 : calc.cashbackAmount,
      };
    });

    setInvoices(updatedInvoices);
    saveStoredInvoices(updatedInvoices);
    batchUpdateInvoicesInFirestore(updatedInvoices).catch((err) => console.warn('Firestore batch recalc:', err));

    showToast(
      newSettings.mode === 'tiered'
        ? `Pengaturan disimpan ke cloud! Mode Cashback Bertingkat (Tiered) aktif. Semua ${updatedInvoices.length} faktur otomatis sinkron!`
        : `Pengaturan disimpan ke cloud! Persentase cashback diatur ke ${newSettings.flatPercentage}%. Semua ${updatedInvoices.length} faktur otomatis sinkron!`
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
      // 1. Delete all invoices, customers, and cancel requests from Cloud Firestore
      const wipeResult = await deleteAllDataFromFirestore();

      // 2. Clear local storage (preserving company settings)
      wipeAllLocalData();

      // 3. Clear local React & modal states
      suppressedCustomerNamesRef.current.clear();
      setInvoices([]);
      setCustomers([]);
      setCancelRequests([]);
      setDisbursingCustomer(null);
      setDisbursingInvoice(null);
      setReceiptInvoice(null);

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
    if (appRole !== 'admin') return;
    setIsExportModalOpen(true);
  };

  // Cross-navigation
  const handleSelectCustomerForInvoices = (customerName: string) => {
    setCustomerFilterForInvoices(customerName);
    setActiveTab('invoices');
  };

  return (
    <>
    <SmartNavigation
      activeTab={effectiveActiveTab}
      setActiveTab={(tab) => {
        if (tab === 'settings') {
          if (appRole === 'admin') {
            setIsSettingsModalOpen(true);
          } else {
            showToast('Halaman Pengaturan hanya dapat diakses pada Mode Admin.');
          }
          return;
        }
        setActiveTab(tab);
      }}
      navPosition={navPosition}
      onChangeNavPosition={handleChangeNavPosition}
      appTheme={appTheme}
      onExportExcel={handleExportExcel}
      onOpenImportExcel={() => appRole === 'admin' && setIsImportModalOpen(true)}
      onOpenAbout={() => setIsAboutModalOpen(true)}
      totalInvoicesCount={invoices.length}
      totalMasterCustomersCount={customers.length}
      totalCashbackSum={totalCashbackSum}
      storeName={settings.companyProfile?.companyName || settings.storeName}
      companyLogoUrl={settings.companyProfile?.logoUrl}
      isFirebaseConnected={isFirebaseConnected}
      appRole={appRole}
      isSuperUser={effectiveIsSuperUser}
      onOpenAdminPinModal={() => setIsAdminPinModalOpen(true)}
      onSwitchToPetugas={handleSwitchToPetugas}
      pendingCancelCount={pendingCancelRequestsCount}
      onOpenCancelApprovals={() => setIsCancelApprovalsModalOpen(true)}
    >
      {/* Main Viewport Container */}
      <main className={`flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-3.5 sm:py-6 ${receiptInvoice ? 'print:hidden' : ''}`}>
        {/* Live Chronometer, Day & Full Date Banner */}
        <LiveClockBanner
          clockStyle={clockStyle}
          isTodayFilterActive={(() => {
            const today = getTodayLocalYmd();
            return startDateFilter === today && endDateFilter === today;
          })()}
          onToggleTodayFilter={() => {
            const today = getTodayLocalYmd();
            if (startDateFilter === today && endDateFilter === today) {
              setStartDateFilter('');
              setEndDateFilter('');
              showToast('Menampilkan seluruh periode tanggal transaksi.');
            } else {
              setStartDateFilter(today);
              setEndDateFilter(today);
              showToast('Menyaring data transaksi khusus hari ini.');
            }
          }}
        />

        {/* Global Date Range Filter Bar */}
        <div className="print:hidden">
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
        </div>

        {/* Toast alert */}
        {toastMessage && (
          <div className="mb-4 p-3 rounded-lg bg-slate-900 text-white text-xs font-medium flex items-center justify-between shadow-md transition-all animate-in fade-in print:hidden">
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

        {/* Tab 1: Dashboard Analytics (Admin Full / Petugas Read-Only) */}
        {effectiveActiveTab === 'dashboard' && (
          <DashboardAnalytics
            invoices={dateFilteredInvoices}
            settings={settings}
            customerSummaries={customerSummaries}
            isReadOnly={isPetugasReadOnly}
            onNavigateToTab={(tab) => {
              if (tab === 'settings') {
                if (appRole === 'admin') {
                  setIsSettingsModalOpen(true);
                } else {
                  showToast('Halaman Pengaturan hanya dapat diakses pada Mode Admin.');
                }
              } else {
                setActiveTab(tab);
              }
            }}
          />
        )}

        {/* Tab 2: Top 10 Leaderboard (Admin Full / Petugas Read-Only) */}
        {effectiveActiveTab === 'top10' && (
          <Top10Leaderboard
            customerSummaries={customerSummaries}
            invoices={dateFilteredInvoices}
            masterCustomers={customers}
            excludedCustomerNames={settings.excludedCustomerNames || []}
            benefitOverrides={settings.customerBenefitOverrides || {}}
            minSpendForParcel={settings.minSpendForParcel || 5000000}
            onSelectCustomer={handleSelectCustomerForInvoices}
            onExportExcel={appRole === 'admin' ? handleExportExcel : undefined}
            isReadOnly={isPetugasReadOnly}
          />
        )}

        {/* Tab 3: Rekap Faktur List (Admin Full / Petugas Read-Only) */}
        {effectiveActiveTab === 'invoices' && (
          <InvoiceList
            invoices={dateFilteredInvoices}
            isReadOnly={isPetugasReadOnly}
            isSuperUser={effectiveIsSuperUser}
            onOpenNewInvoice={
              appRole === 'admin'
                ? () => {
                    setEditingInvoice(null);
                    setIsInvoiceModalOpen(true);
                  }
                : undefined
            }
            onEditInvoice={
              appRole === 'admin'
                ? (inv) => {
                    setEditingInvoice(inv);
                    setIsInvoiceModalOpen(true);
                  }
                : undefined
            }
            onDeleteInvoice={appRole === 'admin' ? handleDeleteInvoice : undefined}
            onViewReceipt={(inv) => setReceiptInvoice(inv)}
            onUpdateStatus={appRole === 'admin' ? handleUpdateStatus : undefined}
            onUpdateInvoiceBenefit={appRole === 'admin' ? handleUpdateInvoiceBenefit : undefined}
            onBulkUpdateInvoiceBenefit={appRole === 'admin' ? handleBulkUpdateInvoiceBenefit : undefined}
            onExportExcel={appRole === 'admin' ? handleExportExcel : undefined}
            onOpenImportExcel={appRole === 'admin' ? () => setIsImportModalOpen(true) : undefined}
            onResetAllInvoices={appRole === 'admin' ? handleResetAllInvoices : undefined}
            onOpenDisbursementModal={
              appRole === 'admin'
                ? (inv) => {
                    const matchedCust = customerSummaries.find(
                      (c) => normalizeCustomerName(c.customerName) === normalizeCustomerName(inv.customerName)
                    );
                    if (matchedCust) {
                      openCustomerDisbursement(matchedCust);
                    } else {
                      openInvoiceDisbursement(inv);
                    }
                  }
                : undefined
            }
            initialCustomerFilter={customerFilterForInvoices}
            onClearCustomerFilter={() => setCustomerFilterForInvoices('')}
          />
        )}

        {/* Tab 3.5: Rekap Penerimaan Cashback (Admin & Mode Petugas Interaktif Pencairan) */}
        {effectiveActiveTab === 'payout_records' && (
          <CashbackDisbursementRecords
            customerSummaries={customerSummaries}
            invoices={dateFilteredInvoices}
            onOpenCustomerDisbursement={openCustomerDisbursement}
            onRevertCustomerDisbursement={appRole === 'admin' ? handleRevertCustomerDisbursement : undefined}
            onSelectCustomerForInvoices={handleSelectCustomerForInvoices}
            onExportExcel={handleExportExcel}
            companyProfile={settings.companyProfile}
            storeName={settings.companyProfile?.companyName || settings.storeName}
            appRole={appRole}
            isSuperUser={effectiveIsSuperUser}
            cancelRequests={cancelRequests}
            onRequestCancelDisbursement={handleRequestCancelDisbursement}
            onExecuteApprovedCancel={handleExecuteApprovedCancel}
            onOpenCancelApprovals={() => setIsCancelApprovalsModalOpen(true)}
          />
        )}

        {/* Tab 4: Rekap Konsumen Aggregated (Admin Full / Petugas Read-Only) */}
        {effectiveActiveTab === 'customers' && (
          <CustomerSummaryView
            invoices={dateFilteredInvoices}
            customerSummaries={customerSummaries}
            excludedCustomerNames={settings.excludedCustomerNames || []}
            benefitOverrides={settings.customerBenefitOverrides || {}}
            cashbackOverrides={settings.customerCashbackOverrides || {}}
            isReadOnly={isPetugasReadOnly}
            isSuperUser={effectiveIsSuperUser}
            onSetCustomerBenefit={appRole === 'admin' ? handleSetCustomerBenefit : undefined}
            onSetCustomerCashback={appRole === 'admin' ? handleSetCustomerCashback : undefined}
            onToggleExcludeCustomer={appRole === 'admin' ? handleToggleExcludeCustomer : undefined}
            onOpenCustomerDisbursement={appRole === 'admin' ? openCustomerDisbursement : undefined}
            onSelectCustomerForInvoices={handleSelectCustomerForInvoices}
            onExportExcel={appRole === 'admin' ? handleExportExcel : undefined}
            companyProfile={settings.companyProfile}
            storeName={settings.companyProfile?.companyName || settings.storeName}
          />
        )}

        {/* Tab 5: Master Data Konsumen (Admin Full / Petugas Read-Only) */}
        {effectiveActiveTab === 'master_customers' && (
          <MasterCustomerList
            customers={customers}
            invoices={dateFilteredInvoices}
            customerSummaries={customerSummaries}
            isReadOnly={isPetugasReadOnly}
            isSuperUser={effectiveIsSuperUser}
            onOpenNewCustomer={
              appRole === 'admin'
                ? () => {
                    setEditingCustomer(null);
                    setIsCustomerModalOpen(true);
                  }
                : undefined
            }
            onEditCustomer={
              appRole === 'admin'
                ? (cust) => {
                    setEditingCustomer(cust);
                    setIsCustomerModalOpen(true);
                  }
                : undefined
            }
            onDeleteCustomer={appRole === 'admin' ? handleDeleteCustomer : undefined}
            onToggleStatus={appRole === 'admin' ? handleToggleCustomerStatus : undefined}
            onSelectCustomerForInvoices={handleSelectCustomerForInvoices}
            onExportExcel={appRole === 'admin' ? handleExportExcel : undefined}
            onOpenImportExcel={appRole === 'admin' ? () => setIsImportCustomerModalOpen(true) : undefined}
            onSyncWithInvoices={appRole === 'admin' ? handleSyncMasterWithInvoices : undefined}
          />
        )}

      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500 print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-2 gap-y-1">
            <span className="font-semibold text-slate-800">{settings.storeName}</span>
            <span aria-hidden="true">&middot;</span>
            <span>Hak Cipta &copy; 2026 Denuda</span>
            <span aria-hidden="true">&middot;</span>
            <span>Developer: <strong className="text-slate-700">Denuda</strong></span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 text-[11px]">
            <button
              onClick={() => setActiveTab('master_customers')}
              className="hover:text-slate-900"
            >
              Master Data ({customers.length} Konsumen)
            </button>
            <span aria-hidden="true">&middot;</span>
            {appRole === 'admin' ? (
              <>
                <button
                  onClick={() => setIsSettingsModalOpen(true)}
                  className="hover:text-slate-900"
                >
                  Pengaturan Aturan ({settings.mode === 'flat' ? `${settings.flatPercentage}% Flat` : 'Tiered'})
                </button>
                <span aria-hidden="true">&middot;</span>
                <button
                  onClick={() => setIsImportModalOpen(true)}
                  className="text-emerald-700 hover:text-emerald-800 font-semibold flex items-center gap-1"
                >
                  <Upload className="w-3.5 h-3.5" /> Import Excel
                </button>
                <span aria-hidden="true">&middot;</span>
                <button
                  onClick={handleExportExcel}
                  className="text-emerald-700 hover:text-emerald-800 font-semibold flex items-center gap-1"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" /> Unduh Format Excel
                </button>
                <span aria-hidden="true">&middot;</span>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setIsAdminPinModalOpen(true)}
                  className="text-slate-700 hover:text-slate-900 font-semibold flex items-center gap-1 bg-slate-100 hover:bg-slate-200 px-2 py-0.5 rounded-md transition-colors"
                >
                  <Lock className="w-3 h-3 text-amber-600" /> Masuk Mode Admin
                </button>
                <span aria-hidden="true">&middot;</span>
              </>
            )}
            <button
              onClick={() => setIsGuideModalOpen(true)}
              className="text-slate-800 hover:text-emerald-700 font-bold flex items-center gap-1 bg-slate-100 hover:bg-emerald-50 px-2 py-0.5 rounded-md transition-colors"
            >
              <BookOpen className="w-3.5 h-3.5 text-emerald-600" /> Buku Panduan
            </button>
            <span aria-hidden="true">&middot;</span>
            <button
              onClick={() => setIsAboutModalOpen(true)}
              className="text-slate-800 hover:text-emerald-700 font-bold flex items-center gap-1 bg-slate-100 hover:bg-emerald-50 px-2 py-0.5 rounded-md transition-colors"
            >
              <Info className="w-3.5 h-3.5 text-emerald-600" /> Tentang Aplikasi
            </button>
          </div>
        </div>
      </footer>
    </SmartNavigation>

      {/* Admin-Only Modals */}
      {appRole === 'admin' && (
        <>
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

          <ImportExcelModal
            isOpen={isImportModalOpen}
            onClose={() => setIsImportModalOpen(false)}
            settings={settings}
            masterCustomers={customers}
            onImportSuccess={handleImportSuccess}
          />

          <ImportCustomerModal
            isOpen={isImportCustomerModalOpen}
            onClose={() => setIsImportCustomerModalOpen(false)}
            existingCustomers={customers}
            onImportSuccess={handleImportCustomersSuccess}
          />

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

          <SettingsModal
            isOpen={isSettingsModalOpen}
            onClose={() => setIsSettingsModalOpen(false)}
            settings={settings}
            onSaveSettings={handleSaveSettings}
            onForceSyncCloud={handleForceSyncCloud}
            isSyncingWithCloud={isSyncingWithCloud}
            navPosition={navPosition}
            onChangeNavPosition={handleChangeNavPosition}
            appTheme={appTheme}
            onChangeAppTheme={handleChangeAppTheme}
            clockStyle={clockStyle}
            onChangeClockStyle={handleChangeClockStyle}
            invoices={invoices}
            customers={customers}
            onBackupData={handleBackupData}
            onRestoreBackup={handleRestoreBackup}
            onWipeAllDataPermanent={handleWipeAllDataPermanent}
            onOpenGuide={() => setIsGuideModalOpen(true)}
          />

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

          <AdminCancelApprovalModal
            isOpen={isCancelApprovalsModalOpen}
            onClose={() => setIsCancelApprovalsModalOpen(false)}
            cancelRequests={cancelRequests}
            onApproveRequest={handleApproveCancelRequest}
            onRejectRequest={handleRejectCancelRequest}
          />
        </>
      )}

      {/* Admin PIN Unlock Modal */}
      <AdminPinModal
        isOpen={isAdminPinModalOpen}
        onClose={() => setIsAdminPinModalOpen(false)}
        configuredAdminPin={settings.adminPin}
        onSuccessUnlock={handleUnlockAdmin}
      />

      {/* Comprehensive Step-by-Step User Guide Modal */}
      <UserGuideModal
        isOpen={isGuideModalOpen}
        onClose={() => setIsGuideModalOpen(false)}
        appRole={appRole}
        onOpenSettings={() => {
          if (appRole === 'admin') {
            setIsSettingsModalOpen(true);
          } else {
            setIsAdminPinModalOpen(true);
          }
        }}
      />

      {/* About Application & Copyright Modal */}
      <AboutModal
        isOpen={isAboutModalOpen}
        onClose={() => setIsAboutModalOpen(false)}
        storeName={settings.storeName}
      />

      {/* Digital Receipt Modal */}
      <ReceiptModal
        invoice={receiptInvoice}
        onClose={() => setReceiptInvoice(null)}
        settings={settings}
        isSuperUser={effectiveIsSuperUser}
        onMarkDisbursed={appRole === 'admin' ? (id) => handleUpdateStatus(id, 'disbursed') : undefined}
      />

      {/* Cashback Disbursement Modal with Photo & E-Signature (Per Konsumen) */}
      {(disbursingCustomer || disbursingInvoice) && (
        <DisbursementModal
          isOpen={Boolean(disbursingCustomer || disbursingInvoice)}
          onClose={closeDisbursementModal}
          customer={disbursingCustomer}
          invoice={disbursingInvoice}
          onConfirmCustomerDisbursement={handleConfirmCustomerDisbursement}
          onConfirmInvoiceDisbursement={handleConfirmDisbursement}
        />
      )}

      {/* Real-time Connectivity Indicator */}
      <OfflineIndicator />
    </>
  );
}
