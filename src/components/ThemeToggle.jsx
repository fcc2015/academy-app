import { Moon, Sun } from 'lucide-react';
import { useTheme } from './ThemeContext';

export default function ThemeToggle() {
    const { isDark, toggleTheme } = useTheme();

    return (
        <button
            onClick={toggleTheme}
            className="relative flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-300 hover:scale-105"
            style={{
                background: isDark
                    ? 'linear-gradient(135deg, #1e1b4b, #312e81)'
                    : 'linear-gradient(135deg, #fef3c7, #fde68a)',
                border: isDark
                    ? '1.5px solid rgba(99,102,241,0.3)'
                    : '1.5px solid rgba(245,158,11,0.3)',
                boxShadow: isDark
                    ? '0 4px 12px rgba(99,102,241,0.2)'
                    : '0 4px 12px rgba(245,158,11,0.2)',
            }}
            title={isDark ? 'Mode clair' : 'Mode sombre'}
        >
            {isDark ? (
                <Moon size={16} style={{ color: '#a5b4fc' }} />
            ) : (
                <Sun size={16} style={{ color: '#d97706' }} />
            )}
        </button>
    );
}
