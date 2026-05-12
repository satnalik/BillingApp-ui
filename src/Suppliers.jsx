import React, { useEffect, useMemo, useState } from "react";
import api from "./api";
import { searchSuppliers } from "./supplierApi";

const initialForm = {
  id: null,
  name: "",
  supplierCode: "",
  contactPerson: "",
  phoneNumber: "",
  email: "",
  gstNumber: "",
  address: "",
  active: true,
};

function normalizeSupplier(supplier) {
  if (!supplier || typeof supplier !== "object") return supplier;

  return {
    ...supplier,
    active:
      supplier.active === undefined || supplier.active === null
        ? true
        : Boolean(supplier.active),
    supplierCode: String(supplier.supplierCode || "").toUpperCase(),
  };
}

function toFormSupplier(supplier) {
  return {
    id: supplier.id ?? null,
    name: String(supplier.name ?? ""),
    supplierCode: String(supplier.supplierCode ?? "").toUpperCase(),
    contactPerson: String(supplier.contactPerson ?? ""),
    phoneNumber: String(supplier.phoneNumber ?? ""),
    email: String(supplier.email ?? ""),
    gstNumber: String(supplier.gstNumber ?? ""),
    address: String(supplier.address ?? ""),
    active:
      supplier.active === undefined || supplier.active === null
        ? true
        : Boolean(supplier.active),
  };
}

function buildPayload(form) {
  return {
    name: form.name.trim(),
    supplierCode: form.supplierCode.trim().toUpperCase(),
    contactPerson: form.contactPerson.trim() || null,
    phoneNumber: form.phoneNumber.trim() || null,
    email: form.email.trim() || null,
    gstNumber: form.gstNumber.trim() || null,
    address: form.address.trim() || null,
    active: Boolean(form.active),
  };
}

export default function Suppliers() {
  const [form, setForm] = useState(initialForm);
  const [suppliers, setSuppliers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [togglingId, setTogglingId] = useState("");

  const loadSuppliers = async (name = "") => {
    setIsLoading(true);

    try {
      const data = await searchSuppliers(name);
      setSuppliers(data.map(normalizeSupplier));
    } catch (error) {
      console.error("Failed to load suppliers:", error);
      setSuppliers([]);
      alert(error.response?.data?.message || "Failed to load suppliers");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadSuppliers(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    if (!successMessage) return undefined;

    const timer = setTimeout(() => {
      setSuccessMessage("");
    }, 3000);

    return () => clearTimeout(timer);
  }, [successMessage]);

  const sortedSuppliers = useMemo(
    () =>
      [...suppliers].sort((a, b) =>
        String(a.name || "").localeCompare(String(b.name || "")),
      ),
    [suppliers],
  );

  const canSubmit =
    form.name.trim() && form.supplierCode.trim() && !isSaving;

  const handleChange = (field, value) => {
    setForm((prev) => ({
      ...prev,
      [field]:
        field === "supplierCode" || field === "gstNumber"
          ? String(value).toUpperCase()
          : value,
    }));
  };

  const closeModal = () => {
    if (isSaving) return;
    setIsModalOpen(false);
    setIsEditMode(false);
    setForm(initialForm);
  };

  const openAddModal = () => {
    setIsEditMode(false);
    setForm(initialForm);
    setIsModalOpen(true);
  };

  const openEditModal = (supplier) => {
    if (!supplier) return;
    setIsEditMode(true);
    setForm(toFormSupplier(supplier));
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;

    setIsSaving(true);

    try {
      const payload = buildPayload(form);

      if (isEditMode) {
        await api.put(`/suppliers/${form.id}`, payload);
      } else {
        await api.post("/suppliers", payload);
      }

      await loadSuppliers(searchQuery);
      setSuccessMessage(
        isEditMode
          ? "Supplier updated successfully."
          : "Supplier added successfully.",
      );
      setIsModalOpen(false);
      setIsEditMode(false);
      setForm(initialForm);
    } catch (error) {
      console.error("Failed to save supplier:", error);
      alert(error.response?.data?.message || "Failed to save supplier");
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async (supplier) => {
    const supplierId = supplier.id;
    const nextActive = !supplier.active;

    if (!supplierId || togglingId) return;

    setTogglingId(String(supplierId));

    try {
      const response = await api.patch(`/suppliers/${supplierId}/active`, {
        active: nextActive,
      });

      const updated = normalizeSupplier(response?.data);
      setSuppliers((prev) =>
        prev.map((item) =>
          item.id === supplierId
            ? updated && updated.id === supplierId
              ? updated
              : { ...item, active: nextActive }
            : item,
        ),
      );
    } catch (error) {
      console.error("Failed to update supplier status:", error);
      alert(
        error.response?.data?.message || "Failed to update supplier status",
      );
    } finally {
      setTogglingId("");
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-50 p-6">
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-600">
              Supplier Master
            </p>
            <h2 className="mt-2 text-2xl font-black text-slate-900">
              Suppliers
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Manage supplier records used by product and purchase workflows.
            </p>
          </div>

          <div className="flex w-full flex-col gap-3 md:w-auto md:flex-row md:items-end">
            <div className="w-full md:w-80">
              <label className="mb-2 block text-sm font-bold text-slate-600">
                Search
              </label>
              <input
                type="text"
                placeholder="Search supplier by name"
                className="w-full rounded-xl border-2 border-slate-200 p-3 outline-none focus:border-blue-500"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <button
              type="button"
              onClick={openAddModal}
              className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white hover:bg-blue-700"
            >
              + Add Supplier
            </button>
          </div>
        </div>

        {successMessage && (
          <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
            {successMessage}
          </div>
        )}

        <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full min-w-[980px] text-left">
            <thead className="bg-slate-100">
              <tr>
                <th className="p-4 text-sm font-bold text-slate-600">
                  Supplier Name
                </th>
                <th className="p-4 text-sm font-bold text-slate-600">Code</th>
                <th className="p-4 text-sm font-bold text-slate-600">
                  Contact Person
                </th>
                <th className="p-4 text-sm font-bold text-slate-600">Phone</th>
                <th className="p-4 text-sm font-bold text-slate-600">GST</th>
                <th className="p-4 text-sm font-bold text-slate-600">
                  Active
                </th>
                <th className="p-4 text-right text-sm font-bold text-slate-600">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan="7" className="p-6 text-sm text-slate-500">
                    Loading suppliers...
                  </td>
                </tr>
              ) : sortedSuppliers.length > 0 ? (
                sortedSuppliers.map((supplier) => {
                  const isActive = Boolean(supplier.active);
                  const isToggling = togglingId === String(supplier.id || "");

                  return (
                    <tr key={supplier.id} className="border-t border-slate-100">
                      <td className="p-4 font-semibold text-slate-800">
                        {supplier.name || "-"}
                      </td>
                      <td className="p-4 text-slate-700">
                        {supplier.supplierCode || "-"}
                      </td>
                      <td className="p-4 text-slate-700">
                        {supplier.contactPerson || "-"}
                      </td>
                      <td className="p-4 text-slate-700">
                        {supplier.phoneNumber || "-"}
                      </td>
                      <td className="p-4 text-slate-700">
                        {supplier.gstNumber || "-"}
                      </td>
                      <td className="p-4">
                        <button
                          type="button"
                          onClick={() => handleToggleActive(supplier)}
                          disabled={isToggling}
                          className={`relative h-7 w-14 rounded-full transition-colors ${
                            isActive ? "bg-emerald-500" : "bg-slate-300"
                          } ${isToggling ? "opacity-60" : ""}`}
                          aria-label={`Set ${supplier.name} as ${
                            isActive ? "inactive" : "active"
                          }`}
                        >
                          <span
                            className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-all ${
                              isActive ? "left-8" : "left-1"
                            }`}
                          />
                        </button>
                      </td>
                      <td className="p-4 text-right">
                        <button
                          type="button"
                          onClick={() => openEditModal(supplier)}
                          className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-700"
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="7" className="p-6 text-sm text-slate-500">
                    No suppliers found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-600">
                  {isEditMode ? "Edit Record" : "New Record"}
                </p>
                <h3 className="mt-2 text-2xl font-black text-slate-900">
                  {isEditMode ? "Edit Supplier" : "Add Supplier"}
                </h3>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="text-sm font-semibold text-slate-400 hover:text-slate-600"
              >
                Close
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-6 space-y-5">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-600">
                    Supplier Name
                  </label>
                  <input
                    type="text"
                    placeholder="ABC Traders"
                    className="w-full rounded-xl border-2 border-slate-200 p-3 outline-none focus:border-blue-500"
                    value={form.name}
                    onChange={(e) => handleChange("name", e.target.value)}
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-600">
                    Supplier Code
                  </label>
                  <input
                    type="text"
                    placeholder="ABC or SUP001"
                    className="w-full rounded-xl border-2 border-slate-200 p-3 uppercase outline-none focus:border-blue-500"
                    value={form.supplierCode}
                    onChange={(e) =>
                      handleChange("supplierCode", e.target.value.slice(0, 20))
                    }
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-600">
                    Contact Person
                  </label>
                  <input
                    type="text"
                    placeholder="Ramesh"
                    className="w-full rounded-xl border-2 border-slate-200 p-3 outline-none focus:border-blue-500"
                    value={form.contactPerson}
                    onChange={(e) =>
                      handleChange("contactPerson", e.target.value)
                    }
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-600">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    placeholder="9876543210"
                    className="w-full rounded-xl border-2 border-slate-200 p-3 outline-none focus:border-blue-500"
                    value={form.phoneNumber}
                    onChange={(e) =>
                      handleChange("phoneNumber", e.target.value)
                    }
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-600">
                    Email
                  </label>
                  <input
                    type="email"
                    placeholder="abc@example.com"
                    className="w-full rounded-xl border-2 border-slate-200 p-3 outline-none focus:border-blue-500"
                    value={form.email}
                    onChange={(e) => handleChange("email", e.target.value)}
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-600">
                    GST Number
                  </label>
                  <input
                    type="text"
                    placeholder="29ABCDE1234F1Z5"
                    className="w-full rounded-xl border-2 border-slate-200 p-3 uppercase outline-none focus:border-blue-500"
                    value={form.gstNumber}
                    onChange={(e) =>
                      handleChange("gstNumber", e.target.value.slice(0, 15))
                    }
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-600">
                  Address
                </label>
                <textarea
                  rows="3"
                  placeholder="Bengaluru, Karnataka"
                  className="w-full resize-none rounded-xl border-2 border-slate-200 p-3 outline-none focus:border-blue-500"
                  value={form.address}
                  onChange={(e) => handleChange("address", e.target.value)}
                />
              </div>

              <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={Boolean(form.active)}
                  onChange={(e) => handleChange("active", e.target.checked)}
                />
                Active supplier
              </label>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={isSaving}
                  className="rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!canSubmit}
                  className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 disabled:hover:bg-slate-200"
                >
                  {isSaving ? "SAVING..." : isEditMode ? "Update" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
