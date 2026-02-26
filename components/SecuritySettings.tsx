"use client";

import React, { FormEvent, useState, useEffect } from "react";
import {
  Lock,
  Smartphone,
  AlertCircle,
  CheckCircle,
  Loader,
  Trash2,
  ChevronRight,
  Info
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { apiFetch } from "@/lib/api";

interface LoginDevice {
  id: string;
  deviceName: string;
  lastAccessedAt: string;
  ipAddress: string;
  isCurrent: boolean;
}

type PasswordStatus = "idle" | "loading" | "success" | "error";

export default function SecuritySettings() {
  // Password change
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordStatus, setPasswordStatus] = useState<PasswordStatus>("idle");
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Devices
  const [devices, setDevices] = useState<LoginDevice[]>([]);
  const [devicesLoading, setDevicesLoading] = useState(true);
  const [devicesError, setDevicesError] = useState<string | null>(null);

  useEffect(() => {
    fetchDevices();
  }, []);

  const fetchDevices = async () => {
    try {
      setDevicesLoading(true);
      setDevicesError(null);
      const data = await apiFetch("/customers/security/devices");
      setDevices(data.devices || []);
    } catch (err) {
      setDevicesError(
        err instanceof Error ? err.message : "Access log synchronization failed"
      );
    } finally {
      setDevicesLoading(false);
    }
  };

  const handleChangePassword = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPasswordError(null);

    if (!currentPassword.trim() || !newPassword.trim() || !confirmPassword.trim()) {
      setPasswordError("All cryptographic fields are mandatory.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("Confirmation token mismatch.");
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError("Security protocol requires minimum 8 characters.");
      return;
    }

    try {
      setPasswordStatus("loading");
      await apiFetch("/customers/security/change-password", {
        method: "POST",
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      setPasswordStatus("success");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setPasswordStatus("idle"), 2000);
    } catch (err) {
      setPasswordStatus("error");
      setPasswordError(
        err instanceof Error ? err.message : "Password rotation failed"
      );
    }
  };

  const handleLogoutDevice = async (deviceId: string) => {
    if (!confirm("Terminate this session node immediately?")) return;

    try {
      await apiFetch(`/customers/security/devices/${deviceId}/logout`, {
        method: "POST",
      });
      setDevices(devices.filter((d) => d.id !== deviceId));
    } catch (err) {
      setDevicesError(
        err instanceof Error ? err.message : "Session termination failure"
      );
    }
  };

  if (devicesLoading && devices.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="h-10 w-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin shadow-glow" />
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-relaxed">Securing Channel...</span>
      </div>
    );
  }

  return (
    <div className="space-y-16">
      {/* Password Rotation Section */}
      <section className="space-y-10">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 bg-blue-50 rounded-2xl flex items-center justify-center">
            <Lock size={22} className="text-blue-600" />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Password Rotation</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">Cryptographic key management</p>
          </div>
        </div>

        <AnimatePresence>
          {passwordError && (
            <motion.div
              initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
              className="flex gap-4 rounded-[2rem] bg-rose-50 border border-rose-100 p-6"
            >
              <AlertCircle size={20} className="text-rose-600 flex-shrink-0" />
              <p className="text-sm font-bold text-rose-700">{passwordError}</p>
            </motion.div>
          )}

          {passwordStatus === "success" && (
            <motion.div
              initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
              className="flex gap-4 rounded-[2rem] bg-emerald-50 border border-emerald-100 p-6"
            >
              <CheckCircle size={20} className="text-emerald-600 flex-shrink-0" />
              <p className="text-sm font-bold text-emerald-700">Vault Successfully Rotated</p>
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={handleChangePassword} className="grid md:grid-cols-2 gap-6 items-end">
          <div className="space-y-2">
            <label htmlFor="currentPassword" className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Current Key</label>
            <input
              id="currentPassword"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm font-bold text-slate-900 outline-none focus:border-blue-500 focus:bg-white transition-all placeholder:text-slate-400"
              placeholder="••••••••"
            />
          </div>

          <div className="md:col-span-2 grid sm:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label htmlFor="newPassword" className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">New Signature</label>
              <input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm font-bold text-slate-900 outline-none focus:border-blue-500 focus:bg-white transition-all placeholder:text-slate-400"
                placeholder="New token"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="confirmPassword" className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Confirm Signature</label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm font-bold text-slate-900 outline-none focus:border-blue-500 focus:bg-white transition-all placeholder:text-slate-400"
                placeholder="Verify token"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={passwordStatus === "loading"}
            className="md:col-span-2 group relative w-full overflow-hidden rounded-[2rem] bg-slate-900 text-white px-8 py-5 text-sm font-black uppercase tracking-[0.2em] shadow-xl hover:shadow-2xl transition-all active:scale-95 disabled:opacity-50"
          >
            <span className="relative z-10 flex items-center justify-center gap-3">
              {passwordStatus === "loading" ? "Encrypting Vault..." : "Update Security Credentials"}
              {passwordStatus !== "loading" && <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />}
            </span>
            <div className="absolute inset-0 bg-blue-600 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          </button>
        </form>
      </section>

      {/* Active Session Nodes Section */}
      <section className="space-y-10 pt-10 border-t border-slate-100">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 bg-blue-50 rounded-2xl flex items-center justify-center">
            <Smartphone size={22} className="text-blue-600" />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Session Nodes</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">Authorized hardware endpoints</p>
          </div>
        </div>

        {devicesError && (
          <div className="flex gap-4 rounded-[2rem] bg-rose-50 border border-rose-100 p-6">
            <AlertCircle size={20} className="text-rose-600 flex-shrink-0" />
            <p className="text-sm font-bold text-rose-700">{devicesError}</p>
          </div>
        )}

        <div className="grid gap-6">
          {devices.map((device, index) => (
            <motion.div
              key={device.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
              className="group relative bg-white border border-slate-100 rounded-[2.5rem] p-8 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-500 overflow-hidden"
            >
              <div className="flex items-start justify-between gap-6">
                <div className="flex items-center gap-6">
                  <div className={`h-14 w-14 rounded-[1.5rem] flex items-center justify-center transition-all group-hover:rotate-12 group-hover:scale-110 ${device.isCurrent ? 'bg-blue-600 text-white shadow-glow' : 'bg-slate-50 text-slate-400'}`}>
                    <Smartphone size={24} />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest">{device.deviceName}</h4>
                      {device.isCurrent && (
                        <span className="text-[8px] font-black uppercase tracking-[0.2em] bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full border border-emerald-100">Current Node</span>
                      )}
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-x-6 gap-y-1 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      <span>IP: <strong className="text-slate-600 ml-1">{device.ipAddress}</strong></span>
                      <span className="hidden sm:inline opacity-20">•</span>
                      <span>Link: <strong className="text-slate-600 ml-1">{new Date(device.lastAccessedAt).toLocaleDateString()}</strong></span>
                    </div>
                  </div>
                </div>

                {!device.isCurrent && (
                  <button
                    onClick={() => handleLogoutDevice(device.id)}
                    className="p-4 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-2xl transition-all group/btn"
                    title="Terminate Session"
                  >
                    <Trash2 size={20} className="group-hover/btn:scale-110 transition-transform" />
                  </button>
                )}
              </div>
            </motion.div>
          ))}
        </div>

        <div className="p-8 rounded-[2rem] bg-slate-50 border border-slate-100 flex items-start gap-4">
          <Info size={20} className="text-blue-500 flex-shrink-0 mt-0.5" />
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-relaxed">
            Security Protocol: If you detect unauthorized nodes in your hardware history, terminate them immediately and rotate your signature credentials.
          </p>
        </div>
      </section>
    </div>
  );
}
