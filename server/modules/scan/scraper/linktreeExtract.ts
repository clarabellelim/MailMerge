const FALLBACK_DOMAINS = ['linktr.ee', 'beacons.ai', 'carrd.co', 'podia.com'];

function stripSchemeAndWww(url: string): string {
  return url.replace(/^https?:\/\//i, '').replace(/^www\./i, '');
}

/**
 * TikTok sometimes wraps bio links like:
 * https://www.tiktok.com/link/v2?...&target=https%3A%2F%2Flinktr.ee%2Fhungrysam
 * For the UI/Excel we prefer the bio-looking form: linktr.ee/hungrysam
 */
export function normalizeFallbackLink(rawUrl: string | null | undefined): string | null {
  if (!rawUrl) return null;
  const raw = rawUrl.trim();
  if (!raw) return null;

  // Decode TikTok redirect wrapper when present.
  try {
    const u = new URL(raw.startsWith('http') ? raw : `https://${raw}`);
    if (/tiktok\.com$/i.test(u.hostname) && u.pathname.startsWith('/link/')) {
      const target = u.searchParams.get('target');
      if (target) {
        const decoded = decodeURIComponent(target);
        return normalizeFallbackLink(decoded);
      }
    }
  } catch {
    // ignore
  }

  const compact = stripSchemeAndWww(raw);
  const domainAlternation = FALLBACK_DOMAINS.map((d) => d.replace('.', '\\.')).join('|');
  const m = compact.match(new RegExp(`^(${domainAlternation})\\/[^\\s'"]+`, 'i'));
  if (m) return compact;

  // If it's not one of our known fallback domains, keep it as absolute URL when possible.
  if (/^https?:\/\//i.test(raw)) return raw;
  return `https://${raw}`;
}

export function extractFallbackLink(text: string | null | undefined): string | null {
  if (!text) return null;

  const normalized = text.replace(/[\u2019]/g, "'");
  const domainAlternation = FALLBACK_DOMAINS.map((d) => d.replace('.', '\\.')).join('|');
  const regex = new RegExp(`(https?:\\/\\/)?(${domainAlternation})\\/[^\\s'"]+`, 'i');
  const match = normalized.match(regex);
  if (!match) return null;

  const raw = match[0];
  return normalizeFallbackLink(raw);
}

