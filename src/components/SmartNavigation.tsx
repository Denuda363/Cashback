import React, { useState } from 'react';
import { 
  BarChart3, 
  Trophy, 
  FileSpreadsheet, 
  Users, 
  Contact, 
  Settings as SettingsIcon, 
  Download, 
  Receipt,
  LayoutTemplate,
  Sidebar as SidebarIcon,
  AlignVerticalSpaceAround,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  Cloud,
  Upload,
  CheckCircle2,
  Info,
} from 'lucide-react';
import { ActiveTab, NavPosition } from '../types/cashback';
import { PWAInstallButton } from './PWAInstallPrompt';

interface SmartNavigationProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  navPosition: NavPosition;
  onChangeNavPosition: (pos: NavPosition) => void;
  onExportExcel: () => void;
  onOpenImportExcel?: () => void;
  onOpenAbout?: () => void;
  totalInvoicesCount: number;
  totalMasterCustomersCount: number;
  totalCashbackSum?: number;
  storeName?: string;
  isFirebaseConnected?: boolean;
  children: React.ReactNode;
}

export const SmartNavigation: React.FC<SmartNavigationProps> = ({
  activeTab,
  setActiveTab,
  navPosition,
  onChangeNavPosition,
  onExportExcel,
  onOpenImportExcel,
  onOpenAbout,
  totalInvoicesCount,
  totalMasterCustomersCount,
  storeName = 'CashbackPro',
  isFirebaseConnected = true,
  children,
}) => {
  // Mobile drawer state (for sidebar mode on mobile or mobile hamburger)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  // Collapsible sidebar state on desktop
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const navItems: { id: ActiveTab; label: string; shortLabel: string; icon: React.ReactNode; badge?: number; description?: string }[] = [
    { id: 'dashboard', label: 'Dashboard Analitik', shortLabel: 'Dashboard', icon: <BarChart3 className="w-4 h-4" />, description: 'Ringkasan & tren omset' },
    { id: 'top10', label: '10 Besar Tertinggi', shortLabel: 'Top 10', icon: <Trophy className="w-4 h-4" />, description: 'Podium reward konsumen' },
    { id: 'invoices', label: 'Rekap Faktur', shortLabel: 'Faktur', icon: <FileSpreadsheet className="w-4 h-4" />, badge: totalInvoicesCount, description: 'Riwayat data pembelian' },
    { id: 'payout_records', label: 'Penerimaan Cashback', shortLabel: 'Penerimaan', icon: <CheckCircle2 className="w-4 h-4" />, description: 'Rekap serah terima & bukti' },
    { id: 'customers', label: 'Rekap Konsumen', shortLabel: 'Konsumen', icon: <Users className="w-4 h-4" />, description: 'Akumulasi saldo per orang' },
    { id: 'master_customers', label: 'Master Konsumen', shortLabel: 'Master', icon: <Contact className="w-4 h-4" />, badge: totalMasterCustomersCount, description: 'Database pelanggan & bank' },
    { id: 'settings', label: 'Pengaturan', shortLabel: 'Pengaturan', icon: <SettingsIcon className="w-4 h-4" />, description: 'Aturan persen cashback & usaha' },
  ];

  const activeNavItem = navItems.find((n) => n.id === activeTab);

  // Helper for Nav Position Switcher Widget
  const PositionSwitcher = ({ compact = false }: { compact?: boolean }) => (
    <div
      className={
        compact
          ? 'grid grid-cols-3 gap-0.5 p-1 w-full bg-slate-100 rounded-xl border border-slate-200/90'
          : 'flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200/80'
      }
    >
      <button
        type="button"
        onClick={() => onChangeNavPosition('sidebar')}
        title="Posisikan navigasi di Samping (Sidebar)"
        className={`flex items-center justify-center rounded-md transition-all ${compact ? 'p-1.5' : 'p-1.5'} ${
          navPosition === 'sidebar'
            ? 'bg-white text-emerald-700 shadow-xs font-semibold'
            : 'text-slate-500 hover:text-slate-900'
        }`}
      >
        <SidebarIcon className="w-3.5 h-3.5" />
      </button>
      <button
        type="button"
        onClick={() => onChangeNavPosition('top')}
        title="Posisikan navigasi di Atas (Top Bar)"
        className={`flex items-center justify-center rounded-md transition-all ${compact ? 'p-1.5' : 'p-1.5'} ${
          navPosition === 'top'
            ? 'bg-white text-emerald-700 shadow-xs font-semibold'
            : 'text-slate-500 hover:text-slate-900'
        }`}
      >
        <LayoutTemplate className="w-3.5 h-3.5" />
      </button>
      <button
        type="button"
        onClick={() => onChangeNavPosition('bottom')}
        title="Posisikan navigasi di Bawah (Floating Dock)"
        className={`flex items-center justify-center rounded-md transition-all ${compact ? 'p-1.5' : 'p-1.5'} ${
          navPosition === 'bottom'
            ? 'bg-white text-emerald-700 shadow-xs font-semibold'
            : 'text-slate-500 hover:text-slate-900'
        }`}
      >
        <AlignVerticalSpaceAround className="w-3.5 h-3.5" />
      </button>
    </div>
  );

  const FirebaseStatusBadge = () => (
    <div 
      title="Tersambung langsung ke Firebase Firestore Cloud secara otomatis tanpa perlu login"
      className={`inline-flex items-center justify-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold border transition-all ${
        isFirebaseConnected
          ? 'bg-emerald-50/90 border-emerald-200/90 text-emerald-800'
          : 'bg-amber-50/90 border-amber-200/90 text-amber-800'
      }`}
    >
      <span className="relative flex h-2 w-2 shrink-0">
        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
          isFirebaseConnected ? 'bg-emerald-400' : 'bg-amber-400'
        }`}></span>
        <span className={`relative inline-flex rounded-full h-2 w-2 ${
          isFirebaseConnected ? 'bg-emerald-500' : 'bg-amber-500'
        }`}></span>
      </span>
      <Cloud className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
      <span className="whitespace-nowrap">
        Firebase Terhubung Otomatis
      </span>
    </div>
  );

  /* -------------------------------------------------------------
   * RENDER MODE 1: SIDEBAR NAVIGATION (DI SAMPING)
   * ----------------------------------------------------------- */
  if (navPosition === 'sidebar') {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col md:flex-row font-sans">
        
        {/* Minimalist Mobile Header when in sidebar mode */}
        <header className="md:hidden sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 px-3 py-2 flex items-center justify-between gap-2 shadow-xs print:hidden">
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-1.5 -ml-1 text-slate-700 hover:bg-slate-100 rounded-lg active:scale-95 transition-transform shrink-0"
              aria-label="Buka Menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-1.5 min-w-0">
              <div className="w-6 h-6 rounded-md bg-emerald-600 flex items-center justify-center text-white font-bold shadow-xs shrink-0">
                <Receipt className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <span className="font-bold text-slate-900 text-xs tracking-tight block truncate">
                  {activeNavItem?.shortLabel || storeName}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <div 
              title="Firebase Firestore Cloud Terhubung Otomatis"
              className="flex items-center gap-1 px-1.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-[10px] font-semibold text-emerald-800"
            >
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
              </span>
              <Cloud className="w-3 h-3 text-emerald-600 shrink-0" />
            </div>
          </div>
        </header>

        {/* Backdrop for Mobile Drawer */}
        {isMobileMenuOpen && (
          <div 
            onClick={() => setIsMobileMenuOpen(false)}
            className="md:hidden fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs transition-opacity print:hidden"
          />
        )}

        {/* Desktop & Mobile Sidebar Container with Unique Living Architectural Border */}
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

          {/* Floating Border-Seam Collapse Toggle (Never covers company name or logo) */}
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
            <div className={`border-b border-slate-100/90 ${isSidebarCollapsed ? 'px-2 pt-3 pb-2.5' : 'p-3.5'}`}>
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
                      isSidebarCollapsed
                        ? 'flex flex-col items-center justify-center text-center gap-1.5 px-1.5 py-2.5'
                        : 'flex items-center gap-2.5 px-2.5 py-2.5'
                    }`}
                  >
                    {/* Subtle Corner Accent Ticks */}
                    <span aria-hidden="true" className="pointer-events-none absolute top-1 left-1 w-1.5 h-1.5 border-t border-l border-emerald-500/70 rounded-tl-[2px]" />
                    <span aria-hidden="true" className="pointer-events-none absolute bottom-1 right-1 w-1.5 h-1.5 border-b border-r border-emerald-500/70 rounded-br-[2px]" />

                    {/* Animated Emblem Icon */}
                    <div className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-600 via-emerald-600 to-teal-700 flex items-center justify-center text-white font-bold shadow-sm shrink-0 overflow-hidden transition-transform duration-300 group-hover:scale-105">
                      <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 w-1/2 bg-white/25 animate-sidebar-sheen" />
                      <Receipt className="w-4 h-4 relative z-10 transition-transform duration-300 group-hover:-rotate-6" />
                    </div>

                    {/* Full Company Name — ALWAYS visible and never truncated/covered */}
                    <div className={isSidebarCollapsed ? 'w-full min-w-0' : 'flex-1 min-w-0'}>
                      <div
                        className={`font-extrabold tracking-tight text-slate-900 break-words whitespace-normal ${
                          isSidebarCollapsed
                            ? 'text-[11px] leading-[1.2] text-center'
                            : 'text-[13px] leading-snug text-left'
                        }`}
                      >
                        {storeName}
                      </div>
                      {!isSidebarCollapsed && (
                        <div className="text-[10px] text-emerald-700 font-semibold mt-0.5 leading-none">
                          Rekap Transparan
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Mobile Close Button (shown only inside mobile drawer) */}
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="md:hidden p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg shrink-0 mt-1"
                  aria-label="Tutup Menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Navigation Items List */}
            <nav className={`flex-1 min-h-0 overflow-y-auto scrollbar-none ${isSidebarCollapsed ? 'px-2 py-2.5 space-y-1.5' : 'p-3 space-y-1'}`}>
              {navItems.map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id);
                      setIsMobileMenuOpen(false);
                    }}
                    title={`${item.label}${item.description ? ` — ${item.description}` : ''}`}
                    className={`relative w-full overflow-hidden rounded-xl font-semibold transition-all duration-200 group border ${
                      isSidebarCollapsed
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
                          isSidebarCollapsed
                            ? 'top-0 inset-x-4 h-[2.5px]'
                            : 'left-0 inset-y-2 w-[3px]'
                        }`}
                      />
                    )}

                    {/* Icon Container with Optional Corner Badge in Collapsed Mode */}
                    <span
                      className={`relative flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:scale-105 ${
                        isSidebarCollapsed
                          ? `w-8 h-8 rounded-lg ${isActive ? 'bg-white/15 text-emerald-300' : 'bg-slate-100/80 text-slate-600 group-hover:bg-emerald-50 group-hover:text-emerald-700'}`
                          : isActive
                          ? 'text-emerald-300'
                          : 'text-slate-500 group-hover:text-emerald-700'
                      }`}
                    >
                      {item.icon}
                      {isSidebarCollapsed && typeof item.badge === 'number' && (
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
                    {isSidebarCollapsed ? (
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
          {(!isSidebarCollapsed || onOpenAbout) && (
            <div className={`border-t border-slate-100 bg-slate-50/70 ${isSidebarCollapsed ? 'p-2 space-y-2' : 'p-3 space-y-2'}`}>
              {/* PWA Install Button */}
              {!isSidebarCollapsed && (
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
                    isSidebarCollapsed ? 'justify-center gap-1 text-[10px]' : 'justify-between px-2.5'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>{isSidebarCollapsed ? 'Info' : 'Tentang Aplikasi'}</span>
                  </span>
                  {!isSidebarCollapsed && (
                    <span className="text-[10px] text-slate-400 font-medium">&copy; Denuda</span>
                  )}
                </button>
              )}
            </div>
          )}
        </aside>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-y-auto pb-20 md:pb-0 print:pb-0">
          {children}
        </div>

        {/* Minimalist Mobile Bottom Quick-Nav Bar */}
        <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-1.5 py-1 grid grid-cols-5 gap-0.5 shadow-[0_-4px_16px_rgba(15,23,42,0.06)] print:hidden">
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
                className={`flex flex-col items-center justify-center gap-0.5 py-1.5 rounded-xl transition-colors ${
                  isActive
                    ? 'text-emerald-700 bg-emerald-50/90 font-bold'
                    : 'text-slate-500 hover:text-slate-900 font-medium'
                }`}
              >
                {tab.icon}
                <span className="text-[10px] leading-none">{tab.label}</span>
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(true)}
            className={`flex flex-col items-center justify-center gap-0.5 py-1.5 rounded-xl transition-colors ${
              activeTab === 'top10' || activeTab === 'master_customers' || activeTab === 'settings'
                ? 'text-emerald-700 bg-emerald-50/90 font-bold'
                : 'text-slate-500 hover:text-slate-900 font-medium'
            }`}
          >
            <Menu className="w-4 h-4" />
            <span className="text-[10px] leading-none">Menu</span>
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
        
        {/* Top Navbar */}
        <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-xs print:hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16 gap-4">
              
              {/* Brand Zone */}
              <div className="flex items-center gap-3 shrink-0">
                <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-bold shadow-xs">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-base font-bold tracking-tight text-slate-900 whitespace-nowrap">
                      {storeName}
                    </span>
                    <span className="text-xs text-emerald-800 font-medium bg-emerald-50 px-2 py-0.5 rounded">
                      Navigasi Atas
                    </span>
                  </div>
                </div>
              </div>

              {/* Nav Links (Desktop) */}
              <nav className="hidden lg:flex items-center gap-1 overflow-x-auto py-1">
                {navItems.map((item) => {
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveTab(item.id)}
                      className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-all whitespace-nowrap shrink-0 ${
                        isActive
                          ? 'bg-slate-900 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      }`}
                    >
                      {item.icon}
                      <span>{item.label}</span>
                      {typeof item.badge === 'number' && (
                        <span
                          className={`text-[11px] px-1.5 py-0.2 rounded-full tabular-nums ${
                            isActive ? 'bg-slate-700 text-slate-200' : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </nav>

              {/* Action Zone & Position Switcher */}
              <div className="flex items-center gap-2 shrink-0">
                <div className="hidden sm:block">
                  <FirebaseStatusBadge />
                </div>
                
                {/* Position Switcher Widget */}
                <div className="hidden sm:block" title="Ubah posisi bar navigasi">
                  <PositionSwitcher />
                </div>

                <div className="hidden sm:block">
                  <PWAInstallButton variant="chip" />
                </div>

                {onOpenImportExcel && (
                  <button
                    onClick={onOpenImportExcel}
                    title="Import data faktur dari Excel (.xlsx)"
                    className="hidden md:flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors whitespace-nowrap shrink-0"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Import Excel</span>
                  </button>
                )}

                <button
                  onClick={onExportExcel}
                  title="Export data ke file Excel (.xlsx)"
                  className="hidden md:flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export</span>
                </button>

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
            <div className="flex lg:hidden items-center justify-between gap-2 overflow-x-auto py-2 border-t border-slate-100 scrollbar-none">
              <div className="flex items-center gap-1 overflow-x-auto">
                {navItems.map((item) => {
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveTab(item.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md whitespace-nowrap shrink-0 ${
                        isActive
                          ? 'bg-slate-900 text-white'
                          : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {item.icon}
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
              <div className="sm:hidden shrink-0">
                <PositionSwitcher compact />
              </div>
            </div>

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
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans relative pb-28 print:pb-0 print:bg-white">
      
      {/* Quiet Top Sub-Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-30 px-4 sm:px-6 py-3 shadow-xs print:hidden">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-bold shadow-xs">
              <Receipt className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-slate-900 text-sm">{storeName}</span>
              <span className="text-[10px] text-slate-500 block">Mode Dock Bawah Aktif</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden sm:block">
              <FirebaseStatusBadge />
            </div>
            <PositionSwitcher />
            <div className="hidden sm:block">
              <PWAInstallButton variant="chip" />
            </div>
            {onOpenImportExcel && (
              <button
                onClick={onOpenImportExcel}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors"
                title="Import data faktur dari Excel"
              >
                <Upload className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Import Excel</span>
              </button>
            )}
            <button
              onClick={onExportExcel}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Export Excel</span>
            </button>
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
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {children}
      </div>

      {/* Modern Bottom Dock (Fixed native bottom bar on mobile, floating dock on desktop) */}
      <div className="fixed bottom-0 sm:bottom-4 inset-x-0 z-50 flex justify-center pointer-events-none sm:px-3 print:hidden">
        <div className="pointer-events-auto w-full sm:w-auto bg-white/95 backdrop-blur-xl border-t sm:border border-slate-200/90 shadow-2xl sm:rounded-2xl px-1.5 py-1.5 sm:p-1.5 flex items-center justify-start sm:justify-center gap-1 max-w-full overflow-x-auto scrollbar-none ring-1 ring-black/5 animate-in slide-in-from-bottom-3 duration-200">
          
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`relative flex flex-col sm:flex-row items-center gap-0.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap shrink-0 group ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <span className={`shrink-0 ${isActive ? 'text-white' : 'text-slate-500 group-hover:text-slate-900'}`}>
                  {item.icon}
                </span>
                <span className="text-[10px] sm:text-xs font-medium sm:hidden">{item.shortLabel}</span>
                <span className="hidden sm:inline text-xs font-medium">{item.label}</span>
                {typeof item.badge === 'number' && (
                  <span
                    className={`hidden sm:inline text-[10px] px-1.5 py-0.2 rounded-full tabular-nums ${
                      isActive ? 'bg-slate-700 text-slate-200' : 'bg-slate-200 text-slate-700'
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
