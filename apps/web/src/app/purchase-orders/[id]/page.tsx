"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ProtectedPage } from "@/components/protected-page";
import { FormEvent, useMemo, useState, useEffect } from "react";

type Company = { id: number; name: string; parentCompany?: { id: number; name: string } | null };
type Supplier = { id: number; name: string; companyId?: number };
type ItemRow = { productName: string; quantity: string; unitPrice: string };

type PurchaseRegisterEntry = {
  id: number;
  invoiceNumber: string;
  invoiceDate: string;
  totalAmount: number | string;
  paidAmount?: number | string;
  balanceAmount?: number | string;
  paymentStatus?: string;
  status?: string;
  originalBillAttachmentUrl?: string;
};

type PurchaseOrderRecord = {
  id: number;
  poNumber: string;
  requestNumber?: string;
  poDate: string;
  expectedDeliveryDate?: string;
  companyId: number;
  supplierId: number;
  itemDescription: string;
  items?: Array<{ productName: string; quantity: number | string; unitPrice: number | string }>;
  transportCharges?: number | string;
  otherCharges?: number | string;
  approvalRequiredRole?: string;
  approvedByRole?: string;
  approvedAt?: string;
  approvalNotes?: string;
  status?: string;
  notes?: string;
  purchaseRegisterEntries?: PurchaseRegisterEntry[];
  purchaseRegisterSummary?: {
    entryCount: number;
    poTotalAmount: number;
    totalBilledAmount: number;
    remainingToBillAmount: number;
    totalPaidAmount: number;
    totalPendingAmount: number;
  };
};

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api";
const poPattern = /^PO-[A-Z0-9/-]{3,30}$/i;

function toNumber(value: string | number | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export default function PurchaseOrderDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const poId = Number(params.id);

  const [companies, setCompanies] = useState<Company[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [form, setForm] = useState({
    poNumber: "",
    requestNumber: "",
    poDate: "",
    expectedDeliveryDate: "",
    companyId: "",
    supplierId: "",
    transportCharges: "0",
    otherCharges: "0",
    approvalRequiredRole: "purchase-manager",
    status: "Draft",
    notes: "",
    items: [{ productName: "", quantity: "1", unitPrice: "" }] as ItemRow[],
  });
  const [userRole, setUserRole] = useState("viewer");
  const [approvalNotes, setApprovalNotes] = useState("");
  const [purchaseRegisterEntries, setPurchaseRegisterEntries] = useState<PurchaseRegisterEntry[]>([]);
  const [registerSummary, setRegisterSummary] = useState({
    entryCount: 0,
    poTotalAmount: 0,
    totalBilledAmount: 0,
    remainingToBillAmount: 0,
    totalPaidAmount: 0,
    totalPendingAmount: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      const [companiesRes, supplierRes, poRes] = await Promise.all([
        fetch(`${apiBaseUrl}/companies`),
        fetch(`${apiBaseUrl}/suppliers`),
        fetch(`${apiBaseUrl}/purchase-orders/${poId}`),
      ]);

      if (!companiesRes.ok) throw new Error("Failed to load companies");
      if (!supplierRes.ok) throw new Error("Failed to load suppliers");
      if (!poRes.ok) throw new Error("Failed to load purchase order");

      const po = (await poRes.json()) as PurchaseOrderRecord;
      setCompanies((await companiesRes.json()) as Company[]);
      setSuppliers((await supplierRes.json()) as Supplier[]);
      setForm({
        poNumber: po.poNumber,
        requestNumber: po.requestNumber ?? "",
        poDate: po.poDate,
        expectedDeliveryDate: po.expectedDeliveryDate ?? "",
        companyId: String(po.companyId),
        supplierId: String(po.supplierId),
        transportCharges: String(toNumber(po.transportCharges)),
        otherCharges: String(toNumber(po.otherCharges)),
        approvalRequiredRole: po.approvalRequiredRole ?? "purchase-manager",
        status: po.status ?? "Draft",
        notes: po.notes ?? "",
        items: po.items?.length
          ? po.items.map((item) => ({ productName: item.productName, quantity: String(toNumber(item.quantity)), unitPrice: String(toNumber(item.unitPrice)) }))
          : [{ productName: po.itemDescription, quantity: "1", unitPrice: "0" }],
      });
      setPurchaseRegisterEntries(po.purchaseRegisterEntries ?? []);
      setApprovalNotes(po.approvalNotes ?? "");
      setRegisterSummary(
        po.purchaseRegisterSummary ?? {
          entryCount: 0,
          poTotalAmount: 0,
          totalBilledAmount: 0,
          remainingToBillAmount: 0,
          totalPaidAmount: 0,
          totalPendingAmount: 0,
        },
      );
    };

    setIsLoading(true);
    setError(null);
    loadData().catch((e) => setError(e instanceof Error ? e.message : "Unable to load purchase order"))
      .finally(() => setIsLoading(false));
  }, [poId]);

  useEffect(() => {
    const sessionRaw = localStorage.getItem("nexaerp-session");
    if (!sessionRaw) return;
    try {
      const session = JSON.parse(sessionRaw) as { role?: string };
      const role = (session.role ?? "viewer").toLowerCase().replace(/\s+/g, "-");
      setUserRole(role);
    } catch {
      setUserRole("viewer");
    }
  }, []);

  const companySuppliers = suppliers.filter((s) => !form.companyId || String(s.companyId ?? "") === form.companyId);

  const subtotal = useMemo(() => Number(form.items.reduce((sum, row) => sum + toNumber(row.quantity) * toNumber(row.unitPrice), 0).toFixed(2)), [form.items]);
  const total = Number((subtotal + toNumber(form.transportCharges) + toNumber(form.otherCharges)).toFixed(2));
  const isEntryLocked = registerSummary.entryCount > 0;
  const canReviewApproval = ["super-admin", "admin", "manager", "supervisor", "purchase-manager"].includes(userRole);
  const approvalFinalized = form.status === "Approved" || form.status === "Rejected";

  const updateItem = (index: number, patch: Partial<ItemRow>) => setForm((current) => ({ ...current, items: current.items.map((row, i) => i === index ? { ...row, ...patch } : row) }));
  const addItem = () => setForm((current) => ({ ...current, items: [...current.items, { productName: "", quantity: "1", unitPrice: "" }] }));
  const removeItem = (index: number) => setForm((current) => {
    const next = current.items.filter((_, i) => i !== index);
    return { ...current, items: next.length ? next : [{ productName: "", quantity: "1", unitPrice: "" }] };
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

      if (!items.length || items.some((row) => row.productName.length < 2)) throw new Error("Each line needs a product name");

      const response = await fetch(`${apiBaseUrl}/purchase-orders/${poId}`, {
        method: "PATCH",
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
        throw new Error(payload.message ?? "Unable to update purchase order");
      }

      router.push("/purchase-orders");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to update purchase order");
    } finally {
      setIsSaving(false);
    }
  };

  const handleReview = async (action: "approve" | "reject") => {
    setIsSaving(true);
    setError(null);
    try {
      const response = await fetch(`${apiBaseUrl}/purchase-orders/${poId}/approval`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          actingRole: userRole,
          notes: approvalNotes.trim() || null,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.message ?? "Unable to review approval");
      }

      const updated = (await response.json()) as PurchaseOrderRecord;
      setForm((current) => ({
        ...current,
        status: updated.status ?? current.status,
      }));
    } catch (reviewError) {
      setError(reviewError instanceof Error ? reviewError.message : "Unable to review approval");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ProtectedPage>
      <div className="mx-auto max-w-6xl space-y-6 px-6 py-8">
        <div className="flex items-center justify-between"><h1 className="text-3xl font-bold text-slate-900">Edit Purchase Request / PO</h1><Link href="/purchase-orders" className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm">Back to list</Link></div>
        {isEntryLocked ? <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">Purchase Register entries are posted against this PO. Editing is locked as per Indian billing controls. Please pass correction through new register entry.</div> : null}
        <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4 text-sm text-indigo-800">Approval required from role: <strong>{form.approvalRequiredRole}</strong> | Current status: <strong>{form.status}</strong></div>

        {canReviewApproval && !approvalFinalized ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm font-semibold text-slate-900">Approval Actions</p>
            <p className="mt-1 text-xs text-slate-600">Review this purchase order as {userRole}.</p>
            <div className="mt-3 grid gap-3 md:grid-cols-[1fr_auto_auto]">
              <input value={approvalNotes} onChange={(e) => setApprovalNotes(e.target.value)} placeholder="Approval remarks" className="rounded-xl border border-slate-300 px-3 py-2.5" />
              <button type="button" onClick={() => void handleReview("approve")} disabled={isSaving} className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60">Approve</button>
              <button type="button" onClick={() => void handleReview("reject")} disabled={isSaving} className="rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60">Reject</button>
            </div>
          </div>
        ) : null}
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-xs uppercase tracking-[0.16em] text-slate-500">PO Amount</p><p className="mt-1 text-xl font-bold text-slate-900">Rs {Number(registerSummary.poTotalAmount || total).toLocaleString("en-IN")}</p></div>
          <div className="rounded-xl border border-cyan-200 bg-cyan-50 p-4"><p className="text-xs uppercase tracking-[0.16em] text-cyan-700">Billed in Register</p><p className="mt-1 text-xl font-bold text-cyan-900">Rs {Number(registerSummary.totalBilledAmount).toLocaleString("en-IN")}</p><p className="text-xs text-cyan-700">Entries: {registerSummary.entryCount}</p></div>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4"><p className="text-xs uppercase tracking-[0.16em] text-emerald-700">Remaining to Bill</p><p className="mt-1 text-xl font-bold text-emerald-900">Rs {Number(registerSummary.remainingToBillAmount).toLocaleString("en-IN")}</p></div>
        </div>
        {isLoading ? <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">Loading purchase order...</div> : (
          <form onSubmit={handleSubmit} className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="grid gap-4 md:grid-cols-2">
              <input required value={form.poNumber} onChange={(e) => setForm((c) => ({ ...c, poNumber: e.target.value.toUpperCase() }))} placeholder="PO number" className="rounded-xl border border-slate-300 px-3 py-2.5" disabled={isEntryLocked} />
              <input value={form.requestNumber} onChange={(e) => setForm((c) => ({ ...c, requestNumber: e.target.value.toUpperCase() }))} placeholder="Purchase request number" className="rounded-xl border border-slate-300 px-3 py-2.5" disabled={isEntryLocked} />
              <input required type="date" value={form.poDate} onChange={(e) => setForm((c) => ({ ...c, poDate: e.target.value }))} className="rounded-xl border border-slate-300 px-3 py-2.5" disabled={isEntryLocked} />
              <input type="date" value={form.expectedDeliveryDate} onChange={(e) => setForm((c) => ({ ...c, expectedDeliveryDate: e.target.value }))} className="rounded-xl border border-slate-300 px-3 py-2.5" disabled={isEntryLocked} />
              <select required value={form.companyId} onChange={(e) => setForm((c) => ({ ...c, companyId: e.target.value, supplierId: "" }))} className="rounded-xl border border-slate-300 px-3 py-2.5" disabled={isEntryLocked}><option value="">Select company</option>{companies.map((c) => <option key={c.id} value={c.id}>{c.parentCompany ? `${c.parentCompany.name} / ${c.name}` : c.name}</option>)}</select>
              <select required value={form.supplierId} onChange={(e) => setForm((c) => ({ ...c, supplierId: e.target.value }))} className="rounded-xl border border-slate-300 px-3 py-2.5" disabled={!form.companyId || isEntryLocked}><option value="">Select supplier</option>{companySuppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
            </div>

            <div className="rounded-xl border border-slate-200 p-4">
              <div className="mb-3 flex items-center justify-between"><h2 className="font-semibold text-slate-900">Products in request</h2><button type="button" onClick={addItem} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs" disabled={isEntryLocked}>Add item</button></div>
              <div className="space-y-3">
                {form.items.map((row, index) => (
                  <div key={index} className="grid gap-2 md:grid-cols-[1.4fr_0.7fr_0.7fr_auto]">
                    <input value={row.productName} onChange={(e) => updateItem(index, { productName: e.target.value })} placeholder="Product name" className="rounded-xl border border-slate-300 px-3 py-2.5" disabled={isEntryLocked} />
                    <input type="number" min="0.01" step="0.01" value={row.quantity} onChange={(e) => updateItem(index, { quantity: e.target.value })} placeholder="Qty" className="rounded-xl border border-slate-300 px-3 py-2.5" disabled={isEntryLocked} />
                    <input type="number" min="0" step="0.01" value={row.unitPrice} onChange={(e) => updateItem(index, { unitPrice: e.target.value })} placeholder="Unit price" className="rounded-xl border border-slate-300 px-3 py-2.5" disabled={isEntryLocked} />
                    <button type="button" onClick={() => removeItem(index)} className="rounded-xl border border-rose-300 px-3 py-2 text-xs text-rose-700" disabled={isEntryLocked}>Remove</button>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <input type="number" min="0" step="0.01" value={form.transportCharges} onChange={(e) => setForm((c) => ({ ...c, transportCharges: e.target.value }))} placeholder="Transport charges" className="rounded-xl border border-slate-300 px-3 py-2.5" disabled={isEntryLocked} />
              <input type="number" min="0" step="0.01" value={form.otherCharges} onChange={(e) => setForm((c) => ({ ...c, otherCharges: e.target.value }))} placeholder="Other charges" className="rounded-xl border border-slate-300 px-3 py-2.5" disabled={isEntryLocked} />
              <select value={form.approvalRequiredRole} onChange={(e) => setForm((c) => ({ ...c, approvalRequiredRole: e.target.value }))} className="rounded-xl border border-slate-300 px-3 py-2.5" disabled={isEntryLocked}><option value="purchase-manager">Purchase Manager</option><option value="manager">Manager</option><option value="supervisor">Supervisor</option><option value="accounts-manager">Accounts Manager</option><option value="admin">Admin</option></select>
              <select value={form.status} onChange={(e) => setForm((c) => ({ ...c, status: e.target.value }))} className="rounded-xl border border-slate-300 px-3 py-2.5" disabled={isEntryLocked}><option value="PendingApproval">Pending approval</option><option value="Draft">Draft</option><option value="Approved">Approved</option><option value="Rejected">Rejected</option><option value="Billed">Billed</option><option value="Cancelled">Cancelled</option></select>
              <textarea value={form.notes} onChange={(e) => setForm((c) => ({ ...c, notes: e.target.value }))} placeholder="Notes" className="min-h-20 rounded-xl border border-slate-300 px-3 py-2.5 md:col-span-2" disabled={isEntryLocked} />
            </div>

            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">Subtotal: Rs {subtotal.toLocaleString("en-IN")} | Total: Rs {total.toLocaleString("en-IN")}</div>
            {error ? <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}
            <button type="submit" disabled={isSaving || isEntryLocked} className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-medium text-white disabled:opacity-60">{isSaving ? "Updating..." : "Update purchase request"}</button>
          </form>
        )}

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900">Purchase Register Entries</h2>
            <Link href="/billing/new" className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-700">Add register entry</Link>
          </div>
          {purchaseRegisterEntries.length === 0 ? (
            <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">No billing register entries linked to this PO yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-700">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Entry</th>
                    <th className="px-3 py-2 font-semibold">Date</th>
                    <th className="px-3 py-2 font-semibold">Amount</th>
                    <th className="px-3 py-2 font-semibold">Paid</th>
                    <th className="px-3 py-2 font-semibold">Balance</th>
                    <th className="px-3 py-2 font-semibold">Status</th>
                    <th className="px-3 py-2 font-semibold">Bill</th>
                  </tr>
                </thead>
                <tbody>
                  {purchaseRegisterEntries.map((entry) => (
                    <tr key={entry.id} className="border-t border-slate-200">
                      <td className="px-3 py-2"><Link href={`/billing/${entry.id}`} className="text-blue-700 hover:underline">{entry.invoiceNumber}</Link></td>
                      <td className="px-3 py-2">{entry.invoiceDate}</td>
                      <td className="px-3 py-2">Rs {toNumber(entry.totalAmount).toLocaleString("en-IN")}</td>
                      <td className="px-3 py-2">Rs {toNumber(entry.paidAmount).toLocaleString("en-IN")}</td>
                      <td className="px-3 py-2">Rs {toNumber(entry.balanceAmount).toLocaleString("en-IN")}</td>
                      <td className="px-3 py-2">{entry.paymentStatus ?? entry.status ?? "-"}</td>
                      <td className="px-3 py-2">{entry.originalBillAttachmentUrl ? <a href={entry.originalBillAttachmentUrl} target="_blank" rel="noreferrer" className="text-blue-700 hover:underline">View</a> : "-"}</td>
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
