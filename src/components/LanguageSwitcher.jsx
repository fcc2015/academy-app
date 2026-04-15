import React, { useState, useRef, useEffect } from 'react';
import { Globe, Check } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

const languages = [
    { code: 'ar', label: 'العربية', flag: '🇲🇦', dir: 'rtl' },
    { code: 'en', label: 'English', flag: '🇬🇧', dir: 'ltr' },
    { code: 'fr', label: 'Français', flag: '🇫🇷', dir: 'ltr' },
];

const LanguageSwitcher = () => {
    const { lang, setLang, isRTL } = useLanguage();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const currentLang = languages.find(l => l.code === lang) || languages[0];

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Trigger */}
            <button
                id="lang-switcher-btn"
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl transition-all duration-200 font-bold text-sm"
                style={{
                    background: isOpen ? 'rgba(99,102,241,0.08)' : 'transparent',
                    color: '#64748b',
                    border: '1px solid transparent',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.06)'; e.currentTarget.style.color = '#4f46e5'; }}
                onMouseLeave={e => { e.currentTarget.style.background = isOpen ? 'rgba(99,102,241,0.08)' : 'transparent'; e.currentTarget.style.color = '#64748b'; }}
                title="Change language"
            >
                <span className="text-base leading-none">{currentLang.flag}</span>
                <Globe size={13} />
            </button>

            {/* Dropdown */}
            {isOpen && (
                <div
                    className={`absolute mt-2 w-44 rounded-2xl overflow-hidden z-50 animate-fade-in-scale ${isRTL ? 'left-0 origin-top-left' : 'right-0 origin-top-right'}`}
                    style={{
                        background: 'white',
                        border: '1px solid rgba(148,163,184,0.12)',
                        boxShadow: '0 12px 40px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.04)',
                    }}
                >
                    {/* Header */}
                    <div className="px-4 py-2.5 border-b" style={{ borderColor: 'rgba(148,163,184,0.1)', background: '#fafbfc' }}>
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">{lang === 'ar' ? 'اللغة' : lang === 'fr' ? 'Langue' : 'Language'}</p>
                    </div>

                    {languages.map(language => (
                        <button
                            key={language.code}
                            onClick={() => { setLang(language.code); setIsOpen(false); }}
                            className="w-full px-4 py-3 flex items-center gap-3 transition-all duration-150 text-sm font-semibold"
                            style={{
                                background: lang === language.code ? 'rgba(99,102,241,0.06)' : 'transparent',
                                color: lang === language.code ? '#4f46e5' : '#475569',
                            }}
                            onMouseEnter={e => { if (lang !== language.code) e.currentTarget.style.background = 'rgba(99,102,241,0.03)'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = lang === language.code ? 'rgba(99,102,241,0.06)' : 'transparent'; }}
                        >
                            <span className="text-lg leading-none">{language.flag}</span>
                            <span className="flex-1 text-left">{language.label}</span>
                            {lang === language.code && (
                                <Check size={13} strokeWidth={3} style={{ color: '#4f46e5' }} />
                            )}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export default LanguageSwitcher;
