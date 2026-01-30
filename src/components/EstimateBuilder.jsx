import React, { useState, useEffect } from 'react';
import { Plus, Trash2, DollarSign, Send, CheckCircle } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useToast } from '../context/ToastProvider';

export default function EstimateBuilder({ ticketId, onTotalChange }) {
    const { addToast } = useToast();
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [estStatus, setEstStatus] = useState('draft');

    // NEW: We need ticket details for the email
    const [ticketDetails, setTicketDetails] = useState(null);
    const [isSending, setIsSending] = useState(false);

    const [newItem, setNewItem] = useState({ description: '', quantity: 1, unit_price: '' });

    useEffect(() => { fetchItems(); }, [ticketId]);

    const fetchItems = async () => {
        // 1. Fetch Line Items
        const { data: lineItems } = await supabase
            .from('ticket_line_items')
            .select('*')
            .eq('ticket_id', ticketId)
            .order('created_at', { ascending: true });

        // 2. Fetch Ticket Info (Status + Customer Data for Email)
        const { data: ticketData } = await supabase
            .from('tickets')
            .select('estimate_status, customer_name, brand, model') // <--- Added fields
            .eq('id', ticketId)
            .single();

        if (lineItems) setItems(lineItems);
        if (ticketData) {
            setEstStatus(ticketData.estimate_status || 'draft');
            setTicketDetails(ticketData); // Save details for email
        }

        setLoading(false);
        calculateTotal(lineItems || []);
    };

    const calculateTotal = (currentItems) => {
        const total = currentItems?.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0) || 0;
        if (onTotalChange) onTotalChange(total);
    };

    const handleAddItem = async () => {
        if (!newItem.description || !newItem.unit_price) return;
        const qty = parseInt(newItem.quantity) || 1;
        const price = parseFloat(newItem.unit_price) || 0;

        const { data, error } = await supabase
            .from('ticket_line_items')
            .insert([{ ticket_id: ticketId, description: newItem.description, quantity: qty, unit_price: price }])
            .select().single();

        if (error) {
            addToast('Error adding item', 'error');
        } else {
            const updated = [...items, data];
            setItems(updated);
            setNewItem({ description: '', quantity: 1, unit_price: '' });
            calculateTotal(updated);
        }
    };

    const handleDelete = async (itemId) => {
        const { error } = await supabase.from('ticket_line_items').delete().eq('id', itemId);
        if (!error) {
            const updated = items.filter(i => i.id !== itemId);
            setItems(updated);
            calculateTotal(updated);
        }
    };

    // --- NEW: THE EMAIL SENDER FUNCTION ---
    const handleSendEstimate = async () => {
        if (!ticketDetails) return;
        setIsSending(true);

        const grandTotal = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
        const estimateLink = `${window.location.origin}/ticket/${ticketId}`;

        // 1. Prepare Email HTML
        const emailHtml = `
            <div style="font-family: sans-serif; color: #333; max-width: 600px;">
                <h2>Estimate Ready for Approval</h2>
                <p>Hello <strong>${ticketDetails.customer_name}</strong>,</p>
                <p>We have diagnosed your <strong>${ticketDetails.brand} ${ticketDetails.model}</strong>.</p>
                <p style="font-size: 18px;">Total Estimate: <strong style="color: #059669;">$${grandTotal.toFixed(2)}</strong></p>
                <p>Please review the details and approve the repair so we can get started.</p>
                <br/>
                <a href="${estimateLink}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">View & Approve Estimate</a>
                <br/><br/>
                <hr style="border: 0; border-top: 1px solid #eee;" />
                <p style="font-size: 12px; color: #666;">Universal Vacuum Repair Shop</p>
            </div>
        `;

        try {
            // 2. Call our Vercel Backend
            const response = await fetch('/api/send-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    // TEST MODE: Hardcode YOUR email here until you own a domain
                    to: 'janmmarte16@gmail.com', // <---CHANGE THIS FOR TESTING
                    subject: `Repair Estimate for Ticket #${ticketId}`,
                    html: emailHtml
                })
            });

            if (!response.ok) throw new Error('Failed to send email');

            // 3. If email succeeds, update status in DB
            await updateEstimateStatus('sent');
            addToast('Estimate emailed to customer!', 'success');

        } catch (error) {
            console.error(error);
            addToast('Could not send email. Try again.', 'error');
        } finally {
            setIsSending(false);
        }
    };

    const updateEstimateStatus = async (newStatus) => {
        const { error } = await supabase.from('tickets').update({ estimate_status: newStatus }).eq('id', ticketId);
        if (!error) {
            setEstStatus(newStatus);
            if (newStatus !== 'sent') addToast('Status updated', 'success');
        }
    };

    const grandTotal = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);

    if (loading) return <div className="text-xs opacity-50">Loading...</div>;

    return (
        <div className="bg-[var(--bg-subtle)] rounded-xl border border-[var(--border-color)] overflow-hidden mt-4 shadow-sm animate-fade-in-up">

            {/* Header */}
            <div className="bg-[var(--bg-surface)] p-4 border-b border-[var(--border-color)] flex justify-between items-center">
                <h3 className="font-black text-[var(--text-main)] flex items-center gap-2 text-sm uppercase tracking-wide">
                    <DollarSign size={18} className="text-emerald-500" /> Repair Estimate
                </h3>
                <div className="flex items-center gap-3">
                    {estStatus === 'approved' && <span className="badge badge-success font-bold text-white">APPROVED</span>}
                    {estStatus === 'declined' && <span className="badge badge-error font-bold text-white">DECLINED</span>}
                    {estStatus === 'sent' && <span className="badge badge-info font-bold text-white">SENT</span>}

                    <span className="text-xl font-mono font-bold text-emerald-600">
                        ${grandTotal.toFixed(2)}
                    </span>
                </div>
            </div>

            {/* Items List */}
            <div className="p-4 space-y-3">
                {items.map(item => (
                    <div key={item.id} className="flex justify-between items-center bg-[var(--bg-surface)] p-3 rounded-lg border border-[var(--border-color)] shadow-sm">
                        <div className="flex-1">
                            <div className="font-bold text-[var(--text-main)] text-base">{item.description}</div>
                            <div className="text-sm text-[var(--text-muted)]">Qty: {item.quantity} × ${item.unit_price}</div>
                        </div>
                        <div className="flex items-center gap-4">
                            <span className="font-mono font-bold text-[var(--text-main)]">
                                ${(item.quantity * item.unit_price).toFixed(2)}
                            </span>
                            {estStatus === 'draft' && (
                                <button onClick={() => handleDelete(item.id)} className="text-red-400 hover:text-red-600 transition-colors btn btn-sm btn-ghost btn-circle">
                                    <Trash2 size={16} />
                                </button>
                            )}
                        </div>
                    </div>
                ))}

                {items.length === 0 && (
                    <div className="text-center py-6 text-[var(--text-muted)] italic text-sm">
                        No items added yet. Add parts or labor below.
                    </div>
                )}
            </div>

            {/* Add Item Form (Only show if Draft) */}
            {estStatus === 'draft' ? (
                <>
                    <div className="p-4 bg-[var(--bg-surface)] border-t border-[var(--border-color)] grid grid-cols-12 gap-3">
                        <div className="col-span-6">
                            <input
                                type="text"
                                placeholder="Description (e.g. Belt)"
                                className="input input-bordered input-sm w-full font-medium"
                                value={newItem.description}
                                onChange={e => setNewItem({ ...newItem, description: e.target.value })}
                            />
                        </div>
                        <div className="col-span-2">
                            <input
                                type="number"
                                placeholder="Qty"
                                className="input input-bordered input-sm w-full text-center"
                                value={newItem.quantity}
                                onChange={e => setNewItem({ ...newItem, quantity: e.target.value })}
                            />
                        </div>
                        <div className="col-span-3">
                            <input
                                type="number"
                                placeholder="Price"
                                className="input input-bordered input-sm w-full"
                                value={newItem.unit_price}
                                onChange={e => setNewItem({ ...newItem, unit_price: e.target.value })}
                                onKeyDown={e => e.key === 'Enter' && handleAddItem()}
                            />
                        </div>
                        <div className="col-span-1">
                            <button
                                onClick={handleAddItem}
                                className="btn btn-sm btn-gradient w-full text-white shadow-md"
                            >
                                <Plus size={18} />
                            </button>
                        </div>
                    </div>

                    {/* ACTION BAR: Send Quote */}
                    {items.length > 0 && (
                        <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 border-t border-indigo-100 dark:border-indigo-800 flex justify-end">
                            <button
                                onClick={handleSendEstimate} // <--- CONNECTED THE FUNCTION HERE
                                disabled={isSending}
                                className="btn btn-sm btn-primary gap-2 text-white shadow-lg shadow-indigo-500/30"
                            >
                                {isSending ? <span className="loading loading-spinner loading-xs"></span> : <Send size={16} />}
                                {isSending ? 'Sending...' : 'Send Quote to Customer'}
                            </button>
                        </div>
                    )}
                </>
            ) : (
                /* LOCKED STATE BAR */
                <div className="p-3 bg-gray-50 dark:bg-gray-800/50 border-t border-[var(--border-color)] flex justify-between items-center text-sm">
                    <span className="text-[var(--text-muted)] font-medium flex items-center gap-2">
                        <CheckCircle size={16} /> Quote status: <span className="uppercase font-bold">{estStatus}</span>
                    </span>
                    {estStatus === 'sent' && (
                        <button onClick={() => updateEstimateStatus('draft')} className="btn btn-xs btn-ghost text-indigo-500 hover:underline">
                            Unsend / Edit
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}