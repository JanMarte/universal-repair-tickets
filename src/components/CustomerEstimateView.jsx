import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { formatCurrency } from '../utils';
import { CheckCircle, AlertCircle, ArrowRight, Package, Wrench, Lock, Receipt } from 'lucide-react';
import { useToast } from '../context/ToastProvider';
import confetti from 'canvas-confetti';

export default function CustomerEstimateView({ ticketId }) {
    const [ticket, setTicket] = useState(null);
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [approving, setApproving] = useState(false);
    const { addToast } = useToast();

    useEffect(() => {
        fetchData();
    }, [ticketId]);

    async function fetchData() {
        setLoading(true);
        const { data: ticketData } = await supabase.from('tickets').select('*').eq('id', ticketId).single();
        const { data: itemsData } = await supabase.from('estimate_items').select('*').eq('ticket_id', ticketId).order('created_at', { ascending: true });

        setTicket(ticketData);
        setItems(itemsData || []);
        setLoading(false);
    }

    const handleApprove = async () => {
        setApproving(true);
        try {
            // 1. Lock pending items
            await supabase.from('estimate_items').update({ is_approved: true }).eq('ticket_id', ticketId).eq('is_approved', false);

            // 2. Update Ticket
            const { error } = await supabase.from('tickets').update({ status: 'waiting_parts', estimate_status: 'approved' }).eq('id', ticketId);
            if (error) throw error;

            confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 }, colors: ['#6366f1', '#8b5cf6', '#ec4899'] });

            setTicket(prev => ({ ...prev, status: 'waiting_parts', estimate_status: 'approved' }));
            setItems(prev => prev.map(i => ({ ...i, is_approved: true })));
            addToast("Repair Approved Successfully!", "success");

            // 3. Log it
            const { data: { user } } = await supabase.auth.getUser();
            await supabase.from('audit_logs').insert([{
                ticket_id: ticketId,
                actor_name: user?.email || 'Customer',
                action: 'ESTIMATE APPROVED',
                details: 'Customer approved the estimate via their secure portal.',
                metadata: { device: navigator.userAgent }
            }]);
        } catch (err) {
            console.error(err);
            addToast("Failed to approve estimate.", "error");
        } finally {
            setApproving(false);
        }
    };

    if (loading) return <div className="flex justify-center py-10"><span className="loading loading-spinner text-indigo-500"></span></div>;
    if (!ticket) return null;

    // Math Breakdowns
    const approvedItems = items.filter(i => i.is_approved === true);
    const pendingItems = items.filter(i => i.is_approved !== true);

    const taxRate = 0.07;
    const calcTotal = (itemList) => {
        const sub = itemList.reduce((sum, i) => sum + (i.part_cost || 0) + (i.labor_cost || 0), 0);
        return sub + (sub * taxRate);
    };

    if (items.length === 0) {
        return (
            <div className="text-center py-16 bg-[var(--bg-subtle)] rounded-2xl border border-[var(--border-color)] shadow-inner">
                <Receipt size={40} className="mx-auto text-[var(--text-muted)] mb-4 opacity-50" />
                <h3 className="text-sm font-black uppercase tracking-widest text-[var(--text-main)] mb-2">No Estimate Yet</h3>
                <p className="text-sm font-medium text-[var(--text-muted)] max-w-xs mx-auto">
                    Our technicians are currently diagnosing your device. A detailed repair estimate will appear here soon.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-6">

            {/* --- PREVIOUSLY APPROVED RECEIPT --- */}
            {approvedItems.length > 0 && (
                <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-[20px] p-6 shadow-sm relative overflow-hidden">
                    <div className="flex justify-between items-center border-b-2 border-dashed border-[var(--border-color)] pb-4 mb-4">
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-[var(--text-main)] flex items-center gap-2">
                            <Receipt size={16} className="text-emerald-500" /> Approved Bill
                        </h3>
                        <span className="bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-md shadow-sm flex items-center gap-1">
                            <Lock size={10} /> Locked
                        </span>
                    </div>
                    <div className="space-y-3 mb-5">
                        {approvedItems.map((item, idx) => (
                            <div key={idx} className="flex justify-between items-start text-sm">
                                <span className="font-bold text-[var(--text-muted)]">{item.description.replace('(Labor) ', '')}</span>
                                <span className="font-mono font-bold text-[var(--text-muted)]">{formatCurrency((item.part_cost || 0) + (item.labor_cost || 0))}</span>
                            </div>
                        ))}
                    </div>
                    <div className="flex justify-between items-center pt-3 border-t border-[var(--border-color)]">
                        <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Approved Total (w/ Tax)</span>
                        <span className="text-lg font-black text-[var(--text-main)]">{formatCurrency(calcTotal(approvedItems))}</span>
                    </div>
                </div>
            )}

            {/* --- ACTION REQUIRED: NEW PENDING ESTIMATE --- */}
            {pendingItems.length > 0 && ticket.estimate_status === 'sent' && (
                <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl p-1 shadow-2xl shadow-indigo-500/30 animate-pop transform transition-all">
                    <div className="bg-[var(--bg-surface)] rounded-[20px] p-6 relative overflow-hidden">
                        <div className="absolute top-0 right-0 -mr-6 -mt-6 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>

                        <div className="flex justify-between items-center border-b-2 border-dashed border-[var(--border-color)] pb-4 mb-4 relative z-10">
                            <h3 className="text-[10px] font-black uppercase tracking-widest text-indigo-500 flex items-center gap-2">
                                <AlertCircle size={16} /> Action Required
                            </h3>
                        </div>

                        <p className="text-xs font-bold text-[var(--text-muted)] mb-4">
                            The following parts/services are required to complete your repair:
                        </p>

                        <div className="space-y-3 mb-6 relative z-10">
                            {pendingItems.map((item, idx) => {
                                const isLabor = item.description.startsWith('(Labor)');
                                const cleanDescription = item.description.replace('(Labor) ', '');
                                return (
                                    <div key={idx} className="flex justify-between items-start text-sm bg-[var(--bg-subtle)] p-3 rounded-lg border border-[var(--border-color)] shadow-inner">
                                        <div className="flex items-center gap-2">
                                            {isLabor ? <Wrench size={14} className="text-amber-500" /> : <Package size={14} className="text-indigo-500" />}
                                            <span className="font-bold text-[var(--text-main)]">{cleanDescription}</span>
                                        </div>
                                        <span className="font-mono font-black text-[var(--text-main)]">
                                            {formatCurrency((item.part_cost || 0) + (item.labor_cost || 0))}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="flex justify-between items-center pt-2 mb-6 border-t border-[var(--border-color)]">
                            <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-main)] mt-3">Total Due (w/ Tax)</span>
                            <span className="text-3xl font-black text-indigo-600 dark:text-indigo-400 tracking-tight mt-3">
                                {formatCurrency(calcTotal(pendingItems))}
                            </span>
                        </div>

                        <button
                            onClick={handleApprove}
                            disabled={approving}
                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black h-14 rounded-xl flex items-center justify-center gap-3 active:scale-95 transition-all shadow-md shadow-indigo-500/20 text-base border-none relative z-10"
                        >
                            {approving ? <span className="loading loading-spinner"></span> : <>Approve Repair <ArrowRight size={20} /></>}
                        </button>
                    </div>
                </div>
            )}

            {/* If there are pending items but the staff hasn't clicked "Send" yet */}
            {pendingItems.length > 0 && ticket.estimate_status !== 'sent' && (
                <div className="text-center py-8 bg-[var(--bg-subtle)] rounded-2xl border border-[var(--border-color)] shadow-inner">
                    <Wrench size={24} className="mx-auto text-[var(--text-muted)] mb-3 opacity-50" />
                    <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Technician is drafting an update...</p>
                </div>
            )}
        </div>
    );
}