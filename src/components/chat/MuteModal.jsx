import { Avatar } from './ChatAvatars';

/**
 * Mute member modal — used by Admin + Coach.
 * @param {Object}   target    — member object { user_id, user_name, user_role, is_muted }
 * @param {function} onMute    — callback(mute_type, mute_minutes?)
 * @param {function} onClose   — close modal
 */
export default function MuteModal({ target, onMute, onClose }) {
    if (!target) return null;

    return (
        <div onClick={onClose}
            style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
            <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 24, padding: 28, width: '100%', maxWidth: 380, boxShadow: '0 30px 80px rgba(0,0,0,0.3)' }} dir="rtl">
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                    <Avatar name={target.user_name} role={target.user_role} size={48} />
                    <div>
                        <div style={{ fontWeight: 900, fontSize: 16, color: '#0f172a' }}>{target.user_name}</div>
                        <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700 }}>
                            {target.is_muted ? '🔇 محظور حالياً' : 'حظر / كتم'}
                        </div>
                    </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {target.is_muted ? (
                        <button onClick={() => onMute('none')}
                            style={{ padding: '14px', borderRadius: 14, border: 'none', background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', fontWeight: 900, fontSize: 13, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            ✅ إلغاء الحظر
                        </button>
                    ) : (
                        <>
                            <button onClick={() => onMute('temporary', 60)}
                                style={{ padding: '12px', borderRadius: 12, border: '1px solid #fcd34d', background: '#fef3c7', color: '#92400e', fontWeight: 900, fontSize: 13, cursor: 'pointer', textAlign: 'right' }}>
                                ⏱️ كتم 1 ساعة
                            </button>
                            <button onClick={() => onMute('temporary', 60 * 24)}
                                style={{ padding: '12px', borderRadius: 12, border: '1px solid #fcd34d', background: '#fef3c7', color: '#92400e', fontWeight: 900, fontSize: 13, cursor: 'pointer', textAlign: 'right' }}>
                                🌙 كتم 24 ساعة
                            </button>
                            <button onClick={() => onMute('temporary', 60 * 24 * 7)}
                                style={{ padding: '12px', borderRadius: 12, border: '1px solid #fcd34d', background: '#fef3c7', color: '#92400e', fontWeight: 900, fontSize: 13, cursor: 'pointer', textAlign: 'right' }}>
                                📅 كتم أسبوع
                            </button>
                            <button onClick={() => onMute('permanent')}
                                style={{ padding: '12px', borderRadius: 12, border: '1px solid #fca5a5', background: '#fee2e2', color: '#991b1b', fontWeight: 900, fontSize: 13, cursor: 'pointer', textAlign: 'right' }}>
                                🚫 كتم نهائي
                            </button>
                        </>
                    )}
                    <button onClick={onClose}
                        style={{ marginTop: 8, padding: '10px', borderRadius: 12, border: 'none', background: '#f1f5f9', color: '#475569', fontWeight: 800, fontSize: 12, cursor: 'pointer' }}>
                        إلغاء
                    </button>
                </div>
            </div>
        </div>
    );
}
