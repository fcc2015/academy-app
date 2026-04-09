import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_URL } from '../config';

const SUPABASE_URL = 'https://kbhnqntteexatihidhkn.supabase.co';

/**
 * Google OAuth Callback Page
 * Supabase redirects here after Google login.
 * We extract the access_token from the URL hash, fetch the user role, and redirect.
 */
const AuthCallback = () => {
    const navigate = useNavigate();
    const [status, setStatus] = useState('جاري التحقق من هويتك...');
    const [error, setError] = useState(null);

    useEffect(() => {
        const processCallback = async () => {
            // Supabase puts tokens in the URL hash: #access_token=...&...
            const hash = window.location.hash.substring(1);
            const params = new URLSearchParams(hash);
            const access_token = params.get('access_token');

            if (!access_token) {
                setError('لم يتم العثور على رمز الدخول. يرجى المحاولة مرة أخرى.');
                return;
            }

            try {
                // Fetch user data from Supabase using the access token
                const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
                    headers: { Authorization: `Bearer ${access_token}`, apikey: import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtiaG5xbnR0ZWV4YXRpaGlkaGtuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3NDk2MDksImV4cCI6MjA4ODMyNTYwOX0.dwF2cxTuH7tCjDQv_IXsQNzWQmol6FbvWV17hBSyl94' }
                });

                if (!res.ok) throw new Error('Failed to fetch user info');
                const user = await res.json();

                const user_id = user.id;
                let role = user.user_metadata?.role;

                // If role not in metadata, look it up from the database
                if (!role) {
                    try {
                        const roleRes = await fetch(`${API_URL}/auth/role`, {
                            headers: { Authorization: `Bearer ${access_token}` }
                        });
                        if (roleRes.ok) {
                            const roleData = await roleRes.json();
                            role = roleData.role;
                        }
                    } catch (e) {
                        console.warn('Could not fetch role from API, using fallback');
                    }
                }

                // Final fallback
                if (!role) role = 'parent';

                // Store in localStorage
                localStorage.setItem('token', access_token);
                localStorage.setItem('role', role);
                localStorage.setItem('user_id', user_id);
                localStorage.setItem('token_expires', Date.now() + 24 * 60 * 60 * 1000);

                setStatus('تم التحقق! يتم تحويلك...');

                // Redirect based on role
                setTimeout(() => {
                    if (role === 'super_admin') navigate('/saas/dashboard');
                    else if (role === 'admin') navigate('/admin/dashboard');
                    else if (role === 'coach') navigate('/coach/dashboard');
                    else navigate('/parent/dashboard');
                }, 800);

            } catch (err) {
                console.error('Auth callback error:', err);
                setError('حدث خطأ أثناء تسجيل الدخول. يرجى المحاولة مرة أخرى.');
            }
        };

        processCallback();
    }, [navigate]);

    return (
        <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)' }}>
            <div className="text-center">
                {error ? (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-8 max-w-sm mx-4">
                        <p className="text-red-400 font-bold text-lg mb-4">⚠️ {error}</p>
                        <button onClick={() => navigate('/login')}
                            className="px-6 py-3 rounded-xl font-black text-white text-sm"
                            style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}>
                            العودة لتسجيل الدخول
                        </button>
                    </div>
                ) : (
                    <>
                        <div className="w-16 h-16 mx-auto mb-6 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
                        <p className="text-white font-bold text-lg">{status}</p>
                        <p className="text-indigo-300/50 text-sm mt-2">جاري التحقق من Google...</p>
                    </>
                )}
            </div>
        </div>
    );
};

export default AuthCallback;
