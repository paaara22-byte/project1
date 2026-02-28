import { useMemo, Fragment } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Circle,
  Polyline,
} from "react-leaflet";
import L from "leaflet";

/**
 * High-tech ops center map: rich tiles, dynamic flood overlay with gradient + neon glow,
 * sensors on water bodies. Contour effect via CSS overlay.
 */

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

const CRITICAL_THRESHOLD_CM = 700;
const MAP_CENTER = [54.8767, 69.1285];
const MAP_ZOOM = 12;

const SENSOR_POSITIONS = {
  lake_pestroye: [54.8365, 69.1285],
  ishim_river: [54.885, 69.112],
  zarechny: [54.9085, 69.145],
};

/** Safe zones (higher ground) for evacuation routing. */
export const SAFE_ZONES = [
  { id: "city_center", position: [54.875, 69.135], nameKey: "safeZoneCityCenter" },
  { id: "northern_shelter", position: [54.915, 69.13], nameKey: "safeZoneNorthernShelter" },
];

/** Humanitarian Aid Points in safe areas of Petropavl. */
const HUMANITARIAN_AID_POINTS = [
  { id: "aid_city_center", position: [54.872, 69.144] },   // Point 1: Абай даңғылы / пр. Абая, 12
  { id: "aid_eastern", position: [54.89, 69.16] },        // Point 2: Мүсірепов / ул. Мусрепова, 30
  { id: "aid_3", position: [54.878, 69.138] },            // Point 3: Конституции Казахстана, 38
  { id: "aid_4", position: [54.882, 69.142] },            // Point 4: Горького, 70
];

function haversineDistance([lat1, lng1], [lat2, lng2]) {
  const R = 6371e3;
  const rad = (x) => (x * Math.PI) / 180;
  const dLat = rad(lat2 - lat1);
  const dLng = rad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getNearestSafeZone(fromLatLng) {
  let nearest = SAFE_ZONES[0];
  let minDist = haversineDistance(fromLatLng, nearest.position);
  for (let i = 1; i < SAFE_ZONES.length; i++) {
    const d = haversineDistance(fromLatLng, SAFE_ZONES[i].position);
    if (d < minDist) {
      minDist = d;
      nearest = SAFE_ZONES[i];
    }
  }
  return nearest;
}

/** Standard bright tile layer; map appearance does not change with app theme. */
const TILE_VOYAGER = "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";

function levelToColor(level_cm) {
  if (level_cm == null) return "#22d3ee";
  if (level_cm > CRITICAL_THRESHOLD_CM) return "#ef4444";
  if (level_cm >= 650) return "#fbbf24";
  return "#67e8f9";
}

function levelToRadius(level_cm) {
  if (level_cm == null) return 200;
  const base = 150;
  const extra = Math.min((level_cm - 600) * 2, 400);
  return base + extra;
}

/** Semi-transparent blue gradient: deeper = more saturated; outer ring = soft neon glow */
const FLOOD_RINGS = [
  { r: 0.2, color: "#0c4a6e", opacity: 0.65 },
  { r: 0.4, color: "#0369a1", opacity: 0.5 },
  { r: 0.6, color: "#0ea5e9", opacity: 0.35 },
  { r: 0.85, color: "#22d3ee", opacity: 0.25 },
  { r: 1, color: "#67e8f9", opacity: 0.15 },
];

const GLOW_RING = { r: 1.12, color: "#67e8f9", opacity: 0.2 };

function getMarkerPosition(sensorId, fallbackLat, fallbackLng) {
  const fixed = SENSOR_POSITIONS[sensorId];
  if (fixed) return fixed;
  if (fallbackLat != null && fallbackLng != null) return [fallbackLat, fallbackLng];
  return null;
}

function MapTiles() {
  return (
    <TileLayer
      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; CARTO'
      url={TILE_VOYAGER}
    />
  );
}

/** Green shield icon for Safe Zone markers (single instance to avoid re-creating). */
const SAFE_ZONE_ICON = L.divIcon({
  className: "safe-zone-marker",
  html: `
    <div style="
      width: 32px; height: 32px;
      display: flex; align-items: center; justify-content: center;
      background: rgba(34, 197, 94, 0.9);
      border: 2px solid #16a34a;
      border-radius: 50%;
      box-shadow: 0 0 12px rgba(34, 197, 94, 0.6);
    ">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      </svg>
    </div>
  `,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

/** Humanitarian Aid Point icon: red cross on bright orange/amber (distinct from blue sensors and green safe zones). */
const HUMANITARIAN_AID_ICON = L.divIcon({
  className: "humanitarian-aid-marker",
  html: `
    <div style="
      width: 34px; height: 34px;
      display: flex; align-items: center; justify-content: center;
      background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
      border: 2px solid #c2410c;
      border-radius: 50%;
      box-shadow: 0 0 14px rgba(249, 115, 22, 0.7), 0 2px 6px rgba(0,0,0,0.2);
    ">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <line x1="12" y1="5" x2="12" y2="19"/>
        <line x1="5" y1="12" x2="19" y2="12"/>
      </svg>
    </div>
  `,
  iconSize: [34, 34],
  iconAnchor: [17, 17],
});

export function FloodMap({
  center,
  zoom,
  sensors,
  waterLevels,
  levelsBySensor,
  floodZones,
  loading,
  t,
}) {
  const markers = useMemo(() => {
    if (waterLevels?.length) {
      return waterLevels
        .map((w) => {
          const position = getMarkerPosition(w.sensor_id, w.lat, w.lng);
          if (!position) return null;
          return {
            id: w.sensor_id,
            name: w.name || w.sensor_id,
            position,
            level_cm: w.level_cm,
            velocity: w.velocity,
            forecast_time_minutes: w.forecast_time_minutes,
          };
        })
        .filter(Boolean);
    }
    return Object.entries(SENSOR_POSITIONS).map(([id, position]) => ({
      id,
      name: id,
      position,
      level_cm: levelsBySensor.get(id)?.level_cm,
    }));
  }, [sensors, waterLevels, levelsBySensor]);

  const zones = useMemo(() => {
    return markers.map((m) => ({
      lat: m.position[0],
      lng: m.position[1],
      level_cm: m.level_cm ?? levelsBySensor.get(m.id)?.level_cm ?? 650,
      name: m.name || m.id,
    }));
  }, [markers, levelsBySensor]);

  /** When a sensor is critical, draw evacuation route to nearest safe zone. */
  const evacuationRoutes = useMemo(() => {
    const routes = [];
    markers.forEach((m) => {
      const levelCm = m.level_cm ?? levelsBySensor.get(m.id)?.level_cm;
      if (levelCm != null && levelCm > CRITICAL_THRESHOLD_CM) {
        const from = m.position;
        const safe = getNearestSafeZone(from);
        routes.push({ from, to: safe.position, sensorId: m.id });
      }
    });
    return routes;
  }, [markers, levelsBySensor]);

  return (
    <div className="h-[350px] md:h-full w-full relative min-w-0">
      <MapContainer
        center={center || MAP_CENTER}
        zoom={zoom ?? MAP_ZOOM}
        className="h-full w-full"
        scrollWheelZoom
      >
        <MapTiles />

        {/* Dynamic flood overlay: gradient depth + soft neon edge glow */}
        {zones.map((z, zi) => {
          const R = levelToRadius(z.level_cm);
          return (
            <Fragment key={`flood-zone-${zi}`}>
              {FLOOD_RINGS.map((ring, ri) => (
                <Circle
                  key={`flood-${zi}-${ri}-${z.level_cm}`}
                  center={[z.lat, z.lng]}
                  radius={R * ring.r}
                  pathOptions={{
                    fillColor: ring.color,
                    color: "transparent",
                    fillOpacity: ring.opacity,
                    weight: 0,
                    bubblingMouseEvents: false,
                  }}
                />
              ))}
              <Circle
                key={`glow-${zi}`}
                center={[z.lat, z.lng]}
                radius={R * GLOW_RING.r}
                pathOptions={{
                  fillColor: GLOW_RING.color,
                  color: GLOW_RING.color,
                  fillOpacity: 0,
                  weight: 2,
                  opacity: GLOW_RING.opacity,
                  bubblingMouseEvents: false,
                }}
              />
            </Fragment>
          );
        })}

        {zones.map((z, i) => (
          <Circle
            key={`edge-${i}`}
            center={[z.lat, z.lng]}
            radius={levelToRadius(z.level_cm)}
            pathOptions={{
              fillColor: levelToColor(z.level_cm),
              color: levelToColor(z.level_cm),
              fillOpacity: 0.15,
              weight: 1,
              opacity: 0.6,
            }}
          />
        ))}

        {/* Smart Evacuation Routing: dashed glowing green line from critical sensor to nearest Safe Zone */}
        {evacuationRoutes.map((route, idx) => (
          <Fragment key={`evac-${route.sensorId}-${idx}`}>
            <Polyline
              positions={[route.from, route.to]}
              pathOptions={{
                color: "rgba(34, 197, 94, 0.45)",
                weight: 10,
                dashArray: "12, 8",
                className: "evacuation-route-glow",
                bubblingMouseEvents: false,
              }}
            />
            <Polyline
              positions={[route.from, route.to]}
              pathOptions={{
                color: "#22c55e",
                weight: 3,
                dashArray: "12, 8",
                className: "evacuation-route",
                bubblingMouseEvents: false,
              }}
            />
          </Fragment>
        ))}

        {markers.map((m) => {
          const levelCm = m.level_cm ?? levelsBySensor.get(m.id)?.level_cm;
          const isCritical = levelCm != null && levelCm > CRITICAL_THRESHOLD_CM;
          const color = levelToColor(levelCm);
          const vel = m.velocity ?? levelsBySensor.get(m.id)?.velocity;
          const eta = m.forecast_time_minutes ?? levelsBySensor.get(m.id)?.forecast_time_minutes;
          const displayName = (t && t(`sensor_${m.id}`)) || m.name || m.id;
          const levelLabel = t ? t("level") : "Level";
          const velocityLabel = t ? t("velocity") : "Velocity";
          const etaLabel = t ? t("etaTo800") : "ETA to 800 cm";
          const criticalLabel = t ? t("critical") : "CRITICAL";
          const address = t ? t(`address_${m.id}`) : null;
          return (
            <Marker key={m.id} position={m.position}>
              <Popup>
                <div className="min-w-[180px]">
                  <p className="font-bold text-slate-800">
                    {displayName}
                  </p>
                  {address && (
                    <p className="text-sm text-slate-600 mt-0.5">
                      {address}
                    </p>
                  )}
                  {isCritical && (
                    <p className="text-xs font-bold text-red-600 uppercase tracking-wide py-1">
                      {criticalLabel}
                    </p>
                  )}
                  <p style={{ color }} className="text-xs mt-1">
                    {levelLabel}: {levelCm != null ? `${levelCm} cm` : "—"}
                  </p>
                  {vel != null && (
                    <p className="text-slate-600 text-xs">
                      {velocityLabel}: {vel} cm/interval
                    </p>
                  )}
                  {eta != null && (
                    <p className="text-slate-600 text-xs">
                      {etaLabel}: {Number(eta).toFixed(1)} min
                    </p>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Safe Zone markers (higher ground) — distinct green shield icon, name + address popup */}
        {SAFE_ZONES.map((zone) => (
          <Marker key={zone.id} position={zone.position} icon={SAFE_ZONE_ICON}>
            <Popup>
              <div className="min-w-[180px]">
                <p className="font-bold text-emerald-700">
                  {t ? t(zone.nameKey) : zone.id}
                </p>
                <p className="text-sm text-slate-600 mt-0.5">
                  {t ? t(`address_${zone.id}`) : ""}
                </p>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Humanitarian Aid Points — distinct orange/red-cross icon, name + address popup (KZ/RU) */}
        {HUMANITARIAN_AID_POINTS.map((point) => (
          <Marker key={point.id} position={point.position} icon={HUMANITARIAN_AID_ICON}>
            <Popup>
              <div className="min-w-[180px]">
                <p className="font-bold text-orange-700">
                  {t ? t("humanitarianAidPoint") : "Humanitarian Aid Point"}
                </p>
                <p className="text-sm text-slate-600 mt-0.5">
                  {t ? t(`address_${point.id}`) : ""}
                </p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Subtle animated contour overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.04]"
        style={{
          backgroundImage: `
            repeating-radial-gradient(circle at 50% 50%, transparent 0, transparent 2px, rgba(6,182,212,0.4) 2px, rgba(6,182,212,0.4) 3px),
            repeating-radial-gradient(circle at 30% 70%, transparent 0, transparent 3px, rgba(6,182,212,0.3) 3px, rgba(6,182,212,0.3) 4px),
            repeating-radial-gradient(circle at 70% 30%, transparent 0, transparent 4px, rgba(6,182,212,0.2) 4px, rgba(6,182,212,0.2) 5px)
          `,
          animation: "pulse-soft 4s ease-in-out infinite",
        }}
      />

      {loading && (
        <div className="absolute top-2 right-2 px-3 py-1.5 rounded-xl bg-white/90 backdrop-blur-sm text-xs text-slate-600 border border-ops-cyan/20 shadow-glow-cyan">
          {t ? t("updating") : "Updating…"}
        </div>
      )}
    </div>
  );
}
