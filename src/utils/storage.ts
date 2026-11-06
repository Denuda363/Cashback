import { DEFAULT_SETTINGS, INITIAL_CUSTOMERS, INITIAL_INVOICES } from '../data/initialData';
import { CashbackSettings, CustomerMaster, CustomerSummary, Invoice, NavPosition } from '../types/cashback';

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
    if (!raw) {
      saveStoredCustomers(INITIAL_CUSTOMERS);
      return INITIAL_CUSTOMERS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    return INITIAL_CUSTOMERS;
  } catch (e) {
    console.error('Failed to load customers from localStorage', e);
    return INITIAL_CUSTOMERS;
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
    if (!raw) {
      saveStoredInvoices(INITIAL_INVOICES);
      return INITIAL_INVOICES;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    return INITIAL_INVOICES;
  } catch (e) {
    console.error('Failed to load invoices from localStorage', e);
    return INITIAL_INVOICES;
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

export function resetToDefaultData(): { invoices: Invoice[]; settings: CashbackSettings; customers: CustomerMaster[] } {
  saveStoredInvoices(INITIAL_INVOICES);
  saveStoredSettings(DEFAULT_SETTINGS);
  saveStoredCustomers(INITIAL_CUSTOMERS);
  return { invoices: INITIAL_INVOICES, settings: DEFAULT_SETTINGS, customers: INITIAL_CUSTOMERS };
}

/**
 * Aggregates invoices by customer to generate summaries and rankings.
 */
export function aggregateCustomerSummaries(invoices: Invoice[], minSpendForParcel = 5000000): CustomerSummary[] {
  const map = new Map<string, {
    customerName: string;
    customerPhone: string;
    totalPurchase: number;
    totalCashback: number;
    disbursedCashback: number;
    pendingCashback: number;
    readyCashback: number;
    invoiceCount: number;
    dates: string[];
    hasParcelExplicit?: boolean;
  }>();

  for (const inv of invoices) {
    const key = (inv.customerPhone?.trim() || inv.customerName.trim()).toLowerCase();
    const existing = map.get(key);

    if (existing) {
      existing.totalPurchase += inv.purchaseAmount;
      existing.totalCashback += inv.cashbackAmount;
      existing.invoiceCount += 1;
      existing.dates.push(inv.date);
      if (inv.getParcel !== undefined) {
        existing.hasParcelExplicit = existing.hasParcelExplicit || inv.getParcel;
      }

      if (inv.claimStatus === 'disbursed') {
        existing.disbursedCashback += inv.cashbackAmount;
      } else if (inv.claimStatus === 'ready') {
        existing.readyCashback += inv.cashbackAmount;
      } else {
        existing.pendingCashback += inv.cashbackAmount;
      }
    } else {
      map.set(key, {
        customerName: inv.customerName,
        customerPhone: inv.customerPhone,
        totalPurchase: inv.purchaseAmount,
        totalCashback: inv.cashbackAmount,
        disbursedCashback: inv.claimStatus === 'disbursed' ? inv.cashbackAmount : 0,
        readyCashback: inv.claimStatus === 'ready' ? inv.cashbackAmount : 0,
        pendingCashback: inv.claimStatus === 'pending' ? inv.cashbackAmount : 0,
        invoiceCount: 1,
        dates: [inv.date],
        hasParcelExplicit: inv.getParcel,
      });
    }
  }

  const result: CustomerSummary[] = Array.from(map.values()).map((c) => {
    // Sort dates desc
    c.dates.sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
    const lastDate = c.dates[0] || '';

    // Determine loyalty tier based on total cashback/spend
    let tier: 'Platinum' | 'Gold' | 'Silver' | 'Bronze' = 'Bronze';
    if (c.totalCashback >= 1000000 || c.totalPurchase >= 15000000) {
      tier = 'Platinum';
    } else if (c.totalCashback >= 500000 || c.totalPurchase >= 7500000) {
      tier = 'Gold';
    } else if (c.totalCashback >= 200000 || c.totalPurchase >= 3000000) {
      tier = 'Silver';
    }

    const getParcel = c.hasParcelExplicit !== undefined
      ? c.hasParcelExplicit
      : (c.totalPurchase >= minSpendForParcel);

    return {
      customerName: c.customerName,
      customerPhone: c.customerPhone,
      totalPurchase: c.totalPurchase,
      totalCashback: c.totalCashback,
      disbursedCashback: c.disbursedCashback,
      pendingCashback: c.pendingCashback,
      readyCashback: c.readyCashback,
      invoiceCount: c.invoiceCount,
      lastPurchaseDate: lastDate,
      tier,
      getParcel,
    };
  });

  // Sort by highest total cashback descending
  result.sort((a, b) => b.totalCashback - a.totalCashback);

  // Assign ranks
  return result.map((item, index) => ({
    ...item,
    rank: index + 1,
  }));
}
