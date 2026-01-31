import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, AlertTriangle, Hash } from 'lucide-react';
import { format } from 'date-fns';

export default function TicketCard({ ticket }) {
  const navigate = useNavigate();

  // 1. SOLID GRADIENT (Light Mode) vs GLOW (Dark Mode)
  const getStatusStyles = (status) => {
    switch (status) {
      case 'intake':
        return 'bg-gradient-to-r from-blue-600 to-blue-500 text-white border-blue-700 shadow-blue-200 dark:shadow-none dark:bg-blue-900/40 dark:from-transparent dark:to-transparent dark:text-blue-200 dark:border-blue-800';
      case 'diagnosing':
        return 'bg-gradient-to-r from-purple-600 to-purple-500 text-white border-purple-700 shadow-purple-200 dark:shadow-none dark:bg-purple-900/40 dark:from-transparent dark:to-transparent dark:text-purple-200 dark:border-purple-800';
      case 'waiting_parts':
        return 'bg-gradient-to-r from-orange-600 to-orange-500 text-white border-orange-700 shadow-orange-200 dark:shadow-none dark:bg-orange-900/40 dark:from-transparent dark:to-transparent dark:text-orange-200 dark:border-orange-800';
      case 'repairing':
        return 'bg-gradient-to-r from-amber-500 to-amber-400 text-white border-amber-600 shadow-amber-200 dark:shadow-none dark:bg-amber-900/40 dark:from-transparent dark:to-transparent dark:text-amber-200 dark:border-amber-800';
      case 'ready_pickup':
        return 'bg-gradient-to-r from-emerald-600 to-emerald-500 text-white border-emerald-700 shadow-emerald-200 dark:shadow-none dark:bg-emerald-900/40 dark:from-transparent dark:to-transparent dark:text-emerald-200 dark:border-emerald-800';
      case 'completed':
        return 'bg-gradient-to-r from-slate-600 to-slate-500 text-white border-slate-700 shadow-slate-200 dark:shadow-none dark:bg-slate-800 dark:from-transparent dark:to-transparent dark:text-slate-400 dark:border-slate-700';
      default:
        return 'bg-gray-600 text-white';
    }
  };

  // 2. Matching Top Borders
  const getBorderGradient = (status, isBackordered) => {
    if (isBackordered) return 'linear-gradient(135deg, #f97316 0%, #ef4444 100%)';

    switch (status) {
      case 'intake': return 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)';
      case 'diagnosing': return 'linear-gradient(135deg, #a855f7 0%, #7e22ce 100%)';
      case 'waiting_parts': return 'linear-gradient(135deg, #f97316 0%, #c2410c 100%)';
      case 'repairing': return 'linear-gradient(135deg, #eab308 0%, #ca8a04 100%)';
      case 'ready_pickup': return 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
      case 'completed': return 'linear-gradient(135deg, #94a3b8 0%, #475569 100%)';
      default: return 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)';
    }
  };

  return (
    <div
      onClick={() => navigate(`/ticket/${ticket.id}`)}
      className="content-card group hover:scale-[1.02] cursor-pointer transition-all duration-300 relative overflow-hidden flex flex-col h-full p-6 pt-8 border-[var(--border-color)]"
    >
      {/* Top Border Gradient */}
      <div
        className="absolute top-0 left-0 right-0 h-2"
        style={{ background: getBorderGradient(ticket.status, ticket.is_backordered) }}
      ></div>

      <div className="flex justify-between items-center mb-4">
        {/* STATUS PILL */}
        <div className={`inline-flex items-center justify-center px-3 py-1.5 border font-black uppercase text-[10px] tracking-widest rounded-md shadow-sm transition-all ${getStatusStyles(ticket.status)}`}>
          {ticket.status.replace('_', ' ')}
        </div>

        {/* Ticket ID */}
        <span className="text-xs font-mono font-bold text-[var(--text-muted)] opacity-70">
          #{ticket.id}
        </span>
      </div>

      <h3 className="text-lg font-black text-[var(--text-main)] mb-1 leading-tight group-hover:text-primary transition-colors">
        {ticket.brand} {ticket.model}
      </h3>

      {/* Serial Number */}
      {ticket.serial_number && (
        <div className="flex items-center gap-1 text-xs font-mono text-[var(--text-muted)] mb-4 opacity-80">
          <Hash size={12} /> {ticket.serial_number}
        </div>
      )}

      {/* Description Box */}
      <div className="bg-[var(--bg-subtle)] p-3 rounded-xl mb-4 border border-transparent group-hover:border-[var(--border-color)] transition-colors">
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
          <div className="flex items-center gap-1 text-xs font-bold text-red-600 bg-red-100 border border-red-200 dark:text-red-300 dark:bg-red-900/20 dark:border-red-900/50 px-2 py-1 rounded-full">
            <AlertTriangle size={14} />
            {/* UPDATED LABEL HERE */}
            <span>VENDOR BACKORDER</span>
          </div>
        )}
      </div>
    </div>
  );
}