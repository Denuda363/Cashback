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
  query,
  orderBy,
  writeBatch
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { CashbackSettings, CustomerMaster, Invoice } from '../types/cashback';

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

// Connection test per skill requirements
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log('Firebase Firestore connection verified successfully.');
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase client is offline or connecting...');
      return false;
    }
    // Document might not exist, but network connection to server succeeded
    return true;
  }
}

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
const INVOICES_COLLECTION = 'invoices';

export function subscribeFirestoreInvoices(
  onData: (invoices: Invoice[]) => void,
  onError?: (err: Error) => void
): () => void {
  const colRef = collection(db, INVOICES_COLLECTION);
  const q = query(colRef, orderBy('date', 'desc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const items: Invoice[] = [];
      snapshot.forEach((d) => {
        const data = d.data();
        items.push({
          id: d.id,
          ...data,
        } as Invoice);
      });
      onData(items);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.GET, INVOICES_COLLECTION);
      } catch (e) {
        if (onError && e instanceof Error) onError(e);
      }
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
  try {
    const batch = writeBatch(db);
    invoices.forEach((inv) => {
      const docRef = doc(db, INVOICES_COLLECTION, inv.id);
      batch.set(docRef, { ...inv }, { merge: true });
    });
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, INVOICES_COLLECTION);
  }
}

// -------------------------------------------------------------
// Firestore Database Operations: Customers
// -------------------------------------------------------------
const CUSTOMERS_COLLECTION = 'customers';

export function subscribeFirestoreCustomers(
  onData: (customers: CustomerMaster[]) => void,
  onError?: (err: Error) => void
): () => void {
  const colRef = collection(db, CUSTOMERS_COLLECTION);
  const q = query(colRef, orderBy('customerCode', 'asc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const items: CustomerMaster[] = [];
      snapshot.forEach((d) => {
        items.push({
          id: d.id,
          ...d.data(),
        } as CustomerMaster);
      });
      onData(items);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.GET, CUSTOMERS_COLLECTION);
      } catch (e) {
        if (onError && e instanceof Error) onError(e);
      }
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
const SETTINGS_COLLECTION = 'settings';
const MAIN_SETTINGS_DOC_ID = 'current_settings';

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
      try {
        handleFirestoreError(error, OperationType.GET, `${SETTINGS_COLLECTION}/${MAIN_SETTINGS_DOC_ID}`);
      } catch (e) {
        if (onError && e instanceof Error) onError(e);
      }
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
// Auto-seeding: Automatically populate Firestore if empty on first launch
// -------------------------------------------------------------
export async function seedFirestoreIfEmpty(
  initialInvoices: Invoice[],
  initialCustomers: CustomerMaster[],
  defaultSettings: CashbackSettings
): Promise<boolean> {
  try {
    const invoicesSnapshot = await getDocs(collection(db, INVOICES_COLLECTION));
    if (!invoicesSnapshot.empty) {
      return false; // Already populated
    }

    console.log('Seeding initial data into Firebase Firestore...');
    const batch = writeBatch(db);

    // Seed Settings
    const settingsDoc = doc(db, SETTINGS_COLLECTION, MAIN_SETTINGS_DOC_ID);
    batch.set(settingsDoc, defaultSettings);

    // Seed Customers
    initialCustomers.forEach((cust) => {
      const custDoc = doc(db, CUSTOMERS_COLLECTION, cust.id);
      batch.set(custDoc, cust);
    });

    // Seed Invoices
    initialInvoices.forEach((inv) => {
      const invDoc = doc(db, INVOICES_COLLECTION, inv.id);
      batch.set(invDoc, inv);
    });

    await batch.commit();
    console.log('Firebase Firestore initialized with sample data successfully.');
    return true;
  } catch (err) {
    console.warn('Auto-seed check error (will use local fallback if offline):', err);
    return false;
  }
}
