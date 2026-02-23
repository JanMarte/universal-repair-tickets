import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { Shield, ShieldAlert, User, Mail, PlusCircle, MoreVertical, X, CheckCircle, Award, Star } from 'lucide-react';
import { useToast } from '../context/ToastProvider';

export default function Team() {
    const [team, setTeam] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentUser, setCurrentUser] = useState(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const { addToast } = useToast();

    useEffect(() => {
        fetchTeamData();
    }, []);

    async function fetchTeamData() {
        setLoading(true);

        // Get current user to check permissions
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
            setCurrentUser(profile);
        }

        // Fetch all staff members
        const { data: staff, error } = await supabase
            .from('profiles')
            .select('*')
            .in('role', ['admin', 'manager', 'employee'])
            .order('role', { ascending: true });

        if (error) {
            console.error("Error fetching team:", error);
            addToast("Failed to load team data", "error");
        } else {
            // Sort to ensure Admin is first, then Manager, then Employee
            const sortedStaff = (staff || []).sort((a, b) => {
                const ranks = { admin: 1, manager: 2, employee: 3 };
                return ranks[a.role] - ranks[b.role];
            });
            setTeam(sortedStaff);
        }
        setLoading(false);
    }

    const updateRole = async (memberId, newRole) => {
        if (currentUser?.role !== 'admin') {
            addToast("Only Administrators can change staff roles.", "error");
            return;
        }

        const { error } = await supabase
            .from('profiles')
            .update({ role: newRole })
            .eq('id', memberId);

        if (error) {
            addToast("Failed to update role", "error");
        } else {
            addToast("Role updated successfully", "success");
            setTeam(prev => prev.map(member =>
                member.id === memberId ? { ...member, role: newRole } : member
            ));
        }
    };

    const getRoleVisuals = (role) => {
        switch (role) {
            case 'admin': return { color: 'text-pink-500', bg: 'bg-pink-500', subBg: 'bg-pink-50 dark:bg-pink-900/20', border: 'border-pink-200 dark:border-pink-800', icon: <Star size={14} /> };
            case 'manager': return { color: 'text-amber-500', bg: 'bg-amber-500', subBg: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-amber-200 dark:border-amber-800', icon: <Shield size={14} /> };
            default: return { color: 'text-indigo-500', bg: 'bg-indigo-500', subBg: 'bg-indigo-50 dark:bg-indigo-900/20', border: 'border-indigo-200 dark:border-indigo-800', icon: <User size={14} /> };
        }
    };

    return (
        <div className="min-h-screen bg-[var(--bg-subtle)] p-4 md:p-6 font-sans transition-colors duration-300 pb-24">
            <div className="max-w-6xl mx-auto space-y-6">

                {/* HEADER */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 animate-fade-in-up">
                    <div>
                        <h1 className="text-3xl font-black text-[var(--text-main)] tracking-tight flex items-center gap-3">
                            <ShieldAlert className="text-indigo-600" size={32} />
                            Team Directory
                        </h1>
                        <p className="text-sm font-bold text-[var(--text-muted)] mt-1">
                            Manage staff access and roles.
                        </p>
                    </div>
                    {currentUser?.role === 'admin' && (
                        <button
                            onClick={() => setIsAddModalOpen(true)}
                            className="btn btn-gradient text-white shadow-lg shadow-indigo-500/30 border-none gap-2 px-6 hover:scale-105 transition-transform rounded-xl"
                        >
                            <PlusCircle size={18} strokeWidth={2.5} /> Provision Staff
                        </button>
                    )}
                </div>

                {/* TEAM GRID */}
                {loading ? (
                    <div className="flex justify-center py-20"><span className="loading loading-spinner loading-lg text-indigo-500"></span></div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
                        {team.map((member) => {
                            const visuals = getRoleVisuals(member.role);
                            const initials = member.full_name?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || member.email?.substring(0, 2).toUpperCase();

                            return (
                                <div key={member.id} className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-color)] shadow-sm hover:shadow-md transition-all group relative overflow-hidden flex flex-col h-full">
                                    {/* Top Color Bar */}
                                    <div className={`h-1.5 w-full ${visuals.bg}`}></div>

                                    <div className="p-6 flex-1 flex flex-col">
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="w-14 h-14 rounded-2xl bg-[var(--bg-subtle)] border border-[var(--border-color)] shadow-inner flex items-center justify-center text-xl font-black text-[var(--text-main)] group-hover:scale-105 transition-transform">
                                                {initials}
                                            </div>

                                            {/* Role Badge & Dropdown */}
                                            {currentUser?.role === 'admin' && member.id !== currentUser.id ? (
                                                <div className="dropdown dropdown-end">
                                                    <div tabIndex={0} role="button" className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-widest cursor-pointer shadow-sm border transition-colors ${visuals.subBg} ${visuals.color} ${visuals.border} hover:bg-[var(--bg-surface)]`}>
                                                        {visuals.icon} {member.role} <MoreVertical size={10} className="opacity-50 ml-1" />
                                                    </div>
                                                    <ul tabIndex={0} className="dropdown-content z-[1] menu p-2 shadow-2xl bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-xl w-40 mt-2 animate-pop">
                                                        <li className="menu-title text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] px-2 py-1">Change Role</li>
                                                        <li><button onClick={() => updateRole(member.id, 'employee')} className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 py-2"><User size={12} /> Employee</button></li>
                                                        <li><button onClick={() => updateRole(member.id, 'manager')} className="text-[10px] font-bold text-amber-600 dark:text-amber-400 py-2"><Shield size={12} /> Manager</button></li>
                                                        <li><button onClick={() => updateRole(member.id, 'admin')} className="text-[10px] font-bold text-pink-600 dark:text-pink-400 py-2"><Star size={12} /> Admin</button></li>
                                                    </ul>
                                                </div>
                                            ) : (
                                                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-widest shadow-sm border ${visuals.subBg} ${visuals.color} ${visuals.border}`}>
                                                    {visuals.icon} {member.role}
                                                </div>
                                            )}
                                        </div>

                                        <h3 className="text-lg font-black text-[var(--text-main)] truncate mb-1">
                                            {member.full_name || 'Pending Name'}
                                        </h3>
                                        <div className="flex items-center gap-2 text-xs font-medium text-[var(--text-muted)] mb-6 truncate">
                                            <Mail size={14} className="opacity-50 flex-none" /> {member.email}
                                        </div>

                                        {/* Status Recessed Area */}
                                        <div className="mt-auto bg-[var(--bg-subtle)] p-3 rounded-xl border border-[var(--border-color)] shadow-inner flex justify-between items-center">
                                            <span className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">Account Status</span>
                                            <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-emerald-500">
                                                <CheckCircle size={12} /> Active
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* --- ADD STAFF PROVISIONING MODAL --- */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity animate-fade-in" onClick={() => setIsAddModalOpen(false)}></div>
                    <div className="relative w-full max-w-lg bg-[var(--bg-surface)] rounded-3xl shadow-2xl border border-[var(--border-color)] flex flex-col overflow-hidden animate-pop">

                        <div className="p-6 border-b-2 border-dashed border-[var(--border-color)] flex justify-between items-center bg-[var(--bg-surface)]">
                            <div>
                                <h2 className="text-xl font-black text-[var(--text-main)] flex items-center gap-2 tracking-tight">
                                    <ShieldAlert size={22} className="text-indigo-600" /> Provision Staff Account
                                </h2>
                            </div>
                            <button onClick={() => setIsAddModalOpen(false)} className="btn btn-sm btn-circle btn-ghost text-[var(--text-muted)] hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6 space-y-6 bg-[var(--bg-subtle)]">
                            <div className="bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-200 dark:border-indigo-800/50 p-4 rounded-2xl shadow-sm text-sm font-medium text-[var(--text-main)] leading-relaxed">
                                To ensure maximum security and prevent unauthorized sign-ups, frontend account creation is permanently disabled. <br /><br />
                                <strong className="text-indigo-600 dark:text-indigo-400">Administrators must invite new employees via the backend console.</strong>
                            </div>

                            <div className="space-y-4">
                                <div className="flex gap-4">
                                    <div className="flex-none w-8 h-8 rounded-full bg-[var(--bg-surface)] border border-[var(--border-color)] shadow-sm flex items-center justify-center font-black text-indigo-600">1</div>
                                    <div>
                                        <h4 className="font-bold text-[var(--text-main)] mb-1">Open Supabase Dashboard</h4>
                                        <p className="text-xs text-[var(--text-muted)]">Log into your Supabase project, navigate to <strong>Authentication</strong>, and click the <strong>Users</strong> tab.</p>
                                    </div>
                                </div>
                                <div className="flex gap-4">
                                    <div className="flex-none w-8 h-8 rounded-full bg-[var(--bg-surface)] border border-[var(--border-color)] shadow-sm flex items-center justify-center font-black text-indigo-600">2</div>
                                    <div>
                                        <h4 className="font-bold text-[var(--text-main)] mb-1">Send Invite Email</h4>
                                        <p className="text-xs text-[var(--text-muted)]">Click the green <strong className="text-emerald-500">Add User</strong> button, select <strong>Invite User</strong>, and type the employee's email address.</p>
                                    </div>
                                </div>
                                <div className="flex gap-4">
                                    <div className="flex-none w-8 h-8 rounded-full bg-[var(--bg-surface)] border border-[var(--border-color)] shadow-sm flex items-center justify-center font-black text-indigo-600">3</div>
                                    <div>
                                        <h4 className="font-bold text-[var(--text-main)] mb-1">Assign Role</h4>
                                        <p className="text-xs text-[var(--text-muted)]">Once they click the email link and set a password, they will instantly appear on this page as an "Employee". You can then upgrade them to a Manager.</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-5 border-t-2 border-dashed border-[var(--border-color)] bg-[var(--bg-surface)] flex justify-end">
                            <button onClick={() => setIsAddModalOpen(false)} className="btn btn-gradient px-8 text-white font-bold border-none shadow-lg shadow-indigo-500/30 hover:scale-105 transition-transform">
                                Understood
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}