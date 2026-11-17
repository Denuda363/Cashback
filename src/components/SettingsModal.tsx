import React, { useState, useRef, useEffect } from 'react';
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
  BookOpen,
  Smartphone,
  Building2,
  MapPin,
  Phone,
  Mail,
  Globe,
  CreditCard,
  User,
  Shield,
  FileText,
  Image as ImageIcon,
  Lock,
  KeyRound,
  Eye,
  EyeOff,
  Palette,
  Sparkles,
  Box,
  Gem,
  Orbit,
  Clock,
  Watch,
  Flame,
  Cpu,
  Type,
  CircleDot,
  Crown,
  Hexagon,
  Sun,
} from 'lucide-react';
import { AppTheme, CashbackSettings, ClockStyle, CustomerMaster, Invoice, NavPosition, TierRule, CompanyProfile } from '../types/cashback';
import { calculateCashback, formatRupiah } from '../utils/cashbackCalculator';
import { ConfirmDialog } from './ConfirmDialog';
import { AppBackupData, parseBackupJSON } from '../utils/storage';
import { PWAInstallModal, PWAInstallButton } from './PWAInstallPrompt';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: CashbackSettings;
  onSaveSettings: (newSettings: CashbackSettings) => void;
  onForceSyncCloud?: () => void;
  isSyncingWithCloud?: boolean;
  navPosition?: NavPosition;
  onChangeNavPosition?: (pos: NavPosition) => void;
  appTheme?: AppTheme;
  onChangeAppTheme?: (theme: AppTheme) => void;
  clockStyle?: ClockStyle;
  onChangeClockStyle?: (style: ClockStyle) => void;
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
  appTheme = 'classic',
  onChangeAppTheme,
  clockStyle = 'chronograph',
  onChangeClockStyle,
  invoices,
  customers,
  onBackupData,
  onRestoreBackup,
  onWipeAllDataPermanent,
  onOpenGuide,
}) => {
  // Navigation Tabs inside Settings
  const [activeTab, setActiveTab] = useState<'rules' | 'company' | 'database'>('rules');

  // Cashback Rules State
  const [mode, setMode] = useState<'flat' | 'tiered'>(settings.mode);
  const [flatPercentage, setFlatPercentage] = useState<number>(settings.flatPercentage);
  const [tiers, setTiers] = useState<TierRule[]>(settings.tiers);
  const [tierError, setTierError] = useState<string | null>(null);
  const [hasMaxCap, setHasMaxCap] = useState<boolean>(settings.maxCashbackPerTransaction !== null);
  const [maxCapValue, setMaxCapValue] = useState<number>(settings.maxCashbackPerTransaction || 1000000);
  const [rounding, setRounding] = useState<'exact' | 'round_hundred' | 'round_thousand'>(settings.rounding);
  const [claimValidityDays, setClaimValidityDays] = useState<number>(settings.claimValidityDays);
  const [storeName, setStoreName] = useState<string>(settings.storeName || 'Mitra Niaga Utama');

  // Company Profile State (Profil Perusahaan)
  const initialCompany = settings.companyProfile || {
    companyName: settings.storeName || 'Mitra Niaga Utama',
    tagline: 'Distributor & Retail Produk Berkualitas',
    address: 'Jl. Jenderal Sudirman No. 88, Kawasan Niaga Terpadu',
    city: 'Jakarta Pusat',
    phone: '0812-3456-7890',
    email: 'info@mitraniagautama.com',
    website: 'www.mitraniagautama.com',
    taxNumber: '01.234.567.8-012.000',
    picName: 'H. Sudirman, S.E.',
    picTitle: 'Finance & Store Manager',
    bankName: 'BCA',
    bankAccountNumber: '8830-1928-11',
    bankAccountHolder: 'PT Mitra Niaga Utama',
    footerNotes: 'Terima kasih atas kerja sama dan kemitraan setia Anda.',
  };

  const [companyName, setCompanyName] = useState<string>(initialCompany.companyName || settings.storeName || '');
  const [logoUrl, setLogoUrl] = useState<string>(initialCompany.logoUrl || '');
  const [logoError, setLogoError] = useState<string | null>(null);
  const logoFileInputRef = useRef<HTMLInputElement>(null);
  const [tagline, setTagline] = useState<string>(initialCompany.tagline || '');
  const [address, setAddress] = useState<string>(initialCompany.address || '');
  const [city, setCity] = useState<string>(initialCompany.city || '');
  const [phone, setPhone] = useState<string>(initialCompany.phone || '');
  const [email, setEmail] = useState<string>(initialCompany.email || '');
  const [website, setWebsite] = useState<string>(initialCompany.website || '');
  const [taxNumber, setTaxNumber] = useState<string>(initialCompany.taxNumber || '');
  const [picName, setPicName] = useState<string>(initialCompany.picName || '');
  const [picTitle, setPicTitle] = useState<string>(initialCompany.picTitle || '');
  const [bankName, setBankName] = useState<string>(initialCompany.bankName || 'BCA');
  const [bankAccountNumber, setBankAccountNumber] = useState<string>(initialCompany.bankAccountNumber || '');
  const [bankAccountHolder, setBankAccountHolder] = useState<string>(initialCompany.bankAccountHolder || '');
  const [footerNotes, setFooterNotes] = useState<string>(initialCompany.footerNotes || '');
  
  // Danger zone & Backup states
  const [isConfirmWipeOpen, setIsConfirmWipeOpen] = useState(false);
  const [isWiping, setIsWiping] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [pendingBackupToRestore, setPendingBackupToRestore] = useState<AppBackupData | null>(null);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const restoreFileInputRef = useRef<HTMLInputElement>(null);

  // Live Simulator state
  const [simSpend, setSimSpend] = useState<number>(1500000);
  const [isPwaModalOpen, setIsPwaModalOpen] = useState(false);

  // Hidden Admin PIN Configuration State
  const [isSecurityExpanded, setIsSecurityExpanded] = useState(false);
  const [adminPinDraft, setAdminPinDraft] = useState<string>(settings.adminPin || '');
  const [confirmAdminPinDraft, setConfirmAdminPinDraft] = useState<string>(settings.adminPin || '');
  const [showAdminPinInput, setShowAdminPinInput] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);

  const wasOpenRef = useRef(false);

  // Sync all rule, profile, logo, and PIN fields cleanly on each modal open transition
  useEffect(() => {
    if (!isOpen) {
      wasOpenRef.current = false;
      return;
    }
    if (wasOpenRef.current) return;
    wasOpenRef.current = true;

    setMode(settings.mode);
    setFlatPercentage(settings.flatPercentage);
    setTiers(settings.tiers);
    setTierError(null);
    setHasMaxCap(settings.maxCashbackPerTransaction !== null);
    setMaxCapValue(settings.maxCashbackPerTransaction || 1000000);
    setRounding(settings.rounding);
    setClaimValidityDays(settings.claimValidityDays);
    setStoreName(settings.storeName || 'Mitra Niaga Utama');

    const cp = settings.companyProfile;
    setLogoUrl(cp?.logoUrl || '');
    setLogoError(null);
    setIsSecurityExpanded(false);
    setAdminPinDraft(settings.adminPin || '');
    setConfirmAdminPinDraft(settings.adminPin || '');
    setShowAdminPinInput(false);
    setPinError(null);
    setCompanyName(cp?.companyName || settings.storeName || '');
    setTagline(cp?.tagline || '');
    setAddress(cp?.address || '');
    setCity(cp?.city || '');
    setPhone(cp?.phone || '');
    setEmail(cp?.email || '');
    setWebsite(cp?.website || '');
    setTaxNumber(cp?.taxNumber || '');
    setPicName(cp?.picName || '');
    setPicTitle(cp?.picTitle || '');
    setBankName(cp?.bankName || 'BCA');
    setBankAccountNumber(cp?.bankAccountNumber || '');
    setBankAccountHolder(cp?.bankAccountHolder || '');
    setFooterNotes(cp?.footerNotes || '');
  }, [isOpen, settings]);

  if (!isOpen) return null;

  const handleLogoFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoError(null);

    if (!file.type.startsWith('image/')) {
      setLogoError('File harus berupa gambar (PNG, JPG, WebP, atau SVG).');
      if (logoFileInputRef.current) logoFileInputRef.current.value = '';
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setLogoError('Ukuran file gambar maksimal 5 MB.');
      if (logoFileInputRef.current) logoFileInputRef.current.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      if (!dataUrl) {
        setLogoError('Gagal membaca file gambar.');
        return;
      }

      const img = new Image();
      img.onload = () => {
        try {
          const maxDim = 240;
          let width = img.naturalWidth || 240;
          let height = img.naturalHeight || 240;

          if (width > maxDim || height > maxDim) {
            const ratio = Math.min(maxDim / width, maxDim / height);
            width = Math.max(1, Math.round(width * ratio));
            height = Math.max(1, Math.round(height * ratio));
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            setLogoError('Browser tidak mendukung pemrosesan gambar logo.');
            return;
          }

          ctx.clearRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);

          // Preserve transparency with PNG first; fall back to WebP/JPEG if payload exceeds 120KB
          let compressed = canvas.toDataURL('image/png');
          if (compressed.length > 120_000) {
            compressed = canvas.toDataURL('image/webp', 0.85);
          }
          if (compressed.length > 120_000) {
            // Draw white backdrop before JPEG fallback
            const jpegCanvas = document.createElement('canvas');
            jpegCanvas.width = width;
            jpegCanvas.height = height;
            const jCtx = jpegCanvas.getContext('2d');
            if (jCtx) {
              jCtx.fillStyle = '#ffffff';
              jCtx.fillRect(0, 0, width, height);
              jCtx.drawImage(img, 0, 0, width, height);
              compressed = jpegCanvas.toDataURL('image/jpeg', 0.82);
            }
          }

          setLogoUrl(compressed);
        } catch (err) {
          console.error('Logo compression error:', err);
          setLogoError('Gagal memproses logo perusahaan.');
        } finally {
          if (logoFileInputRef.current) logoFileInputRef.current.value = '';
        }
      };
      img.onerror = () => {
        setLogoError('Format gambar tidak dapat dimuat.');
        if (logoFileInputRef.current) logoFileInputRef.current.value = '';
      };
      img.src = dataUrl;
    };
    reader.onerror = () => {
      setLogoError('Gagal membaca file dari perangkat.');
      if (logoFileInputRef.current) logoFileInputRef.current.value = '';
    };
    reader.readAsDataURL(file);
  };

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
    minPurchaseAmount: 0,
    maxCashbackPerTransaction: hasMaxCap ? maxCapValue : null,
    rounding,
    claimValidityDays,
    storeName: companyName.trim() || storeName.trim(),
    currency: 'IDR',
  };

  const simResult = calculateCashback(simSpend, currentDraftSettings);

  const handleAddTier = () => {
    setTierError(null);
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
    setTierError(null);
    const updated = [...tiers];
    updated[index] = { ...updated[index], [field]: value };
    setTiers(updated);
  };

  const handleDeleteTier = (index: number) => {
    if (tiers.length <= 1) {
      setTierError('Minimal harus ada 1 tier aturan cashback.');
      return;
    }
    setTierError(null);
    const updated = tiers.filter((_: TierRule, idx: number) => idx !== index);
    setTiers(updated);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const cleanedPin = adminPinDraft.trim();
    const cleanedConfirmPin = confirmAdminPinDraft.trim();
    if (cleanedPin) {
      if (cleanedPin.length < 4) {
        setPinError('PIN Admin minimal 4 digit/karakter.');
        setActiveTab('database');
        setIsSecurityExpanded(true);
        return;
      }
      if (cleanedPin !== cleanedConfirmPin) {
        setPinError('Konfirmasi PIN Admin tidak cocok.');
        setActiveTab('database');
        setIsSecurityExpanded(true);
        return;
      }
    }
    setPinError(null);
    
    const finalCompanyName = companyName.trim() || storeName.trim();

    const updatedCompanyProfile: CompanyProfile = {
      companyName: finalCompanyName,
      logoUrl: logoUrl || '',
      tagline: tagline.trim(),
      address: address.trim(),
      city: city.trim(),
      phone: phone.trim(),
      email: email.trim(),
      website: website.trim(),
      taxNumber: taxNumber.trim(),
      picName: picName.trim(),
      picTitle: picTitle.trim(),
      bankName: bankName.trim(),
      bankAccountNumber: bankAccountNumber.trim(),
      bankAccountHolder: bankAccountHolder.trim(),
      footerNotes: footerNotes.trim(),
    };

    const finalSettings: CashbackSettings = {
      ...settings,
      mode,
      flatPercentage,
      tiers,
      minPurchaseAmount: 0,
      maxCashbackPerTransaction: hasMaxCap ? maxCapValue : null,
      rounding,
      claimValidityDays,
      storeName: finalCompanyName,
      companyProfile: updatedCompanyProfile,
      adminPin: cleanedPin,
    };

    onSaveSettings(finalSettings);
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
                Pengaturan Sistem & Profil Perusahaan
              </h2>
              <p className="text-[10px] sm:text-[11px] text-slate-500">
                Konfigurasi aturan cashback, identitas perusahaan untuk tanda terima, dan sinkronisasi database
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

        {/* Tab Navigation Switcher */}
        <div className="flex items-center px-4 sm:px-6 pt-2.5 pb-2 border-b border-slate-200 bg-slate-100/60 gap-1.5 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('rules')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'rules'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Percent className="w-3.5 h-3.5 text-emerald-400" />
            <span>Aturan & % Cashback</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('company')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'company'
                ? 'bg-emerald-600 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Profil Perusahaan / Toko</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('database')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'database'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Database className="w-3.5 h-3.5 text-blue-400" />
            <span>Cloud & Cadangan</span>
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-3.5 sm:p-6 overflow-y-auto space-y-4 sm:space-y-5 flex-1 text-xs">
          
          {/* TAB 1: ATURAN CASHBACK */}
          {activeTab === 'rules' && (
            <div className="space-y-4 sm:space-y-5">
              
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
                        <span className="text-xs font-bold text-slate-900 block">Samping (Sidebar)</span>
                        <span className="text-[10px] text-slate-500">Standar Desktop/Tablet</span>
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
                        <span className="text-xs font-bold text-slate-900 block">Atas (Top Bar)</span>
                        <span className="text-[10px] text-slate-500">Bilah Header Penuh</span>
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
                        <span className="text-xs font-bold text-slate-900 block">Bawah (Dock Jempol)</span>
                        <span className="text-[10px] text-slate-500">Ideal Layar HP / Mobile</span>
                      </div>
                    </button>
                  </div>
                </div>
              )}

              {/* Visual Theme Picker (Semua Tema Berbasis 3D) */}
              {onChangeAppTheme && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block font-semibold text-slate-700 flex items-center gap-1.5">
                      <Palette className="w-4 h-4 text-emerald-600" />
                      <span>Tema Tampilan Aplikasi (10 Tema 3D)</span>
                    </label>
                    <span className="text-[11px] font-medium text-slate-500">
                      Berubah langsung saat dipilih
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                    {/* Theme 1: Klasik 3D */}
                    <button
                      type="button"
                      onClick={() => onChangeAppTheme('classic')}
                      className={`group p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                        appTheme === 'classic'
                          ? 'border-emerald-600 bg-emerald-50/60 ring-2 ring-emerald-500/20 shadow-xs'
                          : 'border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <div>
                        {/* Mini Klasik 3D Preview */}
                        <div className="h-12 rounded-lg bg-slate-100 border border-slate-200 p-2 mb-2.5 flex items-center gap-2">
                          <div
                            className="w-4 h-full rounded bg-slate-900"
                            style={{ boxShadow: '0 2px 0 0 #334155, 0 3px 5px rgba(15,23,42,0.22)' }}
                          />
                          <div
                            className="flex-1 h-full rounded bg-white border border-slate-200 p-1.5 flex flex-col justify-between transition-transform group-hover:-translate-y-0.5"
                            style={{ boxShadow: '0 2.5px 0 0 #cbd5e1, 0 5px 8px rgba(15,23,42,0.14)' }}
                          >
                            <div className="h-1.5 w-3/4 rounded bg-slate-800/80" />
                            <div className="h-1.5 w-1/2 rounded bg-emerald-500" />
                          </div>
                        </div>
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                            <Palette className="w-3.5 h-3.5 text-slate-600" />
                            Klasik 3D
                          </span>
                          {appTheme === 'classic' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                        </div>
                      </div>
                      <span className="text-[10px] text-slate-500 leading-snug">
                        Bersih, terang & kartu timbul 3D ringan
                      </span>
                    </button>

                    {/* Theme 2: Glass 3D Hidup */}
                    <button
                      type="button"
                      onClick={() => onChangeAppTheme('glass')}
                      className={`group p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                        appTheme === 'glass'
                          ? 'border-emerald-600 bg-emerald-50/60 ring-2 ring-emerald-500/20 shadow-xs'
                          : 'border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <div>
                        {/* Mini Living Glass 3D Aurora Preview */}
                        <div className="relative h-12 rounded-lg overflow-hidden border border-white/80 bg-gradient-to-br from-emerald-100 via-sky-100 to-teal-100 p-2 mb-2.5 flex items-center gap-2 shadow-inner">
                          <div
                            aria-hidden="true"
                            className="absolute -top-3 -left-2 w-10 h-10 rounded-full bg-emerald-400/50 blur-md animate-glass-orb-1"
                          />
                          <div
                            aria-hidden="true"
                            className="absolute -bottom-3 right-1 w-10 h-10 rounded-full bg-sky-400/50 blur-md animate-glass-orb-2"
                          />
                          <div
                            className="relative z-10 w-4 h-full rounded bg-white/65 backdrop-blur-md border border-white/95"
                            style={{ boxShadow: '0 2.5px 0 0 rgba(255,255,255,0.65), 0 4px 8px rgba(15,23,42,0.12)' }}
                          />
                          <div
                            className="relative z-10 flex-1 h-full rounded bg-white/65 backdrop-blur-md border border-white/95 p-1.5 flex flex-col justify-between transition-transform group-hover:-translate-y-0.5"
                            style={{ boxShadow: '0 2.5px 0 0 rgba(255,255,255,0.7), 0 5px 10px rgba(16,185,129,0.16)' }}
                          >
                            <div className="h-1.5 w-3/4 rounded-full bg-slate-700/75" />
                            <div className="h-1.5 w-1/2 rounded-full bg-emerald-600/85" />
                          </div>
                        </div>
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                            Glass 3D Hidup
                          </span>
                          {appTheme === 'glass' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                        </div>
                      </div>
                      <span className="text-[10px] text-slate-500 leading-snug">
                        Kaca 3D kristal + aurora bergerak hidup
                      </span>
                    </button>

                    {/* Theme 3: 3D Spasial */}
                    <button
                      type="button"
                      onClick={() => onChangeAppTheme('3d')}
                      className={`group p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                        appTheme === '3d'
                          ? 'border-emerald-600 bg-emerald-50/60 ring-2 ring-emerald-500/20 shadow-xs'
                          : 'border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <div>
                        {/* Mini 3D Extruded Slab Preview */}
                        <div className="h-12 rounded-lg bg-gradient-to-br from-slate-200 to-slate-300/80 border border-slate-300 p-2 mb-2.5 flex items-center gap-2">
                          <div
                            className="w-4 h-full rounded bg-white border border-slate-300"
                            style={{ boxShadow: '0 2.5px 0 0 #94a3b8, 0 4px 6px rgba(15,23,42,0.18)' }}
                          />
                          <div
                            className="flex-1 h-full rounded bg-white border border-slate-300 p-1.5 flex flex-col justify-between transition-transform group-hover:-translate-y-0.5"
                            style={{ boxShadow: '0 3px 0 0 #94a3b8, 0 6px 10px rgba(15,23,42,0.18)' }}
                          >
                            <div className="h-1.5 w-3/4 rounded bg-slate-800" />
                            <div className="h-1.5 w-1/2 rounded bg-emerald-600" />
                          </div>
                        </div>
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                            <Box className="w-3.5 h-3.5 text-indigo-600" />
                            3D Spasial
                          </span>
                          {appTheme === '3d' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                        </div>
                      </div>
                      <span className="text-[10px] text-slate-500 leading-snug">
                        Panel timbul berdimensi & panggung perspektif
                      </span>
                    </button>

                    {/* Theme 4: Glossy 3D */}
                    <button
                      type="button"
                      onClick={() => onChangeAppTheme('glossy')}
                      className={`group p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                        appTheme === 'glossy'
                          ? 'border-emerald-600 bg-emerald-50/60 ring-2 ring-emerald-500/20 shadow-xs'
                          : 'border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <div>
                        {/* Mini Glossy 3D Lacquered Specular Preview */}
                        <div className="relative h-12 rounded-lg overflow-hidden border border-white bg-gradient-to-br from-sky-100 via-white to-indigo-100 p-2 mb-2.5 flex items-center gap-2 shadow-inner">
                          <div
                            aria-hidden="true"
                            className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/95 to-white/10 pointer-events-none"
                          />
                          <div
                            className="relative z-10 w-4 h-full rounded border border-white"
                            style={{
                              background: 'linear-gradient(180deg, #475569 0%, #0f172a 52%, #020617 100%)',
                              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.45), 0 2.5px 0 0 #334155, 0 4px 8px rgba(15,23,42,0.22)',
                            }}
                          />
                          <div
                            className="relative z-10 flex-1 h-full rounded border border-white p-1.5 flex flex-col justify-between transition-transform group-hover:-translate-y-0.5 overflow-hidden"
                            style={{
                              background: 'linear-gradient(180deg, #ffffff 0%, #ffffff 48%, #f1f5f9 100%)',
                              boxShadow: 'inset 0 1.5px 0 rgba(255,255,255,1), 0 3px 0 0 #cbd5e1, 0 6px 12px rgba(14,116,144,0.16)',
                            }}
                          >
                            <div className="h-1.5 w-3/4 rounded-full bg-slate-800" />
                            <div
                              className="h-1.5 w-1/2 rounded-full"
                              style={{ background: 'linear-gradient(180deg, #34d399 0%, #059669 100%)' }}
                            />
                          </div>
                        </div>
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                            <Gem className="w-3.5 h-3.5 text-sky-600" />
                            Glossy 3D
                          </span>
                          {appTheme === 'glossy' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                        </div>
                      </div>
                      <span className="text-[10px] text-slate-500 leading-snug">
                        Kilap akrilik cermin, kilau atas & tombol jelly 3D
                      </span>
                    </button>

                    {/* Theme 5: Full Animasi 3D */}
                    <button
                      type="button"
                      onClick={() => onChangeAppTheme('motion3d')}
                      className={`group p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                        appTheme === 'motion3d'
                          ? 'border-emerald-600 bg-emerald-50/60 ring-2 ring-emerald-500/20 shadow-xs'
                          : 'border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <div>
                        {/* Mini Full Kinetic 3D Preview */}
                        <div className="relative h-12 rounded-lg overflow-hidden border border-white/90 bg-gradient-to-br from-slate-200 via-sky-100 to-emerald-100 p-2 mb-2.5 flex items-center gap-2 shadow-inner">
                          <div
                            aria-hidden="true"
                            className="absolute -right-2 -top-2 w-10 h-10 rounded-full border border-dashed border-emerald-500/45 animate-motion3d-spin-slow"
                          />
                          <div
                            className="relative z-10 w-4 h-full rounded bg-slate-900 border border-slate-700 animate-motion3d-levitate-alt"
                            style={{ boxShadow: '0 2.5px 0 0 #334155, 0 5px 8px rgba(15,23,42,0.24)' }}
                          />
                          <div
                            className="relative z-10 flex-1 h-full rounded bg-white/95 border border-white p-1.5 flex flex-col justify-between animate-motion3d-levitate"
                            style={{ boxShadow: '0 3px 0 0 #94a3b8, 0 8px 14px rgba(16,185,129,0.2)' }}
                          >
                            <div className="h-1.5 w-3/4 rounded-full bg-slate-800" />
                            <div className="h-1.5 w-1/2 rounded-full bg-emerald-500" />
                          </div>
                        </div>
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                            <Orbit className="w-3.5 h-3.5 text-emerald-600" />
                            Full Animasi 3D
                          </span>
                          {appTheme === 'motion3d' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                        </div>
                      </div>
                      <span className="text-[10px] text-slate-500 leading-snug">
                        Kartu 3D melayang hidup, cahaya sapu & latar kinetik
                      </span>
                    </button>

                    {/* Theme 6: Neumorfik 3D */}
                    <button
                      type="button"
                      onClick={() => onChangeAppTheme('neomorph')}
                      className={`group p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                        appTheme === 'neomorph'
                          ? 'border-emerald-600 bg-emerald-50/60 ring-2 ring-emerald-500/20 shadow-xs'
                          : 'border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <div>
                        <div className="h-12 rounded-lg bg-slate-200/80 border border-white p-2 mb-2.5 flex items-center gap-2">
                          <div
                            className="w-4 h-full rounded bg-slate-100"
                            style={{ boxShadow: '-2px -2px 5px rgba(255,255,255,0.9), 2px 3px 6px rgba(148,163,184,0.45)' }}
                          />
                          <div
                            className="flex-1 h-full rounded bg-slate-100 p-1.5 flex flex-col justify-between transition-transform group-hover:-translate-y-0.5"
                            style={{ boxShadow: '-3px -3px 6px rgba(255,255,255,0.95), 3px 4px 8px rgba(148,163,184,0.45), 0 2px 0 #cbd5e1' }}
                          >
                            <div className="h-1.5 w-3/4 rounded-full bg-slate-700" />
                            <div className="h-1.5 w-1/2 rounded-full bg-emerald-500" />
                          </div>
                        </div>
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                            <CircleDot className="w-3.5 h-3.5 text-slate-600" />
                            Neumorfik 3D
                          </span>
                          {appTheme === 'neomorph' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                        </div>
                      </div>
                      <span className="text-[10px] text-slate-500 leading-snug">
                        Pahatan clay lembut timbal balik & tombol cekung
                      </span>
                    </button>

                    {/* Theme 7: Zamrud Emas 3D */}
                    <button
                      type="button"
                      onClick={() => onChangeAppTheme('emerald_gold')}
                      className={`group p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                        appTheme === 'emerald_gold'
                          ? 'border-emerald-600 bg-emerald-50/60 ring-2 ring-emerald-500/20 shadow-xs'
                          : 'border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <div>
                        <div className="h-12 rounded-lg bg-gradient-to-br from-emerald-50 via-amber-50 to-stone-100 border border-amber-300/70 p-2 mb-2.5 flex items-center gap-2">
                          <div
                            className="w-4 h-full rounded bg-emerald-900 border border-amber-400/60"
                            style={{ boxShadow: '0 2.5px 0 0 #92712b, 0 4px 6px rgba(6,78,59,0.25)' }}
                          />
                          <div
                            className="flex-1 h-full rounded bg-[#fffdf8] border border-amber-300/80 p-1.5 flex flex-col justify-between transition-transform group-hover:-translate-y-0.5"
                            style={{ boxShadow: '0 3px 0 0 #d4b876, 0 6px 10px rgba(6,78,59,0.16)' }}
                          >
                            <div className="h-1.5 w-3/4 rounded-full bg-emerald-900" />
                            <div className="h-1.5 w-1/2 rounded-full bg-amber-500" />
                          </div>
                        </div>
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                            <Crown className="w-3.5 h-3.5 text-amber-600" />
                            Zamrud Emas 3D
                          </span>
                          {appTheme === 'emerald_gold' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                        </div>
                      </div>
                      <span className="text-[10px] text-slate-500 leading-snug">
                        Lis bevel emas sampanye mewah & aksen zamrud
                      </span>
                    </button>

                    {/* Theme 8: Prismatik 3D */}
                    <button
                      type="button"
                      onClick={() => onChangeAppTheme('cyber_prism')}
                      className={`group p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                        appTheme === 'cyber_prism'
                          ? 'border-emerald-600 bg-emerald-50/60 ring-2 ring-emerald-500/20 shadow-xs'
                          : 'border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <div>
                        <div className="h-12 rounded-lg bg-gradient-to-br from-indigo-100 via-sky-100 to-emerald-100 border border-indigo-300/80 p-2 mb-2.5 flex items-center gap-2">
                          <div
                            className="w-4 h-full rounded bg-indigo-950 border border-indigo-400/70"
                            style={{ boxShadow: '0 2.5px 0 0 #4f46e5, 0 4px 6px rgba(79,70,229,0.24)' }}
                          />
                          <div
                            className="flex-1 h-full rounded bg-white/95 border border-indigo-300 p-1.5 flex flex-col justify-between transition-transform group-hover:-translate-y-0.5"
                            style={{ boxShadow: '0 3px 0 0 #a5b4fc, 0 6px 10px rgba(79,70,229,0.18)' }}
                          >
                            <div className="h-1.5 w-3/4 rounded-full bg-indigo-900" />
                            <div className="h-1.5 w-1/2 rounded-full bg-cyan-500" />
                          </div>
                        </div>
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                            <Hexagon className="w-3.5 h-3.5 text-indigo-600" />
                            Prismatik 3D
                          </span>
                          {appTheme === 'cyber_prism' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                        </div>
                      </div>
                      <span className="text-[10px] text-slate-500 leading-snug">
                        Tepi holografik indigo-sian & cincin prisma berputar
                      </span>
                    </button>

                    {/* Theme 9: Titanium Logam 3D */}
                    <button
                      type="button"
                      onClick={() => onChangeAppTheme('titanium')}
                      className={`group p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                        appTheme === 'titanium'
                          ? 'border-emerald-600 bg-emerald-50/60 ring-2 ring-emerald-500/20 shadow-xs'
                          : 'border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <div>
                        <div className="h-12 rounded-lg bg-gradient-to-br from-slate-300 via-slate-200 to-slate-300 border border-slate-400 p-2 mb-2.5 flex items-center gap-2">
                          <div
                            className="w-4 h-full rounded bg-slate-800 border border-slate-500"
                            style={{ boxShadow: '0 2.5px 0 0 #0f172a, 0 4px 6px rgba(15,23,42,0.28)' }}
                          />
                          <div
                            className="flex-1 h-full rounded bg-gradient-to-b from-white to-slate-200 border border-slate-400 p-1.5 flex flex-col justify-between transition-transform group-hover:-translate-y-0.5"
                            style={{ boxShadow: '0 3px 0 0 #64748b, 0 6px 10px rgba(15,23,42,0.22)' }}
                          >
                            <div className="h-1.5 w-3/4 rounded-full bg-slate-800" />
                            <div className="h-1.5 w-1/2 rounded-full bg-emerald-600" />
                          </div>
                        </div>
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                            <Shield className="w-3.5 h-3.5 text-slate-700" />
                            Titanium Logam 3D
                          </span>
                          {appTheme === 'titanium' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                        </div>
                      </div>
                      <span className="text-[10px] text-slate-500 leading-snug">
                        Pelat aluminium perak tegas & bezel baja gunmetal
                      </span>
                    </button>

                    {/* Theme 10: Kuarsa Hangat 3D */}
                    <button
                      type="button"
                      onClick={() => onChangeAppTheme('sunset_warm')}
                      className={`group p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                        appTheme === 'sunset_warm'
                          ? 'border-emerald-600 bg-emerald-50/60 ring-2 ring-emerald-500/20 shadow-xs'
                          : 'border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <div>
                        <div className="h-12 rounded-lg bg-gradient-to-br from-orange-100 via-amber-50 to-stone-200 border border-orange-300/80 p-2 mb-2.5 flex items-center gap-2">
                          <div
                            className="w-4 h-full rounded bg-stone-900 border border-orange-400/50"
                            style={{ boxShadow: '0 2.5px 0 0 #7c2d12, 0 4px 6px rgba(124,45,18,0.24)' }}
                          />
                          <div
                            className="flex-1 h-full rounded bg-[#fffaf4] border border-orange-300/80 p-1.5 flex flex-col justify-between transition-transform group-hover:-translate-y-0.5"
                            style={{ boxShadow: '0 3px 0 0 #d9aa82, 0 6px 10px rgba(120,53,15,0.16)' }}
                          >
                            <div className="h-1.5 w-3/4 rounded-full bg-stone-800" />
                            <div className="h-1.5 w-1/2 rounded-full bg-orange-500" />
                          </div>
                        </div>
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                            <Sun className="w-3.5 h-3.5 text-orange-500" />
                            Kuarsa Hangat 3D
                          </span>
                          {appTheme === 'sunset_warm' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                        </div>
                      </div>
                      <span className="text-[10px] text-slate-500 leading-snug">
                        Kuarsa travertine hangat & bayangan tembaga senja
                      </span>
                    </button>
                  </div>
                </div>
              )}

              {/* Live Clock Style Picker (Minimalist & Unik) */}
              {onChangeClockStyle && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block font-semibold text-slate-700 flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-emerald-600" />
                      <span>Gaya Jam, Hari & Tanggal Hidup</span>
                    </label>
                    <span className="text-[11px] font-medium text-slate-500">
                      6 gaya minimalis unik
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                    {/* Clock Style 1: Kronograf Gelap */}
                    <button
                      type="button"
                      onClick={() => onChangeClockStyle('chronograph')}
                      className={`group p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                        clockStyle === 'chronograph'
                          ? 'border-emerald-600 bg-emerald-50/60 ring-2 ring-emerald-500/20 shadow-xs'
                          : 'border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <div>
                        <div className="relative h-9 rounded-lg bg-slate-900 border border-slate-700 px-2.5 mb-2 flex items-center justify-between overflow-hidden">
                          <div className="flex items-center gap-1.5">
                            <div className="w-4 h-4 rounded-full border border-emerald-400/80 bg-slate-950 flex items-center justify-center">
                              <div className="w-1.5 h-[1.5px] bg-emerald-400 rotate-[-35deg] origin-left" />
                            </div>
                            <span className="text-[9px] font-bold text-emerald-300">Selasa</span>
                          </div>
                          <span className="text-[11px] font-mono font-extrabold text-white tabular-nums">
                            09:45<span className="text-emerald-300 text-[9px]">:12</span>
                          </span>
                          <div className="absolute inset-x-0 bottom-0 h-[2px] bg-gradient-to-r from-emerald-400 to-sky-400 w-3/4" />
                        </div>
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                            <Watch className="w-3.5 h-3.5 text-slate-700" />
                            Kronograf Gelap
                          </span>
                          {clockStyle === 'chronograph' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                        </div>
                      </div>
                      <span className="text-[10px] text-slate-500 leading-snug">
                        Dial analog presisi & garis progres zamrud elegan
                      </span>
                    </button>

                    {/* Clock Style 2: Plakat Putih Bersih */}
                    <button
                      type="button"
                      onClick={() => onChangeClockStyle('ivory_card')}
                      className={`group p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                        clockStyle === 'ivory_card'
                          ? 'border-emerald-600 bg-emerald-50/60 ring-2 ring-emerald-500/20 shadow-xs'
                          : 'border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <div>
                        <div className="relative h-9 rounded-lg bg-white border border-slate-200 px-2.5 mb-2 flex items-center justify-between overflow-hidden shadow-2xs">
                          <div className="flex items-center gap-1.5">
                            <div className="w-4 h-4 rounded-full border border-emerald-500 bg-slate-50 flex items-center justify-center">
                              <div className="w-1.5 h-[1.5px] bg-slate-800 rotate-[-35deg] origin-left" />
                            </div>
                            <span className="text-[9px] font-bold text-emerald-700">Selasa</span>
                          </div>
                          <span className="text-[11px] font-mono font-extrabold text-slate-900 tabular-nums">
                            09:45<span className="text-emerald-600 text-[9px]">:12</span>
                          </span>
                          <div className="absolute inset-x-0 bottom-0 h-[2px] bg-gradient-to-r from-emerald-600 to-teal-400 w-3/4" />
                        </div>
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-emerald-600" />
                            Plakat Putih
                          </span>
                          {clockStyle === 'ivory_card' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                        </div>
                      </div>
                      <span className="text-[10px] text-slate-500 leading-snug">
                        Terang, rapi & menyatu mulus dengan kartu aplikasi
                      </span>
                    </button>

                    {/* Clock Style 3: Kartu Flip Retro */}
                    <button
                      type="button"
                      onClick={() => onChangeClockStyle('flip_split')}
                      className={`group p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                        clockStyle === 'flip_split'
                          ? 'border-emerald-600 bg-emerald-50/60 ring-2 ring-emerald-500/20 shadow-xs'
                          : 'border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <div>
                        <div className="relative h-9 rounded-lg bg-slate-900 border border-slate-700 px-2.5 mb-2 flex items-center justify-between overflow-hidden">
                          <div className="w-4 h-4 rounded bg-slate-800 border border-slate-600 flex flex-col overflow-hidden">
                            <div className="h-1 bg-emerald-500 w-full" />
                            <div className="flex-1 flex items-center justify-center text-[6px] font-mono font-bold text-white">17</div>
                          </div>
                          <div className="flex items-center gap-0.5 font-mono text-[9px] font-extrabold text-white">
                            <span className="relative px-1 py-0.5 rounded bg-slate-800 border border-slate-600">09</span>
                            <span className="text-emerald-400">:</span>
                            <span className="relative px-1 py-0.5 rounded bg-slate-800 border border-slate-600">45</span>
                            <span className="text-emerald-400">:</span>
                            <span className="relative px-1 py-0.5 rounded bg-emerald-950 border border-emerald-500/40 text-emerald-300">12</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                            <Layers className="w-3.5 h-3.5 text-indigo-600" />
                            Kartu Flip Retro
                          </span>
                          {clockStyle === 'flip_split' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                        </div>
                      </div>
                      <span className="text-[10px] text-slate-500 leading-snug">
                        Kotak angka papan jadwal mekanik & daun kalender
                      </span>
                    </button>

                    {/* Clock Style 4: Tabung Nixie Hangat */}
                    <button
                      type="button"
                      onClick={() => onChangeClockStyle('nixie_amber')}
                      className={`group p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                        clockStyle === 'nixie_amber'
                          ? 'border-emerald-600 bg-emerald-50/60 ring-2 ring-emerald-500/20 shadow-xs'
                          : 'border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <div>
                        <div className="relative h-9 rounded-lg bg-stone-950 border border-amber-900/60 px-2.5 mb-2 flex items-center justify-between overflow-hidden">
                          <div className="flex items-center gap-1.5">
                            <div className="w-4 h-4 rounded-full border border-amber-500 bg-stone-900 flex items-center justify-center">
                              <div className="w-1.5 h-[1.5px] bg-amber-400 rotate-[-35deg] origin-left" />
                            </div>
                            <span className="text-[9px] font-bold text-amber-300">Selasa</span>
                          </div>
                          <span className="text-[11px] font-mono font-extrabold text-amber-300 tabular-nums">
                            09:45<span className="text-orange-400 text-[9px]">:12</span>
                          </span>
                          <div className="absolute inset-x-0 bottom-0 h-[2px] bg-gradient-to-r from-amber-500 to-orange-400 w-3/4" />
                        </div>
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                            <Flame className="w-3.5 h-3.5 text-amber-600" />
                            Tabung Nixie Hangat
                          </span>
                          {clockStyle === 'nixie_amber' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                        </div>
                      </div>
                      <span className="text-[10px] text-slate-500 leading-snug">
                        Sasis obsidian vintage dengan kilau angka kuning hangat
                      </span>
                    </button>

                    {/* Clock Style 5: HUD Zamrud Presisi */}
                    <button
                      type="button"
                      onClick={() => onChangeClockStyle('emerald_matrix')}
                      className={`group p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                        clockStyle === 'emerald_matrix'
                          ? 'border-emerald-600 bg-emerald-50/60 ring-2 ring-emerald-500/20 shadow-xs'
                          : 'border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <div>
                        <div className="relative h-9 rounded-lg bg-gradient-to-r from-emerald-950 via-slate-900 to-teal-950 border border-emerald-500/40 px-2.5 mb-2 flex items-center justify-between overflow-hidden">
                          <div className="flex items-center gap-1.5">
                            <div className="w-4 h-4 rounded-full border border-emerald-400/70 bg-emerald-900/50 flex items-center justify-center">
                              <div className="w-2 h-2 rounded-full border border-emerald-300/60" />
                            </div>
                            <span className="text-[9px] font-bold text-emerald-300">Selasa</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <div className="flex items-end gap-[1.5px] h-2.5">
                              <span className="w-[2px] h-1 bg-emerald-600 rounded-full" />
                              <span className="w-[2px] h-2.5 bg-emerald-300 rounded-full" />
                              <span className="w-[2px] h-1.5 bg-emerald-600 rounded-full" />
                            </div>
                            <span className="text-[11px] font-mono font-extrabold text-emerald-100 tabular-nums">
                              09:45<span className="text-teal-300 text-[9px]">:12</span>
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                            <Cpu className="w-3.5 h-3.5 text-teal-600" />
                            HUD Zamrud
                          </span>
                          {clockStyle === 'emerald_matrix' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                        </div>
                      </div>
                      <span className="text-[10px] text-slate-500 leading-snug">
                        Radar sapu konsentris & bar ritme detik modern
                      </span>
                    </button>

                    {/* Clock Style 6: Tipografi Editorial */}
                    <button
                      type="button"
                      onClick={() => onChangeClockStyle('ultra_typo')}
                      className={`group p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                        clockStyle === 'ultra_typo'
                          ? 'border-emerald-600 bg-emerald-50/60 ring-2 ring-emerald-500/20 shadow-xs'
                          : 'border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <div>
                        <div className="relative h-9 rounded-lg bg-white/90 border border-slate-200/90 px-2.5 mb-2 flex items-center justify-between overflow-hidden">
                          <div className="flex items-center gap-1.5">
                            <span className="w-[2.5px] h-3.5 rounded-full bg-emerald-600" />
                            <span className="text-[9px] font-extrabold text-slate-800">Selasa, 17 Nov</span>
                          </div>
                          <span className="text-[11px] font-mono font-extrabold text-slate-900 tabular-nums">
                            09:45<span className="text-emerald-600 text-[9px]">:12</span>
                          </span>
                        </div>
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                            <Type className="w-3.5 h-3.5 text-slate-600" />
                            Tipografi Editorial
                          </span>
                          {clockStyle === 'ultra_typo' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                        </div>
                      </div>
                      <span className="text-[10px] text-slate-500 leading-snug">
                        Garis tipis ultra-bersih, lapang & super hemat ruang
                      </span>
                    </button>
                  </div>
                </div>
              )}

              {/* Mode Selection */}
              <div>
                <label className="block font-semibold text-slate-700 mb-2">
                  Metode Perhitungan Cashback
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setMode('flat')}
                    className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                      mode === 'flat'
                        ? 'border-emerald-600 bg-emerald-50/50 shadow-xs'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <Percent className="w-4 h-4 text-emerald-600" />
                      {mode === 'flat' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-900 block">Flat (Tetap Sama)</span>
                      <span className="text-[10px] text-slate-500">1 tarif % berlaku untuk semua faktur</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setMode('tiered')}
                    className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                      mode === 'tiered'
                        ? 'border-emerald-600 bg-emerald-50/50 shadow-xs'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <Layers className="w-4 h-4 text-emerald-600" />
                      {mode === 'tiered' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-900 block">Tiered (Bertingkat)</span>
                      <span className="text-[10px] text-slate-500">% makin besar seiring naiknya belanja</span>
                    </div>
                  </button>
                </div>
              </div>

              {/* Flat Percentage Input */}
              {mode === 'flat' && (
                <div className="p-4 bg-emerald-50/60 rounded-xl border border-emerald-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-slate-800">Persentase Cashback Flat (%)</label>
                    <span className="text-lg font-black text-emerald-700 font-mono">{flatPercentage}%</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min={0.5}
                      max={20}
                      step={0.5}
                      value={flatPercentage}
                      onChange={(e) => setFlatPercentage(parseFloat(e.target.value))}
                      className="flex-1 accent-emerald-600 cursor-pointer"
                    />
                    <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg px-2.5 py-1 shadow-2xs">
                      <input
                        type="number"
                        min={0.1}
                        max={100}
                        step={0.1}
                        value={flatPercentage}
                        onChange={(e) => setFlatPercentage(parseFloat(e.target.value) || 0)}
                        className="w-14 text-right font-mono font-bold focus:outline-hidden"
                      />
                      <span className="text-slate-500 font-bold">%</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 pt-1">
                    {[1, 2, 2.5, 3, 5, 7.5, 10].map((quick) => (
                      <button
                        key={quick}
                        type="button"
                        onClick={() => setFlatPercentage(quick)}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors ${
                          flatPercentage === quick
                            ? 'bg-emerald-600 text-white'
                            : 'bg-white text-slate-700 hover:bg-emerald-100 border border-slate-200'
                        }`}
                      >
                        {quick}%
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Tiered Mode Table */}
              {mode === 'tiered' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-slate-800">Tingkatan Nilai Belanja (Tiers)</label>
                    <button
                      type="button"
                      onClick={handleAddTier}
                      className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:text-emerald-800"
                    >
                      <Plus className="w-3.5 h-3.5" /> Tambah Tingkatan
                    </button>
                  </div>
                  {tierError && (
                    <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-[11px] font-medium flex items-center justify-between gap-2">
                      <span>{tierError}</span>
                      <button
                        type="button"
                        onClick={() => setTierError(null)}
                        className="text-rose-500 hover:text-rose-800 font-bold"
                      >
                        ×
                      </button>
                    </div>
                  )}
                  <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                    {tiers.map((t, idx) => (
                      <div key={t.id} className="p-3 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                        <div className="flex-1 space-y-1">
                          <input
                            type="text"
                            value={t.label}
                            onChange={(e) => handleUpdateTier(idx, 'label', e.target.value)}
                            className="font-bold text-slate-900 border-b border-transparent hover:border-slate-300 focus:border-slate-900 focus:outline-hidden w-full"
                          />
                          <div className="flex items-center gap-2 text-[11px] text-slate-500 font-mono">
                            <span>Min: Rp {t.minSpend.toLocaleString('id-ID')}</span>
                            <span>-</span>
                            <span>Max: {t.maxSpend ? `Rp ${t.maxSpend.toLocaleString('id-ID')}` : 'Tak Terbatas'}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1">
                            <input
                              type="number"
                              min={0.1}
                              max={100}
                              step={0.5}
                              value={t.percentage}
                              onChange={(e) => handleUpdateTier(idx, 'percentage', parseFloat(e.target.value) || 0)}
                              className="w-12 text-right font-mono font-bold bg-transparent focus:outline-hidden"
                            />
                            <span className="text-slate-500 font-bold">%</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDeleteTier(idx)}
                            className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Rules Grid */}
              <div className="pt-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Masa Berlaku Klaim (Hari)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={365}
                    value={claimValidityDays}
                    onChange={(e) => setClaimValidityDays(parseInt(e.target.value) || 30)}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-mono focus:outline-hidden focus:ring-1 focus:ring-slate-900"
                  />
                </div>
              </div>

              {/* Rounding Mode */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Pembulatan Nilai Cashback (Rupiah)
                </label>
                <select
                  value={rounding}
                  onChange={(e) => setRounding(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-slate-900"
                >
                  <option value="exact">Tepat Sesuai Hitungan (Tanpa Pembulatan)</option>
                  <option value="round_hundred">Bulatkan ke Ratusan Terdekat (Rp 100)</option>
                  <option value="round_thousand">Bulatkan ke Ribuan Terdekat (Rp 1.000)</option>
                </select>
              </div>

              {/* Live Calculator Simulator */}
              <div className="p-3.5 bg-slate-900 text-white rounded-xl space-y-2.5">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="flex items-center gap-1.5 text-emerald-400">
                    <Calculator className="w-3.5 h-3.5" />
                    Simulasi Hitungan Langsung
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono">
                    {simResult.appliedTier?.label || (mode === 'flat' ? `${flatPercentage}% Flat` : 'Tiered')} ({simResult.effectivePercentage}%)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">Belanja:</span>
                  <input
                    type="number"
                    step={100000}
                    value={simSpend}
                    onChange={(e) => setSimSpend(parseInt(e.target.value) || 0)}
                    className="flex-1 bg-slate-800 text-white font-mono px-3 py-1.5 rounded-lg border border-slate-700 text-xs focus:outline-hidden"
                  />
                </div>
                <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                  <span className="text-xs text-slate-400">Estimasi Cashback Diperoleh:</span>
                  <span className="text-base font-black text-emerald-400 font-mono">
                    {formatRupiah(simResult.cashbackAmount)}
                  </span>
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: PROFIL PERUSAHAAN (KOP SURAT & TANDA TERIMA) */}
          {activeTab === 'company' && (
            <div className="space-y-4">
              
              <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl text-emerald-900">
                <div className="flex items-center gap-2 font-bold text-xs">
                  <Building2 className="w-4 h-4 text-emerald-700" />
                  <span>Identitas Perusahaan / Toko</span>
                </div>
                <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                  Informasi ini otomatis tampil sebagai kop surat resmi pada <strong>Tanda Terima Penyerahan Cashback</strong>, bukti struk, dan ekspor dokumen laporan.
                </p>
              </div>

              {/* Grid Form Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                
                {/* Upload Logo Perusahaan */}
                <div className="sm:col-span-2 p-3.5 rounded-xl border border-slate-200 bg-slate-50/80 space-y-2.5">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3.5">
                    <div className="w-20 h-20 rounded-xl border-2 border-dashed border-slate-300 bg-white flex items-center justify-center overflow-hidden shrink-0 shadow-2xs">
                      {logoUrl ? (
                        <img
                          src={logoUrl}
                          alt="Preview Logo Perusahaan"
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-contain p-1.5"
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center text-slate-400 text-center px-1">
                          <ImageIcon className="w-6 h-6 mb-0.5 text-slate-300" />
                          <span className="text-[9px] font-semibold leading-tight">Tanpa Logo</span>
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0 space-y-2">
                      <div>
                        <label className="block font-bold text-slate-800 text-xs">
                          Logo Perusahaan / Usaha (Opsional)
                        </label>
                        <p className="text-[11px] text-slate-500 leading-relaxed mt-0.5">
                          Tampil di sidebar, header aplikasi, kop surat Tanda Terima Resmi, dan struk bukti konsumen. Format PNG, JPG, SVG, atau WebP.
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <input
                          ref={logoFileInputRef}
                          type="file"
                          accept="image/png,image/jpeg,image/webp,image/svg+xml"
                          onChange={handleLogoFileSelected}
                          className="hidden"
                        />
                        <button
                          type="button"
                          onClick={() => logoFileInputRef.current?.click()}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-2xs transition-colors"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          <span>{logoUrl ? 'Ganti Logo' : 'Upload Logo'}</span>
                        </button>

                        {logoUrl && (
                          <button
                            type="button"
                            onClick={() => {
                              setLogoUrl('');
                              setLogoError(null);
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Hapus Logo</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {logoError && (
                    <div className="p-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-[11px] font-medium flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      <span>{logoError}</span>
                    </div>
                  )}
                </div>

                {/* Nama Perusahaan / Toko */}
                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">
                    Nama Resmi Perusahaan / Usaha / Toko <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={companyName}
                      onChange={(e) => {
                        setCompanyName(e.target.value);
                        setStoreName(e.target.value);
                      }}
                      placeholder="Contoh: PT Mitra Niaga Utama / Toko Berkah Jaya"
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold focus:outline-hidden focus:ring-1 focus:ring-slate-900"
                    />
                  </div>
                </div>

                {/* Tagline / Slogan */}
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">
                    Slogan / Tagline Usaha (Opsional)
                  </label>
                  <input
                    type="text"
                    value={tagline}
                    onChange={(e) => setTagline(e.target.value)}
                    placeholder="Contoh: Solusi Pengadaan Bahan Pokok & Grosir Terpercaya"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-hidden focus:ring-1 focus:ring-slate-900"
                  />
                </div>

                {/* Alamat Lengkap */}
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">
                    Alamat Lengkap Kantor / Toko
                  </label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <textarea
                      rows={2}
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Contoh: Jl. Jenderal Sudirman No. 88, Kawasan Niaga Terpadu"
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-hidden focus:ring-1 focus:ring-slate-900"
                    />
                  </div>
                </div>

                {/* Kota / Wilayah */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Kota / Wilayah
                  </label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Contoh: Jakarta Pusat"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-hidden focus:ring-1 focus:ring-slate-900"
                  />
                </div>

                {/* No Telepon / WA */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Nomor Telepon / WhatsApp Bisnis
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="Contoh: 0812-3456-7890"
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono focus:outline-hidden focus:ring-1 focus:ring-slate-900"
                    />
                  </div>
                </div>

                {/* Email Bisnis */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Email Resmi Perusahaan
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Contoh: finance@perusahaan.com"
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-hidden focus:ring-1 focus:ring-slate-900"
                    />
                  </div>
                </div>

                {/* Website */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Website Resmi
                  </label>
                  <div className="relative">
                    <Globe className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={website}
                      onChange={(e) => setWebsite(e.target.value)}
                      placeholder="Contoh: www.perusahaan.com"
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono focus:outline-hidden focus:ring-1 focus:ring-slate-900"
                    />
                  </div>
                </div>

                {/* NPWP / Nomor Usaha */}
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">
                    Nomor Pokok Wajib Pajak (NPWP) / NIB
                  </label>
                  <div className="relative">
                    <Shield className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={taxNumber}
                      onChange={(e) => setTaxNumber(e.target.value)}
                      placeholder="Contoh: 01.234.567.8-012.000"
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono focus:outline-hidden focus:ring-1 focus:ring-slate-900"
                    />
                  </div>
                </div>

                {/* PIC Name & Title */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Nama Penanggung Jawab / Pimpinan
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={picName}
                      onChange={(e) => setPicName(e.target.value)}
                      placeholder="Contoh: H. Sudirman, S.E."
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-hidden focus:ring-1 focus:ring-slate-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Jabatan Pimpinan / Kasir
                  </label>
                  <input
                    type="text"
                    value={picTitle}
                    onChange={(e) => setPicTitle(e.target.value)}
                    placeholder="Contoh: Finance & Operational Manager"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-hidden focus:ring-1 focus:ring-slate-900"
                  />
                </div>

                {/* Rekening Operasional Perusahaan */}
                <div className="sm:col-span-2 p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                    <CreditCard className="w-4 h-4 text-emerald-600" />
                    Rekening Operasional Toko / Perusahaan
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase">Bank</label>
                      <input
                        type="text"
                        value={bankName}
                        onChange={(e) => setBankName(e.target.value)}
                        placeholder="BCA / Mandiri / BRI"
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase">Nomor Rekening</label>
                      <input
                        type="text"
                        value={bankAccountNumber}
                        onChange={(e) => setBankAccountNumber(e.target.value)}
                        placeholder="Contoh: 8830-1928-11"
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase">Atas Nama Rekening</label>
                      <input
                        type="text"
                        value={bankAccountHolder}
                        onChange={(e) => setBankAccountHolder(e.target.value)}
                        placeholder="Contoh: PT Mitra Niaga Utama"
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold"
                      />
                    </div>
                  </div>
                </div>

                {/* Catatan Kaki Tanda Terima */}
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">
                    Catatan Kaki Tanda Terima / Kwitansi
                  </label>
                  <textarea
                    rows={2}
                    value={footerNotes}
                    onChange={(e) => setFooterNotes(e.target.value)}
                    placeholder="Contoh: Terima kasih atas kerja sama dan kemitraan setia Anda."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-hidden focus:ring-1 focus:ring-slate-900"
                  />
                </div>

              </div>

            </div>
          )}

          {/* TAB 3: CLOUD & DATABASE & BACKUP */}
          {activeTab === 'database' && (
            <div className="space-y-4">
              
              {/* Cloud Sync Status */}
              <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/40 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Cloud className="w-4 h-4 text-emerald-700" />
                    <h3 className="font-bold text-slate-900 text-xs">
                      Status Koneksi Firebase Cloud Firestore
                    </h3>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    Aktif & Otomatis
                  </span>
                </div>

                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Semua transaksi faktur, master konsumen, dan pengaturan persentase tersimpan aman di cloud Firebase. Sinkron otomatis antar perangkat secara real-time tanpa perlu login.
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                  <div className="p-2.5 bg-white rounded-lg border border-slate-200 shadow-2xs">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="font-mono font-bold text-slate-800">/invoices</span>
                      <span className="text-[10px] text-emerald-600 font-bold">✓ Siap</span>
                    </div>
                    <span className="text-[10px] text-slate-500 block">Rekap Faktur ({invoices.length})</span>
                  </div>
                  <div className="p-2.5 bg-white rounded-lg border border-slate-200 shadow-2xs">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="font-mono font-bold text-slate-800">/customers</span>
                      <span className="text-[10px] text-emerald-600 font-bold">✓ Siap</span>
                    </div>
                    <span className="text-[10px] text-slate-500 block">Master Konsumen ({customers.length})</span>
                  </div>
                  <div className="p-2.5 bg-white rounded-lg border border-slate-200 shadow-2xs">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="font-mono font-bold text-slate-800">/settings</span>
                      <span className="text-[10px] text-emerald-600 font-bold">✓ Siap</span>
                    </div>
                    <span className="text-[10px] text-slate-500 block">Aturan & Profil</span>
                  </div>
                  <div className="p-2.5 bg-white rounded-lg border border-slate-200 shadow-2xs">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="font-mono font-bold text-slate-800">/system</span>
                      <span className="text-[10px] text-emerald-600 font-bold">✓ Siap</span>
                    </div>
                    <span className="text-[10px] text-slate-500 block">Metadata Sistem</span>
                  </div>
                </div>

                {onForceSyncCloud && (
                  <div className="pt-2 border-t border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <span className="text-[11px] text-slate-500">
                      Sinkronkan seluruh data lokal ke cloud secara manual jika diperlukan:
                    </span>
                    <button
                      type="button"
                      disabled={isSyncingWithCloud}
                      onClick={onForceSyncCloud}
                      className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-white hover:bg-emerald-100 border border-emerald-300 rounded-lg transition-colors disabled:opacity-50 shrink-0"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isSyncingWithCloud ? 'animate-spin' : ''}`} />
                      <span>{isSyncingWithCloud ? 'Menyinkronkan...' : 'Sinkronkan Sekarang'}</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Install PWA Section */}
              <div className="p-4 rounded-xl border border-emerald-300 bg-emerald-50/50 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-emerald-700" />
                    <h3 className="font-bold text-slate-900 text-xs">
                      Instal Aplikasi ke Perangkat (Android, iOS & Desktop)
                    </h3>
                  </div>
                  <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                    <Download className="w-3 h-3 text-emerald-700" />
                    PWA Siap Pakai
                  </span>
                </div>

                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Pasang CashbackPro ke layar utama HP Android, iPhone / iPad, atau desktop komputer Anda. Bekerja tanpa perlu download dari Google Play Store / App Store, berjalan offline, dan terasa seperti aplikasi native tanpa bilah browser.
                </p>

                <div className="pt-2 border-t border-emerald-200/70 flex flex-wrap items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2">
                    <PWAInstallButton variant="primary" />
                    <button
                      type="button"
                      onClick={() => setIsPwaModalOpen(true)}
                      className="px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-white hover:bg-emerald-100 border border-emerald-300 rounded-lg transition-colors"
                    >
                      Lihat Panduan Instalasi Semua OS
                    </button>
                  </div>
                  <span className="text-[11px] text-slate-500">
                    Mendukung Android • iOS Safari • Windows • macOS
                  </span>
                </div>
              </div>

              {/* Backup & Restore Data */}
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
                  Unduh seluruh file cadangan faktur, master konsumen, dan profil perusahaan ke penyimpanan lokal perangkat Anda.
                </p>

                {restoreError && (
                  <div className="p-2.5 bg-red-50 border border-red-200 rounded-lg text-red-700 text-[11px] flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{restoreError}</span>
                  </div>
                )}

                <div className="pt-2 border-t border-blue-200/70 flex flex-wrap items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={onBackupData}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-800 bg-white hover:bg-blue-100 border border-blue-300 rounded-lg shadow-2xs transition-colors"
                    >
                      <Download className="w-3.5 h-3.5 text-blue-700" />
                      <span>Unduh File Cadangan (JSON)</span>
                    </button>

                    <input
                      ref={restoreFileInputRef}
                      type="file"
                      accept=".json"
                      onChange={handleRestoreFileSelected}
                      className="hidden"
                    />

                    <button
                      type="button"
                      onClick={() => restoreFileInputRef.current?.click()}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg shadow-2xs transition-colors"
                    >
                      <Upload className="w-3.5 h-3.5 text-slate-600" />
                      <span>Pulihkan dari File Backup</span>
                    </button>
                  </div>

                  <span className="text-[11px] text-slate-500 font-mono">
                    {invoices.length} Faktur • {customers.length} Konsumen
                  </span>
                </div>
              </div>

              {/* Danger Zone: Total Wipe */}
              <div className="p-4 rounded-xl border border-red-200 bg-red-50/50 space-y-2.5">
                <div className="flex items-center gap-2 text-red-700">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <h3 className="font-bold text-xs uppercase tracking-wider">
                    Zona Bahaya: Hapus SEMUA Data Permanen
                  </h3>
                </div>
                <p className="text-[11px] text-red-800/80 leading-relaxed">
                  Menghapus seluruh transaksi faktur dan master konsumen secara permanen dari browser dan Cloud Firebase Firestore.
                </p>
                <div className="pt-2 border-t border-red-200/80 flex items-center justify-between">
                  <span className="text-[10px] text-red-600 font-semibold">
                    * Harap unduh file cadangan terlebih dahulu sebelum menghapus.
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsConfirmWipeOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-2xs transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Hapus Semua Data Permanen</span>
                  </button>
                </div>
              </div>

              {/* Discreet / Collapsible Secret Admin PIN Configuration */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setIsSecurityExpanded((prev) => !prev)}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-[11px] font-medium text-slate-400 hover:text-slate-700 hover:bg-slate-100/70 transition-colors"
                >
                  <span className="flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>Keamanan Akses Lanjutan</span>
                  </span>
                  <span className="text-[10px] font-mono">
                    {isSecurityExpanded ? 'Tutup ▲' : 'Atur PIN ▼'}
                  </span>
                </button>

                {isSecurityExpanded && (
                  <div className="mt-2 p-3.5 rounded-xl border border-slate-200 bg-slate-50/90 space-y-3 animate-in fade-in duration-150">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 font-bold text-slate-800 text-xs">
                        <Lock className="w-3.5 h-3.5 text-slate-700" />
                        <span>Atur PIN Admin Rahasia</span>
                      </div>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                        {settings.adminPin ? 'PIN Kustom Aktif' : 'Belum Diatur'}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      PIN ini digunakan untuk membuka <strong>Mode Admin</strong> dari Mode Petugas di seluruh perangkat yang terhubung ke cloud.
                    </p>

                    {pinError && (
                      <div className="p-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-[11px] font-medium">
                        {pinError}
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                          PIN Admin Baru (Min. 4 Digit)
                        </label>
                        <div className="relative">
                          <input
                            type={showAdminPinInput ? 'text' : 'password'}
                            inputMode="numeric"
                            autoComplete="new-password"
                            value={adminPinDraft}
                            onChange={(e) => {
                              setAdminPinDraft(e.target.value);
                              if (pinError) setPinError(null);
                            }}
                            placeholder="Kosongkan jika tanpa PIN kustom"
                            className="w-full px-3 pr-9 py-2 bg-white border border-slate-200 rounded-lg text-xs font-mono tracking-wider focus:outline-hidden focus:ring-1 focus:ring-slate-900"
                          />
                          <button
                            type="button"
                            onClick={() => setShowAdminPinInput((v) => !v)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700"
                            aria-label="Toggle lihat PIN"
                          >
                            {showAdminPinInput ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                          Konfirmasi PIN Admin Baru
                        </label>
                        <input
                          type={showAdminPinInput ? 'text' : 'password'}
                          inputMode="numeric"
                          autoComplete="new-password"
                          value={confirmAdminPinDraft}
                          onChange={(e) => {
                            setConfirmAdminPinDraft(e.target.value);
                            if (pinError) setPinError(null);
                          }}
                          placeholder="Ulangi PIN Admin..."
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-mono tracking-wider focus:outline-hidden focus:ring-1 focus:ring-slate-900"
                        />
                      </div>
                    </div>

                    {adminPinDraft && (
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => {
                            setAdminPinDraft('');
                            setConfirmAdminPinDraft('');
                            setPinError(null);
                          }}
                          className="text-[11px] font-semibold text-rose-600 hover:text-rose-700"
                        >
                          Hapus PIN Kustom
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

            </div>
          )}

          {/* Modal Actions */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-between gap-2">
            <span className="text-[11px] text-slate-400">
              * Pengaturan otomatis tersinkronisasi ke Firebase Cloud Firestore
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Tutup
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
              >
                <Save className="w-4 h-4" />
                <span>Simpan Pengaturan & Profil</span>
              </button>
            </div>
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

      {/* PWA Installation Modal */}
      <PWAInstallModal
        isOpen={isPwaModalOpen}
        onClose={() => setIsPwaModalOpen(false)}
      />

    </div>
  );
};
