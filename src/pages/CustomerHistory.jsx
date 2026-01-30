import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { ArrowLeft, Clock, Smartphone, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { formatPhoneNumber } from '../utils'; // <--- New Import
import TicketCard from '../components/TicketCard'; // Re-use the nice card component

export default function CustomerHistory() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [customer, setCustomer] = useState(null);
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchCustomerData();
    }, [id]);

    async function fetchCustomerData() {
        setLoading(true);
        // 1. Get Customer Details
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

        // 2. Get Their Tickets
        const { data: ticketData } = await supabase
            .from('tickets')
            .select('*')
            .eq('customer_id', id)
            .order('created_at', { ascending: false });

        setTickets(ticketData || []);
        setLoading(false);
    }

    if (loading) return <div className="p-10 text-center"><span className="loading loading-spinner loading-lg text-primary"></span></div>;
    if (!customer) return <div className="p-10 text-center font-bold text-[var(--text-muted)]">Customer not found.</div>;

    return (
        <div className="min-h-screen p-6 font-sans">

            {/* HEADER */}
            <div className="rounded-2xl p-6 mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-[var(--bg-surface)] border border-[var(--border-color)] shadow-sm">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/dashboard')} className="btn btn-circle btn-ghost"><ArrowLeft /></button>
                    <div>
                        <h1 className="text-2xl font-black text-[var(--text-main)]">{customer.full_name}</h1>
                        <div className="flex gap-4 text-[var(--text-muted)] font-mono text-sm mt-1">
                            <span>{formatPhoneNumber(customer.phone)}</span>
                            <span>•</span>
                            <span>{customer.email}</span>
                        </div>
                    </div>
                </div>

                {/* Quick Stats */}
                <div className="flex gap-3">
                    <div className="stat p-2 bg-[var(--bg-subtle)] rounded-xl border border-[var(--border-color)] min-w-[100px]">
                        <div className="stat-title text-xs font-bold uppercase">Total Repairs</div>
                        <div className="stat-value text-2xl text-primary">{tickets.length}</div>
                    </div>
                </div>
            </div>

            {/* TICKET LIST */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade">
                {tickets.map(ticket => (
                    <TicketCard key={ticket.id} ticket={ticket} />
                ))}
                {tickets.length === 0 && (
                    <div className="col-span-full text-center p-12 bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-color)]">
                        <p className="font-bold text-[var(--text-muted)]">No repair history found for this customer.</p>
                    </div>
                )}
            </div>
        </div>
    );
}