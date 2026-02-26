import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { ToastProvider } from './context/ToastProvider';
import PrintLabel from './pages/PrintLabel';

// COMPONENTS
import AutoLogout from './components/AutoLogout';

// PAGES
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import TicketDetail from './pages/TicketDetail';
import CustomerHistory from './pages/CustomerHistory';
import MyTickets from './pages/MyTickets';
import Team from './pages/Team';
import Customers from './pages/Customers';
import Inventory from './pages/Inventory';
import PublicStatusPage from './pages/PublicStatusPage';
import Settings from './pages/Settings'; // <--- Added Settings Import

function App() {
  const [session, setSession] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  const isStaff = ['employee', 'manager', 'admin'].includes(role);
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
        {session && <AutoLogout />}

        <Routes>
          <Route path="/login" element={!session ? <Login /> : <Navigate to="/" />} />

          <Route
            path="/"
            element={
              !session ? <Navigate to="/login" /> :
                isStaff ? <Navigate to="/dashboard" /> :
                  <Navigate to="/my-tickets" />
            }
          />

          <Route path="/dashboard" element={session && isStaff ? <Dashboard /> : <Navigate to="/" />} />
          <Route path="/my-tickets" element={session && !isStaff ? <MyTickets /> : <Navigate to="/" />} />
          <Route path="/ticket/:id" element={session ? <TicketDetail /> : <Navigate to="/login" />} />
          <Route path="/print/:id" element={session && isStaff ? <PrintLabel /> : <Navigate to="/" />} />
          <Route path="/inventory" element={session && isStaff ? <Inventory /> : <Navigate to="/" />} />
          <Route path="/status/:id" element={<PublicStatusPage />} />
          <Route path="/customer/:id" element={session && isStaff ? <CustomerHistory /> : <Navigate to="/" />} />
          <Route path="/customers" element={session && isStaff ? <Customers /> : <Navigate to="/" />} />
          <Route path="/team" element={session && isManagement ? <Team /> : <Navigate to="/" />} />

          {/* --- NEW SETTINGS ROUTE (Available to all staff) --- */}
          <Route path="/settings" element={session && isStaff ? <Settings /> : <Navigate to="/" />} />
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  );
}

export default App;