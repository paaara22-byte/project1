import { useEffect } from "react";

const AUTO_DISMISS_MS = 6000;

/**
 * Single critical-level toast: top-right, red/crimson, warning icon, pulse.
 * Bilingual message is passed in; dismiss on click or after AUTO_DISMISS_MS.
 */
export function CriticalToast({ id, message, onDismiss }) {
  useEffect(() => {
    const t = setTimeout(() => onDismiss(id), AUTO_DISMISS_MS);
    return () => clearTimeout(t);
  }, [id, onDismiss]);

  return (
    <div
      role="alert"
      className="critical-toast critical-toast-enter flex items-start gap-2 md:gap-3 p-3 md:p-4 rounded-xl border-2 border-red-500/90 bg-red-950/95 dark:bg-red-950/98 backdrop-blur-sm shadow-lg shadow-red-500/20 min-w-[260px] w-full max-w-[90vw] sm:max-w-[360px]"
      onClick={() => onDismiss(id)}
    >
      <div className="shrink-0 w-10 h-10 rounded-lg flex items-center justify-center bg-red-500/30 border border-red-400/50 text-red-400">
        <svg
          className="w-6 h-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          <path d="M12 14a1 1 0 0 1 1-1h.01a1 1 0 0 1 1 1v.01a1 1 0 0 1-1 1h-.01a1 1 0 0 1-1-1V14z" />
        </svg>
      </div>
      <div className="flex-1 min-w-0 pt-0.5">
        <p className="text-sm font-semibold text-red-100 leading-snug">
          {message}
        </p>
      </div>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onDismiss(id);
        }}
        className="shrink-0 p-1 rounded-lg text-red-300 hover:text-white hover:bg-red-500/30 transition-colors"
        aria-label="Dismiss"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

/** Container: fixed top-right, stacks toasts with gap. */
export function CriticalToastContainer({ toasts, onDismiss }) {
  if (!toasts?.length) return null;
  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-3 pointer-events-none">
      <div className="pointer-events-auto flex flex-col gap-3">
        {toasts.map((toast) => (
          <CriticalToast
            key={toast.id}
            id={toast.id}
            message={toast.message}
            onDismiss={onDismiss}
          />
        ))}
      </div>
    </div>
  );
}
