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
    // Keep console error for debugging.
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

const topNavItems = [
  { label: "Bill", path: "/bill/new" },
  { label: "Purchase", path: "/purchases", adminOnly: true },
  { label: "Masters", path: "/masters/products", adminOnly: true },
  { label: "Reports", path: "/reports", adminOnly: true },
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

const IDLE_LOGOUT_MS = 3 * 60 * 60 * 1000; // 3 hours

export default function BillingLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const isBillSection = location.pathname.startsWith("/bill");
  const isMastersSection = location.pathname.startsWith("/masters");
  const isPurchaseSection = location.pathname.startsWith("/purchases");

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
  const isAdmin = isAdminRole(getUserRole());

  const passwordsMatch =
    newPassword.trim().length > 0 &&
    confirmPassword.trim().length > 0 &&
    newPassword.trim() === confirmPassword.trim();

  useEffect(() => {
    if (!location.pathname.startsWith("/settings")) return;
    if (isAdmin) return;
    navigate("/bill/new", { replace: true });
  }, [isAdmin, location.pathname, navigate]);

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
        // Idle timeout reached: force logout and show login page.
        handleLogout();
      }, IDLE_LOGOUT_MS);
    };

    const reset = () => {
      const now = Date.now();
      // Throttle resets to avoid excessive timer churn on mousemove.
      if (now - lastResetRef.current < 1000) return;
      lastResetRef.current = now;
      arm();
    };

    // Start timer immediately after entering authenticated layout.
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
              <div className="relative" ref={accountMenuRef}>
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
          </div>

          <div className="flex items-center gap-3">
            <nav className="overflow-x-auto">
              <div className="flex min-w-max items-end gap-1">
                {topNavItems
                  .filter((item) => {
                    if (!item.adminOnly) return true;
                    return isAdmin;
                  })
                  .map((item) => {
                    const isSectionActive =
                      item.label === "Masters"
                        ? isMastersSection
                        : item.label === "Purchase"
                          ? isPurchaseSection
                          : false;

                    return (
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
                            isActive || isSectionActive
                              ? "z-10 border-slate-200 border-b-white border-t-4 border-t-blue-600 bg-white text-blue-700 shadow-sm"
                              : "border-transparent bg-transparent text-slate-600 hover:border-slate-200 hover:bg-slate-50 hover:text-slate-800",
                          ].join(" ")
                        }
                      >
                        {item.label}
                      </NavLink>
                    );
                  })}
              </div>
            </nav>
          </div>

          <div className="-mx-6 border-t border-slate-200" />

          {(isBillSection || isMastersSection || isPurchaseSection) && (
            <div className="-mb-px flex items-center gap-3">
              <nav className="overflow-x-auto">
                <div className="flex min-w-max items-end gap-1">
                  {(isBillSection
                    ? billSubItems
                    : isPurchaseSection
                      ? purchaseSubItems
                      : masterSubItems
                  ).map((item) => (
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
