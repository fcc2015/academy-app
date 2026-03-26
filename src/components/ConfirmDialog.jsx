import React, { useEffect } from 'react';
import { AlertTriangle, X, Trash2 } from 'lucide-react';

/**
 * ConfirmDialog - Premium modal to replace window.confirm() for delete actions
 * 
 * Props:
 *   isOpen      {boolean}  - whether the dialog is visible
 *   onConfirm   {function} - called when user clicks confirm
 *   onCancel    {function} - called when user clicks cancel or backdrop
 *   title       {string}   - dialog title
 *   message     {string}   - dialog body message
 *   confirmText {string}   - confirm button label (default: "Delete")
 *   cancelText  {string}   - cancel button label (default: "Cancel")
 *   isRTL       {boolean}  - right-to-left mode
 */
const ConfirmDialog = ({
    isOpen,
    onConfirm,
    onCancel,
    title,
    message,
    confirmText,
    cancelText,
    isRTL = false,
}) => {
    // Close on Escape key
    useEffect(() => {
        if (!isOpen) return;
        const handler = (e) => { if (e.key === 'Escape') onCancel(); };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [isOpen, onCancel]);

    if (!isOpen) return null;

    const resolvedTitle       = title       || (isRTL ? 'تأكيد الحذف'          : 'Confirm Deletion');
    const resolvedMessage     = message     || (isRTL ? 'هل أنت متأكد؟ لا يمكن التراجع عن هذا الإجراء.' : 'Are you sure? This action cannot be undone.');
    const resolvedConfirmText = confirmText || (isRTL ? 'تأكيد الحذف'          : 'Delete');
    const resolvedCancelText  = cancelText  || (isRTL ? 'إلغاء'                : 'Cancel');

    return (
        <div
            className="fixed inset-0 z-[300] flex items-center justify-center p-4"
            style={{ animation: 'fadeIn 0.15s ease' }}
        >
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                onClick={onCancel}
            />

            {/* Dialog box */}
            <div
                className="relative bg-white rounded-[2rem] shadow-2xl w-full max-w-sm border border-slate-100 overflow-hidden"
                style={{ animation: 'scaleIn 0.2s cubic-bezier(0.34,1.56,0.64,1)' }}
                dir={isRTL ? 'rtl' : 'ltr'}
            >
                {/* Red top stripe */}
                <div className="h-1.5 w-full bg-gradient-to-r from-red-500 to-rose-600" />

                <div className="p-7">
                    {/* Close button */}
                    <button
                        type="button"
                        onClick={onCancel}
                        className={`absolute top-5 ${isRTL ? 'left-5' : 'right-5'} p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all`}
                    >
                        <X size={16} />
                    </button>

                    {/* Icon */}
                    <div className="flex justify-center mb-5">
                        <div className="w-16 h-16 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center shadow-sm">
                            <AlertTriangle className="text-red-500" size={30} strokeWidth={2.5} />
                        </div>
                    </div>

                    {/* Text */}
                    <div className={`text-center mb-7 ${isRTL ? 'text-right' : 'text-center'}`}>
                        <h3 className="text-lg font-black text-slate-900 tracking-tight mb-2">
                            {resolvedTitle}
                        </h3>
                        <p className="text-sm font-medium text-slate-500 leading-relaxed">
                            {resolvedMessage}
                        </p>
                    </div>

                    {/* Buttons */}
                    <div className={`flex gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <button
                            type="button"
                            onClick={onCancel}
                            className="flex-1 py-3.5 text-sm font-black text-slate-500 bg-white border border-slate-200 rounded-2xl hover:bg-slate-50 transition-all uppercase tracking-widest"
                        >
                            {resolvedCancelText}
                        </button>
                        <button
                            type="button"
                            onClick={onConfirm}
                            className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-red-500 to-rose-600 text-white text-sm font-black rounded-2xl shadow-lg hover:-translate-y-0.5 transition-all uppercase tracking-widest"
                        >
                            <Trash2 size={15} strokeWidth={2.5} />
                            {resolvedConfirmText}
                        </button>
                    </div>
                </div>
            </div>

            {/* Keyframe animations injected once */}
            <style>{`
                @keyframes fadeIn  { from { opacity: 0 } to { opacity: 1 } }
                @keyframes scaleIn { from { opacity: 0; transform: scale(0.85) } to { opacity: 1; transform: scale(1) } }
            `}</style>
        </div>
    );
};

export default ConfirmDialog;
