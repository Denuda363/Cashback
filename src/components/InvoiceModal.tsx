import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  X, 
  Receipt, 
  Calculator, 
  CheckCircle2, 
  AlertCircle,
  Search,
  UserCheck,
  UserPlus,
  Wallet,
  MapPin,
  ChevronDown,
  Gift
} from 'lucide-react';
import { CashbackSettings, ClaimStatus, CustomerMaster, Invoice, PayoutMethod, CustomerBenefitType } from '../types/cashback';
import { calculateCashback, formatRupiah } from '../utils/cashbackCalculator';

interface InvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (invoiceData: Omit<Invoice, 'id' | 'createdAt'>, invoiceId?: string) => void;
  editingInvoice?: Invoice | null;
  settings: CashbackSettings;
  existingInvoices: Invoice[];
  masterCustomers: CustomerMaster[];
  onQuickAddMasterCustomer?: (customer: Omit<CustomerMaster, 'id'>) => void;
}

export const InvoiceModal: React.FC<InvoiceModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingInvoice,
  settings,
  existingInvoices,
  masterCustomers,
  onQuickAddMasterCustomer,
}) => {
  // Form states
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [date, setDate] = useState('');
  
  // Customer Search & Selection
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [isSearchDropdownOpen, setIsSearchDropdownOpen] = useState(false);
  const [selectedMasterCustomer, setSelectedMasterCustomer] = useState<CustomerMaster | null>(null);

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [category, setCategory] = useState('Elektronik & Gadget');
  const [itemsDescription, setItemsDescription] = useState('');
  const [purchaseAmount, setPurchaseAmount] = useState<number>(0);
  const [purchaseAmountInput, setPurchaseAmountInput] = useState<string>('');
  
  // Custom override toggle & value
  const [isCustomRate, setIsCustomRate] = useState(false);
  const [customRate, setCustomRate] = useState<number>(settings.flatPercentage);

  const [claimStatus, setClaimStatus] = useState<ClaimStatus>('pending');
  const payoutMethod: PayoutMethod = 'tunai';
  const [disbursedDate, setDisbursedDate] = useState('');
  const [notes, setNotes] = useState('');
  const [benefitType, setBenefitType] = useState<CustomerBenefitType>('cashback_parcel');
  const [getParcel, setGetParcel] = useState<boolean>(true);

  // Quick Add New Customer Modal State
  const [isQuickAddingCustomer, setIsQuickAddingCustomer] = useState(false);
  const [quickCustomerCity, setQuickCustomerCity] = useState('');

  const [error, setError] = useState<string | null>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Close search dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setIsSearchDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter master customers by query
  const searchResults = useMemo(() => {
    if (!customerSearchQuery.trim()) {
      return masterCustomers.slice(0, 8);
    }
    const q = customerSearchQuery.toLowerCase().trim();
    return masterCustomers.filter((c) => {
      const matchName = c.name.toLowerCase().includes(q);
      const matchPhone = c.phone.toLowerCase().includes(q);
      const matchCode = c.customerCode.toLowerCase().includes(q);
      const matchCity = c.city?.toLowerCase().includes(q);
      const matchBank = c.bankName?.toLowerCase().includes(q) || c.bankAccountNumber?.includes(q);
      return matchName || matchPhone || matchCode || matchCity || matchBank;
    }).slice(0, 10);
  }, [customerSearchQuery, masterCustomers]);

  // Generate unique invoice number
  const generateInvoiceNumber = () => {
    const now = new Date();
    const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    const randomPart = String(Math.floor(100 + Math.random() * 900));
    return `INV-${datePart}-${randomPart}`;
  };

  // Populate or reset form
  useEffect(() => {
    if (editingInvoice) {
      setInvoiceNumber(editingInvoice.invoiceNumber);
      setDate(editingInvoice.date);
      setCustomerName(editingInvoice.customerName);
      setCustomerPhone(editingInvoice.customerPhone);
      setCustomerEmail(editingInvoice.customerEmail || '');
      setCategory(editingInvoice.category);
      setItemsDescription(editingInvoice.itemsDescription || '');
      setPurchaseAmount(editingInvoice.purchaseAmount);
      setPurchaseAmountInput(String(editingInvoice.purchaseAmount));
      setClaimStatus(editingInvoice.claimStatus);
      setDisbursedDate(editingInvoice.disbursedDate || '');
      setNotes(editingInvoice.notes || '');
      const resolvedEditBenefit: CustomerBenefitType =
        editingInvoice.benefitType ||
        (editingInvoice.getParcel === false
          ? 'cashback_only'
          : editingInvoice.cashbackAmount > 0
          ? 'cashback_parcel'
          : 'parcel_only');
      setBenefitType(resolvedEditBenefit);
      setGetParcel(resolvedEditBenefit === 'cashback_parcel' || resolvedEditBenefit === 'parcel_only');

      // Check if matches master customer
      const matched = masterCustomers.find(
        (c) => c.phone.trim() === editingInvoice.customerPhone.trim() || c.name.toLowerCase() === editingInvoice.customerName.toLowerCase()
      );
      if (matched) {
        setSelectedMasterCustomer(matched);
      } else {
        setSelectedMasterCustomer(null);
      }
      setCustomerSearchQuery('');

      const normalCalc = calculateCashback(editingInvoice.purchaseAmount, settings);
      if (editingInvoice.cashbackPercentage > 0 && Math.abs(normalCalc.effectivePercentage - editingInvoice.cashbackPercentage) > 0.01) {
        setIsCustomRate(true);
        setCustomRate(editingInvoice.cashbackPercentage);
      } else {
        setIsCustomRate(false);
      }
    } else {
      const today = new Date().toISOString().split('T')[0];
      setInvoiceNumber(generateInvoiceNumber());
      setDate(today);
      setSelectedMasterCustomer(null);
      setCustomerSearchQuery('');
      setCustomerName('');
      setCustomerPhone('');
      setCustomerEmail('');
      setCategory('Elektronik & Gadget');
      setItemsDescription('');
      setPurchaseAmount(0);
      setPurchaseAmountInput('');
      setIsCustomRate(false);
      setCustomRate(settings.flatPercentage);
      setClaimStatus('pending');
      setDisbursedDate('');
      setNotes('');
      // Otomatis dapat Cashback + Parcel terlebih dahulu saat input faktur baru
      setBenefitType('cashback_parcel');
      setGetParcel(true);
    }
    setIsQuickAddingCustomer(false);
    setIsSearchDropdownOpen(false);
    setError(null);
  }, [editingInvoice, isOpen, settings, masterCustomers]);

  // Handle selecting a master customer from search
  const handleSelectCustomer = (customer: CustomerMaster) => {
    setSelectedMasterCustomer(customer);
    setCustomerName(customer.name);
    setCustomerPhone(customer.phone);
    if (customer.email) setCustomerEmail(customer.email);

    setCustomerSearchQuery('');
    setIsSearchDropdownOpen(false);
  };

  const handleClearSelectedCustomer = () => {
    setSelectedMasterCustomer(null);
    setCustomerSearchQuery('');
    setIsSearchDropdownOpen(true);
  };

  // Quick save new customer into master data directly from invoice modal
  const handleQuickSaveNewCustomer = () => {
    if (!customerSearchQuery.trim()) {
      setError('Masukkan nama konsumen yang ingin didaftarkan.');
      return;
    }
    const newCustomerCode = `CUST-${String(masterCustomers.length + 1).padStart(3, '0')}`;
    const newCust: Omit<CustomerMaster, 'id'> = {
      customerCode: newCustomerCode,
      name: customerSearchQuery.trim(),
      phone: customerPhone.trim() || '08',
      email: customerEmail.trim() || undefined,
      city: quickCustomerCity.trim() || undefined,
      joinedDate: new Date().toISOString().split('T')[0],
      isActive: true,
      preferredPayoutMethod: payoutMethod,
    };

    if (onQuickAddMasterCustomer) {
      onQuickAddMasterCustomer(newCust);
    }

    setCustomerName(newCust.name);
    setSelectedMasterCustomer({ ...newCust, id: `cust-${Date.now()}` });
    setIsQuickAddingCustomer(false);
    setIsSearchDropdownOpen(false);
  };

  // Live calculation
  const calculation = useMemo(() => {
    return calculateCashback(
      purchaseAmount,
      settings,
      isCustomRate ? customRate : undefined
    );
  }, [purchaseAmount, settings, isCustomRate, customRate]);

  if (!isOpen) return null;

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value.replace(/\D/g, '');
    const num = Number(rawVal) || 0;
    setPurchaseAmount(num);
    setPurchaseAmountInput(rawVal);
  };

  const handleSelectBenefitType = (nextType: CustomerBenefitType) => {
    setBenefitType(nextType);
    setGetParcel(nextType === 'cashback_parcel' || nextType === 'parcel_only');
  };

  const effectiveCashbackAmount = benefitType === 'parcel_only' ? 0 : calculation.cashbackAmount;
  const effectiveCashbackPercentage = benefitType === 'parcel_only' ? 0 : calculation.effectivePercentage;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!invoiceNumber.trim()) {
      setError('Nomor faktur tidak boleh kosong.');
      return;
    }
    if (!customerName.trim()) {
      setError('Pilih atau ketik nama konsumen terlebih dahulu.');
      return;
    }
    if (!customerPhone.trim()) {
      setError('Nomor WhatsApp / telepon wajib diisi untuk verifikasi klaim.');
      return;
    }
    if (purchaseAmount <= 0) {
      setError('Nilai total belanja harus lebih besar dari Rp 0.');
      return;
    }

    const payload = {
      invoiceNumber: invoiceNumber.trim(),
      date,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      customerEmail: customerEmail.trim() || undefined,
      category,
      itemsDescription: itemsDescription.trim() || undefined,
      purchaseAmount,
      cashbackPercentage: effectiveCashbackPercentage,
      cashbackAmount: effectiveCashbackAmount,
      claimStatus,
      payoutMethod,
      disbursedDate: claimStatus === 'disbursed' ? (disbursedDate || date) : undefined,
      notes: notes.trim() || undefined,
      getParcel,
      benefitType,
    };

    onSave(payload, editingInvoice ? editingInvoice.id : undefined);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2.5 sm:p-4">
      <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200 shadow-xl max-w-2xl w-full max-h-[94vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Modal Header */}
        <div className="px-4 py-3 sm:px-6 sm:py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2 sm:gap-2.5">
            <div className="p-1.5 sm:p-2 bg-emerald-600 text-white rounded-lg">
              <Receipt className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xs sm:text-sm font-bold text-slate-900">
                {editingInvoice ? 'Edit Faktur Pembelian Konsumen' : 'Input Faktur & Hitung Cashback'}
              </h2>
              <p className="text-[10px] sm:text-[11px] text-slate-500">
                Pilih dari Master Data atau ketik nama/kontak konsumen
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-3.5 sm:p-6 overflow-y-auto space-y-3.5 sm:space-y-4 flex-1 text-xs">
          
          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Row 1: Invoice Number & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-semibold text-slate-700">Nomor Faktur *</label>
                <button
                  type="button"
                  onClick={() => setInvoiceNumber(generateInvoiceNumber())}
                  className="text-[10px] text-emerald-700 hover:underline font-semibold"
                >
                  Acak Baru
                </button>
              </div>
              <input
                type="text"
                required
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                placeholder="Contoh: INV-20261104-001"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-slate-900 font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Tanggal Faktur *</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-slate-900 font-mono"
              />
            </div>
          </div>

          {/* Row 2: Customer Search / Selection (MASTER DATA INTEGRATION) */}
          <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/80 space-y-2.5" ref={searchContainerRef}>
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
                <Search className="w-3.5 h-3.5 text-emerald-600" />
                <span>Pencarian Master Konsumen *</span>
              </label>
              {selectedMasterCustomer && (
                <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
                  <UserCheck className="w-3 h-3" /> Terhubung Master ({selectedMasterCustomer.customerCode})
                </span>
              )}
            </div>

            {selectedMasterCustomer ? (
              // Selected Customer Card
              <div className="p-3 bg-white rounded-lg border border-emerald-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    {selectedMasterCustomer.name.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-xs">{selectedMasterCustomer.name}</span>
                      <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded">
                        {selectedMasterCustomer.customerCode}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono tabular-nums flex items-center gap-2 mt-0.5">
                      <span>{selectedMasterCustomer.phone}</span>
                      {selectedMasterCustomer.city && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="flex items-center gap-0.5">
                            <MapPin className="w-2.5 h-2.5 text-slate-400" /> {selectedMasterCustomer.city}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <button
                    type="button"
                    onClick={handleClearSelectedCustomer}
                    className="px-2.5 py-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
                  >
                    Ganti Konsumen
                  </button>
                </div>
              </div>
            ) : (
              // Search Input with Live Dropdown
              <div className="relative">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={customerSearchQuery}
                    onChange={(e) => {
                      setCustomerSearchQuery(e.target.value);
                      setIsSearchDropdownOpen(true);
                      setCustomerName(e.target.value); // fallback if typed manually
                    }}
                    onFocus={() => setIsSearchDropdownOpen(true)}
                    placeholder="Ketik nama konsumen, nomor WhatsApp, atau kode (CUST-001)..."
                    className="w-full pl-9 pr-8 py-2 bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-slate-900 text-xs"
                  />
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
                </div>

                {/* Dropdown Menu */}
                {isSearchDropdownOpen && (
                  <div className="absolute z-30 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-60 overflow-y-auto divide-y divide-slate-100 animate-in fade-in">
                    <div className="p-2 bg-slate-50 text-[10px] text-slate-500 font-semibold uppercase tracking-wider flex items-center justify-between">
                      <span>Hasil Pencarian Master Data ({searchResults.length})</span>
                      <span>Pilih untuk auto-fill</span>
                    </div>

                    {searchResults.length === 0 ? (
                      <div className="p-4 text-center">
                        <p className="text-xs text-slate-600">Tidak ada konsumen dengan kata kunci "{customerSearchQuery}".</p>
                        <button
                          type="button"
                          onClick={() => setIsQuickAddingCustomer(true)}
                          className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors"
                        >
                          <UserPlus className="w-3.5 h-3.5" />
                          <span>Daftarkan "{customerSearchQuery}" ke Master Data</span>
                        </button>
                      </div>
                    ) : (
                      searchResults.map((cust) => (
                        <button
                          key={cust.id}
                          type="button"
                          onClick={() => handleSelectCustomer(cust)}
                          className="w-full text-left p-2.5 hover:bg-emerald-50/60 transition-colors flex items-center justify-between group"
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-slate-100 group-hover:bg-emerald-100 group-hover:text-emerald-800 flex items-center justify-center font-bold text-xs text-slate-600 shrink-0">
                              {cust.name.charAt(0)}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-900 text-xs">{cust.name}</span>
                                <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-1 py-0.2 rounded">
                                  {cust.customerCode}
                                </span>
                              </div>
                              <div className="text-[11px] text-slate-500 font-mono tabular-nums">
                                {cust.phone} {cust.city ? `· ${cust.city}` : ''}
                              </div>
                            </div>
                          </div>

                          <div className="text-right text-[10px] text-slate-500">
                            <span>Tunai (Cash)</span>
                          </div>
                        </button>
                      ))
                    )}

                    {/* Footer add new button */}
                    <div className="p-2 bg-slate-50 flex items-center justify-between text-xs">
                      <span className="text-[11px] text-slate-500">Konsumen baru belum terdaftar?</span>
                      <button
                        type="button"
                        onClick={() => setIsQuickAddingCustomer(true)}
                        className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>+ Tambah Baru</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Quick Add Inline Box */}
            {isQuickAddingCustomer && (
              <div className="p-3 bg-white rounded-lg border border-emerald-200 space-y-2 mt-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 text-xs">Daftarkan Konsumen Baru Cepat</span>
                  <button
                    type="button"
                    onClick={() => setIsQuickAddingCustomer(false)}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    ×
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={customerSearchQuery}
                    onChange={(e) => setCustomerSearchQuery(e.target.value)}
                    placeholder="Nama lengkap konsumen..."
                    className="px-2.5 py-1.5 border border-slate-300 rounded text-xs"
                  />
                  <input
                    type="text"
                    value={quickCustomerCity}
                    onChange={(e) => setQuickCustomerCity(e.target.value)}
                    placeholder="Kota domisili..."
                    className="px-2.5 py-1.5 border border-slate-300 rounded text-xs"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleQuickSaveNewCustomer}
                  className="w-full py-1.5 bg-emerald-600 text-white rounded text-xs font-semibold hover:bg-emerald-700"
                >
                  Simpan ke Master & Pasang ke Faktur Ini
                </button>
              </div>
            )}

            {/* Explicit Name & Phone fields for verification/manual override */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 border-t border-slate-200/60">
              <div>
                <label className="text-[10px] text-slate-500 block mb-0.5">Nama Konsumen *</label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Nama konsumen"
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs font-semibold text-slate-900"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-500 block mb-0.5">No. WhatsApp / HP *</label>
                <input
                  type="tel"
                  required
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="081234567890"
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs font-mono"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-500 block mb-0.5">Email (Opsional)</label>
                <input
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="nama@email.com"
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs"
                />
              </div>
            </div>

          </div>

          {/* Row 3: Rincian Barang / Keterangan Faktur */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Rincian Barang / Keterangan Faktur (Opsional)</label>
            <input
              type="text"
              value={itemsDescription}
              onChange={(e) => setItemsDescription(e.target.value)}
              placeholder="Contoh: Belanja Bulanan / TV LED 43 Inch / Grosir Minyak"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-slate-900"
            />
          </div>

          {/* Row 4: Purchase Amount & Live Calculation */}
          <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/40 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label className="font-bold text-slate-900 text-xs">
                Total Nilai Belanja (Faktur) *
              </label>
              <div className="flex items-center gap-2">
                <label className="text-[11px] text-slate-600 flex items-center gap-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isCustomRate}
                    onChange={(e) => setIsCustomRate(e.target.checked)}
                    className="rounded text-emerald-600"
                  />
                  <span>Gunakan % Khusus</span>
                </label>
                {isCustomRate && (
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      value={customRate}
                      onChange={(e) => setCustomRate(parseFloat(e.target.value) || 0)}
                      className="w-16 px-1.5 py-0.5 text-xs bg-white border border-slate-300 rounded font-mono"
                    />
                    <span className="font-bold text-slate-700">%</span>
                  </div>
                )}
              </div>
            </div>

            <div className="relative">
              <span className="absolute left-3 top-2.5 font-bold text-slate-500 font-mono">Rp</span>
              <input
                type="text"
                required
                value={purchaseAmountInput ? Number(purchaseAmountInput).toLocaleString('id-ID') : ''}
                onChange={handleAmountChange}
                placeholder="0"
                className="w-full pl-10 pr-3 py-2.5 bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500 text-base font-bold font-mono tabular-nums text-slate-900"
              />
            </div>

            {/* Live Transparent Calculation Box */}
            <div className="p-3 bg-white rounded-lg border border-emerald-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-emerald-800 font-semibold">
                  <Calculator className="w-3.5 h-3.5" />
                  <span>Kalkulasi Cashback Transparan:</span>
                </div>
                <div className="text-[11px] text-slate-600 font-mono">
                  {benefitType === 'parcel_only'
                    ? 'Paket Parcel Saja — Cashback tunai dinonaktifkan manual (Rp 0)'
                    : calculation.breakdown}
                </div>
              </div>
              <div className="text-right sm:border-l sm:border-slate-100 sm:pl-4 shrink-0">
                <span className="text-[10px] text-slate-500 block uppercase tracking-wider font-semibold">
                  Cashback Konsumen
                </span>
                <span className={`text-base font-extrabold font-mono tabular-nums ${
                  benefitType === 'parcel_only' ? 'text-slate-400 line-through' : 'text-emerald-700'
                }`}>
                  {formatRupiah(effectiveCashbackAmount)}
                </span>
              </div>
            </div>

            {/* Paket Diterima & Pengaturan Manual Dapat / Tidak */}
            <div className={`p-3.5 rounded-xl border space-y-2.5 transition-colors ${
              benefitType === 'cashback_parcel'
                ? 'bg-purple-50/70 border-purple-200 text-purple-950'
                : benefitType === 'parcel_only'
                ? 'bg-amber-50/80 border-amber-300 text-amber-950'
                : 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
            }`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    benefitType === 'cashback_parcel'
                      ? 'bg-purple-700 text-white'
                      : benefitType === 'parcel_only'
                      ? 'bg-amber-500 text-white'
                      : 'bg-emerald-600 text-white'
                  }`}>
                    <Gift className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold flex items-center gap-2 flex-wrap">
                      <span>Paket Diterima Konsumen</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                        getParcel
                          ? 'bg-purple-200 text-purple-900'
                          : 'bg-slate-200 text-slate-700'
                      }`}>
                        {getParcel ? 'Dapat (Ya)' : 'Tidak Dapat Parsel'}
                      </span>
                    </div>
                    <p className="text-[11px] opacity-80 mt-0.5">
                      Otomatis terpilih <strong>Cashback + Parsel</strong> terlebih dahulu. Ubah manual dapat tidaknya di bawah ini:
                    </p>
                  </div>
                </div>
              </div>

              {/* Manual Toggle Buttons: Dapat Cashback+Parsel / Cashback Saja / Parcel Saja */}
              <div className="grid grid-cols-3 gap-1.5 pt-1">
                <button
                  type="button"
                  onClick={() => handleSelectBenefitType('cashback_parcel')}
                  className={`py-2 px-2 rounded-lg text-[11px] font-bold border transition-all text-center ${
                    benefitType === 'cashback_parcel'
                      ? 'bg-purple-700 text-white border-purple-800 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-purple-50'
                  }`}
                >
                  Cashback + Parsel
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectBenefitType('cashback_only')}
                  className={`py-2 px-2 rounded-lg text-[11px] font-bold border transition-all text-center ${
                    benefitType === 'cashback_only'
                      ? 'bg-emerald-700 text-white border-emerald-800 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-emerald-50'
                  }`}
                >
                  Cashback Saja (Tanpa Parsel)
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectBenefitType('parcel_only')}
                  className={`py-2 px-2 rounded-lg text-[11px] font-bold border transition-all text-center ${
                    benefitType === 'parcel_only'
                      ? 'bg-amber-600 text-white border-amber-700 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-amber-50'
                  }`}
                >
                  Parcel Saja
                </button>
              </div>
            </div>
          </div>

          {/* Row 5: Claim Status & Method */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Status Pencairan</label>
              <select
                value={claimStatus}
                onChange={(e) => setClaimStatus(e.target.value as ClaimStatus)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-slate-900"
              >
                <option value="pending">Menunggu Klaim Konsumen</option>
                <option value="ready">Siap Dicairkan (Tervalidasi)</option>
                <option value="disbursed">Sudah Dicairkan</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Metode Pencairan</label>
              <div className="w-full px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-900 font-bold flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Wallet className="w-3.5 h-3.5 text-emerald-600" />
                  Tunai (Cash)
                </span>
                <span className="text-[10px] font-semibold bg-emerald-600 text-white px-2 py-0.5 rounded-full">
                  Semua Cash
                </span>
              </div>
            </div>
          </div>

          {claimStatus === 'disbursed' && (
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Tanggal Dana Dicairkan</label>
              <input
                type="date"
                value={disbursedDate}
                onChange={(e) => setDisbursedDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-slate-900 font-mono"
              />
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Catatan Tambahan (Opsional)</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Contoh: Pencairan tunai langsung di kasir / pengambilan barang"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-slate-900"
            />
          </div>

          {/* Modal Footer Actions */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{editingInvoice ? 'Simpan Perubahan' : 'Simpan Faktur & Cashback'}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
