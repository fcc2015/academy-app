import React from 'react';
import { KeyRound, ShieldCheck, ShieldOff, Loader2, Check, X } from 'lucide-react';

const SecuritySection = ({
    twoFA,
    twoFAAction,
    setTwoFAAction,
    twoFASetup,
    setTwoFASetup,
    twoFACode,
    setTwoFACode,
    twoFASaving,
    handle2FASetup,
    handle2FAEnable,
    handle2FADisable,
    pwForm,
    setPwForm,
    pwSaving,
    handleChangePassword
}) => {
    return (
        <div className="space-y-8 mt-8">
            {/* ── 2FA / Security Section ── */}
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-8 border-b border-slate-100">
                    <div className="flex items-center gap-3 mb-1">
                        <div className="w-10 h-10 rounded-2xl bg-indigo-50 flex items-center justify-center">
                            <KeyRound size={20} className="text-indigo-600" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-slate-800">Two-Factor Authentication</h2>
                            <p className="text-sm text-slate-400 font-medium">Add an extra layer of security to your account</p>
                        </div>
                    </div>
                </div>

                <div className="p-8 space-y-6">
                    {/* Status row */}
                    <div className="flex items-center justify-between p-5 rounded-2xl border border-slate-100 bg-slate-50">
                        <div className="flex items-center gap-4">
                            {twoFA.enabled
                                ? <ShieldCheck size={24} className="text-emerald-500" />
                                : <ShieldOff size={24} className="text-slate-400" />
                            }
                            <div>
                                <p className="font-extrabold text-slate-800">
                                    {twoFA.enabled ? '2FA is enabled' : '2FA is disabled'}
                                </p>
                                <p className="text-xs text-slate-400 font-medium mt-0.5">
                                    {twoFA.enabled
                                        ? 'Your account is protected with Google Authenticator'
                                        : 'Enable to require a code from your authenticator app at login'}
                                </p>
                            </div>
                        </div>
                        {!twoFA.loading && !twoFAAction && (
                            twoFA.enabled ? (
                                <button
                                    onClick={() => { setTwoFAAction('disable'); setTwoFACode(''); }}
                                    className="px-4 py-2 text-sm font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-colors"
                                >
                                    Disable
                                </button>
                            ) : (
                                <button
                                    onClick={handle2FASetup}
                                    disabled={twoFASaving}
                                    className="px-4 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors flex items-center gap-2"
                                >
                                    {twoFASaving ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
                                    Enable 2FA
                                </button>
                            )
                        )}
                    </div>

                    {/* Setup flow — QR code */}
                    {twoFAAction === 'enable' && twoFASetup && (
                        <div className="space-y-5 p-5 rounded-2xl border border-indigo-100 bg-indigo-50/50">
                            <p className="font-bold text-slate-700 text-sm">
                                1. Scan this QR code with <strong>Google Authenticator</strong> or <strong>Authy</strong>
                            </p>
                            <div className="flex justify-center">
                                <img src={twoFASetup.qr_code} alt="2FA QR Code" className="w-48 h-48 rounded-2xl border-4 border-white shadow-lg" />
                            </div>
                            <details className="text-xs text-slate-500">
                                <summary className="cursor-pointer font-semibold">Can't scan? Enter manually</summary>
                                <code className="block mt-2 p-3 bg-white rounded-xl font-mono text-slate-700 break-all select-all border border-slate-200">
                                    {twoFASetup.secret}
                                </code>
                            </details>
                            <p className="font-bold text-slate-700 text-sm">2. Enter the 6-digit code from the app to confirm</p>
                            <div className="flex gap-3">
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    maxLength={6}
                                    placeholder="000000"
                                    value={twoFACode}
                                    onChange={e => setTwoFACode(e.target.value.replace(/\D/g, ''))}
                                    className="flex-1 px-4 py-3 border border-slate-200 rounded-xl font-mono text-xl text-center tracking-widest font-black outline-none focus:border-indigo-400 transition-colors"
                                />
                                <button
                                    onClick={handle2FAEnable}
                                    disabled={twoFACode.length !== 6 || twoFASaving}
                                    className="px-5 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                                >
                                    {twoFASaving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                                    Verify
                                </button>
                                <button
                                    onClick={() => { setTwoFAAction(null); setTwoFASetup(null); setTwoFACode(''); }}
                                    className="px-4 py-3 text-slate-500 hover:text-slate-700 font-bold rounded-xl hover:bg-slate-100 transition-colors"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Disable flow */}
                    {twoFAAction === 'disable' && (
                        <div className="space-y-4 p-5 rounded-2xl border border-red-100 bg-red-50/50">
                            <p className="font-bold text-slate-700 text-sm">
                                Enter your current authenticator code to disable 2FA
                            </p>
                            <div className="flex gap-3">
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    maxLength={6}
                                    placeholder="000000"
                                    value={twoFACode}
                                    onChange={e => setTwoFACode(e.target.value.replace(/\D/g, ''))}
                                    className="flex-1 px-4 py-3 border border-slate-200 rounded-xl font-mono text-xl text-center tracking-widest font-black outline-none focus:border-red-400 transition-colors"
                                />
                                <button
                                    onClick={handle2FADisable}
                                    disabled={twoFACode.length !== 6 || twoFASaving}
                                    className="px-5 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                                >
                                    {twoFASaving ? <Loader2 size={16} className="animate-spin" /> : <ShieldOff size={16} />}
                                    Disable
                                </button>
                                <button
                                    onClick={() => { setTwoFAAction(null); setTwoFACode(''); }}
                                    className="px-4 py-3 text-slate-500 hover:text-slate-700 font-bold rounded-xl hover:bg-slate-100 transition-colors"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Change Password Section ── */}
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-8 border-b border-slate-100">
                    <div className="flex items-center gap-3 mb-1">
                        <div className="w-10 h-10 rounded-2xl bg-amber-50 flex items-center justify-center">
                            <KeyRound size={20} className="text-amber-600" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-slate-800">Change Password</h2>
                            <p className="text-sm text-slate-400 font-medium">All active sessions will be signed out after the change</p>
                        </div>
                    </div>
                </div>

                <div className="p-8 space-y-4 max-w-lg">
                    {[
                        { label: 'Current password', key: 'current', placeholder: '••••••••' },
                        { label: 'New password',     key: 'next',    placeholder: 'Min. 8 characters' },
                        { label: 'Confirm new',      key: 'confirm', placeholder: 'Repeat new password' },
                    ].map(({ label, key, placeholder }) => (
                        <div key={key}>
                            <label className="block text-sm font-bold text-slate-600 mb-1">{label}</label>
                            <input
                                type="password"
                                placeholder={placeholder}
                                value={pwForm[key]}
                                onChange={e => setPwForm(f => ({ ...f, [key]: e.target.value }))}
                                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-amber-400 transition-colors"
                            />
                        </div>
                    ))}

                    <button
                        onClick={handleChangePassword}
                        disabled={pwSaving || !pwForm.current || !pwForm.next || !pwForm.confirm}
                        className="flex items-center gap-2 px-6 py-3 bg-amber-600 text-white font-bold rounded-xl hover:bg-amber-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                        {pwSaving ? <Loader2 size={16} className="animate-spin" /> : <KeyRound size={16} />}
                        Update Password
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SecuritySection;
