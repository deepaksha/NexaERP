"use client";

import { useEffect, useMemo, useState } from "react";

type CompanyOption = {
  id: number;
  name: string;
  parentCompany?: { id: number; name: string } | null;
};

type Product = {
  id: number;
  name: string;
  sku: string;
  category: string;
  stock: number;
  lowStockThreshold: number;
  status: "Active" | "Low stock" | "Inactive";
  companyId?: number;
};

type ProductApiResponse = {
  id: number;
  name: string;
  sku: string;
  category: string;
  stock: string | number;
  lowStockThreshold?: string | number;
  status: string;
  companyId?: number;
};

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api";

const emptyForm = {
  name: "",
  sku: "",
  category: "",
  stock: "",
  lowStockThreshold: "15",
  status: "Active" as Product["status"],
};

export default function ProductTable() {
  const [products, setProducts] = useState<Product[]>([]);
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const normalizeProduct = (product: ProductApiResponse): Product => ({
    id: product.id,
    name: product.name,
    sku: product.sku,
    category: product.category,
    stock: Number(product.stock),
    lowStockThreshold: Number(product.lowStockThreshold ?? 15),
    status:
      product.status === "Low stock" || product.status === "Inactive"
        ? product.status
        : "Active",
    companyId: product.companyId,
  });

  const loadCompanies = async () => {
    const response = await fetch(`${apiBaseUrl}/companies`);
    if (!response.ok) {
      throw new Error(`Failed to load companies (${response.status})`);
    }

    const data = (await response.json()) as CompanyOption[];
    setCompanies(data);
  };

  const loadProducts = async () => {
    const url = new URL(`${apiBaseUrl}/products`);
    if (selectedCompanyId !== "all") {
      url.searchParams.set("companyId", selectedCompanyId);
    }

    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(`Failed to load products (${response.status})`);
    }

    const data = (await response.json()) as ProductApiResponse[];
    setProducts(data.map(normalizeProduct));
  };

  useEffect(() => {
    setIsLoading(true);
    setError(null);

    Promise.all([loadCompanies(), loadProducts()])
      .catch((loadError) => {
        setError(loadError instanceof Error ? loadError.message : "Failed to load products");
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [selectedCompanyId]);

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const query = search.toLowerCase();
      return (
        product.name.toLowerCase().includes(query) ||
        product.sku.toLowerCase().includes(query) ||
        product.category.toLowerCase().includes(query)
      );
    });
  }, [products, search]);

  const orderedProducts = useMemo(() => {
    return [...filteredProducts].sort((left, right) => {
      if (left.stock !== right.stock) {
        return left.stock - right.stock;
      }

      return left.name.localeCompare(right.name);
    });
  }, [filteredProducts]);

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
  };

  const openNewProduct = () => {
    resetForm();
    setIsFormOpen(true);
  };

  const openEditProduct = (product: Product) => {
    setEditingId(product.id);
    setForm({
      name: product.name,
      sku: product.sku,
      category: product.category,
      stock: String(product.stock),
      lowStockThreshold: String(product.lowStockThreshold),
      status: product.status,
    });
    setIsFormOpen(true);
  };

  const handleChange = (field: keyof typeof emptyForm, value: string) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const saveProduct = async () => {
      const payload = {
        name: form.name.trim(),
        sku: form.sku.trim(),
        category: form.category.trim(),
        companyId: selectedCompanyId === "all" ? null : Number(selectedCompanyId),
        stock: Number(form.stock) || 0,
        lowStockThreshold: Number(form.lowStockThreshold) || 15,
        status: form.status,
      };

      if (!payload.name || !payload.sku || !payload.category) {
        return;
      }

      const response = await fetch(
        editingId ? `${apiBaseUrl}/products/${editingId}` : `${apiBaseUrl}/products`,
        {
          method: editingId ? "PATCH" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        },
      );

      if (!response.ok) {
        throw new Error(`Failed to save product (${response.status})`);
      }

      await loadProducts();
      setIsFormOpen(false);
      resetForm();
    };

    void saveProduct().catch((saveError) => {
      setError(saveError instanceof Error ? saveError.message : "Failed to save product");
    });
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-blue-600">
            Inventory
          </p>
          <h2 className="mt-2 text-2xl font-bold text-slate-900">Products</h2>
        </div>

        <div className="flex flex-col gap-3 md:flex-row">
          <select
            value={selectedCompanyId}
            onChange={(event) => setSelectedCompanyId(event.target.value)}
            className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none transition focus:border-blue-500 md:w-56"
          >
            <option value="all">All companies</option>
            {companies.map((company) => (
              <option key={company.id} value={company.id}>
                {company.parentCompany ? `${company.parentCompany.name} / ${company.name}` : company.name}
              </option>
            ))}
          </select>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none ring-0 transition focus:border-blue-500 md:w-72"
            placeholder="Search by name, SKU or category"
          />
          <button
            type="button"
            onClick={openNewProduct}
            className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700"
          >
            + Add product
          </button>
        </div>
      </div>

      {error ? (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-700">
            <tr>
              <th className="px-4 py-3 font-semibold">Name</th>
              <th className="px-4 py-3 font-semibold">SKU</th>
              <th className="px-4 py-3 font-semibold">Category</th>
              <th className="px-4 py-3 font-semibold">Stock</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-slate-500">
                  Loading products from the database...
                </td>
              </tr>
            ) : orderedProducts.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-slate-500">
                  No products found in the database.
                </td>
              </tr>
            ) : (
              orderedProducts.map((product) => (
                <tr key={product.id} className="border-t border-slate-200 hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">{product.name}</td>
                  <td className="px-4 py-3 text-slate-600">{product.sku}</td>
                  <td className="px-4 py-3 text-slate-600">{product.category}</td>
                  <td className="px-4 py-3 text-slate-600">{product.stock}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                        product.status === "Active"
                          ? "bg-emerald-100 text-emerald-700"
                          : product.status === "Low stock"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-slate-200 text-slate-700"
                      }`}
                    >
                      {product.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => openEditProduct(product)}
                      className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-100"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-900">
                {editingId ? "Edit product" : "Add new product"}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setIsFormOpen(false);
                  resetForm();
                }}
                className="text-sm text-slate-500 hover:text-slate-700"
              >
                Close
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2 text-sm font-medium text-slate-700">
                  <span>Product name</span>
                  <input
                    value={form.name}
                    onChange={(event) => handleChange("name", event.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-blue-500"
                    placeholder="Enter product name"
                    required
                  />
                </label>

                <label className="space-y-2 text-sm font-medium text-slate-700">
                  <span>SKU</span>
                  <input
                    value={form.sku}
                    onChange={(event) => handleChange("sku", event.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-blue-500"
                    placeholder="SKU"
                    required
                  />
                </label>

                <label className="space-y-2 text-sm font-medium text-slate-700">
                  <span>Category</span>
                  <input
                    value={form.category}
                    onChange={(event) => handleChange("category", event.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-blue-500"
                    placeholder="Category"
                    required
                  />
                </label>

                <label className="space-y-2 text-sm font-medium text-slate-700">
                  <span>Status</span>
                  <select
                    value={form.status}
                    onChange={(event) => handleChange("status", event.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-blue-500"
                  >
                    <option value="Active">Active</option>
                    <option value="Low stock">Low stock</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </label>

                <label className="space-y-2 text-sm font-medium text-slate-700">
                  <span>Stock</span>
                  <input
                    type="number"
                    min="0"
                    value={form.stock}
                    onChange={(event) => handleChange("stock", event.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-blue-500"
                    placeholder="0"
                    required
                  />
                </label>

                <label className="space-y-2 text-sm font-medium text-slate-700">
                  <span>Low stock threshold</span>
                  <input
                    type="number"
                    min="0"
                    value={form.lowStockThreshold}
                    onChange={(event) => handleChange("lowStockThreshold", event.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-blue-500"
                    placeholder="15"
                  />
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsFormOpen(false);
                    resetForm();
                  }}
                  className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
                >
                  {editingId ? "Save changes" : "Create product"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
