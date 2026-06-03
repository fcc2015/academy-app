import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authFetch } from '../api';
import { API_URL } from '../config';

const BrandingContext = createContext({
    logoUrl: null,
    primaryColor: '#4f46e5',
    secondaryColor: '#7c3aed',
    academyName: null,
    refreshBranding: () => {},
    setBranding: () => {},
});

export const useBranding = () => useContext(BrandingContext);

// Apply CSS variables to :root so all components pick up the academy colors
function applyBrandingVars(primary, secondary) {
    if (primary) document.documentElement.style.setProperty('--color-primary', primary);
    if (secondary) document.documentElement.style.setProperty('--color-secondary', secondary);
}

export const BrandingProvider = ({ children }) => {
    const [logoUrl, setLogoUrl] = useState(() => localStorage.getItem('branding_logo') || null);
    const [primaryColor, setPrimaryColor] = useState(() => {
        const c = localStorage.getItem('branding_primary');
        return c || '#4f46e5';
    });
    const [secondaryColor, setSecondaryColor] = useState(() => {
        const c = localStorage.getItem('branding_secondary');
        return c || '#7c3aed';
    });
    const [academyName, setAcademyName] = useState(() => localStorage.getItem('branding_name') || null);

    // Apply persisted colors immediately on mount (no flicker)
    useEffect(() => {
        applyBrandingVars(primaryColor, secondaryColor);
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const refreshBranding = useCallback(async () => {
        const token = localStorage.getItem('token');
        if (!token) return;
        try {
            const res = await authFetch(`${API_URL}/settings/`);
            if (!res.ok) return;
            const data = await res.json();

            const logo = data.logo_url || null;
            const name = data.academy_name || null;

            // Colors may be serialized as JSON in about_text
            let primary = '#4f46e5';
            let secondary = '#7c3aed';
            const rawAbout = data.about_text || '';
            if (rawAbout.startsWith('{')) {
                try {
                    const parsed = JSON.parse(rawAbout);
                    primary = parsed.primary_color || primary;
                    secondary = parsed.secondary_color || secondary;
                } catch { /* keep defaults */ }
            }

            // Also check direct fields on academy_settings
            if (data.primary_color) primary = data.primary_color;
            if (data.secondary_color) secondary = data.secondary_color;

            setLogoUrl(logo);
            setPrimaryColor(primary);
            setSecondaryColor(secondary);
            setAcademyName(name);
            applyBrandingVars(primary, secondary);

            // Persist to localStorage for instant load on next visit
            if (logo) localStorage.setItem('branding_logo', logo);
            else localStorage.removeItem('branding_logo');
            localStorage.setItem('branding_primary', primary);
            localStorage.setItem('branding_secondary', secondary);
            if (name) localStorage.setItem('branding_name', name);
        } catch { /* network error — keep cached values */ }
    }, []);

    // Fetch on mount if logged in
    useEffect(() => {
        refreshBranding();
    }, [refreshBranding]);

    const setBranding = useCallback(({ logoUrl: logo, primaryColor: primary, secondaryColor: secondary, academyName: name }) => {
        if (logo !== undefined) { setLogoUrl(logo); if (logo) localStorage.setItem('branding_logo', logo); else localStorage.removeItem('branding_logo'); }
        if (primary !== undefined) { setPrimaryColor(primary); localStorage.setItem('branding_primary', primary); }
        if (secondary !== undefined) { setSecondaryColor(secondary); localStorage.setItem('branding_secondary', secondary); }
        if (name !== undefined) { setAcademyName(name); if (name) localStorage.setItem('branding_name', name); }
        applyBrandingVars(primary, secondary);
    }, []);

    return (
        <BrandingContext.Provider value={{ logoUrl, primaryColor, secondaryColor, academyName, refreshBranding, setBranding }}>
            {children}
        </BrandingContext.Provider>
    );
};

export default BrandingContext;
