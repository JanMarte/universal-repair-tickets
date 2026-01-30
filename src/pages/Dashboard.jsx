import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import TicketCard from '../components/TicketCard';
import IntakeModal from '../components/IntakeModal';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, Moon, Sun, Plus, XCircle, LogOut, Users } from 'lucide-react'; // Added Users icon
import { useToast } from '../context/ToastProvider';

export default function Dashboard() {
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
  const [isIntakeModalOpen, setIsIntakeModalOpen] = useState(false);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  const [currentUser, setCurrentUser] = useState({ email: '', role: '', initial: '?' });
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  useEffect(() => {
    // 1. Sync Theme on Load
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
        email: user.email,
        role: profile?.role || 'employee',
        initial: user.email.charAt(0).toUpperCase()
      });
    }
  }

  async function fetchTickets() {
    setLoading(true);
    // RLS policies now handle who sees what, so we just ask for tickets
    const { data, error } = await supabase.from('tickets').select('*').order('created_at', { ascending: false });
    if (error) console.error('Error fetching tickets:', error);
    else setTickets(data);
    setLoading(false);
  }

  const handleLogout = async () => {
    await supabase.auth.signOut();
    addToast("Logged out successfully", "info");
    navigate('/login');
  };

  // Helper to check for Manager/Admin
  const isManagement = ['manager', 'admin'].includes(currentUser.role);

  const filteredTickets = tickets.filter(ticket => {
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch =
      ticket.id.toString().includes(searchLower) ||
      (ticket.customer_name || '').toLowerCase().includes(searchLower) ||
      (ticket.phone || '').includes(searchLower) ||
      (ticket.brand || '').toLowerCase().includes(searchLower) ||
      (ticket.model || '').toLowerCase().includes(searchLower) ||
      (ticket.serial_number || '').toLowerCase().includes(searchLower); // Added Serial Search
    const matchesStatus = statusFilter === 'ALL' || ticket.status === statusFilter;
    if (statusFilter === 'BACKORDER') return matchesSearch && ticket.is_backordered;
    return matchesSearch && matchesStatus;
  });

  const handleCreateTicket = async (formData) => {
    let customerId = formData.customer_id;

    // 1. If it's a NEW customer, create them first
    if (!customerId) {
      const { data: newCust, error: custError } = await supabase
        .from('customers')
        .insert([{
          full_name: formData.full_name,
          email: formData.email,
          phone: formData.phone
        }])
        .select()
        .single();

      if (custError) {
        addToast("Error creating customer", "error");
        return;
      }
      customerId = newCust.id;
    }

    // 2. Create the Ticket
    const { error } = await supabase.from('tickets').insert([{
      customer_id: customerId,
      customer_name: formData.full_name,
      phone: formData.phone,
      brand: formData.brand,
      model: formData.model,
      serial_number: formData.serial,
      description: formData.description,
      status: 'intake',
      is_backordered: false
    }]).select();

    if (error) {
      addToast("Error creating ticket", "error");
    } else {
      addToast("Ticket created successfully!", "success");
      setIsIntakeModalOpen(false);
      fetchTickets();
    }
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
      <div className="navbar rounded-2xl mb-8 sticky top-4 z-40 animate-fade flex justify-between shadow-sm backdrop-blur-md bg-[var(--bg-surface)] border border-[var(--border-color)]">
        <div className="flex-1">
          <a className="btn btn-ghost text-2xl font-black tracking-tight text-[var(--text-main)] hover:bg-transparent">
            Vacuum Repair Shop
          </a>
          <span className="md:hidden font-black text-[var(--text-main)] text-lg">VRS</span>
        </div>

        <div className="flex-none flex items-center gap-5">
          <button
            className="btn btn-gradient gap-2 px-6 rounded-full shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all border-none"
            onClick={() => setIsIntakeModalOpen(true)}
          >
            <Plus size={20} strokeWidth={3} /> <span className="hidden md:inline font-bold">New Ticket</span>
          </button>

          {/* SEARCH BAR */}
          <div className="form-control relative hidden md:block">
            <input
              type="text"
              placeholder="Search tickets..."
              className="input input-bordered w-64 pl-12 pr-10 rounded-full shadow-inner font-medium transition-all focus:border-indigo-500"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <div className="absolute left-4 top-3.5 text-slate-400 pointer-events-none">
              <Search size={18} />
            </div>
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-3 top-3.5 text-slate-400 hover:text-red-500">
                <XCircle size={18} />
              </button>
            )}
          </div>

          <button className="btn btn-ghost btn-circle text-[var(--text-main)] hover:bg-[var(--bg-subtle)]" onClick={toggleTheme}>
            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
          </button>

          {/* USER MENU */}
          <div className="dropdown dropdown-end">
            <div tabIndex={0} role="button" className="btn btn-ghost btn-circle avatar placeholder">
              <div className="bg-slate-800 text-white rounded-full w-10 shadow-lg ring-2 ring-white dark:ring-slate-600">
                <span className="text-lg font-bold">{currentUser.initial}</span>
              </div>
            </div>
            {/* Dropdown Menu */}
            <ul tabIndex={0} className="mt-4 z-[1] p-2 shadow-2xl menu menu-sm dropdown-content rounded-xl w-60 bg-[var(--bg-surface)] border border-[var(--border-color)]">
              <li className="menu-title px-4 py-2 border-b border-[var(--border-color)] mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">Signed In As</span>
              </li>
              <li className="px-2">
                <div className="flex flex-col gap-1 items-start p-2 hover:bg-[var(--bg-subtle)] rounded-lg">
                  <span className="font-bold text-sm truncate w-full text-[var(--text-main)]">{currentUser.email}</span>
                  <span className={`badge badge-sm uppercase font-bold text-[10px] tracking-wide text-white ${currentUser.role === 'admin' ? 'badge-secondary' : currentUser.role === 'manager' ? 'badge-primary' : 'badge-neutral'}`}>
                    {currentUser.role}
                  </span>
                </div>
              </li>

              {/* MANAGER ONLY MENU ITEMS */}
              {isManagement && (
                <>
                  <div className="divider my-1 border-[var(--border-color)]"></div>
                  <li>
                    <button onClick={() => navigate('/team')} className="font-bold py-3 hover:bg-[var(--bg-subtle)] rounded-lg text-indigo-600">
                      <Users size={16} /> Manage Team
                    </button>
                  </li>
                </>
              )}

              <div className="divider my-1 border-[var(--border-color)]"></div>
              <li>
                <button onClick={handleLogout} className="text-red-600 font-bold py-3 hover:bg-[var(--bg-subtle)] rounded-lg">
                  <LogOut size={16} /> Logout
                </button>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 animate-fade">
        <div className="lg:col-span-1">

          {/* FILTER SIDEBAR */}
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
                <select
                  className="select select-bordered w-full font-bold shadow-sm"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="ALL">All Tickets</option>
                  <option value="intake">Intake</option>
                  <option value="diagnosing">Diagnosing</option>
                  <option value="BACKORDER">Waiting on Parts (BO)</option>
                  <option value="repairing">Repairing</option>
                  <option value="ready_pickup">Ready for Pickup</option>
                  <option value="completed">Completed</option>
                </select>
              </div>

              {/* Mobile Search */}
              <div className="form-control w-full mt-4 md:hidden">
                <label className="label py-0 mb-2"><span className="label-text text-xs font-bold uppercase text-[var(--text-muted)]">Search</span></label>
                <input type="text" className="input input-bordered w-full" placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
              </div>

              <div className="mt-8 pt-6 border-t border-[var(--border-color)]">
                <div className="stat p-0">
                  <div className="stat-title text-xs font-bold uppercase text-[var(--text-muted)] mb-1">Active Workload</div>
                  <div className="stat-value text-4xl text-primary font-black tracking-tight">{tickets.length}</div>
                  <div className="stat-desc font-semibold text-[var(--text-muted)] mt-1">tickets in database</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-3">
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

      <IntakeModal isOpen={isIntakeModalOpen} onClose={() => setIsIntakeModalOpen(false)} onSubmit={handleCreateTicket} />
    </div>
  )
}