# Security

This document describes VaultKey's security design, what is implemented, what is **not** claimed, and how to report issues. The same content, written for end users, is served at `/security`.

## Threat model

VaultKey is a static site with no backend. The asset being protected is the generated password, from the moment it is generated until the user copies it.

| In scope (mitigated) | Out of scope (cannot be mitigated by a web page) |
| --- | --- |
| Predictable randomness / modulo bias | Malware, keyloggers, screen capture on the user's device |
| Passwords leaking over the network | Malicious or over-privileged browser extensions |
| Passwords persisted to storage, cookies, URLs, logs | Clipboard managers / clipboard sync reading copied text |
| Third-party scripts reading the page | A compromised host, DNS, or build pipeline serving modified code |
| XSS via unsafe HTML rendering | Websites storing the password insecurely, phishing, reuse |
| Clickjacking | Memory forensics on the user's machine |

## Implemented controls

| Control | Where | Verified by |
| --- | --- | --- |
| CSPRNG only (`crypto.getRandomValues`) with rejection sampling; fails closed if unavailable | `src/lib/crypto.ts` | `tests/unit/crypto.test.ts` |
| Uniform constrained generation (password-level rejection sampling) + final Fisher–Yates shuffle | `src/lib/generator.ts` | `tests/unit/generator.test.ts` |
| Input validation (length 8–64, non-empty sets, ASCII-only custom symbols) | `src/lib/passwordValidation.ts` | unit + e2e |
| No `Math.random`, console, storage, cookies, network APIs, `innerHTML`, `eval`, query strings in `src/` | whole codebase | `tests/unit/source-audit.test.ts` (TypeScript AST) |
| CSP: `default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'none'; frame-ancestors 'none'; require-trusted-types-for 'script'; trusted-types 'none'` … | `scripts/security.mjs` → `dist/_headers`, `vercel.json`, `<meta>` | unit + e2e (fetch is blocked in a real browser) |
| HSTS, nosniff, X-Frame-Options DENY, Referrer-Policy no-referrer, Permissions-Policy, COOP/COEP/CORP | `scripts/security.mjs` | e2e reads response headers |
| No password in requests; only same-origin GETs; storage/cookies empty after use | — | `tests/e2e/app.test.mjs` |
| Memory-only state; history off by default and clearable; export only after explicit confirmation | `src/hooks/usePasswordGenerator.ts`, `BulkGenerator.tsx` | e2e |
| Screen-reader announcements never contain the password | `useAnnouncer.tsx` | e2e |
| Minimal runtime dependencies (`react`, `react-dom`) | `package.json` | unit |

## Not claimed

- No independent audit, penetration test or certification has been performed.
- Entropy figures are estimates of brute-force resistance under stated assumptions, not guarantees.
- JavaScript strings are immutable; clearing history removes references but cannot guarantee memory is zeroed.

## Dependency review

Runtime: `react`, `react-dom`. Build/test only: `esbuild`, `tailwindcss`, `typescript`, `tsx`, `playwright`, `@types/*`. No analytics, telemetry or third-party runtime scripts. Run `npm audit` after installing; it could not be run in the environment where this release was prepared (no registry access), so commit a lockfile and audit before deploying.

## Reporting a vulnerability

Please report privately to the address configured as `securityEmail` in `src/config/site.ts` (or via the repository's private security advisory feature). Include reproduction steps and never include real passwords. Please allow reasonable time for a fix before public disclosure.
