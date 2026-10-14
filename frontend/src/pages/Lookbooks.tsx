import { useMemo, useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api/client';
import { isNotFound, useApi } from '../hooks/useApi';
import { useDocumentMeta } from '../hooks/useDocumentMeta';
import { useGLElement } from '../gl/GLProvider';
import { GLImage } from '../components/GLImage';
import { ProductCard } from '../components/ProductCard';
import { ErrorState, Loading, NotFoundBlock } from '../components/ui';
import { img } from '../lib/format';

/** Every campaign photo on one turning ring. Drag to spin it. */
function PhotoRing({ urls }: { urls: string[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const srcs = useMemo(() => urls.map((u) => img(u, 640)), [urls]);
  const { enabled, ready } = useGLElement('ring', ref, { srcs, drag: true });
  if (!enabled) return null;
  return (
    <div className="relative">
      <div ref={ref} className="h-[62svh] min-h-[420px] w-full cursor-grab touch-pan-y select-none active:cursor-grabbing" aria-hidden="true" />
      <p className="t-small shell -mt-6">{ready ? 'Drag the ring to spin it.' : 'Loading photographs…'}</p>
    </div>
  );
}

export function Lookbooks() {
  const { data, error, loading } = useApi((s) => api.lookbooks(undefined, s), []);
  const details = useApi(
    (s) => (data ? Promise.all(data.map((l) => api.lookbook(l.slug, s))) : Promise.resolve([])),
    [data?.map((l) => l.slug).join()],
  );
  const ringUrls = useMemo(() => (details.data ?? []).flatMap((l) => l.media.map((m) => m.url)).slice(0, 16), [details.data]);

  useDocumentMeta({ title: 'Lookbooks', description: 'Seasonal stories from the atelier, told in photographs.', path: '/lookbooks' });

  return (
    <>
      <header className="shell pt-32 md:pt-44">
        <h1 className="t-display max-w-[10ch]">Seasons, worn in.</h1>
        <p className="t-lead mt-6 text-graphite">Each season is photographed on people wearing the pieces for a while first.</p>
      </header>

      {ringUrls.length > 0 && <PhotoRing urls={ringUrls} />}

      {loading && !data && <Loading label="Loading lookbooks" />}
      {error && <ErrorState error={error} retry={() => window.location.reload()} />}

      <ul className="shell mt-16 space-y-28 md:mt-24 md:space-y-40">
        {data?.map((l, i) => (
          <li key={l.id}>
            <Link to={`/lookbooks/${l.slug}`} className={`group grid gap-8 md:grid-cols-12 md:items-end ${i % 2 ? 'md:[direction:rtl]' : ''}`}>
              <div className="md:col-span-7 [direction:ltr]">
                <GLImage src={l.coverUrl} alt={l.coverAlt ?? l.title} ratio="5 / 4" sizes="(min-width: 768px) 58vw, 100vw" />
              </div>
              <div className="md:col-span-5 [direction:ltr]">
                <p className="t-small">
                  {l.season}
                  {l.location && `, ${l.location}`}
                </p>
                <h2 className="t-h1 mt-3 group-hover:text-cobalt">{l.title}</h2>
                <p className="t-lead mt-4 text-graphite">{l.summary}</p>
                <p className="t-small mt-6">{l.imageCount} photographs</p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}

export function LookbookDetail() {
  const { slug = '' } = useParams();
  const { data: l, error, loading } = useApi((s) => api.lookbook(slug, s), [slug]);

  useDocumentMeta({ title: l?.metaTitle ?? l?.title, description: l?.metaDescription ?? l?.summary, path: `/lookbooks/${slug}` });

  if (loading && !l) return <div className="pt-32"><Loading label="Loading the lookbook" /></div>;
  if (isNotFound(error)) return <NotFoundBlock what="lookbook" back="/lookbooks" backLabel="All lookbooks" />;
  if (error || !l) return <div className="pt-32"><ErrorState error={error ?? new Error('No data')} /></div>;

  const [first, ...rest] = l.media;

  return (
    <article>
      <header className="shell grid gap-8 pt-28 md:grid-cols-12 md:pt-36">
        <div className="md:col-span-5 md:pt-10">
          <p className="t-small">
            {l.season}
            {l.location && `, ${l.location}`}
          </p>
          <h1 className="t-display mt-4">{l.title}</h1>
          <p className="t-lead mt-6">{l.story}</p>
          {l.credits && <p className="t-small mt-6">{l.credits}</p>}
        </div>
        {first && (
          <div className="md:col-span-6 md:col-start-7">
            <GLImage src={first.url} alt={first.altText} ratio="4 / 5" priority sizes="(min-width: 768px) 50vw, 100vw" />
          </div>
        )}
      </header>

      {/* Editorial spread: alternating sizes and offsets so the page reads like a printed lookbook. */}
      <div className="shell mt-24 grid grid-cols-12 gap-x-4 gap-y-20 md:gap-x-8 md:gap-y-32">
        {rest.map((m, i) => {
          const layouts = [
            'col-span-12 md:col-span-5 md:col-start-2',
            'col-span-10 col-start-3 md:col-span-4 md:col-start-8 md:mt-40',
            'col-span-12 md:col-span-8 md:col-start-3',
            'col-span-9 md:col-span-4 md:col-start-1',
            'col-span-10 col-start-3 md:col-span-5 md:col-start-7 md:-mt-24',
          ];
          const ratio = i % 3 === 2 ? '3 / 2' : '4 / 5';
          return (
            <figure key={m.url} className={layouts[i % layouts.length]}>
              <GLImage src={m.url} alt={m.altText} ratio={ratio} sizes="(min-width: 768px) 50vw, 100vw" />
              {m.caption && <figcaption className="t-small mt-2">{m.caption}</figcaption>}
            </figure>
          );
        })}
      </div>

      {l.products.length > 0 && (
        <section className="shell mt-32" aria-labelledby="shop-look">
          <h2 id="shop-look" className="t-h2">
            Shop the look
          </h2>
          <ul className="mt-10 grid grid-cols-2 gap-x-4 gap-y-12 md:grid-cols-4 md:gap-x-8">
            {l.products.map((p) => (
              <li key={p.id}>
                <ProductCard product={p} sizes="(min-width: 768px) 25vw, 50vw" />
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}
