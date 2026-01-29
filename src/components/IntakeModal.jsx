import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { useToast } from '../context/ToastProvider';
import { X, Save, CheckCircle, UserPlus, Mail, Users, Search, RefreshCw } from 'lucide-react';

export default function IntakeModal({ isOpen, onClose, onSubmit }) {
  const { addToast } = useToast();
  
  const [formData, setFormData] = useState({ firstName: '', lastName: '', phone: '', email: '', brand: '', model: '', description: '', customer_id: null });
  const [errors, setErrors] = useState({});
  const firstNameRef = useRef(null); const lastNameRef = useRef(null); const emailRef = useRef(null);
  const [customerList, setCustomerList] = useState([]);
  const [listFilter, setListFilter] = useState('');
  const [loadingList, setLoadingList] = useState(false);

  useEffect(() => {
    if (isOpen) {
        setFormData({ firstName: '', lastName: '', phone: '', email: '', brand: '', model: '', description: '', customer_id: null });
        setErrors({}); setListFilter(''); fetchCustomers();
    }
  }, [isOpen]);

  async function fetchCustomers() {
    setLoadingList(true);
    const { data } = await supabase.from('customers').select('*').order('full_name', { ascending: true }).limit(100); 
    setCustomerList(data || []); setLoadingList(false);
  }

  const selectCustomer = (customer) => {
    const nameParts = customer.full_name.split(' ');
    setFormData(prev => ({
        ...prev, firstName: nameParts[0], lastName: nameParts.slice(1).join(' '), phone: customer.phone || '', email: customer.email || '', customer_id: customer.id
    }));
    setErrors({}); addToast("Customer loaded", "info");
  };

  const handleClearSelection = () => {
    setFormData(prev => ({ ...prev, firstName: '', lastName: '', phone: '', email: '', customer_id: null }));
  };

  const validateForm = () => {
    let newErrors = {}; let isValid = true;
    if (!formData.firstName.trim()) { newErrors.firstName = true; isValid = false; }
    if (!formData.lastName.trim()) { newErrors.lastName = true; isValid = false; }
    if (!formData.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) { newErrors.email = true; isValid = false; }
    setErrors(newErrors);
    if (newErrors.firstName) firstNameRef.current?.focus();
    else if (newErrors.lastName) lastNameRef.current?.focus();
    else if (newErrors.email) emailRef.current?.focus();
    return isValid;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) { addToast("Please fill in required fields", "error"); return; }
    let finalCustomerId = formData.customer_id; let finalFullName = `${formData.firstName} ${formData.lastName}`;
    if (!finalCustomerId) {
        const { data: newCust, error } = await supabase.from('customers').insert([{ full_name: finalFullName, phone: formData.phone, email: formData.email, total_repairs: 1 }]).select().single();
        if (!error) finalCustomerId = newCust.id;
    } else {
         await supabase.from('customers').update({ full_name: finalFullName, email: formData.email, phone: formData.phone }).eq('id', finalCustomerId);
         await supabase.rpc('increment_repairs', { row_id: finalCustomerId });
    }
    onSubmit({ ...formData, customer_id: finalCustomerId, full_name: finalFullName });
    addToast("Ticket created!", "success"); onClose(); 
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (errors[e.target.name]) setErrors(prev => ({ ...prev, [e.target.name]: false }));
  };

  const filteredCustomers = customerList.filter(c => c.full_name.toLowerCase().includes(listFilter.toLowerCase()) || (c.phone && c.phone.includes(listFilter)));
  if (!isOpen) return null;

  return (
    <div className="modal-backdrop">
      <div className="modal-window">
        
        {/* --- LEFT SIDEBAR --- */}
        <div className="modal-sidebar">
            <div className="panel-header">
                <h3 className="font-bold text-lg flex items-center gap-2 text-[var(--text-main)]"><Users size={20}/> Directory</h3>
                <div className="relative mt-3">
                    <Search className="absolute left-3 top-2.5 text-slate-400" size={16}/>
                    <input type="text" placeholder="Search..." className="input input-bordered input-sm w-full pl-9" value={listFilter} onChange={(e) => setListFilter(e.target.value)}/>
                </div>
            </div>
            
            <div className="overflow-y-auto flex-1 p-3 space-y-2">
                {loadingList && <div className="text-center p-4"><span className="loading loading-spinner text-primary"></span></div>}
                
                <button onClick={handleClearSelection} className={`w-full text-left p-3 rounded-xl border-2 border-dashed flex items-center gap-3 transition-all ${!formData.customer_id ? 'border-primary bg-indigo-50/50 dark:bg-indigo-900/20' : 'border-[var(--border-color)] hover:bg-[var(--bg-surface)] hover:border-primary'}`}>
                    <div className="bg-primary text-white p-2 rounded-full shadow-sm"><UserPlus size={16}/></div>
                    <div><div className="font-bold text-[var(--text-main)]">New Customer</div><div className="text-xs text-[var(--text-muted)]">Create blank profile</div></div>
                </button>
                
                {filteredCustomers.map(customer => (
                    <button key={customer.id} onClick={() => selectCustomer(customer)} className={`w-full text-left p-3 rounded-xl border flex items-center justify-between transition-all ${formData.customer_id === customer.id ? 'bg-[var(--bg-surface)] shadow-md border-primary ring-1 ring-primary' : 'bg-transparent border-transparent hover:bg-[var(--bg-surface)] hover:shadow-sm'}`}>
                        <div><div className="font-bold text-sm text-[var(--text-main)]">{customer.full_name}</div><div className="text-xs text-[var(--text-muted)] font-mono">{customer.phone}</div></div>
                        {formData.customer_id === customer.id && <CheckCircle size={18} className="text-primary fill-primary/10"/>}
                    </button>
                ))}
            </div>
        </div>

        {/* --- RIGHT FORM AREA --- */}
        <div className="modal-content">
            <div className="panel-header">
                <div>
                    <h2 className="text-2xl font-black text-[var(--text-main)] tracking-tight">{formData.customer_id ? `Edit Ticket` : 'New Repair Ticket'}</h2>
                    <p className="text-sm font-medium text-[var(--text-muted)]">{formData.customer_id ? <span>Editing for: <span className='text-primary'>{formData.firstName} {formData.lastName}</span></span> : 'Creating new profile'}</p>
                </div>
                <button onClick={onClose} className="btn btn-sm btn-circle btn-ghost text-[var(--text-muted)] hover:bg-red-50 hover:text-red-500"><X size={24} /></button>
            </div>

            <div className="overflow-y-auto flex-1 p-8">
                <form id="intakeForm" onSubmit={handleSubmit} className="space-y-6 max-w-3xl mx-auto">
                    
                    {/* CUSTOMER CARD */}
                    <div className="content-card">
                        <div className="flex justify-between items-center mb-6 border-b border-[var(--border-color)] pb-2">
                            <h4 className="font-bold text-[var(--text-muted)] uppercase text-xs tracking-wider flex items-center gap-2"><Users size={14}/> Customer Details</h4>
                            {formData.customer_id && <button type="button" onClick={handleClearSelection} className="btn btn-xs btn-ghost text-red-500 hover:bg-red-50"><RefreshCw size={12} className="mr-1"/> Clear</button>}
                        </div>
                        <div className="grid grid-cols-2 gap-5">
                            <div className="form-control"><label className="label py-0 mb-1"><span className={`label-text text-xs font-bold uppercase ${errors.firstName ? 'text-red-500' : 'text-[var(--text-muted)]'}`}>First Name *</span></label><input ref={firstNameRef} type="text" name="firstName" className={`input input-bordered w-full ${errors.firstName ? 'input-error animate-shake' : ''}`} value={formData.firstName} onChange={handleChange} /></div>
                            <div className="form-control"><label className="label py-0 mb-1"><span className={`label-text text-xs font-bold uppercase ${errors.lastName ? 'text-red-500' : 'text-[var(--text-muted)]'}`}>Last Name *</span></label><input ref={lastNameRef} type="text" name="lastName" className={`input input-bordered w-full ${errors.lastName ? 'input-error animate-shake' : ''}`} value={formData.lastName} onChange={handleChange} /></div>
                            <div className="form-control col-span-2 md:col-span-1"><label className="label py-0 mb-1"><span className={`label-text text-xs font-bold uppercase ${errors.email ? 'text-red-500' : 'text-[var(--text-muted)]'}`}>Email *</span></label><div className="relative"><input ref={emailRef} type="email" name="email" className={`input input-bordered w-full pl-10 ${errors.email ? 'input-error animate-shake' : ''}`} value={formData.email} onChange={handleChange} /><Mail className={`absolute left-3 top-3.5 ${errors.email ? 'text-red-500' : 'text-slate-400'}`} size={16}/></div></div>
                            <div className="form-control col-span-2 md:col-span-1"><label className="label py-0 mb-1"><span className="label-text text-xs font-bold uppercase text-[var(--text-muted)]">Phone</span></label><input type="tel" name="phone" className="input input-bordered w-full" value={formData.phone} onChange={handleChange} /></div>
                        </div>
                    </div>
                    
                    {/* DEVICE CARD */}
                    <div className="content-card">
                        <div className="flex justify-between items-center mb-6 border-b border-[var(--border-color)] pb-2">
                            <h4 className="font-bold text-[var(--text-muted)] uppercase text-xs tracking-wider flex items-center gap-2"><Search size={14}/> Device Information</h4>
                        </div>
                        <div className="grid grid-cols-2 gap-5 mb-5">
                            <div className="form-control"><label className="label py-0 mb-1"><span className="label-text text-xs font-bold uppercase text-[var(--text-muted)]">Brand *</span></label><input type="text" name="brand" className="input input-bordered w-full" onChange={handleChange} required /></div>
                            <div className="form-control"><label className="label py-0 mb-1"><span className="label-text text-xs font-bold uppercase text-[var(--text-muted)]">Model</span></label><input type="text" name="model" className="input input-bordered w-full" onChange={handleChange} /></div>
                        </div>
                        <div className="form-control"><label className="label py-0 mb-1"><span className="label-text text-xs font-bold uppercase text-[var(--text-muted)]">Issue *</span></label><textarea name="description" className="textarea textarea-bordered h-24 text-base" onChange={handleChange} required></textarea></div>
                    </div>
                </form>
            </div>
            
            <div className="p-5 border-t border-[var(--border-color)] bg-[var(--bg-surface)] flex justify-end gap-3">
                <button type="button" onClick={onClose} className="btn btn-cancel px-6 rounded-full">Cancel</button>
                <button type="submit" form="intakeForm" className="btn btn-gradient px-8 rounded-full shadow-lg"> <Save size={18} /> {formData.customer_id ? 'Update & Create' : 'Create Ticket'}</button>
            </div>
        </div>
      </div>
    </div>
  );
}