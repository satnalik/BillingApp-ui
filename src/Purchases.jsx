import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
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

const initialSupplierPaymentForm = {
  amount: "",
  method: "CASH",
  reference: "",
};

const emptyItem = {
  productId: "",
  barcodeScan: "",
  barcodeMessage: "",
  quantity: "",
  purchasePrice: "",
  sellingPrice: "",
};

const initialNewProductForm = {
  barcode: "",
  name: "",
  itemType: "PACKAGE",
  category: "",
  costPrice: "",
  sellingPrice: "",
  mrp: "",
  quantity: "",
  targetRowIndex: null,
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

function labelCountValue(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0) return 0;
  return Math.floor(amount);
}

function productLabel(product) {
  const name = String(product?.name || "").trim();
  const barcode = String(product?.barcode || "").trim();
  if (name && barcode) return `${name} (${barcode})`;
  return name || barcode || `Product #${product?.id}`;
}

async function fetchProducts(supplierId, searchText = "") {
  const params = { supplierId };
  const query = searchText.trim();
  const path = query ? "/products/search" : "/products";
  if (query) params.name = query;

  const response = await api.get(path, { params });
  return Array.isArray(response.data) ? response.data : [];
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
                    <td className="p-4">
                      <span
                        className={`inline-flex rounded-lg px-2.5 py-1 font-semibold ${
                          numberOrZero(purchase.dueAmount) > 0
                            ? "bg-rose-50 text-rose-700"
                            : "text-slate-800"
                        }`}
                      >
                        {purchase.billNumber || "-"}
                      </span>
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
                    <td
                      className={`p-4 text-right font-semibold ${
                        numberOrZero(purchase.dueAmount) > 0
                          ? "text-rose-700"
                          : "text-slate-800"
                      }`}
                    >
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
  const [isProductsLoading, setIsProductsLoading] = useState(false);
  const [productSearchQuery, setProductSearchQuery] = useState("");
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [newProductForm, setNewProductForm] = useState(initialNewProductForm);
  const [isProductSaving, setIsProductSaving] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const timer = setTimeout(async () => {
      setIsLoadingOptions(true);

      try {
        const supplierData = await fetchSuppliers();
        setSuppliers(supplierData);
      } catch (error) {
        console.error("Failed to load purchase options:", error);
        setSuppliers([]);
        alert(error.response?.data?.message || "Failed to load purchase data");
      } finally {
        setIsLoadingOptions(false);
      }
    }, 0);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const supplierId = Number(form.supplierId);
    if (!Number.isFinite(supplierId) || supplierId <= 0) {
      setProducts([]);
      return undefined;
    }

    const timer = setTimeout(async () => {
      setIsProductsLoading(true);

      try {
        const productData = await fetchProducts(
          supplierId,
          productSearchQuery,
        );
        setProducts(productData);
      } catch (error) {
        console.error("Failed to load supplier products:", error);
        setProducts([]);
        alert(error.response?.data?.message || "Failed to load supplier products");
      } finally {
        setIsProductsLoading(false);
      }
    }, productSearchQuery.trim() ? 250 : 0);

    return () => clearTimeout(timer);
  }, [form.supplierId, productSearchQuery]);

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

  const handleSupplierChange = (value) => {
    setForm((prev) => ({ ...prev, supplierId: value }));
    setProductSearchQuery("");
    setItems([{ ...emptyItem }]);
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

    applyProductToItem(index, selectedProduct || { id: productId });
  };

  const applyProductToItem = (index, product) => {
    setItems((prev) =>
      prev.map((item, itemIndex) => {
        if (itemIndex !== index) return item;

        return {
          ...item,
          productId: String(product?.id || ""),
          barcodeScan: String(product?.barcode || item.barcodeScan || ""),
          barcodeMessage: "",
          purchasePrice:
            item.purchasePrice ||
            fieldAmount(
              product?.costPrice ?? product?.landingPrice,
            ),
          sellingPrice:
            item.sellingPrice ||
            fieldAmount(product?.sellingPrice ?? product?.price),
        };
      }),
    );
  };

  const openNewProductModal = ({ barcode = "", rowIndex = null } = {}) => {
    const row = Number.isInteger(rowIndex) ? items[rowIndex] : null;

    setNewProductForm({
      ...initialNewProductForm,
      barcode,
      quantity: row?.quantity || "",
      targetRowIndex: rowIndex,
    });
    setIsProductModalOpen(true);
  };

  const handleBarcodeLookup = async (index) => {
    const barcode = String(items[index]?.barcodeScan || "").trim();
    const supplierId = Number(form.supplierId);
    if (!barcode || !Number.isFinite(supplierId) || supplierId <= 0) return;

    handleItemChange(index, "barcodeMessage", "Searching barcode...");

    try {
      const response = await api.get(
        `/products/barcode/${encodeURIComponent(barcode)}`,
        { params: { supplierId } },
      );
      const product = response.data;
      const productSupplierId = Number(
        product?.supplier?.id ?? product?.supplierId ?? "",
      );

      if (
        Number.isFinite(productSupplierId) &&
        productSupplierId > 0 &&
        productSupplierId !== supplierId
      ) {
        throw new Error("Product belongs to another supplier.");
      }

      if (!product?.id) throw new Error("Product not found.");

      setProducts((prev) => {
        if (prev.some((item) => String(item.id) === String(product.id))) {
          return prev;
        }
        return [...prev, product];
      });
      applyProductToItem(index, product);
    } catch (error) {
      console.error("Barcode lookup failed:", error);
      setItems((prev) =>
        prev.map((item, itemIndex) =>
          itemIndex === index
            ? {
                ...item,
                productId: "",
                barcodeMessage: "Product not found. Add new product?",
              }
            : item,
        ),
      );
    }
  };

  const addItem = () => {
    setItems((prev) => [...prev, { ...emptyItem }]);
  };

  const removeItem = (index) => {
    setItems((prev) =>
      prev.length === 1 ? prev : prev.filter((_, itemIndex) => itemIndex !== index),
    );
  };

  const handleNewProductChange = (field, value) => {
    setNewProductForm((prev) => ({ ...prev, [field]: value }));
  };

  const closeProductModal = () => {
    if (isProductSaving) return;
    setIsProductModalOpen(false);
    setNewProductForm(initialNewProductForm);
  };

  const handleCreateProduct = async (event) => {
    event.preventDefault();
    if (isProductSaving) return;

    const supplierId = Number(form.supplierId);
    const barcode = newProductForm.barcode.trim();
    const name = newProductForm.name.trim();
    const itemType = String(newProductForm.itemType || "PACKAGE").toUpperCase();
    const sellingPrice = Number(newProductForm.sellingPrice);
    const quantity = Number(newProductForm.quantity);

    if (
      !name ||
      !Number.isFinite(supplierId) ||
      supplierId <= 0 ||
      !Number.isFinite(sellingPrice) ||
      !Number.isFinite(quantity) ||
      quantity <= 0
    ) {
      return;
    }

    setIsProductSaving(true);

    try {
      const payload = {
        name,
        itemType,
        supplier: { id: supplierId },
        category: newProductForm.category.trim() || null,
        stockQuantity: 0,
        costPrice:
          newProductForm.costPrice === ""
            ? null
            : Number(newProductForm.costPrice),
        sellingPrice,
        price: sellingPrice,
        mrp: newProductForm.mrp === "" ? null : Number(newProductForm.mrp),
      };

      if (barcode) payload.barcode = barcode;

      const response = await api.post("/products", payload);
      const createdProduct = response.data;
      const nextProducts = await fetchProducts(supplierId, productSearchQuery);
      setProducts(nextProducts);

      if (createdProduct?.id) {
        setItems((prev) => {
          const explicitTargetIndex = Number(newProductForm.targetRowIndex);
          const targetIndex =
            Number.isInteger(explicitTargetIndex) &&
            explicitTargetIndex >= 0 &&
            explicitTargetIndex < prev.length
              ? explicitTargetIndex
              : prev.findLastIndex((item) => !item.productId);
          const nextItem = {
            ...emptyItem,
            productId: String(createdProduct.id),
            barcodeScan: barcode,
            barcodeMessage: "",
            quantity: fieldAmount(quantity),
            purchasePrice: fieldAmount(payload.costPrice),
            sellingPrice: fieldAmount(sellingPrice),
          };

          if (targetIndex === -1) return [...prev, nextItem];

          return prev.map((item, index) =>
            index === targetIndex
              ? {
                  ...item,
                  productId: String(createdProduct.id),
                  barcodeScan: barcode || item.barcodeScan,
                  barcodeMessage: "",
                  quantity: item.quantity || fieldAmount(quantity),
                  purchasePrice: item.purchasePrice || fieldAmount(payload.costPrice),
                  sellingPrice: item.sellingPrice || fieldAmount(sellingPrice),
                }
              : item,
          );
        });
      }

      setIsProductModalOpen(false);
      setNewProductForm(initialNewProductForm);
    } catch (error) {
      console.error("Failed to create product:", error);
      alert(error.response?.data?.message || "Failed to create product");
    } finally {
      setIsProductSaving(false);
    }
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
      navigate(`/purchases/${response.data.id}`, {
        state: { generateBarcodes: true },
      });
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
                    handleSupplierChange(e.target.value)
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
              <div className="flex flex-col gap-3 md:flex-row md:items-end">
                <div className="w-full md:w-72">
                  <label className="mb-2 block text-sm font-bold text-slate-600">
                    Product Search
                  </label>
                  <input
                    type="text"
                    placeholder={
                      form.supplierId ? "Search supplier products" : "Select supplier first"
                    }
                    className="w-full rounded-xl border-2 border-slate-200 p-3 outline-none focus:border-blue-500 disabled:bg-slate-100"
                    value={productSearchQuery}
                    onChange={(event) =>
                      setProductSearchQuery(event.target.value)
                    }
                    disabled={!form.supplierId}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => openNewProductModal()}
                  disabled={!form.supplierId}
                  className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
                >
                  Add New Product
                </button>
                <button
                  type="button"
                  onClick={addItem}
                  className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-bold text-blue-700 hover:bg-blue-100"
                >
                  + Add Item
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[1180px] text-left">
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
                          <div className="overflow-hidden rounded-xl border-2 border-slate-200 bg-white focus-within:border-blue-500">
                            <div className="flex items-center gap-2 px-3 py-2.5">
                              <span className="w-16 shrink-0 text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                                Scan
                              </span>
                              <input
                                type="text"
                                placeholder={
                                  form.supplierId
                                    ? "Barcode"
                                    : "Select supplier first"
                                }
                                className="min-w-0 flex-1 border-0 bg-transparent p-0 text-sm font-semibold text-slate-800 outline-none placeholder:text-slate-400 disabled:text-slate-400"
                                value={item.barcodeScan}
                                onChange={(event) =>
                                  handleItemChange(
                                    index,
                                    "barcodeScan",
                                    event.target.value,
                                  )
                                }
                                onKeyDown={(event) => {
                                  if (event.key !== "Enter") return;
                                  event.preventDefault();
                                  handleBarcodeLookup(index);
                                }}
                                disabled={!form.supplierId}
                              />
                              <button
                                type="button"
                                onClick={() => handleBarcodeLookup(index)}
                                disabled={
                                  !form.supplierId || !item.barcodeScan.trim()
                                }
                                className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-black text-slate-700 hover:bg-slate-200 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-300"
                              >
                                Find
                              </button>
                            </div>

                            {item.barcodeMessage && (
                              <div className="flex flex-wrap items-center gap-2 border-t border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800">
                                <span>{item.barcodeMessage}</span>
                                {item.barcodeMessage.includes("Add new") && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      openNewProductModal({
                                        barcode: item.barcodeScan.trim(),
                                        rowIndex: index,
                                      })
                                    }
                                    className="rounded-lg bg-amber-600 px-3 py-1.5 text-white hover:bg-amber-700"
                                  >
                                    Add Product
                                  </button>
                                )}
                              </div>
                            )}

                            <div className="flex items-center gap-2 border-t border-slate-200 px-3 py-2.5">
                              <span className="w-16 shrink-0 text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                                Product
                              </span>
                              <select
                                className="min-w-0 flex-1 border-0 bg-transparent p-0 text-sm font-semibold text-slate-800 outline-none disabled:text-slate-400"
                                value={item.productId}
                                onChange={(e) =>
                                  handleProductChange(index, e.target.value)
                                }
                                disabled={
                                  isLoadingOptions ||
                                  isProductsLoading ||
                                  !form.supplierId
                                }
                              >
                                <option value="">
                                  {!form.supplierId
                                    ? "Select supplier first"
                                    : isProductsLoading
                                      ? "Loading products..."
                                      : "Select product"}
                                </option>
                                {productOptions.map((product) => (
                                  <option key={product.id} value={product.id}>
                                    {productLabel(product)}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
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
                    <span
                      className={`text-2xl font-black ${
                        totals.dueAmount > 0 ? "text-rose-700" : "text-blue-700"
                      }`}
                    >
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

        {isProductModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
            <div className="w-full max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-600">
                    Supplier Product
                  </p>
                  <h3 className="mt-2 text-2xl font-black text-slate-900">
                    Add New Product
                  </h3>
                  <p className="mt-2 text-sm font-semibold text-slate-500">
                    Barcode is optional. Missing barcodes are generated after
                    the purchase bill is saved.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeProductModal}
                  className="text-sm font-semibold text-slate-400 hover:text-slate-600"
                >
                  Close
                </button>
              </div>

              <form onSubmit={handleCreateProduct} className="mt-6 space-y-5">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-bold text-slate-600">
                      Barcode / Scan Barcode
                    </label>
                    <input
                      type="text"
                      className="w-full rounded-xl border-2 border-slate-200 p-3 outline-none focus:border-blue-500"
                      value={newProductForm.barcode}
                      onChange={(event) =>
                        handleNewProductChange("barcode", event.target.value)
                      }
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-bold text-slate-600">
                      Name
                    </label>
                    <input
                      type="text"
                      className="w-full rounded-xl border-2 border-slate-200 p-3 outline-none focus:border-blue-500"
                      value={newProductForm.name}
                      onChange={(event) =>
                        handleNewProductChange("name", event.target.value)
                      }
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-bold text-slate-600">
                      Category
                    </label>
                    <input
                      type="text"
                      className="w-full rounded-xl border-2 border-slate-200 p-3 outline-none focus:border-blue-500"
                      value={newProductForm.category}
                      onChange={(event) =>
                        handleNewProductChange("category", event.target.value)
                      }
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-bold text-slate-600">
                      Item Type
                    </label>
                    <select
                      className="w-full rounded-xl border-2 border-slate-200 bg-white p-3 outline-none focus:border-blue-500"
                      value={newProductForm.itemType}
                      onChange={(event) =>
                        handleNewProductChange("itemType", event.target.value)
                      }
                    >
                      <option value="PACKAGE">PACKAGE</option>
                      <option value="LOOSE">LOOSE</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-bold text-slate-600">
                      Purchase Quantity
                    </label>
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      className="w-full rounded-xl border-2 border-slate-200 p-3 outline-none focus:border-blue-500"
                      value={newProductForm.quantity}
                      onChange={(event) =>
                        handleNewProductChange(
                          "quantity",
                          event.target.value,
                        )
                      }
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-bold text-slate-600">
                      Cost Price
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className="w-full rounded-xl border-2 border-slate-200 p-3 outline-none focus:border-blue-500"
                      value={newProductForm.costPrice}
                      onChange={(event) =>
                        handleNewProductChange("costPrice", event.target.value)
                      }
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-bold text-slate-600">
                      Selling Price
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className="w-full rounded-xl border-2 border-slate-200 p-3 outline-none focus:border-blue-500"
                      value={newProductForm.sellingPrice}
                      onChange={(event) =>
                        handleNewProductChange(
                          "sellingPrice",
                          event.target.value,
                        )
                      }
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-bold text-slate-600">
                      MRP
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className="w-full rounded-xl border-2 border-slate-200 p-3 outline-none focus:border-blue-500"
                      value={newProductForm.mrp}
                      onChange={(event) =>
                        handleNewProductChange("mrp", event.target.value)
                      }
                    />
                  </div>
                </div>

                <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={closeProductModal}
                    className="rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={
                      isProductSaving ||
                      !newProductForm.name.trim() ||
                      !Number.isFinite(Number(newProductForm.sellingPrice)) ||
                      !Number.isFinite(Number(newProductForm.quantity)) ||
                      Number(newProductForm.quantity) <= 0
                    }
                    className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 disabled:hover:bg-slate-200"
                  >
                    {isProductSaving ? "SAVING..." : "Add Product"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

export function PurchaseDetail() {
  const { id } = useParams();
  const location = useLocation();
  const [purchase, setPurchase] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [isCancelling, setIsCancelling] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentForm, setPaymentForm] = useState(initialSupplierPaymentForm);
  const [paymentError, setPaymentError] = useState("");
  const [paymentToast, setPaymentToast] = useState("");
  const [isRecordingPayment, setIsRecordingPayment] = useState(false);
  const [labelData, setLabelData] = useState(null);
  const [labelRows, setLabelRows] = useState([]);
  const [isGeneratingLabels, setIsGeneratingLabels] = useState(false);
  const [isPrintingLabels, setIsPrintingLabels] = useState(false);
  const [labelError, setLabelError] = useState("");
  const [showLabelPreview, setShowLabelPreview] = useState(false);
  const [hasAutoGeneratedLabels, setHasAutoGeneratedLabels] = useState(false);

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

  const handlePaymentFormChange = (field, value) => {
    setPaymentForm((prev) => ({ ...prev, [field]: value }));
  };

  const closePaymentModal = () => {
    if (isRecordingPayment) return;
    setIsPaymentModalOpen(false);
    setPaymentForm(initialSupplierPaymentForm);
    setPaymentError("");
  };

  const handleOpenPaymentModal = () => {
    setPaymentForm((prev) => ({
      ...prev,
      amount:
        prev.amount ||
        (Number(purchase?.dueAmount) > 0 ? String(purchase.dueAmount) : ""),
    }));
    setPaymentError("");
    setIsPaymentModalOpen(true);
  };

  const handleRecordPayment = async (event) => {
    event.preventDefault();
    if (isRecordingPayment) return;

    const amount = Number(paymentForm.amount);
    const dueAmount = Number(purchase?.dueAmount);
    const method = String(paymentForm.method || "").trim().toUpperCase();

    if (!Number.isFinite(amount) || amount <= 0) {
      setPaymentError("Enter a payment amount greater than zero.");
      return;
    }

    if (Number.isFinite(dueAmount) && amount > dueAmount) {
      setPaymentError("Payment amount cannot exceed current due amount.");
      return;
    }

    if (!paymentMethods.includes(method)) {
      setPaymentError("Choose CASH, UPI, or CARD.");
      return;
    }

    setIsRecordingPayment(true);
    setPaymentError("");
    setPaymentToast("");

    try {
      const response = await api.post(`/purchases/${id}/payments`, {
        method,
        amount,
        reference: paymentForm.reference.trim() || null,
      });
      setPurchase(response.data || null);
      setPaymentToast("Supplier payment recorded.");
      setIsPaymentModalOpen(false);
      setPaymentForm(initialSupplierPaymentForm);
    } catch (error) {
      console.error("Failed to record supplier payment:", error);
      setPaymentError(
        error.response?.data?.message || "Failed to record supplier payment.",
      );
    } finally {
      setIsRecordingPayment(false);
    }
  };

  const handleGenerateBarcodes = async () => {
    if (isGeneratingLabels) return;

    setIsGeneratingLabels(true);
    setLabelError("");

    try {
      const response = await api.post(
        `/purchases/${id}/barcode-labels/generate`,
      );
      const data = response.data || {};
      const nextRows = Array.isArray(data.items)
        ? data.items.map((item, index) => ({
            ...item,
            rowKey: `${item.productId ?? "product"}-${item.barcode ?? index}`,
            labelsToPrint: labelCountValue(
              item.labelsToPrint ?? item.quantityReceived,
            ),
          }))
        : [];

      setLabelData(data);
      setLabelRows(nextRows);
      setShowLabelPreview(true);
    } catch (error) {
      console.error("Failed to generate barcode labels:", error);
      setLabelError(
        error.response?.data?.message ||
          "Failed to generate barcode labels. Check that the supplier has a supplier code.",
      );
    } finally {
      setIsGeneratingLabels(false);
    }
  };

  const handleLabelCountChange = (rowKey, value) => {
    setLabelRows((prev) =>
      prev.map((row) =>
        row.rowKey === rowKey
          ? { ...row, labelsToPrint: labelCountValue(value) }
          : row,
      ),
    );
  };

  const handlePrintLabels = async () => {
    if (isPrintingLabels || labelRows.length === 0) return;

    setIsPrintingLabels(true);
    setLabelError("");

    try {
      const payload = {
        items: labelRows.map((item) => ({
          productId: Number(item.productId),
          labelsToPrint: labelCountValue(item.labelsToPrint),
        })),
      };

      const response = await api.post(
        `/purchases/${id}/barcode-labels/pdf`,
        payload,
        {
          headers: { "Content-Type": "application/json" },
          responseType: "blob",
        },
      );

      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      window.open(url, "_blank", "noopener,noreferrer");
      window.setTimeout(() => window.URL.revokeObjectURL(url), 60_000);
    } catch (error) {
      console.error("Failed to print barcode labels:", error);
      setLabelError(
        error.response?.data?.message ||
          "Failed to generate barcode label PDF.",
      );
    } finally {
      setIsPrintingLabels(false);
    }
  };

  useEffect(() => {
    if (!location.state?.generateBarcodes) return;
    if (!purchase || hasAutoGeneratedLabels) return;
    if (purchaseStatus(purchase) === "CANCELLED") return;

    setHasAutoGeneratedLabels(true);
    handleGenerateBarcodes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasAutoGeneratedLabels, location.state, purchase]);

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
  const isCancelled = status === "CANCELLED";
  const hasLabelRows = labelRows.length > 0;
  const hasPaidAmount = numberOrZero(purchase.paidAmount) > 0;
  const hasSupplierDue = isActive && numberOrZero(purchase.dueAmount) > 0;
  const paymentAmount = Number(paymentForm.amount);
  const canRecordPayment =
    hasSupplierDue &&
    Number.isFinite(paymentAmount) &&
    paymentAmount > 0 &&
    paymentAmount <= numberOrZero(purchase.dueAmount) &&
    paymentMethods.includes(String(paymentForm.method).toUpperCase()) &&
    !isRecordingPayment;

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
            {hasSupplierDue && (
              <button
                type="button"
                onClick={handleOpenPaymentModal}
                className="rounded-xl bg-emerald-600 px-4 py-3 text-center text-sm font-bold text-white hover:bg-emerald-700"
              >
                Record Supplier Payment
              </button>
            )}
            {!isCancelled && (
              <button
                type="button"
                onClick={handleGenerateBarcodes}
                disabled={isGeneratingLabels}
                className="rounded-xl bg-blue-600 px-4 py-3 text-center text-sm font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 disabled:hover:bg-slate-200"
              >
                {isGeneratingLabels ? "Generating..." : "Generate Barcodes"}
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowLabelPreview(true)}
              disabled={!hasLabelRows}
              className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-center text-sm font-bold text-blue-700 hover:bg-blue-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400 disabled:hover:bg-slate-100"
            >
              Preview Labels
            </button>
            {!isCancelled && (
              <button
                type="button"
                onClick={handlePrintLabels}
                disabled={!hasLabelRows || isPrintingLabels}
                title={
                  hasLabelRows
                    ? "Open barcode label PDF"
                    : "Generate barcodes first to preview labels."
                }
                className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-center text-sm font-bold text-emerald-700 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400 disabled:hover:bg-slate-100"
              >
                {isPrintingLabels ? "Preparing PDF..." : "Print / Download PDF"}
              </button>
            )}
            {isActive && (
              <button
                type="button"
                onClick={() => {
                  if (hasPaidAmount) return;
                  setIsCancelModalOpen(true);
                }}
                disabled={hasPaidAmount}
                title={
                  hasPaidAmount
                    ? "Cannot cancel a purchase after payment is recorded."
                    : "Cancel purchase"
                }
                className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-center text-sm font-bold text-rose-700 hover:bg-rose-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400 disabled:hover:bg-slate-100"
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

        {labelError && (
          <div className="mt-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
            {labelError}
          </div>
        )}

        {paymentToast && (
          <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
            {paymentToast}
          </div>
        )}

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
            <div
              className={`mt-1 font-black ${
                numberOrZero(purchase.dueAmount) > 0
                  ? "text-rose-700"
                  : "text-slate-900"
              }`}
            >
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

        {showLabelPreview && hasLabelRows && (
          <div className="mt-6 rounded-xl border border-slate-200">
            <div className="flex flex-col gap-2 border-b border-slate-200 bg-white p-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h3 className="text-lg font-black text-slate-900">
                  Barcode Label Preview
                </h3>
                <p className="mt-1 text-sm font-semibold text-slate-500">
                  {labelData?.supplierName || purchase.supplierName || "-"}{" "}
                  {labelData?.supplierCode ? `(${labelData.supplierCode})` : ""}
                </p>
              </div>
              <div className="text-sm font-bold text-slate-600">
                Total labels:{" "}
                <span className="text-slate-900">
                  {labelRows.reduce(
                    (sum, item) => sum + labelCountValue(item.labelsToPrint),
                    0,
                  )}
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="p-4 text-sm font-bold text-slate-600">
                      Product
                    </th>
                    <th className="p-4 text-sm font-bold text-slate-600">
                      Barcode
                    </th>
                    <th className="p-4 text-right text-sm font-bold text-slate-600">
                      Qty Received
                    </th>
                    <th className="p-4 text-right text-sm font-bold text-slate-600">
                      Labels To Print
                    </th>
                    <th className="p-4 text-right text-sm font-bold text-slate-600">
                      Selling Price
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {labelRows.map((item) => (
                    <tr key={item.rowKey} className="border-t border-slate-100">
                      <td className="p-4 text-slate-800">
                        <div className="font-semibold">
                          {item.productName || item.productId || "-"}
                        </div>
                        {item.category && (
                          <div className="mt-1 text-xs font-bold uppercase tracking-[0.12em] text-slate-400">
                            {item.category}
                          </div>
                        )}
                      </td>
                      <td className="p-4 font-mono text-sm font-bold text-slate-800">
                        {item.barcode || "-"}
                      </td>
                      <td className="p-4 text-right text-slate-700">
                        {item.quantityReceived ?? "-"}
                      </td>
                      <td className="p-4 text-right">
                        <input
                          type="number"
                          min="0"
                          step="1"
                          className="ml-auto w-28 rounded-xl border-2 border-slate-200 p-2 text-right font-semibold text-slate-800 outline-none focus:border-blue-500"
                          value={item.labelsToPrint}
                          onChange={(event) =>
                            handleLabelCountChange(
                              item.rowKey,
                              event.target.value,
                            )
                          }
                        />
                      </td>
                      <td className="p-4 text-right text-slate-700">
                        {money(item.sellingPrice)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

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

      {isPaymentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-600">
              Supplier Payment
            </div>
            <h3 className="mt-2 text-2xl font-black text-slate-900">
              Record Supplier Payment
            </h3>
            <p className="mt-2 text-sm font-semibold text-slate-500">
              Current due: {money(purchase.dueAmount)}
            </p>

            {paymentError && (
              <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
                {paymentError}
              </div>
            )}

            <form onSubmit={handleRecordPayment} className="mt-5 space-y-5">
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-600">
                  Amount
                </label>
                <input
                  type="number"
                  min="0.01"
                  max={numberOrZero(purchase.dueAmount)}
                  step="0.01"
                  className="w-full rounded-xl border-2 border-slate-200 p-3 outline-none focus:border-emerald-500"
                  value={paymentForm.amount}
                  onChange={(event) =>
                    handlePaymentFormChange("amount", event.target.value)
                  }
                  disabled={isRecordingPayment}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-600">
                  Payment Method
                </label>
                <select
                  className="w-full rounded-xl border-2 border-slate-200 bg-white p-3 outline-none focus:border-emerald-500"
                  value={paymentForm.method}
                  onChange={(event) =>
                    handlePaymentFormChange("method", event.target.value)
                  }
                  disabled={isRecordingPayment}
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
                  Reference / Transaction ID
                </label>
                <input
                  type="text"
                  className="w-full rounded-xl border-2 border-slate-200 p-3 outline-none focus:border-emerald-500"
                  value={paymentForm.reference}
                  onChange={(event) =>
                    handlePaymentFormChange("reference", event.target.value)
                  }
                  disabled={isRecordingPayment}
                />
              </div>

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closePaymentModal}
                  className="rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!canRecordPayment}
                  className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 disabled:hover:bg-slate-200"
                >
                  {isRecordingPayment ? "RECORDING..." : "Record Payment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
