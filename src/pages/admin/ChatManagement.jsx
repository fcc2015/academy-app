import { useState, useEffect, useCallback } from 'react';
import { API_URL } from '../../config';
import { authFetch } from '../../api';
import { RefreshCw, ArrowLeft, Users, X } from 'lucide-react';

// Shared chat components
import { ROLE_CONFIG, CHAT_BG_PATTERN, CHAT_STYLES } from '../../components/chat/chatConstants';
import { Avatar, GroupAvatar } from '../../components/chat/ChatAvatars';
import useChatWebSocket from '../../components/chat/useChatWebSocket';
import ChatMessageList from '../../components/chat/ChatMessageList';
import ChatInputBar from '../../components/chat/ChatInputBar';
import ChatGroupList from '../../components/chat/ChatGroupList';
import MuteModal from '../../components/chat/MuteModal';

export default function ChatManagement() {
    const myUserId = localStorage.getItem('user_id') || '';
    const rawRole  = localStorage.getItem('role') || 'admin';
    const myName   = localStorage.getItem('user_name') || 'مستخدم';
    const myRole   = (rawRole === 'super_admin' || rawRole === 'sous_admin') ? 'admin' : rawRole;
    const isAdmin  = myRole === 'admin';
    const isCoach  = myRole === 'coach';
    const canMod   = isAdmin || isCoach;

    const [groups, setGroups]           = useState([]);
    const [activeGroup, setActiveGroup] = useState(null);
    const [showMembers, setShowMembers] = useState(false);
    const [syncing, setSyncing]         = useState(false);
    const [error, setError]             = useState('');
    const [lastMsgMap, setLastMsgMap]   = useState({});
    const [muteTarget, setMuteTarget]   = useState(null);

    // WebSocket-powered real-time messaging
    const { messages, members, typing, loading, fetchMessages, fetchMembers, wsRef } = useChatWebSocket(activeGroup?.id, myUserId);

    // Track last message per group for sidebar preview
    useEffect(() => {
        if (activeGroup && messages.length > 0) {
            setLastMsgMap(prev => ({ ...prev, [activeGroup.id]: messages[messages.length - 1] }));
        }
    }, [messages, activeGroup]);

    // ── Fetch groups
    const fetchGroups = useCallback(async () => {
        try {
            let uid = myUserId, role = myRole;
            if (myRole === 'parent') {
                const r = await authFetch(`${API_URL}/players/`);
                if (r.ok) {
                    const all = await r.json();
                    const child = all.find(p => p.user_id === myUserId || p.parent_id === myUserId) || all[0];
                    if (child) { uid = child.user_id; role = 'player'; }
                }
            }
            const res = await authFetch(`${API_URL}/chat/groups?user_id=${uid}&role=${role}`);
            if (res.ok) setGroups(await res.json());
        } catch { /* silent */ }
    }, [myUserId, myRole]);

    useEffect(() => { fetchGroups(); }, [fetchGroups]);

    // ── Join group
    const openGroup = async (group) => {
        setActiveGroup(group);
        setShowMembers(false);
        try {
            await authFetch(`${API_URL}/chat/groups/${group.id}/join`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ group_id: group.id, user_id: myUserId, user_name: myName, user_role: myRole, is_moderator: canMod })
            });
        } catch { /* silent */ }
    };

    // ── Send message
    const sendMessage = async (content) => {
        if (!activeGroup) return;
        try {
            const res = await authFetch(`${API_URL}/chat/messages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ group_id: activeGroup.id, sender_id: myUserId, sender_name: myName, sender_role: myRole, content, message_type: 'text' })
            });
            if (!res.ok) {
                const e = await res.json();
                setError(e.detail || 'خطأ في الإرسال');
                setTimeout(() => setError(''), 4000);
            } else {
                const ws = wsRef.current;
                if (!ws || ws.readyState !== WebSocket.OPEN) fetchMessages(true);
            }
        } catch { setError('خطأ في الشبكة'); setTimeout(() => setError(''), 4000); }
    };

    // ── Send image
    const sendImage = async (file) => {
        const fd = new FormData();
        fd.append('file', file);
        fd.append('sender_role', myRole);
        try {
            const upRes = await authFetch(`${API_URL}/chat/upload-image`, { method: 'POST', body: fd });
            if (!upRes.ok) throw new Error();
            const { url } = await upRes.json();
            await authFetch(`${API_URL}/chat/messages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ group_id: activeGroup.id, sender_id: myUserId, sender_name: myName, sender_role: myRole, image_url: url, message_type: 'image' })
            });
            const ws = wsRef.current;
            if (!ws || ws.readyState !== WebSocket.OPEN) fetchMessages(true);
        } catch { setError('فشل رفع الصورة'); setTimeout(() => setError(''), 4000); }
    };

    // ── Typing via WebSocket
    const updateTyping = (isTyping) => {
        if (!activeGroup) return;
        const ws = wsRef.current;
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'typing', user_id: myUserId, user_name: myName, is_typing: isTyping }));
        } else {
            authFetch(`${API_URL}/chat/typing`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ group_id: activeGroup.id, user_id: myUserId, user_name: myName, is_typing: isTyping })
            }).catch(() => {});
        }
    };

    // ── Sync groups (admin)
    const syncGroups = async () => {
        setSyncing(true);
        try {
            const res = await authFetch(`${API_URL}/chat/sync-groups`, { method: 'POST' });
            if (res.ok) {
                const data = await res.json();
                setError(`✅ ${data.groups_created} مجموعة تم إنشاؤها، ${data.groups_updated} تم تحديثها`);
                setTimeout(() => setError(''), 5000);
                fetchGroups();
            }
        } catch { setError('خطأ في المزامنة'); setTimeout(() => setError(''), 4000); }
        finally { setSyncing(false); }
    };

    const syncCategoryGroups = async () => {
        setSyncing(true);
        try {
            const res = await authFetch(`${API_URL}/chat/sync-category-groups`, { method: 'POST' });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                setError(`❌ HTTP ${res.status}: ${data.detail || 'خطأ في السيرفر'}`);
            } else if (data.success === false) {
                setError(`⚠️ ${data.error || 'لا توجد فئات مهيأة في الإعدادات'}`);
            } else {
                setError(`✅ ${data.groups_created} فئة تم إنشاؤها، ${data.groups_updated} تم تحديثها (${(data.categories || []).join(', ')})`);
            }
            setTimeout(() => setError(''), 8000);
            fetchGroups();
        } catch (e) { setError(`خطأ مزامنة الفئات: ${e.message}`); setTimeout(() => setError(''), 5000); }
        finally { setSyncing(false); }
    };

    // ── Delete message
    const deleteMsg = async (id) => {
        if (!canMod) return;
        await authFetch(`${API_URL}/chat/messages/${id}`, { method: 'DELETE' });
        fetchMessages(true);
    };

    // ── Lock / unlock group
    const toggleGroupLock = async () => {
        if (!isAdmin || !activeGroup) return;
        const newLocked = !activeGroup.is_locked;
        try {
            const res = await authFetch(`${API_URL}/chat/moderation/lock-group`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ group_id: activeGroup.id, is_locked: newLocked }),
            });
            if (!res.ok) throw new Error();
            setActiveGroup(g => ({ ...g, is_locked: newLocked }));
            fetchGroups();
        } catch { setError('خطأ في القفل'); setTimeout(() => setError(''), 4000); }
    };

    // ── Mute member
    const muteMember = async (mute_type, mute_minutes = null) => {
        if (!canMod || !muteTarget || !activeGroup) return;
        try {
            const res = await authFetch(`${API_URL}/chat/moderation/mute`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ group_id: activeGroup.id, target_user_id: muteTarget.user_id, mute_type, mute_minutes }),
            });
            if (!res.ok) throw new Error();
            setError(`✅ ${mute_type === 'none' ? 'تم إلغاء الكتم' : 'تم الكتم'} : ${muteTarget.user_name}`);
            setTimeout(() => setError(''), 3000);
            setMuteTarget(null);
            fetchMembers();
        } catch { setError('خطأ في الكتم'); setTimeout(() => setError(''), 3000); }
    };

    // ── Error banner component
    const errorBanner = error ? (
        <div style={{ margin: '8px 12px', padding: '10px 14px', background: error.startsWith('✅') ? '#f0fdf4' : '#fef2f2', borderRadius: 10, fontSize: 12, fontWeight: 700, color: error.startsWith('✅') ? '#065f46' : '#991b1b', border: `1px solid ${error.startsWith('✅') ? '#bbf7d0' : '#fecaca'}` }}>
            {error}
        </div>
    ) : null;

    // ── Admin header actions (sync buttons)
    const adminHeaderActions = isAdmin ? (
        <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={syncCategoryGroups} disabled={syncing} title="إنشاء مجموعة لكل فئة"
                style={{ display: 'flex', alignItems: 'center', gap: 5, background: syncing ? '#f1f5f9' : 'linear-gradient(135deg, #d946ef, #ec4899)', color: syncing ? '#94a3b8' : '#fff', border: 'none', borderRadius: 12, padding: '8px 12px', fontSize: 10, fontWeight: 900, cursor: syncing ? 'not-allowed' : 'pointer', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <RefreshCw size={12} style={{ animation: syncing ? 'spin 1s linear infinite' : 'none' }} /> Cat
            </button>
            <button onClick={syncGroups} disabled={syncing} title="مزامنة المجموعات حسب الفريق"
                style={{ display: 'flex', alignItems: 'center', gap: 5, background: syncing ? '#f1f5f9' : 'linear-gradient(135deg, #4f46e5, #7c3aed)', color: syncing ? '#94a3b8' : '#fff', border: 'none', borderRadius: 12, padding: '8px 12px', fontSize: 10, fontWeight: 900, cursor: syncing ? 'not-allowed' : 'pointer', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <RefreshCw size={12} style={{ animation: syncing ? 'spin 1s linear infinite' : 'none' }} /> Sq
            </button>
        </div>
    ) : null;

    return (
        <div style={{ display: 'flex', height: 'calc(100vh - 80px)', background: '#f0f2f5', borderRadius: 24, overflow: 'hidden', boxShadow: '0 8px 40px rgba(0,0,0,0.08)' }}>

            {/* LEFT PANEL — Groups List */}
            <ChatGroupList
                groups={groups} activeGroup={activeGroup} onSelect={openGroup}
                lastMsgMap={lastMsgMap} accentColor="#4f46e5"
                title="💬 المجموعات" headerActions={adminHeaderActions}
                emptyHint={isAdmin ? 'اضغط "مزامنة" لإنشاء المجموعات' : undefined}
                errorBanner={errorBanner}
            />

            {/* RIGHT PANEL — Chat area */}
            <div className={`flex-1 flex-col bg-[#efeae2] relative overflow-hidden ${!activeGroup ? 'hidden lg:flex' : 'flex'}`} style={{ backgroundImage: CHAT_BG_PATTERN }}>
                {!activeGroup ? (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, background: '#f0f2f5' }}>
                        <div style={{ width: 120, height: 120, borderRadius: '50%', background: 'linear-gradient(135deg, #4f46e580, #7c3aed80)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 52 }}>💬</div>
                        <div style={{ textAlign: 'center' }}>
                            <h3 style={{ fontSize: 22, fontWeight: 900, color: '#374151', margin: '0 0 8px' }}>اختر مجموعة</h3>
                            <p style={{ fontSize: 14, color: '#6b7280', fontWeight: 500 }}>اضغط على مجموعة من القائمة للبدء</p>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Chat Header */}
                        <div style={{ background: '#fff', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', zIndex: 10 }}>
                            <button onClick={() => setActiveGroup(null)} className="lg:hidden text-slate-500 hover:text-slate-800 p-1 flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors">
                                <ArrowLeft size={22} />
                            </button>
                            <GroupAvatar group={activeGroup} size={44} />
                            <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 900, fontSize: 15, color: '#0f172a' }}>{activeGroup.name}</div>
                                <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 600 }}>
                                    {typing.length > 0
                                        ? <span style={{ color: '#059669', fontStyle: 'italic' }}>✍️ {typing.map(t => t.user_name).join(', ')} يكتب...</span>
                                        : `${members.length} عضو`}
                                </div>
                            </div>
                            {isAdmin && (
                                <button onClick={toggleGroupLock} title={activeGroup.is_locked ? 'فتح القفل' : 'قفل'}
                                    style={{ display: 'flex', alignItems: 'center', gap: 6, background: activeGroup.is_locked ? '#fef2f2' : 'transparent', border: `1px solid ${activeGroup.is_locked ? '#fca5a5' : '#e5e7eb'}`, borderRadius: 10, padding: '6px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 900, color: activeGroup.is_locked ? '#dc2626' : '#6b7280' }}>
                                    {activeGroup.is_locked ? '🔒 مقفل' : '🔓 مفتوح'}
                                </button>
                            )}
                            {canMod && (
                                <button onClick={() => setShowMembers(!showMembers)} title="الأعضاء"
                                    style={{ display: 'flex', alignItems: 'center', gap: 6, background: showMembers ? '#f0f9ff' : 'transparent', border: '1px solid #e5e7eb', borderRadius: 10, padding: '6px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 800, color: showMembers ? '#4f46e5' : '#6b7280' }}>
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
                            {/* Messages */}
                            <ChatMessageList messages={messages} myUserId={myUserId} loading={loading} canDelete={canMod} onDelete={deleteMsg} accentColor="#4f46e5" />

                            {/* Members Sidebar */}
                            {showMembers && (
                                <div style={{ width: 260, background: '#fff', borderLeft: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column' }}>
                                    <div style={{ padding: '14px 16px', borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontWeight: 900, fontSize: 14, color: '#0f172a' }}>👥 الأعضاء ({members.length})</span>
                                        <button onClick={() => setShowMembers(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', display: 'flex' }}><X size={16} /></button>
                                    </div>
                                    <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
                                        {members.map(m => {
                                            const cfg = ROLE_CONFIG[m.user_role] || ROLE_CONFIG.player;
                                            const clickable = canMod && m.user_id !== myUserId && !m.is_moderator;
                                            return (
                                                <div key={m.user_id} onClick={() => clickable && setMuteTarget(m)}
                                                    style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', cursor: clickable ? 'pointer' : 'default', transition: 'background 0.15s' }}
                                                    onMouseEnter={e => { if (clickable) e.currentTarget.style.background = '#f8fafc'; }}
                                                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
                                                    <Avatar name={m.user_name} role={m.user_role} size={36} />
                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                        <div style={{ fontWeight: 800, fontSize: 13, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                            {m.user_name}
                                                            {m.is_moderator && <span style={{ marginLeft: 4, fontSize: 9, background: '#fef3c7', color: '#b45309', padding: '1px 4px', borderRadius: 4, fontWeight: 900 }}>مشرف</span>}
                                                        </div>
                                                        <div style={{ fontSize: 10, fontWeight: 700, color: cfg.color, display: 'flex', alignItems: 'center', gap: 3 }}>{cfg.icon} {cfg.label}</div>
                                                    </div>
                                                    {m.is_muted && <span title="مكتوم" style={{ fontSize: 14 }}>🔇</span>}
                                                    {m.banned  && <span title="محظور" style={{ fontSize: 14 }}>🚫</span>}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Input Bar */}
                        <ChatInputBar
                            onSend={sendMessage}
                            onSendImage={(isAdmin || isCoach) ? sendImage : null}
                            onTyping={updateTyping}
                            accentColor="#4f46e5" accentEnd="#7c3aed"
                        />
                    </>
                )}
            </div>

            <style>{CHAT_STYLES}</style>
            <MuteModal target={muteTarget} onMute={muteMember} onClose={() => setMuteTarget(null)} />
        </div>
    );
}
