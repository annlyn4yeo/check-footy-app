"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import styles from "./live-event-toast.module.css";

type ToastType = "goal" | "red" | "yellow" | "sub" | "other";

type LiveToastInput = {
  type: ToastType;
  text: string;
  minute?: number | null;
};

type LiveToast = LiveToastInput & {
  id: number;
  exiting: boolean;
};

type ToastContextValue = {
  addToast: (toast: LiveToastInput) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const ICON_MAP: Record<ToastType, string> = {
  goal: "⚽",
  red: "🟥",
  yellow: "🟨",
  sub: "🔄",
  other: "•",
};

export function LiveEventToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<LiveToast[]>([]);
  const idRef = useRef(0);

  const addToast = useCallback((toast: LiveToastInput) => {
    const id = ++idRef.current;
    setToasts((prev) =>
      [{ ...toast, id, exiting: false }, ...prev].slice(0, 6),
    );

    window.setTimeout(() => {
      setToasts((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, exiting: true } : item,
        ),
      );
    }, 4000);

    window.setTimeout(() => {
      setToasts((prev) => prev.filter((item) => item.id !== id));
    }, 4200);
  }, []);

  const value = useMemo(() => ({ addToast }), [addToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className={styles.viewport}>
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`${styles.toast} ${styles[toast.type]} ${toast.exiting ? styles.out : styles.in}`}
          >
            <span className={styles.content}>
              {ICON_MAP[toast.type]} {toast.text}
              {typeof toast.minute === "number" ? ` · ${toast.minute}'` : ""}
            </span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useLiveEventToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error(
      "useLiveEventToast must be used within LiveEventToastProvider",
    );
  }
  return context;
}
