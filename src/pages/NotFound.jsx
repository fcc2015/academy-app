import { useNavigate } from 'react-router-dom';
import { Home, ArrowLeft, Search } from 'lucide-react';

export default function NotFound() {
    const navigate = useNavigate();

    return (
        <div
            className="min-h-screen flex items-center justify-center relative overflow-hidden"
            style={{ background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)' }}
        >
            {/* Ambient glows */}
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-red-600 opacity-10 blur-[120px] rounded-full pointer-events-none" />
            <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-indigo-600 opacity-10 blur-[100px] rounded-full pointer-events-none" />

            <div className="relative text-center px-6 animate-fade-in-scale">
                {/* 404 Number */}
                <div className="mb-6">
                    <h1
                        className="text-[140px] sm:text-[180px] font-black leading-none select-none"
                        style={{
                            background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #ec4899 100%)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            textShadow: 'none',
                            filter: 'drop-shadow(0 4px 30px rgba(124,58,237,0.3))'
                        }}
                    >
                        404
                    </h1>
                </div>

                {/* Message */}
                <h2 className="text-2xl sm:text-3xl font-black text-white mb-3 tracking-tight">
                    Page introuvable
                </h2>
                <p className="text-indigo-300/70 text-sm sm:text-base font-medium mb-10 max-w-md mx-auto">
                    La page que vous recherchez n'existe pas ou a été déplacée.
                </p>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
                    <button
                        onClick={() => navigate(-1)}
                        className="flex items-center gap-2 px-6 py-3.5 rounded-xl font-bold text-sm transition-all duration-200"
                        style={{
                            background: 'rgba(255,255,255,0.06)',
                            border: '1.5px solid rgba(255,255,255,0.12)',
                            color: 'rgba(255,255,255,0.85)',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
                    >
                        <ArrowLeft size={16} />
                        Retour
                    </button>

                    <button
                        onClick={() => navigate('/')}
                        className="flex items-center gap-2 px-6 py-3.5 rounded-xl font-black text-sm text-white transition-all duration-200"
                        style={{
                            background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                            boxShadow: '0 8px 32px rgba(79,70,229,0.4)',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; }}
                        onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; }}
                    >
                        <Home size={16} />
                        Accueil
                    </button>
                </div>

                {/* Footer badge */}
                <div className="mt-12 flex items-center justify-center gap-2">
                    <div className="h-px flex-1 max-w-[100px]" style={{ background: 'rgba(255,255,255,0.06)' }} />
                    <span className="text-[10px] font-black uppercase tracking-widest text-white/20">
                        Academy SaaS
                    </span>
                    <div className="h-px flex-1 max-w-[100px]" style={{ background: 'rgba(255,255,255,0.06)' }} />
                </div>
            </div>
        </div>
    );
}
