import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { ArrowLeft, Shield, User, Briefcase, Calendar, Mail, Search, UserPlus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../context/ToastProvider';
import { format } from 'date-fns';

export default function Team() {
    const [teamMembers, setTeamMembers] = useState([]);
    const [loading, setLoading] = useState(true);

    // Search State
    const [searchEmail, setSearchEmail] = useState('');
    const [foundUser, setFoundUser] = useState(null);
    const [searchLoading, setSearchLoading] = useState(false);

    const navigate = useNavigate();
    const { addToast } = useToast();

    useEffect(() => { fetchTeam(); }, []);

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

        if (error) {
            console.error(error);
            addToast("Database error while searching", "error");
        } else if (!data) {
            addToast("User not found.", "error");
        } else {
            if (['admin', 'manager', 'employee'].includes(data.role)) {
                addToast("This user is already on the team list below.", "info");
            } else {
                setFoundUser(data);
            }
        }
        setSearchLoading(false);
    }

    const handleRoleChange = async (userId, newRole) => {
        const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', userId);
        if (error) addToast("Error updating role", "error");
        else {
            addToast(`User updated to ${newRole}`, "success");
            setFoundUser(null);
            setSearchEmail('');
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

    // --- UPDATED CARD STYLING ---
    const UserCard = ({ user, isSearchResult = false }) => (
        <div className={`p-5 rounded-2xl border flex flex-col justify-between h-full transition-all 
        ${isSearchResult
                ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800 shadow-md scale-100'
                : 'bg-[var(--bg-surface)] border-[var(--border-color)] shadow-sm hover:shadow-md'
            }`}>
            <div>
                <div className="flex justify-between items-start mb-4">
                    <div className={`p-3 rounded-xl ${user.role === 'admin' ? 'bg-purple-50 text-purple-600' : 'bg-[var(--bg-subtle)] text-[var(--text-muted)]'}`}>
                        {user.role === 'admin' ? <Shield size={24} /> : user.role === 'manager' ? <Briefcase size={24} /> : <User size={24} />}
                    </div>
                    <span className={`badge border font-bold uppercase text-[10px] tracking-wider py-3 ${getRoleBadge(user.role)}`}>
                        {user.role}
                    </span>
                </div>

                <div className="mb-6 space-y-2">
                    <div className="flex items-center gap-2 text-[var(--text-main)] font-bold truncate">
                        <Mail size={16} className="text-[var(--text-muted)] flex-shrink-0" />
                        <span className="truncate" title={user.email}>{user.email}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] font-medium">
                        <Calendar size={14} />
                        Joined {format(new Date(user.created_at), 'MMM d, yyyy')}
                    </div>
                </div>
            </div>

            <div className="pt-4 border-t border-[var(--border-color)] flex gap-2 justify-end">
                {user.role === 'customer' && (
                    <button onClick={() => handleRoleChange(user.id, 'employee')} className="btn btn-sm btn-primary w-full shadow-lg">Promote to Staff</button>
                )}

                {user.role === 'employee' && (
                    <>
                        <button onClick={() => handleRoleChange(user.id, 'customer')} className="btn btn-sm btn-ghost text-red-500 flex-1">Remove</button>
                        <button onClick={() => handleRoleChange(user.id, 'manager')} className="btn btn-sm btn-ghost text-indigo-600 flex-1 bg-indigo-50 dark:bg-indigo-900/20">Make Manager</button>
                    </>
                )}

                {user.role === 'manager' && (
                    <button onClick={() => handleRoleChange(user.id, 'employee')} className="btn btn-sm btn-ghost text-orange-500 w-full hover:bg-orange-50 dark:hover:bg-orange-900/20">Demote to Employee</button>
                )}
                {user.role === 'admin' && (
                    <span className="text-xs font-bold text-[var(--text-muted)] italic py-2 text-center w-full bg-[var(--bg-subtle)] rounded-lg">
                        System Administrator
                    </span>
                )}
            </div>
        </div>
    );

    return (
        <div className="min-h-screen p-6 font-sans">

            <div className="rounded-2xl p-6 mb-8 flex items-center gap-4 bg-[var(--bg-surface)] border border-[var(--border-color)] shadow-sm">
                <button onClick={() => navigate('/dashboard')} className="btn btn-circle btn-ghost"><ArrowLeft /></button>
                <div>
                    <h1 className="text-2xl font-black text-[var(--text-main)]">Team Management</h1>
                    <p className="text-sm text-[var(--text-muted)]">Only active staff members are shown below.</p>
                </div>
            </div>

            <div className="mb-10">
                <h2 className="text-xs font-bold uppercase text-[var(--text-muted)] tracking-wider mb-4 flex items-center gap-2">
                    <UserPlus size={16} /> Hire New Staff
                </h2>
                <div className="bg-[var(--bg-surface)] p-6 rounded-2xl border border-[var(--border-color)] shadow-sm max-w-3xl">
                    <div className="flex flex-col md:flex-row gap-4 items-start">
                        <form onSubmit={handleSearch} className="flex-1 w-full flex gap-2">
                            <input
                                type="email"
                                placeholder="Enter new employee's email"
                                className="input input-bordered w-full font-medium bg-[var(--bg-surface)] text-[var(--text-main)]"
                                value={searchEmail}
                                onChange={(e) => setSearchEmail(e.target.value)}
                            />
                            <button type="submit" className="btn btn-neutral" disabled={searchLoading}>
                                {searchLoading ? <span className="loading loading-spinner"></span> : <Search size={18} />}
                            </button>
                        </form>
                    </div>

                    {foundUser && (
                        <div className="mt-6 animate-fade">
                            <div className="text-sm font-bold text-green-600 dark:text-green-400 mb-2">User Found:</div>
                            <div className="max-w-md">
                                <UserCard user={foundUser} isSearchResult={true} />
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div>
                <h2 className="text-xs font-bold uppercase text-[var(--text-muted)] tracking-wider mb-4 flex items-center gap-2">
                    <Briefcase size={16} /> Active Roster
                </h2>
                {loading ? (
                    <div className="flex justify-center mt-10"><span className="loading loading-spinner loading-lg text-primary"></span></div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {teamMembers.map(user => (
                            <UserCard key={user.id} user={user} />
                        ))}
                        {teamMembers.length === 0 && (
                            <div className="col-span-full text-center p-10 text-[var(--text-muted)] bg-[var(--bg-subtle)] rounded-xl border-dashed border-2 border-[var(--border-color)]">
                                No other staff members found. Use the search bar above to promote customers.
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}