export function normalizeApiBase(value) {
  return String(value || "").trim().replace(/\/+$/, "").replace(/\/api\/v1$/, "");
}

export function validateProductionApiBase(value) {
  const base = normalizeApiBase(value);
  const message = "Set VITE_API_BASE_URL to the public HTTPS backend origin before building (optionally ending in /api/v1).";
  let url;
  try { url = new URL(base); } catch { throw new Error(message); }
  const local = url.hostname === "localhost" || url.hostname.endsWith(".localhost") || url.hostname === "0.0.0.0" || url.hostname === "[::1]" || /^127\./.test(url.hostname);
  if (url.protocol !== "https:" || local || url.username || url.password || url.search || url.hash || url.pathname !== "/") {
    throw new Error(message);
  }
  return base;
}
