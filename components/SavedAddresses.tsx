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
  X,
  ChevronRight
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
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

import { loadLeaflet, LeafletLib, LeafletMap, LeafletMarker, LatLng } from "@/lib/leaflet-loader";

const DEFAULT_CENTER = { lat: 13.7563, lng: 100.5018 };

// Local loader removed

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
      setTimeout(() => map.invalidateSize(), 300);
    } catch {
      // Map loading failed silently
    }
  }, [lat, lng]);

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
  }, [showAddForm, initMap]);

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
        setFormError("Geolocation access denied. Please enable location services.");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleAddAddress = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(null);

    if (!label.trim() || !address.trim() || !lat.trim() || !lng.trim()) {
      setFormError("All navigational parameters must be defined.");
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
        err instanceof Error ? err.message : "Failed to synchronize address"
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
        err instanceof Error ? err.message : "Failed to purge address"
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
        err instanceof Error ? err.message : "Failed to update default status"
      );
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="h-10 w-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin shadow-glow" />
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-relaxed">Mapping Geodata...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <AnimatePresence>
        {addresses.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="rounded-[3rem] border-2 border-dashed border-slate-100  bg-slate-50 border-slate-100 p-16 text-center"
          >
            <div className="h-20 w-20 bg-white rounded-[2.5rem] flex items-center justify-center mx-auto mb-6 shadow-xl border border-slate-100">
              <MapPin size={40} className="text-slate-300" />
            </div>
            <h3 className="text-xl font-black text-slate-900  uppercase tracking-tight mb-2">No active nodes</h3>
            <p className="text-xs font-bold text-slate-400 max-w-[240px] mx-auto leading-relaxed">
              Synchronize your pickup and delivery parameters by adding your first spatial node.
            </p>
          </motion.div>
        ) : (
          <div className="grid gap-6">
            {addresses.map((addr, index) => (
              <motion.div
                key={getId(addr) || index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="group relative bg-white  border border-slate-100 rounded-[2.5rem] p-8 shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all duration-500 overflow-hidden"
              >
                {/* Status Indicator */}
                <div className={`absolute top-0 left-0 bottom-0 w-2 transition-colors duration-500 ${addr.isDefault ? 'bg-blue-600 shadow-[2px_0_15px_-3px_rgba(37,99,235,0.4)]' : 'bg-slate-100'}`} />

                <div className="flex items-start justify-between gap-6 ml-4">
                  <div className="flex-1 min-w-0 space-y-4">
                    <div className="flex items-center gap-3">
                      <div className={`h-10 w-10 rounded-2xl flex items-center justify-center transition-colors ${addr.isDefault ? 'bg-blue-600 text-white shadow-glow' : 'bg-slate-50 text-slate-400'}`}>
                        <MapPin size={18} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-black text-slate-900  uppercase tracking-widest truncate">{addr.label}</h3>
                          {addr.isDefault && (
                            <span className="text-[8px] font-black uppercase tracking-[0.2em] bg-blue-50 text-blue-600 px-3 py-1 rounded-full border border-blue-100 ">Operational</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <p className="text-xs font-bold text-slate-500  leading-relaxed pl-[3.25rem]">
                      {addr.address}
                    </p>

                    {(() => {
                      const coords = getCoords(addr);
                      return coords ? (
                        <div className="pl-[3.25rem] flex items-center gap-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                          <span className="bg-slate-100 px-2 py-1 rounded-lg border border-slate-200/50">Lat: {coords.lat.toFixed(4)}</span>
                          <span className="bg-slate-100 px-2 py-1 rounded-lg border border-slate-200/50">Lng: {coords.lng.toFixed(4)}</span>
                        </div>
                      ) : null;
                    })()}
                  </div>

                  <div className="flex items-center gap-2">
                    {!addr.isDefault && (
                      <button
                        onClick={() => handleSetDefault(getId(addr))}
                        className="p-3 text-slate-400 hover:text-blue-600 hover:bg-blue-50  rounded-2xl transition-all"
                        title="Set as operational default"
                      >
                        <Navigation size={18} />
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteAddress(getId(addr))}
                      className="p-3 text-slate-400 hover:text-rose-600 hover:bg-rose-50  rounded-2xl transition-all"
                      title="Purge address node"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </AnimatePresence>

      <button
        onClick={() => setShowAddForm(true)}
        className="group relative w-full overflow-hidden rounded-[2rem] bg-slate-900  text-white  px-8 py-5 text-sm font-black uppercase tracking-[0.2em] shadow-xl hover:shadow-2xl transition-all active:scale-95 flex items-center justify-center gap-4"
      >
        <Plus size={18} className="group-hover:rotate-90 transition-transform duration-500" />
        New Address Node
        <div className="absolute inset-0 bg-blue-600 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        <span className="relative z-10 flex items-center justify-center gap-4">
          <Plus size={18} className="group-hover:rotate-90 transition-transform duration-500" />
          New Address Node
        </span>
      </button>

      {/* Modern Bottom Sheet Overlay */}
      <AnimatePresence>
        {showAddForm && (
          <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center p-0 sm:p-4">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowAddForm(false)}
              className="absolute inset-0 bg-slate-950/70 backdrop-blur-md"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="relative w-full max-w-2xl bg-white  rounded-t-[3rem] sm:rounded-b-[3rem] overflow-hidden shadow-2xl border border-white/20"
            >
              <div className="p-6 sm:p-10 overflow-y-auto max-h-[85vh]">
                <div className="flex items-center justify-between mb-10">
                  <div className="space-y-1">
                    <h3 className="text-2xl font-black text-slate-900 tracking-tight uppercase italic">Add Node</h3>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-relaxed">Spatial Parameter Registration</p>
                  </div>
                  <X className="h-6 w-6 text-slate-400 cursor-pointer hover:text-slate-900 transition-colors" onClick={() => setShowAddForm(false)} />
                </div>

                {formStatus === "success" ? (
                  <div className="flex flex-col items-center justify-center gap-6 py-20 text-center">
                    <div className="h-20 w-20 bg-emerald-50  rounded-[2.5rem] flex items-center justify-center shadow-glow border border-emerald-100 ">
                      <CheckCircle size={40} className="text-emerald-500" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-xl font-black text-slate-900  uppercase tracking-tight">Synchronization Complete</h3>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Node registered successfully</p>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleAddAddress} className="space-y-8">
                    {formError && (
                      <div className="flex gap-4 rounded-[2rem] bg-rose-50  border border-rose-100  p-6 animate-shake">
                        <AlertCircle size={20} className="text-rose-600 flex-shrink-0" />
                        <p className="text-sm font-bold text-rose-700 ">{formError}</p>
                      </div>
                    )}

                    <div className="grid gap-6 sm:grid-cols-2">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Node Label</label>
                        <input
                          type="text"
                          value={label}
                          onChange={(e) => setLabel(e.target.value)}
                          placeholder="e.g. Headquarters"
                          className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm font-bold text-slate-900 outline-none focus:border-blue-500 focus:bg-white transition-all placeholder:text-slate-400"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Geospatial Type</label>
                        <div className="flex gap-2">
                          {['Home', 'Work', 'Other'].map((t) => (
                            <button
                              key={t}
                              type="button"
                              onClick={() => setLabel(t)}
                              className={`flex-1 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all ${label === t ? 'bg-blue-600 border-blue-600 text-white shadow-glow' : 'bg-slate-50  border-slate-200  text-slate-400 hover:border-slate-300'}`}
                            >
                              {t}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Physical Address</label>
                      <textarea
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="Street, building, floor, suite..."
                        className="w-full bg-slate-50 /50 border border-slate-200  rounded-2xl px-6 py-4 text-sm font-bold text-slate-900  outline-none focus:border-blue-500 focus:bg-white  transition-all placeholder:text-slate-400 resize-none"
                        rows={3}
                      />
                    </div>

                    {/* Enhanced Map Picker */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Spatial Mapping</label>
                        <button
                          type="button"
                          onClick={useCurrentLocation}
                          className="flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-emerald-50  text-emerald-600 border border-emerald-100  text-[10px] font-black uppercase tracking-widest hover:bg-emerald-100  transition-all shadow-sm"
                        >
                          <Navigation size={14} />
                          Live Coordinates
                        </button>
                      </div>
                      <div className="relative rounded-[2.5rem] border-4 border-slate-50 shadow-inner overflow-hidden group">
                        <div
                          ref={mapContainerRef}
                          className="h-64 w-full relative z-0"
                        />
                        <div className="absolute top-4 right-4 z-10 bg-white/90 backdrop-blur-md px-5 py-2.5 rounded-2xl border border-slate-200 shadow-xl flex gap-4 text-[9px] font-black uppercase tracking-[0.2em]">
                          <span className="text-slate-400">Lat <strong className="text-slate-900 ml-2">{Number(lat).toFixed(4)}</strong></span>
                          <span className="text-slate-400">Lng <strong className="text-slate-900 ml-2">{Number(lng).toFixed(4)}</strong></span>
                        </div>
                      </div>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em] italic text-center">Drag node marker or select point on grid</p>
                    </div>

                    <div className="flex items-center justify-between p-6 bg-slate-50 rounded-[2rem] border border-slate-100 ">
                      <div className="space-y-1">
                        <h4 className="text-xs font-black text-slate-900  uppercase tracking-widest">Primary Node</h4>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">Mark as operational default</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} className="sr-only peer" />
                        <div className="w-14 h-8 bg-slate-200  rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-1 after:left-1 after:bg-white after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-blue-600 shadow-inner" />
                      </label>
                    </div>

                    <button
                      type="submit"
                      disabled={formStatus === "loading"}
                      className="group relative w-full overflow-hidden rounded-[2rem] bg-blue-600 text-white px-8 py-5 text-sm font-black uppercase tracking-[0.2em] shadow-glow hover:shadow-premium transition-all active:scale-95 disabled:opacity-50"
                    >
                      <span className="relative z-10 flex items-center justify-center gap-3">
                        {formStatus === "loading" ? "Transmitting Geodata..." : "Register Node"}
                        {formStatus !== "loading" && <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />}
                      </span>
                    </button>
                  </form>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
