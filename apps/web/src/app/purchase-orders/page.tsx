"use client";

import Link from "next/link";
import { ProtectedPage } from "@/components/protected-page";
import { useEffect, useState } from "react";

type Company = {
  id: number;
  name: string;
  parentCompany?: { id: number; name: string } | null;
};

type Supplier = {
  id: number;
  name: string;
};

type PurchaseOrder = {
  id: number;
  poNumber: string;
  poDate: string;
  totalAmount: number | string;
  status: string;
  approvalRequiredRole?: string;
  approvedByRole?: string;
  supplier?: Supplier | null;
};

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api";

function toNumber(value: number | string | null | undefined): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export default function PurchaseOrdersPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("poDate");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      const companyUrl = new URL(`${apiBaseUrl}/companies`);
      const poUrl = new URL(`${apiBaseUrl}/purchase-orders`);

      if (selectedCompanyId !== "all") poUrl.searchParams.set("companyId", selectedCompanyId);
      if (statusFilter !== "all") poUrl.searchParams.set("status", statusFilter);
      if (search.trim()) poUrl.searchParams.set("search", search.trim());
      poUrl.searchParams.set("sortBy", sortBy);
      poUrl.searchParams.set("sortOrder", sortOrder);

      const [companyRes, poRes] = await Promise.all([
        fetch(companyUrl.toString()),
        fetch(poUrl.toString()),
      ]);

      if (!companyRes.ok) throw new Error(`Failed to load companies (${companyRes.status})`);
      if (!poRes.ok) throw new Error(`Failed to load purchase orders (${poRes.status})`);

      setCompanies((await companyRes.json()) as Company[]);
      setPurchaseOrders((await poRes.json()) as PurchaseOrder[]);
    };

    setIsLoading(true);
    setError(null);
    loadData()
      .catch((loadError) => setError(loadError instanceof Error ? loadError.message : "Unable to load purchase orders"))
      .finally(() => setIsLoading(false));
  }, [selectedCompanyId, statusFilter, search, sortBy, sortOrder]);

  return (
    <ProtectedPage>
      <div className="mx-auto max-w-7xl space-y-6 px-6 py-8">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-blue-600">Procurement</p>
            <h1 className="mt-2 text-3xl font-bold text-slate-900">Purchase Orders</h1>
          </div>
          <div className="flex gap-2">
            <Link href="/billing" className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50">Billing Register</Link>
            <Link href="/purchase-orders/new" className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700">New Purchase Order</Link>
          </div>
        </div>

        <div className="grid w-full gap-2 sm:grid-cols-2 lg:grid-cols-5">
          <select value={selectedCompanyId} onChange={(event) => setSelectedCompanyId(event.target.value)} className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none transition focus:border-blue-500">
            <option value="all">All companies</option>
            {companies.map((company) => (
              <option key={company.id} value={company.id}>
                {company.parentCompany ? `${company.parentCompany.name} / ${company.name}` : company.name}
              </option>
            ))}
          </select>

          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none transition focus:border-blue-500">
            <option value="all">All status</option>
            <option value="Draft">Draft</option>
            <option value="PendingApproval">Pending approval</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
            <option value="Billed">Billed</option>
            <option value="Closed">Closed</option>
            <option value="Cancelled">Cancelled</option>
          </select>

          <select value={sortBy} onChange={(event) => setSortBy(event.target.value)} className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none transition focus:border-blue-500">
            <option value="poDate">Sort by date</option>
            <option value="poNumber">Sort by PO number</option>
            <option value="totalAmount">Sort by amount</option>
          </select>

          <select value={sortOrder} onChange={(event) => setSortOrder(event.target.value as "asc" | "desc")} className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none transition focus:border-blue-500">
            <option value="desc">Newest first</option>
            <option value="asc">Oldest first</option>
          </select>

          <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search PO number or item" className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none transition focus:border-blue-500" />
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900">PO Register</h2>
          {error ? <div className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}

          <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-700">
                <tr>
                  <th className="px-4 py-3 font-semibold">PO Number</th>
                  <th className="px-4 py-3 font-semibold">Supplier</th>
                  <th className="px-4 py-3 font-semibold">Date</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Approval</th>
                  <th className="px-4 py-3 font-semibold">Amount</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td className="px-4 py-6 text-slate-500" colSpan={6}>Loading purchase orders...</td>
                  </tr>
                ) : purchaseOrders.length === 0 ? (
                  <tr>
                    <td className="px-4 py-6 text-slate-500" colSpan={6}>No purchase orders found.</td>
                  </tr>
                ) : (
                  purchaseOrders.map((po) => (
                    <tr key={po.id} className="border-t border-slate-200">
                      <td className="px-4 py-3 font-medium text-blue-700">
                        <Link href={`/purchase-orders/${po.id}`} className="hover:underline">{po.poNumber}</Link>
                      </td>
                      <td className="px-4 py-3 text-slate-700">{po.supplier?.name ?? "-"}</td>
                      <td className="px-4 py-3 text-slate-700">{new Date(po.poDate).toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-slate-700">{po.status}</td>
                      <td className="px-4 py-3 text-slate-700">{po.approvedByRole ? `${po.approvedByRole} approved` : `Needs ${po.approvalRequiredRole ?? "manager"}`}</td>
                      <td className="px-4 py-3 text-slate-800">Rs {toNumber(po.totalAmount).toLocaleString("en-IN")}</td>
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
