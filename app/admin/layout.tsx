"use client";

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ReactNode, useEffect, useState } from 'react';

const navItems = [
    { label: 'General', type: 'header' },
    { label: 'Dashboard', href: '/admin', icon: '📊' },
    { label: 'Customer List', href: '/admin/customers', icon: '👤' },
    { label: 'Rider List', href: '/admin/riders', icon: '🛵' },
    { label: 'Admin List', href: '/admin/admins', icon: '🛡️' },
    { label: 'Pin Shop', href: '/admin/pin-shop', icon: '📍' },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

    useEffect(() => {
        const authRole = localStorage.getItem("user_role");
        if (authRole !== "admin") {
            router.replace("/");
        } else {
            setIsAuthorized(true);
        }
    }, [router]);

    if (isAuthorized === null) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="h-10 w-10 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen bg-slate-50 font-sans text-blue-900">
            {/* Sidebar */}
            <aside className="w-72 border-r border-blue-50 bg-white/80 backdrop-blur-xl p-8 shadow-sm h-screen sticky top-0 z-50">
                <div className="flex items-center gap-3 mb-10">
                    <div className="h-10 w-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-200">
                        <span className="text-white font-black text-xl">A</span>
                    </div>
                    <h2 className="text-xl font-black text-blue-900 tracking-tight uppercase">Admin Panel</h2>
                </div>

                <nav className="space-y-1.5 focus:outline-none">
                    {navItems.map((item, idx) => (
                        item.type === 'header' ? (
                            <div key={idx} className="px-4 py-2 mt-4 first:mt-0 text-[10px] font-black text-blue-300 uppercase tracking-widest">
                                {item.label}
                            </div>
                        ) : (
                            <Link
                                key={idx}
                                href={item.href!}
                                className={`flex items-center rounded-xl px-4 py-3 text-sm font-bold transition-all border group ${pathname === item.href
                                    ? 'bg-blue-600 text-white shadow-xl shadow-blue-200 border-blue-600'
                                    : 'text-blue-700/60 hover:bg-blue-50 hover:text-blue-700 border-transparent hover:border-blue-100'
                                    }`}
                            >
                                <span className={`mr-3 text-lg transition-transform group-hover:scale-110 ${pathname === item.href ? 'scale-110' : 'opacity-50 group-hover:opacity-100'}`}>
                                    {item.icon}
                                </span>
                                {item.label}
                            </Link>
                        )
                    ))}
                </nav>

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
            </aside>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0">
                {children}
            </div>
        </div>
    );
}
