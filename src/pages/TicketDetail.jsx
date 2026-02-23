import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useReactToPrint } from 'react-to-print';
import { format } from 'date-fns';
import {
    ArrowLeft, Camera, Image as ImageIcon, Loader2, Send, MessageSquare, Lock, Globe,
    AlertTriangle, Save, X, Edit3, Printer, Calendar, User, Phone, Hash, Wrench, AlertCircle, FileText, History, Moon, Sun, QrCode, ShieldAlert, Laptop, PlusCircle, LockKeyhole, DollarSign, Truck,
    Trash2, Tag, ClipboardList, Fingerprint, Cpu, Share2, ChevronDown, ChevronUp, ZoomIn, ZoomOut, Maximize2,
    CheckCircle, XCircle, Clock
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
    const [photoToDelete, setPhotoToDelete] = useState(null);

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

    // --- PHOTO UPLOAD LOGIC ---
    const [images, setImages] = useState([]);
    const [uploading, setUploading] = useState(false);

    const fetchImages = async () => {
        const { data, error } = await supabase.storage.from('ticket-attachments').list(`${id}/`, {
            limit: 20,
            offset: 0,
            sortBy: { column: 'created_at', order: 'desc' },
        });

        if (!error && data) {
            const loadedImages = data.map(file => {
                const { data: { publicUrl } } = supabase.storage.from('ticket-attachments').getPublicUrl(`${id}/${file.name}`);
                return { name: file.name, url: publicUrl };
            });
            setImages(loadedImages);
        }
    };

    useEffect(() => {
        fetchImages();
    }, [id]);

    const handleImageUpload = async (event) => {
        try {
            setUploading(true);
            if (!event.target.files || event.target.files.length === 0) return;

            const file = event.target.files[0];
            const fileExt = file.name.split('.').pop();
            const fileName = `${Date.now()}.${fileExt}`;
            const filePath = `${id}/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('ticket-attachments')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            addToast('Photo saved successfully', 'success');
            fetchImages();
        } catch (error) {
            addToast('Upload failed: ' + error.message, 'error');
        } finally {
            setUploading(false);
        }
    };

    const promptDeletePhoto = (imageName, e) => {
        e.stopPropagation();
        setPhotoToDelete(imageName);
    };

    const confirmDeletePhoto = async () => {
        if (!photoToDelete) return;
        try {
            setUploading(true);
            const { error } = await supabase.storage.from('ticket-attachments').remove([`${id}/${photoToDelete}`]);
            if (error) throw error;

            addToast("Photo deleted", "success");
            setImages(prev => prev.filter(img => img.name !== photoToDelete));
            setPhotoToDelete(null);
        } catch (error) {
            addToast("Delete failed: " + error.message, "error");
        } finally {
            setUploading(false);
        }
    };

    // --- LIGHTBOX LOGIC ---
    const [isPhotosCollapsed, setIsPhotosCollapsed] = useState(true);
    const [lightboxImage, setLightboxImage] = useState(null);
    const [zoomLevel, setZoomLevel] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

    const openLightbox = (img) => {
        setLightboxImage(img);
        setZoomLevel(1);
        setPan({ x: 0, y: 0 });
    };

    const closeLightbox = () => {
        setLightboxImage(null);
        setZoomLevel(1);
        setPan({ x: 0, y: 0 });
    };

    const handleZoom = (direction) => {
        setZoomLevel(prev => {
            let newZoom = prev;
            if (direction === 'in') newZoom = Math.min(prev + 0.5, 3);
            if (direction === 'out') newZoom = Math.max(prev - 0.5, 1);
            if (newZoom === 1) setPan({ x: 0, y: 0 });
            return newZoom;
        });
    };

    const handleMouseDown = (e) => {
        if (zoomLevel > 1) {
            e.preventDefault();
            setIsDragging(true);
            setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
        }
    };

    const handleMouseMove = (e) => {
        if (isDragging && zoomLevel > 1) {
            e.preventDefault();
            setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
        }
    };

    const handleMouseUp = () => setIsDragging(false);

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

        // --- SELF-HEALING DATA FIX FOR OLD TICKETS ---
        if (ticketData && ticketData.customer_id && (!ticketData.customer_name || !ticketData.phone)) {
            const { data: customerData } = await supabase
                .from('customers')
                .select('full_name, phone')
                .eq('id', ticketData.customer_id)
                .maybeSingle();

            if (customerData) {
                // Fix the local state
                ticketData.customer_name = ticketData.customer_name || customerData.full_name;
                ticketData.phone = ticketData.phone || customerData.phone;

                // Silently update the database so it's permanently fixed!
                supabase.from('tickets')
                    .update({ customer_name: ticketData.customer_name, phone: ticketData.phone })
                    .eq('id', id)
                    .then(); // fire and forget
            }
        }
        // ---------------------------------------------

        setTicket(ticketData);
        setEditForm({
            brand: ticketData?.brand,
            model: ticketData?.model,
            serial_number: ticketData?.serial_number,
            description: ticketData?.description
        });

        const { data: msgData } = await supabase.from('ticket_messages').select('*').eq('ticket_id', id).order('created_at', { ascending: true });
        setMessages(msgData || []);

        const { data: logs } = await supabase.from('audit_logs').select('*').eq('ticket_id', id).order('created_at', { ascending: false });
        setAuditLogs(logs || []);

        setLoading(false);
        setTimeout(() => { isLoadedRef.current = true; }, 1000);
    }

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

    const handleEstimateLog = (action, details) => { logAudit(action, details); };
    const promptDeleteLog = (log, e) => { e.stopPropagation(); setLogToDelete(log); };

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
        let senderName = 'Customer';
        if (isStaff) {
            senderName = currentUser?.full_name || currentUser?.email?.split('@')[0] || 'Staff';
        } else if (ticket?.customer_name) {
            senderName = ticket.customer_name;
        }

        const { error } = await supabase.from('ticket_messages').insert([{
            ticket_id: id, message_text: newMessage, is_internal: isInternalNote, sender_name: senderName
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

    const updateEstimateStatus = async (newStatus) => {
        setTicket({ ...ticket, estimate_status: newStatus });
        await supabase.from('tickets').update({ estimate_status: newStatus }).eq('id', id);
        addToast(`Estimate marked as ${newStatus.toUpperCase()}`, 'success');
        logAudit('ESTIMATE STATUS', `Changed estimate status to ${newStatus}`);
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
            case 'intake': return 'bg-blue-500 text-white shadow-blue-500/30';
            case 'diagnosing': return 'bg-purple-500 text-white shadow-purple-500/30';
            case 'waiting_parts': return 'bg-orange-500 text-white shadow-orange-500/30';
            case 'repairing': return 'bg-amber-500 text-white shadow-amber-500/30';
            case 'ready_pickup': return 'bg-emerald-500 text-white shadow-emerald-500/30';
            case 'completed': return 'bg-slate-500 text-white shadow-slate-500/30';
            default: return 'bg-indigo-500 text-white shadow-indigo-500/30';
        }
    };

    const getLogVisuals = (action) => {
        if (action.includes('STATUS') || action.includes('REOPEN')) return { bg: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300', icon: <ActivityIcon size={14} /> };
        if (action.includes('ESTIMATE')) return { bg: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300', icon: <DollarSign size={14} /> };
        if (action.includes('ASSIGN')) return { bg: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300', icon: <User size={14} /> };
        if (action.includes('PART')) return { bg: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300', icon: <Truck size={14} /> };
        if (action.includes('DELETE') || action.includes('REMOVE')) return { bg: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300', icon: <AlertCircle size={14} /> };
        return { bg: 'bg-[var(--bg-subtle)] text-[var(--text-muted)] border border-[var(--border-color)]', icon: <FileText size={14} /> };
    };

    const QUICK_REPLIES = [
        { label: "Parts Ordered", text: "Update: We have ordered the necessary parts for your repair. We will notify you when they arrive." },
        { label: "Diagnosing", text: "We have started diagnosing your device. We will update you shortly with an estimate." },
        { label: "Ready", text: "Great news! Your device is ready for pickup. You can come by during our business hours." },
        { label: "Delay", text: "We hit a small snag and need a bit more time to ensure the quality of the repair. Thanks for your patience." }
    ];

    const renderChatInterface = () => (
        <div className="flex flex-col h-full bg-[var(--bg-surface)] relative">
            {isStaff ? (
                <div className="p-4 border-b border-[var(--border-color)] bg-[var(--bg-surface)] shrink-0">
                    <div className="flex bg-[var(--bg-subtle)] p-1 rounded-xl shadow-inner border border-[var(--border-color)]">
                        <button
                            onClick={() => setActiveTab('internal')}
                            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'internal' ? 'bg-[var(--bg-surface)] text-amber-600 shadow-sm ring-1 ring-black/5 dark:ring-white/5' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}
                        >
                            <Lock size={12} /> Internal Notes
                        </button>
                        <button
                            onClick={() => setActiveTab('public')}
                            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'public' ? 'bg-[var(--bg-surface)] text-indigo-600 shadow-sm ring-1 ring-black/5 dark:ring-white/5' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}
                        >
                            <Globe size={12} /> Customer Chat
                        </button>
                    </div>
                </div>
            ) : (
                <div className="p-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold flex items-center justify-center gap-2 shadow-md flex-none">
                    <MessageSquare size={18} /> Direct Support Line
                </div>
            )}

            <div className={`flex-1 overflow-y-auto p-4 space-y-6 ${activeTab === 'internal' ? 'bg-amber-50/30 dark:bg-amber-900/5' : 'bg-[var(--bg-subtle)]'}`}>
                {filteredMessages.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center opacity-40 text-[var(--text-muted)]">
                        {activeTab === 'internal' ? (
                            <><Lock size={48} className="mb-2" /><p className="text-sm font-bold">No internal notes yet</p></>
                        ) : (
                            <><MessageSquare size={48} className="mb-2" /><p className="text-sm font-bold">Start the conversation</p></>
                        )}
                    </div>
                )}

                {filteredMessages.map((msg) => {
                    const isMe = msg.sender_name === (currentUser?.full_name || currentUser?.email?.split('@')[0] || 'Staff');
                    const isInternal = msg.is_internal;
                    const senderNameStr = msg.sender_name || 'Unknown';
                    const initials = senderNameStr.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || '?';

                    return (
                        <div key={msg.id} className={`flex gap-3 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                            <div className={`flex-none w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black shadow-sm ring-2 ring-white dark:ring-[var(--bg-surface)] ${isInternal ? 'bg-amber-200 text-amber-800' : (isMe ? 'bg-indigo-600 text-white' : 'bg-[var(--bg-surface)] text-[var(--text-main)] border border-[var(--border-color)]')}`}>
                                {initials}
                            </div>
                            <div className={`flex flex-col max-w-[80%] ${isMe ? 'items-end' : 'items-start'}`}>
                                <div className="flex items-center gap-2 mb-1 px-1">
                                    <span className="text-[10px] font-bold text-[var(--text-muted)] opacity-80">{senderNameStr}</span>
                                    <span className="text-[9px] text-[var(--text-muted)] opacity-50">{format(new Date(msg.created_at), 'h:mm a')}</span>
                                </div>
                                <div className={`px-4 py-2.5 rounded-2xl text-sm font-medium shadow-sm whitespace-pre-wrap leading-relaxed ${isInternal
                                    ? 'bg-amber-100 text-amber-900 border border-amber-200 rounded-tl-none'
                                    : (isMe
                                        ? 'bg-gradient-to-br from-indigo-600 to-indigo-700 text-white rounded-tr-none'
                                        : 'bg-[var(--bg-surface)] text-[var(--text-main)] border border-[var(--border-color)] rounded-tl-none')
                                    }`}>
                                    {isInternal && <Lock size={10} className="inline-block mr-1.5 opacity-50 mb-0.5" />}
                                    {msg.message_text}
                                </div>
                            </div>
                        </div>
                    );
                })}
                <div ref={chatEndRef}></div>
            </div>

            {isClosed ? (
                <div className="p-6 bg-[var(--bg-subtle)] border-t border-[var(--border-color)] flex flex-col items-center justify-center text-center shrink-0 shadow-inner">
                    <div className="bg-[var(--bg-surface)] p-3 rounded-full mb-2 border border-[var(--border-color)] shadow-sm">
                        <LockKeyhole size={24} className="text-[var(--text-muted)]" />
                    </div>
                    <h3 className="font-black text-[10px] uppercase tracking-widest text-[var(--text-muted)]">Ticket Archived</h3>
                </div>
            ) : (
                <form onSubmit={sendMessage} className="p-3 bg-[var(--bg-surface)] border-t border-[var(--border-color)] flex-none pb-safe">
                    {isStaff && !newMessage && (
                        <div className="flex gap-2 mb-2 overflow-x-auto pb-1 no-scrollbar px-1">
                            {QUICK_REPLIES.map((reply, index) => (
                                <button
                                    key={index}
                                    type="button"
                                    onClick={() => setNewMessage(reply.text)}
                                    className="flex-none btn btn-xs btn-ghost bg-[var(--bg-subtle)] border border-[var(--border-color)] text-[var(--text-muted)] hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-200 transition-all font-bold whitespace-nowrap shadow-sm"
                                >
                                    {reply.label}
                                </button>
                            ))}
                        </div>
                    )}
                    <div className="relative flex items-end gap-2 bg-[var(--bg-subtle)] p-1.5 rounded-xl border border-[var(--border-color)] focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500/20 transition-all shadow-inner">
                        <textarea
                            ref={inputRef}
                            rows={1}
                            placeholder={activeTab === 'internal' ? "Add a private note to the team..." : "Type a message to customer..."}
                            className="textarea textarea-ghost w-full resize-none overflow-hidden min-h-[44px] max-h-32 text-sm py-3 bg-transparent text-[var(--text-main)] focus:outline-none placeholder:text-[var(--text-muted)]"
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(e); } }}
                            disabled={isSending}
                        />
                        <button
                            type="submit"
                            className={`btn btn-sm btn-circle h-10 w-10 mb-0.5 flex-shrink-0 shadow-md border-0 ${activeTab === 'internal'
                                ? 'bg-amber-500 hover:bg-amber-600 text-white'
                                : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                                } ${(!newMessage.trim() || isSending) ? 'opacity-50 cursor-not-allowed' : 'opacity-100'}`}
                            disabled={isSending || !newMessage.trim()}
                        >
                            {isSending ? <span className="loading loading-spinner loading-xs"></span> : <Send size={18} />}
                        </button>
                    </div>
                </form>
            )}
        </div>
    );

    if (loading) return <div className="flex justify-center mt-20"><span className="loading loading-spinner loading-lg text-indigo-500"></span></div>;
    if (!ticket) return <div className="p-10 text-center font-bold text-[var(--text-muted)]">Ticket not found.</div>;

    return (
        <div className="min-h-screen p-4 md:p-6 font-sans pb-32 lg:pb-24 transition-colors duration-300">
            {/* NAVBAR */}
            <div className="navbar rounded-2xl mb-6 sticky top-2 z-40 flex justify-between shadow-sm backdrop-blur-md bg-[var(--bg-surface)] border border-[var(--border-color)] px-3 py-2 animate-fade relative">

                <div className="flex items-center z-10">
                    <button onClick={() => navigate(-1)} className="btn btn-sm btn-ghost gap-2 px-3 text-[var(--text-muted)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-main)] transition-all rounded-lg group">
                        <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform duration-300" />
                        <span className="hidden md:inline font-bold">Dashboard</span>
                    </button>
                </div>

                {/* --- CENTER BRANDING --- */}
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 hidden lg:flex items-center gap-2 pointer-events-none">
                    <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
                        <Wrench size={14} fill="currentColor" />
                    </div>
                    <span className="font-black text-[var(--text-main)] text-lg tracking-tight">University <span className="text-indigo-500">Vac & Sew</span></span>
                </div>

                <div className="flex-none flex items-center gap-1 sm:gap-2 z-10">
                    <button onClick={() => { navigator.clipboard.writeText(ticket.id); addToast('ID copied', 'success'); }} className="hidden sm:flex items-center gap-2 bg-[var(--bg-subtle)] hover:bg-[var(--bg-surface)] px-3 py-1.5 rounded-lg border border-[var(--border-color)] shadow-inner transition-all group cursor-pointer mr-2" title="Click to copy ID">
                        <Hash size={12} className="text-[var(--text-muted)] group-hover:text-indigo-500 transition-colors" />
                        <span className="font-mono text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">ID: {ticket.id}</span>
                    </button>
                    <button className="btn btn-sm btn-circle btn-ghost text-[var(--text-muted)] hover:text-indigo-500 hover:bg-[var(--bg-subtle)] transition-colors" onClick={() => setIsScanning(true)} title="Scan QR Code"><QrCode size={18} /></button>
                    <button className="btn btn-sm btn-circle btn-ghost text-[var(--text-muted)] hover:text-amber-500 hover:bg-[var(--bg-subtle)] transition-colors" onClick={toggleTheme} title="Toggle Light/Dark Mode">{theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}</button>
                </div>
            </div>

            {/* HEADER CARD */}
            <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl p-6 md:p-8 shadow-sm mb-6 relative z-30 animate-fade-in-up">
                <div className="absolute top-0 left-0 right-0 h-1.5 rounded-t-2xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-80"></div>

                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                    <div className="flex-1 min-w-0 w-full">
                        <div className="flex items-center gap-2 mb-3 flex-wrap">
                            {ticket.serial_number && (
                                <span className="flex items-center gap-1.5 bg-[var(--bg-subtle)] border border-[var(--border-color)] shadow-inner text-[var(--text-main)] px-3 py-1.5 rounded-md font-mono text-[10px] uppercase font-black tracking-widest">
                                    <Hash size={12} className="opacity-50" />{ticket.serial_number}
                                </span>
                            )}
                            <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] flex items-center gap-1 bg-[var(--bg-subtle)] border border-[var(--border-color)] shadow-inner px-3 py-1.5 rounded-md">
                                <Calendar size={12} /> {format(new Date(ticket.created_at), 'MMM dd')}
                            </span>

                            {ticket.estimate_status === 'approved' && (
                                <span className="badge border-none bg-emerald-500 text-white shadow-md shadow-emerald-500/30 font-black uppercase tracking-widest text-[9px] px-3 py-2.5 gap-1 ml-1">
                                    <CheckCircle size={12} strokeWidth={3} /> Approved
                                </span>
                            )}
                            {ticket.estimate_status === 'declined' && (
                                <span className="badge border-none bg-red-500 text-white shadow-md shadow-red-500/30 font-black uppercase tracking-widest text-[9px] px-3 py-2.5 gap-1 ml-1">
                                    <XCircle size={12} strokeWidth={3} /> Declined
                                </span>
                            )}
                            {ticket.estimate_status === 'sent' && (
                                <span className="badge border-none bg-amber-500 text-white shadow-md shadow-amber-500/30 font-black uppercase tracking-widest text-[9px] px-3 py-2.5 gap-1 ml-1">
                                    <Clock size={12} strokeWidth={3} /> Pending
                                </span>
                            )}
                        </div>
                        <h1 className="text-3xl md:text-4xl font-black text-[var(--text-main)] tracking-tight mb-3 leading-tight">{ticket.brand} <span className="text-indigo-500">{ticket.model}</span></h1>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm font-medium text-[var(--text-muted)]">

                            {/* FALLBACKS ADDED HERE FOR MISSING CUSTOMER INFO */}
                            <div className="flex items-center gap-2">
                                <User size={16} /> {ticket.customer_name || <span className="italic opacity-50 text-[10px] font-black uppercase tracking-widest">No Name Provided</span>}
                            </div>
                            <div className="flex items-center gap-2">
                                <Phone size={16} /> {ticket.phone ? formatPhoneNumber(ticket.phone) : <span className="italic opacity-50 text-[10px] font-black uppercase tracking-widest">No Phone Provided</span>}
                            </div>

                            {isStaff && ticket.customer_id && (
                                <button onClick={() => navigate(`/customer/${ticket.customer_id}`)} className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 px-2 py-1 rounded-md transition-all cursor-pointer shadow-sm border border-indigo-100 dark:border-indigo-800">
                                    <History size={14} /> <span className="text-[10px] font-black uppercase tracking-widest mt-0.5">History</span>
                                </button>
                            )}
                        </div>
                    </div>

                    {/* --- PREMIUM CONTROL CLUSTER --- */}
                    <div className="flex flex-col items-stretch w-full lg:w-[400px] gap-4 flex-none">
                        {isStaff ? (
                            <div className="flex flex-col gap-3">

                                {/* Status & Quick Actions Row */}
                                <div className="relative z-20">
                                    <label className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-1.5 block pl-1">Ticket Status</label>
                                    <div className="flex gap-2 w-full">
                                        {/* Status Dropdown */}
                                        <div className="dropdown dropdown-end flex-1">
                                            <div tabIndex={0} role="button" className={`btn w-full h-12 border-none shadow-md flex justify-between items-center px-4 transition-all hover:scale-[1.02] ${getStatusColor(ticket.status)} ${!canEdit ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                                <span className="font-black uppercase tracking-widest text-[11px] truncate mr-2">
                                                    {ticket.status === 'intake' ? 'In Queue' : ticket.status.replace('_', ' ')}
                                                </span>
                                                <ChevronDown size={16} className="opacity-70 flex-none" />
                                            </div>
                                            {canEdit && (
                                                <ul tabIndex={0} className="dropdown-content z-[60] menu p-2 shadow-2xl bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-xl w-64 mt-2 animate-pop">
                                                    <li className="menu-title text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] px-2 py-1">Update Status</li>
                                                    <li><button onClick={(e) => { updateStatus('intake'); e.currentTarget.blur(); }} className="font-bold text-[var(--text-main)] hover:bg-[var(--bg-subtle)] rounded-lg py-2.5"><div className="w-2.5 h-2.5 rounded-full bg-blue-500 mr-2 shadow-sm"></div> In Queue</button></li>
                                                    <li><button onClick={(e) => { updateStatus('diagnosing'); e.currentTarget.blur(); }} className="font-bold text-[var(--text-main)] hover:bg-[var(--bg-subtle)] rounded-lg py-2.5"><div className="w-2.5 h-2.5 rounded-full bg-purple-500 mr-2 shadow-sm"></div> Diagnosing</button></li>
                                                    <li><button onClick={(e) => { updateStatus('waiting_parts'); e.currentTarget.blur(); }} className="font-bold text-[var(--text-main)] hover:bg-[var(--bg-subtle)] rounded-lg py-2.5"><div className="w-2.5 h-2.5 rounded-full bg-orange-500 mr-2 shadow-sm"></div> Waiting on Parts</button></li>
                                                    <li><button onClick={(e) => { updateStatus('repairing'); e.currentTarget.blur(); }} className="font-bold text-[var(--text-main)] hover:bg-[var(--bg-subtle)] rounded-lg py-2.5"><div className="w-2.5 h-2.5 rounded-full bg-amber-500 mr-2 shadow-sm"></div> Repairing</button></li>
                                                    <li><button onClick={(e) => { updateStatus('ready_pickup'); e.currentTarget.blur(); }} className="font-bold text-[var(--text-main)] hover:bg-[var(--bg-subtle)] rounded-lg py-2.5"><div className="w-2.5 h-2.5 rounded-full bg-emerald-500 mr-2 shadow-sm"></div> Ready for Pickup</button></li>
                                                    <div className="border-t border-dashed border-[var(--border-color)] my-1"></div>
                                                    <li><button onClick={(e) => { updateStatus('completed'); e.currentTarget.blur(); }} className="font-bold text-[var(--text-main)] hover:bg-[var(--bg-subtle)] rounded-lg py-2.5"><div className="w-2.5 h-2.5 rounded-full bg-slate-500 mr-2 shadow-sm"></div> Completed</button></li>
                                                </ul>
                                            )}
                                        </div>

                                        {/* Action Buttons */}
                                        <button onClick={handleCopyLink} className="btn btn-square h-12 w-12 border border-[var(--border-color)] bg-[var(--bg-surface)] shadow-sm hover:bg-[var(--bg-subtle)] text-indigo-500 flex-none transition-all hover:scale-[1.05]" title="Copy Public Link"><Share2 size={18} /></button>
                                        <div className="dropdown dropdown-end">
                                            <label tabIndex={0} className="btn btn-square h-12 w-12 border border-[var(--border-color)] bg-[var(--bg-surface)] shadow-sm hover:bg-[var(--bg-subtle)] text-[var(--text-main)] flex-none transition-all hover:scale-[1.05]"><Printer size={18} /></label>
                                            <ul tabIndex={0} className="dropdown-content z-[50] menu p-2 shadow-2xl bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-xl w-52 mt-2 animate-pop">
                                                <li><a onClick={() => { handlePrintShop(); document.activeElement.blur(); }} className="flex items-center gap-2 font-bold text-[var(--text-main)] hover:bg-[var(--bg-subtle)] rounded-lg py-3"><Tag size={16} className="text-indigo-500" /> Shop Tag</a></li>
                                                <li><a onClick={() => { handlePrintCustomer(); document.activeElement.blur(); }} className="flex items-center gap-2 font-bold text-[var(--text-main)] hover:bg-[var(--bg-subtle)] rounded-lg py-3"><User size={16} className="text-emerald-500" /> Customer Receipt</a></li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>

                                {/* Assignee Row */}
                                <div className="relative z-10">
                                    <label className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-1.5 block pl-1">Assigned Technician</label>
                                    <div className="dropdown dropdown-end w-full">
                                        <div tabIndex={0} role="button" className={`btn w-full h-12 bg-[var(--bg-subtle)] border border-[var(--border-color)] hover:bg-[var(--bg-surface)] hover:border-indigo-300 shadow-inner flex justify-between items-center px-4 transition-all ${!canEdit ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                            <div className="flex items-center gap-2 overflow-hidden">
                                                <User size={14} className={ticket.assigned_to ? "text-indigo-500 flex-none" : "text-[var(--text-muted)] flex-none"} />
                                                <span className="font-black uppercase tracking-widest text-[10px] text-[var(--text-main)] truncate">
                                                    {ticket.assigned_to ? (employees.find(e => e.id === ticket.assigned_to)?.full_name || 'Technician Assigned') : 'Click to Assign...'}
                                                </span>
                                            </div>
                                            <ChevronDown size={16} className="text-[var(--text-muted)] flex-none opacity-70" />
                                        </div>
                                        {canEdit && (
                                            <ul tabIndex={0} className="dropdown-content z-[60] menu p-2 shadow-2xl bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-xl w-full mt-2 animate-pop max-h-64 overflow-y-auto custom-scrollbar">
                                                <li>
                                                    <button onClick={(e) => { handleAssignment(""); e.currentTarget.blur(); }} className={`font-bold text-[var(--text-muted)] hover:bg-[var(--bg-subtle)] rounded-lg py-2.5 ${!ticket.assigned_to ? 'bg-[var(--bg-subtle)]' : ''}`}>
                                                        <div className="w-6 h-6 rounded-full bg-[var(--bg-surface)] border border-[var(--border-color)] flex items-center justify-center mr-2 shadow-inner"><X size={12} /></div> Unassigned
                                                    </button>
                                                </li>
                                                <div className="border-t border-dashed border-[var(--border-color)] my-1"></div>
                                                {employees.map(emp => (
                                                    <li key={emp.id}>
                                                        <button onClick={(e) => { handleAssignment(emp.id); e.currentTarget.blur(); }} className={`font-bold text-[var(--text-main)] hover:bg-[var(--bg-subtle)] rounded-lg py-2.5 ${ticket.assigned_to === emp.id ? 'bg-[var(--bg-subtle)] text-indigo-600 dark:text-indigo-400' : ''}`}>
                                                            <div className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mr-2 text-[9px] font-black uppercase shadow-sm">
                                                                {emp.full_name?.substring(0, 2).toUpperCase() || <User size={12} />}
                                                            </div>
                                                            {emp.full_name || emp.email}
                                                        </button>
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>
                                </div>

                            </div>
                        ) : (
                            <div className={`badge h-10 w-full lg:w-auto px-5 font-black uppercase tracking-widest shadow-md ${getStatusColor(ticket.status)}`}>{ticket.status.replace('_', ' ')}</div>
                        )}
                    </div>
                </div>
            </div>

            {/* MAIN LAYOUT */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade">
                <div className="col-span-1 lg:col-span-2 space-y-6">
                    <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl shadow-sm overflow-hidden animate-fade-in relative group">

                        {/* Panel Header */}
                        <div className="px-6 py-4 border-b-2 border-dashed border-[var(--border-color)] flex justify-between items-center bg-[var(--bg-surface)]">
                            <div>
                                <h2 className="text-[10px] font-black uppercase text-[var(--text-main)] tracking-widest flex items-center gap-2">
                                    <ClipboardList size={16} className="text-indigo-600" /> Technical Diagnosis
                                </h2>
                            </div>
                            {canEdit && (userRole === 'manager' || userRole === 'admin') && (
                                <button onClick={() => setIsEditModalOpen(true)} className="btn btn-sm btn-ghost border border-transparent shadow-none text-[var(--text-muted)] hover:text-indigo-600 hover:bg-[var(--bg-subtle)] transition-all gap-2">
                                    <Edit3 size={14} /> <span className="hidden sm:inline font-bold">Edit Specs</span>
                                </button>
                            )}
                        </div>

                        <div className="p-6 md:p-8 bg-[var(--bg-subtle)]">

                            {/* Technical Specs - Recessed Cards */}
                            <div className="flex flex-wrap gap-4 mb-8">
                                <div className="flex items-center gap-3 px-4 py-2 bg-[var(--bg-surface)] rounded-xl border border-[var(--border-color)] shadow-sm">
                                    <div className="p-2 bg-[var(--bg-subtle)] rounded-lg shadow-inner border border-[var(--border-color)]"><Cpu size={16} className="text-indigo-500" /></div>
                                    <div>
                                        <div className="text-[9px] font-black uppercase text-[var(--text-muted)] tracking-widest mb-0.5">Model ID</div>
                                        <div className="text-sm font-bold text-[var(--text-main)] leading-none">{ticket.model}</div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 px-4 py-2 bg-[var(--bg-surface)] rounded-xl border border-[var(--border-color)] shadow-sm">
                                    <div className="p-2 bg-[var(--bg-subtle)] rounded-lg shadow-inner border border-[var(--border-color)]"><Fingerprint size={16} className="text-emerald-500" /></div>
                                    <div>
                                        <div className="text-[9px] font-black uppercase text-[var(--text-muted)] tracking-widest mb-0.5">Serial / IMEI</div>
                                        <div className="text-sm font-mono font-bold text-[var(--text-main)] tracking-wide leading-none">{ticket.serial_number || 'N/A'}</div>
                                    </div>
                                </div>
                            </div>

                            {/* Customer Defect Box */}
                            <div className="relative mb-8">
                                <div className="absolute -left-3 top-0 bottom-0 w-1 bg-amber-400 rounded-full"></div>
                                <div className="pl-6">
                                    <h3 className="text-[10px] font-black uppercase text-[var(--text-muted)] tracking-widest mb-3 flex items-center gap-2"><AlertCircle size={14} className="text-amber-500" /> Customer Stated Defect</h3>
                                    <div className="p-5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)] text-[var(--text-main)] font-medium text-sm leading-relaxed whitespace-pre-wrap shadow-sm relative overflow-hidden">
                                        <div className="absolute top-2 right-4 text-6xl font-serif text-[var(--border-color)] opacity-30 pointer-events-none">”</div>
                                        {ticket.description || "No description provided at intake."}
                                    </div>
                                </div>
                            </div>

                            {/* --- COLLAPSIBLE INTAKE PHOTOS --- */}
                            <div className="mb-8 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl shadow-sm animate-fade-in-up overflow-hidden transition-all duration-300">
                                <div onClick={() => setIsPhotosCollapsed(!isPhotosCollapsed)} className="p-5 flex justify-between items-center cursor-pointer hover:bg-[var(--bg-subtle)] transition-colors group select-none">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-lg transition-colors border border-[var(--border-color)] ${!isPhotosCollapsed ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:border-indigo-800' : 'bg-[var(--bg-subtle)] text-[var(--text-muted)] group-hover:text-indigo-500 shadow-inner'}`}>
                                            <Camera size={18} />
                                        </div>
                                        <div>
                                            <h3 className="text-[10px] font-black uppercase text-[var(--text-main)] tracking-widest flex items-center gap-2">
                                                Intake Photos {images.length > 0 && <span className="px-1.5 py-0.5 rounded bg-[var(--bg-subtle)] border border-[var(--border-color)] text-[9px] shadow-inner text-[var(--text-muted)]">{images.length}</span>}
                                            </h3>
                                            <p className="text-[9px] font-bold text-[var(--text-muted)] opacity-80 mt-1 uppercase tracking-wider">{isPhotosCollapsed ? 'Click to view evidence' : 'Condition & Accessories'}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="relative" onClick={(e) => e.stopPropagation()}>
                                            <input type="file" id="photo-upload" accept="image/*" onChange={handleImageUpload} disabled={uploading} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20" />
                                            <button className={`btn btn-sm btn-ghost gap-2 text-[var(--text-muted)] hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all ${uploading ? 'loading' : ''}`}>
                                                <PlusCircle size={16} /> <span className="hidden sm:inline font-bold">Add</span>
                                            </button>
                                        </div>
                                        <div className="w-8 h-8 rounded-full bg-[var(--bg-subtle)] border border-[var(--border-color)] flex items-center justify-center text-[var(--text-muted)] shadow-inner">
                                            {isPhotosCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                                        </div>
                                    </div>
                                </div>
                                {!isPhotosCollapsed && (
                                    <div className="p-5 pt-0 animate-fade-in bg-[var(--bg-surface)]">
                                        {images.length === 0 ? (
                                            <div className="text-center py-10 border-2 border-dashed border-[var(--border-color)] rounded-xl bg-[var(--bg-subtle)] shadow-inner">
                                                <ImageIcon size={32} className="mx-auto text-[var(--border-color)] mb-2" />
                                                <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">No photos uploaded</p>
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                                {images.map((img, idx) => (
                                                    <div key={idx} onClick={() => openLightbox(img)} className="relative aspect-square rounded-xl overflow-hidden border border-[var(--border-color)] group shadow-sm bg-[var(--bg-subtle)] cursor-zoom-in hover:ring-2 hover:ring-indigo-500 hover:ring-offset-2 hover:ring-offset-[var(--bg-surface)] transition-all">
                                                        <img src={img.url} alt="Evidence" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 opacity-90 group-hover:opacity-100" />
                                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"><Maximize2 className="text-white drop-shadow-md" size={24} /></div>
                                                        {isStaff && <button onClick={(e) => promptDeletePhoto(img.name, e)} className="absolute top-2 right-2 btn btn-xs btn-circle bg-red-500 border-none text-white opacity-0 group-hover:opacity-100 transition-opacity z-20 shadow-lg hover:bg-red-600" title="Delete Photo"><Trash2 size={12} /></button>}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {isStaff && (
                                <div className="mt-8 animate-fade-in-up">

                                    <div className={`rounded-2xl border transition-all duration-500 overflow-hidden shadow-sm relative group ${ticket.is_backordered ? 'border-red-300 dark:border-red-900/80 ring-4 ring-red-500/10 bg-red-50/30 dark:bg-red-900/10' : 'border-[var(--border-color)] bg-[var(--bg-surface)]'}`}>
                                        <div className={`p-5 flex flex-col sm:flex-row justify-between items-center gap-4 border-b-2 border-dashed ${ticket.is_backordered ? 'bg-red-100/50 dark:bg-red-900/30 border-red-200 dark:border-red-800/50' : 'bg-[var(--bg-surface)] border-[var(--border-color)]'}`}>
                                            <div className="flex items-center gap-3">
                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-inner border ${ticket.is_backordered ? 'bg-red-500 text-white border-red-600 animate-pulse' : 'bg-[var(--bg-subtle)] border-[var(--border-color)] text-indigo-600 dark:text-indigo-400'}`}>
                                                    {ticket.is_backordered ? <AlertTriangle size={18} /> : <Wrench size={18} />}
                                                </div>
                                                <div>
                                                    <h4 className={`font-black text-[10px] uppercase tracking-widest ${ticket.is_backordered ? 'text-red-600 dark:text-red-400' : 'text-[var(--text-main)]'}`}>{ticket.is_backordered ? 'Order Hold Active' : 'Service Control Center'}</h4>
                                                    <p className="text-[9px] font-bold text-[var(--text-muted)] mt-0.5">{ticket.is_backordered ? 'Waiting on vendor parts delivery' : 'Manage estimate, inventory & orders'}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3 bg-[var(--bg-subtle)] p-1.5 rounded-full border border-[var(--border-color)] shadow-inner">
                                                <span className={`text-[9px] font-black uppercase tracking-widest px-2 ${ticket.is_backordered ? 'text-red-500' : 'text-[var(--text-muted)]'}`}>{ticket.is_backordered ? 'On Hold' : 'Standard'}</span>
                                                <button onClick={toggleBackorder} disabled={!canEdit} className={`w-12 h-6 rounded-full transition-all relative shadow-inner flex items-center ${ticket.is_backordered ? 'bg-red-500' : 'bg-[var(--bg-surface)] border border-[var(--border-color)]'} ${!canEdit ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
                                                    <div className={`w-5 h-5 bg-white rounded-full shadow-md absolute transition-all duration-300 ${ticket.is_backordered ? 'translate-x-6' : 'translate-x-0.5'}`} />
                                                </button>
                                            </div>
                                        </div>
                                        <div className={`p-6 space-y-8 ${isClosed ? 'opacity-60 pointer-events-none grayscale-[0.5]' : ''}`}>
                                            <div className="relative"><div className="absolute -left-6 top-6 bottom-6 w-1 bg-indigo-500/20 rounded-r-full"></div><EstimateBuilder
                                                ticketId={id}
                                                onTotalChange={handleEstimateUpdate}
                                                onActivityLog={handleEstimateLog}
                                                refreshTrigger={estimateRefreshTrigger}
                                                estimateStatus={ticket.estimate_status || 'draft'}
                                                onUpdateStatus={updateEstimateStatus}
                                            /></div>
                                            <div className="relative"><div className="absolute -left-6 top-6 bottom-6 w-1 bg-emerald-500/20 rounded-r-full"></div><PartsOrderManager ticketId={id} onActivityLog={handleEstimateLog} onAddToEstimate={() => setEstimateRefreshTrigger(prev => prev + 1)} /></div>
                                            <div className="relative"><div className="absolute -left-6 top-6 bottom-6 w-1 bg-amber-500/20 rounded-r-full"></div><PartSourcing initialQuery={`${ticket.brand} ${ticket.model}`} ticketId={id} onAddToEstimate={() => setEstimateRefreshTrigger(prev => prev + 1)} /></div>
                                        </div>
                                        {isClosed && (
                                            <div className="absolute inset-0 z-10 bg-[var(--bg-surface)]/60 backdrop-blur-[2px] flex items-center justify-center">
                                                <div className="bg-[var(--bg-surface)] px-6 py-3 rounded-full shadow-xl border border-[var(--border-color)] flex items-center gap-2">
                                                    <LockKeyhole size={16} className="text-[var(--text-muted)]" />
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-main)]">Ticket Completed - Read Only</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                            {!isStaff && <div className="animate-fade-in-up mt-8 border-t-2 border-dashed border-[var(--border-color)] pt-8"><CustomerEstimateView ticketId={id} /></div>}
                        </div>

                        {isManagement && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in-up p-6 md:p-8 pt-0 bg-[var(--bg-subtle)] border-t border-[var(--border-color)]">
                                <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl shadow-sm overflow-hidden flex flex-col h-80">
                                    <div className="px-5 py-4 bg-[var(--bg-surface)] border-b-2 border-dashed border-[var(--border-color)] flex justify-between items-center shrink-0">
                                        <h2 className="text-[10px] font-black uppercase text-[var(--text-main)] tracking-widest flex items-center gap-2"><ShieldAlert size={14} className="text-indigo-600" /> Restricted Log</h2>
                                        <div className="px-2 py-1 bg-[var(--bg-subtle)] rounded-md border border-[var(--border-color)] text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] shadow-inner">{auditLogs.length} Records</div>
                                    </div>
                                    <div className="overflow-y-auto custom-scrollbar flex-1 bg-[var(--bg-surface)] p-2">
                                        {auditLogs.length === 0 ? (
                                            <div className="h-full flex flex-col items-center justify-center text-[var(--text-muted)] opacity-60"><History size={24} className="mb-2" /><p className="text-[10px] font-bold uppercase tracking-widest">No activity recorded</p></div>
                                        ) : (
                                            <div className="space-y-1">
                                                {auditLogs.map(log => {
                                                    const visuals = getLogVisuals(log.action);
                                                    return (
                                                        <div key={log.id} onClick={() => setSelectedLog(log)} className="px-4 py-3 flex items-start gap-3 hover:bg-[var(--bg-subtle)] rounded-xl cursor-pointer transition-colors group relative pr-10 border border-transparent hover:border-[var(--border-color)]">
                                                            <div className={`w-8 h-8 rounded-full flex-none flex items-center justify-center shadow-inner ${visuals.bg}`}>{visuals.icon}</div>
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex justify-between items-baseline mb-0.5"><span className="text-[9px] font-black uppercase tracking-widest opacity-60 text-[var(--text-main)]">{log.action.split(' ')[0]}</span><span className="text-[9px] text-[var(--text-muted)] font-bold">{format(new Date(log.created_at), 'MMM d, h:mm a')}</span></div>
                                                                <div className="text-xs font-bold text-[var(--text-main)] truncate">{log.details}</div>
                                                                <div className="text-[9px] font-bold text-[var(--text-muted)] mt-1 flex items-center gap-1 uppercase tracking-wider"><User size={10} /><span className="opacity-80">{log.actor_name.split(' ')[0]}</span></div>
                                                            </div>
                                                            {userRole === 'admin' && <button onClick={(e) => promptDeleteLog(log, e)} className="absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all transform scale-90 hover:scale-100 btn btn-ghost btn-xs btn-square text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 hover:border-red-200" title="Delete Log Entry"><Trash2 size={14} /></button>}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="border-2 border-dashed border-[var(--border-color)] rounded-2xl flex flex-col items-center justify-center p-6 text-[var(--text-muted)] bg-[var(--bg-subtle)] shadow-inner opacity-70 h-80 cursor-not-allowed">
                                    <div className="w-16 h-16 rounded-full bg-[var(--bg-surface)] border border-[var(--border-color)] shadow-sm flex items-center justify-center mb-4"><PlusCircle size={28} className="opacity-30 text-[var(--text-main)]" /></div>
                                    <span className="font-black text-[10px] uppercase tracking-widest text-[var(--text-main)] opacity-60">System Module Slot</span><span className="text-[9px] font-bold uppercase tracking-wider opacity-50 mt-1">Reserved for expansion</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* RIGHT SIDEBAR: CHAT */}
                <div className="hidden lg:block col-span-1">
                    <div className="rounded-2xl shadow-xl flex flex-col h-[600px] overflow-hidden border border-[var(--border-color)] bg-[var(--bg-surface)] sticky top-24">
                        {renderChatInterface()}
                    </div>
                </div>
            </div>

            {/* MOBILE CHAT TOGGLE */}
            <button onClick={() => setIsMobileChatOpen(true)} className="lg:hidden fixed bottom-6 right-6 btn btn-circle btn-lg btn-gradient text-white shadow-2xl z-40"><MessageSquare size={28} /></button>

            {/* MOBILE CHAT MODAL */}
            {isMobileChatOpen && (
                <div className="fixed inset-0 z-50 lg:hidden flex flex-col bg-[var(--bg-surface)] animate-slide-up">
                    <div className="relative z-50 p-4 border-b border-[var(--border-color)] flex justify-between items-center shadow-sm bg-[var(--bg-surface)]">
                        <h3 className="font-black text-[10px] uppercase tracking-widest text-[var(--text-main)] flex items-center gap-2">Ticket Communications</h3>
                        <button onClick={() => setIsMobileChatOpen(false)} className="btn btn-circle btn-sm btn-ghost text-[var(--text-muted)]"><X size={20} /></button>
                    </div>
                    <div className="flex-1 overflow-hidden relative z-0">{renderChatInterface()}</div>
                </div>
            )}

            {/* SCANNER */}
            {isScanning && (<QRScanner onClose={() => setIsScanning(false)} onScan={(result) => { setIsScanning(false); setTimeout(() => { navigate(`/ticket/${result.includes('/ticket/') ? result.split('/ticket/')[1] : result}`); }, 100); }} />)}

            {/* --- MODALS --- */}
            {isEditModalOpen && (
                <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-[var(--bg-surface)] w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden animate-pop border border-[var(--border-color)] flex flex-col max-h-[90vh]">
                        <div className="p-6 border-b-2 border-dashed border-[var(--border-color)] bg-[var(--bg-surface)] flex justify-between items-center">
                            <div>
                                <h3 className="font-black text-xl text-[var(--text-main)] flex items-center gap-2"><Edit3 size={22} className="text-indigo-600" /> Edit Ticket Specs</h3>
                                <p className="text-[10px] font-black text-[var(--text-muted)] mt-1 uppercase tracking-widest">Core Device Information</p>
                            </div>
                            <button onClick={() => setIsEditModalOpen(false)} className="btn btn-sm btn-circle btn-ghost text-[var(--text-muted)] hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"><X size={20} /></button>
                        </div>
                        <div className="p-8 overflow-y-auto custom-scrollbar bg-[var(--bg-subtle)]">
                            <div className="bg-[var(--bg-surface)] p-6 rounded-xl border border-[var(--border-color)] shadow-sm grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="form-control">
                                    <label className="label text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1">Device Brand</label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[var(--text-muted)] group-focus-within:text-indigo-500 transition-colors"><Tag size={16} /></div>
                                        <input type="text" className="input input-bordered w-full h-12 pl-11 bg-[var(--bg-subtle)] text-[var(--text-main)] font-bold shadow-inner focus:bg-[var(--bg-surface)] focus:border-indigo-500 transition-all text-sm" placeholder="e.g. Dyson" value={editForm.brand || ''} onChange={e => setEditForm({ ...editForm, brand: e.target.value })} />
                                    </div>
                                </div>
                                <div className="form-control">
                                    <label className="label text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1">Model Name/No.</label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[var(--text-muted)] group-focus-within:text-indigo-500 transition-colors"><Cpu size={16} /></div>
                                        <input type="text" className="input input-bordered w-full h-12 pl-11 bg-[var(--bg-subtle)] text-[var(--text-main)] font-bold shadow-inner focus:bg-[var(--bg-surface)] focus:border-indigo-500 transition-all text-sm" placeholder="e.g. V11 Animal" value={editForm.model || ''} onChange={e => setEditForm({ ...editForm, model: e.target.value })} />
                                    </div>
                                </div>
                                <div className="form-control md:col-span-2">
                                    <label className="label text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1">Serial Number / IMEI</label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[var(--text-muted)] group-focus-within:text-indigo-500 transition-colors"><Hash size={16} /></div>
                                        <input type="text" className="input input-bordered w-full h-12 pl-11 bg-[var(--bg-subtle)] text-[var(--text-main)] font-mono font-bold shadow-inner focus:bg-[var(--bg-surface)] focus:border-indigo-500 transition-all text-sm tracking-wide" placeholder="Optional" value={editForm.serial_number || ''} onChange={e => setEditForm({ ...editForm, serial_number: e.target.value })} />
                                    </div>
                                </div>
                                <div className="form-control md:col-span-2">
                                    <label className="label text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1">Customer Stated Issue</label>
                                    <div className="relative group">
                                        <textarea className="textarea textarea-bordered w-full h-32 p-4 bg-[var(--bg-subtle)] text-[var(--text-main)] text-sm font-medium leading-relaxed shadow-inner focus:bg-[var(--bg-surface)] focus:border-indigo-500 transition-all resize-none" placeholder="Describe the issue in detail..." value={editForm.description || ''} onChange={e => setEditForm({ ...editForm, description: e.target.value })}></textarea>
                                        <div className="absolute top-4 right-4 pointer-events-none opacity-20 text-[var(--text-muted)]"><AlertCircle size={20} /></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="p-5 border-t-2 border-dashed border-[var(--border-color)] bg-[var(--bg-surface)] flex justify-end gap-3 shadow-[0_-4px_10px_-1px_rgba(0,0,0,0.05)]">
                            <button onClick={() => setIsEditModalOpen(false)} className="btn btn-ghost text-[var(--text-muted)] hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 font-bold transition-all px-6">Cancel</button>
                            <button onClick={handleSaveEdit} className="btn btn-gradient text-white shadow-lg shadow-indigo-500/30 px-8 hover:scale-105 transition-transform border-none gap-2"><Save size={18} strokeWidth={2.5} /> Save Changes</button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- LIGHTBOX MODAL WITH PANNING --- */}
            {lightboxImage && (
                <div
                    className="fixed inset-0 z-[9999] bg-slate-900/90 backdrop-blur-md flex items-center justify-center animate-fade-in select-none"
                    onClick={closeLightbox}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                >
                    <div className="absolute top-4 right-4 z-50 flex gap-2" onClick={e => e.stopPropagation()}>
                        <div className="bg-black/50 backdrop-blur-md rounded-full p-1 flex items-center border border-white/10">
                            <button onClick={() => handleZoom('out')} className="btn btn-circle btn-sm btn-ghost text-white hover:bg-white/20"><ZoomOut size={18} /></button>
                            <span className="text-[10px] font-mono font-black tracking-widest text-white w-12 text-center">{Math.round(zoomLevel * 100)}%</span>
                            <button onClick={() => handleZoom('in')} className="btn btn-circle btn-sm btn-ghost text-white hover:bg-white/20"><ZoomIn size={18} /></button>
                        </div>
                        <button onClick={closeLightbox} className="btn btn-circle btn-sm bg-white text-black hover:bg-white/80 border-none shadow-lg"><X size={20} /></button>
                    </div>

                    <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
                        <img
                            src={lightboxImage.url}
                            alt="Full Details"
                            draggable="false"
                            onMouseDown={handleMouseDown}
                            style={{
                                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoomLevel})`,
                                cursor: zoomLevel > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default',
                                transition: isDragging ? 'none' : 'transform 0.1s ease-out'
                            }}
                            className="max-w-[90%] max-h-[90%] object-contain rounded-lg shadow-2xl"
                            onClick={e => e.stopPropagation()}
                        />
                    </div>

                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-md px-5 py-2 rounded-full border border-white/10 text-white text-[10px] uppercase font-black tracking-widest pointer-events-none">
                        {!isNaN(Number(lightboxImage.name.split('.')[0])) ? new Date(Number(lightboxImage.name.split('.')[0])).toLocaleString() : lightboxImage.name}
                    </div>
                </div>
            )}

            {/* --- LOG DETAILS MODAL --- */}
            {selectedLog && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in" onClick={() => setSelectedLog(null)}>
                    <div className="bg-[var(--bg-surface)] w-full max-w-md rounded-2xl shadow-2xl border border-[var(--border-color)] flex flex-col overflow-hidden animate-pop ring-1 ring-white/20" onClick={e => e.stopPropagation()}>

                        <div className="p-5 border-b-2 border-dashed border-[var(--border-color)] bg-[var(--bg-surface)] flex justify-between items-center">
                            <div>
                                <h3 className="font-black text-lg text-[var(--text-main)] flex items-center gap-2">
                                    <History size={18} className="text-indigo-500" /> Activity Details
                                </h3>
                            </div>
                            <button onClick={() => setSelectedLog(null)} className="btn btn-sm btn-circle btn-ghost text-[var(--text-muted)] hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6 space-y-5 bg-[var(--bg-subtle)]">
                            <div className="bg-[var(--bg-surface)] p-5 rounded-xl border border-[var(--border-color)] shadow-sm space-y-4">
                                <div>
                                    <div className="text-[9px] font-black uppercase text-[var(--text-muted)] tracking-widest mb-1">Action</div>
                                    <div className="font-black text-[var(--text-main)] text-sm">{selectedLog.action}</div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <div className="text-[9px] font-black uppercase text-[var(--text-muted)] tracking-widest mb-1">Performed By</div>
                                        <div className="flex items-center gap-1.5 font-bold text-xs text-[var(--text-main)]">
                                            <User size={12} className="text-[var(--text-muted)]" /> {selectedLog.actor_name}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-[9px] font-black uppercase text-[var(--text-muted)] tracking-widest mb-1">Timestamp</div>
                                        <div className="font-bold text-[var(--text-main)] text-xs flex items-center gap-1.5">
                                            <Clock size={12} className="text-[var(--text-muted)]" /> {format(new Date(selectedLog.created_at), 'MMM d, h:mm a')}
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <div className="text-[9px] font-black uppercase text-[var(--text-muted)] tracking-widest mb-1.5">Description</div>
                                    <div className="p-3 bg-[var(--bg-subtle)] rounded-lg text-sm font-medium text-[var(--text-main)] shadow-inner border border-[var(--border-color)]">
                                        {selectedLog.details}
                                    </div>
                                </div>
                            </div>

                            {selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0 && (
                                <div>
                                    <div className="text-[9px] font-black uppercase text-[var(--text-muted)] tracking-widest mb-1.5 pl-1">System Metadata</div>
                                    <pre className="p-4 bg-[var(--bg-surface)] text-[var(--text-main)] rounded-xl text-[10px] overflow-x-auto border border-[var(--border-color)] font-mono shadow-sm">
                                        {JSON.stringify(selectedLog.metadata, null, 2)}
                                    </pre>
                                </div>
                            )}
                        </div>

                    </div>
                </div>
            )}

            {/* --- DELETE CONFIRMATION MODALS (Unified) --- */}
            {(logToDelete || photoToDelete) && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md transition-opacity animate-fade-in" onClick={() => { setLogToDelete(null); setPhotoToDelete(null); }} />
                    <div className="relative w-full max-w-sm bg-[var(--bg-surface)] rounded-2xl shadow-[0_20px_50px_-12px_rgba(0,0,0,0.5)] overflow-hidden border border-[var(--border-color)] animate-pop ring-1 ring-red-500/20">
                        <div className="h-1.5 w-full bg-gradient-to-r from-red-500 via-orange-500 to-red-500"></div>
                        <div className="p-8">
                            <div className="mx-auto w-20 h-20 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center mb-6 relative border border-red-100 dark:border-red-800">
                                <div className="absolute inset-0 rounded-full bg-red-500/20 animate-ping opacity-50"></div>
                                <Trash2 size={36} className="text-red-600 dark:text-red-500 relative z-10" />
                            </div>
                            <div className="text-center mb-8">
                                <h3 className="text-xl font-black text-[var(--text-main)] mb-2">Delete {photoToDelete ? 'Photo' : 'Log'}?</h3>
                                <p className="text-sm font-medium text-[var(--text-muted)] leading-relaxed">
                                    This action cannot be undone. This item will be <strong className="text-red-500">permanently erased</strong>.
                                </p>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <button onClick={() => { setLogToDelete(null); setPhotoToDelete(null); }} className="btn btn-ghost h-12 font-bold text-[var(--text-muted)] hover:bg-[var(--bg-subtle)] border border-transparent hover:border-[var(--border-color)] transition-all">Cancel</button>
                                <button onClick={photoToDelete ? confirmDeletePhoto : executeDeleteLog} className="btn btn-error h-12 text-white font-bold shadow-lg shadow-red-500/30 border-none bg-gradient-to-br from-red-500 to-red-600 hover:scale-105 transition-transform">Yes, Delete</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* --- PRINTABLE LABELS (Visually Hidden from UI) --- */}
            <div className="absolute -left-[9999px] top-0 opacity-0 pointer-events-none">

                {/* 1. CUSTOMER RECEIPT (Standard 4x6 Label Size) */}
                <div ref={customerLabelRef} className="bg-white text-black p-6 font-sans flex flex-col" style={{ width: '4in', height: '6in', boxSizing: 'border-box' }}>
                    <div className="text-center mb-4 border-b-2 border-black pb-4">
                        <h2 className="text-2xl font-black uppercase tracking-widest text-black">Repair Receipt</h2>
                        <p className="text-base font-bold text-gray-600 mt-1 font-mono">TICKET #{ticket?.id}</p>
                    </div>

                    <div className="space-y-4 mb-4 flex-1">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-0.5">Customer</p>
                            <p className="text-lg font-bold text-black leading-tight">{ticket?.customer_name}</p>
                            <p className="text-sm font-mono font-medium text-gray-700">{formatPhoneNumber(ticket?.phone || '')}</p>
                        </div>

                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-0.5">Device</p>
                            <p className="text-lg font-bold text-black leading-tight">{ticket?.brand} {ticket?.model}</p>
                            <p className="text-xs font-mono font-medium text-gray-600 mt-0.5">SN: {ticket?.serial_number || 'N/A'}</p>
                        </div>

                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-0.5">Received On</p>
                            <p className="text-sm font-bold text-black">
                                {ticket?.created_at ? format(new Date(ticket.created_at), 'MMMM dd, yyyy - h:mm a') : 'N/A'}
                            </p>
                        </div>

                        <div className="pt-2">
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-0.5">Stated Issue</p>
                            <p className="text-xs font-medium text-black line-clamp-3">
                                {ticket?.description || 'No issue provided.'}
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-col items-center justify-center border-t-2 border-dashed border-gray-400 pt-4 mt-auto">
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-600 mb-2">Scan for Live Status Updates</p>
                        <div className="p-2 border-4 border-black rounded-xl bg-white">
                            <QRCode value={`${window.location.origin}/status/${ticket?.id}`} size={120} level="H" />
                        </div>
                    </div>
                </div>

                {/* 2. SHOP TAG (Standard 3.5x1.2 Barcode/Item Tag) */}
                <div ref={shopLabelRef} className="bg-white text-black p-2 flex items-center justify-between font-sans border-2 border-black rounded-lg" style={{ width: '3.5in', height: '1.2in', boxSizing: 'border-box' }}>
                    <div className="flex flex-col justify-center overflow-hidden pr-2 flex-1">
                        <div className="text-xs font-black uppercase tracking-widest text-black truncate mb-0.5">
                            {ticket?.customer_name}
                        </div>
                        <div className="text-[10px] font-bold text-gray-700 truncate mb-1">
                            {ticket?.brand} {ticket?.model}
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black font-mono bg-black text-white px-1.5 py-0.5 rounded">
                                #{ticket?.id}
                            </span>
                            <span className="text-[8px] font-bold text-gray-500 uppercase">
                                {ticket?.created_at ? format(new Date(ticket.created_at), 'MM/dd/yy') : ''}
                            </span>
                        </div>
                    </div>

                    <div className="flex-none p-1 border-2 border-black rounded-md bg-white">
                        <QRCode value={`${window.location.origin}/ticket/${ticket?.id}`} size={68} level="M" />
                    </div>
                </div>
            </div>

        </div>
    );
}

const ActivityIcon = ({ size }) => <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>;