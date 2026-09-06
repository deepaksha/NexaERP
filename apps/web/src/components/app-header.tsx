"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type SessionUser = {
  id: number;
  fullName: string;
  email: string;
  role: string;
};

const STORAGE_KEY = "nexaerp-session";

export function AppHeader() {
  const [user, setUser] = useState<SessionUser | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    try {
      setUser(JSON.parse(raw));
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem(STORAGE_KEY);
    setUser(null);
    window.location.href = "/";
  };

  return (
    <header className="border-b border-slate-200 bg-white/90 backdrop-blur-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link href={user ? "/dashboard" : "/"} className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-sm font-bold text-white">
            N
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">ERP</p>
            <p className="text-lg font-bold text-slate-900">NexaERP</p>
          </div>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {!user ? (
            <>
              <Link href="/" className="text-sm font-medium text-slate-600 transition hover:text-slate-900">
                Login
              </Link>
              <Link href="/register" className="text-sm font-medium text-slate-600 transition hover:text-slate-900">
                Register
              </Link>
              <Link href="/reset-password" className="text-sm font-medium text-slate-600 transition hover:text-slate-900">
                Reset Password
              </Link>
            </>
          ) : (
            <>
              <Link href="/dashboard" className="text-sm font-medium text-slate-600 transition hover:text-slate-900">
                Dashboard
              </Link>
              <Link href="/products" className="text-sm font-medium text-slate-600 transition hover:text-slate-900">
                Products
              </Link>
              <Link href="/profile" className="text-sm font-medium text-slate-600 transition hover:text-slate-900">
                Profile
              </Link>
            </>
          )}
        </nav>

        {user ? (
          <div className="flex items-center gap-3">
            <Link href="/profile" className="text-sm font-medium text-slate-700 hover:text-slate-900">
              {user.fullName}
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800"
            >
              Logout
            </button>
          </div>
        ) : (
          <Link href="/" className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700">
            Sign in
          </Link>
        )}
      </div>
    </header>
  );
}
