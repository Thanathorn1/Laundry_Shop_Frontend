"use client";

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { apiFetch, API_BASE_URL } from '@/lib/api';
import {
  Search,
  Map as MapIcon,
  Filter,
  Navigation,
  Phone,
  Store,
  Clock,
  ChevronRight,
  Info,
  CheckCircle2,
  AlertCircle,
  Loader
} from 'lucide-react';

type Shop = {
  _id: string;
  shopName?: string;
  label?: string;
  phoneNumber?: string;
  photoImage?: string;
  createdAt?: string;
  distanceKm?: number;
  location?: { coordinates: number[] };
};

type MyEmployeeProfile = {
  _id: string;
  assignedShopId?: string | null;
  assignedShopIds?: string[];
  joinRequestShopId?: string | null;
  joinRequestStatus?: 'none' | 'pending' | 'rejected';
};

type LeafletMarker = {
  addTo: (map: LeafletMap) => LeafletMarker;
  bindPopup: (content: string) => LeafletMarker;
  openPopup: () => LeafletMarker;
  remove: () => void;
};

type LeafletMap = {
  setView: (center: [number, number], zoom: number) => void;
  invalidateSize: () => void;
  remove: () => void;
};

type LeafletLib = {
  map: (container: HTMLElement, options: { center: [number, number]; zoom: number }) => LeafletMap;
  tileLayer: (url: string, options: { maxZoom: number }) => { addTo: (map: LeafletMap) => void };
  marker: (latLng: [number, number]) => LeafletMarker;
};

async function loadLeaflet() {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { L?: LeafletLib };
  if (w.L) return w.L;

  if (!document.querySelector('link[data-leaflet="true"]')) {
    const css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    css.setAttribute('data-leaflet', 'true');
    document.head.appendChild(css);
  }

  await new Promise<void>((resolve, reject) => {
    const existing = document.querySelector('script[data-leaflet="true"]') as HTMLScriptElement | null;
    if (existing) {
      if ((window as unknown as { L?: LeafletLib }).L) {
        resolve();
        return;
      }
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Failed to load leaflet')));
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.async = true;
    script.setAttribute('data-leaflet', 'true');
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load leaflet'));
    document.body.appendChild(script);
  });

  return (window as unknown as { L?: LeafletLib }).L ?? null;
}

const BACKEND_BASE_URL = API_BASE_URL.replace(/\/api$/, '');

function toImageSrc(input?: string) {
  if (!input) return '';
  if (input.startsWith('http://') || input.startsWith('https://') || input.startsWith('data:image/')) {
    return input;
  }
  if (input.startsWith('/')) {
    return `${BACKEND_BASE_URL}${input}`;
  }
  return input;
}

export default function EmployeePage() {
  const [shops, setShops] = useState<Shop[]>([]);
  const [search, setSearch] = useState('');
  const [sortMode, setSortMode] = useState<'alpha-asc' | 'alpha-desc' | 'newest' | 'oldest'>('alpha-asc');
  const [me, setMe] = useState<MyEmployeeProfile | null>(null);
  const [requestingShopId, setRequestingShopId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const leafletRef = useRef<LeafletLib | null>(null);
  const markersRef = useRef<LeafletMarker[]>([]);
  const markerByShopIdRef = useRef<Record<string, LeafletMarker>>({});

  const isMemberOfShop = (shopId: string) => {
    if (!me || !shopId) return false;
    if (me.assignedShopId && String(me.assignedShopId) === String(shopId)) return true;
    return Array.isArray(me.assignedShopIds) && me.assignedShopIds.map(String).includes(String(shopId));
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const meData = (await apiFetch('/customers/me')) as MyEmployeeProfile;
        setMe(meData);

        let endpoint = '/employee/shops/nearby?maxDistanceKm=12';

        try {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: true,
              timeout: 8000,
              maximumAge: 60000,
            });
          });

          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          endpoint = `/employee/shops/nearby?lat=${lat}&lng=${lng}&maxDistanceKm=12`;
        } catch {
          // Fallback
        }

        const data = await apiFetch(endpoint);
        setShops(Array.isArray(data) ? data : []);
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Failed to load shops';
        setError(msg);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const requestJoinShop = async (shopId: string) => {
    try {
      setRequestingShopId(shopId);
      setError(null);
      await apiFetch(`/employee/shops/${shopId}/join-request`, { method: 'POST' });
      const meData = (await apiFetch('/customers/me')) as MyEmployeeProfile;
      setMe(meData);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to request shop join');
    } finally {
      setRequestingShopId(null);
    }
  };

  const filteredShops = shops
    .filter((shop) => {
      const q = search.trim().toLowerCase();
      if (!q) return true;
      const name = (shop.shopName || shop.label || '').toLowerCase();
      return name.includes(q);
    })
    .sort((a, b) => {
      const aName = a.shopName || a.label || '';
      const bName = b.shopName || b.label || '';
      if (sortMode === 'alpha-asc') return aName.localeCompare(bName);
      if (sortMode === 'alpha-desc') return bName.localeCompare(aName);
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      if (sortMode === 'newest') return bTime - aTime;
      return aTime - bTime;
    });

  const focusShopOnMap = (shop: Shop) => {
    const coords = shop.location?.coordinates;
    if (!mapRef.current || !Array.isArray(coords) || coords.length < 2) return;
    mapRef.current.setView([coords[1], coords[0]], 15);
    const marker = markerByShopIdRef.current[shop._id];
    marker?.openPopup();
  };

  useEffect(() => {
    let mounted = true;
    const setup = async () => {
      const L = await loadLeaflet();
      if (!mounted || !L || !mapContainerRef.current || mapRef.current) return;
      leafletRef.current = L;
      const map = L.map(mapContainerRef.current, { center: [13.7563, 100.5018], zoom: 12 });
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);
      mapRef.current = map;
      setTimeout(() => map.invalidateSize(), 50);
    };
    setup();
    return () => {
      mounted = false;
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const L = leafletRef.current;
    if (!map || !L) return;
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];
    markerByShopIdRef.current = {};
    shops.forEach((shop) => {
      const coords = shop.location?.coordinates;
      if (!Array.isArray(coords) || coords.length < 2) return;
      const name = shop.shopName || shop.label || 'Laundry Shop';
      const imageSrc = toImageSrc(shop.photoImage);
      const marker = L.marker([coords[1], coords[0]])
        .bindPopup(
          `<div style="min-width:180px"><div style="font-weight:700;margin-bottom:6px">${name}</div>${imageSrc
            ? `<img src="${imageSrc}" alt="${name}" style="width:100%;height:96px;object-fit:cover;border-radius:8px;margin-bottom:6px" onerror="this.style.display='none'" />`
            : ''
          }<div style="font-size:12px;color:#475569">${shop.phoneNumber || '-'}</div></div>`,
        )
        .addTo(map);
      markersRef.current.push(marker);
      markerByShopIdRef.current[shop._id] = marker;
    });
    const first = shops.find((s) => Array.isArray(s.location?.coordinates) && s.location!.coordinates.length >= 2);
    if (first?.location?.coordinates) {
      map.setView([first.location.coordinates[1], first.location.coordinates[0]], 14);
    }
  }, [shops]);

  return (
    <div className="min-h-screen bg-grid-pattern pb-20 pt-8 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl animate-blur-in">
        {/* Header Section */}
        <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6 px-4">
          <div className="space-y-1">
            <h1 className="text-4xl font-black text-blue-900 tracking-tight text-glow">
              Service <span className="text-blue-600">Hub</span>
            </h1>
            <p className="text-blue-700/60 font-medium max-w-lg">
              Manage your assigned shops and discover new service opportunities nearby.
            </p>
          </div>

          <div className="flex items-center gap-3 glass-morphism px-5 py-3 rounded-2xl border border-white/40 shadow-soft">
            <div className="h-2 w-2 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-xs font-black text-blue-900 uppercase tracking-widest">Network Online</span>
          </div>
        </header>

        {/* Search & Tool Bar */}
        <div className="glass-deep mb-8 p-4 rounded-[2rem] shadow-premium border border-white/40 flex flex-wrap items-center gap-4 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
          <div className="relative flex-1 min-w-[300px] group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-hover:text-blue-500 transition-colors" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by shop name or location..."
              className="w-full rounded-xl border border-slate-100 bg-white/50 pl-12 pr-4 py-3 text-sm font-bold focus:border-blue-500 focus:bg-white outline-none focus:ring-4 focus:ring-blue-500/5 transition-all"
            />
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-xl border border-slate-100">
              <Filter className="h-4 w-4 text-slate-400" />
              <select
                value={sortMode}
                onChange={(e) => setSortMode(e.target.value as any)}
                className="bg-transparent text-xs font-black text-blue-900 uppercase tracking-tight outline-none cursor-pointer"
              >
                <option value="alpha-asc">Name (A-Z)</option>
                <option value="alpha-desc">Name (Z-A)</option>
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
              </select>
            </div>

            <button
              onClick={() => window.location.reload()}
              className="p-3 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 transition-all border border-blue-100 shadow-sm"
            >
              <Clock className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 outline-none">
          {/* Main Content: Shop Grid */}
          <div className="lg:col-span-12 xl:col-span-8 space-y-6">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 animate-pulse">
                <Loader className="h-10 w-10 text-blue-600 animate-spin mb-4" />
                <p className="text-sm font-black text-slate-400 uppercase tracking-widest">Scanning local network...</p>
              </div>
            ) : error ? (
              <div className="glass-deep rounded-[2rem] p-8 border border-rose-100 bg-rose-50/30 text-center animate-shake">
                <AlertCircle className="h-12 w-12 text-rose-500 mx-auto mb-4" />
                <h3 className="text-lg font-black text-rose-900 mb-2">Network Error</h3>
                <p className="text-sm text-rose-700 font-medium mb-6">{error}</p>
                <button onClick={() => window.location.reload()} className="px-6 py-3 bg-rose-600 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-rose-200">Retry Connection</button>
              </div>
            ) : filteredShops.length === 0 ? (
              <div className="glass-deep rounded-[2rem] p-20 text-center border border-white/40">
                <Store className="h-16 w-16 text-slate-200 mx-auto mb-6" />
                <h3 className="text-xl font-black text-blue-900 mb-1">No Shops Found</h3>
                <p className="text-sm font-medium text-slate-400">Try adjusting your search or filters.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {filteredShops.map((shop, idx) => {
                  const isMember = isMemberOfShop(shop._id);
                  const isPending = me?.joinRequestStatus === 'pending' && me?.joinRequestShopId === shop._id;

                  return (
                    <div
                      key={shop._id}
                      onClick={() => focusShopOnMap(shop)}
                      className="glass-deep rounded-[2rem] p-6 border border-white/40 shadow-premium hover:shadow-2xl transition-all group cursor-pointer animate-fade-in-up"
                      style={{ animationDelay: `${0.1 + idx * 0.05}s` }}
                    >
                      <div className="relative aspect-[16/9] w-full overflow-hidden rounded-2xl mb-5 shadow-inner">
                        {toImageSrc(shop.photoImage) ? (
                          <Image
                            src={toImageSrc(shop.photoImage)}
                            alt={shop.shopName || 'Shop'}
                            fill
                            className="object-cover transition-transform duration-700 group-hover:scale-110"
                            sizes="(max-width: 768px) 100vw, 50vw"
                          />
                        ) : (
                          <div className="w-full h-full bg-slate-50 flex flex-col items-center justify-center gap-2">
                            <Store className="h-10 w-10 text-slate-200" />
                            <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">No Visuals Provided</span>
                          </div>
                        )}
                        <div className="absolute top-4 left-4 z-10">
                          <div className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 shadow-sm border border-white/60 ${shop.distanceKm && shop.distanceKm < 5 ? 'bg-emerald-400 text-emerald-950' : 'bg-white/80 text-blue-900'
                            }`}>
                            <Navigation className="h-3 w-3" />
                            {shop.distanceKm != null ? `${shop.distanceKm.toFixed(1)} KM` : 'Fixed Point'}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <h3 className="text-lg font-black text-blue-900 group-hover:text-blue-600 transition-colors uppercase tracking-tight truncate">
                            {shop.shopName || shop.label || 'Elite Cleaners'}
                          </h3>
                          <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                            <Phone className="h-3 w-3" />
                            {shop.phoneNumber || 'Unlisted'}
                          </div>
                        </div>

                        <div className="pt-2">
                          {isMember ? (
                            <Link
                              href={`/employee/shop/${shop._id}`}
                              onClick={(e) => e.stopPropagation()}
                              className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all hover:translate-y-[-2px] active:translate-y-0"
                            >
                              Open Operation Deck
                              <ChevronRight className="h-4 w-4" />
                            </Link>
                          ) : isPending ? (
                            <div className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-amber-50 text-amber-700 text-[10px] font-black uppercase tracking-widest border border-amber-100">
                              <Clock className="h-4 w-4 animate-spin-slow" />
                              Verification Pending
                            </div>
                          ) : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                requestJoinShop(shop._id);
                              }}
                              disabled={requestingShopId === shop._id}
                              className="w-full group/btn relative overflow-hidden flex items-center justify-center gap-2 py-4 rounded-xl border-2 border-blue-600 text-blue-600 text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all disabled:opacity-50"
                            >
                              {requestingShopId === shop._id ? 'Securing Link...' : 'Request Access'}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Column: Mini Map & Stats */}
          <div className="lg:col-span-12 xl:col-span-4 space-y-6">
            <div className="glass-deep rounded-[2.5rem] p-6 shadow-premium border border-white/40 sticky top-28 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <MapIcon className="h-5 w-5 text-blue-600" />
                  <h3 className="text-lg font-black text-blue-900">Coverage Map</h3>
                </div>
                <div className="h-8 w-8 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600">
                  <span className="text-[10px] font-black uppercase">{shops.length}</span>
                </div>
              </div>

              <div className="rounded-[2rem] border-4 border-white overflow-hidden shadow-2xl relative z-0 aspect-square xl:aspect-auto xl:h-[400px]">
                <div ref={mapContainerRef} className="h-full w-full" />
              </div>

              <div className="mt-6 flex flex-col gap-3">
                <div className="glass-frost p-4 rounded-2xl border border-white/60">
                  <div className="flex items-center gap-3 mb-2">
                    <Info className="h-4 w-4 text-blue-500" />
                    <span className="text-[10px] font-black text-blue-900 uppercase tracking-widest">Operator Note</span>
                  </div>
                  <p className="text-[11px] font-medium text-blue-700/60 leading-relaxed">
                    Nearby shops are sorted by proximity. Join a shop to begin handling laundry tasks and tracking progress.
                  </p>
                </div>

                <div className="bg-blue-600/5 p-4 rounded-2xl border border-blue-100 flex items-center justify-between">
                  <span className="text-[10px] font-black text-blue-900 uppercase tracking-widest">Assigned Units</span>
                  <div className="flex -space-x-2">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="h-6 w-6 rounded-full border-2 border-white bg-blue-100 flex items-center justify-center text-[10px] font-bold text-blue-600">
                        {i}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
