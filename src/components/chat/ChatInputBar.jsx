import { useState, useRef } from 'react';
import { Send, Image, Loader2 } from 'lucide-react';

export default function ChatInputBar({ onSend, onSendImage, onTyping, accentColor = '#4f46e5', accentEnd = '#7c3aed', disabled = false }) {
    const [inputMsg, setInputMsg]     = useState('');
    const [sendingImg, setSendingImg] = useState(false);
    const typingTimer = useRef(null);
    const fileRef     = useRef(null);

    const handleSend = () => {
        if (!inputMsg.trim()) return;
        onSend(inputMsg.trim());
        setInputMsg('');
        clearTimeout(typingTimer.current);
        onTyping?.(false);
    };

    const handleInput = (e) => {
        setInputMsg(e.target.value);
        onTyping?.(true);
        clearTimeout(typingTimer.current);
        typingTimer.current = setTimeout(() => onTyping?.(false), 3000);
    };

    const handleImage = async (file) => {
        if (!onSendImage || !file) return;
        setSendingImg(true);
        try { await onSendImage(file); } finally { setSendingImg(false); }
    };

    const canSend = inputMsg.trim() && !disabled;

    return (
        <div style={{ background: '#f0f2f5', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
            {onSendImage && (
                <>
                    <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { if (e.target.files[0]) handleImage(e.target.files[0]); e.target.value = ''; }} />
                    <button onClick={() => fileRef.current?.click()} disabled={sendingImg || disabled} title="إرسال صورة"
                        style={{ width: 42, height: 42, borderRadius: '50%', background: '#fff', border: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: disabled ? 'not-allowed' : 'pointer', color: '#6b7280', flexShrink: 0 }}>
                        {sendingImg ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <Image size={18} />}
                    </button>
                </>
            )}
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', background: '#fff', borderRadius: 24, padding: '0 16px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid #e5e7eb' }}>
                <input value={inputMsg} onChange={handleInput} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                    placeholder="اكتب رسالة..." disabled={disabled}
                    style={{ flex: 1, border: 'none', outline: 'none', fontSize: 14, padding: '12px 0', background: 'transparent', color: '#0f172a', fontWeight: 500 }} />
            </div>
            <button onClick={handleSend} disabled={!canSend}
                style={{ width: 44, height: 44, borderRadius: '50%', border: 'none', cursor: canSend ? 'pointer' : 'default',
                    background: canSend ? `linear-gradient(135deg, ${accentColor}, ${accentEnd})` : '#e5e7eb',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    transition: 'all 0.2s', boxShadow: canSend ? `0 4px 14px ${accentColor}66` : 'none' }}>
                <Send size={18} style={{ color: canSend ? '#fff' : '#94a3b8' }} />
            </button>
        </div>
    );
}
