import api from "./api";

export async function fetchSuppliers() {
  const response = await api.get("/suppliers");
  return Array.isArray(response.data) ? response.data : [];
}

export async function searchSuppliers(name) {
  const query = String(name || "").trim();
  if (!query) return fetchSuppliers();

  const response = await api.get("/suppliers/search", {
    params: { name: query },
  });
  return Array.isArray(response.data) ? response.data : [];
}

export function formatSupplierOption(supplier) {
  if (!supplier) return "";

  const name = String(supplier.name || "").trim();
  const code = String(supplier.supplierCode || "").trim();

  if (name && code) return `${name} (${code})`;
  return name || code;
}
