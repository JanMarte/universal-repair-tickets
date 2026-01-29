import React, { createContext, useContext, useState } from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

const ToastContext = createContext();

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = (message, type = 'info') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    
    // Auto remove after 3 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      
      {/* Toast Container - Fixed to top right */}
      <div className="toast toast-top toast-end z-[9999] p-4 gap-3">
        {toasts.map((toast) => (
          <div 
            key={toast.id} 
            className={`alert shadow-xl text-white min-w-[300px] flex justify-between animate-pop border-none
              ${toast.type === 'success' ? 'bg-emerald-500' : ''}
              ${toast.type === 'error' ? 'bg-red-500' : ''}
              ${toast.type === 'info' ? 'bg-blue-500' : ''}
            `}
          >
            <div className="flex items-center gap-3">
                {toast.type === 'success' && <CheckCircle size={20} className="text-white"/>}
                {toast.type === 'error' && <AlertCircle size={20} className="text-white"/>}
                {toast.type === 'info' && <Info size={20} className="text-white"/>}
                <span className="font-bold text-sm tracking-wide">{toast.message}</span>
            </div>
            <button 
                onClick={() => removeToast(toast.id)} 
                className="btn btn-ghost btn-xs btn-circle text-white/80 hover:bg-white/20 hover:text-white"
            >
                <X size={16}/>
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}