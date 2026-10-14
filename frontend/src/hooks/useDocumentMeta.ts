import { useEffect } from 'react';

const SITE_URL = (import.meta.env.VITE_SITE_URL ?? window.location.origin).replace(/\/$/, '');
const SITE_NAME = 'VAELO Atelier';

interface Meta {
  title?: string;
  description?: string;
  /** Path for the canonical URL, e.g. "/products/aeris-t40". */
  path?: string;
  /** Structured data (schema.org) for this page. */
  jsonLd?: object;
}

function upsert<K extends 'meta' | 'link'>(tag: K, selector: string, attrs: Record<string, string>) {
  let el = document.head.querySelector<HTMLElementTagNameMap[K]>(selector);
  if (!el) {
    el = document.createElement(tag);
    document.head.appendChild(el);
  }
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
}

/** Sets title, description, canonical, Open Graph tags and JSON-LD for the current route. */
export function useDocumentMeta({ title, description, path, jsonLd }: Meta) {
  const ld = jsonLd ? JSON.stringify(jsonLd) : undefined;

  useEffect(() => {
    const fullTitle = title ? `${title} | ${SITE_NAME}` : `${SITE_NAME}: slow-made clothing`;
    document.title = fullTitle;
    if (description) {
      upsert('meta', 'meta[name="description"]', { name: 'description', content: description });
      upsert('meta', 'meta[property="og:description"]', { property: 'og:description', content: description });
    }
    upsert('meta', 'meta[property="og:title"]', { property: 'og:title', content: fullTitle });
    if (path !== undefined) {
      upsert('link', 'link[rel="canonical"]', { rel: 'canonical', href: `${SITE_URL}${path}` });
    }

    let script: HTMLScriptElement | undefined;
    if (ld) {
      script = document.createElement('script');
      script.type = 'application/ld+json';
      script.textContent = ld;
      document.head.appendChild(script);
    }
    return () => script?.remove();
  }, [title, description, path, ld]);
}
