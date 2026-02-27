"use client";

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';

type TabType = 'basic' | 'security';

type EmployeeProfile = {
  firstName?: string;
  lastName?: string;
  email?: string;
  phoneNumber?: string;
  profileImage?: string;
};

export default function EmployeeSettingsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('basic');
  const [profile, setProfile] = useState<EmployeeProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [formFirstName, setFormFirstName] = useState('');
  const [formLastName, setFormLastName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formProfileImagePreview, setFormProfileImagePreview] = useState<string | null>(null);
  const [formProfileImageBase64, setFormProfileImageBase64] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const data = await apiFetch('/employee/me');
        const safeProfile = (data || {}) as EmployeeProfile;
        setProfile(safeProfile);
        setFormFirstName((safeProfile.firstName || '').trim());
        setFormLastName((safeProfile.lastName || '').trim());
        setFormPhone((safeProfile.phoneNumber || '').trim());
        if (safeProfile.profileImage) {
          setFormProfileImagePreview(safeProfile.profileImage);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const submitProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    try {
      setIsSaving(true);
      const updated = await apiFetch('/employee/update', {
        method: 'PUT',
        body: JSON.stringify({
          firstName: formFirstName.trim(),
          lastName: formLastName.trim(),
          phoneNumber: formPhone.trim(),
          ...(formProfileImageBase64 ? { profileImage: formProfileImageBase64 } : {}),
        }),
      });
      setProfile((updated || {}) as EmployeeProfile);
      setFormProfileImageBase64(null);
      if ((updated as EmployeeProfile | null)?.profileImage) {
        setFormProfileImagePreview((updated as EmployeeProfile).profileImage || null);
      }
      setSuccess('Profile updated successfully');
      window.dispatchEvent(new Event('profile:updated'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

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
        <h1 className="text-3xl font-black text-blue-900 tracking-tight">Profile Settings</h1>
        <p className="text-blue-700/60 text-sm font-medium">Manage your profile and account settings.</p>
      </header>

      <div className="mb-6 flex gap-2">
        <button
          onClick={() => setActiveTab('basic')}
          className={`flex-1 rounded-full border px-4 py-3 text-sm font-bold transition ${
            activeTab === 'basic'
              ? 'border-blue-600 bg-blue-600 text-white'
              : 'border-blue-200 bg-white text-blue-900 hover:border-blue-400'
          }`}
        >
          Basic Info
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

      {(error || success) && (
        <div className={`mb-4 rounded-xl p-3 text-sm font-bold ${error ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>
          {error || success}
        </div>
      )}

      <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
        {activeTab === 'basic' && (
          <form onSubmit={submitProfile} className="space-y-4">
            <h2 className="text-xl font-black text-blue-900">Basic Info</h2>
            <p className="text-sm text-blue-700/70">Update your personal information.</p>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-[10px] font-black text-blue-400 uppercase tracking-widest">First Name</label>
                <input
                  type="text"
                  value={formFirstName}
                  onChange={(e) => setFormFirstName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-blue-900 font-bold outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all"
                  placeholder="John"
                />
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-black text-blue-400 uppercase tracking-widest">Last Name</label>
                <input
                  type="text"
                  value={formLastName}
                  onChange={(e) => setFormLastName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-blue-900 font-bold outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all"
                  placeholder="Doe"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-[10px] font-black text-blue-400 uppercase tracking-widest">Phone Number</label>
              <input
                type="text"
                value={formPhone}
                onChange={(e) => setFormPhone(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-blue-900 font-bold outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all"
                placeholder="08X-XXX-XXXX"
              />
            </div>

            <div>
              <label className="mb-1 block text-[10px] font-black text-blue-400 uppercase tracking-widest">Profile Image</label>
              <div className="mb-2 flex items-center gap-3">
                {formProfileImagePreview ? (
                  <img src={formProfileImagePreview} alt="Profile" className="h-16 w-16 rounded-full border-2 border-blue-100 object-cover shadow" />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-lg font-black text-blue-700">
                    {((formFirstName || profile?.firstName || 'E').trim().charAt(0) || 'E').toUpperCase()}
                  </div>
                )}
                <label className="inline-flex cursor-pointer items-center rounded-xl border border-blue-200 bg-white px-3 py-2 text-xs font-black uppercase tracking-widest text-blue-700 hover:border-blue-400">
                  Choose image
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      if (!file.type.startsWith('image/')) {
                        setError('Please select an image file');
                        return;
                      }
                      const reader = new FileReader();
                      reader.onload = () => {
                        const result = typeof reader.result === 'string' ? reader.result : null;
                        if (!result) {
                          setError('Failed to read selected image');
                          return;
                        }
                        setFormProfileImagePreview(result);
                        setFormProfileImageBase64(result);
                        setError(null);
                      };
                      reader.onerror = () => setError('Failed to read selected image');
                      reader.readAsDataURL(file);
                      e.currentTarget.value = '';
                    }}
                  />
                </label>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-[10px] font-black text-blue-400 uppercase tracking-widest">Email</label>
              <input
                type="email"
                value={profile?.email || ''}
                disabled
                className="w-full rounded-xl border border-slate-200 bg-slate-100 px-4 py-3 text-slate-500 font-bold cursor-not-allowed"
              />
              <p className="mt-1 text-[10px] text-slate-400">Email cannot be changed</p>
            </div>

            <button
              type="submit"
              disabled={isSaving}
              className="rounded-2xl bg-blue-600 px-6 py-3 text-sm font-black uppercase tracking-widest text-white hover:bg-blue-700 disabled:opacity-60 transition-all"
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
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
