import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Package, Truck, ExternalLink, Trash2, Plus, Calendar, DollarSign, CheckCircle, Clock, Copy } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '../context/ToastProvider';

export default function PartsOrderManager({ ticketId, onActivityLog, onAddToEstimate }) {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const { addToast } = useToast();
    const [isAdding, setIsAdding] = useState(false);

    const [newOrder, setNewOrder] = useState({
        part_name: '',
        vendor: 'Amazon',
        tracking_number: '',
        carrier: 'Amazon',
        expected_arrival: '',
        cost: ''
    });

    useEffect(() => {
        fetchOrders();
    }, [ticketId]);

    async function fetchOrders() {
        const { data } = await supabase.from('part_orders').select('*').eq('ticket_id', ticketId).order('created_at', { ascending: false });
        setOrders(data || []);
        setLoading(false);
    }

    // --- SMART CARRIER DETECTION LOGIC ---
    const detectCarrier = (number) => {
        if (!number) return null;
        const n = number.toUpperCase().replace(/\s/g, ''); // Clean spaces

        if (n.startsWith('1Z')) return 'UPS';
        if (n.startsWith('TBA') || n.startsWith('TBC') || n.startsWith('TBM')) return 'Amazon';
        if (n.length === 22 && n.startsWith('9')) return 'USPS'; // Common USPS format
        if (n.length === 20 || n.length === 22) return 'USPS';   // Other USPS formats
        if (n.length === 12 || n.length === 15) return 'FedEx';  // Common FedEx formats
        if (n.length === 10) return 'DHL';

        return null; // No clear match found
    };

    const handleTrackingChange = (val) => {
        const detected = detectCarrier(val);
        setNewOrder(prev => ({
            ...prev,
            tracking_number: val,
            // Only auto-switch if we found a match, otherwise leave it alone
            carrier: detected || prev.carrier
        }));
    };

    const getTrackingLink = (carrier, number) => {
        if (!number) return null;
        const n = number.trim();
        switch (carrier) {
            case 'UPS': return `https://www.ups.com/track?tracknum=${n}`;
            case 'USPS': return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${n}`;
            case 'FedEx': return `https://www.fedex.com/fedextrack/?trknbr=${n}`;
            case 'DHL': return `https://www.dhl.com/en/express/tracking.html?AWB=${n}`;
            case 'Amazon': return `https://www.amazon.com/progress-tracker/package/ref=ppx_yo_dt_b_track_package?itemId=${n}`;
            default: return `https://www.google.com/search?q=${n}`;
        }
    };

    const handleAddOrder = async () => {
        if (!newOrder.part_name) return;

        const { data, error } = await supabase.from('part_orders').insert([{
            ticket_id: ticketId,
            part_name: newOrder.part_name,
            vendor: newOrder.vendor,
            tracking_number: newOrder.tracking_number,
            carrier: newOrder.carrier,
            expected_arrival: newOrder.expected_arrival || null,
            cost: parseFloat(newOrder.cost) || 0
        }]).select().single();

        if (error) {
            addToast("Failed to add order", "error");
        } else {
            setOrders([data, ...orders]);
            setIsAdding(false);
            setNewOrder({ part_name: '', vendor: 'Amazon', tracking_number: '', carrier: 'Amazon', expected_arrival: '', cost: '' });
            if (onActivityLog) onActivityLog('PART ORDERED', `Ordered ${data.part_name} from ${data.vendor}`);
            addToast("Part order tracked", "success");
        }
    };

    const handleDelete = async (id, name) => {
        const { error } = await supabase.from('part_orders').delete().eq('id', id);
        if (!error) {
            setOrders(orders.filter(o => o.id !== id));
            if (onActivityLog) onActivityLog('ORDER REMOVED', `Removed tracking for ${name}`);
        }
    };

    const updateStatus = async (id, newStatus) => {
        const { error } = await supabase.from('part_orders').update({ status: newStatus }).eq('id', id);
        if (!error) {
            setOrders(orders.map(o => o.id === id ? { ...o, status: newStatus } : o));
        }
    };

    const sendToEstimate = async (order) => {
        if (!order) return;

        const { error } = await supabase.from('estimate_items').insert([{
            ticket_id: ticketId,
            description: `${order.part_name} (${order.vendor})`,
            part_cost: order.cost || 0,
            labor_cost: 0
        }]);

        if (error) {
            addToast("Failed to add to bill", "error");
        } else {
            addToast("Added to Repair Bill", "success");
            if (onActivityLog) onActivityLog('ESTIMATE ADD', `Added ${order.part_name} from Parts Manager`);
            if (onAddToEstimate) onAddToEstimate();
        }
    };

    if (loading) return <div className="p-4 text-center"><span className="loading loading-spinner loading-sm text-primary"></span></div>;

    return (
        <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border-color)] overflow-hidden shadow-sm mt-6 animate-fade-in-up">
            <div className="bg-[var(--bg-subtle)] px-6 py-4 border-b border-[var(--border-color)] flex justify-between items-center">
                <h2 className="text-xs font-bold uppercase text-[var(--text-muted)] tracking-widest flex items-center gap-2">
                    <Package size={16} /> Parts & Special Orders
                </h2>
                <button onClick={() => setIsAdding(!isAdding)} className="btn btn-sm btn-ghost gap-2 text-indigo-600 font-bold hover:bg-indigo-50 dark:hover:bg-indigo-900/20">
                    <Plus size={16} /> {isAdding ? 'Cancel' : 'Track Part'}
                </button>
            </div>

            <div className="p-6">
                {isAdding && (
                    <div className="mb-6 p-4 bg-[var(--bg-subtle)] rounded-xl border border-indigo-200 dark:border-indigo-900/50 animate-fade-in-up">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div className="form-control">
                                <label className="label text-xs font-bold uppercase text-[var(--text-muted)]">Part Name</label>
                                <input type="text" className="input input-bordered h-10 font-bold bg-[var(--bg-surface)] text-[var(--text-main)]" placeholder="e.g. Dyson Motor Assembly" value={newOrder.part_name} onChange={e => setNewOrder({ ...newOrder, part_name: e.target.value })} />
                            </div>
                            <div className="form-control">
                                <label className="label text-xs font-bold uppercase text-[var(--text-muted)]">Vendor</label>
                                <input type="text" className="input input-bordered h-10 bg-[var(--bg-surface)] text-[var(--text-main)]" placeholder="e.g. Amazon" value={newOrder.vendor} onChange={e => setNewOrder({ ...newOrder, vendor: e.target.value })} />
                            </div>

                            {/* TRACKING NUMBER INPUT (Now with Auto-Detect) */}
                            <div className="form-control">
                                <label className="label text-xs font-bold uppercase text-[var(--text-muted)]">Tracking Number</label>
                                <input
                                    type="text"
                                    className="input input-bordered h-10 font-mono bg-[var(--bg-surface)] text-[var(--text-main)]"
                                    placeholder="1Z99... or TBA..."
                                    value={newOrder.tracking_number}
                                    onChange={e => handleTrackingChange(e.target.value)}
                                />
                            </div>

                            <div className="form-control">
                                <label className="label text-xs font-bold uppercase text-[var(--text-muted)]">Cost ($)</label>
                                <input type="number" className="input input-bordered h-10 bg-[var(--bg-surface)] text-[var(--text-main)]" placeholder="0.00" value={newOrder.cost} onChange={e => setNewOrder({ ...newOrder, cost: e.target.value })} />
                            </div>

                            <div className="grid grid-cols-2 gap-2 md:col-span-2">
                                <div className="form-control">
                                    <label className="label text-xs font-bold uppercase text-[var(--text-muted)]">Carrier</label>
                                    <select className="select select-bordered h-10 bg-[var(--bg-surface)] text-[var(--text-main)]" value={newOrder.carrier} onChange={e => setNewOrder({ ...newOrder, carrier: e.target.value })}>
                                        <option>Amazon</option>
                                        <option>UPS</option>
                                        <option>USPS</option>
                                        <option>FedEx</option>
                                        <option>DHL</option>
                                        <option>Other</option>
                                    </select>
                                </div>
                                <div className="form-control">
                                    <label className="label text-xs font-bold uppercase text-[var(--text-muted)]">Est. Arrival</label>
                                    <input type="date" className="input input-bordered h-10 bg-[var(--bg-surface)] text-[var(--text-main)]" value={newOrder.expected_arrival} onChange={e => setNewOrder({ ...newOrder, expected_arrival: e.target.value })} />
                                </div>
                            </div>
                        </div>
                        <button onClick={handleAddOrder} className="btn btn-sm btn-gradient text-white w-full h-10 font-bold shadow-md">Save & Track</button>
                    </div>
                )}

                {orders.length === 0 && !isAdding ? (
                    <p className="text-sm text-[var(--text-muted)] italic text-center">No parts on order for this ticket.</p>
                ) : (
                    <div className="space-y-3">
                        {orders.map(order => (
                            <div key={order.id} className="flex flex-col md:flex-row md:items-center justify-between p-3 rounded-lg border border-[var(--border-color)] bg-[var(--bg-surface)] hover:shadow-md transition-shadow group">
                                <div className="flex-1 mb-2 md:mb-0">
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-[var(--text-main)] text-sm md:text-base">{order.part_name}</span>
                                        <span className="badge badge-sm badge-neutral">{order.vendor}</span>
                                    </div>
                                    <div className="flex items-center gap-4 mt-1 text-xs text-[var(--text-muted)]">
                                        <div className="flex items-center gap-1">
                                            <Truck size={12} /> {order.carrier}: <span className="font-mono">{order.tracking_number || 'No Tracking #'}</span>
                                        </div>
                                        {order.expected_arrival && (
                                            <div className="flex items-center gap-1 text-indigo-600 font-bold">
                                                <Calendar size={12} /> Arriving: {format(new Date(order.expected_arrival), 'MMM dd')}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <select
                                        className={`select select-bordered h-9 min-h-0 text-xs font-black uppercase tracking-wide border-2 focus:outline-none ${order.status === 'delivered' ? 'text-emerald-600 border-emerald-200 bg-emerald-50 dark:bg-emerald-900/20' : 'text-amber-600 border-amber-200 bg-amber-50 dark:bg-amber-900/20'}`}
                                        value={order.status}
                                        onChange={(e) => updateStatus(order.id, e.target.value)}
                                    >
                                        <option value="ordered">Ordered</option>
                                        <option value="shipped">Shipped</option>
                                        <option value="delivered">Delivered</option>
                                    </select>

                                    {order.tracking_number && (
                                        <a
                                            href={getTrackingLink(order.carrier, order.tracking_number)}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="btn btn-sm btn-square btn-ghost text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 h-9 w-9"
                                            title="Track Package"
                                        >
                                            <ExternalLink size={16} />
                                        </a>
                                    )}

                                    <button
                                        onClick={() => sendToEstimate(order)}
                                        className="btn btn-sm btn-square btn-ghost text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 h-9 w-9 tooltip tooltip-left flex items-center justify-center"
                                        data-tip="Add to Repair Bill"
                                    >
                                        <DollarSign size={16} />
                                    </button>

                                    <button onClick={() => handleDelete(order.id, order.part_name)} className="btn btn-sm btn-square btn-ghost text-red-400 hover:text-red-600 hover:bg-red-50 h-9 w-9 flex items-center justify-center">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}