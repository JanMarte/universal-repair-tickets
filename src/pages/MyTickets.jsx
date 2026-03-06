import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { LogOut, Package, Moon, Sun, Wrench, AlertCircle, MapPin, Phone, Clock, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import TicketCard from '../components/TicketCard';
import Navbar from '../components/Navbar';

export default function MyTickets() {
  const [tickets, setTickets] = useState([]);
  const [shopSettings, setShopSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();

  useEffect(() => {
    fetchMyTickets();
    fetchShopSettings();
  }, []);

  async function fetchShopSettings() {
    const { data } = await supabase.from('shop_settings').select('*').eq('id', 1).single();
    if (data) {
      setShopSettings(data);
    }
  }

  async function fetchMyTickets() {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
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

  // --- Helper to format days nicely ---
  const formatDays = (daysArray) => {
    if (!daysArray || daysArray.length === 0) return 'Check with shop for hours';
    if (daysArray.length === 7) return 'Open 7 Days a Week';
    if (daysArray.length === 5 && !daysArray.includes('Saturday') && !daysArray.includes('Sunday')) {
      return 'Monday - Friday';
    }
    return daysArray.join(', ');
  };

  const shopNameStr = shopSettings?.shop_name || 'University Vacuum & Sewing';

  return (
    <div className="min-h-screen p-4 md:p-6 font-sans transition-colors duration-300 pb-24">
      <div className="max-w-5xl mx-auto space-y-6 md:space-y-8">

        {/* Global Navbar ensures security checks work flawlessly */}
        <Navbar />

        {/* --- PREMIUM SHOP INFORMATION CARD --- */}
        {!loading && shopSettings && (
          <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-[32px] p-6 md:p-8 shadow-sm animate-fade-in-up relative overflow-hidden" style={{ animationDelay: '0.05s' }}>
            <div className="absolute top-0 left-0 w-2 h-full bg-gradient-to-b from-indigo-500 to-purple-500"></div>

            <div className="mb-6 border-b border-[var(--border-color)] pb-6 pl-2">
              <h2 className="text-2xl md:text-3xl font-black text-[var(--text-main)] mb-1 tracking-tight">{shopSettings.shop_name || 'Our Shop'}</h2>
              <p className="text-xs font-black uppercase tracking-widest text-[var(--text-muted)]">Shop Information & Hours</p>
            </div>

            {/* 3-Column Grid stops text from squeezing! */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pl-2">

              {/* Address Block */}
              {shopSettings.shop_address && (
                <a
                  href={`http://maps.google.com/?q=${encodeURIComponent(shopSettings.shop_address)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col gap-3 p-5 bg-[var(--bg-subtle)] hover:bg-[var(--bg-surface)] border border-[var(--border-color)] hover:border-indigo-300 rounded-2xl transition-all shadow-inner group"
                >
                  <div className="w-12 h-12 bg-[var(--bg-surface)] rounded-xl shadow-sm border border-[var(--border-color)] text-indigo-500 flex items-center justify-center group-hover:scale-110 transition-transform"><MapPin size={20} /></div>
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-1 flex items-center gap-1">Location <ExternalLink size={10} /></div>
                    <div className="text-sm font-bold text-[var(--text-main)] whitespace-pre-wrap leading-snug">{shopSettings.shop_address}</div>
                  </div>
                </a>
              )}

              {/* Phone Block */}
              {shopSettings.shop_phone && (
                <a
                  href={`tel:${shopSettings.shop_phone.replace(/\D/g, '')}`}
                  className="flex flex-col gap-3 p-5 bg-[var(--bg-subtle)] hover:bg-[var(--bg-surface)] border border-[var(--border-color)] hover:border-emerald-300 rounded-2xl transition-all shadow-inner group"
                >
                  <div className="w-12 h-12 bg-[var(--bg-surface)] rounded-xl shadow-sm border border-[var(--border-color)] text-emerald-500 flex items-center justify-center group-hover:scale-110 transition-transform"><Phone size={20} /></div>
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-1">Call Us</div>
                    <div className="text-lg font-bold font-mono text-[var(--text-main)] leading-none">{shopSettings.shop_phone}</div>
                  </div>
                </a>
              )}

              {/* Hours Block */}
              {(shopSettings.business_hours || shopSettings.operating_days?.length > 0) && (
                <div className="flex flex-col gap-3 p-5 bg-[var(--bg-subtle)] border border-[var(--border-color)] rounded-2xl shadow-inner opacity-90">
                  <div className="w-12 h-12 bg-[var(--bg-surface)] rounded-xl shadow-sm border border-[var(--border-color)] text-amber-500 flex items-center justify-center"><Clock size={20} /></div>
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-1">
                      {formatDays(shopSettings.operating_days)}
                    </div>
                    <div className="text-sm font-bold text-[var(--text-main)] whitespace-pre-wrap leading-snug">{shopSettings.business_hours || 'Open'}</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

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
              <TicketCard key={ticket.id} ticket={ticket} isCustomerView={true} />
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
          © {new Date().getFullYear()} {shopNameStr}
        </div>

      </div>
    </div>
  );
}