import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import { Search, User, Phone, Mail, ChevronRight, Users, ArrowLeft } from 'lucide-react';
import { formatPhoneNumber } from '../utils';

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
    // (Fastest for lists under ~2000 people)
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
        <div className="min-h-screen p-4 md:p-8 font-sans pb-24">

            {/* NAVBAR */}
            <div className="navbar rounded-2xl mb-6 sticky top-2 z-40 flex justify-between shadow-sm backdrop-blur-md bg-[var(--bg-surface)] border border-[var(--border-color)]">
                <div className="flex items-center">
                    <button onClick={() => navigate('/dashboard')} className="btn btn-ghost gap-2 text-[var(--text-muted)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-main)]">
                        <ArrowLeft size={20} /> <span className="hidden md:inline font-bold">Dashboard</span>
                    </button>
                </div>
                <div className="flex-none font-bold text-[var(--text-muted)] text-sm uppercase tracking-wider pr-4">
                    {filteredCustomers.length} Customers Found
                </div>
            </div>

            {/* HEADER & SEARCH */}
            <div className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-color)] p-6 md:p-10 shadow-sm mb-8 animate-fade-in-up">
                <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-6">
                    <div>
                        <h1 className="text-3xl font-black text-[var(--text-main)] flex items-center gap-3 mb-2">
                            <Users size={32} className="text-indigo-600" /> Customer Database
                        </h1>
                        <p className="text-[var(--text-muted)] font-medium">Search, view history, and manage your client list.</p>
                    </div>

                    <div className="relative w-full md:w-96">
                        <Search className="absolute left-4 top-3.5 text-slate-400" size={20} />
                        <input
                            type="text"
                            placeholder="Search by Name, Phone, or Email..."
                            className="input input-bordered w-full pl-12 h-12 bg-[var(--bg-subtle)] focus:bg-[var(--bg-surface)] text-[var(--text-main)] font-medium shadow-sm transition-all focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {/* CUSTOMER LIST */}
            {loading ? (
                <div className="p-20 text-center"><span className="loading loading-spinner loading-lg text-primary"></span></div>
            ) : (
                <div className="grid grid-cols-1 gap-4 animate-fade">
                    {filteredCustomers.length === 0 ? (
                        <div className="text-center py-20 bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-color)] opacity-75">
                            <User size={48} className="mx-auto text-slate-300 mb-4" />
                            <h3 className="font-bold text-lg text-[var(--text-muted)]">No customers found.</h3>
                            <p className="text-sm text-slate-400">Try adjusting your search terms.</p>
                        </div>
                    ) : (
                        filteredCustomers.map(customer => (
                            <div
                                key={customer.id}
                                onClick={() => navigate(`/customer/${customer.id}`)}
                                className="group bg-[var(--bg-surface)] rounded-xl border border-[var(--border-color)] p-4 flex items-center justify-between hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-700 cursor-pointer transition-all"
                            >
                                <div className="flex items-center gap-4 md:gap-6 flex-1 min-w-0">
                                    {/* Avatar */}
                                    <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-sm font-black text-slate-500 group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors">
                                        {getInitials(customer.full_name)}
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0 grid grid-cols-1 md:grid-cols-3 gap-4 items-center">

                                        {/* Name */}
                                        <div>
                                            <div className="font-bold text-[var(--text-main)] text-lg truncate group-hover:text-indigo-600 transition-colors">
                                                {customer.full_name}
                                            </div>
                                        </div>

                                        {/* Phone */}
                                        <div className="flex items-center gap-2 text-sm font-medium text-[var(--text-muted)]">
                                            <Phone size={14} className="text-emerald-500" />
                                            <span className="font-mono">{formatPhoneNumber(customer.phone)}</span>
                                        </div>

                                        {/* Email */}
                                        <div className="hidden md:flex items-center gap-2 text-sm font-medium text-[var(--text-muted)] truncate">
                                            <Mail size={14} className="text-blue-500 flex-none" />
                                            <span className="truncate">{customer.email || 'No email on file'}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Arrow */}
                                <div className="pl-4">
                                    <button className="btn btn-sm btn-circle btn-ghost text-slate-300 group-hover:text-indigo-600 group-hover:bg-indigo-50">
                                        <ChevronRight size={20} />
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