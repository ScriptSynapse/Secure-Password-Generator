import { useEffect, useRef, useState } from 'react';
import { Link, usePathname } from '../lib/router';
import { IconArrowRight, IconMenu, IconX, LogoMark } from './Icons';

export const NAV_LINKS = [
  { to: '/', label: 'Home' },
  { to: '/#features', label: 'Features' },
  { to: '/#how-it-works', label: 'How It Works' },
  { to: '/#security', label: 'Security' },
  { to: '/#faq', label: 'FAQ' },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close on route change, Escape, or resize to desktop.
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    const onResize = () => window.innerWidth >= 1024 && setOpen(false);
    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', onResize);
    menuRef.current?.querySelector<HTMLElement>('a')?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onResize);
    };
  }, [open]);

  const solid = scrolled || open;

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-[background-color,border-color,backdrop-filter] duration-300 ${
        solid ? 'border-b border-line bg-bg/75 backdrop-blur-xl backdrop-saturate-150' : 'border-b border-transparent bg-transparent'
      }`}
      data-testid="navbar"
      data-scrolled={solid ? 'true' : 'false'}
    >
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:font-semibold focus:text-bg">
        Skip to content
      </a>
      <nav className="container-vk flex h-16 items-center justify-between gap-4 sm:h-[4.5rem]" aria-label="Main">
        <Link to="/" className="flex items-center gap-2.5 rounded-lg" aria-label="VaultKey home">
          <LogoMark size={34} />
          <span className="font-display text-lg font-bold tracking-tight">VaultKey</span>
        </Link>

        <ul className="hidden items-center gap-1 lg:flex">
          {NAV_LINKS.map((l) => (
            <li key={l.to}>
              <Link
                to={l.to}
                className="rounded-lg px-3 py-2 text-[0.925rem] font-medium text-muted transition-colors hover:text-ink"
                aria-current={l.to === '/' && pathname === '/' ? 'page' : undefined}
              >
                {l.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-2">
          <Link to="/generator" className="btn btn-primary hidden !min-h-[2.6rem] sm:inline-flex" data-testid="nav-launch">
            Launch Generator
            <IconArrowRight size={16} />
          </Link>
          <button
            ref={buttonRef}
            type="button"
            className="icon-btn lg:hidden"
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? 'Close menu' : 'Open menu'}
            onClick={() => setOpen((o) => !o)}
            data-testid="menu-toggle"
          >
            {open ? <IconX size={20} /> : <IconMenu size={20} />}
          </button>
        </div>
      </nav>

      <div
        id="mobile-menu"
        ref={menuRef}
        hidden={!open}
        className="border-t border-line bg-bg/95 backdrop-blur-xl lg:hidden"
        data-testid="mobile-menu"
      >
        <ul className="container-vk flex flex-col py-3">
          {NAV_LINKS.map((l) => (
            <li key={l.to}>
              <Link to={l.to} onClick={() => setOpen(false)} className="flex min-h-[3rem] items-center rounded-lg px-2 text-base font-medium text-ink hover:bg-white/5">
                {l.label}
              </Link>
            </li>
          ))}
          <li className="mt-2 pb-2">
            <Link to="/generator" onClick={() => setOpen(false)} className="btn btn-primary w-full">
              Launch Generator
              <IconArrowRight size={16} />
            </Link>
          </li>
        </ul>
      </div>
    </header>
  );
}
