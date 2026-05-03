import React from "react";

export default function PaymentModal({
  activeBill,
  addPaymentRow,
  billDiscountType,
  billDiscountValue,
  closePaymentModal,
  formatCurrency,
  handleConfirmPayment,
  isSubmitting,
  paymentDifference,
  paymentError,
  paymentMethods,
  paymentRows,
  paymentTotal,
  removePaymentRow,
  setBillDiscountType,
  setBillDiscountValue,
  totals,
  updatePaymentRow,
}) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/50 p-4">
      <div className="w-full max-w-3xl rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black text-slate-900">
              Complete Payment
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Collect payment before saving the bill.
            </p>
          </div>
          <button
            type="button"
            onClick={closePaymentModal}
            className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-100"
          >
            Close
          </button>
        </div>

        <div className="mt-6 grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-5 md:grid-cols-3">
          <div>
            <div className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Customer
            </div>
            <div className="mt-2 text-lg font-bold text-slate-900">
              {activeBill.customerName.trim() || "Guest"}
            </div>
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Total To Collect
            </div>
            <div className="mt-2 text-lg font-bold text-slate-900">
              {formatCurrency(totals.grandTotal)}
            </div>
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Remaining
            </div>
            <div
              className={`mt-2 text-lg font-bold ${
                Math.abs(paymentDifference) <= 0.05
                  ? "text-emerald-600"
                  : "text-amber-600"
              }`}
            >
              {formatCurrency(paymentDifference)}
            </div>
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Additional Bill Discount (Before GST)
              </div>
              <div className="mt-2 text-sm text-slate-500">
                Applied on taxable amount before CGST/SGST.
              </div>
            </div>

            <div className="grid w-full gap-3 md:w-auto md:grid-cols-[auto_180px]">
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setBillDiscountType("PERCENT");
                    setBillDiscountValue("");
                  }}
                  className={`rounded-xl border px-4 py-3 text-sm font-black transition-colors ${
                    billDiscountType === "PERCENT"
                      ? "border-blue-600 bg-blue-50 text-blue-700"
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                  }`}
                >
                  %
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setBillDiscountType("AMOUNT");
                    setBillDiscountValue("");
                  }}
                  className={`rounded-xl border px-4 py-3 text-sm font-black transition-colors ${
                    billDiscountType === "AMOUNT"
                      ? "border-blue-600 bg-blue-50 text-blue-700"
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                  }`}
                >
                  â‚¹
                </button>
              </div>

              <div>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  max={billDiscountType === "PERCENT" ? 100 : undefined}
                  value={billDiscountValue}
                  onChange={(event) => setBillDiscountValue(event.target.value)}
                  placeholder={
                    billDiscountType === "PERCENT" ? "0 - 100" : "Amount"
                  }
                  className="w-full rounded-xl border-2 border-slate-200 p-3 text-right outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <div className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Taxable (Before Discount)
              </div>
              <div className="mt-1 text-lg font-black text-slate-900">
                {formatCurrency(totals.baseTaxable)}
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <div className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Bill Discount
              </div>
              <div className="mt-1 text-lg font-black text-rose-600">
                - {formatCurrency(totals.billDiscountAmount)}
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <div className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Taxable (After Discount)
              </div>
              <div className="mt-1 text-lg font-black text-slate-900">
                {formatCurrency(totals.taxable)}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 space-y-3">
          {paymentRows.map((row, index) => (
            <div
              key={row.id}
              className="grid gap-3 rounded-2xl border border-slate-200 p-4 md:grid-cols-[1fr_1fr_auto]"
            >
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-600">
                  Method {index + 1}
                </label>
                <select
                  value={row.method}
                  onChange={(event) =>
                    updatePaymentRow(row.id, { method: event.target.value })
                  }
                  className="w-full rounded-xl border-2 border-slate-200 p-3 outline-none focus:border-blue-500"
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
                  Amount
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={row.amount}
                  onChange={(event) =>
                    updatePaymentRow(row.id, { amount: event.target.value })
                  }
                  className="w-full rounded-xl border-2 border-slate-200 p-3 outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-end">
                <button
                  type="button"
                  onClick={() => removePaymentRow(row.id)}
                  disabled={paymentRows.length === 1}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-40"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={addPaymentRow}
            disabled={paymentRows.length >= paymentMethods.length}
            className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-40"
          >
            Add Split Payment
          </button>

          <div className="text-right">
            <div className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Collected
            </div>
            <div className="text-xl font-black text-slate-900">
              {formatCurrency(paymentTotal)}
            </div>
          </div>
        </div>

        {paymentError && (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
            {paymentError}
          </div>
        )}

        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <button
            type="button"
            onClick={closePaymentModal}
            className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-100"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirmPayment}
            disabled={isSubmitting}
            className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white hover:bg-blue-700 disabled:bg-slate-300"
          >
            {isSubmitting ? "SAVING BILL..." : "SAVE PAYMENT"}
          </button>
        </div>
      </div>
    </div>
  );
}

