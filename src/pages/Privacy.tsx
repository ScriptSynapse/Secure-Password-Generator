import { Link } from '../lib/router';
import { SITE } from '../config/site';
import { DocPage } from './DocPage';

export default function Privacy() {
  return (
    <DocPage
      eyebrow="Legal"
      title="Privacy Policy"
      intro="Short version: VaultKey doesn't collect your passwords or any personal data. There are no accounts, no cookies and no analytics."
      updated={SITE.legalUpdated}
    >
      <h2>1. Who this policy covers</h2>
      <p>
        This policy describes how the VaultKey website (“VaultKey”, “we”) handles information when you use it. VaultKey is operated by {SITE.operator}. If
        you have questions, see the <Link to="/contact">contact page</Link>.
      </p>

      <h2>2. Passwords and passphrases you generate</h2>
      <ul>
        <li>They are generated entirely in your browser using the Web Crypto API.</li>
        <li>They are never transmitted to us or to anyone else, and the site's Content Security Policy blocks the page from making scripted network requests.</li>
        <li>
          They are never stored in cookies, localStorage, sessionStorage, IndexedDB, databases, logs or URLs. They exist only in your tab's memory and are gone
          when you close or reload the page.
        </li>
        <li>The optional session history is off by default, kept in memory only, and can be deleted at any time.</li>
        <li>
          If you choose to download passwords — as a text file or as a browser transfer file (.csv) — that file is created on your device and is your
          responsibility. VaultKey never uploads it anywhere; you import it into your browser yourself.
        </li>
      </ul>

      <h2>3. Information we collect</h2>
      <p>
        VaultKey itself collects <strong>no personal information</strong>. We don't use cookies, analytics, advertising, fingerprinting, tracking pixels,
        session replay or third-party scripts, and there are no accounts or forms.
      </p>

      <h2>4. Hosting provider</h2>
      <p>
        Like every website, VaultKey is delivered by a hosting provider (for example Cloudflare Pages or Vercel). When your browser requests the site's files,
        the provider may process standard technical data such as your IP address, browser user-agent, requested URL and time of request, for security,
        abuse-prevention and operational purposes. This data never includes your generated passwords, because they are never sent. The hosting provider's own
        privacy policy governs that processing.
      </p>

      <h2>5. Local browser data</h2>
      <p>
        VaultKey does not intentionally store anything on your device. Your browser may cache the site's static files (HTML, CSS, JavaScript, fonts and images)
        to load faster next time; you can clear this in your browser settings at any time.
      </p>

      <h2>6. Children</h2>
      <p>VaultKey does not knowingly collect information from anyone, including children, because it collects no personal information at all.</p>

      <h2>7. Your rights</h2>
      <p>
        Because VaultKey holds no personal data about you, there is nothing for us to access, correct, export or delete. Requests about data processed by the
        hosting provider should be directed to that provider.
      </p>

      <h2>8. Changes</h2>
      <p>If this policy changes, the updated version will be posted on this page with a new “last updated” date.</p>
    </DocPage>
  );
}
