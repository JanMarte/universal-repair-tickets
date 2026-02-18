import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { CheckCircle, XCircle, DollarSign, AlertTriangle, Clock } from 'lucide-react';
import { useToast } from '../context/ToastProvider';

export default function CustomerEstimateView({ ticketId }) {
    const { addToast } = useToast();
    const [items, setItems] = useState([]);
    const [status, setStatus] = useState('draft');
    const [loading, setLoading] = useState(true);
    const [ticketInfo, setTicketInfo] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);

    useEffect(() => {
        fetchData();
    }, [ticketId]);

    const fetchData = async () => {
        // 1. Get Items (Fixed table name to match EstimateBuilder)
        const { data: lineItems } = await supabase
            .from('estimate_items')
            .select('*')
            .eq('ticket_id', ticketId);

        // 2. Get Ticket Status & Info
        const { data: ticket } = await supabase
            .from('tickets')
            .select('estimate_status, customer_name, brand, model')
            .eq('id', ticketId)
            .single();

        setItems(lineItems || []);
        if (ticket) {
            setStatus(ticket.estimate_status || 'draft');
            setTicketInfo(ticket);
        }
        setLoading(false);
    };

    const handleDecision = async (decision) => {
        setIsProcessing(true);
        const newStatus = decision === 'approve' ? 'approved' : 'declined';

        const { error } = await supabase
            .from('tickets')
            .update({ estimate_status: newStatus })
            .eq('id', ticketId);

        if (error) {
            addToast("Error updating status. Please try again.", "error");
            setIsProcessing(false);
            return;
        }

        // --- NEW: LOG DECISION TO THE TICKET AUDIT FEED ---
        await supabase.from('audit_logs').insert([{
            ticket_id: ticketId,
            actor_name: ticketInfo?.customer_name || 'Customer',
            action: newStatus === 'approved' ? 'ESTIMATE APPROVED' : 'ESTIMATE DECLINED',
            details: newStatus === 'approved'
                ? 'Customer digitally approved the repair estimate.'
                : 'Customer declined the repair estimate.',
        }]);

        // Fixed pricing calculation to match EstimateBuilder schema
        const grandTotal = items.reduce((sum, item) => sum + (item.part_cost || 0) + (item.labor_cost || 0), 0);

        const emailSubject = decision === 'approve'
            ? `✅ APPROVED: Ticket #${ticketId} ($${grandTotal.toFixed(2)})`
            : `❌ DECLINED: Ticket #${ticketId}`;

        const emailHtml = `
            <div style="font-family: sans-serif; color: #333;">
                <h2>Customer Response Received</h2>
                <p><strong>Customer:</strong> ${ticketInfo?.customer_name}</p>
                <p><strong>Device:</strong> ${ticketInfo?.brand} ${ticketInfo?.model}</p>
                <p><strong>Decision:</strong> <span style="font-weight:bold; color: ${decision === 'approve' ? 'green' : 'red'};">${decision.toUpperCase()}</span></p>
                <br/>
                <p>Go to dashboard to proceed with repair or return device.</p>
            </div>
        `;

        try {
            await fetch('/api/send-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    to: 'YOUR_PERSONAL_EMAIL@GMAIL.COM', // <--- CHANGE THIS TO YOUR EMAIL
                    subject: emailSubject,
                    html: emailHtml
                })
            });

            setStatus(newStatus);
            addToast(decision === 'approve' ? "Thank you! We will start repairs." : "Estimate declined.", "success");
        } catch (err) {
            console.error("Email notification failed", err);
            setStatus(newStatus);
        } finally {
            setIsProcessing(false);
        }
    };

    const grandTotal = items.reduce((sum, item) => sum + (item.part_cost || 0) + (item.labor_cost || 0), 0);

    if (loading) return <div className="p-4 text-center text-sm opacity-50">Loading Estimate...</div>;

    // --- NEW: DRAFT STATE HANDLING ---
    // If the estimate isn't explicitly pushed to the customer yet, show them this loading card.
    if (status === 'draft' || !status) {
        return (
            <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border-color)] overflow-hidden shadow-sm mt-6 p-8 text-center animate-fade-in-up">
                <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner">
                    <Clock size={28} />
                </div>
                <h3 className="font-black text-lg text-[var(--text-main)] mb-2">Estimate in Progress</h3>
                <p className="text-sm text-[var(--text-muted)] max-w-md mx-auto leading-relaxed">
                    Our technicians are actively working on diagnosing your device and preparing a repair estimate. You will be able to review and approve the costs here once it is ready.
                </p>
            </div>
        );
    }

    if (items.length === 0) return null;

    return (
        <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border-color)] overflow-hidden shadow-lg mt-6 animate-fade-in-up">
            <div className="p-6 bg-indigo-600 text-white">
                <h3 className="font-bold text-lg flex items-center gap-2">
                    <DollarSign size={20} /> Repair Estimate Review
                </h3>
                <p className="text-indigo-100 text-sm mt-1">Please review the costs below to proceed.</p>
            </div>

            <div className="p-6">
                <div className="space-y-4 mb-6">
                    {items.map(item => (
                        <div key={item.id} className="flex justify-between items-center border-b border-[var(--border-color)] pb-3 last:border-0">
                            <div>
                                <div className="font-bold text-[var(--text-main)] text-sm md:text-base">{item.description}</div>
                                {item.sku && <div className="text-xs text-[var(--text-muted)] font-mono mt-0.5">#{item.sku}</div>}
                            </div>
                            <div className="font-mono font-bold text-[var(--text-main)] text-lg">
                                ${((item.part_cost || 0) + (item.labor_cost || 0)).toFixed(2)}
                            </div>
                        </div>
                    ))}
                    <div className="flex justify-between items-center pt-4 border-t-2 border-[var(--border-color)]">
                        <span className="font-black text-lg text-[var(--text-main)]">TOTAL</span>
                        <span className="font-black text-2xl text-emerald-600">${grandTotal.toFixed(2)}</span>
                    </div>
                </div>

                {status === 'sent' ? (
                    <div className="flex gap-4">
                        <button
                            onClick={() => handleDecision('decline')}
                            disabled={isProcessing}
                            className="flex-1 btn btn-outline border-red-200 text-red-500 hover:bg-red-50 hover:border-red-500"
                        >
                            {isProcessing ? '...' : <><XCircle /> Decline Repair</>}
                        </button>
                        <button
                            onClick={() => handleDecision('approve')}
                            disabled={isProcessing}
                            className="flex-1 btn btn-primary text-white shadow-lg shadow-indigo-500/30"
                        >
                            {isProcessing ? <span className="loading loading-spinner"></span> : <><CheckCircle /> Approve Repair</>}
                        </button>
                    </div>
                ) : (
                    <div className={`p-4 rounded-lg text-center font-bold text-lg flex flex-col items-center gap-2 ${status === 'approved' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                        {status === 'approved' ? <CheckCircle size={40} /> : <AlertTriangle size={40} />}
                        {status === 'approved' ? 'You approved this repair!' : 'You declined this repair.'}
                        <span className="text-sm font-normal opacity-80">
                            {status === 'approved' ? 'Our technicians have been notified.' : 'No work will be performed.'}
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
}