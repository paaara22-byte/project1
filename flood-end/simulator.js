require("dotenv").config();
const { createClient } = require("@supabase/supabase-js");
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Initialize Gemini 3 Flash Preview
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

/** * FIX: Using 'v1beta' for the preview model to avoid 404 errors. 
 * Gemini-3 models are typically served via the beta endpoint.
 */
const model = genAI.getGenerativeModel(
  { model: "gemini-3-flash-preview" },
  { apiVersion: "v1beta" }
);

const INTERVAL_SECONDS = 3;
const AI_INTERVAL_SECONDS = 30;

const BOLD_CYAN = "\x1b[1;36m";
const RESET = "\x1b[0m";

function toFloat(value) {
  if (value == null || value === "") return null; // Fixed missing ||
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : null;
}

async function generateAIRecommendation(currentData) {
  if (!currentData.length) return { advice_text: null, error: null };
  if (!GEMINI_API_KEY) return { advice_text: null, error: "GEMINI_API_KEY not set" };

  const dataStr = currentData
    .map(
      (s) =>
        `${s.name}: ${s.level_cm} cm, velocity ${s.velocity ?? "—"} cm/interval, ETA ${s.forecast_time_minutes != null ? s.forecast_time_minutes.toFixed(1) + " mins" : "—"}`
    )
    .join("; ");

  // Persona optimized for Petropavl
  const prompt = `Persona: Lead Disaster Response AI for Petropavl, Kazakhstan. Context: Protect Podgora, Zarechny, Kozhzavod. Task: Analyze levels: ${dataStr}. Provide a 1-sentence tactical directive for MCHS (under 15 words).`;

  try {
    const result = await model.generateContent(prompt);
    const response = result.response;
    
    // FIX: .text() is a method in the SDK
    const advice_text = response.text(); 
    
    // Honest Debugging
    console.log(`${BOLD_CYAN}DEBUG - Prompt Sent:${RESET} ${prompt}`);
    console.log(`${BOLD_CYAN}DEBUG - AI Response:${RESET} ${advice_text}`);
    
    if (advice_text) {
      return { advice_text: advice_text.trim(), error: null };
    }
  } catch (err) {
    console.error("Gemini API error:", err.message);
    return { advice_text: null, error: err.message };
  }

  return { advice_text: null, error: null };
}

async function startSimulation() {
  const { data: sensors, error: sensorsError } = await supabase.from("sensors").select("*");

  if (sensorsError) {
    console.error("Failed to fetch sensors:", sensorsError.message);
    return;
  }

  if (!sensors?.length) {
    console.log("No sensors found.");
    return;
  }

  const previousLevelBySensor = new Map();
  const latestReadings = new Map();
  let baseLevel = 650;

  // Interval 1: Water Level Simulation
  setInterval(async () => {
    baseLevel += Math.random() * 5 + 2; // Rising trend

    for (const sensor of sensors) {
      // Adding realistic hydrological noise (+/- 10-40cm)
      const level_cm = Math.round(baseLevel + (Math.random() * 40 - 10));
      const previous_level = previousLevelBySensor.get(sensor.id);
      
      const velocity = previous_level != null ? Math.round(level_cm - previous_level) : null;
      
      const forecast_time_minutes = (velocity != null && velocity > 0)
        ? (800 - level_cm) / velocity * (INTERVAL_SECONDS / 60)
        : null;

      previousLevelBySensor.set(sensor.id, level_cm);

      const name = sensor.name || sensor.id; // Fixed missing ||
      const ftMin = forecast_time_minutes != null ? Math.round(forecast_time_minutes * 10) / 10 : null;
      
      latestReadings.set(sensor.id, { name, level_cm, velocity, forecast_time_minutes: ftMin });

      const row = {
        sensor_id: sensor.id,
        level_cm: toFloat(level_cm),
        velocity: toFloat(velocity),
        forecast_time_minutes: toFloat(ftMin),
      };

      const { error: insertError } = await supabase.from("water_levels").insert(row);

      if (insertError) {
        console.error(`Failed to save level for ${name}:`, insertError.message); // Fixed backticks
        continue;
      }

      const velStr = velocity != null ? `${velocity}cm/interval` : "—";
      const etaStr = ftMin != null ? `${ftMin.toFixed(1)} mins` : "—";
      
      console.log(`💧 [${name}]: ${level_cm}cm | 📈 Velocity: ${velStr} | ⌛ ETA to Flood: ${etaStr}`);

      if (level_cm > 800) {
        console.log(`⚠️ CRITICAL ALERT: [${name}] water level ${level_cm} cm exceeds 800 cm`);
      }
    }
  }, INTERVAL_SECONDS * 1000);

  // Interval 2: AI Analysis
  setInterval(async () => {
    const currentData = Array.from(latestReadings.values());
    if (!currentData.length) return;

    try {
      const { advice_text, error: aiError } = await generateAIRecommendation(currentData);

      if (aiError) console.error("Gemini Error:", aiError);
      if (!advice_text) return;

      const { error: insertError } = await supabase.from("ai_recommendations").insert({ advice_text });

      if (insertError) {
        console.error("Failed to save AI advice:", insertError.message);
        return;
      }

      console.log(`${BOLD_CYAN}🤖 AI ADVICE: ${advice_text}${RESET}`);
    } catch (err) {
      console.error("Critical AI error:", err?.message ?? String(err));
    }
  }, AI_INTERVAL_SECONDS * 1000);
}

startSimulation();
