import React, { useState, useEffect } from 'react';
import { X, Save, Search, User, Smartphone, FileText, Hash } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useToast } from '../context/ToastProvider';
import { formatPhoneNumber } from '../utils';

export default function IntakeModal({ isOpen, onClose, onSubmit }) {
    const { addToast } = useToast();
    const [activeTab, setActiveTab] = useState('existing');
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [selectedCustomer, setSelectedCustomer] = useState(null);

    // Data for Auto-Complete
    const [catalog, setCatalog] = useState([]); // All data
    const [uniqueBrands, setUniqueBrands] = useState([]); // Just ['Dyson', 'Shark'...]
    const [filteredModels, setFilteredModels] = useState([]); // Models for selected brand

    const [newCustomer, setNewCustomer] = useState({ full_name: '', email: '', phone: '' });
    const [device, setDevice] = useState({ brand: '', model: '', serial: '', description: '' });

    useEffect(() => {
        if (isOpen) {
            // Reset forms
            setSearchTerm('');
            setSearchResults([]);
            setSelectedCustomer(null);
            setNewCustomer({ full_name: '', email: '', phone: '' });
            setDevice({ brand: '', model: '', serial: '', description: '' });

            // Fetch the Catalog for auto-complete
            fetchCatalog();
        }
    }, [isOpen]);

    async function fetchCatalog() {
        const { data } = await supabase.from('device_catalog').select('*');
        if (data) {
            setCatalog(data);
            // Extract unique brands
            const brands = [...new Set(data.map(item => item.brand))].sort();
            setUniqueBrands(brands);
        }
    }

    // When Brand Changes -> Filter the Model List
    useEffect(() => {
        if (device.brand) {
            // Find models that match the typed brand (case insensitive)
            const models = catalog
                .filter(item => item.brand.toLowerCase() === device.brand.toLowerCase())
                .map(item => item.model)
                .sort();
            setFilteredModels(models);
        } else {
            setFilteredModels([]);
        }
    }, [device.brand, catalog]);

    // Customer Search Logic
    useEffect(() => {
        const delayDebounceFn = setTimeout(async () => {
            if (searchTerm.length > 2) {
                const { data } = await supabase
                    .from('customers')
                    .select('*')
                    .or(`full_name.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`)
                    .limit(5);
                setSearchResults(data || []);
            } else {
                setSearchResults([]);
            }
        }, 300);
        return () => clearTimeout(delayDebounceFn);
    }, [searchTerm]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (activeTab === 'existing' && !selectedCustomer) {
            addToast("Please select a customer", "error");
            return;
        }
        if (!device.brand || !device.model || !device.description) {
            addToast("Please fill in device details", "error");
            return;
        }

        const formData = {
            customer_id: activeTab === 'existing' ? selectedCustomer.id : null,
            full_name: activeTab === 'existing' ? selectedCustomer.full_name : newCustomer.full_name,
            email: activeTab === 'existing' ? selectedCustomer.email : newCustomer.email,
            phone: activeTab === 'existing' ? selectedCustomer.phone : newCustomer.phone,
            brand: device.brand,
            model: device.model,
            serial: device.serial,
            description: device.description
        };
        onSubmit(formData);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade">
            <div className="bg-[var(--bg-surface)] w-full max-w-2xl rounded-2xl shadow-2xl border border-[var(--border-color)] flex flex-col max-h-[90vh] overflow-hidden">

                {/* Header */}
                <div className="p-5 border-b border-[var(--border-color)] flex justify-between items-center bg-[var(--bg-subtle)]">
                    <h2 className="text-xl font-black text-[var(--text-main)] flex items-center gap-2">
                        <FileText size={20} className="text-primary" /> New Repair Ticket
                    </h2>
                    <button onClick={onClose} className="btn btn-sm btn-circle btn-ghost text-[var(--text-muted)] hover:bg-slate-200 dark:hover:bg-slate-700">
                        <X size={20} />
                    </button>
                </div>

                <div className="overflow-y-auto p-6 space-y-8">

                    {/* SECTION 1: CUSTOMER */}
                    <div>
                        <div className="tabs tabs-boxed bg-[var(--bg-subtle)] p-1 mb-4 rounded-xl border border-[var(--border-color)]">
                            <a className={`tab flex-1 rounded-lg font-bold transition-all ${activeTab === 'existing' ? 'bg-[var(--bg-surface)] shadow-sm text-primary' : 'text-[var(--text-muted)]'}`} onClick={() => setActiveTab('existing')}>Existing Customer</a>
                            <a className={`tab flex-1 rounded-lg font-bold transition-all ${activeTab === 'new' ? 'bg-[var(--bg-surface)] shadow-sm text-primary' : 'text-[var(--text-muted)]'}`} onClick={() => setActiveTab('new')}>New Customer</a>
                        </div>

                        {activeTab === 'existing' ? (
                            <div className="relative">
                                <div className="relative">
                                    <Search className="absolute left-3 top-3.5 text-slate-400" size={18} />
                                    <input
                                        type="text"
                                        placeholder="Search customer name or phone..."
                                        className="input input-bordered w-full pl-10 font-medium bg-[var(--bg-surface)] text-[var(--text-main)]"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                                {/* Dropdown Logic (Hidden for brevity, assumes standard implementation) */}
                                {searchResults.length > 0 && !selectedCustomer && (
                                    <ul className="absolute z-10 w-full mt-1 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-xl shadow-xl max-h-48 overflow-y-auto">
                                        {searchResults.map(customer => {
                                            const formatted = formatPhoneNumber(customer.phone || '');
                                            const prefix = formatted.slice(0, -4);
                                            const last4 = formatted.slice(-4);
                                            return (
                                                <li key={customer.id}
                                                    className="p-3 hover:bg-[var(--bg-subtle)] cursor-pointer flex justify-between items-center border-b border-[var(--border-color)] last:border-0 transition-colors"
                                                    onClick={() => {
                                                        setSelectedCustomer(customer);
                                                        setSearchTerm(customer.full_name);
                                                        setSearchResults([]);
                                                    }}
                                                >
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-[var(--text-main)] text-sm">{customer.full_name}</span>
                                                        <span className="text-xs text-[var(--text-muted)]">{customer.email}</span>
                                                    </div>
                                                    <div className="font-mono text-xs text-[var(--text-muted)] bg-[var(--bg-subtle)] px-2 py-1 rounded">
                                                        {prefix}<span className="text-red-600 dark:text-red-400 font-black underline decoration-2 decoration-red-500 text-sm">{last4}</span>
                                                    </div>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                )}
                                {selectedCustomer && (
                                    <div className="mt-3 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl flex justify-between items-center animate-pop">
                                        <div className="text-sm font-bold text-green-700 dark:text-green-400">✓ {selectedCustomer.full_name} selected</div>
                                        <button onClick={() => { setSelectedCustomer(null); setSearchTerm('') }} className="text-xs text-red-500 font-bold hover:underline">Change</button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <input type="text" placeholder="Full Name" className="input input-bordered w-full bg-[var(--bg-surface)] text-[var(--text-main)]" value={newCustomer.full_name} onChange={e => setNewCustomer({ ...newCustomer, full_name: e.target.value })} />
                                <input type="email" placeholder="Email (Optional)" className="input input-bordered w-full bg-[var(--bg-surface)] text-[var(--text-main)]" value={newCustomer.email} onChange={e => setNewCustomer({ ...newCustomer, email: e.target.value })} />
                                <input type="tel" placeholder="Phone Number" className="input input-bordered w-full md:col-span-2 bg-[var(--bg-surface)] text-[var(--text-main)]" value={newCustomer.phone} onChange={e => setNewCustomer({ ...newCustomer, phone: e.target.value })} />
                            </div>
                        )}
                    </div>

                    {/* SECTION 2: DEVICE INFO (UPDATED WITH DATALISTS) */}
                    <div>
                        <h3 className="text-xs font-bold uppercase text-[var(--text-muted)] tracking-wider mb-3 flex items-center gap-2">
                            <Smartphone size={16} /> Device Information
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">

                            {/* BRAND INPUT WITH DATALIST */}
                            <div className="form-control">
                                <input
                                    type="text"
                                    list="brand-list"
                                    placeholder="Brand (e.g. Dyson)"
                                    className="input input-bordered w-full font-bold bg-[var(--bg-surface)] text-[var(--text-main)]"
                                    value={device.brand}
                                    onChange={e => setDevice({ ...device, brand: e.target.value })}
                                />
                                <datalist id="brand-list">
                                    {uniqueBrands.map(brand => (
                                        <option key={brand} value={brand} />
                                    ))}
                                </datalist>
                            </div>

                            {/* MODEL INPUT WITH SMART DATALIST */}
                            <div className="form-control">
                                <input
                                    type="text"
                                    list="model-list"
                                    placeholder="Model (e.g. V11 Animal)"
                                    className="input input-bordered w-full font-bold bg-[var(--bg-surface)] text-[var(--text-main)]"
                                    value={device.model}
                                    onChange={e => setDevice({ ...device, model: e.target.value })}
                                />
                                <datalist id="model-list">
                                    {filteredModels.map(model => (
                                        <option key={model} value={model} />
                                    ))}
                                </datalist>
                            </div>

                            <div className="md:col-span-2 relative">
                                <Hash className="absolute left-3 top-3.5 text-slate-400" size={16} />
                                <input
                                    type="text"
                                    placeholder="Serial Number (Optional)"
                                    className="input input-bordered w-full pl-10 font-mono text-sm bg-[var(--bg-surface)] text-[var(--text-main)]"
                                    value={device.serial}
                                    onChange={e => setDevice({ ...device, serial: e.target.value })}
                                />
                            </div>
                        </div>
                        <textarea
                            className="textarea textarea-bordered w-full h-32 text-base leading-relaxed bg-[var(--bg-surface)] text-[var(--text-main)]"
                            placeholder="Describe the issue... (e.g. Motor makes loud grinding noise)"
                            value={device.description}
                            onChange={e => setDevice({ ...device, description: e.target.value })}
                        ></textarea>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-5 border-t border-[var(--border-color)] bg-[var(--bg-subtle)] flex justify-end gap-3">
                    <button onClick={onClose} className="btn btn-ghost text-[var(--text-muted)] hover:bg-slate-200 dark:hover:bg-slate-700">Cancel</button>
                    <button onClick={handleSubmit} className="btn btn-primary px-8 shadow-lg text-white font-bold tracking-wide">
                        <Save size={18} /> Create Ticket
                    </button>
                </div>
            </div>
        </div>
    );
}