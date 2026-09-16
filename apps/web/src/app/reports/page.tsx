"use client";

import { ProtectedPage } from "@/components/protected-page";
import { useEffect, useMemo, useState } from "react";

type Company = {
  id: number;
  name: string;
  parentCompany?: { id: number; name: string } | null;
};

type ReportMetrics = {
  totalRevenue: number;
  totalPurchases: number;
  totalBilled: number;
  totalGst: number;
  receivables: number;
  netCashFlow: number;
  inventoryIn: number;
  inventoryOut: number;
  customerCount: number;
  invoiceCount: number;
};

type MonthlySnapshotRow = {
  month: string;
  sales: number;
  purchases: number;
  billed: number;
};

type ReportSummaryResponse = {
  metrics: ReportMetrics;
  monthlySnapshot: MonthlySnapshotRow[];
  generatedAt: string;
  scope: {
    companyId: number | null;
    startDate: string | null;
    endDate: string | null;
  };
};

type DetailedTransactionsResponse = {
  rows: Array<{
    source: "SALE" | "PURCHASE" | "SALES_INVOICE" | "PURCHASE_BILL";
    date: string;
    reference: string;
    companyId: number | null;
    counterparty: string;
    paymentStatus: string;
    amount: number;
    gstAmount: number;
    notes: string;
  }>;
  generatedAt: string;
  scope: {
    companyId: number | null;
    startDate: string | null;
    endDate: string | null;
  };
};

type LedgerRow = DetailedTransactionsResponse["rows"][number];
type LedgerGroupBy = "none" | "date" | "party" | "paymentStatus";

type LedgerGroup = {
  key: string;
  label: string;
  rows: LedgerRow[];
  totalAmount: number;
};

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api";

function toNumber(value: number | string | null | undefined): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function currency(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

function readableDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function companyLabel(company: Company): string {
  return company.parentCompany ? `${company.parentCompany.name} / ${company.name}` : company.name;
}

function toDateInputValue(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function getThisMonthRange(): { start: string; end: string } {
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), 1);
  return { start: toDateInputValue(start), end: toDateInputValue(today) };
}

function getLastMonthRange(): { start: string; end: string } {
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const end = new Date(today.getFullYear(), today.getMonth(), 0);
  return { start: toDateInputValue(start), end: toDateInputValue(end) };
}

function getLast90DaysRange(): { start: string; end: string } {
  const today = new Date();
  const start = new Date(today);
  start.setDate(today.getDate() - 89);
  return { start: toDateInputValue(start), end: toDateInputValue(today) };
}

function normalizePaymentStatus(value: string | null | undefined): string {
  const status = (value ?? "").trim().toLowerCase();
  if (!status) return "pending";
  if (status === "paid") return "paid";
  if (status === "partial") return "partial";
  if (status === "overdue") return "overdue";
  return "pending";
}

function filterLedgerRows(rows: LedgerRow[], search: string, paymentStatus: string): LedgerRow[] {
  const searchValue = search.trim().toLowerCase();
  return rows.filter((row) => {
    const paymentMatch = paymentStatus === "all" || normalizePaymentStatus(row.paymentStatus) === paymentStatus;
    if (!paymentMatch) {
      return false;
    }

    if (!searchValue) {
      return true;
    }

    const text = `${row.reference} ${row.counterparty} ${row.notes} ${row.source}`.toLowerCase();
    return text.includes(searchValue);
  });
}

function groupLedgerRows(rows: LedgerRow[], groupBy: LedgerGroupBy): LedgerGroup[] {
  if (groupBy === "none") {
    return [{ key: "all", label: "All entries", rows, totalAmount: rows.reduce((sum, row) => sum + toNumber(row.amount), 0) }];
  }

  const map = new Map<string, LedgerGroup>();

  for (const row of rows) {
    let key = "";
    let label = "";

    if (groupBy === "date") {
      key = row.date;
      label = readableDate(row.date);
    } else if (groupBy === "party") {
      key = (row.counterparty || "Unknown party").trim().toLowerCase();
      label = row.counterparty || "Unknown party";
    } else {
      key = normalizePaymentStatus(row.paymentStatus);
      label = (row.paymentStatus || "Pending").trim() || "Pending";
    }

    const existing = map.get(key);
    if (existing) {
      existing.rows.push(row);
      existing.totalAmount = Number((existing.totalAmount + toNumber(row.amount)).toFixed(2));
    } else {
      map.set(key, {
        key,
        label,
        rows: [row],
        totalAmount: Number(toNumber(row.amount).toFixed(2)),
      });
    }
  }

  const groups = Array.from(map.values());

  if (groupBy === "date") {
    groups.sort((left, right) => new Date(right.key).getTime() - new Date(left.key).getTime());
  } else {
    groups.sort((left, right) => right.totalAmount - left.totalAmount || left.label.localeCompare(right.label));
  }

  return groups;
}

export default function ReportsPage() {
  const defaultRange = getThisMonthRange();
  const lastMonthRange = getLastMonthRange();
  const last90DaysRange = getLast90DaysRange();

  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("all");
  const [startDate, setStartDate] = useState(defaultRange.start);
  const [endDate, setEndDate] = useState(defaultRange.end);
  const [summary, setSummary] = useState<ReportSummaryResponse | null>(null);
  const [transactions, setTransactions] = useState<DetailedTransactionsResponse["rows"]>([]);
  const [salesSearch, setSalesSearch] = useState("");
  const [salesPaymentFilter, setSalesPaymentFilter] = useState("all");
  const [salesGroupBy, setSalesGroupBy] = useState<LedgerGroupBy>("none");
  const [purchaseSearch, setPurchaseSearch] = useState("");
  const [purchasePaymentFilter, setPurchasePaymentFilter] = useState("all");
  const [purchaseGroupBy, setPurchaseGroupBy] = useState<LedgerGroupBy>("none");
  const [isLoading, setIsLoading] = useState(true);
  const [isExportingDetails, setIsExportingDetails] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadReports = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const companyResponse = await fetch(`${apiBaseUrl}/companies`);
        if (!companyResponse.ok) {
          throw new Error(`Failed to load companies (${companyResponse.status})`);
        }
        const companyData = (await companyResponse.json()) as Company[];
        setCompanies(companyData);

        const url = new URL(`${apiBaseUrl}/reports/summary`);
        if (selectedCompanyId !== "all") {
          url.searchParams.set("companyId", selectedCompanyId);
        }
        if (startDate) {
          url.searchParams.set("startDate", startDate);
        }
        if (endDate) {
          url.searchParams.set("endDate", endDate);
        }

        const summaryResponse = await fetch(url.toString());
        if (!summaryResponse.ok) {
          throw new Error(`Failed to load reports (${summaryResponse.status})`);
        }

        const transactionsUrl = new URL(`${apiBaseUrl}/reports/transactions`);
        if (selectedCompanyId !== "all") {
          transactionsUrl.searchParams.set("companyId", selectedCompanyId);
        }
        if (startDate) {
          transactionsUrl.searchParams.set("startDate", startDate);
        }
        if (endDate) {
          transactionsUrl.searchParams.set("endDate", endDate);
        }

        const transactionsResponse = await fetch(transactionsUrl.toString());
        if (!transactionsResponse.ok) {
          throw new Error(`Failed to load ledger transactions (${transactionsResponse.status})`);
        }

        setSummary((await summaryResponse.json()) as ReportSummaryResponse);
        const txPayload = (await transactionsResponse.json()) as DetailedTransactionsResponse;
        setTransactions(txPayload.rows);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Failed to load reports");
      } finally {
        setIsLoading(false);
      }
    };

    loadReports();
  }, [endDate, selectedCompanyId, startDate]);

  const metrics = summary?.metrics ?? {
    totalRevenue: 0,
    totalPurchases: 0,
    totalBilled: 0,
    totalGst: 0,
    receivables: 0,
    netCashFlow: 0,
    inventoryIn: 0,
    inventoryOut: 0,
    customerCount: 0,
    invoiceCount: 0,
  };

  const monthlySnapshot = useMemo(() => summary?.monthlySnapshot ?? [], [summary]);
  const salesLedgerRows = useMemo(
    () => transactions.filter((row) => row.source === "SALE" || row.source === "SALES_INVOICE"),
    [transactions],
  );
  const purchaseLedgerRows = useMemo(
    () => transactions.filter((row) => row.source === "PURCHASE" || row.source === "PURCHASE_BILL"),
    [transactions],
  );
  const filteredSalesLedgerRows = useMemo(
    () => filterLedgerRows(salesLedgerRows, salesSearch, salesPaymentFilter),
    [salesLedgerRows, salesSearch, salesPaymentFilter],
  );
  const filteredPurchaseLedgerRows = useMemo(
    () => filterLedgerRows(purchaseLedgerRows, purchaseSearch, purchasePaymentFilter),
    [purchaseLedgerRows, purchaseSearch, purchasePaymentFilter],
  );
  const groupedSalesRows = useMemo(
    () => groupLedgerRows(filteredSalesLedgerRows, salesGroupBy),
    [filteredSalesLedgerRows, salesGroupBy],
  );
  const groupedPurchaseRows = useMemo(
    () => groupLedgerRows(filteredPurchaseLedgerRows, purchaseGroupBy),
    [filteredPurchaseLedgerRows, purchaseGroupBy],
  );

  const activePreset = useMemo(() => {
    if (startDate === defaultRange.start && endDate === defaultRange.end) {
      return "this-month";
    }
    if (startDate === lastMonthRange.start && endDate === lastMonthRange.end) {
      return "last-month";
    }
    if (startDate === last90DaysRange.start && endDate === last90DaysRange.end) {
      return "last-90-days";
    }
    return "custom";
  }, [defaultRange.end, defaultRange.start, endDate, last90DaysRange.end, last90DaysRange.start, lastMonthRange.end, lastMonthRange.start, startDate]);

  const applyPreset = (preset: "this-month" | "last-month" | "last-90-days") => {
    if (preset === "this-month") {
      setStartDate(defaultRange.start);
      setEndDate(defaultRange.end);
      return;
    }

    if (preset === "last-month") {
      setStartDate(lastMonthRange.start);
      setEndDate(lastMonthRange.end);
      return;
    }

    setStartDate(last90DaysRange.start);
    setEndDate(last90DaysRange.end);
  };

  const handleExportCsv = () => {
    if (monthlySnapshot.length === 0) {
      return;
    }

    const rows = [
      ["Month", "Sales", "Purchases", "Billed", "NetCashFlow"],
      ...monthlySnapshot.map((row) => [
        row.month,
        toNumber(row.sales).toFixed(2),
        toNumber(row.purchases).toFixed(2),
        toNumber(row.billed).toFixed(2),
        (toNumber(row.sales) - toNumber(row.purchases)).toFixed(2),
      ]),
    ];

    const csvText = rows.map((row) => row.join(",")).join("\n");
    const blob = new Blob([csvText], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    const suffix = selectedCompanyId === "all" ? "all" : `company-${selectedCompanyId}`;
    anchor.download = `nexaerp-reports-${suffix}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  };

  const escapeCsv = (value: string | number | null | undefined) => {
    const text = String(value ?? "").replace(/"/g, '""');
    return `"${text}"`;
  };

  const handleExportDetailedCsv = async () => {
    setIsExportingDetails(true);
    setError(null);

    try {
      const url = new URL(`${apiBaseUrl}/reports/transactions`);
      if (selectedCompanyId !== "all") {
        url.searchParams.set("companyId", selectedCompanyId);
      }
      if (startDate) {
        url.searchParams.set("startDate", startDate);
      }
      if (endDate) {
        url.searchParams.set("endDate", endDate);
      }

      const response = await fetch(url.toString());
      if (!response.ok) {
        throw new Error(`Failed to export detailed report (${response.status})`);
      }

      const payload = (await response.json()) as DetailedTransactionsResponse;

      if (payload.rows.length === 0) {
        throw new Error("No transactions available for the selected filters");
      }

      const rows = [
        ["Source", "Date", "Reference", "CompanyId", "Counterparty", "PaymentStatus", "Amount", "GSTAmount", "Notes"],
        ...payload.rows.map((row) => [
          escapeCsv(row.source),
          escapeCsv(row.date),
          escapeCsv(row.reference),
          escapeCsv(row.companyId),
          escapeCsv(row.counterparty),
          escapeCsv(row.paymentStatus),
          escapeCsv(toNumber(row.amount).toFixed(2)),
          escapeCsv(toNumber(row.gstAmount).toFixed(2)),
          escapeCsv(row.notes),
        ]),
      ];

      const csvText = rows.map((row) => row.join(",")).join("\n");
      const blob = new Blob([csvText], { type: "text/csv;charset=utf-8;" });
      const fileUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = fileUrl;
      const scopeSuffix = selectedCompanyId === "all" ? "all" : `company-${selectedCompanyId}`;
      const startSuffix = startDate || "any";
      const endSuffix = endDate || "any";
      anchor.download = `nexaerp-transactions-${scopeSuffix}-${startSuffix}-to-${endSuffix}.csv`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(fileUrl);
    } catch (exportError) {
      setError(exportError instanceof Error ? exportError.message : "Failed to export detailed report");
    } finally {
      setIsExportingDetails(false);
    }
  };

  return (
    <ProtectedPage>
      <div className="mx-auto max-w-7xl space-y-6 px-6 py-8">
        <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-cyan-50 p-6 shadow-sm">
          <div className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-cyan-200/30 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-12 left-1/3 h-36 w-36 rounded-full bg-slate-200/40 blur-2xl" />
          <div className="relative flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-700">Insights</p>
              <h1 className="mt-2 text-3xl font-bold text-slate-900">Financial Reports</h1>
              <p className="mt-1 text-sm text-slate-600">Clean snapshot of revenue, cash flow, taxes, and operational ledgers.</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white/80 px-4 py-2 text-xs text-slate-600">
              Generated: {summary?.generatedAt ? readableDate(summary.generatedAt) : "-"}
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
          <div className="flex flex-col gap-4">
            <div className="grid gap-3 md:grid-cols-[1.1fr_auto_auto] md:items-center">
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Scope</p>
                <select
                  value={selectedCompanyId}
                  onChange={(event) => setSelectedCompanyId(event.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-cyan-600"
                >
                  <option value="all">All companies</option>
                  {companies.map((company) => (
                    <option key={company.id} value={company.id}>
                      {companyLabel(company)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">From</p>
                <input
                  type="date"
                  value={startDate}
                  onChange={(event) => setStartDate(event.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-cyan-600 md:w-44"
                />
              </div>

              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">To</p>
                <input
                  type="date"
                  value={endDate}
                  onChange={(event) => setEndDate(event.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-cyan-600 md:w-44"
                />
              </div>
            </div>

            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => applyPreset("this-month")}
                  className={`rounded-xl border px-3 py-2 text-xs font-medium transition ${activePreset === "this-month" ? "border-cyan-700 bg-cyan-700 text-white" : "border-slate-300 bg-white text-slate-700 hover:border-cyan-500 hover:text-cyan-700"}`}
                >
                  This Month
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset("last-month")}
                  className={`rounded-xl border px-3 py-2 text-xs font-medium transition ${activePreset === "last-month" ? "border-cyan-700 bg-cyan-700 text-white" : "border-slate-300 bg-white text-slate-700 hover:border-cyan-500 hover:text-cyan-700"}`}
                >
                  Last Month
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset("last-90-days")}
                  className={`rounded-xl border px-3 py-2 text-xs font-medium transition ${activePreset === "last-90-days" ? "border-cyan-700 bg-cyan-700 text-white" : "border-slate-300 bg-white text-slate-700 hover:border-cyan-500 hover:text-cyan-700"}`}
                >
                  Last 90 Days
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleExportCsv}
                  disabled={isLoading || monthlySnapshot.length === 0}
                  className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Export Summary CSV
                </button>
                <button
                  type="button"
                  onClick={handleExportDetailedCsv}
                  disabled={isLoading || isExportingDetails}
                  className="rounded-xl bg-cyan-700 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-cyan-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isExportingDetails ? "Preparing..." : "Export Detailed CSV"}
                </button>
              </div>
            </div>
          </div>
        </section>

        {error ? <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-white to-emerald-50 p-5 shadow-sm">
            <p className="text-sm text-slate-500">Revenue</p>
            <p className="mt-3 text-2xl font-bold text-emerald-700">{isLoading ? "..." : currency(metrics.totalRevenue)}</p>
          </article>
          <article className="rounded-2xl border border-amber-100 bg-gradient-to-br from-white to-amber-50 p-5 shadow-sm">
            <p className="text-sm text-slate-500">Purchases</p>
            <p className="mt-3 text-2xl font-bold text-amber-700">{isLoading ? "..." : currency(metrics.totalPurchases)}</p>
          </article>
          <article className="rounded-2xl border border-rose-100 bg-gradient-to-br from-white to-rose-50 p-5 shadow-sm">
            <p className="text-sm text-slate-500">Receivables</p>
            <p className="mt-3 text-2xl font-bold text-rose-700">{isLoading ? "..." : currency(metrics.receivables)}</p>
          </article>
          <article className="rounded-2xl border border-cyan-100 bg-gradient-to-br from-white to-cyan-50 p-5 shadow-sm">
            <p className="text-sm text-slate-500">Net cash flow</p>
            <p className={`mt-3 text-2xl font-bold ${metrics.netCashFlow >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
              {isLoading ? "..." : currency(metrics.netCashFlow)}
            </p>
          </article>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.3fr_1fr]">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-slate-900">Monthly trend snapshot</h2>
            <p className="mt-1 text-sm text-slate-500">Last six observed months based on transactions.</p>

            {isLoading ? (
              <div className="mt-5 rounded-xl bg-slate-50 p-4 text-sm text-slate-500">Loading monthly report...</div>
            ) : monthlySnapshot.length === 0 ? (
              <div className="mt-5 rounded-xl bg-slate-50 p-4 text-sm text-slate-500">No transactions available for trend analysis.</div>
            ) : (
              <div className="mt-5 overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-slate-100 text-slate-700">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Month</th>
                      <th className="px-4 py-3 font-semibold">Sales</th>
                      <th className="px-4 py-3 font-semibold">Purchases</th>
                      <th className="px-4 py-3 font-semibold">Billed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthlySnapshot.map((row) => (
                      <tr key={row.month} className="border-t border-slate-200 hover:bg-slate-50">
                        <td className="px-4 py-3 font-medium text-slate-800">{row.month}</td>
                        <td className="px-4 py-3 text-emerald-700">{currency(row.sales)}</td>
                        <td className="px-4 py-3 text-amber-700">{currency(row.purchases)}</td>
                        <td className="px-4 py-3 text-blue-700">{currency(row.billed)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">Invoices raised</p>
              <p className="mt-3 text-3xl font-bold text-slate-900">{isLoading ? "..." : metrics.invoiceCount}</p>
            </article>
            <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">Customers active</p>
              <p className="mt-3 text-3xl font-bold text-slate-900">{isLoading ? "..." : metrics.customerCount}</p>
            </article>
            <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">GST billed</p>
              <p className="mt-3 text-3xl font-bold text-indigo-700">{isLoading ? "..." : currency(metrics.totalGst)}</p>
            </article>
            <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">Inventory movement</p>
              <p className="mt-3 text-sm text-slate-700">
                IN: <span className="font-semibold text-emerald-700">{isLoading ? "..." : metrics.inventoryIn}</span>
              </p>
              <p className="mt-1 text-sm text-slate-700">
                OUT: <span className="font-semibold text-rose-700">{isLoading ? "..." : metrics.inventoryOut}</span>
              </p>
            </article>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-slate-900">Sales Ledger</h2>
            <p className="mt-1 text-sm text-slate-500">Sales invoices and direct sales transactions.</p>
            <div className="mt-4 grid gap-2 md:grid-cols-3">
              <input
                value={salesSearch}
                onChange={(event) => setSalesSearch(event.target.value)}
                placeholder="Search reference, party, notes"
                className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-cyan-600"
              />
              <select
                value={salesPaymentFilter}
                onChange={(event) => setSalesPaymentFilter(event.target.value)}
                className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-cyan-600"
              >
                <option value="all">All payment status</option>
                <option value="pending">Pending</option>
                <option value="partial">Partial</option>
                <option value="paid">Paid</option>
                <option value="overdue">Overdue</option>
              </select>
              <select
                value={salesGroupBy}
                onChange={(event) => setSalesGroupBy(event.target.value as LedgerGroupBy)}
                className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-cyan-600"
              >
                <option value="none">No grouping</option>
                <option value="date">Group by date</option>
                <option value="party">Group by party</option>
                <option value="paymentStatus">Group by payment status</option>
              </select>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Showing {filteredSalesLedgerRows.length} rows in {groupedSalesRows.length} group{groupedSalesRows.length === 1 ? "" : "s"}
            </p>
            <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-100 text-slate-700">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Date</th>
                    <th className="px-4 py-3 font-semibold">Reference</th>
                    <th className="px-4 py-3 font-semibold">Party</th>
                    <th className="px-4 py-3 font-semibold">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td className="px-4 py-4 text-slate-500" colSpan={4}>Loading...</td>
                    </tr>
                  ) : filteredSalesLedgerRows.length === 0 ? (
                    <tr>
                      <td className="px-4 py-4 text-slate-500" colSpan={4}>No sales ledger rows for current filter/grouping.</td>
                    </tr>
                  ) : (
                    groupedSalesRows.flatMap((group) => ([
                      <tr key={`sales-group-${group.key}`} className="border-t border-slate-300 bg-slate-50/80">
                        <td className="px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-600" colSpan={4}>
                          {group.label} | {group.rows.length} entr{group.rows.length === 1 ? "y" : "ies"} | Total {currency(group.totalAmount)}
                        </td>
                      </tr>,
                      ...group.rows.map((row) => (
                        <tr key={`sales-${group.key}-${row.source}-${row.reference}-${row.date}`} className="border-t border-slate-200 hover:bg-slate-50">
                          <td className="px-4 py-3 text-slate-700">{readableDate(row.date)}</td>
                          <td className="px-4 py-3 text-slate-900">{row.reference}</td>
                          <td className="px-4 py-3 text-slate-700">{row.counterparty || "-"}</td>
                          <td className="px-4 py-3 text-emerald-700">{currency(row.amount)}</td>
                        </tr>
                      )),
                    ]))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-slate-900">Purchase Ledger</h2>
            <p className="mt-1 text-sm text-slate-500">Purchase bills against suppliers and procurement entries.</p>
            <div className="mt-4 grid gap-2 md:grid-cols-3">
              <input
                value={purchaseSearch}
                onChange={(event) => setPurchaseSearch(event.target.value)}
                placeholder="Search reference, party, notes"
                className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-cyan-600"
              />
              <select
                value={purchasePaymentFilter}
                onChange={(event) => setPurchasePaymentFilter(event.target.value)}
                className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-cyan-600"
              >
                <option value="all">All payment status</option>
                <option value="pending">Pending</option>
                <option value="partial">Partial</option>
                <option value="paid">Paid</option>
                <option value="overdue">Overdue</option>
              </select>
              <select
                value={purchaseGroupBy}
                onChange={(event) => setPurchaseGroupBy(event.target.value as LedgerGroupBy)}
                className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-cyan-600"
              >
                <option value="none">No grouping</option>
                <option value="date">Group by date</option>
                <option value="party">Group by party</option>
                <option value="paymentStatus">Group by payment status</option>
              </select>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Showing {filteredPurchaseLedgerRows.length} rows in {groupedPurchaseRows.length} group{groupedPurchaseRows.length === 1 ? "" : "s"}
            </p>
            <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-100 text-slate-700">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Date</th>
                    <th className="px-4 py-3 font-semibold">Reference</th>
                    <th className="px-4 py-3 font-semibold">Party</th>
                    <th className="px-4 py-3 font-semibold">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td className="px-4 py-4 text-slate-500" colSpan={4}>Loading...</td>
                    </tr>
                  ) : filteredPurchaseLedgerRows.length === 0 ? (
                    <tr>
                      <td className="px-4 py-4 text-slate-500" colSpan={4}>No purchase ledger rows for current filter/grouping.</td>
                    </tr>
                  ) : (
                    groupedPurchaseRows.flatMap((group) => ([
                      <tr key={`purchase-group-${group.key}`} className="border-t border-slate-300 bg-slate-50/80">
                        <td className="px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-600" colSpan={4}>
                          {group.label} | {group.rows.length} entr{group.rows.length === 1 ? "y" : "ies"} | Total {currency(group.totalAmount)}
                        </td>
                      </tr>,
                      ...group.rows.map((row) => (
                        <tr key={`purchase-${group.key}-${row.source}-${row.reference}-${row.date}`} className="border-t border-slate-200 hover:bg-slate-50">
                          <td className="px-4 py-3 text-slate-700">{readableDate(row.date)}</td>
                          <td className="px-4 py-3 text-slate-900">{row.reference}</td>
                          <td className="px-4 py-3 text-slate-700">{row.counterparty || "-"}</td>
                          <td className="px-4 py-3 text-amber-700">{currency(row.amount)}</td>
                        </tr>
                      )),
                    ]))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    </ProtectedPage>
  );
}
