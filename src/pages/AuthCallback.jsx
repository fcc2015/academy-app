import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_URL } from '../config';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

/**
 * Google OAuth Callback — handles both PKCE (code in query) and implicit (token in hash).
 * - PKCE: exchanges code + stored verifier for access_token
 * - Implicit: reads access_token directly from URL hash
 * - Retries backend role fetch 3× (Render cold-start protection)
 */
const AuthCallback = () => {
    const navigate = useNavigate();
    const [status, setStatus] = useState('جاري التحقق من هويتك...');
    const [error, setError] = useState(null);

    useEffect(() => {
        const processCallback = async () => {
            const queryParams = new URLSearchParams(window.location.search);
            const hashParams  = new URLSearchParams(window.location.hash.substring(1));

            // ── 1. Check for OAuth error ────────────────────────────────
            const oauthError = queryParams.get('error') || hashParams.get('error');
            if (oauthError) {
                const desc = queryParams.get('error_description')
                    || hashParams.get('error_description')
                    || oauthError;
                const readable = decodeURIComponent(desc.replace(/\+/g, ' '));

                // Common: email already registered with password provider
                if (readable.toLowerCase().includes('email') || readable.toLowerCase().includes('already')) {
                    setError('هذا الإيميل مسجّل بكلمة مرور. يرجى تسجيل الدخول بالإيميل وكلمة المرور.');
                } else {
                    setError(readable);
                }
                return;
            }

            // ── 2. Get access_token via PKCE or implicit ────────────────
            let access_token = null;

            // 2a. PKCE: code in query params
            const code = queryParams.get('code');
            if (code) {
                setStatus('جاري تبادل رمز الدخول...');
                const verifier = sessionStorage.getItem('oauth_code_verifier') || '';
                sessionStorage.removeItem('oauth_code_verifier');

                try {
                    const tokenRes = await fetch(
                        `${SUPABASE_URL}/auth/v1/token?grant_type=pkce`,
                        {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'apikey': SUPABASE_ANON_KEY
                            },
                            body: JSON.stringify({ auth_code: code, code_verifier: verifier })
                        }
                    );
                    if (tokenRes.ok) {
                        const td = await tokenRes.json();
                        access_token = td.access_token;
                    } else {
                        const errData = await tokenRes.json().catch(() => ({}));
                        setError(errData.error_description || errData.msg || 'فشل تبادل رمز OAuth.');
                        return;
                    }
                } catch {
                    setError('فشل الاتصال بخادم المصادقة. يرجى المحاولة مرة أخرى.');
                    return;
                }
            }

            // 2b. Implicit: access_token in URL hash
            if (!access_token) {
                access_token = hashParams.get('access_token');
            }

            if (!access_token) {
                setError('لم يتم العثور على رمز الدخول. يرجى المحاولة مرة أخرى.');
                return;
            }

            // ── 3. Fetch user info from Supabase ────────────────────────
            try {
                setStatus('جاري التحقق من المستخدم...');
                const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
                    headers: {
                        Authorization: `Bearer ${access_token}`,
                        apikey: SUPABASE_ANON_KEY
                    }
                });
                if (!res.ok) throw new Error('Failed to fetch user');
                const user = await res.json();
                const user_id = user.id;

                // ── 4. Fetch role from backend (retry × 3 for Render cold-start) ──
                let role = user.user_metadata?.role || 'parent';
                for (let attempt = 0; attempt < 3; attempt++) {
                    try {
                        if (attempt > 0) {
                            setStatus(`الخادم يستيقظ... (${attempt}/3)`);
                            await new Promise(r => setTimeout(r, 6000));
                        }
                        const roleRes = await fetch(`${API_URL}/auth/role`, {
                            headers: { Authorization: `Bearer ${access_token}` }
                        });
                        if (roleRes.ok) {
                            const roleData = await roleRes.json();
                            role = roleData.role || role;
                            break;
                        }
                    } catch {
                        // continue to next attempt
                    }
                }

                // ── 5. Store in localStorage ────────────────────────────
                localStorage.setItem('token', access_token);
                localStorage.setItem('role', role);
                localStorage.setItem('user_id', user_id);
                localStorage.setItem('token_expires', Date.now() + 24 * 60 * 60 * 1000);

                setStatus('تم! جاري التوجيه...');

                // ── 6. SaaS pending registration ────────────────────────
                const pendingSaas = localStorage.getItem('pending_saas_registration');
                if (pendingSaas === 'true') {
                    localStorage.removeItem('pending_saas_registration');
                    setTimeout(() => navigate(
                        `/saas-platform?setup=true&user_id=${user_id}&email=${encodeURIComponent(user.email)}`,
                        { replace: true }
                    ), 800);
                    return;
                }

                // ── 7. Redirect by role ──────────────────────────────────
                setTimeout(() => {
                    if (role === 'super_admin') navigate('/saas/dashboard', { replace: true });
                    else if (role === 'admin')   navigate('/admin/dashboard', { replace: true });
                    else if (role === 'coach')   navigate('/coach/dashboard', { replace: true });
                    else                         navigate('/parent/dashboard', { replace: true });
                }, 800);

            } catch (err) {
                console.error('Auth callback error:', err);
                setError('حدث خطأ أثناء تسجيل الدخول. يرجى المحاولة مرة أخرى.');
            }
        };

        processCallback();
    }, [navigate]);

    return (
        <div
            className="min-h-screen flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)' }}
        >
            <div className="text-center max-w-sm mx-4">
                {error ? (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-8">
                        <div className="text-4xl mb-4">⚠️</div>
                        <p className="text-red-400 font-bold text-lg mb-2">خطأ في تسجيل الدخول</p>
                        <p className="text-red-300/80 text-sm mb-6 leading-relaxed">{error}</p>
                        <div className="flex flex-col gap-3">
                            <button
                                onClick={() => navigate('/login')}
                                className="px-6 py-3 rounded-xl font-black text-white text-sm transition-all hover:scale-105"
                                style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}
                            >
                                تسجيل الدخول بالإيميل
                            </button>
                            <button
                                onClick={() => { window.location.href = '/login'; }}
                                className="px-6 py-3 rounded-xl font-bold text-slate-400 text-sm hover:text-white transition-colors"
                            >
                                العودة للصفحة الرئيسية
                            </button>
                        </div>
                    </div>
                ) : (
                    <div>
                        <div className="w-20 h-20 mx-auto mb-6 relative">
                            <div className="w-full h-full border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
                            <div className="absolute inset-0 flex items-center justify-center text-2xl">⚽</div>
                        </div>
                        <p className="text-white font-bold text-xl mb-2">{status}</p>
                        <p className="text-indigo-300/50 text-sm">التحقق عبر Google...</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AuthCallback;
