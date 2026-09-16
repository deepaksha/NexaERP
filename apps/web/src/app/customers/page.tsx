"use client";

import { ProtectedPage } from "@/components/protected-page";
import { useEffect, useMemo, useState } from "react";

type Company = {
  id: number;
  name: string;
  parentCompany?: { id: number; name: string } | null;
};

type Customer = {
  id: number;
  name: string;
  phone?: string;
  email?: string;
  gstNumber?: string;
  city?: string;
  state?: string;
  companyId?: number;
  company?: Company | null;
};

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api";
const gstPattern = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/i;
const phonePattern = /^(\+91[\s-]?)?[6-9]\d{9}$/;

const emptyForm = {
  name: "",
  phone: "",
  email: "",
  gstNumber: "",
  city: "",
  state: "",
  companyId: "",
};

export default function CustomersPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("all");
  const [form, setForm] = useState(emptyForm);
  const [isLoading, setIsLoading] = useState(true);
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
    setCustomers((await response.json()) as Customer[]);
  };

  useEffect(() => {
    setIsLoading(true);
    setError(null);

    Promise.all([loadCompanies(), loadCustomers()])
      .catch((loadError) => {
        setError(loadError instanceof Error ? loadError.message : "Unable to load customer data");
      })
      .finally(() => setIsLoading(false));
  }, [selectedCompanyId]);

  const filteredCustomers = useMemo(() => {
    if (selectedCompanyId === "all") return customers;
    return customers.filter((customer) => String(customer.companyId ?? customer.company?.id ?? "") === selectedCompanyId);
  }, [customers, selectedCompanyId]);

  const handleChange = (field: keyof typeof emptyForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    setError(null);

    try {
      const name = form.name.trim();
      const email = form.email.trim();
      const phone = form.phone.trim();
      const gstNumber = form.gstNumber.trim();

      if (name.length < 2) {
        throw new Error("Customer name must be at least 2 characters");
      }

      if (!form.companyId) {
        throw new Error("Company is required");
      }

      if (email && !/^\S+@\S+\.\S+$/.test(email)) {
        throw new Error("Email format is invalid");
      }

      if (phone && !phonePattern.test(phone)) {
        throw new Error("Phone must be a valid Indian mobile number");
      }

      if (gstNumber && !gstPattern.test(gstNumber)) {
        throw new Error("GST number format is invalid");
      }

      const response = await fetch(`${apiBaseUrl}/customers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          name,
          email,
          phone,
          gstNumber,
          companyId: form.companyId ? Number(form.companyId) : null,
          status: "Active",
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.message ?? "Unable to create customer");
      }

      setForm(emptyForm);
      await loadCustomers();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to create customer");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ProtectedPage>
      <div className="mx-auto max-w-7xl space-y-6 px-6 py-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-blue-600">Sales</p>
            <h1 className="mt-2 text-3xl font-bold text-slate-900">Customers</h1>
          </div>

          <select
            value={selectedCompanyId}
            onChange={(event) => setSelectedCompanyId(event.target.value)}
            className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none transition focus:border-blue-500 md:w-64"
          >
            <option value="all">All companies</option>
            {companies.map((company) => (
              <option key={company.id} value={company.id}>
                {company.parentCompany ? `${company.parentCompany.name} / ${company.name}` : company.name}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.1fr_1.5fr]">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-slate-900">Add customer</h2>
            <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-2 text-sm font-medium text-slate-700 sm:col-span-2">
                  <span>Customer name</span>
                  <input
                    required
                    value={form.name}
                    onChange={(event) => handleChange("name", event.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none transition focus:border-blue-500"
                    placeholder="Ace Retail"
                  />
                </label>

                <label className="space-y-2 text-sm font-medium text-slate-700">
                  <span>Company</span>
                  <select
                    required
                    value={form.companyId}
                    onChange={(event) => handleChange("companyId", event.target.value)}
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
                  <span>Phone</span>
                  <input
                    value={form.phone}
                    onChange={(event) => handleChange("phone", event.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none transition focus:border-blue-500"
                    placeholder="+91 90000 00000"
                    pattern="(\+91[\s-]?)?[6-9][0-9]{9}"
                    title="Use Indian mobile format, for example +91 9876543210"
                  />
                </label>

                <label className="space-y-2 text-sm font-medium text-slate-700">
                  <span>Email</span>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(event) => handleChange("email", event.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none transition focus:border-blue-500"
                    placeholder="customer@example.com"
                  />
                </label>

                <label className="space-y-2 text-sm font-medium text-slate-700">
                  <span>GST number</span>
                  <input
                    value={form.gstNumber}
                    onChange={(event) => handleChange("gstNumber", event.target.value.toUpperCase())}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none transition focus:border-blue-500"
                    placeholder="27ABCDE1234F1Z5"
                    pattern="[0-9]{2}[A-Za-z]{5}[0-9]{4}[A-Za-z][0-9A-Za-z]Z[0-9A-Za-z]"
                    title="Enter a valid GSTIN, for example 27ABCDE1234F1Z5"
                  />
                </label>

                <label className="space-y-2 text-sm font-medium text-slate-700">
                  <span>City</span>
                  <input
                    value={form.city}
                    onChange={(event) => handleChange("city", event.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none transition focus:border-blue-500"
                    placeholder="Nagpur"
                  />
                </label>

                <label className="space-y-2 text-sm font-medium text-slate-700 sm:col-span-2">
                  <span>State</span>
                  <input
                    value={form.state}
                    onChange={(event) => handleChange("state", event.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none transition focus:border-blue-500"
                    placeholder="Maharashtra"
                  />
                </label>
              </div>

              {error ? <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}

              <button
                type="submit"
                disabled={isSaving}
                className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSaving ? "Saving..." : "Save customer"}
              </button>
            </form>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-slate-900">Customer list</h2>

            {isLoading ? (
              <div className="mt-5 rounded-xl bg-slate-50 p-4 text-sm text-slate-500">Loading customers...</div>
            ) : filteredCustomers.length === 0 ? (
              <div className="mt-5 rounded-xl bg-slate-50 p-4 text-sm text-slate-500">No customers found for this company.</div>
            ) : (
              <div className="mt-5 overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-700">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Name</th>
                      <th className="px-4 py-3 font-semibold">Company</th>
                      <th className="px-4 py-3 font-semibold">Contact</th>
                      <th className="px-4 py-3 font-semibold">GST</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCustomers.map((customer) => (
                      <tr key={customer.id} className="border-t border-slate-200">
                        <td className="px-4 py-3 font-medium text-slate-800">{customer.name}</td>
                        <td className="px-4 py-3 text-slate-600">{customer.company?.name || "—"}</td>
                        <td className="px-4 py-3 text-slate-600">{customer.phone || customer.email || "—"}</td>
                        <td className="px-4 py-3 text-slate-600">{customer.gstNumber || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </div>
    </ProtectedPage>
  );
}
