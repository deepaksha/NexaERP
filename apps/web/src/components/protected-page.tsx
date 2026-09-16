"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const STORAGE_KEY = "nexaerp-session";

export function ProtectedPage({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      router.replace("/");
      return;
    }

    try {
      const parsed = JSON.parse(raw);
      if (!parsed?.email || !parsed?.fullName) {
        localStorage.removeItem(STORAGE_KEY);
        router.replace("/");
        return;
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
      router.replace("/");
      return;
    }

    setIsReady(true);
  }, [router]);

  if (!isReady) {
    return null;
  }

  return <>{children}</>;
}
