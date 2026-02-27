"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { apiFetch } from "@/lib/api";

type Role = "user" | "rider" | "employee" | "admin";

type NavbarItem = {
  label: string;
  href: string;
  icon?: string;
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

export default function UserTopNavbar({ role, homeHref, settingsHref, extraItems = [] }: UserTopNavbarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [displayName, setDisplayName] = useState("User");
  const [avatarText, setAvatarText] = useState("U");
  const [avatarImage, setAvatarImage] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    const tokenRole = getRoleFromAccessToken(token);
    if (tokenRole && localStorage.getItem("auth_role") !== tokenRole) {
      localStorage.setItem("auth_role", tokenRole);
    }

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
        // rider uses riderImageUrl, others use profileImage
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

  const menuItems = useMemo(
    () => [
      { label: "Dashboard", href: homeHref, icon: "🏠" },
      ...extraItems,
      { label: "Settings", href: settingsHref, icon: "⚙️" },
    ],
    [extraItems, homeHref, settingsHref],
  );

  return (
    <header className="sticky top-0 z-[1000] border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-[1600px] items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href={homeHref} className="text-lg font-black tracking-tight text-blue-900">
          Laundry Shop
        </Link>

        <div ref={rootRef} className="relative">
          <button
            onClick={() => setIsOpen((value) => !value)}
            className="flex w-52 items-center gap-2.5 rounded-full border border-blue-100 bg-blue-50 px-2 py-1.5 text-left transition hover:bg-blue-100"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-black text-white overflow-hidden">
              {avatarImage
                ? <img src={avatarImage} alt={displayName} className="h-full w-full object-cover" />
                : avatarText
              }
            </span>
            <span className="flex-1 truncate text-sm font-bold text-blue-900">{displayName}</span>
            <svg className={`h-4 w-4 shrink-0 text-blue-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          <div
            className={`absolute right-0 top-[calc(100%+8px)] z-[1001] w-52 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl transition-all duration-200 ${
              isOpen ? "max-h-80 opacity-100" : "pointer-events-none max-h-0 opacity-0"
            }`}
          >
            <div className="p-2">
              {menuItems.map((item) => (
                <Link
                  key={item.href + item.label}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-semibold text-blue-800 hover:bg-blue-50"
                >
                  {item.icon && <span className="text-base leading-none">{item.icon}</span>}
                  {item.label}
                </Link>
              ))}
              <div className="my-1 border-t border-slate-100" />
              <button
                onClick={() => {
                  localStorage.clear();
                  window.location.href = "/";
                }}
                className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm font-semibold text-rose-600 hover:bg-rose-50"
              >
                <span className="text-base leading-none">🚪</span>
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
