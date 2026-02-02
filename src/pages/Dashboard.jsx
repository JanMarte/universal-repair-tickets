import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import TicketCard from '../components/TicketCard';
import IntakeModal from '../components/IntakeModal';
import { useNavigate } from 'react-router-dom';
import {
  Search, Filter, Moon, Sun, Plus, XCircle, LogOut, Users, QrCode,
  AlertTriangle, DollarSign, Activity, ChevronDown, ChevronUp, Layers, UserCheck
} from 'lucide-react';
import { useToast } from '../context/ToastProvider';
import QRScanner from '../components/QRScanner';

export default function Dashboard() {
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
  const [isIntakeModalOpen, setIsIntakeModalOpen] = useState(false);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  const [currentUser, setCurrentUser] = useState({ id: null, email: '', role: '', initial: '?' });
  const [searchQuery, setSearchQuery] = useState('');

  const [statusFilter, setStatusFilter] = useState('ACTIVE');
  const [isScanning, setIsScanning] = useState(false);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    if (theme === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');

    fetchUserData();
    fetchTickets();
  }, []);

  async function fetchUserData() {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
      setCurrentUser({
        id: user.id,
        email: user.email,
        role: profile?.role || 'employee',
        initial: user.email.charAt(0).toUpperCase()
      });
    }
  }

  async function fetchTickets() {
    setLoading(true);
    const { data, error } = await supabase
      .from('tickets')
      .select('*, assigned_to')
      .order('created_at', { ascending: false });

    if (error) console.error('Error fetching tickets:', error);
    else setTickets(data);
    setLoading(false);
  }

  const handleLogout = async () => {
    await supabase.auth.signOut();
    addToast("Logged out successfully", "info");
    navigate('/login');
  };

  const isManagement = ['manager', 'admin'].includes(currentUser.role);

  const filteredTickets = tickets.filter(ticket => {
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch =
      ticket.id.toString().includes(searchLower) ||
      (ticket.customer_name || '').toLowerCase().includes(searchLower) ||
      (ticket.phone || '').includes(searchLower) ||
      (ticket.brand || '').toLowerCase().includes(searchLower) ||
      (ticket.model || '').toLowerCase().includes(searchLower) ||
      (ticket.serial_number || '').toLowerCase().includes(searchLower);

    if (statusFilter === 'MY_WORK') {
      if (!currentUser.id || !ticket.assigned_to) return false;
      return matchesSearch &&
        ticket.assigned_to === currentUser.id &&
        ticket.status !== 'completed';
    }
    if (statusFilter === 'ACTIVE') return matchesSearch && ticket.status !== 'completed';
    if (statusFilter === 'ATTENTION') return matchesSearch && (ticket.is_backordered || ticket.status === 'waiting_parts');

    const matchesStatus = statusFilter === 'ALL' || ticket.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    if (newTheme === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  };

  const activeCount = tickets.filter(t => t.status !== 'completed').length;
  const urgentCount = tickets.filter(t => t.is_backordered || t.status === 'waiting_parts').length;
  const totalRevenue = tickets.reduce((sum, t) => sum + (t.estimate_total || 0), 0);
  const myWorkCount = tickets.filter(t => t.assigned_to === currentUser.id && t.status !== 'completed').length;

  const getFilterBadgeColor = (filter) => {
    switch (filter) {
      case 'ACTIVE': return 'badge-success text-white border-none bg-emerald-600';
      case 'ATTENTION': return 'badge-warning text-white border-none bg-amber-500';
      case 'MY_WORK': return 'badge-primary text-white border-none bg-indigo-600';
      case 'ALL': return 'badge-neutral text-white';
      default: return 'badge-info text-white bg-indigo-500 border-none';
    }
  };

  return (
    <div className="min-h-screen p-4 md:p-6 font-sans transition-colors duration-300 pb-20">

      {/* NAVBAR */}
      <div className="navbar rounded-2xl mb-6 sticky top-2 z-40 animate-fade flex justify-between shadow-sm backdrop-blur-md bg-[var(--bg-surface)] border border-[var(--border-color)] px-3 py-2">
        <div className="flex-1 min-w-0">
          <div className="flex flex-col justify-center leading-tight">
            <span className="font-black text-[var(--text-main)] text-sm md:text-2xl whitespace-normal md:whitespace-nowrap">
              University Vacuum & Sewing
            </span>
          </div>
        </div>

        <div className="flex-none flex items-center gap-2">

          <button className="btn btn-sm btn-circle btn-ghost text-[var(--text-main)]" onClick={() => setIsScanning(true)}><QrCode size={20} /></button>

          {/* DESKTOP CUSTOMERS BUTTON (Hidden on Mobile) */}
          <button className="btn btn-sm btn-ghost gap-2 text-[var(--text-main)] font-bold hidden md:flex" onClick={() => navigate('/customers')}>
            <Users size={18} /> Customers
          </button>

          <button className="btn btn-sm md:btn-md btn-gradient rounded-full shadow-lg border-none px-3 md:px-6" onClick={() => setIsIntakeModalOpen(true)}>
            <Plus size={18} strokeWidth={3} /> <span className="hidden md:inline font-bold">New Ticket</span>
          </button>

          <button className="btn btn-sm btn-ghost btn-circle text-[var(--text-main)]" onClick={toggleTheme}>
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          </button>

          <div className="dropdown dropdown-end">
            <div tabIndex={0} role="button" className="btn btn-sm btn-ghost btn-circle avatar placeholder">
              <div className="bg-slate-800 text-white rounded-full w-8 md:w-9 shadow-lg">
                <span className="text-xs md:text-sm font-bold">{currentUser.initial}</span>
              </div>
            </div>
            <ul tabIndex={0} className="mt-4 z-[1] p-2 shadow-2xl menu menu-sm dropdown-content rounded-xl w-60 bg-[var(--bg-surface)] border border-[var(--border-color)]">
              <li className="menu-title px-4 py-2 border-b border-[var(--border-color)] mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">Signed In As</span>
              </li>
              <li className="px-2">
                <div className="flex flex-col gap-1 items-start p-2">
                  <span className="font-bold text-sm truncate w-full text-[var(--text-main)]">{currentUser.email}</span>
                  <span className="badge badge-sm badge-neutral uppercase font-bold text-[10px] text-white">{currentUser.role}</span>
                </div>
              </li>

              <div className="divider my-1"></div>

              {/* --- NEW MOBILE LINKS --- */}
              {/* This only shows up inside the dropdown, perfect for mobile access */}
              <li>
                <button onClick={() => navigate('/customers')} className="font-bold text-[var(--text-main)] md:hidden">
                  <Users size={16} /> Customer Database
                </button>
              </li>

              {isManagement && (
                <li><button onClick={() => navigate('/team')} className="font-bold text-indigo-600"><Users size={16} /> Manage Team</button></li>
              )}

              <div className="divider my-1"></div>
              <li><button onClick={handleLogout} className="text-red-600 font-bold"><LogOut size={16} /> Logout</button></li>
            </ul>
          </div>
        </div>
      </div>

      {/* MOBILE FILTERS */}
      <div className="lg:hidden mb-6 space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input type="text" placeholder="Search tickets..." className="input input-bordered w-full pl-10 pr-10 rounded-xl shadow-sm bg-[var(--bg-surface)] focus:border-indigo-500" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            {searchQuery && <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"><XCircle size={16} /></button>}
          </div>
          <button onClick={() => setIsMobileFilterOpen(!isMobileFilterOpen)} className={`btn px-4 ${isMobileFilterOpen ? 'btn-neutral' : 'btn-ghost bg-[var(--bg-surface)] border border-[var(--border-color)]'}`}>
            <Filter size={18} />
            {isMobileFilterOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>

        {isMobileFilterOpen && (
          <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border-color)] p-4 shadow-sm animate-fade-in-up">
            <div className="form-control w-full mb-4">
              <label className="label py-0 mb-2"><span className="label-text text-xs font-bold uppercase text-[var(--text-muted)]">Ticket Status</span></label>
              <select className="select select-bordered w-full font-bold shadow-sm" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="ALL">All Tickets</option>
                <option value="ACTIVE">Active Workload</option>
                <option value="MY_WORK">👤 My Repairs</option>
                <option value="ATTENTION">⚠️ Attention Needed</option>
                <hr disabled />
                <option value="intake">Intake</option>
                <option value="diagnosing">Diagnosing</option>
                <option value="repairing">Repairing</option>
                <option value="ready_pickup">Ready for Pickup</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button onClick={() => setStatusFilter('ACTIVE')} className="flex flex-col items-center p-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100">
                <Activity size={16} className="text-emerald-600 mb-1" />
                <span className="text-lg font-black text-emerald-600">{activeCount}</span>
                <span className="text-[10px] font-bold text-emerald-800">Active</span>
              </button>
              <button onClick={() => setStatusFilter('MY_WORK')} className="flex flex-col items-center p-2 rounded-lg bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-100">
                <UserCheck size={16} className="text-indigo-600 mb-1" />
                <span className="text-lg font-black text-indigo-600">{myWorkCount}</span>
                <span className="text-[10px] font-bold text-indigo-800">My Work</span>
              </button>
              <button onClick={() => setStatusFilter('ATTENTION')} className="flex flex-col items-center p-2 rounded-lg bg-amber-50 dark:bg-amber-900/10 border border-amber-100">
                <AlertTriangle size={16} className="text-amber-600 mb-1" />
                <span className="text-lg font-black text-amber-600">{urgentCount}</span>
                <span className="text-[10px] font-bold text-amber-800">Urgent</span>
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 animate-fade">
        <div className="hidden lg:block lg:col-span-1">
          <div className="sticky top-28 rounded-2xl shadow-sm bg-[var(--bg-surface)] border border-[var(--border-color)]">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6 border-b border-[var(--border-color)] pb-4">
                <h3 className="font-black text-[var(--text-main)] flex gap-2 items-center text-lg"><Filter size={20} /> Filters</h3>
                {(statusFilter !== 'ALL' || searchQuery) && (
                  <button onClick={() => { setStatusFilter('ALL'); setSearchQuery('') }} className="text-xs text-red-600 font-bold hover:underline">RESET</button>
                )}
              </div>
              <div className="form-control w-full">
                <label className="label py-0 mb-2"><span className="label-text text-xs font-bold uppercase text-[var(--text-muted)]">Ticket Status</span></label>
                <select className="select select-bordered w-full font-bold shadow-sm" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                  <option value="ALL">All Tickets</option>
                  <option value="ACTIVE">Active Workload</option>
                  <option value="MY_WORK">👤 My Repairs</option>
                  <option value="ATTENTION">⚠️ Attention Needed</option>
                  <hr disabled />
                  <option value="intake">Intake</option>
                  <option value="diagnosing">Diagnosing</option>
                  <option value="repairing">Repairing</option>
                  <option value="ready_pickup">Ready for Pickup</option>
                  <option value="completed">Completed</option>
                </select>
              </div>

              <div className="form-control w-full mt-4">
                <label className="label py-0 mb-2"><span className="label-text text-xs font-bold uppercase text-[var(--text-muted)]">Search</span></label>
                <div className="relative">
                  <input type="text" className="input input-bordered w-full pl-10" placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-[var(--border-color)] space-y-4">
                <div onClick={() => setStatusFilter('ACTIVE')} className={`flex items-center justify-between p-3 -mx-3 rounded-lg cursor-pointer transition-all group ${statusFilter === 'ACTIVE' ? 'bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100' : 'hover:bg-[var(--bg-subtle)] border border-transparent'}`}>
                  <div>
                    <div className="text-xs font-bold uppercase text-[var(--text-muted)] mb-1">Active Repairs</div>
                    <div className="text-2xl text-emerald-600 font-black tracking-tight">{activeCount}</div>
                  </div>
                  <div className="p-2 bg-emerald-100 dark:bg-emerald-900/20 rounded-full text-emerald-600"><Activity size={18} /></div>
                </div>

                <div onClick={() => setStatusFilter('MY_WORK')} className={`flex items-center justify-between p-3 -mx-3 rounded-lg cursor-pointer transition-all group ${statusFilter === 'MY_WORK' ? 'bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-100' : 'hover:bg-[var(--bg-subtle)] border border-transparent'}`}>
                  <div>
                    <div className="text-xs font-bold uppercase text-[var(--text-muted)] mb-1">My Repairs</div>
                    <div className="text-2xl text-indigo-600 font-black tracking-tight">{myWorkCount}</div>
                  </div>
                  <div className="p-2 bg-indigo-100 dark:bg-indigo-900/20 rounded-full text-indigo-600"><UserCheck size={18} /></div>
                </div>

                <div onClick={() => setStatusFilter('ATTENTION')} className={`flex items-center justify-between p-3 -mx-3 rounded-lg cursor-pointer transition-all group ${statusFilter === 'ATTENTION' ? 'bg-amber-50 dark:bg-amber-900/10 border border-amber-100' : 'hover:bg-[var(--bg-subtle)] border border-transparent'}`}>
                  <div>
                    <div className="text-xs font-bold uppercase text-[var(--text-muted)] mb-1">Attention Needed</div>
                    <div className="text-2xl text-amber-600 font-black tracking-tight">{urgentCount}</div>
                  </div>
                  <div className="p-2 bg-amber-100 dark:bg-amber-900/20 rounded-full text-amber-600"><AlertTriangle size={18} /></div>
                </div>

                <div onClick={() => setStatusFilter('ALL')} className="flex items-center justify-between p-3 -mx-3 rounded-lg cursor-pointer transition-all hover:bg-[var(--bg-subtle)] border border-transparent group">
                  <div>
                    <div className="text-xs font-bold uppercase text-[var(--text-muted)] mb-1">Est. Revenue</div>
                    <div className="text-2xl text-cyan-600 font-black tracking-tight">${totalRevenue.toLocaleString()}</div>
                  </div>
                  <div className="p-2 bg-cyan-100 dark:bg-cyan-900/20 rounded-full text-cyan-600"><DollarSign size={18} /></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-3">
          <div className="mb-4 flex items-center justify-between bg-[var(--bg-subtle)] p-2 px-4 rounded-lg border border-[var(--border-color)]">
            <div className="flex items-center gap-3">
              <Layers size={16} className="text-[var(--text-muted)]" />
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">Viewing:</span>
              <span className={`badge ${getFilterBadgeColor(statusFilter)} font-black uppercase tracking-wide`}>
                {statusFilter === 'BACKORDER' ? 'Waiting (Parts)' : statusFilter.replace('_', ' ')}
              </span>
            </div>
            {statusFilter !== 'ALL' && (
              <button onClick={() => setStatusFilter('ALL')} className="btn btn-xs btn-ghost text-[var(--text-muted)] hover:text-red-500 gap-1">
                <XCircle size={14} /> Clear
              </button>
            )}
          </div>

          {loading ? (
            <div className="flex justify-center mt-20"><span className="loading loading-spinner loading-lg text-primary"></span></div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {filteredTickets.length === 0 && (
                <div className="col-span-full text-center p-12 border-2 border-dashed border-[var(--border-color)] rounded-2xl bg-[var(--bg-surface)]">
                  <p className="font-bold text-xl text-[var(--text-main)]">No tickets found</p>
                  <p className="text-sm mt-2 text-[var(--text-muted)]">Adjust your filters to see results.</p>
                  <button className="btn btn-outline btn-sm mt-6 text-[var(--text-main)]" onClick={() => { setStatusFilter('ALL'); setSearchQuery('') }}>Clear Filters</button>
                </div>
              )}
              {filteredTickets.map(ticket => (
                <TicketCard key={ticket.id} ticket={ticket} />
              ))}
            </div>
          )}
        </div>
      </div>

      <IntakeModal
        isOpen={isIntakeModalOpen}
        onClose={() => setIsIntakeModalOpen(false)}
        onTicketCreated={fetchTickets}
      />

      {isScanning && (
        <QRScanner
          onClose={() => setIsScanning(false)}
          onScan={(result) => {
            setIsScanning(false);
            let ticketId = result;
            if (result.includes('/ticket/')) {
              const parts = result.split('/ticket/');
              ticketId = parts[1];
            }
            setTimeout(() => { navigate(`/ticket/${ticketId}`); }, 100);
          }}
        />
      )}
    </div>
  )
}