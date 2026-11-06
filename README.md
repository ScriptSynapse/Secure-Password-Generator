# VaultKey

**Your passwords. Your privacy. Your control.**

VaultKey is a privacy-first password and passphrase generator that runs entirely in the browser. Passwords are generated on the user's device with the Web Crypto API (`crypto.getRandomValues()`), never sent to a server, and never stored.

- 🔐 **Secure generation:** CSPRNG randomness with rejection sampling (no modulo bias), every selected character type guaranteed
- 📊 **Strength analysis:** exact entropy of the generation process (BigInt + inclusion–exclusion), five-level meter, plain-English explanation
- 🎛️ **Custom controls:** length 8–64, character types, exclude ambiguous / look-alike characters, custom symbol sets, no consecutive repeats, no duplicates
- 📚 **Bulk generation:** 5, 10, 25 or 50 passwords, per-item copy & regenerate, copy all, opt-in `.txt` download behind a warning
- 🗝️ **Passphrases:** 3–12 words from a bundled 7,776-word list, separator choice, capitalisation, optional number
- 💾 **Save in your browser:** “Copy password & open site” puts the password on the clipboard and opens the website, so the browser offers to save it at sign-up and autofills it next time; a **transfer file** (`.csv`) imports the same logins into Chrome, Edge, Firefox or Apple Passwords, with step-by-step instructions for each browser and for syncing across devices
- ⏳ **Branded loading screen:** static splash in the HTML shell (paints before JS), fades once the first page is ready, CSS fail-safe if JS never runs
- 🕘 **Session history:** off by default, memory-only, deletable
- 🚫 **No backend, no accounts, no cookies, no analytics.** A strict CSP (`connect-src 'none'`) stops the page from making any network request from script.

---

## Quick start

Requires **Node.js 20.11+**.

```bash
npm install
npm run dev        # http://localhost:5173 (live reload)
npm run build      # production build → dist/
npm run preview    # serve dist/ with production security headers → http://127.0.0.1:4173
```

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Development build + server with live reload |
| `npm run build` | Production build to `dist/` (minified, code-split, content-hashed, per-route HTML, `_headers`, robots/sitemap) |
| `npm run preview` | Serves `dist/` exactly like production (same headers, 404 handling) |
| `npm test` | Unit tests (Node test runner): crypto, generator, strength, passphrases, AST-based source security audit, header config |
| `npm run test:e2e` | Builds, then runs Playwright browser tests against the production build |
| `npm run typecheck` | Full TypeScript check (needs `@types/react` from `npm install`) |
| `npm run wordlist` | Rebuilds the passphrase word list from a Hunspell `en_US.dic` |
| `npm run audit:deps` | `npm audit` of runtime dependencies |

First-time e2e setup: `npx playwright install chromium`.

## Tech stack

- **React 19 + TypeScript**, bundled with **esbuild** (ESM, code-splitting, hashing)
- **Tailwind CSS v4** compiled through its Node API (`scripts/build.mjs`) — design tokens live in `src/styles/globals.css` (`@theme`)
- **CSS 3D** hero vault + `<canvas>` particle field (no WebGL, no Three.js) — lazy-loaded as its own chunk, paused off-screen, static under `prefers-reduced-motion`
- Hand-built micro-interactions (scroll reveals, card tilt, copy success) instead of an animation library
- Inline SVG icons; self-hosted, subset Inter fonts (OFL)
- Runtime dependencies: **`react` and `react-dom` only**

> **Why not Vite / Framer Motion / Three.js?** The original brief preferred them. This build intentionally keeps the dependency surface minimal (a security product benefits from fewer moving parts), and the toolchain above produces the same output: hashed, code-split ES modules and a lazily-loaded hero. Swapping in Vite later is straightforward because the source is plain React/TS with no build-tool-specific APIs.

## Project structure

```
src/
  main.tsx, App.tsx          entry, routing, layout, per-route <title>/meta
  components/                Navbar, Footer, Hero, Vault3D, FeatureCard, FAQ, SecurityVisual,
                             PasswordDisplay, StrengthMeter, PasswordControls, BulkGenerator,
                             PassphraseGenerator, Icons
  pages/                     Home, Generator, SecurityPage, Privacy, Terms, Contact, NotFound, DocPage
  hooks/                     usePasswordGenerator, useClipboard, useReducedMotion, useReveal, useAnnouncer
  lib/                       crypto.ts (CSPRNG + rejection sampling), generator.ts, passwordValidation.ts,
                             passwordStrength.ts (exact entropy), passphrase.ts, wordlist.ts, router.tsx
  config/                    site.ts (contact details etc.), routes.json (titles/descriptions)
  styles/globals.css         Tailwind + design system + 3D vault styles
  types/password.ts
scripts/                     build.mjs, dev.mjs, preview.mjs, security.mjs (CSP/headers), build-wordlist.mjs
tests/unit/                  *.test.ts (node:test)
tests/e2e/                   app.test.mjs (Playwright)
public/                      favicon, icons, og-image.png, fonts, site.webmanifest
docs/                        DEPLOYMENT.md, WORDLIST.md
vercel.json, wrangler.toml   hosting configuration
```

## Configuration

| Where | Setting | Purpose |
| --- | --- | --- |
| `SITE_URL` env var (build time) | e.g. `https://vaultkey.example.com` | Enables canonical URLs, `og:url`, absolute `og:image` and `sitemap.xml`. Without it those are omitted (a notice is printed). See `.env.example`. |
| `src/config/site.ts` | `repositoryUrl`, `contactEmail`, `securityEmail`, `operator` | Shown on the Contact, Privacy and Terms pages. Empty values are hidden — VaultKey never shows placeholder contact details. |

No API keys or secrets are needed. Core generation needs no environment variables at all.

## How generation works

See [`SECURITY.md`](SECURITY.md) and the in-app `/security` page. In brief:

1. 32-bit values from `crypto.getRandomValues()` are mapped to `[0, n)` with **rejection sampling** (no modulo bias).
2. A candidate password is drawn uniformly from the pool (or without adjacent repeats / without replacement when those options are on).
3. If any selected character type is missing, the whole candidate is rejected and redrawn — so the output is **exactly uniform over all valid passwords** while still guaranteeing every type appears.
4. A final CSPRNG Fisher–Yates shuffle is applied (except in no-consecutive mode).
5. Entropy = log₂ of the exact number of passwords the settings can produce.

## Saving passwords in the browser

**Limitation:** no website can write a password into the browser's password manager *for another site*. Browsers only offer to save a password when it's submitted on that site's own form, and they only sync within the same browser (Chrome ↔ Chrome, Firefox ↔ Firefox, Safari via iCloud). VaultKey gives users the two routes that do work:

1. **Guided save:** under any generated password, click **Save in your browser** → enter the website → **Copy password & open site**. VaultKey copies the password and opens the site (without any query string, `noopener`). The user pastes it into the sign-up / change-password form, submits it, and clicks **Save** when the browser asks. From then on the browser autofills it at login and syncs it to that browser on their other devices.
2. **Transfer file:** every saved login can also go to an in-memory **transfer list** (Save tab). **Download transfer file** produces `vaultkey-passwords.csv` with the header `name,url,username,password,note`, which Chrome, Edge, Firefox and Apple Passwords all import. The Save tab shows the import and sync steps for each browser and pre-selects the user's current browser.

Logic: `src/lib/browserExport.ts` · UI: `src/components/SaveToBrowser.tsx`.

## Deployment

Cloudflare Pages (preferred) and Vercel are both configured. Full instructions, including custom domains, HTTPS and header verification: **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)**.

TL;DR — build command `npm run build`, output directory `dist`, set `SITE_URL` to your public origin.

## Testing

What the automated tests cover:

- **Unit (67 tests):** bounds and uniformity (chi-square) of `secureRandomInt`; rejection-sampling behaviour; proof that generation calls `getRandomValues` and never `Math.random`; fail-closed without Web Crypto; every length 8–64; category guarantees; exclusions; custom symbols; repeat rules; exact entropy vs brute force; strength bands; passphrase format and word-list checksum; an **AST-based audit** that fails the build if `src/` ever uses `Math.random`, `console.*`, storage APIs, cookies, `fetch`/XHR/WebSocket/beacon, `innerHTML`/`dangerouslySetInnerHTML`, `eval` or query strings; CSP and `vercel.json` consistency; transfer-file CSV round-trip (quotes, commas, newlines), browser detection, URL normalisation (rejects `javascript:` etc., strips query strings) and the 3,000-per-import limit.
- **End-to-end (41 tests, Chromium, production build):** loading screen appears and is removed (and hides itself with JS disabled); “Save in your browser” copies the password and opens the site (no query string, `noopener`) from the Password, Passphrase, Bulk and Save tabs, and the transfer file is valid; every page loads with no console errors, CSP violations or duplicate ids; 404 handling; SEO assets; nav anchors, mobile menu, FAQ accordion, lazy 3D chunk, reduced motion; generator length/categories/advanced options/reset/mask/copy (incl. fallback)/history; bulk 5–50 with copy-all, regenerate-one and confirmed download; passphrases; keyboard tab navigation; **no request ever contains a password, only same-origin GETs, storage and cookies stay empty, and the CSP blocks an attempted `fetch`**; no horizontal overflow at 360/390/768/1024/1440/1920 px on every page; accessible names/labels, visible focus, touch-target sizes.

## Accessibility

Semantic landmarks, skip link, one `h1` per page, labelled controls, ARIA tabs/accordion/meter/switches, polite live-region announcements (which never include the password), visible focus rings, text labels alongside colour for strength, ≥ 44px touch targets, and full `prefers-reduced-motion` support.

## Security limitations & recommendations

VaultKey protects passwords **while they are generated**. It cannot protect against malware or malicious extensions on the user's device, clipboard snooping/sync, a compromised host or build pipeline, or websites that store passwords badly. It has **not** been independently audited. Before a public launch we recommend:

1. Run `npm audit` and pin dependencies with a committed `package-lock.json`.
2. Deploy over HTTPS only; consider submitting the domain to the HSTS preload list once stable.
3. Verify headers in production (`curl -I https://your-domain/`) and with securityheaders.com / Mozilla Observatory.
4. Enable branch protection and signed commits for the deploy branch; restrict who can change hosting settings.
5. Consider Subresource Integrity / reproducible builds and publishing build hashes.
6. Have the Privacy Policy and Terms reviewed by a lawyer for your jurisdiction, and fill in `src/config/site.ts`.
7. Commission an independent security review if you plan to make stronger claims.

## License

MIT — see [LICENSE](LICENSE). Inter font © The Inter Project Authors (SIL OFL 1.1, `public/fonts/LICENSE-Inter.txt`). Word list derived from SCOWL © Kevin Atkinson (see `docs/WORDLIST.md`).
