"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { apiFetch, API_BASE_URL } from '@/lib/api';
import { fetchRoadRoute } from '@/lib/road-route';
import 'leaflet/dist/leaflet.css';
import { io } from 'socket.io-client';

// Dynamically import Leaflet components to avoid SSR issues
const MapContainer = dynamic(
    () => import('react-leaflet').then((mod) => mod.MapContainer),
    { ssr: false }
);
const TileLayer = dynamic(
    () => import('react-leaflet').then((mod) => mod.TileLayer),
    { ssr: false }
);
const Marker = dynamic(
    () => import('react-leaflet').then((mod) => mod.Marker),
    { ssr: false }
);
const Popup = dynamic(
    () => import('react-leaflet').then((mod) => mod.Popup),
    { ssr: false }
);
const CircleMarker = dynamic(
    () => import('react-leaflet').then((mod) => mod.CircleMarker),
    { ssr: false }
);
const Polyline = dynamic(
    () => import('react-leaflet').then((mod) => mod.Polyline),
    { ssr: false }
);
const MapController = dynamic(
    () => import('react-leaflet').then((mod) => {
        const { useMap } = mod;
        return function MapController({ center, zoom, onMapReady }: {
            center: [number, number];
            zoom: number;
            onMapReady?: (map: any) => void;
        }) {
            const map = useMap();
            const readyFiredRef = useRef(false);
            useEffect(() => {
                if (!readyFiredRef.current && onMapReady) {
                    readyFiredRef.current = true;
                    onMapReady(map);
                }
            }, [map, onMapReady]);
            useEffect(() => {
                map.flyTo(center, zoom, { duration: 0.6 });
            }, [center, zoom, map]);
            return null;
        };
    }),
    { ssr: false }
);

interface Order {
    _id: string;
    customerName?: string;
    productName?: string;
    contactPhone?: string;
    description?: string;
    images?: string[];
    pickupAddress: string;
    deliveryAddress: string;
    status: string;
    totalPrice: number;
    pickupType?: 'now' | 'schedule';
    shopId?: string | null;
    pickupLocation?: { coordinates?: [number, number] };
    deliveryLocation?: { coordinates?: [number, number] };
    location?: {
        lat: number;
        lon: number;
    };
    distance?: number;
    createdAt?: string;
    updatedAt?: string;
}

type LaundryStatus =
    | 'pending'
    | 'assigned'
    | 'picked_up'
    | 'at_shop'
    | 'washing'
    | 'drying'
    | 'laundry_done'
    | 'out_for_delivery'
    | 'completed'
    | 'cancelled';

type Shop = {
    _id: string;
    shopName?: string;
    label?: string;
    phoneNumber?: string;
    photoImage?: string;
    totalWashingMachines?: number;
    totalDryingMachines?: number;
    machineSizeConfig?: {
        s?: number;
        m?: number;
        l?: number;
    };
    machineInUse?: number;
    machineAvailable?: number;
    dryMachineInUse?: number;
    dryMachineAvailable?: number;
    machineInUseS?: number;
    machineInUseM?: number;
    machineInUseL?: number;
    machineAvailableS?: number;
    machineAvailableM?: number;
    machineAvailableL?: number;
    location?: { coordinates: number[] };
};

/**
 * =============================================================================
 * ระบบเส้นทางบนแผนที่สำหรับไรเดอร์
 * =============================================================================
 * 
 * RouteLine เก็บข้อมูลเส้นทางสำหรับแต่ละออเดอร์:
 * - orderId: ใช้เป็น key สำหรับ React rendering
 * - points: array ของ [lat, lng] ที่ได้จาก fetchRoadRoute() 
 * - color: สีเส้นทางตามสถานะ (เขียว/ฟ้า/ม่วง ฯลฯ)
 * 
 * การแสดงผลบนแผนที่:
 * - ใช้ <Polyline positions={line.points} /> วาดเส้นบนแผนที่
 * - เส้นทางวาดจากตำแหน่งไรเดอร์ปัจจุบัน -> จุดหมายปลายทาง
 * - จุดหมายปลายทางมี pin อยู่แล้ว (ลูกค้า/ร้าน) ไม่ต้องเพิ่ม pin ใหม่
 * =============================================================================
 */
type RouteLine = {
    orderId: string;
    points: [number, number][];  // จุดพิกัดเส้นทางจาก OSRM
    color: string;               // สีตามสถานะออเดอร์
};

function getUserIdFromAccessToken(token: string | null) {
    try {
        if (!token) return null;
        const payloadBase64 = token.split('.')[1];
        if (!payloadBase64) return null;

        const normalized = payloadBase64.replace(/-/g, '+').replace(/_/g, '/');
        const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
        const parsed = JSON.parse(atob(padded)) as { sub?: string };
        return typeof parsed.sub === 'string' && parsed.sub.trim() ? parsed.sub.trim() : null;
    } catch {
        return null;
    }
}

function getRoleFromAccessToken(token: string | null) {
    try {
        if (!token) return null;
        const payloadBase64 = token.split('.')[1];
        if (!payloadBase64) return null;

        const normalized = payloadBase64.replace(/-/g, '+').replace(/_/g, '/');
        const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
        const parsed = JSON.parse(atob(padded)) as { role?: string };
        return typeof parsed.role === 'string' && parsed.role.trim() ? parsed.role.trim() : null;
    } catch {
        return null;
    }
}

function isUnauthorizedError(error: unknown) {
    if (!(error instanceof Error)) return false;
    const message = (error.message || '').toLowerCase();
    return message.includes('unauthorized') || message.includes('session expired') || message.includes('ล็อคอินใหม่');
}

export default function RiderDashboard() {
    const [isMapClientReady, setIsMapClientReady] = useState(false);
    const [isLeafletMapReady, setIsLeafletMapReady] = useState(false);
    const [availableOrders, setAvailableOrders] = useState<Order[]>([]);
    const [myTasks, setMyTasks] = useState<Order[]>([]);
    const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
    const [shops, setShops] = useState<Shop[]>([]);
    const [handoverShopByOrderId, setHandoverShopByOrderId] = useState<Record<string, string>>({});
    const [handoverReadyByOrderId, setHandoverReadyByOrderId] = useState<Record<string, boolean>>({});
    const [sendingAllByShopId, setSendingAllByShopId] = useState<Record<string, boolean>>({});
    const [pickingUpAllByShopId, setPickingUpAllByShopId] = useState<Record<string, boolean>>({});
    const [pickingUpAllLaundry, setPickingUpAllLaundry] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [authBlocked, setAuthBlocked] = useState(false);
    const [userLocation, setUserLocation] = useState<{ lat: number; lon: number } | null>(null);
    const locationInitializedRef = useRef(false);
    const mapInstanceRef = useRef<any>(null);
    const [maxDistance, setMaxDistance] = useState<number>(0);
    const [mapView, setMapView] = useState<{ center: [number, number], zoom: number }>({
        center: [13.7563, 100.5018], // Default Bangkok
        zoom: 13
    });
    const [taskRouteLines, setTaskRouteLines] = useState<RouteLine[]>([]);

    const [mobileSheetOpen, setMobileSheetOpen] = useState(false);

    const [openSections, setOpenSections] = useState({
        orders: true,
        shops: false,
        pickupAtShop: false,
        sendBack: false,
    });

    // Accordion helper: opening one section closes the other three
    const toggleSection = (key: keyof typeof openSections) => {
        setOpenSections((prev) => {
            const opening = !prev[key];
            // If opening, close everything else
            if (opening) {
                const next = { orders: false, shops: false, pickupAtShop: false, sendBack: false };
                next[key] = true;
                return next;
            }
            // If closing, just close this one
            return { ...prev, [key]: false };
        });
    };

    const [shopsAlert, setShopsAlert] = useState(false);
    const [pickupAtShopAlert, setPickupAtShopAlert] = useState(false);
    const [sendBackAlert, setSendBackAlert] = useState(false);
    const [zoomedImageUrl, setZoomedImageUrl] = useState<string | null>(null);
    const [zoomedImageAlt, setZoomedImageAlt] = useState<string>('Order image');

    // Shop search & sort state
    const [shopSearch, setShopSearch] = useState('');
    const [shopSortMode, setShopSortMode] = useState<'distance' | 'name-asc' | 'name-desc'>('distance');
    const [sendBackSortMode, setSendBackSortMode] = useState<'distance' | 'time'>('distance');
    const [activeSendBackOrderId, setActiveSendBackOrderId] = useState<string | null>(null);
    const [nearbyOrderSortMode, setNearbyOrderSortMode] = useState<'distance' | 'time' | 'price'>('distance');
    const [activeNearbyOrderId, setActiveNearbyOrderId] = useState<string | null>(null);
    const [activeNearbyShopId, setActiveNearbyShopId] = useState<string | null>(null);
    const [shopRoutePoints, setShopRoutePoints] = useState<[number, number][]>([]);
    const [pickupAtShopSortMode, setPickupAtShopSortMode] = useState<'distance' | 'time'>('distance');
    const [activePickupAtShopOrderId, setActivePickupAtShopOrderId] = useState<string | null>(null);

    const socketRef = useRef<ReturnType<typeof io> | null>(null);
    const refreshTimerRef = useRef<number | null>(null);
    const lastLocationSyncAtRef = useRef<number>(0);

    const ASSET_BASE_URL = useMemo(() => API_BASE_URL.replace(/\/api\/?$/, ''), []);

    const resolveAssetUrl = (value: string | undefined | null) => {
        if (!value) return '';
        if (value.startsWith('http')) return value;
        if (value.startsWith('data:') || value.startsWith('blob:')) return value;
        return `${ASSET_BASE_URL}${value.startsWith('/') ? value : `/${value}`}`;
    };

    const openImageZoom = (imageUrl: string | undefined | null, alt?: string) => {
        const resolved = resolveAssetUrl(imageUrl);
        if (!resolved) return;
        setZoomedImageUrl(resolved);
        setZoomedImageAlt(alt || 'Order image');
    };

    const closeImageZoom = () => {
        setZoomedImageUrl(null);
    };

    const [leaflet, setLeaflet] = useState<typeof import('leaflet') | null>(null);

    useEffect(() => {
        let active = true;
        import('leaflet')
            .then((mod) => {
                if (active) setLeaflet(mod);
            })
            .catch(() => {
                // ignore; map will still render without custom icons
            });
        return () => {
            active = false;
        };
    }, []);

    // Fix for Leaflet default icons in Next.js
    const icon = useMemo(() => {
        if (typeof window === 'undefined') return null;
        if (!leaflet) return null;
        return leaflet.icon({
            iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
            iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
            shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowSize: [41, 41]
        });
    }, [leaflet]);

    // Custom CSS-based rider icon (Blue dot with white border)
    const riderIcon = useMemo(() => {
        if (typeof window === 'undefined') return null;
        if (!leaflet) return null;
        return leaflet.divIcon({
            className: 'custom-rider-icon',
            html: `
                <div class="relative flex items-center justify-center">
                    <div class="absolute h-6 w-6 rounded-full bg-blue-500/20 animate-ping"></div>
                    <div class="h-4 w-4 rounded-full bg-blue-600 border-2 border-white shadow-lg ring-2 ring-blue-600/20"></div>
                </div>
            `,
            iconSize: [24, 24],
            iconAnchor: [12, 12],
        });
    }, [leaflet]);

    const shopIcon = useMemo(() => {
        if (typeof window === 'undefined') return null;
        if (!leaflet) return null;
        return leaflet.divIcon({
            className: 'custom-shop-icon',
            html: `
                <div style="width:34px;height:34px;background:#e11d48;border-radius:50%;border:2.5px solid white;box-shadow:0 2px 8px rgba(225,29,72,0.4);display:flex;align-items:center;justify-content:center">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="3"/><circle cx="12" cy="14" r="5"/><circle cx="12" cy="14" r="2"/><circle cx="7" cy="5.5" r="1" fill="white" stroke="none"/><circle cx="10" cy="5.5" r="1" fill="white" stroke="none"/><line x1="14" y1="5.5" x2="19" y2="5.5"/></svg>
                </div>
            `,
            iconSize: [34, 34],
            iconAnchor: [17, 17],
        });
    }, [leaflet]);

    useEffect(() => {
        const timer = window.setTimeout(() => {
            setIsMapClientReady(true);
        }, 0);

        return () => {
            window.clearTimeout(timer);
        };
    }, []);

    useEffect(() => {
        const token = localStorage.getItem('access_token');
        const roleFromStorage = localStorage.getItem('auth_role');
        const roleFromToken = getRoleFromAccessToken(token);

        const isRiderSession = Boolean(token) &&
            (
                roleFromStorage === 'rider' ||
                roleFromStorage === 'admin' ||
                (!roleFromStorage && (roleFromToken === 'rider' || roleFromToken === 'admin'))
            );

        if (!isRiderSession) {
            setAuthBlocked(true);
            setError('Unauthorized: please sign in with a rider or admin account.');
            setLoading(false);
            return;
        }

        fetchData();

        let watchId: number;
        if (navigator.geolocation) {
            watchId = navigator.geolocation.watchPosition(
                (position) => {
                    if (authBlocked) return;
                    const coords = {
                        lat: position.coords.latitude,
                        lon: position.coords.longitude
                    };
                    setUserLocation(coords);

                    const now = Date.now();
                    if (now - lastLocationSyncAtRef.current >= 5000) {
                        const token = localStorage.getItem('access_token');
                        const riderId = getUserIdFromAccessToken(token);
                        if (riderId) {
                            lastLocationSyncAtRef.current = now;
                            apiFetch('/rider/location', {
                                method: 'POST',
                                body: JSON.stringify({
                                    riderId,
                                    location: { lat: coords.lat, lng: coords.lon },
                                }),
                            }).catch(() => {
                                // ignore location sync errors
                            });
                        }
                    }

                    // Only auto-center on first GPS fix — use a ref to avoid stale-closure re-centering
                    if (!locationInitializedRef.current) {
                        locationInitializedRef.current = true;
                        setMapView({ center: [coords.lat, coords.lon], zoom: 13 });
                    }
                },
                (err) => {
                    if (err.code === err.PERMISSION_DENIED && watchId !== undefined) {
                        navigator.geolocation.clearWatch(watchId);
                    }
                    // Keep dashboard usable with default map center when geolocation is unavailable.
                },
                { enableHighAccuracy: true }
            );
        }

        return () => {
            if (watchId !== undefined) navigator.geolocation.clearWatch(watchId);
        };
    }, [authBlocked]);

    useEffect(() => {
        if (authBlocked) return;
        if (!API_BASE_URL) return;

        const token = localStorage.getItem('access_token');
        const userId = getUserIdFromAccessToken(token);
        if (!userId) return;

        const socketBaseUrl = API_BASE_URL.replace(/\/api\/?$/, '');
        const socket = io(socketBaseUrl, {
            transports: ['websocket'],
        });
        socketRef.current = socket;

        socket.on('connect', () => {
            socket.emit('register', { userId, role: 'rider' });
        });

        socket.on('order:update', (order: any) => {
            const status = typeof order?.status === 'string' ? order.status : '';

            if (status === 'laundry_done') {
                setPickupAtShopAlert(true);
            }
            if (status === 'out_for_delivery') {
                setSendBackAlert(true);
            }

            if (refreshTimerRef.current) {
                window.clearTimeout(refreshTimerRef.current);
            }
            refreshTimerRef.current = window.setTimeout(() => {
                void refreshRiderData();
            }, 300);
        });

        return () => {
            if (refreshTimerRef.current) {
                window.clearTimeout(refreshTimerRef.current);
                refreshTimerRef.current = null;
            }
            socket.off('order:update');
            socket.disconnect();
            socketRef.current = null;
        };
    }, [authBlocked]);

    // Polling fallback: re-fetch every 5 seconds so data stays fresh even if WebSocket drops
    useEffect(() => {
        if (authBlocked) return;
        const interval = setInterval(() => {
            void refreshRiderData();
        }, 5000);
        return () => clearInterval(interval);
    }, [authBlocked]);

    const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
        const R = 6371;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    };

    const statusLabel = (statusRaw: string | undefined) => {
        const status = (statusRaw || '') as LaundryStatus;
        switch (status) {
            case 'pending':
                return 'available';
            case 'assigned':
                return 'assigned';
            case 'picked_up':
                return 'picked up';
            case 'at_shop':
                return 'at shop';
            case 'washing':
                return 'washing';
            case 'drying':
                return 'drying';
            case 'laundry_done':
                return 'ready (pickup at shop)';
            case 'out_for_delivery':
                return 'send back to customer';
            case 'completed':
                return 'completed';
            case 'cancelled':
                return 'cancelled';
            default:
                return String(statusRaw || '').replace(/_/g, ' ');
        }
    };

    const nearbyShops = useMemo(() => {
        const withDistance = shops
            .map((shop) => {
                const coords = shop.location?.coordinates;
                if (!userLocation) return { shop, distance: null as number | null };
                if (!Array.isArray(coords) || coords.length < 2) return { shop, distance: null as number | null };
                const lon = coords[0];
                const lat = coords[1];
                if (typeof lat !== 'number' || typeof lon !== 'number') return { shop, distance: null as number | null };
                const d = calculateDistance(userLocation.lat, userLocation.lon, lat, lon);
                return { shop, distance: parseFloat(d.toFixed(1)) };
            })
            .filter((x) => x.shop && (x.distance !== null || !userLocation));

        // Distance range filter
        let filtered = withDistance.filter((x) => {
            if (!userLocation) return true;
            if (maxDistance === 0) return true;
            return x.distance !== null && x.distance <= maxDistance;
        });

        // Name search filter
        if (shopSearch.trim()) {
            const q = shopSearch.trim().toLowerCase();
            filtered = filtered.filter((x) => {
                const name = (x.shop.shopName || x.shop.label || '').toLowerCase();
                return name.includes(q);
            });
        }

        // Sort
        filtered.sort((a, b) => {
            if (shopSortMode === 'name-asc') {
                return (a.shop.shopName || a.shop.label || '').localeCompare(b.shop.shopName || b.shop.label || '');
            }
            if (shopSortMode === 'name-desc') {
                return (b.shop.shopName || b.shop.label || '').localeCompare(a.shop.shopName || a.shop.label || '');
            }
            // distance (default)
            if (a.distance === null && b.distance === null) return 0;
            if (a.distance === null) return 1;
            if (b.distance === null) return -1;
            return a.distance - b.distance;
        });

        return filtered;
    }, [shops, userLocation, maxDistance, shopSearch, shopSortMode]);

    const myTasksByShopId = useMemo(() => {
        const byShop = new Map<
            string,
            {
                orders: Order[];
                counts: Record<'at_shop' | 'washing' | 'laundry_done' | 'out_for_delivery', number>;
            }
        >();

        (myTasks || []).forEach((o) => {
            if (!o?.shopId) return;
            const shopId = String(o.shopId);
            const entry = byShop.get(shopId) || {
                orders: [],
                counts: { at_shop: 0, washing: 0, laundry_done: 0, out_for_delivery: 0 },
            };
            entry.orders.push(o);
            if (o.status === 'at_shop') entry.counts.at_shop += 1;
            if (o.status === 'washing') entry.counts.washing += 1;
            if (o.status === 'laundry_done') entry.counts.laundry_done += 1;
            if (o.status === 'out_for_delivery') entry.counts.out_for_delivery += 1;
            byShop.set(shopId, entry);
        });

        return byShop;
    }, [myTasks]);

    const shopsById = useMemo(() => {
        const map = new Map<string, Shop>();
        (shops || []).forEach((s) => {
            if (s?._id) map.set(String(s._id), s);
        });
        return map;
    }, [shops]);

    useEffect(() => {
        setHandoverShopByOrderId((prev) => {
            const next = { ...prev };
            (myTasks || []).forEach((task) => {
                if (task?.status === 'picked_up' && task?.shopId) {
                    next[task._id] = String(task.shopId);
                }
            });
            return next;
        });
    }, [myTasks]);

    const routeColorByStatus = (status: string) => {
        if (status === 'assigned') return '#2563eb';
        if (status === 'picked_up') return '#0284c7';
        if (status === 'laundry_done') return '#1d4ed8';
        if (status === 'out_for_delivery') return '#059669';
        return '#2563eb';
    };

    /**
     * =========================================================================
     * ฟังก์ชันหาจุดหมายปลายทางสำหรับแต่ละสถานะ
     * =========================================================================
     * 
     * ไรเดอร์ต้องไปที่ต่างกันขึ้นอยู่กับสถานะออเดอร์:
     * - assigned: ไปรับของที่บ้านลูกค้า (pickupLocation)
     * - picked_up: นำไปส่งร้านซัก (shop location)
     * - laundry_done: ไปรับผ้าที่ร้าน (shop location)
     * - out_for_delivery: นำไปส่งคืนลูกค้า (deliveryLocation)
     * =========================================================================
     */

    // หาพิกัดจุดรับของ (บ้านลูกค้า)
    const getPickupTarget = (order: Order): [number, number] | null => {
        const lat = order.pickupLocation?.coordinates?.[1];
        const lon = order.pickupLocation?.coordinates?.[0];
        if (typeof lat !== 'number' || typeof lon !== 'number') return null;
        return [lat, lon];
    };

    // หาพิกัดจุดส่งคืน (บ้านลูกค้า หรือถ้าไม่มีใช้จุดรับแทน)
    const getDeliveryTarget = (order: Order): [number, number] | null => {
        const lat = order.deliveryLocation?.coordinates?.[1] ?? order.pickupLocation?.coordinates?.[1];
        const lon = order.deliveryLocation?.coordinates?.[0] ?? order.pickupLocation?.coordinates?.[0];
        if (typeof lat !== 'number' || typeof lon !== 'number') return null;
        return [lat, lon];
    };

    // หาพิกัดร้านซักที่เลือกไว้ (จาก handoverShopByOrderId หรือ shopId ที่บันทึกแล้ว)
    const getShopTarget = (order: Order): [number, number] | null => {
        const selectedShopId = handoverShopByOrderId[order._id] || (order.shopId ? String(order.shopId) : '');
        if (!selectedShopId) return null;
        const shop = shopsById.get(selectedShopId);
        const coords = shop?.location?.coordinates;
        if (!Array.isArray(coords) || coords.length < 2) return null;
        const lat = coords[1];
        const lon = coords[0];
        if (typeof lat !== 'number' || typeof lon !== 'number') return null;
        return [lat, lon];
    };

    /**
     * กำหนดจุดหมายปลายทางตามสถานะ:
     * - assigned: ไปรับของที่บ้านลูกค้า
     * - picked_up: นำผ้าไปส่งร้านซัก
     * - laundry_done: ไปรับผ้าที่ร้าน (ซักเสร็จแล้ว)
     * - out_for_delivery: นำผ้าไปส่งคืนลูกค้า
     */
    const getRouteTargetForTask = (order: Order): [number, number] | null => {
        if (order.status === 'assigned') return getPickupTarget(order);        // ไปรับของ
        if (order.status === 'picked_up') return getShopTarget(order);         // ไปส่งร้าน
        if (order.status === 'laundry_done') return getShopTarget(order);      // ไปรับที่ร้าน
        if (order.status === 'out_for_delivery') return getDeliveryTarget(order); // ส่งคืนลูกค้า
        return null;
    };

    /**
     * =========================================================================
     * useEffect: วาดเส้นทางบนแผนที่
     * =========================================================================
     * 
     * ทำงานเมื่อ:
     * - myTasks เปลี่ยน (มีงานใหม่/สถานะเปลี่ยน)
     * - userLocation เปลี่ยน (ไรเดอร์เคลื่อนที่)
     * - shopsById/handoverShopByOrderId เปลี่ยน (เลือกร้านใหม่)
     * 
     * ขั้นตอน:
     * 1. กรองเฉพาะงานที่ต้องเดินทาง (assigned, picked_up, laundry_done, out_for_delivery)
     * 2. วนลูปแต่ละงาน -> หาจุดหมายปลายทาง -> เรียก fetchRoadRoute()
     * 3. เก็บผลลัพธ์เป็น RouteLine array -> setTaskRouteLines()
     * 4. <Polyline> จะวาดเส้นทางบนแผนที่อัตโนมัติ
     * 
     * หมายเหตุ: จุดหมายปลายทางมี pin อยู่แล้ว (ลูกค้า/ร้าน) ไม่ต้องเพิ่ม pin ใหม่
     * =========================================================================
     */
    useEffect(() => {
        let active = true;

        const drawRoutes = async () => {
            // ต้องมีตำแหน่งไรเดอร์ก่อนถึงจะวาดเส้นทางได้
            if (!userLocation) {
                setTaskRouteLines([]);
                return;
            }

            // กรองเฉพาะงานที่ต้องเดินทาง
            const moveTasks = (myTasks || []).filter((task) =>
                ['assigned', 'picked_up', 'laundry_done', 'out_for_delivery'].includes(task.status),
            );

            const outForDeliveryTasks = moveTasks.filter((task) => task.status === 'out_for_delivery');
            const getOrderTime = (order: Order) => {
                const candidate = order.updatedAt || order.createdAt || '';
                const parsed = candidate ? new Date(candidate).getTime() : 0;
                return Number.isFinite(parsed) ? parsed : 0;
            };

            let selectedReturnOrderId = activeSendBackOrderId;
            if (!selectedReturnOrderId && outForDeliveryTasks.length > 0) {
                const sorted = [...outForDeliveryTasks].sort((a, b) => {
                    if (sendBackSortMode === 'time') {
                        return getOrderTime(b) - getOrderTime(a);
                    }

                    const aTarget = getDeliveryTarget(a);
                    const bTarget = getDeliveryTarget(b);
                    const aDistance = aTarget
                        ? calculateDistance(userLocation.lat, userLocation.lon, aTarget[0], aTarget[1])
                        : Number.POSITIVE_INFINITY;
                    const bDistance = bTarget
                        ? calculateDistance(userLocation.lat, userLocation.lon, bTarget[0], bTarget[1])
                        : Number.POSITIVE_INFINITY;

                    if (aDistance === bDistance) {
                        return getOrderTime(b) - getOrderTime(a);
                    }

                    return aDistance - bDistance;
                });

                selectedReturnOrderId = sorted[0]?._id ?? null;
            }

            const focusedMoveTasks = moveTasks.filter((task) => {
                if (task.status === 'assigned') {
                    // Only show when Nearby Orders section is open and this is the focused card
                    if (!openSections.orders) return false;
                    return Boolean(activeNearbyOrderId) && task._id === activeNearbyOrderId;
                }
                if (task.status === 'picked_up' || task.status === 'laundry_done') {
                    // Only show when Pick Up Laundry At Shop section is open and this is the focused card
                    if (!openSections.pickupAtShop) return false;
                    return Boolean(activePickupAtShopOrderId) && task._id === activePickupAtShopOrderId;
                }
                if (task.status === 'out_for_delivery') {
                    // Only show when Send Back to Customer section is open
                    if (!openSections.sendBack) return false;
                    return Boolean(selectedReturnOrderId) && task._id === selectedReturnOrderId;
                }
                return false;
            });

            if (!focusedMoveTasks.length) {
                setTaskRouteLines([]);
                return;
            }

            // ต้นทาง = ตำแหน่งไรเดอร์ปัจจุบัน
            const origin: [number, number] = [userLocation.lat, userLocation.lon];

            // วนลูปคำนวณเส้นทางแต่ละงาน (ทำพร้อมกันด้วย Promise.all)
            const lines = await Promise.all(
                focusedMoveTasks.map(async (task) => {
                    const target = getRouteTargetForTask(task); // หาจุดหมายตามสถานะ
                    if (!target) return null;

                    // เรียก OSRM API คำนวณเส้นทางถนนจริง
                    const route = await fetchRoadRoute(origin, target);
                    if (route.points.length < 2) return null;

                    return {
                        orderId: task._id,
                        points: route.points,              // จุดพิกัดเส้นทาง
                        color: routeColorByStatus(task.status), // สีตามสถานะ
                    } as RouteLine;
                }),
            );

            if (!active) return;
            // บันทึกเส้นทางทั้งหมด -> <Polyline> จะวาดบนแผนที่
            setTaskRouteLines(lines.filter((line): line is RouteLine => Boolean(line)));
        };

        drawRoutes();

        return () => {
            active = false;
        };
    }, [myTasks, userLocation, shopsById, handoverShopByOrderId, activeSendBackOrderId, sendBackSortMode, openSections, activeNearbyOrderId, activePickupAtShopOrderId]);

    // Auto-select first nearby shop when the list changes (so route appears on first open)
    useEffect(() => {
        if (!nearbyShops.length) { setActiveNearbyShopId(null); return; }
        setActiveNearbyShopId((prev) => {
            if (prev && nearbyShops.some(({ shop }) => shop._id === prev)) return prev;
            return nearbyShops[0]?.shop._id ?? null;
        });
    }, [nearbyShops]);

    // Draw road line from rider to the selected nearby shop
    useEffect(() => {
        let active = true;
        if (!openSections.shops || !activeNearbyShopId || !userLocation) {
            setShopRoutePoints([]);
            return;
        }
        const shop = shopsById.get(activeNearbyShopId) ||
            shops.find((s) => s._id === activeNearbyShopId);
        const coords = shop?.location?.coordinates;
        if (!Array.isArray(coords) || coords.length < 2) {
            setShopRoutePoints([]);
            return;
        }
        const target: [number, number] = [coords[1], coords[0]];
        const origin: [number, number] = [userLocation.lat, userLocation.lon];
        fetchRoadRoute(origin, target).then((result) => {
            if (active) setShopRoutePoints(result.points.length >= 2 ? result.points : []);
        });
        return () => { active = false; };
    }, [openSections.shops, activeNearbyShopId, userLocation, shopsById, shops]);

    const pickUpLaundryAtShopTasks = useMemo(
        () => (myTasks || []).filter((o) => o?.status === 'laundry_done'),
        [myTasks]
    );

    const sortedPickupAtShopTasks = useMemo(() => {
        const list = [...pickUpLaundryAtShopTasks];
        const getOrderTime = (order: Order) => {
            const candidate = order.updatedAt || order.createdAt || '';
            const parsed = candidate ? new Date(candidate).getTime() : 0;
            return Number.isFinite(parsed) ? parsed : 0;
        };
        list.sort((a, b) => {
            if (pickupAtShopSortMode === 'time') return getOrderTime(b) - getOrderTime(a);
            const aShop = a.shopId ? shopsById.get(String(a.shopId)) : undefined;
            const bShop = b.shopId ? shopsById.get(String(b.shopId)) : undefined;
            const aCoords = aShop?.location?.coordinates;
            const bCoords = bShop?.location?.coordinates;
            const aDist = (userLocation && Array.isArray(aCoords) && aCoords.length >= 2)
                ? calculateDistance(userLocation.lat, userLocation.lon, aCoords[1], aCoords[0]) : Infinity;
            const bDist = (userLocation && Array.isArray(bCoords) && bCoords.length >= 2)
                ? calculateDistance(userLocation.lat, userLocation.lon, bCoords[1], bCoords[0]) : Infinity;
            return aDist - bDist;
        });
        return list;
    }, [pickUpLaundryAtShopTasks, pickupAtShopSortMode, userLocation, shopsById]);

    useEffect(() => {
        if (!sortedPickupAtShopTasks.length) { setActivePickupAtShopOrderId(null); return; }
        setActivePickupAtShopOrderId((prev) => {
            if (prev && sortedPickupAtShopTasks.some((o) => o._id === prev)) return prev;
            return sortedPickupAtShopTasks[0]._id;
        });
    }, [sortedPickupAtShopTasks]);

    const sendBackToCustomerTasks = useMemo(
        () => (myTasks || []).filter((o) => o?.status === 'out_for_delivery'),
        [myTasks]
    );

    const sortedFilteredOrders = useMemo(() => {
        const list = [...filteredOrders];

        const getOrderTime = (order: Order) => {
            const candidate = order.updatedAt || order.createdAt || '';
            const parsed = candidate ? new Date(candidate).getTime() : 0;
            return Number.isFinite(parsed) ? parsed : 0;
        };

        list.sort((a, b) => {
            if (nearbyOrderSortMode === 'time') {
                return getOrderTime(b) - getOrderTime(a);
            }
            if (nearbyOrderSortMode === 'price') {
                return (Number(b.totalPrice) || 0) - (Number(a.totalPrice) || 0);
            }
            // distance (default)
            return (a.distance ?? Number.POSITIVE_INFINITY) - (b.distance ?? Number.POSITIVE_INFINITY);
        });

        return list;
    }, [filteredOrders, nearbyOrderSortMode, userLocation]);

    // Auto-focus first nearby order when list changes; preserve selection if still in list
    useEffect(() => {
        if (!sortedFilteredOrders.length) {
            setActiveNearbyOrderId(null);
            return;
        }
        setActiveNearbyOrderId((prev) => {
            if (prev && sortedFilteredOrders.some((o) => o._id === prev)) return prev;
            return sortedFilteredOrders[0]._id;
        });
    }, [sortedFilteredOrders]);

    const sortedSendBackToCustomerTasks = useMemo(() => {
        const list = [...sendBackToCustomerTasks];

        const getOrderTime = (order: Order) => {
            const candidate = order.updatedAt || order.createdAt || '';
            const parsed = candidate ? new Date(candidate).getTime() : 0;
            return Number.isFinite(parsed) ? parsed : 0;
        };

        list.sort((a, b) => {
            if (sendBackSortMode === 'time') {
                return getOrderTime(b) - getOrderTime(a);
            }

            const aTarget = getDeliveryTarget(a);
            const bTarget = getDeliveryTarget(b);
            const aDistance = (userLocation && aTarget)
                ? calculateDistance(userLocation.lat, userLocation.lon, aTarget[0], aTarget[1])
                : Number.POSITIVE_INFINITY;
            const bDistance = (userLocation && bTarget)
                ? calculateDistance(userLocation.lat, userLocation.lon, bTarget[0], bTarget[1])
                : Number.POSITIVE_INFINITY;

            if (aDistance === bDistance) {
                return getOrderTime(b) - getOrderTime(a);
            }

            return aDistance - bDistance;
        });

        return list;
    }, [sendBackToCustomerTasks, sendBackSortMode, userLocation]);

    useEffect(() => {
        if (!sortedSendBackToCustomerTasks.length) {
            setActiveSendBackOrderId(null);
            return;
        }

        setActiveSendBackOrderId((prev) => {
            if (prev && sortedSendBackToCustomerTasks.some((order) => order._id === prev)) {
                return prev;
            }
            return sortedSendBackToCustomerTasks[0]._id;
        });
    }, [sortedSendBackToCustomerTasks]);

    const pickedUpOrders = useMemo(
        () => (myTasks || []).filter((o) => o?.status === 'picked_up'),
        [myTasks]
    );

    const fetchAvailableOrders = async (silent = false) => {
        try {
            const data = await apiFetch('/rider/available');
            setAvailableOrders(Array.isArray(data) ? data : []);
        } catch (err) {
            if (isUnauthorizedError(err)) {
                setAuthBlocked(true);
                setError('Unauthorized: your rider session expired. Please sign in again.');
                if (silent) return;
            }
            if (!silent) throw err;
            if (!isUnauthorizedError(err)) {
                console.error('Failed to refresh available orders:', err);
            }
        }
    };

    const fetchMyTasks = async (silent = false) => {
        try {
            const data = await apiFetch('/rider/my-tasks');
            setMyTasks(Array.isArray(data) ? data : []);
        } catch (err) {
            if (isUnauthorizedError(err)) {
                setAuthBlocked(true);
                setError('Unauthorized: your rider session expired. Please sign in again.');
                if (silent) return;
            }
            if (!silent) throw err;
            if (!isUnauthorizedError(err)) {
                console.error('Failed to refresh rider tasks:', err);
            }
        }
    };

    const fetchShops = async (silent = false) => {
        try {
            const data = await apiFetch('/map/shops');
            setShops(Array.isArray(data) ? data : []);
        } catch (err) {
            if (isUnauthorizedError(err)) {
                setAuthBlocked(true);
                setError('Unauthorized: your rider session expired. Please sign in again.');
                if (silent) return;
            }
            if (!silent) throw err;
            if (!isUnauthorizedError(err)) {
                console.error('Failed to refresh shops:', err);
            }
        }
    };

    const refreshRiderData = async () => {
        if (authBlocked) return;
        await Promise.all([
            fetchAvailableOrders(true),
            fetchMyTasks(true),
            fetchShops(true),
        ]);
    };

    const fetchData = async () => {
        try {
            setLoading(true);
            await Promise.all([fetchAvailableOrders(), fetchMyTasks(), fetchShops()]);
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);
            setError(message || 'An unknown error occurred');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const combined = [...availableOrders, ...myTasks];
        const byId = new Map<string, Order>();
        combined.forEach((o) => {
            if (o && o._id) byId.set(o._id, o);
        });
        const allOrders = Array.from(byId.values());

        if (!allOrders.length) {
            setFilteredOrders([]);
            return;
        }

        const updated = allOrders.reduce<Order[]>((acc, order) => {
            const lat = order.pickupLocation?.coordinates?.[1];
            const lon = order.pickupLocation?.coordinates?.[0];

            if (typeof lat !== 'number' || typeof lon !== 'number') {
                return acc;
            }

            let distance = 0;

            if (userLocation) {
                distance = calculateDistance(
                    userLocation.lat,
                    userLocation.lon,
                    lat,
                    lon
                );
            }

            acc.push({
                ...order,
                location: { lat, lon },
                distance: parseFloat(distance.toFixed(1)),
            });

            return acc;
        }, []);

        const filtered = updated.filter(
            (order) =>
                ['pending', 'assigned'].includes(order.status) &&
                (maxDistance === 0 || (order.distance !== undefined && order.distance <= maxDistance)),
        );

        setFilteredOrders(filtered);
    }, [availableOrders, myTasks, userLocation, maxDistance]);

    const acceptOrder = async (orderId: string) => {
        try {
            await apiFetch(`/rider/accept/${orderId}`, { method: 'PATCH' });
            alert('Order accepted successfully!');
            await fetchData();
        } catch (err: unknown) {
            alert(err instanceof Error ? err.message : String(err));
        }
    };

    const pickUpOrder = async (orderId: string) => {
        try {
            await apiFetch(`/rider/status/${orderId}`, {
                method: 'PATCH',
                body: JSON.stringify({ status: 'picked_up' }),
            });
            setShopsAlert(true);
            await fetchData();
        } catch (err: unknown) {
            alert(err instanceof Error ? err.message : String(err));
        }
    };

    const handoverToShop = async (orderId: string, targetShopId?: string) => {
        const shopId = targetShopId || handoverShopByOrderId[orderId];
        if (!shopId) {
            alert('Please select shop first to preview route, then send to shop');
            return;
        }

        try {
            await apiFetch(`/rider/handover/${orderId}`, {
                method: 'PATCH',
                body: JSON.stringify({ shopId }),
            });
            setHandoverReadyByOrderId((prev) => {
                const next = { ...prev };
                delete next[orderId];
                return next;
            });
            await fetchData();
        } catch (err: unknown) {
            alert(err instanceof Error ? err.message : String(err));
        }
    };

    const selectShopForOrder = async (orderId: string, shopId: string | null) => {
        await apiFetch(`/rider/select-shop/${orderId}`, {
            method: 'PATCH',
            body: JSON.stringify({ shopId }),
        });
    };

    const cancelShopSelection = (orderId: string) => {
        setHandoverShopByOrderId((prev) => {
            const next = { ...prev };
            delete next[orderId];
            return next;
        });
        setHandoverReadyByOrderId((prev) => {
            const next = { ...prev };
            delete next[orderId];
            return next;
        });

        selectShopForOrder(orderId, null).catch(() => {
            // ignore selection sync errors
        });
    };

    const sendAllPickedUpToShop = async (shopId: string) => {
        if (!pickedUpOrders.length) return;

        setSendingAllByShopId((prev) => ({ ...prev, [shopId]: true }));

        try {
            setHandoverShopByOrderId((prev) => {
                const next = { ...prev };
                pickedUpOrders.forEach((order) => {
                    next[order._id] = shopId;
                });
                return next;
            });

            await Promise.allSettled(
                pickedUpOrders.map((order) => selectShopForOrder(order._id, shopId)),
            );

            const handoverResults = await Promise.allSettled(
                pickedUpOrders.map((order) =>
                    apiFetch(`/rider/handover/${order._id}`, {
                        method: 'PATCH',
                        body: JSON.stringify({ shopId }),
                    }),
                ),
            );

            const sentCount = handoverResults.filter((result) => result.status === 'fulfilled').length;
            const failedCount = handoverResults.length - sentCount;

            if (failedCount > 0) {
                alert(`Sent ${sentCount}/${handoverResults.length} orders to shop (${failedCount} failed)`);
            }

            if (sentCount > 0) {
                await fetchData();
            }
        } catch (err: unknown) {
            alert(err instanceof Error ? err.message : String(err));
        } finally {
            setSendingAllByShopId((prev) => ({ ...prev, [shopId]: false }));
        }
    };

    const pickUpLaundryFromShop = async (orderId: string) => {
        try {
            await apiFetch(`/rider/return-delivery/${orderId}`, { method: 'PATCH' });
            await fetchData();
        } catch (err: unknown) {
            alert(err instanceof Error ? err.message : String(err));
        }
    };

    const pickUpAllLaundryFromShop = async (orders: Order[]) => {
        if (!orders.length) return;

        setPickingUpAllLaundry(true);
        try {
            const pickupResults = await Promise.allSettled(
                orders.map((order) => apiFetch(`/rider/return-delivery/${order._id}`, { method: 'PATCH' })),
            );

            const pickedCount = pickupResults.filter((result) => result.status === 'fulfilled').length;
            const failedCount = pickupResults.length - pickedCount;

            if (failedCount > 0) {
                alert(`Picked up ${pickedCount}/${pickupResults.length} orders (${failedCount} failed)`);
            }

            if (pickedCount > 0) {
                await fetchData();
            }
        } catch (err: unknown) {
            alert(err instanceof Error ? err.message : String(err));
        } finally {
            setPickingUpAllLaundry(false);
        }
    };

    const pickUpAllLaundryByShop = async (shopId: string, orders: Order[]) => {
        if (!orders.length) return;

        setPickingUpAllByShopId((prev) => ({ ...prev, [shopId]: true }));
        try {
            const pickupResults = await Promise.allSettled(
                orders.map((order) => apiFetch(`/rider/return-delivery/${order._id}`, { method: 'PATCH' })),
            );

            const pickedCount = pickupResults.filter((result) => result.status === 'fulfilled').length;
            const failedCount = pickupResults.length - pickedCount;

            if (failedCount > 0) {
                alert(`Picked up ${pickedCount}/${pickupResults.length} orders (${failedCount} failed)`);
            }

            if (pickedCount > 0) {
                await fetchData();
            }
        } catch (err: unknown) {
            alert(err instanceof Error ? err.message : String(err));
        } finally {
            setPickingUpAllByShopId((prev) => ({ ...prev, [shopId]: false }));
        }
    };

    const completeDelivery = async (orderId: string) => {
        try {
            await apiFetch(`/rider/complete-delivery/${orderId}`, { method: 'PATCH' });
            await fetchData();
        } catch (err: unknown) {
            alert(err instanceof Error ? err.message : String(err));
        }
    };

    if (loading) return (
        <div className="flex items-center justify-center min-h-[400px]">
            <div className="flex flex-col items-center gap-4">
                <div className="h-12 w-12 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"></div>
                <p className="text-blue-900 font-black uppercase tracking-widest text-xs animate-pulse">กำลังโหลดงานล่าสุด...</p>
            </div>
        </div>
    );

    if (error) return (
        <div className="max-w-xl mx-auto mt-20 p-10 bg-white rounded-[2.5rem] shadow-2xl shadow-rose-100/50 border border-rose-50 text-center">
            <div className="h-20 w-20 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl">⚠️</div>
            <h2 className="text-2xl font-black text-blue-900 mb-4 tracking-tight">ไม่ได้รับอนุญาต</h2>
            <p className="text-slate-500 font-medium mb-8 leading-relaxed">
                ขออภัย บัญชีของคุณอาจไม่มีสิทธิ์เข้าถึงหน้านี้ หรือเซสชันหมดอายุแล้ว
                <br /><span className="text-rose-500 text-xs font-bold mt-2 block">Error: {error}</span>
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                    onClick={() => window.location.reload()}
                    className="px-8 py-4 bg-blue-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-blue-700 active:scale-95 transition-all shadow-xl shadow-blue-100"
                >
                    ลองใหม่อีกครั้ง
                </button>
                <button
                    onClick={() => {
                        localStorage.clear();
                        window.location.href = '/';
                    }}
                    className="px-8 py-4 bg-slate-50 text-blue-900 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-100 active:scale-95 transition-all"
                >
                    กลับไปหน้าล็อกอิน
                </button>
            </div>
        </div>
    );

    return (
        <div className="relative h-screen w-full overflow-hidden bg-slate-50">
            {/* MapContainer - Client Only */}
            <div className="absolute inset-0 z-0 h-full w-full">
                {isMapClientReady && typeof window !== 'undefined' && (
                    <MapContainer
                        center={mapView.center}
                        zoom={mapView.zoom}
                        scrollWheelZoom={true}
                        style={{ height: '100%', width: '100%' }}
                        zoomControl={false}
                        whenReady={() => setIsLeafletMapReady(true)}
                    >
                        {isLeafletMapReady && (
                            <>
                                <TileLayer
                                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                />
                                <MapController
                                    center={mapView.center}
                                    zoom={mapView.zoom}
                                    onMapReady={(map) => { mapInstanceRef.current = map; }}
                                />

                                {/* วาดเส้นทางถนนจากไรเดอร์ไปจุดหมาย (Polyline) */}
                                {/* points มาจาก fetchRoadRoute() -> เส้นทางถนนจริงจาก OSRM */}
                                {/* สีเส้นแตกต่างตามสถานะงาน (assigned/picked_up/laundry_done/out_for_delivery) */}
                                {taskRouteLines.map((line) => (
                                    <Polyline
                                        key={`route-${line.orderId}`}
                                        positions={line.points}
                                        pathOptions={{ color: line.color, weight: 5, opacity: 0.85 }}
                                    />
                                ))}

                                {/* Road line to selected nearby shop */}
                                {shopRoutePoints.length >= 2 && (
                                    <Polyline
                                        positions={shopRoutePoints}
                                        pathOptions={{ color: '#e11d48', weight: 5, opacity: 0.85 }}
                                    />
                                )}

                                {userLocation && riderIcon && (
                                    <Marker position={[userLocation.lat, userLocation.lon]} icon={riderIcon}>
                                        <Popup>
                                            <div className="p-2">
                                                <p className="font-black text-blue-600 text-xs uppercase tracking-widest">Your Location</p>
                                            </div>
                                        </Popup>
                                    </Marker>
                                )}

                            {shops.map((shop) => {
                            const coords = shop.location?.coordinates;
                            if (!Array.isArray(coords) || coords.length < 2 || !shopIcon) return null;
                            const name = shop.shopName || shop.label || 'Shop';
                                const machineSTotal = Number(shop.machineSizeConfig?.s ?? 0) || 0;
                                const machineMTotal = Number(shop.machineSizeConfig?.m ?? 0) || 0;
                                const machineLTotal = Number(shop.machineSizeConfig?.l ?? 0) || 0;
                                const machineAvailS = Number(shop.machineAvailableS ?? Math.max(0, machineSTotal - Number(shop.machineInUseS ?? 0))) || 0;
                                const machineAvailM = Number(shop.machineAvailableM ?? Math.max(0, machineMTotal - Number(shop.machineInUseM ?? 0))) || 0;
                                const machineAvailL = Number(shop.machineAvailableL ?? Math.max(0, machineLTotal - Number(shop.machineInUseL ?? 0))) || 0;
                                const dryTotal = Number(shop.totalDryingMachines ?? shop.totalWashingMachines ?? 10) || 10;
                                const dryAvailable = Number(shop.dryMachineAvailable ?? Math.max(0, dryTotal - Number(shop.dryMachineInUse || 0))) || 0;
                                const readyTasksAtShop = pickUpLaundryAtShopTasks.filter((task) => String(task.shopId || '') === String(shop._id));
                            const distKm =
                                userLocation && typeof coords[1] === 'number' && typeof coords[0] === 'number'
                                    ? parseFloat(calculateDistance(userLocation.lat, userLocation.lon, coords[1], coords[0]).toFixed(1))
                                    : null;
                            return (
                                <Marker
                                    key={shop._id}
                                    position={[coords[1], coords[0]]}
                                    icon={shopIcon}
                                >
                                    <Popup>
                                        <div className="p-3 w-56">
                                            <p className="font-black text-rose-600 text-xs uppercase tracking-widest">Shop</p>
                                            <p className="text-sm font-black text-blue-900 mt-1">{name}</p>

                                            {shop.photoImage ? (
                                                <img
                                                    src={resolveAssetUrl(shop.photoImage)}
                                                    alt={name}
                                                    className="mt-2 h-24 w-full rounded-xl object-cover border border-slate-100"
                                                />
                                            ) : null}

                                            <div className="mt-2 flex flex-wrap gap-1.5">
                                                {distKm !== null && (
                                                    <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-1 rounded">{distKm} km</span>
                                                )}
                                                {shop.phoneNumber ? (
                                                    <span className="text-[10px] font-black text-slate-600 bg-slate-50 px-2 py-1 rounded">☎ {shop.phoneNumber}</span>
                                                ) : null}
                                                <span className="text-[10px] font-black text-sky-700 bg-sky-50 px-2 py-1 rounded">
                                                    S {machineAvailS}/{machineSTotal} · M {machineAvailM}/{machineMTotal} · L {machineAvailL}/{machineLTotal}
                                                </span>
                                                <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 px-2 py-1 rounded">
                                                    Dry Empty {dryAvailable}/{dryTotal}
                                                </span>
                                            </div>

                                            {/* Send picked-up orders to this shop */}
                                            {pickedUpOrders.length > 0 && (
                                                <div className="mt-3 border-t border-slate-100 pt-2">
                                                    <div className="mb-1.5 flex items-center justify-between gap-2">
                                                        <p className="text-[9px] font-black text-sky-600 uppercase tracking-widest">Send order to this shop</p>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                sendAllPickedUpToShop(shop._id);
                                                            }}
                                                            disabled={!!sendingAllByShopId[shop._id]}
                                                            className="text-[9px] font-black text-white bg-emerald-600 px-2 py-1 rounded-md hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed whitespace-nowrap"
                                                        >
                                                            {sendingAllByShopId[shop._id] ? 'Sending...' : `Send all (${pickedUpOrders.length})`}
                                                        </button>
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        {pickedUpOrders.map((order) => {
                                                            const isSelected = handoverShopByOrderId[order._id] === shop._id;
                                                            return (
                                                                <div key={`pin-send-${order._id}`} className="flex items-center justify-between gap-1.5 rounded-lg bg-sky-50 px-2 py-1.5 border border-sky-100">
                                                                    <p className="text-[10px] font-bold text-slate-700 line-clamp-1 flex-1">
                                                                        {order.customerName || order.productName || 'Order'}
                                                                    </p>
                                                                    <div className="flex items-center gap-1">
                                                                        <button
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                if (!isSelected) {
                                                                                    setHandoverShopByOrderId((prev) => ({ ...prev, [order._id]: shop._id }));
                                                                                    selectShopForOrder(order._id, shop._id).catch(() => {});
                                                                                    const coords = shop.location?.coordinates;
                                                                                    if (Array.isArray(coords) && coords.length >= 2) {
                                                                                        setMapView({ center: [coords[1], coords[0]], zoom: 16 });
                                                                                    }
                                                                                } else {
                                                                                    handoverToShop(order._id, shop._id);
                                                                                }
                                                                            }}
                                                                            className={`text-[10px] font-black text-white px-2.5 py-1 rounded-lg whitespace-nowrap ${isSelected ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-sky-600 hover:bg-sky-700'}`}
                                                                        >
                                                                            {isSelected ? 'Send' : 'Select'}
                                                                        </button>
                                                                        {isSelected && (
                                                                            <button
                                                                                onClick={(e) => { e.stopPropagation(); cancelShopSelection(order._id); }}
                                                                                className="text-[10px] font-black text-slate-600 bg-slate-200 px-2 py-1 rounded-lg hover:bg-slate-300 whitespace-nowrap"
                                                                            >
                                                                                ✕
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            )}

                                            {readyTasksAtShop.length > 0 && (
                                                <div className="mt-3 space-y-2 border-t border-slate-100 pt-2">
                                                    <div className="flex items-center justify-between gap-2">
                                                        <p className="text-[10px] font-black uppercase tracking-widest text-blue-700">Pickup at shop</p>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                pickUpAllLaundryByShop(shop._id, readyTasksAtShop);
                                                            }}
                                                            disabled={!!pickingUpAllByShopId[shop._id]}
                                                            className="text-[9px] font-black text-white bg-blue-600 px-2 py-1 rounded-md hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed whitespace-nowrap"
                                                        >
                                                            {pickingUpAllByShopId[shop._id] ? 'Picking...' : `Pick Up All (${readyTasksAtShop.length})`}
                                                        </button>
                                                    </div>
                                                    {readyTasksAtShop.slice(0, 3).map((task) => (
                                                        <div
                                                            key={`pickup-at-shop-pin-${task._id}`}
                                                            className="flex items-center justify-between gap-2 rounded-lg border border-blue-100 bg-blue-50 p-2"
                                                        >
                                                            <div className="flex items-center gap-2 min-w-0 flex-1">
                                                                {Array.isArray(task.images) && task.images.length > 0 ? (
                                                                    <img
                                                                        src={resolveAssetUrl(task.images[0])}
                                                                        alt={task.productName || task.customerName || 'Order image'}
                                                                        className="h-9 w-9 rounded-md object-cover border border-blue-100 cursor-zoom-in"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            openImageZoom(task.images?.[0], task.productName || task.customerName || 'Order image');
                                                                        }}
                                                                    />
                                                                ) : (
                                                                    <div className="h-9 w-9 rounded-md bg-blue-100 border border-blue-200 flex items-center justify-center text-[10px] font-black text-blue-700">
                                                                        IMG
                                                                    </div>
                                                                )}
                                                                <p className="text-[10px] font-bold text-slate-700 line-clamp-1">
                                                                    {task.customerName || task.productName || 'Order'}
                                                                </p>
                                                            </div>
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    pickUpLaundryFromShop(task._id);
                                                                }}
                                                                className="rounded-md bg-blue-600 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-white hover:bg-blue-700 whitespace-nowrap"
                                                            >
                                                                Pick Up
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </Popup>
                                </Marker>
                            );
                            })}

                            {sortedSendBackToCustomerTasks.map((order) => {
                            const lat = order.deliveryLocation?.coordinates?.[1] ?? order.pickupLocation?.coordinates?.[1];
                            const lon = order.deliveryLocation?.coordinates?.[0] ?? order.pickupLocation?.coordinates?.[0];
                            if (typeof lat !== 'number' || typeof lon !== 'number') return null;

                            return (
                                <CircleMarker
                                    key={`return-customer-${order._id}`}
                                    center={[lat, lon]}
                                    radius={activeSendBackOrderId === order._id ? 10 : 8}
                                    pathOptions={{ color: '#059669', fillColor: '#10b981', fillOpacity: 0.9, weight: 2 }}
                                    eventHandlers={{
                                        click: () => {
                                            setActiveSendBackOrderId(order._id);
                                        },
                                    }}
                                >
                                    <Popup>
                                        <div className="p-3 w-56">
                                            <p className="font-black text-emerald-600 text-xs uppercase tracking-widest">Customer Destination</p>
                                            <p className="text-sm font-black text-blue-900 mt-1 line-clamp-1">{order.customerName || order.productName || 'Order'}</p>
                                            <p className="text-[10px] text-slate-500 font-bold mt-2 line-clamp-2">{order.deliveryAddress || order.pickupAddress}</p>

                                            {Array.isArray(order.images) && order.images.length > 0 && (
                                                <div className="mt-2 grid grid-cols-2 gap-1.5">
                                                    {order.images.slice(0, 2).map((image, index) => (
                                                        <img
                                                            key={`${order._id}-destination-img-${index}`}
                                                            src={resolveAssetUrl(image)}
                                                            alt={`Laundry image ${index + 1}`}
                                                            className="h-16 w-full rounded-lg object-cover border border-slate-100 cursor-zoom-in"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                openImageZoom(image, `Laundry image ${index + 1}`);
                                                            }}
                                                        />
                                                    ))}
                                                </div>
                                            )}

                                            <span className="inline-flex mt-2 text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded">
                                                {statusLabel(order.status)}
                                            </span>

                                            {order.status === 'out_for_delivery' && (
                                                <button
                                                    onClick={() => completeDelivery(order._id)}
                                                    className="mt-2 w-full rounded-lg bg-emerald-600 py-2 text-[10px] font-black uppercase tracking-widest text-white hover:bg-emerald-700"
                                                >
                                                    Delivered
                                                </button>
                                            )}
                                        </div>
                                    </Popup>
                                </CircleMarker>
                            );
                            })}

                            {filteredOrders.map((order) => (
                            order.location && icon && (
                                <Marker
                                    key={order._id}
                                    position={[order.location.lat, order.location.lon]}
                                    icon={icon}
                                >
                                    <Popup>
                                        <div className="p-3 w-56">
                                            <p className="font-black text-blue-900 text-sm mb-1">{order.customerName || order.productName || 'Order'}</p>

                                            {Array.isArray(order.images) && order.images.length > 0 ? (
                                                <img
                                                    src={resolveAssetUrl(order.images[0])}
                                                    alt="Order"
                                                    className="mb-2 h-24 w-full rounded-xl object-cover border border-slate-100 cursor-zoom-in"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        openImageZoom(order.images?.[0], order.productName || order.customerName || 'Order image');
                                                    }}
                                                />
                                            ) : null}

                                            <p className="text-[10px] text-slate-500 font-bold mb-2 line-clamp-2">{order.pickupAddress}</p>

                                            {order.description ? (
                                                <p className="text-[10px] text-slate-400 font-bold mb-2 line-clamp-2">{order.description}</p>
                                            ) : null}

                                            <div className="flex flex-wrap gap-2 items-center mb-3">
                                                <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded">฿{order.totalPrice}</span>
                                                <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-1 rounded">{order.distance} km</span>
                                                <span className="text-[10px] font-black text-slate-500 bg-slate-50 px-2 py-1 rounded">{statusLabel(order.status)}</span>
                                            </div>

                                            {order.status === 'pending' && (
                                                <button
                                                    onClick={() => acceptOrder(order._id)}
                                                    className="w-full bg-blue-600 text-white text-[10px] font-black py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-lg shadow-blue-100 uppercase tracking-widest"
                                                >
                                                    Accept Order
                                                </button>
                                            )}

                                            {order.status === 'assigned' && (
                                                <button
                                                    onClick={() => pickUpOrder(order._id)}
                                                    className="w-full bg-indigo-600 text-white text-[10px] font-black py-2 rounded-lg hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-100 uppercase tracking-widest"
                                                >
                                                    Pick Up
                                                </button>
                                            )}

                                            {order.status === 'picked_up' && (
                                                <div className="space-y-2">
                                                    {order.pickupType === 'now' && (
                                                        <p className="text-[10px] font-black text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                                                            Priority service: choose shop with available machine only
                                                        </p>
                                                    )}
                                                    <select
                                                        value={handoverShopByOrderId[order._id] || ''}
                                                        onChange={(e) => {
                                                            const selectedShopId = e.target.value;
                                                            setHandoverShopByOrderId((prev) => ({
                                                                ...prev,
                                                                [order._id]: selectedShopId,
                                                            }));
                                                            setHandoverReadyByOrderId((prev) => ({
                                                                ...prev,
                                                                [order._id]: false,
                                                            }));

                                                            const selectedShop = shops.find((s) => s._id === selectedShopId);
                                                            const coords = selectedShop?.location?.coordinates;
                                                            if (Array.isArray(coords) && coords.length >= 2) {
                                                                setMapView({ center: [coords[1], coords[0]], zoom: 16 });
                                                            }

                                                            selectShopForOrder(order._id, selectedShopId).catch(() => {
                                                                // ignore selection sync errors
                                                            });
                                                        }}
                                                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-[10px] font-black text-blue-900 uppercase tracking-widest"
                                                    >
                                                        <option value="" disabled>
                                                            Select Shop
                                                        </option>
                                                        {shops.map((s) => (
                                                            <option
                                                                key={s._id}
                                                                value={s._id}
                                                                disabled={order.pickupType === 'now' && (Number(s.machineAvailable) || 0) <= 0}
                                                            >
                                                                {`${(s.shopName || s.label || 'Shop').toUpperCase()} (W ${Number(s.machineAvailable) || 0}/${Number(s.totalWashingMachines) || 10} | D ${Number(s.dryMachineAvailable) || 0}/${Number(s.totalDryingMachines) || Number(s.totalWashingMachines) || 10})`}
                                                            </option>
                                                        ))}
                                                    </select>
                                                    <button
                                                        onClick={() => {
                                                            const selectedShopId = handoverShopByOrderId[order._id];
                                                            if (!selectedShopId) {
                                                                alert('Please select shop first to preview route, then send to shop');
                                                                return;
                                                            }

                                                            const ready = handoverReadyByOrderId[order._id] === true;
                                                            if (!ready) {
                                                                setHandoverReadyByOrderId((prev) => ({
                                                                    ...prev,
                                                                    [order._id]: true,
                                                                }));
                                                                return;
                                                            }

                                                            handoverToShop(order._id, selectedShopId);
                                                        }}
                                                        className={`w-full text-white text-[10px] font-black py-2 rounded-lg transition-colors shadow-lg uppercase tracking-widest ${handoverReadyByOrderId[order._id]
                                                            ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-100'
                                                            : 'bg-sky-600 hover:bg-sky-700 shadow-sky-100'
                                                            }`}
                                                    >
                                                        {handoverReadyByOrderId[order._id] ? 'Send To Shop' : 'Select Shop'}
                                                    </button>
                                                    {handoverShopByOrderId[order._id] && (
                                                        <button
                                                            onClick={() => cancelShopSelection(order._id)}
                                                            className="w-full bg-slate-200 text-slate-700 text-[10px] font-black py-2 rounded-lg hover:bg-slate-300 transition-colors uppercase tracking-widest"
                                                        >
                                                            Cancel Selection
                                                        </button>
                                                    )}
                                                </div>
                                            )}

                                            {order.status === 'laundry_done' && (
                                                <button
                                                    onClick={() => pickUpLaundryFromShop(order._id)}
                                                    className="w-full bg-blue-600 text-white text-[10px] font-black py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-lg shadow-blue-100 uppercase tracking-widest"
                                                >
                                                    Pick Up Laundry
                                                </button>
                                            )}

                                            {order.status === 'out_for_delivery' && (
                                                <button
                                                    onClick={() => completeDelivery(order._id)}
                                                    className="w-full bg-emerald-600 text-white text-[10px] font-black py-2 rounded-lg hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-100 uppercase tracking-widest"
                                                >
                                                    Delivered
                                                </button>
                                            )}
                                        </div>
                                    </Popup>
                                </Marker>
                            )
                                ))}
                            </>
                        )}
                    </MapContainer>
                )}

                {/* Custom map controls - bottom right */}
                <div className="absolute bottom-36 right-4 flex flex-col gap-2 z-[400] pointer-events-auto">
                    {/* Locate me */}
                    <button
                        onClick={() => {
                            if (userLocation) {
                                setMapView({ center: [userLocation.lat, userLocation.lon], zoom: 15 });
                            } else if (navigator.geolocation) {
                                navigator.geolocation.getCurrentPosition((pos) => {
                                    const c = { lat: pos.coords.latitude, lon: pos.coords.longitude };
                                    setUserLocation(c);
                                    setMapView({ center: [c.lat, c.lon], zoom: 15 });
                                });
                            }
                        }}
                        className="h-11 w-11 rounded-full bg-white shadow-xl flex items-center justify-center text-blue-600 hover:bg-blue-50 active:scale-95 transition-all border border-slate-200"
                        title="My location"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <circle cx="12" cy="12" r="3" fill="currentColor" stroke="none" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 2v3m0 14v3M2 12h3m14 0h3" />
                            <circle cx="12" cy="12" r="7" strokeWidth={1.5} fill="none" />
                        </svg>
                    </button>
                    {/* Zoom in */}
                    <button
                        onClick={() => mapInstanceRef.current?.zoomIn()}
                        className="h-11 w-11 rounded-2xl bg-white shadow-xl flex items-center justify-center text-slate-700 hover:bg-slate-50 active:scale-95 transition-all border border-slate-200 text-xl font-bold"
                        title="Zoom in"
                    >+</button>
                    {/* Zoom out */}
                    <button
                        onClick={() => mapInstanceRef.current?.zoomOut()}
                        className="h-11 w-11 rounded-2xl bg-white shadow-xl flex items-center justify-center text-slate-700 hover:bg-slate-50 active:scale-95 transition-all border border-slate-200"
                        title="Zoom out"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" /></svg>
                    </button>
                </div>
            </div>

            {/* Top Bar - Floating Layer */}
            <div className="absolute top-3 left-3 right-3 sm:top-6 sm:left-6 sm:right-6 z-20 flex items-center justify-between gap-2 pointer-events-none text-blue-900">
                <div className="pointer-events-auto">
                    <div className="bg-white/90 backdrop-blur-xl p-2.5 sm:p-4 rounded-xl sm:rounded-[2rem] shadow-lg sm:shadow-2xl shadow-blue-900/10 border border-white/50 flex items-center gap-2.5 sm:gap-4">
                        <div className="h-8 w-8 sm:h-10 sm:w-10 bg-blue-600 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200">
                            <span className="text-white text-base sm:text-xl">📦</span>
                        </div>
                        <div>
                            <h1 className="text-sm sm:text-lg font-extrabold text-slate-800 leading-none">Available Jobs</h1>
                            <p className="text-[9px] sm:text-[10px] font-semibold text-blue-500 uppercase tracking-wider mt-0.5 sm:mt-1">Real-time Updates</p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2 pointer-events-auto">
                    <div className="bg-white/90 backdrop-blur-xl px-2 py-1.5 sm:py-2 rounded-xl sm:rounded-2xl shadow-lg sm:shadow-2xl shadow-blue-900/10 border border-white/50 flex items-center gap-1.5 sm:gap-2">
                        <span className="hidden sm:inline text-[9px] font-bold text-slate-400 uppercase tracking-widest pl-1">Range</span>
                        <select
                            value={maxDistance}
                            onChange={(e) => setMaxDistance(Number(e.target.value))}
                            className="bg-blue-50 text-blue-900 text-[10px] font-bold px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl border border-blue-100 focus:outline-none cursor-pointer hover:bg-blue-100 transition-colors"
                        >
                            <option value={5}>5 KM</option>
                            <option value={10}>10 KM</option>
                            <option value={20}>20 KM</option>
                            <option value={50}>50 KM</option>
                            <option value={0}>∞ ALL</option>
                        </select>
                    </div>

                    {userLocation && (
                        <div className="hidden sm:flex bg-blue-600 px-3 py-2 rounded-xl shadow-lg shadow-blue-200 items-center gap-2">
                            <div className="h-1.5 w-1.5 bg-white rounded-full animate-pulse"></div>
                            <span className="text-[9px] text-white font-bold uppercase tracking-widest">GPS Active</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Mobile bottom sheet toggle */}
            <button
                onClick={() => setMobileSheetOpen(v => !v)}
                className="sm:hidden absolute bottom-4 left-1/2 -translate-x-1/2 z-30 pointer-events-auto bg-white/95 backdrop-blur-xl shadow-lg border border-slate-200 rounded-full px-4 py-2.5 flex items-center gap-2 text-slate-700 active:scale-95 transition-transform"
            >
                <svg className={`h-4 w-4 transition-transform ${mobileSheetOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" /></svg>
                <span className="text-xs font-bold">{filteredOrders.length} Orders</span>
                <span className="text-[10px] text-slate-400">•</span>
                <span className="text-xs font-bold">{nearbyShops.length} Shops</span>
                {(sendBackToCustomerTasks.length + pickUpLaundryAtShopTasks.length) > 0 && (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-white text-[10px] font-bold">
                        {sendBackToCustomerTasks.length + pickUpLaundryAtShopTasks.length}
                    </span>
                )}
            </button>

            {/* Mobile backdrop */}
            {mobileSheetOpen && (
                <div className="sm:hidden fixed inset-0 bg-black/30 z-20" onClick={() => setMobileSheetOpen(false)} />
            )}

            {/* Side Panel (desktop) / Bottom Sheet (mobile) */}
            <div className={`
                absolute z-20 pointer-events-none flex flex-col gap-4 text-blue-900
                sm:top-28 sm:bottom-6 sm:left-6 sm:w-84
                inset-x-0 bottom-0
                transition-transform duration-300 ease-out
                ${mobileSheetOpen ? 'translate-y-0' : 'translate-y-full sm:translate-y-0'}
            `}>
                <div className="pointer-events-auto flex-1 flex flex-col min-h-0 sm:min-h-0 max-h-[75vh] sm:max-h-none">
                    <div className="bg-white/95 backdrop-blur-xl rounded-t-2xl sm:rounded-2xl shadow-2xl shadow-blue-900/10 border border-white/50 overflow-hidden flex flex-col h-full ring-1 ring-black/[0.02]">
                        {/* Drag handle - mobile only */}
                        <div className="sm:hidden flex justify-center pt-2 pb-1">
                            <div className="h-1 w-10 rounded-full bg-slate-300"></div>
                        </div>
                        <div className="px-4 py-3 sm:p-6 sm:pb-4 border-b border-slate-50 flex items-center justify-between">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Nearby Overview</span>
                            <div className="flex items-center gap-1.5 sm:gap-2">
                                <span className="bg-rose-50 text-rose-600 text-[10px] font-semibold px-2 py-0.5 rounded-lg border border-rose-100">
                                    {nearbyShops.length} Shops
                                </span>
                                <span className="bg-blue-50 text-blue-600 text-[10px] font-semibold px-2 py-0.5 rounded-lg border border-blue-100">
                                    {filteredOrders.length} Orders
                                </span>
                                <span className="bg-emerald-50 text-emerald-600 text-[10px] font-semibold px-2 py-0.5 rounded-lg border border-emerald-100">
                                    {sendBackToCustomerTasks.length} Return
                                </span>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                            {/* Nearby Orders (Top) */}
                            <div className="px-1 pt-1">
                                <button
                                    type="button"
                                    onClick={() => toggleSection('orders')}
                                    className="w-full flex items-center justify-between mb-2"
                                >
                                    <span className="text-[10px] font-black text-blue-900/40 uppercase tracking-[0.2em]">Nearby Orders</span>
                                    <div className="flex items-center gap-2">
                                        <span className="bg-blue-50 text-blue-600 text-[10px] font-black px-2 py-0.5 rounded-lg border border-blue-100">
                                            {filteredOrders.length} Found
                                        </span>
                                        <span className={`text-slate-400 text-xs transition-transform ${openSections.orders ? 'rotate-180' : ''}`}>▾</span>
                                    </div>
                                </button>

                                {filteredOrders.length > 1 && (
                                    <div className="mb-2 flex items-center justify-between gap-2">
                                        <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest">Route Focus</span>
                                        <select
                                            value={nearbyOrderSortMode}
                                            onChange={(e) => setNearbyOrderSortMode(e.target.value as 'distance' | 'time' | 'price')}
                                            className="text-[10px] font-black text-slate-600 bg-white border border-slate-200 rounded-lg px-2 py-1"
                                        >
                                            <option value="distance">Shortest distance</option>
                                            <option value="time">Latest time</option>
                                            <option value="price">Highest price</option>
                                        </select>
                                    </div>
                                )}

                                <div className={`overflow-hidden transition-[max-height] duration-300 ${openSections.orders ? 'max-h-[2000px]' : 'max-h-0'}`}>
                                    <div className="space-y-3 pb-2">
                                        {filteredOrders.length === 0 ? (
                                            <div className="bg-white rounded-3xl p-5 border border-slate-50 shadow-sm">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-12 w-12 bg-slate-50 rounded-2xl flex items-center justify-center text-xl border border-slate-100">🔭</div>
                                                    <div>
                                                        <p className="text-sm font-black text-blue-900">No Jobs Nearby</p>
                                                        <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-wider">Try increasing the range</p>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            sortedFilteredOrders.map((order: Order) => (
                                                <div
                                                    key={order._id}
                                                    className={`bg-white rounded-3xl p-5 border shadow-sm hover:shadow-xl hover:shadow-blue-500/10 transition-all duration-300 group cursor-pointer active:scale-[0.98] ${activeNearbyOrderId === order._id ? 'border-blue-200 ring-2 ring-blue-100' : 'border-slate-50'}`}
                                                    onClick={() => {
                                                        setActiveNearbyOrderId(order._id);
                                                        if (order.location) {
                                                            setMapView({ center: [order.location.lat, order.location.lon], zoom: 16 });
                                                        }
                                                    }}
                                                >
                                                    <div className="flex justify-between items-start mb-3">
                                                        <div className="flex-1 pr-2">
                                                            <h3 className="text-sm font-black text-blue-900 line-clamp-1">{order.customerName || order.productName || 'Order'}</h3>
                                                            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                                                <span className="text-[9px] font-bold text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100 uppercase tracking-tighter">
                                                                    {order.distance} km
                                                                </span>
                                                                <span className="text-[9px] font-bold text-emerald-500 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100 uppercase tracking-tighter">
                                                                    ฿{order.totalPrice}
                                                                </span>
                                                                <span className="text-[9px] font-black text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100 uppercase tracking-tighter">
                                                                    {statusLabel(order.status)}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        {order.status === 'pending' && (
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    acceptOrder(order._id);
                                                                }}
                                                                className="bg-blue-600 text-[10px] font-black text-white px-3 py-2 rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-100"
                                                            >
                                                                Take
                                                            </button>
                                                        )}

                                                        {order.status === 'assigned' && (
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    pickUpOrder(order._id);
                                                                }}
                                                                className="bg-indigo-600 text-[10px] font-black text-white px-3 py-2 rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-100"
                                                            >
                                                                Pick Up
                                                            </button>
                                                        )}
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <div className="flex items-start gap-2">
                                                            <div className="h-1.5 w-1.5 rounded-full bg-blue-400 mt-1 flex-shrink-0"></div>
                                                            <p className="text-[10px] font-bold text-slate-500 line-clamp-1">{order.pickupAddress}</p>
                                                        </div>
                                                        <div className="flex items-start gap-2">
                                                            <div className="h-1.5 w-1.5 rounded-full bg-sky-300 mt-1 flex-shrink-0"></div>
                                                            <p className="text-[10px] font-bold text-slate-400 line-clamp-1">{order.deliveryAddress}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="h-px bg-slate-100 my-1"></div>

                            {/* Nearby Shops */}
                            <div className="px-1 pt-1 pb-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (!openSections.shops) setShopsAlert(false);
                                        toggleSection('shops');
                                    }
                                    }
                                    className="w-full flex items-center justify-between mb-2"
                                >
                                    <span className="flex items-center gap-2 text-[10px] font-black text-blue-900/40 uppercase tracking-[0.2em]">
                                        Nearby Shops
                                        {shopsAlert && (
                                            <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-rose-600 text-white text-[9px] font-black animate-pulse">
                                                !
                                            </span>
                                        )}
                                    </span>
                                    <div className="flex items-center gap-2">
                                        <span className="bg-rose-50 text-rose-600 text-[10px] font-black px-2 py-0.5 rounded-lg border border-rose-100">
                                            {nearbyShops.length} Shops
                                        </span>
                                        <span className={`text-slate-400 text-xs transition-transform ${openSections.shops ? 'rotate-180' : ''}`}>▾</span>
                                    </div>
                                </button>

                                <div className={`overflow-hidden transition-[max-height] duration-300 ${openSections.shops ? 'max-h-[2000px]' : 'max-h-0'}`}>
                                    {/* Search & Sort Controls */}
                                    <div className="flex items-center gap-2 mb-3">
                                        <input
                                            type="text"
                                            value={shopSearch}
                                            onChange={(e) => setShopSearch(e.target.value)}
                                            placeholder="Search shop name..."
                                            className="flex-1 min-w-0 rounded-xl border border-slate-200 bg-white/80 px-3 py-1.5 text-[10px] font-bold text-blue-900 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-200"
                                        />
                                        <select
                                            value={shopSortMode}
                                            onChange={(e) => setShopSortMode(e.target.value as 'distance' | 'name-asc' | 'name-desc')}
                                            className="rounded-xl border border-slate-200 bg-white/80 px-2 py-1.5 text-[10px] font-black text-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-200 cursor-pointer"
                                        >
                                            <option value="distance">Distance</option>
                                            <option value="name-asc">Name A→Z</option>
                                            <option value="name-desc">Name Z→A</option>
                                        </select>
                                    </div>
                                    <div className="space-y-3 pb-2">
                                        {nearbyShops.length === 0 ? (
                                            <div className="bg-white rounded-3xl p-5 border border-slate-50 shadow-sm">
                                                <p className="text-xs font-black text-blue-900">No shops found</p>
                                                <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-wider">Check map data or increase range</p>
                                            </div>
                                        ) : (
                                            nearbyShops.map(({ shop, distance }) => {
                                                const name = shop.shopName || shop.label || 'Shop';
                                                const machineSTotal = Number(shop.machineSizeConfig?.s ?? 0) || 0;
                                                const machineMTotal = Number(shop.machineSizeConfig?.m ?? 0) || 0;
                                                const machineLTotal = Number(shop.machineSizeConfig?.l ?? 0) || 0;
                                                const machineAvailS = Number(shop.machineAvailableS ?? Math.max(0, machineSTotal - Number(shop.machineInUseS ?? 0))) || 0;
                                                const machineAvailM = Number(shop.machineAvailableM ?? Math.max(0, machineMTotal - Number(shop.machineInUseM ?? 0))) || 0;
                                                const machineAvailL = Number(shop.machineAvailableL ?? Math.max(0, machineLTotal - Number(shop.machineInUseL ?? 0))) || 0;
                                                const dryTotal = Number(shop.totalDryingMachines ?? shop.totalWashingMachines ?? 10) || 10;
                                                const dryAvailable = Number(shop.dryMachineAvailable ?? Math.max(0, dryTotal - Number(shop.dryMachineInUse || 0))) || 0;
                                                const shopTasks = myTasksByShopId.get(shop._id);
                                                const counts = shopTasks?.counts;
                                                const totalLaundry = shopTasks?.orders.length || 0;
                                                return (
                                                    <div
                                                        key={shop._id}
                                                        className={`bg-white rounded-3xl p-5 border shadow-sm hover:shadow-xl hover:shadow-rose-500/10 transition-all duration-300 cursor-pointer active:scale-[0.98] ${activeNearbyShopId === shop._id ? 'border-rose-200 ring-2 ring-rose-100' : 'border-slate-50'}`}
                                                        onClick={() => {
                                                            setActiveNearbyShopId(shop._id);
                                                            const coords = shop.location?.coordinates;
                                                            if (Array.isArray(coords) && coords.length >= 2) {
                                                                setMapView({ center: [coords[1], coords[0]], zoom: 15 });
                                                            }
                                                        }}
                                                    >
                                                        <div className="flex items-start justify-between gap-3">
                                                            <div className="min-w-0">
                                                                <p className="text-[9px] font-black text-rose-600 uppercase tracking-widest">shop</p>
                                                                <p className="text-sm font-black text-blue-900 line-clamp-1">{name}</p>
                                                                <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                                                                    {distance !== null && (
                                                                        <span className="text-[9px] font-bold text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100 uppercase tracking-tighter">
                                                                            {distance} km
                                                                        </span>
                                                                    )}
                                                                    <span className="text-[9px] font-black text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100 uppercase tracking-tighter">
                                                                        {totalLaundry} laundry
                                                                    </span>
                                                                    <span className="text-[9px] font-black text-sky-600 bg-sky-50 px-1.5 py-0.5 rounded border border-sky-100 uppercase tracking-tighter">
                                                                        S {machineAvailS}/{machineSTotal} · M {machineAvailM}/{machineMTotal} · L {machineAvailL}/{machineLTotal}
                                                                    </span>
                                                                    <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100 uppercase tracking-tighter">
                                                                        Dry empty {dryAvailable}/{dryTotal}
                                                                    </span>
                                                                </div>
                                                            </div>

                                                            <div className="flex flex-col items-end gap-1">
                                                                <span className="text-[9px] font-black text-sky-700 bg-sky-50 px-2 py-1 rounded-lg border border-sky-100 uppercase tracking-wider">
                                                                    at shop {counts?.at_shop || 0}
                                                                </span>
                                                                <span className="text-[9px] font-black text-amber-700 bg-amber-50 px-2 py-1 rounded-lg border border-amber-100 uppercase tracking-wider">
                                                                    washing {counts?.washing || 0}
                                                                </span>
                                                                <span className="text-[9px] font-black text-blue-700 bg-blue-50 px-2 py-1 rounded-lg border border-blue-100 uppercase tracking-wider">
                                                                    ready {counts?.laundry_done || 0}
                                                                </span>
                                                            </div>
                                                        </div>

                                                        {/* Send picked-up orders to this shop */}
                                                        {pickedUpOrders.length > 0 && (
                                                            <div className="mt-3 pt-3 border-t border-slate-100">
                                                                <div className="mb-2 flex items-center justify-between gap-2">
                                                                    <p className="text-[9px] font-black text-sky-600 uppercase tracking-widest">Send order to this shop</p>
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            sendAllPickedUpToShop(shop._id);
                                                                        }}
                                                                        disabled={!!sendingAllByShopId[shop._id]}
                                                                        className="text-[9px] font-black text-white bg-emerald-600 px-2.5 py-1.5 rounded-xl hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed whitespace-nowrap"
                                                                    >
                                                                        {sendingAllByShopId[shop._id] ? 'Sending...' : `Send all (${pickedUpOrders.length})`}
                                                                    </button>
                                                                </div>
                                                                <div className="space-y-2">
                                                                    {pickedUpOrders.map((order) => (
                                                                        <div key={order._id} className="flex items-center justify-between gap-2 bg-sky-50/50 rounded-xl px-3 py-2 border border-sky-100">
                                                                            <p className="text-[10px] font-bold text-slate-700 line-clamp-1 flex-1">
                                                                                {order.customerName || order.productName || 'Order'}
                                                                            </p>
                                                                            {(() => {
                                                                                const selected = handoverShopByOrderId[order._id] === shop._id;
                                                                                return (
                                                                                    <div className="flex items-center gap-1.5">
                                                                                        <button
                                                                                            onClick={(e) => {
                                                                                                e.stopPropagation();
                                                                                                if (!selected) {
                                                                                                    setHandoverShopByOrderId((prev) => ({
                                                                                                        ...prev,
                                                                                                        [order._id]: shop._id,
                                                                                                    }));

                                                                                                    selectShopForOrder(order._id, shop._id).catch(() => {
                                                                                                        // ignore selection sync errors
                                                                                                    });

                                                                                                    const coords = shop.location?.coordinates;
                                                                                                    if (Array.isArray(coords) && coords.length >= 2) {
                                                                                                        setMapView({ center: [coords[1], coords[0]], zoom: 16 });
                                                                                                    }
                                                                                                    return;
                                                                                                }

                                                                                                handoverToShop(order._id, shop._id);
                                                                                            }}
                                                                                            className={`${selected
                                                                                                ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-100'
                                                                                                : 'bg-sky-600 hover:bg-sky-700 shadow-sky-100'} text-[10px] font-black text-white px-3 py-1.5 rounded-xl transition-colors shadow-lg whitespace-nowrap`}
                                                                                        >
                                                                                            {selected ? 'Send' : 'Select'}
                                                                                        </button>
                                                                                        {selected && (
                                                                                            <button
                                                                                                onClick={(e) => {
                                                                                                    e.stopPropagation();
                                                                                                    cancelShopSelection(order._id);
                                                                                                }}
                                                                                                className="bg-slate-200 text-slate-700 text-[10px] font-black px-2.5 py-1.5 rounded-xl hover:bg-slate-300 transition-colors whitespace-nowrap"
                                                                                            >
                                                                                                Cancel
                                                                                            </button>
                                                                                        )}
                                                                                    </div>
                                                                                );
                                                                            })()}
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="h-px bg-slate-100 my-1"></div>

                            {/* Pick Up Laundry At Shop */}
                            <div className="px-1 pt-1 pb-2">
                                <div
                                    role="button"
                                    tabIndex={0}
                                    onClick={() => {
                                        if (!openSections.pickupAtShop) setPickupAtShopAlert(false);
                                        toggleSection('pickupAtShop');
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                            e.preventDefault();
                                            if (!openSections.pickupAtShop) setPickupAtShopAlert(false);
                                            toggleSection('pickupAtShop');
                                        }
                                    }}
                                    className="w-full flex items-center justify-between mb-2"
                                >
                                    <span className="flex items-center gap-2 text-[10px] font-black text-blue-900/40 uppercase tracking-[0.2em]">
                                        Pick up laundry at shop
                                        {pickupAtShopAlert && (
                                            <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-rose-600 text-white text-[9px] font-black animate-pulse">
                                                !
                                            </span>
                                        )}
                                    </span>
                                    <div className="flex items-center gap-2">
                                        <span className="bg-blue-50 text-blue-600 text-[10px] font-black px-2 py-0.5 rounded-lg border border-blue-100">
                                            {pickUpLaundryAtShopTasks.length} Tasks
                                        </span>
                                        {pickUpLaundryAtShopTasks.length > 0 && (
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    pickUpAllLaundryFromShop(pickUpLaundryAtShopTasks);
                                                }}
                                                disabled={pickingUpAllLaundry}
                                                className="bg-blue-600 text-white text-[10px] font-black px-2 py-0.5 rounded-lg border border-blue-700 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
                                            >
                                                {pickingUpAllLaundry ? 'Picking...' : `Pick Up All (${pickUpLaundryAtShopTasks.length})`}
                                            </button>
                                        )}
                                        <span className={`text-slate-400 text-xs transition-transform ${openSections.pickupAtShop ? 'rotate-180' : ''}`}>▾</span>
                                    </div>
                                </div>

                                {sortedPickupAtShopTasks.length > 1 && (
                                    <div className="mb-2 flex items-center justify-between gap-2">
                                        <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest">Route Focus</span>
                                        <select
                                            value={pickupAtShopSortMode}
                                            onChange={(e) => setPickupAtShopSortMode(e.target.value as 'distance' | 'time')}
                                            className="text-[10px] font-black text-slate-600 bg-white border border-slate-200 rounded-lg px-2 py-1"
                                        >
                                            <option value="distance">Shortest distance</option>
                                            <option value="time">Latest time</option>
                                        </select>
                                    </div>
                                )}

                                <div className={`overflow-hidden transition-[max-height] duration-300 ${openSections.pickupAtShop ? 'max-h-[2000px]' : 'max-h-0'}`}>
                                    <div className="space-y-3 pb-2">
                                        {pickUpLaundryAtShopTasks.length === 0 ? (
                                            <div className="bg-white rounded-3xl p-5 border border-slate-50 shadow-sm">
                                                <p className="text-xs font-black text-blue-900">No pickups at shop right now</p>
                                                <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-wider">When shop finishes washing, it will show here</p>
                                            </div>
                                        ) : (
                                            pickUpLaundryAtShopTasks.map((order) => {
                                                const shop = order.shopId ? shopsById.get(String(order.shopId)) : undefined;
                                                const shopName = shop?.shopName || shop?.label || 'Shop';
                                                const coords = shop?.location?.coordinates;
                                                const shopLat = Array.isArray(coords) && coords.length >= 2 ? coords[1] : null;
                                                const shopLon = Array.isArray(coords) && coords.length >= 2 ? coords[0] : null;
                                                const distanceKm =
                                                    userLocation && typeof shopLat === 'number' && typeof shopLon === 'number'
                                                        ? parseFloat(calculateDistance(userLocation.lat, userLocation.lon, shopLat, shopLon).toFixed(1))
                                                        : null;

                                                return (
                                                    <div
                                                        key={order._id}
                                                        className="bg-white rounded-3xl p-5 border border-slate-50 shadow-sm hover:shadow-xl hover:shadow-blue-500/10 transition-all duration-300 cursor-pointer active:scale-[0.98]"
                                                        onClick={() => {
                                                            if (typeof shopLat === 'number' && typeof shopLon === 'number') {
                                                                setMapView({ center: [shopLat, shopLon], zoom: 16 });
                                                            }
                                                        }}
                                                    >
                                                        <div className="flex items-start justify-between gap-3">
                                                            <div className="min-w-0 flex-1">
                                                                <p className="text-[9px] font-black text-blue-600 uppercase tracking-widest">pickup at shop</p>
                                                                <p className="text-sm font-black text-blue-900 line-clamp-1">{order.customerName || order.productName || 'Order'}</p>
                                                                {Array.isArray(order.images) && order.images.length > 0 ? (
                                                                    <img
                                                                        src={resolveAssetUrl(order.images[0])}
                                                                        alt={order.productName || order.customerName || 'Order image'}
                                                                        className="mt-2 h-20 w-full max-w-[180px] rounded-xl object-cover border border-slate-100 cursor-zoom-in"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            openImageZoom(order.images?.[0], order.productName || order.customerName || 'Order image');
                                                                        }}
                                                                    />
                                                                ) : (
                                                                    <div className="mt-2 h-20 w-full max-w-[180px] rounded-xl border border-slate-100 bg-slate-50 text-[10px] font-black text-slate-400 flex items-center justify-center uppercase tracking-widest">
                                                                        No image
                                                                    </div>
                                                                )}
                                                                <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                                                                    <span className="text-[9px] font-black text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100 uppercase tracking-tighter">
                                                                        {shopName}
                                                                    </span>
                                                                    {distanceKm !== null && (
                                                                        <span className="text-[9px] font-bold text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100 uppercase tracking-tighter">
                                                                            {distanceKm} km
                                                                        </span>
                                                                    )}
                                                                    <span className="text-[9px] font-black text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100 uppercase tracking-tighter">
                                                                        {statusLabel(order.status)}
                                                                    </span>
                                                                </div>
                                                            </div>

                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    pickUpLaundryFromShop(order._id);
                                                                }}
                                                                className="bg-blue-600 text-[10px] font-black text-white px-3 py-2 rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-100"
                                                            >
                                                                Pick up
                                                            </button>
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="h-px bg-slate-100 my-1"></div>

                            {/* Send Back To Customer */}
                            <div className="px-1 pt-1 pb-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (!openSections.sendBack) setSendBackAlert(false);
                                        toggleSection('sendBack');
                                    }}
                                    className="w-full flex items-center justify-between mb-2"
                                >
                                    <span className="flex items-center gap-2 text-[10px] font-black text-blue-900/40 uppercase tracking-[0.2em]">
                                        Send back to customer
                                        {sendBackAlert && (
                                            <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-rose-600 text-white text-[9px] font-black animate-pulse">
                                                !
                                            </span>
                                        )}
                                    </span>
                                    <div className="flex items-center gap-2">
                                        <span className="bg-emerald-50 text-emerald-600 text-[10px] font-black px-2 py-0.5 rounded-lg border border-emerald-100">
                                            {sendBackToCustomerTasks.length} Tasks
                                        </span>
                                        <span className={`text-slate-400 text-xs transition-transform ${openSections.sendBack ? 'rotate-180' : ''}`}>▾</span>
                                    </div>
                                </button>

                                {sortedSendBackToCustomerTasks.length > 1 && (
                                    <div className="mb-2 flex items-center justify-between gap-2">
                                        <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Route Focus</span>
                                        <select
                                            value={sendBackSortMode}
                                            onChange={(e) => setSendBackSortMode(e.target.value as 'distance' | 'time')}
                                            className="text-[10px] font-black text-slate-600 bg-white border border-slate-200 rounded-lg px-2 py-1"
                                        >
                                            <option value="distance">Shortest distance</option>
                                            <option value="time">Latest time</option>
                                        </select>
                                    </div>
                                )}

                                <div className={`overflow-hidden transition-[max-height] duration-300 ${openSections.sendBack ? 'max-h-[2000px]' : 'max-h-0'}`}>
                                    <div className="space-y-3 pb-2">
                                        {sortedSendBackToCustomerTasks.length === 0 ? (
                                            <div className="bg-white rounded-3xl p-5 border border-slate-50 shadow-sm">
                                                <p className="text-xs font-black text-blue-900">No return deliveries right now</p>
                                                <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-wider">After you pick up laundry at shop, it will show here</p>
                                            </div>
                                        ) : (
                                            sortedSendBackToCustomerTasks.map((order) => (
                                                <div
                                                    key={order._id}
                                                    className={`bg-white rounded-3xl p-5 border shadow-sm hover:shadow-xl hover:shadow-emerald-500/10 transition-all duration-300 cursor-pointer active:scale-[0.98] ${activeSendBackOrderId === order._id ? 'border-emerald-200 ring-2 ring-emerald-100' : 'border-slate-50'}`}
                                                    onClick={() => {
                                                        setActiveSendBackOrderId(order._id);
                                                        const lat = order.deliveryLocation?.coordinates?.[1] ?? order.location?.lat;
                                                        const lon = order.deliveryLocation?.coordinates?.[0] ?? order.location?.lon;
                                                        if (typeof lat === 'number' && typeof lon === 'number') {
                                                            setMapView({ center: [lat, lon], zoom: 16 });
                                                        }
                                                    }}
                                                >
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div className="min-w-0">
                                                            <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">return delivery</p>
                                                            <p className="text-sm font-black text-blue-900 line-clamp-1">{order.customerName || order.productName || 'Order'}</p>
                                                            {Array.isArray(order.images) && order.images.length > 0 ? (
                                                                <img
                                                                    src={resolveAssetUrl(order.images[0])}
                                                                    alt={order.productName || order.customerName || 'Order image'}
                                                                    className="mt-2 h-20 w-full max-w-[180px] rounded-xl object-cover border border-slate-100 cursor-zoom-in"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        openImageZoom(order.images?.[0], order.productName || order.customerName || 'Order image');
                                                                    }}
                                                                />
                                                            ) : (
                                                                <div className="mt-2 h-20 w-full max-w-[180px] rounded-xl border border-slate-100 bg-slate-50 text-[10px] font-black text-slate-400 flex items-center justify-center uppercase tracking-widest">
                                                                    No image
                                                                </div>
                                                            )}
                                                            <p className="text-[10px] font-bold text-slate-400 mt-1 line-clamp-2">{order.deliveryAddress}</p>
                                                            <div className="flex items-center gap-1.5 mt-2">
                                                                <span className="text-[9px] font-black text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100 uppercase tracking-tighter">
                                                                    {statusLabel(order.status)}
                                                                </span>
                                                            </div>
                                                        </div>

                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                completeDelivery(order._id);
                                                            }}
                                                            className="bg-emerald-600 text-[10px] font-black text-white px-3 py-2 rounded-xl hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-100"
                                                        >
                                                            Delivered
                                                        </button>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {zoomedImageUrl && (
                <div
                    className="fixed inset-0 z-[9999] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4"
                    onClick={closeImageZoom}
                >
                    <div className="relative max-w-5xl w-full flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
                        <button
                            type="button"
                            onClick={closeImageZoom}
                            className="absolute -top-3 -right-3 h-9 w-9 rounded-full bg-white text-slate-700 text-lg font-black shadow-lg hover:bg-slate-100"
                            aria-label="Close image preview"
                        >
                            ×
                        </button>
                        <img
                            src={zoomedImageUrl}
                            alt={zoomedImageAlt}
                            className="max-h-[85vh] w-auto max-w-full rounded-2xl border border-white/20 shadow-2xl"
                        />
                    </div>
                </div>
            )}

        </div>
    );
}
