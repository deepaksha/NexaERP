"use client";

import Link from "next/link";
import { ProtectedPage } from "@/components/protected-page";
import { useEffect, useMemo, useState } from "react";

type Company = {
  id: number;
  name: string;
  gstNumber?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  parentCompany?: { id: number; name: string } | null;
};

type Customer = {
  id: number;
  name: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  companyId?: number;
};

type Product = {
  id: number;
  name: string;
  sku: string;
  stock: number | string;
  companyId?: number;
};

type SaleItem = {
  id: number;
  productId: number;
  productName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  product?: Product | null;
};

type Sale = {
  id: number;
  invoiceNumber: string;
  saleDate: string;
  saleDateTime?: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number | string;
  paidAmount?: number | string;
  balanceAmount?: number | string;
  paymentType?: string;
  paymentStatus?: string;
  company?: Company | null;
  customer?: Customer | null;
  items?: SaleItem[];
};

type BillLineItem = {
  productId: string;
  quantity: string;
  unitPrice: string;
};

type SavedBill = {
  invoiceNumber: string;
  saleDateTime: string;
  companyName: string;
  companyGst?: string;
  companyPhone?: string;
  companyEmail?: string;
  companyAddress?: string;
  customerName: string;
  customerPhone?: string;
  customerAddress?: string;
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
const invoiceNumberPattern = /^[A-Z0-9][A-Z0-9/-]{2,29}$/i;

function toNumber(value: number | string | null | undefined): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function generateInvoiceNumber(): string {
  const stamp = Date.now().toString().slice(-8);
  return `BILL-${stamp}`;
}

function nowDateTimeLocal(): string {
  const current = new Date();
  current.setMinutes(current.getMinutes() - current.getTimezoneOffset());
  return current.toISOString().slice(0, 16);
}

function createLineItem(): BillLineItem {
  return {
    productId: "",
    quantity: "1",
    unitPrice: "",
  };
}

function toDateOnly(dateTimeLocal: string): string {
  return (dateTimeLocal || "").slice(0, 10);
}

const createEmptyForm = (companyId = "") => ({
  invoiceNumber: generateInvoiceNumber(),
  saleDateTime: nowDateTimeLocal(),
  companyId,
  customerId: "",
  paymentType: "Cash",
  paymentReference: "",
  paymentNotes: "",
  receivedAmount: "",
  items: [createLineItem()],
});

export default function NewBillingPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("all");
  const [form, setForm] = useState(createEmptyForm());
  const [savedBill, setSavedBill] = useState<SavedBill | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCompanies = async () => {
    const response = await fetch(`${apiBaseUrl}/companies`);
    if (!response.ok) throw new Error(`Failed to load companies (${response.status})`);
    setCompanies((await response.json()) as Company[]);
  };

  const loadCustomers = async () => {
    const url = new URL(`${apiBaseUrl}/customers`);
    if (selectedCompanyId !== "all") url.searchParams.set("companyId", selectedCompanyId);

    const response = await fetch(url.toString());
    if (!response.ok) throw new Error(`Failed to load customers (${response.status})`);

    const data = (await response.json()) as Customer[];
    setCustomers(data);
  };

  const loadProducts = async () => {
    const url = new URL(`${apiBaseUrl}/products`);
    if (selectedCompanyId !== "all") url.searchParams.set("companyId", selectedCompanyId);

    const response = await fetch(url.toString());
    if (!response.ok) throw new Error(`Failed to load products (${response.status})`);

    const data = (await response.json()) as Product[];
    setProducts(data);

    setForm((current) => ({
      ...current,
      items: current.items.map((line) => {
        if (!line.productId) {
          return line;
        }
        return data.some((product) => String(product.id) === line.productId)
          ? line
          : { ...line, productId: "", unitPrice: "" };
      }),
    }));
  };

  useEffect(() => {
    setError(null);

    Promise.all([loadCompanies(), loadCustomers(), loadProducts()]).catch((loadError) => {
      setError(loadError instanceof Error ? loadError.message : "Unable to load billing data");
    });
  }, [selectedCompanyId]);

  const handleChange = (
    field: Exclude<keyof ReturnType<typeof createEmptyForm>, "items">,
    value: string,
  ) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const fetchApplicableRate = async (productId: string, rateDate: string) => {
    const productNumericId = Number(productId);
    if (!Number.isInteger(productNumericId) || productNumericId <= 0) {
      return null;
    }

    const url = new URL(`${apiBaseUrl}/product-rates/latest-map`);
    url.searchParams.set("productIds", String(productNumericId));
    if (rateDate) {
      url.searchParams.set("rateDate", rateDate);
    }

    const response = await fetch(url.toString());
    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as Record<string, { rate: number; rateDate: string }>;
    const matched = payload[String(productNumericId)] ?? payload[productId];
    if (!matched) {
      return null;
    }

    return Number(matched.rate);
  };

  const updateLineItem = (index: number, updates: Partial<BillLineItem>) => {
    setForm((current) => ({
      ...current,
      items: current.items.map((line, lineIndex) => {
        if (lineIndex !== index) {
          return line;
        }

        const next = { ...line, ...updates };
        if (updates.productId !== undefined) {
          const selected = products.find((product) => String(product.id) === updates.productId);
          if (selected) {
            next.unitPrice = "";
          }
        }
        return next;
      }),
    }));

    if (updates.productId !== undefined && updates.productId) {
      const rateDate = toDateOnly(form.saleDateTime);
      void fetchApplicableRate(updates.productId, rateDate).then((rateValue) => {
        if (rateValue === null) {
          return;
        }
        setForm((current) => ({
          ...current,
          items: current.items.map((line, lineIndex) =>
            lineIndex === index ? { ...line, unitPrice: String(toNumber(rateValue)) } : line,
          ),
        }));
      });
    }
  };

  const addLineItem = () => {
    setForm((current) => ({ ...current, items: [...current.items, createLineItem()] }));
  };

  const removeLineItem = (index: number) => {
    setForm((current) => {
      const remaining = current.items.filter((_, lineIndex) => lineIndex !== index);
      return {
        ...current,
        items: remaining.length > 0 ? remaining : [createLineItem()],
      };
    });
  };

  const linePreview = useMemo(() => {
    return form.items.map((line) => {
      const quantity = toNumber(line.quantity);
      const unitPrice = toNumber(line.unitPrice);
      const lineTotal = Number((quantity * unitPrice).toFixed(2));
      const product = products.find((item) => String(item.id) === line.productId);
      return {
        ...line,
        product,
        quantity,
        unitPrice,
        lineTotal,
      };
    });
  }, [form.items, products]);

  const totalAmount = useMemo(
    () => Number(linePreview.reduce((sum, line) => sum + line.lineTotal, 0).toFixed(2)),
    [linePreview],
  );

  const receivedAmount = useMemo(() => {
    const numeric = toNumber(form.receivedAmount);
    if (numeric <= 0) return 0;
    return Number(Math.min(numeric, totalAmount).toFixed(2));
  }, [form.receivedAmount, totalAmount]);

  const balanceAmount = useMemo(() => Number((totalAmount - receivedAmount).toFixed(2)), [totalAmount, receivedAmount]);

  const derivedStatus = useMemo(() => {
    if (receivedAmount <= 0) return "Pending";
    if (balanceAmount <= 0) return "Paid";
    return "Partial";
  }, [receivedAmount, balanceAmount]);

  const availableProducts = useMemo(
    () => products.filter((product) => !form.companyId || String(product.companyId ?? "") === form.companyId),
    [form.companyId, products],
  );

  useEffect(() => {
    const activeProductIds = form.items.map((line) => line.productId).filter(Boolean);
    if (!activeProductIds.length) {
      return;
    }

    const rateDate = toDateOnly(form.saleDateTime);
    const refreshRates = async () => {
      const url = new URL(`${apiBaseUrl}/product-rates/latest-map`);
      url.searchParams.set("productIds", activeProductIds.join(","));
      url.searchParams.set("rateDate", rateDate);
      const response = await fetch(url.toString());
      if (!response.ok) {
        return;
      }

      const payload = (await response.json()) as Record<string, { rate: number }>;
      setForm((current) => ({
        ...current,
        items: current.items.map((line) => {
          const matched = payload[line.productId];
          if (!matched) {
            return line;
          }
          return { ...line, unitPrice: String(toNumber(matched.rate)) };
        }),
      }));
    };

    void refreshRates();
  }, [form.saleDateTime, form.companyId]);

  const printBillMemo = (bill: SavedBill) => {
    const printWindow = window.open("", "_blank", "width=900,height=700");
    if (!printWindow) {
      setError("Unable to open print window. Please allow popups.");
      return;
    }

    const formatAmount = (value: number) => `Rs ${value.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
    const isPaid = bill.paymentStatus.toLowerCase() === "paid";
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
            .chip { display:inline-block; font-size:11px; letter-spacing:0.08em; padding:5px 10px; border-radius:999px; background:#ecfdf5; color:#166534; border:1px solid #bbf7d0; margin-bottom:8px; }
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
                <span class="chip">${isPaid ? "Paid" : bill.paymentStatus}</span>
                <h2 style="margin:0;font-size:18px;">${bill.invoiceNumber}</h2>
                <p style="margin:4px 0 0;color:#475569;font-size:13px;">${new Date(bill.saleDateTime).toLocaleString()}</p>
              </div>
            </div>

            <div class="section">
              <div class="grid">
                <div class="box">
                  <p class="label">Billed By</p>
                  <p class="value">${bill.companyName}</p>
                  ${bill.companyGst ? `<p class="value">GST: ${bill.companyGst}</p>` : ""}
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
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    setError(null);

    try {
      if (!form.companyId) {
        throw new Error("Please select a company");
      }

      const invoiceNumber = form.invoiceNumber.trim();
      if (!invoiceNumberPattern.test(invoiceNumber)) {
        throw new Error("Invoice number must be 3-30 characters and use only letters, numbers, - or /");
      }

      if (!form.saleDateTime) {
        throw new Error("Sale date and time is required");
      }

      const parsedDate = new Date(form.saleDateTime);
      if (Number.isNaN(parsedDate.getTime())) {
        throw new Error("Invalid sale date and time");
      }

      if (form.paymentType !== "Credit" && receivedAmount <= 0) {
        throw new Error("Received amount is required for non-credit invoices");
      }

      if (receivedAmount > totalAmount) {
        throw new Error("Received amount cannot exceed bill total");
      }

      if ((form.paymentType === "UPI" || form.paymentType === "Bank Transfer" || form.paymentType === "Card") && !form.paymentReference.trim()) {
        throw new Error("Payment reference is mandatory for UPI, Bank Transfer, and Card");
      }

      const validItems = linePreview.filter((line) => line.product?.id && line.quantity > 0);
      if (!validItems.length) {
        throw new Error("Please add at least one valid product line");
      }

      const dateTime = form.saleDateTime || nowDateTimeLocal();
      const dateOnly = dateTime.slice(0, 10);
      const response = await fetch(`${apiBaseUrl}/sales`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceNumber,
          saleDate: dateOnly,
          saleDateTime: new Date(dateTime).toISOString(),
          productId: validItems[0].product?.id,
          productName: validItems[0].product?.name ?? "",
          quantity: validItems.reduce((sum, line) => sum + line.quantity, 0),
          unitPrice: validItems[0].unitPrice,
          totalAmount,
          customerId: form.customerId ? Number(form.customerId) : null,
          companyId: form.companyId ? Number(form.companyId) : null,
          paymentType: form.paymentType,
          receivedAmount,
          paymentReference: form.paymentReference.trim() || undefined,
          paymentNotes: form.paymentNotes.trim() || undefined,
          items: validItems.map((line) => ({
            productId: line.product?.id,
            productName: line.product?.name,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
          })),
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.message ?? "Unable to create sale");
      }

      const createdSale = (await response.json()) as Sale;
      const selectedCompany = companies.find((company) => String(company.id) === form.companyId);
      const selectedCustomer = customers.find((customer) => String(customer.id) === form.customerId);

      setSavedBill({
        invoiceNumber: createdSale.invoiceNumber,
        saleDateTime: createdSale.saleDateTime ?? new Date().toISOString(),
        companyName: selectedCompany?.name ?? "-",
        companyGst: selectedCompany?.gstNumber,
        companyPhone: selectedCompany?.phone,
        companyEmail: selectedCompany?.email,
        companyAddress: [selectedCompany?.address, selectedCompany?.city, selectedCompany?.state, selectedCompany?.country]
          .filter(Boolean)
          .join(", "),
        customerName: selectedCustomer?.name ?? "Walk-in",
        customerPhone: selectedCustomer?.phone,
        customerAddress: [selectedCustomer?.address, selectedCustomer?.city, selectedCustomer?.state, selectedCustomer?.country]
          .filter(Boolean)
          .join(", "),
        items: validItems.map((line) => ({
          productName: line.product?.name ?? "Item",
          sku: line.product?.sku ?? "-",
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          lineTotal: line.lineTotal,
        })),
        totalAmount: toNumber(createdSale.totalAmount),
        paidAmount: toNumber(createdSale.paidAmount),
        balanceAmount: toNumber(createdSale.balanceAmount),
        paymentType: createdSale.paymentType || form.paymentType,
        paymentStatus: createdSale.paymentStatus || derivedStatus,
      });

      setForm(createEmptyForm(form.companyId));
      await loadProducts();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to create sale");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ProtectedPage>
      <div className="mx-auto max-w-7xl space-y-6 px-6 py-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-blue-600">Revenue</p>
            <h1 className="mt-2 text-3xl font-bold text-slate-900">New Billing</h1>
            <p className="mt-1 text-sm text-slate-500">Capture full, partial, or zero payment at invoice creation.</p>
          </div>

          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
            <select
              value={selectedCompanyId}
              onChange={(event) => {
                const nextValue = event.target.value;
                setSelectedCompanyId(nextValue);
                setForm((current) => ({ ...current, companyId: nextValue === "all" ? "" : nextValue }));
              }}
              className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none transition focus:border-blue-500 md:w-64"
            >
              <option value="all">All companies</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.parentCompany ? `${company.parentCompany.name} / ${company.name}` : company.name}
                </option>
              ))}
            </select>
            <Link
              href="/sales"
              className="rounded-xl border border-slate-300 px-4 py-2.5 text-center text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Open Sales List
            </Link>
          </div>
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900">Create bill memo</h2>
          <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-2 text-sm font-medium text-slate-700 sm:col-span-2">
                <span>Invoice number</span>
                <input
                  required
                  value={form.invoiceNumber}
                  onChange={(event) => handleChange("invoiceNumber", event.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none transition focus:border-blue-500"
                  placeholder="SAL-2001"
                  pattern="[A-Za-z0-9][A-Za-z0-9/-]{2,29}"
                  title="Use 3-30 chars: letters, numbers, - or /"
                />
              </label>

              <label className="space-y-2 text-sm font-medium text-slate-700">
                <span>Date & time</span>
                <input
                  type="datetime-local"
                  required
                  value={form.saleDateTime}
                  onChange={(event) => handleChange("saleDateTime", event.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none transition focus:border-blue-500"
                />
              </label>

              <label className="space-y-2 text-sm font-medium text-slate-700">
                <span>Company</span>
                <select
                  value={form.companyId}
                  onChange={(event) => {
                    const nextCompanyId = event.target.value;
                    setForm((current) => ({
                      ...current,
                      companyId: nextCompanyId,
                      customerId: "",
                      items: current.items.map((line) => ({ ...line, productId: "", unitPrice: "" })),
                    }));
                    setSelectedCompanyId(nextCompanyId || "all");
                  }}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none transition focus:border-blue-500"
                >
                  <option value="">Select company</option>
                  {companies.map((company) => (
                    <option key={company.id} value={company.id}>
                      {company.parentCompany ? `${company.parentCompany.name} / ${company.name}` : company.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-2 text-sm font-medium text-slate-700">
                <span>Customer</span>
                <select
                  value={form.customerId}
                  onChange={(event) => handleChange("customerId", event.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none transition focus:border-blue-500"
                  disabled={!form.companyId}
                >
                  <option value="">Select customer</option>
                  {customers
                    .filter((customer) => !form.companyId || String(customer.companyId ?? "") === form.companyId)
                    .map((customer) => (
                      <option key={customer.id} value={customer.id}>
                        {customer.name}
                      </option>
                    ))}
                </select>
              </label>

              <div className="space-y-3 sm:col-span-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-800">Bill items</span>
                  <button
                    type="button"
                    onClick={addLineItem}
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-blue-500 hover:text-blue-600"
                  >
                    Add line
                  </button>
                </div>

                {linePreview.map((line, index) => (
                  <div key={`${index}-${line.productId}`} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <div className="grid gap-3 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto]">
                      <select
                        value={line.productId}
                        onChange={(event) => updateLineItem(index, { productId: event.target.value })}
                        className="w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-blue-500"
                        disabled={!form.companyId}
                      >
                        <option value="">Select product</option>
                        {availableProducts.map((product) => (
                          <option key={product.id} value={product.id}>
                            {product.name} ({product.sku}) - Stock {toNumber(product.stock)}
                          </option>
                        ))}
                      </select>

                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={line.quantity}
                        onChange={(event) => updateLineItem(index, { quantity: event.target.value })}
                        className="w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-blue-500"
                        placeholder="Qty"
                      />

                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={line.unitPrice}
                        onChange={(event) => updateLineItem(index, { unitPrice: event.target.value })}
                        className="w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-blue-500"
                        placeholder="Rate"
                      />

                      <div className="w-full min-w-0 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700">
                        Rs {line.lineTotal.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                      </div>

                      <button
                        type="button"
                        onClick={() => removeLineItem(index)}
                        className="w-full rounded-lg border border-rose-200 px-3 py-2 text-xs font-medium text-rose-600 transition hover:bg-rose-50 md:w-auto"
                      >
                        Remove
                      </button>
                    </div>
                    <p className="mt-2 text-xs text-slate-500">
                      Stock available: {line.product ? toNumber(line.product.stock) : 0}
                    </p>
                  </div>
                ))}
              </div>

              <label className="space-y-2 text-sm font-medium text-slate-700">
                <span>Payment type</span>
                <select
                  value={form.paymentType}
                  onChange={(event) => handleChange("paymentType", event.target.value)}
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
                <span>Received now</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.receivedAmount}
                  onChange={(event) => handleChange("receivedAmount", event.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none transition focus:border-blue-500"
                  placeholder="0.00"
                  required={form.paymentType !== "Credit"}
                />
              </label>

              <label className="space-y-2 text-sm font-medium text-slate-700">
                <span>Payment reference (UTR/Cheque/Txn ID)</span>
                <input
                  value={form.paymentReference}
                  onChange={(event) => handleChange("paymentReference", event.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none transition focus:border-blue-500"
                  placeholder="Optional"
                />
              </label>

              <label className="space-y-2 text-sm font-medium text-slate-700">
                <span>Payment note</span>
                <input
                  value={form.paymentNotes}
                  onChange={(event) => handleChange("paymentNotes", event.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none transition focus:border-blue-500"
                  placeholder="Optional"
                />
              </label>

              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 sm:col-span-2">
                <p className="text-xs uppercase tracking-[0.18em] text-emerald-700">Bill summary</p>
                <div className="mt-2 grid gap-2 text-sm text-emerald-900 sm:grid-cols-4">
                  <p><span className="font-semibold">Total:</span> Rs {totalAmount.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</p>
                  <p><span className="font-semibold">Received:</span> Rs {receivedAmount.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</p>
                  <p><span className="font-semibold">Balance:</span> Rs {balanceAmount.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</p>
                  <p><span className="font-semibold">Status:</span> {derivedStatus}</p>
                </div>
              </div>
            </div>

            {error ? <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}

            <button
              type="submit"
              disabled={isSaving}
              className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? "Saving..." : "Save bill"}
            </button>
          </form>

          {savedBill ? (
            <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-col gap-3 border-b border-slate-200 bg-gradient-to-r from-cyan-50 via-slate-50 to-emerald-50 px-4 py-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Latest invoice memo</p>
                  <h3 className="mt-1 text-lg font-bold text-slate-900">{savedBill.invoiceNumber}</h3>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${savedBill.paymentStatus.toLowerCase() === "paid" ? "bg-emerald-100 text-emerald-700" : savedBill.paymentStatus.toLowerCase() === "partial" ? "bg-amber-100 text-amber-700" : "bg-slate-200 text-slate-700"}`}>
                  {savedBill.paymentStatus}
                </span>
              </div>

              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="w-full p-4">
                  <div className="grid gap-2 text-xs text-slate-600 md:grid-cols-4">
                    <p><span className="font-semibold text-slate-800">Customer:</span> {savedBill.customerName}</p>
                    <p><span className="font-semibold text-slate-800">Date:</span> {new Date(savedBill.saleDateTime).toLocaleString()}</p>
                    <p><span className="font-semibold text-slate-800">Payment:</span> {savedBill.paymentType}</p>
                    <p><span className="font-semibold text-slate-800">Balance:</span> Rs {savedBill.balanceAmount.toLocaleString("en-IN")}</p>
                  </div>

                  <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200">
                    <table className="min-w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-700">
                        <tr>
                          <th className="px-3 py-2 font-semibold">Item</th>
                          <th className="px-3 py-2 font-semibold">SKU</th>
                          <th className="px-3 py-2 font-semibold">Qty</th>
                          <th className="px-3 py-2 font-semibold">Rate</th>
                          <th className="px-3 py-2 font-semibold">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {savedBill.items.map((line) => (
                          <tr key={`${savedBill.invoiceNumber}-${line.sku}-${line.productName}`} className="border-t border-slate-200 text-slate-600">
                            <td className="px-3 py-2">{line.productName}</td>
                            <td className="px-3 py-2">{line.sku}</td>
                            <td className="px-3 py-2">{line.quantity}</td>
                            <td className="px-3 py-2">Rs {line.unitPrice.toLocaleString("en-IN")}</td>
                            <td className="px-3 py-2">Rs {line.lineTotal.toLocaleString("en-IN")}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <p className="mt-3 text-right text-base font-bold text-slate-900">
                    Total: Rs {savedBill.totalAmount.toLocaleString("en-IN")} | Received: Rs {savedBill.paidAmount.toLocaleString("en-IN")} | Due: Rs {savedBill.balanceAmount.toLocaleString("en-IN")}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => printBillMemo(savedBill)}
                  className="mx-4 mb-4 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 md:mb-0"
                >
                  Print Invoice
                </button>
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </ProtectedPage>
  );
}
