import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { CheckCircle2, AlertCircle, Info, X, AlertTriangle } from 'lucide-react';

const ToastContext = createContext(null);

const ICONS = {
    success: CheckCircle2,
    error: AlertCircle,
    warning: AlertTriangle,
    info: Info,
};

const COLORS = {
    success: { bg: 'bg-emerald-50 dark:bg-emerald-900/30', border: 'border-emerald-200 dark:border-emerald-700', text: 'text-emerald-800 dark:text-emerald-200', icon: 'text-emerald-500' },
    error: { bg: 'bg-red-50 dark:bg-red-900/30', border: 'border-red-200 dark:border-red-700', text: 'text-red-800 dark:text-red-200', icon: 'text-red-500' },
    warning: { bg: 'bg-amber-50 dark:bg-amber-900/30', border: 'border-amber-200 dark:border-amber-700', text: 'text-amber-800 dark:text-amber-200', icon: 'text-amber-500' },
    info: { bg: 'bg-blue-50 dark:bg-blue-900/30', border: 'border-blue-200 dark:border-blue-700', text: 'text-blue-800 dark:text-blue-200', icon: 'text-blue-500' },
};

function ToastItem({ id, type = 'info', message, onDismiss }) {
    const [show, setShow] = useState(false);
    const Icon = ICONS[type] || ICONS.info;
    const color = COLORS[type] || COLORS.info;

    useEffect(() => {
        requestAnimationFrame(() => setShow(true));
        const timer = setTimeout(() => {
            setShow(false);
            setTimeout(() => onDismiss(id), 300);
        }, 4000);
        return () => clearTimeout(timer);
    }, [id, onDismiss]);

    return (
        <div
            className={`flex items-center gap-3 px-4 py-3 rounded-xl border shadow-float max-w-sm w-full transition-all duration-300 ${color.bg} ${color.border} ${show ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'}`}
            role="alert"
        >
            <Icon size={18} className={`shrink-0 ${color.icon}`} />
            <p className={`text-sm font-semibold flex-1 ${color.text}`}>{message}</p>
            <button onClick={() => { setShow(false); setTimeout(() => onDismiss(id), 300); }} className="shrink-0 text-slate-400 hover:text-slate-600 transition-colors">
                <X size={14} />
            </button>
        </div>
    );
}

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);
    let idCounter = 0;

    const toast = useCallback((type, message) => {
        const id = Date.now() + (idCounter++);
        setToasts(prev => [...prev.slice(-4), { id, type, message }]);
    }, []);

    const dismiss = useCallback((id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    const api = {
        success: (msg) => toast('success', msg),
        error: (msg) => toast('error', msg),
        warning: (msg) => toast('warning', msg),
        info: (msg) => toast('info', msg),
    };

    return (
        <ToastContext.Provider value={api}>
            {children}
            <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-auto" dir="ltr">
                {toasts.map(t => (
                    <ToastItem key={t.id} {...t} onDismiss={dismiss} />
                ))}
            </div>
        </ToastContext.Provider>
    );
}

export function useToast() {
    const ctx = useContext(ToastContext);
    if (!ctx) throw new Error('useToast must be used within ToastProvider');
    return ctx;
}
