import React, { useEffect, useMemo, useState } from "react";
import api from "./api";

const initialForm = {
  name: "",
  price: "",
  stockQuantity: "",
  category: "",
};

export default function AddProducts() {
  const [form, setForm] = useState(initialForm);
  const [products, setProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const loadProducts = async () => {
    setIsLoading(true);

    try {
      try {
        const response = await api.get("/products");
        setProducts(Array.isArray(response.data) ? response.data : []);
      } catch (firstError) {
        const response = await api.get("/products/all");
        setProducts(Array.isArray(response.data) ? response.data : []);
      }
    } catch (error) {
      console.error("Failed to load products:", error);
      setProducts([]);
      alert(error.response?.data?.message || "Failed to load products");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    if (!successMessage) return undefined;

    const timer = setTimeout(() => {
      setSuccessMessage("");
    }, 3000);

    return () => clearTimeout(timer);
  }, [successMessage]);

  const filteredProducts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return products;

    return products.filter((product) => {
      const name = product.name?.toLowerCase() || "";
      const category = product.category?.toLowerCase() || "";
      const id = String(product.id ?? "").toLowerCase();
      return name.includes(query) || category.includes(query) || id.includes(query);
    });
  }, [products, searchQuery]);

  const handleChange = (field, value) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const closeModal = () => {
    if (isSaving) return;
    setIsModalOpen(false);
    setForm(initialForm);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const name = form.name.trim();
    const category = form.category.trim();
    const price = Number(form.price);
    const stockQuantity = Number(form.stockQuantity);

    if (!name || !Number.isFinite(price) || !Number.isFinite(stockQuantity) || isSaving) {
      return;
    }

    setIsSaving(true);

    try {
      const payload = {
        name,
        price,
        stockQuantity,
        category: category || null,
      };

      await api.post("/products", payload);
      await loadProducts();
      setSuccessMessage("Product added successfully.");
      setIsModalOpen(false);
      setForm(initialForm);
    } catch (error) {
      console.error("Failed to add product:", error);
      alert(error.response?.data?.message || "Failed to add product");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-50 p-6">
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-600">
              Product Catalog
            </p>
            <h2 className="mt-2 text-2xl font-black text-slate-900">
              Add Products
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Create products for the current store. Tenant ID is set
              automatically by your backend on save.
            </p>
          </div>

          <div className="flex w-full flex-col gap-3 md:w-auto md:flex-row md:items-end">
            <div className="w-full md:w-80">
              <label className="mb-2 block text-sm font-bold text-slate-600">
                Search
              </label>
              <input
                type="text"
                placeholder="Search by ID, name, or category"
                className="w-full rounded-xl border-2 border-slate-200 p-3 outline-none focus:border-blue-500"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white hover:bg-blue-700"
            >
              + Add Product
            </button>
          </div>
        </div>

        {successMessage && (
          <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
            {successMessage}
          </div>
        )}

        <div className="mt-6 overflow-hidden rounded-xl border border-slate-200">
          <table className="w-full text-left">
            <thead className="bg-slate-100">
              <tr>
                <th className="p-4 text-sm font-bold text-slate-600">ID</th>
                <th className="p-4 text-sm font-bold text-slate-600">Name</th>
                <th className="p-4 text-sm font-bold text-slate-600">
                  Category
                </th>
                <th className="p-4 text-sm font-bold text-slate-600 text-right">
                  Price
                </th>
                <th className="p-4 text-sm font-bold text-slate-600 text-right">
                  Stock
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan="5" className="p-6 text-sm text-slate-500">
                    Loading products...
                  </td>
                </tr>
              ) : filteredProducts.length > 0 ? (
                filteredProducts.map((product) => (
                  <tr
                    key={product.id}
                    className="border-t border-slate-100"
                  >
                    <td className="p-4 font-semibold text-slate-700">
                      {product.id}
                    </td>
                    <td className="p-4 text-slate-800">{product.name}</td>
                    <td className="p-4 text-slate-600">
                      {product.category || "-"}
                    </td>
                    <td className="p-4 text-right text-slate-800">
                      {Number(product.price ?? 0).toFixed(2)}
                    </td>
                    <td className="p-4 text-right font-semibold text-slate-700">
                      {product.stockQuantity ?? 0}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="p-6 text-sm text-slate-500">
                    No products found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-600">
                  New Record
                </p>
                <h3 className="mt-2 text-2xl font-black text-slate-900">
                  Add Product
                </h3>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="text-sm font-semibold text-slate-400 hover:text-slate-600"
              >
                Close
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-6 space-y-5">
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-600">
                  Name
                </label>
                <input
                  type="text"
                  placeholder="Enter product name"
                  className="w-full rounded-xl border-2 border-slate-200 p-3 outline-none focus:border-blue-500"
                  value={form.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-600">
                  Category
                </label>
                <input
                  type="text"
                  placeholder="e.g. Grocery, FMCG"
                  className="w-full rounded-xl border-2 border-slate-200 p-3 outline-none focus:border-blue-500"
                  value={form.category}
                  onChange={(e) => handleChange("category", e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-600">
                    Price
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    className="w-full rounded-xl border-2 border-slate-200 p-3 outline-none focus:border-blue-500"
                    value={form.price}
                    onChange={(e) => handleChange("price", e.target.value)}
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-600">
                    Stock Quantity
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    placeholder="0"
                    className="w-full rounded-xl border-2 border-slate-200 p-3 outline-none focus:border-blue-500"
                    value={form.stockQuantity}
                    onChange={(e) => handleChange("stockQuantity", e.target.value)}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    isSaving ||
                    !form.name.trim() ||
                    !Number.isFinite(Number(form.price)) ||
                    !Number.isFinite(Number(form.stockQuantity))
                  }
                  className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white hover:bg-blue-700 disabled:bg-slate-200"
                >
                  {isSaving ? "SAVING..." : "OK"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

