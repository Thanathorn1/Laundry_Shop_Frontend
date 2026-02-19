"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";

type LatLng = { lat: number; lng: number };

type LeafletMarker = {
  addTo: (map: LeafletMap) => LeafletMarker;
  on: (event: string, handler: () => void) => void;
  getLatLng: () => LatLng;
  setLatLng: (latLng: LatLng) => void;
};

type LeafletMap = {
  on: (event: string, handler: (event: { latlng: LatLng }) => void) => void;
  panTo: (latLng: [number, number]) => void;
  remove: () => void;
};

type LeafletLib = {
  map: (container: HTMLElement, options: { center: [number, number]; zoom: number }) => LeafletMap;
  tileLayer: (url: string, options: { maxZoom: number }) => { addTo: (map: LeafletMap) => void };
  marker: (latLng: [number, number], options: { draggable: boolean }) => LeafletMarker;
};

type ShopItem = {
  _id: string;
  shopName?: string;
  label?: string;
  phoneNumber?: string;
  photoImage?: string;
  location?: {
    type: string;
    coordinates: number[];
  };
};

const DEFAULT_COORDS = { lat: 13.7563, lng: 100.5018 };

async function loadLeaflet() {
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
    const existingScript = document.querySelector('script[data-leaflet="true"]') as HTMLScriptElement | null;
    if (existingScript) {
      if ((window as any).L) {
        resolve();
        return;
      }
      existingScript.addEventListener("load", () => resolve());
      existingScript.addEventListener("error", () => reject(new Error("Failed to load leaflet")));
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

  return (window as unknown as { L?: LeafletLib }).L ?? null;
}

export default function AdminPinShopPage() {
  const router = useRouter();
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markerRef = useRef<LeafletMarker | null>(null);

  const [shopName, setShopName] = useState("");
  const [label, setLabel] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [photoImage, setPhotoImage] = useState("");
  const [latitude, setLatitude] = useState(String(DEFAULT_COORDS.lat));
  const [longitude, setLongitude] = useState(String(DEFAULT_COORDS.lng));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [shops, setShops] = useState<ShopItem[]>([]);
  const [loadingShops, setLoadingShops] = useState(false);
  const [editingShopId, setEditingShopId] = useState<string | null>(null);
  const [editShopName, setEditShopName] = useState("");
  const [editLabel, setEditLabel] = useState("");
  const [editPhoneNumber, setEditPhoneNumber] = useState("");
  const [editPhotoImage, setEditPhotoImage] = useState("");
  const [editLatitude, setEditLatitude] = useState("");
  const [editLongitude, setEditLongitude] = useState("");
  const [updatingShopId, setUpdatingShopId] = useState<string | null>(null);
  const [deletingShopId, setDeletingShopId] = useState<string | null>(null);

  const loadShops = async () => {
    try {
      setLoadingShops(true);
      const data = (await apiFetch("/map/shops")) as ShopItem[];
      setShops(Array.isArray(data) ? data : []);
    } catch {
      setShops([]);
    } finally {
      setLoadingShops(false);
    }
  };

  useEffect(() => {
    const authRole = localStorage.getItem("auth_role");
    const legacyRole = localStorage.getItem("user_role");
    if (authRole !== "admin" && legacyRole !== "admin") {
      router.replace("/");
      return;
    }

    let mounted = true;

    const setupMap = async () => {
      const L = await loadLeaflet();
      if (!mounted || !L || !mapContainerRef.current || mapRef.current) return;

      const map = L.map(mapContainerRef.current, {
        center: [Number(latitude), Number(longitude)],
        zoom: 15,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19 }).addTo(map);
      const marker = L.marker([Number(latitude), Number(longitude)], { draggable: true }).addTo(map);

      marker.on("dragend", () => {
        const point = marker.getLatLng();
        setLatitude(String(point.lat));
        setLongitude(String(point.lng));
      });

      map.on("click", (event: { latlng: LatLng }) => {
        marker.setLatLng(event.latlng);
        setLatitude(String(event.latlng.lat));
        setLongitude(String(event.latlng.lng));
      });

      mapRef.current = map;
      markerRef.current = marker;
    };

    setupMap();
    loadShops();

    return () => {
      mounted = false;
      if (mapRef.current) mapRef.current.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, [router]);

  useEffect(() => {
    const lat = Number(latitude);
    const lng = Number(longitude);
    if (Number.isNaN(lat) || Number.isNaN(lng) || !markerRef.current || !mapRef.current) return;
    markerRef.current.setLatLng({ lat, lng });
    mapRef.current.panTo([lat, lng]);
  }, [latitude, longitude]);

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(String(position.coords.latitude));
        setLongitude(String(position.coords.longitude));
      },
      () => setError("Cannot access current location"),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const onPhotoFileChange = async (file: File | null) => {
    if (!file) return;
    const result = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("Failed to read image"));
      reader.readAsDataURL(file);
    });
    setPhotoImage(result);
  };

  const saveShop = async () => {
    setError(null);
    setMessage(null);

    const lat = Number(latitude);
    const lng = Number(longitude);
    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      setError("Latitude/Longitude must be valid numbers");
      return;
    }

    if (!shopName.trim()) {
      setError("Shop name is required");
      return;
    }

    setSaving(true);
    try {
      await apiFetch("/map/shops", {
        method: "POST",
        body: JSON.stringify({
          shopName: shopName.trim(),
          label: label.trim() || shopName.trim(),
          phoneNumber: phoneNumber.trim(),
          photoImage: photoImage.trim(),
          location: { lat, lng },
        }),
      });
      setMessage("Shop pinned successfully");
      setShopName("");
      setLabel("");
      setPhoneNumber("");
      setPhotoImage("");
      await loadShops();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to pin shop");
    } finally {
      setSaving(false);
    }
  };

  const startEditShop = (shop: ShopItem) => {
    setEditingShopId(shop._id);
    setEditShopName(shop.shopName || "");
    setEditLabel(shop.label || "");
    setEditPhoneNumber(shop.phoneNumber || "");
    setEditPhotoImage(shop.photoImage || "");
    const coords = shop.location?.coordinates;
    setEditLongitude(Array.isArray(coords) && coords.length >= 2 ? String(coords[0]) : "");
    setEditLatitude(Array.isArray(coords) && coords.length >= 2 ? String(coords[1]) : "");
  };

  const saveEditShop = async (shopId: string) => {
    const lat = Number(editLatitude);
    const lng = Number(editLongitude);
    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      setError("Edit latitude/longitude must be valid numbers");
      return;
    }

    setUpdatingShopId(shopId);
    setError(null);
    setMessage(null);
    try {
      await apiFetch(`/map/shops/${shopId}`, {
        method: "PUT",
        body: JSON.stringify({
          shopName: editShopName.trim(),
          label: editLabel.trim(),
          phoneNumber: editPhoneNumber.trim(),
          photoImage: editPhotoImage.trim(),
          location: { lat, lng },
        }),
      });
      setMessage("Shop updated");
      setEditingShopId(null);
      await loadShops();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update shop");
    } finally {
      setUpdatingShopId(null);
    }
  };

  const deleteShop = async (shopId: string) => {
    if (!confirm("Delete this pinned shop?")) return;
    setDeletingShopId(shopId);
    setError(null);
    setMessage(null);
    try {
      await apiFetch(`/map/shops/${shopId}`, { method: "DELETE" });
      setMessage("Shop deleted");
      if (editingShopId === shopId) setEditingShopId(null);
      await loadShops();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete shop");
    } finally {
      setDeletingShopId(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-8 font-sans text-blue-900">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black tracking-tight">Pin Laundry Shop</h1>
            <p className="text-sm text-blue-700/60">Add shop location with photo and phone for riders.</p>
          </div>
          <Link href="/admin" className="rounded-xl border border-blue-100 bg-white px-4 py-2 text-sm font-bold text-blue-700 hover:bg-blue-50">
            ← Back to Admin
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-3xl border border-white bg-white p-6 shadow-2xl shadow-blue-100/40">
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-bold">Shop Name</label>
                <input value={shopName} onChange={(e) => setShopName(e.target.value)} className="w-full rounded-xl border border-zinc-300 px-3 py-2 outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-bold">Shop Label</label>
                <input value={label} onChange={(e) => setLabel(e.target.value)} className="w-full rounded-xl border border-zinc-300 px-3 py-2 outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-bold">Phone Number</label>
                <input value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} className="w-full rounded-xl border border-zinc-300 px-3 py-2 outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-bold">Photo Image URL or Base64</label>
                <input value={photoImage} onChange={(e) => setPhotoImage(e.target.value)} className="w-full rounded-xl border border-zinc-300 px-3 py-2 outline-none focus:border-blue-500" />
                <input type="file" accept="image/*" onChange={(e) => onPhotoFileChange(e.target.files?.[0] ?? null)} className="mt-2 w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm" />
                {photoImage && (
                  <img src={photoImage} alt="Shop preview" className="mt-3 h-28 w-full rounded-xl border border-slate-200 object-cover" />
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-bold">Latitude</label>
                  <input value={latitude} onChange={(e) => setLatitude(e.target.value)} className="w-full rounded-xl border border-zinc-300 px-3 py-2 outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-bold">Longitude</label>
                  <input value={longitude} onChange={(e) => setLongitude(e.target.value)} className="w-full rounded-xl border border-zinc-300 px-3 py-2 outline-none focus:border-blue-500" />
                </div>
              </div>

              <button onClick={useCurrentLocation} className="rounded-xl border border-emerald-200 px-3 py-2 text-xs font-black uppercase tracking-widest text-emerald-700 hover:bg-emerald-50">
                Use Current Location
              </button>

              <button
                onClick={saveShop}
                disabled={saving}
                className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-black text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Pin Shop"}
              </button>

              {message && <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">{message}</p>}
              {error && <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">{error}</p>}
            </div>
          </div>

          <div className="rounded-3xl border border-white bg-white p-6 shadow-2xl shadow-blue-100/40">
            <p className="mb-3 text-xs font-black uppercase tracking-widest text-blue-400">Shop Location Map</p>
            <div className="overflow-hidden rounded-2xl border border-slate-200">
              <div ref={mapContainerRef} className="h-[520px] w-full" />
            </div>
            <p className="mt-3 text-xs font-semibold text-blue-700/70">Click map or drag marker to pin exact shop location.</p>
          </div>
        </div>

        <div className="mt-6 rounded-3xl border border-white bg-white p-6 shadow-2xl shadow-blue-100/40">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-black text-blue-900">Pinned Shops</h2>
            <span className="text-xs font-black uppercase tracking-widest text-blue-400">{shops.length} shops</span>
          </div>

          {loadingShops ? (
            <p className="text-sm font-semibold text-blue-600">Loading shops...</p>
          ) : shops.length === 0 ? (
            <p className="rounded-xl bg-slate-50 px-3 py-2 text-sm font-semibold text-blue-700/70">No pinned shop yet.</p>
          ) : (
            <div className="space-y-3">
              {shops.map((shop) => {
                const coords = shop.location?.coordinates;
                const lat = Array.isArray(coords) && coords.length >= 2 ? coords[1] : null;
                const lng = Array.isArray(coords) && coords.length >= 2 ? coords[0] : null;
                const isEditing = editingShopId === shop._id;

                return (
                  <div key={shop._id} className="rounded-2xl border border-slate-100 p-4">
                    {isEditing ? (
                      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                        <input value={editShopName} onChange={(e) => setEditShopName(e.target.value)} placeholder="Shop Name" className="rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-blue-500" />
                        <input value={editLabel} onChange={(e) => setEditLabel(e.target.value)} placeholder="Label" className="rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-blue-500" />
                        <input value={editPhoneNumber} onChange={(e) => setEditPhoneNumber(e.target.value)} placeholder="Phone Number" className="rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-blue-500" />
                        <input value={editPhotoImage} onChange={(e) => setEditPhotoImage(e.target.value)} placeholder="Photo URL/Base64" className="rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-blue-500" />
                        <input value={editLatitude} onChange={(e) => setEditLatitude(e.target.value)} placeholder="Latitude" className="rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-blue-500" />
                        <input value={editLongitude} onChange={(e) => setEditLongitude(e.target.value)} placeholder="Longitude" className="rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-blue-500" />
                        <div className="md:col-span-2 flex gap-2 pt-1">
                          <button
                            onClick={() => saveEditShop(shop._id)}
                            disabled={updatingShopId === shop._id}
                            className="rounded-xl bg-blue-600 px-3 py-2 text-xs font-black uppercase tracking-widest text-white hover:bg-blue-700 disabled:opacity-50"
                          >
                            {updatingShopId === shop._id ? "Saving..." : "Save"}
                          </button>
                          <button
                            onClick={() => setEditingShopId(null)}
                            className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-black uppercase tracking-widest text-blue-700 hover:bg-slate-50"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-black text-blue-900">{shop.shopName || shop.label || "Laundry Shop"}</p>
                          <p className="text-xs font-semibold text-blue-600">Label: {shop.label || "-"}</p>
                          <p className="text-xs font-semibold text-blue-600">Phone: {shop.phoneNumber || "-"}</p>
                          <p className="text-xs font-semibold text-blue-500">{lat != null && lng != null ? `${lat}, ${lng}` : "-"}</p>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => startEditShop(shop)} className="rounded-xl border border-blue-200 px-3 py-2 text-xs font-black uppercase tracking-widest text-blue-700 hover:bg-blue-50">Edit</button>
                          <button
                            onClick={() => deleteShop(shop._id)}
                            disabled={deletingShopId === shop._id}
                            className="rounded-xl border border-rose-200 px-3 py-2 text-xs font-black uppercase tracking-widest text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                          >
                            {deletingShopId === shop._id ? "Deleting..." : "Delete"}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
