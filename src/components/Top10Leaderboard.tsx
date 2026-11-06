import React, { useState, useMemo } from 'react';
import { 
  Trophy, 
  Crown, 
  Medal, 
  Download, 
  Search, 
  Phone, 
  Receipt, 
  ExternalLink,
  Sparkles,
  ArrowUpDown,
  Gift
} from 'lucide-react';
import { CustomerSummary, Invoice } from '../types/cashback';
import { formatRupiah, formatNumber } from '../utils/cashbackCalculator';

interface Top10LeaderboardProps {
  customerSummaries: CustomerSummary[];
  invoices: Invoice[];
  onSelectCustomer: (customerName: string) => void;
  onExportExcel: () => void;
}

export const Top10Leaderboard: React.FC<Top10LeaderboardProps> = ({
  customerSummaries,
  invoices,
  onSelectCustomer,
  onExportExcel,
}) => {
  const [periodFilter, setPeriodFilter] = useState<'all' | 'this_month' | 'last_month'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Filter invoices based on period if selected, then recalculate rankings
  const rankedData = useMemo(() => {
    let filteredInvoices = invoices;
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-indexed

    if (periodFilter === 'this_month') {
      filteredInvoices = invoices.filter((inv) => {
        const d = new Date(inv.date);
        return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
      });
    } else if (periodFilter === 'last_month') {
      const lastMonthDate = new Date(currentYear, currentMonth - 1, 1);
      const targetYear = lastMonthDate.getFullYear();
      const targetMonth = lastMonthDate.getMonth();
      filteredInvoices = invoices.filter((inv) => {
        const d = new Date(inv.date);
        return d.getFullYear() === targetYear && d.getMonth() === targetMonth;
      });
    }

    // Re-aggregate if period filter is applied
    const map = new Map<string, CustomerSummary>();
    for (const inv of filteredInvoices) {
      const key = (inv.customerPhone?.trim() || inv.customerName.trim()).toLowerCase();
      const cur = map.get(key);
      if (cur) {
        cur.totalPurchase += inv.purchaseAmount;
        cur.totalCashback += inv.cashbackAmount;
        cur.invoiceCount += 1;
        if (inv.claimStatus === 'disbursed') cur.disbursedCashback += inv.cashbackAmount;
        if (inv.claimStatus === 'ready') cur.readyCashback += inv.cashbackAmount;
        if (inv.claimStatus === 'pending') cur.pendingCashback += inv.cashbackAmount;
        if (new Date(inv.date) > new Date(cur.lastPurchaseDate)) {
          cur.lastPurchaseDate = inv.date;
        }
      } else {
        map.set(key, {
          customerName: inv.customerName,
          customerPhone: inv.customerPhone,
          totalPurchase: inv.purchaseAmount,
          totalCashback: inv.cashbackAmount,
          disbursedCashback: inv.claimStatus === 'disbursed' ? inv.cashbackAmount : 0,
          readyCashback: inv.claimStatus === 'ready' ? inv.cashbackAmount : 0,
          pendingCashback: inv.claimStatus === 'pending' ? inv.cashbackAmount : 0,
          invoiceCount: 1,
          lastPurchaseDate: inv.date,
          tier: 'Bronze',
        });
      }
    }

    const list = Array.from(map.values()).map((c) => {
      let tier: 'Platinum' | 'Gold' | 'Silver' | 'Bronze' = 'Bronze';
      if (c.totalCashback >= 1000000 || c.totalPurchase >= 15000000) tier = 'Platinum';
      else if (c.totalCashback >= 500000 || c.totalPurchase >= 7500000) tier = 'Gold';
      else if (c.totalCashback >= 200000 || c.totalPurchase >= 3000000) tier = 'Silver';
      return { ...c, tier };
    });

    list.sort((a, b) => b.totalCashback - a.totalCashback);
    return list.map((item, idx) => ({ ...item, rank: idx + 1 }));
  }, [invoices, periodFilter]);

  // Top 10 with search
  const top10 = useMemo(() => {
    const base = rankedData.slice(0, 10);
    if (!searchQuery.trim()) return base;
    const q = searchQuery.toLowerCase();
    return base.filter(
      (c) =>
        c.customerName.toLowerCase().includes(q) ||
        c.customerPhone.toLowerCase().includes(q)
    );
  }, [rankedData, searchQuery]);

  const top1 = rankedData[0];
  const top2 = rankedData[1];
  const top3 = rankedData[2];

  const totalTop10Cashback = useMemo(() => {
    return rankedData.slice(0, 10).reduce((sum, c) => sum + c.totalCashback, 0);
  }, [rankedData]);

  const totalTop10Purchase = useMemo(() => {
    return rankedData.slice(0, 10).reduce((sum, c) => sum + c.totalPurchase, 0);
  }, [rankedData]);

  const maxCashback = top1 ? top1.totalCashback : 1;

  // Open WhatsApp template for rewarding consumer
  const handleContactWhatsApp = (phone: string, name: string, cashback: number) => {
    const cleanPhone = phone.replace(/\D/g, '');
    const formattedPhone = cleanPhone.startsWith('0') ? '62' + cleanPhone.slice(1) : cleanPhone;
    const message = encodeURIComponent(
      `Halo Kak ${name},\nTerima kasih atas loyalitas belanja di toko kami! Anda masuk dalam daftar 10 Besar Konsumen dengan cashback tertinggi sebesar ${formatRupiah(cashback)}. Silakan hubungi kami untuk konfirmasi pencairan cashback Anda. Terima kasih!`
    );
    window.open(`https://wa.me/${formattedPhone}?text=${message}`, '_blank');
  };

  return (
    <div className="space-y-6">
      
      {/* Header and Controls */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 bg-amber-50 rounded-lg text-amber-600">
                <Trophy className="w-5 h-5" />
              </div>
              <h1 className="text-lg font-bold text-slate-900">
                Rekap 10 Besar Cashback Tertinggi
              </h1>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Peringkat konsumen dengan akumulasi reward cashback paling tinggi di toko Anda
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Period Segmented Filter */}
            <div className="flex items-center p-1 bg-slate-100 rounded-lg">
              <button
                onClick={() => setPeriodFilter('all')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                  periodFilter === 'all'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Semua Waktu
              </button>
              <button
                onClick={() => setPeriodFilter('this_month')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                  periodFilter === 'this_month'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Bulan Ini
              </button>
              <button
                onClick={() => setPeriodFilter('last_month')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                  periodFilter === 'last_month'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Bulan Lalu
              </button>
            </div>

            <button
              onClick={onExportExcel}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Top 10</span>
            </button>
          </div>
        </div>

        {/* Aggregate Stats Banner for Top 10 */}
        <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-slate-500">Total Cashback 10 Besar</span>
            <div className="text-base font-bold text-slate-900 font-mono tabular-nums mt-0.5">
              {formatRupiah(totalTop10Cashback)}
            </div>
          </div>
          <div>
            <span className="text-slate-500">Total Belanja 10 Besar</span>
            <div className="text-base font-bold text-slate-900 font-mono tabular-nums mt-0.5">
              {formatRupiah(totalTop10Purchase)}
            </div>
          </div>
          <div>
            <span className="text-slate-500">Rata-rata per Konsumen Top 10</span>
            <div className="text-base font-bold text-emerald-700 font-mono tabular-nums mt-0.5">
              {formatRupiah(top10.length > 0 ? totalTop10Cashback / Math.min(top10.length, 10) : 0)}
            </div>
          </div>
          <div>
            <span className="text-slate-500">Jumlah Data Memenuhi</span>
            <div className="text-base font-bold text-slate-900 font-mono tabular-nums mt-0.5">
              {Math.min(rankedData.length, 10)} dari {rankedData.length} Konsumen
            </div>
          </div>
        </div>
      </div>

      {/* Podium Section for Top 3 */}
      {top1 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* Rank 2 (Silver) */}
          {top2 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col justify-between order-2 md:order-1 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-slate-100 rounded-full -mr-8 -mt-8 pointer-events-none" />
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-9 h-9 rounded-full bg-slate-200 text-slate-800 flex items-center justify-center font-bold text-sm">
                    #2
                  </div>
                  <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                    <Medal className="w-4 h-4 text-slate-400" /> Juara 2
                  </span>
                </div>
                <h2 className="text-base font-bold text-slate-900">{top2.customerName}</h2>
                <p className="text-xs text-slate-500 font-mono tabular-nums mt-0.5">{top2.customerPhone}</p>

                <div className="mt-4 p-3 bg-slate-50 rounded-lg space-y-1.5 font-mono tabular-nums text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-sans">Total Cashback:</span>
                    <span className="font-bold text-emerald-700">{formatRupiah(top2.totalCashback)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-sans">Total Belanja:</span>
                    <span className="text-slate-800">{formatRupiah(top2.totalPurchase)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-sans">Frekuensi:</span>
                    <span className="text-slate-800">{top2.invoiceCount} Transaksi</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                <button
                  onClick={() => onSelectCustomer(top2.customerName)}
                  className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
                >
                  <Receipt className="w-3.5 h-3.5" /> Lihat Faktur
                </button>
                <button
                  onClick={() => handleContactWhatsApp(top2.customerPhone, top2.customerName, top2.totalCashback)}
                  className="text-xs font-semibold text-slate-700 hover:text-slate-900 flex items-center gap-1"
                  title="Kirim pesan ucapan selamat & reward via WhatsApp"
                >
                  <Phone className="w-3.5 h-3.5 text-emerald-600" /> WhatsApp
                </button>
              </div>
            </div>
          ) : <div className="order-2 md:order-1" />}

          {/* Rank 1 (Gold) - Elevated Visual Anchor */}
          <div className="bg-white rounded-xl border-2 border-amber-300 p-5 flex flex-col justify-between order-1 md:order-2 shadow-sm relative overflow-hidden bg-gradient-to-b from-amber-50/40 to-white">
            <div className="absolute top-2 right-2 text-amber-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-full bg-amber-400 text-amber-950 flex items-center justify-center font-black text-base shadow-xs">
                  #1
                </div>
                <span className="text-xs font-bold text-amber-800 flex items-center gap-1 bg-amber-100/80 px-2.5 py-1 rounded-md">
                  <Crown className="w-4 h-4 text-amber-600" /> Juara 1 Utama
                </span>
              </div>
              <h2 className="text-lg font-extrabold text-slate-900">{top1.customerName}</h2>
              <p className="text-xs text-slate-500 font-mono tabular-nums mt-0.5">{top1.customerPhone}</p>

              <div className="mt-4 p-3.5 bg-amber-100/40 rounded-lg space-y-2 font-mono tabular-nums text-xs border border-amber-200/50">
                <div className="flex justify-between items-center">
                  <span className="text-slate-600 font-sans text-xs">Total Cashback:</span>
                  <span className="font-extrabold text-emerald-700 text-sm">{formatRupiah(top1.totalCashback)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600 font-sans">Total Belanja:</span>
                  <span className="font-bold text-slate-900">{formatRupiah(top1.totalPurchase)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600 font-sans">Total Transaksi:</span>
                  <span className="text-slate-900">{top1.invoiceCount} Faktur</span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-amber-200/50 flex items-center justify-between">
              <button
                onClick={() => onSelectCustomer(top1.customerName)}
                className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
              >
                <Receipt className="w-3.5 h-3.5" /> Riwayat Faktur
              </button>
              <button
                onClick={() => handleContactWhatsApp(top1.customerPhone, top1.customerName, top1.totalCashback)}
                className="px-2.5 py-1 text-xs font-bold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 rounded-md transition-colors flex items-center gap-1"
              >
                <Phone className="w-3.5 h-3.5" /> Hubungi WhatsApp
              </button>
            </div>
          </div>

          {/* Rank 3 (Bronze) */}
          {top3 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col justify-between order-3 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-amber-50 rounded-full -mr-8 -mt-8 pointer-events-none" />
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-9 h-9 rounded-full bg-amber-700/80 text-white flex items-center justify-center font-bold text-sm">
                    #3
                  </div>
                  <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                    <Medal className="w-4 h-4 text-amber-700" /> Juara 3
                  </span>
                </div>
                <h2 className="text-base font-bold text-slate-900">{top3.customerName}</h2>
                <p className="text-xs text-slate-500 font-mono tabular-nums mt-0.5">{top3.customerPhone}</p>

                <div className="mt-4 p-3 bg-slate-50 rounded-lg space-y-1.5 font-mono tabular-nums text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-sans">Total Cashback:</span>
                    <span className="font-bold text-emerald-700">{formatRupiah(top3.totalCashback)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-sans">Total Belanja:</span>
                    <span className="text-slate-800">{formatRupiah(top3.totalPurchase)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-sans">Frekuensi:</span>
                    <span className="text-slate-800">{top3.invoiceCount} Transaksi</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                <button
                  onClick={() => onSelectCustomer(top3.customerName)}
                  className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
                >
                  <Receipt className="w-3.5 h-3.5" /> Lihat Faktur
                </button>
                <button
                  onClick={() => handleContactWhatsApp(top3.customerPhone, top3.customerName, top3.totalCashback)}
                  className="text-xs font-semibold text-slate-700 hover:text-slate-900 flex items-center gap-1"
                >
                  <Phone className="w-3.5 h-3.5 text-emerald-600" /> WhatsApp
                </button>
              </div>
            </div>
          ) : <div className="order-3" />}

        </div>
      )}

      {/* Full Leaderboard Table (Ranks 1 to 10) */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        
        {/* Table Header with Search */}
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Tabel Lengkap Peringkat 10 Besar
            </h2>
            <p className="text-xs text-slate-500">
              Urutan berdasarkan perolehan total cashback tertinggi
            </p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Cari nama / no. HP..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-slate-900"
            />
          </div>
        </div>

        {/* Responsive Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4 w-16 text-center">Rank</th>
                <th className="py-3 px-4">Konsumen</th>
                <th className="py-3 px-4 text-right">Total Belanja</th>
                <th className="py-3 px-4 text-right">Total Cashback</th>
                <th className="py-3 px-4 text-center">Parcel</th>
                <th className="py-3 px-4">Kontribusi Relatif</th>
                <th className="py-3 px-4 text-center">Jml Faktur</th>
                <th className="py-3 px-4 text-center">Tier</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {top10.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    Tidak ada konsumen yang sesuai dengan filter.
                  </td>
                </tr>
              ) : (
                top10.map((cust) => {
                  const percentOfTop = maxCashback > 0 ? (cust.totalCashback / maxCashback) * 100 : 0;
                  const isTop3 = (cust.rank ?? 99) <= 3;

                  return (
                    <tr 
                      key={cust.customerPhone || cust.customerName}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      {/* Rank badge */}
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-flex items-center justify-center w-6 h-6 rounded-full font-bold text-xs ${
                            cust.rank === 1
                              ? 'bg-amber-400 text-amber-950 font-black'
                              : cust.rank === 2
                              ? 'bg-slate-300 text-slate-900'
                              : cust.rank === 3
                              ? 'bg-amber-700/80 text-white'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {cust.rank}
                        </span>
                      </td>

                      {/* Customer Info */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{cust.customerName}</div>
                        <div className="text-[11px] text-slate-500 font-mono tabular-nums flex items-center gap-1.5 mt-0.5">
                          <span>{cust.customerPhone}</span>
                          <span aria-hidden="true">·</span>
                          <span>Terakhir: {cust.lastPurchaseDate}</span>
                        </div>
                      </td>

                      {/* Total Purchase */}
                      <td className="py-3.5 px-4 text-right font-mono tabular-nums text-slate-800 font-medium">
                        {formatRupiah(cust.totalPurchase)}
                      </td>

                      {/* Total Cashback */}
                      <td className="py-3.5 px-4 text-right font-mono tabular-nums font-bold text-emerald-700">
                        {formatRupiah(cust.totalCashback)}
                      </td>

                      {/* Parcel Qualification */}
                      <td className="py-3.5 px-4 text-center">
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

                      {/* Relative Contribution Bar */}
                      <td className="py-3.5 px-4 w-44">
                        <div className="space-y-1">
                          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                isTop3 ? 'bg-amber-500' : 'bg-emerald-600'
                              }`}
                              style={{ width: `${Math.max(8, percentOfTop)}%` }}
                            />
                          </div>
                          <div className="flex justify-between text-[10px] text-slate-400 font-mono tabular-nums">
                            <span>{percentOfTop.toFixed(0)}% dari #1</span>
                            <span>{((cust.totalCashback / cust.totalPurchase) * 100).toFixed(1)}% rasio</span>
                          </div>
                        </div>
                      </td>

                      {/* Invoice count */}
                      <td className="py-3.5 px-4 text-center font-mono tabular-nums text-slate-700">
                        {cust.invoiceCount}
                      </td>

                      {/* Loyalty Tier */}
                      <td className="py-3.5 px-4 text-center">
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

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => onSelectCustomer(cust.customerName)}
                            title="Lihat riwayat faktur konsumen ini"
                            className="p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-md transition-colors"
                          >
                            <Receipt className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleContactWhatsApp(cust.customerPhone, cust.customerName, cust.totalCashback)}
                            title="Hubungi via WhatsApp"
                            className="p-1.5 text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors"
                          >
                            <Phone className="w-4 h-4" />
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

        {/* Footer info */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-500 gap-2">
          <span>
            Menampilkan maksimal 10 konsumen teratas sesuai kriteria cashback kumulatif.
          </span>
          <button
            onClick={onExportExcel}
            className="text-emerald-700 hover:text-emerald-800 font-semibold flex items-center gap-1 self-start sm:self-auto"
          >
            <span>Unduh Laporan Excel Top 10</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>

      </div>

    </div>
  );
};
