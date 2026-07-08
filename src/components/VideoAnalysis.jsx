import React, { useState, useRef, useEffect } from 'react';
import { authFetch } from '../api';
import { API_URL } from '../config';
import {
  Upload, Video, Brain, TrendingUp, Zap, Target,
  CheckCircle, AlertCircle, Loader2, Trash2, ChevronDown,
  ChevronUp, Star, ArrowUp, MessageSquare, X, Play
} from 'lucide-react';

// ─── Score Ring Component ────────────────────────────────────────────────────
function ScoreRing({ score, label, color }) {
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="va-score-ring">
      <svg width="70" height="70" className="va-ring-svg">
        <circle cx="35" cy="35" r={radius} className="va-ring-bg" />
        <circle
          cx="35" cy="35" r={radius}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="va-ring-fill"
          style={{ stroke: color }}
        />
        <text x="35" y="39" className="va-ring-text">{score}</text>
      </svg>
      <span className="va-ring-label">{label}</span>
    </div>
  );
}

// ─── Analysis Card ───────────────────────────────────────────────────────────
function AnalysisCard({ analysis, onDelete, playerName }) {
  const [expanded, setExpanded] = useState(false);
  const [notes, setNotes] = useState(analysis.coach_notes || '');
  const [savingNotes, setSavingNotes] = useState(false);
  const [noteSaved, setNoteSaved] = useState(false);

  const formatDate = (iso) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('ar-MA', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  const scoreColor = (s) => {
    if (s >= 80) return '#10b981';
    if (s >= 60) return '#f59e0b';
    return '#ef4444';
  };

  const saveNotes = async () => {
    setSavingNotes(true);
    try {
      const form = new FormData();
      form.append('notes', notes);
      await authFetch(`${API_URL}/video-analysis/${analysis.id}/notes`, {
        method: 'PATCH', body: form
      });
      setNoteSaved(true);
      setTimeout(() => setNoteSaved(false), 2000);
    } catch (e) {
      console.error(e);
    } finally {
      setSavingNotes(false);
    }
  };

  return (
    <div className="va-card">
      {/* Header */}
      <div className="va-card-header">
        <div className="va-card-meta">
          <Video size={14} />
          <span>{formatDate(analysis.created_at)}</span>
          <span className={`va-badge va-badge-${analysis.status}`}>
            {analysis.status === 'done' ? '✅ مكتمل' :
             analysis.status === 'processing' ? '⏳ يتحلل...' :
             analysis.status === 'error' ? '❌ خطأ' : '⌛ انتظار'}
          </span>
        </div>
        <div className="va-card-actions">
          <button className="va-btn-ghost" onClick={() => setExpanded(!expanded)}>
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          <button className="va-btn-ghost va-btn-danger" onClick={() => onDelete(analysis.id)}>
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Scores */}
      {analysis.status === 'done' && analysis.overall_score != null && (
        <div className="va-scores">
          <ScoreRing score={analysis.overall_score} label="الإجمالي" color={scoreColor(analysis.overall_score)} />
          <ScoreRing score={analysis.technical_score} label="تقني" color={scoreColor(analysis.technical_score)} />
          <ScoreRing score={analysis.physical_score} label="بدني" color={scoreColor(analysis.physical_score)} />
          <ScoreRing score={analysis.tactical_score} label="تكتيكي" color={scoreColor(analysis.tactical_score)} />
        </div>
      )}

      {/* Summary */}
      {analysis.summary && (
        <p className="va-summary">{analysis.summary}</p>
      )}

      {/* Expanded details */}
      {expanded && analysis.status === 'done' && (
        <div className="va-details">
          {/* Strengths */}
          {analysis.strengths?.length > 0 && (
            <div className="va-detail-section">
              <h5 className="va-detail-title va-green">
                <Star size={14} /> نقاط القوة
              </h5>
              <ul className="va-list">
                {analysis.strengths.map((s, i) => (
                  <li key={i}><CheckCircle size={12} className="va-icon-green" /> {s}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Improvements */}
          {analysis.improvements?.length > 0 && (
            <div className="va-detail-section">
              <h5 className="va-detail-title va-orange">
                <ArrowUp size={14} /> نقاط التحسين
              </h5>
              <ul className="va-list">
                {analysis.improvements.map((s, i) => (
                  <li key={i}><Target size={12} className="va-icon-orange" /> {s}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Video link */}
          {analysis.video_url && (
            <a href={analysis.video_url} target="_blank" rel="noreferrer" className="va-video-link">
              <Play size={13} /> مشاهدة الفيديو
            </a>
          )}

          {/* Coach notes */}
          <div className="va-notes-section">
            <h5 className="va-detail-title">
              <MessageSquare size={14} /> ملاحظات المدرب
            </h5>
            <textarea
              className="va-notes-input"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="أضف ملاحظاتك هنا..."
              rows={3}
            />
            <button className="va-btn-save" onClick={saveNotes} disabled={savingNotes}>
              {savingNotes ? <Loader2 size={13} className="spin" /> :
               noteSaved ? <><CheckCircle size={13} /> تم الحفظ</> : 'حفظ الملاحظات'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function VideoAnalysis({ playerId, playerName = 'اللاعب' }) {
  const [analyses, setAnalyses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState(null);
  const fileRef = useRef(null);

  const fetchAnalyses = async () => {
    try {
      const res = await authFetch(`${API_URL}/video-analysis/player/${playerId}`);
      if (res.ok) {
        const data = await res.json();
        setAnalyses(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (playerId) fetchAnalyses();
  }, [playerId]);

  const handleUpload = async (file) => {
    if (!file) return;
    setError(null);
    setUploading(true);
    setUploadProgress(10);

    try {
      const form = new FormData();
      form.append('video', file);
      form.append('player_name', playerName);

      setUploadProgress(30);

      const res = await authFetch(
        `${API_URL}/video-analysis/upload/${playerId}`,
        { method: 'POST', body: form }
      );

      setUploadProgress(90);

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'فشل رفع الفيديو');
      }

      const newAnalysis = await res.json();
      setUploadProgress(100);
      setAnalyses(prev => [newAnalysis, ...prev]);

      setTimeout(() => {
        setUploading(false);
        setUploadProgress(0);
      }, 800);

    } catch (e) {
      setError(e.message);
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDelete = async (analysisId) => {
    if (!window.confirm('هل تريد حذف هذا التحليل؟')) return;
    try {
      await authFetch(`${API_URL}/video-analysis/${analysisId}`, { method: 'DELETE' });
      setAnalyses(prev => prev.filter(a => a.id !== analysisId));
    } catch (e) {
      console.error(e);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleUpload(file);
  };

  return (
    <div className="va-container">
      {/* Header */}
      <div className="va-header">
        <div className="va-header-icon">
          <Brain size={20} />
        </div>
        <div>
          <h3 className="va-title">تحليل الأداء بالذكاء الاصطناعي</h3>
          <p className="va-subtitle">ارفع فيديو تدريبي وسيقوم Gemini AI بتحليل أداء {playerName}</p>
        </div>
      </div>

      {/* Upload Zone */}
      <div
        className={`va-dropzone ${uploading ? 'va-dropzone-active' : ''}`}
        onClick={() => !uploading && fileRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={e => e.preventDefault()}
      >
        <input
          ref={fileRef}
          type="file"
          accept="video/mp4,video/quicktime,video/x-msvideo,video/webm"
          style={{ display: 'none' }}
          onChange={e => handleUpload(e.target.files[0])}
        />

        {uploading ? (
          <div className="va-uploading">
            <Brain size={32} className="va-brain-pulse" />
            <p>يتحلل الفيديو بواسطة Gemini AI...</p>
            <div className="va-progress-bar">
              <div className="va-progress-fill" style={{ width: `${uploadProgress}%` }} />
            </div>
            <span className="va-progress-text">{uploadProgress}%</span>
          </div>
        ) : (
          <div className="va-dropzone-content">
            <Upload size={28} className="va-upload-icon" />
            <p className="va-dropzone-title">اسحب فيديو هنا أو انقر للاختيار</p>
            <p className="va-dropzone-hint">MP4, MOV, AVI, WebM — حتى 100MB</p>
            <div className="va-ai-badges">
              <span className="va-ai-badge"><Brain size={11} /> Gemini AI</span>
              <span className="va-ai-badge"><TrendingUp size={11} /> تحليل فوري</span>
              <span className="va-ai-badge"><Zap size={11} /> نتائج دقيقة</span>
            </div>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="va-error">
          <AlertCircle size={14} />
          <span>{error}</span>
          <button onClick={() => setError(null)}><X size={12} /></button>
        </div>
      )}

      {/* Analyses List */}
      <div className="va-list-section">
        {loading ? (
          <div className="va-loading">
            <Loader2 size={20} className="spin" />
            <span>جاري تحميل التحليلات...</span>
          </div>
        ) : analyses.length === 0 ? (
          <div className="va-empty">
            <Video size={32} className="va-empty-icon" />
            <p>لا توجد تحليلات بعد</p>
            <span>ارفع أول فيديو لتدريب {playerName}</span>
          </div>
        ) : (
          <div className="va-analyses">
            <h4 className="va-section-title">
              التحليلات السابقة ({analyses.length})
            </h4>
            {analyses.map(a => (
              <AnalysisCard
                key={a.id}
                analysis={a}
                onDelete={handleDelete}
                playerName={playerName}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
