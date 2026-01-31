import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { LogOut, Package, Moon, Sun } from 'lucide-react'; // Added Moon, Sun
import { useNavigate } from 'react-router-dom';
import TicketCard from '../components/TicketCard';

export default function MyTickets() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  // NEW: Theme State
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');

  const navigate = useNavigate();

  // 1. Apply Theme Class to HTML
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    if (theme === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [theme]);

  useEffect(() => {
    fetchMyTickets();
  }, []);

  async function fetchMyTickets() {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      // 1. Find the customer record with this email
      const { data: customer } = await supabase
        .from('customers')
        .select('id')
        .eq('email', user.email)
        .single();

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

  // 2. Toggle Function
  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
  };

  return (
    <div className="min-h-screen p-4 md:p-6 font-sans transition-colors duration-300">
      <div className="max-w-5xl mx-auto">

        {/* NAVBAR */}
        <div className="navbar rounded-2xl mb-8 flex justify-between items-center shadow-sm bg-[var(--bg-surface)] border border-[var(--border-color)] p-4">

          {/* Left: Brand */}
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 p-2 rounded-full text-primary">
              <Package size={24} />
            </div>
            <h1 className="text-xl font-black text-[var(--text-main)] tracking-tight">My Repair Status</h1>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2">

            {/* THEME TOGGLE */}
            <button
              className="btn btn-ghost btn-circle text-[var(--text-main)] hover:bg-[var(--bg-subtle)]"
              onClick={toggleTheme}
              title="Toggle Theme"
            >
              {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
            </button>

            <div className="h-6 w-px bg-[var(--border-color)] mx-1"></div>

            <button onClick={handleLogout} className="btn btn-ghost btn-sm text-red-500 font-bold hover:bg-red-50 dark:hover:bg-red-900/20">
              <LogOut size={18} /> <span className="hidden md:inline">Logout</span>
            </button>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex justify-center mt-20"><span className="loading loading-spinner loading-lg text-primary"></span></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade">
            {tickets.map(ticket => (
              <TicketCard key={ticket.id} ticket={ticket} />
            ))}

            {tickets.length === 0 && (
              <div className="col-span-full text-center py-20 bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-color)]">
                <Package size={48} className="mx-auto text-[var(--text-muted)] mb-4 opacity-50" />
                <h3 className="text-lg font-bold text-[var(--text-main)]">No tickets found</h3>
                <p className="text-[var(--text-muted)]">Any repairs linked to your email will appear here.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}