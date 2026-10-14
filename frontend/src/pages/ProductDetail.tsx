import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api/client';
import type { Specification } from '../api/types';
import { isNotFound, useApi } from '../hooks/useApi';
import { useDocumentMeta } from '../hooks/useDocumentMeta';
import { ClothViewer } from '../components/ClothViewer';
import { GLImage } from '../components/GLImage';
import { ProductCard } from '../components/ProductCard';
import { RequestForm } from '../components/forms';
import { ErrorState, Loading, NotFoundBlock, Swatch } from '../components/ui';
import { price } from '../lib/format';

function groupSpecs(specs: Specification[]) {
  const groups = new Map<string, Specification[]>();
  for (const s of specs) groups.set(s.group, [...(groups.get(s.group) ?? []), s]);
  return [...groups.entries()];
}

export default function ProductDetail() {
  const { slug = '' } = useParams();
  const { data: p, error, loading } = useApi((s) => api.product(slug, s), [slug]);
  const related = useApi((s) => (p ? api.products({ category: p.categorySlug, pageSize: 4 }, s) : Promise.resolve(undefined)), [p?.categorySlug]);

  const [color, setColor] = useState<string>();
  const [size, setSize] = useState<string>();
  const [photo, setPhoto] = useState<string>();
  const [reserving, setReserving] = useState(false);

  // Reset choices when moving to another product.
  useEffect(() => {
    setColor(p?.colors[0]?.name);
    setSize(undefined);
    setPhoto(undefined);
    setReserving(false);
  }, [p?.slug, p?.colors]);

  // Photos for the chosen colour, plus the ones that show any colour (details, flat lays).
  const photos = useMemo(() => {
    const images = p?.media.filter((m) => m.type === 'Image') ?? [];
    const forColor = images.filter((m) => m.colorName === color);
    const neutral = images.filter((m) => !m.colorName);
    const list = [...forColor, ...neutral];
    return list.length ? list : images;
  }, [p, color]);

  const shown = photo && photos.some((m) => m.url === photo) ? photo : photos[0]?.url;
  const shownAlt = photos.find((m) => m.url === shown)?.altText ?? p?.name ?? '';
  const stock = (s: string) => p?.variants.find((v) => v.colorName === color && v.size === s)?.inStock ?? false;

  useDocumentMeta({
    title: p?.metaTitle ?? p?.name,
    description: p?.metaDescription ?? p?.summary,
    path: `/shop/${slug}`,
    jsonLd: p && {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: p.name,
      description: p.summary,
      sku: p.styleCode ?? undefined,
      image: p.media.filter((m) => m.type === 'Image').map((m) => m.url),
      brand: { '@type': 'Brand', name: 'VAELO Atelier' },
      offers: {
        '@type': 'Offer',
        price: p.price,
        priceCurrency: p.currency,
        availability: p.variants.some((v) => v.inStock) ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      },
    },
  });

  if (loading && !p) return <div className="pt-32"><Loading label="Loading the piece" /></div>;
  if (isNotFound(error)) return <NotFoundBlock what="piece" back="/shop" backLabel="Back to the collection" />;
  if (error || !p) return <div className="pt-32"><ErrorState error={error ?? new Error('No data')} retry={() => window.location.reload()} /></div>;

  return (
    <article>
      <div className="shell grid gap-10 pt-24 md:pt-28 lg:grid-cols-12 lg:gap-14">
        {/* Garment */}
        <div className="lg:col-span-7">
          <ClothViewer src={shown} alt={shownAlt} />
          {photos.length > 1 && (
            <ul className="mt-5 grid grid-cols-4 gap-3" aria-label="More photos">
              {photos.map((m) => (
                <li key={m.url}>
                  <button
                    type="button"
                    onClick={() => setPhoto(m.url)}
                    aria-pressed={m.url === shown}
                    aria-label={`Show photo: ${m.altText}`}
                    className={`block w-full outline-offset-2 transition-opacity ${m.url === shown ? 'opacity-100 ring-1 ring-ink' : 'opacity-70 hover:opacity-100'}`}
                  >
                    <GLImage src={m.url} alt="" ratio="4 / 5" parallax={false} sizes="12vw" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Buying column */}
        <div className="lg:col-span-5 lg:sticky lg:top-28 lg:self-start">
          <nav aria-label="Breadcrumb" className="t-small">
            <Link to="/shop" className="link-thread">Collection</Link>
            <span aria-hidden="true"> / </span>
            <Link to={`/shop?category=${p.categorySlug}`} className="link-thread">{p.categoryName}</Link>
          </nav>
          <h1 className="t-h1 mt-5 !text-[clamp(2.2rem,4vw,3.6rem)]">{p.name}</h1>
          <p className="t-price mt-3 text-xl">{price(p.price, p.currency)}</p>
          <p className="t-lead mt-6">{p.summary}</p>

          {/* Colour */}
          <fieldset className="mt-9">
            <legend className="t-small">
              Colour: <span className="text-ink">{color}</span>
            </legend>
            <div className="mt-3 flex flex-wrap gap-2">
              {p.colors.map((c) => (
                <button
                  key={c.name}
                  type="button"
                  aria-pressed={c.name === color}
                  onClick={() => {
                    setColor(c.name);
                    setPhoto(undefined);
                  }}
                  className="chip"
                >
                  <Swatch hex={c.hex} />
                  {c.name}
                </button>
              ))}
            </div>
          </fieldset>

          {/* Size */}
          <fieldset className="mt-7">
            <legend className="t-small">Size{size && <span className="text-ink">: {size}</span>}</legend>
            <div className="mt-3 flex flex-wrap gap-2">
              {p.sizes.map((s) => {
                const available = stock(s);
                return (
                  <button
                    key={s}
                    type="button"
                    disabled={!available}
                    aria-pressed={s === size}
                    onClick={() => setSize(s)}
                    className="chip min-w-[52px] justify-center disabled:cursor-not-allowed disabled:text-graphite/60 disabled:line-through"
                    aria-label={available ? `Size ${s}` : `Size ${s}, sold out in ${color}`}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
            {p.sizes.some((s) => !stock(s)) && (
              <p className="t-small mt-3">
                Crossed-out sizes are sold out in this colour.{' '}
                <Link to={`/contact?type=MadeToMeasure&product=${p.slug}`} className="link-thread text-cobalt">
                  Ask for made-to-measure
                </Link>
              </p>
            )}
          </fieldset>

          <div className="mt-9 flex flex-wrap gap-3">
            <button type="button" className="btn btn-primary" disabled={!size} onClick={() => setReserving(true)} aria-expanded={reserving}>
              {size ? 'Reserve to try on' : 'Choose a size to reserve'}
            </button>
            <Link to={`/contact?type=MadeToMeasure&product=${p.slug}`} className="btn btn-quiet">
              Made-to-measure
            </Link>
          </div>
          <p className="t-small mt-4">Reserved pieces are held at the atelier for seven days. Free repairs for life.</p>

          {reserving && size && (
            <div className="mt-10">
              <RequestForm type="Reservation" fixed={{ productSlug: p.slug, productName: p.name, color, size }} />
            </div>
          )}
        </div>
      </div>

      {/* Story + details */}
      <section className="shell mt-28 grid gap-14 md:grid-cols-12" aria-labelledby="details-title">
        <div className="md:col-span-6">
          <h2 id="details-title" className="t-h2">
            How it's made
          </h2>
          <p className="t-lead mt-6">{p.description}</p>
          <ul className="mt-10 space-y-8">
            {p.features.map((f) => (
              <li key={f.title} className="border-t border-seam pt-5">
                <h3 className="t-h3">{f.title}</h3>
                <p className="t-body mt-2">{f.description}</p>
              </li>
            ))}
          </ul>
        </div>
        <div className="md:col-span-5 md:col-start-8">
          {groupSpecs(p.specifications).map(([group, rows]) => (
            <table key={group} className="mb-10 w-full border-collapse text-left">
              <caption className="t-small pb-2 text-left">{group}</caption>
              <tbody>
                {rows.map((s) => (
                  <tr key={s.label} className="border-t border-seam last:border-b">
                    <th scope="row" className="py-3.5 pr-6 font-normal text-graphite">{s.label}</th>
                    <td className="py-3.5 text-right">
                      {s.value}
                      {s.unit && <span className="ml-1 text-graphite">{s.unit}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ))}
          {p.styleCode && <p className="t-small">Style code {p.styleCode}</p>}
          {p.lookbooks.length > 0 && (
            <p className="t-small mt-6">
              Seen in{' '}
              {p.lookbooks.map((l, i) => (
                <span key={l.slug}>
                  {i > 0 && ', '}
                  <Link to={`/lookbooks/${l.slug}`} className="link-thread text-ink">
                    {l.title}
                  </Link>
                </span>
              ))}
            </p>
          )}
        </div>
      </section>

      {/* Related */}
      {related.data && related.data.items.filter((r) => r.slug !== p.slug).length > 0 && (
        <section className="shell mt-28" aria-labelledby="related-title">
          <h2 id="related-title" className="t-h2">
            Also in {p.categoryName.toLowerCase()}
          </h2>
          <ul className="mt-10 grid grid-cols-2 gap-x-4 gap-y-12 md:grid-cols-3 md:gap-x-8">
            {related.data.items
              .filter((r) => r.slug !== p.slug)
              .slice(0, 3)
              .map((r) => (
                <li key={r.id}>
                  <ProductCard product={r} />
                </li>
              ))}
          </ul>
        </section>
      )}
    </article>
  );
}
