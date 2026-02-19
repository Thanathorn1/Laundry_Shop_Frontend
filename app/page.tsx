"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { API_BASE_URL } from "@/lib/api";

type LoginRole = "user" | "rider" | "admin";
type AuthMode = "signin" | "signup";

type SignInResponse = {
  access_token: string;
  refresh_token: string;
};

export default function Home() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<LoginRole>("user");
  const [mode, setMode] = useState<AuthMode>("signin");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const apiBaseUrl = useMemo(() => API_BASE_URL, []);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setIsLoading(true);

    try {
      const endpoint = mode === "signup" ? "signup" : "signin";
      const response = await fetch(`${apiBaseUrl}/auth/${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password, role }),
      });

      if (!response.ok) {
        const failedData = (await response.json().catch(() => ({}))) as {
          message?: string | string[];
        };
        const backendMessage = Array.isArray(failedData.message)
          ? failedData.message[0]
          : failedData.message;

        throw new Error(backendMessage ?? "Login failed");
      }

      const data = (await response.json()) as SignInResponse;
      localStorage.setItem("access_token", data.access_token);
      localStorage.setItem("refresh_token", data.refresh_token);
      localStorage.setItem("user_role", role);
      setMessage(mode === "signup" ? "Signup successful" : "Login successful");

      if (role === "admin") {
        router.push("/admin");
      } else if (role === "rider") {
        router.push("/rider");
      } else {
        router.push("/customer");
      }
    } catch (submitError) {
      const submitMessage =
        submitError instanceof Error ? submitError.message : "Login failed";
      setError(submitMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 font-sans text-blue-900">
      <main className="w-full max-w-md rounded-[2.5rem] bg-white p-10 shadow-2xl shadow-blue-100/50 border border-white relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-2 bg-blue-600"></div>
        <h1 className="mb-2 text-4xl font-black text-blue-900 text-center tracking-tight">
          Laundry{mode === "signup" ? "+" : ""}
        </h1>
        <p className="text-slate-400 text-sm font-bold text-center mb-8 uppercase tracking-widest">
          {mode === "signup" ? "Create Account" : "Welcome Back"}
        </p>

        <div className="mb-8 grid grid-cols-2 gap-2 bg-slate-50 p-2 rounded-2xl border border-slate-100">
          <button
            type="button"
            onClick={() => setMode("signin")}
            className={`rounded-xl px-3 py-3 text-xs font-black uppercase tracking-widest transition-all ${mode === "signin"
              ? "bg-white text-blue-600 shadow-lg shadow-slate-200"
              : "text-slate-400 hover:text-slate-600"
              }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => setMode("signup")}
            className={`rounded-xl px-3 py-3 text-xs font-black uppercase tracking-widest transition-all ${mode === "signup"
              ? "bg-white text-blue-600 shadow-lg shadow-slate-200"
              : "text-slate-400 hover:text-slate-600"
              }`}
          >
            Join Now
          </button>
        </div>

        <form className="space-y-4" onSubmit={onSubmit} suppressHydrationWarning>
          <div>
            <label
              htmlFor="email"
              className="mb-1 block text-sm font-medium text-zinc-700"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              suppressHydrationWarning
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-zinc-900 outline-none focus:border-zinc-500"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-1 block text-sm font-medium text-zinc-700"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={8}
              suppressHydrationWarning
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-zinc-900 outline-none focus:border-zinc-500"
            />
          </div>

          <div className="space-y-4">
            <label className="block text-[10px] font-black text-blue-300 uppercase tracking-widest leading-none text-center">Identity Role</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setRole("user")}
                className={`rounded-xl border-2 px-1 py-3 text-[10px] font-black uppercase tracking-widest transition-all ${role === "user"
                  ? "border-blue-600 bg-blue-600 text-white shadow-xl shadow-blue-200"
                  : "border-slate-100 bg-slate-50 text-blue-400 hover:border-slate-200 hover:bg-white"
                  }`}
              >
                User
              </button>
              <button
                type="button"
                onClick={() => setRole("rider")}
                className={`rounded-xl border-2 px-1 py-3 text-[10px] font-black uppercase tracking-widest transition-all ${role === "rider"
                  ? "border-blue-600 bg-blue-600 text-white shadow-xl shadow-blue-200"
                  : "border-slate-100 bg-slate-50 text-blue-400 hover:border-slate-200 hover:bg-white"
                  }`}
              >
                Rider
              </button>
              <button
                type="button"
                onClick={() => setRole("admin")}
                className={`rounded-xl border-2 px-1 py-3 text-[10px] font-black uppercase tracking-widest transition-all ${role === "admin"
                  ? "border-blue-600 bg-blue-600 text-white shadow-xl shadow-blue-200"
                  : "border-slate-100 bg-slate-50 text-blue-400 hover:border-slate-200 hover:bg-white"
                  }`}
              >
                Admin
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-2xl bg-blue-600 px-4 py-4 text-sm font-black text-white shadow-2xl shadow-blue-200 hover:bg-blue-700 active:scale-95 disabled:opacity-50 transition-all flex items-center justify-center gap-3 group mt-4"
          >
            {isLoading ? (
              <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : (
              <span className="group-hover:translate-x-1 transition-transform">🚀</span>
            )}
            <span className="uppercase tracking-widest">
              {isLoading
                ? "Processing..."
                : mode === "signup"
                  ? "Start Journey"
                  : "Secure Login"}
            </span>
          </button>
        </form>

        {message && (
          <p className="mt-4 rounded-md bg-emerald-100 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
            {message}
          </p>
        )}
        {error && (
          <p className="mt-4 rounded-md bg-rose-100 px-3 py-2 text-sm text-rose-700 dark:bg-rose-900/40 dark:text-rose-300">
            {error}
          </p>
        )}
      </main>
    </div>
  );
}
