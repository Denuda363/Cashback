import { initializeApp, getApps } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged, 
  GoogleAuthProvider, 
  User 
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  getDoc, 
  getDocs, 
  onSnapshot, 
  getDocFromServer,
  writeBatch
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { CashbackSettings, CustomerMaster, Invoice } from '../types/cashback';

// Export Project & Database Identifiers
export const FIREBASE_PROJECT_ID = firebaseConfig.projectId;
export const FIRESTORE_DATABASE_ID = firebaseConfig.firestoreDatabaseId;

// Initialize Firebase App
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Initialize Firestore with exact database ID
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

// Initialize Firebase Auth
export const auth = getAuth(app);

// Error Handling per Firestore Skill Guidelines
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map((provider) => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// -------------------------------------------------------------
// Database Table / Collection Names
// -------------------------------------------------------------
export const INVOICES_COLLECTION = 'invoices';
export const CUSTOMERS_COLLECTION = 'customers';
export const SETTINGS_COLLECTION = 'settings';
export const SYSTEM_COLLECTION = 'system';
export const MAIN_SETTINGS_DOC_ID = 'current_settings';
export const SYSTEM_INFO_DOC_ID = 'database_info';

// -------------------------------------------------------------
// Connection test per skill requirements
// -------------------------------------------------------------
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    // Attempt to read system info directly from server to verify live cloud connection
    const testDocRef = doc(db, SYSTEM_COLLECTION, SYSTEM_INFO_DOC_ID);
    await getDocFromServer(testDocRef);
    console.log('Firebase Firestore connection verified successfully from server.');
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase client is offline or network connecting...');
      return false;
    }
    // If document is not found, connection itself still succeeded
    return true;
  }
}

// -------------------------------------------------------------
// Automatic Table Creation & Initialization
// Ensures all required collections (invoices, customers, settings, system)
// exist with documents in Firestore automatically.
// -------------------------------------------------------------
export interface TableInitResult {
  success: boolean;
  seededTables: string[];
  existingTables: string[];
  totalInvoicesInCloud: number;
  totalCustomersInCloud: number;
}

export async function ensureFirestoreTablesExist(
  initialInvoices: Invoice[],
  initialCustomers: CustomerMaster[],
  defaultSettings: CashbackSettings
): Promise<TableInitResult> {
  const seededTables: string[] = [];
  const existingTables: string[] = [];
  let totalInvoices = 0;
  let totalCustomers = 0;

  try {
    console.log('Memeriksa status tabel database Firestore Cloud...');

    // 1. Table: settings (Pengaturan Cashback)
    try {
      const settingsRef = doc(db, SETTINGS_COLLECTION, MAIN_SETTINGS_DOC_ID);
      const settingsSnap = await getDoc(settingsRef);
      if (!settingsSnap.exists()) {
        await setDoc(settingsRef, defaultSettings);
        seededTables.push('settings');
        console.log('✓ Tabel settings berhasil dibuat dan diinisialisasi.');
      } else {
        existingTables.push('settings');
      }
    } catch (e) {
      console.warn('Check settings table error:', e);
    }

    // 2. Table: customers (Master Data Konsumen)
    // PERINGATAN: Jangan pernah mengisi ulang data sampel jika kosong agar data yang sudah dihapus tidak kembali!
    try {
      const customersSnap = await getDocs(collection(db, CUSTOMERS_COLLECTION));
      totalCustomers = customersSnap.size;
      existingTables.push('customers');
    } catch (e) {
      console.warn('Check customers table error:', e);
    }

    // 3. Table: invoices (Rekap Faktur Transaksi)
    // PERINGATAN: Jangan pernah mengisi ulang faktur sampel jika kosong agar faktur yang sudah dihapus tidak kembali!
    try {
      const invoicesSnap = await getDocs(collection(db, INVOICES_COLLECTION));
      totalInvoices = invoicesSnap.size;
      existingTables.push('invoices');
    } catch (e) {
      console.warn('Check invoices table error:', e);
    }

    // 4. Table: system (Metadata & Status Database)
    try {
      const systemRef = doc(db, SYSTEM_COLLECTION, SYSTEM_INFO_DOC_ID);
      const systemSnap = await getDoc(systemRef);
      if (!systemSnap.exists()) {
        await setDoc(systemRef, {
          appName: 'CashbackPro Rekapitulasi',
          version: '2.0',
          status: 'active',
          isInitialized: true,
          databaseId: FIRESTORE_DATABASE_ID,
          projectId: FIREBASE_PROJECT_ID,
          lastSyncAt: new Date().toISOString(),
          tables: [INVOICES_COLLECTION, CUSTOMERS_COLLECTION, SETTINGS_COLLECTION, SYSTEM_COLLECTION],
        });
        seededTables.push('system');
        console.log('✓ Tabel system status metadata berhasil diinisialisasi.');
      } else {
        existingTables.push('system');
      }
    } catch (e) {
      console.warn('Check system table error:', e);
    }

    return {
      success: true,
      seededTables,
      existingTables,
      totalInvoicesInCloud: totalInvoices,
      totalCustomersInCloud: totalCustomers,
    };
  } catch (error) {
    console.error('ensureFirestoreTablesExist failed:', error);
    return {
      success: false,
      seededTables,
      existingTables,
      totalInvoicesInCloud: totalInvoices,
      totalCustomersInCloud: totalCustomers,
    };
  }
}

// Backward compatibility alias
export const seedFirestoreIfEmpty = ensureFirestoreTablesExist;

// -------------------------------------------------------------
// Authentication Helpers
// -------------------------------------------------------------
const googleProvider = new GoogleAuthProvider();

export async function loginWithGoogle(): Promise<User> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error('Google Sign-In failed:', error);
    throw error;
  }
}

export async function logoutUser(): Promise<void> {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Logout failed:', error);
    throw error;
  }
}

export function onAuthUserChanged(callback: (user: User | null) => void): () => void {
  return onAuthStateChanged(auth, callback);
}

// -------------------------------------------------------------
// Firestore Database Operations: Invoices
// -------------------------------------------------------------
export function subscribeFirestoreInvoices(
  onData: (invoices: Invoice[]) => void,
  onError?: (err: Error) => void
): () => void {
  const colRef = collection(db, INVOICES_COLLECTION);

  return onSnapshot(
    colRef,
    (snapshot) => {
      const items: Invoice[] = [];
      snapshot.forEach((d) => {
        const data = d.data();
        items.push({
          id: d.id,
          ...data,
        } as Invoice);
      });
      // Sort desc by date
      items.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
      onData(items);
    },
    (error) => {
      console.warn('Invoices onSnapshot warning:', error);
      if (onError && error instanceof Error) onError(error);
    }
  );
}

export async function saveInvoiceToFirestore(invoice: Invoice): Promise<void> {
  const path = `${INVOICES_COLLECTION}/${invoice.id}`;
  try {
    const docRef = doc(db, INVOICES_COLLECTION, invoice.id);
    await setDoc(docRef, { ...invoice }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteInvoiceFromFirestore(invoiceId: string): Promise<void> {
  const path = `${INVOICES_COLLECTION}/${invoiceId}`;
  try {
    const docRef = doc(db, INVOICES_COLLECTION, invoiceId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function batchUpdateInvoicesInFirestore(invoices: Invoice[]): Promise<void> {
  if (invoices.length === 0) return;
  try {
    // Process in batches of up to 400 to respect Firestore limits
    const BATCH_SIZE = 400;
    for (let i = 0; i < invoices.length; i += BATCH_SIZE) {
      const slice = invoices.slice(i, i + BATCH_SIZE);
      const batch = writeBatch(db);
      slice.forEach((inv) => {
        const docRef = doc(db, INVOICES_COLLECTION, inv.id);
        batch.set(docRef, { ...inv }, { merge: true });
      });
      await batch.commit();
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, INVOICES_COLLECTION);
  }
}

// -------------------------------------------------------------
// Firestore Database Operations: Customers
// -------------------------------------------------------------
export function subscribeFirestoreCustomers(
  onData: (customers: CustomerMaster[]) => void,
  onError?: (err: Error) => void
): () => void {
  const colRef = collection(db, CUSTOMERS_COLLECTION);

  return onSnapshot(
    colRef,
    (snapshot) => {
      const items: CustomerMaster[] = [];
      snapshot.forEach((d) => {
        items.push({
          id: d.id,
          ...d.data(),
        } as CustomerMaster);
      });
      // Sort asc by customerCode
      items.sort((a, b) => (a.customerCode || '').localeCompare(b.customerCode || ''));
      onData(items);
    },
    (error) => {
      console.warn('Customers onSnapshot warning:', error);
      if (onError && error instanceof Error) onError(error);
    }
  );
}

export async function saveCustomerToFirestore(customer: CustomerMaster): Promise<void> {
  const path = `${CUSTOMERS_COLLECTION}/${customer.id}`;
  try {
    const docRef = doc(db, CUSTOMERS_COLLECTION, customer.id);
    await setDoc(docRef, { ...customer }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteCustomerFromFirestore(customerId: string): Promise<void> {
  const path = `${CUSTOMERS_COLLECTION}/${customerId}`;
  try {
    const docRef = doc(db, CUSTOMERS_COLLECTION, customerId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// -------------------------------------------------------------
// Firestore Database Operations: Settings
// -------------------------------------------------------------
export function subscribeFirestoreSettings(
  onData: (settings: CashbackSettings) => void,
  onError?: (err: Error) => void
): () => void {
  const docRef = doc(db, SETTINGS_COLLECTION, MAIN_SETTINGS_DOC_ID);

  return onSnapshot(
    docRef,
    (snapshot) => {
      if (snapshot.exists()) {
        onData(snapshot.data() as CashbackSettings);
      }
    },
    (error) => {
      console.warn('Settings onSnapshot warning:', error);
      if (onError && error instanceof Error) onError(error);
    }
  );
}

export async function saveSettingsToFirestore(settings: CashbackSettings): Promise<void> {
  const path = `${SETTINGS_COLLECTION}/${MAIN_SETTINGS_DOC_ID}`;
  try {
    const docRef = doc(db, SETTINGS_COLLECTION, MAIN_SETTINGS_DOC_ID);
    await setDoc(docRef, { ...settings }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// -------------------------------------------------------------
// Full Database Re-Sync (Upload all local state to Firestore)
// -------------------------------------------------------------
export async function forceSyncAllToFirestore(
  invoices: Invoice[],
  customers: CustomerMaster[],
  settings: CashbackSettings
): Promise<void> {
  // 1. Settings
  await saveSettingsToFirestore(settings);

  // 2. Customers
  const custBatch = writeBatch(db);
  customers.forEach((c) => {
    custBatch.set(doc(db, CUSTOMERS_COLLECTION, c.id), c, { merge: true });
  });
  await custBatch.commit();

  // 3. Invoices
  await batchUpdateInvoicesInFirestore(invoices);

  // 4. System info
  await setDoc(doc(db, SYSTEM_COLLECTION, SYSTEM_INFO_DOC_ID), {
    appName: 'CashbackPro Rekapitulasi',
    version: '2.0',
    status: 'active',
    lastSyncAt: new Date().toISOString(),
    manualSyncTriggered: true,
  }, { merge: true });
}

// -------------------------------------------------------------
// Total Wipe: Permanently delete all invoices and customers from Firestore
// -------------------------------------------------------------
export async function deleteAllDataFromFirestore(): Promise<{
  deletedInvoices: number;
  deletedCustomers: number;
}> {
  try {
    let deletedInvoices = 0;
    let deletedCustomers = 0;

    // 1. Delete all invoices in batches
    const invSnap = await getDocs(collection(db, INVOICES_COLLECTION));
    deletedInvoices = invSnap.size;
    if (!invSnap.empty) {
      const BATCH_SIZE = 400;
      const docs = invSnap.docs;
      for (let i = 0; i < docs.length; i += BATCH_SIZE) {
        const batch = writeBatch(db);
        docs.slice(i, i + BATCH_SIZE).forEach((d) => batch.delete(d.ref));
        await batch.commit();
      }
    }

    // 2. Delete all customers in batches
    const custSnap = await getDocs(collection(db, CUSTOMERS_COLLECTION));
    deletedCustomers = custSnap.size;
    if (!custSnap.empty) {
      const BATCH_SIZE = 400;
      const docs = custSnap.docs;
      for (let i = 0; i < docs.length; i += BATCH_SIZE) {
        const batch = writeBatch(db);
        docs.slice(i, i + BATCH_SIZE).forEach((d) => batch.delete(d.ref));
        await batch.commit();
      }
    }

    // 3. Update system table with wipe record
    const systemRef = doc(db, SYSTEM_COLLECTION, SYSTEM_INFO_DOC_ID);
    await setDoc(
      systemRef,
      {
        lastWipedAt: new Date().toISOString(),
        status: 'wiped',
        totalInvoices: 0,
        totalCustomers: 0,
      },
      { merge: true }
    );

    console.log(`Firestore Wipe: Dihapus ${deletedInvoices} faktur dan ${deletedCustomers} konsumen.`);
    return { deletedInvoices, deletedCustomers };
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, 'all_collections');
  }
}

// -------------------------------------------------------------
// Restore from Backup to Firestore
// -------------------------------------------------------------
export async function restoreBackupToFirestore(
  invoices: Invoice[],
  customers: CustomerMaster[],
  settings?: CashbackSettings
): Promise<void> {
  try {
    // 1. Clear existing data in Firestore
    await deleteAllDataFromFirestore();

    // 2. Restore customers
    if (customers.length > 0) {
      const BATCH_SIZE = 400;
      for (let i = 0; i < customers.length; i += BATCH_SIZE) {
        const slice = customers.slice(i, i + BATCH_SIZE);
        const batch = writeBatch(db);
        slice.forEach((c) => {
          batch.set(doc(db, CUSTOMERS_COLLECTION, c.id), c);
        });
        await batch.commit();
      }
    }

    // 3. Restore invoices
    if (invoices.length > 0) {
      const BATCH_SIZE = 400;
      for (let i = 0; i < invoices.length; i += BATCH_SIZE) {
        const slice = invoices.slice(i, i + BATCH_SIZE);
        const batch = writeBatch(db);
        slice.forEach((inv) => {
          batch.set(doc(db, INVOICES_COLLECTION, inv.id), inv);
        });
        await batch.commit();
      }
    }

    // 4. Restore settings if provided
    if (settings) {
      await saveSettingsToFirestore(settings);
    }

    // 5. Update system metadata
    await setDoc(
      doc(db, SYSTEM_COLLECTION, SYSTEM_INFO_DOC_ID),
      {
        appName: 'CashbackPro Rekapitulasi',
        lastRestoredAt: new Date().toISOString(),
        totalInvoices: invoices.length,
        totalCustomers: customers.length,
        status: 'active',
      },
      { merge: true }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'restore_backup');
  }
}
