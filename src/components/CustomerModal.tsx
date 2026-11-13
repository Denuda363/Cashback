import React, { useState, useEffect } from 'react';
import { X, UserPlus, CheckCircle2, AlertCircle, Wallet } from 'lucide-react';
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
  const preferredPayoutMethod: PayoutMethod = 'tunai';
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
      setNotes(editingCustomer.notes || '');
      setIsActive(editingCustomer.isActive ?? true);
    } else {
      setCustomerCode(generateNextCode());
      setName('');
      setPhone('');
      setEmail('');
      setCity('');
      setAddress('');
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
      notes: notes.trim() || undefined,
      joinedDate: editingCustomer ? editingCustomer.joinedDate : new Date().toISOString().split('T')[0],
      isActive,
    };

    onSave(payload, editingCustomer ? editingCustomer.id : undefined);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2.5 sm:p-4">
      <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200 shadow-xl max-w-xl w-full max-h-[94vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Modal Header */}
        <div className="px-4 py-3 sm:px-6 sm:py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2 sm:gap-2.5">
            <div className="p-1.5 sm:p-2 bg-slate-900 text-white rounded-lg">
              <UserPlus className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xs sm:text-sm font-bold text-slate-900">
                {editingCustomer ? 'Edit Master Data Konsumen' : 'Tambah Master Data Konsumen'}
              </h2>
              <p className="text-[10px] sm:text-[11px] text-slate-500">
                Data identitas konsumen untuk rekap & pencairan cashback tunai
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
        <form onSubmit={handleSubmit} className="p-3.5 sm:p-6 overflow-y-auto space-y-3.5 sm:space-y-4 flex-1 text-xs">
          
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
              onChange={(e) => setName(e.target.value)}
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

          {/* Row 5: Payout Method (Cash Only) */}
          <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/50 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
                <Wallet className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-slate-900 text-xs block">
                  Metode Pencairan Cashback
                </span>
                <span className="text-[11px] text-slate-600">
                  Tunai (Cash) — standar resmi untuk semua pencairan konsumen
                </span>
              </div>
            </div>
            <span className="text-[10px] font-bold bg-emerald-600 text-white px-2.5 py-0.5 rounded-full">
              Tunai (Cash)
            </span>
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
