import React from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';

export default function TicketCard({ ticket }) {
  const navigate = useNavigate();

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'badge-success text-white';
      case 'ready_pickup': return 'badge-info text-white';
      case 'diagnosing': return 'badge-warning text-white';
      case 'repairing': return 'badge-secondary text-white';
      default: return 'badge-ghost';
    }
  };

  return (
    <div 
      // 1. Removed 'card' class to stop DaisyUI from forcing dark colors
      // 2. Used 'bg-[var(--bg-surface)]' to strictly follow your theme variables
      className="flex flex-col bg-[var(--bg-surface)] shadow-sm hover:shadow-xl card-hover-effect border border-slate-200 dark:border-slate-700 rounded-2xl cursor-pointer overflow-hidden group transition-all duration-300"
      onClick={() => navigate(`/ticket/${ticket.id}`)}
    >
      {/* Status Stripe */}
      <div className={`h-1.5 w-full ${ticket.is_backordered ? 'bg-error' : 'bg-gradient-to-r from-indigo-400 to-purple-400'}`}></div>
      
      <div className="p-5 flex-1 flex flex-col">
        <div className="flex justify-between items-start">
            <div>
                {/* Text matches your theme variables */}
                <h3 className="text-lg font-bold text-[var(--text-main)]">
                    {ticket.brand} <span className="font-normal text-slate-400 dark:text-slate-500 text-base">{ticket.model}</span>
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mt-1">{ticket.customer_name}</p>
            </div>
            {ticket.is_backordered && (
                <div className="badge badge-error gap-1 text-white font-bold shadow-sm animate-pulse">
                    BO
                </div>
            )}
        </div>

        {/* Description Box */}
        <p className="text-slate-500 dark:text-slate-300 text-sm line-clamp-2 mt-4 bg-slate-50 dark:bg-slate-700/50 p-3 rounded-lg border border-slate-100 dark:border-slate-600 italic group-hover:bg-indigo-50/50 dark:group-hover:bg-slate-700 transition-colors">
            "{ticket.description}"
        </p>

        <div className="flex justify-between items-center mt-5 pt-4 border-t border-slate-100 dark:border-slate-700">
            <span className="text-xs font-mono font-bold text-slate-400 dark:text-slate-500">#{ticket.id} • {format(new Date(ticket.created_at), 'MMM d')}</span>
            <div className={`badge ${getStatusColor(ticket.status)} font-bold uppercase text-[10px] p-3 tracking-wide shadow-sm`}>
                {ticket.status.replace('_', ' ')}
            </div>
        </div>
      </div>
    </div>
  );
}