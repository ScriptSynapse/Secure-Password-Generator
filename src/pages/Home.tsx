import type { ReactNode } from 'react';
import { Hero } from '../components/Hero';
import { FeatureCard } from '../components/FeatureCard';
import { FAQ } from '../components/FAQ';
import { SecurityVisual } from '../components/SecurityVisual';
import { Link } from '../lib/router';
import { useReveal } from '../hooks/useReveal';
import {
  IconArrowRight,
  IconCheck,
  IconCopy,
  IconCpu,
  IconDevice,
  IconGauge,
  IconLayers,
  IconLock,
  IconQuote,
  IconServerOff,
  IconShield,
  IconSliders,
  IconUserOff,
} from '../components/Icons';

function Reveal({ children, delay = 0, className = '', as: Tag = 'div' }: { children: ReactNode; delay?: number; className?: string; as?: 'div' | 'li' }) {
  const ref = useReveal<HTMLDivElement>(delay);
  return (
    <Tag ref={ref as never} className={`reveal ${className}`}>
      {children}
    </Tag>
  );
}

function SectionHeader({ eyebrow, title, intro, id }: { eyebrow: string; title: ReactNode; intro?: string; id: string }) {
  return (
    <Reveal className="mx-auto max-w-2xl text-center">
      <span className="eyebrow">{eyebrow}</span>
      <h2 id={id} className="mt-3 text-3xl font-bold sm:text-[2.6rem]">
        {title}
      </h2>
      {intro && <p className="mt-4 text-lg text-muted">{intro}</p>}
    </Reveal>
  );
}

const FACTS = [
  { icon: IconCpu, value: 'Client-side', label: 'Every password is generated inside your browser tab.' },
  { icon: IconUserOff, value: 'No sign-up', label: 'No account, email address or login required.' },
  { icon: IconSliders, value: '8–64 chars', label: 'Choose the length, character types and exclusions.' },
  { icon: IconShield, value: 'Web Crypto', label: 'Randomness from crypto.getRandomValues().' },
];

const FEATURES = [
  {
    icon: IconLock,
    title: 'Secure Password Generation',
    description: 'Characters are chosen with the browser’s cryptographically secure random generator and unbiased rejection sampling — never Math.random().',
    tag: 'crypto.getRandomValues()',
  },
  {
    icon: IconGauge,
    title: 'Password Strength Analysis',
    description: 'See an exact entropy estimate for your settings, a five-level strength rating and a plain-English explanation of what it means.',
    tag: 'entropy in bits',
  },
  {
    icon: IconSliders,
    title: 'Custom Password Controls',
    description: 'Set the length from 8 to 64, pick character types, exclude look-alikes and ambiguous symbols, or supply your own symbol set.',
    tag: 'length 8–64',
  },
  {
    icon: IconLayers,
    title: 'Bulk Password Generation',
    description: 'Create 5, 10, 25 or 50 independent passwords at once. Copy one, copy all, or regenerate any single entry.',
    tag: '5 · 10 · 25 · 50',
  },
  {
    icon: IconQuote,
    title: 'Passphrase Generation',
    description: 'Memorable multi-word passphrases from a 7,776-word list, with your choice of separator, capitalisation and an optional number.',
    tag: '≈ 12.9 bits / word',
  },
  {
    icon: IconDevice,
    title: 'Local-Only Processing',
    description: 'Nothing is uploaded, logged or stored. A strict Content Security Policy blocks the page from sending network requests at all.',
    tag: "connect-src 'none'",
  },
];

const STEPS = [
  { n: '01', title: 'Customize', text: 'Choose password length and character types.', icon: IconSliders },
  { n: '02', title: 'Generate', text: 'VaultKey uses browser cryptographic randomness.', icon: IconLock },
  { n: '03', title: 'Copy and Use', text: 'Copy your password and use it wherever needed.', icon: IconCopy },
];

const SECURITY_POINTS = [
  { title: 'Password generation happens locally', text: 'All generation code runs in your browser tab, on your device.' },
  { title: 'No password transmission', text: "Passwords are never sent anywhere. The Content Security Policy blocks scripted network requests (connect-src 'none')." },
  { title: 'No account registration', text: 'There is no sign-up, login or user profile to compromise.' },
  { title: 'No server-side password storage', text: 'VaultKey has no backend and no database. Passwords are never written to cookies or browser storage either.' },
  { title: 'Cryptographically secure randomness', text: 'Every character comes from crypto.getRandomValues(), mapped without modulo bias.' },
];

export default function Home() {
  return (
    <>
      <Hero />

      {/* Product facts */}
      <section aria-label="Product characteristics" className="relative border-y border-line bg-bg-2/50">
        <ul className="container-vk grid grid-cols-1 gap-px sm:grid-cols-2 lg:grid-cols-4">
          {FACTS.map((f, i) => (
            <Reveal as="li" key={f.value} delay={i * 80} className="flex items-start gap-4 px-2 py-7 sm:px-5">
              <span className="grid h-11 w-11 flex-none place-items-center rounded-xl border border-primary/20 bg-primary/[0.08] text-primary">
                <f.icon size={20} />
              </span>
              <div>
                <p className="font-display text-xl font-semibold">{f.value}</p>
                <p className="mt-1 text-sm text-muted">{f.label}</p>
              </div>
            </Reveal>
          ))}
        </ul>
      </section>

      {/* Features */}
      <section id="features" className="py-24 sm:py-28" aria-labelledby="features-title">
        <div className="container-vk">
          <SectionHeader
            id="features-title"
            eyebrow="Features"
            title={
              <>
                Everything you need for <span className="text-gradient">stronger credentials</span>
              </>
            }
            intro="Professional-grade generation tools, without the account, the tracking or the upsell."
          />
          <ul className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5">
            {FEATURES.map((f, i) => (
              <FeatureCard key={f.title} index={i} {...f} />
            ))}
          </ul>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="relative overflow-hidden border-y border-line bg-bg-2/40 py-24 sm:py-28" aria-labelledby="how-title">
        <div className="container-vk">
          <SectionHeader id="how-title" eyebrow="How it works" title="Three steps. Zero uploads." intro="From settings to a copied password in a few seconds." />
          <div className="relative mt-14">
          <div className="pointer-events-none absolute left-[16%] right-[16%] top-[3.25rem] hidden h-px bg-gradient-to-r from-primary/0 via-primary/40 to-primary/0 md:block" aria-hidden="true" />
          <ol className="relative grid gap-5 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <Reveal as="li" key={s.n} delay={i * 120} className="card relative p-6 text-center">
                <span className="relative mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-primary/30 bg-bg text-primary shadow-[0_0_40px_-10px_rgba(0,229,155,0.7)]">
                  <s.icon size={24} />
                </span>
                <p className="mt-5 font-mono text-sm text-primary">{s.n}</p>
                <h3 className="mt-1 text-xl font-semibold">{s.title}</h3>
                <p className="mt-2 text-muted">{s.text}</p>
              </Reveal>
            ))}
          </ol>
          </div>
          <Reveal className="mt-10 text-center">
            <Link to="/generator" className="btn btn-primary btn-lg">
              Try it now
              <IconArrowRight size={18} />
            </Link>
          </Reveal>
        </div>
      </section>

      {/* Security */}
      <section id="security" className="py-24 sm:py-28" aria-labelledby="security-title">
        <div className="container-vk grid grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <div>
            <Reveal>
              <span className="eyebrow">Security</span>
              <h2 id="security-title" className="mt-3 text-3xl font-bold sm:text-[2.6rem]">
                Your security should never leave your device.
              </h2>
              <p className="mt-4 text-lg text-muted">
                VaultKey is built so that the safest thing happens by default: your password is created where you are, and nowhere else.
              </p>
            </Reveal>
            <ul className="mt-8 space-y-4">
              {SECURITY_POINTS.map((p, i) => (
                <Reveal as="li" key={p.title} delay={i * 70} className="flex gap-4">
                  <span className="mt-0.5 grid h-7 w-7 flex-none place-items-center rounded-full bg-primary/15 text-primary">
                    <IconCheck size={15} />
                  </span>
                  <div>
                    <p className="font-semibold">{p.title}</p>
                    <p className="mt-0.5 text-[0.975rem] text-muted">{p.text}</p>
                  </div>
                </Reveal>
              ))}
            </ul>
            <Reveal className="mt-8 rounded-2xl border border-line bg-card/60 p-4 text-sm text-muted">
              <p>
                <strong className="text-ink">Honest limits:</strong> client-side generation protects the password while it’s being made. It can’t protect against
                malware on your device, malicious browser extensions, a compromised copy of this site, or a website that stores your password badly.{' '}
                <Link to="/security" className="text-primary underline underline-offset-2">
                  Read the full security overview
                </Link>
                .
              </p>
            </Reveal>
          </div>
          <Reveal delay={120}>
            <SecurityVisual />
          </Reveal>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="border-t border-line bg-bg-2/40 py-24 sm:py-28" aria-labelledby="faq-title">
        <div className="container-vk max-w-3xl">
          <SectionHeader id="faq-title" eyebrow="FAQ" title="Questions, answered" />
          <Reveal className="mt-12">
            <FAQ />
          </Reveal>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24" aria-labelledby="cta-title">
        <div className="container-vk">
          <Reveal className="card glow-border relative overflow-hidden px-6 py-14 text-center sm:px-12">
            <div
              className="pointer-events-none absolute inset-0"
              style={{ background: 'radial-gradient(600px circle at 50% 0%, rgba(0,229,155,0.16), transparent 60%)' }}
              aria-hidden="true"
            />
            <div className="relative">
              <IconServerOff size={28} className="mx-auto text-primary" />
              <h2 id="cta-title" className="mt-4 text-3xl font-bold sm:text-4xl">
                Your next password is one click away.
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-lg text-muted">Free, private and generated on your device. No account, no tracking.</p>
              <Link to="/generator" className="btn btn-primary btn-lg mt-8">
                Generate Password
                <IconArrowRight size={18} />
              </Link>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
