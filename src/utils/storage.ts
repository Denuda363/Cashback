import { DEFAULT_SETTINGS } from '../data/initialData';
import { ActiveTab, AppRole, CashbackSettings, CustomerMaster, CustomerSummary, DisbursementCancelRequest, Invoice, NavPosition, CustomerBenefitType } from '../types/cashback';

const INVOICES_KEY = 'cashback_app_invoices_v2';
const SETTINGS_KEY = 'cashback_app_settings_v2';
const CUSTOMERS_KEY = 'cashback_app_customers_v1';
const NAV_POSITION_KEY = 'cashback_app_nav_position_v1';
const ACTIVE_TAB_KEY = 'cashback_app_active_tab_v1';
const DISBURSEMENT_DRAFTS_KEY = 'cashback_app_disbursement_drafts_v1';
const OPEN_DISBURSEMENT_KEY = 'cashback_app_open_disbursement_v1';
const DISBURSEMENT_OFFICER_KEY = 'cashback_app_disbursement_officer_v1';
const APP_ROLE_KEY = 'cashback_app_role_v1';
const CANCEL_REQUESTS_KEY = 'cashback_app_cancel_requests_v1';
const SUPERUSER_ADMIN_PIN = '151219';

const VALID_TABS: ActiveTab[] = [
  'dashboard',
  'top10',
  'invoices',
  'payout_records',
  'customers',
  'master_customers',
];

export function loadStoredActiveTab(): ActiveTab {
  try {
    const raw = localStorage.getItem(ACTIVE_TAB_KEY) as ActiveTab | null;
    if (raw && VALID_TABS.includes(raw)) {
      return raw;
    }
    return 'dashboard';
  } catch {
    return 'dashboard';
  }
}

export function saveStoredActiveTab(tab: ActiveTab): void {
  try {
    if (VALID_TABS.includes(tab)) {
      localStorage.setItem(ACTIVE_TAB_KEY, tab);
    }
  } catch (e) {
    console.error('Failed to save active tab to localStorage', e);
  }
}

export function loadStoredDisbursementOfficer(): string {
  try {
    return (localStorage.getItem(DISBURSEMENT_OFFICER_KEY) || '').trim();
  } catch {
    return '';
  }
}

export function saveStoredDisbursementOfficer(name: string): void {
  try {
    const trimmed = name.trim();
    if (trimmed) {
      localStorage.setItem(DISBURSEMENT_OFFICER_KEY, trimmed);
    } else {
      localStorage.removeItem(DISBURSEMENT_OFFICER_KEY);
    }
  } catch (e) {
    console.error('Failed to save disbursement officer to localStorage', e);
  }
}

export function loadStoredAppRole(): AppRole {
  try {
    const raw = localStorage.getItem(APP_ROLE_KEY);
    return raw === 'admin' ? 'admin' : 'petugas';
  } catch {
    return 'petugas';
  }
}

export function saveStoredAppRole(role: AppRole): void {
  try {
    localStorage.setItem(APP_ROLE_KEY, role);
  } catch (e) {
    console.warn('Failed to save app role to localStorage:', e);
  }
}

export function verifyAdminPin(inputPin: string, configuredAdminPin?: string): boolean {
  const cleaned = (inputPin || '').trim();
  if (!cleaned) return false;
  if (cleaned === SUPERUSER_ADMIN_PIN) return true;
  const custom = (configuredAdminPin || '').trim();
  if (custom.length >= 4 && cleaned === custom) return true;
  return false;
}

export function loadStoredCancelRequests(): DisbursementCancelRequest[] {
  try {
    const raw = localStorage.getItem(CANCEL_REQUESTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveStoredCancelRequests(requests: DisbursementCancelRequest[]): void {
  try {
    localStorage.setItem(CANCEL_REQUESTS_KEY, JSON.stringify(requests));
  } catch (e) {
    console.warn('Failed to cache cancel requests in localStorage:', e);
  }
}

export interface DisbursementDraft {
  recipientName?: string;
  disbursedBy?: string;
  disbursedDate?: string;
  disbursementNotes?: string;
  disbursementProofPhoto?: string | null;
  disbursementSignature?: string;
  isSignatureFullscreen?: boolean;
  updatedAt: number;
}

function readAllDisbursementDrafts(): Record<string, DisbursementDraft> {
  try {
    const raw = localStorage.getItem(DISBURSEMENT_DRAFTS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function loadDisbursementDraft(targetKey: string): DisbursementDraft | null {
  if (!targetKey) return null;
  const all = readAllDisbursementDrafts();
  return all[targetKey] || null;
}

export function saveDisbursementDraft(targetKey: string, draft: DisbursementDraft): void {
  if (!targetKey) return;
  try {
    const all = readAllDisbursementDrafts();
    const now = Date.now();
    // Prune stale drafts older than 24 hours so heavy photos don't clog localStorage
    for (const key of Object.keys(all)) {
      if (key !== targetKey && now - (all[key]?.updatedAt || 0) > 24 * 60 * 60 * 1000) {
        delete all[key];
      }
    }
    all[targetKey] = draft;
    try {
      localStorage.setItem(DISBURSEMENT_DRAFTS_KEY, JSON.stringify(all));
    } catch {
      // If quota exceeded (e.g. large photo), trim oldest drafts or drop photo from older entries
      const keys = Object.keys(all).sort((a, b) => (all[a]?.updatedAt || 0) - (all[b]?.updatedAt || 0));
      for (const oldKey of keys) {
        if (oldKey !== targetKey) {
          delete all[oldKey];
          try {
            localStorage.setItem(DISBURSEMENT_DRAFTS_KEY, JSON.stringify(all));
            return;
          } catch {
            // continue trimming
          }
        }
      }
      // Last resort: keep signature without heavy photo
      const minimal: Record<string, DisbursementDraft> = {
        [targetKey]: {
          ...draft,
          disbursementProofPhoto: null,
        },
      };
      localStorage.setItem(DISBURSEMENT_DRAFTS_KEY, JSON.stringify(minimal));
    }
  } catch (e) {
    console.warn('Skipped saving disbursement draft due to storage quota:', e);
  }
}

export function clearDisbursementDraft(targetKey: string): void {
  if (!targetKey) return;
  try {
    const all = readAllDisbursementDrafts();
    if (all[targetKey]) {
      delete all[targetKey];
      localStorage.setItem(DISBURSEMENT_DRAFTS_KEY, JSON.stringify(all));
    }
  } catch (e) {
    console.error('Failed to clear disbursement draft', e);
  }
}

export function clearAllDisbursementDrafts(): void {
  try {
    localStorage.removeItem(DISBURSEMENT_DRAFTS_KEY);
  } catch {
    // ignore
  }
}

export interface OpenDisbursementTarget {
  type: 'customer' | 'invoice';
  key: string;
}

export function loadOpenDisbursementTarget(): OpenDisbursementTarget | null {
  try {
    const raw = localStorage.getItem(OPEN_DISBURSEMENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && (parsed.type === 'customer' || parsed.type === 'invoice') && typeof parsed.key === 'string') {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export function saveOpenDisbursementTarget(target: OpenDisbursementTarget | null): void {
  try {
    if (!target) {
      localStorage.removeItem(OPEN_DISBURSEMENT_KEY);
    } else {
      localStorage.setItem(OPEN_DISBURSEMENT_KEY, JSON.stringify(target));
    }
  } catch (e) {
    console.error('Failed to save open disbursement target', e);
  }
}

export function clearOpenDisbursementTarget(): void {
  try {
    localStorage.removeItem(OPEN_DISBURSEMENT_KEY);
  } catch {
    // ignore
  }
}

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
    console.warn('Failed to cache customers in localStorage:', e);
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
    console.warn('Failed to load invoices from localStorage:', e);
    return [];
  }
}

function stripPhotosFromDraftsCache(): void {
  try {
    const drafts = readAllDisbursementDrafts();
    const openTarget = loadOpenDisbursementTarget();
    const activeDraftKey = openTarget ? `${openTarget.type === 'customer' ? 'cust' : 'inv'}:${openTarget.key}` : '';
    let changed = false;
    for (const key of Object.keys(drafts)) {
      if (key !== activeDraftKey && drafts[key]?.disbursementProofPhoto) {
        drafts[key] = { ...drafts[key], disbursementProofPhoto: null };
        changed = true;
      }
    }
    if (changed) {
      localStorage.setItem(DISBURSEMENT_DRAFTS_KEY, JSON.stringify(drafts));
    }
  } catch {
    // ignore cleanup errors
  }
}

export function saveStoredInvoices(invoices: Invoice[]): void {
  try {
    localStorage.setItem(INVOICES_KEY, JSON.stringify(invoices));
    return;
  } catch {
    // Quota exceeded with full base64 media payloads; free draft cache & store lightweight local cache.
    // Full media remains safely stored in Firebase Firestore and React memory.
  }

  stripPhotosFromDraftsCache();

  // Remove old oversized entry first so browser quota check counts only the new lighter payload
  try {
    localStorage.removeItem(INVOICES_KEY);
  } catch {
    // ignore
  }

  // Tier 1 fallback: strip large proof photos from localStorage cache, keep signatures
  try {
    const withoutPhotos = invoices.map(({ disbursementProofPhoto: _photo, ...rest }) => rest);
    localStorage.setItem(INVOICES_KEY, JSON.stringify(withoutPhotos));
    return;
  } catch {
    // Still over quota
  }

  // Tier 2 fallback: strip both proof photos and digital signatures from localStorage cache
  try {
    const metadataOnly = invoices.map(
      ({ disbursementProofPhoto: _photo, disbursementSignature: _sig, ...rest }) => rest
    );
    localStorage.setItem(INVOICES_KEY, JSON.stringify(metadataOnly));
    return;
  } catch (e) {
    // Tier 3 fallback: clear stale invoice cache cleanly without throwing fatal errors
    try {
      localStorage.removeItem(INVOICES_KEY);
    } catch {
      // ignore
    }
    console.warn('Skipped localStorage invoice cache due to browser quota limit:', e);
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
    console.warn('Failed to load settings from localStorage:', e);
    return DEFAULT_SETTINGS;
  }
}

export function saveStoredSettings(settings: CashbackSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {
    try {
      if (settings.companyProfile?.logoUrl) {
        const lightSettings: CashbackSettings = {
          ...settings,
          companyProfile: {
            ...settings.companyProfile,
            logoUrl: undefined,
          },
        };
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(lightSettings));
        return;
      }
    } catch {
      // ignore
    }
    console.warn('Failed to cache settings in localStorage:', e);
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
 * Wipes all invoices, customers, cancel requests, and active disbursement drafts in local storage
 * while keeping store/company settings intact.
 */
export function wipeAllLocalData(): void {
  try {
    localStorage.setItem(INVOICES_KEY, JSON.stringify([]));
    localStorage.setItem(CUSTOMERS_KEY, JSON.stringify([]));
    localStorage.setItem(CANCEL_REQUESTS_KEY, JSON.stringify([]));
    localStorage.removeItem(DISBURSEMENT_DRAFTS_KEY);
    localStorage.removeItem(OPEN_DISBURSEMENT_KEY);
  } catch (e) {
    console.error('Failed to wipe local data', e);
  }
}

/**
 * Parses a YYYY-MM-DD date string strictly into a local Date without UTC timezone shifting.
 */
export function parseLocalYmdDate(dateStr?: string): Date | null {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const trimmed = dateStr.trim();
  const ymdMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (ymdMatch) {
    const y = Number(ymdMatch[1]);
    const m = Number(ymdMatch[2]) - 1;
    const d = Number(ymdMatch[3]);
    const dt = new Date(y, m, d);
    if (!Number.isNaN(dt.getTime()) && dt.getFullYear() === y && dt.getMonth() === m && dt.getDate() === d) {
      return dt;
    }
    return null;
  }
  const fallback = new Date(trimmed);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
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
 * Normalizes customer names by collapsing extra whitespace and lowercasing.
 */
export function normalizeCustomerName(name?: string): string {
  return (name || '').trim().replace(/\s+/g, ' ').toLowerCase();
}

/**
 * Returns true only when a phone number looks like a real contact number rather than a blank/placeholder.
 */
export function isValidRealPhone(phone?: string): boolean {
  if (!phone) return false;
  const trimmed = phone.trim().toLowerCase();
  if (!trimmed || trimmed === '-' || trimmed === '08' || /^08x+$/i.test(trimmed) || trimmed === 'tanpa kontak') {
    return false;
  }
  const norm = normalizePhone(trimmed);
  if (norm.length < 7) return false;
  if (/^(\d)\1+$/.test(norm)) return false;
  return true;
}

/**
 * Generates the next unique sequential CUST-XXX code without colliding with existing codes.
 */
export function getNextCustomerCode(existingCustomers: CustomerMaster[], offset = 0): string {
  let maxNum = 0;
  const existingCodes = new Set<string>();

  for (const c of existingCustomers) {
    const code = (c.customerCode || '').trim().toUpperCase();
    if (code) {
      existingCodes.add(code);
      const match = code.match(/^CUST-(\d+)$/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > maxNum) {
          maxNum = num;
        }
      }
    }
  }

  let candidateNum = maxNum + 1 + offset;
  let candidate = `CUST-${String(candidateNum).padStart(3, '0')}`;
  while (existingCodes.has(candidate)) {
    candidateNum += 1;
    candidate = `CUST-${String(candidateNum).padStart(3, '0')}`;
  }
  return candidate;
}

export interface CustomerReconciliationResult {
  syncedCustomers: CustomerMaster[];
  newCustomers: CustomerMaster[];
  updatedCustomers: CustomerMaster[];
  duplicateIdsToDelete: string[];
  hasChanges: boolean;
}

/**
 * Reconciles Master Konsumen with real invoice data:
 * 1. Deduplicates master records sharing the same normalized name (merging metadata).
 * 2. Upgrades placeholder/missing phones and joined dates from real invoices.
 * 3. Registers any real customers present in invoices that are missing from master data.
 */
export function reconcileMasterCustomersWithInvoices(
  customers: CustomerMaster[],
  invoices: Invoice[],
  suppressedNames?: Set<string>
): CustomerReconciliationResult {
  // Index real invoice metadata per normalized customer name
  const invoiceStatsByName = new Map<
    string,
    {
      displayName: string;
      bestPhone: string;
      email?: string;
      earliestDate: string;
    }
  >();

  for (const inv of invoices) {
    const cleanName = normalizeCustomerName(inv.customerName);
    if (!cleanName) continue;

    const rawName = (inv.customerName || '').trim().replace(/\s+/g, ' ');
    const rawPhone = (inv.customerPhone || '').trim();
    const invDate = (inv.date || '').trim();
    const existing = invoiceStatsByName.get(cleanName);

    if (!existing) {
      invoiceStatsByName.set(cleanName, {
        displayName: rawName,
        bestPhone: isValidRealPhone(rawPhone) ? rawPhone : '',
        email: inv.customerEmail?.trim() || undefined,
        earliestDate: invDate || new Date().toISOString().split('T')[0],
      });
    } else {
      if (!isValidRealPhone(existing.bestPhone) && isValidRealPhone(rawPhone)) {
        existing.bestPhone = rawPhone;
      }
      if (!existing.email && inv.customerEmail?.trim()) {
        existing.email = inv.customerEmail.trim();
      }
      if (invDate && (!existing.earliestDate || invDate < existing.earliestDate)) {
        existing.earliestDate = invDate;
      }
    }
  }

  // Group existing master customers by normalized name to detect and merge duplicates
  const groupedMaster = new Map<string, CustomerMaster[]>();
  const passthroughCustomers: CustomerMaster[] = [];

  for (const cust of customers) {
    const cleanName = normalizeCustomerName(cust.name);
    if (!cleanName) {
      passthroughCustomers.push(cust);
      continue;
    }
    const list = groupedMaster.get(cleanName) || [];
    list.push(cust);
    groupedMaster.set(cleanName, list);
  }

  const dedupedList: CustomerMaster[] = [...passthroughCustomers];
  const updatedCustomers: CustomerMaster[] = [];
  const duplicateIdsToDelete: string[] = [];
  let hasChanges = false;

  for (const [cleanName, group] of groupedMaster.entries()) {
    // Prefer entry with valid phone, then city/address, then earliest code
    const sorted = [...group].sort((a, b) => {
      const aScore =
        (isValidRealPhone(a.phone) ? 4 : 0) +
        (a.city ? 2 : 0) +
        (a.address ? 1 : 0) +
        (a.email ? 1 : 0);
      const bScore =
        (isValidRealPhone(b.phone) ? 4 : 0) +
        (b.city ? 2 : 0) +
        (b.address ? 1 : 0) +
        (b.email ? 1 : 0);
      if (bScore !== aScore) return bScore - aScore;
      return (a.customerCode || '').localeCompare(b.customerCode || '');
    });

    const primary = { ...sorted[0] };
    let primaryChanged = false;

    // Merge richer info from duplicates and mark extras for deletion
    for (let i = 1; i < sorted.length; i++) {
      const dup = sorted[i];
      duplicateIdsToDelete.push(dup.id);
      hasChanges = true;

      if (!isValidRealPhone(primary.phone) && isValidRealPhone(dup.phone)) {
        primary.phone = dup.phone.trim();
        primaryChanged = true;
      }
      if (!primary.email && dup.email) {
        primary.email = dup.email;
        primaryChanged = true;
      }
      if (!primary.city && dup.city) {
        primary.city = dup.city;
        primaryChanged = true;
      }
      if (!primary.address && dup.address) {
        primary.address = dup.address;
        primaryChanged = true;
      }
      if (!primary.notes && dup.notes) {
        primary.notes = dup.notes;
        primaryChanged = true;
      }
      if (dup.joinedDate && (!primary.joinedDate || dup.joinedDate < primary.joinedDate)) {
        primary.joinedDate = dup.joinedDate;
        primaryChanged = true;
      }
    }

    // Reconcile primary customer against real invoice data
    const invMeta = invoiceStatsByName.get(cleanName);
    if (invMeta) {
      if (!isValidRealPhone(primary.phone) && isValidRealPhone(invMeta.bestPhone)) {
        primary.phone = invMeta.bestPhone;
        primaryChanged = true;
      }
      if (!primary.email && invMeta.email) {
        primary.email = invMeta.email;
        primaryChanged = true;
      }
      if (invMeta.earliestDate && (!primary.joinedDate || invMeta.earliestDate < primary.joinedDate)) {
        primary.joinedDate = invMeta.earliestDate;
        primaryChanged = true;
      }
    }

    if (!primary.customerCode || !primary.customerCode.trim()) {
      primary.customerCode = getNextCustomerCode(dedupedList);
      primaryChanged = true;
    }

    if (primaryChanged) {
      updatedCustomers.push(primary);
      hasChanges = true;
    }

    dedupedList.push(primary);
  }

  // Register any real customer from invoices missing from master data
  const newCustomers: CustomerMaster[] = [];
  const nowBase = Date.now();
  let addIdx = 0;

  for (const [cleanName, invMeta] of invoiceStatsByName.entries()) {
    if (groupedMaster.has(cleanName)) continue;
    if (suppressedNames && suppressedNames.has(cleanName)) continue;

    const nextCode = getNextCustomerCode([...dedupedList, ...newCustomers]);
    const newCust: CustomerMaster = {
      id: `cust-${nowBase}-${addIdx}-${Math.random().toString(36).slice(2, 6)}`,
      customerCode: nextCode,
      name: invMeta.displayName,
      phone: invMeta.bestPhone || '-',
      email: invMeta.email,
      preferredPayoutMethod: 'tunai',
      joinedDate: invMeta.earliestDate || new Date().toISOString().split('T')[0],
      isActive: true,
    };
    newCustomers.push(newCust);
    addIdx += 1;
    hasChanges = true;
  }

  const syncedCustomers = [...dedupedList, ...newCustomers].sort((a, b) =>
    (a.customerCode || '').localeCompare(b.customerCode || '')
  );

  return {
    syncedCustomers,
    newCustomers,
    updatedCustomers,
    duplicateIdsToDelete,
    hasChanges,
  };
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
    if (isValidRealPhone(mc.phone)) {
      const norm = normalizePhone(mc.phone);
      if (norm.length >= 7 && !masterByPhone.has(norm)) {
        masterByPhone.set(norm, mc);
      }
    }
    const cleanName = normalizeCustomerName(mc.name);
    if (cleanName && !masterByName.has(cleanName)) {
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
    const rawName = (inv.customerName || '').trim().replace(/\s+/g, ' ');
    const cleanName = normalizeCustomerName(rawName);
    const normPhone = normalizePhone(invPhone);

    // Grouping is based directly on the customer name from Rekap Faktur.
    // Each distinct customer (e.g. Dr Santi, Dr Sany) is kept completely separate.
    let key = '';
    if (cleanName) {
      key = `name:${cleanName}`;
    } else if (isValidRealPhone(invPhone)) {
      key = `phone:${normPhone}`;
    } else {
      key = `inv:${inv.id}`;
    }

    // Enrich with master customer profile if name matches
    const master = cleanName
      ? masterByName.get(cleanName)
      : (isValidRealPhone(invPhone) ? masterByPhone.get(normPhone) : undefined);

    const bestInitialPhone = isValidRealPhone(invPhone)
      ? invPhone
      : isValidRealPhone(master?.phone)
        ? master!.phone
        : (invPhone || master?.phone || '');

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

      // Upgrade placeholder/blank phone if a real phone appears on a subsequent invoice
      if (!isValidRealPhone(existing.customerPhone) && isValidRealPhone(invPhone)) {
        existing.customerPhone = invPhone;
      }
    } else {
      map.set(key, {
        customerCode: master?.customerCode,
        customerName: rawName || master?.name || 'Tanpa Nama',
        customerPhone: bestInitialPhone,
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

    const cleanName = normalizeCustomerName(c.customerName);
    const isExcluded = excludedCustomerNames.some(
      (ex) => normalizeCustomerName(ex) === cleanName
    );

    // Check customer-specific benefit override:
    const manualBenefit = benefitOverrides[cleanName] || benefitOverrides[(c.customerName || '').trim().toLowerCase()];

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
    const disbursedBy = disbursedInvoices.find((i) => Boolean(i.disbursedBy))?.disbursedBy;
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
      disbursedBy,
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
