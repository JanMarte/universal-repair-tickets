import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { LogOut, Package } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import TicketCard from '../components/TicketCard'; // <--- REUSING YOUR CARD DESIGN!

export default function MyTickets() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchMyTickets();
  }, []);

  async function fetchMyTickets() {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      // We find tickets by matching the Customer's EMAIL
      // (Since they might not have a linked 'customer_id' in the profiles table yet, matching email is safer for self-service)
      const { data } = await supabase
        .from('tickets')
        .select('*')
        .ilike('customer_name', '%') // In a real app, you'd link via ID. For now, we query by auth user's email if stored, or just show empty.
      // ACTUALLY: The best way for your current setup is to query by the customer_id if you linked it.
      // Let's assume you want to show tickets where the email matches.

      // BETTER QUERY:
      // Find tickets where the 'email' column (if you added one) matches. 
      // If you didn't add an email column to tickets, this is tricky. 
      // Let's assume we linked them via the 'customer_id' logic we built earlier.
    }

    // Fallback: For now, let's just fetch tickets for this user if we can.
    // If you haven't strictly linked Auth User -> Customer ID, this page might be empty.
    // Let's try to find the customer profile first.

    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (currentUser) {
      // 1. Find the customer record with this email
      const { data: customer } = await supabase
        .from('customers')
        .select('id')
        .eq('email', currentUser.email)
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

  return (
    <div className="min-h-screen p-6 font-sans">
      <div className="max-w-5xl mx-auto">

        {/* Navbar */}
        <div className="navbar rounded-2xl mb-8 flex justify-between shadow-sm bg-[var(--bg-surface)] border border-[var(--border-color)] p-4">
          <div className="flex items-center gap-2">
            <div className="bg-primary/10 p-2 rounded-full text-primary">
              <Package size={24} />
            </div>
            <h1 className="text-xl font-black text-[var(--text-main)]">My Repair Status</h1>
          </div>
          <button onClick={handleLogout} className="btn btn-ghost btn-sm text-red-500 font-bold">
            <LogOut size={16} /> Logout
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex justify-center mt-20"><span className="loading loading-spinner loading-lg text-primary"></span></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade">
            {tickets.map(ticket => (
              // Using the same beautiful card component
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