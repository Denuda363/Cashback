import React, { useState } from 'react';
import { 
  BarChart3, 
  Trophy, 
  FileSpreadsheet, 
  Users, 
  Contact, 
  Settings as SettingsIcon, 
  Plus, 
  Download, 
  Receipt,
  LayoutTemplate,
  Sidebar as SidebarIcon,
  AlignVerticalSpaceAround,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Wallet,
  Cloud,
  Upload,
} from 'lucide-react';
import { ActiveTab, NavPosition } from '../types/cashback';
import { formatRupiah } from '../utils/cashbackCalculator';

interface SmartNavigationProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  navPosition: NavPosition;
  onChangeNavPosition: (pos: NavPosition) => void;
  onOpenNewInvoice: () => void;
  onExportExcel: () => void;
  onOpenImportExcel?: () => void;
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
  onOpenNewInvoice,
  onExportExcel,
  onOpenImportExcel,
  totalInvoicesCount,
  totalMasterCustomersCount,
  totalCashbackSum = 0,
  storeName = 'CashbackPro',
  isFirebaseConnected = true,
  children,
}) => {
  // Mobile drawer state (for sidebar mode on mobile or mobile hamburger)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  // Collapsible sidebar state on desktop
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const navItems: { id: ActiveTab; label: string; icon: React.ReactNode; badge?: number; description?: string }[] = [
    { id: 'dashboard', label: 'Dashboard Analitik', icon: <BarChart3 className="w-4 h-4" />, description: 'Ringkasan & tren omset' },
    { id: 'top10', label: '10 Besar Tertinggi', icon: <Trophy className="w-4 h-4" />, description: 'Podium reward konsumen' },
    { id: 'invoices', label: 'Rekap Faktur', icon: <FileSpreadsheet className="w-4 h-4" />, badge: totalInvoicesCount, description: 'Riwayat data pembelian' },
    { id: 'customers', label: 'Rekap Konsumen', icon: <Users className="w-4 h-4" />, description: 'Akumulasi saldo per orang' },
    { id: 'master_customers', label: 'Master Konsumen', icon: <Contact className="w-4 h-4" />, badge: totalMasterCustomersCount, description: 'Database pelanggan & bank' },
    { id: 'settings', label: 'Pengaturan %', icon: <SettingsIcon className="w-4 h-4" />, description: 'Aturan persen cashback' },
  ];

  // Helper for Nav Position Switcher Widget
  const PositionSwitcher = ({ compact = false }: { compact?: boolean }) => (
    <div className={`flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200/80 ${compact ? 'scale-90' : ''}`}>
      <button
        type="button"
        onClick={() => onChangeNavPosition('sidebar')}
        title="Posisikan navigasi di Samping (Sidebar)"
        className={`p-1.5 rounded-md transition-all ${
          navPosition === 'sidebar'
            ? 'bg-white text-slate-900 shadow-xs font-semibold'
            : 'text-slate-500 hover:text-slate-900'
        }`}
      >
        <SidebarIcon className="w-3.5 h-3.5" />
      </button>
      <button
        type="button"
        onClick={() => onChangeNavPosition('top')}
        title="Posisikan navigasi di Atas (Top Bar)"
        className={`p-1.5 rounded-md transition-all ${
          navPosition === 'top'
            ? 'bg-white text-slate-900 shadow-xs font-semibold'
            : 'text-slate-500 hover:text-slate-900'
        }`}
      >
        <LayoutTemplate className="w-3.5 h-3.5" />
      </button>
      <button
        type="button"
        onClick={() => onChangeNavPosition('bottom')}
        title="Posisikan navigasi di Bawah (Floating Dock)"
        className={`p-1.5 rounded-md transition-all ${
          navPosition === 'bottom'
            ? 'bg-white text-slate-900 shadow-xs font-semibold'
            : 'text-slate-500 hover:text-slate-900'
        }`}
      >
        <AlignVerticalSpaceAround className="w-3.5 h-3.5" />
      </button>
    </div>
  );

  const FirebaseStatusBadge = ({ compact = false }: { compact?: boolean }) => (
    <div 
      title="Tersambung langsung ke Firebase Firestore Cloud secara otomatis tanpa perlu login"
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-all ${
        isFirebaseConnected
          ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
          : 'bg-amber-50 border-amber-200 text-amber-800'
      } ${compact ? 'text-[10px] px-2 py-0.5' : ''}`}
    >
      <span className="relative flex h-2 w-2">
        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
          isFirebaseConnected ? 'bg-emerald-400' : 'bg-amber-400'
        }`}></span>
        <span className={`relative inline-flex rounded-full h-2 w-2 ${
          isFirebaseConnected ? 'bg-emerald-500' : 'bg-amber-500'
        }`}></span>
      </span>
      <Cloud className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
      <span className="truncate">
        {compact ? 'Firebase Otomatis' : 'Firebase Terhubung Otomatis'}
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
        <header className="md:hidden sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 px-3.5 py-2.5 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-1.5 -ml-1 text-slate-700 hover:bg-slate-100 rounded-lg active:scale-95 transition-transform"
              aria-label="Buka Menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-1.5">
              <div className="w-6 h-6 rounded-md bg-emerald-600 flex items-center justify-center text-white font-bold shadow-xs">
                <Receipt className="w-3.5 h-3.5" />
              </div>
              <span className="font-bold text-slate-900 text-sm tracking-tight">CashbackPro</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Minimalist Cloud Badge */}
            <div 
              title="Firebase Firestore Cloud Terhubung Otomatis"
              className="flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-[10px] font-semibold text-emerald-800"
            >
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
              </span>
              <Cloud className="w-3 h-3 text-emerald-600 shrink-0" />
              <span className="hidden xs:inline">Cloud</span>
            </div>

            <button
              onClick={onOpenNewInvoice}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-95 rounded-lg shadow-xs transition-all"
              title="Input Faktur Baru"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Faktur</span>
            </button>
          </div>
        </header>

        {/* Backdrop for Mobile Drawer */}
        {isMobileMenuOpen && (
          <div 
            onClick={() => setIsMobileMenuOpen(false)}
            className="md:hidden fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs transition-opacity"
          />
        )}

        {/* Desktop & Mobile Sidebar Container */}
        <aside
          className={`
            fixed md:sticky top-0 z-50 md:z-30 h-screen bg-white border-r border-slate-200 flex flex-col justify-between transition-all duration-200 ease-in-out
            ${isMobileMenuOpen ? 'translate-x-0 w-72' : '-translate-x-full md:translate-x-0'}
            ${isSidebarCollapsed ? 'md:w-20' : 'md:w-64'}
          `}
        >
          {/* Top Brand & Toggle */}
          <div>
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-bold shadow-xs shrink-0">
                  <Receipt className="w-5 h-5" />
                </div>
                {!isSidebarCollapsed && (
                  <div className="truncate">
                    <div className="text-sm font-extrabold tracking-tight text-slate-900 truncate">
                      {storeName}
                    </div>
                    <div className="text-[10px] text-emerald-800 font-semibold bg-emerald-50 px-1.5 py-0.2 rounded inline-block">
                      Rekap Transparan
                    </div>
                  </div>
                )}
              </div>

              {/* Desktop Collapse Button */}
              <button
                onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                className="hidden md:flex p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg"
                title={isSidebarCollapsed ? 'Perlebar Sidebar' : 'Kecilkan Sidebar'}
              >
                {isSidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
              </button>

              {/* Mobile Close Button */}
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="md:hidden p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Firebase Live Cloud Status */}
            <div className="px-3 py-2 border-b border-slate-100 bg-slate-50/60 flex items-center justify-center">
              <FirebaseStatusBadge compact={isSidebarCollapsed} />
            </div>

            {/* Navigation Items List */}
            <nav className="p-3 space-y-1 overflow-y-auto max-h-[calc(100vh-280px)]">
              {navItems.map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id);
                      setIsMobileMenuOpen(false);
                    }}
                    title={item.label}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all group ${
                      isActive
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    } ${isSidebarCollapsed ? 'justify-center px-2' : ''}`}
                  >
                    <span className={`shrink-0 ${isActive ? 'text-white' : 'text-slate-500 group-hover:text-slate-900'}`}>
                      {item.icon}
                    </span>

                    {!isSidebarCollapsed && (
                      <div className="flex-1 text-left truncate flex items-center justify-between">
                        <span className="truncate">{item.label}</span>
                        {typeof item.badge === 'number' && (
                          <span
                            className={`text-[11px] px-1.5 py-0.2 rounded-full font-mono tabular-nums ${
                              isActive ? 'bg-slate-700 text-slate-200' : 'bg-slate-200 text-slate-700'
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

          {/* Bottom Sidebar Widgets & Quick Actions */}
          <div className="p-3 border-t border-slate-100 space-y-3 bg-slate-50/50">
            
            {/* Quick Stats Box (if expanded) */}
            {!isSidebarCollapsed && (
              <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-xs">
                <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
                  <span className="flex items-center gap-1 font-medium">
                    <Wallet className="w-3 h-3 text-emerald-600" /> Total Cashback
                  </span>
                  <span className="text-emerald-700 font-bold">Aktif</span>
                </div>
                <div className="text-sm font-bold font-mono tabular-nums text-slate-900">
                  {formatRupiah(totalCashbackSum)}
                </div>
              </div>
            )}

            {/* Quick Action Button: Input Faktur */}
            <button
              onClick={() => {
                onOpenNewInvoice();
                setIsMobileMenuOpen(false);
              }}
              className={`w-full py-2 px-3 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 ${
                isSidebarCollapsed ? 'p-2' : ''
              }`}
              title="Input Faktur Baru"
            >
              <Plus className="w-4 h-4 shrink-0" />
              {!isSidebarCollapsed && <span>Input Faktur</span>}
            </button>

            {/* Position Selector Widget & Excel Actions */}
            <div className={`flex items-center justify-between gap-1 pt-1 ${isSidebarCollapsed ? 'flex-col' : ''}`}>
              {onOpenImportExcel && (
                <button
                  onClick={onOpenImportExcel}
                  title="Import data faktur dari file Excel (.xlsx)"
                  className={`p-2 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors flex items-center justify-center gap-1 ${
                    isSidebarCollapsed ? 'w-full' : 'flex-1'
                  }`}
                >
                  <Upload className="w-3.5 h-3.5 shrink-0" />
                  {!isSidebarCollapsed && <span className="text-[11px]">Import</span>}
                </button>
              )}
              <button
                onClick={onExportExcel}
                title="Export data ke file Excel (.xlsx)"
                className={`p-2 text-xs font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors flex items-center justify-center gap-1 ${
                  isSidebarCollapsed ? 'w-full' : 'flex-1'
                }`}
              >
                <Download className="w-3.5 h-3.5 shrink-0" />
                {!isSidebarCollapsed && <span className="text-[11px]">Export</span>}
              </button>

              <div title="Pindah posisi navigasi (Samping / Atas / Bawah)">
                <PositionSwitcher compact={isSidebarCollapsed} />
              </div>
            </div>

          </div>
        </aside>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
          {children}
        </div>

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
        <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-xs">
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

                <button
                  onClick={onOpenNewInvoice}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-all whitespace-nowrap shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>Input Faktur</span>
                </button>
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
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans relative pb-28">
      
      {/* Quiet Top Sub-Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-30 px-4 sm:px-6 py-3 shadow-xs">
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
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {children}
      </div>

      {/* Modern Bottom Dock (Fixed native bottom bar on mobile, floating dock on desktop) */}
      <div className="fixed bottom-0 sm:bottom-4 inset-x-0 z-50 flex justify-center pointer-events-none sm:px-3">
        <div className="pointer-events-auto w-full sm:w-auto bg-white/95 sm:bg-white/95 backdrop-blur-xl border-t sm:border border-slate-200/90 shadow-2xl sm:rounded-2xl px-2 py-1.5 sm:p-1.5 flex items-center justify-around sm:justify-center gap-1 max-w-full overflow-x-auto ring-1 ring-black/5 animate-in slide-in-from-bottom-3 duration-200">
          
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`relative flex flex-col sm:flex-row items-center gap-1 sm:gap-2 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap shrink-0 group ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <span className={`shrink-0 ${isActive ? 'text-white' : 'text-slate-500 group-hover:text-slate-900'}`}>
                  {item.icon}
                </span>
                <span className="text-[10px] sm:text-xs font-medium">{item.label}</span>
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

          <div className="h-6 w-px bg-slate-200 mx-1 hidden sm:block" />

          {/* Center / Right CTA in Dock */}
          <button
            onClick={onOpenNewInvoice}
            className="flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 sm:py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-95 rounded-xl shadow-md transition-all whitespace-nowrap shrink-0"
            title="Input Faktur Konsumen"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Faktur Baru</span>
          </button>

        </div>
      </div>

    </div>
  );
};
