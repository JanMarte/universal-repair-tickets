import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { ArrowLeft, Wrench, Calendar, Phone, Hash } from 'lucide-react';
import { format } from 'date-fns';

export default function CustomerHistory() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [customer, setCustomer] = useState(null);
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchHistory();
    }, [id]);

    async function fetchHistory() {
        const { data: custData, error: custError } = await supabase
            .from('customers')
            .select('*')
            .eq('id', id)
            .single();

        if (custError) {
            console.error(custError);
            setLoading(false);
            return;
        }

        setCustomer(custData);

        const { data: tickets, error: ticketError } = await supabase
            .from('tickets')
            .select('*')
            .eq('customer_id', id)
            .order('created_at', { ascending: false });

        if (!ticketError) setHistory(tickets);
        setLoading(false);
    }

    if (loading) return <div className="p-10 text-center"><span className="loading loading-spinner loading-lg text-primary"></span></div>;
    if (!customer) return <div className="p-10 text-center text-xl font-bold dark:text-white">Customer not found.</div>;

    return (
        <div className="min-h-screen p-6 font-sans">

            {/* HEADER - Glass Panel */}
            <div className="glass-panel rounded-2xl p-6 mb-8 flex items-center gap-6 animate-fade bg-white/80 dark:bg-slate-800/80">
                <button onClick={() => navigate(-1)} className="btn btn-circle btn-ghost hover:bg-white dark:hover:bg-slate-700 transition-colors">
                    <ArrowLeft size={24} className="text-slate-700 dark:text-slate-200" />
                </button>
                <div>
                    <h1 className="text-3xl font-black text-slate-800 dark:text-white">{customer.full_name}</h1>
                    <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 font-medium mt-1">
                        <Calendar size={16} />
                        <p>Customer since {format(new Date(customer.created_at), 'MMMM yyyy')}</p>
                    </div>
                </div>
            </div>

            {/* STATS ROW */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 animate-fade">
                <div className="stat bg-white dark:bg-slate-800 shadow-lg rounded-2xl border border-slate-200 dark:border-slate-700 card-hover-effect">
                    <div className="stat-figure text-primary/20 dark:text-primary/40">
                        <Wrench size={64} strokeWidth={1} />
                    </div>
                    <div className="stat-title text-slate-500 dark:text-slate-400 font-bold uppercase text-xs tracking-wider">Total Repairs</div>
                    <div className="stat-value text-primary text-5xl font-black">{customer.total_repairs}</div>
                    <div className="stat-desc text-slate-400 font-medium mt-1">Lifetime Service Count</div>
                </div>

                <div className="stat bg-white dark:bg-slate-800 shadow-lg rounded-2xl border border-slate-200 dark:border-slate-700 card-hover-effect">
                    <div className="stat-figure text-secondary/20 dark:text-secondary/40">
                        <Phone size={64} strokeWidth={1} />
                    </div>
                    <div className="stat-title text-slate-500 dark:text-slate-400 font-bold uppercase text-xs tracking-wider">Contact Number</div>
                    <div className="stat-value text-slate-800 dark:text-white text-3xl font-bold">{customer.phone}</div>
                    <div className="stat-desc text-slate-400 font-medium mt-1">Primary Phone</div>
                </div>
            </div>

            {/* HISTORY LIST */}
            <div className="animate-fade">
                <h2 className="text-lg font-black text-slate-800 dark:text-white mb-5 flex items-center gap-3 uppercase tracking-wide">
                    Repair History
                    <span className="badge badge-neutral text-white font-bold">{history.length}</span>
                </h2>

                <div className="space-y-4">
                    {history.map(ticket => (
                        <div
                            key={ticket.id}
                            className="card bg-white dark:bg-slate-800 shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer border border-slate-200 dark:border-slate-700 group overflow-hidden"
                            onClick={() => navigate(`/ticket/${ticket.id}`)}
                        >
                            {/* Status Stripe */}
                            <div className={`h-full w-1.5 absolute left-0 top-0 bottom-0 ${ticket.status === 'completed' ? 'bg-emerald-500' : 'bg-primary'}`}></div>

                            <div className="card-body flex-row justify-between items-center p-6 pl-8">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-xs text-slate-400 dark:text-slate-500 font-bold uppercase flex items-center gap-1">
                                            <Calendar size={12} />
                                            {format(new Date(ticket.created_at), 'MMM dd, yyyy')}
                                        </span>
                                    </div>
                                    <h3 className="font-black text-xl text-slate-800 dark:text-white group-hover:text-primary transition-colors">
                                        {ticket.brand} <span className="font-normal text-slate-500 dark:text-slate-400">{ticket.model}</span>
                                    </h3>
                                    <p className="text-sm text-slate-600 dark:text-slate-300 mt-1 line-clamp-1 italic">
                                        "{ticket.description}"
                                    </p>
                                </div>

                                <div className="text-right flex flex-col items-end gap-2">
                                    <div className={`badge ${ticket.status === 'completed' ? 'badge-success text-white' : 'badge-warning text-white'} font-bold uppercase p-3 tracking-wide`}>
                                        {ticket.status.replace('_', ' ')}
                                    </div>
                                    <div className="text-xs font-mono font-bold text-slate-300 dark:text-slate-600 flex items-center gap-1">
                                        <Hash size={12} /> {ticket.id}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

        </div>
    );
}