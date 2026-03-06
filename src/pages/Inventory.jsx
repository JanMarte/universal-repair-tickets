import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import Navbar from '../components/Navbar';
import {
    Search, Plus, Package, Edit3, Trash2, QrCode, MapPin,
    SlidersHorizontal, ArrowDownAZ, ArrowUp10, DollarSign, Box, Hash, Tag
} from 'lucide-react';
import { useToast } from '../context/ToastProvider';
import { formatCurrency } from '../utils';
import InventoryModal from '../components/InventoryModal';
import QRScanner from '../components/QRScanner';

export default function Inventory() {
    const { addToast } = useToast();

    // Data State
    const [inventory, setInventory] = useState([]);
    const [loading, setLoading] = useState(true);

    // Filter & Sort State
    const [searchTerm, setSearchTerm] = useState('');
    const [filterTab, setFilterTab] = useState('all'); // 'all', 'low', 'out'
    const [sortBy, setSortBy] = useState('name'); // 'name', 'qty_asc', 'qty_desc', 'price_high'

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [isScanning, setIsScanning] = useState(false);

    useEffect(() => {
        fetchInventory();
    }, []);

    async function fetchInventory() {
        setLoading(true);
        const { data, error } = await supabase
            .from('inventory')
            .select('*')
            .order('name', { ascending: true });

        if (error) console.error(error);
        else setInventory(data || []);
        setLoading(false);
    }

    const adjustStock = async (id, currentQty, amount) => {
        const newQty = Math.max(0, currentQty + amount);
        // Optimistic UI Update
        setInventory(inventory.map(item => item.id === id ? { ...item, quantity: newQty } : item));

        const { error } = await supabase.from('inventory').update({ quantity: newQty }).eq('id', id);
        if (error) {
            addToast("Failed to update stock", "error");
            fetchInventory(); // Revert on fail
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Delete this part permanently?")) return;
        const { error } = await supabase.from('inventory').delete().eq('id', id);
        if (error) addToast("Failed to delete", "error");
        else {
            addToast("Part deleted", "success");
            setInventory(inventory.filter(item => item.id !== id));
        }
    };

    // --- LOGIC ---
    const filteredItems = inventory.filter(item => {
        const matchesSearch = (item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.manufacturer?.toLowerCase().includes(searchTerm.toLowerCase()));

        if (filterTab === 'low') return matchesSearch && item.quantity > 0 && item.quantity < (item.min_quantity || 3);
        if (filterTab === 'out') return matchesSearch && item.quantity === 0;
        return matchesSearch;
    }).sort((a, b) => {
        if (sortBy === 'qty_asc') return a.quantity - b.quantity;
        if (sortBy === 'qty_desc') return b.quantity - a.quantity;
        if (sortBy === 'price_high') return b.price - a.price;
        return a.name.localeCompare(b.name);
    });

    const totalValue = inventory.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const lowStockCount = inventory.filter(i => i.quantity < (i.min_quantity || 3) && i.quantity > 0).length;
    const outStockCount = inventory.filter(i => i.quantity === 0).length;

    // --- INVENTORY SPECIFIC ACTIONS TO INJECT INTO NAVBAR ---
    const inventoryActions = (
        <>
            <button className="btn btn-sm btn-circle btn-ghost text-[var(--text-muted)] hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all" onClick={() => setIsScanning(true)} title="Scan Barcode">
                <QrCode size={20} />
            </button>
            <button onClick={() => { setEditingItem(null); setIsModalOpen(true); }} className="btn btn-sm md:btn-md btn-gradient text-white gap-2 shadow-lg shadow-indigo-500/30 hover:scale-105 border-none transition-all px-4 rounded-full ml-1">
                <Plus size={16} strokeWidth={3} /> <span className="hidden md:inline font-bold tracking-wide">Add Part</span>
            </button>
        </>
    );

    return (
        <div className="min-h-screen p-4 md:p-6 font-sans pb-24 transition-colors duration-300">

            {/* USING THE NEW GLOBAL NAVBAR COMPONENT */}
            <Navbar activeTab="inventory" rightActions={inventoryActions} />

            {/* HEADER & STATS */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8 animate-fade-in-up relative z-30">

                {/* Main Control Panel */}
                <div className="lg:col-span-3 bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-color)] p-6 md:p-8 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>

                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-6">

                        {/* Title Section */}
                        <div>
                            <h1 className="text-3xl font-black text-[var(--text-main)] tracking-tight flex items-center gap-3 mb-2">
                                <Package className="text-indigo-600" size={32} />
                                Inventory Database
                            </h1>
                            <p className="text-sm font-bold text-[var(--text-muted)]">
                                Manage stock levels, locations, and pricing.
                            </p>
                        </div>

                        {/* Search & Stats Section (Right Aligned) */}
                        <div className="w-full md:w-96 flex flex-col justify-end">
                            <div className="flex justify-between items-end mb-1.5 pl-1 pr-1">
                                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">
                                    Global Search
                                </label>

                                {/* MOVED STATS HERE */}
                                <div className="hidden sm:flex gap-2">
                                    <div className="flex items-center gap-1.5 bg-[var(--bg-subtle)] px-2 py-1 rounded-md shadow-inner border border-[var(--border-color)]">
                                        <Box size={12} className="text-[var(--text-muted)]" />
                                        <span className="font-black text-[9px] text-[var(--text-main)] uppercase tracking-widest">
                                            {inventory.length} SKUs
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1.5 bg-[var(--bg-subtle)] px-2 py-1 rounded-md shadow-inner border border-[var(--border-color)]">
                                        <DollarSign size={12} className="text-emerald-500" />
                                        <span className="font-black text-[9px] text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">
                                            {formatCurrency(totalValue)}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[var(--text-muted)] group-focus-within:text-indigo-500 transition-colors">
                                    <Search size={18} />
                                </div>
                                <input
                                    type="text"
                                    placeholder="Search parts, SKU, or brand..."
                                    className="input input-bordered w-full h-12 pl-12 bg-[var(--bg-subtle)] focus:bg-[var(--bg-surface)] text-[var(--text-main)] font-medium shadow-inner transition-all focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 text-sm rounded-xl"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Toolbar: Sort & Filters */}
                    <div className="flex flex-col md:flex-row gap-4 justify-end items-center border-t border-[var(--border-color)] pt-6 relative z-20">

                        <div className="flex gap-3 w-full md:w-auto">

                            {/* Segmented Filter Control */}
                            <div className="flex bg-[var(--bg-subtle)] p-1 rounded-xl shadow-inner border border-[var(--border-color)] flex-1 md:flex-none">
                                <button
                                    onClick={() => setFilterTab('all')}
                                    className={`flex-1 md:flex-none px-4 py-2 text-xs font-bold rounded-lg transition-all ${filterTab === 'all' ? 'bg-[var(--bg-surface)] text-indigo-600 shadow-sm ring-1 ring-black/5 dark:ring-white/5' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}
                                >
                                    All
                                </button>
                                <button
                                    onClick={() => setFilterTab('low')}
                                    className={`flex-1 md:flex-none px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${filterTab === 'low' ? 'bg-[var(--bg-surface)] text-amber-600 shadow-sm ring-1 ring-black/5 dark:ring-white/5' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}
                                >
                                    Low {lowStockCount > 0 && <span className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-1.5 py-0.5 rounded text-[9px]">{lowStockCount}</span>}
                                </button>
                                <button
                                    onClick={() => setFilterTab('out')}
                                    className={`flex-1 md:flex-none px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${filterTab === 'out' ? 'bg-[var(--bg-surface)] text-red-600 shadow-sm ring-1 ring-black/5 dark:ring-white/5' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}
                                >
                                    Out {outStockCount > 0 && <span className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 px-1.5 py-0.5 rounded text-[9px]">{outStockCount}</span>}
                                </button>
                            </div>

                            {/* Sort Dropdown */}
                            <div className="dropdown dropdown-end">
                                <div tabIndex={0} role="button" className="btn h-10 bg-[var(--bg-subtle)] border-[var(--border-color)] shadow-inner text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-surface)] transition-all px-4 rounded-xl gap-2">
                                    <SlidersHorizontal size={16} /> <span className="hidden sm:inline font-bold">Sort</span>
                                </div>
                                <ul tabIndex={0} className="dropdown-content z-[100] menu p-2 mt-2 shadow-2xl bg-[var(--bg-surface)] rounded-xl w-52 border border-[var(--border-color)] animate-pop">
                                    <li><a onClick={() => setSortBy('name')} className={`font-bold ${sortBy === 'name' ? 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20' : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-subtle)]'}`}><ArrowDownAZ size={14} /> Name (A-Z)</a></li>
                                    <li><a onClick={() => setSortBy('qty_asc')} className={`font-bold ${sortBy === 'qty_asc' ? 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20' : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-subtle)]'}`}><ArrowUp10 size={14} /> Low Quantity</a></li>
                                    <li><a onClick={() => setSortBy('qty_desc')} className={`font-bold ${sortBy === 'qty_desc' ? 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20' : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-subtle)]'}`}><ArrowUp10 size={14} className="rotate-180" /> High Quantity</a></li>
                                    <li><a onClick={() => setSortBy('price_high')} className={`font-bold ${sortBy === 'price_high' ? 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20' : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-subtle)]'}`}><DollarSign size={14} /> Highest Price</a></li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Quick Add / Tip Box */}
                <div className="hidden lg:flex bg-gradient-to-br from-slate-800 to-slate-900 dark:from-indigo-950 dark:to-slate-900 rounded-2xl p-6 text-white shadow-lg items-center justify-between border border-slate-700 dark:border-indigo-900/50">
                    <div>
                        <h3 className="font-black text-lg mb-1 tracking-tight">Scan to Find</h3>
                        <p className="text-slate-300 text-xs font-medium opacity-90 leading-relaxed max-w-[200px]">Use the camera to instantly locate an item or check its bin location.</p>
                        <button onClick={() => setIsScanning(true)} className="btn btn-sm btn-outline text-white border-white/30 hover:bg-white/10 hover:border-white mt-4 transition-all rounded-full px-4">
                            <QrCode size={14} /> Open Scanner
                        </button>
                    </div>
                    <QrCode size={72} className="text-white opacity-10" />
                </div>
            </div>

            {/* GRID - Replicated TicketCard Style */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-20">
                    <span className="loading loading-spinner loading-lg text-indigo-500 mb-4"></span>
                    <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] animate-pulse">Loading Inventory...</span>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 animate-fade relative z-10">
                    {filteredItems.map(item => {
                        const isLow = item.quantity < (item.min_quantity || 3) && item.quantity > 0;
                        const isOut = item.quantity === 0;

                        // Theme Generator
                        const getStatusTheme = () => {
                            if (isOut) return {
                                cardBorder: 'border-l-red-500 border-red-200 dark:border-red-900/50 opacity-90',
                                pill: 'bg-red-500 text-white shadow-md shadow-red-500/30',
                                descBorder: 'border-red-400',
                                label: 'OUT OF STOCK',
                                qtyColor: 'text-red-500'
                            };
                            if (isLow) return {
                                cardBorder: 'border-[var(--border-color)] border-l-amber-500',
                                pill: 'bg-amber-500 text-white shadow-md shadow-amber-500/30',
                                descBorder: 'border-amber-400',
                                label: 'LOW STOCK',
                                qtyColor: 'text-amber-500'
                            };
                            return {
                                cardBorder: 'border-[var(--border-color)] border-l-purple-500',
                                pill: 'bg-purple-500 text-white shadow-md shadow-purple-500/30',
                                descBorder: 'border-purple-400',
                                label: 'IN STOCK',
                                qtyColor: 'text-[var(--text-main)]'
                            };
                        };

                        const theme = getStatusTheme();

                        return (
                            <div key={item.id} className={`bg-[var(--bg-surface)] rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5 flex flex-col justify-between group border border-l-[4px] ${theme.cardBorder}`}>

                                {/* Header: Status Pill & SKU */}
                                <div className="flex justify-between items-center mb-5">
                                    <div className={`inline-flex items-center justify-center px-3 py-1.5 font-black uppercase text-[10px] tracking-widest rounded-md transition-all ${theme.pill}`}>
                                        {theme.label}
                                    </div>
                                    <span className="flex items-center gap-1 text-xs font-mono font-bold text-[var(--text-muted)] opacity-70">
                                        <Hash size={12} /> {item.sku || 'N/A'}
                                    </span>
                                </div>

                                {/* Title Area */}
                                <div className="mb-4">
                                    <h3 className="text-lg font-black text-[var(--text-main)] mb-1 leading-tight group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                                        {item.name}
                                    </h3>
                                    <div className="flex items-center gap-1.5 text-xs font-mono text-[var(--text-muted)] opacity-80 uppercase tracking-widest">
                                        <Tag size={12} /> {item.manufacturer || 'GENERIC'}
                                    </div>
                                </div>

                                {/* Recessed Detail Box (Matches Ticket Description Box) */}
                                <div className={`p-3.5 mb-6 rounded-lg border-l-[3px] bg-[var(--bg-subtle)] shadow-inner flex justify-between items-center ${theme.descBorder}`}>
                                    <div className="flex flex-col">
                                        <span className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] opacity-70 mb-0.5">Bin Location</span>
                                        <span className="flex items-center gap-1.5 text-xs font-bold text-[var(--text-main)]">
                                            <MapPin size={12} className="text-indigo-500" /> {item.bin_location || 'N/A'}
                                        </span>
                                    </div>
                                    <div className="flex flex-col items-end">
                                        <span className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] opacity-70 mb-0.5">Retail Price</span>
                                        <span className="text-lg font-black text-[var(--text-main)] leading-none">
                                            {formatCurrency(item.price)}
                                        </span>
                                    </div>
                                </div>

                                {/* Footer - Dashed Divider */}
                                <div className="border-t-2 border-dashed border-[var(--border-color)] pt-4 flex justify-between items-center mt-auto">

                                    {/* Stepper Controls */}
                                    <div className="flex items-center gap-1 bg-[var(--bg-subtle)] rounded-lg p-1 border border-[var(--border-color)] shadow-inner">
                                        <button onClick={() => adjustStock(item.id, item.quantity, -1)} className="btn btn-xs btn-square btn-ghost text-[var(--text-muted)] hover:bg-[var(--bg-surface)] hover:text-red-500 hover:shadow-sm border border-transparent hover:border-red-200 dark:hover:border-red-900/30 transition-all">-</button>
                                        <span className={`font-black w-8 text-center text-sm ${theme.qtyColor}`}>{item.quantity}</span>
                                        <button onClick={() => adjustStock(item.id, item.quantity, 1)} className="btn btn-xs btn-square btn-ghost text-[var(--text-muted)] hover:bg-[var(--bg-surface)] hover:text-emerald-500 hover:shadow-sm border border-transparent hover:border-emerald-200 dark:hover:border-emerald-900/30 transition-all">+</button>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex gap-2">
                                        <button onClick={() => { setEditingItem(item); setIsModalOpen(true); }} className="btn btn-xs btn-ghost text-[var(--text-muted)] hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 border border-transparent hover:border-purple-200 dark:hover:border-purple-900/30 transition-all font-bold">
                                            <Edit3 size={14} className="mr-1" /> Edit
                                        </button>
                                        <button onClick={() => handleDelete(item.id)} className="btn btn-xs btn-ghost btn-square text-[var(--text-muted)] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 border border-transparent hover:border-red-200 dark:hover:border-red-900/30 transition-all" title="Delete Part">
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                    {filteredItems.length === 0 && (
                        <div className="col-span-full text-center py-24 bg-[var(--bg-surface)] rounded-3xl border-2 border-dashed border-[var(--border-color)] shadow-sm">
                            <Package size={48} className="mx-auto mb-4 text-[var(--text-muted)] opacity-50" />
                            <h3 className="text-xl font-black text-[var(--text-main)] tracking-tight mb-2">No parts found</h3>
                            <p className="text-sm font-medium text-[var(--text-muted)]">Adjust your search or add a new part.</p>
                        </div>
                    )}
                </div>
            )}

            {/* MODAL */}
            <InventoryModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSaved={fetchInventory}
                initialItem={editingItem}
            />

            {/* SCANNER */}
            {isScanning && (
                <QRScanner
                    onClose={() => setIsScanning(false)}
                    onScan={(code) => {
                        setIsScanning(false);
                        setSearchTerm(code);
                    }}
                />
            )}

        </div>
    );
}