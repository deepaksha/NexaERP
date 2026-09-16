"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ProtectedPage } from "@/components/protected-page";
import { RoleGatedLayout } from "@/components/role-gated-layout";
import { canUserAccessPage } from "@/lib/auth";

type ProductApiResponse = {
  id: number;
  name: string;
  sku: string;
  stock: string | number;
  lowStockThreshold?: string | number;
};

type SaleSummary = {
  id: number;
  invoiceNumber: string;
  totalAmount: number | string;
  paidAmount?: number | string;
  balanceAmount?: number | string;
  paymentStatus?: string;
  brokerId?: number;
  broker?: { id: number; name: string } | null;
};

type PurchaseSummary = {
  id: number;
  invoiceNumber: string;
  totalAmount: number | string;
  paymentStatus?: string;
};

type BillingSummary = {
  id: number;
  invoiceNumber: string;
  billType?: string;
  totalAmount: number | string;
  gstAmount?: number | string;
  paidAmount?: number | string;
  balanceAmount?: number | string;
  paymentStatus?: string;
  brokerId?: number;
  broker?: { id: number; name: string } | null;
};

type PurchaseOrderSummary = {
  id: number;
  poNumber: string;
  status?: string;
  approvalRequiredRole?: string;
};

type VendorInsight = {
  supplierName: string;
  productName: string;
  avgUnitPrice: number | string;
  minUnitPrice: number | string;
  maxUnitPrice: number | string;
  sampleCount: number;
};

type SessionUser = {
  id: number;
  fullName: string;
  email: string;
  role: string;
};

const STORAGE_KEY = "nexaerp-session";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api";

function toNumber(value: string | number | null | undefined): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatCurrency(value: number): string {
  return `Rs ${value.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

export default function DashboardPage() {
  const [userRole, setUserRole] = useState("viewer");
  const [userName, setUserName] = useState("Team");
  const [products, setProducts] = useState<ProductApiResponse[]>([]);
  const [sales, setSales] = useState<SaleSummary[]>([]);
  const [purchases, setPurchases] = useState<PurchaseSummary[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrderSummary[]>([]);
  const [billings, setBillings] = useState<BillingSummary[]>([]);
  const [vendorInsights, setVendorInsights] = useState<VendorInsight[]>([]);
  const [isLoadingAlerts, setIsLoadingAlerts] = useState(true);
  const [alertError, setAlertError] = useState<string | null>(null);

  useEffect(() => {
    const sessionRaw = localStorage.getItem(STORAGE_KEY);
    if (!sessionRaw) return;
    try {
      const session = JSON.parse(sessionRaw) as SessionUser;
      const role = (session.role ?? "viewer").toLowerCase().replace(/\s+/g, "-");
      setUserRole(role);
      const displayName = session.fullName?.trim() || "Team";
      setUserName(displayName.split(" ")[0] || "Team");
    } catch {
      setUserRole("viewer");
      setUserName("Team");
    }
  }, []);

  useEffect(() => {
    const loadDashboard = async () => {
      const [productsResponse, salesResponse, purchaseResponse, purchaseOrdersResponse, billingResponse, vendorsResponse] = await Promise.all([
        fetch(`${apiBaseUrl}/products`),
        fetch(`${apiBaseUrl}/sales`),
        fetch(`${apiBaseUrl}/purchases`),
        fetch(`${apiBaseUrl}/purchase-orders`),
        fetch(`${apiBaseUrl}/billing`),
        fetch(`${apiBaseUrl}/vendors/price-insights`),
      ]);

      if (!productsResponse.ok) throw new Error(`Failed to load products (${productsResponse.status})`);
      if (!salesResponse.ok) throw new Error(`Failed to load sales (${salesResponse.status})`);
      if (!purchaseResponse.ok) throw new Error(`Failed to load purchases (${purchaseResponse.status})`);
      if (!purchaseOrdersResponse.ok) throw new Error(`Failed to load purchase orders (${purchaseOrdersResponse.status})`);
      if (!billingResponse.ok) throw new Error(`Failed to load billing (${billingResponse.status})`);
      if (!vendorsResponse.ok) throw new Error(`Failed to load vendor insights (${vendorsResponse.status})`);

      setProducts((await productsResponse.json()) as ProductApiResponse[]);
      setSales((await salesResponse.json()) as SaleSummary[]);
      setPurchases((await purchaseResponse.json()) as PurchaseSummary[]);
      setPurchaseOrders((await purchaseOrdersResponse.json()) as PurchaseOrderSummary[]);
      setBillings((await billingResponse.json()) as BillingSummary[]);
      setVendorInsights((await vendorsResponse.json()) as VendorInsight[]);
    };

    setIsLoadingAlerts(true);
    setAlertError(null);

    loadDashboard()
      .catch((loadError) => {
        setAlertError(loadError instanceof Error ? loadError.message : "Failed to load dashboard data");
      })
      .finally(() => {
        setIsLoadingAlerts(false);
      });
  }, []);

  const lowStockAlerts = useMemo(() => {
    return products
      .map((product) => ({
        id: product.id,
        name: product.name,
        sku: product.sku,
        stock: Number(product.stock),
        threshold: Number(product.lowStockThreshold ?? 15),
      }))
      .filter((product) => product.stock <= product.threshold)
      .sort((left, right) => left.stock - right.stock || left.name.localeCompare(right.name));
  }, [products]);

  const metrics = useMemo(() => {
    const totalSales = sales.reduce((sum, item) => sum + toNumber(item.totalAmount), 0);
    const totalPurchase = purchases.reduce((sum, item) => sum + toNumber(item.totalAmount), 0);

    const salesPending = sales.reduce((sum, item) => sum + toNumber(item.balanceAmount), 0);
    const billingPending = billings.reduce((sum, item) => sum + toNumber(item.balanceAmount), 0);
    const pendingAmount = Number((salesPending + billingPending).toFixed(2));

    const gstIn = billings
      .filter((item) => (item.billType ?? "").toUpperCase() === "PURCHASE")
      .reduce((sum, item) => sum + toNumber(item.gstAmount), 0);
    const gstOut = billings
      .filter((item) => (item.billType ?? "SALE").toUpperCase() === "SALE")
      .reduce((sum, item) => sum + toNumber(item.gstAmount), 0);

    const grossProfit = Number((totalSales - totalPurchase).toFixed(2));

    const paymentRows = [...sales.map((item) => item.paymentStatus ?? "Pending"), ...billings.map((item) => item.paymentStatus ?? "Pending")];
    const paidCount = paymentRows.filter((status) => status.toLowerCase() === "paid").length;
    const paymentScore = paymentRows.length > 0 ? Number(((paidCount / paymentRows.length) * 100).toFixed(1)) : 0;

    return {
      totalSales: Number(totalSales.toFixed(2)),
      totalPurchase: Number(totalPurchase.toFixed(2)),
      pendingAmount,
      gstIn: Number(gstIn.toFixed(2)),
      gstOut: Number(gstOut.toFixed(2)),
      grossProfit,
      paymentScore,
      totalDocuments: paymentRows.length,
    };
  }, [billings, purchases, sales]);

  const brokerSummary = useMemo(() => {
    const aggregate = new Map<string, { name: string; deals: number; value: number }>();

    for (const sale of sales) {
      const brokerName = sale.broker?.name;
      if (!brokerName) continue;
      const existing = aggregate.get(brokerName) ?? { name: brokerName, deals: 0, value: 0 };
      existing.deals += 1;
      existing.value += toNumber(sale.totalAmount);
      aggregate.set(brokerName, existing);
    }

    for (const bill of billings) {
      const brokerName = bill.broker?.name;
      if (!brokerName) continue;
      const existing = aggregate.get(brokerName) ?? { name: brokerName, deals: 0, value: 0 };
      existing.deals += 1;
      existing.value += toNumber(bill.totalAmount);
      aggregate.set(brokerName, existing);
    }

    return Array.from(aggregate.values()).sort((a, b) => b.deals - a.deals || b.value - a.value);
  }, [billings, sales]);

  const bestRates = useMemo(() => {
    return [...vendorInsights]
      .map((row) => ({
        ...row,
        avgUnitPrice: toNumber(row.avgUnitPrice),
        minUnitPrice: toNumber(row.minUnitPrice),
        maxUnitPrice: toNumber(row.maxUnitPrice),
      }))
      .sort((a, b) => a.avgUnitPrice - b.avgUnitPrice)
      .slice(0, 5);
  }, [vendorInsights]);

  const quickActions = useMemo(() => {
    const actions = [
      { label: "New Sale", href: "/sales/new", hint: "Create customer invoice", tone: "from-blue-50 to-cyan-50 border-blue-200", page: "sales" },
      { label: "New Purchase", href: "/purchases/new", hint: "Add supplier purchase", tone: "from-emerald-50 to-teal-50 border-emerald-200", page: "purchases" },
      { label: "New Billing Entry", href: "/billing/new", hint: "Post finance bill", tone: "from-amber-50 to-orange-50 border-amber-200", page: "billing" },
      { label: "New Purchase Order", href: "/purchase-orders/new", hint: "Raise PO", tone: "from-violet-50 to-fuchsia-50 border-violet-200", page: "purchase-orders" },
      { label: "Product Rates", href: "/product-rates", hint: "Update daily rates", tone: "from-sky-50 to-indigo-50 border-sky-200", page: "product-rates" },
      { label: "Stock Products", href: "/products", hint: "Review current stock", tone: "from-rose-50 to-pink-50 border-rose-200", page: "products" },
    ];

    return actions.filter((action) => canUserAccessPage(userRole, action.page));
  }, [userRole]);

  const pendingApprovalCount = useMemo(() => {
    return purchaseOrders.filter((po) => (po.status ?? "").toLowerCase() === "pendingapproval").length;
  }, [purchaseOrders]);

  const canOpenApprovalQueue = canUserAccessPage(userRole, "purchase-orders");

  return (
    <ProtectedPage>
      <div className="flex min-h-[calc(100vh-10rem)] flex-col gap-6 p-6 lg:flex-row">
        <RoleGatedLayout role={userRole} />

        <main className="flex-1 space-y-6">
          <section className="relative overflow-hidden rounded-3xl border border-cyan-200 bg-gradient-to-br from-cyan-50 via-white to-emerald-50 p-6 shadow-sm">
            <div className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full bg-cyan-200/40 blur-2xl" />
            <div className="pointer-events-none absolute -bottom-12 left-1/3 h-40 w-40 rounded-full bg-emerald-200/40 blur-2xl" />
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-700">Financial command center</p>
                <h1 className="mt-2 text-3xl font-bold text-slate-900">Business Summary</h1>
                <p className="mt-1 text-sm font-medium text-slate-700">Welcome back, {userName}.</p>
                <p className="mt-1 text-sm text-slate-600">Live signal for profit, taxes, vendor rates, broker activity, and receivables.</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="rounded-xl border border-cyan-200 bg-white/80 px-4 py-2 text-sm font-medium text-cyan-800">
                  Collection health: {metrics.paymentScore}% paid
                </div>
                <Link
                  href="/reports"
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:-translate-y-0.5 hover:bg-slate-50"
                >
                  Open reports
                </Link>
              </div>
            </div>
          </section>

          <section className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900">Quick Actions</h3>
                <span className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">Do work faster</span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {quickActions.map((action) => (
                  <Link
                    key={action.label}
                    href={action.href}
                    className={`rounded-xl border bg-gradient-to-br p-4 transition hover:-translate-y-0.5 hover:shadow-sm ${action.tone}`}
                  >
                    <p className="text-sm font-semibold text-slate-900">{action.label}</p>
                    <p className="mt-1 text-xs text-slate-600">{action.hint}</p>
                  </Link>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900">Today Priorities</h3>
                <span className="text-xs text-slate-500">Auto snapshot</span>
              </div>
              <div className="space-y-3 text-sm text-slate-700">
                <div className="rounded-xl bg-amber-50 px-3 py-2 text-amber-800">
                  Pending collections: <strong>{formatCurrency(metrics.pendingAmount)}</strong>
                </div>
                <div className="rounded-xl bg-rose-50 px-3 py-2 text-rose-800">
                  Low stock alerts: <strong>{lowStockAlerts.length}</strong>
                </div>
                <div className="rounded-xl bg-emerald-50 px-3 py-2 text-emerald-800">
                  Broker leaders tracked: <strong>{brokerSummary.length}</strong>
                </div>
                <div className="rounded-xl bg-blue-50 px-3 py-2 text-blue-800">
                  Payment closure: <strong>{metrics.paymentScore}%</strong>
                </div>
                {canOpenApprovalQueue ? (
                  <div className="rounded-xl border border-violet-200 bg-violet-50 px-3 py-3 text-violet-800">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em]">Approval Queue</p>
                    <p className="mt-1 text-sm">Pending PO approvals: <strong>{pendingApprovalCount}</strong></p>
                    <Link href="/purchase-orders?status=PendingApproval" className="mt-2 inline-block rounded-lg border border-violet-300 bg-white px-3 py-1.5 text-xs font-semibold text-violet-700 hover:bg-violet-100">
                      Review Queue
                    </Link>
                  </div>
                ) : null}
              </div>
            </div>
          </section>

          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { label: "Gross Profit", value: formatCurrency(metrics.grossProfit), hint: metrics.grossProfit >= 0 ? "Profit" : "Loss", tone: metrics.grossProfit >= 0 ? "emerald" : "rose" },
              { label: "Pending Amount", value: formatCurrency(metrics.pendingAmount), hint: "Sales + Billing due", tone: "amber" },
              { label: "Output GST", value: formatCurrency(metrics.gstOut), hint: "Tax on sales", tone: "blue" },
              { label: "Input GST", value: formatCurrency(metrics.gstIn), hint: "Tax on purchase", tone: "teal" },
            ].map((stat) => (
              <div key={stat.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-sm font-medium text-slate-500">{stat.label}</p>
                <div className="mt-4 flex items-end justify-between">
                  <strong className="text-2xl font-bold text-slate-900">{stat.value}</strong>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                      stat.tone === "emerald"
                        ? "bg-emerald-100 text-emerald-700"
                        : stat.tone === "rose"
                          ? "bg-rose-100 text-rose-700"
                          : stat.tone === "amber"
                            ? "bg-amber-100 text-amber-700"
                            : stat.tone === "blue"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-teal-100 text-teal-700"
                    }`}
                  >
                    {stat.hint}
                  </span>
                </div>
              </div>
            ))}
          </section>

          <section className="grid gap-6 xl:grid-cols-[1.7fr_1fr]">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-xl font-bold text-slate-900">Best Vendor Rates</h3>
                <span className="text-sm text-slate-500">Top 5 by avg rate</span>
              </div>

              <div className="space-y-4">
                {bestRates.length === 0 ? (
                  <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">Vendor rate insights are not available yet.</div>
                ) : (
                  bestRates.map((row) => (
                    <div key={`${row.supplierName}-${row.productName}`} className="rounded-xl border border-slate-200 p-4">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="font-semibold text-slate-900">{row.productName}</p>
                          <p className="text-sm text-slate-600">{row.supplierName}</p>
                        </div>
                        <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                          {formatCurrency(row.avgUnitPrice)} avg
                        </span>
                      </div>
                      <p className="mt-2 text-xs text-slate-500">
                        Best: {formatCurrency(row.minUnitPrice)} | Max: {formatCurrency(row.maxUnitPrice)} | Samples: {row.sampleCount}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-xl font-bold text-slate-900">Alerts</h3>

              {alertError ? (
                <div className="mt-5 rounded-xl bg-red-50 p-3 text-sm text-red-700">{alertError}</div>
              ) : null}

              <div className="mt-5 space-y-3 text-sm text-slate-600">
                {isLoadingAlerts ? (
                  <div className="rounded-xl bg-slate-50 p-3 text-slate-500">Loading stock alerts...</div>
                ) : lowStockAlerts.length > 0 ? (
                  lowStockAlerts.map((product) => (
                    <div key={product.id} className="rounded-xl bg-amber-50 p-3 text-amber-700">
                      {product.name} ({product.sku}) is low on stock: {product.stock} remaining, threshold {product.threshold}
                    </div>
                  ))
                ) : (
                  <div className="rounded-xl bg-emerald-50 p-3 text-emerald-700">
                    No products are at or below their low stock threshold.
                  </div>
                )}
                <div className="rounded-xl bg-amber-50 p-3 text-amber-700">Pending collections: {formatCurrency(metrics.pendingAmount)}</div>
                <div className="rounded-xl bg-blue-50 p-3 text-blue-700">Documents paid: {metrics.paymentScore}% of {metrics.totalDocuments}</div>
              </div>
            </div>
          </section>

          <section className="grid gap-6 xl:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-xl font-bold text-slate-900">Broker Deal Leaders</h3>
                <span className="text-sm text-slate-500">Sales + Billing</span>
              </div>

              <div className="space-y-3">
                {brokerSummary.length === 0 ? (
                  <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">No broker-linked deals found in current data.</div>
                ) : (
                  brokerSummary.slice(0, 5).map((broker, index) => (
                    <div key={broker.name} className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3">
                      <div>
                        <p className="font-semibold text-slate-900">#{index + 1} {broker.name}</p>
                        <p className="text-xs text-slate-500">Deals: {broker.deals}</p>
                      </div>
                      <p className="text-sm font-semibold text-slate-800">{formatCurrency(broker.value)}</p>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-xl font-bold text-slate-900">Payment Status Mix</h3>
                <span className="text-sm text-slate-500">Operational pulse</span>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  {
                    label: "Paid",
                    count: [...sales, ...billings].filter((row) => (row.paymentStatus ?? "").toLowerCase() === "paid").length,
                    tone: "emerald",
                  },
                  {
                    label: "Partial",
                    count: [...sales, ...billings].filter((row) => (row.paymentStatus ?? "").toLowerCase() === "partial").length,
                    tone: "amber",
                  },
                  {
                    label: "Pending",
                    count: [...sales, ...billings].filter((row) => (row.paymentStatus ?? "pending").toLowerCase() === "pending").length,
                    tone: "rose",
                  },
                ].map((block) => (
                  <div
                    key={block.label}
                    className={`rounded-xl border px-4 py-4 text-center ${
                      block.tone === "emerald"
                        ? "border-emerald-200 bg-emerald-50"
                        : block.tone === "amber"
                          ? "border-amber-200 bg-amber-50"
                          : "border-rose-200 bg-rose-50"
                    }`}
                  >
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{block.label}</p>
                    <p className="mt-2 text-3xl font-bold text-slate-900">{block.count}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </main>
      </div>
    </ProtectedPage>
  );
}
