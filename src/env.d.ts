/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly PUBLIC_SITE_URL?: string;
  readonly PUBLIC_SITE_DOMAIN?: string;
  readonly PUBLIC_SITE_NAME?: string;
  readonly PUBLIC_SITE_SHORT_NAME?: string;
  readonly PUBLIC_SITE_TAGLINE?: string;
  readonly PUBLIC_SITE_DESCRIPTION?: string;
  readonly PUBLIC_SITE_KEYWORDS?: string;
  readonly PUBLIC_SITE_AUTHOR?: string;
  readonly PUBLIC_SITE_LOCALE?: string;
  readonly PUBLIC_SITE_CONTACT_EMAIL?: string;
  readonly PUBLIC_SITE_GITHUB_REPO?: string;
  readonly PUBLIC_SITE_JURISDICTION?: string;
  readonly PUBLIC_GA_MEASUREMENT_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
