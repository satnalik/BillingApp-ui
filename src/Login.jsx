import React, { useState } from "react";
import api from "./api"; // Ensure the path to your api.js is correct
import { useNavigate } from "react-router-dom";

// These are "Safe Icons" - just plain SVG code
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

const MailIcon = () => (
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
    <rect width="20" height="16" x="2" y="4" rx="2" />
    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
  </svg>
);

export default function Login() {
  const [form, setForm] = useState({ email: "", password: "", tenantId: "" });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await api.post("/auth/login", {
        email: form.email,
        password: form.password,
        tenantId: form.tenantId,
      });

      // 1. Log this to verify the key name (is it 'token' or 'jwt'?)
      console.log("Full Backend Response:", response.data);

      // 2. Extract based on what you see in the Network Tab
      const token = response.data.token || response.data.jwt;

      if (token) {
        // 3. Save it for api.js to use later
        localStorage.setItem("token", token);
        localStorage.setItem("tenantId", form.tenantId);

        // 4. Redirect to the landing page
        navigate("/new-bill");
      } else {
        alert("Login successful, but no token received!");
      }
    } catch (error) {
      console.error("Login failed:", error);
      alert("Invalid credentials. Please check your email and password.");
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
          Billing Management System
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Tenant ID
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Store_001"
              className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
              onChange={(e) => setForm({ ...form, tenantId: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Email Address
            </label>
            <div className="flex items-center border border-slate-300 rounded-lg px-3 focus-within:ring-2 focus-within:ring-blue-500">
              <MailIcon />
              <input
                type="email"
                required
                placeholder="admin@pahal.com"
                className="w-full p-2.5 outline-none bg-transparent"
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Password
            </label>
            <div className="flex items-center border border-slate-300 rounded-lg px-3 focus-within:ring-2 focus-within:ring-blue-500">
              <LockIcon />
              <input
                type="password"
                required
                placeholder="••••••••"
                className="w-full p-2.5 outline-none bg-transparent"
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full ${loading ? "bg-blue-400" : "bg-blue-600 hover:bg-blue-700"} text-white font-bold py-3 rounded-lg transition-all mt-4 shadow-lg`}
          >
            {loading ? "Authenticating..." : "Sign In to Dashboard"}
          </button>
        </form>
      </div>
    </div>
  );
}
