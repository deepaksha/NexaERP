"use client";

import { ProtectedPage } from "@/components/protected-page";
import { useEffect, useState } from "react";

type Company = {
  id: number;
  name: string;
  code?: string;
  shortName?: string;
  gstNumber?: string;
  email?: string;
  phone?: string;
  city?: string;
  state?: string;
  status?: string;
  parentCompanyId?: number | null;
  parentCompany?: {
    id: number;
    name: string;
  } | null;
};

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api";

const emptyForm = {
  name: "",
  code: "",
  shortName: "",
  email: "",
  phone: "",
  city: "",
  state: "",
  gstNumber: "",
  parentCompanyId: "",
};

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCompanies = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${apiBaseUrl}/companies`);
      if (!response.ok) {
        throw new Error(`Failed to load companies (${response.status})`);
      }

      const data = (await response.json()) as Company[];
      setCompanies(data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load companies");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadCompanies();
  }, []);

  const handleChange = (field: keyof typeof emptyForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch(`${apiBaseUrl}/companies`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          parentCompanyId: form.parentCompanyId ? Number(form.parentCompanyId) : null,
          status: "Active",
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.message ?? "Unable to create company");
      }

      setForm(emptyForm);
      await loadCompanies();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to create company");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ProtectedPage>
      <div className="mx-auto max-w-7xl space-y-6 px-6 py-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-blue-600">Setup</p>
            <h1 className="mt-2 text-3xl font-bold text-slate-900">Companies</h1>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.1fr_1.5fr]">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-slate-900">Add company</h2>
            <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-2 text-sm font-medium text-slate-700">
                  <span>Company name</span>
                  <input
                    required
                    value={form.name}
                    onChange={(event) => handleChange("name", event.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none transition focus:border-blue-500"
                    placeholder="Nexa Feed Industries"
                  />
                </label>

                <label className="space-y-2 text-sm font-medium text-slate-700">
                  <span>Code</span>
                  <input
                    value={form.code}
                    onChange={(event) => handleChange("code", event.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none transition focus:border-blue-500"
                    placeholder="NFI"
                  />
                </label>

                <label className="space-y-2 text-sm font-medium text-slate-700">
                  <span>Short name</span>
                  <input
                    value={form.shortName}
                    onChange={(event) => handleChange("shortName", event.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none transition focus:border-blue-500"
                    placeholder="NFI"
                  />
                </label>

                <label className="space-y-2 text-sm font-medium text-slate-700">
                  <span>Parent company</span>
                  <select
                    value={form.parentCompanyId}
                    onChange={(event) => handleChange("parentCompanyId", event.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none transition focus:border-blue-500"
                  >
                    <option value="">No parent company</option>
                    {companies
                      .filter((company) => !company.parentCompanyId)
                      .map((company) => (
                        <option key={company.id} value={company.id}>
                          {company.name}
                        </option>
                      ))}
                  </select>
                </label>

                <label className="space-y-2 text-sm font-medium text-slate-700">
                  <span>GST number</span>
                  <input
                    value={form.gstNumber}
                    onChange={(event) => handleChange("gstNumber", event.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none transition focus:border-blue-500"
                    placeholder="27ABCDE1234F1Z5"
                  />
                </label>

                <label className="space-y-2 text-sm font-medium text-slate-700">
                  <span>Email</span>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(event) => handleChange("email", event.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none transition focus:border-blue-500"
                    placeholder="hello@company.com"
                  />
                </label>

                <label className="space-y-2 text-sm font-medium text-slate-700">
                  <span>Phone</span>
                  <input
                    value={form.phone}
                    onChange={(event) => handleChange("phone", event.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none transition focus:border-blue-500"
                    placeholder="+91 98765 43210"
                  />
                </label>

                <label className="space-y-2 text-sm font-medium text-slate-700 sm:col-span-2">
                  <span>City</span>
                  <input
                    value={form.city}
                    onChange={(event) => handleChange("city", event.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none transition focus:border-blue-500"
                    placeholder="Pune"
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
                className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSaving ? "Saving..." : "Save company"}
              </button>
            </form>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-slate-900">Company list</h2>

            {isLoading ? (
              <div className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-500">Loading companies...</div>
            ) : companies.length === 0 ? (
              <div className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
                No companies registered yet.
              </div>
            ) : (
              <div className="mt-5 space-y-3">
                {companies.map((company) => (
                  <div key={company.id} className="rounded-xl border border-slate-200 p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-lg font-semibold text-slate-900">{company.name}</p>
                        <p className="text-sm text-slate-500">{company.code ?? company.shortName ?? "No code"}</p>
                      </div>
                      <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700">
                        {company.status ?? "Active"}
                      </span>
                    </div>
                    {company.parentCompany ? (
                      <p className="mt-2 text-xs font-medium uppercase tracking-[0.18em] text-blue-600">
                        Child of {company.parentCompany.name}
                      </p>
                    ) : (
                      <p className="mt-2 text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                        Parent company
                      </p>
                    )}
                    <div className="mt-3 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
                      <p>GST: {company.gstNumber ?? "—"}</p>
                      <p>Email: {company.email ?? "—"}</p>
                      <p>Phone: {company.phone ?? "—"}</p>
                      <p>Location: {company.city ?? "—"}{company.city && company.state ? `, ${company.state}` : ""}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </ProtectedPage>
  );
}
