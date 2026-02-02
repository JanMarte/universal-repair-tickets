import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import {
    ArrowLeft, Shield, User, Briefcase, Calendar, Mail,
    Search, UserPlus, X, Copy, CheckCircle, Info, Filter,
    Activity, DollarSign, Clock, FileText
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../context/ToastProvider';
import { format } from 'date-fns';
import { formatCurrency } from '../utils';

export default function Team() {
    const [teamMembers, setTeamMembers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentUser, setCurrentUser] = useState(null);

    // Modal & Search State
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('search');
    const [searchEmail, setSearchEmail] = useState('');
    const [rosterSearch, setRosterSearch] = useState('');
    const [foundUser, setFoundUser] = useState(null);
    const [searchLoading, setSearchLoading] = useState(false);

    // --- NEW: STATS STATE ---
    const [selectedMember, setSelectedMember] = useState(null);
    const [memberStats, setMemberStats] = useState(null);
    const [statsLoading, setStatsLoading] = useState(false);

    // UI State
    const [showRoleGuide, setShowRoleGuide] = useState(false);

    const navigate = useNavigate();
    const { addToast } = useToast();
    const inviteLink = `${window.location.origin}/login`;

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

    // --- NEW: FETCH STATS FUNCTION ---
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

            // 2. Get Recent Audit Logs (Activity)
            // Note: This relies on us having captured 'actor_name' or stored user_id in metadata. 
            // Since our audit log stores 'actor_name', we will try to match loosely or by specific logs if linked.
            //Ideally, audit_logs should have a 'user_id' column. 
            // For now, we'll try to match by name if possible, or skip if your audit_logs table structure doesn't link IDs.
            // *Assumption*: You might not have user_id in audit_logs yet. If not, this part might return empty.

            // Let's try searching by the name stored in the profile
            const { data: logs } = await supabase
                .from('audit_logs')
                .select('*')
                .ilike('actor_name', `%${member.full_name?.split(' ')[0]}%`) // Loose match on first name
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

    const getRoleBadge = (role) => {
        switch (role) {
            case 'admin': return 'bg-purple-100 text-purple-700 border-purple-200';
            case 'manager': return 'bg-indigo-100 text-indigo-700 border-indigo-200';
            case 'employee': return 'bg-blue-100 text-blue-700 border-blue-200';
            default: return 'bg-slate-100 text-slate-600 border-slate-200';
        }
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        addToast("Copied to clipboard", "success");
    };

    const UserCard = ({ user, isSearchResult = false }) => (
        <div className={`p-5 rounded-2xl border flex flex-col justify-between h-full transition-all 
        ${isSearchResult
                ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800 shadow-md scale-100'
                : 'bg-[var(--bg-surface)] border-[var(--border-color)] shadow-sm hover:shadow-md'
            }`}>
            <div>
                <div className="flex justify-between items-start mb-4">
                    <div className={`p-3 rounded-xl ${user.role === 'admin' ? 'bg-purple-50 text-purple-600' : user.role === 'manager' ? 'bg-indigo-50 text-indigo-600' : 'bg-[var(--bg-subtle)] text-[var(--text-muted)]'}`}>
                        {user.role === 'admin' ? <Shield size={24} /> : user.role === 'manager' ? <Briefcase size={24} /> : <User size={24} />}
                    </div>
                    <span className={`badge border font-bold uppercase text-[10px] tracking-wider py-3 ${getRoleBadge(user.role)}`}>
                        {user.role}
                    </span>
                </div>

                <div className="mb-6 space-y-2">
                    <div className="font-bold text-lg text-[var(--text-main)] truncate">
                        {user.full_name || 'No Name Set'}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-[var(--text-muted)] font-medium truncate group cursor-pointer" onClick={() => copyToClipboard(user.email)}>
                        <Mail size={14} className="flex-shrink-0" />
                        <span className="truncate">{user.email}</span>
                        <Copy size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] font-medium">
                        <Calendar size={14} />
                        Joined {format(new Date(user.created_at), 'MMM d, yyyy')}
                    </div>
                </div>
            </div>

            <div className="pt-4 border-t border-[var(--border-color)] space-y-2">
                {/* --- NEW: INSIGHTS BUTTON --- */}
                {!isSearchResult && (
                    <button onClick={() => openMemberStats(user)} className="btn btn-sm btn-outline w-full border-dashed border-slate-300 dark:border-slate-600 text-[var(--text-muted)] hover:bg-[var(--bg-subtle)]">
                        <Activity size={14} /> View Activity
                    </button>
                )}

                {user.role === 'customer' && (
                    <button onClick={() => handleRoleChange(user.id, 'employee')} className="btn btn-sm btn-primary w-full shadow-lg">Promote to Staff</button>
                )}

                {user.role === 'employee' && (
                    <div className="flex gap-2">
                        <button onClick={() => handleRoleChange(user.id, 'customer')} className="btn btn-sm btn-ghost text-red-500 flex-1 hover:bg-red-50">Remove</button>
                        <button onClick={() => handleRoleChange(user.id, 'manager')} className="btn btn-sm btn-ghost text-indigo-600 flex-1 bg-indigo-50 dark:bg-indigo-900/20">Promote</button>
                    </div>
                )}

                {user.role === 'manager' && (
                    <button onClick={() => handleRoleChange(user.id, 'employee')} className="btn btn-sm btn-ghost text-orange-500 w-full hover:bg-orange-50 dark:hover:bg-orange-900/20">Demote to Employee</button>
                )}
            </div>
        </div>
    );

    return (
        <div className="min-h-screen p-4 md:p-8 font-sans pb-24">

            {/* HEADER */}
            <div className="rounded-2xl p-6 mb-8 bg-[var(--bg-surface)] border border-[var(--border-color)] shadow-sm">
                <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-4 w-full md:w-auto">
                        <button onClick={() => navigate('/dashboard')} className="btn btn-circle btn-ghost"><ArrowLeft /></button>
                        <div>
                            <h1 className="text-2xl font-black text-[var(--text-main)]">Team Management</h1>
                            <div className="flex items-center gap-2">
                                <p className="text-sm text-[var(--text-muted)]">Manage access and roles.</p>
                                <button onClick={() => setShowRoleGuide(!showRoleGuide)} className="text-indigo-500 text-xs font-bold hover:underline flex items-center gap-1">
                                    <Info size={12} /> {showRoleGuide ? 'Hide Guide' : 'Role Guide'}
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-3 w-full md:w-auto">
                        <div className="relative flex-1 md:w-64">
                            <input
                                type="text"
                                placeholder="Find staff member..."
                                className="input input-bordered w-full pl-9 h-12 bg-[var(--bg-subtle)] focus:bg-[var(--bg-surface)]"
                                value={rosterSearch}
                                onChange={(e) => setRosterSearch(e.target.value)}
                            />
                            <Search className="absolute left-3 top-3.5 text-slate-400" size={18} />
                        </div>

                        <button onClick={() => setIsAddModalOpen(true)} className="btn btn-gradient h-12 text-white shadow-md gap-2 flex-none">
                            <UserPlus size={18} /> <span className="hidden md:inline">Add Staff</span>
                        </button>
                    </div>
                </div>

                {showRoleGuide && (
                    <div className="mt-6 p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border border-indigo-100 dark:border-indigo-800 grid grid-cols-1 md:grid-cols-3 gap-4 animate-slide-down">
                        <div className="p-3 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-indigo-100 dark:border-slate-700">
                            <div className="font-bold text-blue-600 mb-1 flex items-center gap-2"><User size={14} /> Employee</div>
                            <p className="text-xs text-[var(--text-muted)]">Can view and edit tickets. Cannot delete records or access team management.</p>
                        </div>
                        <div className="p-3 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-indigo-100 dark:border-slate-700">
                            <div className="font-bold text-indigo-600 mb-1 flex items-center gap-2"><Briefcase size={14} /> Manager</div>
                            <p className="text-xs text-[var(--text-muted)]">Can delete records, view reports, and manage employees.</p>
                        </div>
                        <div className="p-3 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-indigo-100 dark:border-slate-700">
                            <div className="font-bold text-purple-600 mb-1 flex items-center gap-2"><Shield size={14} /> Admin</div>
                            <p className="text-xs text-[var(--text-muted)]">Full system access. Can promote/demote managers.</p>
                        </div>
                    </div>
                )}
            </div>

            {/* ROSTER GRID */}
            <div>
                {loading ? (
                    <div className="flex justify-center mt-10"><span className="loading loading-spinner loading-lg text-primary"></span></div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-fade">
                        {filteredTeam.map(user => (
                            <UserCard key={user.id} user={user} />
                        ))}
                        {filteredTeam.length === 0 && (
                            <div className="col-span-full text-center p-12 text-[var(--text-muted)] border-2 border-dashed border-[var(--border-color)] rounded-xl">
                                <Filter size={32} className="mx-auto mb-2 opacity-50" />
                                No staff members found matching "{rosterSearch}".
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* --- ADD STAFF MODAL --- */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade">
                    <div className="bg-[var(--bg-surface)] w-full max-w-lg rounded-2xl shadow-2xl border border-[var(--border-color)] flex flex-col overflow-hidden animate-pop">
                        <div className="p-5 border-b border-[var(--border-color)] flex justify-between items-center bg-[var(--bg-subtle)]">
                            <h2 className="text-lg font-black text-[var(--text-main)] flex items-center gap-2">
                                <Shield size={18} className="text-purple-600" /> Add Team Member
                            </h2>
                            <button onClick={() => { setIsAddModalOpen(false); setFoundUser(null); setSearchEmail(''); }} className="btn btn-sm btn-circle btn-ghost">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-2 bg-[var(--bg-subtle)] border-b border-[var(--border-color)]">
                            <div className="flex bg-[var(--bg-surface)] p-1 rounded-lg border border-[var(--border-color)]">
                                <button onClick={() => setActiveTab('search')} className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${activeTab === 'search' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}>Promote Existing</button>
                                <button onClick={() => setActiveTab('invite')} className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${activeTab === 'invite' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}>Invite New</button>
                            </div>
                        </div>
                        <div className="p-6">
                            {activeTab === 'search' ? (
                                <>
                                    <form onSubmit={handleSearch} className="flex gap-2 mb-6">
                                        <input type="email" placeholder="User's email address..." className="input input-bordered flex-1 font-medium bg-[var(--bg-surface)] text-[var(--text-main)]" value={searchEmail} onChange={(e) => setSearchEmail(e.target.value)} />
                                        <button type="submit" className="btn btn-neutral" disabled={searchLoading}>{searchLoading ? <span className="loading loading-spinner"></span> : <Search size={18} />}</button>
                                    </form>
                                    {foundUser && (
                                        <div className="animate-fade-in-up">
                                            <div className="text-xs font-bold uppercase text-green-600 mb-2 flex items-center gap-1"><CheckCircle size={12} /> User Found</div>
                                            <UserCard user={foundUser} isSearchResult={true} />
                                        </div>
                                    )}
                                    {!foundUser && !searchLoading && searchEmail && <div className="text-center p-6 text-[var(--text-muted)] text-sm">Search for a customer to promote them to staff.</div>}
                                </>
                            ) : (
                                <div className="text-center space-y-6 animate-fade">
                                    <div className="p-4 bg-white rounded-xl border border-slate-200 w-48 mx-auto shadow-inner">
                                        <img src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${inviteLink}`} alt="Invite QR" className="w-full h-full mix-blend-multiply" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-[var(--text-main)] mb-1">Scan to Signup</h3>
                                        <p className="text-xs text-[var(--text-muted)]">New staff can scan this to create their account.</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <input type="text" value={inviteLink} readOnly className="input input-bordered flex-1 bg-[var(--bg-subtle)] text-xs font-mono text-[var(--text-muted)]" />
                                        <button onClick={() => { navigator.clipboard.writeText(inviteLink); addToast("Link copied!", "success"); }} className="btn btn-square btn-outline border-[var(--border-color)]"><Copy size={18} /></button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* --- NEW: EMPLOYEE INSIGHTS MODAL --- */}
            {selectedMember && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade">
                    <div className="bg-[var(--bg-surface)] w-full max-w-lg rounded-2xl shadow-2xl border border-[var(--border-color)] flex flex-col overflow-hidden animate-pop">
                        <div className="p-5 border-b border-[var(--border-color)] flex justify-between items-center bg-[var(--bg-subtle)]">
                            <div>
                                <h2 className="text-lg font-black text-[var(--text-main)]">{selectedMember.full_name || 'Staff'}</h2>
                                <p className="text-xs text-[var(--text-muted)] font-bold uppercase tracking-wider">Performance Report</p>
                            </div>
                            <button onClick={() => setSelectedMember(null)} className="btn btn-sm btn-circle btn-ghost"><X size={20} /></button>
                        </div>

                        <div className="p-6 overflow-y-auto max-h-[70vh]">
                            {statsLoading ? (
                                <div className="py-10 text-center"><span className="loading loading-spinner text-primary"></span></div>
                            ) : memberStats ? (
                                <div className="space-y-6">
                                    {/* Stats Grid */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-100 dark:border-emerald-800">
                                            <div className="text-xs font-bold uppercase text-emerald-700 dark:text-emerald-400 mb-1">Revenue</div>
                                            <div className="text-2xl font-black text-emerald-800 dark:text-emerald-200">{formatCurrency(memberStats.revenue)}</div>
                                        </div>
                                        <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border border-indigo-100 dark:border-indigo-800">
                                            <div className="text-xs font-bold uppercase text-indigo-700 dark:text-indigo-400 mb-1">Completed Jobs</div>
                                            <div className="text-2xl font-black text-indigo-800 dark:text-indigo-200">{memberStats.completed}</div>
                                        </div>
                                    </div>

                                    {/* Activity Log */}
                                    <div>
                                        <h3 className="text-xs font-bold uppercase text-[var(--text-muted)] tracking-wider mb-3 flex items-center gap-2">
                                            <Clock size={14} /> Recent Activity
                                        </h3>
                                        <div className="space-y-2">
                                            {memberStats.recentActivity && memberStats.recentActivity.length > 0 ? (
                                                memberStats.recentActivity.map(log => (
                                                    <div key={log.id} className="text-sm p-3 bg-[var(--bg-subtle)] rounded-lg border border-[var(--border-color)]">
                                                        <div className="font-medium text-[var(--text-main)]">{log.details}</div>
                                                        <div className="text-xs text-[var(--text-muted)] mt-1 flex justify-between">
                                                            <span className="uppercase font-bold">{log.action}</span>
                                                            <span>{format(new Date(log.created_at), 'MMM d, h:mm a')}</span>
                                                        </div>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="text-center py-6 text-sm text-[var(--text-muted)] italic bg-[var(--bg-subtle)] rounded-lg">
                                                    No recent activity found.
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center text-red-500">Failed to load data.</div>
                            )}
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}