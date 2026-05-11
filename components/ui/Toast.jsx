'use client';
// components/ui/Toast.jsx — sistema de notificaciones
import { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

const ICONS = {
  success: <CheckCircle className="w-5 h-5 text-green-400" />,
  error:   <XCircle className="w-5 h-5 text-red-400" />,
  warning: <AlertTriangle className="w-5 h-5 text-amber-400" />,
  info:    <Info className="w-5 h-5 text-blue-400" />,
};

const BG = {
  success: 'border-green-500/30 bg-green-950/80',
  error:   'border-red-500/30 bg-red-950/80',
  warning: 'border-amber-500/30 bg-amber-950/80',
  info:    'border-blue-500/30 bg-blue-950/80',
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const toast = useCallback((message, type = 'info', duration = 4000) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, []);

  const remove = (id) => setToasts((prev) => prev.filter((t) => t.id !== id));

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`flex items-start gap-3 p-4 rounded-xl border backdrop-blur-xl shadow-2xl pointer-events-auto
              animate-slide-in ${BG[t.type]}`}
          >
            <div className="flex-shrink-0 mt-0.5">{ICONS[t.type]}</div>
            <p className="text-sm text-gray-100 flex-1">{t.message}</p>
            <button onClick={() => remove(t.id)} className="text-gray-400 hover:text-white transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    if (typeof window === 'undefined') {
      return () => {};
    }
    throw new Error('useToast must be used within ToastProvider');
  }
  return ctx.toast;
}
