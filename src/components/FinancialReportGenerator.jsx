import React, { useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { Download, X, Loader2, FileText, DollarSign, TrendingUp, MinusCircle } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

export default function FinancialReportGenerator({ isOpen, onClose, payments, expenses, academyName }) {
    const { t, isRTL, language } = useLanguage();
    const reportRef = useRef(null);
    const [isGenerating, setIsGenerating] = useState(false);

    if (!isOpen) return null;

    // Calculations
    const totalRevenue = payments.reduce((sum, p) => (p.status === 'Completed' || p.status === 'paid') ? sum + Number(p.amount) : sum, 0);
    const pendingAmount = payments.reduce((sum, p) => (p.status === 'Pending' || p.status === 'pending') ? sum + Number(p.amount) : sum, 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
    const netProfit = totalRevenue - totalExpenses;

    const completedPayments = payments.filter(p => p.status === 'Completed' || p.status === 'paid').slice(0, 10);
    const recentExpenses = expenses.slice(0, 10);

    const generatePDF = async () => {
        if (!reportRef.current) return;
        setIsGenerating(true);
        try {
            // Render the DOM node to a canvas
            const canvas = await html2canvas(reportRef.current, {
                scale: 2, // higher resolution
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff'
            });

            const imgData = canvas.toDataURL('image/png');
            
            // Create PDF (A4 size)
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            });

            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            
            const dateStr = new Date().toISOString().split('T')[0];
            pdf.save(`Rapport_Financier_${academyName}_${dateStr}.pdf`);
        } catch (error) {
            console.error('Failed to generate PDF:', error);
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 overflow-y-auto" dir={isRTL ? 'rtl' : 'ltr'}>
            <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                
                {/* Modal Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50 shrink-0">
                    <h2 className="text-xl font-black text-slate-800 flex items-center gap-3">
                        <FileText className="text-indigo-600" /> 
                        {isRTL ? 'تصدير التقرير المالي' : 'Exporter le rapport financier'}
                    </h2>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Preview Area (Scrollable) */}
                <div className="flex-1 overflow-y-auto p-6 bg-slate-100 flex justify-center">
                    {/* The actual report to be captured (A4 ratio approximation for preview) */}
                    <div 
                        ref={reportRef} 
                        className="bg-white shadow-md p-10 w-[800px] shrink-0" 
                        style={{ minHeight: '1131px', boxSizing: 'border-box', direction: isRTL ? 'rtl' : 'ltr' }}
                    >
                        {/* Report Header */}
                        <div className="flex justify-between items-center border-b-2 border-indigo-100 pb-6 mb-8">
                            <div>
                                <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tighter mb-1">{academyName}</h1>
                                <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">
                                    {isRTL ? 'التقرير المالي' : 'Rapport Financier'}
                                </p>
                            </div>
                            <div className="text-right">
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">
                                    {isRTL ? 'تاريخ الإصدار' : 'Date d\'émission'}
                                </p>
                                <p className="text-lg font-black text-indigo-600">
                                    {new Date().toLocaleDateString(language === 'ar' ? 'ar-MA' : 'fr-FR')}
                                </p>
                            </div>
                        </div>

                        {/* KPI Row */}
                        <div className="grid grid-cols-3 gap-6 mb-10">
                            <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-100">
                                <div className="flex items-center gap-2 text-emerald-600 mb-2">
                                    <TrendingUp size={18} />
                                    <span className="text-xs font-black uppercase tracking-widest">{isRTL ? 'إجمالي المداخيل' : 'Revenus'}</span>
                                </div>
                                <div className="text-2xl font-black text-slate-900">{totalRevenue.toLocaleString()} {t('common.currency')}</div>
                            </div>
                            
                            <div className="bg-red-50 p-6 rounded-2xl border border-red-100">
                                <div className="flex items-center gap-2 text-red-600 mb-2">
                                    <MinusCircle size={18} />
                                    <span className="text-xs font-black uppercase tracking-widest">{isRTL ? 'إجمالي المصاريف' : 'Dépenses'}</span>
                                </div>
                                <div className="text-2xl font-black text-slate-900">{totalExpenses.toLocaleString()} {t('common.currency')}</div>
                            </div>

                            <div className="bg-indigo-600 p-6 rounded-2xl shadow-lg">
                                <div className="flex items-center gap-2 text-indigo-200 mb-2">
                                    <DollarSign size={18} />
                                    <span className="text-xs font-black uppercase tracking-widest">{isRTL ? 'الربح الصافي' : 'Bénéfice Net'}</span>
                                </div>
                                <div className="text-2xl font-black text-white">{netProfit.toLocaleString()} {t('common.currency')}</div>
                            </div>
                        </div>

                        {/* Tables Side by Side */}
                        <div className="grid grid-cols-2 gap-8">
                            {/* Revenues Table */}
                            <div>
                                <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-4 pb-2 border-b border-slate-100">
                                    {isRTL ? 'آخر المداخيل المسجلة' : 'Derniers Revenus'}
                                </h3>
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="text-slate-400 text-left text-xs uppercase tracking-widest">
                                            <th className="pb-3 font-black">{isRTL ? 'الاسم' : 'Nom'}</th>
                                            <th className="pb-3 font-black text-right">{isRTL ? 'المبلغ' : 'Montant'}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {completedPayments.length === 0 ? (
                                            <tr><td colSpan="2" className="py-4 text-slate-400 text-xs italic">Aucun revenu</td></tr>
                                        ) : completedPayments.map(p => (
                                            <tr key={p.id}>
                                                <td className="py-3 font-bold text-slate-700">{p.users?.full_name || '-'}</td>
                                                <td className="py-3 font-black text-emerald-600 text-right">+{p.amount}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Expenses Table */}
                            <div>
                                <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-4 pb-2 border-b border-slate-100">
                                    {isRTL ? 'المصاريف الأخيرة' : 'Dernières Dépenses'}
                                </h3>
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="text-slate-400 text-left text-xs uppercase tracking-widest">
                                            <th className="pb-3 font-black">{isRTL ? 'الفئة' : 'Catégorie'}</th>
                                            <th className="pb-3 font-black text-right">{isRTL ? 'المبلغ' : 'Montant'}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {recentExpenses.length === 0 ? (
                                            <tr><td colSpan="2" className="py-4 text-slate-400 text-xs italic">Aucune dépense</td></tr>
                                        ) : recentExpenses.map(e => (
                                            <tr key={e.id}>
                                                <td className="py-3 font-bold text-slate-700">{e.category}</td>
                                                <td className="py-3 font-black text-red-600 text-right">-{e.amount}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        
                        {/* Footer */}
                        <div className="mt-16 pt-6 border-t border-slate-100 text-center text-xs font-bold text-slate-400 uppercase tracking-widest">
                            Généré automatiquement par Football Academy SaaS
                        </div>
                    </div>
                </div>

                {/* Modal Footer */}
                <div className="p-6 border-t border-slate-100 bg-white shrink-0 flex justify-end gap-4">
                    <button 
                        onClick={onClose}
                        className="px-6 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-100 transition-colors"
                    >
                        {isRTL ? 'إلغاء' : 'Annuler'}
                    </button>
                    <button 
                        onClick={generatePDF}
                        disabled={isGenerating}
                        className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-black uppercase tracking-widest flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/30 disabled:opacity-70"
                    >
                        {isGenerating ? <Loader2 className="animate-spin" size={18} /> : <Download size={18} />}
                        {isRTL ? 'تحميل PDF' : 'Télécharger PDF'}
                    </button>
                </div>

            </div>
        </div>
    );
}
