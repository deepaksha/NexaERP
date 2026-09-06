"use client";

import { useMemo, useState } from "react";

type Product = {
  id: number;
  name: string;
  sku: string;
  category: string;
  price: number;
  stock: number;
  status: "Active" | "Low stock" | "Inactive";
};

const initialProducts: Product[] = [
  { id: 1, name: "Laptop Pro 14", sku: "LP-14", category: "Electronics", price: 1299, stock: 24, status: "Active" },
  { id: 2, name: "Office Chair", sku: "CHR-02", category: "Furniture", price: 249, stock: 8, status: "Low stock" },
  { id: 3, name: "Desk Lamp", sku: "LMP-07", category: "Office", price: 65, stock: 31, status: "Active" },
  { id: 4, name: "USB-C Hub", sku: "HUB-19", category: "Electronics", price: 82, stock: 14, status: "Active" },
  { id: 5, name: "Notebook Pack", sku: "NTP-11", category: "Stationery", price: 18, stock: 0, status: "Inactive" },
];

const emptyForm = {
  name: "",
  sku: "",
  category: "",
  price: "",
  stock: "",
  status: "Active" as Product["status"],
};

export default function ProductTable() {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [search, setSearch] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);

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
      price: String(product.price),
      stock: String(product.stock),
      status: product.status,
    });
    setIsFormOpen(true);
  };

  const handleChange = (field: keyof typeof emptyForm, value: string) => {
    setForm((current) => ({
      ...current,
      [field]: field === "price" || field === "stock" ? value : value,
    }));
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextProduct: Product = {
      id: editingId ?? Date.now(),
      name: form.name.trim(),
      sku: form.sku.trim(),
      category: form.category.trim(),
      price: Number(form.price) || 0,
      stock: Number(form.stock) || 0,
      status: form.status,
    };

    if (!nextProduct.name || !nextProduct.sku || !nextProduct.category) {
      return;
    }

    setProducts((current) => {
      if (editingId) {
        return current.map((product) =>
          product.id === editingId ? { ...product, ...nextProduct } : product,
        );
      }
      return [nextProduct, ...current];
    });

    setIsFormOpen(false);
    resetForm();
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

      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-700">
            <tr>
              <th className="px-4 py-3 font-semibold">Name</th>
              <th className="px-4 py-3 font-semibold">SKU</th>
              <th className="px-4 py-3 font-semibold">Category</th>
              <th className="px-4 py-3 font-semibold">Price</th>
              <th className="px-4 py-3 font-semibold">Stock</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-slate-500">
                  No products match your search.
                </td>
              </tr>
            ) : (
              filteredProducts.map((product) => (
                <tr key={product.id} className="border-t border-slate-200 hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">{product.name}</td>
                  <td className="px-4 py-3 text-slate-600">{product.sku}</td>
                  <td className="px-4 py-3 text-slate-600">{product.category}</td>
                  <td className="px-4 py-3 text-slate-600">${product.price.toFixed(2)}</td>
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
                  <span>Price</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.price}
                    onChange={(event) => handleChange("price", event.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-blue-500"
                    placeholder="0.00"
                    required
                  />
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
