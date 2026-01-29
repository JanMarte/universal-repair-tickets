import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { ArrowLeft, Send, MessageSquare, Lock, Globe, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '../context/ToastProvider';

export default function TicketDetail() {
  const { id } = useParams(); const navigate = useNavigate(); const { addToast } = useToast();
  const [ticket, setTicket] = useState(null); const [messages, setMessages] = useState([]); 
  const [loading, setLoading] = useState(true); const [userRole, setUserRole] = useState('customer'); 
  const [newMessage, setNewMessage] = useState(''); const [activeTab, setActiveTab] = useState('public'); const [isSending, setIsSending] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => { fetchData(); }, [id]);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, activeTab]); 

  async function fetchData() {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
        setUserRole(profile?.role || 'customer');
        if (profile?.role === 'employee') setActiveTab('internal');
    }
    const { data: ticketData } = await supabase.from('tickets').select('*').eq('id', id).single(); setTicket(ticketData);
    const { data: msgData } = await supabase.from('ticket_messages').select('*').eq('ticket_id', id).order('created_at', { ascending: true }); setMessages(msgData || []);
    setLoading(false);
  }

  const sendMessage = async (e) => {
    e.preventDefault(); if (!newMessage.trim() || isSending) return; setIsSending(true);
    const isInternalNote = userRole === 'employee' ? (activeTab === 'internal') : false;
    const senderName = userRole === 'employee' ? 'Employee' : 'Customer';
    const { error } = await supabase.from('ticket_messages').insert([{ ticket_id: id, message_text: newMessage, is_internal: isInternalNote, sender_name: senderName }]);
    if (!error) { setNewMessage(''); const { data: msgs } = await supabase.from('ticket_messages').select('*').eq('ticket_id', id).order('created_at', { ascending: true }); setMessages(msgs); }
    setIsSending(false);
  };

  const updateStatus = async (newStatus) => { setTicket({ ...ticket, status: newStatus }); await supabase.from('tickets').update({ status: newStatus }).eq('id', id); addToast(`Status updated`, 'success'); };
  const toggleBackorder = async (checked) => { setTicket({ ...ticket, is_backordered: checked }); await supabase.from('tickets').update({ is_backordered: checked }).eq('id', id); if(checked) addToast("Marked as Backordered", 'error'); };
  const filteredMessages = messages.filter(msg => { if (userRole === 'customer' && msg.is_internal) return false; if (userRole === 'employee') { if (activeTab === 'internal') return msg.is_internal === true; if (activeTab === 'public') return msg.is_internal === false; } return true; });

  if (loading) return <div className="p-10 text-center"><span className="loading loading-spinner loading-lg text-primary"></span></div>;
  if (!ticket) return <div className="p-10 text-center text-xl font-bold dark:text-white">Ticket not found.</div>;
  const isEmployee = userRole === 'employee';

  return (
    <div className="min-h-screen p-6 font-sans">
      
      {/* HEADER - Uses CSS Variables */}
      <div className="rounded-2xl p-6 mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 animate-fade shadow-sm backdrop-blur-md bg-[var(--bg-surface)] border border-[var(--border-color)]">
        <div className="flex items-center gap-4">
            <button onClick={() => navigate(-1)} className="btn btn-circle btn-ghost hover:bg-[var(--bg-subtle)]">
                <ArrowLeft size={24} className="text-[var(--text-main)]"/>
            </button>
            <div>
                <h1 className="text-2xl font-black text-[var(--text-main)]">Ticket #{ticket.id}</h1>
                <p className="text-[var(--text-muted)] font-medium">{ticket.brand} {ticket.model}</p>
            </div>
        </div>
        <div className="flex gap-3 items-center">
            {isEmployee ? (
                <div className="form-control">
                    {/* Select automatically uses global styles from index.css */}
                    <select className="select select-bordered font-bold shadow-sm" value={ticket.status} onChange={(e) => updateStatus(e.target.value)}>
                        <option value="intake">Intake</option><option value="diagnosing">Diagnosing</option><option value="waiting_parts">Waiting on Parts</option><option value="repairing">Repairing</option><option value="ready_pickup">Ready for Pickup</option><option value="completed">Completed</option>
                    </select>
                </div>
            ) : ( <div className={`badge ${ticket.status === 'completed' ? 'badge-success' : 'badge-primary'} p-4 font-bold uppercase tracking-wide`}>{ticket.status.replace('_', ' ')}</div> )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade">
        <div className="lg:col-span-2 space-y-6">
            
            {/* INFO CARD - Uses .content-card class */}
            <div className="content-card">
                <h2 className="text-xs font-bold uppercase text-[var(--text-muted)] tracking-wider mb-4 border-b border-[var(--border-color)] pb-2">Customer Information</h2>
                <div className="flex justify-between items-center">
                    <div><p className="text-xl font-black text-[var(--text-main)]">{ticket.customer_name}</p><p className="text-lg text-[var(--text-muted)] font-mono">{ticket.phone}</p></div>
                    {isEmployee && ( <button className="btn btn-outline btn-sm text-[var(--text-main)]" onClick={() => ticket.customer_id && navigate(`/customer/${ticket.customer_id}`)} disabled={!ticket.customer_id} >History</button> )}
                </div>
            </div>
            
            {/* DETAILS CARD - Uses .content-card class */}
            <div className="content-card">
                <h2 className="text-xs font-bold uppercase text-[var(--text-muted)] tracking-wider mb-4 border-b border-[var(--border-color)] pb-2">Technical Issue</h2>
                {/* Description Box uses bg-subtle */}
                <div className="bg-[var(--bg-subtle)] p-4 rounded-xl border border-[var(--border-color)] text-[var(--text-main)] whitespace-pre-wrap font-medium leading-relaxed">{ticket.description}</div>
                {isEmployee && (
                    <div className="mt-6">
                        <label className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${ticket.is_backordered ? 'border-red-500 bg-red-50 dark:bg-red-900/20' : 'border-[var(--border-color)] hover:bg-[var(--bg-subtle)] hover:border-slate-300'}`}>
                            <input type="checkbox" className="checkbox checkbox-error" checked={ticket.is_backordered} onChange={(e) => toggleBackorder(e.target.checked)}/>
                            <span className={`font-bold ${ticket.is_backordered ? 'text-red-600 dark:text-red-400' : 'text-[var(--text-muted)]'}`}>{ticket.is_backordered ? 'Currently Waiting on Parts' : 'Mark as Waiting on Parts'}</span>
                            {ticket.is_backordered && <AlertTriangle className="text-red-500 ml-auto"/>}
                        </label>
                    </div>
                )}
            </div>
        </div>

        {/* CHAT CARD */}
        <div className="rounded-2xl shadow-xl flex flex-col h-[600px] overflow-hidden border border-[var(--border-color)] bg-[var(--bg-surface)]">
            {isEmployee ? (
                <div role="tablist" className="tabs tabs-lifted bg-[var(--bg-subtle)] p-2">
                    {/* Tabs use dynamic active states based on bg-surface */}
                    <a role="tab" className={`tab font-bold transition-all flex-1 ${activeTab === 'internal' ? 'tab-active bg-[var(--bg-surface)] text-yellow-600 border-t-2 border-yellow-500' : 'text-slate-400'}`} onClick={() => setActiveTab('internal')}><Lock size={14} className="mr-2"/> Notes</a>
                    <a role="tab" className={`tab font-bold transition-all flex-1 ${activeTab === 'public' ? 'tab-active bg-[var(--bg-surface)] text-primary border-t-2 border-primary' : 'text-slate-400'}`} onClick={() => setActiveTab('public')}><Globe size={14} className="mr-2"/> Chat</a>
                </div>
            ) : ( <div className="p-4 bg-primary text-white font-bold flex items-center gap-2"><Globe size={18}/> Support Chat</div> )}

            {/* Chat Body - Uses bg-subtle for contrast against white messages */}
            <div className={`flex-1 overflow-y-auto p-4 space-y-4 ${activeTab === 'internal' ? 'bg-yellow-50/50 dark:bg-yellow-900/10' : 'bg-[var(--bg-subtle)]'}`}>
                {filteredMessages.length === 0 && <div className="flex flex-col items-center justify-center h-full text-slate-300 space-y-2"><MessageSquare size={48} /><span className="text-sm font-bold">No messages yet.</span></div>}
                {filteredMessages.map((msg) => (
                    <div key={msg.id} className={`chat ${msg.sender_name === 'Customer' ? 'chat-start' : 'chat-end'}`}>
                        <div className="chat-header text-xs text-slate-400 font-bold mb-1">{msg.sender_name} • {format(new Date(msg.created_at), 'h:mm a')}</div>
                        <div className={`chat-bubble shadow-sm font-medium ${msg.is_internal ? 'chat-bubble-warning text-yellow-900' : 'chat-bubble-primary text-white'}`}>{msg.message_text}</div>
                    </div>
                ))}
                <div ref={chatEndRef}></div>
            </div>

            {/* Chat Input - Uses bg-surface */}
            <form onSubmit={sendMessage} className="p-4 bg-[var(--bg-surface)] border-t border-[var(--border-color)]">
                <div className="flex gap-2">
                    <input type="text" placeholder={activeTab === 'internal' ? "Private note..." : "Message..."} className={`input input-bordered w-full bg-[var(--bg-subtle)] focus:bg-[var(--bg-surface)] transition-all ${activeTab === 'internal' ? 'focus:border-yellow-500' : 'focus:border-primary'}`} value={newMessage} onChange={(e) => setNewMessage(e.target.value)} disabled={isSending}/>
                    <button type="submit" className={`btn btn-square ${activeTab === 'internal' ? 'btn-warning text-white' : 'btn-primary text-white'}`} disabled={isSending}>{isSending ? <span className="loading loading-spinner loading-xs"></span> : <Send size={20} />}</button>
                </div>
            </form>
        </div>
      </div>
    </div>
  );
}