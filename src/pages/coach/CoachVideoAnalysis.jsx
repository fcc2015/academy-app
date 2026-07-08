import React, { useState, useEffect, useRef } from 'react';
import { authFetch } from '../../api';
import { API_URL } from '../../config';
import {
  Brain, Upload, Video, CheckCircle, XCircle, Loader2,
  AlertTriangle, Lock, Star, Zap, BarChart3, TrendingUp,
  Target, RefreshCw, Trash2, FileVideo, ChevronDown,
  ChevronUp, Clock, Shield, Award, Activity, Users, Eye, Play
} from 'lucide-react';

/* ─── Circular Score Ring ───────────────────────────────────────── */
const ScoreRing = ({ score, size = 90, strokeWidth = 8, color = '#7c3aed', label }) => {
  const r = (size - strokeWidth * 2) / 2;
  const circ = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, score ?? 0));
  const offset = circ - (pct / 100) * circ;
  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#f1f5f9" strokeWidth={strokeWidth} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={color} strokeWidth={strokeWidth}
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1s ease' }}
        />
        <text
          x="50%" y="50%" dominantBaseline="middle" textAnchor="middle"
          style={{ transform: 'rotate(90deg)', transformOrigin: '50% 50%', fill: color, fontWeight: 900, fontSize: size * 0.22 }}
        >
          {score ?? '—'}
        </text>
      </svg>
      {label && <p className="text-xs font-black text-slate-500 mt-0.5">{label}</p>}
    </div>
  );
};

/* ─── YOLO Stats Section ─────────────────────────────────────────── */
const YoloSection = ({ yolo_video_url, yolo_stats }) => {
  const [tab, setTab] = useState('video'); // 'video' | 'stats'
  if (!yolo_video_url && !yolo_stats?.max_players_detected) return null;

  const statItems = [
    {
      label: 'اللاعبون المكتشفون',
      value: yolo_stats?.max_players_detected ?? '—',
      sub: 'أقصى عدد في إطار واحد',
      icon: Users,
      color: '#7c3aed',
      bg: 'rgba(124,58,237,0.12)',
    },
    {
      label: 'تتبع الكرة',
      value: yolo_stats?.ball_tracked_percentage != null ? `${yolo_stats.ball_tracked_percentage}%` : '—',
      sub: 'نسبة إطارات تم رصد الكرة فيها',
      icon: Eye,
      color: '#0ea5e9',
      bg: 'rgba(14,165,233,0.12)',
    },
    {
      label: 'الإطارات المعالجة',
      value: yolo_stats?.processed_frames ?? '—',
      sub: 'إجمالي الإطارات التي تم تحليلها',
      icon: Activity,
      color: '#10b981',
      bg: 'rgba(16,185,129,0.12)',
    },
  ];

  return (
    <div style={{
      background: 'linear-gradient(135deg, #0f0c29, #302b63, #24243e)',
      borderRadius: 20,
      padding: '1.25rem',
      border: '1px solid rgba(255,255,255,0.08)',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => setTab('video')}
            style={{
              padding: '4px 14px', borderRadius: 999, fontSize: 12, fontWeight: 700,
              background: tab === 'video' ? '#7c3aed' : 'rgba(255,255,255,0.08)',
              color: tab === 'video' ? '#fff' : 'rgba(255,255,255,0.5)',
              border: 'none', cursor: 'pointer', transition: 'all .2s',
            }}
          >▶ الفيديو</button>
          <button
            onClick={() => setTab('stats')}
            style={{
              padding: '4px 14px', borderRadius: 999, fontSize: 12, fontWeight: 700,
              background: tab === 'stats' ? '#7c3aed' : 'rgba(255,255,255,0.08)',
              color: tab === 'stats' ? '#fff' : 'rgba(255,255,255,0.5)',
              border: 'none', cursor: 'pointer', transition: 'all .2s',
            }}
          >📊 الإحصائيات</button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            background: 'linear-gradient(135deg,#7c3aed,#ec4899)',
            borderRadius: 8, padding: '4px 10px',
            fontSize: 10, fontWeight: 900, color: '#fff', letterSpacing: 1,
          }}>YOLOv8 AI</div>
          <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: 700 }}>تتبع اللاعبين</span>
        </div>
      </div>

      {/* Video Player */}
      {tab === 'video' && yolo_video_url && (
        <div style={{ borderRadius: 14, overflow: 'hidden', background: '#000' }}>
          <video
            src={yolo_video_url}
            controls
            playsInline
            style={{ width: '100%', maxHeight: 340, display: 'block' }}
          />
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, textAlign: 'center', padding: '8px 0' }}>
            الفيديو مُعالَج بالذكاء الاصطناعي — يظهر تتبع اللاعبين والكرة
          </p>
        </div>
      )}
      {tab === 'video' && !yolo_video_url && (
        <p style={{ color: 'rgba(255,255,255,0.4)', textAlign: 'center', fontSize: 13, padding: '1.5rem 0' }}>
          لا يوجد فيديو YOLO متاح لهذا التحليل.
        </p>
      )}

      {/* Stats */}
      {tab === 'stats' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 12 }}>
          {statItems.map(({ label, value, sub, icon: Icon, color, bg }) => (
            <div key={label} style={{
              background: bg,
              borderRadius: 14, padding: '1rem',
              border: `1px solid ${color}30`,
              textAlign: 'right',
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: `${color}22`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: 10, marginRight: 'auto',
              }}>
                <Icon size={18} style={{ color }} />
              </div>
              <p style={{ color: '#fff', fontSize: 22, fontWeight: 900, lineHeight: 1 }}>{value}</p>
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: 700, marginTop: 4 }}>{label}</p>
              <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 10, marginTop: 2 }}>{sub}</p>
            </div>
          ))}
          {yolo_stats?.tactical_summary && (
            <div style={{
              gridColumn: '1 / -1',
              background: 'rgba(124,58,237,0.12)',
              borderRadius: 14, padding: '0.875rem',
              border: '1px solid rgba(124,58,237,0.25)',
              textAlign: 'right',
            }}>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: 700, marginBottom: 4 }}>ملخص YOLO التكتيكي</p>
              <p style={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>{yolo_stats.tactical_summary}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/* ─── Score Bar ─────────────────────────────────────────────────── */
const ScoreBar = ({ label, score, color, icon: Icon }) => {
  const pct = Math.max(0, Math.min(100, score ?? 0));
  const colorMap = {
    violet: { bar: '#7c3aed', bg: '#f5f3ff', text: '#6d28d9', light: '#ede9fe' },
    blue:   { bar: '#2563eb', bg: '#eff6ff', text: '#1d4ed8', light: '#dbeafe' },
    emerald:{ bar: '#059669', bg: '#ecfdf5', text: '#047857', light: '#d1fae5' },
    amber:  { bar: '#d97706', bg: '#fffbeb', text: '#b45309', light: '#fde68a' },
  };
  const c = colorMap[color] || colorMap.violet;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="font-black text-sm" style={{ color: c.text }}>{score ?? '—'}<span className="text-xs font-bold text-slate-400">/100</span></span>
        <div className="flex items-center gap-1.5">
          {Icon && <Icon size={13} style={{ color: c.text }} />}
          <span className="text-xs font-bold text-slate-600">{label}</span>
        </div>
      </div>
      <div className="h-2.5 rounded-full overflow-hidden" style={{ background: c.light }}>
        <div
          className="h-full rounded-full transition-all duration-1000"
          style={{ width: `${pct}%`, background: c.bar }}
        />
      </div>
    </div>
  );
};

/* ─── Analysis Result Card ──────────────────────────────────────── */
const ResultCard = ({ data, mini = false }) => {
  if (!data) return null;
  return (
    <div className="space-y-5">
      {/* Ring scores */}
      <div className="flex justify-center gap-6 flex-wrap">
        <ScoreRing score={data.overall_score}   size={mini ? 72 : 100} color="#7c3aed" label="الكلي"    />
        <ScoreRing score={data.technical_score} size={mini ? 64 : 88}  color="#2563eb" label="التقني"  />
        <ScoreRing score={data.physical_score}  size={mini ? 64 : 88}  color="#059669" label="البدني"  />
        <ScoreRing score={data.tactical_score}  size={mini ? 64 : 88}  color="#d97706" label="التكتيكي"/>
      </div>

      {/* Bar scores */}
      <div className="space-y-3 bg-slate-50 rounded-2xl p-4 border border-slate-100">
        <ScoreBar label="الأداء التقني"   score={data.technical_score} color="blue"    icon={Target}   />
        <ScoreBar label="الأداء البدني"   score={data.physical_score}  color="emerald" icon={Zap}      />
        <ScoreBar label="الأداء التكتيكي" score={data.tactical_score}  color="amber"   icon={BarChart3} />
        <ScoreBar label="الدرجة الكلية"   score={data.overall_score}   color="violet"  icon={Star}     />
      </div>

      {/* Summary */}
      {data.summary && (
        <div className="bg-indigo-50 rounded-2xl p-4 border border-indigo-100">
          <p className="text-xs font-black uppercase tracking-widest text-indigo-400 mb-2 text-right flex items-center gap-1 justify-end">
            <Brain size={11} /> ملخص التحليل
          </p>
          <p className="text-sm text-indigo-900 font-medium text-right leading-relaxed">{data.summary}</p>
        </div>
      )}

      {/* YOLO Section */}
      <YoloSection yolo_video_url={data.yolo_video_url} yolo_stats={data.yolo_stats} />

      {/* Strengths & Improvements */}
      <div className={`grid ${mini ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'} gap-4`}>
        {data.strengths?.length > 0 && (
          <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-100">
            <p className="text-xs font-black uppercase tracking-widest text-emerald-600 mb-3 text-right flex items-center gap-1 justify-end">
              <TrendingUp size={12} /> نقاط القوة
            </p>
            <ul className="space-y-2">
              {data.strengths.map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-right">
                  <CheckCircle size={14} className="text-emerald-500 mt-0.5 shrink-0" />
                  <span className="text-xs text-emerald-800 font-semibold">{s}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {data.improvements?.length > 0 && (
          <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100">
            <p className="text-xs font-black uppercase tracking-widest text-amber-600 mb-3 text-right flex items-center gap-1 justify-end">
              <Target size={12} /> نقاط للتحسين
            </p>
            <ul className="space-y-2">
              {data.improvements.map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-right">
                  <AlertTriangle size={14} className="text-amber-500 mt-0.5 shrink-0" />
                  <span className="text-xs text-amber-800 font-semibold">{s}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

/* ─── Main Component ────────────────────────────────────────────── */
const CoachVideoAnalysis = () => {
  const [status, setStatus]               = useState(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [analyses, setAnalyses]           = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const [dragOver, setDragOver]           = useState(false);
  const [selectedFile, setSelectedFile]   = useState(null);
  const [uploading, setUploading]         = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [result, setResult]               = useState(null);
  const [error, setError]                 = useState('');
  const [expandedId, setExpandedId]       = useState(null);

  const fileInputRef = useRef(null);

  useEffect(() => { fetchStatus(); fetchHistory(); }, []);

  const fetchStatus = async () => {
    setLoadingStatus(true);
    try {
      const res = await authFetch(`${API_URL}/video-analysis/coach/status`);
      if (res.ok) setStatus(await res.json());
    } catch (e) { console.error(e); }
    finally { setLoadingStatus(false); }
  };

  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await authFetch(`${API_URL}/video-analysis/player/test`);
      if (res.ok) setAnalyses(await res.json());
    } catch (e) { console.error(e); }
    finally { setLoadingHistory(false); }
  };

  const handleFileDrop = (e) => {
    e.preventDefault(); setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file?.type.startsWith('video/')) { setSelectedFile(file); setError(''); }
    else setError('يرجى رفع ملف فيديو صالح (MP4, MOV, AVI, WebM)');
  };

  const handleUpload = async () => {
    if (!selectedFile || !status?.allowed) return;
    setUploading(true); setUploadProgress(0); setError(''); setResult(null);

    // Fake upload progress bar (upload itself is fast, processing takes time)
    const interval = setInterval(() => setUploadProgress(p => Math.min(p + 8, 40)), 400);

    try {
      const fd = new FormData();
      fd.append('video', selectedFile);
      fd.append('player_name', 'تحليل اختبار');

      // Step 1: Upload → backend returns 202 IMMEDIATELY
      const res = await authFetch(`${API_URL}/video-analysis/upload/test`, {
        method: 'POST', body: fd, headers: {},
      });
      clearInterval(interval);

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'فشل رفع الفيديو');
      }

      const initData = await res.json();
      const analysisId = initData.id;

      // Show "processing" state immediately
      setResult({ ...initData, status: 'processing' });
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setUploading(false);

      // Step 2: Poll /status/{id} every 4 seconds until done or error
      setUploadProgress(50);
      let attempts = 0;
      const maxAttempts = 60; // max 4 minutes polling

      const pollInterval = setInterval(async () => {
        attempts++;
        try {
          const pollRes = await authFetch(`${API_URL}/video-analysis/status/${analysisId}`);
          if (!pollRes.ok) return;
          const pollData = await pollRes.json();

          // Update progress visually
          setUploadProgress(Math.min(50 + attempts * 1.5, 95));

          if (pollData.status === 'done') {
            clearInterval(pollInterval);
            setUploadProgress(100);
            setResult(pollData);
            fetchStatus();
            fetchHistory();
            setTimeout(() => setUploadProgress(0), 1500);
          } else if (pollData.status === 'error') {
            clearInterval(pollInterval);
            setUploadProgress(0);
            setResult(null);
            setError('فشل التحليل في الخادم. يرجى المحاولة مجدداً.');
          } else if (attempts >= maxAttempts) {
            clearInterval(pollInterval);
            setUploadProgress(0);
            setError('استغرق التحليل وقتاً طويلاً. يرجى التحقق من سجل التحليلات لاحقاً.');
          }
        } catch (pollErr) {
          console.warn('Poll error:', pollErr);
        }
      }, 4000);

    } catch (err) {
      clearInterval(interval);
      setUploading(false);
      setUploadProgress(0);
      setError(err.message || 'حدث خطأ غير متوقع');
    }
  };

  const deleteAnalysis = async (id) => {
    try {
      await authFetch(`${API_URL}/video-analysis/${id}`, { method: 'DELETE' });
      setAnalyses(prev => prev.filter(a => a.id !== id));
    } catch (e) { console.error(e); }
  };

  /* ── Loading ── */
  if (loadingStatus) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-4">
        <div className="w-16 h-16 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-xl animate-pulse">
          <Brain size={28} className="text-white" />
        </div>
        <p className="text-slate-500 font-bold text-sm">جارٍ التحقق من الصلاحيات...</p>
      </div>
    </div>
  );

  const isBlocked = status && !status.allowed;

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8" dir="rtl">
      <div className="max-w-3xl mx-auto space-y-6">

        {/* ── Header ── */}
        <div className="text-right">
          <div className="flex items-center gap-3 justify-end mb-1">
            <div className="w-12 h-12 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-xl">
              <Brain size={22} className="text-white" />
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900">تحليل الفيديو بالذكاء الاصطناعي</h1>
          </div>
          <p className="text-slate-500 font-medium text-sm">ارفع مقطع فيديو وسيقوم الذكاء الاصطناعي بتحليل أداء اللاعب بالكامل</p>
        </div>

        {/* ── Status Card ── */}
        <div className={`rounded-2xl border p-4 flex items-center gap-4 ${isBlocked ? 'bg-red-50 border-red-100' : 'bg-emerald-50 border-emerald-100'}`}>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isBlocked ? 'bg-red-100' : 'bg-emerald-100'}`}>
            {isBlocked ? <Lock size={18} className="text-red-600" /> : <CheckCircle size={18} className="text-emerald-600" />}
          </div>
          <div className="flex-1 text-right">
            {isBlocked ? (
              <>
                <p className="font-black text-red-700 text-sm">
                  {status?.reason === 'quota_exceeded' ? 'تم استنفاذ التحليلات المتاحة' : 'الخدمة غير متاحة حالياً'}
                </p>
                <p className="text-xs text-red-500 mt-0.5 font-medium">{status?.message}</p>
                {status?.blocked_until && (
                  <p className="text-xs text-red-400 mt-1 flex items-center gap-1 justify-end">
                    <Clock size={11} /> محجوب حتى: {new Date(status.blocked_until).toLocaleString('ar')}
                  </p>
                )}
              </>
            ) : (
              <>
                <p className="font-black text-emerald-700 text-sm">يمكنك إجراء التحليل</p>
                {status?.message && <p className="text-xs text-emerald-600 mt-0.5 font-medium">{status.message}</p>}
              </>
            )}
          </div>
          {status && (
            <div className="text-right shrink-0">
              <p className="text-xs font-black text-slate-400 uppercase tracking-wider">التحليلات</p>
              <p className={`text-2xl font-black ${isBlocked ? 'text-red-600' : 'text-emerald-600'}`}>
                {status.tests_used}<span className="text-sm text-slate-400">/{status.max_tests}</span>
              </p>
            </div>
          )}
        </div>

        {/* ── Upload Area ── */}
        {!isBlocked && (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center gap-2 justify-end">
              <h2 className="font-extrabold text-slate-800 text-base">رفع فيديو للتحليل</h2>
              <Upload size={18} className="text-violet-600" />
            </div>
            <div className="p-6 space-y-4">
              {/* Drop Zone */}
              <div
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleFileDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`relative border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all ${
                  dragOver ? 'border-violet-500 bg-violet-50 scale-[1.01]'
                  : selectedFile ? 'border-emerald-400 bg-emerald-50'
                  : 'border-slate-200 hover:border-violet-300 hover:bg-violet-50/30'
                }`}
              >
                <input ref={fileInputRef} type="file" accept="video/*" onChange={e => { setSelectedFile(e.target.files[0]); setError(''); }} className="hidden" />
                {selectedFile ? (
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-14 h-14 bg-emerald-100 rounded-2xl flex items-center justify-center">
                      <FileVideo size={26} className="text-emerald-600" />
                    </div>
                    <p className="font-black text-emerald-700 text-sm">{selectedFile.name}</p>
                    <p className="text-xs text-slate-400">{(selectedFile.size / 1024 / 1024).toFixed(1)} MB</p>
                    <button type="button" onClick={e => { e.stopPropagation(); setSelectedFile(null); }} className="text-xs text-rose-500 hover:text-rose-700 font-bold mt-1">
                      إزالة
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-16 h-16 bg-gradient-to-br from-violet-100 to-indigo-100 rounded-2xl flex items-center justify-center">
                      <Video size={28} className="text-violet-500" />
                    </div>
                    <div>
                      <p className="font-black text-slate-700 text-sm">اسحب وأفلت الفيديو هنا</p>
                      <p className="text-xs text-slate-400 mt-1">أو انقر للاختيار من جهازك</p>
                    </div>
                    <p className="text-xs text-slate-300 font-medium">MP4, MOV, AVI, WebM — حد أقصى 100MB</p>
                  </div>
                )}
              </div>

              {/* Error */}
              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-xl">
                  <AlertTriangle size={15} className="text-red-500 shrink-0" />
                  <p className="text-sm text-red-600 font-medium text-right flex-1">{error}</p>
                </div>
              )}

              {/* Progress */}
              {uploading && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                    <span>{uploadProgress}%</span>
                    <span className="flex items-center gap-1.5">
                      <Activity size={12} className="text-violet-500 animate-pulse" />
                      جارٍ التحليل بالذكاء الاصطناعي...
                    </span>
                  </div>
                  <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${uploadProgress}%`, background: 'linear-gradient(90deg, #7c3aed, #4f46e5)' }}
                    />
                  </div>
                  <p className="text-xs text-slate-400 text-right">قد يستغرق التحليل من 30 ثانية إلى دقيقتين...</p>
                </div>
              )}

              {/* Upload Button */}
              <button
                onClick={handleUpload}
                disabled={!selectedFile || uploading}
                className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${
                  !selectedFile || uploading
                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    : 'text-white hover:shadow-xl hover:scale-[1.01]'
                }`}
                style={selectedFile && !uploading ? { background: 'linear-gradient(135deg, #7c3aed, #4338ca)' } : {}}
              >
                {uploading
                  ? <><Loader2 size={18} className="animate-spin" /> جارٍ التحليل...</>
                  : <><Brain size={18} /> تحليل بالذكاء الاصطناعي</>
                }
              </button>
            </div>
          </div>
        )}

        {/* ── Result Card ── */}
        {result && (
          <div className="bg-white rounded-3xl border-2 border-violet-200 shadow-2xl shadow-violet-100/60 overflow-hidden">
            <div className="p-5 flex items-center justify-between" style={{ background: 'linear-gradient(135deg, #7c3aed, #4338ca)' }}>
              {result.status === 'processing'
                ? <Loader2 size={24} className="text-violet-200 animate-spin" />
                : <Award size={24} className="text-violet-200" />
              }
              <div className="text-right text-white">
                <p className="font-black text-lg">
                  {result.status === 'processing' ? 'جارٍ التحليل...' : 'نتيجة التحليل'}
                </p>
                <p className="text-violet-200 text-xs font-medium">
                  {result.status === 'processing'
                    ? 'يعمل YOLO + Gemini AI في الخلفية — ستظهر النتيجة تلقائياً'
                    : 'تم التحليل بنجاح بواسطة Gemini AI'}
                </p>
              </div>
            </div>
            <div className="p-6">
              {result.status === 'processing' ? (
                <div className="flex flex-col items-center gap-6 py-8">
                  {/* Animated AI processing indicator */}
                  <div className="relative w-24 h-24">
                    <div className="absolute inset-0 rounded-full border-4 border-violet-100" />
                    <div className="absolute inset-0 rounded-full border-4 border-violet-500 border-t-transparent animate-spin" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Brain size={32} className="text-violet-600" />
                    </div>
                  </div>
                  <div className="text-center space-y-2">
                    <p className="font-black text-slate-800 text-lg">الذكاء الاصطناعي يحلل الفيديو</p>
                    <p className="text-sm text-slate-500 font-medium">يتم الآن تتبع اللاعبين بـ YOLOv8 وتحليل الأداء بـ Gemini...</p>
                    <p className="text-xs text-slate-400">قد يستغرق هذا من 30 ثانية إلى دقيقتين حسب طول الفيديو</p>
                  </div>
                  {/* Mini progress bar */}
                  <div className="w-full max-w-xs">
                    <div className="h-2 bg-violet-100 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full animate-pulse" style={{ width: `${Math.max(uploadProgress, 50)}%`, transition: 'width 1s' }} />
                    </div>
                    <p className="text-xs text-center text-violet-400 font-bold mt-2">{Math.max(uploadProgress, 50)}% مكتمل</p>
                  </div>
                </div>
              ) : (
                <ResultCard data={result} />
              )}
            </div>
          </div>
        )}

        {/* ── History ── */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <button onClick={fetchHistory} className="text-xs font-bold text-slate-400 hover:text-violet-600 flex items-center gap-1">
              {loadingHistory ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />} تحديث
            </button>
            <h2 className="font-extrabold text-slate-800 text-base flex items-center gap-2">
              سجل التحليلات <Video size={18} className="text-violet-500" />
            </h2>
          </div>

          <div className="divide-y divide-slate-50">
            {loadingHistory ? (
              <div className="flex justify-center py-10">
                <Loader2 size={24} className="animate-spin text-violet-400" />
              </div>
            ) : analyses.length === 0 ? (
              <div className="text-center py-14">
                <Brain size={36} className="mx-auto text-slate-200 mb-3" />
                <p className="text-slate-400 font-bold text-sm">لا توجد تحليلات بعد</p>
                <p className="text-slate-300 text-xs mt-1">سيظهر هنا سجل تحليلاتك</p>
              </div>
            ) : (
              analyses.map((a) => (
                <div key={a.id} className="p-5">
                  {/* Row header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button onClick={() => deleteAnalysis(a.id)} className="p-1.5 text-slate-300 hover:text-rose-500 transition-colors rounded-lg hover:bg-rose-50">
                        <Trash2 size={14} />
                      </button>
                      {a.status === 'done' && (
                        <button
                          onClick={() => setExpandedId(expandedId === a.id ? null : a.id)}
                          className="text-xs font-bold text-violet-600 hover:text-violet-800 flex items-center gap-1"
                        >
                          {expandedId === a.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          {expandedId === a.id ? 'إخفاء' : 'عرض التفاصيل'}
                        </button>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-2 justify-end">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-black ${
                          a.status === 'done'       ? 'bg-emerald-100 text-emerald-700' :
                          a.status === 'processing' ? 'bg-amber-100 text-amber-700' :
                                                      'bg-rose-100 text-rose-600'
                        }`}>
                          {a.status === 'done' ? '✓ مكتمل' : a.status === 'processing' ? '⏳ قيد التحليل' : '✗ خطأ'}
                        </span>
                        {a.overall_score != null && (
                          <span className="text-lg font-black text-violet-700">
                            {a.overall_score}<span className="text-xs text-slate-400">/100</span>
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {new Date(a.created_at).toLocaleDateString('ar')} — {new Date(a.created_at).toLocaleTimeString('ar')}
                      </p>
                    </div>
                  </div>

                  {/* Expanded result */}
                  {expandedId === a.id && a.status === 'done' && (
                    <div className="mt-5 pt-5 border-t border-slate-100">
                      <ResultCard data={a} mini />
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default CoachVideoAnalysis;
