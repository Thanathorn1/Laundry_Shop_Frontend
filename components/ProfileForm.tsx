"use client";

import React, { FormEvent, useState, useEffect } from "react";
import { Camera, CheckCircle, AlertCircle, Loader, X, User, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { apiFetch, resolveImageUrl, triggerProfileUpdate } from "@/lib/api";

const BACKEND_URL = (process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000').replace(/\/+$/, '');

// Local resolveImageUrl removed, using import from @/lib/api

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

      const { apiUpload } = await import("@/lib/api");
      const response = await apiUpload("/customers/profile/upload", formData);

      if (response.profileImageUrl) {
        setProfileImage(resolveImageUrl(response.profileImageUrl));
      }
      triggerProfileUpdate();
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
      triggerProfileUpdate();
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
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="h-12 w-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin shadow-lg" />
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Hydrating Profile...</span>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      <form onSubmit={handleSubmit} className="space-y-10">
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="flex gap-4 rounded-[2rem] bg-rose-50 border border-rose-100 p-6"
            >
              <AlertCircle size={20} className="text-rose-600 flex-shrink-0" />
              <p className="text-sm font-bold text-rose-700">{error}</p>
            </motion.div>
          )}

          {status === "success" && (
            <motion.div
              initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="flex gap-4 rounded-[2rem] bg-emerald-50 border border-emerald-100 p-6"
            >
              <CheckCircle size={20} className="text-emerald-600 flex-shrink-0" />
              <p className="text-sm font-bold text-emerald-700">Credentials Synchronized</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Profile Picture Section */}
        <div className="flex flex-col md:flex-row md:items-center gap-10">
          <div className="relative group">
            <div className="h-32 w-32 rounded-[2.5rem] overflow-hidden bg-slate-100 border-4 border-white shadow-xl group-hover:shadow-2xl transition-all duration-500 group-hover:rotate-3 group-hover:scale-105">
              {profileImage ? (
                <img
                  src={profileImage}
                  alt="Profile"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="h-full w-full flex items-center justify-center">
                  <User size={48} className="text-slate-300" />
                </div>
              )}
            </div>
            <label className="absolute -bottom-2 -right-2 h-10 w-10 bg-blue-600 text-white rounded-2xl flex items-center justify-center cursor-pointer shadow-lg hover:bg-blue-700 active:scale-95 transition-all">
              <Camera size={18} />
              <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
            </label>
          </div>
          <div className="space-y-2">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Your Visual Identity</h3>
            <p className="text-xs font-bold text-slate-400 max-w-[240px] leading-relaxed">
              Recommended: Square JPG or PNG. Max size 2MB. This image will also appear on your delivery receipts.
            </p>
          </div>
        </div>

        {/* Input Fields Grid */}
        <div className="grid gap-6 sm:grid-cols-2">
          {[
            { id: 'firstName', label: 'First Name', value: firstName, setter: setFirstName, placeholder: 'Operational Name' },
            { id: 'lastName', label: 'Last Name', value: lastName, setter: setLastName, placeholder: 'Surname' },
          ].map((field) => (
            <div key={field.id} className="space-y-2">
              <label htmlFor={field.id} className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{field.label}</label>
              <input
                id={field.id}
                type="text"
                value={field.value}
                onChange={(e) => field.setter(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm font-bold text-slate-900 outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 transition-all placeholder:text-slate-400"
                placeholder={field.placeholder}
              />
            </div>
          ))}

          <div className="space-y-2">
            <label htmlFor="email" className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Secure Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm font-bold text-slate-900 outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 transition-all placeholder:text-slate-400"
              placeholder="operator@system.com"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="phone" className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center justify-between">
              Digital Contact
              {profile?.phoneVerified && (
                <span className="text-[8px] flex items-center gap-1 bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full border border-emerald-100">
                  <CheckCircle size={8} /> Verified
                </span>
              )}
            </label>
            <input
              id="phone"
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm font-bold text-slate-900 outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 transition-all placeholder:text-slate-400"
              placeholder="+1 (555) 000-0000"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={status === "loading"}
          className="group relative w-full overflow-hidden rounded-[2rem] bg-slate-900 text-white px-8 py-5 text-sm font-black uppercase tracking-[0.2em] shadow-xl hover:shadow-2xl transition-all active:scale-95 disabled:opacity-50"
        >
          <span className="relative z-10 flex items-center justify-center gap-3">
            {status === "loading" ? "Encrypting Data..." : "Apply Transformations"}
            {status !== "loading" && <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />}
          </span>
          <div className="absolute inset-0 bg-blue-600 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        </button>
      </form>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {showConfirm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowConfirm(false)}
              className="absolute inset-0 bg-slate-950/40 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-[3rem] p-10 shadow-2xl border border-white/20"
            >
              <div className="space-y-8">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <h3 className="text-2xl font-black text-slate-900 tracking-tight">Review Changes</h3>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Integrity Verification</p>
                  </div>
                  <X className="h-6 w-6 text-slate-400 cursor-pointer hover:text-slate-900 transition-colors" onClick={() => setShowConfirm(false)} />
                </div>

                <div className="space-y-4 bg-slate-50 rounded-[2rem] p-8 border border-slate-100">
                  {[
                    { label: 'Name', value: `${firstName} ${lastName}` },
                    { label: 'Secure Email', value: email },
                    { label: 'Contact', value: phoneNumber }
                  ].map((row, i) => (
                    <div key={i} className="flex justify-between items-center gap-4">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{row.label}</span>
                      <span className="text-sm font-black text-slate-900 truncate">{row.value}</span>
                    </div>
                  ))}
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={() => setShowConfirm(false)}
                    className="flex-1 px-8 py-5 bg-slate-100 text-slate-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all"
                  >
                    Abort
                  </button>
                  <button
                    onClick={confirmSave}
                    className="flex-[2] px-8 py-5 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-glow hover:shadow-premium transition-all"
                  >
                    Confirm & Sign
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
