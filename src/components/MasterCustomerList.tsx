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
  ShieldCheck,
  Upload
} from 'lucide-react';
import { CustomerMaster, CustomerSummary, Invoice } from '../types/cashback';
import { formatRupiah, formatNumber } from '../utils/cashbackCalculator';
import { ConfirmDialog } from './ConfirmDialog';
import { PaginationBar } from './PaginationBar';

interface MasterCustomerListProps {
  customers: CustomerMaster[];
  invoices: Invoice[];
  customerSummaries: CustomerSummary[];
  onOpenNewCustomer: () => void;
  onEditCustomer: (customer: CustomerMaster) => void;
  onDeleteCustomer: (customerId: string) => void;
  onToggleStatus: (customerId: string) => void;
  onSelectCustomerForInvoices: (customerName: string) => void;
  onExportExcel: () => void;
  onOpenImportExcel?: () => void;
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
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [cityFilter, setCityFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name_asc' | 'code_asc' | 'cashback_desc' | 'joined_desc'>('code_asc');
  const [rowsPerPage, setRowsPerPage] = useState<number | 'all'>(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [deletingCustomer, setDeletingCustomer] = useState<CustomerMaster | null>(null);

  // Map customer stats by phone or name for quick lookup
  const statsMap = useMemo(() => {
    const map = new Map<string, CustomerSummary>();
    for (const cs of customerSummaries) {
      if (cs.customerPhone) map.set(cs.customerPhone.trim(), cs);
      map.set(cs.customerName.toLowerCase().trim(), cs);
    }
    return map;
  }, [customerSummaries]);

  // Cities list
  const cities = useMemo(() => {
    const set = new Set<string>();
    for (const c of customers) {
      if (c.city) set.add(c.city);
    }
    return Array.from(set).sort();
  }, [customers]);

  // Filtered and sorted customers
  const filteredCustomers = useMemo(() => {
    let list = customers.filter((c) => {
      // Search
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchName = c.name.toLowerCase().includes(q);
        const matchCode = c.customerCode.toLowerCase().includes(q);
        const matchPhone = c.phone.toLowerCase().includes(q);
        const matchCity = c.city?.toLowerCase().includes(q);
        const matchBank = c.bankName?.toLowerCase().includes(q) || c.bankAccountNumber?.includes(q);
        if (!matchName && !matchCode && !matchPhone && !matchCity && !matchBank) return false;
      }

      // Status
      if (statusFilter === 'active' && !c.isActive) return false;
      if (statusFilter === 'inactive' && c.isActive) return false;

      // City
      if (cityFilter !== 'all' && c.city !== cityFilter) return false;

      return true;
    });

    // Sorting
    list.sort((a, b) => {
      if (sortBy === 'name_asc') {
        return a.name.localeCompare(b.name);
      }
      if (sortBy === 'code_asc') {
        return a.customerCode.localeCompare(b.customerCode);
      }
      if (sortBy === 'joined_desc') {
        return new Date(b.joinedDate).getTime() - new Date(a.joinedDate).getTime();
      }
      if (sortBy === 'cashback_desc') {
        const cbA = statsMap.get(a.phone)?.totalCashback || statsMap.get(a.name.toLowerCase())?.totalCashback || 0;
        const cbB = statsMap.get(b.phone)?.totalCashback || statsMap.get(b.name.toLowerCase())?.totalCashback || 0;
        return cbB - cbA;
      }
      return 0;
    });

    return list;
  }, [customers, search, statusFilter, cityFilter, sortBy, statsMap]);

  const paginatedCustomers = useMemo(() => {
    if (rowsPerPage === 'all') return filteredCustomers;
    const totalPages = Math.max(1, Math.ceil(filteredCustomers.length / rowsPerPage));
    const safePage = Math.min(Math.max(1, currentPage), totalPages);
    const start = (safePage - 1) * rowsPerPage;
    return filteredCustomers.slice(start, start + rowsPerPage);
  }, [filteredCustomers, rowsPerPage, currentPage]);

  const activeCount = customers.filter((c) => c.isActive).length;

  const handleContactWhatsApp = (phone: string, name: string) => {
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
      
      {/* Header Banner */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
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
                  Database master identitas konsumen, metode pencairan tunai, dan riwayat transaksi
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
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

            <button
              onClick={onExportExcel}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Master</span>
            </button>

            <button
              onClick={onOpenNewCustomer}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-xs transition-colors"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Tambah Konsumen Baru</span>
            </button>
          </div>
        </div>

        {/* Quick Stats Strip */}
        <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-slate-500">Total Konsumen Terdaftar</span>
            <div className="text-base font-bold text-slate-900 font-mono tabular-nums mt-0.5">
              {formatNumber(customers.length)} Orang
            </div>
          </div>
          <div>
            <span className="text-slate-500">Konsumen Aktif</span>
            <div className="text-base font-bold text-emerald-700 font-mono tabular-nums mt-0.5">
              {formatNumber(activeCount)} Orang
            </div>
          </div>
          <div>
            <span className="text-slate-500">Konsumen Transaksi Aktif</span>
            <div className="text-base font-bold text-blue-700 font-mono tabular-nums mt-0.5">
              {formatNumber(customerSummaries.length)} Orang
            </div>
          </div>
          <div>
            <span className="text-slate-500">Integrasi Input Faktur</span>
            <div className="text-xs font-medium text-slate-700 mt-1 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Pencarian Cepat Aktif</span>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          
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
            <button
              onClick={onOpenNewCustomer}
              className="mt-3 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 rounded-lg shadow-xs"
            >
              + Tambah Konsumen Baru
            </button>
          </div>
        ) : (
          paginatedCustomers.map((cust) => {
            const stats = statsMap.get(cust.phone?.trim()) || statsMap.get(cust.name.toLowerCase().trim());
            const totalCashback = stats ? stats.totalCashback : 0;
            const totalSpend = stats ? stats.totalPurchase : 0;

            return (
              <div key={cust.id} className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-xs space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">
                        {cust.customerCode}
                      </span>
                      <h3 className="text-sm font-bold text-slate-900">{cust.name}</h3>
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono mt-0.5 flex items-center gap-1">
                      <Phone className="w-3 h-3 text-emerald-600 inline" />
                      <span>{cust.phone}</span>
                      {cust.city && <span>· {cust.city}</span>}
                    </div>
                  </div>

                  <button
                    onClick={() => onToggleStatus(cust.id)}
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full transition-colors ${
                      cust.isActive
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {cust.isActive ? 'Aktif' : 'Non-Aktif'}
                  </button>
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
                    <span className="text-[10px] text-slate-500 font-sans block">Total Belanja</span>
                    <span className="font-semibold text-slate-800">{formatRupiah(totalSpend)}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-500 font-sans block">Total Cashback</span>
                    <span className="font-bold text-emerald-700 text-sm">{formatRupiah(totalCashback)}</span>
                  </div>
                </div>

                {/* Mobile Actions */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                  <button
                    onClick={() => onSelectCustomerForInvoices(cust.name)}
                    className="flex items-center gap-1 px-2.5 py-1 font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors"
                  >
                    <Receipt className="w-3.5 h-3.5" />
                    <span>Faktur</span>
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onEditCustomer(cust)}
                      className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg"
                      title="Edit"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeletingCustomer(cust)}
                      className="p-1.5 text-slate-400 hover:text-red-700 hover:bg-red-50 rounded-lg"
                      title="Hapus"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
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
                    <p className="text-xs text-slate-400 mt-1">Coba sesuaikan kata kunci pencarian atau tambah konsumen baru.</p>
                    <button
                      onClick={onOpenNewCustomer}
                      className="mt-3 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 rounded-lg"
                    >
                      + Tambah Konsumen Baru
                    </button>
                  </td>
                </tr>
              ) : (
                paginatedCustomers.map((cust) => {
                  const summary = statsMap.get(cust.phone) || statsMap.get(cust.name.toLowerCase());
                  const invoiceCount = summary?.invoiceCount || 0;
                  const totalSpend = summary?.totalPurchase || 0;
                  const totalCashback = summary?.totalCashback || 0;

                  return (
                    <tr key={cust.id} className="hover:bg-slate-50/80 transition-colors">
                      
                      {/* Code */}
                      <td className="py-3 px-4 font-mono font-bold text-slate-800 whitespace-nowrap">
                        {cust.customerCode}
                      </td>

                      {/* Name & Contact */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{cust.name}</div>
                        <div className="text-[11px] text-slate-500 font-mono tabular-nums flex items-center gap-1.5 mt-0.5">
                          <span>{cust.phone}</span>
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
                        <div className="text-[10px] text-slate-400 font-normal">
                          {invoiceCount} Faktur
                        </div>
                      </td>

                      {/* Cashback */}
                      <td className="py-3 px-4 text-right font-mono tabular-nums font-bold text-emerald-700 whitespace-nowrap">
                        {formatRupiah(totalCashback)}
                      </td>

                      {/* Active Status */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
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
                            onClick={() => handleContactWhatsApp(cust.phone, cust.name)}
                            title="Hubungi via WhatsApp"
                            className="p-1.5 text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors"
                          >
                            <Phone className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => onEditCustomer(cust)}
                            title="Edit Data Master Konsumen"
                            className="p-1.5 text-slate-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeletingCustomer(cust)}
                            title="Hapus Konsumen"
                            className="p-1.5 text-slate-400 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
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

      {/* Delete Customer Confirmation Modal */}
      <ConfirmDialog
        isOpen={deletingCustomer !== null}
        title="Hapus Data Konsumen"
        message={`Yakin ingin menghapus konsumen ${deletingCustomer?.name} (${deletingCustomer?.customerCode}) dari Master Data? Data konsumen akan dihapus secara permanen.`}
        confirmLabel="Ya, Hapus Konsumen"
        onConfirm={() => {
          if (deletingCustomer) {
            onDeleteCustomer(deletingCustomer.id);
            setDeletingCustomer(null);
          }
        }}
        onCancel={() => setDeletingCustomer(null)}
      />

    </div>
  );
};
