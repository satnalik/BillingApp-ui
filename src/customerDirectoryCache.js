const STORAGE_PREFIX = "customerDirectory.v1";
const DEFAULT_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

const memoryCache = new Map();

function getTenantKey() {
  const tenantId = localStorage.getItem("tenantId") || "default";
  return `${STORAGE_PREFIX}:${tenantId}`;
}

function safeParse(json) {
  try {
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function readLocal(key) {
  const raw = localStorage.getItem(key);
  if (!raw) return null;
  const parsed = safeParse(raw);
  if (!parsed || typeof parsed !== "object") return null;
  return parsed;
}

function writeLocal(key, payload) {
  try {
    localStorage.setItem(key, JSON.stringify(payload));
  } catch {
    // Ignore quota / storage failures; memory cache still helps per-session.
  }
}

export function buildCustomerDirectoryFromBills(bills) {
  const byNameLower = {};

  for (const bill of bills) {
    const name = String(bill?.customerName ?? "").trim();
    if (!name) continue;
    if (name.toLowerCase() === "guest") continue;

    const key = name.toLowerCase();
    if (byNameLower[key]) continue;

    const rawContact = bill?.contactInfo ?? bill?.contactNumber ?? "";
    const contactNumber = String(rawContact ?? "")
      .replace(/\D/g, "")
      .slice(0, 10);
    byNameLower[key] = { name, contactNumber };
  }

  const names = Object.values(byNameLower)
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));

  return { names, byNameLower };
}

export async function getCustomerDirectory(api, { ttlMs = DEFAULT_TTL_MS } = {}) {
  const key = getTenantKey();
  const now = Date.now();

  const mem = memoryCache.get(key);
  if (mem?.value && mem.expiresAt > now) return mem.value;
  if (mem?.promise) return mem.promise;

  const fromLocal = readLocal(key);
  if (
    fromLocal?.data &&
    typeof fromLocal.expiresAt === "number" &&
    fromLocal.expiresAt > now
  ) {
    memoryCache.set(key, { value: fromLocal.data, expiresAt: fromLocal.expiresAt });
    return fromLocal.data;
  }

  const promise = (async () => {
    const response = await api.get("/bills");
    const bills = Array.isArray(response.data) ? response.data : [];
    const directory = buildCustomerDirectoryFromBills(bills);

    const expiresAt = Date.now() + ttlMs;
    const payload = { expiresAt, data: directory };

    memoryCache.set(key, { value: directory, expiresAt });
    writeLocal(key, payload);

    return directory;
  })();

  memoryCache.set(key, { promise });

  try {
    return await promise;
  } catch (err) {
    memoryCache.delete(key);
    throw err;
  }
}

export function invalidateCustomerDirectoryCache() {
  const key = getTenantKey();
  memoryCache.delete(key);
  try {
    localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

