"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { apiFetch, API_BASE_URL } from "@/lib/api";

/* ── Leaflet types (CDN) ── */
type LeafletMap = {
  setView: (center: [number, number], zoom: number) => void;
  remove: () => void;
  invalidateSize: () => void;
  on: (event: string, handler: (e: any) => void) => void;
};
type LeafletMarker = {
  addTo: (map: LeafletMap) => LeafletMarker;
  setLatLng: (latlng: [number, number]) => void;
  getLatLng: () => { lat: number; lng: number };
  remove: () => void;
  bindPopup: (content: string) => LeafletMarker;
  on: (event: string, handler: (...args: any[]) => void) => void;
};
type LeafletLib = {
  map: (el: HTMLElement, opts: Record<string, unknown>) => LeafletMap;
  tileLayer: (url: string, opts: Record<string, unknown>) => { addTo: (m: LeafletMap) => void };
  marker: (ll: [number, number], opts?: Record<string, unknown>) => LeafletMarker;
  icon: (opts: Record<string, unknown>) => unknown;
};

const DEFAULT_COORDS = { lat: 13.7563, lng: 100.5018 };
const ASSET_BASE = API_BASE_URL.replace(/\/api\/?$/, "");

function resolveAsset(v?: string) {
  if (!v) return "";
  if (/^(https?:|data:)/.test(v)) return v;
  return `${ASSET_BASE}${v.startsWith("/") ? v : `/${v}`}`;
}

async function loadLeaflet(): Promise<LeafletLib | null> {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { L?: LeafletLib };
  if (w.L) return w.L;

  if (!document.querySelector('link[data-leaflet="true"]')) {
    const css = document.createElement("link");
    css.rel = "stylesheet";
    css.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    css.setAttribute("data-leaflet", "true");
    document.head.appendChild(css);
  }

  await new Promise<void>((resolve, reject) => {
    const existing = document.querySelector('script[data-leaflet="true"]') as HTMLScriptElement | null;
    if (existing) {
      if ((window as any).L) { resolve(); return; }
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Failed to load leaflet")));
      return;
    }
    const script = document.createElement("script");
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.async = true;
    script.setAttribute("data-leaflet", "true");
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load leaflet"));
    document.body.appendChild(script);
  });

  const LFull = (window as any).L;
  if (LFull?.Icon?.Default?.prototype?._getIconUrl) {
    delete LFull.Icon.Default.prototype._getIconUrl;
  }
  const CDN = "https://unpkg.com/leaflet@1.9.4/dist/images";
  LFull?.Icon?.Default?.mergeOptions?.({
    iconUrl: `${CDN}/marker-icon.png`,
    iconRetinaUrl: `${CDN}/marker-icon-2x.png`,
    shadowUrl: `${CDN}/marker-shadow.png`,
  });

  return (window as unknown as { L?: LeafletLib }).L ?? null;
}

function makeDefaultIcon(L: LeafletLib) {
  const CDN = "https://unpkg.com/leaflet@1.9.4/dist/images";
  return L.icon({
    iconUrl: `${CDN}/marker-icon.png`,
    iconRetinaUrl: `${CDN}/marker-icon-2x.png`,
    shadowUrl: `${CDN}/marker-shadow.png`,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  });
}

type Shop = {
  _id: string;
  shopName?: string;
  label?: string;
  phoneNumber?: string;
  photoImage?: string;
  approvalStatus?: "pending" | "approved" | "rejected";
  location?: { type: string; coordinates: number[] };
};

export default function EmployeeShopListPage() {
  /* ── state ── */
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingShop, setEditingShop] = useState<Shop | null>(null);

  /* form fields */
  const [shopName, setShopName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [totalMachines, setTotalMachines] = useState("10");
  const [totalDryingMachines, setTotalDryingMachines] = useState("8");
  const [machineS, setMachineS] = useState("4");
  const [machineM, setMachineM] = useState("3");
  const [machineL, setMachineL] = useState("3");
  const [latitude, setLatitude] = useState(String(DEFAULT_COORDS.lat));
  const [longitude, setLongitude] = useState(String(DEFAULT_COORDS.lng));
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  /* ── image file handler ── */
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be less than 5 MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setPhotoBase64(result);
      setImagePreview(result);
    };
    reader.readAsDataURL(file);
  };

  /* map refs */
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markerRef = useRef<LeafletMarker | null>(null);
  const leafletRef = useRef<LeafletLib | null>(null);

  /* ── load shops ── */
  const fetchShops = async () => {
    try {
      const data = await apiFetch("/map/shops");
      setShops(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load shops");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShops();
  }, []);

  /* ── map setup (only when form visible) ── */
  useEffect(() => {
    if (!showForm) return;
    let mounted = true;

    const setup = async () => {
      const L = await loadLeaflet();
      if (!mounted || !L || !mapContainerRef.current || mapRef.current) return;
      leafletRef.current = L;

      let initLat = DEFAULT_COORDS.lat;
      let initLng = DEFAULT_COORDS.lng;

      try {
        const pos = await new Promise<GeolocationPosition>((res, rej) =>
          navigator.geolocation.getCurrentPosition(res, rej, { enableHighAccuracy: true, timeout: 5000 }),
        );
        initLat = pos.coords.latitude;
        initLng = pos.coords.longitude;
        if (mounted) {
          setLatitude(String(initLat));
          setLongitude(String(initLng));
        }
      } catch { /* use default */ }

      const map = L.map(mapContainerRef.current, { center: [initLat, initLng], zoom: 14 } as any);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19 }).addTo(map);

      const marker = L.marker([initLat, initLng], { draggable: true, icon: makeDefaultIcon(L) }).addTo(map);
      marker.bindPopup("Drag or click map to set shop location");

      marker.on("dragend", () => {
        const p = marker.getLatLng();
        setLatitude(String(p.lat));
        setLongitude(String(p.lng));
      });

      map.on("click", (e: any) => {
        const p = e.latlng;
        marker.setLatLng([p.lat, p.lng]);
        setLatitude(String(p.lat));
        setLongitude(String(p.lng));
      });

      mapRef.current = map;
      markerRef.current = marker;
      setTimeout(() => map.invalidateSize(), 100);
    };

    setup();

    return () => {
      mounted = false;
      mapRef.current?.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, [showForm]);

  /* ── use my location ── */
  const useMyLocation = () => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setLatitude(String(lat));
        setLongitude(String(lng));
        markerRef.current?.setLatLng([lat, lng]);
        mapRef.current?.setView([lat, lng], 15);
      },
      () => alert("Could not get your location"),
      { enableHighAccuracy: true },
    );
  };

  /* ── submit new shop pin request or edit ── */
  const handleSubmit = async () => {
    if (!shopName.trim()) { setError("Shop name is required"); return; }
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const payload: any = {
        shopName: shopName.trim(),
        label: shopName.trim(),
        phoneNumber: phoneNumber.trim(),
        totalWashingMachines: Number(totalMachines) || 10,
        totalDryingMachines: Number(totalDryingMachines) || 8,
        machineSizeConfig: {
          s: Number(machineS) || 0,
          m: Number(machineM) || 0,
          l: Number(machineL) || 0,
        },
        location: {
          type: "Point",
          coordinates: [Number(longitude), Number(latitude)],
        },
      };
      if (photoBase64) payload.photoImage = photoBase64;

      await apiFetch(
        editingShop ? `/map/shops/${editingShop._id}` : "/map/shops",
        {
          method: editingShop ? "PUT" : "POST",
          body: JSON.stringify(payload),
        },
      );
      setMessage(editingShop ? "Shop updated! Changes are pending admin approval." : "Shop pin request submitted! Waiting for admin approval.");
      resetForm();
      fetchShops();
    } catch (e) {
      setError(e instanceof Error ? e.message : editingShop ? "Failed to update shop" : "Failed to create shop pin");
    } finally {
      setSaving(false);
    }
  };

  /* ── reset form ── */
  const resetForm = () => {
    setShopName("");
    setPhoneNumber("");
    setTotalMachines("10");
    setTotalDryingMachines("8");
    setMachineS("4");
    setMachineM("3");
    setMachineL("3");
    setLatitude(String(DEFAULT_COORDS.lat));
    setLongitude(String(DEFAULT_COORDS.lng));
    setPhotoBase64(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setShowForm(false);
    setEditingShop(null);
  };

  /* ── open edit form ── */
  const handleEdit = (shop: Shop) => {
    setEditingShop(shop);
    setShopName(shop.shopName || shop.label || "");
    setPhoneNumber(shop.phoneNumber || "");
    const mc = (shop as any).machineSizeConfig;
    const tw = (shop as any).totalWashingMachines;
    setTotalMachines(String(tw || 10));
    const td = (shop as any).totalDryingMachines;
    setTotalDryingMachines(String(td ?? 8));
    setMachineS(String(mc?.s ?? 4));
    setMachineM(String(mc?.m ?? 3));
    setMachineL(String(mc?.l ?? 3));
    if (shop.location?.coordinates?.length === 2) {
      setLongitude(String(shop.location.coordinates[0]));
      setLatitude(String(shop.location.coordinates[1]));
    }
    // show existing image preview
    const existingImg = resolveAsset(shop.photoImage);
    setImagePreview(existingImg || null);
    setPhotoBase64(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setShowForm(true);
    setError(null);
    setMessage(null);

    // Update map marker if already initialized
    setTimeout(() => {
      if (mapRef.current && markerRef.current && shop.location?.coordinates?.length === 2) {
        const lat = shop.location.coordinates[1];
        const lng = shop.location.coordinates[0];
        markerRef.current.setLatLng([lat, lng]);
        mapRef.current.setView([lat, lng], 15);
      }
    }, 300);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-blue-900 tracking-tight">Shops</h1>
          <p className="text-sm text-blue-700/60 font-medium">View shops and request adding a new shop pin.</p>
        </div>
        <button
          onClick={() => { if (showForm) { resetForm(); } else { setEditingShop(null); setShowForm(true); } }}
          className="rounded-xl border border-blue-200 bg-blue-600 px-4 py-2 text-xs font-bold uppercase tracking-wide text-white hover:bg-blue-700 transition-colors"
        >
          {showForm ? "Cancel" : "+ Request Shop Pin"}
        </button>
      </div>

      {message && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">{message}</div>}
      {error && <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-600">{error}</div>}

      {/* ── New Shop Pin Form ── */}
      {showForm && (
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm space-y-4">
          <h2 className="text-lg font-bold text-blue-900">{editingShop ? "Edit Shop" : "Request New Shop Pin"}</h2>
          <p className="text-xs text-amber-600 font-semibold">{editingShop ? "After editing, the shop will be pending until admin re-approves it." : "Your shop pin will be pending until admin approves it."}</p>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Shop Name *</label>
              <input value={shopName} onChange={(e) => setShopName(e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-300" placeholder="My Laundry Shop" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Phone Number</label>
              <input value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-300" placeholder="0891234567" />
            </div>
          </div>

          {/* Shop Image */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Shop Image</label>
            <div className="flex items-center gap-4">
              {imagePreview && (
                <img src={imagePreview} alt="Preview" className="h-20 w-28 rounded-lg object-cover border border-slate-200" />
              )}
              <div className="flex flex-col gap-1">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="text-sm text-slate-500 file:mr-2 file:rounded-lg file:border-0 file:bg-blue-50 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-blue-700 hover:file:bg-blue-100"
                />
                <span className="text-[10px] text-slate-400">Max 5 MB. JPG, PNG, WebP supported.</span>
                {imagePreview && (
                  <button
                    type="button"
                    onClick={() => { setPhotoBase64(null); setImagePreview(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                    className="text-[10px] font-semibold text-rose-500 hover:text-rose-700 text-left"
                  >
                    Remove image
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-5">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Washing Machines</label>
              <input type="number" value={totalMachines} onChange={(e) => setTotalMachines(e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-300" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Drying Machines</label>
              <input type="number" value={totalDryingMachines} onChange={(e) => setTotalDryingMachines(e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-300" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Size S</label>
              <input type="number" value={machineS} onChange={(e) => setMachineS(e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-300" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Size M</label>
              <input type="number" value={machineM} onChange={(e) => setMachineM(e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-300" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Size L</label>
              <input type="number" value={machineL} onChange={(e) => setMachineL(e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-300" />
            </div>
          </div>

          {/* Map */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-600">Pin Location (drag marker or click map)</label>
              <button onClick={useMyLocation} className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1 text-[10px] font-bold text-blue-700 hover:bg-blue-100 transition-colors">
                Use My Location
              </button>
            </div>
            <div ref={mapContainerRef} className="h-64 w-full rounded-xl border border-slate-200 overflow-hidden" />
            <div className="mt-2 flex gap-3 text-[11px] text-slate-500">
              <span>Lat: {Number(latitude).toFixed(6)}</span>
              <span>Lng: {Number(longitude).toFixed(6)}</span>
            </div>
          </div>

          <button
            onClick={handleSubmit}
            disabled={saving}
            className="rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {saving ? "Submitting..." : editingShop ? "Update Shop" : "Submit Shop Pin Request"}
          </button>
        </div>
      )}

      {/* ── Shop List ── */}
      {loading ? (
        <p className="text-sm text-blue-600">Loading shops...</p>
      ) : shops.length === 0 ? (
        <p className="text-sm text-slate-500">No shops found.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {shops.map((shop) => {
            const img = resolveAsset(shop.photoImage);
            const isPending = shop.approvalStatus === "pending";
            return (
              <div key={shop._id} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
                {img && <img src={img} alt={shop.shopName || "Shop"} className="mb-3 h-24 w-full rounded-xl object-cover" />}
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-bold text-blue-900 truncate">{shop.shopName || shop.label || "Shop"}</h3>
                  <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase ${isPending ? "border-amber-200 bg-amber-50 text-amber-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>
                    {shop.approvalStatus || "approved"}
                  </span>
                </div>
                {shop.phoneNumber && <p className="mt-1 text-xs text-slate-500">☎ {shop.phoneNumber}</p>}
                <div className="mt-3 flex flex-col gap-2">
                  {!isPending && (
                    <Link
                      href={`/employee/shop/${shop._id}`}
                      className="inline-flex w-full items-center justify-center rounded-lg border border-blue-200 px-3 py-1.5 text-[11px] font-bold text-blue-700 hover:bg-blue-50 transition-colors"
                    >
                      View Orders →
                    </Link>
                  )}
                  <button
                    onClick={() => handleEdit(shop)}
                    className="inline-flex w-full items-center justify-center rounded-lg border border-amber-200 px-3 py-1.5 text-[11px] font-bold text-amber-700 hover:bg-amber-50 transition-colors"
                  >
                    ✏️ Edit Shop
                  </button>
                  {isPending && (
                    <p className="text-[11px] font-semibold text-amber-600">Waiting for admin approval...</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
