import { SensorOverviewChart } from "./SensorOverviewChart";
import { HistoricalSensorChart } from "./HistoricalSensorChart";
import { PumpIcon, SandbagIcon } from "./RecommendationIcons";

const CRITICAL_THRESHOLD_CM = 700;

function RecommendationItem({ r, t }) {
  const isStructured = r.locationKey != null && r.adviceType != null;
  const category = isStructured ? r.adviceType.split("_")[0] : "rising";
  const isCritical = category === "critical";
  const Icon = isCritical ? SandbagIcon : PumpIcon;

  const displayText = isStructured
    ? (() => {
        const prefix = t(`advice_prefix_${category}`) ?? "";
        const location = t(`sensor_${r.locationKey}`) ?? r.locationKey;
        const advice = t(`advice_${r.adviceType}`) ?? r.adviceType;
        return prefix ? `${prefix}${location}: ${advice}` : `${location}: ${advice}`;
      })()
    : (r.text ?? "");

  return (
    <li className="flex gap-3 rounded-xl border border-white/20 dark:border-white/10 bg-white/50 dark:bg-slate-800/50 p-3 text-sm">
      <div
        className={`shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ${
          isCritical
            ? "bg-red-500/20 text-red-500 dark:text-red-400 border border-red-400/30 shadow-glow-red"
            : "bg-ops-cyan/20 text-ops-cyan border border-ops-cyan/30 shadow-glow-cyan"
        }`}
      >
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-slate-700 dark:text-slate-300">{displayText}</p>
        {r.at && (
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {new Date(r.at).toLocaleString()}
          </p>
        )}
      </div>
    </li>
  );
}

export function Sidebar({
  waterLevels,
  aiRecommendations,
  loading,
  history,
  keySensors,
  timeToImpact,
  risingVelocity,
  timeRange,
  onTimeRangeChange,
  t,
}) {
  const criticalAlerts = (waterLevels ?? []).filter(
    (r) => (r.level_cm ?? 0) > CRITICAL_THRESHOLD_CM
  );

  return (
    <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-3 md:space-y-4">
      <HistoricalSensorChart
        history={history}
        keySensors={keySensors}
        timeRange={timeRange}
        onTimeRangeChange={onTimeRangeChange}
        t={t}
      />

      <section className="sidebar-card p-3 md:p-4 relative">
        <h2 className="font-display font-semibold text-slate-800 dark:text-slate-100 text-xs uppercase tracking-widest mb-3">
          {t("aiAnalytics")}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
          <div className="rounded-xl bg-gradient-to-br from-ops-blue/10 to-ops-teal/10 dark:from-ops-blue/20 dark:to-ops-teal/20 border border-ops-cyan/20 p-3">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {t("timeToImpact")}
            </p>
            <p className="text-lg md:text-xl font-display font-bold text-ops-teal dark:text-ops-cyan">
              {timeToImpact != null ? `${timeToImpact.toFixed(1)} ${t("unitMinToImpact")}` : "—"}
            </p>
          </div>
          <div className="rounded-xl bg-gradient-to-br from-ops-blue/10 to-ops-teal/10 dark:from-ops-blue/20 dark:to-ops-teal/20 border border-ops-cyan/20 p-3">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {t("risingVelocity")}
            </p>
            <p className="text-lg md:text-xl font-display font-bold text-ops-teal dark:text-ops-cyan">
              {risingVelocity != null ? `${risingVelocity} ${t("unitCm5s")}` : "—"}
            </p>
          </div>
        </div>
        <div className="flex flex-col max-h-[400px] min-h-0 rounded-xl border border-white/20 dark:border-white/10 bg-white/30 dark:bg-slate-800/30 overflow-hidden">
          <h3 className="font-display font-medium text-slate-700 dark:text-slate-300 text-xs uppercase tracking-wider shrink-0 sticky top-0 z-10 px-3 py-2 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border-b border-white/20 dark:border-white/10">
            {t("aiRecommendations")}
          </h3>
          <div className="flex-1 overflow-y-auto scrollbar-hide min-h-0">
            {!aiRecommendations?.length ? (
              <p className="text-sm text-slate-500 dark:text-slate-400 p-3">{t("noRecommendationsYet")}</p>
            ) : (
              <ul className="space-y-2 p-3">
                {[...aiRecommendations]
                  .sort((a, b) => new Date(b.at) - new Date(a.at))
                  .slice(0, 15)
                  .map((r) => (
                    <RecommendationItem key={r.id} r={r} t={t} />
                  ))}
              </ul>
            )}
          </div>
        </div>
        {criticalAlerts.length > 0 && (
          <>
            <h3 className="font-display font-medium text-slate-700 dark:text-slate-300 text-xs uppercase tracking-wider mt-3 mb-2">
              {t("activeFloodAlerts")}
            </h3>
            <div className="overflow-x-auto min-w-0">
            <ul className="space-y-2">
              {criticalAlerts.map((a) => (
                <li
                  key={a.sensor_id}
                  className="flex items-start gap-2 rounded-xl border-2 border-red-400/50 bg-red-500/10 dark:bg-red-500/20 p-3 text-sm"
                >
                  <span className="text-xs font-bold text-red-600 dark:text-red-400 uppercase tracking-wide shrink-0 badge-glow-critical px-2 py-0.5 rounded">
                    {t("critical")}
                  </span>
                  <span className="text-red-700 dark:text-red-300 font-medium shrink-0">
                    {t(`sensor_${a.sensor_id}`) || a.name || a.sensor_id}
                  </span>
                  <span className="text-slate-600 dark:text-slate-400">
                    {a.level_cm} cm
                    {a.velocity != null && ` (${a.velocity} cm/interval)`}
                  </span>
                </li>
              ))}
            </ul>
            </div>
          </>
        )}
      </section>

      <section className="sidebar-card p-3 md:p-4 relative">
        <h2 className="font-display font-semibold text-slate-800 dark:text-slate-100 text-xs uppercase tracking-widest mb-3">
          {t("sensorOverview")}
        </h2>
        <div className="min-w-0 overflow-x-auto">
        {waterLevels?.length ? (
          <SensorOverviewChart waterLevels={waterLevels} t={t} />
        ) : (
          <p className="text-sm text-slate-500 dark:text-slate-400">{t("noSensorData")}</p>
        )}
        </div>
      </section>
    </div>
  );
}
