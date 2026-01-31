import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Plus, Trash2, DollarSign, Save, AlertCircle } from 'lucide-react';
import { formatCurrency } from '../utils';
import { useToast } from '../context/ToastProvider';

export default function EstimateBuilder({ ticketId, onTotalChange, onActivityLog }) {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const { addToast } = useToast();

    // New Item Form
    const [newItem, setNewItem] = useState({ description: '', part_cost: '', labor_cost: '' });

    useEffect(() => {
        fetchItems();
    }, [ticketId]);

    useEffect(() => {
        // Calculate total whenever items change
        const total = items.reduce((sum, item) => sum + (item.part_cost || 0) + (item.labor_cost || 0), 0);
        if (onTotalChange) onTotalChange(total);
    }, [items]);

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

            // LOG ADDITION
            if (onActivityLog) onActivityLog('ESTIMATE ADD', `Added item: ${newItem.description} ($${partCost + laborCost})`);
        }
    };

    const handleDeleteItem = async (itemId) => {
        const itemToRemove = items.find(i => i.id === itemId);

        const { error } = await supabase.from('estimate_items').delete().eq('id', itemId);
        if (error) {
            addToast("Failed to delete item", "error");
        } else {
            setItems(items.filter(i => i.id !== itemId));

            // LOG REMOVAL (This handles your requirement)
            if (onActivityLog && itemToRemove) {
                onActivityLog('ESTIMATE REMOVE', `Removed item: ${itemToRemove.description} ($${itemToRemove.part_cost + itemToRemove.labor_cost})`);
            }
        }
    };

    const grandTotal = items.reduce((sum, item) => sum + (item.part_cost || 0) + (item.labor_cost || 0), 0);

    if (loading) return <div className="p-4 text-center"><span className="loading loading-spinner text-primary"></span></div>;

    return (
        <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border-color)] overflow-hidden shadow-sm">
            <div className="p-4 bg-[var(--bg-subtle)] border-b border-[var(--border-color)] flex justify-between items-center">
                <h3 className="font-bold text-[var(--text-main)] flex items-center gap-2">
                    <DollarSign size={18} className="text-emerald-600" /> Repair Estimate
                </h3>
                <span className="text-xl font-black text-emerald-600">{formatCurrency(grandTotal)}</span>
            </div>

            <div className="p-4 space-y-4">
                {/* LIST EXISTING ITEMS */}
                {items.length === 0 && (
                    <div className="text-center py-6 text-[var(--text-muted)] text-sm italic">
                        No items added yet.
                    </div>
                )}

                <div className="space-y-2">
                    {items.map(item => (
                        <div key={item.id} className="flex items-center justify-between p-3 bg-[var(--bg-subtle)] rounded-lg border border-[var(--border-color)] group hover:border-emerald-200 transition-colors">
                            <div className="flex-1">
                                <div className="font-bold text-[var(--text-main)]">{item.description}</div>
                                <div className="text-xs text-[var(--text-muted)] flex gap-3 mt-1">
                                    <span>Parts: {formatCurrency(item.part_cost)}</span>
                                    <span>Labor: {formatCurrency(item.labor_cost)}</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <span className="font-bold text-[var(--text-main)]">{formatCurrency(item.part_cost + item.labor_cost)}</span>
                                <button onClick={() => handleDeleteItem(item.id)} className="btn btn-ghost btn-sm btn-circle text-red-400 hover:bg-red-50 hover:text-red-600">
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                {/* ADD NEW ITEM */}
                <div className="pt-4 border-t border-[var(--border-color)]">
                    <div className="text-xs font-bold uppercase text-[var(--text-muted)] mb-2">Add Line Item</div>
                    <div className="flex flex-col md:flex-row gap-2">
                        <input
                            type="text"
                            placeholder="Description (e.g. Replace Belt)"
                            className="input input-bordered flex-1"
                            value={newItem.description}
                            onChange={e => setNewItem({ ...newItem, description: e.target.value })}
                        />
                        <div className="flex gap-2">
                            <input
                                type="number"
                                placeholder="Parts $"
                                className="input input-bordered w-24"
                                value={newItem.part_cost}
                                onChange={e => setNewItem({ ...newItem, part_cost: e.target.value })}
                            />
                            <input
                                type="number"
                                placeholder="Labor $"
                                className="input input-bordered w-24"
                                value={newItem.labor_cost}
                                onChange={e => setNewItem({ ...newItem, labor_cost: e.target.value })}
                            />
                            <button onClick={handleAddItem} className="btn btn-square btn-gradient" disabled={!newItem.description}>
                                <Plus size={20} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}