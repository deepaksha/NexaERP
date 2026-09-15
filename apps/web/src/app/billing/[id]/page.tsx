"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ProtectedPage } from "@/components/protected-page";
import { FormEvent, useEffect, useMemo, useState } from "react";

type Company = { id: number; name: string; parentCompany?: { id: number; name: string } | null };
type Customer = { id: number; name: string; companyId?: number };
type Supplier = { id: number; name: string; companyId?: number };
type Broker = { id: number; name: string; companyId?: number };
type PurchaseOrder = { id: number; poNumber: string; companyId: number; supplierId: number; totalAmount?: number | string; transportCharges?: number | string; otherCharges?: number | string };
type PurchaseOrderSummary = { poNumber?: string; totalAmount: number; billedAmount: number; remainingAmount: number };

type BillingRecord = {
  id: number;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate?: string;
  billType?: "SALE" | "PURCHASE";
  companyId?: number;
  customerId?: number;
  supplierId?: number;
  purchaseOrderId?: number;
  totalAmount: number | string;
  gstAmount: number | string;
  transportCharges?: number | string;
  otherCharges?: number | string;
  paidAmount?: number | string;
  brokerId?: number;
  brokerageType?: "PERCENT" | "FIXED";
  brokerageValue?: number | string;
  originalBillAttachmentUrl?: string;
  originalBillAmount?: number | string;
  journalNarration?: string;
  status?: string;
  notes?: string;
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

function toNumber(value: number | string | null | undefined): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export default function BillingDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const billingId = Number(params.id);

  const [companies, setCompanies] = useState<Company[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [brokers, setBrokers] = useState<Broker[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [purchaseOrderSummary, setPurchaseOrderSummary] = useState<PurchaseOrderSummary | null>(null);
  const [isUploadingBill, setIsUploadingBill] = useState(false);
  const [form, setForm] = useState<BillingForm>({
    invoiceNumber: "",
    invoiceDate: "",
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
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      const [companyRes, customerRes, supplierRes, brokerRes, purchaseOrderRes, billingRes] = await Promise.all([
        fetch(`${apiBaseUrl}/companies`),
        fetch(`${apiBaseUrl}/customers`),
        fetch(`${apiBaseUrl}/suppliers`),
        fetch(`${apiBaseUrl}/brokers`),
        fetch(`${apiBaseUrl}/purchase-orders`),
        fetch(`${apiBaseUrl}/billing/${billingId}`),
      ]);

      if (!companyRes.ok) throw new Error(`Failed to load companies (${companyRes.status})`);
      if (!customerRes.ok) throw new Error(`Failed to load customers (${customerRes.status})`);
      if (!supplierRes.ok) throw new Error(`Failed to load suppliers (${supplierRes.status})`);
      if (!brokerRes.ok) throw new Error(`Failed to load brokers (${brokerRes.status})`);
      if (!purchaseOrderRes.ok) throw new Error(`Failed to load purchase orders (${purchaseOrderRes.status})`);
      if (!billingRes.ok) throw new Error(`Failed to load billing (${billingRes.status})`);

      const billing = (await billingRes.json()) as BillingRecord;
      setCompanies((await companyRes.json()) as Company[]);
      setCustomers((await customerRes.json()) as Customer[]);
      setSuppliers((await supplierRes.json()) as Supplier[]);
      setBrokers((await brokerRes.json()) as Broker[]);
      setPurchaseOrders((await purchaseOrderRes.json()) as PurchaseOrder[]);
      setForm({
        invoiceNumber: billing.invoiceNumber,
        invoiceDate: billing.invoiceDate,
        dueDate: billing.dueDate ?? "",
        billType: billing.billType === "PURCHASE" ? "PURCHASE" : "SALE",
        companyId: billing.companyId ? String(billing.companyId) : "",
        customerId: billing.customerId ? String(billing.customerId) : "",
        supplierId: billing.supplierId ? String(billing.supplierId) : "",
        purchaseOrderId: billing.purchaseOrderId ? String(billing.purchaseOrderId) : "",
        totalAmount: String(toNumber(billing.totalAmount)),
        gstAmount: String(toNumber(billing.gstAmount)),
        transportCharges: String(toNumber(billing.transportCharges)),
        otherCharges: String(toNumber(billing.otherCharges)),
        paidAmount: String(toNumber(billing.paidAmount)),
        brokerId: billing.brokerId ? String(billing.brokerId) : "",
        brokerageType: billing.brokerageType ?? "",
        brokerageValue: String(toNumber(billing.brokerageValue)),
        originalBillAttachmentUrl: billing.originalBillAttachmentUrl ?? "",
        originalBillAmount: String(toNumber(billing.originalBillAmount)),
        journalNarration: billing.journalNarration ?? "",
        status: billing.status ?? "Draft",
        notes: billing.notes ?? "",
      });
    };

    setIsLoading(true);
    setError(null);
    loadData().catch((loadError) => setError(loadError instanceof Error ? loadError.message : "Unable to load billing"))
      .finally(() => setIsLoading(false));
  }, [billingId]);

  useEffect(() => {
    if (form.billType !== "PURCHASE" || !form.purchaseOrderId) {
      setPurchaseOrderSummary(null);
      return;
    }

    let isCancelled = false;

    const loadPurchaseOrderSummary = async () => {
      try {
        const response = await fetch(`${apiBaseUrl}/purchase-orders/${form.purchaseOrderId}`);
        if (!response.ok) {
          throw new Error(`Failed to load purchase order (${response.status})`);
        }

        const payload = (await response.json()) as {
          poNumber?: string;
          totalAmount?: number | string;
          purchaseRegisterSummary?: {
            billedAmount?: number | string;
            remainingAmount?: number | string;
          };
        };

        if (!isCancelled) {
          const total = toNumber(payload.totalAmount);
          const billed = toNumber(payload.purchaseRegisterSummary?.billedAmount);
          setPurchaseOrderSummary({
            poNumber: payload.poNumber,
            totalAmount: total,
            billedAmount: billed,
            remainingAmount: toNumber(payload.purchaseRegisterSummary?.remainingAmount ?? Math.max(total - billed, 0)),
          });
        }
      } catch {
        if (!isCancelled) {
          const po = purchaseOrders.find((item) => String(item.id) === form.purchaseOrderId);
          const total = toNumber(po?.totalAmount);
          setPurchaseOrderSummary({
            poNumber: po?.poNumber,
            totalAmount: total,
            billedAmount: 0,
            remainingAmount: total,
          });
        }
      }
    };

    void loadPurchaseOrderSummary();
    return () => {
      isCancelled = true;
    };
  }, [form.billType, form.purchaseOrderId, purchaseOrders]);

  const availablePurchaseOrders = useMemo(() => purchaseOrders.filter((po) => {
    const companyMatch = !form.companyId || String(po.companyId) === form.companyId;
    const supplierMatch = !form.supplierId || String(po.supplierId) === form.supplierId;
    return companyMatch && supplierMatch;
  }), [purchaseOrders, form.companyId, form.supplierId]);

  const handleChange = (field: keyof BillingForm, value: string) => setForm((current) => ({ ...current, [field]: value }));

  const companyCustomers = customers.filter((customer) => !form.companyId || String(customer.companyId ?? "") === form.companyId);
  const companySuppliers = suppliers.filter((supplier) => !form.companyId || String(supplier.companyId ?? "") === form.companyId);
  const companyBrokers = brokers.filter((broker) => !form.companyId || String(broker.companyId ?? "") === form.companyId);

  const totalAmount = toNumber(form.totalAmount);
  const paidAmount = Math.min(toNumber(form.paidAmount), totalAmount);
  const balanceAmount = Number((totalAmount - paidAmount).toFixed(2));
  const isPostedEntry = form.status === "Issued" || form.status === "Paid" || form.status === "Overdue";
  const paymentStatus = paidAmount <= 0 ? "Pending" : balanceAmount <= 0 ? "Paid" : "Partial";
  const brokerageAmount = form.brokerageType === "PERCENT"
    ? Number(((totalAmount * toNumber(form.brokerageValue)) / 100).toFixed(2))
    : toNumber(form.brokerageValue);

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

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    setError(null);

    try {
      if (isPostedEntry) throw new Error("Posted billing entries cannot be modified. Pass correction using a new entry.");
      if (!invoiceNumberPattern.test(form.invoiceNumber.trim())) throw new Error("Invoice number must use letters, numbers, - or /");
      if (!form.companyId) throw new Error("Company is required");
      if (form.billType === "SALE" && !form.customerId) throw new Error("Customer is required");
      if (form.billType === "PURCHASE" && !form.supplierId) throw new Error("Supplier is required");
      if (totalAmount <= 0) throw new Error("Total amount must be greater than zero");

      const response = await fetch(`${apiBaseUrl}/billing/${billingId}`, {
        method: "PATCH",
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
        throw new Error(payload.message ?? "Unable to update billing entry");
      }

      router.push("/billing");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to update billing entry");
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
            <h1 className="mt-2 text-3xl font-bold text-slate-900">Billing / Purchase Register Entry</h1>
          </div>
          <Link href="/billing" className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">Back to list</Link>
        </div>

        {isPostedEntry ? <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">This entry is posted and cannot be modified. Pass correction through a fresh contra/correction entry for proper accounting trail.</div> : null}

        {isLoading ? <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">Loading billing...</div> : (
          <form onSubmit={handleSubmit} className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2 text-sm font-medium text-slate-700"><span>Invoice number</span><input required value={form.invoiceNumber} onChange={(e) => handleChange("invoiceNumber", e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2.5" disabled={isPostedEntry} /></label>
              <label className="space-y-2 text-sm font-medium text-slate-700"><span>Bill type</span><select value={form.billType} onChange={(e) => setForm((c) => ({ ...c, billType: e.target.value as "SALE" | "PURCHASE", customerId: "", supplierId: "", purchaseOrderId: "" }))} className="w-full rounded-xl border border-slate-300 px-3 py-2.5" disabled={isPostedEntry}><option value="SALE">Sales Invoice</option><option value="PURCHASE">Purchase Bill</option></select></label>
              <label className="space-y-2 text-sm font-medium text-slate-700"><span>Company</span><select required value={form.companyId} onChange={(e) => setForm((c) => ({ ...c, companyId: e.target.value, customerId: "", supplierId: "", purchaseOrderId: "", brokerId: "" }))} className="w-full rounded-xl border border-slate-300 px-3 py-2.5" disabled={isPostedEntry}><option value="">Select company</option>{companies.map((company) => <option key={company.id} value={company.id}>{company.parentCompany ? `${company.parentCompany.name} / ${company.name}` : company.name}</option>)}</select></label>
              <label className="space-y-2 text-sm font-medium text-slate-700"><span>Invoice date</span><input required type="date" value={form.invoiceDate} onChange={(e) => handleChange("invoiceDate", e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2.5" disabled={isPostedEntry} /></label>

              {form.billType === "SALE" ? (
                <label className="space-y-2 text-sm font-medium text-slate-700 md:col-span-2"><span>Customer</span><select required value={form.customerId} onChange={(e) => handleChange("customerId", e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2.5" disabled={!form.companyId || isPostedEntry}><option value="">Select customer</option>{companyCustomers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
              ) : (
                <>
                  <label className="space-y-2 text-sm font-medium text-slate-700"><span>Supplier</span><select required value={form.supplierId} onChange={(e) => setForm((c) => ({ ...c, supplierId: e.target.value, purchaseOrderId: "" }))} className="w-full rounded-xl border border-slate-300 px-3 py-2.5" disabled={!form.companyId || isPostedEntry}><option value="">Select supplier</option>{companySuppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
                  <label className="space-y-2 text-sm font-medium text-slate-700"><span>Purchase order</span><select value={form.purchaseOrderId} onChange={(e) => handleChange("purchaseOrderId", e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2.5" disabled={!form.companyId || !form.supplierId || isPostedEntry}><option value="">Select PO (optional)</option>{availablePurchaseOrders.map((po) => <option key={po.id} value={po.id}>{po.poNumber}</option>)}</select></label>
                </>
              )}

              <label className="space-y-2 text-sm font-medium text-slate-700"><span>Total amount</span><input required type="number" min="0.01" step="0.01" value={form.totalAmount} onChange={(e) => handleChange("totalAmount", e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2.5" disabled={isPostedEntry} /></label>
              <label className="space-y-2 text-sm font-medium text-slate-700"><span>Paid amount (partial/full)</span><input type="number" min="0" step="0.01" value={form.paidAmount} onChange={(e) => handleChange("paidAmount", e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2.5" disabled={isPostedEntry} /></label>
              <label className="space-y-2 text-sm font-medium text-slate-700"><span>GST amount</span><input type="number" min="0" step="0.01" value={form.gstAmount} onChange={(e) => handleChange("gstAmount", e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2.5" disabled={isPostedEntry} /></label>
              <label className="space-y-2 text-sm font-medium text-slate-700"><span>Transport charges</span><input type="number" min="0" step="0.01" value={form.transportCharges} onChange={(e) => handleChange("transportCharges", e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2.5" disabled={isPostedEntry} /></label>
              <label className="space-y-2 text-sm font-medium text-slate-700"><span>Other charges</span><input type="number" min="0" step="0.01" value={form.otherCharges} onChange={(e) => handleChange("otherCharges", e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2.5" disabled={isPostedEntry} /></label>
              <label className="space-y-2 text-sm font-medium text-slate-700"><span>Broker</span><select value={form.brokerId} onChange={(e) => handleChange("brokerId", e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2.5" disabled={isPostedEntry}><option value="">No broker</option>{companyBrokers.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></label>
              <label className="space-y-2 text-sm font-medium text-slate-700"><span>Brokerage type</span><select value={form.brokerageType} onChange={(e) => handleChange("brokerageType", e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2.5" disabled={isPostedEntry}><option value="">None</option><option value="PERCENT">Percent</option><option value="FIXED">Fixed</option></select></label>
              <label className="space-y-2 text-sm font-medium text-slate-700"><span>Brokerage value</span><input type="number" min="0" step="0.01" value={form.brokerageValue} onChange={(e) => handleChange("brokerageValue", e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2.5" disabled={isPostedEntry} /></label>
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">Brokerage amount: Rs {brokerageAmount.toLocaleString("en-IN")}</div>
              {form.billType === "PURCHASE" && form.purchaseOrderId && purchaseOrderSummary ? (
                <div className="rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm text-indigo-800 md:col-span-2">
                  PO {purchaseOrderSummary.poNumber ?? "selected"} | Amount: Rs {purchaseOrderSummary.totalAmount.toLocaleString("en-IN")} | Billed: Rs {purchaseOrderSummary.billedAmount.toLocaleString("en-IN")} | Remaining: Rs {purchaseOrderSummary.remainingAmount.toLocaleString("en-IN")}
                </div>
              ) : null}
              <label className="space-y-2 text-sm font-medium text-slate-700 md:col-span-2"><span>Original bill attachment (upload or URL)</span><div className="flex flex-col gap-2 md:flex-row"><input type="file" accept=".pdf,.png,.jpg,.jpeg,.webp" onChange={(e) => { const file = e.target.files?.[0]; if (file) { void handleBillUpload(file); } }} className="w-full rounded-xl border border-slate-300 px-3 py-2.5" disabled={isPostedEntry} /><input value={form.originalBillAttachmentUrl} onChange={(e) => handleChange("originalBillAttachmentUrl", e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2.5" disabled={isPostedEntry} /></div>{isUploadingBill ? <p className="text-xs text-blue-700">Uploading bill...</p> : null}{form.originalBillAttachmentUrl ? <a href={form.originalBillAttachmentUrl} target="_blank" rel="noreferrer" className="text-xs font-medium text-blue-700 hover:underline">Open attached bill</a> : null}</label>
              <label className="space-y-2 text-sm font-medium text-slate-700"><span>Original bill amount</span><input type="number" min="0" step="0.01" value={form.originalBillAmount} onChange={(e) => handleChange("originalBillAmount", e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2.5" disabled={isPostedEntry} /></label>
              <label className="space-y-2 text-sm font-medium text-slate-700"><span>Due date</span><input type="date" value={form.dueDate} onChange={(e) => handleChange("dueDate", e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2.5" disabled={isPostedEntry} /></label>
              {form.billType === "PURCHASE" ? <label className="space-y-2 text-sm font-medium text-slate-700 md:col-span-2"><span>Journal narration (PO register posting)</span><textarea value={form.journalNarration} onChange={(e) => handleChange("journalNarration", e.target.value)} className="min-h-20 w-full rounded-xl border border-slate-300 px-3 py-2.5" disabled={isPostedEntry} /></label> : null}
              <label className="space-y-2 text-sm font-medium text-slate-700"><span>Status</span><select value={form.status} onChange={(e) => handleChange("status", e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2.5" disabled={isPostedEntry}><option value="Draft">Draft</option><option value="Issued">Issued</option><option value="Paid">Paid</option><option value="Overdue">Overdue</option></select></label>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">Payment status: <strong>{paymentStatus}</strong> | Balance: Rs {balanceAmount.toLocaleString("en-IN")}</div>
              <label className="space-y-2 text-sm font-medium text-slate-700 md:col-span-2"><span>Notes</span><textarea value={form.notes} onChange={(e) => handleChange("notes", e.target.value)} className="min-h-24 w-full rounded-xl border border-slate-300 px-3 py-2.5" disabled={isPostedEntry} /></label>
            </div>

            {error ? <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}

            <div className="flex gap-3">
              <button type="submit" disabled={isSaving || isPostedEntry} className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60">{isSaving ? "Updating..." : "Update billing"}</button>
              <Link href="/billing" className="rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancel</Link>
            </div>
          </form>
        )}
      </div>
    </ProtectedPage>
  );
}
