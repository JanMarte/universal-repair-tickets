import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import {
    User, Phone, Mail, Calendar,
    ArrowLeft, Plus, Clock, Wrench, DollarSign,
    ChevronRight, History, Star, AlertCircle, Eye, EyeOff, Hash, SlidersHorizontal
} from 'lucide-react';

import { supabase } from '../supabaseClient';
import { formatPhoneNumber, formatCurrency, maskEmail, maskPhone } from '../utils';
import IntakeModal from '../components/IntakeModal';

export default function CustomerHistory() {
    const { id } = useParams();
    const navigate = useNavigate();

    // Data State
    const [customer, setCustomer] = useState(null);
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);

    // UI State
    const [isIntakeOpen, setIsIntakeOpen] = useState(false);
    const [isPrivacyMode, setIsPrivacyMode] = useState(true);

    // History Filter & Sort State
    const [filterStatus, setFilterStatus] = useState('ALL'); // 'ALL', 'ACTIVE', 'COMPLETED'
    const [sortBy, setSortBy] = useState('NEWEST'); // 'NEWEST', 'OLDEST', 'PRICE_DESC'

    useEffect(() => {
        fetchData();
    }, [id]);

    async function fetchData() {
        const { data: customerData } = await supabase
            .from('customers')
            .select('*')
            .eq('id', id)
            .single();

        setCustomer(customerData);

        const { data: ticketData } = await supabase
            .from('tickets')
            .select('*')
            .eq('customer_id', id)
            .order('created_at', { ascending: false });

        setTickets(ticketData || []);
        setLoading(false);
    }

    // --- CALCULATE OVERALL STATS ---
    const totalSpent = tickets.reduce((sum, t) => sum + (t.estimate_total || 0), 0);
    const activeTicketsCount = tickets.filter(t => t.status !== 'completed' && t.status !== 'picked_up').length;

    // --- PROCESS TICKETS FOR DISPLAY ---
    const processedTickets = tickets.filter(t => {
        if (filterStatus === 'ACTIVE') return t.status !== 'completed' && t.status !== 'picked_up';
        if (filterStatus === 'COMPLETED') return t.status === 'completed' || t.status === 'picked_up';
        return true;
    }).sort((a, b) => {
        if (sortBy === 'OLDEST') return new Date(a.created_at) - new Date(b.created_at);
        if (sortBy === 'PRICE_DESC') return (b.estimate_total || 0) - (a.estimate_total || 0);
        return new Date(b.created_at) - new Date(a.created_at); // NEWEST default
    });


    const getInitials = (name) => {
        if (!name) return '??';
        const parts = name.trim().split(' ');
        if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
        return name.substring(0, 2).toUpperCase();
    };

    const getStatusTheme = (status, isBackordered) => {
        if (isBackordered) return { border: 'border-l-red-500', pill: 'bg-red-500 text-white shadow-md shadow-red-500/30' };
        switch (status) {
            case 'intake': return { border: 'border-l-blue-500', pill: 'bg-blue-500 text-white shadow-md shadow-blue-500/30' };
            case 'diagnosing': return { border: 'border-l-purple-500', pill: 'bg-purple-500 text-white shadow-md shadow-purple-500/30' };
            case 'waiting_parts': return { border: 'border-l-orange-500', pill: 'bg-orange-500 text-white shadow-md shadow-orange-500/30' };
            case 'repairing': return { border: 'border-l-amber-500', pill: 'bg-amber-500 text-white shadow-md shadow-amber-500/30' };
            case 'ready_pickup': return { border: 'border-l-emerald-500', pill: 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30' };
            case 'completed': return { border: 'border-l-slate-500', pill: 'bg-slate-500 text-white shadow-md shadow-slate-500/30' };
            default: return { border: 'border-l-indigo-500', pill: 'bg-indigo-500 text-white shadow-md shadow-indigo-500/30' };
        }
    };

    if (loading) return <div className="flex justify-center mt-20"><span className="loading loading-spinner loading-lg text-indigo-500"></span></div>;
    if (!customer) return <div className="p-10 text-center font-bold text-[var(--text-muted)]">Customer not found.</div>;

    return (
        <div className="min-h-screen p-4 md:p-6 font-sans pb-24 transition-colors duration-300">

            {/* NAVBAR */}
            <div className="navbar rounded-2xl mb-6 sticky top-2 z-40 flex justify-between shadow-sm backdrop-blur-md bg-[var(--bg-surface)] border border-[var(--border-color)] px-3 py-2 animate-fade">
                <div className="flex items-center">
                    <button onClick={() => navigate(-1)} className="btn btn-sm btn-ghost gap-2 text-[var(--text-muted)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-main)] transition-colors rounded-lg">
                        <ArrowLeft size={18} /> <span className="hidden md:inline font-bold">Back</span>
                    </button>
                </div>
                <div className="flex-none">
                    <button onClick={() => setIsIntakeOpen(true)} className="btn btn-sm btn-gradient text-white gap-2 shadow-lg shadow-indigo-500/30 hover:scale-105 border-none transition-all px-4 rounded-full">
                        <Plus size={16} strokeWidth={3} /> <span className="font-bold tracking-wide">New Repair</span>
                    </button>
                </div>
            </div>

            {/* --- CUSTOMER PROFILE CARD --- */}
            <div className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-color)] p-6 md:p-8 shadow-sm mb-8 relative overflow-hidden animate-fade-in-up">
                <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>

                <div className="flex flex-col md:flex-row gap-6 items-start md:items-center relative z-10">
                    <div className="w-20 h-20 rounded-2xl bg-[var(--bg-subtle)] border border-[var(--border-color)] shadow-inner flex items-center justify-center text-3xl font-black text-indigo-600 dark:text-indigo-400">
                        {getInitials(customer.full_name)}
                    </div>

                    <div className="flex-1 w-full">
                        <div className="flex justify-between items-start mb-3">
                            <h1 className="text-2xl md:text-3xl font-black text-[var(--text-main)] tracking-tight">
                                {customer.full_name}
                            </h1>
                            <button
                                onClick={() => setIsPrivacyMode(!isPrivacyMode)}
                                className="btn btn-sm btn-ghost gap-2 text-[var(--text-muted)] border border-[var(--border-color)] hover:bg-[var(--bg-subtle)] hover:text-indigo-600 dark:hover:text-indigo-400 transition-all rounded-lg"
                            >
                                {isPrivacyMode ? <Eye size={16} /> : <EyeOff size={16} />}
                                <span className="text-xs hidden sm:inline font-bold">{isPrivacyMode ? 'Show Info' : 'Hide Info'}</span>
                            </button>
                        </div>

                        <div className="flex flex-wrap gap-3 text-sm font-medium">
                            <div className="flex items-center gap-2 text-xs font-bold text-[var(--text-muted)] bg-[var(--bg-subtle)] px-3 py-1.5 rounded-md shadow-inner border border-[var(--border-color)]">
                                <Mail size={14} className="text-indigo-500" />
                                {isPrivacyMode ? maskEmail(customer.email) : (customer.email || 'No email')}
                            </div>
                            <div className="flex items-center gap-2 text-xs font-bold text-[var(--text-muted)] bg-[var(--bg-subtle)] px-3 py-1.5 rounded-md shadow-inner border border-[var(--border-color)] tracking-widest font-mono">
                                <Phone size={14} className="text-emerald-500" />
                                {isPrivacyMode ? maskPhone(customer.phone) : formatPhoneNumber(customer.phone)}
                            </div>
                            <div className="flex items-center gap-2 text-xs font-bold text-[var(--text-muted)] bg-[var(--bg-subtle)] px-3 py-1.5 rounded-md shadow-inner border border-[var(--border-color)] uppercase tracking-wider">
                                <Calendar size={14} className="text-amber-500" /> Joined {format(new Date(customer.created_at), 'MMM yyyy')}
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-3 w-full md:w-auto">
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
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

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
                                {/* Custom compact arrow */}
                                <div className="absolute right-2 md:right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--text-muted)]">
                                    <svg className="w-2.5 h-2.5 md:w-3 md:h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
                                </div>
                            </div>
                        </div>
                    </div>

                    {processedTickets.length === 0 ? (
                        <div className="bg-[var(--bg-surface)] rounded-2xl border-2 border-dashed border-[var(--border-color)] p-12 text-center shadow-sm">
                            <Wrench size={48} className="mx-auto text-[var(--border-color)] mb-4" />
                            <h3 className="font-bold text-lg text-[var(--text-main)]">No tickets found</h3>
                            <p className="text-sm text-[var(--text-muted)] mt-1">Adjust your filters or start a new repair.</p>
                        </div>
                    ) : (
                        /* REPAIR HISTORY GRID */
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {processedTickets.map(ticket => {
                                const theme = getStatusTheme(ticket.status, ticket.is_backordered);

                                return (
                                    <div
                                        key={ticket.id}
                                        onClick={() => navigate(`/ticket/${ticket.id}`)}
                                        className={`group bg-[var(--bg-surface)] rounded-xl border border-[var(--border-color)] border-l-[4px] p-5 hover:shadow-md transition-all duration-300 cursor-pointer relative overflow-hidden hover:-translate-y-0.5 flex flex-col h-full ${theme.border}`}
                                    >
                                        {/* Header Row */}
                                        <div className="flex justify-between items-center mb-4">
                                            <div className={`inline-flex items-center justify-center px-2.5 py-1 font-black uppercase text-[9px] tracking-widest rounded transition-all ${theme.pill}`}>
                                                {ticket.is_backordered ? 'BACKORDERED' : ticket.status.replace('_', ' ')}
                                            </div>
                                            <span className="flex items-center gap-1 text-xs font-mono font-bold text-[var(--text-muted)] opacity-70">
                                                <Hash size={12} /> {ticket.id}
                                            </span>
                                        </div>

                                        {/* Title & Price */}
                                        <div className="mb-4 flex-1">
                                            <h3 className="text-base font-black text-[var(--text-main)] leading-tight group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors mb-2">
                                                {ticket.brand} {ticket.model}
                                            </h3>
                                            <div className="text-lg font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/10 w-fit px-2 py-0.5 rounded border border-emerald-100 dark:border-emerald-900/30">
                                                {formatCurrency(ticket.estimate_total)}
                                            </div>
                                        </div>

                                        {/* Description Preview */}
                                        {ticket.description && (
                                            <div className="p-3 mb-4 rounded-lg bg-[var(--bg-subtle)] shadow-inner border border-[var(--border-color)]">
                                                <p className="text-xs font-medium text-[var(--text-muted)] line-clamp-2" title={ticket.description}>
                                                    {ticket.description}
                                                </p>
                                            </div>
                                        )}

                                        {/* Footer - Dashed Divider */}
                                        <div className="border-t-2 border-dashed border-[var(--border-color)] pt-3 flex justify-between items-center mt-auto">
                                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
                                                <Clock size={12} /> {format(new Date(ticket.created_at), 'MMM d, yy')}
                                            </div>
                                            <div className="w-6 h-6 rounded-full bg-[var(--bg-subtle)] border border-[var(--border-color)] flex items-center justify-center text-[var(--text-muted)] group-hover:bg-indigo-600 group-hover:text-white group-hover:border-indigo-600 transition-all transform group-hover:translate-x-1 shadow-sm">
                                                <ChevronRight size={12} />
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* RIGHT: CUSTOMER INSIGHTS */}
                <div className="space-y-6">
                    <div className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-color)] p-6 shadow-sm">
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-5 flex items-center gap-2">
                            <Star size={16} className="text-amber-500" /> Insights & Averages
                        </h3>

                        <div className="space-y-4">
                            {/* Insight 1: Avg Spend */}
                            <div className="flex items-center gap-4 p-4 bg-[var(--bg-subtle)] rounded-xl border border-[var(--border-color)] shadow-inner">
                                <div className="p-2.5 bg-[var(--bg-surface)] rounded-lg shadow-sm border border-[var(--border-color)]">
                                    <DollarSign size={20} className="text-indigo-500" />
                                </div>
                                <div>
                                    <div className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-0.5">Avg. Ticket Cost</div>
                                    <div className="text-lg font-black text-[var(--text-main)] leading-none">
                                        {formatCurrency(tickets.length > 0 ? totalSpent / tickets.length : 0)}
                                    </div>
                                </div>
                            </div>

                            {/* Insight 2: Active Repairs */}
                            <div className="flex items-center gap-4 p-4 bg-[var(--bg-subtle)] rounded-xl border border-[var(--border-color)] shadow-inner">
                                <div className="p-2.5 bg-[var(--bg-surface)] rounded-lg shadow-sm border border-[var(--border-color)]">
                                    <Wrench size={20} className="text-emerald-500" />
                                </div>
                                <div>
                                    <div className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-0.5">Active Jobs</div>
                                    <div className="text-lg font-black text-[var(--text-main)] leading-none flex items-center gap-2">
                                        {activeTicketsCount} <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mt-1">In Progress</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Placeholder for future "Private Customer Notes" */}
                    <div className="border-2 border-dashed border-[var(--border-color)] rounded-2xl flex flex-col items-center justify-center p-8 text-[var(--text-muted)] bg-[var(--bg-subtle)] shadow-inner opacity-70 cursor-not-allowed">
                        <AlertCircle size={28} className="mb-2 opacity-50" />
                        <span className="font-black text-[10px] uppercase tracking-widest">Private Notes</span>
                        <span className="text-xs font-medium opacity-70 mt-1">Feature coming soon</span>
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