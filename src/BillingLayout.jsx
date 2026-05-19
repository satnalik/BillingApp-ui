import React, { useEffect, useRef, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import api from "./api";
import { invalidateCustomerDirectoryCache } from "./customerDirectoryCache";

class RouteErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error) {
    console.error("Route render failed:", error);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="w-full p-6">
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-left">
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

function getStoredUser() {
  try {
    const raw = localStorage.getItem("user");
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function isAdminRole(role) {
  if (!role) return false;
  if (Array.isArray(role)) {
    return role.includes("Admin") || role.includes("ROLE_ADMIN");
  }
  return role === "Admin" || role === "ROLE_ADMIN";
}

function setStoredUser(nextUser) {
  if (!nextUser) return localStorage.removeItem("user");
  localStorage.setItem("user", JSON.stringify(nextUser));
}

const sidebarItems = [
  { label: "Dashboard", path: "/dashboard", icon: "dashboard" },
  { label: "Billing", path: "/bill/new", icon: "billing" },
  { label: "Products", path: "/masters/products", icon: "products", adminOnly: true },
  { label: "Suppliers", path: "/masters/suppliers", icon: "suppliers", adminOnly: true },
  { label: "Purchases", path: "/purchases", icon: "purchases", adminOnly: true },
  {
    label: "Barcode Labels",
    path: "/barcode-labels",
    icon: "barcode",
    adminOnly: true,
  },
  { label: "Customers", path: "/customers", icon: "customers" },
  { label: "Reports", path: "/reports", icon: "reports", adminOnly: true },
  { label: "Accounts", path: "/accounts", icon: "accounts", adminOnly: true },
  {
    label: "Users & Access",
    path: "/settings/users",
    icon: "users",
    adminOnly: true,
  },
  { label: "Settings", path: "/settings", icon: "settings", adminOnly: true },
];

const billSubItems = [
  { label: "New Bill", path: "/bill/new" },
  { label: "Get Bill", path: "/bill/get" },
  { label: "History", path: "/bill/history" },
  { label: "Dues", path: "/bill/dues" },
];

const masterSubItems = [
  { label: "Products", path: "/masters/products" },
  { label: "Suppliers", path: "/masters/suppliers" },
];

const purchaseSubItems = [
  { label: "Purchase List", path: "/purchases" },
  { label: "New Purchase", path: "/purchases/new" },
];

const IDLE_LOGOUT_MS = 3 * 60 * 60 * 1000;

function getSectionTitle(pathname) {
  if (pathname.startsWith("/bill")) return "Billing";
  if (pathname.startsWith("/masters/products")) return "Products";
  if (pathname.startsWith("/masters/suppliers")) return "Suppliers";
  if (pathname.startsWith("/masters")) return "Masters";
  if (pathname.startsWith("/purchases")) return "Purchases";
  if (pathname.startsWith("/barcode-labels")) return "Barcode Labels";
  if (pathname.startsWith("/customers")) return "Customers";
  if (pathname.startsWith("/accounts")) return "Accounts";
  if (pathname.startsWith("/reports")) return "Reports";
  if (pathname.startsWith("/settings")) return "Settings";
  return "Dashboard";
}

function getSectionSubItems(pathname) {
  if (pathname.startsWith("/bill")) return billSubItems;
  if (pathname.startsWith("/purchases")) return purchaseSubItems;
  if (pathname.startsWith("/masters")) return masterSubItems;
  return [];
}

function isSidebarItemActive(pathname, item) {
  if (item.path === "/dashboard") return pathname === "/dashboard";
  if (item.label === "Billing") return pathname.startsWith("/bill");
  if (item.label === "Products") return pathname.startsWith("/masters/products");
  if (item.label === "Suppliers") return pathname.startsWith("/masters/suppliers");
  if (item.label === "Purchases") return pathname.startsWith("/purchases");
  if (item.label === "Customers") {
    return pathname.startsWith("/customers") || pathname === "/bill/dues";
  }
  if (item.label === "Settings") return pathname.startsWith("/settings");
  return pathname.startsWith(item.path);
}

function ModuleIcon({ name }) {
  const commonProps = {
    width: 18,
    height: 18,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": "true",
  };

  const icons = {
    dashboard: (
      <svg {...commonProps}>
        <rect x="3" y="3" width="7" height="8" rx="1.5" />
        <rect x="14" y="3" width="7" height="5" rx="1.5" />
        <rect x="14" y="12" width="7" height="9" rx="1.5" />
        <rect x="3" y="15" width="7" height="6" rx="1.5" />
      </svg>
    ),
    billing: (
      <svg {...commonProps}>
        <path d="M7 3h10a2 2 0 0 1 2 2v16l-3-2-3 2-3-2-3 2-2-1.4V5a2 2 0 0 1 2-2Z" />
        <path d="M9 8h6" />
        <path d="M9 12h6" />
        <path d="M9 16h3" />
      </svg>
    ),
    products: (
      <svg {...commonProps}>
        <path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z" />
        <path d="m4.5 8 7.5 4.2L19.5 8" />
        <path d="M12 12v8.5" />
      </svg>
    ),
    suppliers: (
      <svg {...commonProps}>
        <path d="M3 7h11v10H3z" />
        <path d="M14 10h3l4 4v3h-7z" />
        <circle cx="7" cy="18" r="2" />
        <circle cx="17" cy="18" r="2" />
      </svg>
    ),
    purchases: (
      <svg {...commonProps}>
        <path d="M6 7h15l-2 8H8L6 7Z" />
        <path d="M6 7 5.4 4H3" />
        <circle cx="9" cy="20" r="1" />
        <circle cx="18" cy="20" r="1" />
        <path d="M10 11h6" />
      </svg>
    ),
    barcode: (
      <svg {...commonProps}>
        <path d="M4 5v14" />
        <path d="M7 5v14" />
        <path d="M11 5v14" />
        <path d="M14 5v14" />
        <path d="M20 5v14" />
        <path d="M17 5v14" strokeWidth="3" />
      </svg>
    ),
    customers: (
      <svg {...commonProps}>
        <circle cx="9" cy="8" r="3" />
        <path d="M3.5 20a5.5 5.5 0 0 1 11 0" />
        <path d="M16 11a3 3 0 1 0-1-5.8" />
        <path d="M17 20h3.5a4.5 4.5 0 0 0-5-4.5" />
      </svg>
    ),
    reports: (
      <svg {...commonProps}>
        <path d="M4 19V5a2 2 0 0 1 2-2h9l5 5v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z" />
        <path d="M14 3v6h6" />
        <path d="M8 17v-4" />
        <path d="M12 17V9" />
        <path d="M16 17v-2" />
      </svg>
    ),
    accounts: (
      <svg {...commonProps}>
        <path d="M4 10h16" />
        <path d="M6 10V7a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v3" />
        <rect x="5" y="10" width="14" height="9" rx="2" />
        <path d="M9 14h6" />
        <path d="M9 17h3" />
      </svg>
    ),
    users: (
      <svg {...commonProps}>
        <path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
        <circle cx="9.5" cy="7" r="4" />
        <path d="M19 8v6" />
        <path d="M22 11h-6" />
      </svg>
    ),
    settings: (
      <svg {...commonProps}>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 0 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2a2 2 0 0 1-4 0V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1A2 2 0 0 1 4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.6-1H2.8a2 2 0 0 1 0-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1A2 2 0 0 1 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.6v-.2a2 2 0 0 1 4 0V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1A2 2 0 0 1 19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2a2 2 0 0 1 0 4H21a1.7 1.7 0 0 0-1.6 1Z" />
      </svg>
    ),
  };

  return icons[name] || icons.dashboard;
}

export default function BillingLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const pathname = location.pathname;
  const isBillSection = pathname.startsWith("/bill");
  const sectionTitle = getSectionTitle(pathname);
  const sectionSubItems = getSectionSubItems(pathname);

  const storedUser = getStoredUser();
  const isFirstTimeLogin = Boolean(storedUser?._FirstTimeLogin);
  const [isFirstTimeModalOpen, setIsFirstTimeModalOpen] =
    useState(isFirstTimeLogin);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [passwordToast, setPasswordToast] = useState("");
  const idleTimerRef = useRef(null);
  const lastResetRef = useRef(0);
  const accountMenuRef = useRef(null);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const isAdmin = isAdminRole(getUserRole());

  const passwordsMatch =
    newPassword.trim().length > 0 &&
    confirmPassword.trim().length > 0 &&
    newPassword.trim() === confirmPassword.trim();

  useEffect(() => {
    const adminOnlyPaths = [
      "/settings",
      "/masters",
      "/purchases",
      "/reports",
      "/accounts",
      "/barcode-labels",
    ];
    if (!adminOnlyPaths.some((path) => pathname.startsWith(path))) return;
    if (isAdmin) return;
    navigate("/bill/new", { replace: true });
  }, [isAdmin, navigate, pathname]);

  useEffect(() => {
    if (!isAccountMenuOpen) return undefined;

    const handlePointerDown = (event) => {
      if (!accountMenuRef.current) return;
      if (accountMenuRef.current.contains(event.target)) return;
      setIsAccountMenuOpen(false);
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
    };
  }, [isAccountMenuOpen]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsMobileNavOpen(false);
    }, 0);

    return () => clearTimeout(timer);
  }, [pathname]);

  const handleLogout = () => {
    invalidateCustomerDirectoryCache();
    localStorage.removeItem("token");
    localStorage.removeItem("tenantId");
    localStorage.removeItem("user");
    localStorage.removeItem("userId");
    navigate("/");
  };

  useEffect(() => {
    const hasToken = Boolean(localStorage.getItem("token"));
    if (!hasToken) return undefined;

    const clearExisting = () => {
      if (!idleTimerRef.current) return;
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    };

    const arm = () => {
      clearExisting();
      idleTimerRef.current = setTimeout(() => {
        handleLogout();
      }, IDLE_LOGOUT_MS);
    };

    const reset = () => {
      const now = Date.now();
      if (now - lastResetRef.current < 1000) return;
      lastResetRef.current = now;
      arm();
    };

    arm();

    const events = [
      "mousedown",
      "mousemove",
      "keydown",
      "scroll",
      "touchstart",
      "click",
    ];
    events.forEach((event) => window.addEventListener(event, reset, true));

    return () => {
      events.forEach((event) => window.removeEventListener(event, reset, true));
      clearExisting();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleUpdatePassword = async () => {
    if (isUpdatingPassword) return;

    const a = newPassword.trim();
    const b = confirmPassword.trim();

    if (!a || !b) {
      setPasswordError("Please enter and confirm your new password.");
      return;
    }

    if (a !== b) {
      setPasswordError("Passwords do not match.");
      return;
    }

    setIsUpdatingPassword(true);
    setPasswordError("");
    setPasswordToast("");

    try {
      const currentUser = getStoredUser();
      await api.post("/auth/change-password", currentUser, {
        params: { password: a },
      });

      const current = getStoredUser();
      if (current) setStoredUser({ ...current, _FirstTimeLogin: false });

      setPasswordToast("Password updated successfully.");
      setIsFirstTimeModalOpen(false);
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      console.error("Change password failed:", err);
      setPasswordError(
        err.response?.data?.message || "Failed to update password.",
      );
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const visibleSidebarItems = sidebarItems.filter((item) => {
    if (!item.adminOnly) return true;
    return isAdmin;
  });

  const sidebar = (
    <aside className="flex h-full w-72 flex-col border-r border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-sm font-black text-white">
            PR
          </div>
          <div>
            <div className="text-lg font-black italic text-blue-600">
              PAHAL RETAIL
            </div>
            <div className="text-xs font-bold text-slate-500">
              Operational Console
            </div>
          </div>
        </div>
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto px-3 py-4">
        <div className="space-y-1">
          {visibleSidebarItems.map((item) => {
            const active = isSidebarItemActive(pathname, item);
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={[
                  "flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm font-extrabold transition-colors",
                  active
                    ? "border-blue-200 bg-blue-50 text-blue-700"
                    : "border-transparent text-slate-600 hover:border-slate-200 hover:bg-slate-50 hover:text-slate-900",
                ].join(" ")}
              >
                <span
                  className={[
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-black",
                    active
                      ? "bg-blue-600 text-white"
                      : "bg-slate-100 text-slate-600",
                  ].join(" ")}
                >
                  <ModuleIcon name={item.icon} />
                </span>
                <span className="truncate">{item.label}</span>
              </NavLink>
            );
          })}
        </div>
      </nav>

      <div className="border-t border-slate-200 p-4">
        <div className="rounded-xl bg-slate-50 px-3 py-2">
          <div className="truncate text-xs font-bold text-slate-500">Store</div>
          <div className="truncate text-sm font-black text-slate-800">
            {localStorage.getItem("tenantId") || "Main"}
          </div>
        </div>
      </div>
    </aside>
  );

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="flex min-h-screen">
        <div className="hidden lg:block lg:sticky lg:top-0 lg:h-screen">
          {sidebar}
        </div>

        {isMobileNavOpen && (
          <div className="fixed inset-0 z-50 flex lg:hidden">
            <button
              type="button"
              className="flex-1 bg-slate-900/40"
              aria-label="Close navigation"
              onClick={() => setIsMobileNavOpen(false)}
            />
            {sidebar}
          </div>
        )}

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-40 border-b border-slate-200 bg-white">
            <div className="flex items-center justify-between gap-4 px-4 py-3 lg:px-6">
              <div className="flex min-w-0 items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsMobileNavOpen(true)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 lg:hidden"
                  aria-label="Open navigation"
                >
                  <span className="text-xl leading-none">=</span>
                </button>
                <div className="min-w-0">
                  <div className="text-xs font-black uppercase tracking-[0.18em] text-blue-600">
                    {sectionTitle}
                  </div>
                  <div className="truncate text-sm font-bold text-slate-500">
                    {localStorage.getItem("tenantId") || "Main"} /{" "}
                    {getUserId() || "-"}
                  </div>
                </div>
              </div>

              <div className="relative shrink-0" ref={accountMenuRef}>
                <button
                  type="button"
                  onClick={() => setIsAccountMenuOpen((prev) => !prev)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  aria-label="Open account menu"
                  title="Account menu"
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M20 21a8 8 0 0 0-16 0" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </button>

                {isAccountMenuOpen && (
                  <div className="absolute right-0 z-50 mt-2 w-48 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 text-left shadow-xl">
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsAccountMenuOpen(false);
                          navigate("/settings");
                        }}
                        className="block w-full px-4 py-3 text-left text-sm font-bold text-slate-700 hover:bg-slate-50"
                      >
                        Settings
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="block w-full px-4 py-3 text-left text-sm font-bold text-red-600 hover:bg-red-50"
                    >
                      Logout
                    </button>
                  </div>
                )}
              </div>
            </div>

            {sectionSubItems.length > 0 && (
              <div className="border-t border-slate-200 px-4 lg:px-6">
                <nav className="overflow-x-auto">
                  <div className="flex min-w-max items-end gap-1">
                    {sectionSubItems.map((item) => (
                      <NavLink
                        key={item.path}
                        to={item.path}
                        end={item.path === "/purchases"}
                        className={({ isActive }) =>
                          [
                            "relative -mb-px select-none rounded-t-xl border px-4 py-2.5 text-sm font-bold transition-colors",
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
          </header>

          {isFirstTimeModalOpen && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 p-4">
              <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
                <div className="text-xs font-extrabold uppercase tracking-[0.18em] text-blue-600">
                  First Time Login
                </div>
                <div className="mt-2 text-xl font-black text-slate-900">
                  Update your password
                </div>
                <div className="mt-2 text-sm font-semibold text-slate-600">
                  You must set a new password before continuing.
                </div>

                {passwordToast ? (
                  <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
                    {passwordToast}
                  </div>
                ) : null}

                {passwordError ? (
                  <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
                    {passwordError}
                  </div>
                ) : null}

                <div className="mt-5 grid grid-cols-1 gap-4">
                  <div>
                    <label className="mb-2 block text-sm font-bold text-slate-600">
                      New password
                    </label>
                    <input
                      type="password"
                      className="w-full rounded-xl border-2 border-slate-200 p-3 outline-none focus:border-blue-500"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      disabled={isUpdatingPassword}
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-bold text-slate-600">
                      Re-enter new password
                    </label>
                    <div className="relative">
                      <input
                        type="password"
                        className="w-full rounded-xl border-2 border-slate-200 p-3 pr-10 outline-none focus:border-blue-500"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        disabled={isUpdatingPassword}
                      />
                      {passwordsMatch && !passwordError ? (
                        <span
                          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-emerald-600"
                          aria-label="Passwords match"
                          title="Passwords match"
                        >
                          <svg
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M20 6 9 17l-5-5" />
                          </svg>
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={handleLogout}
                    disabled={isUpdatingPassword}
                    className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Logout
                  </button>
                  <button
                    type="button"
                    onClick={handleUpdatePassword}
                    disabled={isUpdatingPassword}
                    className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-black text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 disabled:hover:bg-slate-200"
                  >
                    {isUpdatingPassword ? "Updating..." : "Confirm"}
                  </button>
                </div>
              </div>
            </div>
          )}

          <main className="min-w-0 flex-1">
            <div className={isBillSection ? "w-full px-4 py-4 lg:px-6" : "w-full"}>
              <div
                className={
                  isBillSection
                    ? "rounded-xl border border-slate-200 bg-white shadow-sm"
                    : ""
                }
              >
                <RouteErrorBoundary>
                  <Outlet />
                </RouteErrorBoundary>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
