import React, { useRef } from 'react';
import { X, Download, Printer } from 'lucide-react';
import html2canvas from 'html2canvas';

const InvoiceModal = ({ isOpen, onClose, payment, academyName, academyLogo, isRTL }) => {
    const invoiceRef = useRef(null);

    if (!isOpen || !payment) return null;

    const displayName = academyName || 'ACADEMY';
    const logoInitial = displayName.charAt(0).toUpperCase();
    const playerName = payment.users?.full_name || 'غير معروف';
    const paymentDate = payment.payment_date ? new Date(payment.payment_date).toLocaleDateString('ar-MA', { year: 'numeric', month: 'long', day: 'numeric' }) : new Date().toLocaleDateString('ar-MA', { year: 'numeric', month: 'long', day: 'numeric' });
    const invoiceNo = `INV-${(payment.id || '').substring(0, 8).toUpperCase()}`;
    const isPaid = payment.status === 'Completed' || payment.status === 'paid';

    const handleDownload = async () => {
        if (!invoiceRef.current) return;
        try {
            const canvas = await html2canvas(invoiceRef.current, {
                backgroundColor: '#ffffff',
                scale: 3,
                useCORS: true
            });
            const link = document.createElement('a');
            link.download = `invoice-${playerName.replace(/\s+/g, '-')}-${invoiceNo}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        } catch (err) {
            console.error('Failed to download invoice', err);
        }
    };

    const handlePrint = () => {
        const printContent = invoiceRef.current;
        if (!printContent) return;
        const w = window.open('', '_blank', 'width=400,height=600');
        w.document.write(`
            <html><head><title>Invoice ${invoiceNo}</title>
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; font-family: 'Segoe UI', Tahoma, sans-serif; }
                body { display: flex; justify-content: center; padding: 10px; background: #fff; }
                @media print { body { padding: 0; } }
            </style>
            </head><body>${printContent.outerHTML}</body></html>
        `);
        w.document.close();
        setTimeout(() => { w.print(); w.close(); }, 400);
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-fade-in" dir="rtl">
            <div className="relative flex flex-col items-center max-w-[360px] w-full">
                {/* Close */}
                <button onClick={onClose}
                    className="absolute -top-14 left-0 h-11 w-11 flex items-center justify-center rounded-full bg-white/10 text-white border border-white/20 hover:bg-white/30 hover:rotate-90 transition-all duration-300 z-50">
                    <X size={22} />
                </button>

                {/* Invoice Card */}
                <div ref={invoiceRef}
                    style={{
                        width: '320px',
                        background: '#ffffff',
                        borderRadius: '20px',
                        overflow: 'hidden',
                        fontFamily: "'Segoe UI', Tahoma, sans-serif",
                        border: '1px solid #e2e8f0',
                        boxShadow: '0 20px 60px rgba(0,0,0,0.15)'
                    }}>

                    {/* Header */}
                    <div style={{
                        background: 'linear-gradient(135deg, #0f172a, #1e293b)',
                        padding: '24px 24px 20px',
                        textAlign: 'center',
                        position: 'relative',
                        overflow: 'hidden'
                    }}>
                        {/* Decorative circles */}
                        <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '80px', height: '80px', borderRadius: '50%', border: '6px solid rgba(255,255,255,0.05)' }} />
                        <div style={{ position: 'absolute', bottom: '-15px', left: '-15px', width: '60px', height: '60px', borderRadius: '50%', border: '4px solid rgba(255,255,255,0.05)' }} />

                        {/* Logo */}
                        <div style={{
                            width: '52px', height: '52px', borderRadius: '14px', background: '#ffffff',
                            margin: '0 auto 12px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            overflow: 'hidden', boxShadow: '0 4px 15px rgba(0,0,0,0.2)'
                        }}>
                            {academyLogo ? (
                                <img src={academyLogo} alt="logo" crossOrigin="anonymous"
                                    style={{ width: '40px', height: '40px', objectFit: 'contain' }} />
                            ) : (
                                <span style={{ fontWeight: 900, fontSize: '22px', color: '#0f172a' }}>{logoInitial}</span>
                            )}
                        </div>

                        <div style={{ fontWeight: 900, fontSize: '15px', color: '#ffffff', letterSpacing: '0.12em', textTransform: 'uppercase', lineHeight: 1.3 }}>
                            {displayName}
                        </div>
                        <div style={{ fontSize: '9px', fontWeight: 700, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.2em', textTransform: 'uppercase', marginTop: '4px' }}>
                            وصل أداء — REÇU DE PAIEMENT
                        </div>
                    </div>

                    {/* Invoice Number & Date Bar */}
                    <div style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '12px 24px',
                        background: '#f8fafc',
                        borderBottom: '1px solid #f1f5f9'
                    }}>
                        <div>
                            <div style={{ fontSize: '8px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.15em' }}>رقم الوصل</div>
                            <div style={{ fontSize: '12px', fontWeight: 900, color: '#0f172a', letterSpacing: '0.05em', direction: 'ltr' }}>{invoiceNo}</div>
                        </div>
                        <div style={{ textAlign: 'left' }}>
                            <div style={{ fontSize: '8px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.15em' }}>التاريخ</div>
                            <div style={{ fontSize: '11px', fontWeight: 800, color: '#475569' }}>{paymentDate}</div>
                        </div>
                    </div>

                    {/* Player Info */}
                    <div style={{ padding: '20px 24px 16px' }}>
                        <div style={{ fontSize: '8px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: '8px' }}>
                            بيانات المنخرط
                        </div>
                        <div style={{
                            background: '#f8fafc', borderRadius: '14px', padding: '14px 16px',
                            border: '1px solid #f1f5f9'
                        }}>
                            <div style={{ fontWeight: 900, fontSize: '16px', color: '#0f172a', marginBottom: '4px', lineHeight: 1.2 }}>
                                {playerName}
                            </div>
                            {payment.users?.u_category && (
                                <span style={{
                                    display: 'inline-block', fontSize: '9px', fontWeight: 800, color: '#6366f1',
                                    background: '#eef2ff', padding: '2px 10px', borderRadius: '8px',
                                    border: '1px solid #e0e7ff', textTransform: 'uppercase', letterSpacing: '0.1em'
                                }}>
                                    {payment.users.u_category}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Payment Details */}
                    <div style={{ padding: '0 24px 20px' }}>
                        <div style={{ fontSize: '8px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: '10px' }}>
                            تفاصيل الأداء
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px dashed #e2e8f0' }}>
                            <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748b' }}>المبلغ</span>
                            <span style={{ fontSize: '14px', fontWeight: 900, color: '#0f172a' }}>{payment.amount} درهم</span>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px dashed #e2e8f0' }}>
                            <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748b' }}>وسيلة الأداء</span>
                            <span style={{ fontSize: '12px', fontWeight: 800, color: '#334155' }}>
                                {payment.payment_method === 'Cash' ? 'نقداً' : payment.payment_method === 'Card' ? 'بطاقة بنكية' : 'تحويل بنكي'}
                            </span>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px dashed #e2e8f0' }}>
                            <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748b' }}>الحالة</span>
                            <span style={{
                                fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em',
                                padding: '4px 12px', borderRadius: '10px',
                                background: isPaid ? '#ecfdf5' : '#fffbeb',
                                color: isPaid ? '#059669' : '#d97706',
                                border: isPaid ? '1px solid #a7f3d0' : '1px solid #fde68a'
                            }}>
                                {isPaid ? '✓ مؤدى' : '⏳ معلق'}
                            </span>
                        </div>

                        {payment.notes && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0' }}>
                                <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748b' }}>ملاحظات</span>
                                <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', maxWidth: '160px', textAlign: 'left' }}>{payment.notes}</span>
                            </div>
                        )}
                    </div>

                    {/* Total */}
                    <div style={{
                        margin: '0 24px', padding: '16px 20px', borderRadius: '16px',
                        background: 'linear-gradient(135deg, #0f172a, #1e293b)',
                        textAlign: 'center', marginBottom: '20px'
                    }}>
                        <div style={{ fontSize: '8px', fontWeight: 800, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: '4px' }}>
                            المبلغ الإجمالي
                        </div>
                        <div style={{ fontSize: '28px', fontWeight: 900, color: '#ffffff', letterSpacing: '-0.03em' }}>
                            {payment.amount} <span style={{ fontSize: '14px', fontWeight: 700, opacity: 0.7 }}>MAD</span>
                        </div>
                    </div>

                    {/* Footer */}
                    <div style={{
                        padding: '14px 24px',
                        background: '#f8fafc',
                        borderTop: '1px solid #f1f5f9',
                        textAlign: 'center'
                    }}>
                        <div style={{ fontSize: '8px', fontWeight: 700, color: '#cbd5e1', textTransform: 'uppercase', letterSpacing: '0.15em', lineHeight: 1.8 }}>
                            هذا الوصل يثبت عملية الأداء المذكورة أعلاه
                            <br />
                            CE REÇU CONFIRME LE PAIEMENT CI-DESSUS
                        </div>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 mt-6 w-full max-w-[320px]">
                    <button onClick={handleDownload}
                        className="flex-1 flex items-center justify-center gap-2 bg-white/10 hover:bg-white border border-white/20 hover:border-white text-white hover:text-slate-900 px-6 py-3.5 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all duration-300 backdrop-blur-sm">
                        <Download size={16} /> تحميل
                    </button>
                    <button onClick={handlePrint}
                        className="flex-1 flex items-center justify-center gap-2 bg-white/10 hover:bg-white border border-white/20 hover:border-white text-white hover:text-slate-900 px-6 py-3.5 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all duration-300 backdrop-blur-sm">
                        <Printer size={16} /> طباعة
                    </button>
                </div>
            </div>
        </div>
    );
};

export default InvoiceModal;
