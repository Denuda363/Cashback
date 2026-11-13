import React, { useMemo, useState } from 'react';
import {
  Activity,
  ArrowUpRight,
  BarChart2,
  CheckCircle2,
  Clock,
  TrendingUp,
  Users,
} from 'lucide-react';
import { ActiveTab, CustomerSummary, Invoice } from '../types/cashback';
import { formatRupiah } from '../utils/cashbackCalculator';
import { PaginationBar } from './PaginationBar';

interface CashbackMovementChartProps {
  invoices: Invoice[];
  customerSummaries: CustomerSummary[];
  totalCashback: number;
  disbursedCashback: number;
  readyCashback: number;
  pendingCashback: number;
  onNavigateToTab: (tab: ActiveTab) => void;
}

interface TimelinePoint {
  key: string;
  label: string;
  shortLabel: string;
  received: number;
  unclaimed: number;
  ready: number;
  pending: number;
  receivedCount: number;
  unclaimedCount: number;
  totalCount: number;
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

/**
 * Generates a smooth monotone-safe SVG path through points while clamping control points
 * inside [minY, maxY] so gradient areas never dip below the zero baseline.
 */
function buildSmoothLinePath(
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

    const tension = 0.18;
    const cp1x = p1.x + (p2.x - p0.x) * tension;
    const cp1y = Math.min(maxY, Math.max(minY, p1.y + (p2.y - p0.y) * tension));
    const cp2x = p2.x - (p3.x - p1.x) * tension;
    const cp2y = Math.min(maxY, Math.max(minY, p2.y - (p3.y - p1.y) * tension));

    path += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  return path;
}

export const CashbackMovementChart: React.FC<CashbackMovementChartProps> = ({
  invoices,
  customerSummaries,
  totalCashback,
  disbursedCashback,
  readyCashback,
  pendingCashback,
  onNavigateToTab,
}) => {
  const [chartType, setChartType] = useState<'line' | 'bar' | 'konsumen'>('line');
  const [granularity, setGranularity] = useState<'daily' | 'monthly'>('monthly');
  const [isCumulative, setIsCumulative] = useState<boolean>(false);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [receiptRowsPerPage, setReceiptRowsPerPage] = useState<number | 'all'>(5);
  const [receiptPage, setReceiptPage] = useState(1);

  const unclaimedTotal = readyCashback + pendingCashback;
  const receivedPct = totalCashback > 0 ? Math.round((disbursedCashback / totalCashback) * 100) : 0;
  const unclaimedPct = totalCashback > 0 ? Math.max(0, 100 - receivedPct) : 0;

  // Invoice counts for received vs unclaimed
  const invoiceCounts = useMemo(() => {
    let receivedCount = 0;
    let unclaimedCount = 0;
    for (const inv of invoices) {
      if ((Number(inv.cashbackAmount) || 0) <= 0) continue;
      if (inv.claimStatus === 'disbursed') receivedCount++;
      else unclaimedCount++;
    }
    return { receivedCount, unclaimedCount };
  }, [invoices]);

  // Customer receipt breakdown
  const customerReceiptStats = useMemo(() => {
    return [...customerSummaries]
      .filter((c) => !c.isExcludedFromCashback && c.totalCashback > 0)
      .sort((a, b) => {
        if (b.disbursedCashback !== a.disbursedCashback) {
          return b.disbursedCashback - a.disbursedCashback;
        }
        return b.totalCashback - a.totalCashback;
      });
  }, [customerSummaries]);

  const disbursedCustomerCount = useMemo(
    () => customerReceiptStats.filter((c) => c.disbursedCashback > 0).length,
    [customerReceiptStats]
  );

  // Build daily & monthly timeline series
  const { dailySeries, monthlySeries } = useMemo(() => {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    const dayMap = new Map<string, TimelinePoint>();
    const monthMap = new Map<string, TimelinePoint>();

    for (const inv of invoices) {
      const amt = Math.round(Number(inv.cashbackAmount) || 0);
      const isDisbursed = inv.claimStatus === 'disbursed';
      const isReady = inv.claimStatus === 'ready';
      const refDateStr = isDisbursed && inv.disbursedDate ? inv.disbursedDate : inv.date;
      const d = new Date(refDateStr);
      const valid = !Number.isNaN(d.getTime());

      const dayKey = valid
        ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
        : 'unknown';
      const dayLabel = valid
        ? `${d.getDate()} ${monthNames[d.getMonth()]} ${d.getFullYear()}`
        : 'Lainnya';
      const dayShort = valid ? `${d.getDate()} ${monthNames[d.getMonth()]}` : 'Lainnya';

      const monthKey = valid
        ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        : 'unknown';
      const monthLabel = valid ? `${monthNames[d.getMonth()]} ${d.getFullYear()}` : 'Lainnya';
      const monthShort = valid
        ? `${monthNames[d.getMonth()]} '${String(d.getFullYear()).slice(-2)}`
        : 'Lainnya';

      const applyPoint = (map: Map<string, TimelinePoint>, key: string, label: string, shortLabel: string) => {
        const cur = map.get(key) || {
          key,
          label,
          shortLabel,
          received: 0,
          unclaimed: 0,
          ready: 0,
          pending: 0,
          receivedCount: 0,
          unclaimedCount: 0,
          totalCount: 0,
        };
        cur.totalCount += 1;
        if (isDisbursed) {
          cur.received += amt;
          cur.receivedCount += 1;
        } else {
          cur.unclaimed += amt;
          cur.unclaimedCount += 1;
          if (isReady) cur.ready += amt;
          else cur.pending += amt;
        }
        map.set(key, cur);
      };

      applyPoint(dayMap, dayKey, dayLabel, dayShort);
      applyPoint(monthMap, monthKey, monthLabel, monthShort);
    }

    return {
      dailySeries: Array.from(dayMap.values()).sort((a, b) => a.key.localeCompare(b.key)),
      monthlySeries: Array.from(monthMap.values()).sort((a, b) => a.key.localeCompare(b.key)),
    };
  }, [invoices]);

  // Pick effective granularity automatically if monthly only has 1 point while daily has multiple points
  const effectiveGranularity =
    granularity === 'monthly' && monthlySeries.length <= 1 && dailySeries.length > 1
      ? 'daily'
      : granularity;

  const activeSeries = useMemo(() => {
    const raw = effectiveGranularity === 'daily' ? dailySeries : monthlySeries;
    if (!isCumulative) return raw;

    let accReceived = 0;
    let accUnclaimed = 0;
    let accReady = 0;
    let accPending = 0;
    let accReceivedCount = 0;
    let accUnclaimedCount = 0;
    let accTotalCount = 0;

    return raw.map((p) => {
      accReceived += p.received;
      accUnclaimed += p.unclaimed;
      accReady += p.ready;
      accPending += p.pending;
      accReceivedCount += p.receivedCount;
      accUnclaimedCount += p.unclaimedCount;
      accTotalCount += p.totalCount;
      return {
        ...p,
        received: accReceived,
        unclaimed: accUnclaimed,
        ready: accReady,
        pending: accPending,
        receivedCount: accReceivedCount,
        unclaimedCount: accUnclaimedCount,
        totalCount: accTotalCount,
      };
    });
  }, [effectiveGranularity, dailySeries, monthlySeries, isCumulative]);

  const paginatedCustomerReceipts = useMemo(() => {
    if (receiptRowsPerPage === 'all') return customerReceiptStats;
    const totalPages = Math.max(1, Math.ceil(customerReceiptStats.length / receiptRowsPerPage));
    const safePage = Math.min(Math.max(1, receiptPage), totalPages);
    const start = (safePage - 1) * receiptRowsPerPage;
    return customerReceiptStats.slice(start, start + receiptRowsPerPage);
  }, [customerReceiptStats, receiptRowsPerPage, receiptPage]);

  // SVG chart dimensions & geometry
  const svgWidth = 680;
  const svgHeight = 250;
  const padLeft = 64;
  const padRight = 22;
  const padTop = 20;
  const padBottom = 34;
  const plotW = svgWidth - padLeft - padRight;
  const plotH = svgHeight - padTop - padBottom;
  const baselineY = padTop + plotH;

  const maxChartVal = useMemo(() => {
    const rawMax = Math.max(
      ...activeSeries.map((p) => Math.max(p.received, p.unclaimed)),
      0
    );
    if (rawMax <= 0) return 100_000;
    return rawMax * 1.15; // 15% headroom above tallest point
  }, [activeSeries]);

  const yTicks = useMemo(() => {
    return [0, 0.33, 0.66, 1].map((ratio) => ({
      ratio,
      value: Math.round(maxChartVal * ratio),
      y: baselineY - plotH * ratio,
    }));
  }, [maxChartVal, baselineY, plotH]);

  const pointCoords = useMemo(() => {
    const n = activeSeries.length;
    if (n === 0) return [];
    return activeSeries.map((item, idx) => {
      const x = n === 1 ? padLeft + plotW / 2 : padLeft + (idx / (n - 1)) * plotW;
      const yReceived = baselineY - (item.received / maxChartVal) * plotH;
      const yUnclaimed = baselineY - (item.unclaimed / maxChartVal) * plotH;
      return { x, yReceived, yUnclaimed, item };
    });
  }, [activeSeries, padLeft, plotW, baselineY, plotH, maxChartVal]);

  const receivedLinePath = useMemo(() => {
    return buildSmoothLinePath(
      pointCoords.map((c) => ({ x: c.x, y: c.yReceived })),
      padTop,
      baselineY
    );
  }, [pointCoords, padTop, baselineY]);

  const unclaimedLinePath = useMemo(() => {
    return buildSmoothLinePath(
      pointCoords.map((c) => ({ x: c.x, y: c.yUnclaimed })),
      padTop,
      baselineY
    );
  }, [pointCoords, padTop, baselineY]);

  const receivedAreaPath = useMemo(() => {
    if (pointCoords.length === 0) return '';
    if (pointCoords.length === 1) {
      const c = pointCoords[0];
      return `M ${c.x - 24} ${baselineY} L ${c.x - 24} ${c.yReceived} L ${c.x + 24} ${c.yReceived} L ${c.x + 24} ${baselineY} Z`;
    }
    const first = pointCoords[0];
    const last = pointCoords[pointCoords.length - 1];
    return `${receivedLinePath} L ${last.x.toFixed(1)} ${baselineY} L ${first.x.toFixed(1)} ${baselineY} Z`;
  }, [pointCoords, receivedLinePath, baselineY]);

  const unclaimedAreaPath = useMemo(() => {
    if (pointCoords.length === 0) return '';
    if (pointCoords.length === 1) {
      const c = pointCoords[0];
      return `M ${c.x - 24} ${baselineY} L ${c.x - 24} ${c.yUnclaimed} L ${c.x + 24} ${c.yUnclaimed} L ${c.x + 24} ${baselineY} Z`;
    }
    const first = pointCoords[0];
    const last = pointCoords[pointCoords.length - 1];
    return `${unclaimedLinePath} L ${last.x.toFixed(1)} ${baselineY} L ${first.x.toFixed(1)} ${baselineY} Z`;
  }, [pointCoords, unclaimedLinePath, baselineY]);

  // Active inspected point (hovered or latest point)
  const inspectedIdx =
    hoveredIndex !== null && hoveredIndex < activeSeries.length
      ? hoveredIndex
      : activeSeries.length > 0
        ? activeSeries.length - 1
        : null;
  const inspectedPoint = inspectedIdx !== null ? activeSeries[inspectedIdx] : null;
  const inspectedCoord = inspectedIdx !== null ? pointCoords[inspectedIdx] : null;

  // Donut gauge geometry
  const donutRadius = 26;
  const donutCircumference = 2 * Math.PI * donutRadius;
  const receivedDash = (receivedPct / 100) * donutCircumference;

  return (
    <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5 flex flex-col justify-between shadow-2xs">
      <div>
        {/* Header & Mode Switcher */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700">
                <Activity className="w-4 h-4" />
              </div>
              <h2 className="text-sm font-bold text-slate-900">
                Grafik Pergerakan Cashback Diterima vs Belum Diterima
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Pantau laju cashback yang sudah diterima konsumen dan sisa yang belum cair secara visual
            </p>
          </div>

          <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 self-start sm:self-auto shrink-0">
            <button
              type="button"
              onClick={() => setChartType('line')}
              className={`px-2.5 py-1 text-[11px] font-semibold rounded-md flex items-center gap-1 transition-colors ${
                chartType === 'line'
                  ? 'bg-white text-emerald-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <TrendingUp className="w-3 h-3" />
              <span>Garis</span>
            </button>
            <button
              type="button"
              onClick={() => setChartType('bar')}
              className={`px-2.5 py-1 text-[11px] font-semibold rounded-md flex items-center gap-1 transition-colors ${
                chartType === 'bar'
                  ? 'bg-white text-emerald-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BarChart2 className="w-3 h-3" />
              <span>Batang</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setChartType('konsumen');
                setReceiptPage(1);
              }}
              className={`px-2.5 py-1 text-[11px] font-semibold rounded-md flex items-center gap-1 transition-colors ${
                chartType === 'konsumen'
                  ? 'bg-white text-emerald-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Users className="w-3 h-3" />
              <span>Konsumen</span>
            </button>
          </div>
        </div>

        {/* Hero Visual Ratio Strip: Donut Gauge + Two Contrast Comparison Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 mb-4">
          {/* Circular Ring Gauge */}
          <div className="sm:col-span-4 p-3 rounded-xl border border-slate-200/80 bg-gradient-to-br from-slate-50 to-white flex items-center gap-3">
            <div className="relative w-16 h-16 shrink-0 flex items-center justify-center">
              <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
                <circle
                  cx="32"
                  cy="32"
                  r={donutRadius}
                  fill="none"
                  stroke="#fef3c7"
                  strokeWidth="7"
                />
                <circle
                  cx="32"
                  cy="32"
                  r={donutRadius}
                  fill="none"
                  stroke="#f59e0b"
                  strokeWidth="7"
                  strokeDasharray={`${donutCircumference} ${donutCircumference}`}
                  strokeLinecap="round"
                  opacity={totalCashback > 0 ? 0.85 : 0.2}
                />
                {receivedPct > 0 && (
                  <circle
                    cx="32"
                    cy="32"
                    r={donutRadius}
                    fill="none"
                    stroke="#059669"
                    strokeWidth="7"
                    strokeDasharray={`${receivedDash} ${donutCircumference}`}
                    strokeLinecap="round"
                    className="transition-all duration-500"
                  />
                )}
              </svg>
              <span className="absolute text-xs font-extrabold font-mono text-slate-900">
                {receivedPct}%
              </span>
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-bold text-slate-800">Rasio Penerimaan</div>
              <div className="text-[10px] text-slate-500 mt-0.5 leading-snug">
                <strong className="text-emerald-700">{disbursedCustomerCount}</strong> dari{' '}
                <strong>{customerReceiptStats.length}</strong> konsumen sudah terima cair
              </div>
            </div>
          </div>

          {/* Card: Sudah Diterima */}
          <div className="sm:col-span-4 p-3 rounded-xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50/90 to-white flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-900">
                <span className="w-2 h-2 rounded-full bg-emerald-600" />
                Sudah Diterima
              </span>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <div className="mt-1.5">
              <div className="text-sm sm:text-base font-extrabold text-emerald-700 font-mono tabular-nums">
                {formatRupiah(disbursedCashback)}
              </div>
              <div className="text-[10px] text-emerald-700/80 font-medium mt-0.5">
                {receivedPct}% · {invoiceCounts.receivedCount} faktur tunai cair
              </div>
            </div>
          </div>

          {/* Card: Belum Diterima */}
          <div className="sm:col-span-4 p-3 rounded-xl border border-amber-200/80 bg-gradient-to-br from-amber-50/80 to-white flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-amber-950">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                Belum Diterima
              </span>
              <Clock className="w-3.5 h-3.5 text-amber-600" />
            </div>
            <div className="mt-1.5">
              <div className="text-sm sm:text-base font-extrabold text-amber-700 font-mono tabular-nums">
                {formatRupiah(unclaimedTotal)}
              </div>
              <div className="text-[10px] text-amber-800/80 font-medium mt-0.5">
                {unclaimedPct}% · {invoiceCounts.unclaimedCount} faktur siap/menunggu
              </div>
            </div>
          </div>
        </div>

        {/* Sub-Toolbar for Line / Bar Charts */}
        {chartType !== 'konsumen' && (
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3 pb-2.5 border-b border-slate-100">
            <div className="flex flex-wrap items-center gap-1.5">
              <div className="inline-flex rounded-md border border-slate-200 bg-slate-50 p-0.5">
                <button
                  type="button"
                  onClick={() => {
                    setGranularity('daily');
                    setHoveredIndex(null);
                  }}
                  className={`px-2 py-0.5 text-[10px] font-semibold rounded transition-colors ${
                    effectiveGranularity === 'daily'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Harian
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setGranularity('monthly');
                    setHoveredIndex(null);
                  }}
                  className={`px-2 py-0.5 text-[10px] font-semibold rounded transition-colors ${
                    effectiveGranularity === 'monthly'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Bulanan
                </button>
              </div>

              <div className="inline-flex rounded-md border border-slate-200 bg-slate-50 p-0.5">
                <button
                  type="button"
                  onClick={() => setIsCumulative(false)}
                  className={`px-2 py-0.5 text-[10px] font-semibold rounded transition-colors ${
                    !isCumulative
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Per Periode
                </button>
                <button
                  type="button"
                  onClick={() => setIsCumulative(true)}
                  className={`px-2 py-0.5 text-[10px] font-semibold rounded transition-colors ${
                    isCumulative
                      ? 'bg-white text-emerald-700 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Akumulasi Pergerakan
                </button>
              </div>
            </div>

            {/* Live Inspected Data Pill */}
            {inspectedPoint && (
              <div className="flex flex-wrap items-center gap-2 text-[11px] bg-slate-50 border border-slate-200/80 rounded-lg px-2.5 py-1">
                <span className="font-bold text-slate-800">{inspectedPoint.label}:</span>
                <span className="font-mono font-semibold text-emerald-700">
                  +{formatRupiah(inspectedPoint.received)} Diterima
                </span>
                <span className="text-slate-300">|</span>
                <span className="font-mono font-semibold text-amber-700">
                  {formatRupiah(inspectedPoint.unclaimed)} Belum
                </span>
              </div>
            )}
          </div>
        )}

        {/* MAIN CHART AREA */}
        {chartType === 'line' ? (
          activeSeries.length === 0 ? (
            <div className="h-60 flex items-center justify-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
              Belum ada data transaksi cashback untuk ditampilkan.
            </div>
          ) : (
            <div className="relative select-none" onMouseLeave={() => setHoveredIndex(null)}>
              <svg
                viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                className="w-full h-auto overflow-visible"
                role="img"
                aria-label="Grafik garis pergerakan cashback diterima dan belum diterima"
              >
                <defs>
                  <linearGradient id="cbReceivedGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#059669" stopOpacity="0.28" />
                    <stop offset="100%" stopColor="#059669" stopOpacity="0.02" />
                  </linearGradient>
                  <linearGradient id="cbUnclaimedGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.24" />
                    <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.02" />
                  </linearGradient>
                </defs>

                {/* Horizontal Gridlines & Y-Axis Labels */}
                {yTicks.map((tick) => (
                  <g key={tick.ratio}>
                    <line
                      x1={padLeft}
                      y1={tick.y}
                      x2={svgWidth - padRight}
                      y2={tick.y}
                      stroke={tick.ratio === 0 ? '#cbd5e1' : '#e2e8f0'}
                      strokeDasharray={tick.ratio === 0 ? undefined : '4 4'}
                      strokeWidth={1}
                    />
                    <text
                      x={padLeft - 8}
                      y={tick.y + 3.5}
                      textAnchor="end"
                      className="fill-slate-400 text-[10px] font-mono"
                    >
                      {formatCompactRupiah(tick.value)}
                    </text>
                  </g>
                ))}

                {/* Area Fills */}
                <path d={unclaimedAreaPath} fill="url(#cbUnclaimedGrad)" />
                <path d={receivedAreaPath} fill="url(#cbReceivedGrad)" />

                {/* Smooth Curves */}
                {pointCoords.length > 1 && (
                  <>
                    <path
                      d={unclaimedLinePath}
                      fill="none"
                      stroke="#f59e0b"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeDasharray="6 3"
                    />
                    <path
                      d={receivedLinePath}
                      fill="none"
                      stroke="#059669"
                      strokeWidth="3"
                      strokeLinecap="round"
                    />
                  </>
                )}

                {/* Vertical Crosshair on Active Point */}
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

                {/* Data Point Nodes & Interactive Hit Targets */}
                {pointCoords.map((coord, idx) => {
                  const isActive = idx === inspectedIdx;
                  // Auto-thin X-axis labels so they never overlap when many dates exist
                  const step =
                    pointCoords.length <= 7
                      ? 1
                      : pointCoords.length <= 14
                        ? 2
                        : Math.ceil(pointCoords.length / 7);
                  const showLabel = idx === 0 || idx === pointCoords.length - 1 || idx % step === 0;
                  const slotWidth =
                    pointCoords.length === 1 ? plotW : plotW / Math.max(1, pointCoords.length - 1);

                  return (
                    <g key={coord.item.key}>
                      {/* Unclaimed Node */}
                      {isActive && (
                        <circle
                          cx={coord.x}
                          cy={coord.yUnclaimed}
                          r={8}
                          fill="#f59e0b"
                          fillOpacity={0.2}
                        />
                      )}
                      <circle
                        cx={coord.x}
                        cy={coord.yUnclaimed}
                        r={isActive ? 5 : 3.5}
                        fill="#ffffff"
                        stroke="#f59e0b"
                        strokeWidth={2.5}
                      />

                      {/* Received Node */}
                      {isActive && (
                        <circle
                          cx={coord.x}
                          cy={coord.yReceived}
                          r={8}
                          fill="#059669"
                          fillOpacity={0.2}
                        />
                      )}
                      <circle
                        cx={coord.x}
                        cy={coord.yReceived}
                        r={isActive ? 5.5 : 3.5}
                        fill="#059669"
                        stroke="#ffffff"
                        strokeWidth={2}
                      />

                      {/* Single-point value callouts for clarity */}
                      {pointCoords.length === 1 && (
                        <>
                          <text
                            x={coord.x}
                            y={coord.yReceived - 10}
                            textAnchor="middle"
                            className="fill-emerald-700 text-[10px] font-bold font-mono"
                          >
                            Diterima: {formatCompactRupiah(coord.item.received)}
                          </text>
                          <text
                            x={coord.x}
                            y={coord.yUnclaimed - 10}
                            textAnchor="middle"
                            className="fill-amber-700 text-[10px] font-bold font-mono"
                          >
                            Belum: {formatCompactRupiah(coord.item.unclaimed)}
                          </text>
                        </>
                      )}

                      {/* X-Axis Label */}
                      {showLabel && (
                        <text
                          x={coord.x}
                          y={baselineY + 18}
                          textAnchor="middle"
                          className={`text-[10px] font-medium ${
                            isActive ? 'fill-slate-900 font-bold' : 'fill-slate-500'
                          }`}
                        >
                          {coord.item.shortLabel}
                        </text>
                      )}

                      {/* Transparent Hit Target */}
                      <rect
                        x={coord.x - slotWidth / 2}
                        y={padTop}
                        width={slotWidth}
                        height={plotH + padBottom}
                        fill="transparent"
                        className="cursor-pointer"
                        onMouseEnter={() => setHoveredIndex(idx)}
                        onClick={() => setHoveredIndex(idx)}
                      />
                    </g>
                  );
                })}
              </svg>
            </div>
          )
        ) : chartType === 'bar' ? (
          activeSeries.length === 0 ? (
            <div className="h-60 flex items-center justify-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
              Belum ada data transaksi cashback untuk ditampilkan.
            </div>
          ) : (
            <div className="relative select-none" onMouseLeave={() => setHoveredIndex(null)}>
              <svg
                viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                className="w-full h-auto overflow-visible"
                role="img"
                aria-label="Grafik batang perbandingan cashback diterima dan belum diterima"
              >
                {/* Horizontal Gridlines & Y-Axis Labels */}
                {yTicks.map((tick) => (
                  <g key={tick.ratio}>
                    <line
                      x1={padLeft}
                      y1={tick.y}
                      x2={svgWidth - padRight}
                      y2={tick.y}
                      stroke={tick.ratio === 0 ? '#cbd5e1' : '#e2e8f0'}
                      strokeDasharray={tick.ratio === 0 ? undefined : '4 4'}
                      strokeWidth={1}
                    />
                    <text
                      x={padLeft - 8}
                      y={tick.y + 3.5}
                      textAnchor="end"
                      className="fill-slate-400 text-[10px] font-mono"
                    >
                      {formatCompactRupiah(tick.value)}
                    </text>
                  </g>
                ))}

                {/* Side-by-side Grouped Columns */}
                {activeSeries.map((item, idx) => {
                  const n = activeSeries.length;
                  const groupWidth = plotW / n;
                  const centerX = padLeft + idx * groupWidth + groupWidth / 2;
                  const barWidth = Math.min(24, Math.max(8, (groupWidth - 14) / 2));
                  const gap = 4;

                  const hRec = Math.max(item.received > 0 ? 4 : 0, (item.received / maxChartVal) * plotH);
                  const hUnc = Math.max(item.unclaimed > 0 ? 4 : 0, (item.unclaimed / maxChartVal) * plotH);
                  const isActive = idx === inspectedIdx;

                  const step = n <= 7 ? 1 : n <= 14 ? 2 : Math.ceil(n / 7);
                  const showLabel = idx === 0 || idx === n - 1 || idx % step === 0;

                  return (
                    <g
                      key={item.key}
                      className="cursor-pointer"
                      onMouseEnter={() => setHoveredIndex(idx)}
                      onClick={() => setHoveredIndex(idx)}
                    >
                      {isActive && (
                        <rect
                          x={centerX - barWidth - gap - 4}
                          y={padTop}
                          width={barWidth * 2 + gap + 8}
                          height={plotH}
                          rx={6}
                          fill="#f1f5f9"
                        />
                      )}

                      {/* Received Bar (Emerald) */}
                      <rect
                        x={centerX - barWidth - gap / 2}
                        y={baselineY - hRec}
                        width={barWidth}
                        height={hRec}
                        rx={4}
                        fill={isActive ? '#047857' : '#059669'}
                        className="transition-all duration-200"
                      />

                      {/* Unclaimed Bar (Amber) */}
                      <rect
                        x={centerX + gap / 2}
                        y={baselineY - hUnc}
                        width={barWidth}
                        height={hUnc}
                        rx={4}
                        fill={isActive ? '#d97706' : '#f59e0b'}
                        className="transition-all duration-200"
                      />

                      {/* Value hints above bars when few periods or active */}
                      {(n <= 6 || isActive) && item.received > 0 && (
                        <text
                          x={centerX - barWidth / 2 - gap / 2}
                          y={baselineY - hRec - 5}
                          textAnchor="middle"
                          className="fill-emerald-700 text-[9px] font-bold font-mono"
                        >
                          {formatCompactRupiah(item.received)}
                        </text>
                      )}
                      {(n <= 6 || isActive) && item.unclaimed > 0 && (
                        <text
                          x={centerX + barWidth / 2 + gap / 2}
                          y={baselineY - hUnc - 5}
                          textAnchor="middle"
                          className="fill-amber-700 text-[9px] font-bold font-mono"
                        >
                          {formatCompactRupiah(item.unclaimed)}
                        </text>
                      )}

                      {/* X-Axis Label */}
                      {showLabel && (
                        <text
                          x={centerX}
                          y={baselineY + 18}
                          textAnchor="middle"
                          className={`text-[10px] font-medium ${
                            isActive ? 'fill-slate-900 font-bold' : 'fill-slate-500'
                          }`}
                        >
                          {item.shortLabel}
                        </text>
                      )}
                    </g>
                  );
                })}
              </svg>
            </div>
          )
        ) : customerReceiptStats.length === 0 ? (
          <div className="h-52 flex items-center justify-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
            Belum ada data penerima cashback konsumen.
          </div>
        ) : (
          <div className="space-y-2.5">
            {paginatedCustomerReceipts.map((cust, idx) => {
              const pct =
                cust.totalCashback > 0
                  ? Math.round((cust.disbursedCashback / cust.totalCashback) * 100)
                  : 0;
              const unclaimedCust = Math.max(0, cust.totalCashback - cust.disbursedCashback);
              const unclaimedCustPct = Math.max(0, 100 - pct);

              return (
                <div
                  key={cust.customerCode || `${cust.customerName}_${idx}`}
                  className="p-3 rounded-xl border border-slate-100 bg-slate-50/60 hover:bg-slate-50 transition-colors space-y-2"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-bold text-slate-900 truncate">{cust.customerName}</span>
                      {pct === 100 ? (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800 shrink-0">
                          Sudah Diterima 100%
                        </span>
                      ) : cust.disbursedCashback > 0 ? (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800 shrink-0">
                          Diterima {pct}%
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-50 border border-amber-200 text-amber-800 shrink-0">
                          Belum Diterima
                        </span>
                      )}
                    </div>
                    <div className="font-mono tabular-nums text-[11px] flex items-center gap-2 shrink-0">
                      <span className="font-bold text-emerald-700">
                        Diterima: {formatRupiah(cust.disbursedCashback)}
                      </span>
                      <span className="text-slate-300">|</span>
                      <span className="font-semibold text-amber-700">
                        Belum: {formatRupiah(unclaimedCust)}
                      </span>
                    </div>
                  </div>
                  <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden flex">
                    {pct > 0 && (
                      <div
                        className="h-full bg-emerald-600 transition-all duration-300"
                        style={{ width: `${pct}%` }}
                        title={`Sudah Diterima: ${formatRupiah(cust.disbursedCashback)}`}
                      />
                    )}
                    {unclaimedCustPct > 0 && (
                      <div
                        className="h-full bg-amber-400 transition-all duration-300"
                        style={{ width: `${unclaimedCustPct}%` }}
                        title={`Belum Diterima: ${formatRupiah(unclaimedCust)}`}
                      />
                    )}
                  </div>
                </div>
              );
            })}

            <div className="pt-1">
              <PaginationBar
                totalItems={customerReceiptStats.length}
                rowsPerPage={receiptRowsPerPage}
                currentPage={receiptPage}
                onChangeRowsPerPage={(rows) => {
                  setReceiptRowsPerPage(rows);
                  setReceiptPage(1);
                }}
                onChangePage={setReceiptPage}
                itemLabel="konsumen"
                options={[5, 10, 20, 50]}
              />
            </div>
          </div>
        )}
      </div>

      {/* Footer Legend & Direct Navigation */}
      <div className="mt-4 pt-3.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-1.5 rounded-full bg-emerald-600 inline-block" />
            <span className="font-medium text-slate-700">Cashback Sudah Diterima</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-1.5 rounded-full bg-amber-500 inline-block" />
            <span className="font-medium text-slate-700">Cashback Belum Diterima (Siap & Menunggu)</span>
          </div>
        </div>
        <button
          onClick={() => onNavigateToTab('payout_records')}
          className="text-emerald-700 hover:text-emerald-800 font-semibold flex items-center gap-1"
        >
          Lihat Rekap Penerimaan <ArrowUpRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
