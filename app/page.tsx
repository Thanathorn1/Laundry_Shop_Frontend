"use client";

import { FormEvent, useMemo, useState } from "react";

type LoginRole = "user" | "rider";
type AuthMode = "signin" | "signup";

type SignInResponse = {
  access_token: string;
  refresh_token: string;
};

export default function Home() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<LoginRole>("user");
  const [mode, setMode] = useState<AuthMode>("signin");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const apiBaseUrl = useMemo(
    () => process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3000",
    [],
  );

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
    } catch (submitError) {
      const submitMessage =
        submitError instanceof Error ? submitError.message : "Login failed";
      setError(submitMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 dark:bg-black">
      <main className="w-full max-w-md rounded-xl bg-white p-6 shadow-sm dark:bg-zinc-900">
        <h1 className="mb-6 text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
          Laundry {mode === "signup" ? "Signup" : "Login"}
        </h1>

        <div className="mb-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setMode("signin")}
            className={`rounded-md border px-3 py-2 text-sm font-medium ${
              mode === "signin"
                ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                : "border-zinc-300 text-zinc-700 dark:border-zinc-700 dark:text-zinc-200"
            }`}
          >
            Login
          </button>
          <button
            type="button"
            onClick={() => setMode("signup")}
            className={`rounded-md border px-3 py-2 text-sm font-medium ${
              mode === "signup"
                ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                : "border-zinc-300 text-zinc-700 dark:border-zinc-700 dark:text-zinc-200"
            }`}
          >
            Signup
          </button>
        </div>

        <form className="space-y-4" onSubmit={onSubmit}>
          <div>
            <label
              htmlFor="email"
              className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-200"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-zinc-900 outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-200"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-zinc-900 outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
            />
          </div>

          <div>
            <span className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-200">
              Login As
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setRole("user")}
                className={`rounded-md border px-3 py-2 text-sm font-medium ${
                  role === "user"
                    ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                    : "border-zinc-300 text-zinc-700 dark:border-zinc-700 dark:text-zinc-200"
                }`}
              >
                Customer
              </button>
              <button
                type="button"
                onClick={() => setRole("rider")}
                className={`rounded-md border px-3 py-2 text-sm font-medium ${
                  role === "rider"
                    ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                    : "border-zinc-300 text-zinc-700 dark:border-zinc-700 dark:text-zinc-200"
                }`}
              >
                Rider
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-md bg-zinc-900 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
          >
            {isLoading
              ? mode === "signup"
                ? "Signing up..."
                : "Signing in..."
              : mode === "signup"
                ? "Sign Up"
                : "Sign In"}
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
