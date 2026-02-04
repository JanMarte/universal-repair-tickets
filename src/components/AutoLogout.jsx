import React, { useEffect, useRef, useCallback } from 'react';
import { supabase } from '../supabaseClient';

// SETTINGS: 30 Minutes (Change to 1 * 60 * 1000 for testing)
const INACTIVITY_LIMIT = 30 * 60 * 1000;

export default function AutoLogout() {
  const lastActivityRef = useRef(Date.now());

  const triggerLogout = useCallback(async () => {
    console.log("Auto-logout triggered"); // Debug log

    // 1. Set the flag explicitly
    window.localStorage.setItem('session_expired', 'true');

    // 2. Kill the session
    await supabase.auth.signOut();

    // Note: We do NOT force window.location.href here. 
    // App.jsx will see the auth state change and render <Login /> automatically.
  }, []);

  const resetTimer = useCallback(() => {
    lastActivityRef.current = Date.now();
  }, []);

  useEffect(() => {
    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart'];
    events.forEach(event => document.addEventListener(event, resetTimer));

    const intervalId = setInterval(() => {
      const now = Date.now();
      if (now - lastActivityRef.current > INACTIVITY_LIMIT) {
        triggerLogout();
      }
    }, 5000); // Check every 5 seconds for better responsiveness during testing

    return () => {
      events.forEach(event => document.removeEventListener(event, resetTimer));
      clearInterval(intervalId);
    };
  }, [resetTimer, triggerLogout]);

  return null;
}