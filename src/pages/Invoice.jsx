import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { authFetch } from '../api';
import { API_URL } from '../config';
import { Printer, ArrowRight, Download, CheckCircle, Clock, XCircle } from 'lucide-react';

const Invoice = () => {
    const { paymentId } = useParams();
    const navigate = useNavigate();
    const printRef = useRef();

    const [payment, setPayment] = useState(null);
    const [settings, setSettings] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [settingsRes, paymentRes] = await Promise.all([
                    authFetch(`${API_URL}/settings`),
                    authFetch(`${API_URL}/finances/payments/${paymentId}`)
                ]);

                if (settingsRes.ok) {
                    const s = await settingsRes.json();
                    setSettings(s);
                }

                if (paymentRes.ok) {
                    const p = await paymentRes.json();
                    setPayment(p);
                } else if (paymentRes.status === 404) {
                    setError('Payment not found.');
                } else {
                    setError('Could not load payment data.');
                }
            } catch (e) {
                setError('Connection error.');
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [paymentId]);

    const handlePrint = () => {
        window.print();
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="w-8 h-8 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
            </div>
        );
    }

    if (error || !payment) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-4">
                <XCircle size={48} className="text-red-400" />
                <p className="text-slate-600 font-bold">{error || 'Payment not found'}</p>
                <button onClick={() => navigate(-1)} className="text-indigo-600 flex items-center gap-2 font-bold">
                    <ArrowRight size={18} /> Go Back
                </button>
            </div>
        );
    }

    const statusColors = {
        Completed: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', icon: <CheckCircle size={16} /> },
        paid: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', icon: <CheckCircle size={16} /> },
        Pending: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', icon: <Clock size={16} /> },
        Cancelled: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', icon: <XCircle size={16} /> },
    };
    const sc = statusColors[payment.status] || statusColors['Pending'];

    const billingTypeLabel = {
        monthly: 'شهري',
        annual: 'سنوي',
        hybrid: 'فصلي',
        prorata: 'تسوية أولى'
    };

    const methodLabel = {
        Cash: 'نقداً',
        'Bank Transfer': 'تحويل بنكي',
        Wafacash: 'وفاكاش',
        CashPlus: 'كاش بلوس',
        PayPal: 'باي بال',
        Card: 'بطاقة بنكية',
        Online: 'أونلاين',
        Virement: 'تحويل بنكي',
        Other: 'أخرى'
    };

    const paymentDate = payment.payment_date
        ? new Date(payment.payment_date).toLocaleDateString('ar-MA', { year: 'numeric', month: 'long', day: 'numeric' })
        : new Date().toLocaleDateString('ar-MA', { year: 'numeric', month: 'long', day: 'numeric' });

    const invoiceNum = payment.invoice_number || `INV-${payment.id?.slice(0, 8)?.toUpperCase()}`;
    const academyName = settings?.academy_name || 'الأكاديمية';
    const academyPhone = settings?.contact_phone || '';
    const academyEmail = settings?.contact_email || '';
    const academyAddress = settings?.address || '';
    const logoUrl = settings?.logo_url || null;
    const currency = settings?.currency || 'MAD';

    return (
        <>
            {/* Print Controls — hidden during print */}
            <div className="no-print fixed top-0 left-0 right-0 z-50 bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between shadow-sm">
                <button
                    onClick={() => navigate(-1)}
                    className="flex items-center gap-2 text-slate-600 hover:text-slate-900 font-bold transition-colors"
                >
                    <ArrowRight size={18} />
                    رجوع
                </button>
                <div className="flex items-center gap-3">
                    <button
                        onClick={handlePrint}
                        className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-5 py-2 rounded-xl font-bold shadow hover:shadow-indigo-500/30 transition-all hover:scale-105"
                    >
                        <Printer size={18} />
                        طباعة / تحميل PDF
                    </button>
                </div>
            </div>

            {/* Invoice Page */}
            <div className="min-h-screen bg-slate-100 pt-20 pb-12 no-print-bg" dir="rtl">
                <div
                    ref={printRef}
                    className="invoice-page max-w-2xl mx-auto bg-white shadow-xl rounded-3xl overflow-hidden"
                    style={{ fontFamily: "'Segoe UI', Arial, sans-serif" }}
                >
                    {/* Header */}
                    <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-800 p-8 text-white relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-64 h-64 bg-white/5 rounded-full -translate-x-32 -translate-y-32" />
                        <div className="absolute bottom-0 right-0 w-48 h-48 bg-white/5 rounded-full translate-x-16 translate-y-16" />

                        <div className="relative z-10 flex items-start justify-between">
                            <div className="text-right">
                                {logoUrl ? (
                                    <img
                                        src={logoUrl}
                                        alt="Academy Logo"
                                        className="h-16 w-16 object-contain rounded-2xl bg-white/10 p-1 mb-3"
                                    />
                                ) : (
                                    <div className="h-16 w-16 rounded-2xl bg-white/20 flex items-center justify-center text-2xl font-black mb-3">
                                        {academyName.charAt(0)}
                                    </div>
                                )}
                                <h1 className="text-2xl font-black">{academyName}</h1>
                                {academyAddress && <p className="text-indigo-200 text-sm mt-1">{academyAddress}</p>}
                                {academyPhone && <p className="text-indigo-200 text-sm">{academyPhone}</p>}
                                {academyEmail && <p className="text-indigo-200 text-sm">{academyEmail}</p>}
                            </div>
                            <div className="text-left">
                                <p className="text-indigo-300 text-xs uppercase tracking-widest font-bold mb-1">INVOICE</p>
                                <h2 className="text-3xl font-black tracking-tight" dir="ltr">{invoiceNum}</h2>
                                <p className="text-indigo-200 text-sm mt-2">{paymentDate}</p>
                            </div>
                        </div>
                    </div>

                    {/* Status Banner */}
                    <div className={`px-8 py-3 flex items-center justify-center gap-2 ${sc.bg} ${sc.text} border-b ${sc.border} font-black text-sm`}>
                        {sc.icon}
                        {payment.status === 'Completed' || payment.status === 'paid' ? 'تم الدفع بنجاح' :
                         payment.status === 'Pending' ? 'في انتظار التأكيد' :
                         payment.status === 'Cancelled' ? 'ملغى' : payment.status}
                    </div>

                    {/* Body */}
                    <div className="p-8 space-y-6">

                        {/* Payment Details Table */}
                        <div>
                            <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3">تفاصيل الدفعة</h3>
                            <div className="bg-slate-50 rounded-2xl overflow-hidden border border-slate-100">
                                <table className="w-full">
                                    <tbody className="divide-y divide-slate-100">
                                        <tr>
                                            <td className="px-5 py-3 text-sm text-slate-500 font-bold">رقم الفاتورة</td>
                                            <td className="px-5 py-3 text-sm font-black text-slate-800 text-left" dir="ltr">{invoiceNum}</td>
                                        </tr>
                                        <tr>
                                            <td className="px-5 py-3 text-sm text-slate-500 font-bold">تاريخ الدفع</td>
                                            <td className="px-5 py-3 text-sm font-black text-slate-800 text-left">{paymentDate}</td>
                                        </tr>
                                        <tr>
                                            <td className="px-5 py-3 text-sm text-slate-500 font-bold">طريقة الدفع</td>
                                            <td className="px-5 py-3 text-sm font-black text-slate-800 text-left">
                                                {methodLabel[payment.payment_method] || payment.payment_method}
                                            </td>
                                        </tr>
                                        {payment.billing_type && (
                                            <tr>
                                                <td className="px-5 py-3 text-sm text-slate-500 font-bold">نوع الاشتراك</td>
                                                <td className="px-5 py-3 text-sm font-black text-slate-800 text-left">
                                                    {billingTypeLabel[payment.billing_type] || payment.billing_type}
                                                </td>
                                            </tr>
                                        )}
                                        {payment.period_start && payment.period_end && (
                                            <tr>
                                                <td className="px-5 py-3 text-sm text-slate-500 font-bold">الفترة</td>
                                                <td className="px-5 py-3 text-sm font-black text-slate-800 text-left" dir="ltr">
                                                    {payment.period_start} → {payment.period_end}
                                                </td>
                                            </tr>
                                        )}
                                        {payment.due_date && (
                                            <tr>
                                                <td className="px-5 py-3 text-sm text-slate-500 font-bold">تاريخ الاستحقاق</td>
                                                <td className="px-5 py-3 text-sm font-black text-slate-800 text-left">{payment.due_date}</td>
                                            </tr>
                                        )}
                                        {payment.notes && (
                                            <tr>
                                                <td className="px-5 py-3 text-sm text-slate-500 font-bold">ملاحظات</td>
                                                <td className="px-5 py-3 text-sm text-slate-600 text-left">{payment.notes}</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Amount */}
                        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100 rounded-2xl p-6 flex items-center justify-between">
                            <div>
                                <p className="text-xs font-black uppercase tracking-widest text-indigo-400 mb-1">المبلغ الإجمالي</p>
                                <p className="text-4xl font-black text-indigo-800" dir="ltr">
                                    {payment.amount?.toFixed(2)} <span className="text-lg text-indigo-400">{currency}</span>
                                </p>
                            </div>
                            {payment.amount_due && payment.amount_due !== payment.amount && (
                                <div className="text-right">
                                    <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-1">المبلغ المستحق</p>
                                    <p className="text-2xl font-black text-slate-600" dir="ltr">
                                        {payment.amount_due?.toFixed(2)} <span className="text-sm text-slate-400">{currency}</span>
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Footer Note */}
                        <p className="text-center text-xs text-slate-400 font-medium pt-2">
                            شكراً لثقتكم في {academyName}. هذه الفاتورة صادرة إلكترونياً ولا تحتاج إلى توقيع.
                        </p>
                    </div>

                    {/* Bottom Accent */}
                    <div className="h-2 bg-gradient-to-r from-indigo-600 via-purple-500 to-pink-500" />
                </div>
            </div>

            {/* Print Styles */}
            <style>{`
                @media print {
                    .no-print { display: none !important; }
                    .no-print-bg { background: white !important; padding: 0 !important; }
                    .invoice-page { 
                        box-shadow: none !important; 
                        border-radius: 0 !important; 
                        max-width: 100% !important; 
                    }
                    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                }
            `}</style>
        </>
    );
};

export default Invoice;
