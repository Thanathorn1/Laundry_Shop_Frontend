"use client";

import UserTopNavbar from "@/components/UserTopNavbar";

export default function EmployeeLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-blue-900">
      <UserTopNavbar
        role="employee"
        homeHref="/employee"
        settingsHref="/employee/settings"
        extraItems={[
          { label: "Shop", href: "/employee/shop" },
        ]}
      />
      <main className="px-4 py-6 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
}