import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Truck, Plus, Package, ExternalLink, Trash2, CheckCircle, Clock } from 'lucide-react';
import { useToast } from '../context/ToastProvider';
import { formatCurrency } from '../utils';

export default function PartsOrderManager({ ticketId, onActivityLog, onAddToEstimate }) {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isAdding, setIsAdding] = useState(false);
    const { addToast } = useToast();

    const [newOrder, setNewOrder] = useState({ part_name: '', part_number: '', vendor: '', cost: '', order_number: '', tracking_link: '' });

    useEffect(() => { fetchOrders(); }, [ticketId]);

    async function fetchOrders() {
        setLoading(true);
        const { data } = await supabase.from('parts_orders').select('*').eq('ticket_id', ticketId).order('created_at', { ascending: false });
        setOrders(data || []);
        setLoading(false);
    }

    const handleCreateOrder = async (e) => {
        e.preventDefault();
        const cost = newOrder.cost ? parseFloat(newOrder.cost) : 0;
        const { data, error } = await supabase.from('parts_orders').insert([{ ...newOrder, ticket_id: ticketId, cost: cost, status: 'ordered' }]).select();

        if (error) {
            addToast("Failed to record order", "error");
        } else {
            setOrders([data[0], ...orders]);
            setIsAdding(false);
            setNewOrder({ part_name: '', part_number: '', vendor: '', cost: '', order_number: '', tracking_link: '' });
            addToast("Order recorded", "success");
            onActivityLog('PART ORDERED', `Ordered ${newOrder.part_name} from ${newOrder.vendor}`);
        }
    };

    const updateOrderStatus = async (orderId, newStatus, partName) => {
        const { error } = await supabase.from('parts_orders').update({ status: newStatus }).eq('id', orderId);
        if (!error) {
            setOrders(orders.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
            addToast("Status updated", "success");
            if (newStatus === 'received') {
                onActivityLog('PART RECEIVED', `Received ${partName}`);
            }
        }
    };

    const handleDeleteOrder = async (orderId, partName) => {
        const { error } = await supabase.from('parts_orders').delete().eq('id', orderId);
        if (!error) {
            setOrders(orders.filter(o => o.id !== orderId));
            addToast("Order deleted", "info");
            onActivityLog('ORDER DELETED', `Removed order for ${partName}`);
        }
    };

    const getStatusStyle = (status) => {
        switch (status) {
            case 'ordered': return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200 dark:border-orange-800';
            case 'shipped': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800';
            case 'received': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800';
            default: return 'bg-[var(--bg-subtle)] text-[var(--text-muted)] border-[var(--border-color)]';
        }
    };

    return (
        <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl shadow-sm overflow-hidden flex flex-col group transition-all">

            {/* Header */}
            <div className="p-5 border-b-2 border-dashed border-[var(--border-color)] bg-[var(--bg-surface)] flex justify-between items-center z-10 relative">
                <h3 className="text-[10px] font-black uppercase text-[var(--text-main)] tracking-widest flex items-center gap-2">
                    <Truck size={16} className="text-emerald-600" /> Parts Logistics
                </h3>
                <button onClick={() => setIsAdding(!isAdding)} className={`btn btn-xs ${isAdding ? 'btn-ghost text-[var(--text-muted)]' : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 border-emerald-200 dark:border-emerald-800 shadow-sm'}`}>
                    {isAdding ? 'Cancel' : <><Plus size={12} /> Log Order</>}
                </button>
            </div>

            <div className="p-5 bg-[var(--bg-subtle)] flex-1 relative z-10">
                {/* Add Order Form */}
                {isAdding && (
                    <form onSubmit={handleCreateOrder} className="bg-[var(--bg-surface)] p-5 rounded-xl border border-[var(--border-color)] shadow-md mb-6 animate-slide-down">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-1 pl-1 block">Part Name</label>
                                <input type="text" required className="input input-sm h-10 w-full bg-[var(--bg-subtle)] border-[var(--border-color)] text-[var(--text-main)] shadow-inner focus:border-emerald-500 font-medium" value={newOrder.part_name} onChange={e => setNewOrder({ ...newOrder, part_name: e.target.value })} placeholder="e.g. Brush Roll" />
                            </div>
                            <div>
                                <label className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-1 pl-1 block">Part / SKU Number</label>
                                <input type="text" className="input input-sm h-10 w-full bg-[var(--bg-subtle)] border-[var(--border-color)] text-[var(--text-main)] shadow-inner focus:border-emerald-500 font-mono tracking-wide" value={newOrder.part_number} onChange={e => setNewOrder({ ...newOrder, part_number: e.target.value })} placeholder="Optional" />
                            </div>
                            <div>
                                <label className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-1 pl-1 block">Vendor</label>
                                <input type="text" required className="input input-sm h-10 w-full bg-[var(--bg-subtle)] border-[var(--border-color)] text-[var(--text-main)] shadow-inner focus:border-emerald-500 font-medium" value={newOrder.vendor} onChange={e => setNewOrder({ ...newOrder, vendor: e.target.value })} placeholder="e.g. Encompass" />
                            </div>
                            <div>
                                <label className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-1 pl-1 block">Our Cost</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] font-bold">$</span>
                                    <input type="number" step="0.01" className="input input-sm h-10 w-full pl-7 bg-[var(--bg-subtle)] border-[var(--border-color)] text-[var(--text-main)] shadow-inner focus:border-emerald-500 font-mono font-bold" value={newOrder.cost} onChange={e => setNewOrder({ ...newOrder, cost: e.target.value })} placeholder="0.00" />
                                </div>
                            </div>
                            <div className="sm:col-span-2">
                                <label className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-1 pl-1 block">Tracking Link (Optional)</label>
                                <input type="url" className="input input-sm h-10 w-full bg-[var(--bg-subtle)] border-[var(--border-color)] text-[var(--text-main)] shadow-inner focus:border-emerald-500 font-medium text-xs" value={newOrder.tracking_link} onChange={e => setNewOrder({ ...newOrder, tracking_link: e.target.value })} placeholder="https://..." />
                            </div>
                        </div>
                        <div className="flex justify-end pt-3 border-t border-dashed border-[var(--border-color)]">
                            <button type="submit" className="btn btn-sm bg-emerald-600 hover:bg-emerald-700 text-white shadow-md border-none px-6">Save Record</button>
                        </div>
                    </form>
                )}

                {/* Orders List */}
                {loading ? (
                    <div className="text-center py-8"><span className="loading loading-spinner text-emerald-500"></span></div>
                ) : orders.length === 0 ? (
                    <div className="text-center py-8 border-2 border-dashed border-[var(--border-color)] rounded-xl opacity-60">
                        <Package size={24} className="mx-auto text-[var(--text-muted)] mb-2" />
                        <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">No orders logged</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {orders.map(order => {
                            const statusStyle = getStatusStyle(order.status);
                            const isReceived = order.status === 'received';

                            return (
                                <div key={order.id} className="bg-[var(--bg-surface)] p-4 rounded-xl border border-[var(--border-color)] shadow-sm relative overflow-hidden group">
                                    {/* Left color bar */}
                                    <div className={`absolute left-0 top-0 bottom-0 w-1 ${isReceived ? 'bg-emerald-500' : 'bg-orange-500'}`}></div>

                                    <div className="pl-2 flex flex-col sm:flex-row justify-between gap-4">
                                        <div className="flex-1">
                                            <div className="flex items-center justify-between mb-1.5">
                                                <h4 className="font-black text-sm text-[var(--text-main)] leading-tight">{order.part_name}</h4>
                                                <div className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded shadow-sm border ${statusStyle} flex items-center gap-1`}>
                                                    {isReceived ? <CheckCircle size={10} /> : <Clock size={10} />}
                                                    {order.status}
                                                </div>
                                            </div>

                                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--text-muted)] font-medium mb-3">
                                                <span>Vendor: <strong className="text-[var(--text-main)]">{order.vendor}</strong></span>
                                                {order.part_number && <span>SKU: <strong className="font-mono text-[var(--text-main)]">{order.part_number}</strong></span>}
                                                <span>Cost: <strong className="font-mono text-[var(--text-main)]">{formatCurrency(order.cost)}</strong></span>
                                            </div>

                                            {order.tracking_link && (
                                                <a href={order.tracking_link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-indigo-500 hover:text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 px-2 py-1 rounded transition-colors">
                                                    Track Package <ExternalLink size={10} />
                                                </a>
                                            )}
                                        </div>

                                        <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 border-t sm:border-t-0 sm:border-l border-dashed border-[var(--border-color)] pt-3 sm:pt-0 sm:pl-4 w-full sm:w-auto shrink-0">
                                            <select
                                                className={`select select-sm h-8 w-32 text-[9px] font-black uppercase tracking-widest bg-[var(--bg-subtle)] text-[var(--text-main)] border border-[var(--border-color)] shadow-inner focus:border-emerald-500`}
                                                value={order.status}
                                                onChange={(e) => updateOrderStatus(order.id, e.target.value, order.part_name)}
                                            >
                                                <option value="ordered">Ordered</option>
                                                <option value="shipped">Shipped</option>
                                                <option value="received">Received</option>
                                            </select>

                                            <button
                                                onClick={() => handleDeleteOrder(order.id, order.part_name)}
                                                className="btn btn-xs btn-ghost text-[var(--text-muted)] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                                            >
                                                <Trash2 size={12} /> Remove
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}