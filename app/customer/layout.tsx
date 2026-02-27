"use client";

import UserTopNavbar from "@/components/UserTopNavbar";

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-blue-900">
      <UserTopNavbar
        role="user"
        homeHref="/customer"
        settingsHref="/customer/settings"
        extraItems={[
          { label: "New Order", href: "/customer/create-order" },
          { label: "History", href: "/customer/history" },
        ]}
      />

      <div className="customer-shell px-4 py-6 sm:px-6 lg:px-8">{children}</div>

      <style jsx global>{`
        .customer-shell > div.flex.min-h-screen > aside,
        .customer-shell > div.flex.min-h-screen > footer {
          display: none !important;
        }

        .customer-shell > div.flex.min-h-screen > main {
          padding: 0 !important;
          width: 100%;
        }
      `}</style>
    </div>
  );
}