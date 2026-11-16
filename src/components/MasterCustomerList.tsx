import React, { useState, useMemo } from 'react';
import { 
  Users, 
  Search, 
  UserPlus, 
  Edit3, 
  Trash2, 
  Download, 
  Phone, 
  Receipt, 
  Wallet, 
  CheckCircle2, 
  XCircle,
  MapPin,
  RefreshCw,
  Upload,
  AlertTriangle,
  UserX,
  Eye
} from 'lucide-react';
import { CustomerMaster, CustomerSummary, Invoice } from '../types/cashback';
import { formatRupiah, formatNumber } from '../utils/cashbackCalculator';
import { isValidRealPhone, normalizeCustomerName, normalizePhone } from '../utils/storage';
import { ConfirmDialog } from './ConfirmDialog';
import { PaginationBar } from './PaginationBar';

interface MasterCustomerListProps {
  customers: CustomerMaster[];
  invoices: Invoice[];
  customerSummaries: CustomerSummary[];
  onOpenNewCustomer?: () => void;
  onEditCustomer?: (customer: CustomerMaster) => void;
  onDeleteCustomer?: (customerId: string) => void;
  onToggleStatus?: (customerId: string) => void;
  onSelectCustomerForInvoices: (customerName: string) => void;
  onExportExcel?: () => void;
  onOpenImportExcel?: () => void;
  onSyncWithInvoices?: () => void;
  isReadOnly?: boolean;
}

export const MasterCustomerList: React.FC<MasterCustomerListProps> = ({
  customers,
  invoices,
  customerSummaries,
  onOpenNewCustomer,
  onEditCustomer,
  onDeleteCustomer,
  onToggleStatus,
  onSelectCustomerForInvoices,
  onExportExcel,
  onOpenImportExcel,
  onSyncWithInvoices,
  isReadOnly = false,
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [txFilter, setTxFilter] = useState<'all' | 'with_tx' | 'no_tx'>('all');
  const [cityFilter, setCityFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name_asc' | 'code_asc' | 'cashback_desc' | 'purchase_desc' | 'invoices_desc' | 'joined_desc'>('code_asc');
  const [rowsPerPage, setRowsPerPage] = useState<number | 'all'>(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [deletingCustomer, setDeletingCustomer] = useState<CustomerMaster | null>(null);

  // Build strict, collision-free lookup maps from real customerSummaries:
  // 1) Primary index: normalized customer name
  // 2) Secondary index: normalized phone ONLY if valid and unique to a single customer
  const { statsByName, statsByUniquePhone } = useMemo(() => {
    const byName = new Map<string, CustomerSummary>();
    const phoneBuckets = new Map<string, CustomerSummary[]>();

    for (const cs of customerSummaries) {
      const cleanName = normalizeCustomerName(cs.customerName);
      if (cleanName) {
        byName.set(cleanName, cs);
      }
      if (isValidRealPhone(cs.customerPhone)) {
        const normPhone = normalizePhone(cs.customerPhone);
        if (normPhone.length >= 7) {
          const list = phoneBuckets.get(normPhone) || [];
          list.push(cs);
          phoneBuckets.set(normPhone, list);
        }
      }
    }

    const byUniquePhone = new Map<string, CustomerSummary>();
    for (const [phone, list] of phoneBuckets.entries()) {
      if (list.length === 1) {
        byUniquePhone.set(phone, list[0]);
      }
    }

    return { statsByName: byName, statsByUniquePhone: byUniquePhone };
  }, [customerSummaries]);

  const getStatsForCustomer = (cust: CustomerMaster): CustomerSummary | undefined => {
    const byName = statsByName.get(normalizeCustomerName(cust.name));
    if (byName) return byName;
    if (isValidRealPhone(cust.phone)) {
      return statsByUniquePhone.get(normalizePhone(cust.phone));
    }
    return undefined;
  };

  // Detect master vs real invoice discrepancies (missing real customers or duplicate master names)
  const { missingFromMasterCount, duplicateMasterCount } = useMemo(() => {
    const masterNameSet = new Set<string>();
    let duplicates = 0;

    for (const c of customers) {
      const clean = normalizeCustomerName(c.name);
      if (!clean) continue;
      if (masterNameSet.has(clean)) {
        duplicates += 1;
      } else {
        masterNameSet.add(clean);
      }
    }

    let missing = 0;
    const seenInvoiceNames = new Set<string>();
    for (const inv of invoices) {
      const clean = normalizeCustomerName(inv.customerName);
      if (!clean || seenInvoiceNames.has(clean)) continue;
      seenInvoiceNames.add(clean);
      if (!masterNameSet.has(clean)) {
        missing += 1;
      }
    }

    return { missingFromMasterCount: missing, duplicateMasterCount: duplicates };
  }, [customers, invoices]);

  // Real aggregate totals matching Dashboard / Rekap Konsumen
  const realTotals = useMemo(() => {
    let totalPurchase = 0;
    let totalCashback = 0;
    let totalEligibleCashback = 0;
    let excludedCount = 0;

    for (const cs of customerSummaries) {
      totalPurchase += cs.totalPurchase || 0;
      totalCashback += cs.totalCashback || 0;
      if (cs.isExcludedFromCashback) {
        excludedCount += 1;
      } else {
        totalEligibleCashback += cs.totalCashback || 0;
      }
    }

    return {
      totalPurchase,
      totalCashback,
      totalEligibleCashback,
      excludedCount,
      withTxCount: customerSummaries.length,
    };
  }, [customerSummaries]);

  // Cities list
  const cities = useMemo(() => {
    const set = new Set<string>();
    for (const c of customers) {
      if (c.city && c.city.trim()) set.add(c.city.trim());
    }
    return Array.from(set).sort();
  }, [customers]);

  // Filtered and sorted customers
  const filteredCustomers = useMemo(() => {
    let list = customers.filter((c) => {
      const summary = getStatsForCustomer(c);

      // Search
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const matchName = c.name.toLowerCase().includes(q);
        const matchCode = c.customerCode.toLowerCase().includes(q);
        const matchPhone =
          c.phone.toLowerCase().includes(q) ||
          (summary?.customerPhone || '').toLowerCase().includes(q);
        const matchCity = c.city?.toLowerCase().includes(q);
        const matchBank = c.bankName?.toLowerCase().includes(q) || c.bankAccountNumber?.includes(q);
        if (!matchName && !matchCode && !matchPhone && !matchCity && !matchBank) return false;
      }

      // Status
      if (statusFilter === 'active' && !c.isActive) return false;
      if (statusFilter === 'inactive' && c.isActive) return false;

      // Transaction existence filter
      const hasTx = (summary?.invoiceCount || 0) > 0;
      if (txFilter === 'with_tx' && !hasTx) return false;
      if (txFilter === 'no_tx' && hasTx) return false;

      // City
      if (cityFilter !== 'all' && (c.city || '').trim() !== cityFilter) return false;

      return true;
    });

    // Sorting
    list.sort((a, b) => {
      if (sortBy === 'name_asc') {
        return a.name.localeCompare(b.name);
      }
      if (sortBy === 'code_asc') {
        return (a.customerCode || '').localeCompare(b.customerCode || '');
      }
      if (sortBy === 'joined_desc') {
        return new Date(b.joinedDate || 0).getTime() - new Date(a.joinedDate || 0).getTime();
      }
      if (sortBy === 'cashback_desc') {
        const cbA = getStatsForCustomer(a)?.totalCashback || 0;
        const cbB = getStatsForCustomer(b)?.totalCashback || 0;
        if (cbB !== cbA) return cbB - cbA;
        return a.name.localeCompare(b.name);
      }
      if (sortBy === 'purchase_desc') {
        const pA = getStatsForCustomer(a)?.totalPurchase || 0;
        const pB = getStatsForCustomer(b)?.totalPurchase || 0;
        if (pB !== pA) return pB - pA;
        return a.name.localeCompare(b.name);
      }
      if (sortBy === 'invoices_desc') {
        const iA = getStatsForCustomer(a)?.invoiceCount || 0;
        const iB = getStatsForCustomer(b)?.invoiceCount || 0;
        if (iB !== iA) return iB - iA;
        return a.name.localeCompare(b.name);
      }
      return 0;
    });

    return list;
  }, [customers, search, statusFilter, txFilter, cityFilter, sortBy, statsByName, statsByUniquePhone]);

  const paginatedCustomers = useMemo(() => {
    if (rowsPerPage === 'all') return filteredCustomers;
    const totalPages = Math.max(1, Math.ceil(filteredCustomers.length / rowsPerPage));
    const safePage = Math.min(Math.max(1, currentPage), totalPages);
    const start = (safePage - 1) * rowsPerPage;
    return filteredCustomers.slice(start, start + rowsPerPage);
  }, [filteredCustomers, rowsPerPage, currentPage]);

  const activeCount = customers.filter((c) => c.isActive).length;

  const resolveDisplayPhone = (cust: CustomerMaster, summary?: CustomerSummary): string => {
    if (isValidRealPhone(cust.phone)) return cust.phone.trim();
    if (isValidRealPhone(summary?.customerPhone)) return summary!.customerPhone.trim();
    return '';
  };

  const handleContactWhatsApp = (phone: string, name: string) => {
    if (!isValidRealPhone(phone)) return;
    const cleanPhone = phone.replace(/\D/g, '');
    const formattedPhone = cleanPhone.startsWith('0') ? '62' + cleanPhone.slice(1) : cleanPhone;
    const url = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(`Halo Kak ${name}, salam hangat dari toko kami!`)}`;
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="space-y-4">

      {isReadOnly && (
        <div className="px-3.5 py-2.5 rounded-xl bg-slate-100 border border-slate-200 flex items-center gap-2 text-xs text-slate-700">
          <Eye className="w-4 h-4 text-emerald-700 shrink-0" />
          <span>
            <strong>Mode Lihat Saja (Petugas)</strong> — Anda dapat mencari dan melihat profil Master Konsumen beserta riwayat fakturnya. Penambahan, perubahan status, edit, maupun penghapusan data hanya tersedia pada Mode Admin.
          </span>
        </div>
      )}
      
      {/* Sync Warning Banner if any real customers from invoices are missing or duplicated in Master */}
      {!isReadOnly && (missingFromMasterCount > 0 || duplicateMasterCount > 0) && onSyncWithInvoices && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-950">
              <p className="font-bold">Ditemukan selisih Master Konsumen dengan data Rekap Faktur</p>
              <p className="text-[11px] text-amber-800 mt-0.5">
                {missingFromMasterCount > 0 && `${missingFromMasterCount} konsumen dari faktur belum terdaftar di Master. `}
                {duplicateMasterCount > 0 && `${duplicateMasterCount} data nama konsumen ganda terdeteksi. `}
                Klik sinkronkan agar seluruh data Master Konsumen sesuai 100% dengan data real.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onSyncWithInvoices}
            className="flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-xs transition-colors shrink-0"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Sinkronkan Data Real</span>
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-blue-50 text-blue-700">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-900">
                  Master Data Konsumen
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  Database master identitas konsumen tersinkronisasi langsung dengan data real Rekap Faktur
                </p>
              </div>
            </div>
          </div>

          {!isReadOnly && (
            <div className="flex flex-wrap items-center gap-2">
              {onSyncWithInvoices && (
                <button
                  type="button"
                  onClick={onSyncWithInvoices}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors"
                  title="Sinkronkan ulang Master Konsumen dari seluruh faktur real & rapikan duplikat"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Sinkron Data Real</span>
                </button>
              )}

              {onOpenImportExcel && (
                <button
                  onClick={onOpenImportExcel}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors"
                  title="Import master data konsumen dari Excel (.xlsx)"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Import Excel</span>
                </button>
              )}

              {onExportExcel && (
                <button
                  onClick={onExportExcel}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export Master</span>
                </button>
              )}

              {onOpenNewCustomer && (
                <button
                  onClick={onOpenNewCustomer}
                  className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-xs transition-colors"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Tambah Konsumen Baru</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Quick Stats Strip (Synced with Real Data) */}
        <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-slate-500">Total Master Konsumen</span>
            <div className="text-base font-bold text-slate-900 font-mono tabular-nums mt-0.5">
              {formatNumber(customers.length)} Orang
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              {formatNumber(activeCount)} Aktif · {formatNumber(customers.length - activeCount)} Non-Aktif
            </div>
          </div>
          <div>
            <span className="text-slate-500">Konsumen Ada Transaksi</span>
            <div className="text-base font-bold text-blue-700 font-mono tabular-nums mt-0.5">
              {formatNumber(realTotals.withTxCount)} Orang
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              Dari {formatNumber(invoices.length)} faktur aktif
            </div>
          </div>
          <div>
            <span className="text-slate-500">Akumulasi Belanja Real</span>
            <div className="text-base font-bold text-slate-900 font-mono tabular-nums mt-0.5 truncate">
              {formatRupiah(realTotals.totalPurchase)}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              Sesuai total Rekap Faktur
            </div>
          </div>
          <div>
            <span className="text-slate-500">Total Cashback Real</span>
            <div className="text-base font-bold text-emerald-700 font-mono tabular-nums mt-0.5 truncate">
              {formatRupiah(realTotals.totalCashback)}
            </div>
            {realTotals.excludedCount > 0 ? (
              <div className="text-[11px] text-rose-600 font-medium mt-0.5">
                {realTotals.excludedCount} dicoret · Hak aktif: {formatRupiah(realTotals.totalEligibleCashback)}
              </div>
            ) : (
              <div className="text-[11px] text-slate-500 mt-0.5">
                100% cocok dengan Rekap Faktur
              </div>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
          
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Cari nama / kode / no. HP / kota..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-slate-900"
            />
          </div>

          <div>
            <select
              value={txFilter}
              onChange={(e) => {
                setTxFilter(e.target.value as any);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-slate-900"
            >
              <option value="all">Semua Riwayat Faktur</option>
              <option value="with_tx">Memiliki Transaksi Faktur</option>
              <option value="no_tx">Belum Ada Transaksi (0 Faktur)</option>
            </select>
          </div>

          <div>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as any);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-slate-900"
            >
              <option value="all">Semua Status Konsumen</option>
              <option value="active">Hanya Konsumen Aktif</option>
              <option value="inactive">Konsumen Non-Aktif</option>
            </select>
          </div>

          <div>
            <select
              value={cityFilter}
              onChange={(e) => {
                setCityFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-slate-900"
            >
              <option value="all">Semua Kota Domisili</option>
              {cities.map((city) => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value as any);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-slate-900"
            >
              <option value="code_asc">Urutkan Kode (CUST-001)</option>
              <option value="name_asc">Urutkan Nama (A - Z)</option>
              <option value="cashback_desc">Urutkan Cashback Terbesar</option>
              <option value="purchase_desc">Urutkan Belanja Terbesar</option>
              <option value="invoices_desc">Urutkan Faktur Terbanyak</option>
              <option value="joined_desc">Konsumen Terbaru</option>
            </select>
          </div>

        </div>

      </div>

      {/* Mobile Minimalist Card View */}
      <div className="md:hidden space-y-2.5">
        {filteredCustomers.length === 0 ? (
          <div className="p-8 text-center text-slate-400 bg-white rounded-xl border border-slate-200">
            <p className="text-sm font-semibold text-slate-700">Tidak ada konsumen ditemukan</p>
            {!isReadOnly && onOpenNewCustomer && (
              <button
                onClick={onOpenNewCustomer}
                className="mt-3 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 rounded-lg shadow-xs"
              >
                + Tambah Konsumen Baru
              </button>
            )}
          </div>
        ) : (
          paginatedCustomers.map((cust) => {
            const summary = getStatsForCustomer(cust);
            const invoiceCount = summary?.invoiceCount || 0;
            const totalSpend = summary?.totalPurchase || 0;
            const totalCashback = summary?.totalCashback || 0;
            const disbursedCashback = summary?.disbursedCashback || 0;
            const isExcluded = Boolean(summary?.isExcludedFromCashback);
            const displayPhone = resolveDisplayPhone(cust, summary);

            return (
              <div key={cust.id} className={`bg-white rounded-xl border p-3.5 shadow-xs space-y-2.5 ${isExcluded ? 'border-rose-200 bg-rose-50/10' : 'border-slate-200'}`}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">
                        {cust.customerCode}
                      </span>
                      <h3 className={`text-sm font-bold ${isExcluded ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                        {cust.name}
                      </h3>
                      {isExcluded && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-200">
                          <UserX className="w-2.5 h-2.5" /> Dicoret
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono mt-0.5 flex items-center gap-1 flex-wrap">
                      <Phone className={`w-3 h-3 inline ${displayPhone ? 'text-emerald-600' : 'text-slate-300'}`} />
                      <span>{displayPhone || 'Tanpa Kontak'}</span>
                      {cust.city && <span>· {cust.city}</span>}
                    </div>
                  </div>

                  {!isReadOnly && onToggleStatus ? (
                    <button
                      onClick={() => onToggleStatus(cust.id)}
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full transition-colors shrink-0 ${
                        cust.isActive
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {cust.isActive ? 'Aktif' : 'Non-Aktif'}
                    </button>
                  ) : (
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                        cust.isActive
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {cust.isActive ? 'Aktif' : 'Non-Aktif'}
                    </span>
                  )}
                </div>

                {/* Payout Method Info (Cash Only) */}
                <div className="text-[11px] text-emerald-800 bg-emerald-50/70 px-2.5 py-1.5 rounded-lg flex items-center justify-between font-medium border border-emerald-100">
                  <span className="text-slate-600">Metode Pencairan:</span>
                  <span className="font-bold flex items-center gap-1">
                    <Wallet className="w-3 h-3 text-emerald-600" /> Tunai (Cash)
                  </span>
                </div>

                {/* Financial Summary */}
                <div className="grid grid-cols-2 gap-2 p-2 bg-slate-50/70 rounded-lg text-xs font-mono tabular-nums">
                  <div>
                    <span className="text-[10px] text-slate-500 font-sans block">Total Belanja ({invoiceCount} Faktur)</span>
                    <span className="font-semibold text-slate-800">{formatRupiah(totalSpend)}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-500 font-sans block">Total Cashback</span>
                    <span className={`font-bold text-sm ${isExcluded ? 'line-through text-slate-400' : 'text-emerald-700'}`}>
                      {formatRupiah(totalCashback)}
                    </span>
                    {disbursedCashback > 0 && !isExcluded && (
                      <span className="text-[10px] text-emerald-600 font-sans block">
                        Cair: {formatRupiah(disbursedCashback)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Mobile Actions */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                  <button
                    onClick={() => onSelectCustomerForInvoices(cust.name)}
                    className="flex items-center gap-1 px-2.5 py-1 font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors"
                  >
                    <Receipt className="w-3.5 h-3.5" />
                    <span>Faktur ({invoiceCount})</span>
                  </button>

                  {!isReadOnly && (onEditCustomer || onDeleteCustomer) && (
                    <div className="flex items-center gap-1">
                      {onEditCustomer && (
                        <button
                          onClick={() => onEditCustomer(cust)}
                          className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg"
                          title="Edit"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                      )}
                      {onDeleteCustomer && (
                        <button
                          onClick={() => setDeletingCustomer(cust)}
                          className="p-1.5 text-slate-400 hover:text-red-700 hover:bg-red-50 rounded-lg"
                          title="Hapus"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Main Master Table (hidden on mobile, visible on desktop) */}
      <div className="hidden md:block bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4 w-28">Kode</th>
                <th className="py-3 px-4">Nama & Kontak</th>
                <th className="py-3 px-4">Kota & Alamat</th>
                <th className="py-3 px-4">Metode Pencairan Default</th>
                <th className="py-3 px-4 text-right">Akumulasi Belanja</th>
                <th className="py-3 px-4 text-right">Total Cashback</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <p className="text-sm font-semibold text-slate-600">Tidak ada konsumen ditemukan</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {isReadOnly ? 'Coba sesuaikan kata kunci pencarian atau filter.' : 'Coba sesuaikan kata kunci pencarian atau tambah konsumen baru.'}
                    </p>
                    {!isReadOnly && onOpenNewCustomer && (
                      <button
                        onClick={onOpenNewCustomer}
                        className="mt-3 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 rounded-lg"
                      >
                        + Tambah Konsumen Baru
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                paginatedCustomers.map((cust) => {
                  const summary = getStatsForCustomer(cust);
                  const invoiceCount = summary?.invoiceCount || 0;
                  const totalSpend = summary?.totalPurchase || 0;
                  const totalCashback = summary?.totalCashback || 0;
                  const disbursedCashback = summary?.disbursedCashback || 0;
                  const isExcluded = Boolean(summary?.isExcludedFromCashback);
                  const displayPhone = resolveDisplayPhone(cust, summary);

                  return (
                    <tr key={cust.id} className={`transition-colors ${isExcluded ? 'bg-rose-50/25 hover:bg-rose-50/40' : 'hover:bg-slate-50/80'}`}>
                      
                      {/* Code */}
                      <td className="py-3 px-4 font-mono font-bold text-slate-800 whitespace-nowrap">
                        {cust.customerCode}
                      </td>

                      {/* Name & Contact */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`font-bold ${isExcluded ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                            {cust.name}
                          </span>
                          {isExcluded && (
                            <span className="inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.2 rounded bg-rose-100 text-rose-800 border border-rose-200">
                              <UserX className="w-2.5 h-2.5" /> Dicoret
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono tabular-nums flex items-center gap-1.5 mt-0.5">
                          <span className={displayPhone ? '' : 'text-slate-400 italic font-sans'}>
                            {displayPhone || 'Tanpa Kontak'}
                          </span>
                          {cust.email && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="text-slate-400 truncate max-w-[150px]">{cust.email}</span>
                            </>
                          )}
                        </div>
                      </td>

                      {/* City & Address */}
                      <td className="py-3 px-4 max-w-xs">
                        {cust.city ? (
                          <div className="flex items-center gap-1 font-semibold text-slate-800">
                            <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>{cust.city}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                        {cust.address && (
                          <div className="text-[11px] text-slate-500 truncate mt-0.5" title={cust.address}>
                            {cust.address}
                          </div>
                        )}
                      </td>

                      {/* Payout Details (Cash Only) */}
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          <Wallet className="w-3 h-3 text-emerald-600" />
                          <span>Tunai (Cash)</span>
                        </span>
                      </td>

                      {/* Spend */}
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-800 font-medium whitespace-nowrap">
                        {formatRupiah(totalSpend)}
                        <div className={`text-[10px] font-normal ${invoiceCount > 0 ? 'text-slate-500' : 'text-amber-600'}`}>
                          {invoiceCount > 0 ? `${invoiceCount} Faktur` : 'Belum ada faktur'}
                        </div>
                      </td>

                      {/* Cashback */}
                      <td className="py-3 px-4 text-right font-mono tabular-nums whitespace-nowrap">
                        <div className={`font-bold ${isExcluded ? 'line-through text-slate-400' : 'text-emerald-700'}`}>
                          {formatRupiah(totalCashback)}
                        </div>
                        {isExcluded ? (
                          <div className="text-[10px] text-rose-600 font-sans font-semibold">
                            Hak Dicoret
                          </div>
                        ) : disbursedCashback > 0 ? (
                          <div className="text-[10px] text-emerald-600 font-normal">
                            Cair: {formatRupiah(disbursedCashback)}
                          </div>
                        ) : null}
                      </td>

                      {/* Active Status */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        {!isReadOnly && onToggleStatus ? (
                          <button
                            onClick={() => onToggleStatus(cust.id)}
                            title="Klik untuk mengubah status aktif"
                            className="inline-flex items-center gap-1"
                          >
                            {cust.isActive ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Aktif
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                                <XCircle className="w-3 h-3 text-slate-400" /> Non-Aktif
                              </span>
                            )}
                          </button>
                        ) : cust.isActive ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Aktif
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                            <XCircle className="w-3 h-3 text-slate-400" /> Non-Aktif
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => onSelectCustomerForInvoices(cust.name)}
                            title="Buka riwayat faktur konsumen ini"
                            className="p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-md transition-colors"
                          >
                            <Receipt className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleContactWhatsApp(displayPhone, cust.name)}
                            disabled={!displayPhone}
                            title={displayPhone ? 'Hubungi via WhatsApp' : 'Nomor WhatsApp belum tersedia'}
                            className={`p-1.5 rounded-md transition-colors ${
                              displayPhone
                                ? 'text-slate-600 hover:text-emerald-600 hover:bg-emerald-50'
                                : 'text-slate-300 cursor-not-allowed'
                            }`}
                          >
                            <Phone className="w-4 h-4" />
                          </button>
                          {!isReadOnly && onEditCustomer && (
                            <button
                              onClick={() => onEditCustomer(cust)}
                              title="Edit Data Master Konsumen"
                              className="p-1.5 text-slate-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                          )}
                          {!isReadOnly && onDeleteCustomer && (
                            <button
                              onClick={() => setDeletingCustomer(cust)}
                              title="Hapus Konsumen"
                              className="p-1.5 text-slate-400 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination Bar */}
      <PaginationBar
        totalItems={filteredCustomers.length}
        rowsPerPage={rowsPerPage}
        currentPage={currentPage}
        onChangeRowsPerPage={(rows) => {
          setRowsPerPage(rows);
          setCurrentPage(1);
        }}
        onChangePage={setCurrentPage}
        itemLabel="konsumen"
      />

      {/* Delete Customer Confirmation Modal (Admin Only) */}
      {!isReadOnly && (
        <ConfirmDialog
          isOpen={deletingCustomer !== null}
          title="Hapus Data Konsumen"
          message={`Yakin ingin menghapus konsumen ${deletingCustomer?.name} (${deletingCustomer?.customerCode}) dari Master Data? Data konsumen akan dihapus secara permanen.`}
          confirmLabel="Ya, Hapus Konsumen"
          onConfirm={() => {
            if (deletingCustomer && onDeleteCustomer) {
              onDeleteCustomer(deletingCustomer.id);
              setDeletingCustomer(null);
            }
          }}
          onCancel={() => setDeletingCustomer(null)}
        />
      )}

    </div>
  );
};
