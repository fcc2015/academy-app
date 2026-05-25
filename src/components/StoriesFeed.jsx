import React, { useState, useRef } from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import { API_URL } from '../config';
import { authFetch } from '../api';

// ─── Story Circle ─────────────────────────────────────────────
function StoryCircle({ story, onOpen, isOwn }) {
  const initial = (story.full_name || story.author_name || '?')[0].toUpperCase();
  return (
    <button
      className="story-circle-btn"
      onClick={() => onOpen(story)}
      title={story.full_name || ''}
      aria-label={`Story by ${story.full_name}`}
    >
      <div className={`story-ring ${story.media_url ? 'story-ring--active' : 'story-ring--text'}`}>
        <div className="story-avatar">
          {story.photo_url ? (
            <img src={story.photo_url} alt={story.full_name} className="story-avatar-img" />
          ) : (
            <span className="story-avatar-initial">{initial}</span>
          )}
        </div>
      </div>
      <span className="story-circle-name">
        {isOwn ? (story.full_name?.split(' ')[0] || 'You') : (story.full_name?.split(' ')[0] || '')}
      </span>
    </button>
  );
}

// ─── Story Viewer Modal ────────────────────────────────────────
function StoryViewer({ story, onClose, onDelete, isOwn }) {
  const { t } = useLanguage();
  if (!story) return null;

  return (
    <div className="story-viewer-overlay" onClick={onClose}>
      <div className="story-viewer" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="story-viewer-header">
          <div className="story-viewer-meta">
            <div className="story-viewer-avatar">
              {story.photo_url
                ? <img src={story.photo_url} alt="" className="story-viewer-avatar-img" />
                : <span className="story-viewer-avatar-initial">{(story.full_name || '?')[0]}</span>
              }
            </div>
            <div>
              <div className="story-viewer-name">{story.full_name}</div>
              <div className="story-viewer-time">
                {story.created_at
                  ? new Date(story.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  : ''}
              </div>
            </div>
          </div>
          <div className="story-viewer-actions">
            {isOwn && (
              <button
                className="story-delete-btn"
                onClick={() => onDelete(story.id)}
                title={t('delete')}
              >
                🗑️
              </button>
            )}
            <button className="story-close-btn" onClick={onClose}>✕</button>
          </div>
        </div>

        {/* Media */}
        <div className="story-viewer-media">
          {story.media_url && story.media_type === 'video' ? (
            <video
              src={story.media_url}
              controls
              autoPlay
              className="story-media-video"
            />
          ) : story.media_url ? (
            <img
              src={story.media_url}
              alt={story.caption || ''}
              className="story-media-img"
            />
          ) : null}
          {story.caption && (
            <div className="story-caption">{story.caption}</div>
          )}
          {!story.media_url && story.caption && (
            <div className="story-text-only">
              <p className="story-text-content">{story.caption}</p>
            </div>
          )}
        </div>

        {/* Progress bar */}
        <div className="story-progress-bar">
          <div className="story-progress-fill" />
        </div>
      </div>
    </div>
  );
}

// ─── Add Story Modal ───────────────────────────────────────────
function AddStoryModal({ onClose, onCreated }) {
  const { t } = useLanguage();
  const [caption, setCaption] = useState('');
  const [mediaFile, setMediaFile] = useState(null);
  const [mediaPreview, setMediaPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef();

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) {
      setError(t('fileTooLarge', 'File must be under 20MB'));
      return;
    }
    setMediaFile(file);
    setMediaPreview(URL.createObjectURL(file));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!caption && !mediaFile) {
      setError(t('storyEmpty', 'Please add text or an image.'));
      return;
    }
    setLoading(true);
    setError('');
    try {
      let media_url = null;
      let media_type = 'image';

      if (mediaFile) {
        // Upload to storage
        const formData = new FormData();
        formData.append('file', mediaFile);
        const uploadRes = await authFetch(`${API_URL}/storage/upload`, {
          method: 'POST',
          body: formData,
        });
        if (!uploadRes.ok) throw new Error('Upload failed');
        const uploadData = await uploadRes.json();
        media_url = uploadData?.url || uploadData?.public_url;
        media_type = mediaFile.type.startsWith('video/') ? 'video' : 'image';
      }

      const storyData = {
        caption: caption || null,
        media_url,
        media_type: media_url ? media_type : 'text',
      };

      const res = await authFetch(`${API_URL}/stories/`, {
        method: 'POST',
        body: JSON.stringify(storyData),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Failed to share story');
      }
      const data = await res.json();
      onCreated(data);
      onClose();
    } catch (err) {
      setError(err.message || t('errorOccurred', 'An error occurred.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="story-add-overlay" onClick={onClose}>
      <div className="story-add-modal" onClick={e => e.stopPropagation()}>
        <div className="story-add-header">
          <h3>{t('addStory', 'New Story')}</h3>
          <button onClick={onClose} className="modal-close-btn">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="story-add-form">
          {mediaPreview && (
            <div className="story-preview">
              {mediaFile?.type.startsWith('video/') ? (
                <video src={mediaPreview} className="story-preview-media" controls />
              ) : (
                <img src={mediaPreview} alt="preview" className="story-preview-media" />
              )}
              <button
                type="button"
                className="story-remove-media"
                onClick={() => { setMediaFile(null); setMediaPreview(null); }}
              >✕</button>
            </div>
          )}

          <div className="story-add-media-btn-row">
            <button type="button" className="btn btn-outline" onClick={() => fileRef.current.click()}>
              📷 {t('uploadMedia', 'Upload Image/Video')}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*,video/*"
              style={{ display: 'none' }}
              onChange={handleFile}
            />
          </div>

          <textarea
            className="story-caption-input"
            placeholder={t('storyCaption', 'Write a caption or text story...')}
            value={caption}
            onChange={e => setCaption(e.target.value)}
            maxLength={500}
            rows={3}
          />

          {error && <p className="form-error">{error}</p>}

          <div className="story-add-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              {t('cancel', 'Cancel')}
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? t('sharing', 'Sharing...') : t('shareStory', 'Share Story')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main StoriesFeed Component ────────────────────────────────
export default function StoriesFeed({ currentUser, canCreate = false }) {
  const { t } = useLanguage();
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewingStory, setViewingStory] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);

  React.useEffect(() => {
    const fetchStories = async () => {
      try {
        const res = await authFetch(`${API_URL}/stories/`);
        if (res.ok) {
          const data = await res.json();
          setStories(data || []);
        }
      } catch {
        // silent fail — stories are non-critical
      } finally {
        setLoading(false);
      }
    };
    fetchStories();
  }, []);

  const handleDelete = async (storyId) => {
    try {
      const res = await authFetch(`${API_URL}/stories/${storyId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setStories(prev => prev.filter(s => s.id !== storyId));
        setViewingStory(null);
      }
    } catch {
      // ignore
    }
  };

  const handleCreated = (newStory) => {
    setStories(prev => [newStory, ...prev]);
  };

  if (loading) {
    return (
      <div className="stories-feed stories-feed--loading">
        {[1, 2, 3].map(i => (
          <div key={i} className="story-skeleton">
            <div className="skeleton-ring" />
            <div className="skeleton-name" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="stories-feed" aria-label={t('stories', 'Stories')}>
        {/* Add Story Button */}
        {canCreate && (
          <button
            className="story-add-btn"
            onClick={() => setShowAddModal(true)}
            aria-label={t('addStory', 'Add Story')}
          >
            <div className="story-add-ring">
              <span className="story-add-plus">+</span>
            </div>
            <span className="story-circle-name">{t('addStory', 'Add Story')}</span>
          </button>
        )}

        {/* Story Circles */}
        {stories.map(story => (
          <StoryCircle
            key={story.id}
            story={story}
            onOpen={setViewingStory}
            isOwn={story.user_id === currentUser?.id}
          />
        ))}

        {stories.length === 0 && !canCreate && (
          <p className="stories-empty">{t('noStories', 'No stories yet')}</p>
        )}
      </div>

      {/* Viewer */}
      {viewingStory && (
        <StoryViewer
          story={viewingStory}
          onClose={() => setViewingStory(null)}
          onDelete={handleDelete}
          isOwn={viewingStory.user_id === currentUser?.id}
        />
      )}

      {/* Add Modal */}
      {showAddModal && (
        <AddStoryModal
          onClose={() => setShowAddModal(false)}
          onCreated={handleCreated}
        />
      )}
    </>
  );
}
