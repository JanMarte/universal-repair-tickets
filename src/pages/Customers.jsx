import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import { Search, User, Phone, Mail, ChevronRight, Users, ArrowLeft, Hash, Calendar, Wrench, Moon, Sun, Package } from 'lucide-react';
import { formatPhoneNumber, maskPhone, maskEmail } from '../utils';
import { format } from 'date-fns';
import { useToast } from '../context/ToastProvider';

export default function Customers() {
    const navigate = useNavigate();
    const { addToast } = useToast();
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');

    // --- THEME MANAGEMENT ---
    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        if (theme === 'dark') document.documentElement.classList.add('dark');
        else document.documentElement.classList.remove('dark');
        localStorage.setItem('theme', theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme(prev => prev === 'light' ? 'dark' : 'light');
    };

    // --- FETCH CUSTOMERS ---
    useEffect(() => {
        fetchCustomers();
    }, []);

    async function fetchCustomers() {
        setLoading(true);
        const { data, error } = await supabase
            .from('customers')
            .select(`*, tickets ( id, status )`)
            .order('full_name', { ascending: true });

        if (error) {
            console.error('Error fetching customers:', error);
            addToast("Failed to load customer database.", "error");
        } else {
            setCustomers(data || []);
        }
        setLoading(false);
    }

    // --- CLIENT SIDE FILTERING ---
    const filteredCustomers = customers.filter(c => {
        const search = searchTerm.toLowerCase();
        return (
            (c.full_name && c.full_name.toLowerCase().includes(search)) ||
            (c.email && c.email.toLowerCase().includes(search)) ||
            (c.phone && c.phone.includes(search))
        );
    });

    const getInitials = (name) => {
        if (!name) return '??';
        const parts = name.trim().split(' ');
        if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
        return name.substring(0, 2).toUpperCase();
    };

    return (
        /* REMOVED bg-[var(--bg-subtle)] here so it uses the Dashboard background */
        <div className="min-h-screen p-4 md:p-6 font-sans transition-colors duration-300 pb-24">
            <div className="max-w-7xl mx-auto space-y-6">

                {/* --- PREMIUM NAVBAR --- */}
                {/* REMOVED /90 from bg-[var(--bg-surface)] to fix the flat gray bug */}
                <div className="navbar rounded-2xl sticky top-2 z-40 flex justify-between shadow-sm bg-[var(--bg-surface)] border border-[var(--border-color)] px-4 py-3 animate-fade-in-up">

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
                        <div className="hidden sm:flex items-center gap-2 bg-[var(--bg-subtle)] px-3 py-1.5 rounded-md shadow-inner border border-[var(--border-color)] mr-2">
                            <Users size={14} className="text-indigo-500" />
                            <span className="font-black text-[10px] text-[var(--text-main)] uppercase tracking-widest">
                                {filteredCustomers.length} Found
                            </span>
                        </div>
                        <button
                            onClick={toggleTheme}
                            className="w-10 h-10 flex items-center justify-center rounded-full bg-[var(--bg-subtle)] border border-[var(--border-color)] shadow-inner text-[var(--text-muted)] hover:text-indigo-500 transition-colors"
                            title="Toggle Theme"
                        >
                            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
                        </button>
                    </div>
                </div>

                {/* --- HEADER & SEARCH --- */}
                <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-3xl p-6 md:p-8 shadow-sm animate-fade-in-up relative overflow-hidden z-10" style={{ animationDelay: '0.1s' }}>
                    <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>

                    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                        <div>
                            <h1 className="text-3xl font-black text-[var(--text-main)] tracking-tight flex items-center gap-3 mb-2">
                                <Users className="text-indigo-600" size={32} />
                                Customer Database
                            </h1>
                            <p className="text-sm font-bold text-[var(--text-muted)]">
                                View histories, contact details, and manage client profiles.
                            </p>
                        </div>

                        <div className="w-full lg:w-96">
                            <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-1.5 block pl-1">
                                Global Search
                            </label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[var(--text-muted)] group-focus-within:text-indigo-500 transition-colors">
                                    <Search size={18} />
                                </div>
                                <input
                                    type="text"
                                    placeholder="Search name, phone, or email..."
                                    className="input input-bordered w-full h-12 pl-12 bg-[var(--bg-subtle)] focus:bg-[var(--bg-surface)] text-[var(--text-main)] font-medium shadow-inner transition-all focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 text-sm rounded-xl"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* --- CUSTOMER GRID --- */}
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <span className="loading loading-spinner loading-lg text-indigo-500 mb-4"></span>
                        <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] animate-pulse">Loading Database...</span>
                    </div>
                ) : filteredCustomers.length === 0 ? (
                    <div className="text-center py-24 bg-[var(--bg-surface)] border-2 border-dashed border-[var(--border-color)] rounded-3xl shadow-sm animate-fade-in">
                        <User size={48} className="mx-auto text-[var(--text-muted)] mb-4 opacity-50" />
                        <h3 className="text-xl font-black text-[var(--text-main)] tracking-tight mb-2">No customers found</h3>
                        <p className="text-sm font-medium text-[var(--text-muted)]">
                            Try adjusting your search terms.
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
                        {filteredCustomers.map((customer) => {
                            const activeTickets = customer.tickets?.filter(t => t.status !== 'completed').length || 0;
                            const totalTickets = customer.tickets?.length || 0;

                            return (
                                <div
                                    key={customer.id}
                                    onClick={() => navigate(`/customer/${customer.id}`)}
                                    className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-color)] shadow-sm hover:shadow-xl hover:border-indigo-300 dark:hover:border-indigo-700 transition-all cursor-pointer group relative overflow-hidden flex flex-col hover:-translate-y-1"
                                >
                                    <div className="absolute top-0 left-0 w-full h-1 bg-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                    <div className="p-6">
                                        <div className="flex items-center gap-4 mb-5">
                                            <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xl font-black shadow-inner border border-indigo-100 dark:border-indigo-800/50 group-hover:scale-105 transition-transform flex-none">
                                                {getInitials(customer.full_name)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h3 className="text-lg font-black text-[var(--text-main)] truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                                    {customer.full_name || 'Unnamed Client'}
                                                </h3>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded shadow-sm border ${activeTickets > 0 ? 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800' : 'bg-[var(--bg-subtle)] text-[var(--text-muted)] border-[var(--border-color)]'}`}>
                                                        {activeTickets > 0 ? `${activeTickets} Active Repairs` : 'No Active Repairs'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-3 bg-[var(--bg-subtle)] p-4 rounded-xl border border-[var(--border-color)] shadow-inner">
                                            <div className="flex items-center gap-3 text-sm font-medium text-[var(--text-main)]">
                                                <div className="w-8 h-8 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-color)] shadow-sm flex items-center justify-center text-[var(--text-muted)] flex-none">
                                                    <Phone size={14} />
                                                </div>
                                                <span className="font-mono tracking-wide truncate">{customer.phone ? maskPhone(customer.phone) : 'N/A'}</span>
                                            </div>
                                            <div className="flex items-center gap-3 text-sm font-medium text-[var(--text-main)]">
                                                <div className="w-8 h-8 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-color)] shadow-sm flex items-center justify-center text-[var(--text-muted)] flex-none">
                                                    <Mail size={14} />
                                                </div>
                                                <span className="truncate">{customer.email ? maskEmail(customer.email) : 'No email provided'}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="px-6 py-4 border-t border-dashed border-[var(--border-color)] bg-[var(--bg-surface)] flex justify-between items-center mt-auto">
                                        <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">
                                            <Package size={12} /> {totalTickets} Total {totalTickets === 1 ? 'Ticket' : 'Tickets'}
                                        </div>
                                        <div className="text-indigo-600 dark:text-indigo-400 font-bold flex items-center gap-1 text-sm group-hover:translate-x-1 transition-transform">
                                            View Profile <ChevronRight size={16} />
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}