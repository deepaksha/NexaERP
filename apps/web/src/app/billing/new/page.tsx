"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ProtectedPage } from "@/components/protected-page";
import { FormEvent, useEffect, useMemo, useState } from "react";

type Company = { id: number; name: string; parentCompany?: { id: number; name: string } | null };
type Customer = { id: number; name: string; companyId?: number };
type Supplier = { id: number; name: string; companyId?: number };
type Broker = { id: number; name: string; companyId?: number };
type PurchaseOrder = { id: number; poNumber: string; companyId: number; supplierId: number; totalAmount: number | string; transportCharges?: number | string; otherCharges?: number | string };

type PurchaseOrderDetail = PurchaseOrder & {
  purchaseRegisterSummary?: {
    entryCount: number;
    poTotalAmount: number;
    totalBilledAmount: number;
    remainingToBillAmount: number;
  };
};

type BillingForm = {
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  billType: "SALE" | "PURCHASE";
  companyId: string;
  customerId: string;
  supplierId: string;
  purchaseOrderId: string;
  totalAmount: string;
  gstAmount: string;
  transportCharges: string;
  otherCharges: string;
  paidAmount: string;
  brokerId: string;
  brokerageType: "" | "PERCENT" | "FIXED";
  brokerageValue: string;
  originalBillAttachmentUrl: string;
  originalBillAmount: string;
  journalNarration: string;
  status: string;
  notes: string;
};

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api";
const invoiceNumberPattern = /^[A-Z0-9][A-Z0-9/-]{2,29}$/i;

const emptyForm = (): BillingForm => ({
  invoiceNumber: `INV-${Date.now().toString().slice(-8)}`,
  invoiceDate: new Date().toISOString().slice(0, 10),
  dueDate: "",
  billType: "SALE",
  companyId: "",
  customerId: "",
  supplierId: "",
  purchaseOrderId: "",
  totalAmount: "",
  gstAmount: "",
  transportCharges: "0",
  otherCharges: "0",
  paidAmount: "0",
  brokerId: "",
  brokerageType: "",
  brokerageValue: "0",
  originalBillAttachmentUrl: "",
  originalBillAmount: "0",
  journalNarration: "",
  status: "Draft",
  notes: "",
});

function toNumber(value: number | string | null | undefined): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export default function NewBillingPage() {
  const router = useRouter();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [brokers, setBrokers] = useState<Broker[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [form, setForm] = useState<BillingForm>(emptyForm());
  const [selectedPoDetail, setSelectedPoDetail] = useState<PurchaseOrderDetail | null>(null);
  const [isUploadingBill, setIsUploadingBill] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const [companyRes, customerRes, supplierRes, brokerRes, poRes] = await Promise.all([
        fetch(`${apiBaseUrl}/companies`),
        fetch(`${apiBaseUrl}/customers`),
        fetch(`${apiBaseUrl}/suppliers`),
        fetch(`${apiBaseUrl}/brokers`),
        fetch(`${apiBaseUrl}/purchase-orders`),
      ]);

      if (!companyRes.ok) throw new Error(`Failed to load companies (${companyRes.status})`);
      if (!customerRes.ok) throw new Error(`Failed to load customers (${customerRes.status})`);
      if (!supplierRes.ok) throw new Error(`Failed to load suppliers (${supplierRes.status})`);
      if (!brokerRes.ok) throw new Error(`Failed to load brokers (${brokerRes.status})`);
      if (!poRes.ok) throw new Error(`Failed to load purchase orders (${poRes.status})`);

      setCompanies((await companyRes.json()) as Company[]);
      setCustomers((await customerRes.json()) as Customer[]);
      setSuppliers((await supplierRes.json()) as Supplier[]);
      setBrokers((await brokerRes.json()) as Broker[]);
      setPurchaseOrders((await poRes.json()) as PurchaseOrder[]);
    };

    setIsLoading(true);
    load().catch((loadError) => setError(loadError instanceof Error ? loadError.message : "Unable to load billing form"))
      .finally(() => setIsLoading(false));
  }, []);

  const availablePurchaseOrders = useMemo(() => purchaseOrders.filter((po) => {
    const companyMatch = !form.companyId || String(po.companyId) === form.companyId;
    const supplierMatch = !form.supplierId || String(po.supplierId) === form.supplierId;
    return companyMatch && supplierMatch;
  }), [purchaseOrders, form.companyId, form.supplierId]);

  const companyCustomers = customers.filter((customer) => !form.companyId || String(customer.companyId ?? "") === form.companyId);
  const companySuppliers = suppliers.filter((supplier) => !form.companyId || String(supplier.companyId ?? "") === form.companyId);
  const companyBrokers = brokers.filter((broker) => !form.companyId || String(broker.companyId ?? "") === form.companyId);

  const totalAmount = toNumber(form.totalAmount);
  const paidAmount = Math.min(toNumber(form.paidAmount), totalAmount);
  const balanceAmount = Number((totalAmount - paidAmount).toFixed(2));
  const paymentStatus = paidAmount <= 0 ? "Pending" : balanceAmount <= 0 ? "Paid" : "Partial";

  const brokerageAmount = useMemo(() => {
    const value = toNumber(form.brokerageValue);
    if (!form.brokerageType) return 0;
    if (form.brokerageType === "PERCENT") return Number(((totalAmount * value) / 100).toFixed(2));
    return Number(value.toFixed(2));
  }, [form.brokerageType, form.brokerageValue, totalAmount]);

  const handleChange = (field: keyof BillingForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleBillUpload = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    setIsUploadingBill(true);
    setError(null);

    try {
      const response = await fetch(`${apiBaseUrl}/billing/attachments`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.message ?? "Unable to upload bill file");
      }

      const payload = (await response.json()) as { url: string };
      setForm((current) => ({ ...current, originalBillAttachmentUrl: payload.url }));
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Unable to upload bill file");
    } finally {
      setIsUploadingBill(false);
    }
  };

  useEffect(() => {
    if (form.billType !== "PURCHASE" || !form.purchaseOrderId) {
      setSelectedPoDetail(null);
      return;
    }

    const loadPoDetail = async () => {
      const response = await fetch(`${apiBaseUrl}/purchase-orders/${form.purchaseOrderId}`);
      if (!response.ok) throw new Error(`Failed to load PO details (${response.status})`);
      const detail = (await response.json()) as PurchaseOrderDetail;
      setSelectedPoDetail(detail);
      setForm((current) => ({
        ...current,
        totalAmount: current.totalAmount || String(toNumber(detail.totalAmount)),
        transportCharges: String(toNumber(detail.transportCharges)),
        otherCharges: String(toNumber(detail.otherCharges)),
      }));
    };

    loadPoDetail().catch((loadError) => {
      setSelectedPoDetail(null);
      setError(loadError instanceof Error ? loadError.message : "Unable to load PO detail");
    });
  }, [form.billType, form.purchaseOrderId]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    setError(null);

    try {
      if (!invoiceNumberPattern.test(form.invoiceNumber.trim())) throw new Error("Invoice number must use letters, numbers, - or /");
      if (!form.companyId) throw new Error("Company is required");
      if (form.billType === "SALE" && !form.customerId) throw new Error("Customer is required");
      if (form.billType === "PURCHASE" && !form.supplierId) throw new Error("Supplier is required");
      if (totalAmount <= 0) throw new Error("Total amount must be greater than zero");
      if (paidAmount < 0 || paidAmount > totalAmount) throw new Error("Paid amount must be between 0 and total amount");

      const response = await fetch(`${apiBaseUrl}/billing`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceNumber: form.invoiceNumber.trim().toUpperCase(),
          invoiceDate: form.invoiceDate,
          dueDate: form.dueDate || null,
          billType: form.billType,
          companyId: Number(form.companyId),
          customerId: form.billType === "SALE" && form.customerId ? Number(form.customerId) : null,
          supplierId: form.billType === "PURCHASE" && form.supplierId ? Number(form.supplierId) : null,
          purchaseOrderId: form.billType === "PURCHASE" && form.purchaseOrderId ? Number(form.purchaseOrderId) : null,
          totalAmount,
          gstAmount: toNumber(form.gstAmount),
          transportCharges: toNumber(form.transportCharges),
          otherCharges: toNumber(form.otherCharges),
          paidAmount,
          brokerId: form.brokerId ? Number(form.brokerId) : null,
          brokerageType: form.brokerageType || null,
          brokerageValue: toNumber(form.brokerageValue),
          originalBillAttachmentUrl: form.originalBillAttachmentUrl.trim() || null,
          originalBillAmount: toNumber(form.originalBillAmount),
          journalNarration: form.journalNarration.trim() || null,
          status: form.status,
          paymentStatus,
          notes: form.notes.trim() || null,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.message ?? "Unable to create billing entry");
      }

      router.push("/billing");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to create billing entry");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ProtectedPage>
      <div className="mx-auto max-w-6xl space-y-6 px-6 py-8">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-blue-600">Finance</p>
            <h1 className="mt-2 text-3xl font-bold text-slate-900">New Billing / Purchase Register Entry</h1>
          </div>
          <Link href="/billing" className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">Back to list</Link>
        </div>

        {isLoading ? <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">Loading form...</div> : (
          <form onSubmit={handleSubmit} className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2 text-sm font-medium text-slate-700"><span>Invoice number</span><input required value={form.invoiceNumber} onChange={(e) => handleChange("invoiceNumber", e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2.5" /></label>
              <label className="space-y-2 text-sm font-medium text-slate-700"><span>Bill type</span><select value={form.billType} onChange={(e) => setForm((c) => ({ ...c, billType: e.target.value as "SALE" | "PURCHASE", customerId: "", supplierId: "", purchaseOrderId: "" }))} className="w-full rounded-xl border border-slate-300 px-3 py-2.5"><option value="SALE">Sales Invoice</option><option value="PURCHASE">Purchase Bill</option></select></label>
              <label className="space-y-2 text-sm font-medium text-slate-700"><span>Company</span><select required value={form.companyId} onChange={(e) => setForm((c) => ({ ...c, companyId: e.target.value, customerId: "", supplierId: "", purchaseOrderId: "", brokerId: "" }))} className="w-full rounded-xl border border-slate-300 px-3 py-2.5"><option value="">Select company</option>{companies.map((company) => <option key={company.id} value={company.id}>{company.parentCompany ? `${company.parentCompany.name} / ${company.name}` : company.name}</option>)}</select></label>
              <label className="space-y-2 text-sm font-medium text-slate-700"><span>Invoice date</span><input required type="date" value={form.invoiceDate} onChange={(e) => handleChange("invoiceDate", e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2.5" /></label>

              {form.billType === "SALE" ? (
                <label className="space-y-2 text-sm font-medium text-slate-700 md:col-span-2"><span>Customer</span><select required value={form.customerId} onChange={(e) => handleChange("customerId", e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2.5" disabled={!form.companyId}><option value="">Select customer</option>{companyCustomers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
              ) : (
                <>
                  <label className="space-y-2 text-sm font-medium text-slate-700"><span>Supplier</span><select required value={form.supplierId} onChange={(e) => setForm((c) => ({ ...c, supplierId: e.target.value, purchaseOrderId: "", totalAmount: "", transportCharges: "0", otherCharges: "0" }))} className="w-full rounded-xl border border-slate-300 px-3 py-2.5" disabled={!form.companyId}><option value="">Select supplier</option>{companySuppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
                  <label className="space-y-2 text-sm font-medium text-slate-700"><span>Purchase order</span><select value={form.purchaseOrderId} onChange={(e) => handleChange("purchaseOrderId", e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2.5" disabled={!form.companyId || !form.supplierId}><option value="">Select PO (optional)</option>{availablePurchaseOrders.map((po) => <option key={po.id} value={po.id}>{po.poNumber}</option>)}</select></label>
                  {selectedPoDetail ? (
                    <div className="md:col-span-2 rounded-xl border border-cyan-200 bg-cyan-50 p-3 text-sm text-cyan-800">
                      PO Total: Rs {toNumber(selectedPoDetail.purchaseRegisterSummary?.poTotalAmount ?? selectedPoDetail.totalAmount).toLocaleString("en-IN")} | Billed: Rs {toNumber(selectedPoDetail.purchaseRegisterSummary?.totalBilledAmount).toLocaleString("en-IN")} | Remaining: Rs {toNumber(selectedPoDetail.purchaseRegisterSummary?.remainingToBillAmount).toLocaleString("en-IN")} | Register Entries: {selectedPoDetail.purchaseRegisterSummary?.entryCount ?? 0}
                    </div>
                  ) : null}
                </>
              )}

              <label className="space-y-2 text-sm font-medium text-slate-700"><span>Total amount</span><input required type="number" min="0.01" step="0.01" value={form.totalAmount} onChange={(e) => handleChange("totalAmount", e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2.5" /></label>
              <label className="space-y-2 text-sm font-medium text-slate-700"><span>Paid amount (partial/full)</span><input type="number" min="0" step="0.01" value={form.paidAmount} onChange={(e) => handleChange("paidAmount", e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2.5" /></label>
              <label className="space-y-2 text-sm font-medium text-slate-700"><span>GST amount</span><input type="number" min="0" step="0.01" value={form.gstAmount} onChange={(e) => handleChange("gstAmount", e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2.5" /></label>
              <label className="space-y-2 text-sm font-medium text-slate-700"><span>Transport charges</span><input type="number" min="0" step="0.01" value={form.transportCharges} onChange={(e) => handleChange("transportCharges", e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2.5" /></label>
              <label className="space-y-2 text-sm font-medium text-slate-700"><span>Other charges</span><input type="number" min="0" step="0.01" value={form.otherCharges} onChange={(e) => handleChange("otherCharges", e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2.5" /></label>

              <label className="space-y-2 text-sm font-medium text-slate-700"><span>Broker</span><select value={form.brokerId} onChange={(e) => handleChange("brokerId", e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2.5"><option value="">No broker</option>{companyBrokers.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></label>
              <label className="space-y-2 text-sm font-medium text-slate-700"><span>Brokerage type</span><select value={form.brokerageType} onChange={(e) => handleChange("brokerageType", e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2.5"><option value="">None</option><option value="PERCENT">Percent</option><option value="FIXED">Fixed</option></select></label>
              <label className="space-y-2 text-sm font-medium text-slate-700"><span>Brokerage value</span><input type="number" min="0" step="0.01" value={form.brokerageValue} onChange={(e) => handleChange("brokerageValue", e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2.5" /></label>
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">Brokerage amount: Rs {brokerageAmount.toLocaleString("en-IN")}</div>

              <label className="space-y-2 text-sm font-medium text-slate-700 md:col-span-2">
                <span>Original bill attachment (upload or URL)</span>
                <div className="flex flex-col gap-2 md:flex-row">
                  <input type="file" accept=".pdf,.png,.jpg,.jpeg,.webp" onChange={(e) => { const file = e.target.files?.[0]; if (file) { void handleBillUpload(file); } }} className="w-full rounded-xl border border-slate-300 px-3 py-2.5" />
                  <input value={form.originalBillAttachmentUrl} onChange={(e) => handleChange("originalBillAttachmentUrl", e.target.value)} placeholder="https://... or /api/billing/attachments/..." className="w-full rounded-xl border border-slate-300 px-3 py-2.5" />
                </div>
                {isUploadingBill ? <p className="text-xs text-blue-700">Uploading bill...</p> : null}
              </label>
              <label className="space-y-2 text-sm font-medium text-slate-700"><span>Original bill amount</span><input type="number" min="0" step="0.01" value={form.originalBillAmount} onChange={(e) => handleChange("originalBillAmount", e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2.5" /></label>
              <label className="space-y-2 text-sm font-medium text-slate-700"><span>Due date</span><input type="date" value={form.dueDate} onChange={(e) => handleChange("dueDate", e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2.5" /></label>

              {form.billType === "PURCHASE" ? <label className="space-y-2 text-sm font-medium text-slate-700 md:col-span-2"><span>Journal narration (PO billing)</span><textarea value={form.journalNarration} onChange={(e) => handleChange("journalNarration", e.target.value)} className="min-h-20 w-full rounded-xl border border-slate-300 px-3 py-2.5" /></label> : null}

              <label className="space-y-2 text-sm font-medium text-slate-700"><span>Status</span><select value={form.status} onChange={(e) => handleChange("status", e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2.5"><option value="Draft">Draft</option><option value="Issued">Issued</option><option value="Paid">Paid</option><option value="Overdue">Overdue</option></select></label>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">Payment status: <strong>{paymentStatus}</strong> | Balance: Rs {balanceAmount.toLocaleString("en-IN")}</div>
              <label className="space-y-2 text-sm font-medium text-slate-700 md:col-span-2"><span>Notes</span><textarea value={form.notes} onChange={(e) => handleChange("notes", e.target.value)} className="min-h-24 w-full rounded-xl border border-slate-300 px-3 py-2.5" /></label>
            </div>

            {error ? <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}

            <div className="flex gap-3">
              <button type="submit" disabled={isSaving} className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60">{isSaving ? "Saving..." : "Save billing"}</button>
              <Link href="/billing" className="rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancel</Link>
            </div>
          </form>
        )}
      </div>
    </ProtectedPage>
  );
}
