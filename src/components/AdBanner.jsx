import React, { useState, useRef, useEffect } from 'react';
import { API_URL } from '../config';
import { authFetch } from '../api';

/**
 * AdBanner — displays targeted advertisements to users.
 *
 * Props:
 *   userRole (string)  — current user's role, for targeting
 *   limit    (number)  — max ads to show in rotation (default 1)
 */
export default function AdBanner({ userRole, limit = 1 }) {
  const [ads, setAds] = useState([]);
  const [current, setCurrent] = useState(0);
  const [loading, setLoading] = useState(true);
  const timerRef = useRef(null);

  useEffect(() => {
    authFetch(`${API_URL}/advertisements/`)
      .then(async res => {
        if (res.ok) {
          const data = await res.json();
          const visible = (data || []).slice(0, limit);
          setAds(visible);
          // Track view for each displayed ad
          visible.forEach(ad => {
            authFetch(`${API_URL}/advertisements/${ad.id}/view`, { method: 'POST' }).catch(() => {});
          });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [limit]);

  // Auto-rotate through multiple ads every 5 seconds
  useEffect(() => {
    if (ads.length > 1) {
      timerRef.current = setInterval(() => {
        setCurrent(prev => (prev + 1) % ads.length);
      }, 5000);
    }
    return () => clearInterval(timerRef.current);
  }, [ads.length]);

  if (loading || ads.length === 0) return null;

  const ad = ads[current];

  const handleClick = () => {
    authFetch(`${API_URL}/advertisements/${ad.id}/click`, { method: 'POST' }).catch(() => {});
    if (ad.link_url) {
      window.open(ad.link_url, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className="ad-banner" role="complementary" aria-label="Advertisement">
      <div
        className={`ad-banner-inner ${ad.link_url ? 'ad-banner--clickable' : ''}`}
        onClick={ad.link_url ? handleClick : undefined}
      >
        {/* Media */}
        <div className="ad-media-wrapper">
          <img
            src={ad.media_url}
            alt={ad.title}
            className="ad-media-img"
            loading="lazy"
          />
          <div className="ad-overlay">
            <span className="ad-label">إعلان · Ad</span>
          </div>
        </div>

        {/* Info */}
        <div className="ad-info">
          <p className="ad-title">{ad.title}</p>
          {ad.link_url && (
            <button className="ad-cta-btn" onClick={handleClick}>
              اعرف المزيد ·  Learn More →
            </button>
          )}
        </div>
      </div>

      {/* Dots indicator for multiple ads */}
      {ads.length > 1 && (
        <div className="ad-dots">
          {ads.map((_, i) => (
            <button
              key={i}
              className={`ad-dot ${i === current ? 'ad-dot--active' : ''}`}
              onClick={() => setCurrent(i)}
              aria-label={`Ad ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
