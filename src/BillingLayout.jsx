import React from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";

const navItems = [
  { label: "New Bill", path: "/new-bill" },
  { label: "Get Bill", path: "/get-bill" },
  { label: "Reports", path: "/reports" },
  { label: "Products", path: "/add-products" },
  { label: "Check Inventory", path: "/check-inventory" },
  { label: "Salesman", path: "/add-salesman" },
];

export default function BillingLayout() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("tenantId");
    localStorage.removeItem("user");
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="border-b border-slate-200 bg-white">
        <div className="flex flex-col gap-4 px-6 py-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-2 whitespace-nowrap">
              <span className="text-xl text-blue-600" aria-hidden="true">
                #
              </span>
              <h1 className="text-xl font-black italic text-blue-600">
                PAHAL RETAIL
              </h1>
            </div>
            <div className="flex flex-col items-end gap-2">
              <span className="inline-block rounded-full bg-blue-100 px-3 py-1 text-sm font-bold text-blue-700">
                Store: {localStorage.getItem("tenantId") || "Main"}
              </span>
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
              >
                Logout
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <nav className="overflow-x-auto">
              <div className="flex min-w-max gap-2">
                {navItems.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) =>
                      `block rounded-lg px-4 py-3 text-sm font-semibold transition-colors ${
                        isActive
                          ? "bg-blue-600 text-white shadow-sm"
                          : "text-slate-700 hover:bg-slate-100"
                      }`
                    }
                  >
                    {item.label}
                  </NavLink>
                ))}
              </div>
            </nav>
          </div>
        </div>
      </header>

      <main className="min-w-0">
        <div className="w-full">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
