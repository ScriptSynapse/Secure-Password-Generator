import { Link } from '../lib/router';
import { IconArrowRight, LogoMark } from '../components/Icons';

export default function NotFound() {
  return (
    <div className="container-vk grid min-h-[70vh] place-items-center pb-20 pt-32 text-center">
      <div className="max-w-md">
        <LogoMark size={56} className="mx-auto opacity-80" />
        <p className="mt-6 font-mono text-sm text-primary">404</p>
        <h1 className="mt-2 text-4xl font-bold">This page is locked away.</h1>
        <p className="mt-3 text-muted">We couldn't find the page you were looking for. It may have moved, or the link may be mistyped.</p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link to="/" className="btn btn-ghost">
            Back to home
          </Link>
          <Link to="/generator" className="btn btn-primary">
            Open the generator
            <IconArrowRight size={16} />
          </Link>
        </div>
      </div>
    </div>
  );
}
