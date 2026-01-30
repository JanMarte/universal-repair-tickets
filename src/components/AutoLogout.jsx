import { useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { useToast } from '../context/ToastProvider';
import { useNavigate } from 'react-router-dom';

// Default to 15 minutes (in milliseconds)
const TIMEOUT_MS = 15 * 60 * 1000; 

export default function AutoLogout() {
  const { addToast } = useToast();
  const navigate = useNavigate();
  const timerRef = useRef(null);

  useEffect(() => {
    // 1. The function that runs when the timer hits zero
    const handleLogout = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      // Only logout if someone is actually logged in
      if (session) {
        await supabase.auth.signOut();
        addToast("Logged out due to inactivity", "info");
        navigate('/login');
      }
    };

    // 2. The function that resets the timer whenever the user moves
    const resetTimer = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(handleLogout, TIMEOUT_MS);
    };

    // 3. Listen for any user activity
    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart'];
    
    events.forEach(event => {
      window.addEventListener(event, resetTimer);
    });

    // Start the timer initially
    resetTimer();

    // Cleanup: Remove listeners when the app closes
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      events.forEach(event => {
        window.removeEventListener(event, resetTimer);
      });
    };
  }, [navigate, addToast]);

  return null; // This component renders nothing visible
}