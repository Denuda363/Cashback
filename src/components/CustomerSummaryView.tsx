import React, { useState, useMemo } from 'react';
import { 
  Users, 
  Search, 
  Download, 
  Receipt, 
  Phone, 
  ArrowUpRight, 
  Wallet, 
  CheckCircle2, 
  Clock,
  Sparkles,
  Gift
} from 'lucide-react';
import { CustomerSummary } from '../types/cashback';
import { formatRupiah, formatNumber } from '../utils/cashbackCalculator';

interface CustomerSummaryViewProps {
  customerSummaries: CustomerSummary[];
  onSelectCustomerForInvoices: (customerName: string) => void;
  onExportExcel: () => void;
}

export const CustomerSummaryView: React.FC<CustomerSummaryViewProps> = ({
  customerSummaries,
  onSelectCustomerForInvoices,
  onExportExcel,
}) => {
  const [search, setSearch] = useState('');
  const [tierFilter, setTierFilter] = useState<'all' | 'Platinum' | 'Gold' | 'Silver' | 'Bronze'>('all');
  const [sortBy, setSortBy] = useState<'cashback_desc' | 'purchase_desc' | 'unclaimed_desc' | 'invoices_desc'>('cashback_desc');

  const filtered = useMemo(() => {
    let list = customerSummaries.filter((c) => {
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchName = c.customerName.toLowerCase().includes(q);
        const matchPhone = c.customerPhone.toLowerCase().includes(q);
        if (!matchName && !matchPhone) return false;
      }
      if (tierFilter !== 'all' && c.tier !== tierFilter) {
        return false;
      }
      return true;
    });

    list.sort((a, b) => {
      if (sortBy === 'cashback_desc') {
        return b.totalCashback - a.totalCashback;
      }
      if (sortBy === 'purchase_desc') {
        return b.totalPurchase - a.totalPurchase;
      }
      if (sortBy === 'unclaimed_desc') {
        const unclaimedA = a.totalCashback - a.disbursedCashback;
        const unclaimedB = b.totalCashback - b.disbursedCashback;
        return unclaimedB - unclaimedA;
      }
      if (sortBy === 'invoices_desc') {
        return b.invoiceCount - a.invoiceCount;
      }
      return 0;
    });

    return list;
  }, [customerSummaries, search, tierFilter, sortBy]);

  const handleContactWhatsApp = (phone: string, name: string, balance: number) => {
    const cleanPhone = phone.replace(/\D/g, '');
    const formattedPhone = cleanPhone.startsWith('0') ? '62' + cleanPhone.slice(1) : cleanPhone;
    const message = encodeURIComponent(
      `Halo Kak ${name},\nKami dari tim customer relation ingin menginfokan bahwa saat ini Anda memiliki saldo cashback siap cair sebesar ${formatRupiah(balance)}. Silakan konfirmasi rekening atau metode pencairan yang diinginkan. Terima kasih!`
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

  return (
    <div className="space-y-4">
      
      {/* Header Banner */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-purple-50 text-purple-700">
                <Users className="w-5 h-5" />
              </div>
              <h1 className="text-lg font-bold text-slate-900">
                Rekap Akumulasi Saldo Per Konsumen
              </h1>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Ringkasan total transaksi, reward cashback, saldo sudah cair dan sisa yang belum dicairkan
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onExportExcel}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Rekap Konsumen</span>
            </button>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-3">
          
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Cari konsumen / nomor kontak..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-slate-900"
            />
          </div>

          <div>
            <select
              value={tierFilter}
              onChange={(e) => setTierFilter(e.target.value as any)}
              className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-slate-900"
            >
              <option value="all">Semua Tier Loyalitas</option>
              <option value="Platinum">Tier Platinum</option>
              <option value="Gold">Tier Gold</option>
              <option value="Silver">Tier Silver</option>
              <option value="Bronze">Tier Bronze</option>
            </select>
          </div>

          <div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-slate-900"
            >
              <option value="cashback_desc">Urutkan Cashback Tertinggi</option>
              <option value="purchase_desc">Urutkan Total Belanja Terbesar</option>
              <option value="unclaimed_desc">Urutkan Sisa Belum Cair Tertinggi</option>
              <option value="invoices_desc">Urutkan Frekuensi Faktur Terbanyak</option>
            </select>
          </div>

        </div>
      </div>

      {/* Mobile Minimalist Card View */}
      <div className="md:hidden space-y-2.5">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-slate-400 bg-white rounded-xl border border-slate-200">
            <p className="text-sm font-semibold text-slate-700">Tidak ada konsumen ditemukan</p>
          </div>
        ) : (
          filtered.map((cust, idx) => {
            const unclaimed = cust.totalCashback - cust.disbursedCashback;

            return (
              <div key={cust.customerPhone || cust.customerName} className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-xs space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 text-xs font-bold flex items-center justify-center shrink-0">
                      {cust.rank || idx + 1}
                    </span>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">{cust.customerName}</h3>
                      <p className="text-[11px] text-slate-500 font-mono">{cust.customerPhone}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    {cust.getParcel && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-0.5">
                        <Gift className="w-2.5 h-2.5" /> Parcel
                      </span>
                    )}
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                      {cust.tier}
                    </span>
                  </div>
                </div>

                {/* Financial Summary */}
                <div className="grid grid-cols-2 gap-2 p-2.5 bg-slate-50 rounded-lg text-xs font-mono tabular-nums">
                  <div>
                    <span className="text-[10px] text-slate-500 font-sans block">Total Belanja</span>
                    <span className="font-semibold text-slate-800">{formatRupiah(cust.totalPurchase)}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-500 font-sans block">Total Cashback</span>
                    <span className="font-bold text-emerald-700 text-sm">{formatRupiah(cust.totalCashback)}</span>
                  </div>
                  {unclaimed > 0 && (
                    <div className="col-span-2 pt-1 border-t border-slate-200/60 flex justify-between text-[11px]">
                      <span className="text-slate-500 font-sans">Sisa Belum Dicairkan:</span>
                      <span className="font-bold text-amber-700">{formatRupiah(unclaimed)}</span>
                    </div>
                  )}
                </div>

                {/* Mobile Actions */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-[11px] text-slate-400 font-mono">
                    {cust.invoiceCount} Faktur
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onSelectCustomerForInvoices(cust.customerName)}
                      className="flex items-center gap-1 px-2.5 py-1 font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors"
                    >
                      <Receipt className="w-3.5 h-3.5" />
                      <span>Faktur</span>
                    </button>
                    <button
                      onClick={() => handleContactWhatsApp(cust.customerPhone, cust.customerName, unclaimed > 0 ? unclaimed : cust.totalCashback)}
                      className="flex items-center gap-1 px-2.5 py-1 font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                    >
                      <Phone className="w-3.5 h-3.5 text-emerald-600" />
                      <span>WA</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Desktop Table (hidden on mobile, visible on desktop) */}
      <div className="hidden md:block bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4 w-12 text-center">#</th>
                <th className="py-3 px-4">Nama Konsumen</th>
                <th className="py-3 px-4 text-center">Tier</th>
                <th className="py-3 px-4 text-right">Total Belanja</th>
                <th className="py-3 px-4 text-right">Total Cashback</th>
                <th className="py-3 px-4 text-center">Parcel</th>
                <th className="py-3 px-4 text-right">Sudah Dicairkan</th>
                <th className="py-3 px-4 text-right">Sisa Belum Cair</th>
                <th className="py-3 px-4 text-center">Jml Faktur</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-10 text-center text-slate-400">
                    Tidak ada konsumen yang sesuai kriteria pencarian.
                  </td>
                </tr>
              ) : (
                filtered.map((cust, idx) => {
                  const unclaimed = cust.totalCashback - cust.disbursedCashback;

                  return (
                    <tr key={cust.customerPhone || cust.customerName} className="hover:bg-slate-50/80 transition-colors">
                      
                      {/* Rank Index */}
                      <td className="py-3 px-4 text-center font-mono tabular-nums text-slate-400 text-xs">
                        {cust.rank || idx + 1}
                      </td>

                      {/* Customer Info */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{cust.customerName}</div>
                        <div className="text-[11px] text-slate-500 font-mono tabular-nums">
                          {cust.customerPhone} · Terakhir: {cust.lastPurchaseDate}
                        </div>
                      </td>

                      {/* Tier Badge */}
                      <td className="py-3 px-4 text-center">
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
                      </td>

                      {/* Total Spend */}
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-800 font-medium">
                        {formatRupiah(cust.totalPurchase)}
                      </td>

                      {/* Total Cashback */}
                      <td className="py-3 px-4 text-right font-mono tabular-nums font-bold text-emerald-700">
                        {formatRupiah(cust.totalCashback)}
                      </td>

                      {/* Parcel Qualification */}
                      <td className="py-3 px-4 text-center">
                        {cust.getParcel ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                            <Gift className="w-3 h-3 text-amber-600" />
                            Ya
                          </span>
                        ) : (
                          <span className="text-[11px] font-medium text-slate-400">
                            Tidak
                          </span>
                        )}
                      </td>

                      {/* Disbursed */}
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-600">
                        {formatRupiah(cust.disbursedCashback)}
                      </td>

                      {/* Unclaimed Balance */}
                      <td className="py-3 px-4 text-right font-mono tabular-nums font-bold">
                        {unclaimed > 0 ? (
                          <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                            {formatRupiah(unclaimed)}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-normal">Rp 0 (Lunas)</span>
                        )}
                      </td>

                      {/* Invoice count */}
                      <td className="py-3 px-4 text-center font-mono tabular-nums text-slate-700">
                        {cust.invoiceCount}
                      </td>

                      {/* Action */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => onSelectCustomerForInvoices(cust.customerName)}
                            title="Buka daftar faktur konsumen ini"
                            className="p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-md transition-colors"
                          >
                            <Receipt className="w-4 h-4" />
                          </button>
                          {unclaimed > 0 && (
                            <button
                              onClick={() => handleContactWhatsApp(cust.customerPhone, cust.customerName, unclaimed)}
                              title="Kabari konsumen bahwa ada cashback siap dicairkan"
                              className="p-1.5 text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors"
                            >
                              <Phone className="w-4 h-4" />
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

    </div>
  );
};
