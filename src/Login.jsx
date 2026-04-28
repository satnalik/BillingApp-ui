import React, { useState } from "react";
import api from "./api";
import { useNavigate } from "react-router-dom";

// Standard SVG Icons for a professional look
const LockIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

const UserIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

export default function Login() {
  const [form, setForm] = useState({ userId: "", password: "", tenantId: "" });
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(""); // Modern error handling
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(""); // Clear previous errors

    try {
      const response = await api.post("/auth/login", {
        userId: form.userId,
        password: form.password,
        // tenantId: form.tenantId,
      });

      // Verification of token key from backend
      const token = response.data.token || response.data.jwt;

      if (token) {
        localStorage.setItem("token", token);

        // Extract tenantId from JWT (assume JWT is in format header.payload.signature)
        try {
          const payload = JSON.parse(atob(token.split(".")[1]));
          const tenantId =
            payload.tenantId || payload.tenantID || payload.tenant_id;
          if (tenantId) {
            localStorage.setItem("tenantId", tenantId);
          } else {
            // fallback: clear tenantId if not found
            localStorage.removeItem("tenantId");
          }
        } catch (e) {
          // fallback: clear tenantId if token is not a valid JWT
          localStorage.removeItem("tenantId");
        }

        // Success - Move to dashboard
        navigate("/new-bill");
      } else {
        setErrorMsg("Authentication successful, but session token is missing.");
      }
    } catch (err) {
      // Precise Error Handling for a better User Experience
      if (!err.response) {
        // Backend is down or Network Issue
        setErrorMsg(
          "Server unreachable. Please check your connection or contact Admin.",
        );
        console.error("Network/Server Down:", err);
      } else if (err.response.status === 401 || err.response.status === 403) {
        // Auth failure
        setErrorMsg("Invalid ID, Password, or Store ID.");
      } else if (err.response.status >= 500) {
        // Backend error
        setErrorMsg("Server error (500). Our team is working on it.");
      } else {
        setErrorMsg("An unexpected error occurred. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 font-sans">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-slate-200">
        <h1 className="text-3xl font-bold text-center text-slate-800 mb-2">
          Pahal Retail
        </h1>
        <p className="text-center text-slate-500 mb-8">
          Store Management System
        </p>

        {/* Dynamic Error Alert Box */}
        {errorMsg && (
          <div className="mb-6 p-3 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm font-medium rounded animate-pulse">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Tenant ID Field */}
          {/* <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">
              Store / Tenant ID
            </label>
            <input
              type="text"
              required
              placeholder="e.g. STORE_JAMSHEDPUR"
              className="w-full p-3 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              onChange={(e) => setForm({ ...form, tenantId: e.target.value })}
              disabled={loading}
            />
          </div> */}

          {/* User ID Field */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">
              User ID
            </label>
            <div className="flex items-center border border-slate-300 rounded-lg px-3 focus-within:ring-2 focus-within:ring-blue-500 transition-all">
              <UserIcon />
              <input
                type="text"
                required
                placeholder="Enter your ID"
                className="w-full p-3 outline-none bg-transparent"
                onChange={(e) => setForm({ ...form, userId: e.target.value })}
                disabled={loading}
              />
            </div>
          </div>

          {/* Password Field */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">
              Password
            </label>
            <div className="flex items-center border border-slate-300 rounded-lg px-3 focus-within:ring-2 focus-within:ring-blue-500 transition-all">
              <LockIcon />
              <input
                type="password"
                required
                placeholder="••••••••"
                className="w-full p-3 outline-none bg-transparent"
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                disabled={loading}
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3 rounded-lg font-bold text-white shadow-lg transition-all 
              ${
                loading
                  ? "bg-blue-400 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700 active:scale-95"
              }`}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg
                  className="animate-spin h-5 w-5 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Authenticating...
              </span>
            ) : (
              "Sign In to Dashboard"
            )}
          </button>
        </form>

        <p className="mt-8 text-center text-xs text-slate-400">
          Secure Login for Pahal Retail Staff Only
        </p>
      </div>
    </div>
  );
}
