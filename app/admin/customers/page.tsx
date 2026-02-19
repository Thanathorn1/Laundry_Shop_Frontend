"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";

type AdminUser = {
  _id: string;
  email: string;
  role: "user" | "rider" | "admin";
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  address?: string;
};

export default function AdminCustomersPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const savedRole = localStorage.getItem("user_role");
    if (savedRole !== "admin") {
      router.replace("/");
      return;
    }

    const loadCustomers = async () => {
      try {
        const data = (await apiFetch("/customers/admin/customers")) as AdminUser[];
        setCustomers(data);
      } catch (e) {
        const message = e instanceof Error ? e.message : "Failed to load customers";
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    loadCustomers();
  }, [router]);

  return (
    <div className="min-h-screen bg-slate-50 p-8 font-sans text-blue-900">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black tracking-tight">Customer List</h1>
            <p className="text-sm text-blue-700/60">All users with role: user</p>
          </div>
          <Link
            href="/admin"
            className="rounded-xl border border-blue-100 bg-white px-4 py-2 text-sm font-bold text-blue-700 hover:bg-blue-50"
          >
            ← Back to Admin
          </Link>
        </div>

        <div className="overflow-hidden rounded-3xl border border-white bg-white shadow-2xl shadow-blue-100/40">
          {loading ? (
            <div className="p-8 text-sm font-semibold text-blue-500">Loading customers...</div>
          ) : error ? (
            <div className="p-8 text-sm font-semibold text-rose-500">{error}</div>
          ) : customers.length === 0 ? (
            <div className="p-8 text-sm font-semibold text-blue-500">No customers found.</div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-widest text-blue-400">
                <tr>
                  <th className="px-5 py-4">Name</th>
                  <th className="px-5 py-4">Email</th>
                  <th className="px-5 py-4">Phone</th>
                  <th className="px-5 py-4">Address</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((user) => {
                  const fullName = `${user.firstName || ""} ${user.lastName || ""}`.trim() || "-";
                  return (
                    <tr key={user._id} className="border-t border-slate-100">
                      <td className="px-5 py-4 font-semibold">{fullName}</td>
                      <td className="px-5 py-4">{user.email}</td>
                      <td className="px-5 py-4">{user.phoneNumber || "-"}</td>
                      <td className="px-5 py-4">{user.address || "-"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
