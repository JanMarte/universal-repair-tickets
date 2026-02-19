import React, { useState, useEffect } from 'react';
import { X, Save, Package, Hash, MapPin, DollarSign, Tag, Truck, Archive, AlertCircle, BarChart3, Calculator } from 'lucide-react';
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
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade">
            <div className="bg-[var(--bg-surface)] w-full max-w-2xl rounded-2xl shadow-2xl border border-[var(--border-color)] flex flex-col max-h-[90vh] overflow-hidden animate-pop ring-1 ring-white/20">

                {/* Header - Dashed Border & Premium Typography */}
                <div className="p-5 border-b-2 border-dashed border-[var(--border-color)] flex justify-between items-center bg-[var(--bg-surface)]">
                    <div>
                        <h2 className="text-xl font-black text-[var(--text-main)] flex items-center gap-2 tracking-tight">
                            <Package size={22} className="text-indigo-600" />
                            {initialItem ? 'Edit Inventory Item' : 'Add New Part'}
                        </h2>
                        <p className="text-xs text-[var(--text-muted)] mt-1 font-medium pl-8">Enter part details, stock levels, and pricing.</p>
                    </div>
                    {/* Consistent Hover Animation on Close */}
                    <button
                        onClick={onClose}
                        className="btn btn-sm btn-circle btn-ghost text-[var(--text-muted)] hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 border border-transparent hover:border-red-200 dark:hover:border-red-900/30 transition-all"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Body - Uses bg-subtle to create contrast with the white cards inside */}
                <form onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-8 bg-[var(--bg-subtle)]">

                    {/* SECTION 1: CORE DETAILS */}
                    <div className="bg-[var(--bg-surface)] p-5 rounded-xl border border-[var(--border-color)] shadow-sm">
                        <h3 className="text-[10px] font-black uppercase text-[var(--text-muted)] tracking-widest mb-5 flex items-center gap-2 border-b-2 border-dashed border-[var(--border-color)] pb-3">
                            <Archive size={14} className="text-indigo-500" /> Item Details
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div className="form-control md:col-span-2">
                                <label className="label text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] pb-1.5">Part Name</label>
                                <input required type="text" placeholder="e.g. Dyson V11 Filter"
                                    className="input input-bordered w-full font-bold text-lg bg-[var(--bg-subtle)] focus:bg-[var(--bg-surface)] text-[var(--text-main)] shadow-inner transition-all focus:border-indigo-500"
                                    value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                            </div>

                            <div className="form-control">
                                <label className="label text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] pb-1.5">Manufacturer</label>
                                <div className="relative group">
                                    <Tag size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within:text-indigo-500 transition-colors" />
                                    <input type="text" placeholder="Brand" className="input input-bordered w-full pl-11 font-bold bg-[var(--bg-subtle)] focus:bg-[var(--bg-surface)] text-[var(--text-main)] shadow-inner transition-all focus:border-indigo-500"
                                        value={formData.manufacturer} onChange={e => setFormData({ ...formData, manufacturer: e.target.value })} />
                                </div>
                            </div>

                            <div className="form-control">
                                <label className="label text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] pb-1.5">SKU / Barcode</label>
                                <div className="relative group">
                                    <Hash size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within:text-indigo-500 transition-colors" />
                                    <input type="text" placeholder="Scan or Type" className="input input-bordered w-full pl-11 font-mono text-sm bg-[var(--bg-subtle)] focus:bg-[var(--bg-surface)] text-[var(--text-main)] shadow-inner transition-all focus:border-indigo-500"
                                        value={formData.sku} onChange={e => setFormData({ ...formData, sku: e.target.value })} />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* SECTION 2: STOCK & LOCATION */}
                    <div className="bg-[var(--bg-surface)] p-5 rounded-xl border border-[var(--border-color)] shadow-sm">
                        <h3 className="text-[10px] font-black uppercase text-[var(--text-muted)] tracking-widest mb-5 flex items-center gap-2 border-b-2 border-dashed border-[var(--border-color)] pb-3">
                            <BarChart3 size={14} className="text-emerald-500" /> Stock Control
                        </h3>
                        <div className="grid grid-cols-3 gap-5">
                            <div className="form-control">
                                <label className="label text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] pb-1.5">Current Qty</label>
                                <input type="number" className="input input-bordered w-full text-center font-black text-xl text-indigo-600 bg-[var(--bg-subtle)] focus:bg-[var(--bg-surface)] shadow-inner transition-all focus:border-indigo-500"
                                    value={formData.quantity} onChange={e => setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })} />
                            </div>
                            <div className="form-control">
                                <label className="label text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] pb-1.5">Min. Alert</label>
                                <input type="number" className="input input-bordered w-full text-center font-bold text-sm bg-[var(--bg-subtle)] focus:bg-[var(--bg-surface)] text-[var(--text-main)] shadow-inner transition-all focus:border-indigo-500"
                                    value={formData.min_quantity} onChange={e => setFormData({ ...formData, min_quantity: parseInt(e.target.value) || 0 })} />
                            </div>
                            <div className="form-control">
                                <label className="label text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] pb-1.5">Bin Location</label>
                                <div className="relative group">
                                    <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within:text-indigo-500 transition-colors" />
                                    <input type="text" placeholder="A-01" className="input input-bordered w-full pl-8 text-center font-mono text-sm uppercase bg-[var(--bg-subtle)] focus:bg-[var(--bg-surface)] text-[var(--text-main)] shadow-inner transition-all focus:border-indigo-500"
                                        value={formData.bin_location} onChange={e => setFormData({ ...formData, bin_location: e.target.value.toUpperCase() })} />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* SECTION 3: PRICING & SUPPLIER */}
                    <div className="bg-[var(--bg-surface)] p-5 rounded-xl border border-[var(--border-color)] shadow-sm">
                        <h3 className="text-[10px] font-black uppercase text-[var(--text-muted)] tracking-widest mb-5 flex items-center gap-2 border-b-2 border-dashed border-[var(--border-color)] pb-3">
                            <Calculator size={14} className="text-amber-500" /> Pricing & Source
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div className="form-control">
                                <label className="label text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] pb-1.5">Retail Price ($)</label>
                                <div className="relative group">
                                    <DollarSign size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500" />
                                    <input type="number" step="0.01" className="input input-bordered w-full pl-11 font-black text-emerald-600 bg-[var(--bg-subtle)] focus:bg-[var(--bg-surface)] shadow-inner transition-all focus:border-emerald-500"
                                        value={formData.price} onChange={e => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })} />
                                </div>
                            </div>

                            <div className="form-control">
                                <label className="label text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] pb-1.5">Cost Price <span className="opacity-50 font-normal ml-1 normal-case">(Internal)</span></label>
                                <div className="relative group">
                                    <DollarSign size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                                    <input type="number" step="0.01" className="input input-bordered w-full pl-11 font-bold text-[var(--text-muted)] bg-[var(--bg-subtle)] focus:bg-[var(--bg-surface)] shadow-inner transition-all focus:border-indigo-500"
                                        value={formData.cost} onChange={e => setFormData({ ...formData, cost: parseFloat(e.target.value) || 0 })} />
                                </div>
                            </div>

                            <div className="form-control md:col-span-2">
                                <label className="label text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] pb-1.5">Supplier</label>
                                <div className="relative group">
                                    <Truck size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within:text-indigo-500 transition-colors" />
                                    <input type="text" placeholder="e.g. Amazon, PartsWarehouse" className="input input-bordered w-full pl-11 font-medium bg-[var(--bg-subtle)] focus:bg-[var(--bg-surface)] text-[var(--text-main)] shadow-inner transition-all focus:border-indigo-500"
                                        value={formData.supplier} onChange={e => setFormData({ ...formData, supplier: e.target.value })} />
                                </div>
                            </div>
                        </div>
                    </div>

                </form>

                {/* Footer Actions - Dashed Top Border */}
                <div className="p-5 border-t-2 border-dashed border-[var(--border-color)] bg-[var(--bg-surface)] flex justify-end gap-3 z-10 shadow-[0_-4px_10px_-1px_rgba(0,0,0,0.05)]">
                    {/* Consistent Cancel Button with Red Hover */}
                    <button
                        type="button"
                        onClick={onClose}
                        className="btn btn-ghost font-bold text-[var(--text-muted)] hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 border border-transparent hover:border-red-200 dark:hover:border-red-900/30 transition-all"
                    >
                        Cancel
                    </button>
                    <button type="submit" onClick={handleSubmit} disabled={loading} className="btn btn-gradient px-8 shadow-lg text-white font-bold tracking-wide transition-transform hover:scale-105 active:scale-95 border-none">
                        {loading ? <span className="loading loading-spinner"></span> : <><Save size={18} strokeWidth={2.5} /> Save Item</>}
                    </button>
                </div>
            </div>
        </div>
    );
}