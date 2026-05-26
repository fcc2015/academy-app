import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Loader2, Check, CheckCircle } from 'lucide-react';
import PhotoUploadCrop from './PhotoUploadCrop';

const playerSchema = z.object({
    full_name: z.string().min(3, { message: 'Must be at least 3 characters' }),
    parent_name: z.string().min(3, { message: 'Must be at least 3 characters' }),
    birth_date: z.string().min(1, { message: 'Birth date is required' }),
    parent_whatsapp: z.string().regex(/^\+?[0-9]{8,15}$/, { message: 'Invalid phone format (e.g. +212600000000)' }),
    parent_email: z.string().email({ message: 'Invalid email format' }).or(z.literal('')).optional().nullable(),
    address: z.string().min(3, { message: 'Must be at least 3 characters' }),
    u_category: z.string().min(1, { message: 'Age category is required' }),
    technical_level: z.string().default('B'),
    account_status: z.string().default('Pending'),
    branch_id: z.string().optional().nullable(),
    subscription_type: z.string().default('Monthly'),
    blood_type: z.string().optional().nullable(),
    medical_cert_valid_until: z.string().optional().nullable(),
    emergency_contact: z.string().optional().nullable(),
    transport_zone: z.string().optional().nullable(),
    allergies: z.string().optional().nullable(),
    coach_notes: z.string().optional().nullable(),
    photo_url: z.string().optional().nullable(),
});

const PlayerModal = ({
    isOpen, onClose, onSubmit, title, isEdit, modalStep, setModalStep,
    formData, subscriptionPlans, isSubmitting, settings, t, isRTL, dir, branches = [],
    showCoachNotes = false
}) => {
    const { register, handleSubmit, trigger, formState: { errors }, setValue, watch, reset } = useForm({
        resolver: zodResolver(playerSchema),
        defaultValues: formData
    });

    useEffect(() => {
        if (isOpen) {
            reset(formData);
        }
    }, [isOpen, formData, reset]);

    if (!isOpen) return null;

    const currentSubscriptionType = watch('subscription_type');
    const photoUrl = watch('photo_url');
    const selectedPlanObj = subscriptionPlans.find(p => p.name === currentSubscriptionType) || null;

    const computeUCategory = (birthDateStr, ageCategories) => {
        if (!birthDateStr || !ageCategories?.length) return null;
        const birth = new Date(birthDateStr);
        if (isNaN(birth)) return null;
        const today = new Date();
        const seasonYear = today.getMonth() >= 7 ? today.getFullYear() : today.getFullYear() - 1;
        const ageAtSeasonStart = seasonYear - birth.getFullYear();
        const targetU = `U${ageAtSeasonStart}`;
        const exact = ageCategories.find(c => c.toUpperCase() === targetU);
        if (exact) return exact;
        const prefix = ageCategories.find(c =>
            c.toUpperCase() === targetU ||
            c.toUpperCase().startsWith(targetU + ' ') ||
            c.toUpperCase().startsWith(targetU + '-')
        );
        if (prefix) return prefix;
        if (ageAtSeasonStart >= 18) {
            const senior = ageCategories.find(c => c.toLowerCase().includes('senior'));
            if (senior) return senior;
        }
        return null;
    };

    const getErrorMessage = (field) => {
        const err = errors[field];
        if (!err) return null;
        if (isRTL) {
            if (err.type === 'required' || err.message.includes('required') || err.message.includes('required')) return 'هذا الحقل مطلوب';
            if (err.message.includes('at least 3')) return 'يجب أن يكون 3 أحرف على الأقل';
            if (err.message.includes('Invalid phone')) return 'رقم الهاتف غير صالح (مثال: +212600000000)';
            if (err.message.includes('Invalid email')) return 'البريد الإلكتروني غير صالح';
            return err.message;
        }
        return err.message;
    };

    const goNext = async (e) => {
        e.preventDefault();
        const fieldsToValidate = [
            'full_name', 'parent_name', 'birth_date', 'parent_whatsapp', 'parent_email', 'address', 'u_category'
        ];
        const isValid = await trigger(fieldsToValidate);
        if (isValid) {
            setModalStep(2);
        }
    };

    const doSubmit = (data) => {
        onSubmit(data);
    };

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
                    <form onSubmit={isEdit ? handleSubmit(doSubmit) : goNext} className="flex-1 flex flex-col min-h-0 overflow-hidden">
                        <div className="p-6 sm:p-8 space-y-6 overflow-y-auto custom-scrollbar flex-1">
                            {/* Photo upload */}
                            <div className="flex flex-col items-center gap-1 pb-4 border-b border-slate-100">
                                <PhotoUploadCrop
                                    value={photoUrl || ''}
                                    onChange={(url) => setValue('photo_url', url)}
                                />
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Player Photo (optional)</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">{t('players.fullName')}</label>
                                    <input type="text" {...register('full_name')} placeholder={isRTL ? 'الاسم والنسب' : 'Full Name'} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-sm font-bold outline-none" />
                                    {errors.full_name && <p className="text-xs text-red-500 font-bold mt-1">{getErrorMessage('full_name')}</p>}
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">{t('players.parentName')}</label>
                                    <input type="text" {...register('parent_name')} placeholder={isRTL ? 'اسم المسؤول' : 'Parent Name'} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-sm font-bold outline-none" />
                                    {errors.parent_name && <p className="text-xs text-red-500 font-bold mt-1">{getErrorMessage('parent_name')}</p>}
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">{t('players.birthDate')}</label>
                                    <input type="date" {...register('birth_date', {
                                        onChange: (e) => {
                                            const val = e.target.value;
                                            if (val) {
                                                const auto = computeUCategory(val, settings?.age_categories);
                                                if (auto) setValue('u_category', auto);
                                            }
                                        }
                                    })} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-sm font-bold outline-none" />
                                    {errors.birth_date && <p className="text-xs text-red-500 font-bold mt-1">{getErrorMessage('birth_date')}</p>}
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">{t('players.phone')}</label>
                                    <input type="tel" {...register('parent_whatsapp')} placeholder="+212 6..." className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-sm font-bold outline-none" dir="ltr" />
                                    {errors.parent_whatsapp && <p className="text-xs text-red-500 font-bold mt-1">{getErrorMessage('parent_whatsapp')}</p>}
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">{isRTL ? 'إيميل ولي الأمر (اختياري)' : 'Parent Email (optional)'}</label>
                                    <input type="text" {...register('parent_email')} placeholder={isRTL ? 'email@example.com' : 'email@example.com'} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-sm font-bold outline-none" dir="ltr" />
                                    {errors.parent_email && <p className="text-xs text-red-500 font-bold mt-1">{getErrorMessage('parent_email')}</p>}
                                    <p className="text-[9px] text-indigo-500 font-bold mt-1">{isRTL ? '💡 إلا دخلتي الإيميل، غادي يتخلق حساب تلقائي للأب' : '💡 If provided, a login account is auto-created for the parent'}</p>
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">{t('players.address')}</label>
                                    <input type="text" {...register('address')} placeholder={isRTL ? 'الحي الشارع، المدينة' : 'Neighborhood, Street, City'} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-sm font-bold outline-none" />
                                    {errors.address && <p className="text-xs text-red-500 font-bold mt-1">{getErrorMessage('address')}</p>}
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">{t('players.ageCategory')}</label>
                                    <select {...register('u_category')} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-sm font-bold outline-none">
                                        {settings?.age_categories?.map(c => <option key={c} value={c}>{c}</option>) || <option value="U11">U11</option>}
                                    </select>
                                    {errors.u_category && <p className="text-xs text-red-500 font-bold mt-1">{getErrorMessage('u_category')}</p>}
                                </div>
                                {isEdit && (
                                    <>
                                        <div>
                                            <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">{t('players.technicalLevel')}</label>
                                            <select {...register('technical_level')} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-sm font-bold outline-none">
                                                <option value="A">{isRTL ? 'نخبة (A)' : 'Elite (A)'}</option>
                                                <option value="B">{isRTL ? 'هاوي (B)' : 'Amateur (B)'}</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">{t('common.status')}</label>
                                            <select {...register('account_status')} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-sm font-bold outline-none">
                                                <option value="Active">{t('players.active')}</option>
                                                <option value="Pending">{t('players.pending')}</option>
                                                <option value="Suspended">{t('players.suspended')}</option>
                                            </select>
                                        </div>
                                        {branches.length > 0 && (
                                            <div>
                                                <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">{isRTL ? 'الفرع' : 'Branch'}</label>
                                                <select {...register('branch_id')} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-sm font-bold outline-none">
                                                    <option value="">{isRTL ? '— بدون فرع —' : '— No branch —'}</option>
                                                    {branches.map(b => <option key={b.id} value={b.id}>{b.name}{b.city ? ` (${b.city})` : ''}</option>)}
                                                </select>
                                            </div>
                                        )}
                                        <div>
                                            <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">{t('players.subscriptionType')}</label>
                                            <select {...register('subscription_type')} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-sm font-bold outline-none">
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
                                            <select {...register('blood_type')} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-sm font-bold outline-none" dir="ltr">
                                                <option value="">-- غير محدد --</option>
                                                {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bt => <option key={bt} value={bt}>{bt}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">صلاحية الشهادة الطبية</label>
                                            <input type="date" {...register('medical_cert_valid_until')} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-sm font-bold outline-none" />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">جهة الاتصال للطوارئ</label>
                                            <input type="text" {...register('emergency_contact')} placeholder="الاسم ورقم الهاتف..." className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-sm font-bold outline-none" />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">منطقة النقل</label>
                                            <input type="text" {...register('transport_zone')} placeholder="مثال: وسط المدينة" className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-sm font-bold outline-none" />
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">حساسية أو أمراض سابقة</label>
                                            <input type="text" {...register('allergies')} placeholder="لا يوجد" className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-sm font-bold outline-none" />
                                        </div>
                                    </div>
                                    {showCoachNotes && (
                                        <div className="md:col-span-2 pt-4 border-t border-amber-100 mt-2">
                                            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
                                                <label className="block text-[10px] font-black uppercase text-amber-600 tracking-widest mb-2">
                                                    🔒 {isRTL ? 'ملاحظات المدرب (سرية)' : 'Coach Notes (Private)'}
                                                </label>
                                                <textarea
                                                    {...register('coach_notes')}
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
                    <form onSubmit={handleSubmit(doSubmit)} className="flex-1 flex flex-col min-h-0 overflow-hidden">
                        <div className="p-6 sm:p-8 space-y-6 overflow-y-auto custom-scrollbar flex-1">
                            <label className={`block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-4 flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>🏆 {t('players.choosePlan')}</label>
                            <div className="grid grid-cols-1 gap-4">
                                <label className={`flex items-center gap-4 p-5 rounded-2xl border-2 cursor-pointer transition-all ${isRTL ? 'flex-row-reverse' : ''} ${currentSubscriptionType === 'Free' ? 'border-emerald-500 bg-emerald-50/50 shadow-sm' : 'border-slate-100'}`}>
                                    <input type="radio" value="Free" {...register('subscription_type')} className="accent-emerald-500" />
                                    <div className={`flex-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                                        <div className="font-extrabold text-slate-800 text-sm">{isRTL ? 'مجاني (عرض خاص)' : 'Free (Special Offer)'}</div>
                                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter mt-0.5">{isRTL ? 'للأيتام أو الحالات الاجتماعية' : 'For orphans or social cases'}</div>
                                    </div>
                                    <span className="text-lg font-black text-emerald-600">0 {t('common.currency')}</span>
                                </label>
                                {subscriptionPlans.filter(p => !p.billing_cycles?.includes('free')).map(plan => (
                                    <label key={plan.id} className={`flex items-center gap-4 p-5 rounded-2xl border-2 cursor-pointer transition-all ${isRTL ? 'flex-row-reverse' : ''} ${currentSubscriptionType === plan.name ? 'border-indigo-500 bg-indigo-50/50 shadow-sm' : 'border-slate-100'}`}>
                                        <input type="radio" value={plan.name} {...register('subscription_type')} className="accent-indigo-600" />
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
                                    <div className={`flex justify-between text-sm font-bold ${isRTL ? 'flex-row-reverse' : ''}`}><span className="text-slate-400">{isRTL ? 'اللاعب:' : 'Player:'}</span><span className="text-slate-900">{watch('full_name')}</span></div>
                                    <div className={`flex justify-between text-sm font-bold border-t border-slate-200 pt-3 mt-1 ${isRTL ? 'flex-row-reverse' : ''}`}><span className="text-slate-400">{t('players.totalMonthly')}:</span><span className="text-lg font-black text-slate-900">{currentSubscriptionType === 'Free' ? `0 ${t('common.currency')}` : `${selectedPlanObj?.monthly_price || 0} ${t('common.currency')}`}</span></div>
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
