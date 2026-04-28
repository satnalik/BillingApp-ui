import React, { useMemo, useState } from "react";
import api from "./api";

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

function tryGetBillItems(bill) {
  return (
    bill?.items ||
    bill?.billItems ||
    bill?.lineItems ||
    bill?.billLineItems ||
    []
  );
}

export default function GetBill() {
  const [billId, setBillId] = useState("");
  const [bill, setBill] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isPdfLoading, setIsPdfLoading] = useState(false);

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

    return [
      ["Bill ID", bill.id ?? normalizedId],
      ["Customer Name", bill.customerName],
      ["Contact", bill.contactInfo ?? bill.contactNumber ?? bill.phoneNumber],
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

  const handleFetch = async (e) => {
    e.preventDefault();
    if (!normalizedId || isLoading) return;

    setIsLoading(true);
    setError("");
    setBill(null);

    try {
      let response;
      try {
        response = await api.get(`/bills/${normalizedId}`);
      } catch (firstError) {
        try {
          response = await api.get(`/bill/${normalizedId}`);
        } catch (secondError) {
          response = await api.get(`/bills/id/${normalizedId}`);
        }
      }

      setBill(response.data || null);
      if (!response.data) setError("No data returned for this bill.");
    } catch (err) {
      console.error("Get bill failed:", err);
      setError(err.response?.data?.message || "Bill not found.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-50 p-6">
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
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
                className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white hover:bg-blue-700 disabled:bg-slate-200"
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
                {detailsRows.map(([label, value], idx) => (
                  <div
                    key={label}
                    className="bg-white/80 rounded-xl shadow-sm border border-slate-100 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-bold uppercase tracking-wider text-blue-500">
                        {label}
                      </div>
                      <div className="mt-1 truncate text-base font-semibold text-slate-800">
                        {toDisplay(value)}
                      </div>
                    </div>
                  </div>
                ))}
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
                    items.map((item, idx) => {
                      const qty = Number(item.quantity ?? item.qty ?? 0) || 0;
                      const price =
                        Number(
                          item.price ??
                            item.unitPrice ??
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
    </div>
  );
}
