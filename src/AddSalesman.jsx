import React, { useEffect, useMemo, useState } from "react";
import api from "./api";

const initialForm = {
  name: "",
  phoneNumber: "",
};

export default function AddSalesman() {
  const [form, setForm] = useState(initialForm);
  const [salesmen, setSalesmen] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [togglingId, setTogglingId] = useState("");

  const loadSalesmen = async () => {
    setIsLoading(true);

    try {
      const response = await api.get("/salesman");
      setSalesmen(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error("Failed to load salesmen:", error);
      setSalesmen([]);
      alert(error.response?.data?.message || "Failed to load salesmen");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSalesmen();
  }, []);

  useEffect(() => {
    if (!successMessage) return undefined;

    const timer = setTimeout(() => {
      setSuccessMessage("");
    }, 3000);

    return () => clearTimeout(timer);
  }, [successMessage]);

  const filteredSalesmen = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    if (!query) return salesmen;

    return salesmen.filter((salesman) => {
      const name = salesman.name?.toLowerCase() || "";
      const employeeId = String(salesman.employeeId || "").toLowerCase();
      const phoneNumber = String(salesman.phoneNumber || "").toLowerCase();
      return (
        name.includes(query) ||
        employeeId.includes(query) ||
        phoneNumber.includes(query)
      );
    });
  }, [salesmen, searchQuery]);

  const handleChange = (field, value) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const closeModal = () => {
    if (isSaving) return;
    setIsModalOpen(false);
    setForm(initialForm);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (
      !form.name.trim() ||
      !form.phoneNumber.trim() ||
      isSaving
    ) {
      return;
    }

    setIsSaving(true);

    try {
      const payload = {
        name: form.name.trim(),
        phoneNumber: form.phoneNumber.trim(),
      };

      await api.post("/salesman", payload);
      await loadSalesmen();
      setSuccessMessage("Salesman added successfully.");
      setIsModalOpen(false);
      setForm(initialForm);
    } catch (error) {
      console.error("Failed to add salesman:", error);
      alert(error.response?.data?.message || "Failed to add salesman");
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async (salesman) => {
    const employeeId = salesman.employeeId;
    const nextActive = !salesman.active;

    if (!employeeId || togglingId) return;

    setTogglingId(String(employeeId));

    try {
      const fullPayload = {
        employeeId: salesman.employeeId,
        name: salesman.name,
        phoneNumber: salesman.phoneNumber,
        active: nextActive,
      };

      try {
        await api.patch(`/salesman/${employeeId}`, { active: nextActive });
      } catch (patchError) {
        try {
          await api.put(`/salesman/${employeeId}`, fullPayload);
        } catch (putError) {
          await api.patch(`/salesman/${employeeId}/active`, {
            active: nextActive,
          });
        }
      }

      setSalesmen((prev) =>
        prev.map((item) =>
          item.employeeId === employeeId ? { ...item, active: nextActive } : item,
        ),
      );
    } catch (error) {
      console.error("Failed to update salesman status:", error);
      alert(error.response?.data?.message || "Failed to update salesman status");
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
              Salesman Setup
            </p>
            <h2 className="mt-2 text-2xl font-black text-slate-900">
              Add Salesman
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Manage your salesman directory, search existing records, and
              control who stays active for billing.
            </p>
          </div>

          <div className="flex w-full flex-col gap-3 md:w-auto md:flex-row md:items-end">
            <div className="w-full md:w-80">
              <label className="mb-2 block text-sm font-bold text-slate-600">
                Search
              </label>
              <input
                type="text"
                placeholder="Search by ID, name, or phone"
                className="w-full rounded-xl border-2 border-slate-200 p-3 outline-none focus:border-blue-500"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white hover:bg-blue-700"
            >
              + Add Salesman
            </button>
          </div>
        </div>

        {successMessage && (
          <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
            {successMessage}
          </div>
        )}

        <div className="mt-6 overflow-hidden rounded-xl border border-slate-200">
          <table className="w-full text-left">
            <thead className="bg-slate-100">
              <tr>
                <th className="p-4 text-sm font-bold text-slate-600">
                  Employee ID
                </th>
                <th className="p-4 text-sm font-bold text-slate-600">Name</th>
                <th className="p-4 text-sm font-bold text-slate-600">
                  Phone Number
                </th>
                <th className="p-4 text-sm font-bold text-slate-600">Active</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan="4" className="p-6 text-sm text-slate-500">
                    Loading salesmen...
                  </td>
                </tr>
              ) : filteredSalesmen.length > 0 ? (
                filteredSalesmen.map((salesman) => {
                  const isActive = Boolean(salesman.active);
                  const isToggling =
                    togglingId === String(salesman.employeeId || "");

                  return (
                    <tr
                      key={`${salesman.employeeId}-${salesman.name}`}
                      className="border-t border-slate-100"
                    >
                      <td className="p-4 font-semibold text-slate-700">
                        {salesman.employeeId}
                      </td>
                      <td className="p-4 text-slate-800">{salesman.name}</td>
                      <td className="p-4 text-slate-600">
                        {salesman.phoneNumber || "-"}
                      </td>
                      <td className="p-4">
                        <button
                          type="button"
                          onClick={() => handleToggleActive(salesman)}
                          disabled={isToggling}
                          className={`relative h-7 w-14 rounded-full transition-colors ${
                            isActive ? "bg-emerald-500" : "bg-slate-300"
                          } ${isToggling ? "opacity-60" : ""}`}
                          aria-label={`Set ${salesman.name} as ${
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
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="4" className="p-6 text-sm text-slate-500">
                    No salesman records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-600">
                  New Record
                </p>
                <h3 className="mt-2 text-2xl font-black text-slate-900">
                  Add Salesman
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
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-600">
                  Name
                </label>
                <input
                  type="text"
                  placeholder="Enter salesman name"
                  className="w-full rounded-xl border-2 border-slate-200 p-3 outline-none focus:border-blue-500"
                  value={form.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-600">
                  Phone Number
                </label>
                <input
                  type="tel"
                  placeholder="Enter phone number"
                  className="w-full rounded-xl border-2 border-slate-200 p-3 outline-none focus:border-blue-500"
                  value={form.phoneNumber}
                  onChange={(e) => handleChange("phoneNumber", e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    isSaving ||
                    !form.name.trim() ||
                    !form.phoneNumber.trim()
                  }
                  className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white hover:bg-blue-700 disabled:bg-slate-200"
                >
                  {isSaving ? "SAVING..." : "OK"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
