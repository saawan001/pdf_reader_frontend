import React, { createContext, useContext, useState, useCallback } from "react";
import { CheckIcon, AlertCircleIcon, SparklesIcon, XIcon } from "./Icons";

export type ToastType = "success" | "error" | "info";

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = "info") => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, message }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="toast-container">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast--${t.type} animate-fade-in`}>
            <div className="toast__icon">
              {t.type === "success" && <CheckIcon className="w-5 h-5 text-emerald" />}
              {t.type === "error" && <AlertCircleIcon className="w-5 h-5 text-danger" />}
              {t.type === "info" && <SparklesIcon className="w-5 h-5 text-brand" />}
            </div>
            <span className="toast__message">{t.message}</span>
            <button
              type="button"
              className="toast__close"
              onClick={() => removeToast(t.id)}
              aria-label="Close Notification"
            >
              <XIcon className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
