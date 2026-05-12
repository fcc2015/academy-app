import { API_URL } from '../../config';

// WebSocket URL derived from API_URL (http→ws, https→wss)
export const WS_URL = API_URL.replace(/^http/, 'ws');

// ─────────────────────────
// Category Colors
// ─────────────────────────
export const CATEGORY_COLORS = {
    U8:  { bg: '#fce7f3', text: '#be185d', border: '#f9a8d4', emoji: '⚽' },
    U10: { bg: '#fef3c7', text: '#b45309', border: '#fcd34d', emoji: '🥉' },
    U11: { bg: '#ede9fe', text: '#6d28d9', border: '#c4b5fd', emoji: '🥈' },
    U12: { bg: '#dbeafe', text: '#1d4ed8', border: '#93c5fd', emoji: '🥇' },
    U13: { bg: '#d1fae5', text: '#065f46', border: '#6ee7b7', emoji: '🏅' },
    U14: { bg: '#fef9c3', text: '#854d0e', border: '#fde047', emoji: '🏆' },
    U15: { bg: '#fee2e2', text: '#991b1b', border: '#fca5a5', emoji: '⭐' },
    U16: { bg: '#e0f2fe', text: '#075985', border: '#7dd3fc', emoji: '🌟' },
    U17: { bg: '#f0fdf4', text: '#14532d', border: '#86efac', emoji: '💫' },
    U18: { bg: '#fdf4ff', text: '#7e22ce', border: '#d8b4fe', emoji: '🏆' },
    Senior: { bg: '#f1f5f9', text: '#0f172a', border: '#94a3b8', emoji: '👑' },
    general: { bg: '#f8fafc', text: '#64748b', border: '#e2e8f0', emoji: '📢' },
};

export const getCatStyle = (cat) => CATEGORY_COLORS[cat] || CATEGORY_COLORS.general;

// ─────────────────────────
// Role Configuration
// ─────────────────────────
export const ROLE_CONFIG = {
    admin:  { label: 'إداري',      color: '#7c3aed', bg: 'rgba(124,58,237,0.1)',  icon: '👑' },
    coach:  { label: 'مدرب',       color: '#059669', bg: 'rgba(5,150,105,0.1)',   icon: '🎽' },
    player: { label: 'لاعب',       color: '#2563eb', bg: 'rgba(37,99,235,0.1)',   icon: '⚽' },
    parent: { label: 'ولي الأمر',  color: '#d97706', bg: 'rgba(217,119,6,0.1)',   icon: '👨‍👦' },
};

// ─────────────────────────
// Formatters
// ─────────────────────────
export const fmtTime = (ts) => {
    if (!ts) return '';
    const d = new Date(ts);
    return d.toLocaleTimeString('ar-MA', { hour: '2-digit', minute: '2-digit' });
};

export const fmtDate = (ts) => {
    if (!ts) return '';
    const d = new Date(ts);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === today.toDateString()) return 'اليوم';
    if (d.toDateString() === yesterday.toDateString()) return 'أمس';
    return d.toLocaleDateString('ar-MA', { weekday: 'long', day: 'numeric', month: 'long' });
};

// ─────────────────────────
// Chat background pattern (WhatsApp-style)
// ─────────────────────────
export const CHAT_BG_PATTERN = `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23c8c2b8' fill-opacity='0.15'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`;

// Shared inline styles
export const CHAT_STYLES = `
    @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
    ::-webkit-scrollbar { width: 4px; }
    ::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 4px; }
    .group:hover > button { opacity: 1 !important; }
`;
