import React, { useState, useEffect } from 'react';
import { Check, X, AlertCircle, DollarSign, PenTool, AlertTriangle } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useToast } from '../context/ToastProvider';

export default function CustomerEstimateView({ ticketId }) {
    const { addToast } = useToast();
    const [items, setItems] = useState([]);
    const [estStatus, setEstStatus] = useState(null);
    const [loading, setLoading] = useState(true);

    // New State for the Custom Modal
    const [confirmAction, setConfirmAction] = useState(null); // 'approved' | 'declined' | null

    useEffect(() => {
        fetchEstimate();
    }, [ticketId]);

    const fetchEstimate = async () => {
        const { data: ticket } = await supabase.from('tickets').select('estimate_status').eq('id', ticketId).single();
        if (ticket) setEstStatus(ticket.estimate_status);

        const { data: lineItems } = await supabase
            .from('ticket_line_items')
            .select('*')
            .eq('ticket_id', ticketId)
            .order('created_at', { ascending: true });

        if (lineItems) setItems(lineItems);
        setLoading(false);
    };

    // 1. Open the Modal instead of window.confirm
    const initiateResponse = (responseType) => {
        setConfirmAction(responseType);
    };

    // 2. Actually submit when they click "Yes" in the modal
    const finalizeResponse = async () => {
        if (!confirmAction) return;

        const { data, error } = await supabase.rpc('respond_to_estimate', {
            target_ticket_id: ticketId,
            response: confirmAction
        });

        if (error) {
            addToast("Error updating estimate", "error");
            console.error(error);
        } else {
            setEstStatus(confirmAction);
            addToast(
                confirmAction === 'approved' ? "Repair Approved!" : "Estimate Declined",
                confirmAction === 'approved' ? 'success' : 'info'
            );
        }
        setConfirmAction(null); // Close modal
    };

    const grandTotal = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);

    if (loading || !estStatus || estStatus === 'draft' || items.length === 0) return null;

    return (
        <div className="mt-6 animate-pop shadow-xl rounded-xl overflow-hidden ring-1 ring-black/5 relative">

            {/* HEADER BANNER */}
            <div className={`p-5 flex justify-between items-center ${estStatus === 'approved' ? 'bg-emerald-600 text-white' :
                    estStatus === 'declined' ? 'bg-red-500 text-white' :
                        'bg-indigo-600 text-white'
                }`}>
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                        {estStatus === 'approved' ? <Check size={24} strokeWidth={3} /> :
                            estStatus === 'declined' ? <X size={24} strokeWidth={3} /> :
                                <DollarSign size={24} strokeWidth={3} />}
                    </div>
                    <div>
                        <h3 className="font-black text-lg leading-tight">
                            {estStatus === 'sent' ? 'Repair Quote' :
                                estStatus === 'approved' ? 'Quote Approved' : 'Quote Declined'}
                        </h3>
                        <p className="text-white/80 text-xs font-medium uppercase tracking-wider">
                            {estStatus === 'sent' ? 'Action Required' : 'Status Updated'}
                        </p>
                    </div>
                </div>
                <div className="text-right">
                    <span className="block text-2xl font-mono font-black tracking-tight">
                        ${grandTotal.toFixed(2)}
                    </span>
                </div>
            </div>

            {/* CONTENT BOX */}
            <div className="bg-[var(--bg-surface)] p-6">
                <div className="space-y-4 mb-8">
                    {items.map(item => (
                        <div key={item.id} className="flex justify-between items-start text-sm border-b border-[var(--border-color)] border-dashed last:border-0 pb-3 last:pb-0">
                            <div className="flex items-start gap-3">
                                <div className="mt-1 p-1 rounded-full bg-[var(--bg-subtle)] text-[var(--text-muted)]">
                                    <PenTool size={10} />
                                </div>
                                <div>
                                    <div className="font-bold text-[var(--text-main)] text-base">{item.description}</div>
                                    <div className="text-xs text-[var(--text-muted)] mt-0.5">Quantity: {item.quantity} @ ${item.unit_price}/ea</div>
                                </div>
                            </div>
                            <div className="font-mono font-bold text-[var(--text-main)] text-base">
                                ${(item.quantity * item.unit_price).toFixed(2)}
                            </div>
                        </div>
                    ))}
                </div>

                {/* ACTION BUTTONS */}
                {estStatus === 'sent' ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-[var(--border-color)]">
                        <button
                            onClick={() => initiateResponse('declined')}
                            className="btn h-12 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-red-100 hover:text-red-600 hover:border-red-200 border-transparent transition-all font-bold text-base"
                        >
                            <X size={18} /> Decline
                        </button>

                        <button
                            onClick={() => initiateResponse('approved')}
                            className="btn h-12 border-none bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-lg shadow-emerald-500/30 hover:scale-[1.02] active:scale-95 transition-all font-black text-lg uppercase tracking-wide"
                        >
                            <Check size={20} strokeWidth={3} /> Approve Repair
                        </button>
                    </div>
                ) : (
                    <div className="text-center py-3 bg-[var(--bg-subtle)] rounded-lg border border-[var(--border-color)]">
                        <span className="text-sm font-bold text-[var(--text-muted)] flex justify-center items-center gap-2">
                            <Check size={16} /> Response recorded on {new Date().toLocaleDateString()}
                        </span>
                    </div>
                )}
            </div>

            {/* --- CUSTOM CONFIRMATION MODAL --- */}
            {confirmAction && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade">
                    <div className="bg-[var(--bg-surface)] w-full max-w-sm rounded-2xl shadow-2xl p-6 border border-[var(--border-color)]">
                        <div className="flex flex-col items-center text-center space-y-3">

                            {/* Icon changes based on action */}
                            {confirmAction === 'approved' ? (
                                <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 flex items-center justify-center mb-2">
                                    <Check size={32} strokeWidth={3} />
                                </div>
                            ) : (
                                <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 flex items-center justify-center mb-2">
                                    <AlertTriangle size={32} strokeWidth={3} />
                                </div>
                            )}

                            <h3 className="text-xl font-black text-[var(--text-main)]">
                                {confirmAction === 'approved' ? 'Confirm Approval?' : 'Decline Repair?'}
                            </h3>

                            <p className="text-[var(--text-muted)] text-sm font-medium">
                                {confirmAction === 'approved'
                                    ? `You are authorizing the repair for $${grandTotal.toFixed(2)}. We will begin working on your device shortly.`
                                    : "Are you sure? Declining may delay the repair process or require picking up your device unrepaired."}
                            </p>

                            <div className="grid grid-cols-2 gap-3 w-full mt-4">
                                <button
                                    onClick={() => setConfirmAction(null)}
                                    className="btn btn-ghost text-[var(--text-muted)]"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={finalizeResponse}
                                    className={`btn text-white border-none ${confirmAction === 'approved' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-500 hover:bg-red-600'
                                        }`}
                                >
                                    Yes, {confirmAction === 'approved' ? 'Approve' : 'Decline'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}