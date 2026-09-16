"use client";

import Link from "next/link";
import { ProtectedPage } from "@/components/protected-page";
import { useEffect, useMemo, useState } from "react";

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

export default function CompaniesListPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");

  useEffect(() => {
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
        if (data.length > 0) {
          setSelectedCompanyId(String(data[0].id));
        }
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Unable to load companies");
      } finally {
        setIsLoading(false);
      }
    };

    void loadCompanies();
  }, []);

  const selectedCompany = useMemo(
    () => companies.find((company) => String(company.id) === selectedCompanyId) ?? null,
    [companies, selectedCompanyId],
  );

  return (
    <ProtectedPage>
      <div className="mx-auto max-w-7xl space-y-6 px-6 py-8">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-blue-600">Setup</p>
            <h1 className="mt-2 text-3xl font-bold text-slate-900">Company list view</h1>
          </div>
          <div className="flex gap-2">
            <Link href="/companies" className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">
              Tree view
            </Link>
            <Link href="/companies/new" className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700">
              Add company
            </Link>
          </div>
        </div>

        {error ? <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}

        {isLoading ? (
          <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">Loading companies...</div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">Companies</h2>
              <div className="mt-4 space-y-2">
                {companies.map((company) => (
                  <button
                    type="button"
                    key={company.id}
                    onClick={() => setSelectedCompanyId(String(company.id))}
                    className={`w-full rounded-xl border px-3 py-2 text-left text-sm transition ${selectedCompanyId === String(company.id) ? "border-blue-300 bg-blue-50 text-blue-900" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`}
                  >
                    <p className="font-medium">{company.name}</p>
                    <p className="text-xs text-slate-500">{company.code ?? company.shortName ?? "No code"}</p>
                  </button>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">Company details</h2>
              {!selectedCompany ? (
                <div className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-500">Select a company to view details.</div>
              ) : (
                <div className="mt-4 space-y-3 text-sm text-slate-700">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xl font-semibold text-slate-900">{selectedCompany.name}</p>
                      <p className="text-xs uppercase tracking-[0.14em] text-slate-500">{selectedCompany.code ?? selectedCompany.shortName ?? "No code"}</p>
                    </div>
                    <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700">{selectedCompany.status ?? "Active"}</span>
                  </div>

                  <p>
                    <span className="font-medium text-slate-900">Parent: </span>
                    {selectedCompany.parentCompany?.name ?? "Parent company"}
                  </p>
                  <p>
                    <span className="font-medium text-slate-900">GST: </span>
                    {selectedCompany.gstNumber ?? "-"}
                  </p>
                  <p>
                    <span className="font-medium text-slate-900">Email: </span>
                    {selectedCompany.email ?? "-"}
                  </p>
                  <p>
                    <span className="font-medium text-slate-900">Phone: </span>
                    {selectedCompany.phone ?? "-"}
                  </p>
                  <p>
                    <span className="font-medium text-slate-900">Location: </span>
                    {selectedCompany.city ?? "-"}{selectedCompany.city && selectedCompany.state ? `, ${selectedCompany.state}` : ""}
                  </p>
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </ProtectedPage>
  );
}
