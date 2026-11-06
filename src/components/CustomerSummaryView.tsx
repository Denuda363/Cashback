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
    window.open(`https://wa.me/${formattedPhone}?text=${message}`, '_blank');
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

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
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
