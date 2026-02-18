import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import TicketCard from '../components/TicketCard';
import IntakeModal from '../components/IntakeModal';
import KanbanBoard from '../components/KanbanBoard';
import { useNavigate } from 'react-router-dom';
import {
  Search, Filter, Moon, Sun, Plus, XCircle, LogOut, Users, QrCode,
  AlertTriangle, DollarSign, Activity, ChevronDown, ChevronUp, Layers, UserCheck,
  Package, LayoutGrid, List as ListIcon
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

  // VIEW MODE STATE
  const [viewMode, setViewMode] = useState(() => {
    return localStorage.getItem('dashboardViewMode') || 'list';
  });

  useEffect(() => {
    localStorage.setItem('dashboardViewMode', viewMode);
  }, [viewMode]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    if (theme === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');

    fetchUserData();
    fetchTickets();
  }, [theme]);

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
    if (statusFilter === 'ATTENTION') return matchesSearch && (ticket.is_backordered || ticket.status === 'waiting_parts' || ticket.estimate_status === 'approved');

    const matchesStatus = statusFilter === 'ALL' || ticket.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
  };

  const activeCount = tickets.filter(t => t.status !== 'completed').length;
  const urgentCount = tickets.filter(t => t.is_backordered || t.status === 'waiting_parts').length;
  const totalRevenue = tickets.reduce((sum, t) => sum + (t.estimate_total || 0), 0);
  const myWorkCount = tickets.filter(t => t.assigned_to === currentUser.id && t.status !== 'completed').length;

  const getFilterBadgeStyle = (filter) => {
    const base = "inline-flex items-center justify-center px-3 py-1.5 font-black uppercase text-[10px] tracking-widest rounded-md transition-all";
    switch (filter) {
      case 'ACTIVE': return `${base} bg-emerald-500 text-white shadow-md shadow-emerald-500/30`;
      case 'ATTENTION': return `${base} bg-amber-500 text-white shadow-md shadow-amber-500/30`;
      case 'MY_WORK': return `${base} bg-indigo-500 text-white shadow-md shadow-indigo-500/30`;
      case 'ALL': return `${base} bg-slate-500 text-white shadow-md shadow-slate-500/30`;
      case 'intake': return `${base} bg-blue-500 text-white shadow-md shadow-blue-500/30`;
      case 'diagnosing': return `${base} bg-purple-500 text-white shadow-md shadow-purple-500/30`;
      case 'waiting_parts': return `${base} bg-orange-500 text-white shadow-md shadow-orange-500/30`;
      case 'repairing': return `${base} bg-amber-500 text-white shadow-md shadow-amber-500/30`;
      case 'ready_pickup': return `${base} bg-emerald-500 text-white shadow-md shadow-emerald-500/30`;
      case 'completed': return `${base} bg-slate-500 text-white shadow-md shadow-slate-500/30`;
      default: return `${base} bg-indigo-500 text-white shadow-md shadow-indigo-500/30`;
    }
  };

  // REUSABLE FUNCTION to clear filters (so both buttons do exactly the same thing)
  const clearFilters = () => {
    setStatusFilter('ALL');
    setSearchQuery('');
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

        <div className="flex-none flex items-center gap-1 sm:gap-2">
          <button className="btn btn-sm btn-circle btn-ghost text-[var(--text-muted)] hover-brand" onClick={() => setIsScanning(true)} title="Scan QR Code">
            <QrCode size={20} />
          </button>

          <button className="btn btn-sm btn-ghost rounded-full px-4 gap-2 text-[var(--text-muted)] font-bold hidden md:flex hover-brand" onClick={() => navigate('/customers')}>
            <Users size={18} /> Customers
          </button>

          <button className="btn btn-sm btn-ghost rounded-full px-4 gap-2 text-[var(--text-muted)] font-bold hidden md:flex hover-brand" onClick={() => navigate('/inventory')}>
            <Package size={18} /> Inventory
          </button>

          <button className="btn btn-sm md:btn-md btn-gradient text-white rounded-full shadow-lg hover:shadow-indigo-500/40 border-none px-4 md:px-6 hover:scale-105 transition-all ml-1" onClick={() => setIsIntakeModalOpen(true)}>
            <Plus size={18} strokeWidth={3} /> <span className="hidden md:inline font-bold">New Ticket</span>
          </button>

          <button className="btn btn-sm btn-ghost btn-circle text-[var(--text-muted)] hover-brand" onClick={toggleTheme} title="Toggle Theme">
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          </button>

          <div className="dropdown dropdown-end ml-1">
            <div tabIndex={0} role="button" className="btn btn-sm btn-ghost btn-circle avatar placeholder hover-brand border border-[var(--border-color)]">
              <div className="bg-slate-800 dark:bg-slate-700 text-white rounded-full w-8 md:w-9 shadow-sm">
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
              <li><button onClick={() => navigate('/customers')} className="font-bold text-[var(--text-main)] md:hidden"><Users size={16} /> Customer Database</button></li>
              <li><button onClick={() => navigate('/inventory')} className="font-bold text-[var(--text-main)] md:hidden"><Package size={16} /> Inventory</button></li>
              {isManagement && <li><button onClick={() => navigate('/team')} className="font-bold text-indigo-600"><Users size={16} /> Manage Team</button></li>}
              <div className="divider my-1"></div>
              <li><button onClick={handleLogout} className="text-red-600 font-bold"><LogOut size={16} /> Logout</button></li>
            </ul>
          </div>
        </div>
      </div>

      {/* MOBILE FILTERS */}
      <div className="lg:hidden mb-6 relative z-30">
        <div className="flex gap-2 relative">
          <div className="relative flex-1 group">
            <input
              type="text"
              placeholder="Search tickets..."
              className="input input-bordered w-full pl-12 pr-10 rounded-full shadow-sm bg-[var(--bg-subtle)] text-[var(--text-main)] focus:bg-[var(--bg-surface)] focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-medium h-12"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within:text-indigo-500 transition-colors" size={18} />
            {searchQuery && <button onClick={() => setSearchQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-red-500 transition-colors"><XCircle size={18} /></button>}
          </div>
          <button
            onClick={() => setIsMobileFilterOpen(!isMobileFilterOpen)}
            className={`btn rounded-full px-5 h-12 transition-all ${isMobileFilterOpen ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30 border-none hover:scale-105 hover:bg-indigo-700' : 'btn-ghost bg-[var(--bg-surface)] border border-[var(--border-color)] hover-brand'}`}
          >
            <Filter size={18} />
            {isMobileFilterOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>

        {isMobileFilterOpen && (
          <div className="absolute top-14 left-0 right-0 bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-color)] p-5 shadow-2xl animate-pop z-40 mt-2">
            <div className="form-control w-full mb-5">
              <label className="label py-0 mb-2"><span className="label-text text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Ticket Status</span></label>
              <select className="select select-bordered w-full font-bold shadow-sm bg-[var(--bg-subtle)] focus:bg-[var(--bg-surface)] text-[var(--text-main)]" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
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
            <div className="grid grid-cols-3 gap-3">
              <button onClick={() => { setStatusFilter('ACTIVE'); setIsMobileFilterOpen(false); }} className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all duration-300 ${statusFilter === 'ACTIVE' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 border-emerald-500 scale-105' : 'bg-[var(--bg-subtle)] text-[var(--text-muted)] border-[var(--border-color)] hover:border-emerald-400'}`}>
                <Activity size={22} className={statusFilter === 'ACTIVE' ? 'text-white mb-1' : 'text-emerald-500 mb-1'} />
                <span className="text-xl font-black leading-none">{activeCount}</span>
                <span className="text-[9px] font-bold uppercase tracking-wider opacity-80 mt-1">Active</span>
              </button>
              <button onClick={() => { setStatusFilter('MY_WORK'); setIsMobileFilterOpen(false); }} className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all duration-300 ${statusFilter === 'MY_WORK' ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/30 border-indigo-500 scale-105' : 'bg-[var(--bg-subtle)] text-[var(--text-muted)] border-[var(--border-color)] hover:border-indigo-400'}`}>
                <UserCheck size={22} className={statusFilter === 'MY_WORK' ? 'text-white mb-1' : 'text-indigo-500 mb-1'} />
                <span className="text-xl font-black leading-none">{myWorkCount}</span>
                <span className="text-[9px] font-bold uppercase tracking-wider opacity-80 mt-1">My Work</span>
              </button>
              <button onClick={() => { setStatusFilter('ATTENTION'); setIsMobileFilterOpen(false); }} className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all duration-300 ${statusFilter === 'ATTENTION' ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/30 border-amber-500 scale-105' : 'bg-[var(--bg-subtle)] text-[var(--text-muted)] border-[var(--border-color)] hover:border-amber-400'}`}>
                <AlertTriangle size={22} className={statusFilter === 'ATTENTION' ? 'text-white mb-1' : 'text-amber-500 mb-1'} />
                <span className="text-xl font-black leading-none">{urgentCount}</span>
                <span className="text-[9px] font-bold uppercase tracking-wider opacity-80 mt-1">Urgent</span>
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 animate-fade">
        {/* SIDEBAR FILTERS */}
        <div className="hidden lg:block lg:col-span-1">
          <div className="sticky top-28 rounded-2xl shadow-sm bg-[var(--bg-surface)] border border-[var(--border-color)]">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6 border-b border-[var(--border-color)] pb-4">
                <h3 className="font-black text-[var(--text-main)] flex gap-2 items-center text-lg"><Filter size={20} className="text-indigo-500" /> Filters</h3>

                {/* --- 1. UPDATED SIDEBAR CLEAR BUTTON --- */}
                {(statusFilter !== 'ALL' || searchQuery) && (
                  <button
                    onClick={clearFilters}
                    className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)] hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 border border-transparent hover:border-red-200 dark:hover:border-red-900/30 px-2 py-1 rounded-md transition-all"
                  >
                    <XCircle size={14} /> Clear
                  </button>
                )}
              </div>

              <div className="form-control w-full">
                <label className="label py-0 mb-2"><span className="label-text text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Ticket Status</span></label>
                <select className="select select-bordered w-full font-bold shadow-sm bg-[var(--bg-subtle)] focus:bg-[var(--bg-surface)] text-[var(--text-main)]" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
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

              <div className="form-control w-full mt-5">
                <label className="label py-0 mb-2"><span className="label-text text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Search</span></label>
                <div className="relative group">
                  <input type="text" className="input input-bordered w-full pl-11 bg-[var(--bg-subtle)] focus:bg-[var(--bg-surface)] text-[var(--text-main)] transition-all font-medium" placeholder="ID, name, phone..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within:text-indigo-500 transition-colors" size={16} />
                </div>
              </div>

              <div className="mt-8 space-y-3">
                <div onClick={() => setStatusFilter('ACTIVE')} className={`flex items-center justify-between p-4 rounded-xl cursor-pointer transition-all duration-300 border ${statusFilter === 'ACTIVE' ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-300 dark:border-emerald-500/50 shadow-md ring-1 ring-emerald-500/20 scale-[1.02]' : 'bg-[var(--bg-subtle)] border-[var(--border-color)] hover:border-emerald-300 dark:hover:border-emerald-600 hover:shadow-md hover:-translate-y-0.5'}`}>
                  <div>
                    <div className={`text-[10px] font-black uppercase tracking-widest mb-0.5 ${statusFilter === 'ACTIVE' ? 'text-emerald-600 dark:text-emerald-400' : 'text-[var(--text-muted)]'}`}>Active Repairs</div>
                    <div className={`text-2xl font-black tracking-tight ${statusFilter === 'ACTIVE' ? 'text-emerald-700 dark:text-emerald-300' : 'text-[var(--text-main)]'}`}>{activeCount}</div>
                  </div>
                  <div className={`p-2.5 rounded-xl shadow-sm transition-colors ${statusFilter === 'ACTIVE' ? 'bg-emerald-500 text-white' : 'bg-white dark:bg-slate-800 text-emerald-500 border border-[var(--border-color)]'}`}><Activity size={20} /></div>
                </div>

                <div onClick={() => setStatusFilter('MY_WORK')} className={`flex items-center justify-between p-4 rounded-xl cursor-pointer transition-all duration-300 border ${statusFilter === 'MY_WORK' ? 'bg-indigo-50 dark:bg-indigo-500/10 border-indigo-300 dark:border-indigo-500/50 shadow-md ring-1 ring-indigo-500/20 scale-[1.02]' : 'bg-[var(--bg-subtle)] border-[var(--border-color)] hover:border-indigo-300 dark:hover:border-indigo-600 hover:shadow-md hover:-translate-y-0.5'}`}>
                  <div>
                    <div className={`text-[10px] font-black uppercase tracking-widest mb-0.5 ${statusFilter === 'MY_WORK' ? 'text-indigo-600 dark:text-indigo-400' : 'text-[var(--text-muted)]'}`}>My Repairs</div>
                    <div className={`text-2xl font-black tracking-tight ${statusFilter === 'MY_WORK' ? 'text-indigo-700 dark:text-indigo-300' : 'text-[var(--text-main)]'}`}>{myWorkCount}</div>
                  </div>
                  <div className={`p-2.5 rounded-xl shadow-sm transition-colors ${statusFilter === 'MY_WORK' ? 'bg-indigo-500 text-white' : 'bg-white dark:bg-slate-800 text-indigo-500 border border-[var(--border-color)]'}`}><UserCheck size={20} /></div>
                </div>

                <div onClick={() => setStatusFilter('ATTENTION')} className={`flex items-center justify-between p-4 rounded-xl cursor-pointer transition-all duration-300 border ${statusFilter === 'ATTENTION' ? 'bg-amber-50 dark:bg-amber-500/10 border-amber-300 dark:border-amber-500/50 shadow-md ring-1 ring-amber-500/20 scale-[1.02]' : 'bg-[var(--bg-subtle)] border-[var(--border-color)] hover:border-amber-300 dark:hover:border-amber-600 hover:shadow-md hover:-translate-y-0.5'}`}>
                  <div>
                    <div className={`text-[10px] font-black uppercase tracking-widest mb-0.5 ${statusFilter === 'ATTENTION' ? 'text-amber-600 dark:text-amber-400' : 'text-[var(--text-muted)]'}`}>Needs Attention</div>
                    <div className={`text-2xl font-black tracking-tight ${statusFilter === 'ATTENTION' ? 'text-amber-700 dark:text-amber-300' : 'text-[var(--text-main)]'}`}>{urgentCount}</div>
                  </div>
                  <div className={`p-2.5 rounded-xl shadow-sm transition-colors ${statusFilter === 'ATTENTION' ? 'bg-amber-500 text-white' : 'bg-white dark:bg-slate-800 text-amber-500 border border-[var(--border-color)]'}`}><AlertTriangle size={20} /></div>
                </div>

                <div onClick={() => setStatusFilter('ALL')} className={`flex items-center justify-between p-4 rounded-xl cursor-pointer transition-all duration-300 border ${statusFilter === 'ALL' ? 'bg-cyan-50 dark:bg-cyan-500/10 border-cyan-300 dark:border-cyan-500/50 shadow-md ring-1 ring-cyan-500/20 scale-[1.02]' : 'bg-[var(--bg-subtle)] border-[var(--border-color)] hover:border-cyan-300 dark:hover:border-cyan-600 hover:shadow-md hover:-translate-y-0.5'}`}>
                  <div>
                    <div className={`text-[10px] font-black uppercase tracking-widest mb-0.5 ${statusFilter === 'ALL' ? 'text-cyan-600 dark:text-cyan-400' : 'text-[var(--text-muted)]'}`}>Est. Revenue</div>
                    <div className={`text-2xl font-black tracking-tight ${statusFilter === 'ALL' ? 'text-cyan-700 dark:text-cyan-300' : 'text-[var(--text-main)]'}`}>${totalRevenue.toLocaleString()}</div>
                  </div>
                  <div className={`p-2.5 rounded-xl shadow-sm transition-colors ${statusFilter === 'ALL' ? 'bg-cyan-500 text-white' : 'bg-white dark:bg-slate-800 text-cyan-500 border border-[var(--border-color)]'}`}><DollarSign size={20} /></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* MAIN CONTENT AREA */}
        <div className="lg:col-span-3">

          <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between bg-[var(--bg-surface)] p-3 px-4 rounded-xl border border-[var(--border-color)] shadow-sm gap-4 transition-all">
            <div className="flex items-center gap-3 flex-wrap">

              <div className="flex items-center gap-1.5 text-[var(--text-muted)] bg-[var(--bg-subtle)] px-2.5 py-1.5 rounded-md shadow-inner border border-[var(--border-color)]">
                <Layers size={14} />
                <span className="text-[10px] font-black uppercase tracking-widest">Viewing</span>
              </div>

              <div className={getFilterBadgeStyle(statusFilter)}>
                {statusFilter === 'BACKORDER' ? 'WAITING (PARTS)' : statusFilter.replace('_', ' ')}
              </div>

              {/* --- 2. UPDATED VIEWING BAR CLEAR BUTTON (Now uses clearFilters) --- */}
              {(statusFilter !== 'ALL' || searchQuery) && (
                <button
                  onClick={clearFilters}
                  className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)] hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 border border-transparent hover:border-red-200 dark:hover:border-red-900/30 px-2.5 py-1.5 rounded-md transition-all ml-1"
                >
                  <XCircle size={14} /> Clear
                </button>
              )}
            </div>

            <div className="bg-[var(--bg-subtle)] border border-[var(--border-color)] p-1 rounded-lg flex gap-1 shadow-inner">
              <button
                onClick={() => setViewMode('list')}
                className={`flex items-center justify-center p-1.5 px-3 rounded-md transition-all ${viewMode === 'list' ? 'bg-[var(--bg-surface)] text-indigo-600 dark:text-indigo-400 shadow-sm ring-1 ring-black/5 dark:ring-white/5' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}
                title="List View"
              >
                <ListIcon size={16} />
              </button>
              <button
                onClick={() => setViewMode('board')}
                className={`flex items-center justify-center p-1.5 px-3 rounded-md transition-all ${viewMode === 'board' ? 'bg-[var(--bg-surface)] text-indigo-600 dark:text-indigo-400 shadow-sm ring-1 ring-black/5 dark:ring-white/5' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}
                title="Kanban Board View"
              >
                <LayoutGrid size={16} />
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center mt-20"><span className="loading loading-spinner loading-lg text-primary"></span></div>
          ) : (
            <>
              {viewMode === 'board' ? (
                <div className="overflow-x-auto h-[calc(100vh-250px)]">
                  <KanbanBoard
                    tickets={filteredTickets}
                    onTicketUpdate={fetchTickets}
                  />
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                  {filteredTickets.length === 0 && (
                    <div className="col-span-full text-center p-12 border-2 border-dashed border-[var(--border-color)] rounded-2xl bg-[var(--bg-surface)]">
                      <p className="font-bold text-xl text-[var(--text-main)]">No tickets found</p>
                      <p className="text-sm mt-2 text-[var(--text-muted)]">Adjust your filters to see results.</p>
                      {/* Empty state "Clear Filters" button uses the unified function too */}
                      <button className="btn btn-outline btn-sm mt-6 text-[var(--text-main)]" onClick={clearFilters}>Clear Filters</button>
                    </div>
                  )}
                  {filteredTickets.map(ticket => (
                    <TicketCard key={ticket.id} ticket={ticket} />
                  ))}
                </div>
              )}
            </>
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