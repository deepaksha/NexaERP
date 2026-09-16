"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

const STORAGE_KEY = "nexaerp-session";

export default function PublicLoginPage() {
  const router = useRouter();

  const handleLogin = () => {
    const session = {
      id: 101,
      fullName: "Admin User",
      email: "admin@nexaerp.com",
      role: "Admin",
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    router.push("/dashboard");
  };

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-5xl items-center justify-center px-6 py-16">
      <div className="grid w-full overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-lg md:grid-cols-2">
        <div className="hidden bg-slate-900 p-10 text-white md:flex md:flex-col md:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.28em] text-blue-300">NexaERP</p>
            <h1 className="mt-6 text-4xl font-bold leading-tight">Run your business with clarity.</h1>
          </div>

          <div className="space-y-4 text-sm text-slate-300">
            <p>• Inventory management</p>
            <p>• Sales and invoicing</p>
            <p>• Purchase and reporting</p>
          </div>
        </div>

        <div className="p-8 md:p-10">
          <div className="mb-8">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-blue-600">Welcome back</p>
            <h2 className="mt-2 text-3xl font-bold text-slate-900">Login</h2>
          </div>

          <form className="space-y-5">
            <label className="block text-sm font-medium text-slate-700">
              <span className="mb-2 block">Email</span>
              <input
                type="email"
                defaultValue="admin@nexaerp.com"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500"
              />
            </label>

            <label className="block text-sm font-medium text-slate-700">
              <span className="mb-2 block">Password</span>
              <input
                type="password"
                defaultValue="password123"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500"
              />
            </label>

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 text-slate-600">
                <input type="checkbox" className="h-4 w-4 rounded border-slate-300" />
                Remember me
              </label>
              <Link href="/reset-password" className="text-blue-600 hover:text-blue-700">
                Reset password?
              </Link>
            </div>

            <button
              type="button"
              onClick={handleLogin}
              className="block w-full rounded-xl bg-blue-600 px-4 py-3 text-center font-medium text-white shadow-sm transition hover:bg-blue-700"
            >
              Sign in
            </button>

            <p className="text-center text-sm text-slate-500">
              New here?{" "}
              <Link href="/register" className="font-medium text-blue-600 hover:text-blue-700">
                Create an account
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
