import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Search, Package, ShoppingCart, ExternalLink, Box, ShoppingBag, ChevronDown, ChevronUp } from 'lucide-react';

// NEW PROP: ticketId (Needed to save unique search history per ticket)
export default function PartSourcing({ initialQuery = '', ticketId }) {
    const [searchTerm, setSearchTerm] = useState('');
    const [internalResults, setInternalResults] = useState([]);
    const [loading, setLoading] = useState(false);

    // UI State: Collapsed by default
    const [isExpanded, setIsExpanded] = useState(false);

    // --- MEMORY LOGIC ---
    useEffect(() => {
        // 1. Try to find a saved search for THIS specific ticket
        const savedSearch = localStorage.getItem(`part_search_${ticketId}`);

        if (savedSearch) {
            setSearchTerm(savedSearch);
            performSearch(savedSearch); // Auto-run the saved search
        } else if (initialQuery) {
            setSearchTerm(initialQuery);
            performSearch(initialQuery); // Auto-run the default
        }
    }, [ticketId, initialQuery]);

    const performSearch = async (term) => {
        if (!term || !term.trim()) return;
        setLoading(true);

        const { data, error } = await supabase
            .from('inventory')
            .select('*')
            .ilike('name', `%${term}%`);

        if (!error) setInternalResults(data || []);
        setLoading(false);
    };

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        // Save to memory when you explicitly search
        localStorage.setItem(`part_search_${ticketId}`, searchTerm);
        performSearch(searchTerm);
    };

    // --- VENDOR CONFIGURATION (Updated for Dark Mode Contrast) ---
    const vendors = [
        {
            name: 'Amazon',
            // Light Mode: Amber-50 bg, Dark Amber Text
            // Dark Mode: Amber-900/20 bg, Bright Amber Text
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
            icon: <WrenchIcon />,
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

            {/* COLLAPSIBLE HEADER */}
            <div
                onClick={() => setIsExpanded(!isExpanded)}
                className="bg-[var(--bg-subtle)] px-6 py-4 border-b border-[var(--border-color)] flex justify-between items-center cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
                <div className="flex items-center gap-2">
                    <Search size={16} className="text-[var(--text-muted)]" />
                    <h2 className="text-xs font-bold uppercase text-[var(--text-muted)] tracking-widest">
                        Unified Part Search
                    </h2>

                    {/* UPDATED BADGE: High contrast for Light Mode readability */}
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
                    <form onSubmit={handleSearchSubmit} className="flex gap-2 mb-8">
                        <input
                            type="text"
                            placeholder="Enter part name or number..."
                            className="input input-bordered flex-1 bg-[var(--bg-surface)] text-[var(--text-main)] font-bold text-lg focus:border-indigo-500"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
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
                                            <div key={item.id} className="p-3 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-lg flex justify-between items-center shadow-sm">
                                                <div>
                                                    <div className="font-bold text-[var(--text-main)]">{item.name}</div>
                                                    <div className="text-xs text-[var(--text-muted)]">Bin: {item.bin_location || 'N/A'} • SKU: {item.sku}</div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="font-black text-emerald-600">{item.quantity} Left</div>
                                                    <div className="text-xs font-bold">${item.price}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center text-[var(--text-muted)] opacity-60 min-h-[140px]">
                                        <Box size={32} className="mb-2" />
                                        <span className="text-sm font-medium">No internal stock found.</span>
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
        </div>
    );
}

const WrenchIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" /></svg>
);