import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { Lock, Mail, User } from 'lucide-react';
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
        setLoading(true);

        if (isSignUp) {
            const { error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: { full_name: fullName }
                }
            });
            if (error) {
                addToast(error.message, "error");
            } else {
                addToast("Check your email for the confirmation link!", "success");
            }
        } else {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) {
                addToast(error.message, "error");
            } else {
                addToast("Logged in successfully", "success");
            }
        }
        setLoading(false);
    };

    return (
        // Container lets the body texture show through
        <div className="min-h-screen flex items-center justify-center p-4 transition-colors duration-300">
            
            {/* Card: Solid White in Light Mode, Slate-800 in Dark Mode */}
            <div className="w-full max-w-sm bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 animate-pop overflow-hidden relative">
                
                {/* Optional decorative top border */}
                <div className="h-1.5 w-full bg-gradient-to-r from-indigo-500 to-purple-500 absolute top-0 left-0"></div>

                <div className="p-8">
                    <div className="text-center mb-8">
                        <h1 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight mb-2">Vacuum Shop</h1>
                        <p className="text-slate-500 dark:text-slate-400 font-medium text-sm">
                            {isSignUp ? 'Create a new account' : 'Sign in to your account'}
                        </p>
                    </div>

                    <form onSubmit={handleAuth} className="space-y-5">

                        {isSignUp && (
                            <div className="form-control">
                                <label className="label py-0 mb-1"><span className="label-text text-xs font-bold uppercase text-slate-500 dark:text-slate-400">Full Name</span></label>
                                <div className="relative">
                                    <User className="absolute left-3 top-3 text-slate-400" size={18} />
                                    <input
                                        type="text"
                                        placeholder="John Doe"
                                        className="input input-bordered w-full pl-10 bg-white dark:bg-slate-900 text-slate-900 dark:text-white border-slate-300 dark:border-slate-600 focus:border-indigo-500"
                                        value={fullName}
                                        onChange={(e) => setFullName(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>
                        )}

                        <div className="form-control">
                            <label className="label py-0 mb-1"><span className="label-text text-xs font-bold uppercase text-slate-500 dark:text-slate-400">Email Address</span></label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-3 text-slate-400" size={18} />
                                <input
                                    type="email"
                                    placeholder="email@example.com"
                                    className="input input-bordered w-full pl-10 bg-white dark:bg-slate-900 text-slate-900 dark:text-white border-slate-300 dark:border-slate-600 focus:border-indigo-500"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <div className="form-control">
                            <label className="label py-0 mb-1"><span className="label-text text-xs font-bold uppercase text-slate-500 dark:text-slate-400">Password</span></label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-3 text-slate-400" size={18} />
                                <input
                                    type="password"
                                    placeholder="••••••••"
                                    className="input input-bordered w-full pl-10 bg-white dark:bg-slate-900 text-slate-900 dark:text-white border-slate-300 dark:border-slate-600 focus:border-indigo-500"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <div className="form-control mt-8">
                            <button className="btn btn-gradient w-full rounded-full shadow-lg font-bold tracking-wide" disabled={loading}>
                                {loading ? <span className="loading loading-spinner text-white"></span> : (isSignUp ? 'Create Account' : 'Sign In')}
                            </button>
                        </div>

                        <div className="text-center text-sm mt-6 text-slate-500 dark:text-slate-400">
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