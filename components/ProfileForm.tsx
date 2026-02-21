"use client";

import React, { FormEvent, useState, useEffect } from "react";
import { Camera, CheckCircle, AlertCircle, Loader, X } from "lucide-react";
import { apiFetch } from "@/lib/api";

const BACKEND_URL = (process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000').replace(/\/+$/, '');

function resolveImageUrl(url: string | undefined | null): string | null {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url;
  }
  return `${BACKEND_URL}${url.startsWith('/') ? '' : '/'}${url}`;
}

interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  phoneVerified: boolean;
  profileImageUrl?: string;
}

interface ProfileFormProps {
  profile: UserProfile | null;
  isLoading?: boolean;
  onProfileUpdate?: (profile: UserProfile) => void;
}

type SubmissionStatus = "idle" | "loading" | "success" | "error";

export default function ProfileForm({
  profile,
  isLoading = false,
  onProfileUpdate,
}: ProfileFormProps) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [status, setStatus] = useState<SubmissionStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    if (profile) {
      setFirstName(profile.firstName);
      setLastName(profile.lastName);
      setEmail(profile.email);
      setPhoneNumber(profile.phoneNumber);
      setProfileImage(resolveImageUrl(profile.profileImageUrl));
    }
  }, [profile]);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setStatus("loading");
      const formData = new FormData();
      formData.append("profileImage", file);

      const response = await apiFetch("/customers/profile/upload", {
        method: "PATCH",
        body: formData,
      });

      if (response.profileImageUrl) {
        setProfileImage(resolveImageUrl(response.profileImageUrl));
      }
      setStatus("success");
      setTimeout(() => setStatus("idle"), 2000);
    } catch (err) {
      setStatus("error");
      setError(
        err instanceof Error ? err.message : "Failed to upload image"
      );
      setTimeout(() => setStatus("idle"), 3000);
    }
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setShowConfirm(true);
  };

  const confirmSave = async () => {
    setShowConfirm(false);
    try {
      setStatus("loading");

      const response = await apiFetch("/customers/profile", {
        method: "PATCH",
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim(),
          phoneNumber: phoneNumber.trim(),
        }),
      });

      setStatus("success");
      onProfileUpdate?.(response);
      setTimeout(() => setStatus("idle"), 2000);
    } catch (err) {
      setStatus("error");
      setError(
        err instanceof Error ? err.message : "Failed to update profile"
      );
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader size={32} className="animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="flex gap-3 rounded-lg bg-red-50 p-4">
          <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {status === "success" && (
        <div className="flex gap-3 rounded-lg bg-green-50 p-4">
          <CheckCircle size={20} className="text-green-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-green-700">Profile updated successfully</p>
        </div>
      )}

      {/* Profile Picture */}
      <div className="space-y-3">
        <label className="text-sm font-semibold text-gray-900">
          Profile Picture
        </label>
        <div className="flex items-center gap-4">
          <div className="h-20 w-20 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center border-2 border-gray-200">
            {profileImage ? (
              <img
                src={profileImage}
                alt="Profile"
                className="h-full w-full object-cover"
              />
            ) : (
              <Camera size={32} className="text-gray-400" />
            )}
          </div>
          <label className="relative cursor-pointer">
            <span className="inline-flex items-center gap-2 rounded-lg bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-600 hover:bg-blue-100 transition-colors">
              <Camera size={16} />
              Change Picture
            </span>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* Name Fields */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="firstName" className="text-sm font-semibold text-gray-900">
            First Name
          </label>
          <input
            id="firstName"
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 placeholder:text-gray-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            placeholder="Enter your first name"
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="lastName" className="text-sm font-semibold text-gray-900">
            Last Name
          </label>
          <input
            id="lastName"
            type="text"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 placeholder:text-gray-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            placeholder="Enter your last name"
          />
        </div>
      </div>

      {/* Email */}
      <div className="space-y-2">
        <label htmlFor="email" className="text-sm font-semibold text-gray-900">
          Email Address
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 placeholder:text-gray-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          placeholder="Enter your email"
        />
      </div>

      {/* Phone Number */}
      <div className="space-y-2">
        <label htmlFor="phone" className="text-sm font-semibold text-gray-900">
          Phone Number {profile?.phoneVerified && (
            <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-800">
              <CheckCircle size={12} />
              Verified
            </span>
          )}
        </label>
        <input
          id="phone"
          type="tel"
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
          className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 placeholder:text-gray-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          placeholder="Enter your phone number"
        />
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={status === "loading"}
        className="w-full rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-blue-700 disabled:bg-gray-400"
      >
        {status === "loading" ? "Saving..." : "Save Changes"}
      </button>

      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl animate-in fade-in">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Confirm Changes</h3>
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <p className="text-sm text-gray-600 mb-4">
              Please review your updated information before saving:
            </p>

            <div className="space-y-3 rounded-xl bg-gray-50 p-4 mb-6">
              <div className="flex justify-between text-sm">
                <span className="font-medium text-gray-500">First Name</span>
                <span className="font-semibold text-gray-900">{firstName.trim() || "—"}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="font-medium text-gray-500">Last Name</span>
                <span className="font-semibold text-gray-900">{lastName.trim() || "—"}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="font-medium text-gray-500">Email</span>
                <span className="font-semibold text-gray-900">{email.trim() || "—"}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="font-medium text-gray-500">Phone</span>
                <span className="font-semibold text-gray-900">{phoneNumber.trim() || "—"}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmSave}
                className="flex-1 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
              >
                Confirm Save
              </button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
