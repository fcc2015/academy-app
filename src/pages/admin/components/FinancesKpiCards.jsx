import React from 'react';
import { DollarSign, Clock, MinusCircle, Activity, TrendingUp } from 'lucide-react';

const FinancesKpiCards = ({ totalRevenue, pendingAmount, totalExpenses, netProfit, t, isRTL }) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
            <div className={`bg-white p-6 rounded-[2rem] border border-slate-200 premium-shadow relative overflow-hidden group hover:border-emerald-400 transition-all ${isRTL ? 'text-right' : 'text-left'}`}>
                <div className="absolute top-0 left-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity transform group-hover:-rotate-12 group-hover:scale-110">
                    <DollarSign size={80} />
                </div>
                <div className={`flex items-center justify-between mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 shadow-sm">
                        <TrendingUp size={20} strokeWidth={2.5} />
                    </div>
                </div>
                <div className="relative z-10">
                    <h4 className="text-2xl font-black text-slate-900 tracking-tighter mb-1">
                        {totalRevenue.toLocaleString()} درهم
                    </h4>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{t('finances.totalRevenue')}</p>
                </div>
            </div>

            <div className={`bg-white p-6 rounded-[2rem] border border-slate-200 premium-shadow relative overflow-hidden group hover:border-amber-400 transition-all ${isRTL ? 'text-right' : 'text-left'}`}>
                <div className="absolute top-0 left-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity transform group-hover:-rotate-12 group-hover:scale-110">
                    <Clock size={80} />
                </div>
                <div className={`flex items-center justify-between mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <div className="p-3 rounded-2xl bg-amber-50 text-amber-600 border border-amber-100 shadow-sm">
                        <Clock size={20} strokeWidth={2.5} />
                    </div>
                </div>
                <div className="relative z-10">
                    <h4 className="text-2xl font-black text-slate-900 tracking-tighter mb-1">
                        {pendingAmount.toLocaleString()} درهم
                    </h4>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{t('finances.pendingAmount')}</p>
                </div>
            </div>

            <div className={`bg-white p-6 rounded-[2rem] border border-slate-200 premium-shadow relative overflow-hidden group hover:border-red-400 transition-all ${isRTL ? 'text-right' : 'text-left'}`}>
                <div className="absolute top-0 left-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity transform group-hover:-rotate-12 group-hover:scale-110">
                    <MinusCircle size={80} />
                </div>
                <div className={`flex items-center justify-between mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <div className="p-3 rounded-2xl bg-red-50 text-red-600 border border-red-100 shadow-sm">
                        <MinusCircle size={20} strokeWidth={2.5} />
                    </div>
                </div>
                <div className="relative z-10">
                    <h4 className="text-2xl font-black text-slate-900 tracking-tighter mb-1">
                        {totalExpenses.toLocaleString()} درهم
                    </h4>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">المصاريف</p>
                </div>
            </div>

            <div className={`bg-emerald-900 p-6 rounded-[2rem] border border-emerald-800 shadow-2xl relative overflow-hidden group hover:border-emerald-500 transition-all ${isRTL ? 'text-right' : 'text-left'}`}>
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500 rounded-full blur-[80px] opacity-20"></div>
                <div className={`flex items-center justify-between mb-4 relative z-10 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <div className="p-3 rounded-2xl bg-emerald-800/50 text-emerald-300 border border-emerald-700 shadow-sm">
                        <Activity size={20} strokeWidth={2.5} />
                    </div>
                </div>
                <div className="relative z-10">
                    <h4 className="text-2xl font-black text-white tracking-tighter mb-1">
                        {netProfit.toLocaleString()} درهم
                    </h4>
                    <p className="text-[10px] font-black text-emerald-300/70 uppercase tracking-[0.2em]">الربح الصافي</p>
                </div>
            </div>
        </div>
    );
};

export default FinancesKpiCards;
