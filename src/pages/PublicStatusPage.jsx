import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { CheckCircle, Wrench, Package, ArrowRight, MapPin, Phone, Moon, Sun, Wind, Scissors, Zap, AlertCircle } from 'lucide-react';
import { formatCurrency } from '../utils';
import confetti from 'canvas-confetti';

export default function PublicStatusPage() {
    const { id } = useParams();
    const [ticket, setTicket] = useState(null);
    const [loading, setLoading] = useState(true);
    const [approving, setApproving] = useState(false);

    // Theme State
    const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');

    useEffect(() => {
        fetchTicket();
    }, [id]);

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        if (theme === 'dark') document.documentElement.classList.add('dark');
        else document.documentElement.classList.remove('dark');
        localStorage.setItem('theme', theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme(prev => prev === 'light' ? 'dark' : 'light');
    };

    async function fetchTicket() {
        const { data, error } = await supabase
            .from('tickets')
            .select('*')
            .eq('id', id)
            .single();

        if (error) console.error('Error fetching ticket:', error);
        setTicket(data);
        setLoading(false);
    }

    const handleApprove = async () => {
        setApproving(true);
        const { error } = await supabase
            .from('tickets')
            .update({ status: 'waiting_parts' })
            .eq('id', id);

        if (!error) {
            confetti({
                particleCount: 150,
                spread: 70,
                origin: { y: 0.6 },
                colors: ['#6366f1', '#8b5cf6', '#ec4899']
            });
            setTicket(prev => ({ ...prev, status: 'waiting_parts' }));
        }
        setApproving(false);
    };

    const getDeviceIcon = (ticket) => {
        const searchString = (ticket.model + ' ' + ticket.brand).toLowerCase();
        if (searchString.includes('sew') || searchString.includes('stitch')) {
            return <Scissors size={32} className="text-pink-500" />;
        }
        return <Wind size={32} className="text-indigo-500" />;
    };

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-[var(--bg-surface)] transition-colors">
            <span className="loading loading-spinner text-primary loading-lg"></span>
        </div>
    );

    if (!ticket) return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--bg-surface)] text-[var(--text-muted)] gap-4">
            <AlertCircle size={48} className="opacity-50" />
            <h1 className="font-bold text-lg text-[var(--text-main)]">Ticket Not Found</h1>
        </div>
    );

    // --- STATUS LOGIC & CONFIG ---
    const steps = [
        { id: 'intake', label: 'Received', icon: <CheckCircle size={18} /> },
        { id: 'diagnosing', label: 'Diagnosing', icon: <Wrench size={18} /> },
        { id: 'repairing', label: 'Repairing', icon: <Zap size={18} /> },
        { id: 'ready_pickup', label: 'Ready', icon: <Package size={18} /> }
    ];

    const getStepStatus = (stepId) => {
        const order = ['intake', 'diagnosing', 'waiting_parts', 'repairing', 'ready_pickup', 'completed'];
        const currentIndex = order.indexOf(ticket.status);
        const stepIndex = order.indexOf(stepId);

        if (ticket.status === 'completed') return 'complete';
        if (ticket.status === 'waiting_parts' && stepId === 'repairing') return 'waiting';

        if (stepIndex < currentIndex) return 'complete';
        if (stepIndex === currentIndex) return 'current';
        return 'upcoming';
    };

    return (
        <div className="min-h-screen bg-[var(--bg-surface)] font-sans transition-colors duration-300 pb-20">

            {/* STICKY GLASS HEADER */}
            <div className="sticky top-0 z-50 px-6 py-4 flex justify-between items-center shadow-sm backdrop-blur-md bg-[var(--bg-surface)]/80 border-b border-[var(--border-color)] transition-colors">
                <div className="flex items-center gap-2">
                    <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
                        <Wrench size={20} fill="currentColor" />
                    </div>
                    <div>
                        <div className="font-black text-xl tracking-tight text-[var(--text-main)] leading-none">
                            Repair<span className="text-indigo-500">Shop</span>
                        </div>
                    </div>
                </div>

                {/* --- FIX: Large Touch Target (48px) --- */}
                <button
                    onClick={toggleTheme}
                    className="w-12 h-12 flex items-center justify-center rounded-full hover:bg-[var(--bg-subtle)] active:scale-90 transition-all touch-manipulation"
                >
                    {theme === 'light' ? <Moon size={24} className="text-slate-600" /> : <Sun size={24} className="text-yellow-400" />}
                </button>
            </div>

            <div className="max-w-md mx-auto p-6 space-y-6">

                {/* DEVICE CARD */}
                <div className="bg-[var(--bg-subtle)] rounded-3xl p-8 shadow-sm border border-[var(--border-color)] text-center relative overflow-hidden transition-colors">
                    <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500"></div>

                    <div className="w-20 h-20 mx-auto bg-[var(--bg-surface)] rounded-full flex items-center justify-center mb-5 shadow-inner border border-[var(--border-color)]">
                        {getDeviceIcon(ticket)}
                    </div>

                    <h1 className="text-3xl font-black text-[var(--text-main)] mb-2 tracking-tight">
                        {ticket.brand} <span className="text-indigo-500">{ticket.model}</span>
                    </h1>
                    <div className="inline-block px-4 py-1.5 bg-[var(--bg-surface)] rounded-full mt-2 border border-[var(--border-color)] shadow-sm">
                        <p className="text-xs font-bold text-[var(--text-muted)] font-mono tracking-wide">
                            #{ticket.id} • {ticket.serial_number || 'NO SERIAL'}
                        </p>
                    </div>
                </div>

                {/* --- NEW CUSTOM TIMELINE (High Visibility) --- */}
                <div className="bg-[var(--bg-subtle)] rounded-3xl p-8 shadow-sm border border-[var(--border-color)] transition-colors">
                    <div className="flex justify-between items-center mb-8">
                        <h3 className="text-xs font-black uppercase text-[var(--text-muted)] tracking-widest">Live Status</h3>
                        {ticket.status === 'waiting_parts' && (
                            <span className="badge badge-warning text-xs font-bold animate-pulse text-white shadow-lg shadow-orange-500/30">Part Ordered</span>
                        )}
                    </div>

                    <div className="relative pl-2">
                        {/* The Vertical Line (Background Track) */}
                        <div className="absolute top-2 bottom-6 left-[19px] w-1 bg-slate-200 dark:bg-slate-700 rounded-full"></div>

                        {steps.map((step, index) => {
                            const status = getStepStatus(step.id);
                            const isLast = index === steps.length - 1;

                            // Styles based on status
                            let circleClass = "bg-[var(--bg-surface)] border-4 border-slate-200 dark:border-slate-700 text-slate-300"; // Default
                            let textClass = "text-[var(--text-muted)] opacity-60";
                            let lineFillHeight = "h-0"; // No fill by default

                            if (status === 'complete') {
                                circleClass = "bg-indigo-600 border-4 border-indigo-100 dark:border-indigo-900/50 text-white shadow-md";
                                textClass = "text-[var(--text-main)] font-bold";
                                lineFillHeight = "h-full"; // Full line for completed
                            } else if (status === 'current') {
                                circleClass = "bg-indigo-600 border-4 border-indigo-100 dark:border-indigo-900/50 text-white ring-4 ring-indigo-500/20 shadow-lg shadow-indigo-500/40 scale-110";
                                textClass = "text-indigo-600 dark:text-indigo-400 font-black text-lg";
                            } else if (status === 'waiting') {
                                circleClass = "bg-orange-500 border-4 border-orange-100 dark:border-orange-900/50 text-white animate-pulse";
                                textClass = "text-orange-500 font-bold";
                            }

                            return (
                                <div key={step.id} className="relative flex items-start gap-6 pb-10 last:pb-0 group">

                                    {/* The Line Fill (Active Progress) */}
                                    {/* Only show fill connecting to NEXT step if this one is complete */}
                                    {!isLast && (status === 'complete') && (
                                        <div className="absolute top-10 left-[19px] w-1 h-[calc(100%-10px)] bg-indigo-500 z-0"></div>
                                    )}

                                    {/* The Circle (Z-Index 10 to sit on top of lines) */}
                                    <div className={`relative z-10 flex-none w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 ${circleClass}`}>
                                        {status === 'complete' || status === 'current' || status === 'waiting' ? step.icon : <div className="w-2.5 h-2.5 bg-current rounded-full opacity-50" />}
                                    </div>

                                    {/* Text Content */}
                                    <div className="flex-1 pt-2 transition-all duration-300">
                                        <div className={`text-base leading-none ${textClass}`}>
                                            {step.label}
                                        </div>
                                        {status === 'current' && (
                                            <div className="text-[10px] uppercase font-bold text-indigo-400 mt-1.5 animate-fade-in-up">
                                                Currently In Progress
                                            </div>
                                        )}
                                        {status === 'waiting' && (
                                            <div className="text-[10px] uppercase font-bold text-orange-400 mt-1.5">
                                                Awaiting Delivery
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* APPROVAL CARD */}
                {(ticket.status === 'diagnosing' || ticket.status === 'intake') && ticket.estimate_total > 0 && (
                    <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-3xl p-1 shadow-2xl shadow-indigo-500/40 animate-fade-in-up transform transition-all hover:scale-[1.02]">
                        <div className="bg-slate-900/20 backdrop-blur-md rounded-[20px] p-8 text-white relative overflow-hidden">
                            <div className="absolute top-0 right-0 -mr-6 -mt-6 w-32 h-32 bg-white opacity-10 rounded-full blur-3xl"></div>

                            <div className="flex justify-between items-end mb-8 relative z-10">
                                <div>
                                    <p className="text-indigo-200 text-xs font-bold uppercase tracking-widest mb-2">Repair Estimate</p>
                                    <div className="text-6xl font-black tracking-tighter">{formatCurrency(ticket.estimate_total)}</div>
                                </div>
                            </div>

                            <button
                                onClick={handleApprove}
                                disabled={approving}
                                className="w-full bg-white text-indigo-900 font-black h-16 rounded-2xl flex items-center justify-center gap-3 hover:bg-indigo-50 active:scale-95 transition-all shadow-xl text-lg"
                            >
                                {approving ? <span className="loading loading-spinner text-indigo-600"></span> : <>Approve Repair <ArrowRight size={24} /></>}
                            </button>
                            <p className="text-center text-indigo-200 text-[10px] mt-4 font-medium opacity-80">
                                Secure one-tap approval. No account required.
                            </p>
                        </div>
                    </div>
                )}

                {/* CONTACT GRID */}
                <div className="grid grid-cols-2 gap-4">
                    <a href="tel:5551234567" className="bg-[var(--bg-subtle)] p-6 rounded-3xl border border-[var(--border-color)] flex flex-col items-center justify-center gap-3 hover:border-indigo-500 transition-all hover:shadow-md group">
                        <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm">
                            <Phone size={24} />
                        </div>
                        <span className="font-bold text-[var(--text-main)] text-sm">Call Us</span>
                    </a>
                    <a href="https://maps.google.com" target="_blank" rel="noreferrer" className="bg-[var(--bg-subtle)] p-6 rounded-3xl border border-[var(--border-color)] flex flex-col items-center justify-center gap-3 hover:border-blue-500 transition-all hover:shadow-md group">
                        <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm">
                            <MapPin size={24} />
                        </div>
                        <span className="font-bold text-[var(--text-main)] text-sm">Directions</span>
                    </a>
                </div>

                <div className="text-center text-[var(--text-muted)] text-xs font-bold uppercase tracking-widest opacity-50 py-8">
                    © 2026 RepairShop Inc.
                </div>

            </div>
        </div>
    );
}