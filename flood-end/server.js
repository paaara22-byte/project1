const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const express = require("express");
const cors = require("cors");
const { createClient } = require("@supabase/supabase-js");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
const PORT = process.env.PORT || 3001;

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("Missing required env: SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in .env");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

let geminiModel = null;
if (GEMINI_API_KEY) {
  try {
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    geminiModel = genAI.getGenerativeModel(
      { model: "gemini-3-flash-preview" },
      { apiVersion: "v1beta" }
    );
  } catch (err) {
    console.warn("Gemini init failed:", err.message);
  }
}

app.use(cors());
app.use(express.json());

// GET /api/sensors — list all sensors (for map markers)
app.get("/api/sensors", async (req, res) => {
  try {
    const { data, error } = await supabase.from("sensors").select("*").order("id");
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/water-levels — latest reading per sensor (for map + summary)
app.get("/api/water-levels", async (req, res) => {
  try {
    const { data: levels, error: levelsError } = await supabase
      .from("water_levels")
      .select("sensor_id, level_cm, velocity, forecast_time_minutes, created_at")
      .order("created_at", { ascending: false });

    if (levelsError) throw levelsError;

    const { data: sensors, error: sensorsError } = await supabase
      .from("sensors")
      .select("id, name, lat, lng");

    if (sensorsError) throw sensorsError;

    const sensorMap = new Map((sensors || []).map((s) => [s.id, s]));
    const seen = new Set();
    const latest = (levels || []).filter((row) => {
      if (seen.has(row.sensor_id)) return false;
      seen.add(row.sensor_id);
      return true;
    });

    const result = latest.map((row) => ({
      ...row,
      name: sensorMap.get(row.sensor_id)?.name ?? row.sensor_id,
      lat: sensorMap.get(row.sensor_id)?.lat,
      lng: sensorMap.get(row.sensor_id)?.lng,
    }));

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/ai-recommendations — recent AI predictions / flood risk advice
app.get("/api/ai-recommendations", async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 50);
    const { data, error } = await supabase
      .from("ai_recommendations")
      .select("id, advice_text, created_at")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/alerts — active flood alerts (sensors above threshold)
app.get("/api/alerts", async (req, res) => {
  try {
    const threshold = parseInt(req.query.threshold, 10) || 750;
    const { data: levels, error: levelsError } = await supabase
      .from("water_levels")
      .select("sensor_id, level_cm, velocity, forecast_time_minutes, created_at")
      .gte("level_cm", threshold)
      .order("created_at", { ascending: false });

    if (levelsError) throw levelsError;

    const { data: sensors } = await supabase.from("sensors").select("id, name");
    const sensorMap = new Map((sensors || []).map((s) => [s.id, s]));
    const seen = new Set();
    const latest = (levels || []).filter((row) => {
      if (seen.has(row.sensor_id)) return false;
      seen.add(row.sensor_id);
      return true;
    });

    const result = latest.map((row) => ({
      ...row,
      name: sensorMap.get(row.sensor_id)?.name ?? row.sensor_id,
    }));

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/chat — AI chat (expects { message }, returns { reply })
// Table chat_responses: columns keywords (text, comma-separated), reply (text). Optional.
const DEFAULT_REPLY =
  "Задайте вопрос об эвакуации, уровне воды или укажите название датчика. Актуальные данные — на карте и в рекомендациях ИИ.";

app.post("/api/chat", async (req, res) => {
  try {
    const { message } = req.body || {};
    const text = typeof message === "string" ? message.trim() : "";
    if (!text) {
      return res.status(400).json({ error: "Missing or empty message" });
    }

    if (geminiModel) {
      try {
        const prompt = `You are a flood control assistant for Petropavl, Kazakhstan. Answer briefly and helpfully in the same language as the user. User question: ${text}`;
        const result = await geminiModel.generateContent(prompt);
        const response = result.response;
        const replyText = response.text ? response.text() : (response.candidates?.[0]?.content?.parts?.[0]?.text ?? "");
        if (replyText && replyText.trim()) {
          return res.json({ reply: replyText.trim() });
        }
      } catch (geminiErr) {
        console.warn("Gemini chat fallback:", geminiErr.message);
      }
    }

    const normalized = text.toLowerCase();

    // 1) Try DB table chat_responses (keywords comma-separated, reply)
    let reply = null;
    try {
      const { data: rows, error } = await supabase
        .from("chat_responses")
        .select("keywords, reply");
      if (!error && rows && rows.length > 0) {
        for (const row of rows) {
          const keywords = (row.keywords || "")
            .split(",")
            .map((k) => k.trim().toLowerCase())
            .filter(Boolean);
          if (keywords.some((k) => normalized.includes(k))) {
            reply = row.reply || "";
            break;
          }
        }
      }
    } catch (_) {
      // Table may not exist; continue to fallback
    }

    // 2) Fallback: match sensor names and built-in keywords from DB / logic
    if (!reply) {
      const { data: sensors } = await supabase.from("sensors").select("id, name");
      const names = (sensors || []).map((s) => (s.name || "").toLowerCase()).filter(Boolean);
      const sensorMatch = names.find((name) => name && normalized.includes(name));
      if (sensorMatch) {
        reply =
          "Актуальные данные по датчикам и уровню воды отображаются на карте и в блоке рекомендаций ИИ. Проверьте панель и карту.";
      } else if (/эвакуация|evacuation|эвакуациялау/i.test(normalized)) {
        reply =
          "Эвакуация: следуйте маршрутам на карте до безопасных зон. Актуальные адреса пунктов помощи и убежищ указаны на карте.";
      } else if (/опасно|danger|қауіп|тәуекел/i.test(normalized)) {
        reply =
          "При высоком уровне воды соблюдайте рекомендации ИИ на панели и не приближайтесь к зонам затопления. Эвакуационные маршруты отмечены на карте.";
      }
    }

    if (!reply) reply = DEFAULT_REPLY;

    res.json({ reply });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/notify — simulate Telegram bot alert
app.post("/api/notify", async (req, res) => {
  try {
    const { message } = req.body || {};
    const text = message || "Flood risk alert: check Akimat dashboard.";
    console.log("[Telegram simulate]", text);
    res.json({ ok: true, simulated: true, message: text });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/flood-zones — optional: zones for polygons (can derive from levels)
app.get("/api/flood-zones", async (req, res) => {
  try {
    const { data: levels } = await supabase
      .from("water_levels")
      .select("sensor_id, level_cm, created_at")
      .order("created_at", { ascending: false });

    const { data: sensors } = await supabase.from("sensors").select("id, name, lat, lng");
    const sensorMap = new Map((sensors || []).map((s) => [s.id, s]));
    const seen = new Set();
    const latest = (levels || []).filter((row) => {
      if (seen.has(row.sensor_id)) return false;
      seen.add(row.sensor_id);
      return true;
    });

    const zones = latest
      .filter((row) => sensorMap.get(row.sensor_id)?.lat != null && sensorMap.get(row.sensor_id)?.lng != null)
      .map((row) => {
        const s = sensorMap.get(row.sensor_id);
        return {
          sensor_id: row.sensor_id,
          name: s?.name,
          level_cm: row.level_cm,
          lat: s.lat,
          lng: s.lng,
        };
      });

    res.json(zones);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Serve dashboard build if present (after API routes)
const fs = require("fs");
const dashboardBuild = path.join(__dirname, "dashboard", "dist");
if (fs.existsSync(dashboardBuild)) {
  app.use(express.static(dashboardBuild));
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api")) return next();
    res.sendFile(path.join(dashboardBuild, "index.html"));
  });
}

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Flood Control API running at http://localhost:${PORT} (CORS enabled)`);
});
