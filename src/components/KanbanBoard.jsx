import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import {
    Clock, CheckCircle, AlertTriangle, Wrench, Search,
    MoreHorizontal, User, Calendar
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useToast } from '../context/ToastProvider';

// Define our columns and their strict order
const COLUMNS = {
    intake: { title: 'In Queue', color: 'border-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/10', icon: <Clock size={16} className="text-blue-600" /> },
    diagnosing: { title: 'Diagnosing', color: 'border-purple-500', bg: 'bg-purple-50 dark:bg-purple-900/10', icon: <Search size={16} className="text-purple-600" /> },
    waiting_parts: { title: 'Waiting Parts', color: 'border-orange-500', bg: 'bg-orange-50 dark:bg-orange-900/10', icon: <AlertTriangle size={16} className="text-orange-600" /> },
    repairing: { title: 'Repairing', color: 'border-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/10', icon: <Wrench size={16} className="text-amber-600" /> },
    ready_pickup: { title: 'Ready', color: 'border-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/10', icon: <CheckCircle size={16} className="text-emerald-600" /> },
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
            } else {
                // Fallback for 'completed' or unknown statuses if you want to show them
                // For now, we only show active statuses on the board
            }
        });

        setColumns(newCols);
    }, [tickets]);

    const onDragEnd = async (result) => {
        const { source, destination, draggableId } = result;

        // Dropped outside a valid column?
        if (!destination) return;

        // Dropped in the same place?
        if (source.droppableId === destination.droppableId && source.index === destination.index) return;

        // 1. Optimistic UI Update (Make it feel instant)
        const startCol = columns[source.droppableId];
        const finishCol = columns[destination.droppableId];

        // Create copies of the arrays
        const startTasks = Array.from(startCol);
        const finishTasks = Array.from(finishCol);

        // Remove from old column
        const [movedTicket] = startTasks.splice(source.index, 1);

        // Update the ticket's internal status object so it renders correctly immediately
        const updatedTicket = { ...movedTicket, status: destination.droppableId };

        // Add to new column
        finishTasks.splice(destination.index, 0, updatedTicket);

        // Set state
        const newColumns = {
            ...columns,
            [source.droppableId]: startTasks,
            [destination.droppableId]: finishTasks,
        };
        setColumns(newColumns);

        // 2. Database Update
        const { error } = await supabase
            .from('tickets')
            .update({ status: destination.droppableId })
            .eq('id', draggableId);

        if (error) {
            addToast("Failed to move ticket", "error");
            // Ideally, revert state here (omitted for brevity)
        } else {
            addToast(`Moved to ${COLUMNS[destination.droppableId].title}`, "success");

            // Log this action securely
            // (You can reuse your logAudit logic here if you pass it down as a prop)

            // Notify parent to refresh data if needed
            if (onTicketUpdate) onTicketUpdate();
        }
    };

    return (
        <DragDropContext onDragEnd={onDragEnd}>
            <div className="flex h-full overflow-x-auto gap-4 pb-4 items-start min-w-[1000px]"> {/* Min width ensures scrolling on small screens */}
                {Object.entries(COLUMNS).map(([columnId, colConfig]) => (
                    <div key={columnId} className="flex flex-col w-72 flex-shrink-0 max-h-full">

                        {/* Column Header */}
                        <div className={`flex items-center justify-between p-3 rounded-t-xl border-t-4 bg-[var(--bg-surface)] border-x border-b border-[var(--border-color)] shadow-sm ${colConfig.color} mb-2`}>
                            <div className="flex items-center gap-2 font-black text-xs uppercase tracking-wider text-[var(--text-muted)]">
                                {colConfig.icon}
                                {colConfig.title}
                            </div>
                            <span className="bg-[var(--bg-subtle)] px-2 py-0.5 rounded-md text-[10px] font-bold text-[var(--text-main)]">
                                {columns[columnId]?.length || 0}
                            </span>
                        </div>

                        {/* Droppable Area */}
                        <Droppable droppableId={columnId}>
                            {(provided, snapshot) => (
                                <div
                                    {...provided.droppableProps}
                                    ref={provided.innerRef}
                                    className={`flex-1 rounded-xl p-2 min-h-[150px] transition-colors ${snapshot.isDraggingOver ? 'bg-indigo-50/50 dark:bg-indigo-900/10 ring-2 ring-indigo-500/20' : 'bg-[var(--bg-subtle)]/50'
                                        }`}
                                >
                                    {columns[columnId]?.map((ticket, index) => (
                                        <Draggable key={ticket.id.toString()} draggableId={ticket.id.toString()} index={index}>
                                            {(provided, snapshot) => (
                                                <div
                                                    ref={provided.innerRef}
                                                    {...provided.draggableProps}
                                                    {...provided.dragHandleProps}
                                                    onClick={() => navigate(`/ticket/${ticket.id}`)}
                                                    style={{ ...provided.draggableProps.style }}
                                                    className={`
                                                        mb-3 bg-[var(--bg-surface)] p-4 rounded-xl shadow-sm border border-[var(--border-color)] group hover:shadow-md transition-all cursor-grab active:cursor-grabbing
                                                        ${snapshot.isDragging ? 'shadow-2xl ring-2 ring-indigo-500 rotate-2 scale-105 z-50' : ''}
                                                    `}
                                                >
                                                    <div className="flex justify-between items-start mb-2">
                                                        <span className="font-mono text-[10px] font-bold text-[var(--text-muted)] bg-[var(--bg-subtle)] px-1.5 py-0.5 rounded">
                                                            #{ticket.id}
                                                        </span>
                                                        {ticket.priority === 'high' && (
                                                            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" title="High Priority" />
                                                        )}
                                                    </div>

                                                    <h4 className="font-bold text-sm text-[var(--text-main)] leading-tight mb-1">
                                                        {ticket.brand} {ticket.model}
                                                    </h4>
                                                    <p className="text-xs text-[var(--text-muted)] truncate mb-3">
                                                        {ticket.customer_name}
                                                    </p>

                                                    <div className="flex items-center justify-between pt-2 border-t border-[var(--border-color)]">
                                                        <div className="flex items-center gap-1 text-[10px] font-bold text-[var(--text-muted)]">
                                                            <Calendar size={10} />
                                                            {format(new Date(ticket.created_at), 'MMM d')}
                                                        </div>
                                                        {ticket.assignee_name ? (
                                                            <div className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 flex items-center justify-center text-[9px] font-black" title={`Assigned to ${ticket.assignee_name}`}>
                                                                {ticket.assignee_name.charAt(0)}
                                                            </div>
                                                        ) : (
                                                            <div className="w-5 h-5 rounded-full border border-dashed border-slate-300 flex items-center justify-center">
                                                                <User size={10} className="text-slate-300" />
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </Draggable>
                                    ))}
                                    {provided.placeholder}
                                </div>
                            )}
                        </Droppable>
                    </div>
                ))}
            </div>
        </DragDropContext>
    );
}