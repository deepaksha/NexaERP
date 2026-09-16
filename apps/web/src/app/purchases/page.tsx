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

type Supplier = {
  id: number;
  name: string;
};

type Purchase = {
  id: number;
  invoiceNumber: string;
  purchaseDate: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  paymentStatus?: string;
  supplier?: Supplier | null;
};

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api";

export default function PurchasesPage() {
  const { tx } = useLocale();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("purchaseDate");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      const companyUrl = new URL(`${apiBaseUrl}/companies`);
      const purchaseUrl = new URL(`${apiBaseUrl}/purchases`);

      if (selectedCompanyId !== "all") purchaseUrl.searchParams.set("companyId", selectedCompanyId);
      if (search.trim()) purchaseUrl.searchParams.set("search", search.trim());
      purchaseUrl.searchParams.set("sortBy", sortBy);
      purchaseUrl.searchParams.set("sortOrder", sortOrder);

      const [companyRes, purchaseRes] = await Promise.all([
        fetch(companyUrl.toString()),
        fetch(purchaseUrl.toString()),
      ]);

      if (!companyRes.ok) throw new Error(`Failed to load companies (${companyRes.status})`);
      if (!purchaseRes.ok) throw new Error(`Failed to load purchases (${purchaseRes.status})`);

      setCompanies((await companyRes.json()) as Company[]);
      setPurchases((await purchaseRes.json()) as Purchase[]);
    };

    setIsLoading(true);
    setError(null);
    loadData()
      .catch((loadError) => setError(loadError instanceof Error ? loadError.message : "Unable to load purchases"))
      .finally(() => setIsLoading(false));
  }, [selectedCompanyId, search, sortBy, sortOrder]);

  return (
    <ProtectedPage>
      <div className="mx-auto max-w-7xl space-y-6 px-6 py-8">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-blue-600">{tx("Procurement")}</p>
            <h1 className="mt-2 text-3xl font-bold text-slate-900">{tx("Purchases")}</h1>
          </div>
          <Link href="/purchases/new" className="w-fit rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700">
            {tx("New Purchase")}
          </Link>
        </div>

        <div className="grid w-full gap-2 sm:grid-cols-2 md:grid-cols-4">
          <select value={selectedCompanyId} onChange={(event) => setSelectedCompanyId(event.target.value)} className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none transition focus:border-blue-500">
            <option value="all">{tx("All companies")}</option>
            {companies.map((company) => (
              <option key={company.id} value={company.id}>
                {company.parentCompany ? `${company.parentCompany.name} / ${company.name}` : company.name}
              </option>
            ))}
          </select>

          <select value={sortBy} onChange={(event) => setSortBy(event.target.value)} className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none transition focus:border-blue-500">
            <option value="purchaseDate">{tx("Sort by date")}</option>
            <option value="invoiceNumber">{tx("Sort by invoice")}</option>
            <option value="totalAmount">{tx("Sort by amount")}</option>
          </select>

          <select value={sortOrder} onChange={(event) => setSortOrder(event.target.value as "asc" | "desc")} className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none transition focus:border-blue-500">
            <option value="desc">{tx("Newest first")}</option>
            <option value="asc">{tx("Oldest first")}</option>
          </select>

          <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={tx("Search invoice/product/supplier")} className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none transition focus:border-blue-500" />
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900">{tx("Purchase Register")}</h2>
          {error ? <div className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}

          <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-700">
                <tr>
                  <th className="px-4 py-3 font-semibold">{tx("Invoice")}</th>
                  <th className="px-4 py-3 font-semibold">Product</th>
                  <th className="px-4 py-3 font-semibold">{tx("Supplier")}</th>
                  <th className="px-4 py-3 font-semibold">{tx("Date")}</th>
                  <th className="px-4 py-3 font-semibold">{tx("Amount")}</th>
                  <th className="px-4 py-3 font-semibold">Payment</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td className="px-4 py-6 text-slate-500" colSpan={6}>{tx("Loading purchases...")}</td>
                  </tr>
                ) : purchases.length === 0 ? (
                  <tr>
                    <td className="px-4 py-6 text-slate-500" colSpan={6}>{tx("No purchases found.")}</td>
                  </tr>
                ) : (
                  purchases.map((purchase) => (
                    <tr key={purchase.id} className="border-t border-slate-200">
                      <td className="px-4 py-3 font-medium text-blue-700">
                        <Link href={`/purchases/${purchase.id}`} className="hover:underline">{purchase.invoiceNumber}</Link>
                      </td>
                      <td className="px-4 py-3 text-slate-700">{purchase.productName}</td>
                      <td className="px-4 py-3 text-slate-700">{purchase.supplier?.name ?? "-"}</td>
                      <td className="px-4 py-3 text-slate-700">{new Date(purchase.purchaseDate).toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-slate-800">Rs {Number(purchase.totalAmount || 0).toLocaleString("en-IN")}</td>
                      <td className="px-4 py-3 text-slate-700">{purchase.paymentStatus ?? "-"}</td>
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
