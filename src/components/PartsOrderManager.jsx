import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Package, Truck, Calendar, DollarSign, Plus, X, ExternalLink, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '../context/ToastProvider';
import { formatCurrency } from '../utils';

export default function PartsOrderManager({ ticketId, onActivityLog, onAddToEstimate }) {
    const { addToast } = useToast();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);

    // UI State
    const [showAddModal, setShowAddModal] = useState(false);

    const [newOrder, setNewOrder] = useState({
        part_name: '',
        vendor: '',
        order_number: '',
        tracking_number: '',
        cost: '',
        status: 'ordered'
    });

    useEffect(() => {
        fetchOrders();
    }, [ticketId]);

    async function fetchOrders() {
        const { data, error } = await supabase
            .from('parts_orders')
            .select('*')
            .eq('ticket_id', ticketId)
            .order('created_at', { ascending: false });

        if (!error) setOrders(data || []);
        setLoading(false);
    }

    const handleAddOrder = async () => {
        if (!newOrder.part_name) return;

        const { data, error } = await supabase.from('parts_orders').insert([{
            ticket_id: ticketId,
            ...newOrder,
            cost: parseFloat(newOrder.cost) || 0
        }]).select().single();

        if (error) {
            addToast("Failed to track part", "error");
        } else {
            setOrders([data, ...orders]);
            setShowAddModal(false);
            setNewOrder({ part_name: '', vendor: '', order_number: '', tracking_number: '', cost: '', status: 'ordered' });

            if (onActivityLog) onActivityLog('PART ORDERED', `Ordered ${newOrder.part_name} from ${newOrder.vendor}`);
            addToast("Part order tracked", "success");
        }
    };

    const updateStatus = async (orderId, newStatus) => {
        const { error } = await supabase
            .from('parts_orders')
            .update({ status: newStatus })
            .eq('id', orderId);

        if (!error) {
            setOrders(orders.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
            if (newStatus === 'received') {
                if (onActivityLog) onActivityLog('PART RECEIVED', 'Part shipment arrived');
                if (onAddToEstimate) onAddToEstimate();
            }
        }
    };

    const handleDelete = async (id) => {
        if (!confirm("Remove this order tracking?")) return;
        await supabase.from('parts_orders').delete().eq('id', id);
        setOrders(orders.filter(o => o.id !== id));
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'ordered': return <span className="badge badge-warning text-xs font-bold uppercase">Ordered</span>;
            case 'shipped': return <span className="badge badge-info text-xs font-bold uppercase">Shipped</span>;
            case 'received': return <span className="badge badge-success text-white text-xs font-bold uppercase">Received</span>;
            default: return <span className="badge badge-ghost text-xs">Unknown</span>;
        }
    };

    return (
        <>
            {/* --- MAIN CARD CONTAINER --- */}
            <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border-color)] overflow-hidden shadow-sm mt-6 animate-fade-in-up">

                {/* DISTINCT SLATE HEADER */}
                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-b border-[var(--border-color)] flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <Package size={18} className="text-indigo-600" />
                        <h3 className="font-bold text-[var(--text-main)] text-sm uppercase tracking-wide">Parts & Special Orders</h3>
                    </div>
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="btn btn-sm btn-ghost gap-2 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30"
                    >
                        <Plus size={16} /> <span className="hidden sm:inline font-bold">Track Part</span>
                    </button>
                </div>

                <div className="p-0">
                    {orders.length === 0 ? (
                        <div className="p-8 text-center text-[var(--text-muted)] italic opacity-60">
                            No parts on order for this ticket.
                        </div>
                    ) : (
                        <div className="divide-y divide-[var(--border-color)]">
                            {orders.map(order => (
                                <div key={order.id} className="p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[var(--bg-surface)] hover:bg-[var(--bg-subtle)] transition-colors">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-black text-[var(--text-main)]">{order.part_name}</span>
                                            {getStatusBadge(order.status)}
                                        </div>
                                        <div className="text-xs text-[var(--text-muted)] flex flex-wrap gap-x-4 gap-y-1">
                                            <span className="flex items-center gap-1"><Truck size={12} /> {order.vendor || 'Unknown Vendor'}</span>
                                            {order.tracking_number && (
                                                <span className="flex items-center gap-1 font-mono text-indigo-500">
                                                    <ExternalLink size={10} /> {order.tracking_number}
                                                </span>
                                            )}
                                            <span className="flex items-center gap-1 text-[var(--text-main)] font-bold">
                                                <DollarSign size={12} /> {formatCurrency(order.cost)}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 w-full md:w-auto">
                                        <select
                                            className="select select-bordered select-xs w-full md:w-32 font-bold"
                                            value={order.status}
                                            onChange={(e) => updateStatus(order.id, e.target.value)}
                                        >
                                            <option value="ordered">Ordered</option>
                                            <option value="shipped">Shipped</option>
                                            <option value="received">Received</option>
                                        </select>
                                        <button onClick={() => handleDelete(order.id)} className="btn btn-ghost btn-xs btn-square text-red-400 hover:text-red-600">
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* --- ADD ORDER MODAL (Now Outside the Container) --- */}
            {showAddModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade">
                    <div className="bg-[var(--bg-surface)] w-full max-w-md rounded-2xl shadow-2xl border border-[var(--border-color)] overflow-hidden animate-pop">
                        <div className="p-4 border-b border-[var(--border-color)] bg-[var(--bg-subtle)] flex justify-between items-center">
                            <h3 className="font-black text-lg text-[var(--text-main)]">Track New Order</h3>
                            <button onClick={() => setShowAddModal(false)} className="btn btn-sm btn-circle btn-ghost"><X size={20} /></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="label text-xs font-bold text-[var(--text-muted)]">Part Name</label>
                                <input
                                    type="text"
                                    className="input input-bordered w-full bg-[var(--bg-surface)] text-[var(--text-main)]"
                                    placeholder="e.g. Dyson V11 Motor"
                                    value={newOrder.part_name}
                                    onChange={e => setNewOrder({ ...newOrder, part_name: e.target.value })}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="label text-xs font-bold text-[var(--text-muted)]">Vendor</label>
                                    <input
                                        type="text"
                                        className="input input-bordered w-full bg-[var(--bg-surface)] text-[var(--text-main)]"
                                        placeholder="e.g. Amazon"
                                        value={newOrder.vendor}
                                        onChange={e => setNewOrder({ ...newOrder, vendor: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="label text-xs font-bold text-[var(--text-muted)]">Cost ($)</label>
                                    <input
                                        type="number"
                                        className="input input-bordered w-full bg-[var(--bg-surface)] text-[var(--text-main)]"
                                        placeholder="0.00"
                                        value={newOrder.cost}
                                        onChange={e => setNewOrder({ ...newOrder, cost: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="label text-xs font-bold text-[var(--text-muted)]">Tracking Number (Optional)</label>
                                <input
                                    type="text"
                                    className="input input-bordered w-full bg-[var(--bg-surface)] text-[var(--text-main)] font-mono"
                                    placeholder="Tracking #"
                                    value={newOrder.tracking_number}
                                    onChange={e => setNewOrder({ ...newOrder, tracking_number: e.target.value })}
                                />
                            </div>
                            <button onClick={handleAddOrder} className="btn btn-gradient w-full text-white mt-4">
                                Start Tracking
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}