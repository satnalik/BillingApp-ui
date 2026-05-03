/* eslint-disable react-hooks/set-state-in-effect */
import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import api from "./api";

function safeLower(value) {
  return String(value ?? "").trim().toLowerCase();
}

function formatMoney(value) {
  const n = Number(value ?? 0) || 0;
  return n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function toHumanDateTime(value) {
  if (value === null || value === undefined || value === "") return "-";

  const date =
    value instanceof Date
      ? value
      : typeof value === "number"
        ? new Date(value)
        : new Date(String(value));

  if (Number.isNaN(date.getTime())) return "-";

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

function getBillTimestamp(bill) {
  return (
    bill?.updatedAt ??
    bill?.updatedOn ??
    bill?.updatedDate ??
    bill?.modifiedAt ??
    bill?.modifiedOn ??
    bill?.createdAt ??
    bill?.createdOn ??
    bill?.createdDate ??
    bill?.timestamp ??
    bill?.timeStamp ??
    null
  );
}

export default function BillHistory() {
  const navigate = useNavigate();
  const location = useLocation();
  const [bills, setBills] = useState([]);
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const loadBills = async () => {
    setIsLoading(true);
    setError("");
    try {
      const response = await api.get("/bills");
      setBills(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      console.error("Bills load failed:", err);
      setBills([]);
      setError(err.response?.data?.message || "Failed to load bills.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadBills();
  }, []);

  // When user opens History tab, always pull the latest bill status.
  useEffect(() => {
    if (location.pathname !== "/bill/history") return;
    loadBills();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  // Also refresh when user returns to the browser tab.
  useEffect(() => {
    const onFocus = () => {
      if (location.pathname === "/bill/history") loadBills();
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  const filtered = useMemo(() => {
    const q = safeLower(query);
    if (!q) return bills;

    return bills.filter((b) => {
      const id = safeLower(b.id);
      const customer = safeLower(b.customerName);
      const phone = safeLower(b.contactInfo ?? b.contactNumber ?? b.phoneNumber);
      return id.includes(q) || customer.includes(q) || phone.includes(q);
    });
  }, [bills, query]);

  return (
    <div className="w-full p-6">
      <section className="rounded-none border-0 bg-transparent p-0 shadow-none">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-600">
              Bills
            </p>
            <h2 className="mt-2 text-2xl font-black text-slate-900">
              Bill History
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Search by bill number, customer name, or phone.
            </p>
          </div>

          <div className="flex w-full flex-col gap-3 md:w-auto md:flex-row md:items-end">
            <div>
              <label className="mb-2 block text-sm font-bold text-slate-600">
                Search
              </label>
              <input
                type="text"
                placeholder="e.g. 16 / Damu / 9876..."
                className="w-full rounded-xl border-2 border-slate-200 p-3 outline-none focus:border-blue-500 md:w-80"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <button
              type="button"
              onClick={loadBills}
              disabled={isLoading}
              className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-60"
            >
              {isLoading ? "Loading..." : "Refresh"}
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
            {error}
          </div>
        )}

        <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left">
            <thead className="bg-slate-100">
              <tr>
                <th className="p-4 text-sm font-bold text-slate-600">Bill</th>
                <th className="p-4 text-sm font-bold text-slate-600">Time</th>
                <th className="p-4 text-sm font-bold text-slate-600">Customer</th>
                <th className="p-4 text-sm font-bold text-slate-600">Phone</th>
                <th className="p-4 text-sm font-bold text-slate-600 text-right">
                  Total
                </th>
                <th className="p-4 text-sm font-bold text-slate-600 text-right">
                  Paid
                </th>
                <th className="p-4 text-sm font-bold text-slate-600 text-right">
                  Due
                </th>
                <th className="p-4 text-sm font-bold text-slate-600 text-right">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan="8" className="p-6 text-sm text-slate-500">
                    Loading bills...
                  </td>
                </tr>
              ) : filtered.length > 0 ? (
                filtered.map((b) => (
                  <tr key={b.id} className="border-t border-slate-100">
                    <td className="p-4 font-semibold text-slate-700">
                      {b.id}
                    </td>
                    <td className="p-4 text-slate-700">
                      {toHumanDateTime(getBillTimestamp(b))}
                    </td>
                    <td className="p-4 text-slate-800">{b.customerName || "-"}</td>
                    <td className="p-4 text-slate-700">
                      {b.contactInfo ?? b.contactNumber ?? b.phoneNumber ?? "-"}
                    </td>
                    <td className="p-4 text-right text-slate-800">
                      {formatMoney(b.totalAmount)}
                    </td>
                    <td className="p-4 text-right text-slate-700">
                      {formatMoney(b.paidAmount)}
                    </td>
                    <td className="p-4 text-right font-semibold text-rose-700">
                      {formatMoney(b.dueAmount)}
                    </td>
                    <td className="p-4 text-right">
                      <button
                        type="button"
                        onClick={() => navigate(`/bill/get?billId=${encodeURIComponent(b.id)}`)}
                        className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-700"
                      >
                        Open
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" className="p-6 text-sm text-slate-500">
                    No bills found.
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
