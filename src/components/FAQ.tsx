import { useId, useState, type ReactNode } from 'react';
import { IconPlus } from './Icons';
import { Link } from '../lib/router';

export const FAQ_ITEMS: { q: string; a: ReactNode }[] = [
  {
    q: 'Is VaultKey free?',
    a: 'Yes. VaultKey is free to use, with no paid tier, no ads and no sign-up. The source code is released under the MIT License.',
  },
  {
    q: 'Are my generated passwords stored?',
    a: (
      <>
        No. Passwords exist only in your browser tab's memory while the page is open. VaultKey doesn't write them to localStorage, sessionStorage, cookies or
        any database. The optional session history is off by default, lives in memory only, and disappears when you clear it, reload or close the tab.
      </>
    ),
  },
  {
    q: 'Does VaultKey send passwords to a server?',
    a: (
      <>
        No. Generation runs entirely in your browser. On top of that, the site's Content Security Policy sets <code>connect-src 'none'</code>, which tells
        your browser to block the page from making fetch, XHR, WebSocket or beacon requests at all. Your hosting provider still sees ordinary page requests (like
        any website), but never your passwords. <Link to="/security">Read the technical details</Link>.
      </>
    ),
  },
  {
    q: 'How strong are generated passwords?',
    a: (
      <>
        It depends on your settings, and VaultKey shows you the estimate live. The default — 20 characters drawn from 94 letters, numbers and symbols — gives
        about 130 bits of entropy, far beyond what any known brute-force attack can search. Entropy is an estimate of guessing resistance, not a guarantee: a
        strong password can still be phished, leaked by a breached website, or captured by malware.
      </>
    ),
  },
  {
    q: 'Can I generate multiple passwords?',
    a: 'Yes. The Bulk tab generates 5, 10, 25 or 50 independent passwords at once, with copy buttons for each one, a copy-all option, and an optional plain-text download that asks for confirmation first.',
  },
  {
    q: 'Can I save passwords in my browser and use them in other browsers?',
    a: (
      <>
        Yes. Click “Save in your browser” under any generated password: VaultKey copies it and opens the website, and when you sign up or change your password
        there, your browser offers to save it and fills it in next time you log in. Your browser syncs it to your other devices running the same browser. To use
        the same passwords in a different browser (say Chrome and Firefox), download the transfer file from the Save tab and import it there — it works with
        Chrome, Edge, Firefox and Apple Passwords. No website, including VaultKey, can write into your browser’s password manager directly.
      </>
    ),
  },
  {
    q: 'Does VaultKey work on mobile?',
    a: 'Yes. VaultKey is fully responsive and works in current versions of Safari, Chrome, Firefox and Edge on phones, tablets and desktops — any browser that supports the Web Crypto API.',
  },
  {
    q: 'What makes cryptographic randomness different?',
    a: (
      <>
        Ordinary random functions such as <code>Math.random()</code> are designed for games and simulations: fast, but potentially predictable if someone learns
        their internal state. <code>crypto.getRandomValues()</code> draws from your operating system's cryptographically secure random number generator, which
        is designed so that past outputs reveal nothing about future ones. VaultKey also uses rejection sampling so that every character is exactly equally
        likely.
      </>
    ),
  },
  {
    q: 'Can I use VaultKey without creating an account?',
    a: "Yes — there are no accounts at all. Open the generator and start creating passwords. There's nothing to sign up for and nothing to log in to.",
  },
];

export function FAQ() {
  const base = useId();
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div className="divide-y divide-line overflow-hidden rounded-[1.25rem] border border-line bg-card/60" data-testid="faq">
      {FAQ_ITEMS.map((item, i) => {
        const isOpen = open === i;
        return (
          <div key={item.q}>
            <h3 className="font-sans text-base tracking-normal">
              <button
                type="button"
                id={`${base}-q${i}`}
                aria-expanded={isOpen}
                aria-controls={`${base}-a${i}`}
                onClick={() => setOpen(isOpen ? null : i)}
                className="flex w-full items-center justify-between gap-4 px-5 py-5 text-left text-[1.025rem] font-semibold transition-colors hover:bg-white/[0.02] sm:px-6"
                data-testid="faq-question"
              >
                {item.q}
                <span
                  className={`grid h-8 w-8 flex-none place-items-center rounded-full border transition-all duration-300 ${
                    isOpen ? 'rotate-45 border-primary/50 bg-primary/10 text-primary' : 'border-line text-muted'
                  }`}
                  aria-hidden="true"
                >
                  <IconPlus size={16} />
                </span>
              </button>
            </h3>
            <div
              id={`${base}-a${i}`}
              role="region"
              aria-labelledby={`${base}-q${i}`}
              className={`grid transition-[grid-template-rows] duration-400 ease-out ${isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
              data-testid="faq-answer"
              data-open={isOpen ? 'true' : 'false'}
              inert={!isOpen}
            >
              <div className="overflow-hidden">
                <div className="prose-vk px-5 pb-5 text-[0.975rem] sm:px-6">{item.a}</div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
