/**
 * Lightweight event bus for transaction changes.
 * Any screen that modifies financial data (income/expense, sales, purchases,
 * returns, receivables, payables, bank/cash transactions) emits an event here.
 * Consumers (dashboard, detail screens, balance displays) subscribe and
 * silently refresh their data without visible loading indicators.
 */

type Listener = (source?: string) => void;

const listeners = new Set<Listener>();

export function onTransactionChange(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function emitTransactionChange(source?: string) {
  listeners.forEach((fn) => {
    try {
      fn(source);
    } catch {
      // never let a listener crash the emitter
    }
  });
}
