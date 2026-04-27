import React from "react";

export default function PlaceholderPage({ title, description }) {
  return (
    <div className="min-h-screen w-full bg-slate-50 p-6">
      <div className="w-full rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-600">
          Pahal Retail
        </p>
        <h2 className="mt-3 text-3xl font-black text-slate-900">{title}</h2>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-500">
          {description}
        </p>
      </div>
    </div>
  );
}
