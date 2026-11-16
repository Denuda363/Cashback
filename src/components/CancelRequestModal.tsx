import React, { useState, useEffect } from 'react';
import {
  X,
  Send,
  AlertTriangle,
  UserCheck,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldCheck,
  Loader2,
} from 'lucide-react';
import { CustomerSummary, DisbursementCancelRequest } from '../types/cashback';
import { formatRupiah } from '../utils/cashbackCalculator';
import { loadStoredDisbursementOfficer } from '../utils/storage';

interface RequestCancelModalProps {
  customer: CustomerSummary | null;
  onClose: () => void;
  onSubmitRequest: (customer: CustomerSummary, requestedBy: string, reason: string) => Promise<void>;
}

export const RequestCancelDisbursementModal: React.FC<RequestCancelModalProps> = ({
  customer,
  onClose,
  onSubmitRequest,
}) => {
  const [requestedBy, setRequestedBy] = useState('');
  const [reason, setReason] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (customer) {
      setRequestedBy(loadStoredDisbursementOfficer() || customer.disbursedBy || '');
      setReason('');
      setErrorMsg(null);
      setIsSubmitting(false);
    }
  }, [customer]);

  if (!customer) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestedBy.trim()) {
      setErrorMsg('Nama petugas pengaju wajib diisi.');
      return;
    }
    if (!reason.trim() || reason.trim().length < 4) {
      setErrorMsg('Alasan pembatalan pencairan wajib diisi minimal 4 karakter.');
      return;
    }

    try {
      setIsSubmitting(true);
      await onSubmitRequest(customer, requestedBy.trim(), reason.trim());
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Gagal mengirim pengajuan pembatalan.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-70 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
      <div
        className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
      >
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 shrink-0">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-bold truncate">Ajukan Pembatalan Pencairan</h2>
              <p className="text-[11px] text-slate-300 truncate">
                Memerlukan persetujuan (ACC) Admin terlebih dahulu
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200 space-y-1">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800">
                Konsumen Terkait
              </span>
              {customer.customerCode && (
                <span className="text-[10px] font-mono bg-white px-1.5 py-0.5 rounded border border-amber-200 text-slate-700">
                  {customer.customerCode}
                </span>
              )}
            </div>
            <div className="text-sm font-extrabold text-slate-900">{customer.customerName}</div>
            <div className="text-xs font-mono font-bold text-emerald-700">
              Dana Dicairkan: {formatRupiah(customer.disbursedCashback)}
            </div>
          </div>

          {errorMsg && (
            <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-medium">
              {errorMsg}
            </div>
          )}

          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
              Nama Petugas Pengaju <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <UserCheck className="w-4 h-4 text-emerald-600 absolute left-3 top-2.5" />
              <input
                type="text"
                value={requestedBy}
                onChange={(e) => setRequestedBy(e.target.value)}
                placeholder="Nama petugas..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-hidden focus:ring-1 focus:ring-slate-900"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
              Alasan Pembatalan Pencairan <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Jelaskan alasan pembatalan (misal: salah pilih konsumen, nominal belum sesuai, dll)..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:ring-1 focus:ring-slate-900"
            />
          </div>

          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 leading-relaxed">
            Setelah Admin menyetujui (ACC) pengajuan ini, tombol <strong>Lakukan Pembatalan Pencairan</strong> akan aktif di layar petugas.
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="min-h-[40px] px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="min-h-[40px] px-4 py-2 rounded-xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-60"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              <span>{isSubmitting ? 'Mengirim...' : 'Kirim Pengajuan ke Admin'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface AdminCancelApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  cancelRequests: DisbursementCancelRequest[];
  onApproveRequest: (requestId: string) => Promise<void>;
  onRejectRequest: (requestId: string) => Promise<void>;
}

export const AdminCancelApprovalModal: React.FC<AdminCancelApprovalModalProps> = ({
  isOpen,
  onClose,
  cancelRequests,
  onApproveRequest,
  onRejectRequest,
}) => {
  const [processingId, setProcessingId] = useState<string | null>(null);

  if (!isOpen) return null;

  const pendingRequests = cancelRequests.filter((r) => r.status === 'pending');
  const recentHistory = cancelRequests.filter((r) => r.status !== 'pending').slice(0, 10);

  const handleAction = async (id: string, action: 'approve' | 'reject') => {
    try {
      setProcessingId(id);
      if (action === 'approve') {
        await onApproveRequest(id);
      } else {
        await onRejectRequest(id);
      }
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-70 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
      <div
        className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
      >
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold">Persetujuan (ACC) Pembatalan Pencairan</h2>
              <p className="text-[11px] text-slate-300">
                Pengajuan pembatalan dari Petugas yang membutuhkan ACC Admin
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs flex-1">
          {pendingRequests.length === 0 ? (
            <div className="py-8 text-center border border-dashed border-slate-200 rounded-2xl text-slate-500">
              <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-500 opacity-70" />
              <p className="font-semibold text-slate-700">Tidak ada pengajuan pembatalan yang menunggu ACC</p>
              <p className="text-[11px] mt-0.5">Semua permintaan dari petugas telah diproses.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              <div className="text-[11px] font-bold uppercase tracking-wider text-amber-800 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                Menunggu Persetujuan Admin ({pendingRequests.length})
              </div>

              {pendingRequests.map((req) => (
                <div
                  key={req.id}
                  className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/40 space-y-2.5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-sm font-extrabold text-slate-900">
                          {req.customerName}
                        </span>
                        {req.customerCode && (
                          <span className="text-[10px] font-mono bg-white px-1.5 py-0.5 rounded border border-slate-200 text-slate-600">
                            {req.customerCode}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-600 mt-0.5">
                        Diajukan oleh: <strong className="text-slate-900">{req.requestedBy}</strong> ·{' '}
                        <span className="font-mono text-[10px] text-slate-500">
                          {new Date(req.requestedAt).toLocaleString('id-ID')}
                        </span>
                      </div>
                    </div>
                    <div className="text-right font-mono font-black text-emerald-700 text-sm">
                      {formatRupiah(req.amount)}
                    </div>
                  </div>

                  <div className="p-2.5 rounded-lg bg-white border border-amber-200/80 text-slate-700">
                    <span className="text-[10px] font-bold uppercase text-slate-400 block mb-0.5">
                      Alasan Pembatalan:
                    </span>
                    <p className="font-medium leading-relaxed">{req.reason}</p>
                  </div>

                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      disabled={processingId === req.id}
                      onClick={() => handleAction(req.id, 'reject')}
                      className="min-h-[36px] px-3 py-1.5 rounded-lg border border-rose-200 bg-white hover:bg-rose-50 text-rose-700 font-semibold flex items-center gap-1 transition-colors disabled:opacity-50"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Tolak</span>
                    </button>
                    <button
                      type="button"
                      disabled={processingId === req.id}
                      onClick={() => handleAction(req.id, 'approve')}
                      className="min-h-[36px] px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1.5 shadow-xs transition-colors disabled:opacity-50"
                    >
                      {processingId === req.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      )}
                      <span>ACC Pembatalan</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {recentHistory.length > 0 && (
            <div className="pt-3 border-t border-slate-200 space-y-2">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Riwayat Keputusan Terbaru
              </div>
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl bg-slate-50/50">
                {recentHistory.map((h) => (
                  <div key={h.id} className="p-2.5 flex items-center justify-between gap-2 text-[11px]">
                    <div className="min-w-0">
                      <span className="font-bold text-slate-800 truncate block">{h.customerName}</span>
                      <span className="text-slate-500 truncate block">
                        Petugas: {h.requestedBy} · "{h.reason}"
                      </span>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                        h.status === 'executed'
                          ? 'bg-slate-200 text-slate-700'
                          : h.status === 'approved'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-700'
                      }`}
                    >
                      {h.status === 'executed'
                        ? 'Selesai Dibatalkan'
                        : h.status === 'approved'
                          ? 'Di-ACC (Menunggu Eksekusi)'
                          : 'Ditolak'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
