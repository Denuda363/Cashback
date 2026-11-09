import React, { useState, useEffect } from 'react';
import { AlertTriangle, Trash2, X, Loader2 } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  requireText?: string;
  isLoading?: boolean;
  loadingText?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Hapus Data',
  cancelLabel = 'Batal',
  isDestructive = true,
  requireText,
  isLoading = false,
  loadingText = 'Memproses...',
  onConfirm,
  onCancel,
}) => {
  const [typedText, setTypedText] = useState('');

  useEffect(() => {
    if (isOpen) {
      setTypedText('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const isRequirementMet = !requireText || typedText.trim().toUpperCase() === requireText.trim().toUpperCase();

  return (
    <div className="fixed inset-0 z-60 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
      <div 
        className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-5 sm:p-6 overflow-hidden animate-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-start gap-3.5">
          <div className={`p-2.5 rounded-xl shrink-0 ${isDestructive ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'}`}>
            <AlertTriangle className="w-5 h-5" />
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-snug">
              {title}
            </h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              {message}
            </p>
          </div>

          <button
            type="button"
            disabled={isLoading}
            onClick={onCancel}
            className="p-1.5 -mr-1 -mt-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Optional Text Confirmation Input */}
        {requireText && (
          <div className="mt-4 p-3 bg-red-50/60 border border-red-200 rounded-xl space-y-1.5">
            <label className="block text-[11px] font-semibold text-red-900">
              Ketik kata <span className="font-mono font-bold uppercase underline">{requireText}</span> di bawah untuk mengonfirmasi:
            </label>
            <input
              type="text"
              autoFocus
              disabled={isLoading}
              value={typedText}
              onChange={(e) => setTypedText(e.target.value)}
              placeholder={`Ketik "${requireText}"`}
              className="w-full px-3 py-1.5 bg-white border border-red-300 rounded-lg text-xs font-mono font-bold text-red-900 placeholder:text-red-300 focus:outline-hidden focus:ring-2 focus:ring-red-500"
            />
          </div>
        )}

        <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
          <button
            type="button"
            disabled={isLoading}
            onClick={onCancel}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          
          <button
            type="button"
            disabled={!isRequirementMet || isLoading}
            onClick={onConfirm}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white rounded-xl shadow-xs transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
              isDestructive 
                ? 'bg-red-600 hover:bg-red-700' 
                : 'bg-slate-900 hover:bg-slate-800'
            }`}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>{loadingText}</span>
              </>
            ) : (
              <>
                {isDestructive && <Trash2 className="w-3.5 h-3.5" />}
                <span>{confirmLabel}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
