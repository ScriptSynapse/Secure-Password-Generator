import { useCallback, useMemo, useRef, useState } from 'react';
import type { GenerationPlan, PasswordOptions } from '../types/password';
import { generatePassword, GenerationFailedError } from '../lib/generator';
import { DEFAULT_OPTIONS, PasswordOptionsError, planGeneration } from '../lib/passwordValidation';
import { planEntropyBits } from '../lib/passwordStrength';
import { CryptoUnavailableError, wipeRandomBuffer } from '../lib/crypto';

export const HISTORY_LIMIT = 20;

interface GenState {
  value: string;
  plan: GenerationPlan | null;
  bits: number;
  issues: string[];
  nonce: number;
}

function run(options: PasswordOptions, nonce: number): GenState {
  try {
    const { value, plan } = generatePassword(options);
    return { value, plan, bits: planEntropyBits(plan), issues: [], nonce };
  } catch (e) {
    if (e instanceof PasswordOptionsError) return { value: '', plan: null, bits: 0, issues: e.issues, nonce };
    if (e instanceof CryptoUnavailableError || e instanceof GenerationFailedError) {
      return { value: '', plan: null, bits: 0, issues: [e.message], nonce };
    }
    // Never surface raw internal errors (they could, in theory, carry state).
    return { value: '', plan: null, bits: 0, issues: ['Something went wrong while generating. Please try again.'], nonce };
  }
}

export interface HistoryItem {
  id: number;
  value: string;
  at: number;
}

const anyCategory = (o: PasswordOptions) => o.uppercase || o.lowercase || o.numbers || o.symbols;

/**
 * Generator state. Passwords live only in React state (memory). Nothing is written to
 * storage, URLs, analytics or logs. History is opt-in and memory-only.
 */
export function usePasswordGenerator() {
  const [options, setOptions] = useState<PasswordOptions>(() => ({ ...DEFAULT_OPTIONS }));
  const [gen, setGen] = useState<GenState>(() => run({ ...DEFAULT_OPTIONS }, 0));
  const [historyOn, setHistoryOn] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const idRef = useRef(0);

  const pushHistory = useCallback(
    (value: string) => {
      if (!historyOn || !value) return;
      setHistory((h) => {
        if (h[0]?.value === value) return h;
        idRef.current += 1;
        return [{ id: idRef.current, value, at: Date.now() }, ...h].slice(0, HISTORY_LIMIT);
      });
    },
    [historyOn],
  );

  const regenerate = useCallback(
    (opts: PasswordOptions = options, record = true) => {
      const next = run(opts, gen.nonce + 1);
      setGen(next);
      if (record) pushHistory(next.value);
      return next;
    },
    [options, gen.nonce, pushHistory],
  );

  /** Update options and immediately regenerate. Returns false if the change was refused. */
  const update = useCallback(
    (patch: Partial<PasswordOptions>): boolean => {
      const next = { ...options, ...patch };
      if (!anyCategory(next)) return false;
      setOptions(next);
      regenerate(next, false);
      return true;
    },
    [options, regenerate],
  );

  const reset = useCallback(() => {
    const d = { ...DEFAULT_OPTIONS };
    setOptions(d);
    regenerate(d, false);
  }, [regenerate]);

  const toggleHistory = useCallback((on: boolean) => {
    setHistoryOn(on);
    if (!on) setHistory((h) => (h.forEach((i) => (i.value = '')), []));
  }, []);

  const clearHistory = useCallback(() => {
    setHistory((h) => {
      // Drop every reference; JS strings can't be zeroed, but nothing keeps them alive.
      h.forEach((i) => (i.value = ''));
      return [];
    });
    wipeRandomBuffer();
  }, []);

  const planPreview = useMemo(() => {
    try {
      return planGeneration(options);
    } catch {
      return null;
    }
  }, [options]);

  return {
    options,
    update,
    reset,
    regenerate,
    value: gen.value,
    bits: gen.bits,
    plan: gen.plan ?? planPreview,
    issues: gen.issues,
    nonce: gen.nonce,
    historyOn,
    toggleHistory,
    history,
    clearHistory,
    recordCopy: pushHistory,
  };
}

export type PasswordGenerator = ReturnType<typeof usePasswordGenerator>;
