import React, { useMemo, useState } from 'react';
import { 
  TrendingUp, 
  Wallet, 
  CreditCard, 
  Users, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  ArrowUpRight,
  ShieldCheck,
  Trophy,
  Gift
} from 'lucide-react';
import { ActiveTab, CashbackSettings, CustomerSummary, Invoice } from '../types/cashback';
import { formatRupiah, formatNumber } from '../utils/cashbackCalculator';
import { PaginationBar } from './PaginationBar';
import { CashbackMovementChart } from './CashbackMovementChart';

interface DashboardAnalyticsProps {
  invoices: Invoice[];
  settings: CashbackSettings;
  customerSummaries: CustomerSummary[];
  onNavigateToTab: (tab: ActiveTab) => void;
}

export const DashboardAnalytics: React.FC<DashboardAnalyticsProps> = ({
  invoices,
  settings,
  customerSummaries,
  onNavigateToTab,
}) => {
  const [trendRowsPerPage, setTrendRowsPerPage] = useState<number | 'all'>(5);
  const [trendPage, setTrendPage] = useState(1);

  // Aggregate KPIs
  const stats = useMemo(() => {
    let totalOmset = 0;
    let totalCashback = 0;
    let disbursedCashback = 0;
    let readyCashback = 0;
    let pendingCashback = 0;

    for (const inv of invoices) {
      totalOmset += inv.purchaseAmount;
      totalCashback += inv.cashbackAmount;
      if (inv.claimStatus === 'disbursed') {
        disbursedCashback += inv.cashbackAmount;
      } else if (inv.claimStatus === 'ready') {
        readyCashback += inv.cashbackAmount;
      } else {
        pendingCashback += inv.cashbackAmount;
      }
    }

    const effectiveRatio = totalOmset > 0 ? (totalCashback / totalOmset) * 100 : 0;
    const avgCashbackPerInvoice = invoices.length > 0 ? totalCashback / invoices.length : 0;
    const avgCashbackPerCustomer = customerSummaries.length > 0 ? totalCashback / customerSummaries.length : 0;

    return {
      totalOmset,
      totalCashback,
      disbursedCashback,
      readyCashback,
      pendingCashback,
      effectiveRatio,
      avgCashbackPerInvoice,
      avgCashbackPerCustomer,
    };
  }, [invoices, customerSummaries]);

  // Breakdown by customer benefit packages (Cashback + Parsel, Cashback Saja, Parcel Saja)
  const benefitStats = useMemo(() => {
    let cashbackParcelCount = 0;
    let cashbackOnlyCount = 0;
    let parcelOnlyCount = 0;

    for (const c of customerSummaries) {
      if (c.benefitType === 'cashback_parcel') cashbackParcelCount++;
      else if (c.benefitType === 'parcel_only') parcelOnlyCount++;
      else cashbackOnlyCount++;
    }

    return {
      cashbackParcelCount,
      cashbackOnlyCount,
      parcelOnlyCount,
    };
  }, [customerSummaries]);

  // Monthly breakdown for trend
  const monthlyTrend = useMemo(() => {
    const map = new Map<string, { label: string; spend: number; cashback: number; count: number }>();
    
    // Sort invoices chronologically
    const sorted = [...invoices].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    for (const inv of sorted) {
      const d = new Date(inv.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
      const label = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
      
      const cur = map.get(key) || { label, spend: 0, cashback: 0, count: 0 };
      cur.spend += inv.purchaseAmount;
      cur.cashback += inv.cashbackAmount;
      cur.count += 1;
      map.set(key, cur);
    }

    return Array.from(map.values());
  }, [invoices]);

  const maxMonthlyCashback = useMemo(() => {
    return Math.max(...monthlyTrend.map((m) => m.cashback), 1);
  }, [monthlyTrend]);

  const paginatedTrend = useMemo(() => {
    if (trendRowsPerPage === 'all') return monthlyTrend;
    const totalPages = Math.max(1, Math.ceil(monthlyTrend.length / trendRowsPerPage));
    const safePage = Math.min(Math.max(1, trendPage), totalPages);
    const start = (safePage - 1) * trendRowsPerPage;
    return monthlyTrend.slice(start, start + trendRowsPerPage);
  }, [monthlyTrend, trendRowsPerPage, trendPage]);

  const top3Customers = useMemo(() => {
    return customerSummaries.slice(0, 3);
  }, [customerSummaries]);

  return (
    <div className="space-y-4 sm:space-y-6">
      
      {/* Top Banner: Minimalist & Clean on Mobile */}
      <div className="bg-white rounded-xl border border-slate-200 p-3 sm:p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4">
          <div className="flex items-center sm:items-start gap-2.5 sm:gap-3">
            <div className="p-2 sm:p-2.5 rounded-lg bg-emerald-50 text-emerald-700 shrink-0">
              <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <h1 className="text-sm sm:text-lg font-bold text-slate-900 truncate">
                  Dashboard Analitik
                </h1>
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-800">
                  {settings.mode === 'flat' ? `${settings.flatPercentage}% Flat` : 'Tiered'}
                </span>
              </div>
              <p className="hidden sm:block text-xs text-slate-500 mt-1 max-w-3xl leading-relaxed">
                Setiap rupiah cashback dihitung otomatis berdasarkan faktur resmi dengan pencairan Tunai (Cash).
                {settings.maxCashbackPerTransaction ? ` Maks. Cap ${formatRupiah(settings.maxCashbackPerTransaction)}.` : ' Tanpa batas maksimal.'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Stat Cards (2x2 Grid on Mobile, 4 columns on Desktop) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        
        {/* Card 1: Total Cashback */}
        <div className="bg-white rounded-xl border border-slate-200 p-3 sm:p-5 shadow-xs flex flex-col justify-between min-w-0">
          <div>
            <div className="flex items-center justify-between gap-1">
              <span className="text-[11px] sm:text-xs font-medium text-slate-500 truncate">Total Cashback</span>
              <div className="p-1.5 sm:p-2 rounded-md bg-emerald-50 text-emerald-700 shrink-0">
                <Wallet className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
            </div>
            <div className="mt-1.5 sm:mt-3">
              <div className="text-sm sm:text-2xl font-bold tracking-tight text-slate-900 font-mono tabular-nums truncate">
                {formatRupiah(stats.totalCashback)}
              </div>
              <div className="flex items-center gap-1 text-[10px] sm:text-xs text-slate-500 mt-1 sm:mt-2">
                <span className="text-emerald-700 font-semibold font-mono tabular-nums">
                  {stats.effectiveRatio.toFixed(1)}%
                </span>
                <span className="truncate">dari omset</span>
              </div>
            </div>
          </div>
          <div className="mt-2 sm:mt-4 pt-2 sm:pt-3 border-t border-slate-100 flex items-center justify-between text-[10px] sm:text-[11px] text-slate-500 font-mono tabular-nums">
            <span className="truncate">Cair: {formatRupiah(stats.disbursedCashback)}</span>
          </div>
        </div>

        {/* Card 2: Total Omset Pembelian */}
        <div className="bg-white rounded-xl border border-slate-200 p-3 sm:p-5 shadow-xs flex flex-col justify-between min-w-0">
          <div>
            <div className="flex items-center justify-between gap-1">
              <span className="text-[11px] sm:text-xs font-medium text-slate-500 truncate">Total Omset</span>
              <div className="p-1.5 sm:p-2 rounded-md bg-blue-50 text-blue-700 shrink-0">
                <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
            </div>
            <div className="mt-1.5 sm:mt-3">
              <div className="text-sm sm:text-2xl font-bold tracking-tight text-slate-900 font-mono tabular-nums truncate">
                {formatRupiah(stats.totalOmset)}
              </div>
              <div className="flex items-center gap-1 text-[10px] sm:text-xs text-slate-500 mt-1 sm:mt-2">
                <span className="font-mono tabular-nums text-slate-800 font-semibold">
                  {formatNumber(invoices.length)}
                </span>
                <span className="truncate">Faktur dicatat</span>
              </div>
            </div>
          </div>
          <div className="mt-2 sm:mt-4 pt-2 sm:pt-3 border-t border-slate-100 flex items-center justify-between text-[10px] sm:text-[11px] text-slate-500 font-mono tabular-nums">
            <span className="truncate">Rata2: {formatRupiah(invoices.length > 0 ? stats.totalOmset / invoices.length : 0)}</span>
          </div>
        </div>

        {/* Card 3: Konsumen Unik & Loyalitas */}
        <div className="bg-white rounded-xl border border-slate-200 p-3 sm:p-5 shadow-xs flex flex-col justify-between min-w-0">
          <div>
            <div className="flex items-center justify-between gap-1">
              <span className="text-[11px] sm:text-xs font-medium text-slate-500 truncate">Total Konsumen</span>
              <div className="p-1.5 sm:p-2 rounded-md bg-purple-50 text-purple-700 shrink-0">
                <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
            </div>
            <div className="mt-1.5 sm:mt-3">
              <div className="text-sm sm:text-2xl font-bold tracking-tight text-slate-900 font-mono tabular-nums">
                {formatNumber(customerSummaries.length)}
              </div>
              <div className="flex items-center gap-1 text-[10px] sm:text-xs text-slate-500 mt-1 sm:mt-2">
                <span className="truncate">Rata2:</span>
                <span className="font-mono tabular-nums font-semibold text-slate-800 truncate">
                  {formatRupiah(stats.avgCashbackPerCustomer)}
                </span>
              </div>
            </div>
          </div>
          <div className="mt-2 sm:mt-4 pt-2 sm:pt-3 border-t border-slate-100 flex items-center justify-between text-[10px] sm:text-[11px] text-slate-500">
            <button 
              onClick={() => onNavigateToTab('top10')}
              className="text-emerald-700 hover:text-emerald-800 font-semibold flex items-center gap-0.5"
            >
              Top 10 <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Card 4: Status Klaim & Pencairan */}
        <div className="bg-white rounded-xl border border-slate-200 p-3 sm:p-5 shadow-xs flex flex-col justify-between min-w-0">
          <div>
            <div className="flex items-center justify-between gap-1">
              <span className="text-[11px] sm:text-xs font-medium text-slate-500 truncate">Pencairan Dana</span>
              <div className="p-1.5 sm:p-2 rounded-md bg-amber-50 text-amber-700 shrink-0">
                <CreditCard className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
            </div>
            <div className="mt-1.5 sm:mt-3">
              <div className="text-sm sm:text-2xl font-bold tracking-tight text-emerald-700 font-mono tabular-nums truncate">
                {formatRupiah(stats.disbursedCashback)}
              </div>
              <div className="flex items-center gap-1 text-[10px] sm:text-xs text-slate-500 mt-1 sm:mt-2">
                <span className="text-amber-700 font-semibold font-mono tabular-nums truncate">
                  {formatRupiah(stats.readyCashback)}
                </span>
                <span className="truncate">Siap</span>
              </div>
            </div>
          </div>
          <div className="mt-2 sm:mt-4 pt-2 sm:pt-3 border-t border-slate-100 flex items-center justify-between text-[10px] sm:text-[11px] text-slate-500">
            <span className="truncate">Pending: {formatRupiah(stats.pendingCashback)}</span>
          </div>
        </div>

      </div>

      {/* Customer Benefit Packages Distribution Banner */}
      <div className="bg-white rounded-xl border border-slate-200 p-3.5 sm:p-4 shadow-2xs">
        <div className="flex items-center justify-between gap-2 pb-2.5 sm:pb-3 border-b border-slate-100">
          <div className="min-w-0">
            <h2 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-1.5 truncate">
              <Gift className="w-4 h-4 text-purple-600 shrink-0" />
              <span className="truncate">Rekap Paket Konsumen</span>
            </h2>
            <p className="hidden sm:block text-[11px] text-slate-500 mt-0.5">
              Total {customerSummaries.length} konsumen dikelompokkan berdasarkan hak penerimaan reward
            </p>
          </div>
          <button
            onClick={() => onNavigateToTab('customers')}
            className="text-[11px] sm:text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 shrink-0"
          >
            <span>Atur</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2 sm:gap-3 mt-2.5 sm:mt-3">
          
          {/* 1. Cashback + Parsel */}
          <div className="p-2.5 sm:p-3 bg-purple-50/60 rounded-xl border border-purple-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg bg-purple-600 text-white flex items-center justify-center font-bold text-xs sm:text-base shadow-2xs shrink-0">
                🎁
              </div>
              <div className="min-w-0">
                <span className="text-[10px] sm:text-[11px] font-bold text-purple-900 block leading-tight truncate">
                  CB + Parsel
                </span>
                <span className="hidden sm:block text-[10px] text-purple-700">
                  Uang tunai & bingkisan parsel
                </span>
              </div>
            </div>
            <div className="sm:text-right flex items-baseline sm:block gap-1">
              <span className="text-base sm:text-lg font-black text-purple-900 font-mono">
                {benefitStats.cashbackParcelCount}
              </span>
              <span className="text-[9px] sm:text-[10px] text-purple-600 font-medium sm:block">
                konsumen
              </span>
            </div>
          </div>

          {/* 2. Hanya Cashback */}
          <div className="p-2.5 sm:p-3 bg-emerald-50/60 rounded-xl border border-emerald-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-xs sm:text-base shadow-2xs shrink-0">
                💰
              </div>
              <div className="min-w-0">
                <span className="text-[10px] sm:text-[11px] font-bold text-emerald-900 block leading-tight truncate">
                  Cashback
                </span>
                <span className="hidden sm:block text-[10px] text-emerald-700">
                  Pencairan Tunai (Cash)
                </span>
              </div>
            </div>
            <div className="sm:text-right flex items-baseline sm:block gap-1">
              <span className="text-base sm:text-lg font-black text-emerald-900 font-mono">
                {benefitStats.cashbackOnlyCount}
              </span>
              <span className="text-[9px] sm:text-[10px] text-emerald-600 font-medium sm:block">
                konsumen
              </span>
            </div>
          </div>

          {/* 3. Hanya Parsel */}
          <div className="p-2.5 sm:p-3 bg-amber-50/60 rounded-xl border border-amber-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg bg-amber-600 text-white flex items-center justify-center font-bold text-xs sm:text-base shadow-2xs shrink-0">
                📦
              </div>
              <div className="min-w-0">
                <span className="text-[10px] sm:text-[11px] font-bold text-amber-900 block leading-tight truncate">
                  Parsel
                </span>
                <span className="hidden sm:block text-[10px] text-amber-700">
                  Bingkisan hadiah apresiasi
                </span>
              </div>
            </div>
            <div className="sm:text-right flex items-baseline sm:block gap-1">
              <span className="text-base sm:text-lg font-black text-amber-900 font-mono">
                {benefitStats.parcelOnlyCount}
              </span>
              <span className="text-[9px] sm:text-[10px] text-amber-600 font-medium sm:block">
                konsumen
              </span>
            </div>
          </div>

        </div>
      </div>

      {/* Middle Grid: Trend Chart & Claim Status Progress */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        
        {/* Trend Bar Chart */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-3.5 sm:p-5">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <div>
              <h2 className="text-xs sm:text-sm font-bold text-slate-900">Tren Akumulasi Cashback & Omset</h2>
              <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">Perkembangan alokasi reward cashback bulanan</p>
            </div>
            <span className="text-[11px] sm:text-xs font-mono text-slate-500 tabular-nums shrink-0">
              {monthlyTrend.length} Periode
            </span>
          </div>

          {monthlyTrend.length === 0 ? (
            <div className="h-44 sm:h-56 flex items-center justify-center text-xs text-slate-400">
              Belum ada data transaksi yang tercatat.
            </div>
          ) : (
            <div className="space-y-3.5 sm:space-y-4 pt-1 sm:pt-2">
              {paginatedTrend.map((m) => {
                const percentage = Math.min(100, Math.round((m.cashback / maxMonthlyCashback) * 100));
                return (
                  <div key={m.label} className="space-y-1.5">
                    <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-0.5 text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-slate-800">{m.label}</span>
                        <span className="text-slate-400">·</span>
                        <span className="text-slate-500 font-mono tabular-nums text-[11px]">{m.count} faktur</span>
                      </div>
                      <div className="flex items-center justify-between xs:justify-end gap-2.5 font-mono tabular-nums">
                        <span className="text-slate-500 text-[10px] sm:text-[11px]">
                          Omset: {formatRupiah(m.spend)}
                        </span>
                        <span className="font-semibold text-emerald-700 text-xs">
                          {formatRupiah(m.cashback)}
                        </span>
                      </div>
                    </div>
                    {/* Visual bar */}
                    <div className="w-full h-2.5 sm:h-3 bg-slate-100 rounded-full overflow-hidden flex">
                      <div 
                        className="h-full bg-emerald-600 rounded-full transition-all duration-300"
                        style={{ width: `${Math.max(5, percentage)}%` }}
                        title={`Cashback: ${formatRupiah(m.cashback)}`}
                      />
                    </div>
                  </div>
                );
              })}
              {monthlyTrend.length > 0 && (
                <div className="pt-2">
                  <PaginationBar
                    totalItems={monthlyTrend.length}
                    rowsPerPage={trendRowsPerPage}
                    currentPage={trendPage}
                    onChangeRowsPerPage={(rows) => {
                      setTrendRowsPerPage(rows);
                      setTrendPage(1);
                    }}
                    onChangePage={setTrendPage}
                    itemLabel="periode"
                    options={[5, 10, 20]}
                  />
                </div>
              )}
            </div>
          )}

          <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                <span>Nilai Cashback</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-slate-200" />
                <span>Basis Omset Faktur</span>
              </div>
            </div>
            <button
              onClick={() => onNavigateToTab('invoices')}
              className="text-emerald-700 hover:text-emerald-800 font-semibold flex items-center gap-1"
            >
              Lihat Semua Faktur <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Claim Status & Payout Breakdown */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Distribusi Status Pencairan</h2>
            <p className="text-xs text-slate-500 mt-0.5">Transparansi realisasi dana ke konsumen</p>

            <div className="mt-5 space-y-4">
              
              {/* Disbursed */}
              <div className="p-3.5 rounded-lg border border-emerald-100 bg-emerald-50/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-semibold text-emerald-950">Sudah Dicairkan</span>
                  </div>
                  <span className="text-xs font-bold text-emerald-700 font-mono tabular-nums">
                    {formatRupiah(stats.disbursedCashback)}
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 mt-1">
                  Dana telah berhasil diserahkan secara Tunai (Cash) kepada konsumen.
                </p>
              </div>

              {/* Ready */}
              <div className="p-3.5 rounded-lg border border-amber-100 bg-amber-50/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-600" />
                    <span className="text-xs font-semibold text-amber-950">Siap Dicairkan</span>
                  </div>
                  <span className="text-xs font-bold text-amber-700 font-mono tabular-nums">
                    {formatRupiah(stats.readyCashback)}
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 mt-1">
                  Faktur tervalidasi dan siap dicairkan secara Tunai (Cash) di kasir.
                </p>
              </div>

              {/* Pending */}
              <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-slate-500" />
                    <span className="text-xs font-semibold text-slate-800">Menunggu Klaim</span>
                  </div>
                  <span className="text-xs font-bold text-slate-700 font-mono tabular-nums">
                    {formatRupiah(stats.pendingCashback)}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Menunggu konsumen melakukan klaim pencairan tunai di kasir.
                </p>
              </div>

            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100">
            <button
              onClick={() => onNavigateToTab('invoices')}
              className="w-full py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors text-center"
            >
              Kelola & Ubah Status Pencairan
            </button>
          </div>
        </div>

      </div>

      {/* Bottom Row: Top 3 Podium Shortcut & Grafik Pergerakan */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        
        {/* Top 3 Consumers Podium Mini Preview */}
        <div className="bg-white rounded-xl border border-slate-200 p-3.5 sm:p-5">
          <div className="flex items-center justify-between mb-2.5 sm:mb-3">
            <div className="flex items-center gap-2 min-w-0">
              <Trophy className="w-4 h-4 text-amber-500 shrink-0" />
              <h2 className="text-xs sm:text-sm font-bold text-slate-900 truncate">Peringkat Teratas</h2>
            </div>
            <button
              onClick={() => onNavigateToTab('top10')}
              className="text-[11px] sm:text-xs font-semibold text-emerald-700 hover:text-emerald-800 shrink-0"
            >
              10 Besar
            </button>
          </div>
          <p className="text-[11px] sm:text-xs text-slate-500 mb-3 sm:mb-4">Konsumen dengan perolehan reward tertinggi</p>

          <div className="space-y-2.5 sm:space-y-3">
            {top3Customers.map((cust, idx) => (
              <div
                key={cust.customerCode || `${cust.customerName}_${idx}`}
                className="flex items-center justify-between gap-2 p-2.5 sm:p-3 rounded-lg border border-slate-100 bg-slate-50/70 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center font-bold text-[11px] sm:text-xs shrink-0 ${
                      idx === 0
                        ? 'bg-amber-400 text-amber-950 shadow-xs'
                        : idx === 1
                        ? 'bg-slate-300 text-slate-900'
                        : 'bg-amber-700/80 text-white'
                    }`}
                  >
                    #{idx + 1}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-900 truncate">{cust.customerName}</div>
                    <div className="text-[10px] sm:text-[11px] text-slate-500 font-mono tabular-nums truncate">
                      {cust.invoiceCount} faktur · {formatRupiah(cust.totalPurchase)}
                    </div>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-xs font-bold text-emerald-700 font-mono tabular-nums">
                    {formatRupiah(cust.totalCashback)}
                  </div>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                    {cust.tier}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={() => onNavigateToTab('top10')}
            className="w-full mt-3.5 sm:mt-4 py-2 text-xs font-semibold text-emerald-700 border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors flex items-center justify-center gap-1.5"
          >
            <span>Lihat Papan Peringkat 10 Besar</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Grafik Pergerakan Penerimaan Cashback */}
        <CashbackMovementChart
          invoices={invoices}
          customerSummaries={customerSummaries}
          onNavigateToTab={onNavigateToTab}
        />

      </div>

    </div>
  );
};
