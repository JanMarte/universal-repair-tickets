import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import {
    User, Phone, Mail, Calendar,
    ArrowLeft, Plus, Clock, Wrench, DollarSign,
    ChevronRight, History, Star, AlertCircle, Eye, EyeOff, Hash, SlidersHorizontal, Moon, Sun
} from 'lucide-react';

import { supabase } from '../supabaseClient';
import { formatPhoneNumber, formatCurrency, maskEmail, maskPhone } from '../utils';
import IntakeModal from '../components/IntakeModal';
import TicketCard from '../components/TicketCard';

export default function CustomerHistory() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [customer, setCustomer] = useState(null);
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');

    const [isIntakeOpen, setIsIntakeOpen] = useState(false);
    const [isPrivacyMode, setIsPrivacyMode] = useState(true);
    const [filterStatus, setFilterStatus] = useState('ALL');
    const [sortBy, setSortBy] = useState('NEWEST');

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        if (theme === 'dark') document.documentElement.classList.add('dark');
        else document.documentElement.classList.remove('dark');
        localStorage.setItem('theme', theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme(prev => prev === 'light' ? 'dark' : 'light');
    };

    useEffect(() => {
        fetchData();
    }, [id]);

    async function fetchData() {
        setLoading(true);
        const { data: customerData } = await supabase.from('customers').select('*').eq('id', id).single();
        setCustomer(customerData);

        const { data: ticketData } = await supabase.from('tickets').select('*').eq('customer_id', id).order('created_at', { ascending: false });
        setTickets(ticketData || []);
        setLoading(false);
    }

    const totalSpent = tickets.reduce((sum, t) => sum + (t.estimate_total || 0), 0);
    const activeTicketsCount = tickets.filter(t => t.status !== 'completed' && t.status !== 'picked_up').length;

    const processedTickets = tickets.filter(t => {
        if (filterStatus === 'ACTIVE') return t.status !== 'completed' && t.status !== 'picked_up';
        if (filterStatus === 'COMPLETED') return t.status === 'completed' || t.status === 'picked_up';
        return true;
    }).sort((a, b) => {
        if (sortBy === 'OLDEST') return new Date(a.created_at) - new Date(b.created_at);
        if (sortBy === 'PRICE_DESC') return (b.estimate_total || 0) - (a.estimate_total || 0);
        return new Date(b.created_at) - new Date(a.created_at);
    });

    const getInitials = (name) => {
        if (!name) return '??';
        const parts = name.trim().split(' ');
        if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
        return name.substring(0, 2).toUpperCase();
    };

    if (loading) return <div className="flex justify-center py-20"><span className="loading loading-spinner loading-lg text-indigo-500"></span></div>;
    if (!customer) return <div className="p-10 text-center font-bold text-[var(--text-muted)]">Customer not found.</div>;

    return (
        /* REMOVED bg-[var(--bg-subtle)] here */
        <div className="min-h-screen p-4 md:p-6 font-sans pb-24 transition-colors duration-300">
            <div className="max-w-7xl mx-auto space-y-6">

                {/* --- PREMIUM NAVBAR --- */}
                {/* REMOVED /90 from bg-[var(--bg-surface)] */}
                <div className="navbar rounded-2xl sticky top-2 z-40 flex justify-between shadow-sm bg-[var(--bg-surface)] border border-[var(--border-color)] px-4 py-3 animate-fade-in-up">

                    <div className="flex items-center gap-2">
                        <button onClick={() => navigate(-1)} className="btn btn-sm btn-ghost gap-2 px-3 text-[var(--text-muted)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-main)] transition-all rounded-lg group">
                            <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform duration-300" />
                            <span className="hidden sm:inline font-bold">Back</span>
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

                    <div className="flex items-center gap-2 md:gap-3">
                        <button
                            onClick={toggleTheme}
                            className="w-10 h-10 flex items-center justify-center rounded-full bg-[var(--bg-subtle)] border border-[var(--border-color)] shadow-inner text-[var(--text-muted)] hover:text-indigo-500 transition-colors"
                            title="Toggle Theme"
                        >
                            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
                        </button>

                        <div className="h-6 w-px bg-[var(--border-color)] mx-1 hidden sm:block"></div>

                        <button onClick={() => setIsIntakeOpen(true)} className="btn btn-sm h-10 bg-indigo-600 hover:bg-indigo-700 text-white border-none shadow-md shadow-indigo-500/30 transition-all gap-2 px-4 rounded-xl hover:scale-105">
                            <Plus size={16} strokeWidth={3} /> <span className="hidden sm:inline font-bold">New Repair</span>
                        </button>
                    </div>
                </div>

                {/* --- CUSTOMER PROFILE CARD --- */}
                <div className="bg-[var(--bg-surface)] rounded-3xl border border-[var(--border-color)] p-6 md:p-8 shadow-sm relative overflow-hidden animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
                    <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                    <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>

                    <div className="flex flex-col md:flex-row gap-6 items-start md:items-center relative z-10 pt-2">
                        <div className="w-20 h-20 rounded-2xl bg-[var(--bg-subtle)] border border-[var(--border-color)] shadow-inner flex items-center justify-center text-3xl font-black text-indigo-600 dark:text-indigo-400 flex-none">
                            {getInitials(customer.full_name)}
                        </div>

                        <div className="flex-1 w-full min-w-0">
                            <div className="flex justify-between items-start mb-3">
                                <h1 className="text-2xl md:text-3xl font-black text-[var(--text-main)] tracking-tight truncate pr-4">
                                    {customer.full_name || 'Unnamed Client'}
                                </h1>
                                <button
                                    onClick={() => setIsPrivacyMode(!isPrivacyMode)}
                                    className="btn btn-sm btn-ghost gap-2 text-[var(--text-muted)] border border-[var(--border-color)] hover:bg-[var(--bg-subtle)] hover:text-indigo-600 dark:hover:text-indigo-400 transition-all rounded-lg flex-none"
                                >
                                    {isPrivacyMode ? <Eye size={16} /> : <EyeOff size={16} />}
                                    <span className="text-xs hidden sm:inline font-bold">{isPrivacyMode ? 'Show Info' : 'Hide Info'}</span>
                                </button>
                            </div>

                            <div className="flex flex-wrap gap-3 text-sm font-medium">
                                <div className="flex items-center gap-2 text-xs font-bold text-[var(--text-muted)] bg-[var(--bg-subtle)] px-3 py-1.5 rounded-md shadow-inner border border-[var(--border-color)] truncate max-w-xs">
                                    <Mail size={14} className="text-indigo-500 flex-none" />
                                    <span className="truncate">{isPrivacyMode ? maskEmail(customer.email) : (customer.email || 'No email')}</span>
                                </div>
                                <div className="flex items-center gap-2 text-xs font-bold text-[var(--text-muted)] bg-[var(--bg-subtle)] px-3 py-1.5 rounded-md shadow-inner border border-[var(--border-color)] tracking-widest font-mono flex-none">
                                    <Phone size={14} className="text-emerald-500" />
                                    {isPrivacyMode ? maskPhone(customer.phone) : formatPhoneNumber(customer.phone)}
                                </div>
                                <div className="flex items-center gap-2 text-xs font-bold text-[var(--text-muted)] bg-[var(--bg-subtle)] px-3 py-1.5 rounded-md shadow-inner border border-[var(--border-color)] uppercase tracking-wider flex-none">
                                    <Calendar size={14} className="text-amber-500" /> Joined {customer.created_at ? format(new Date(customer.created_at), 'MMM yyyy') : 'N/A'}
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3 w-full md:w-auto flex-none">
                            <div className="text-center px-5 py-3 bg-[var(--bg-subtle)] rounded-xl border border-[var(--border-color)] shadow-inner flex-1 md:flex-none">
                                <div className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-1">Lifetime Spend</div>
                                <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 leading-none">{formatCurrency(totalSpent)}</div>
                            </div>
                            <div className="text-center px-5 py-3 bg-[var(--bg-subtle)] rounded-xl border border-[var(--border-color)] shadow-inner flex-1 md:flex-none">
                                <div className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-1">Total Repairs</div>
                                <div className="text-2xl font-black text-[var(--text-main)] leading-none">{tickets.length}</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* --- LAYOUT GRID --- */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>

                    {/* LEFT: TICKET HISTORY */}
                    <div className="lg:col-span-2 space-y-4">

                        {/* RESPONSIVE HEADER & CONTROLS */}
                        <div className="flex flex-wrap items-center justify-between gap-3 mb-4 mt-2">
                            <h2 className="text-[10px] md:text-xs font-black uppercase tracking-widest text-[var(--text-muted)] flex items-center gap-2">
                                <History size={16} className="text-indigo-500" /> Repair History
                            </h2>

                            <div className="flex items-center gap-2 md:gap-3">
                                {/* Segmented Status Filter */}
                                <div className="flex bg-[var(--bg-subtle)] p-0.5 md:p-1 rounded-lg shadow-inner border border-[var(--border-color)]">
                                    <button
                                        onClick={() => setFilterStatus('ALL')}
                                        className={`px-2.5 md:px-3.5 py-1 md:py-1.5 text-[9px] md:text-[10px] font-black uppercase tracking-wider rounded-md transition-all ${filterStatus === 'ALL' ? 'bg-[var(--bg-surface)] text-indigo-600 shadow-sm ring-1 ring-black/5 dark:ring-white/5' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}
                                    >All</button>
                                    <button
                                        onClick={() => setFilterStatus('ACTIVE')}
                                        className={`px-2.5 md:px-3.5 py-1 md:py-1.5 text-[9px] md:text-[10px] font-black uppercase tracking-wider rounded-md transition-all ${filterStatus === 'ACTIVE' ? 'bg-[var(--bg-surface)] text-indigo-600 shadow-sm ring-1 ring-black/5 dark:ring-white/5' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}
                                    >Active</button>
                                    <button
                                        onClick={() => setFilterStatus('COMPLETED')}
                                        className={`px-2.5 md:px-3.5 py-1 md:py-1.5 text-[9px] md:text-[10px] font-black uppercase tracking-wider rounded-md transition-all ${filterStatus === 'COMPLETED' ? 'bg-[var(--bg-surface)] text-indigo-600 shadow-sm ring-1 ring-black/5 dark:ring-white/5' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}
                                    >Done</button>
                                </div>

                                {/* Sort Dropdown */}
                                <div className="relative">
                                    <SlidersHorizontal className="w-3 h-3 md:w-3.5 md:h-3.5 absolute left-2.5 md:left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none" />
                                    <select
                                        value={sortBy}
                                        onChange={(e) => setSortBy(e.target.value)}
                                        className="h-7 md:h-8 pl-7 md:pl-8 pr-6 md:pr-8 py-0 text-[9px] md:text-[10px] font-black uppercase tracking-widest bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-lg text-[var(--text-muted)] hover:text-[var(--text-main)] shadow-sm focus:border-indigo-500 focus:outline-none appearance-none cursor-pointer transition-colors"
                                    >
                                        <option value="NEWEST">Newest</option>
                                        <option value="OLDEST">Oldest</option>
                                        <option value="PRICE_DESC">Highest Price</option>
                                    </select>
                                    <div className="absolute right-2 md:right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--text-muted)]">
                                        <svg className="w-2.5 h-2.5 md:w-3 md:h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {processedTickets.length === 0 ? (
                            <div className="bg-[var(--bg-surface)] rounded-[32px] border-2 border-dashed border-[var(--border-color)] p-12 text-center shadow-sm">
                                <div className="w-20 h-20 bg-[var(--bg-subtle)] rounded-full flex items-center justify-center mx-auto mb-5 border border-[var(--border-color)] shadow-inner">
                                    <Wrench size={32} className="text-[var(--text-muted)] opacity-50" />
                                </div>
                                <h3 className="font-black text-xl tracking-tight text-[var(--text-main)] mb-2">No tickets found</h3>
                                <p className="text-sm font-medium text-[var(--text-muted)] max-w-sm mx-auto">
                                    Adjust your filters above, or click "New Repair" to check in a device for this customer.
                                </p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                                {processedTickets.map(ticket => (
                                    <TicketCard key={ticket.id} ticket={ticket} />
                                ))}
                            </div>
                        )}
                    </div>

                    {/* RIGHT: CUSTOMER INSIGHTS */}
                    <div className="space-y-6">
                        <div className="bg-[var(--bg-surface)] rounded-3xl border border-[var(--border-color)] p-6 shadow-sm relative overflow-hidden">
                            <h3 className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-5 flex items-center gap-2">
                                <Star size={16} className="text-amber-500" /> Insights & Averages
                            </h3>

                            <div className="space-y-4">
                                <div className="flex items-center gap-4 p-4 bg-[var(--bg-subtle)] rounded-2xl border border-[var(--border-color)] shadow-inner">
                                    <div className="w-12 h-12 flex items-center justify-center bg-[var(--bg-surface)] rounded-xl shadow-sm border border-[var(--border-color)] flex-none">
                                        <DollarSign size={20} className="text-indigo-500" />
                                    </div>
                                    <div>
                                        <div className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-0.5">Avg. Ticket Cost</div>
                                        <div className="text-lg font-black text-[var(--text-main)] leading-none">
                                            {formatCurrency(tickets.length > 0 ? totalSpent / tickets.length : 0)}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4 p-4 bg-[var(--bg-subtle)] rounded-2xl border border-[var(--border-color)] shadow-inner">
                                    <div className="w-12 h-12 flex items-center justify-center bg-[var(--bg-surface)] rounded-xl shadow-sm border border-[var(--border-color)] flex-none">
                                        <Wrench size={20} className="text-emerald-500" />
                                    </div>
                                    <div>
                                        <div className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-0.5">Active Jobs</div>
                                        <div className="text-lg font-black text-[var(--text-main)] leading-none flex items-center gap-2">
                                            {activeTicketsCount} <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mt-1">In Progress</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="border-2 border-dashed border-[var(--border-color)] rounded-3xl flex flex-col items-center justify-center p-8 text-[var(--text-muted)] bg-[var(--bg-subtle)] shadow-inner opacity-70 cursor-not-allowed">
                            <AlertCircle size={28} className="mb-2 opacity-50" />
                            <span className="font-black text-[10px] uppercase tracking-widest">Private Notes</span>
                            <span className="text-xs font-medium opacity-70 mt-1">Feature coming soon</span>
                        </div>
                    </div>

                </div>

            </div>

            {/* MODAL */}
            {isIntakeOpen && (
                <IntakeModal
                    isOpen={true}
                    onClose={() => setIsIntakeOpen(false)}
                    onTicketCreated={() => {
                        setIsIntakeOpen(false);
                        fetchData(); // Refresh list to show new ticket immediately
                    }}
                    initialCustomer={customer} // Pass the current customer to auto-fill
                />
            )}

        </div>
    );
}