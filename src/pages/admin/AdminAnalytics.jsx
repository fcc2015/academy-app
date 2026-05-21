import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { authFetch } from '../../api';
import { API_URL } from '../../config';
import { useLanguage } from '../../i18n/LanguageContext';
import { useToast } from '../../components/Toast';
import { SkeletonDashboard } from '../../components/Skeleton';
import {
    TrendingUp, TrendingDown, Users, DollarSign, BarChart3,
    Calendar, RefreshCw, Download, Activity, Award, Target,
    ChevronRight, PieChart as PieIcon, Layers
} from 'lucide-react';
import {
    AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
    LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
    CartesianGrid, Legend
} from 'recharts';

// ─── Design tokens ──────────────────────────────────────────────────────────
const CHART_COLORS = [
    '#6366f1', '#8b5cf6', '#ec4899', '#f59e0b',
    '#10b981', '#3b82f6', '#ef4444', '#14b8a6'
];

const GRADIENT_DEFS = (
    <defs>
        <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#10b981" stopOpacity={0.25} />
            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
        </linearGradient>
        <linearGradient id="playerGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.25} />
            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
        </linearGradient>
        <linearGradient id="attGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#f59e0b" stopOpacity={0.25} />
            <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
        </linearGradient>
        <linearGradient id="expGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#ef4444" stopOpacity={0.25} />
            <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
        </linearGradient>
    </defs>
);

const TOOLTIP_STYLE = {
    contentStyle: {
        background: '#1e293b',
        border: 'none',
        borderRadius: 12,
        color: '#fff',
        fontSize: 12,
        fontWeight: 700,
        boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
    },
    itemStyle: { color: '#94a3b8' }
};

// ─── Sub-components ─────────────────────────────────────────────────────────

const StatCard = ({ title, value, subtitle, icon: Icon, color, change, changeLabel }) => {
    const colorMap = {
        emerald: { bg: 'from-emerald-500 to-teal-600',    ring: 'ring-emerald-100', text: 'text-emerald-600' },
        indigo:  { bg: 'from-indigo-500 to-violet-600',   ring: 'ring-indigo-100',  text: 'text-indigo-600' },
        amber:   { bg: 'from-amber-500 to-orange-500',    ring: 'ring-amber-100',   text: 'text-amber-600' },
        rose:    { bg: 'from-rose-500 to-pink-600',       ring: 'ring-rose-100',    text: 'text-rose-600' },
        blue:    { bg: 'from-blue-500 to-cyan-600',       ring: 'ring-blue-100',    text: 'text-blue-600' },
        purple:  { bg: 'from-purple-500 to-fuchsia-600',  ring: 'ring-purple-100',  text: 'text-purple-600' },
    };
    const t = colorMap[color] || colorMap.indigo;
    const isPositive = typeof change === 'number' ? change >= 0 : true;

    return (
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
            <div className={`absolute -top-8 -right-8 w-24 h-24 rounded-full bg-gradient-to-br ${t.bg} opacity-10 blur-2xl group-hover:opacity-20 transition-opacity`} />
            <div className="flex items-start justify-between mb-4">
                <div className={`p-3 rounded-xl bg-gradient-to-br ${t.bg} shadow-sm`}>
                    <Icon size={20} className="text-white" />
                </div>
                {change !== undefined && (
                    <span className={`flex items-center gap-1 text-xs font-black px-2.5 py-1 rounded-full ${isPositive ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
                        {isPositive ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                        {isPositive && change > 0 ? '+' : ''}{change}{changeLabel || ''}
                    </span>
                )}
            </div>
            <p className="text-2xl font-black text-slate-800 tracking-tight mb-1">{value}</p>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{title}</p>
            {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
        </div>
    );
};

const ChartCard = ({ title, subtitle, icon: Icon, iconColor = 'text-indigo-600', iconBg = 'bg-indigo-100', children, className = '' }) => (
    <div className={`bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden ${className}`}>
        <div className="px-6 py-5 border-b border-slate-50 flex items-center gap-3 bg-slate-50/40">
            <div className={`p-2 rounded-xl ${iconBg} ${iconColor}`}>
                <Icon size={18} />
            </div>
            <div>
                <h3 className="font-extrabold text-slate-800 text-sm">{title}</h3>
                {subtitle && <p className="text-xs text-slate-400 font-medium mt-0.5">{subtitle}</p>}
            </div>
        </div>
        <div className="p-6">{children}</div>
    </div>
);

const CustomPieLegend = ({ data, currency }) => (
    <div className="flex flex-wrap gap-2 mt-3">
        {data.map((entry, i) => (
            <div key={i} className="flex items-center gap-1.5 text-xs font-bold text-slate-600">
                <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                <span>{entry.name}</span>
                <span className="text-slate-400">({entry.value}{currency ? ` ${currency}` : ''})</span>
            </div>
        ))}
    </div>
);

// ─── Main page ───────────────────────────────────────────────────────────────

const AdminAnalytics = () => {
    const { isRTL, dir } = useLanguage();
    const navigate = useNavigate();
    const toast = useToast();

    const [data, setData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [settings, setSettings] = useState(null);
    const [activeTab, setActiveTab] = useState('revenue');

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [analyticsRes, settingsRes] = await Promise.all([
                authFetch(`${API_URL}/analytics/overview`),
                authFetch(`${API_URL}/settings/`)
            ]);
            if (analyticsRes.ok) setData(await analyticsRes.json());
            if (settingsRes.ok) setSettings(await settingsRes.json());
        } catch (e) {
            toast.error(isRTL ? 'تعذّر تحميل بيانات التحليلات' : 'Failed to load analytics');
        } finally {
            setIsLoading(false);
        }
    }, [isRTL, toast]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const currency = settings?.currency || 'MAD';

    const handleExportPDF = useCallback(async () => {
        if (!data || !settings) return;
        const { jsPDF } = await import('jspdf');
        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const academy = settings.academy_name || 'Academy';
        const today = new Date().toLocaleDateString('fr-MA');

        // Header
        doc.setFillColor(99, 102, 241);
        doc.rect(0, 0, 210, 38, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(20);
        doc.setFont('helvetica', 'bold');
        doc.text(academy, 15, 18);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        doc.text(`Rapport Analytics — ${today}`, 15, 28);

        // Summary KPIs
        const s = data.summary;
        doc.setTextColor(30, 41, 59);
        doc.setFontSize(13);
        doc.setFont('helvetica', 'bold');
        doc.text('Résumé des indicateurs clés', 15, 52);

        const kpis = [
            ['Joueurs total', s.total_players],
            ['Revenus total', `${s.total_revenue.toLocaleString()} ${currency}`],
            ['Taux de complétion', `${s.completion_rate}%`],
            ['Taux de présence', `${s.overall_attendance_rate}%`],
            ['Abonnements actifs', s.active_subscriptions],
            ['Évaluations total', s.total_evaluations],
        ];

        doc.setFontSize(10);
        let y = 62;
        kpis.forEach(([label, val], i) => {
            const x = i % 2 === 0 ? 15 : 110;
            if (i % 2 === 0 && i > 0) y += 12;
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(99, 102, 241);
            doc.text(String(label), x, y);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(30, 41, 59);
            doc.text(String(val), x + 55, y, { align: 'right' });
            doc.setDrawColor(226, 232, 240);
            doc.line(x, y + 2, x + 85, y + 2);
        });

        // Revenue table
        y += 22;
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(30, 41, 59);
        doc.text('Revenus par mois (12 derniers mois)', 15, y);
        y += 8;
        (data.revenue_trend || []).forEach(row => {
            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(71, 85, 105);
            doc.text(row.month, 15, y);
            doc.text(`${row.revenue.toLocaleString()} ${currency}`, 75, y);
            y += 7;
            if (y > 270) { doc.addPage(); y = 20; }
        });

        // Footer
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(148, 163, 184);
            doc.text(`${academy} — Page ${i} / ${pageCount}`, 15, 290);
            doc.text('Généré automatiquement par Akmil Academy Platform', 210 - 15, 290, { align: 'right' });
        }

        doc.save(`analytics-${academy}-${today}.pdf`);
        toast.success(isRTL ? 'تم تصدير التقرير PDF' : 'PDF report exported');
    }, [data, settings, currency, isRTL, toast]);

    if (isLoading) return <SkeletonDashboard />;

    const s = data?.summary || {};

    const tabs = [
        { id: 'revenue',    label: isRTL ? 'الإيرادات' : 'Revenue',    icon: DollarSign },
        { id: 'players',    label: isRTL ? 'اللاعبون' : 'Players',     icon: Users },
        { id: 'attendance', label: isRTL ? 'الحضور' : 'Attendance',    icon: Calendar },
        { id: 'expenses',   label: isRTL ? 'المصاريف' : 'Expenses',    icon: TrendingDown },
    ];

    return (
        <div className="animate-fade-in pb-20 min-h-screen" dir={dir}>
            {/* ── Header ─────────────────────────────────────────────── */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">
                        {isRTL ? 'لوحة ' : 'Analytics '}
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">
                            {isRTL ? 'التحليلات' : 'Dashboard'}
                        </span>
                    </h1>
                    <p className="text-sm font-bold text-slate-400 mt-1 uppercase tracking-widest">
                        {isRTL ? 'تقارير شاملة عن أداء الأكاديمية' : 'Comprehensive academy performance reports'}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={fetchData}
                        className="p-3 rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-indigo-600 hover:border-indigo-200 transition-all shadow-sm"
                        title={isRTL ? 'تحديث' : 'Refresh'}
                    >
                        <RefreshCw size={18} />
                    </button>
                    <button
                        onClick={handleExportPDF}
                        className="flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-black text-sm shadow-lg hover:shadow-indigo-300 hover:-translate-y-0.5 transition-all"
                    >
                        <Download size={16} />
                        {isRTL ? 'تصدير PDF' : 'Export PDF'}
                    </button>
                </div>
            </div>

            {/* ── KPI Row ─────────────────────────────────────────────── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <StatCard
                    title={isRTL ? 'إجمالي الإيرادات' : 'Total Revenue'}
                    value={`${(s.total_revenue || 0).toLocaleString()} ${currency}`}
                    icon={DollarSign}
                    color="emerald"
                    change={s.revenue_change_pct}
                    changeLabel="%"
                    subtitle={isRTL ? 'مقارنة بالشهر الماضي' : 'vs last month'}
                />
                <StatCard
                    title={isRTL ? 'إجمالي اللاعبين' : 'Total Players'}
                    value={s.total_players || 0}
                    icon={Users}
                    color="indigo"
                    change={s.players_change}
                    changeLabel={isRTL ? ' هذا الشهر' : ' this month'}
                />
                <StatCard
                    title={isRTL ? 'معدل الحضور' : 'Attendance Rate'}
                    value={`${s.overall_attendance_rate || 0}%`}
                    icon={Calendar}
                    color="amber"
                    subtitle={`${s.total_payments || 0} ${isRTL ? 'دفعة إجمالاً' : 'total payments'}`}
                />
                <StatCard
                    title={isRTL ? 'اكتمال الدفعات' : 'Payment Completion'}
                    value={`${s.completion_rate || 0}%`}
                    icon={Target}
                    color="blue"
                    subtitle={`${s.active_subscriptions || 0} ${isRTL ? 'اشتراك نشط' : 'active subs'}`}
                />
            </div>

            {/* ── Tab navigation ──────────────────────────────────────── */}
            <div className="flex gap-1 bg-slate-100 rounded-2xl p-1 mb-8 w-fit">
                {tabs.map(tab => {
                    const Icon = tab.icon;
                    const active = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
                                active
                                    ? 'bg-white text-indigo-700 shadow-sm'
                                    : 'text-slate-500 hover:text-slate-700'
                            }`}
                        >
                            <Icon size={15} />
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* ── Revenue Tab ─────────────────────────────────────────── */}
            {activeTab === 'revenue' && (
                <div className="space-y-6">
                    {/* 12-month revenue area chart */}
                    <ChartCard
                        title={isRTL ? 'الإيرادات الشهرية (12 شهرًا)' : 'Monthly Revenue (12 months)'}
                        subtitle={isRTL ? 'الدفعات المكتملة فقط' : 'Completed payments only'}
                        icon={TrendingUp}
                        iconColor="text-emerald-600"
                        iconBg="bg-emerald-100"
                    >
                        <div style={{ height: 300 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={data?.revenue_trend || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                    <svg>{GRADIENT_DEFS}</svg>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 700, fill: '#94a3b8' }} reversed={isRTL} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 700, fill: '#94a3b8' }} width={60} orientation={isRTL ? 'right' : 'left'} tickFormatter={v => v.toLocaleString()} />
                                    <Tooltip {...TOOLTIP_STYLE} formatter={v => [`${v.toLocaleString()} ${currency}`, isRTL ? 'الإيرادات' : 'Revenue']} />
                                    <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2.5} fill="url(#revGrad)" dot={{ r: 4, fill: '#10b981', stroke: '#fff', strokeWidth: 2 }} activeDot={{ r: 6 }} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </ChartCard>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Payment method distribution */}
                        <ChartCard
                            title={isRTL ? 'طرق الدفع' : 'Payment Methods'}
                            icon={PieIcon}
                            iconColor="text-purple-600"
                            iconBg="bg-purple-100"
                        >
                            <div style={{ height: 220 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={data?.payment_methods || []}
                                            cx="50%" cy="50%"
                                            innerRadius={55} outerRadius={90}
                                            paddingAngle={3}
                                            dataKey="value"
                                        >
                                            {(data?.payment_methods || []).map((_, i) => (
                                                <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip {...TOOLTIP_STYLE} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            <CustomPieLegend data={data?.payment_methods || []} />
                        </ChartCard>

                        {/* Payment status breakdown */}
                        <ChartCard
                            title={isRTL ? 'حالة الدفعات' : 'Payment Status'}
                            icon={Layers}
                            iconColor="text-blue-600"
                            iconBg="bg-blue-100"
                        >
                            <div style={{ height: 220 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={data?.payment_statuses || []} layout="vertical" margin={{ left: 10, right: 10 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                                        <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 700 }} />
                                        <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b', fontWeight: 700 }} width={90} />
                                        <Tooltip {...TOOLTIP_STYLE} />
                                        <Bar dataKey="value" radius={[0, 8, 8, 0]} fill="#6366f1">
                                            {(data?.payment_statuses || []).map((_, i) => (
                                                <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                            <CustomPieLegend data={data?.payment_statuses || []} />
                        </ChartCard>
                    </div>
                </div>
            )}

            {/* ── Players Tab ─────────────────────────────────────────── */}
            {activeTab === 'players' && (
                <div className="space-y-6">
                    {/* New registrations per month */}
                    <ChartCard
                        title={isRTL ? 'التسجيلات الجديدة شهريًا' : 'New Registrations by Month'}
                        subtitle={isRTL ? 'آخر 12 شهرًا' : 'Last 12 months'}
                        icon={Users}
                        iconColor="text-indigo-600"
                        iconBg="bg-indigo-100"
                    >
                        <div style={{ height: 280 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={data?.players_trend || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 700, fill: '#94a3b8' }} reversed={isRTL} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 700, fill: '#94a3b8' }} allowDecimals={false} />
                                    <Tooltip {...TOOLTIP_STYLE} formatter={v => [v, isRTL ? 'لاعبون جدد' : 'New Players']} />
                                    <Bar dataKey="players" fill="#6366f1" radius={[6, 6, 0, 0]}>
                                        {(data?.players_trend || []).map((_, i) => (
                                            <Cell key={i} fill={`hsl(${240 + i * 4}, 72%, ${58 - i * 1.5}%)`} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </ChartCard>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Age category pie */}
                        <ChartCard
                            title={isRTL ? 'توزيع الفئات العمرية' : 'Age Category Distribution'}
                            icon={PieIcon}
                            iconColor="text-fuchsia-600"
                            iconBg="bg-fuchsia-100"
                        >
                            <div style={{ height: 220 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={data?.age_categories || []}
                                            cx="50%" cy="50%"
                                            outerRadius={90}
                                            paddingAngle={3}
                                            dataKey="value"
                                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                            labelLine={false}
                                        >
                                            {(data?.age_categories || []).map((_, i) => (
                                                <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip {...TOOLTIP_STYLE} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            <CustomPieLegend data={data?.age_categories || []} />
                        </ChartCard>

                        {/* Top attenders */}
                        <ChartCard
                            title={isRTL ? 'أكثر اللاعبين حضورًا' : 'Top Players by Attendance'}
                            icon={Award}
                            iconColor="text-amber-600"
                            iconBg="bg-amber-100"
                        >
                            <div className="space-y-3">
                                {(data?.top_players_attendance || []).length === 0 ? (
                                    <p className="text-slate-400 text-sm text-center py-8">{isRTL ? 'لا توجد بيانات حضور' : 'No attendance data'}</p>
                                ) : (data?.top_players_attendance || []).map((p, i) => {
                                    const max = data.top_players_attendance[0]?.sessions || 1;
                                    const pct = Math.round((p.sessions / max) * 100);
                                    return (
                                        <div key={i} className="flex items-center gap-3">
                                            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black text-white shrink-0 ${i === 0 ? 'bg-amber-500' : i === 1 ? 'bg-slate-400' : i === 2 ? 'bg-orange-700' : 'bg-slate-300'}`}>
                                                {i + 1}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-center mb-1">
                                                    <p className="text-sm font-bold text-slate-700 truncate">{p.name}</p>
                                                    <span className="text-xs font-black text-indigo-600 ml-2">{p.sessions}</span>
                                                </div>
                                                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500"
                                                        style={{ width: `${pct}%`, transition: 'width 1s ease' }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </ChartCard>
                    </div>
                </div>
            )}

            {/* ── Attendance Tab ───────────────────────────────────────── */}
            {activeTab === 'attendance' && (
                <div className="space-y-6">
                    <ChartCard
                        title={isRTL ? 'معدل الحضور الشهري' : 'Monthly Attendance Rate'}
                        subtitle={isRTL ? 'آخر 6 أشهر' : 'Last 6 months'}
                        icon={Activity}
                        iconColor="text-amber-600"
                        iconBg="bg-amber-100"
                    >
                        <div style={{ height: 300 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={data?.attendance_trend || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                    <svg>{GRADIENT_DEFS}</svg>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 700, fill: '#94a3b8' }} reversed={isRTL} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 700, fill: '#94a3b8' }} domain={[0, 100]} unit="%" orientation={isRTL ? 'right' : 'left'} />
                                    <Tooltip {...TOOLTIP_STYLE} formatter={v => [`${v}%`, isRTL ? 'معدل الحضور' : 'Attendance Rate']} />
                                    <Area type="monotone" dataKey="rate" stroke="#f59e0b" strokeWidth={2.5} fill="url(#attGrad)" dot={{ r: 5, fill: '#f59e0b', stroke: '#fff', strokeWidth: 2 }} activeDot={{ r: 7 }} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </ChartCard>

                    <ChartCard
                        title={isRTL ? 'متوسط درجات التقييم' : 'Average Evaluation Score'}
                        subtitle={isRTL ? 'شهريًا — آخر 6 أشهر' : 'By month — last 6 months'}
                        icon={BarChart3}
                        iconColor="text-indigo-600"
                        iconBg="bg-indigo-100"
                    >
                        <div style={{ height: 260 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={data?.evaluation_trend || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 700, fill: '#94a3b8' }} reversed={isRTL} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 700, fill: '#94a3b8' }} domain={[0, 10]} orientation={isRTL ? 'right' : 'left'} />
                                    <Tooltip {...TOOLTIP_STYLE} formatter={v => [v !== null ? `${v}/10` : 'N/A', isRTL ? 'متوسط الدرجة' : 'Avg Score']} />
                                    <Line type="monotone" dataKey="avg_score" stroke="#6366f1" strokeWidth={2.5} dot={{ r: 5, fill: '#6366f1', stroke: '#fff', strokeWidth: 2 }} activeDot={{ r: 7 }} connectNulls />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </ChartCard>
                </div>
            )}

            {/* ── Expenses Tab ─────────────────────────────────────────── */}
            {activeTab === 'expenses' && (
                <div className="space-y-6">
                    <ChartCard
                        title={isRTL ? 'المصاريف الشهرية' : 'Monthly Expenses'}
                        subtitle={isRTL ? 'آخر 6 أشهر' : 'Last 6 months'}
                        icon={TrendingDown}
                        iconColor="text-rose-600"
                        iconBg="bg-rose-100"
                    >
                        <div style={{ height: 300 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={data?.expense_trend || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                    <svg>{GRADIENT_DEFS}</svg>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 700, fill: '#94a3b8' }} reversed={isRTL} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 700, fill: '#94a3b8' }} width={60} orientation={isRTL ? 'right' : 'left'} tickFormatter={v => v.toLocaleString()} />
                                    <Tooltip {...TOOLTIP_STYLE} formatter={v => [`${v.toLocaleString()} ${currency}`, isRTL ? 'المصاريف' : 'Expenses']} />
                                    <Area type="monotone" dataKey="expenses" stroke="#ef4444" strokeWidth={2.5} fill="url(#expGrad)" dot={{ r: 4, fill: '#ef4444', stroke: '#fff', strokeWidth: 2 }} activeDot={{ r: 6 }} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </ChartCard>

                    <ChartCard
                        title={isRTL ? 'توزيع المصاريف بالفئات' : 'Expense Category Breakdown'}
                        icon={PieIcon}
                        iconColor="text-rose-600"
                        iconBg="bg-rose-100"
                    >
                        <div className="flex flex-col md:flex-row items-center gap-6">
                            <div style={{ height: 240, flex: '0 0 240px' }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={data?.expense_categories || []}
                                            cx="50%" cy="50%"
                                            innerRadius={60} outerRadius={100}
                                            paddingAngle={3}
                                            dataKey="value"
                                        >
                                            {(data?.expense_categories || []).map((_, i) => (
                                                <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip {...TOOLTIP_STYLE} formatter={v => [`${v.toLocaleString()} ${currency}`, '']} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="flex-1 space-y-2">
                                {(data?.expense_categories || []).map((cat, i) => (
                                    <div key={i} className="flex items-center justify-between py-2 border-b border-slate-50">
                                        <div className="flex items-center gap-2">
                                            <div className="w-3 h-3 rounded-full shrink-0" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                                            <span className="text-sm font-bold text-slate-700">{cat.name}</span>
                                        </div>
                                        <span className="text-sm font-black text-slate-800">{cat.value.toLocaleString()} {currency}</span>
                                    </div>
                                ))}
                                {(data?.expense_categories || []).length === 0 && (
                                    <p className="text-slate-400 text-sm py-6 text-center">{isRTL ? 'لا توجد مصاريف مسجلة' : 'No expense data yet'}</p>
                                )}
                            </div>
                        </div>
                    </ChartCard>
                </div>
            )}
        </div>
    );
};

export default AdminAnalytics;
