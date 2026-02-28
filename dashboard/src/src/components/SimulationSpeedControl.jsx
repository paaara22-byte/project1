/**
 * Simulation Time-Warp (Demo Mode): 1x, 10x, 50x speed multiplier.
 * Respects bilingual (KZ/RU) and light/dark mode.
 */
export function SimulationSpeedControl({ value, onChange, options = [1, 10, 50], t }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400 hidden sm:inline">
        {t("simulationSpeed")}:
      </span>
      <div className="flex rounded-xl overflow-hidden border border-white/20 dark:border-white/10 bg-slate-200/50 dark:bg-slate-800/50 backdrop-blur-sm p-0.5">
        {options.map((speed) => (
          <button
            key={speed}
            type="button"
            onClick={() => onChange(speed)}
            className={`min-w-[2.5rem] px-2 py-1.5 text-xs font-semibold transition-colors ${
              value === speed
                ? "bg-ops-cyan/30 dark:bg-ops-cyan/40 text-ops-teal dark:text-ops-cyan border border-ops-cyan/50 shadow-glow-cyan"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-300/50 dark:hover:bg-slate-700/50"
            }`}
            aria-label={t(`speed${speed}x`)}
            title={t("simulationSpeedDemo")}
          >
            {speed}x
          </button>
        ))}
      </div>
    </div>
  );
}
