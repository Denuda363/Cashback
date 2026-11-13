import { DEFAULT_SETTINGS } from '../data/initialData';
import { CashbackSettings, CustomerMaster, CustomerSummary, Invoice, NavPosition, CustomerBenefitType } from '../types/cashback';

const INVOICES_KEY = 'cashback_app_invoices_v2';
const SETTINGS_KEY = 'cashback_app_settings_v2';
const CUSTOMERS_KEY = 'cashback_app_customers_v1';
const NAV_POSITION_KEY = 'cashback_app_nav_position_v1';

export function loadStoredNavPosition(): NavPosition {
  try {
    const raw = localStorage.getItem(NAV_POSITION_KEY);
    if (raw === 'top' || raw === 'sidebar' || raw === 'bottom') {
      return raw;
    }
    return 'sidebar'; // Default to sidebar as requested
  } catch (e) {
    return 'sidebar';
  }
}

export function saveStoredNavPosition(pos: NavPosition): void {
  try {
    localStorage.setItem(NAV_POSITION_KEY, pos);
  } catch (e) {
    console.error('Failed to save nav position to localStorage', e);
  }
}

export function loadStoredCustomers(): CustomerMaster[] {
  try {
    const raw = localStorage.getItem(CUSTOMERS_KEY);
    if (raw === null) {
      saveStoredCustomers([]);
      return [];
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    return [];
  } catch (e) {
    console.error('Failed to load customers from localStorage', e);
    return [];
  }
}

export function saveStoredCustomers(customers: CustomerMaster[]): void {
  try {
    localStorage.setItem(CUSTOMERS_KEY, JSON.stringify(customers));
  } catch (e) {
    console.error('Failed to save customers to localStorage', e);
  }
}

export function loadStoredInvoices(): Invoice[] {
  try {
    const raw = localStorage.getItem(INVOICES_KEY);
    if (raw === null) {
      saveStoredInvoices([]);
      return [];
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    return [];
  } catch (e) {
    console.error('Failed to load invoices from localStorage', e);
    return [];
  }
}

export function saveStoredInvoices(invoices: Invoice[]): void {
  try {
    localStorage.setItem(INVOICES_KEY, JSON.stringify(invoices));
  } catch (e) {
    console.error('Failed to save invoices to localStorage', e);
  }
}

export function loadStoredSettings(): CashbackSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) {
      saveStoredSettings(DEFAULT_SETTINGS);
      return DEFAULT_SETTINGS;
    }
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch (e) {
    console.error('Failed to load settings from localStorage', e);
    return DEFAULT_SETTINGS;
  }
}

export function saveStoredSettings(settings: CashbackSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save settings to localStorage', e);
  }
}

export interface AppBackupData {
  backupVersion: string;
  exportedAt: string;
  appName: string;
  storeName: string;
  totalInvoices: number;
  totalCustomers: number;
  invoices: Invoice[];
  customers: CustomerMaster[];
  settings: CashbackSettings;
}

/**
 * Downloads a complete JSON backup file containing all invoices, customers, and settings.
 */
export function exportBackupJSON(
  invoices: Invoice[],
  customers: CustomerMaster[],
  settings: CashbackSettings
): void {
  const backup: AppBackupData = {
    backupVersion: '2.0',
    exportedAt: new Date().toISOString(),
    appName: 'CashbackPro Rekapitulasi & Master Data',
    storeName: settings.storeName || 'CashbackPro',
    totalInvoices: invoices.length,
    totalCustomers: customers.length,
    invoices,
    customers,
    settings,
  };

  const jsonStr = JSON.stringify(backup, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const safeName = (settings.storeName || 'CashbackPro')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_');
  const dateStr = new Date().toISOString().split('T')[0];

  a.href = url;
  a.download = `Backup_CashbackPro_${safeName}_${dateStr}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Parses and validates an uploaded backup JSON file.
 */
export function parseBackupJSON(fileContent: string): AppBackupData {
  const parsed = JSON.parse(fileContent);
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Format file backup tidak valid. Harus berupa file JSON.');
  }
  if (!Array.isArray(parsed.invoices) || !Array.isArray(parsed.customers)) {
    throw new Error('File cadangan tidak memiliki array data faktur atau konsumen yang valid.');
  }
  return {
    backupVersion: parsed.backupVersion || '2.0',
    exportedAt: parsed.exportedAt || new Date().toISOString(),
    appName: parsed.appName || 'CashbackPro',
    storeName: parsed.storeName || 'Toko',
    totalInvoices: parsed.invoices.length,
    totalCustomers: parsed.customers.length,
    invoices: parsed.invoices,
    customers: parsed.customers,
    settings: parsed.settings || DEFAULT_SETTINGS,
  };
}

/**
 * Wipes all invoices, customers, and resets settings in local storage.
 */
export function wipeAllLocalData(): void {
  try {
    localStorage.setItem(INVOICES_KEY, JSON.stringify([]));
    localStorage.setItem(CUSTOMERS_KEY, JSON.stringify([]));
    saveStoredSettings(DEFAULT_SETTINGS);
  } catch (e) {
    console.error('Failed to wipe local data', e);
  }
}

/**
 * Normalizes phone numbers for accurate customer matching.
 */
export function normalizePhone(phone?: string): string {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('62')) return '0' + digits.slice(2);
  return digits;
}

/**
 * Aggregates invoices by customer to generate summaries and rankings.
 * Matches against master customers when available to link customer codes and payment profiles.
 */
export function aggregateCustomerSummaries(
  invoices: Invoice[],
  minSpendForParcel = 5000000,
  masterCustomers: CustomerMaster[] = [],
  excludedCustomerNames: string[] = [],
  benefitOverrides: Record<string, CustomerBenefitType> = {}
): CustomerSummary[] {
  // Pre-index master customers by normalized phone and by clean name
  const masterByPhone = new Map<string, CustomerMaster>();
  const masterByName = new Map<string, CustomerMaster>();

  for (const mc of masterCustomers) {
    const norm = normalizePhone(mc.phone);
    if (norm.length >= 7) {
      masterByPhone.set(norm, mc);
    }
    const cleanName = mc.name.trim().toLowerCase();
    if (cleanName) {
      masterByName.set(cleanName, mc);
    }
  }

  const map = new Map<string, {
    customerCode?: string;
    customerName: string;
    customerPhone: string;
    totalPurchase: number;
    totalCashback: number;
    disbursedCashback: number;
    pendingCashback: number;
    readyCashback: number;
    invoiceCount: number;
    dates: string[];
    invoices: Invoice[];
    hasExplicitBenefit?: boolean;
    hasParcelTrue?: boolean;
    bankName?: string;
    bankAccountNumber?: string;
    bankAccountHolder?: string;
    eWalletType?: string;
    eWalletNumber?: string;
    preferredPayoutMethod?: any;
  }>();

  for (const inv of invoices) {
    const invPhone = (inv.customerPhone || '').trim();
    const rawName = (inv.customerName || '').trim();
    const cleanName = rawName.toLowerCase();
    const normPhone = normalizePhone(invPhone);

    // Grouping is based directly on the customer name from Rekap Faktur.
    // Each distinct customer (e.g. Dr Santi, Dr Sany) is kept completely separate.
    let key = '';
    if (cleanName) {
      key = `name:${cleanName}`;
    } else if (normPhone.length >= 7) {
      key = `phone:${normPhone}`;
    } else {
      key = `inv:${inv.id}`;
    }

    // Enrich with master customer profile if name matches
    const master = cleanName
      ? masterByName.get(cleanName)
      : (normPhone.length >= 7 ? masterByPhone.get(normPhone) : undefined);

    const purchase = Number(inv.purchaseAmount) || 0;
    const cashback = Math.round(Number(inv.cashbackAmount) || 0);
    const invHasExplicit = inv.benefitType !== undefined || inv.getParcel !== undefined;
    const invHasParcel =
      inv.benefitType === 'cashback_parcel' ||
      inv.benefitType === 'parcel_only' ||
      inv.getParcel === true;
    const existing = map.get(key);

    if (existing) {
      existing.totalPurchase += purchase;
      existing.totalCashback += cashback;
      existing.invoiceCount += 1;
      existing.invoices.push(inv);
      if (inv.date) existing.dates.push(inv.date);
      if (invHasExplicit) {
        existing.hasExplicitBenefit = true;
      }
      if (invHasParcel) {
        existing.hasParcelTrue = true;
      }

      if (inv.claimStatus === 'disbursed') {
        existing.disbursedCashback += cashback;
      } else if (inv.claimStatus === 'ready') {
        existing.readyCashback += cashback;
      } else {
        existing.pendingCashback += cashback;
      }

      // If existing had blank phone or less complete name, adopt better values
      if (!existing.customerPhone && invPhone) {
        existing.customerPhone = invPhone;
      }
    } else {
      map.set(key, {
        customerCode: master?.customerCode,
        customerName: rawName || master?.name || 'Tanpa Nama',
        customerPhone: invPhone || master?.phone || '',
        totalPurchase: purchase,
        totalCashback: cashback,
        disbursedCashback: inv.claimStatus === 'disbursed' ? cashback : 0,
        readyCashback: inv.claimStatus === 'ready' ? cashback : 0,
        pendingCashback: (inv.claimStatus === 'pending' || !inv.claimStatus) ? cashback : 0,
        invoiceCount: 1,
        dates: inv.date ? [inv.date] : [],
        invoices: [inv],
        hasExplicitBenefit: invHasExplicit,
        hasParcelTrue: invHasParcel,
        bankName: master?.bankName,
        bankAccountNumber: master?.bankAccountNumber,
        bankAccountHolder: master?.bankAccountHolder,
        eWalletType: master?.eWalletType,
        eWalletNumber: master?.eWalletNumber,
        preferredPayoutMethod: 'tunai',
      });
    }
  }

  const result: CustomerSummary[] = Array.from(map.values()).map((c) => {
    // Sort dates desc to pick last purchase
    c.dates.sort((a, b) => b.localeCompare(a));
    const lastDate = c.dates[0] || '-';

    // Determine loyalty tier
    let tier: 'Platinum' | 'Gold' | 'Silver' | 'Bronze' = 'Bronze';
    if (c.totalCashback >= 1000000 || c.totalPurchase >= 15000000) {
      tier = 'Platinum';
    } else if (c.totalCashback >= 500000 || c.totalPurchase >= 7500000) {
      tier = 'Gold';
    } else if (c.totalCashback >= 200000 || c.totalPurchase >= 3000000) {
      tier = 'Silver';
    }

    const cleanName = (c.customerName || '').trim().toLowerCase();
    const isExcluded = excludedCustomerNames.some(
      (ex) => (ex || '').trim().toLowerCase() === cleanName
    );

    // Check customer-specific benefit override:
    const manualBenefit = benefitOverrides[cleanName];

    let benefitType: CustomerBenefitType;
    let getParcel: boolean;

    if (manualBenefit) {
      benefitType = manualBenefit;
      getParcel = manualBenefit !== 'cashback_only';
    } else if (c.hasExplicitBenefit) {
      // Respect explicit invoice-level benefit settings (never overwrite manual cashback_only with minSpendForParcel)
      if (c.hasParcelTrue) {
        benefitType = c.totalCashback > 0 ? 'cashback_parcel' : 'parcel_only';
        getParcel = true;
      } else {
        benefitType = 'cashback_only';
        getParcel = false;
      }
    } else {
      // Legacy undefined invoices default to Cashback + Parsel upfront
      benefitType = c.totalCashback > 0 ? 'cashback_parcel' : 'parcel_only';
      getParcel = true;
    }

    // Sort itemized invoices newest to oldest
    const sortedInvoices = [...c.invoices].sort((a, b) => (b.date || '').localeCompare(a.date || ''));

    // Attach benefitType and parcel to each individual invoice while preserving explicit invoice settings
    const enrichedInvoices = sortedInvoices.map((inv) => {
      if (manualBenefit) {
        return {
          ...inv,
          benefitType: manualBenefit,
          getParcel: manualBenefit !== 'cashback_only',
        };
      }
      const invBenefit: CustomerBenefitType =
        inv.benefitType ||
        (inv.getParcel === false
          ? 'cashback_only'
          : (Number(inv.cashbackAmount) || 0) > 0
            ? 'cashback_parcel'
            : 'parcel_only');
      return {
        ...inv,
        benefitType: invBenefit,
        getParcel: invBenefit !== 'cashback_only',
      };
    });

    // Extract disbursement details if any invoice was disbursed
    const disbursedInvoices = enrichedInvoices.filter((i) => i.claimStatus === 'disbursed');
    const latestDisbursed = disbursedInvoices[0];
    const proofPhoto = disbursedInvoices.find((i) => Boolean(i.disbursementProofPhoto))?.disbursementProofPhoto;
    const signature = disbursedInvoices.find((i) => Boolean(i.disbursementSignature))?.disbursementSignature;
    const recipient = disbursedInvoices.find((i) => Boolean(i.recipientName))?.recipientName || c.customerName;
    const notes = disbursedInvoices.find((i) => Boolean(i.disbursementNotes))?.disbursementNotes;
    const payoutMethod = 'tunai';

    return {
      customerCode: c.customerCode,
      customerName: c.customerName,
      customerPhone: c.customerPhone,
      totalPurchase: Math.round(c.totalPurchase),
      totalCashback: Math.round(c.totalCashback),
      disbursedCashback: Math.round(c.disbursedCashback),
      pendingCashback: Math.round(c.pendingCashback),
      readyCashback: Math.round(c.readyCashback),
      invoiceCount: c.invoiceCount,
      lastPurchaseDate: lastDate,
      tier,
      getParcel,
      benefitType,
      bankName: c.bankName,
      bankAccountNumber: c.bankAccountNumber,
      bankAccountHolder: c.bankAccountHolder,
      eWalletType: c.eWalletType,
      eWalletNumber: c.eWalletNumber,
      preferredPayoutMethod: c.preferredPayoutMethod,
      invoices: enrichedInvoices,
      isExcludedFromCashback: isExcluded,
      lastDisbursedDate: latestDisbursed?.disbursedDate,
      lastDisbursedAt: latestDisbursed?.disbursedAt,
      recipientName: recipient,
      disbursementProofPhoto: proofPhoto,
      disbursementSignature: signature,
      disbursementNotes: notes,
      disbursementPayoutMethod: payoutMethod,
    };
  });

  // Sort by highest total cashback descending, tie-breaker totalPurchase desc
  result.sort((a, b) => {
    if (b.totalCashback !== a.totalCashback) {
      return b.totalCashback - a.totalCashback;
    }
    return b.totalPurchase - a.totalPurchase;
  });

  // Assign ranks
  return result.map((item, index) => ({
    ...item,
    rank: index + 1,
  }));
}
