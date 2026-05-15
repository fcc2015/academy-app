import { useState } from 'react';
import { Search } from 'lucide-react';
import { getCatStyle, fmtTime } from './chatConstants';
import { GroupAvatar } from './ChatAvatars';

export default function ChatGroupList({
    groups, activeGroup, onSelect, lastMsgMap = {},
    accentColor = '#4f46e5', title = '💬 المجموعات', subtitle,
    headerActions, emptyHint, errorBanner
}) {
    const [search, setSearch] = useState('');
    const filteredGroups = (groups || []).filter(g =>
        g.name?.toLowerCase().includes(search.toLowerCase()) ||
        g.category?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className={`w-full lg:w-[340px] lg:min-w-[280px] bg-white border-r border-slate-200 flex-col transition-all duration-300 ${activeGroup ? 'hidden lg:flex' : 'flex'}`}>
            <div style={{ padding: '20px 16px 12px', borderBottom: '1px solid #f3f4f6' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <div>
                        <h2 style={{ fontSize: 20, fontWeight: 900, color: '#0f172a', margin: 0 }}>{title}</h2>
                        <p style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>
                            {subtitle || `${groups.length} مجموعة`}
                        </p>
                    </div>
                    {headerActions}
                </div>
                <div style={{ position: 'relative' }}>
                    <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث عن مجموعة..."
                        style={{ width: '100%', padding: '10px 12px 10px 36px', background: '#f8fafc', border: '1px solid #e5e7eb', borderRadius: 12, fontSize: 13, fontWeight: 600, outline: 'none', boxSizing: 'border-box', color: '#0f172a' }} />
                </div>
            </div>
            {errorBanner}
            <div style={{ flex: 1, overflowY: 'auto' }}>
                {filteredGroups.length === 0 ? (
                    <div style={{ padding: 32, textAlign: 'center', color: '#94a3b8' }}>
                        <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
                        <p style={{ fontWeight: 700, fontSize: 14 }}>لا توجد مجموعات</p>
                        {emptyHint && <p style={{ fontSize: 12 }}>{emptyHint}</p>}
                    </div>
                ) : filteredGroups.map(g => {
                    const catStyle = getCatStyle(g.category);
                    const lastMsg = lastMsgMap[g.id];
                    const isActive = activeGroup?.id === g.id;
                    return (
                        <div key={g.id} onClick={() => onSelect(g)}
                            style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', cursor: 'pointer', transition: 'background 0.15s',
                                background: isActive ? `${accentColor}10` : 'transparent', borderBottom: '1px solid #f8fafc',
                                borderLeft: isActive ? `4px solid ${accentColor}` : '4px solid transparent' }}
                            onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = '#f8fafc'; }}
                            onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = isActive ? `${accentColor}10` : 'transparent'; }}>
                            <GroupAvatar group={g} size={50} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                                    <span style={{ fontWeight: 800, fontSize: 14, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 160 }}>{g.name}</span>
                                    {lastMsg && <span style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600, flexShrink: 0 }}>{fmtTime(lastMsg.created_at)}</span>}
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: 12, color: '#6b7280', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 180 }}>
                                        {lastMsg ? (lastMsg.message_type === 'image' ? '📷 صورة' : `${lastMsg.sender_name}: ${lastMsg.content || ''}`) : g.description || 'لا توجد رسائل'}
                                    </span>
                                    {g.category && (
                                        <span style={{ fontSize: 9, fontWeight: 900, padding: '2px 6px', borderRadius: 6, background: catStyle.bg, color: catStyle.text, border: `1px solid ${catStyle.border}`, textTransform: 'uppercase', letterSpacing: '0.05em', flexShrink: 0 }}>{g.category}</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
