"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";

type AdminUser = {
  _id: string;
  email: string;
  role: "user" | "rider" | "admin";
  isBanned?: boolean;
  banStartAt?: string | null;
  banEndAt?: string | null;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  address?: string;
};

export default function AdminRidersPage() {
  const router = useRouter();
  const [items, setItems] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [actionUserId, setActionUserId] = useState<string | null>(null);
  const [listMode, setListMode] = useState<"all" | "whitelist" | "blacklist">("all");

  const load = async () => {
    try {
      const data = (await apiFetch("/customers/admin/riders")) as AdminUser[];
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load riders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const applyUpdatedUser = (updated: AdminUser) => {
    if (updated.role !== "rider") {
      setItems((prev) => prev.filter((item) => item._id !== updated._id));
      return;
    }
    setItems((prev) => prev.map((item) => (item._id === updated._id ? { ...item, ...updated } : item)));
  };

  const handleChangeRole = async (item: AdminUser, role: "user" | "rider" | "admin") => {
    setActionUserId(item._id);
    setError(null);
    setMessage(null);
    try {
      const updated = (await apiFetch(`/customers/admin/users/${item._id}/role`, {
        method: "PATCH",
        body: JSON.stringify({ role }),
      })) as AdminUser;
      applyUpdatedUser(updated);
      setMessage(`Updated role for ${item.email}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to change role");
    } finally {
      setActionUserId(null);
    }
  };

  const handleBanPermanent = async (item: AdminUser) => {
    setActionUserId(item._id);
    setError(null);
    setMessage(null);
    try {
      const updated = (await apiFetch(`/customers/admin/users/${item._id}/ban`, {
        method: "PATCH",
        body: JSON.stringify({ mode: "permanent" }),
      })) as AdminUser;
      applyUpdatedUser(updated);
      setMessage(`Permanently banned ${item.email}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to ban user");
    } finally {
      setActionUserId(null);
    }
  };

  const handleBanDays = async (item: AdminUser) => {
    const dayValue = window.prompt(`Ban ${item.email} for how many days?`, "7");
    if (dayValue === null) return;

    const days = Number(dayValue);
    if (!Number.isFinite(days) || days <= 0) {
      setError("Please enter a valid number of days");
      return;
    }

    setActionUserId(item._id);
    setError(null);
    setMessage(null);
    try {
      const updated = (await apiFetch(`/customers/admin/users/${item._id}/ban`, {
        method: "PATCH",
        body: JSON.stringify({ mode: "days", days }),
      })) as AdminUser;
      applyUpdatedUser(updated);
      setMessage(`Banned ${item.email} for ${Math.floor(days)} day(s)`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to ban user");
    } finally {
      setActionUserId(null);
    }
  };

  const handleUnban = async (item: AdminUser) => {
    setActionUserId(item._id);
    setError(null);
    setMessage(null);
    try {
      const updated = (await apiFetch(`/customers/admin/users/${item._id}/ban`, {
        method: "PATCH",
        body: JSON.stringify({ mode: "unban" }),
      })) as AdminUser;
      applyUpdatedUser(updated);
      setMessage(`Unbanned ${item.email}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to unban user");
    } finally {
      setActionUserId(null);
    }
  };

  const handleChangePassword = async (item: AdminUser) => {
    const newPassword = window.prompt(`Set new password for ${item.email} (minimum 8 characters):`, "");
    if (newPassword === null) return;

    const trimmed = newPassword.trim();
    if (trimmed.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setActionUserId(item._id);
    setError(null);
    setMessage(null);
    try {
      await apiFetch(`/customers/admin/users/${item._id}/password`, {
        method: "PATCH",
        body: JSON.stringify({ password: trimmed }),
      });
      setMessage(`Password changed for ${item.email}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to change password");
    } finally {
      setActionUserId(null);
    }
  };

  const handleDeleteUser = async (item: AdminUser) => {
    if (!window.confirm(`Delete ${item.email}? This action cannot be undone.`)) return;

    setActionUserId(item._id);
    setError(null);
    setMessage(null);
    try {
      await apiFetch(`/customers/admin/users/${item._id}`, { method: "DELETE" });
      setItems((prev) => prev.filter((row) => row._id !== item._id));
      setMessage(`Deleted ${item.email}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete user");
    } finally {
      setActionUserId(null);
    }
  };

  const filteredItems = items.filter((item) => {
    if (listMode === "whitelist") return !item.isBanned;
    if (listMode === "blacklist") return Boolean(item.isBanned);
    return true;
  });

  const formatDate = (value?: string | null) => {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleString();
  };

  return (
    <main className="flex-1 p-12 overflow-y-auto">
      <div className="mb-8 flex items-end justify-between">
        <div>
          <h1 className="text-4xl font-black text-blue-900 tracking-tight mb-2 uppercase">Rider Management</h1>
          <p className="text-blue-700/60 font-bold uppercase tracking-widest text-[10px]">Manage system riders, permissions, and status.</p>
        </div>

        <div className="bg-white rounded-2xl p-1 shadow-xl shadow-blue-900/5 border border-white flex items-center">
          {[
            { label: 'All', value: 'all', color: 'blue' },
            { label: 'Active', value: 'whitelist', color: 'emerald' },
            { label: 'Banned', value: 'blacklist', color: 'rose' }
          ].map((btn) => (
            <button
              key={btn.value}
              onClick={() => setListMode(btn.value as any)}
              className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${listMode === btn.value
                ? `bg-${btn.color}-600 text-white shadow-lg shadow-${btn.color}-200`
                : 'text-blue-400 hover:bg-slate-50'
                }`}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-blue-100/50 border border-white overflow-hidden">
        {message && (
          <div className="bg-emerald-50 px-8 py-4 border-b border-emerald-100 flex items-center gap-3">
            <span className="text-lg">✅</span>
            <span className="text-xs font-bold text-emerald-700 uppercase tracking-widest">{message}</span>
          </div>
        )}

        {loading ? (
          <div className="p-20 flex flex-col items-center justify-center gap-4">
            <div className="h-10 w-10 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"></div>
            <p className="text-[10px] font-black text-blue-300 uppercase tracking-widest animate-pulse">Fetching Riders...</p>
          </div>
        ) : error ? (
          <div className="p-20 text-center">
            <span className="text-4xl mb-4 block">⚠️</span>
            <p className="text-sm font-bold text-rose-500 uppercase tracking-widest">{error}</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="p-20 text-center">
            <span className="text-4xl mb-4 block">🔭</span>
            <p className="text-sm font-bold text-blue-300 uppercase tracking-widest">No riders match your filter.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-8 py-5 text-[10px] font-black text-blue-300 uppercase tracking-[0.2em]">Rider Info</th>
                  <th className="px-8 py-5 text-[10px] font-black text-blue-300 uppercase tracking-[0.2em]">Contact</th>
                  <th className="px-8 py-5 text-[10px] font-black text-blue-300 uppercase tracking-[0.2em]">Role</th>
                  <th className="px-8 py-5 text-[10px] font-black text-blue-300 uppercase tracking-[0.2em]">Status</th>
                  <th className="px-8 py-5 text-[10px] font-black text-blue-300 uppercase tracking-[0.2em] text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredItems.map((item) => {
                  const fullName = `${item.firstName || ""} ${item.lastName || ""}`.trim() || item.email.split('@')[0];
                  const busy = actionUserId === item._id;
                  return (
                    <tr key={item._id} className="group hover:bg-slate-50/30 transition-colors">
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-4">
                          <div className="h-12 w-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-black text-lg border border-blue-100 group-hover:bg-white group-hover:scale-110 transition-all">
                            {fullName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-black text-blue-900 leading-none mb-1">{fullName}</p>
                            <p className="text-[10px] font-bold text-blue-400 uppercase tracking-tighter">{item.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <p className="text-xs font-bold text-slate-600 mb-1">{item.phoneNumber || "No Phone"}</p>
                        <p className="text-[10px] text-slate-400 font-medium line-clamp-1 max-w-[150px]">{item.address || "No Address"}</p>
                      </td>
                      <td className="px-8 py-6">
                        <select
                          value={item.role}
                          disabled={busy}
                          onChange={(event) => handleChangeRole(item, event.target.value as any)}
                          className="bg-slate-100 border-none rounded-xl px-3 py-1.5 text-[10px] font-black text-blue-900 focus:ring-2 focus:ring-blue-100 cursor-pointer hover:bg-white hover:shadow-sm transition-all uppercase tracking-widest"
                        >
                          <option value="user">User</option>
                          <option value="rider">Rider</option>
                          <option value="admin">Admin</option>
                        </select>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex flex-col gap-1">
                          <span className={`inline-flex items-center w-fit gap-1.5 rounded-full px-3 py-1 text-[9px] font-black uppercase tracking-widest ${item.isBanned
                            ? "bg-rose-50 text-rose-600 border border-rose-100"
                            : "bg-emerald-50 text-emerald-600 border border-emerald-100"
                            }`}>
                            <div className={`h-1.5 w-1.5 rounded-full ${item.isBanned ? 'bg-rose-600' : 'bg-emerald-600 animate-pulse'}`}></div>
                            {item.isBanned ? "Banned" : "Active"}
                          </span>
                          {item.isBanned && (
                            <p className="text-[9px] font-bold text-rose-400 uppercase tracking-tight">
                              {item.banEndAt ? `Ends ${formatDate(item.banEndAt)}` : "Perm"}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          {item.isBanned ? (
                            <button
                              disabled={busy}
                              onClick={() => handleUnban(item)}
                              className="h-10 w-10 flex items-center justify-center rounded-xl border border-emerald-100 bg-white text-emerald-600 hover:bg-emerald-600 hover:text-white transition-all shadow-sm"
                              title="Unban User"
                            >
                              <span className="text-sm">🛡️</span>
                            </button>
                          ) : (
                            <>
                              <button
                                disabled={busy}
                                onClick={() => handleBanDays(item)}
                                className="h-10 w-10 flex items-center justify-center rounded-xl border border-amber-100 bg-white text-amber-600 hover:bg-amber-600 hover:text-white transition-all shadow-sm"
                                title="Temporary Ban"
                              >
                                <span className="text-sm">⏳</span>
                              </button>
                              <button
                                disabled={busy}
                                onClick={() => handleBanPermanent(item)}
                                className="h-10 w-10 flex items-center justify-center rounded-xl border border-rose-100 bg-white text-rose-600 hover:bg-rose-600 hover:text-white transition-all shadow-sm"
                                title="Permanent Ban"
                              >
                                <span className="text-sm">🚫</span>
                              </button>
                            </>
                          )}
                          <button
                            disabled={busy}
                            onClick={() => handleChangePassword(item)}
                            className="h-10 w-10 flex items-center justify-center rounded-xl border border-blue-100 bg-white text-blue-600 hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                            title="Reset Password"
                          >
                            <span className="text-sm">🔑</span>
                          </button>
                          <button
                            disabled={busy}
                            onClick={() => handleDeleteUser(item)}
                            className="h-10 w-10 flex items-center justify-center rounded-xl border border-slate-100 bg-white text-slate-400 hover:bg-rose-600 hover:text-white hover:border-rose-600 transition-all shadow-sm"
                            title="Delete User"
                          >
                            <span className="text-sm">🗑️</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
