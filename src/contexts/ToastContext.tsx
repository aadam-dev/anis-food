"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { motion, AnimatePresence } from "framer-motion";

export interface ToastAction {
  label: string;
  href?: string;
  onClick?: () => void;
}

export interface ToastOptions {
  message: string;
  action?: ToastAction;
  duration?: number;
}

interface ToastContextValue {
  toast: (options: ToastOptions) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [action, setAction] = useState<ToastAction | undefined>();

  const toast = useCallback(
    ({ message: msg, action: act, duration = 5000 }: ToastOptions) => {
      setMessage(msg);
      setAction(act);
      setOpen(true);
      const t = setTimeout(() => setOpen(false), duration);
      return () => clearTimeout(t);
    },
    []
  );

  const close = useCallback(() => setOpen(false), []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <AnimatePresence>
        {open && (
          <motion.div
            role="alert"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ type: "tween", duration: 0.25 }}
            className="fixed bottom-4 left-4 right-4 z-[100] mx-auto max-w-md rounded-xl bg-neutral-black text-white shadow-xl px-4 py-3 flex items-center justify-between gap-3"
          >
            <span className="text-sm font-medium flex-1">{message}</span>
            {action &&
              (action.href ? (
                <a
                  href={action.href}
                  className="shrink-0 text-sm font-semibold text-accent-orange hover:underline"
                  onClick={close}
                >
                  {action.label}
                </a>
              ) : (
                <button
                  type="button"
                  className="shrink-0 text-sm font-semibold text-accent-orange hover:underline"
                  onClick={() => {
                    action.onClick?.();
                    close();
                  }}
                >
                  {action.label}
                </button>
              ))}
            <button
              type="button"
              aria-label="Dismiss"
              className="shrink-0 p-1 rounded hover:bg-white/10 transition-colors"
              onClick={close}
            >
              <span className="sr-only">Dismiss</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return ctx;
}
