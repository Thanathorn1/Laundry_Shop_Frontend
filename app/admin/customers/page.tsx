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
  const [items, setItems] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [backHref, setBackHref] = useState("/admin");
  const [backLabel, setBackLabel] = useState("← Back to Admin");

  useEffect(() => {
    const from = new URLSearchParams(window.location.search).get("from");
    if (from === "customer") {
      setBackHref("/customer");
      setBackLabel("← Back to Customer");
    }

    const authRole = localStorage.getItem("auth_role") || localStorage.getItem("user_role");
    if (authRole !== "admin") {
      router.replace("/");
      return;
    }

    const load = async () => {
      try {
        const data = (await apiFetch("/customers/admin/customers")) as AdminUser[];
        setItems(Array.isArray(data) ? data : []);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load customers");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [router]);

  return (
    <div className="min-h-screen bg-slate-50 p-8 font-sans text-blue-900">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black tracking-tight">Customer List</h1>
            <p className="text-sm text-blue-700/60">Users with role: user</p>
          </div>
          <Link href={backHref} className="rounded-xl border border-blue-100 bg-white px-4 py-2 text-sm font-bold text-blue-700 hover:bg-blue-50">
            {backLabel}
          </Link>
        </div>

        <div className="overflow-hidden rounded-3xl border border-white bg-white shadow-2xl shadow-blue-100/40">
          {loading ? (
            <div className="p-8 text-sm font-semibold text-blue-500">Loading customers...</div>
          ) : error ? (
            <div className="p-8 text-sm font-semibold text-rose-500">{error}</div>
          ) : items.length === 0 ? (
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
                {items.map((item) => {
                  const fullName = `${item.firstName || ""} ${item.lastName || ""}`.trim() || "-";
                  return (
                    <tr key={item._id} className="border-t border-slate-100">
                      <td className="px-5 py-4 font-semibold">{fullName}</td>
                      <td className="px-5 py-4">{item.email}</td>
                      <td className="px-5 py-4">{item.phoneNumber || "-"}</td>
                      <td className="px-5 py-4">{item.address || "-"}</td>
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
