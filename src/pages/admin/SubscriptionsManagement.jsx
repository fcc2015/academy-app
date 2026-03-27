import { API_URL } from '../../config';
import { authFetch } from '../../api';
import React, { useState, useEffect } from 'react';
import {
    CreditCard,
    DollarSign,
    Calendar,
    CheckCircle2,
    XCircle,
    Clock,
    Search,
    Filter,
    ArrowRight,
    Smartphone,
    MoreVertical,
    Download,
    Eye,
    Receipt,
    UserCircle,
    BadgeCheck,
    AlertCircle,
    X,
    Check
} from 'lucide-react';
import ConfirmDialog from '../../components/ConfirmDialog';

const SubscriptionsManagement = () => {
    const [subscriptions, setSubscriptions] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedInvoice, setSelectedInvoice] = useState(null);
    const [statusBanner, setStatusBanner] = useState({ show: false, message: '', type: 'success', id: 0 });
    const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, payment: null });

    const showBanner = (message, type = 'success') => {
        const id = Date.now();
        setStatusBanner({ show: true, message, type, id });
        setTimeout(() => setStatusBanner(prev => prev.id === id ? { ...prev, show: false } : prev), 5000);
    };

    useEffect(() => {
        fetchSubscriptions();
    }, []);

    const fetchSubscriptions = async () => {
        setIsLoading(true);
        try {
            // Fetch combined data from finances and players
            const [paymentsRes, playersRes] = await Promise.all([
                authFetch(`${API_URL}/finances/payments`),
                authFetch(`${API_URL}/players/`)
            ]);

            if (paymentsRes.ok && playersRes.ok) {
                const payments = await paymentsRes.json();
                const players = await playersRes.json();
                
                // Merge data: for each player, find their latest payment record or status
                const merged = players.map(player => {
                    const playerPayments = payments.filter(p => p.user_id === player.user_id);
                    const latestPayment = playerPayments.length > 0 
                        ? playerPayments.sort((a,b) => new Date(b.created_at) - new Date(a.created_at))[0]
                        : null;
                    
                    return {
                        ...player,
                        latestPayment,
                        totalPaid: playerPayments.filter(p => p.status === 'Completed').reduce((sum, p) => sum + Number(p.amount), 0),
                        paymentStatus: latestPayment ? latestPayment.status : 'No Data'
                    };
                });
                setSubscriptions(merged);
            }
        } catch (error) {
            console.error('Error fetching subscriptions:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleQuickPay = (payment) => {
        setConfirmDialog({ isOpen: true, payment });
    };

    const confirmQuickPay = async () => {
        const payment = confirmDialog.payment;
        setConfirmDialog({ isOpen: false, payment: null });
        try {
            const payload = { ...payment, status: 'Completed', payment_date: new Date().toISOString() };
            // eslint-disable-next-line no-unused-vars
            const { users, players, ...cleanPayload } = payload;
            const res = await authFetch(`${API_URL}/finances/payments/${payment.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(cleanPayload)
            });
            if (res.ok) { fetchSubscriptions(); showBanner('تم تأكيد الدفع بنجاح!', 'success'); }
            else { showBanner('فشل في تأكيد الدفع', 'error'); }
        } catch (error) { showBanner('خطأ: ' + error.message, 'error'); }
    };

    const filtered = subscriptions.filter(s => 
        s.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.parent_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const InvoiceModal = ({ data, onClose }) => {
        if (!data) return null;
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in text-right" dir="rtl">
                <div className="bg-white rounded-[2.5rem] w-full max-w-2xl premium-shadow overflow-hidden border border-slate-200">
                    <div className="px-10 py-8 border-b border-slate-100 bg-slate-50 flex justify-between items-center flex-row-reverse">
                        <div className="flex items-center gap-3 flex-row-reverse">
                            <Receipt size={28} className="text-indigo-600" />
                            <h3 className="font-black text-slate-800 text-2xl tracking-tight">تفاصيل الوصل</h3>
                        </div>
                        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-2 hover:bg-white rounded-full transition-all"><X size={20} /></button>
                    </div>
                    <div className="p-10 space-y-10 text-right">
                        <div className="grid grid-cols-2 gap-10">
                            <div>
                                <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] mb-4">جهة الإصدار</p>
                                <div className="text-sm font-black text-slate-900 leading-relaxed uppercase">أكاديمية أثليتيك الرياضية</div>
                                <div className="text-[11px] font-bold text-slate-400 mt-2 tracking-wide leading-relaxed">القنيطرة، المغرب<br />(+212) 000-000-000</div>
                            </div>
                            <div className="text-left">
                                <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] mb-4">تاريخ الوصل</p>
                                <div className="text-sm font-black text-slate-900 uppercase">{new Date().toLocaleDateString('ar-MA')}</div>
                            </div>
                        </div>

                        <div className="bg-slate-50 rounded-3xl p-8 border border-slate-100 flex flex-col gap-6">
                            <div className="flex justify-between items-center flex-row-reverse border-b border-slate-200/50 pb-5">
                                <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">المستفيد (اللاعب)</span>
                                <span className="text-sm font-black text-slate-900 uppercase tracking-tight">{data.full_name}</span>
                            </div>
                            <div className="flex justify-between items-center flex-row-reverse border-b border-slate-200/50 pb-5">
                                <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">ولي الأمر</span>
                                <span className="text-sm font-black text-slate-900 uppercase tracking-tight">{data.parent_name}</span>
                            </div>
                            <div className="flex justify-between items-center flex-row-reverse border-b border-slate-200/50 pb-5">
                                <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">العرض / الاشتراك</span>
                                <span className="text-sm font-black text-slate-900 uppercase tracking-tight">{data.subscription_type}</span>
                            </div>
                            <div className="flex justify-between items-center flex-row-reverse pt-2">
                                <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">إجمالي المبلغ المؤدى</span>
                                <span className="text-3xl font-black text-emerald-600 tracking-tighter">{data.totalPaid || 0} درهم</span>
                            </div>
                        </div>

                        <div className="flex gap-4 pt-6 flex-row-reverse">
                            <button className="flex-1 bg-slate-900 text-white rounded-2xl py-5 font-black uppercase tracking-[0.2em] text-xs shadow-xl shadow-slate-200 hover:bg-slate-800 transition-all flex items-center justify-center gap-3 active:scale-95 flex-row-reverse"><Download size={18} /><span>تحميل نسخه PDF</span></button>
                            <button onClick={onClose} className="px-10 py-5 bg-white border border-slate-200 text-slate-400 rounded-2xl font-black uppercase tracking-[0.2em] text-xs hover:bg-slate-50 transition-all flex items-center justify-center gap-3 active:scale-95 flex-row-reverse">إغلاق</button>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="animate-fade-in pb-16 text-right" dir="rtl">
            {/* Status Banner */}
            {statusBanner.show && (
                <div key={statusBanner.id} className="fixed top-24 left-1/2 -translate-x-1/2 z-[200] animate-fade-in">
                    <div className={`flex items-center gap-4 px-8 py-4 rounded-[2rem] shadow-2xl border-2 backdrop-blur-md ${statusBanner.type === 'success' ? 'bg-emerald-600/90 border-emerald-400 text-white' : 'bg-red-600/90 border-red-400 text-white'}`}>
                        {statusBanner.type === 'success' ? <CheckCircle2 size={24} /> : <AlertCircle size={24} />}
                        <span className="font-black text-base" dir="ltr">{statusBanner.message}</span>
                        <button onClick={() => setStatusBanner({ ...statusBanner, show: false })} className="ml-4 hover:bg-white/20 p-1 rounded-full"><X size={16} /></button>
                    </div>
                </div>
            )}
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3 flex-row-reverse">
                        تتبع <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-600">الاشتراكات</span>
                    </h1>
                    <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mt-1">متابعة الالتزامات المالية والتحصيلات الشهرية</p>
                </div>
                <div className="flex gap-3 w-full md:w-auto flex-row-reverse">
                    <button className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-white border border-slate-200 text-slate-500 px-6 py-4 rounded-2xl font-black uppercase tracking-widest text-[11px] hover:text-indigo-600 hover:border-indigo-100 transition-all shadow-sm flex-row-reverse">
                        <Download size={18} />
                        <span>تحميل التقرير</span>
                    </button>
                    <button onClick={() => fetchSubscriptions()} className="p-4 bg-white border border-slate-200 rounded-2xl text-slate-400 hover:text-emerald-600 hover:border-emerald-100 transition-all shadow-sm active:rotate-180 duration-500 flex-row-reverse">
                        <Clock size={18} />
                    </button>
                </div>
            </div>

            {/* List & Search */}
            <div className="bg-white rounded-[2.5rem] border border-slate-200 premium-shadow overflow-hidden border-b-8 border-b-emerald-600 text-right">
                <div className="px-8 py-6 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50/50 flex-row-reverse">
                    <div className="flex items-center gap-3 flex-row-reverse text-right">
                        <BadgeCheck size={20} className="text-emerald-600" />
                        <h2 className="font-extrabold text-slate-800 text-lg">سجل الفوترة والتحصيل</h2>
                    </div>
                    <div className="relative w-full sm:w-80">
                        <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                        <input 
                            type="text"
                            placeholder="بحث باللاعب أو ولي الأمر..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pr-12 pl-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all text-right shadow-sm"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto min-h-[500px] text-right">
                    <table className="w-full text-right" dir="rtl">
                        <thead>
                            <tr className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] border-b border-slate-100">
                                <th className="px-8 py-6 text-right uppercase">هوية اللاعب</th>
                                <th className="px-8 py-6 text-right uppercase">ولي الأمر</th>
                                <th className="px-8 py-6 text-center uppercase whitespace-nowrap">العرض</th>
                                <th className="px-8 py-6 text-center uppercase whitespace-nowrap">الوضعية المالية</th>
                                <th className="px-8 py-6 text-left uppercase">تحكم</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {isLoading ? (
                                <tr>
                                    <td colSpan="5" className="px-8 py-40 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
                                            <span className="text-xs font-black text-slate-400 uppercase tracking-widest mt-2">جاري تحميل البيانات المالية...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : filtered.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-8 py-40 text-center text-slate-400 font-bold uppercase tracking-widest text-xs opacity-50">
                                        لا توجد بيانات متاحة حالياً
                                    </td>
                                </tr>
                            ) : (
                                filtered.map((sub, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50 transition-colors group text-right">
                                        <td className="px-8 py-6 text-right">
                                            <div className="flex items-center gap-4 flex-row-reverse text-right">
                                                <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-colors shadow-sm">
                                                    <UserCircle size={24} />
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-[15px] font-extrabold text-slate-900 tracking-tight leading-none mb-1">{sub.full_name}</div>
                                                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{sub.u_category}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            <div className="font-bold text-slate-800 text-sm">{sub.parent_name}</div>
                                            <div className="flex items-center justify-end gap-2 mt-1 flex-row-reverse">
                                                <span className="text-[11px] font-bold text-slate-400" dir="ltr">{sub.parent_whatsapp || '—'}</span>
                                                {sub.parent_whatsapp && (
                                                    <a href={`https://wa.me/${sub.parent_whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(`أكاديمية أثليتيك: بخصوص وضعية الاشتراك الخاصة بـ ${sub.full_name}.`)}`} target="_blank" rel="noreferrer" className="text-emerald-500 hover:scale-110 active:scale-95 transition-all"><Smartphone size={14} /></a>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-8 py-6 text-center">
                                            <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap shadow-sm border ${sub.subscription_type === 'Free' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-slate-50 text-slate-600 border-slate-100'}`}>
                                                {sub.subscription_type === 'Free' ? 'مجاني 🎁' : sub.subscription_type}
                                            </span>
                                        </td>
                                        <td className="px-8 py-6 text-center">
                                            {sub.subscription_type === 'Free' ? (
                                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 font-extrabold text-[10px] border border-emerald-100 uppercase flex-row-reverse">
                                                    <CheckCircle2 size={12} /> معفي
                                                </span>
                                            ) : sub.paymentStatus === 'Completed' ? (
                                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 text-white font-extrabold text-[10px] shadow-sm uppercase flex-row-reverse">
                                                    <CheckCircle2 size={12} /> تم التحصيل
                                                </span>
                                            ) : (
                                                <div className="flex items-center justify-center gap-2">
                                                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 text-amber-700 font-extrabold text-[10px] border border-amber-100 uppercase flex-row-reverse">
                                                        <Clock size={12} /> معلق
                                                    </span>
                                                    {sub.latestPayment && (
                                                        <button 
                                                            onClick={() => handleQuickPay(sub.latestPayment)}
                                                            className="p-1 px-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-all shadow-md active:scale-90"
                                                            title="تأكيد التحصيل (وصلنا)"
                                                        >
                                                            <Check size={14} />
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-8 py-6 text-left">
                                            <button 
                                                onClick={() => setSelectedInvoice(sub)}
                                                className="p-3 bg-white border border-slate-200 text-slate-300 hover:text-indigo-600 hover:border-indigo-100 rounded-2xl transition-all shadow-sm active:scale-95"
                                                title="عرض الوصل"
                                            >
                                                <Eye size={20} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {selectedInvoice && <InvoiceModal data={selectedInvoice} onClose={() => setSelectedInvoice(null)} />}

            <ConfirmDialog
                isOpen={confirmDialog.isOpen}
                onConfirm={confirmQuickPay}
                onCancel={() => setConfirmDialog({ isOpen: false, payment: null })}
                isRTL={true}
                title="تأكيد الدفع"
                message="هل تأكدت من استلام المبلغ وتسجيله؟"
                confirmText="نعم، وصلنا!"
            />
        </div>
    );
};

export default SubscriptionsManagement;
