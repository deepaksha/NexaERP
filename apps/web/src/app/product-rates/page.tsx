"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { ProtectedPage } from "@/components/protected-page";

type Product = {
  id: number;
  name: string;
  sku: string;
  companyId?: number;
};

type Company = {
  id: number;
  name: string;
  parentCompany?: { id: number; name: string } | null;
};

type ProductRate = {
  id: number;
  productId: number;
  rateDate: string;
  rate: number | string;
  source?: string;
  notes?: string;
  product?: Product;
};

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api";

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

function toNumber(value: number | string | null | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export default function ProductRatesPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("all");
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState(todayDate());
  const [rate, setRate] = useState("");
  const [source, setSource] = useState("Government");
  const [notes, setNotes] = useState("");
  const [todayRates, setTodayRates] = useState<ProductRate[]>([]);
  const [historyRates, setHistoryRates] = useState<ProductRate[]>([]);
  const [allRates, setAllRates] = useState<ProductRate[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const companyProducts = useMemo(() => {
    return products.filter((product) => selectedCompanyId === "all" || String(product.companyId ?? "") === selectedCompanyId);
  }, [products, selectedCompanyId]);

  const selectedProduct = useMemo(
    () => companyProducts.find((product) => String(product.id) === selectedProductId),
    [companyProducts, selectedProductId],
  );

  const loadMasterData = async () => {
    const [companiesResponse, productsResponse] = await Promise.all([
      fetch(`${apiBaseUrl}/companies`),
      fetch(`${apiBaseUrl}/products`),
    ]);

    if (!companiesResponse.ok) throw new Error(`Failed to load companies (${companiesResponse.status})`);
    if (!productsResponse.ok) throw new Error(`Failed to load products (${productsResponse.status})`);

    setCompanies((await companiesResponse.json()) as Company[]);
    setProducts((await productsResponse.json()) as Product[]);
  };

  const loadRates = async (productId?: string) => {
    const todayUrl = new URL(`${apiBaseUrl}/product-rates/today`);
    if (selectedCompanyId !== "all") {
      const scopedProductIds = companyProducts.map((item) => item.id).join(",");
      if (scopedProductIds) {
        todayUrl.searchParams.set("productIds", scopedProductIds);
      }
    }

    const allUrl = new URL(`${apiBaseUrl}/product-rates`);
    allUrl.searchParams.set("limit", "200");
    if (selectedCompanyId !== "all") {
      allUrl.searchParams.set("companyId", selectedCompanyId);
    }

    const [todayResponse, allResponse] = await Promise.all([
      fetch(todayUrl.toString()),
      fetch(allUrl.toString()),
    ]);

    if (!todayResponse.ok) throw new Error(`Failed to load today's rates (${todayResponse.status})`);
    if (!allResponse.ok) throw new Error(`Failed to load rate records (${allResponse.status})`);

    const todayData = (await todayResponse.json()) as ProductRate[];
    const allData = (await allResponse.json()) as ProductRate[];

    setTodayRates(todayData);
    setAllRates(allData);

    if (!productId) {
      setHistoryRates([]);
      return;
    }

    const historyUrl = new URL(`${apiBaseUrl}/product-rates/history`);
    historyUrl.searchParams.set("productId", productId);
    historyUrl.searchParams.set("days", "5");

    const historyResponse = await fetch(historyUrl.toString());
    if (!historyResponse.ok) {
      throw new Error(`Failed to load last 5 day rates (${historyResponse.status})`);
    }

    const historyPayload = (await historyResponse.json()) as { rates: ProductRate[] };
    setHistoryRates(historyPayload.rates ?? []);
  };

  useEffect(() => {
    setError(null);
    setIsLoading(true);
    loadMasterData()
      .then(() => loadRates())
      .catch((loadError) => setError(loadError instanceof Error ? loadError.message : "Unable to load rates"))
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedProductId) {
      setRate("");
      setHistoryRates([]);
      return;
    }

    const loadDateRate = async () => {
      setError(null);
      const response = await fetch(`${apiBaseUrl}/product-rates/latest-map?productIds=${selectedProductId}&rateDate=${selectedDate}`);
      if (!response.ok) throw new Error(`Failed to load rate for selected date (${response.status})`);
      const payload = (await response.json()) as Record<string, { rate: number; rateDate: string; source: string }>;
      const latest = payload[selectedProductId];
      setRate(latest ? String(toNumber(latest.rate)) : "");
      await loadRates(selectedProductId);
    };

    loadDateRate().catch((loadError) => setError(loadError instanceof Error ? loadError.message : "Unable to load rate"));
  }, [selectedProductId, selectedDate]);

  useEffect(() => {
    setError(null);
    void loadRates(selectedProductId || undefined).catch((loadError) => {
      setError(loadError instanceof Error ? loadError.message : "Unable to load rates");
    });
  }, [selectedCompanyId]);

  useEffect(() => {
    if (selectedProductId && !companyProducts.some((item) => String(item.id) === selectedProductId)) {
      setSelectedProductId("");
      setRate("");
    }
  }, [companyProducts, selectedProductId]);

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSaving(true);

    try {
      const parsedProductId = Number(selectedProductId);
      const parsedRate = Number(rate);

      if (!Number.isInteger(parsedProductId) || parsedProductId <= 0) {
        throw new Error("Select a product");
      }

      if (!Number.isFinite(parsedRate) || parsedRate < 0) {
        throw new Error("Rate must be a valid non-negative number");
      }

      const response = await fetch(`${apiBaseUrl}/product-rates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: parsedProductId,
          rateDate: selectedDate,
          rate: parsedRate,
          source: source.trim() || "Government",
          notes: notes.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.message ?? "Unable to save product rate");
      }

      await loadRates(selectedProductId);
      setNotes("");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save product rate");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ProtectedPage>
      <div className="mx-auto max-w-7xl space-y-6 px-6 py-8">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-blue-600">Price Control</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">Daily Product Rates</h1>
          <p className="mt-1 text-sm text-slate-500">Manage date-wise government rates and instantly view today and the last 5 days for selected products.</p>
        </div>

        <form onSubmit={handleSave} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <label className="space-y-2 text-sm font-medium text-slate-700">
              <span>Company scope</span>
              <select
                value={selectedCompanyId}
                onChange={(event) => setSelectedCompanyId(event.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5"
              >
                <option value="all">All companies</option>
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.parentCompany ? `${company.parentCompany.name} / ${company.name}` : company.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2 text-sm font-medium text-slate-700">
              <span>Product</span>
              <select
                required
                value={selectedProductId}
                onChange={(event) => setSelectedProductId(event.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5"
              >
                <option value="">Select product</option>
                {companyProducts.map((product) => (
                  <option key={product.id} value={product.id}>{product.name} ({product.sku})</option>
                ))}
              </select>
            </label>

            <label className="space-y-2 text-sm font-medium text-slate-700">
              <span>Rate date</span>
              <input
                required
                type="date"
                value={selectedDate}
                onChange={(event) => setSelectedDate(event.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5"
              />
            </label>

            <label className="space-y-2 text-sm font-medium text-slate-700">
              <span>Rate (Rs)</span>
              <input
                required
                type="number"
                min="0"
                step="0.01"
                value={rate}
                onChange={(event) => setRate(event.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5"
                placeholder="0.00"
              />
            </label>

            <label className="space-y-2 text-sm font-medium text-slate-700">
              <span>Source</span>
              <input
                value={source}
                onChange={(event) => setSource(event.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5"
                placeholder="Government"
              />
            </label>

            <label className="space-y-2 text-sm font-medium text-slate-700 lg:col-span-3">
              <span>Notes</span>
              <input
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5"
                placeholder="Circular number / announcement reference"
              />
            </label>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <button type="submit" disabled={isSaving} className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60">
              {isSaving ? "Saving..." : "Save daily rate"}
            </button>
            {selectedProduct ? (
              <span className="text-sm text-slate-600">Selected: <strong>{selectedProduct.name}</strong></span>
            ) : null}
          </div>

          {error ? <div className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}
        </form>

        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">Today&apos;s Rates</h2>
              <span className="text-sm text-slate-500">{todayDate()}</span>
            </div>

            {isLoading ? (
              <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">Loading rates...</div>
            ) : todayRates.length === 0 ? (
              <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">No rates available for today.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-700">
                    <tr>
                      <th className="px-3 py-2 font-semibold">Product</th>
                      <th className="px-3 py-2 font-semibold">Rate</th>
                      <th className="px-3 py-2 font-semibold">Source</th>
                    </tr>
                  </thead>
                  <tbody>
                    {todayRates.map((entry) => (
                      <tr key={entry.id} className="border-t border-slate-200">
                        <td className="px-3 py-2">{entry.product?.name ?? `Product #${entry.productId}`}</td>
                        <td className="px-3 py-2">Rs {toNumber(entry.rate).toLocaleString("en-IN", { maximumFractionDigits: 2 })}</td>
                        <td className="px-3 py-2">{entry.source ?? "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">Last 5 Days</h2>
              <span className="text-sm text-slate-500">Selected product trend</span>
            </div>

            {!selectedProductId ? (
              <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">Select a product to see last 5 day rates.</div>
            ) : historyRates.length === 0 ? (
              <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">No rate history found for selected product.</div>
            ) : (
              <div className="space-y-2">
                {historyRates.map((entry) => (
                  <div key={entry.id} className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3">
                    <div>
                      <p className="font-semibold text-slate-900">{entry.rateDate}</p>
                      <p className="text-xs text-slate-500">{entry.source ?? "Government"}</p>
                    </div>
                    <p className="text-sm font-bold text-slate-900">Rs {toNumber(entry.rate).toLocaleString("en-IN", { maximumFractionDigits: 2 })}</p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-bold text-slate-900">Recent Rate Entries</h2>
          {allRates.length === 0 ? (
            <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">No rates recorded yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-700">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Date</th>
                    <th className="px-3 py-2 font-semibold">Product</th>
                    <th className="px-3 py-2 font-semibold">Rate</th>
                    <th className="px-3 py-2 font-semibold">Source</th>
                    <th className="px-3 py-2 font-semibold">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {allRates.map((entry) => (
                    <tr key={entry.id} className="border-t border-slate-200">
                      <td className="px-3 py-2">{entry.rateDate}</td>
                      <td className="px-3 py-2">{entry.product?.name ?? `Product #${entry.productId}`}</td>
                      <td className="px-3 py-2">Rs {toNumber(entry.rate).toLocaleString("en-IN", { maximumFractionDigits: 2 })}</td>
                      <td className="px-3 py-2">{entry.source ?? "Government"}</td>
                      <td className="px-3 py-2 text-slate-500">{entry.notes ?? "-"}</td>
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
