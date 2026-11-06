import { useSyncExternalStore } from 'react';

const QUERY = '(prefers-reduced-motion: reduce)';

function subscribe(cb: () => void) {
  const mq = window.matchMedia?.(QUERY);
  mq?.addEventListener('change', cb);
  return () => mq?.removeEventListener('change', cb);
}

/** True when the user has asked the OS/browser to minimise motion. */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia?.(QUERY).matches ?? false,
    () => false,
  );
}

/** Rough heuristic for devices where expensive effects should be scaled down. */
export function isLowPowerDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
  const coarse = window.matchMedia?.('(pointer: coarse)').matches ?? false;
  const cores = nav.hardwareConcurrency ?? 8;
  return !!nav.connection?.saveData || (nav.deviceMemory !== undefined && nav.deviceMemory <= 2) || (coarse && cores <= 4);
}
