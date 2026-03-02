import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { KeyRound, Lock, ArrowRight, CheckCircle, Check, X, Eye, EyeOff } from 'lucide-react';
import { useToast } from '../context/ToastProvider';

export default function UpdatePassword() {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);

    // --- NEW: Toggle Visibility State ---
    const [showPassword, setShowPassword] = useState(false);

    const [theme] = useState(localStorage.getItem('theme') || 'light');
    const navigate = useNavigate();
    const { addToast } = useToast();

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        if (theme === 'dark') document.documentElement.classList.add('dark');
        else document.documentElement.classList.remove('dark');
    }, [theme]);

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (!session) {
                addToast("Invalid or expired password reset link.", "error");
                navigate('/login');
            }
        });
    }, [navigate, addToast]);

    const reqs = {
        length: password.length >= 8,
        upper: /[A-Z]/.test(password),
        lower: /[a-z]/.test(password),
        number: /[0-9]/.test(password),
        special: /[^A-Za-z0-9]/.test(password)
    };

    const isPasswordValid = Object.values(reqs).every(Boolean);
    const doPasswordsMatch = password === confirmPassword && password.length > 0;

    const handleUpdate = async (e) => {
        e.preventDefault();

        if (!isPasswordValid) {
            addToast("Please ensure all password requirements are met.", "error");
            return;
        }

        if (!doPasswordsMatch) {
            addToast("Passwords do not match.", "error");
            return;
        }

        setLoading(true);

        const { error } = await supabase.auth.updateUser({
            password: password
        });

        if (error) {
            addToast(error.message, "error");
            setLoading(false);
        } else {
            addToast("Password updated successfully!", "success");
            navigate('/');
        }
    };

    const RequirementItem = ({ met, text }) => (
        <div className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-colors duration-300 ${met ? 'text-emerald-500' : 'text-[var(--text-muted)] opacity-60'}`}>
            <div className={`w-4 h-4 rounded-full flex items-center justify-center transition-colors duration-300 ${met ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/30' : 'bg-[var(--bg-subtle)] border border-[var(--border-color)] text-[var(--text-muted)]'}`}>
                {met ? <Check size={10} strokeWidth={4} /> : <X size={10} strokeWidth={3} />}
            </div>
            {text}
        </div>
    );

    return (
        <div className="min-h-screen flex items-center justify-center bg-[var(--bg-subtle)] relative overflow-hidden transition-colors duration-300 px-4">
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full blur-[120px] pointer-events-none bg-indigo-500/20"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full blur-[120px] pointer-events-none bg-purple-500/20"></div>

            <div className="w-full max-w-md bg-[var(--bg-surface)] rounded-[32px] shadow-2xl shadow-black/5 border border-[var(--border-color)] relative z-10 overflow-hidden animate-pop">
                <div className="h-2 w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>

                <div className="p-8 sm:p-10">
                    <div className="flex flex-col items-center text-center mb-8 animate-fade-in-up">
                        <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-white shadow-xl mb-5 bg-gradient-to-br from-indigo-500 to-purple-600 shadow-indigo-500/30">
                            <KeyRound size={32} />
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-black text-[var(--text-main)] tracking-tight leading-none mb-2">
                            Set New Password
                        </h1>
                        <p className="text-xs font-bold text-[var(--text-muted)] mt-1">
                            Your identity has been verified. Please create a secure password below.
                        </p>
                    </div>

                    <form onSubmit={handleUpdate} className="space-y-4 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>

                        <div className="form-control">
                            <label className="label text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] pb-1.5 pl-1">New Password</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[var(--text-muted)] group-focus-within:text-indigo-500 transition-colors"><Lock size={18} /></div>
                                {/* --- UPDATED: Dynamic Type & Reveal Button --- */}
                                <input
                                    type={showPassword ? "text" : "password"}
                                    required
                                    placeholder="••••••••"
                                    className="input input-bordered w-full h-14 pl-12 pr-12 bg-[var(--bg-subtle)] focus:bg-[var(--bg-surface)] text-[var(--text-main)] font-medium shadow-inner transition-all focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 text-base tracking-widest"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    disabled={loading}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-[var(--text-muted)] hover:text-indigo-500 transition-colors"
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        <div className="bg-[var(--bg-subtle)] p-4 rounded-xl border border-[var(--border-color)] shadow-inner space-y-2.5">
                            <RequirementItem met={reqs.length} text="8+ Characters" />
                            <div className="grid grid-cols-2 gap-2">
                                <RequirementItem met={reqs.upper} text="Uppercase" />
                                <RequirementItem met={reqs.lower} text="Lowercase" />
                                <RequirementItem met={reqs.number} text="Number" />
                                <RequirementItem met={reqs.special} text="Special Char" />
                            </div>
                        </div>

                        <div className="form-control pt-2">
                            <label className="label text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] pb-1.5 pl-1">Confirm Password</label>
                            <div className="relative group">
                                <div className={`absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors ${confirmPassword.length > 0 ? (doPasswordsMatch ? 'text-emerald-500' : 'text-red-500') : 'text-[var(--text-muted)] group-focus-within:text-indigo-500'}`}>
                                    <CheckCircle size={18} />
                                </div>
                                <input
                                    type={showPassword ? "text" : "password"}
                                    required
                                    placeholder="••••••••"
                                    className={`input input-bordered w-full h-14 pl-12 bg-[var(--bg-subtle)] focus:bg-[var(--bg-surface)] text-[var(--text-main)] font-medium shadow-inner transition-all focus:ring-4 text-base tracking-widest ${confirmPassword.length > 0
                                            ? (doPasswordsMatch ? 'border-emerald-500 focus:ring-emerald-500/10 focus:border-emerald-500' : 'border-red-500 focus:ring-red-500/10 focus:border-red-500')
                                            : 'focus:border-indigo-500 focus:ring-indigo-500/10'
                                        }`}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    disabled={loading}
                                />
                            </div>
                            {confirmPassword.length > 0 && !doPasswordsMatch && (
                                <p className="text-[10px] font-bold text-red-500 mt-1.5 pl-1">Passwords do not match</p>
                            )}
                        </div>

                        <button
                            type="submit"
                            disabled={loading || !isPasswordValid || !doPasswordsMatch}
                            className="btn w-full h-14 mt-4 text-white font-black text-base tracking-wide border-none shadow-lg transition-all hover:scale-[1.02] active:scale-95 gap-2 bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/30 disabled:opacity-50 disabled:hover:scale-100"
                        >
                            {loading ? <span className="loading loading-spinner"></span> : <>Update & Login <ArrowRight size={20} /></>}
                        </button>

                        {/* --- NEW: Cancel Button --- */}
                        <div className="text-center mt-4 pt-4 border-t border-dashed border-[var(--border-color)]">
                            <button
                                type="button"
                                onClick={() => navigate('/login')}
                                className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors hover:underline"
                            >
                                Cancel & Return to Login
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}