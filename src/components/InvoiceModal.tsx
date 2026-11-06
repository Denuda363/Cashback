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
  Building2,
  Wallet,
  MapPin,
  ChevronDown,
  Gift
} from 'lucide-react';
import { CashbackSettings, ClaimStatus, CustomerMaster, Invoice, PayoutMethod } from '../types/cashback';
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
  const [payoutMethod, setPayoutMethod] = useState<PayoutMethod>('transfer_bank');
  const [disbursedDate, setDisbursedDate] = useState('');
  const [notes, setNotes] = useState('');
  const [getParcel, setGetParcel] = useState<boolean>(false);

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
      setPayoutMethod(editingInvoice.payoutMethod);
      setDisbursedDate(editingInvoice.disbursedDate || '');
      setNotes(editingInvoice.notes || '');
      setGetParcel(editingInvoice.getParcel ?? (editingInvoice.purchaseAmount >= (settings.minSpendForParcel || 5000000)));

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
      if (Math.abs(normalCalc.effectivePercentage - editingInvoice.cashbackPercentage) > 0.01) {
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
      setPayoutMethod('transfer_bank');
      setDisbursedDate('');
      setNotes('');
      setGetParcel(false);
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
    if (customer.preferredPayoutMethod) {
      setPayoutMethod(customer.preferredPayoutMethod);
    }
    
    // Auto-fill account note if notes is empty
    if (!notes) {
      if (customer.preferredPayoutMethod === 'transfer_bank' && customer.bankAccountNumber) {
        setNotes(`Rekening: ${customer.bankName} ${customer.bankAccountNumber} a.n ${customer.bankAccountHolder || customer.name}`);
      } else if (customer.preferredPayoutMethod === 'e_wallet' && customer.eWalletNumber) {
        setNotes(`E-Wallet: ${customer.eWalletType} ${customer.eWalletNumber}`);
      }
    }

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
    // Automatically set parcel qualification if reaching threshold
    setGetParcel(num >= (settings.minSpendForParcel || 5000000));
  };

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
      cashbackPercentage: calculation.effectivePercentage,
      cashbackAmount: calculation.cashbackAmount,
      claimStatus,
      payoutMethod,
      disbursedDate: claimStatus === 'disbursed' ? (disbursedDate || date) : undefined,
      notes: notes.trim() || undefined,
      getParcel,
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
                    {selectedMasterCustomer.bankName && (
                      <div className="text-[10px] text-slate-600 mt-0.5 flex items-center gap-1">
                        <Building2 className="w-3 h-3 text-slate-400" />
                        <span>{selectedMasterCustomer.bankName} {selectedMasterCustomer.bankAccountNumber} (a.n {selectedMasterCustomer.bankAccountHolder || selectedMasterCustomer.name})</span>
                      </div>
                    )}
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
                            {cust.preferredPayoutMethod === 'transfer_bank' && cust.bankName ? (
                              <span className="text-slate-600 font-medium">{cust.bankName}</span>
                            ) : cust.preferredPayoutMethod === 'e_wallet' && cust.eWalletType ? (
                              <span className="text-emerald-700 font-medium">{cust.eWalletType}</span>
                            ) : (
                              <span>Pilih</span>
                            )}
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

          {/* Row 3: Category & Description */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-1">
              <label className="block font-semibold text-slate-700 mb-1">Kategori Produk</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-slate-900"
              >
                <option value="Elektronik & Gadget">Elektronik & Gadget</option>
                <option value="Bahan Pokok & Grosir">Bahan Pokok & Grosir</option>
                <option value="Fashion & Tekstil">Fashion & Tekstil</option>
                <option value="Perlengkapan Rumah">Perlengkapan Rumah</option>
                <option value="Kosmetik & Perawatan">Kosmetik & Perawatan</option>
                <option value="Perlengkapan Kantor">Perlengkapan Kantor</option>
                <option value="Makanan & Minuman">Makanan & Minuman</option>
                <option value="Umum">Umum / Lainnya</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">Rincian Barang / Deskripsi Faktur</label>
              <input
                type="text"
                value={itemsDescription}
                onChange={(e) => setItemsDescription(e.target.value)}
                placeholder="Misal: 1x Smart TV 43 Inch + Braket Dinding"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-slate-900"
              />
            </div>
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
                  {calculation.breakdown}
                </div>
              </div>
              <div className="text-right sm:border-l sm:border-slate-100 sm:pl-4 shrink-0">
                <span className="text-[10px] text-slate-500 block uppercase tracking-wider font-semibold">
                  Cashback Konsumen
                </span>
                <span className="text-base font-extrabold text-emerald-700 font-mono tabular-nums">
                  {formatRupiah(calculation.cashbackAmount)}
                </span>
              </div>
            </div>

            {/* Parcel Qualification */}
            <div className={`p-3 rounded-lg border flex items-center justify-between transition-colors ${
              getParcel 
                ? 'bg-amber-50/80 border-amber-300 text-amber-900' 
                : 'bg-slate-50 border-slate-200 text-slate-600'
            }`}>
              <div className="flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  getParcel ? 'bg-amber-500 text-white' : 'bg-slate-200 text-slate-400'
                }`}>
                  <Gift className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold flex items-center gap-2">
                    <span>Hadiah / Parcel Konsumen</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                      getParcel 
                        ? 'bg-amber-200 text-amber-900' 
                        : 'bg-slate-200 text-slate-600'
                    }`}>
                      {getParcel ? 'Dapat Parcel (Ya)' : 'Tidak'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Minimal belanja <span className="font-semibold">{formatRupiah(settings.minSpendForParcel || 5000000)}</span> untuk otomatis mendapat parcel.
                  </p>
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold select-none">
                <input
                  type="checkbox"
                  checked={getParcel}
                  onChange={(e) => setGetParcel(e.target.checked)}
                  className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500"
                />
                <span className="hidden sm:inline">Ubah Manual</span>
              </label>
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
              <select
                value={payoutMethod}
                onChange={(e) => setPayoutMethod(e.target.value as PayoutMethod)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-slate-900"
              >
                <option value="transfer_bank">Transfer Bank (BCA, Mandiri, BRI, dll)</option>
                <option value="e_wallet">E-Wallet (GoPay, OVO, Dana, ShopeePay)</option>
                <option value="potongan_belanja">Potongan Belanja Langsung / Voucher</option>
                <option value="tunai">Tunai di Kasir</option>
              </select>
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
            <label className="block font-semibold text-slate-700 mb-1">Catatan Tambahan (Rekening / Instruksi)</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Contoh: Nomor rekening BCA 1234567890 a.n. Konsumen"
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
