import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useToast } from '../context/ToastProvider';
import {
    Wrench, MessageSquare, Users, Package,
    ArrowLeft, Moon, Sun, Settings as SettingsIcon, LogOut
} from 'lucide-react';

export default function Navbar({ activeTab, rightActions }) {
    const navigate = useNavigate();
    const { addToast } = useToast();

    const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
    const [currentUser, setCurrentUser] = useState({ id: null, email: '', role: 'customer', initial: '?' });

    // --- DYNAMIC BRANDING STATE ---
    const [shopName, setShopName] = useState('Shop Name');
    const [logoUrl, setLogoUrl] = useState(null);

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        if (theme === 'dark') document.documentElement.classList.add('dark');
        else document.documentElement.classList.remove('dark');
        localStorage.setItem('theme', theme);
    }, [theme]);

    useEffect(() => {
        fetchUserData();
        fetchShopSettings();
    }, []);

    const toggleTheme = () => {
        setTheme(prev => prev === 'light' ? 'dark' : 'light');
    };

    async function fetchUserData() {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
            setCurrentUser({
                id: user.id,
                email: user.email,
                // FIX: Default to 'customer' instead of 'employee' for security!
                role: profile?.role || 'customer',
                initial: user.email.charAt(0).toUpperCase()
            });
        }
    }

    async function fetchShopSettings() {
        const { data } = await supabase.from('shop_settings').select('shop_name, logo_url').eq('id', 1).single();
        if (data) {
            if (data.shop_name) setShopName(data.shop_name);
            if (data.logo_url) setLogoUrl(data.logo_url);
        }
    }

    const handleLogout = async () => {
        await supabase.auth.signOut();
        addToast("Logged out successfully", "info");
        navigate('/login');
    };

    // Split the shop name to keep the cool 2-color styling
    const nameParts = shopName.trim().split(' ');
    const firstWord = nameParts[0];
    const restOfName = nameParts.slice(1).join(' ');

    // Boolean check to see if the user is a worker
    const isStaff = ['employee', 'manager', 'admin'].includes(currentUser.role);

    return (
        <div className="navbar rounded-2xl mb-6 flex-none shadow-sm backdrop-blur-md bg-[var(--bg-surface)] border border-[var(--border-color)] px-4 py-3 animate-fade flex justify-between items-center z-40">

            {/* LEFT: Clickable Logo (Routes to different home based on role) */}
            <div onClick={() => navigate(isStaff ? '/' : '/my-tickets')} className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity group">

                {/* --- DYNAMIC LOGO INJECTION --- */}
                {logoUrl ? (
                    <img
                        src={logoUrl}
                        alt="Shop Logo"
                        className="h-9 w-auto max-w-[120px] object-contain shrink-0 group-hover:scale-105 transition-transform rounded"
                        onError={(e) => { e.target.style.display = 'none'; }}
                    />
                ) : (
                    <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-white shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform shrink-0">
                        <Wrench size={18} fill="currentColor" />
                    </div>
                )}

                <span className="font-black text-[var(--text-main)] text-lg md:text-xl tracking-tight hidden sm:block whitespace-nowrap">
                    {firstWord} {restOfName && <span className="text-indigo-500">{restOfName}</span>}
                </span>
            </div>

            {/* RIGHT: Global Navigation Links & Profile */}
            <div className="flex items-center gap-1 sm:gap-2">

                <button onClick={() => navigate(isStaff ? '/' : '/my-tickets')} className="lg:hidden btn btn-sm btn-ghost btn-square text-[var(--text-muted)]">
                    <ArrowLeft size={18} />
                </button>

                {/* --- SECURED: Only Staff can see these desktop buttons --- */}
                {isStaff && (
                    <>
                        <button onClick={() => navigate('/messages')} className={`btn btn-sm btn-ghost rounded-full px-4 gap-2 font-bold hidden lg:flex transition-colors ${activeTab === 'messages' ? 'bg-[var(--bg-subtle)] text-[var(--text-main)] border border-[var(--border-color)] shadow-sm pointer-events-none' : 'text-[var(--text-muted)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-main)]'}`}>
                            <MessageSquare size={16} /> SMS Inbox
                        </button>
                        <button onClick={() => navigate('/customers')} className={`btn btn-sm btn-ghost rounded-full px-4 gap-2 font-bold hidden lg:flex transition-colors ${activeTab === 'customers' ? 'bg-[var(--bg-subtle)] text-[var(--text-main)] border border-[var(--border-color)] shadow-sm pointer-events-none' : 'text-[var(--text-muted)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-main)]'}`}>
                            <Users size={16} /> Customers
                        </button>
                        <button onClick={() => navigate('/inventory')} className={`btn btn-sm btn-ghost rounded-full px-4 gap-2 font-bold hidden lg:flex transition-colors ${activeTab === 'inventory' ? 'bg-[var(--bg-subtle)] text-[var(--text-main)] border border-[var(--border-color)] shadow-sm pointer-events-none' : 'text-[var(--text-muted)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-main)]'}`}>
                            <Package size={16} /> Inventory
                        </button>
                    </>
                )}

                {rightActions && (
                    <div className="flex items-center gap-1 sm:gap-2 ml-1">
                        {rightActions}
                    </div>
                )}

                <div className="border-l border-[var(--border-color)] h-6 mx-1 hidden lg:block opacity-50"></div>

                <button className="btn btn-sm btn-ghost btn-circle text-[var(--text-muted)] hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-all" onClick={toggleTheme} title="Toggle Theme">
                    {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
                </button>

                {/* Profile Dropdown */}
                <div className="dropdown dropdown-end ml-1">
                    <div tabIndex={0} role="button" className="btn btn-sm btn-ghost btn-circle avatar placeholder hover:bg-transparent border-none">
                        <div className="bg-[var(--bg-subtle)] text-indigo-600 dark:text-indigo-400 border border-[var(--border-color)] rounded-full w-9 h-9 shadow-inner hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:border-indigo-200 transition-all flex items-center justify-center">
                            <span className="text-sm font-black">{currentUser.initial}</span>
                        </div>
                    </div>

                    <ul tabIndex={0} className="mt-4 z-[50] p-3 shadow-2xl menu menu-sm dropdown-content rounded-2xl w-64 bg-[var(--bg-surface)] border border-[var(--border-color)] animate-pop">
                        <div className="p-3.5 bg-[var(--bg-subtle)] rounded-xl border border-[var(--border-color)] shadow-inner mb-3 flex flex-col gap-1.5">
                            <span className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">Signed in as</span>
                            <span className="font-bold text-sm truncate w-full text-[var(--text-main)] leading-tight">{currentUser.email}</span>
                            <div className="flex mt-1.5">
                                <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest shadow-md ${currentUser.role === 'admin' ? 'bg-purple-500 text-white shadow-purple-500/30' : currentUser.role === 'manager' ? 'bg-indigo-500 text-white shadow-indigo-500/30' : currentUser.role === 'employee' ? 'bg-slate-500 text-white shadow-slate-500/30' : 'bg-emerald-500 text-white shadow-emerald-500/30'}`}>
                                    {currentUser.role}
                                </span>
                            </div>
                        </div>

                        {/* --- SECURED: Only Staff can see these mobile links --- */}
                        {isStaff && (
                            <>
                                <li className="lg:hidden"><button onClick={() => navigate('/messages')} className="font-bold text-[var(--text-muted)] hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 py-2.5 rounded-lg transition-all"><MessageSquare size={16} className="text-indigo-500" /> SMS Inbox</button></li>
                                <li className="lg:hidden"><button onClick={() => navigate('/customers')} className="font-bold text-[var(--text-muted)] hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 py-2.5 rounded-lg transition-all"><Users size={16} className="text-indigo-500" /> Customers</button></li>
                                <li className="lg:hidden"><button onClick={() => navigate('/inventory')} className="font-bold text-[var(--text-muted)] hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 py-2.5 rounded-lg transition-all"><Package size={16} className="text-indigo-500" /> Inventory</button></li>
                                <div className="lg:hidden border-t-2 border-dashed border-[var(--border-color)] my-2 mx-1"></div>
                            </>
                        )}

                        {['manager', 'admin'].includes(currentUser.role) && (
                            <li><button onClick={() => navigate('/team')} className="font-bold text-[var(--text-muted)] hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 py-2.5 rounded-lg transition-all"><Users size={16} className="text-indigo-500" /> Manage Team</button></li>
                        )}

                        {/* Settings should only be for staff */}
                        {isStaff && (
                            <li><button onClick={() => navigate('/settings')} className="font-bold text-[var(--text-muted)] hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 py-2.5 rounded-lg transition-all"><SettingsIcon size={16} className="text-indigo-500" /> Settings</button></li>
                        )}

                        {isStaff && <div className="border-t-2 border-dashed border-[var(--border-color)] my-2 mx-1"></div>}

                        <li><button onClick={handleLogout} className="font-bold text-[var(--text-muted)] hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 py-2.5 rounded-lg transition-all"><LogOut size={16} className="text-red-500" /> Logout</button></li>
                    </ul>
                </div>
            </div>
        </div>
    );
}