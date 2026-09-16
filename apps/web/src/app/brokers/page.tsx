"use client";

import { ProtectedPage } from "@/components/protected-page";
import { useEffect, useState } from "react";

type Company = { id: number; name: string; parentCompany?: { id: number; name: string } | null };
type Broker = { id: number; name: string; contactPerson?: string; phone?: string; email?: string; companyId?: number; status?: string };

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api";

export default function BrokersPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [brokers, setBrokers] = useState<Broker[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState("all");
  const [form, setForm] = useState({ name: "", contactPerson: "", phone: "", email: "", companyId: "", notes: "" });
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const load = async () => {
    const [companiesRes, brokersRes] = await Promise.all([
      fetch(`${apiBaseUrl}/companies`),
      fetch(selectedCompanyId === "all" ? `${apiBaseUrl}/brokers` : `${apiBaseUrl}/brokers?companyId=${selectedCompanyId}`),
    ]);
    if (!companiesRes.ok) throw new Error("Failed to load companies");
    if (!brokersRes.ok) throw new Error("Failed to load brokers");
    setCompanies((await companiesRes.json()) as Company[]);
    setBrokers((await brokersRes.json()) as Broker[]);
  };

  useEffect(() => {
    load().catch((e) => setError(e instanceof Error ? e.message : "Unable to load brokers"));
  }, [selectedCompanyId]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    setError(null);
    try {
      const response = await fetch(`${apiBaseUrl}/brokers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          contactPerson: form.contactPerson.trim() || undefined,
          phone: form.phone.trim() || undefined,
          email: form.email.trim() || undefined,
          companyId: form.companyId ? Number(form.companyId) : undefined,
          notes: form.notes.trim() || undefined,
          status: "Active",
        }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.message ?? "Unable to create broker");
      }
      setForm({ name: "", contactPerson: "", phone: "", email: "", companyId: "", notes: "" });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to create broker");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ProtectedPage>
      <div className="mx-auto max-w-7xl space-y-6 px-6 py-8">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-blue-600">Masters</p>
            <h1 className="mt-2 text-3xl font-bold text-slate-900">Brokers</h1>
          </div>
          <select value={selectedCompanyId} onChange={(e) => setSelectedCompanyId(e.target.value)} className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm">
            <option value="all">All companies</option>
            {companies.map((c) => <option key={c.id} value={c.id}>{c.parentCompany ? `${c.parentCompany.name} / ${c.name}` : c.name}</option>)}
          </select>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_1.3fr]">
          <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
            <h2 className="text-xl font-bold text-slate-900">Add broker</h2>
            <input required value={form.name} onChange={(e) => setForm((c) => ({ ...c, name: e.target.value }))} placeholder="Broker name" className="w-full rounded-xl border border-slate-300 px-3 py-2.5" />
            <input value={form.contactPerson} onChange={(e) => setForm((c) => ({ ...c, contactPerson: e.target.value }))} placeholder="Contact person" className="w-full rounded-xl border border-slate-300 px-3 py-2.5" />
            <input value={form.phone} onChange={(e) => setForm((c) => ({ ...c, phone: e.target.value }))} placeholder="Phone" className="w-full rounded-xl border border-slate-300 px-3 py-2.5" />
            <input type="email" value={form.email} onChange={(e) => setForm((c) => ({ ...c, email: e.target.value }))} placeholder="Email" className="w-full rounded-xl border border-slate-300 px-3 py-2.5" />
            <select value={form.companyId} onChange={(e) => setForm((c) => ({ ...c, companyId: e.target.value }))} className="w-full rounded-xl border border-slate-300 px-3 py-2.5">
              <option value="">Company (optional)</option>
              {companies.map((c) => <option key={c.id} value={c.id}>{c.parentCompany ? `${c.parentCompany.name} / ${c.name}` : c.name}</option>)}
            </select>
            <textarea value={form.notes} onChange={(e) => setForm((c) => ({ ...c, notes: e.target.value }))} placeholder="Notes" className="min-h-20 w-full rounded-xl border border-slate-300 px-3 py-2.5" />
            {error ? <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}
            <button type="submit" disabled={isSaving} className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-medium text-white">{isSaving ? "Saving..." : "Save broker"}</button>
          </form>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-slate-900">Broker register</h2>
            <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-700"><tr><th className="px-4 py-3">Name</th><th className="px-4 py-3">Contact</th><th className="px-4 py-3">Phone</th><th className="px-4 py-3">Status</th></tr></thead>
                <tbody>
                  {brokers.map((b) => (
                    <tr key={b.id} className="border-t border-slate-200"><td className="px-4 py-3">{b.name}</td><td className="px-4 py-3">{b.contactPerson ?? "-"}</td><td className="px-4 py-3">{b.phone ?? "-"}</td><td className="px-4 py-3">{b.status ?? "Active"}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
    </ProtectedPage>
  );
}
