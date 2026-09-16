"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ProtectedPage } from "@/components/protected-page";
import { useEffect, useState } from "react";

type Company = {
  id: number;
  name: string;
  parentCompanyId?: number | null;
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

export default function NewCompanyPage() {
  const router = useRouter();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadCompanies = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`${apiBaseUrl}/companies`);
        if (!response.ok) {
          throw new Error(`Failed to load companies (${response.status})`);
        }

        setCompanies((await response.json()) as Company[]);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Unable to load companies");
      } finally {
        setIsLoading(false);
      }
    };

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

      router.push("/companies/list");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to create company");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ProtectedPage>
      <div className="mx-auto max-w-4xl space-y-6 px-6 py-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-blue-600">Setup</p>
            <h1 className="mt-2 text-3xl font-bold text-slate-900">Add company</h1>
          </div>
          <Link href="/companies/list" className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">
            Back to list
          </Link>
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          {isLoading ? <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">Loading companies...</div> : null}

          <form className="mt-2 space-y-4" onSubmit={handleSubmit}>
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
      </div>
    </ProtectedPage>
  );
}
