import { useRef } from 'react';
import { Link } from 'react-router-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { api } from '../api/client';
import { useApi } from '../hooks/useApi';
import { useDocumentMeta } from '../hooks/useDocumentMeta';
import { useReducedMotion } from '../hooks/useMedia';
import { GLImage } from '../components/GLImage';
import { ErrorState, Loading } from '../components/ui';

gsap.registerPlugin(ScrollTrigger, useGSAP);

export default function Atelier() {
  const { data: c, error, loading } = useApi((s) => api.company(s), []);
  const { data: settings } = useApi((s) => api.settings(s), []);
  const reduced = useReducedMotion();
  const timeline = useRef<HTMLOListElement>(null);

  useDocumentMeta({ title: 'The atelier', description: c?.mission, path: '/atelier' });

  // A cobalt thread stitches down the timeline as you read it.
  useGSAP(
    () => {
      if (reduced || !timeline.current) return;
      gsap.fromTo(
        '[data-thread]',
        { scaleY: 0 },
        { scaleY: 1, ease: 'none', scrollTrigger: { trigger: timeline.current, start: 'top 75%', end: 'bottom 55%', scrub: true } },
      );
    },
    { scope: timeline, dependencies: [reduced, c?.milestones.length] },
  );

  if (loading && !c) return <div className="pt-32"><Loading /></div>;
  if (error || !c) return <div className="pt-32"><ErrorState error={error ?? new Error('No data')} /></div>;

  const photos = [1, 2, 3]
    .map((n) => ({ src: settings?.[`site.aboutImage${n}`], alt: settings?.[`site.aboutImage${n}Alt`] ?? '' }))
    .filter((p) => p.src);

  return (
    <>
      <header className="shell grid gap-10 pt-32 md:grid-cols-12 md:pt-44">
        <h1 className="t-display md:col-span-8">One room, two cutting tables, six mills.</h1>
        <p className="t-lead text-graphite md:col-span-6 md:col-start-6">{c.story}</p>
      </header>

      {photos.length > 0 && (
        <div className="shell mt-20 grid grid-cols-12 gap-x-4 gap-y-10 md:gap-x-8">
          {photos[0] && (
            <GLImage src={photos[0].src} alt={photos[0].alt} ratio="4 / 5" className="col-span-12 md:col-span-6" sizes="(min-width: 768px) 50vw, 100vw" />
          )}
          {photos[1] && (
            <GLImage src={photos[1].src} alt={photos[1].alt} ratio="3 / 4" className="col-span-8 col-start-5 md:col-span-4 md:col-start-8 md:mt-48" sizes="(min-width: 768px) 33vw, 66vw" />
          )}
          {photos[2] && (
            <GLImage src={photos[2].src} alt={photos[2].alt} ratio="16 / 9" className="col-span-12 md:col-span-7 md:col-start-3" sizes="(min-width: 768px) 58vw, 100vw" />
          )}
        </div>
      )}

      <section className="shell mt-28 grid gap-12 border-t border-ink pt-12 md:grid-cols-2" aria-label="Mission and vision">
        <div>
          <h2 className="t-small">What we are for</h2>
          <p className="t-h2 mt-4">{c.mission}</p>
        </div>
        <div>
          <h2 className="t-small">Where we are going</h2>
          <p className="t-h2 mt-4">{c.vision}</p>
        </div>
      </section>

      {c.values.length > 0 && (
        <section className="shell mt-28" aria-labelledby="values-title">
          <h2 id="values-title" className="t-h2">
            House rules
          </h2>
          <ul className="mt-10 grid gap-x-10 gap-y-6 sm:grid-cols-2">
            {c.values.map((v) => (
              <li key={v} className="border-t border-seam pt-4 font-display text-2xl">
                {v}
              </li>
            ))}
          </ul>
        </section>
      )}

      {c.milestones.length > 0 && (
        <section className="shell mt-28" aria-labelledby="history-title">
          <h2 id="history-title" className="t-h2">
            Since {c.foundedYear}
          </h2>
          <ol ref={timeline} className="relative mt-14 pl-10 md:pl-0">
            <span aria-hidden="true" className="absolute top-2 bottom-2 left-[7px] w-px bg-seam md:left-[calc(25%+7px)]" />
            <span data-thread aria-hidden="true" className="absolute top-2 bottom-2 left-[7px] w-px origin-top bg-cobalt md:left-[calc(25%+7px)]" />
            {c.milestones.map((m) => (
              <li key={m.year} className="relative grid gap-2 pb-14 md:grid-cols-4 md:gap-10">
                <p className="font-display text-3xl leading-none text-graphite tabular-nums md:pr-10 md:text-right">{m.year}</p>
                <span aria-hidden="true" className="absolute top-2 -left-10 h-[15px] w-[15px] rounded-full border-2 border-cobalt bg-stone md:left-[25%]" />
                <div className="md:col-span-3 md:pl-10">
                  <h3 className="t-h3">{m.title}</h3>
                  <p className="t-body mt-2">{m.description}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}

      <section className="shell mt-16">
        <Link to="/contact" className="btn btn-primary">
          Visit the atelier
        </Link>
      </section>
    </>
  );
}
