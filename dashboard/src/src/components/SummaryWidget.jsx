const CRITICAL_THRESHOLD_CM = 700;

function WaterDropletIcon({ className = "w-8 h-8" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
    </svg>
  );
}

export function SummaryWidget({ waterLevels, loading, error, t }) {
  const criticalCount = waterLevels.filter(
    (r) => (r.level_cm ?? 0) > CRITICAL_THRESHOLD_CM
  ).length;
  const maxLevel = waterLevels.length
    ? Math.max(...waterLevels.map((r) => r.level_cm ?? 0))
    : null;
  const isCritical = maxLevel != null && maxLevel > CRITICAL_THRESHOLD_CM;
  const isWarning = maxLevel != null && maxLevel >= 650 && !isCritical;

  return (
    <div className="glass-panel p-3 md:p-4 relative">
      <div className="flex items-center gap-2 mb-3 md:mb-4">
        <div className="p-2 rounded-lg bg-gradient-to-br from-ops-cyan/20 to-ops-teal/20 text-ops-cyan dark:text-ops-cyan border border-ops-cyan/30">
          <WaterDropletIcon className="w-5 h-5 md:w-6 md:h-6" />
        </div>
        <h2 className="font-display font-semibold text-slate-800 dark:text-slate-100 text-xs md:text-sm uppercase tracking-wider">
          {t("currentStatus")}
        </h2>
      </div>
      {loading && !waterLevels.length ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">{t("loading")}</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
          <div className="rounded-xl p-3 md:p-4 bg-white/50 dark:bg-slate-800/50 border border-white/50 dark:border-white/10">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
              {t("criticalSensors")}
            </p>
            <p className="text-xl md:text-3xl font-display font-bold text-slate-800 dark:text-slate-100">
              {criticalCount}
            </p>
            {criticalCount > 0 && (
              <span className="inline-block mt-2 px-2 py-0.5 rounded-md text-xs font-bold uppercase bg-red-500/20 text-red-600 dark:text-red-400 border border-red-400/30 badge-glow-critical">
                {t("above700cm")}
              </span>
            )}
          </div>
          <div className="rounded-xl p-3 md:p-4 bg-white/50 dark:bg-slate-800/50 border border-white/50 dark:border-white/10">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
              {t("waterLevel")}
            </p>
            <p
              className={`text-2xl md:text-4xl font-display font-bold tracking-tight ${
                isCritical
                  ? "text-red-500 dark:text-red-400"
                  : isWarning
                    ? "text-amber-500 dark:text-amber-400"
                    : "text-ops-cyan dark:text-ops-cyan"
              }`}
            >
              {maxLevel != null ? maxLevel : "—"}
              <span className="text-lg font-normal text-slate-500 dark:text-slate-400 ml-0.5">cm</span>
            </p>
            <span
              className={`inline-block mt-2 px-2 py-0.5 rounded-md text-xs font-bold uppercase border ${
                isCritical
                  ? "bg-red-500/20 text-red-600 dark:text-red-400 border-red-400/30 badge-glow-critical"
                  : "bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 border-cyan-400/30 badge-glow-stable"
              }`}
            >
              {isCritical ? t("critical") : t("stable")}
            </span>
          </div>
        </div>
      )}
      {error && (
        <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">{error}</p>
      )}
    </div>
  );
}
