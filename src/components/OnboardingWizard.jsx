import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../i18n/LanguageContext';
import { CheckCircle2, Circle, X, Users, UserPlus, CalendarPlus, ArrowRight, ShieldCheck } from 'lucide-react';

const OnboardingWizard = ({ stats }) => {
    const { t, isRTL } = useLanguage();
    const navigate = useNavigate();
    const [isVisible, setIsVisible] = useState(false);
    const [isDismissed, setIsDismissed] = useState(true); // Default to true to prevent flash

    // Define steps based on available stats
    const steps = [
        {
            id: 'coaches',
            title: isRTL ? 'إضافة المدربين' : 'Ajouter des entraîneurs',
            desc: isRTL ? 'أضف الطاقم الفني لأكاديميتك.' : 'Ajoutez le staff technique de votre académie.',
            icon: ShieldCheck,
            path: '/admin/coaches',
            isComplete: (stats?.activeCoaches || 0) > 0,
            color: 'indigo'
        },
        {
            id: 'players',
            title: isRTL ? 'تسجيل اللاعبين' : 'Inscrire des joueurs',
            desc: isRTL ? 'ابدأ في إضافة اللاعبين إلى المنصة.' : 'Commencez à ajouter des joueurs à la plateforme.',
            icon: UserPlus,
            path: '/admin/players',
            isComplete: (stats?.totalPlayers || 0) > 0,
            color: 'blue'
        },
        {
            id: 'events',
            title: isRTL ? 'إنشاء الأحداث' : 'Créer des événements',
            desc: isRTL ? 'خطط للتدريبات أو المباريات القادمة.' : 'Planifiez des entraînements ou des matchs.',
            icon: CalendarPlus,
            path: '/admin/events',
            isComplete: (stats?.upcomingEvents || 0) > 0,
            color: 'emerald'
        }
    ];

    const completedCount = steps.filter(s => s.isComplete).length;
    const progress = Math.round((completedCount / steps.length) * 100);
    const allComplete = completedCount === steps.length;

    useEffect(() => {
        const dismissed = localStorage.getItem('onboarding_dismissed') === 'true';
        setIsDismissed(dismissed);
        
        // Show if not dismissed and NOT all steps are complete
        // We delay visibility slightly to ensure stats are loaded
        if (!dismissed && stats && stats.totalPlayers !== undefined) {
            if (!allComplete) {
                setIsVisible(true);
            } else {
                setIsVisible(false);
            }
        }
    }, [stats, allComplete]);

    const handleDismiss = () => {
        localStorage.setItem('onboarding_dismissed', 'true');
        setIsDismissed(true);
        setIsVisible(false);
    };

    if (!isVisible || isDismissed || !stats) return null;

    return (
        <div className="bg-white rounded-3xl p-6 md:p-8 mb-8 relative overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-indigo-50/50 animate-fade-in" dir={isRTL ? 'rtl' : 'ltr'}>
            {/* Background decorative elements */}
            <div className={`absolute top-0 ${isRTL ? 'left-0' : 'right-0'} w-64 h-64 bg-indigo-50 rounded-full blur-3xl opacity-50 -translate-y-1/2 pointer-events-none`} />
            
            <button 
                onClick={handleDismiss}
                className={`absolute top-4 ${isRTL ? 'left-4' : 'right-4'} text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-full transition-colors z-10`}
                title={isRTL ? 'تخطي' : 'Ignorer'}
            >
                <X size={20} />
            </button>

            <div className="relative z-10 flex flex-col md:flex-row gap-8 items-start">
                <div className="flex-1 w-full">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
                            <span className="text-xl">🚀</span>
                        </div>
                        <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                            {isRTL ? 'مرحباً بك في أكاديميتك!' : 'Bienvenue dans votre académie !'}
                        </h2>
                    </div>
                    
                    <p className="text-slate-500 font-medium mb-6 text-sm leading-relaxed">
                        {isRTL 
                            ? 'لقد قمنا بإعداد هذه الخطوات السريعة لمساعدتك في البدء. أكمل الإعداد لإطلاق منصتك.'
                            : 'Nous avons préparé ces étapes rapides pour vous aider à démarrer. Complétez la configuration pour lancer votre plateforme.'}
                    </p>

                    <div className="mb-2 flex items-center justify-between text-sm font-bold">
                        <span className="text-slate-700">{isRTL ? 'التقدم' : 'Progression'}</span>
                        <span className="text-indigo-600">{progress}%</span>
                    </div>
                    <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                            className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all duration-1000 ease-out"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                </div>

                <div className="flex-[1.5] w-full grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {steps.map((step) => {
                        const Icon = step.icon;
                        const isDone = step.isComplete;
                        return (
                            <div 
                                key={step.id}
                                onClick={() => !isDone && navigate(step.path)}
                                className={`relative p-5 rounded-2xl border-2 transition-all duration-300 ${
                                    isDone 
                                        ? 'bg-slate-50 border-transparent cursor-default' 
                                        : 'bg-white border-indigo-100 hover:border-indigo-300 hover:shadow-lg cursor-pointer hover:-translate-y-1'
                                }`}
                            >
                                <div className="flex justify-between items-start mb-3">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                                        isDone ? 'bg-emerald-100 text-emerald-600' : `bg-${step.color}-100 text-${step.color}-600`
                                    }`}>
                                        <Icon size={20} />
                                    </div>
                                    {isDone ? (
                                        <CheckCircle2 size={24} className="text-emerald-500" />
                                    ) : (
                                        <Circle size={24} className="text-slate-200" />
                                    )}
                                </div>
                                <h3 className={`font-bold mb-1 ${isDone ? 'text-slate-500 line-through decoration-slate-300' : 'text-slate-800'}`}>
                                    {step.title}
                                </h3>
                                <p className={`text-xs ${isDone ? 'text-slate-400' : 'text-slate-500'} leading-relaxed`}>
                                    {step.desc}
                                </p>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default OnboardingWizard;
