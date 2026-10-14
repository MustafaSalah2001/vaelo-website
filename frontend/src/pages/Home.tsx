import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import type { ProductSummary } from '../api/types';
import { useApi } from '../hooks/useApi';
import { useDocumentMeta } from '../hooks/useDocumentMeta';
import { useGLElement } from '../gl/GLProvider';
import { GLImage } from '../components/GLImage';
import { ProductCard } from '../components/ProductCard';
import { img, price } from '../lib/format';

/** The season's pieces on a curved rail; scrolling turns the rail. */
function RailHero({ products, headline, tagline }: { products: ProductSummary[]; headline: string; tagline: string }) {
  const section = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const srcs = useMemo(() => products.filter((p) => p.imageUrl).map((p) => img(p.imageUrl, 760)), [products]);
  const { ready, enabled, item } = useGLElement('rail', stage, { srcs, section });
  const [active, setActive] = useState(0);

  // The canvas works out which garment is at the front; mirror it in the captions.
  useEffect(() => {
    if (!enabled) return;
    let raf = 0;
    const loop = () => {
      const i = item.current?.out.activeIndex ?? 0;
      setActive((prev) => (prev === i ? prev : i));
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [enabled, item]);

  const current = products[Math.min(active, products.length - 1)];

  if (!enabled) {
    // Reduced motion or no WebGL: the same pieces as a plain, scrollable row.
    return (
      <section aria-labelledby="hero-title" className="pt-32 md:pt-40">
        <div className="shell">
          <h1 id="hero-title" className="t-display max-w-[11ch]">
            {headline}
          </h1>
          <p className="t-lead mt-6 text-graphite">{tagline}</p>
        </div>
        <ul className="shell mt-14 grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-4">
          {products.slice(0, 4).map((p) => (
            <li key={p.id}>
              <ProductCard product={p} sizes="(min-width: 768px) 25vw, 50vw" />
            </li>
          ))}
        </ul>
      </section>
    );
  }

  return (
    <section ref={section} aria-labelledby="hero-title" className="relative" style={{ height: `${Math.max(products.length, 3) * 55 + 100}svh` }}>
      <div className="sticky top-0 h-[100svh] overflow-hidden">
        <div ref={stage} className="absolute inset-0" aria-hidden="true" />

        {!ready && (
          <div className="absolute inset-x-0 bottom-1/2 flex justify-center" role="status">
            <span className="sr-only">Loading the rail</span>
            <div className="h-px w-40 overflow-hidden bg-seam">
              <div className="h-px w-1/3 animate-[thread-run_1.1s_ease-in-out_infinite] bg-cobalt" />
            </div>
          </div>
        )}

        <div className="pointer-events-none relative flex h-full flex-col justify-between pt-24 pb-8 md:pt-28 md:pb-12">
          <div className="shell">
            <h1 id="hero-title" className="t-display max-w-[11ch] !text-[clamp(2.5rem,6vw,5.6rem)]">
              {headline}
            </h1>
            <p className="t-lead mt-5 max-w-[22em] text-graphite">{tagline}</p>
          </div>

          {current && (
            <div className="shell pointer-events-auto flex flex-wrap items-end justify-between gap-6">
              <div aria-live="polite">
                <p className="t-small tabular-nums">
                  {String(active + 1).padStart(2, '0')} / {String(products.length).padStart(2, '0')} on the rail
                </p>
                <p className="mt-1 font-display text-2xl md:text-3xl">{current.name}</p>
                <p className="t-price mt-1 text-graphite">{price(current.price, current.currency)}</p>
              </div>
              <div className="flex flex-col items-end gap-3">
                <Link to={`/shop/${current.slug}`} className="btn btn-primary">
                  See this piece
                </Link>
                <p className="t-small hidden md:block">Scroll to turn the rail</p>
              </div>
              <div className="h-px w-full bg-seam" aria-hidden="true">
                <div
                  className="h-px bg-ink transition-[width] duration-500"
                  style={{ width: `${((active + 1) / Math.max(products.length, 1)) * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  const company = useApi((s) => api.company(s), []);
  const featured = useApi((s) => api.products({ featured: true, pageSize: 10 }, s), []);
  const all = useApi((s) => api.products({ pageSize: 48 }, s), []);
  const lookbooks = useApi((s) => api.lookbooks(true, s), []);
  const services = useApi((s) => api.services(s), []);
  const categories = useApi((s) => api.categories(s), []);
  const settings = useApi((s) => api.settings(s), []);
  const c = company.data;
  const lookbook = lookbooks.data?.[0];
  const lookbookDetail = useApi((s) => (lookbook ? api.lookbook(lookbook.slug, s) : Promise.resolve(undefined)), [lookbook?.slug]);
  const repairs = services.data?.find((s) => s.slug === 'repairs-for-life') ?? services.data?.[0];

  useDocumentMeta({
    description: c?.introduction,
    path: '/',
    jsonLd: c && {
      '@context': 'https://schema.org',
      '@type': 'ClothingStore',
      name: c.name,
      description: c.tagline,
      email: c.contact.email ?? undefined,
      telephone: c.contact.phone ?? undefined,
      foundingDate: c.foundedYear ? String(c.foundedYear) : undefined,
    },
  });

  // One photo per kind of garment, taken from the first product in each category.
  const byCategory = useMemo(() => {
    const items = all.data?.items ?? [];
    return (categories.data ?? [])
      .map((cat) => ({ cat, product: items.find((p) => p.categorySlug === cat.slug && p.imageUrl) }))
      .filter((x) => x.product);
  }, [all.data, categories.data]);

  return (
    <>
      {featured.data && c ? (
        <RailHero products={featured.data.items} headline={c.headline} tagline={c.tagline} />
      ) : (
        <div className="h-[100svh]" aria-busy="true" />
      )}

      {/* Introduction */}
      <section className="shell grid gap-12 pt-28 md:grid-cols-12 md:pt-40" aria-labelledby="intro-title">
        <h2 id="intro-title" className="t-h1 md:col-span-7">
          Fewer pieces, made to be mended.
        </h2>
        <div className="md:col-span-5 md:pt-3">
          <p className="t-lead">{c?.introduction}</p>
          <Link to="/atelier" className="link-thread mt-6 inline-block text-cobalt">
            How the atelier works
          </Link>
        </div>
        {c && c.metrics.length > 0 && (
          <dl className="grid grid-cols-2 gap-x-8 gap-y-8 border-t border-ink pt-8 md:col-span-12 md:grid-cols-4">
            {c.metrics.map((m) => (
              <div key={m.label}>
                <dd className="font-display text-[clamp(2.4rem,4.4vw,3.6rem)] leading-none tabular-nums">
                  {m.value}
                  {m.suffix}
                </dd>
                <dt className="t-small mt-2">{m.label}</dt>
              </div>
            ))}
          </dl>
        )}
      </section>

      {/* Latest lookbook */}
      {lookbook && lookbookDetail.data && (
        <section className="shell pt-32 md:pt-44" aria-labelledby="lookbook-title">
          <div className="grid gap-6 md:grid-cols-12 md:gap-8">
            <Link to={`/lookbooks/${lookbook.slug}`} className="md:col-span-7">
              <GLImage src={lookbookDetail.data.media[0]?.url} alt={lookbookDetail.data.media[0]?.altText ?? ''} ratio="4 / 5" sizes="(min-width: 768px) 58vw, 100vw" />
            </Link>
            <div className="flex flex-col justify-between gap-10 md:col-span-5">
              <div>
                <p className="t-small">{lookbook.season}</p>
                <h2 id="lookbook-title" className="t-h1 mt-3">
                  {lookbook.title}
                </h2>
                <p className="t-lead mt-5 text-graphite">{lookbook.summary}</p>
                <Link to={`/lookbooks/${lookbook.slug}`} className="btn btn-quiet mt-8">
                  Open the lookbook
                </Link>
              </div>
              {lookbookDetail.data.media[1] && (
                <GLImage
                  src={lookbookDetail.data.media[1].url}
                  alt={lookbookDetail.data.media[1].altText}
                  ratio="1 / 1"
                  className="w-3/4 self-end"
                  sizes="(min-width: 768px) 30vw, 75vw"
                />
              )}
            </div>
          </div>
        </section>
      )}

      {/* Shop by kind */}
      {byCategory.length > 0 && (
        <section className="pt-32 md:pt-44" aria-labelledby="kinds-title">
          <div className="shell flex flex-wrap items-end justify-between gap-6">
            <h2 id="kinds-title" className="t-h2">
              Shop by kind
            </h2>
            <Link to="/shop" className="link-thread">
              All pieces
            </Link>
          </div>
          <ul className="shell mt-10 grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 lg:grid-cols-6">
            {byCategory.map(({ cat, product }) => (
              <li key={cat.slug}>
                <Link to={`/shop?category=${cat.slug}`} className="group block">
                  <GLImage src={product!.imageUrl} alt="" ratio="3 / 4" sizes="(min-width: 1024px) 16vw, 50vw" />
                  <p className="t-h3 mt-3 group-hover:text-cobalt">{cat.name}</p>
                  <p className="t-small">{cat.productCount} pieces</p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Repairs promise */}
      {repairs && (
        <section className="shell grid gap-10 pt-32 md:grid-cols-12 md:items-center md:pt-44" aria-labelledby="repairs-title">
          <div className="md:col-span-5 md:col-start-2">
            <h2 id="repairs-title" className="t-h1">
              We repair what we make. Forever, for free.
            </h2>
            <p className="t-lead mt-6 text-graphite">{repairs.summary}</p>
            <Link to={`/services/${repairs.slug}`} className="btn btn-primary mt-8">
              How repairs work
            </Link>
          </div>
          <div className="md:col-span-5 md:col-start-8">
            <GLImage src={repairs.imageUrl} alt={repairs.imageAlt ?? ''} ratio="4 / 5" sizes="(min-width: 768px) 40vw, 100vw" />
          </div>
        </section>
      )}

      {/* Visit */}
      {settings.data?.['site.storeImage'] && (
        <section className="shell pt-32 md:pt-44" aria-labelledby="visit-title">
          <GLImage src={settings.data['site.storeImage']} alt={settings.data['site.storeImageAlt'] ?? ''} ratio="21 / 9" sizes="100vw" />
          <div className="mt-8 flex flex-wrap items-end justify-between gap-6">
            <h2 id="visit-title" className="t-h2 max-w-[18ch]">
              Try everything on at the atelier, where it was made.
            </h2>
            <Link to="/contact" className="btn btn-quiet">
              Plan a visit
            </Link>
          </div>
        </section>
      )}
    </>
  );
}
