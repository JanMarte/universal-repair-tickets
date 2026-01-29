import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { ArrowLeft, Phone, Mail, Wrench, Clock, Calendar } from 'lucide-react';
import { format } from 'date-fns';

export default function CustomerHistory() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      // 1. Get Customer Details
      const { data: custData } = await supabase.from('customers').select('*').eq('id', id).single();
      setCustomer(custData);

      // 2. Get Their Ticket History
      const { data: ticketData } = await supabase.from('tickets').select('*').eq('customer_id', id).order('created_at', { ascending: false });
      setTickets(ticketData || []);
      setLoading(false);
    }
    fetchData();
  }, [id]);

  if (loading) return <div className="p-10 text-center"><span className="loading loading-spinner loading-lg text-primary"></span></div>;
  if (!customer) return <div className="p-10 text-center text-xl font-bold text-[var(--text-main)]">Customer not found.</div>;

  return (
    <div className="min-h-screen p-6 font-sans">
      
      {/* HEADER */}
      <div className="rounded-2xl p-6 mb-8 flex items-center gap-4 animate-fade shadow-sm backdrop-blur-md bg-[var(--bg-surface)] border border-[var(--border-color)]">
        <button onClick={() => navigate(-1)} className="btn btn-circle btn-ghost hover:bg-[var(--bg-subtle)]">
            <ArrowLeft size={24} className="text-[var(--text-main)]"/>
        </button>
        <div>
            <h1 className="text-3xl font-black text-[var(--text-main)] tracking-tight">{customer.full_name}</h1>
            <p className="text-[var(--text-muted)] font-medium">Customer Profile & History</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade">
        
        {/* LEFT COLUMN: Customer Stats */}
        <div className="lg:col-span-1 space-y-6">
            
            {/* Contact Card */}
            <div className="content-card">
                <h2 className="text-xs font-bold uppercase text-[var(--text-muted)] tracking-wider mb-4 border-b border-[var(--border-color)] pb-2">Contact Details</h2>
                <div className="space-y-4">
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-color)]">
                        <div className="bg-white dark:bg-slate-700 p-2 rounded-full shadow-sm text-indigo-500"><Phone size={20}/></div>
                        <div>
                            <div className="text-xs text-[var(--text-muted)] font-bold uppercase">Phone</div>
                            <div className="text-[var(--text-main)] font-mono font-bold text-lg">{customer.phone}</div>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-color)]">
                        <div className="bg-white dark:bg-slate-700 p-2 rounded-full shadow-sm text-purple-500"><Mail size={20}/></div>
                        <div>
                            <div className="text-xs text-[var(--text-muted)] font-bold uppercase">Email</div>
                            <div className="text-[var(--text-main)] font-medium break-all">{customer.email}</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Stats Card */}
            <div className="content-card">
                <h2 className="text-xs font-bold uppercase text-[var(--text-muted)] tracking-wider mb-4 border-b border-[var(--border-color)] pb-2">Repair Stats</h2>
                <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800">
                        <div className="text-3xl font-black text-indigo-600 dark:text-indigo-400">{tickets.length}</div>
                        <div className="text-xs font-bold text-indigo-400 dark:text-indigo-300 uppercase mt-1">Total Repairs</div>
                    </div>
                    <div className="text-center p-4 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800">
                         {/* Calculating completed repairs */}
                        <div className="text-3xl font-black text-green-600 dark:text-green-400">
                            {tickets.filter(t => t.status === 'completed').length}
                        </div>
                        <div className="text-xs font-bold text-green-500 dark:text-green-300 uppercase mt-1">Completed</div>
                    </div>
                </div>
            </div>
        </div>

        {/* RIGHT COLUMN: Ticket History List */}
        <div className="lg:col-span-2">
            <h2 className="text-xl font-black text-[var(--text-main)] mb-4 flex items-center gap-2">
                <Clock size={24} className="text-[var(--text-muted)]"/> Repair History
            </h2>

            <div className="space-y-4">
                {tickets.map(ticket => (
                    // Using a simplified version of the Ticket Card for this list view
                    <div 
                        key={ticket.id} 
                        onClick={() => navigate(`/ticket/${ticket.id}`)}
                        className="group flex flex-col md:flex-row justify-between items-start md:items-center p-5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] hover:shadow-lg hover:border-indigo-300 transition-all cursor-pointer relative overflow-hidden"
                    >
                        {/* Hover Highlight Line */}
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-transparent group-hover:bg-indigo-500 transition-colors"></div>

                        <div className="flex items-center gap-4 mb-3 md:mb-0">
                            <div className="bg-[var(--bg-subtle)] p-3 rounded-lg text-[var(--text-muted)] group-hover:text-indigo-500 transition-colors">
                                <Wrench size={24} />
                            </div>
                            <div>
                                <h3 className="font-bold text-lg text-[var(--text-main)]">{ticket.brand} {ticket.model}</h3>
                                <p className="text-sm text-[var(--text-muted)] line-clamp-1 italic">"{ticket.description}"</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-6 w-full md:w-auto justify-between md:justify-end">
                            <div className="flex items-center gap-2 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">
                                <Calendar size={14} />
                                {format(new Date(ticket.created_at), 'MMM d, yyyy')}
                            </div>
                            <div className={`badge ${ticket.status === 'completed' ? 'badge-success text-white' : 'badge-ghost'} font-bold uppercase p-3`}>
                                {ticket.status.replace('_', ' ')}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>

      </div>
    </div>
  );
}