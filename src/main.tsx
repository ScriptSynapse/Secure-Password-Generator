import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

/** Shortest time the loading screen stays up, so it fades instead of flashing. */
const MIN_SPLASH_MS = 600;

function dismissSplash() {
  const splash = document.getElementById('splash');
  if (!splash) return;
  const wait = Math.max(0, MIN_SPLASH_MS - performance.now());
  const fontsReady = document.fonts?.ready ?? Promise.resolve();
  // Never let a slow font block the app for more than 1.5s.
  Promise.race([fontsReady, new Promise((r) => setTimeout(r, 1500))]).then(() => {
    setTimeout(() => {
      splash.classList.add('is-done');
      splash.setAttribute('aria-hidden', 'true');
      setTimeout(() => splash.remove(), 600);
    }, wait);
  });
}

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
  // Fade the loading screen once the first page (including lazy chunks) has rendered,
  // with a fallback so a slow chunk can never leave the user stuck behind it.
  let done = false;
  const ready = () => {
    if (done) return;
    done = true;
    requestAnimationFrame(() => requestAnimationFrame(dismissSplash));
  };
  window.addEventListener('vaultkey:ready', ready, { once: true });
  setTimeout(ready, 4000);
}
