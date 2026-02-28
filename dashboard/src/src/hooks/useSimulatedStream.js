import { useState, useEffect, useCallback, useRef } from "react";

const INTERVAL_MS = 5000;
const HISTORY_MS = 24 * 60 * 60 * 1000;
const FLOOD_THRESHOLD_CM = 800;
/** Strict threshold: level > 700 cm triggers CRITICAL state and AI recommendation */
export const CRITICAL_THRESHOLD_CM = 700;

/** Sensors on water bodies in Petropavl (exact coordinates) */
const KEY_SENSORS = [
  {
    id: "lake_pestroye",
    nameKz: "Пестрое көлі",
    nameRu: "Озеро Пестрое",
    lat: 54.8365,
    lng: 69.1285,
  },
  {
    id: "ishim_river",
    nameKz: "Есіл өзені",
    nameRu: "Река Ишим",
    lat: 54.885,
    lng: 69.112,
  },
  {
    id: "zarechny",
    nameKz: "Заречный",
    nameRu: "Заречный",
    lat: 54.9085,
    lng: 69.145,
  },
];

/** Advice type keys for translation (advice_rising_0, advice_critical_2, etc.) */
const ADVICE_INDICES = { rising: 4, warning: 4, critical: 4 };

/**
 * Generate a chat reply using the same logic as AI recommendations: current levels + one
 * advice line based on thresholds (critical > 700 cm, warning >= 650 cm). Uses t() for i18n.
 * @param {string} userMessage - User input (used for context; reply is level-based).
 * @param {Array<{ sensor_id: string, name?: string, nameKz?: string, nameRu?: string, level_cm?: number }>} waterLevels
 * @param {(key: string) => string} t - Translation function
 * @returns {string}
 */
export function generateAIChatReply(userMessage, waterLevels, t) {
  const levels = Array.isArray(waterLevels) ? waterLevels : [];
  const lines = levels.map((r) => {
    const name = r.name || r.nameKz || r.nameRu || r.sensor_id;
    const level = r.level_cm ?? 0;
    return `${name}: ${level} cm`;
  });
  const summary = lines.length > 0 ? lines.join("; ") : "";
  const maxLevel = levels.length
    ? Math.max(...levels.map((r) => r.level_cm ?? 0))
    : 0;
  let adviceKey = "chatMockResponse";
  if (maxLevel > CRITICAL_THRESHOLD_CM) adviceKey = "advice_critical_0";
  else if (maxLevel >= 650) adviceKey = "advice_warning_0";
  else if (maxLevel > 0) adviceKey = "advice_rising_0";
  const advice = t(adviceKey);
  if (!summary) return advice;
  return `${summary}. ${advice}`;
}

function generateAiRecommendation(reading, prevLevel) {
  const level = reading.level_cm ?? 0;
  const velocity = reading.velocity ?? 0;
  const rising = prevLevel != null && level > prevLevel;

  if (level > CRITICAL_THRESHOLD_CM) {
    const crossed = prevLevel == null || prevLevel <= CRITICAL_THRESHOLD_CM;
    if (crossed) {
      const i = Math.floor(Math.random() * ADVICE_INDICES.critical);
      return { locationKey: reading.sensor_id, adviceType: `critical_${i}` };
    }
    return null;
  }
  if (level >= 650) {
    const i = Math.floor(Math.random() * ADVICE_INDICES.warning);
    return { locationKey: reading.sensor_id, adviceType: `warning_${i}` };
  }
  if (rising && velocity > 0) {
    const i = Math.floor(Math.random() * ADVICE_INDICES.rising);
    return { locationKey: reading.sensor_id, adviceType: `rising_${i}` };
  }
  return null;
}

const PEAK_CM = 900;
const RELIEF_FLOOR_CM = 820;
const RELIEF_CEIL_CM = 850;
const HIGH_BAND_FLOOR_CM = 800;
const FLUCTUATION_RANGE_CM = 15; // ±15 cm per tick in high band

/**
 * Mock water level generation:
 * - Below 800 cm: gradual rise (trend + noise) toward 900.
 * - At 900 cm: sudden relief drop to 820–850 cm (pump/redistribution).
 * - In 800–900 cm: random fluctuation ±15 cm per tick, clamped to [800, 900].
 */
function generateReading(sensor, baseLevelBySensor, now) {
  const prevLevel = baseLevelBySensor.get(sensor.id) ?? 620 + Math.random() * 80;
  let newLevel;

  if (prevLevel >= PEAK_CM) {
    // Relief drop when peak is reached
    newLevel = Math.round(RELIEF_FLOOR_CM + Math.random() * (RELIEF_CEIL_CM - RELIEF_FLOOR_CM + 1));
  } else if (prevLevel >= HIGH_BAND_FLOOR_CM) {
    // Fluctuate within 800–900 band: ±15 cm per tick
    const delta = (Math.random() * (2 * FLUCTUATION_RANGE_CM + 1)) - FLUCTUATION_RANGE_CM;
    newLevel = Math.round(
      Math.max(HIGH_BAND_FLOOR_CM, Math.min(PEAK_CM, prevLevel + delta))
    );
  } else {
    // Below 800: gradual rise toward 900
    const trend = 1 + Math.random() * 0.015;
    const noise = (Math.random() - 0.5) * 12;
    newLevel = Math.round(Math.min(PEAK_CM, prevLevel * trend + noise));
  }

  baseLevelBySensor.set(sensor.id, newLevel);
  const velocity = newLevel - prevLevel;
  const forecast_min =
    velocity > 0 && newLevel < FLOOD_THRESHOLD_CM
      ? ((FLOOD_THRESHOLD_CM - newLevel) / velocity) * (INTERVAL_MS / 60000)
      : null;
  return {
    sensor_id: sensor.id,
    nameKz: sensor.nameKz,
    nameRu: sensor.nameRu,
    lat: sensor.lat,
    lng: sensor.lng,
    level_cm: newLevel,
    velocity,
    forecast_time_minutes: forecast_min != null ? Math.round(forecast_min * 10) / 10 : null,
    created_at: now.toISOString(),
    ts: now.getTime(),
  };
}

/** Simulation speed multiplier: interval = INTERVAL_MS / speed (e.g. 50x => 100ms). */
export const SIMULATION_SPEED_OPTIONS = [1, 10, 50];

export function useSimulatedStream(apiWaterLevels = [], lang = "kz", speedMultiplier = 1) {
  const [streamLog, setStreamLog] = useState([]);
  const [latestReadings, setLatestReadings] = useState({});
  const [history, setHistory] = useState([]);
  /** AI recommendations: strictly empty initially; only from ticks after the first (no dummy/seed items). */
  const [aiRecommendations, setAiRecommendations] = useState([]);
  const baseLevelBySensor = useRef(new Map());
  const prevReadingsBySensor = useRef({});
  const hasTickedOnce = useRef(false);
  const maxLogLines = 24;
  const maxAiRecommendations = 15;
  const intervalMs = Math.max(50, Math.floor(INTERVAL_MS / Math.max(1, speedMultiplier)));

  const tick = useCallback(() => {
    const now = new Date();
    const readings = KEY_SENSORS.map((s) => generateReading(s, baseLevelBySensor.current, now));

    const prevReadings = prevReadingsBySensor.current;
    const newAdvices = [];
    const isFirstTick = !hasTickedOnce.current;
    if (isFirstTick) hasTickedOnce.current = true;

    readings.forEach((r) => {
      const prevLevel = prevReadings[r.sensor_id]?.level_cm;
      const advice = generateAiRecommendation(
        { ...r, sensor_id: r.sensor_id },
        prevLevel
      );
      if (advice && !isFirstTick) {
        newAdvices.push({
          id: `${r.sensor_id}-${now.getTime()}-${newAdvices.length}`,
          locationKey: advice.locationKey,
          adviceType: advice.adviceType,
          at: now.toISOString(),
        });
      }
      prevReadings[r.sensor_id] = r;
    });

    if (newAdvices.length > 0) {
      setAiRecommendations((prev) => {
        const merged = [...newAdvices, ...prev];
        const byNewestFirst = merged.sort((a, b) => new Date(b.at) - new Date(a.at));
        return byNewestFirst.slice(0, maxAiRecommendations);
      });
    }

    setLatestReadings((prev) => {
      const next = { ...prev };
      readings.forEach((r) => {
        next[r.sensor_id] = { ...r, name: lang === "kz" ? r.nameKz : r.nameRu };
      });
      return next;
    });

    setHistory((prev) => {
      const cut = now.getTime() - HISTORY_MS;
      const point = { time: now.getTime() };
      readings.forEach((r) => {
        point[r.sensor_id] = r.level_cm;
      });
      const merged = [...prev, point].filter((p) => p.time >= cut).sort((a, b) => a.time - b.time);
      return merged;
    });

    const nameByLang = (r) => (lang === "kz" ? r.nameKz : r.nameRu);
    setStreamLog((prev) => {
      const lines = readings.map(
        (r) =>
          `[${now.toLocaleTimeString()}] ${nameByLang(r)} | ${r.level_cm} cm | vel: ${r.velocity} cm/5s | ETA: ${r.forecast_time_minutes != null ? r.forecast_time_minutes + " min" : "—"}`
      );
      return [...lines.reverse(), ...prev].slice(0, maxLogLines);
    });
  }, [lang]);

  useEffect(() => {
    tick();
    const id = setInterval(tick, intervalMs);
    return () => clearInterval(id);
  }, [tick, intervalMs]);

  const mergedLevels = Object.values(latestReadings);
  const timeToImpact =
    mergedLevels.length > 0
      ? Math.min(
          ...mergedLevels
            .filter((r) => r.forecast_time_minutes != null && r.forecast_time_minutes > 0)
            .map((r) => r.forecast_time_minutes),
          Infinity
        )
      : null;
  const risingVelocity =
    mergedLevels.length > 0
      ? Math.max(...mergedLevels.map((r) => r.velocity ?? 0), 0)
      : null;

  const historyForChart = history.map((p) => {
    const t = new Date(p.time);
    const out = {
      time: p.time,
      label: t.toLocaleTimeString("ru", { hour: "2-digit", minute: "2-digit" }),
      full: t.toISOString(),
    };
    KEY_SENSORS.forEach((s) => {
      if (p[s.id] != null) out[s.id] = p[s.id];
    });
    return out;
  });

  return {
    streamLog,
    latestReadings: mergedLevels,
    latestBySensor: latestReadings,
    history: historyForChart,
    keySensors: KEY_SENSORS,
    aiRecommendations,
    timeToImpact: timeToImpact === Infinity ? null : timeToImpact,
    risingVelocity,
    tick,
  };
}
