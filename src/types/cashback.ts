export type ClaimStatus = 'pending' | 'ready' | 'disbursed';

export type PayoutMethod = 'transfer_bank' | 'e_wallet' | 'potongan_belanja' | 'tunai';

export type CustomerBenefitType = 'cashback_parcel' | 'cashback_only' | 'parcel_only';

export interface TierRule {
  id: string;
  minSpend: number;
  maxSpend: number | null; // null means unbounded
  percentage: number;
  label: string;
}

export interface CompanyProfile {
  companyName: string;
  tagline?: string;
  address?: string;
  city?: string;
  phone?: string;
  email?: string;
  website?: string;
  taxNumber?: string; // NPWP / NIB
  picName?: string; // Nama Penanggung Jawab / Pimpinan
  picTitle?: string; // Jabatan, contoh: Manager Keuangan / Store Manager
  bankName?: string;
  bankAccountNumber?: string;
  bankAccountHolder?: string;
  footerNotes?: string;
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
  excludedCustomerNames?: string[]; // Names of customers disqualified/excluded from receiving cashback
  customerBenefitOverrides?: Record<string, CustomerBenefitType>; // Manual configuration of benefit per customer (clean lowercase name -> benefit)
  companyProfile?: CompanyProfile; // Profil identitas perusahaan / toko
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
  disbursedAt?: string;
  recipientName?: string;
  disbursementProofPhoto?: string; // Base64 data URL of proof of payment / handover photo
  disbursementSignature?: string; // Base64 data URL of digital electronic signature
  disbursementNotes?: string;
  notes?: string;
  getParcel?: boolean;
  benefitType?: CustomerBenefitType; // 'cashback_parcel' | 'cashback_only' | 'parcel_only'
  createdAt: string;
}

export interface CustomerSummary {
  customerCode?: string;
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
  benefitType?: CustomerBenefitType; // 'cashback_parcel' | 'cashback_only' | 'parcel_only'
  bankName?: string;
  bankAccountNumber?: string;
  bankAccountHolder?: string;
  eWalletType?: string;
  eWalletNumber?: string;
  preferredPayoutMethod?: PayoutMethod;
  invoices?: Invoice[];
  isExcludedFromCashback?: boolean;
  lastDisbursedDate?: string;
  lastDisbursedAt?: string;
  recipientName?: string;
  disbursementProofPhoto?: string;
  disbursementSignature?: string;
  disbursementNotes?: string;
  disbursementPayoutMethod?: PayoutMethod;
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

export type ActiveTab = 'dashboard' | 'top10' | 'invoices' | 'payout_records' | 'customers' | 'master_customers' | 'settings';

export type NavPosition = 'sidebar' | 'top' | 'bottom';
