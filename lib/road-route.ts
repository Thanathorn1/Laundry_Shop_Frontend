/**
 * =============================================================================
 * ระบบคำนวณเส้นทางถนน (Road Route System)
 * =============================================================================
 * 
 * ไฟล์นี้ใช้คำนวณเส้นทางถนนจริงระหว่าง 2 จุด โดยเรียก OSRM API (Open Source Routing Machine)
 * 
 * วิธีการทำงาน:
 * 1. รับพิกัดต้นทาง (from) และปลายทาง (to) เป็น [lat, lng]
 * 2. เช็ค cache ก่อน - ถ้ามีผลลัพธ์เดิมที่ยังไม่หมดอายุ ใช้เลย (ประหยัด API call)
 * 3. ถ้าไม่มี cache -> เรียก OSRM server เพื่อขอเส้นทาง
 * 4. OSRM จะคืน geometry (จุดพิกัดหลายจุดที่เป็นเส้นทางถนน)
 * 5. แปลงผลลัพธ์เป็น array ของ [lat, lng] สำหรับวาดเส้นบนแผนที่
 * 
 * ใช้ใน:
 * - Rider: วาดเส้นทางจากตำแหน่งไรเดอร์ไปยังจุดรับ/ร้าน/ส่งคืน
 * - Customer: วาดเส้นทางติดตามออเดอร์ (ไรเดอร์กำลังมา)
 * - Employee: วาดเส้นทางไรเดอร์ที่กำลังมาร้าน
 * =============================================================================
 */

// ประเภทข้อมูลพิกัด [latitude, longitude]
export type LatLngTuple = [number, number];

// ผลลัพธ์จากการคำนวณเส้นทาง
export type RoadRouteResult = {
  points: LatLngTuple[];      // จุดพิกัดทั้งหมดที่ประกอบเป็นเส้นทาง (สำหรับวาด Polyline)
  distanceKm: number | null;  // ระยะทางรวม (กิโลเมตร)
  durationMin: number | null; // เวลาเดินทางโดยประมาณ (นาที)
};

import { API_BASE_URL } from './api';

// ======== ระบบ Cache & Deduplication ========

// Cache เก็บผลลัพธ์เส้นทางไว้ 60 วินาที เพื่อไม่ต้องเรียก API ซ้ำบ่อยเกินไป
const ROUTE_CACHE_TTL_MS = 60_000;
// Map สำหรับเก็บ cache: key = "lat,lng->lat,lng", value = { expiresAt, data }
const routeCache = new Map<string, { expiresAt: number; data: RoadRouteResult }>();

// ถ้าเรียก API ล้มเหลว จะ cooldown 5 วินาทีก่อนลองใหม่ (ป้องกันยิง API ซ้ำเมื่อ server มีปัญหา)
const ROUTE_FAILURE_COOLDOWN_MS = 5_000;
const routeFailureCooldown = new Map<string, number>();

// เก็บ request ที่กำลังรอผลอยู่ — ถ้ามี request เดิมกำลังทำอยู่ จะไม่ส่งซ้ำ (deduplication)
const inFlightRequests = new Map<string, Promise<RoadRouteResult>>();

// ======== Helper Functions ========

// ปัดเศษพิกัดเหลือ 5 ตำแหน่ง (~1 เมตร) เพื่อให้พิกัดที่เกือบเท่ากัน hit cache เดียวกัน
// เช่น 13.756301 กับ 13.756299 จะปัดเป็น 13.7563 เหมือนกัน
const roundCoord = (value: number) => Math.round(value * 100000) / 100000;

// สร้าง key สำหรับ cache จากพิกัดต้นทาง->ปลายทาง
// ตัวอย่าง: "13.7563,100.5018->13.8,100.6"
const routeCacheKey = (from: LatLngTuple, to: LatLngTuple) =>
  `${roundCoord(from[0])},${roundCoord(from[1])}->${roundCoord(to[0])},${roundCoord(to[1])}`;


function apiUrl(path: string) {
  const base = API_BASE_URL.replace(/\/+$/, '');
  const suffix = path.startsWith('/') ? path : `/${path}`;
  return `${base}${suffix}`;
}

async function fetchBackendRoadRoute(
  from: LatLngTuple,
  to: LatLngTuple,
): Promise<RoadRouteResult | null> {
  if (!API_BASE_URL) return null;

  try {
    const token = typeof window !== 'undefined'
      ? localStorage.getItem('access_token')
      : null;

    const url = apiUrl(
      `/map/road-route?fromLat=${encodeURIComponent(from[0])}&fromLng=${encodeURIComponent(from[1])}&toLat=${encodeURIComponent(to[0])}&toLng=${encodeURIComponent(to[1])}`,
    );

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    if (!response.ok) return null;

    const data = (await response.json()) as Partial<RoadRouteResult>;
    const points = Array.isArray(data?.points)
      ? data.points.filter(
          (coord): coord is LatLngTuple =>
            Array.isArray(coord) &&
            coord.length >= 2 &&
            Number.isFinite(Number(coord[0])) &&
            Number.isFinite(Number(coord[1])),
        )
      : [];

    if (points.length < 2) return null;

    return {
      points,
      distanceKm:
        typeof data.distanceKm === 'number' && Number.isFinite(data.distanceKm)
          ? data.distanceKm
          : null,
      durationMin:
        typeof data.durationMin === 'number' && Number.isFinite(data.durationMin)
          ? data.durationMin
          : null,
    };
  } catch {
    return null;
  }
}

/**
 * ฟังก์ชันหลักสำหรับดึงเส้นทางถนน
 * 
 * การใช้งาน:
 * const route = await fetchRoadRoute([13.7563, 100.5018], [13.8, 100.6]);
 * // route.points -> ใช้วาด Polyline บนแผนที่
 * // route.distanceKm -> แสดงระยะทาง
 * // route.durationMin -> แสดงเวลาเดินทาง
 */
export async function fetchRoadRoute(from: LatLngTuple, to: LatLngTuple): Promise<RoadRouteResult> {
  const key = routeCacheKey(from, to);
  const now = Date.now();
  const cached = routeCache.get(key);

  // ถ้ามี cache และยังไม่หมดอายุ -> ใช้เลย (ไม่ต้องเรียก API)
  if (cached && cached.expiresAt > now) {
    return cached.data;
  }

  const cooldownUntil = routeFailureCooldown.get(key) || 0;
  if (cooldownUntil > now) {
    return cached?.data || {
      points: [],
      distanceKm: null,
      durationMin: null,
    };
  }

  const existingInFlight = inFlightRequests.get(key);
  if (existingInFlight) {
    return existingInFlight;
  }

  const requestPromise = (async () => {
    const result = await fetchBackendRoadRoute(from, to);
    if (result) {
      routeFailureCooldown.delete(key);
      routeCache.set(key, { expiresAt: now + ROUTE_CACHE_TTL_MS, data: result });
      return result;
    }

    routeFailureCooldown.set(key, now + ROUTE_FAILURE_COOLDOWN_MS);

    if (cached) {
      return cached.data;
    }

    return {
      points: [],
      distanceKm: null,
      durationMin: null,
    };
  })();

  inFlightRequests.set(key, requestPromise);

  try {
    return await requestPromise;
  } finally {
    inFlightRequests.delete(key);
  }
}
