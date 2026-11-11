import React, { useState } from 'react';
import { 
  X, 
  FileSpreadsheet, 
  Download, 
  Check, 
  Layers, 
  CheckCircle2, 
  Gift, 
  PenTool, 
  ArrowRight,
  Sparkles,
  Percent
} from 'lucide-react';
import { CashbackSettings, CustomerMaster, CustomerSummary, Invoice } from '../types/cashback';
import { exportCashbackToExcel, exportTandaTerimaFormat } from '../utils/excelExport';
import { formatRupiah } from '../utils/cashbackCalculator';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoices: Invoice[];
  customerSummaries: CustomerSummary[];
  settings: CashbackSettings;
  masterCustomers?: CustomerMaster[];
  onSaveSettings?: (newSettings: CashbackSettings) => void;
  onSuccessToast: (msg: string) => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  invoices,
  customerSummaries,
  settings,
  masterCustomers,
  onSaveSettings,
  onSuccessToast,
}) => {
  const [exportType, setExportType] = useState<'receipt_image' | 'comprehensive'>('receipt_image');
  const [activePercentage, setActivePercentage] = useState<number>(settings.flatPercentage || 2);
  const [parcelThreshold, setParcelThreshold] = useState<number>(settings.minSpendForParcel || 5000000);
  const [isExporting, setIsExporting] = useState(false);

  if (!isOpen) return null;

  const currentSettings: CashbackSettings = {
    ...settings,
    mode: 'flat',
    flatPercentage: activePercentage,
    minSpendForParcel: parcelThreshold,
  };

  const handleDownload = async () => {
    setIsExporting(true);
    try {
      if (onSaveSettings && (settings.minSpendForParcel !== parcelThreshold || settings.flatPercentage !== activePercentage)) {
        onSaveSettings(currentSettings);
      }

      if (exportType === 'receipt_image') {
        await exportTandaTerimaFormat(customerSummaries, currentSettings);
        onSuccessToast(`File Excel Format Tanda Terima & Parcel (${activePercentage}% Cashback) berhasil diunduh!`);
      } else {
        await exportCashbackToExcel(invoices, customerSummaries, currentSettings, 'Rekap_Cashback_Konsumen', masterCustomers);
        onSuccessToast(`File Excel Komprehensif (${activePercentage}% Cashback) berhasil diunduh!`);
      }
      onClose();
    } catch (err) {
      console.error('Export error:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const samplePreview = customerSummaries.slice(0, 5);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2.5 sm:p-4">
      <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full max-h-[94vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-4 py-3 sm:px-6 sm:py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2 sm:gap-2.5">
            <div className="p-1.5 sm:p-2 bg-emerald-600 text-white rounded-lg shadow-xs">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xs sm:text-sm font-bold text-slate-900">
                Export Rekap Cashback ke Excel
              </h2>
              <p className="text-[10px] sm:text-[11px] text-slate-500">
                Pilih format lembar kerja Excel yang diinginkan
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

        {/* Content */}
        <form onSubmit={(e) => { e.preventDefault(); handleDownload(); }} className="p-3.5 sm:p-6 overflow-y-auto space-y-4 sm:space-y-5 flex-1 text-xs">
          
          {/* Format Options */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            
            {/* Format 1: Sesuai Gambar */}
            <button
              type="button"
              onClick={() => setExportType('receipt_image')}
              className={`p-4 rounded-xl border text-left transition-all relative ${
                exportType === 'receipt_image'
                  ? 'border-emerald-600 bg-emerald-50/40 shadow-xs ring-1 ring-emerald-600'
                  : 'border-slate-200 bg-white hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-emerald-600" /> Sesuai Format Gambar
                </span>
                {exportType === 'receipt_image' && (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                )}
              </div>
              <h3 className="font-bold text-slate-900 text-xs">
                Format Rekap Tanda Terima & Parcel
              </h3>
              <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                Tabel praktis dengan kolom <strong>No</strong>, <strong>Nama Konsumen</strong>, <strong>Total Pembelanjaan</strong>, <strong>Carshback</strong>, <strong>Parcel (Ya/Tidak)</strong>, dan kolom <strong>Tanda tangan</strong> (1 & 2 selang-seling).
              </p>
            </button>

            {/* Format 2: Komprehensif Multi-Sheet */}
            <button
              type="button"
              onClick={() => setExportType('comprehensive')}
              className={`p-4 rounded-xl border text-left transition-all relative ${
                exportType === 'comprehensive'
                  ? 'border-emerald-600 bg-emerald-50/40 shadow-xs ring-1 ring-emerald-600'
                  : 'border-slate-200 bg-white hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Layers className="w-3 h-3 text-slate-500" /> Multi-Sheet Lengkap
                </span>
                {exportType === 'comprehensive' && (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                )}
              </div>
              <h3 className="font-bold text-slate-900 text-xs">
                Format Buku Kerja Lengkap (5 Sheet)
              </h3>
              <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                Termasuk Sheet Format Tanda Terima, Rekap Faktur Detail, Rekap Konsumen, Top 10 Peringkat, Master Konsumen, dan Kebijakan.
              </p>
            </button>

          </div>

          {/* Dual Settings: Persentase Cashback & Batas Minimal Parcel */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Setting 1: Persentase Cashback Global */}
            <div className="p-3.5 bg-emerald-50/60 rounded-xl border border-emerald-200 flex flex-col justify-between gap-2.5">
              <div className="flex items-center gap-2">
                <Percent className="w-4 h-4 text-emerald-600 shrink-0" />
                <div>
                  <span className="font-bold text-slate-900 text-xs block">
                    Persentase Cashback Export
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Jika diatur 2% semua 2%, jika 3% semua jadi 3%
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                {[1, 2, 3, 4, 5, 10].map((rate) => (
                  <button
                    key={rate}
                    type="button"
                    onClick={() => setActivePercentage(rate)}
                    className={`px-2.5 py-1 text-xs font-bold rounded-md border transition-all ${
                      activePercentage === rate
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs scale-105'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    {rate}%
                  </button>
                ))}
                <div className="relative w-20 ml-auto">
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    max="100"
                    value={activePercentage}
                    onChange={(e) => setActivePercentage(parseFloat(e.target.value) || 0)}
                    className="w-full pl-2 pr-5 py-0.5 bg-white border border-slate-300 rounded font-mono font-bold text-xs"
                  />
                  <span className="absolute right-1.5 top-0.5 text-xs font-bold text-slate-400">%</span>
                </div>
              </div>
            </div>

            {/* Setting 2: Batas Minimal Belanja Dapat Parcel */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex flex-col justify-between gap-2.5">
              <div className="flex items-center gap-2">
                <Gift className="w-4 h-4 text-amber-600 shrink-0" />
                <div>
                  <span className="font-bold text-slate-900 text-xs block">
                    Batas Minimal Belanja Hadiah (Parcel)
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Nilai belanja di atas batas ini otomatis berhak Parcel ("Ya")
                  </span>
                </div>
              </div>

              <div className="relative w-full">
                <span className="absolute left-2.5 top-1 font-bold font-mono text-slate-500 text-xs">Rp</span>
                <input
                  type="number"
                  step="500000"
                  value={parcelThreshold}
                  onChange={(e) => setParcelThreshold(Number(e.target.value) || 0)}
                  className="w-full pl-8 pr-2 py-1 bg-white border border-slate-300 rounded font-mono font-bold text-xs"
                />
              </div>
            </div>
          </div>

          {/* Excel Formatting & Alignment Rules Information */}
          <div className="p-3.5 bg-emerald-50/60 rounded-xl border border-emerald-200 space-y-2">
            <div className="flex items-center gap-2 text-emerald-900 font-bold text-xs">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              <span>Standar Format Tabel & Formula Excel Aktif:</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] text-slate-700">
              <div className="bg-white p-2 rounded-lg border border-emerald-100">
                <span className="font-bold text-slate-900 block">Rata Kiri (Teks & TTD)</span>
                <span className="text-slate-500">Nama Konsumen, Catatan, Nomor Kolom Tanda Tangan</span>
              </div>
              <div className="bg-white p-2 rounded-lg border border-emerald-100">
                <span className="font-bold text-slate-900 block">Rata Tengah (Status)</span>
                <span className="text-slate-500">No Urut, Tanggal, No. Faktur, Parcel (Ya/Tidak)</span>
              </div>
              <div className="bg-white p-2 rounded-lg border border-emerald-100">
                <span className="font-bold text-slate-900 block">Rata Kanan & Rumus</span>
                <span className="text-slate-500">Format Rupiah ("Rp"#,##0) & Rumus Belanja x {activePercentage}%</span>
              </div>
            </div>
          </div>

          {/* Visual Preview Box (Exact layout like in the user's screenshot) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                <PenTool className="w-3.5 h-3.5 text-emerald-600" />
                <span>Pratinjau Format Lembar Excel ({samplePreview.length} Baris Pertama):</span>
              </span>
              <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full font-mono">
                Rumus: =ROUND(C2*{activePercentage}%, 0)
              </span>
            </div>

            <div className="border border-slate-300 rounded-xl overflow-x-auto shadow-xs bg-white">
              <table className="w-full text-left border-collapse text-xs font-sans">
                {/* Header matching image */}
                <thead>
                  <tr className="bg-[#E4E4EC] border-b-2 border-slate-400 font-bold text-slate-900 text-center">
                    <th className="py-2.5 px-3 border-r border-slate-300 w-12 text-center">No</th>
                    <th className="py-2.5 px-3 border-r border-slate-300 text-left">Nama Konsumen</th>
                    <th className="py-2.5 px-3 border-r border-slate-300 text-right">Total Pembelanjaan</th>
                    <th className="py-2.5 px-3 border-r border-slate-300 text-right">
                      <div>Carshback</div>
                      <div className="text-[9px] font-normal text-emerald-800 font-mono">[Rumus: Belanja x {activePercentage}%]</div>
                    </th>
                    <th className="py-2.5 px-3 border-r border-slate-300 w-16 text-center">Parcel</th>
                    <th colSpan={2} className="py-2.5 px-3 text-center">Tanda tangan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {samplePreview.map((cust, idx) => {
                    const rowNumber = idx + 1;
                    const isParcel = cust.getParcel !== undefined 
                      ? cust.getParcel 
                      : (cust.totalPurchase >= parcelThreshold);
                    const calculatedCashback = Math.round((cust.totalPurchase || 0) * (activePercentage / 100));

                    return (
                      <tr key={cust.customerCode || `${cust.customerName}_${idx}`} className="hover:bg-slate-50/70">
                        <td className="py-2.5 px-3 text-center border-r border-slate-200 font-mono text-slate-700">
                          {rowNumber}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-slate-900 border-r border-slate-200 text-left">
                          {cust.customerName}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-800 border-r border-slate-200">
                          Rp{(cust.totalPurchase || 0).toLocaleString('id-ID')}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono tabular-nums font-bold text-emerald-800 border-r border-slate-200">
                          Rp{calculatedCashback.toLocaleString('id-ID')}
                        </td>
                        <td className={`py-2.5 px-3 text-center font-bold border-r border-slate-200 ${
                          isParcel ? 'text-emerald-700' : 'text-slate-500'
                        }`}>
                          {isParcel ? 'Ya' : 'Tidak'}
                        </td>
                        {/* Staggered signature columns - Rata Kiri sesuai instruksi */}
                        <td className="py-2.5 px-3 border-r border-slate-200 w-16 text-left text-slate-700 font-mono">
                          {idx % 2 === 0 ? rowNumber : ''}
                        </td>
                        <td className="py-2.5 px-3 w-16 text-left text-slate-700 font-mono">
                          {idx % 2 !== 0 ? rowNumber : ''}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <p className="text-[11px] text-slate-500 italic">
              * Kolom tanda tangan dibuat berjarak 2 kolom selang-seling agar rapi dan mudah ditandatangani oleh konsumen saat serah terima cashback/parcel.
            </p>
          </div>

          {/* Action Button */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
            <span className="text-[11px] text-slate-500">
              Total {customerSummaries.length} konsumen siap diekspor
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isExporting}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors disabled:opacity-50"
              >
                Batal
              </button>

              <button
                type="button"
                onClick={handleDownload}
                disabled={isExporting}
                className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                {isExporting ? (
                  <>
                    <Sparkles className="w-4 h-4 animate-spin" />
                    <span>Menyiapkan File Excel...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span>Unduh File Excel Sekarang</span>
                  </>
                )}
              </button>
            </div>
          </div>

        </form>

      </div>
    </div>
  );
};
