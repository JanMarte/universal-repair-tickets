import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { LogOut, Package, Moon, Sun, Wrench, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import TicketCard from '../components/TicketCard';

export default function MyTickets() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');

  const navigate = useNavigate();

  // Apply Theme Class to HTML
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    if (theme === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    fetchMyTickets();
  }, []);

  async function fetchMyTickets() {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      // Use maybeSingle() to prevent the 406 Not Acceptable error if multiple/zero rows exist
      const { data: customer } = await supabase
        .from('customers')
        .select('id')
        .eq('email', user.email)
        .maybeSingle();

      if (customer) {
        const { data: myTickets } = await supabase
          .from('tickets')
          .select('*')
          .eq('customer_id', customer.id)
          .order('created_at', { ascending: false });
        setTickets(myTickets || []);
      }
    }
    setLoading(false);
  }

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
  };

  return (
    /* Notice: No bg- color class here, so it inherits your clean Dashboard background perfectly! */
    <div className="min-h-screen p-4 md:p-6 font-sans transition-colors duration-300 pb-24">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* PREMIUM NAVBAR */}
        {/* Notice: bg-[var(--bg-surface)] is solid to avoid the weird gray overlap issue */}
        <div className="navbar rounded-2xl sticky top-2 z-40 flex justify-between shadow-sm bg-[var(--bg-surface)] border border-[var(--border-color)] px-4 py-3 animate-fade-in-up">

          {/* Left: Brand / Home Button */}
          <div
            onClick={() => navigate('/my-tickets')}
            className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity group"
            title="Refresh Portal"
          >
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform">
              <Wrench size={20} fill="currentColor" />
            </div>
            <div>
              <div className="font-black text-lg md:text-xl tracking-tight text-[var(--text-main)] leading-none">
                University <span className="text-indigo-500">Vac & Sew</span>
              </div>
              <p className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] mt-0.5">My Repair Portal</p>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2 md:gap-3">
            <button
              onClick={toggleTheme}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-[var(--bg-subtle)] border border-[var(--border-color)] shadow-inner text-[var(--text-muted)] hover:text-indigo-500 transition-colors"
              title="Toggle Theme"
            >
              {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
            </button>

            <div className="h-6 w-px bg-[var(--border-color)] mx-1 hidden sm:block"></div>

            <button
              onClick={handleLogout}
              className="btn btn-sm h-10 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 border border-red-100 dark:border-red-800 shadow-sm transition-all gap-2 px-4"
            >
              <LogOut size={16} strokeWidth={2.5} /> <span className="hidden sm:inline font-bold">Sign Out</span>
            </button>
          </div>
        </div>

        {/* PAGE HEADER */}
        {!loading && (
          <div className="flex justify-between items-end px-2 mb-4 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
            <div>
              <h2 className="text-2xl font-black text-[var(--text-main)] tracking-tight">Active Repairs</h2>
              <p className="text-sm font-bold text-[var(--text-muted)] mt-1">Track the status of your devices.</p>
            </div>
            <div className="bg-[var(--bg-surface)] px-3 py-1.5 rounded-lg border border-[var(--border-color)] shadow-sm text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">
              {tickets.length} {tickets.length === 1 ? 'Ticket' : 'Tickets'}
            </div>
          </div>
        )}

        {/* CONTENT GRID */}
        {loading ? (
          <div className="flex flex-col items-center justify-center mt-32 space-y-4">
            <span className="loading loading-spinner loading-lg text-indigo-500"></span>
            <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] animate-pulse">Locating your records...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>

            {tickets.map(ticket => (
              <TicketCard key={ticket.id} ticket={ticket} />
            ))}

            {/* PREMIUM EMPTY STATE */}
            {tickets.length === 0 && (
              <div className="col-span-full py-24 px-6 bg-[var(--bg-surface)] border-2 border-dashed border-[var(--border-color)] rounded-[32px] text-center shadow-sm">
                <div className="w-20 h-20 bg-[var(--bg-subtle)] rounded-full flex items-center justify-center mx-auto mb-5 border border-[var(--border-color)] shadow-inner relative">
                  <Package size={32} className="text-[var(--text-muted)] opacity-50" />
                  <div className="absolute top-0 right-0 w-6 h-6 bg-indigo-500 text-white rounded-full flex items-center justify-center border-2 border-[var(--bg-surface)] shadow-sm">
                    <AlertCircle size={12} strokeWidth={3} />
                  </div>
                </div>
                <h3 className="text-xl font-black text-[var(--text-main)] mb-2 tracking-tight">No Active Repairs</h3>
                <p className="text-sm font-medium text-[var(--text-muted)] max-w-sm mx-auto leading-relaxed">
                  When you drop off a device for service at our shop, your repair tickets will automatically appear here linked to your email address.
                </p>
              </div>
            )}

          </div>
        )}

        {/* FOOTER */}
        <div className="text-center text-[var(--text-muted)] text-[10px] font-black uppercase tracking-widest opacity-50 pt-12 pb-6">
          © 2026 University Vacuum & Sewing
        </div>

      </div>
    </div>
  );
}