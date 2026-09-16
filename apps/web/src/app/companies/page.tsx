"use client";

import Link from "next/link";
import { ProtectedPage } from "@/components/protected-page";
import { useLocale } from "@/components/locale-provider";
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

type CompanyTreeNode = Company & { children: CompanyTreeNode[] };

function buildCompanyTree(companies: Company[]): CompanyTreeNode[] {
  const byId = new Map<number, CompanyTreeNode>();
  const roots: CompanyTreeNode[] = [];

  for (const company of companies) {
    byId.set(company.id, { ...company, children: [] });
  }

  for (const company of byId.values()) {
    const parentId = company.parentCompanyId ?? company.parentCompany?.id ?? null;
    if (!parentId) {
      roots.push(company);
      continue;
    }

    const parent = byId.get(parentId);
    if (!parent) {
      roots.push(company);
      continue;
    }

    parent.children.push(company);
  }

  const sortTree = (nodes: CompanyTreeNode[]) => {
    nodes.sort((left, right) => left.name.localeCompare(right.name));
    for (const node of nodes) {
      sortTree(node.children);
    }
  };

  sortTree(roots);
  return roots;
}

export default function CompaniesPage() {
  const { tx } = useLocale();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [expandedNodeIds, setExpandedNodeIds] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
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

  const companyTree = useMemo(() => buildCompanyTree(companies), [companies]);

  useEffect(() => {
    setExpandedNodeIds((current) => {
      if (current.size > 0) {
        return current;
      }

      const rootIds = companyTree.map((node) => node.id);
      return new Set(rootIds);
    });
  }, [companyTree]);

  const toggleNode = (nodeId: number) => {
    setExpandedNodeIds((current) => {
      const next = new Set(current);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  };

  const renderTree = (nodes: CompanyTreeNode[], depth = 0) => (
    <ul className={depth === 0 ? "space-y-3" : "ml-6 mt-3 space-y-3 border-l border-slate-200 pl-4"}>
      {nodes.map((node) => (
        <li key={node.id}>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-base font-semibold text-slate-900">{node.name}</p>
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500">{node.code ?? node.shortName ?? "No code"}</p>
              </div>
              <div className="flex items-center gap-2">
                {node.children.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => toggleNode(node.id)}
                    className="rounded-lg border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    aria-expanded={expandedNodeIds.has(node.id)}
                  >
                    {expandedNodeIds.has(node.id) ? "Collapse" : "Expand"}
                  </button>
                ) : null}
                <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700">
                  {node.status ?? "Active"}
                </span>
              </div>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              {node.children.length > 0 ? `${node.children.length} child compan${node.children.length > 1 ? "ies" : "y"}` : "Leaf company"}
            </p>
          </div>
          {node.children.length > 0 && expandedNodeIds.has(node.id) ? renderTree(node.children, depth + 1) : null}
        </li>
      ))}
    </ul>
  );

  return (
    <ProtectedPage>
      <div className="mx-auto max-w-7xl space-y-6 px-6 py-8">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-blue-600">{tx("Setup")}</p>
            <h1 className="mt-2 text-3xl font-bold text-slate-900">{tx("Companies")}</h1>
          </div>
          <div className="flex gap-2">
            <Link href="/companies/list" className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">
              Company list view
            </Link>
            <Link href="/companies/new" className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700">
              Add company
            </Link>
          </div>
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900">Company hierarchy</h2>

          {error ? <div className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}

          {isLoading ? (
            <div className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-500">Loading companies...</div>
          ) : companyTree.length === 0 ? (
            <div className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-500">No companies registered yet.</div>
          ) : (
            <div className="mt-5">{renderTree(companyTree)}</div>
          )}
        </section>
      </div>
    </ProtectedPage>
  );
}
