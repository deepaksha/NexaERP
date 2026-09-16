"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ProtectedPage } from "@/components/protected-page";
import { FormEvent, useEffect, useState } from "react";

type Company = { id: number; name: string; parentCompany?: { id: number; name: string } | null };
type Supplier = { id: number; name: string; companyId?: number };
type Product = { id: number; name: string; sku: string; companyId?: number };

type PurchaseForm = {
  invoiceNumber: string;
  purchaseDate: string;
  companyId: string;
  supplierId: string;
  productId: string;
  productName: string;
  quantity: string;
  unitPrice: string;
  paymentStatus: string;
};

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api";
const invoicePattern = /^[A-Z0-9][A-Z0-9/-]{2,29}$/i;

const emptyForm = (): PurchaseForm => ({
  invoiceNumber: `PUR-${Date.now().toString().slice(-8)}`,
  purchaseDate: new Date().toISOString().slice(0, 10),
  companyId: "",
  supplierId: "",
  productId: "",
  productName: "",
  quantity: "1",
  unitPrice: "",
  paymentStatus: "Paid",
});

export default function NewPurchasePage() {
  const router = useRouter();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [form, setForm] = useState<PurchaseForm>(emptyForm());
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const response = await fetch(`${apiBaseUrl}/companies`);
      if (!response.ok) throw new Error(`Failed to load companies (${response.status})`);
      setCompanies((await response.json()) as Company[]);
      const suppliersResponse = await fetch(`${apiBaseUrl}/suppliers`);
      if (!suppliersResponse.ok) throw new Error(`Failed to load suppliers (${suppliersResponse.status})`);
      setSuppliers((await suppliersResponse.json()) as Supplier[]);

      const productsResponse = await fetch(`${apiBaseUrl}/products`);
      if (!productsResponse.ok) throw new Error(`Failed to load products (${productsResponse.status})`);
      setProducts((await productsResponse.json()) as Product[]);
    };

    load().catch((loadError) => setError(loadError instanceof Error ? loadError.message : "Unable to load purchase form"));
  }, []);

  const handleChange = (field: keyof PurchaseForm, value: string) => setForm((current) => ({ ...current, [field]: value }));

  const companyProducts = products.filter((product) => !form.companyId || String(product.companyId ?? "") === form.companyId);

  const fetchApplicableRate = async (productId: string, rateDate: string) => {
    const numericProductId = Number(productId);
    if (!Number.isInteger(numericProductId) || numericProductId <= 0) {
      return null;
    }

    const url = new URL(`${apiBaseUrl}/product-rates/latest-map`);
    url.searchParams.set("productIds", productId);
    url.searchParams.set("rateDate", rateDate);

    const response = await fetch(url.toString());
    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as Record<string, { rate: number }>;
    const matched = payload[productId] ?? payload[String(numericProductId)];
    return matched ? Number(matched.rate) : null;
  };

  useEffect(() => {
    if (!form.productId) {
      return;
    }

    const selected = companyProducts.find((item) => String(item.id) === form.productId);
    if (!selected) {
      setForm((current) => ({ ...current, productId: "", productName: "", unitPrice: "" }));
      return;
    }

    const dateOnly = form.purchaseDate;
    void fetchApplicableRate(form.productId, dateOnly).then((rateValue) => {
      setForm((current) => ({
        ...current,
        productName: selected.name,
        unitPrice: rateValue === null ? "" : String(rateValue),
      }));
    });
  }, [form.productId, form.purchaseDate, form.companyId]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    setError(null);

    try {
      if (!invoicePattern.test(form.invoiceNumber.trim())) throw new Error("Invoice number must use letters, numbers, - or /");
      if (!form.companyId) throw new Error("Company is required");
      if (!form.supplierId) throw new Error("Supplier is required");
      if (form.productName.trim().length < 2) throw new Error("Product name must be at least 2 characters");
      const quantity = Number(form.quantity);
      const unitPrice = Number(form.unitPrice);
      if (!Number.isFinite(quantity) || quantity <= 0) throw new Error("Quantity must be greater than zero");
      if (!Number.isFinite(unitPrice) || unitPrice < 0) throw new Error("Unit price cannot be negative");

      const response = await fetch(`${apiBaseUrl}/purchases`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceNumber: form.invoiceNumber.trim().toUpperCase(),
          purchaseDate: form.purchaseDate,
          productName: form.productName.trim(),
          quantity,
          unitPrice,
          totalAmount: Number((quantity * unitPrice).toFixed(2)),
          supplierId: Number(form.supplierId),
          companyId: Number(form.companyId),
          paymentStatus: form.paymentStatus,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.message ?? "Unable to create purchase");
      }

      router.push("/purchases");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to create purchase");
    } finally {
      setIsSaving(false);
    }
  };

  const companySuppliers = suppliers.filter((supplier) => !form.companyId || String(supplier.companyId ?? "") === form.companyId);

  return (
    <ProtectedPage>
      <div className="mx-auto max-w-5xl space-y-6 px-6 py-8">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-blue-600">Procurement</p>
            <h1 className="mt-2 text-3xl font-bold text-slate-900">New Purchase</h1>
          </div>
          <Link href="/purchases" className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">Back to list</Link>
        </div>

        <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2 text-sm font-medium text-slate-700">
              <span>Invoice number</span>
              <input required value={form.invoiceNumber} onChange={(e) => handleChange("invoiceNumber", e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2.5" />
            </label>
            <label className="space-y-2 text-sm font-medium text-slate-700">
              <span>Purchase date</span>
              <input required type="date" value={form.purchaseDate} onChange={(e) => handleChange("purchaseDate", e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2.5" />
            </label>
            <label className="space-y-2 text-sm font-medium text-slate-700">
              <span>Company</span>
              <select required value={form.companyId} onChange={(e) => setForm((current) => ({ ...current, companyId: e.target.value, supplierId: "", productId: "", productName: "", unitPrice: "" }))} className="w-full rounded-xl border border-slate-300 px-3 py-2.5">
                <option value="">Select company</option>
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>{company.parentCompany ? `${company.parentCompany.name} / ${company.name}` : company.name}</option>
                ))}
              </select>
            </label>
            <label className="space-y-2 text-sm font-medium text-slate-700">
              <span>Supplier</span>
              <select required value={form.supplierId} onChange={(e) => handleChange("supplierId", e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2.5" disabled={!form.companyId}>
                <option value="">Select supplier</option>
                {companySuppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
                ))}
              </select>
            </label>
            <label className="space-y-2 text-sm font-medium text-slate-700 md:col-span-2">
              <span>Product (rate will be fetched by date)</span>
              <select
                required
                value={form.productId}
                onChange={(e) => setForm((current) => ({ ...current, productId: e.target.value }))}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5"
                disabled={!form.companyId}
              >
                <option value="">Select product</option>
                {companyProducts.map((product) => (
                  <option key={product.id} value={product.id}>{product.name} ({product.sku})</option>
                ))}
              </select>
            </label>
            <label className="space-y-2 text-sm font-medium text-slate-700">
              <span>Quantity</span>
              <input required type="number" min="0.01" step="0.01" value={form.quantity} onChange={(e) => handleChange("quantity", e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2.5" />
            </label>
            <label className="space-y-2 text-sm font-medium text-slate-700">
              <span>Unit price</span>
              <input required type="number" min="0" step="0.01" value={form.unitPrice} onChange={(e) => handleChange("unitPrice", e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2.5" />
            </label>
            <label className="space-y-2 text-sm font-medium text-slate-700">
              <span>Payment status</span>
              <select value={form.paymentStatus} onChange={(e) => handleChange("paymentStatus", e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2.5">
                <option value="Paid">Paid</option>
                <option value="Pending">Pending</option>
                <option value="Partial">Partial</option>
              </select>
            </label>
          </div>

          {error ? <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}

          <div className="flex gap-3">
            <button type="submit" disabled={isSaving} className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60">
              {isSaving ? "Saving..." : "Save purchase"}
            </button>
            <Link href="/purchases" className="rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancel</Link>
          </div>
        </form>
      </div>
    </ProtectedPage>
  );
}
