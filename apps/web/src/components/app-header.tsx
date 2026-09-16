"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

type SessionUser = {
  id: number;
  fullName: string;
  email: string;
  role: string;
};

const STORAGE_KEY = "nexaerp-session";

type NavItem = {
  label: string;
  href: string;
};

type NavGroup = {
  label: string;
  items: NavItem[];
};

const authLinks: NavItem[] = [
  { label: "Login", href: "/" },
  { label: "Register", href: "/register" },
  { label: "Reset Password", href: "/reset-password" },
];

const groupedLinks: NavGroup[] = [
  {
    label: "Masters",
    items: [
      { label: "Companies", href: "/companies" },
      { label: "Products", href: "/products" },
      { label: "Product Rates", href: "/product-rates" },
      { label: "Vendors", href: "/vendors" },
      { label: "Brokers", href: "/brokers" },
    ],
  },
  {
    label: "Transactions",
    items: [
      { label: "Sales", href: "/sales" },
      { label: "Billing", href: "/billing" },
      { label: "Purchases", href: "/purchases" },
      { label: "Purchase Orders", href: "/purchase-orders" },
    ],
  },
  {
    label: "Insights",
    items: [
      { label: "Reports", href: "/reports" },
      { label: "Profile", href: "/profile" },
    ],
  },
];

export function AppHeader() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeDesktopGroup, setActiveDesktopGroup] = useState<string | null>(null);
  const [activeMobileGroup, setActiveMobileGroup] = useState<string | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    try {
      setUser(JSON.parse(raw));
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    setActiveDesktopGroup(null);
    setActiveMobileGroup(null);
  }, [pathname]);

  const handleLogout = () => {
    localStorage.removeItem(STORAGE_KEY);
    setUser(null);
    window.location.href = "/";
  };

  const linkClass = (href: string) =>
    `text-sm font-medium transition ${pathname === href ? "text-slate-900" : "text-slate-600 hover:text-slate-900"}`;

  return (
    <header className="relative z-50 border-b border-slate-200 bg-white/90 backdrop-blur-sm">
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

        <nav className="hidden items-center gap-4 md:flex">
          {!user ? (
            <>
              {authLinks.map((item) => (
                <Link key={item.href} href={item.href} className={linkClass(item.href)}>
                  {item.label}
                </Link>
              ))}
            </>
          ) : (
            <>
              <Link href="/dashboard" className={linkClass("/dashboard")}>
                Dashboard
              </Link>
              {groupedLinks.map((group) => {
                const isOpen = activeDesktopGroup === group.label;
                return (
                  <div key={group.label} className="relative">
                    <button
                      type="button"
                      onClick={() => setActiveDesktopGroup((current) => (current === group.label ? null : group.label))}
                      className={`rounded-lg px-2 py-1 text-sm font-medium transition ${isOpen ? "bg-slate-100 text-slate-900" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"}`}
                      aria-expanded={isOpen}
                      aria-controls={`desktop-menu-${group.label}`}
                    >
                      {group.label}
                    </button>
                    {isOpen ? (
                      <div id={`desktop-menu-${group.label}`} className="absolute right-0 top-9 z-[70] min-w-52 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
                        <div className="border-b border-slate-100 bg-slate-50 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                          {group.label}
                        </div>
                        <div className="p-2">
                          {group.items.map((item) => (
                            <Link
                              key={item.href}
                              href={item.href}
                              onClick={() => setActiveDesktopGroup(null)}
                              className={`block rounded-lg px-3 py-2 text-sm ${pathname === item.href ? "bg-slate-100 text-slate-900" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"}`}
                            >
                              {item.label}
                            </Link>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                );
              })}
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
            <button
              type="button"
              onClick={() => {
                setMobileOpen((current) => !current);
                setActiveMobileGroup(null);
              }}
              className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 md:hidden"
            >
              Menu
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Link href="/" className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700">
              Sign in
            </Link>
            <button
              type="button"
              onClick={() => {
                setMobileOpen((current) => !current);
                setActiveMobileGroup(null);
              }}
              className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 md:hidden"
            >
              Menu
            </button>
          </div>
        )}
      </div>

      <div className={`${mobileOpen ? "block" : "hidden"} border-t border-slate-200 bg-white px-6 py-4 md:hidden`}>
        {!user ? (
          <div className="space-y-2">
            {authLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`block rounded-lg px-3 py-2 text-sm ${pathname === item.href ? "bg-slate-100 text-slate-900" : "text-slate-600"}`}
              >
                {item.label}
              </Link>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            <Link
              href="/dashboard"
              onClick={() => {
                setMobileOpen(false);
                setActiveMobileGroup(null);
              }}
              className={`block rounded-lg px-3 py-2 text-sm font-medium ${pathname === "/dashboard" ? "bg-slate-100 text-slate-900" : "text-slate-700"}`}
            >
              Dashboard
            </Link>
            {groupedLinks.map((group) => {
              const isOpen = activeMobileGroup === group.label;
              return (
                <div key={group.label} className="rounded-lg border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setActiveMobileGroup((current) => (current === group.label ? null : group.label))}
                    className="w-full px-3 py-2 text-left text-sm font-semibold text-slate-700"
                    aria-expanded={isOpen}
                    aria-controls={`mobile-menu-${group.label}`}
                  >
                    {group.label}
                  </button>
                  {isOpen ? (
                    <div id={`mobile-menu-${group.label}`} className="border-t border-slate-200 p-2">
                      {group.items.map((item) => (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => {
                            setMobileOpen(false);
                            setActiveMobileGroup(null);
                          }}
                          className={`block rounded-md px-3 py-2 text-sm ${pathname === item.href ? "bg-slate-100 text-slate-900" : "text-slate-600"}`}
                        >
                          {item.label}
                        </Link>
                      ))}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </header>
  );
}
