import React, { useState, useMemo } from 'react';
import { 
  CheckCircle2, 
  Clock, 
  Search, 
  Download, 
  Camera, 
  PenTool, 
  FileText, 
  Calendar, 
  CreditCard, 
  Receipt, 
  Eye, 
  Phone, 
  Filter, 
  ArrowRight,
  TrendingUp,
  Building2,
  X,
  Printer,
  ChevronDown,
  ChevronUp,
  User,
  RotateCcw,
  Check,
  AlertTriangle,
  Layers
} from 'lucide-react';
import { CustomerSummary, Invoice, PayoutMethod, CompanyProfile } from '../types/cashback';
import { formatRupiah, formatNumber } from '../utils/cashbackCalculator';
import { ConfirmDialog } from './ConfirmDialog';

interface CashbackDisbursementRecordsProps {
  customerSummaries: CustomerSummary[];
  invoices: Invoice[];
  onOpenCustomerDisbursement: (customer: CustomerSummary) => void;
  onRevertCustomerDisbursement?: (customerName: string) => void;
  onSelectCustomerForInvoices: (customerName: string) => void;
  onExportExcel: () => void;
  companyProfile?: CompanyProfile;
  storeName?: string;
}

export const CashbackDisbursementRecords: React.FC<CashbackDisbursementRecordsProps> = ({
  customerSummaries,
  invoices,
  onOpenCustomerDisbursement,
  onRevertCustomerDisbursement,
  onSelectCustomerForInvoices,
  onExportExcel,
  companyProfile,
  storeName = 'CashbackPro',
}) => {
  const [filterMode, setFilterMode] = useState<'all' | 'disbursed' | 'undisbursed'>('undisbursed');
  const [search, setSearch] = useState('');
  const [methodFilter, setMethodFilter] = useState<string>('all');
  const [expandedCustomerKey, setExpandedCustomerKey] = useState<string | null>(null);

  // Selected customer for full Tanda Terima modal
  const [viewingReceiptCustomer, setViewingReceiptCustomer] = useState<CustomerSummary | null>(null);

  // Selected customer for revert disbursement confirm dialog
  const [customerToRevert, setCustomerToRevert] = useState<string | null>(null);

  // High-level KPI metrics per customer
  const metrics = useMemo(() => {
    let totalEligibleCashback = 0;
    let totalDisbursedCashback = 0;
    let totalUndisbursedCashback = 0;

    let fullyDisbursedCustomersCount = 0;
    let partialDisbursedCustomersCount = 0;
    let undisbursedCustomersCount = 0;
    let excludedCustomersCount = 0;

    for (const c of customerSummaries) {
      if (c.isExcludedFromCashback) {
        excludedCustomersCount += 1;
        continue;
      }

      totalEligibleCashback += c.totalCashback;
      totalDisbursedCashback += c.disbursedCashback;
      totalUndisbursedCashback += (c.pendingCashback + c.readyCashback);

      if (c.disbursedCashback > 0 && c.pendingCashback === 0 && c.readyCashback === 0) {
        fullyDisbursedCustomersCount += 1;
      } else if (c.disbursedCashback > 0) {
        partialDisbursedCustomersCount += 1;
      } else {
        undisbursedCustomersCount += 1;
      }
    }

    const realizationRate = totalEligibleCashback > 0 
      ? (totalDisbursedCashback / totalEligibleCashback) * 100 
      : 0;

    return {
      totalCustomers: customerSummaries.length,
      totalEligibleCashback,
      totalDisbursedCashback,
      totalUndisbursedCashback,
      fullyDisbursedCustomersCount,
      partialDisbursedCustomersCount,
      totalDisbursedCustomers: fullyDisbursedCustomersCount + partialDisbursedCustomersCount,
      undisbursedCustomersCount,
      excludedCustomersCount,
      realizationRate,
    };
  }, [customerSummaries]);

  // Filtered customer list
  const filteredCustomers = useMemo(() => {
    return customerSummaries.filter((c) => {
      // 1. Status Filter
      if (filterMode === 'disbursed') {
        if (c.disbursedCashback <= 0 || c.isExcludedFromCashback) return false;
      } else if (filterMode === 'undisbursed') {
        if ((c.pendingCashback + c.readyCashback) <= 0 || c.isExcludedFromCashback) return false;
      }

      // 2. Search Filter
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const matchName = c.customerName.toLowerCase().includes(q);
        const matchPhone = (c.customerPhone || '').toLowerCase().includes(q);
        const matchCode = (c.customerCode || '').toLowerCase().includes(q);
        const matchRecipient = (c.recipientName || '').toLowerCase().includes(q);
        if (!matchName && !matchPhone && !matchCode && !matchRecipient) return false;
      }

      // 3. Payout Method Filter
      if (methodFilter !== 'all') {
        const met = c.disbursementPayoutMethod || c.preferredPayoutMethod;
        if (met !== methodFilter) return false;
      }

      return true;
    });
  }, [customerSummaries, filterMode, search, methodFilter]);

  const methodLabel = (m?: PayoutMethod) => {
    switch (m) {
      case 'transfer_bank': return 'Transfer Bank';
      case 'e_wallet': return 'E-Wallet';
      case 'tunai': return 'Tunai (Cash)';
      case 'potongan_belanja': return 'Potongan Belanja';
      default: return m || 'Transfer Bank';
    }
  };

  // Helper to convert number to Indonesian words (Terbilang)
  const terbilang = (nominal: number): string => {
    const angka = ['', 'Satu', 'Dua', 'Tiga', 'Empat', 'Lima', 'Enam', 'Tujuh', 'Delapan', 'Sembilan', 'Sepuluh', 'Sebelas'];
    const n = Math.floor(Math.abs(nominal));
    if (n < 12) return angka[n];
    if (n < 20) return terbilang(n - 10) + ' Belas';
    if (n < 100) return terbilang(Math.floor(n / 10)) + ' Puluh ' + angka[n % 10];
    if (n < 200) return 'Seratus ' + terbilang(n - 100);
    if (n < 1000) return terbilang(Math.floor(n / 100)) + ' Ratus ' + terbilang(n % 100);
    if (n < 2000) return 'Seribu ' + terbilang(n - 1000);
    if (n < 1000000) return terbilang(Math.floor(n / 1000)) + ' Ribu ' + terbilang(n % 1000);
    if (n < 1000000000) return terbilang(Math.floor(n / 1000000)) + ' Juta ' + terbilang(n % 1000000);
    return terbilang(Math.floor(n / 1000000000)) + ' Miliar ' + terbilang(n % 1000000000);
  };

  return (
    <div className="space-y-4">
      
      {/* Top 3 KPI Summary Cards - Per Konsumen */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        
        {/* Card 1: Sudah Menerima Cashback */}
        <div 
          onClick={() => setFilterMode('disbursed')}
          className={`bg-white rounded-xl border p-4 shadow-2xs cursor-pointer transition-all ${
            filterMode === 'disbursed' ? 'border-emerald-500 ring-2 ring-emerald-500/20' : 'border-slate-200 hover:border-emerald-300'
          }`}
        >
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
              Konsumen Sudah Menerima
            </span>
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-700 font-mono tracking-tight">
            {formatRupiah(metrics.totalDisbursedCashback)}
          </div>
          <div className="flex items-center justify-between text-xs text-slate-500 mt-1">
            <span>{metrics.totalDisbursedCustomers} Konsumen Tuntas/Cair</span>
            <span className="font-bold text-emerald-700 font-mono">{metrics.realizationRate.toFixed(1)}% Realisasi</span>
          </div>
        </div>

        {/* Card 2: Belum Menerima Cashback */}
        <div 
          onClick={() => setFilterMode('undisbursed')}
          className={`bg-white rounded-xl border p-4 shadow-2xs cursor-pointer transition-all ${
            filterMode === 'undisbursed' ? 'border-amber-500 ring-2 ring-amber-500/20' : 'border-slate-200 hover:border-amber-300'
          }`}
        >
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800">
              Konsumen Belum Menerima
            </span>
            <Clock className="w-5 h-5 text-amber-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-amber-700 font-mono tracking-tight">
            {formatRupiah(metrics.totalUndisbursedCashback)}
          </div>
          <div className="flex items-center justify-between text-xs text-slate-500 mt-1 font-mono">
            <span>{metrics.undisbursedCustomersCount} Konsumen Menunggu</span>
            <span className="text-amber-700 font-semibold">Siap Diserahkan</span>
          </div>
        </div>

        {/* Card 3: Total Hak Cashback Konsumen */}
        <div 
          onClick={() => setFilterMode('all')}
          className={`bg-white rounded-xl border p-4 shadow-2xs cursor-pointer transition-all ${
            filterMode === 'all' ? 'border-slate-900 ring-2 ring-slate-900/20' : 'border-slate-200 hover:border-slate-400'
          }`}
        >
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
              Total Hak Cashback Konsumen
            </span>
            <TrendingUp className="w-5 h-5 text-slate-700" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 font-mono tracking-tight">
            {formatRupiah(metrics.totalEligibleCashback)}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Total {metrics.totalCustomers} Konsumen ({invoices.length} Faktur Transaksi)
          </div>
        </div>

      </div>

      {/* Main Container */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-2xs space-y-4">
        
        {/* Title Bar & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-emerald-600 text-white">
                <Receipt className="w-4 h-4" />
              </div>
              <h1 className="text-base font-bold text-slate-900">
                Rekap Penerimaan Cashback Konsumen
              </h1>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                Pencairan Per Konsumen
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Rekapitulasi serah terima cashback dikelompokkan dan dicairkan per konsumen, lengkap dengan tanda tangan elektronik dan foto bukti serah terima.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onExportExcel}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg shadow-2xs transition-colors shrink-0"
              title="Unduh laporan Excel"
            >
              <Download className="w-3.5 h-3.5 text-emerald-700" />
              <span>Export Excel</span>
            </button>
          </div>
        </div>

        {/* Filter Tabs (Belum Menerima, Sudah Menerima, Semua) */}
        <div className="flex items-center p-1 bg-slate-100 rounded-xl text-xs font-semibold">
          <button
            onClick={() => setFilterMode('undisbursed')}
            className={`flex-1 py-2 px-3 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              filterMode === 'undisbursed'
                ? 'bg-white text-amber-800 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Clock className="w-4 h-4 text-amber-600" />
            <span>Belum Menerima Cashback ({metrics.undisbursedCustomersCount})</span>
          </button>

          <button
            onClick={() => setFilterMode('disbursed')}
            className={`flex-1 py-2 px-3 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              filterMode === 'disbursed'
                ? 'bg-white text-emerald-800 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Sudah Menerima Cashback ({metrics.totalDisbursedCustomers})</span>
          </button>

          <button
            onClick={() => setFilterMode('all')}
            className={`flex-1 py-2 px-3 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              filterMode === 'all'
                ? 'bg-white text-slate-900 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>Semua Konsumen ({metrics.totalCustomers})</span>
          </button>
        </div>

        {/* Search & Payout Filter Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <div className="relative sm:col-span-2">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Cari nama konsumen, nomor HP, kode, atau penerima..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-slate-900 font-medium"
            />
          </div>

          <div>
            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-slate-900 font-medium"
            >
              <option value="all">Semua Metode Payout</option>
              <option value="transfer_bank">Transfer Bank</option>
              <option value="e_wallet">E-Wallet</option>
              <option value="tunai">Uang Tunai (Cash)</option>
              <option value="potongan_belanja">Potongan Belanja</option>
            </select>
          </div>
        </div>

        {/* Customer Disbursement Records Table */}
        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-bold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-3 w-10 text-center">No</th>
                <th className="py-3 px-3">Data Konsumen</th>
                <th className="py-3 px-3">Status Hak & Penerimaan</th>
                <th className="py-3 px-3 text-right">Total Belanja</th>
                <th className="py-3 px-3 text-right">Hak Cashback</th>
                <th className="py-3 px-3 text-right">Sudah Cair</th>
                <th className="py-3 px-3 text-right">Sisa Belum Cair</th>
                <th className="py-3 px-3">Bukti Serah Terima</th>
                <th className="py-3 px-3 text-center">Aksi Pencairan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <Receipt className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-400" />
                    <p className="font-semibold text-slate-600">Tidak ada data konsumen yang sesuai filter</p>
                    <p className="text-[11px] mt-0.5">Coba ubah kata kunci pencarian atau tab status penerimaan.</p>
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((cust, idx) => {
                  const uniqueKey = cust.customerCode || `${cust.customerName}_${idx}`;
                  const isExpanded = expandedCustomerKey === uniqueKey;
                  const isFullyDisbursed = cust.disbursedCashback >= cust.totalCashback && cust.totalCashback > 0;
                  const isPartial = cust.disbursedCashback > 0 && !isFullyDisbursed;
                  const isUndisbursed = cust.disbursedCashback === 0;
                  const remainingCashback = Math.max(0, cust.totalCashback - cust.disbursedCashback);

                  return (
                    <React.Fragment key={uniqueKey}>
                      <tr className={`hover:bg-slate-50/80 transition-colors ${
                        cust.isExcludedFromCashback 
                          ? 'bg-rose-50/20 text-slate-400' 
                          : isFullyDisbursed 
                            ? 'bg-emerald-50/15' 
                            : isPartial 
                              ? 'bg-blue-50/20' 
                              : ''
                      }`}>
                        
                        {/* No */}
                        <td className="py-3 px-3 text-center text-slate-400 font-mono">
                          {idx + 1}
                        </td>

                        {/* Customer Info */}
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2">
                            <div className="p-1.5 rounded-lg bg-slate-100 text-slate-700 shrink-0">
                              <User className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className={`font-bold ${
                                  cust.isExcludedFromCashback 
                                    ? 'line-through text-slate-400' 
                                    : 'text-slate-900'
                                }`}>
                                  {cust.customerName}
                                </span>
                                {cust.customerCode && (
                                  <span className="text-[10px] bg-slate-100 text-slate-600 font-mono px-1.5 py-0.2 rounded">
                                    {cust.customerCode}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                                {cust.customerPhone ? (
                                  <span className="font-mono">{cust.customerPhone}</span>
                                ) : (
                                  <span className="italic text-slate-400">Tanpa HP</span>
                                )}
                                <span>·</span>
                                <span className="text-slate-600 font-medium">
                                  {cust.invoiceCount} Faktur
                                </span>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Status Hak & Penerimaan */}
                        <td className="py-3 px-3">
                          {cust.isExcludedFromCashback ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 border border-rose-200">
                              <AlertTriangle className="w-3 h-3" /> Dicoret dari Penerima
                            </span>
                          ) : isFullyDisbursed ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Sudah Menerima (Lunas)
                            </span>
                          ) : isPartial ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-300">
                              <Clock className="w-3 h-3 text-blue-600" /> Sebagian Dicairkan
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                              <Clock className="w-3 h-3 text-amber-600" /> Belum Menerima
                            </span>
                          )}
                        </td>

                        {/* Total Belanja */}
                        <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                          {formatRupiah(cust.totalPurchase)}
                        </td>

                        {/* Hak Cashback */}
                        <td className="py-3 px-3 text-right font-mono font-black text-emerald-700">
                          {formatRupiah(cust.totalCashback)}
                        </td>

                        {/* Sudah Cair */}
                        <td className="py-3 px-3 text-right font-mono font-bold text-emerald-800">
                          {formatRupiah(cust.disbursedCashback)}
                        </td>

                        {/* Sisa Belum Cair */}
                        <td className="py-3 px-3 text-right font-mono font-black text-amber-700">
                          {formatRupiah(remainingCashback)}
                        </td>

                        {/* Bukti Serah Terima (Foto & TTD) */}
                        <td className="py-3 px-3">
                          {cust.disbursementProofPhoto || cust.disbursementSignature ? (
                            <div className="flex items-center gap-2">
                              {cust.disbursementProofPhoto ? (
                                <img
                                  src={cust.disbursementProofPhoto}
                                  alt="Bukti Struk"
                                  title="Foto bukti penyerahan (klik untuk buka tanda terima)"
                                  onClick={() => setViewingReceiptCustomer(cust)}
                                  className="w-8 h-8 rounded-md object-cover border border-slate-200 cursor-pointer hover:opacity-80 transition-opacity"
                                />
                              ) : null}

                              {cust.disbursementSignature ? (
                                <div 
                                  title="Tanda tangan digital penerima (klik untuk buka tanda terima)"
                                  onClick={() => setViewingReceiptCustomer(cust)}
                                  className="w-12 h-8 bg-white border border-slate-200 rounded-md flex items-center justify-center p-0.5 cursor-pointer hover:border-emerald-500 transition-colors"
                                >
                                  <img 
                                    src={cust.disbursementSignature} 
                                    alt="TTD" 
                                    className="max-h-full max-w-full object-contain"
                                  />
                                </div>
                              ) : null}

                              <div className="text-[10px] text-slate-500 leading-tight">
                                <span className="block font-mono text-slate-700">
                                  {cust.lastDisbursedDate || 'Tercatat'}
                                </span>
                                <span className="text-[9px] text-emerald-700 font-semibold">
                                  {cust.recipientName || cust.customerName}
                                </span>
                              </div>
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">
                              Belum ada bukti
                            </span>
                          )}
                        </td>

                        {/* Aksi Pencairan */}
                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1.5">
                            
                            {/* Tombol Pencairan Konsumen */}
                            {!cust.isExcludedFromCashback && remainingCashback > 0 && (
                              <button
                                onClick={() => onOpenCustomerDisbursement(cust)}
                                className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors"
                                title={`Cairkan seluruh hak cashback untuk konsumen ${cust.customerName}`}
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Cairkan ({formatRupiah(remainingCashback)})</span>
                              </button>
                            )}

                            {/* Tombol Tanda Terima Resmi */}
                            {cust.disbursedCashback > 0 && (
                              <button
                                onClick={() => setViewingReceiptCustomer(cust)}
                                className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                                title="Lihat Tanda Terima Resmi Serah Terima Cashback"
                              >
                                <Receipt className="w-3.5 h-3.5 text-slate-600" />
                                <span>Tanda Terima</span>
                              </button>
                            )}

                            {/* Tombol Expand Faktur */}
                            <button
                              onClick={() => setExpandedCustomerKey(isExpanded ? null : uniqueKey)}
                              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                              title={isExpanded ? 'Tutup rincian faktur' : 'Buka rincian faktur konsumen'}
                            >
                              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>

                          </div>
                        </td>

                      </tr>

                      {/* Expandable Invoice Details for this customer */}
                      {isExpanded && cust.invoices && cust.invoices.length > 0 && (
                        <tr className="bg-slate-50/90 border-b border-slate-200">
                          <td colSpan={9} className="p-3 pl-12">
                            <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-2xs space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                                  <Layers className="w-3.5 h-3.5 text-emerald-600" />
                                  Daftar Faktur Transaksi Konsumen ({cust.invoices.length} Faktur):
                                </span>
                                <div className="flex items-center gap-3 text-xs">
                                  <button
                                    onClick={() => onSelectCustomerForInvoices(cust.customerName)}
                                    className="text-emerald-700 hover:underline font-semibold flex items-center gap-1"
                                  >
                                    Buka di Rekap Faktur <ArrowRight className="w-3 h-3" />
                                  </button>
                                  {cust.disbursedCashback > 0 && onRevertCustomerDisbursement && (
                                    <button
                                      onClick={() => setCustomerToRevert(cust.customerName)}
                                      className="text-rose-600 hover:underline font-semibold flex items-center gap-1"
                                      title="Batalkan status pencairan konsumen ini"
                                    >
                                      <RotateCcw className="w-3 h-3" /> Batalkan Pencairan
                                    </button>
                                  )}
                                </div>
                              </div>

                              <div className="overflow-x-auto">
                                <table className="w-full text-xs text-left">
                                  <thead className="bg-slate-50 text-slate-500 font-semibold text-[10px] uppercase">
                                    <tr>
                                      <th className="py-1.5 px-2">No Faktur</th>
                                      <th className="py-1.5 px-2">Tanggal</th>
                                      <th className="py-1.5 px-2 text-right">Pembelian</th>
                                      <th className="py-1.5 px-2 text-center">% CB</th>
                                      <th className="py-1.5 px-2 text-right">Cashback</th>
                                      <th className="py-1.5 px-2">Status Klaim</th>
                                      <th className="py-1.5 px-2">Metode</th>
                                      <th className="py-1.5 px-2">Tanggal Cair</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100">
                                    {cust.invoices.map((inv) => (
                                      <tr key={inv.id} className="hover:bg-slate-50">
                                        <td className="py-1.5 px-2 font-mono font-bold text-slate-800">
                                          {inv.invoiceNumber}
                                        </td>
                                        <td className="py-1.5 px-2 font-mono text-slate-600">
                                          {inv.date}
                                        </td>
                                        <td className="py-1.5 px-2 text-right font-mono">
                                          {formatRupiah(inv.purchaseAmount)}
                                        </td>
                                        <td className="py-1.5 px-2 text-center font-mono">
                                          {inv.cashbackPercentage}%
                                        </td>
                                        <td className="py-1.5 px-2 text-right font-mono font-bold text-emerald-700">
                                          {formatRupiah(inv.cashbackAmount)}
                                        </td>
                                        <td className="py-1.5 px-2">
                                          <span className={`px-2 py-0.2 rounded-full text-[10px] font-bold ${
                                            inv.claimStatus === 'disbursed'
                                              ? 'bg-emerald-100 text-emerald-800'
                                              : inv.claimStatus === 'ready'
                                                ? 'bg-blue-100 text-blue-800'
                                                : 'bg-amber-100 text-amber-800'
                                          }`}>
                                            {inv.claimStatus === 'disbursed' ? 'Sudah Cair' : inv.claimStatus === 'ready' ? 'Siap Cair' : 'Pending'}
                                          </span>
                                        </td>
                                        <td className="py-1.5 px-2 text-slate-600">
                                          {methodLabel(inv.payoutMethod)}
                                        </td>
                                        <td className="py-1.5 px-2 font-mono text-slate-500">
                                          {inv.disbursedDate || '-'}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
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

        {/* Footer info */}
        <div className="flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100 gap-2">
          <span>
            Menampilkan <strong className="text-slate-800 font-mono">{filteredCustomers.length}</strong> dari <strong className="text-slate-800 font-mono">{customerSummaries.length}</strong> konsumen terdaftar.
          </span>
          <span className="text-[11px] text-slate-400">
            * Pencairan otomatis mengupdate seluruh faktur transaksi milik konsumen terkait di database Firebase.
          </span>
        </div>

      </div>

      {/* Official Customer Handover Receipt Modal (Tanda Terima Serah Terima Cashback) */}
      {viewingReceiptCustomer && (
        <div className="fixed inset-0 z-60 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
            
            {/* Modal Header Bar */}
            <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-emerald-400" />
                <span className="font-bold text-sm">
                  Tanda Terima Resmi Serah Terima Cashback
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 px-3 py-1 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-lg transition-colors"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Cetak / PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewingReceiptCustomer(null)}
                  className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Receipt Paper */}
            <div className="p-6 overflow-y-auto flex-1 text-xs space-y-4 print:p-0">
              
              {/* Company Header (Profil Perusahaan) */}
              <div className="pb-4 border-b-2 border-slate-800 flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-black text-slate-900 tracking-tight">
                    {companyProfile?.companyName || storeName}
                  </h2>
                  {companyProfile?.tagline && (
                    <p className="text-xs text-slate-500 font-medium">
                      {companyProfile.tagline}
                    </p>
                  )}
                  {companyProfile?.address && (
                    <p className="text-[11px] text-slate-600 mt-1">
                      {companyProfile.address} {companyProfile.city ? `, ${companyProfile.city}` : ''}
                    </p>
                  )}
                  <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-0.5">
                    {companyProfile?.phone && <span>Telp/WA: {companyProfile.phone}</span>}
                    {companyProfile?.email && <span>Email: {companyProfile.email}</span>}
                    {companyProfile?.taxNumber && <span>NPWP: {companyProfile.taxNumber}</span>}
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Dokumen Resmi
                  </div>
                  <div className="text-sm font-black text-slate-900 font-mono mt-0.5">
                    TT-CB-{viewingReceiptCustomer.customerCode || 'REC'}-{viewingReceiptCustomer.lastDisbursedDate?.replace(/-/g, '') || '2026'}
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                    Tanggal: {viewingReceiptCustomer.lastDisbursedDate || new Date().toISOString().split('T')[0]}
                  </div>
                </div>
              </div>

              {/* Title */}
              <div className="text-center py-1">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 underline">
                  TANDA TERIMA PENYERAHAN DANA CASHBACK
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Bukti sah penerimaan dana apresiasi belanja / reward konsumen
                </p>
              </div>

              {/* Customer Details Grid */}
              <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 grid grid-cols-2 gap-3">
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Nama Konsumen</span>
                  <span className="font-bold text-slate-900 text-sm">{viewingReceiptCustomer.customerName}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Nomor HP / WhatsApp</span>
                  <span className="font-mono text-slate-800">{viewingReceiptCustomer.customerPhone || '-'}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Nama Penerima Dana</span>
                  <span className="font-semibold text-slate-800">{viewingReceiptCustomer.recipientName || viewingReceiptCustomer.customerName}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Metode Penyerahan</span>
                  <span className="font-semibold text-slate-800">{methodLabel(viewingReceiptCustomer.disbursementPayoutMethod)}</span>
                </div>
              </div>

              {/* Invoices Breakdown Table */}
              <div className="space-y-1.5">
                <span className="font-bold text-slate-800 text-[11px] block">
                  Rincian Transaksi Faktur Pembelian yang Dicairkan:
                </span>
                <table className="w-full text-left text-xs border border-slate-200 rounded-lg overflow-hidden">
                  <thead className="bg-slate-100 text-slate-700 font-bold text-[10px] uppercase">
                    <tr>
                      <th className="py-1.5 px-3">No. Faktur</th>
                      <th className="py-1.5 px-3">Tanggal Transaksi</th>
                      <th className="py-1.5 px-3 text-right">Nilai Pembelian</th>
                      <th className="py-1.5 px-3 text-right">Cashback</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {viewingReceiptCustomer.invoices?.map((inv) => (
                      <tr key={inv.id}>
                        <td className="py-1.5 px-3 font-mono font-semibold">{inv.invoiceNumber}</td>
                        <td className="py-1.5 px-3 font-mono">{inv.date}</td>
                        <td className="py-1.5 px-3 text-right font-mono">{formatRupiah(inv.purchaseAmount)}</td>
                        <td className="py-1.5 px-3 text-right font-mono font-bold text-emerald-700">{formatRupiah(inv.cashbackAmount)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-50 font-bold border-t border-slate-200">
                    <tr>
                      <td colSpan={2} className="py-2 px-3 text-slate-700">Total Akumulasi Pembelian</td>
                      <td className="py-2 px-3 text-right font-mono">{formatRupiah(viewingReceiptCustomer.totalPurchase)}</td>
                      <td className="py-2 px-3 text-right font-mono text-emerald-800">{formatRupiah(viewingReceiptCustomer.disbursedCashback || viewingReceiptCustomer.totalCashback)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Total Payout Big Banner & Terbilang */}
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1 text-center">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                  Total Dana Cashback yang Telah Diserahkan
                </span>
                <div className="text-xl sm:text-2xl font-black font-mono text-emerald-800">
                  {formatRupiah(viewingReceiptCustomer.disbursedCashback || viewingReceiptCustomer.totalCashback)}
                </div>
                <div className="text-xs italic text-slate-600 font-serif">
                  Terbilang: #{terbilang(viewingReceiptCustomer.disbursedCashback || viewingReceiptCustomer.totalCashback)} Rupiah#
                </div>
              </div>

              {/* Signatures & Photo Handover Box */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
                
                {/* Photo Proof */}
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
                    Foto Bukti Serah Terima:
                  </span>
                  {viewingReceiptCustomer.disbursementProofPhoto ? (
                    <img
                      src={viewingReceiptCustomer.disbursementProofPhoto}
                      alt="Bukti Serah Terima"
                      className="w-full h-28 object-cover rounded-xl border border-slate-200"
                    />
                  ) : (
                    <div className="w-full h-28 rounded-xl border border-dashed border-slate-200 flex items-center justify-center text-slate-400 text-[10px] italic">
                      Tidak dilampirkan foto
                    </div>
                  )}
                </div>

                {/* Receiver Signature */}
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
                    Tanda Tangan Penerima:
                  </span>
                  <div className="w-full h-28 bg-white border border-slate-200 rounded-xl flex items-center justify-center p-1">
                    {viewingReceiptCustomer.disbursementSignature ? (
                      <img
                        src={viewingReceiptCustomer.disbursementSignature}
                        alt="Tanda Tangan Penerima"
                        className="max-h-full max-w-full object-contain"
                      />
                    ) : (
                      <span className="text-slate-400 text-[10px] italic">Belum ada TTD</span>
                    )}
                  </div>
                  <span className="text-[10px] text-center text-slate-600 font-bold block mt-1">
                    ({viewingReceiptCustomer.recipientName || viewingReceiptCustomer.customerName})
                  </span>
                </div>

                {/* PIC / Company Signature */}
                <div className="col-span-2 sm:col-span-1">
                  <span className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
                    Kasir / Keuangan Perusahaan:
                  </span>
                  <div className="w-full h-28 bg-slate-50 border border-slate-200 rounded-xl flex flex-col items-center justify-center p-2 text-center">
                    <CheckCircle2 className="w-6 h-6 text-emerald-600 mb-1" />
                    <span className="text-[10px] font-bold text-slate-800">
                      TERVERIFIKASI SISTEM
                    </span>
                    <span className="text-[9px] text-slate-400 font-mono">
                      {viewingReceiptCustomer.lastDisbursedDate}
                    </span>
                  </div>
                  <span className="text-[10px] text-center text-slate-600 font-bold block mt-1">
                    ({companyProfile?.picName || 'Bagian Keuangan Toko'})
                  </span>
                </div>

              </div>

              {/* Footer Note */}
              <div className="pt-2 border-t border-slate-100 text-[10px] text-slate-400 text-center italic">
                {companyProfile?.footerNotes || 'Tanda terima ini diterbitkan otomatis oleh sistem sebagai bukti sah penyerahan dana reward cashback.'}
              </div>

            </div>

          </div>
        </div>
      )}

      {/* Confirm Revert Disbursement Dialog */}
      <ConfirmDialog
        isOpen={customerToRevert !== null}
        title="Batalkan Pencairan Cashback Konsumen?"
        message={`Apakah Anda yakin ingin membatalkan status pencairan cashback untuk konsumen "${customerToRevert}"? Seluruh faktur transaksi milik konsumen ini akan dikembalikan statusnya menjadi belum dicairkan.`}
        confirmLabel="Ya, Batalkan Pencairan"
        cancelLabel="Batal"
        isDestructive={true}
        onConfirm={() => {
          if (customerToRevert && onRevertCustomerDisbursement) {
            onRevertCustomerDisbursement(customerToRevert);
          }
          setCustomerToRevert(null);
        }}
        onCancel={() => setCustomerToRevert(null)}
      />

    </div>
  );
};
