"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ProtectedPage } from "@/components/protected-page";
import { useLocale } from "@/components/locale-provider";
import { FormEvent, useEffect, useState } from "react";

type Company = { id: number; name: string; parentCompany?: { id: number; name: string } | null };
type Supplier = { id: number; name: string; companyId?: number };
type PurchaseRecord = {
  id: number;
  invoiceNumber: string;
  purchaseDate: string;
  productName?: string;
  quantity: number | string;
  unitPrice: number | string;
  totalAmount: number | string;
  companyId?: number;
  supplierId?: number;
  paymentStatus?: string;
};

type PurchaseForm = {
  invoiceNumber: string;
  purchaseDate: string;
  companyId: string;
  supplierId: string;
  productName: string;
  quantity: string;
  unitPrice: string;
  paymentStatus: string;
};

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api";
const invoicePattern = /^[A-Z0-9][A-Z0-9/-]{2,29}$/i;

export default function PurchaseDetailPage() {
  const { tx } = useLocale();
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const purchaseId = Number(params.id);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [form, setForm] = useState<PurchaseForm>({
    invoiceNumber: "",
    purchaseDate: "",
    companyId: "",
    supplierId: "",
    productName: "",
    quantity: "",
    unitPrice: "",
    paymentStatus: "Paid",
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      const [companiesRes, suppliersRes, purchaseRes] = await Promise.all([
        fetch(`${apiBaseUrl}/companies`),
        fetch(`${apiBaseUrl}/suppliers`),
        fetch(`${apiBaseUrl}/purchases/${purchaseId}`),
      ]);

      if (!companiesRes.ok) throw new Error(`Failed to load companies (${companiesRes.status})`);
      if (!suppliersRes.ok) throw new Error(`Failed to load suppliers (${suppliersRes.status})`);
      if (!purchaseRes.ok) throw new Error(`Failed to load purchase (${purchaseRes.status})`);

      const purchase = (await purchaseRes.json()) as PurchaseRecord;
      setCompanies((await companiesRes.json()) as Company[]);
      setSuppliers((await suppliersRes.json()) as Supplier[]);
      setForm({
        invoiceNumber: purchase.invoiceNumber,
        purchaseDate: purchase.purchaseDate,
        companyId: purchase.companyId ? String(purchase.companyId) : "",
        supplierId: purchase.supplierId ? String(purchase.supplierId) : "",
        productName: purchase.productName ?? "",
        quantity: String(purchase.quantity ?? 0),
        unitPrice: String(purchase.unitPrice ?? 0),
        paymentStatus: purchase.paymentStatus ?? "Paid",
      });
    };

    setIsLoading(true);
    setError(null);
    loadData().catch((loadError) => setError(loadError instanceof Error ? loadError.message : "Unable to load purchase"))
      .finally(() => setIsLoading(false));
  }, [purchaseId]);

  const handleChange = (field: keyof PurchaseForm, value: string) => setForm((current) => ({ ...current, [field]: value }));

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    setError(null);

    try {
      if (!invoicePattern.test(form.invoiceNumber.trim())) throw new Error("Invoice number must use letters, numbers, - or /");
      if (!form.companyId) throw new Error("Company is required");
      if (!form.supplierId) throw new Error("Supplier is required");
      const quantity = Number(form.quantity);
      const unitPrice = Number(form.unitPrice);
      if (!Number.isFinite(quantity) || quantity <= 0) throw new Error("Quantity must be greater than zero");
      if (!Number.isFinite(unitPrice) || unitPrice < 0) throw new Error("Unit price cannot be negative");

      const response = await fetch(`${apiBaseUrl}/purchases/${purchaseId}`, {
        method: "PATCH",
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
        throw new Error(payload.message ?? "Unable to update purchase");
      }

      router.push("/purchases");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to update purchase");
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
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-blue-600">{tx("Procurement")}</p>
            <h1 className="mt-2 text-3xl font-bold text-slate-900">{tx("Edit Purchase")}</h1>
          </div>
          <Link href="/purchases" className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">{tx("Back to list")}</Link>
        </div>

        {isLoading ? (
          <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">{tx("Loading purchase...")}</div>
        ) : (
          <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2 text-sm font-medium text-slate-700">
                <span>{tx("Invoice number")}</span>
                <input required value={form.invoiceNumber} onChange={(e) => handleChange("invoiceNumber", e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2.5" />
              </label>
              <label className="space-y-2 text-sm font-medium text-slate-700">
                <span>{tx("Purchase date")}</span>
                <input required type="date" value={form.purchaseDate} onChange={(e) => handleChange("purchaseDate", e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2.5" />
              </label>
              <label className="space-y-2 text-sm font-medium text-slate-700">
                <span>{tx("Company")}</span>
                <select required value={form.companyId} onChange={(e) => setForm((current) => ({ ...current, companyId: e.target.value, supplierId: "" }))} className="w-full rounded-xl border border-slate-300 px-3 py-2.5">
                  <option value="">{tx("Select company")}</option>
                  {companies.map((company) => (
                    <option key={company.id} value={company.id}>{company.parentCompany ? `${company.parentCompany.name} / ${company.name}` : company.name}</option>
                  ))}
                </select>
              </label>
              <label className="space-y-2 text-sm font-medium text-slate-700">
                <span>{tx("Supplier")}</span>
                <select required value={form.supplierId} onChange={(e) => handleChange("supplierId", e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2.5" disabled={!form.companyId}>
                  <option value="">{tx("Select supplier")}</option>
                  {companySuppliers.map((supplier) => (
                    <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
                  ))}
                </select>
              </label>
              <label className="space-y-2 text-sm font-medium text-slate-700 md:col-span-2">
                <span>Product name</span>
                <input required value={form.productName} onChange={(e) => handleChange("productName", e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2.5" />
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
                <span>{tx("Payment status")}</span>
                <select value={form.paymentStatus} onChange={(e) => handleChange("paymentStatus", e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2.5">
                  <option value="Paid">{tx("Paid")}</option>
                  <option value="Pending">{tx("Pending")}</option>
                  <option value="Partial">{tx("Partial")}</option>
                </select>
              </label>
            </div>

            {error ? <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}

            <div className="flex gap-3">
              <button type="submit" disabled={isSaving} className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60">
                {isSaving ? "Updating..." : tx("Update purchase")}
              </button>
              <Link href="/purchases" className="rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">{tx("Cancel")}</Link>
            </div>
          </form>
        )}
      </div>
    </ProtectedPage>
  );
}
