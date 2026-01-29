import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import TicketCard from '../components/TicketCard';
import { LogOut, PackageOpen, Moon, Sun } from 'lucide-react';
import { useToast } from '../context/ToastProvider';
import { useNavigate } from 'react-router-dom';

export default function MyTickets() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState('');
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
  
  const { addToast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    // Sync Theme
    document.documentElement.setAttribute('data-theme', theme);
    if (theme === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');

    fetchMyTickets();
  }, []);

  async function fetchMyTickets() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUserEmail(user.email);

    // 1. Find the customer record linked to this email
    const { data: customerData } = await supabase
      .from('customers')
      .select('id')
      .eq('email', user.email)
      .maybeSingle();

    if (customerData) {
      // 2. Fetch tickets for this specific customer
      const { data: ticketData } = await supabase
        .from('tickets')
        .select('*')
        .eq('customer_id', customerData.id)
        .order('created_at', { ascending: false });
      
      setTickets(ticketData || []);
    }
    setLoading(false);
  }

  const handleLogout = async () => {
    await supabase.auth.signOut();
    addToast("Logged out successfully", "info");
    navigate('/login');
  };

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    if (newTheme === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  };

  return (
    <div className="min-h-screen p-6 font-sans transition-colors duration-300">
      
      {/* NAVBAR */}
      <div className="navbar rounded-2xl mb-8 flex justify-between shadow-sm backdrop-blur-md bg-[var(--bg-surface)] border border-[var(--border-color)] animate-fade">
        <div className="flex-1">
          <a className="btn btn-ghost text-xl font-black tracking-tight text-[var(--text-main)] hover:bg-transparent">
             My Repairs
          </a>
        </div>
        <div className="flex-none gap-3">
          <button className="btn btn-ghost btn-circle text-[var(--text-main)] hover:bg-[var(--bg-subtle)]" onClick={toggleTheme}>
            {theme === 'light' ? <Moon size={20}/> : <Sun size={20}/>}
          </button>
          
          <div className="dropdown dropdown-end">
             <div tabIndex={0} role="button" className="btn btn-ghost flex gap-2 items-center text-[var(--text-muted)] hover:bg-[var(--bg-subtle)]">
                <span className="text-xs font-bold hidden md:inline">{userEmail}</span>
                <LogOut size={18} />
             </div>
             {/* Dropdown Menu */}
             <ul tabIndex={0} className="mt-4 z-[1] p-2 shadow-2xl menu menu-sm dropdown-content rounded-xl w-52 bg-[var(--bg-surface)] border border-[var(--border-color)]">
                <li>
                    <button onClick={handleLogout} className="text-red-600 font-bold hover:bg-[var(--bg-subtle)]">Logout</button>
                </li>
             </ul>
          </div>
        </div>
      </div>

      {/* CONTENT GRID */}
      <div className="animate-fade">
          {loading ? (
             <div className="flex justify-center mt-20"><span className="loading loading-spinner loading-lg text-primary"></span></div>
          ) : tickets.length === 0 ? (
             // Empty State
             <div className="flex flex-col items-center justify-center p-12 mt-10 text-center border-2 border-dashed border-[var(--border-color)] rounded-3xl bg-[var(--bg-surface)]">
                <div className="bg-[var(--bg-subtle)] p-6 rounded-full mb-4">
                    <PackageOpen size={48} className="text-[var(--text-muted)] opacity-50"/>
                </div>
                <h3 className="text-xl font-black text-[var(--text-main)]">No active repairs</h3>
                <p className="text-[var(--text-muted)] mt-2 max-w-sm">
                    If you dropped off a device recently, it might not be linked to this email address yet. Please contact the shop.
                </p>
             </div>
          ) : (
             // Ticket Grid
             <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                 {tickets.map(ticket => (
                    <TicketCard key={ticket.id} ticket={ticket} />
                 ))}
             </div>
          )}
      </div>
    </div>
  );
}