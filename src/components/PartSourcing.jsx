import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import {
    Search, Package, ShoppingCart, ExternalLink, Box,
    ShoppingBag, ChevronDown, ChevronUp, Plus, Check,
    QrCode, Wrench
} from 'lucide-react';
import { useToast } from '../context/ToastProvider';
import QRScanner from './QRScanner';

export default function PartSourcing({ initialQuery = '', ticketId, onAddToEstimate }) {
    const { addToast } = useToast();
    const [searchTerm, setSearchTerm] = useState('');
    const [internalResults, setInternalResults] = useState([]);
    const [loading, setLoading] = useState(false);

    // UI State
    const [isExpanded, setIsExpanded] = useState(false);
    const [justAddedId, setJustAddedId] = useState(null);
    const [isScanning, setIsScanning] = useState(false);

    // --- MEMORY LOGIC ---
    useEffect(() => {
        const savedSearch = localStorage.getItem(`part_search_${ticketId}`);
        if (savedSearch) {
            setSearchTerm(savedSearch);
            performSearch(savedSearch);
        } else if (initialQuery) {
            setSearchTerm(initialQuery);
            performSearch(initialQuery);
        }
    }, [ticketId, initialQuery]);

    // --- SEARCH LOGIC (Name OR SKU) ---
    const performSearch = async (term) => {
        if (!term || !term.trim()) return;
        setLoading(true);

        const { data, error } = await supabase
            .from('inventory')
            .select('*')
            .or(`name.ilike.%${term}%,sku.ilike.%${term}%`);

        if (!error) setInternalResults(data || []);
        setLoading(false);
    };

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        localStorage.setItem(`part_search_${ticketId}`, searchTerm);
        performSearch(searchTerm);
    };

    const handleScan = (code) => {
        setIsScanning(false);
        setSearchTerm(code);
        performSearch(code);
        addToast("Barcode scanned", "success");
    };

    // --- ADD TO TICKET & SUBTRACT STOCK ---
    const handleAddPart = async (part) => {
        if (!ticketId) return;

        // 1. Add to Bill (WITH INVENTORY LINK)
        const { error: estimateError } = await supabase.from('estimate_items').insert([{
            ticket_id: ticketId,
            description: part.name,
            part_cost: part.price,
            labor_cost: 0,
            // Track where it came from so we can restock it later if deleted
            inventory_id: part.id,
            sku: part.sku,
            bin_location: part.bin_location,
            manufacturer: part.manufacturer
        }]);

        if (estimateError) {
            console.error(estimateError);
            addToast("Failed to add part to bill", "error");
            return;
        }

        // 2. Subtract from Stock
        const newQuantity = Math.max(0, part.quantity - 1);
        const { error: stockError } = await supabase
            .from('inventory')
            .update({ quantity: newQuantity })
            .eq('id', part.id);

        if (stockError) {
            console.error("Stock update failed", stockError);
            addToast("Added to bill, but stock update failed", "warning");
        } else {
            // 3. Update UI Instantly
            setInternalResults(prev => prev.map(item =>
                item.id === part.id ? { ...item, quantity: newQuantity } : item
            ));

            setJustAddedId(part.id);
            setTimeout(() => setJustAddedId(null), 2000);

            if (onAddToEstimate) onAddToEstimate();
            addToast(`Added ${part.name} & updated stock`, "success");
        }
    };

    const vendors = [
        {
            name: 'Amazon',
            color: 'hover:bg-amber-50 hover:border-amber-500 text-amber-700 dark:text-amber-400 dark:hover:bg-amber-900/20 dark:hover:border-amber-500/50',
            icon: <ShoppingBag size={20} />,
            getUrl: (q) => `https://www.amazon.com/s?k=${encodeURIComponent(q)}&i=tools`
        },
        {
            name: 'Dyson Official',
            color: 'hover:bg-slate-100 hover:border-slate-500 text-slate-700 dark:text-slate-300 dark:hover:bg-slate-700/50 dark:hover:border-slate-500/50',
            icon: <Package size={20} />,
            getUrl: (q) => `https://www.dyson.com/search-results?q=${encodeURIComponent(q)}`
        },
        {
            name: 'eBay',
            color: 'hover:bg-blue-50 hover:border-blue-500 text-blue-700 dark:text-blue-400 dark:hover:bg-blue-900/20 dark:hover:border-blue-500/50',
            icon: <ShoppingCart size={20} />,
            getUrl: (q) => `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(q)}`
        },
        {
            name: 'Parts Warehouse',
            color: 'hover:bg-red-50 hover:border-red-500 text-red-700 dark:text-red-400 dark:hover:bg-red-900/20 dark:hover:border-red-500/50',
            icon: <Wrench size={20} />,
            getUrl: (q) => `https://www.partswarehouse.com/searchresults.asp?Search=${encodeURIComponent(q)}`
        },
        {
            name: 'Google Shopping',
            color: 'hover:bg-indigo-50 hover:border-indigo-500 text-indigo-700 dark:text-indigo-400 dark:hover:bg-indigo-900/20 dark:hover:border-indigo-500/50',
            icon: <Search size={20} />,
            getUrl: (q) => `https://www.google.com/search?tbm=shop&q=${encodeURIComponent(q)}`
        }
    ];

    return (
        <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border-color)] overflow-hidden shadow-sm mt-6 animate-fade-in-up transition-all">

            {/* --- UPDATED HEADER BACKGROUND --- */}
            <div
                onClick={() => setIsExpanded(!isExpanded)}
                className="bg-slate-50 dark:bg-slate-800/50 px-6 py-4 border-b border-[var(--border-color)] flex justify-between items-center cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
                <div className="flex items-center gap-2">
                    <Search size={16} className="text-[var(--text-muted)]" />
                    <h2 className="text-xs font-bold uppercase text-[var(--text-muted)] tracking-widest">
                        Unified Part Search
                    </h2>
                    {!isExpanded && searchTerm && (
                        <span className="ml-2 px-2 py-0.5 rounded-md bg-white border border-indigo-200 text-indigo-700 dark:bg-indigo-900/40 dark:border-indigo-700 dark:text-indigo-200 text-xs font-bold shadow-sm">
                            "{searchTerm}"
                        </span>
                    )}
                </div>
                <div className="text-[var(--text-muted)]">
                    {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </div>
            </div>

            {/* EXPANDABLE CONTENT AREA */}
            {isExpanded && (
                <div className="p-6 animate-slide-down">

                    {/* SEARCH INPUT */}
                    <form onSubmit={handleSearchSubmit} className="flex gap-2 mb-8 relative">
                        <div className="relative flex-1">
                            <input
                                type="text"
                                placeholder="Enter part name or scan barcode..."
                                className="input input-bordered w-full pl-4 pr-12 bg-[var(--bg-surface)] text-[var(--text-main)] font-bold text-lg focus:border-indigo-500"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                            <button
                                type="button"
                                onClick={() => setIsScanning(true)}
                                className="absolute right-2 top-1/2 -translate-y-1/2 btn btn-sm btn-ghost btn-circle text-[var(--text-muted)] hover:text-indigo-600"
                                title="Scan Barcode"
                            >
                                <QrCode size={20} />
                            </button>
                        </div>
                        <button type="submit" className="btn btn-gradient text-white px-8">
                            {loading ? <span className="loading loading-spinner"></span> : 'Find Part'}
                        </button>
                    </form>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

                        {/* LEFT: INTERNAL STOCK */}
                        <div>
                            <div className="flex items-center gap-2 mb-4">
                                <Box size={18} className="text-emerald-600" />
                                <h3 className="font-black text-[var(--text-main)]">In Stock (My Shop)</h3>
                            </div>

                            <div className="bg-[var(--bg-subtle)] rounded-xl border border-[var(--border-color)] min-h-[150px] p-2">
                                {internalResults.length > 0 ? (
                                    <div className="space-y-2">
                                        {internalResults.map(item => (
                                            <div key={item.id} className="p-3 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-lg flex justify-between items-center shadow-sm group">
                                                <div>
                                                    <div className="font-bold text-[var(--text-main)]">{item.name}</div>
                                                    <div className="text-xs text-[var(--text-muted)] flex gap-2 mt-1">
                                                        <span className="bg-slate-100 dark:bg-slate-800 px-1.5 rounded text-[var(--text-main)] border border-[var(--border-color)]">Bin: {item.bin_location || 'N/A'}</span>
                                                        <span className="font-mono opacity-75">{item.sku}</span>
                                                    </div>
                                                </div>
                                                <div className="text-right flex items-center gap-3">
                                                    <div>
                                                        <div className={`font-black ${item.quantity > 0 ? 'text-emerald-600' : 'text-red-500'}`}>{item.quantity > 0 ? `${item.quantity} Left` : 'Out of Stock'}</div>
                                                        <div className="text-xs font-bold text-[var(--text-main)]">${item.price}</div>
                                                    </div>

                                                    {/* ADD BUTTON */}
                                                    <button
                                                        onClick={() => handleAddPart(item)}
                                                        className={`btn btn-sm btn-circle ${justAddedId === item.id ? 'btn-success text-white' : 'btn-ghost border border-[var(--border-color)]'}`}
                                                        disabled={justAddedId === item.id || item.quantity < 1}
                                                    >
                                                        {justAddedId === item.id ? <Check size={16} /> : <Plus size={16} />}
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center text-[var(--text-muted)] opacity-60 min-h-[140px]">
                                        <Box size={32} className="mb-2" />
                                        <span className="text-sm font-medium">No matches found in inventory.</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* RIGHT: EXTERNAL VENDORS */}
                        <div>
                            <div className="flex items-center gap-2 mb-4">
                                <ShoppingCart size={18} className="text-indigo-600" />
                                <h3 className="font-black text-[var(--text-main)]">Order Online</h3>
                            </div>

                            <div className="grid grid-cols-1 gap-3">
                                {vendors.map((vendor) => (
                                    <a
                                        key={vendor.name}
                                        href={searchTerm ? vendor.getUrl(searchTerm) : '#'}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className={`
                                            flex items-center justify-between p-4 rounded-xl border-2 border-transparent transition-all shadow-sm bg-[var(--bg-subtle)] group
                                            ${searchTerm ? vendor.color + ' cursor-pointer' : 'opacity-50 cursor-not-allowed grayscale'}
                                        `}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-white rounded-full shadow-sm text-black group-hover:scale-110 transition-transform">
                                                {vendor.icon}
                                            </div>
                                            <div className="font-bold text-[var(--text-main)]">Search {vendor.name}</div>
                                        </div>
                                        <ExternalLink size={18} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </a>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* SCANNER OVERLAY */}
            {isScanning && (
                <QRScanner onClose={() => setIsScanning(false)} onScan={handleScan} />
            )}
        </div>
    );
}