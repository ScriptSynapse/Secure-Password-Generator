import { lazy, Suspense, useEffect, type ComponentType, type LazyExoticComponent } from 'react';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { Loader } from './components/Loader';
import { AnnouncerProvider } from './hooks/useAnnouncer';
import { useInitialHashScroll, usePathname } from './lib/router';
import { isSecureRandomAvailable } from './lib/crypto';
import Home from './pages/Home';
import ROUTE_META from './config/routes.json';

// Secondary pages are code-split; the landing page is in the main bundle for a fast first paint.
const ROUTES: Record<string, ComponentType | LazyExoticComponent<ComponentType>> = {
  '/': Home,
  '/generator': lazy(() => import('./pages/Generator')),
  '/security': lazy(() => import('./pages/SecurityPage')),
  '/privacy': lazy(() => import('./pages/Privacy')),
  '/terms': lazy(() => import('./pages/Terms')),
  '/contact': lazy(() => import('./pages/Contact')),
};
const NotFound = lazy(() => import('./pages/NotFound'));

/** Rendered after the (possibly lazy) page has mounted; tells main.tsx to fade the loading screen. */
function PageReady() {
  useEffect(() => {
    window.dispatchEvent(new Event('vaultkey:ready'));
  }, []);
  return null;
}

function PageFallback() {
  return (
    <div className="container-vk grid min-h-[70vh] place-items-center pt-32">
      <Loader label="Loading page…" />
    </div>
  );
}

export default function App() {
  const pathname = usePathname();
  const Page = ROUTES[pathname] ?? NotFound;
  const meta = (ROUTE_META as Record<string, { title: string; description: string }>)[ROUTES[pathname] ? pathname : '/404'];
  useInitialHashScroll();

  useEffect(() => {
    document.title = meta.title;
    document.querySelector('meta[name="description"]')?.setAttribute('content', meta.description);
  }, [meta]);

  return (
    <AnnouncerProvider>
      <Navbar />
      <main id="main" tabIndex={-1} className="outline-none">
        {!isSecureRandomAvailable() && (
          <div role="alert" className="container-vk pt-24">
            <p className="rounded-xl border border-danger/40 bg-danger/10 p-4 text-sm text-danger">
              Your browser doesn't provide secure random numbers (Web Crypto API), so VaultKey can't generate passwords here. Please use an up-to-date browser over
              HTTPS.
            </p>
          </div>
        )}
        <Suspense fallback={<PageFallback />}>
          <div key={pathname} className="page-enter">
            <Page />
            <PageReady />
          </div>
        </Suspense>
      </main>
      <Footer />
    </AnnouncerProvider>
  );
}
