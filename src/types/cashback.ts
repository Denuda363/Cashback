export type ClaimStatus = 'pending' | 'ready' | 'disbursed';

export type PayoutMethod = 'transfer_bank' | 'e_wallet' | 'potongan_belanja' | 'tunai';

export interface TierRule {
  id: string;
  minSpend: number;
  maxSpend: number | null; // null means unbounded
  percentage: number;
  label: string;
}

export interface CashbackSettings {
  mode: 'flat' | 'tiered';
  flatPercentage: number; // e.g. 5.0 for 5%
  tiers: TierRule[];
  minPurchaseAmount: number; // e.g. 50000
  maxCashbackPerTransaction: number | null; // e.g. 500000 or null for unlimited
  rounding: 'exact' | 'round_hundred' | 'round_thousand';
  claimValidityDays: number; // e.g. 30 days
  storeName: string;
  currency: string;
  minSpendForParcel?: number; // e.g. 5000000
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  date: string; // ISO date 'YYYY-MM-DD'
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  category: string;
  itemsDescription?: string;
  purchaseAmount: number;
  cashbackPercentage: number; // effective applied %
  cashbackAmount: number; // calculated cashback in Rp
  claimStatus: ClaimStatus;
  payoutMethod: PayoutMethod;
  disbursedDate?: string;
  notes?: string;
  getParcel?: boolean;
  createdAt: string;
}

export interface CustomerSummary {
  customerName: string;
  customerPhone: string;
  totalPurchase: number;
  totalCashback: number;
  disbursedCashback: number;
  pendingCashback: number;
  readyCashback: number;
  invoiceCount: number;
  lastPurchaseDate: string;
  tier: 'Platinum' | 'Gold' | 'Silver' | 'Bronze';
  rank?: number;
  getParcel?: boolean;
}

export interface CustomerMaster {
  id: string;
  customerCode: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  city?: string;
  bankName?: string;
  bankAccountNumber?: string;
  bankAccountHolder?: string;
  eWalletType?: string;
  eWalletNumber?: string;
  preferredPayoutMethod?: PayoutMethod;
  notes?: string;
  joinedDate: string;
  isActive: boolean;
}

export type ActiveTab = 'dashboard' | 'top10' | 'invoices' | 'customers' | 'master_customers' | 'settings';

export type NavPosition = 'sidebar' | 'top' | 'bottom';
