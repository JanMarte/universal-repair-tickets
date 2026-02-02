import React, { useState, useEffect, useRef } from 'react';
import { X, Save, Search, FileText, Smartphone, Hash, User, Mail, Phone, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useToast } from '../context/ToastProvider';
import { formatPhoneNumber } from '../utils';

export default function IntakeModal({ isOpen, onClose, onTicketCreated, initialCustomer }) {
    const { addToast } = useToast();
    const [activeTab, setActiveTab] = useState('existing');
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Validation State
    const [errors, setErrors] = useState({});
    const [isShaking, setIsShaking] = useState(false);

    // Refs
    const lastToastTime = useRef(0);
    const shakeTimeout = useRef(null);

    // Data for Auto-Complete
    const [catalog, setCatalog] = useState([]);
    const [uniqueBrands, setUniqueBrands] = useState([]);
    const [filteredModels, setFilteredModels] = useState([]);

    const [newCustomer, setNewCustomer] = useState({ full_name: '', email: '', phone: '' });
    const [device, setDevice] = useState({ brand: '', model: '', serial: '', description: '' });

    useEffect(() => {
        if (isOpen) {
            // Reset Form
            setErrors({});
            setIsShaking(false);
            setDevice({ brand: '', model: '', serial: '', description: '' });
            fetchCatalog();

            // --- SMART PRE-FILL LOGIC ---
            if (initialCustomer) {
                setActiveTab('existing');
                setSelectedCustomer(initialCustomer);
                setSearchTerm(initialCustomer.full_name);
                setSearchResults([]);
            } else {
                setActiveTab('existing');
                setSearchTerm('');
                setSelectedCustomer(null);
                setNewCustomer({ full_name: '', email: '', phone: '' });
            }
        }
    }, [isOpen, initialCustomer]);

    async function fetchCatalog() {
        const { data } = await supabase.from('device_catalog').select('*');
        if (data) {
            setCatalog(data);
            const brands = [...new Set(data.map(item => item.brand))].sort();
            setUniqueBrands(brands);
        }
    }

    useEffect(() => {
        if (device.brand) {
            const models = catalog
                .filter(item => item.brand.toLowerCase() === device.brand.toLowerCase())
                .map(item => item.model)
                .sort();
            setFilteredModels(models);
        } else {
            setFilteredModels([]);
        }
    }, [device.brand, catalog]);

    useEffect(() => {
        const delayDebounceFn = setTimeout(async () => {
            if (searchTerm.length > 2 && !selectedCustomer) {
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
    }, [searchTerm, selectedCustomer]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (isSubmitting) return;

        // --- VALIDATION ---
        const newErrors = {};
        let isValid = true;

        if (activeTab === 'existing' && !selectedCustomer) { newErrors.customerSearch = true; isValid = false; }
        if (activeTab === 'new') {
            if (!newCustomer.full_name) { newErrors.new_name = true; isValid = false; }
            if (!newCustomer.phone) { newErrors.new_phone = true; isValid = false; }
        }

        if (!device.brand) { newErrors.brand = true; isValid = false; }
        if (!device.model) { newErrors.model = true; isValid = false; }
        if (!device.description) { newErrors.description = true; isValid = false; }

        if (!isValid) {
            setErrors(newErrors);
            setIsShaking(false);
            setTimeout(() => {
                setIsShaking(true);
                shakeTimeout.current = setTimeout(() => setIsShaking(false), 500);
            }, 10);

            const now = Date.now();
            if (now - lastToastTime.current > 3000) {
                addToast("Please check the required fields.", "error");
                lastToastTime.current = now;
            }
            return;
        }

        setIsSubmitting(true);

        try {
            let customerId = selectedCustomer?.id;

            // 1. Create New Customer if needed
            if (activeTab === 'new') {
                const { data: createdCust, error: custError } = await supabase
                    .from('customers')
                    .insert([{
                        full_name: newCustomer.full_name,
                        email: newCustomer.email,
                        phone: newCustomer.phone
                    }])
                    .select()
                    .single();

                if (custError) throw custError;
                customerId = createdCust.id;
            }

            // 2. Create Ticket
            const { error: ticketError } = await supabase
                .from('tickets')
                .insert([{
                    customer_id: customerId,
                    brand: device.brand,
                    model: device.model,
                    serial_number: device.serial,
                    description: device.description,
                    status: 'intake',
                    estimate_total: 0
                }]);

            if (ticketError) throw ticketError;

            // Success!
            addToast("Ticket created successfully!", "success");
            if (onTicketCreated) onTicketCreated();
            onClose();

        } catch (error) {
            console.error(error);
            addToast("Failed to create ticket.", "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    const clearError = (field) => {
        if (errors[field]) setErrors(prev => ({ ...prev, [field]: false }));
    };

    // Helper for initials
    const getInitials = (name) => {
        if (!name) return '??';
        const parts = name.trim().split(' ');
        if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
        return name.substring(0, 2).toUpperCase();
    };

    const getErrorClass = (field) => (!errors[field] ? '' : `input-error ring-2 ring-red-100 ${isShaking ? 'animate-shake' : ''}`);
    const getTextAreaErrorClass = (field) => (!errors[field] ? '' : `textarea-error ring-2 ring-red-100 ${isShaking ? 'animate-shake' : ''}`);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade">
            <div className="bg-[var(--bg-surface)] w-full max-w-2xl rounded-2xl shadow-2xl border border-[var(--border-color)] flex flex-col max-h-[90vh] overflow-hidden animate-pop ring-1 ring-white/20">

                {/* HEADER */}
                <div className="p-5 border-b border-[var(--border-color)] flex justify-between items-center bg-[var(--bg-surface)]">
                    <div>
                        <h2 className="text-xl font-black text-[var(--text-main)] flex items-center gap-2 tracking-tight">
                            <FileText size={22} className="text-indigo-600" /> New Repair Intake
                        </h2>
                        <p className="text-xs text-[var(--text-muted)] mt-1 font-medium pl-8">Enter customer and device details below</p>
                    </div>
                    <button onClick={onClose} className="btn btn-sm btn-circle btn-ghost text-[var(--text-muted)] hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="overflow-y-auto p-6 space-y-8 bg-slate-50/50 dark:bg-slate-900/20">

                    {/* SECTION 1: CUSTOMER SELECTION */}
                    <div className="bg-[var(--bg-surface)] p-5 rounded-xl border border-[var(--border-color)] shadow-sm">

                        {/* Custom Segmented Control */}
                        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg mb-5">
                            <button
                                className={`flex-1 py-2 text-sm font-bold rounded-md transition-all flex items-center justify-center gap-2 ${activeTab === 'existing' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                onClick={() => { setActiveTab('existing'); setErrors({}); }}
                            >
                                <Search size={14} /> Existing Customer
                            </button>
                            <button
                                className={`flex-1 py-2 text-sm font-bold rounded-md transition-all flex items-center justify-center gap-2 ${activeTab === 'new' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                onClick={() => { setActiveTab('new'); setErrors({}); }}
                            >
                                <User size={14} /> New Customer
                            </button>
                        </div>

                        {activeTab === 'existing' ? (
                            <div className="relative">
                                {/* Search Bar */}
                                {!selectedCustomer && (
                                    <div className="relative group">
                                        <Search className="absolute left-3 top-3.5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
                                        <input
                                            type="text"
                                            placeholder="Search by Name or Phone Number..."
                                            className={`input input-bordered w-full pl-10 font-medium h-12 bg-white dark:bg-slate-800 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all ${getErrorClass('customerSearch')}`}
                                            value={searchTerm}
                                            onChange={(e) => {
                                                setSearchTerm(e.target.value);
                                                clearError('customerSearch');
                                            }}
                                            disabled={!!initialCustomer}
                                        />
                                    </div>
                                )}

                                {/* Auto-Complete Results */}
                                {searchResults.length > 0 && !selectedCustomer && (
                                    <ul className="absolute z-10 w-full mt-2 bg-white dark:bg-slate-800 border border-[var(--border-color)] rounded-xl shadow-xl max-h-56 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700">
                                        {searchResults.map(customer => (
                                            <li key={customer.id}
                                                className="p-3 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer flex justify-between items-center transition-colors group"
                                                onClick={() => {
                                                    setSelectedCustomer(customer);
                                                    setSearchTerm(customer.full_name);
                                                    setSearchResults([]);
                                                    clearError('customerSearch');
                                                }}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-600 flex items-center justify-center text-xs font-bold text-slate-600 dark:text-slate-300">
                                                        {getInitials(customer.full_name)}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-[var(--text-main)] text-sm group-hover:text-indigo-600">{customer.full_name}</div>
                                                        <div className="text-xs text-[var(--text-muted)]">{customer.email}</div>
                                                    </div>
                                                </div>
                                                <div className="font-mono text-xs font-medium text-[var(--text-muted)] bg-slate-100 dark:bg-slate-900 px-2 py-1 rounded">
                                                    {formatPhoneNumber(customer.phone)}
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                )}

                                {/* Selected Customer Card */}
                                {selectedCustomer && (
                                    <div className="bg-indigo-50/50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 rounded-xl p-4 flex items-center justify-between animate-pop">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-300 flex items-center justify-center text-lg font-black shadow-sm border border-indigo-200">
                                                {getInitials(selectedCustomer.full_name)}
                                            </div>
                                            <div>
                                                <div className="font-black text-slate-800 dark:text-white flex items-center gap-2">
                                                    {selectedCustomer.full_name}
                                                    <span className="badge badge-sm badge-success gap-1 text-white"><CheckCircle size={10} /> Verified</span>
                                                </div>
                                                <div className="text-xs text-slate-500 font-medium flex gap-3 mt-1">
                                                    <span className="flex items-center gap-1"><Phone size={10} /> {formatPhoneNumber(selectedCustomer.phone)}</span>
                                                    {selectedCustomer.email && <span className="flex items-center gap-1"><Mail size={10} /> {selectedCustomer.email}</span>}
                                                </div>
                                            </div>
                                        </div>
                                        {!initialCustomer && (
                                            <button onClick={() => { setSelectedCustomer(null); setSearchTerm('') }} className="btn btn-sm btn-ghost text-red-500 hover:bg-red-50">Change</button>
                                        )}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="form-control">
                                    <label className="label text-xs font-bold uppercase text-slate-400 pb-1">Full Name</label>
                                    <input type="text" placeholder="John Doe" className={`input input-bordered w-full font-medium bg-white dark:bg-slate-800 ${getErrorClass('new_name')}`} value={newCustomer.full_name} onChange={e => { setNewCustomer({ ...newCustomer, full_name: e.target.value }); clearError('new_name'); }} />
                                </div>
                                <div className="form-control">
                                    <label className="label text-xs font-bold uppercase text-slate-400 pb-1">Email Address</label>
                                    <input type="email" placeholder="john@example.com" className="input input-bordered w-full font-medium bg-white dark:bg-slate-800" value={newCustomer.email} onChange={e => setNewCustomer({ ...newCustomer, email: e.target.value })} />
                                </div>
                                <div className="form-control md:col-span-2">
                                    <label className="label text-xs font-bold uppercase text-slate-400 pb-1">Phone Number</label>
                                    <input type="tel" placeholder="(555) 123-4567" className={`input input-bordered w-full font-medium bg-white dark:bg-slate-800 ${getErrorClass('new_phone')}`} value={newCustomer.phone} onChange={e => { setNewCustomer({ ...newCustomer, phone: e.target.value }); clearError('new_phone'); }} />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* SECTION 2: DEVICE INFO */}
                    <div className="bg-[var(--bg-surface)] p-5 rounded-xl border border-[var(--border-color)] shadow-sm">
                        <h3 className="text-xs font-bold uppercase text-[var(--text-muted)] tracking-wider mb-4 flex items-center gap-2 border-b border-[var(--border-color)] pb-2">
                            <Smartphone size={16} className="text-emerald-500" /> Device Information
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div className="form-control">
                                <label className="label text-xs font-bold uppercase text-slate-400 pb-1">Brand</label>
                                <input type="text" list="brand-list" placeholder="e.g. Dyson" className={`input input-bordered w-full font-bold bg-white dark:bg-slate-800 focus:border-emerald-500 ${getErrorClass('brand')}`} value={device.brand} onChange={e => { setDevice({ ...device, brand: e.target.value }); clearError('brand'); }} />
                                <datalist id="brand-list">{uniqueBrands.map(brand => <option key={brand} value={brand} />)}</datalist>
                            </div>
                            <div className="form-control">
                                <label className="label text-xs font-bold uppercase text-slate-400 pb-1">Model</label>
                                <input type="text" list="model-list" placeholder="e.g. V11 Animal" className={`input input-bordered w-full font-bold bg-white dark:bg-slate-800 focus:border-emerald-500 ${getErrorClass('model')}`} value={device.model} onChange={e => { setDevice({ ...device, model: e.target.value }); clearError('model'); }} />
                                <datalist id="model-list">{filteredModels.map(model => <option key={model} value={model} />)}</datalist>
                            </div>
                            <div className="md:col-span-2 relative form-control">
                                <label className="label text-xs font-bold uppercase text-slate-400 pb-1">Serial Number</label>
                                <div className="relative">
                                    <Hash className="absolute left-3 top-3.5 text-slate-400" size={16} />
                                    <input type="text" placeholder="Optional" className="input input-bordered w-full pl-10 font-mono text-sm bg-white dark:bg-slate-800 focus:border-emerald-500" value={device.serial} onChange={e => setDevice({ ...device, serial: e.target.value })} />
                                </div>
                            </div>
                        </div>

                        <div className="form-control">
                            <label className="label text-xs font-bold uppercase text-slate-400 pb-1 flex justify-between">
                                <span>Issue Description</span>
                                {errors.description && <span className="text-red-500 flex items-center gap-1"><AlertCircle size={10} /> Required</span>}
                            </label>
                            <textarea
                                className={`textarea textarea-bordered w-full h-32 text-base leading-relaxed bg-white dark:bg-slate-800 focus:border-emerald-500 ${getTextAreaErrorClass('description')}`}
                                placeholder="Describe the issue... (e.g. Motor makes loud grinding noise)"
                                value={device.description}
                                onChange={e => { setDevice({ ...device, description: e.target.value }); clearError('description'); }}
                            ></textarea>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-5 border-t border-[var(--border-color)] bg-[var(--bg-surface)] flex justify-end gap-3 z-10 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                    <button onClick={onClose} className="btn btn-ghost font-bold text-[var(--text-muted)] hover:bg-slate-100 dark:hover:bg-slate-800">Cancel</button>
                    <button onClick={handleSubmit} disabled={isSubmitting} className="btn btn-gradient px-8 shadow-lg text-white font-bold tracking-wide transition-transform active:scale-95">
                        {isSubmitting ? <span className="loading loading-spinner"></span> : <><Save size={18} /> Create Ticket</>}
                    </button>
                </div>
            </div>
        </div>
    );
}