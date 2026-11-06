import { LogoMark } from './Icons';

/** Compact branded loader used for route changes and lazily-loaded content. */
export function Loader({ label = 'Loading…', className = '' }: { label?: string; className?: string }) {
  return (
    <div className={`flex flex-col items-center gap-3 ${className}`} role="status" aria-live="polite">
      <span className="vk-loader">
        <LogoMark size={30} />
      </span>
      <span className="text-sm text-muted">{label}</span>
    </div>
  );
}
