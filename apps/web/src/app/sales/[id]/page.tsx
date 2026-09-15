"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ProtectedPage } from "@/components/protected-page";
import { FormEvent, useEffect, useMemo, useState } from "react";

type Company = {
  id: number;
  name: string;
  gstNumber?: string;
};

type Customer = {
  id: number;
  name: string;
  phone?: string;
};

type Product = {
  id: number;
  name: string;
  sku: string;
};

type SaleItem = {
  id: number;
  productId: number;
  productName: string;
  quantity: number | string;
  unitPrice: number | string;
  lineTotal: number | string;
  product?: Product | null;
};

type SalePayment = {
  id: number;
  receiptNumber: string;
  paymentType: string;
  paymentReference?: string;
  amount: number | string;
  paymentDateTime: string;
  notes?: string;
};

type Sale = {
  id: number;
  invoiceNumber: string;
  saleDate: string;
  saleDateTime?: string;
  productName: string;
  quantity: number | string;
  unitPrice: number | string;
  totalAmount: number | string;
  paidAmount?: number | string;
  balanceAmount?: number | string;
  paymentType?: string;
  paymentStatus?: string;
  company?: Company | null;
  customer?: Customer | null;
  items?: SaleItem[];
  payments?: SalePayment[];
};

type SavedBill = {
  invoiceNumber: string;
  saleDateTime: string;
  companyName: string;
  customerName: string;
  items: Array<{
    productName: string;
    sku: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
  }>;
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  paymentType: string;
  paymentStatus: string;
};

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api";

function toNumber(value: number | string | null | undefined): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function buildSavedBill(sale: Sale): SavedBill {
  const items = sale.items?.length
    ? sale.items.map((item) => ({
        productName: item.productName,
        sku: item.product?.sku ?? "-",
        quantity: toNumber(item.quantity),
        unitPrice: toNumber(item.unitPrice),
        lineTotal: toNumber(item.lineTotal),
      }))
    : [
        {
          productName: sale.productName,
          sku: "-",
          quantity: toNumber(sale.quantity),
          unitPrice: toNumber(sale.unitPrice),
          lineTotal: Number((toNumber(sale.quantity) * toNumber(sale.unitPrice)).toFixed(2)),
        },
      ];

  const computedTotal = Number(items.reduce((sum, item) => sum + item.lineTotal, 0).toFixed(2));
  const paidAmount = toNumber(sale.paidAmount);
  const totalAmount = toNumber(sale.totalAmount || computedTotal);

  return {
    invoiceNumber: sale.invoiceNumber,
    saleDateTime: sale.saleDateTime ?? sale.saleDate,
    companyName: sale.company?.name ?? "-",
    customerName: sale.customer?.name ?? "Walk-in",
    items,
    totalAmount,
    paidAmount,
    balanceAmount: Number((totalAmount - paidAmount).toFixed(2)),
    paymentType: sale.paymentType || "Cash",
    paymentStatus: sale.paymentStatus || "Pending",
  };
}

function printBillMemo(bill: SavedBill): void {
  const printWindow = window.open("", "_blank", "width=900,height=700");
  if (!printWindow) {
    return;
  }

  const formatAmount = (value: number) => `Rs ${value.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
  const subtotal = bill.items.reduce((sum, line) => sum + line.lineTotal, 0);

  const printableHtml = `
    <html>
      <head>
        <title>Invoice ${bill.invoiceNumber}</title>
        <style>
          @page { size: A4; margin: 10mm; }
          body { font-family: "Segoe UI", Arial, sans-serif; margin: 0; color: #0f172a; padding: 10mm; }
          .invoice { width: 190mm; margin: 0 auto; border: 1px solid #cbd5e1; border-radius: 14px; overflow: hidden; }
          .topbar { display:flex; justify-content:space-between; align-items:center; padding:20px 24px; background:linear-gradient(130deg,#ecfeff 0%,#f8fafc 55%,#e2e8f0 100%); border-bottom:1px solid #cbd5e1; }
          .section { padding:20px 24px; }
          .grid { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
          .box { border:1px solid #cbd5e1; border-radius:12px; padding:12px; }
          .label { margin:0; color:#64748b; font-size:11px; letter-spacing:0.07em; text-transform:uppercase; }
          .value { margin:5px 0 0; font-weight:600; font-size:14px; }
          table { width:100%; border-collapse:collapse; margin-top:14px; border:1px solid #cbd5e1; }
          th, td { border-bottom:1px solid #e2e8f0; padding:10px 12px; text-align:left; font-size:13px; }
          th { background:#f8fafc; color:#334155; font-size:12px; text-transform:uppercase; letter-spacing:0.05em; }
          .summary { display:flex; justify-content:flex-end; margin-top:14px; }
          .summary-card { min-width:320px; border:1px solid #cbd5e1; border-radius:12px; overflow:hidden; }
          .row { display:flex; justify-content:space-between; padding:10px 12px; font-size:13px; border-bottom:1px solid #e2e8f0; }
          .row:last-child { border-bottom:none; background:#f0fdfa; font-size:16px; font-weight:700; }
        </style>
      </head>
      <body>
        <div class="invoice">
          <div class="topbar">
            <div>
              <p style="margin:0;color:#475569;font-size:12px;text-transform:uppercase;letter-spacing:0.08em;">NexaERP</p>
              <h1 style="margin:2px 0 0;font-size:20px;">Tax Invoice</h1>
            </div>
            <div style="text-align:right;">
              <h2 style="margin:0;font-size:18px;">${bill.invoiceNumber}</h2>
              <p style="margin:4px 0 0;color:#475569;font-size:13px;">${new Date(bill.saleDateTime).toLocaleString()}</p>
            </div>
          </div>

          <div class="section">
            <div class="grid">
              <div class="box">
                <p class="label">Billed By</p>
                <p class="value">${bill.companyName}</p>
              </div>
              <div class="box">
                <p class="label">Billed To</p>
                <p class="value">${bill.customerName}</p>
              </div>
            </div>

            <table>
              <thead>
                <tr><th>Item</th><th>SKU</th><th>Qty</th><th>Unit Price</th><th>Line Total</th></tr>
              </thead>
              <tbody>
                ${bill.items
                  .map(
                    (line) =>
                      `<tr><td>${line.productName}</td><td>${line.sku}</td><td>${line.quantity}</td><td>${formatAmount(
                        line.unitPrice,
                      )}</td><td>${formatAmount(line.lineTotal)}</td></tr>`,
                  )
                  .join("")}
              </tbody>
            </table>

            <div class="summary">
              <div class="summary-card">
                <div class="row"><span>Subtotal</span><span>${formatAmount(subtotal)}</span></div>
                <div class="row"><span>Received</span><span>${formatAmount(bill.paidAmount)}</span></div>
                <div class="row"><span>Balance Due</span><span>${formatAmount(bill.balanceAmount)}</span></div>
                <div class="row"><span>Grand Total</span><span>${formatAmount(bill.totalAmount)}</span></div>
              </div>
            </div>
          </div>
        </div>
        <script>window.print(); window.onafterprint = () => window.close();</script>
      </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(printableHtml);
  printWindow.document.close();
}

export default function SaleDetailsPage() {
  const params = useParams<{ id: string }>();
  const saleId = Number(params.id);

  const [sale, setSale] = useState<Sale | null>(null);
  const [paymentForm, setPaymentForm] = useState({
    amount: "",
    paymentType: "Cash",
    paymentReference: "",
    notes: "",
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSale = async () => {
    const response = await fetch(`${apiBaseUrl}/sales/${saleId}`);
    if (!response.ok) {
      throw new Error(`Failed to load sale (${response.status})`);
    }
    setSale((await response.json()) as Sale);
  };

  useEffect(() => {
    if (!Number.isFinite(saleId)) {
      setError("Invalid sale id");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    loadSale()
      .catch((loadError) => {
        setError(loadError instanceof Error ? loadError.message : "Unable to load bill details");
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [saleId]);

  const readonlyBill = useMemo(() => (sale ? buildSavedBill(sale) : null), [sale]);

  const handleRecordPayment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!sale) {
      return;
    }

    setIsRecording(true);
    setError(null);

    try {
      const amount = toNumber(paymentForm.amount);
      if (amount <= 0) {
        throw new Error("Enter a valid receipt amount");
      }

      if (readonlyBill && amount > readonlyBill.balanceAmount) {
        throw new Error("Receipt amount cannot exceed current due amount");
      }

      if (
        (paymentForm.paymentType === "UPI" ||
          paymentForm.paymentType === "Bank Transfer" ||
          paymentForm.paymentType === "Card") &&
        !paymentForm.paymentReference.trim()
      ) {
        throw new Error("Reference is mandatory for UPI, Bank Transfer, and Card receipts");
      }

      const response = await fetch(`${apiBaseUrl}/sales/${sale.id}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount,
          paymentType: paymentForm.paymentType,
          paymentReference: paymentForm.paymentReference.trim() || undefined,
          notes: paymentForm.notes.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.message ?? "Unable to record payment");
      }

      setSale((await response.json()) as Sale);
      setPaymentForm({ amount: "", paymentType: paymentForm.paymentType, paymentReference: "", notes: "" });
    } catch (recordError) {
      setError(recordError instanceof Error ? recordError.message : "Unable to record payment");
    } finally {
      setIsRecording(false);
    }
  };

  return (
    <ProtectedPage>
      <div className="mx-auto max-w-6xl space-y-6 px-6 py-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-blue-600">Sales</p>
            <h1 className="mt-2 text-3xl font-bold text-slate-900">Bill Details</h1>
            <p className="mt-1 text-sm text-amber-700">Invoice items are read-only. Only payment receipts can be added.</p>
          </div>

          <div className="flex gap-2">
            <Link
              href="/sales"
              className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Back to List
            </Link>
            <Link
              href="/sales/new"
              className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700"
            >
              New Billing
            </Link>
          </div>
        </div>

        {isLoading ? <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">Loading bill...</div> : null}
        {error ? <div className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</div> : null}

        {readonlyBill && !isLoading && !error ? (
          <>
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2 text-sm font-medium text-slate-700">
                  <span>Invoice number</span>
                  <input value={readonlyBill.invoiceNumber} disabled className="w-full rounded-xl border border-slate-300 bg-slate-100 px-3 py-2.5" />
                </label>
                <label className="space-y-2 text-sm font-medium text-slate-700">
                  <span>Date & time</span>
                  <input value={new Date(readonlyBill.saleDateTime).toLocaleString()} disabled className="w-full rounded-xl border border-slate-300 bg-slate-100 px-3 py-2.5" />
                </label>
                <label className="space-y-2 text-sm font-medium text-slate-700">
                  <span>Company</span>
                  <input value={readonlyBill.companyName} disabled className="w-full rounded-xl border border-slate-300 bg-slate-100 px-3 py-2.5" />
                </label>
                <label className="space-y-2 text-sm font-medium text-slate-700">
                  <span>Customer</span>
                  <input value={readonlyBill.customerName} disabled className="w-full rounded-xl border border-slate-300 bg-slate-100 px-3 py-2.5" />
                </label>
                <label className="space-y-2 text-sm font-medium text-slate-700">
                  <span>Payment type</span>
                  <input value={readonlyBill.paymentType} disabled className="w-full rounded-xl border border-slate-300 bg-slate-100 px-3 py-2.5" />
                </label>
                <label className="space-y-2 text-sm font-medium text-slate-700">
                  <span>Payment status</span>
                  <input value={readonlyBill.paymentStatus} disabled className="w-full rounded-xl border border-slate-300 bg-slate-100 px-3 py-2.5" />
                </label>
              </div>

              <div className="mt-5 overflow-x-auto rounded-xl border border-slate-200">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-700">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Item</th>
                      <th className="px-4 py-3 font-semibold">SKU</th>
                      <th className="px-4 py-3 font-semibold">Qty</th>
                      <th className="px-4 py-3 font-semibold">Rate</th>
                      <th className="px-4 py-3 font-semibold">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {readonlyBill.items.map((item) => (
                      <tr key={`${item.sku}-${item.productName}-${item.quantity}`} className="border-t border-slate-200">
                        <td className="px-4 py-3 text-slate-700">{item.productName}</td>
                        <td className="px-4 py-3 text-slate-600">{item.sku}</td>
                        <td className="px-4 py-3 text-slate-600">{item.quantity}</td>
                        <td className="px-4 py-3 text-slate-600">Rs {item.unitPrice.toLocaleString("en-IN")}</td>
                        <td className="px-4 py-3 text-slate-800">Rs {item.lineTotal.toLocaleString("en-IN")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-slate-500">Line items are locked after invoice creation.</p>
                <div className="flex flex-wrap items-center gap-3 text-sm">
                  <strong className="text-slate-900">Total: Rs {readonlyBill.totalAmount.toLocaleString("en-IN")}</strong>
                  <strong className="text-emerald-700">Received: Rs {readonlyBill.paidAmount.toLocaleString("en-IN")}</strong>
                  <strong className="text-amber-700">Due: Rs {readonlyBill.balanceAmount.toLocaleString("en-IN")}</strong>
                  <button
                    type="button"
                    onClick={() => printBillMemo(readonlyBill)}
                    className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
                  >
                    Reprint Invoice
                  </button>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold text-slate-900">Payment Receipts</h2>

              <form className="mt-4 grid gap-4 md:grid-cols-2" onSubmit={handleRecordPayment}>
                <label className="space-y-2 text-sm font-medium text-slate-700">
                  <span>Receipt amount</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={paymentForm.amount}
                    onChange={(event) => setPaymentForm((current) => ({ ...current, amount: event.target.value }))}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none transition focus:border-blue-500"
                    placeholder="0.00"
                    required
                  />
                </label>

                <label className="space-y-2 text-sm font-medium text-slate-700">
                  <span>Payment type</span>
                  <select
                    value={paymentForm.paymentType}
                    onChange={(event) => setPaymentForm((current) => ({ ...current, paymentType: event.target.value }))}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none transition focus:border-blue-500"
                  >
                    <option value="Cash">Cash</option>
                    <option value="Card">Card</option>
                    <option value="UPI">UPI</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Credit">Credit</option>
                  </select>
                </label>

                <label className="space-y-2 text-sm font-medium text-slate-700">
                  <span>Reference (UTR/Txn ID)</span>
                  <input
                    value={paymentForm.paymentReference}
                    onChange={(event) =>
                      setPaymentForm((current) => ({ ...current, paymentReference: event.target.value }))
                    }
                    className="w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none transition focus:border-blue-500"
                    placeholder="Optional"
                    required={paymentForm.paymentType === "UPI" || paymentForm.paymentType === "Bank Transfer" || paymentForm.paymentType === "Card"}
                  />
                </label>

                <label className="space-y-2 text-sm font-medium text-slate-700">
                  <span>Note</span>
                  <input
                    value={paymentForm.notes}
                    onChange={(event) => setPaymentForm((current) => ({ ...current, notes: event.target.value }))}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none transition focus:border-blue-500"
                    placeholder="Optional"
                  />
                </label>

                <div className="md:col-span-2">
                  <button
                    type="submit"
                    disabled={isRecording || readonlyBill.balanceAmount <= 0}
                    className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {readonlyBill.balanceAmount <= 0 ? "Invoice fully paid" : isRecording ? "Recording..." : "Record Receipt"}
                  </button>
                </div>
              </form>

              <div className="mt-5 overflow-x-auto rounded-xl border border-slate-200">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-700">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Receipt</th>
                      <th className="px-4 py-3 font-semibold">Date/Time</th>
                      <th className="px-4 py-3 font-semibold">Mode</th>
                      <th className="px-4 py-3 font-semibold">Reference</th>
                      <th className="px-4 py-3 font-semibold">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(sale?.payments ?? []).length ? (
                      (sale?.payments ?? []).map((payment) => (
                        <tr key={payment.id} className="border-t border-slate-200">
                          <td className="px-4 py-3 font-medium text-slate-800">{payment.receiptNumber}</td>
                          <td className="px-4 py-3 text-slate-600">{new Date(payment.paymentDateTime).toLocaleString()}</td>
                          <td className="px-4 py-3 text-slate-600">{payment.paymentType}</td>
                          <td className="px-4 py-3 text-slate-600">{payment.paymentReference || "-"}</td>
                          <td className="px-4 py-3 text-slate-800">Rs {toNumber(payment.amount).toLocaleString("en-IN")}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td className="px-4 py-4 text-slate-500" colSpan={5}>
                          No receipts recorded yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        ) : null}
      </div>
    </ProtectedPage>
  );
}
