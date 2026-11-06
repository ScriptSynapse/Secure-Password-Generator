import { Link } from '../lib/router';
import { SITE } from '../config/site';
import { DocPage } from './DocPage';

export default function Terms() {
  return (
    <DocPage eyebrow="Legal" title="Terms of Use" intro="Please read these terms before using VaultKey. By using the site you agree to them." updated={SITE.legalUpdated}>
      <h2>1. The service</h2>
      <p>
        VaultKey is a free, browser-based tool for generating random passwords and passphrases. It is provided by {SITE.operator}. No account is required and no
        fee is charged.
      </p>

      <h2>2. Acceptable use</h2>
      <p>You may use VaultKey for any lawful personal or commercial purpose. You agree not to:</p>
      <ul>
        <li>use VaultKey to break the law or to gain unauthorised access to systems or accounts you don't own or have permission to test;</li>
        <li>attempt to disrupt, overload or compromise the website or its hosting infrastructure;</li>
        <li>misrepresent a modified copy of VaultKey as the official service.</li>
      </ul>

      <h2>3. Your responsibilities</h2>
      <p>
        You are responsible for how you store, share and use the passwords you generate, for the security of your own devices, and for keeping any exported files
        safe. We recommend storing passwords in a reputable password manager and enabling multi-factor authentication wherever possible.
      </p>

      <h2>4. Open-source licence</h2>
      <p>
        VaultKey's source code is released under the MIT License. These terms govern use of this hosted website; the MIT License governs use of the source code.
      </p>

      <h2>5. No warranty</h2>
      <p>
        VaultKey is provided <strong>“as is” and “as available”</strong>, without warranties of any kind, express or implied, including merchantability, fitness
        for a particular purpose, non-infringement, availability or accuracy. Strength ratings and entropy figures are estimates and are not a guarantee that a
        password cannot be guessed, cracked or otherwise compromised. VaultKey has not been independently audited or certified.
      </p>

      <h2>6. Limitation of liability</h2>
      <p>
        To the maximum extent permitted by law, {SITE.operator} will not be liable for any indirect, incidental, special, consequential or punitive damages, or
        for any loss of data, accounts, profits or security, arising from your use of, or inability to use, VaultKey. Some jurisdictions do not allow certain
        limitations, so some of the above may not apply to you.
      </p>

      <h2>7. Privacy</h2>
      <p>
        How VaultKey handles information is described in the <Link to="/privacy">Privacy Policy</Link>.
      </p>

      <h2>8. Changes and availability</h2>
      <p>
        We may update these terms or change, suspend or discontinue the website at any time. Updated terms will be posted here with a new “last updated” date.
        Continued use after changes means you accept the updated terms.
      </p>

      <h2>9. Contact</h2>
      <p>
        Questions about these terms? See the <Link to="/contact">contact page</Link>.
      </p>
    </DocPage>
  );
}
