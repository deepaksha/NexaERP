"use client";

import { ProtectedPage } from "@/components/protected-page";
import { useLocale } from "@/components/locale-provider";
import ProductTable from "@/components/product-table";

export default function ProductsPage() {
  const { tx } = useLocale();

  return (
    <ProtectedPage>
      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-6">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-blue-600">Catalog</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">{tx("Products")}</h1>
        </div>

        <ProductTable />
      </div>
    </ProtectedPage>
  );
}
