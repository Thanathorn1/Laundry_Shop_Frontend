"use client";

import { useEffect, useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { apiFetch } from "@/lib/api";
import "leaflet/dist/leaflet.css";

// Dynamically import Leaflet components to avoid SSR issues
const MapContainer = dynamic(
  () => import("react-leaflet").then((mod) => mod.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import("react-leaflet").then((mod) => mod.TileLayer),
  { ssr: false }
);
const Marker = dynamic(
  () => import("react-leaflet").then((mod) => mod.Marker),
  { ssr: false }
);
const MapEvents = dynamic(
  () => import("react-leaflet").then((mod) => {
    const { useMapEvents } = mod;
    return function MapEvents({ onClick }: { onClick: (lat: number, lng: number) => void }) {
      useMapEvents({
        click(e) {
          onClick(e.latlng.lat, e.latlng.lng);
        },
      });
      return null;
    };
  }),
  { ssr: false }
);

type Shop = {
  _id: string;
  name: string;
  latitude: number;
  longitude: number;
};

export default function PinShopPage() {
  const [shops, setShops] = useState<Shop[]>([]);
  const [name, setName] = useState("");
  const [lat, setLat] = useState<number | "">("");
  const [lng, setLng] = useState<number | "">("");
  const [loading, setLoading] = useState(true);
  const [L, setL] = useState<any>(null);

  useEffect(() => {
    // Load Leaflet for icons
    import("leaflet").then((leaflet) => {
      setL(leaflet.default);
    });
    loadShops();
  }, []);

  const loadShops = async () => {
    try {
      const data = (await apiFetch("/shops")) as Shop[];
      setShops(data);
    } catch (e) {
      console.error("Failed to load shops:", e);
    } finally {
      setLoading(false);
    }
  };

  const customIcon = useMemo(() => {
    if (!L) return null;
    return new L.Icon({
      iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
      iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
      shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41],
    });
  }, [L]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || lat === "" || lng === "") return;

    try {
      await apiFetch("/shops", {
        method: "POST",
        body: JSON.stringify({ name, latitude: lat, longitude: lng }),
      });
      setName("");
      setLat("");
      setLng("");
      loadShops();
    } catch (err) {
      alert("Failed to save shop");
    }
  };

  const deleteShop = async (id: string) => {
    if (!confirm("Delete this shop?")) return;
    try {
      await apiFetch(`/shops/${id}`, { method: "DELETE" });
      loadShops();
    } catch (err) {
      alert("Failed to delete shop");
    }
  };

  const handleMapClick = (latitude: number, longitude: number) => {
    setLat(latitude);
    setLng(longitude);
  };

  return (
    <main className="flex-1 p-12 overflow-y-auto">
      <header className="mb-12">
        <h1 className="text-4xl font-black text-blue-900 tracking-tight mb-2 uppercase">Shop Location Config</h1>
        <p className="text-blue-700/60 font-bold uppercase tracking-widest text-[10px]">Pin and manage physical shop locations on the map.</p>
      </header>

      <div className="flex flex-col xl:flex-row gap-8">
        {/* Form Section */}
        <div className="w-full xl:w-96 shrink-0 order-2 xl:order-1">
          <div className="bg-white rounded-[2.5rem] p-8 shadow-2xl shadow-blue-100/50 border border-white sticky top-12">
            <h2 className="text-xl font-black text-blue-900 mb-6 flex items-center gap-2">
              <span className="text-2xl">➕</span> Add New Shop
            </h2>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="text-[10px] font-black text-blue-300 uppercase tracking-widest block mb-2 px-1">Shop Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-50 border-none rounded-2xl px-5 py-3.5 text-sm font-bold text-blue-900 focus:ring-2 focus:ring-blue-100 placeholder:text-slate-300 transition-all"
                  placeholder="e.g. Main Branch"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-blue-300 uppercase tracking-widest block mb-2 px-1">Latitude</label>
                  <input
                    type="number"
                    step="any"
                    value={lat}
                    onChange={(e) => setLat(e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-full bg-slate-50 border-none rounded-2xl px-5 py-3.5 text-sm font-bold text-blue-900 focus:ring-2 focus:ring-blue-100 placeholder:text-slate-300 transition-all"
                    placeholder="0.0000"
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-blue-300 uppercase tracking-widest block mb-2 px-1">Longitude</label>
                  <input
                    type="number"
                    step="any"
                    value={lng}
                    onChange={(e) => setLng(e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-full bg-slate-50 border-none rounded-2xl px-5 py-3.5 text-sm font-bold text-blue-900 focus:ring-2 focus:ring-blue-100 placeholder:text-slate-300 transition-all"
                    placeholder="0.0000"
                    required
                  />
                </div>
              </div>

              <p className="text-[9px] text-blue-400 font-bold uppercase tracking-widest px-1">Tip: Click on the map to set coordinates automatically.</p>

              <button
                type="submit"
                className="w-full bg-blue-600 text-white rounded-2xl py-4 flex items-center justify-center gap-3 font-black text-[11px] uppercase tracking-[0.2em] shadow-xl shadow-blue-200 hover:bg-blue-700 hover:-translate-y-0.5 transition-all mt-4"
              >
                <span>🚀</span> Register Shop
              </button>
            </form>

            <div className="mt-12 pt-8 border-t border-slate-100">
              <h3 className="text-xs font-black text-blue-900 uppercase tracking-widest mb-4">Existing Shops</h3>
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                {shops.map(shop => (
                  <div key={shop._id} className="group bg-slate-50 rounded-2xl p-4 flex items-center justify-between hover:bg-white hover:shadow-lg hover:shadow-blue-900/5 transition-all border border-transparent hover:border-slate-100">
                    <div>
                      <p className="text-xs font-black text-blue-900">{shop.name}</p>
                      <p className="text-[9px] font-bold text-blue-300 uppercase tracking-tighter mt-0.5">{shop.latitude.toFixed(4)}, {shop.longitude.toFixed(4)}</p>
                    </div>
                    <button
                      onClick={() => deleteShop(shop._id)}
                      className="h-8 w-8 rounded-xl bg-white text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-all flex items-center justify-center text-xs shadow-sm opacity-0 group-hover:opacity-100"
                    >
                      🗑️
                    </button>
                  </div>
                ))}
                {shops.length === 0 && !loading && (
                  <p className="text-[10px] text-blue-300 font-bold uppercase italic p-4 text-center">No shops registered yet.</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Map Section */}
        <div className="flex-1 order-1 xl:order-2 h-[500px] xl:h-[800px] bg-slate-100 rounded-[3rem] overflow-hidden shadow-2xl shadow-blue-100/50 border-[10px] border-white relative z-0">
          {!loading ? (
            <MapContainer
              center={[13.7563, 100.5018]}
              zoom={10}
              style={{ height: "100%", width: "100%" }}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              />
              <MapEvents onClick={handleMapClick} />
              {shops.map((shop) => (
                customIcon && (
                  <Marker
                    key={shop._id}
                    position={[shop.latitude, shop.longitude]}
                    icon={customIcon}
                  />
                )
              ))}
              {lat !== "" && lng !== "" && customIcon && (
                <Marker position={[lat as number, lng as number]} icon={customIcon} />
              )}
            </MapContainer>
          ) : (
            <div className="h-full w-full flex flex-col items-center justify-center gap-4 bg-slate-50">
              <div className="h-12 w-12 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"></div>
              <p className="text-[10px] font-black text-blue-300 uppercase tracking-widest animate-pulse">Initializing Map Engine...</p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
