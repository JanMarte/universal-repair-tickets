import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import { Search, User, Phone, Mail, ChevronRight, Users, ArrowLeft, Hash, Calendar, ExternalLink } from 'lucide-react';
import { formatPhoneNumber, maskPhone, maskEmail } from '../utils';
import { format } from 'date-fns';

export default function Customers() {
    const navigate = useNavigate();
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchCustomers();
    }, []);

    async function fetchCustomers() {
        // Fetch all customers, ordered by most recently added
        const { data, error } = await supabase
            .from('customers')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) console.error('Error fetching customers:', error);
        else setCustomers(data || []);

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

    // Helper for Initials
    const getInitials = (name) => {
        if (!name) return '??';
        const parts = name.trim().split(' ');
        if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
        return name.substring(0, 2).toUpperCase();
    };

    return (
        <div className="min-h-screen p-4 md:p-6 font-sans pb-24 transition-colors duration-300">

            {/* NAVBAR */}
            <div className="navbar rounded-2xl mb-6 sticky top-2 z-40 flex justify-between shadow-sm backdrop-blur-md bg-[var(--bg-surface)] border border-[var(--border-color)] px-3 py-2 animate-fade">
                <div className="flex items-center">
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="btn btn-sm btn-ghost gap-2 text-[var(--text-muted)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-main)] transition-colors rounded-lg"
                    >
                        <ArrowLeft size={18} /> <span className="hidden md:inline font-bold">Dashboard</span>
                    </button>
                </div>

                {/* Premium Recessed Counter Badge */}
                <div className="flex items-center gap-2 bg-[var(--bg-subtle)] px-3 py-1.5 rounded-md shadow-inner border border-[var(--border-color)]">
                    <Users size={14} className="text-indigo-500" />
                    <span className="font-black text-[10px] text-[var(--text-main)] uppercase tracking-widest">
                        {filteredCustomers.length} Found
                    </span>
                </div>
            </div>

            {/* HEADER & SEARCH */}
            <div className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-color)] p-6 md:p-8 shadow-sm mb-6 animate-fade-in-up">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div>
                        <h1 className="text-2xl font-black text-[var(--text-main)] flex items-center gap-3 mb-1 tracking-tight">
                            <Users size={28} className="text-indigo-600" /> Customer Database
                        </h1>
                        <p className="text-sm text-[var(--text-muted)] font-medium pl-10">Search, view history, and manage your client list.</p>
                    </div>

                    {/* Premium Recessed Search Input */}
                    <div className="relative w-full md:w-96 group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within:text-indigo-500 transition-colors" size={18} />
                        <input
                            type="text"
                            placeholder="Search Name, Phone, or Email..."
                            className="input input-bordered w-full pl-11 h-12 bg-[var(--bg-subtle)] focus:bg-[var(--bg-surface)] text-[var(--text-main)] font-medium shadow-inner transition-all focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {/* CUSTOMER GRID - Now using Responsive Card Layout */}
            {loading ? (
                <div className="flex justify-center mt-20"><span className="loading loading-spinner loading-lg text-indigo-500"></span></div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 animate-fade">
                    {filteredCustomers.length === 0 ? (
                        <div className="col-span-full text-center p-16 bg-[var(--bg-surface)] rounded-2xl border-2 border-dashed border-[var(--border-color)] shadow-sm">
                            <User size={48} className="mx-auto text-[var(--border-color)] mb-4" />
                            <h3 className="font-bold text-lg text-[var(--text-main)]">No customers found.</h3>
                            <p className="text-sm text-[var(--text-muted)] mt-1">Try adjusting your search terms.</p>
                        </div>
                    ) : (
                        filteredCustomers.map(customer => (
                            <div
                                key={customer.id}
                                onClick={() => navigate(`/customer/${customer.id}`)}
                                className="bg-[var(--bg-surface)] rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5 flex flex-col justify-between group border border-[var(--border-color)] border-l-[4px] border-l-indigo-500 cursor-pointer"
                            >
                                {/* Top Row: Badge & ID */}
                                <div className="flex justify-between items-center mb-5">
                                    <div className="inline-flex items-center justify-center px-3 py-1.5 font-black uppercase text-[10px] tracking-widest rounded-md transition-all bg-indigo-500 text-white shadow-md shadow-indigo-500/30">
                                        CUSTOMER
                                    </div>
                                    <span className="flex items-center gap-1 text-xs font-mono font-bold text-[var(--text-muted)] opacity-70">
                                        <Hash size={12} /> {customer.id}
                                    </span>
                                </div>

                                {/* Identity Area */}
                                <div className="flex items-center gap-4 mb-5">
                                    <div className="w-12 h-12 rounded-full bg-[var(--bg-subtle)] border border-[var(--border-color)] shadow-inner flex items-center justify-center text-sm font-black text-indigo-600 dark:text-indigo-400 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-900/30 group-hover:scale-110 transition-all duration-300">
                                        {getInitials(customer.full_name)}
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-black text-[var(--text-main)] leading-tight group-hover:text-indigo-600 transition-colors">
                                            {customer.full_name}
                                        </h3>
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] opacity-60">Verified Client</span>
                                    </div>
                                </div>

                                {/* Recessed Contact Info Box */}
                                <div className="p-3.5 mb-6 rounded-lg border-l-[3px] border-indigo-200 dark:border-indigo-900 bg-[var(--bg-subtle)] shadow-inner flex flex-col gap-2">
                                    <div className="flex items-center gap-2 text-xs font-bold text-[var(--text-muted)]">
                                        <Phone size={12} className="text-emerald-500" />
                                        <span className="font-mono tracking-widest">{maskPhone(customer.phone)}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs font-bold text-[var(--text-muted)] truncate">
                                        <Mail size={12} className="text-blue-500 flex-none" />
                                        <span className="truncate">{maskEmail(customer.email)}</span>
                                    </div>
                                </div>

                                {/* Footer - Dashed Divider */}
                                <div className="border-t-2 border-dashed border-[var(--border-color)] pt-4 flex justify-between items-center mt-auto">
                                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
                                        <Calendar size={12} />
                                        Joined {customer.created_at ? format(new Date(customer.created_at), 'MMM d, yyyy') : 'N/A'}
                                    </div>

                                    <button className="btn btn-xs btn-ghost btn-circle text-[var(--text-muted)] group-hover:text-indigo-600 group-hover:bg-indigo-50 transition-all">
                                        <ChevronRight size={16} />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}