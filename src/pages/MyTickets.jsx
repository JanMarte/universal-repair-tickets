import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { LogOut, Wrench } from 'lucide-react';
import { useToast } from '../context/ToastProvider';
import TicketCard from '../components/TicketCard';

export default function MyTickets() {
  const navigate = useNavigate();
  const { addToast } = useToast();
  
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState('');

  useEffect(() => {
    fetchMyTickets();
  }, []);

  async function fetchMyTickets() {
    // 1. Get Logged In User
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        navigate('/login');
        return;
    }
    setUserEmail(user.email);

    // 2. Find the Customer Profile matching this email
    const { data: customer, error } = await supabase
        .from('customers')
        .select('id')
        .eq('email', user.email)
        .maybeSingle(); 

    if (error) console.log("Customer Lookup Warning:", error.message);

    if (customer) {
        // 3. Fetch tickets for that customer ID
        const { data: myTickets } = await supabase
            .from('tickets')
            .select('*')
            .eq('customer_id', customer.id)
            .order('created_at', { ascending: false });
        
        setTickets(myTickets || []);
    } else {
        console.log("User logged in, but no matching 'Rolodex' customer found.");
        setTickets([]); 
    }
    setLoading(false);
  }

  const handleLogout = async () => {
    await supabase.auth.signOut();
    addToast("Logged out successfully", "info");
    navigate('/login');
  };

  if (loading) return <div className="h-screen grid place-items-center"><span className="loading loading-spinner loading-lg text-primary"></span></div>;

  return (
    <div className="min-h-screen p-6 font-sans transition-colors duration-300">
      
      {/* NAVBAR - Consistent with Dashboard */}
      <div className="navbar rounded-2xl mb-8 sticky top-4 z-40 animate-fade flex justify-between shadow-sm bg-white dark:bg-slate-900/80 dark:glass-panel max-w-5xl mx-auto">
        <div className="flex-1">
          <a className="btn btn-ghost text-2xl font-black tracking-tight text-slate-800 dark:text-white hover:bg-transparent">
             My Repair History
          </a>
        </div>
        <div className="flex-none gap-4">
            <span className="text-sm font-bold text-slate-500 dark:text-slate-400 hidden md:inline">{userEmail}</span>
            <button 
                className="btn btn-sm btn-outline border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-red-50 hover:text-red-600 hover:border-red-200 dark:hover:bg-slate-800" 
                onClick={handleLogout}
            >
                <LogOut size={16}/> <span className="hidden sm:inline">Logout</span>
            </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto animate-fade">
        {tickets.length === 0 ? (
            <div className="text-center py-20 bg-white dark:bg-slate-800/50 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-700">
                <Wrench size={64} className="mx-auto text-slate-300 dark:text-slate-600 mb-6"/>
                <h2 className="text-2xl font-black text-slate-700 dark:text-white mb-2">No Tickets Found</h2>
                <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                    We couldn't find any tickets linked to <strong>{userEmail}</strong>.<br/>
                    If you have a repair in the shop, ask an employee to ensure your email matches on the ticket.
                </p>
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {tickets.map(ticket => (
                    <TicketCard key={ticket.id} ticket={ticket} />
                ))}
            </div>
        )}
      </div>
    </div>
  );
}