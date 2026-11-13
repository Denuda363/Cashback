import React, { useState, useRef, useMemo } from 'react';
import { 
  FileSpreadsheet, 
  Upload, 
  Download, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  FileCheck, 
  Loader2
} from 'lucide-react';
import { CashbackSettings, CustomerMaster, Invoice } from '../types/cashback';
import { calculateCashback, formatRupiah } from '../utils/cashbackCalculator';
import { exportInvoiceImportTemplate, parseInvoicesFromExcel, ParsedImportInvoice } from '../utils/excelExport';
import { PaginationBar } from './PaginationBar';

interface ImportExcelModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: CashbackSettings;
  masterCustomers: CustomerMaster[];
  onImportSuccess: (importedInvoices: Invoice[], newCustomers: CustomerMaster[]) => void;
}

export const ImportExcelModal: React.FC<ImportExcelModalProps> = ({
  isOpen,
  onClose,
  settings,
  masterCustomers,
  onImportSuccess,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [parsedRows, setParsedRows] = useState<ParsedImportInvoice[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [rowsPerPage, setRowsPerPage] = useState<number | 'all'>(15);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const effectiveRowsPerPage = rowsPerPage === 'all' ? Math.max(1, parsedRows.length) : rowsPerPage;
  const totalPages = rowsPerPage === 'all' ? 1 : Math.max(1, Math.ceil(parsedRows.length / effectiveRowsPerPage));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedRows = useMemo(() => {
    if (rowsPerPage === 'all') return parsedRows;
    const start = (safeCurrentPage - 1) * effectiveRowsPerPage;
    return parsedRows.slice(start, start + effectiveRowsPerPage);
  }, [parsedRows, rowsPerPage, safeCurrentPage, effectiveRowsPerPage]);

  if (!isOpen) return null;

  const handleDownloadTemplate = async () => {
    try {
      await exportInvoiceImportTemplate();
    } catch (err) {
      console.error('Download template error:', err);
    }
  };

  const handleFileProcess = async (uploadedFile: File) => {
    setParseError(null);
    setFile(uploadedFile);
    setIsParsing(true);
    setCurrentPage(1);

    try {
      const results = await parseInvoicesFromExcel(uploadedFile);
      if (results.length === 0) {
        setParseError('File Excel tidak memiliki baris data faktur yang terbaca.');
      } else {
        setParsedRows(results);
      }
    } catch (err: any) {
      console.error('Parse error:', err);
      setParseError(err?.message || 'Gagal membaca file Excel. Pastikan format file .xlsx valid.');
      setParsedRows([]);
    } finally {
      setIsParsing(false);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      handleFileProcess(selected);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      handleFileProcess(droppedFile);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const validRows = parsedRows.filter((r) => r.isValid);
  const totalSpend = validRows.reduce((sum, r) => sum + r.purchaseAmount, 0);

  // Calculate live preview of cashback with active settings
  const totalCashback = validRows.reduce((sum, r) => {
    const calc = calculateCashback(r.purchaseAmount, settings);
    return sum + calc.cashbackAmount;
  }, 0);

  const handleConfirmImport = () => {
    if (validRows.length === 0) return;

    const newCustomersToAdd: CustomerMaster[] = [];
    const customerMap = new Map<string, CustomerMaster>();
    masterCustomers.forEach((c) => {
      customerMap.set(c.phone.trim(), c);
      customerMap.set(c.name.toLowerCase().trim(), c);
    });

    const newInvoices: Invoice[] = validRows.map((r, index) => {
      const calc = calculateCashback(r.purchaseAmount, settings);

      // Check if customer already exists, if not, prepare to add to master data!
      const phoneKey = r.customerPhone.trim();
      const nameKey = r.customerName.toLowerCase().trim();
      if (!customerMap.has(phoneKey) && !customerMap.has(nameKey)) {
        const nextCode = `CUST-${String(masterCustomers.length + newCustomersToAdd.length + 1).padStart(3, '0')}`;
        const newCust: CustomerMaster = {
          id: `cust-${Date.now()}-${index}`,
          customerCode: nextCode,
          name: r.customerName,
          phone: r.customerPhone,
          preferredPayoutMethod: 'tunai',
          joinedDate: r.date,
          isActive: true,
        };
        customerMap.set(phoneKey, newCust);
        customerMap.set(nameKey, newCust);
        newCustomersToAdd.push(newCust);
      }

      return {
        id: `inv-${Date.now()}-${index}`,
        invoiceNumber: r.invoiceNumber,
        date: r.date,
        customerName: r.customerName,
        customerPhone: r.customerPhone,
        category: 'Umum',
        itemsDescription: r.itemsDescription,
        purchaseAmount: r.purchaseAmount,
        cashbackPercentage: calc.effectivePercentage,
        cashbackAmount: calc.cashbackAmount,
        claimStatus: r.claimStatus,
        payoutMethod: 'tunai',
        disbursedDate: r.claimStatus === 'disbursed' ? r.date : undefined,
        getParcel: r.purchaseAmount >= (settings.minSpendForParcel || 5000000),
        createdAt: new Date().toISOString(),
      };
    });

    onImportSuccess(newInvoices, newCustomersToAdd);
    onClose();
  };

  const handleReset = () => {
    setFile(null);
    setParsedRows([]);
    setParseError(null);
    setCurrentPage(1);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2.5 sm:p-4">
      <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full max-h-[94vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Modal Header */}
        <div className="px-4 py-3 sm:px-6 sm:py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2 sm:gap-2.5">
            <div className="p-1.5 sm:p-2 bg-emerald-600 text-white rounded-lg shadow-xs">
              <Upload className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xs sm:text-sm font-bold text-slate-900">
                Import Faktur dari File Excel (.xlsx)
              </h2>
              <p className="text-[10px] sm:text-[11px] text-slate-500">
                Unggah file Excel data pembelian konsumen untuk rekap & cashback otomatis
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-3.5 sm:p-6 overflow-y-auto space-y-4 flex-1 text-xs">

          {/* Template Download Banner */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <FileSpreadsheet className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-slate-900 text-xs">Belum punya template Excel?</h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Unduh template resmi dengan susunan kolom: No. Faktur, Tanggal, Nama, No. HP, dan Belanja.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-100/70 hover:bg-emerald-100 rounded-lg transition-colors shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Unduh Template</span>
            </button>
          </div>

          {/* Upload Area */}
          {!file ? (
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              className={`p-6 sm:p-8 rounded-xl border-2 border-dashed text-center cursor-pointer transition-colors ${
                isDragOver
                  ? 'border-emerald-500 bg-emerald-50/50'
                  : 'border-slate-300 hover:border-emerald-500 hover:bg-slate-50/60'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={handleFileInputChange}
                className="hidden"
              />
              <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center mb-2.5">
                <Upload className="w-6 h-6" />
              </div>
              <h3 className="text-xs sm:text-sm font-bold text-slate-800">
                Pilih atau seret file Excel ke sini
              </h3>
              <p className="text-[11px] text-slate-500 mt-1">
                Mendukung format .xlsx, .xls, atau .csv
              </p>
            </div>
          ) : (
            <div className="p-3.5 rounded-xl border border-slate-200 bg-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <FileCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                <div>
                  <div className="font-bold text-slate-900 truncate max-w-xs">{file.name}</div>
                  <div className="text-[10px] text-slate-500 font-mono">
                    {(file.size / 1024).toFixed(1)} KB · {isParsing ? 'Membaca data...' : `${parsedRows.length} baris terdeteksi`}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={handleReset}
                className="text-xs text-slate-500 hover:text-red-700 font-semibold px-2 py-1"
              >
                Ganti File
              </button>
            </div>
          )}

          {/* Loading Indicator */}
          {isParsing && (
            <div className="p-6 text-center text-slate-500 space-y-2">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-emerald-600" />
              <p className="text-xs font-semibold">Sedang membaca dan mengkalkulasi cashback faktur...</p>
            </div>
          )}

          {/* Parse Error Alert */}
          {parseError && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="text-xs">{parseError}</span>
            </div>
          )}

          {/* Parsed Summary & Preview */}
          {parsedRows.length > 0 && !isParsing && (
            <div className="space-y-3">
              {/* Stat Chips */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                  <span className="text-[10px] text-slate-500 block">Total Baris</span>
                  <span className="text-sm font-bold font-mono text-slate-900">{parsedRows.length}</span>
                </div>
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <span className="text-[10px] text-emerald-700 block">Valid Siap Impor</span>
                  <span className="text-sm font-bold font-mono text-emerald-800">{validRows.length}</span>
                </div>
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                  <span className="text-[10px] text-slate-500 block">Total Omset</span>
                  <span className="text-sm font-bold font-mono text-slate-900 truncate">{formatRupiah(totalSpend)}</span>
                </div>
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <span className="text-[10px] text-emerald-700 block">Total Cashback ({settings.flatPercentage}%)</span>
                  <span className="text-sm font-bold font-mono text-emerald-700 truncate">{formatRupiah(totalCashback)}</span>
                </div>
              </div>

              {/* Preview Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="px-3 py-2 bg-slate-100/70 border-b border-slate-200 font-semibold text-[11px] text-slate-700 flex items-center justify-between">
                  <span>Pratinjau Data Faktur ({validRows.length} Valid)</span>
                  <span className="text-[10px] text-slate-500">Kalkulasi: {settings.flatPercentage}% Cashback</span>
                </div>
                <div className="max-h-48 overflow-y-auto">
                  <table className="w-full text-left border-collapse text-[11px]">
                    <thead className="bg-slate-50 sticky top-0 border-b border-slate-200 text-slate-500">
                      <tr>
                        <th className="py-1.5 px-3">Faktur</th>
                        <th className="py-1.5 px-3">Tanggal</th>
                        <th className="py-1.5 px-3">Konsumen</th>
                        <th className="py-1.5 px-3 text-right">Belanja</th>
                        <th className="py-1.5 px-3 text-right">Cashback</th>
                        <th className="py-1.5 px-2 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {paginatedRows.map((row, idx) => {
                        const calc = calculateCashback(row.purchaseAmount, settings);
                        return (
                          <tr key={`${row.invoiceNumber}_${idx}`} className={row.isValid ? 'hover:bg-slate-50' : 'bg-red-50/50'}>
                            <td className="py-1.5 px-3 font-mono font-semibold text-slate-800">{row.invoiceNumber}</td>
                            <td className="py-1.5 px-3 font-mono text-slate-600">{row.date}</td>
                            <td className="py-1.5 px-3 font-medium text-slate-900">{row.customerName}</td>
                            <td className="py-1.5 px-3 text-right font-mono text-slate-800">{formatRupiah(row.purchaseAmount)}</td>
                            <td className="py-1.5 px-3 text-right font-mono font-bold text-emerald-700">{formatRupiah(calc.cashbackAmount)}</td>
                            <td className="py-1.5 px-2 text-center">
                              {row.isValid ? (
                                <span className="text-[10px] text-emerald-600 font-semibold">✓</span>
                              ) : (
                                <span className="text-[10px] text-red-600" title={row.validationError}>✕</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
              <PaginationBar
                totalItems={parsedRows.length}
                rowsPerPage={rowsPerPage}
                currentPage={safeCurrentPage}
                onChangeRowsPerPage={(val) => {
                  setRowsPerPage(val);
                  setCurrentPage(1);
                }}
                onChangePage={setCurrentPage}
                itemLabel="baris faktur"
                options={[10, 15, 30, 50]}
              />
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-4 py-3 sm:px-6 sm:py-4 border-t border-slate-200 flex items-center justify-between bg-slate-50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors"
          >
            Batal
          </button>
          <button
            type="button"
            disabled={validRows.length === 0}
            onClick={handleConfirmImport}
            className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg shadow-sm transition-all"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Simpan {validRows.length} Faktur ke Database</span>
          </button>
        </div>

      </div>
    </div>
  );
};
