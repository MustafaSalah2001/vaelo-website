import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ApiError } from '../api/client';

export function PageHeader({ title, intro, children }: { title: string; intro?: string; children?: ReactNode }) {
  return (
    <header className="shell pt-32 pb-12 md:pt-44 md:pb-16">
      <h1 className="t-h1 max-w-[14ch]">{title}</h1>
      {intro && <p className="t-lead mt-6 text-graphite">{intro}</p>}
      {children}
    </header>
  );
}

export function Loading({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="shell py-24" role="status" aria-live="polite">
      <div className="h-px w-40 overflow-hidden bg-seam">
        <div className="h-px w-1/3 animate-[thread-run_1.1s_ease-in-out_infinite] bg-cobalt" />
      </div>
      <p className="t-small mt-4">{label}…</p>
    </div>
  );
}

export function ErrorState({ error, retry }: { error: Error; retry?: () => void }) {
  const status = error instanceof ApiError ? error.status : undefined;
  return (
    <div className="shell py-24" role="alert">
      <h2 className="t-h3">This page didn't load</h2>
      <p className="t-body mt-3">
        {status ? `The server answered with status ${status}. ` : 'The server could not be reached. '}
        Check your connection and try again.
      </p>
      {retry && (
        <button type="button" onClick={retry} className="btn btn-quiet mt-6">
          Try again
        </button>
      )}
    </div>
  );
}

export function NotFoundBlock({ what = 'page', back = '/', backLabel = 'Go to the home page' }: { what?: string; back?: string; backLabel?: string }) {
  return (
    <section className="shell pt-40 pb-24">
      <p className="font-display text-[6rem] leading-none text-seam">404</p>
      <h1 className="t-h2 mt-6">We couldn't find that {what}</h1>
      <p className="t-body mt-4">It may have sold out for good, or the link has changed.</p>
      <Link to={back} className="btn btn-quiet mt-8">
        {backLabel}
      </Link>
    </section>
  );
}

export function Swatch({ hex, label, size = 14 }: { hex: string; label?: string; size?: number }) {
  return (
    <span
      className="inline-block shrink-0 rounded-full ring-1 ring-ink/15"
      style={{ background: hex, width: size, height: size }}
      title={label}
      aria-hidden={label ? undefined : true}
    />
  );
}
