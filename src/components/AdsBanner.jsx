import { useState, useEffect, useRef, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
import { authFetch } from '../api';
import { API_URL } from '../config';

/**
 * AdsBanner — Fetches active ads targeted at the current role
 * and shows them as an auto-rotating banner strip at the top of the layout.
 *
 * Props:
 *  - position: 'top' (default) | 'bottom'
 */
export default function AdsBanner({ position = 'top' }) {
    const [ads, setAds] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [dismissed, setDismissed] = useState(false);
    const [loaded, setLoaded] = useState(false);
    const trackedViews = useRef(new Set());
    const intervalRef = useRef(null);

    // Fetch ads once on mount
    useEffect(() => {
        const fetchAds = async () => {
            try {
                const res = await authFetch(`${API_URL}/advertisements/`);
                if (res.ok) {
                    const data = await res.json();
                    // Only active ads (backend already filters, but double-check)
                    setAds(data.filter(a => a.is_active));
                }
            } catch (e) {
                // silently fail — ads are non-critical
            } finally {
                setLoaded(true);
            }
        };
        fetchAds();
    }, []);

    // Auto-rotate every 6 seconds
    useEffect(() => {
        if (ads.length <= 1) return;
        intervalRef.current = setInterval(() => {
            setCurrentIndex(prev => (prev + 1) % ads.length);
        }, 6000);
        return () => clearInterval(intervalRef.current);
    }, [ads.length]);

    // Track view whenever currentIndex changes
    useEffect(() => {
        if (!ads.length) return;
        const ad = ads[currentIndex];
        if (!ad || trackedViews.current.has(ad.id)) return;
        trackedViews.current.add(ad.id);
        authFetch(`${API_URL}/advertisements/${ad.id}/view`, { method: 'POST' }).catch(() => {});
    }, [currentIndex, ads]);

    const handleClick = useCallback((ad) => {
        authFetch(`${API_URL}/advertisements/${ad.id}/click`, { method: 'POST' }).catch(() => {});
    }, []);

    const prev = () => {
        clearInterval(intervalRef.current);
        setCurrentIndex(i => (i - 1 + ads.length) % ads.length);
    };

    const next = () => {
        clearInterval(intervalRef.current);
        setCurrentIndex(i => (i + 1) % ads.length);
    };

    if (!loaded || dismissed || ads.length === 0) return null;

    const ad = ads[currentIndex];

    return (
        <div
            className={`relative w-full overflow-hidden bg-gradient-to-r from-indigo-900 via-indigo-800 to-violet-900 shadow-lg ${
                position === 'bottom' ? 'order-last' : ''
            }`}
            style={{ minHeight: '56px' }}
        >
            {/* Background image (blurred) */}
            {ad.media_url && (
                <div
                    className="absolute inset-0 opacity-20 bg-cover bg-center blur-sm scale-110"
                    style={{ backgroundImage: `url(${ad.media_url})` }}
                />
            )}

            {/* Content row */}
            <div className="relative flex items-center h-14 px-3 gap-3 max-w-screen-2xl mx-auto">

                {/* Navigation: prev */}
                {ads.length > 1 && (
                    <button
                        onClick={prev}
                        className="shrink-0 w-6 h-6 rounded-full bg-white/10 hover:bg-white/25 flex items-center justify-center text-white transition-colors"
                    >
                        <ChevronLeft size={14} />
                    </button>
                )}

                {/* Ad image thumbnail */}
                {ad.media_url && (
                    <div className="shrink-0 h-9 w-14 rounded-lg overflow-hidden border border-white/20 shadow-sm">
                        <img
                            src={ad.media_url}
                            alt={ad.title}
                            className="w-full h-full object-cover"
                        />
                    </div>
                )}

                {/* Ad title + dots */}
                <div className="flex-1 min-w-0">
                    <p className="text-white font-bold text-sm leading-tight truncate">
                        {ad.title}
                    </p>
                    {/* Dot indicators */}
                    {ads.length > 1 && (
                        <div className="flex gap-1 mt-0.5">
                            {ads.map((_, i) => (
                                <button
                                    key={i}
                                    onClick={() => setCurrentIndex(i)}
                                    className={`w-1.5 h-1.5 rounded-full transition-all ${
                                        i === currentIndex ? 'bg-white w-4' : 'bg-white/40'
                                    }`}
                                />
                            ))}
                        </div>
                    )}
                </div>

                {/* CTA button */}
                {ad.link_url && (
                    <a
                        href={ad.link_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => handleClick(ad)}
                        className="shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 bg-white text-indigo-700 font-bold text-xs rounded-lg shadow hover:bg-indigo-50 transition-colors whitespace-nowrap"
                    >
                        Learn More
                        <ExternalLink size={11} />
                    </a>
                )}

                {/* Navigation: next */}
                {ads.length > 1 && (
                    <button
                        onClick={next}
                        className="shrink-0 w-6 h-6 rounded-full bg-white/10 hover:bg-white/25 flex items-center justify-center text-white transition-colors"
                    >
                        <ChevronRight size={14} />
                    </button>
                )}

                {/* Dismiss */}
                <button
                    onClick={() => setDismissed(true)}
                    className="shrink-0 w-6 h-6 rounded-full bg-white/10 hover:bg-white/25 flex items-center justify-center text-white/70 hover:text-white transition-colors"
                    title="Dismiss"
                >
                    <X size={12} />
                </button>
            </div>

            {/* Progress bar (auto-rotate indicator) */}
            {ads.length > 1 && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/10">
                    <div
                        key={currentIndex}
                        className="h-full bg-white/50 animate-[progress_6s_linear_forwards]"
                        style={{
                            animation: 'ads-progress 6s linear forwards',
                        }}
                    />
                </div>
            )}
        </div>
    );
}
