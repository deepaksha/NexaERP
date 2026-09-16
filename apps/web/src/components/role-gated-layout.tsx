"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo } from "react";
import { canUserAccessPage } from "@/lib/auth";

type MenuItem = { label: string; href: string; page: string };
type MenuGroup = { label: string; items: MenuItem[] };

const roleMenus: Record<string, MenuGroup[]> = {
  "super-admin": [
    { label: "Core", items: [{ label: "Dashboard", href: "/dashboard", page: "dashboard" }] },
    {
      label: "Masters",
      items: [
        { label: "Products", href: "/products", page: "products" },
        { label: "Product Rates", href: "/product-rates", page: "product-rates" },
        { label: "Users", href: "/users", page: "users" },
      ],
    },
    {
      label: "Transactions",
      items: [
        { label: "Sales", href: "/sales", page: "sales" },
        { label: "Purchases", href: "/purchases", page: "purchases" },
        { label: "Purchase Orders", href: "/purchase-orders", page: "purchase-orders" },
        { label: "Billing", href: "/billing", page: "billing" },
      ],
    },
    {
      label: "Insights",
      items: [
        { label: "Reports", href: "/reports", page: "reports" },
        { label: "Settings", href: "/settings", page: "settings" },
      ],
    },
  ],
  admin: [
    { label: "Core", items: [{ label: "Dashboard", href: "/dashboard", page: "dashboard" }] },
    {
      label: "Masters",
      items: [
        { label: "Products", href: "/products", page: "products" },
        { label: "Product Rates", href: "/product-rates", page: "product-rates" },
        { label: "Users", href: "/users", page: "users" },
      ],
    },
    {
      label: "Transactions",
      items: [
        { label: "Sales", href: "/sales", page: "sales" },
        { label: "Purchases", href: "/purchases", page: "purchases" },
        { label: "Purchase Orders", href: "/purchase-orders", page: "purchase-orders" },
        { label: "Billing", href: "/billing", page: "billing" },
      ],
    },
    { label: "Insights", items: [{ label: "Reports", href: "/reports", page: "reports" }] },
  ],
  "inventory-manager": [
    { label: "Core", items: [{ label: "Dashboard", href: "/dashboard", page: "dashboard" }] },
    {
      label: "Inventory",
      items: [
        { label: "Products", href: "/products", page: "products" },
        { label: "Product Rates", href: "/product-rates", page: "product-rates" },
        { label: "Purchases", href: "/purchases", page: "purchases" },
        { label: "Purchase Orders", href: "/purchase-orders", page: "purchase-orders" },
        { label: "Stock", href: "/stock", page: "stock" },
      ],
    },
  ],
  "sales-manager": [
    { label: "Core", items: [{ label: "Dashboard", href: "/dashboard", page: "dashboard" }] },
    {
      label: "Sales",
      items: [
        { label: "Sales", href: "/sales", page: "sales" },
        { label: "Product Rates", href: "/product-rates", page: "product-rates" },
        { label: "Customers", href: "/customers", page: "customers" },
        { label: "Invoices", href: "/invoices", page: "invoices" },
      ],
    },
  ],
  "accounts-manager": [
    { label: "Core", items: [{ label: "Dashboard", href: "/dashboard", page: "dashboard" }] },
    {
      label: "Finance",
      items: [
        { label: "Billing", href: "/billing", page: "billing" },
        { label: "Product Rates", href: "/product-rates", page: "product-rates" },
        { label: "Invoices", href: "/invoices", page: "invoices" },
        { label: "Reports", href: "/reports", page: "reports" },
      ],
    },
  ],
  "purchase-manager": [
    { label: "Core", items: [{ label: "Dashboard", href: "/dashboard", page: "dashboard" }] },
    {
      label: "Procurement",
      items: [
        { label: "Purchases", href: "/purchases", page: "purchases" },
        { label: "Purchase Orders", href: "/purchase-orders", page: "purchase-orders" },
        { label: "Product Rates", href: "/product-rates", page: "product-rates" },
        { label: "Suppliers", href: "/suppliers", page: "suppliers" },
        { label: "Inventory", href: "/inventory", page: "inventory" },
      ],
    },
  ],
  manager: [
    { label: "Core", items: [{ label: "Dashboard", href: "/dashboard", page: "dashboard" }] },
    {
      label: "Operations",
      items: [
        { label: "Purchases", href: "/purchases", page: "purchases" },
        { label: "Purchase Orders", href: "/purchase-orders", page: "purchase-orders" },
        { label: "Billing", href: "/billing", page: "billing" },
      ],
    },
    { label: "Insights", items: [{ label: "Reports", href: "/reports", page: "reports" }] },
  ],
  supervisor: [
    { label: "Core", items: [{ label: "Dashboard", href: "/dashboard", page: "dashboard" }] },
    {
      label: "Approvals",
      items: [
        { label: "Purchase Orders", href: "/purchase-orders", page: "purchase-orders" },
        { label: "Billing", href: "/billing", page: "billing" },
      ],
    },
    { label: "Insights", items: [{ label: "Reports", href: "/reports", page: "reports" }] },
  ],
  viewer: [
    { label: "Core", items: [{ label: "Dashboard", href: "/dashboard", page: "dashboard" }] },
    { label: "Insights", items: [{ label: "Reports", href: "/reports", page: "reports" }] },
  ],
};

export function RoleGatedLayout({ role }: { role: string }) {
  const pathname = usePathname();
  const menuGroups = useMemo(() => {
    const groups = roleMenus[role] ?? roleMenus.viewer;
    return groups
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => canUserAccessPage(role, item.page)),
      }))
      .filter((group) => group.items.length > 0);
  }, [role]);

  return (
    <aside className="w-full rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:max-w-72">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-blue-600">NexaERP</p>
          <h2 className="mt-2 text-xl font-bold text-slate-900">{role}</h2>
        </div>
      </div>

      <nav className="space-y-4">
        {menuGroups.map((group) => (
          <div key={group.label} className="space-y-1.5">
            <p className="px-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{group.label}</p>
            {group.items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`block rounded-xl px-4 py-3 text-sm font-medium transition ${pathname === item.href ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"}`}
              >
                {item.label}
              </Link>
            ))}
          </div>
        ))}
      </nav>
    </aside>
  );
}
