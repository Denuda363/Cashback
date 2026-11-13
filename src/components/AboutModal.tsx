import React from 'react';
import { X, Receipt, Copyright, Code2, ShieldCheck, Sparkles, CheckCircle2 } from 'lucide-react';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
  storeName?: string;
}

export const AboutModal: React.FC<AboutModalProps> = ({
  isOpen,
  onClose,
  storeName = 'CashbackPro',
}) => {
  if (!isOpen) return null;

  const features = [
    'Rekapitulasi faktur & akumulasi cashback konsumen secara otomatis',
    'Manajemen benefit fleksibel (Cashback + Parsel, Cashback, atau Parsel)',
    'Pencatatan serah terima lengkap dengan foto bukti & tanda tangan digital',
    'Cetak & PDF tanda terima resmi serah terima cashback 2 rangkap',
    'Impor & ekspor laporan Excel (.xlsx) serta sinkronisasi cloud otomatis',
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 backdrop-blur-xs p-3 sm:p-4 print:hidden"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="about-modal-title"
    >
      <div
        className="w-full max-w-lg bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-sm shrink-0">
              <Receipt className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 id="about-modal-title" className="text-base font-bold tracking-tight text-white truncate">
                  Tentang Aplikasi
                </h2>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  Versi 2.0
                </span>
              </div>
              <p className="text-xs text-slate-300 truncate">
                {storeName} — Manajemen Cashback &amp; Rekapitulasi Konsumen
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors shrink-0"
            aria-label="Tutup jendela Tentang Aplikasi"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto text-sm text-slate-700">
          {/* App Description */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-800">
              <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Ringkasan Sistem</span>
            </div>
            <p className="text-xs sm:text-[13px] leading-relaxed text-slate-600">
              Aplikasi manajemen transaksi, perhitungan cashback bertingkat maupun persentase tetap,
              pencatatan serah terima reward, serta pelaporan resmi untuk mendukung transparansi
              dan ketertiban administrasi kepada konsumen.
            </p>
            <ul className="space-y-1.5 pt-1">
              {features.map((item) => (
                <li key={item} className="flex items-start gap-2 text-xs text-slate-600">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Developer / Creator Card */}
          <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-900">
                <Code2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Developer &amp; Pencipta Aplikasi</span>
              </div>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-white text-emerald-800 border border-emerald-200">
                Official Creator
              </span>
            </div>
            <div className="flex items-center gap-3 pt-1">
              <div className="w-11 h-11 rounded-xl bg-slate-900 text-white font-extrabold text-base flex items-center justify-center shadow-xs shrink-0">
                D
              </div>
              <div className="min-w-0">
                <div className="text-base font-extrabold text-slate-900 tracking-tight">
                  Denuda
                </div>
                <div className="text-xs text-emerald-800 font-medium">
                  Developer &amp; Pencipta Aplikasi
                </div>
              </div>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed pt-1">
              Dirancang, dikembangkan, dan dipelihara oleh <strong className="text-slate-900">Denuda</strong> sebagai pencipta asli aplikasi ini untuk menghadirkan pencatatan cashback yang cepat, akurat, rapi, dan mudah digunakan.
            </p>
          </div>

          {/* Copyright Card */}
          <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-2 shadow-2xs">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-800">
              <Copyright className="w-4 h-4 text-slate-700 shrink-0" />
              <span>Hak Cipta Aplikasi</span>
            </div>
            <div className="text-xs sm:text-[13px] font-bold text-slate-900">
              Hak Cipta &copy; 2026 Denuda. Seluruh Hak Cipta Dilindungi.
            </div>
            <p className="text-xs leading-relaxed text-slate-600">
              Seluruh komponen perangkat lunak, kode sumber, arsitektur sistem, tata letak antarmuka,
              dan rancangan dokumen tanda terima pada aplikasi ini merupakan karya cipta milik{' '}
              <strong className="text-slate-900">Denuda</strong> dan dilindungi oleh ketentuan hukum hak cipta yang berlaku.
              Dilarang menyalin, memodifikasi, memperbanyak, atau mendistribusikan ulang sebagian maupun
              seluruh bagian aplikasi tanpa izin tertulis dari pencipta.
            </p>
            <div className="flex items-center gap-1.5 pt-1 text-[11px] font-medium text-slate-500">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Lisensi Penggunaan Resmi &middot; Hak Cipta Terdaftar atas nama Denuda</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
          <span className="text-[11px] font-medium text-slate-500">
            &copy; 2026 Denuda &middot; Developer &amp; Pencipta
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
