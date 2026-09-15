"use client";

import { ProtectedPage } from "@/components/protected-page";
import { useEffect, useMemo, useState } from "react";

type Company = {
  id: number;
  name: string;
  parentCompany?: { id: number; name: string } | null;
};

type StockItem = {
  id: number;
  name: string;
  sku: string;
  category: string;
  stock: number;
  lowStockThreshold?: number;
  companyId?: number;
  company?: Company | null;
  status?: string;
};

type Movement = {
  id: number;
  movementType: string;
  quantity: number;
  product?: { name: string; sku?: string } | null;
  company?: Company | null;
  createdAt: string;
};

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api";

export default function InventoryPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("all");
  const [stock, setStock] = useState<StockItem[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCompanies = async () => {
    const response = await fetch(`${apiBaseUrl}/companies`);
    if (!response.ok) {
      throw new Error(`Failed to load companies (${response.status})`);
    }
    const data = (await response.json()) as Company[];
    setCompanies(data);
  };

  const loadStock = async () => {
    const url = new URL(`${apiBaseUrl}/products`);
    if (selectedCompanyId !== "all") {
      url.searchParams.set("companyId", selectedCompanyId);
    }

    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(`Failed to load inventory (${response.status})`);
    }

    const data = (await response.json()) as StockItem[];
    setStock(data);
  };

  const loadMovements = async () => {
    const url = new URL(`${apiBaseUrl}/inventory`);
    if (selectedCompanyId !== "all") {
      url.searchParams.set("companyId", selectedCompanyId);
    }

    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(`Failed to load stock movements (${response.status})`);
    }

    const data = (await response.json()) as Movement[];
    setMovements(data);
  };

  useEffect(() => {
    setIsLoading(true);
    setError(null);

    Promise.all([loadCompanies(), loadStock(), loadMovements()])
      .catch((loadError) => {
        setError(loadError instanceof Error ? loadError.message : "Unable to load inventory");
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [selectedCompanyId]);

  const filteredStock = useMemo(() => {
    if (selectedCompanyId === "all") {
      return stock;
    }

    return stock.filter((item) => String(item.companyId ?? item.company?.id ?? "") === selectedCompanyId);
  }, [selectedCompanyId, stock]);

  const summary = useMemo(() => {
    const totalUnits = filteredStock.reduce((sum, item) => sum + Number(item.stock || 0), 0);
    const lowStockCount = filteredStock.filter((item) => Number(item.stock || 0) <= Number(item.lowStockThreshold ?? 15)).length;
    return { totalUnits, lowStockCount };
  }, [filteredStock]);

  return (
    <ProtectedPage>
      <div className="mx-auto max-w-7xl space-y-6 px-6 py-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-blue-600">Operations</p>
            <h1 className="mt-2 text-3xl font-bold text-slate-900">Inventory</h1>
          </div>

          <select
            value={selectedCompanyId}
            onChange={(event) => setSelectedCompanyId(event.target.value)}
            className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none transition focus:border-blue-500 md:w-64"
          >
            <option value="all">All companies</option>
            {companies.map((company) => (
              <option key={company.id} value={company.id}>
                {company.parentCompany ? `${company.parentCompany.name} / ${company.name}` : company.name}
              </option>
            ))}
          </select>
        </div>

        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        ) : null}

        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Total stock units</p>
            <p className="mt-3 text-3xl font-bold text-slate-900">{summary.totalUnits}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Low stock items</p>
            <p className="mt-3 text-3xl font-bold text-amber-600">{summary.lowStockCount}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Products tracked</p>
            <p className="mt-3 text-3xl font-bold text-slate-900">{filteredStock.length}</p>
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-[1.4fr_0.9fr]">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-slate-900">Stock overview</h2>

            {isLoading ? (
              <div className="mt-5 rounded-xl bg-slate-50 p-4 text-sm text-slate-500">Loading stock...</div>
            ) : filteredStock.length === 0 ? (
              <div className="mt-5 rounded-xl bg-slate-50 p-4 text-sm text-slate-500">No products available in this company.</div>
            ) : (
              <div className="mt-5 overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-700">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Product</th>
                      <th className="px-4 py-3 font-semibold">SKU</th>
                      <th className="px-4 py-3 font-semibold">Category</th>
                      <th className="px-4 py-3 font-semibold">Stock</th>
                      <th className="px-4 py-3 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStock.map((item) => (
                      <tr key={item.id} className="border-t border-slate-200">
                        <td className="px-4 py-3 font-medium text-slate-800">{item.name}</td>
                        <td className="px-4 py-3 text-slate-600">{item.sku}</td>
                        <td className="px-4 py-3 text-slate-600">{item.category}</td>
                        <td className="px-4 py-3 text-slate-800">{Number(item.stock || 0)}</td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${Number(item.stock || 0) <= Number(item.lowStockThreshold ?? 15) ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>
                            {Number(item.stock || 0) <= Number(item.lowStockThreshold ?? 15) ? "Low stock" : "Healthy"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-slate-900">Recent stock movement</h2>

            {movements.length === 0 ? (
              <div className="mt-5 rounded-xl bg-slate-50 p-4 text-sm text-slate-500">No stock movements yet.</div>
            ) : (
              <div className="mt-5 space-y-3">
                {movements.slice(0, 8).map((movement) => (
                  <div key={movement.id} className="rounded-xl border border-slate-200 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-medium text-slate-800">{movement.product?.name ?? "Product"}</span>
                      <span className={`rounded-full px-2 py-1 text-[10px] font-medium ${movement.movementType === "IN" ? "bg-emerald-100 text-emerald-700" : movement.movementType === "OUT" ? "bg-rose-100 text-rose-700" : "bg-blue-100 text-blue-700"}`}>
                        {movement.movementType}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-slate-600">
                      Quantity: {movement.quantity} • {new Date(movement.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </ProtectedPage>
  );
}
