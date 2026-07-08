import React, { useState, useEffect } from 'react';
import { authFetch } from '../../../api';
import { API_URL } from '../../../config';
import {
  Brain, Power, Settings2, Clock, MessageSquare, Users,
  CheckCircle, XCircle, Loader2, AlertTriangle, ChevronDown,
  ChevronUp, Shield, ShieldOff, Zap
} from 'lucide-react';
import { useToast } from '../../../components/Toast';

const AiVideoAnalysisSection = ({ settings, handleInputChange, setSettings }) => {
  const toast = useToast();
  const [coaches, setCoaches] = useState([]);
  const [loadingCoaches, setLoadingCoaches] = useState(false);
  const [toggling, setToggling] = useState({});
  const [expanded, setExpanded] = useState(true);

  const isEnabled = settings?.video_ai_enabled !== false;

  useEffect(() => {
    fetchCoaches();
  }, []);

  const fetchCoaches = async () => {
    setLoadingCoaches(true);
    try {
      const res = await authFetch(`${API_URL}/coaches/`);
      if (res.ok) {
        const data = await res.json();
        setCoaches(data);
      }
    } catch (e) {
      console.error('Error fetching coaches:', e);
    } finally {
      setLoadingCoaches(false);
    }
  };

  const toggleCoachAI = async (coachId, currentAllowed) => {
    setToggling(prev => ({ ...prev, [coachId]: true }));
    try {
      const newVal = !currentAllowed;
      const res = await authFetch(
        `${API_URL}/video-analysis/coaches/${coachId}/toggle-ai?allowed=${newVal}`,
        { method: 'PATCH' }
      );
      if (res.ok) {
        setCoaches(prev => prev.map(c =>
          c.id === coachId ? { ...c, video_ai_allowed: newVal } : c
        ));
        toast.success(newVal ? 'تم تفعيل صلاحية التحليل' : 'تم تعطيل صلاحية التحليل');
      } else {
        toast.error('فشل تحديث الصلاحية');
      }
    } catch (e) {
      toast.error('خطأ في الاتصال');
    } finally {
      setToggling(prev => ({ ...prev, [coachId]: false }));
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
      {/* Header */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-6 py-5 bg-gradient-to-r from-violet-50 to-indigo-50 border-b border-slate-200 hover:from-violet-100 hover:to-indigo-100 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-md">
            <Brain size={20} className="text-white" />
          </div>
          <div className="text-right">
            <h3 className="font-extrabold text-slate-800 text-base">إعدادات تحليل الفيديو بالذكاء الاصطناعي</h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5">AI Video Analysis — Gemini</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${isEnabled ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
            {isEnabled ? '🟢 مفعّل' : '🔴 معطّل'}
          </span>
          {expanded ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
        </div>
      </button>

      {expanded && (
        <div className="p-6 space-y-6">
          {/* Master Toggle */}
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <div className="flex items-center gap-3">
              <Power size={18} className={isEnabled ? 'text-emerald-600' : 'text-slate-400'} />
              <div className="text-right">
                <p className="font-bold text-slate-800 text-sm">تفعيل تحليل الفيديو بالذكاء الاصطناعي</p>
                <p className="text-xs text-slate-500">تمكين أو تعطيل هذه الميزة لجميع المدربين</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={!!settings?.video_ai_enabled}
                onChange={e => {
                  setSettings(prev => ({ ...prev, video_ai_enabled: e.target.checked }));
                }}
              />
              <div className="w-12 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-6 peer-checked:bg-gradient-to-r peer-checked:from-violet-600 peer-checked:to-indigo-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all shadow-inner" />
            </label>
          </div>

          {/* Max Tests per Coach */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-500 justify-end">
                <Zap size={14} className="text-amber-500" />
                عدد التحليلات المسموح بها للمدرب
              </label>
              <input
                type="number"
                min="1"
                max="100"
                name="video_ai_coach_max_tests"
                value={settings?.video_ai_coach_max_tests ?? 1}
                onChange={handleInputChange}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-right text-slate-800 focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none"
              />
              <p className="text-xs text-slate-400 text-right">عدد مرات التحليل المتاحة لكل مدرب (دون لاعب)</p>
            </div>

            {/* Temporary Block Until */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-500 justify-end">
                <Clock size={14} className="text-rose-500" />
                حجب مؤقت حتى تاريخ ووقت
              </label>
              <input
                type="datetime-local"
                name="video_ai_blocked_until"
                value={settings?.video_ai_blocked_until
                  ? new Date(settings.video_ai_blocked_until).toISOString().slice(0, 16)
                  : ''}
                onChange={e => {
                  setSettings(prev => ({
                    ...prev,
                    video_ai_blocked_until: e.target.value ? new Date(e.target.value).toISOString() : null
                  }));
                }}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-right text-slate-800 focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none"
              />
              <p className="text-xs text-slate-400 text-right">اتركه فارغاً لإزالة الحجب المؤقت</p>
            </div>
          </div>

          {/* Status Messages */}
          <div className="space-y-4">
            <h4 className="text-sm font-black uppercase tracking-widest text-slate-500 text-right flex items-center justify-end gap-2">
              <MessageSquare size={14} className="text-violet-500" />
              رسائل الحالة للمدربين
            </h4>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-emerald-600 text-right block flex items-center gap-1 justify-end">
                  <CheckCircle size={12} /> رسالة عند الحالة الطبيعية (اختياري)
                </label>
                <textarea
                  name="video_ai_message_ok"
                  value={settings?.video_ai_message_ok || ''}
                  onChange={handleInputChange}
                  rows={2}
                  placeholder="مثال: يمكنك الاستمتاع بتحليل الفيديو بالذكاء الاصطناعي."
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium text-right text-slate-800 focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 outline-none resize-none text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-rose-600 text-right block flex items-center gap-1 justify-end">
                  <XCircle size={12} /> رسالة عند الحجب أو المشكلة (اختياري)
                </label>
                <textarea
                  name="video_ai_message_blocked"
                  value={settings?.video_ai_message_blocked || ''}
                  onChange={handleInputChange}
                  rows={2}
                  placeholder="مثال: الخدمة معطلة حالياً للصيانة. سنعود قريباً."
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium text-right text-slate-800 focus:ring-2 focus:ring-rose-400 focus:border-rose-400 outline-none resize-none text-sm"
                />
              </div>
            </div>
          </div>

          {/* Per-Coach Toggles */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={fetchCoaches}
                className="text-xs font-bold text-violet-600 hover:text-violet-800 flex items-center gap-1"
              >
                {loadingCoaches ? <Loader2 size={12} className="animate-spin" /> : null}
                تحديث
              </button>
              <h4 className="text-sm font-black uppercase tracking-widest text-slate-500 text-right flex items-center gap-2">
                <Users size={14} className="text-violet-500" />
                صلاحيات AI لكل مدرب
              </h4>
            </div>

            {loadingCoaches ? (
              <div className="flex justify-center py-6">
                <Loader2 size={24} className="animate-spin text-violet-500" />
              </div>
            ) : coaches.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <Users size={32} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm font-medium">لا يوجد مدربون</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {coaches.map(coach => {
                  const isAllowed = coach.video_ai_allowed !== false;
                  return (
                    <div
                      key={coach.id}
                      className={`flex items-center justify-between p-3 rounded-xl border transition-all ${isAllowed ? 'bg-emerald-50/50 border-emerald-100' : 'bg-rose-50/50 border-rose-100'}`}
                    >
                      <button
                        type="button"
                        onClick={() => toggleCoachAI(coach.id, isAllowed)}
                        disabled={!!toggling[coach.id]}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition-all ${isAllowed ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-rose-100 text-rose-700 hover:bg-rose-200'}`}
                      >
                        {toggling[coach.id] ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : isAllowed ? (
                          <Shield size={12} />
                        ) : (
                          <ShieldOff size={12} />
                        )}
                        {isAllowed ? 'مفعّل' : 'معطّل'}
                      </button>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="font-bold text-slate-800 text-sm">{coach.full_name}</p>
                          <p className="text-xs text-slate-400">{coach.specialization} {coach.u_category ? `• ${coach.u_category}` : ''}</p>
                        </div>
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-white font-black text-sm ${isAllowed ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                          {coach.full_name?.[0] || '?'}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-100 rounded-xl">
              <AlertTriangle size={14} className="text-amber-500 mt-0.5 shrink-0" />
              <p className="text-xs text-amber-700 font-medium text-right">
                تغييرات صلاحيات المدربين تُحفظ فوراً (مستقلة عن زر الحفظ العام). أما إعدادات الحد الأقصى والحجب والرسائل فتُحفظ مع إعدادات الأكاديمية.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AiVideoAnalysisSection;
