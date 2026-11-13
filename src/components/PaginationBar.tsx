import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface PaginationBarProps {
  totalItems: number;
  rowsPerPage: number | 'all';
  currentPage: number;
  onChangeRowsPerPage: (rows: number | 'all') => void;
  onChangePage: (page: number) => void;
  itemLabel?: string;
  options?: number[];
}

export const PaginationBar: React.FC<PaginationBarProps> = ({
  totalItems,
  rowsPerPage,
  currentPage,
  onChangeRowsPerPage,
  onChangePage,
  itemLabel = 'data',
  options = [10, 20, 50, 100],
}) => {
  if (totalItems === 0) return null;

  const effectiveRows = rowsPerPage === 'all' ? Math.max(1, totalItems) : rowsPerPage;
  const totalPages = rowsPerPage === 'all' ? 1 : Math.max(1, Math.ceil(totalItems / effectiveRows));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);
  const startItem = rowsPerPage === 'all' ? 1 : (safePage - 1) * effectiveRows + 1;
  const endItem = rowsPerPage === 'all' ? totalItems : Math.min(totalItems, safePage * effectiveRows);

  // Build compact page numbers with ellipsis if many pages
  const getPageNumbers = (): (number | 'ellipsis')[] => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const pages: (number | 'ellipsis')[] = [1];
    if (safePage > 3) pages.push('ellipsis');
    const start = Math.max(2, safePage - 1);
    const end = Math.min(totalPages - 1, safePage + 1);
    for (let p = start; p <= end; p++) {
      pages.push(p);
    }
    if (safePage < totalPages - 2) pages.push('ellipsis');
    pages.push(totalPages);
    return pages;
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 px-3.5 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs print:hidden">
      {/* Left: Rows per page selector + range summary */}
      <div className="flex flex-wrap items-center gap-2.5">
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-medium text-slate-500 whitespace-nowrap">
            Baris per halaman:
          </span>
          <select
            value={rowsPerPage === 'all' ? 'all' : String(rowsPerPage)}
            onChange={(e) => {
              const val = e.target.value;
              onChangeRowsPerPage(val === 'all' ? 'all' : Number(val));
            }}
            aria-label="Jumlah baris per halaman"
            className="px-2 py-1 text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-slate-900 cursor-pointer"
          >
            {options.map((opt) => (
              <option key={opt} value={String(opt)}>
                {opt} baris
              </option>
            ))}
            <option value="all">Semua ({totalItems})</option>
          </select>
        </div>

        <span className="text-[11px] text-slate-500 font-mono tabular-nums">
          Menampilkan <strong className="text-slate-800">{startItem}–{endItem}</strong> dari{' '}
          <strong className="text-slate-800">{totalItems}</strong> {itemLabel}
        </span>
      </div>

      {/* Right: Page navigation */}
      {totalPages > 1 && (
        <div className="flex items-center gap-1 self-end sm:self-auto">
          <button
            type="button"
            onClick={() => onChangePage(Math.max(1, safePage - 1))}
            disabled={safePage <= 1}
            className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            title="Halaman Sebelumnya"
          >
            <ChevronLeft className="w-3.5 h-3.5 text-slate-700" />
          </button>

          {getPageNumbers().map((item, idx) =>
            item === 'ellipsis' ? (
              <span key={`el-${idx}`} className="px-1.5 text-slate-400 font-mono">
                …
              </span>
            ) : (
              <button
                key={item}
                type="button"
                onClick={() => onChangePage(item)}
                className={`min-w-[28px] px-2 py-1 rounded-lg font-bold text-[11px] font-mono transition-colors ${
                  safePage === item
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                {item}
              </button>
            )
          )}

          <button
            type="button"
            onClick={() => onChangePage(Math.min(totalPages, safePage + 1))}
            disabled={safePage >= totalPages}
            className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            title="Halaman Berikutnya"
          >
            <ChevronRight className="w-3.5 h-3.5 text-slate-700" />
          </button>
        </div>
      )}
    </div>
  );
};
