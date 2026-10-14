import { useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import type { OrderRequestType } from '../api/types';
import { useApi } from '../hooks/useApi';
import { useDocumentMeta } from '../hooks/useDocumentMeta';
import { ContactForm, RequestForm } from '../components/forms';
import { GLImage } from '../components/GLImage';
import { PageHeader } from '../components/ui';

const TABS: { key: 'message' | OrderRequestType; label: string }[] = [
  { key: 'message', label: 'Message' },
  { key: 'MadeToMeasure', label: 'Made-to-measure' },
  { key: 'Wholesale', label: 'Wholesale' },
];

export default function Contact() {
  const [params, setParams] = useSearchParams();
  const requested = params.get('type');
  const tab = TABS.find((t) => t.key === requested)?.key ?? 'message';
  const company = useApi((s) => api.company(s), []);
  const settings = useApi((s) => api.settings(s), []);
  const products = useApi((s) => api.products({ pageSize: 48 }, s), []);
  const c = company.data?.contact;

  useDocumentMeta({ title: 'Contact', description: 'Visit the atelier, book a made-to-measure fitting or ask about wholesale.', path: '/contact' });

  const select = (key: string) => {
    const next = new URLSearchParams(params);
    if (key === 'message') next.delete('type');
    else next.set('type', key);
    setParams(next, { replace: true });
  };

  return (
    <>
      <PageHeader title="Come to the atelier" intro="Most questions are answered best in person, with the cloth in your hands. If you can't visit, write to us." />

      <div className="shell grid gap-16 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <div role="tablist" aria-label="Type of request" className="mb-10 flex flex-wrap gap-2">
            {TABS.map((t) => (
              <button
                key={t.key}
                role="tab"
                id={`tab-${t.key}`}
                aria-selected={tab === t.key}
                aria-controls={`panel-${t.key}`}
                type="button"
                onClick={() => select(t.key)}
                className="chip aria-selected:border-ink aria-selected:bg-ink aria-selected:text-stone"
              >
                {t.label}
              </button>
            ))}
          </div>
          <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
            {tab === 'message' ? (
              <ContactForm key="message" initialSubject={params.get('subject') ?? ''} />
            ) : (
              <RequestForm key={tab} type={tab} products={products.data?.items ?? []} initialProduct={params.get('product') ?? ''} />
            )}
          </div>
        </div>

        <aside className="lg:col-span-4 lg:col-start-9" aria-label="Visiting the atelier">
          {settings.data?.['site.storeImage'] && (
            <GLImage src={settings.data['site.storeImage']} alt={settings.data['site.storeImageAlt'] ?? ''} ratio="4 / 5" sizes="(min-width: 1024px) 33vw, 100vw" />
          )}
          <dl className="mt-8 space-y-6">
            {(c?.addressLine || c?.city) && (
              <div>
                <dt className="t-small">Address</dt>
                <dd className="mt-1">
                  {c?.addressLine}
                  <br />
                  {[c?.city, c?.country].filter(Boolean).join(', ')}
                </dd>
              </div>
            )}
            <div>
              <dt className="t-small">Open</dt>
              <dd className="mt-1">Tuesday to Saturday, 10:00 to 18:00</dd>
            </div>
            {c?.email && (
              <div>
                <dt className="t-small">Email</dt>
                <dd className="mt-1">
                  <a href={`mailto:${c.email}`} className="link-thread">{c.email}</a>
                </dd>
              </div>
            )}
            {c?.phone && (
              <div>
                <dt className="t-small">Phone</dt>
                <dd className="mt-1">
                  <a href={`tel:${c.phone.replace(/\s/g, '')}`} className="link-thread">{c.phone}</a>
                </dd>
              </div>
            )}
          </dl>
          {company.data?.isDemo && (
            <p className="t-small mt-8 border-t border-seam pt-5">
              Placeholder details: the email uses a reserved .example domain and the phone number is from the fictional 555 range.
            </p>
          )}
        </aside>
      </div>
    </>
  );
}
