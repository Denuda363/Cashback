import React, { useState, useRef } from 'react';
import { 
  X, 
  Settings as SettingsIcon, 
  Save, 
  Plus, 
  Trash2, 
  Percent, 
  CheckCircle2, 
  Layers, 
  Calculator,
  RefreshCw,
  ShieldCheck,
  Sidebar as SidebarIcon,
  LayoutTemplate,
  AlignVerticalSpaceAround,
  Cloud,
  Download,
  Upload,
  AlertTriangle,
  Archive,
  Database,
  FileJson,
  Loader2,
  BookOpen
} from 'lucide-react';
import { CashbackSettings, CustomerMaster, Invoice, NavPosition, TierRule } from '../types/cashback';
import { calculateCashback, formatRupiah } from '../utils/cashbackCalculator';
import { ConfirmDialog } from './ConfirmDialog';
import { AppBackupData, parseBackupJSON } from '../utils/storage';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: CashbackSettings;
  onSaveSettings: (newSettings: CashbackSettings) => void;
  onForceSyncCloud?: () => void;
  isSyncingWithCloud?: boolean;
  navPosition?: NavPosition;
  onChangeNavPosition?: (pos: NavPosition) => void;
  invoices: Invoice[];
  customers: CustomerMaster[];
  onBackupData: () => void;
  onRestoreBackup: (backup: AppBackupData) => Promise<void>;
  onWipeAllDataPermanent: () => Promise<void>;
  onOpenGuide?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
  onForceSyncCloud,
  isSyncingWithCloud = false,
  navPosition,
  onChangeNavPosition,
  invoices,
  customers,
  onBackupData,
  onRestoreBackup,
  onWipeAllDataPermanent,
  onOpenGuide,
}) => {
  const [mode, setMode] = useState<'flat' | 'tiered'>(settings.mode);
  const [flatPercentage, setFlatPercentage] = useState<number>(settings.flatPercentage);
  const [tiers, setTiers] = useState<TierRule[]>(settings.tiers);
  const [minPurchaseAmount, setMinPurchaseAmount] = useState<number>(settings.minPurchaseAmount);
  const [hasMaxCap, setHasMaxCap] = useState<boolean>(settings.maxCashbackPerTransaction !== null);
  const [maxCapValue, setMaxCapValue] = useState<number>(settings.maxCashbackPerTransaction || 1000000);
  const [rounding, setRounding] = useState<'exact' | 'round_hundred' | 'round_thousand'>(settings.rounding);
  const [claimValidityDays, setClaimValidityDays] = useState<number>(settings.claimValidityDays);
  const [storeName, setStoreName] = useState<string>(settings.storeName);
  
  // Danger zone & Backup states
  const [isConfirmWipeOpen, setIsConfirmWipeOpen] = useState(false);
  const [isWiping, setIsWiping] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [pendingBackupToRestore, setPendingBackupToRestore] = useState<AppBackupData | null>(null);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const restoreFileInputRef = useRef<HTMLInputElement>(null);

  // Live Simulator state
  const [simSpend, setSimSpend] = useState<number>(1500000);

  if (!isOpen) return null;

  const handleRestoreFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    setRestoreError(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const backup = parseBackupJSON(text);
        setPendingBackupToRestore(backup);
      } catch (err: any) {
        console.error('Failed to parse backup file:', err);
        setRestoreError(
          err?.message || 'File backup tidak valid. Pastikan file berformat .JSON cadangan dari sistem ini.'
        );
      } finally {
        if (restoreFileInputRef.current) restoreFileInputRef.current.value = '';
      }
    };
    reader.onerror = () => {
      setRestoreError('Gagal membaca file dari penyimpanan perangkat.');
      if (restoreFileInputRef.current) restoreFileInputRef.current.value = '';
    };
    reader.readAsText(selectedFile);
  };

  const handleConfirmRestore = async () => {
    if (!pendingBackupToRestore) return;
    try {
      setIsRestoring(true);
      await onRestoreBackup(pendingBackupToRestore);
      setPendingBackupToRestore(null);
      onClose();
    } catch (err) {
      console.error('Restore error:', err);
    } finally {
      setIsRestoring(false);
    }
  };

  const handleConfirmWipe = async () => {
    try {
      setIsWiping(true);
      await onWipeAllDataPermanent();
      setIsConfirmWipeOpen(false);
      onClose();
    } catch (err) {
      console.error('Wipe error:', err);
    } finally {
      setIsWiping(false);
    }
  };

  // Simulator calculation using current form inputs
  const currentDraftSettings: CashbackSettings = {
    mode,
    flatPercentage,
    tiers,
    minPurchaseAmount,
    maxCashbackPerTransaction: hasMaxCap ? maxCapValue : null,
    rounding,
    claimValidityDays,
    storeName,
    currency: 'IDR',
  };

  const simResult = calculateCashback(simSpend, currentDraftSettings);

  const handleAddTier = () => {
    const lastTier = tiers[tiers.length - 1];
    const newMin = lastTier ? (lastTier.maxSpend || lastTier.minSpend) + 1 : 1000000;
    const newTier: TierRule = {
      id: `tier-${Date.now()}`,
      minSpend: newMin,
      maxSpend: newMin + 2000000,
      percentage: Math.min(15, (lastTier?.percentage || 5) + 2.5),
      label: `Tier Baru (> Rp ${(newMin / 1000).toFixed(0)}rb)`,
    };
    setTiers([...tiers, newTier]);
  };

  const handleUpdateTier = (index: number, field: keyof TierRule, value: any) => {
    const updated = [...tiers];
    updated[index] = { ...updated[index], [field]: value };
    setTiers(updated);
  };

  const handleDeleteTier = (index: number) => {
    if (tiers.length <= 1) {
      alert('Minimal harus ada 1 tier aturan cashback.');
      return;
    }
    const updated = tiers.filter((_: TierRule, idx: number) => idx !== index);
    setTiers(updated);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings(currentDraftSettings);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2.5 sm:p-4">
      <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200 shadow-xl max-w-2xl w-full max-h-[94vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-4 py-3 sm:px-6 sm:py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2 sm:gap-2.5">
            <div className="p-1.5 sm:p-2 bg-slate-900 text-white rounded-lg">
              <SettingsIcon className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xs sm:text-sm font-bold text-slate-900">
                Pengaturan Persentase & Kebijakan Cashback
              </h2>
              <p className="text-[10px] sm:text-[11px] text-slate-500">
                Skema persentase, batas nominal belanja, dan aturan kalkulasi
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {onOpenGuide && (
              <button
                type="button"
                onClick={onOpenGuide}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors"
                title="Buka panduan lengkap penggunaan aplikasi"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Buku Panduan</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-3.5 sm:p-6 overflow-y-auto space-y-4 sm:space-y-5 flex-1 text-xs">
          
          {/* User Guide Card Banner */}
          {onOpenGuide && (
            <div className="p-3.5 sm:p-4 rounded-xl border border-emerald-200 bg-gradient-to-r from-emerald-50 via-teal-50 to-blue-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
              <div className="flex items-start sm:items-center gap-3">
                <div className="p-2 rounded-xl bg-emerald-700 text-white shrink-0 mt-0.5 sm:mt-0 shadow-xs">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-900 text-xs sm:text-sm">
                      Panduan Lengkap Penggunaan Aplikasi
                    </h3>
                    <span className="text-[10px] bg-emerald-600 text-white px-2 py-0.5 rounded-full font-bold">
                      Langkah demi Langkah
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                    Petunjuk detail mulai dari konfigurasi cashback, master konsumen, input faktur, kirim bukti WA, hingga backup database.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onOpenGuide}
                className="flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-xs transition-colors shrink-0"
              >
                <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
                <span>Buka Panduan Lengkap</span>
              </button>
            </div>
          )}

          {/* Store Name */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Nama Toko / Usaha</label>
            <input
              type="text"
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-slate-900"
              placeholder="Contoh: Toko Elektronik Berkah Jaya"
            />
          </div>

          {/* Navigation Position Layout Picker */}
          {onChangeNavPosition && navPosition && (
            <div>
              <label className="block font-semibold text-slate-700 mb-2">
                Tata Letak Posisi Navigasi (Slidebar / Bar Navigasi)
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => onChangeNavPosition('sidebar')}
                  className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                    navPosition === 'sidebar'
                      ? 'border-emerald-600 bg-emerald-50/50 shadow-xs'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <SidebarIcon className="w-4 h-4 text-emerald-600" />
                    {navPosition === 'sidebar' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                  </div>
                  <div>
                    <span className="font-bold text-slate-900 text-xs block">Di Samping</span>
                    <span className="text-[10px] text-slate-500">Sidebar elegan</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => onChangeNavPosition('top')}
                  className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                    navPosition === 'top'
                      ? 'border-emerald-600 bg-emerald-50/50 shadow-xs'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <LayoutTemplate className="w-4 h-4 text-emerald-600" />
                    {navPosition === 'top' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                  </div>
                  <div>
                    <span className="font-bold text-slate-900 text-xs block">Di Atas</span>
                    <span className="text-[10px] text-slate-500">Top bar modern</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => onChangeNavPosition('bottom')}
                  className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                    navPosition === 'bottom'
                      ? 'border-emerald-600 bg-emerald-50/50 shadow-xs'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <AlignVerticalSpaceAround className="w-4 h-4 text-emerald-600" />
                    {navPosition === 'bottom' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                  </div>
                  <div>
                    <span className="font-bold text-slate-900 text-xs block">Di Bawah</span>
                    <span className="text-[10px] text-slate-500">Dock jempol mobile</span>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* Mode Selector */}
          <div>
            <label className="block font-semibold text-slate-700 mb-2">
              Model Skema Cashback Konsumen
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setMode('flat')}
                className={`p-3.5 rounded-xl border text-left transition-all ${
                  mode === 'flat'
                    ? 'border-emerald-600 bg-emerald-50/50 shadow-xs'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Percent className="w-4 h-4 text-emerald-600" />
                    <span className="font-bold text-slate-900">Persentase Tetap (Flat)</span>
                  </div>
                  {mode === 'flat' && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Persentase cashback seragam (misal 5%) untuk semua nominal belanja.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setMode('tiered')}
                className={`p-3.5 rounded-xl border text-left transition-all ${
                  mode === 'tiered'
                    ? 'border-emerald-600 bg-emerald-50/50 shadow-xs'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-emerald-600" />
                    <span className="font-bold text-slate-900">Bertingkat (Tiered)</span>
                  </div>
                  {mode === 'tiered' && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Persentase reward meningkat bertahap seiring kenaikan nominal belanja.
                </p>
              </button>
            </div>
          </div>

          {/* Detail Settings based on Mode */}
          {mode === 'flat' ? (
            <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/40 space-y-3">
              <div className="flex items-center justify-between">
                <label className="block font-bold text-slate-900 text-xs">
                  Berapa Persen Cashback Tetap? (%)
                </label>
                <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                  Semua Perhitungan = {flatPercentage}%
                </span>
              </div>

              {/* Quick preset buttons */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] text-slate-500 font-medium mr-1">Pilihan Cepat:</span>
                {[1, 2, 3, 4, 5, 7.5, 10].map((rate) => (
                  <button
                    key={rate}
                    type="button"
                    onClick={() => setFlatPercentage(rate)}
                    className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition-all ${
                      flatPercentage === rate
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs scale-105'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    {rate}%
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-3">
                <div className="relative w-36">
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    max="100"
                    required
                    value={flatPercentage}
                    onChange={(e) => setFlatPercentage(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-base font-bold font-mono text-slate-900 focus:ring-2 focus:ring-emerald-500"
                  />
                  <span className="absolute right-3 top-2.5 font-bold text-slate-500">%</span>
                </div>
                <div className="text-slate-600 text-[11px] space-y-0.5">
                  <p className="font-semibold text-slate-800">
                    Jika diatur {flatPercentage}%, maka SEMUA perhitungan faktur & rekap otomatis menjadi {flatPercentage}%.
                  </p>
                  <p className="text-slate-500">
                    Contoh: Belanja Rp 5.000.000 × {flatPercentage}% = <span className="font-bold text-emerald-700">Rp {Math.round(5000000 * (flatPercentage / 100)).toLocaleString('id-ID')}</span> (Fatur)
                  </p>
                  <p className="text-slate-500">
                    Contoh: Belanja Rp 4.000.000 × {flatPercentage}% = <span className="font-bold text-emerald-700">Rp {Math.round(4000000 * (flatPercentage / 100)).toLocaleString('id-ID')}</span> (fabio)
                  </p>
                </div>
              </div>

              <div className="p-2.5 bg-white/80 rounded-lg border border-emerald-100 text-[11px] text-emerald-900 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  Rumus export Excel akan otomatis berubah menjadi <code className="font-mono bg-emerald-100 px-1 py-0.5 rounded text-emerald-900 font-bold">=ROUND(C2*{flatPercentage}%, 0)</code>
                </span>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900">Daftar Tingkatan (Tiers) Cashback</h3>
                  <p className="text-[11px] text-slate-500">
                    Sistem otomatis memilih persentase tertinggi sesuai rentang belanja faktur
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAddTier}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-md border border-emerald-200"
                >
                  <Plus className="w-3.5 h-3.5" /> Tambah Tier
                </button>
              </div>

              <div className="space-y-2">
                {tiers.map((tier: TierRule, idx: number) => (
                  <div
                    key={tier.id}
                    className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div>
                        <span className="text-[10px] text-slate-500 block">Nama / Label Tier</span>
                        <input
                          type="text"
                          value={tier.label}
                          onChange={(e) => handleUpdateTier(idx, 'label', e.target.value)}
                          className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-xs font-medium"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block">Min Belanja (Rp)</span>
                        <input
                          type="number"
                          value={tier.minSpend}
                          onChange={(e) => handleUpdateTier(idx, 'minSpend', Number(e.target.value) || 0)}
                          className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-xs font-mono"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block">Maks Belanja (0 = Unbounded)</span>
                        <input
                          type="number"
                          value={tier.maxSpend === null ? 0 : tier.maxSpend}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            handleUpdateTier(idx, 'maxSpend', val <= 0 ? null : val);
                          }}
                          className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-xs font-mono"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <div>
                        <span className="text-[10px] text-slate-500 block">% Cashback</span>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            step="0.1"
                            value={tier.percentage}
                            onChange={(e) => handleUpdateTier(idx, 'percentage', parseFloat(e.target.value) || 0)}
                            className="w-16 px-2 py-1 bg-white border border-slate-300 rounded text-xs font-bold font-mono"
                          />
                          <span className="font-bold text-slate-600">%</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteTier(idx)}
                        className="p-1.5 text-slate-400 hover:text-red-700 rounded mt-3"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Limits & Rules */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Minimal Belanja untuk Dapat Cashback (Rp)
              </label>
              <input
                type="number"
                value={minPurchaseAmount}
                onChange={(e) => setMinPurchaseAmount(Number(e.target.value) || 0)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono text-xs"
              />
              <span className="text-[11px] text-slate-500 mt-0.5 block">
                Faktur di bawah nominal ini akan mendapatkan cashback Rp 0.
              </span>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-semibold text-slate-700">Maksimal Cashback per Faktur</label>
                <label className="flex items-center gap-1 text-[11px] text-slate-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasMaxCap}
                    onChange={(e) => setHasMaxCap(e.target.checked)}
                    className="rounded text-emerald-600"
                  />
                  <span>Pasang Batas Cap</span>
                </label>
              </div>
              <input
                type="number"
                disabled={!hasMaxCap}
                value={hasMaxCap ? maxCapValue : 0}
                onChange={(e) => setMaxCapValue(Number(e.target.value) || 0)}
                className={`w-full px-3 py-2 border rounded-lg font-mono text-xs ${
                  hasMaxCap ? 'bg-slate-50 border-slate-200' : 'bg-slate-100 text-slate-400 border-slate-200'
                }`}
              />
              <span className="text-[11px] text-slate-500 mt-0.5 block">
                {hasMaxCap ? `Maksimal reward dibatasi ${formatRupiah(maxCapValue)}` : 'Tidak dibatasi'}
              </span>
            </div>
          </div>

          {/* Live Simulator Preview */}
          <div className="p-4 rounded-xl border border-emerald-300 bg-emerald-50/50 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calculator className="w-4 h-4 text-emerald-700" />
                <h3 className="font-bold text-slate-900">Simulator Pengujian Nilai Belanja</h3>
              </div>
              <span className="text-[11px] font-semibold text-emerald-800">Uji Coba Pengaturan</span>
            </div>
            <p className="text-[11px] text-slate-600">
              Ketik nominal belanja di bawah ini untuk melihat hasil kalkulasi sebelum menyimpan aturan:
            </p>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-1">
              <div className="relative flex-1">
                <span className="absolute left-3 top-2 font-mono font-bold text-slate-500">Rp</span>
                <input
                  type="number"
                  value={simSpend}
                  onChange={(e) => setSimSpend(Number(e.target.value) || 0)}
                  className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg font-mono font-bold text-slate-900"
                />
              </div>

              <div className="p-2.5 bg-white rounded-lg border border-emerald-200 flex items-center justify-between sm:justify-start gap-4 text-xs">
                <div>
                  <span className="text-[10px] text-slate-500 block">Rate Efektif:</span>
                  <span className="font-bold text-slate-800 font-mono">{simResult.effectivePercentage}%</span>
                </div>
                <div className="border-l border-slate-200 pl-3">
                  <span className="text-[10px] text-slate-500 block">Hasil Cashback:</span>
                  <span className="font-extrabold text-emerald-700 font-mono text-sm">{formatRupiah(simResult.cashbackAmount)}</span>
                </div>
              </div>
            </div>
            <div className="text-[11px] text-slate-500 font-mono">
              Formula: {simResult.breakdown}
            </div>
          </div>

          {/* Cloud Database Integration Status & Auto Table Check */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/80 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cloud className="w-4 h-4 text-emerald-600" />
                <h3 className="font-bold text-slate-900 text-xs">
                  Status Database Cloud (Firebase Firestore)
                </h3>
              </div>
              <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Terkoneksi Otomatis
              </span>
            </div>

            <p className="text-[11px] text-slate-600">
              Database aktif dan tersinkronisasi otomatis tanpa perlu login. Tabel-tabel yang dibutuhkan otomatis dibuat di cloud:
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
              <div className="p-2.5 bg-white rounded-lg border border-slate-200 shadow-2xs">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="font-mono font-bold text-slate-800">/invoices</span>
                  <span className="text-[10px] text-emerald-600 font-bold">✓ Siap</span>
                </div>
                <span className="text-[10px] text-slate-500 block">Tabel Rekap Faktur</span>
              </div>
              <div className="p-2.5 bg-white rounded-lg border border-slate-200 shadow-2xs">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="font-mono font-bold text-slate-800">/customers</span>
                  <span className="text-[10px] text-emerald-600 font-bold">✓ Siap</span>
                </div>
                <span className="text-[10px] text-slate-500 block">Tabel Master Konsumen</span>
              </div>
              <div className="p-2.5 bg-white rounded-lg border border-slate-200 shadow-2xs">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="font-mono font-bold text-slate-800">/settings</span>
                  <span className="text-[10px] text-emerald-600 font-bold">✓ Siap</span>
                </div>
                <span className="text-[10px] text-slate-500 block">Tabel Aturan & Persen</span>
              </div>
              <div className="p-2.5 bg-white rounded-lg border border-slate-200 shadow-2xs">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="font-mono font-bold text-slate-800">/system</span>
                  <span className="text-[10px] text-emerald-600 font-bold">✓ Siap</span>
                </div>
                <span className="text-[10px] text-slate-500 block">Tabel Metadata Sistem</span>
              </div>
            </div>

            {onForceSyncCloud && (
              <div className="pt-2 border-t border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="text-[11px] text-slate-500">
                  Pastikan seluruh data faktur dan konsumen terunggah ke database cloud:
                </span>
                <button
                  type="button"
                  disabled={isSyncingWithCloud}
                  onClick={onForceSyncCloud}
                  className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors disabled:opacity-50 shrink-0"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncingWithCloud ? 'animate-spin' : ''}`} />
                  <span>{isSyncingWithCloud ? 'Menyinkronkan...' : 'Sinkronkan Sekarang'}</span>
                </button>
              </div>
            )}
          </div>

          {/* Section: Backup & Restore Data */}
          <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/50 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Archive className="w-4 h-4 text-blue-700" />
                <h3 className="font-bold text-slate-900 text-xs">
                  Backup & Pemulihan Data
                </h3>
              </div>
              <span className="text-[10px] font-semibold text-blue-800 bg-blue-100 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <FileJson className="w-3 h-3 text-blue-700" />
                Format Cadangan .JSON
              </span>
            </div>

            <p className="text-[11px] text-slate-600 leading-relaxed">
              Unduh salinan cadangan lengkap seluruh data faktur ({invoices.length} faktur), master konsumen ({customers.length} konsumen), dan konfigurasi toko. File dapat disimpan di komputer/HP dan dipulihkan (restore) sewaktu-waktu.
            </p>

            {restoreError && (
              <div className="p-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{restoreError}</span>
              </div>
            )}

            <div className="pt-2 border-t border-blue-200/70 flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={onBackupData}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg shadow-2xs transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Unduh Backup Data (.JSON)</span>
              </button>

              <button
                type="button"
                onClick={() => restoreFileInputRef.current?.click()}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-blue-800 bg-white hover:bg-blue-100 border border-blue-300 rounded-lg transition-colors"
              >
                <Upload className="w-3.5 h-3.5 text-blue-700" />
                <span>Pulihkan / Restore dari Backup</span>
              </button>

              <input
                ref={restoreFileInputRef}
                type="file"
                accept=".json,application/json"
                className="hidden"
                onChange={handleRestoreFileSelected}
              />
            </div>
          </div>

          {/* Section: Hapus Semua Data Permanen (Zona Bahaya) */}
          <div className="p-4 rounded-xl border border-red-300 bg-red-50/50 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                <h3 className="font-bold text-red-950 text-xs">
                  Hapus Semua Data Permanen
                </h3>
              </div>
              <span className="text-[10px] font-bold text-red-700 bg-red-100 border border-red-200 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                Tindakan Permanen & Tidak Dapat Dibatalkan
              </span>
            </div>

            <p className="text-[11px] text-red-800 leading-relaxed">
              Tindakan ini akan mengosongkan dan menghapus SELURUH <strong className="font-bold">{invoices.length} faktur transaksi</strong> serta <strong className="font-bold">{customers.length} master data konsumen</strong> secara permanen dari penyimpanan browser lokal dan Cloud Firebase Firestore.
            </p>

            <div className="pt-2 border-t border-red-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="text-[11px] text-red-700 font-medium">
                Saran: Unduh file Backup Data di atas terlebih dahulu sebelum menghapus.
              </span>

              <button
                type="button"
                onClick={() => setIsConfirmWipeOpen(true)}
                className="flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-2xs transition-colors shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Hapus Semua Data Permanen</span>
              </button>
            </div>
          </div>

          {/* Modal Actions */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              Tutup
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              <span>Terapkan Pengaturan</span>
            </button>
          </div>

        </form>

      </div>

      {/* Restore Confirmation Dialog */}
      <ConfirmDialog
        isOpen={pendingBackupToRestore !== null}
        title="Konfirmasi Pemulihan Data (Restore)"
        message={`Pulihkan ${pendingBackupToRestore?.totalInvoices} faktur dan ${pendingBackupToRestore?.totalCustomers} konsumen dari file cadangan (${pendingBackupToRestore?.storeName})? Seluruh data faktur dan konsumen saat ini akan digantikan dan disinkronkan ke Cloud Firebase.`}
        confirmLabel="Ya, Pulihkan Sekarang"
        cancelLabel="Batal"
        isDestructive={false}
        isLoading={isRestoring}
        loadingText="Memulihkan ke Cloud & Lokal..."
        onConfirm={handleConfirmRestore}
        onCancel={() => setPendingBackupToRestore(null)}
      />

      {/* Permanent Wipe Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isConfirmWipeOpen}
        title="Hapus SEMUA Data Secara Permanen"
        message={`PERINGATAN: Tindakan ini akan menghapus permanen ${invoices.length} faktur transaksi dan ${customers.length} master konsumen dari penyimpanan lokal (browser) serta Cloud Firebase Firestore. Data yang terhapus TIDAK DAPAT DIPULIHKAN.`}
        confirmLabel="Hapus Semua Data Permanen"
        cancelLabel="Batal"
        isDestructive={true}
        requireText="HAPUS"
        isLoading={isWiping}
        loadingText="Menghapus Cloud & Lokal..."
        onConfirm={handleConfirmWipe}
        onCancel={() => setIsConfirmWipeOpen(false)}
      />

    </div>
  );
};
