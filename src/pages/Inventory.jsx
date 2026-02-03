import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import {
    Search, Plus, Package, AlertTriangle, ArrowLeft,
    Edit3, Trash2, QrCode, MapPin, SlidersHorizontal, ArrowDownAZ, ArrowUp10, DollarSign
} from 'lucide-react';
import { useToast } from '../context/ToastProvider';
import { formatCurrency } from '../utils';
import InventoryModal from '../components/InventoryModal';
import QRScanner from '../components/QRScanner';

export default function Inventory() {
    const navigate = useNavigate();
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

    return (
        <div className="min-h-screen p-4 md:p-8 font-sans pb-24">

            {/* NAVBAR */}
            <div className="navbar rounded-2xl mb-6 sticky top-2 z-40 flex justify-between shadow-sm backdrop-blur-md bg-[var(--bg-surface)] border border-[var(--border-color)]">
                <div className="flex items-center">
                    <button onClick={() => navigate('/dashboard')} className="btn btn-ghost gap-2 text-[var(--text-muted)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-main)]">
                        <ArrowLeft size={20} /> <span className="hidden md:inline font-bold">Dashboard</span>
                    </button>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => setIsScanning(true)} className="btn btn-sm btn-circle btn-ghost text-[var(--text-main)]"><QrCode size={20} /></button>
                    <button onClick={() => { setEditingItem(null); setIsModalOpen(true); }} className="btn btn-sm btn-gradient text-white gap-2 shadow-md">
                        <Plus size={16} /> Add Part
                    </button>
                </div>
            </div>

            {/* HEADER & STATS */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8 animate-fade-in-up">

                {/* Stats Cards */}
                <div className="lg:col-span-3 bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-color)] p-6 shadow-sm">
                    <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-6">
                        <h1 className="text-2xl font-black text-[var(--text-main)] flex items-center gap-2">
                            <Package size={24} className="text-indigo-600" /> Inventory
                        </h1>
                        <div className="flex gap-2 text-sm font-bold">
                            <span className="px-3 py-1 bg-[var(--bg-subtle)] rounded-lg text-[var(--text-muted)] border border-[var(--border-color)]">
                                {inventory.length} SKUs
                            </span>
                            <span className="px-3 py-1 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 border border-emerald-100 dark:border-emerald-800">
                                {formatCurrency(totalValue)} Value
                            </span>
                        </div>
                    </div>

                    {/* Toolbar */}
                    <div className="flex flex-col md:flex-row gap-3">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-3.5 text-slate-400" size={18} />
                            <input type="text" placeholder="Search parts, SKU, or brand..." className="input input-bordered w-full pl-10 bg-[var(--bg-subtle)] focus:bg-[var(--bg-surface)] font-medium text-[var(--text-main)]"
                                value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                        </div>

                        {/* Sort Dropdown */}
                        <div className="dropdown dropdown-end">
                            <div tabIndex={0} role="button" className="btn btn-ghost border-[var(--border-color)] text-[var(--text-muted)] gap-2">
                                <SlidersHorizontal size={16} /> <span className="hidden sm:inline">Sort</span>
                            </div>
                            <ul tabIndex={0} className="dropdown-content z-[1] menu p-2 shadow-xl bg-[var(--bg-surface)] rounded-box w-52 border border-[var(--border-color)]">
                                <li><a onClick={() => setSortBy('name')} className={sortBy === 'name' ? 'active font-bold' : ''}><ArrowDownAZ size={14} /> Name (A-Z)</a></li>
                                <li><a onClick={() => setSortBy('qty_asc')} className={sortBy === 'qty_asc' ? 'active font-bold' : ''}><ArrowUp10 size={14} /> Low Quantity</a></li>
                                <li><a onClick={() => setSortBy('qty_desc')} className={sortBy === 'qty_desc' ? 'active font-bold' : ''}><ArrowUp10 size={14} className="rotate-180" /> High Quantity</a></li>
                                <li><a onClick={() => setSortBy('price_high')} className={sortBy === 'price_high' ? 'active font-bold' : ''}><DollarSign size={14} /> Highest Price</a></li>
                            </ul>
                        </div>
                    </div>

                    {/* Filter Tabs */}
                    <div className="flex gap-1 mt-4 border-b border-[var(--border-color)] overflow-x-auto">
                        <button onClick={() => setFilterTab('all')} className={`pb-2 px-4 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${filterTab === 'all' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-[var(--text-muted)]'}`}>
                            All Items
                        </button>
                        <button onClick={() => setFilterTab('low')} className={`pb-2 px-4 text-sm font-bold border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${filterTab === 'low' ? 'border-amber-500 text-amber-600' : 'border-transparent text-[var(--text-muted)]'}`}>
                            Low Stock
                            {lowStockCount > 0 && <span className="badge badge-xs badge-warning border-none">{lowStockCount}</span>}
                        </button>
                        <button onClick={() => setFilterTab('out')} className={`pb-2 px-4 text-sm font-bold border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${filterTab === 'out' ? 'border-red-500 text-red-600' : 'border-transparent text-[var(--text-muted)]'}`}>
                            Out of Stock
                            {outStockCount > 0 && <span className="badge badge-xs badge-error border-none text-white">{outStockCount}</span>}
                        </button>
                    </div>
                </div>

                {/* Quick Add / Tip Box */}
                <div className="hidden lg:flex bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 text-white shadow-lg items-center justify-between">
                    <div>
                        <h3 className="font-bold text-lg mb-1">Scan to Find</h3>
                        <p className="text-slate-300 text-sm opacity-90">Use the camera to instantly locate an item or check its bin location.</p>
                        <button onClick={() => setIsScanning(true)} className="btn btn-sm btn-outline text-white border-white/30 hover:bg-white/10 mt-4">
                            <QrCode size={16} /> Open Scanner
                        </button>
                    </div>
                    <QrCode size={64} className="text-white opacity-10" />
                </div>
            </div>

            {/* GRID */}
            {loading ? (
                <div className="p-20 text-center"><span className="loading loading-spinner loading-lg text-primary"></span></div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-fade">
                    {filteredItems.map(item => {
                        const isLow = item.quantity < (item.min_quantity || 3) && item.quantity > 0;
                        const isOut = item.quantity === 0;

                        return (
                            <div key={item.id} className={`bg-[var(--bg-surface)] rounded-xl border p-4 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group relative overflow-hidden
                                ${isOut ? 'border-red-200 dark:border-red-900 opacity-80' : isLow ? 'border-amber-200 dark:border-amber-900' : 'border-[var(--border-color)]'}
                            `}>
                                {/* Stock Health Bar */}
                                <div className={`absolute top-0 left-0 h-1 w-full ${isOut ? 'bg-red-500' : isLow ? 'bg-amber-500' : 'bg-emerald-500'}`}></div>

                                <div>
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)] bg-[var(--bg-subtle)] px-2 py-1 rounded">
                                            {item.manufacturer || 'Generic'}
                                        </span>
                                        {item.bin_location && (
                                            <span className="text-[10px] font-bold text-indigo-600 flex items-center gap-1 bg-indigo-50 dark:bg-indigo-900/20 px-2 py-1 rounded">
                                                <MapPin size={10} /> {item.bin_location}
                                            </span>
                                        )}
                                    </div>
                                    <h3 className="font-bold text-[var(--text-main)] text-lg leading-tight mb-1">{item.name}</h3>
                                    <div className="text-xs text-[var(--text-muted)] font-mono mb-4">SKU: {item.sku || 'N/A'}</div>
                                </div>

                                <div className="pt-4 border-t border-[var(--border-color)]">
                                    <div className="flex justify-between items-center mb-3">
                                        <div className="text-xl font-black text-[var(--text-main)]">{formatCurrency(item.price)}</div>

                                        {/* Stock Controls */}
                                        <div className="flex items-center gap-1 bg-[var(--bg-subtle)] rounded-lg p-1 border border-[var(--border-color)]">
                                            <button onClick={() => adjustStock(item.id, item.quantity, -1)} className="btn btn-xs btn-square btn-ghost hover:bg-red-100 hover:text-red-600">-</button>
                                            <span className={`font-black w-8 text-center ${isOut ? 'text-red-500' : isLow ? 'text-amber-500' : 'text-[var(--text-main)]'}`}>{item.quantity}</span>
                                            <button onClick={() => adjustStock(item.id, item.quantity, 1)} className="btn btn-xs btn-square btn-ghost hover:bg-emerald-100 hover:text-emerald-600">+</button>
                                        </div>
                                    </div>

                                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => { setEditingItem(item); setIsModalOpen(true); }} className="btn btn-xs btn-ghost flex-1 border border-[var(--border-color)] text-[var(--text-muted)]">
                                            Edit
                                        </button>
                                        <button onClick={() => handleDelete(item.id)} className="btn btn-xs btn-ghost btn-square text-red-400 hover:bg-red-50">
                                            <Trash2 size={12} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                    {filteredItems.length === 0 && (
                        <div className="col-span-full text-center p-12 opacity-50">
                            <Package size={48} className="mx-auto mb-4 text-slate-300" />
                            <p className="font-bold text-lg text-[var(--text-muted)]">No parts found</p>
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