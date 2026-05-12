import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import api from "./api";
import { fetchSuppliers, formatSupplierOption } from "./supplierApi";

const paymentMethods = ["CASH", "UPI", "CARD"];

const initialForm = {
  supplierId: "",
  billNumber: "",
  billDate: new Date().toISOString().slice(0, 10),
  discountAmount: "",
  taxAmount: "",
  paidAmount: "",
  paymentMethod: "CASH",
  paymentReference: "",
  notes: "",
};

const emptyItem = {
  productId: "",
  quantity: "",
  purchasePrice: "",
  sellingPrice: "",
};

function money(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "-";
  return amount.toFixed(2);
}

function numberOrZero(value) {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : 0;
}

function formatDate(value) {
  if (!value) return "-";
  return String(value).slice(0, 10);
}

function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function purchaseStatus(purchase) {
  return String(purchase?.status || "ACTIVE").toUpperCase();
}

function StatusBadge({ status }) {
  const normalized = String(status || "ACTIVE").toUpperCase();
  const isCancelled = normalized === "CANCELLED";

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-black ${
        isCancelled
          ? "bg-rose-100 text-rose-700"
          : "bg-emerald-100 text-emerald-700"
      }`}
    >
      {normalized}
    </span>
  );
}

function fieldAmount(value) {
  if (value === null || value === undefined || value === "") return "";
  return String(value);
}

function productLabel(product) {
  const name = String(product?.name || "").trim();
  const barcode = String(product?.barcode || "").trim();
  if (name && barcode) return `${name} (${barcode})`;
  return name || barcode || `Product #${product?.id}`;
}

async function fetchProducts() {
  try {
    const response = await api.get("/products");
    return Array.isArray(response.data) ? response.data : [];
  } catch {
    const response = await api.get("/products/all");
    return Array.isArray(response.data) ? response.data : [];
  }
}

export function PurchaseList() {
  const [purchases, setPurchases] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const timer = setTimeout(async () => {
      setIsLoading(true);

      try {
        const response = await api.get("/purchases");
        setPurchases(Array.isArray(response.data) ? response.data : []);
      } catch (error) {
        console.error("Failed to load purchases:", error);
        setPurchases([]);
        alert(error.response?.data?.message || "Failed to load purchases");
      } finally {
        setIsLoading(false);
      }
    }, 0);

    return () => clearTimeout(timer);
  }, []);

  const filteredPurchases = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return purchases;

    return purchases.filter((purchase) => {
      const billNumber = String(purchase.billNumber || "").toLowerCase();
      const supplierName = String(purchase.supplierName || "").toLowerCase();
      const supplierCode = String(purchase.supplierCode || "").toLowerCase();
      return (
        billNumber.includes(query) ||
        supplierName.includes(query) ||
        supplierCode.includes(query)
      );
    });
  }, [purchases, searchQuery]);

  return (
    <div className="min-h-screen w-full bg-slate-50 p-6">
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-600">
              Stock Inward
            </p>
            <h2 className="mt-2 text-2xl font-black text-slate-900">
              Purchases
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Track supplier delivery bills and stock increases.
            </p>
          </div>

          <div className="flex w-full flex-col gap-3 md:w-auto md:flex-row md:items-end">
            <div className="w-full md:w-80">
              <label className="mb-2 block text-sm font-bold text-slate-600">
                Search
              </label>
              <input
                type="text"
                placeholder="Search by bill or supplier"
                className="w-full rounded-xl border-2 border-slate-200 p-3 outline-none focus:border-blue-500"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <Link
              to="/purchases/new"
              className="rounded-xl bg-blue-600 px-5 py-3 text-center text-sm font-bold text-white hover:bg-blue-700"
            >
              + New Purchase
            </Link>
          </div>
        </div>

        <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full min-w-[980px] text-left">
            <thead className="bg-slate-100">
              <tr>
                <th className="p-4 text-sm font-bold text-slate-600">Bill No</th>
                <th className="p-4 text-sm font-bold text-slate-600">
                  Supplier
                </th>
                <th className="p-4 text-sm font-bold text-slate-600">
                  Bill Date
                </th>
                <th className="p-4 text-sm font-bold text-slate-600">
                  Status
                </th>
                <th className="p-4 text-right text-sm font-bold text-slate-600">
                  Total
                </th>
                <th className="p-4 text-right text-sm font-bold text-slate-600">
                  Paid
                </th>
                <th className="p-4 text-right text-sm font-bold text-slate-600">
                  Due
                </th>
                <th className="p-4 text-right text-sm font-bold text-slate-600">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan="8" className="p-6 text-sm text-slate-500">
                    Loading purchase bills...
                  </td>
                </tr>
              ) : filteredPurchases.length > 0 ? (
                filteredPurchases.map((purchase) => (
                  <tr key={purchase.id} className="border-t border-slate-100">
                    <td className="p-4 font-semibold text-slate-800">
                      {purchase.billNumber || "-"}
                    </td>
                    <td className="p-4 text-slate-700">
                      {purchase.supplierName || "-"}
                    </td>
                    <td className="p-4 text-slate-700">
                      {formatDate(purchase.billDate)}
                    </td>
                    <td className="p-4">
                      <StatusBadge status={purchaseStatus(purchase)} />
                    </td>
                    <td className="p-4 text-right text-slate-800">
                      {money(purchase.totalAmount)}
                    </td>
                    <td className="p-4 text-right text-slate-700">
                      {money(purchase.paidAmount)}
                    </td>
                    <td className="p-4 text-right font-semibold text-slate-800">
                      {money(purchase.dueAmount)}
                    </td>
                    <td className="p-4 text-right">
                      <Link
                        to={`/purchases/${purchase.id}`}
                        className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-700"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" className="p-6 text-sm text-slate-500">
                    No purchase bills found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export function PurchaseForm() {
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [items, setItems] = useState([{ ...emptyItem }]);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [isLoadingOptions, setIsLoadingOptions] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const timer = setTimeout(async () => {
      setIsLoadingOptions(true);

      try {
        const [supplierData, productData] = await Promise.all([
          fetchSuppliers(),
          fetchProducts(),
        ]);
        setSuppliers(supplierData);
        setProducts(productData);
      } catch (error) {
        console.error("Failed to load purchase options:", error);
        setSuppliers([]);
        setProducts([]);
        alert(error.response?.data?.message || "Failed to load purchase data");
      } finally {
        setIsLoadingOptions(false);
      }
    }, 0);

    return () => clearTimeout(timer);
  }, []);

  const productOptions = useMemo(
    () =>
      [...products].sort((a, b) =>
        String(a.name || "").localeCompare(String(b.name || "")),
      ),
    [products],
  );

  const supplierOptions = useMemo(
    () =>
      [...suppliers].sort((a, b) =>
        String(a.name || "").localeCompare(String(b.name || "")),
      ),
    [suppliers],
  );

  const totals = useMemo(() => {
    const subTotalAmount = items.reduce((sum, item) => {
      return (
        sum +
        numberOrZero(item.quantity) * numberOrZero(item.purchasePrice)
      );
    }, 0);
    const discountAmount = numberOrZero(form.discountAmount);
    const taxAmount = numberOrZero(form.taxAmount);
    const paidAmount = numberOrZero(form.paidAmount);
    const totalAmount = subTotalAmount - discountAmount + taxAmount;
    const dueAmount = totalAmount - paidAmount;

    return { subTotalAmount, totalAmount, dueAmount };
  }, [form.discountAmount, form.paidAmount, form.taxAmount, items]);

  const validItems = items.filter((item) => {
    const productId = Number(item.productId);
    const quantity = Number(item.quantity);
    const purchasePrice = Number(item.purchasePrice);
    return (
      Number.isFinite(productId) &&
      productId > 0 &&
      Number.isFinite(quantity) &&
      quantity > 0 &&
      Number.isFinite(purchasePrice) &&
      purchasePrice >= 0
    );
  });

  const canSubmit =
    Number(form.supplierId) > 0 &&
    form.billNumber.trim() &&
    validItems.length > 0 &&
    !isSaving;
  const hasPaidAmount = numberOrZero(form.paidAmount) > 0;

  const handleFormChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleItemChange = (index, field, value) => {
    setItems((prev) =>
      prev.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item,
      ),
    );
  };

  const handleProductChange = (index, productId) => {
    const selectedProduct = products.find(
      (product) => String(product.id) === String(productId),
    );

    setItems((prev) =>
      prev.map((item, itemIndex) => {
        if (itemIndex !== index) return item;

        return {
          ...item,
          productId,
          purchasePrice:
            item.purchasePrice ||
            fieldAmount(
              selectedProduct?.costPrice ?? selectedProduct?.landingPrice,
            ),
          sellingPrice:
            item.sellingPrice ||
            fieldAmount(selectedProduct?.sellingPrice ?? selectedProduct?.price),
        };
      }),
    );
  };

  const addItem = () => {
    setItems((prev) => [...prev, { ...emptyItem }]);
  };

  const removeItem = (index) => {
    setItems((prev) =>
      prev.length === 1 ? prev : prev.filter((_, itemIndex) => itemIndex !== index),
    );
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!canSubmit) return;

    setIsSaving(true);

    try {
      const payload = {
        supplierId: Number(form.supplierId),
        billNumber: form.billNumber.trim(),
        discountAmount: numberOrZero(form.discountAmount),
        taxAmount: numberOrZero(form.taxAmount),
        paidAmount: numberOrZero(form.paidAmount),
        paymentMethod: hasPaidAmount ? form.paymentMethod : undefined,
        paymentReference: hasPaidAmount
          ? form.paymentReference.trim() || undefined
          : undefined,
        notes: form.notes.trim() || undefined,
        items: validItems.map((item) => ({
          productId: Number(item.productId),
          quantity: Number(item.quantity),
          purchasePrice: Number(item.purchasePrice),
          sellingPrice:
            item.sellingPrice === "" ? undefined : Number(item.sellingPrice),
        })),
      };

      if (form.billDate) payload.billDate = form.billDate;

      const response = await api.post("/purchases", payload);
      navigate(`/purchases/${response.data.id}`);
    } catch (error) {
      console.error("Failed to save purchase:", error);
      alert(error.response?.data?.message || "Failed to save purchase");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-50 p-6">
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-600">
              Stock Inward
            </p>
            <h2 className="mt-2 text-2xl font-black text-slate-900">
              New Purchase
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Save a supplier bill to increase stock and update product costs.
            </p>
          </div>
          <Link
            to="/purchases"
            className="rounded-xl border border-slate-300 px-4 py-3 text-center text-sm font-semibold text-slate-700 hover:bg-slate-100"
          >
            Back to List
          </Link>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-6">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-[1.5fr_1fr_1fr]">
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-600">
                  Supplier
                </label>
                <select
                  className="w-full rounded-xl border-2 border-slate-200 bg-white p-3 outline-none focus:border-blue-500"
                  value={form.supplierId}
                  onChange={(e) =>
                    handleFormChange("supplierId", e.target.value)
                  }
                  disabled={isLoadingOptions}
                >
                  <option value="">
                    {isLoadingOptions ? "Loading suppliers..." : "Select supplier"}
                  </option>
                  {supplierOptions.map((supplier) => (
                    <option key={supplier.id} value={supplier.id}>
                      {formatSupplierOption(supplier)}
                      {supplier.active === false ? " - Inactive" : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-600">
                  Bill Number
                </label>
                <input
                  type="text"
                  className="w-full rounded-xl border-2 border-slate-200 bg-white p-3 outline-none focus:border-blue-500"
                  value={form.billNumber}
                  onChange={(e) =>
                    handleFormChange("billNumber", e.target.value)
                  }
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-600">
                  Bill Date
                </label>
                <input
                  type="date"
                  className="w-full rounded-xl border-2 border-slate-200 bg-white p-3 outline-none focus:border-blue-500"
                  value={form.billDate}
                  onChange={(e) => handleFormChange("billDate", e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200">
            <div className="flex flex-col gap-3 border-b border-slate-200 bg-white p-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h3 className="text-lg font-black text-slate-900">Items</h3>
                <p className="mt-1 text-sm font-semibold text-slate-500">
                  {items.length} row{items.length === 1 ? "" : "s"}
                </p>
              </div>
              <button
                type="button"
                onClick={addItem}
                className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-bold text-blue-700 hover:bg-blue-100"
              >
                + Add Item
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[1040px] text-left">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="w-14 p-4 text-sm font-bold text-slate-600">
                      #
                    </th>
                    <th className="p-4 text-sm font-bold text-slate-600">
                      Product
                    </th>
                    <th className="w-36 p-4 text-right text-sm font-bold text-slate-600">
                      Quantity
                    </th>
                    <th className="w-44 p-4 text-right text-sm font-bold text-slate-600">
                      Purchase Price
                    </th>
                    <th className="w-44 p-4 text-right text-sm font-bold text-slate-600">
                      Selling Price
                    </th>
                    <th className="w-40 p-4 text-right text-sm font-bold text-slate-600">
                      Line Total
                    </th>
                    <th className="w-32 p-4 text-right text-sm font-bold text-slate-600">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => {
                    const lineTotal =
                      numberOrZero(item.quantity) *
                      numberOrZero(item.purchasePrice);

                    return (
                      <tr key={index} className="border-t border-slate-100">
                        <td className="p-4 align-top font-bold text-slate-500">
                          {index + 1}
                        </td>
                        <td className="p-4 align-top">
                          <select
                            className="w-full rounded-xl border-2 border-slate-200 bg-white p-3 outline-none focus:border-blue-500"
                            value={item.productId}
                            onChange={(e) =>
                              handleProductChange(index, e.target.value)
                            }
                            disabled={isLoadingOptions}
                          >
                            <option value="">
                              {isLoadingOptions
                                ? "Loading products..."
                                : "Select product"}
                            </option>
                            {productOptions.map((product) => (
                              <option key={product.id} value={product.id}>
                                {productLabel(product)}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="p-4 align-top">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            className="w-full rounded-xl border-2 border-slate-200 p-3 text-right outline-none focus:border-blue-500"
                            value={item.quantity}
                            onChange={(e) =>
                              handleItemChange(index, "quantity", e.target.value)
                            }
                          />
                        </td>
                        <td className="p-4 align-top">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            className="w-full rounded-xl border-2 border-slate-200 p-3 text-right outline-none focus:border-blue-500"
                            value={item.purchasePrice}
                            onChange={(e) =>
                              handleItemChange(
                                index,
                                "purchasePrice",
                                e.target.value,
                              )
                            }
                          />
                        </td>
                        <td className="p-4 align-top">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            className="w-full rounded-xl border-2 border-slate-200 p-3 text-right outline-none focus:border-blue-500"
                            value={item.sellingPrice}
                            onChange={(e) =>
                              handleItemChange(
                                index,
                                "sellingPrice",
                                e.target.value,
                              )
                            }
                          />
                        </td>
                        <td className="p-4 text-right align-top font-black text-slate-900">
                          {money(lineTotal)}
                        </td>
                        <td className="p-4 text-right align-top">
                          <button
                            type="button"
                            onClick={() => removeItem(index)}
                            disabled={items.length === 1}
                            className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_340px]">
            <div className="space-y-5">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-600">
                    Discount
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="w-full rounded-xl border-2 border-slate-200 p-3 outline-none focus:border-blue-500"
                    value={form.discountAmount}
                    onChange={(e) =>
                      handleFormChange("discountAmount", e.target.value)
                    }
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-600">
                    Tax
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="w-full rounded-xl border-2 border-slate-200 p-3 outline-none focus:border-blue-500"
                    value={form.taxAmount}
                    onChange={(e) =>
                      handleFormChange("taxAmount", e.target.value)
                    }
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-600">
                    Paid Amount
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="w-full rounded-xl border-2 border-slate-200 p-3 outline-none focus:border-blue-500"
                    value={form.paidAmount}
                    onChange={(e) =>
                      handleFormChange("paidAmount", e.target.value)
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-600">
                    Payment Method
                  </label>
                  <select
                    className="w-full rounded-xl border-2 border-slate-200 bg-white p-3 outline-none focus:border-blue-500 disabled:bg-slate-100"
                    value={form.paymentMethod}
                    onChange={(e) =>
                      handleFormChange("paymentMethod", e.target.value)
                    }
                    disabled={!hasPaidAmount}
                  >
                    {paymentMethods.map((method) => (
                      <option key={method} value={method}>
                        {method}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-600">
                    Payment Reference
                  </label>
                  <input
                    type="text"
                    className="w-full rounded-xl border-2 border-slate-200 p-3 outline-none focus:border-blue-500 disabled:bg-slate-100"
                    value={form.paymentReference}
                    onChange={(e) =>
                      handleFormChange("paymentReference", e.target.value)
                    }
                    disabled={!hasPaidAmount}
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-600">
                  Notes
                </label>
                <textarea
                  rows="3"
                  className="w-full resize-none rounded-xl border-2 border-slate-200 p-3 outline-none focus:border-blue-500"
                  value={form.notes}
                  onChange={(e) => handleFormChange("notes", e.target.value)}
                />
              </div>
            </div>

            <aside className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm font-bold text-slate-500">
                    Sub Total
                  </span>
                  <span className="text-lg font-black text-slate-900">
                    {money(totals.subTotalAmount)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm font-bold text-slate-500">
                    Discount
                  </span>
                  <span className="font-bold text-slate-700">
                    {money(numberOrZero(form.discountAmount))}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm font-bold text-slate-500">Tax</span>
                  <span className="font-bold text-slate-700">
                    {money(numberOrZero(form.taxAmount))}
                  </span>
                </div>
                <div className="border-t border-slate-200 pt-4">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-sm font-black text-slate-700">
                      Total
                    </span>
                    <span className="text-2xl font-black text-slate-900">
                      {money(totals.totalAmount)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm font-bold text-slate-500">Paid</span>
                  <span className="font-bold text-slate-700">
                    {money(numberOrZero(form.paidAmount))}
                  </span>
                </div>
                <div className="rounded-xl bg-white px-4 py-3">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-sm font-black text-slate-700">
                      Due
                    </span>
                    <span className="text-2xl font-black text-blue-700">
                      {money(totals.dueAmount)}
                    </span>
                  </div>
                </div>
              </div>
            </aside>
          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
            <Link
              to="/purchases"
              className="rounded-xl border border-slate-300 px-4 py-3 text-center text-sm font-semibold text-slate-700 hover:bg-slate-100"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={!canSubmit}
              className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 disabled:hover:bg-slate-200"
            >
              {isSaving ? "SAVING..." : "Save Purchase"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

export function PurchaseDetail() {
  const { id } = useParams();
  const [purchase, setPurchase] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [isCancelling, setIsCancelling] = useState(false);

  useEffect(() => {
    const timer = setTimeout(async () => {
      setIsLoading(true);

      try {
        const response = await api.get(`/purchases/${id}`);
        setPurchase(response.data || null);
      } catch (error) {
        console.error("Failed to load purchase detail:", error);
        setPurchase(null);
        alert(error.response?.data?.message || "Failed to load purchase bill");
      } finally {
        setIsLoading(false);
      }
    }, 0);

    return () => clearTimeout(timer);
  }, [id]);

  const handleCancelPurchase = async (event) => {
    event.preventDefault();

    if (!cancelReason.trim() || isCancelling) return;

    setIsCancelling(true);

    try {
      const response = await api.patch(`/purchases/${id}/cancel`, {
        reason: cancelReason.trim(),
      });
      setPurchase(response.data || null);
      setIsCancelModalOpen(false);
      setCancelReason("");
    } catch (error) {
      console.error("Failed to cancel purchase:", error);
      alert(error.response?.data?.message || "Failed to cancel purchase bill");
    } finally {
      setIsCancelling(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen w-full bg-slate-50 p-6">
        <section className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
          Loading purchase bill...
        </section>
      </div>
    );
  }

  if (!purchase) {
    return (
      <div className="min-h-screen w-full bg-slate-50 p-6">
        <section className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
          Purchase bill not found.
        </section>
      </div>
    );
  }

  const status = purchaseStatus(purchase);
  const isActive = status === "ACTIVE";

  return (
    <div className="min-h-screen w-full bg-slate-50 p-6">
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-600">
              Purchase Bill
            </p>
            <h2 className="mt-2 text-2xl font-black text-slate-900">
              {purchase.billNumber || `Purchase #${purchase.id}`}
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              {purchase.supplierName || "-"}{" "}
              {purchase.supplierCode ? `(${purchase.supplierCode})` : ""}
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            {isActive && (
              <button
                type="button"
                onClick={() => setIsCancelModalOpen(true)}
                className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-center text-sm font-bold text-rose-700 hover:bg-rose-100"
              >
                Cancel Purchase
              </button>
            )}
            <Link
              to="/purchases"
              className="rounded-xl border border-slate-300 px-4 py-3 text-center text-sm font-semibold text-slate-700 hover:bg-slate-100"
            >
              Back to List
            </Link>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-5">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
              Status
            </div>
            <div className="mt-2">
              <StatusBadge status={status} />
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
              Bill Date
            </div>
            <div className="mt-1 font-black text-slate-900">
              {formatDate(purchase.billDate)}
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
              Total
            </div>
            <div className="mt-1 font-black text-slate-900">
              {money(purchase.totalAmount)}
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
              Paid
            </div>
            <div className="mt-1 font-black text-slate-900">
              {money(purchase.paidAmount)}
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
              Due
            </div>
            <div className="mt-1 font-black text-slate-900">
              {money(purchase.dueAmount)}
            </div>
          </div>
        </div>

        {status === "CANCELLED" && (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-4">
            <div className="text-xs font-bold uppercase tracking-[0.14em] text-rose-700">
              Cancellation
            </div>
            <div className="mt-2 grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <div className="text-sm font-bold text-rose-900">
                  Cancel Reason
                </div>
                <div className="mt-1 text-sm font-semibold text-rose-800">
                  {purchase.cancelReason || "-"}
                </div>
              </div>
              <div>
                <div className="text-sm font-bold text-rose-900">
                  Cancelled At
                </div>
                <div className="mt-1 text-sm font-semibold text-rose-800">
                  {formatDateTime(purchase.cancelledAt)}
                </div>
              </div>
            </div>
          </div>
        )}

        {purchase.notes && (
          <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4 text-sm font-semibold text-slate-600">
            {purchase.notes}
          </div>
        )}

        <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full min-w-[820px] text-left">
            <thead className="bg-slate-100">
              <tr>
                <th className="p-4 text-sm font-bold text-slate-600">
                  Product
                </th>
                <th className="p-4 text-right text-sm font-bold text-slate-600">
                  Quantity
                </th>
                <th className="p-4 text-right text-sm font-bold text-slate-600">
                  Purchase Price
                </th>
                <th className="p-4 text-right text-sm font-bold text-slate-600">
                  Selling Price
                </th>
                <th className="p-4 text-right text-sm font-bold text-slate-600">
                  Line Total
                </th>
              </tr>
            </thead>
            <tbody>
              {(purchase.items || []).map((item, index) => (
                <tr
                  key={`${item.productId}-${index}`}
                  className="border-t border-slate-100"
                >
                  <td className="p-4 text-slate-800">
                    {item.productName || item.productId || "-"}
                  </td>
                  <td className="p-4 text-right text-slate-700">
                    {item.quantity ?? "-"}
                  </td>
                  <td className="p-4 text-right text-slate-700">
                    {money(item.purchasePrice)}
                  </td>
                  <td className="p-4 text-right text-slate-700">
                    {money(item.sellingPrice)}
                  </td>
                  <td className="p-4 text-right font-semibold text-slate-800">
                    {money(item.lineTotal)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {purchase.payments?.length > 0 && (
          <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full min-w-[680px] text-left">
              <thead className="bg-slate-100">
                <tr>
                  <th className="p-4 text-sm font-bold text-slate-600">
                    Method
                  </th>
                  <th className="p-4 text-right text-sm font-bold text-slate-600">
                    Amount
                  </th>
                  <th className="p-4 text-sm font-bold text-slate-600">
                    Reference
                  </th>
                  <th className="p-4 text-sm font-bold text-slate-600">
                    Created
                  </th>
                </tr>
              </thead>
              <tbody>
                {purchase.payments.map((payment, index) => (
                  <tr key={index} className="border-t border-slate-100">
                    <td className="p-4 text-slate-700">
                      {payment.method || "-"}
                    </td>
                    <td className="p-4 text-right text-slate-800">
                      {money(payment.amount)}
                    </td>
                    <td className="p-4 text-slate-700">
                      {payment.reference || "-"}
                    </td>
                    <td className="p-4 text-slate-700">
                      {payment.createdAt || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {isCancelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="text-sm font-semibold uppercase tracking-[0.18em] text-rose-600">
              Reverse Stock
            </div>
            <h3 className="mt-2 text-2xl font-black text-slate-900">
              Cancel Purchase Bill {purchase.billNumber || `#${purchase.id}`}?
            </h3>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              This will reverse product stock for all items in this purchase
              bill. This action should be used only for wrong entries.
            </p>

            <form onSubmit={handleCancelPurchase} className="mt-5 space-y-5">
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-600">
                  Reason
                </label>
                <textarea
                  rows="3"
                  className="w-full resize-none rounded-xl border-2 border-slate-200 p-3 outline-none focus:border-rose-500"
                  value={cancelReason}
                  onChange={(event) => setCancelReason(event.target.value)}
                  placeholder="Wrong quantity entered"
                />
              </div>

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => {
                    if (isCancelling) return;
                    setIsCancelModalOpen(false);
                    setCancelReason("");
                  }}
                  className="rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                >
                  Keep Bill
                </button>
                <button
                  type="submit"
                  disabled={!cancelReason.trim() || isCancelling}
                  className="rounded-xl bg-rose-600 px-5 py-3 text-sm font-bold text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 disabled:hover:bg-slate-200"
                >
                  {isCancelling ? "CANCELLING..." : "Cancel Purchase"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
