import React, { useState } from 'react';
import { 
  X, 
  Printer, 
  Share2, 
  Check, 
  Copy, 
  ShieldCheck, 
  Receipt as ReceiptIcon,
  Phone,
  CheckCircle2
} from 'lucide-react';
import { CashbackSettings, Invoice } from '../types/cashback';
import { formatRupiah } from '../utils/cashbackCalculator';

interface ReceiptModalProps {
  invoice: Invoice | null;
  onClose: () => void;
  settings: CashbackSettings;
  onMarkDisbursed?: (invoiceId: string) => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  invoice,
  onClose,
  settings,
  onMarkDisbursed,
}) => {
  const [copied, setCopied] = useState(false);

  if (!invoice) return null;

  const handlePrint = () => {
    window.print();
  };

  const getStatusText = () => {
    if (invoice.claimStatus === 'disbursed') return 'SUDAH DICAIRKAN (LUNAS)';
    if (invoice.claimStatus === 'ready') return 'SIAP DICAIRKAN';
    return 'MENUNGGU KLAIM KONSUMEN';
  };

  const shareText = `*BUKTI REKAP CASHBACK TRANSAKSI*\n` +
    `Toko: ${settings.storeName}\n` +
    `No. Faktur: ${invoice.invoiceNumber}\n` +
    `Tanggal: ${invoice.date}\n` +
    `Konsumen: ${invoice.customerName} (${invoice.customerPhone})\n` +
    `Barang/Kategori: ${invoice.category} ${invoice.itemsDescription ? `(${invoice.itemsDescription})` : ''}\n` +
    `--------------------------------\n` +
    `Total Belanja: ${formatRupiah(invoice.purchaseAmount)}\n` +
    `Persentase Cashback: ${invoice.cashbackPercentage}%\n` +
    `*TOTAL CASHBACK: ${formatRupiah(invoice.cashbackAmount)}*\n` +
    `Status Pencairan: ${getStatusText()}\n` +
    `--------------------------------\n` +
    `Terima kasih atas kepercayaan Anda berbelanja di ${settings.storeName}!`;

  const handleCopy = () => {
    navigator.clipboard.writeText(shareText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWhatsAppShare = () => {
    const cleanPhone = invoice.customerPhone.replace(/\D/g, '');
    const formattedPhone = cleanPhone.startsWith('0') ? '62' + cleanPhone.slice(1) : cleanPhone;
    const url = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(shareText)}`;
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2.5 sm:p-4 print:static print:inset-auto print:block print:bg-white print:p-0">
      <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200 shadow-xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150 print:max-w-none print:shadow-none print:border-none print:rounded-none">
        
        {/* Header */}
        <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50 print:hidden">
          <div className="flex items-center gap-2">
            <ReceiptIcon className="w-4 h-4 text-emerald-600" />
            <span className="text-xs font-bold text-slate-800">
              Bukti Transparan Cashback Konsumen
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 rounded-md"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Receipt Paper Area */}
        <div className="p-6 text-xs font-sans space-y-4 print:p-0">
          
          <div className="text-center pb-3 border-b border-dashed border-slate-300">
            <h3 className="font-extrabold text-base text-slate-900 tracking-tight">
              {settings.companyProfile?.companyName || settings.storeName}
            </h3>
            {settings.companyProfile?.tagline ? (
              <p className="text-[11px] text-slate-500 mt-0.5">
                {settings.companyProfile.tagline}
              </p>
            ) : (
              <p className="text-[11px] text-slate-500 mt-0.5">
                Program Cashback Resmi & Transparan
              </p>
            )}
            {settings.companyProfile?.address && (
              <p className="text-[10px] text-slate-400 mt-0.5">
                {settings.companyProfile.address} {settings.companyProfile.city ? `• ${settings.companyProfile.city}` : ''}
              </p>
            )}
            {settings.companyProfile?.phone && (
              <p className="text-[10px] text-slate-400 font-mono">
                Telp/WA: {settings.companyProfile.phone}
              </p>
            )}
            <div className="mt-2 inline-flex items-center gap-1 text-[10px] text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded font-medium">
              <ShieldCheck className="w-3 h-3 text-emerald-600" />
              <span>Perhitungan Tervalidasi Sistem</span>
            </div>
          </div>

          {/* Details */}
          <div className="space-y-1.5 text-slate-600">
            <div className="flex justify-between">
              <span>Nomor Faktur:</span>
              <span className="font-mono font-bold text-slate-900">{invoice.invoiceNumber}</span>
            </div>
            <div className="flex justify-between">
              <span>Tanggal Pembelian:</span>
              <span className="font-mono text-slate-800">{invoice.date}</span>
            </div>
            <div className="flex justify-between">
              <span>Nama Konsumen:</span>
              <span className="font-bold text-slate-900">{invoice.customerName}</span>
            </div>
            <div className="flex justify-between">
              <span>No. WhatsApp:</span>
              <span className="font-mono text-slate-800">{invoice.customerPhone}</span>
            </div>
            <div className="flex justify-between">
              <span>Kategori:</span>
              <span className="text-slate-800">{invoice.category}</span>
            </div>
            <div className="flex justify-between">
              <span>Metode Pencairan:</span>
              <span className="font-semibold text-emerald-700">Tunai (Cash)</span>
            </div>
            {invoice.itemsDescription && (
              <div className="flex justify-between text-[11px]">
                <span>Item:</span>
                <span className="text-slate-700 text-right max-w-[200px] truncate">{invoice.itemsDescription}</span>
              </div>
            )}
          </div>

          {/* Breakdown Math */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
            <div className="flex justify-between text-slate-600">
              <span>Nilai Total Belanja:</span>
              <span className="font-mono font-bold text-slate-900 text-sm">
                {formatRupiah(invoice.purchaseAmount)}
              </span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Rate Cashback:</span>
              <span className="font-mono font-semibold text-emerald-700">
                {invoice.cashbackPercentage}%
              </span>
            </div>
            <div className="pt-2 border-t border-slate-200 flex justify-between items-baseline">
              <span className="font-bold text-slate-900">Hak Cashback Konsumen:</span>
              <span className="font-mono font-extrabold text-emerald-700 text-base">
                {formatRupiah(invoice.cashbackAmount)}
              </span>
            </div>
          </div>

          {/* Status Badge */}
          <div className="text-center py-2 px-3 rounded-lg border border-slate-200 text-xs">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-semibold">
              Status Klaim / Pencairan
            </span>
            <span className={`font-bold mt-0.5 inline-block ${
              invoice.claimStatus === 'disbursed' ? 'text-emerald-700' : 'text-amber-700'
            }`}>
              {getStatusText()}
            </span>
            {invoice.notes && (
              <div className="text-[10px] text-slate-500 mt-1 italic">
                "{invoice.notes}"
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="pt-2 flex flex-col gap-2 print:hidden">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleWhatsAppShare}
                className="w-full py-2 px-3 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors flex items-center justify-center gap-1.5"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>Kirim WhatsApp</span>
              </button>

              <button
                type="button"
                onClick={handleCopy}
                className="w-full py-2 px-3 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center justify-center gap-1.5"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Tersalin!' : 'Salin Teks'}</span>
              </button>
            </div>

            <button
              type="button"
              onClick={handlePrint}
              className="w-full py-2 px-3 text-xs font-semibold text-slate-700 border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors flex items-center justify-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak Struk / Simpan PDF</span>
            </button>

            {invoice.claimStatus !== 'disbursed' && onMarkDisbursed && (
              <button
                type="button"
                onClick={() => {
                  onMarkDisbursed(invoice.id);
                  onClose();
                }}
                className="w-full py-2 px-3 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors flex items-center justify-center gap-1.5 mt-1"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Tandai Sudah Dicairkan Sekarang</span>
              </button>
            )}
          </div>

        </div>

      </div>
    </div>
  );
};
