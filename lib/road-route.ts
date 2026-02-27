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

// Cache เก็บผลลัพธ์เส้นทางไว้ 20 วินาที เพื่อไม่ต้องเรียก API ซ้ำบ่อยเกินไป
const ROUTE_CACHE_TTL_MS = 20_000;
const routeCache = new Map<string, { expiresAt: number; data: RoadRouteResult }>();

// ปัดเศษพิกัดให้เหมือนกัน (ป้องกัน cache miss จากความแตกต่างเล็กน้อย)
const roundCoord = (value: number) => Math.round(value * 100000) / 100000;

// สร้าง key สำหรับ cache จากพิกัดต้นทาง->ปลายทาง
const routeCacheKey = (from: LatLngTuple, to: LatLngTuple) =>
  `${roundCoord(from[0])},${roundCoord(from[1])}->${roundCoord(to[0])},${roundCoord(to[1])}`;

// รายการ OSRM server ที่ใช้ได้ - ลองทีละตัวจนกว่าจะสำเร็จ (fallback)
const OSRM_SERVERS = [
  'https://router.project-osrm.org',
  'https://routing.openstreetmap.de/routed-car',
];

/**
 * ลองเรียก OSRM server แต่ละตัว
 * - สร้าง URL สำหรับ driving route (รถยนต์)
 * - timeout 8 วินาที ถ้านานกว่านั้นถือว่า fail
 * - แปลง GeoJSON coordinates เป็น [lat, lng] array
 */
async function tryOsrmServer(server: string, from: LatLngTuple, to: LatLngTuple): Promise<RoadRouteResult | null> {
  try {
    // OSRM ใช้รูปแบบ lng,lat (ตรงข้ามกับ Leaflet ที่ใช้ lat,lng)
    const url = `${server}/route/v1/driving/${from[1]},${from[0]};${to[1]},${to[0]}?overview=full&geometries=geojson`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (!res.ok) return null;

    const data = await res.json();
    const route = Array.isArray(data?.routes) ? data.routes[0] : null;
    const coordinates = Array.isArray(route?.geometry?.coordinates) ? route.geometry.coordinates : [];

    const points: LatLngTuple[] = coordinates
      .filter((coord: unknown) => Array.isArray(coord) && coord.length >= 2)
      .map((coord: unknown) => {
        const c = coord as [number, number];
        return [Number(c[1]), Number(c[0])] as LatLngTuple;
      })
      .filter((coord: LatLngTuple) => Number.isFinite(coord[0]) && Number.isFinite(coord[1]));

    if (points.length < 2) return null;

    return {
      points,
      distanceKm: Number.isFinite(route?.distance) ? Number(route.distance) / 1000 : null,
      durationMin: Number.isFinite(route?.duration) ? Number(route.duration) / 60 : null,
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

  for (const server of OSRM_SERVERS) {
    const result = await tryOsrmServer(server, from, to);
    if (result) {
      routeCache.set(key, { expiresAt: now + ROUTE_CACHE_TTL_MS, data: result });
      return result;
    }
  }

  // All servers failed — return empty points so callers can skip drawing any line
  return {
    points: [],
    distanceKm: null,
    durationMin: null,
  };
}
