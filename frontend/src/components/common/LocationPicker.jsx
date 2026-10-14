import { useEffect, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import maplibreWorkerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
import "maplibre-gl/dist/maplibre-gl.css";

maplibregl.setWorkerUrl(maplibreWorkerUrl);

export default function LocationPicker({ value, onChange, readOnly = false }) {
  const container = useRef(null), map = useRef(null), marker = useRef(null), callback = useRef(onChange);
  useEffect(() => { callback.current = onChange; }, [onChange]);
  const [error, setError] = useState(""), [busy, setBusy] = useState(false);
  const [lat, setLat] = useState(""), [lng, setLng] = useState(""), [address, setAddress] = useState(value?.address || "");
  const key = import.meta.env.VITE_MAPTILER_API_KEY;
  useEffect(() => {
    if (!key || key === "your_maptiler_key_here") { setError("Map unavailable: configure the MapTiler key. Enter a location manually below."); return; }
    try {
      const instance = new maplibregl.Map({ container: container.current, style: `https://api.maptiler.com/maps/streets-v2/style.json?key=${encodeURIComponent(key)}`, center: [78.9629, 20.5937], zoom: 4 });
      map.current = instance;
      instance.addControl(new maplibregl.NavigationControl());
      instance.on("error", (event) => {
        const status = event.error?.status;
        setError(`The basemap could not load${status ? ` (HTTP ${status})` : ""}. Manual location remains available.`);
      });
      instance.once("load", () => setError(""));
      if (!readOnly) instance.on("click", e => callback.current?.({ latitude: e.lngLat.lat, longitude: e.lngLat.lng }));
      const observer = new ResizeObserver(() => instance.resize()); observer.observe(container.current);
      return () => { observer.disconnect(); marker.current?.remove(); marker.current = null; instance.remove(); map.current = null; };
    } catch { setError("Map rendering is unavailable in this browser. Enter a location manually."); }
  }, [key, readOnly]);
  useEffect(() => {
    if (!Number.isFinite(value?.latitude) || !Number.isFinite(value?.longitude)) return;
    setLat(String(value.latitude)); setLng(String(value.longitude));
    if (!map.current) return;
    if (!marker.current) {
      marker.current = new maplibregl.Marker({ color: "#f97316", draggable: !readOnly }).setLngLat([value.longitude, value.latitude]).addTo(map.current);
      marker.current.on("dragend", () => { const point = marker.current.getLngLat(); callback.current?.({ latitude: point.lat, longitude: point.lng }); });
    }
    marker.current.setLngLat([value.longitude, value.latitude]); map.current.easeTo({ center: [value.longitude, value.latitude], zoom: 14 });
  }, [value, readOnly]);
  function locate() {
    if (!navigator.geolocation) { setError("Geolocation is unavailable. Enter a manual location."); return; }
    setBusy(true); setError("");
    navigator.geolocation.getCurrentPosition(pos => { setBusy(false); onChange?.({ latitude: pos.coords.latitude, longitude: pos.coords.longitude, address }); }, () => { setBusy(false); setError("Location access was denied or unavailable. Select a pin or enter your location manually."); }, { timeout: 10000, maximumAge: 60000 });
  }
  function manual() {
    if ((!lat || !lng) && address.trim()) { onChange?.({ address: address.trim() }); setError(""); return; }
    const latitude = Number(lat), longitude = Number(lng);
    if (!lat.trim() || !lng.trim() || !Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) { setError("Enter valid latitude (-90 to 90) and longitude (-180 to 180), or an address alone."); return; }
    onChange?.({ latitude, longitude, address }); setError("");
  }
  return <section className="min-w-0 space-y-3"><div ref={container} className="h-72 w-full rounded-xl border border-slate-200 bg-slate-100" aria-label="Incident location map" />{error && <p role="status" className="text-xs text-amber-800">{error}</p>}{!readOnly && <><button type="button" onClick={locate} disabled={busy} className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white">{busy ? "Locating..." : "Use current location"}</button><p className="text-xs text-slate-500">Click the map or drag the pin. Your browser asks permission before sharing location.</p><label className="block text-xs">Address / landmark<input value={address} onChange={e => setAddress(e.target.value)} className="field" /></label><div className="grid gap-3 sm:grid-cols-2"><label className="text-xs">Latitude<input type="number" step="any" value={lat} onChange={e => setLat(e.target.value)} className="field" /></label><label className="text-xs">Longitude<input type="number" step="any" value={lng} onChange={e => setLng(e.target.value)} className="field" /></label></div><button type="button" onClick={manual} className="rounded border px-3 py-2 text-xs">Apply manual location</button></>}{value && <p className="break-words text-xs">Selected: {value.address} {value.latitude != null && `${value.latitude.toFixed(5)}, ${value.longitude.toFixed(5)}`}</p>}</section>;
}
