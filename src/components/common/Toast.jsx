import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { CircleAlert, CircleCheck, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

const TONES = {
  success: { Icon: CircleCheck, className: 'border-ok/40 text-ok' },
  error: { Icon: CircleAlert, className: 'border-danger/40 text-danger' },
  info: { Icon: Info, className: 'border-accent/40 text-accent' },
};

let toastId = 0;

function ToastItem({ toast, onDismiss }) {
  const { Icon, className } = TONES[toast.tone] ?? TONES.info;

  useEffect(() => {
    const timer = window.setTimeout(() => onDismiss(toast.id), 5000);
    return () => window.clearTimeout(timer);
  }, [toast.id, onDismiss]);

  return (
    <div
      role="status"
      className={`pointer-events-auto flex w-full items-start gap-3 rounded-lg border bg-panel p-3 shadow-pop ${className}`}
    >
      <Icon aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-semibold text-ink">{toast.title}</p>
        {toast.description && (
          <p className="mt-0.5 text-[12px] leading-relaxed text-muted">{toast.description}</p>
        )}
      </div>
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        aria-label="Dismiss notification"
        className="-m-1 rounded p-1 text-muted transition-colors hover:bg-raised hover:text-ink"
      >
        <X aria-hidden="true" className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const notify = useCallback((input) => {
    const payload = typeof input === 'string' ? { title: input } : input;
    const id = ++toastId;
    setToasts((current) => [...current.slice(-2), { id, tone: 'success', ...payload }]);
    return id;
  }, []);

  return (
    <ToastContext.Provider value={notify}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed bottom-4 right-4 z-[70] flex w-[min(22rem,calc(100vw-2rem))] flex-col gap-2"
      >
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used inside ToastProvider');
  return context;
}
