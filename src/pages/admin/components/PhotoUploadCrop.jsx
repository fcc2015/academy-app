import React, { useState, useRef } from 'react';
import { authFetch } from '../../../api';
import { API_URL } from '../../../config';

const CROP_PX = 180;

function PhotoUploadCrop({ value, onChange }) {
    const [srcImg, setSrcImg]     = useState(null);
    const [imgSize, setImgSize]   = useState({ w: 0, h: 0 });
    const [offset, setOffset]     = useState({ x: 0, y: 0 });
    const [dragging, setDragging] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [error, setError]       = useState('');
    const dragRef = useRef(null);
    const imgRef  = useRef(null);
    const fileRef = useRef(null);

    const handleFile = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) { setError('Only images allowed'); return; }
        setError('');
        const reader = new FileReader();
        reader.onload = (ev) => setSrcImg(ev.target.result);
        reader.readAsDataURL(file);
        e.target.value = '';
    };

    const onImgLoad = (e) => {
        const { naturalWidth: nw, naturalHeight: nh } = e.target;
        const scale = CROP_PX / Math.min(nw, nh);
        const w = nw * scale, h = nh * scale;
        setImgSize({ w, h });
        setOffset({ x: -(w - CROP_PX) / 2, y: -(h - CROP_PX) / 2 });
    };

    const clamp = (val, min, max) => Math.min(max, Math.max(min, val));

    const onMouseDown = (e) => {
        setDragging(true);
        dragRef.current = { sx: e.clientX - offset.x, sy: e.clientY - offset.y };
    };
    const onMouseMove = (e) => {
        if (!dragging || !dragRef.current) return;
        setOffset({
            x: clamp(e.clientX - dragRef.current.sx, CROP_PX - imgSize.w, 0),
            y: clamp(e.clientY - dragRef.current.sy, CROP_PX - imgSize.h, 0),
        });
    };
    const onMouseUp = () => setDragging(false);

    // Touch support
    const onTouchStart = (e) => {
        const t = e.touches[0];
        setDragging(true);
        dragRef.current = { sx: t.clientX - offset.x, sy: t.clientY - offset.y };
    };
    const onTouchMove = (e) => {
        if (!dragging || !dragRef.current) return;
        const t = e.touches[0];
        setOffset({
            x: clamp(t.clientX - dragRef.current.sx, CROP_PX - imgSize.w, 0),
            y: clamp(t.clientY - dragRef.current.sy, CROP_PX - imgSize.h, 0),
        });
    };

    const handleConfirm = async () => {
        if (!imgRef.current) return;
        setUploading(true);
        setError('');
        try {
            const canvas = document.createElement('canvas');
            canvas.width = CROP_PX;
            canvas.height = CROP_PX;
            const ctx = canvas.getContext('2d');
            const img = imgRef.current;
            const scaleX = img.naturalWidth / imgSize.w;
            const scaleY = img.naturalHeight / imgSize.h;
            ctx.drawImage(img,
                (-offset.x) * scaleX, (-offset.y) * scaleY,
                CROP_PX * scaleX, CROP_PX * scaleY,
                0, 0, CROP_PX, CROP_PX
            );
            const blob = await new Promise(res => canvas.toBlob(res, 'image/jpeg', 0.92));
            const fd = new FormData();
            fd.append('file', blob, 'photo.jpg');
            const res = await authFetch(`${API_URL}/players/upload-photo`, { method: 'POST', body: fd });
            if (!res.ok) throw new Error((await res.json()).detail || 'Upload failed');
            const { url } = await res.json();
            onChange(url);
            setSrcImg(null);
        } catch (err) {
            setError(err.message);
        } finally {
            setUploading(false);
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
            {/* Current photo or placeholder (no crop active) */}
            {!srcImg && (
                <div
                    onClick={() => fileRef.current?.click()}
                    style={{
                        width: CROP_PX, height: CROP_PX, borderRadius: '50%', overflow: 'hidden',
                        background: value ? 'transparent' : 'linear-gradient(135deg,#4f46e5,#7c3aed)',
                        display: 'flex', alignItems: 'center', justify: 'center',
                        cursor: 'pointer', border: '3px dashed #c7d2fe', boxSizing: 'border-box',
                        position: 'relative',
                    }}
                    title="Click to upload photo"
                >
                    {value
                        ? <img src={value} alt="player" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <span style={{ color: '#fff', fontSize: 13, fontWeight: 900, textAlign: 'center', padding: 12 }}>📷<br/>Upload Photo</span>
                    }
                    <div style={{
                        position: 'absolute', bottom: 0, left: 0, right: 0,
                        background: 'rgba(79,70,229,0.7)', color: '#fff',
                        fontSize: 10, fontWeight: 900, textAlign: 'center', padding: '4px 0',
                    }}>
                        {value ? 'CHANGE' : 'UPLOAD'}
                    </div>
                </div>
            )}

            {/* Crop preview */}
            {srcImg && (
                <div>
                    <div
                        style={{
                            width: CROP_PX, height: CROP_PX, borderRadius: '50%', overflow: 'hidden',
                            position: 'relative', cursor: dragging ? 'grabbing' : 'grab',
                            userSelect: 'none', boxShadow: '0 0 0 3px #4f46e5',
                        }}
                        onMouseDown={onMouseDown} onMouseMove={onMouseMove}
                        onMouseUp={onMouseUp} onMouseLeave={onMouseUp}
                        onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onMouseUp}
                    >
                        <img
                            ref={imgRef} src={srcImg} alt="crop"
                            onLoad={onImgLoad} draggable={false}
                            style={{
                                position: 'absolute', left: offset.x, top: offset.y,
                                width: imgSize.w, height: imgSize.h, pointerEvents: 'none',
                            }}
                        />
                    </div>
                    <p style={{ fontSize: 11, color: '#6b7280', textAlign: 'center', margin: '6px 0 0' }}>
                        Drag to position
                    </p>
                    <div style={{ display: 'flex', gap: 8, marginTop: 8, justifyContent: 'center' }}>
                        <button type="button" onClick={handleConfirm} disabled={uploading}
                            style={{ padding: '7px 16px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 900, fontSize: 12, cursor: 'pointer' }}>
                            {uploading ? '...' : 'Use this photo'}
                        </button>
                        <button type="button" onClick={() => setSrcImg(null)}
                            style={{ padding: '7px 12px', background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: 10, fontWeight: 900, fontSize: 12, cursor: 'pointer' }}>
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFile} />
            {error && <p style={{ fontSize: 11, color: '#ef4444', fontWeight: 700 }}>{error}</p>}
        </div>
    );
}

export default PhotoUploadCrop;
