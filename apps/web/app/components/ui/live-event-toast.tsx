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
  goal: "GOAL",
  red: "RED",
  yellow: "YEL",
  sub: "SUB",
  other: "EVT",
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
      <div className="pointer-events-none fixed bottom-5 right-5 z-[9999] flex w-[min(280px,calc(100vw-32px))] flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`rounded-full border-l-4 bg-[var(--bg)] px-3 py-2 text-[15px] font-semibold uppercase shadow-[0_10px_28px_rgba(0,0,0,0.45)] transition-all duration-200 [font-family:var(--font-body)] ${
              toast.exiting
                ? "translate-x-[120%] opacity-0"
                : "translate-x-0 opacity-100"
            } ${
              toast.type === "goal"
                ? "border-l-[var(--lime)] text-[var(--white)]"
                : toast.type === "red"
                  ? "border-l-[var(--red)] text-[var(--white)]"
                  : toast.type === "yellow"
                    ? "border-l-[var(--yellow)] text-[var(--white)]"
                    : "border-l-[var(--muted)] text-[var(--white)]"
            }`}
          >
            <span className="inline-block max-w-full overflow-hidden text-ellipsis whitespace-nowrap">
              {ICON_MAP[toast.type]} {toast.text}
              {typeof toast.minute === "number" ? ` - ${toast.minute}'` : ""}
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
