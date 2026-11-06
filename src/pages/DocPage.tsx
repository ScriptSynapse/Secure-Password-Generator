import type { ReactNode } from 'react';
import { Link, usePathname } from '../lib/router';

interface Props {
  eyebrow: string;
  title: string;
  intro?: string;
  updated?: string;
  toc?: [string, string][];
  children: ReactNode;
}

/** Shared layout for long-form pages (Security, Privacy, Terms, Contact). */
export function DocPage({ eyebrow, title, intro, updated, toc, children }: Props) {
  const pathname = usePathname();
  return (
    <div className="container-vk pb-24 pt-28 sm:pt-36">
      <div className={`grid gap-10 ${toc ? 'lg:grid-cols-[minmax(0,1fr)_15rem]' : ''}`}>
        <article className="min-w-0 max-w-3xl">
          <header className="border-b border-line pb-8">
            <span className="eyebrow">{eyebrow}</span>
            <h1 className="mt-3 text-4xl font-bold sm:text-5xl">{title}</h1>
            {intro && <p className="mt-4 text-lg text-muted">{intro}</p>}
            {updated && <p className="mt-4 text-sm text-subtle">Last updated: {updated}</p>}
          </header>
          <div className="prose-vk mt-4">{children}</div>
        </article>
        {toc && (
          <nav aria-label="On this page" className="hidden lg:block">
            <div className="sticky top-28 rounded-2xl border border-line bg-card/50 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-subtle">On this page</p>
              <ul className="mt-3 space-y-2 text-sm">
                {toc.map(([id, label]) => (
                  <li key={id}>
                    <Link to={`${pathname}#${id}`} className="text-muted hover:text-primary">
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </nav>
        )}
      </div>
    </div>
  );
}
