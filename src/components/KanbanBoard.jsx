import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, AlertTriangle, Hash, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '../supabaseClient';
import { useToast } from '../context/ToastProvider';

// Using native HTML5 Drag and Drop for optimal performance and zero dependencies
export default function KanbanBoard({ tickets, onTicketUpdate }) {
    const navigate = useNavigate();
    const { addToast } = useToast();

    // Define the columns based on your specific repair pipeline
    const columns = [
        { id: 'intake', title: 'In Queue', border: 'border-t-blue-500', text: 'text-blue-600 dark:text-blue-400' },
        { id: 'diagnosing', title: 'Diagnosing', border: 'border-t-purple-500', text: 'text-purple-600 dark:text-purple-400' },
        { id: 'waiting_parts', title: 'Waiting Parts', border: 'border-t-orange-500', text: 'text-orange-600 dark:text-orange-400' },
        { id: 'repairing', title: 'Repairing', border: 'border-t-amber-500', text: 'text-amber-600 dark:text-amber-400' },
        { id: 'ready_pickup', title: 'Ready for Pickup', border: 'border-t-emerald-500', text: 'text-emerald-600 dark:text-emerald-400' }
    ];

    const handleDragStart = (e, ticketId) => {
        e.dataTransfer.setData('ticketId', ticketId);
        // Add a slight transparency effect while dragging
        setTimeout(() => { e.target.style.opacity = '0.5'; }, 0);
    };

    const handleDragEnd = (e) => {
        e.target.style.opacity = '1';
    };

    const handleDragOver = (e) => {
        e.preventDefault(); // Necessary to allow dropping
    };

    const handleDrop = async (e, newStatus) => {
        e.preventDefault();
        const ticketId = e.dataTransfer.getData('ticketId');

        if (!ticketId) return;

        const ticket = tickets.find(t => t.id.toString() === ticketId);
        if (ticket && ticket.status !== newStatus) {
            // Optimistic UI Update can be handled via parent, but we'll trigger the DB update here
            const { error } = await supabase
                .from('tickets')
                .update({ status: newStatus })
                .eq('id', ticketId);

            if (error) {
                addToast("Failed to move ticket", "error");
            } else {
                // Log the movement
                await supabase.from('audit_logs').insert([{
                    ticket_id: ticketId,
                    actor_name: 'Kanban Board',
                    action: 'STATUS CHANGE',
                    details: `Moved from ${ticket.status} to ${newStatus}`
                }]);
                addToast("Status updated", "success");
                onTicketUpdate(); // Tell parent to fetch new data
            }
        }
    };

    return (
        <div className="flex gap-4 h-full pb-4 items-start min-w-max">
            {columns.map(column => {
                const columnTickets = tickets.filter(t => t.status === column.id);

                return (
                    <div
                        key={column.id}
                        className="flex flex-col w-80 max-h-full bg-[var(--bg-subtle)] rounded-2xl border border-[var(--border-color)] shadow-inner overflow-hidden"
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, column.id)}
                    >
                        {/* Column Header */}
                        <div className={`p-4 bg-[var(--bg-surface)] border-b-2 border-dashed border-[var(--border-color)] border-t-[4px] ${column.border} shadow-sm shrink-0 flex justify-between items-center`}>
                            <h2 className={`text-xs font-black uppercase tracking-widest ${column.text}`}>
                                {column.title}
                            </h2>
                            <span className="bg-[var(--bg-subtle)] text-[var(--text-muted)] text-[10px] font-black px-2 py-0.5 rounded-full border border-[var(--border-color)] shadow-inner">
                                {columnTickets.length}
                            </span>
                        </div>

                        {/* Column Body / Drop Zone */}
                        <div className="flex-1 p-3 overflow-y-auto custom-scrollbar space-y-3 min-h-[150px]">
                            {columnTickets.length === 0 && (
                                <div className="h-full w-full flex items-center justify-center border-2 border-dashed border-[var(--border-color)] rounded-xl opacity-50">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Drop Here</span>
                                </div>
                            )}

                            {columnTickets.map(ticket => {
                                const isUrgent = ticket.is_backordered || ticket.estimate_status === 'approved';

                                return (
                                    <div
                                        key={ticket.id}
                                        draggable
                                        onDragStart={(e) => handleDragStart(e, ticket.id)}
                                        onDragEnd={handleDragEnd}
                                        onClick={() => navigate(`/ticket/${ticket.id}`)}
                                        className={`bg-[var(--bg-surface)] p-3.5 rounded-xl border cursor-grab hover:shadow-md transition-all active:cursor-grabbing group relative overflow-hidden
                                            ${isUrgent ? 'border-red-300 dark:border-red-800 ring-1 ring-red-500/20 shadow-sm' : 'border-[var(--border-color)] shadow-sm hover:border-indigo-300'}
                                        `}
                                    >
                                        {/* Status Indicator Bar */}
                                        <div className={`absolute left-0 top-0 bottom-0 w-1 ${isUrgent ? 'bg-red-500' : 'bg-indigo-500 opacity-50 group-hover:opacity-100 transition-opacity'}`}></div>

                                        <div className="pl-2">
                                            <div className="flex justify-between items-start mb-2">
                                                <div className="flex items-center gap-1 text-[9px] font-mono font-black text-[var(--text-muted)] bg-[var(--bg-subtle)] px-1.5 py-0.5 rounded shadow-inner border border-[var(--border-color)]">
                                                    <Hash size={10} className="text-indigo-400" /> {ticket.id}
                                                </div>
                                                <div className="text-[9px] font-bold text-[var(--text-muted)] flex items-center gap-1">
                                                    <Clock size={10} /> {format(new Date(ticket.created_at), 'MMM d')}
                                                </div>
                                            </div>

                                            <h4 className="font-black text-sm text-[var(--text-main)] leading-tight mb-1 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                                {ticket.brand} {ticket.model}
                                            </h4>

                                            <p className="text-xs font-bold text-[var(--text-muted)] truncate mb-3">
                                                {ticket.customer_name}
                                            </p>

                                            {isUrgent && (
                                                <div className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-red-500 bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded-md mb-2">
                                                    <AlertTriangle size={10} /> Action Needed
                                                </div>
                                            )}

                                            <div className="flex justify-end border-t border-dashed border-[var(--border-color)] pt-2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-500 flex items-center">
                                                    Open <ChevronRight size={12} />
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}