import React from 'react';
import { 
  BarChart3, 
  Trophy, 
  FileSpreadsheet, 
  Users, 
  Settings as SettingsIcon, 
  Plus, 
  Download,
  Receipt,
  Contact
} from 'lucide-react';
import { ActiveTab } from '../types/cashback';

interface NavbarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  onOpenNewInvoice: () => void;
  onExportExcel: () => void;
  totalInvoicesCount: number;
  totalMasterCustomersCount?: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onOpenNewInvoice,
  onExportExcel,
  totalInvoicesCount,
  totalMasterCustomersCount,
}) => {
  const navItems: { id: ActiveTab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'dashboard', label: 'Dashboard Analitik', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'top10', label: '10 Besar Tertinggi', icon: <Trophy className="w-4 h-4" /> },
    { id: 'invoices', label: 'Rekap Faktur', icon: <FileSpreadsheet className="w-4 h-4" />, badge: totalInvoicesCount },
    { id: 'customers', label: 'Rekap Konsumen', icon: <Users className="w-4 h-4" /> },
    { id: 'master_customers', label: 'Master Konsumen', icon: <Contact className="w-4 h-4" />, badge: totalMasterCustomersCount },
    { id: 'settings', label: 'Pengaturan %', icon: <SettingsIcon className="w-4 h-4" /> },
  ];

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          
          {/* Brand Zone */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-9 h-9 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-bold shadow-sm">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-bold tracking-tight text-slate-900 whitespace-nowrap">
                  CashbackPro
                </span>
                <span className="text-xs text-emerald-800 font-medium bg-emerald-50 px-2 py-0.5 rounded">
                  Analitik Transparan
                </span>
              </div>
            </div>
          </div>

          {/* Nav Links */}
          <nav className="hidden md:flex items-center gap-1 overflow-x-auto py-1">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-all whitespace-nowrap shrink-0 ${
                    isActive
                      ? 'bg-slate-900 text-white shadow-sm'
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

          {/* Action Zone */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onExportExcel}
              title="Export data ke file Excel (.xlsx)"
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Export</span> Excel
            </button>

            <button
              onClick={onOpenNewInvoice}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-all whitespace-nowrap shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Input Faktur</span>
            </button>
          </div>

        </div>

        {/* Mobile Navigation bar */}
        <div className="flex md:hidden items-center gap-1 overflow-x-auto py-2 border-t border-slate-100 scrollbar-none">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap shrink-0 ${
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
      </div>
    </header>
  );
};
