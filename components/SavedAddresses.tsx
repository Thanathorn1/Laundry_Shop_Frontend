"use client";

import React, { useState, useEffect, useRef, useCallback, FormEvent } from "react";
import {
  MapPin,
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle,
  Loader,
  Navigation,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import BottomSheet from "./BottomSheet";

interface SavedAddress {
  _id?: string;
  id?: string;
  label: string;
  address: string;
  latitude?: number;
  longitude?: number;
  location?: {
    type: string;
    coordinates: number[];
  };
  isDefault: boolean;
}

function getId(addr: SavedAddress): string {
  return addr._id || addr.id || '';
}

function getCoords(addr: SavedAddress): { lat: number; lng: number } | null {
  if (typeof addr.latitude === 'number' && typeof addr.longitude === 'number') {
    return { lat: addr.latitude, lng: addr.longitude };
  }
  if (addr.location?.coordinates && addr.location.coordinates.length >= 2) {
    return { lat: addr.location.coordinates[1], lng: addr.location.coordinates[0] };
  }
  return null;
}

type LatLng = { lat: number; lng: number };

type LeafletMarker = {
  addTo: (map: LeafletMap) => LeafletMarker;
  on: (event: string, handler: () => void) => void;
  getLatLng: () => LatLng;
  setLatLng: (latLng: LatLng) => void;
  remove: () => void;
};

type LeafletMap = {
  on: (event: string, handler: (event: { latlng: LatLng }) => void) => void;
  panTo: (latLng: [number, number]) => void;
  remove: () => void;
  invalidateSize: () => void;
};

type LeafletLib = {
  map: (container: HTMLElement, options: { center: [number, number]; zoom: number }) => LeafletMap;
  tileLayer: (url: string, options: { maxZoom: number; attribution: string }) => { addTo: (map: LeafletMap) => void };
  marker: (latLng: [number, number], options: { draggable: boolean }) => LeafletMarker;
};

const DEFAULT_CENTER = { lat: 13.7563, lng: 100.5018 };

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
    const existingScript = document.querySelector('script[data-leaflet="true"]') as HTMLScriptElement | null;
    if (existingScript) {
      if ((window as unknown as { L?: LeafletLib }).L) {
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

export default function SavedAddresses() {
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formStatus, setFormStatus] =
    useState<"idle" | "loading" | "success" | "error">("idle");
  const [formError, setFormError] = useState<string | null>(null);

  // Form state
  const [label, setLabel] = useState("");
  const [address, setAddress] = useState("");
  const [lat, setLat] = useState(String(DEFAULT_CENTER.lat));
  const [lng, setLng] = useState(String(DEFAULT_CENTER.lng));
  const [isDefault, setIsDefault] = useState(false);

  // Map refs
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<LeafletMap | null>(null);
  const markerRef = useRef<LeafletMarker | null>(null);

  useEffect(() => {
    fetchAddresses();
  }, []);

  const fetchAddresses = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await apiFetch("/customers/saved-addresses");
      setAddresses(data.addresses || []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load addresses"
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Initialize map when bottom sheet opens
  const initMap = useCallback(async () => {
    // Small delay to ensure DOM is ready inside BottomSheet
    await new Promise((r) => setTimeout(r, 200));

    if (!mapContainerRef.current || mapInstanceRef.current) return;

    try {
      const L = await loadLeaflet();
      if (!L || !mapContainerRef.current) return;

      const initialLat = Number(lat) || DEFAULT_CENTER.lat;
      const initialLng = Number(lng) || DEFAULT_CENTER.lng;

      const map = L.map(mapContainerRef.current, {
        center: [initialLat, initialLng],
        zoom: 15,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap',
      }).addTo(map);

      const marker = L.marker([initialLat, initialLng], { draggable: true }).addTo(map);

      marker.on("dragend", () => {
        const point = marker.getLatLng();
        setLat(String(point.lat));
        setLng(String(point.lng));
      });

      map.on("click", (event: { latlng: LatLng }) => {
        const point = event.latlng;
        marker.setLatLng(point);
        setLat(String(point.lat));
        setLng(String(point.lng));
      });

      mapInstanceRef.current = map;
      markerRef.current = marker;

      // Fix map rendering inside BottomSheet
      setTimeout(() => map.invalidateSize(), 300);
    } catch {
      // Map loading failed silently
    }
  }, [lat, lng]);

  // Setup / teardown map on bottom sheet open/close
  useEffect(() => {
    if (showAddForm) {
      initMap();
    } else {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markerRef.current = null;
      }
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showAddForm]);

  const useCurrentLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const newLat = position.coords.latitude;
        const newLng = position.coords.longitude;
        setLat(String(newLat));
        setLng(String(newLng));
        if (markerRef.current && mapInstanceRef.current) {
          markerRef.current.setLatLng({ lat: newLat, lng: newLng });
          mapInstanceRef.current.panTo([newLat, newLng]);
        }
      },
      () => {
        setFormError("ไม่สามารถเข้าถึงตำแหน่งของคุณได้ กรุณาอนุญาตการเข้าถึงตำแหน่ง");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleAddAddress = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(null);

    if (!label.trim() || !address.trim() || !lat.trim() || !lng.trim()) {
      setFormError("Please fill in all fields");
      return;
    }

    try {
      setFormStatus("loading");
      const newAddress = await apiFetch("/customers/saved-addresses", {
        method: "POST",
        body: JSON.stringify({
          label: label.trim(),
          address: address.trim(),
          latitude: parseFloat(lat),
          longitude: parseFloat(lng),
          isDefault,
        }),
      });

      setAddresses([...addresses, newAddress]);
      setLabel("");
      setAddress("");
      setLat(String(DEFAULT_CENTER.lat));
      setLng(String(DEFAULT_CENTER.lng));
      setIsDefault(false);
      setFormStatus("success");
      setTimeout(() => {
        setShowAddForm(false);
        setFormStatus("idle");
      }, 1500);
    } catch (err) {
      setFormStatus("error");
      setFormError(
        err instanceof Error ? err.message : "Failed to add address"
      );
    }
  };

  const handleDeleteAddress = async (id: string) => {
    if (!confirm("Are you sure you want to delete this address?")) return;

    try {
      await apiFetch(`/customers/saved-addresses/${id}`, { method: "DELETE" });
      setAddresses(addresses.filter((addr) => getId(addr) !== id));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to delete address"
      );
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      await apiFetch(`/customers/saved-addresses/${id}/default`, {
        method: "PATCH",
      });
      setAddresses(
        addresses.map((addr) => ({
          ...addr,
          isDefault: getId(addr) === id,
        }))
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to set default address"
      );
    }
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="flex gap-3 rounded-lg bg-red-50 p-4">
          <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader size={24} className="animate-spin text-blue-600" />
        </div>
      ) : addresses.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center">
          <MapPin size={32} className="mx-auto mb-3 text-gray-400" />
          <p className="text-gray-600">No saved addresses yet</p>
          <p className="text-sm text-gray-500 mt-1">
            Add your first address to get started
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {addresses.map((addr, index) => (
            <div
              key={getId(addr) || index}
              className="rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-gray-900">{addr.label}</h3>
                    {addr.isDefault && (
                      <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-800">
                        Default
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 break-words">
                    {addr.address}
                  </p>
                  {(() => {
                    const coords = getCoords(addr);
                    return coords ? (
                      <p className="text-xs text-gray-500 mt-2">
                        📍 {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}
                      </p>
                    ) : null;
                  })()}
                </div>
                <button
                  onClick={() => handleDeleteAddress(getId(addr))}
                  className="text-red-600 hover:bg-red-50 p-2 rounded-lg transition-colors"
                  title="Delete address"
                >
                  <Trash2 size={18} />
                </button>
              </div>
              {!addr.isDefault && (
                <button
                  onClick={() => handleSetDefault(getId(addr))}
                  className="mt-3 text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  Set as default
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add Address Button */}
      <button
        onClick={() => setShowAddForm(true)}
        className="w-full rounded-lg border-2 border-blue-600 px-4 py-3 font-semibold text-blue-600 hover:bg-blue-50 transition-colors flex items-center justify-center gap-2"
      >
        <Plus size={20} />
        Add New Address
      </button>

      {/* Add Address Form Modal */}
      <BottomSheet
        isOpen={showAddForm}
        onClose={() => {
          setShowAddForm(false);
          setFormStatus("idle");
          setFormError(null);
        }}
        title="Add New Address"
      >
        {formStatus === "success" ? (
          <div className="flex flex-col items-center justify-center gap-4 py-8 text-center">
            <CheckCircle size={48} className="text-green-500" />
            <h3 className="text-lg font-semibold text-gray-900">
              Address Added
            </h3>
            <p className="text-sm text-gray-600">
              Your address has been saved successfully
            </p>
          </div>
        ) : (
          <form onSubmit={handleAddAddress} className="space-y-4">
            {formError && (
              <div className="flex gap-3 rounded-lg bg-red-50 p-3">
                <AlertCircle size={18} className="text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-red-700">{formError}</p>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-900">
                Label (Home, Work, etc.)
              </label>
              <input
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g., Home"
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm placeholder:text-gray-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-900">
                Address
              </label>
              <textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Enter your address"
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm placeholder:text-gray-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none"
                rows={2}
              />
            </div>

            {/* Map Picker */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-gray-900">
                  📍 Select Location on Map
                </label>
                <button
                  type="button"
                  onClick={useCurrentLocation}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition-colors"
                >
                  <Navigation size={14} />
                  Use Current Location
                </button>
              </div>
              <div
                ref={mapContainerRef}
                className="h-52 w-full rounded-xl border border-gray-200 overflow-hidden"
                style={{ zIndex: 0 }}
              />
              <p className="text-xs text-gray-500">
                Click on the map or drag the marker to select a location
              </p>
              <div className="flex gap-3 text-xs text-gray-600 bg-gray-50 rounded-lg px-3 py-2">
                <span>Lat: <strong>{Number(lat).toFixed(4)}</strong></span>
                <span>Lng: <strong>{Number(lng).toFixed(4)}</strong></span>
              </div>
            </div>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={isDefault}
                onChange={(e) => setIsDefault(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 accent-blue-600"
              />
              <span className="text-sm font-medium text-gray-700">
                Set as default address
              </span>
            </label>

            <button
              type="submit"
              disabled={formStatus === "loading"}
              className="w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white transition-colors hover:bg-blue-700 disabled:bg-gray-400 text-sm"
            >
              {formStatus === "loading" ? "Adding..." : "Add Address"}
            </button>
          </form>
        )}
      </BottomSheet>
    </div>
  );
}
