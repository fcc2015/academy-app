import React, { createContext, useContext, useState, useEffect } from 'react';
import translations from './translations';

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
    const [lang, setLang] = useState(() => {
        return localStorage.getItem('app_language') || 'ar';
    });

    useEffect(() => {
        localStorage.setItem('app_language', lang);
        // Set document direction based on language
        document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
        document.documentElement.lang = lang;
    }, [lang]);

    // t('finances.title') => returns the string for the current language
    const t = (path) => {
        const keys = path.split('.');
        let result = translations;
        for (const key of keys) {
            result = result?.[key];
            if (!result) return path; // fallback to path if not found
        }
        return result?.[lang] || result?.['en'] || path;
    };

    const isRTL = lang === 'ar';
    const dir = isRTL ? 'rtl' : 'ltr';
    const textAlign = isRTL ? 'text-right' : 'text-left';
    const flexReverse = isRTL ? 'flex-row-reverse' : '';

    return (
        <LanguageContext.Provider value={{ lang, setLang, t, isRTL, dir, textAlign, flexReverse, language: lang }}>
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

