import { useRef, useEffect } from "react";

export function DataStreamConsole({ lines = [], maxLines = 20, t }) {
  const display = lines.slice(0, maxLines);
  const scrollRef = useRef(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el && display.length > 0) el.scrollTop = el.scrollHeight;
  }, [display.length, display]);

  return (
    <div className="glass-panel p-2 md:p-3 relative overflow-hidden">
      <div className="absolute inset-0 bg-slate-900/90 dark:bg-slate-950/95 backdrop-blur-sm rounded-xl" />
      <div className="relative min-w-0">
        <h3 className="font-display font-semibold text-ops-cyan dark:text-ops-cyan text-xs uppercase tracking-widest mb-2 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-ops-cyan animate-pulse" />
          {t("iotDataStream")}
        </h3>
        <div className="relative rounded-lg border border-cyan-500/20 bg-slate-950/80 font-mono text-xs overflow-hidden h-24 sm:h-32 min-w-0">
          <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_0%,rgba(6,182,212,0.03)_50%,transparent_100%)]" />
          <div
            ref={scrollRef}
            className="p-2 overflow-y-auto overflow-x-hidden h-full space-y-0.5 scroll-smooth scrollbar-hide"
          >
            {display.length === 0 ? (
              <p className="text-slate-500 dark:text-slate-500">{t("waitingForData")}</p>
            ) : (
              display.map((line, i) => (
                <div
                  key={`${i}-${line}`}
                  className="stream-line text-emerald-400/90 dark:text-cyan-400/90 whitespace-pre truncate"
                >
                  {line}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
