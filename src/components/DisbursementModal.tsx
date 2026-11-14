import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Camera,
  Upload,
  Trash2,
  CheckCircle2,
  PenTool,
  RotateCcw,
  Calendar,
  User,
  AlertCircle,
  Eye,
  Check,
  Layers,
  Wallet,
  Maximize2,
  Minimize2,
  RefreshCw,
} from 'lucide-react';
import { Invoice, PayoutMethod, CustomerSummary } from '../types/cashback';
import { formatRupiah } from '../utils/cashbackCalculator';
import {
  loadDisbursementDraft,
  saveDisbursementDraft,
  clearDisbursementDraft,
} from '../utils/storage';

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

  const initialRecipient =
    customer?.recipientName ||
    customer?.customerName ||
    invoice?.recipientName ||
    invoice?.customerName ||
    '';
  const payoutMethod: PayoutMethod = 'tunai';

  const [recipientName, setRecipientName] = useState(initialRecipient);
  const [disbursedDate, setDisbursedDate] = useState(
    customer?.lastDisbursedDate || invoice?.disbursedDate || new Date().toISOString().split('T')[0]
  );
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
  const [isSignatureFullscreen, setIsSignatureFullscreen] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Live Camera Capture State
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraFacingMode, setCameraFacingMode] = useState<'environment' | 'user'>('environment');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isStartingCamera, setIsStartingCamera] = useState(false);

  // Stable key for draft persistence & preventing background Firestore resets
  const targetKey = customer
    ? `cust:${customer.customerName.trim().toLowerCase()}`
    : invoice
      ? `inv:${invoice.id}`
      : '';

  // Digital Signature Canvas (Inline + Fullscreen)
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fullscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const fullscreenWrapperRef = useRef<HTMLDivElement | null>(null);
  const isDrawingRef = useRef(false);
  const initializedTargetRef = useRef<string>('');
  const signatureDataUrlRef = useRef<string | undefined>(
    customer?.disbursementSignature || invoice?.disbursementSignature
  );

  // Separate inputs for direct camera capture vs photo file upload
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const uploadInputRef = useRef<HTMLInputElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const stopCameraStream = useCallback(() => {
    setCameraStream((prevStream) => {
      if (prevStream) {
        prevStream.getTracks().forEach((track) => track.stop());
      }
      return null;
    });
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const closeLiveCamera = useCallback(() => {
    stopCameraStream();
    setIsCameraOpen(false);
    setCameraError(null);
    setIsStartingCamera(false);
  }, [stopCameraStream]);

  // Attach active MediaStream to video element whenever available
  useEffect(() => {
    if (isCameraOpen && videoRef.current && cameraStream) {
      videoRef.current.srcObject = cameraStream;
      videoRef.current.play().catch(() => {
        // Autoplay handled by muted+playsInline attributes
      });
    }
  }, [isCameraOpen, cameraStream]);

  // Cleanup camera stream when modal closes or unmounts
  useEffect(() => {
    if (!isOpen) {
      closeLiveCamera();
    }
    return () => {
      stopCameraStream();
    };
  }, [isOpen, closeLiveCamera, stopCameraStream]);

  const openLiveCamera = async (preferredFacing: 'environment' | 'user' = cameraFacingMode) => {
    setCameraError(null);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      // Browser without getUserMedia support -> trigger native camera file input
      cameraInputRef.current?.click();
      return;
    }

    stopCameraStream();
    setIsCameraOpen(true);
    setIsStartingCamera(true);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: preferredFacing },
          width: { ideal: 1280 },
          height: { ideal: 960 },
        },
        audio: false,
      });
      setCameraStream(stream);
      setCameraFacingMode(preferredFacing);
    } catch (err: any) {
      const errName = err?.name || '';
      if (errName === 'NotAllowedError' || errName === 'PermissionDeniedError') {
        setCameraError(
          'Izin kamera ditolak atau diblokir oleh browser. Anda dapat mengizinkan kamera atau langsung upload/ambil foto via perangkat.'
        );
      } else {
        // Device without webcam / busy camera -> cleanly fall back to native device camera/file picker
        closeLiveCamera();
        cameraInputRef.current?.click();
      }
    } finally {
      setIsStartingCamera(false);
    }
  };

  const handleToggleCameraFacing = () => {
    const nextFacing = cameraFacingMode === 'environment' ? 'user' : 'environment';
    openLiveCamera(nextFacing);
  };

  const compressCanvasToProofPhoto = (
    source: HTMLCanvasElement | HTMLImageElement | HTMLVideoElement,
    srcWidth: number,
    srcHeight: number
  ): string | null => {
    if (!srcWidth || !srcHeight) return null;
    const maxDimension = 800;
    let width = srcWidth;
    let height = srcHeight;

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
    if (!compCtx) return null;

    compCtx.drawImage(source, 0, 0, width, height);
    return compCanvas.toDataURL('image/jpeg', 0.8);
  };

  const handleCaptureFromLiveCamera = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) {
      setCameraError('Kamera belum siap. Tunggu sebentar hingga gambar tampil.');
      return;
    }

    const compressedDataUrl = compressCanvasToProofPhoto(
      video,
      video.videoWidth,
      video.videoHeight
    );
    if (compressedDataUrl) {
      setProofPhoto(compressedDataUrl);
      setErrorMsg(null);
      closeLiveCamera();
    } else {
      setCameraError('Gagal memproses hasil foto kamera.');
    }
  };

  const exportSignatureDataUrl = (canvas: HTMLCanvasElement): string => {
    const maxWidth = 900;
    if (canvas.width <= maxWidth) {
      return canvas.toDataURL('image/png');
    }
    const scale = maxWidth / canvas.width;
    const outCanvas = document.createElement('canvas');
    outCanvas.width = maxWidth;
    outCanvas.height = Math.max(1, Math.round(canvas.height * scale));
    const outCtx = outCanvas.getContext('2d');
    if (!outCtx) {
      return canvas.toDataURL('image/png');
    }
    outCtx.fillStyle = '#ffffff';
    outCtx.fillRect(0, 0, outCanvas.width, outCanvas.height);
    outCtx.drawImage(canvas, 0, 0, outCanvas.width, outCanvas.height);
    return outCanvas.toDataURL('image/png');
  };

  const persistCurrentDraft = (overrides?: {
    recipientName?: string;
    disbursedDate?: string;
    disbursementNotes?: string;
    disbursementProofPhoto?: string | null;
    disbursementSignature?: string;
    isSignatureFullscreen?: boolean;
  }) => {
    if (!targetKey) return;
    saveDisbursementDraft(targetKey, {
      recipientName: overrides?.recipientName !== undefined ? overrides.recipientName : recipientName,
      disbursedDate: overrides?.disbursedDate !== undefined ? overrides.disbursedDate : disbursedDate,
      disbursementNotes: overrides?.disbursementNotes !== undefined ? overrides.disbursementNotes : disbursementNotes,
      disbursementProofPhoto: overrides?.disbursementProofPhoto !== undefined ? overrides.disbursementProofPhoto : proofPhoto,
      disbursementSignature:
        overrides && 'disbursementSignature' in overrides
          ? overrides.disbursementSignature
          : signatureDataUrlRef.current,
      isSignatureFullscreen:
        overrides?.isSignatureFullscreen !== undefined
          ? overrides.isSignatureFullscreen
          : isSignatureFullscreen,
      updatedAt: Date.now(),
    });
  };

  const drawImageContain = (
    ctx: CanvasRenderingContext2D,
    img: HTMLImageElement,
    targetWidth: number,
    targetHeight: number
  ) => {
    if (!img.width || !img.height || !targetWidth || !targetHeight) return;
    const scale = Math.min(targetWidth / img.width, targetHeight / img.height);
    const drawWidth = img.width * scale;
    const drawHeight = img.height * scale;
    const offsetX = (targetWidth - drawWidth) / 2;
    const offsetY = (targetHeight - drawHeight) / 2;
    ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
  };

  const setupCanvas = useCallback(
    (
      canvas: HTMLCanvasElement | null,
      existingSignature?: string,
      strokeWidth = 2.5
    ) => {
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const rect = canvas.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;

      const dpr = Math.min(window.devicePixelRatio || 2, 2);
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = strokeWidth;

      // Clear background with crisp white
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, rect.width, rect.height);

      if (existingSignature) {
        const img = new Image();
        img.onload = () => {
          drawImageContain(ctx, img, rect.width, rect.height);
          setHasSignature(true);
        };
        img.src = existingSignature;
      }
    },
    []
  );

  // Initialize form & canvas ONLY when modal opens or switches to a different customer/invoice
  // Never wipe in-progress signature if parent prop object reference refreshes from Firestore
  useEffect(() => {
    if (!isOpen) {
      initializedTargetRef.current = '';
      return;
    }
    if (!targetKey || initializedTargetRef.current === targetKey) {
      return;
    }
    initializedTargetRef.current = targetKey;

    const draft = loadDisbursementDraft(targetKey);
    const baseRec = customer?.recipientName || customer?.customerName || invoice?.recipientName || invoice?.customerName || '';
    const baseDt = customer?.lastDisbursedDate || invoice?.disbursedDate || new Date().toISOString().split('T')[0];
    const baseNotes = customer?.disbursementNotes || invoice?.disbursementNotes || '';
    const basePhoto = customer?.disbursementProofPhoto || invoice?.disbursementProofPhoto || null;
    const baseSig = customer?.disbursementSignature || invoice?.disbursementSignature;

    const rec = draft?.recipientName !== undefined ? draft.recipientName : baseRec;
    const dt = draft?.disbursedDate !== undefined ? draft.disbursedDate : baseDt;
    const notes = draft?.disbursementNotes !== undefined ? draft.disbursementNotes : baseNotes;
    const photo = draft?.disbursementProofPhoto !== undefined ? draft.disbursementProofPhoto : basePhoto;
    const sig = draft?.disbursementSignature !== undefined ? draft.disbursementSignature : baseSig;
    const restoreFullscreen = Boolean(draft?.isSignatureFullscreen);

    setRecipientName(rec);
    setDisbursedDate(dt);
    setDisbursementNotes(notes);
    setProofPhoto(photo);
    signatureDataUrlRef.current = sig;
    setHasSignature(Boolean(sig));
    setIsSignatureFullscreen(restoreFullscreen);
    setErrorMsg(null);

    // Initialize inline canvas with saved/draft signature
    setTimeout(() => {
      setupCanvas(canvasRef.current, sig, 2.5);
    }, 100);
  }, [isOpen, targetKey, customer, invoice, setupCanvas]);

  // Keep inline & fullscreen canvases synchronized whenever toggling maximize/minimize, resizing, or rotating
  useEffect(() => {
    if (!isOpen) return;

    const syncCanvases = () => {
      if (isSignatureFullscreen && fullscreenCanvasRef.current) {
        setupCanvas(
          fullscreenCanvasRef.current,
          signatureDataUrlRef.current,
          3.2
        );
      } else if (!isSignatureFullscreen && canvasRef.current) {
        setupCanvas(
          canvasRef.current,
          signatureDataUrlRef.current,
          2.5
        );
      }
    };

    const timer = setTimeout(syncCanvases, 60);

    let observer: ResizeObserver | null = null;
    if (isSignatureFullscreen && fullscreenWrapperRef.current && typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(() => {
        if (!isDrawingRef.current) {
          syncCanvases();
        }
      });
      observer.observe(fullscreenWrapperRef.current);
    }

    window.addEventListener('resize', syncCanvases);
    window.addEventListener('orientationchange', syncCanvases);
    return () => {
      clearTimeout(timer);
      observer?.disconnect();
      window.removeEventListener('resize', syncCanvases);
      window.removeEventListener('orientationchange', syncCanvases);
    };
  }, [isOpen, isSignatureFullscreen, setupCanvas]);

  // Persist draft whenever form fields or fullscreen mode update while modal is open
  useEffect(() => {
    if (!isOpen || !targetKey || initializedTargetRef.current !== targetKey) return;
    persistCurrentDraft();
  }, [isOpen, targetKey, recipientName, disbursedDate, disbursementNotes, proofPhoto, isSignatureFullscreen]);

  // Canvas Mouse & Touch Drawing Handlers
  const getCoordinates = (
    canvas: HTMLCanvasElement,
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  };

  const startDrawing = (
    canvas: HTMLCanvasElement | null,
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    isDrawingRef.current = true;
    const { x, y } = getCoordinates(canvas, e);

    ctx.beginPath();
    ctx.moveTo(x, y);
    // Support single tap dots
    ctx.lineTo(x + 0.01, y + 0.01);
    ctx.stroke();
    setHasSignature(true);
  };

  const draw = (
    canvas: HTMLCanvasElement | null,
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    if (!isDrawingRef.current || !canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Prevent scrolling while drawing on mobile
    if ('touches' in e && e.cancelable) {
      e.preventDefault();
    }

    const { x, y } = getCoordinates(canvas, e);
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasSignature(true);
  };

  const stopDrawing = (canvas: HTMLCanvasElement | null) => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.closePath();
    }
    const dataUrl = exportSignatureDataUrl(canvas);
    signatureDataUrlRef.current = dataUrl;
    setHasSignature(true);
    persistCurrentDraft({ disbursementSignature: dataUrl });
  };

  const clearCanvas = (target: 'inline' | 'fullscreen' | 'both' = 'both') => {
    if (target === 'inline' || target === 'both') {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const rect = canvas.getBoundingClientRect();
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, rect.width, rect.height);
        }
      }
    }
    if (target === 'fullscreen' || target === 'both') {
      const fsCanvas = fullscreenCanvasRef.current;
      if (fsCanvas) {
        const fsCtx = fsCanvas.getContext('2d');
        if (fsCtx) {
          const rect = fsCanvas.getBoundingClientRect();
          fsCtx.fillStyle = '#ffffff';
          fsCtx.fillRect(0, 0, rect.width, rect.height);
        }
      }
    }
    signatureDataUrlRef.current = undefined;
    setHasSignature(false);
    persistCurrentDraft({ disbursementSignature: undefined });
  };

  const handleOpenFullscreenSignature = () => {
    if (hasSignature && canvasRef.current) {
      const dataUrl = exportSignatureDataUrl(canvasRef.current);
      signatureDataUrlRef.current = dataUrl;
      persistCurrentDraft({ disbursementSignature: dataUrl, isSignatureFullscreen: true });
    }
    setIsSignatureFullscreen(true);
  };

  const handleCloseFullscreenSignature = () => {
    if (hasSignature && fullscreenCanvasRef.current) {
      const dataUrl = exportSignatureDataUrl(fullscreenCanvasRef.current);
      signatureDataUrlRef.current = dataUrl;
      persistCurrentDraft({ disbursementSignature: dataUrl, isSignatureFullscreen: false });
    } else {
      persistCurrentDraft({
        disbursementSignature: hasSignature ? signatureDataUrlRef.current : undefined,
        isSignatureFullscreen: false,
      });
    }
    setIsSignatureFullscreen(false);
  };

  // Photo Upload / Native Camera File Handler with Canvas Compression
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Reset input value so selecting the same file again still triggers onChange
    e.target.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMsg('File harus berupa gambar (JPG, PNG, atau WebP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const compressedDataUrl = compressCanvasToProofPhoto(img, img.width, img.height);
        if (compressedDataUrl) {
          setProofPhoto(compressedDataUrl);
          setErrorMsg(null);
          closeLiveCamera();
        }
      };
      img.onerror = () => {
        setErrorMsg('Gagal membaca file gambar. Coba pilih file gambar lain.');
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
    if (hasSignature) {
      if (signatureDataUrlRef.current) {
        signatureDataUrl = signatureDataUrlRef.current;
      } else if (canvasRef.current) {
        signatureDataUrl = exportSignatureDataUrl(canvasRef.current);
      }
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
      if (targetKey) clearDisbursementDraft(targetKey);
      closeLiveCamera();
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
      if (targetKey) clearDisbursementDraft(targetKey);
      closeLiveCamera();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2.5 sm:p-4 animate-in fade-in duration-150">
        <div
          className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-3xl w-full max-h-[94dvh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
          role="dialog"
          aria-modal="true"
        >
          {/* Header */}
          <div className="px-4 sm:px-5 py-3.5 sm:py-4 bg-slate-900 text-white flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-sm sm:text-base font-bold truncate">
                    {isCustomerMode ? 'Proses Pencairan Cashback Konsumen' : 'Pencairan Cashback Faktur'}
                  </h2>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-600 text-white uppercase tracking-wider shrink-0">
                    Per Konsumen
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 mt-0.5 truncate">
                  {isCustomerMode
                    ? `Mencairkan seluruh cashback untuk konsumen: ${targetName}`
                    : `Faktur: ${invoice?.invoiceNumber} - ${targetName}`}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                closeLiveCamera();
                onClose();
              }}
              className="p-2 min-h-[40px] min-w-[40px] flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors shrink-0"
              aria-label="Tutup"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form Body */}
          <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs flex-1 min-h-0">
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
                <h3 className="text-base sm:text-lg font-black tracking-tight flex items-center gap-1.5 flex-wrap">
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

              <div className="bg-white/10 backdrop-blur-xs rounded-xl p-3 border border-white/20 text-left sm:text-right">
                <span className="text-[10px] font-bold text-emerald-200 uppercase tracking-wider block">
                  Total Cashback Dicairkan
                </span>
                <span className="text-xl sm:text-2xl font-black font-mono tabular-nums tracking-tight text-white block mt-0.5">
                  {formatRupiah(amountToDisburse)}
                </span>
                <span className="text-[10px] text-emerald-200 block mt-0.5">
                  {customer?.disbursedCashback && customer.disbursedCashback > 0
                    ? `(Sebelumnya sudah cair ${formatRupiah(customer.disbursedCashback)})`
                    : 'Pencairan Penuh / Lunas'}
                </span>
              </div>
            </div>

            {/* Invoices breakdown covered by this customer */}
            {customer?.invoices && customer.invoices.length > 0 && (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-1 text-slate-700 font-bold text-[11px]">
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
                      className="flex flex-wrap items-center justify-between gap-2 p-2 rounded-lg bg-white border border-slate-200 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-800">{inv.invoiceNumber}</span>
                        <span className="text-[11px] text-slate-500 font-mono">({inv.date})</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-slate-500 font-mono text-[11px] tabular-nums">
                          Belanja: {formatRupiah(inv.purchaseAmount)}
                        </span>
                        <span className="font-mono font-bold text-emerald-700 tabular-nums">
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

              {/* Payout Method (Cash Only) */}
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Metode Penyerahan / Pencairan
                </label>
                <div className="py-2.5 px-3 rounded-lg border border-emerald-500 bg-emerald-50 text-emerald-900 flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-xs">
                    <Wallet className="w-4 h-4 text-emerald-600" />
                    <span>Tunai (Cash)</span>
                  </div>
                  <span className="text-[10px] font-semibold bg-emerald-600 text-white px-2 py-0.5 rounded-full">
                    Aktif
                  </span>
                </div>
              </div>
            </div>

            {/* Foto Bukti Penerimaan: Ambil Foto Langsung ATAU Upload Foto */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 font-bold text-slate-900 text-xs">
                  <Camera className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Foto Bukti Serah Terima Tunai</span>
                </div>
                {proofPhoto && (
                  <button
                    type="button"
                    onClick={() => setProofPhoto(null)}
                    className="text-[11px] text-rose-600 hover:text-rose-700 flex items-center gap-1 font-semibold shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Hapus Foto
                  </button>
                )}
              </div>

              {/* Hidden Input 1: Direct device camera capture fallback */}
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handlePhotoSelect}
                className="hidden"
              />

              {/* Hidden Input 2: Upload photo from gallery / file explorer (no capture attribute) */}
              <input
                ref={uploadInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoSelect}
                className="hidden"
              />

              {proofPhoto ? (
                <div className="relative rounded-lg overflow-hidden border border-slate-200 bg-white p-2.5 flex flex-col sm:flex-row sm:items-center gap-3">
                  <img
                    src={proofPhoto}
                    alt="Bukti Penerimaan"
                    className="w-full sm:w-24 h-36 sm:h-24 object-cover rounded-lg border border-slate-200 cursor-pointer shrink-0"
                    onClick={() => setPreviewPhoto(true)}
                    title="Klik untuk perbesar"
                  />
                  <div className="flex-1 space-y-1.5 min-w-0">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>Foto bukti berhasil disiapkan</span>
                    </span>
                    <p className="text-[11px] text-slate-500">
                      Foto telah dikompres otomatis untuk efisiensi penyimpanan cloud.
                    </p>
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setPreviewPhoto(true)}
                        className="min-h-[34px] px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-[11px] font-semibold text-emerald-800 flex items-center gap-1 transition-colors whitespace-nowrap"
                      >
                        <Eye className="w-3.5 h-3.5" /> Lihat Penuh
                      </button>
                      <button
                        type="button"
                        onClick={() => openLiveCamera()}
                        className="min-h-[34px] px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-[11px] font-semibold text-white flex items-center gap-1 transition-colors whitespace-nowrap"
                      >
                        <Camera className="w-3.5 h-3.5" /> Foto Ulang
                      </button>
                      <button
                        type="button"
                        onClick={() => uploadInputRef.current?.click()}
                        className="min-h-[34px] px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 border border-slate-300 text-[11px] font-semibold text-slate-700 flex items-center gap-1 transition-colors whitespace-nowrap"
                      >
                        <Upload className="w-3.5 h-3.5" /> Upload Ulang
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-3 sm:p-4 border-2 border-dashed border-slate-300 rounded-xl bg-white space-y-3">
                  <div className="text-center space-y-0.5">
                    <p className="text-xs font-bold text-slate-800">
                      Pilih Cara Melampirkan Foto Bukti Serah Terima
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Ambil foto langsung dari kamera atau upload gambar dari galeri / file perangkat
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => openLiveCamera()}
                      className="min-h-[44px] px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-all whitespace-nowrap"
                    >
                      <Camera className="w-4 h-4 shrink-0" />
                      <span>Ambil Foto Langsung</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => uploadInputRef.current?.click()}
                      className="min-h-[44px] px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 active:scale-[0.99] text-slate-800 border border-slate-300 text-xs font-bold flex items-center justify-center gap-2 transition-all whitespace-nowrap"
                    >
                      <Upload className="w-4 h-4 text-slate-600 shrink-0" />
                      <span>Upload Foto</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Tanda Tangan Elektronik Digital */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 font-bold text-slate-900 text-xs">
                  <PenTool className="w-4 h-4 text-emerald-600" />
                  <span>Tanda Tangan Elektronik Penerima</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleOpenFullscreenSignature}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-semibold flex items-center gap-1.5 transition-colors shadow-2xs whitespace-nowrap"
                    title="Perbesar area tanda tangan hingga layar penuh"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                    <span>Perbesar (Layar Penuh)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => clearCanvas('both')}
                    className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-[11px] text-slate-600 hover:text-slate-900 flex items-center gap-1 font-semibold transition-colors whitespace-nowrap"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Ulangi</span>
                  </button>
                </div>
              </div>

              <div className="relative border border-slate-300 rounded-xl overflow-hidden bg-white shadow-2xs">
                <canvas
                  ref={canvasRef}
                  onMouseDown={(e) => startDrawing(canvasRef.current, e)}
                  onMouseMove={(e) => draw(canvasRef.current, e)}
                  onMouseUp={() => stopDrawing(canvasRef.current)}
                  onMouseLeave={() => stopDrawing(canvasRef.current)}
                  onTouchStart={(e) => startDrawing(canvasRef.current, e)}
                  onTouchMove={(e) => draw(canvasRef.current, e)}
                  onTouchEnd={() => stopDrawing(canvasRef.current)}
                  className="w-full h-52 sm:h-60 cursor-crosshair touch-none select-none block"
                />
                {/* Subtle Baseline Guide (visual only, not baked into exported PNG) */}
                <div className="pointer-events-none absolute inset-x-8 bottom-12 border-b border-dashed border-slate-200" />

                <div className="bg-slate-100 px-3 py-2 border-t border-slate-200 text-[10px] text-slate-500 flex flex-wrap items-center justify-between gap-2">
                  <span>
                    Goreskan tanda tangan di area ini atau tekan <strong className="text-slate-700">Perbesar</strong> untuk area maksimal.
                  </span>
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
                placeholder="Contoh: Diserahkan tunai langsung di kasir toko..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-hidden focus:ring-1 focus:ring-slate-900"
              />
            </div>

            {/* Submit Actions */}
            <div className="pt-2 flex flex-wrap items-center justify-end gap-2.5 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  closeLiveCamera();
                  onClose();
                }}
                className="min-h-[42px] px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
              >
                Batal
              </button>
              <button
                type="submit"
                className="min-h-[42px] px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Konfirmasi Pencairan Cashback</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Portal overlays directly onto document.body so parent backdrop-filter / overflow / transform never clips or covers viewport buttons */}

      {/* Fullsize Photo Preview Modal */}
      {previewPhoto &&
        proofPhoto &&
        createPortal(
          <div
            className="fixed inset-0 z-[95] h-screen h-dvh max-h-dvh w-full bg-black/85 flex items-center justify-center p-3 sm:p-4 overflow-hidden"
            onClick={() => setPreviewPhoto(false)}
          >
            <div
              className="relative max-w-3xl max-h-full overflow-hidden rounded-2xl bg-white p-2 flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setPreviewPhoto(false)}
                className="absolute top-3 right-3 z-10 min-h-[40px] min-w-[40px] p-2 bg-slate-900/80 text-white rounded-full hover:bg-slate-900 flex items-center justify-center"
                aria-label="Tutup pratinjau foto"
              >
                <X className="w-5 h-5" />
              </button>
              <img
                src={proofPhoto}
                alt="Bukti Serah Terima Penuh"
                className="max-h-[calc(100dvh-3rem)] w-auto object-contain rounded-xl"
              />
            </div>
          </div>,
          document.body
        )}

      {/* Live Camera Capture Overlay (Ambil Foto Langsung) */}
      {isCameraOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-[95] h-screen h-dvh max-h-dvh w-full bg-slate-950 text-white flex flex-col overflow-hidden overscroll-none"
            role="dialog"
            aria-modal="true"
            aria-label="Ambil Foto Langsung"
          >
            {/* Camera Top Bar */}
            <div className="px-3 sm:px-5 pt-[max(0.625rem,env(safe-area-inset-top))] pb-2.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <Camera className="w-4 h-4 text-emerald-400 shrink-0" />
                <h3 className="text-xs sm:text-sm font-bold truncate">
                  Ambil Foto Bukti Serah Terima
                </h3>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleToggleCameraFacing}
                  disabled={isStartingCamera}
                  className="min-h-[40px] px-2.5 sm:px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap disabled:opacity-50"
                  title="Ganti kamera depan / belakang"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span className="hidden xs:inline sm:inline">Putar Kamera</span>
                </button>
                <button
                  type="button"
                  onClick={closeLiveCamera}
                  className="min-h-[40px] min-w-[40px] p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors"
                  aria-label="Tutup kamera"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Camera Viewfinder */}
            <div className="flex-1 min-h-0 relative bg-black flex items-center justify-center overflow-hidden p-2 sm:p-4">
              {cameraError ? (
                <div className="max-w-sm w-full bg-slate-900 border border-slate-700 rounded-2xl p-5 text-center space-y-3">
                  <AlertCircle className="w-8 h-8 text-amber-400 mx-auto" />
                  <p className="text-xs text-slate-200 leading-relaxed">{cameraError}</p>
                  <div className="flex flex-col sm:flex-row gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => openLiveCamera(cameraFacingMode)}
                      className="flex-1 min-h-[44px] px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
                    >
                      Coba Lagi
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        closeLiveCamera();
                        cameraInputRef.current?.click();
                      }}
                      className="flex-1 min-h-[44px] px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold"
                    >
                      Kamera Perangkat
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-contain rounded-xl"
                  />
                  {isStartingCamera && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-xs text-slate-200 font-medium">
                      Menghubungkan kamera...
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Camera Bottom Bar */}
            <div className="px-3 sm:px-5 pt-2.5 pb-[max(0.75rem,env(safe-area-inset-bottom))] bg-slate-900 border-t border-slate-800 flex items-center justify-between gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  closeLiveCamera();
                  uploadInputRef.current?.click();
                }}
                className="min-h-[44px] px-3 sm:px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
              >
                <Upload className="w-4 h-4" />
                <span>Upload File</span>
              </button>

              <button
                type="button"
                onClick={handleCaptureFromLiveCamera}
                disabled={isStartingCamera || Boolean(cameraError)}
                className="flex-1 sm:flex-initial min-h-[44px] px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-50 whitespace-nowrap"
              >
                <Camera className="w-4 h-4" />
                <span>Jepret Foto</span>
              </button>

              <button
                type="button"
                onClick={closeLiveCamera}
                className="min-h-[44px] px-3 sm:px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
              >
                Batal
              </button>
            </div>
          </div>,
          document.body
        )}

      {/* Fullscreen Maximized Signature Overlay (Portal directly to body, responsive 100dvh, zero button clipping) */}
      {isSignatureFullscreen &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] h-screen h-dvh max-h-dvh w-full bg-slate-100 flex flex-col overflow-hidden overscroll-none select-none"
            role="dialog"
            aria-modal="true"
            aria-label="Area Tanda Tangan Layar Penuh"
          >
            {/* Top Bar */}
            <div className="bg-slate-900 text-white px-3 sm:px-5 pt-[max(0.5rem,env(safe-area-inset-top))] pb-2 sm:py-3 flex items-center justify-between gap-2 shrink-0 shadow-sm">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <PenTool className="w-4 h-4 text-emerald-400 shrink-0" />
                  <h3 className="text-xs sm:text-base font-bold truncate">
                    Tanda Tangan Penerima
                  </h3>
                </div>
                <p className="text-[11px] text-slate-300 truncate">
                  {recipientName.trim() || targetName} · {formatRupiah(amountToDisburse)}
                </p>
              </div>

              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => clearCanvas('fullscreen')}
                  className="min-h-[40px] px-2.5 sm:px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap"
                >
                  <RotateCcw className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                  <span>Ulangi</span>
                </button>
                <button
                  type="button"
                  onClick={handleCloseFullscreenSignature}
                  className="min-h-[40px] min-w-[40px] p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors shrink-0"
                  title="Perkecil kembali"
                  aria-label="Perkecil kembali"
                >
                  <Minimize2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Maximized Canvas Area: canvas uses absolute inset-0 inside min-h-0 wrapper so it NEVER pushes header/footer bars off screen */}
            <div className="flex-1 min-h-0 p-2 sm:p-4 flex flex-col overflow-hidden">
              <div
                ref={fullscreenWrapperRef}
                className="relative flex-1 min-h-0 w-full bg-white rounded-xl sm:rounded-2xl border-2 border-slate-300 shadow-inner overflow-hidden"
              >
                <canvas
                  ref={fullscreenCanvasRef}
                  onMouseDown={(e) => startDrawing(fullscreenCanvasRef.current, e)}
                  onMouseMove={(e) => draw(fullscreenCanvasRef.current, e)}
                  onMouseUp={() => stopDrawing(fullscreenCanvasRef.current)}
                  onMouseLeave={() => stopDrawing(fullscreenCanvasRef.current)}
                  onTouchStart={(e) => startDrawing(fullscreenCanvasRef.current, e)}
                  onTouchMove={(e) => draw(fullscreenCanvasRef.current, e)}
                  onTouchEnd={() => stopDrawing(fullscreenCanvasRef.current)}
                  className="absolute inset-0 w-full h-full cursor-crosshair touch-none select-none block"
                />
                {/* Visual guide line (not baked into exported image) */}
                <div className="pointer-events-none absolute inset-x-6 sm:inset-x-16 bottom-7 sm:bottom-14 border-b-2 border-dashed border-slate-200 flex justify-center">
                  <span className="translate-y-4 text-[10px] sm:text-[11px] font-medium text-slate-300 select-none">
                    Area Tanda Tangan Maksimal
                  </span>
                </div>
              </div>
            </div>

            {/* Bottom Thumb Action Bar */}
            <div className="bg-white border-t border-slate-200 px-3 sm:px-5 pt-2.5 pb-[max(0.75rem,env(safe-area-inset-bottom))] flex items-center justify-between gap-2 sm:gap-3 shrink-0 shadow-[0_-4px_12px_rgba(15,23,42,0.06)]">
              <span className="text-xs text-slate-500 hidden md:inline truncate">
                {hasSignature
                  ? 'Tanda tangan tersimpan otomatis dan siap digunakan.'
                  : 'Silakan goreskan tanda tangan di area putih di atas.'}
              </span>
              <div className="flex items-center gap-2 w-full md:w-auto">
                <button
                  type="button"
                  onClick={handleCloseFullscreenSignature}
                  className="min-h-[44px] px-3.5 sm:px-4 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors whitespace-nowrap shrink-0"
                >
                  Perkecil
                </button>
                <button
                  type="button"
                  onClick={handleCloseFullscreenSignature}
                  className="flex-1 md:flex-initial min-h-[44px] px-4 sm:px-5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] shadow-xs flex items-center justify-center gap-2 transition-all whitespace-nowrap"
                >
                  <Check className="w-4 h-4 shrink-0" />
                  <span>Gunakan Tanda Tangan</span>
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
};
