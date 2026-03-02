import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../context/ToastProvider';
import {
    ArrowLeft, Settings as SettingsIcon, User, Store, Shield,
    Save, Moon, Sun, Lock, Building2, Percent, Phone, MapPin,
    Clock, DollarSign, FileText, MessageSquare, PlusCircle, Trash2,
    Database, Download, BellRing, Scale, AlertTriangle, PackageMinus, RotateCcw
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
        quick_replies: [], auto_email_status_change: true, auto_email_new_message: true,
        intake_terms: ''
    });

    const [replyToDelete, setReplyToDelete] = useState(null);

    // Danger Zone State
    const [dangerAction, setDangerAction] = useState(null); // 'tickets' | 'inventory' | null
    const [dangerInput, setDangerInput] = useState('');
    const [isExecutingDanger, setIsExecutingDanger] = useState(false);

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
                    quick_replies: settings.quick_replies || [],
                    auto_email_status_change: settings.auto_email_status_change ?? true,
                    auto_email_new_message: settings.auto_email_new_message ?? true,
                    intake_terms: settings.intake_terms || ''
                });
            }
        }
        setLoading(false);
    }

    const toggleTheme = () => {
        setTheme(prev => prev === 'light' ? 'dark' : 'light');
    };

    const addQuickReply = () => { 
        setShopForm({ ...shopForm, quick_replies: [...shopForm.quick_replies, { label: '', text: '' }] }); 
    };
    
    const executeDeleteReply = () => { 
        if (replyToDelete === null) return;
        const newReplies = [...shopForm.quick_replies]; 
        newReplies.splice(replyToDelete, 1); 
        setShopForm({ ...shopForm, quick_replies: newReplies }); 
        setReplyToDelete(null);
        addToast("Reply removed. Remember to save changes.", "info");
    };

    const updateQuickReply = (index, field, value) => { 
        const newReplies = [...shopForm.quick_replies]; 
        newReplies[index][field] = value; 
        setShopForm({ ...shopForm, quick_replies: newReplies }); 
    };

    const handleExecuteDanger = async () => {
        setIsExecutingDanger(true);
        try {
            if (dangerAction === 'tickets') {
                const ninetyDaysAgo = new Date();
                ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
                
                const { error } = await supabase
                    .from('tickets')
                    .delete()
                    .eq('status', 'completed')
                    .lt('created_at', ninetyDaysAgo.toISOString());
                
                if (error) throw error;
                addToast(`Successfully deleted old completed tickets.`, "success");
            } else if (dangerAction === 'inventory') {
                const { error } = await supabase
                    .from('inventory')
                    .update({ quantity: 0 })
                    .gt('quantity', 0); 
                    
                if (error) throw error;
                addToast("All inventory counts have been reset to zero.", "success");
            }
        } catch (error) {
            console.error(error);
            addToast("Action failed: " + error.message, "error");
        } finally {
            setIsExecutingDanger(false);
            setDangerAction(null);
            setDangerInput('');
        }
    };

    const handleExportData = async () => {
        setExporting(true);
        try {
            const { data: tickets, error } = await supabase.from('tickets').select(`id, created_at, status, brand, model, serial_number, description, estimate_total, is_backordered, customer_name, phone`).order('created_at', { ascending: false });
            if (error) throw error;
            const headers = ['Ticket ID', 'Date Created', 'Status', 'Customer Name', 'Phone', 'Brand', 'Model', 'Serial', 'Total Billed', 'Backordered'];
            const rows = tickets.map(t => [ t.id, new Date(t.created_at).toLocaleDateString(), t.status, `"${(t.customer_name || '').replace(/"/g, '""')}"`, `"${t.phone || ''}"`, `"${(t.brand || '').replace(/"/g, '""')}"`, `"${(t.model || '').replace(/"/g, '""')}"`, `"${(t.serial_number || '').replace(/"/g, '""')}"`, t.estimate_total || 0, t.is_backordered ? 'YES' : 'NO' ].join(','));
            const csvContent = [headers.join(','), ...rows].join('\n');
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a"); link.setAttribute("href", url); link.setAttribute("download", `Shop_Export_${new Date().toISOString().split('T')[0]}.csv`); document.body.appendChild(link); link.click(); document.body.removeChild(link);
            addToast("Database exported successfully!", "success");
        } catch (err) { console.error(err); addToast("Failed to export data.", "error"); } finally { setExporting(false); }
    };

    const handleSavePersonal = async () => {
        setSaving(true);
        const { error } = await supabase.from('profiles').update({ full_name: profileForm.full_name }).eq('id', currentUser.id);
        if (error) addToast("Failed to update profile", "error"); else addToast("Profile updated successfully", "success");
        setSaving(false);
    };

    const handleSaveShop = async () => {
        if (currentUser?.role !== 'admin') { addToast("Only administrators can update shop settings.", "error"); return; }
        setSaving(true);
        
        const taxRateDecimal = parseFloat(shopForm.tax_rate || 0) / 100;
        const laborRate = parseFloat(shopForm.default_labor_rate || 0);

        const { error } = await supabase.from('shop_settings').update({
            shop_name: shopForm.shop_name, 
            shop_address: shopForm.shop_address, 
            shop_phone: shopForm.shop_phone,
            tax_rate: taxRateDecimal, 
            default_labor_rate: laborRate, 
            receipt_disclaimer: shopForm.receipt_disclaimer,
            business_hours: shopForm.business_hours, 
            quick_replies: shopForm.quick_replies, 
            auto_email_status_change: shopForm.auto_email_status_change, 
            auto_email_new_message: shopForm.auto_email_new_message,
            intake_terms: shopForm.intake_terms,
            updated_at: new Date()
        }).eq('id', 1);

        if (error) {
            console.error(error);
            addToast(`Error: ${error.message}`, "error"); 
        } else {
            addToast("Shop settings updated successfully", "success");
        }
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
                        <div className="w-8 h-8 bg-gradient-to-br from-slate-700 to-slate-900 rounded-lg flex items-center justify-center text-white shadow-md"><SettingsIcon size={14} /></div>
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
                        <button onClick={() => setActiveTab('personal')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all text-sm ${activeTab === 'personal' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' : 'bg-[var(--bg-surface)] text-[var(--text-muted)] border border-[var(--border-color)] hover:border-indigo-300 hover:text-[var(--text-main)]'}`}><User size={18} /> Personal Profile</button>
                        {isAdmin && (
                            <>
                                <button onClick={() => setActiveTab('shop')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all text-sm ${activeTab === 'shop' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' : 'bg-[var(--bg-surface)] text-[var(--text-muted)] border border-[var(--border-color)] hover:border-indigo-300 hover:text-[var(--text-main)]'}`}><Store size={18} /> Operations & Finance</button>
                                <button onClick={() => setActiveTab('comms')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all text-sm ${activeTab === 'comms' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' : 'bg-[var(--bg-surface)] text-[var(--text-muted)] border border-[var(--border-color)] hover:border-indigo-300 hover:text-[var(--text-main)]'}`}><MessageSquare size={18} /> Communications</button>
                                <button onClick={() => setActiveTab('data')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all text-sm ${activeTab === 'data' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' : 'bg-[var(--bg-surface)] text-[var(--text-muted)] border border-[var(--border-color)] hover:border-indigo-300 hover:text-[var(--text-main)]'}`}><Database size={18} /> System & Data</button>
                            </>
                        )}
                    </div>

                    {/* RIGHT CONTENT AREA */}
                    <div className="flex-1 w-full">

                        {activeTab === 'personal' && (
                            <div className="bg-[var(--bg-surface)] rounded-3xl border border-[var(--border-color)] shadow-sm overflow-hidden animate-fade-in">
                                <div className="p-6 md:p-8 border-b border-[var(--border-color)]">
                                    <h2 className="text-2xl font-black text-[var(--text-main)] flex items-center gap-3"><User className="text-indigo-500" /> Account Settings</h2>
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

                        {activeTab === 'shop' && isAdmin && (
                            <div className="bg-[var(--bg-surface)] rounded-3xl border border-[var(--border-color)] shadow-sm overflow-hidden animate-fade-in">
                                <div className="p-6 md:p-8 border-b border-[var(--border-color)] relative">
                                    <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
                                    <div className="flex items-center justify-between">
                                        <h2 className="text-2xl font-black text-[var(--text-main)] flex items-center gap-3"><Store className="text-indigo-500" /> Operations & Finance</h2>
                                    </div>
                                </div>
                                <div className="p-6 md:p-8 space-y-8 bg-[var(--bg-subtle)]">
                                    <div className="p-6 bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-color)] shadow-sm">
                                        <h3 className="text-xs font-black uppercase tracking-widest text-[var(--text-main)] mb-5 flex items-center gap-2 border-b border-[var(--border-color)] pb-3"><Percent size={16} className="text-indigo-500" /> Financial Settings</h3>
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
                                        <h3 className="text-xs font-black uppercase tracking-widest text-[var(--text-main)] mb-4 flex items-center gap-2 border-b border-[var(--border-color)] pb-3"><Building2 size={16} className="text-indigo-500" /> Identity & Policies</h3>
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
                                        <div className="form-control">
                                            <label className="label text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] pl-1">Physical Address</label>
                                            <div className="relative group">
                                                <div className="absolute inset-y-0 left-0 pl-4 pt-3.5 pointer-events-none text-[var(--text-muted)]"><MapPin size={16} /></div>
                                                <textarea value={shopForm.shop_address} onChange={(e) => setShopForm({ ...shopForm, shop_address: e.target.value })} className="textarea textarea-bordered w-full h-24 pl-11 pt-3.5 bg-[var(--bg-subtle)] focus:bg-[var(--bg-surface)] text-[var(--text-main)] font-medium shadow-inner focus:border-indigo-500 transition-all rounded-xl resize-none"></textarea>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                            <div className="form-control">
                                                <label className="label text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] pl-1 flex items-center gap-1.5"><FileText size={12}/> Receipt Disclaimer</label>
                                                <textarea value={shopForm.receipt_disclaimer} onChange={(e) => setShopForm({ ...shopForm, receipt_disclaimer: e.target.value })} placeholder="Printed at the bottom of customer receipts..." className="textarea textarea-bordered w-full h-32 p-4 bg-[var(--bg-subtle)] focus:bg-[var(--bg-surface)] text-[var(--text-main)] font-medium shadow-inner focus:border-indigo-500 transition-all rounded-xl resize-none text-xs leading-relaxed"></textarea>
                                            </div>
                                            <div className="form-control">
                                                <label className="label text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] pl-1 flex items-center gap-1.5"><Scale size={12}/> Intake Terms of Service</label>
                                                <textarea value={shopForm.intake_terms} onChange={(e) => setShopForm({ ...shopForm, intake_terms: e.target.value })} placeholder="Legal agreement shown when creating a new ticket..." className="textarea textarea-bordered w-full h-32 p-4 bg-[var(--bg-subtle)] focus:bg-[var(--bg-surface)] text-[var(--text-main)] font-medium shadow-inner focus:border-amber-500 transition-all rounded-xl resize-none text-xs leading-relaxed"></textarea>
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

                        {activeTab === 'comms' && isAdmin && (
                            <div className="bg-[var(--bg-surface)] rounded-3xl border border-[var(--border-color)] shadow-sm overflow-hidden animate-fade-in">
                                <div className="p-6 md:p-8 border-b border-[var(--border-color)] relative">
                                    <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-500 to-indigo-500"></div>
                                    <h2 className="text-2xl font-black text-[var(--text-main)] flex items-center gap-3"><MessageSquare className="text-blue-500" /> Communications</h2>
                                </div>
                                <div className="p-6 md:p-8 bg-[var(--bg-subtle)] space-y-8">
                                    <div className="p-6 bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-color)] shadow-sm">
                                        <h3 className="text-xs font-black uppercase tracking-widest text-[var(--text-main)] mb-5 flex items-center gap-2 border-b border-[var(--border-color)] pb-3"><BellRing size={16} className="text-amber-500" /> Automated Email Rules</h3>
                                        <div className="space-y-4">
                                            <label className="flex items-center justify-between cursor-pointer p-4 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-color)] hover:border-indigo-300 transition-colors shadow-inner">
                                                <div><span className="font-bold text-sm text-[var(--text-main)] block mb-0.5">Status Updates</span><span className="text-xs text-[var(--text-muted)] font-medium">Send customer an email when their ticket status changes.</span></div>
                                                <input type="checkbox" className="toggle toggle-success toggle-md" checked={shopForm.auto_email_status_change} onChange={(e) => setShopForm({...shopForm, auto_email_status_change: e.target.checked})} />
                                            </label>
                                            <label className="flex items-center justify-between cursor-pointer p-4 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-color)] hover:border-indigo-300 transition-colors shadow-inner">
                                                <div><span className="font-bold text-sm text-[var(--text-main)] block mb-0.5">New Messages</span><span className="text-xs text-[var(--text-muted)] font-medium">Send customer an email when a technician sends a direct message.</span></div>
                                                <input type="checkbox" className="toggle toggle-success toggle-md" checked={shopForm.auto_email_new_message} onChange={(e) => setShopForm({...shopForm, auto_email_new_message: e.target.checked})} />
                                            </label>
                                        </div>
                                    </div>
                                    <div className="p-6 bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-color)] shadow-sm">
                                        <h3 className="text-xs font-black uppercase tracking-widest text-[var(--text-main)] mb-5 flex items-center gap-2 border-b border-[var(--border-color)] pb-3"><MessageSquare size={16} className="text-blue-500" /> Chat Quick Replies</h3>
                                        <div className="space-y-4">
                                            {shopForm.quick_replies.map((reply, index) => (
                                                <div key={index} className="p-5 bg-[var(--bg-subtle)] rounded-xl border border-[var(--border-color)] shadow-inner flex flex-col md:flex-row gap-4 items-start md:items-center">
                                                    <div className="w-full md:w-48 flex-none form-control"><label className="label text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] pl-1 pb-1">Button Label</label><input type="text" className="input input-sm h-10 input-bordered w-full bg-[var(--bg-surface)] focus:border-indigo-500 transition-all rounded-lg font-bold" value={reply.label} onChange={(e) => updateQuickReply(index, 'label', e.target.value)} /></div>
                                                    <div className="flex-1 w-full form-control"><label className="label text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] pl-1 pb-1">Message Payload</label><input type="text" className="input input-sm h-10 input-bordered w-full bg-[var(--bg-surface)] focus:border-indigo-500 transition-all rounded-lg text-sm" value={reply.text} onChange={(e) => updateQuickReply(index, 'text', e.target.value)} /></div>
                                                    <div className="pt-5 hidden md:block"><button onClick={() => setReplyToDelete(index)} className="btn btn-square btn-ghost text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"><Trash2 size={18} /></button></div>
                                                    <div className="w-full md:hidden"><button onClick={() => setReplyToDelete(index)} className="btn btn-sm btn-outline w-full text-red-500 border-red-500 mt-2">Delete Reply</button></div>
                                                </div>
                                            ))}
                                            <button onClick={addQuickReply} className="w-full py-4 border-2 border-dashed border-[var(--border-color)] text-[var(--text-muted)] font-bold rounded-2xl hover:bg-[var(--bg-surface)] hover:text-indigo-500 hover:border-indigo-300 transition-all flex items-center justify-center gap-2 shadow-sm"><PlusCircle size={18} /> Add New Quick Reply</button>
                                        </div>
                                    </div>
                                    <div className="pt-2 flex justify-end"><button onClick={handleSaveShop} disabled={saving} className="btn btn-gradient text-white border-none shadow-lg shadow-indigo-500/30 px-8 rounded-xl h-12 hover:scale-105 transition-all">{saving ? <span className="loading loading-spinner"></span> : <><Save size={18} /> Save Communications</>}</button></div>
                                </div>
                            </div>
                        )}

                        {/* --- UPGRADED UI: SYSTEM & DATA TAB --- */}
                        {activeTab === 'data' && isAdmin && (
                            <div className="bg-[var(--bg-surface)] rounded-3xl border border-[var(--border-color)] shadow-sm overflow-hidden animate-fade-in">
                                
                                <div className="p-6 md:p-8 border-b border-[var(--border-color)] relative">
                                    <div className="absolute top-0 left-0 w-full h-1.5 bg-emerald-500"></div>
                                    <h2 className="text-2xl font-black text-[var(--text-main)] flex items-center gap-3">
                                        <Database className="text-emerald-500" /> System & Data
                                    </h2>
                                </div>
                                
                                <div className="p-6 md:p-8 bg-[var(--bg-subtle)] space-y-8">
                                    
                                    {/* Export Data Block */}
                                    <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] p-6 rounded-2xl shadow-sm flex flex-col md:flex-row items-center justify-between gap-6 hover:border-emerald-300 transition-colors group">
                                        <div className="flex items-center gap-4">
                                            <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center text-emerald-500 border border-emerald-100 dark:border-emerald-800 shadow-inner group-hover:scale-110 transition-transform">
                                                <Download size={28} />
                                            </div>
                                            <div>
                                                <h3 className="font-black text-[var(--text-main)] text-lg">Export Ticket Database</h3>
                                                <p className="text-sm text-[var(--text-muted)] mt-1 font-medium">Download a complete CSV record of all jobs, customers, and totals.</p>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={handleExportData} 
                                            disabled={exporting} 
                                            className="btn bg-emerald-500 hover:bg-emerald-600 text-white border-none shadow-xl shadow-emerald-500/30 w-full md:w-auto px-8 h-14 rounded-xl transition-transform hover:-translate-y-1 gap-2 text-base font-bold"
                                        >
                                            {exporting ? <span className="loading loading-spinner"></span> : <><Download size={20} /> Download CSV</>}
                                        </button>
                                    </div>

                                    {/* --- UPGRADED DANGER ZONE --- */}
                                    <div className="relative overflow-hidden rounded-2xl border border-red-200 dark:border-red-900/50 shadow-sm animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
                                        {/* Subtle Background Tint */}
                                        <div className="absolute inset-0 bg-red-50/50 dark:bg-red-900/10 pointer-events-none"></div>
                                        
                                        <div className="relative p-6 md:p-8">
                                            <div className="flex items-center gap-3 mb-6">
                                                <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-600 dark:text-red-400 shadow-inner border border-red-200 dark:border-red-800">
                                                    <AlertTriangle size={20} />
                                                </div>
                                                <div>
                                                    <h3 className="text-lg font-black tracking-tight text-red-600 dark:text-red-400">Danger Zone</h3>
                                                    <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest">Irreversible Data Actions</p>
                                                </div>
                                            </div>
                                            
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                
                                                {/* Purge Tickets Card */}
                                                <div className="bg-[var(--bg-surface)] rounded-xl border border-red-100 dark:border-red-900/30 shadow-sm p-6 flex flex-col justify-between hover:shadow-md hover:border-red-300 transition-all group">
                                                    <div className="mb-6">
                                                        <div className="w-12 h-12 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-color)] flex items-center justify-center text-[var(--text-main)] mb-4 shadow-inner group-hover:text-red-500 transition-colors">
                                                            <Trash2 size={24} />
                                                        </div>
                                                        <h4 className="font-black text-[var(--text-main)] text-lg mb-2">Purge Old Tickets</h4>
                                                        <p className="text-sm font-medium text-[var(--text-muted)] leading-relaxed">Permanently delete all <strong className="text-[var(--text-main)]">Completed</strong> tickets older than 90 days. Frees up database space and speeds up queries.</p>
                                                    </div>
                                                    <button 
                                                        onClick={() => { setDangerAction('tickets'); setDangerInput(''); }} 
                                                        className="btn w-full bg-red-50 hover:bg-red-600 text-red-600 hover:text-white dark:bg-red-900/20 dark:hover:bg-red-600 border border-red-200 dark:border-red-800/50 hover:border-transparent shadow-sm hover:shadow-lg hover:shadow-red-500/30 transition-all h-12 text-sm font-bold gap-2"
                                                    >
                                                        <Trash2 size={18} /> Delete Old Tickets
                                                    </button>
                                                </div>

                                                {/* Reset Inventory Card */}
                                                <div className="bg-[var(--bg-surface)] rounded-xl border border-red-100 dark:border-red-900/30 shadow-sm p-6 flex flex-col justify-between hover:shadow-md hover:border-red-300 transition-all group">
                                                    <div className="mb-6">
                                                        <div className="w-12 h-12 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-color)] flex items-center justify-center text-[var(--text-main)] mb-4 shadow-inner group-hover:text-red-500 transition-colors">
                                                            <PackageMinus size={24} /> 
                                                        </div>
                                                        <h4 className="font-black text-[var(--text-main)] text-lg mb-2">Zero Inventory Counts</h4>
                                                        <p className="text-sm font-medium text-[var(--text-muted)] leading-relaxed">Reset the quantity of all parts in the database to 0. Extremely useful for starting a fresh annual stock audit.</p>
                                                    </div>
                                                    <button 
                                                        onClick={() => { setDangerAction('inventory'); setDangerInput(''); }} 
                                                        className="btn w-full bg-red-50 hover:bg-red-600 text-red-600 hover:text-white dark:bg-red-900/20 dark:hover:bg-red-600 border border-red-200 dark:border-red-800/50 hover:border-transparent shadow-sm hover:shadow-lg hover:shadow-red-500/30 transition-all h-12 text-sm font-bold gap-2"
                                                    >
                                                        <RotateCcw size={18} /> Reset Inventory
                                                    </button>
                                                </div>

                                            </div>
                                        </div>
                                    </div>

                                </div>
                            </div>
                        )}

                    </div>
                </div>
            </div>

            {/* --- QUICK REPLY DELETE MODAL --- */}
            {replyToDelete !== null && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md transition-opacity animate-fade-in" onClick={() => setReplyToDelete(null)} />
                    <div className="relative w-full max-w-sm bg-[var(--bg-surface)] rounded-2xl shadow-[0_20px_50px_-12px_rgba(0,0,0,0.5)] overflow-hidden border border-[var(--border-color)] animate-pop ring-1 ring-red-500/20">
                        <div className="h-1.5 w-full bg-gradient-to-r from-red-500 via-orange-500 to-red-500"></div>
                        <div className="p-8">
                            <div className="mx-auto w-20 h-20 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center mb-6 relative border border-red-100 dark:border-red-800">
                                <div className="absolute inset-0 rounded-full bg-red-500/20 animate-ping opacity-50"></div>
                                <Trash2 size={36} className="text-red-600 dark:text-red-500 relative z-10" />
                            </div>
                            <div className="text-center mb-8">
                                <h3 className="text-xl font-black text-[var(--text-main)] mb-2">Delete Quick Reply?</h3>
                                <p className="text-sm font-medium text-[var(--text-muted)] leading-relaxed">
                                    This message will be removed from your staff's chat options.
                                </p>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <button onClick={() => setReplyToDelete(null)} className="btn btn-ghost h-12 font-bold text-[var(--text-muted)] hover:bg-[var(--bg-subtle)] border border-transparent hover:border-[var(--border-color)] transition-all">Cancel</button>
                                <button onClick={executeDeleteReply} className="btn btn-error h-12 text-white font-bold shadow-lg shadow-red-500/30 border-none bg-gradient-to-br from-red-500 to-red-600 hover:scale-105 transition-transform">Yes, Delete</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* --- DANGER ZONE CONFIRMATION MODAL --- */}
            {dangerAction && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm transition-opacity animate-fade-in" onClick={() => !isExecutingDanger && setDangerAction(null)} />
                    <div className="relative w-full max-w-md bg-[var(--bg-surface)] rounded-2xl shadow-[0_20px_50px_-12px_rgba(0,0,0,0.5)] overflow-hidden border border-red-500/50 animate-pop ring-2 ring-red-500/20">
                        <div className="h-2 w-full bg-gradient-to-r from-red-600 to-red-400"></div>
                        <div className="p-8">
                            <div className="mx-auto w-16 h-16 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center mb-6 relative border border-red-200 dark:border-red-800">
                                <AlertTriangle size={32} className="text-red-600 dark:text-red-500 relative z-10" />
                            </div>
                            <div className="text-center mb-6">
                                <h3 className="text-2xl font-black text-[var(--text-main)] mb-2">Are you absolutely sure?</h3>
                                <p className="text-sm font-medium text-[var(--text-muted)] leading-relaxed px-2">
                                    {dangerAction === 'tickets' 
                                        ? "This will PERMANENTLY delete all completed tickets older than 90 days. This action cannot be undone."
                                        : "This will immediately set EVERY item's quantity to 0 in your inventory database. This action cannot be undone."
                                    }
                                </p>
                            </div>
                            <div className="mb-6">
                                <label className="label text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] justify-center">
                                    Type <span className="text-red-500 mx-1">{dangerAction === 'tickets' ? 'DELETE 90' : 'ZERO STOCK'}</span> to confirm
                                </label>
                                <input 
                                    type="text" 
                                    className="input input-bordered w-full h-14 bg-[var(--bg-subtle)] focus:bg-[var(--bg-surface)] text-center font-black tracking-widest uppercase focus:border-red-500 focus:ring-4 focus:ring-red-500/10 transition-all text-lg"
                                    value={dangerInput}
                                    onChange={(e) => setDangerInput(e.target.value)}
                                    placeholder={dangerAction === 'tickets' ? 'DELETE 90' : 'ZERO STOCK'}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <button onClick={() => setDangerAction(null)} disabled={isExecutingDanger} className="btn btn-ghost h-14 font-bold text-[var(--text-muted)] hover:bg-[var(--bg-subtle)] border border-[var(--border-color)] transition-all">Cancel</button>
                                <button 
                                    onClick={handleExecuteDanger} 
                                    disabled={isExecutingDanger || dangerInput !== (dangerAction === 'tickets' ? 'DELETE 90' : 'ZERO STOCK')} 
                                    className="btn btn-error h-14 text-white font-black shadow-lg shadow-red-500/30 border-none bg-gradient-to-br from-red-600 to-red-500 hover:scale-105 transition-transform disabled:opacity-50 disabled:grayscale disabled:hover:scale-100"
                                >
                                    {isExecutingDanger ? <span className="loading loading-spinner"></span> : "Execute"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}