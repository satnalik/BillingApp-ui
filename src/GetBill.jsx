/* eslint-disable react-hooks/set-state-in-effect */
import React, { useEffect, useMemo, useState } from "react";
import api from "./api";
import { useSearchParams } from "react-router-dom";

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function toDisplay(value) {
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function toHumanDateTime(value) {
  if (value === null || value === undefined || value === "") return "-";

  const date =
    value instanceof Date
      ? value
      : typeof value === "number"
        ? new Date(value)
        : new Date(String(value));

  if (Number.isNaN(date.getTime())) return toDisplay(value);

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
}

function toHumanDate(value) {
  if (value === null || value === undefined || value === "") return "-";

  const date =
    value instanceof Date
      ? value
      : typeof value === "number"
        ? new Date(value)
        : new Date(String(value));

  if (Number.isNaN(date.getTime())) return toDisplay(value);

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function tryGetBillItems(bill) {
  return (
    bill?.items ||
    bill?.billItems ||
    bill?.lineItems ||
    bill?.billLineItems ||
    []
  );
}

function numberOrZero(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function getPaymentsTotal(bill) {
  return asArray(bill?.payments).reduce((sum, p) => {
    return sum + numberOrZero(p?.amount);
  }, 0);
}

function roundToPaise(value) {
  return Math.round(numberOrZero(value) * 100) / 100;
}

function buildPaymentsForDisplay(bill) {
  const raw = asArray(bill?.payments);
  if (raw.length <= 1) return raw;

  // Some backends record credit movements as a +amount and a matching -amount.
  // Group by method/reference and hide net-zero groups for a clearer UI.
  const grouped = new Map();
  const order = [];

  for (const p of raw) {
    const method = String(p?.method ?? "-");
    const reference = p?.reference == null || p?.reference === "" ? "-" : String(p.reference);
    const key = `${method}|${reference}`;
    const amount = roundToPaise(p?.amount);

    if (!grouped.has(key)) {
      grouped.set(key, { ...p, method, reference: reference === "-" ? null : reference, amount: 0 });
      order.push(key);
    }

    const current = grouped.get(key);
    current.amount = roundToPaise(numberOrZero(current.amount) + amount);
    grouped.set(key, current);
  }

  return order
    .map((key) => grouped.get(key))
    .filter((p) => Math.abs(roundToPaise(p?.amount)) >= 0.01);
}

function buildItemsForDisplay(items) {
  const raw = asArray(items);
  if (raw.length <= 1) return raw;

  // Deduplicate identical rows only when items don't have stable ids.
  const hasStableIds = raw.every((item) => item && item.id != null);
  if (hasStableIds) return raw;

  const seen = new Set();
  const deduped = [];

  for (const item of raw) {
    const qty = roundToPaise(item?.quantity ?? item?.qty ?? 0);
    const price = roundToPaise(
      item?.price ??
        item?.unitPrice ??
        item?.unitSellingPrice ??
        item?.priceAtSale ??
        item?.productPrice ??
        item?.unitprice ??
        item?.product?.price ??
        0,
    );
    const discount = roundToPaise(item?.discount ?? item?.discountPercent ?? 0);
    const apiTotal = roundToPaise(
      item?.total ??
        item?.lineTotal ??
        item?.itemTotal ??
        item?.amount ??
        item?.totalAmount ??
        item?.netAmount ??
        0,
    );

    const name = String(item?.productName ?? item?.name ?? "-");
    const signature = `${name}|${qty}|${discount}|${price}|${apiTotal}`;

    if (seen.has(signature)) continue;
    seen.add(signature);
    deduped.push(item);
  }

  return deduped;
}

function getEffectivePaidAmount(bill) {
  const paidAmount = numberOrZero(bill?.paidAmount);
  const paymentsTotal = getPaymentsTotal(bill);
  return Math.max(paidAmount, paymentsTotal);
}

function getEffectiveDueAmount(bill) {
  const apiDue = numberOrZero(bill?.dueAmount);
  const totalAmount = numberOrZero(bill?.totalAmount);
  const effectivePaid = getEffectivePaidAmount(bill);

  // UI should primarily respect the server's `dueAmount` when present to avoid
  // incorrectly hiding "Collect Due" for genuinely pending bills. We keep the
  // derived value as a fallback only when `dueAmount` is not provided.
  if (Number.isFinite(apiDue) && apiDue > 0) return apiDue;
  if (totalAmount > 0) return Math.max(0, totalAmount - effectivePaid);
  return apiDue;
}

export default function GetBill() {
  const [searchParams] = useSearchParams();
  const [billId, setBillId] = useState("");
  const [bill, setBill] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isPdfLoading, setIsPdfLoading] = useState(false);
  const [isCollectModalOpen, setIsCollectModalOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentReference, setPaymentReference] = useState("");
  const [isPaying, setIsPaying] = useState(false);
  const [toast, setToast] = useState("");
  const [recentPayment, setRecentPayment] = useState({ key: "", at: 0 });

  const normalizedId = billId.trim();

  const pdfId = useMemo(() => {
    return bill?.id ?? (normalizedId ? normalizedId : "");
  }, [bill?.id, normalizedId]);

  const handleOpenPdf = async () => {
    if (!pdfId || isPdfLoading) return;

    setIsPdfLoading(true);
    setError("");

    try {
      const response = await api.get(`/bills/${pdfId}/pdf`, {
        responseType: "blob",
      });

      const blob = new Blob([response.data], { type: "application/pdf" });
      const objectUrl = URL.createObjectURL(blob);

      const opened = window.open(objectUrl, "_blank", "noopener,noreferrer");
      if (!opened) {
        const a = document.createElement("a");
        a.href = objectUrl;
        a.download = `invoice_${pdfId}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      }

      // Give the browser a moment to start loading the URL before revoking.
      setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
    } catch (err) {
      console.error("Open PDF failed:", err);
      setError(err.response?.data?.message || "Failed to open PDF.");
    } finally {
      setIsPdfLoading(false);
    }
  };

  const detailsRows = useMemo(() => {
    if (!bill) return [];

    const createdAt = bill.createdAt ?? bill.createdOn ?? bill.createdDate;
    const createdAtDate = createdAt ? new Date(createdAt) : null;

    const exchangeInfo = (() => {
      if (!createdAtDate || Number.isNaN(createdAtDate.getTime())) {
        return null;
      }

      const windowDays = 15;
      const dayMs = 24 * 60 * 60 * 1000;
      const exchangeUntil = new Date(
        createdAtDate.getTime() + windowDays * dayMs,
      );
      const now = new Date();

      if (now.getTime() <= exchangeUntil.getTime()) {
        return {
          status: "open",
          until: exchangeUntil,
          daysPassed: 0,
        };
      }

      const daysPassed = Math.ceil(
        (now.getTime() - exchangeUntil.getTime()) / dayMs,
      );

      return {
        status: "closed",
        until: exchangeUntil,
        daysPassed,
      };
    })();

    return [
      ["Bill ID", bill.id ?? normalizedId],
      ["Customer Name", bill.customerName],
      ["Contact", bill.contactInfo ?? bill.contactNumber ?? bill.phoneNumber],
      ["Exchange Window", exchangeInfo],
      [
        "Salesman",
        bill.salesMan?.name ??
          bill.salesman?.name ??
          bill.salesMan?.employeeId ??
          bill.salesman?.employeeId,
      ],
      ["Created At", createdAt ? toHumanDateTime(createdAt) : undefined],
      ["Status", bill.status],
    ].filter((row) => row[1] !== undefined);
  }, [bill, normalizedId]);

  const items = useMemo(() => {
    return asArray(tryGetBillItems(bill));
  }, [bill]);

  const displayPayments = useMemo(() => buildPaymentsForDisplay(bill), [bill]);
  const displayItems = useMemo(() => buildItemsForDisplay(items), [items]);

  const handleFetch = async (e) => {
    if (e?.preventDefault) e.preventDefault();
    if (!normalizedId || isLoading) return;

    setIsLoading(true);
    setError("");
    setBill(null);

    try {
      const candidateRequests = [
        () => api.get(`/bills/${normalizedId}`),
        () => api.get(`/bill/${normalizedId}`),
        () => api.get(`/bills/id/${normalizedId}`),
        () => api.get(`/bills/byId/${normalizedId}`),
        () => api.get(`/bills/get/${normalizedId}`),
        () => api.get(`/bills/getBill/${normalizedId}`),
        () => api.get(`/bills/getBillById/${normalizedId}`),
        () => api.get(`/bills`, { params: { billId: normalizedId } }),
        () => api.get(`/bills`, { params: { id: normalizedId } }),
      ];

      let lastError = null;
      let bestData = null;
      let bestScore = -1;

      for (const request of candidateRequests) {
        try {
          const response = await request();
          const responseData = response?.data;

          let data = null;
          if (Array.isArray(responseData)) {
            data = responseData[0] ?? null;
          } else if (responseData && typeof responseData === "object") {
            data = responseData;
          } else {
            data = responseData ?? null;
          }

          if (data) {
            const score =
              (data?.id ? 3 : 0) +
              (Object.prototype.hasOwnProperty.call(data ?? {}, "dueAmount")
                ? 2
                : 0) +
              (Object.prototype.hasOwnProperty.call(data ?? {}, "paidAmount")
                ? 1
                : 0) +
              (Array.isArray(data?.payments) ? 2 : 0) +
              (Array.isArray(tryGetBillItems(data)) ? 1 : 0);

            if (score > bestScore) {
              bestScore = score;
              bestData = data;
            }

            // If we already got a rich payload with payments + due,
            // we can stop trying other endpoints.
            if (score >= 7) break;
          }
        } catch (requestError) {
          lastError = requestError;
        }
      }

      if (!bestData) {
        throw lastError || new Error("No data returned for this bill.");
      }

      setBill(bestData);
    } catch (err) {
      console.error("Get bill failed:", err);
      setError(err.response?.data?.message || "Bill not found.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const fromQuery = (searchParams.get("billId") || "").trim();
    if (!fromQuery) return;
    if (fromQuery === billId.trim()) return;
    setBillId(fromQuery);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  useEffect(() => {
    const fromQuery = (searchParams.get("billId") || "").trim();
    if (!fromQuery) return;
    if (fromQuery !== normalizedId) return;
    if (bill || isLoading) return;
    handleFetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [normalizedId, searchParams]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(""), 2500);
    return () => clearTimeout(timer);
  }, [toast]);

  const dueAmount = getEffectiveDueAmount(bill);
  const openCollectModal = () => {
    if (!bill?.id) return;
    if (isPaying) return;
    if (dueAmount <= 0) return;
    setPaymentMethod("CASH");
    setPaymentAmount(dueAmount.toFixed(2));
    setPaymentReference("");
    setIsCollectModalOpen(true);
  };

  const handleConfirmPayment = async () => {
    if (!bill?.id || isPaying) return;

    const amount = Number(paymentAmount);
    if (!Number.isFinite(amount) || amount <= 0) return;
    if (amount > dueAmount) return;

    setIsPaying(true);
    setError("");

    try {
      const payload = {
        method: String(paymentMethod || "CASH").trim().toUpperCase(),
        amount,
        reference: paymentReference.trim() || null,
      };

      const paymentKey = `${bill.id}|${payload.method}|${payload.amount}|${payload.reference || ""}`;
      const now = Date.now();
      if (recentPayment.key === paymentKey && now - recentPayment.at < 60_000) {
        setToast("Payment already recorded. Refreshing…");
        await handleFetch();
        return;
      }

      await api.post(`/bills/${bill.id}/payments`, payload);
      setToast("Payment recorded.");
      setIsCollectModalOpen(false);
      setRecentPayment({ key: paymentKey, at: now });

      // Optimistically update bill so "Collect Due" doesn't remain clickable
      // while the server is still processing / returning stale dueAmount.
      setBill((current) => {
        if (!current) return current;
        const currentDue = numberOrZero(current?.dueAmount);
        const currentPaid = numberOrZero(current?.paidAmount);

        const nextPayment = {
          id: `local-${Date.now()}`,
          method: payload.method,
          amount: payload.amount,
          reference: payload.reference,
          createdAt: new Date().toISOString(),
        };

        return {
          ...current,
          payments: [...asArray(current.payments), nextPayment],
          paidAmount: currentPaid + payload.amount,
          dueAmount: Math.max(0, currentDue - payload.amount),
        };
      });

      // Refresh bill details after payment (server source of truth)
      await handleFetch();
    } catch (err) {
      console.error("Collect due failed:", err);
      setError(err.response?.data?.message || "Failed to record payment.");
    } finally {
      setIsPaying(false);
    }
  };

  return (
    <div className="w-full p-6">
      <section className="rounded-none border-0 bg-transparent p-0 shadow-none">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            {/* <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-600">
              Billing Lookup
            </p> */}
            <h2 className="mt-2 text-2xl font-black text-slate-900">
              Enter a bill ID to fetch the complete bill details.
            </h2>
            {/* <p className="mt-2 text-sm leading-6 text-slate-500">
              Enter a bill ID to fetch the complete bill details.
            </p> */}
          </div>

          <div className="flex items-end gap-3">
            <form onSubmit={handleFetch} className="flex items-end gap-3">
              <div className="w-72">
                <label className="mb-2 block text-sm font-bold text-slate-600">
                  Bill ID
                </label>
                <input
                  type="text"
                  placeholder="e.g. 101"
                  className="w-full rounded-xl border-2 border-slate-200 p-3 outline-none focus:border-blue-500"
                  value={billId}
                  onChange={(e) => setBillId(e.target.value)}
                />
              </div>

                <button
                  type="submit"
                  disabled={!normalizedId || isLoading}
                  className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 disabled:hover:bg-slate-200"
                >
                  {isLoading ? "SEARCHING..." : "SEARCH"}
                </button>
              </form>

            <button
              type="button"
              onClick={handleOpenPdf}
              disabled={!pdfId || isPdfLoading}
              className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
            >
              {isPdfLoading ? "OPENING..." : "OPEN PDF"}
            </button>
          </div>
        </div>

        {toast && (
          <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
            {toast}
          </div>
        )}

        {error && (
          <div className="mt-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
            {error}
          </div>
        )}

        {bill && (
          <div className="mt-6 space-y-6">
            <div className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 to-white shadow-md overflow-hidden">
              <div className="flex items-center gap-2 border-b border-blue-100 bg-blue-100/70 px-6 py-4">
                <svg
                  className="h-6 w-6 text-blue-500"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <rect x="3" y="4" width="18" height="16" rx="3" />
                  <path d="M16 2v4M8 2v4M3 10h18" />
                </svg>
                <span className="text-base font-extrabold tracking-wide text-blue-700">
                  Bill Details
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
                {detailsRows.map(([label, value]) => (
                  <div
                    key={label}
                    className="bg-white/80 rounded-xl shadow-sm border border-slate-100 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-bold uppercase tracking-wider text-blue-500">
                        {label}
                      </div>
                      {label === "Exchange Window" &&
                      value &&
                      typeof value === "object" ? (
                        <div className="mt-1 text-base font-semibold">
                          {value.status === "open" ? (
                            <span className="text-emerald-600">
                              Exchange window open till {toHumanDate(value.until)}
                            </span>
                          ) : (
                            <span className="text-rose-600">
                              Exchange window closed ({value.daysPassed} day
                              {value.daysPassed === 1 ? "" : "s"} passed)
                            </span>
                          )}
                        </div>
                      ) : (
                        <div className="mt-1 truncate text-base font-semibold text-slate-800">
                          {toDisplay(value)}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
             </div>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:col-span-1">
                <div className="text-xs font-extrabold uppercase tracking-[0.18em] text-slate-500">
                  Pending Due
                </div>
                <div className="mt-2 flex flex-wrap gap-2 text-sm font-semibold text-slate-700">
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-800">
                    Total: {Number(bill?.totalAmount ?? 0).toFixed(2)}
                  </span>
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-700">
                    Paid: {Number(bill?.paidAmount ?? 0).toFixed(2)}
                  </span>
                  <span className="rounded-full bg-amber-50 px-3 py-1 text-amber-700">
                    Due: {Number(bill?.dueAmount ?? 0).toFixed(2)}
                  </span>
                </div>
                {dueAmount > 0 && (
                  <button
                    type="button"
                    onClick={openCollectModal}
                    disabled={isPaying || dueAmount <= 0}
                    className="mt-4 w-full rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 disabled:hover:bg-slate-200"
                  >
                    Collect Due
                  </button>
                )}
              </div>

              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm md:col-span-2">
                <div className="border-b border-slate-200 bg-slate-100 px-4 py-3 text-sm font-bold text-slate-700">
                  Payments
                </div>
                <table className="w-full text-left">
                  <thead className="bg-white">
                    <tr>
                      <th className="p-4 text-sm font-bold text-slate-600">
                        Method
                      </th>
                      <th className="p-4 text-sm font-bold text-slate-600 text-right">
                        Amount
                      </th>
                      <th className="p-4 text-sm font-bold text-slate-600">
                        Reference
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayPayments.length > 0 ? (
                      displayPayments.map((p, idx) => (
                        <tr
                          key={p.id ?? `${p.method}-${idx}`}
                          className="border-t border-slate-100"
                        >
                          <td className="p-4 text-slate-800">
                            {toDisplay(p.method)}
                          </td>
                          <td className="p-4 text-right font-semibold text-slate-900">
                            {Number(p.amount ?? 0).toFixed(2)}
                          </td>
                          <td className="p-4 text-slate-700">
                            {toDisplay(p.reference)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="3" className="p-6 text-sm text-slate-500">
                          No payments recorded for this bill.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-200">
              <div className="border-b border-slate-200 bg-slate-100 px-4 py-3 text-sm font-bold text-slate-700">
                Items
              </div>
              <table className="w-full text-left">
                <thead className="bg-white">
                  <tr>
                    <th className="p-4 text-sm font-bold text-slate-600">
                      Product
                    </th>
                    <th className="p-4 text-sm font-bold text-slate-600 text-right">
                      Qty
                    </th>
                    <th className="p-4 text-sm font-bold text-slate-600 text-right">
                      Discount (%)
                    </th>
                    <th className="p-4 text-sm font-bold text-slate-600 text-right">
                      Price
                    </th>
                    <th className="p-4 text-sm font-bold text-slate-600 text-right">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                    {items.length > 0 ? (
                    displayItems.map((item, idx) => {
                      const qty = Number(item.quantity ?? item.qty ?? 0) || 0;
                      const price =
                        Number(
                          item.price ??
                            item.unitPrice ??
                            item.unitSellingPrice ??
                            item.priceAtSale ??
                            item.productPrice ??
                            item.unitprice ??
                            item.product?.price ??
                            0,
                        ) || 0;
                      const discount =
                        Number(item.discount ?? item.discountPercent ?? 0) || 0;
                      const discountedPrice = price - (price * discount) / 100;
                      const apiTotal =
                        Number(
                          item.total ??
                            item.lineTotal ??
                            item.itemTotal ??
                            item.amount ??
                            item.totalAmount ??
                            item.netAmount ??
                            0,
                        ) || 0;
                      const total = apiTotal || discountedPrice * qty;

                      return (
                        <tr
                          key={item.id ?? `${item.productName}-${idx}`}
                          className="border-t border-slate-100"
                        >
                          <td className="p-4 text-slate-800">
                            {item.productName ?? item.name ?? "-"}
                          </td>
                          <td className="p-4 text-right font-semibold text-slate-700">
                            {qty || "-"}
                          </td>
                          <td className="p-4 text-right text-slate-700">
                            {discount || 0}
                          </td>
                          <td className="p-4 text-right text-slate-700">
                            {price ? price.toFixed(2) : "-"}
                          </td>
                          <td className="p-4 text-right font-semibold text-slate-900">
                            {total ? total.toFixed(2) : "-"}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan="5" className="p-6 text-sm text-slate-500">
                        No line items returned for this bill.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {isCollectModalOpen && bill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-600">
                  Collect Due
                </p>
                <h3 className="mt-2 text-2xl font-black text-slate-900">
                  Record Payment
                </h3>
              </div>
              <button
                type="button"
                disabled={isPaying}
                onClick={() => setIsCollectModalOpen(false)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Close
              </button>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Bill No
                </div>
                <div className="mt-1 text-base font-black text-slate-900">
                  {bill.id}
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Customer
                </div>
                <div className="mt-1 truncate text-base font-black text-slate-900">
                  {bill.customerName || "-"}
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 md:col-span-2">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Current Due
                </div>
                <div className="mt-1 text-2xl font-black text-rose-700">
                  {dueAmount.toFixed(2)}
                </div>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-600">
                  Payment Method
                </label>
                <select
                  className="w-full rounded-xl border-2 border-slate-200 bg-white p-3 outline-none focus:border-blue-500"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                >
                  <option value="CASH">Cash</option>
                  <option value="UPI">UPI</option>
                  <option value="CARD">Card</option>
                </select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-600">
                  Amount
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="w-full rounded-xl border-2 border-slate-200 p-3 outline-none focus:border-blue-500"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                />
                {Number(paymentAmount || 0) > dueAmount && (
                  <div className="mt-1 text-xs font-semibold text-rose-600">
                    Amount cannot be more than due.
                  </div>
                )}
              </div>
              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-bold text-slate-600">
                  Reference (optional)
                </label>
                <input
                  type="text"
                  placeholder="UPI txn id / note"
                  className="w-full rounded-xl border-2 border-slate-200 p-3 outline-none focus:border-blue-500"
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                disabled={isPaying}
                onClick={() => setIsCollectModalOpen(false)}
                className="rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={
                  isPaying ||
                  !Number.isFinite(Number(paymentAmount)) ||
                  Number(paymentAmount) <= 0 ||
                  Number(paymentAmount) > dueAmount
                }
                onClick={handleConfirmPayment}
                className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 disabled:hover:bg-slate-200"
              >
                {isPaying ? "CONFIRMING..." : "Confirm Payment"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
