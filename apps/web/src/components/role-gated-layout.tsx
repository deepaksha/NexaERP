"use client";

import Link from "next/link";
import { useMemo } from "react";
import { canUserAccessPage } from "@/lib/auth";

const roleMenus = {
  'super-admin': [
    { label: "Dashboard", href: "/dashboard", page: "dashboard" },
    { label: "Products", href: "/products", page: "products" },
    { label: "Sales", href: "/sales", page: "sales" },
    { label: "Purchases", href: "/purchases", page: "purchases" },
    { label: "Billing", href: "/billing", page: "billing" },
    { label: "Users", href: "/users", page: "users" },
    { label: "Settings", href: "/settings", page: "settings" },
  ],
  admin: [
    { label: "Dashboard", href: "/dashboard", page: "dashboard" },
    { label: "Products", href: "/products", page: "products" },
    { label: "Sales", href: "/sales", page: "sales" },
    { label: "Purchases", href: "/purchases", page: "purchases" },
    { label: "Billing", href: "/billing", page: "billing" },
    { label: "Users", href: "/users", page: "users" },
  ],
  'inventory-manager': [
    { label: "Dashboard", href: "/dashboard", page: "dashboard" },
    { label: "Products", href: "/products", page: "products" },
    { label: "Purchases", href: "/purchases", page: "purchases" },
    { label: "Stock", href: "/stock", page: "stock" },
  ],
  'sales-manager': [
    { label: "Dashboard", href: "/dashboard", page: "dashboard" },
    { label: "Sales", href: "/sales", page: "sales" },
    { label: "Customers", href: "/customers", page: "customers" },
    { label: "Invoices", href: "/invoices", page: "invoices" },
  ],
  'accounts-manager': [
    { label: "Dashboard", href: "/dashboard", page: "dashboard" },
    { label: "Billing", href: "/billing", page: "billing" },
    { label: "Invoices", href: "/invoices", page: "invoices" },
    { label: "Reports", href: "/reports", page: "reports" },
  ],
  'purchase-manager': [
    { label: "Dashboard", href: "/dashboard", page: "dashboard" },
    { label: "Purchases", href: "/purchases", page: "purchases" },
    { label: "Suppliers", href: "/suppliers", page: "suppliers" },
    { label: "Inventory", href: "/inventory", page: "inventory" },
  ],
  viewer: [
    { label: "Dashboard", href: "/dashboard", page: "dashboard" },
    { label: "Reports", href: "/reports", page: "reports" },
  ],
} as const;

export function RoleGatedLayout({ role }: { role: string }) {
  const menu = useMemo(() => {
    const items = roleMenus[role as keyof typeof roleMenus] ?? roleMenus.viewer;
    return items.filter((item) => canUserAccessPage(role, item.page));
  }, [role]);

  return (
    <aside className="w-full rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:max-w-72">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-blue-600">NexaERP</p>
          <h2 className="mt-2 text-xl font-bold text-slate-900">{role}</h2>
        </div>
      </div>

      <nav className="space-y-2">
        {menu.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="block rounded-xl px-4 py-3 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
