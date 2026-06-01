import { useState, useEffect, useRef, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
import { authFetch } from '../api';
import { API_URL } from '../config';
import { usePlan } from '../hooks/usePlan';

/**
 * AdsBanner — Fetches active ads and shows them as an auto-rotating banner.
 *
 * Tiers:
 *  - Free Plan: Custom general ads + Google Ads (title starts with "Sponsored:").
 *  - Pro Plan: Only Pro ads (no Google).
 *  - Enterprise Plan: Only 1-to-1 academy sponsor ads.
 *
 * Google Ads are managed from SaaS Admin → Advertisements → Google Ads tab.
 */
export default function AdsBanner({ position = 'top' }) {
    const { plan, loading: planLoading } = usePlan();
    const [ads, setAds] = useState([]);
    const [displayAds, setDisplayAds] = useState([]);
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

    // Filter ads based on plan tier
    useEffect(() => {
        if (!loaded || planLoading) return;

        const currentPlanId = (plan?.plan_id || 'free').toLowerCase();

        // Separate Google ads (title starts with "Sponsored:") from custom ads
        const googleAds = ads.filter(a => (a.title || '').startsWith('Sponsored:'));
        const customAds = ads.filter(a => !(a.title || '').startsWith('Sponsored:'));

        let finalAds = [];

        if (currentPlanId === 'free') {
            // Free plan: show general custom ads + all Google ads
            const generalAds = customAds.filter(a => (a.ad_type || 'general') === 'general');
            finalAds = [
                ...generalAds,
                ...googleAds.map(a => ({ ...a, is_google: true }))
            ];
        } else if (currentPlanId === 'pro' || currentPlanId === 'medium') {
            // Pro plan: only pro-tier custom ads, no Google
            finalAds = customAds.filter(a => (a.ad_type || 'general') === 'pro');
        } else {
            // Enterprise/1to1 plan: only 1to1 ads for this specific academy
            finalAds = customAds.filter(a => (a.ad_type || 'general') === '1to1');
        }

        setDisplayAds(finalAds);
        setCurrentIndex(0);
    }, [ads, plan, loaded, planLoading]);

    // Auto-rotate every 6 seconds
    useEffect(() => {
        if (displayAds.length <= 1) return;
        intervalRef.current = setInterval(() => {
            setCurrentIndex(prev => (prev + 1) % displayAds.length);
        }, 6000);
        return () => clearInterval(intervalRef.current);
    }, [displayAds.length]);

    // Track view count (skip Google ads — they track externally)
    useEffect(() => {
        if (!displayAds.length) return;
        const ad = displayAds[currentIndex];
        if (!ad || ad.is_google || trackedViews.current.has(ad.id)) return;
        trackedViews.current.add(ad.id);
        authFetch(`${API_URL}/advertisements/${ad.id}/view`, { method: 'POST' }).catch(() => {});
    }, [currentIndex, displayAds]);

    const handleClick = useCallback((ad) => {
        // Track clicks for all ads (including Google) since they're in our DB now
        authFetch(`${API_URL}/advertisements/${ad.id}/click`, { method: 'POST' }).catch(() => {});
    }, []);

    const prev = () => {
        clearInterval(intervalRef.current);
        setCurrentIndex(i => (i - 1 + displayAds.length) % displayAds.length);
    };

    const next = () => {
        clearInterval(intervalRef.current);
        setCurrentIndex(i => (i + 1) % displayAds.length);
    };

    if (!loaded || planLoading || dismissed || displayAds.length === 0) return null;

    const ad = displayAds[currentIndex];

    return (
        <div
            className={`relative w-full overflow-hidden shadow-lg ${
                ad.is_google
                    ? 'bg-gradient-to-r from-blue-900 via-blue-800 to-cyan-900'
                    : 'bg-gradient-to-r from-indigo-900 via-indigo-800 to-violet-900'
            } ${position === 'bottom' ? 'order-last' : ''}`}
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
            <div className="relative flex items-center h-14 px-3 gap-3 max-w-screen-2xl mx-auto animate-fade-in">

                {/* Navigation: prev */}
                {displayAds.length > 1 && (
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
                    <div className="flex items-center gap-2">
                        {ad.is_google && (
                            <span className="shrink-0 px-1.5 py-0.5 bg-white/20 text-white/95 text-[8px] font-black rounded uppercase tracking-wider border border-white/30 whitespace-nowrap shadow-sm">
                                Google Ad
                            </span>
                        )}
                        <p className="text-white font-bold text-sm leading-tight truncate">
                            {ad.is_google ? ad.title.replace('Sponsored: ', '') : ad.title}
                        </p>
                    </div>
                    {/* Dot indicators */}
                    {displayAds.length > 1 && (
                        <div className="flex gap-1 mt-1">
                            {displayAds.map((_, i) => (
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
                        className={`shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 font-bold text-xs rounded-lg shadow hover:opacity-90 transition-colors whitespace-nowrap ${
                            ad.is_google
                                ? 'bg-white text-blue-700 hover:bg-blue-50'
                                : 'bg-white text-indigo-700 hover:bg-indigo-50'
                        }`}
                    >
                        Learn More
                        <ExternalLink size={11} />
                    </a>
                )}

                {/* Navigation: next */}
                {displayAds.length > 1 && (
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

            {/* Progress bar */}
            {displayAds.length > 1 && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/10">
                    <div
                        key={currentIndex}
                        className="h-full bg-white/50"
                        style={{
                            animation: 'ads-progress 6s linear forwards',
                        }}
                    />
                </div>
            )}
        </div>
    );
}
