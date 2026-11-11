import React, { useState, useMemo } from 'react';
import { 
  Users, 
  Search, 
  Download, 
  Receipt, 
  Phone, 
  Wallet, 
  CheckCircle2, 
  Clock, 
  Gift, 
  Building2, 
  TrendingUp, 
  Copy, 
  Check, 
  ChevronDown, 
  ChevronUp, 
  FileText, 
  Layers, 
  Eye, 
  X,
  CreditCard,
  FileSpreadsheet,
  ArrowRight,
  UserX,
  UserCheck,
  AlertTriangle
} from 'lucide-react';
import { CustomerSummary, Invoice } from '../types/cashback';
import { formatRupiah, formatNumber } from '../utils/cashbackCalculator';
import { aggregateCustomerSummaries } from '../utils/storage';
import { ConfirmDialog } from './ConfirmDialog';

interface CustomerSummaryViewProps {
  customerSummaries: CustomerSummary[];
  invoices?: Invoice[];
  excludedCustomerNames?: string[];
  onToggleExcludeCustomer?: (customerName: string) => void;
  onOpenCustomerDisbursement?: (customer: CustomerSummary) => void;
  onSelectCustomerForInvoices: (customerName: string) => void;
  onExportExcel: () => void;
  storeName?: string;
}

export const CustomerSummaryView: React.FC<CustomerSummaryViewProps> = ({
  customerSummaries,
  invoices = [],
  excludedCustomerNames = [],
  onToggleExcludeCustomer,
  onOpenCustomerDisbursement,
  onSelectCustomerForInvoices,
  onExportExcel,
  storeName = 'CashbackPro',
}) => {
  const [search, setSearch] = useState('');
  const [tierFilter, setTierFilter] = useState<'all' | 'Platinum' | 'Gold' | 'Silver' | 'Bronze'>('all');
  const [parcelFilter, setParcelFilter] = useState<'all' | 'parcel' | 'non_parcel'>('all');
  const [eligibilityFilter, setEligibilityFilter] = useState<'all' | 'active' | 'excluded'>('all');
  const [sortBy, setSortBy] = useState<
    'rank_asc' | 'purchase_desc' | 'cashback_desc' | 'invoices_desc' | 'name_asc'
  >('rank_asc');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  
  // Accordion state: set of expanded customer keys
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());
  
  // Modal state for customer detail breakdown
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerSummary | null>(null);

  // Modal confirmation for excluding a customer
  const [customerToExclude, setCustomerToExclude] = useState<string | null>(null);

  // Copy feedback state
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);

  // Set of lowercase clean excluded customer names
  const excludedSet = useMemo(() => {
    return new Set(excludedCustomerNames.map((n) => (n || '').trim().toLowerCase()));
  }, [excludedCustomerNames]);

  // Group invoices directly by customer name as reference
  const invoicesByCustomerName = useMemo(() => {
    const map = new Map<string, Invoice[]>();
    for (const inv of invoices) {
      const nameKey = (inv.customerName || '').trim().toLowerCase();
      if (!nameKey) continue;
      const list = map.get(nameKey) || [];
      list.push(inv);
      map.set(nameKey, list);
    }
    return map;
  }, [invoices]);

  // Ensure each summary has its attached invoices and updated exclusion flag
  const resolvedSummaries = useMemo(() => {
    const baseList = customerSummaries.length > 0 
      ? customerSummaries 
      : aggregateCustomerSummaries(invoices, 5000000, [], excludedCustomerNames);

    return baseList.map((c) => {
      const nameKey = (c.customerName || '').trim().toLowerCase();
      const matchedInvoices = c.invoices && c.invoices.length > 0
        ? c.invoices
        : (invoicesByCustomerName.get(nameKey) || []);
      
      const isExcluded = excludedSet.has(nameKey) || Boolean(c.isExcludedFromCashback);

      return {
        ...c,
        invoices: matchedInvoices,
        isExcludedFromCashback: isExcluded,
      };
    });
  }, [customerSummaries, invoices, invoicesByCustomerName, excludedSet, excludedCustomerNames]);

  // Filter and sort the per-customer data
  const filtered = useMemo(() => {
    let list = resolvedSummaries.filter((c) => {
      // 1. Search
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const matchName = c.customerName.toLowerCase().includes(q);
        const matchPhone = c.customerPhone.toLowerCase().includes(q);
        const matchCode = c.customerCode?.toLowerCase().includes(q);
        const matchBank = c.bankName?.toLowerCase().includes(q) || c.bankAccountNumber?.includes(q);
        const matchEWallet = c.eWalletType?.toLowerCase().includes(q) || c.eWalletNumber?.includes(q);
        if (!matchName && !matchPhone && !matchCode && !matchBank && !matchEWallet) {
          return false;
        }
      }

      // 2. Eligibility filter (Coret / Aktif)
      if (eligibilityFilter === 'active' && c.isExcludedFromCashback) {
        return false;
      }
      if (eligibilityFilter === 'excluded' && !c.isExcludedFromCashback) {
        return false;
      }

      // 3. Tier
      if (tierFilter !== 'all' && c.tier !== tierFilter) {
        return false;
      }

      // 4. Parcel
      if (parcelFilter === 'parcel' && !c.getParcel) {
        return false;
      }
      if (parcelFilter === 'non_parcel' && c.getParcel) {
        return false;
      }

      return true;
    });

    list.sort((a, b) => {
      if (sortBy === 'rank_asc') {
        return (a.rank || 0) - (b.rank || 0);
      }
      if (sortBy === 'purchase_desc') {
        return b.totalPurchase - a.totalPurchase;
      }
      if (sortBy === 'cashback_desc') {
        return b.totalCashback - a.totalCashback;
      }
      if (sortBy === 'invoices_desc') {
        return b.invoiceCount - a.invoiceCount;
      }
      if (sortBy === 'name_asc') {
        return a.customerName.localeCompare(b.customerName);
      }
      return 0;
    });

    return list;
  }, [resolvedSummaries, search, eligibilityFilter, tierFilter, parcelFilter, sortBy]);

  // Helper key for customer identification (unique per consumer)
  const getCustomerKey = (c: CustomerSummary, idx?: number) => {
    if (c.customerCode) return `code:${c.customerCode}`;
    const cleanName = (c.customerName || '').trim().toLowerCase();
    if (cleanName) return `name:${cleanName}`;
    if (c.customerPhone) return `phone:${c.customerPhone}_${idx ?? 0}`;
    return `idx:${idx ?? 0}`;
  };

  // Toggle expand for a customer
  const toggleExpand = (key: string) => {
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  // Toggle expand all
  const handleToggleExpandAll = () => {
    if (expandedKeys.size >= filtered.length && filtered.length > 0) {
      setExpandedKeys(new Set());
    } else {
      const allKeys = new Set(filtered.map((c, i) => getCustomerKey(c, i)));
      setExpandedKeys(allKeys);
    }
  };

  // Build clean text recap for a single customer
  const generateSingleCustomerText = (cust: CustomerSummary, idx?: number): string => {
    const num = idx !== undefined ? `${idx + 1}. ` : '';
    const ratio = cust.totalPurchase > 0 ? ((cust.totalCashback / cust.totalPurchase) * 100).toFixed(1) : '0';
    const statusNote = cust.isExcludedFromCashback ? ' [DICORET - HAK CASHBACK DIBATALKAN]' : '';
    
    let text = `${num}${cust.customerName}${statusNote}\n`;
    text += `   Total Belanja : ${formatRupiah(cust.totalPurchase)}\n`;
    text += `   Total Cashback: ${formatRupiah(cust.totalCashback)} (${ratio}%)${cust.isExcludedFromCashback ? ' (Tidak Dicairkan)' : ''}\n`;
    text += `   Transaksi     : ${cust.invoiceCount} Faktur\n`;

    if (cust.invoices && cust.invoices.length > 0) {
      text += `   Rincian Faktur:\n`;
      cust.invoices.forEach((inv, i) => {
        text += `   - Faktur ${inv.invoiceNumber} (${inv.date}) : Belanja ${formatRupiah(inv.purchaseAmount)} -> Cashback ${formatRupiah(inv.cashbackAmount)}\n`;
      });
    }

    return text;
  };

  // Copy single customer text
  const handleCopyCustomer = (cust: CustomerSummary, idx: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const key = getCustomerKey(cust, idx);
    const text = generateSingleCustomerText(cust, idx);
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => {
      setCopiedKey(null);
    }, 2500);
  };

  // Copy all visible customers formatted exactly as user requested
  const handleCopyAllRecap = () => {
    let text = `REKAP KONSUMEN - ${storeName.toUpperCase()}\n`;
    text += `(Data per tiap konsumen diambil dari Rekap Faktur)\n`;
    text += `Tanggal: ${new Date().toLocaleDateString('id-ID')}\n\n`;

    filtered.forEach((cust, idx) => {
      const ratio = cust.totalPurchase > 0 ? ((cust.totalCashback / cust.totalPurchase) * 100).toFixed(1) : '0';
      const statusNote = cust.isExcludedFromCashback ? ' [DICORET DARI PENERIMA CASHBACK]' : '';
      text += `${idx + 1}. ${cust.customerName}${statusNote}\n`;
      text += `   Total Belanja : ${formatRupiah(cust.totalPurchase)}\n`;
      text += `   Total Cashback: ${formatRupiah(cust.totalCashback)} (${ratio}%)${cust.isExcludedFromCashback ? ' (Hak Dicoret)' : ''}\n`;
      text += `   Transaksi     : ${cust.invoiceCount} Faktur\n\n`;
    });

    navigator.clipboard.writeText(text);
    setCopiedAll(true);
    setTimeout(() => {
      setCopiedAll(false);
    }, 3000);
  };

  // Open WhatsApp template with customer's breakdown
  const handleContactWhatsApp = (cust: CustomerSummary, idx: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const cleanPhone = (cust.customerPhone || '').replace(/\D/g, '');
    const formattedPhone = cleanPhone.startsWith('0') ? '62' + cleanPhone.slice(1) : cleanPhone;
    if (!formattedPhone) return;

    const ratio = cust.totalPurchase > 0 ? ((cust.totalCashback / cust.totalPurchase) * 100).toFixed(1) : '0';
    const parcelNote = cust.getParcel ? '\n🎁 Anda juga berhak mendapatkan Hadiah Parcel Belanja dari kami.' : '';

    const message = encodeURIComponent(
      `Halo Kak ${cust.customerName},\n\nBerikut rekap data belanja & cashback Anda di *${storeName}*:\n\n` +
      `*Total Belanja : ${formatRupiah(cust.totalPurchase)}*\n` +
      `*Total Cashback: ${formatRupiah(cust.totalCashback)} (${ratio}%)*\n` +
      `*Transaksi     : ${cust.invoiceCount} Faktur*${parcelNote}\n\n` +
      `Terima kasih telah setia berbelanja bersama kami!`
    );

    const url = `https://wa.me/${formattedPhone}?text=${message}`;
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const totalInvoicesCount = useMemo(() => {
    return filtered.reduce((sum, c) => sum + c.invoiceCount, 0);
  }, [filtered]);

  const excludedCount = useMemo(() => {
    return resolvedSummaries.filter((c) => c.isExcludedFromCashback).length;
  }, [resolvedSummaries]);

  return (
    <div className="space-y-4">
      
      {/* Focused Header for Per-Customer Data */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-2xs space-y-4">
        
        {/* Title Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-emerald-600 text-white">
                <Users className="w-4 h-4" />
              </div>
              <h1 className="text-base sm:text-lg font-bold text-slate-900">
                Rekap Data Per Tiap Konsumen
              </h1>
              <span className="text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                {filtered.length} Konsumen Terdata
              </span>
              {excludedCount > 0 && (
                <span className="text-[11px] font-bold bg-rose-50 text-rose-800 border border-rose-200 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <UserX className="w-3 h-3 text-rose-600" /> {excludedCount} Dicoret
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Data akumulasi per tiap konsumen dari <strong>Rekap Faktur</strong>. Anda dapat mengatur siapa saja konsumen yang <strong>dicoret</strong> dari hak penerimaan cashback.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            
            {/* View Mode Switcher */}
            <div className="flex items-center p-0.5 bg-slate-100 rounded-lg text-xs">
              <button
                onClick={() => setViewMode('cards')}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-md font-medium transition-colors ${
                  viewMode === 'cards'
                    ? 'bg-white text-slate-900 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Tampilan Kartu Rincian Per Konsumen"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Kartu Konsumen</span>
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-md font-medium transition-colors ${
                  viewMode === 'table'
                    ? 'bg-white text-slate-900 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Tampilan Tabel Data Konsumen"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Tabel Data</span>
              </button>
            </div>

            {/* Toggle Expand / Collapse All */}
            <button
              onClick={handleToggleExpandAll}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors"
              title="Buka atau tutup seluruh rincian faktur konsumen"
            >
              {expandedKeys.size >= filtered.length && filtered.length > 0 ? (
                <>
                  <ChevronUp className="w-3.5 h-3.5 text-slate-500" />
                  <span>Tutup Semua Rincian</span>
                </>
              ) : (
                <>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                  <span>Buka Semua Rincian</span>
                </>
              )}
            </button>

            {/* Salin Rekap Teks */}
            <button
              onClick={handleCopyAllRecap}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg transition-colors"
              title="Salin data pertiap konsumen dalam format teks (Dr Santi, Dr Sany...)"
            >
              {copiedAll ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700 font-bold">Tersalin!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Salin Rekap Teks</span>
                </>
              )}
            </button>

            {/* Export Excel */}
            <button
              onClick={onExportExcel}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg shadow-2xs transition-colors shrink-0"
              title="Export rekap lengkap konsumen ke Excel"
            >
              <Download className="w-3.5 h-3.5 text-emerald-700" />
              <span>Export Excel</span>
            </button>

          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5">
          
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Cari nama konsumen..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-slate-900 font-medium"
            />
          </div>

          {/* Eligibility Filter (Coret / Aktif) */}
          <div>
            <select
              value={eligibilityFilter}
              onChange={(e) => setEligibilityFilter(e.target.value as any)}
              className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-slate-900 font-semibold"
            >
              <option value="all">Semua Status Hak Cashback</option>
              <option value="active">Penerima Aktif (Belum Dicoret)</option>
              <option value="excluded">Konsumen yang Dicoret ({excludedCount})</option>
            </select>
          </div>

          {/* Sort By */}
          <div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-slate-900 font-medium"
            >
              <option value="rank_asc">Urutan: Sesuai Urutan (#1, #2...)</option>
              <option value="purchase_desc">Urutan: Total Belanja Terbesar</option>
              <option value="cashback_desc">Urutan: Total Cashback Tertinggi</option>
              <option value="invoices_desc">Urutan: Faktur Terbanyak</option>
              <option value="name_asc">Urutan: Nama Konsumen (A-Z)</option>
            </select>
          </div>

          {/* Tier Filter */}
          <div>
            <select
              value={tierFilter}
              onChange={(e) => setTierFilter(e.target.value as any)}
              className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-slate-900 font-medium"
            >
              <option value="all">Semua Tier Loyalitas</option>
              <option value="Platinum">Tier Platinum (≥ Rp 15 Jt)</option>
              <option value="Gold">Tier Gold (≥ Rp 7.5 Jt)</option>
              <option value="Silver">Tier Silver (≥ Rp 3 Jt)</option>
              <option value="Bronze">Tier Bronze</option>
            </select>
          </div>

          {/* Parcel Filter */}
          <div>
            <select
              value={parcelFilter}
              onChange={(e) => setParcelFilter(e.target.value as any)}
              className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-slate-900 font-medium"
            >
              <option value="all">Semua Status Parcel</option>
              <option value="parcel">🎁 Khusus Penerima Parcel</option>
              <option value="non_parcel">Belum Berhak Parcel</option>
            </select>
          </div>

        </div>

      </div>

      {/* Main List: Per-Customer Cards */}
      {viewMode === 'cards' && (
        <div className="space-y-3">
          {filtered.length === 0 ? (
            <div className="p-10 text-center text-slate-400 bg-white rounded-xl border border-slate-200">
              <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-700">Tidak ada data konsumen yang sesuai filter.</p>
              <p className="text-xs text-slate-400 mt-1">
                Periksa kata kunci pencarian atau sesuaikan filter status hak cashback.
              </p>
            </div>
          ) : (
            filtered.map((cust, idx) => {
              const key = getCustomerKey(cust, idx);
              const isExpanded = expandedKeys.has(key);
              const isCopied = copiedKey === key;
              const ratio = cust.totalPurchase > 0 ? ((cust.totalCashback / cust.totalPurchase) * 100).toFixed(1) : '0';
              const hasInvoices = Boolean(cust.invoices && cust.invoices.length > 0);
              const unclaimed = Math.max(0, cust.totalCashback - cust.disbursedCashback);
              const isExcluded = Boolean(cust.isExcludedFromCashback);

              return (
                <div 
                  key={key}
                  className={`bg-white rounded-xl border shadow-2xs overflow-hidden transition-all ${
                    isExcluded 
                      ? 'border-rose-200 bg-rose-50/15' 
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {/* Customer Card Content */}
                  <div className="p-4 sm:p-5">
                    
                    {/* Header Row: Number + Name */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      
                      <div className="flex items-start gap-3">
                        <span className={`w-8 h-8 rounded-lg font-mono font-bold text-sm flex items-center justify-center shrink-0 shadow-2xs mt-0.5 ${
                          isExcluded ? 'bg-rose-600 text-white' : 'bg-slate-900 text-white'
                        }`}>
                          {idx + 1}
                        </span>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h2 className={`text-base sm:text-lg font-black tracking-tight ${
                              isExcluded ? 'line-through text-slate-400' : 'text-slate-900'
                            }`}>
                              {cust.customerName}
                            </h2>

                            {isExcluded && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-300 flex items-center gap-1 shadow-2xs">
                                <UserX className="w-3 h-3 text-rose-600" /> Dicoret dari Penerima
                              </span>
                            )}

                            {cust.customerCode && (
                              <span className="text-[11px] font-mono font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
                                {cust.customerCode}
                              </span>
                            )}
                            <span
                              className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                                cust.tier === 'Platinum'
                                  ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                  : cust.tier === 'Gold'
                                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                  : cust.tier === 'Silver'
                                  ? 'bg-slate-100 text-slate-700 border border-slate-200'
                                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              }`}
                            >
                              {cust.tier}
                            </span>
                            {cust.getParcel && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1 shadow-2xs">
                                <Gift className="w-3 h-3 text-amber-600" /> Hadiah Parcel
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 text-xs text-slate-500 font-mono mt-0.5">
                            <span>No. Telp: {cust.customerPhone || 'Tanpa Kontak'}</span>
                            <span aria-hidden="true">·</span>
                            <span>Terakhir: {cust.lastPurchaseDate}</span>
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-1.5 self-start sm:self-auto flex-wrap">
                        
                        {/* Coret / Pulihkan Toggle Button */}
                        {onToggleExcludeCustomer && (
                          isExcluded ? (
                            <button
                              type="button"
                              onClick={() => onToggleExcludeCustomer(cust.customerName)}
                              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg transition-colors"
                              title="Pulihkan hak cashback konsumen ini"
                            >
                              <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Pulihkan Konsumen</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setCustomerToExclude(cust.customerName)}
                              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors"
                              title="Coret konsumen ini dari daftar penerima cashback"
                            >
                              <UserX className="w-3.5 h-3.5 text-rose-600" />
                              <span>Coret dari Penerima</span>
                            </button>
                          )
                        )}

                        <button
                          onClick={() => toggleExpand(key)}
                          className={`flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-lg border transition-colors ${
                            isExpanded
                              ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                              : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                          }`}
                          title="Buka atau tutup rincian faktur transaksi konsumen ini"
                        >
                          <span>{isExpanded ? 'Tutup Rincian' : 'Rincian Faktur'}</span>
                          <span className="text-[10px] font-normal opacity-80 font-mono">({cust.invoiceCount})</span>
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5 ml-0.5" /> : <ChevronDown className="w-3.5 h-3.5 ml-0.5" />}
                        </button>

                        <button
                          onClick={(e) => handleCopyCustomer(cust, idx, e)}
                          className="p-1.5 text-purple-700 hover:text-purple-900 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg transition-colors"
                          title="Salin data teks konsumen ini"
                        >
                          {isCopied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                        </button>

                        <button
                          onClick={(e) => handleContactWhatsApp(cust, idx, e)}
                          className="p-1.5 text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg transition-colors"
                          title="Kirim rincian via WhatsApp"
                        >
                          <Phone className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => onSelectCustomerForInvoices(cust.customerName)}
                          className="p-1.5 text-slate-600 hover:text-emerald-700 bg-slate-50 hover:bg-emerald-50 border border-slate-200 rounded-lg transition-colors"
                          title="Buka faktur konsumen ini di tab Rekap Faktur"
                        >
                          <Receipt className="w-4 h-4" />
                        </button>

                        {onOpenCustomerDisbursement && !isExcluded && unclaimed > 0 && (
                          <button
                            onClick={() => onOpenCustomerDisbursement(cust)}
                            className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-2xs transition-colors shrink-0"
                            title={`Cairkan cashback ${formatRupiah(unclaimed)} untuk ${cust.customerName}`}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Cairkan ({formatRupiah(unclaimed)})</span>
                          </button>
                        )}
                      </div>

                    </div>

                    {/* Exact User Specification Block: Total Belanja, Total Cashback, Transaksi */}
                    <div className="mt-3.5 p-3.5 bg-slate-50/80 rounded-xl border border-slate-200/80">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono">
                        
                        {/* 1. Total Belanja */}
                        <div className="flex sm:flex-col justify-between sm:justify-start items-center sm:items-start p-2 bg-white rounded-lg border border-slate-100">
                          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider font-sans">
                            Total Belanja
                          </span>
                          <span className="text-base sm:text-lg font-black text-slate-900 mt-0.5">
                            {formatRupiah(cust.totalPurchase)}
                          </span>
                        </div>

                        {/* 2. Total Cashback */}
                        <div className={`flex sm:flex-col justify-between sm:justify-start items-center sm:items-start p-2 bg-white rounded-lg border ${
                          isExcluded ? 'border-rose-200' : 'border-emerald-100'
                        }`}>
                          <div className="flex items-center gap-1.5 font-sans">
                            <span className={`text-[11px] font-bold uppercase tracking-wider ${
                              isExcluded ? 'text-rose-700' : 'text-emerald-800'
                            }`}>
                              Total Cashback
                            </span>
                            <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                              isExcluded ? 'bg-rose-100 text-rose-800' : 'bg-emerald-50 text-emerald-700'
                            }`}>
                              {ratio}%
                            </span>
                          </div>
                          <div className="mt-0.5">
                            <span className={`text-base sm:text-lg font-black ${
                              isExcluded ? 'line-through text-slate-400' : 'text-emerald-700'
                            }`}>
                              {formatRupiah(cust.totalCashback)}
                            </span>
                            {isExcluded && (
                              <span className="text-[10px] text-rose-600 font-bold font-sans block">
                                (Hak Cashback Dicoret)
                              </span>
                            )}
                          </div>
                        </div>

                        {/* 3. Transaksi */}
                        <div className="flex sm:flex-col justify-between sm:justify-start items-center sm:items-start p-2 bg-white rounded-lg border border-slate-100">
                          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider font-sans">
                            Transaksi
                          </span>
                          <span className="text-base sm:text-lg font-black text-slate-800 mt-0.5">
                            {cust.invoiceCount} Faktur
                          </span>
                        </div>

                      </div>

                      {/* Sub-bar: Status Pencairan & Rekening */}
                      <div className="mt-2.5 pt-2.5 border-t border-slate-200/70 flex flex-wrap items-center justify-between gap-2 text-xs">
                        <div className="flex flex-wrap items-center gap-3 font-mono text-[11px]">
                          <span>
                            Sudah Dicairkan: <strong className="text-slate-800">{formatRupiah(cust.disbursedCashback)}</strong>
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>
                            Sisa Belum Cair: <strong className={unclaimed > 0 ? (isExcluded ? 'text-slate-500 line-through' : 'text-amber-700') : 'text-emerald-600'}>
                              {formatRupiah(unclaimed)}
                            </strong>
                          </span>
                        </div>

                        {(cust.bankName || cust.eWalletType) && (
                          <div className="text-[11px] text-slate-600 flex items-center gap-1 font-mono">
                            <Building2 className="w-3.5 h-3.5 text-slate-400" />
                            <span>
                              {cust.bankName ? `${cust.bankName} - ${cust.bankAccountNumber}` : `${cust.eWalletType} - ${cust.eWalletNumber}`}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                  </div>

                  {/* Expandable Itemized Invoices from Rekap Faktur */}
                  {isExpanded && (
                    <div className="bg-slate-50 border-t border-slate-200 p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                          <Receipt className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Rincian Faktur Transaksi Konsumen ({cust.customerName})</span>
                        </div>
                        <span className="text-[11px] text-slate-500 font-mono">
                          Diambil dari {cust.invoiceCount} Rekap Faktur
                        </span>
                      </div>

                      {hasInvoices ? (
                        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-2xs">
                          <table className="w-full text-left border-collapse text-xs">
                            <thead>
                              <tr className="bg-slate-100/80 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                                <th className="py-2.5 px-3">No. Faktur</th>
                                <th className="py-2.5 px-3">Tanggal</th>
                                <th className="py-2.5 px-3">Kategori</th>
                                <th className="py-2.5 px-3 text-right">Nilai Belanja</th>
                                <th className="py-2.5 px-3 text-right">Cashback (% & Rp)</th>
                                <th className="py-2.5 px-3 text-center">Status Klaim</th>
                                <th className="py-2.5 px-3">Catatan</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 font-mono text-xs">
                              {cust.invoices!.map((inv, invIdx) => (
                                <tr key={inv.id || `${inv.invoiceNumber}_${invIdx}`} className="hover:bg-slate-50/80 transition-colors">
                                  <td className="py-2 px-3 font-bold font-sans text-slate-900">
                                    {inv.invoiceNumber}
                                  </td>
                                  <td className="py-2 px-3 text-slate-600 text-[11px]">
                                    {inv.date}
                                  </td>
                                  <td className="py-2 px-3 font-sans text-slate-700">
                                    {inv.category || '-'}
                                  </td>
                                  <td className="py-2 px-3 text-right text-slate-900 font-semibold">
                                    {formatRupiah(inv.purchaseAmount)}
                                  </td>
                                  <td className="py-2 px-3 text-right text-emerald-700 font-bold">
                                    {formatRupiah(inv.cashbackAmount)}
                                    <span className="text-[10px] text-slate-400 font-normal ml-1">
                                      ({inv.cashbackPercentage}%)
                                    </span>
                                  </td>
                                  <td className="py-2 px-3 text-center font-sans">
                                    <span
                                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                        inv.claimStatus === 'disbursed'
                                          ? 'bg-emerald-100 text-emerald-800'
                                          : inv.claimStatus === 'ready'
                                          ? 'bg-blue-100 text-blue-800'
                                          : 'bg-amber-100 text-amber-800'
                                      }`}
                                    >
                                      {inv.claimStatus === 'disbursed' ? 'Sudah Cair' : inv.claimStatus === 'ready' ? 'Siap Cair' : 'Pending'}
                                    </span>
                                  </td>
                                  <td className="py-2 px-3 font-sans text-slate-500 text-[11px] truncate max-w-xs">
                                    {inv.notes || inv.itemsDescription || '-'}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot>
                              <tr className="bg-slate-50/90 font-bold border-t border-slate-200 font-mono text-xs text-slate-900">
                                <td colSpan={3} className="py-2 px-3 font-sans uppercase text-[10px] text-slate-600 font-bold">
                                  Subtotal {cust.customerName}:
                                </td>
                                <td className="py-2 px-3 text-right text-slate-900 font-black">
                                  {formatRupiah(cust.totalPurchase)}
                                </td>
                                <td className="py-2 px-3 text-right text-emerald-700 font-black">
                                  {formatRupiah(cust.totalCashback)}
                                </td>
                                <td colSpan={2}></td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      ) : (
                        <div className="p-4 bg-white rounded-lg border border-slate-200 text-center text-xs text-slate-400">
                          Tidak ada faktur transaksi yang terdeteksi untuk konsumen ini di Rekap Faktur.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* View 2: Compact Table View */}
      {viewMode === 'table' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  <th className="py-3 px-3 w-10 text-center">No</th>
                  <th className="py-3 px-3.5">Nama Konsumen</th>
                  <th className="py-3 px-3.5 text-right font-black text-slate-900">Total Belanja</th>
                  <th className="py-3 px-3.5 text-right font-black text-emerald-800">Total Cashback</th>
                  <th className="py-3 px-3 text-center">Status Hak</th>
                  <th className="py-3 px-3 text-center">Transaksi</th>
                  <th className="py-3 px-3 text-center">Parcel</th>
                  <th className="py-3 px-3.5 text-right">Sudah Cair</th>
                  <th className="py-3 px-3.5 text-right">Sisa Belum Cair</th>
                  <th className="py-3 px-3 text-center">Faktur</th>
                  <th className="py-3 px-3.5 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="py-12 text-center text-slate-400">
                      <Users className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                      <p className="font-semibold text-slate-700">Tidak ada konsumen yang sesuai kriteria.</p>
                    </td>
                  </tr>
                ) : (
                  filtered.map((cust, idx) => {
                    const key = getCustomerKey(cust, idx);
                    const isExpanded = expandedKeys.has(key);
                    const unclaimed = Math.max(0, cust.totalCashback - cust.disbursedCashback);
                    const isExcluded = Boolean(cust.isExcludedFromCashback);

                    return (
                      <React.Fragment key={key}>
                        <tr className={`hover:bg-slate-50/70 transition-colors ${isExcluded ? 'bg-rose-50/20' : ''}`}>
                          <td className="py-3 px-3 text-center font-mono font-bold text-slate-600">
                            {idx + 1}
                          </td>
                          <td className="py-3 px-3.5 font-bold text-slate-900 text-sm">
                            <div className="flex items-center gap-1.5">
                              <span className={isExcluded ? 'line-through text-slate-400' : ''}>
                                {cust.customerName}
                              </span>
                              {cust.customerCode && (
                                <span className="text-[10px] font-mono font-semibold text-slate-500 bg-slate-100 px-1 py-0.2 rounded">
                                  {cust.customerCode}
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono font-normal">
                              {cust.customerPhone || 'Tanpa Kontak'}
                            </div>
                          </td>
                          <td className="py-3 px-3.5 text-right font-mono tabular-nums text-slate-900 font-black text-sm">
                            {formatRupiah(cust.totalPurchase)}
                          </td>
                          <td className="py-3 px-3.5 text-right font-mono tabular-nums font-black text-sm">
                            <span className={isExcluded ? 'line-through text-slate-400' : 'text-emerald-700'}>
                              {formatRupiah(cust.totalCashback)}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center">
                            {isExcluded ? (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-200">
                                Dicoret
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                                Berhak
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-center font-mono text-slate-800 font-bold">
                            {cust.invoiceCount} Faktur
                          </td>
                          <td className="py-3 px-3 text-center">
                            {cust.getParcel ? (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                                🎁 Ya
                              </span>
                            ) : (
                              <span className="text-[11px] text-slate-400">-</span>
                            )}
                          </td>
                          <td className="py-3 px-3.5 text-right font-mono tabular-nums text-slate-600">
                            {formatRupiah(cust.disbursedCashback)}
                          </td>
                          <td className="py-3 px-3.5 text-right font-mono tabular-nums font-bold">
                            {unclaimed > 0 ? (
                              <span className={`px-2 py-0.5 rounded border text-xs ${
                                isExcluded ? 'text-slate-500 bg-slate-100 border-slate-200 line-through' : 'text-amber-700 bg-amber-50 border-amber-200'
                              }`}>
                                {formatRupiah(unclaimed)}
                              </span>
                            ) : (
                              <span className="text-emerald-600 text-[11px] font-semibold">Lunas</span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <button
                              onClick={() => toggleExpand(key)}
                              className="text-xs text-slate-600 hover:text-slate-900 p-1 hover:bg-slate-100 rounded transition-colors inline-flex items-center gap-1 font-mono"
                            >
                              <span>{cust.invoiceCount}</span>
                              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                            </button>
                          </td>
                          <td className="py-3 px-3.5 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1">
                              {onToggleExcludeCustomer && (
                                isExcluded ? (
                                  <button
                                    onClick={() => onToggleExcludeCustomer(cust.customerName)}
                                    title="Pulihkan hak cashback"
                                    className="p-1.5 text-emerald-800 hover:bg-emerald-100 bg-emerald-50 rounded-lg transition-colors border border-emerald-300"
                                  >
                                    <UserCheck className="w-3.5 h-3.5" />
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => setCustomerToExclude(cust.customerName)}
                                    title="Coret konsumen dari penerima cashback"
                                    className="p-1.5 text-rose-700 hover:bg-rose-100 bg-rose-50 rounded-lg transition-colors border border-rose-200"
                                  >
                                    <UserX className="w-3.5 h-3.5" />
                                  </button>
                                )
                              )}
                              <button
                                onClick={(e) => handleCopyCustomer(cust, idx, e)}
                                title="Salin data teks"
                                className="p-1.5 text-purple-700 hover:text-purple-900 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors border border-purple-200"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={(e) => handleContactWhatsApp(cust, idx, e)}
                                title="Kirim via WhatsApp"
                                className="p-1.5 text-emerald-700 hover:text-emerald-800 hover:bg-emerald-100 bg-emerald-50 rounded-lg transition-colors border border-emerald-300"
                              >
                                <Phone className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => onSelectCustomerForInvoices(cust.customerName)}
                                title="Buka di Rekap Faktur"
                                className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200"
                              >
                                <Receipt className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>

                        {/* Sub-table when expanded */}
                        {isExpanded && cust.invoices && (
                          <tr className="bg-slate-50/90">
                            <td colSpan={11} className="p-3 sm:p-4">
                              <div className="rounded-lg border border-slate-200 bg-white p-3 space-y-2">
                                <div className="text-xs font-bold text-slate-800">
                                  Rincian Faktur: {cust.customerName} ({cust.invoiceCount} Faktur di Rekap Faktur)
                                </div>
                                <table className="w-full text-left text-xs font-mono">
                                  <thead>
                                    <tr className="border-b border-slate-200 text-[10px] text-slate-500 uppercase">
                                      <th className="py-1 px-2">No. Faktur</th>
                                      <th className="py-1 px-2">Tanggal</th>
                                      <th className="py-1 px-2">Kategori</th>
                                      <th className="py-1 px-2 text-right">Belanja</th>
                                      <th className="py-1 px-2 text-right">Cashback</th>
                                      <th className="py-1 px-2 text-center">Status</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100 text-[11px]">
                                    {cust.invoices.map((inv, invIdx) => (
                                      <tr key={inv.id || `${inv.invoiceNumber}_${invIdx}`}>
                                        <td className="py-1 px-2 font-bold font-sans text-slate-900">{inv.invoiceNumber}</td>
                                        <td className="py-1 px-2 text-slate-600">{inv.date}</td>
                                        <td className="py-1 px-2 font-sans text-slate-700">{inv.category || '-'}</td>
                                        <td className="py-1 px-2 text-right text-slate-900 font-semibold">{formatRupiah(inv.purchaseAmount)}</td>
                                        <td className="py-1 px-2 text-right text-emerald-700 font-bold">{formatRupiah(inv.cashbackAmount)}</td>
                                        <td className="py-1 px-2 text-center font-sans">
                                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 font-medium">
                                            {inv.claimStatus === 'disbursed' ? 'Sudah Cair' : inv.claimStatus === 'ready' ? 'Siap Cair' : 'Pending'}
                                          </span>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Confirmation Dialog to Disqualify / Strike-through Customer */}
      <ConfirmDialog
        isOpen={customerToExclude !== null}
        title="Coret Konsumen dari Penerima Cashback?"
        message={`Apakah Anda yakin ingin mencoret "${customerToExclude}" dari daftar konsumen yang berhak menerima cashback? Hak cashback konsumen ini akan dinonaktifkan dari daftar penerima.`}
        confirmLabel="Ya, Coret Konsumen"
        cancelLabel="Batal"
        isDestructive={true}
        onConfirm={() => {
          if (customerToExclude && onToggleExcludeCustomer) {
            onToggleExcludeCustomer(customerToExclude);
          }
          setCustomerToExclude(null);
        }}
        onCancel={() => setCustomerToExclude(null)}
      />

    </div>
  );
};
