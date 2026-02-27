"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { apiFetch } from "@/lib/api";

type Role = "user" | "rider" | "employee" | "admin";

type NavbarItem = {
  label: string;
  href: string;
  icon?: React.ReactNode;
};

type MenuSection = {
  title?: string;
  items: NavbarItem[];
};

type UserTopNavbarProps = {
  role: Role;
  homeHref: string;
  settingsHref: string;
  editProfileHref?: string;
  extraItems?: NavbarItem[];
};

type ProfileLike = {
  firstName?: string;
  lastName?: string;
  fullName?: string;
  email?: string;
  profileImage?: string;
  riderImageUrl?: string;
};

/* ── SVG icon components ─────────────────────────────────── */

const Icon = ({ d, className = "" }: { d: string; className?: string }) => (
  <svg className={`h-[18px] w-[18px] shrink-0 ${className}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

const icons = {
  dashboard: <Icon d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1" />,
  order: <Icon d="M12 4v16m8-8H4" />,
  history: <Icon d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />,
  customers: <Icon d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />,
  riders: (
    <svg className="h-[18px] w-[18px] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="18.5" cy="18.5" r="3.5" />
      <circle cx="5.5" cy="18.5" r="3.5" />
      <path d="M15 5a1 1 0 100-2 1 1 0 000 2zM9 18.5h6M14 5l-3 7h4l3-4" />
    </svg>
  ),
  admins: <Icon d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />,
  employees: <Icon d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0" />,
  pinShop: <Icon d="M17.657 16.657L13.414 20.9a2 2 0 01-2.828 0l-4.243-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z" />,
  shop: <Icon d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />,
  users: <Icon d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />,
  settings: <Icon d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37 1.066.426 2.573-.426 2.573-1.066z M15 12a3 3 0 11-6 0 3 3 0 016 0z" />,
  logout: <Icon d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" className="text-rose-500" />,
  profile: <Icon d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />,
  tasks: <Icon d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />,
};

const labelIconMap: Record<string, React.ReactNode> = {
  "dashboard": icons.dashboard,
  "new order": icons.order,
  "history": icons.history,
  "shop": icons.shop,
  "users": icons.users,
  "profile": icons.profile,
  "my tasks": icons.tasks,
  "customers": icons.customers,
  "riders": icons.riders,
  "admins": icons.admins,
  "employees": icons.employees,
  "pin shop": icons.pinShop,
  "settings": icons.settings,
};

/* ── helpers ─────────────────────────────────────────────── */

function getRoleFromAccessToken(token: string | null): Role | null {
  if (!token) return null;
  try {
    const payloadBase64 = token.split(".")[1];
    if (!payloadBase64) return null;

    const normalized = payloadBase64.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
    const parsed = JSON.parse(atob(padded)) as { role?: string };

    if (parsed.role === "admin" || parsed.role === "rider" || parsed.role === "user" || parsed.role === "employee") {
      return parsed.role;
    }
    return null;
  } catch {
    return null;
  }
}

function getInitialFromName(name: string) {
  return (name.trim().charAt(0) || "U").toUpperCase();
}

/* ── component ───────────────────────────────────────────── */

export default function UserTopNavbar({ role, homeHref, settingsHref, extraItems = [] }: UserTopNavbarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [displayName, setDisplayName] = useState("User");
  const [avatarText, setAvatarText] = useState("U");
  const [avatarImage, setAvatarImage] = useState<string | null>(null);
  const [isAdminSession, setIsAdminSession] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    const tokenRole = getRoleFromAccessToken(token);
    if (tokenRole && localStorage.getItem("auth_role") !== tokenRole) {
      localStorage.setItem("auth_role", tokenRole);
    }
    const authRole = localStorage.getItem("auth_role") || tokenRole;
    setIsAdminSession(authRole === "admin");

    const loadProfile = async () => {
      const endpointByRole: Record<Role, string> = {
        user: "/customers/me",
        rider: "/rider/profile",
        employee: "/employee/me",
        admin: "/admins/me",
      };

      const fallbackName = role === "employee" ? "Employee" : role === "rider" ? "Rider" : role === "admin" ? "Admin" : "Customer";

      try {
        const profile = (await apiFetch(endpointByRole[role])) as ProfileLike;
        const fullName = `${profile?.firstName || ""} ${profile?.lastName || ""}`.trim() || profile?.fullName || "";
        const name = fullName || profile?.email || fallbackName;
        setDisplayName(name);
        setAvatarText(getInitialFromName(name));
        setAvatarImage(profile?.profileImage || profile?.riderImageUrl || null);
      } catch {
        setDisplayName(fallbackName);
        setAvatarText(getInitialFromName(fallbackName));
      }
    };

    loadProfile();

    const onProfileUpdated = () => { void loadProfile(); };
    window.addEventListener("profile:updated", onProfileUpdated);
    return () => window.removeEventListener("profile:updated", onProfileUpdated);
  }, [role]);

  useEffect(() => {
    const onClickOutside = (event: MouseEvent) => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  /* ── build menu sections ──────────────────── */

  const sections = useMemo<MenuSection[]>(() => {
    const main: NavbarItem[] = [
      { label: "Dashboard", href: homeHref, icon: icons.dashboard },
    ];

    // role-specific extra items with proper icons
    for (const item of extraItems) {
      main.push({ ...item, icon: item.icon || labelIconMap[item.label.toLowerCase()] || icons.shop });
    }

    const result: MenuSection[] = [{ items: main }];

    if (isAdminSession) {
      // When navigating from a non-admin view, pass ?from= so the back button returns here
      const fromParam = role !== "admin" ? `?from=${role === "user" ? "customer" : role}` : "";
      result.push({
        title: "Admin",
        items: [
          { label: "Customers", href: `/admin/customers${fromParam}`, icon: icons.customers },
          { label: "Riders", href: `/admin/riders${fromParam}`, icon: icons.riders },
          { label: "Admins", href: `/admin/admins${fromParam}`, icon: icons.admins },
          { label: "Employees", href: `/admin/employees${fromParam}`, icon: icons.employees },
          { label: "Pin Shop", href: `/admin/pin-shop${fromParam}`, icon: icons.pinShop },
        ],
      });
    }

    result.push({
      items: [{ label: "Settings", href: settingsHref, icon: icons.settings }],
    });

    return result;
  }, [homeHref, settingsHref, extraItems, isAdminSession, role]);

  /* ── role badge ────────────────────────────── */
  const roleBadge = useMemo(() => {
    const map: Record<string, { label: string; color: string }> = {
      admin: { label: "Admin", color: "bg-violet-100 text-violet-700" },
      employee: { label: "Employee", color: "bg-emerald-100 text-emerald-700" },
      rider: { label: "Rider", color: "bg-amber-100 text-amber-700" },
      user: { label: "Customer", color: "bg-blue-100 text-blue-700" },
    };
    return map[role] || map.user;
  }, [role]);

  return (
    <header className="sticky top-0 z-[1000] border-b border-blue-700/20 bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 shadow-lg shadow-blue-900/20">
      <div className="mx-auto flex h-14 w-full max-w-[1600px] items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href={homeHref} className="flex items-center gap-2.5 text-white group">
          {/* Washing machine icon */}
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15 backdrop-blur-sm group-hover:bg-white/25 transition-colors">
            <svg className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="2" width="20" height="20" rx="3" />
              <circle cx="12" cy="14" r="5" />
              <circle cx="12" cy="14" r="2" />
              <circle cx="7" cy="5.5" r="1" fill="currentColor" stroke="none" />
              <circle cx="10" cy="5.5" r="1" fill="currentColor" stroke="none" />
              <line x1="14" y1="5.5" x2="19" y2="5.5" />
            </svg>
          </span>
          <span className="text-base font-bold tracking-tight">Laundry Shop</span>
        </Link>

        <div ref={rootRef} className="relative">
          {/* ── trigger button ──────────────────── */}
          <button
            onClick={() => setIsOpen((v) => !v)}
            className={`flex items-center gap-2 rounded-full border px-2 py-1.5 text-left transition-all duration-150 ${
              isOpen
                ? "border-white/40 bg-white/20 ring-2 ring-white/20"
                : "border-white/20 bg-white/10 hover:bg-white/20 hover:border-white/30"
            }`}
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/20 text-sm font-bold text-white overflow-hidden">
              {avatarImage
                ? <img src={avatarImage} alt={displayName} className="h-full w-full object-cover" />
                : avatarText
              }
            </span>
            <span className="hidden sm:block max-w-[120px] truncate text-sm font-semibold text-white">{displayName}</span>
            <svg className={`ml-0.5 h-4 w-4 shrink-0 text-white/70 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* ── dropdown panel ──────────────────── */}
          <div
            className={`absolute right-0 top-[calc(100%+6px)] z-[1001] w-56 origin-top-right overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg ring-1 ring-black/5 transition-all duration-200 ${
              isOpen
                ? "scale-100 opacity-100"
                : "pointer-events-none scale-95 opacity-0"
            }`}
          >
            {/* user header */}
            <div className="border-b border-slate-100 px-4 py-3">
              <p className="truncate text-sm font-semibold text-slate-900">{displayName}</p>
              <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold leading-tight ${roleBadge.color}`}>
                {roleBadge.label}
              </span>
            </div>

            {/* scrollable menu area */}
            <div className="max-h-[320px] overflow-y-auto overscroll-contain py-1">
              {sections.map((section, si) => (
                <div key={si}>
                  {si > 0 && <div className="mx-3 my-1 border-t border-slate-100" />}
                  {section.title && (
                    <p className="px-4 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      {section.title}
                    </p>
                  )}
                  {section.items.map((item) => (
                    <Link
                      key={item.href + item.label}
                      href={item.href}
                      onClick={() => setIsOpen(false)}
                      className="group mx-1 flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900"
                    >
                      <span className="text-slate-400 transition-colors group-hover:text-blue-600">{item.icon}</span>
                      {item.label}
                    </Link>
                  ))}
                </div>
              ))}
            </div>

            {/* logout */}
            <div className="border-t border-slate-100 p-1">
              <button
                onClick={() => {
                  localStorage.clear();
                  window.location.href = "/";
                }}
                className="group mx-0 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-[13px] font-medium text-rose-600 transition-colors hover:bg-rose-50"
              >
                <span className="transition-colors group-hover:text-rose-600">{icons.logout}</span>
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
