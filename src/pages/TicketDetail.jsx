import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { ArrowLeft, Send, MessageSquare, Lock, Globe, AlertTriangle, Save, X, Edit3 } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '../context/ToastProvider';
import { formatPhoneNumber } from '../utils';

export default function TicketDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { addToast } = useToast();

    const [ticket, setTicket] = useState(null);
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [userRole, setUserRole] = useState('customer');

    // Edit Mode States
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState({});

    const [newMessage, setNewMessage] = useState('');
    const [activeTab, setActiveTab] = useState('public');
    const [isSending, setIsSending] = useState(false);

    const chatEndRef = useRef(null);
    const inputRef = useRef(null);

    // HELPER: Check if user is ANY kind of staff
    const isStaff = ['employee', 'manager', 'admin'].includes(userRole);

    useEffect(() => { fetchData(); }, [id]);

    useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, activeTab]);

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

            // Default to Internal tab for ANY staff member
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

    const sendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || isSending) return;
        setIsSending(true);

        // Logic Update: Checks isStaff instead of just 'employee'
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

    const toggleBackorder = async (checked) => {
        setTicket({ ...ticket, is_backordered: checked });
        await supabase.from('tickets').update({ is_backordered: checked }).eq('id', id);
        if (checked) addToast("Marked as Backordered", 'error');
    };

    const filteredMessages = messages.filter(msg => {
        // Customers can NEVER see internal notes
        if (!isStaff && msg.is_internal) return false;

        // Staff filter based on tab
        if (isStaff) {
            if (activeTab === 'internal') return msg.is_internal === true;
            if (activeTab === 'public') return msg.is_internal === false;
        }
        return true;
    });

    if (loading) return <div className="p-10 text-center"><span className="loading loading-spinner loading-lg text-primary"></span></div>;
    if (!ticket) return <div className="p-10 text-center text-xl font-bold text-[var(--text-main)]">Ticket not found.</div>;

    return (
        <div className="min-h-screen p-6 font-sans">

            {/* HEADER BAR */}
            <div className="rounded-2xl p-6 mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 animate-fade shadow-sm backdrop-blur-md bg-[var(--bg-surface)] border border-[var(--border-color)]">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate(-1)} className="btn btn-circle btn-ghost hover:bg-[var(--bg-subtle)]">
                        <ArrowLeft size={24} className="text-[var(--text-main)]" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-black text-[var(--text-main)]">Ticket #{ticket.id}</h1>
                        <p className="text-[var(--text-muted)] font-medium flex items-center gap-2">
                            {ticket.brand} {ticket.model}
                            {ticket.serial_number && (
                                <span className="badge badge-sm badge-outline font-mono text-xs opacity-70">
                                    SN: {ticket.serial_number}
                                </span>
                            )}
                        </p>
                    </div>
                </div>
                <div className="flex gap-3 items-center">
                    {isStaff ? (
                        <div className="form-control">
                            <select className="select select-bordered font-bold shadow-sm bg-[var(--bg-surface)] text-[var(--text-main)]" value={ticket.status} onChange={(e) => updateStatus(e.target.value)}>
                                <option value="intake">Intake</option>
                                <option value="diagnosing">Diagnosing</option>
                                <option value="waiting_parts">Waiting on Parts</option>
                                <option value="repairing">Repairing</option>
                                <option value="ready_pickup">Ready for Pickup</option>
                                <option value="completed">Completed</option>
                            </select>
                        </div>
                    ) : (
                        <div className={`badge ${ticket.status === 'completed' ? 'badge-success' : 'badge-primary'} p-4 font-bold uppercase tracking-wide`}>
                            {ticket.status.replace('_', ' ')}
                        </div>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade">
                <div className="lg:col-span-2 space-y-6">

                    {/* Customer Info Box */}
                    <div className="content-card">
                        <h2 className="text-xs font-bold uppercase text-[var(--text-muted)] tracking-wider mb-4 border-b border-[var(--border-color)] pb-2">Customer Information</h2>
                        <div className="flex justify-between items-center">
                            <div>
                                <p className="text-xl font-black text-[var(--text-main)]">{ticket.customer_name}</p>
                                <p className="text-lg text-[var(--text-muted)] font-mono">{formatPhoneNumber(ticket.phone)}</p>
                            </div>
                            {isStaff && (
                                <button className="btn btn-outline btn-sm text-[var(--text-main)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-main)]" onClick={() => ticket.customer_id && navigate(`/customer/${ticket.customer_id}`)} disabled={!ticket.customer_id}>
                                    History
                                </button>
                            )}
                        </div>
                    </div>

                    {/* DETAILS CARD */}
                    <div className="content-card relative">
                        <div className="flex justify-between items-center border-b border-[var(--border-color)] pb-2 mb-4">
                            <h2 className="text-xs font-bold uppercase text-[var(--text-muted)] tracking-wider">Technical Issue</h2>

                            {/* EDIT BUTTONS (Only for Managers/Admins) */}
                            {(userRole === 'manager' || userRole === 'admin') && (
                                <div>
                                    {isEditing ? (
                                        <div className="flex gap-2">
                                            <button onClick={() => setIsEditing(false)} className="btn btn-xs btn-ghost text-red-500"><X size={14} /> Cancel</button>
                                            <button onClick={handleSaveEdit} className="btn btn-xs btn-primary text-white"><Save size={14} /> Save</button>
                                        </div>
                                    ) : (
                                        <button onClick={() => setIsEditing(true)} className="btn btn-xs btn-ghost text-[var(--text-muted)] hover:text-indigo-600">
                                            <Edit3 size={14} /> Edit
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>

                        {isEditing ? (
                            // EDIT MODE
                            <div className="space-y-4 animate-fade">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="form-control">
                                        <label className="label-text text-xs font-bold mb-1">Brand</label>
                                        <input type="text" className="input input-bordered input-sm font-bold bg-[var(--bg-surface)] text-[var(--text-main)]" value={editForm.brand} onChange={e => setEditForm({ ...editForm, brand: e.target.value })} />
                                    </div>
                                    <div className="form-control">
                                        <label className="label-text text-xs font-bold mb-1">Model</label>
                                        <input type="text" className="input input-bordered input-sm font-bold bg-[var(--bg-surface)] text-[var(--text-main)]" value={editForm.model} onChange={e => setEditForm({ ...editForm, model: e.target.value })} />
                                    </div>
                                    <div className="form-control col-span-2">
                                        <label className="label-text text-xs font-bold mb-1">Serial Number</label>
                                        <input type="text" className="input input-bordered input-sm font-mono bg-[var(--bg-surface)] text-[var(--text-main)]" value={editForm.serial_number || ''} onChange={e => setEditForm({ ...editForm, serial_number: e.target.value })} />
                                    </div>
                                </div>
                                <textarea className="textarea textarea-bordered w-full text-base bg-[var(--bg-surface)] text-[var(--text-main)]" rows={4} value={editForm.description} onChange={e => setEditForm({ ...editForm, description: e.target.value })}></textarea>
                            </div>
                        ) : (
                            // VIEW MODE
                            <>
                                <div className="bg-[var(--bg-subtle)] p-5 rounded-xl border border-[var(--border-color)] text-[var(--text-main)] whitespace-pre-wrap font-medium leading-relaxed">
                                    {ticket.description}
                                </div>

                                {isStaff && (
                                    <div className="mt-6">
                                        <label className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${ticket.is_backordered ? 'border-red-500 bg-red-50 dark:bg-red-900/20' : 'border-[var(--border-color)] hover:bg-[var(--bg-subtle)]'}`}>
                                            <input type="checkbox" className="checkbox checkbox-error" checked={ticket.is_backordered} onChange={(e) => toggleBackorder(e.target.checked)} />
                                            <span className={`font-bold ${ticket.is_backordered ? 'text-red-600 dark:text-red-400' : 'text-[var(--text-muted)]'}`}>
                                                {ticket.is_backordered ? 'Currently Waiting on Parts' : 'Mark as Waiting on Parts'}
                                            </span>
                                            {ticket.is_backordered && <AlertTriangle className="text-red-500 ml-auto" />}
                                        </label>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>

                {/* CHAT INTERFACE */}
                <div className="rounded-2xl shadow-xl flex flex-col h-[600px] overflow-hidden border border-[var(--border-color)] bg-[var(--bg-surface)]">
                    {isStaff ? (
                        <div role="tablist" className="tabs tabs-lifted bg-[var(--bg-subtle)] p-2">
                            <a role="tab" className={`tab font-bold transition-all flex-1 ${activeTab === 'internal' ? 'tab-active bg-[var(--bg-surface)] text-yellow-600 border-t-2 border-yellow-500' : 'text-slate-400'}`} onClick={() => setActiveTab('internal')}>
                                <Lock size={14} className="mr-2" /> Notes
                            </a>
                            <a role="tab" className={`tab font-bold transition-all flex-1 ${activeTab === 'public' ? 'tab-active bg-[var(--bg-surface)] text-primary border-t-2 border-primary' : 'text-slate-400'}`} onClick={() => setActiveTab('public')}>
                                <Globe size={14} className="mr-2" /> Chat
                            </a>
                        </div>
                    ) : (
                        <div className="p-4 bg-primary text-white font-bold flex items-center gap-2 shadow-md">
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
                            if (msg.is_internal) {
                                bubbleClass = 'bg-yellow-100 text-yellow-900 border border-yellow-200';
                            } else if (isCustomer) {
                                bubbleClass = 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white border border-slate-200 dark:border-slate-600';
                            } else {
                                bubbleClass = 'bg-indigo-600 text-white';
                            }

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

                    <form onSubmit={sendMessage} className="p-4 bg-[var(--bg-surface)] border-t border-[var(--border-color)]">
                        <div className="flex gap-2 items-end">
                            <textarea
                                ref={inputRef}
                                rows={1}
                                placeholder={activeTab === 'internal' ? "Private note... (Shift+Enter for new line)" : "Message... (Shift+Enter for new line)"}
                                className={`textarea textarea-bordered w-full resize-none overflow-hidden min-h-[3rem] text-base py-3 leading-normal
                            bg-[var(--bg-subtle)] focus:bg-[var(--bg-surface)] transition-all text-[var(--text-main)]
                            ${activeTab === 'internal' ? 'focus:border-yellow-500' : 'focus:border-primary'}`}
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        sendMessage(e);
                                    }
                                }}
                                disabled={isSending}
                            />

                            <button
                                type="submit"
                                className={`btn btn-square shadow-sm h-12 w-12 flex-shrink-0 ${activeTab === 'internal' ? 'btn-warning text-white' : 'btn-primary text-white'}`}
                                disabled={isSending || !newMessage.trim()}
                            >
                                {isSending ? <span className="loading loading-spinner loading-xs"></span> : <Send size={20} />}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}