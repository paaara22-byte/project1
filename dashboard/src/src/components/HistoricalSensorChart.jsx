import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

const SENSOR_COLORS = {
  lake_pestroye: "#0ea5e9",
  ishim_river: "#06b6d4",
  zarechny: "#22d3ee",
};

function getSensorColor(id) {
  return SENSOR_COLORS[id] ?? "#06b6d4";
}

const RANGE_MS = {
  "1h": 60 * 60 * 1000,
  "6h": 6 * 60 * 60 * 1000,
  "12h": 12 * 60 * 60 * 1000,
  "24h": 24 * 60 * 60 * 1000,
};

export function HistoricalSensorChart({ history = [], keySensors = [], timeRange, onTimeRangeChange, t }) {
  const effectiveRange = timeRange && RANGE_MS[timeRange] != null ? timeRange : "24h";
  const rangeMs = RANGE_MS[effectiveRange];

  const ranges = [
    { value: "1h", labelKey: "timeRange1h" },
    { value: "6h", labelKey: "timeRange6h" },
    { value: "12h", labelKey: "timeRange12h" },
    { value: "24h", labelKey: "timeRange24h" },
  ];

  const now = Date.now();
  const cutoff = now - rangeMs;
  const filtered = history.filter((p) => p.time >= cutoff);
  const hasData = keySensors.some((s) => filtered.some((p) => p[s.id] != null));

  return (
    <div className="sidebar-card p-3 md:p-4">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <h3 className="font-display font-semibold text-slate-800 dark:text-slate-100 text-xs uppercase tracking-widest">
          {t("historicalSensorData")}
        </h3>
        <div className="flex gap-1">
          {ranges.map((r) => (
            <button
              key={r.value}
              type="button"
              onClick={() => onTimeRangeChange?.(r.value)}
              className={`px-2 py-1 rounded-lg text-xs font-medium transition-all ${
                effectiveRange === r.value
                  ? "bg-gradient-to-r from-ops-blue to-ops-teal text-white shadow-glow-cyan"
                  : "bg-white/50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 hover:bg-ops-cyan/10 dark:hover:bg-ops-cyan/20"
              }`}
            >
              {t(r.labelKey)}
            </button>
          ))}
        </div>
      </div>
      <div className="h-36 sm:h-44 md:h-48 min-w-0">
        {!hasData ? (
          <div className="h-full flex items-center justify-center text-sm text-slate-500 dark:text-slate-400 bg-white/30 dark:bg-slate-800/30 rounded-xl border border-white/20 dark:border-white/10">
            {t("collectingSensorData")}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={filtered} margin={{ top: 4, right: 4, left: 24, bottom: 0 }}>
              <defs>
                {keySensors.map((s) => {
                  const c = getSensorColor(s.id);
                  return (
                    <linearGradient key={s.id} id={`grad-${s.id}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={c} stopOpacity={0.5} />
                      <stop offset="100%" stopColor={c} stopOpacity={0.05} />
                    </linearGradient>
                  );
                })}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(6,182,212,0.15)" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10 }}
                interval="preserveStartEnd"
                stroke="rgba(100,116,139,0.6)"
              />
              <YAxis
                domain={["auto", "auto"]}
                tick={{ fontSize: 10 }}
                label={{ value: "cm", angle: -90, position: "insideLeft", fontSize: 10 }}
                stroke="rgba(100,116,139,0.6)"
              />
              <Tooltip
                formatter={(value) => [value, "cm"]}
                labelFormatter={(_, payload) =>
                  payload?.[0]?.payload?.full
                    ? new Date(payload[0].payload.full).toLocaleString()
                    : ""
                }
                contentStyle={{
                  background: "rgba(15,23,42,0.9)",
                  border: "1px solid rgba(6,182,212,0.3)",
                  borderRadius: "12px",
                }}
              />
              <Legend
                wrapperStyle={{ fontSize: "10px" }}
                formatter={(key) => (t ? t(`sensor_${key}`) : key) || key}
              />
              <ReferenceLine y={700} stroke="#ef4444" strokeDasharray="4 2" strokeOpacity={0.8} />
              {keySensors.map((s) => (
                <Area
                  key={s.id}
                  type="monotone"
                  dataKey={s.id}
                  name={t ? t(`sensor_${s.id}`) : s.nameKz ?? s.nameRu}
                  stroke={getSensorColor(s.id)}
                  strokeWidth={2}
                  fill={`url(#grad-${s.id})`}
                  dot={false}
                  connectNulls
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
