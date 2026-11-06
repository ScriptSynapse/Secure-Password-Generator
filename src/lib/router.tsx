import { useEffect, useSyncExternalStore, type AnchorHTMLAttributes, type MouseEvent } from 'react';

/**
 * Tiny History-API router. No query strings are ever used, so nothing sensitive
 * can end up in a URL. Hash fragments are only used for section anchors.
 */

const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

if (typeof window !== 'undefined') window.addEventListener('popstate', notify);

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function normalizePath(p: string): string {
  const clean = p.replace(/\/+$/, '').replace(/\/index\.html$/, '');
  return clean === '' ? '/' : clean;
}

export function usePathname(): string {
  return useSyncExternalStore(
    subscribe,
    () => normalizePath(window.location.pathname),
    () => '/',
  );
}

function prefersReducedMotion() {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

export function scrollToHash(hash: string, smooth = true) {
  const id = decodeURIComponent(hash.replace(/^#/, ''));
  if (!id) return;
  const el = document.getElementById(id);
  if (!el) return;
  el.scrollIntoView({ behavior: smooth && !prefersReducedMotion() ? 'smooth' : 'auto', block: 'start' });
  // Move focus for keyboard and screen-reader users without a second scroll jump.
  if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1');
  el.focus({ preventScroll: true });
}

/** Navigate to an internal URL like "/generator" or "/#faq". */
export function navigate(to: string) {
  const url = new URL(to, window.location.origin);
  const samePath = normalizePath(url.pathname) === normalizePath(window.location.pathname);
  if (samePath && url.hash) {
    if (window.location.hash !== url.hash) window.history.pushState(null, '', url.pathname + url.hash);
    notify();
    scrollToHash(url.hash);
    return;
  }
  window.history.pushState(null, '', url.pathname + url.hash);
  notify();
  if (url.hash) {
    // Wait for the new page to render, then scroll to the section.
    requestAnimationFrame(() => requestAnimationFrame(() => scrollToHash(url.hash, false)));
  } else {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }
}

type LinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & { to: string };

export function Link({ to, onClick, ...rest }: LinkProps) {
  const handle = (e: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(e);
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    navigate(to);
  };
  return <a href={to} onClick={handle} {...rest} />;
}

/** On first load with a #hash, scroll to it once the page has rendered. */
export function useInitialHashScroll() {
  useEffect(() => {
    if (window.location.hash) requestAnimationFrame(() => scrollToHash(window.location.hash, false));
  }, []);
}

export function useHash(): string {
  return useSyncExternalStore(
    subscribe,
    () => window.location.hash,
    () => '',
  );
}

/** Update the URL fragment without adding a history entry or scrolling. */
export function replaceHash(hash: string) {
  const url = window.location.pathname + (hash ? `#${hash.replace(/^#/, '')}` : '');
  window.history.replaceState(null, '', url);
  notify();
}
