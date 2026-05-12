import { ROLE_CONFIG, getCatStyle } from './chatConstants';

export const Avatar = ({ name = '?', role, size = 40 }) => {
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

export const GroupAvatar = ({ group, size = 48 }) => {
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
