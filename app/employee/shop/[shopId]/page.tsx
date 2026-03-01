"use client";

import { useEffect, useState } from 'react';
import { apiFetch, API_BASE_URL } from '@/lib/api';
import { useParams } from 'next/navigation';
import { io } from 'socket.io-client';
import { calculateOrderPriceSummary, getWashUnitPrice, getWeightCategoryLabel } from '@/lib/pricing';

type EmployeeInfo = {
  _id?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
};

type CustomerInfo = {
  _id?: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
};

type ShopOrder = {
  _id: string;
  productName?: string;
  status: string;
  laundryType?: 'wash' | 'dry';
  weightCategory?: 's' | 'm' | 'l' | '0-4' | '6-10' | '10-20';
  serviceTimeMinutes?: number;
  pickupType?: 'now' | 'schedule';
  pickupAddress?: string;
  deliveryAddress?: string;
  totalPrice?: number;
  images?: string[];
  customerId?: CustomerInfo;
  employeeId?: EmployeeInfo;
};

type MyEmployeeProfile = {
  _id: string;
  role?: 'user' | 'rider' | 'employee' | 'admin';
  assignedShopId?: string | null;
  assignedShopIds?: string[];
};

type ShopInfo = {
  _id: string;
  shopName?: string;
  totalWashingMachines?: number;
  totalDryingMachines?: number;
  machineSizeConfig?: { s?: number; m?: number; l?: number };
  machineAvailable?: number;
  dryMachineAvailable?: number;
  machineAvailableS?: number;
  machineAvailableM?: number;
  machineAvailableL?: number;
  machineTotalS?: number;
  machineTotalM?: number;
  machineTotalL?: number;
};

type JoinRequestEmployee = {
  _id: string;
  email: string;
  firstName?: string;
  lastName?: string;
};

const ASSET_BASE_URL = API_BASE_URL.replace(/\/api\/?$/, '');

function resolveAssetUrl(value?: string) {
  if (!value) return '';
  if (value.startsWith('http://') || value.startsWith('https://') || value.startsWith('data:image/')) {
    return value;
  }
  return `${ASSET_BASE_URL}${value.startsWith('/') ? value : `/${value}`}`;
}

function getUserIdFromAccessToken(token: string | null) {
  if (!token) return null;
  try {
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

export default function EmployeeShopPage() {
  const params = useParams<{ shopId: string }>();
  const shopId = String(params?.shopId || '');
  const [orders, setOrders] = useState<ShopOrder[]>([]);
  const [me, setMe] = useState<MyEmployeeProfile | null>(null);
  const [shopInfo, setShopInfo] = useState<ShopInfo | null>(null);
  const [joinRequests, setJoinRequests] = useState<JoinRequestEmployee[]>([]);
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinActionId, setJoinActionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [zoomImage, setZoomImage] = useState<string | null>(null);

  const isMemberOfShop = (value: MyEmployeeProfile | null, targetShopId: string) => {
    if (!value || !targetShopId) return false;
    if (value.assignedShopId && String(value.assignedShopId) === String(targetShopId)) return true;
    return Array.isArray(value.assignedShopIds) && value.assignedShopIds.map(String).includes(String(targetShopId));
  };

  const canManageJoinRequests = isMemberOfShop(me, shopId) || me?.role === 'admin';

  const fetchShopInfo = () => {
    if (!shopId) return;
    apiFetch(`/employee/shops/${shopId}/info`)
      .then((data) => setShopInfo(data as ShopInfo))
      .catch(() => {});
  };

  const fetchOrders = async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    if (!shopId) {
      setOrders([]);
      if (!silent) setLoading(false);
      return;
    }
    try {
      const data = await apiFetch(`/employee/shops/${shopId}/orders`);
      setOrders(Array.isArray(data) ? data : []);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to load shop orders';
      if (!silent) setError(msg);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [shopId]);

  useEffect(() => {
    fetchShopInfo();
  }, [shopId]);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    const userId = getUserIdFromAccessToken(token);
    if (!userId || !shopId) return;

    const socketBaseUrl = API_BASE_URL.replace(/\/api\/?$/, '');
    const socket = io(socketBaseUrl, {
      transports: ['websocket'],
    });

    socket.on('connect', () => {
      socket.emit('register', { userId, shopId });
    });

    socket.on('order:update', (order: any) => {
      const incomingShopId = order?.shopId ? String(order.shopId) : '';
      if (incomingShopId && incomingShopId === shopId) {
        fetchOrders(true);
        fetchShopInfo();
      }
    });

    return () => {
      socket.off('order:update');
      socket.disconnect();
    };
  }, [shopId]);

  // Polling fallback: refresh orders + machine availability every 5 seconds
  useEffect(() => {
    if (!shopId) return;
    const interval = setInterval(() => {
      fetchOrders(true);
      fetchShopInfo();
    }, 5000);
    return () => clearInterval(interval);
  }, [shopId]);

  useEffect(() => {
    const loadMe = async () => {
      try {
        const meData = (await apiFetch('/customers/me')) as MyEmployeeProfile;
        setMe(meData);
      } catch {
        setMe(null);
      }
    };
    loadMe();
  }, []);

  useEffect(() => {
    const loadJoinRequests = async () => {
      if (!shopId || !canManageJoinRequests) {
        setJoinRequests([]);
        return;
      }

      try {
        setJoinLoading(true);
        const data = await apiFetch(`/employee/shops/${shopId}/join-requests`);
        setJoinRequests(Array.isArray(data) ? data : []);
      } catch {
        setJoinRequests([]);
      } finally {
        setJoinLoading(false);
      }
    };

    loadJoinRequests();
  }, [shopId, canManageJoinRequests]);

  const resolveJoinRequest = async (employeeId: string, action: 'approve' | 'reject') => {
    try {
      setJoinActionId(employeeId);
      await apiFetch(`/employee/join-requests/${employeeId}`, {
        method: 'PATCH',
        body: JSON.stringify({ action }),
      });
      const data = await apiFetch(`/employee/shops/${shopId}/join-requests`);
      setJoinRequests(Array.isArray(data) ? data : []);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to resolve join request');
    } finally {
      setJoinActionId(null);
    }
  };

  const startWash = async (orderId: string) => {
    try {
      await apiFetch(`/employee/orders/${orderId}/start-wash`, { method: 'PATCH' });
      fetchOrders();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to start wash');
    }
  };

  const finishWash = async (orderId: string) => {
    try {
      await apiFetch(`/employee/orders/${orderId}/finish-wash`, { method: 'PATCH' });
      fetchOrders();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to finish wash');
    }
  };

  const finishDry = async (orderId: string) => {
    try {
      await apiFetch(`/employee/orders/${orderId}/finish-dry`, { method: 'PATCH' });
      fetchOrders();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to finish dry');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black text-blue-900 tracking-tight">Shop Orders</h1>
        <p className="text-blue-700/60 text-sm font-medium">Update laundry steps for each order in this shop.</p>
      </div>

      {/* Machine availability panel */}
      {shopInfo && (
        <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
          <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Machine Availability</h2>
          <div className="flex flex-wrap gap-3">
            {/* Wash per size */}
            {([
              { label: 'S (0–4 kg)', avail: shopInfo.machineAvailableS ?? 0, total: shopInfo.machineTotalS ?? Number(shopInfo.machineSizeConfig?.s) ?? 0 },
              { label: 'M (6–10 kg)', avail: shopInfo.machineAvailableM ?? 0, total: shopInfo.machineTotalM ?? Number(shopInfo.machineSizeConfig?.m) ?? 0 },
              { label: 'L (10–20 kg)', avail: shopInfo.machineAvailableL ?? 0, total: shopInfo.machineTotalL ?? Number(shopInfo.machineSizeConfig?.l) ?? 0 },
            ] as { label: string; avail: number; total: number }[]).map(({ label, avail, total }) => {
              const isFull = avail === 0;
              return (
                <div key={label} className={`flex flex-col items-center rounded-2xl border px-4 py-3 min-w-[90px] ${isFull ? 'border-rose-200 bg-rose-50' : 'border-sky-100 bg-sky-50'}`}>
                  <span className={`text-[10px] font-black uppercase tracking-wider ${isFull ? 'text-rose-500' : 'text-sky-500'}`}>Wash {label}</span>
                  <span className={`text-xl font-black mt-1 ${isFull ? 'text-rose-700' : 'text-sky-700'}`}>{avail}<span className="text-sm font-bold text-slate-400">/{total}</span></span>
                  <span className="text-[9px] text-slate-400 mt-0.5 font-semibold">empty slots</span>
                </div>
              );
            })}
            {/* Dry machines */}
            {(() => {
              const dryAvail = shopInfo.dryMachineAvailable ?? 0;
              const dryTotal = shopInfo.totalDryingMachines ?? 0;
              const isFull = dryAvail === 0;
              return (
                <div className={`flex flex-col items-center rounded-2xl border px-4 py-3 min-w-[90px] ${isFull ? 'border-rose-200 bg-rose-50' : 'border-emerald-100 bg-emerald-50'}`}>
                  <span className={`text-[10px] font-black uppercase tracking-wider ${isFull ? 'text-rose-500' : 'text-emerald-600'}`}>Dry Machines</span>
                  <span className={`text-xl font-black mt-1 ${isFull ? 'text-rose-700' : 'text-emerald-700'}`}>{dryAvail}<span className="text-sm font-bold text-slate-400">/{dryTotal}</span></span>
                  <span className="text-[9px] text-slate-400 mt-0.5 font-semibold">empty slots</span>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {loading && <p className="text-sm text-blue-700/70">Loading orders...</p>}
      {error && <p className="text-sm text-rose-600">Error: {error}</p>}

      {canManageJoinRequests && (
        <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-black text-blue-900">Join Requests</h2>
          {joinLoading ? (
            <p className="mt-3 text-sm text-blue-600">Loading join requests...</p>
          ) : joinRequests.length === 0 ? (
            <p className="mt-3 text-sm text-blue-600">No pending requests.</p>
          ) : (
            <div className="mt-4 space-y-3">
              {joinRequests.map((item) => {
                const fullName = `${item.firstName || ''} ${item.lastName || ''}`.trim() || item.email;
                const busy = joinActionId === item._id;
                return (
                  <div key={item._id} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 p-3">
                    <div>
                      <p className="text-sm font-bold text-blue-900">{fullName}</p>
                      <p className="text-xs text-blue-600">{item.email}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => resolveJoinRequest(item._id, 'approve')}
                        disabled={busy}
                        className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => resolveJoinRequest(item._id, 'reject')}
                        disabled={busy}
                        className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-black text-rose-700 hover:bg-rose-100 disabled:opacity-50"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {orders.map((order) => {
          const customerName = `${order.customerId?.firstName || ''} ${order.customerId?.lastName || ''}`.trim() || 'Customer';
          const employeeName = `${order.employeeId?.firstName || ''} ${order.employeeId?.lastName || ''}`.trim() || order.employeeId?.email || '-';
          const isDryOnlyLaundry = order.laundryType === 'dry';
          const canStartWash = !isDryOnlyLaundry && order.status === 'at_shop';
          const canFinishWash = !isDryOnlyLaundry && order.status === 'washing';
          const canStartDry = isDryOnlyLaundry && order.status === 'at_shop';
          const canFinishDry = order.status === 'drying';
          const isLaundryDone = order.status === 'laundry_done';
          const statusLabel = order.status;
          const stageLabel = (() => {
            if (isLaundryDone) return isDryOnlyLaundry ? 'อบผ้าเสร็จแล้ว' : 'ซัก+อบเสร็จ';
            if (order.status === 'washing') return 'กำลังซัก';
            if (order.status === 'drying') return 'กำลังอบผ้า';
            if (order.status === 'at_shop') return isDryOnlyLaundry ? 'รอเริ่มอบผ้า' : 'รอเริ่มซัก';
            if (order.status === 'out_for_delivery') return 'ออกส่งลูกค้าแล้ว';
            if (order.status === 'completed') return 'เสร็จสิ้น';
            if (order.status === 'assigned') return 'ไรเดอร์รับงานแล้ว';
            if (order.status === 'picked_up') return 'ไรเดอร์รับผ้าแล้ว';
            return isDryOnlyLaundry ? 'เตรียมอบผ้า' : 'รอดำเนินการ';
          })();
          const displayServiceTime = typeof order.serviceTimeMinutes === 'number' ? order.serviceTimeMinutes : 50;
          const unitPrice = isDryOnlyLaundry ? 20 : getWashUnitPrice(order.weightCategory);
          const priceSummary = calculateOrderPriceSummary({
            laundryType: order.laundryType,
            weightCategory: order.weightCategory,
            serviceTimeMinutes: order.serviceTimeMinutes,
            pickupType: order.pickupType,
          });
          const washPrice = priceSummary.washPrice;
          const dryPrice = priceSummary.dryPrice;
          const displayPrice = typeof order.totalPrice === 'number' && order.totalPrice > 0 ? order.totalPrice : priceSummary.totalPrice;

          // Status color mapping
          const statusColor = (() => {
            switch (order.status) {
              case 'at_shop': return 'bg-amber-50 text-amber-700 border-amber-200';
              case 'washing': return 'bg-sky-50 text-sky-700 border-sky-200';
              case 'drying': return 'bg-purple-50 text-purple-700 border-purple-200';
              case 'laundry_done': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
              default: return 'bg-slate-50 text-slate-600 border-slate-200';
            }
          })();

          return (
            <div key={order._id} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
              {/* Header: Name + Status */}
              <div className="flex items-center justify-between gap-2 mb-2">
                <h3 className="text-sm font-bold text-blue-900 truncate">{order.productName || 'Laundry Order'}</h3>
                <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ${statusColor}`}>{statusLabel}</span>
              </div>

              {/* Info rows */}
              <div className="space-y-0.5 text-[11px] text-slate-500">
                <div className="flex gap-1"><span className="font-semibold text-slate-700">Customer:</span> {customerName}</div>
                <div className="flex gap-1"><span className="font-semibold text-slate-700">Employee:</span> {employeeName}</div>
                <div className="flex gap-1 flex-wrap">
                  <span className="font-semibold text-slate-700">Type:</span>
                  <span>{isDryOnlyLaundry ? 'Dry Only' : 'Wash + Dry'}</span>
                  {order.weightCategory && <span className="text-slate-400">• {getWeightCategoryLabel(order.weightCategory)}</span>}
                  {typeof order.serviceTimeMinutes === 'number' && <span className="text-slate-400">• {order.serviceTimeMinutes}min</span>}
                </div>
              </div>

              {/* Stage badge */}
              <div className="mt-2 flex items-center gap-1.5">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-indigo-500"></span>
                <span className="text-[11px] font-semibold text-indigo-700">{stageLabel}</span>
              </div>

              {/* Pickup / Delivery */}
              <div className="mt-2 grid grid-cols-2 gap-1 text-[11px]">
                <div className="truncate"><span className="font-semibold text-slate-700">Pickup:</span> {order.pickupAddress || '-'}</div>
                <div className="truncate"><span className="font-semibold text-slate-700">Delivery:</span> {order.deliveryAddress || '-'}</div>
              </div>

              {/* Price compact */}
              <div className="mt-2 rounded-lg bg-emerald-50 border border-emerald-100 px-2.5 py-1.5">
                <div className="flex items-baseline justify-between">
                  <span className="text-xs font-bold text-emerald-800">฿{displayPrice.toLocaleString()}</span>
                  <span className="text-[10px] text-emerald-600">ซัก/อบ ฿{(washPrice + dryPrice).toLocaleString()} + ค่าส่ง</span>
                </div>
              </div>

              {/* Images - compact thumbnails with click-to-zoom */}
              {Array.isArray(order.images) && order.images.length > 0 && (
                <div className="mt-2 flex gap-1">
                  {order.images.slice(0, 3).map((image, index) => (
                    <button
                      key={`${order._id}-img-${index}`}
                      onClick={() => setZoomImage(resolveAssetUrl(image))}
                      className="overflow-hidden rounded-lg border border-slate-200 bg-slate-50 h-12 w-12 shrink-0 cursor-zoom-in hover:ring-2 hover:ring-blue-400 transition-all"
                    >
                      <img
                        src={resolveAssetUrl(image)}
                        alt={`Basket ${index + 1}`}
                        className="h-full w-full object-cover"
                      />
                    </button>
                  ))}
                  {order.images.length > 3 && (
                    <button
                      onClick={() => setZoomImage(resolveAssetUrl(order.images![3]))}
                      className="flex items-center justify-center rounded-lg border border-slate-200 bg-slate-50 h-12 w-12 shrink-0 cursor-zoom-in hover:ring-2 hover:ring-blue-400 transition-all"
                    >
                      <span className="text-[10px] font-bold text-slate-400">+{order.images.length - 3}</span>
                    </button>
                  )}
                </div>
              )}

              {/* Action buttons */}
              <div className="mt-3 flex flex-wrap gap-1.5">
                {canStartWash && (
                  <button
                    onClick={() => startWash(order._id)}
                    className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-1 text-[10px] font-bold text-amber-700 hover:bg-amber-100 transition-colors"
                  >
                    เริ่มซัก
                  </button>
                )}
                {canFinishWash && (
                  <button
                    onClick={() => finishWash(order._id)}
                    className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1 text-[10px] font-bold text-emerald-700 hover:bg-emerald-100 transition-colors"
                  >
                    เสร็จซัก → อบผ้า
                  </button>
                )}
                {canStartDry && (
                  <button
                    onClick={() => startWash(order._id)}
                    className="rounded-lg border border-purple-200 bg-purple-50 px-3 py-1 text-[10px] font-bold text-purple-700 hover:bg-purple-100 transition-colors"
                  >
                    เริ่มอบผ้า
                  </button>
                )}
                {canFinishDry && (
                  <button
                    onClick={() => finishDry(order._id)}
                    className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1 text-[10px] font-bold text-indigo-700 hover:bg-indigo-100 transition-colors"
                  >
                    เสร็จอบผ้า
                  </button>
                )}
                {isLaundryDone && (
                  <span className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1 text-[10px] font-bold text-emerald-700">
                    {isDryOnlyLaundry ? 'อบผ้าเสร็จ ✓' : 'ซัก+อบเสร็จ ✓'}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Image Zoom Modal */}
      {zoomImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={() => setZoomImage(null)}
        >
          <div className="relative max-w-3xl max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setZoomImage(null)}
              className="absolute -top-3 -right-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-lg text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <img
              src={zoomImage}
              alt="Zoomed basket"
              className="max-h-[85vh] max-w-full rounded-xl object-contain shadow-2xl"
            />
          </div>
        </div>
      )}
    </div>
  );
}
