"use client";

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { apiFetch, API_BASE_URL } from '@/lib/api';

type TabType = 'profile' | 'security';

type RiderProfile = {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  riderImageUrl?: string;
};

export default function RiderSettingsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('profile');
  const [profile, setProfile] = useState<RiderProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const ASSET_BASE = API_BASE_URL.replace(/\/api\/?$/, '');
  const resolveImg = (url?: string) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    return `${ASSET_BASE}${url.startsWith('/') ? '' : '/'}${url}`;
  };

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const data = await apiFetch('/rider/profile');
        setProfile(data as RiderProfile);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"></div>
          <p className="text-blue-900 font-black uppercase tracking-widest text-xs animate-pulse">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl p-4">
      <header className="mb-6">
        <h1 className="text-3xl font-black text-blue-900 tracking-tight">Settings</h1>
        <p className="text-blue-700/60 text-sm font-medium">Manage your account settings.</p>
      </header>

      <div className="mb-6 flex gap-2">
        <button
          onClick={() => setActiveTab('profile')}
          className={`flex-1 rounded-full border px-4 py-3 text-sm font-bold transition ${
            activeTab === 'profile'
              ? 'border-blue-600 bg-blue-600 text-white'
              : 'border-blue-200 bg-white text-blue-900 hover:border-blue-400'
          }`}
        >
          Profile Overview
        </button>
        <button
          onClick={() => setActiveTab('security')}
          className={`flex-1 rounded-full border px-4 py-3 text-sm font-bold transition ${
            activeTab === 'security'
              ? 'border-blue-600 bg-blue-600 text-white'
              : 'border-blue-200 bg-white text-blue-900 hover:border-blue-400'
          }`}
        >
          Security
        </button>
      </div>

      <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
        {activeTab === 'profile' && (
          <div className="space-y-4">
            <h2 className="text-xl font-black text-blue-900">Profile Overview</h2>
            <p className="text-sm text-blue-700/70">View your profile information. Go to Profile page to edit.</p>
            
            <div className="flex items-center gap-4 rounded-2xl bg-slate-50 p-4">
              {profile?.riderImageUrl ? (
                <img
                  src={resolveImg(profile.riderImageUrl)}
                  alt="Profile"
                  className="h-16 w-16 rounded-full object-cover border-2 border-white shadow"
                />
              ) : (
                <div className="h-16 w-16 rounded-full bg-blue-600 flex items-center justify-center text-white text-xl font-black">
                  {(profile?.firstName?.charAt(0) || 'R').toUpperCase()}
                </div>
              )}
              <div>
                <p className="text-lg font-black text-blue-900">
                  {`${profile?.firstName || ''} ${profile?.lastName || ''}`.trim() || 'Rider'}
                </p>
                <p className="text-sm text-blue-700/60">{profile?.email || ''}</p>
                <p className="text-sm text-blue-700/60">{profile?.phone || ''}</p>
              </div>
            </div>

            <Link
              href="/rider/profile"
              className="inline-flex items-center rounded-xl bg-blue-600 px-4 py-2 text-xs font-black uppercase tracking-widest text-white hover:bg-blue-700"
            >
              Edit Profile
            </Link>
          </div>
        )}

        {activeTab === 'security' && (
          <div className="space-y-3">
            <h2 className="text-xl font-black text-blue-900">Security</h2>
            <p className="text-sm text-blue-700/70">To change password, use the forgot password flow.</p>
            <Link
              href="/reset-password"
              className="inline-flex items-center rounded-xl bg-blue-600 px-4 py-2 text-xs font-black uppercase tracking-widest text-white hover:bg-blue-700"
            >
              Go to Reset Password
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
