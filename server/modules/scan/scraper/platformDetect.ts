export type Platform = 'youtube' | 'instagram' | 'tiktok';

export function detectPlatformByUrl(url: string): Platform | null {
  try {
    const u = new URL(url);
    const host = u.hostname.toLowerCase();

    if (host.includes('youtube.com') || host.includes('youtu.be')) return 'youtube';
    if (host.includes('instagram.com')) return 'instagram';
    if (host.includes('tiktok.com')) return 'tiktok';
    return null;
  } catch {
    return null;
  }
}

