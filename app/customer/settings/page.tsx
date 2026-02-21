"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import {
  User,
  MapPin,
  Lock,
  Loader,
  AlertCircle,
  ChevronRight,
  ArrowLeft,
} from "lucide-react";
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

  useEffect(() => {
    // Check if user is authenticated
    const token = localStorage.getItem('access_token');
    if (!token) {
      router.replace('/');
      return;
    }
    fetchProfile();
  }, [router]);

  const fetchProfile = async () => {
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
      setError(
        err instanceof Error ? err.message : "Failed to load profile"
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 sm:p-6">
        <div className="mx-auto max-w-4xl">
          <div className="flex items-center justify-center py-12">
            <Loader size={32} className="animate-spin text-blue-600" />
          </div>
        </div>
      </div>
    );
  }

  if (error && !profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 sm:p-6">
        <div className="mx-auto max-w-4xl">
          <div className="flex gap-3 rounded-lg bg-red-50 p-4">
            <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-red-900">Error</p>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 sm:p-6 pb-12">
      <div className="mx-auto max-w-4xl">
        {/* Back Button */}
        <div className="flex justify-end mb-4">
          <button
            onClick={() => router.push('/customer')}
            className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-white px-4 py-2 text-sm font-semibold text-blue-600 shadow-sm hover:bg-blue-50 hover:border-blue-300 transition-all"
          >
            <ArrowLeft size={18} />
            Back
          </button>
        </div>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Profile Settings
          </h1>
          <p className="text-gray-600">
            Manage your personal information, addresses, and security settings
          </p>
        </div>

        {/* Tabs Navigation */}
        <div className="mb-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { id: "basic", label: "Basic Info", icon: User },
            { id: "addresses", label: "Saved Addresses", icon: MapPin },
            { id: "security", label: "Security", icon: Lock },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as TabType)}
              className={`relative rounded-lg px-4 py-3 font-semibold transition-all hover:shadow-md ${activeTab === id
                ? "bg-white text-blue-600 shadow-lg"
                : "bg-white/60 text-gray-600 hover:bg-white"
                }`}
            >
              <div className="flex items-center justify-center sm:justify-start gap-2">
                <Icon size={20} />
                <span className="hidden sm:inline">{label}</span>
              </div>
              {activeTab === id && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600 rounded-b-lg" />
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8">
          {/* Basic Info Tab */}
          {activeTab === "basic" && (
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                Basic Information
              </h2>
              <ProfileForm
                profile={profile}
                isLoading={isLoading}
                onProfileUpdate={setProfile}
              />
            </div>
          )}

          {/* Saved Addresses Tab */}
          {activeTab === "addresses" && (
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Saved Addresses
              </h2>
              <p className="text-gray-600 mb-6">
                Manage your frequently used addresses for faster ordering
              </p>
              <SavedAddresses />
            </div>
          )}

          {/* Security Tab */}
          {activeTab === "security" && (
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Security & Privacy
              </h2>
              <p className="text-gray-600 mb-6">
                Change your password and manage active sessions
              </p>
              <SecuritySettings />
            </div>
          )}
        </div>

        {/* Info Banner */}
        <div className="mt-6 rounded-lg bg-blue-50 border border-blue-200 p-4 text-sm text-blue-800">
          <p>
            💡 <strong>Tip:</strong> Your personal information is encrypted and
            never shared with third parties. Update your details to keep your
            account secure.
          </p>
        </div>
      </div>
    </div>
  );
}
