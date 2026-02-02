import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import {
    User, Phone, Mail, Calendar,
    ArrowLeft, Plus, Clock, Wrench, DollarSign,
    ChevronRight, History, Star, AlertCircle, Eye, EyeOff
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
    const [isPrivacyMode, setIsPrivacyMode] = useState(true); // Default to HIDDEN for security

    useEffect(() => {
        fetchData();
    }, [id]);

    async function fetchData() {
        // 1. Get Customer Details
        const { data: customerData } = await supabase
            .from('customers')
            .select('*')
            .eq('id', id)
            .single();

        setCustomer(customerData);

        // 2. Get Their Ticket History
        const { data: ticketData } = await supabase
            .from('tickets')
            .select('*')
            .eq('customer_id', id)
            .order('created_at', { ascending: false });

        setTickets(ticketData || []);
        setLoading(false);
    }

    // --- CALCULATE STATS ---
    const totalSpent = tickets.reduce((sum, t) => sum + (t.estimate_total || 0), 0);
    const activeTickets = tickets.filter(t => t.status !== 'completed' && t.status !== 'picked_up').length;

    // Helper to get Initials safely
    const getInitials = (name) => {
        if (!name) return '??';
        const parts = name.trim().split(' ');
        if (parts.length >= 2) {
            return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
        }
        return name.substring(0, 2).toUpperCase();
    };

    // Helper to get Status Badge styles
    const getStatusStyle = (status) => {
        switch (status) {
            case 'completed': return 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400';
            case 'ready_pickup': return 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300';
            case 'repairing': return 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300';
            case 'diagnosing': return 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300';
            default: return 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300';
        }
    };

    if (loading) return <div className="p-10 text-center"><span className="loading loading-spinner loading-lg text-primary"></span></div>;
    if (!customer) return <div className="p-10 text-center">Customer not found.</div>;

    return (
        <div className="min-h-screen p-4 md:p-8 font-sans pb-24">

            {/* NAVBAR */}
            <div className="navbar rounded-2xl mb-6 sticky top-2 z-40 flex justify-between shadow-sm backdrop-blur-md bg-[var(--bg-surface)] border border-[var(--border-color)]">
                <div className="flex items-center">
                    <button onClick={() => navigate(-1)} className="btn btn-ghost gap-2 text-[var(--text-muted)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-main)]">
                        <ArrowLeft size={20} /> <span className="hidden md:inline font-bold">Back</span>
                    </button>
                </div>
                <div className="flex-none">
                    {/* BUTTON: Opens Modal instead of navigating */}
                    <button onClick={() => setIsIntakeOpen(true)} className="btn btn-sm btn-gradient text-white gap-2 shadow-md">
                        <Plus size={16} /> New Repair
                    </button>
                </div>
            </div>

            {/* --- CUSTOMER PROFILE CARD --- */}
            <div className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-color)] p-6 md:p-8 shadow-sm mb-8 relative overflow-hidden animate-fade-in-up">
                <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>

                <div className="flex flex-col md:flex-row gap-6 items-start md:items-center relative z-10">

                    {/* AVATAR */}
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 text-white flex items-center justify-center text-2xl font-black shadow-lg">
                        {getInitials(customer.full_name)}
                    </div>

                    {/* INFO SECTION */}
                    <div className="flex-1 w-full">
                        <div className="flex justify-between items-start">
                            <h1 className="text-3xl font-black text-[var(--text-main)] mb-2">
                                {customer.full_name}
                            </h1>

                            {/* PRIVACY TOGGLE BUTTON */}
                            <button
                                onClick={() => setIsPrivacyMode(!isPrivacyMode)}
                                className="btn btn-sm btn-ghost gap-2 text-[var(--text-muted)] border border-[var(--border-color)] hover:bg-[var(--bg-subtle)]"
                            >
                                {isPrivacyMode ? <Eye size={16} /> : <EyeOff size={16} />}
                                <span className="text-xs hidden sm:inline">{isPrivacyMode ? 'Show Info' : 'Hide Info'}</span>
                            </button>
                        </div>

                        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm font-medium text-[var(--text-muted)]">
                            <div className="flex items-center gap-2">
                                <Mail size={16} className="text-indigo-500" />
                                {isPrivacyMode ? maskEmail(customer.email) : (customer.email || 'No email')}
                            </div>
                            <div className="flex items-center gap-2">
                                <Phone size={16} className="text-emerald-500" />
                                {isPrivacyMode ? maskPhone(customer.phone) : formatPhoneNumber(customer.phone)}
                            </div>
                            <div className="flex items-center gap-2">
                                <Calendar size={16} className="text-amber-500" /> Member since {format(new Date(customer.created_at), 'MMM yyyy')}
                            </div>
                        </div>
                    </div>

                    {/* STATS BADGES */}
                    <div className="flex gap-4 w-full md:w-auto">
                        <div className="text-center px-4 py-2 bg-[var(--bg-subtle)] rounded-xl border border-[var(--border-color)] flex-1 md:flex-none">
                            <div className="text-xs font-bold uppercase text-[var(--text-muted)] mb-1">Lifetime Spend</div>
                            <div className="text-xl font-black text-emerald-600">{formatCurrency(totalSpent)}</div>
                        </div>
                        <div className="text-center px-4 py-2 bg-[var(--bg-subtle)] rounded-xl border border-[var(--border-color)] flex-1 md:flex-none">
                            <div className="text-xs font-bold uppercase text-[var(--text-muted)] mb-1">Total Repairs</div>
                            <div className="text-xl font-black text-[var(--text-main)]">{tickets.length}</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* --- LAYOUT GRID --- */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* LEFT: TICKET HISTORY */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="flex items-center justify-between px-2">
                        <h2 className="text-sm font-black uppercase tracking-widest text-[var(--text-muted)] flex items-center gap-2">
                            <History size={18} /> Repair History
                        </h2>
                    </div>

                    {tickets.length === 0 ? (
                        <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border-color)] p-12 text-center">
                            <Wrench size={48} className="mx-auto text-slate-200 mb-4" />
                            <h3 className="font-bold text-[var(--text-main)]">No repairs yet</h3>
                            <p className="text-sm text-[var(--text-muted)]">Start a new ticket to track history.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {tickets.map(ticket => (
                                <div
                                    key={ticket.id}
                                    onClick={() => navigate(`/ticket/${ticket.id}`)}
                                    className="group bg-[var(--bg-surface)] rounded-xl border border-[var(--border-color)] p-5 hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-700 transition-all cursor-pointer relative overflow-hidden"
                                >
                                    <div className="flex justify-between items-start">
                                        <div className="flex gap-4">
                                            {/* Status Icon Box */}
                                            <div className="hidden sm:flex w-12 h-12 rounded-lg bg-[var(--bg-subtle)] items-center justify-center text-[var(--text-muted)] group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                                                <Wrench size={20} />
                                            </div>

                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="font-black text-lg text-[var(--text-main)] group-hover:text-indigo-600 transition-colors">
                                                        {ticket.brand} {ticket.model}
                                                    </span>
                                                    {ticket.is_backordered && (
                                                        <span className="badge badge-error badge-xs text-white">Backordered</span>
                                                    )}
                                                </div>
                                                <div className="text-sm text-[var(--text-muted)] font-mono mb-3">
                                                    Serial: {ticket.serial_number || 'N/A'}
                                                </div>

                                                <div className="flex items-center gap-3">
                                                    <span className={`badge border font-bold ${getStatusStyle(ticket.status)}`}>
                                                        {ticket.status.replace('_', ' ')}
                                                    </span>
                                                    <span className="text-xs font-bold text-[var(--text-muted)] flex items-center gap-1">
                                                        <Clock size={12} /> {format(new Date(ticket.created_at), 'MMM d, yyyy')}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="text-right flex flex-col items-end gap-2">
                                            <div className="text-lg font-black text-[var(--text-main)]">
                                                {formatCurrency(ticket.estimate_total)}
                                            </div>
                                            <div className="w-8 h-8 rounded-full bg-[var(--bg-subtle)] flex items-center justify-center text-[var(--text-muted)] group-hover:bg-indigo-600 group-hover:text-white transition-all transform group-hover:translate-x-1">
                                                <ChevronRight size={18} />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Description Preview */}
                                    {ticket.description && (
                                        <div className="mt-4 pt-4 border-t border-[var(--border-color)]">
                                            <p className="text-xs text-[var(--text-muted)] line-clamp-2">
                                                {ticket.description}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* RIGHT: CUSTOMER INSIGHTS */}
                <div className="space-y-6">
                    <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border-color)] p-6">
                        <h3 className="text-xs font-bold uppercase text-[var(--text-muted)] mb-4 flex items-center gap-2">
                            <Star size={16} /> Customer Insights
                        </h3>

                        <div className="space-y-4">
                            {/* Insight 1: Avg Spend */}
                            <div className="flex items-start gap-3 p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-100 dark:border-indigo-800">
                                <DollarSign size={16} className="text-indigo-600 mt-0.5" />
                                <div>
                                    <div className="text-xs font-bold text-indigo-900 dark:text-indigo-200">Average Repair Cost</div>
                                    <div className="text-sm font-black text-indigo-700 dark:text-indigo-300">
                                        {formatCurrency(tickets.length > 0 ? totalSpent / tickets.length : 0)}
                                    </div>
                                </div>
                            </div>

                            {/* Insight 2: Active Repairs */}
                            <div className="flex items-start gap-3 p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-100 dark:border-emerald-800">
                                <Wrench size={16} className="text-emerald-600 mt-0.5" />
                                <div>
                                    <div className="text-xs font-bold text-emerald-900 dark:text-emerald-200">Active Repairs</div>
                                    <div className="text-sm font-black text-emerald-700 dark:text-emerald-300">
                                        {activeTickets} in progress
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Placeholder for future "Private Customer Notes" */}
                    <div className="border-2 border-dashed border-[var(--border-color)] rounded-xl flex flex-col items-center justify-center p-8 text-[var(--text-muted)] bg-[var(--bg-subtle)] opacity-70 hover:opacity-100 transition-opacity cursor-not-allowed">
                        <AlertCircle size={32} className="mb-2 opacity-50" />
                        <span className="font-bold text-sm uppercase tracking-wider">Private Notes</span>
                        <span className="text-xs opacity-70">Coming soon</span>
                    </div>
                </div>

            </div>

            {/* 4. RENDER MODAL IF OPEN */}
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