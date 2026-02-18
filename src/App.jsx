import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { ToastProvider } from './context/ToastProvider';
import PrintLabel from './pages/PrintLabel';

// COMPONENTS
import AutoLogout from './components/AutoLogout'; // <--- Added Security

// PAGES
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import TicketDetail from './pages/TicketDetail';
import CustomerHistory from './pages/CustomerHistory';
import MyTickets from './pages/MyTickets';
import Team from './pages/Team'; // <--- Added Team Page
import Customers from './pages/Customers'; // <--- Added Customers Page
import Inventory from './pages/Inventory';
import PublicStatusPage from './pages/PublicStatusPage';


function App() {
  const [session, setSession] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  // Helper to check if user works here (Employee, Manager, or Admin)
  const isStaff = ['employee', 'manager', 'admin'].includes(role);
  // Helper to check if user is management
  const isManagement = ['manager', 'admin'].includes(role);

  const fetchRole = async (userId) => {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .maybeSingle();

    setRole(profile?.role || 'customer');
    setLoading(false);
  };

  useEffect(() => {
    // --- GLOBAL THEME INITIALIZATION ---
    // This ensures dark mode stays applied on ANY page refresh
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    if (savedTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    const initSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setSession(session);
        await fetchRole(session.user.id);
      } else {
        setLoading(false);
      }
    };

    initSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        setLoading(true);
        fetchRole(session.user.id);
      } else {
        setRole(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) return (
    <div className="h-screen grid place-items-center bg-white dark:bg-slate-900 transition-colors">
      <span className="loading loading-spinner loading-lg text-indigo-600 dark:text-indigo-400"></span>
    </div>
  );

  return (
    <ToastProvider>
      <BrowserRouter>
        {/* Security Guard: Watches for inactivity */}
        {session && <AutoLogout />}

        <Routes>
          <Route path="/login" element={!session ? <Login /> : <Navigate to="/" />} />

          {/* ROOT REDIRECT LOGIC */}
          <Route
            path="/"
            element={
              !session ? <Navigate to="/login" /> :
                isStaff ? <Navigate to="/dashboard" /> : // Any staff goes to dashboard
                  <Navigate to="/my-tickets" /> // Customers go to my-tickets
            }
          />

          {/* DASHBOARD - Allowed for Employee, Manager, Admin */}
          <Route
            path="/dashboard"
            element={session && isStaff ? <Dashboard /> : <Navigate to="/" />}
          />

          {/* MY TICKETS - Only for Customers */}
          <Route
            path="/my-tickets"
            element={session && !isStaff ? <MyTickets /> : <Navigate to="/" />}
          />

          {/* TICKET DETAIL - Accessible by everyone (internally filters view) */}
          <Route
            path="/ticket/:id"
            element={session ? <TicketDetail /> : <Navigate to="/login" />}
          />

          {/* --- NEW PRINT LABEL ROUTE --- */}
          {/* Only Staff should be able to access the label generator */}
          <Route
            path="/print/:id"
            element={session && isStaff ? <PrintLabel /> : <Navigate to="/" />}
          />

          {/* INVENTORY MANAGEMENT - Staff Only */}
          <Route
            path="/inventory"
            element={session && isStaff ? <Inventory /> : <Navigate to="/" />}
          />

          {/* 2. Add Public Route (No Auth Guard!) */}
          <Route path="/status/:id" element={<PublicStatusPage />} />

          {/* CUSTOMER HISTORY - Staff Only */}
          <Route
            path="/customer/:id"
            element={session && isStaff ? <CustomerHistory /> : <Navigate to="/" />}
          />

          <Route
            path="/customers"
            element={session && isStaff ? <Customers /> : <Navigate to="/" />}
          />

          {/* TEAM MANAGEMENT - Managers & Admins Only */}
          <Route
            path="/team"
            element={session && isManagement ? <Team /> : <Navigate to="/" />}
          />
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  );
}

export default App;