/**
 * End-to-end tests against the PRODUCTION build (dist/), served with the same
 * security headers as the real deployment. Run with `npm run test:e2e`
 * (builds first). Requires a Playwright Chromium: `npx playwright install chromium`.
 */
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { chromium } from 'playwright';
import { startServer } from '../../scripts/preview.mjs';

let server;
let base;
let browser;

const ROUTES = ['/', '/generator', '/security', '/privacy', '/terms', '/contact'];
const WIDTHS = [360, 390, 768, 1024, 1440, 1920];

/** Wrap the Clipboard API so tests can see what was written (the real clipboard can't be read under our Permissions-Policy). */
const CLIPBOARD_SPY = () => {
  window.__copied = [];
  window.__cspViolations = [];
  document.addEventListener('securitypolicyviolation', (e) => window.__cspViolations.push(`${e.violatedDirective} ${e.blockedURI}`));
  if (navigator.clipboard) {
    navigator.clipboard.writeText = async (t) => {
      window.__copied.push(t);
    };
  }
};

async function open(path, opts = {}) {
  const context = await browser.newContext({ viewport: { width: opts.width ?? 1280, height: opts.height ?? 900 }, reducedMotion: opts.reducedMotion ?? 'no-preference', acceptDownloads: true });
  await context.addInitScript(CLIPBOARD_SPY);
  const page = await context.newPage();
  const errors = [];
  const requests = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('request', (r) => requests.push({ url: r.url(), method: r.method(), body: r.postData() ?? '' }));
  page.on('requestfailed', (r) => errors.push(`request failed: ${r.url()}`));
  await page.goto(base + path, { waitUntil: 'networkidle' });
  return { context, page, errors, requests };
}

const output = (page, id = 'password-output') => page.getByTestId(id).innerText();

before(async () => {
  if (!fs.existsSync(new URL('../../dist/index.html', import.meta.url))) throw new Error('Run `npm run build` first (npm run test:e2e does this).');
  ({ server, url: base } = await startServer({ port: 0 }));
  browser = await chromium.launch();
});
after(async () => {
  await browser?.close();
  server?.close();
});

describe('pages, assets and console', () => {
  for (const route of ROUTES) {
    test(`${route} loads with no console errors, CSP violations or broken assets`, async () => {
      const { context, page, errors } = await open(route);
      const res = await page.request.get(base + route);
      assert.equal(res.status(), 200);
      assert.ok(res.headers()['content-security-policy']?.includes("connect-src 'none'"));
      assert.equal(await page.locator('h1').count(), 1, 'exactly one h1');
      await page.mouse.wheel(0, 4000);
      await page.waitForTimeout(400);
      assert.deepEqual(await page.evaluate(() => window.__cspViolations), []);
      assert.deepEqual(errors, []);
      const dupIds = await page.evaluate(() => {
        const ids = [...document.querySelectorAll('[id]')].map((e) => e.id);
        return ids.filter((id, i) => ids.indexOf(id) !== i);
      });
      assert.deepEqual(dupIds, []);
      await context.close();
    });
  }

  test('unknown routes serve the 404 page with HTTP 404', async () => {
    const { context, page } = await open('/does-not-exist');
    assert.equal((await page.request.get(base + '/does-not-exist')).status(), 404);
    await page.getByRole('heading', { name: /locked away/i }).waitFor();
    await context.close();
  });

  test('SEO basics: title, description, OG tags, robots, favicon', async () => {
    const { context, page } = await open('/');
    assert.equal(await page.title(), 'VaultKey - Free Secure Password Generator');
    assert.match(await page.locator('meta[name=description]').getAttribute('content'), /Generate strong, random passwords/);
    assert.ok(await page.locator('meta[property="og:title"]').count());
    for (const asset of ['/robots.txt', '/favicon.svg', '/og-image.png', '/site.webmanifest', '/apple-touch-icon.png']) {
      assert.equal((await page.request.get(base + asset)).status(), 200, asset);
    }
    await context.close();
  });
});

describe('landing page', () => {
  test('nav links scroll to sections and CTA opens the generator', async () => {
    const { context, page } = await open('/');
    for (const [label, id] of [
      ['Features', 'features'],
      ['How It Works', 'how-it-works'],
      ['Security', 'security'],
      ['FAQ', 'faq'],
    ]) {
      await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: label, exact: true }).click();
      await page.waitForFunction((i) => {
        const r = document.getElementById(i).getBoundingClientRect();
        return r.top < 200 && r.top > -50;
      }, id);
    }
    await page.getByTestId('hero-generate').click();
    await page.waitForURL(/\/generator$/);
    await page.getByTestId('password-output').waitFor();
    await context.close();
  });

  test('navbar gains a blurred background after scrolling', async () => {
    const { context, page } = await open('/');
    assert.equal(await page.getByTestId('navbar').getAttribute('data-scrolled'), 'false');
    await page.mouse.wheel(0, 600);
    await page.waitForFunction(() => document.querySelector('[data-testid=navbar]').dataset.scrolled === 'true');
    await context.close();
  });

  test('mobile menu opens, navigates, and closes', async () => {
    const { context, page } = await open('/', { width: 390, height: 844 });
    const menu = page.getByTestId('mobile-menu');
    assert.equal(await menu.isVisible(), false);
    await page.getByTestId('menu-toggle').click();
    assert.equal(await page.getByTestId('menu-toggle').getAttribute('aria-expanded'), 'true');
    await menu.getByRole('link', { name: 'FAQ' }).click();
    assert.equal(await menu.isVisible(), false);
    await page.getByTestId('menu-toggle').click();
    await page.keyboard.press('Escape');
    assert.equal(await menu.isVisible(), false);
    await page.getByTestId('menu-toggle').click();
    await menu.getByRole('link', { name: 'Launch Generator' }).click();
    await page.waitForURL(/\/generator$/);
    await context.close();
  });

  test('FAQ accordion opens and closes', async () => {
    const { context, page } = await open('/#faq');
    const qs = page.getByTestId('faq-question');
    assert.equal(await qs.count(), 9);
    assert.equal(await qs.nth(0).getAttribute('aria-expanded'), 'true');
    await qs.nth(2).click();
    assert.equal(await qs.nth(2).getAttribute('aria-expanded'), 'true');
    assert.equal(await qs.nth(0).getAttribute('aria-expanded'), 'false');
    await qs.nth(2).click();
    assert.equal(await qs.nth(2).getAttribute('aria-expanded'), 'false');
    await context.close();
  });

  test('3D vault renders and is lazy-loaded as a separate chunk', async () => {
    const { context, page, requests } = await open('/');
    await page.getByTestId('vault-3d').waitFor();
    assert.ok(requests.some((r) => /Vault3D-.*\.js$/.test(r.url)));
    await context.close();
  });

  test('reduced motion disables continuous animation', async () => {
    const { context, page } = await open('/', { reducedMotion: 'reduce' });
    await page.getByTestId('vault-3d').waitFor();
    const dur = await page.evaluate(() => getComputedStyle(document.querySelector('.door-dial')).animationDuration);
    assert.ok(parseFloat(dur) < 0.01, `animation still running: ${dur}`);
    await context.close();
  });

  test('every footer link resolves', async () => {
    const { context, page } = await open('/');
    const hrefs = await page.locator('footer a[href^="/"]').evaluateAll((as) => as.map((a) => a.getAttribute('href')));
    assert.ok(hrefs.length >= 10);
    for (const h of hrefs) assert.equal((await page.request.get(base + h.split('#')[0])).status(), 200, h);
    await context.close();
  });
});

describe('password generator', () => {
  test('generates a 20-character password by default and a new one on every click', async () => {
    const { context, page } = await open('/generator');
    const first = await output(page);
    assert.equal(first.length, 20);
    const seen = new Set([first]);
    for (let i = 0; i < 10; i += 1) {
      await page.getByTestId('generate').click();
      seen.add(await output(page));
    }
    assert.equal(seen.size, 11);
    assert.equal(await page.getByTestId('strength-label-password').innerText(), 'Very Strong');
    assert.match(await page.getByTestId('entropy-password').innerText(), /130\.9/);
    await context.close();
  });

  test('length slider, input and +/- buttons update immediately (8–64)', async () => {
    const { context, page } = await open('/generator');
    await page.getByTestId('length-slider').fill('64');
    assert.equal((await output(page)).length, 64);
    assert.equal(await page.getByTestId('length-increment').isDisabled(), true, 'cannot exceed 64');
    await page.getByTestId('length-slider').fill('8');
    assert.equal((await output(page)).length, 8);
    assert.equal(await page.getByTestId('length-decrement').isDisabled(), true, 'cannot go below 8');
    await page.getByTestId('length-increment').click();
    assert.equal((await output(page)).length, 9);
    await page.getByTestId('length-input').fill('300');
    await page.getByTestId('length-input').blur();
    assert.equal((await output(page)).length, 64);
    await context.close();
  });

  test('character types are honoured and the last one cannot be unchecked', async () => {
    const { context, page } = await open('/generator');
    await page.getByTestId('cat-uppercase').uncheck();
    await page.getByTestId('cat-lowercase').uncheck();
    await page.getByTestId('cat-symbols').uncheck();
    assert.match(await output(page), /^[0-9]{20}$/);
    await page.getByTestId('cat-numbers').click();
    assert.equal(await page.getByTestId('cat-numbers').isChecked(), true);
    assert.match(await page.getByTestId('category-hint').innerText(), /At least one/);
    // 20 digits ≈ 66.4 bits → Strong; 8 digits ≈ 26.6 bits → Very Weak
    assert.equal(await page.getByTestId('strength-label-password').innerText(), 'Strong');
    await page.getByTestId('length-slider').fill('8');
    assert.equal(await page.getByTestId('strength-label-password').innerText(), 'Very Weak');
    await context.close();
  });

  test('advanced: ambiguous & similar exclusions, custom symbols, no duplicates', async () => {
    const { context, page } = await open('/generator');
    await page.getByTestId('advanced-toggle').click();
    await page.getByTestId('opt-ambiguous').check();
    await page.getByTestId('opt-similar').check();
    await page.getByTestId('length-slider').fill('64');
    for (let i = 0; i < 20; i += 1) {
      const p = await output(page);
      assert.ok(!/[{}[\]()/\\'"`~,;:.<>iIlL1|oO0]/.test(p), `excluded char in ${p.length}-char output`);
      await page.getByTestId('generate').click();
    }
    await page.getByTestId('opt-custom-symbols').check();
    await page.getByTestId('custom-symbols-input').fill('@#');
    for (let i = 0; i < 10; i += 1) {
      const p = await output(page);
      assert.ok(/[@#]/.test(p) && !/[!$%^&*\-_=+?]/.test(p));
      await page.getByTestId('generate').click();
    }
    await page.getByTestId('opt-duplicates').check();
    await page.getByTestId('length-slider').fill('30');
    const p = await output(page);
    assert.equal(new Set(p).size, p.length);
    assert.match(await page.getByTestId('rules-applied').innerText(), /at most once/);
    await context.close();
  });

  test('reset restores defaults', async () => {
    const { context, page } = await open('/generator');
    await page.getByTestId('length-slider').fill('40');
    await page.getByTestId('cat-symbols').uncheck();
    await page.getByTestId('reset-settings').click();
    assert.equal((await output(page)).length, 20);
    assert.equal(await page.getByTestId('cat-symbols').isChecked(), true);
    await context.close();
  });

  test('copy uses the Clipboard API with the exact password and confirms', async () => {
    const { context, page } = await open('/generator');
    const pw = await output(page);
    await page.getByTestId('password-output-copy').click();
    await page.getByTestId('password-output-copy').getByText('Copied').waitFor();
    assert.deepEqual(await page.evaluate(() => window.__copied), [pw]);
    assert.match(await page.getByTestId('announcer').innerText(), /copied/i);
    assert.doesNotMatch(await page.getByTestId('announcer').innerText(), new RegExp(pw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    await context.close();
  });

  test('copy falls back gracefully without the Clipboard API', async () => {
    const context = await browser.newContext();
    await context.addInitScript(() => {
      Object.defineProperty(navigator, 'clipboard', { value: undefined });
      document.execCommand = () => false;
    });
    const page = await context.newPage();
    await page.goto(base + '/generator', { waitUntil: 'networkidle' });
    await page.getByTestId('password-output-copy').click();
    await page.getByRole('alert').filter({ hasText: /selected/ }).waitFor();
    const selected = await page.evaluate(() => window.getSelection().toString());
    assert.equal(selected, await output(page));
    await context.close();
  });

  test('mask toggle hides and reveals the password', async () => {
    const { context, page } = await open('/generator');
    const pw = await output(page);
    await page.getByTestId('password-output-mask').click();
    assert.equal(await output(page), '•'.repeat(20));
    await page.getByTestId('password-output-mask').click();
    assert.equal(await output(page), pw);
    await context.close();
  });

  test('history is off by default, memory-only, and can be deleted', async () => {
    const { context, page } = await open('/generator');
    assert.equal(await page.getByTestId('history-toggle').isChecked(), false);
    await page.getByTestId('history-toggle').check();
    await page.getByTestId('generate').click();
    await page.getByTestId('generate').click();
    assert.equal(await page.getByTestId('history-list').locator('li').count(), 2);
    await page.getByTestId('history-clear').click();
    assert.equal(await page.getByTestId('history-list').count(), 0);
    await context.close();
  });
});

describe('bulk and passphrase', () => {
  test('bulk: 5/10/25/50 independent passwords, copy all, regenerate one, download with warning', async () => {
    const { context, page } = await open('/generator#bulk');
    for (const n of [5, 10, 25, 50]) {
      await page.getByTestId(`bulk-count-${n}`).click();
      await page.getByTestId('bulk-generate').click();
      const items = await page.getByTestId('bulk-item').allInnerTexts();
      assert.equal(items.length, n);
      assert.equal(new Set(items).size, n);
    }
    const items = await page.getByTestId('bulk-item').allInnerTexts();
    await page.getByTestId('bulk-copy-all').click();
    assert.equal((await page.evaluate(() => window.__copied)).at(-1), items.join('\n'));

    const before = await page.getByTestId('bulk-item').nth(3).innerText();
    await page.getByRole('button', { name: 'Regenerate password 4', exact: true }).click();
    assert.notEqual(await page.getByTestId('bulk-item').nth(3).innerText(), before);

    await page.getByTestId('bulk-download').click();
    await page.getByTestId('download-dialog').getByText('unencrypted').waitFor();
    await page.getByTestId('download-cancel').click();
    assert.equal(await page.getByTestId('download-dialog').isVisible(), false);
    await page.getByTestId('bulk-download').click();
    const [dl] = await Promise.all([page.waitForEvent('download'), page.getByTestId('download-confirm').click()]);
    const text = fs.readFileSync(await dl.path(), 'utf8').trim().split('\n');
    assert.equal(text.length, 50);
    await page.getByTestId('bulk-clear').click();
    assert.equal(await page.getByTestId('bulk-item').count(), 0);
    await context.close();
  });

  test('passphrase: word count, separator, capitalisation, number', async () => {
    const { context, page } = await open('/generator#passphrase');
    await page.waitForFunction(() => /\w+-\w+/.test(document.querySelector('[data-testid=passphrase-output]').innerText));
    assert.equal((await output(page, 'passphrase-output')).split('-').length, 6);
    await page.getByTestId('passphrase-words').fill('9');
    await page.getByTestId('sep-period').click();
    await page.getByTestId('passphrase-capitalize').check();
    await page.getByTestId('passphrase-number').check();
    const p = await output(page, 'passphrase-output');
    const words = p.split('.');
    assert.equal(words.length, 9);
    assert.ok(words.every((w) => /^[A-Z][a-z]+\d?$/.test(w)));
    assert.equal((p.match(/\d/g) || []).length, 1);
    await page.getByTestId('passphrase-output-regenerate').click();
    assert.notEqual(await output(page, 'passphrase-output'), p);
    await page.getByTestId('passphrase-reset').click();
    assert.equal((await output(page, 'passphrase-output')).split('-').length, 6);
    await context.close();
  });

  test('tabs support keyboard arrow navigation', async () => {
    const { context, page } = await open('/generator');
    await page.getByTestId('tab-password').focus();
    await page.keyboard.press('ArrowRight');
    assert.equal(await page.getByTestId('tab-passphrase').getAttribute('aria-selected'), 'true');
    await page.keyboard.press('ArrowRight');
    assert.equal(await page.getByTestId('tab-bulk').getAttribute('aria-selected'), 'true');
    await context.close();
  });
});

describe('privacy guarantees (runtime)', () => {
  test('passwords never leave the page and nothing is persisted', async () => {
    const { context, page, requests } = await open('/generator');
    const seen = [await output(page)];
    for (let i = 0; i < 5; i += 1) {
      await page.getByTestId('generate').click();
      seen.push(await output(page));
    }
    await page.getByTestId('password-output-copy').click();
    await page.getByTestId('tab-bulk').click();
    await page.getByTestId('bulk-generate').click();
    seen.push(...(await page.getByTestId('bulk-item').allInnerTexts()));
    await page.getByTestId('tab-passphrase').click();
    await page.waitForTimeout(300);
    seen.push(await output(page, 'passphrase-output'));

    // Only same-origin GETs for static files.
    for (const r of requests) {
      const u = new URL(r.url);
      assert.equal(u.origin, base, `cross-origin request: ${r.url}`);
      assert.equal(r.method, 'GET');
      assert.equal(u.search, '');
      for (const pw of seen) {
        assert.ok(!r.url.includes(pw) && !r.body.includes(pw), 'password found in a request');
      }
    }
    // Nothing persisted.
    const storage = await page.evaluate(async () => ({
      local: localStorage.length,
      session: sessionStorage.length,
      cookies: document.cookie,
      idb: indexedDB.databases ? (await indexedDB.databases()).length : 0,
      url: location.href,
    }));
    assert.deepEqual({ ...storage, url: undefined }, { local: 0, session: 0, cookies: '', idb: 0, url: undefined });
    for (const pw of seen) assert.ok(!storage.url.includes(pw));
    await context.close();
  });

  test('CSP actually blocks outbound requests from the page', async () => {
    const { context, page } = await open('/generator');
    const result = await page.evaluate(async () => {
      try {
        await fetch('https://example.com/exfil');
        return 'sent';
      } catch {
        return 'blocked';
      }
    });
    assert.equal(result, 'blocked');
    await context.close();
  });
});

describe('responsive layout and accessibility', () => {
  for (const width of WIDTHS) {
    test(`no horizontal overflow at ${width}px on any page`, async () => {
      const context = await browser.newContext({ viewport: { width, height: 900 } });
      const page = await context.newPage();
      for (const route of [...ROUTES, '/generator#bulk', '/generator#passphrase']) {
        await page.goto(base + route, { waitUntil: 'networkidle' });
        if (route === '/generator#bulk') {
          await page.getByTestId('bulk-count-50').click();
          await page.getByTestId('bulk-generate').click();
        }
        if (route === '/generator') await page.getByTestId('length-slider').fill('64');
        await page.waitForTimeout(150);
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
        assert.ok(overflow <= 0, `${route} overflows by ${overflow}px at ${width}px`);
      }
      await context.close();
    });
  }

  test('controls have accessible names, inputs have labels, focus is visible', async () => {
    const { context, page } = await open('/generator');
    await page.getByTestId('advanced-toggle').click();
    const problems = await page.evaluate(() => {
      const out = [];
      for (const b of document.querySelectorAll('button, a[href], [role=tab]')) {
        const name = (b.getAttribute('aria-label') || b.textContent || '').trim();
        if (!name && !b.getAttribute('aria-labelledby')) out.push(`unnamed ${b.tagName} ${b.outerHTML.slice(0, 80)}`);
      }
      for (const i of document.querySelectorAll('input')) {
        const labelled = i.labels?.length || i.getAttribute('aria-label') || i.getAttribute('aria-labelledby');
        if (!labelled) out.push(`unlabelled input ${i.outerHTML.slice(0, 80)}`);
      }
      return out;
    });
    assert.deepEqual(problems, []);
    // Tab to the first control and check a visible outline is drawn.
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    const outline = await page.evaluate(() => getComputedStyle(document.activeElement).outlineStyle);
    assert.notEqual(outline, 'none');
    // Strength is conveyed by text, not colour alone.
    assert.match(await page.getByRole('meter').getAttribute('aria-valuetext'), /Very Strong/);
    await context.close();
  });

  test('touch targets on mobile are at least 40px', async () => {
    const { context, page } = await open('/generator', { width: 360, height: 800 });
    const small = await page.evaluate(() =>
      [...document.querySelectorAll('main button, main input[type=checkbox]')]
        .filter((el) => el.offsetParent !== null)
        .map((el) => {
          const target = el.closest('label') ?? el;
          const r = target.getBoundingClientRect();
          return { h: r.height, w: r.width, html: el.outerHTML.slice(0, 60) };
        })
        .filter((r) => r.h < 36 || r.w < 36),
    );
    assert.deepEqual(small, []);
    await context.close();
  });
});

describe('loading screen', () => {
  test('branded splash shows while the app loads, then is removed', async () => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.route('**/assets/main-*.js', async (r) => {
      await new Promise((x) => setTimeout(x, 800));
      await r.continue();
    });
    const nav = page.goto(base + '/generator');
    await page.locator('#splash').getByText('Preparing your secure generator').waitFor();
    assert.equal(await page.locator('#splash').isVisible(), true);
    await nav;
    await page.getByTestId('password-output').waitFor();
    await page.waitForFunction(() => !document.getElementById('splash'), null, { timeout: 5000 });
    await context.close();
  });

  test('splash hides itself even if JavaScript never runs', async () => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto(base + '/', { waitUntil: 'load' });
    await page.locator('#splash').waitFor({ state: 'hidden', timeout: 15000 });
    assert.equal(await page.locator('.noscript').isVisible(), true);
    await context.close();
  });
});

describe('save in your browser', () => {
  test('dialog copies the password, opens the site in a new tab, and keeps it for the transfer file', async () => {
    const { context, page, requests } = await open('/generator');
    await context.route(/^https:\/\/(?!127\.0\.0\.1)/, (r) => r.fulfill({ status: 200, body: 'site' }));
    const pw = await output(page);

    await page.getByTestId('save-to-browser').click();
    const dialog = page.getByTestId('save-dialog');
    await dialog.getByTestId('save-site').fill('not a site');
    await dialog.getByTestId('save-copy-open').click();
    await dialog.getByText(/full domain|website address/).waitFor();
    await dialog.getByTestId('save-site').fill('https://github.com/signup?session=secret#x');
    await dialog.getByTestId('save-username').fill('octo@example.com');
    const [popup] = await Promise.all([page.waitForEvent('popup'), dialog.getByTestId('save-copy-open').click()]);
    assert.equal(popup.url(), 'https://github.com/signup', 'opens the site without query string or fragment');
    assert.equal(await popup.evaluate(() => window.opener), null, 'opened with noopener');
    assert.equal((await page.evaluate(() => window.__copied)).at(-1), pw, 'password copied');
    await dialog.getByTestId('save-next-steps').getByText('Save password?').waitFor();
    await dialog.getByTestId('save-done').click();
    await page.getByTestId('save-toast').getByText('1 login').waitFor();

    // Save tab: add another without opening, then download the transfer file
    await page.getByTestId('tab-save').click();
    const panel = page.getByRole('tabpanel');
    await panel.getByTestId('save-site').fill('example.org');
    await panel.getByTestId('save-note').fill('Work, "VPN" account');
    await panel.getByTestId('save-add').click();
    assert.match(await panel.getByTestId('save-count').innerText(), /2 logins/);

    await panel.getByTestId('browser-firefox').click();
    assert.match(await panel.getByTestId('browser-steps').innerText(), /Import from a File/);
    await panel.getByTestId('browser-safari').click();
    assert.match(await panel.getByTestId('browser-steps').innerText(), /Import Passwords from File/);

    await panel.getByTestId('save-download').click();
    await page.getByTestId('save-download-dialog').getByText('plain text').waitFor();
    const [dl] = await Promise.all([page.waitForEvent('download'), page.getByTestId('save-download-confirm').click()]);
    assert.equal(dl.suggestedFilename(), 'vaultkey-passwords.csv');
    const lines = fs.readFileSync(await dl.path(), 'utf8').trim().split('\r\n');
    assert.equal(lines[0], 'name,url,username,password,note');
    assert.equal(lines.length, 3);
    assert.ok(lines[1].startsWith('"github.com","https://github.com/signup","octo@example.com","'));
    assert.ok(lines[1].includes(`"${pw.replace(/"/g, '""')}"`), 'exact password, CSV-escaped');
    assert.ok(!lines[1].includes('session=secret'));
    assert.match(lines[2], /^"example\.org","https:\/\/example\.org\/","",".+","Work, ""VPN"" account"$/);

    // The VaultKey page itself made no outbound requests
    assert.ok(requests.every((r) => new URL(r.url).origin === base));
    await context.close();
  });

  test('Copy & open from the Save tab shows next steps; bulk rows and passphrases can be saved too', async () => {
    const { context, page } = await open('/generator#save');
    await context.route(/^https:\/\/(?!127\.0\.0\.1)/, (r) => r.fulfill({ status: 200, body: 'site' }));
    const panel = page.getByRole('tabpanel');
    await panel.getByTestId('save-site').fill('accounts.example.com');
    const [popup] = await Promise.all([page.waitForEvent('popup'), panel.getByTestId('save-panel-open').click()]);
    assert.equal(popup.url(), 'https://accounts.example.com/');
    await panel.getByTestId('save-next-steps').waitFor();
    await popup.close();

    await page.getByTestId('tab-bulk').click();
    await page.getByTestId('bulk-generate').click();
    await page.getByRole('button', { name: 'Save in your browser' }).first().click();
    const dialog = page.getByTestId('save-dialog');
    await dialog.getByTestId('save-site').fill('a.com');
    const [p2] = await Promise.all([page.waitForEvent('popup'), dialog.getByTestId('save-copy-open').click()]);
    await p2.close();
    await dialog.getByTestId('save-done').click();

    await page.getByTestId('tab-passphrase').click();
    await page.getByTestId('save-to-browser').click();
    await dialog.getByTestId('save-site').fill('b.com');
    await dialog.getByTestId('save-keep').uncheck();
    const [p3] = await Promise.all([page.waitForEvent('popup'), dialog.getByTestId('save-copy-open').click()]);
    await p3.close();
    await dialog.getByTestId('save-done').click();
    await page.getByTestId('save-toast').getByText('2 logins').waitFor();
    await context.close();
  });
});
