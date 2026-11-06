import { Link } from '../lib/router';
import { SITE } from '../config/site';
import { IconGithub, LogoMark } from './Icons';

const COLUMNS: { title: string; links: { to: string; label: string }[] }[] = [
  {
    title: 'Product',
    links: [
      { to: '/generator', label: 'Password generator' },
      { to: '/generator#passphrase', label: 'Passphrase generator' },
      { to: '/generator#bulk', label: 'Bulk generator' },
      { to: '/#features', label: 'Features' },
    ],
  },
  {
    title: 'Security',
    links: [
      { to: '/#security', label: 'Security overview' },
      { to: '/security', label: 'How VaultKey works' },
      { to: '/#faq', label: 'FAQ' },
    ],
  },
  {
    title: 'Company',
    links: [
      { to: '/privacy', label: 'Privacy Policy' },
      { to: '/terms', label: 'Terms of Use' },
      { to: '/contact', label: 'Contact' },
    ],
  },
];

export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="relative border-t border-line bg-bg-2/60">
      <div className="container-vk grid gap-10 py-14 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div className="max-w-sm">
          <Link to="/" className="inline-flex items-center gap-2.5 rounded-lg" aria-label="VaultKey home">
            <LogoMark size={32} />
            <span className="font-display text-lg font-bold">VaultKey</span>
          </Link>
          <p className="mt-3 text-sm text-muted">{SITE.tagline}</p>
          <p className="mt-3 text-sm text-subtle">Passwords are generated locally in your browser with the Web Crypto API and are never transmitted or stored by VaultKey.</p>
          {SITE.repositoryUrl && (
            <a href={SITE.repositoryUrl} className="mt-4 inline-flex items-center gap-2 text-sm text-muted hover:text-ink" rel="noopener noreferrer" target="_blank">
              <IconGithub size={16} />
              Source code
            </a>
          )}
        </div>
        {COLUMNS.map((col) => (
          <nav key={col.title} aria-label={col.title}>
            <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-subtle">{col.title}</h2>
            <ul className="mt-4 space-y-2.5">
              {col.links.map((l) => (
                <li key={l.to}>
                  <Link to={l.to} className="text-sm text-muted transition-colors hover:text-primary">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-t border-line">
        <div className="container-vk flex flex-col gap-2 py-6 text-xs text-subtle sm:flex-row sm:items-center sm:justify-between">
          <p>© {year} VaultKey. Released under the MIT License.</p>
          <p>No cookies. No analytics. No accounts.</p>
        </div>
      </div>
    </footer>
  );
}
