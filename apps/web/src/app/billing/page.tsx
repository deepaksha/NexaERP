"use client";

import Link from "next/link";
import { ProtectedPage } from "@/components/protected-page";
import { useLocale } from "@/components/locale-provider";
import { useEffect, useState } from "react";

type Company = {
  id: number;
  name: string;
  parentCompany?: { id: number; name: string } | null;
};

type Billing = {
  id: number;
  invoiceNumber: string;
  invoiceDate: string;
  billType?: "SALE" | "PURCHASE";
  totalAmount: number;
  status?: string;
  paymentStatus?: string;
  company?: Company | null;
  companyId?: number;
  customer?: { name: string } | null;
  supplier?: { name: string } | null;
};

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api";

export default function BillingPage() {
  const { tx } = useLocale();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [invoices, setInvoices] = useState<Billing[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("all");
  const [billTypeFilter, setBillTypeFilter] = useState<"all" | "SALE" | "PURCHASE">("all");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("invoiceDate");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      const companyUrl = new URL(`${apiBaseUrl}/companies`);
      const billingUrl = new URL(`${apiBaseUrl}/billing`);

      if (selectedCompanyId !== "all") billingUrl.searchParams.set("companyId", selectedCompanyId);
      if (billTypeFilter !== "all") billingUrl.searchParams.set("billType", billTypeFilter);
      if (search.trim()) billingUrl.searchParams.set("search", search.trim());
      billingUrl.searchParams.set("sortBy", sortBy);
      billingUrl.searchParams.set("sortOrder", sortOrder);

      const [companyRes, billingRes] = await Promise.all([
        fetch(companyUrl.toString()),
        fetch(billingUrl.toString()),
      ]);

      if (!companyRes.ok) throw new Error(`Failed to load companies (${companyRes.status})`);
      if (!billingRes.ok) throw new Error(`Failed to load invoices (${billingRes.status})`);

      setCompanies((await companyRes.json()) as Company[]);
      setInvoices((await billingRes.json()) as Billing[]);
    };

    setIsLoading(true);
    setError(null);
    loadData()
      .catch((loadError) => setError(loadError instanceof Error ? loadError.message : "Unable to load billing data"))
      .finally(() => setIsLoading(false));
  }, [selectedCompanyId, billTypeFilter, search, sortBy, sortOrder]);

  return (
    <ProtectedPage>
      <div className="mx-auto max-w-7xl space-y-6 px-6 py-8">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-blue-600">{tx("Finance")}</p>
            <h1 className="mt-2 text-3xl font-bold text-slate-900">{tx("Billing Register")}</h1>
          </div>
          <div className="flex gap-2">
            <Link href="/purchase-orders" className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50">
              {tx("Purchase Orders")}
            </Link>
            <Link href="/billing/new" className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700">
              {tx("New Billing")}
            </Link>
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          <select value={selectedCompanyId} onChange={(event) => setSelectedCompanyId(event.target.value)} className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none transition focus:border-blue-500">
            <option value="all">{tx("All companies")}</option>
            {companies.map((company) => (
              <option key={company.id} value={company.id}>
                {company.parentCompany ? `${company.parentCompany.name} / ${company.name}` : company.name}
              </option>
            ))}
          </select>

          <select value={billTypeFilter} onChange={(event) => setBillTypeFilter(event.target.value as "all" | "SALE" | "PURCHASE")} className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none transition focus:border-blue-500">
            <option value="all">{tx("All bill types")}</option>
            <option value="SALE">{tx("Sales Invoice")}</option>
            <option value="PURCHASE">{tx("Purchase Bill")}</option>
          </select>

          <select value={sortBy} onChange={(event) => setSortBy(event.target.value)} className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none transition focus:border-blue-500">
            <option value="invoiceDate">{tx("Sort by date")}</option>
            <option value="invoiceNumber">{tx("Sort by number")}</option>
            <option value="totalAmount">{tx("Sort by amount")}</option>
          </select>

          <select value={sortOrder} onChange={(event) => setSortOrder(event.target.value as "asc" | "desc")} className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none transition focus:border-blue-500">
            <option value="desc">{tx("Newest first")}</option>
            <option value="asc">{tx("Oldest first")}</option>
          </select>

          <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={tx("Search invoice/customer/supplier")} className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none transition focus:border-blue-500" />
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900">{tx("Invoices")}</h2>
          {error ? <div className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}

          <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-700">
                <tr>
                  <th className="px-4 py-3 font-semibold">{tx("Invoice")}</th>
                  <th className="px-4 py-3 font-semibold">{tx("Type")}</th>
                  <th className="px-4 py-3 font-semibold">{tx("Party")}</th>
                  <th className="px-4 py-3 font-semibold">{tx("Date")}</th>
                  <th className="px-4 py-3 font-semibold">{tx("Amount")}</th>
                  <th className="px-4 py-3 font-semibold">{tx("Status")}</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td className="px-4 py-6 text-slate-500" colSpan={6}>{tx("Loading invoices...")}</td>
                  </tr>
                ) : invoices.length === 0 ? (
                  <tr>
                    <td className="px-4 py-6 text-slate-500" colSpan={6}>{tx("No invoices found.")}</td>
                  </tr>
                ) : (
                  invoices.map((invoice) => (
                    <tr key={invoice.id} className="border-t border-slate-200">
                      <td className="px-4 py-3 font-medium text-blue-700">
                        <Link href={`/billing/${invoice.id}`} className="hover:underline">{invoice.invoiceNumber}</Link>
                      </td>
                      <td className="px-4 py-3 text-slate-700">{invoice.billType === "PURCHASE" ? "Purchase" : "Sales"}</td>
                      <td className="px-4 py-3 text-slate-700">{invoice.billType === "PURCHASE" ? invoice.supplier?.name ?? "-" : invoice.customer?.name ?? "-"}</td>
                      <td className="px-4 py-3 text-slate-700">{new Date(invoice.invoiceDate).toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-slate-800">Rs {Number(invoice.totalAmount || 0).toLocaleString("en-IN")}</td>
                      <td className="px-4 py-3 text-slate-700">{invoice.paymentStatus ?? invoice.status ?? "-"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </ProtectedPage>
  );
}
