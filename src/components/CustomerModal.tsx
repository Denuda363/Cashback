import React, { useState, useEffect } from 'react';
import { X, UserPlus, Save, CheckCircle2, AlertCircle, Building2, Wallet } from 'lucide-react';
import { CustomerMaster, PayoutMethod } from '../types/cashback';

interface CustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (customerData: Omit<CustomerMaster, 'id'>, customerId?: string) => void;
  editingCustomer?: CustomerMaster | null;
  existingCustomers: CustomerMaster[];
}

export const CustomerModal: React.FC<CustomerModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingCustomer,
  existingCustomers,
}) => {
  const [customerCode, setCustomerCode] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [preferredPayoutMethod, setPreferredPayoutMethod] = useState<PayoutMethod>('transfer_bank');
  const [bankName, setBankName] = useState('BCA');
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [bankAccountHolder, setBankAccountHolder] = useState('');
  const [eWalletType, setEWalletType] = useState('GoPay');
  const [eWalletNumber, setEWalletNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const generateNextCode = () => {
    const count = existingCustomers.length + 1;
    return `CUST-${String(count).padStart(3, '0')}`;
  };

  useEffect(() => {
    if (editingCustomer) {
      setCustomerCode(editingCustomer.customerCode);
      setName(editingCustomer.name);
      setPhone(editingCustomer.phone);
      setEmail(editingCustomer.email || '');
      setCity(editingCustomer.city || '');
      setAddress(editingCustomer.address || '');
      setPreferredPayoutMethod(editingCustomer.preferredPayoutMethod || 'transfer_bank');
      setBankName(editingCustomer.bankName || 'BCA');
      setBankAccountNumber(editingCustomer.bankAccountNumber || '');
      setBankAccountHolder(editingCustomer.bankAccountHolder || editingCustomer.name);
      setEWalletType(editingCustomer.eWalletType || 'GoPay');
      setEWalletNumber(editingCustomer.eWalletNumber || '');
      setNotes(editingCustomer.notes || '');
      setIsActive(editingCustomer.isActive ?? true);
    } else {
      setCustomerCode(generateNextCode());
      setName('');
      setPhone('');
      setEmail('');
      setCity('');
      setAddress('');
      setPreferredPayoutMethod('transfer_bank');
      setBankName('BCA');
      setBankAccountNumber('');
      setBankAccountHolder('');
      setEWalletType('GoPay');
      setEWalletNumber('');
      setNotes('');
      setIsActive(true);
    }
    setError(null);
  }, [editingCustomer, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Nama konsumen wajib diisi.');
      return;
    }
    if (!phone.trim()) {
      setError('Nomor telepon / WhatsApp wajib diisi.');
      return;
    }

    // Check duplicate phone or code for other customers
    const duplicatePhone = existingCustomers.find(
      (c) => c.phone.trim() === phone.trim() && (!editingCustomer || c.id !== editingCustomer.id)
    );
    if (duplicatePhone) {
      setError(`Nomor telepon ini sudah terdaftar atas nama ${duplicatePhone.name} (${duplicatePhone.customerCode}).`);
      return;
    }

    const payload: Omit<CustomerMaster, 'id'> = {
      customerCode: customerCode.trim() || generateNextCode(),
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim() || undefined,
      city: city.trim() || undefined,
      address: address.trim() || undefined,
      preferredPayoutMethod,
      bankName: preferredPayoutMethod === 'transfer_bank' ? bankName.trim() : undefined,
      bankAccountNumber: preferredPayoutMethod === 'transfer_bank' ? bankAccountNumber.trim() : undefined,
      bankAccountHolder: preferredPayoutMethod === 'transfer_bank' ? (bankAccountHolder.trim() || name.trim()) : undefined,
      eWalletType: preferredPayoutMethod === 'e_wallet' ? eWalletType.trim() : undefined,
      eWalletNumber: preferredPayoutMethod === 'e_wallet' ? eWalletNumber.trim() : undefined,
      notes: notes.trim() || undefined,
      joinedDate: editingCustomer ? editingCustomer.joinedDate : new Date().toISOString().split('T')[0],
      isActive,
    };

    onSave(payload, editingCustomer ? editingCustomer.id : undefined);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-slate-900 text-white rounded-lg">
              <UserPlus className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                {editingCustomer ? 'Edit Master Data Konsumen' : 'Tambah Master Data Konsumen Baru'}
              </h2>
              <p className="text-[11px] text-slate-500">
                Simpan data identitas dan informasi rekening pencairan cashback
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

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1 text-xs">
          
          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Row 1: Customer Code & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Kode Konsumen</label>
              <input
                type="text"
                value={customerCode}
                onChange={(e) => setCustomerCode(e.target.value)}
                placeholder="CUST-001"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-slate-900"
              />
            </div>
            <div className="flex items-center sm:pt-6">
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                />
                <span>Status Konsumen Aktif</span>
              </label>
            </div>
          </div>

          {/* Row 2: Name */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Nama Lengkap Konsumen *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (!bankAccountHolder) setBankAccountHolder(e.target.value);
              }}
              placeholder="Contoh: Hendra Gunawan"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-slate-900 text-sm font-semibold text-slate-900"
            />
          </div>

          {/* Row 3: Phone & Email */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">No. WhatsApp / HP *</label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Contoh: 081288991234"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono text-xs focus:outline-hidden focus:ring-1 focus:ring-slate-900"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Alamat Email (Opsional)</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@email.com"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-slate-900"
              />
            </div>
          </div>

          {/* Row 4: City & Address */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-1">
              <label className="block font-semibold text-slate-700 mb-1">Kota</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Contoh: Jakarta Barat"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-slate-900"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">Alamat Lengkap</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Jl. Surya Kencana No. 45"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-slate-900"
              />
            </div>
          </div>

          {/* Row 5: Preferred Payout Method */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-3">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-900 text-xs">
                Metode Pencairan Cashback Pilihan Konsumen
              </label>
              <span className="text-[10px] text-slate-500">Otomatis saat input faktur</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'transfer_bank', label: 'Transfer Bank', icon: <Building2 className="w-3.5 h-3.5" /> },
                { id: 'e_wallet', label: 'E-Wallet', icon: <Wallet className="w-3.5 h-3.5" /> },
                { id: 'potongan_belanja', label: 'Potongan Belanja', icon: null },
                { id: 'tunai', label: 'Tunai Kasir', icon: null },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setPreferredPayoutMethod(m.id as PayoutMethod)}
                  className={`p-2 rounded-lg border text-left transition-all ${
                    preferredPayoutMethod === m.id
                      ? 'border-emerald-600 bg-white shadow-xs font-semibold text-slate-900'
                      : 'border-slate-200 bg-white/70 text-slate-600 hover:bg-white'
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-[11px]">
                    {m.icon}
                    <span>{m.label}</span>
                  </div>
                </button>
              ))}
            </div>

            {/* If Transfer Bank */}
            {preferredPayoutMethod === 'transfer_bank' && (
              <div className="pt-2 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div>
                  <span className="text-[10px] text-slate-500 block mb-1">Nama Bank</span>
                  <select
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs"
                  >
                    <option value="BCA">BCA</option>
                    <option value="Mandiri">Mandiri</option>
                    <option value="BRI">BRI</option>
                    <option value="BNI">BNI</option>
                    <option value="BSI">BSI (Syariah)</option>
                    <option value="CIMB Niaga">CIMB Niaga</option>
                    <option value="Permata">Permata</option>
                    <option value="Bank Jago">Bank Jago</option>
                    <option value="SeaBank">SeaBank</option>
                  </select>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block mb-1">Nomor Rekening</span>
                  <input
                    type="text"
                    value={bankAccountNumber}
                    onChange={(e) => setBankAccountNumber(e.target.value)}
                    placeholder="Contoh: 8830192811"
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs font-mono"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block mb-1">Atas Nama Rekening</span>
                  <input
                    type="text"
                    value={bankAccountHolder}
                    onChange={(e) => setBankAccountHolder(e.target.value)}
                    placeholder="Nama di buku tabungan"
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs"
                  />
                </div>
              </div>
            )}

            {/* If E-Wallet */}
            {preferredPayoutMethod === 'e_wallet' && (
              <div className="pt-2 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <span className="text-[10px] text-slate-500 block mb-1">Jenis E-Wallet</span>
                  <select
                    value={eWalletType}
                    onChange={(e) => setEWalletType(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs"
                  >
                    <option value="GoPay">GoPay</option>
                    <option value="OVO">OVO</option>
                    <option value="DANA">DANA</option>
                    <option value="ShopeePay">ShopeePay</option>
                    <option value="LinkAja">LinkAja</option>
                  </select>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block mb-1">Nomor Akun E-Wallet</span>
                  <input
                    type="tel"
                    value={eWalletNumber || phone}
                    onChange={(e) => setEWalletNumber(e.target.value)}
                    placeholder="08xxxxxxxxxx"
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs font-mono"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Catatan Tambahan / Profil Konsumen</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Contoh: Sering memesan barang via WhatsApp"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-slate-900"
            />
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{editingCustomer ? 'Simpan Perubahan' : 'Tambah ke Master Data'}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
