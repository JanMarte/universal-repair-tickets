import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { ToastProvider } from './context/ToastProvider';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import TicketDetail from './pages/TicketDetail';
import CustomerHistory from './pages/CustomerHistory';
import MyTickets from './pages/MyTickets';

function App() {
  const [session, setSession] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

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
        <Routes>
          <Route path="/login" element={!session ? <Login /> : <Navigate to="/" />} />
          
          <Route 
              path="/" 
              element={
                !session ? <Navigate to="/login" /> : 
                role === 'employee' ? <Navigate to="/dashboard" /> : 
                <Navigate to="/my-tickets" />
              } 
          />

          <Route 
              path="/dashboard" 
              element={session && role === 'employee' ? <Dashboard /> : <Navigate to="/" />} 
          />
          
          <Route 
              path="/my-tickets" 
              element={session && role !== 'employee' ? <MyTickets /> : <Navigate to="/" />} 
          />

          <Route 
              path="/ticket/:id" 
              element={session ? <TicketDetail /> : <Navigate to="/login" />} 
          />
          
          <Route 
              path="/customer/:id" 
              element={session && role === 'employee' ? <CustomerHistory /> : <Navigate to="/" />} 
          /> 
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  );
}

export default App;