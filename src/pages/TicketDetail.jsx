import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useReactToPrint } from 'react-to-print';
import { format } from 'date-fns';
import {
    ArrowLeft, Send, MessageSquare, Lock, Globe,
    AlertTriangle, Save, X, Edit3, Printer, Calendar, User, Phone, Hash, Wrench, AlertCircle, FileText, History, Moon, Sun, QrCode, Clock, Eye, ShieldAlert, Laptop, PlusCircle, CheckCircle, LockKeyhole
} from 'lucide-react';

import { supabase } from '../supabaseClient';
import PartsOrderManager from '../components/PartsOrderManager';
import EstimateBuilder from '../components/EstimateBuilder';
import CustomerEstimateView from '../components/CustomerEstimateView';
import { useToast } from '../context/ToastProvider';
import { formatPhoneNumber } from '../utils';
import QRScanner from '../components/QRScanner';

export default function TicketDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { addToast } = useToast();

    // Data State
    const [ticket, setTicket] = useState(null);
    const [messages, setMessages] = useState([]);
    const [auditLogs, setAuditLogs] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);

    // User State
    const [currentUser, setCurrentUser] = useState(null);
    const [userRole, setUserRole] = useState('customer');

    // UI State
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editForm, setEditForm] = useState({});
    const [newMessage, setNewMessage] = useState('');
    const [activeTab, setActiveTab] = useState('public');
    const [isSending, setIsSending] = useState(false);
    const [selectedLog, setSelectedLog] = useState(null);
    const [estimateRefreshTrigger, setEstimateRefreshTrigger] = useState(0);

    // Mobile & Theme
    const [isMobileChatOpen, setIsMobileChatOpen] = useState(false);
    const [isScanning, setIsScanning] = useState(false);
    const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');

    // Refs
    const chatEndRef = useRef(null);
    const inputRef = useRef(null);
    const labelRef = useRef(null);

    const isStaff = ['employee', 'manager', 'admin'].includes(userRole);
    const isManagement = ['manager', 'admin'].includes(userRole);

    // --- LOCKDOWN LOGIC ---
    // If ticket is completed, it is "Closed"
    const isClosed = ticket?.status === 'completed';
    // Managers can always edit. Employees can only edit if NOT closed.
    const canEdit = isManagement || (isStaff && !isClosed);

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
            const { data: profile } = await supabase.from('profiles').select('role, full_name, email').eq('id', user.id).single();
            const role = profile?.role || 'customer';
            setUserRole(role);
            setCurrentUser({ ...user, ...profile });

            if (['employee', 'manager', 'admin'].includes(role)) {
                setActiveTab('internal');
                const { data: staff } = await supabase.from('profiles').select('id, full_name, email').in('role', ['employee', 'manager', 'admin']);
                setEmployees(staff || []);
            }
        }

        const { data: ticketData } = await supabase.from('tickets').select('*').eq('id', id).single();
        setTicket(ticketData);
        setEditForm({
            brand: ticketData.brand,
            model: ticketData.model,
            serial_number: ticketData.serial_number,
            description: ticketData.description
        });

        const { data: msgData } = await supabase.from('ticket_messages').select('*').eq('ticket_id', id).order('created_at', { ascending: true });
        setMessages(msgData || []);

        const { data: logs } = await supabase.from('audit_logs').select('*').eq('ticket_id', id).order('created_at', { ascending: false });
        setAuditLogs(logs || []);

        setLoading(false);
    }

    const getHumanReadableDevice = (userAgent) => {
        if (!userAgent) return 'Unknown Device';
        if (userAgent.includes('iPhone')) return 'iPhone';
        if (userAgent.includes('iPad')) return 'iPad';
        if (userAgent.includes('Android')) return 'Android Device';
        if (userAgent.includes('Macintosh')) return 'Mac Computer';
        if (userAgent.includes('Windows')) return 'Windows PC';
        if (userAgent.includes('CrOS')) return 'Chromebook';
        return 'Web Browser';
    };

    const logAudit = async (action, details, extraMetadata = {}) => {
        const actorName = currentUser?.full_name || currentUser?.email || 'System';

        const metadata = {
            ...extraMetadata,
            device: navigator.userAgent,
            timestamp: new Date().toISOString(),
            user_email: currentUser?.email
        };

        await supabase.from('audit_logs').insert([{
            ticket_id: id,
            actor_name: actorName,
            action: action,
            details: details,
            metadata: metadata
        }]);

        const { data: refreshedLogs } = await supabase.from('audit_logs').select('*').eq('ticket_id', id).order('created_at', { ascending: false });
        if (refreshedLogs) setAuditLogs(refreshedLogs);
    };

    const handleSaveEdit = async () => {
        const hasChanges =
            ticket.brand !== editForm.brand ||
            ticket.model !== editForm.model ||
            ticket.serial_number !== editForm.serial_number ||
            ticket.description !== editForm.description;

        if (!hasChanges) {
            setIsEditModalOpen(false);
            return;
        }

        const oldData = { ...ticket };

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
            setTicket(prev => ({
                ...prev,
                brand: editForm.brand,
                model: editForm.model,
                serial_number: editForm.serial_number,
                description: editForm.description
            }));

            setIsEditModalOpen(false);
            addToast("Ticket updated successfully", "success");

            logAudit('UPDATE DETAILS', 'Modified ticket core information', {
                previous_data: { brand: oldData.brand, model: oldData.model, serial: oldData.serial_number },
                new_data: { brand: editForm.brand, model: editForm.model, serial: editForm.serial_number }
            });
        }
    };

    const handleEstimateUpdate = async (newTotal) => {
        if (ticket?.estimate_total !== newTotal) {
            const { error } = await supabase.from('tickets').update({ estimate_total: newTotal }).eq('id', id);
            if (!error) {
                setTicket(prev => ({ ...prev, estimate_total: newTotal }));
                logAudit('ESTIMATE CHANGE', `Updated estimate total to $${newTotal}`);
            }
        }
    };

    const handleEstimateLog = (action, details) => {
        logAudit(action, details);
    };

    const handleAssignment = async (assigneeId) => {
        const finalId = (assigneeId === "" || assigneeId === "UNASSIGNED") ? null : assigneeId;
        const assigneeName = finalId
            ? (employees.find(e => e.id === finalId)?.full_name || employees.find(e => e.id === finalId)?.email || 'Unknown')
            : null;

        await supabase.from('tickets').update({ assigned_to: finalId, assignee_name: assigneeName }).eq('id', id);
        setTicket({ ...ticket, assigned_to: finalId, assignee_name: assigneeName });

        if (finalId) {
            logAudit('ASSIGNMENT', `Assigned ticket to ${assigneeName}`, { assigned_id: finalId });
            addToast(`Assigned to ${assigneeName}`, 'success');
        } else {
            logAudit('UNASSIGNED', 'Removed technician assignment');
            addToast('Ticket unassigned', 'info');
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
        const oldStatus = ticket.status;
        setTicket({ ...ticket, status: newStatus });
        await supabase.from('tickets').update({ status: newStatus }).eq('id', id);
        addToast(`Status updated`, 'success');

        // Log it (Special log if re-opening)
        if (oldStatus === 'completed' && newStatus !== 'completed') {
            logAudit('TICKET REOPENED', `Ticket reactivated by manager (Changed from Completed to ${newStatus})`);
        } else {
            logAudit('STATUS CHANGE', `Changed status from ${oldStatus} to ${newStatus}`, { from: oldStatus, to: newStatus });
        }
    };

    const toggleBackorder = async () => {
        const newVal = !ticket.is_backordered;
        setTicket({ ...ticket, is_backordered: newVal });
        await supabase.from('tickets').update({ is_backordered: newVal }).eq('id', id);
        if (newVal) addToast("Marked as Vendor Backorder", 'error');
        logAudit('FLAG UPDATE', newVal ? 'Marked as Waiting on Parts' : 'Cleared Waiting on Parts flag');
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

    const getLogColor = (action) => {
        if (action.includes('STATUS') || action.includes('REOPEN'))
            return 'bg-blue-100 text-blue-900 border-blue-200 hover:bg-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800 dark:hover:bg-blue-900/30';
        if (action.includes('ESTIMATE'))
            return 'bg-green-100 text-green-900 border-green-200 hover:bg-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800 dark:hover:bg-green-900/30';
        if (action.includes('ASSIGN'))
            return 'bg-purple-100 text-purple-900 border-purple-200 hover:bg-purple-200 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800 dark:hover:bg-purple-900/30';
        if (action.includes('DELETE') || action.includes('REMOVE'))
            return 'bg-red-100 text-red-900 border-red-200 hover:bg-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800 dark:hover:bg-red-900/30';

        return 'bg-slate-100 text-slate-800 border-slate-200 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 dark:hover:bg-slate-700';
    };

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
                {filteredMessages.map((msg) => {
                    const isCustomer = msg.sender_name === 'Customer';
                    let bubbleClass = msg.is_internal ? 'bg-yellow-100 text-yellow-900 border border-yellow-200' : (isCustomer ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white border border-slate-200' : 'bg-indigo-600 text-white');
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

            {/* --- CHAT INPUT OR CLOSED BANNER --- */}
            {isClosed ? (
                <div className="p-6 bg-slate-50 dark:bg-slate-800/50 border-t border-[var(--border-color)] flex flex-col items-center justify-center text-center">
                    <div className="bg-slate-200 dark:bg-slate-700 p-3 rounded-full mb-2">
                        <LockKeyhole size={24} className="text-slate-500 dark:text-slate-400" />
                    </div>
                    <h3 className="font-black text-[var(--text-main)]">Ticket Archived</h3>
                    <p className="text-xs text-[var(--text-muted)] mt-1 max-w-xs">
                        This repair is complete.
                        {isManagement ? " Change status to reopen." : " Contact a manager to reopen."}
                    </p>
                </div>
            ) : (
                <form onSubmit={sendMessage} className="p-4 bg-[var(--bg-surface)] border-t border-[var(--border-color)] flex-none pb-safe">
                    <div className="flex gap-2 items-end">
                        <textarea ref={inputRef} rows={1} placeholder={activeTab === 'internal' ? "Private note..." : "Message..."} className={`textarea textarea-bordered w-full resize-none overflow-hidden min-h-[3rem] text-base py-3 bg-[var(--bg-subtle)] focus:bg-[var(--bg-surface)] text-[var(--text-main)] ${activeTab === 'internal' ? 'focus:border-yellow-500' : 'focus:border-primary'}`} value={newMessage} onChange={(e) => setNewMessage(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(e); } }} disabled={isSending} />
                        <button type="submit" className={`btn btn-square shadow-sm h-12 w-12 flex-shrink-0 ${activeTab === 'internal' ? 'btn-warning text-white' : 'btn-primary text-white'}`} disabled={isSending || !newMessage.trim()}>
                            {isSending ? <span className="loading loading-spinner loading-xs"></span> : <Send size={20} />}
                        </button>
                    </div>
                </form>
            )}
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
                    <button className="btn btn-sm btn-ghost btn-circle text-[var(--text-main)] hover:bg-[var(--bg-subtle)]" onClick={() => setIsScanning(true)}><QrCode size={20} /></button>
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
                            <div className="flex items-center gap-2"><Phone size={16} /> {formatPhoneNumber(ticket.phone)}</div>
                            {isStaff && ticket.customer_id && (
                                <button onClick={() => navigate(`/customer/${ticket.customer_id}`)} className="flex items-center gap-1 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 px-2 py-0.5 rounded-md transition-all cursor-pointer">
                                    <History size={14} /> <span className="text-xs font-bold uppercase tracking-wide">History</span>
                                </button>
                            )}
                        </div>
                    </div>
                    <div className="flex flex-col items-stretch w-full lg:w-auto gap-3 flex-none">
                        {isStaff ? (
                            <div className="flex flex-col gap-2">
                                <div className="flex gap-2 w-full lg:w-auto">
                                    {/* STATUS DROPDOWN: Disabled for Employees if Closed */}
                                    <select
                                        className={`select select-bordered flex-1 lg:flex-none w-full lg:w-52 h-12 text-sm font-black uppercase tracking-wide border-2 focus:outline-none ${getStatusColor(ticket.status)}`}
                                        value={ticket.status}
                                        onChange={(e) => updateStatus(e.target.value)}
                                        disabled={!canEdit}
                                    >
                                        <option value="intake" className="text-black bg-white">In Queue</option>
                                        <option value="diagnosing" className="text-black bg-white">Diagnosing</option>
                                        <option value="waiting_parts" className="text-black bg-white">Waiting on Parts</option>
                                        <option value="repairing" className="text-black bg-white">Repairing</option>
                                        <option value="ready_pickup" className="text-black bg-white">Ready for Pickup</option>
                                        <option value="completed" className="text-black bg-white">Completed</option>
                                    </select>
                                    <button onClick={() => window.open(`/print/${id}`, '_blank', 'width=400,height=600')} className="btn btn-square h-12 w-12 border-2 border-[var(--border-color)] bg-[var(--bg-surface)] hover:bg-[var(--bg-subtle)] text-[var(--text-main)] flex-none"><Printer size={20} /></button>
                                </div>
                                <div className="form-control w-full lg:w-52">
                                    <select
                                        className="select select-bordered w-full h-12 text-base font-bold bg-[var(--bg-subtle)] text-[var(--text-main)] border-2 focus:border-indigo-500 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                                        value={ticket.assigned_to || ""}
                                        onChange={(e) => handleAssignment(e.target.value)}
                                        disabled={!canEdit}
                                    >
                                        <option value="">-- Unassigned --</option>
                                        {employees.map(emp => (
                                            <option key={emp.id} value={emp.id} className="font-bold text-indigo-900 dark:text-indigo-200">
                                                {emp.full_name || emp.email}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        ) : (
                            <div className={`badge h-10 w-full lg:w-auto px-4 font-bold uppercase tracking-wide ${getStatusColor(ticket.status)}`}>
                                {ticket.status.replace('_', ' ')}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* MAIN LAYOUT */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade">
                <div className="col-span-1 lg:col-span-2 space-y-6">
                    <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-xl shadow-sm overflow-hidden">
                        <div className="bg-[var(--bg-subtle)] px-6 py-4 border-b border-[var(--border-color)] flex justify-between items-center">
                            <h2 className="text-xs font-bold uppercase text-[var(--text-muted)] tracking-widest flex items-center gap-2"><Wrench size={16} /> Diagnosis & Notes</h2>
                            {/* Controls Hidden if Closed (Unless Manager) */}
                            {canEdit && (userRole === 'manager' || userRole === 'admin') && (
                                <button onClick={() => setIsEditModalOpen(true)} className="btn btn-sm btn-ghost gap-2 text-indigo-500"><Edit3 size={16} /> <span className="font-bold">Edit Details</span></button>
                            )}
                        </div>
                        <div className="p-6">
                            <div className="bg-white dark:bg-slate-800/50 p-5 rounded-xl border border-slate-200 dark:border-slate-700 mb-6">
                                <h3 className="text-xs font-bold uppercase text-slate-500 mb-3 flex items-center gap-2"><AlertCircle size={14} /> Customer Reported Issue</h3>
                                <p className="text-slate-800 dark:text-slate-100 whitespace-pre-wrap font-medium">{ticket.description || "No description provided."}</p>
                            </div>

                            {isStaff && (
                                <>
                                    <div className={`mt-8 p-4 rounded-xl border-2 transition-all duration-300 ${ticket.is_backordered ? 'border-red-500 bg-red-50 dark:bg-red-900/10' : 'border-[var(--border-color)] bg-[var(--bg-subtle)]'}`}>
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <h4 className={`font-bold flex items-center gap-2 ${ticket.is_backordered ? 'text-red-600' : 'text-[var(--text-main)]'}`}>{ticket.is_backordered ? <AlertTriangle size={18} /> : <AlertCircle size={18} />} Vendor Backorder Alert</h4>
                                            </div>
                                            <button
                                                onClick={toggleBackorder}
                                                disabled={!canEdit}
                                                className={`w-14 h-7 rounded-full transition-colors relative shadow-inner ${ticket.is_backordered ? 'bg-red-500' : 'bg-slate-300 dark:bg-slate-600'} ${!canEdit ? 'opacity-50 cursor-not-allowed' : ''}`}
                                            >
                                                <div className={`w-5 h-5 bg-white rounded-full absolute top-1 shadow-md transition-transform duration-200 ${ticket.is_backordered ? 'left-8' : 'left-1'}`} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* HIDE ESTIMATE BUILDER CONTROLS IF CLOSED */}
                                    <div className={`animate-fade-in-up mt-8 border-t border-[var(--border-color)] pt-6 ${isClosed ? 'pointer-events-none opacity-75' : ''}`}>

                                        {/* LINKED COMPONENTS: Passing refresh trigger so Estimate updates when Part is added */}
                                        <EstimateBuilder
                                            ticketId={id}
                                            onTotalChange={handleEstimateUpdate}
                                            onActivityLog={handleEstimateLog}
                                            refreshTrigger={estimateRefreshTrigger}
                                        />

                                        <PartsOrderManager
                                            ticketId={id}
                                            onActivityLog={handleEstimateLog}
                                            onAddToEstimate={() => setEstimateRefreshTrigger(prev => prev + 1)}
                                        />

                                    </div>
                                </>
                            )}
                            {!isStaff && <div className="animate-fade-in-up mt-6 border-t pt-6"><CustomerEstimateView ticketId={id} /></div>}
                        </div>
                    </div>

                    {/* --- TICKET TIMELINE --- */}
                    {isManagement && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in-up">
                            <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-xl shadow-sm overflow-hidden">
                                <div className="bg-[var(--bg-subtle)] px-4 py-3 border-b border-[var(--border-color)] flex justify-between items-center">
                                    <h2 className="text-[10px] font-bold uppercase text-[var(--text-muted)] tracking-widest flex items-center gap-2">
                                        <ShieldAlert size={14} /> Restricted Activity Log
                                    </h2>
                                </div>
                                <div className="p-3 max-h-60 overflow-y-auto custom-scrollbar">
                                    {auditLogs.length === 0 ? (
                                        <p className="text-xs text-[var(--text-muted)] italic text-center py-4">No activity recorded yet.</p>
                                    ) : (
                                        <div className="space-y-2">
                                            {auditLogs.map(log => (
                                                <div
                                                    key={log.id}
                                                    onClick={() => setSelectedLog(log)}
                                                    className={`p-2 rounded-md border flex items-center justify-between cursor-pointer transition-all ${getLogColor(log.action)}`}
                                                >
                                                    <div className="flex items-center gap-2 overflow-hidden">
                                                        <div className="text-[10px] font-black uppercase tracking-wide min-w-[70px]">{log.action.split(' ')[0]}</div>
                                                        <div className="h-3 w-px bg-current opacity-20 flex-none"></div>
                                                        <div className="text-xs font-semibold truncate text-[var(--text-main)]">{log.details}</div>
                                                    </div>
                                                    <Eye size={12} className="opacity-40 flex-none ml-2" />
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="border-2 border-dashed border-[var(--border-color)] rounded-xl flex flex-col items-center justify-center p-6 text-[var(--text-muted)] bg-[var(--bg-subtle)] bg-opacity-50">
                                <PlusCircle size={32} className="mb-2 opacity-50" />
                                <span className="font-bold text-sm uppercase tracking-wider">Future Feature Slot</span>
                                <span className="text-xs opacity-70">Reserved for next module</span>
                            </div>
                        </div>
                    )}
                </div>

                <div className="hidden lg:block col-span-1">
                    <div className="rounded-2xl shadow-xl flex flex-col h-[600px] overflow-hidden border border-[var(--border-color)] bg-[var(--bg-surface)] sticky top-24">{renderChatInterface()}</div>
                </div>
            </div>

            <button onClick={() => setIsMobileChatOpen(true)} className="lg:hidden fixed bottom-6 right-6 btn btn-circle btn-lg btn-gradient text-white shadow-2xl z-40"><MessageSquare size={28} /></button>

            {isMobileChatOpen && (
                <div className="fixed inset-0 z-50 lg:hidden flex flex-col bg-[var(--bg-surface)] animate-slide-up">
                    <div className="relative z-50 p-4 border-b border-[var(--border-color)] flex justify-between items-center shadow-sm bg-[var(--bg-surface)]">
                        <h3 className="font-black text-lg text-[var(--text-main)] flex items-center gap-2">Ticket Communications</h3>
                        <button onClick={() => setIsMobileChatOpen(false)} className="btn btn-circle btn-ghost text-[var(--text-muted)]"><X size={28} /></button>
                    </div>
                    <div className="flex-1 overflow-hidden relative z-0">{renderChatInterface()}</div>
                </div>
            )}

            {isScanning && (
                <QRScanner onClose={() => setIsScanning(false)} onScan={(result) => { setIsScanning(false); setTimeout(() => { navigate(`/ticket/${result.includes('/ticket/') ? result.split('/ticket/')[1] : result}`); }, 100); }} />
            )}

            {/* --- NEW EDIT MODAL --- */}
            {isEditModalOpen && (
                <div className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade">
                    <div className="bg-[var(--bg-surface)] w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden animate-pop border border-[var(--border-color)] flex flex-col max-h-[90vh]">
                        <div className="p-5 border-b border-[var(--border-color)] bg-[var(--bg-subtle)] flex justify-between items-center">
                            <h3 className="font-black text-xl text-[var(--text-main)] flex items-center gap-2">
                                <Edit3 size={24} className="text-indigo-600" /> Edit Ticket Details
                            </h3>
                            <button onClick={() => setIsEditModalOpen(false)} className="btn btn-sm btn-circle btn-ghost"><X size={24} /></button>
                        </div>

                        <div className="p-6 overflow-y-auto">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="form-control">
                                    <label className="label">
                                        <span className="label-text font-bold text-xs uppercase text-[var(--text-muted)]">Brand</span>
                                    </label>
                                    <input
                                        type="text"
                                        className="input input-bordered h-12 bg-[var(--bg-surface)] text-[var(--text-main)] focus:border-indigo-500 font-bold"
                                        value={editForm.brand}
                                        onChange={e => setEditForm({ ...editForm, brand: e.target.value })}
                                    />
                                </div>

                                <div className="form-control">
                                    <label className="label">
                                        <span className="label-text font-bold text-xs uppercase text-[var(--text-muted)]">Model</span>
                                    </label>
                                    <input
                                        type="text"
                                        className="input input-bordered h-12 bg-[var(--bg-surface)] text-[var(--text-main)] focus:border-indigo-500 font-bold"
                                        value={editForm.model}
                                        onChange={e => setEditForm({ ...editForm, model: e.target.value })}
                                    />
                                </div>

                                <div className="form-control md:col-span-2">
                                    <label className="label">
                                        <span className="label-text font-bold text-xs uppercase text-[var(--text-muted)]">Serial Number</span>
                                    </label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-3.5 text-[var(--text-muted)]"><Hash size={18} /></span>
                                        <input
                                            type="text"
                                            className="input input-bordered h-12 pl-10 w-full bg-[var(--bg-surface)] text-[var(--text-main)] focus:border-indigo-500 font-mono font-medium"
                                            value={editForm.serial_number || ''}
                                            onChange={e => setEditForm({ ...editForm, serial_number: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="form-control md:col-span-2">
                                    <label className="label">
                                        <span className="label-text font-bold text-xs uppercase text-[var(--text-muted)]">Issue Description</span>
                                    </label>
                                    <textarea
                                        className="textarea textarea-bordered h-40 bg-[var(--bg-surface)] text-[var(--text-main)] focus:border-indigo-500 text-base leading-relaxed"
                                        value={editForm.description}
                                        onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                                    ></textarea>
                                </div>
                            </div>
                        </div>

                        <div className="p-5 border-t border-[var(--border-color)] bg-[var(--bg-subtle)] flex justify-end gap-3">
                            <button onClick={() => setIsEditModalOpen(false)} className="btn btn-ghost text-[var(--text-muted)] hover:bg-[var(--bg-surface)] font-bold">Cancel</button>
                            <button onClick={handleSaveEdit} className="btn btn-gradient text-white shadow-md px-6"><Save size={18} /> Save Changes</button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- LOG DETAIL MODAL --- */}
            {selectedLog && (
                <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade">
                    <div className="bg-[var(--bg-surface)] w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-pop border border-[var(--border-color)] flex flex-col max-h-[90vh]">
                        {/* HEADER with Ticket Context */}
                        <div className="p-5 border-b border-[var(--border-color)] bg-[var(--bg-subtle)]">
                            <div className="flex justify-between items-start mb-3">
                                <h3 className="font-black text-lg text-[var(--text-main)] flex items-center gap-2">
                                    <ShieldAlert size={20} className="text-indigo-600" /> Audit Record
                                </h3>
                                <button onClick={() => setSelectedLog(null)} className="btn btn-sm btn-circle btn-ghost text-[var(--text-muted)] hover:bg-[var(--bg-surface)]"><X size={20} /></button>
                            </div>
                            {/* Ticket Context Header */}
                            <div className="bg-[var(--bg-surface)] p-3 rounded-lg border border-[var(--border-color)] flex items-center gap-3">
                                <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-md text-indigo-600">
                                    <FileText size={16} />
                                </div>
                                <div>
                                    <div className="text-[10px] font-bold uppercase text-[var(--text-muted)] tracking-wider">Referring Ticket</div>
                                    <div className="font-bold text-[var(--text-main)] text-sm">
                                        Ticket #{ticket.id} • {ticket.brand} {ticket.model}
                                    </div>
                                    <div className="text-xs text-[var(--text-muted)]">{ticket.customer_name}</div>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 overflow-y-auto">
                            <div className="grid grid-cols-2 gap-4 mb-6">
                                <div className="p-3 bg-[var(--bg-subtle)] rounded-lg">
                                    <div className="text-[10px] font-bold uppercase text-[var(--text-muted)]">Performed By</div>
                                    <div className="font-bold text-[var(--text-main)] text-base mt-1">{selectedLog.actor_name}</div>
                                </div>
                                <div className="p-3 bg-[var(--bg-subtle)] rounded-lg">
                                    <div className="text-[10px] font-bold uppercase text-[var(--text-muted)]">Action Type</div>
                                    <div className="font-bold text-[var(--text-main)] text-base mt-1">{selectedLog.action}</div>
                                </div>
                            </div>

                            <div className="mb-6">
                                <div className="text-xs font-bold uppercase text-[var(--text-muted)] mb-2">Change Description</div>
                                <div className="p-4 bg-[var(--bg-subtle)] rounded-lg border border-[var(--border-color)] font-medium text-[var(--text-main)] text-sm leading-relaxed">
                                    {selectedLog.details}
                                </div>
                            </div>

                            {/* METADATA SECTION */}
                            {selectedLog.metadata && (
                                <div>
                                    <div className="text-xs font-bold uppercase text-[var(--text-muted)] mb-2 flex items-center gap-2">
                                        <Laptop size={12} /> Technical Metadata
                                    </div>
                                    <div className="p-4 bg-slate-900 text-slate-300 rounded-lg font-mono text-xs shadow-inner">
                                        <div className="grid grid-cols-[100px_1fr] gap-y-1">
                                            <span className="text-indigo-400 font-bold">TIMESTAMP:</span>
                                            <span>{new Date(selectedLog.created_at).toLocaleString()}</span>

                                            <span className="text-indigo-400 font-bold">DEVICE:</span>
                                            <span>{getHumanReadableDevice(selectedLog.metadata.device)}</span>

                                            {/* Dynamic Metadata Render */}
                                            {Object.entries(selectedLog.metadata).map(([key, value]) => {
                                                if (key === 'device' || key === 'timestamp' || key === 'user_email') return null;
                                                return (
                                                    <React.Fragment key={key}>
                                                        <span className="text-indigo-400 font-bold uppercase">{key.replace('_', ' ')}:</span>
                                                        <span className="break-all">{typeof value === 'object' ? JSON.stringify(value) : value}</span>
                                                    </React.Fragment>
                                                )
                                            })}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <div style={{ position: 'absolute', top: '-10000px', left: '-10000px' }}>
                <div ref={labelRef} style={{ width: '4in', height: '6in', border: '5px solid red', padding: '20px' }}>
                    <h1>TEST PRINT</h1>
                    <p>ID: {ticket ? ticket.id : 'Loading...'}</p>
                </div>
            </div>
        </div>
    );
}