import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";

export interface ToastMessage {
  id: number;
  title: string;
  description?: string;
  variant: "success" | "error" | "info";
}

type ToastInput = Omit<ToastMessage, "id">;
type Listener = (toasts: ToastMessage[]) => void;

let toasts: ToastMessage[] = [];
let nextId = 1;
const listeners = new Set<Listener>();
const timers = new Map<number, number>();

function emit() {
  listeners.forEach((listener) => listener([...toasts]));
}

export function dismissToast(id: number) {
  const timer = timers.get(id);
  if (timer) window.clearTimeout(timer);
  timers.delete(id);
  toasts = toasts.filter((toast) => toast.id !== id);
  emit();
}

export function toast(input: ToastInput) {
  const id = nextId++;
  toasts = [...toasts, { ...input, id }].slice(-4);
  emit();
  if (input.variant !== "error") {
    timers.set(id, window.setTimeout(() => dismissToast(id), 5000));
  }
  return id;
}

export function Toaster() {
  const [current, setCurrent] = useState<ToastMessage[]>([]);

  useEffect(() => {
    listeners.add(setCurrent);
    setCurrent([...toasts]);
    return () => { listeners.delete(setCurrent); };
  }, []);

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2" aria-live="polite" aria-atomic="false">
      {current.map((item) => {
        const Icon = item.variant === "success" ? CheckCircle2 : item.variant === "error" ? AlertCircle : Info;
        return (
          <div key={item.id} role={item.variant === "error" ? "alert" : "status"} className="pointer-events-auto flex items-start gap-3 rounded border bg-white p-4 text-[#102a43] shadow-[0_12px_32px_rgb(16_42_67/0.10)]" style={{ borderColor: item.variant === "error" ? "#a12c2c" : "#cbdce5" }}>
            <Icon aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0" style={{ color: item.variant === "error" ? "#a12c2c" : item.variant === "success" ? "#087f8c" : "#2563a8" }} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">{item.title}</p>
              {item.description && <p className="mt-1 text-sm text-[#486581]">{item.description}</p>}
            </div>
            <button type="button" onClick={() => dismissToast(item.id)} className="-mr-2 -mt-2 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded hover:bg-[#e5f5f1]" aria-label={`Dismiss ${item.title}`}>
              <X aria-hidden="true" className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
