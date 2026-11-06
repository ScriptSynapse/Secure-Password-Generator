import { useCallback, useEffect, useRef, useState } from 'react';

export type CopyState = 'idle' | 'copied' | 'manual' | 'error';

/**
 * Copy text with the async Clipboard API, falling back to a temporary hidden
 * <textarea> + execCommand('copy') for older or permission-restricted contexts.
 * If both fail, the caller is told to fall back to manual selection.
 *
 * The text is never logged, stored or sent anywhere.
 */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through to legacy path */
  }
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.setAttribute('readonly', '');
  ta.setAttribute('aria-hidden', 'true');
  ta.style.position = 'fixed';
  ta.style.top = '-1000px';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  const prevFocus = document.activeElement as HTMLElement | null;
  ta.select();
  let ok = false;
  try {
    ok = document.execCommand('copy');
  } catch {
    ok = false;
  }
  ta.value = '';
  ta.remove();
  prevFocus?.focus?.({ preventScroll: true });
  return ok;
}

/** Select an element's text so the user can copy it manually. */
export function selectElementText(el: HTMLElement | null) {
  if (!el) return;
  const range = document.createRange();
  range.selectNodeContents(el);
  const sel = window.getSelection();
  sel?.removeAllRanges();
  sel?.addRange(range);
}

export function useClipboard(resetMs = 1800) {
  const [state, setState] = useState<CopyState>('idle');
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const copy = useCallback(
    async (text: string, fallbackEl?: HTMLElement | null) => {
      window.clearTimeout(timer.current);
      const ok = text ? await copyText(text) : false;
      if (ok) setState('copied');
      else if (fallbackEl) {
        selectElementText(fallbackEl);
        setState('manual');
      } else setState('error');
      timer.current = window.setTimeout(() => setState('idle'), ok ? resetMs : resetMs * 3);
      return ok;
    },
    [resetMs],
  );

  return { state, copy };
}
