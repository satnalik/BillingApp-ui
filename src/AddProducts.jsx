import React, { useEffect, useMemo, useState } from "react";
import api from "./api";

const initialForm = {
  barcode: "",
  name: "",
  sellingPrice: "",
  mrp: "",
  costPrice: "",
  landingPrice: "",
  supplierName: "",
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
  const [isEditMode, setIsEditMode] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const loadProducts = async () => {
    setIsLoading(true);

    try {
      try {
        const response = await api.get("/products");
        setProducts(Array.isArray(response.data) ? response.data : []);
      } catch {
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
    setIsEditMode(false);
    setForm(initialForm);
  };

  const openAddModal = () => {
    setIsEditMode(false);
    setForm(initialForm);
    setIsModalOpen(true);
  };

  const openEditModal = (product) => {
    if (!product) return;
    setIsEditMode(true);
    setForm({
      barcode: String(product.barcode ?? "").trim(),
      name: String(product.name ?? "").trim(),
      sellingPrice: String(product.sellingPrice ?? product.price ?? ""),
      mrp: product.mrp ?? "",
      costPrice: product.costPrice ?? "",
      landingPrice: product.landingPrice ?? "",
      supplierName: String(product.supplierName ?? ""),
      stockQuantity: String(product.stockQuantity ?? 0),
      category: String(product.category ?? ""),
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const barcode = form.barcode.trim();
    const name = form.name.trim();
    const category = form.category.trim();
    const sellingPrice = Number(form.sellingPrice);
    const mrp = form.mrp === "" ? null : Number(form.mrp);
    const costPrice = form.costPrice === "" ? null : Number(form.costPrice);
    const landingPrice = form.landingPrice === "" ? null : Number(form.landingPrice);
    const stockQuantity = Number(form.stockQuantity);

    if (!barcode || !name || !Number.isFinite(sellingPrice) || !Number.isFinite(stockQuantity) || isSaving) {
      return;
    }

    setIsSaving(true);

    try {
      const payload = {
        barcode,
        name,
        sellingPrice,
        price: sellingPrice,
        mrp,
        costPrice,
        landingPrice,
        supplierName: form.supplierName.trim() || null,
        stockQuantity,
        category: category || null,
      };

      await api.post("/products/barcode", payload);
      await loadProducts();
      setSuccessMessage(isEditMode ? "Product updated successfully." : "Product added successfully.");
      setIsModalOpen(false);
      setIsEditMode(false);
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
              onClick={openAddModal}
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
                <th className="p-4 text-sm font-bold text-slate-600">Barcode</th>
                <th className="p-4 text-sm font-bold text-slate-600">Name</th>
                <th className="p-4 text-sm font-bold text-slate-600">
                  Category
                </th>
                <th className="p-4 text-sm font-bold text-slate-600">
                  Supplier
                </th>
                <th className="p-4 text-sm font-bold text-slate-600 text-right">
                  Cost Price
                </th>
                <th className="p-4 text-sm font-bold text-slate-600 text-right">
                  MRP
                </th>
                <th className="p-4 text-sm font-bold text-slate-600 text-right">
                  Landing Price
                </th>
                <th className="p-4 text-sm font-bold text-slate-600 text-right">
                  Selling Price
                </th>
                <th className="p-4 text-sm font-bold text-slate-600 text-right">
                  Stock
                </th>
                <th className="p-4 text-sm font-bold text-slate-600 text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan="11" className="p-6 text-sm text-slate-500">
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
                    <td className="p-4 text-slate-700">
                      {product.barcode || "-"}
                    </td>
                    <td className="p-4 text-slate-800">{product.name}</td>
                    <td className="p-4 text-slate-600">
                      {product.category || "-"}
                    </td>
                    <td className="p-4 text-slate-700">
                      {product.supplierName || "-"}
                    </td>
                    <td className="p-4 text-right text-slate-700">
                      {product.costPrice === null || product.costPrice === undefined || product.costPrice === ""
                        ? "-"
                        : Number(product.costPrice).toFixed(2)}
                    </td>
                    <td className="p-4 text-right text-slate-700">
                      {product.mrp === null || product.mrp === undefined || product.mrp === ""
                        ? "-"
                        : Number(product.mrp).toFixed(2)}
                    </td>
                    <td className="p-4 text-right text-slate-700">
                      {product.landingPrice === null || product.landingPrice === undefined || product.landingPrice === ""
                        ? "-"
                        : Number(product.landingPrice).toFixed(2)}
                    </td>
                    <td className="p-4 text-right text-slate-800">
                      {Number(product.sellingPrice ?? product.price ?? 0).toFixed(2)}
                    </td>
                    <td className="p-4 text-right font-semibold text-slate-700">
                      {product.stockQuantity ?? 0}
                    </td>
                    <td className="p-4 text-right">
                      <button
                        type="button"
                        onClick={() => openEditModal(product)}
                        className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-700"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="11" className="p-6 text-sm text-slate-500">
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
                  {isEditMode ? "Edit Record" : "New Record"}
                </p>
                <h3 className="mt-2 text-2xl font-black text-slate-900">
                  {isEditMode ? "Edit Product" : "Add Product"}
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
                  Barcode
                </label>
                <input
                  type="text"
                  placeholder="Scan/enter barcode"
                  className="w-full rounded-xl border-2 border-slate-200 p-3 outline-none focus:border-blue-500"
                  value={form.barcode}
                  onChange={(e) => handleChange("barcode", e.target.value)}
                  disabled={isEditMode}
                />
                <p className="mt-2 text-xs text-slate-400">
                  Tip: Click and scan with a USB scanner.
                </p>
              </div>

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
                    Selling Price
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    className="w-full rounded-xl border-2 border-slate-200 p-3 outline-none focus:border-blue-500"
                    value={form.sellingPrice}
                    onChange={(e) => handleChange("sellingPrice", e.target.value)}
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

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-600">
                    MRP
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    className="w-full rounded-xl border-2 border-slate-200 p-3 outline-none focus:border-blue-500"
                    value={form.mrp}
                    onChange={(e) => handleChange("mrp", e.target.value)}
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-600">
                    Supplier Name
                  </label>
                  <input
                    type="text"
                    placeholder="Supplier"
                    className="w-full rounded-xl border-2 border-slate-200 p-3 outline-none focus:border-blue-500"
                    value={form.supplierName}
                    onChange={(e) => handleChange("supplierName", e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-600">
                    Cost Price
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    className="w-full rounded-xl border-2 border-slate-200 p-3 outline-none focus:border-blue-500"
                    value={form.costPrice}
                    onChange={(e) => handleChange("costPrice", e.target.value)}
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-600">
                    Landing Price
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    className="w-full rounded-xl border-2 border-slate-200 p-3 outline-none focus:border-blue-500"
                    value={form.landingPrice}
                    onChange={(e) => handleChange("landingPrice", e.target.value)}
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
                    !form.barcode.trim() ||
                    !form.name.trim() ||
                    !Number.isFinite(Number(form.sellingPrice)) ||
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

