"use client";

import React, { useState, useEffect, Suspense, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  User,
  MapPin,
  Lock,
  Loader,
  AlertCircle,
  ArrowLeft,
  ChevronRight,
  Info,
  ShieldCheck
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { apiFetch } from "@/lib/api";
import ProfileForm from "@/components/ProfileForm";
import SavedAddresses from "@/components/SavedAddresses";
import SecuritySettings from "@/components/SecuritySettings";

interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  phoneVerified: boolean;
  profileImageUrl?: string;
}

type TabType = "basic" | "addresses" | "security";

export default function CustomerProfilePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 sm:p-6">
          <div className="mx-auto max-w-4xl">
            <div className="flex items-center justify-center py-12">
              <Loader size={32} className="animate-spin text-blue-600" />
            </div>
          </div>
        </div>
      }
    >
      <CustomerProfileContent />
    </Suspense>
  );
}

function CustomerProfileContent() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>("basic");
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await apiFetch("/customers/profile");
      setProfile(data);
    } catch (err) {
      const message = err instanceof Error ? err.message.toLowerCase() : '';
      if (message.includes('unauthorized')) {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('auth_role');
        router.replace('/');
        return;
      }
      setError(err instanceof Error ? err.message : "Failed to load profile");
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      router.replace('/');
      return;
    }
    fetchProfile();
  }, [router, fetchProfile]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-6">
        <div className="relative">
          <div className="h-20 w-20 border-[6px] border-blue-600/10 rounded-full" />
          <div className="h-20 w-20 border-[6px] border-blue-600 border-t-transparent rounded-full animate-spin absolute top-0" />
        </div>
        <div className="text-xs font-black text-slate-900 uppercase tracking-[0.3em]">Authenticating Vault</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20 pt-12 px-4 sm:px-6 lg:px-8 font-sans transition-colors duration-500">
      <div className="mx-auto max-w-6xl">
        {/* Breadcrumb & Header */}
        <header className="mb-14 px-2 animate-fade-in-up">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
            <div className="space-y-4">
              <Link
                href="/customer"
                className="group inline-flex items-center text-[10px] font-black uppercase tracking-[0.2em] text-blue-600 hover:text-blue-500 transition-all mb-4 px-4 py-2 bg-blue-50 rounded-full"
              >
                <ChevronRight className="mr-2 h-3 w-3 rotate-180 group-hover:-translate-x-1 transition-transform" />
                Operational Core
              </Link>
              <h1 className="text-5xl font-black text-slate-900 tracking-tight">
                Account <span className="text-blue-600 italic">Settings</span>
              </h1>
              <p className="text-slate-500 font-bold max-w-lg text-sm leading-relaxed">
                Manage your credentials and delivery parameters. Your digital identity, secured by industry standards.
              </p>
            </div>

            {/* Account Status Badge */}
            <div className="hidden md:flex items-center gap-4 bg-white border border-slate-200 rounded-[1.5rem] p-4 shadow-sm">
              <div className="h-10 w-10 rounded-2xl bg-emerald-50 flex items-center justify-center">
                <ShieldCheck className="text-emerald-500 h-5 w-5" />
              </div>
              <div>
                <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Vault Status</div>
                <div className="text-xs font-black text-slate-900 dark:text-white uppercase">Secured & Verified</div>
              </div>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          {/* Navigation Sidebar */}
          <aside className="lg:col-span-4 space-y-6">
            <nav className="bg-white border border-slate-200 rounded-[2.5rem] p-4 shadow-xl overflow-hidden">
              {[
                { id: "basic", label: "Identity & Profile", icon: User, desc: "Personal info & avatar" },
                { id: "addresses", label: "Saved Addresses", icon: MapPin, desc: "Pickup & delivery spots" },
                { id: "security", label: "Security & Safety", icon: Lock, desc: "Password & sessions" },
              ].map(({ id, label, icon: Icon, desc }) => {
                const isActive = activeTab === id;
                return (
                  <button
                    key={id}
                    onClick={() => setActiveTab(id as TabType)}
                    className={`w-full relative flex items-center gap-5 p-5 rounded-[2rem] transition-all group overflow-hidden ${isActive
                      ? 'bg-blue-600 text-white shadow-glow translate-x-1'
                      : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                      }`}
                  >
                    <div className={`p-4 rounded-2xl transition-all duration-500 ${isActive ? 'bg-white/20 rotate-12 scale-110' : 'bg-slate-100 group-hover:scale-105'}`}>
                      <Icon className={`h-5 w-5 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-blue-500'}`} />
                    </div>
                    <div className="text-left flex-1 min-w-0">
                      <div className="font-black text-xs uppercase tracking-widest mb-0.5">{label}</div>
                      <div className={`text-[10px] font-bold line-clamp-1 ${isActive ? 'text-blue-100' : 'text-slate-400'}`}>{desc}</div>
                    </div>
                    <ChevronRight className={`ml-auto h-4 w-4 transition-all ${isActive ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2'}`} />

                    {/* Active Indicator Background Glow */}
                    {isActive && (
                      <motion.div
                        layoutId="nav-bg"
                        className="absolute inset-0 bg-blue-600 -z-10"
                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                      />
                    )}
                  </button>
                );
              })}
            </nav>

            {/* System Tip */}
            <div className="bg-gradient-to-br from-indigo-500 to-blue-600 rounded-[2.5rem] p-8 text-white shadow-premium relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-150 transition-transform duration-700">
                <Info size={120} />
              </div>
              <div className="relative z-10 space-y-4">
                <div className="h-10 w-10 bg-white/20 rounded-2xl flex items-center justify-center">
                  <Info className="h-5 w-5" />
                </div>
                <h4 className="text-sm font-black uppercase tracking-widest">Efficiency Tip</h4>
                <p className="text-xs font-bold text-blue-50/80 leading-relaxed">
                  Keeping your address labels descriptive (e.g. "Main Lobby") helps our agents expedite your requests by 20%.
                </p>
              </div>
            </div>
          </aside>

          {/* Main Content Area */}
          <main className="lg:col-span-8">
            <div className="bg-white border border-slate-200 rounded-[3rem] shadow-2xl relative overflow-hidden">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 10, filter: 'blur(10px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, y: -10, filter: 'blur(10px)' }}
                  transition={{ duration: 0.4, ease: "circOut" }}
                  className="p-8 sm:p-12"
                >
                  {/* Basic Info Tab */}
                  {activeTab === "basic" && (
                    <div className="space-y-10">
                      <header className="flex items-center justify-between gap-4 border-b border-slate-100 pb-8">
                        <div className="space-y-1">
                          <h2 className="text-3xl font-black text-slate-900 tracking-tight italic uppercase">Identity</h2>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-relaxed">Personal encryption & visual credentials</p>
                        </div>
                        <div className="h-16 w-16 bg-blue-50 rounded-[1.5rem] flex items-center justify-center">
                          <User className="h-8 w-8 text-blue-600" />
                        </div>
                      </header>
                      <ProfileForm
                        profile={profile}
                        isLoading={isLoading}
                        onProfileUpdate={setProfile}
                      />
                    </div>
                  )}

                  {/* Saved Addresses Tab */}
                  {activeTab === "addresses" && (
                    <div className="space-y-10">
                      <header className="flex items-center justify-between gap-4 border-b border-slate-100 pb-8">
                        <div className="space-y-1">
                          <h2 className="text-3xl font-black text-slate-900 tracking-tight italic uppercase">Locations</h2>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-relaxed">Geospatial delivery parameters</p>
                        </div>
                        <div className="h-16 w-16 bg-blue-50 rounded-[1.5rem] flex items-center justify-center">
                          <MapPin className="h-8 w-8 text-blue-600" />
                        </div>
                      </header>
                      <SavedAddresses />
                    </div>
                  )}

                  {/* Security Tab */}
                  {activeTab === "security" && (
                    <div className="space-y-10">
                      <header className="flex items-center justify-between gap-4 border-b border-slate-100 pb-8">
                        <div className="space-y-1">
                          <h2 className="text-3xl font-black text-slate-900 tracking-tight italic uppercase">Security</h2>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-relaxed">Cryptographic vault & session tokens</p>
                        </div>
                        <div className="h-16 w-16 bg-blue-50 rounded-[1.5rem] flex items-center justify-center">
                          <Lock className="h-8 w-8 text-blue-600" />
                        </div>
                      </header>
                      <SecuritySettings />
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
