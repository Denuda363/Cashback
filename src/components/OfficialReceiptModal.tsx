import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  Printer,
  Receipt,
  ShieldCheck,
  Gift,
  Coins,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Copy,
} from 'lucide-react';
import { CustomerSummary, Invoice, CompanyProfile, CustomerBenefitType } from '../types/cashback';
import { formatRupiah, getBenefitLabel } from '../utils/cashbackCalculator';

interface OfficialReceiptModalProps {
  customer: CustomerSummary | null;
  onClose: () => void;
  companyProfile?: CompanyProfile;
  storeName?: string;
}

const RANGKAP_CONFIG = [
  {
    copyNum: 1 as const,
    shortLabel: 'Rangkap 1 (Konsumen)',
    badge: 'RANGKAP 1 : ASLI — UNTUK KONSUMEN / PENERIMA',
    badgeClass: 'bg-emerald-700 text-white border-emerald-800',
  },
  {
    copyNum: 2 as const,
    shortLabel: 'Rangkap 2 (Arsip Toko)',
    badge: 'RANGKAP 2 : SALINAN ARSIP — UNTUK PERUSAHAAN / KASIR',
    badgeClass: 'bg-slate-800 text-white border-slate-900',
  },
];

export const OfficialReceiptModal: React.FC<OfficialReceiptModalProps> = ({
  customer,
  onClose,
  companyProfile,
  storeName = 'CashbackPro',
}) => {
  // Configuration: number of invoice rows per page (user adjustable)
  const [rowsPerPage, setRowsPerPage] = useState<number | 'all'>(5);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [activeRangkap, setActiveRangkap] = useState<1 | 2>(1);

  // Reset pagination when customer changes
  useEffect(() => {
    setCurrentPage(1);
    setActiveRangkap(1);
  }, [customer?.customerCode, customer?.customerName]);

  const invoicesList: Invoice[] = useMemo(() => customer?.invoices || [], [customer]);
  const totalInvoices = invoicesList.length;

  const effectiveRowsPerPage = rowsPerPage === 'all' ? Math.max(1, totalInvoices) : rowsPerPage;
  const totalPages = Math.max(1, Math.ceil(Math.max(1, totalInvoices) / effectiveRowsPerPage));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  // Generate chunks for printing so all pages print cleanly when multi-page
  const printChunks = useMemo(() => {
    if (totalInvoices === 0) {
      return [[]];
    }
    if (rowsPerPage === 'all' || totalInvoices <= effectiveRowsPerPage) {
      return [invoicesList];
    }
    const chunks: Invoice[][] = [];
    for (let i = 0; i < totalInvoices; i += effectiveRowsPerPage) {
      chunks.push(invoicesList.slice(i, i + effectiveRowsPerPage));
    }
    return chunks;
  }, [invoicesList, effectiveRowsPerPage, rowsPerPage, totalInvoices]);

  // All React hooks MUST be called before conditional early return!
  if (!customer) return null;

  // Helper to convert number to Indonesian words (Terbilang)
  const terbilang = (nominal: number): string => {
    const angka = ['', 'Satu', 'Dua', 'Tiga', 'Empat', 'Lima', 'Enam', 'Tujuh', 'Delapan', 'Sembilan', 'Sepuluh', 'Sebelas'];
    const n = Math.floor(Math.abs(nominal));
    if (n === 0) return 'Nol';
    if (n < 12) return angka[n];
    if (n < 20) return `${terbilang(n - 10)} Belas`;
    if (n < 100) {
      const rem = n % 10;
      return `${terbilang(Math.floor(n / 10))} Puluh${rem > 0 ? ` ${angka[rem]}` : ''}`;
    }
    if (n < 200) {
      const rem = n - 100;
      return `Seratus${rem > 0 ? ` ${terbilang(rem)}` : ''}`;
    }
    if (n < 1000) {
      const rem = n % 100;
      return `${terbilang(Math.floor(n / 100))} Ratus${rem > 0 ? ` ${terbilang(rem)}` : ''}`;
    }
    if (n < 2000) {
      const rem = n - 1000;
      return `Seribu${rem > 0 ? ` ${terbilang(rem)}` : ''}`;
    }
    if (n < 1000000) {
      const rem = n % 1000;
      return `${terbilang(Math.floor(n / 1000))} Ribu${rem > 0 ? ` ${terbilang(rem)}` : ''}`;
    }
    if (n < 1000000000) {
      const rem = n % 1000000;
      return `${terbilang(Math.floor(n / 1000000))} Juta${rem > 0 ? ` ${terbilang(rem)}` : ''}`;
    }
    if (n < 1000000000000) {
      const rem = n % 1000000000;
      return `${terbilang(Math.floor(n / 1000000000))} Miliar${rem > 0 ? ` ${terbilang(rem)}` : ''}`;
    }
    const rem = n % 1000000000000;
    return `${terbilang(Math.floor(n / 1000000000000))} Triliun${rem > 0 ? ` ${terbilang(rem)}` : ''}`;
  };

  const totalCashbackAmount = customer.disbursedCashback > 0 ? customer.disbursedCashback : customer.totalCashback;
  const isDisbursed = customer.disbursedCashback > 0 || Boolean(customer.lastDisbursedDate);
  const benefitType: CustomerBenefitType = customer.benefitType || (customer.getParcel ? 'cashback_parcel' : 'cashback_only');

  const handlePrint = () => {
    window.print();
  };

  const docNumber = `BAP-CB/${customer.customerCode || 'KONS'}/${(customer.lastDisbursedDate || new Date().toISOString().split('T')[0]).replace(/-/g, '')}`;
  const docDate = customer.lastDisbursedDate || new Date().toISOString().split('T')[0];

  return (
    <div className="fixed inset-0 z-60 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 print:static print:inset-auto print:block print:bg-white print:p-0 print:overflow-visible">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-4xl w-full max-h-[96vh] flex flex-col overflow-hidden print:max-w-none print:w-full print:max-h-none print:block print:border-none print:shadow-none print:rounded-none print:overflow-visible">
        
        {/* Interactive Top Bar (Hidden on Print) */}
        <div className="px-4 py-3 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3 shrink-0 print:hidden">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-sm block">
                Tanda Terima Resmi Serah Terima Cashback
              </span>
              <span className="text-[11px] text-slate-400">
                Otomatis cetak 2 rangkap (Rangkap 1 Asli Konsumen & Rangkap 2 Arsip Perusahaan)
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Switcher Preview Rangkap 1 vs Rangkap 2 */}
            <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-lg border border-slate-700 text-xs">
              <Copy className="w-3.5 h-3.5 text-slate-400 ml-1" />
              {RANGKAP_CONFIG.map((r) => (
                <button
                  key={r.copyNum}
                  type="button"
                  onClick={() => setActiveRangkap(r.copyNum)}
                  className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-all ${
                    activeRangkap === r.copyNum
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {r.shortLabel}
                </button>
              ))}
            </div>

            {/* Setting: Banyak Baris per Halaman */}
            <div className="flex items-center gap-1.5 bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700 text-xs">
              <span className="text-slate-400 text-[11px] whitespace-nowrap">Baris/Hal:</span>
              <div className="flex items-center gap-1">
                {[5, 10, 15, 20].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => {
                      setRowsPerPage(num);
                      setCurrentPage(1);
                    }}
                    className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-all ${
                      rowsPerPage === num
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {num}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    setRowsPerPage('all');
                    setCurrentPage(1);
                  }}
                  className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-all ${
                    rowsPerPage === 'all'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  Semua
                </button>
              </div>
            </div>

            {/* Print Button (2 Rangkap) */}
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak 2 Rangkap / PDF</span>
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              title="Tutup"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Paper Area (Strictly 2 Rangkap) */}
        <div className="p-5 sm:p-8 overflow-y-auto flex-1 font-sans text-xs space-y-6 print:p-0 print:overflow-visible print:block print:space-y-0">
          
          {RANGKAP_CONFIG.map((rangkap, rangkapIndex) =>
            printChunks.map((chunk, pageIndex) => {
              const pageNum = pageIndex + 1;
              const isLastPageOfCopy = pageIndex === printChunks.length - 1;
              const isVeryLastPage = rangkapIndex === RANGKAP_CONFIG.length - 1 && isLastPageOfCopy;

              // On screen: only show the currently selected Rangkap & page (or all pages if rowsPerPage === 'all')
              const isVisibleOnScreen =
                rangkap.copyNum === activeRangkap &&
                (rowsPerPage === 'all' || pageNum === safeCurrentPage);

              return (
                <div
                  key={`rangkap-${rangkap.copyNum}-page-${pageIndex}`}
                  className={`space-y-4 print:block ${
                    isVisibleOnScreen ? 'block' : 'hidden'
                  }`}
                  style={{
                    breakAfter: isVeryLastPage ? 'auto' : 'page',
                    pageBreakAfter: isVeryLastPage ? 'auto' : 'always',
                  }}
                >
                  {/* Copy / Rangkap Header Strip */}
                  <div className="flex items-center justify-between gap-2 pb-1">
                    <span className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-black tracking-wider uppercase border ${rangkap.badgeClass}`}>
                      {rangkap.badge}
                    </span>
                    <span className="text-[10px] font-mono text-slate-500">
                      Dokumen 2 Rangkap Resmi • Lembar {rangkap.copyNum}/2
                    </span>
                  </div>

                  {/* 1. KOP SURAT PERUSAHAAN */}
                  <div className="pb-3 border-b-4 border-double border-slate-900 flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-lg bg-emerald-700 text-white flex items-center justify-center font-black text-lg shadow-xs print:border print:border-slate-800 shrink-0">
                          {(companyProfile?.companyName || storeName).charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight leading-tight uppercase">
                            {companyProfile?.companyName || storeName}
                          </h1>
                          <p className="text-[11px] text-slate-600 font-medium italic">
                            {companyProfile?.tagline || 'Program Apresiasi Loyalitas & Cashback Belanja Resmi'}
                          </p>
                        </div>
                      </div>

                      <div className="text-[10px] sm:text-[11px] text-slate-600 pt-0.5 leading-relaxed">
                        {companyProfile?.address && <span>{companyProfile.address}</span>}
                        {companyProfile?.city && <span>, {companyProfile.city}</span>}
                        <div className="flex items-center gap-3 text-slate-500 flex-wrap">
                          {companyProfile?.phone && <span>Telp/WA: <strong>{companyProfile.phone}</strong></span>}
                          {companyProfile?.email && <span>Email: {companyProfile.email}</span>}
                          {companyProfile?.taxNumber && <span>NPWP/NIB: {companyProfile.taxNumber}</span>}
                        </div>
                      </div>
                    </div>

                    {/* Dokumen Meta Box */}
                    <div className="text-right shrink-0 bg-slate-50 border border-slate-300 rounded-lg p-2.5 min-w-[180px] print:bg-white print:border-slate-400">
                      <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                        BERITA ACARA RESMI
                      </div>
                      <div className="text-xs font-black font-mono text-slate-900 mt-0.5">
                        {docNumber}
                      </div>
                      <div className="text-[10px] text-slate-600 font-mono mt-1">
                        Tanggal: <strong>{docDate}</strong>
                      </div>
                      <div className="text-[9px] text-slate-500 font-mono mt-0.5">
                        Rangkap {rangkap.copyNum}/2 • Hal. {pageNum}/{printChunks.length}
                      </div>
                    </div>
                  </div>

                  {/* 2. JUDUL DOKUMEN */}
                  <div className="text-center py-0.5">
                    <h2 className="text-sm sm:text-base font-black uppercase tracking-wider text-slate-900 underline decoration-slate-900 decoration-2 underline-offset-4">
                      TANDA TERIMA & BERITA ACARA SERAH TERIMA CASHBACK
                    </h2>
                    <p className="text-[11px] text-slate-600 mt-1">
                      Surat bukti penyerahan dana reward tunai (cash) dan apresiasi belanja konsumen
                    </p>
                  </div>

                  {/* 3. IDENTITAS KEDUA BELAH PIHAK */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    {/* Pihak Pertama */}
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1 print:bg-white print:border-slate-300">
                      <span className="text-[9px] font-black uppercase tracking-wider text-slate-500 block">
                        PIHAK PERTAMA (PEMBERI CASHBACK):
                      </span>
                      <div className="font-bold text-slate-900">
                        {companyProfile?.companyName || storeName}
                      </div>
                      <div className="text-[11px] text-slate-600">
                        Petugas: <span className="font-semibold text-slate-800">{companyProfile?.picName || 'Kasir / Staf Keuangan'}</span> ({companyProfile?.picTitle || 'Finance / Store Officer'})
                      </div>
                      <div className="text-[11px] text-slate-600">
                        Metode Penyerahan: <span className="font-bold text-emerald-800">Tunai (Cash)</span>
                      </div>
                    </div>

                    {/* Pihak Kedua */}
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1 print:bg-white print:border-slate-300">
                      <span className="text-[9px] font-black uppercase tracking-wider text-slate-500 block">
                        PIHAK KEDUA (KONSUMEN PENERIMA):
                      </span>
                      <div className="font-bold text-slate-900 flex items-center justify-between">
                        <span>{customer.customerName}</span>
                        {customer.customerCode && (
                          <span className="text-[10px] font-mono text-slate-500 font-normal">
                            [{customer.customerCode}]
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-600">
                        WhatsApp/HP: <span className="font-mono font-semibold text-slate-800">{customer.customerPhone || '-'}</span>
                      </div>
                      <div className="text-[11px] text-slate-600">
                        Penerima Dana: <span className="font-semibold text-slate-800">{customer.recipientName || customer.customerName}</span>
                      </div>
                    </div>
                  </div>

                  {/* 4. CALLOUT RESMI: PAKET YANG DITERIMA KONSUMEN */}
                  <div className={`p-3.5 rounded-xl border-2 flex items-center justify-between gap-4 ${
                    benefitType === 'cashback_parcel'
                      ? 'bg-purple-50/70 border-purple-300 text-purple-950 print:bg-purple-50'
                      : benefitType === 'parcel_only'
                      ? 'bg-amber-50/70 border-amber-300 text-amber-950 print:bg-amber-50'
                      : 'bg-emerald-50/70 border-emerald-300 text-emerald-950 print:bg-emerald-50'
                  }`}>
                    <div className="flex items-center gap-3">
                      <div className={`p-2.5 rounded-xl text-white shadow-xs shrink-0 ${
                        benefitType === 'cashback_parcel'
                          ? 'bg-purple-700'
                          : benefitType === 'parcel_only'
                          ? 'bg-amber-600'
                          : 'bg-emerald-700'
                      }`}>
                        {benefitType === 'cashback_parcel' ? (
                          <Sparkles className="w-5 h-5" />
                        ) : benefitType === 'parcel_only' ? (
                          <Gift className="w-5 h-5" />
                        ) : (
                          <Coins className="w-5 h-5" />
                        )}
                      </div>
                      <div>
                        <span className="text-[9px] font-bold uppercase tracking-wider block opacity-75">
                          PAKET YANG DITERIMA OLEH KONSUMEN:
                        </span>
                        <span className="text-sm sm:text-base font-black tracking-tight block">
                          {benefitType === 'cashback_parcel' && 'CASHBACK TUNAI (CASH) & BINGKISAN PARSEL'}
                          {benefitType === 'parcel_only' && 'BINGKISAN PARSEL APRESIASI BELANJA'}
                          {benefitType === 'cashback_only' && 'DANA CASHBACK TUNAI (CASH)'}
                        </span>
                        <span className="text-[11px] opacity-85 mt-0.5 block">
                          {benefitType === 'cashback_parcel' && 'Konsumen menerima pengembalian dana cashback tunai (cash) beserta bingkisan parsel.'}
                          {benefitType === 'parcel_only' && 'Konsumen menerima bingkisan parsel apresiasi belanja.'}
                          {benefitType === 'cashback_only' && 'Konsumen menerima pengembalian dana cashback secara tunai (cash).'}
                        </span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-[10px] font-bold uppercase tracking-wider opacity-75 block">Status Penyerahan</span>
                      <span className={`inline-block px-2.5 py-1 text-xs font-bold rounded-lg mt-0.5 ${
                        isDisbursed
                          ? 'bg-emerald-600 text-white'
                          : 'bg-amber-500 text-white'
                      }`}>
                        {isDisbursed ? '✓ SUDAH DITERIMA' : 'SIAP DISERAHKAN'}
                      </span>
                    </div>
                  </div>

                  {/* 5. TABEL RINCIAN FAKTUR TRANSAKSI */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-slate-800">
                        Rincian Faktur Belanja Acuan Cashback (Halaman {pageNum} dari {printChunks.length}):
                      </span>
                      <span className="text-slate-500 font-mono">
                        Menampilkan {chunk.length} dari {totalInvoices} faktur
                      </span>
                    </div>

                    <div className="border border-slate-300 rounded-lg overflow-hidden">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead className="bg-slate-100 text-slate-800 font-bold text-[10px] uppercase border-b border-slate-300">
                          <tr>
                            <th className="py-2 px-2.5 text-center w-8 border-r border-slate-200">No</th>
                            <th className="py-2 px-3 border-r border-slate-200">No. Faktur</th>
                            <th className="py-2 px-3 border-r border-slate-200">Tanggal</th>
                            <th className="py-2 px-3 border-r border-slate-200">Kategori & Uraian Barang</th>
                            <th className="py-2 px-3 text-right border-r border-slate-200">Nilai Belanja</th>
                            <th className="py-2 px-2.5 text-center w-14 border-r border-slate-200">% Rate</th>
                            <th className="py-2 px-3 text-right border-r border-slate-200">Nilai Cashback</th>
                            <th className="py-2 px-2.5 text-center w-28">Paket Diterima</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 font-mono text-[11px]">
                          {chunk.length === 0 ? (
                            <tr>
                              <td colSpan={8} className="py-4 px-3 text-center font-sans text-slate-500 italic">
                                Tidak ada rincian faktur pada periode filter ini.
                              </td>
                            </tr>
                          ) : (
                            chunk.map((inv, idx) => {
                              const globalIdx = (pageIndex * effectiveRowsPerPage) + idx + 1;
                              return (
                                <tr key={inv.id} className="hover:bg-slate-50/70">
                                  <td className="py-1.5 px-2.5 text-center border-r border-slate-200 text-slate-600">
                                    {globalIdx}
                                  </td>
                                  <td className="py-1.5 px-3 font-semibold text-slate-900 border-r border-slate-200 whitespace-nowrap">
                                    {inv.invoiceNumber}
                                  </td>
                                  <td className="py-1.5 px-3 text-slate-700 border-r border-slate-200 whitespace-nowrap">
                                    {inv.date}
                                  </td>
                                  <td className="py-1.5 px-3 font-sans text-slate-800 border-r border-slate-200">
                                    <div className="font-semibold">{inv.category}</div>
                                    {inv.itemsDescription && (
                                      <div className="text-[10px] text-slate-500 truncate max-w-xs">{inv.itemsDescription}</div>
                                    )}
                                  </td>
                                  <td className="py-1.5 px-3 text-right font-semibold text-slate-900 border-r border-slate-200 whitespace-nowrap">
                                    {formatRupiah(inv.purchaseAmount)}
                                  </td>
                                  <td className="py-1.5 px-2.5 text-center text-slate-700 border-r border-slate-200 whitespace-nowrap">
                                    {inv.cashbackPercentage}%
                                  </td>
                                  <td className="py-1.5 px-3 text-right font-bold text-emerald-800 border-r border-slate-200 whitespace-nowrap">
                                    {formatRupiah(inv.cashbackAmount)}
                                  </td>
                                  <td className="py-1.5 px-2.5 text-center font-sans whitespace-nowrap">
                                    {benefitType === 'cashback_parcel' ? (
                                      <span className="text-[10px] font-bold text-purple-800 bg-purple-100 px-1.5 py-0.5 rounded">
                                        Cashback + Parsel
                                      </span>
                                    ) : benefitType === 'parcel_only' ? (
                                      <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded">
                                        Parcel
                                      </span>
                                    ) : (
                                      <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded">
                                        Cashback
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                        {isLastPageOfCopy && (
                          <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-300 text-xs">
                            <tr>
                              <td colSpan={4} className="py-2.5 px-3 text-slate-900 font-sans text-right">
                                TOTAL AKUMULASI TRANSAKSI:
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono text-slate-900 border-r border-slate-200">
                                {formatRupiah(customer.totalPurchase)}
                              </td>
                              <td className="py-2.5 px-2.5 text-center font-mono text-slate-600 border-r border-slate-200">
                                -
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono text-emerald-800 font-black border-r border-slate-200 text-sm">
                                {formatRupiah(totalCashbackAmount)}
                              </td>
                              <td className="py-2.5 px-2.5 text-center font-sans text-slate-900">
                                {getBenefitLabel(benefitType)}
                              </td>
                            </tr>
                          </tfoot>
                        )}
                      </table>
                    </div>
                  </div>

                  {/* 6. REKAPITULASI TOTAL & TANDA TANGAN (Hanya pada Halaman Terakhir setiap Rangkap) */}
                  {isLastPageOfCopy && (
                    <>
                      <div className="p-3.5 bg-emerald-50/80 border border-emerald-300 rounded-xl space-y-1 text-center print:bg-emerald-50">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-900 block">
                          TOTAL DANA CASHBACK TUNAI YANG DISERAHKAN
                        </span>
                        <div className="text-2xl sm:text-3xl font-black font-mono text-emerald-900 tracking-tight">
                          {formatRupiah(totalCashbackAmount)}
                        </div>
                        <div className="text-xs italic text-slate-700 font-serif">
                          Terbilang: #{terbilang(totalCashbackAmount)} Rupiah#
                        </div>
                      </div>

                      {/* Klausul Legal Berita Acara */}
                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-[10px] sm:text-[11px] text-slate-600 leading-relaxed print:bg-white print:border-slate-300">
                        <strong>Pernyataan Berita Acara ({rangkap.shortLabel}):</strong> Dengan ditandatanganinya Berita Acara & Tanda Terima ini, Pihak Pertama telah menyerahkan secara tunai (cash) dan Pihak Kedua telah menerima dana reward cashback belanja dan/atau bingkisan parsel sesuai data rincian di atas dalam keadaan baik, lengkap, dan sah. Dokumen ini diterbitkan dalam 2 (dua) rangkap resmi yang memiliki kekuatan hukum yang sama.
                      </div>

                      {/* 7. KOTAK TANDA TANGAN & DOKUMENTASI FOTO */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1">
                        
                        {/* Foto Dokumentasi */}
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 block mb-1">
                            Dokumentasi Serah Terima:
                          </span>
                          {customer.disbursementProofPhoto ? (
                            <div className="w-full h-28 rounded-xl border border-slate-300 overflow-hidden bg-slate-100 flex items-center justify-center p-0.5">
                              <img
                                src={customer.disbursementProofPhoto}
                                alt="Bukti Serah Terima"
                                className="w-full h-full object-cover rounded-lg"
                              />
                            </div>
                          ) : (
                            <div className="w-full h-28 rounded-xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400 text-[10px] p-2 text-center bg-slate-50 print:bg-white">
                              <span>(Tidak ada lampiran foto)</span>
                            </div>
                          )}
                          <span className="text-[9px] text-slate-400 text-center block mt-1">
                            Foto Fisik / Penyerahan
                          </span>
                        </div>

                        {/* Tanda Tangan Penerima (Pihak Kedua) */}
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 block mb-1">
                            Pihak Kedua (Penerima):
                          </span>
                          <div className="w-full h-28 bg-white border border-slate-300 rounded-xl flex items-center justify-center p-1.5 relative overflow-hidden">
                            {customer.disbursementSignature ? (
                              <img
                                src={customer.disbursementSignature}
                                alt="Tanda Tangan Penerima"
                                className="max-h-full max-w-full object-contain filter contrast-125"
                              />
                            ) : (
                              <div className="text-center text-slate-400 text-[10px]">
                                <div className="w-24 border-b border-slate-300 mb-1 mx-auto"></div>
                                <span>Tanda Tangan Basah</span>
                              </div>
                            )}
                          </div>
                          <div className="text-center mt-1">
                            <span className="text-[11px] font-bold text-slate-900 block">
                              {customer.recipientName || customer.customerName}
                            </span>
                            <span className="text-[9px] text-slate-500 font-mono">
                              Konsumen / Penerima
                            </span>
                          </div>
                        </div>

                        {/* Tanda Tangan Pihak Pertama (Kasir / Toko) */}
                        <div className="col-span-2 sm:col-span-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 block mb-1">
                            Pihak Pertama (Pemberi):
                          </span>
                          <div className="w-full h-28 bg-slate-50 border border-slate-300 rounded-xl flex flex-col items-center justify-center p-2 text-center relative print:bg-white">
                            <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mb-1">
                              <ShieldCheck className="w-4 h-4" />
                            </div>
                            <span className="text-[10px] font-bold text-emerald-800">
                              TERVERIFIKASI SISTEM
                            </span>
                            <span className="text-[9px] text-slate-500 font-mono mt-0.5">
                              {docDate}
                            </span>
                            <div className="mt-1 w-20 border-b border-dashed border-slate-300"></div>
                          </div>
                          <div className="text-center mt-1">
                            <span className="text-[11px] font-bold text-slate-900 block">
                              {companyProfile?.picName || 'Kasir / Bagian Keuangan'}
                            </span>
                            <span className="text-[9px] text-slate-500">
                              {companyProfile?.picTitle || 'Store / Finance Officer'}
                            </span>
                          </div>
                        </div>

                      </div>

                      {/* Catatan Kaki / Kebijakan */}
                      <div className="pt-2.5 border-t border-slate-200 text-center space-y-0.5">
                        <p className="text-[10px] text-slate-500 italic">
                          {companyProfile?.footerNotes || 'Tanda terima resmi ini dicetak otomatis oleh sistem dalam 2 rangkap sebagai bukti sah serah terima cashback tunai.'}
                        </p>
                        <p className="text-[9px] text-slate-400 font-mono">
                          {rangkap.badge} • Dicetak pada: {new Date().toLocaleString('id-ID')}
                        </p>
                      </div>
                    </>
                  )}
                </div>
              );
            })
          )}

        </div>

        {/* Screen Pagination Controls (Hidden on Print) */}
        {rowsPerPage !== 'all' && totalPages > 1 && (
          <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between shrink-0 print:hidden text-xs">
            <span className="text-slate-600 text-[11px]">
              Pratinjau <strong>Rangkap {activeRangkap}/2</strong> — Halaman <strong>{safeCurrentPage}</strong> dari <strong>{totalPages}</strong> ({totalInvoices} faktur)
            </span>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={safeCurrentPage <= 1}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 transition-colors"
                title="Halaman Sebelumnya"
              >
                <ChevronLeft className="w-4 h-4 text-slate-700" />
              </button>

              {Array.from({ length: totalPages }).map((_, i) => {
                const p = i + 1;
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setCurrentPage(p)}
                    className={`px-2.5 py-1 rounded-lg font-bold text-xs transition-colors ${
                      safeCurrentPage === p
                        ? 'bg-slate-900 text-white'
                        : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {p}
                  </button>
                );
              })}

              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={safeCurrentPage >= totalPages}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 transition-colors"
                title="Halaman Berikutnya"
              >
                <ChevronRight className="w-4 h-4 text-slate-700" />
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
