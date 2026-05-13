import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Eye, User } from 'lucide-react';

const readState = () => ({
    academyId:   localStorage.getItem('impersonating_academy_id'),
    academyName: localStorage.getItem('impersonating_academy_name'),
    userId:      localStorage.getItem('impersonating_user_id'),
    userName:    localStorage.getItem('impersonating_user_name'),
    userRole:    localStorage.getItem('impersonating_user_role'),
});

export default function ImpersonationBanner() {
    const navigate = useNavigate();
    const [state, setState] = useState(readState);

    useEffect(() => {
        const check = () => setState(readState());
        window.addEventListener('storage', check);
        const id = setInterval(check, 1000);
        return () => { window.removeEventListener('storage', check); clearInterval(id); };
    }, []);

    const { academyId, academyName, userId, userName, userRole } = state;
    if (!academyId && !userId) return null;

    const exitUser = () => {
        localStorage.removeItem('impersonating_user_id');
        localStorage.removeItem('impersonating_user_name');
        localStorage.removeItem('impersonating_user_role');
        setState(readState());
        // Go back to the correct admin page based on real role
        const realRole = localStorage.getItem('role');
        const isAcademyImpersonated = !!localStorage.getItem('impersonating_academy_id');
        
        if (realRole === 'super_admin' && !isAcademyImpersonated) {
            window.location.href = '/saas/dashboard';
        } else {
            window.location.href = '/admin/players';
        }
    };

    const exitAcademy = () => {
        localStorage.removeItem('impersonating_academy_id');
        localStorage.removeItem('impersonating_academy_name');
        localStorage.removeItem('impersonating_user_id');
        localStorage.removeItem('impersonating_user_name');
        localStorage.removeItem('impersonating_user_role');
        setState(readState());
        navigate('/saas/academies');
    };

    // User-level impersonation banner (admin viewing as parent/player/coach)
    if (userId) {
        const roleColors = {
            parent: 'bg-emerald-600 border-emerald-800',
            player: 'bg-blue-600 border-blue-800',
            coach:  'bg-fuchsia-600 border-fuchsia-800',
        };
        const cls = roleColors[(userRole || '').toLowerCase()] || 'bg-indigo-600 border-indigo-800';
        return (
            <div className={`fixed top-0 left-0 right-0 z-[9999] text-white shadow-lg border-b-2 ${cls}`}>
                <div className="flex items-center justify-between gap-3 px-4 py-2 max-w-[2000px] mx-auto">
                    <div className="flex items-center gap-2 text-sm font-semibold min-w-0">
                        <User className="w-4 h-4 shrink-0" />
                        <span className="truncate">
                            Viewing as <strong className="font-black uppercase">{userRole}</strong>: <strong className="font-black">{userName}</strong>
                            {academyName && <span className="opacity-70 ml-1">— {academyName}</span>}
                        </span>
                    </div>
                    <button
                        onClick={exitUser}
                        className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/20 hover:bg-white/30 text-xs font-bold transition-colors shrink-0"
                    >
                        <LogOut className="w-3.5 h-3.5" />
                        Exit
                    </button>
                </div>
            </div>
        );
    }

    // Academy-level impersonation banner (super_admin viewing as academy admin)
    return (
        <div className="fixed top-0 left-0 right-0 z-[9999] bg-amber-500 text-white shadow-lg border-b-2 border-amber-700">
            <div className="flex items-center justify-between gap-3 px-4 py-2 max-w-[2000px] mx-auto">
                <div className="flex items-center gap-2 text-sm font-semibold min-w-0">
                    <Eye className="w-4 h-4 shrink-0" />
                    <span className="truncate">
                        Viewing as admin of <strong className="font-black">{academyName || academyId}</strong>
                    </span>
                </div>
                <button
                    onClick={exitAcademy}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/20 hover:bg-white/30 text-xs font-bold transition-colors shrink-0"
                >
                    <LogOut className="w-3.5 h-3.5" />
                    Exit Impersonation
                </button>
            </div>
        </div>
    );
}
