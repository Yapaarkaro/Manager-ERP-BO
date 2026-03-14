/**
 * Ephemeral navigation data store.
 * Keeps large objects (invoices, customers, suppliers, products) out of URL params.
 * Data is consumed once on the destination screen (read-and-clear pattern).
 */

let _store: Record<string, any> = {};

export function setNavData(key: string, value: any) {
  _store[key] = value;
}

export function getNavData<T = any>(key: string): T | null {
  const val = _store[key] ?? null;
  return val as T | null;
}

export function consumeNavData<T = any>(key: string): T | null {
  const val = _store[key] ?? null;
  delete _store[key];
  return val as T | null;
}

export function clearNavStore() {
  _store = {};
}
