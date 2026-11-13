import React, { useMemo, useState } from 'react';
import {
  Activity,
  ArrowUpRight,
  BarChart2,
  Calendar,
  CheckCircle2,
  Clock,
  SlidersHorizontal,
  TrendingUp,
  Users,
  X,
} from 'lucide-react';
import { ActiveTab, CustomerSummary, Invoice } from '../types/cashback';
import { formatRupiah } from '../utils/cashbackCalculator';
import { PaginationBar } from './PaginationBar';

interface CashbackMovementChartProps {
  invoices: Invoice[];
  customerSummaries: CustomerSummary[];
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
  receivedCustomerCount: number;
  unclaimedCustomerCount: number;
  receivedCustomerKeys: string[];
  unclaimedCustomerKeys: string[];
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

function formatShortDateID(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
}

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
  onNavigateToTab,
}) => {
  const [chartType, setChartType] = useState<'line' | 'bar' | 'konsumen'>('line');
  const [metricBasis, setMetricBasis] = useState<'customers' | 'amount'>('customers');
  const [granularity, setGranularity] = useState<'daily' | 'monthly'>('monthly');
  const [isCumulative, setIsCumulative] = useState<boolean>(false);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [receiptRowsPerPage, setReceiptRowsPerPage] = useState<number | 'all'>(5);
  const [receiptPage, setReceiptPage] = useState(1);

  // Chart-level Date Range Filter
  const [chartStartDate, setChartStartDate] = useState<string>('');
  const [chartEndDate, setChartEndDate] = useState<string>('');
  const [showCustomDates, setShowCustomDates] = useState<boolean>(false);
  const [activePreset, setActivePreset] = useState<'all' | '7d' | '30d' | 'month' | 'custom'>('all');

  const hasChartDateFilter = Boolean(chartStartDate || chartEndDate);

  const applyDatePreset = (preset: 'all' | '7d' | '30d' | 'month') => {
    setHoveredIndex(null);
    setReceiptPage(1);
    if (preset === 'all') {
      setChartStartDate('');
      setChartEndDate('');
      setActivePreset('all');
      return;
    }

    const now = new Date();
    const toISO = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };

    if (preset === '7d') {
      const start = new Date(now);
      start.setDate(now.getDate() - 6);
      setChartStartDate(toISO(start));
      setChartEndDate(toISO(now));
      setActivePreset('7d');
      setGranularity('daily');
      return;
    }

    if (preset === '30d') {
      const start = new Date(now);
      start.setDate(now.getDate() - 29);
      setChartStartDate(toISO(start));
      setChartEndDate(toISO(now));
      setActivePreset('30d');
      setGranularity('daily');
      return;
    }

    if (preset === 'month') {
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const lastDay = new Date(year, now.getMonth() + 1, 0).getDate();
      setChartStartDate(`${year}-${month}-01`);
      setChartEndDate(`${year}-${month}-${String(lastDay).padStart(2, '0')}`);
      setActivePreset('month');
      setGranularity('daily');
    }
  };

  // Filter invoices for the chart using effective movement date
  const chartInvoices = useMemo(() => {
    if (!hasChartDateFilter) return invoices;
    return invoices.filter((inv) => {
      const effectiveDate =
        inv.claimStatus === 'disbursed' && inv.disbursedDate ? inv.disbursedDate : inv.date;
      if (!effectiveDate) return false;
      if (chartStartDate && effectiveDate < chartStartDate) return false;
      if (chartEndDate && effectiveDate > chartEndDate) return false;
      return true;
    });
  }, [invoices, chartStartDate, chartEndDate, hasChartDateFilter]);

  // Scoped Rupiah totals (customer counts & progress % are computed from customerReceiptStats below)
  const chartAmounts = useMemo(() => {
    let totalCashback = 0;
    let disbursedCashback = 0;
    let readyCashback = 0;
    let pendingCashback = 0;

    for (const inv of chartInvoices) {
      const amt = Math.round(Number(inv.cashbackAmount) || 0);
      totalCashback += amt;
      if (inv.claimStatus === 'disbursed') {
        disbursedCashback += amt;
      } else if (inv.claimStatus === 'ready') {
        readyCashback += amt;
      } else {
        pendingCashback += amt;
      }
    }

    return {
      totalCashback,
      disbursedCashback,
      readyCashback,
      pendingCashback,
      unclaimedTotal: readyCashback + pendingCashback,
    };
  }, [chartInvoices]);

  // Customer receipt breakdown (scoped to chart date range when active)
  const customerReceiptStats = useMemo(() => {
    if (!hasChartDateFilter) {
      return [...customerSummaries]
        .filter((c) => !c.isExcludedFromCashback && c.totalCashback > 0)
        .sort((a, b) => {
          if (b.disbursedCashback !== a.disbursedCashback) {
            return b.disbursedCashback - a.disbursedCashback;
          }
          return b.totalCashback - a.totalCashback;
        });
    }

    const excludedSet = new Set(
      customerSummaries
        .filter((c) => c.isExcludedFromCashback)
        .map((c) => c.customerName.trim().toLowerCase())
    );
    const map = new Map<
      string,
      {
        customerName: string;
        totalCashback: number;
        disbursedCashback: number;
        readyCashback: number;
        pendingCashback: number;
      }
    >();

    for (const inv of chartInvoices) {
      const name = (inv.customerName || 'Tanpa Nama').trim();
      const key = name.toLowerCase();
      if (excludedSet.has(key)) continue;
      const amt = Math.round(Number(inv.cashbackAmount) || 0);
      if (amt <= 0) continue;
      const cur = map.get(key) || {
        customerName: name,
        totalCashback: 0,
        disbursedCashback: 0,
        readyCashback: 0,
        pendingCashback: 0,
      };
      cur.totalCashback += amt;
      if (inv.claimStatus === 'disbursed') cur.disbursedCashback += amt;
      else if (inv.claimStatus === 'ready') cur.readyCashback += amt;
      else cur.pendingCashback += amt;
      map.set(key, cur);
    }

    return Array.from(map.values()).sort((a, b) => {
      if (b.disbursedCashback !== a.disbursedCashback) {
        return b.disbursedCashback - a.disbursedCashback;
      }
      return b.totalCashback - a.totalCashback;
    });
  }, [hasChartDateFilter, customerSummaries, chartInvoices]);

  const totalCustomerCount = customerReceiptStats.length;

  const disbursedCustomerCount = useMemo(
    () => customerReceiptStats.filter((c) => c.disbursedCashback > 0).length,
    [customerReceiptStats]
  );

  const unclaimedCustomerCount = useMemo(
    () => Math.max(0, totalCustomerCount - disbursedCustomerCount),
    [totalCustomerCount, disbursedCustomerCount]
  );

  // Progress % strictly calculated from customer count (jumlah konsumen)
  const receivedCustomerPct =
    totalCustomerCount > 0 ? Math.round((disbursedCustomerCount / totalCustomerCount) * 100) : 0;
  const unclaimedCustomerPct =
    totalCustomerCount > 0 ? Math.max(0, 100 - receivedCustomerPct) : 0;

  // Build daily & monthly timeline series tracking unique customers and Rupiah amounts
  const { dailySeries, monthlySeries } = useMemo(() => {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    type Bucket = {
      key: string;
      label: string;
      shortLabel: string;
      received: number;
      unclaimed: number;
      ready: number;
      pending: number;
      receivedSet: Set<string>;
      unclaimedSet: Set<string>;
    };
    const dayMap = new Map<string, Bucket>();
    const monthMap = new Map<string, Bucket>();

    for (const inv of chartInvoices) {
      const amt = Math.round(Number(inv.cashbackAmount) || 0);
      if (amt <= 0) continue;
      const custKey = (inv.customerName || inv.id || 'tanpa-nama').trim().toLowerCase();
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

      const applyPoint = (map: Map<string, Bucket>, key: string, label: string, shortLabel: string) => {
        const cur = map.get(key) || {
          key,
          label,
          shortLabel,
          received: 0,
          unclaimed: 0,
          ready: 0,
          pending: 0,
          receivedSet: new Set<string>(),
          unclaimedSet: new Set<string>(),
        };
        if (isDisbursed) {
          cur.received += amt;
          cur.receivedSet.add(custKey);
        } else {
          cur.unclaimed += amt;
          cur.unclaimedSet.add(custKey);
          if (isReady) cur.ready += amt;
          else cur.pending += amt;
        }
        map.set(key, cur);
      };

      applyPoint(dayMap, dayKey, dayLabel, dayShort);
      applyPoint(monthMap, monthKey, monthLabel, monthShort);
    }

    const finalize = (map: Map<string, Bucket>): TimelinePoint[] =>
      Array.from(map.values())
        .sort((a, b) => a.key.localeCompare(b.key))
        .map((b) => ({
          key: b.key,
          label: b.label,
          shortLabel: b.shortLabel,
          received: b.received,
          unclaimed: b.unclaimed,
          ready: b.ready,
          pending: b.pending,
          receivedCustomerCount: b.receivedSet.size,
          unclaimedCustomerCount: b.unclaimedSet.size,
          receivedCustomerKeys: Array.from(b.receivedSet),
          unclaimedCustomerKeys: Array.from(b.unclaimedSet),
        }));

    return {
      dailySeries: finalize(dayMap),
      monthlySeries: finalize(monthMap),
    };
  }, [chartInvoices]);

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
    const accReceivedCustomers = new Set<string>();
    const accUnclaimedCustomers = new Set<string>();

    return raw.map((p) => {
      accReceived += p.received;
      accUnclaimed += p.unclaimed;
      accReady += p.ready;
      accPending += p.pending;
      for (const k of p.receivedCustomerKeys) {
        accReceivedCustomers.add(k);
        accUnclaimedCustomers.delete(k);
      }
      for (const k of p.unclaimedCustomerKeys) {
        if (!accReceivedCustomers.has(k)) {
          accUnclaimedCustomers.add(k);
        }
      }
      return {
        ...p,
        received: accReceived,
        unclaimed: accUnclaimed,
        ready: accReady,
        pending: accPending,
        receivedCustomerCount: accReceivedCustomers.size,
        unclaimedCustomerCount: accUnclaimedCustomers.size,
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
  const svgWidth = 640;
  const svgHeight = 250;
  const padLeft = 58;
  const padRight = 18;
  const padTop = 20;
  const padBottom = 34;
  const plotW = svgWidth - padLeft - padRight;
  const plotH = svgHeight - padTop - padBottom;
  const baselineY = padTop + plotH;

  const getSeriesValues = (item: TimelinePoint) =>
    metricBasis === 'customers'
      ? { rec: item.receivedCustomerCount, unc: item.unclaimedCustomerCount }
      : { rec: item.received, unc: item.unclaimed };

  const formatAxisValue = (val: number) =>
    metricBasis === 'customers' ? `${Math.round(val)} ksm` : formatCompactRupiah(val);

  const maxChartVal = useMemo(() => {
    const rawMax = Math.max(
      ...activeSeries.map((p) => {
        const vals =
          metricBasis === 'customers'
            ? { rec: p.receivedCustomerCount, unc: p.unclaimedCustomerCount }
            : { rec: p.received, unc: p.unclaimed };
        return Math.max(vals.rec, vals.unc);
      }),
      0
    );
    if (metricBasis === 'customers') {
      return Math.max(3, Math.ceil(rawMax * 1.15));
    }
    if (rawMax <= 0) return 100_000;
    return rawMax * 1.15;
  }, [activeSeries, metricBasis]);

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
      const vals =
        metricBasis === 'customers'
          ? { rec: item.receivedCustomerCount, unc: item.unclaimedCustomerCount }
          : { rec: item.received, unc: item.unclaimed };
      const x = n === 1 ? padLeft + plotW / 2 : padLeft + (idx / (n - 1)) * plotW;
      const yReceived = baselineY - (vals.rec / maxChartVal) * plotH;
      const yUnclaimed = baselineY - (vals.unc / maxChartVal) * plotH;
      return { x, yReceived, yUnclaimed, item };
    });
  }, [activeSeries, metricBasis, padLeft, plotW, baselineY, plotH, maxChartVal]);

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

  const inspectedIdx =
    hoveredIndex !== null && hoveredIndex < activeSeries.length
      ? hoveredIndex
      : activeSeries.length > 0
        ? activeSeries.length - 1
        : null;
  const inspectedPoint = inspectedIdx !== null ? activeSeries[inspectedIdx] : null;
  const inspectedCoord = inspectedIdx !== null ? pointCoords[inspectedIdx] : null;

  const donutRadius = 24;
  const donutCircumference = 2 * Math.PI * donutRadius;
  const receivedDash = (receivedCustomerPct / 100) * donutCircumference;

  return (
    <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-3.5 sm:p-5 flex flex-col justify-between shadow-2xs">
      <div>
        {/* Header & Mode Switcher */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 mb-3 sm:mb-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 shrink-0">
                <Activity className="w-4 h-4" />
              </div>
              <h2 className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">
                Grafik Pergerakan Cashback
              </h2>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
              Diterima konsumen vs belum cair
              {hasChartDateFilter && (
                <span className="ml-1.5 inline-flex items-center px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 font-semibold text-[10px]">
                  {chartStartDate ? formatShortDateID(chartStartDate) : 'Awal'} –{' '}
                  {chartEndDate ? formatShortDateID(chartEndDate) : 'Akhir'}
                </span>
              )}
            </p>
          </div>

          <div className="grid grid-cols-3 sm:inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 w-full sm:w-auto shrink-0">
            <button
              type="button"
              onClick={() => setChartType('line')}
              className={`px-2 sm:px-2.5 py-1.5 sm:py-1 text-[11px] font-semibold rounded-md flex items-center justify-center gap-1 transition-colors ${
                chartType === 'line'
                  ? 'bg-white text-emerald-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <TrendingUp className="w-3 h-3 shrink-0" />
              <span>Garis</span>
            </button>
            <button
              type="button"
              onClick={() => setChartType('bar')}
              className={`px-2 sm:px-2.5 py-1.5 sm:py-1 text-[11px] font-semibold rounded-md flex items-center justify-center gap-1 transition-colors ${
                chartType === 'bar'
                  ? 'bg-white text-emerald-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BarChart2 className="w-3 h-3 shrink-0" />
              <span>Batang</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setChartType('konsumen');
                setReceiptPage(1);
              }}
              className={`px-2 sm:px-2.5 py-1.5 sm:py-1 text-[11px] font-semibold rounded-md flex items-center justify-center gap-1 transition-colors ${
                chartType === 'konsumen'
                  ? 'bg-white text-emerald-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Users className="w-3 h-3 shrink-0" />
              <span>Konsumen</span>
            </button>
          </div>
        </div>

        {/* Chart Date Range Filter Bar (Compact & Mobile-Friendly) */}
        <div className="mb-3.5 p-2 sm:p-2.5 rounded-xl bg-slate-50/80 border border-slate-200/70 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
              <Calendar className="w-3.5 h-3.5 text-emerald-600 shrink-0 mr-0.5" />
              {(
                [
                  { id: 'all', label: 'Semua' },
                  { id: '7d', label: '7 Hari' },
                  { id: '30d', label: '30 Hari' },
                  { id: 'month', label: 'Bulan Ini' },
                ] as const
              ).map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => applyDatePreset(preset.id)}
                  className={`px-2 py-1 text-[10px] sm:text-[11px] font-semibold rounded-md whitespace-nowrap transition-colors ${
                    activePreset === preset.id
                      ? 'bg-slate-900 text-white shadow-2xs'
                      : 'bg-white text-slate-600 border border-slate-200/80 hover:text-slate-900'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {hasChartDateFilter && (
                <button
                  type="button"
                  onClick={() => applyDatePreset('all')}
                  className="p-1 text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                  title="Reset filter tanggal grafik"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowCustomDates((prev) => !prev)}
                className={`flex items-center gap-1 px-2 py-1 text-[10px] sm:text-[11px] font-semibold rounded-md border transition-colors ${
                  showCustomDates || activePreset === 'custom'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                    : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900'
                }`}
              >
                <SlidersHorizontal className="w-3 h-3" />
                <span>Rentang</span>
              </button>
            </div>
          </div>

          {(showCustomDates || activePreset === 'custom') && (
            <div className="grid grid-cols-2 gap-2 pt-1.5 border-t border-slate-200/70">
              <div>
                <label className="block text-[10px] font-medium text-slate-500 mb-0.5">
                  Dari Tanggal
                </label>
                <input
                  type="date"
                  value={chartStartDate}
                  onChange={(e) => {
                    setChartStartDate(e.target.value);
                    setActivePreset('custom');
                    setHoveredIndex(null);
                    setReceiptPage(1);
                  }}
                  className="w-full px-2 py-1 text-[11px] font-mono bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-emerald-600"
                />
              </div>
              <div>
                <label className="block text-[10px] font-medium text-slate-500 mb-0.5">
                  Sampai Tanggal
                </label>
                <input
                  type="date"
                  value={chartEndDate}
                  onChange={(e) => {
                    setChartEndDate(e.target.value);
                    setActivePreset('custom');
                    setHoveredIndex(null);
                    setReceiptPage(1);
                  }}
                  className="w-full px-2 py-1 text-[11px] font-mono bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-emerald-600"
                />
              </div>
            </div>
          )}
        </div>

        {/* Hero Visual Ratio Strip: Donut Gauge + Two Contrast Comparison Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-12 gap-2 sm:gap-3 mb-3.5 sm:mb-4">
          {/* Circular Ring Gauge (Customer-Count Progress) */}
          <div className="col-span-2 sm:col-span-4 p-2.5 sm:p-3 rounded-xl border border-slate-200/80 bg-gradient-to-br from-slate-50 to-white flex items-center gap-3">
            <div className="relative w-12 h-12 sm:w-14 sm:h-14 shrink-0 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 60 60">
                <circle
                  cx="30"
                  cy="30"
                  r={donutRadius}
                  fill="none"
                  stroke="#fef3c7"
                  strokeWidth="6.5"
                />
                <circle
                  cx="30"
                  cy="30"
                  r={donutRadius}
                  fill="none"
                  stroke="#f59e0b"
                  strokeWidth="6.5"
                  strokeDasharray={`${donutCircumference} ${donutCircumference}`}
                  strokeLinecap="round"
                  opacity={totalCustomerCount > 0 ? 0.85 : 0.2}
                />
                {receivedCustomerPct > 0 && (
                  <circle
                    cx="30"
                    cy="30"
                    r={donutRadius}
                    fill="none"
                    stroke="#059669"
                    strokeWidth="6.5"
                    strokeDasharray={`${receivedDash} ${donutCircumference}`}
                    strokeLinecap="round"
                    className="transition-all duration-500"
                  />
                )}
              </svg>
              <span className="absolute text-[11px] sm:text-xs font-extrabold font-mono text-slate-900">
                {receivedCustomerPct}%
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-bold text-slate-800">Progress Konsumen</div>
              <div className="text-[10px] text-slate-500 mt-0.5 leading-snug">
                <strong className="text-emerald-700">{disbursedCustomerCount}</strong> dari{' '}
                <strong>{totalCustomerCount}</strong> konsumen sudah terima
              </div>
            </div>
          </div>

          {/* Card: Sudah Diterima */}
          <div className="col-span-1 sm:col-span-4 p-2.5 sm:p-3 rounded-xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50/90 to-white flex flex-col justify-between min-w-0">
            <div className="flex items-center justify-between gap-1">
              <span className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-bold text-emerald-900 truncate">
                <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-emerald-600 shrink-0" />
                <span className="truncate">Diterima</span>
              </span>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            </div>
            <div className="mt-1">
              <div className="text-xs sm:text-base font-extrabold text-emerald-700 font-mono tabular-nums truncate">
                {formatRupiah(chartAmounts.disbursedCashback)}
              </div>
              <div className="text-[10px] text-emerald-700/80 font-medium mt-0.5 truncate">
                {receivedCustomerPct}% · {disbursedCustomerCount} konsumen
              </div>
            </div>
          </div>

          {/* Card: Belum Diterima */}
          <div className="col-span-1 sm:col-span-4 p-2.5 sm:p-3 rounded-xl border border-amber-200/80 bg-gradient-to-br from-amber-50/80 to-white flex flex-col justify-between min-w-0">
            <div className="flex items-center justify-between gap-1">
              <span className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-bold text-amber-950 truncate">
                <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-amber-500 shrink-0" />
                <span className="truncate">Belum Cair</span>
              </span>
              <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            </div>
            <div className="mt-1">
              <div className="text-xs sm:text-base font-extrabold text-amber-700 font-mono tabular-nums truncate">
                {formatRupiah(chartAmounts.unclaimedTotal)}
              </div>
              <div className="text-[10px] text-amber-800/80 font-medium mt-0.5 truncate">
                {unclaimedCustomerPct}% · {unclaimedCustomerCount} konsumen
              </div>
            </div>
          </div>
        </div>

        {/* Sub-Toolbar for Line / Bar Charts */}
        {chartType !== 'konsumen' && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 pb-2.5 border-b border-slate-100">
            <div className="flex flex-wrap items-center gap-1.5">
              <div className="inline-flex rounded-md border border-slate-200 bg-slate-50 p-0.5">
                <button
                  type="button"
                  onClick={() => setMetricBasis('customers')}
                  className={`px-2 py-0.5 text-[10px] font-semibold rounded transition-colors ${
                    metricBasis === 'customers'
                      ? 'bg-white text-emerald-700 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Konsumen
                </button>
                <button
                  type="button"
                  onClick={() => setMetricBasis('amount')}
                  className={`px-2 py-0.5 text-[10px] font-semibold rounded transition-colors ${
                    metricBasis === 'amount'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Nominal Rp
                </button>
              </div>

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
                  Akumulasi
                </button>
              </div>
            </div>

            {/* Live Inspected Data Pill */}
            {inspectedPoint && (
              <div className="flex flex-wrap items-center justify-between sm:justify-end gap-x-2 gap-y-0.5 text-[10px] sm:text-[11px] bg-slate-50 border border-slate-200/80 rounded-lg px-2.5 py-1">
                <span className="font-bold text-slate-800">{inspectedPoint.label}:</span>
                <div className="flex items-center gap-1.5 font-mono">
                  <span className="font-semibold text-emerald-700">
                    {inspectedPoint.receivedCustomerCount} ksm ({formatCompactRupiah(inspectedPoint.received)})
                  </span>
                  <span className="text-slate-300">|</span>
                  <span className="font-semibold text-amber-700">
                    {inspectedPoint.unclaimedCustomerCount} belum ({formatCompactRupiah(inspectedPoint.unclaimed)})
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* MAIN CHART AREA */}
        {chartType === 'line' ? (
          activeSeries.length === 0 ? (
            <div className="h-48 sm:h-56 flex items-center justify-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl text-center px-4">
              Tidak ada data transaksi pada rentang tanggal yang dipilih.
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
                      x={padLeft - 6}
                      y={tick.y + 4}
                      textAnchor="end"
                      className="fill-slate-400 text-[11px] sm:text-[10px] font-mono"
                    >
                      {formatAxisValue(tick.value)}
                    </text>
                  </g>
                ))}

                <path d={unclaimedAreaPath} fill="url(#cbUnclaimedGrad)" />
                <path d={receivedAreaPath} fill="url(#cbReceivedGrad)" />

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
                  const showLabel = idx === 0 || idx === pointCoords.length - 1 || idx % step === 0;
                  const slotWidth =
                    pointCoords.length === 1 ? plotW : plotW / Math.max(1, pointCoords.length - 1);

                  return (
                    <g key={coord.item.key}>
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

                      {pointCoords.length === 1 && (
                        <>
                          <text
                            x={coord.x}
                            y={coord.yReceived - 10}
                            textAnchor="middle"
                            className="fill-emerald-700 text-[11px] font-bold font-mono"
                          >
                            Diterima: {formatAxisValue(getSeriesValues(coord.item).rec)}
                          </text>
                          <text
                            x={coord.x}
                            y={coord.yUnclaimed - 10}
                            textAnchor="middle"
                            className="fill-amber-700 text-[11px] font-bold font-mono"
                          >
                            Belum: {formatAxisValue(getSeriesValues(coord.item).unc)}
                          </text>
                        </>
                      )}

                      {showLabel && (
                        <text
                          x={coord.x}
                          y={baselineY + 18}
                          textAnchor="middle"
                          className={`text-[11px] sm:text-[10px] font-medium ${
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
            <div className="h-48 sm:h-56 flex items-center justify-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl text-center px-4">
              Tidak ada data transaksi pada rentang tanggal yang dipilih.
            </div>
          ) : (
            <div className="relative select-none" onMouseLeave={() => setHoveredIndex(null)}>
              <svg
                viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                className="w-full h-auto overflow-visible"
                role="img"
                aria-label="Grafik batang perbandingan cashback diterima dan belum diterima"
              >
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
                      x={padLeft - 6}
                      y={tick.y + 4}
                      textAnchor="end"
                      className="fill-slate-400 text-[11px] sm:text-[10px] font-mono"
                    >
                      {formatAxisValue(tick.value)}
                    </text>
                  </g>
                ))}

                {activeSeries.map((item, idx) => {
                  const n = activeSeries.length;
                  const groupWidth = plotW / n;
                  const centerX = padLeft + idx * groupWidth + groupWidth / 2;
                  const barWidth = Math.min(24, Math.max(8, (groupWidth - 14) / 2));
                  const gap = 4;

                  const vals = getSeriesValues(item);
                  const hRec = Math.max(vals.rec > 0 ? 4 : 0, (vals.rec / maxChartVal) * plotH);
                  const hUnc = Math.max(vals.unc > 0 ? 4 : 0, (vals.unc / maxChartVal) * plotH);
                  const isActive = idx === inspectedIdx;

                  const step = n <= 6 ? 1 : n <= 12 ? 2 : Math.ceil(n / 6);
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

                      <rect
                        x={centerX - barWidth - gap / 2}
                        y={baselineY - hRec}
                        width={barWidth}
                        height={hRec}
                        rx={4}
                        fill={isActive ? '#047857' : '#059669'}
                        className="transition-all duration-200"
                      />

                      <rect
                        x={centerX + gap / 2}
                        y={baselineY - hUnc}
                        width={barWidth}
                        height={hUnc}
                        rx={4}
                        fill={isActive ? '#d97706' : '#f59e0b'}
                        className="transition-all duration-200"
                      />

                      {(n <= 6 || isActive) && vals.rec > 0 && (
                        <text
                          x={centerX - barWidth / 2 - gap / 2}
                          y={baselineY - hRec - 5}
                          textAnchor="middle"
                          className="fill-emerald-700 text-[9px] font-bold font-mono"
                        >
                          {formatAxisValue(vals.rec)}
                        </text>
                      )}
                      {(n <= 6 || isActive) && vals.unc > 0 && (
                        <text
                          x={centerX + barWidth / 2 + gap / 2}
                          y={baselineY - hUnc - 5}
                          textAnchor="middle"
                          className="fill-amber-700 text-[9px] font-bold font-mono"
                        >
                          {formatAxisValue(vals.unc)}
                        </text>
                      )}

                      {showLabel && (
                        <text
                          x={centerX}
                          y={baselineY + 18}
                          textAnchor="middle"
                          className={`text-[11px] sm:text-[10px] font-medium ${
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
          <div className="h-48 flex items-center justify-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl text-center px-4">
            Belum ada data penerima cashback konsumen pada periode ini.
          </div>
        ) : (
          <div className="space-y-2">
            {paginatedCustomerReceipts.map((cust, idx) => {
              const pct =
                cust.totalCashback > 0
                  ? Math.round((cust.disbursedCashback / cust.totalCashback) * 100)
                  : 0;
              const unclaimedCust = Math.max(0, cust.totalCashback - cust.disbursedCashback);
              const unclaimedCustPct = Math.max(0, 100 - pct);

              return (
                <div
                  key={`${cust.customerName}_${idx}`}
                  className="p-2.5 sm:p-3 rounded-xl border border-slate-100 bg-slate-50/60 hover:bg-slate-50 transition-colors space-y-1.5"
                >
                  <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-1 text-xs">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="font-bold text-slate-900 truncate">{cust.customerName}</span>
                      {pct === 100 ? (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800 shrink-0">
                          Lunas
                        </span>
                      ) : cust.disbursedCashback > 0 ? (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800 shrink-0">
                          {pct}%
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-50 border border-amber-200 text-amber-800 shrink-0">
                          Belum
                        </span>
                      )}
                    </div>
                    <div className="font-mono tabular-nums text-[10px] sm:text-[11px] flex items-center gap-1.5 shrink-0">
                      <span className="font-bold text-emerald-700">
                        {formatRupiah(cust.disbursedCashback)}
                      </span>
                      <span className="text-slate-300">/</span>
                      <span className="font-semibold text-amber-700">
                        Sisa {formatRupiah(unclaimedCust)}
                      </span>
                    </div>
                  </div>
                  <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden flex">
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
      <div className="mt-3.5 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-[11px] sm:text-xs text-slate-500">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-1.5 rounded-full bg-emerald-600 inline-block" />
            <span className="font-medium text-slate-700">Sudah Diterima</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-1.5 rounded-full bg-amber-500 inline-block" />
            <span className="font-medium text-slate-700">Belum Diterima</span>
          </div>
        </div>
        <button
          onClick={() => onNavigateToTab('payout_records')}
          className="text-emerald-700 hover:text-emerald-800 font-semibold flex items-center gap-1"
        >
          Rekap Penerimaan <ArrowUpRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
