import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import TicketCard from '../components/TicketCard';
import IntakeModal from '../components/IntakeModal';
import KanbanBoard from '../components/KanbanBoard';
import Navbar from '../components/Navbar';
import { useNavigate } from 'react-router-dom';
import { formatCurrency } from '../utils';
import {
  Search, Filter, Plus, XCircle, QrCode,
  AlertTriangle, DollarSign, Activity, ChevronDown, ChevronUp, Layers, UserCheck,
  LayoutGrid, List as ListIcon, BarChart3, TrendingUp, Clock, Target, PieChart,
  CalendarDays, Trophy, Medal, ThumbsUp, Cpu
} from 'lucide-react';
import QRScanner from '../components/QRScanner';

export default function Dashboard() {
  const navigate = useNavigate();

  const [isIntakeModalOpen, setIsIntakeModalOpen] = useState(false);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  const [currentUser, setCurrentUser] = useState({ id: null, email: '', role: '', initial: '?' });
  const [searchQuery, setSearchQuery] = useState('');

  const [statusFilter, setStatusFilter] = useState('ACTIVE');
  const [isScanning, setIsScanning] = useState(false);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  const [customStatuses, setCustomStatuses] = useState([]);

  const [viewMode, setViewMode] = useState(() => {
    return localStorage.getItem('dashboardViewMode') || 'list';
  });

  const [analyticsTimeframe, setAnalyticsTimeframe] = useState('this_month');

  useEffect(() => {
    localStorage.setItem('dashboardViewMode', viewMode);
  }, [viewMode]);

  useEffect(() => {
    fetchUserData();
    fetchSettings();
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

  async function fetchSettings() {
    const { data } = await supabase.from('shop_settings').select('custom_statuses').eq('id', 1).single();
    if (data && data.custom_statuses) {
      setCustomStatuses(data.custom_statuses);
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
      default: return `${base} bg-cyan-500 text-white shadow-md shadow-cyan-500/30`;
    }
  };

  const getStatusLabel = (val) => {
    switch (val) {
      case 'ALL': return 'All Tickets';
      case 'ACTIVE': return 'Active Workload';
      case 'MY_WORK': return '👤 My Repairs';
      case 'ATTENTION': return '⚠️ Attention Needed';
      case 'intake': return 'In Queue';
      case 'diagnosing': return 'Diagnosing';
      case 'waiting_parts': return 'Waiting on Parts';
      case 'repairing': return 'Repairing';
      case 'ready_pickup': return 'Ready for Pickup';
      case 'completed': return 'Completed';
      default: return val; // Custom Statuses
    }
  };

  // --- NEW: REUSABLE CUSTOM DROPDOWN COMPONENT ---
  const StatusDropdown = ({ value, onChange, size = 'md' }) => {
    const isSmall = size === 'sm';
    const triggerClass = isSmall
      ? "btn h-9 min-h-0 bg-[var(--bg-subtle)] border-[var(--border-color)] text-[var(--text-main)] text-[10px] font-black uppercase tracking-widest shadow-inner focus:border-indigo-500 rounded-lg flex justify-between px-3 w-48"
      : "btn w-full h-12 bg-[var(--bg-subtle)] border-[var(--border-color)] hover:bg-[var(--bg-surface)] hover:border-indigo-300 shadow-sm flex justify-between items-center px-4 transition-all font-bold text-[var(--text-main)] text-sm";

    const menuClass = isSmall
      ? "dropdown-content z-[60] menu p-2 shadow-2xl bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-xl w-56 mt-2 animate-pop" // Let it auto adjust height!
      : "dropdown-content z-[60] menu p-2 shadow-2xl bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-xl w-full mt-2 animate-pop"; // Let it auto adjust height!

    return (
      <div className={`dropdown ${isSmall ? '' : 'w-full'}`}>
        <div tabIndex={0} role="button" className={triggerClass}>
          <span className="truncate pr-2">{getStatusLabel(value)}</span>
          <ChevronDown size={isSmall ? 14 : 16} className="opacity-70 flex-none" />
        </div>
        <ul tabIndex={0} className={menuClass}>
          {/* Dashboard Views */}
          <li className="menu-title text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] px-2 py-1">Views</li>
          <li><button onClick={(e) => { onChange('ALL'); e.currentTarget.blur(); }} className={`font-bold py-2.5 rounded-lg ${value === 'ALL' ? 'bg-[var(--bg-subtle)] text-indigo-600 dark:text-indigo-400' : 'text-[var(--text-main)] hover:bg-[var(--bg-subtle)]'}`}>All Tickets</button></li>
          <li><button onClick={(e) => { onChange('ACTIVE'); e.currentTarget.blur(); }} className={`font-bold py-2.5 rounded-lg ${value === 'ACTIVE' ? 'bg-[var(--bg-subtle)] text-indigo-600 dark:text-indigo-400' : 'text-[var(--text-main)] hover:bg-[var(--bg-subtle)]'}`}>Active Workload</button></li>
          <li><button onClick={(e) => { onChange('MY_WORK'); e.currentTarget.blur(); }} className={`font-bold py-2.5 rounded-lg ${value === 'MY_WORK' ? 'bg-[var(--bg-subtle)] text-indigo-600 dark:text-indigo-400' : 'text-[var(--text-main)] hover:bg-[var(--bg-subtle)]'}`}>👤 My Repairs</button></li>
          <li><button onClick={(e) => { onChange('ATTENTION'); e.currentTarget.blur(); }} className={`font-bold py-2.5 rounded-lg ${value === 'ATTENTION' ? 'bg-[var(--bg-subtle)] text-indigo-600 dark:text-indigo-400' : 'text-[var(--text-main)] hover:bg-[var(--bg-subtle)]'}`}>⚠️ Attention Needed</button></li>

          <div className="border-t border-dashed border-[var(--border-color)] my-2 mx-2"></div>

          {/* Core Statuses */}
          <li className="menu-title text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] px-2 py-1">Core Statuses</li>
          <li><button onClick={(e) => { onChange('intake'); e.currentTarget.blur(); }} className={`font-bold py-2.5 rounded-lg ${value === 'intake' ? 'bg-[var(--bg-subtle)] text-indigo-600 dark:text-indigo-400' : 'text-[var(--text-main)] hover:bg-[var(--bg-subtle)]'}`}><div className="w-2.5 h-2.5 rounded-full bg-blue-500 mr-2 shadow-sm"></div> In Queue</button></li>
          <li><button onClick={(e) => { onChange('diagnosing'); e.currentTarget.blur(); }} className={`font-bold py-2.5 rounded-lg ${value === 'diagnosing' ? 'bg-[var(--bg-subtle)] text-indigo-600 dark:text-indigo-400' : 'text-[var(--text-main)] hover:bg-[var(--bg-subtle)]'}`}><div className="w-2.5 h-2.5 rounded-full bg-purple-500 mr-2 shadow-sm"></div> Diagnosing</button></li>
          <li><button onClick={(e) => { onChange('waiting_parts'); e.currentTarget.blur(); }} className={`font-bold py-2.5 rounded-lg ${value === 'waiting_parts' ? 'bg-[var(--bg-subtle)] text-indigo-600 dark:text-indigo-400' : 'text-[var(--text-main)] hover:bg-[var(--bg-subtle)]'}`}><div className="w-2.5 h-2.5 rounded-full bg-orange-500 mr-2 shadow-sm"></div> Waiting on Parts</button></li>
          <li><button onClick={(e) => { onChange('repairing'); e.currentTarget.blur(); }} className={`font-bold py-2.5 rounded-lg ${value === 'repairing' ? 'bg-[var(--bg-subtle)] text-indigo-600 dark:text-indigo-400' : 'text-[var(--text-main)] hover:bg-[var(--bg-subtle)]'}`}><div className="w-2.5 h-2.5 rounded-full bg-amber-500 mr-2 shadow-sm"></div> Repairing</button></li>
          <li><button onClick={(e) => { onChange('ready_pickup'); e.currentTarget.blur(); }} className={`font-bold py-2.5 rounded-lg ${value === 'ready_pickup' ? 'bg-[var(--bg-subtle)] text-indigo-600 dark:text-indigo-400' : 'text-[var(--text-main)] hover:bg-[var(--bg-subtle)]'}`}><div className="w-2.5 h-2.5 rounded-full bg-emerald-500 mr-2 shadow-sm"></div> Ready for Pickup</button></li>
          <li><button onClick={(e) => { onChange('completed'); e.currentTarget.blur(); }} className={`font-bold py-2.5 rounded-lg ${value === 'completed' ? 'bg-[var(--bg-subtle)] text-indigo-600 dark:text-indigo-400' : 'text-[var(--text-main)] hover:bg-[var(--bg-subtle)]'}`}><div className="w-2.5 h-2.5 rounded-full bg-slate-500 mr-2 shadow-sm"></div> Completed</button></li>

          {/* Custom Statuses */}
          {customStatuses.length > 0 && (
            <>
              <div className="border-t border-dashed border-[var(--border-color)] my-2 mx-2"></div>
              <li className="menu-title text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] px-2 py-1">Custom Statuses</li>
              {customStatuses.map(status => (
                <li key={status}>
                  <button onClick={(e) => { onChange(status); e.currentTarget.blur(); }} className={`font-bold py-2.5 rounded-lg ${value === status ? 'bg-[var(--bg-subtle)] text-indigo-600 dark:text-indigo-400' : 'text-[var(--text-main)] hover:bg-[var(--bg-subtle)]'}`}>
                    <div className="w-2.5 h-2.5 rounded-full bg-cyan-500 mr-2 shadow-sm"></div> {status}
                  </button>
                </li>
              ))}
            </>
          )}
        </ul>
      </div>
    );
  };

  const clearFilters = () => {
    setStatusFilter('ALL');
    setSearchQuery('');
  };

  // ==========================================
  // --- ENTERPRISE ANALYTICS ENGINE MATH ---
  // ==========================================

  const now = new Date();
  const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
  const startOfThisYear = new Date(now.getFullYear(), 0, 1);

  const isInTimeframe = (dateString) => {
    if (!dateString) return false;
    const d = new Date(dateString);
    if (analyticsTimeframe === 'lifetime') return true;
    if (analyticsTimeframe === 'this_month') return d >= startOfThisMonth;
    if (analyticsTimeframe === 'last_month') return d >= startOfLastMonth && d <= endOfLastMonth;
    if (analyticsTimeframe === 'this_year') return d >= startOfThisYear;
    return true;
  };

  const periodTickets = tickets.filter(t => isInTimeframe(t.created_at));
  const periodCompleted = tickets.filter(t => t.status === 'completed' && isInTimeframe(t.updated_at));
  const activeTicketsSnapshot = tickets.filter(t => t.status !== 'completed');

  const completedRevenueCalc = periodCompleted.reduce((sum, t) => sum + (t.estimate_total || 0), 0);
  const activeRevenueCalc = activeTicketsSnapshot.reduce((sum, t) => sum + (t.estimate_total || 0), 0);
  const volumeCalc = periodTickets.length;

  let turnaroundText = 'N/A';
  if (periodCompleted.length > 0) {
    const totalMs = periodCompleted.reduce((sum, t) => sum + Math.max(0, new Date(t.updated_at).getTime() - new Date(t.created_at).getTime()), 0);
    const avgTurnaround = totalMs / periodCompleted.length;
    const avgDays = Math.floor(avgTurnaround / (1000 * 60 * 60 * 24));
    const avgHours = Math.floor((avgTurnaround % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    turnaroundText = avgDays > 0 ? `${avgDays}d ${avgHours}h` : `${avgHours}h`;
  }

  const approvedCount = periodTickets.filter(t => t.estimate_status === 'approved').length;
  const declinedCount = periodTickets.filter(t => t.estimate_status === 'declined').length;
  const totalEstimates = approvedCount + declinedCount;
  const winRate = totalEstimates > 0 ? Math.round((approvedCount / totalEstimates) * 100) : 0;

  const techStats = {};
  tickets.forEach(t => {
    const name = t.assignee_name;
    if (!name) return;
    if (!techStats[name]) techStats[name] = { name, active: 0, completed: 0, revenue: 0 };

    if (t.status !== 'completed') {
      techStats[name].active += 1;
    } else if (isInTimeframe(t.updated_at)) {
      techStats[name].completed += 1;
      techStats[name].revenue += (t.estimate_total || 0);
    }
  });
  const leaderboard = Object.values(techStats)
    .filter(t => t.active > 0 || t.completed > 0)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 4);

  const brandStats = {};
  periodTickets.forEach(t => {
    if (!t.brand) return;
    const brand = t.brand.trim().toUpperCase();
    brandStats[brand] = (brandStats[brand] || 0) + 1;
  });
  const topBrands = Object.entries(brandStats)
    .map(([brand, count]) => ({ brand, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
  const maxBrandCount = topBrands.length > 0 ? topBrands[0].count : 1;

  const statusCounts = {
    intake: activeTicketsSnapshot.filter(t => t.status === 'intake').length,
    diagnosing: activeTicketsSnapshot.filter(t => t.status === 'diagnosing').length,
    waiting_parts: activeTicketsSnapshot.filter(t => t.status === 'waiting_parts').length,
    repairing: activeTicketsSnapshot.filter(t => t.status === 'repairing').length,
    ready_pickup: activeTicketsSnapshot.filter(t => t.status === 'ready_pickup').length
  };
  const maxStatusCount = Math.max(...Object.values(statusCounts)) || 1;

  const PipelineBar = ({ label, count, max, color }) => (
    <div className="mb-3">
      <div className="flex justify-between text-[10px] font-black uppercase tracking-widest mb-1.5">
        <span className="text-[var(--text-muted)]">{label}</span>
        <span className="text-[var(--text-main)]">{count}</span>
      </div>
      <div className="w-full bg-[var(--bg-subtle)] rounded-full h-2.5 shadow-inner border border-[var(--border-color)] overflow-hidden">
        <div className={`h-full rounded-full ${color} shadow-sm transition-all duration-1000`} style={{ width: `${count > 0 ? Math.max(2, (count / max) * 100) : 0}%` }}></div>
      </div>
    </div>
  );

  // --- DASHBOARD SPECIFIC ACTIONS TO INJECT INTO NAVBAR ---
  const dashboardActions = (
    <>
      <button className="btn btn-sm btn-circle btn-ghost text-[var(--text-muted)] hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all" onClick={() => setIsScanning(true)} title="Scan QR Code">
        <QrCode size={20} />
      </button>
      <button className="btn btn-sm md:btn-md btn-gradient text-white rounded-full shadow-lg hover:shadow-indigo-500/40 border-none px-4 md:px-6 hover:scale-105 transition-all ml-1" onClick={() => setIsIntakeModalOpen(true)}>
        <Plus size={18} strokeWidth={3} /> <span className="hidden md:inline font-bold">New Ticket</span>
      </button>
    </>
  );

  return (
    <div className="min-h-screen p-4 md:p-6 font-sans transition-colors duration-300 pb-20">

      {/* USING THE NEW GLOBAL NAVBAR COMPONENT */}
      <Navbar rightActions={dashboardActions} />

      {/* MOBILE FILTERS */}
      <div className="lg:hidden mb-6 relative z-30">
        <div className="flex gap-2 relative">
          <div className="relative flex-1 group">
            <input type="text" placeholder="Search tickets..." className="input input-bordered w-full pl-12 pr-10 rounded-full shadow-sm bg-[var(--bg-subtle)] text-[var(--text-main)] focus:bg-[var(--bg-surface)] focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-medium h-12" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within:text-indigo-500 transition-colors" size={18} />
            {searchQuery && <button onClick={() => setSearchQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-red-500 transition-colors"><XCircle size={18} /></button>}
          </div>
          <button onClick={() => setIsMobileFilterOpen(!isMobileFilterOpen)} className={`btn rounded-full px-5 h-12 transition-all ${isMobileFilterOpen ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30 border-none hover:scale-105 hover:bg-indigo-700' : 'btn-ghost bg-[var(--bg-surface)] border border-[var(--border-color)] hover:bg-[var(--bg-subtle)]'}`}>
            <Filter size={18} />
            {isMobileFilterOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>

        {isMobileFilterOpen && (
          <div className="absolute top-14 left-0 right-0 bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-color)] p-5 shadow-2xl animate-pop z-40 mt-2">
            <div className="form-control w-full mb-5">
              <label className="label py-0 mb-2"><span className="label-text text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Ticket Status</span></label>

              {/* --- NEW STYLED MOBILE DROPDOWN --- */}
              <StatusDropdown
                value={statusFilter}
                onChange={(val) => { setStatusFilter(val); setIsMobileFilterOpen(false); }}
              />

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

      {/* DYNAMIC GRID */}
      <div className={`grid grid-cols-1 ${viewMode === 'list' ? 'lg:grid-cols-4' : ''} gap-8 animate-fade`}>

        {/* SIDEBAR FILTERS */}
        {viewMode === 'list' && (
          <div className="hidden lg:block lg:col-span-1">
            <div className="sticky top-28 rounded-2xl shadow-sm bg-[var(--bg-surface)] border border-[var(--border-color)]">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6 border-b border-[var(--border-color)] pb-4">
                  <h3 className="font-black text-[var(--text-main)] flex gap-2 items-center text-lg"><Filter size={20} className="text-indigo-500" /> Filters</h3>

                  {(statusFilter !== 'ALL' || searchQuery) && (
                    <button onClick={clearFilters} className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)] hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 border border-transparent hover:border-red-200 dark:hover:border-red-900/30 px-2 py-1 rounded-md transition-all">
                      <XCircle size={14} /> Clear
                    </button>
                  )}
                </div>

                <div className="form-control w-full">
                  <label className="label py-0 mb-2"><span className="label-text text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Ticket Status</span></label>

                  {/* --- NEW STYLED SIDEBAR DROPDOWN --- */}
                  <StatusDropdown value={statusFilter} onChange={setStatusFilter} />

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
                      <div className={`text-2xl font-black tracking-tight ${statusFilter === 'ALL' ? 'text-cyan-700 dark:text-cyan-300' : 'text-[var(--text-main)]'}`}>{formatCurrency(totalRevenue)}</div>
                    </div>
                    <div className={`p-2.5 rounded-xl shadow-sm transition-colors ${statusFilter === 'ALL' ? 'bg-cyan-500 text-white' : 'bg-white dark:bg-slate-800 text-cyan-500 border border-[var(--border-color)]'}`}><DollarSign size={20} /></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MAIN CONTENT AREA */}
        <div className={viewMode === 'list' ? "lg:col-span-3" : "col-span-full"}>

          <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between bg-[var(--bg-surface)] p-3 px-4 rounded-xl border border-[var(--border-color)] shadow-sm gap-4 transition-all">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-1.5 text-[var(--text-muted)] bg-[var(--bg-subtle)] px-2.5 py-1.5 rounded-md shadow-inner border border-[var(--border-color)]">
                <Layers size={14} />
                <span className="text-[10px] font-black uppercase tracking-widest">
                  {viewMode === 'analytics' ? 'Dashboard' : 'Viewing'}
                </span>
              </div>

              {viewMode !== 'analytics' ? (
                <div className={getFilterBadgeStyle(statusFilter)}>
                  {statusFilter === 'BACKORDER' ? 'WAITING (PARTS)' : statusFilter.replace('_', ' ')}
                </div>
              ) : (
                <div className="dropdown">
                  <div tabIndex={0} role="button" className="btn btn-sm h-8 bg-indigo-500 hover:bg-indigo-600 text-white border-none shadow-md flex justify-between items-center px-4 transition-all w-36">
                    <span className="font-black uppercase tracking-widest text-[10px] truncate">
                      {analyticsTimeframe.replace('_', ' ')}
                    </span>
                    <ChevronDown size={14} className="opacity-80 flex-none" />
                  </div>
                  <ul tabIndex={0} className="dropdown-content z-[60] menu p-2 shadow-2xl bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-xl w-48 mt-2 animate-pop">
                    <li className="menu-title text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] px-2 py-1">Timeframe</li>
                    <li><button onClick={(e) => { setAnalyticsTimeframe('this_month'); e.currentTarget.blur(); }} className={`font-bold py-2.5 rounded-lg ${analyticsTimeframe === 'this_month' ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400' : 'text-[var(--text-main)] hover:bg-[var(--bg-subtle)]'}`}><CalendarDays size={14} className="mr-1" /> This Month</button></li>
                    <li><button onClick={(e) => { setAnalyticsTimeframe('last_month'); e.currentTarget.blur(); }} className={`font-bold py-2.5 rounded-lg ${analyticsTimeframe === 'last_month' ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400' : 'text-[var(--text-main)] hover:bg-[var(--bg-subtle)]'}`}><CalendarDays size={14} className="mr-1" /> Last Month</button></li>
                    <li><button onClick={(e) => { setAnalyticsTimeframe('this_year'); e.currentTarget.blur(); }} className={`font-bold py-2.5 rounded-lg ${analyticsTimeframe === 'this_year' ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400' : 'text-[var(--text-main)] hover:bg-[var(--bg-subtle)]'}`}><CalendarDays size={14} className="mr-1" /> This Year</button></li>
                    <div className="border-t border-dashed border-[var(--border-color)] my-1"></div>
                    <li><button onClick={(e) => { setAnalyticsTimeframe('lifetime'); e.currentTarget.blur(); }} className={`font-bold py-2.5 rounded-lg ${analyticsTimeframe === 'lifetime' ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400' : 'text-[var(--text-main)] hover:bg-[var(--bg-subtle)]'}`}><Target size={14} className="mr-1" /> Lifetime</button></li>
                  </ul>
                </div>
              )}

              {viewMode !== 'analytics' && (statusFilter !== 'ALL' || searchQuery) && (
                <button onClick={clearFilters} className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)] hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 border border-transparent hover:border-red-200 dark:hover:border-red-900/30 px-2.5 py-1.5 rounded-md transition-all ml-1">
                  <XCircle size={14} /> Clear
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">

              {/* KANBAN SPECIFIC FILTERS */}
              {viewMode === 'board' && (
                <div className="hidden md:flex items-center gap-2 mr-2">
                  <div className="relative group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within:text-indigo-500 transition-colors" size={14} />
                    <input type="text" className="input input-sm h-9 w-48 pl-9 bg-[var(--bg-subtle)] focus:bg-[var(--bg-surface)] text-[var(--text-main)] shadow-inner border-[var(--border-color)] focus:border-indigo-500 transition-all font-medium text-xs rounded-lg" placeholder="Search board..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                  </div>

                  {/* --- NEW STYLED KANBAN DROPDOWN --- */}
                  <StatusDropdown value={statusFilter} onChange={setStatusFilter} size="sm" />

                </div>
              )}

              {/* VIEW TOGGLES */}
              <div className="bg-[var(--bg-subtle)] border border-[var(--border-color)] p-1 rounded-lg flex gap-1 shadow-inner flex-none">
                <button onClick={() => setViewMode('list')} className={`flex items-center justify-center p-1.5 px-3 rounded-md transition-all ${viewMode === 'list' ? 'bg-[var(--bg-surface)] text-indigo-600 dark:text-indigo-400 shadow-sm ring-1 ring-black/5 dark:ring-white/5' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`} title="List View"><ListIcon size={16} /></button>
                <button onClick={() => setViewMode('board')} className={`flex items-center justify-center p-1.5 px-3 rounded-md transition-all ${viewMode === 'board' ? 'bg-[var(--bg-surface)] text-indigo-600 dark:text-indigo-400 shadow-sm ring-1 ring-black/5 dark:ring-white/5' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`} title="Kanban Board View"><LayoutGrid size={16} /></button>
                {isManagement && (
                  <button onClick={() => setViewMode('analytics')} className={`flex items-center justify-center p-1.5 px-3 rounded-md transition-all ${viewMode === 'analytics' ? 'bg-[var(--bg-surface)] text-indigo-600 dark:text-indigo-400 shadow-sm ring-1 ring-black/5 dark:ring-white/5' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`} title="Analytics & Metrics"><BarChart3 size={16} /></button>
                )}
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center mt-20"><span className="loading loading-spinner loading-lg text-primary"></span></div>
          ) : (
            <>
              {/* ======================================= */}
              {/* --- UPGRADED ENTERPRISE ANALYTICS --- */}
              {/* ======================================= */}
              {viewMode === 'analytics' ? (
                <div className="space-y-6 animate-fade-in-up">

                  {/* TOP 4 METRIC CARDS */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">

                    <div className="bg-[var(--bg-surface)] p-5 rounded-2xl border border-[var(--border-color)] shadow-sm relative overflow-hidden group hover:border-emerald-300 dark:hover:border-emerald-800 transition-colors">
                      <div className="absolute -right-4 -top-4 text-emerald-500/10 group-hover:scale-110 transition-transform"><TrendingUp size={80} /></div>
                      <div className="relative z-10">
                        <div className="flex justify-between items-start mb-4">
                          <div className="p-2.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-xl shadow-inner border border-emerald-100 dark:border-emerald-800"><TrendingUp size={18} /></div>
                        </div>
                        <h3 className="text-2xl font-black text-[var(--text-main)] tracking-tight mb-1">{formatCurrency(completedRevenueCalc)}</h3>
                        <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Realized Revenue</p>
                      </div>
                    </div>

                    <div className="bg-[var(--bg-surface)] p-5 rounded-2xl border border-[var(--border-color)] shadow-sm relative overflow-hidden group hover:border-purple-300 dark:hover:border-purple-800 transition-colors">
                      <div className="absolute -right-4 -top-4 text-purple-500/10 group-hover:scale-110 transition-transform"><Target size={80} /></div>
                      <div className="relative z-10">
                        <div className="flex justify-between items-start mb-4">
                          <div className="p-2.5 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-xl shadow-inner border border-purple-100 dark:border-purple-800"><Target size={18} /></div>
                        </div>
                        <h3 className="text-2xl font-black text-[var(--text-main)] tracking-tight mb-1">{volumeCalc}</h3>
                        <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Tickets Created</p>
                      </div>
                    </div>

                    <div className="bg-[var(--bg-surface)] p-5 rounded-2xl border border-[var(--border-color)] shadow-sm relative overflow-hidden group hover:border-blue-300 dark:hover:border-blue-800 transition-colors">
                      <div className="absolute -right-4 -top-4 text-blue-500/10 group-hover:scale-110 transition-transform"><Clock size={80} /></div>
                      <div className="relative z-10">
                        <div className="flex justify-between items-start mb-4">
                          <div className="p-2.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl shadow-inner border border-blue-100 dark:border-blue-800"><Clock size={18} /></div>
                        </div>
                        <h3 className="text-2xl font-black text-[var(--text-main)] tracking-tight mb-1">{turnaroundText}</h3>
                        <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Avg Turnaround</p>
                      </div>
                    </div>

                    <div className="bg-[var(--bg-surface)] p-5 rounded-2xl border border-[var(--border-color)] shadow-sm relative overflow-hidden group hover:border-amber-300 dark:hover:border-amber-800 transition-colors">
                      <div className="absolute -right-4 -top-4 text-amber-500/10 group-hover:scale-110 transition-transform"><ThumbsUp size={80} /></div>
                      <div className="relative z-10">
                        <div className="flex justify-between items-start mb-4">
                          <div className="p-2.5 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded-xl shadow-inner border border-amber-100 dark:border-amber-800"><ThumbsUp size={18} /></div>
                          {totalEstimates > 0 && <span className="text-[9px] font-black text-[var(--text-muted)] bg-[var(--bg-subtle)] border border-[var(--border-color)] px-1.5 py-0.5 rounded shadow-inner">{totalEstimates} Sent</span>}
                        </div>
                        <h3 className="text-2xl font-black text-[var(--text-main)] tracking-tight mb-1">{winRate}%</h3>
                        <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Estimate Win Rate</p>
                      </div>
                    </div>

                  </div>

                  {/* GRIDS: Leaderboard, Brands, Pipeline */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {/* --- TECHNICIAN LEADERBOARD --- */}
                    <div className="bg-[var(--bg-surface)] p-6 rounded-2xl border border-[var(--border-color)] shadow-sm flex flex-col h-full">
                      <h3 className="text-xs font-black uppercase tracking-widest text-[var(--text-main)] mb-5 flex items-center gap-2 border-b border-[var(--border-color)] pb-3">
                        <Trophy size={16} className="text-yellow-500" /> Tech Leaderboard
                      </h3>
                      <div className="space-y-4 flex-1">
                        {leaderboard.length === 0 ? (
                          <div className="text-center text-[var(--text-muted)] text-sm py-8 font-medium">No completions recorded.</div>
                        ) : (
                          leaderboard.map((tech, idx) => (
                            <div key={tech.name} className="flex items-center gap-3 p-3 bg-[var(--bg-subtle)] rounded-xl border border-[var(--border-color)] shadow-inner relative overflow-hidden">
                              {idx === 0 && <div className="absolute top-0 right-0 w-8 h-8 bg-yellow-400/20 rounded-bl-full flex items-start justify-end pr-1 pt-1"><Medal size={12} className="text-yellow-600" /></div>}

                              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-xs shadow-md border ${idx === 0 ? 'bg-gradient-to-br from-yellow-400 to-yellow-600 text-white border-yellow-300' : 'bg-[var(--bg-surface)] text-[var(--text-muted)] border-[var(--border-color)]'}`}>
                                {tech.name.substring(0, 2).toUpperCase()}
                              </div>

                              <div className="flex-1 min-w-0">
                                <div className="font-black text-sm text-[var(--text-main)] truncate">{tech.name}</div>
                                <div className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-widest flex items-center gap-2 mt-0.5">
                                  <span>{tech.completed} Closed</span> •
                                  <span className={`${tech.active > 5 ? 'text-amber-500' : ''}`}>{tech.active} Active</span>
                                </div>
                              </div>

                              <div className="text-right">
                                <div className="text-sm font-black text-emerald-600 dark:text-emerald-400">{formatCurrency(tech.revenue)}</div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* --- TOP BRANDS --- */}
                    <div className="bg-[var(--bg-surface)] p-6 rounded-2xl border border-[var(--border-color)] shadow-sm flex flex-col h-full">
                      <h3 className="text-xs font-black uppercase tracking-widest text-[var(--text-main)] mb-5 flex items-center gap-2 border-b border-[var(--border-color)] pb-3">
                        <Cpu size={16} className="text-indigo-500" /> Top Device Brands
                      </h3>
                      <div className="space-y-5 mt-1 flex-1">
                        {topBrands.length === 0 ? (
                          <div className="text-center text-[var(--text-muted)] text-sm py-8 font-medium">No devices logged.</div>
                        ) : (
                          topBrands.map((brand, idx) => (
                            <div key={brand.brand}>
                              <div className="flex justify-between items-center mb-1.5">
                                <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-main)] flex items-center gap-1.5">
                                  <span className="text-[var(--text-muted)] opacity-50">#{idx + 1}</span> {brand.brand}
                                </span>
                                <span className="text-xs font-bold text-[var(--text-muted)]">{brand.count}</span>
                              </div>
                              <div className="w-full bg-[var(--bg-subtle)] rounded-full h-2 shadow-inner border border-[var(--border-color)] overflow-hidden">
                                <div className="h-full rounded-full bg-indigo-500 shadow-sm" style={{ width: `${(brand.count / maxBrandCount) * 100}%` }}></div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* --- PIPELINE SNAPSHOT --- */}
                    <div className="bg-[var(--bg-surface)] p-6 rounded-2xl border border-[var(--border-color)] shadow-sm flex flex-col h-full">
                      <h3 className="text-xs font-black uppercase tracking-widest text-[var(--text-main)] mb-5 flex items-center gap-2 border-b border-[var(--border-color)] pb-3">
                        <PieChart size={16} className="text-blue-500" /> Active Pipeline Status
                      </h3>
                      <div className="space-y-4 mt-2 flex-1">
                        <PipelineBar label="In Queue (Intake)" count={statusCounts.intake} max={maxStatusCount} color="bg-blue-500" />
                        <PipelineBar label="Diagnosing" count={statusCounts.diagnosing} max={maxStatusCount} color="bg-purple-500" />
                        <PipelineBar label="Waiting on Parts" count={statusCounts.waiting_parts} max={maxStatusCount} color="bg-orange-500" />
                        <PipelineBar label="Repairing" count={statusCounts.repairing} max={maxStatusCount} color="bg-amber-500" />
                        <PipelineBar label="Ready for Pickup" count={statusCounts.ready_pickup} max={maxStatusCount} color="bg-emerald-500" />
                      </div>
                    </div>

                  </div>
                </div>
              ) : viewMode === 'board' ? (
                <div className="overflow-x-auto h-[calc(100vh-250px)] pb-4 custom-scrollbar">
                  <KanbanBoard tickets={filteredTickets} onTicketUpdate={fetchTickets} customStatuses={customStatuses} />
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                  {filteredTickets.length === 0 && (
                    <div className="col-span-full text-center p-12 border-2 border-dashed border-[var(--border-color)] rounded-2xl bg-[var(--bg-surface)]">
                      <p className="font-bold text-xl text-[var(--text-main)]">No tickets found</p>
                      <p className="text-sm mt-2 text-[var(--text-muted)]">Adjust your filters to see results.</p>
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