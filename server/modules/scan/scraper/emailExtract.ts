const EMAIL_REGEX = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;

export function extractFirstValidEmail(text: string | null | undefined): string | null {
  if (!text) return null;
  const match = text.match(EMAIL_REGEX);
  if (!match) return null;
  return match[0].trim();
}

export function extractEmailsFromMailtoHrefs(hrefs: string[]): string[] {
  const out = new Set<string>();
  for (const href of hrefs) {
    const clean = href.replace(/^mailto:/i, '').split('?')[0].trim();
    if (!clean) continue;
    if (EMAIL_REGEX.test(clean)) out.add(clean);
  }
  return [...out];
}

