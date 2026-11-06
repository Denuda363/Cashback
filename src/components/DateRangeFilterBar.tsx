import React from 'react';
import { Calendar, X, Filter, Sparkles } from 'lucide-react';

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
  const hasActiveFilter = Boolean(startDate || endDate);

  const applyPreset = (preset: 'all' | 'this_month' | 'year_2026' | 'q1_2026') => {
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
      return;
    }

    if (preset === 'q1_2026') {
      onChangeStartDate('2026-01-01');
      onChangeEndDate('2026-03-31');
      return;
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
    <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs p-3 sm:p-3.5 mb-4 sm:mb-6 transition-all">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        
        {/* Left: Filter Title & Quick Presets */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-slate-800 font-bold text-xs shrink-0">
            <Calendar className="w-4 h-4 text-emerald-600" />
            <span>Filter Periode Tanggal:</span>
          </div>

          {/* Quick Presets */}
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

        {/* Right: Date Inputs & Active Indicator */}
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
        <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>
              Menampilkan data periode: <strong className="text-slate-800 font-semibold">{startDate ? formatDateDisplay(startDate) : 'Awal'}</strong> s/d <strong className="text-slate-800 font-semibold">{endDate ? formatDateDisplay(endDate) : 'Akhir'}</strong>
            </span>
          </div>
          <span className="font-mono tabular-nums text-slate-700 font-semibold">
            {totalFilteredCount} dari {totalAllCount} faktur
          </span>
        </div>
      )}
    </div>
  );
};
