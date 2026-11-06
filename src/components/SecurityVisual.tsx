import { useEffect, useState } from 'react';
import { secureRandomInt } from '../lib/crypto';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { IconCpu, IconDevice, IconKey, IconServerOff } from './Icons';

const CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%&*+=?';
const sample = (n: number) => Array.from({ length: n }, () => CHARS[secureRandomInt(CHARS.length)]).join('');

/**
 * Decorative illustration of local generation: bytes from the OS CSPRNG flow into the
 * generator inside the browser frame; the path to the server is cut. The scrolling
 * characters are illustrative only and are never used as a password.
 */
export function SecurityVisual() {
  const reduced = useReducedMotion();
  const [demo, setDemo] = useState(() => sample(16));
  const [bytes, setBytes] = useState(() => Array.from({ length: 8 }, () => secureRandomInt(256)));

  useEffect(() => {
    if (reduced) return;
    const id = window.setInterval(() => {
      setDemo(sample(16));
      setBytes(Array.from({ length: 8 }, () => secureRandomInt(256)));
    }, 1800);
    return () => window.clearInterval(id);
  }, [reduced]);

  return (
    <figure className="relative" aria-labelledby="secvis-cap">
      <div className="card glow-border overflow-hidden">
        {/* browser chrome */}
        <div className="flex items-center gap-2 border-b border-line bg-black/30 px-4 py-3">
          <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
          <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
          <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
          <span className="ml-3 flex min-w-0 flex-1 items-center gap-2 truncate rounded-md bg-white/5 px-3 py-1 text-xs text-muted">
            <IconDevice size={13} className="flex-none text-primary" />
            Your browser — on your device
          </span>
        </div>

        <div className="space-y-3 p-4 sm:p-6" aria-hidden="true">
          <div className="flex items-center gap-3 rounded-xl border border-line bg-black/25 p-3">
            <span className="grid h-9 w-9 flex-none place-items-center rounded-lg bg-primary/10 text-primary">
              <IconCpu size={18} />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-medium">OS random number generator</p>
              <p className="truncate font-mono text-xs text-subtle">
                crypto.getRandomValues() → {bytes.map((b) => b.toString(16).padStart(2, '0')).join(' ')}
              </p>
            </div>
          </div>

          <div className="mx-auto h-6 w-px bg-gradient-to-b from-primary/70 to-primary/10" />

          <div className="flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/[0.06] p-3">
            <span className="grid h-9 w-9 flex-none place-items-center rounded-lg bg-primary/15 text-primary">
              <IconKey size={18} />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-medium">VaultKey generator</p>
              <p className="text-xs text-muted">Rejection sampling · every type included · no modulo bias</p>
            </div>
          </div>

          <div className="mx-auto h-6 w-px bg-gradient-to-b from-primary/70 to-primary/10" />

          <div className="rounded-xl border border-line bg-black/40 px-4 py-3">
            <p className="text-[0.7rem] uppercase tracking-[0.14em] text-subtle">Example output</p>
            <p key={demo} className="char-in mt-1 break-all font-mono text-lg tracking-wide text-ink">
              {demo}
            </p>
          </div>
        </div>
      </div>

      {/* Server — disconnected */}
      <div className="mt-4 flex items-center gap-3 rounded-2xl border border-dashed border-white/15 p-4 opacity-80" aria-hidden="true">
        <span className="grid h-10 w-10 flex-none place-items-center rounded-xl bg-white/5 text-muted">
          <IconServerOff size={20} />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-medium text-muted">Any server</p>
          <p className="text-xs text-subtle">
            No route out: <span className="font-mono">connect-src &apos;none&apos;</span>
          </p>
        </div>
        <span className="ml-auto rounded-full border border-danger/40 bg-danger/10 px-2.5 py-1 text-xs font-medium text-danger">blocked</span>
      </div>
      <figcaption id="secvis-cap" className="sr-only">
        Diagram: random bytes from your operating system flow into the VaultKey generator inside your browser. The connection to any server is blocked.
      </figcaption>
    </figure>
  );
}
