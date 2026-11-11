import React, { useState, useMemo, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  Download, 
  Plus, 
  Edit3, 
  Trash2, 
  Receipt, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  Calendar,
  Tag,
  ArrowUpDown,
  Upload,
  RotateCcw
} from 'lucide-react';
import { ClaimStatus, Invoice, PayoutMethod } from '../types/cashback';
import { formatRupiah, formatNumber } from '../utils/cashbackCalculator';
import { ConfirmDialog } from './ConfirmDialog';

interface InvoiceListProps {
  invoices: Invoice[];
  onOpenNewInvoice: () => void;
  onEditInvoice: (invoice: Invoice) => void;
  onDeleteInvoice: (invoiceId: string) => void;
  onViewReceipt: (invoice: Invoice) => void;
  onUpdateStatus: (invoiceId: string, newStatus: ClaimStatus) => void;
  onExportExcel: () => void;
  onOpenImportExcel?: () => void;
  onResetAllInvoices?: () => void;
  onOpenDisbursementModal?: (invoice: Invoice) => void;
  initialCustomerFilter?: string;
  onClearCustomerFilter?: () => void;
}

export const InvoiceList: React.FC<InvoiceListProps> = ({
  invoices,
  onOpenNewInvoice,
  onEditInvoice,
  onDeleteInvoice,
  onViewReceipt,
  onUpdateStatus,
  onExportExcel,
  onOpenImportExcel,
  onResetAllInvoices,
  onOpenDisbursementModal,
  initialCustomerFilter,
  onClearCustomerFilter,
}) => {
  const [search, setSearch] = useState(initialCustomerFilter || '');
  const [statusFilter, setStatusFilter] = useState<'all' | ClaimStatus>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date_desc' | 'date_asc' | 'amount_desc' | 'cashback_desc'>('date_desc');
  const [deletingInvoice, setDeletingInvoice] = useState<Invoice | null>(null);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

  useEffect(() => {
    if (initialCustomerFilter !== undefined) {
      setSearch(initialCustomerFilter);
    }
  }, [initialCustomerFilter]);

  // Categories list
  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const inv of invoices) {
      if (inv.category) set.add(inv.category);
    }
    return Array.from(set);
  }, [invoices]);

  // Filter and sort invoices
  const filteredInvoices = useMemo(() => {
    let list = invoices.filter((inv) => {
      // Search
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchName = inv.customerName.toLowerCase().includes(q);
        const matchPhone = inv.customerPhone.toLowerCase().includes(q);
        const matchNumber = inv.invoiceNumber.toLowerCase().includes(q);
        const matchDesc = inv.itemsDescription?.toLowerCase().includes(q);
        if (!matchName && !matchPhone && !matchNumber && !matchDesc) return false;
      }

      // Status
      if (statusFilter !== 'all' && inv.claimStatus !== statusFilter) {
        return false;
      }

      // Category
      if (categoryFilter !== 'all' && inv.category !== categoryFilter) {
        return false;
      }

      return true;
    });

    // Sorting
    list.sort((a, b) => {
      if (sortBy === 'date_desc') {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      }
      if (sortBy === 'date_asc') {
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      }
      if (sortBy === 'amount_desc') {
        return b.purchaseAmount - a.purchaseAmount;
      }
      if (sortBy === 'cashback_desc') {
        return b.cashbackAmount - a.cashbackAmount;
      }
      return 0;
    });

    return list;
  }, [invoices, search, statusFilter, categoryFilter, sortBy]);

  // Summaries of current filtered view
  const filteredSummary = useMemo(() => {
    const totalSpend = filteredInvoices.reduce((sum, inv) => sum + inv.purchaseAmount, 0);
    const totalCashback = filteredInvoices.reduce((sum, inv) => sum + inv.cashbackAmount, 0);
    return { totalSpend, totalCashback, count: filteredInvoices.length };
  }, [filteredInvoices]);

  const getStatusBadge = (status: ClaimStatus) => {
    if (status === 'disbursed') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
          <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Sudah Cair
        </span>
      );
    }
    if (status === 'ready') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
          <Clock className="w-3 h-3 text-amber-600" /> Siap Dicairkan
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
        <AlertCircle className="w-3 h-3 text-slate-500" /> Menunggu Klaim
      </span>
    );
  };

  const getPayoutLabel = (method: PayoutMethod) => {
    switch (method) {
      case 'transfer_bank':
        return 'Transfer Bank';
      case 'e_wallet':
        return 'E-Wallet';
      case 'potongan_belanja':
        return 'Potongan Belanja';
      case 'tunai':
        return 'Tunai Kasir';
      default:
        return method;
    }
  };

  return (
    <div className="space-y-4">
      
      {/* Top Header & Actions */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-lg font-bold text-slate-900">
              Rekap Data Faktur & Cashback Konsumen
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Kelola seluruh catatan faktur pembelian konsumen beserta detail kalkulasi cashback transparan
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {onOpenImportExcel && (
              <button
                onClick={onOpenImportExcel}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors"
                title="Import data faktur dari Excel (.xlsx)"
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
              <span>Export Excel</span>
            </button>
            {onResetAllInvoices && invoices.length > 0 && (
              <button
                type="button"
                onClick={() => setIsResetConfirmOpen(true)}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors"
                title="Reset dan hapus seluruh data faktur transaksi"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Faktur</span>
              </button>
            )}
            <button
              onClick={onOpenNewInvoice}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Input Faktur Baru</span>
            </button>
          </div>
        </div>

        {/* Filters Bar */}
        <div className="mt-5 pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          
          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Cari no. faktur / nama / HP..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-slate-900"
            />
            {initialCustomerFilter && (
              <button
                onClick={() => {
                  setSearch('');
                  if (onClearCustomerFilter) onClearCustomerFilter();
                }}
                className="absolute right-2 top-2 text-[10px] bg-slate-200 hover:bg-slate-300 px-1.5 py-0.5 rounded text-slate-700"
              >
                Reset
              </button>
            )}
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | ClaimStatus)}
              className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-slate-900"
            >
              <option value="all">Semua Status Pencairan</option>
              <option value="disbursed">Sudah Dicairkan</option>
              <option value="ready">Siap Dicairkan</option>
              <option value="pending">Menunggu Klaim</option>
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-slate-900"
            >
              <option value="all">Semua Kategori Produk</option>
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Sort Option */}
          <div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-slate-900"
            >
              <option value="date_desc">Tanggal Terbaru</option>
              <option value="date_asc">Tanggal Terlama</option>
              <option value="cashback_desc">Cashback Tertinggi</option>
              <option value="amount_desc">Nilai Belanja Tertinggi</option>
            </select>
          </div>

        </div>

        {/* Filter Summary Strip */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between text-xs text-slate-500 gap-2">
          <div className="flex items-center gap-2">
            <span>Menampilkan <strong>{filteredSummary.count}</strong> dari {invoices.length} faktur</span>
            {search && <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-700">Filter: "{search}"</span>}
          </div>
          <div className="flex items-center gap-4 font-mono tabular-nums text-xs">
            <span>Total Belanja: <strong className="text-slate-800">{formatRupiah(filteredSummary.totalSpend)}</strong></span>
            <span aria-hidden="true">·</span>
            <span>Total Cashback: <strong className="text-emerald-700 font-bold">{formatRupiah(filteredSummary.totalCashback)}</strong></span>
          </div>
        </div>

      </div>

      {/* Mobile Card View (Minimalist & Thumb Friendly) */}
      <div className="md:hidden space-y-2.5">
        {filteredInvoices.length === 0 ? (
          <div className="p-8 text-center text-slate-400 bg-white rounded-xl border border-slate-200">
            <p className="text-sm font-semibold text-slate-700">Tidak ada faktur ditemukan</p>
            <p className="text-xs text-slate-400 mt-1">Coba sesuaikan kata kunci atau filter status.</p>
          </div>
        ) : (
          filteredInvoices.map((inv) => (
            <div key={inv.id} className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-xs space-y-2.5">
              {/* Header: Customer Name & Status */}
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-slate-900 truncate">{inv.customerName}</h3>
                  <div className="text-[11px] text-slate-500 font-mono flex items-center gap-1.5 mt-0.5">
                    <span className="font-semibold text-slate-700">{inv.invoiceNumber}</span>
                    <span>·</span>
                    <span>{inv.date}</span>
                  </div>
                </div>
                <div className="shrink-0">
                  {getStatusBadge(inv.claimStatus)}
                </div>
              </div>

              {/* Spend & Cashback Summary Box */}
              <div className="grid grid-cols-2 gap-2 p-2.5 bg-slate-50 rounded-lg text-xs font-mono tabular-nums">
                <div>
                  <span className="text-[10px] text-slate-500 font-sans block">Nilai Belanja</span>
                  <span className="font-semibold text-slate-800">{formatRupiah(inv.purchaseAmount)}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-500 font-sans block">Cashback ({inv.cashbackPercentage}%)</span>
                  <span className="font-bold text-emerald-700 text-sm">{formatRupiah(inv.cashbackAmount)}</span>
                </div>
              </div>

              {/* Description */}
              {inv.itemsDescription && (
                <p className="text-[11px] text-slate-600 truncate">
                  <span className="font-medium text-slate-500">Ket:</span> {inv.itemsDescription}
                </p>
              )}

              {/* Mobile Actions */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <button
                  onClick={() => onViewReceipt(inv)}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:text-emerald-700 bg-slate-100 hover:bg-emerald-50 rounded-lg transition-colors"
                >
                  <Receipt className="w-3.5 h-3.5" />
                  <span>Struk</span>
                </button>

                <div className="flex items-center gap-1">
                  {inv.claimStatus !== 'disbursed' && (
                    <button
                      onClick={() => onUpdateStatus(inv.id, 'disbursed')}
                      className="px-2.5 py-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg"
                    >
                      Cairkan
                    </button>
                  )}
                  <button
                    onClick={() => onEditInvoice(inv)}
                    className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg"
                    title="Edit Faktur"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setDeletingInvoice(inv)}
                    className="p-1.5 text-slate-400 hover:text-red-700 hover:bg-red-50 rounded-lg"
                    title="Hapus Faktur"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Desktop Main Table (hidden on mobile, visible on tablet & desktop) */}
      <div className="hidden md:block bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">No. Faktur</th>
                <th className="py-3 px-4">Tanggal</th>
                <th className="py-3 px-4">Konsumen</th>
                <th className="py-3 px-4">Keterangan Barang</th>
                <th className="py-3 px-4 text-right">Nilai Belanja</th>
                <th className="py-3 px-4 text-center">% Rate</th>
                <th className="py-3 px-4 text-right">Nilai Cashback</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <p className="text-sm font-semibold text-slate-600">Tidak ada faktur ditemukan</p>
                    <p className="text-xs text-slate-400 mt-1">Coba sesuaikan kata kunci pencarian atau filter status Anda.</p>
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors">
                    
                    {/* Invoice Number */}
                    <td className="py-3 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                      {inv.invoiceNumber}
                    </td>

                    {/* Date */}
                    <td className="py-3 px-4 text-slate-600 font-mono tabular-nums whitespace-nowrap">
                      {inv.date}
                    </td>

                    {/* Customer */}
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{inv.customerName}</div>
                      <div className="text-[11px] text-slate-500 font-mono tabular-nums">
                        {inv.customerPhone}
                      </div>
                    </td>

                    {/* Description */}
                    <td className="py-3 px-4 max-w-xs">
                      <div className="text-xs text-slate-800 font-medium truncate" title={inv.itemsDescription || 'Faktur Pembelian'}>
                        {inv.itemsDescription || '-'}
                      </div>
                    </td>

                    {/* Purchase Amount */}
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-800 font-medium whitespace-nowrap">
                      {formatRupiah(inv.purchaseAmount)}
                    </td>

                    {/* Cashback % */}
                    <td className="py-3 px-4 text-center font-mono tabular-nums font-semibold text-slate-700 whitespace-nowrap">
                      {inv.cashbackPercentage}%
                    </td>

                    {/* Cashback Amount */}
                    <td className="py-3 px-4 text-right font-mono tabular-nums font-bold text-emerald-700 whitespace-nowrap">
                      {formatRupiah(inv.cashbackAmount)}
                    </td>

                    {/* Claim Status & Quick Toggle */}
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <div className="inline-flex flex-col items-center gap-1">
                        {getStatusBadge(inv.claimStatus)}
                        {inv.claimStatus !== 'disbursed' ? (
                          <button
                            onClick={() => onOpenDisbursementModal ? onOpenDisbursementModal(inv) : onUpdateStatus(inv.id, 'disbursed')}
                            className="text-[10px] text-emerald-700 hover:underline font-semibold"
                            title="Proses serah terima cashback dengan bukti foto & tanda tangan"
                          >
                            Proses Cair
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-400">
                            {getPayoutLabel(inv.payoutMethod)}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => onViewReceipt(inv)}
                          title="Cetak & Bagikan Bukti Struk Transparan"
                          className="p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-md transition-colors"
                        >
                          <Receipt className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onEditInvoice(inv)}
                          title="Edit Faktur"
                          className="p-1.5 text-slate-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeletingInvoice(inv)}
                          title="Hapus Faktur"
                          className="p-1.5 text-slate-400 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>

                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmDialog
        isOpen={deletingInvoice !== null}
        title="Hapus Data Faktur"
        message={`Yakin ingin menghapus faktur ${deletingInvoice?.invoiceNumber} (${deletingInvoice?.customerName})? Faktur akan dihapus permanen dari sistem dan cloud.`}
        confirmLabel="Ya, Hapus Faktur"
        onConfirm={() => {
          if (deletingInvoice) {
            onDeleteInvoice(deletingInvoice.id);
            setDeletingInvoice(null);
          }
        }}
        onCancel={() => setDeletingInvoice(null)}
      />

      {/* Reset All Invoices Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isResetConfirmOpen}
        title="Reset Seluruh Data Faktur?"
        message={`Apakah Anda yakin ingin mereset dan menghapus seluruh ${invoices.length} faktur transaksi? Tindakan ini akan mengosongkan semua riwayat faktur transaksi dari sistem & database cloud. Data Master Konsumen akan tetap aman.`}
        confirmLabel="Ya, Reset Semua Faktur"
        cancelLabel="Batal"
        isDestructive={true}
        onConfirm={() => {
          setIsResetConfirmOpen(false);
          if (onResetAllInvoices) onResetAllInvoices();
        }}
        onCancel={() => setIsResetConfirmOpen(false)}
      />
    </div>
  );
};
