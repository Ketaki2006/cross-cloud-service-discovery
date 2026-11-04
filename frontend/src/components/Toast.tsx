import React, { createContext, useContext, useState, useCallback } from 'react';

interface ToastState {
  id: number;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
}

interface ToastContextType {
  showToast: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

const ToastContext = createContext<ToastContextType>({
  showToast: () => {},
});

export const useToast = () => useContext(ToastContext);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastState[]>([]);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'warning' | 'info' = 'success') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((toast) => {
          let bgClass = 'bg-inverse-surface text-inverse-on-surface';
          let icon = 'check_circle';

          if (toast.type === 'error') {
            bgClass = 'bg-error text-on-error';
            icon = 'error';
          } else if (toast.type === 'warning') {
            bgClass = 'bg-secondary-container text-on-secondary-container';
            icon = 'warning';
          } else if (toast.type === 'info') {
            bgClass = 'bg-primary-container text-on-primary-container';
            icon = 'info';
          }

          return (
            <div
              key={toast.id}
              className={`transform transition-all duration-300 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg font-label-md text-label-md pointer-events-auto ${bgClass}`}
            >
              <span className="material-symbols-outlined text-[18px]">{icon}</span>
              <span>{toast.message}</span>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

