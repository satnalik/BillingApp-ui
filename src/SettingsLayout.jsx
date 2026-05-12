import React from "react";
import { NavLink, Outlet } from "react-router-dom";

const settingsItems = [
  { label: "GST", path: "/settings/gst", description: "Tax configuration" },
  { label: "Users", path: "/settings/users", description: "Create application users" },
  { label: "Salesman", path: "/settings/salesmen", description: "Manage salesman records" },
];

export default function SettingsLayout() {
  return (
    <div className="w-full p-6 font-sans">
      <div className="grid w-full items-start gap-6 lg:grid-cols-[260px_1fr]">
        <aside className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:sticky lg:top-6 lg:h-[calc(100vh-140px)] lg:overflow-auto">
          <div className="px-2 pb-3">
            <div className="text-xs font-extrabold uppercase tracking-[0.18em] text-blue-600">
              Settings
            </div>
            <div className="mt-1 text-lg font-black text-slate-900">
              Manage Store
            </div>
            <div className="mt-1 text-sm font-semibold text-slate-500">
              Configure billing options.
            </div>
          </div>

          <nav className="mt-2 space-y-1">
            {settingsItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  [
                    "block",
                    "rounded-xl",
                    "border",
                    "px-4",
                    "py-3",
                    "transition-colors",
                    isActive
                      ? "border-blue-200 bg-blue-50 text-blue-800"
                      : "border-transparent bg-white text-slate-700 hover:border-slate-200 hover:bg-slate-50",
                  ].join(" ")
                }
              >
                <div className="text-sm font-extrabold">{item.label}</div>
                <div className="mt-1 text-xs font-semibold text-slate-500">
                  {item.description}
                </div>
              </NavLink>
            ))}
          </nav>
        </aside>

        <section className="min-w-0">
          <Outlet />
        </section>
      </div>
    </div>
  );
}
