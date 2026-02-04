import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useReactToPrint } from 'react-to-print';
import { format } from 'date-fns';
import {
    ArrowLeft, Send, MessageSquare, Lock, Globe,
    AlertTriangle, Save, X, Edit3, Printer, Calendar, User, Phone, Hash, Wrench, AlertCircle, FileText, History, Moon, Sun, QrCode, ShieldAlert, Laptop, PlusCircle, LockKeyhole, DollarSign, Truck,
    Trash2, Tag, ClipboardList, Fingerprint, Cpu, Share2, ChevronDown
} from 'lucide-react';

import { supabase } from '../supabaseClient';
import EstimateBuilder from '../components/EstimateBuilder';
import CustomerEstimateView from '../components/CustomerEstimateView';
import PartsOrderManager from '../components/PartsOrderManager';
import PartSourcing from '../components/PartSourcing';
import { useToast } from '../context/ToastProvider';
import { formatPhoneNumber } from '../utils';
import QRScanner from '../components/QRScanner';
import QRCode from "react-qr-code";

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
    const [estimateRefreshTrigger, setEstimateRefreshTrigger] = useState(0);
    const isLoadedRef = useRef(false);

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
    const [logToDelete, setLogToDelete] = useState(null);

    // Mobile & Theme
    const [isMobileChatOpen, setIsMobileChatOpen] = useState(false);
    const [isScanning, setIsScanning] = useState(false);
    const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');

    // Refs
    const chatEndRef = useRef(null);
    const inputRef = useRef(null);

    // Print Refs
    const customerLabelRef = useRef(null);
    const shopLabelRef = useRef(null);

    const isStaff = ['employee', 'manager', 'admin'].includes(userRole);
    const isManagement = ['manager', 'admin'].includes(userRole);
    const isClosed = ticket?.status === 'completed';
    const canEdit = isManagement || (isStaff && !isClosed);

    // Print Handlers
    const handlePrintCustomer = useReactToPrint({
        contentRef: customerLabelRef,
        documentTitle: `Customer_Receipt_${id}`,
        onAfterPrint: () => addToast('Customer receipt printed', 'success'),
    });

    const handlePrintShop = useReactToPrint({
        contentRef: shopLabelRef,
        documentTitle: `Shop_Tag_${id}`,
        onAfterPrint: () => addToast('Shop tag printed', 'success'),
    });

    const handleCopyLink = () => {
        const link = `${window.location.origin}/status/${id}`;
        navigator.clipboard.writeText(link);
        addToast("Public link copied to clipboard!", "success");
    };

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
        setTimeout(() => { isLoadedRef.current = true; }, 1000);
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
        if (loading || !ticket || !isLoadedRef.current) return;
        const currentTotal = parseFloat(ticket.estimate_total || 0).toFixed(2);
        const incomingTotal = parseFloat(newTotal || 0).toFixed(2);

        if (currentTotal !== incomingTotal) {
            const { error } = await supabase
                .from('tickets')
                .update({ estimate_total: incomingTotal })
                .eq('id', id);

            if (!error) {
                setTicket(prev => ({ ...prev, estimate_total: incomingTotal }));
                logAudit('ESTIMATE CHANGE', `Updated total to $${incomingTotal}`);
            }
        }
    };

    const handleEstimateLog = (action, details) => {
        logAudit(action, details);
    };

    const promptDeleteLog = (log, e) => {
        e.stopPropagation();
        setLogToDelete(log);
    };

    const executeDeleteLog = async () => {
        if (!logToDelete) return;
        const { error } = await supabase.from('audit_logs').delete().eq('id', logToDelete.id);
        if (error) {
            addToast("Failed to delete log", "error");
        } else {
            addToast("Log entry deleted forever", "success");
            setAuditLogs(prev => prev.filter(log => log.id !== logToDelete.id));
            if (selectedLog?.id === logToDelete.id) setSelectedLog(null);
        }
        setLogToDelete(null);
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

    const getLogVisuals = (action) => {
        if (action.includes('STATUS') || action.includes('REOPEN')) return { bg: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300', icon: <ActivityIcon size={14} /> };
        if (action.includes('ESTIMATE')) return { bg: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300', icon: <DollarSign size={14} /> };
        if (action.includes('ASSIGN')) return { bg: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300', icon: <User size={14} /> };
        if (action.includes('PART')) return { bg: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300', icon: <Truck size={14} /> };
        if (action.includes('DELETE') || action.includes('REMOVE')) return { bg: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300', icon: <AlertCircle size={14} /> };
        return { bg: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400', icon: <FileText size={14} /> };
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
            {isClosed ? (
                <div className="p-6 bg-slate-50 dark:bg-slate-800/50 border-t border-[var(--border-color)] flex flex-col items-center justify-center text-center">
                    <div className="bg-slate-200 dark:bg-slate-700 p-3 rounded-full mb-2">
                        <LockKeyhole size={24} className="text-slate-50 dark:text-slate-400" />
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

                                    <button
                                        onClick={handleCopyLink}
                                        className="btn btn-square h-12 w-12 border-2 border-[var(--border-color)] bg-[var(--bg-surface)] hover:bg-[var(--bg-subtle)] text-indigo-500 flex-none"
                                        title="Copy Public Link"
                                    >
                                        <Share2 size={20} />
                                    </button>

                                    {/* --- PRINT DROPDOWN --- */}
                                    <div className="dropdown dropdown-end">
                                        <label tabIndex={0} className="btn btn-square h-12 w-12 border-2 border-[var(--border-color)] bg-[var(--bg-surface)] hover:bg-[var(--bg-subtle)] text-[var(--text-main)] flex-none">
                                            <Printer size={20} />
                                        </label>
                                        <ul tabIndex={0} className="dropdown-content z-[1] menu p-2 shadow-xl bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-box w-52 mt-1">
                                            <li>
                                                <a onClick={handlePrintShop} className="flex items-center gap-2 font-bold text-[var(--text-main)]">
                                                    <Tag size={16} /> Shop Tag (Device)
                                                </a>
                                            </li>
                                            <li>
                                                <a onClick={handlePrintCustomer} className="flex items-center gap-2 font-bold text-[var(--text-main)]">
                                                    <User size={16} /> Customer Receipt
                                                </a>
                                            </li>
                                        </ul>
                                    </div>

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
                    <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl shadow-sm overflow-hidden animate-fade-in relative group">
                        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500 opacity-50"></div>

                        {/* --- DIAGNOSIS HEADER --- */}
                        <div className="px-6 py-5 border-b border-[var(--border-color)] flex justify-between items-center bg-[var(--bg-subtle)]">
                            <div>
                                <h2 className="text-sm font-black uppercase text-[var(--text-main)] tracking-widest flex items-center gap-2">
                                    <ClipboardList size={18} className="text-indigo-600" /> Technical Diagnosis
                                </h2>
                                <p className="text-[10px] font-bold text-[var(--text-muted)] mt-0.5 ml-7">
                                    Case File #{ticket.id} • Opened {format(new Date(ticket.created_at), 'MMM dd, yyyy')}
                                </p>
                            </div>

                            {/* Premium Edit Button */}
                            {canEdit && (userRole === 'manager' || userRole === 'admin') && (
                                <button
                                    onClick={() => setIsEditModalOpen(true)}
                                    className="btn btn-sm bg-white dark:bg-slate-800 border border-[var(--border-color)] shadow-sm text-[var(--text-muted)] hover:text-indigo-600 hover:border-indigo-300 transition-all gap-2"
                                >
                                    <Edit3 size={14} />
                                    <span className="hidden sm:inline font-bold">Edit Specs</span>
                                </button>
                            )}
                        </div>

                        <div className="p-6 md:p-8">
                            <div className="flex flex-wrap gap-4 mb-8">
                                <div className="flex items-center gap-3 px-4 py-2 bg-[var(--bg-subtle)] rounded-lg border border-[var(--border-color)]">
                                    <div className="p-1.5 bg-white dark:bg-slate-700 rounded-md shadow-sm">
                                        <Cpu size={16} className="text-slate-500" />
                                    </div>
                                    <div>
                                        <div className="text-[9px] font-black uppercase text-[var(--text-muted)] tracking-wider">Model ID</div>
                                        <div className="text-sm font-bold text-[var(--text-main)]">{ticket.model}</div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 px-4 py-2 bg-[var(--bg-subtle)] rounded-lg border border-[var(--border-color)]">
                                    <div className="p-1.5 bg-white dark:bg-slate-700 rounded-md shadow-sm">
                                        <Fingerprint size={16} className="text-slate-500" />
                                    </div>
                                    <div>
                                        <div className="text-[9px] font-black uppercase text-[var(--text-muted)] tracking-wider">Serial / IMEI</div>
                                        <div className="text-sm font-mono font-bold text-[var(--text-main)] tracking-wide">
                                            {ticket.serial_number || 'N/A'}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="relative mb-10">
                                <div className="absolute -left-3 top-0 bottom-0 w-1 bg-[var(--border-color)] rounded-full"></div>
                                <div className="pl-6">
                                    <h3 className="text-xs font-bold uppercase text-[var(--text-muted)] mb-3 flex items-center gap-2">
                                        <AlertCircle size={14} className="text-orange-500" /> Customer Stated Defect
                                    </h3>
                                    <div className="p-5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-color)] text-[var(--text-main)] font-medium leading-relaxed whitespace-pre-wrap shadow-inner relative overflow-hidden">
                                        <div className="absolute top-2 right-4 text-6xl font-serif text-[var(--border-color)] opacity-50 pointer-events-none">”</div>
                                        {ticket.description || "No description provided at intake."}
                                    </div>
                                </div>
                            </div>

                            {isStaff && (
                                <div className="mt-10 animate-fade-in-up">
                                    <div className="relative flex items-center gap-4 mb-6">
                                        <div className="h-px bg-[var(--border-color)] flex-1"></div>
                                        <span className="text-[10px] font-black uppercase text-[var(--text-muted)] tracking-widest flex items-center gap-2 bg-[var(--bg-surface)] px-2">
                                            <Wrench size={12} /> Service Control Center
                                        </span>
                                        <div className="h-px bg-[var(--border-color)] flex-1"></div>
                                    </div>
                                    <div className={`rounded-2xl border transition-all duration-500 overflow-hidden shadow-sm relative group ${ticket.is_backordered ? 'border-red-400 ring-4 ring-red-500/10 bg-red-50/50 dark:bg-red-900/5' : 'border-[var(--border-color)] bg-[var(--bg-subtle)] hover:shadow-md'}`}>
                                        <div className={`p-4 flex flex-col sm:flex-row justify-between items-center gap-4 border-b backdrop-blur-sm ${ticket.is_backordered ? 'bg-red-100/50 dark:bg-red-900/30 border-red-200 dark:border-red-800/50' : 'bg-slate-50/80 dark:bg-slate-800/50 border-[var(--border-color)]'}`}>
                                            <div className="flex items-center gap-3">
                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm ${ticket.is_backordered ? 'bg-red-500 text-white animate-pulse' : 'bg-white dark:bg-slate-700 text-indigo-600'}`}>
                                                    {ticket.is_backordered ? <AlertTriangle size={20} /> : <DollarSign size={20} />}
                                                </div>
                                                <div>
                                                    <h4 className={`font-black text-sm uppercase tracking-wide ${ticket.is_backordered ? 'text-red-600 dark:text-red-400' : 'text-[var(--text-main)]'}`}>
                                                        {ticket.is_backordered ? 'Order Hold Active' : 'Repair Operations'}
                                                    </h4>
                                                    <p className="text-[10px] font-bold text-[var(--text-muted)]">
                                                        {ticket.is_backordered ? 'Waiting on vendor parts delivery' : 'Manage estimate, inventory & orders'}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3 bg-white dark:bg-slate-900 p-1.5 rounded-full border border-[var(--border-color)] shadow-sm">
                                                <span className={`text-[10px] font-bold uppercase px-2 ${ticket.is_backordered ? 'text-red-500' : 'text-[var(--text-muted)]'}`}>
                                                    {ticket.is_backordered ? 'On Hold' : 'Standard'}
                                                </span>
                                                <button
                                                    onClick={toggleBackorder}
                                                    disabled={!canEdit}
                                                    className={`w-12 h-6 rounded-full transition-all relative shadow-inner flex items-center ${ticket.is_backordered ? 'bg-red-500' : 'bg-slate-200 dark:bg-slate-700'} ${!canEdit ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                                                >
                                                    <div className={`w-5 h-5 bg-white rounded-full shadow-md absolute transition-all duration-300 ${ticket.is_backordered ? 'translate-x-6' : 'translate-x-0.5'}`} />
                                                </button>
                                            </div>
                                        </div>

                                        <div className={`p-6 space-y-8 ${isClosed ? 'opacity-60 pointer-events-none grayscale-[0.5]' : ''}`}>
                                            <div className="relative">
                                                <div className="absolute -left-6 top-6 bottom-6 w-1 bg-indigo-500/20 rounded-r-full"></div>
                                                <EstimateBuilder
                                                    ticketId={id}
                                                    onTotalChange={handleEstimateUpdate}
                                                    onActivityLog={handleEstimateLog}
                                                    refreshTrigger={estimateRefreshTrigger}
                                                />
                                            </div>
                                            <div className="relative">
                                                <div className="absolute -left-6 top-6 bottom-6 w-1 bg-emerald-500/20 rounded-r-full"></div>
                                                <PartsOrderManager
                                                    ticketId={id}
                                                    onActivityLog={handleEstimateLog}
                                                    onAddToEstimate={() => setEstimateRefreshTrigger(prev => prev + 1)}
                                                />
                                            </div>
                                            <div className="relative">
                                                <div className="absolute -left-6 top-6 bottom-6 w-1 bg-amber-500/20 rounded-r-full"></div>
                                                <PartSourcing
                                                    initialQuery={`${ticket.brand} ${ticket.model}`}
                                                    ticketId={id}
                                                    onAddToEstimate={() => setEstimateRefreshTrigger(prev => prev + 1)}
                                                />
                                            </div>
                                        </div>
                                        {isClosed && (
                                            <div className="absolute inset-0 z-10 bg-slate-100/50 dark:bg-slate-900/50 backdrop-blur-[1px] flex items-center justify-center">
                                                <div className="bg-white dark:bg-slate-800 px-6 py-3 rounded-full shadow-xl border border-[var(--border-color)] flex items-center gap-2">
                                                    <LockKeyhole size={16} className="text-[var(--text-muted)]" />
                                                    <span className="text-xs font-bold text-[var(--text-main)]">Ticket Completed - Read Only</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                            {!isStaff && <div className="animate-fade-in-up mt-6 border-t pt-6"><CustomerEstimateView ticketId={id} /></div>}
                        </div>

                        {isManagement && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in-up p-6 md:p-8 pt-0">
                                <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl shadow-sm overflow-hidden flex flex-col h-80">
                                    <div className="px-5 py-4 bg-slate-50 dark:bg-slate-800/50 border-b border-[var(--border-color)] flex justify-between items-center shrink-0">
                                        <h2 className="text-[10px] font-bold uppercase text-[var(--text-muted)] tracking-widest flex items-center gap-2">
                                            <ShieldAlert size={14} className="text-indigo-600" /> Restricted Activity Log
                                        </h2>
                                        <div className="px-2 py-0.5 bg-white dark:bg-slate-700 rounded-md border border-[var(--border-color)] text-[10px] font-mono text-[var(--text-muted)] shadow-sm">
                                            {auditLogs.length} Records
                                        </div>
                                    </div>
                                    <div className="overflow-y-auto custom-scrollbar flex-1 bg-[var(--bg-surface)]">
                                        {auditLogs.length === 0 ? (
                                            <div className="h-full flex flex-col items-center justify-center text-[var(--text-muted)] opacity-60">
                                                <History size={24} className="mb-2" />
                                                <p className="text-xs italic">No activity recorded yet.</p>
                                            </div>
                                        ) : (
                                            <div className="divide-y divide-[var(--border-color)]">
                                                {auditLogs.map(log => {
                                                    const visuals = getLogVisuals(log.action);
                                                    return (
                                                        <div
                                                            key={log.id}
                                                            onClick={() => setSelectedLog(log)}
                                                            className="px-5 py-3 flex items-start gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors group relative pr-10"
                                                        >
                                                            <div className={`w-8 h-8 rounded-full flex-none flex items-center justify-center shadow-sm border border-transparent ${visuals.bg}`}>
                                                                {visuals.icon}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex justify-between items-baseline mb-0.5">
                                                                    <span className="text-[10px] font-black uppercase tracking-wider opacity-50">{log.action.split(' ')[0]}</span>
                                                                    <span className="text-[9px] text-[var(--text-muted)] font-medium">
                                                                        {format(new Date(log.created_at), 'MMM d, h:mm a')}
                                                                    </span>
                                                                </div>
                                                                <div className="text-xs font-bold text-[var(--text-main)] truncate">{log.details}</div>
                                                                <div className="text-[9px] text-[var(--text-muted)] mt-0.5 flex items-center gap-1">
                                                                    <User size={8} />
                                                                    <span className="opacity-80">{log.actor_name.split(' ')[0]}</span>
                                                                </div>
                                                            </div>
                                                            {userRole === 'admin' && (
                                                                <button
                                                                    onClick={(e) => promptDeleteLog(log, e)}
                                                                    className="absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all transform scale-90 hover:scale-100 btn btn-ghost btn-xs btn-square text-red-400 hover:bg-red-50 hover:text-red-600 hover:border-red-200"
                                                                    title="Delete Log Entry"
                                                                >
                                                                    <Trash2 size={14} />
                                                                </button>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="border-2 border-dashed border-[var(--border-color)] rounded-2xl flex flex-col items-center justify-center p-6 text-[var(--text-muted)] bg-slate-50/50 dark:bg-slate-800/20 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors h-80 cursor-default group">
                                    <div className="w-16 h-16 rounded-full bg-white dark:bg-slate-800 shadow-sm flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-500">
                                        <PlusCircle size={32} className="opacity-30 text-[var(--text-main)]" />
                                    </div>
                                    <span className="font-black text-xs uppercase tracking-widest opacity-60">System Module Slot</span>
                                    <span className="text-[10px] opacity-40 mt-1">Reserved for future expansion</span>
                                </div>
                            </div>
                        )}
                    </div>
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

            {/* --- PREMIUM EDIT MODAL (Updated) --- */}
            {isEditModalOpen && (
                <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-[var(--bg-surface)] w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden animate-pop border border-[var(--border-color)] flex flex-col max-h-[90vh]">

                        {/* DISTINCT HEADER (Darker/Colored to verify update) */}
                        <div className="p-6 border-b border-[var(--border-color)] bg-slate-100 dark:bg-slate-800 flex justify-between items-center">
                            <div>
                                <h3 className="font-black text-xl text-[var(--text-main)] flex items-center gap-2">
                                    <Edit3 size={22} className="text-indigo-600" /> Edit Ticket Specs
                                </h3>
                                <p className="text-xs font-bold text-[var(--text-muted)] mt-1 uppercase tracking-wide">
                                    Core Device Information
                                </p>
                            </div>
                            <button
                                onClick={() => setIsEditModalOpen(false)}
                                className="btn btn-sm btn-circle btn-ghost text-[var(--text-muted)] hover:bg-[var(--bg-surface)]"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        {/* MODAL BODY */}
                        <div className="p-8 overflow-y-auto custom-scrollbar bg-[var(--bg-surface)]">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                                {/* Brand Input */}
                                <div className="form-control">
                                    <label className="label text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1">
                                        Device Brand
                                    </label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[var(--text-muted)] group-focus-within:text-indigo-500 transition-colors">
                                            <Tag size={18} />
                                        </div>
                                        <input
                                            type="text"
                                            className="input input-bordered w-full h-12 pl-12 bg-[var(--bg-subtle)] text-[var(--text-main)] font-bold focus:bg-[var(--bg-surface)] focus:border-indigo-500 transition-all text-base"
                                            placeholder="e.g. Dyson"
                                            value={editForm.brand || ''}
                                            onChange={e => setEditForm({ ...editForm, brand: e.target.value })}
                                        />
                                    </div>
                                </div>

                                {/* Model Input */}
                                <div className="form-control">
                                    <label className="label text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1">
                                        Model Name/No.
                                    </label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[var(--text-muted)] group-focus-within:text-indigo-500 transition-colors">
                                            <Cpu size={18} />
                                        </div>
                                        <input
                                            type="text"
                                            className="input input-bordered w-full h-12 pl-12 bg-[var(--bg-subtle)] text-[var(--text-main)] font-bold focus:bg-[var(--bg-surface)] focus:border-indigo-500 transition-all text-base"
                                            placeholder="e.g. V11 Animal"
                                            value={editForm.model || ''}
                                            onChange={e => setEditForm({ ...editForm, model: e.target.value })}
                                        />
                                    </div>
                                </div>

                                {/* Serial Number (Full Width) */}
                                <div className="form-control md:col-span-2">
                                    <label className="label text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1">
                                        Serial Number / IMEI
                                    </label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[var(--text-muted)] group-focus-within:text-indigo-500 transition-colors">
                                            <Hash size={18} />
                                        </div>
                                        <input
                                            type="text"
                                            className="input input-bordered w-full h-12 pl-12 bg-[var(--bg-subtle)] text-[var(--text-main)] font-mono font-medium focus:bg-[var(--bg-surface)] focus:border-indigo-500 transition-all text-base"
                                            placeholder="S/N: 123-456-789"
                                            value={editForm.serial_number || ''}
                                            onChange={e => setEditForm({ ...editForm, serial_number: e.target.value })}
                                        />
                                    </div>
                                </div>

                                {/* Description (Full Width) */}
                                <div className="form-control md:col-span-2">
                                    <label className="label text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1">
                                        Customer Stated Issue
                                    </label>
                                    <div className="relative group">
                                        <textarea
                                            className="textarea textarea-bordered w-full h-32 p-4 bg-[var(--bg-subtle)] text-[var(--text-main)] text-base font-medium leading-relaxed focus:bg-[var(--bg-surface)] focus:border-indigo-500 transition-all resize-none"
                                            placeholder="Describe the issue in detail..."
                                            value={editForm.description || ''}
                                            onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                                        ></textarea>
                                        <div className="absolute top-4 right-4 pointer-events-none opacity-20 text-[var(--text-muted)]">
                                            <AlertCircle size={24} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* MODAL FOOTER */}
                        <div className="p-6 border-t border-[var(--border-color)] bg-[var(--bg-subtle)] flex justify-end gap-3">
                            <button
                                onClick={() => setIsEditModalOpen(false)}
                                className="btn btn-ghost text-[var(--text-muted)] hover:bg-[var(--bg-surface)] font-bold h-12 px-6"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveEdit}
                                className="btn btn-gradient text-white shadow-lg shadow-indigo-500/30 px-8 hover:scale-[1.02] transition-transform h-12 gap-2"
                            >
                                <Save size={20} /> Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {selectedLog && (
                <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade">
                    <div className="bg-[var(--bg-surface)] w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-pop border border-[var(--border-color)] flex flex-col max-h-[90vh]">
                        <div className="p-5 border-b border-[var(--border-color)] bg-[var(--bg-subtle)]">
                            <div className="flex justify-between items-start mb-3">
                                <h3 className="font-black text-lg text-[var(--text-main)] flex items-center gap-2">
                                    <ShieldAlert size={20} className="text-indigo-600" /> Audit Record
                                </h3>
                                <button onClick={() => setSelectedLog(null)} className="btn btn-sm btn-circle btn-ghost text-[var(--text-muted)] hover:bg-[var(--bg-surface)]"><X size={20} /></button>
                            </div>
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

            {logToDelete && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md transition-opacity animate-fade-in" onClick={() => setLogToDelete(null)} />
                    <div className="relative w-full max-w-sm bg-[var(--bg-surface)] rounded-2xl shadow-[0_20px_50px_-12px_rgba(0,0,0,0.5)] overflow-hidden border border-[var(--border-color)] animate-pop ring-1 ring-red-500/20">
                        <div className="h-1.5 w-full bg-gradient-to-r from-red-500 via-orange-500 to-red-500"></div>
                        <div className="p-8">
                            <div className="mx-auto w-20 h-20 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center mb-6 relative">
                                <div className="absolute inset-0 rounded-full bg-red-500/20 animate-ping opacity-50"></div>
                                <Trash2 size={36} className="text-red-600 dark:text-red-500 relative z-10" />
                            </div>
                            <div className="text-center mb-8">
                                <h3 className="text-2xl font-black text-[var(--text-main)] mb-2">Delete Log Entry?</h3>
                                <p className="text-sm text-[var(--text-muted)] leading-relaxed">
                                    This action cannot be undone. This record will be <strong className="text-red-500">permanently erased</strong> from the database history.
                                </p>
                            </div>
                            <div className="bg-[var(--bg-subtle)] rounded-xl border border-[var(--border-color)] p-4 text-left mb-8 relative overflow-hidden group">
                                <div className="absolute top-0 bottom-0 left-0 w-1 bg-red-400"></div>
                                <div className="pl-3">
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="text-[10px] font-black uppercase text-[var(--text-muted)] tracking-wider">Log #{logToDelete.id}</span>
                                        <span className="text-[10px] font-bold text-[var(--text-muted)]">{new Date(logToDelete.created_at).toLocaleDateString()}</span>
                                    </div>
                                    <p className="font-mono text-xs text-[var(--text-main)] line-clamp-2 opacity-90">"{logToDelete.details}"</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <button onClick={() => setLogToDelete(null)} className="btn btn-ghost h-12 font-bold text-[var(--text-muted)] hover:bg-[var(--bg-subtle)] border border-transparent hover:border-[var(--border-color)]">Cancel</button>
                                <button onClick={executeDeleteLog} className="btn btn-error h-12 text-white font-bold shadow-lg shadow-red-500/30 border-none bg-gradient-to-br from-red-500 to-red-600 hover:scale-[1.02] transition-transform">Yes, Delete</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* --- HIDDEN PRINT AREA --- */}
            <div style={{ display: 'none' }}>

                {/* 1. CUSTOMER RECEIPT (External Link) */}
                <div ref={customerLabelRef} style={{ width: '4in', height: '6in', padding: '20px', fontFamily: 'sans-serif', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', border: '1px solid #ccc' }}>
                    <div style={{ textAlign: 'center', borderBottom: '2px solid black', paddingBottom: '10px' }}>
                        <h1 style={{ fontSize: '24px', fontWeight: '900', margin: '0' }}>REPAIR SHOP</h1>
                        <p style={{ fontSize: '12px', margin: '5px 0 0 0', textTransform: 'uppercase' }}>123 Tech Ave • (555) 123-4567</p>
                    </div>
                    <div style={{ marginTop: '20px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                            <span style={{ fontSize: '14px', fontWeight: 'bold', textTransform: 'uppercase' }}>Ticket ID</span>
                            <span style={{ fontSize: '40px', fontWeight: '900', lineHeight: '1' }}>#{ticket?.id}</span>
                        </div>
                        <div style={{ marginTop: '20px' }}>
                            <p style={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', color: '#666', margin: '0' }}>Customer</p>
                            <p style={{ fontSize: '18px', fontWeight: 'bold', margin: '2px 0 0 0' }}>{ticket?.customer_name}</p>
                            <p style={{ fontSize: '14px', margin: '0' }}>{formatPhoneNumber(ticket?.phone)}</p>
                        </div>
                        <div style={{ marginTop: '20px' }}>
                            <p style={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', color: '#666', margin: '0' }}>Device</p>
                            <p style={{ fontSize: '16px', fontWeight: 'bold', margin: '2px 0 0 0' }}>{ticket?.brand} {ticket?.model}</p>
                            <p style={{ fontSize: '12px', fontFamily: 'monospace', margin: '2px 0 0 0' }}>SN: {ticket?.serial_number || 'N/A'}</p>
                        </div>
                    </div>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', marginTop: '20px' }}>
                        {ticket && <QRCode value={`${window.location.origin}/status/${ticket.id}`} size={160} />}
                        <p style={{ marginTop: '15px', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase' }}>Scan to Check Status</p>
                    </div>
                    <div style={{ textAlign: 'center', fontSize: '10px', marginTop: 'auto', borderTop: '1px solid #eee', paddingTop: '10px' }}>
                        <p style={{ margin: '0' }}>Intake Date: {ticket ? new Date(ticket.created_at).toLocaleDateString() : ''}</p>
                        <p style={{ margin: '0' }}>Technician: {ticket?.assignee_name || 'Unassigned'}</p>
                    </div>
                </div>

                {/* 2. SHOP TAG (Internal Link) - Compact for Device */}
                <div ref={shopLabelRef} style={{ width: '3.5in', height: '1.2in', padding: '5px', fontFamily: 'monospace', display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid black' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', width: '65%' }}>
                        <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold' }}>#{ticket?.id}</h2>
                        <p style={{ margin: 0, fontSize: '12px', fontWeight: 'bold' }}>{ticket?.customer_name?.split(' ')[1] || ticket?.customer_name}</p>
                        <p style={{ margin: '2px 0 0 0', fontSize: '10px' }}>{ticket?.model}</p>
                    </div>
                    <div style={{ width: '35%', display: 'flex', justifyContent: 'flex-end' }}>
                        {ticket && <QRCode value={`${window.location.origin}/ticket/${ticket.id}`} size={64} />}
                    </div>
                </div>

            </div>
        </div>
    );
}

const ActivityIcon = ({ size }) => <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>;