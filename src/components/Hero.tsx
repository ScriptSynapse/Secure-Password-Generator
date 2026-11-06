import { lazy, Suspense } from 'react';
import { Link } from '../lib/router';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { IconArrowRight, IconCpu, IconShield } from './Icons';

// The vault visual is split into its own chunk so the headline and CTAs paint first.
const Vault3D = lazy(() => import('./Vault3D'));

export function Hero() {
  const reduced = useReducedMotion();
  return (
    <section className="relative overflow-hidden pb-16 pt-28 sm:pt-32 lg:pb-24 lg:pt-36" aria-labelledby="hero-title">
      <div className="grid-bg pointer-events-none absolute inset-0 -z-10" aria-hidden="true" />
      <div
        className="pointer-events-none absolute -top-40 right-[-10%] -z-10 h-[38rem] w-[38rem] rounded-full opacity-60 blur-3xl"
        style={{ background: 'radial-gradient(circle, rgba(0,229,155,0.18), transparent 65%)' }}
        aria-hidden="true"
      />
      <div className="container-vk grid grid-cols-1 items-center gap-10 lg:grid-cols-[1.05fr_1fr] lg:gap-8">
        <div className="page-enter relative z-10 max-w-2xl">
          <span className="chip !border-primary/30 !bg-primary/[0.07] !text-primary">
            <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-primary" aria-hidden="true" />
            Privacy-first password generator
          </span>
          <h1 id="hero-title" className="mt-5 text-[2.6rem] font-bold leading-[1.04] sm:text-6xl lg:text-[4.25rem]">
            Passwords that protect <span className="text-gradient">what matters.</span>
          </h1>
          <p className="mt-5 max-w-xl text-lg text-muted sm:text-xl">
            Generate powerful, unpredictable passwords in seconds. Your passwords stay on your device. Always.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link to="/generator" className="btn btn-primary btn-lg" data-testid="hero-generate">
              Generate Password
              <IconArrowRight size={18} />
            </Link>
            <Link to="/#security" className="btn btn-ghost btn-lg" data-testid="hero-security">
              <IconShield size={18} />
              Explore Security
            </Link>
          </div>
          <p className="mt-6 flex items-center gap-2 text-sm text-muted">
            <IconCpu size={16} className="text-primary" />
            100% browser-based generation. No account required.
          </p>
        </div>
        <div className="relative -mx-4 sm:mx-0">
          <Suspense fallback={<div className="vault-stage" aria-hidden="true"><div className="vault-fallback" /></div>}>
            <Vault3D reduced={reduced} />
          </Suspense>
        </div>
      </div>
    </section>
  );
}
