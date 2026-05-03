import React from "react";

export default function BillSlots({
  billSlots,
  activeSlotId,
  getSlotDisplayName,
  onSelectSlot,
}) {
  return (
    <div className="grid gap-3 md:grid-cols-5">
      {billSlots.map((slot) => {
        const isActive = slot.id === activeSlotId;
        const isOccupied =
          slot.customerName.trim() ||
          slot.contactNumber.trim() ||
          slot.selectedSalesman ||
          slot.cart.length > 0;

        return (
          <button
            key={slot.id}
            type="button"
            onClick={() => onSelectSlot(slot.id)}
            className={`rounded-2xl border p-4 text-left transition-colors ${
              isActive
                ? "border-blue-500 bg-blue-50 text-blue-900"
                : "border-slate-200 bg-white hover:border-slate-300"
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-bold">{slot.label}</span>
              <span
                className={`rounded-full px-2 py-1 text-[11px] font-bold ${
                  isActive
                    ? "bg-blue-100 text-blue-700"
                    : isOccupied
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-slate-100 text-slate-500"
                }`}
              >
                {isActive ? "Active" : isOccupied ? "On Hold" : "Empty"}
              </span>
            </div>
            <div className="mt-3 truncate text-base font-bold">
              {getSlotDisplayName(slot)}
            </div>
            <div className="mt-2 text-xs text-slate-500">
              {slot.cart.length} item{slot.cart.length === 1 ? "" : "s"}
            </div>
          </button>
        );
      })}
    </div>
  );
}

