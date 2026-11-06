import { Link } from '../lib/router';
import { SITE } from '../config/site';
import { DocPage } from './DocPage';
import { IconAlert, IconGithub, IconInfo } from '../components/Icons';

export default function Contact() {
  const hasAny = SITE.contactEmail || SITE.securityEmail || SITE.repositoryUrl;
  return (
    <DocPage eyebrow="Contact" title="Get in touch" intro="VaultKey has no contact forms and never asks for your passwords. Please don't send passwords to anyone — including us.">
      <div className="not-prose mt-6 grid gap-4 sm:grid-cols-2">
        {SITE.contactEmail && (
          <a href={`mailto:${SITE.contactEmail}`} className="card block p-5 no-underline hover:border-primary/40">
            <IconInfo size={20} className="text-primary" />
            <p className="mt-3 font-semibold text-ink">General questions</p>
            <p className="mt-1 text-sm text-muted">{SITE.contactEmail}</p>
          </a>
        )}
        {SITE.securityEmail && (
          <a href={`mailto:${SITE.securityEmail}`} className="card block p-5 no-underline hover:border-primary/40">
            <IconAlert size={20} className="text-primary" />
            <p className="mt-3 font-semibold text-ink">Security reports</p>
            <p className="mt-1 text-sm text-muted">{SITE.securityEmail}</p>
          </a>
        )}
        {SITE.repositoryUrl && (
          <a href={SITE.repositoryUrl} rel="noopener noreferrer" target="_blank" className="card block p-5 no-underline hover:border-primary/40">
            <IconGithub size={20} className="text-primary" />
            <p className="mt-3 font-semibold text-ink">Source code & issues</p>
            <p className="mt-1 break-all text-sm text-muted">{SITE.repositoryUrl}</p>
          </a>
        )}
      </div>
      {!hasAny && (
        <p>
          The operator of this VaultKey deployment hasn't published contact details yet. VaultKey is open-source software released under the MIT License; bug
          reports and feature requests are best raised with the project's maintainers through its source repository.
        </p>
      )}
      <h2>Reporting a security issue</h2>
      <p>
        Please report suspected vulnerabilities privately{SITE.securityEmail ? ' using the security address above' : ''}, include steps to reproduce, and allow
        reasonable time for a fix before disclosing publicly. Never include real passwords in a report. You can read how VaultKey works on the{' '}
        <Link to="/security">security page</Link>.
      </p>
    </DocPage>
  );
}
