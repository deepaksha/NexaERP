"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ProtectedPage } from "@/components/protected-page";
import { FormEvent, useMemo, useState, useEffect } from "react";

type Company = { id: number; name: string; parentCompany?: { id: number; name: string } | null };
type Supplier = { id: number; name: string; companyId?: number };
type ItemRow = { productName: string; quantity: string; unitPrice: string };

type PurchaseOrderForm = {
  poNumber: string;
  requestNumber: string;
  poDate: string;
  expectedDeliveryDate: string;
  companyId: string;
  supplierId: string;
  transportCharges: string;
  otherCharges: string;
  approvalRequiredRole: string;
  status: string;
  notes: string;
  items: ItemRow[];
};

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api";
const poPattern = /^PO-[A-Z0-9/-]{3,30}$/i;

const emptyRow = (): ItemRow => ({ productName: "", quantity: "1", unitPrice: "" });
const emptyForm = (): PurchaseOrderForm => ({
  poNumber: `PO-${Date.now().toString().slice(-8)}`,
  requestNumber: `PR-${Date.now().toString().slice(-8)}`,
  poDate: new Date().toISOString().slice(0, 10),
  expectedDeliveryDate: "",
  companyId: "",
  supplierId: "",
  transportCharges: "0",
  otherCharges: "0",
  approvalRequiredRole: "purchase-manager",
  status: "PendingApproval",
  notes: "",
  items: [emptyRow()],
});

function toNumber(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export default function NewPurchaseOrderPage() {
  const router = useRouter();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [form, setForm] = useState<PurchaseOrderForm>(emptyForm());
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const [companyRes, supplierRes] = await Promise.all([fetch(`${apiBaseUrl}/companies`), fetch(`${apiBaseUrl}/suppliers`)]);
      if (!companyRes.ok) throw new Error("Failed to load companies");
      if (!supplierRes.ok) throw new Error("Failed to load suppliers");
      setCompanies((await companyRes.json()) as Company[]);
      setSuppliers((await supplierRes.json()) as Supplier[]);
    };
    load().catch((e) => setError(e instanceof Error ? e.message : "Unable to load form"));
  }, []);

  const companySuppliers = suppliers.filter((s) => !form.companyId || String(s.companyId ?? "") === form.companyId);

  const subtotal = useMemo(() => Number(form.items.reduce((sum, row) => sum + toNumber(row.quantity) * toNumber(row.unitPrice), 0).toFixed(2)), [form.items]);
  const total = Number((subtotal + toNumber(form.transportCharges) + toNumber(form.otherCharges)).toFixed(2));

  const updateItem = (index: number, patch: Partial<ItemRow>) => {
    setForm((current) => ({ ...current, items: current.items.map((row, i) => i === index ? { ...row, ...patch } : row) }));
  };

  const addItem = () => setForm((current) => ({ ...current, items: [...current.items, emptyRow()] }));
  const removeItem = (index: number) => setForm((current) => {
    const next = current.items.filter((_, i) => i !== index);
    return { ...current, items: next.length ? next : [emptyRow()] };
  });

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    setError(null);

    try {
      if (!poPattern.test(form.poNumber.trim())) throw new Error("PO number must be in format PO-XXXX");
      if (!form.companyId) throw new Error("Company is required");
      if (!form.supplierId) throw new Error("Supplier is required");

      const items = form.items.map((row) => ({
        productName: row.productName.trim(),
        quantity: Number(toNumber(row.quantity).toFixed(2)),
        unitPrice: Number(toNumber(row.unitPrice).toFixed(2)),
      }));

      if (!items.length || items.some((row) => row.productName.length < 2)) {
        throw new Error("Each line needs a product name");
      }
      if (items.some((row) => row.quantity <= 0)) throw new Error("Each line quantity must be greater than zero");
      if (items.some((row) => row.unitPrice < 0)) throw new Error("Unit price cannot be negative");

      const response = await fetch(`${apiBaseUrl}/purchase-orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          poNumber: form.poNumber.trim().toUpperCase(),
          requestNumber: form.requestNumber.trim() || null,
          poDate: form.poDate,
          expectedDeliveryDate: form.expectedDeliveryDate || null,
          companyId: Number(form.companyId),
          supplierId: Number(form.supplierId),
          itemDescription: items.map((row) => row.productName).join(", "),
          items,
          quantity: Number(items.reduce((sum, row) => sum + row.quantity, 0).toFixed(2)),
          unitPrice: items.length ? Number((subtotal / Math.max(1, items.reduce((sum, row) => sum + row.quantity, 0))).toFixed(2)) : 0,
          transportCharges: toNumber(form.transportCharges),
          otherCharges: toNumber(form.otherCharges),
          approvalRequiredRole: form.approvalRequiredRole,
          status: form.status,
          notes: form.notes.trim() || null,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.message ?? "Unable to create purchase order");
      }

      router.push("/purchase-orders");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to create purchase order");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ProtectedPage>
      <div className="mx-auto max-w-6xl space-y-6 px-6 py-8">
        <div className="flex items-center justify-between"><h1 className="text-3xl font-bold text-slate-900">New Purchase Request / PO</h1><Link href="/purchase-orders" className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm">Back to list</Link></div>
        <form onSubmit={handleSubmit} className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="grid gap-4 md:grid-cols-2">
            <input required value={form.poNumber} onChange={(e) => setForm((c) => ({ ...c, poNumber: e.target.value.toUpperCase() }))} placeholder="PO number" className="rounded-xl border border-slate-300 px-3 py-2.5" />
            <input value={form.requestNumber} onChange={(e) => setForm((c) => ({ ...c, requestNumber: e.target.value.toUpperCase() }))} placeholder="Purchase request number" className="rounded-xl border border-slate-300 px-3 py-2.5" />
            <input required type="date" value={form.poDate} onChange={(e) => setForm((c) => ({ ...c, poDate: e.target.value }))} className="rounded-xl border border-slate-300 px-3 py-2.5" />
            <input type="date" value={form.expectedDeliveryDate} onChange={(e) => setForm((c) => ({ ...c, expectedDeliveryDate: e.target.value }))} className="rounded-xl border border-slate-300 px-3 py-2.5" />
            <select required value={form.companyId} onChange={(e) => setForm((c) => ({ ...c, companyId: e.target.value, supplierId: "" }))} className="rounded-xl border border-slate-300 px-3 py-2.5"><option value="">Select company</option>{companies.map((c) => <option key={c.id} value={c.id}>{c.parentCompany ? `${c.parentCompany.name} / ${c.name}` : c.name}</option>)}</select>
            <select required value={form.supplierId} onChange={(e) => setForm((c) => ({ ...c, supplierId: e.target.value }))} className="rounded-xl border border-slate-300 px-3 py-2.5" disabled={!form.companyId}><option value="">Select supplier</option>{companySuppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
          </div>

          <div className="rounded-xl border border-slate-200 p-4">
            <div className="mb-3 flex items-center justify-between"><h2 className="font-semibold text-slate-900">Products in request</h2><button type="button" onClick={addItem} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs">Add item</button></div>
            <div className="space-y-3">
              {form.items.map((row, index) => (
                <div key={index} className="grid gap-2 md:grid-cols-[1.4fr_0.7fr_0.7fr_auto]">
                  <input value={row.productName} onChange={(e) => updateItem(index, { productName: e.target.value })} placeholder="Product name" className="rounded-xl border border-slate-300 px-3 py-2.5" />
                  <input type="number" min="0.01" step="0.01" value={row.quantity} onChange={(e) => updateItem(index, { quantity: e.target.value })} placeholder="Qty" className="rounded-xl border border-slate-300 px-3 py-2.5" />
                  <input type="number" min="0" step="0.01" value={row.unitPrice} onChange={(e) => updateItem(index, { unitPrice: e.target.value })} placeholder="Unit price" className="rounded-xl border border-slate-300 px-3 py-2.5" />
                  <button type="button" onClick={() => removeItem(index)} className="rounded-xl border border-rose-300 px-3 py-2 text-xs text-rose-700">Remove</button>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <input type="number" min="0" step="0.01" value={form.transportCharges} onChange={(e) => setForm((c) => ({ ...c, transportCharges: e.target.value }))} placeholder="Transport charges" className="rounded-xl border border-slate-300 px-3 py-2.5" />
            <input type="number" min="0" step="0.01" value={form.otherCharges} onChange={(e) => setForm((c) => ({ ...c, otherCharges: e.target.value }))} placeholder="Other charges" className="rounded-xl border border-slate-300 px-3 py-2.5" />
            <select value={form.approvalRequiredRole} onChange={(e) => setForm((c) => ({ ...c, approvalRequiredRole: e.target.value }))} className="rounded-xl border border-slate-300 px-3 py-2.5"><option value="purchase-manager">Purchase Manager</option><option value="manager">Manager</option><option value="supervisor">Supervisor</option><option value="accounts-manager">Accounts Manager</option><option value="admin">Admin</option></select>
            <select value={form.status} onChange={(e) => setForm((c) => ({ ...c, status: e.target.value }))} className="rounded-xl border border-slate-300 px-3 py-2.5"><option value="PendingApproval">Pending approval</option><option value="Draft">Draft</option><option value="Approved">Approved</option><option value="Rejected">Rejected</option><option value="Billed">Billed</option><option value="Cancelled">Cancelled</option></select>
            <textarea value={form.notes} onChange={(e) => setForm((c) => ({ ...c, notes: e.target.value }))} placeholder="Notes" className="min-h-20 rounded-xl border border-slate-300 px-3 py-2.5 md:col-span-2" />
          </div>

          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">Subtotal: Rs {subtotal.toLocaleString("en-IN")} | Total: Rs {total.toLocaleString("en-IN")}</div>
          {error ? <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}
          <button type="submit" disabled={isSaving} className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-medium text-white">{isSaving ? "Saving..." : "Save purchase request"}</button>
        </form>
      </div>
    </ProtectedPage>
  );
}
