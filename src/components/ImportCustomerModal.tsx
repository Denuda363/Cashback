import React, { useState, useRef } from 'react';
import { 
  Users, 
  Upload, 
  Download, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  FileCheck, 
  Loader2,
  Phone,
  Building2,
  Wallet,
  MapPin
} from 'lucide-react';
import { CustomerMaster } from '../types/cashback';
import { exportCustomerImportTemplate, parseCustomersFromExcel, ParsedImportCustomer } from '../utils/excelExport';

interface ImportCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingCustomers: CustomerMaster[];
  onImportSuccess: (newCustomers: CustomerMaster[]) => void;
}

export const ImportCustomerModal: React.FC<ImportCustomerModalProps> = ({
  isOpen,
  onClose,
  existingCustomers,
  onImportSuccess,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [parsedRows, setParsedRows] = useState<ParsedImportCustomer[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleDownloadTemplate = async () => {
    try {
      await exportCustomerImportTemplate();
    } catch (err) {
      console.error('Download customer template error:', err);
    }
  };

  const handleFileProcess = async (uploadedFile: File) => {
    setParseError(null);
    setFile(uploadedFile);
    setIsParsing(true);

    try {
      const results = await parseCustomersFromExcel(uploadedFile);
      if (results.length === 0) {
        setParseError('File Excel tidak memiliki baris data konsumen yang terbaca.');
      } else {
        setParsedRows(results);
      }
    } catch (err: any) {
      console.error('Parse customer error:', err);
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

  // Check duplicates with existing customers
  const existingPhoneSet = new Set(existingCustomers.map((c) => c.phone.trim().replace(/[\s-]/g, '')));
  const existingNameSet = new Set(existingCustomers.map((c) => c.name.toLowerCase().trim()));

  const duplicateCount = validRows.filter(
    (r) => existingPhoneSet.has(r.phone) || existingNameSet.has(r.name.toLowerCase())
  ).length;

  const handleConfirmImport = () => {
    if (validRows.length === 0) return;

    const customersToAdd: CustomerMaster[] = [];
    const usedPhones = new Set<string>();
    let nextIndex = existingCustomers.length + 1;

    for (let i = 0; i < validRows.length; i++) {
      const r = validRows[i];
      const phoneKey = r.phone.trim();
      
      // If code is not provided or duplicated, generate sequentially
      const code = r.customerCode && r.customerCode.trim() 
        ? r.customerCode.trim() 
        : `CUST-${String(nextIndex).padStart(3, '0')}`;

      nextIndex++;

      const newCust: CustomerMaster = {
        id: `cust-${Date.now()}-${i}`,
        customerCode: code,
        name: r.name,
        phone: r.phone,
        email: r.email,
        city: r.city,
        address: r.address,
        preferredPayoutMethod: r.preferredPayoutMethod,
        bankName: r.bankName,
        bankAccountNumber: r.bankAccountNumber,
        bankAccountHolder: r.bankAccountHolder || r.name,
        eWalletType: r.eWalletType,
        eWalletNumber: r.eWalletNumber,
        notes: r.notes,
        joinedDate: new Date().toISOString().split('T')[0],
        isActive: true,
      };

      customersToAdd.push(newCust);
    }

    onImportSuccess(customersToAdd);
    onClose();
  };

  const handleReset = () => {
    setFile(null);
    setParsedRows([]);
    setParseError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2.5 sm:p-4">
      <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full max-h-[94vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Modal Header */}
        <div className="px-4 py-3 sm:px-6 sm:py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2 sm:gap-2.5">
            <div className="p-1.5 sm:p-2 bg-emerald-600 text-white rounded-lg shadow-xs">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xs sm:text-sm font-bold text-slate-900">
                Import Master Konsumen dari File Excel (.xlsx)
              </h2>
              <p className="text-[10px] sm:text-[11px] text-slate-500">
                Unggah daftar konsumen toko lengkap dengan data rekening bank & kontak
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
          <div className="p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <Download className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-slate-900 text-xs">Belum punya template Excel Master Konsumen?</h4>
                <p className="text-[11px] text-slate-600 mt-0.5">
                  Unduh template resmi dengan susunan kolom: Kode, Nama, No. HP/WA, Kota, Alamat, Bank, Rekening, dan E-Wallet.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-bold text-emerald-800 bg-white hover:bg-emerald-100/70 border border-emerald-300 rounded-lg shadow-2xs transition-colors shrink-0"
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
                Pilih atau seret file Excel Master Konsumen ke sini
              </h3>
              <p className="text-[11px] text-slate-500 mt-1">
                Mendukung format file .xlsx, .xls, atau .csv
              </p>
            </div>
          ) : (
            <div className="p-3.5 rounded-xl border border-slate-200 bg-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <FileCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                <div>
                  <div className="font-bold text-slate-900 truncate max-w-xs">{file.name}</div>
                  <div className="text-[10px] text-slate-500 font-mono">
                    {(file.size / 1024).toFixed(1)} KB · {isParsing ? 'Membaca data...' : `${parsedRows.length} baris konsumen terdeteksi`}
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
              <p className="text-xs font-semibold">Sedang membaca dan memvalidasi data konsumen...</p>
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
                  <span className="text-[10px] text-slate-500 block">Total Baris File</span>
                  <span className="text-sm font-bold font-mono text-slate-900">{parsedRows.length}</span>
                </div>
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <span className="text-[10px] text-emerald-700 block">Valid Siap Impor</span>
                  <span className="text-sm font-bold font-mono text-emerald-800">{validRows.length}</span>
                </div>
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                  <span className="text-[10px] text-slate-500 block">Sudah Terdaftar</span>
                  <span className="text-sm font-bold font-mono text-slate-700">{duplicateCount}</span>
                </div>
                <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-lg">
                  <span className="text-[10px] text-blue-700 block">Konsumen Baru</span>
                  <span className="text-sm font-bold font-mono text-blue-800">{validRows.length - duplicateCount}</span>
                </div>
              </div>

              {/* Preview Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="px-3 py-2 bg-slate-100/70 border-b border-slate-200 font-semibold text-[11px] text-slate-700 flex items-center justify-between">
                  <span>Pratinjau Data Konsumen ({validRows.length} Valid)</span>
                  <span className="text-[10px] text-slate-500">Otomatis sync ke Firebase</span>
                </div>
                <div className="max-h-48 overflow-y-auto">
                  <table className="w-full text-left border-collapse text-[11px]">
                    <thead className="bg-slate-50 sticky top-0 border-b border-slate-200 text-slate-500">
                      <tr>
                        <th className="py-1.5 px-3">Kode</th>
                        <th className="py-1.5 px-3">Nama</th>
                        <th className="py-1.5 px-3">No. HP / WA</th>
                        <th className="py-1.5 px-3">Kota</th>
                        <th className="py-1.5 px-3">Rekening Bank</th>
                        <th className="py-1.5 px-2 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {parsedRows.slice(0, 15).map((row, idx) => {
                        const isDuplicate = existingPhoneSet.has(row.phone) || existingNameSet.has(row.name.toLowerCase());
                        return (
                          <tr key={idx} className={row.isValid ? (isDuplicate ? 'bg-amber-50/40 hover:bg-amber-50/70' : 'hover:bg-slate-50') : 'bg-red-50/50'}>
                            <td className="py-1.5 px-3 font-mono font-semibold text-slate-700">{row.customerCode || 'Auto'}</td>
                            <td className="py-1.5 px-3 font-medium text-slate-900">{row.name}</td>
                            <td className="py-1.5 px-3 font-mono text-slate-600">{row.phone}</td>
                            <td className="py-1.5 px-3 text-slate-600">{row.city || '-'}</td>
                            <td className="py-1.5 px-3 text-slate-600 font-mono text-[10px]">
                              {row.bankName ? `${row.bankName} ${row.bankAccountNumber || ''}` : row.eWalletType ? `${row.eWalletType} ${row.eWalletNumber || ''}` : '-'}
                            </td>
                            <td className="py-1.5 px-2 text-center">
                              {row.isValid ? (
                                <span className="text-[10px] text-emerald-600 font-semibold" title="Valid">✓</span>
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
                {parsedRows.length > 15 && (
                  <div className="p-2 text-center text-[10px] text-slate-400 bg-slate-50 border-t border-slate-100">
                    Menampilkan 15 dari total {parsedRows.length} baris...
                  </div>
                )}
              </div>
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
            <span>Simpan {validRows.length} Konsumen ke Database</span>
          </button>
        </div>

      </div>
    </div>
  );
};
