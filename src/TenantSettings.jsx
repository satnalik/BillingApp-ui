import React, { useEffect, useMemo, useState } from "react";
import api from "./api";

function toPercentString(rate) {
  const pct = Number(rate) * 100;
  if (!Number.isFinite(pct)) return "";
  return String(pct);
}

function toRateDecimal(percentString) {
  const pct = Number(String(percentString ?? "").trim());
  if (!Number.isFinite(pct) || pct < 0) return null;
  return pct / 100;
}

export default function TenantSettings() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  const [gstEnabled, setGstEnabled] = useState(true);
  const [gstRatePercent, setGstRatePercent] = useState("18");

  const gstRateDecimal = useMemo(
    () => toRateDecimal(gstRatePercent),
    [gstRatePercent],
  );

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      setError("");

      try {
        const response = await api.get("/tenant/settings");
        const data = response.data ?? {};
        setGstEnabled(Boolean(data.gstEnabled ?? true));
        setGstRatePercent(toPercentString(data.gstRate ?? 0.18));
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error("Tenant settings load failed:", err);
        setError(err.response?.data?.message || "Failed to load tenant settings.");
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, []);

  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(""), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  const save = async () => {
    if (isSaving) return;
    setError("");
    setToast("");

    if (gstEnabled) {
      if (gstRateDecimal === null) {
        setError("Enter a valid GST rate percentage (e.g. 18).");
        return;
      }
    }

    setIsSaving(true);
    try {
      const payload = gstEnabled
        ? { gstEnabled: true, gstRate: gstRateDecimal }
        : { gstEnabled: false };

      await api.put("/tenant/settings", payload);
      setToast("Tenant GST settings saved.");
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Tenant settings save failed:", err);
      setError(err.response?.data?.message || "Failed to save tenant settings.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="w-full font-sans">
      <div className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="text-xs font-extrabold uppercase tracking-[0.18em] text-blue-600">
          Tenant Settings
        </div>
        <h1 className="mt-2 text-2xl font-black text-slate-900">
          GST Configuration
        </h1>
        <p className="mt-2 text-sm font-semibold text-slate-600">
          Control whether bills include GST, and set the GST rate for this
          tenant.
        </p>

        {toast ? (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
            {toast}
          </div>
        ) : null}

        {error ? (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
            {error}
          </div>
        ) : null}

        {isLoading ? (
          <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 px-4 py-6 text-sm font-semibold text-slate-600">
            Loading settings...
          </div>
        ) : (
          <div className="mt-6 space-y-5">
            <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4">
              <div>
                <div className="text-sm font-black text-slate-900">
                  Apply GST on bills
                </div>
                <div className="mt-1 text-sm text-slate-600">
                  When disabled, totals are calculated without GST.
                </div>
              </div>
              <button
                type="button"
                onClick={() => setGstEnabled((prev) => !prev)}
                className={[
                  "relative inline-flex h-10 w-20 items-center rounded-full border transition-colors",
                  gstEnabled
                    ? "border-blue-600 bg-blue-600"
                    : "border-slate-300 bg-slate-200",
                ].join(" ")}
                aria-label="Toggle GST"
                title="Toggle GST"
              >
                <span
                  className={[
                    "inline-block h-8 w-8 transform rounded-full bg-white shadow transition-transform",
                    gstEnabled ? "translate-x-10" : "translate-x-1",
                  ].join(" ")}
                />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 rounded-2xl border border-slate-200 bg-white p-5 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-600">
                  GST Rate (%)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={gstRatePercent}
                  onChange={(e) => setGstRatePercent(e.target.value)}
                  disabled={!gstEnabled || isSaving}
                  placeholder="e.g. 18"
                  className="w-full rounded-xl border-2 border-slate-200 p-3 text-right outline-none focus:border-blue-500 disabled:bg-slate-100"
                />
                <div className="mt-2 text-xs font-semibold text-slate-500">
                  Example: enter <span className="font-black">18</span> to apply{" "}
                  <span className="font-black">18%</span> GST.
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  API Value
                </div>
                <div className="mt-2 text-lg font-black text-slate-900">
                  {gstEnabled ? String(gstRateDecimal ?? "-") : "gstEnabled=false"}
                </div>
                <div className="mt-1 text-xs font-semibold text-slate-500">
                  Backend expects decimal rate (e.g. 0.18).
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={save}
                disabled={isSaving}
                className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-black text-white hover:bg-blue-700 disabled:bg-slate-300"
              >
                {isSaving ? "SAVING..." : "SAVE SETTINGS"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
