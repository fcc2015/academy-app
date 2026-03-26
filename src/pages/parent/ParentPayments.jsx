import { API_URL } from '../../config';
import React, { useState, useEffect } from 'react';
import { CreditCard, CheckCircle2, Clock, AlertTriangle, TrendingUp, Upload, X, Camera, Send } from 'lucide-react';

const ParentPayments = () => {
    const [payments, setPayments] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [childInfo, setChildInfo] = useState(null);
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    
    // Upload form state
    const [uploadData, setUploadData] = useState({
        amount: '',
        payment_method: 'Bank Transfer',
        notes: ''
    });

    const userId = localStorage.getItem('user_id');

    const fetchPayments = React.useCallback(async () => {
        try {
            let childUserId = null;
            const playersRes = await fetch(`${API_URL}/players/`);
            if (playersRes.ok) {
                const players = await playersRes.json();
                const child = players.find(p => p.user_id === userId || p.parent_id === userId) || players[0];
                if (child) {
                    childUserId = child.user_id;
                    setChildInfo(child);
                }
            }

            const res = await fetch(`${API_URL}/finances/payments`);
            if (res.ok) {
                const allPayments = await res.json();
                const filtered = allPayments.filter(p => p.user_id === childUserId || p.user_id === userId);
                setPayments(filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
            }
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setIsLoading(false);
        }
    }, [userId]);

    useEffect(() => {
        fetchPayments();
    }, [fetchPayments]);

    const handleUploadSubmit = async (e) => {
        e.preventDefault();
        setIsUploading(true);

        try {
            // MVP: Simulate file upload, we just send a "Pending" payment to the backend
            const payload = {
                user_id: childInfo?.user_id || userId,
                player_id: childInfo?.id || null,
                amount: parseFloat(uploadData.amount),
                status: 'Pending',
                payment_method: uploadData.payment_method,
                notes: `تم رفع إيصال: ${uploadData.notes}`,
                billing_type: 'monthly',
                payment_date: new Date().toISOString()
            };

            const res = await fetch(`${API_URL}/finances/payments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                alert('تم إرسال وصل الدفع للإدارة بنجاح ليتم مراجعته.');
                setIsUploadModalOpen(false);
                setUploadData({ amount: '', payment_method: 'Bank Transfer', notes: '' });
                fetchPayments(); // Refresh list
            } else {
                alert('حدث خطأ أثناء الإرسال');
            }
        } catch (error) {
            console.error('Submit error:', error);
            alert('خطأ في الاتصال');
        } finally {
            setIsUploading(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-600"></div>
            </div>
        );
    }

    const totalPaid = payments.filter(p => p.status === 'Completed' || p.status === 'paid').reduce((sum, p) => sum + (p.amount || 0), 0);
    const totalPending = payments.filter(p => p.status === 'Pending' || p.status === 'pending').reduce((sum, p) => sum + (p.amount || 0), 0);
    const paidCount = payments.filter(p => p.status === 'Completed' || p.status === 'paid').length;
    const pendingCount = payments.filter(p => p.status === 'Pending' || p.status === 'pending').length;

    return (
        <div className="animate-fade-in space-y-8 text-right" dir="rtl">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 mb-1">
                        الوضعية <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-500 to-emerald-600">المالية</span>
                    </h1>
                    <p className="text-[15px] font-medium text-slate-500">متابعة رسوم الانخراط والدفعات السابقة</p>
                </div>
                <button
                    onClick={() => setIsUploadModalOpen(true)}
                    className="flex items-center gap-2 bg-gradient-to-r from-sky-600 to-indigo-600 text-white px-5 py-2.5 rounded-xl font-black transition-all shadow-lg hover:shadow-sky-500/30 hover:scale-105"
                >
                    <Upload size={20} />
                    إرسال إثبات الدفع
                </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                <div className="bg-white rounded-2xl border border-slate-200 premium-shadow p-6 relative overflow-hidden group hover:border-emerald-200 transition-colors">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-full blur-3xl -mx-10 -my-10 opacity-50"></div>
                    <div className="flex items-center gap-3 mb-4 relative z-10">
                        <div className="p-3 rounded-xl bg-emerald-100 text-emerald-600 border border-emerald-200">
                            <TrendingUp size={22} />
                        </div>
                    </div>
                    <h4 className="text-3xl font-black text-slate-800 relative z-10" dir="ltr">{totalPaid} <span className="text-base text-slate-400">MAD</span></h4>
                    <p className="text-sm font-bold text-slate-500 mt-1 relative z-10">إجمالي المدفوعات</p>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 premium-shadow p-6 relative overflow-hidden group hover:border-amber-200 transition-colors">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-amber-50 rounded-full blur-3xl -mx-10 -my-10 opacity-50"></div>
                    <div className="flex items-center gap-3 mb-4 relative z-10">
                        <div className="p-3 rounded-xl bg-amber-100 text-amber-600 border border-amber-200">
                            <Clock size={22} />
                        </div>
                    </div>
                    <h4 className="text-3xl font-black text-slate-800 relative z-10" dir="ltr">{totalPending} <span className="text-base text-slate-400">MAD</span></h4>
                    <p className="text-sm font-bold text-slate-500 mt-1 relative z-10">قيد المراجعة</p>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 premium-shadow p-6 relative">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-3 rounded-xl bg-sky-100 text-sky-600 border border-sky-200">
                            <CheckCircle2 size={22} />
                        </div>
                    </div>
                    <h4 className="text-3xl font-black text-slate-800">{paidCount}</h4>
                    <p className="text-sm font-bold text-slate-500 mt-1">اشتبراكات مؤكدة</p>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 premium-shadow p-6 relative">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-3 rounded-xl bg-slate-100 text-slate-600 border border-slate-200">
                            <AlertTriangle size={22} />
                        </div>
                    </div>
                    <h4 className="text-3xl font-black text-slate-800">{pendingCount}</h4>
                    <p className="text-sm font-bold text-slate-500 mt-1">يُرجى التحقق منها</p>
                </div>
            </div>

            {/* Payment Table */}
            <div className="bg-white rounded-[2.5rem] border border-slate-200 premium-shadow overflow-hidden p-2">
                <div className="px-6 py-5 rounded-3xl bg-slate-50 flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                        <CreditCard size={20} className="text-indigo-600" />
                        <h3 className="font-extrabold text-slate-800 text-lg">كل العمليات</h3>
                    </div>
                    <span className="text-xs font-black text-slate-400 bg-white px-3 py-1.5 rounded-xl border border-slate-100">{payments.length} عملية</span>
                </div>

                {payments.length === 0 ? (
                    <div className="p-12 text-center text-slate-500 bg-slate-50/50 rounded-3xl mx-2 mb-2">
                        <CreditCard className="mx-auto mb-4 opacity-50" size={48} />
                        <h4 className="font-bold text-slate-700 mb-2">لا توجد عمليات</h4>
                        <p className="text-sm">لم تقم بأي عملية دفع حتى الآن.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-right">
                            <thead className="bg-transparent border-b border-slate-100">
                                <tr className="text-[11px] font-black uppercase text-slate-400">
                                    <th className="px-6 py-4">تاريخ الدفع</th>
                                    <th className="px-6 py-4">المبلغ</th>
                                    <th className="px-6 py-4">طريقة الدفع</th>
                                    <th className="px-6 py-4 text-center">الحالة</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50/80">
                                {payments.map((payment, i) => (
                                    <tr key={i} className="hover:bg-slate-50/80 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-slate-800">
                                                {payment.payment_date ? new Date(payment.payment_date).toLocaleDateString('en-GB') : 'N/A'}
                                            </div>
                                            {payment.notes && <div className="text-xs text-slate-500 mt-1 truncate max-w-[150px]">{payment.notes}</div>}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-black text-slate-900 bg-slate-50 inline-block px-3 py-1 rounded-lg border border-slate-100 shadow-sm" dir="ltr">
                                                {payment.amount} <span className="text-[10px] text-slate-400">MAD</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm font-medium text-slate-600">
                                            {payment.payment_method === 'Cash' ? 'نقداً (Cash)' :
                                             payment.payment_method === 'Bank Transfer' ? 'تحويل بنكي' :
                                             payment.payment_method === 'Wafacash' ? 'وفاكاش' :
                                             payment.payment_method}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black ${
                                                payment.status === 'Completed' || payment.status === 'paid'
                                                    ? 'bg-emerald-100 text-emerald-700'
                                                    : payment.status === 'Overdue'
                                                    ? 'bg-red-100 text-red-700'
                                                    : 'bg-amber-100 text-amber-700'
                                            }`}>
                                                {payment.status === 'Completed' || payment.status === 'paid' ? <CheckCircle2 size={14} /> : 
                                                 payment.status === 'Overdue' ? <AlertTriangle size={14} /> : <Clock size={14} />}
                                                
                                                {payment.status === 'Completed' || payment.status === 'paid' ? 'تم الدفع' : 
                                                 payment.status === 'Overdue' ? 'متأخر' : 'قيد المراجعة'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Upload Receipt Modal */}
            {isUploadModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-[2.5rem] p-6 sm:p-8 w-full max-w-md shadow-2xl relative border border-slate-100">
                        <button 
                            onClick={() => setIsUploadModalOpen(false)}
                            className="absolute top-6 left-6 text-slate-400 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-full p-2 transition-colors"
                        >
                            <X size={20} />
                        </button>

                        <h2 className="text-2xl font-black text-slate-800 mb-2 flex items-center gap-2">
                            <Camera className="text-sky-600" /> إرسال إثبات دفع
                        </h2>
                        <p className="text-slate-500 text-sm font-medium mb-6 leading-relaxed">قم بتعبئة معلومات الدفع وإرفاق صورة التوصيل البنكي أو وفاكاش.</p>

                        <form onSubmit={handleUploadSubmit} className="space-y-5">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">المبلغ المالي (درهم)</label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        min="0"
                                        required
                                        value={uploadData.amount}
                                        onChange={(e) => setUploadData({...uploadData, amount: e.target.value})}
                                        className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500 bg-slate-50 focus:bg-white transition-colors text-xl font-black"
                                        dir="ltr"
                                    />
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">MAD</span>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">طريقة الدفع</label>
                                <select
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500 bg-slate-50 focus:bg-white font-bold text-slate-700"
                                    value={uploadData.payment_method}
                                    onChange={(e) => setUploadData({...uploadData, payment_method: e.target.value})}
                                >
                                    <option value="Bank Transfer">تحويل بنكي (Virement)</option>
                                    <option value="Wafacash">وكالة Wafacash</option>
                                    <option value="Cash">نقداً في الأكاديمية</option>
                                </select>
                            </div>

                            {/* Simulated Upload Box */}
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">صورة الوصل (اختياري حالياً)</label>
                                <div className="border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center bg-slate-50 hover:bg-sky-50 hover:border-sky-300 transition-colors cursor-pointer group">
                                    <Camera className="mx-auto text-slate-400 group-hover:text-sky-500 mb-2 transition-colors" size={28} />
                                    <span className="text-sm font-bold text-slate-600 group-hover:text-sky-700">اضغط لالتقاط أو اختيار صورة</span>
                                    <p className="text-[10px] text-slate-400 mt-1">يُدعم صور PNG و JPG (ميزة تجريبية)</p>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">ملاحظة (رقم الحوالة مثلاً)</label>
                                <input
                                    type="text"
                                    value={uploadData.notes}
                                    onChange={(e) => setUploadData({...uploadData, notes: e.target.value})}
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500 bg-slate-50 focus:bg-white"
                                    placeholder="اختياري..."
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={isUploading}
                                className="w-full py-3.5 rounded-xl font-black bg-gradient-to-r from-sky-600 to-indigo-600 text-white flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-sky-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-lg"
                            >
                                {isUploading ? 'جاري الإرسال...' : (
                                    <>
                                        <Send size={20} /> تأكيد وإرسال
                                    </>
                                )}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ParentPayments;
