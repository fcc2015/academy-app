import React from 'react';
import { Star, TrendingUp, Lightbulb, Award, Shield, CalendarCheck, Heart, AlertTriangle, Utensils, Droplets, Zap, Flame } from 'lucide-react';
import FUTCard from '../../../components/FUTCard';

export default function ParentPerformanceSection({
    child = {},
    activeTab,
    evaluations = [],
    levelBars = [],
    tips = [],
    injuries = [],
    isRTL,
    t
}) {
    if (child?.account_status === 'Suspended') {
        return (
            <div className="bg-red-50 border-2 border-red-200 rounded-[2.5rem] p-12 text-center animate-slide-up">
                <AlertTriangle size={48} className="mx-auto text-red-400 mb-4" />
                <p className="text-lg font-black text-red-700">
                    {isRTL ? '⛔ الحساب موقوف — التقييمات غير متاحة' : '⛔ Account suspended - evaluations hidden'}
                </p>
                <p className="text-sm text-red-500 mt-2">
                    {isRTL ? 'يرجى تسوية المستحقات المالية.' : 'Please settle outstanding payments.'}
                </p>
            </div>
        );
    }

    const latestEval = evaluations[0] || null;

    return (
        <div className="animate-slide-up space-y-6">
            {/* ═══ BADGE TAB ═══ */}
            {activeTab === 'badge' && (
                <div className="flex flex-col items-center gap-8">
                    <div className={`text-center ${isRTL ? 'text-right' : 'text-left'} w-full`}>
                        <h3 className="text-2xl font-black text-slate-800">
                            {isRTL ? 'بطاقة اللاعب الرسمية' : 'Official Player Card'}
                        </h3>
                        <p className="text-slate-500 text-sm">
                            {isRTL ? 'بطاقتك FUT الشخصية' : 'Your personal FUT-style card'}
                        </p>
                    </div>
                    <FUTCard player={child} evaluation={latestEval} />
                </div>
            )}

            {/* ═══ LEVEL TAB ═══ */}
            {activeTab === 'level' && (
                <div className={`bg-white rounded-[2.5rem] border border-slate-200 premium-shadow overflow-hidden ${isRTL ? 'text-right' : 'text-left'}`}>
                    <div className={`px-10 py-8 border-b border-slate-100 flex items-center gap-6 bg-amber-50/50 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <div className="p-4 bg-amber-100 text-amber-600 rounded-[1.5rem] shadow-sm">
                            <TrendingUp size={28} />
                        </div>
                        <div>
                            <h3 className="text-2xl font-black text-slate-800">
                                {isRTL ? 'مستوى اللاعب' : 'Player Level'}
                            </h3>
                            <p className="text-sm font-bold text-slate-500">
                                {isRTL ? 'تحليل شامل للمهارات' : 'Full skills breakdown'}
                            </p>
                        </div>
                    </div>
                    <div className="p-10">
                        {levelBars.length === 0 ? (
                            <div className="text-center py-16 text-slate-400">
                                <TrendingUp size={48} className="mx-auto mb-4 opacity-20" />
                                <p className="font-black uppercase tracking-widest">{isRTL ? 'لا يوجد تقييم بعد' : 'No evaluation yet'}</p>
                                <p className="text-sm mt-2">
                                    {isRTL ? 'سيظهر المستوى بعد أول تقييم من المدرب' : 'Level will appear after the first coach evaluation'}
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-7">
                                {levelBars.map((bar, i) => {
                                    const pct = Math.min((bar.value / 10) * 100, 100);
                                    return (
                                        <div key={i}>
                                            <div className={`flex items-center justify-between mb-2.5 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                                <span className="text-sm font-black text-slate-700 uppercase tracking-widest">{bar.label}</span>
                                                <div className="flex items-center gap-1">
                                                    <span className="text-xl font-black text-slate-800">{Number(bar.value).toFixed(1)}</span>
                                                    <span className="text-xs text-slate-400 font-bold">/10</span>
                                                </div>
                                            </div>
                                            <div className="w-full bg-slate-100 rounded-full h-5 overflow-hidden">
                                                <div
                                                    className={`bg-gradient-to-r ${bar.gradient} h-full rounded-full transition-all duration-[1.5s] ease-out flex items-center justify-end pr-2`}
                                                    style={{ width: `${pct}%` }}
                                                >
                                                    {pct > 15 && <span className="text-[10px] font-black text-white">{Math.round(pct)}%</span>}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ═══ COACH TIPS TAB ═══ */}
            {activeTab === 'tips' && (
                <div className={`bg-white rounded-[2.5rem] border border-slate-200 premium-shadow overflow-hidden ${isRTL ? 'text-right' : 'text-left'}`}>
                    <div className={`px-10 py-8 border-b border-slate-100 flex items-center gap-6 bg-lime-50/50 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <div className="p-4 bg-lime-100 text-lime-600 rounded-[1.5rem] shadow-sm">
                            <Lightbulb size={28} />
                        </div>
                        <div>
                            <h3 className="text-2xl font-black text-slate-800">
                                {isRTL ? 'نصائح وتوجيهات' : 'Tips & Recommendations'}
                            </h3>
                            <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">
                                {isRTL ? 'نصائح مخصصة لتطوير مستواك' : 'Personalised tips for improvement'}
                            </p>
                        </div>
                    </div>
                    <div className="p-10 space-y-6">
                        {tips.map((tip, i) => {
                            const TipIcon = tip.icon || Lightbulb;
                            return (
                                <div key={i} className={`p-6 rounded-[2rem] border border-slate-100 flex gap-4 hover:shadow-md transition-shadow ${
                                    isRTL ? 'flex-row-reverse' : ''
                                }`}>
                                    <div className={`p-4.5 rounded-2xl shrink-0 mt-0.5 ${
                                        tip.color === 'blue' ? 'bg-blue-50 text-blue-500' :
                                        tip.color === 'purple' ? 'bg-purple-50 text-purple-500' :
                                        tip.color === 'green' ? 'bg-green-50 text-green-500' :
                                        tip.color === 'amber' ? 'bg-amber-50 text-amber-500' :
                                        tip.color === 'rose' ? 'bg-rose-50 text-rose-500' :
                                        tip.color === 'emerald' ? 'bg-emerald-50 text-emerald-500' :
                                        'bg-lime-50 text-lime-500'
                                    }`}>
                                        <TipIcon size={22} />
                                    </div>
                                    <div>
                                        <p className="text-[16px] font-bold text-slate-700 leading-relaxed">
                                            {isRTL ? tip.ar : tip.en}
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ═══ TECHNICAL EVALUATIONS LIST TAB ═══ */}
            {activeTab === 'performance' && (
                <div className={`bg-white rounded-[2.5rem] border border-slate-200 premium-shadow overflow-hidden ${isRTL ? 'text-right' : 'text-left'}`}>
                    <div className={`px-10 py-8 border-b border-slate-100 flex items-center gap-6 bg-amber-50/50 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <div className="p-4 bg-amber-100 text-amber-600 rounded-[1.5rem] shadow-sm">
                            <Star size={28} />
                        </div>
                        <div>
                            <h3 className="text-2xl font-black text-slate-800 tracking-tight">
                                {isRTL ? 'التقييمات التقنية' : 'Technical Evaluations'}
                            </h3>
                            <p className="text-sm font-bold text-slate-500">
                                {isRTL ? 'آخر تقييمات المدرب وتوصياته' : 'Latest coach evaluations and feedback'}
                            </p>
                        </div>
                    </div>
                    <div className="p-8 sm:p-10">
                        {evaluations.length === 0 ? (
                            <div className="text-center py-20 bg-slate-50 rounded-[2.5rem] border-2 border-dashed border-slate-100">
                                <Star className="mx-auto text-slate-200 mb-6" size={48} />
                                <p className="text-lg font-black text-slate-400 uppercase tracking-widest">
                                    {isRTL ? 'لم يتم تسجيل أي تقييم بعد.' : 'No evaluations recorded yet.'}
                                </p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {evaluations.slice(0, 8).map((ev, i) => (
                                    <div key={i} className="bg-white border border-slate-100 rounded-[2rem] p-6 shadow-sm hover:border-amber-200 hover:shadow-xl transition-all duration-300">
                                        <div className={`flex items-center justify-between mb-5 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                            <div className="flex items-center gap-2">
                                                <Star size={14} className="text-amber-400" />
                                                <p className="text-[11px] font-black uppercase tracking-widest text-slate-400" dir="ltr">
                                                    {ev.evaluation_date ? new Date(ev.evaluation_date).toLocaleDateString() : 'N/A'}
                                                </p>
                                            </div>
                                            <span className="flex items-center gap-1.5 text-amber-500 font-black text-lg bg-amber-50 px-3 py-1 rounded-xl">
                                                <Star size={16} fill="currentColor" /> {ev.overall_rating?.toFixed(1)}
                                                <span className="text-slate-400 font-bold text-xs">/10</span>
                                            </span>
                                        </div>
                                        <div className="w-full bg-slate-100 rounded-full h-3 mb-5 overflow-hidden">
                                            <div 
                                                className="bg-gradient-to-r from-amber-400 to-orange-500 h-full rounded-full transition-all duration-[1s]" 
                                                style={{width: `${(ev.overall_rating / 10) * 100}%`}}
                                            ></div>
                                        </div>
                                        <div className="p-4 bg-slate-50 rounded-2xl">
                                            <p className="text-sm font-bold text-slate-600 italic leading-relaxed">
                                                {ev.notes ? `"${ev.notes}"` : (isRTL ? '"لا توجد ملاحظات إضافية"' : '"No additional comments"')}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ═══ INJURIES TAB ═══ */}
            {activeTab === 'injuries' && (
                <div className={`bg-white rounded-[2.5rem] border border-slate-200 premium-shadow overflow-hidden ${isRTL ? 'text-right' : 'text-left'}`}>
                    <div className={`px-10 py-8 border-b border-slate-100 flex items-center gap-6 bg-red-50/50 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <div className="p-4 bg-red-100 text-red-500 rounded-[1.5rem] shadow-sm">
                            <span className="text-2xl">🩹</span>
                        </div>
                        <div>
                            <h3 className="text-2xl font-black text-slate-800">
                                {isRTL ? 'سجل الإصابات' : 'Injury Record'}
                            </h3>
                            <p className="text-sm font-bold text-slate-500">
                                {isRTL ? 'تاريخ الإصابات والتعافي' : 'Injury and recovery history'}
                            </p>
                        </div>
                    </div>
                    <div className="p-8">
                        {!injuries || injuries.length === 0 ? (
                            <div className="text-center py-16">
                                <span className="text-6xl mb-4 block">💪</span>
                                <p className="font-black text-slate-400 uppercase tracking-widest">
                                    {isRTL ? 'لا توجد إصابات مسجلة' : 'No injuries recorded'}
                                </p>
                                <p className="text-sm text-slate-300 mt-2">
                                    {isRTL ? 'استمر في التدريب بأمان!' : 'Keep training safely!'}
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {injuries.map((inj, i) => (
                                    <div key={i} className={`p-5 rounded-2xl border flex items-start gap-4 ${
                                        inj.status === 'Recovered' ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'
                                    } ${isRTL ? 'flex-row-reverse' : ''}`}>
                                        <div className={`p-3 rounded-xl shrink-0 ${
                                            inj.status === 'Recovered' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-500'
                                        }`}>
                                            <span className="text-xl">{inj.status === 'Recovered' ? '✅' : '🩹'}</span>
                                        </div>
                                        <div className="flex-1">
                                            <div className={`flex items-start justify-between gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                                <div>
                                                    <p className="font-black text-slate-800">{inj.injury_type || inj.type || (isRTL ? 'إصابة' : 'Injury')}</p>
                                                    <p className="text-sm text-slate-500 mt-0.5">{inj.description || inj.notes || ''}</p>
                                                </div>
                                                <span className={`shrink-0 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase border ${
                                                    inj.status === 'Recovered' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-red-100 text-red-700 border-red-200'
                                                }`}>
                                                    {inj.status === 'Recovered' ? (isRTL ? 'متعافٍ' : 'Recovered') : (isRTL ? 'علاج' : 'Treatment')}
                                                </span>
                                            </div>
                                            {inj.injury_date && (
                                                <p className="text-xs text-slate-400 mt-2" dir="ltr">
                                                    📅 {new Date(inj.injury_date).toLocaleDateString()}
                                                    {inj.recovery_date && ` → ${new Date(inj.recovery_date).toLocaleDateString()}`}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ═══ NUTRITION TAB ═══ */}
            {activeTab === 'nutrition' && (
                <div className={`space-y-6 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {/* Header */}
                    <div className="bg-gradient-to-br from-green-600 to-emerald-700 rounded-[2.5rem] p-8 text-white relative overflow-hidden premium-shadow">
                        <div className="absolute right-0 top-0 w-48 h-48 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-[60px]" />
                        <div className="relative z-10">
                            <div className={`flex items-center gap-4 mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                <div className="text-5xl">🥗</div>
                                <div>
                                    <h2 className="text-2xl font-black tracking-tight">
                                        {isRTL ? 'التغذية الرياضية' : 'Sports Nutrition'}
                                    </h2>
                                    <p className="text-green-100 text-sm font-medium mt-1">
                                        {isRTL ? 'دليل التغذية المثالية للاعب الصغير' : 'Optimal nutrition guide for young players'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Daily Meals Plan */}
                    <div className="bg-white rounded-[2.5rem] border border-slate-200 premium-shadow overflow-hidden">
                        <div className={`px-8 py-6 border-b border-slate-100 bg-emerald-50/50 flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                            <div className="p-3 bg-emerald-100 text-emerald-600 rounded-2xl">
                                <span className="text-xl">🍽️</span>
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-slate-800">
                                    {isRTL ? 'جدول الوجبات اليومي' : 'Daily Meal Schedule'}
                                </h3>
                                <p className="text-sm text-slate-500 font-medium">
                                    {isRTL ? '5 وجبات لأداء مثالي' : '5 meals for peak performance'}
                                </p>
                            </div>
                        </div>
                        <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {[
                                {
                                    time: isRTL ? '7:00 - الفطور' : '7:00 - Breakfast',
                                    emoji: '🌅',
                                    color: 'amber',
                                    items: isRTL
                                        ? ['بيض + خبز أسمر', 'حليب أو زبادي طبيعي', 'موزة أو تفاحة', 'عصير برتقال طازج']
                                        : ['Eggs + whole grain bread', 'Milk or natural yogurt', 'Banana or apple', 'Fresh orange juice']
                                },
                                {
                                    time: isRTL ? '10:30 - وجبة خفيفة' : '10:30 - Snack',
                                    emoji: '🍌',
                                    color: 'yellow',
                                    items: isRTL
                                        ? ['موزة طازجة', 'حفنة مكسرات', 'ماء أو عصير طبيعي']
                                        : ['Fresh banana', 'Handful of nuts', 'Water or natural juice']
                                },
                                {
                                    time: isRTL ? '13:00 - الغداء' : '13:00 - Lunch',
                                    emoji: '🍗',
                                    color: 'emerald',
                                    items: isRTL
                                        ? ['بروتين: دجاج أو سمك', 'أرز أو مكرونة', 'خضروات متنوعة', 'سلطة خضراء']
                                        : ['Protein: chicken or fish', 'Rice or pasta', 'Mixed vegetables', 'Green salad']
                                },
                                {
                                    time: isRTL ? '16:00 - قبل التدريب' : '16:00 - Pre-Training',
                                    emoji: '⚡',
                                    color: 'blue',
                                    items: isRTL
                                        ? ['موزة + تمر', 'عصير طبيعي', 'ماء (500 مل)', 'وجبة خفيفة كربوهيدرات']
                                        : ['Banana + dates', 'Natural juice', 'Water (500ml)', 'Light carb snack']
                                },
                                {
                                    time: isRTL ? '20:00 - العشاء' : '20:00 - Dinner',
                                    emoji: '🌙',
                                    color: 'violet',
                                    items: isRTL
                                        ? ['بروتين خفيف', 'خضروات مطهوة', 'شوربة دافئة', 'حليب دافئ قبل النوم']
                                        : ['Light protein', 'Cooked vegetables', 'Warm soup', 'Warm milk before sleep']
                                },
                            ].map((meal, i) => (
                                <div key={i} className={`p-5 rounded-2xl border-2 ${
                                    meal.color === 'amber' ? 'bg-amber-50 border-amber-100' :
                                    meal.color === 'yellow' ? 'bg-yellow-50 border-yellow-100' :
                                    meal.color === 'emerald' ? 'bg-emerald-50 border-emerald-100' :
                                    meal.color === 'blue' ? 'bg-blue-50 border-blue-100' :
                                    'bg-violet-50 border-violet-100'
                                }`}>
                                    <div className={`flex items-center gap-2 mb-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                        <span className="text-2xl">{meal.emoji}</span>
                                        <p className="font-black text-slate-700 text-sm">{meal.time}</p>
                                    </div>
                                    <ul className="space-y-1.5">
                                        {meal.items.map((item, j) => (
                                            <li key={j} className={`flex items-start gap-2 text-xs text-slate-600 font-medium ${isRTL ? 'flex-row-reverse text-right' : ''}`}>
                                                <span className="text-emerald-500 mt-0.5 shrink-0">✓</span>
                                                {item}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Key Nutrients */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                        {[
                            {
                                emoji: '💪',
                                title: isRTL ? 'البروتين' : 'Protein',
                                subtitle: isRTL ? '1.5 - 2g / كغ / يوم' : '1.5 - 2g / kg / day',
                                desc: isRTL ? 'ضروري لبناء العضلات وإصلاح الأنسجة بعد التدريب.' : 'Essential for muscle building and tissue repair after training.',
                                color: 'rose',
                                sources: isRTL ? ['دجاج', 'بيض', 'سمك', 'حليب'] : ['Chicken', 'Eggs', 'Fish', 'Milk']
                            },
                            {
                                emoji: '⚡',
                                title: isRTL ? 'الكربوهيدرات' : 'Carbohydrates',
                                subtitle: isRTL ? '50-60% من السعرات' : '50-60% of calories',
                                desc: isRTL ? 'مصدر الطاقة الأساسي للاعبين خلال التدريب والمباريات.' : 'Primary energy source for players during training and matches.',
                                color: 'amber',
                                sources: isRTL ? ['أرز', 'مكرونة', 'خبز', 'بطاطا'] : ['Rice', 'Pasta', 'Bread', 'Potatoes']
                            },
                            {
                                emoji: '💧',
                                title: isRTL ? 'الترطيب' : 'Hydration',
                                subtitle: isRTL ? '2-3 لتر يومياً' : '2-3 liters daily',
                                desc: isRTL ? 'الماء أساسي للأداء. الجفاف يقلل القدرة الرياضية بنسبة 20%.' : 'Water is essential. Dehydration reduces performance by 20%.',
                                color: 'blue',
                                sources: isRTL ? ['ماء', 'عصير طازج', 'ألبان', 'شوربة'] : ['Water', 'Fresh juice', 'Dairy', 'Soup']
                            }
                        ].map((nutrient, i) => (
                            <div key={i} className={`bg-white rounded-[2rem] border p-6 premium-shadow ${
                                nutrient.color === 'rose' ? 'border-rose-100' :
                                nutrient.color === 'amber' ? 'border-amber-100' :
                                'border-blue-100'
                            }`}>
                                <div className="text-4xl mb-3">{nutrient.emoji}</div>
                                <h4 className="font-black text-slate-800 text-lg">{nutrient.title}</h4>
                                <p className={`text-xs font-black uppercase tracking-widest mt-0.5 mb-3 ${
                                    nutrient.color === 'rose' ? 'text-rose-500' :
                                    nutrient.color === 'amber' ? 'text-amber-500' :
                                    'text-blue-500'
                                }`}>{nutrient.subtitle}</p>
                                <p className="text-sm text-slate-500 font-medium leading-relaxed mb-4">{nutrient.desc}</p>
                                <div className="flex flex-wrap gap-2">
                                    {nutrient.sources.map((s, j) => (
                                        <span key={j} className={`text-[10px] font-black uppercase px-2.5 py-1.5 rounded-xl border ${
                                            nutrient.color === 'rose' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                                            nutrient.color === 'amber' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                                            'bg-blue-50 text-blue-600 border-blue-100'
                                        }`}>{s}</span>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Forbidden Foods */}
                    <div className="bg-red-50 border-2 border-red-100 rounded-[2rem] p-8">
                        <div className={`flex items-center gap-3 mb-5 ${isRTL ? 'flex-row-reverse' : ''}`}>
                            <span className="text-3xl">🚫</span>
                            <div>
                                <h3 className="font-black text-red-700 text-lg">
                                    {isRTL ? 'تجنب هذه الأطعمة' : 'Foods to Avoid'}
                                </h3>
                                <p className="text-red-400 text-sm font-medium">
                                    {isRTL ? 'تضر بالأداء الرياضي' : 'These harm athletic performance'}
                                </p>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {(isRTL
                                ? ['المشروبات الغازية', 'الوجبات السريعة', 'الحلويات المصنعة', 'الدهون المشبعة', 'المشروبات الطاقة', 'الأطعمة المقلية', 'الملح الزائد', 'السكر المصفى']
                                : ['Soft drinks', 'Fast food', 'Processed sweets', 'Saturated fats', 'Energy drinks', 'Fried foods', 'Excess salt', 'Refined sugar']
                            ).map((food, i) => (
                                <div key={i} className="flex items-center gap-2 bg-white rounded-xl px-3 py-2.5 border border-red-100">
                                    <span className="text-red-500 text-xs">✗</span>
                                    <span className="text-xs font-bold text-red-700">{food}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
            {/* ═══ INJURIES TAB ═══ */}
            {activeTab === 'injuries' && (
                <div className={`bg-white rounded-[2.5rem] border border-slate-200 premium-shadow overflow-hidden ${isRTL ? 'text-right' : 'text-left'}`}>
                    <div className={`px-10 py-8 border-b border-slate-100 flex items-center gap-6 bg-red-50/50 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <div className="p-4 bg-red-100 text-red-500 rounded-[1.5rem] shadow-sm">
                            <Heart size={28} />
                        </div>
                        <div>
                            <h3 className="text-2xl font-black text-slate-800">
                                {isRTL ? 'سجل الإصابات' : 'Injury Record'}
                            </h3>
                            <p className="text-sm font-bold text-slate-500">
                                {isRTL ? 'تاريخ الإصابات والتعافي' : 'Injury and recovery history'}
                            </p>
                        </div>
                    </div>
                    <div className="p-8">
                        {!injuries || injuries.length === 0 ? (
                            <div className="text-center py-16 bg-slate-50 rounded-[2.5rem] border-2 border-dashed border-slate-100">
                                <span className="text-6xl mb-4 block">💪</span>
                                <p className="font-black text-slate-400 uppercase tracking-widest">
                                    {isRTL ? 'لا توجد إصابات مسجلة' : 'No injuries recorded'}
                                </p>
                                <p className="text-sm text-slate-300 mt-2">
                                    {isRTL ? 'استمر في التدريب بأمان!' : 'Keep training safely!'}
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {injuries.map((inj, i) => (
                                    <div key={i} className={`p-5 rounded-2xl border flex items-start gap-4 ${
                                        inj.status === 'Recovered' ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'
                                    } ${isRTL ? 'flex-row-reverse' : ''}`}>
                                        <div className={`p-3 rounded-xl shrink-0 ${
                                            inj.status === 'Recovered' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-500'
                                        }`}>
                                            <span className="text-xl">{inj.status === 'Recovered' ? '✅' : '🩹'}</span>
                                        </div>
                                        <div className={`flex-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                                            <div className={`flex items-start justify-between gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                                <p className="font-black text-slate-800">{inj.injury_type || inj.type || (isRTL ? 'إصابة' : 'Injury')}</p>
                                                <span className={`shrink-0 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase border ${
                                                    inj.status === 'Recovered' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-red-100 text-red-700 border-red-200'
                                                }`}>
                                                    {inj.status === 'Recovered' ? (isRTL ? 'متعافٍ' : 'Recovered') : (isRTL ? 'علاج' : 'Treatment')}
                                                </span>
                                            </div>
                                            {inj.description && <p className="text-sm text-slate-500 mt-1">{inj.description}</p>}
                                            {inj.injury_date && (
                                                <p className="text-xs text-slate-400 mt-2" dir="ltr">
                                                    📅 {new Date(inj.injury_date).toLocaleDateString()}
                                                    {inj.recovery_date && ` → ${new Date(inj.recovery_date).toLocaleDateString()}`}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ═══ NUTRITION TAB ═══ */}
            {activeTab === 'nutrition' && (
                <div className={`space-y-6 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {/* Hero Header */}
                    <div className="bg-gradient-to-br from-green-600 to-emerald-700 rounded-[2.5rem] p-8 text-white relative overflow-hidden premium-shadow">
                        <div className="absolute right-0 top-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/4 blur-[80px]" />
                        <div className="relative z-10">
                            <div className={`flex items-center gap-5 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                <div className="text-6xl">🥗</div>
                                <div>
                                    <h2 className="text-3xl font-black tracking-tight">
                                        {isRTL ? 'التغذية الرياضية' : 'Sports Nutrition'}
                                    </h2>
                                    <p className="text-green-100 text-sm font-medium mt-1">
                                        {isRTL ? 'دليل التغذية المثالية للاعب الصغير' : 'Optimal nutrition guide for young players'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Daily Meals */}
                    <div className="bg-white rounded-[2.5rem] border border-slate-200 premium-shadow overflow-hidden">
                        <div className={`px-8 py-6 border-b border-slate-100 bg-emerald-50/50 flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                            <div className="p-3 bg-emerald-100 text-emerald-600 rounded-2xl">
                                <Utensils size={22} />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-slate-800">{isRTL ? 'جدول الوجبات اليومي' : 'Daily Meal Schedule'}</h3>
                                <p className="text-sm text-slate-500 font-medium">{isRTL ? '5 وجبات لأداء مثالي' : '5 meals for peak performance'}</p>
                            </div>
                        </div>
                        <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {[
                                {
                                    time: isRTL ? '7:00 - الفطور' : '7:00 - Breakfast', emoji: '🌅', color: 'amber',
                                    items: isRTL ? ['بيض + خبز أسمر', 'حليب أو زبادي طبيعي', 'موزة أو تفاحة', 'عصير برتقال طازج']
                                                 : ['Eggs + whole grain bread', 'Milk or natural yogurt', 'Banana or apple', 'Fresh orange juice']
                                },
                                {
                                    time: isRTL ? '10:30 - وجبة خفيفة' : '10:30 - Snack', emoji: '🍌', color: 'yellow',
                                    items: isRTL ? ['موزة طازجة', 'حفنة مكسرات', 'ماء أو عصير طبيعي']
                                                 : ['Fresh banana', 'Handful of nuts', 'Water or natural juice']
                                },
                                {
                                    time: isRTL ? '13:00 - الغداء' : '13:00 - Lunch', emoji: '🍗', color: 'emerald',
                                    items: isRTL ? ['بروتين: دجاج أو سمك', 'أرز أو مكرونة', 'خضروات متنوعة', 'سلطة خضراء']
                                                 : ['Protein: chicken or fish', 'Rice or pasta', 'Mixed vegetables', 'Green salad']
                                },
                                {
                                    time: isRTL ? '16:00 - قبل التدريب' : '16:00 - Pre-Training', emoji: '⚡', color: 'blue',
                                    items: isRTL ? ['موزة + تمر', 'عصير طبيعي', 'ماء (500 مل)']
                                                 : ['Banana + dates', 'Natural juice', 'Water (500ml)']
                                },
                                {
                                    time: isRTL ? '20:00 - العشاء' : '20:00 - Dinner', emoji: '🌙', color: 'violet',
                                    items: isRTL ? ['بروتين خفيف', 'خضروات مطهوة', 'شوربة دافئة', 'حليب دافئ قبل النوم']
                                                 : ['Light protein', 'Cooked vegetables', 'Warm soup', 'Warm milk before sleep']
                                },
                            ].map((meal, i) => (
                                <div key={i} className={`p-5 rounded-2xl border-2 ${
                                    meal.color === 'amber'   ? 'bg-amber-50 border-amber-100' :
                                    meal.color === 'yellow'  ? 'bg-yellow-50 border-yellow-100' :
                                    meal.color === 'emerald' ? 'bg-emerald-50 border-emerald-100' :
                                    meal.color === 'blue'    ? 'bg-blue-50 border-blue-100' :
                                    'bg-violet-50 border-violet-100'
                                }`}>
                                    <div className={`flex items-center gap-2 mb-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                        <span className="text-2xl">{meal.emoji}</span>
                                        <p className="font-black text-slate-700 text-sm">{meal.time}</p>
                                    </div>
                                    <ul className="space-y-1.5">
                                        {meal.items.map((item, j) => (
                                            <li key={j} className={`flex items-start gap-2 text-xs text-slate-600 font-medium ${isRTL ? 'flex-row-reverse text-right' : ''}`}>
                                                <span className="text-emerald-500 mt-0.5 shrink-0">✓</span>
                                                {item}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Key Nutrients */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                        {[
                            {
                                icon: Flame, emoji: '💪',
                                title: isRTL ? 'البروتين' : 'Protein',
                                subtitle: isRTL ? '1.5 - 2g / كغ / يوم' : '1.5–2g / kg / day',
                                desc: isRTL ? 'ضروري لبناء العضلات وإصلاح الأنسجة بعد التدريب.' : 'Essential for muscle building and tissue repair after training.',
                                color: 'rose',
                                sources: isRTL ? ['دجاج', 'بيض', 'سمك', 'حليب'] : ['Chicken', 'Eggs', 'Fish', 'Milk']
                            },
                            {
                                icon: Zap, emoji: '⚡',
                                title: isRTL ? 'الكربوهيدرات' : 'Carbohydrates',
                                subtitle: isRTL ? '50-60% من السعرات' : '50–60% of calories',
                                desc: isRTL ? 'مصدر الطاقة الأساسي للاعبين خلال التدريب والمباريات.' : 'Primary energy source for players during training and matches.',
                                color: 'amber',
                                sources: isRTL ? ['أرز', 'مكرونة', 'خبز', 'بطاطا'] : ['Rice', 'Pasta', 'Bread', 'Potatoes']
                            },
                            {
                                icon: Droplets, emoji: '💧',
                                title: isRTL ? 'الترطيب' : 'Hydration',
                                subtitle: isRTL ? '2-3 لتر يومياً' : '2–3 liters daily',
                                desc: isRTL ? 'الماء أساسي للأداء. الجفاف يقلل القدرة الرياضية بنسبة 20%.' : 'Water is essential. Dehydration reduces performance by 20%.',
                                color: 'blue',
                                sources: isRTL ? ['ماء', 'عصير طازج', 'ألبان', 'شوربة'] : ['Water', 'Fresh juice', 'Dairy', 'Soup']
                            }
                        ].map((nutrient, i) => (
                            <div key={i} className={`bg-white rounded-[2rem] border p-6 premium-shadow ${
                                nutrient.color === 'rose' ? 'border-rose-100' :
                                nutrient.color === 'amber' ? 'border-amber-100' : 'border-blue-100'
                            }`}>
                                <div className="text-4xl mb-3">{nutrient.emoji}</div>
                                <h4 className="font-black text-slate-800 text-lg">{nutrient.title}</h4>
                                <p className={`text-xs font-black uppercase tracking-widest mt-0.5 mb-3 ${
                                    nutrient.color === 'rose' ? 'text-rose-500' :
                                    nutrient.color === 'amber' ? 'text-amber-500' : 'text-blue-500'
                                }`}>{nutrient.subtitle}</p>
                                <p className="text-sm text-slate-500 font-medium leading-relaxed mb-4">{nutrient.desc}</p>
                                <div className="flex flex-wrap gap-2">
                                    {nutrient.sources.map((s, j) => (
                                        <span key={j} className={`text-[10px] font-black uppercase px-2.5 py-1.5 rounded-xl border ${
                                            nutrient.color === 'rose'  ? 'bg-rose-50 text-rose-600 border-rose-100' :
                                            nutrient.color === 'amber' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                                            'bg-blue-50 text-blue-600 border-blue-100'
                                        }`}>{s}</span>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Foods to Avoid */}
                    <div className="bg-red-50 border-2 border-red-100 rounded-[2rem] p-8">
                        <div className={`flex items-center gap-3 mb-5 ${isRTL ? 'flex-row-reverse' : ''}`}>
                            <span className="text-3xl">🚫</span>
                            <div>
                                <h3 className="font-black text-red-700 text-lg">{isRTL ? 'تجنب هذه الأطعمة' : 'Foods to Avoid'}</h3>
                                <p className="text-red-400 text-sm font-medium">{isRTL ? 'تضر بالأداء الرياضي' : 'These harm athletic performance'}</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {(isRTL
                                ? ['المشروبات الغازية', 'الوجبات السريعة', 'الحلويات المصنعة', 'الدهون المشبعة', 'مشروبات الطاقة', 'الأطعمة المقلية', 'الملح الزائد', 'السكر المصفى']
                                : ['Soft drinks', 'Fast food', 'Processed sweets', 'Saturated fats', 'Energy drinks', 'Fried foods', 'Excess salt', 'Refined sugar']
                            ).map((food, i) => (
                                <div key={i} className="flex items-center gap-2 bg-white rounded-xl px-3 py-2.5 border border-red-100">
                                    <span className="text-red-500 text-xs">✗</span>
                                    <span className="text-xs font-bold text-red-700">{food}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
