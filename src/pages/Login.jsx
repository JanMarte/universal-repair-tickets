import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { Mail, Lock, ArrowRight, Wrench, ShieldAlert, Power, LogOut, Loader2, ShieldCheck, Moon, Sun, User, Package, AlertTriangle } from 'lucide-react';
import { useToast } from '../context/ToastProvider';
import { Turnstile } from '@marsidev/react-turnstile';

export default function Login() {
    // UI Modes
    const [portalMode, setPortalMode] = useState(localStorage.getItem('univac_last_portal_mode') || 'customer');
    const [isSignUp, setIsSignUp] = useState(false);

    // Auth State
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');

    // Security & System State
    const [loading, setLoading] = useState(false);
    const [captchaToken, setCaptchaToken] = useState(null);
    const [showExpiredModal, setShowExpiredModal] = useState(false);
    const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');

    // Lockout State
    const [isLockedOut, setIsLockedOut] = useState(false);
    const [lockoutTimeRemaining, setLockoutTimeRemaining] = useState(0);

    // Refs
    const navigate = useNavigate();
    const { addToast } = useToast();
    const clickCountRef = useRef(0);
    const clickTimeoutRef = useRef(null);
    const turnstileRef = useRef(null); // <-- NEW: Ref for resetting the CAPTCHA

    const isLocked = !captchaToken || isLockedOut;

    // --- LOCKOUT LOGIC ---
    useEffect(() => {
        checkLockoutStatus();
        const interval = setInterval(checkLockoutStatus, 1000);
        return () => clearInterval(interval);
    }, [portalMode]);

    const checkLockoutStatus = () => {
        const lockKey = `univac_lock_${portalMode}`;
        const lockedUntil = localStorage.getItem(lockKey);

        if (lockedUntil) {
            const timeRemaining = parseInt(lockedUntil) - Date.now();
            if (timeRemaining > 0) {
                setIsLockedOut(true);
                setLockoutTimeRemaining(Math.ceil(timeRemaining / 1000));
            } else {
                localStorage.removeItem(lockKey);
                localStorage.removeItem(`univac_strikes_${portalMode}`);
                setIsLockedOut(false);
                setLockoutTimeRemaining(0);
            }
        } else {
            setIsLockedOut(false);
            setLockoutTimeRemaining(0);
        }
    };

    const registerFailedAttempt = (customMessage) => {
        const strikeKey = `univac_strikes_${portalMode}`;
        const lockKey = `univac_lock_${portalMode}`;
        const maxStrikes = portalMode === 'staff' ? 3 : 5;
        const lockoutMinutes = portalMode === 'staff' ? 15 : 5;

        let currentStrikes = parseInt(localStorage.getItem(strikeKey) || '0') + 1;
        localStorage.setItem(strikeKey, currentStrikes.toString());

        // FIX: Reset Turnstile so they can try again with a fresh token
        if (turnstileRef.current) turnstileRef.current.reset();
        setCaptchaToken(null);

        if (currentStrikes >= maxStrikes) {
            const lockUntil = Date.now() + (lockoutMinutes * 60 * 1000);
            localStorage.setItem(lockKey, lockUntil.toString());
            addToast(`Maximum attempts exceeded. Device locked out of ${portalMode} portal for ${lockoutMinutes} minutes.`, 'error');
            checkLockoutStatus();
        } else {
            addToast(`${customMessage} (${maxStrikes - currentStrikes} attempts remaining)`, 'error');
        }
    };

    // --- SECRET ADMIN OVERRIDE ---
    const handleSecretOverride = () => {
        clickCountRef.current += 1;

        if (clickCountRef.current >= 5) {
            localStorage.removeItem('univac_lock_staff');
            localStorage.removeItem('univac_lock_customer');
            localStorage.removeItem('univac_strikes_staff');
            localStorage.removeItem('univac_strikes_customer');
            setIsLockedOut(false);
            setLockoutTimeRemaining(0);
            addToast('Admin Override Activated: Security locks cleared.', 'success');

            clickCountRef.current = 0;
            if (clickTimeoutRef.current) clearTimeout(clickTimeoutRef.current);
            return;
        }

        if (clickTimeoutRef.current) clearTimeout(clickTimeoutRef.current);
        clickTimeoutRef.current = setTimeout(() => {
            clickCountRef.current = 0;
        }, 1000);
    };

    // --- Auto-redirect if already logged in ---
    useEffect(() => {
        if (!loading) {
            supabase.auth.getSession().then(({ data: { session } }) => {
                if (session) navigate('/');
            });
        }
    }, [navigate, loading]);

    // --- ON MOUNT: Check for Auto-Logout Flag ---
    useEffect(() => {
        const checkReason = setTimeout(() => {
            const wasAutoLoggedOut = localStorage.getItem('session_expired');
            if (wasAutoLoggedOut === 'true') {
                setShowExpiredModal(true);
            }
        }, 100);
        return () => clearTimeout(checkReason);
    }, []);

    const handleCloseModal = () => {
        localStorage.removeItem('session_expired');
        setShowExpiredModal(false);
    };

    // --- THEME MANAGEMENT ---
    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        if (theme === 'dark') document.documentElement.classList.add('dark');
        else document.documentElement.classList.remove('dark');
        localStorage.setItem('theme', theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme(prev => prev === 'light' ? 'dark' : 'light');
    };

    // --- AUTHENTICATION HANDLER ---
    const handleAuth = async (e) => {
        e.preventDefault();
        if (loading || isLockedOut) return;

        if (!captchaToken) {
            addToast("Please complete the security check.", "error");
            return;
        }

        setLoading(true);

        try {
            if (isSignUp && portalMode === 'customer') {
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: { full_name: fullName },
                        captchaToken: captchaToken
                    }
                });
                if (error) {
                    // FIX: Pass the real error message!
                    registerFailedAttempt(error.message);
                } else {
                    localStorage.setItem('univac_last_portal_mode', 'customer');
                    addToast("Success! Please check your email for the confirmation link.", "success");
                    setIsSignUp(false);
                }
            } else {
                const { data: authData, error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                    options: { captchaToken: captchaToken }
                });

                if (error) {
                    // FIX: Pass the real error message!
                    registerFailedAttempt(error.message);
                    setLoading(false);
                    return;
                }

                const { data: profile } = await supabase
                    .from('profiles')
                    .select('role')
                    .eq('id', authData.user.id)
                    .maybeSingle();

                const isStaffAccount = ['employee', 'manager', 'admin'].includes(profile?.role);

                localStorage.setItem('univac_last_portal_mode', isStaffAccount ? 'staff' : 'customer');

                if (portalMode === 'staff' && !isStaffAccount) {
                    await supabase.auth.signOut();
                    registerFailedAttempt("Unauthorized Access. Customer accounts cannot use the Staff portal.");
                    setLoading(false);
                    return;
                }

                localStorage.removeItem(`univac_strikes_${portalMode}`);
                localStorage.removeItem(`univac_lock_${portalMode}`);
                addToast('Access Granted. Welcome back!', 'success');
                navigate('/');
            }
        } catch (error) {
            registerFailedAttempt("An unexpected error occurred.");
        } finally {
            setLoading(false);
        }
    };

    const isCustomer = portalMode === 'customer';
    const primaryColor = isCustomer ? 'emerald' : 'indigo';

    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[var(--bg-subtle)] relative overflow-hidden transition-colors duration-300 px-4">

            {/* --- SESSION EXPIRED MODAL --- */}
            {showExpiredModal && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center animate-fade-in" onClick={handleCloseModal}>
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-all duration-500"></div>
                    <div className="relative bg-[var(--bg-surface)] border border-[var(--border-color)] shadow-2xl rounded-2xl p-8 max-w-sm w-full mx-4 text-center animate-pop">
                        <div className="mx-auto w-16 h-16 bg-indigo-50 dark:bg-indigo-900/20 rounded-full flex items-center justify-center mb-6 text-indigo-600 dark:text-indigo-400">
                            <Power size={32} />
                        </div>
                        <h2 className="text-2xl font-black text-[var(--text-main)] mb-2">Session Expired</h2>
                        <p className="text-[var(--text-muted)] font-medium mb-8 leading-relaxed">
                            You have been logged out due to inactivity to protect your data.
                        </p>
                        <button onClick={handleCloseModal} className="btn btn-gradient w-full h-12 rounded-xl text-white font-bold shadow-lg shadow-indigo-500/20 hover:scale-[1.02] transition-transform">
                            Return to Login
                        </button>
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

            {/* Abstract Background Elements */}
            <div className={`absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full blur-[120px] pointer-events-none transition-colors duration-1000 ${isCustomer ? 'bg-emerald-500/20' : 'bg-indigo-500/20'}`}></div>
            <div className={`absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full blur-[120px] pointer-events-none transition-colors duration-1000 ${isCustomer ? 'bg-teal-500/20' : 'bg-purple-500/20'}`}></div>

            <div className="w-full max-w-md bg-[var(--bg-surface)] rounded-[32px] shadow-2xl shadow-black/5 border border-[var(--border-color)] relative z-10 overflow-hidden animate-pop">

                {/* Premium Header Accent */}
                <div className={`h-2 w-full bg-gradient-to-r transition-colors duration-500 ${isCustomer ? 'from-emerald-400 via-teal-500 to-emerald-600' : 'from-indigo-500 via-purple-500 to-pink-500'}`}></div>

                <div className="p-8 sm:p-10">

                    {/* PORTAL TOGGLE */}
                    <div className="flex bg-[var(--bg-subtle)] p-1.5 rounded-xl mb-8 shadow-inner border border-[var(--border-color)] animate-fade-in-up">
                        <button
                            type="button"
                            className={`flex-1 py-2 text-[10px] uppercase tracking-widest font-black rounded-lg transition-all flex items-center justify-center gap-2 ${isCustomer ? 'bg-[var(--bg-surface)] text-emerald-600 dark:text-emerald-400 shadow-sm ring-1 ring-black/5 dark:ring-white/5' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}
                            onClick={() => { setPortalMode('customer'); }}
                        >
                            <User size={14} /> Customer
                        </button>
                        <button
                            type="button"
                            className={`flex-1 py-2 text-[10px] uppercase tracking-widest font-black rounded-lg transition-all flex items-center justify-center gap-2 ${!isCustomer ? 'bg-[var(--bg-surface)] text-indigo-600 dark:text-indigo-400 shadow-sm ring-1 ring-black/5 dark:ring-white/5' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}
                            onClick={() => { setPortalMode('staff'); setIsSignUp(false); }}
                        >
                            <ShieldAlert size={14} /> Staff
                        </button>
                    </div>

                    {/* Brand Identity with Secret Admin Override */}
                    <div className="flex flex-col items-center text-center mb-8 animate-fade-in-up">
                        <div
                            onClick={handleSecretOverride}
                            className={`w-16 h-16 rounded-2xl flex items-center justify-center text-white shadow-xl mb-5 transition-colors duration-500 cursor-pointer hover:scale-105 active:scale-95 ${isCustomer ? 'bg-gradient-to-br from-emerald-400 to-teal-600 shadow-emerald-500/30' : 'bg-gradient-to-br from-indigo-500 to-purple-600 shadow-indigo-500/30'}`}
                            title={isLockedOut ? "Admin Override (Tap 5 times to reset lock)" : "University Vac & Sew"}
                        >
                            {isCustomer ? <Package size={32} fill="currentColor" /> : <Wrench size={32} fill="currentColor" />}
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-black text-[var(--text-main)] tracking-tight leading-none mb-2">
                            University <span className={`transition-colors duration-500 ${isCustomer ? 'text-emerald-500' : 'text-indigo-500'}`}>Vac & Sew</span>
                        </h1>
                        <p className="text-xs font-bold text-[var(--text-muted)] mt-1">
                            {isCustomer ? (isSignUp ? 'Create your repair account' : 'Track your active repairs') : 'Authorized personnel login'}
                        </p>
                    </div>

                    {/* Form Container */}
                    <form onSubmit={handleAuth} className="space-y-4 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>

                        {/* Lockout Warning Banner */}
                        {isLockedOut ? (
                            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 p-4 rounded-xl flex items-start gap-3 shadow-inner animate-pulse">
                                <AlertTriangle className="text-red-500 flex-none mt-0.5" size={18} />
                                <div>
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-red-600 dark:text-red-400 mb-0.5">Device Locked</h4>
                                    <p className="text-xs font-bold text-[var(--text-main)]">Try again in {formatTime(lockoutTimeRemaining)}</p>
                                </div>
                            </div>
                        ) : (
                            <div className={`flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all duration-500 mb-2 ${!captchaToken ? 'text-amber-500' : 'text-emerald-500'}`}>
                                {!captchaToken ? (
                                    <> <Loader2 size={12} className="animate-spin" /> Verifying Security... </>
                                ) : (
                                    <> <ShieldCheck size={12} /> Verified Human </>
                                )}
                            </div>
                        )}

                        <div className={`space-y-4 transition-all duration-500 ${isLocked ? 'opacity-50 grayscale pointer-events-none' : 'opacity-100'}`}>

                            {/* Full Name (Only for Customer Sign Up) */}
                            {isCustomer && isSignUp && (
                                <div className="form-control animate-pop">
                                    <label className="label text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] pb-1.5 pl-1">Full Name</label>
                                    <div className="relative group">
                                        <div className={`absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[var(--text-muted)] group-focus-within:text-${primaryColor}-500 transition-colors`}>
                                            <User size={18} />
                                        </div>
                                        <input type="text" required placeholder="John Doe" className={`input input-bordered w-full h-14 pl-12 bg-[var(--bg-subtle)] focus:bg-[var(--bg-surface)] text-[var(--text-main)] font-medium shadow-inner transition-all focus:border-${primaryColor}-500 focus:ring-4 focus:ring-${primaryColor}-500/10 text-base`} value={fullName} onChange={(e) => setFullName(e.target.value)} disabled={loading || isLocked} />
                                    </div>
                                </div>
                            )}

                            <div className="form-control">
                                <label className="label text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] pb-1.5 pl-1">Email Address</label>
                                <div className="relative group">
                                    <div className={`absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[var(--text-muted)] group-focus-within:text-${primaryColor}-500 transition-colors`}>
                                        <Mail size={18} />
                                    </div>
                                    <input type="email" required autoComplete="username" placeholder="you@example.com" className={`input input-bordered w-full h-14 pl-12 bg-[var(--bg-subtle)] focus:bg-[var(--bg-surface)] text-[var(--text-main)] font-medium shadow-inner transition-all focus:border-${primaryColor}-500 focus:ring-4 focus:ring-${primaryColor}-500/10 text-base`} value={email} onChange={(e) => setEmail(e.target.value)} disabled={loading || isLocked} />
                                </div>
                            </div>

                            <div className="form-control">
                                <label className="label text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] pb-1.5 pl-1">Password</label>
                                <div className="relative group">
                                    <div className={`absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[var(--text-muted)] group-focus-within:text-${primaryColor}-500 transition-colors`}>
                                        <Lock size={18} />
                                    </div>
                                    <input type="password" required autoComplete={isSignUp ? "new-password" : "current-password"} placeholder="••••••••" className={`input input-bordered w-full h-14 pl-12 bg-[var(--bg-subtle)] focus:bg-[var(--bg-surface)] text-[var(--text-main)] font-medium shadow-inner transition-all focus:border-${primaryColor}-500 focus:ring-4 focus:ring-${primaryColor}-500/10 text-base tracking-widest`} value={password} onChange={(e) => setPassword(e.target.value)} disabled={loading || isLocked} />
                                </div>
                            </div>
                        </div>

                        {/* Turnstile Widget Box */}
                        <div className={`flex justify-center my-4 w-full overflow-hidden min-h-[65px] rounded-xl transition-opacity ${isLockedOut ? 'opacity-0 pointer-events-none hidden' : 'opacity-100'}`}>
                            <Turnstile
                                ref={turnstileRef} // <-- ATTACHED THE REF HERE
                                siteKey={import.meta.env.VITE_TURNSTILE_SITE_KEY}
                                onSuccess={(token) => setCaptchaToken(token)}
                                options={{ theme: theme === 'dark' ? 'dark' : 'light', size: 'flexible' }}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading || isLocked || !email || !password || (isSignUp && !fullName)}
                            className={`btn w-full h-14 mt-2 text-white font-black text-base tracking-wide border-none shadow-lg transition-all hover:scale-[1.02] active:scale-95 gap-2 group disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed ${isCustomer ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/30' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/30'}`}
                        >
                            {loading ? <span className="loading loading-spinner"></span> : (
                                <>{isSignUp ? 'Create Account' : 'Secure Login'} <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" /></>
                            )}
                        </button>
                    </form>

                    {/* Footer Toggle (Only visible for customers) */}
                    <div className="mt-8 pt-6 border-t-2 border-dashed border-[var(--border-color)] text-center animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
                        {isCustomer ? (
                            <>
                                <p className="text-xs font-bold text-[var(--text-muted)]">
                                    {isSignUp ? "Already have an account?" : "Dropping off a new repair?"}
                                </p>
                                <button
                                    type="button"
                                    className={`text-[10px] font-black uppercase tracking-widest mt-1.5 transition-colors hover:underline ${isCustomer ? 'text-emerald-600 dark:text-emerald-400' : 'text-indigo-600 dark:text-indigo-400'}`}
                                    onClick={() => setIsSignUp(!isSignUp)}
                                >
                                    {isSignUp ? "Sign In Instead" : "Create a Customer Account"}
                                </button>
                            </>
                        ) : (
                            <p className="text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-widest flex flex-col gap-1 items-center">
                                <ShieldAlert size={14} className="opacity-50" />
                                Strictly for authorized technicians. <br /> Access is monitored and logged.
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {/* Background Footer Signature */}
            <div className="absolute bottom-6 text-center w-full z-0">
                <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] opacity-50">
                    © 2026 University Vacuum & Sewing System
                </p>
            </div>
        </div>
    );
}