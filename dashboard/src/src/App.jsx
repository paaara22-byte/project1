import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { LangProvider, useLang } from "./contexts/LangContext";
import { ThemeToggle } from "./components/ThemeToggle";
import { LangToggle } from "./components/LangToggle";
import { PetropavlLogo } from "./components/PetropavlLogo";
import { FloodMap } from "./components/FloodMap";
import { Sidebar } from "./components/Sidebar";
import { SummaryWidget } from "./components/SummaryWidget";
import { DataStreamConsole } from "./components/DataStreamConsole";
import * as api from "./api";
import { useSimulatedStream, SIMULATION_SPEED_OPTIONS } from "./hooks/useSimulatedStream";
import { SimulationSpeedControl } from "./components/SimulationSpeedControl";
import { CriticalToastContainer } from "./components/CriticalToast";
import { AIChatWidget } from "./components/AIChatWidget";

const MAP_CENTER = [54.8767, 69.1285];
const MAP_ZOOM = 12;
const CRITICAL_THRESHOLD_CM = 700;
const CRITICAL_STEP_CM = 50; // subsequent toasts every +50 cm (750, 800, 850, ...)

function AppContent() {
  const { lang, t } = useLang();
  const [dark, setDark] = useState(() =>
    typeof document !== "undefined" ? document.documentElement.classList.contains("dark") : false
  );
  const [simulationSpeed, setSimulationSpeed] = useState(1);
  const [sensors, setSensors] = useState([]);
  const [waterLevelsApi, setWaterLevelsApi] = useState([]);
  const [floodZones, setFloodZones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeRange, setTimeRange] = useState("24h");
  const [criticalToasts, setCriticalToasts] = useState([]);
  const lastAlertedLevelRef = useRef({}); // per sensor: last level at which we showed a toast (700, 750, 800, ...)

  const {
    streamLog,
    latestReadings: simulatedLevels,
    history,
    keySensors,
    aiRecommendations: dynamicAiRecommendations,
    timeToImpact,
    risingVelocity,
  } = useSimulatedStream(waterLevelsApi, lang, simulationSpeed);

  const waterLevels = useMemo(() => {
    const byId = new Map();
    waterLevelsApi.forEach((r) => byId.set(r.sensor_id, { ...r }));
    simulatedLevels.forEach((r) => byId.set(r.sensor_id, { ...r }));
    return Array.from(byId.values());
  }, [waterLevelsApi, simulatedLevels]);

  async function load() {
    setError(null);
    try {
      const [sensorsRes, levelsRes, zonesRes] = await Promise.allSettled([
        api.getSensors(),
        api.getWaterLevels(),
        api.getFloodZones(),
      ]);

      setSensors(sensorsRes.status === "fulfilled" ? sensorsRes.value : []);
      setWaterLevelsApi(levelsRes.status === "fulfilled" ? levelsRes.value : []);
      setFloodZones(zonesRes.status === "fulfilled" ? zonesRes.value : []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, []);

  const levelsBySensor = useMemo(
    () => new Map(waterLevels.map((r) => [r.sensor_id, r])),
    [waterLevels]
  );

  // Toast: 1) first when level >= 700; 2) then only for every +50 cm (750, 800, 850, ...). No alerts below 700.
  useEffect(() => {
    waterLevels.forEach((r) => {
      const sensorId = r.sensor_id;
      const currentLevel = r.level_cm ?? 0;
      if (currentLevel < CRITICAL_THRESHOLD_CM) return;

      const lastAlerted = lastAlertedLevelRef.current[sensorId];
      const milestone = CRITICAL_THRESHOLD_CM + CRITICAL_STEP_CM * Math.floor((currentLevel - CRITICAL_THRESHOLD_CM) / CRITICAL_STEP_CM);

      const shouldAlert = lastAlerted == null || currentLevel >= lastAlerted + CRITICAL_STEP_CM;
      if (!shouldAlert) return;

      lastAlertedLevelRef.current[sensorId] = milestone;
      const sensorName = t(`sensor_${sensorId}`) ?? sensorId;
      const message = (t("toastCritical") ?? "")
        .replace(/\{\{sensorName\}\}/g, sensorName)
        .replace(/\{\{level\}\}/g, String(currentLevel));
      const id = `${sensorId}-${milestone}-${Date.now()}`;
      setCriticalToasts((prevToasts) => [...prevToasts, { id, message, sensorId }]);
    });
  }, [waterLevels, t]);

  const dismissCriticalToast = useCallback((id) => {
    setCriticalToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <>
      <div className="flex h-screen flex-col overflow-hidden">
        <CriticalToastContainer toasts={criticalToasts} onDismiss={dismissCriticalToast} />
        <header className="flex flex-wrap items-center justify-between w-full gap-2 md:gap-4 px-3 py-2 md:px-5 md:py-3 shrink-0 glass-panel rounded-none border-x-0 border-t-0">
        <div className="flex items-center gap-2 md:gap-4 flex-shrink-0">
          <PetropavlLogo />
          <p className="hidden sm:block font-display text-xs md:text-sm text-slate-600 dark:text-slate-400 uppercase tracking-widest whitespace-nowrap">
            {t("appTitle")}
          </p>
        </div>
        <div className="flex items-center gap-2 md:gap-4 flex-shrink-0">
          <SimulationSpeedControl
            value={simulationSpeed}
            onChange={setSimulationSpeed}
            options={SIMULATION_SPEED_OPTIONS}
            t={t}
          />
          <LangToggle />
          <ThemeToggle dark={dark} onToggle={() => setDark((d) => !d)} />
        </div>
      </header>

      <div className="flex flex-col md:flex-row flex-1 min-h-0">
        <aside className="w-full md:w-96 lg:w-[420px] shrink-0 flex flex-col overflow-hidden bg-gradient-to-b from-slate-100/80 to-slate-200/50 dark:from-slate-900/80 dark:to-slate-950/80 border-r border-white/20 dark:border-white/5">
          <div className="p-2 md:p-3 space-y-2 md:space-y-3 overflow-y-auto flex-1">
            <SummaryWidget
              waterLevels={waterLevels}
              loading={loading}
              error={error}
              t={t}
            />
            <DataStreamConsole lines={streamLog} maxLines={16} t={t} />
            <Sidebar
              waterLevels={waterLevels}
              aiRecommendations={dynamicAiRecommendations}
              loading={loading}
              streamLog={streamLog}
              history={history}
              keySensors={keySensors}
              timeToImpact={timeToImpact}
              risingVelocity={risingVelocity}
              timeRange={timeRange}
              onTimeRangeChange={setTimeRange}
              t={t}
            />
          </div>
        </aside>

        <main className="flex-1 min-h-0 relative min-h-[350px] md:min-h-[600px]">
          {error && (
            <div className="absolute top-2 left-2 right-2 z-[1000] px-2 py-1.5 md:px-3 md:py-2 rounded-xl bg-amber-500/20 dark:bg-amber-500/30 border border-amber-400/50 text-amber-800 dark:text-amber-200 text-xs md:text-sm backdrop-blur-sm">
              {t("apiError")}: {error}
            </div>
          )}
          <FloodMap
            center={MAP_CENTER}
            zoom={MAP_ZOOM}
            sensors={sensors}
            waterLevels={waterLevels}
            levelsBySensor={levelsBySensor}
            floodZones={floodZones}
            loading={loading}
            t={t}
          />
        </main>
      </div>
      </div>
      {/* Chatbot outside overflow-hidden so it is not clipped; rendered at end of layout */}
      <AIChatWidget t={t} />
    </>
  );
}

export default function App() {
  return (
    <LangProvider>
      <AppContent />
    </LangProvider>
  );
}
