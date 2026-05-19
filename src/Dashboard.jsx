import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "./api";

const today = new Date().toISOString().slice(0, 10);

function money(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "0.00";
  return amount.toFixed(2);
}

function numberValue(value) {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : 0;
}

export default function Dashboard() {
  const [date, setDate] = useState(today);
  const [lowStockThreshold, setLowStockThreshold] = useState("10");
  const [dashboard, setDashboard] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadDashboard = async () => {
    setIsLoading(true);

    try {
      const params = {};
      if (date) params.date = date;
      if (lowStockThreshold !== "") {
        params.lowStockThreshold = Number(lowStockThreshold);
      }

      const response = await api.get("/dashboard/today", { params });
      setDashboard(response.data || null);
    } catch (error) {
      console.error("Failed to load dashboard:", error);
      setDashboard(null);
      alert(error.response?.data?.message || "Failed to load dashboard");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadDashboard();
    }, 0);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, lowStockThreshold]);

  const paymentSplit = dashboard?.paymentSplit || {};

  const cards = useMemo(
    () => [
      {
        label: "Today Sales",
        value: money(dashboard?.todaySales),
        tone: "text-slate-900",
      },
      {
        label: "Bills Count",
        value: String(numberValue(dashboard?.billCount)),
        tone: "text-slate-900",
      },
      {
        label: "Customer Due",
        value: money(dashboard?.customerDue),
        tone: "text-amber-700",
      },
      {
        label: "Supplier Due",
        value: money(dashboard?.supplierDue),
        tone: "text-amber-700",
      },
      {
        label: "Low Stock Count",
        value: String(numberValue(dashboard?.lowStockCount)),
        tone: "text-rose-700",
      },
    ],
    [dashboard],
  );

  const payments = [
    { label: "Cash", value: paymentSplit.CASH },
    { label: "UPI", value: paymentSplit.UPI },
    { label: "Card", value: paymentSplit.CARD },
    { label: "Credit", value: paymentSplit.CREDIT },
  ];

  return (
    <div className="min-h-screen w-full bg-slate-50 p-6">
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-600">
              Today
            </p>
            <h2 className="mt-2 text-2xl font-black text-slate-900">
              Dashboard
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Sales, dues, payments, supplier dues, and low-stock alerts.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[180px_180px_auto]">
            <div>
              <label className="mb-2 block text-sm font-bold text-slate-600">
                Date
              </label>
              <input
                type="date"
                className="w-full rounded-xl border-2 border-slate-200 p-3 outline-none focus:border-blue-500"
                value={date}
                onChange={(event) => setDate(event.target.value)}
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-bold text-slate-600">
                Low Stock At
              </label>
              <input
                type="number"
                min="0"
                step="1"
                className="w-full rounded-xl border-2 border-slate-200 p-3 outline-none focus:border-blue-500"
                value={lowStockThreshold}
                onChange={(event) => setLowStockThreshold(event.target.value)}
              />
            </div>
            <button
              type="button"
              onClick={loadDashboard}
              disabled={isLoading}
              className="self-end rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
            >
              {isLoading ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-3 xl:grid-cols-5">
          {cards.map((card) => (
            <div
              key={card.label}
              className="rounded-xl border border-slate-200 bg-slate-50 p-4"
            >
              <div className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
                {card.label}
              </div>
              <div className={`mt-2 text-2xl font-black ${card.tone}`}>
                {isLoading ? "-" : card.value}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[1fr_360px]">
          <div className="rounded-xl border border-slate-200">
            <div className="border-b border-slate-200 bg-white p-4">
              <h3 className="text-lg font-black text-slate-900">
                Low Stock Items
              </h3>
              <p className="mt-1 text-sm font-semibold text-slate-500">
                Threshold: {dashboard?.lowStockThreshold ?? (lowStockThreshold || 10)}
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="p-4 text-sm font-bold text-slate-600">
                      Product
                    </th>
                    <th className="p-4 text-sm font-bold text-slate-600">
                      Barcode
                    </th>
                    <th className="p-4 text-sm font-bold text-slate-600">
                      Supplier
                    </th>
                    <th className="p-4 text-sm font-bold text-slate-600">
                      Category
                    </th>
                    <th className="p-4 text-right text-sm font-bold text-slate-600">
                      Stock
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan="5" className="p-6 text-sm text-slate-500">
                        Loading low-stock items...
                      </td>
                    </tr>
                  ) : dashboard?.lowStockItems?.length > 0 ? (
                    dashboard.lowStockItems.map((item) => (
                      <tr key={item.id} className="border-t border-slate-100">
                        <td className="p-4 font-semibold text-slate-800">
                          {item.name || "-"}
                        </td>
                        <td className="p-4 text-slate-700">
                          {item.barcode || "-"}
                        </td>
                        <td className="p-4 text-slate-700">
                          {item.supplierName || "-"}
                        </td>
                        <td className="p-4 text-slate-700">
                          {item.category || "-"}
                        </td>
                        <td className="p-4 text-right font-black text-rose-700">
                          {item.stockQuantity ?? 0}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" className="p-6 text-sm text-slate-500">
                        No low-stock items found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <aside className="space-y-6">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <h3 className="text-lg font-black text-slate-900">
                Payment Split
              </h3>
              <div className="mt-4 space-y-3">
                {payments.map((payment) => (
                  <div
                    key={payment.label}
                    className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3"
                  >
                    <span className="text-sm font-bold text-slate-600">
                      {payment.label}
                    </span>
                    <span className="font-black text-slate-900">
                      {isLoading ? "-" : money(payment.value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <h3 className="text-lg font-black text-slate-900">
                Quick Actions
              </h3>
              <div className="mt-4 grid grid-cols-1 gap-3">
                <Link
                  to="/bill/new"
                  className="rounded-xl bg-blue-600 px-4 py-3 text-center text-sm font-bold text-white hover:bg-blue-700"
                >
                  New Bill
                </Link>
                <Link
                  to="/masters/products"
                  className="rounded-xl border border-slate-300 px-4 py-3 text-center text-sm font-bold text-slate-700 hover:bg-slate-100"
                >
                  Add Product
                </Link>
                <Link
                  to="/purchases/new"
                  className="rounded-xl border border-slate-300 px-4 py-3 text-center text-sm font-bold text-slate-700 hover:bg-slate-100"
                >
                  New Purchase
                </Link>
                <Link
                  to="/masters/suppliers"
                  className="rounded-xl border border-slate-300 px-4 py-3 text-center text-sm font-bold text-slate-700 hover:bg-slate-100"
                >
                  Add Supplier
                </Link>
              </div>
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
}
