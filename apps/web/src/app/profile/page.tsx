"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "nexaerp-session";

type SessionUser = {
  id: number;
  fullName: string;
  email: string;
  role: string;
};

export default function ProfilePage() {
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

  if (!user) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-16 text-center">
        <h1 className="text-2xl font-bold text-slate-900">You are not logged in</h1>
        <p className="mt-3 text-slate-600">Please sign in to view your profile.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-blue-600">Profile</p>
            <h1 className="mt-3 text-3xl font-bold text-slate-900">{user.fullName}</h1>
          </div>
          <div className="rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-700">{user.role}</div>
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 p-5">
            <p className="text-sm text-slate-500">Email</p>
            <p className="mt-2 text-lg font-semibold text-slate-900">{user.email}</p>
          </div>

          <div className="rounded-2xl border border-slate-200 p-5">
            <p className="text-sm text-slate-500">User ID</p>
            <p className="mt-2 text-lg font-semibold text-slate-900">#{user.id}</p>
          </div>

          <div className="rounded-2xl border border-slate-200 p-5">
            <p className="text-sm text-slate-500">Status</p>
            <p className="mt-2 text-lg font-semibold text-emerald-600">Active</p>
          </div>

          <div className="rounded-2xl border border-slate-200 p-5">
            <p className="text-sm text-slate-500">Role access</p>
            <p className="mt-2 text-lg font-semibold text-slate-900">{user.role}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
