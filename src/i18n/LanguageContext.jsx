import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import translations from './translations';

const LanguageContext = createContext();

// Locale mapping
const LOCALE_MAP = {
    ar: 'ar-MA',
    en: 'en-GB',
    fr: 'fr-FR',
};

export const LanguageProvider = ({ children }) => {
    const [lang, setLang] = useState(() => {
        return localStorage.getItem('app_language') || 'ar';
    });

    useEffect(() => {
        localStorage.setItem('app_language', lang);
        // Set document direction based on language
        document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
        document.documentElement.lang = lang;
        // Apply Arabic font class
        if (lang === 'ar') {
            document.documentElement.classList.add('font-ar');
        } else {
            document.documentElement.classList.remove('font-ar');
        }
    }, [lang]);

    // t('finances.title') => returns the string for the current language
    const t = useCallback((path) => {
        const keys = path.split('.');
        let result = translations;
        for (const key of keys) {
            result = result?.[key];
            if (!result) return path; // fallback to path if not found
        }
        return result?.[lang] || result?.['en'] || path;
    }, [lang]);

    const isRTL = lang === 'ar';
    const dir = isRTL ? 'rtl' : 'ltr';
    const textAlign = isRTL ? 'text-right' : 'text-left';
    const flexReverse = isRTL ? 'flex-row-reverse' : '';
    const locale = LOCALE_MAP[lang] || 'en-GB';

    // ===== Date Formatting =====
    const formatDate = useCallback((dateStr, options = {}) => {
        if (!dateStr) return '—';
        try {
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) return '—';
            const defaults = { year: 'numeric', month: 'short', day: 'numeric', ...options };
            return new Intl.DateTimeFormat(locale, defaults).format(date);
        } catch {
            return dateStr;
        }
    }, [locale]);

    // ===== Number Formatting =====
    const formatNumber = useCallback((num, options = {}) => {
        if (num == null || isNaN(num)) return '—';
        try {
            return new Intl.NumberFormat(locale, options).format(num);
        } catch {
            return String(num);
        }
    }, [locale]);

    // ===== Currency Formatting (MAD) =====
    const formatCurrency = useCallback((amount) => {
        if (amount == null || isNaN(amount)) return '—';
        try {
            const formatted = new Intl.NumberFormat(locale, {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
            }).format(amount);
            const unit = lang === 'ar' ? 'درهم' : 'MAD';
            return isRTL ? `${formatted} ${unit}` : `${formatted} ${unit}`;
        } catch {
            return `${amount} MAD`;
        }
    }, [locale, lang, isRTL]);

    // ===== Relative Time =====
    const formatRelativeTime = useCallback((dateStr) => {
        if (!dateStr) return '—';
        try {
            const date = new Date(dateStr);
            const now = new Date();
            const diffMs = now - date;
            const diffSec = Math.round(diffMs / 1000);
            const diffMin = Math.round(diffSec / 60);
            const diffHour = Math.round(diffMin / 60);
            const diffDay = Math.round(diffHour / 24);

            const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });

            if (diffSec < 60) return rtf.format(-diffSec, 'second');
            if (diffMin < 60) return rtf.format(-diffMin, 'minute');
            if (diffHour < 24) return rtf.format(-diffHour, 'hour');
            if (diffDay < 30) return rtf.format(-diffDay, 'day');
            return formatDate(dateStr);
        } catch {
            return dateStr;
        }
    }, [locale, formatDate]);

    // ===== Start/End aware class helpers =====
    const marginStart = useCallback((value) => isRTL ? `mr-${value}` : `ml-${value}`, [isRTL]);
    const marginEnd = useCallback((value) => isRTL ? `ml-${value}` : `mr-${value}`, [isRTL]);
    const paddingStart = useCallback((value) => isRTL ? `pr-${value}` : `pl-${value}`, [isRTL]);
    const paddingEnd = useCallback((value) => isRTL ? `pl-${value}` : `pr-${value}`, [isRTL]);
    const textStart = isRTL ? 'text-right' : 'text-left';
    const textEnd = isRTL ? 'text-left' : 'text-right';

    const value = useMemo(() => ({
        lang,
        setLang,
        t,
        isRTL,
        dir,
        textAlign,
        flexReverse,
        language: lang,
        locale,
        // Formatters
        formatDate,
        formatNumber,
        formatCurrency,
        formatRelativeTime,
        // Directional helpers
        marginStart,
        marginEnd,
        paddingStart,
        paddingEnd,
        textStart,
        textEnd,
    }), [lang, setLang, t, isRTL, dir, textAlign, flexReverse, locale,
        formatDate, formatNumber, formatCurrency, formatRelativeTime,
        marginStart, marginEnd, paddingStart, paddingEnd, textStart, textEnd]);

    return (
        <LanguageContext.Provider value={value}>
            {children}
        </LanguageContext.Provider>
    );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useLanguage = () => {
    const context = useContext(LanguageContext);
    if (!context) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
};
