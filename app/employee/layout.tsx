"use client";

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Map, Users, List, Bike, Shield, HardHat, MapPin, LogOut, Menu, X, ChevronDown, User, Settings } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { apiFetch, resolveImageUrl, PROFILE_UPDATE_EVENT } from '@/lib/api';

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
  const router = useRouter();
  const pathname = usePathname();
  const [isAdminSession, setIsAdminSession] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [profile, setProfile] = useState<{ firstName: string; lastName: string; profileImageUrl?: string } | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    const tokenRole = getRoleFromAccessToken(token);
    const storedAuthRole = localStorage.getItem('auth_role');
    const authRole = storedAuthRole || tokenRole;

    if (tokenRole && storedAuthRole !== tokenRole) {
      localStorage.setItem('auth_role', tokenRole);
    }

    if (authRole === 'admin' && !isAdminSession) {
      setIsAdminSession(true);
    }

    if (token) {
      apiFetch('/customers/me').then(data => {
        setProfile(data);
      }).catch(() => {
        // Silent error
      });
    }
  }, [isAdminSession]);

  // Handle profile updates from other components
  useEffect(() => {
    const handleProfileUpdate = () => {
      apiFetch('/customers/me').then(data => {
        setProfile(data);
      }).catch(() => { });
    };

    window.addEventListener(PROFILE_UPDATE_EVENT, handleProfileUpdate);
    return () => window.removeEventListener(PROFILE_UPDATE_EVENT, handleProfileUpdate);
  }, []);

  // Close menu/dropdown when path changes
  useEffect(() => {
    setIsMenuOpen(false);
    setIsDropdownOpen(false);
  }, [pathname]);

  const navItems = [
    { href: '/employee', label: 'Shop Map', icon: Map },
  ];

  const adminItems = [
    { href: '/admin/customers?from=employee', label: 'Customer List', icon: Users },
    { href: '/employee/users', label: 'User Management', icon: List },
    { href: '/admin/riders?from=employee', label: 'Rider List', icon: Bike },
    { href: '/admin/admins?from=employee', label: 'Admin List', icon: Shield },
    { href: '/admin/employees?from=employee', label: 'Employee List', icon: HardHat },
    { href: '/admin/pin-shop?from=employee', label: 'Pin Shop', icon: MapPin },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 font-sans text-blue-900 overflow-x-hidden">
      {/* Top Navbar */}
      <header className="sticky top-0 z-[100] w-full border-b border-white/40 glass-morphism shadow-premium">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6 lg:px-8">
          <div className="flex items-center gap-4 group cursor-pointer" onClick={() => router.push('/employee')}>
            <div className="h-12 w-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200 transition-all duration-500 group-hover:rotate-12 group-hover:scale-110">
              <span className="text-white font-black text-2xl tracking-tighter">EF</span>
            </div>
            <div className="flex flex-col">
              <h2 className="text-xl font-black text-blue-900 tracking-tighter uppercase leading-none">Fresh</h2>
              <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest leading-none">Employee Deck</span>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-2">
            <div className="flex items-center gap-1 p-1 bg-blue-50/50 rounded-2xl border border-blue-100/50 mr-4">
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center rounded-xl px-5 py-2.5 text-xs font-black uppercase tracking-widest transition-all duration-300 ${isActive
                      ? 'bg-white text-blue-600 shadow-sm border border-white'
                      : 'text-blue-700/50 hover:text-blue-700'
                      }`}
                  >
                    <item.icon className={`mr-2 h-4 w-4 ${isActive ? 'text-blue-600' : 'text-blue-400'}`} />
                    {item.label}
                  </Link>
                );
              })}
            </div>

            {isAdminSession && (
              <div className="flex items-center gap-1 bg-slate-100/50 p-1 rounded-2xl border border-slate-200/50 mr-4">
                {adminItems.map((item) => {
                  const isActive = pathname.startsWith(item.href.split('?')[0]);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      title={item.label}
                      className={`p-3 rounded-xl transition-all duration-300 transform hover:scale-110 active:scale-90 ${isActive
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-200'
                        : 'text-slate-400 hover:text-blue-600 hover:bg-white'
                        }`}
                    >
                      <item.icon className="h-4 w-4" />
                    </Link>
                  );
                })}
              </div>
            )}

            <div className="h-8 w-px bg-slate-200 mx-4" />

            {/* Profile Capsule */}
            <div className="relative">
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center gap-3 pl-2 pr-4 py-2 rounded-2xl bg-white border border-slate-100 shadow-soft hover:shadow-lg hover:border-blue-200 transition-all active:scale-95 group"
              >
                <div className="h-10 w-10 rounded-xl bg-blue-600 flex items-center justify-center text-white overflow-hidden shadow-sm border-2 border-white ring-4 ring-blue-50/50">
                  {profile?.profileImageUrl ? (
                    <img src={resolveImageUrl(profile.profileImageUrl) || ''} alt="Profile" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
                  ) : (
                    <span className="text-sm font-black">{profile?.firstName?.charAt(0) || <User className="h-5 w-5" />}</span>
                  )}
                </div>
                <div className="text-left hidden xl:block">
                  <p className="text-[10px] font-black text-blue-300 uppercase leading-none mb-1">Station 01</p>
                  <p className="text-sm font-black text-blue-900 leading-none">{profile?.firstName || 'User'}</p>
                </div>
                <ChevronDown className={`h-4 w-4 text-blue-400 transition-all duration-500 ${isDropdownOpen ? 'rotate-180 text-blue-600' : ''}`} />
              </button>

              {isDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-[-1]" onClick={() => setIsDropdownOpen(false)} />
                  <div className="absolute right-0 mt-4 w-64 glass-deep rounded-3xl shadow-premium border border-white/40 py-3 overflow-hidden animate-blur-in">
                    <div className="px-5 py-3 mb-2 bg-blue-50/30">
                      <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em] mb-1">Operator Identity</p>
                      <p className="text-sm font-black text-blue-900">{profile?.firstName} {profile?.lastName}</p>
                    </div>

                    <div className="px-2 space-y-1">
                      <Link
                        href="/customer/settings"
                        className="flex items-center gap-3 px-4 py-3 text-[11px] font-black uppercase tracking-widest text-blue-700/60 hover:bg-blue-600 hover:text-white rounded-xl transition-all group"
                      >
                        <Settings className="h-4 w-4 transition-transform group-hover:rotate-90" />
                        System Config
                      </Link>

                      <button
                        onClick={() => {
                          localStorage.clear();
                          window.location.href = '/';
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-[11px] font-black uppercase tracking-widest text-rose-500 hover:bg-rose-500 hover:text-white rounded-xl transition-all"
                      >
                        <LogOut className="h-4 w-4" />
                        Relinquish Access
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </nav>

          {/* Hamburger / Mobile Button */}
          <button
            className="lg:hidden p-3 rounded-2xl bg-white text-blue-900 border border-slate-100 shadow-soft"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Menu Overlay */}
        {isMenuOpen && (
          <div className="lg:hidden fixed inset-0 top-20 z-[90] bg-white p-6 overflow-y-auto border-t border-slate-100 animate-in slide-in-from-right duration-300">
            <nav className="flex flex-col gap-3 font-bold">
              <div className="text-[10px] font-black text-blue-300 uppercase tracking-widest px-4 pb-2 border-b border-slate-50">Operational Routes</div>
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center rounded-2xl px-6 py-5 transition-all duration-300 border ${isActive
                      ? 'bg-blue-600 text-white shadow-xl shadow-blue-200 border-blue-600'
                      : 'text-blue-700/60 hover:bg-blue-50 border-slate-100'
                      }`}
                  >
                    <item.icon className={`mr-4 h-5 w-5 ${isActive ? 'text-white' : 'text-blue-400'}`} />
                    <span className="uppercase tracking-widest text-xs font-black">{item.label}</span>
                  </Link>
                );
              })}

              {isAdminSession && (
                <>
                  <div className="text-[10px] font-black text-blue-300 uppercase tracking-widest px-4 pt-6 pb-2 border-b border-slate-50">Admin Protocol</div>
                  <div className="grid grid-cols-2 gap-2">
                    {adminItems.map((item) => {
                      const isActive = pathname.startsWith(item.href.split('?')[0]);
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={`flex flex-col items-center justify-center p-6 rounded-2xl transition-all duration-300 border ${isActive
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : 'text-slate-400 hover:bg-slate-50 border-slate-100'
                            }`}
                        >
                          <item.icon className="h-6 w-6 mb-2" />
                          <span className="text-[10px] uppercase font-black">{item.label.split(' ')[0]}</span>
                        </Link>
                      );
                    })}
                  </div>
                </>
              )}

              <div className="h-px bg-slate-100 my-6" />

              <button
                onClick={() => {
                  localStorage.clear();
                  window.location.href = '/';
                }}
                className="flex items-center justify-center gap-3 rounded-2xl px-6 py-5 text-rose-500 bg-rose-50 font-black uppercase tracking-widest text-xs border border-rose-100 hover:bg-rose-500 hover:text-white transition-all duration-300"
              >
                <LogOut className="h-5 w-5" />
                Sign Out Operator
              </button>
            </nav>
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full bg-grid-pattern relative">
        {/* Entrance Blur Decoration */}
        <div className="absolute top-0 inset-x-0 h-64 bg-gradient-to-b from-blue-50/50 to-transparent pointer-events-none" />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>

      {/* Global Bottom Decoration */}
      <footer className="h-1 w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 shadow-premium" />
    </div>
  );
}
