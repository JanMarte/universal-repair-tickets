import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import {
    ArrowLeft, Shield, User, Users, Briefcase, Calendar, Mail,
    Search, UserPlus, X, Copy, CheckCircle, Info, Filter,
    Activity, DollarSign, Clock, FileText, ChevronRight, Moon, Sun, Wrench
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
        if (user) {
            const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
            setCurrentUser(profile);
        }
    }

    async function fetchTeam() {
        setLoading(true);
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .in('role', ['admin', 'manager', 'employee'])
            .order('role', { ascending: true });

        if (error) console.error(error);

        // Sort to ensure Admin is first, then Manager, then Employee
        const sortedStaff = (data || []).sort((a, b) => {
            const ranks = { admin: 1, manager: 2, employee: 3 };
            return ranks[a.role] - ranks[b.role];
        });

        setTeamMembers(sortedStaff);
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
            case 'admin': return { border: 'border-pink-500', bg: 'bg-pink-500', pill: 'bg-pink-500 text-white shadow-pink-500/30', iconText: 'text-pink-600 dark:text-pink-400', icon: <Shield size={14} /> };
            case 'manager': return { border: 'border-amber-500', bg: 'bg-amber-500', pill: 'bg-amber-500 text-white shadow-amber-500/30', iconText: 'text-amber-600 dark:text-amber-400', icon: <Briefcase size={14} /> };
            case 'employee': return { border: 'border-indigo-500', bg: 'bg-indigo-500', pill: 'bg-indigo-500 text-white shadow-indigo-500/30', iconText: 'text-indigo-600 dark:text-indigo-400', icon: <User size={14} /> };
            default: return { border: 'border-slate-500', bg: 'bg-slate-500', pill: 'bg-slate-500 text-white shadow-slate-500/30', iconText: 'text-[var(--text-muted)]', icon: <User size={14} /> };
        }
    };

    const getInitials = (name) => {
        if (!name) return '??';
        const parts = name.trim().split(' ');
        if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
        return name.substring(0, 2).toUpperCase();
    };

    const UserCard = ({ user, isSearchResult = false }) => {
        const theme = getRoleTheme(user.role);

        return (
            <div className={`rounded-2xl border border-[var(--border-color)] shadow-sm hover:shadow-md transition-all group relative overflow-hidden flex flex-col h-full
            ${isSearchResult ? 'bg-indigo-50/50 dark:bg-indigo-900/10 border-indigo-200 dark:border-indigo-800 scale-[1.02]' : 'bg-[var(--bg-surface)] hover:-translate-y-0.5'}`}>

                {/* Top Color Bar */}
                <div className={`h-1.5 w-full ${theme.bg}`}></div>

                <div className="p-6 flex-1 flex flex-col">
                    {/* Header Row */}
                    <div className="flex justify-between items-start mb-5">
                        <div className="w-14 h-14 rounded-2xl bg-[var(--bg-subtle)] border border-[var(--border-color)] shadow-inner flex items-center justify-center text-xl font-black text-[var(--text-main)] group-hover:scale-105 transition-transform">
                            {getInitials(user.full_name)}
                        </div>

                        <div className={`inline-flex items-center justify-center gap-1.5 px-3 py-1.5 font-black uppercase text-[10px] tracking-widest rounded-md transition-all shadow-md ${theme.pill}`}>
                            {theme.icon} {user.role}
                        </div>
                    </div>

                    {/* Identity */}
                    <div className="mb-4">
                        <h3 className="font-black text-lg text-[var(--text-main)] truncate mb-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                            {user.full_name || 'Pending Name'}
                        </h3>
                    </div>

                    {/* Recessed Info Box */}
                    <div className="p-3.5 mb-6 rounded-xl bg-[var(--bg-subtle)] shadow-inner flex flex-col gap-2.5 border border-[var(--border-color)] mt-auto">
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

                    {/* Footer Actions - Dashed Divider */}
                    <div className="pt-4 border-t-2 border-dashed border-[var(--border-color)] space-y-2">
                        {!isSearchResult && (
                            <button onClick={() => openMemberStats(user)} className="btn btn-sm btn-ghost w-full font-bold text-[var(--text-muted)] hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 border border-transparent hover:border-indigo-200 dark:hover:border-indigo-800 transition-all">
                                <Activity size={14} /> View Performance
                            </button>
                        )}

                        {currentUser?.role === 'admin' && (
                            <>
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
                            </>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="min-h-screen p-4 md:p-6 font-sans pb-24 transition-colors duration-300">
            <div className="max-w-7xl mx-auto space-y-6">

                {/* PREMIUM NAVBAR */}
                <div className="navbar rounded-2xl sticky top-2 z-40 flex justify-between shadow-sm backdrop-blur-md bg-[var(--bg-surface)]/90 border border-[var(--border-color)] px-4 py-3 animate-fade-in-up">

                    <div className="flex items-center gap-2">
                        <button onClick={() => navigate('/')} className="btn btn-sm btn-ghost gap-2 px-3 text-[var(--text-muted)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-main)] transition-all rounded-lg group">
                            <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform duration-300" />
                            <span className="hidden sm:inline font-bold">Dashboard</span>
                        </button>
                    </div>

                    <div
                        onClick={() => navigate('/')}
                        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 hidden md:flex items-center gap-2 cursor-pointer group active:scale-95 transition-transform"
                        title="Return to Dashboard"
                    >
                        <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center text-white shadow-md shadow-indigo-500/20 group-hover:scale-110 transition-transform duration-300">
                            <Wrench size={14} fill="currentColor" />
                        </div>
                        <span className="font-black text-[var(--text-main)] text-lg tracking-tight group-hover:opacity-80 transition-opacity">
                            University <span className="text-indigo-500">Vac & Sew</span>
                        </span>
                    </div>

                    <div className="flex items-center gap-2">
                        <button onClick={toggleTheme} className="w-10 h-10 flex items-center justify-center rounded-full bg-[var(--bg-subtle)] border border-[var(--border-color)] shadow-inner text-[var(--text-muted)] hover:text-indigo-500 transition-colors" title="Toggle Theme">
                            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
                        </button>
                    </div>
                </div>

                {/* HEADER & SEARCH */}
                <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-3xl p-6 md:p-8 shadow-sm animate-fade-in-up relative overflow-hidden z-10" style={{ animationDelay: '0.1s' }}>
                    <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>

                    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                        <div>
                            <h1 className="text-3xl font-black text-[var(--text-main)] tracking-tight flex items-center gap-3 mb-2">
                                <Users className="text-indigo-600" size={32} />
                                Team Management
                            </h1>
                            <div className="flex flex-wrap items-center gap-3">
                                <p className="text-sm font-bold text-[var(--text-muted)]">
                                    Manage access, roles, and performance.
                                </p>
                                <span className="hidden sm:inline text-slate-300 dark:text-slate-600">|</span>
                                <button onClick={() => setShowRoleGuide(!showRoleGuide)} className="text-indigo-500 text-[10px] font-black uppercase tracking-widest hover:text-indigo-600 transition-colors flex items-center gap-1.5 bg-indigo-50 dark:bg-indigo-900/20 px-2.5 py-1.5 rounded-lg border border-indigo-100 dark:border-indigo-800 shadow-sm">
                                    <Info size={12} /> {showRoleGuide ? 'Hide Guide' : 'Role Guide'}
                                </button>
                            </div>
                        </div>

                        <div className="flex gap-3 w-full lg:w-auto items-end">
                            <div className="flex-1 lg:w-80">
                                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-1.5 block pl-1">
                                    Roster Search
                                </label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[var(--text-muted)] group-focus-within:text-indigo-500 transition-colors">
                                        <Search size={18} />
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="Find staff member..."
                                        className="input input-bordered w-full h-12 pl-12 bg-[var(--bg-subtle)] focus:bg-[var(--bg-surface)] text-[var(--text-main)] font-medium shadow-inner transition-all focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 text-sm rounded-xl"
                                        value={rosterSearch}
                                        onChange={(e) => setRosterSearch(e.target.value)}
                                    />
                                </div>
                            </div>
                            {currentUser?.role === 'admin' && (
                                <button onClick={() => setIsAddModalOpen(true)} className="btn btn-gradient text-white shadow-lg shadow-indigo-500/30 border-none gap-2 px-6 hover:scale-105 transition-transform rounded-xl h-12 flex-none">
                                    <UserPlus size={18} strokeWidth={2.5} /> <span className="hidden md:inline font-bold">Add Staff</span>
                                </button>
                            )}
                        </div>
                    </div>

                    {/* ROLE GUIDE - Recessed Cards */}
                    {showRoleGuide && (
                        <div className="mt-8 pt-6 border-t-2 border-dashed border-[var(--border-color)] grid grid-cols-1 md:grid-cols-3 gap-4 animate-slide-down">
                            <div className="p-5 bg-[var(--bg-subtle)] rounded-xl border border-[var(--border-color)] shadow-inner">
                                <div className="font-black text-[10px] uppercase tracking-widest text-emerald-600 mb-2 flex items-center gap-1.5"><User size={14} /> Employee</div>
                                <p className="text-xs font-medium text-[var(--text-muted)] leading-relaxed">Can view and edit tickets. Cannot delete records or access team management.</p>
                            </div>
                            <div className="p-5 bg-[var(--bg-subtle)] rounded-xl border border-[var(--border-color)] shadow-inner">
                                <div className="font-black text-[10px] uppercase tracking-widest text-amber-600 mb-2 flex items-center gap-1.5"><Briefcase size={14} /> Manager</div>
                                <p className="text-xs font-medium text-[var(--text-muted)] leading-relaxed">Can delete records, view performance reports, and manage basic employees.</p>
                            </div>
                            <div className="p-5 bg-[var(--bg-subtle)] rounded-xl border border-[var(--border-color)] shadow-inner">
                                <div className="font-black text-[10px] uppercase tracking-widest text-pink-600 mb-2 flex items-center gap-1.5"><Shield size={14} /> Admin</div>
                                <p className="text-xs font-medium text-[var(--text-muted)] leading-relaxed">Full system access. Can promote or demote managers and control settings.</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* ROSTER GRID */}
                <div>
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20">
                            <span className="loading loading-spinner loading-lg text-indigo-500 mb-4"></span>
                            <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] animate-pulse">Loading Roster...</span>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
                            {filteredTeam.map(user => (
                                <UserCard key={user.id} user={user} />
                            ))}
                            {filteredTeam.length === 0 && (
                                <div className="col-span-full text-center py-24 bg-[var(--bg-surface)] border-2 border-dashed border-[var(--border-color)] rounded-3xl shadow-sm animate-fade-in">
                                    <Filter size={48} className="mx-auto text-[var(--text-muted)] mb-4 opacity-50" />
                                    <h3 className="text-xl font-black text-[var(--text-main)] tracking-tight mb-2">No staff found</h3>
                                    <p className="text-sm font-medium text-[var(--text-muted)]">
                                        Try adjusting your search terms.
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* --- ADD STAFF MODAL --- */}
                {isAddModalOpen && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
                        <div className="bg-[var(--bg-surface)] w-full max-w-lg rounded-3xl shadow-2xl border border-[var(--border-color)] flex flex-col overflow-hidden animate-pop">

                            <div className="p-6 border-b-2 border-dashed border-[var(--border-color)] flex justify-between items-center bg-[var(--bg-surface)]">
                                <h2 className="text-xl font-black text-[var(--text-main)] flex items-center gap-2 tracking-tight">
                                    <UserPlus size={22} className="text-indigo-600" /> Add Team Member
                                </h2>
                                <button onClick={() => { setIsAddModalOpen(false); setFoundUser(null); setSearchEmail(''); }} className="btn btn-sm btn-circle btn-ghost text-[var(--text-muted)] hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all">
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="p-6 bg-[var(--bg-subtle)] space-y-6">
                                <div className="bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-200 dark:border-indigo-800/50 p-4 rounded-2xl shadow-sm text-sm font-medium text-[var(--text-main)] leading-relaxed">
                                    <strong className="text-indigo-600 dark:text-indigo-400">Step 1:</strong> You must first invite the employee via your Supabase Authentication Dashboard.<br /><br />
                                    <strong className="text-indigo-600 dark:text-indigo-400">Step 2:</strong> Once they have created their account, use the search below to find their email and promote them to staff.
                                </div>

                                <div className="bg-[var(--bg-surface)] p-5 rounded-2xl border border-[var(--border-color)] shadow-sm">
                                    <form onSubmit={handleSearch} className="flex flex-col gap-3 mb-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] pl-1">Search Customer Database</label>
                                        <div className="flex gap-2">
                                            <input type="email" required placeholder="User's email address..." className="input input-bordered flex-1 h-12 font-medium bg-[var(--bg-subtle)] text-[var(--text-main)] shadow-inner focus:bg-[var(--bg-surface)] focus:border-indigo-500 transition-all rounded-xl" value={searchEmail} onChange={(e) => setSearchEmail(e.target.value)} />
                                            <button type="submit" className="btn btn-neutral h-12 w-12 rounded-xl" disabled={searchLoading}>{searchLoading ? <span className="loading loading-spinner"></span> : <Search size={18} />}</button>
                                        </div>
                                    </form>

                                    {foundUser ? (
                                        <div className="mt-6 animate-fade-in-up">
                                            <div className="text-[10px] font-black uppercase tracking-widest text-emerald-600 mb-3 flex items-center gap-1.5"><CheckCircle size={14} /> Match Found</div>
                                            <UserCard user={foundUser} isSearchResult={true} />
                                        </div>
                                    ) : (
                                        !searchLoading && searchEmail && <div className="text-center p-6 text-[var(--text-muted)] text-sm font-medium mt-4 bg-[var(--bg-subtle)] rounded-xl border border-[var(--border-color)] shadow-inner">Enter an email to promote them to staff.</div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* --- EMPLOYEE INSIGHTS MODAL --- */}
                {selectedMember && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
                        <div className="bg-[var(--bg-surface)] w-full max-w-xl rounded-3xl shadow-2xl border border-[var(--border-color)] flex flex-col overflow-hidden animate-pop">

                            <div className="p-6 border-b-2 border-dashed border-[var(--border-color)] flex justify-between items-center bg-[var(--bg-surface)]">
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

                                        {/* Stats Grid */}
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="p-5 bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-color)] shadow-sm flex flex-col sm:flex-row items-start sm:items-center gap-4">
                                                <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-500 rounded-xl shadow-inner border border-emerald-100 dark:border-emerald-800">
                                                    <DollarSign size={24} />
                                                </div>
                                                <div>
                                                    <div className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-1">Revenue</div>
                                                    <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 leading-none">{formatCurrency(memberStats.revenue)}</div>
                                                </div>
                                            </div>
                                            <div className="p-5 bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-color)] shadow-sm flex flex-col sm:flex-row items-start sm:items-center gap-4">
                                                <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-500 rounded-xl shadow-inner border border-indigo-100 dark:border-indigo-800">
                                                    <CheckCircle size={24} />
                                                </div>
                                                <div>
                                                    <div className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-1">Completed</div>
                                                    <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400 leading-none">{memberStats.completed}</div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Activity Log */}
                                        <div className="bg-[var(--bg-surface)] p-6 rounded-3xl border border-[var(--border-color)] shadow-sm">
                                            <h3 className="text-[10px] font-black uppercase text-[var(--text-muted)] tracking-widest mb-5 flex items-center gap-2 border-b-2 border-dashed border-[var(--border-color)] pb-3">
                                                <Clock size={14} className="text-amber-500" /> Recent Activity
                                            </h3>

                                            <div className="space-y-3">
                                                {memberStats.recentActivity && memberStats.recentActivity.length > 0 ? (
                                                    memberStats.recentActivity.map(log => (
                                                        <div key={log.id} className="p-4 bg-[var(--bg-subtle)] rounded-xl shadow-inner border border-[var(--border-color)]">
                                                            <div className="font-medium text-[var(--text-main)] text-sm mb-3 leading-snug">{log.details}</div>
                                                            <div className="text-[10px] font-black text-[var(--text-muted)] flex justify-between uppercase tracking-widest">
                                                                <span className="text-indigo-500">{log.action}</span>
                                                                <span>{format(new Date(log.created_at), 'MMM d, h:mm a')}</span>
                                                            </div>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <div className="text-center py-10 bg-[var(--bg-subtle)] rounded-2xl shadow-inner border border-[var(--border-color)]">
                                                        <Activity size={32} className="mx-auto text-[var(--border-color)] mb-3 opacity-50" />
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
        </div>
    );
}