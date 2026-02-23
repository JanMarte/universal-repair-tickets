import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, Phone, User, Hash, AlertTriangle, ChevronRight, CheckCircle, AlertCircle, Wrench, Package } from 'lucide-react';
import { format } from 'date-fns';
import { formatPhoneNumber } from '../utils';

export default function TicketCard({ ticket }) {
  const navigate = useNavigate();

  const getStatusConfig = (status, isBackordered) => {
    if (isBackordered) return { color: 'red', border: 'border-l-red-500', bg: 'bg-red-500', icon: <AlertTriangle size={14} />, text: 'Vendor Backorder' };

    switch (status) {
      case 'intake': return { color: 'blue', border: 'border-l-blue-500', bg: 'bg-blue-500', icon: <Package size={14} />, text: 'In Queue' };
      case 'diagnosing': return { color: 'purple', border: 'border-l-purple-500', bg: 'bg-purple-500', icon: <AlertCircle size={14} />, text: 'Diagnosing' };
      case 'waiting_parts': return { color: 'orange', border: 'border-l-orange-500', bg: 'bg-orange-500', icon: <Clock size={14} />, text: 'Waiting on Parts' };
      case 'repairing': return { color: 'amber', border: 'border-l-amber-500', bg: 'bg-amber-500', icon: <Wrench size={14} />, text: 'Repairing' };
      case 'ready_pickup': return { color: 'emerald', border: 'border-l-emerald-500', bg: 'bg-emerald-500', icon: <CheckCircle size={14} />, text: 'Ready for Pickup' };
      case 'completed': return { color: 'slate', border: 'border-l-slate-500', bg: 'bg-slate-500', icon: <CheckCircle size={14} />, text: 'Completed' };
      default: return { color: 'indigo', border: 'border-l-indigo-500', bg: 'bg-indigo-500', icon: <Wrench size={14} />, text: status.replace('_', ' ') };
    }
  };

  const config = getStatusConfig(ticket.status, ticket.is_backordered);
  const isUrgent = ticket.is_backordered || ticket.estimate_status === 'approved';

  return (
    <div
      onClick={() => navigate(`/ticket/${ticket.id}`)}
      className={`bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-color)] border-l-[4px] ${config.border} shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer group flex flex-col h-full hover:-translate-y-1 relative overflow-hidden`}
    >
      {isUrgent && (
        <div className="absolute top-0 right-0 w-16 h-16 overflow-hidden rounded-tr-xl pointer-events-none">
          <div className="absolute transform rotate-45 bg-red-500 text-white text-[8px] font-black uppercase tracking-widest py-1 right-[-35px] top-[15px] w-[120px] text-center shadow-md z-10">
            Action Req
          </div>
        </div>
      )}

      <div className="p-5 flex-1">
        {/* Header Row */}
        <div className="flex justify-between items-start mb-4">
          <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-widest text-white shadow-md ${config.bg} shadow-${config.color}-500/30`}>
            {config.icon} {config.text}
          </div>
          <div className="text-[10px] font-bold text-[var(--text-muted)] flex items-center gap-1">
            <Clock size={12} /> {format(new Date(ticket.created_at), 'MMM d')}
          </div>
        </div>

        {/* Device Info */}
        <div className="mb-4 pr-6">
          <h3 className="font-black text-xl text-[var(--text-main)] leading-tight mb-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
            {ticket.brand} <span className="text-indigo-500">{ticket.model}</span>
          </h3>
        </div>

        {/* Recessed Customer & Ticket Info */}
        <div className="p-3.5 bg-[var(--bg-subtle)] rounded-xl border border-[var(--border-color)] shadow-inner flex flex-col gap-2.5 mt-auto">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2 text-xs font-bold text-[var(--text-main)] truncate">
              <User size={14} className="text-indigo-500 flex-none" />
              <span className="truncate">{ticket.customer_name}</span>
            </div>
            <div className="flex items-center gap-1 text-[10px] font-mono font-black text-[var(--text-muted)] bg-[var(--bg-surface)] px-2 py-0.5 rounded shadow-sm border border-[var(--border-color)]">
              <Hash size={10} className="text-indigo-400" /> {ticket.id}
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs font-medium text-[var(--text-muted)]">
            <Phone size={14} className="text-emerald-500 flex-none" />
            {formatPhoneNumber(ticket.phone)}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-5 py-3 border-t-2 border-dashed border-[var(--border-color)] flex justify-between items-center bg-[var(--bg-surface)] group-hover:bg-[var(--bg-subtle)] transition-colors rounded-b-2xl">
        <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">
          {ticket.assigned_to ? 'Assigned' : 'Unassigned'}
        </span>
        <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
          View Details <ChevronRight size={14} />
        </span>
      </div>
    </div>
  );
}