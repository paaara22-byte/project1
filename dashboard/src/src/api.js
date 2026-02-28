const API_BASE = "/api";

async function fetchApi(path) {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getSensors() {
  return fetchApi("/sensors");
}

export async function getWaterLevels() {
  return fetchApi("/water-levels");
}

export async function getAiRecommendations(limit = 20) {
  return fetchApi(`/ai-recommendations?limit=${limit}`);
}

export async function getAlerts(threshold = 750) {
  return fetchApi(`/alerts?threshold=${threshold}`);
}

export async function getFloodZones() {
  return fetchApi("/flood-zones");
}

export async function sendNotify(message) {
  const res = await fetch(`${API_BASE}/notify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: message || undefined }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
