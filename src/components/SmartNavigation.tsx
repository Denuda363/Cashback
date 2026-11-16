import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Trophy,
  FileSpreadsheet,
  Users,
  Contact,
  Settings as SettingsIcon,
  Receipt,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Info,
  Lock,
  ShieldCheck,
  UserCheck,
  Bell,
} from 'lucide-react';
import { ActiveTab, AppRole, NavPosition } from '../types/cashback';
import { PWAInstallButton } from './PWAInstallPrompt';

interface SmartNavigationProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  navPosition: NavPosition;
  onChangeNavPosition?: (pos: NavPosition) => void;
  onExportExcel?: () => void;
  onOpenImportExcel?: () => void;
  onOpenAbout?: () => void;
  totalInvoicesCount: number;
  totalMasterCustomersCount: number;
  totalCashbackSum?: number;
  storeName?: string;
  companyLogoUrl?: string;
  isFirebaseConnected?: boolean;
  appRole: AppRole;
  onOpenAdminPinModal: () => void;
  onSwitchToPetugas: () => void;
  pendingCancelCount?: number;
  onOpenCancelApprovals?: () => void;
  children: React.ReactNode;
}

export const SmartNavigation: React.FC<SmartNavigationProps> = ({
  activeTab,
  setActiveTab,
  navPosition,
  onOpenAbout,
  totalInvoicesCount,
  totalMasterCustomersCount,
  storeName = 'CashbackPro',
  companyLogoUrl,
  appRole,
  onOpenAdminPinModal,
  onSwitchToPetugas,
  pendingCancelCount = 0,
  onOpenCancelApprovals,
  children,
}) => {
  // Mobile drawer state (for sidebar mode on mobile)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  // Collapsible sidebar state on desktop (md+)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [logoError, setLogoError] = useState(false);

  useEffect(() => {
    setLogoError(false);
  }, [companyLogoUrl]);

  const hasValidLogo = Boolean(companyLogoUrl && !logoError);

  const renderBrandEmblem = (sizeClass: string, iconClass: string, withHoverTilt = false) => (
    <div
      className={`relative ${sizeClass} rounded-xl flex items-center justify-center font-bold shadow-sm shrink-0 overflow-hidden transition-transform duration-300 ${
        hasValidLogo
          ? 'bg-white border border-slate-100 p-1'
          : 'bg-gradient-to-br from-emerald-600 via-emerald-600 to-teal-700 text-white'
      } ${withHoverTilt ? 'group-hover:scale-105' : ''}`}
    >
      {!hasValidLogo && (
        <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 w-1/2 bg-white/25 animate-sidebar-sheen" />
      )}
      {hasValidLogo ? (
        <img
          src={companyLogoUrl}
          alt={`Logo ${storeName}`}
          referrerPolicy="no-referrer"
          onError={() => setLogoError(true)}
          className="w-full h-full object-contain relative z-10"
        />
      ) : (
        <Receipt
          className={`${iconClass} relative z-10 ${
            withHoverTilt ? 'transition-transform duration-300 group-hover:-rotate-6' : ''
          }`}
        />
      )}
    </div>
  );

  // Mobile drawer always uses full neat expanded layout
  const showCollapsed = isSidebarCollapsed && !isMobileMenuOpen;

  const allNavItems: { id: ActiveTab; label: string; shortLabel: string; icon: React.ReactNode; badge?: number; description?: string }[] = [
    { id: 'dashboard', label: 'Dashboard', shortLabel: 'Dashboard', icon: <BarChart3 className="w-4 h-4" />, description: 'Ringkasan & tren omset' },
    { id: 'top10', label: '10 Besar Tertinggi', shortLabel: 'Top 10', icon: <Trophy className="w-4 h-4" />, description: 'Podium reward konsumen' },
    { id: 'invoices', label: 'Rekap Faktur', shortLabel: 'Faktur', icon: <FileSpreadsheet className="w-4 h-4" />, badge: totalInvoicesCount, description: 'Riwayat data pembelian' },
    { id: 'payout_records', label: 'Penerimaan Cashback', shortLabel: 'Penerimaan', icon: <CheckCircle2 className="w-4 h-4" />, description: 'Rekap serah terima & bukti' },
    { id: 'customers', label: 'Rekap Konsumen', shortLabel: 'Konsumen', icon: <Users className="w-4 h-4" />, description: 'Akumulasi saldo per orang' },
    { id: 'master_customers', label: 'Master Konsumen', shortLabel: 'Master', icon: <Contact className="w-4 h-4" />, badge: totalMasterCustomersCount, description: 'Database pelanggan & bank' },
    { id: 'settings', label: 'Pengaturan', shortLabel: 'Pengaturan', icon: <SettingsIcon className="w-4 h-4" />, description: 'Aturan persen cashback & usaha' },
  ];

  // Mode Petugas dapat melihat semua halaman kecuali Pengaturan (akses halaman lain hanya lihat)
  const navItems = appRole === 'admin'
    ? allNavItems
    : allNavItems.filter((item) => item.id !== 'settings');

  const activeNavItem = navItems.find((n) => n.id === activeTab) || navItems[0];

  /* -------------------------------------------------------------
   * RENDER MODE 1: SIDEBAR NAVIGATION (DI SAMPING)
   * ----------------------------------------------------------- */
  if (navPosition === 'sidebar') {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col md:flex-row font-sans">

        {/* Mobile Header (synced with Desktop Sidebar design: uncovered storeName, living border, no Firebase/Export/Import/Style switcher) */}
        <header className="md:hidden sticky top-0 z-40 bg-white/95 backdrop-blur-md px-3 py-2 shadow-xs print:hidden relative">
          <div className="flex items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(true)}
                className="w-10 h-10 -ml-1 flex items-center justify-center text-slate-700 hover:text-emerald-700 hover:bg-emerald-50/80 border border-slate-200/80 rounded-xl active:scale-95 transition-all shrink-0"
                aria-label="Buka Menu Navigasi"
              >
                <Menu className="w-5 h-5" />
              </button>

              {/* Compact Animated Conic Brand Lockup — Full Company Name Always Visible */}
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <div className="relative p-[1.5px] rounded-xl overflow-hidden shrink-0 shadow-2xs">
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute -inset-[80%] bg-[conic-gradient(from_0deg,#10b981_0deg,#0f766e_70deg,#cbd5e1_140deg,#34d399_220deg,#0ea5e9_290deg,#10b981_360deg)] animate-sidebar-orbit opacity-90"
                  />
                  {renderBrandEmblem('w-8 h-8 rounded-[10px]', 'w-4 h-4')}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="text-[12.5px] font-extrabold tracking-tight text-slate-900 leading-tight break-words whitespace-normal">
                    {storeName}
                  </div>
                  <div className="text-[10px] font-semibold text-emerald-700 leading-tight mt-0.5 truncate">
                    {activeNavItem?.label || 'Rekap Transparan'}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {appRole === 'admin' && pendingCancelCount > 0 && onOpenCancelApprovals && (
                <button
                  type="button"
                  onClick={onOpenCancelApprovals}
                  title={`${pendingCancelCount} pengajuan pembatalan menunggu ACC Admin`}
                  className="h-10 px-2.5 flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-50 border border-amber-300 rounded-xl active:scale-95 transition-all"
                >
                  <Bell className="w-3.5 h-3.5 text-amber-600" />
                  <span className="font-mono">{pendingCancelCount}</span>
                </button>
              )}

              <button
                type="button"
                onClick={appRole === 'admin' ? onSwitchToPetugas : onOpenAdminPinModal}
                title={appRole === 'admin' ? 'Kunci dan kembali ke Mode Petugas' : 'Masuk ke Mode Admin (PIN)'}
                className={`h-10 px-2.5 flex items-center gap-1 text-[11px] font-bold rounded-xl border active:scale-95 transition-all ${
                  appRole === 'admin'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                    : 'bg-slate-900 text-white border-slate-900 hover:bg-slate-800'
                }`}
              >
                {appRole === 'admin' ? (
                  <>
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Admin</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>Admin</span>
                  </>
                )}
              </button>

              {onOpenAbout && (
                <button
                  type="button"
                  onClick={onOpenAbout}
                  title="Tentang Aplikasi & Hak Cipta (Denuda)"
                  aria-label="Tentang Aplikasi"
                  className="w-10 h-10 flex items-center justify-center text-slate-600 hover:text-emerald-700 bg-slate-50 hover:bg-emerald-50 border border-slate-200/80 rounded-xl active:scale-95 transition-all shrink-0"
                >
                  <Info className="w-4 h-4 text-emerald-600" />
                </button>
              )}
            </div>
          </div>

          {/* Living Horizontal Architectural Bottom Seam */}
          <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-[2.5px] bg-gradient-to-r from-slate-200 via-emerald-200/70 to-slate-200 overflow-hidden">
            <div className="h-full w-32 bg-gradient-to-r from-transparent via-emerald-500 to-teal-300 animate-header-edge-beam" />
          </div>
          <div aria-hidden="true" className="pointer-events-none absolute bottom-[4px] left-2 w-2 h-2 border-b-2 border-l-2 border-emerald-500/60 rounded-bl-[2px]" />
          <div aria-hidden="true" className="pointer-events-none absolute bottom-[4px] right-2 w-2 h-2 border-b-2 border-r-2 border-emerald-500/60 rounded-br-[2px]" />
        </header>

        {/* Backdrop for Mobile Drawer */}
        {isMobileMenuOpen && (
          <div
            onClick={() => setIsMobileMenuOpen(false)}
            className="md:hidden fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs transition-opacity print:hidden"
          />
        )}

        {/* Desktop Sidebar & Mobile Slide-Out Drawer with Unique Living Architectural Border */}
        <aside
          className={`
            fixed md:sticky top-0 z-50 md:z-30 h-screen bg-white/95 backdrop-blur-md flex flex-col justify-between transition-[width,transform] duration-300 ease-out shadow-[4px_0_24px_-8px_rgba(15,23,42,0.08)] print:hidden
            ${isMobileMenuOpen ? 'translate-x-0 w-72' : '-translate-x-full md:translate-x-0'}
            ${isSidebarCollapsed ? 'md:w-[108px]' : 'md:w-64'}
          `}
        >
          {/* Unique Animated Right Seam Border & Precision Corner Notches */}
          <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-0 w-[3px] bg-gradient-to-b from-slate-200 via-emerald-200/70 to-slate-200 overflow-hidden">
            <div className="w-full h-36 bg-gradient-to-b from-transparent via-emerald-500 to-teal-300 animate-sidebar-edge-beam" />
          </div>
          <div aria-hidden="true" className="pointer-events-none absolute top-3 right-[5px] w-2.5 h-2.5 border-t-2 border-r-2 border-emerald-500/60 rounded-tr-sm" />
          <div aria-hidden="true" className="pointer-events-none absolute bottom-3 right-[5px] w-2.5 h-2.5 border-b-2 border-r-2 border-emerald-500/60 rounded-br-sm" />

          {/* Floating Border-Seam Collapse Toggle on Desktop (Never covers company name or logo) */}
          <button
            type="button"
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="hidden md:flex absolute -right-3.5 top-8 z-30 w-7 h-7 rounded-full bg-white border-2 border-emerald-500/80 shadow-md items-center justify-center text-emerald-700 hover:bg-emerald-600 hover:text-white hover:border-emerald-600 hover:scale-110 active:scale-95 transition-all duration-200 group"
            title={isSidebarCollapsed ? 'Perlebar Sidebar' : 'Kecilkan Sidebar'}
            aria-label={isSidebarCollapsed ? 'Perlebar Sidebar' : 'Kecilkan Sidebar'}
          >
            <span aria-hidden="true" className="absolute -inset-1 rounded-full border border-emerald-400/50 animate-sidebar-aura pointer-events-none" />
            {isSidebarCollapsed ? (
              <ChevronRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5" />
            ) : (
              <ChevronLeft className="w-4 h-4 transition-transform duration-200 group-hover:-translate-x-0.5" />
            )}
          </button>

          {/* Top Brand & Navigation Section */}
          <div className="flex-1 min-h-0 flex flex-col">
            {/* Brand Header Container */}
            <div className={`border-b border-slate-100/90 ${showCollapsed ? 'px-2 pt-3 pb-2.5' : 'p-3.5'}`}>
              <div className="flex items-start justify-between gap-2">
                {/* Unique Animated Double-Bezel Conic Border Frame for Brand Identity */}
                <div
                  title={storeName}
                  className="relative flex-1 min-w-0 p-[1.5px] rounded-2xl overflow-hidden shadow-xs group"
                >
                  {/* Rotating Conic Gradient Border */}
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute -inset-[80%] bg-[conic-gradient(from_0deg,#10b981_0deg,#0f766e_70deg,#cbd5e1_140deg,#34d399_220deg,#0ea5e9_290deg,#10b981_360deg)] animate-sidebar-orbit opacity-85 group-hover:opacity-100 transition-opacity"
                  />

                  {/* Inner Crisp Brand Card */}
                  <div
                    className={`relative bg-white rounded-[14px] transition-all duration-200 ${
                      showCollapsed
                        ? 'flex flex-col items-center justify-center text-center gap-1.5 px-1.5 py-2.5'
                        : 'flex items-center gap-2.5 px-2.5 py-2.5'
                    }`}
                  >
                    {/* Subtle Corner Accent Ticks */}
                    <span aria-hidden="true" className="pointer-events-none absolute top-1 left-1 w-1.5 h-1.5 border-t border-l border-emerald-500/70 rounded-tl-[2px]" />
                    <span aria-hidden="true" className="pointer-events-none absolute bottom-1 right-1 w-1.5 h-1.5 border-b border-r border-emerald-500/70 rounded-br-[2px]" />

                    {/* Animated Emblem Icon / Uploaded Company Logo */}
                    {renderBrandEmblem('w-9 h-9', 'w-4 h-4', true)}

                    {/* Full Company Name — ALWAYS visible and never truncated/covered */}
                    <div className={showCollapsed ? 'w-full min-w-0' : 'flex-1 min-w-0'}>
                      <div
                        className={`font-extrabold tracking-tight text-slate-900 break-words whitespace-normal ${
                          showCollapsed
                            ? 'text-[11px] leading-[1.2] text-center'
                            : 'text-[13px] leading-snug text-left'
                        }`}
                      >
                        {storeName}
                      </div>
                      {!showCollapsed && (
                        <div className="text-[10px] text-emerald-700 font-semibold mt-0.5 leading-none">
                          Rekap Transparan
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Mobile Close Button (shown only inside mobile drawer) */}
                <button
                  type="button"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="md:hidden w-9 h-9 flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl shrink-0 mt-1 active:scale-95 transition-all"
                  aria-label="Tutup Menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Navigation Items List */}
            <nav className={`flex-1 min-h-0 overflow-y-auto scrollbar-none ${showCollapsed ? 'px-2 py-2.5 space-y-1.5' : 'p-3 space-y-1'}`}>
              {navItems.map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setActiveTab(item.id);
                      setIsMobileMenuOpen(false);
                    }}
                    title={`${item.label}${item.description ? ` — ${item.description}` : ''}`}
                    className={`relative w-full overflow-hidden rounded-xl font-semibold transition-all duration-200 group border ${
                      showCollapsed
                        ? 'flex flex-col items-center justify-center gap-1 px-1.5 py-2'
                        : 'flex items-center gap-3 px-3 py-2.5 text-xs'
                    } ${
                      isActive
                        ? 'bg-slate-900 text-white border-emerald-400/70 shadow-sm'
                        : 'bg-transparent border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/90 hover:border-slate-200/80'
                    }`}
                  >
                    {/* Living Light Sheen on Active Nav Tile */}
                    {isActive && (
                      <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 w-1/3 bg-white/10 animate-sidebar-sheen" />
                    )}

                    {/* Active Edge Accent Strip */}
                    {isActive && (
                      <span
                        aria-hidden="true"
                        className={`pointer-events-none absolute bg-emerald-400 rounded-full ${
                          showCollapsed
                            ? 'top-0 inset-x-4 h-[2.5px]'
                            : 'left-0 inset-y-2 w-[3px]'
                        }`}
                      />
                    )}

                    {/* Icon Container with Optional Corner Badge in Collapsed Mode */}
                    <span
                      className={`relative flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:scale-105 ${
                        showCollapsed
                          ? `w-8 h-8 rounded-lg ${isActive ? 'bg-white/15 text-emerald-300' : 'bg-slate-100/80 text-slate-600 group-hover:bg-emerald-50 group-hover:text-emerald-700'}`
                          : isActive
                          ? 'text-emerald-300'
                          : 'text-slate-500 group-hover:text-emerald-700'
                      }`}
                    >
                      {item.icon}
                      {showCollapsed && typeof item.badge === 'number' && (
                        <span
                          className={`absolute -top-1 -right-2 min-w-[18px] h-4 px-1 rounded-full text-[9px] font-mono font-bold tabular-nums flex items-center justify-center border shadow-2xs ${
                            isActive
                              ? 'bg-emerald-500 text-white border-slate-900'
                              : 'bg-slate-800 text-white border-white'
                          }`}
                        >
                          {item.badge > 99 ? '99+' : item.badge}
                        </span>
                      )}
                    </span>

                    {/* Collapsed Micro Label vs Expanded Label */}
                    {showCollapsed ? (
                      <span
                        className={`text-[10px] leading-tight text-center w-full truncate ${
                          isActive ? 'text-white font-bold' : 'text-slate-600 group-hover:text-slate-900 font-semibold'
                        }`}
                      >
                        {item.shortLabel}
                      </span>
                    ) : (
                      <div className="flex-1 text-left truncate flex items-center justify-between gap-2">
                        <span className="truncate">{item.label}</span>
                        {typeof item.badge === 'number' && (
                          <span
                            className={`text-[11px] px-1.5 py-0.5 rounded-full font-mono tabular-nums ${
                              isActive ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30' : 'bg-slate-200/80 text-slate-700'
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Bottom Sidebar Footer */}
          <div className={`border-t border-slate-100 bg-slate-50/70 ${showCollapsed ? 'p-2 space-y-2' : 'p-3 space-y-2'}`}>
            {/* Role Mode Switcher (Admin Full Akses vs Petugas Pencairan) */}
            {appRole === 'admin' ? (
              <div className="space-y-1.5">
                {pendingCancelCount > 0 && onOpenCancelApprovals && (
                  <button
                    type="button"
                    onClick={() => {
                      onOpenCancelApprovals();
                      setIsMobileMenuOpen(false);
                    }}
                    title={`${pendingCancelCount} pengajuan pembatalan menunggu ACC`}
                    className={`w-full py-1.5 px-2 text-[11px] font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 border border-amber-300 rounded-lg transition-colors flex items-center ${
                      showCollapsed ? 'justify-center gap-1' : 'justify-between px-2.5'
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      <Bell className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                      {!showCollapsed && <span>ACC Batal</span>}
                    </span>
                    <span className="px-1.5 py-0.2 rounded-full bg-amber-600 text-white text-[10px] font-mono">
                      {pendingCancelCount}
                    </span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    onSwitchToPetugas();
                    setIsMobileMenuOpen(false);
                  }}
                  title="Mode Admin Aktif — Klik untuk beralih ke Mode Petugas"
                  className={`w-full py-1.5 px-2 text-[11px] font-bold text-emerald-900 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg transition-colors flex items-center ${
                    showCollapsed ? 'justify-center gap-1 text-[10px]' : 'justify-between px-2.5'
                  }`}
                >
                  <span className="flex items-center gap-1.5 min-w-0">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                    <span className="truncate">{showCollapsed ? 'Admin' : 'Mode Admin'}</span>
                  </span>
                  {!showCollapsed && (
                    <span className="text-[10px] font-semibold text-emerald-700 bg-white px-1.5 py-0.5 rounded border border-emerald-200">
                      Kunci
                    </span>
                  )}
                </button>
              </div>
            ) : (
              <div className="space-y-1.5">
                {!showCollapsed && (
                  <div className="px-2.5 py-1.5 rounded-lg bg-slate-100 border border-slate-200 flex items-center gap-1.5 text-[11px] font-semibold text-slate-700">
                    <UserCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span className="truncate">Mode Petugas (Pencairan & Lihat)</span>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => {
                    onOpenAdminPinModal();
                    setIsMobileMenuOpen(false);
                  }}
                  title="Masuk ke Mode Admin dengan PIN"
                  className={`w-full py-1.5 px-2 text-[11px] font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors flex items-center shadow-2xs ${
                    showCollapsed ? 'justify-center gap-1 text-[10px]' : 'justify-center gap-1.5 px-2.5'
                  }`}
                >
                  <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>{showCollapsed ? 'Admin' : 'Masuk Mode Admin'}</span>
                </button>
              </div>
            )}

            {/* PWA Install Button */}
            {!showCollapsed && (
              <div>
                <PWAInstallButton className="w-full justify-center" variant="chip" />
              </div>
            )}

            {onOpenAbout && (
              <button
                type="button"
                onClick={() => {
                  onOpenAbout();
                  setIsMobileMenuOpen(false);
                }}
                title="Tentang Aplikasi & Hak Cipta (Denuda)"
                className={`w-full py-1.5 px-2 text-[11px] font-semibold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors flex items-center ${
                  showCollapsed ? 'justify-center gap-1 text-[10px]' : 'justify-between px-2.5'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>{showCollapsed ? 'Info' : 'Tentang Aplikasi'}</span>
                </span>
                {!showCollapsed && (
                  <span className="text-[10px] text-slate-400 font-medium">&copy; Denuda</span>
                )}
              </button>
            )}
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-y-auto pb-20 md:pb-0 print:pb-0">
          {children}
        </div>

        {/* Mobile Bottom Quick-Nav Bar (Living Top Architectural Border + Matching Active Tile Design) */}
        <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md px-1.5 pt-2 pb-1.5 grid grid-cols-5 gap-1 shadow-[0_-6px_24px_rgba(15,23,42,0.08)] print:hidden">
          {/* Living Horizontal Top Seam */}
          <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-[2.5px] bg-gradient-to-r from-slate-200 via-emerald-200/70 to-slate-200 overflow-hidden">
            <div className="h-full w-32 bg-gradient-to-r from-transparent via-emerald-500 to-teal-300 animate-header-edge-beam" />
          </div>
          <div aria-hidden="true" className="pointer-events-none absolute top-[4px] left-2 w-2 h-2 border-t-2 border-l-2 border-emerald-500/60 rounded-tl-[2px]" />
          <div aria-hidden="true" className="pointer-events-none absolute top-[4px] right-2 w-2 h-2 border-t-2 border-r-2 border-emerald-500/60 rounded-tr-[2px]" />

          {(
            [
              { id: 'dashboard', label: 'Beranda', icon: <BarChart3 className="w-4 h-4" /> },
              { id: 'invoices', label: 'Faktur', icon: <FileSpreadsheet className="w-4 h-4" /> },
              { id: 'payout_records', label: 'Terima', icon: <CheckCircle2 className="w-4 h-4" /> },
              { id: 'customers', label: 'Konsumen', icon: <Users className="w-4 h-4" /> },
            ] as const
          ).map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`relative overflow-hidden flex flex-col items-center justify-center gap-0.5 py-1.5 min-h-[44px] rounded-xl border transition-all duration-200 ${
                  isActive
                    ? 'bg-slate-900 text-white border-emerald-400/70 shadow-sm font-bold'
                    : 'bg-transparent border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 font-medium'
                }`}
              >
                {isActive && (
                  <>
                    <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 w-1/3 bg-white/10 animate-sidebar-sheen" />
                    <span aria-hidden="true" className="pointer-events-none absolute top-0 inset-x-3 h-[2px] bg-emerald-400 rounded-full" />
                  </>
                )}
                <span className={`relative transition-transform duration-200 ${isActive ? 'text-emerald-300 -translate-y-0.5' : ''}`}>
                  {tab.icon}
                </span>
                <span className="text-[10px] leading-none relative">{tab.label}</span>
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(true)}
            className={`relative overflow-hidden flex flex-col items-center justify-center gap-0.5 py-1.5 min-h-[44px] rounded-xl border transition-all duration-200 ${
              activeTab === 'top10' || activeTab === 'master_customers' || (appRole === 'admin' && activeTab === 'settings')
                ? 'bg-slate-900 text-white border-emerald-400/70 shadow-sm font-bold'
                : 'bg-transparent border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 font-medium'
            }`}
          >
            {(activeTab === 'top10' || activeTab === 'master_customers' || (appRole === 'admin' && activeTab === 'settings')) && (
              <>
                <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 w-1/3 bg-white/10 animate-sidebar-sheen" />
                <span aria-hidden="true" className="pointer-events-none absolute top-0 inset-x-3 h-[2px] bg-emerald-400 rounded-full" />
              </>
            )}
            <span className={`relative ${activeTab === 'top10' || activeTab === 'master_customers' || (appRole === 'admin' && activeTab === 'settings') ? 'text-emerald-300 -translate-y-0.5' : ''}`}>
              <Menu className="w-4 h-4" />
            </span>
            <span className="text-[10px] leading-none relative">Menu</span>
          </button>
        </nav>

      </div>
    );
  }

  /* -------------------------------------------------------------
   * RENDER MODE 2: TOP BAR NAVIGATION (DI ATAS)
   * ----------------------------------------------------------- */
  if (navPosition === 'top') {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">

        {/* Top Navbar (Consistent on Desktop & Mobile) */}
        <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md shadow-xs print:hidden relative">
          <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between min-h-14 sm:h-16 py-2 sm:py-0 gap-3">

              {/* Brand Zone */}
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="relative p-[1.5px] rounded-xl overflow-hidden shrink-0 shadow-2xs">
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute -inset-[80%] bg-[conic-gradient(from_0deg,#10b981_0deg,#0f766e_70deg,#cbd5e1_140deg,#34d399_220deg,#0ea5e9_290deg,#10b981_360deg)] animate-sidebar-orbit opacity-90"
                  />
                  {renderBrandEmblem('w-8 h-8 sm:w-9 sm:h-9 rounded-[10px]', 'w-4 h-4')}
                </div>
                <div className="min-w-0">
                  <span className="text-sm sm:text-base font-extrabold tracking-tight text-slate-900 break-words leading-tight block">
                    {storeName}
                  </span>
                </div>
              </div>

              {/* Nav Links (Desktop) */}
              <nav className="hidden lg:flex items-center gap-1 overflow-x-auto py-1">
                {navItems.map((item) => {
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setActiveTab(item.id)}
                      className={`relative overflow-hidden flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl border transition-all whitespace-nowrap shrink-0 ${
                        isActive
                          ? 'bg-slate-900 text-white border-emerald-400/70 shadow-xs'
                          : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      }`}
                    >
                      {isActive && (
                        <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 w-1/3 bg-white/10 animate-sidebar-sheen" />
                      )}
                      <span className={isActive ? 'text-emerald-300' : ''}>{item.icon}</span>
                      <span>{item.label}</span>
                      {typeof item.badge === 'number' && (
                        <span
                          className={`text-[11px] px-1.5 py-0.2 rounded-full tabular-nums ${
                            isActive ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </nav>

              {/* Action Zone */}
              <div className="flex items-center gap-2 shrink-0">
                {appRole === 'admin' && pendingCancelCount > 0 && onOpenCancelApprovals && (
                  <button
                    type="button"
                    onClick={onOpenCancelApprovals}
                    className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 border border-amber-300 rounded-lg transition-colors"
                  >
                    <Bell className="w-3.5 h-3.5 text-amber-700" />
                    <span>{pendingCancelCount}</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={appRole === 'admin' ? onSwitchToPetugas : onOpenAdminPinModal}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold rounded-lg border transition-colors ${
                    appRole === 'admin'
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                      : 'bg-slate-900 text-white border-slate-900 hover:bg-slate-800'
                  }`}
                >
                  {appRole === 'admin' ? (
                    <>
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Mode Admin</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-3.5 h-3.5 text-amber-400" />
                      <span>Masuk Admin</span>
                    </>
                  )}
                </button>

                <div className="hidden sm:block">
                  <PWAInstallButton variant="chip" />
                </div>

                {onOpenAbout && (
                  <button
                    type="button"
                    onClick={onOpenAbout}
                    title="Tentang Aplikasi & Hak Cipta"
                    className="p-2 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg transition-colors shrink-0"
                    aria-label="Tentang Aplikasi"
                  >
                    <Info className="w-4 h-4 text-emerald-600" />
                  </button>
                )}
              </div>

            </div>

            {/* Mobile / Tablet Scrollable Sub-bar */}
            <div className="flex lg:hidden items-center gap-1 overflow-x-auto py-2 border-t border-slate-100 scrollbar-none">
              {navItems.map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveTab(item.id)}
                    className={`relative overflow-hidden flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border whitespace-nowrap shrink-0 ${
                      isActive
                        ? 'bg-slate-900 text-white border-emerald-400/70'
                        : 'border-transparent text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {isActive && (
                      <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 w-1/3 bg-white/10 animate-sidebar-sheen" />
                    )}
                    <span className={isActive ? 'text-emerald-300' : ''}>{item.icon}</span>
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Living Horizontal Bottom Seam */}
          <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-[2.5px] bg-gradient-to-r from-slate-200 via-emerald-200/70 to-slate-200 overflow-hidden">
            <div className="h-full w-32 bg-gradient-to-r from-transparent via-emerald-500 to-teal-300 animate-header-edge-beam" />
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 flex flex-col min-w-0">
          {children}
        </div>

      </div>
    );
  }

  /* -------------------------------------------------------------
   * RENDER MODE 3: FLOATING BOTTOM DOCK (DI BAWAH)
   * ----------------------------------------------------------- */
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans relative pb-24 print:pb-0 print:bg-white">

      {/* Quiet Top Sub-Header (Consistent on Desktop & Mobile) */}
      <header className="bg-white/95 backdrop-blur-md sticky top-0 z-30 px-3 sm:px-6 py-2.5 shadow-xs print:hidden relative">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="relative p-[1.5px] rounded-xl overflow-hidden shrink-0 shadow-2xs">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -inset-[80%] bg-[conic-gradient(from_0deg,#10b981_0deg,#0f766e_70deg,#cbd5e1_140deg,#34d399_220deg,#0ea5e9_290deg,#10b981_360deg)] animate-sidebar-orbit opacity-90"
              />
              {renderBrandEmblem('w-8 h-8 rounded-[10px]', 'w-4 h-4')}
            </div>
            <div className="min-w-0">
              <span className="font-extrabold text-slate-900 text-[13px] sm:text-sm leading-tight break-words block">
                {storeName}
              </span>
              <span className="text-[10px] text-emerald-700 font-semibold block truncate">
                {activeNavItem?.label || 'Rekap Transparan'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {appRole === 'admin' && pendingCancelCount > 0 && onOpenCancelApprovals && (
              <button
                type="button"
                onClick={onOpenCancelApprovals}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 border border-amber-300 rounded-lg transition-colors"
              >
                <Bell className="w-3.5 h-3.5 text-amber-700" />
                <span>{pendingCancelCount}</span>
              </button>
            )}
            <button
              type="button"
              onClick={appRole === 'admin' ? onSwitchToPetugas : onOpenAdminPinModal}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold rounded-lg border transition-colors ${
                appRole === 'admin'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                  : 'bg-slate-900 text-white border-slate-900 hover:bg-slate-800'
              }`}
            >
              {appRole === 'admin' ? (
                <>
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Admin</span>
                </>
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5 text-amber-400" />
                  <span>Masuk Admin</span>
                </>
              )}
            </button>
            <div className="hidden sm:block">
              <PWAInstallButton variant="chip" />
            </div>
            {onOpenAbout && (
              <button
                type="button"
                onClick={onOpenAbout}
                title="Tentang Aplikasi & Hak Cipta"
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg transition-colors"
                aria-label="Tentang Aplikasi"
              >
                <Info className="w-3.5 h-3.5 text-emerald-600" />
                <span className="hidden sm:inline">Tentang</span>
              </button>
            )}
          </div>
        </div>

        {/* Living Horizontal Bottom Seam */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-[2.5px] bg-gradient-to-r from-slate-200 via-emerald-200/70 to-slate-200 overflow-hidden">
          <div className="h-full w-32 bg-gradient-to-r from-transparent via-emerald-500 to-teal-300 animate-header-edge-beam" />
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {children}
      </div>

      {/* Modern Bottom Dock (Fixed native bottom bar on mobile, floating dock on desktop) */}
      <div className="fixed bottom-0 sm:bottom-4 inset-x-0 z-50 flex justify-center pointer-events-none sm:px-3 print:hidden">
        <div className="pointer-events-auto relative overflow-hidden w-full sm:w-auto bg-white/95 backdrop-blur-xl border-t sm:border border-slate-200/90 shadow-2xl sm:rounded-2xl px-1.5 py-1.5 sm:p-1.5 flex items-center justify-start sm:justify-center gap-1 max-w-full overflow-x-auto scrollbar-none ring-1 ring-black/5">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`relative overflow-hidden flex flex-col sm:flex-row items-center gap-0.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl text-xs font-semibold border transition-all whitespace-nowrap shrink-0 group ${
                  isActive
                    ? 'bg-slate-900 text-white border-emerald-400/70 shadow-sm'
                    : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                {isActive && (
                  <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 w-1/3 bg-white/10 animate-sidebar-sheen" />
                )}
                <span className={`shrink-0 ${isActive ? 'text-emerald-300' : 'text-slate-500 group-hover:text-slate-900'}`}>
                  {item.icon}
                </span>
                <span className="text-[10px] sm:text-xs font-medium sm:hidden">{item.shortLabel}</span>
                <span className="hidden sm:inline text-xs font-medium">{item.label}</span>
                {typeof item.badge === 'number' && (
                  <span
                    className={`hidden sm:inline text-[10px] px-1.5 py-0.2 rounded-full tabular-nums ${
                      isActive ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

    </div>
  );
};
