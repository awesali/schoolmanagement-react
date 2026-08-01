import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import './Toast.css';

export type ToastType = 'success' | 'error' | 'warning' | 'info';
type ToastItem = { id: number; message: string; type: ToastType };

interface ToastContextValue {
  showToast: (message: string, type?: ToastType, duration?: number) => void;
  success: (message: string, duration?: number) => void;
  error: (message: string, duration?: number) => void;
  warning: (message: string, duration?: number) => void;
  info: (message: string, duration?: number) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);
let nextToastId = 0;
const icons: Record<ToastType, string> = { success: '✓', error: '!', warning: '!', info: 'i' };

export const ToastProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const removeToast = useCallback((id: number) => {
    setToasts(current => current.filter(toast => toast.id !== id));
  }, []);
  const showToast = useCallback((message: string, type: ToastType = 'info', duration = 3500) => {
    const id = ++nextToastId;
    setToasts(current => [...current, { id, message, type }]);
    window.setTimeout(() => removeToast(id), duration);
  }, [removeToast]);

  const value = useMemo<ToastContextValue>(() => ({
    showToast,
    success: (message, duration) => showToast(message, 'success', duration),
    error: (message, duration) => showToast(message, 'error', duration),
    warning: (message, duration) => showToast(message, 'warning', duration),
    info: (message, duration) => showToast(message, 'info', duration),
  }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-container" aria-live="polite">
        {toasts.map(toast => (
          <div className={`custom-toast custom-toast--${toast.type}`} role="status" key={toast.id}>
            <span className="custom-toast__icon">{icons[toast.type]}</span>
            <span className="custom-toast__message">{toast.message}</span>
            <button className="custom-toast__close" type="button" onClick={() => removeToast(toast.id)}>×</button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used inside ToastProvider');
  return context;
};

const inferType = (message: string): ToastType => {
  const text = message.toLowerCase();
  if (/success|saved|created|completed|updated|deleted|assigned|generated|locked/.test(text)) return 'success';
  if (/please|select|required|must|already|not found/.test(text)) return 'warning';
  if (/fail|error|unable|invalid|denied|expired/.test(text)) return 'error';
  return 'info';
};

export const useToastMessageState = (type?: ToastType) => {
  const toast = useToast();
  type Message = string | null;
  const setMessage = useCallback((message: React.SetStateAction<Message>) => {
    const value = typeof message === 'function' ? message(null) : message;
    if (value) toast.showToast(value, type || inferType(value));
  }, [toast, type]);
  return useMemo(() => [null, setMessage] as const, [setMessage]);
};

export const useToastResultState = () => {
  const toast = useToast();
  type Result = { text: string; ok: boolean } | null;
  const setResult = useCallback((result: React.SetStateAction<Result>) => {
    const value = typeof result === 'function' ? result(null) : result;
    if (value?.text) toast.showToast(value.text, value.ok ? 'success' : inferType(value.text));
  }, [toast]);
  return useMemo(() => [null, setResult] as const, [setResult]);
};
