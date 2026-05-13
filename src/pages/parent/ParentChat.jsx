import { useState, useEffect, useCallback } from 'react';
import { API_URL } from '../../config';
import { authFetch } from '../../api';
import { ArrowLeft } from 'lucide-react';

// Shared chat components
import { CHAT_BG_PATTERN, CHAT_STYLES } from '../../components/chat/chatConstants';
import { GroupAvatar } from '../../components/chat/ChatAvatars';
import useChatWebSocket from '../../components/chat/useChatWebSocket';
import ChatMessageList from '../../components/chat/ChatMessageList';
import ChatInputBar from '../../components/chat/ChatInputBar';
import ChatGroupList from '../../components/chat/ChatGroupList';

export default function ParentChat() {
    const [isLoading, setIsLoading] = useState(true);
    const { isRTL } = useLanguage();
    const myUserId = localStorage.getItem('impersonating_user_id') || localStorage.getItem('user_id') || '';
    const myRole   = 'parent';
    const myName   = localStorage.getItem('user_name') || 'ولي الأمر';

    const [groups, setGroups]           = useState([]);
    const [activeGroup, setActiveGroup] = useState(null);
    const [error, setError]             = useState('');
    const [lastMsgMap, setLastMsgMap]   = useState({});

    // WebSocket-powered real-time messaging
    const { messages, typing, loading, fetchMessages, wsRef } = useChatWebSocket(activeGroup?.id, myUserId);

    // Track last message per group
    useEffect(() => {
        if (activeGroup && messages.length > 0) {
            setLastMsgMap(prev => ({ ...prev, [activeGroup.id]: messages[messages.length - 1] }));
        }
    }, [messages, activeGroup]);

    // ── Fetch groups (parent sees child's groups)
    const fetchGroups = useCallback(async () => {
        try {
            let uid = myUserId, role = 'player';
            const r = await authFetch(`${API_URL}/players/`);
            if (r.ok) {
                const all = await r.json();
                const child = all.find(p => p.user_id === myUserId || p.parent_id === myUserId) || all[0];
                if (child) { uid = child.user_id; }
            }
            const res = await authFetch(`${API_URL}/chat/groups?user_id=${uid}&role=${role}`);
            if (res.ok) setGroups(await res.json());
        } catch { /* silent */ }
    }, [myUserId]);

    useEffect(() => { fetchGroups(); }, [fetchGroups]);

    // ── Join group
    const openGroup = async (group) => {
        setActiveGroup(group);
        try {
            await authFetch(`${API_URL}/chat/groups/${group.id}/join`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ group_id: group.id, user_id: myUserId, user_name: myName, user_role: myRole, is_moderator: false })
            });
        } catch { /* silent */ }
    };

    // ── Send message (text only)
    const sendMessage = async (content) => {
        if (!activeGroup) return;
        try {
            const res = await authFetch(`${API_URL}/chat/messages`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
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

    return (
        <div style={{ display: 'flex', height: 'calc(100vh - 80px)', background: '#f0f2f5', borderRadius: 24, overflow: 'hidden', boxShadow: '0 8px 40px rgba(0,0,0,0.08)' }}>

            <ChatGroupList
                groups={groups} activeGroup={activeGroup} onSelect={openGroup}
                lastMsgMap={lastMsgMap} accentColor="#0ea5e9"
                title="👨‍👦 المجموعات" subtitle="مجموعات ابنك"
                emptyHint="مجموعات ابنك ستظهر هنا"
            />

            <div className={`flex-1 flex-col bg-[#efeae2] relative overflow-hidden ${!activeGroup ? 'hidden lg:flex' : 'flex'}`} style={{ backgroundImage: CHAT_BG_PATTERN }}>
                {!activeGroup ? (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, background: '#f0f2f5' }}>
                        <div style={{ width: 120, height: 120, borderRadius: '50%', background: 'linear-gradient(135deg, #0ea5e980, #38bdf880)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 52 }}>👨‍👦</div>
                        <div style={{ textAlign: 'center' }}>
                            <h3 style={{ fontSize: 22, fontWeight: 900, color: '#374151', margin: '0 0 8px' }}>المحادثات</h3>
                            <p style={{ fontSize: 14, color: '#6b7280', fontWeight: 500 }}>تابع محادثات مجموعة ابنك</p>
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
                                        ? <span style={{ color: '#0ea5e9', fontStyle: 'italic' }}>✍️ {typing.map(t => t.user_name).join(', ')} يكتب...</span>
                                        : activeGroup.category || 'مجموعة'}
                                </div>
                            </div>
                        </div>

                        {error && (
                            <div style={{ backgroundColor: '#fef2f2', padding: '8px 16px', textAlign: 'center', fontSize: 13, fontWeight: 700, color: '#991b1b', borderBottom: '1px solid #e5e7eb' }}>
                                {error}
                            </div>
                        )}

                        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
                            <ChatMessageList messages={messages} myUserId={myUserId} loading={loading} canDelete={false} accentColor="#0ea5e9" />
                        </div>

                        <ChatInputBar
                            onSend={sendMessage}
                            onSendImage={null}
                            onTyping={updateTyping}
                            accentColor="#0ea5e9" accentEnd="#38bdf8"
                        />
                    </>
                )}
            </div>

            <style>{CHAT_STYLES}</style>
        </div>
    );
}
