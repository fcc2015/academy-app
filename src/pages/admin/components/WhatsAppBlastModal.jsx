import React, { useState } from 'react';
import { X, MessageSquare, Loader2, Send } from 'lucide-react';
import { useToast } from '../../../components/Toast';
import { authFetch } from '../../../api';
import { API_URL } from '../../../config';

const WhatsAppBlastModal = ({ isOpen, onClose, selectedPlayerIds, players, t, isRTL, dir }) => {
    const [message, setMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const toast = useToast();

    if (!isOpen) return null;

    // Get selected players info
    const selectedPlayers = players.filter(p => selectedPlayerIds.includes(p.user_id));
    const playersWithPhone = selectedPlayers.filter(p => p.parent_whatsapp);
    const playersWithoutPhone = selectedPlayers.filter(p => !p.parent_whatsapp);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!message.trim()) {
            toast.error(isRTL ? 'المرجو كتابة نص الرسالة أولاً' : 'Please enter a message.');
            return;
        }

        setIsSubmitting(true);
        try {
            const res = await authFetch(`${API_URL}/notifications/whatsapp-blast`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: message.trim(),
                    target_role: 'parent',
                    player_ids: selectedPlayerIds
                })
            });

            if (res.ok) {
                const data = await res.json();
                toast.success(
                    isRTL
                        ? `تم إرسال ${data.sent_count} رسالة بنجاح! ${data.failed_count > 0 ? `(فشل: ${data.failed_count})` : ''}`
                        : `Successfully sent ${data.sent_count} messages! ${data.failed_count > 0 ? `(Failed: ${data.failed_count})` : ''}`
                );
                onClose();
            } else {
                const errData = await res.json();
                toast.error(errData.detail || (isRTL ? 'فشل إرسال الرسائل' : 'Failed to send messages'));
            }
        } catch (err) {
            toast.error(err.message || (isRTL ? 'تعذر الاتصال بالخادم' : 'Server error'));
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className={`fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-sm flex items-start justify-center p-4 sm:p-6 overflow-y-auto ${isRTL ? 'text-right' : 'text-left'}`} dir={dir}>
            <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg flex flex-col border border-slate-200 my-auto" style={{ maxHeight: '90vh', overflow: 'hidden' }}>
                {/* Header */}
                <div className={`flex justify-between items-center p-6 sm:p-8 border-b border-slate-100 bg-slate-50/55 shrink-0 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
                            <MessageSquare size={22} />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-slate-800 tracking-tight">
                                {isRTL ? 'إرسال رسالة واتساب جماعية' : 'WhatsApp Blast'}
                            </h2>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">
                                {isRTL ? `${playersWithPhone.length} مستلم جاهز` : `${playersWithPhone.length} recipients ready`}
                            </p>
                        </div>
                    </div>
                    <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600 hover:bg-white p-2 rounded-full transition-all border border-transparent">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
                    <div className="p-6 sm:p-8 space-y-6 overflow-y-auto custom-scrollbar flex-1">
                        
                        {/* Target Info */}
                        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                                {isRTL ? 'اللاعبون المحددون' : 'Selected Players'}
                            </div>
                            <p className="text-xs font-bold text-slate-600">
                                {isRTL 
                                    ? `سوف يتم إرسال الرسالة إلى أولياء أمور اللاعبين المحددين الذين يتوفر لديهم رقم واتساب.`
                                    : `The message will be sent to the parents of selected players who have a WhatsApp phone number.`}
                            </p>
                            
                            {playersWithoutPhone.length > 0 && (
                                <div className="mt-3 p-3 bg-amber-50 rounded-xl border border-amber-200 text-[10px] font-black uppercase tracking-wider text-amber-700">
                                    ⚠️ {isRTL 
                                        ? `تنبيه: ${playersWithoutPhone.length} لاعبين ليس لديهم رقم هاتف مُسجل (سيتم استبعادهم).`
                                        : `Notice: ${playersWithoutPhone.length} players do not have a WhatsApp number (will be skipped).`}
                                </div>
                            )}
                        </div>

                        {/* Text Message */}
                        <div>
                            <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">
                                {isRTL ? 'نص الرسالة' : 'Message Text'}
                            </label>
                            <textarea
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                rows={6}
                                maxLength={1000}
                                placeholder={isRTL 
                                    ? "اكتب رسالتك هنا... استخدم {player_name} لتعويض اسم اللاعب تلقائياً." 
                                    : "Type your message here... Use {player_name} to dynamically insert the player's name."}
                                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-semibold outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 resize-none transition-all"
                            />
                            
                            {/* Templates Quick Help */}
                            <div className="mt-3 flex flex-wrap gap-2">
                                <button
                                    type="button"
                                    onClick={() => setMessage(prev => prev + ' {player_name}')}
                                    className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-xl text-[10px] font-black uppercase tracking-wider transition-colors"
                                >
                                    + {isRTL ? 'اسم اللاعب' : 'Player Name'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setMessage(isRTL 
                                        ? 'السلام عليكم، نذكركم بحصة التدريب القادمة للاعب {player_name}. المرجو الحضور في الوقت.' 
                                        : 'Hello, this is a reminder for {player_name}\'s upcoming training session. Please ensure timely arrival.')}
                                    className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded-xl text-[10px] font-black uppercase tracking-wider transition-colors"
                                >
                                    ⚡ {isRTL ? 'تذكير بالتدريب' : 'Training Reminder'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setMessage(isRTL 
                                        ? 'السلام عليكم، نود تذكيركم بوجود مستحقات غير مؤداة للاعب {player_name}. المرجو تسوية الوضعية في أقرب وقت. شكراً.' 
                                        : 'Hello, this is a reminder that subscription payment for {player_name} is outstanding. Please clear it at your earliest convenience. Thank you.')}
                                    className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-[10px] font-black uppercase tracking-wider transition-colors"
                                >
                                    ⚡ {isRTL ? 'تذكير بالأداء' : 'Payment Reminder'}
                                </button>
                            </div>
                        </div>

                    </div>

                    {/* Footer */}
                    <div className={`flex justify-end gap-3 p-6 sm:p-8 border-t border-slate-100 shrink-0 bg-white ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <button 
                            type="submit" 
                            disabled={isSubmitting || playersWithPhone.length === 0} 
                            className={`flex items-center gap-2 px-8 py-4 text-xs font-black uppercase tracking-widest text-white bg-emerald-600 disabled:bg-slate-200 disabled:text-slate-400 rounded-2xl shadow-xl hover:shadow-emerald-600/40 disabled:shadow-none transition-all min-w-[160px] justify-center active:scale-95 ${isRTL ? 'flex-row-reverse' : ''}`}
                        >
                            {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                            <span>{isRTL ? 'إرسال الرسائل' : 'Send Blast'}</span>
                        </button>
                        <button type="button" onClick={onClose} className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-400 hover:bg-slate-50 rounded-2xl transition-all">
                            {t('common.cancel')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default WhatsAppBlastModal;
