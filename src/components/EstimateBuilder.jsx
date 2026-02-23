import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Plus, Trash2, DollarSign, Calculator, Send, AlertCircle, CheckCircle, XCircle, Wrench, Package, RotateCcw, Lock } from 'lucide-react';
import { useToast } from '../context/ToastProvider';
import { formatCurrency } from '../utils';

export default function EstimateBuilder({ ticketId, onTotalChange, onActivityLog, refreshTrigger, estimateStatus, onUpdateStatus }) {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newItem, setNewItem] = useState({ type: 'part', description: '', quantity: 1, unit_price: '' });
    const { addToast } = useToast();

    useEffect(() => {
        fetchItems();
    }, [ticketId, refreshTrigger]);

    async function fetchItems() {
        setLoading(true);
        const { data, error } = await supabase
            .from('estimate_items')
            .select('*')
            .eq('ticket_id', ticketId)
            .order('created_at', { ascending: true });

        if (error) {
            console.error("Error fetching estimate items:", error);
        } else {
            setItems(data || []);
            calculateAndEmitTotal(data || []);
        }
        setLoading(false);
    }

    const calculateAndEmitTotal = (currentItems) => {
        const subtotal = currentItems.reduce((sum, item) => sum + (item.part_cost || 0) + (item.labor_cost || 0), 0);
        const taxRate = 0.07;
        const grandTotal = subtotal + (subtotal * taxRate);
        onTotalChange(grandTotal);
    };

    const handleAddItem = async (e) => {
        e.preventDefault();
        if (!newItem.description || !newItem.unit_price) return;

        const price = parseFloat(newItem.unit_price);
        const qty = parseInt(newItem.quantity) || 1;
        const totalLineCost = price * qty;
        
        const isLabor = newItem.type === 'labor';
        
        let finalDescription = newItem.description;
        if (qty > 1) finalDescription = `${qty}x ${finalDescription}`;
        if (isLabor) finalDescription = `(Labor) ${finalDescription}`;

        const { data, error } = await supabase
            .from('estimate_items')
            .insert([{
                ticket_id: ticketId,
                description: finalDescription,
                part_cost: isLabor ? 0 : totalLineCost,
                labor_cost: isLabor ? totalLineCost : 0,
                is_approved: false // Explicitly mark new items as not approved
            }])
            .select();

        if (error) {
            console.error("Insert Error:", error);
            addToast(`DB Error: ${error.message}`, "error");
        } else {
            const updatedItems = [...items, data[0]];
            setItems(updatedItems);
            calculateAndEmitTotal(updatedItems);
            
            setNewItem({ ...newItem, description: '', quantity: 1, unit_price: '' });
            addToast("Item added to estimate", "success");
            onActivityLog('ESTIMATE ITEM ADDED', `Added ${finalDescription} ($${totalLineCost})`);
        }
    };

    const handleDeleteItem = async (itemId, description) => {
        const { error } = await supabase.from('estimate_items').delete().eq('id', itemId);
        if (error) {
            addToast("Failed to delete item", "error");
        } else {
            const updatedItems = items.filter(i => i.id !== itemId);
            setItems(updatedItems);
            calculateAndEmitTotal(updatedItems);
            onActivityLog('ESTIMATE ITEM REMOVED', `Removed ${description} from estimate`);
        }
    };

    const handleSendToCustomer = async () => {
        const pendingItems = items.filter(i => i.is_approved !== true);
        if (pendingItems.length === 0) {
            addToast("There are no new items to request approval for.", "error");
            return;
        }
        onUpdateStatus('sent');
        onActivityLog('ESTIMATE SENT', 'Change order sent to customer for approval.');
    };

    const handleResetToDraft = () => {
        onUpdateStatus('draft');
        onActivityLog('ESTIMATE UNLOCKED', 'Estimate was unlocked to add additional parts/labor.');
    };

    // Math Breakdowns
    const approvedItems = items.filter(i => i.is_approved === true);
    const pendingItems = items.filter(i => i.is_approved !== true);
    
    const approvedSubtotal = approvedItems.reduce((sum, item) => sum + (item.part_cost || 0) + (item.labor_cost || 0), 0);
    const pendingSubtotal = pendingItems.reduce((sum, item) => sum + (item.part_cost || 0) + (item.labor_cost || 0), 0);
    const taxRate = 0.07; 

    return (
        <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl shadow-sm overflow-hidden flex flex-col relative group transition-all">
            
            {/* Header */}
            <div className="p-5 border-b-2 border-dashed border-[var(--border-color)] bg-[var(--bg-surface)] flex justify-between items-center z-10 relative">
                <h3 className="text-[10px] font-black uppercase text-[var(--text-main)] tracking-widest flex items-center gap-2">
                    <Calculator size={16} className="text-indigo-600" /> Estimate Builder
                </h3>
                <div className="flex items-center gap-2">
                    {estimateStatus === 'approved' && <span className="bg-emerald-500 text-white text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded shadow-sm shadow-emerald-500/30 flex items-center gap-1"><CheckCircle size={10} /> Approved</span>}
                    {estimateStatus === 'declined' && <span className="bg-red-500 text-white text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded shadow-sm shadow-red-500/30 flex items-center gap-1"><XCircle size={10} /> Declined</span>}
                    {estimateStatus === 'sent' && <span className="bg-amber-500 text-white text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded shadow-sm shadow-amber-500/30 flex items-center gap-1"><AlertCircle size={10} /> Pending Approval</span>}
                    {(!estimateStatus || estimateStatus === 'draft') && <span className="bg-[var(--bg-subtle)] border border-[var(--border-color)] text-[var(--text-muted)] text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded shadow-inner">Draft Mode</span>}
                    
                    {/* UNDO / RESET BUTTON */}
                    {estimateStatus && estimateStatus !== 'draft' && (
                        <button 
                            onClick={handleResetToDraft} 
                            className="btn btn-xs btn-ghost px-2 gap-1 text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-all border border-transparent hover:border-amber-200 dark:hover:border-amber-800 rounded-md" 
                            title="Unlock to add more items"
                        >
                            <RotateCcw size={10} /> Add Items
                        </button>
                    )}
                </div>
            </div>

            {/* Content Area */}
            <div className="p-5 bg-[var(--bg-subtle)] flex-1 relative z-10">
                
                {/* Manual Add Item Form (Only shows if Draft/Unlocked) */}
                {(!estimateStatus || estimateStatus === 'draft') && (
                    <form onSubmit={handleAddItem} className="mb-6 p-4 bg-[var(--bg-surface)] rounded-xl border border-[var(--border-color)] shadow-sm">
                        <div className="flex bg-[var(--bg-subtle)] p-1 rounded-lg shadow-inner border border-[var(--border-color)] mb-4">
                            <button type="button" onClick={() => setNewItem({...newItem, type: 'part'})} className={`flex-1 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-md transition-all flex items-center justify-center gap-1.5 ${newItem.type === 'part' ? 'bg-[var(--bg-surface)] text-indigo-600 shadow-sm ring-1 ring-black/5 dark:ring-white/5' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}>
                                <Package size={12} /> Part / Item
                            </button>
                            <button type="button" onClick={() => setNewItem({...newItem, type: 'labor'})} className={`flex-1 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-md transition-all flex items-center justify-center gap-1.5 ${newItem.type === 'labor' ? 'bg-[var(--bg-surface)] text-amber-600 shadow-sm ring-1 ring-black/5 dark:ring-white/5' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}>
                                <Wrench size={12} /> Labor / Service
                            </button>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2">
                            <div className="flex-1">
                                <label className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-1 pl-1 block">Description</label>
                                <input type="text" placeholder={newItem.type === 'labor' ? "e.g. Diagnostic Fee..." : "e.g. Belt, Filter..."} className="input input-sm w-full h-10 bg-[var(--bg-subtle)] border-[var(--border-color)] text-[var(--text-main)] shadow-inner focus:border-indigo-500 font-medium" value={newItem.description} onChange={e => setNewItem({ ...newItem, description: e.target.value })} required />
                            </div>
                            <div className="w-full sm:w-20">
                                <label className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-1 pl-1 block">{newItem.type === 'labor' ? 'Hours' : 'Qty'}</label>
                                <input type="number" min="1" className="input input-sm w-full h-10 bg-[var(--bg-subtle)] border-[var(--border-color)] text-[var(--text-main)] shadow-inner focus:border-indigo-500 font-bold text-center" value={newItem.quantity} onChange={e => setNewItem({ ...newItem, quantity: e.target.value })} required />
                            </div>
                            <div className="w-full sm:w-28 relative">
                                <label className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-1 pl-1 block">{newItem.type === 'labor' ? 'Rate' : 'Price'}</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] font-bold">$</span>
                                    <input type="number" step="0.01" min="0" placeholder="0.00" className="input input-sm w-full h-10 pl-7 bg-[var(--bg-subtle)] border-[var(--border-color)] text-[var(--text-main)] shadow-inner focus:border-indigo-500 font-mono font-bold" value={newItem.unit_price} onChange={e => setNewItem({ ...newItem, unit_price: e.target.value })} required />
                                </div>
                            </div>
                            <div className="flex items-end mt-2 sm:mt-0">
                                <button type="submit" className="btn btn-sm h-10 w-full sm:w-auto text-white shadow-md border-none px-4 transition-colors bg-indigo-600 hover:bg-indigo-700">
                                    <Plus size={16} strokeWidth={3} />
                                </button>
                            </div>
                        </div>
                    </form>
                )}

                {/* Line Items Table */}
                {loading ? (
                    <div className="text-center py-8"><span className="loading loading-spinner text-indigo-500"></span></div>
                ) : items.length === 0 ? (
                    <div className="text-center py-8 border-2 border-dashed border-[var(--border-color)] rounded-xl opacity-60">
                        <DollarSign size={24} className="mx-auto text-[var(--text-muted)] mb-2" />
                        <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">No items added</p>
                    </div>
                ) : (
                    <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border-color)] shadow-sm overflow-hidden mb-6">
                        <table className="w-full text-sm">
                            <thead className="bg-[var(--bg-subtle)] border-b border-[var(--border-color)]">
                                <tr>
                                    <th className="text-left p-3 text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">Item Description</th>
                                    <th className="text-right p-3 text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] w-24">Cost</th>
                                    <th className="w-10"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map((item, idx) => {
                                    const itemTotal = (item.part_cost || 0) + (item.labor_cost || 0);
                                    const isLabor = item.labor_cost > 0 || (item.description && item.description.startsWith('(Labor)'));
                                    const cleanDescription = item.description ? item.description.replace('(Labor) ', '') : 'Unknown Item';
                                    const isApproved = item.is_approved === true;

                                    return (
                                        <tr key={item.id} className={`${idx !== items.length - 1 ? 'border-b border-dashed border-[var(--border-color)]' : ''} ${isApproved ? 'bg-emerald-50/30 dark:bg-emerald-900/5' : ''}`}>
                                            <td className="p-3">
                                                <div className="flex items-center gap-2">
                                                    {isLabor ? <Wrench size={14} className="text-amber-500 flex-none" /> : <Package size={14} className="text-indigo-500 flex-none" />}
                                                    <span className={`font-bold ${isApproved ? 'text-[var(--text-muted)]' : 'text-[var(--text-main)]'}`}>{cleanDescription}</span>
                                                    {isApproved && <span className="flex items-center gap-1 text-[8px] font-black uppercase tracking-widest bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 px-1.5 py-0.5 rounded"><Lock size={8}/> Locked</span>}
                                                </div>
                                            </td>
                                            <td className={`p-3 text-right font-mono font-black ${isApproved ? 'text-[var(--text-muted)]' : 'text-[var(--text-main)]'}`}>{formatCurrency(itemTotal)}</td>
                                            <td className="p-3 text-right">
                                                {!isApproved && (
                                                    <button onClick={() => handleDeleteItem(item.id, item.description)} className="text-[var(--text-muted)] hover:text-red-500 transition-colors p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20" title="Remove Item"><Trash2 size={14} /></button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Totals Summary */}
                {items.length > 0 && (
                    <div className="bg-[var(--bg-surface)] p-4 rounded-xl border border-[var(--border-color)] shadow-sm space-y-2">
                        {approvedItems.length > 0 && (
                            <div className="flex justify-between items-center text-xs text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-900/10 p-2 rounded-lg border border-emerald-100 dark:border-emerald-800/50">
                                <span>Previously Approved (w/ Tax)</span>
                                <span className="font-mono">{formatCurrency(approvedSubtotal + (approvedSubtotal * taxRate))}</span>
                            </div>
                        )}
                        {pendingItems.length > 0 && (
                            <div className="flex justify-between items-center text-xs text-indigo-600 dark:text-indigo-400 font-bold bg-indigo-50 dark:bg-indigo-900/10 p-2 rounded-lg border border-indigo-100 dark:border-indigo-800/50">
                                <span>New Pending Charges (w/ Tax)</span>
                                <span className="font-mono">{formatCurrency(pendingSubtotal + (pendingSubtotal * taxRate))}</span>
                            </div>
                        )}
                        <div className="flex justify-between items-center pt-3 mt-2 border-t border-dashed border-[var(--border-color)]">
                            <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-main)]">Total Ticket Value</span>
                            <span className="text-xl font-black text-[var(--text-main)] tracking-tight">{formatCurrency(approvedSubtotal + pendingSubtotal + ((approvedSubtotal + pendingSubtotal) * taxRate))}</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Footer Action */}
            {pendingItems.length > 0 && (!estimateStatus || estimateStatus === 'draft') && (
                <div className="p-4 bg-[var(--bg-surface)] border-t-2 border-dashed border-[var(--border-color)] relative z-10">
                    <button onClick={handleSendToCustomer} className="btn w-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/30 border-none hover:scale-[1.02] transition-transform gap-2 h-12 rounded-xl">
                        <Send size={18} /> <span className="font-black tracking-wide text-sm">Lock & Request Approval for {formatCurrency(pendingSubtotal + (pendingSubtotal * taxRate))}</span>
                    </button>
                </div>
            )}
        </div>
    );
}