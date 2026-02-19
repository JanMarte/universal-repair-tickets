import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import {
    ArrowLeft, Shield, User, Users, Briefcase, Calendar, Mail,
    Search, UserPlus, X, Copy, CheckCircle, Info, Filter,
    Activity, DollarSign, Clock, FileText, ChevronRight, Moon, Sun
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../context/ToastProvider';
import { format } from 'date-fns';
import { formatCurrency } from '../utils';

export default function Team() {
    const [teamMembers, setTeamMembers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentUser, setCurrentUser] = useState(null);

    // Theme State
    const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');

    // Modal & Search State
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('search');
    const [searchEmail, setSearchEmail] = useState('');
    const [rosterSearch, setRosterSearch] = useState('');
    const [foundUser, setFoundUser] = useState(null);
    const [searchLoading, setSearchLoading] = useState(false);

    // Stats State
    const [selectedMember, setSelectedMember] = useState(null);
    const [memberStats, setMemberStats] = useState(null);
    const [statsLoading, setStatsLoading] = useState(false);

    // UI State
    const [showRoleGuide, setShowRoleGuide] = useState(false);

    const navigate = useNavigate();
    const { addToast } = useToast();
    const inviteLink = `${window.location.origin}/login`;

    // Handle Theme Changes
    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        if (theme === 'dark') document.documentElement.classList.add('dark');
        else document.documentElement.classList.remove('dark');
        localStorage.setItem('theme', theme);
    }, [theme]);

    useEffect(() => {
        fetchCurrentUser();
        fetchTeam();
    }, []);

    async function fetchCurrentUser() {
        const { data: { user } } = await supabase.auth.getUser();
        setCurrentUser(user);
    }

    async function fetchTeam() {
        setLoading(true);
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .in('role', ['admin', 'manager', 'employee'])
            .order('role', { ascending: true });

        if (error) console.error(error);
        setTeamMembers(data || []);
        setLoading(false);
    }

    async function openMemberStats(member) {
        setSelectedMember(member);
        setStatsLoading(true);
        setMemberStats(null); // Clear previous

        try {
            // 1. Get Ticket Stats
            const { data: tickets } = await supabase
                .from('tickets')
                .select('status, estimate_total')
                .eq('assigned_to', member.id);

            const completed = tickets?.filter(t => t.status === 'completed').length || 0;
            const active = tickets?.filter(t => t.status !== 'completed').length || 0;
            const revenue = tickets?.filter(t => t.status === 'completed').reduce((sum, t) => sum + (t.estimate_total || 0), 0) || 0;

            // 2. Get Recent Audit Logs
            const { data: logs } = await supabase
                .from('audit_logs')
                .select('*')
                .ilike('actor_name', `%${member.full_name?.split(' ')[0]}%`)
                .order('created_at', { ascending: false })
                .limit(5);

            setMemberStats({
                completed,
                active,
                revenue,
                recentActivity: logs || []
            });

        } catch (error) {
            console.error("Error fetching stats:", error);
            addToast("Could not load employee stats", "error");
        } finally {
            setStatsLoading(false);
        }
    }

    const filteredTeam = teamMembers.filter(member =>
        (member.full_name?.toLowerCase() || '').includes(rosterSearch.toLowerCase()) ||
        (member.email?.toLowerCase() || '').includes(rosterSearch.toLowerCase())
    );

    async function handleSearch(e) {
        e.preventDefault();
        if (!searchEmail) return;
        setSearchLoading(true);
        setFoundUser(null);

        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .ilike('email', searchEmail.trim())
            .maybeSingle();

        if (error || !data) {
            addToast("User not found.", "error");
        } else {
            if (['admin', 'manager', 'employee'].includes(data.role)) {
                addToast("User is already on the team.", "info");
            } else {
                setFoundUser(data);
            }
        }
        setSearchLoading(false);
    }

    const handleRoleChange = async (userId, newRole) => {
        if (currentUser && currentUser.id === userId) {
            if (!window.confirm("WARNING: You are changing your own role. Are you sure?")) return;
        }
        if (newRole === 'customer') {
            if (!window.confirm(`Are you sure you want to remove this user from staff?`)) return;
        }

        const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', userId);

        if (error) {
            addToast("Error updating role", "error");
        } else {
            addToast(`Role updated successfully`, "success");
            setFoundUser(null);
            setSearchEmail('');
            if (isAddModalOpen) setIsAddModalOpen(false);
            fetchTeam();
        }
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        addToast("Copied to clipboard", "success");
    };

    const toggleTheme = () => {
        setTheme(prev => prev === 'light' ? 'dark' : 'light');
    };

    // Premium Theme Generator for Roles
    const getRoleTheme = (role) => {
        switch (role) {
            case 'admin': return { border: 'border-l-purple-500', pill: 'bg-purple-500 text-white shadow-purple-500/30', iconText: 'text-purple-600 dark:text-purple-400', icon: <Shield size={20} /> };
            case 'manager': return { border: 'border-l-indigo-500', pill: 'bg-indigo-500 text-white shadow-indigo-500/30', iconText: 'text-indigo-600 dark:text-indigo-400', icon: <Briefcase size={20} /> };
            case 'employee': return { border: 'border-l-emerald-500', pill: 'bg-emerald-500 text-white shadow-emerald-500/30', iconText: 'text-emerald-600 dark:text-emerald-400', icon: <User size={20} /> };
            default: return { border: 'border-l-slate-500', pill: 'bg-slate-500 text-white shadow-slate-500/30', iconText: 'text-[var(--text-muted)]', icon: <User size={20} /> };
        }
    };

    const UserCard = ({ user, isSearchResult = false }) => {
        const theme = getRoleTheme(user.role);

        return (
            <div className={`p-6 rounded-xl flex flex-col justify-between h-full transition-all duration-300 border-l-[4px] border border-[var(--border-color)] group
            ${isSearchResult
                    ? 'bg-indigo-50/50 dark:bg-indigo-900/10 border-indigo-200 dark:border-indigo-800 shadow-md scale-[1.02]'
                    : `bg-[var(--bg-surface)] hover:shadow-md hover:-translate-y-0.5 ${theme.border}`
                }`}>
                
                <div>
                    {/* Header Row */}
                    <div className="flex justify-between items-center mb-5">
                        <div className={`inline-flex items-center justify-center px-3 py-1.5 font-black uppercase text-[10px] tracking-widest rounded-md transition-all shadow-md ${theme.pill}`}>
                            {user.role}
                        </div>
                        <div className={`w-10 h-10 rounded-full bg-[var(--bg-subtle)] border border-[var(--border-color)] shadow-inner flex items-center justify-center transition-colors ${theme.iconText} group-hover:scale-110`}>
                            {theme.icon}
                        </div>
                    </div>

                    {/* Identity */}
                    <div className="mb-4">
                        <h3 className="font-black text-xl text-[var(--text-main)] truncate mb-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                            {user.full_name || 'No Name Set'}
                        </h3>
                    </div>

                    {/* Recessed Info Box */}
                    <div className="p-3.5 mb-6 rounded-lg bg-[var(--bg-subtle)] shadow-inner flex flex-col gap-2.5 border border-[var(--border-color)]">
                        <div className="flex items-center gap-2 text-xs font-bold text-[var(--text-muted)] cursor-pointer hover:text-[var(--text-main)] transition-colors" onClick={() => copyToClipboard(user.email)}>
                            <Mail size={14} className="text-indigo-500 flex-shrink-0" />
                            <span className="truncate flex-1">{user.email}</span>
                            <Copy size={12} className="opacity-50" />
                        </div>
                        <div className="flex items-center gap-2 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">
                            <Calendar size={14} className="text-amber-500" />
                            Joined {format(new Date(user.created_at), 'MMM d, yyyy')}
                        </div>
                    </div>
                </div>

                {/* Footer Actions - Dashed Divider */}
                <div className="pt-4 border-t-2 border-dashed border-[var(--border-color)] space-y-2 mt-auto">
                    {!isSearchResult && (
                        <button onClick={() => openMemberStats(user)} className="btn btn-sm btn-ghost w-full font-bold text-[var(--text-muted)] hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 border border-transparent hover:border-indigo-200 dark:hover:border-indigo-800 transition-all">
                            <Activity size={14} /> View Performance
                        </button>
                    )}

                    {user.role === 'customer' && (
                        <button onClick={() => handleRoleChange(user.id, 'employee')} className="btn btn-sm btn-gradient w-full shadow-md text-white font-bold tracking-wide">
                            Promote to Staff
                        </button>
                    )}

                    {user.role === 'employee' && (
                        <div className="flex gap-2">
                            <button onClick={() => handleRoleChange(user.id, 'customer')} className="btn btn-sm btn-ghost text-[var(--text-muted)] flex-1 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all">Remove</button>
                            <button onClick={() => handleRoleChange(user.id, 'manager')} className="btn btn-sm btn-ghost text-indigo-600 flex-1 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:hover:bg-indigo-900/50 transition-all">Promote</button>
                        </div>
                    )}

                    {user.role === 'manager' && (
                        <button onClick={() => handleRoleChange(user.id, 'employee')} className="btn btn-sm btn-ghost w-full text-[var(--text-muted)] hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-all">
                            Demote to Employee
                        </button>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="min-h-screen p-4 md:p-6 font-sans pb-24 transition-colors duration-300">

            {/* NAVBAR */}
            <div className="navbar rounded-2xl mb-6 sticky top-2 z-40 flex justify-between shadow-sm backdrop-blur-md bg-[var(--bg-surface)] border border-[var(--border-color)] px-3 py-2 animate-fade">
                <div className="flex items-center">
                    <button onClick={() => navigate('/dashboard')} className="btn btn-sm btn-ghost gap-2 text-[var(--text-muted)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-main)] transition-colors rounded-lg">
                        <ArrowLeft size={18} /> <span className="hidden md:inline font-bold">Dashboard</span>
                    </button>
                </div>
                
                {/* Theme Toggle Button */}
                <div className="flex items-center gap-2">
                    <button onClick={toggleTheme} className="btn btn-sm btn-circle btn-ghost text-[var(--text-muted)] hover:text-indigo-500 hover:bg-[var(--bg-subtle)] transition-colors" title="Toggle Theme">
                        {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
                    </button>
                </div>
            </div>

            {/* HEADER & SEARCH */}
            <div className="rounded-2xl p-6 md:p-8 mb-6 bg-[var(--bg-surface)] border border-[var(--border-color)] shadow-sm animate-fade-in-up">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-black text-[var(--text-main)] flex items-center gap-3 tracking-tight mb-2">
                            <Users size={28} className="text-indigo-600" /> Team Management
                        </h1>
                        <div className="flex items-center gap-3 pl-10">
                            <p className="text-sm font-medium text-[var(--text-muted)]">Manage access, roles, and performance.</p>
                            <span className="text-slate-300 dark:text-slate-600">|</span>
                            <button onClick={() => setShowRoleGuide(!showRoleGuide)} className="text-indigo-500 text-xs font-bold hover:text-indigo-600 transition-colors flex items-center gap-1 bg-indigo-50 dark:bg-indigo-900/20 px-2 py-1 rounded-md">
                                <Info size={12} /> {showRoleGuide ? 'Hide Guide' : 'Role Guide'}
                            </button>
                        </div>
                    </div>

                    <div className="flex gap-3 w-full md:w-auto">
                        {/* Premium Recessed Search */}
                        <div className="relative flex-1 md:w-72 group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within:text-indigo-500 transition-colors" size={18} />
                            <input
                                type="text"
                                placeholder="Find staff member..."
                                className="input input-bordered w-full pl-11 h-12 bg-[var(--bg-subtle)] focus:bg-[var(--bg-surface)] text-[var(--text-main)] font-medium shadow-inner transition-all focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500"
                                value={rosterSearch}
                                onChange={(e) => setRosterSearch(e.target.value)}
                            />
                        </div>

                        <button onClick={() => setIsAddModalOpen(true)} className="btn btn-gradient h-12 text-white shadow-lg gap-2 flex-none px-6 hover:scale-105 transition-all rounded-xl border-none">
                            <UserPlus size={18} strokeWidth={2.5} /> <span className="hidden md:inline font-bold tracking-wide">Add Staff</span>
                        </button>
                    </div>
                </div>

                {/* ROLE GUIDE - Recessed Cards */}
                {showRoleGuide && (
                    <div className="mt-6 pt-6 border-t-2 border-dashed border-[var(--border-color)] grid grid-cols-1 md:grid-cols-3 gap-4 animate-slide-down">
                        <div className="p-4 bg-[var(--bg-subtle)] rounded-xl border border-[var(--border-color)] shadow-inner">
                            <div className="font-black text-[10px] uppercase tracking-widest text-emerald-600 mb-2 flex items-center gap-1.5"><User size={14} /> Employee</div>
                            <p className="text-xs font-medium text-[var(--text-muted)] leading-relaxed">Can view and edit tickets. Cannot delete records or access team management.</p>
                        </div>
                        <div className="p-4 bg-[var(--bg-subtle)] rounded-xl border border-[var(--border-color)] shadow-inner">
                            <div className="font-black text-[10px] uppercase tracking-widest text-indigo-600 mb-2 flex items-center gap-1.5"><Briefcase size={14} /> Manager</div>
                            <p className="text-xs font-medium text-[var(--text-muted)] leading-relaxed">Can delete records, view performance reports, and manage basic employees.</p>
                        </div>
                        <div className="p-4 bg-[var(--bg-subtle)] rounded-xl border border-[var(--border-color)] shadow-inner">
                            <div className="font-black text-[10px] uppercase tracking-widest text-purple-600 mb-2 flex items-center gap-1.5"><Shield size={14} /> Admin</div>
                            <p className="text-xs font-medium text-[var(--text-muted)] leading-relaxed">Full system access. Can promote or demote managers and control settings.</p>
                        </div>
                    </div>
                )}
            </div>

            {/* ROSTER GRID */}
            <div>
                {loading ? (
                    <div className="flex justify-center mt-20"><span className="loading loading-spinner loading-lg text-indigo-500"></span></div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade">
                        {filteredTeam.map(user => (
                            <UserCard key={user.id} user={user} />
                        ))}
                        {filteredTeam.length === 0 && (
                            <div className="col-span-full text-center p-16 text-[var(--text-muted)] bg-[var(--bg-surface)] border-2 border-dashed border-[var(--border-color)] rounded-2xl shadow-sm">
                                <Filter size={48} className="mx-auto mb-4 opacity-50" />
                                <h3 className="font-bold text-lg text-[var(--text-main)] mb-1">No staff found</h3>
                                <p className="text-sm">Try adjusting your search terms.</p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* --- ADD STAFF MODAL --- */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade">
                    <div className="bg-[var(--bg-surface)] w-full max-w-lg rounded-2xl shadow-2xl border border-[var(--border-color)] flex flex-col overflow-hidden animate-pop ring-1 ring-white/20">
                        
                        <div className="p-5 border-b-2 border-dashed border-[var(--border-color)] flex justify-between items-center bg-[var(--bg-surface)]">
                            <h2 className="text-xl font-black text-[var(--text-main)] flex items-center gap-2 tracking-tight">
                                <UserPlus size={22} className="text-indigo-600" /> Add Team Member
                            </h2>
                            <button onClick={() => { setIsAddModalOpen(false); setFoundUser(null); setSearchEmail(''); }} className="btn btn-sm btn-circle btn-ghost text-[var(--text-muted)] hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all">
                                <X size={20} />
                            </button>
                        </div>
                        
                        <div className="p-6 bg-[var(--bg-subtle)]">
                            {/* Premium Segmented Control */}
                            <div className="flex bg-[var(--bg-subtle)] p-1.5 rounded-xl mb-6 shadow-inner border border-[var(--border-color)]">
                                <button onClick={() => setActiveTab('search')} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all flex justify-center gap-2 ${activeTab === 'search' ? 'bg-[var(--bg-surface)] text-indigo-600 shadow-sm ring-1 ring-black/5 dark:ring-white/5' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}>
                                    <Search size={16} /> Promote Existing
                                </button>
                                <button onClick={() => setActiveTab('invite')} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all flex justify-center gap-2 ${activeTab === 'invite' ? 'bg-[var(--bg-surface)] text-indigo-600 shadow-sm ring-1 ring-black/5 dark:ring-white/5' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}>
                                    <Mail size={16} /> Invite New
                                </button>
                            </div>

                            <div className="bg-[var(--bg-surface)] p-5 rounded-xl border border-[var(--border-color)] shadow-sm">
                                {activeTab === 'search' ? (
                                    <>
                                        <form onSubmit={handleSearch} className="flex gap-2 mb-2">
                                            <input type="email" placeholder="User's email address..." className="input input-bordered flex-1 font-medium bg-[var(--bg-subtle)] text-[var(--text-main)] shadow-inner focus:bg-[var(--bg-surface)] focus:border-indigo-500 transition-all" value={searchEmail} onChange={(e) => setSearchEmail(e.target.value)} />
                                            <button type="submit" className="btn btn-neutral" disabled={searchLoading}>{searchLoading ? <span className="loading loading-spinner"></span> : <Search size={18} />}</button>
                                        </form>
                                        
                                        {foundUser ? (
                                            <div className="mt-6 animate-fade-in-up">
                                                <div className="text-[10px] font-black uppercase tracking-widest text-emerald-600 mb-3 flex items-center gap-1.5"><CheckCircle size={14} /> Match Found</div>
                                                <UserCard user={foundUser} isSearchResult={true} />
                                            </div>
                                        ) : (
                                            !searchLoading && searchEmail && <div className="text-center p-6 text-[var(--text-muted)] text-sm font-medium mt-4 bg-[var(--bg-subtle)] rounded-lg border border-[var(--border-color)] shadow-inner">Enter a customer's email to promote them to staff.</div>
                                        )}
                                    </>
                                ) : (
                                    <div className="text-center space-y-6 animate-fade py-2">
                                        <div className="p-4 bg-white rounded-xl border border-[var(--border-color)] w-48 mx-auto shadow-sm">
                                            <img src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${inviteLink}`} alt="Invite QR" className="w-full h-full" />
                                        </div>
                                        <div>
                                            <h3 className="font-black text-lg text-[var(--text-main)] mb-1">Scan to Signup</h3>
                                            <p className="text-sm font-medium text-[var(--text-muted)]">New staff can scan this to create their account.</p>
                                        </div>
                                        <div className="flex gap-2">
                                            <input type="text" value={inviteLink} readOnly className="input input-bordered flex-1 bg-[var(--bg-subtle)] text-xs font-mono font-bold text-[var(--text-muted)] shadow-inner" />
                                            <button onClick={() => { navigator.clipboard.writeText(inviteLink); addToast("Link copied!", "success"); }} className="btn btn-square btn-ghost border-[var(--border-color)] hover:bg-[var(--bg-subtle)] text-[var(--text-main)]"><Copy size={18} /></button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* --- EMPLOYEE INSIGHTS MODAL --- */}
            {selectedMember && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade">
                    <div className="bg-[var(--bg-surface)] w-full max-w-xl rounded-2xl shadow-2xl border border-[var(--border-color)] flex flex-col overflow-hidden animate-pop ring-1 ring-white/20">
                        
                        <div className="p-5 border-b-2 border-dashed border-[var(--border-color)] flex justify-between items-center bg-[var(--bg-surface)]">
                            <div>
                                <h2 className="text-xl font-black text-[var(--text-main)] tracking-tight">{selectedMember.full_name || 'Staff'}</h2>
                                <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mt-1">Performance Report</p>
                            </div>
                            <button onClick={() => setSelectedMember(null)} className="btn btn-sm btn-circle btn-ghost text-[var(--text-muted)] hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto max-h-[70vh] bg-[var(--bg-subtle)]">
                            {statsLoading ? (
                                <div className="py-12 text-center flex flex-col items-center gap-3">
                                    <span className="loading loading-spinner loading-lg text-indigo-500"></span>
                                    <span className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">Compiling Data</span>
                                </div>
                            ) : memberStats ? (
                                <div className="space-y-6">
                                    
                                    {/* Stats Grid - Recessed Premium Cards */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="p-5 bg-[var(--bg-surface)] rounded-xl border border-[var(--border-color)] shadow-sm flex items-center gap-4">
                                            <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-500 rounded-lg shadow-inner">
                                                <DollarSign size={24} />
                                            </div>
                                            <div>
                                                <div className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-1">Revenue</div>
                                                <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 leading-none">{formatCurrency(memberStats.revenue)}</div>
                                            </div>
                                        </div>
                                        <div className="p-5 bg-[var(--bg-surface)] rounded-xl border border-[var(--border-color)] shadow-sm flex items-center gap-4">
                                            <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-500 rounded-lg shadow-inner">
                                                <CheckCircle size={24} />
                                            </div>
                                            <div>
                                                <div className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-1">Completed</div>
                                                <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400 leading-none">{memberStats.completed}</div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Activity Log */}
                                    <div className="bg-[var(--bg-surface)] p-5 rounded-xl border border-[var(--border-color)] shadow-sm">
                                        <h3 className="text-[10px] font-black uppercase text-[var(--text-muted)] tracking-widest mb-4 flex items-center gap-2 border-b-2 border-dashed border-[var(--border-color)] pb-3">
                                            <Clock size={14} className="text-amber-500" /> Recent Activity
                                        </h3>
                                        
                                        <div className="space-y-3">
                                            {memberStats.recentActivity && memberStats.recentActivity.length > 0 ? (
                                                memberStats.recentActivity.map(log => (
                                                    <div key={log.id} className="p-3.5 bg-[var(--bg-subtle)] rounded-lg shadow-inner border border-[var(--border-color)]">
                                                        <div className="font-medium text-[var(--text-main)] text-sm mb-2 leading-snug">{log.details}</div>
                                                        <div className="text-[10px] font-black text-[var(--text-muted)] flex justify-between uppercase tracking-widest">
                                                            <span className="text-indigo-500">{log.action}</span>
                                                            <span>{format(new Date(log.created_at), 'MMM d, h:mm a')}</span>
                                                        </div>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="text-center py-8 bg-[var(--bg-subtle)] rounded-lg shadow-inner border border-[var(--border-color)]">
                                                    <Activity size={32} className="mx-auto text-[var(--border-color)] mb-2" />
                                                    <div className="text-sm font-bold text-[var(--text-main)]">No recent activity</div>
                                                    <div className="text-xs text-[var(--text-muted)] mt-1">Logs will appear here when actions are taken.</div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center text-red-500 font-bold p-8">Failed to load performance data.</div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}