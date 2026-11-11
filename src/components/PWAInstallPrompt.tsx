import React, { useState } from 'react';
import { 
  Download, 
  Smartphone, 
  Monitor, 
  Share, 
  PlusSquare, 
  CheckCircle2, 
  X, 
  Sparkles, 
  ArrowRight,
  ExternalLink,
  Laptop
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PWAInstallModal: React.FC<PWAInstallModalProps> = ({ isOpen, onClose }) => {
  const { hasNativePrompt, promptInstall, isIOS, isStandalone } = usePWAInstall();
  const [activeTab, setActiveTab] = useState<'android' | 'ios' | 'desktop'>(
    isIOS ? 'ios' : 'android'
  );
  const [isInstalling, setIsInstalling] = useState(false);
  const [installSuccess, setInstallSuccess] = useState(false);

  if (!isOpen) return null;

  const handleDirectInstall = async () => {
    setIsInstalling(true);
    const result = await promptInstall();
    setIsInstalling(false);
    if (result) {
      setInstallSuccess(true);
      setTimeout(() => {
        onClose();
      }, 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 p-0.5 shadow-md flex items-center justify-center">
              <img 
                src="/icon.svg" 
                alt="CashbackPro" 
                className="w-9 h-9 object-contain rounded-lg"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm sm:text-base text-white">Instal CashbackPro</h3>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-2 py-0.5 rounded-full font-semibold">
                  Semua Perangkat
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Akses cepat dari layar utama, bekerja offline, tanpa iklan
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Standalone status alert */}
        {isStandalone ? (
          <div className="p-4 bg-emerald-50 border-b border-emerald-200 flex items-center gap-3 text-emerald-800 text-xs">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <div>
              <p className="font-bold">Aplikasi Sudah Terpasang!</p>
              <p className="text-emerald-700 text-[11px]">
                Anda sudah menjalankan CashbackPro dalam mode aplikasi mandiri (PWA).
              </p>
            </div>
          </div>
        ) : null}

        {/* Direct One-Click Install Banner (if browser triggers native prompt) */}
        {hasNativePrompt && !isStandalone && (
          <div className="p-4 bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-emerald-200">
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-0.5">
                <span className="text-[10px] uppercase tracking-wider font-extrabold text-emerald-700 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-emerald-600" /> Siap Pasang Langsung
                </span>
                <p className="text-xs font-bold text-slate-900">
                  Browser Anda mendukung instalasi 1-klik
                </p>
              </div>
              <button
                type="button"
                onClick={handleDirectInstall}
                disabled={isInstalling || installSuccess}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-1.5 shrink-0"
              >
                {installSuccess ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" /> Terpasang!
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" /> {isInstalling ? 'Memasang...' : 'Pasang Sekarang'}
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Tabs for OS Guide */}
        <div className="flex border-b border-slate-200 bg-slate-50 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('android')}
            className={`flex-1 py-3 px-2 text-center flex items-center justify-center gap-1.5 border-b-2 transition-all ${
              activeTab === 'android'
                ? 'border-emerald-600 text-emerald-700 bg-white font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Android</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('ios')}
            className={`flex-1 py-3 px-2 text-center flex items-center justify-center gap-1.5 border-b-2 transition-all ${
              activeTab === 'ios'
                ? 'border-emerald-600 text-emerald-700 bg-white font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>iPhone / iPad</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('desktop')}
            className={`flex-1 py-3 px-2 text-center flex items-center justify-center gap-1.5 border-b-2 transition-all ${
              activeTab === 'desktop'
                ? 'border-emerald-600 text-emerald-700 bg-white font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Laptop className="w-3.5 h-3.5" />
            <span>Windows / Mac</span>
          </button>
        </div>

        {/* Guide Content */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs text-slate-700 flex-1">
          {activeTab === 'android' && (
            <div className="space-y-3">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="font-bold text-slate-900 block mb-1">
                  Langkah Instalasi di Android (Chrome, Edge, Samsung Internet):
                </span>
                <ol className="space-y-2.5 mt-2">
                  <li className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center shrink-0 text-[11px]">
                      1
                    </span>
                    <div>
                      <p className="font-semibold text-slate-900">Buka Menu Browser</p>
                      <p className="text-slate-500 text-[11px]">
                        Ketuk tombol ikon titik tiga (<strong>⋮</strong>) di sudut kanan atas browser Chrome/Edge.
                      </p>
                    </div>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center shrink-0 text-[11px]">
                      2
                    </span>
                    <div>
                      <p className="font-semibold text-slate-900">Pilih Instal Aplikasi</p>
                      <p className="text-slate-500 text-[11px]">
                        Pilih menu <strong className="text-emerald-700">"Instal aplikasi"</strong> atau <strong className="text-emerald-700">"Tambahkan ke Layar Utama"</strong> (Add to Home screen).
                      </p>
                    </div>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center shrink-0 text-[11px]">
                      3
                    </span>
                    <div>
                      <p className="font-semibold text-slate-900">Konfirmasi Pemasangan</p>
                      <p className="text-slate-500 text-[11px]">
                        Ketuk <strong>"Instal"</strong>. Ikon CashbackPro akan otomatis muncul di layar utama Android dan siap dibuka seperti aplikasi asli.
                      </p>
                    </div>
                  </li>
                </ol>
              </div>
            </div>
          )}

          {activeTab === 'ios' && (
            <div className="space-y-3">
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-[11px]">
                <p className="font-bold">Tips untuk Pengguna Apple iOS:</p>
                <p>
                  Gunakan browser <strong>Safari</strong> bawaan iPhone/iPad untuk menginstal aplikasi ke Layar Utama.
                </p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="font-bold text-slate-900 block mb-1">
                  Langkah Instalasi di iPhone / iPad (Safari):
                </span>
                <ol className="space-y-2.5 mt-2">
                  <li className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-800 font-bold flex items-center justify-center shrink-0 text-[11px]">
                      1
                    </span>
                    <div>
                      <p className="font-semibold text-slate-900 flex items-center gap-1.5">
                        <span>Ketuk Tombol Bagikan</span>
                        <Share className="w-3.5 h-3.5 text-blue-600 inline" />
                      </p>
                      <p className="text-slate-500 text-[11px]">
                        Ketuk ikon <strong>Bagikan / Share</strong> (kotak dengan panah ke atas) di bilah navigasi bawah Safari.
                      </p>
                    </div>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-800 font-bold flex items-center justify-center shrink-0 text-[11px]">
                      2
                    </span>
                    <div>
                      <p className="font-semibold text-slate-900 flex items-center gap-1.5">
                        <span>Pilih Tambah ke Layar Utama</span>
                        <PlusSquare className="w-3.5 h-3.5 text-slate-700 inline" />
                      </p>
                      <p className="text-slate-500 text-[11px]">
                        Gulir menu ke bawah dan ketuk opsi <strong>"Tambah ke Layar Utama"</strong> (Add to Home Screen).
                      </p>
                    </div>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-800 font-bold flex items-center justify-center shrink-0 text-[11px]">
                      3
                    </span>
                    <div>
                      <p className="font-semibold text-slate-900">Selesai</p>
                      <p className="text-slate-500 text-[11px]">
                        Ketuk <strong>"Tambah"</strong> di pojok kanan atas. CashbackPro akan langsung terpasang di Home Screen iPhone/iPad Anda.
                      </p>
                    </div>
                  </li>
                </ol>
              </div>
            </div>
          )}

          {activeTab === 'desktop' && (
            <div className="space-y-3">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="font-bold text-slate-900 block mb-1">
                  Langkah Instalasi di PC / Laptop (Windows, Mac, Linux):
                </span>
                <ol className="space-y-2.5 mt-2">
                  <li className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-800 font-bold flex items-center justify-center shrink-0 text-[11px]">
                      1
                    </span>
                    <div>
                      <p className="font-semibold text-slate-900">Buka di Chrome atau Edge</p>
                      <p className="text-slate-500 text-[11px]">
                        Buka aplikasi ini menggunakan browser Google Chrome, Microsoft Edge, atau browser berbasis Chromium lainnya.
                      </p>
                    </div>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-800 font-bold flex items-center justify-center shrink-0 text-[11px]">
                      2
                    </span>
                    <div>
                      <p className="font-semibold text-slate-900">Klik Ikon Instal di Bilah Alamat (URL bar)</p>
                      <p className="text-slate-500 text-[11px]">
                        Di ujung kanan kotak alamat web (URL bar), klik ikon <strong>Instal</strong> (ikon komputer dengan panah ke bawah atau tanda tambah ⊕).
                      </p>
                    </div>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-800 font-bold flex items-center justify-center shrink-0 text-[11px]">
                      3
                    </span>
                    <div>
                      <p className="font-semibold text-slate-900">Klik "Instal"</p>
                      <p className="text-slate-500 text-[11px]">
                        Aplikasi akan terbuka dalam jendela desktop tersendiri dan ikon shortcut akan tersedia di Desktop / Start Menu.
                      </p>
                    </div>
                  </li>
                </ol>
              </div>
            </div>
          )}

          {/* Benefits summary */}
          <div className="grid grid-cols-3 gap-2 pt-1 text-center">
            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-base block mb-0.5">⚡</span>
              <span className="font-bold text-[11px] text-slate-900 block">Lebih Cepat</span>
              <span className="text-[10px] text-slate-500">Cache offline instan</span>
            </div>
            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-base block mb-0.5">📱</span>
              <span className="font-bold text-[11px] text-slate-900 block">Layar Penuh</span>
              <span className="text-[10px] text-slate-500">Bebas bilah browser</span>
            </div>
            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-base block mb-0.5">☁️</span>
              <span className="font-bold text-[11px] text-slate-900 block">Sinkronisasi</span>
              <span className="text-[10px] text-slate-500">Cloud Firebase</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <span className="text-[11px] text-slate-500 hidden sm:inline">
            CashbackPro PWA v1.0.0
          </span>
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition-colors"
          >
            Tutup
          </button>
        </div>

      </div>
    </div>
  );
};

export const PWAInstallButton: React.FC<{
  className?: string;
  variant?: 'primary' | 'outline' | 'ghost' | 'chip';
}> = ({ className = '', variant = 'outline' }) => {
  const { isStandalone, promptInstall, hasNativePrompt } = usePWAInstall();
  const [isModalOpen, setIsModalOpen] = useState(false);

  // If already standalone, we don't need to push installation
  if (isStandalone) {
    return (
      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg">
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
        <span>Terinstal</span>
      </div>
    );
  }

  const handleClick = async () => {
    if (hasNativePrompt) {
      const ok = await promptInstall();
      if (!ok) {
        setIsModalOpen(true);
      }
    } else {
      setIsModalOpen(true);
    }
  };

  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return 'bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-xs';
      case 'chip':
        return 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-semibold text-xs';
      case 'ghost':
        return 'text-slate-700 hover:bg-slate-100 hover:text-slate-900';
      case 'outline':
      default:
        return 'bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 shadow-2xs font-semibold';
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg transition-all ${getVariantStyles()} ${className}`}
        title="Instal CashbackPro ke perangkat ini (PWA)"
      >
        <Download className="w-3.5 h-3.5 text-emerald-600" />
        <span>Instal App</span>
      </button>

      <PWAInstallModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
};
