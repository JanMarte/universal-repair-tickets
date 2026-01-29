import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { Lock, Mail, User, AlertCircle } from 'lucide-react';
import { useToast } from '../context/ToastProvider';

export default function Login() {
    const { addToast } = useToast();
    const [loading, setLoading] = useState(false);
    const [isSignUp, setIsSignUp] = useState(false);

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');

    const handleAuth = async (e) => {
        e.preventDefault();
        if (loading) return;
        setLoading(true);

        try {
            if (isSignUp) {
                // SECURITY: Include metadata immediately so triggers handle the profile creation
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: { full_name: fullName }
                    }
                });
                if (error) throw error;
                addToast("Check your email for the confirmation link!", "success");
            } else {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
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
        // Container: Uses global background (Graph Paper)
        <div className="min-h-screen flex items-center justify-center p-4 transition-colors duration-300">
            
            {/* Card: Uses Semantic 'content-card' styling but centered */}
            <div className="w-full max-w-sm rounded-2xl shadow-2xl animate-pop overflow-hidden relative bg-[var(--bg-surface)] border border-[var(--border-color)]">
                
                {/* Decorative Top Border */}
                <div className="h-1.5 w-full bg-gradient-to-r from-indigo-500 to-purple-500 absolute top-0 left-0"></div>

                <div className="p-8">
                    <div className="text-center mb-8">
                        <h1 className="text-3xl font-black text-[var(--text-main)] tracking-tight mb-2">Vacuum Shop</h1>
                        <p className="text-[var(--text-muted)] font-medium text-sm">
                            {isSignUp ? 'Create a new account' : 'Sign in to your account'}
                        </p>
                    </div>

                    <form onSubmit={handleAuth} className="space-y-5">

                        {isSignUp && (
                            <div className="form-control">
                                <label className="label py-0 mb-1">
                                    <span className="label-text text-xs font-bold uppercase text-[var(--text-muted)]">Full Name</span>
                                </label>
                                <div className="relative">
                                    <User className="absolute left-3 top-3.5 text-slate-400" size={18} />
                                    {/* Inputs auto-styled by index.css */}
                                    <input
                                        type="text"
                                        placeholder="John Doe"
                                        className="input input-bordered w-full pl-10"
                                        value={fullName}
                                        onChange={(e) => setFullName(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>
                        )}

                        <div className="form-control">
                            <label className="label py-0 mb-1">
                                <span className="label-text text-xs font-bold uppercase text-[var(--text-muted)]">Email Address</span>
                            </label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-3.5 text-slate-400" size={18} />
                                <input
                                    type="email"
                                    placeholder="email@example.com"
                                    className="input input-bordered w-full pl-10"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <div className="form-control">
                            <label className="label py-0 mb-1">
                                <span className="label-text text-xs font-bold uppercase text-[var(--text-muted)]">Password</span>
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-3.5 text-slate-400" size={18} />
                                <input
                                    type="password"
                                    placeholder="••••••••"
                                    className="input input-bordered w-full pl-10"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        {/* Error Warning (Visual only if needed later) */}
                        <div className="form-control mt-8">
                            <button className="btn btn-gradient w-full rounded-full shadow-lg font-bold tracking-wide" disabled={loading}>
                                {loading ? <span className="loading loading-spinner text-white"></span> : (isSignUp ? 'Create Account' : 'Sign In')}
                            </button>
                        </div>

                        <div className="text-center text-sm mt-6 text-[var(--text-muted)]">
                            {isSignUp ? "Already have an account?" : "Need an account?"}{" "}
                            <button
                                type="button"
                                className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline ml-1"
                                onClick={() => setIsSignUp(!isSignUp)}
                            >
                                {isSignUp ? "Login" : "Sign Up"}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}