import { useState, useEffect, useRef, useCallback } from 'react';
import { API_URL } from '../../config';
import {
    Search, Send, Image, Users, ArrowLeft, RefreshCw,
    Shield, User, Loader2, X, MoreVertical, CheckCheck,
    ChevronRight, Smile, Mic, Phone, Video
} from 'lucide-react';

// ─────────────────────────
// Helpers
// ─────────────────────────
const CATEGORY_COLORS = {
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

const getCatStyle = (cat) => CATEGORY_COLORS[cat] || CATEGORY_COLORS.general;

const ROLE_CONFIG = {
    admin:  { label: 'Admin',   color: '#7c3aed', bg: 'rgba(124,58,237,0.1)',  icon: '👑' },
    coach:  { label: 'Coach',   color: '#059669', bg: 'rgba(5,150,105,0.1)',   icon: '🎽' },
    player: { label: 'Joueur',  color: '#2563eb', bg: 'rgba(37,99,235,0.1)',   icon: '⚽' },
    parent: { label: 'Parent',  color: '#d97706', bg: 'rgba(217,119,6,0.1)',   icon: '👨‍👦' },
};

const fmtTime = (ts) => {
    if (!ts) return '';
    const d = new Date(ts);
    return d.toLocaleTimeString('fr-MA', { hour: '2-digit', minute: '2-digit' });
};

const fmtDate = (ts) => {
    if (!ts) return '';
    const d = new Date(ts);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === today.toDateString()) return "Aujourd'hui";
    if (d.toDateString() === yesterday.toDateString()) return "Hier";
    return d.toLocaleDateString('fr-MA', { weekday: 'long', day: 'numeric', month: 'long' });
};

const Avatar = ({ name = '?', role, size = 40 }) => {
    const cfg = ROLE_CONFIG[role] || ROLE_CONFIG.player;
    return (
        <div style={{
            width: size, height: size, borderRadius: '50%',
            background: `linear-gradient(135deg, ${cfg.color}22, ${cfg.color}44)`,
            border: `2px solid ${cfg.color}55`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: size * 0.38, fontWeight: 900, color: cfg.color, flexShrink: 0
        }}>
            {name.charAt(0).toUpperCase()}
        </div>
    );
};

const GroupAvatar = ({ group, size = 48 }) => {
    const style = getCatStyle(group.category);
    return (
        <div style={{
            width: size, height: size, borderRadius: size * 0.3,
            background: style.bg, border: `2px solid ${style.border}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: size * 0.42, flexShrink: 0
        }}>
            {style.emoji}
        </div>
    );
};

// ─────────────────────────
// Main Component
// ─────────────────────────
export default function ChatManagement() {
    const myUserId = localStorage.getItem('user_id') || '';
    const myRole   = localStorage.getItem('role') || 'admin';
    const myName   = localStorage.getItem('user_name') || 'Utilisateur';
    const isAdmin  = myRole === 'admin';
    const isCoach  = myRole === 'coach';
    const canMod   = isAdmin || isCoach;

    const [groups, setGroups]           = useState([]);
    const [activeGroup, setActiveGroup] = useState(null);
    const [messages, setMessages]       = useState([]);
    const [members, setMembers]         = useState([]);
    const [typing, setTyping]           = useState([]);
    const [inputMsg, setInputMsg]       = useState('');
    const [search, setSearch]           = useState('');
    const [loading, setLoading]         = useState(false);
    const [syncing, setSyncing]         = useState(false);
    const [sendingImg, setSendingImg]   = useState(false);
    const [showMembers, setShowMembers] = useState(false);
    const [error, setError]             = useState('');
    const [lastMsgMap, setLastMsgMap]   = useState({});

    const endRef      = useRef(null);
    const typingTimer = useRef(null);
    const fileRef     = useRef(null);
    const pollRef     = useRef(null);

    // ── Fetch groups
    const fetchGroups = useCallback(async () => {
        try {
            let uid = myUserId, role = myRole;
            if (myRole === 'parent') {
                const r = await fetch(`${API_URL}/players/`);
                if (r.ok) {
                    const all = await r.json();
                    const child = all.find(p => p.user_id === myUserId || p.parent_id === myUserId) || all[0];
                    if (child) { uid = child.user_id; role = 'player'; }
                }
            }
            const res = await fetch(`${API_URL}/chat/groups?user_id=${uid}&role=${role}`);
            if (res.ok) {
                const data = await res.json();
                setGroups(data);
            }
        } catch { /* silent */ }
    }, [myUserId, myRole]);

    useEffect(() => { fetchGroups(); }, [fetchGroups]);

    // ── Poll messages
    const fetchMessages = useCallback(async (silent = false) => {
        if (!activeGroup) return;
        if (!silent) setLoading(true);
        try {
            const res = await fetch(`${API_URL}/chat/groups/${activeGroup.id}/messages?limit=100`);
            if (res.ok) {
                const data = await res.json();
                setMessages(data);
                if (data.length > 0) {
                    setLastMsgMap(prev => ({ ...prev, [activeGroup.id]: data[data.length - 1] }));
                }
            }
        } catch { /* silent */ }
        finally { if (!silent) setLoading(false); }
    }, [activeGroup]);

    const fetchMembers = useCallback(async () => {
        if (!activeGroup) return;
        try {
            const res = await fetch(`${API_URL}/chat/groups/${activeGroup.id}/members`);
            if (res.ok) setMembers(await res.json());
        } catch { /* silent */ }
    }, [activeGroup]);

    const fetchTyping = useCallback(async () => {
        if (!activeGroup) return;
        try {
            const res = await fetch(`${API_URL}/chat/groups/${activeGroup.id}/typing?exclude_user=${myUserId}`);
            if (res.ok) setTyping(await res.json());
        } catch { /* silent */ }
    }, [activeGroup, myUserId]);

    useEffect(() => {
        if (!activeGroup) return;
        fetchMessages();
        fetchMembers();
        clearInterval(pollRef.current);
        pollRef.current = setInterval(() => {
            fetchMessages(true);
            fetchTyping();
        }, 2500);
        return () => clearInterval(pollRef.current);
    }, [activeGroup, fetchMessages, fetchMembers, fetchTyping]);

    useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

    // ── Join group
    const openGroup = async (group) => {
        setActiveGroup(group);
        setShowMembers(false);
        try {
            await fetch(`${API_URL}/chat/groups/${group.id}/join`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ group_id: group.id, user_id: myUserId, user_name: myName, user_role: myRole, is_moderator: canMod })
            });
        } catch { /* silent */ }
    };

    // ── Send message
    const sendMessage = async () => {
        if (!inputMsg.trim() || !activeGroup) return;
        const content = inputMsg.trim();
        setInputMsg('');
        clearTyping();
        try {
            const res = await fetch(`${API_URL}/chat/messages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ group_id: activeGroup.id, sender_id: myUserId, sender_name: myName, sender_role: myRole, content, message_type: 'text' })
            });
            if (!res.ok) {
                const e = await res.json();
                setError(e.detail || 'Erreur envoi');
                setTimeout(() => setError(''), 4000);
            } else { fetchMessages(true); }
        } catch { setError('Erreur réseau'); setTimeout(() => setError(''), 4000); }
    };

    // ── Send image
    const sendImage = async (file) => {
        if (!isAdmin && !isCoach) return;
        setSendingImg(true);
        const fd = new FormData();
        fd.append('file', file);
        fd.append('sender_role', myRole);
        try {
            const upRes = await fetch(`${API_URL}/chat/upload-image`, { method: 'POST', body: fd });
            if (!upRes.ok) throw new Error();
            const { url } = await upRes.json();
            await fetch(`${API_URL}/chat/messages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ group_id: activeGroup.id, sender_id: myUserId, sender_name: myName, sender_role: myRole, image_url: url, message_type: 'image' })
            });
            fetchMessages(true);
        } catch { setError('Échec upload image'); setTimeout(() => setError(''), 4000); }
        finally { setSendingImg(false); }
    };

    // ── Typing
    const updateTyping = (isTyping) => {
        if (!activeGroup) return;
        fetch(`${API_URL}/chat/typing`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ group_id: activeGroup.id, user_id: myUserId, user_name: myName, is_typing: isTyping })
        }).catch(() => {});
    };
    const clearTyping = () => { clearTimeout(typingTimer.current); updateTyping(false); };
    const handleInput = (e) => {
        setInputMsg(e.target.value);
        updateTyping(true);
        clearTimeout(typingTimer.current);
        typingTimer.current = setTimeout(() => updateTyping(false), 3000);
    };

    // ── Sync groups (admin)
    const syncGroups = async () => {
        setSyncing(true);
        try {
            const res = await fetch(`${API_URL}/chat/sync-groups`, { method: 'POST' });
            if (res.ok) {
                const data = await res.json();
                setError(`✅ ${data.groups_created} groupes créés, ${data.groups_updated} mis à jour`);
                setTimeout(() => setError(''), 5000);
                fetchGroups();
            }
        } catch { setError('Erreur sync'); setTimeout(() => setError(''), 4000); }
        finally { setSyncing(false); }
    };

    // ── Delete message
    const deleteMsg = async (id) => {
        if (!canMod) return;
        await fetch(`${API_URL}/chat/messages/${id}`, { method: 'DELETE' });
        fetchMessages(true);
    };

    // ── Filtered groups
    const filteredGroups = groups.filter(g =>
        g.name?.toLowerCase().includes(search.toLowerCase()) ||
        g.category?.toLowerCase().includes(search.toLowerCase())
    );

    // ── Group messages by date for dividers
    const groupedMessages = messages.reduce((acc, msg) => {
        const day = fmtDate(msg.created_at);
        if (!acc[day]) acc[day] = [];
        acc[day].push(msg);
        return acc;
    }, {});

    return (
        <div style={{ display: 'flex', height: 'calc(100vh - 80px)', background: '#f0f2f5', borderRadius: 24, overflow: 'hidden', boxShadow: '0 8px 40px rgba(0,0,0,0.08)' }}>

            {/* ═══════════════════════════════════════
                LEFT PANEL — Groups List
            ═══════════════════════════════════════ */}
            <div className={`w-full lg:w-[340px] lg:min-w-[280px] bg-white border-r border-slate-200 flex-col transition-all duration-300 ${activeGroup ? 'hidden lg:flex' : 'flex'}`}>
                {/* Header */}
                <div style={{ padding: '20px 16px 12px', borderBottom: '1px solid #f3f4f6' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                        <div>
                            <h2 style={{ fontSize: 20, fontWeight: 900, color: '#0f172a', margin: 0 }}>💬 Groupes</h2>
                            <p style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>{groups.length} groupes</p>
                        </div>
                        {isAdmin && (
                            <button
                                onClick={syncGroups}
                                disabled={syncing}
                                title="Synchroniser les groupes par équipe"
                                style={{
                                    display: 'flex', alignItems: 'center', gap: 6,
                                    background: syncing ? '#f1f5f9' : 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                                    color: syncing ? '#94a3b8' : '#fff',
                                    border: 'none', borderRadius: 12, padding: '8px 14px',
                                    fontSize: 11, fontWeight: 900, cursor: syncing ? 'not-allowed' : 'pointer',
                                    textTransform: 'uppercase', letterSpacing: '0.05em'
                                }}
                            >
                                <RefreshCw size={14} style={{ animation: syncing ? 'spin 1s linear infinite' : 'none' }} />
                                Sync
                            </button>
                        )}
                    </div>
                    {/* Search */}
                    <div style={{ position: 'relative' }}>
                        <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                        <input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Rechercher un groupe..."
                            style={{
                                width: '100%', padding: '10px 12px 10px 36px',
                                background: '#f8fafc', border: '1px solid #e5e7eb',
                                borderRadius: 12, fontSize: 13, fontWeight: 600,
                                outline: 'none', boxSizing: 'border-box', color: '#0f172a'
                            }}
                        />
                    </div>
                </div>

                {/* Error/info bar */}
                {error && (
                    <div style={{ margin: '8px 12px', padding: '10px 14px', background: error.startsWith('✅') ? '#f0fdf4' : '#fef2f2', borderRadius: 10, fontSize: 12, fontWeight: 700, color: error.startsWith('✅') ? '#065f46' : '#991b1b', border: `1px solid ${error.startsWith('✅') ? '#bbf7d0' : '#fecaca'}` }}>
                        {error}
                    </div>
                )}

                {/* Groups list */}
                <div style={{ flex: 1, overflowY: 'auto' }}>
                    {filteredGroups.length === 0 ? (
                        <div style={{ padding: 32, textAlign: 'center', color: '#94a3b8' }}>
                            <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
                            <p style={{ fontWeight: 700, fontSize: 14 }}>Aucun groupe</p>
                            {isAdmin && <p style={{ fontSize: 12 }}>Cliquez "Sync" pour créer les groupes</p>}
                        </div>
                    ) : filteredGroups.map(g => {
                        const catStyle = getCatStyle(g.category);
                        const lastMsg = lastMsgMap[g.id];
                        const isActive = activeGroup?.id === g.id;
                        return (
                            <div
                                key={g.id}
                                onClick={() => openGroup(g)}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px',
                                    cursor: 'pointer', transition: 'background 0.15s',
                                    background: isActive ? '#f0f9ff' : 'transparent',
                                    borderBottom: '1px solid #f8fafc',
                                    borderLeft: isActive ? '4px solid #4f46e5' : '4px solid transparent',
                                }}
                                onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = '#f8fafc'; }}
                                onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
                            >
                                <GroupAvatar group={g} size={50} />
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                                        <span style={{ fontWeight: 800, fontSize: 14, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 160 }}>
                                            {g.name}
                                        </span>
                                        {lastMsg && <span style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600, flexShrink: 0 }}>{fmtTime(lastMsg.created_at)}</span>}
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontSize: 12, color: '#6b7280', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 180 }}>
                                            {lastMsg
                                                ? (lastMsg.message_type === 'image' ? '📷 Image' : `${lastMsg.sender_name}: ${lastMsg.content || ''}`)
                                                : g.description || 'Aucun message'
                                            }
                                        </span>
                                        {g.category && (
                                            <span style={{
                                                fontSize: 9, fontWeight: 900, padding: '2px 6px',
                                                borderRadius: 6, background: catStyle.bg,
                                                color: catStyle.text, border: `1px solid ${catStyle.border}`,
                                                textTransform: 'uppercase', letterSpacing: '0.05em', flexShrink: 0
                                            }}>{g.category}</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* ═══════════════════════════════════════
                RIGHT PANEL — Chat area
            ═══════════════════════════════════════ */}
            <div className={`flex-1 flex-col bg-[#efeae2] relative overflow-hidden ${!activeGroup ? 'hidden lg:flex' : 'flex'}`} style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23c8c2b8' fill-opacity='0.15'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")` }}>
                {!activeGroup ? (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, background: '#f0f2f5' }}>
                        <div style={{ width: 120, height: 120, borderRadius: '50%', background: 'linear-gradient(135deg, #4f46e580, #7c3aed80)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 52 }}>💬</div>
                        <div style={{ textAlign: 'center' }}>
                            <h3 style={{ fontSize: 22, fontWeight: 900, color: '#374151', margin: '0 0 8px' }}>Sélectionnez un groupe</h3>
                            <p style={{ fontSize: 14, color: '#6b7280', fontWeight: 500 }}>Cliquez sur un groupe dans la liste pour commencer</p>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Chat Header */}
                        <div style={{ background: '#fff', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', zIndex: 10 }}>
                            <button
                                onClick={() => setActiveGroup(null)}
                                className="lg:hidden text-slate-500 hover:text-slate-800 p-1 flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors"
                            >
                                <ArrowLeft size={22} />
                            </button>
                            <GroupAvatar group={activeGroup} size={44} />
                            <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 900, fontSize: 15, color: '#0f172a' }}>{activeGroup.name}</div>
                                <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 600 }}>
                                    {typing.length > 0
                                        ? <span style={{ color: '#059669', fontStyle: 'italic' }}>✍️ {typing.map(t => t.user_name).join(', ')} écrit...</span>
                                        : `${members.length} membre${members.length > 1 ? 's' : ''}`
                                    }
                                </div>
                            </div>
                            {canMod && (
                                <button
                                    onClick={() => setShowMembers(!showMembers)}
                                    title="Membres"
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: 6,
                                        background: showMembers ? '#f0f9ff' : 'transparent',
                                        border: '1px solid #e5e7eb', borderRadius: 10,
                                        padding: '6px 12px', cursor: 'pointer', fontSize: 12,
                                        fontWeight: 800, color: showMembers ? '#4f46e5' : '#6b7280'
                                    }}
                                >
                                    <Users size={15} /> {members.length}
                                </button>
                            )}
                        </div>

                        {/* Error bar */}
                        {error && (
                            <div style={{ backgroundColor: error.startsWith('✅') ? '#f0fdf4' : '#fef2f2', padding: '8px 16px', textAlign: 'center', fontSize: 13, fontWeight: 700, color: error.startsWith('✅') ? '#065f46' : '#991b1b', borderBottom: '1px solid #e5e7eb' }}>
                                {error}
                            </div>
                        )}

                        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
                            {/* Messages Area */}
                            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 2 }}>
                                {loading ? (
                                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: '#4f46e5' }} />
                                    </div>
                                ) : messages.length === 0 ? (
                                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8 }}>
                                        <div style={{ fontSize: 48 }}>👋</div>
                                        <p style={{ fontWeight: 700, fontSize: 14, color: '#6b7280' }}>Aucun message. Commencez la conversation!</p>
                                    </div>
                                ) : (
                                    Object.entries(groupedMessages).map(([day, dayMsgs]) => (
                                        <div key={day}>
                                            {/* Date Divider */}
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '12px 0 8px' }}>
                                                <div style={{ flex: 1, height: 1, background: '#d1d5db' }} />
                                                <span style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', background: '#e5e7eb', padding: '3px 10px', borderRadius: 10, whiteSpace: 'nowrap' }}>{day}</span>
                                                <div style={{ flex: 1, height: 1, background: '#d1d5db' }} />
                                            </div>
                                            {dayMsgs.map((msg, idx) => {
                                                const isMe = msg.sender_id === myUserId;
                                                const isSystem = msg.message_type === 'system';
                                                const prevMsg = idx > 0 ? dayMsgs[idx - 1] : null;
                                                const showAvatar = !isMe && (!prevMsg || prevMsg.sender_id !== msg.sender_id);
                                                const showName = !isMe && showAvatar;
                                                const roleCfg = ROLE_CONFIG[msg.sender_role] || ROLE_CONFIG.player;

                                                if (isSystem) return (
                                                    <div key={msg.id} style={{ textAlign: 'center', margin: '8px 0' }}>
                                                        <span style={{ background: '#ffffffcc', padding: '4px 12px', borderRadius: 20, fontSize: 11, color: '#6b7280', fontWeight: 600 }}>{msg.content}</span>
                                                    </div>
                                                );

                                                return (
                                                    <div key={msg.id} style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start', marginBottom: 2, gap: 8, alignItems: 'flex-end' }}>
                                                        {/* Left avatar placeholder */}
                                                        {!isMe && (
                                                            <div style={{ width: 32, flexShrink: 0 }}>
                                                                {showAvatar && <Avatar name={msg.sender_name} role={msg.sender_role} size={32} />}
                                                            </div>
                                                        )}
                                                        <div style={{ maxWidth: '72%', display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start', gap: 2 }}>
                                                            {showName && (
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingLeft: 4 }}>
                                                                    <span style={{ fontSize: 11, fontWeight: 900, color: roleCfg.color }}>{msg.sender_name}</span>
                                                                    <span style={{ fontSize: 9, fontWeight: 700, background: roleCfg.bg, color: roleCfg.color, padding: '1px 5px', borderRadius: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{roleCfg.icon} {roleCfg.label}</span>
                                                                </div>
                                                            )}
                                                            <div
                                                                className="group"
                                                                style={{
                                                                    padding: msg.message_type === 'image' ? '4px' : '8px 12px',
                                                                    borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                                                                    background: isMe ? 'linear-gradient(135deg, #dcf8c6, #c8f0a8)' : '#ffffff',
                                                                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                                                                    position: 'relative',
                                                                    minWidth: 80,
                                                                }}
                                                            >
                                                                {msg.message_type === 'image' ? (
                                                                    <img
                                                                        src={msg.image_url}
                                                                        alt="img"
                                                                        style={{ maxWidth: 240, maxHeight: 200, borderRadius: 14, display: 'block', objectFit: 'cover' }}
                                                                        onError={e => { e.target.style.display = 'none'; }}
                                                                    />
                                                                ) : (
                                                                    <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.5, color: '#111827', wordBreak: 'break-word' }}>{msg.content}</p>
                                                                )}
                                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4, marginTop: 3 }}>
                                                                    <span style={{ fontSize: 10, color: isMe ? '#3a7d2c' : '#94a3b8', fontWeight: 500 }}>{fmtTime(msg.created_at)}</span>
                                                                    {isMe && <CheckCheck size={12} style={{ color: '#3a7d2c' }} />}
                                                                </div>
                                                                {canMod && (
                                                                    <button
                                                                        onClick={() => deleteMsg(msg.id)}
                                                                        title="Supprimer"
                                                                        style={{
                                                                            position: 'absolute', top: -8, right: isMe ? 'auto' : -8, left: isMe ? -8 : 'auto',
                                                                            opacity: 0, background: '#ef4444', border: 'none', borderRadius: '50%', width: 20, height: 20,
                                                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                            cursor: 'pointer', transition: 'opacity 0.2s', color: '#fff'
                                                                        }}
                                                                        onMouseEnter={e => { e.currentTarget.style.opacity = 1; }}
                                                                        onMouseLeave={e => { e.currentTarget.style.opacity = 0; }}
                                                                    >
                                                                        <X size={11} />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ))
                                )}
                                <div ref={endRef} />
                            </div>

                            {/* Members Sidebar */}
                            {showMembers && (
                                <div style={{ width: 260, background: '#fff', borderLeft: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column' }}>
                                    <div style={{ padding: '14px 16px', borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontWeight: 900, fontSize: 14, color: '#0f172a' }}>👥 Membres ({members.length})</span>
                                        <button onClick={() => setShowMembers(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', display: 'flex' }}>
                                            <X size={16} />
                                        </button>
                                    </div>
                                    <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
                                        {members.map(m => {
                                            const cfg = ROLE_CONFIG[m.user_role] || ROLE_CONFIG.player;
                                            return (
                                                <div key={m.user_id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px' }}>
                                                    <Avatar name={m.user_name} role={m.user_role} size={36} />
                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                        <div style={{ fontWeight: 800, fontSize: 13, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                            {m.user_name}
                                                            {m.is_moderator && <span style={{ marginLeft: 4, fontSize: 9, background: '#fef3c7', color: '#b45309', padding: '1px 4px', borderRadius: 4, fontWeight: 900 }}>MOD</span>}
                                                        </div>
                                                        <div style={{ fontSize: 10, fontWeight: 700, color: cfg.color, display: 'flex', alignItems: 'center', gap: 3 }}>
                                                            {cfg.icon} {cfg.label}
                                                        </div>
                                                    </div>
                                                    {m.is_muted && <span title="Muté" style={{ fontSize: 14 }}>🔇</span>}
                                                    {m.banned  && <span title="Banni" style={{ fontSize: 14 }}>🚫</span>}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Input Bar — WhatsApp style */}
                        <div style={{ background: '#f0f2f5', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
                            {/* Image attachment (admin/coach only) */}
                            {(isAdmin || isCoach) && (
                                <>
                                    <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { if (e.target.files[0]) sendImage(e.target.files[0]); e.target.value = ''; }} />
                                    <button
                                        onClick={() => fileRef.current?.click()}
                                        disabled={sendingImg}
                                        title="Envoyer une image"
                                        style={{ width: 42, height: 42, borderRadius: '50%', background: '#fff', border: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#6b7280', flexShrink: 0 }}
                                    >
                                        {sendingImg ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <Image size={18} />}
                                    </button>
                                </>
                            )}

                            {/* Text input */}
                            <div style={{ flex: 1, display: 'flex', alignItems: 'center', background: '#fff', borderRadius: 24, padding: '0 16px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid #e5e7eb' }}>
                                <input
                                    value={inputMsg}
                                    onChange={handleInput}
                                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                                    placeholder="Écrire un message..."
                                    style={{ flex: 1, border: 'none', outline: 'none', fontSize: 14, padding: '12px 0', background: 'transparent', color: '#0f172a', fontWeight: 500 }}
                                />
                            </div>

                            {/* Send button */}
                            <button
                                onClick={sendMessage}
                                disabled={!inputMsg.trim()}
                                style={{
                                    width: 44, height: 44, borderRadius: '50%', border: 'none', cursor: inputMsg.trim() ? 'pointer' : 'default',
                                    background: inputMsg.trim() ? 'linear-gradient(135deg, #4f46e5, #7c3aed)' : '#e5e7eb',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                                    transition: 'all 0.2s', boxShadow: inputMsg.trim() ? '0 4px 14px rgba(79,70,229,0.4)' : 'none'
                                }}
                            >
                                <Send size={18} style={{ color: inputMsg.trim() ? '#fff' : '#94a3b8' }} />
                            </button>
                        </div>
                    </>
                )}
            </div>

            <style>{`
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                ::-webkit-scrollbar { width: 4px; }
                ::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 4px; }
                .group:hover > button { opacity: 1 !important; }
            `}</style>
        </div>
    );
}
