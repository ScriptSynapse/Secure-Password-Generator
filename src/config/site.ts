/**
 * Deployment-specific details. Fill these in for your deployment; anything left
 * empty is simply not shown (VaultKey never displays placeholder contact details).
 */
export const SITE = {
  name: 'VaultKey',
  tagline: 'Your passwords. Your privacy. Your control.',
  /** Public source repository, e.g. "https://github.com/your-org/vaultkey". */
  repositoryUrl: '',
  /** Contact address for general questions, e.g. "hello@your-domain.com". */
  contactEmail: '',
  /** Address for security reports, e.g. "security@your-domain.com". */
  securityEmail: '',
  /** Legal entity or person operating this deployment, shown in Terms/Privacy. */
  operator: 'the operator of this website',
  legalUpdated: '6 November 2026',
} as const;
