import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../context/ToastProvider';
import { formatPhoneNumber } from '../utils';
import { format } from 'date-fns';
import Navbar from '../components/Navbar';
import {
    MessageSquare, Send, ArrowLeft, Phone, User,
    Wrench, Clock, Search, CheckCircle, Hash,
    Mail, UserPlus, Link as LinkIcon
} from 'lucide-react';

const playDing = () => {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();
        osc.connect(gainNode);
        gainNode.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
        osc.start();
        gainNode.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + 0.5);
        osc.stop(ctx.currentTime + 0.5);
    } catch (e) {
        console.error("Audio play failed", e);
    }
};

export default function Messages() {
    const navigate = useNavigate();
    const { addToast } = useToast();

    const [contacts, setContacts] = useState([]);
    const [selectedPhone, setSelectedPhone] = useState(null);
    const [messages, setMessages] = useState([]);
    const [activeTickets, setActiveTickets] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [shopSettings, setShopSettings] = useState(null);

    const chatEndRef = useRef(null);
    const prevUnreadCount = useRef(0);

    useEffect(() => {
        fetchSettings();
        fetchContacts();
        const interval = setInterval(() => {
            fetchContacts(false);
            if (selectedPhone) fetchThread(selectedPhone, false);
        }, 5000);

        return () => clearInterval(interval);
    }, [selectedPhone]);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const fetchSettings = async () => {
        const { data } = await supabase.from('shop_settings').select('*').eq('id', 1).single();
        if (data) setShopSettings(data);
    };

    const fetchContacts = async (showLoading = true) => {
        if (showLoading) setLoading(true);
        const { data, error } = await supabase
            .from('global_sms')
            .select('*')
            .order('created_at', { ascending: false });

        if (!error && data) {
            const uniqueContacts = {};
            let currentUnreadCount = 0;

            data.forEach(msg => {
                if (!uniqueContacts[msg.phone_number]) {
                    const isRead = msg.is_read || msg.direction === 'outbound';
                    if (!isRead) currentUnreadCount++;

                    uniqueContacts[msg.phone_number] = {
                        phone: msg.phone_number,
                        latestMessage: msg.message_text,
                        timestamp: msg.created_at,
                        isRead: isRead,
                        name: msg.customer_name || null
                    };
                }
            });

            if (currentUnreadCount > prevUnreadCount.current && !showLoading) {
                playDing();
            }
            prevUnreadCount.current = currentUnreadCount;

            const phones = Object.keys(uniqueContacts);
            if (phones.length > 0) {
                const { data: ticketData } = await supabase
                    .from('tickets')
                    .select('phone, customer_name')
                    .in('phone', phones);

                if (ticketData) {
                    ticketData.forEach(t => {
                        if (t.customer_name && uniqueContacts[t.phone]) {
                            uniqueContacts[t.phone].name = t.customer_name;
                        }
                    });
                }
            }

            setContacts(Object.values(uniqueContacts));
        }
        if (showLoading) setLoading(false);
    };

    const fetchThread = async (phone, markRead = true) => {
        const { data: thread } = await supabase
            .from('global_sms')
            .select('*')
            .eq('phone_number', phone)
            .order('created_at', { ascending: true });

        setMessages(thread || []);

        const { data: tickets } = await supabase
            .from('tickets')
            .select('id, brand, model, status')
            .eq('phone', phone)
            .neq('status', 'completed');

        setActiveTickets(tickets || []);

        if (markRead) {
            await supabase.from('global_sms').update({ is_read: true }).eq('phone_number', phone).eq('direction', 'inbound');
            setContacts(prev => prev.map(c => c.phone === phone ? { ...c, isRead: true } : c));
            prevUnreadCount.current = Math.max(0, prevUnreadCount.current - 1);
        }
    };

    const handleSelectContact = (phone) => {
        setSelectedPhone(phone);
        fetchThread(phone);
    };

    const handleMarkUnread = async () => {
        if (!selectedPhone) return;
        await supabase.from('global_sms').update({ is_read: false }).eq('phone_number', selectedPhone).eq('direction', 'inbound');
        addToast("Conversation marked as unread", "info");
        setSelectedPhone(null);
        fetchContacts(false);
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || sending || !selectedPhone) return;
        setSending(true);

        const currentContact = contacts.find(c => c.phone === selectedPhone);

        const { error } = await supabase.from('global_sms').insert([{
            phone_number: selectedPhone,
            customer_name: currentContact?.name || null,
            message_text: newMessage.trim(),
            direction: 'outbound',
            status: 'pending',
            is_read: true
        }]);

        if (error) {
            addToast("Failed to queue message", "error");
        } else {
            setNewMessage('');
            fetchThread(selectedPhone, false);
            fetchContacts(false);
        }
        setSending(false);
    };

    const insertQuickReply = (text) => {
        setNewMessage(prev => prev + (prev ? ' ' : '') + text);
    };

    const insertStatusLink = (ticketId) => {
        const link = `${window.location.origin}/status/${ticketId}`;
        setNewMessage(prev => prev + (prev ? '\n\n' : '') + `Check your repair status here: ${link}`);
    };

    const handleStartIntake = () => {
        navigator.clipboard.writeText(formatPhoneNumber(selectedPhone));
        addToast("Number copied! Start a new ticket.", "success");
        navigate('/');
    };

    const filteredContacts = contacts.filter(c =>
        c.phone.includes(searchQuery) ||
        (c.name && c.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        c.latestMessage.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const activeContact = contacts.find(c => c.phone === selectedPhone);
    const displayHeaderName = activeContact?.name || (selectedPhone ? formatPhoneNumber(selectedPhone) : '');
    const displayHeaderSub = activeContact?.name ? formatPhoneNumber(selectedPhone) : 'SMS Direct Line';
    const isUnknownNumber = selectedPhone && !activeContact?.name && activeTickets.length === 0;

    return (
        <div className="min-h-screen bg-[var(--bg-subtle)] p-4 md:p-6 font-sans transition-colors duration-300 flex flex-col">

            {/* CALLING THE GLOBAL NAVBAR HERE */}
            <Navbar activeTab="messages" />

            {/* MAIN APP AREA */}
            <div className="flex-1 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-3xl shadow-xl overflow-hidden flex animate-fade-in relative min-h-[600px] h-[calc(100vh-140px)]">

                {/* LEFT SIDEBAR: CONTACT LIST */}
                <div className={`w-full md:w-80 lg:w-96 flex-none border-r border-[var(--border-color)] flex flex-col bg-[var(--bg-surface)] transition-transform duration-300 ${selectedPhone ? 'hidden md:flex' : 'flex'}`}>
                    <div className="p-5 border-b border-[var(--border-color)] shrink-0">
                        <h2 className="text-xl font-black text-[var(--text-main)] tracking-tight mb-4 flex items-center gap-2">
                            Conversations {contacts.filter(c => !c.isRead).length > 0 && <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full shadow-sm animate-pulse">{contacts.filter(c => !c.isRead).length} New</span>}
                        </h2>
                        <div className="relative group">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within:text-indigo-500 transition-colors" size={16} />
                            <input
                                type="text"
                                placeholder="Search messages or name..."
                                className="input input-sm h-10 w-full pl-10 bg-[var(--bg-subtle)] focus:bg-[var(--bg-surface)] text-[var(--text-main)] border-[var(--border-color)] focus:border-indigo-500 transition-all font-medium rounded-xl"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-1">
                        {loading && contacts.length === 0 ? (
                            <div className="flex justify-center p-10"><span className="loading loading-spinner text-indigo-500"></span></div>
                        ) : filteredContacts.length === 0 ? (
                            <div className="text-center p-8 text-[var(--text-muted)] text-sm font-bold">No conversations found.</div>
                        ) : (
                            filteredContacts.map((contact) => (
                                <div
                                    key={contact.phone}
                                    onClick={() => handleSelectContact(contact.phone)}
                                    className={`p-4 rounded-xl cursor-pointer transition-all border ${selectedPhone === contact.phone ? 'bg-indigo-50 border-indigo-200 dark:bg-indigo-900/20 dark:border-indigo-800' : 'bg-[var(--bg-surface)] border-transparent hover:bg-[var(--bg-subtle)] hover:border-[var(--border-color)]'}`}
                                >
                                    <div className="flex justify-between items-start mb-1">
                                        <span className={`font-black flex items-center gap-1.5 truncate pr-2 ${!contact.isRead ? 'text-[var(--text-main)]' : 'text-[var(--text-muted)]'}`}>
                                            <User size={12} className={!contact.isRead ? 'text-indigo-500 flex-none' : 'flex-none'} />
                                            <span className="truncate">{contact.name || formatPhoneNumber(contact.phone)}</span>
                                        </span>
                                        <span className="text-[10px] font-bold text-[var(--text-muted)] opacity-80 flex-none">{format(new Date(contact.timestamp), 'MMM d, h:mm a')}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <p className={`text-sm truncate flex-1 ${!contact.isRead ? 'text-[var(--text-main)] font-black' : 'text-[var(--text-muted)] font-medium'}`}>
                                            {contact.latestMessage}
                                        </p>
                                        {!contact.isRead && <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 shadow-sm flex-none"></div>}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* RIGHT AREA: CHAT THREAD */}
                <div className={`flex-1 flex flex-col bg-[var(--bg-subtle)] relative ${!selectedPhone ? 'hidden md:flex' : 'flex'}`}>
                    {selectedPhone ? (
                        <>
                            {/* Thread Header */}
                            <div className="p-4 md:p-5 bg-[var(--bg-surface)] border-b border-[var(--border-color)] shadow-sm shrink-0 flex justify-between items-center z-10">
                                <div className="flex items-center gap-3">
                                    <button onClick={() => setSelectedPhone(null)} className="md:hidden btn btn-sm btn-circle btn-ghost text-[var(--text-muted)]">
                                        <ArrowLeft size={20} />
                                    </button>
                                    <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-inner font-black text-sm uppercase">
                                        {displayHeaderName.charAt(0)}
                                    </div>
                                    <div>
                                        <h3 className="font-black text-lg text-[var(--text-main)] tracking-tight leading-none mb-1">
                                            {displayHeaderName}
                                        </h3>
                                        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">
                                            <span>{displayHeaderSub}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    <button onClick={handleMarkUnread} className="hidden md:flex items-center gap-2 btn btn-sm btn-ghost text-[var(--text-muted)] hover:text-indigo-500 hover:bg-[var(--bg-subtle)] transition-colors">
                                        <Mail size={14} /> <span className="text-xs font-bold">Mark Unread</span>
                                    </button>

                                    {activeTickets.length > 0 && (
                                        <div className="hidden lg:flex items-center gap-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-3 py-1.5 rounded-lg shadow-sm cursor-help" title="Customer currently has active devices in the shop.">
                                            <Wrench size={14} className="text-amber-600 dark:text-amber-500" />
                                            <span className="text-[10px] font-black uppercase tracking-widest text-amber-700 dark:text-amber-400">{activeTickets.length} Active Repair{activeTickets.length > 1 ? 's' : ''}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Unknown Customer Banner */}
                            {isUnknownNumber && (
                                <div className="bg-indigo-50 dark:bg-indigo-900/20 border-b border-indigo-100 dark:border-indigo-800/50 p-3 px-5 flex justify-between items-center shadow-inner shrink-0 z-10">
                                    <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-400 text-sm font-bold">
                                        <UserPlus size={16} /> Unknown Customer
                                    </div>
                                    <button onClick={handleStartIntake} className="btn btn-sm bg-indigo-600 hover:bg-indigo-700 text-white border-none shadow-md shadow-indigo-500/20 text-xs">
                                        Create Ticket
                                    </button>
                                </div>
                            )}

                            {/* Ticket Context Banner */}
                            {activeTickets.length > 0 && (
                                <div className="bg-[var(--bg-surface)] border-b border-[var(--border-color)] p-3 px-5 flex items-center gap-4 overflow-x-auto custom-scrollbar shrink-0 shadow-inner z-10">
                                    <span className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] flex-none">Active Devices:</span>
                                    {activeTickets.map(t => (
                                        <button
                                            key={t.id}
                                            onClick={() => navigate(`/ticket/${t.id}`)}
                                            className="flex-none flex items-center gap-1.5 bg-[var(--bg-subtle)] hover:bg-indigo-50 dark:hover:bg-indigo-900/30 border border-[var(--border-color)] hover:border-indigo-300 px-2.5 py-1 rounded-md transition-all group"
                                        >
                                            <Hash size={12} className="text-[var(--text-muted)] group-hover:text-indigo-500" />
                                            <span className="text-xs font-bold text-[var(--text-main)] group-hover:text-indigo-600 dark:group-hover:text-indigo-400">{t.brand} {t.model}</span>
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* Chat Messages Area */}
                            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
                                {messages.map((msg, idx) => {
                                    const isOutbound = msg.direction === 'outbound';
                                    const showTime = idx === 0 || new Date(msg.created_at).getTime() - new Date(messages[idx - 1].created_at).getTime() > 1000 * 60 * 30;

                                    return (
                                        <div key={msg.id} className={`flex flex-col ${isOutbound ? 'items-end' : 'items-start'}`}>
                                            {showTime && <span className="text-[10px] font-bold text-[var(--text-muted)] mb-3 opacity-70 uppercase tracking-widest">{format(new Date(msg.created_at), 'MMM d, h:mm a')}</span>}
                                            <div className={`max-w-[85%] md:max-w-[70%] px-5 py-3 rounded-2xl text-[15px] font-medium leading-relaxed shadow-sm whitespace-pre-wrap break-words ${isOutbound ? 'bg-indigo-600 text-white rounded-tr-sm shadow-indigo-500/20' : 'bg-[var(--bg-surface)] text-[var(--text-main)] border border-[var(--border-color)] rounded-tl-sm'}`}>
                                                {msg.message_text}
                                            </div>
                                            {isOutbound && (
                                                <div className="flex items-center gap-1 mt-1 text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] opacity-80">
                                                    {msg.status === 'pending' ? <span className="flex items-center gap-1 text-amber-500"><Clock size={10} /> Queued to Send</span> : <span className="flex items-center gap-1 text-emerald-500"><CheckCircle size={10} /> Delivered</span>}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                                <div ref={chatEndRef}></div>
                            </div>

                            {/* Input Area */}
                            <div className="bg-[var(--bg-surface)] border-t border-[var(--border-color)] shrink-0 relative z-30 pb-safe">

                                <div className="px-4 pt-3 pb-2 flex flex-wrap gap-2">

                                    {activeTickets.length > 0 && (
                                        activeTickets.length === 1 ? (
                                            <button
                                                type="button"
                                                onClick={() => insertStatusLink(activeTickets[0].id)}
                                                className="flex-none px-4 py-1.5 rounded-full text-xs font-bold transition-all border shadow-sm bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 hover:border-indigo-300 flex items-center"
                                            >
                                                <LinkIcon size={12} className="mr-1.5" /> Link: {activeTickets[0].brand}
                                            </button>
                                        ) : (
                                            <div className="dropdown dropdown-top flex-none">
                                                <div tabIndex={0} role="button" className="px-4 py-1.5 rounded-full text-xs font-bold transition-all border shadow-sm bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 hover:border-indigo-300 flex items-center">
                                                    <LinkIcon size={12} className="mr-1.5" /> Insert Link...
                                                </div>
                                                <ul tabIndex={0} className="dropdown-content z-[100] menu p-2 shadow-2xl bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-xl w-52 mb-1 animate-pop">
                                                    <li className="menu-title text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] px-2 py-1">Select Device to Link</li>
                                                    {activeTickets.map(t => (
                                                        <li key={t.id}>
                                                            <button
                                                                onClick={(e) => {
                                                                    insertStatusLink(t.id);
                                                                    e.currentTarget.blur();
                                                                    document.activeElement.blur();
                                                                }}
                                                                className="text-xs font-bold text-[var(--text-main)] hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:text-indigo-600"
                                                            >
                                                                <Hash size={12} className="opacity-50 text-[var(--text-muted)]" /> {t.brand} {t.model}
                                                            </button>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )
                                    )}

                                    {shopSettings?.quick_replies?.map((reply, idx) => (
                                        <button
                                            key={idx}
                                            type="button"
                                            onClick={() => insertQuickReply(reply.text)}
                                            className="flex-none px-4 py-1.5 rounded-full text-xs font-bold transition-all border shadow-sm bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-200 dark:hover:border-indigo-800"
                                        >
                                            {reply.label}
                                        </button>
                                    ))}
                                </div>

                                <form onSubmit={handleSendMessage} className="p-4 pt-2">
                                    <div className="relative flex items-end gap-3 bg-[var(--bg-subtle)] p-2 rounded-2xl border border-[var(--border-color)] focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all shadow-inner">

                                        <textarea
                                            rows={2}
                                            placeholder={`Message ${displayHeaderName}...`}
                                            className="w-full resize-y overflow-y-auto min-h-[50px] max-h-[60vh] text-base p-2 bg-transparent text-[var(--text-main)] focus:outline-none placeholder:text-[var(--text-muted)] leading-relaxed custom-scrollbar border-none outline-none"
                                            value={newMessage}
                                            onChange={(e) => setNewMessage(e.target.value)}
                                            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(e); } }}
                                            disabled={sending}
                                        />

                                        <button
                                            type="submit"
                                            className={`btn btn-circle h-12 w-12 mb-1 flex-shrink-0 shadow-md border-0 ${(!newMessage.trim() || sending) ? 'bg-[var(--bg-surface)] text-[var(--text-muted)] border border-[var(--border-color)] opacity-50 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 hover:scale-105 transition-transform text-white shadow-indigo-500/30'}`}
                                            disabled={sending || !newMessage.trim()}
                                        >
                                            {sending ? <span className="loading loading-spinner loading-sm"></span> : <Send size={20} className="ml-1" />}
                                        </button>
                                    </div>
                                    <div className="text-center mt-2">
                                        <span className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] opacity-60">Messages send immediately via shop Android device</span>
                                    </div>
                                </form>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-[var(--text-muted)] opacity-60 p-6 text-center">
                            <MessageSquare size={64} className="mb-4 text-[var(--border-color)] opacity-50" />
                            <h2 className="text-xl font-black text-[var(--text-main)] mb-2">Global SMS Inbox</h2>
                            <p className="text-sm font-medium max-w-sm">Select a conversation from the sidebar to start texting directly with customers.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}