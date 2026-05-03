import React, { useEffect, useMemo, useRef, useState } from "react";
import api from "./api";
import BillSlots from "./components/newbill/BillSlots";
import PaymentModal from "./components/newbill/PaymentModal";

const HOLD_LIMIT = 5;
const PAYMENT_METHODS = ["Cash", "Card", "UPI", "Credit"];

function createEmptyBillSlot(slotNumber) {
  return {
    id: `slot-${slotNumber}`,
    label: `Bill ${slotNumber}`,
    customerName: "",
    contactNumber: "",
    selectedSalesman: "",
    salesmanQuery: "",
    searchQuery: "",
    cart: [],
  };
}

function createPaymentRow(amount = "") {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    method: "Cash",
    amount,
  };
}

function formatCurrency(value) {
  return `Rs ${Number(value || 0).toFixed(2)}`;
}

function getDiscountedUnitPrice(item) {
  const price = Number(item.price) || 0;
  const discountValue = Number(item.discount) || 0;
  const discountType = item.discountType || "PERCENT"; // PERCENT | AMOUNT

  if (discountType === "AMOUNT") {
    return Math.max(0, price - Math.min(price, discountValue));
  }

  const discountPercent = Math.min(100, Math.max(0, discountValue));
  return Math.max(0, price - (price * discountPercent) / 100);
}

function toDiscountPercent(item) {
  const price = Number(item.price) || 0;
  const discountValue = Number(item.discount) || 0;
  const discountType = item.discountType || "PERCENT"; // PERCENT | AMOUNT
  if (discountType === "AMOUNT") {
    if (price <= 0) return 0;
    return Math.max(0, Math.min(100, (discountValue / price) * 100));
  }
  return Math.max(0, Math.min(100, discountValue));
}

function toPaymentMethodEnum(value) {
  const normalized = String(value || "").trim().toUpperCase();
  if (normalized === "CASH") return "CASH";
  if (normalized === "CARD") return "CARD";
  if (normalized === "UPI") return "UPI";
  if (normalized === "CREDIT") return "CREDIT";
  return "CASH";
}

function getSlotDisplayName(slot) {
  const trimmedName = slot.customerName.trim();
  if (trimmedName) return trimmedName;
  if (slot.cart.length > 0) return `${slot.label} (${slot.cart.length} items)`;
  return slot.label;
}

export default function NewBill() {
  const [salesmen, setSalesmen] = useState([]);
  const [products, setProducts] = useState([]);
  const [billSlots, setBillSlots] = useState(() =>
    Array.from({ length: HOLD_LIMIT }, (_, index) =>
      createEmptyBillSlot(index + 1),
    ),
  );
  const [activeSlotId, setActiveSlotId] = useState("slot-1");
  const [searchResults, setSearchResults] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [toast, setToast] = useState("");
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentRows, setPaymentRows] = useState([]);
  const [paymentError, setPaymentError] = useState("");
  const [completedBill, setCompletedBill] = useState(null);
  const [billDiscountType, setBillDiscountType] = useState("PERCENT"); // PERCENT | AMOUNT
  const [billDiscountValue, setBillDiscountValue] = useState("");
  const [isProductSearchFocused, setIsProductSearchFocused] = useState(false);
  const productSearchRef = useRef(null);

  const activeBill =
    billSlots.find((slot) => slot.id === activeSlotId) || billSlots[0];

  const totals = useMemo(() => {
    let baseTaxable = 0;

    activeBill.cart.forEach((item) => {
      const qty = Number(item.qty) || 0;
      const itemTaxable = getDiscountedUnitPrice(item) * qty;
      baseTaxable += itemTaxable;
    });

    const discountNumeric =
      billDiscountValue === "" ? 0 : Number(billDiscountValue) || 0;

    const billDiscountAmount =
      billDiscountType === "AMOUNT"
        ? Math.max(0, Math.min(baseTaxable, discountNumeric))
        : Math.max(
            0,
            Math.min(baseTaxable, (baseTaxable * discountNumeric) / 100),
          );

    const taxable = Math.max(0, baseTaxable - billDiscountAmount);
    const cgst = taxable * 0.09;
    const sgst = taxable * 0.09;
    const grandTotal = taxable + cgst + sgst;

    return { baseTaxable, billDiscountAmount, taxable, cgst, sgst, grandTotal };
  }, [activeBill.cart, billDiscountType, billDiscountValue]);

  useEffect(() => {
    const fetchSalesmen = async () => {
      try {
        const response = await api.get("/salesman");
        setSalesmen(Array.isArray(response.data) ? response.data : []);
      } catch (err) {
        console.error("Salesman load failed:", err);
        setSalesmen([]);
      }
    };

    fetchSalesmen();
  }, []);

  useEffect(() => {
    const loadProducts = async () => {
      try {
        let response;
        try {
          response = await api.get("/products");
        } catch {
          response = await api.get("/products/all");
        }
        setProducts(Array.isArray(response.data) ? response.data : []);
      } catch (err) {
        console.error("Products load failed:", err);
        setProducts([]);
      }
    };

    loadProducts();
  }, []);

  useEffect(() => {
    if (!isProductSearchFocused) {
      setSearchResults([]);
      return undefined;
    }

    if (!activeBill?.searchQuery) return undefined;

    const delayDebounceFn = setTimeout(async () => {
      const query = activeBill.searchQuery.trim().toLowerCase();
      if (query.length < 2) return setSearchResults([]);

      const matches = products
        .filter((p) => {
          const name = (p.name || "").toLowerCase();
          const category = (p.category || "").toLowerCase();
          const barcode = (p.barcode || "").toLowerCase();
          return (
            name.includes(query) ||
            category.includes(query) ||
            barcode.includes(query)
          );
        })
        .slice(0, 50);

      setSearchResults(matches);
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [activeBill?.searchQuery, isProductSearchFocused, products]);

  useEffect(() => {
    if (!isProductSearchFocused) return undefined;

    const handlePointerDown = (event) => {
      if (!productSearchRef.current) return;
      if (productSearchRef.current.contains(event.target)) return;
      setIsProductSearchFocused(false);
      setSearchResults([]);
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
    };
  }, [isProductSearchFocused]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(""), 5000);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!isPaymentModalOpen) return;
    if (paymentRows.length !== 1) return;
    setPaymentRows((prev) => {
      if (prev.length !== 1) return prev;
      const [row] = prev;
      return [{ ...row, amount: totals.grandTotal.toFixed(2) }];
    });
  }, [isPaymentModalOpen, paymentRows.length, totals.grandTotal]);

  const updateActiveBill = (updates) => {
    setBillSlots((prev) =>
      prev.map((slot) =>
        slot.id === activeSlotId
          ? {
              ...slot,
              ...updates,
            }
          : slot,
      ),
    );
  };

  const replaceActiveBill = (nextBill) => {
    setBillSlots((prev) =>
      prev.map((slot) => (slot.id === activeSlotId ? nextBill : slot)),
    );
  };

  const addToCart = (product) => {
    if (!product.stockQuantity || product.stockQuantity <= 0) {
      setToast(`${product.name} is out of stock.`);
      return;
    }

    const existing = activeBill.cart.find((item) => item.id === product.id);
    let nextCart;

    if (existing) {
      const nextQty = existing.qty + 1;
      if (nextQty > existing.stockQuantity) {
        setToast(`${product.name} is out of stock.`);
        return;
      }

      nextCart = activeBill.cart.map((item) =>
        item.id === product.id ? { ...item, qty: nextQty } : item,
      );
    } else {
      nextCart = [
        ...activeBill.cart,
        { ...product, qty: 1, discount: 0, discountType: "PERCENT" },
      ];
    }

    updateActiveBill({
      cart: nextCart,
      searchQuery: "",
    });
    setSearchResults([]);
    setIsProductSearchFocused(false);
  };

  const updateQty = (id, delta) => {
    const nextCart = activeBill.cart.map((item) => {
      if (item.id !== id) return item;

      const stock = Number(item.stockQuantity) || 0;
      const newQty = item.qty + delta;

      if (delta > 0 && newQty > stock) {
        setToast(`${item.name} is out of stock.`);
        return item;
      }

      return { ...item, qty: Math.max(1, newQty) };
    });

    updateActiveBill({ cart: nextCart });
  };

  const updateDiscount = (id, value) => {
    updateActiveBill({
      cart: activeBill.cart.map((item) => {
        if (item.id !== id) return item;

        if ((item.discountType || "PERCENT") === "AMOUNT") {
          const amt = value === "" ? 0 : Math.max(0, parseFloat(value) || 0);
          return { ...item, discount: amt };
        }

        const numValue =
          value === "" ? 0 : Math.min(100, Math.max(0, parseFloat(value) || 0));
        return { ...item, discount: numValue };
      }),
    });
  };

  const toggleDiscountType = (id) => {
    updateActiveBill({
      cart: activeBill.cart.map((item) => {
        if (item.id !== id) return item;
        const current = item.discountType || "PERCENT";
        const next = current === "PERCENT" ? "AMOUNT" : "PERCENT";
        return { ...item, discountType: next, discount: 0 };
      }),
    });
  };

  const removeFromCart = (id) => {
    updateActiveBill({
      cart: activeBill.cart.filter((item) => item.id !== id),
    });
  };

  const clearActiveBill = () => {
    replaceActiveBill(createEmptyBillSlot(Number(activeSlotId.split("-")[1])));
    setSearchResults([]);
    setPaymentRows([]);
    setPaymentError("");
  };

  const filteredSalesmen = salesmen.filter((salesman) =>
    salesman.name
      ?.toLowerCase()
      .includes(activeBill.salesmanQuery.toLowerCase()),
  );

  const handleSalesmanSelect = (salesman) => {
    updateActiveBill({
      selectedSalesman: salesman.employeeId,
      salesmanQuery: salesman.name || "",
    });
  };

  const paymentTotal = paymentRows.reduce(
    (sum, row) => sum + (parseFloat(row.amount) || 0),
    0,
  );
  const paymentDifference = totals.grandTotal - paymentTotal;

  const formattedDayTime = currentTime.toLocaleString("en-IN", {
    weekday: "long",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  const formattedDate = currentTime.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  const openPaymentModal = () => {
    if (
      !activeBill.selectedSalesman ||
      activeBill.cart.length === 0 ||
      isSubmitting
    ) {
      return;
    }

    setPaymentRows([createPaymentRow(totals.grandTotal.toFixed(2))]);
    setBillDiscountType("PERCENT");
    setBillDiscountValue("");
    setPaymentError("");
    setIsPaymentModalOpen(true);
  };

  const closePaymentModal = () => {
    if (isSubmitting) return;
    setIsPaymentModalOpen(false);
    setPaymentError("");
  };

  const updatePaymentRow = (id, updates) => {
    setPaymentRows((prev) => {
      const nextRows = prev.map((row) =>
        row.id === id ? { ...row, ...updates } : row,
      );

      if (!Object.prototype.hasOwnProperty.call(updates, "amount")) {
        return nextRows;
      }

      if (nextRows.length < 2) return nextRows;

      const adjustableIndex = nextRows.findIndex((row) => row.id !== id);
      if (adjustableIndex === -1) return nextRows;

      const totalToCollect = totals.grandTotal;
      const sumExcludingAdjustable = nextRows.reduce((sum, row, index) => {
        if (index === adjustableIndex) return sum;
        return sum + (parseFloat(row.amount) || 0);
      }, 0);

      const remaining = Math.max(0, totalToCollect - sumExcludingAdjustable);
      const remainingString = remaining ? remaining.toFixed(2) : "0.00";

      return nextRows.map((row, index) =>
        index === adjustableIndex ? { ...row, amount: remainingString } : row,
      );
    });
  };

  const addPaymentRow = () => {
    if (paymentRows.length >= PAYMENT_METHODS.length) return;
    const remaining = Math.max(paymentDifference, 0);
    setPaymentRows((prev) => [
      ...prev,
      createPaymentRow(remaining ? remaining.toFixed(2) : ""),
    ]);
  };

  const removePaymentRow = (id) => {
    if (paymentRows.length === 1) return;
    setPaymentRows((prev) => prev.filter((row) => row.id !== id));
  };

  const fetchBillPdfBlob = async (billId) => {
    const response = await api.get(`/bills/${billId}/pdf`, {
      responseType: "blob",
    });

    return new Blob([response.data], { type: "application/pdf" });
  };

  const openPdfPreview = async (billId) => {
    const blob = await fetchBillPdfBlob(billId);
    const objectUrl = URL.createObjectURL(blob);
    const previewWindow = window.open(
      objectUrl,
      "_blank",
      "noopener,noreferrer",
    );
    if (!previewWindow) {
      const link = document.createElement("a");
      link.href = objectUrl;
      link.target = "_blank";
      document.body.appendChild(link);
      link.click();
      link.remove();
    }
    setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
  };

  const downloadPdf = async (billId) => {
    const blob = await fetchBillPdfBlob(billId);
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = `invoice_${billId}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
  };

  const handleConfirmPayment = async () => {
    if (isSubmitting) return;

    const normalizedPayments = paymentRows.map((row) => ({
      ...row,
      amount: parseFloat(row.amount) || 0,
    }));

    const hasInvalidAmount = normalizedPayments.some((row) => row.amount <= 0);
    if (hasInvalidAmount) {
      setPaymentError("Enter a valid amount for each payment method.");
      return;
    }

    const normalizedTotal = normalizedPayments.reduce(
      (sum, row) => sum + row.amount,
      0,
    );

    if (Math.abs(normalizedTotal - totals.grandTotal) > 0.05) {
      setPaymentError("Payment split must match the full bill amount.");
      return;
    }

    setIsSubmitting(true);
    setPaymentError("");

    try {
      const billData = {
        salesmanEmployeeId: activeBill.selectedSalesman,
        items: activeBill.cart.map((item) => ({
          productName: item.name,
          quantity: item.qty,
          discount: toDiscountPercent(item),
          unitSellingPrice: Number(item.price) || 0,
        })),
        customerName: activeBill.customerName.trim() || "Guest",
        contactInfo: activeBill.contactNumber.trim() || "N/A",
        payments: normalizedPayments.map((row) => ({
          method: toPaymentMethodEnum(row.method),
          amount: Number(row.amount) || 0,
          reference: null,
        })),
      };

      const response = await api.post("/bills", billData);
      const createdBillId =
        response.data?.id ??
        response.data?.billId ??
        response.data?.bill?.id ??
        null;

      if (
        (response.status === 200 || response.status === 201) &&
        createdBillId
      ) {
        setCompletedBill({
          id: createdBillId,
          customerName: activeBill.customerName.trim() || "Guest",
          total: totals.grandTotal,
          payments: normalizedPayments,
        });
        setIsPaymentModalOpen(false);
        clearActiveBill();
      } else {
        setPaymentError("Bill was saved but no bill ID was returned.");
      }
    } catch (err) {
      console.error("Billing Error:", err);
      setPaymentError(err.response?.data?.message || "Failed to save bill.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrintBill = async () => {
    if (!completedBill?.id) return;

    try {
      await openPdfPreview(completedBill.id);
      await downloadPdf(completedBill.id);
    } catch (err) {
      console.error("PDF open/download failed:", err);
      setToast("Could not open the bill PDF.");
    }
  };

  return (
    <div className="w-full p-6 font-sans">
      {toast && (
        <div className="fixed left-1/2 top-6 z-50 -translate-x-1/2 rounded-lg bg-red-500 px-6 py-3 font-bold text-white shadow-lg">
          {toast}
        </div>
      )}

      {isPaymentModalOpen && (
        <PaymentModal
          activeBill={activeBill}
          addPaymentRow={addPaymentRow}
          billDiscountType={billDiscountType}
          billDiscountValue={billDiscountValue}
          closePaymentModal={closePaymentModal}
          formatCurrency={formatCurrency}
          handleConfirmPayment={handleConfirmPayment}
          isSubmitting={isSubmitting}
          paymentDifference={paymentDifference}
          paymentError={paymentError}
          paymentMethods={PAYMENT_METHODS}
          paymentRows={paymentRows}
          paymentTotal={paymentTotal}
          removePaymentRow={removePaymentRow}
          setBillDiscountType={setBillDiscountType}
          setBillDiscountValue={setBillDiscountValue}
          totals={totals}
          updatePaymentRow={updatePaymentRow}
        />
      )}

      {completedBill && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl">
            <h2 className="text-2xl font-black text-slate-900">
              Bill Ready For Print
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Payment is complete. Open the PDF bill and download it for the
              customer.
            </p>

            <div className="mt-6 grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-5 md:grid-cols-2">
              <div>
                <div className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  Bill ID
                </div>
                <div className="mt-2 text-lg font-bold text-slate-900">
                  {completedBill.id}
                </div>
              </div>
              <div>
                <div className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  Total Paid
                </div>
                <div className="mt-2 text-lg font-bold text-slate-900">
                  {formatCurrency(completedBill.total)}
                </div>
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-slate-200">
              <div className="border-b border-slate-200 bg-slate-100 px-4 py-3 text-sm font-bold text-slate-700">
                Payment Summary
              </div>
              <div className="divide-y divide-slate-100">
                {completedBill.payments.map((payment) => (
                  <div
                    key={payment.id}
                    className="flex items-center justify-between px-4 py-3 text-sm"
                  >
                    <span className="font-semibold text-slate-700">
                      {payment.method}
                    </span>
                    <span className="font-bold text-slate-900">
                      {formatCurrency(payment.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={() => setCompletedBill(null)}
                className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-100"
              >
                Done
              </button>
              <button
                type="button"
                onClick={async () => {
                  try {
                    await openPdfPreview(completedBill.id);
                  } catch (err) {
                    console.error("PDF preview failed:", err);
                    setToast("Could not open the bill PDF.");
                  }
                }}
                className="rounded-xl border border-blue-300 px-5 py-3 text-sm font-bold text-blue-700 hover:bg-blue-50"
              >
                View PDF
              </button>
              <button
                type="button"
                onClick={async () => {
                  try {
                    await downloadPdf(completedBill.id);
                  } catch (err) {
                    console.error("PDF download failed:", err);
                    setToast("Could not download the bill PDF.");
                  }
                }}
                className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-100"
              >
                Download PDF
              </button>
              <button
                type="button"
                onClick={handlePrintBill}
                className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white hover:bg-blue-700"
              >
                Print Bill
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="min-h-full w-full rounded-none border-0 bg-transparent p-0 shadow-none">
        <div className="mb-6 flex flex-col gap-4 border-b pb-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-black text-slate-900">New Bill</h1>
              <p className="mt-2 text-sm text-slate-500">
                Hold up to five customer bills and switch between them anytime.
              </p>
            </div>

            <div className="text-right">
              <div className="text-sm font-semibold text-slate-700">
                {formattedDayTime}
              </div>
              <div className="text-xs text-slate-500">{formattedDate}</div>
            </div>
          </div>

          <BillSlots
            billSlots={billSlots}
            activeSlotId={activeSlotId}
            getSlotDisplayName={getSlotDisplayName}
            onSelectSlot={(slotId) => {
              setActiveSlotId(slotId);
              setSearchResults([]);
            }}
          />
        </div>

        <div className="mb-8 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-black text-slate-900">
              Working On: {getSlotDisplayName(activeBill)}
            </h2>
            <button
              type="button"
              onClick={clearActiveBill}
              disabled={
                activeBill.cart.length === 0 &&
                !activeBill.customerName &&
                !activeBill.contactNumber &&
                !activeBill.selectedSalesman
              }
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-40"
            >
              Clear This Bill
            </button>
          </div>

          <div className="w-full space-y-4">
            <div className="flex flex-wrap items-center gap-4">
              <label className="w-36 shrink-0 text-sm font-bold text-slate-600">
                Customer Name
              </label>
              <input
                type="text"
                placeholder="Enter customer name"
                className="w-full max-w-md rounded-xl border-2 border-slate-200 p-3 outline-none focus:border-blue-500"
                value={activeBill.customerName}
                onChange={(e) =>
                  updateActiveBill({ customerName: e.target.value })
                }
              />
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <label className="w-36 shrink-0 text-sm font-bold text-slate-600">
                Contact Number
              </label>
              <input
                type="tel"
                placeholder="Enter contact number"
                className="w-full max-w-md rounded-xl border-2 border-slate-200 p-3 outline-none focus:border-blue-500"
                value={activeBill.contactNumber}
                onChange={(e) =>
                  updateActiveBill({ contactNumber: e.target.value })
                }
              />
            </div>
          </div>
        </div>

        <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="relative">
            <label className="mb-2 block text-sm font-bold text-slate-600">
              Salesman
            </label>
            <input
              type="text"
              placeholder="Search salesman..."
              className="w-full rounded-xl border-2 border-slate-200 p-3 outline-none focus:border-blue-500"
              value={activeBill.salesmanQuery}
              onChange={(e) =>
                updateActiveBill({
                  salesmanQuery: e.target.value,
                  selectedSalesman: "",
                })
              }
            />
            {activeBill.salesmanQuery.trim().length > 0 &&
              !activeBill.selectedSalesman && (
                <div className="absolute z-20 mt-1 max-h-60 w-full overflow-y-auto rounded-xl border bg-white shadow-2xl">
                  {filteredSalesmen.length > 0 ? (
                    filteredSalesmen.map((salesman) => (
                      <button
                        key={salesman.employeeId}
                        type="button"
                        onClick={() => handleSalesmanSelect(salesman)}
                        className="flex w-full justify-between border-b p-3 text-left hover:bg-blue-50"
                      >
                        <span>{salesman.name}</span>
                        <span className="text-sm text-slate-500">
                          {salesman.employeeId}
                        </span>
                      </button>
                    ))
                  ) : (
                    <div className="p-3 text-sm text-slate-500">
                      No salesman found
                    </div>
                  )}
                </div>
              )}
          </div>

          <div className="relative" ref={productSearchRef}>
            <label className="mb-2 block text-sm font-bold text-slate-600">
              Product Search
            </label>
            <input
              type="text"
              placeholder="Search by name, category, or barcode..."
              className="w-full rounded-xl border-2 border-slate-200 p-3 outline-none focus:border-blue-500"
              value={activeBill.searchQuery}
              onChange={(e) =>
                updateActiveBill({ searchQuery: e.target.value })
              }
              onFocus={() => setIsProductSearchFocused(true)}
            />
            {isProductSearchFocused && searchResults.length > 0 && (
              <div className="absolute z-20 mt-1 max-h-60 w-full overflow-y-auto rounded-xl border bg-white shadow-2xl">
                {searchResults.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => addToCart(p)}
                    className="flex cursor-pointer justify-between border-b p-3 hover:bg-blue-50"
                  >
                    <span>{p.name}</span>
                    <span className="font-bold text-blue-600">
                      {formatCurrency(p.price)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="mb-8 overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <table className="w-full text-left">
            <thead className="bg-slate-100">
              <tr>
                <th className="p-4 font-bold text-slate-600">Item</th>
                <th className="p-4 text-center font-bold text-slate-600">
                  Qty
                </th>
                <th className="p-4 text-right font-bold text-slate-600">
                  Price
                </th>
                <th className="p-4 text-right font-bold text-slate-600">
                  Disc
                </th>
                <th className="p-4 text-right font-bold text-slate-600">
                  Total
                </th>
                <th className="p-4 text-center font-bold text-slate-600">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {activeBill.cart.length > 0 ? (
                activeBill.cart.map((item) => (
                  <tr key={item.id} className="border-t border-slate-100">
                    <td className="p-4 text-slate-800">{item.name}</td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => updateQty(item.id, -1)}
                          className="h-8 w-8 rounded-full border border-slate-200 text-lg font-bold hover:bg-slate-100"
                          aria-label={`Decrease quantity for ${item.name}`}
                        >
                          -
                        </button>
                        <span className="min-w-8 font-bold">{item.qty}</span>
                        <button
                          type="button"
                          onClick={() => updateQty(item.id, 1)}
                          className="h-8 w-8 rounded-full border border-slate-200 text-lg font-bold hover:bg-slate-100"
                          aria-label={`Increase quantity for ${item.name}`}
                        >
                          +
                        </button>
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      {formatCurrency(item.price)}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => toggleDiscountType(item.id)}
                          className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-black text-slate-700 hover:bg-slate-100"
                          aria-label={`Switch discount type for ${item.name}`}
                          title="Toggle discount type"
                        >
                          {(item.discountType || "PERCENT") === "AMOUNT"
                            ? "₹"
                            : "%"}
                        </button>
                        <input
                          type="number"
                          className="w-20 border-b border-slate-300 bg-transparent text-right outline-none"
                          min="0"
                          max={
                            (item.discountType || "PERCENT") === "AMOUNT"
                              ? undefined
                              : 100
                          }
                          step="0.01"
                          value={item.discount === 0 ? "" : item.discount}
                          onChange={(e) =>
                            updateDiscount(item.id, e.target.value)
                          }
                        />
                      </div>
                    </td>
                    <td className="p-4 text-right font-bold text-blue-600">
                      {formatCurrency(getDiscountedUnitPrice(item) * item.qty)}
                    </td>
                    <td className="p-4 text-center">
                      <button
                        type="button"
                        onClick={() => removeFromCart(item.id)}
                        className="rounded-lg px-3 py-2 text-sm font-bold text-red-500 hover:bg-red-50"
                        aria-label={`Remove ${item.name} from cart`}
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan="6"
                    className="p-8 text-center text-sm text-slate-500"
                  >
                    This held bill is empty. Search products to start adding
                    items.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col items-end gap-2 border-t pt-6">
          <div className="text-right text-sm text-slate-500">
            <p>Taxable: {formatCurrency(totals.taxable)}</p>
            <p>CGST (9%): {formatCurrency(totals.cgst)}</p>
            <p>SGST (9%): {formatCurrency(totals.sgst)}</p>
          </div>
          <h2 className="text-5xl font-black text-slate-900">
            {formatCurrency(totals.grandTotal)}
          </h2>
          <button
            type="button"
            onClick={openPaymentModal}
            disabled={
              activeBill.cart.length === 0 ||
              !activeBill.selectedSalesman ||
              isSubmitting
            }
            className="mt-4 rounded-xl bg-blue-600 px-12 py-4 font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 disabled:hover:bg-slate-200"
          >
            COMPLETE BILLING
          </button>
        </div>
      </div>
    </div>
  );
}
