import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { CheckCircle, Wrench, Package, ArrowRight, MapPin, Phone, Moon, Sun, Wind, Scissors, Zap, AlertCircle, Hash, AlertTriangle, Receipt, Lock } from 'lucide-react';
import { formatCurrency } from '../utils';
import confetti from 'canvas-confetti';

export default function PublicStatusPage() {
    const { id } = useParams();
    const [ticket, setTicket] = useState(null);
    const [estimateItems, setEstimateItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [approving, setApproving] = useState(false);

    const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');

    useEffect(() => {
        fetchTicketData();
    }, [id]);

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        if (theme === 'dark') document.documentElement.classList.add('dark');
        else document.documentElement.classList.remove('dark');
        localStorage.setItem('theme', theme);
    }, [theme]);

    const toggleTheme = () => { setTheme(prev => prev === 'light' ? 'dark' : 'light'); };

    async function fetchTicketData() {
        setLoading(true);
        const { data: ticketData } = await supabase.from('tickets').select('*').eq('id', id).single();
        const { data: itemsData } = await supabase.from('estimate_items').select('*').eq('ticket_id', id).order('created_at', { ascending: true });

        setTicket(ticketData);
        setEstimateItems(itemsData || []);
        setLoading(false);
    }

    const handleApprove = async () => {
        setApproving(true);

        // 1. Lock all pending items as approved
        await supabase.from('estimate_items').update({ is_approved: true }).eq('ticket_id', id).eq('is_approved', false);

        // 2. Update the main ticket status
        const { error } = await supabase.from('tickets').update({ status: 'waiting_parts', estimate_status: 'approved' }).eq('id', id);

        if (!error) {
            confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 }, colors: ['#6366f1', '#8b5cf6', '#ec4899'] });

            // Refresh data locally so UI updates instantly
            setTicket(prev => ({ ...prev, status: 'waiting_parts', estimate_status: 'approved' }));
            setEstimateItems(prev => prev.map(i => ({ ...i, is_approved: true })));

            await supabase.from('audit_logs').insert([{
                ticket_id: id, actor_name: 'Customer', action: 'ESTIMATE APPROVED', details: 'Customer approved the additional estimate charges.', metadata: { device: navigator.userAgent }
            }]);
        }
        setApproving(false);
    };

    const getDeviceIcon = (ticket) => {
        const searchString = (ticket.model + ' ' + ticket.brand).toLowerCase();
        if (searchString.includes('sew') || searchString.includes('stitch')) return <Scissors size={32} className="text-pink-500" />;
        return <Wind size={32} className="text-indigo-500" />;
    };

    // Calculate totals for breakdowns
    const approvedItems = estimateItems.filter(i => i.is_approved === true);
    const pendingItems = estimateItems.filter(i => i.is_approved !== true);

    const taxRate = 0.07;
    const calcTotal = (items) => {
        const sub = items.reduce((sum, i) => sum + (i.part_cost || 0) + (i.labor_cost || 0), 0);
        return sub + (sub * taxRate);
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center bg-[var(--bg-surface)]"><span className="loading loading-spinner text-indigo-500 loading-lg"></span></div>;
    if (!ticket) return <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--bg-surface)] text-[var(--text-muted)] gap-4"><AlertCircle size={48} className="opacity-50" /><h1 className="font-black text-lg text-[var(--text-main)] uppercase tracking-widest">Ticket Not Found</h1></div>;

    const steps = [
        { id: 'intake', label: 'Received', icon: <CheckCircle size={18} /> },
        { id: 'diagnosing', label: 'Diagnosing', icon: <Wrench size={18} /> },
        { id: 'repairing', label: 'Repairing', icon: <Zap size={18} /> },
        { id: 'ready_pickup', label: 'Ready for Pickup', icon: <Package size={18} /> }
    ];

    const currentIndex = ['intake', 'diagnosing', 'waiting_parts', 'repairing', 'ready_pickup', 'completed'].indexOf(ticket.status);
    const getStepStatus = (stepId) => {
        if (ticket.status === 'completed') return 'complete';
        if (ticket.status === 'waiting_parts' && stepId === 'repairing') return 'waiting';
        const stepIndex = ['intake', 'diagnosing', 'waiting_parts', 'repairing', 'ready_pickup', 'completed'].indexOf(stepId);
        if (stepIndex < currentIndex) return 'complete';
        if (stepIndex === currentIndex) return 'current';
        return 'upcoming';
    };

    return (
        <div className="min-h-screen bg-[var(--bg-surface)] font-sans transition-colors duration-300 pb-20">

            <div className="sticky top-0 z-50 px-6 py-4 flex justify-between items-center shadow-sm backdrop-blur-md bg-[var(--bg-surface)]/80 border-b border-[var(--border-color)] transition-colors">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
                        <Wrench size={20} fill="currentColor" />
                    </div>
                    <div>
                        <div className="font-black text-xl tracking-tight text-[var(--text-main)] leading-none">University <span className="text-indigo-500">Vac & Sew</span></div>
                        <p className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] mt-0.5">Live Repair Status</p>
                    </div>
                </div>
                <button onClick={toggleTheme} className="w-10 h-10 flex items-center justify-center rounded-full bg-[var(--bg-subtle)] border border-[var(--border-color)] shadow-inner text-[var(--text-muted)] hover:text-indigo-500 transition-colors"><Moon size={18} className="dark:hidden" /><Sun size={18} className="hidden dark:block" /></button>
            </div>

            <div className="max-w-md mx-auto p-4 sm:p-6 mt-4 space-y-6 animate-fade-in-up">

                <div className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-color)] border-l-[4px] border-l-indigo-500 shadow-sm p-6 relative overflow-hidden group transition-all">
                    <div className="flex justify-between items-start mb-5">
                        <div>
                            <h2 className="text-2xl font-black text-[var(--text-main)] leading-tight">{ticket.brand}</h2>
                            <h3 className="text-lg font-bold text-[var(--text-muted)]">{ticket.model}</h3>
                        </div>
                        <div className="p-3 bg-[var(--bg-subtle)] rounded-xl border border-[var(--border-color)] shadow-inner text-indigo-500">{getDeviceIcon(ticket)}</div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <span className="flex items-center gap-1.5 bg-[var(--bg-subtle)] border border-[var(--border-color)] shadow-inner text-[var(--text-main)] px-3 py-1.5 rounded-md font-mono text-[10px] uppercase font-black tracking-widest"><Hash size={12} className="opacity-50 text-indigo-500" /> TICKET: {ticket.id}</span>
                        {ticket.serial_number && <span className="flex items-center gap-1.5 bg-[var(--bg-subtle)] border border-[var(--border-color)] shadow-inner text-[var(--text-main)] px-3 py-1.5 rounded-md font-mono text-[10px] uppercase font-black tracking-widest">SN: {ticket.serial_number}</span>}
                    </div>
                </div>

                {ticket.is_backordered && ticket.status !== 'completed' && (
                    <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/50 rounded-2xl p-4 flex items-start gap-3 shadow-inner animate-pop">
                        <div className="bg-red-100 dark:bg-red-900/30 p-2 rounded-xl text-red-600 dark:text-red-400 shrink-0 border border-red-200 dark:border-red-800/50 shadow-sm animate-pulse"><AlertTriangle size={20} /></div>
                        <div>
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-red-600 dark:text-red-400 mb-1">Part Delay Notice</h4>
                            <p className="text-xs font-bold text-[var(--text-main)] opacity-80 leading-relaxed">This repair is currently on hold while we wait for a specific part to arrive from the manufacturer. We will resume work the moment it is delivered!</p>
                        </div>
                    </div>
                )}

                {/* --- PREVIOUSLY APPROVED RECEIPT (Only shows if they have locked items) --- */}
                {approvedItems.length > 0 && (
                    <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-[20px] p-6 shadow-sm relative overflow-hidden">
                        <div className="flex justify-between items-center border-b-2 border-dashed border-[var(--border-color)] pb-4 mb-4">
                            <h3 className="text-[10px] font-black uppercase tracking-widest text-[var(--text-main)] flex items-center gap-2"><Receipt size={16} className="text-emerald-500" /> Approved Bill</h3>
                            <span className="bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-md shadow-sm flex items-center gap-1"><Lock size={10} /> Locked</span>
                        </div>
                        <div className="space-y-3 mb-5">
                            {approvedItems.map((item, idx) => (
                                <div key={idx} className="flex justify-between items-start text-sm">
                                    <span className="font-bold text-[var(--text-muted)]">{item.description.replace('(Labor) ', '')}</span>
                                    <span className="font-mono font-bold text-[var(--text-muted)]">{formatCurrency((item.part_cost || 0) + (item.labor_cost || 0))}</span>
                                </div>
                            ))}
                        </div>
                        <div className="flex justify-between items-center pt-3 border-t border-[var(--border-color)]">
                            <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Approved Total</span>
                            <span className="text-lg font-black text-[var(--text-main)]">{formatCurrency(calcTotal(approvedItems))}</span>
                        </div>
                    </div>
                )}

                {/* --- ACTION REQUIRED: NEW PENDING ESTIMATE --- */}
                {pendingItems.length > 0 && ticket.estimate_status === 'sent' && (
                    <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl p-1 shadow-2xl shadow-indigo-500/30 animate-pop transform transition-all">
                        <div className="bg-[var(--bg-surface)] rounded-[20px] p-6 relative overflow-hidden">
                            <div className="absolute top-0 right-0 -mr-6 -mt-6 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>

                            <div className="flex justify-between items-center border-b-2 border-dashed border-[var(--border-color)] pb-4 mb-4 relative z-10">
                                <h3 className="text-[10px] font-black uppercase tracking-widest text-indigo-500 flex items-center gap-2"><AlertCircle size={16} /> Action Required</h3>
                            </div>

                            <p className="text-xs font-bold text-[var(--text-muted)] mb-4">The following additional parts/services are required to complete your repair:</p>

                            <div className="space-y-3 mb-6 relative z-10">
                                {pendingItems.map((item, idx) => (
                                    <div key={idx} className="flex justify-between items-start text-sm bg-[var(--bg-subtle)] p-3 rounded-lg border border-[var(--border-color)] shadow-inner">
                                        <div className="flex items-center gap-2">
                                            {item.description.startsWith('(Labor)') ? <Wrench size={14} className="text-amber-500" /> : <Package size={14} className="text-indigo-500" />}
                                            <span className="font-bold text-[var(--text-main)]">{item.description.replace('(Labor) ', '')}</span>
                                        </div>
                                        <span className="font-mono font-black text-[var(--text-main)]">{formatCurrency((item.part_cost || 0) + (item.labor_cost || 0))}</span>
                                    </div>
                                ))}
                            </div>

                            <div className="flex justify-between items-center pt-2 mb-6">
                                <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-main)]">Additional Amount (w/ Tax)</span>
                                <span className="text-3xl font-black text-indigo-600 dark:text-indigo-400 tracking-tight">{formatCurrency(calcTotal(pendingItems))}</span>
                            </div>

                            <button onClick={handleApprove} disabled={approving} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black h-14 rounded-xl flex items-center justify-center gap-3 active:scale-95 transition-all shadow-md shadow-indigo-500/20 text-base border-none relative z-10">
                                {approving ? <span className="loading loading-spinner"></span> : <>Approve Additional Cost <ArrowRight size={20} /></>}
                            </button>
                        </div>
                    </div>
                )}

                {/* --- TIMELINE --- */}
                <div className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-color)] shadow-sm p-6 sm:p-8">
                    <div className="flex justify-between items-center mb-8">
                        <h3 className="text-[10px] font-black uppercase text-[var(--text-muted)] tracking-widest">Live Tracker</h3>
                        {(ticket.status === 'waiting_parts' || ticket.is_backordered) && <span className="bg-orange-500 text-white text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-md shadow-md shadow-orange-500/30 animate-pulse">Parts Ordered</span>}
                    </div>

                    <div className="relative pl-2">
                        <div className="absolute top-2 bottom-6 left-[19px] w-1 bg-[var(--border-color)] rounded-full"></div>
                        {steps.map((step, index) => {
                            const status = getStepStatus(step.id);
                            const isLast = index === steps.length - 1;

                            let circleClass = "bg-[var(--bg-subtle)] border-4 border-[var(--border-color)] text-[var(--text-muted)] shadow-inner";
                            let textClass = "text-[var(--text-muted)] opacity-60";

                            if (status === 'complete') {
                                circleClass = "bg-indigo-600 border-4 border-indigo-100 dark:border-indigo-900/50 text-white shadow-md";
                                textClass = "text-[var(--text-main)] font-black";
                            } else if (status === 'current') {
                                circleClass = "bg-[var(--bg-surface)] border-4 border-indigo-500 text-indigo-500 ring-4 ring-indigo-500/20 shadow-lg scale-110";
                                textClass = "text-indigo-600 dark:text-indigo-400 font-black text-lg";
                            } else if (status === 'waiting') {
                                circleClass = "bg-[var(--bg-surface)] border-4 border-orange-500 text-orange-500 animate-pulse shadow-md";
                                textClass = "text-orange-500 font-black text-lg";
                            }

                            return (
                                <div key={step.id} className="relative flex items-start gap-6 pb-10 last:pb-0 group">
                                    {!isLast && (status === 'complete') && <div className="absolute top-10 left-[19px] w-1 h-[calc(100%-10px)] bg-indigo-500 z-0"></div>}
                                    <div className={`relative z-10 flex-none w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 ${circleClass}`}>
                                        {status === 'complete' || status === 'current' || status === 'waiting' ? step.icon : <div className="w-2 h-2 bg-[var(--border-color)] rounded-full" />}
                                    </div>
                                    <div className="flex-1 pt-2 transition-all duration-300">
                                        <div className={`text-base leading-none uppercase tracking-wide ${textClass}`}>{step.label}</div>
                                        {status === 'current' && <div className="text-[10px] uppercase font-black tracking-widest text-indigo-400 mt-2 animate-fade-in-up">Currently In Progress</div>}
                                        {status === 'waiting' && <div className="text-[10px] uppercase font-black tracking-widest text-orange-400 mt-2">Awaiting Delivery</div>}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="text-center text-[var(--text-muted)] text-[10px] font-black uppercase tracking-widest opacity-50 py-8">
                    © 2026 University Vacuum & Sewing
                </div>
            </div>
        </div>
    );
}