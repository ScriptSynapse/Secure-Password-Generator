import type { ComponentType } from 'react';
import { useReveal, useTilt } from '../hooks/useReveal';

interface Props {
  icon: ComponentType<{ size?: number; className?: string }>;
  title: string;
  description: string;
  tag: string;
  index: number;
}

export function FeatureCard({ icon: Icon, title, description, tag, index }: Props) {
  const reveal = useReveal<HTMLLIElement>((index % 3) * 90);
  const tilt = useTilt<HTMLDivElement>(5);
  return (
    <li ref={reveal} className="reveal">
      <div
        ref={tilt}
        className="tilt card group h-full overflow-hidden p-6 hover:border-primary/35 hover:shadow-[0_20px_60px_-25px_rgba(0,229,155,0.45)]"
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
          style={{ background: 'radial-gradient(400px circle at var(--mx, 50%) var(--my, 0%), rgba(0,229,155,0.10), transparent 60%)' }}
          aria-hidden="true"
        />
        <div className="relative">
          <span className="grid h-12 w-12 place-items-center rounded-2xl border border-primary/25 bg-primary/10 text-primary shadow-[0_0_30px_-8px_rgba(0,229,155,0.6)] transition-transform duration-500 group-hover:scale-110 group-hover:-rotate-3">
            <Icon size={22} />
          </span>
          <h3 className="mt-5 text-xl font-semibold">{title}</h3>
          <p className="mt-2 text-[0.975rem] leading-relaxed text-muted">{description}</p>
          <p className="mt-5 inline-flex rounded-md border border-line bg-black/30 px-2 py-1 font-mono text-xs text-primary/90">{tag}</p>
        </div>
      </div>
    </li>
  );
}
