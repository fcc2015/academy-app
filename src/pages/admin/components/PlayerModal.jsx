import React from 'react';
import { X, Loader2, Check, CheckCircle } from 'lucide-react';
import PhotoUploadCrop from './PhotoUploadCrop';

const PlayerModal = ({
    isOpen, onClose, onSubmit, title, isEdit, modalStep, setModalStep,
    formData, handleInputChange, subscriptionPlans, isSubmitting, settings, t, isRTL, dir, branches = [],
    showCoachNotes = false
}) => {
    if (!isOpen) return null;
    const selectedPlanObj = subscriptionPlans.find(p => p.name === formData.subscription_type) || null;

    const goNext = (e) => { e.preventDefault(); setModalStep(2); };
    const doSubmit = (e) => { onSubmit(e); };

    return (
        <div className={`fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-sm flex items-start justify-center p-4 sm:p-6 overflow-y-auto ${isRTL ? 'text-right' : 'text-left'}`} dir={dir}>
            <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl flex flex-col border border-slate-200 my-auto" style={{ maxHeight: '90vh', overflow: 'hidden' }}>
                <div className={`flex justify-between items-center p-6 sm:p-8 border-b border-slate-100 bg-slate-50/50 shrink-0 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <div>
                        <h2 className="text-xl font-black text-slate-800 tracking-tight">{title}</h2>
                        {!isEdit && (
                            <div className={`flex items-center gap-2 mt-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                <div className={`w-10 h-1.5 rounded-full ${modalStep >= 1 ? 'bg-indigo-600' : 'bg-slate-200'}`} />
                                <div className={`w-10 h-1.5 rounded-full ${modalStep >= 2 ? 'bg-indigo-600' : 'bg-slate-200'}`} />
                                <span className={`${isRTL ? 'mr-3' : 'ml-3'} text-[10px] text-slate-400 font-bold uppercase`}>{t('players.step')} {modalStep} / 2</span>
                            </div>
                        )}
                    </div>
                    <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600 hover:bg-white p-2 rounded-full transition-all border border-transparent">
                        <X size={20} />
                    </button>
                </div>

                {(isEdit || modalStep === 1) && (
                    <form onSubmit={isEdit ? doSubmit : goNext} className="flex-1 flex flex-col min-h-0 overflow-hidden">
                        <div className="p-6 sm:p-8 space-y-6 overflow-y-auto custom-scrollbar flex-1">
                            {/* Photo upload — centered above the grid */}
                            <div className="flex flex-col items-center gap-1 pb-4 border-b border-slate-100">
                                <PhotoUploadCrop
                                    value={formData.photo_url}
                                    onChange={(url) => handleInputChange({ target: { name: 'photo_url', value: url } })}
                                />
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Player Photo (optional)</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">{t('players.fullName')}</label>
                                    <input required type="text" name="full_name" value={formData.full_name} onChange={handleInputChange} placeholder={isRTL ? 'الاسم والنسب' : 'Full Name'} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-sm font-bold outline-none" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">{t('players.parentName')}</label>
                                    <input required type="text" name="parent_name" value={formData.parent_name} onChange={handleInputChange} placeholder={isRTL ? 'اسم المسؤول' : 'Parent Name'} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-sm font-bold outline-none" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">{t('players.birthDate')}</label>
                                    <input required type="date" name="birth_date" value={formData.birth_date} onChange={handleInputChange} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-sm font-bold outline-none" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">{t('players.phone')}</label>
                                    <input required type="tel" name="parent_whatsapp" value={formData.parent_whatsapp} onChange={handleInputChange} 
                                        pattern="^\+?[0-9]{8,15}$" 
                                        title="Must be a valid phone number, e.g., +212600000000"
                                        placeholder="+212 6..." className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-sm font-bold outline-none" dir="ltr" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">{isRTL ? 'إيميل ولي الأمر (اختياري)' : 'Parent Email (optional)'}</label>
                                    <input type="email" name="parent_email" value={formData.parent_email || ''} onChange={handleInputChange} placeholder={isRTL ? 'email@example.com — لإنشاء حساب تلقائي' : 'email@example.com — auto-creates login'} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-sm font-bold outline-none" dir="ltr" />
                                    <p className="text-[9px] text-indigo-500 font-bold mt-1">{isRTL ? '💡 إلا دخلتي الإيميل، غادي يتخلق حساب تلقائي للأب' : '💡 If provided, a login account is auto-created for the parent'}</p>
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">{t('players.address')}</label>
                                    <input required type="text" name="address" value={formData.address} onChange={handleInputChange} placeholder={isRTL ? 'الحي الشارع، المدينة' : 'Neighborhood, Street, City'} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-sm font-bold outline-none" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">{t('players.ageCategory')}</label>
                                    <select name="u_category" value={formData.u_category} onChange={handleInputChange} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-sm font-bold outline-none">
                                        {settings?.age_categories?.map(c => <option key={c} value={c}>{c}</option>) || <option value="U11">U11</option>}
                                    </select>
                                </div>
                                {isEdit && (
                                    <>
                                        <div>
                                            <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">{t('players.technicalLevel')}</label>
                                            <select name="technical_level" value={formData.technical_level} onChange={handleInputChange} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-sm font-bold outline-none">
                                                <option value="A">{isRTL ? 'نخبة (A)' : 'Elite (A)'}</option>
                                                <option value="B">{isRTL ? 'هاوي (B)' : 'Amateur (B)'}</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">{t('common.status')}</label>
                                            <select name="account_status" value={formData.account_status} onChange={handleInputChange} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-sm font-bold outline-none">
                                                <option value="Active">{t('players.active')}</option>
                                                <option value="Pending">{t('players.pending')}</option>
                                                <option value="Suspended">{t('players.suspended')}</option>
                                            </select>
                                        </div>
                                        {branches.length > 0 && (
                                            <div>
                                                <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">{isRTL ? 'الفرع' : 'Branch'}</label>
                                                <select name="branch_id" value={formData.branch_id || ''} onChange={handleInputChange} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-sm font-bold outline-none">
                                                    <option value="">{isRTL ? '— بدون فرع —' : '— No branch —'}</option>
                                                    {branches.map(b => <option key={b.id} value={b.id}>{b.name}{b.city ? ` (${b.city})` : ''}</option>)}
                                                </select>
                                            </div>
                                        )}
                                        <div>
                                            <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">{t('players.subscriptionType')}</label>
                                            <select name="subscription_type" value={formData.subscription_type} onChange={handleInputChange} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-sm font-bold outline-none">
                                                <option value="Free">{isRTL ? 'مجاني (للمعوزين)' : 'Free (Social Case)'}</option>
                                                {subscriptionPlans.map(plan => <option key={plan.id} value={plan.name}>{plan.name}</option>)}
                                            </select>
                                        </div>
                                    </>
                                )}
                                <div className="md:col-span-2 pt-4 border-t border-slate-100 mt-2">
                                    <h4 className="text-[11px] font-black uppercase text-slate-500 tracking-widest mb-4">البيانات الطبية والتنقل (اختياري)</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">فصيلة الدم</label>
                                            <select name="blood_type" value={formData.blood_type || ''} onChange={handleInputChange} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-sm font-bold outline-none" dir="ltr">
                                                <option value="">-- غير محدد --</option>
                                                {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bt => <option key={bt} value={bt}>{bt}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">صلاحية الشهادة الطبية</label>
                                            <input type="date" name="medical_cert_valid_until" value={formData.medical_cert_valid_until || ''} onChange={handleInputChange} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-sm font-bold outline-none" />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">جهة الاتصال للطوارئ</label>
                                            <input type="text" name="emergency_contact" value={formData.emergency_contact || ''} onChange={handleInputChange} placeholder="الاسم ورقم الهاتف..." className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-sm font-bold outline-none" />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">منطقة النقل</label>
                                            <input type="text" name="transport_zone" value={formData.transport_zone || ''} onChange={handleInputChange} placeholder="مثال: وسط المدينة" className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-sm font-bold outline-none" />
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">حساسية أو أمراض سابقة</label>
                                            <input type="text" name="allergies" value={formData.allergies || ''} onChange={handleInputChange} placeholder="لا يوجد" className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-sm font-bold outline-none" />
                                        </div>
                                    </div>
                                    {/* Coach Notes — only visible to coach/admin/super_admin roles */}
                                    {showCoachNotes && (
                                        <div className="md:col-span-2 pt-4 border-t border-amber-100 mt-2">
                                            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
                                                <label className="block text-[10px] font-black uppercase text-amber-600 tracking-widest mb-2">
                                                    🔒 {isRTL ? 'ملاحظات المدرب (سرية)' : 'Coach Notes (Private)'}
                                                </label>
                                                <textarea
                                                    name="coach_notes"
                                                    value={formData.coach_notes || ''}
                                                    onChange={handleInputChange}
                                                    rows={4}
                                                    maxLength={2000}
                                                    placeholder={isRTL ? 'ملاحظات خاصة لا تظهر للاعب أو ولي الأمر...' : 'Private notes not visible to player or parent...'}
                                                    className="w-full bg-white border border-amber-200 rounded-xl px-4 py-3 text-sm font-medium outline-none resize-none focus:ring-2 focus:ring-amber-300"
                                                />
                                                <p className="text-[9px] font-bold text-amber-500 mt-1">
                                                    {isRTL ? '⚠️ هذه الملاحظات مشفرة ولا تظهر للاعب أو ولي أمره.' : '⚠️ These notes are encrypted and never visible to player or parent.'}
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className={`flex justify-end gap-3 p-6 sm:p-8 border-t border-slate-100 shrink-0 bg-white ${isRTL ? 'flex-row-reverse' : ''}`}>
                            <button type="submit" disabled={isSubmitting} className={`flex items-center gap-2 px-8 py-3.5 text-xs font-black uppercase tracking-widest text-white bg-indigo-600 rounded-2xl shadow-xl hover:shadow-indigo-600/40 transition-all min-w-[160px] justify-center active:scale-95 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : (isEdit ? <Check size={18} /> : null)}
                                <span>{isEdit ? t('players.editPlayer') : (isRTL ? 'التالي (العروض) ←' : 'Next (Plans) →')}</span>
                            </button>
                            <button type="button" onClick={onClose} className="px-6 py-3.5 text-xs font-black uppercase tracking-widest text-slate-400 hover:bg-slate-50 rounded-2xl transition-all">{t('common.cancel')}</button>
                        </div>
                    </form>
                )}

                {!isEdit && modalStep === 2 && (
                    <form onSubmit={doSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
                        <div className="p-6 sm:p-8 space-y-6 overflow-y-auto custom-scrollbar flex-1">
                            <label className={`block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-4 flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>🏆 {t('players.choosePlan')}</label>
                            <div className="grid grid-cols-1 gap-4">
                                <label className={`flex items-center gap-4 p-5 rounded-2xl border-2 cursor-pointer transition-all ${isRTL ? 'flex-row-reverse' : ''} ${formData.subscription_type === 'Free' ? 'border-emerald-500 bg-emerald-50/50 shadow-sm' : 'border-slate-100'}`}>
                                    <input type="radio" name="subscription_type" value="Free" checked={formData.subscription_type === 'Free'} onChange={handleInputChange} className="accent-emerald-500" />
                                    <div className={`flex-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                                        <div className="font-extrabold text-slate-800 text-sm">{isRTL ? 'مجاني (عرض خاص)' : 'Free (Special Offer)'}</div>
                                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter mt-0.5">{isRTL ? 'للأيتام أو الحالات الاجتماعية' : 'For orphans or social cases'}</div>
                                    </div>
                                    <span className="text-lg font-black text-emerald-600">0 {t('common.currency')}</span>
                                </label>
                                {subscriptionPlans.filter(p => !p.billing_cycles?.includes('free')).map(plan => (
                                    <label key={plan.id} className={`flex items-center gap-4 p-5 rounded-2xl border-2 cursor-pointer transition-all ${isRTL ? 'flex-row-reverse' : ''} ${formData.subscription_type === plan.name ? 'border-indigo-500 bg-indigo-50/50 shadow-sm' : 'border-slate-100'}`}>
                                        <input type="radio" name="subscription_type" value={plan.name} checked={formData.subscription_type === plan.name} onChange={handleInputChange} className="accent-indigo-600" />
                                        <div className={`flex-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                                            <div className="font-extrabold text-slate-800 text-sm">{plan.name}</div>
                                        </div>
                                        <div className={`${isRTL ? 'text-left' : 'text-right'} font-black text-indigo-700 text-sm`}>
                                            {plan.monthly_price} {t('common.currency')}/{isRTL ? 'شهر' : 'mo'}
                                        </div>
                                    </label>
                                ))}
                            </div>
                            <div className="bg-slate-50 rounded-[2rem] p-6 border border-slate-100">
                                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">{t('players.profileSummary')}</div>
                                <div className="space-y-3">
                                    <div className={`flex justify-between text-sm font-bold ${isRTL ? 'flex-row-reverse' : ''}`}><span className="text-slate-400">{isRTL ? 'اللاعب:' : 'Player:'}</span><span className="text-slate-900">{formData.full_name}</span></div>
                                    <div className={`flex justify-between text-sm font-bold border-t border-slate-200 pt-3 mt-1 ${isRTL ? 'flex-row-reverse' : ''}`}><span className="text-slate-400">{t('players.totalMonthly')}:</span><span className="text-lg font-black text-slate-900">{formData.subscription_type === 'Free' ? `0 ${t('common.currency')}` : `${selectedPlanObj?.monthly_price || 0} ${t('common.currency')}`}</span></div>
                                </div>
                            </div>
                        </div>
                        <div className={`flex justify-between gap-4 p-6 sm:p-8 border-t border-slate-100 shrink-0 bg-white ${isRTL ? 'flex-row-reverse' : ''}`}>
                            <button type="submit" disabled={isSubmitting} className={`flex-1 items-center gap-2 px-8 py-4 text-xs font-black uppercase tracking-widest text-white bg-indigo-600 rounded-2xl shadow-xl flex justify-center transition-all active:scale-95 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />}
                                <span>{t('players.confirmRegister')}</span>
                            </button>
                            <button type="button" onClick={() => setModalStep(1)} className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-400 hover:bg-slate-50 rounded-2xl transition-all">{t('common.back')}</button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};

export default PlayerModal;
