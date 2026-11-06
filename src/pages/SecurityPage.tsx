import { Link } from '../lib/router';
import { SITE } from '../config/site';
import { DocPage } from './DocPage';

export default function SecurityPage() {
  return (
    <DocPage
      eyebrow="Security"
      title="How VaultKey keeps generation private"
      intro="A plain description of what VaultKey does, how the generator works, which protections are in place, and what VaultKey cannot protect you from."
      toc={[
        ['model', 'Security model'],
        ['algorithm', 'Generation algorithm'],
        ['entropy', 'Strength & entropy'],
        ['passphrases', 'Passphrases'],
        ['controls', 'Implemented controls'],
        ['limits', 'Limitations'],
        ['verify', 'Verify it yourself'],
        ['report', 'Reporting issues'],
      ]}
    >
      <h2 id="model">Security model</h2>
      <p>
        VaultKey is a static website. There is no backend, no database, no account system and no analytics. When you open the generator, your browser downloads
        the page's HTML, CSS, fonts and JavaScript from the host, and from then on everything happens inside your tab.
      </p>
      <ul>
        <li>Passwords and passphrases are created in JavaScript running on your device.</li>
        <li>They are held only in memory (React state) and are never written to cookies, localStorage, sessionStorage, IndexedDB or the URL.</li>
        <li>They are never logged to the console or included in error messages.</li>
        <li>The only network requests the page makes are for its own static files.</li>
      </ul>

      <h2 id="algorithm">Generation algorithm</h2>
      <p>
        All randomness comes from <code>crypto.getRandomValues()</code>, the Web Crypto API's interface to your operating system's cryptographically secure random
        number generator (CSPRNG). VaultKey never uses <code>Math.random()</code>, timestamps or seeded generators for anything secret. If Web Crypto is not
        available, VaultKey refuses to generate rather than falling back to weaker randomness.
      </p>
      <h3>Unbiased selection (rejection sampling)</h3>
      <p>
        To pick one of <em>n</em> characters, VaultKey draws a 32-bit random number <em>x</em>. Taking <code>x % n</code> directly would make some characters
        slightly more likely whenever 2<sup>32</sup> isn't a multiple of <em>n</em> ("modulo bias"). Instead, values at or above the largest multiple of <em>n</em>{' '}
        below 2<sup>32</sup> are thrown away and redrawn, so every character is exactly equally likely.
      </p>
      <pre>{`limit = 2^32 − (2^32 mod n)
repeat: x ← getRandomValues(uint32)
until x < limit
return x mod n`}</pre>
      <h3>Building a password</h3>
      <ol>
        <li>Validate the options: length must be a whole number from 8 to 64, and at least one character type must be selected and non-empty after exclusions.</li>
        <li>
          Build the character pool from the selected types, then remove ambiguous symbols (<code>{'{ } [ ] ( ) / \\ \' " ` ~ , ; : . < >'}</code>) and/or look-alike
          characters (<code>i I l L 1 | o O 0</code>) if requested. Custom symbol sets accept only the 32 printable ASCII punctuation characters.
        </li>
        <li>
          Draw a candidate: each position uniformly from the pool; or, with “avoid consecutive repeats”, uniformly from the pool minus the previous character; or,
          with “avoid duplicates”, as a partial Fisher–Yates shuffle of the pool (sampling without replacement).
        </li>
        <li>If any selected character type is missing, discard the whole candidate and draw again (rejection sampling at the password level).</li>
        <li>Apply a final CSPRNG Fisher–Yates shuffle (skipped in “avoid consecutive repeats” mode, where it could create adjacent repeats).</li>
      </ol>
      <p>
        Step 4 makes the output exactly uniform over every password that satisfies your rules, which avoids the small bias of the common “insert one of each type
        and shuffle” technique while still guaranteeing that every selected type appears. If a rule can't be satisfied — for example “avoid duplicates” with a
        pool smaller than the length — VaultKey relaxes that rule and tells you so in the “Rules applied” panel.
      </p>

      <h2 id="entropy">Strength & entropy</h2>
      <p>
        Because VaultKey knows exactly how a password was generated, it can compute the number of distinct passwords your settings could produce, <em>N</em>, and
        report entropy as log<sub>2</sub>(<em>N</em>) bits. The count is computed exactly with big-integer arithmetic and the inclusion–exclusion principle, so
        it accounts for the “every type must appear” rule and for the repeat rules. For the default settings (20 characters from 94) this is about 130.9 bits.
      </p>
      <table>
        <thead>
          <tr>
            <th>Rating</th>
            <th>Entropy</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Very Weak</td>
            <td>below 28 bits</td>
          </tr>
          <tr>
            <td>Weak</td>
            <td>28–35 bits</td>
          </tr>
          <tr>
            <td>Moderate</td>
            <td>36–59 bits</td>
          </tr>
          <tr>
            <td>Strong</td>
            <td>60–79 bits</td>
          </tr>
          <tr>
            <td>Very Strong</td>
            <td>80 bits and above</td>
          </tr>
        </tbody>
      </table>
      <p>
        The time estimate shown next to the meter assumes an attacker who knows your exact settings and can test 100 billion guesses per second offline, and
        reports the average time (half the search space). Real-world attack speed depends heavily on how a website stores passwords. Entropy measures resistance
        to guessing only; it says nothing about phishing, data breaches, malware or password reuse. The meter rates passwords generated by VaultKey — it is not
        designed to rate passwords you made up yourself.
      </p>

      <h2 id="passphrases">Passphrases</h2>
      <p>
        Passphrase mode picks each word independently and uniformly, with <code>crypto.getRandomValues()</code> and rejection sampling, from a bundled list of
        exactly 7,776 English words (log<sub>2</sub> 7776 ≈ 12.9 bits per word, so six words ≈ 77.5 bits). Capitalisation is applied to every word and adds no
        entropy; “include a number” adds one random digit to one random word (log<sub>2</sub>(10 × words) extra bits).
      </p>
      <p>
        The list is derived from the Hunspell en_US dictionary, which is generated from SCOWL (Spell Checker Oriented Word Lists, © Kevin Atkinson, permissive
        licence). Words are 4–7 lowercase letters, filtered against an offensive-word blocklist, and selected deterministically by a script included in the source
        code (<code>scripts/build-wordlist.mjs</code>), so the list can be rebuilt and checked against its published SHA-256 checksum.
      </p>

      <h2 id="controls">Implemented controls</h2>
      <p>These are built into the code and deployment configuration, and are covered by VaultKey's automated tests:</p>
      <ul>
        <li>
          <strong>Strict Content Security Policy:</strong> <code>default-src 'none'</code>, scripts/styles/fonts only from the site itself, and{' '}
          <code>connect-src 'none'</code> so the browser blocks fetch, XHR, WebSocket and beacon requests from the page.
        </li>
        <li>
          <strong>Trusted Types</strong> enforcement (<code>require-trusted-types-for 'script'</code>), so string-to-HTML sinks such as <code>innerHTML</code> are
          blocked; VaultKey never renders unescaped HTML.
        </li>
        <li>
          <strong>No third-party code at runtime:</strong> no analytics, ads, tag managers, CDNs or external fonts. Fonts are self-hosted.
        </li>
        <li>
          <strong>Security headers:</strong> HSTS, <code>X-Content-Type-Options: nosniff</code>, <code>frame-ancestors 'none'</code> / <code>X-Frame-Options: DENY</code>
          , <code>Referrer-Policy: no-referrer</code>, a restrictive <code>Permissions-Policy</code>, and cross-origin isolation headers (COOP/COEP/CORP).
        </li>
        <li>
          <strong>No sensitive data in URLs:</strong> VaultKey never uses query parameters; fragments are used only for page sections and tab names.
        </li>
        <li>
          <strong>Minimal dependencies:</strong> the shipped app depends only on React and React DOM.
        </li>
        <li>
          <strong>Input validation:</strong> lengths are clamped to 8–64, custom symbols are restricted to ASCII punctuation, and invalid settings produce clear
          messages instead of weak output.
        </li>
        <li>
          <strong>Explicit export only:</strong> bulk lists (.txt) and browser transfer files (.csv) are created on your device and downloaded only after you confirm
          a warning. Nothing is exported automatically. For transfer files, query strings and fragments are stripped from website addresses so session tokens
          aren’t copied into them.
        </li>
      </ul>
      <p>
        <strong>Not claimed:</strong> VaultKey has not been independently audited or certified, and no formal penetration test has been performed. The
        descriptions above are of the implementation, not third-party attestations.
      </p>

      <h2 id="limits">Limitations</h2>
      <ul>
        <li>
          <strong>Your device must be trustworthy.</strong> Malware, keyloggers, screen recorders or malicious browser extensions can see anything shown in your
          browser, including generated passwords.
        </li>
        <li>
          <strong>The clipboard is shared.</strong> Copied passwords can be read by other apps and may sync across devices through clipboard-history features.
          Paste promptly and clear your clipboard if that matters to you.
        </li>
        <li>
          <strong>You must trust the delivered code.</strong> If the host or the deployment pipeline were compromised, modified JavaScript could be served. HTTPS,
          the CSP and the open source code reduce, but do not remove, this risk.
        </li>
        <li>
          <strong>Memory can't be wiped perfectly.</strong> JavaScript strings are immutable, so “clearing” history drops every reference and lets the garbage
          collector reclaim the memory, but VaultKey cannot guarantee when the bytes are overwritten.
        </li>
        <li>
          <strong>Downloads are plain text.</strong> An exported .txt file is unencrypted. Import it into a password manager and delete it.
        </li>
        <li>
          <strong>Strong passwords need good storage.</strong> Use a reputable password manager, a unique password for every site, and multi-factor
          authentication where available.
        </li>
      </ul>

      <h2 id="verify">Verify it yourself</h2>
      <ol>
        <li>Open your browser's developer tools and switch to the Network tab.</li>
        <li>Generate, copy and bulk-generate passwords. You'll see no new requests (the passphrase word list loads once as a static script).</li>
        <li>
          Check Application → Storage: localStorage, sessionStorage, IndexedDB and cookies stay empty.
        </li>
        <li>Inspect the response headers of the page to see the Content Security Policy.</li>
      </ol>

      <h2 id="report">Reporting issues</h2>
      <p>
        If you find a security problem, please report it privately rather than publicly.{' '}
        {SITE.securityEmail ? (
          <>
            Email <a href={`mailto:${SITE.securityEmail}`}>{SITE.securityEmail}</a>.
          </>
        ) : (
          <>
            See the <Link to="/contact">contact page</Link> for how to reach the operator of this deployment.
          </>
        )}
      </p>
    </DocPage>
  );
}
