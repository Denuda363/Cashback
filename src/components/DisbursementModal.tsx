import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  Camera, 
  Upload, 
  Trash2, 
  CheckCircle2, 
  PenTool, 
  RotateCcw, 
  CreditCard, 
  Calendar, 
  User, 
  FileText, 
  AlertCircle,
  Eye,
  Check,
  Building2,
  Phone,
  Layers,
  ArrowRight
} from 'lucide-react';
import { Invoice, PayoutMethod, CustomerSummary } from '../types/cashback';
import { formatRupiah } from '../utils/cashbackCalculator';

export interface CustomerDisbursementData {
  disbursedDate: string;
  disbursedAt: string;
  payoutMethod: PayoutMethod;
  recipientName: string;
  disbursementProofPhoto?: string;
  disbursementSignature?: string;
  disbursementNotes?: string;
  totalCashbackPaid: number;
}

interface DisbursementModalProps {
  customer?: CustomerSummary | null;
  invoice?: Invoice | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirmCustomerDisbursement?: (
    customerName: string, 
    data: CustomerDisbursementData
  ) => void;
  onConfirmInvoiceDisbursement?: (
    invoiceId: string, 
    data: {
      disbursedDate: string;
      disbursedAt: string;
      payoutMethod: PayoutMethod;
      recipientName: string;
      disbursementProofPhoto?: string;
      disbursementSignature?: string;
      disbursementNotes?: string;
    }
  ) => void;
}

export const DisbursementModal: React.FC<DisbursementModalProps> = ({
  customer,
  invoice,
  isOpen,
  onClose,
  onConfirmCustomerDisbursement,
  onConfirmInvoiceDisbursement,
}) => {
  // Determine customer vs invoice mode
  const isCustomerMode = Boolean(customer);
  const targetName = customer ? customer.customerName : (invoice?.customerName || '');
  const targetPhone = customer ? customer.customerPhone : (invoice?.customerPhone || '');
  const totalSpend = customer ? customer.totalPurchase : (invoice?.purchaseAmount || 0);
  
  // For amount to disburse: in customer mode, it's the remaining undisbursed or total
  const amountToDisburse = customer 
    ? (customer.pendingCashback + customer.readyCashback > 0 
        ? customer.pendingCashback + customer.readyCashback 
        : customer.totalCashback)
    : (invoice?.cashbackAmount || 0);

  const initialRecipient = customer?.recipientName || customer?.customerName || invoice?.recipientName || invoice?.customerName || '';
  const initialMethod: PayoutMethod = customer?.preferredPayoutMethod || customer?.disbursementPayoutMethod || invoice?.payoutMethod || 'transfer_bank';

  const [recipientName, setRecipientName] = useState(initialRecipient);
  const [disbursedDate, setDisbursedDate] = useState(
    customer?.lastDisbursedDate || invoice?.disbursedDate || new Date().toISOString().split('T')[0]
  );
  const [payoutMethod, setPayoutMethod] = useState<PayoutMethod>(initialMethod);
  const [disbursementNotes, setDisbursementNotes] = useState(
    customer?.disbursementNotes || invoice?.disbursementNotes || ''
  );
  const [proofPhoto, setProofPhoto] = useState<string | null>(
    customer?.disbursementProofPhoto || invoice?.disbursementProofPhoto || null
  );
  const [hasSignature, setHasSignature] = useState(
    Boolean(customer?.disbursementSignature || invoice?.disbursementSignature)
  );
  const [previewPhoto, setPreviewPhoto] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Digital Signature Canvas
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      const rec = customer?.recipientName || customer?.customerName || invoice?.recipientName || invoice?.customerName || '';
      const dt = customer?.lastDisbursedDate || invoice?.disbursedDate || new Date().toISOString().split('T')[0];
      const met = customer?.preferredPayoutMethod || customer?.disbursementPayoutMethod || invoice?.payoutMethod || 'transfer_bank';
      const notes = customer?.disbursementNotes || invoice?.disbursementNotes || '';
      const photo = customer?.disbursementProofPhoto || invoice?.disbursementProofPhoto || null;
      const sig = customer?.disbursementSignature || invoice?.disbursementSignature;

      setRecipientName(rec);
      setDisbursedDate(dt);
      setPayoutMethod(met);
      setDisbursementNotes(notes);
      setProofPhoto(photo);
      setHasSignature(Boolean(sig));
      setErrorMsg(null);

      // Initialize canvas with existing signature or clean canvas
      setTimeout(() => {
        initCanvas(sig);
      }, 120);
    }
  }, [isOpen, customer, invoice]);

  const initCanvas = (existingSignature?: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set resolution for crisp drawing on mobile & retina
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * 2;
    canvas.height = rect.height * 2;
    ctx.scale(2, 2);

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2.5;

    // Clear background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, rect.width, rect.height);

    if (existingSignature) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, rect.width, rect.height);
        setHasSignature(true);
      };
      img.src = existingSignature;
    }
  };

  // Canvas Mouse & Touch Drawing Handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    isDrawingRef.current = true;
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Prevent scrolling while drawing on mobile
    if ('touches' in e && e.cancelable) {
      e.preventDefault();
    }

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
    setHasSignature(true);
  };

  const stopDrawing = () => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.closePath();
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, rect.width, rect.height);
    setHasSignature(false);
  };

  // Photo Upload with Canvas Compression
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMsg('File harus berupa gambar (JPG, PNG, atau WebP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Compress image to max 800px width/height for fast loading & Firestore limit preservation
        const maxDimension = 800;
        let width = img.width;
        let height = img.height;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const compCanvas = document.createElement('canvas');
        compCanvas.width = width;
        compCanvas.height = height;
        const compCtx = compCanvas.getContext('2d');
        if (compCtx) {
          compCtx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = compCanvas.toDataURL('image/jpeg', 0.8);
          setProofPhoto(compressedDataUrl);
          setErrorMsg(null);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!recipientName.trim()) {
      setErrorMsg('Nama penerima cashback wajib diisi.');
      return;
    }

    if (!disbursedDate) {
      setErrorMsg('Tanggal penerimaan cashback wajib diisi.');
      return;
    }

    // Get signature data URL if drawn
    let signatureDataUrl: string | undefined = undefined;
    if (hasSignature && canvasRef.current) {
      signatureDataUrl = canvasRef.current.toDataURL('image/png');
    }

    const nowISO = new Date().toISOString();

    if (isCustomerMode && customer && onConfirmCustomerDisbursement) {
      onConfirmCustomerDisbursement(customer.customerName, {
        disbursedDate,
        disbursedAt: nowISO,
        payoutMethod,
        recipientName: recipientName.trim(),
        disbursementProofPhoto: proofPhoto || undefined,
        disbursementSignature: signatureDataUrl,
        disbursementNotes: disbursementNotes.trim(),
        totalCashbackPaid: amountToDisburse,
      });
      onClose();
    } else if (invoice && onConfirmInvoiceDisbursement) {
      onConfirmInvoiceDisbursement(invoice.id, {
        disbursedDate,
        disbursedAt: nowISO,
        payoutMethod,
        recipientName: recipientName.trim(),
        disbursementProofPhoto: proofPhoto || undefined,
        disbursementSignature: signatureDataUrl,
        disbursementNotes: disbursementNotes.trim(),
      });
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
      <div 
        className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
      >
        
        {/* Header */}
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold">
                  {isCustomerMode ? 'Proses Pencairan Cashback Konsumen' : 'Pencairan Cashback Faktur'}
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-600 text-white uppercase tracking-wider">
                  Per Konsumen
                </span>
              </div>
              <p className="text-[11px] text-slate-300 mt-0.5">
                {isCustomerMode 
                  ? `Mencairkan seluruh cashback untuk konsumen: ${targetName}` 
                  : `Faktur: ${invoice?.invoiceNumber} - ${targetName}`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs flex-1">
          
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Customer Highlight Card */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-semibold text-emerald-200 uppercase tracking-wider">
                  Nama Konsumen
                </span>
                {customer?.customerCode && (
                  <span className="text-[10px] bg-emerald-800/80 px-2 py-0.5 rounded-md font-mono">
                    {customer.customerCode}
                  </span>
                )}
              </div>
              <h3 className="text-base sm:text-lg font-black tracking-tight flex items-center gap-1.5">
                <span>{targetName}</span>
                {targetPhone && (
                  <span className="text-xs font-normal text-emerald-100 font-mono">
                    ({targetPhone})
                  </span>
                )}
              </h3>
              <p className="text-[11px] text-emerald-100 mt-1">
                Total Belanja Akumulasi: <span className="font-bold font-mono">{formatRupiah(totalSpend)}</span>
                {customer?.invoiceCount ? ` (${customer.invoiceCount} Faktur Transaksi)` : ''}
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-xs rounded-xl p-3 border border-white/20 text-right sm:text-right">
              <span className="text-[10px] font-bold text-emerald-200 uppercase tracking-wider block">
                Total Cashback Dicairkan
              </span>
              <span className="text-xl sm:text-2xl font-black font-mono tracking-tight text-white block mt-0.5">
                {formatRupiah(amountToDisburse)}
              </span>
              <span className="text-[10px] text-emerald-200 block mt-0.5">
                {customer?.disbursedCashback && customer.disbursedCashback > 0
                  ? `(Sebelumnya sudah cair ${formatRupiah(customer.disbursedCashback)})`
                  : 'Pencairan Penuh / Lunas'}
              </span>
            </div>
          </div>

          {/* Destination Account info if available in Master Data */}
          {customer && (customer.bankAccountNumber || customer.eWalletNumber) && (
            <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl text-blue-900 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-blue-700 shrink-0" />
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 block">
                    Informasi Rekening / E-Wallet Konsumen
                  </span>
                  <span className="text-xs font-semibold">
                    {customer.bankName ? `${customer.bankName} - ${customer.bankAccountNumber} a.n. ${customer.bankAccountHolder || customer.customerName}` : ''}
                    {customer.bankName && customer.eWalletType ? ' | ' : ''}
                    {customer.eWalletType ? `${customer.eWalletType} - ${customer.eWalletNumber}` : ''}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Invoices breakdown covered by this customer */}
          {customer?.invoices && customer.invoices.length > 0 && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <div className="flex items-center justify-between text-slate-700 font-bold text-[11px]">
                <span className="flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-emerald-600" />
                  Rincian Faktur yang Dicairkan ({customer.invoices.length} Faktur)
                </span>
                <span className="text-slate-500 font-normal">
                  Semua faktur konsumen ini akan ditandai dicairkan (disbursed)
                </span>
              </div>
              <div className="max-h-28 overflow-y-auto space-y-1 pr-1">
                {customer.invoices.map((inv, idx) => (
                  <div 
                    key={inv.id || idx}
                    className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-slate-800">{inv.invoiceNumber}</span>
                      <span className="text-[11px] text-slate-500 font-mono">({inv.date})</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-slate-500 font-mono text-[11px]">
                        Belanja: {formatRupiah(inv.purchaseAmount)}
                      </span>
                      <span className="font-mono font-bold text-emerald-700">
                        Cashback: {formatRupiah(inv.cashbackAmount)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Form Fields Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            
            {/* Recipient Name */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Nama Penerima Cashback <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  placeholder="Nama orang yang menerima dana..."
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-hidden focus:ring-1 focus:ring-slate-900"
                />
              </div>
            </div>

            {/* Disbursed Date */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Tanggal Penerimaan <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="date"
                  value={disbursedDate}
                  onChange={(e) => setDisbursedDate(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono focus:outline-hidden focus:ring-1 focus:ring-slate-900"
                />
              </div>
            </div>

            {/* Payout Method */}
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Metode Penyerahan / Pencairan
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'transfer_bank', label: 'Transfer Bank' },
                  { id: 'e_wallet', label: 'E-Wallet / QRIS' },
                  { id: 'tunai', label: 'Uang Tunai (Cash)' },
                  { id: 'potongan_belanja', label: 'Potongan Belanja' },
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setPayoutMethod(m.id as PayoutMethod)}
                    className={`py-2 px-2.5 rounded-lg border text-center font-semibold transition-all ${
                      payoutMethod === m.id
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-800 shadow-2xs font-bold'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

          </div>

          {/* Foto Bukti Penerimaan */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-bold text-slate-900 text-xs">
                <Camera className="w-4 h-4 text-emerald-600" />
                <span>Foto Bukti Penerimaan / Struk Transfer</span>
              </div>
              {proofPhoto && (
                <button
                  type="button"
                  onClick={() => setProofPhoto(null)}
                  className="text-[11px] text-rose-600 hover:text-rose-700 flex items-center gap-1 font-semibold"
                >
                  <Trash2 className="w-3 h-3" /> Hapus Foto
                </button>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handlePhotoSelect}
              className="hidden"
            />

            {proofPhoto ? (
              <div className="relative rounded-lg overflow-hidden border border-slate-200 bg-white p-2 flex items-center gap-3">
                <img
                  src={proofPhoto}
                  alt="Bukti Penerimaan"
                  className="w-20 h-20 object-cover rounded-lg border border-slate-200 cursor-pointer"
                  onClick={() => setPreviewPhoto(true)}
                  title="Klik untuk perbesar"
                />
                <div className="flex-1 space-y-1">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Foto bukti berhasil diunggah
                  </span>
                  <p className="text-[11px] text-slate-500">
                    Foto telah dikompres otomatis untuk efisiensi penyimpanan cloud.
                  </p>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setPreviewPhoto(true)}
                      className="text-[11px] font-semibold text-emerald-700 hover:underline flex items-center gap-1"
                    >
                      <Eye className="w-3 h-3" /> Lihat Ukuran Penuh
                    </button>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-[11px] font-semibold text-slate-600 hover:underline"
                    >
                      Ganti Foto
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="p-4 border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-xl bg-white text-center cursor-pointer transition-colors space-y-1"
              >
                <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                  <Camera className="w-4 h-4" />
                </div>
                <p className="text-xs font-bold text-slate-800">
                  Ambil Foto Kamera atau Upload Bukti Transfer
                </p>
                <p className="text-[10px] text-slate-400">
                  Mendukung foto struk ATM, bukti transfer M-Banking, atau nota serah terima uang tunai
                </p>
              </div>
            )}
          </div>

          {/* Tanda Tangan Elektronik Digital */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-bold text-slate-900 text-xs">
                <PenTool className="w-4 h-4 text-emerald-600" />
                <span>Tanda Tangan Elektronik Penerima</span>
              </div>
              <button
                type="button"
                onClick={clearCanvas}
                className="text-[11px] text-slate-500 hover:text-slate-800 flex items-center gap-1 font-semibold"
              >
                <RotateCcw className="w-3 h-3" /> Hapus / Ulangi
              </button>
            </div>

            <div className="border border-slate-300 rounded-xl overflow-hidden bg-white shadow-2xs">
              <canvas
                ref={canvasRef}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
                className="w-full h-36 cursor-crosshair touch-none"
              />
              <div className="bg-slate-100 px-3 py-1.5 border-t border-slate-200 text-[10px] text-slate-500 flex items-center justify-between">
                <span>Goreskan tanda tangan dengan jari (layar sentuh) atau kursor mouse.</span>
                {hasSignature ? (
                  <span className="text-emerald-700 font-bold flex items-center gap-1">
                    <Check className="w-3 h-3" /> Tanda tangan tersimpan
                  </span>
                ) : (
                  <span className="text-slate-400 italic">Belum bertanda tangan</span>
                )}
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
              Catatan Serah Terima (Opsional)
            </label>
            <textarea
              value={disbursementNotes}
              onChange={(e) => setDisbursementNotes(e.target.value)}
              rows={2}
              placeholder="Contoh: Diserahkan langsung di kasir toko / Transfer via Rekening Mandiri..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-hidden focus:ring-1 focus:ring-slate-900"
            />
          </div>

          {/* Submit Actions */}
          <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Konfirmasi Pencairan Cashback</span>
            </button>
          </div>

        </form>

        {/* Fullsize Photo Preview Modal */}
        {previewPhoto && proofPhoto && (
          <div 
            className="fixed inset-0 z-70 bg-black/80 flex items-center justify-center p-4 animate-in fade-in"
            onClick={() => setPreviewPhoto(false)}
          >
            <div className="relative max-w-3xl max-h-[90vh] overflow-hidden rounded-2xl bg-white p-2">
              <button
                onClick={() => setPreviewPhoto(false)}
                className="absolute top-4 right-4 p-2 bg-slate-900/70 text-white rounded-full hover:bg-slate-900"
              >
                <X className="w-5 h-5" />
              </button>
              <img
                src={proofPhoto}
                alt="Bukti Transfer Penuh"
                className="max-h-[85vh] w-auto object-contain rounded-xl"
              />
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
