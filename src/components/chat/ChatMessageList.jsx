import { useEffect, useRef } from 'react';
import { Loader2, X, CheckCheck } from 'lucide-react';
import { ROLE_CONFIG, fmtTime, fmtDate } from './chatConstants';
import { Avatar } from './ChatAvatars';

/**
 * Chat message list with date dividers, bubbles, and auto-scroll.
 *
 * @param {Array}    messages   — array of message objects
 * @param {string}   myUserId  — current user ID
 * @param {boolean}  loading   — show spinner
 * @param {boolean}  canDelete — show delete buttons
 * @param {function} onDelete  — callback(messageId)
 * @param {string}   accentColor — loading spinner color
 */
export default function ChatMessageList({ messages, myUserId, loading, canDelete = false, onDelete, accentColor = '#4f46e5' }) {
    const endRef = useRef(null);

    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Group messages by date
    const groupedMessages = messages.reduce((acc, msg) => {
        const day = fmtDate(msg.created_at);
        if (!acc[day]) acc[day] = [];
        acc[day].push(msg);
        return acc;
    }, {});

    return (
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 2 }}>
            {loading ? (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: accentColor }} />
                </div>
            ) : messages.length === 0 ? (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8 }}>
                    <div style={{ fontSize: 48 }}>👋</div>
                    <p style={{ fontWeight: 700, fontSize: 14, color: '#6b7280' }}>لا توجد رسائل. ابدأ المحادثة!</p>
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
                                            {canDelete && (
                                                <button
                                                    onClick={() => onDelete?.(msg.id)}
                                                    title="حذف"
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
    );
}
