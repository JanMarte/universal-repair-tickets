import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, AlertTriangle, Hash } from 'lucide-react';
import { format } from 'date-fns';

export default function TicketCard({ ticket }) {
  const navigate = useNavigate();

  // Color Logic (Dark Text on Pastel Backgrounds)
  const getStatusColor = (status) => {
    switch (status) {
      case 'intake':
        return '!bg-sky-200 !text-sky-950 dark:!bg-sky-900/40 dark:!text-sky-200';
      case 'diagnosing':
        return '!bg-purple-200 !text-purple-950 dark:!bg-purple-900/40 dark:!text-purple-200';
      case 'waiting_parts':
        return '!bg-orange-200 !text-orange-950 dark:!bg-orange-900/40 dark:!text-orange-200';
      case 'repairing':
        return '!bg-yellow-200 !text-yellow-950 dark:!bg-yellow-900/40 dark:!text-yellow-200';
      case 'ready_pickup':
        return '!bg-emerald-200 !text-emerald-950 dark:!bg-emerald-900/40 dark:!text-emerald-200';
      case 'completed':
        return '!bg-slate-200 !text-slate-800 dark:!bg-slate-800 dark:!text-slate-300';
      default:
        return '!bg-gray-200 !text-gray-900';
    }
  };

  return (
    <div
      onClick={() => navigate(`/ticket/${ticket.id}`)}
      className="content-card group hover:scale-[1.02] cursor-pointer transition-all duration-300 relative overflow-hidden flex flex-col h-full p-6 pt-8"
    >
      {/* --- THE NEW GRADIENT TOP BORDER --- */}
      {/* Using the exact same gradient as your 'Create Ticket' button */}
      <div
        className="absolute top-0 left-0 right-0 h-2"
        style={{ background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)' }}
      ></div>

      <div className="flex justify-between items-start mb-3">
        {/* Status Badge */}
        <div className={`badge font-black uppercase text-[10px] tracking-wider py-3 border-none ${getStatusColor(ticket.status)}`}>
          {ticket.status.replace('_', ' ')}
        </div>

        {/* Ticket ID */}
        <span className="text-xs font-mono font-bold text-[var(--text-muted)]">
          #{ticket.id}
        </span>
      </div>

      <h3 className="text-lg font-black text-[var(--text-main)] mb-1 leading-tight group-hover:text-primary transition-colors">
        {ticket.brand} {ticket.model}
      </h3>

      {/* SERIAL NUMBER BADGE */}
      {ticket.serial_number && (
        <div className="flex items-center gap-1 text-xs font-mono text-[var(--text-muted)] mb-3 opacity-80">
          <Hash size={12} /> {ticket.serial_number}
        </div>
      )}

      {/* DESCRIPTION BOX */}
      <div className="bg-[var(--bg-subtle)] p-3 rounded-xl mb-4">
        <p className="text-sm text-[var(--text-muted)] font-medium line-clamp-2 leading-relaxed">
          {ticket.description}
        </p>
      </div>

      <div className="border-t border-[var(--border-color)] pt-3 flex justify-between items-center mt-auto">
        <div className="flex items-center gap-2 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">
          <Clock size={14} />
          {format(new Date(ticket.created_at), 'MMM d')}
        </div>

        {ticket.is_backordered && (
          <div className="tooltip tooltip-left" data-tip="Waiting on Parts">
            <AlertTriangle size={18} className="text-red-500 animate-pulse" />
          </div>
        )}
      </div>
    </div>
  );
}