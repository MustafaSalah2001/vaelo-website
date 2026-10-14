/** Unsplash (imgix) URLs accept sizing parameters; anything else is returned untouched. */
export function img(url: string | null | undefined, width = 1200): string {
  if (!url) return '';
  try {
    const u = new URL(url, window.location.origin);
    if (u.hostname === 'images.unsplash.com') {
      u.searchParams.set('auto', 'format');
      u.searchParams.set('fit', 'crop');
      u.searchParams.set('w', String(width));
      u.searchParams.set('q', '78');
    }
    return u.toString();
  } catch {
    return url;
  }
}

export function srcSet(url: string | null | undefined, widths = [480, 800, 1200, 1600]): string | undefined {
  if (!url || !url.includes('images.unsplash.com')) return undefined;
  return widths.map((w) => `${img(url, w)} ${w}w`).join(', ');
}

/** Picks a texture width that matches the element on screen, so GPU memory stays proportional to what is visible. */
export function textureWidth(cssWidth: number): number {
  const px = cssWidth * Math.min(window.devicePixelRatio || 1, 2);
  if (px <= 520) return 520;
  if (px <= 860) return 860;
  if (px <= 1280) return 1280;
  return 1600;
}

const formatters = new Map<string, Intl.NumberFormat>();

export function price(amount: number, currency = 'USD'): string {
  const digits = amount % 1 === 0 ? 0 : 2;
  const key = `${currency}:${digits}`;
  let f = formatters.get(key);
  if (!f) {
    f = new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: digits, maximumFractionDigits: digits });
    formatters.set(key, f);
  }
  return f.format(amount);
}
