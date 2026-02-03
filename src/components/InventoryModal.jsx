import React, { useState, useEffect } from 'react';
import { X, Save, Package, Hash, MapPin, DollarSign, Tag, Truck, Archive, AlertCircle } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useToast } from '../context/ToastProvider';

export default function InventoryModal({ isOpen, onClose, onSaved, initialItem = null }) {
    const { addToast } = useToast();
    const [loading, setLoading] = useState(false);

    // Expanded State
    const [formData, setFormData] = useState({
        name: '',
        manufacturer: '',
        sku: '',
        bin_location: '',
        quantity: 0,
        price: 0.00,
        cost: 0.00, // New: Cost tracking
        supplier: '', // New: Supplier info
        min_quantity: 3 // New: Custom alert threshold
    });

    useEffect(() => {
        if (isOpen) {
            if (initialItem) {
                setFormData({
                    ...initialItem,
                    // Fallbacks for older data that might miss new fields
                    cost: initialItem.cost || 0,
                    supplier: initialItem.supplier || '',
                    min_quantity: initialItem.min_quantity || 3
                });
            } else {
                setFormData({
                    name: '', manufacturer: '', sku: '', bin_location: '',
                    quantity: 0, price: 0, cost: 0, supplier: '', min_quantity: 3
                });
            }
        }
    }, [initialItem, isOpen]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            // Upsert handles both Create and Update based on ID
            const payload = { ...formData };
            if (initialItem?.id) payload.id = initialItem.id;

            const { error } = await supabase.from('inventory').upsert([payload]);

            if (error) throw error;

            addToast(initialItem ? "Item updated" : "New part added", "success");
            onSaved();
            onClose();
        } catch (error) {
            console.error(error);
            addToast("Error saving item. Check database connection.", "error");
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade">
            <div className="bg-[var(--bg-surface)] w-full max-w-2xl rounded-2xl shadow-2xl border border-[var(--border-color)] flex flex-col max-h-[90vh] overflow-hidden animate-pop ring-1 ring-white/10">

                {/* Header */}
                <div className="p-5 border-b border-[var(--border-color)] flex justify-between items-center bg-[var(--bg-subtle)]">
                    <div>
                        <h2 className="text-xl font-black text-[var(--text-main)] flex items-center gap-2">
                            <Package size={22} className="text-indigo-600" />
                            {initialItem ? 'Edit Item' : 'Add New Item'}
                        </h2>
                    </div>
                    <button onClick={onClose} className="btn btn-sm btn-circle btn-ghost text-[var(--text-muted)] hover:bg-slate-200 dark:hover:bg-slate-700">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-8">

                    {/* SECTION 1: CORE DETAILS */}
                    <div>
                        <h3 className="text-xs font-bold uppercase text-[var(--text-muted)] tracking-wider mb-3 flex items-center gap-2">
                            <Archive size={14} /> Item Details
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="form-control md:col-span-2">
                                <label className="label text-xs font-bold text-[var(--text-muted)]">Part Name</label>
                                <input required type="text" placeholder="e.g. Dyson V11 Filter"
                                    className="input input-bordered font-bold text-lg focus:border-indigo-500 bg-[var(--bg-surface)] text-[var(--text-main)]"
                                    value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                            </div>

                            <div className="form-control">
                                <label className="label text-xs font-bold text-[var(--text-muted)]">Manufacturer</label>
                                <div className="relative">
                                    <Tag size={16} className="absolute left-3 top-3.5 text-slate-400" />
                                    <input type="text" placeholder="Brand" className="input input-bordered w-full pl-9 bg-[var(--bg-surface)] text-[var(--text-main)]"
                                        value={formData.manufacturer} onChange={e => setFormData({ ...formData, manufacturer: e.target.value })} />
                                </div>
                            </div>

                            <div className="form-control">
                                <label className="label text-xs font-bold text-[var(--text-muted)]">SKU / Barcode</label>
                                <div className="relative">
                                    <Hash size={16} className="absolute left-3 top-3.5 text-slate-400" />
                                    <input type="text" placeholder="Scan or Type" className="input input-bordered w-full pl-9 font-mono bg-[var(--bg-surface)] text-[var(--text-main)]"
                                        value={formData.sku} onChange={e => setFormData({ ...formData, sku: e.target.value })} />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* SECTION 2: STOCK & LOCATION */}
                    <div className="p-5 bg-[var(--bg-subtle)] rounded-xl border border-[var(--border-color)]">
                        <h3 className="text-xs font-bold uppercase text-[var(--text-muted)] tracking-wider mb-3 flex items-center gap-2">
                            <MapPin size={14} /> Stock Control
                        </h3>
                        <div className="grid grid-cols-3 gap-4">
                            <div className="form-control">
                                <label className="label text-[10px] font-bold uppercase text-[var(--text-muted)]">Current Qty</label>
                                <input type="number" className="input input-bordered text-center font-black text-xl text-indigo-600 focus:border-indigo-500 bg-[var(--bg-surface)]"
                                    value={formData.quantity} onChange={e => setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })} />
                            </div>
                            <div className="form-control">
                                <label className="label text-[10px] font-bold uppercase text-[var(--text-muted)]">Min. Alert</label>
                                <input type="number" className="input input-bordered text-center text-sm bg-[var(--bg-surface)] text-[var(--text-main)]"
                                    value={formData.min_quantity} onChange={e => setFormData({ ...formData, min_quantity: parseInt(e.target.value) || 0 })} />
                            </div>
                            <div className="form-control">
                                <label className="label text-[10px] font-bold uppercase text-[var(--text-muted)]">Bin Location</label>
                                <input type="text" placeholder="A-01" className="input input-bordered text-center font-mono text-sm uppercase bg-[var(--bg-surface)] text-[var(--text-main)]"
                                    value={formData.bin_location} onChange={e => setFormData({ ...formData, bin_location: e.target.value.toUpperCase() })} />
                            </div>
                        </div>
                    </div>

                    {/* SECTION 3: PRICING & SUPPLIER */}
                    <div>
                        <h3 className="text-xs font-bold uppercase text-[var(--text-muted)] tracking-wider mb-3 flex items-center gap-2">
                            <DollarSign size={14} /> Pricing & Source
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="form-control">
                                <label className="label text-xs font-bold text-[var(--text-muted)]">Retail Price ($)</label>
                                <input type="number" step="0.01" className="input input-bordered font-bold text-emerald-600 bg-[var(--bg-surface)]"
                                    value={formData.price} onChange={e => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })} />
                            </div>

                            <div className="form-control">
                                <label className="label text-xs font-bold text-[var(--text-muted)]">Cost Price ($) <span className="opacity-50 font-normal ml-1 text-[10px]">(Internal)</span></label>
                                <input type="number" step="0.01" className="input input-bordered text-[var(--text-muted)] bg-[var(--bg-surface)]"
                                    value={formData.cost} onChange={e => setFormData({ ...formData, cost: parseFloat(e.target.value) || 0 })} />
                            </div>

                            <div className="form-control md:col-span-2">
                                <label className="label text-xs font-bold text-[var(--text-muted)]">Supplier</label>
                                <div className="relative">
                                    <Truck size={16} className="absolute left-3 top-3.5 text-slate-400" />
                                    <input type="text" placeholder="e.g. Amazon, PartsWarehouse" className="input input-bordered w-full pl-9 bg-[var(--bg-surface)] text-[var(--text-main)]"
                                        value={formData.supplier} onChange={e => setFormData({ ...formData, supplier: e.target.value })} />
                                </div>
                            </div>
                        </div>
                    </div>

                </form>

                {/* Footer Actions */}
                <div className="p-5 border-t border-[var(--border-color)] bg-[var(--bg-surface)] flex justify-end gap-3">
                    <button type="button" onClick={onClose} className="btn btn-ghost text-[var(--text-muted)] hover:bg-[var(--bg-subtle)]">Cancel</button>
                    <button type="submit" onClick={handleSubmit} disabled={loading} className="btn btn-gradient text-white px-8 shadow-lg">
                        {loading ? <span className="loading loading-spinner"></span> : <><Save size={18} /> Save Item</>}
                    </button>
                </div>
            </div>
        </div>
    );
}