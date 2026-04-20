import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Eye } from 'lucide-react';

export default function ImpersonationBanner() {
    const navigate = useNavigate();
    const [academyId, setAcademyId] = useState(() => localStorage.getItem('impersonating_academy_id'));
    const [academyName, setAcademyName] = useState(() => localStorage.getItem('impersonating_academy_name'));

    useEffect(() => {
        const check = () => {
            setAcademyId(localStorage.getItem('impersonating_academy_id'));
            setAcademyName(localStorage.getItem('impersonating_academy_name'));
        };
        window.addEventListener('storage', check);
        const id = setInterval(check, 1000);
        return () => { window.removeEventListener('storage', check); clearInterval(id); };
    }, []);

    if (!academyId) return null;

    const exit = () => {
        localStorage.removeItem('impersonating_academy_id');
        localStorage.removeItem('impersonating_academy_name');
        setAcademyId(null);
        setAcademyName(null);
        navigate('/saas/academies');
    };

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
                    onClick={exit}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/20 hover:bg-white/30 text-xs font-bold transition-colors shrink-0"
                >
                    <LogOut className="w-3.5 h-3.5" />
                    Exit Impersonation
                </button>
            </div>
        </div>
    );
}
