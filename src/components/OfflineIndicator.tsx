import { useState, useEffect } from 'react';
import { Wifi, WifiOff } from 'lucide-react';

export function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowReconnected(true);
      const timer = setTimeout(() => {
        setShowReconnected(false);
      }, 4000);
      return () => clearTimeout(timer);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowReconnected(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline && !showReconnected) {
    return null;
  }

  if (showReconnected) {
    return (
      <div className="fixed bottom-4 right-4 z-50 animate-in fade-in slide-in-from-bottom duration-300 print:hidden">
        <div className="flex items-center gap-2.5 px-4 py-2.5 bg-emerald-600 text-white text-xs font-semibold rounded-xl shadow-lg border border-emerald-500">
          <Wifi className="w-4 h-4 text-emerald-100" />
          <span>Koneksi Pulih! Tersambung kembali ke Cloud.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 animate-in fade-in slide-in-from-bottom duration-300 max-w-sm print:hidden">
      <div className="flex items-center gap-3 px-4 py-3 bg-amber-500 text-white text-xs font-medium rounded-xl shadow-xl border border-amber-600">
        <WifiOff className="w-5 h-5 shrink-0 text-amber-100" />
        <div>
          <p className="font-bold">Mode Offline Aktif</p>
          <p className="text-amber-100 text-[11px] leading-tight">
            Aplikasi tetap dapat digunakan. Data tersimpan di perangkat Anda.
          </p>
        </div>
      </div>
    </div>
  );
}
