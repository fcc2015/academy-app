import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  MapPin, Phone, Mail, Globe, ExternalLink, Link,
  MessageCircle, Users, Star, CheckCircle, ChevronDown, X,
  Award, Shield, Trophy, Calendar, Send, Loader2, ArrowLeft,
  Zap, Heart, Clock, Play
} from 'lucide-react';

import { API_URL } from '../config.js';

/* ─── Helpers ─────────────────────────────────────────────── */
function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r}, ${g}, ${b}`;
}

function darken(hex, amt = 30) {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.max(0, (num >> 16) - amt);
  const g = Math.max(0, ((num >> 8) & 0xff) - amt);
  const b = Math.max(0, (num & 0xff) - amt);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

/* ─── Registration Modal ──────────────────────────────────── */
function RegisterModal({ academy, plans, onClose }) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    name: '', phone: '', email: '',
    player_name: '', birth_date: '', plan_name: '', message: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/public/requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, type: 'registration' })
      });
      if (res.ok) setDone(true);
    } catch (_) {}
    finally { setSubmitting(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-in">
        {/* Header */}
        <div className="p-6 text-white relative" style={{ background: `linear-gradient(135deg, ${academy.primary_color}, ${academy.secondary_color})` }}>
          <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.2)' }}>
            <X size={16} />
          </button>
          {academy.logo_url && (
            <img src={academy.logo_url} alt="" className="w-12 h-12 rounded-xl object-cover mb-3 border-2 border-white/30" />
          )}
          <h2 className="text-xl font-black">التسجيل في {academy.name}</h2>
          <p className="text-sm opacity-80 mt-1">أكمل النموذج وسنتصل بك خلال 24 ساعة</p>
          {/* Steps */}
          <div className="flex items-center gap-2 mt-4">
            {[1,2].map(s => (
              <div key={s} className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black transition-all ${step >= s ? 'bg-white text-gray-900' : 'bg-white/20 text-white'}`}>{s}</div>
                {s < 2 && <div className={`h-0.5 w-8 transition-all ${step > s ? 'bg-white' : 'bg-white/30'}`} />}
              </div>
            ))}
          </div>
        </div>

        {done ? (
          <div className="p-8 text-center">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: `rgba(${hexToRgb(academy.primary_color)}, 0.1)` }}>
              <CheckCircle size={32} style={{ color: academy.primary_color }} />
            </div>
            <h3 className="text-xl font-black text-slate-900 mb-2">تم إرسال الطلب!</h3>
            <p className="text-slate-500 text-sm mb-6">سيتواصل معك فريق الأكاديمية قريباً على رقم <span className="font-bold text-slate-700">{form.phone}</span></p>
            <button onClick={onClose} className="w-full py-3 rounded-xl font-bold text-white" style={{ background: academy.primary_color }}>
              إغلاق
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {step === 1 ? (
              <>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">اسم ولي الأمر *</label>
                  <input required value={form.name} onChange={e => setForm(p => ({...p, name: e.target.value}))}
                    placeholder="الاسم الكامل"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 text-sm"
                    style={{ '--tw-ring-color': academy.primary_color }} />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">رقم الهاتف *</label>
                  <input required value={form.phone} onChange={e => setForm(p => ({...p, phone: e.target.value}))}
                    placeholder="+212 6XX XXX XXX" type="tel"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">البريد الإلكتروني</label>
                  <input value={form.email} onChange={e => setForm(p => ({...p, email: e.target.value}))}
                    placeholder="example@email.com" type="email"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 text-sm" />
                </div>
                <button type="button" onClick={() => setStep(2)}
                  disabled={!form.name || !form.phone}
                  className="w-full py-3.5 rounded-xl font-black text-white transition-all disabled:opacity-40"
                  style={{ background: `linear-gradient(135deg, ${academy.primary_color}, ${academy.secondary_color})` }}>
                  التالي ←
                </button>
              </>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">اسم اللاعب *</label>
                  <input required value={form.player_name} onChange={e => setForm(p => ({...p, player_name: e.target.value}))}
                    placeholder="اسم الطفل"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">تاريخ الميلاد</label>
                  <input value={form.birth_date} onChange={e => setForm(p => ({...p, birth_date: e.target.value}))}
                    type="date" className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 text-sm" />
                </div>
                {plans?.length > 0 && (
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1.5">الباقة المطلوبة</label>
                    <select value={form.plan_name} onChange={e => setForm(p => ({...p, plan_name: e.target.value}))}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 text-sm">
                      <option value="">اختر الباقة...</option>
                      {plans.map(pl => <option key={pl.id} value={pl.name}>{pl.name} — {pl.monthly_price} MAD/شهر</option>)}
                    </select>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">ملاحظات إضافية</label>
                  <textarea value={form.message} onChange={e => setForm(p => ({...p, message: e.target.value}))}
                    rows={2} placeholder="أي معلومات إضافية..."
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 text-sm resize-none" />
                </div>
                <div className="flex gap-3">
                  <button type="button" onClick={() => setStep(1)}
                    className="flex-1 py-3.5 rounded-xl font-bold text-slate-600 border border-slate-200 hover:bg-slate-50 transition-all">
                    → رجوع
                  </button>
                  <button type="submit" disabled={submitting || !form.player_name}
                    className="flex-1 py-3.5 rounded-xl font-black text-white flex items-center justify-center gap-2 transition-all disabled:opacity-40"
                    style={{ background: `linear-gradient(135deg, ${academy.primary_color}, ${academy.secondary_color})` }}>
                    {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                    {submitting ? 'جاري الإرسال...' : 'إرسال الطلب'}
                  </button>
                </div>
              </>
            )}
          </form>
        )}
      </div>
    </div>
  );
}

/* ─── Main Page ────────────────────────────────────────────── */
export default function AcademyPublicPage() {
  const { subdomain } = useParams();
  const navigate = useNavigate();
  const [academy, setAcademy] = useState(null);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showRegister, setShowRegister] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const heroRef = useRef(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!subdomain) return;
    (async () => {
      try {
        const [acRes, plRes] = await Promise.all([
          fetch(`${API_URL}/public/academy/${subdomain}`),
          fetch(`${API_URL}/public/academy/${subdomain}/plans`).catch(() => null)
        ]);
        if (!acRes.ok) { setError(acRes.status === 404 ? 'not_found' : 'error'); return; }
        const acData = await acRes.json();
        setAcademy(acData);
        if (plRes?.ok) setPlans(await plRes.json());
        document.title = `${acData.name} — أكاديمية كرة القدم`;
      } catch (_) { setError('error'); }
      finally { setLoading(false); }
    })();
  }, [subdomain]);

  /* Apply dynamic CSS vars */
  useEffect(() => {
    if (!academy) return;
    document.documentElement.style.setProperty('--pub-primary', academy.primary_color);
    document.documentElement.style.setProperty('--pub-secondary', academy.secondary_color);
  }, [academy]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#0f1117' }}>
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-full border-2 border-indigo-400/30 border-t-indigo-400 animate-spin" />
        <p className="text-white/40 text-sm font-bold uppercase tracking-widest">Loading Academy...</p>
      </div>
    </div>
  );

  if (error === 'not_found') return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 text-center p-8">
      <div>
        <div className="text-6xl mb-6">⚽</div>
        <h1 className="text-2xl font-black text-slate-900 mb-3">الأكاديمية غير موجودة</h1>
        <p className="text-slate-500 mb-8">تحقق من الرابط أو تواصل مع الأكاديمية مباشرة.</p>
        <button onClick={() => navigate('/')} className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all">
          العودة للرئيسية
        </button>
      </div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 text-center p-8">
      <div>
        <div className="text-5xl mb-4">⚠️</div>
        <h1 className="text-xl font-black text-slate-900 mb-2">حدث خطأ</h1>
        <button onClick={() => window.location.reload()} className="px-6 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all">إعادة المحاولة</button>
      </div>
    </div>
  );

  const primary = academy.primary_color || '#4f46e5';
  const secondary = academy.secondary_color || '#7c3aed';
  const rgb = hexToRgb(primary);

  const stats = [
    { icon: Users, label: 'لاعب مسجل', value: '200+' },
    { icon: Trophy, label: 'بطولة', value: '12' },
    { icon: Award, label: 'مدرب محترف', value: '8' },
    { icon: Star, label: 'سنوات خبرة', value: '10+' },
  ];

  return (
    <div className="min-h-screen bg-white" dir="rtl">
      {/* ── Sticky Navbar ── */}
      <nav className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${scrolled ? 'bg-white/95 backdrop-blur-md shadow-lg' : 'bg-transparent'}`}>
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {academy.logo_url
              ? <img src={academy.logo_url} alt="" className="w-9 h-9 rounded-lg object-cover" />
              : <div className="w-9 h-9 rounded-lg flex items-center justify-center text-white font-black text-sm" style={{ background: `linear-gradient(135deg, ${primary}, ${secondary})` }}>{academy.name?.[0]}</div>
            }
            <span className={`font-black text-lg transition-colors ${scrolled ? 'text-slate-900' : 'text-white'}`}>{academy.name}</span>
          </div>
          <div className="flex items-center gap-4">
            {academy.city && <span className={`text-sm font-medium hidden md:block transition-colors ${scrolled ? 'text-slate-500' : 'text-white/70'}`}>{academy.city}</span>}
            <button onClick={() => setShowRegister(true)}
              className="px-5 py-2 rounded-xl text-sm font-black text-white shadow-lg hover:scale-105 active:scale-95 transition-all"
              style={{ background: `linear-gradient(135deg, ${primary}, ${secondary})` }}>
              سجّل الآن
            </button>
          </div>
        </div>
      </nav>

      {/* ── Hero Section ── */}
      <section ref={heroRef} className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${darken(primary, 60)} 0%, ${darken(secondary, 40)} 50%, #0a0a0a 100%)` }} />
        {/* Pattern overlay */}
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: `radial-gradient(circle at 2px 2px, rgba(255,255,255,0.3) 1px, transparent 0)`,
          backgroundSize: '40px 40px'
        }} />
        {/* Glow blobs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-3xl opacity-20 animate-pulse" style={{ background: primary }} />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 rounded-full blur-3xl opacity-15" style={{ background: secondary }} />

        <div className="relative z-10 max-w-5xl mx-auto px-6 text-center text-white pt-20 pb-32">
          {/* Logo */}
          {academy.logo_url ? (
            <img src={academy.logo_url} alt={academy.name} className="w-24 h-24 rounded-2xl object-cover mx-auto mb-8 border-2 border-white/20 shadow-2xl" />
          ) : (
            <div className="w-24 h-24 rounded-2xl flex items-center justify-center text-4xl font-black mx-auto mb-8 border-2 border-white/20 shadow-2xl" style={{ background: `linear-gradient(135deg, ${primary}, ${secondary})` }}>
              ⚽
            </div>
          )}

          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold mb-6 border" style={{ background: `rgba(${rgb}, 0.2)`, borderColor: `rgba(${rgb}, 0.4)`, color: '#fff' }}>
            <Zap size={12} style={{ color: primary }} />
            أكاديمية كرة القدم المحترفة
          </div>

          <h1 className="text-5xl md:text-7xl font-black mb-4 leading-tight">{academy.hero_title || academy.name}</h1>
          <p className="text-xl md:text-2xl text-white/70 font-medium mb-4 max-w-3xl mx-auto">
            {academy.hero_subtitle || 'نحن نصنع أبطال الغد'}
          </p>
          {academy.city && (
            <div className="inline-flex items-center gap-2 text-white/50 text-sm mb-10">
              <MapPin size={14} />
              {academy.city}
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button onClick={() => setShowRegister(true)}
              className="group px-8 py-4 rounded-2xl text-lg font-black text-white shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center gap-3"
              style={{ background: `linear-gradient(135deg, ${primary}, ${secondary})`, boxShadow: `0 20px 40px rgba(${rgb},0.4)` }}>
              <Users size={20} />
              سجّل ابنك الآن
              <span className="group-hover:translate-x-1 transition-transform">←</span>
            </button>
            <a href={`#about`}
              className="px-8 py-4 rounded-2xl text-lg font-bold text-white border border-white/20 hover:bg-white/10 transition-all flex items-center gap-3 backdrop-blur-sm">
              <Play size={18} />
              تعرّف علينا
            </a>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-white/30 animate-bounce">
          <span className="text-xs font-medium">اسحب للأسفل</span>
          <ChevronDown size={20} />
        </div>
      </section>

      {/* ── Stats Strip ── */}
      <section className="py-12 border-y" style={{ borderColor: `rgba(${rgb}, 0.15)`, background: `rgba(${rgb}, 0.03)` }}>
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map(({ icon: Icon, label, value }) => (
              <div key={label} className="text-center">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{ background: `rgba(${rgb}, 0.1)` }}>
                  <Icon size={22} style={{ color: primary }} />
                </div>
                <div className="text-3xl font-black text-slate-900 mb-1">{value}</div>
                <div className="text-sm text-slate-500 font-medium">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── About Section ── */}
      {academy.about_text && (
        <section id="about" className="py-20 bg-white">
          <div className="max-w-6xl mx-auto px-6">
            <div className="grid md:grid-cols-2 gap-16 items-center">
              <div>
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold mb-6 text-white" style={{ background: `linear-gradient(135deg, ${primary}, ${secondary})` }}>
                  <Heart size={14} />
                  من نحن
                </div>
                <h2 className="text-4xl font-black text-slate-900 mb-6 leading-tight">أكاديمية تبني المستقبل</h2>
                <p className="text-lg text-slate-600 leading-relaxed">{academy.about_text}</p>
                <button onClick={() => setShowRegister(true)} className="mt-8 px-6 py-3.5 rounded-xl font-black text-white hover:scale-105 transition-all" style={{ background: `linear-gradient(135deg, ${primary}, ${secondary})` }}>
                  انضم إلينا الآن
                </button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { icon: Shield, title: 'تدريب احترافي', desc: 'مناهج تدريب معتمدة دولياً' },
                  { icon: Trophy, title: 'بطولات ومباريات', desc: 'مشاركة في دوريات محلية وإقليمية' },
                  { icon: Clock, title: 'جدول مرن', desc: 'حصص تدريبية تناسب جميع الأعمار' },
                  { icon: Star, title: 'مدربون معتمدون', desc: 'طاقم تدريبي ذو كفاءة عالية' },
                ].map(({ icon: Icon, title, desc }) => (
                  <div key={title} className="p-5 rounded-2xl border border-slate-100 hover:border-transparent hover:shadow-lg transition-all group" style={{ '--hover-border': primary }}>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 transition-all" style={{ background: `rgba(${rgb}, 0.1)` }}>
                      <Icon size={18} style={{ color: primary }} />
                    </div>
                    <h4 className="font-bold text-slate-900 text-sm mb-1">{title}</h4>
                    <p className="text-xs text-slate-500">{desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── Branches (Enterprise) ── */}
      {academy.has_branches_feature && academy.branches?.length > 0 && (
        <section className="py-20" style={{ background: `rgba(${rgb}, 0.03)` }}>
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold mb-4 text-white" style={{ background: `linear-gradient(135deg, ${primary}, ${secondary})` }}>
                <MapPin size={14} /> فروعنا
              </div>
              <h2 className="text-3xl font-black text-slate-900">تجدنا في {academy.branches.length} فروع</h2>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {academy.branches.map(br => (
                <div key={br.id} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-lg transition-all">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4" style={{ background: `rgba(${rgb}, 0.1)` }}>
                    <MapPin size={18} style={{ color: primary }} />
                  </div>
                  <h3 className="font-black text-slate-900 mb-1">{br.name}</h3>
                  {br.city && <p className="text-sm text-slate-500 mb-2">{br.city}</p>}
                  {br.address && <p className="text-xs text-slate-400">{br.address}</p>}
                  {br.phone && (
                    <a href={`tel:${br.phone}`} className="flex items-center gap-2 mt-3 text-sm font-medium" style={{ color: primary }}>
                      <Phone size={14} /> {br.phone}
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Plans ── */}
      {plans?.length > 0 && (
        <section id="plans" className="py-20 bg-white">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold mb-4 text-white" style={{ background: `linear-gradient(135deg, ${primary}, ${secondary})` }}>
                <Star size={14} /> باقاتنا
              </div>
              <h2 className="text-3xl font-black text-slate-900 mb-3">اختر الباقة المناسبة لك</h2>
              <p className="text-slate-500">باقات مدروسة تناسب جميع الاحتياجات</p>
            </div>
            <div className={`grid gap-6 ${plans.length === 1 ? 'max-w-sm mx-auto' : plans.length === 2 ? 'sm:grid-cols-2 max-w-2xl mx-auto' : 'sm:grid-cols-2 lg:grid-cols-3'}`}>
              {plans.filter(p => p.is_active !== false).map((plan, idx) => (
                <div key={plan.id} className={`relative p-7 rounded-3xl border-2 transition-all hover:scale-[1.02] cursor-pointer ${idx === 1 && plans.length >= 2 ? 'border-transparent shadow-2xl' : 'border-slate-100'}`}
                  style={idx === 1 && plans.length >= 2 ? { background: `linear-gradient(135deg, ${primary}, ${secondary})` } : { background: '#fff' }}
                  onClick={() => setShowRegister(true)}>
                  {idx === 1 && plans.length >= 2 && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-white text-xs font-black" style={{ color: primary }}>
                      الأكثر طلباً ⭐
                    </div>
                  )}
                  <h3 className={`text-lg font-black mb-2 ${idx === 1 && plans.length >= 2 ? 'text-white' : 'text-slate-900'}`}>{plan.name}</h3>
                  {plan.description && <p className={`text-sm mb-4 ${idx === 1 && plans.length >= 2 ? 'text-white/80' : 'text-slate-500'}`}>{plan.description}</p>}
                  <div className={`text-3xl font-black mb-6 ${idx === 1 && plans.length >= 2 ? 'text-white' : 'text-slate-900'}`}>
                    {plan.monthly_price ? `${plan.monthly_price} MAD` : 'مجاني'}
                    <span className={`text-sm font-medium ml-1 ${idx === 1 && plans.length >= 2 ? 'text-white/70' : 'text-slate-400'}`}>/شهر</span>
                  </div>
                  {plan.features?.length > 0 && (
                    <ul className="space-y-2 mb-6">
                      {plan.features.map((f, fi) => (
                        <li key={fi} className={`flex items-center gap-2 text-sm ${idx === 1 && plans.length >= 2 ? 'text-white/90' : 'text-slate-700'}`}>
                          <CheckCircle size={14} className="flex-shrink-0" style={{ color: idx === 1 && plans.length >= 2 ? 'rgba(255,255,255,0.9)' : primary }} />
                          {f}
                        </li>
                      ))}
                    </ul>
                  )}
                  <button className={`w-full py-3 rounded-xl font-black text-sm transition-all ${idx === 1 && plans.length >= 2 ? 'bg-white' : 'text-white'}`}
                    style={idx === 1 && plans.length >= 2 ? { color: primary } : { background: `linear-gradient(135deg, ${primary}, ${secondary})` }}>
                    اشترك في هذه الباقة
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── CTA Section ── */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${darken(primary, 40)}, ${darken(secondary, 30)})` }} />
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: `radial-gradient(circle at 2px 2px, rgba(255,255,255,0.3) 1px, transparent 0)`,
          backgroundSize: '40px 40px'
        }} />
        <div className="relative z-10 max-w-3xl mx-auto px-6 text-center text-white">
          <h2 className="text-4xl md:text-5xl font-black mb-4">جاهز لتسجيل ابنك؟</h2>
          <p className="text-xl text-white/70 mb-10">أرسل طلبك الآن وسنتواصل معك في أقرب وقت ممكن</p>
          <button onClick={() => setShowRegister(true)}
            className="px-10 py-5 rounded-2xl text-xl font-black bg-white hover:scale-105 active:scale-95 transition-all shadow-2xl"
            style={{ color: primary }}>
            📋 سجّل الآن مجاناً
          </button>
        </div>
      </section>

      {/* ── Contact & Social ── */}
      <footer className="py-16 bg-slate-900 text-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid md:grid-cols-3 gap-10 mb-10">
            {/* Identity */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                {academy.logo_url
                  ? <img src={academy.logo_url} alt="" className="w-10 h-10 rounded-lg object-cover" />
                  : <div className="w-10 h-10 rounded-lg flex items-center justify-center font-black" style={{ background: `linear-gradient(135deg, ${primary}, ${secondary})` }}>{academy.name?.[0]}</div>
                }
                <span className="font-black text-lg">{academy.name}</span>
              </div>
              {academy.city && <p className="text-white/50 text-sm flex items-center gap-2"><MapPin size={14} />{academy.city}</p>}
            </div>

            {/* Contact */}
            <div>
              <h4 className="font-bold text-white/70 text-xs uppercase tracking-widest mb-4">تواصل معنا</h4>
              <div className="space-y-3">
                {academy.contact_phone && (
                  <a href={`tel:${academy.contact_phone}`} className="flex items-center gap-3 text-sm text-white/70 hover:text-white transition-colors">
                    <Phone size={14} style={{ color: primary }} /> {academy.contact_phone}
                  </a>
                )}
                {academy.contact_email && (
                  <a href={`mailto:${academy.contact_email}`} className="flex items-center gap-3 text-sm text-white/70 hover:text-white transition-colors">
                    <Mail size={14} style={{ color: primary }} /> {academy.contact_email}
                  </a>
                )}
                {academy.address && (
                  <p className="flex items-center gap-3 text-sm text-white/70">
                    <MapPin size={14} style={{ color: primary }} /> {academy.address}
                  </p>
                )}
              </div>
            </div>

            {/* Social */}
            <div>
              <h4 className="font-bold text-white/70 text-xs uppercase tracking-widest mb-4">تابعونا</h4>
              <div className="flex gap-3">
                {academy.facebook_url && (
                  <a href={academy.facebook_url} target="_blank" rel="noopener noreferrer"
                    className="w-10 h-10 rounded-xl flex items-center justify-center border border-white/10 hover:border-white/40 hover:scale-110 transition-all text-xs font-black text-white">
                    f
                  </a>
                )}
                {academy.instagram_url && (
                  <a href={academy.instagram_url} target="_blank" rel="noopener noreferrer"
                    className="w-10 h-10 rounded-xl flex items-center justify-center border border-white/10 hover:border-white/40 hover:scale-110 transition-all text-xs font-black text-white">
                    IG
                  </a>
                )}
                {academy.youtube_url && (
                  <a href={academy.youtube_url} target="_blank" rel="noopener noreferrer"
                    className="w-10 h-10 rounded-xl flex items-center justify-center border border-white/10 hover:border-white/40 hover:scale-110 transition-all text-xs font-black text-red-400">
                    YT
                  </a>
                )}
                {academy.whatsapp_number && (
                  <a href={`https://wa.me/${academy.whatsapp_number.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer"
                    className="w-10 h-10 rounded-xl flex items-center justify-center border border-white/10 hover:border-green-400/40 hover:scale-110 transition-all">
                    <MessageCircle size={16} className="text-green-400" />
                  </a>
                )}
              </div>
            </div>
          </div>
          <div className="border-t border-white/10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-white/30 text-sm">جميع الحقوق محفوظة © {new Date().getFullYear()} {academy.name}</p>
            <p className="text-white/20 text-xs">Powered by AcademyOS</p>
          </div>
        </div>
      </footer>

      {/* ── Floating WhatsApp ── */}
      {academy.whatsapp_number && (
        <a href={`https://wa.me/${academy.whatsapp_number.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`مرحباً، أريد الاستفسار عن التسجيل في ${academy.name}`)}`}
          target="_blank" rel="noopener noreferrer"
          className="fixed bottom-6 left-6 z-40 w-14 h-14 rounded-full flex items-center justify-center shadow-2xl hover:scale-110 active:scale-95 transition-all"
          style={{ background: '#25D366' }}>
          <MessageCircle size={26} className="text-white" />
        </a>
      )}

      {/* ── Register Modal ── */}
      {showRegister && <RegisterModal academy={academy} plans={plans} onClose={() => setShowRegister(false)} />}
    </div>
  );
}
