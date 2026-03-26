import React, { useState, useEffect } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

const ScrollNavigation = () => {
    const { isRTL } = useLanguage();
    const [isVisible, setIsVisible] = useState(false);

    // Show buttons when page is scrolled down
    const toggleVisibility = () => {
        if (window.scrollY > 300) {
            setIsVisible(true);
        } else {
            setIsVisible(false);
        }
    };

    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const scrollToBottom = () => {
        window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' });
    };

    useEffect(() => {
        window.addEventListener('scroll', toggleVisibility);
        return () => window.removeEventListener('scroll', toggleVisibility);
    }, []);

    return (
        <div className="scroll-nav-container">
            <div
                className={`fixed bottom-24 lg:bottom-10 z-[40] flex flex-col gap-2 transition-all duration-500 ease-in-out ${
                    isRTL ? 'left-4' : 'right-4'
                } ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10 pointer-events-none'}`}
            >
                <button
                    onClick={scrollToTop}
                    className="p-2.5 bg-indigo-600/90 text-white rounded-xl shadow-xl backdrop-blur-sm hover:bg-indigo-700 transition-all transform active:scale-90"
                    aria-label="Scroll to top"
                >
                    <ChevronUp size={20} strokeWidth={3} />
                </button>

                <button
                    onClick={scrollToBottom}
                    className="p-2.5 bg-white/90 text-indigo-600 border border-indigo-100 rounded-xl shadow-xl backdrop-blur-sm hover:bg-indigo-50 transition-all transform active:scale-90"
                    aria-label="Scroll to bottom"
                >
                    <ChevronDown size={20} strokeWidth={3} />
                </button>
            </div>
        </div>
    );
};

export default ScrollNavigation;
