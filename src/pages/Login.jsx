import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Lock, Mail, User, ShieldCheck, Loader2, Moon, Sun, Power, LogOut } from 'lucide-react';
import { useToast } from '../context/ToastProvider';
import { Turnstile } from '@marsidev/react-turnstile';

export default function Login() {
    const { addToast } = useToast();
    const [loading, setLoading] = useState(false);
    const [isSignUp, setIsSignUp] = useState(false);
    const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');

    // Auth Form State
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [captchaToken, setCaptchaToken] = useState(null);

    // --- NEW: Session Expired Modal State ---
    const [showExpiredModal, setShowExpiredModal] = useState(false);

    const isLocked = !captchaToken;

    // --- ON MOUNT: Check for Auto-Logout Flag ---
    useEffect(() => {
        // We use a small timeout to ensure the DOM is ready and previous unmounts are done
        const checkReason = setTimeout(() => {
            const wasAutoLoggedOut = localStorage.getItem('session_expired');

            if (wasAutoLoggedOut === 'true') {
                console.log("Session expired flag found!"); // Debug log
                setShowExpiredModal(true);
                // CRITICAL: Don't remove it immediately. Remove it only when closing the modal.
            }
        }, 100);

        return () => clearTimeout(checkReason);
    }, []);

    // Update the close handler to clear the flag
    const handleCloseModal = () => {
        localStorage.removeItem('session_expired');
        setShowExpiredModal(false);
    };

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        if (theme === 'dark') document.documentElement.classList.add('dark');
        else document.documentElement.classList.remove('dark');
        localStorage.setItem('theme', theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme(prev => prev === 'light' ? 'dark' : 'light');
    };

    const handleAuth = async (e) => {
        e.preventDefault();
        if (loading) return;

        if (!captchaToken) {
            addToast("Please complete the security check.", "error");
            return;
        }

        setLoading(true);

        try {
            if (isSignUp) {
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: { full_name: fullName },
                        captchaToken: captchaToken
                    }
                });
                if (error) throw error;
                addToast("Check your email for the confirmation link!", "success");
            } else {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                    options: {
                        captchaToken: captchaToken
                    }
                });
                if (error) throw error;
                addToast("Logged in successfully", "success");
            }
        } catch (error) {
            addToast(error.message, "error");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 transition-colors duration-300 bg-[var(--bg-subtle)] font-sans relative">

            {/* --- SESSION EXPIRED MODAL (New) --- */}
            {showExpiredModal && (
                <div
                    className="fixed inset-0 z-[9999] flex items-center justify-center animate-fade-in"
                    onClick={handleCloseModal} // <--- UPDATED HANDLER
                >
                    {/* Backdrop */}
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-all duration-500"></div>

                    {/* Modal Content */}
                    <div className="relative bg-[var(--bg-surface)] border border-[var(--border-color)] shadow-2xl rounded-2xl p-8 max-w-sm w-full mx-4 text-center animate-pop">
                        <div className="mx-auto w-16 h-16 bg-indigo-50 dark:bg-indigo-900/20 rounded-full flex items-center justify-center mb-6 text-indigo-600 dark:text-indigo-400">
                            <Power size={32} />
                        </div>
                        <h2 className="text-2xl font-black text-[var(--text-main)] mb-2">Session Expired</h2>
                        <p className="text-[var(--text-muted)] font-medium mb-8 leading-relaxed">
                            You have been logged out due to inactivity to protect your data.
                        </p>
                        <button
                            onClick={handleCloseModal} // <--- UPDATED HANDLER
                            className="btn btn-gradient w-full h-12 rounded-xl text-white font-bold shadow-lg shadow-indigo-500/20 hover:scale-[1.02] transition-transform"
                        >
                            Return to Login
                        </button>
                        <div className="mt-6 text-[10px] text-[var(--text-muted)] uppercase tracking-widest font-bold flex items-center justify-center gap-2">
                            <LogOut size={12} /> System Auto-Protect
                        </div>
                    </div>
                </div>
            )}

            {/* --- THEME TOGGLE --- */}
            <div className="absolute top-4 right-4 z-50">
                <button
                    onClick={toggleTheme}
                    className="btn btn-circle btn-ghost w-14 h-14 text-[var(--text-muted)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-main)] transition-all shadow-sm border border-transparent hover:border-[var(--border-color)]"
                    title="Toggle Theme"
                >
                    {theme === 'light' ? <Moon size={24} /> : <Sun size={24} />}
                </button>
            </div>

            {/* LOGIN CARD */}
            <div className="w-full max-w-sm rounded-2xl shadow-2xl animate-pop overflow-hidden relative bg-[var(--bg-surface)] border border-[var(--border-color)] z-10">
                <div className="h-1.5 w-full bg-gradient-to-r from-indigo-500 to-purple-500 absolute top-0 left-0"></div>
                <div className="p-8">
                    <div className="text-center mb-6">
                        <h1 className="text-3xl font-black text-[var(--text-main)] tracking-tight mb-2">Vacuum Shop</h1>
                        <p className="text-[var(--text-muted)] font-medium text-sm">
                            {isSignUp ? 'Create a new account' : 'Sign in to your account'}
                        </p>
                    </div>

                    <form onSubmit={handleAuth} className="space-y-5">
                        <div className={`flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all duration-500 ${isLocked ? 'text-amber-500' : 'text-emerald-500'}`}>
                            {isLocked ? (
                                <> <Loader2 size={12} className="animate-spin" /> Verifying Security... </>
                            ) : (
                                <> <ShieldCheck size={12} /> Verified Human </>
                            )}
                        </div>

                        <div className={`space-y-5 transition-all duration-500 ${isLocked ? 'opacity-50 grayscale pointer-events-none' : 'opacity-100'}`}>
                            {isSignUp && (
                                <div className="form-control">
                                    <label className="label py-0 mb-1">
                                        <span className="label-text text-xs font-bold uppercase text-[var(--text-muted)]">Full Name</span>
                                    </label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[var(--text-muted)]">
                                            <User size={18} />
                                        </div>
                                        <input type="text" placeholder="John Doe" className="input input-bordered w-full pl-10 bg-[var(--bg-subtle)] text-[var(--text-main)] focus:border-indigo-500 focus:bg-[var(--bg-surface)] transition-colors" value={fullName} onChange={(e) => setFullName(e.target.value)} disabled={isLocked || loading} required />
                                    </div>
                                </div>
                            )}
                            <div className="form-control">
                                <label className="label py-0 mb-1">
                                    <span className="label-text text-xs font-bold uppercase text-[var(--text-muted)]">Email Address</span>
                                </label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[var(--text-muted)]">
                                        <Mail size={18} />
                                    </div>
                                    <input type="email" name="email" autoComplete='username' placeholder="email@example.com" className="input input-bordered w-full pl-10 bg-[var(--bg-subtle)] text-[var(--text-main)] focus:border-indigo-500 focus:bg-[var(--bg-surface)] transition-colors" value={email} onChange={(e) => setEmail(e.target.value)} disabled={isLocked || loading} required />
                                </div>
                            </div>
                            <div className="form-control">
                                <label className="label py-0 mb-1">
                                    <span className="label-text text-xs font-bold uppercase text-[var(--text-muted)]">Password</span>
                                </label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[var(--text-muted)]">
                                        <Lock size={18} />
                                    </div>
                                    <input type="password" name="password" autoComplete='current-password' placeholder="••••••••" className="input input-bordered w-full pl-10 bg-[var(--bg-subtle)] text-[var(--text-main)] focus:border-indigo-500 focus:bg-[var(--bg-surface)] transition-colors" value={password} onChange={(e) => setPassword(e.target.value)} disabled={isLocked || loading} required />
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-center my-2 w-full overflow-hidden min-h-[65px]">
                            <Turnstile siteKey={import.meta.env.VITE_TURNSTILE_SITE_KEY} onSuccess={(token) => setCaptchaToken(token)} options={{ theme: 'auto', size: 'flexible' }} />
                        </div>

                        <div className="form-control mt-2">
                            <button className="btn btn-gradient w-full rounded-full shadow-lg font-bold tracking-wide disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] transition-transform" disabled={isLocked || loading}>
                                {loading ? <span className="loading loading-spinner text-white"></span> : (isSignUp ? 'Create Account' : 'Sign In')}
                            </button>
                        </div>

                        <div className="text-center text-sm mt-6 text-[var(--text-muted)]">
                            {isSignUp ? "Already have an account?" : "Need an account?"}{" "}
                            <button type="button" className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline ml-1" onClick={() => setIsSignUp(!isSignUp)}>
                                {isSignUp ? "Login" : "Sign Up"}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}