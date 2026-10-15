// Browser-local address preferences are never identity or jurisdiction data.
const keyFor = id => Number.isSafeInteger(id) && id > 0 ? `nagrikSetuLocalProfile:${id}` : null;
const detailsFrom = value => ({
  address: typeof value?.address === "string" ? value.address.slice(0,500) : "",
  city: typeof value?.city === "string" ? value.city.slice(0,120) : "",
});

export function readLocalProfile(userId, storage) {
  try { storage ??= globalThis.localStorage; const key=keyFor(userId); return detailsFrom(key ? JSON.parse(storage.getItem(key) || "null") : null); }
  catch { return detailsFrom(null); }
}

export function saveLocalProfile(userId, value, storage) {
  try { storage ??= globalThis.localStorage; const key=keyFor(userId); if(!key)return false; storage.setItem(key,JSON.stringify(detailsFrom(value))); return true; }
  catch { return false; }
}
