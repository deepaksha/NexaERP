"use client";

import { ProtectedPage } from "@/components/protected-page";
import { useLocale } from "@/components/locale-provider";
import { useEffect, useState } from "react";

type Company = { id: number; name: string; parentCompany?: { id: number; name: string } | null };
type Vendor = { id: number; name: string; contactPerson?: string; phone?: string; email?: string; gstNumber?: string; companyId?: number; status?: string };
type PriceInsight = { supplierId: number; supplierName: string; productName: string; avgUnitPrice: number; minUnitPrice: number; maxUnitPrice: number; sampleCount: number };

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api";

export default function VendorsPage() {
  const { tx } = useLocale();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [insights, setInsights] = useState<PriceInsight[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState("all");
  const [productSearch, setProductSearch] = useState("");

  const load = async () => {
    const vendorsUrl = selectedCompanyId === "all" ? `${apiBaseUrl}/vendors` : `${apiBaseUrl}/vendors?companyId=${selectedCompanyId}`;
    const [companiesRes, vendorsRes] = await Promise.all([
      fetch(`${apiBaseUrl}/companies`),
      fetch(vendorsUrl),
    ]);
    if (!companiesRes.ok) throw new Error("Failed to load companies");
    if (!vendorsRes.ok) throw new Error("Failed to load vendors");
    setCompanies((await companiesRes.json()) as Company[]);
    setVendors((await vendorsRes.json()) as Vendor[]);
  };

  const loadInsights = async () => {
    const url = new URL(`${apiBaseUrl}/vendors/price-insights`);
    if (selectedCompanyId !== "all") url.searchParams.set("companyId", selectedCompanyId);
    if (productSearch.trim()) url.searchParams.set("product", productSearch.trim());
    const response = await fetch(url.toString());
    if (!response.ok) throw new Error("Failed to load vendor insights");
    setInsights((await response.json()) as PriceInsight[]);
  };

  useEffect(() => {
    load().catch(() => {});
  }, [selectedCompanyId]);

  return (
    <ProtectedPage>
      <div className="mx-auto max-w-7xl space-y-6 px-6 py-8">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-blue-600">{tx("Masters")}</p>
            <h1 className="mt-2 text-3xl font-bold text-slate-900">{tx("Vendors")}</h1>
          </div>
          <select value={selectedCompanyId} onChange={(e) => setSelectedCompanyId(e.target.value)} className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm">
            <option value="all">{tx("All companies")}</option>
            {companies.map((c) => <option key={c.id} value={c.id}>{c.parentCompany ? `${c.parentCompany.name} / ${c.name}` : c.name}</option>)}
          </select>
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900">{tx("Vendors")}</h2>
          <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
            <table className="min-w-full text-left text-sm"><thead className="bg-slate-50 text-slate-700"><tr><th className="px-4 py-3">Vendor</th><th className="px-4 py-3">Contact</th><th className="px-4 py-3">Phone</th><th className="px-4 py-3">GST</th></tr></thead><tbody>{vendors.map((v) => <tr key={v.id} className="border-t border-slate-200"><td className="px-4 py-3">{v.name}</td><td className="px-4 py-3">{v.contactPerson ?? "-"}</td><td className="px-4 py-3">{v.phone ?? "-"}</td><td className="px-4 py-3">{v.gstNumber ?? "-"}</td></tr>)}</tbody></table>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <h2 className="text-xl font-bold text-slate-900">Next Best Vendor Action</h2>
            <div className="flex gap-2">
              <input value={productSearch} onChange={(e) => setProductSearch(e.target.value)} placeholder="Product name" className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm" />
              <button onClick={() => loadInsights().catch(() => {})} className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white">Analyze</button>
            </div>
          </div>
          <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
            <table className="min-w-full text-left text-sm"><thead className="bg-slate-50 text-slate-700"><tr><th className="px-4 py-3">Vendor</th><th className="px-4 py-3">Product</th><th className="px-4 py-3">Avg Price</th><th className="px-4 py-3">Min</th><th className="px-4 py-3">Samples</th></tr></thead><tbody>{insights.map((row) => <tr key={`${row.supplierId}-${row.productName}`} className="border-t border-slate-200"><td className="px-4 py-3">{row.supplierName}</td><td className="px-4 py-3">{row.productName}</td><td className="px-4 py-3">Rs {row.avgUnitPrice.toLocaleString("en-IN")}</td><td className="px-4 py-3">Rs {row.minUnitPrice.toLocaleString("en-IN")}</td><td className="px-4 py-3">{row.sampleCount}</td></tr>)}</tbody></table>
          </div>
        </section>
      </div>
    </ProtectedPage>
  );
}
