import React, { useState } from 'react';
import { Calendar, ChevronDown, ChevronUp, SlidersHorizontal, X } from 'lucide-react';

interface DateRangeFilterBarProps {
  startDate: string;
  endDate: string;
  onChangeStartDate: (date: string) => void;
  onChangeEndDate: (date: string) => void;
  onResetDates: () => void;
  totalFilteredCount: number;
  totalAllCount: number;
}

export const DateRangeFilterBar: React.FC<DateRangeFilterBarProps> = ({
  startDate,
  endDate,
  onChangeStartDate,
  onChangeEndDate,
  onResetDates,
  totalFilteredCount,
  totalAllCount,
}) => {
  const [isMobileExpanded, setIsMobileExpanded] = useState(false);
  const hasActiveFilter = Boolean(startDate || endDate);

  const applyPreset = (preset: 'all' | 'this_month' | 'year_2026') => {
    if (preset === 'all') {
      onResetDates();
      return;
    }

    if (preset === 'year_2026') {
      onChangeStartDate('2026-01-01');
      onChangeEndDate('2026-12-31');
      return;
    }

    if (preset === 'this_month') {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const lastDay = new Date(year, now.getMonth() + 1, 0).getDate();
      onChangeStartDate(`${year}-${month}-01`);
      onChangeEndDate(`${year}-${month}-${String(lastDay).padStart(2, '0')}`);
    }
  };

  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
        return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
      }
    } catch {
      // fallback
    }
    return dateStr;
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs p-2.5 sm:p-3.5 mb-3.5 sm:mb-6 transition-all">
      {/* Mobile Minimalist Header + Quick Scrollable Chips */}
      <div className="flex sm:hidden items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5 min-w-0">
          <Calendar className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <button
            type="button"
            onClick={() => applyPreset('all')}
            className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg whitespace-nowrap shrink-0 transition-all ${
              !hasActiveFilter
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600'
            }`}
          >
            Semua
          </button>
          <button
            type="button"
            onClick={() => applyPreset('this_month')}
            className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-slate-100 text-slate-600 whitespace-nowrap shrink-0"
          >
            Bulan Ini
          </button>
          <button
            type="button"
            onClick={() => applyPreset('year_2026')}
            className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg whitespace-nowrap shrink-0 transition-all ${
              startDate === '2026-01-01' && endDate === '2026-12-31'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600'
            }`}
          >
            2026
          </button>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {hasActiveFilter && (
            <button
              type="button"
              onClick={onResetDates}
              className="p-1.5 text-rose-600 bg-rose-50 border border-rose-200 rounded-lg"
              aria-label="Reset filter tanggal"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsMobileExpanded((prev) => !prev)}
            className={`flex items-center gap-1 px-2 py-1 text-[11px] font-semibold rounded-lg border transition-colors ${
              isMobileExpanded || hasActiveFilter
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                : 'bg-slate-50 border-slate-200 text-slate-700'
            }`}
          >
            <SlidersHorizontal className="w-3 h-3" />
            <span>Tgl</span>
            {isMobileExpanded ? (
              <ChevronUp className="w-3 h-3" />
            ) : (
              <ChevronDown className="w-3 h-3" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Expandable Date Pickers */}
      {isMobileExpanded && (
        <div className="grid sm:hidden grid-cols-2 gap-2 mt-2.5 pt-2.5 border-t border-slate-100">
          <div>
            <label className="block text-[10px] font-medium text-slate-500 mb-0.5">Dari:</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => onChangeStartDate(e.target.value)}
              className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-mono text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-slate-900"
            />
          </div>
          <div>
            <label className="block text-[10px] font-medium text-slate-500 mb-0.5">Sampai:</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => onChangeEndDate(e.target.value)}
              className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-mono text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-slate-900"
            />
          </div>
        </div>
      )}

      {/* Desktop & Tablet Full Bar */}
      <div className="hidden sm:flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-slate-800 font-bold text-xs shrink-0">
            <Calendar className="w-4 h-4 text-emerald-600" />
            <span>Filter Periode Tanggal:</span>
          </div>

          <div className="flex flex-wrap items-center gap-1">
            <button
              type="button"
              onClick={() => applyPreset('all')}
              className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-all ${
                !hasActiveFilter
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200'
              }`}
            >
              Semua Waktu
            </button>
            <button
              type="button"
              onClick={() => applyPreset('year_2026')}
              className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-all ${
                startDate === '2026-01-01' && endDate === '2026-12-31'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200'
              }`}
            >
              Tahun 2026 Penuh
            </button>
            <button
              type="button"
              onClick={() => applyPreset('this_month')}
              className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200 transition-all"
            >
              Bulan Ini
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-700">
            <span className="text-[11px] text-slate-500">Dari:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => onChangeStartDate(e.target.value)}
              className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-slate-900"
            />
          </div>

          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-700">
            <span className="text-[11px] text-slate-500">Sampai:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => onChangeEndDate(e.target.value)}
              className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-slate-900"
            />
          </div>

          {hasActiveFilter && (
            <button
              type="button"
              onClick={onResetDates}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors"
              title="Hapus filter tanggal"
            >
              <X className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Info Strip when active */}
      {hasActiveFilter && (
        <div className="mt-2 pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-1 text-[10px] sm:text-[11px] text-slate-500">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
            <span className="truncate">
              Periode:{' '}
              <strong className="text-slate-800 font-semibold">
                {startDate ? formatDateDisplay(startDate) : 'Awal'}
              </strong>{' '}
              s/d{' '}
              <strong className="text-slate-800 font-semibold">
                {endDate ? formatDateDisplay(endDate) : 'Akhir'}
              </strong>
            </span>
          </div>
          <span className="font-mono tabular-nums text-slate-700 font-semibold shrink-0">
            {totalFilteredCount}/{totalAllCount} faktur
          </span>
        </div>
      )}
    </div>
  );
};
