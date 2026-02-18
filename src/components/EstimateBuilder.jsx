import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Plus, Trash2, DollarSign, Box, MapPin, Hash, RotateCcw, Wrench, PenTool } from 'lucide-react';
import { formatCurrency } from '../utils';
import { useToast } from '../context/ToastProvider';

export default function EstimateBuilder({ ticketId, onTotalChange, onActivityLog, refreshTrigger, estimateStatus = 'draft', onUpdateStatus }) {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const { addToast } = useToast();

    // New Item Form
    const [newItem, setNewItem] = useState({ description: '', part_cost: '', labor_cost: '' });

    // State for "Restock Confirmation"
    const [itemToDelete, setItemToDelete] = useState(null);

    // REFRESH LOGIC
    useEffect(() => {
        fetchItems();
    }, [ticketId, refreshTrigger]);

    useEffect(() => {
        // STOP: Don't report totals while we are still fetching data.
        if (loading) return;

        const total = items.reduce((sum, item) => sum + (item.part_cost || 0) + (item.labor_cost || 0), 0);
        if (onTotalChange) onTotalChange(total);
    }, [items, loading]);

    async function fetchItems() {
        const { data } = await supabase.from('estimate_items').select('*').eq('ticket_id', ticketId).order('created_at');
        setItems(data || []);
        setLoading(false);
    }

    const handleAddItem = async () => {
        if (!newItem.description) return;

        const partCost = parseFloat(newItem.part_cost) || 0;
        const laborCost = parseFloat(newItem.labor_cost) || 0;

        const { data, error } = await supabase.from('estimate_items').insert([{
            ticket_id: ticketId,
            description: newItem.description,
            part_cost: partCost,
            labor_cost: laborCost
        }]).select().single();

        if (error) {
            addToast("Failed to add item", "error");
        } else {
            setItems([...items, data]);
            setNewItem({ description: '', part_cost: '', labor_cost: '' });
            if (onActivityLog) onActivityLog('ESTIMATE ADD', `Added item: ${newItem.description} ($${partCost + laborCost})`);
        }
    };

    // --- SMART DELETE HANDLER ---
    const initiateDelete = (item) => {
        if (item.inventory_id) {
            setItemToDelete(item);
        } else {
            performDelete(item.id, false);
        }
    };

    const performDelete = async (itemId, restock) => {
        const itemToRemove = items.find(i => i.id === itemId);
        if (!itemToRemove) return;

        try {
            // 1. Restock logic
            if (restock && itemToRemove.inventory_id) {
                const { data: currentInv } = await supabase.from('inventory').select('quantity').eq('id', itemToRemove.inventory_id).single();
                if (currentInv) {
                    await supabase.from('inventory').update({ quantity: currentInv.quantity + 1 }).eq('id', itemToRemove.inventory_id);
                    addToast("Item returned to inventory", "info");
                }
            }

            // 2. Delete item
            const { error } = await supabase.from('estimate_items').delete().eq('id', itemId);
            if (error) throw error;

            setItems(items.filter(i => i.id !== itemId));
            setItemToDelete(null);

            if (onActivityLog) {
                const action = restock ? 'PART RESTOCKED' : 'ESTIMATE REMOVE';
                const note = restock
                    ? `Removed ${itemToRemove.description} and returned to stock`
                    : `Removed item: ${itemToRemove.description}`;
                onActivityLog(action, note);
            }

        } catch (error) {
            console.error(error);
            addToast("Failed to remove item", "error");
        }
    };

    const grandTotal = items.reduce((sum, item) => sum + (item.part_cost || 0) + (item.labor_cost || 0), 0);

    if (loading) return <div className="p-4 text-center"><span className="loading loading-spinner text-primary"></span></div>;

    return (
        <div className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-color)] overflow-hidden shadow-sm relative flex flex-col transition-all duration-300 hover:shadow-md">

            {/* --- 1. DISTINCT HEADER --- */}
            <div className="px-5 py-4 bg-slate-50 dark:bg-slate-800/50 border-b border-[var(--border-color)] flex justify-between items-center shrink-0">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-lg">
                        <DollarSign size={18} />
                    </div>
                    <div>
                        <h3 className="font-black text-[var(--text-main)] text-sm uppercase tracking-wide">Repair Estimate</h3>
                        <p className="text-[10px] font-bold text-[var(--text-muted)]">Parts & Labor Breakdown</p>
                    </div>
                </div>
                <div className="text-right">
                    <span className="block text-2xl font-black text-emerald-600 tracking-tight">{formatCurrency(grandTotal)}</span>
                </div>
            </div>

            {/* --- 2. SCROLLABLE LIST AREA --- */}
            <div className="p-4 space-y-3 bg-[var(--bg-surface)] min-h-[120px]">
                {items.length === 0 && (
                    <div className="h-32 flex flex-col items-center justify-center text-[var(--text-muted)] border-2 border-dashed border-[var(--border-color)] rounded-xl opacity-60">
                        <PenTool size={24} className="mb-2" />
                        <span className="text-xs font-bold uppercase tracking-wider">No items added</span>
                    </div>
                )}

                {items.map(item => (
                    <div key={item.id} className="group relative bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-xl p-3.5 transition-all hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-sm">

                        <div className="flex justify-between items-start gap-3">
                            {/* LEFT: ITEM DETAILS */}
                            <div className="flex-1">
                                {/* Top Row: Badges */}
                                {item.inventory_id ? (
                                    <div className="flex gap-2 mb-1.5">
                                        <span className="text-[9px] font-black uppercase bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 px-1.5 py-0.5 rounded flex items-center gap-1">
                                            <Box size={10} /> Stock Part
                                        </span>
                                        {item.bin_location && (
                                            <span className="text-[9px] font-bold uppercase bg-slate-100 dark:bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded flex items-center gap-1">
                                                <MapPin size={10} /> {item.bin_location}
                                            </span>
                                        )}
                                    </div>
                                ) : (
                                    <div className="flex gap-2 mb-1.5">
                                        <span className="text-[9px] font-black uppercase bg-slate-100 dark:bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded flex items-center gap-1">
                                            <Wrench size={10} /> Custom / Labor
                                        </span>
                                    </div>
                                )}

                                {/* Main Description */}
                                <div className="font-bold text-[var(--text-main)] text-sm md:text-base leading-tight">
                                    {item.description}
                                </div>

                                {/* SKU */}
                                {item.sku && (
                                    <div className="text-xs text-[var(--text-muted)] font-mono mt-1 opacity-75">
                                        #{item.sku}
                                    </div>
                                )}
                            </div>

                            {/* RIGHT: PRICING */}
                            <div className="text-right">
                                <div className="font-black text-[var(--text-main)] text-lg">{formatCurrency(item.part_cost + item.labor_cost)}</div>
                                <div className="text-[10px] font-bold text-[var(--text-muted)] mt-0.5">
                                    {item.labor_cost > 0 ? (
                                        <span className="flex items-center justify-end gap-2">
                                            <span>P: {formatCurrency(item.part_cost)}</span>
                                            <span className="w-px h-3 bg-[var(--border-color)]"></span>
                                            <span>L: {formatCurrency(item.labor_cost)}</span>
                                        </span>
                                    ) : 'Part Only'}
                                </div>
                            </div>
                        </div>

                        {/* DELETE BUTTON (Floating) */}
                        <button
                            onClick={() => initiateDelete(item)}
                            className="absolute -right-2 -top-2 btn btn-xs btn-circle btn-error text-white opacity-0 group-hover:opacity-100 transition-all shadow-md scale-90 group-hover:scale-100"
                        >
                            <Trash2 size={12} />
                        </button>
                    </div>
                ))}
            </div>

            {/* --- 3. CONTROL DECK (ADD FORM) --- */}
            <div className="p-4 bg-slate-50/50 dark:bg-slate-800/20 border-t border-[var(--border-color)]">
                <div className="text-[10px] font-black uppercase text-[var(--text-muted)] mb-2 tracking-widest flex items-center gap-1">
                    <Plus size={10} /> Add Custom Line Item
                </div>
                <div className="flex flex-col md:flex-row gap-3">
                    <div className="relative flex-1">
                        <input
                            type="text"
                            placeholder="Description (e.g. Labor - 1 Hour)"
                            className="input input-bordered w-full bg-[var(--bg-surface)] text-[var(--text-main)] h-11 text-sm font-medium focus:border-indigo-500 pl-4"
                            value={newItem.description}
                            onChange={e => setNewItem({ ...newItem, description: e.target.value })}
                        />
                    </div>
                    <div className="flex gap-2">
                        <div className="relative w-24">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] text-xs font-bold">$</span>
                            <input
                                type="number"
                                placeholder="Part"
                                className="input input-bordered w-full bg-[var(--bg-surface)] text-[var(--text-main)] h-11 text-sm font-bold pl-6 focus:border-indigo-500"
                                value={newItem.part_cost}
                                onChange={e => setNewItem({ ...newItem, part_cost: e.target.value })}
                            />
                        </div>
                        <div className="relative w-24">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] text-xs font-bold">$</span>
                            <input
                                type="number"
                                placeholder="Labor"
                                className="input input-bordered w-full bg-[var(--bg-surface)] text-[var(--text-main)] h-11 text-sm font-bold pl-6 focus:border-indigo-500"
                                value={newItem.labor_cost}
                                onChange={e => setNewItem({ ...newItem, labor_cost: e.target.value })}
                            />
                        </div>
                        <button
                            onClick={handleAddItem}
                            className="btn btn-square btn-gradient text-white h-11 w-11 shadow-sm hover:scale-105 transition-transform"
                            disabled={!newItem.description}
                        >
                            <Plus size={20} />
                        </button>
                    </div>
                </div>
            </div>

            {/* --- 4. ESTIMATE STATUS & ACTIONS --- */}
            <div className="p-4 bg-slate-100 dark:bg-slate-800/50 border-t border-[var(--border-color)] flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-3">
                    <span className="text-xs font-bold uppercase text-[var(--text-muted)]">Customer Visibility:</span>
                    {estimateStatus === 'draft' && <span className="badge badge-neutral font-bold uppercase tracking-wider text-[10px]">Draft (Hidden)</span>}
                    {estimateStatus === 'sent' && <span className="badge badge-warning font-bold uppercase tracking-wider text-[10px]">Awaiting Approval</span>}
                    {estimateStatus === 'approved' && <span className="badge badge-success text-white font-bold uppercase tracking-wider text-[10px]">Approved</span>}
                    {estimateStatus === 'declined' && <span className="badge badge-error text-white font-bold uppercase tracking-wider text-[10px]">Declined</span>}
                </div>

                <div className="flex gap-2 w-full md:w-auto">
                    {estimateStatus === 'draft' ? (
                        <button
                            onClick={() => onUpdateStatus && onUpdateStatus('sent')}
                            disabled={items.length === 0}
                            className="btn btn-sm btn-primary shadow-md flex-1 md:flex-none"
                        >
                            Send to Customer
                        </button>
                    ) : (
                        <button
                            onClick={() => onUpdateStatus && onUpdateStatus('draft')}
                            className="btn btn-sm btn-ghost border border-[var(--border-color)] text-[var(--text-muted)] flex-1 md:flex-none"
                        >
                            Recall / Edit Draft
                        </button>
                    )}
                </div>
            </div>

            {/* --- RESTOCK CONFIRMATION MODAL --- */}
            {itemToDelete && (
                <div className="absolute inset-0 z-10 bg-white/95 dark:bg-black/90 backdrop-blur-sm flex flex-col items-center justify-center p-6 animate-fade">
                    <div className="bg-[var(--bg-surface)] p-6 rounded-2xl shadow-xl border border-[var(--border-color)] w-full max-w-sm text-center transform transition-all scale-100">
                        <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-3">
                            <RotateCcw size={24} />
                        </div>
                        <h3 className="font-black text-lg text-[var(--text-main)]">Restock this item?</h3>
                        <p className="text-sm text-[var(--text-muted)] mt-1 mb-6 leading-relaxed">
                            Should <strong>"{itemToDelete.description}"</strong> be added back to your inventory count?
                        </p>

                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => performDelete(itemToDelete.id, true)}
                                className="btn btn-success text-white font-bold"
                            >
                                <Box size={16} /> Yes, Restock
                            </button>
                            <button
                                onClick={() => performDelete(itemToDelete.id, false)}
                                className="btn btn-ghost border border-[var(--border-color)] font-bold text-[var(--text-muted)]"
                            >
                                <Trash2 size={16} /> No, Delete
                            </button>
                        </div>
                        <button onClick={() => setItemToDelete(null)} className="btn btn-xs btn-ghost mt-4 text-[var(--text-muted)]">Cancel</button>
                    </div>
                </div>
            )}
        </div>
    );
}