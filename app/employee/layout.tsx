"use client";

import Link from 'next/link';
import { useEffect, useState } from 'react';

function getRoleFromAccessToken(token: string | null): 'user' | 'rider' | 'admin' | 'employee' | null {
  if (!token) return null;
  try {
    const payloadBase64 = token.split('.')[1];
    if (!payloadBase64) return null;

    const normalized = payloadBase64.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
    const json = atob(padded);
    const parsed = JSON.parse(json) as { role?: string };

    if (parsed.role === 'admin' || parsed.role === 'rider' || parsed.role === 'user' || parsed.role === 'employee') {
      return parsed.role;
    }
    return null;
  } catch {
    return null;
  }
}

export default function EmployeeLayout({ children }: { children: React.ReactNode }) {
  const [isAdminSession, setIsAdminSession] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    const tokenRole = getRoleFromAccessToken(token);
    const authRole = localStorage.getItem('auth_role') || tokenRole;
    if (tokenRole && localStorage.getItem('auth_role') !== tokenRole) {
      localStorage.setItem('auth_role', tokenRole);
    }
    setIsAdminSession(authRole === 'admin');
  }, []);

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-blue-900">
      <aside className="w-72 border-r border-slate-200 bg-white p-8 shadow-sm h-screen sticky top-0">
        <div className="flex items-center gap-3 mb-10">
          <div className="h-10 w-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-200">
            <span className="text-white font-black text-xl">E</span>
          </div>
          <h2 className="text-xl font-black text-blue-900 tracking-tight uppercase">Laundry Employee</h2>
        </div>

        <nav className="space-y-1.5">
          <Link href="/employee" className="flex items-center rounded-xl px-4 py-3 text-sm font-bold text-blue-700/60 hover:bg-blue-50 hover:text-blue-700 transition-all group">
            <span className="mr-3 text-lg opacity-50 group-hover:opacity-100">🗺️</span>
            Shop Map
          </Link>

          {isAdminSession && (
            <>
              <div className="px-4 pt-4 text-[10px] font-black text-blue-300 uppercase tracking-widest">Admin</div>
              <Link href="/admin/customers?from=employee" className="flex items-center w-full rounded-xl px-4 py-3 text-sm font-bold text-blue-700/70 hover:bg-blue-50 hover:text-blue-700 transition-all group">
                <span className="mr-3 text-lg opacity-60 group-hover:opacity-100">👤</span>
                Customer List
              </Link>
              <Link href="/employee/users" className="flex items-center w-full rounded-xl px-4 py-3 text-sm font-bold text-blue-700/70 hover:bg-blue-50 hover:text-blue-700 transition-all group">
                <span className="mr-3 text-lg opacity-60 group-hover:opacity-100">📋</span>
                User Management
              </Link>
              <Link href="/admin/riders?from=employee" className="flex items-center w-full rounded-xl px-4 py-3 text-sm font-bold text-blue-700/70 hover:bg-blue-50 hover:text-blue-700 transition-all group">
                <span className="mr-3 text-lg opacity-60 group-hover:opacity-100">🛵</span>
                Rider List
              </Link>
              <Link href="/admin/admins?from=employee" className="flex items-center w-full rounded-xl px-4 py-3 text-sm font-bold text-blue-700/70 hover:bg-blue-50 hover:text-blue-700 transition-all group">
                <span className="mr-3 text-lg opacity-60 group-hover:opacity-100">🛡️</span>
                Admin List
              </Link>
              <Link href="/admin/employees?from=employee" className="flex items-center w-full rounded-xl px-4 py-3 text-sm font-bold text-blue-700/70 hover:bg-blue-50 hover:text-blue-700 transition-all group">
                <span className="mr-3 text-lg opacity-60 group-hover:opacity-100">🧑‍🔧</span>
                Employee List
              </Link>
              <Link href="/admin/pin-shop?from=employee" className="flex items-center w-full rounded-xl px-4 py-3 text-sm font-bold text-blue-700/70 hover:bg-blue-50 hover:text-blue-700 transition-all group">
                <span className="mr-3 text-lg opacity-60 group-hover:opacity-100">📍</span>
                Pin Shop
              </Link>
            </>
          )}

          <div className="pt-6 mt-6 border-t border-slate-100">
            <button
              onClick={() => {
                localStorage.clear();
                window.location.href = '/';
              }}
              className="flex items-center w-full rounded-xl px-4 py-3 text-sm font-bold text-rose-500 hover:bg-rose-50 transition-all group"
            >
              <span className="mr-3 text-lg opacity-50 group-hover:opacity-100">🚪</span>
              Logout
            </button>
          </div>
        </nav>
      </aside>

      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
