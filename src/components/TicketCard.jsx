import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, AlertTriangle, Hash } from 'lucide-react';
import { format } from 'date-fns';

export default function TicketCard({ ticket }) {
  const navigate = useNavigate();

  // Unified Theme System
  const getStatusTheme = (status, isBackordered) => {
    if (isBackordered) {
      return {
        border: 'bg-red-500',
        pill: 'bg-red-500 text-white shadow-md shadow-red-500/30',
        descBorder: 'border-red-400',
      };
    }

    switch (status) {
      case 'intake':
        return { border: 'bg-blue-500', pill: 'bg-blue-500 text-white shadow-md shadow-blue-500/30', descBorder: 'border-blue-400' };
      case 'diagnosing':
        return { border: 'bg-purple-500', pill: 'bg-purple-500 text-white shadow-md shadow-purple-500/30', descBorder: 'border-purple-400' };
      case 'waiting_parts':
        return { border: 'bg-orange-500', pill: 'bg-orange-500 text-white shadow-md shadow-orange-500/30', descBorder: 'border-orange-400' };
      case 'repairing':
        return { border: 'bg-amber-500', pill: 'bg-amber-500 text-white shadow-md shadow-amber-500/30', descBorder: 'border-amber-400' };
      case 'ready_pickup':
        return { border: 'bg-emerald-500', pill: 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30', descBorder: 'border-emerald-400' };
      case 'completed':
        return { border: 'bg-slate-500', pill: 'bg-slate-500 text-white shadow-md shadow-slate-500/30', descBorder: 'border-slate-400' };
      default:
        return { border: 'bg-indigo-500', pill: 'bg-indigo-500 text-white shadow-md shadow-indigo-500/30', descBorder: 'border-indigo-400' };
    }
  };

  const theme = getStatusTheme(ticket.status, ticket.is_backordered);

  return (
    <div
      onClick={() => navigate(`/ticket/${ticket.id}`)}
      className="content-card group hover:scale-[1.02] cursor-pointer transition-all duration-300 relative overflow-hidden flex flex-col h-full p-6 pt-8 border border-[var(--border-color)] bg-[var(--bg-surface)]"
    >
      {/* Top Border */}
      <div className={`absolute top-0 left-0 right-0 h-2 ${theme.border}`}></div>

      <div className="flex justify-between items-center mb-5">
        {/* STATUS PILL */}
        <div className={`inline-flex items-center justify-center px-3 py-1.5 font-black uppercase text-[10px] tracking-widest rounded-md transition-all ${theme.pill}`}>
          {ticket.status.replace('_', ' ')}
        </div>

        {/* Ticket ID */}
        <span className="text-xs font-mono font-bold text-[var(--text-muted)] opacity-70">
          #{ticket.id}
        </span>
      </div>

      <div className="mb-4">
        <h3 className="text-lg font-black text-[var(--text-main)] mb-1 leading-tight group-hover:text-primary transition-colors">
          {ticket.brand} {ticket.model}
        </h3>

        {/* Serial Number */}
        {ticket.serial_number && (
          <div className="flex items-center gap-1 text-xs font-mono text-[var(--text-muted)] opacity-80">
            <Hash size={12} /> {ticket.serial_number}
          </div>
        )}
      </div>

      {/* Description Box: 
          - Added mb-6 to guarantee space between this and the dashed divider 
      */}
      <div className={`p-3.5 mb-6 rounded-lg border-l-[3px] text-sm font-medium text-[var(--text-muted)] bg-[var(--bg-subtle)] shadow-inner ${theme.descBorder}`}>
        {/* Line Clamp added here: 
            Limits text to 2 lines and adds "..." if it exceeds that length 
        */}
        <p className="line-clamp-2" title={ticket.description}>
          {ticket.description || "No description provided."}
        </p>
      </div>

      {/* Footer - Removed conflicting mt-5, mt-auto pushes it gracefully to the bottom */}
      <div className="border-t-2 border-dashed border-[var(--border-color)] pt-4 flex justify-between items-center mt-auto">
        <div className="flex items-center gap-2 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">
          <Clock size={14} />
          {format(new Date(ticket.created_at), 'MMM d')}
        </div>

        {ticket.is_backordered && (
          <div className="flex items-center gap-1 text-[10px] font-black tracking-widest text-red-600 bg-red-100 border border-red-200 dark:text-red-300 dark:bg-red-900/30 dark:border-red-900/50 px-2 py-1.5 rounded-md uppercase">
            <AlertTriangle size={14} />
            <span>Backordered</span>
          </div>
        )}
      </div>
    </div>
  );
}