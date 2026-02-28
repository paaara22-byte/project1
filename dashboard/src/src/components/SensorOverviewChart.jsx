import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from "recharts";

const CRITICAL_THRESHOLD_CM = 700;

export function SensorOverviewChart({ waterLevels = [], t }) {
  const data = waterLevels.map((r) => {
    const level = r.level_cm ?? 0;
    const name = (t && t(`sensor_${r.sensor_id}`)) || r.name || r.sensor_id;
    let fill = "url(#barGradNormal)";
    if (level > CRITICAL_THRESHOLD_CM) fill = "url(#barGradCritical)";
    else if (level >= 650) fill = "url(#barGradWarning)";
    return { name, level, fill };
  });

  const levelLabel = t ? t("level") : "Level";

  return (
    <div className="h-32 sm:h-40 min-w-0">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 24, left: 50, bottom: 4 }}>
          <defs>
            <linearGradient id="barGradNormal" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.9} />
              <stop offset="100%" stopColor="#0ea5e9" stopOpacity={1} />
            </linearGradient>
            <linearGradient id="barGradWarning" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.9} />
              <stop offset="100%" stopColor="#fbbf24" stopOpacity={1} />
            </linearGradient>
            <linearGradient id="barGradCritical" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#ef4444" stopOpacity={0.9} />
              <stop offset="100%" stopColor="#f87171" stopOpacity={1} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(6,182,212,0.15)" horizontal={false} />
          <XAxis type="number" domain={[0, 900]} tick={{ fontSize: 10 }} stroke="rgba(100,116,139,0.5)" />
          <YAxis type="category" dataKey="name" width={48} tick={{ fontSize: 10 }} stroke="rgba(100,116,139,0.5)" />
          <Tooltip
            formatter={(value) => [value + " cm", levelLabel]}
            contentStyle={{
              background: "rgba(15,23,42,0.9)",
              border: "1px solid rgba(6,182,212,0.3)",
              borderRadius: "12px",
            }}
          />
          <ReferenceLine x={CRITICAL_THRESHOLD_CM} stroke="#ef4444" strokeDasharray="4 2" strokeOpacity={0.7} />
          <Bar dataKey="level" radius={[0, 6, 6, 0]}>
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
