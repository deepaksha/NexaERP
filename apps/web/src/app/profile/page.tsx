"use client";

import { useEffect, useState } from "react";
import { useLocale } from "@/components/locale-provider";

const STORAGE_KEY = "nexaerp-session";

type SessionUser = {
  id: number;
  fullName: string;
  email: string;
  role: string;
};

export default function ProfilePage() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const { t } = useLocale();

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
        <h1 className="text-2xl font-bold text-slate-900">{t.profileNotLoggedIn}</h1>
        <p className="mt-3 text-slate-600">{t.profileSignInPrompt}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-blue-600">{t.profileTitle}</p>
            <h1 className="mt-3 text-3xl font-bold text-slate-900">{user.fullName}</h1>
          </div>
          <div className="rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-700">{user.role}</div>
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 p-5">
            <p className="text-sm text-slate-500">{t.profileEmail}</p>
            <p className="mt-2 text-lg font-semibold text-slate-900">{user.email}</p>
          </div>

          <div className="rounded-2xl border border-slate-200 p-5">
            <p className="text-sm text-slate-500">{t.profileUserId}</p>
            <p className="mt-2 text-lg font-semibold text-slate-900">#{user.id}</p>
          </div>

          <div className="rounded-2xl border border-slate-200 p-5">
            <p className="text-sm text-slate-500">{t.profileStatus}</p>
            <p className="mt-2 text-lg font-semibold text-emerald-600">{t.statusActive}</p>
          </div>

          <div className="rounded-2xl border border-slate-200 p-5">
            <p className="text-sm text-slate-500">{t.profileRoleAccess}</p>
            <p className="mt-2 text-lg font-semibold text-slate-900">{user.role}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
