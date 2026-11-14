import React, { useMemo, useState } from 'react';
import {
  TrendingUp,
  CheckCircle2,
  Clock,
  Users,
  ChevronDown,
  ChevronUp,
  Calendar,
} from 'lucide-react';
import { CustomerSummary } from '../types/cashback';
import { formatRupiah } from '../utils/cashbackCalculator';

interface DisbursementProgressChartProps {
  customerSummaries: CustomerSummary[];
  totalEligibleCashback: number;
  totalDisbursedCashback: number;
  totalUndisbursedCashback: number;
  fullyDisbursedCustomersCount: number;
  partialDisbursedCustomersCount: number;
  totalDisbursedCustomers: number;
  undisbursedCustomersCount: number;
  excludedCustomersCount: number;
  activeFilter: 'all' | 'disbursed' | 'undisbursed';
  onSelectFilter: (filter: 'all' | 'disbursed' | 'undisbursed') => void;
}

interface ProgressPoint {
  dateKey: string;
  label: string;
  shortLabel: string;
  addedCustomers: number;
  addedAmount: number;
  cumulativeCustomers: number;
  cumulativeAmount: number;
  cumulativeCustomerPct: number;
  cumulativeAmountPct: number;
}

function formatCompactRupiah(amount: number): string {
  if (amount <= 0) return 'Rp 0';
  if (amount >= 1_000_000_000) {
    const val = amount / 1_000_000_000;
    return `Rp ${val % 1 === 0 ? val.toFixed(0) : val.toFixed(1)}M`;
  }
  if (amount >= 1_000_000) {
    const val = amount / 1_000_000;
    return `Rp ${val % 1 === 0 ? val.toFixed(0) : val.toFixed(1)}jt`;
  }
  if (amount >= 1_000) {
    return `Rp ${Math.round(amount / 1_000)}rb`;
  }
  return `Rp ${Math.round(amount)}`;
}

function buildSmoothPath(
  coords: Array<{ x: number; y: number }>,
  minY: number,
  maxY: number
): string {
  if (coords.length === 0) return '';
  if (coords.length === 1) return `M ${coords[0].x} ${coords[0].y}`;

  let path = `M ${coords[0].x.toFixed(1)} ${coords[0].y.toFixed(1)}`;
  for (let i = 0; i < coords.length - 1; i++) {
    const p0 = coords[i - 1] || coords[i];
    const p1 = coords[i];
    const p2 = coords[i + 1];
    const p3 = coords[i + 2] || p2;

    const tension = 0.16;
    const cp1x = p1.x + (p2.x - p0.x) * tension;
    const cp1y = Math.min(maxY, Math.max(minY, p1.y + (p2.y - p0.y) * tension));
    const cp2x = p2.x - (p3.x - p1.x) * tension;
    const cp2y = Math.min(maxY, Math.max(minY, p2.y - (p3.y - p1.y) * tension));

    path += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  return path;
}

export const DisbursementProgressChart: React.FC<DisbursementProgressChartProps> = ({
  customerSummaries,
  totalEligibleCashback,
  totalDisbursedCashback,
  totalUndisbursedCashback,
  fullyDisbursedCustomersCount,
  partialDisbursedCustomersCount,
  totalDisbursedCustomers,
  undisbursedCustomersCount,
  excludedCustomersCount,
  activeFilter,
  onSelectFilter,
}) => {
  const [basis, setBasis] = useState<'customers' | 'amount'>('customers');
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const eligibleCustomersCount =
    fullyDisbursedCustomersCount + partialDisbursedCustomersCount + undisbursedCustomersCount;

  const customerProgressPct =
    eligibleCustomersCount > 0
      ? Math.round((totalDisbursedCustomers / eligibleCustomersCount) * 100)
      : 0;
  const amountProgressPct =
    totalEligibleCashback > 0
      ? Math.round((totalDisbursedCashback / totalEligibleCashback) * 100)
      : 0;

  const activeProgressPct = basis === 'customers' ? customerProgressPct : amountProgressPct;

  // Multi-segment percentages for horizontal progress bar
  const fullBarPct = useMemo(() => {
    if (basis === 'customers') {
      return eligibleCustomersCount > 0
        ? (fullyDisbursedCustomersCount / eligibleCustomersCount) * 100
        : 0;
    }
    return totalEligibleCashback > 0
      ? (totalDisbursedCashback / totalEligibleCashback) * 100
      : 0;
  }, [
    basis,
    eligibleCustomersCount,
    fullyDisbursedCustomersCount,
    totalEligibleCashback,
    totalDisbursedCashback,
  ]);

  const partialBarPct = useMemo(() => {
    if (basis === 'amount' || eligibleCustomersCount <= 0) return 0;
    return (partialDisbursedCustomersCount / eligibleCustomersCount) * 100;
  }, [basis, eligibleCustomersCount, partialDisbursedCustomersCount]);

  // Build cumulative disbursement progress timeline grouped by disbursement date
  const timeline = useMemo<ProgressPoint[]>(() => {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    const buckets = new Map<string, { customers: Set<string>; amount: number }>();

    for (const cust of customerSummaries) {
      if (cust.isExcludedFromCashback || cust.disbursedCashback <= 0) continue;

      const custKey = (cust.customerName || cust.customerCode || 'tanpa-nama').trim().toLowerCase();
      const disbursedInvoices = (cust.invoices || []).filter((i) => i.claimStatus === 'disbursed');

      if (disbursedInvoices.length > 0) {
        for (const inv of disbursedInvoices) {
          const rawDate = inv.disbursedDate || cust.lastDisbursedDate || inv.date || 'unknown';
          const cur = buckets.get(rawDate) || { customers: new Set<string>(), amount: 0 };
          cur.customers.add(custKey);
          cur.amount += Math.round(Number(inv.cashbackAmount) || 0);
          buckets.set(rawDate, cur);
        }
      } else {
        const rawDate = cust.lastDisbursedDate || 'unknown';
        const cur = buckets.get(rawDate) || { customers: new Set<string>(), amount: 0 };
        cur.customers.add(custKey);
        cur.amount += Math.round(Number(cust.disbursedCashback) || 0);
        buckets.set(rawDate, cur);
      }
    }

    const sortedKeys = Array.from(buckets.keys()).sort((a, b) => a.localeCompare(b));
    const seenCustomers = new Set<string>();
    let cumulativeAmount = 0;

    return sortedKeys.map((dateKey) => {
      const bucket = buckets.get(dateKey)!;
      let newlyAddedCustomers = 0;
      for (const k of bucket.customers) {
        if (!seenCustomers.has(k)) {
          seenCustomers.add(k);
          newlyAddedCustomers += 1;
        }
      }
      cumulativeAmount += bucket.amount;

      const d = new Date(dateKey);
      const isValidDate = dateKey !== 'unknown' && !Number.isNaN(d.getTime());
      const label = isValidDate
        ? `${d.getDate()} ${monthNames[d.getMonth()]} ${d.getFullYear()}`
        : 'Tercatat';
      const shortLabel = isValidDate
        ? `${d.getDate()} ${monthNames[d.getMonth()]}`
        : 'Tercatat';

      const cumulativeCustomers = seenCustomers.size;
      const cumulativeCustomerPct =
        eligibleCustomersCount > 0
          ? Math.min(100, Math.round((cumulativeCustomers / eligibleCustomersCount) * 100))
          : 0;
      const cumulativeAmountPct =
        totalEligibleCashback > 0
          ? Math.min(100, Math.round((cumulativeAmount / totalEligibleCashback) * 100))
          : 0;

      return {
        dateKey,
        label,
        shortLabel,
        addedCustomers: newlyAddedCustomers,
        addedAmount: bucket.amount,
        cumulativeCustomers,
        cumulativeAmount,
        cumulativeCustomerPct,
        cumulativeAmountPct,
      };
    });
  }, [customerSummaries, eligibleCustomersCount, totalEligibleCashback]);

  // SVG Timeline geometry
  const svgWidth = 640;
  const svgHeight = 165;
  const padLeft = 40;
  const padRight = 18;
  const padTop = 16;
  const padBottom = 26;
  const plotW = svgWidth - padLeft - padRight;
  const plotH = svgHeight - padTop - padBottom;
  const baselineY = padTop + plotH;

  const pointCoords = useMemo(() => {
    const n = timeline.length;
    if (n === 0) return [];
    return timeline.map((item, idx) => {
      const pct = basis === 'customers' ? item.cumulativeCustomerPct : item.cumulativeAmountPct;
      const x = n === 1 ? padLeft + plotW / 2 : padLeft + (idx / (n - 1)) * plotW;
      const y = baselineY - (Math.min(100, Math.max(0, pct)) / 100) * plotH;
      return { x, y, pct, item };
    });
  }, [timeline, basis, padLeft, plotW, baselineY, plotH]);

  const linePath = useMemo(() => {
    return buildSmoothPath(
      pointCoords.map((p) => ({ x: p.x, y: p.y })),
      padTop,
      baselineY
    );
  }, [pointCoords, padTop, baselineY]);

  const areaPath = useMemo(() => {
    if (pointCoords.length === 0) return '';
    if (pointCoords.length === 1) {
      const p = pointCoords[0];
      return `M ${p.x - 24} ${baselineY} L ${p.x - 24} ${p.y} L ${p.x + 24} ${p.y} L ${p.x + 24} ${baselineY} Z`;
    }
    const first = pointCoords[0];
    const last = pointCoords[pointCoords.length - 1];
    return `${linePath} L ${last.x.toFixed(1)} ${baselineY} L ${first.x.toFixed(1)} ${baselineY} Z`;
  }, [pointCoords, linePath, baselineY]);

  const inspectedIdx =
    hoveredIdx !== null && hoveredIdx < timeline.length
      ? hoveredIdx
      : timeline.length > 0
        ? timeline.length - 1
        : null;
  const inspectedPoint = inspectedIdx !== null ? timeline[inspectedIdx] : null;
  const inspectedCoord = inspectedIdx !== null ? pointCoords[inspectedIdx] : null;

  // Ring Gauge geometry
  const ringRadius = 26;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringDash = (Math.min(100, Math.max(0, activeProgressPct)) / 100) * ringCircumference;

  return (
    <section
      className="bg-white rounded-2xl sm:rounded-xl border border-slate-200 p-3.5 sm:p-5 shadow-2xs space-y-3.5"
      aria-label="Grafik Progres Penerimaan Cashback"
    >
      {/* Header & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 shrink-0">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h2 className="text-xs sm:text-sm font-bold text-slate-900 truncate">
              Grafik Progres Penerimaan
            </h2>
            <p className="text-[11px] text-slate-500 truncate tabular-nums">
              {basis === 'customers' ? (
                <>
                  <strong className="text-emerald-700">{totalDisbursedCustomers}</strong> dari{' '}
                  <strong>{eligibleCustomersCount}</strong> konsumen telah menerima ({customerProgressPct}%)
                </>
              ) : (
                <>
                  <strong className="text-emerald-700">{formatCompactRupiah(totalDisbursedCashback)}</strong> dari{' '}
                  <strong>{formatCompactRupiah(totalEligibleCashback)}</strong> terealisasi ({amountProgressPct}%)
                </>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
            <button
              type="button"
              onClick={() => setBasis('customers')}
              className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors flex items-center gap-1 whitespace-nowrap ${
                basis === 'customers'
                  ? 'bg-white text-emerald-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Users className="w-3 h-3 shrink-0" />
              <span>Konsumen</span>
            </button>
            <button
              type="button"
              onClick={() => setBasis('amount')}
              className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors whitespace-nowrap ${
                basis === 'amount'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Nominal Rp
            </button>
          </div>

          <button
            type="button"
            onClick={() => setIsExpanded((prev) => !prev)}
            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors shrink-0"
            aria-label={isExpanded ? 'Sembunyikan grafik progres' : 'Tampilkan grafik progres'}
            title={isExpanded ? 'Sembunyikan grafik progres' : 'Tampilkan grafik progres'}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="space-y-3.5 pt-1 border-t border-slate-100">
          {/* Progress Gauge + Stacked Bar + Quick Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center pt-2">
            {/* Circular Progress Gauge */}
            <div className="md:col-span-4 flex items-center gap-3 p-3 rounded-xl bg-slate-50/80 border border-slate-200/80">
              <div className="relative w-16 h-16 shrink-0 flex items-center justify-center">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 64 64">
                  <circle
                    cx="32"
                    cy="32"
                    r={ringRadius}
                    fill="none"
                    stroke="#fef3c7"
                    strokeWidth="6.5"
                  />
                  <circle
                    cx="32"
                    cy="32"
                    r={ringRadius}
                    fill="none"
                    stroke="#f59e0b"
                    strokeWidth="6.5"
                    strokeDasharray={`${ringCircumference} ${ringCircumference}`}
                    strokeLinecap="round"
                    opacity={eligibleCustomersCount > 0 ? 0.55 : 0.2}
                  />
                  {activeProgressPct > 0 && (
                    <circle
                      cx="32"
                      cy="32"
                      r={ringRadius}
                      fill="none"
                      stroke="#059669"
                      strokeWidth="6.5"
                      strokeDasharray={`${ringDash} ${ringCircumference}`}
                      strokeLinecap="round"
                      className="transition-all duration-500"
                    />
                  )}
                </svg>
                <span className="absolute text-xs font-extrabold font-mono text-slate-900 tabular-nums">
                  {activeProgressPct}%
                </span>
              </div>

              <div className="min-w-0 flex-1 space-y-0.5">
                <div className="text-xs font-bold text-slate-900">
                  {basis === 'customers' ? 'Progres Penerima' : 'Realisasi Cashback'}
                </div>
                <div className="text-[11px] text-slate-600 tabular-nums">
                  {basis === 'customers' ? (
                    <>
                      Sisa <strong className="text-amber-700">{undisbursedCustomersCount}</strong> konsumen lagi menuju 100%
                    </>
                  ) : (
                    <>
                      Sisa <strong className="text-amber-700">{formatCompactRupiah(totalUndisbursedCashback)}</strong> belum cair
                    </>
                  )}
                </div>
                {excludedCustomersCount > 0 && (
                  <div className="text-[10px] text-slate-400 tabular-nums">
                    {excludedCustomersCount} konsumen dicoret dikecualikan
                  </div>
                )}
              </div>
            </div>

            {/* Stacked Progress Bar & Interactive Filter Breakdown */}
            <div className="md:col-span-8 space-y-2.5">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-slate-700">
                    Distribusi Status ({eligibleCustomersCount} Konsumen Aktif)
                  </span>
                  <span className="font-mono font-bold text-emerald-700 tabular-nums">
                    {activeProgressPct}% Selesai
                  </span>
                </div>

                {/* Multi-segment progress track */}
                <div className="h-3 w-full bg-amber-100 rounded-full overflow-hidden flex">
                  {fullBarPct > 0 && (
                    <div
                      className="h-full bg-emerald-600 transition-all duration-500"
                      style={{ width: `${Math.min(100, fullBarPct)}%` }}
                      title={`Sudah Cair Lunas: ${fullyDisbursedCustomersCount} konsumen`}
                    />
                  )}
                  {partialBarPct > 0 && (
                    <div
                      className="h-full bg-blue-500 transition-all duration-500"
                      style={{ width: `${Math.min(100 - fullBarPct, partialBarPct)}%` }}
                      title={`Sebagian Cair: ${partialDisbursedCustomersCount} konsumen`}
                    />
                  )}
                </div>
              </div>

              {/* Interactive Breakdown Cells */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => onSelectFilter('disbursed')}
                  className={`p-2 rounded-xl border text-left transition-all ${
                    activeFilter === 'disbursed'
                      ? 'bg-emerald-50 border-emerald-400 ring-1 ring-emerald-400/40'
                      : 'bg-slate-50/70 border-slate-200 hover:border-emerald-300'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 text-[10px] font-bold text-emerald-800">
                    <span className="flex items-center gap-1 truncate">
                      <span className="w-2 h-2 rounded-full bg-emerald-600 shrink-0" />
                      Sudah Terima
                    </span>
                    <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0 hidden sm:block" />
                  </div>
                  <div className="text-xs sm:text-sm font-extrabold text-emerald-700 font-mono tabular-nums mt-0.5 truncate">
                    {totalDisbursedCustomers} ksm
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono tabular-nums truncate">
                    {formatCompactRupiah(totalDisbursedCashback)}
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => onSelectFilter('undisbursed')}
                  className={`p-2 rounded-xl border text-left transition-all ${
                    activeFilter === 'undisbursed'
                      ? 'bg-amber-50 border-amber-400 ring-1 ring-amber-400/40'
                      : 'bg-slate-50/70 border-slate-200 hover:border-amber-300'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 text-[10px] font-bold text-amber-800">
                    <span className="flex items-center gap-1 truncate">
                      <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                      Belum Terima
                    </span>
                    <Clock className="w-3 h-3 text-amber-600 shrink-0 hidden sm:block" />
                  </div>
                  <div className="text-xs sm:text-sm font-extrabold text-amber-700 font-mono tabular-nums mt-0.5 truncate">
                    {undisbursedCustomersCount} ksm
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono tabular-nums truncate">
                    {formatCompactRupiah(totalUndisbursedCashback)}
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => onSelectFilter('all')}
                  className={`p-2 rounded-xl border text-left transition-all ${
                    activeFilter === 'all'
                      ? 'bg-slate-100 border-slate-400 ring-1 ring-slate-400/40'
                      : 'bg-slate-50/70 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 text-[10px] font-bold text-slate-700">
                    <span className="truncate">Target Total</span>
                  </div>
                  <div className="text-xs sm:text-sm font-extrabold text-slate-900 font-mono tabular-nums mt-0.5 truncate">
                    {eligibleCustomersCount} ksm
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono tabular-nums truncate">
                    {formatCompactRupiah(totalEligibleCashback)}
                  </div>
                </button>
              </div>
            </div>
          </div>

          {/* Cumulative Progress Timeline Chart */}
          <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-2.5 sm:p-3.5 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-800">
                <Calendar className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Kurva Progres Kumulatif Penerimaan</span>
              </div>

              {inspectedPoint ? (
                <div className="flex flex-wrap items-center gap-1.5 text-[10px] sm:text-[11px] bg-white border border-slate-200 rounded-lg px-2 py-0.5 font-mono tabular-nums">
                  <span className="font-bold text-slate-800">{inspectedPoint.label}:</span>
                  {basis === 'customers' ? (
                    <span className="text-emerald-700 font-bold">
                      {inspectedPoint.cumulativeCustomers}/{eligibleCustomersCount} ksm ({inspectedPoint.cumulativeCustomerPct}%)
                    </span>
                  ) : (
                    <span className="text-emerald-700 font-bold">
                      {formatCompactRupiah(inspectedPoint.cumulativeAmount)} ({inspectedPoint.cumulativeAmountPct}%)
                    </span>
                  )}
                  <span className="text-slate-400">
                    (+{basis === 'customers' ? `${inspectedPoint.addedCustomers} ksm` : formatCompactRupiah(inspectedPoint.addedAmount)})
                  </span>
                </div>
              ) : (
                <span className="text-[10px] text-slate-400 italic">
                  Menunggu pencairan pertama
                </span>
              )}
            </div>

            {timeline.length === 0 ? (
              <div className="h-28 flex flex-col items-center justify-center text-center px-4 border border-dashed border-slate-200 rounded-lg bg-white/70">
                <p className="text-xs font-semibold text-slate-500">
                  Belum ada pencairan cashback yang tercatat
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Kurva progres harian (0% → 100%) akan terbentuk otomatis setiap kali pencairan konsumen dikonfirmasi.
                </p>
              </div>
            ) : (
              <div className="relative select-none" onMouseLeave={() => setHoveredIdx(null)}>
                <svg
                  viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                  className="w-full h-auto overflow-visible"
                  role="img"
                  aria-label="Grafik kurva progres kumulatif penerimaan cashback"
                >
                  <defs>
                    <linearGradient id="disbursementProgressGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#059669" stopOpacity="0.28" />
                      <stop offset="100%" stopColor="#059669" stopOpacity="0.03" />
                    </linearGradient>
                  </defs>

                  {/* Target 100% Reference & Y-Axis Gridlines (0%, 50%, 100%) */}
                  {[0, 50, 100].map((pct) => {
                    const y = baselineY - (pct / 100) * plotH;
                    return (
                      <g key={pct}>
                        <line
                          x1={padLeft}
                          y1={y}
                          x2={svgWidth - padRight}
                          y2={y}
                          stroke={pct === 100 ? '#10b981' : pct === 0 ? '#cbd5e1' : '#e2e8f0'}
                          strokeDasharray={pct === 0 ? undefined : '4 4'}
                          strokeWidth={pct === 100 ? 1.2 : 1}
                          opacity={pct === 100 ? 0.55 : 1}
                        />
                        <text
                          x={padLeft - 6}
                          y={y + 3.5}
                          textAnchor="end"
                          className={`text-[10px] font-mono ${
                            pct === 100 ? 'fill-emerald-700 font-semibold' : 'fill-slate-400'
                          }`}
                        >
                          {pct}%
                        </text>
                      </g>
                    );
                  })}

                  <path d={areaPath} fill="url(#disbursementProgressGrad)" />
                  {pointCoords.length > 1 && (
                    <path
                      d={linePath}
                      fill="none"
                      stroke="#059669"
                      strokeWidth="3"
                      strokeLinecap="round"
                    />
                  )}

                  {inspectedCoord && (
                    <line
                      x1={inspectedCoord.x}
                      y1={padTop}
                      x2={inspectedCoord.x}
                      y2={baselineY}
                      stroke="#94a3b8"
                      strokeWidth={1}
                      strokeDasharray="3 3"
                    />
                  )}

                  {pointCoords.map((coord, idx) => {
                    const isActive = idx === inspectedIdx;
                    const step =
                      pointCoords.length <= 6
                        ? 1
                        : pointCoords.length <= 12
                          ? 2
                          : Math.ceil(pointCoords.length / 6);
                    const showLabel =
                      idx === 0 || idx === pointCoords.length - 1 || idx % step === 0;
                    const slotWidth =
                      pointCoords.length === 1 ? plotW : plotW / Math.max(1, pointCoords.length - 1);

                    return (
                      <g key={coord.item.dateKey}>
                        {isActive && (
                          <circle
                            cx={coord.x}
                            cy={coord.y}
                            r={8}
                            fill="#059669"
                            fillOpacity={0.2}
                          />
                        )}
                        <circle
                          cx={coord.x}
                          cy={coord.y}
                          r={isActive ? 5 : 3.5}
                          fill="#059669"
                          stroke="#ffffff"
                          strokeWidth={2}
                        />
                        {pointCoords.length === 1 && (
                          <text
                            x={coord.x}
                            y={Math.max(padTop + 10, coord.y - 10)}
                            textAnchor="middle"
                            className="fill-emerald-700 text-[10px] font-bold font-mono"
                          >
                            {coord.pct}% ({coord.item.cumulativeCustomers} ksm)
                          </text>
                        )}
                        {showLabel && (
                          <text
                            x={coord.x}
                            y={baselineY + 16}
                            textAnchor="middle"
                            className={`text-[10px] font-medium ${
                              isActive ? 'fill-slate-900 font-bold' : 'fill-slate-500'
                            }`}
                          >
                            {coord.item.shortLabel}
                          </text>
                        )}
                        <rect
                          x={coord.x - slotWidth / 2}
                          y={padTop}
                          width={slotWidth}
                          height={plotH + padBottom}
                          fill="transparent"
                          className="cursor-pointer"
                          onMouseEnter={() => setHoveredIdx(idx)}
                          onClick={() => setHoveredIdx(idx)}
                        />
                      </g>
                    );
                  })}
                </svg>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
};
