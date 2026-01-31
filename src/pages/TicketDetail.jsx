import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useReactToPrint } from 'react-to-print';
import { format } from 'date-fns';
import {
    ArrowLeft, Send, MessageSquare, Lock, Globe,
    AlertTriangle, Save, X, Edit3, Printer, Calendar, User, Phone, Hash, Wrench, AlertCircle, FileText, History, Moon, Sun, QrCode
} from 'lucide-react';

import { supabase } from '../supabaseClient';
import EstimateBuilder from '../components/EstimateBuilder';
import CustomerEstimateView from '../components/CustomerEstimateView';
import { useToast } from '../context/ToastProvider';
import { formatPhoneNumber } from '../utils';
import QRScanner from '../components/QRScanner'; // <--- Ensure this is imported

export default function TicketDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { addToast } = useToast();

    // Data State
    const [ticket, setTicket] = useState(null);
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [userRole, setUserRole] = useState('customer');

    // UI State
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState({});
    const [newMessage, setNewMessage] = useState('');
    const [activeTab, setActiveTab] = useState('public');
    const [isSending, setIsSending] = useState(false);

    // Mobile States
    const [isMobileChatOpen, setIsMobileChatOpen] = useState(false);
    const [isScanning, setIsScanning] = useState(false); // <--- Scanner State

    // Theme State
    const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');

    // Refs
    const chatEndRef = useRef(null);
    const inputRef = useRef(null);
    const labelRef = useRef(null);

    const isStaff = ['employee', 'manager', 'admin'].includes(userRole);

    const handlePrint = useReactToPrint({
        content: () => labelRef.current,
        documentTitle: `Label_Ticket_${id}`,
        onAfterPrint: () => addToast('Label sent to printer', 'success'),
        onPrintError: (error) => console.error("Print failed:", error),
    });

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        if (theme === 'dark') document.documentElement.classList.add('dark');
        else document.documentElement.classList.remove('dark');
    }, [theme]);

    useEffect(() => { fetchData(); }, [id]);

    useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, activeTab, isMobileChatOpen]);

    useEffect(() => {
        if (inputRef.current) {
            inputRef.current.style.height = 'auto';
            inputRef.current.style.height = inputRef.current.scrollHeight + 'px';
        }
    }, [newMessage]);

    async function fetchData() {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
            const role = profile?.role || 'customer';
            setUserRole(role);
            if (['employee', 'manager', 'admin'].includes(role)) {
                setActiveTab('internal');
            }
        }
        const { data: ticketData } = await supabase.from('tickets').select('*').eq('id', id).single();
        setTicket(ticketData);
        setEditForm(ticketData);

        const { data: msgData } = await supabase.from('ticket_messages').select('*').eq('ticket_id', id).order('created_at', { ascending: true });
        setMessages(msgData || []);
        setLoading(false);
    }

    const handleSaveEdit = async () => {
        const { error } = await supabase
            .from('tickets')
            .update({
                brand: editForm.brand,
                model: editForm.model,
                serial_number: editForm.serial_number,
                description: editForm.description
            })
            .eq('id', id);

        if (error) {
            addToast("Failed to update ticket", "error");
        } else {
            setTicket({ ...ticket, ...editForm });
            setIsEditing(false);
            addToast("Ticket updated successfully", "success");
        }
    };

    const handleEstimateUpdate = async (newTotal) => {
        if (ticket.estimate_total !== newTotal) {
            const { error } = await supabase.from('tickets').update({ estimate_total: newTotal }).eq('id', id);
            if (!error) setTicket(prev => ({ ...prev, estimate_total: newTotal }));
        }
    };

    const sendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || isSending) return;
        setIsSending(true);

        const isInternalNote = isStaff ? (activeTab === 'internal') : false;
        const senderName = isStaff ? 'Staff' : 'Customer';

        const { error } = await supabase.from('ticket_messages').insert([{
            ticket_id: id,
            message_text: newMessage,
            is_internal: isInternalNote,
            sender_name: senderName
        }]);

        if (!error) {
            setNewMessage('');
            const { data: msgs } = await supabase.from('ticket_messages').select('*').eq('ticket_id', id).order('created_at', { ascending: true });
            setMessages(msgs);
        }
        setIsSending(false);
    };

    const updateStatus = async (newStatus) => {
        setTicket({ ...ticket, status: newStatus });
        await supabase.from('tickets').update({ status: newStatus }).eq('id', id);
        addToast(`Status updated`, 'success');
    };

    const toggleBackorder = async () => {
        const newVal = !ticket.is_backordered;
        setTicket({ ...ticket, is_backordered: newVal });
        await supabase.from('tickets').update({ is_backordered: newVal }).eq('id', id);
        if (newVal) addToast("Marked as Vendor Backorder", 'error');
    };

    const toggleTheme = () => {
        const newTheme = theme === 'light' ? 'dark' : 'light';
        setTheme(newTheme);
        localStorage.setItem('theme', newTheme);
    };

    const filteredMessages = messages.filter(msg => {
        if (!isStaff && msg.is_internal) return false;
        if (isStaff) {
            if (activeTab === 'internal') return msg.is_internal === true;
            if (activeTab === 'public') return msg.is_internal === false;
        }
        return true;
    });

    const getStatusColor = (status) => {
        switch (status) {
            case 'intake': return 'bg-gradient-to-r from-blue-600 to-blue-500 text-white border-blue-700 dark:from-transparent dark:to-transparent dark:bg-blue-900/40 dark:text-blue-200 dark:border-blue-800';
            case 'diagnosing': return 'bg-gradient-to-r from-purple-600 to-purple-500 text-white border-purple-700 dark:from-transparent dark:to-transparent dark:bg-purple-900/40 dark:text-purple-200 dark:border-purple-800';
            case 'waiting_parts': return 'bg-gradient-to-r from-orange-600 to-orange-500 text-white border-orange-700 dark:from-transparent dark:to-transparent dark:bg-orange-900/40 dark:text-orange-200 dark:border-orange-800';
            case 'repairing': return 'bg-gradient-to-r from-amber-600 to-amber-500 text-white border-amber-700 dark:from-transparent dark:to-transparent dark:bg-amber-900/40 dark:text-amber-200 dark:border-amber-800';
            case 'ready_pickup': return 'bg-gradient-to-r from-emerald-600 to-emerald-500 text-white border-emerald-700 dark:from-transparent dark:to-transparent dark:bg-emerald-900/40 dark:text-emerald-200 dark:border-emerald-800';
            case 'completed': return 'bg-gradient-to-r from-slate-600 to-slate-500 text-white border-slate-700 dark:from-transparent dark:to-transparent dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700';
            default: return 'bg-gray-500 text-white';
        }
    };

    // --- REUSABLE CHAT INTERFACE ---
    const renderChatInterface = () => (
        <div className="flex flex-col h-full bg-[var(--bg-surface)]">
            {isStaff ? (
                <div role="tablist" className="tabs tabs-lifted bg-[var(--bg-subtle)] p-2 flex-none">
                    <a role="tab" className={`tab font-bold transition-all flex-1 ${activeTab === 'internal' ? 'tab-active bg-[var(--bg-surface)] text-yellow-600 border-t-2 border-yellow-500' : 'text-slate-400'}`} onClick={() => setActiveTab('internal')}>
                        <Lock size={14} className="mr-2" /> Notes
                    </a>
                    <a role="tab" className={`tab font-bold transition-all flex-1 ${activeTab === 'public' ? 'tab-active bg-[var(--bg-surface)] text-primary border-t-2 border-primary' : 'text-slate-400'}`} onClick={() => setActiveTab('public')}>
                        <Globe size={14} className="mr-2" /> Chat
                    </a>
                </div>
            ) : (
                <div className="p-4 bg-primary text-white font-bold flex items-center gap-2 shadow-md flex-none">
                    <Globe size={18} /> Support Chat
                </div>
            )}

            <div className={`flex-1 overflow-y-auto p-4 space-y-4 ${activeTab === 'internal' ? 'bg-yellow-50/50 dark:bg-yellow-900/10' : 'bg-[var(--bg-subtle)]'}`}>
                {filteredMessages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-[var(--text-muted)] space-y-2 opacity-50">
                        <MessageSquare size={48} />
                        <span className="text-sm font-bold">No messages yet.</span>
                    </div>
                )}
                {filteredMessages.map((msg) => {
                    const isCustomer = msg.sender_name === 'Customer';
                    let bubbleClass = '';
                    if (msg.is_internal) bubbleClass = 'bg-yellow-100 text-yellow-900 border border-yellow-200';
                    else if (isCustomer) bubbleClass = 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white border border-slate-200 dark:border-slate-600';
                    else bubbleClass = 'bg-indigo-600 text-white';

                    return (
                        <div key={msg.id} className={`chat ${isCustomer ? 'chat-start' : 'chat-end'}`}>
                            <div className="chat-header text-xs text-[var(--text-muted)] font-bold mb-1 opacity-70">
                                {msg.sender_name} • {format(new Date(msg.created_at), 'h:mm a')}
                            </div>
                            <div className={`chat-bubble shadow-sm font-medium break-words whitespace-pre-wrap max-w-[85%] ${bubbleClass}`}>
                                {msg.message_text}
                            </div>
                        </div>
                    );
                })}
                <div ref={chatEndRef}></div>
            </div>

            <form onSubmit={sendMessage} className="p-4 bg-[var(--bg-surface)] border-t border-[var(--border-color)] flex-none pb-safe">
                <div className="flex gap-2 items-end">
                    <textarea ref={inputRef} rows={1} placeholder={activeTab === 'internal' ? "Private note..." : "Message..."} className={`textarea textarea-bordered w-full resize-none overflow-hidden min-h-[3rem] text-base py-3 leading-normal bg-[var(--bg-subtle)] focus:bg-[var(--bg-surface)] transition-all text-[var(--text-main)] ${activeTab === 'internal' ? 'focus:border-yellow-500' : 'focus:border-primary'}`} value={newMessage} onChange={(e) => setNewMessage(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(e); } }} disabled={isSending} />
                    <button type="submit" className={`btn btn-square shadow-sm h-12 w-12 flex-shrink-0 ${activeTab === 'internal' ? 'btn-warning text-white' : 'btn-primary text-white'}`} disabled={isSending || !newMessage.trim()}>
                        {isSending ? <span className="loading loading-spinner loading-xs"></span> : <Send size={20} />}
                    </button>
                </div>
            </form>
        </div>
    );

    if (loading) return <div className="p-10 text-center"><span className="loading loading-spinner loading-lg text-primary"></span></div>;
    if (!ticket) return <div className="p-10 text-center text-xl font-bold text-[var(--text-main)]">Ticket not found.</div>;

    return (
        <div className="min-h-screen p-4 md:p-8 font-sans pb-32 lg:pb-24">

            {/* NAVBAR */}
            <div className="navbar rounded-2xl mb-6 sticky top-2 z-40 flex justify-between shadow-sm backdrop-blur-md bg-[var(--bg-surface)] border border-[var(--border-color)]">
                <div className="flex items-center">
                    <button onClick={() => navigate(-1)} className="btn btn-ghost gap-2 text-[var(--text-muted)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-main)]">
                        <ArrowLeft size={20} /> <span className="hidden md:inline font-bold">Back to Dashboard</span>
                    </button>
                </div>

                <div className="flex-none flex items-center gap-2">

                    {/* --- SCANNER BUTTON RESTORED --- */}
                    <button
                        className="btn btn-sm btn-ghost btn-circle text-[var(--text-main)] hover:bg-[var(--bg-subtle)]"
                        onClick={() => setIsScanning(true)}
                        title="Scan QR"
                    >
                        <QrCode size={20} />
                    </button>

                    {/* THEME TOGGLE */}
                    <button className="btn btn-sm btn-ghost btn-circle text-[var(--text-main)]" onClick={toggleTheme}>
                        {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
                    </button>

                    <div className="bg-[var(--bg-subtle)] px-3 py-1.5 rounded-lg border border-[var(--border-color)]">
                        <span className="font-mono text-xs font-bold text-[var(--text-muted)]">Ticket #{ticket.id}</span>
                    </div>
                </div>
            </div>

            {/* HEADER CARD */}
            <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl p-5 md:p-8 shadow-sm mb-6 relative overflow-hidden animate-fade-in-up">
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-80"></div>

                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                    <div className="flex-1 min-w-0 w-full">
                        <div className="flex items-center gap-2 mb-3 flex-wrap">
                            {ticket.serial_number && (
                                <span className="flex items-center gap-2 bg-[var(--bg-subtle)] border border-[var(--border-color)] text-[var(--text-main)] px-3 py-1.5 rounded-md font-mono text-xs md:text-sm font-black tracking-wide shadow-sm">
                                    <Hash size={14} className="opacity-50" />
                                    {ticket.serial_number}
                                </span>
                            )}
                            <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1 bg-[var(--bg-subtle)] px-2 py-1.5 rounded-md">
                                <Calendar size={12} /> {format(new Date(ticket.created_at), 'MMM dd')}
                            </span>
                        </div>

                        <h1 className="text-2xl md:text-4xl font-black text-[var(--text-main)] tracking-tight mb-2 leading-tight">
                            {ticket.brand} <span className="text-indigo-500">{ticket.model}</span>
                        </h1>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm font-medium text-[var(--text-muted)] mt-2">
                            <div className="flex items-center gap-2"><User size={16} /> {ticket.customer_name}</div>
                            <div className="hidden md:block w-1 h-1 bg-slate-300 rounded-full"></div>
                            <div className="flex items-center gap-2"><Phone size={16} /> {formatPhoneNumber(ticket.phone)}</div>

                            {isStaff && ticket.customer_id && (
                                <>
                                    <div className="hidden md:block w-1 h-1 bg-slate-300 rounded-full"></div>
                                    <button
                                        onClick={() => navigate(`/customer/${ticket.customer_id}`)}
                                        className="flex items-center gap-1 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 px-2 py-0.5 rounded-md transition-all cursor-pointer"
                                    >
                                        <History size={14} />
                                        <span className="text-xs font-bold uppercase tracking-wide">History</span>
                                    </button>
                                </>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-col items-stretch w-full lg:w-auto gap-3 flex-none">
                        {isStaff ? (
                            <div className="flex gap-2 w-full lg:w-auto">
                                <select
                                    className={`select select-bordered flex-1 lg:flex-none w-full lg:w-52 h-12 text-sm font-black uppercase tracking-wide border-2 focus:outline-none ${getStatusColor(ticket.status)}`}
                                    value={ticket.status}
                                    onChange={(e) => updateStatus(e.target.value)}
                                >
                                    <option value="intake" className="text-black bg-white">In Queue</option>
                                    <option value="diagnosing" className="text-black bg-white">Diagnosing</option>
                                    <option value="waiting_parts" className="text-black bg-white">Waiting on Parts</option>
                                    <option value="repairing" className="text-black bg-white">Repairing</option>
                                    <option value="ready_pickup" className="text-black bg-white">Ready for Pickup</option>
                                    <option value="completed" className="text-black bg-white">Completed</option>
                                </select>

                                <button
                                    onClick={() => window.open(`/print/${id}`, '_blank', 'width=400,height=600')}
                                    className="btn btn-square h-12 w-12 border-2 border-[var(--border-color)] bg-[var(--bg-surface)] hover:bg-[var(--bg-subtle)] text-[var(--text-main)] flex-none"
                                    title="Print Label"
                                >
                                    <Printer size={20} />
                                </button>
                            </div>
                        ) : (
                            <div className={`badge h-10 w-full lg:w-auto px-4 font-bold uppercase tracking-wide ${getStatusColor(ticket.status)}`}>
                                {ticket.status.replace('_', ' ')}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* MAIN GRID LAYOUT */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade">
                <div className="col-span-1 lg:col-span-2 space-y-6">
                    <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-xl shadow-sm overflow-hidden transition-all duration-300">
                        <div className="bg-[var(--bg-subtle)] px-6 py-4 border-b border-[var(--border-color)] flex justify-between items-center">
                            <h2 className="text-xs font-bold uppercase text-[var(--text-muted)] tracking-widest flex items-center gap-2">
                                <Wrench size={16} /> Diagnosis & Notes
                            </h2>
                            {(userRole === 'manager' || userRole === 'admin') && !isEditing && (
                                <button onClick={() => setIsEditing(true)} className="btn btn-sm btn-ghost gap-2 text-indigo-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 shadow-sm border border-transparent hover:border-indigo-100 dark:hover:border-indigo-800">
                                    <Edit3 size={16} /> <span className="font-bold">Edit Details</span>
                                </button>
                            )}
                        </div>

                        <div className="p-6">
                            {isEditing ? (
                                <div className="space-y-6 animate-fade-in-up bg-[var(--bg-subtle)] -m-2 p-6 rounded-lg border border-[var(--border-color)] shadow-inner">
                                    {/* (Existing Edit Form Code - no changes needed) */}
                                    <div className="flex justify-between items-center mb-2">
                                        <h3 className="font-bold text-[var(--text-main)] flex items-center gap-2"><FileText size={18} className="text-indigo-500" /> Update Ticket Details</h3>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                        <div className="form-control">
                                            <label className="label-text text-xs font-bold uppercase text-[var(--text-muted)] mb-1.5 ml-1">Brand</label>
                                            <input type="text" className="input input-bordered h-11 w-full font-bold bg-[var(--bg-surface)] text-[var(--text-main)] focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20" value={editForm.brand} onChange={e => setEditForm({ ...editForm, brand: e.target.value })} />
                                        </div>
                                        <div className="form-control">
                                            <label className="label-text text-xs font-bold uppercase text-[var(--text-muted)] mb-1.5 ml-1">Model</label>
                                            <input type="text" className="input input-bordered h-11 w-full font-bold bg-[var(--bg-surface)] text-[var(--text-main)] focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20" value={editForm.model} onChange={e => setEditForm({ ...editForm, model: e.target.value })} />
                                        </div>
                                        <div className="form-control md:col-span-2">
                                            <label className="label-text text-xs font-bold uppercase text-[var(--text-muted)] mb-1.5 ml-1">Serial Number</label>
                                            <div className="relative">
                                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400"><Hash size={16} /></div>
                                                <input type="text" className="input input-bordered h-11 w-full pl-10 font-mono font-medium bg-[var(--bg-surface)] text-[var(--text-main)] focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20" value={editForm.serial_number || ''} onChange={e => setEditForm({ ...editForm, serial_number: e.target.value })} placeholder="Enter S/N..." />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="form-control">
                                        <label className="label-text text-xs font-bold uppercase text-[var(--text-muted)] mb-1.5 ml-1">Issue Description</label>
                                        <textarea className="textarea textarea-bordered w-full text-base bg-[var(--bg-surface)] text-[var(--text-main)] focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 leading-relaxed" rows={6} value={editForm.description} onChange={e => setEditForm({ ...editForm, description: e.target.value })}></textarea>
                                    </div>
                                    <div className="flex justify-end gap-3 pt-2">
                                        <button onClick={() => setIsEditing(false)} className="btn btn-ghost hover:bg-red-50 text-red-500 hover:text-red-600 font-bold">Cancel</button>
                                        <button onClick={handleSaveEdit} className="btn btn-gradient text-white px-6 shadow-lg hover:shadow-xl hover:scale-105 transition-all"><Save size={18} /> Save Changes</button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    {/* DESCRIPTION BOX (STYLED) */}
                                    <div className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-inner mb-6">
                                        <h3 className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-2">
                                            <AlertCircle size={14} /> Customer Reported Issue
                                        </h3>
                                        <p className="text-slate-800 dark:text-slate-100 whitespace-pre-wrap font-medium leading-relaxed text-base">
                                            {ticket.description || "No description provided."}
                                        </p>
                                    </div>

                                    {isStaff && (
                                        <>
                                            <div className={`mt-8 p-4 rounded-xl border-2 transition-all duration-300 ${ticket.is_backordered ? 'border-red-500 bg-red-50 dark:bg-red-900/10' : 'border-[var(--border-color)] bg-[var(--bg-subtle)]'}`}>
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <h4 className={`font-bold flex items-center gap-2 ${ticket.is_backordered ? 'text-red-600 dark:text-red-400' : 'text-[var(--text-main)]'}`}>
                                                            {ticket.is_backordered ? <AlertTriangle size={18} /> : <AlertCircle size={18} />} Vendor Backorder Alert
                                                        </h4>
                                                        <p className="text-xs text-[var(--text-muted)] mt-1 font-medium">Toggle this ON if parts are out of stock at the supplier.</p>
                                                    </div>
                                                    <button onClick={toggleBackorder} className={`w-14 h-7 rounded-full transition-colors relative shadow-inner ${ticket.is_backordered ? 'bg-red-500' : 'bg-slate-300 dark:bg-slate-600'}`}>
                                                        <div className={`w-5 h-5 bg-white rounded-full absolute top-1 shadow-md transition-transform duration-200 ${ticket.is_backordered ? 'left-8' : 'left-1'}`} />
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="animate-fade-in-up mt-8 border-t border-[var(--border-color)] pt-6">
                                                <EstimateBuilder ticketId={id} onTotalChange={handleEstimateUpdate} />
                                            </div>
                                        </>
                                    )}
                                    {!isStaff && (
                                        <div className="animate-fade-in-up mt-6 border-t border-[var(--border-color)] pt-6">
                                            <CustomerEstimateView ticketId={id} />
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* RIGHT COLUMN: CHAT */}
                <div className="hidden lg:block col-span-1">
                    <div className="rounded-2xl shadow-xl flex flex-col h-[600px] overflow-hidden border border-[var(--border-color)] bg-[var(--bg-surface)] sticky top-24">
                        {renderChatInterface()}
                    </div>
                </div>
            </div>

            {/* --- MOBILE CHAT BUBBLE --- */}
            <button
                onClick={() => setIsMobileChatOpen(true)}
                className="lg:hidden fixed bottom-6 right-6 btn btn-circle btn-lg btn-gradient text-white shadow-2xl z-40 border-4 border-[var(--bg-surface)] animate-bounce-in"
            >
                <div className="relative">
                    <MessageSquare size={28} />
                </div>
            </button>

            {isMobileChatOpen && (
                <div className="fixed inset-0 z-50 lg:hidden flex flex-col bg-[var(--bg-surface)] animate-slide-up">
                    <div className="relative z-50 p-4 border-b border-[var(--border-color)] flex justify-between items-center shadow-sm bg-[var(--bg-surface)]">
                        <h3 className="font-black text-lg text-[var(--text-main)] flex items-center gap-2">
                            {activeTab === 'internal' ? <Lock size={18} className="text-yellow-500" /> : <Globe size={18} className="text-indigo-500" />}
                            Ticket Communications
                        </h3>
                        <button onClick={() => setIsMobileChatOpen(false)} className="btn btn-circle btn-ghost text-[var(--text-muted)] hover:bg-[var(--bg-subtle)]">
                            <X size={28} />
                        </button>
                    </div>
                    <div className="flex-1 overflow-hidden relative z-0">
                        {renderChatInterface()}
                    </div>
                </div>
            )}

            {/* --- QR SCANNER MODAL (BUG FIX INCLUDED) --- */}
            {isScanning && (
                <QRScanner
                    onClose={() => setIsScanning(false)}
                    onScan={(result) => {
                        // 1. Close Scanner UI immediately
                        setIsScanning(false);

                        // 2. Parse Result
                        let ticketId = result;
                        if (result.includes('/ticket/')) {
                            const parts = result.split('/ticket/');
                            ticketId = parts[1];
                        }

                        // 3. Navigate with slight delay to ensure unmount
                        setTimeout(() => {
                            navigate(`/ticket/${ticketId}`);
                        }, 100);
                    }}
                />
            )}

            {/* HIDDEN PRINTER DIV */}
            <div style={{ position: 'absolute', top: '-10000px', left: '-10000px' }}>
                <div ref={labelRef} style={{ width: '4in', height: '6in', border: '5px solid red', padding: '20px' }}>
                    <h1>TEST PRINT</h1>
                    <p>If you can see this, the printer logic works.</p>
                    <p>Ticket ID: {ticket ? ticket.id : 'Loading...'}</p>
                </div>
            </div>

        </div>
    );
}