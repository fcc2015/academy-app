import { useState, useEffect, useRef, useCallback } from 'react';
import { WS_URL } from './chatConstants';
import { API_URL } from '../../config';
import { authFetch } from '../../api';

/**
 * Custom hook for real-time chat via WebSocket with HTTP polling fallback.
 *
 * @param {string|null} groupId   — active group ID (null = idle)
 * @param {string}      myUserId — current user's ID
 * @returns {{ messages, setMessages, members, typing, loading, fetchMessages, fetchMembers, wsRef }}
 */
export default function useChatWebSocket(groupId, myUserId) {
    const [messages, setMessages] = useState([]);
    const [members, setMembers]   = useState([]);
    const [typing, setTyping]     = useState([]);
    const [loading, setLoading]   = useState(false);

    const wsRef   = useRef(null);
    const pollRef = useRef(null);

    // ── Fetch messages via HTTP ─────────────────────
    const fetchMessages = useCallback(async (silent = false) => {
        if (!groupId) return;
        if (!silent) setLoading(true);
        try {
            const res = await authFetch(`${API_URL}/chat/groups/${groupId}/messages?limit=100`);
            if (res.ok) {
                const data = await res.json();
                setMessages(data);
            }
        } catch { /* silent */ }
        finally { if (!silent) setLoading(false); }
    }, [groupId]);

    // ── Fetch members via HTTP ──────────────────────
    const fetchMembers = useCallback(async () => {
        if (!groupId) return;
        try {
            const res = await authFetch(`${API_URL}/chat/groups/${groupId}/members`);
            if (res.ok) setMembers(await res.json());
        } catch { /* silent */ }
    }, [groupId]);

    // ── Fetch typing via HTTP (fallback) ────────────
    const fetchTyping = useCallback(async () => {
        if (!groupId) return;
        try {
            const res = await authFetch(`${API_URL}/chat/groups/${groupId}/typing?exclude_user=${myUserId}`);
            if (res.ok) setTyping(await res.json());
        } catch { /* silent */ }
    }, [groupId, myUserId]);

    // ── WebSocket lifecycle ─────────────────────────
    useEffect(() => {
        if (!groupId) {
            setMessages([]);
            setMembers([]);
            setTyping([]);
            return;
        }

        fetchMessages();
        fetchMembers();

        // Connect WebSocket
        const token = localStorage.getItem('token') || '';
        const wsUrl = new URL(`${WS_URL}/chat/ws/${groupId}`);
        if (token) wsUrl.searchParams.append('token', token);
        const ws = new WebSocket(wsUrl.toString());
        wsRef.current = ws;

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.type === 'message') {
                    const msg = data.message;
                    setMessages(prev => {
                        if (prev.find(m => m.id === msg.id)) return prev;
                        return [...prev, msg];
                    });
                } else if (data.type === 'typing') {
                    if (data.user_id === myUserId) return;
                    setTyping(prev => {
                        const without = prev.filter(t => t.user_id !== data.user_id);
                        return data.is_typing
                            ? [...without, { user_id: data.user_id, user_name: data.user_name }]
                            : without;
                    });
                    // Auto-clear stale typing after 6s
                    if (data.is_typing) {
                        setTimeout(() => {
                            setTyping(prev => prev.filter(t => t.user_id !== data.user_id));
                        }, 6000);
                    }
                }
            } catch { /* ignore malformed frames */ }
        };

        // Fallback: poll when WS drops unexpectedly
        ws.onclose = (e) => {
            if (wsRef.current === ws) wsRef.current = null;
            if (e.code !== 1000) {
                clearInterval(pollRef.current);
                pollRef.current = setInterval(() => {
                    fetchMessages(true);
                    fetchTyping();
                }, 2500);
            }
        };

        return () => {
            clearInterval(pollRef.current);
            ws.close(1000);
            if (wsRef.current === ws) wsRef.current = null;
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [groupId]);

    return { messages, setMessages, members, setMembers, typing, loading, fetchMessages, fetchMembers, wsRef };
}
