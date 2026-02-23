import React, { useState, useEffect, useRef } from 'react';
import { X, Save, Search, FileText, Smartphone, Hash, User, Mail, Phone, CheckCircle, AlertCircle, Tag, Cpu, PlusCircle } from 'lucide-react';
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
            let finalName = '';
            let finalPhone = '';

            // 1. Resolve Customer Data based on active tab
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
                finalName = createdCust.full_name;
                finalPhone = createdCust.phone;
            } else {
                // It's an existing customer
                finalName = selectedCustomer.full_name;
                finalPhone = selectedCustomer.phone;
            }

            // 2. Create Ticket (BUG FIX: Inject finalName and finalPhone here)
            const { data: newTicket, error: ticketError } = await supabase
                .from('tickets')
                .insert([{
                    customer_id: customerId,
                    customer_name: finalName,   // <-- BUG FIX: Copies the text to the ticket
                    phone: finalPhone,          // <-- BUG FIX: Copies the text to the ticket
                    brand: device.brand,
                    model: device.model,
                    serial_number: device.serial,
                    description: device.description,
                    status: 'intake',
                    estimate_total: 0
                }])
                .select()
                .single();

            if (ticketError) throw ticketError;

            // 3. Create initial audit log
            await supabase.from('audit_logs').insert([{
                ticket_id: newTicket.id,
                actor_name: 'System',
                action: 'TICKET CREATED',
                details: `Intake completed for ${device.brand} ${device.model}`
            }]);

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

    const getInitials = (name) => {
        if (!name) return '??';
        const parts = name.trim().split(' ');
        if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
        return name.substring(0, 2).toUpperCase();
    };

    const getErrorClass = (field) => (!errors[field] ? '' : `border-red-400 ring-2 ring-red-500/20 ${isShaking ? 'animate-shake' : ''}`);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade">
            <div className="bg-[var(--bg-surface)] w-full max-w-2xl rounded-2xl shadow-2xl border border-[var(--border-color)] flex flex-col max-h-[90vh] overflow-hidden animate-pop">

                {/* HEADER */}
                <div className="p-6 border-b-2 border-dashed border-[var(--border-color)] flex justify-between items-center bg-[var(--bg-surface)] shrink-0">
                    <div>
                        <h2 className="text-xl font-black text-[var(--text-main)] flex items-center gap-2 tracking-tight">
                            <FileText size={22} className="text-indigo-600" /> New Repair Intake
                        </h2>
                        {initialCustomer && (
                            <p className="text-[10px] font-black text-emerald-500 mt-1 uppercase tracking-widest flex items-center gap-1">
                                <User size={10} /> Linked to existing profile
                            </p>
                        )}
                    </div>
                    <button onClick={onClose} className="btn btn-sm btn-circle btn-ghost text-[var(--text-muted)] hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all">
                        <X size={20} />
                    </button>
                </div>

                {/* BODY */}
                <div className="overflow-y-auto custom-scrollbar p-6 space-y-8 bg-[var(--bg-subtle)] flex-1">

                    {/* CUSTOMER SECTION */}
                    <div className="bg-[var(--bg-surface)] p-5 rounded-2xl border border-[var(--border-color)] shadow-sm">
                        <div className="flex bg-[var(--bg-subtle)] p-1.5 rounded-xl mb-6 shadow-inner border border-[var(--border-color)]">
                            <button
                                className={`flex-1 py-2 text-[10px] uppercase tracking-widest font-black rounded-lg transition-all flex items-center justify-center gap-2 ${activeTab === 'existing' ? 'bg-[var(--bg-surface)] text-indigo-600 shadow-sm ring-1 ring-black/5 dark:ring-white/5' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}
                                onClick={() => { setActiveTab('existing'); setErrors({}); }}
                            >
                                <Search size={14} /> Existing Customer
                            </button>
                            <button
                                className={`flex-1 py-2 text-[10px] uppercase tracking-widest font-black rounded-lg transition-all flex items-center justify-center gap-2 ${activeTab === 'new' ? 'bg-[var(--bg-surface)] text-indigo-600 shadow-sm ring-1 ring-black/5 dark:ring-white/5' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}
                                onClick={() => { setActiveTab('new'); setErrors({}); }}
                            >
                                <User size={14} /> New Customer
                            </button>
                        </div>

                        {activeTab === 'existing' ? (
                            <div className="relative">
                                {!selectedCustomer && (
                                    <div className="relative group">
                                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within:text-indigo-500 transition-colors" size={18} />
                                        <input
                                            type="text"
                                            placeholder="Search by Name or Phone Number..."
                                            className={`input input-bordered w-full pl-11 font-medium h-12 bg-[var(--bg-subtle)] text-[var(--text-main)] shadow-inner focus:bg-[var(--bg-surface)] focus:border-indigo-500 transition-all ${getErrorClass('customerSearch')}`}
                                            value={searchTerm}
                                            onChange={(e) => { setSearchTerm(e.target.value); clearError('customerSearch'); }}
                                            disabled={!!initialCustomer}
                                        />
                                    </div>
                                )}

                                {searchResults.length > 0 && !selectedCustomer && (
                                    <ul className="absolute z-10 w-full mt-2 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-xl shadow-xl max-h-56 overflow-y-auto divide-y divide-[var(--border-color)] animate-pop">
                                        {searchResults.map(customer => (
                                            <li key={customer.id}
                                                className="p-3 hover:bg-[var(--bg-subtle)] cursor-pointer flex justify-between items-center transition-colors group"
                                                onClick={() => {
                                                    setSelectedCustomer(customer);
                                                    setSearchTerm(customer.full_name);
                                                    setSearchResults([]);
                                                    clearError('customerSearch');
                                                }}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-[var(--bg-subtle)] border border-[var(--border-color)] shadow-inner flex items-center justify-center text-xs font-bold text-[var(--text-muted)] group-hover:bg-indigo-50 dark:group-hover:bg-indigo-900/20 group-hover:text-indigo-600 transition-colors">
                                                        {getInitials(customer.full_name)}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-[var(--text-main)] text-sm group-hover:text-indigo-600 transition-colors">{customer.full_name}</div>
                                                        <div className="text-xs text-[var(--text-muted)]">{customer.email}</div>
                                                    </div>
                                                </div>
                                                <div className="font-mono text-xs font-medium text-[var(--text-muted)] bg-[var(--bg-subtle)] px-2 py-1 rounded border border-[var(--border-color)] shadow-inner">
                                                    {formatPhoneNumber(customer.phone)}
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                )}

                                {selectedCustomer && (
                                    <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] border-l-[4px] border-l-indigo-500 rounded-xl p-4 flex items-center justify-between shadow-sm animate-pop">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-full bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-lg font-black shadow-inner border border-indigo-200 dark:border-indigo-800">
                                                {getInitials(selectedCustomer.full_name)}
                                            </div>
                                            <div>
                                                <div className="font-black text-[var(--text-main)] flex items-center gap-2">
                                                    {selectedCustomer.full_name}
                                                    <span className="bg-emerald-500 text-white text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded shadow-sm flex items-center gap-1">
                                                        <CheckCircle size={10} /> Verified
                                                    </span>
                                                </div>
                                                <div className="text-xs text-[var(--text-muted)] font-medium flex gap-3 mt-1.5">
                                                    <span className="flex items-center gap-1"><Phone size={12} className="text-emerald-500" /> {formatPhoneNumber(selectedCustomer.phone)}</span>
                                                    {selectedCustomer.email && <span className="flex items-center gap-1"><Mail size={12} /> {selectedCustomer.email}</span>}
                                                </div>
                                            </div>
                                        </div>
                                        {!initialCustomer && (
                                            <button onClick={() => { setSelectedCustomer(null); setSearchTerm('') }} className="btn btn-sm btn-ghost text-[var(--text-muted)] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all border border-transparent hover:border-red-200 dark:hover:border-red-800">
                                                Change
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="form-control">
                                    <label className="label text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1 p-0">Full Name</label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[var(--text-muted)] group-focus-within:text-indigo-500 transition-colors"><User size={14} /></div>
                                        <input type="text" placeholder="John Doe" className={`input input-bordered w-full h-11 pl-9 bg-[var(--bg-subtle)] text-[var(--text-main)] font-bold shadow-inner focus:bg-[var(--bg-surface)] focus:border-indigo-500 transition-all text-sm ${getErrorClass('new_name')}`} value={newCustomer.full_name} onChange={e => { setNewCustomer({ ...newCustomer, full_name: e.target.value }); clearError('new_name'); }} />
                                    </div>
                                </div>
                                <div className="form-control">
                                    <label className="label text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1 p-0">Phone Number</label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[var(--text-muted)] group-focus-within:text-indigo-500 transition-colors"><Phone size={14} /></div>
                                        <input type="tel" placeholder="(555) 123-4567" className={`input input-bordered w-full h-11 pl-9 bg-[var(--bg-subtle)] text-[var(--text-main)] font-mono font-bold shadow-inner focus:bg-[var(--bg-surface)] focus:border-indigo-500 transition-all text-sm ${getErrorClass('new_phone')}`} value={newCustomer.phone} onChange={e => { setNewCustomer({ ...newCustomer, phone: e.target.value }); clearError('new_phone'); }} />
                                    </div>
                                </div>
                                <div className="form-control sm:col-span-2">
                                    <label className="label text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1 p-0">Email Address (Optional)</label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[var(--text-muted)] group-focus-within:text-indigo-500 transition-colors"><Mail size={14} /></div>
                                        <input type="email" placeholder="john@example.com" className="input input-bordered w-full h-11 pl-9 bg-[var(--bg-subtle)] text-[var(--text-main)] font-medium shadow-inner focus:bg-[var(--bg-surface)] focus:border-indigo-500 transition-all text-sm" value={newCustomer.email} onChange={e => setNewCustomer({ ...newCustomer, email: e.target.value })} />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* DEVICE SECTION */}
                    <div className="bg-[var(--bg-surface)] p-5 rounded-2xl border border-[var(--border-color)] shadow-sm">
                        <h3 className="text-[10px] font-black uppercase text-[var(--text-muted)] tracking-widest mb-4 flex items-center gap-2 border-b-2 border-dashed border-[var(--border-color)] pb-3">
                            <Smartphone size={16} className="text-amber-500" /> Device Information
                        </h3>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                            <div className="form-control">
                                <label className="label text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1 p-0">Brand</label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[var(--text-muted)] group-focus-within:text-indigo-500 transition-colors"><Tag size={14} /></div>
                                    <input type="text" list="brand-list" placeholder="e.g. Dyson" className={`input input-bordered w-full h-11 pl-9 bg-[var(--bg-subtle)] text-[var(--text-main)] font-bold shadow-inner focus:bg-[var(--bg-surface)] focus:border-indigo-500 transition-all text-sm ${getErrorClass('brand')}`} value={device.brand} onChange={e => { setDevice({ ...device, brand: e.target.value }); clearError('brand'); }} />
                                    <datalist id="brand-list">{uniqueBrands.map(brand => <option key={brand} value={brand} />)}</datalist>
                                </div>
                            </div>
                            <div className="form-control">
                                <label className="label text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1 p-0">Model</label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[var(--text-muted)] group-focus-within:text-indigo-500 transition-colors"><Cpu size={14} /></div>
                                    <input type="text" list="model-list" placeholder="e.g. V11 Animal" className={`input input-bordered w-full h-11 pl-9 bg-[var(--bg-subtle)] text-[var(--text-main)] font-bold shadow-inner focus:bg-[var(--bg-surface)] focus:border-indigo-500 transition-all text-sm ${getErrorClass('model')}`} value={device.model} onChange={e => { setDevice({ ...device, model: e.target.value }); clearError('model'); }} />
                                    <datalist id="model-list">{filteredModels.map(model => <option key={model} value={model} />)}</datalist>
                                </div>
                            </div>
                            <div className="form-control sm:col-span-2">
                                <label className="label text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1 p-0">Serial Number / IMEI (Optional)</label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[var(--text-muted)] group-focus-within:text-indigo-500 transition-colors"><Hash size={14} /></div>
                                    <input type="text" placeholder="Scan or type..." className="input input-bordered w-full h-11 pl-9 bg-[var(--bg-subtle)] text-[var(--text-main)] font-mono font-bold shadow-inner focus:bg-[var(--bg-surface)] focus:border-indigo-500 transition-all text-sm tracking-wide" value={device.serial} onChange={e => setDevice({ ...device, serial: e.target.value })} />
                                </div>
                            </div>
                            <div className="form-control sm:col-span-2">
                                <label className="label text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1 p-0 flex justify-between">
                                    <span>Customer Stated Issue</span>
                                    {errors.description && <span className="text-red-500 flex items-center gap-1"><AlertCircle size={10} /> Required</span>}
                                </label>
                                <div className="relative group">
                                    <textarea required className={`textarea textarea-bordered w-full h-24 p-3 pl-9 bg-[var(--bg-subtle)] text-[var(--text-main)] text-sm font-medium leading-relaxed shadow-inner focus:bg-[var(--bg-surface)] focus:border-indigo-500 transition-all resize-none ${getErrorClass('description')}`} placeholder="Describe the issue... (e.g. Motor makes loud grinding noise)" value={device.description} onChange={e => { setDevice({ ...device, description: e.target.value }); clearError('description'); }}></textarea>
                                    <div className="absolute top-3 left-3 pointer-events-none text-[var(--text-muted)] group-focus-within:text-indigo-500 transition-colors"><AlertCircle size={14} /></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* FOOTER */}
                <div className="p-5 border-t-2 border-dashed border-[var(--border-color)] bg-[var(--bg-surface)] flex justify-end gap-3 shrink-0 shadow-[0_-4px_10px_-1px_rgba(0,0,0,0.05)]">
                    <button onClick={onClose} type="button" className="btn btn-ghost font-bold text-[var(--text-muted)] hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 border border-transparent hover:border-red-200 dark:hover:border-red-900/30 transition-all">
                        Cancel
                    </button>
                    <button onClick={handleSubmit} disabled={isSubmitting} className="btn btn-gradient px-8 shadow-lg shadow-indigo-500/30 text-white font-bold tracking-wide transition-transform hover:scale-105 active:scale-95 border-none">
                        {isSubmitting ? <span className="loading loading-spinner"></span> : <><Save size={18} strokeWidth={2.5} /> Create Ticket</>}
                    </button>
                </div>

            </div>
        </div>
    );
}