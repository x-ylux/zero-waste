"use client";

import { useDemo } from "@/components/providers/DemoProvider";

export function ToastStack() {
  const { toasts, dismissToast } = useDemo();
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-[min(100%-2rem,24rem)] flex-col gap-2">
      {toasts.map((toast) => (
        <button
          key={toast.id}
          type="button"
          onClick={() => dismissToast(toast.id)}
          className={`pointer-events-auto rounded-xl border px-4 py-3 text-left text-sm shadow-lg ${
            toast.kind === "error"
              ? "border-rose-200 bg-rose-50 text-rose-950"
              : toast.kind === "info"
                ? "border-sky-200 bg-sky-50 text-sky-950"
                : "border-brand-200 bg-white text-warmgray-900"
          }`}
        >
          {toast.text}
        </button>
      ))}
    </div>
  );
}
