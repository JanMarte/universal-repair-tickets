import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import {
    Clock, CheckCircle, AlertTriangle, Wrench, Search,
    User, Calendar, Hash
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useToast } from '../context/ToastProvider';

// 1. Refined Column Definitions to match the new classy theme
const COLUMNS = {
    intake: { title: 'In Queue', color: 'border-blue-500', textColor: 'text-blue-600 dark:text-blue-400', icon: Clock },
    diagnosing: { title: 'Diagnosing', color: 'border-purple-500', textColor: 'text-purple-600 dark:text-purple-400', icon: Search },
    waiting_parts: { title: 'Waiting Parts', color: 'border-orange-500', textColor: 'text-orange-600 dark:text-orange-400', icon: AlertTriangle },
    repairing: { title: 'Repairing', color: 'border-amber-500', textColor: 'text-amber-600 dark:text-amber-400', icon: Wrench },
    ready_pickup: { title: 'Ready', color: 'border-emerald-500', textColor: 'text-emerald-600 dark:text-emerald-400', icon: CheckCircle },
};

export default function KanbanBoard({ tickets, onTicketUpdate }) {
    const navigate = useNavigate();
    const { addToast } = useToast();
    const [columns, setColumns] = useState({});

    // Group tickets by status on load
    useEffect(() => {
        const newCols = {
            intake: [], diagnosing: [], waiting_parts: [], repairing: [], ready_pickup: []
        };

        tickets.forEach(ticket => {
            if (newCols[ticket.status]) {
                newCols[ticket.status].push(ticket);
            }
        });

        setColumns(newCols);
    }, [tickets]);

    const onDragEnd = async (result) => {
        const { source, destination, draggableId } = result;

        if (!destination) return;
        if (source.droppableId === destination.droppableId && source.index === destination.index) return;

        // Optimistic UI Update
        const startCol = columns[source.droppableId];
        const finishCol = columns[destination.droppableId];

        const startTasks = Array.from(startCol);
        const finishTasks = Array.from(finishCol);

        const [movedTicket] = startTasks.splice(source.index, 1);
        const updatedTicket = { ...movedTicket, status: destination.droppableId };

        finishTasks.splice(destination.index, 0, updatedTicket);

        const newColumns = {
            ...columns,
            [source.droppableId]: startTasks,
            [destination.droppableId]: finishTasks,
        };
        setColumns(newColumns);

        // Database Update
        const { error } = await supabase
            .from('tickets')
            .update({ status: destination.droppableId })
            .eq('id', draggableId);

        if (error) {
            addToast("Failed to move ticket", "error");
        } else {
            addToast(`Moved to ${COLUMNS[destination.droppableId].title}`, "success");
            if (onTicketUpdate) onTicketUpdate();
        }
    };

    return (
        <DragDropContext onDragEnd={onDragEnd}>
            <div className="flex h-full overflow-x-auto gap-4 pb-4 items-start min-w-[1000px]">
                {Object.entries(COLUMNS).map(([columnId, colConfig]) => {
                    const Icon = colConfig.icon;
                    return (
                        <div key={columnId} className="flex flex-col w-72 flex-shrink-0 max-h-full">

                            {/* Column Header - Clean top border to match the status */}
                            <div className={`flex items-center justify-between p-3 rounded-t-xl border-t-[4px] bg-[var(--bg-surface)] border-x border-b border-[var(--border-color)] shadow-sm mb-3 ${colConfig.color}`}>
                                <div className={`flex items-center gap-2 font-black text-xs uppercase tracking-wider ${colConfig.textColor}`}>
                                    <Icon size={16} strokeWidth={2.5} />
                                    {colConfig.title}
                                </div>
                                <span className="bg-[var(--bg-subtle)] px-2.5 py-1 rounded-md text-[10px] font-bold text-[var(--text-main)] shadow-inner">
                                    {columns[columnId]?.length || 0}
                                </span>
                            </div>

                            {/* Droppable Area */}
                            <Droppable droppableId={columnId}>
                                {(provided, snapshot) => (
                                    <div
                                        {...provided.droppableProps}
                                        ref={provided.innerRef}
                                        className={`flex-1 rounded-xl p-2 min-h-[150px] transition-colors ${snapshot.isDraggingOver ? 'bg-indigo-50/50 dark:bg-indigo-900/20 ring-2 ring-indigo-500/30' : 'bg-[var(--bg-subtle)]/30'
                                            }`}
                                    >
                                        {columns[columnId]?.map((ticket, index) => {
                                            // Determine card border based on backorder status OR column status
                                            const cardBorderColor = ticket.is_backordered ? 'border-red-500' : colConfig.color;

                                            return (
                                                <Draggable key={ticket.id.toString()} draggableId={ticket.id.toString()} index={index}>
                                                    {(provided, snapshot) => (
                                                        <div
                                                            ref={provided.innerRef}
                                                            {...provided.draggableProps}
                                                            {...provided.dragHandleProps}
                                                            onClick={() => navigate(`/ticket/${ticket.id}`)}
                                                            style={{ ...provided.draggableProps.style }}
                                                            className={`
                                                                mb-3 bg-[var(--bg-surface)] p-4 rounded-lg shadow-sm border border-[var(--border-color)] border-l-[4px] group hover:shadow-md transition-all cursor-grab active:cursor-grabbing flex flex-col
                                                                ${cardBorderColor}
                                                                ${snapshot.isDragging ? 'shadow-2xl ring-2 ring-indigo-500 rotate-2 scale-105 z-50' : ''}
                                                            `}
                                                        >
                                                            {/* Card Header */}
                                                            <div className="flex justify-between items-start mb-2">
                                                                <span className="font-mono text-[10px] font-bold text-[var(--text-muted)] bg-[var(--bg-subtle)] px-2 py-0.5 rounded shadow-inner flex items-center gap-1">
                                                                    <Hash size={10} /> {ticket.id}
                                                                </span>
                                                                {ticket.priority === 'high' && (
                                                                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.6)]" title="High Priority" />
                                                                )}
                                                            </div>

                                                            {/* Ticket Info */}
                                                            <div className="mb-3">
                                                                <h4 className="font-black text-sm text-[var(--text-main)] leading-tight mb-1 group-hover:text-primary transition-colors">
                                                                    {ticket.brand} {ticket.model}
                                                                </h4>
                                                                <p className="text-xs font-medium text-[var(--text-muted)] truncate">
                                                                    {ticket.customer_name}
                                                                </p>
                                                            </div>

                                                            {/* Backorder Badge injected right above the footer */}
                                                            {ticket.is_backordered && (
                                                                <div className="mb-3 inline-flex items-center gap-1 text-[9px] font-black tracking-widest text-red-600 bg-red-100 border border-red-200 dark:text-red-300 dark:bg-red-900/30 dark:border-red-900/50 px-2 py-1 rounded-md uppercase w-fit">
                                                                    <AlertTriangle size={12} />
                                                                    <span>Backordered</span>
                                                                </div>
                                                            )}

                                                            {/* Footer - Dashed Divider */}
                                                            <div className="flex items-center justify-between pt-3 border-t-2 border-dashed border-[var(--border-color)] mt-auto">
                                                                <div className="flex items-center gap-1.5 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
                                                                    <Calendar size={12} />
                                                                    {format(new Date(ticket.created_at), 'MMM d')}
                                                                </div>
                                                                {ticket.assignee_name ? (
                                                                    <div className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 flex items-center justify-center text-[10px] font-black border border-indigo-200 dark:border-indigo-800" title={`Assigned to ${ticket.assignee_name}`}>
                                                                        {ticket.assignee_name.charAt(0)}
                                                                    </div>
                                                                ) : (
                                                                    <div className="w-5 h-5 rounded-full border border-dashed border-[var(--border-color)] bg-[var(--bg-subtle)] flex items-center justify-center">
                                                                        <User size={10} className="text-[var(--text-muted)] opacity-50" />
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}
                                                </Draggable>
                                            );
                                        })}
                                        {provided.placeholder}
                                    </div>
                                )}
                            </Droppable>
                        </div>
                    );
                })}
            </div>
        </DragDropContext>
    );
}