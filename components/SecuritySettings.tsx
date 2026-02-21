"use client";

import React, { FormEvent, useState, useEffect } from "react";
import {
  Lock,
  Smartphone,
  AlertCircle,
  CheckCircle,
  Loader,
  Trash2,
} from "lucide-react";
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
        err instanceof Error ? err.message : "Failed to load devices"
      );
    } finally {
      setDevicesLoading(false);
    }
  };

  const handleChangePassword = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPasswordError(null);

    if (!currentPassword.trim() || !newPassword.trim() || !confirmPassword.trim()) {
      setPasswordError("Please fill in all password fields");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("New password and confirmation do not match");
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters long");
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
        err instanceof Error ? err.message : "Failed to change password"
      );
    }
  };

  const handleLogoutDevice = async (deviceId: string) => {
    if (!confirm("Are you sure you want to logout this device?")) return;

    try {
      await apiFetch(`/customers/security/devices/${deviceId}/logout`, {
        method: "POST",
      });
      setDevices(devices.filter((d) => d.id !== deviceId));
    } catch (err) {
      setDevicesError(
        err instanceof Error ? err.message : "Failed to logout device"
      );
    }
  };

  return (
    <div className="space-y-8">
      {/* Change Password Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Lock size={24} className="text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">
            Change Password
          </h3>
        </div>

        {passwordError && (
          <div className="flex gap-3 rounded-lg bg-red-50 p-4">
            <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{passwordError}</p>
          </div>
        )}

        {passwordStatus === "success" && (
          <div className="flex gap-3 rounded-lg bg-green-50 p-4">
            <CheckCircle size={20} className="text-green-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-green-700">
              Password changed successfully
            </p>
          </div>
        )}

        <form onSubmit={handleChangePassword} className="space-y-4">
          <div className="space-y-2">
            <label
              htmlFor="currentPassword"
              className="text-sm font-semibold text-gray-900"
            >
              Current Password
            </label>
            <input
              id="currentPassword"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 placeholder:text-gray-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              placeholder="Enter your current password"
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="newPassword"
              className="text-sm font-semibold text-gray-900"
            >
              New Password
            </label>
            <input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 placeholder:text-gray-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              placeholder="Enter your new password"
            />
            <p className="text-xs text-gray-500">
              At least 8 characters required
            </p>
          </div>

          <div className="space-y-2">
            <label
              htmlFor="confirmPassword"
              className="text-sm font-semibold text-gray-900"
            >
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 placeholder:text-gray-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              placeholder="Confirm your new password"
            />
          </div>

          <button
            type="submit"
            disabled={passwordStatus === "loading"}
            className="w-full rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-blue-700 disabled:bg-gray-400"
          >
            {passwordStatus === "loading"
              ? "Updating..."
              : "Update Password"}
          </button>
        </form>
      </div>

      {/* Logged-in Devices Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Smartphone size={24} className="text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">
            Logged-in Devices
          </h3>
        </div>

        {devicesError && (
          <div className="flex gap-3 rounded-lg bg-red-50 p-4">
            <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{devicesError}</p>
          </div>
        )}

        {devicesLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader size={24} className="animate-spin text-blue-600" />
          </div>
        ) : devices.length === 0 ? (
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-6 text-center">
            <Smartphone size={32} className="mx-auto mb-2 text-gray-400" />
            <p className="text-gray-600">No devices logged in</p>
          </div>
        ) : (
          <div className="space-y-3">
            {devices.map((device) => (
              <div
                key={device.id}
                className="rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Smartphone size={18} className="text-gray-600" />
                      <h4 className="font-semibold text-gray-900">
                        {device.deviceName}
                      </h4>
                      {device.isCurrent && (
                        <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-800">
                          Current Device
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">
                      IP Address: {device.ipAddress}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Last accessed: {new Date(device.lastAccessedAt).toLocaleString()}
                    </p>
                  </div>
                  {!device.isCurrent && (
                    <button
                      onClick={() => handleLogoutDevice(device.id)}
                      className="text-red-600 hover:bg-red-50 p-2 rounded-lg transition-colors"
                      title="Logout this device"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <p className="text-xs text-gray-500 mt-4">
          💡 Tip: If you see an unfamiliar device, you can logout it to remove access to your account.
        </p>
      </div>
    </div>
  );
}
