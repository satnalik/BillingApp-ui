import React, { useEffect, useState } from "react";
import api from "./api";

const ROLES = ["ROLE_ADMIN", "ROLE_MANAGER", "ROLE_CASHIER"];

const initialForm = {
  userId: "",
  name: "",
  password: "",
  role: "ROLE_CASHIER",
  tenantId: "",
  is_FirstTimeLogin: true,
};

async function createUser(payload) {
  // Backend: @RequestMapping("/api/users") + @PostMapping("/adduser")
  // Frontend api baseURL already includes "/api", so path is "/users/adduser".
  const attempts = ["/users/adduser"];

  let lastError = null;
  for (const path of attempts) {
    try {
      return await api.post(path, payload);
    } catch (err) {
      lastError = err;
      const status = err?.response?.status;
      // If we’re unauthorized/forbidden/validation failed, don't keep trying other paths.
      if (status === 400 || status === 401 || status === 403) throw err;
      // Otherwise keep trying next path (e.g., 404).
    }
  }
  throw lastError || new Error("Failed to create user");
}

export default function AddUser() {
  const [form, setForm] = useState(initialForm);
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    const tenantId = localStorage.getItem("tenantId") || "";
    setForm((prev) => ({ ...prev, tenantId }));
  }, []);

  useEffect(() => {
    if (!successMessage) return undefined;
    const timer = setTimeout(() => setSuccessMessage(""), 3000);
    return () => clearTimeout(timer);
  }, [successMessage]);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const canSubmit =
    form.userId.trim() &&
    form.name.trim() &&
    form.password.trim().length >= 4 &&
    form.tenantId.trim() &&
    ROLES.includes(form.role) &&
    !isSaving;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;

    setIsSaving(true);
    try {
      const payload = {
        userId: form.userId.trim(),
        name: form.name.trim(),
        password: form.password,
        role: form.role,
        tenantId: form.tenantId.trim(),
        is_FirstTimeLogin: Boolean(form.is_FirstTimeLogin),
      };

      await createUser(payload);
      setSuccessMessage("User created successfully.");
      setForm((prev) => ({
        ...initialForm,
        tenantId: prev.tenantId,
      }));
    } catch (error) {
      console.error("Failed to create user:", error);
      alert(error.response?.data?.message || "Failed to create user");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="w-full">
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-600">
          User Setup
        </p>
        <h2 className="mt-2 text-2xl font-black text-slate-900">Add User</h2>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Create an application user for a tenant/store. Password is sent to the
          backend and should be encrypted there.
        </p>

        {successMessage && (
          <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
            {successMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 grid gap-5 md:max-w-2xl">
          <div>
            <label className="mb-2 block text-sm font-bold text-slate-600">
              User ID
            </label>
            <input
              type="text"
              placeholder="e.g. cashier01"
              className="w-full rounded-xl border-2 border-slate-200 p-3 outline-none focus:border-blue-500"
              value={form.userId}
              onChange={(e) =>
                handleChange("userId", e.target.value.slice(0, 40))
              }
              autoComplete="off"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-slate-600">
              Name
            </label>
            <input
              type="text"
              placeholder="Full name"
              className="w-full rounded-xl border-2 border-slate-200 p-3 outline-none focus:border-blue-500"
              value={form.name}
              onChange={(e) =>
                handleChange("name", e.target.value.slice(0, 60))
              }
            />
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-bold text-slate-600">
                Role
              </label>
              <select
                className="w-full rounded-xl border-2 border-slate-200 p-3 outline-none focus:border-blue-500"
                value={form.role}
                onChange={(e) => handleChange("role", e.target.value)}
              >
                {ROLES.map((role) => (
                  <option key={role} value={role}>
                    {role.replace("ROLE_", "")}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-slate-600">
                Tenant ID
              </label>
              <input
                type="text"
                placeholder="Store/Tenant id"
                className="w-full rounded-xl border-2 border-slate-200 p-3 outline-none focus:border-blue-500"
                value={form.tenantId}
                readOnly
                disabled
                title="Tenant ID is set from your login and cannot be changed here."
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-slate-600">
              Password
            </label>
            <input
              type="password"
              placeholder="Temporary password"
              className="w-full rounded-xl border-2 border-slate-200 p-3 outline-none focus:border-blue-500"
              value={form.password}
              onChange={(e) => handleChange("password", e.target.value)}
              autoComplete="new-password"
            />
            <p className="mt-2 text-xs font-semibold text-slate-500">
              Minimum 4 characters (adjust if backend enforces stronger rules).
            </p>
          </div>

          <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
            <input
              type="checkbox"
              checked={Boolean(form.is_FirstTimeLogin)}
              onChange={(e) =>
                handleChange("is_FirstTimeLogin", e.target.checked)
              }
            />
            Force password change on first login
          </label>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() =>
                setForm((prev) => ({
                  ...initialForm,
                  tenantId: prev.tenantId,
                }))
              }
              disabled={isSaving}
              className="rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed"
            >
              Reset
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 disabled:hover:bg-slate-200"
            >
              {isSaving ? "CREATING..." : "Create User"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
