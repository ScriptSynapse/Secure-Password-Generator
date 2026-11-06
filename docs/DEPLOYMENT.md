# Deploying VaultKey

VaultKey is a static site. Any static host works; Cloudflare Pages (preferred) and Vercel are pre-configured. No backend, database, API keys or secrets are required.

| Setting | Value |
| --- | --- |
| Build command | `npm run build` |
| Output directory | `dist` |
| Node version | 20.11 or newer (22 LTS recommended) |
| Environment variable | `SITE_URL=https://your-domain.com` (optional but recommended — enables canonical URLs, `og:url` and `sitemap.xml`) |

Before deploying, fill in `src/config/site.ts` (contact/security email, repository URL, operator name).

## Cloudflare Pages (preferred)

### Git integration
1. Push the repository to GitHub/GitLab.
2. Cloudflare dashboard → **Workers & Pages → Create → Pages → Connect to Git** → choose the repo.
3. Framework preset: **None**. Build command `npm run build`. Output directory `dist`.
4. **Settings → Environment variables:** add `SITE_URL` (e.g. `https://vaultkey.pages.dev` or your custom domain) and `NODE_VERSION=22`.
5. Deploy.

### CLI
```bash
npm run build
npx wrangler pages deploy dist --project-name vaultkey
```

**Security headers:** the build writes `dist/_headers`, which Cloudflare Pages applies automatically (CSP, HSTS, etc.).
**Routing:** each route is pre-rendered as `/<route>/index.html`, and unknown paths get `404.html` with a real 404 status — no SPA rewrite rule is needed.

## Vercel

1. Import the repository in Vercel. Framework preset: **Other**.
2. `vercel.json` already sets the build command, output directory and security headers.
3. Add the `SITE_URL` environment variable (Production).
4. Deploy (or `npx vercel --prod`).

## Custom domain

- **Cloudflare Pages:** project → **Custom domains → Set up a domain**. If the domain is on Cloudflare DNS, the CNAME is created for you; otherwise add a `CNAME` to `<project>.pages.dev`.
- **Vercel:** project → **Settings → Domains → Add**, then create the DNS record Vercel shows (A `76.76.21.21` for apex or CNAME `cname.vercel-dns.com`).
- Update `SITE_URL` to the custom domain and redeploy so canonical URLs and the sitemap match.

## HTTPS

Both hosts issue and renew TLS certificates automatically.
- Turn on **Always Use HTTPS** (Cloudflare: SSL/TLS → Edge Certificates) and set SSL mode to **Full (strict)** if proxying.
- HSTS is already sent (`max-age=63072000; includeSubDomains`). Once you're sure every subdomain serves HTTPS, you may add `preload` in `scripts/security.mjs` (and `vercel.json`) and submit to hstspreload.org — this is hard to undo.
- Set minimum TLS version to 1.2.

## Verifying a deployment

```bash
curl -sI https://your-domain.com/ | grep -iE 'content-security|strict-transport|x-frame|referrer|permissions'
curl -s -o /dev/null -w '%{http_code}\n' https://your-domain.com/nope   # expect 404
```
Then check with securityheaders.com and Mozilla Observatory, and run Lighthouse in an incognito window.

## Changing the security policy

Edit `scripts/security.mjs` only. Then mirror the header values into `vercel.json` — `npm test` fails if the two drift apart. Do **not** loosen `connect-src 'none'` unless you add a feature that genuinely needs it; it is what guarantees passwords cannot be sent anywhere.

## Other hosts (Netlify, nginx, S3 + CloudFront…)

Serve `dist/` as static files, apply the headers from `dist/_headers`, map `/<route>` → `/<route>/index.html`, and use `404.html` for unknown paths with status 404. Run `npm run preview` locally to see the exact expected behaviour.
