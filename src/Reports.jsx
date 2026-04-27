import React, { useEffect, useMemo, useState } from "react";
import api from "./api";

function toYmd(date) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
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

function formatMoney(value) {
  const n = asNumber(value);
  return n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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

  const palette = ["#2563eb", "#10b981", "#a855f7", "#f59e0b", "#ef4444", "#0ea5e9"];

  return (
    <div className="flex items-center gap-6">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {total ? (
          slices.map((s, idx) => (
            <path key={s.label} d={s.path} fill={s.color || palette[idx % palette.length]} />
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
              <div key={s.label} className="flex items-center justify-between gap-3 text-sm">
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: s.color || palette[idx % palette.length] }}
                  />
                  <span className="truncate font-semibold text-slate-800">{s.label}</span>
                </div>
                <span className="shrink-0 font-semibold text-slate-600">
                  {Math.round((asNumber(s.value) / total) * 100)}%
                </span>
              </div>
            ))
          ) : (
            <div className="text-sm text-slate-500">No chart data returned.</div>
          )}
        </div>
      </div>
    </div>
  );
}

function BarChart({ data, height = 220 }) {
  const max = Math.max(1, ...data.map((d) => asNumber(d.value)));

  return (
    <div className="space-y-3">
      {data.length ? (
        data.slice(0, 8).map((d) => (
          <div key={d.label} className="grid grid-cols-[minmax(0,1fr)_72px] gap-4">
            <div className="min-w-0">
              <div className="flex items-center justify-between gap-3">
                <div className="truncate text-sm font-semibold text-slate-800">{d.label}</div>
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
      <div style={{ height: Math.max(0, height - 120) }} />
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

export default function Reports() {
  const [dateYmd, setDateYmd] = useState(() => toYmd(new Date()));
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setIsLoading(true);
      setError("");
      setData(null);

      try {
        const result = await fetchDailySummary(dateYmd);
        if (!cancelled) setData(result);
      } catch (err) {
        console.error("Reports load failed:", err);
        if (!cancelled) {
          setError(
            err.response?.data?.message ||
              "Reports API not available. Add a backend endpoint like GET /reports/daily?date=YYYY-MM-DD.",
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
  }, [dateYmd]);

  const totals = useMemo(() => {
    const totalSales = pickFirst(data, ["totalSales", "salesTotal", "totalAmount", "grandTotal"]);
    const bills = pickFirst(data, ["totalBills", "billsCount", "billCount"]);
    const items = pickFirst(data, ["totalItems", "itemsSold", "totalQuantity"]);

    return {
      totalSales: asNumber(totalSales),
      bills: asNumber(bills),
      items: asNumber(items),
    };
  }, [data]);

  const topProduct = useMemo(() => {
    return (
      pickFirst(data, ["topProduct", "mostSoldProduct"]) ||
      (asArray(pickFirst(data, ["products", "productBreakdown", "topProducts"]))[0] ?? null)
    );
  }, [data]);

  const topSalesman = useMemo(() => {
    return (
      pickFirst(data, ["topSalesman", "topSalesMan", "bestSalesman"]) ||
      (asArray(pickFirst(data, ["salesmen", "salesmanBreakdown", "topSalesmen"]))[0] ?? null)
    );
  }, [data]);

  const productPieData = useMemo(() => {
    const breakdown = asArray(pickFirst(data, ["productBreakdown", "products", "topProducts"]));
    return breakdown.slice(0, 6).map((p) => ({
      label: p.name ?? p.productName ?? "Unknown",
      value: asNumber(p.qty ?? p.quantity ?? p.itemsSold ?? p.soldQty),
    }));
  }, [data]);

  const salesmanBars = useMemo(() => {
    const breakdown = asArray(pickFirst(data, ["salesmanBreakdown", "salesmen", "topSalesmen"]));
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
    <div className="min-h-screen w-full bg-slate-50 p-6">
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-600">
              Reports
            </p>
            <h2 className="mt-2 text-2xl font-black text-slate-900">Daily Summary</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Sales performance for a single day, including top product and top salesman.
            </p>
          </div>

          <div className="w-full md:w-auto">
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
        </div>

        {error && (
          <div className="mt-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
            {error}
          </div>
        )}

        {isLoading && (
          <div className="mt-6 text-sm font-semibold text-slate-500">Loading report...</div>
        )}

        {data && !isLoading && (
          <div className="mt-6 space-y-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <KpiCard
                title="Day Sales"
                value={`Rs ${formatMoney(totals.totalSales)}`}
                sub={`${Math.round(totals.bills)} bills`}
                tone="green"
              />
              <KpiCard
                title="Items Sold"
                value={`${Math.round(totals.items)}`}
                sub="Total quantity"
                tone="blue"
              />
              <KpiCard
                title="Top Salesman"
                value={topSalesman?.name ? topSalesman.name : "-"}
                sub={
                  topSalesman
                    ? `Sales Rs ${formatMoney(
                        pickFirst(topSalesman, ["revenue", "sales", "totalSales", "totalAmount"]) || 0,
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
                      Qty{" "}
                      {Math.round(
                        asNumber(pickFirst(topProduct, ["qty", "quantity", "itemsSold", "soldQty"])),
                      ) || 0}
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

