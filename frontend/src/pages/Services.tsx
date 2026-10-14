import { Link, useParams } from 'react-router-dom';
import { api } from '../api/client';
import { isNotFound, useApi } from '../hooks/useApi';
import { useDocumentMeta } from '../hooks/useDocumentMeta';
import { GLImage } from '../components/GLImage';
import { ErrorState, Loading, NotFoundBlock, PageHeader } from '../components/ui';

const CTA: Record<string, { to: string; label: string }> = {
  'made-to-measure': { to: '/contact?type=MadeToMeasure', label: 'Request a fitting' },
  'repairs-for-life': { to: '/contact?subject=Repair', label: 'Arrange a repair' },
  'styling-appointments': { to: '/contact?subject=Wardrobe%20appointment', label: 'Book an appointment' },
  wholesale: { to: '/contact?type=Wholesale', label: 'Ask about wholesale' },
};
const ctaFor = (slug: string) => CTA[slug] ?? { to: '/contact', label: 'Get in touch' };

export function Services() {
  const { data, error, loading } = useApi((s) => api.services(s), []);
  useDocumentMeta({ title: 'Services', description: 'Made-to-measure, free repairs for life, wardrobe appointments and wholesale.', path: '/services' });

  return (
    <>
      <PageHeader title="Beyond the rail" intro="The same cutters and machines that make the collection, working on your piece." />
      {loading && !data && <Loading label="Loading services" />}
      {error && <ErrorState error={error} retry={() => window.location.reload()} />}
      <ul className="shell space-y-28 md:space-y-36">
        {data?.map((s, i) => (
          <li key={s.id} className={`grid gap-8 md:grid-cols-12 md:items-center ${i % 2 ? 'md:[direction:rtl]' : ''}`}>
            <div className="md:col-span-6 [direction:ltr]">
              <GLImage src={s.imageUrl} alt={s.imageAlt ?? ''} ratio="5 / 4" sizes="(min-width: 768px) 50vw, 100vw" />
            </div>
            <div className="md:col-span-5 md:col-start-8 [direction:ltr]">
              <h2 className="t-h1">{s.title}</h2>
              <p className="t-lead mt-5 text-graphite">{s.summary}</p>
              <ul className="mt-7 space-y-2.5">
                {s.benefits.map((b) => (
                  <li key={b} className="flex gap-3">
                    <span className="mt-[0.75em] h-px w-5 shrink-0 bg-cobalt" aria-hidden="true" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-9 flex flex-wrap gap-3">
                <Link to={ctaFor(s.slug).to} className="btn btn-primary">
                  {ctaFor(s.slug).label}
                </Link>
                <Link to={`/services/${s.slug}`} className="btn btn-quiet">
                  How it works
                </Link>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}

export function ServiceDetail() {
  const { slug = '' } = useParams();
  const { data: s, error, loading } = useApi((sig) => api.service(slug, sig), [slug]);
  useDocumentMeta({ title: s?.metaTitle ?? s?.title, description: s?.metaDescription ?? s?.summary, path: `/services/${slug}` });

  if (loading && !s) return <div className="pt-32"><Loading label="Loading" /></div>;
  if (isNotFound(error)) return <NotFoundBlock what="service" back="/services" backLabel="All services" />;
  if (error || !s) return <div className="pt-32"><ErrorState error={error ?? new Error('No data')} /></div>;

  return (
    <article>
      <PageHeader title={s.title} intro={s.summary} />
      <div className="shell grid gap-12 md:grid-cols-12">
        <div className="md:col-span-7">
          <GLImage src={s.imageUrl} alt={s.imageAlt ?? ''} ratio="4 / 3" priority sizes="(min-width: 768px) 58vw, 100vw" />
        </div>
        <div className="md:col-span-4 md:col-start-9">
          <p className="t-lead">{s.description}</p>
          <ul className="mt-8 space-y-2.5">
            {s.benefits.map((b) => (
              <li key={b} className="flex gap-3">
                <span className="mt-[0.75em] h-px w-5 shrink-0 bg-cobalt" aria-hidden="true" />
                <span>{b}</span>
              </li>
            ))}
          </ul>
          <Link to={ctaFor(s.slug).to} className="btn btn-primary mt-10">
            {ctaFor(s.slug).label}
          </Link>
        </div>
      </div>
    </article>
  );
}
