import React from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";

class RouteErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error) {
    // Keep console error for debugging.
    // eslint-disable-next-line no-console
    console.error("Route render failed:", error);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="w-full p-6">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-left">
          <div className="text-xs font-extrabold uppercase tracking-[0.18em] text-rose-700">
            Page Error
          </div>
          <div className="mt-2 text-lg font-black text-rose-900">
            Something crashed while rendering this page.
          </div>
          <pre className="mt-4 whitespace-pre-wrap break-words text-sm text-rose-800">
            {String(this.state.error?.message || this.state.error)}
          </pre>
        </div>
      </div>
    );
  }
}

function getUserRole() {
  try {
    const token = localStorage.getItem("token");
    if (!token) return null;
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.role || payload.roles || null;
  } catch {
    return null;
  }
}

function getUserId() {
  const fromStorage = localStorage.getItem("userId");
  if (fromStorage) return fromStorage;

  try {
    const token = localStorage.getItem("token");
    if (!token) return null;
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.userId || payload.username || payload.sub || null;
  } catch {
    return null;
  }
}

const topNavItems = [
  { label: "Bill", path: "/bill/new" },
  { label: "Reports", path: "/reports", adminOnly: true },
  { label: "Products", path: "/add-products", adminOnly: true },
  { label: "Salesman", path: "/add-salesman", adminOnly: true },
];

const billSubItems = [
  { label: "New Bill", path: "/bill/new" },
  { label: "Get Bill", path: "/bill/get" },
  { label: "History", path: "/bill/history" },
  { label: "Dues", path: "/bill/dues" },
];

export default function BillingLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const isBillSection = location.pathname.startsWith("/bill");

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("tenantId");
    localStorage.removeItem("user");
    localStorage.removeItem("userId");
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
              <div className="flex flex-col items-end gap-2">
                <span className="inline-block rounded-full bg-blue-100 px-3 py-1 text-sm font-bold text-blue-700">
                  Store: {localStorage.getItem("tenantId") || "Main"}
                </span>
                <span className="inline-block rounded-full bg-slate-100 px-3 py-1 text-sm font-bold text-slate-700">
                  User: {getUserId() || "-"}
                </span>
              </div>
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
              <div className="flex min-w-max items-end gap-1">
                {topNavItems
                  .filter((item) => {
                    if (!item.adminOnly) return true;
                    const role = getUserRole();
                    if (!role) return false;
                    if (Array.isArray(role)) {
                      return (
                        role.includes("Admin") || role.includes("ROLE_ADMIN")
                      );
                    }
                    return role === "Admin" || role === "ROLE_ADMIN";
                  })
                  .map((item) => (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      className={({ isActive }) =>
                        [
                          "relative",
                          "select-none",
                          "rounded-t-xl",
                          "border",
                          "px-5",
                          "py-3",
                          "text-sm",
                          "font-extrabold",
                          "transition-colors",
                          isActive
                            ? "z-10 border-slate-200 border-b-white border-t-4 border-t-blue-600 bg-white text-blue-700 shadow-sm"
                            : "border-transparent bg-transparent text-slate-600 hover:border-slate-200 hover:bg-slate-50 hover:text-slate-800",
                        ].join(" ")
                      }
                    >
                      {item.label}
                    </NavLink>
                  ))}
              </div>
            </nav>
          </div>

          <div className="-mx-6 border-t border-slate-200" />

          {isBillSection && (
            <div className="-mb-px flex items-center gap-3">
              <nav className="overflow-x-auto">
                <div className="flex min-w-max items-end gap-1">
                  {billSubItems.map((item) => (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      className={({ isActive }) =>
                        [
                          "relative",
                          "select-none",
                          "rounded-t-xl",
                          "border",
                          "px-4",
                          "py-2.5",
                          "text-sm",
                          "font-bold",
                          "transition-colors",
                          isActive
                            ? "z-10 border-slate-200 border-b-white bg-white text-slate-900 shadow-sm"
                            : "border-transparent bg-transparent text-slate-600 hover:border-slate-200 hover:bg-slate-50 hover:text-slate-800",
                        ].join(" ")
                      }
                    >
                      {item.label}
                    </NavLink>
                  ))}
                </div>
              </nav>
            </div>
          )}
        </div>
      </header>

      <main className="min-w-0">
        {isBillSection ? (
          <div className="w-full px-6 py-6">
            <div className="rounded-b-2xl border border-slate-200 bg-white shadow-sm">
              <RouteErrorBoundary>
                <Outlet />
              </RouteErrorBoundary>
            </div>
          </div>
        ) : (
          <div className="w-full">
            <RouteErrorBoundary>
              <Outlet />
            </RouteErrorBoundary>
          </div>
        )}
      </main>
    </div>
  );
}
