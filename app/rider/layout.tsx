"use client";

import UserTopNavbar from "@/components/UserTopNavbar";

export default function RiderLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-blue-900">
      <UserTopNavbar
        role="rider"
        homeHref="/rider"
        settingsHref="/rider/profile"
        extraItems={[{ label: "My Tasks", href: "/rider/tasks", icon: "📋" }]}
      />
      <main className="px-4 py-6 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
}