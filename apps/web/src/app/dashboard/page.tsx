import { ProtectedPage } from "@/components/protected-page";
import { RoleGatedLayout } from "@/components/role-gated-layout";

const quickStats = [
  { label: "Revenue", value: "$48.2K", change: "+12.4%", tone: "emerald" },
  { label: "Orders", value: "1,248", change: "+8.1%", tone: "blue" },
  { label: "Inventory", value: "94.2%", change: "+2.3%", tone: "amber" },
  { label: "Customers", value: "842", change: "+5.7%", tone: "purple" },
];

const menuItems = [
  { label: "Overview", href: "/dashboard", active: true },
  { label: "Products", href: "/products" },
  { label: "Orders", href: "/dashboard" },
  { label: "Customers", href: "/dashboard" },
  { label: "Reports", href: "/dashboard" },
  { label: "Settings", href: "/dashboard" },
];

export default function DashboardPage() {
  return (
    <ProtectedPage>
      <div className="flex min-h-[calc(100vh-10rem)] flex-col gap-6 p-6 lg:flex-row">
        <RoleGatedLayout role="admin" />

        <main className="flex-1 space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-500">
                  Overview
                </p>
                <h1 className="mt-2 text-3xl font-bold text-slate-900">Business Summary</h1>
              </div>
              <button className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800">
                Download report
              </button>
            </div>
          </section>

          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {quickStats.map((stat) => (
              <div key={stat.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-sm text-slate-500">{stat.label}</p>
                <div className="mt-4 flex items-end justify-between">
                  <strong className="text-3xl font-bold text-slate-900">{stat.value}</strong>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                      stat.tone === "emerald"
                        ? "bg-emerald-100 text-emerald-700"
                        : stat.tone === "blue"
                          ? "bg-blue-100 text-blue-700"
                          : stat.tone === "amber"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-violet-100 text-violet-700"
                    }`}
                  >
                    {stat.change}
                  </span>
                </div>
              </div>
            ))}
          </section>

          <section className="grid gap-6 xl:grid-cols-[1.7fr_1fr]">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-xl font-bold text-slate-900">Recent activity</h3>
                <span className="text-sm text-slate-500">Last 7 days</span>
              </div>

              <div className="space-y-4">
                {[
                  ["Invoice #INV-1042", "Paid by Ace Retail", "2 hours ago"],
                  ["Stock updated", "Laptop Pro 14 +24 units", "5 hours ago"],
                  ["Supplier payment", "Vendor schedule processed", "Today"],
                ].map(([title, text, time]) => (
                  <div key={title} className="flex items-center justify-between rounded-xl border border-slate-200 p-4">
                    <div>
                      <p className="font-medium text-slate-800">{title}</p>
                      <p className="text-sm text-slate-500">{text}</p>
                    </div>
                    <span className="text-xs text-slate-400">{time}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-xl font-bold text-slate-900">Alerts</h3>
              <div className="mt-5 space-y-3 text-sm text-slate-600">
                <div className="rounded-xl bg-amber-50 p-3 text-amber-700">Low stock on 3 products</div>
                <div className="rounded-xl bg-emerald-50 p-3 text-emerald-700">Payment collection is on track</div>
                <div className="rounded-xl bg-blue-50 p-3 text-blue-700">5 pending customer follow-ups</div>
              </div>
            </div>
          </section>
        </main>
      </div>
    </ProtectedPage>
  );
}
