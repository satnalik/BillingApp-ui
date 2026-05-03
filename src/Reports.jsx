import React, { useEffect, useMemo, useRef, useState } from "react";
import api from "./api";

function toYmd(date) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function fromYmd(ymd) {
  const [y, m, d] = String(ymd || "")
    .split("-")
    .map((x) => Number(x));
  if (!y || !m || !d) return null;
  const date = new Date(y, m - 1, d);
  return Number.isFinite(date.getTime()) ? date : null;
}

function clampRange(fromYmdValue, toYmdValue) {
  if (!fromYmdValue || !toYmdValue)
    return { from: fromYmdValue, to: toYmdValue };
  return fromYmdValue <= toYmdValue
    ? { from: fromYmdValue, to: toYmdValue }
    : { from: toYmdValue, to: fromYmdValue };
}

function monthLabel(ymd) {
  const date = fromYmd(ymd);
  if (!date) return "Month";
  return date.toLocaleString("en-IN", { month: "long", year: "numeric" });
}

function monthBounds(ymd) {
  const date = fromYmd(ymd);
  if (!date) return null;
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  return { startYmd: toYmd(start), endYmd: toYmd(end) };
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function asNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function pickFirst(obj, keys) {
  for (const key of keys) {
    if (obj && obj[key] !== undefined && obj[key] !== null) return obj[key];
  }
  return undefined;
}

function pickQuantity(obj) {
  return pickFirst(obj, [
    "qty",
    "quantity",
    "itemsSold",
    "soldQty",
    "soldQuantity",
    "qtySold",
    "totalQty",
    "totalQuantity",
  ]);
}

function formatMoney(value) {
  const n = asNumber(value);
  return n.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function KpiCard({ title, value, sub, tone }) {
  const tones = {
    green: "border-emerald-200 bg-emerald-50 text-emerald-800",
    blue: "border-blue-200 bg-blue-50 text-blue-800",
    purple: "border-purple-200 bg-purple-50 text-purple-800",
    slate: "border-slate-200 bg-slate-50 text-slate-800",
  };

  return (
    <div className={`rounded-xl border p-5 ${tones[tone] || tones.slate}`}>
      <div className="text-xs font-semibold uppercase tracking-[0.14em] opacity-70">
        {title}
      </div>
      <div className="mt-2 text-2xl font-black">{value}</div>
      {sub ? <div className="mt-1 text-sm opacity-80">{sub}</div> : null}
    </div>
  );
}

function DayEndClosingReport() {
  const [dateYmd, setDateYmd] = useState(() => toYmd(new Date()));
  const [cashierQuery, setCashierQuery] = useState("");
  const [selectedCashierId, setSelectedCashierId] = useState("");
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [countedCash, setCountedCash] = useState("");
  const [note, setNote] = useState("");
  const [isCashierSearchOpen, setIsCashierSearchOpen] = useState(false);
  const cashierSearchRef = useRef(null);

  const storeId = localStorage.getItem("tenantId") || "";

  useEffect(() => {
    if (!isCashierSearchOpen) return undefined;

    const handlePointerDown = (event) => {
      if (!cashierSearchRef.current) return;
      if (cashierSearchRef.current.contains(event.target)) return;
      setIsCashierSearchOpen(false);
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
    };
  }, [isCashierSearchOpen]);

  const normalizeDayEndData = (payload) => {
    if (!payload || typeof payload !== "object") return null;

    // Backend variants supported:
    // - { sales: { total }, receivedByMode: { cash, card, upi }, totalPendingCredit }
    // - { collectionsByMethod: { CASH, CARD, UPI }, totalCollected, pendingCredit }
    if (payload.sales || payload.receivedByMode || payload.totalPendingCredit) {
      return payload;
    }

    const byMethod = payload.collectionsByMethod || payload.collections || {};
    const cash = byMethod.CASH ?? byMethod.cash ?? 0;
    const card = byMethod.CARD ?? byMethod.card ?? 0;
    const upi = byMethod.UPI ?? byMethod.upi ?? 0;

    return {
      ...payload,
      sales: { total: payload.totalCollected ?? 0 },
      receivedByMode: { cash, card, upi },
      totalPendingCredit: payload.pendingCredit ?? 0,
    };
  };

  const viewData = useMemo(() => {
    if (!data) return null;
    const filterId = selectedCashierId.trim();
    if (!filterId) return data;

    const match = asArray(data.salesmen).find(
      (s) => String(s?.employeeId ?? "").trim() === filterId,
    );

    if (!match) return data;
    return normalizeDayEndData({
      storeId: data.storeId,
      date: data.date,
      collectionsByMethod: match.collectionsByMethod,
      totalCollected: match.totalCollected,
      pendingCredit: match.pendingCredit,
      salesmen: [match],
    });
  }, [data, selectedCashierId]);

  const totals = useMemo(() => {
    const safe = (n) => asNumber(n);
    const sales = viewData?.sales || {};
    const received = viewData?.receivedByMode || {};
    const pending = safe(viewData?.totalPendingCredit);

    const cash = safe(received.cash);
    const card = safe(received.card);
    const upi = safe(received.upi);
    const totalReceived = cash + card + upi;

    const expectedCash = cash;
    const counted = countedCash === "" ? null : safe(countedCash);
    const variance = counted === null ? null : counted - expectedCash;

    return {
      salesTotal: safe(sales.total),
      cash,
      card,
      upi,
      totalReceived,
      pending,
      expectedCash,
      counted,
      variance,
    };
  }, [countedCash, viewData]);

  const handleFetch = async () => {
    setIsLoading(true);
    setError("");
    setData(null);

    try {
      const response = await api.get("/reports/day-end", {
        params: {
          storeId: storeId || undefined,
          date: dateYmd || undefined,
        },
      });
      setData(normalizeDayEndData(response.data));
    } catch (err) {
      console.error("Day-end report fetch failed:", err);
      setError(
        err.response?.data?.message ||
          "Day-end report endpoint not available yet.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = async () => {
    if (!storeId || !dateYmd) return;

    setIsLoading(true);
    setError("");

    try {
      await api.post("/reports/day-end/close", {
        storeId,
        date: dateYmd,
        cashierId: selectedCashierId.trim() || null,
        countedCash: asNumber(countedCash),
        note: note.trim() || null,
      });
      await handleFetch();
    } catch (err) {
      console.error("Day-end closing failed:", err);
      setError(err.response?.data?.message || "Failed to close day-end.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-600">
            Closing
          </p>
          <h2 className="mt-2 text-2xl font-black text-slate-900">
            Day End Closing
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Tally cashier collections by payment mode and pending credit
            amounts.
          </p>
        </div>

        <div className="grid w-full gap-3 md:w-auto md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-bold text-slate-600">
              Date
            </label>
            <input
              type="date"
              className="w-full rounded-xl border-2 border-slate-200 p-3 outline-none focus:border-blue-500 md:w-56"
              value={dateYmd}
              onChange={(e) => setDateYmd(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-bold text-slate-600">
              Cashier User ID (optional)
            </label>
            <div className="relative md:w-72" ref={cashierSearchRef}>
              <input
                type="text"
                placeholder="Search by name or ID"
                className="w-full rounded-xl border-2 border-slate-200 p-3 outline-none focus:border-blue-500"
                value={cashierQuery}
                onChange={(e) => {
                  const value = e.target.value;
                  setCashierQuery(value);
                  if (selectedCashierId) setSelectedCashierId("");
                  setIsCashierSearchOpen(true);
                }}
                onFocus={() => setIsCashierSearchOpen(true)}
              />
              {(selectedCashierId || cashierQuery.trim()) && (
                <button
                  type="button"
                  onClick={() => {
                    setCashierQuery("");
                    setSelectedCashierId("");
                    setIsCashierSearchOpen(false);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-500 hover:text-slate-700"
                  aria-label="Clear cashier filter"
                >
                  ✕
                </button>
              )}

              {isCashierSearchOpen &&
                asArray(data?.salesmen).length > 0 &&
                cashierQuery.trim().length > 0 && (
                  <div className="absolute z-20 mt-1 max-h-60 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-2xl">
                    {asArray(data?.salesmen)
                      .filter((s) => {
                        const q = cashierQuery.trim().toLowerCase();
                        const name = String(s?.name ?? "").toLowerCase();
                        const id = String(s?.employeeId ?? "").toLowerCase();
                        return name.includes(q) || id.includes(q);
                      })
                      .slice(0, 20)
                      .map((s) => (
                        <button
                          key={s.employeeId ?? s.name}
                          type="button"
                          onClick={() => {
                            const id = String(s?.employeeId ?? "").trim();
                            setSelectedCashierId(id);
                            setCashierQuery(
                              `${s?.name ?? "Cashier"}${id ? ` (${id})` : ""}`,
                            );
                            setIsCashierSearchOpen(false);
                          }}
                          className="flex w-full justify-between border-b border-slate-100 p-3 text-left hover:bg-blue-50"
                        >
                          <span className="font-semibold text-slate-900">
                            {s?.name ?? "-"}
                          </span>
                          <span className="text-sm text-slate-500">
                            {s?.employeeId ?? ""}
                          </span>
                        </button>
                      ))}
                  </div>
                )}
            </div>
          </div>
          <div className="md:col-span-2 flex justify-end gap-3">
            <button
              type="button"
              onClick={handleFetch}
              disabled={isLoading}
              className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-60"
            >
              {isLoading ? "Loading..." : "Load Report"}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="mt-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
          {error}
        </div>
      )}

      {data && !isLoading && (
        <div className="mt-6 space-y-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
            <KpiCard
              title="Sales Total"
              value={`Rs ${formatMoney(totals.salesTotal)}`}
              sub="Gross sales"
              tone="green"
            />
            <KpiCard
              title="Cash Received"
              value={`Rs ${formatMoney(totals.cash)}`}
              sub="Expected in counter"
              tone="blue"
            />
            <KpiCard
              title="Card Received"
              value={`Rs ${formatMoney(totals.card)}`}
              sub="Non-cash"
              tone="slate"
            />
            <KpiCard
              title="UPI Received"
              value={`Rs ${formatMoney(totals.upi)}`}
              sub="Non-cash"
              tone="slate"
            />
            <KpiCard
              title="Pending (Credit)"
              value={`Rs ${formatMoney(totals.pending)}`}
              sub="Not received today"
              tone="purple"
            />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 lg:col-span-2">
              <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                Cash Tally
              </div>
              <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
                <div>
                  <div className="text-sm font-bold text-slate-600">
                    Expected Cash
                  </div>
                  <div className="mt-1 text-2xl font-black text-slate-900">
                    Rs {formatMoney(totals.expectedCash)}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-bold text-slate-600">
                    Counted Cash
                  </label>
                  <input
                    type="number"
                    className="mt-2 w-full rounded-xl border-2 border-slate-200 bg-white p-3 outline-none focus:border-blue-500"
                    value={countedCash}
                    onChange={(e) => setCountedCash(e.target.value)}
                    placeholder="Enter counted cash"
                    min="0"
                    step="0.01"
                  />
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-600">
                    Variance
                  </div>
                  <div
                    className={`mt-1 text-2xl font-black ${
                      totals.variance === null
                        ? "text-slate-400"
                        : totals.variance === 0
                          ? "text-emerald-600"
                          : "text-rose-600"
                    }`}
                  >
                    {totals.variance === null
                      ? "-"
                      : `Rs ${formatMoney(totals.variance)}`}
                  </div>
                </div>
              </div>

              <div className="mt-5">
                <label className="text-sm font-bold text-slate-600">
                  Closing Note (optional)
                </label>
                <textarea
                  className="mt-2 w-full rounded-xl border-2 border-slate-200 bg-white p-3 outline-none focus:border-blue-500"
                  rows={3}
                  placeholder="Any remarks for credit / variance / handover"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </div>

              <div className="mt-5 flex justify-end">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={isLoading || countedCash === ""}
                  className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-black text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 disabled:hover:bg-slate-200"
                >
                  Confirm Closing
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                Sanity Check
              </div>
              <div className="mt-4 space-y-2 text-sm font-semibold text-slate-700">
                <div className="flex items-center justify-between">
                  <span>Total Received</span>
                  <span>Rs {formatMoney(totals.totalReceived)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Pending Credit</span>
                  <span>Rs {formatMoney(totals.pending)}</span>
                </div>
                <div className="mt-2 border-t border-slate-200 pt-2 flex items-center justify-between font-black text-slate-900">
                  <span>Received + Pending</span>
                  <span>
                    Rs {formatMoney(totals.totalReceived + totals.pending)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {asArray(data?.creditDetails).length > 0 && (
            <div className="overflow-hidden rounded-2xl border border-slate-200">
              <div className="border-b border-slate-200 bg-slate-100 px-4 py-3 text-sm font-bold text-slate-700">
                Credit Details
              </div>
              <table className="w-full text-left">
                <thead className="bg-white">
                  <tr>
                    <th className="p-4 text-sm font-bold text-slate-600">
                      Bill
                    </th>
                    <th className="p-4 text-sm font-bold text-slate-600">
                      Customer
                    </th>
                    <th className="p-4 text-sm font-bold text-slate-600 text-right">
                      Pending
                    </th>
                    <th className="p-4 text-sm font-bold text-slate-600">
                      Remark
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {asArray(data.creditDetails).map((row, idx) => (
                    <tr
                      key={row.billId ?? `${row.customerName}-${idx}`}
                      className="border-t border-slate-100"
                    >
                      <td className="p-4 font-semibold text-slate-700">
                        {row.billId ?? "-"}
                      </td>
                      <td className="p-4 text-slate-800">
                        {row.customerName ?? row.customer ?? "-"}
                      </td>
                      <td className="p-4 text-right font-black text-rose-600">
                        Rs {formatMoney(row.pendingAmount)}
                      </td>
                      <td className="p-4 text-slate-600">
                        {row.remark ?? row.creditRemark ?? "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {!data && !isLoading && !error && (
        <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-semibold text-slate-600">
          Load a report to start tallying cash for the day.
        </div>
      )}
    </div>
  );
}

export default function Reports() {
  const [activeKey, setActiveKey] = useState("day_end");

  const items = [
    {
      key: "day_end",
      label: "Day End Closing",
      description: "Cashier-wise and consolidated closing",
    },
    {
      key: "sales_summary",
      label: "Sales Summary",
      description: "KPIs, top products, salesman performance",
    },
    {
      key: "sales_register",
      label: "Sales Register",
      description: "Bill-wise listing (coming soon)",
      disabled: true,
    },
    {
      key: "product_sales",
      label: "Product Sales",
      description: "Product-wise qty and revenue (coming soon)",
      disabled: true,
    },
    {
      key: "credit_pending",
      label: "Credit / Pending",
      description: "Customer-wise pending dues (coming soon)",
      disabled: true,
    },
    {
      key: "inventory",
      label: "Inventory Reports",
      description: "Stock on hand, movement (coming soon)",
      disabled: true,
    },
  ];

  const content = (() => {
    if (activeKey === "sales_summary") return <SalesSummaryReport />;
    if (activeKey === "day_end") return <DayEndClosingReport />;
    return null;
  })();

  return (
    <div className="min-h-screen w-full bg-slate-50">
      <div className="w-full px-6 py-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[320px_1fr]">
          <aside className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 bg-slate-100 px-5 py-4">
              <div className="text-xs font-extrabold uppercase tracking-[0.18em] text-blue-600">
                Reports
              </div>
              <div className="mt-2 text-lg font-black text-slate-900">
                Choose a report
              </div>
            </div>
            <div className="p-3 space-y-2">
              {items.map((item) => {
                const isActive = item.key === activeKey;
                const isDisabled = Boolean(item.disabled);

                return (
                  <button
                    key={item.key}
                    type="button"
                    disabled={isDisabled}
                    onClick={() => setActiveKey(item.key)}
                    className={`w-full rounded-xl border px-4 py-4 text-left transition-colors ${
                      isActive
                        ? "border-blue-200 bg-blue-50"
                        : "border-transparent hover:border-slate-200 hover:bg-slate-50"
                    } ${isDisabled ? "cursor-not-allowed opacity-50" : ""}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-black text-slate-900">
                          {item.label}
                        </div>
                        <div className="mt-1 text-xs font-semibold text-slate-500">
                          {item.description}
                        </div>
                      </div>
                      {isDisabled ? (
                        <span className="shrink-0 rounded-full bg-slate-100 px-2 py-1 text-[11px] font-extrabold text-slate-500">
                          SOON
                        </span>
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </div>
          </aside>

          <section className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            {content}
          </section>
        </div>
      </div>
    </div>
  );
}

function PieChart({ data, size = 180 }) {
  const total = data.reduce((sum, item) => sum + asNumber(item.value), 0);
  const r = size / 2;
  const cx = r;
  const cy = r;

  const slices = useMemo(() => {
    if (!total) return [];

    let start = -Math.PI / 2;
    return data
      .filter((d) => asNumber(d.value) > 0)
      .map((d) => {
        const v = asNumber(d.value);
        const angle = (v / total) * Math.PI * 2;
        const end = start + angle;

        const x1 = cx + r * Math.cos(start);
        const y1 = cy + r * Math.sin(start);
        const x2 = cx + r * Math.cos(end);
        const y2 = cy + r * Math.sin(end);
        const largeArc = angle > Math.PI ? 1 : 0;

        const path = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;
        const slice = { ...d, path };
        start = end;
        return slice;
      });
  }, [cx, cy, r, data, total]);

  const palette = [
    "#2563eb",
    "#10b981",
    "#a855f7",
    "#f59e0b",
    "#ef4444",
    "#0ea5e9",
  ];

  return (
    <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
      <svg
        className="mx-auto shrink-0 sm:mx-0 max-w-full"
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
      >
        {total ? (
          slices.map((s, idx) => (
            <path
              key={s.label}
              d={s.path}
              fill={s.color || palette[idx % palette.length]}
            />
          ))
        ) : (
          <circle cx={cx} cy={cy} r={r} fill="#e2e8f0" />
        )}
      </svg>

      <div className="min-w-0 flex-1">
        <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
          Breakdown
        </div>
        <div className="mt-3 space-y-2">
          {slices.length ? (
            slices.slice(0, 6).map((s, idx) => (
              <div
                key={s.label}
                className="flex items-center justify-between gap-3 text-sm"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{
                      backgroundColor: s.color || palette[idx % palette.length],
                    }}
                  />
                  <span className="truncate font-semibold text-slate-800">
                    {s.label}
                  </span>
                </div>
                <span className="shrink-0 font-semibold text-slate-600">
                  {Math.round((asNumber(s.value) / total) * 100)}%
                </span>
              </div>
            ))
          ) : (
            <div className="text-sm text-slate-500">
              No chart data returned.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function BarChart({ data, height = 220 }) {
  const max = Math.max(1, ...data.map((d) => asNumber(d.value)));

  return (
    <div className="space-y-3" style={{ minHeight: height }}>
      {data.length ? (
        data.slice(0, 8).map((d) => (
          <div
            key={d.label}
            className="grid grid-cols-[minmax(0,1fr)_72px] gap-4"
          >
            <div className="min-w-0">
              <div className="flex items-center justify-between gap-3">
                <div className="truncate text-sm font-semibold text-slate-800">
                  {d.label}
                </div>
                <div className="shrink-0 text-sm font-semibold text-slate-600">
                  {formatMoney(d.value)}
                </div>
              </div>
              <div className="mt-2 h-2 w-full rounded-full bg-slate-200">
                <div
                  className="h-2 rounded-full bg-blue-600"
                  style={{ width: `${(asNumber(d.value) / max) * 100}%` }}
                />
              </div>
            </div>
            <div className="text-right text-xs font-semibold text-slate-400">
              {d.sub || ""}
            </div>
          </div>
        ))
      ) : (
        <div className="text-sm text-slate-500">No chart data returned.</div>
      )}
    </div>
  );
}

async function fetchDailySummary(dateYmd) {
  const candidates = [
    `/reports/daily?date=${encodeURIComponent(dateYmd)}`,
    `/reports/summary?date=${encodeURIComponent(dateYmd)}`,
    `/reports/today`,
    `/report/daily?date=${encodeURIComponent(dateYmd)}`,
  ];

  let lastError = null;
  for (const url of candidates) {
    try {
      const response = await api.get(url);
      if (response.data) return response.data;
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError || new Error("No reports endpoint matched.");
}

async function fetchRangeSummary(fromDateYmd, toDateYmd) {
  const params = `from=${encodeURIComponent(fromDateYmd)}&to=${encodeURIComponent(toDateYmd)}`;
  const candidates = [
    `/reports/range?${params}`,
    `/reports/summary?${params}`,
    `/reports?${params}`,
    `/report/range?${params}`,
  ];

  let lastError = null;
  for (const url of candidates) {
    try {
      const response = await api.get(url);
      if (response.data) return response.data;
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError || new Error("No range reports endpoint matched.");
}

function SalesSummaryReport() {
  const [mode, setMode] = useState("daily"); // daily | range
  const [dateYmd, setDateYmd] = useState(() => toYmd(new Date()));
  const [fromDateYmd, setFromDateYmd] = useState(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 6);
    return toYmd(start);
  });
  const [toDateYmd, setToDateYmd] = useState(() => toYmd(new Date()));
  const [data, setData] = useState(null);
  const [monthData, setMonthData] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setIsLoading(true);
      setError("");
      setData(null);
      setMonthData(null);

      try {
        if (mode === "daily") {
          const [dailyResult, monthResult] = await Promise.all([
            fetchDailySummary(dateYmd),
            (async () => {
              const bounds = monthBounds(dateYmd);
              if (!bounds) return null;
              try {
                return await fetchRangeSummary(bounds.startYmd, bounds.endYmd);
              } catch {
                return null;
              }
            })(),
          ]);

          if (!cancelled) {
            setData(dailyResult);
            setMonthData(monthResult);
          }
        } else {
          const clamped = clampRange(fromDateYmd, toDateYmd);
          const [rangeResult, monthResult] = await Promise.all([
            fetchRangeSummary(clamped.from, clamped.to),
            (async () => {
              const bounds = monthBounds(clamped.to || clamped.from);
              if (!bounds) return null;
              try {
                return await fetchRangeSummary(bounds.startYmd, bounds.endYmd);
              } catch {
                return null;
              }
            })(),
          ]);

          if (!cancelled) {
            setData(rangeResult);
            setMonthData(monthResult);
          }
        }
      } catch (err) {
        console.error("Reports load failed:", err);
        if (!cancelled) {
          setError(
            err.response?.data?.message ||
              "Reports API not available. Add backend endpoints like GET /reports/daily?date=YYYY-MM-DD and/or GET /reports/range?from=YYYY-MM-DD&to=YYYY-MM-DD.",
          );
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [dateYmd, fromDateYmd, toDateYmd, mode]);

  const totals = useMemo(() => {
    const totalSales = pickFirst(data, [
      "totalSales",
      "salesTotal",
      "totalAmount",
      "grandTotal",
    ]);
    const bills = pickFirst(data, ["totalBills", "billsCount", "billCount"]);
    const items =
      pickFirst(data, [
        "totalItems",
        "itemsSold",
        "totalQuantity",
        "totalQty",
        "soldQuantity",
        "soldQty",
        "qtySold",
      ]) ?? 0;

    const productBreakdown = asArray(
      pickFirst(data, ["productBreakdown", "products", "topProducts"]),
    );
    const derivedItems = productBreakdown.reduce(
      (sum, p) => sum + asNumber(pickQuantity(p)),
      0,
    );
    const itemsFinal = asNumber(items) || derivedItems;

    return {
      totalSales: asNumber(totalSales),
      bills: asNumber(bills),
      items: itemsFinal,
    };
  }, [data]);

  const monthTotals = useMemo(() => {
    const totalSales = pickFirst(monthData, [
      "totalSales",
      "salesTotal",
      "totalAmount",
      "grandTotal",
    ]);
    return { totalSales: asNumber(totalSales) };
  }, [monthData]);

  const topProduct = useMemo(() => {
    return (
      pickFirst(data, ["topProduct", "mostSoldProduct"]) ||
      (asArray(
        pickFirst(data, ["products", "productBreakdown", "topProducts"]),
      )[0] ??
        null)
    );
  }, [data]);

  const topSalesman = useMemo(() => {
    return (
      pickFirst(data, ["topSalesman", "topSalesMan", "bestSalesman"]) ||
      (asArray(
        pickFirst(data, ["salesmen", "salesmanBreakdown", "topSalesmen"]),
      )[0] ??
        null)
    );
  }, [data]);

  const productPieData = useMemo(() => {
    const breakdown = asArray(
      pickFirst(data, ["productBreakdown", "products", "topProducts"]),
    );
    return breakdown.slice(0, 6).map((p) => ({
      label: p.name ?? p.productName ?? "Unknown",
      value: asNumber(pickQuantity(p)),
    }));
  }, [data]);

  const salesmanBars = useMemo(() => {
    const breakdown = asArray(
      pickFirst(data, ["salesmanBreakdown", "salesmen", "topSalesmen"]),
    );
    return breakdown
      .slice(0, 8)
      .map((s) => ({
        label: s.name ?? s.salesmanName ?? "Unknown",
        value: asNumber(s.revenue ?? s.sales ?? s.totalSales ?? s.totalAmount),
        sub: s.employeeId ? `ID ${s.employeeId}` : "",
      }))
      .filter((x) => x.label);
  }, [data]);

  return (
    <div className="w-full p-6">
      <section className="p-0">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-600">
              Reports
            </p>
            <h2 className="mt-2 text-2xl font-black text-slate-900">
              {mode === "daily" ? "Daily Summary" : "Custom Range Summary"}
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              {mode === "daily"
                ? "Sales performance for a single day, including top product and top salesman."
                : "Assess sales performance for a custom date range."}
            </p>
          </div>

          <div className="w-full md:w-auto">
            <label className="mb-2 block text-sm font-bold text-slate-600">
              Mode
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setMode("daily")}
                className={`rounded-xl border-2 p-3 text-sm font-bold ${
                  mode === "daily"
                    ? "border-blue-600 bg-blue-50 text-blue-700"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                }`}
              >
                Daily
              </button>
              <button
                type="button"
                onClick={() => setMode("range")}
                className={`rounded-xl border-2 p-3 text-sm font-bold ${
                  mode === "range"
                    ? "border-blue-600 bg-blue-50 text-blue-700"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                }`}
              >
                Range
              </button>
            </div>

            {mode === "daily" ? (
              <div className="mt-3">
                <label className="mb-2 block text-sm font-bold text-slate-600">
                  Date
                </label>
                <input
                  type="date"
                  className="w-full rounded-xl border-2 border-slate-200 p-3 outline-none focus:border-blue-500 md:w-56"
                  value={dateYmd}
                  onChange={(e) => setDateYmd(e.target.value)}
                />
              </div>
            ) : (
              <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-600">
                    From
                  </label>
                  <input
                    type="date"
                    className="w-full rounded-xl border-2 border-slate-200 p-3 outline-none focus:border-blue-500 md:w-56"
                    value={fromDateYmd}
                    onChange={(e) => setFromDateYmd(e.target.value)}
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-600">
                    To
                  </label>
                  <input
                    type="date"
                    className="w-full rounded-xl border-2 border-slate-200 p-3 outline-none focus:border-blue-500 md:w-56"
                    value={toDateYmd}
                    onChange={(e) => setToDateYmd(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="mt-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
            {error}
          </div>
        )}

        {isLoading && (
          <div className="mt-6 text-sm font-semibold text-slate-500">
            Loading report...
          </div>
        )}

        {data && !isLoading && (
          <div className="mt-6 space-y-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <KpiCard
                title={mode === "daily" ? "Day Sales" : "Range Sales"}
                value={`Rs ${formatMoney(totals.totalSales)}`}
                sub={
                  mode === "daily"
                    ? `${Math.round(totals.bills)} bills`
                    : `${Math.round(totals.bills)} bills (${clampRange(fromDateYmd, toDateYmd).from} → ${
                        clampRange(fromDateYmd, toDateYmd).to
                      })`
                }
                tone="green"
              />
              <KpiCard
                title="Items Sold"
                value={`${Math.round(totals.items)}`}
                sub="Total quantity"
                tone="blue"
              />
              <KpiCard
                title={`${monthLabel(mode === "daily" ? dateYmd : toDateYmd)} Sales`}
                value={`Rs ${formatMoney(monthTotals.totalSales)}`}
                sub="Full month total"
                tone="slate"
              />
              <KpiCard
                title="Top Salesman"
                value={topSalesman?.name ? topSalesman.name : "-"}
                sub={
                  topSalesman
                    ? `Sales Rs ${formatMoney(
                        pickFirst(topSalesman, [
                          "revenue",
                          "sales",
                          "totalSales",
                          "totalAmount",
                        ]) || 0,
                      )}`
                    : ""
                }
                tone="purple"
              />
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-white p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                      Most Sold Product
                    </div>
                    <div className="mt-2 text-xl font-black text-slate-900">
                      {topProduct?.name ?? topProduct?.productName ?? "-"}
                    </div>
                    <div className="mt-1 text-sm font-semibold text-slate-500">
                      Qty {Math.round(asNumber(pickQuantity(topProduct))) || 0}
                    </div>
                  </div>
                </div>
                <div className="mt-6">
                  <PieChart data={productPieData} />
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-6">
                <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                  Sales By Salesman
                </div>
                <div className="mt-2 text-xl font-black text-slate-900">
                  Top Performers
                </div>
                <div className="mt-6">
                  <BarChart data={salesmanBars} />
                </div>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
