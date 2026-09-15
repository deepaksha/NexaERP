"use client";

import Link from "next/link";
import { ProtectedPage } from "@/components/protected-page";
import { useEffect, useMemo, useState } from "react";

type Company = {
  id: number;
  name: string;
  parentCompany?: { id: number; name: string } | null;
};

type Customer = {
  id: number;
  name: string;
};

type SaleItem = {
  id: number;
};

type Sale = {
  id: number;
  invoiceNumber: string;
  saleDate: string;
  saleDateTime?: string;
  quantity: number;
  totalAmount: number;
  paidAmount?: number | string;
  balanceAmount?: number | string;
  paymentType?: string;
  paymentStatus?: string;
  companyId?: number;
  company?: Company | null;
  customer?: Customer | null;
  items?: SaleItem[];
};

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api";

export default function SalesListPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      const companiesResponse = await fetch(`${apiBaseUrl}/companies`);
      if (!companiesResponse.ok) {
        throw new Error(`Failed to load companies (${companiesResponse.status})`);
      }

      const salesUrl = new URL(`${apiBaseUrl}/sales`);
      if (selectedCompanyId !== "all") {
        salesUrl.searchParams.set("companyId", selectedCompanyId);
      }

      const salesResponse = await fetch(salesUrl.toString());
      if (!salesResponse.ok) {
        throw new Error(`Failed to load sales (${salesResponse.status})`);
      }

      setCompanies((await companiesResponse.json()) as Company[]);
      setSales((await salesResponse.json()) as Sale[]);
    };

    setIsLoading(true);
    setError(null);

    loadData()
      .catch((loadError) => {
        setError(loadError instanceof Error ? loadError.message : "Unable to load sales list");
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [selectedCompanyId]);

  const filteredSales = useMemo(() => {
    if (selectedCompanyId === "all") {
      return sales;
    }

    return sales.filter((sale) => String(sale.company?.id ?? sale.companyId ?? "") === selectedCompanyId);
  }, [sales, selectedCompanyId]);

  return (
    <ProtectedPage>
      <div className="mx-auto max-w-7xl space-y-6 px-6 py-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-blue-600">Revenue</p>
            <h1 className="mt-2 text-3xl font-bold text-slate-900">Sales List</h1>
            <p className="mt-1 text-sm text-slate-500">Open an invoice to view details and reprint. Bills are read-only.</p>
          </div>

          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
            <select
              value={selectedCompanyId}
              onChange={(event) => setSelectedCompanyId(event.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none transition focus:border-blue-500 sm:w-64"
            >
              <option value="all">All companies</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.parentCompany ? `${company.parentCompany.name} / ${company.name}` : company.name}
                </option>
              ))}
            </select>

            <Link
              href="/sales/new"
              className="rounded-xl bg-blue-600 px-4 py-2.5 text-center text-sm font-medium text-white shadow-sm transition hover:bg-blue-700"
            >
              New Billing
            </Link>
          </div>
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          {isLoading ? (
            <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">Loading sales...</div>
          ) : error ? (
            <div className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</div>
          ) : filteredSales.length === 0 ? (
            <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">No sales found for this company.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-700">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Invoice</th>
                    <th className="px-4 py-3 font-semibold">Date/Time</th>
                    <th className="px-4 py-3 font-semibold">Items</th>
                    <th className="px-4 py-3 font-semibold">Total Qty</th>
                    <th className="px-4 py-3 font-semibold">Customer</th>
                    <th className="px-4 py-3 font-semibold">Payment</th>
                    <th className="px-4 py-3 font-semibold">Amount</th>
                    <th className="px-4 py-3 font-semibold">Paid</th>
                    <th className="px-4 py-3 font-semibold">Due</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSales.map((sale) => (
                    <tr key={sale.id} className="border-t border-slate-200">
                      <td className="px-4 py-3 text-slate-800">
                        <Link
                          href={`/sales/${sale.id}`}
                          className="font-semibold text-blue-700 underline-offset-2 transition hover:text-blue-900 hover:underline"
                          title="Open bill details"
                        >
                          {sale.invoiceNumber}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {new Date(sale.saleDateTime ?? sale.saleDate).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{sale.items?.length ?? 1}</td>
                      <td className="px-4 py-3 text-slate-600">{Number(sale.quantity || 0)}</td>
                      <td className="px-4 py-3 text-slate-600">{sale.customer?.name || "-"}</td>
                      <td className="px-4 py-3 text-slate-600">
                        {sale.paymentType || "Cash"} / {sale.paymentStatus || "Paid"}
                      </td>
                      <td className="px-4 py-3 text-slate-800">Rs {Number(sale.totalAmount || 0).toLocaleString("en-IN")}</td>
                      <td className="px-4 py-3 text-emerald-700">Rs {Number(sale.paidAmount || 0).toLocaleString("en-IN")}</td>
                      <td className="px-4 py-3 text-amber-700">Rs {Number(sale.balanceAmount || 0).toLocaleString("en-IN")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </ProtectedPage>
  );
}
