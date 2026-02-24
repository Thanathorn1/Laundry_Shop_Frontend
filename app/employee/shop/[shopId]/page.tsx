"use client";

import { useEffect, useState } from 'react';
import { apiFetch, API_BASE_URL } from '@/lib/api';
import { useParams } from 'next/navigation';
import { io } from 'socket.io-client';

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
  pickupAddress?: string;
  deliveryAddress?: string;
  totalPrice?: number;
  customerId?: CustomerInfo;
  employeeId?: EmployeeInfo;
};

type MyEmployeeProfile = {
  _id: string;
  assignedShopId?: string | null;
  assignedShopIds?: string[];
};

type JoinRequestEmployee = {
  _id: string;
  email: string;
  firstName?: string;
  lastName?: string;
};

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
  const [joinRequests, setJoinRequests] = useState<JoinRequestEmployee[]>([]);
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinActionId, setJoinActionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isMemberOfShop = (value: MyEmployeeProfile | null, targetShopId: string) => {
    if (!value || !targetShopId) return false;
    if (value.assignedShopId && String(value.assignedShopId) === String(targetShopId)) return true;
    return Array.isArray(value.assignedShopIds) && value.assignedShopIds.map(String).includes(String(targetShopId));
  };

  const canManageJoinRequests = isMemberOfShop(me, shopId);

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
      }
    });

    return () => {
      socket.off('order:update');
      socket.disconnect();
    };
  }, [shopId]);

  // Polling fallback: refresh orders every 5 seconds for real-time updates
  useEffect(() => {
    if (!shopId) return;
    const interval = setInterval(() => {
      fetchOrders(true);
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black text-blue-900 tracking-tight">Shop Orders</h1>
        <p className="text-blue-700/60 text-sm font-medium">Update laundry steps for each order in this shop.</p>
      </div>

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

      <div className="grid gap-4">
        {orders.map((order) => {
          const customerName = `${order.customerId?.firstName || ''} ${order.customerId?.lastName || ''}`.trim() || 'Customer';
          const employeeName = `${order.employeeId?.firstName || ''} ${order.employeeId?.lastName || ''}`.trim() || order.employeeId?.email || '-';

          return (
            <div key={order._id} className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-black text-blue-900">{order.productName || 'Laundry Order'}</h3>
                  <p className="text-xs text-blue-600 mt-1">Customer: {customerName}</p>
                  <p className="text-xs text-blue-600">Employee: {employeeName}</p>
                </div>
                <span className="rounded-full bg-blue-50 border border-blue-100 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-blue-700">{order.status}</span>
              </div>

              <div className="mt-4 grid gap-2 sm:grid-cols-2 text-sm">
                <p><span className="font-black text-blue-900">Pickup:</span> {order.pickupAddress || '-'}</p>
                <p><span className="font-black text-blue-900">Delivery:</span> {order.deliveryAddress || '-'}</p>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                <button
                  onClick={() => startWash(order._id)}
                  className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-black uppercase tracking-widest text-amber-700 hover:bg-amber-100"
                >
                  Start Wash
                </button>
                <button
                  onClick={() => finishWash(order._id)}
                  className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-black uppercase tracking-widest text-emerald-700 hover:bg-emerald-100"
                >
                  Finish Wash
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
