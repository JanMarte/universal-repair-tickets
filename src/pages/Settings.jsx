import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../context/ToastProvider';
import {
    ArrowLeft, Settings as SettingsIcon, User, Store, Shield,
    Save, Moon, Sun, Lock, Building2, Percent, Phone, MapPin,
    Clock, DollarSign, FileText, MessageSquare, PlusCircle, Trash2,
    Database, Download
} from 'lucide-react';

export default function Settings() {
    const navigate = useNavigate();
    const { addToast } = useToast();

    const [currentUser, setCurrentUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [exporting, setExporting] = useState(false);

    const [activeTab, setActiveTab] = useState('personal');
    const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');

    const [profileForm, setProfileForm] = useState({ full_name: '' });

    const [shopForm, setShopForm] = useState({
        shop_name: '', shop_address: '', shop_phone: '', tax_rate: '',
        default_labor_rate: '', receipt_disclaimer: '', business_hours: '',
        quick_replies: []
    });

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        if (theme === 'dark') document.documentElement.classList.add('dark');
        else document.documentElement.classList.remove('dark');
        localStorage.setItem('theme', theme);
    }, [theme]);

    useEffect(() => {
        fetchData();
    }, []);

    async function fetchData() {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
            const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
            setCurrentUser({ ...user, ...profile });
            setProfileForm({ full_name: profile?.full_name || '' });

            const { data: settings } = await supabase.from('shop_settings').select('*').eq('id', 1).single();
            if (settings) {
                setShopForm({
                    shop_name: settings.shop_name || '',
                    shop_address: settings.shop_address || '',
                    shop_phone: settings.shop_phone || '',
                    tax_rate: (settings.tax_rate * 100).toString() || '7',
                    default_labor_rate: settings.default_labor_rate?.toString() || '85',
                    receipt_disclaimer: settings.receipt_disclaimer || '',
                    business_hours: settings.business_hours || '',
                    quick_replies: settings.quick_replies || []
                });
            }
        }
        setLoading(false);
    }

    const toggleTheme = () => {
        setTheme(prev => prev === 'light' ? 'dark' : 'light');
    };

    // --- QUICK REPLY MANAGERS ---
    const addQuickReply = () => {
        setShopForm({
            ...shopForm,
            quick_replies: [...shopForm.quick_replies, { label: '', text: '' }]
        });
    };

    const removeQuickReply = (index) => {
        const newReplies = [...shopForm.quick_replies];
        newReplies.splice(index, 1);
        setShopForm({ ...shopForm, quick_replies: newReplies });
    };

    const updateQuickReply = (index, field, value) => {
        const newReplies = [...shopForm.quick_replies];
        newReplies[index][field] = value;
        setShopForm({ ...shopForm, quick_replies: newReplies });
    };
    // ----------------------------

    // --- CSV EXPORT LOGIC ---
    const handleExportData = async () => {
        setExporting(true);
        try {
            // Fetch all tickets. We also try to grab customer email if we linked it properly
            const { data: tickets, error } = await supabase
                .from('tickets')
                .select(`
                    id, created_at, status, brand, model, serial_number, 
                    description, estimate_total, is_backordered, customer_name, phone
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;

            // Generate CSV Headers
            const headers = ['Ticket ID', 'Date Created', 'Status', 'Customer Name', 'Phone', 'Brand', 'Model', 'Serial', 'Total Billed', 'Backordered'];

            // Map rows and escape commas to prevent breaking the CSV format
            const rows = tickets.map(t => [
                t.id,
                new Date(t.created_at).toLocaleDateString(),
                t.status,
                `"${(t.customer_name || '').replace(/"/g, '""')}"`,
                `"${t.phone || ''}"`,
                `"${(t.brand || '').replace(/"/g, '""')}"`,
                `"${(t.model || '').replace(/"/g, '""')}"`,
                `"${(t.serial_number || '').replace(/"/g, '""')}"`,
                t.estimate_total || 0,
                t.is_backordered ? 'YES' : 'NO'
            ].join(','));

            const csvContent = [headers.join(','), ...rows].join('\n');

            // Create a Blob and trigger download
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.setAttribute("href", url);
            link.setAttribute("download", `Shop_Export_${new Date().toISOString().split('T')[0]}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            addToast("Database exported successfully!", "success");
        } catch (err) {
            console.error(err);
            addToast("Failed to export data.", "error");
        } finally {
            setExporting(false);
        }
    };
    // ----------------------------

    const handleSavePersonal = async () => {
        setSaving(true);
        const { error } = await supabase.from('profiles').update({ full_name: profileForm.full_name }).eq('id', currentUser.id);

        if (error) addToast("Failed to update profile", "error");
        else addToast("Profile updated successfully", "success");
        setSaving(false);
    };

    const handleSaveShop = async () => {
        if (currentUser?.role !== 'admin') {
            addToast("Only administrators can update shop settings.", "error");
            return;
        }

        setSaving(true);
        const taxRateDecimal = parseFloat(shopForm.tax_rate) / 100;
        const laborRate = parseFloat(shopForm.default_labor_rate);

        const { error } = await supabase.from('shop_settings').update({
            shop_name: shopForm.shop_name,
            shop_address: shopForm.shop_address,
            shop_phone: shopForm.shop_phone,
            tax_rate: taxRateDecimal,
            default_labor_rate: laborRate,
            receipt_disclaimer: shopForm.receipt_disclaimer,
            business_hours: shopForm.business_hours,
            quick_replies: shopForm.quick_replies,
            updated_at: new Date()
        }).eq('id', 1);

        if (error) addToast("Failed to update shop settings", "error");
        else addToast("Shop settings updated successfully", "success");
        setSaving(false);
    };

    const isAdmin = currentUser?.role === 'admin';

    if (loading) return <div className="flex justify-center mt-20"><span className="loading loading-spinner loading-lg text-indigo-500"></span></div>;

    return (
        <div className="min-h-screen p-4 md:p-6 font-sans transition-colors duration-300 pb-24">
            <div className="max-w-5xl mx-auto space-y-6">

                {/* NAVBAR */}
                <div className="navbar rounded-2xl sticky top-2 z-40 flex justify-between shadow-sm backdrop-blur-md bg-[var(--bg-surface)]/90 border border-[var(--border-color)] px-4 py-3 animate-fade-in-up">
                    <div className="flex items-center gap-2">
                        <button onClick={() => navigate('/dashboard')} className="btn btn-sm btn-ghost gap-2 px-3 text-[var(--text-muted)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-main)] transition-all rounded-lg group">
                            <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform duration-300" />
                            <span className="hidden sm:inline font-bold">Dashboard</span>
                        </button>
                    </div>

                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 hidden md:flex items-center gap-2 pointer-events-none">
                        <div className="w-8 h-8 bg-gradient-to-br from-slate-700 to-slate-900 rounded-lg flex items-center justify-center text-white shadow-md">
                            <SettingsIcon size={14} />
                        </div>
                        <span className="font-black text-[var(--text-main)] text-lg tracking-tight">System Preferences</span>
                    </div>

                    <div className="flex items-center gap-2">
                        <button onClick={toggleTheme} className="w-10 h-10 flex items-center justify-center rounded-full bg-[var(--bg-subtle)] border border-[var(--border-color)] shadow-inner text-[var(--text-muted)] hover:text-indigo-500 transition-colors" title="Toggle Theme">
                            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
                        </button>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row gap-8 items-start animate-fade-in-up" style={{ animationDelay: '0.1s' }}>

                    {/* LEFT SIDEBAR MENU */}
                    <div className="w-full md:w-64 flex-none space-y-2">
                        <button onClick={() => setActiveTab('personal')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all text-sm ${activeTab === 'personal' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' : 'bg-[var(--bg-surface)] text-[var(--text-muted)] border border-[var(--border-color)] hover:border-indigo-300 hover:text-[var(--text-main)]'}`}>
                            <User size={18} /> Personal Profile
                        </button>

                        {isAdmin && (
                            <>
                                <button onClick={() => setActiveTab('shop')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all text-sm ${activeTab === 'shop' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' : 'bg-[var(--bg-surface)] text-[var(--text-muted)] border border-[var(--border-color)] hover:border-indigo-300 hover:text-[var(--text-main)]'}`}>
                                    <Store size={18} /> Operations & Finance
                                </button>
                                <button onClick={() => setActiveTab('comms')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all text-sm ${activeTab === 'comms' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' : 'bg-[var(--bg-surface)] text-[var(--text-muted)] border border-[var(--border-color)] hover:border-indigo-300 hover:text-[var(--text-main)]'}`}>
                                    <MessageSquare size={18} /> Communications
                                </button>
                                <button onClick={() => setActiveTab('data')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all text-sm ${activeTab === 'data' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' : 'bg-[var(--bg-surface)] text-[var(--text-muted)] border border-[var(--border-color)] hover:border-indigo-300 hover:text-[var(--text-main)]'}`}>
                                    <Database size={18} /> System & Data
                                </button>
                            </>
                        )}
                    </div>

                    {/* RIGHT CONTENT AREA */}
                    <div className="flex-1 w-full">

                        {/* --- PERSONAL PROFILE TAB --- */}
                        {activeTab === 'personal' && (
                            <div className="bg-[var(--bg-surface)] rounded-3xl border border-[var(--border-color)] shadow-sm overflow-hidden animate-fade-in">
                                <div className="p-6 md:p-8 border-b border-[var(--border-color)]">
                                    <h2 className="text-2xl font-black text-[var(--text-main)] flex items-center gap-3">
                                        <User className="text-indigo-500" /> Account Settings
                                    </h2>
                                    <p className="text-sm font-medium text-[var(--text-muted)] mt-1">Manage your personal identity within the system.</p>
                                </div>
                                <div className="p-6 md:p-8 space-y-6 bg-[var(--bg-subtle)]">
                                    <div className="form-control max-w-md">
                                        <label className="label text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] pl-1">Email Address</label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[var(--text-muted)]"><Lock size={16} /></div>
                                            <input type="email" disabled value={currentUser.email} className="input input-bordered w-full h-12 pl-11 bg-[var(--bg-surface)] text-[var(--text-muted)] font-medium shadow-inner opacity-70 cursor-not-allowed rounded-xl" />
                                        </div>
                                    </div>
                                    <div className="form-control max-w-md">
                                        <label className="label text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] pl-1">Full Name</label>
                                        <div className="relative group">
                                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[var(--text-muted)] group-focus-within:text-indigo-500 transition-colors"><User size={16} /></div>
                                            <input type="text" value={profileForm.full_name} onChange={(e) => setProfileForm({ ...profileForm, full_name: e.target.value })} className="input input-bordered w-full h-12 pl-11 bg-[var(--bg-surface)] text-[var(--text-main)] font-medium shadow-inner focus:border-indigo-500 transition-all rounded-xl" />
                                        </div>
                                    </div>
                                    <div className="pt-4">
                                        <button onClick={handleSavePersonal} disabled={saving} className="btn btn-gradient text-white border-none shadow-lg shadow-indigo-500/30 px-8 rounded-xl h-12 hover:scale-105 transition-all">
                                            {saving ? <span className="loading loading-spinner"></span> : <><Save size={18} /> Save Changes</>}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* --- SHOP CONFIGURATION TAB --- */}
                        {activeTab === 'shop' && isAdmin && (
                            <div className="bg-[var(--bg-surface)] rounded-3xl border border-[var(--border-color)] shadow-sm overflow-hidden animate-fade-in">
                                <div className="p-6 md:p-8 border-b border-[var(--border-color)] relative">
                                    <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h2 className="text-2xl font-black text-[var(--text-main)] flex items-center gap-3">
                                                <Store className="text-indigo-500" /> Operations & Finance
                                            </h2>
                                        </div>
                                    </div>
                                </div>
                                <div className="p-6 md:p-8 space-y-8 bg-[var(--bg-subtle)]">
                                    <div className="p-6 bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-color)] shadow-sm">
                                        <h3 className="text-xs font-black uppercase tracking-widest text-[var(--text-main)] mb-5 flex items-center gap-2 border-b border-[var(--border-color)] pb-3">
                                            <Percent size={16} className="text-indigo-500" /> Financial Settings
                                        </h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="form-control">
                                                <label className="label text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] pl-1">Sales Tax Rate (%)</label>
                                                <div className="relative group">
                                                    <input type="number" step="0.01" value={shopForm.tax_rate} onChange={(e) => setShopForm({ ...shopForm, tax_rate: e.target.value })} className="input input-bordered w-full h-12 pr-11 bg-[var(--bg-subtle)] focus:bg-[var(--bg-surface)] text-[var(--text-main)] font-mono font-black text-lg shadow-inner focus:border-indigo-500 transition-all rounded-xl" />
                                                    <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-[var(--text-muted)] font-black text-lg">%</div>
                                                </div>
                                            </div>
                                            <div className="form-control">
                                                <label className="label text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] pl-1">Default Labor Rate (per hr)</label>
                                                <div className="relative group">
                                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[var(--text-muted)]"><DollarSign size={18} /></div>
                                                    <input type="number" step="0.01" value={shopForm.default_labor_rate} onChange={(e) => setShopForm({ ...shopForm, default_labor_rate: e.target.value })} className="input input-bordered w-full h-12 pl-10 bg-[var(--bg-subtle)] focus:bg-[var(--bg-surface)] text-[var(--text-main)] font-mono font-black text-lg shadow-inner focus:border-emerald-500 transition-all rounded-xl" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-6 bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-color)] shadow-sm space-y-5">
                                        <h3 className="text-xs font-black uppercase tracking-widest text-[var(--text-main)] mb-4 flex items-center gap-2 border-b border-[var(--border-color)] pb-3">
                                            <Building2 size={16} className="text-indigo-500" /> Identity & Receipts
                                        </h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                            <div className="form-control">
                                                <label className="label text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] pl-1">Shop Name</label>
                                                <div className="relative group">
                                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[var(--text-muted)]"><Store size={16} /></div>
                                                    <input type="text" value={shopForm.shop_name} onChange={(e) => setShopForm({ ...shopForm, shop_name: e.target.value })} className="input input-bordered w-full h-12 pl-11 bg-[var(--bg-subtle)] focus:bg-[var(--bg-surface)] text-[var(--text-main)] font-bold shadow-inner focus:border-indigo-500 transition-all rounded-xl" />
                                                </div>
                                            </div>
                                            <div className="form-control">
                                                <label className="label text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] pl-1">Primary Phone</label>
                                                <div className="relative group">
                                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[var(--text-muted)]"><Phone size={16} /></div>
                                                    <input type="text" value={shopForm.shop_phone} onChange={(e) => setShopForm({ ...shopForm, shop_phone: e.target.value })} className="input input-bordered w-full h-12 pl-11 bg-[var(--bg-subtle)] focus:bg-[var(--bg-surface)] text-[var(--text-main)] font-mono font-bold shadow-inner focus:border-indigo-500 transition-all rounded-xl" />
                                                </div>
                                            </div>
                                        </div>
                                        <div className="form-control">
                                            <label className="label text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] pl-1">Business Hours</label>
                                            <div className="relative group">
                                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[var(--text-muted)]"><Clock size={16} /></div>
                                                <input type="text" value={shopForm.business_hours} onChange={(e) => setShopForm({ ...shopForm, business_hours: e.target.value })} className="input input-bordered w-full h-12 pl-11 bg-[var(--bg-subtle)] focus:bg-[var(--bg-surface)] text-[var(--text-main)] font-medium shadow-inner focus:border-indigo-500 transition-all rounded-xl" />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                            <div className="form-control">
                                                <label className="label text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] pl-1">Physical Address</label>
                                                <div className="relative group">
                                                    <div className="absolute inset-y-0 left-0 pl-4 pt-3.5 pointer-events-none text-[var(--text-muted)]"><MapPin size={16} /></div>
                                                    <textarea value={shopForm.shop_address} onChange={(e) => setShopForm({ ...shopForm, shop_address: e.target.value })} className="textarea textarea-bordered w-full h-32 pl-11 pt-3.5 bg-[var(--bg-subtle)] focus:bg-[var(--bg-surface)] text-[var(--text-main)] font-medium shadow-inner focus:border-indigo-500 transition-all rounded-xl resize-none"></textarea>
                                                </div>
                                            </div>
                                            <div className="form-control">
                                                <label className="label text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] pl-1">Receipt Disclaimer (Legal)</label>
                                                <div className="relative group">
                                                    <div className="absolute inset-y-0 left-0 pl-4 pt-3.5 pointer-events-none text-[var(--text-muted)]"><FileText size={16} /></div>
                                                    <textarea value={shopForm.receipt_disclaimer} onChange={(e) => setShopForm({ ...shopForm, receipt_disclaimer: e.target.value })} className="textarea textarea-bordered w-full h-32 pl-11 pt-3.5 bg-[var(--bg-subtle)] focus:bg-[var(--bg-surface)] text-[var(--text-main)] font-medium shadow-inner focus:border-indigo-500 transition-all rounded-xl resize-none text-xs leading-relaxed"></textarea>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="pt-2 flex justify-end">
                                        <button onClick={handleSaveShop} disabled={saving} className="btn btn-gradient text-white border-none shadow-lg shadow-indigo-500/30 px-8 rounded-xl h-12 hover:scale-105 transition-all">
                                            {saving ? <span className="loading loading-spinner"></span> : <><Save size={18} /> Update Settings</>}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* --- COMMUNICATIONS TAB (Admin Only) --- */}
                        {activeTab === 'comms' && isAdmin && (
                            <div className="bg-[var(--bg-surface)] rounded-3xl border border-[var(--border-color)] shadow-sm overflow-hidden animate-fade-in">
                                <div className="p-6 md:p-8 border-b border-[var(--border-color)] relative">
                                    <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-500 to-indigo-500"></div>
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h2 className="text-2xl font-black text-[var(--text-main)] flex items-center gap-3">
                                                <MessageSquare className="text-blue-500" /> Communications
                                            </h2>
                                            <p className="text-sm font-medium text-[var(--text-muted)] mt-1">Manage canned messages for the customer chat portal.</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-6 md:p-8 bg-[var(--bg-subtle)] space-y-4">
                                    {shopForm.quick_replies.map((reply, index) => (
                                        <div key={index} className="p-5 bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-color)] shadow-sm flex flex-col md:flex-row gap-4 items-start md:items-center">
                                            <div className="w-full md:w-48 flex-none form-control">
                                                <label className="label text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] pl-1 pb-1">Button Label</label>
                                                <input
                                                    type="text"
                                                    className="input input-sm h-10 input-bordered w-full bg-[var(--bg-subtle)] focus:bg-[var(--bg-surface)] text-[var(--text-main)] font-bold shadow-inner focus:border-indigo-500 transition-all rounded-lg"
                                                    placeholder="e.g. Parts Ordered"
                                                    value={reply.label}
                                                    onChange={(e) => updateQuickReply(index, 'label', e.target.value)}
                                                />
                                            </div>
                                            <div className="flex-1 w-full form-control">
                                                <label className="label text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] pl-1 pb-1">Message Payload</label>
                                                <input
                                                    type="text"
                                                    className="input input-sm h-10 input-bordered w-full bg-[var(--bg-subtle)] focus:bg-[var(--bg-surface)] text-[var(--text-main)] text-sm shadow-inner focus:border-indigo-500 transition-all rounded-lg"
                                                    placeholder="The exact message sent to the customer..."
                                                    value={reply.text}
                                                    onChange={(e) => updateQuickReply(index, 'text', e.target.value)}
                                                />
                                            </div>
                                            <div className="pt-5 hidden md:block">
                                                <button onClick={() => removeQuickReply(index)} className="btn btn-square btn-ghost text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20" title="Delete Reply">
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                            <div className="w-full md:hidden">
                                                <button onClick={() => removeQuickReply(index)} className="btn btn-sm btn-outline w-full text-red-500 border-red-500 mt-2">Delete Reply</button>
                                            </div>
                                        </div>
                                    ))}

                                    <button onClick={addQuickReply} className="w-full py-4 border-2 border-dashed border-[var(--border-color)] text-[var(--text-muted)] font-bold rounded-2xl hover:bg-[var(--bg-surface)] hover:text-indigo-500 hover:border-indigo-300 transition-all flex items-center justify-center gap-2">
                                        <PlusCircle size={18} /> Add New Quick Reply
                                    </button>

                                    <div className="pt-6 flex justify-end">
                                        <button onClick={handleSaveShop} disabled={saving} className="btn btn-gradient text-white border-none shadow-lg shadow-indigo-500/30 px-8 rounded-xl h-12 hover:scale-105 transition-all">
                                            {saving ? <span className="loading loading-spinner"></span> : <><Save size={18} /> Save Communications</>}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* --- NEW: SYSTEM & DATA TAB (Admin Only) --- */}
                        {activeTab === 'data' && isAdmin && (
                            <div className="bg-[var(--bg-surface)] rounded-3xl border border-[var(--border-color)] shadow-sm overflow-hidden animate-fade-in">
                                <div className="p-6 md:p-8 border-b border-[var(--border-color)] relative">
                                    <div className="absolute top-0 left-0 w-full h-1.5 bg-emerald-500"></div>
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h2 className="text-2xl font-black text-[var(--text-main)] flex items-center gap-3">
                                                <Database className="text-emerald-500" /> System & Data
                                            </h2>
                                            <p className="text-sm font-medium text-[var(--text-muted)] mt-1">Export your data for taxes, backups, or accounting software.</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-6 md:p-8 bg-[var(--bg-subtle)] space-y-6">
                                    <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] p-6 rounded-2xl shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center text-emerald-500 border border-emerald-100 dark:border-emerald-800 shadow-inner">
                                                <Download size={24} />
                                            </div>
                                            <div>
                                                <h3 className="font-black text-[var(--text-main)] text-lg">Export Ticket Database</h3>
                                                <p className="text-xs text-[var(--text-muted)] mt-0.5 font-medium">Download a complete CSV record of all jobs, customers, and totals.</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={handleExportData}
                                            disabled={exporting}
                                            className="btn bg-emerald-500 hover:bg-emerald-600 text-white border-none shadow-lg shadow-emerald-500/30 w-full md:w-auto px-6 h-12 rounded-xl transition-transform hover:scale-105"
                                        >
                                            {exporting ? <span className="loading loading-spinner"></span> : <>Download CSV</>}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                    </div>
                </div>
            </div>
        </div>
    );
}