import { useEffect, useState, type ReactNode } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { api, dataSource } from '../api/client';
import type { Company } from '../api/types';
import { useApi } from '../hooks/useApi';

/** Wordmark: the name in Bodoni with a cobalt thread running under the A. */
export function Wordmark({ className = '' }: { className?: string }) {
  return (
    <span className={`relative inline-block font-display text-[1.6rem] leading-none tracking-[0.18em] ${className}`}>
      VAELO
      <span aria-hidden="true" className="absolute -bottom-1.5 left-[1.55em] h-[2px] w-[0.9em] bg-cobalt" />
    </span>
  );
}

const NAV = [
  { to: '/shop', label: 'Shop' },
  { to: '/lookbooks', label: 'Lookbooks' },
  { to: '/services', label: 'Services' },
  { to: '/atelier', label: 'Atelier' },
];

function Nav() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();

  useEffect(() => setOpen(false), [location.pathname]);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-[background-color,border-color] duration-300 ${
        scrolled || open ? 'border-b border-seam bg-stone/90 backdrop-blur-md' : 'border-b border-transparent'
      }`}
    >
      <nav className="shell grid h-16 grid-cols-[1fr_auto_1fr] items-center md:h-20" aria-label="Main">
        <ul className="hidden items-center gap-8 md:flex">
          {NAV.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                className={({ isActive }) => `link-thread py-1 text-[0.95rem] ${isActive ? 'text-ink' : 'text-graphite hover:text-ink'}`}
              >
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
        <button
          type="button"
          className="-ml-2 inline-flex h-11 w-11 items-center justify-center md:hidden"
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label={open ? 'Close menu' : 'Open menu'}
          onClick={() => setOpen((o) => !o)}
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
            {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M3 9h18M3 15h18" />}
          </svg>
        </button>

        <Link to="/" aria-label="VAELO Atelier home" className="justify-self-center">
          <Wordmark />
        </Link>

        <div className="flex items-center justify-end gap-6">
          <Link to="/contact" className="link-thread hidden text-[0.95rem] text-graphite hover:text-ink md:inline">
            Visit the atelier
          </Link>
        </div>
      </nav>

      <AnimatePresence>
        {open && (
          <motion.div
            id="mobile-menu"
            className="shell pb-8 md:hidden"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
          >
            <ul>
              {[...NAV, { to: '/contact', label: 'Contact' }].map((item) => (
                <li key={item.to} className="border-b border-seam">
                  <NavLink to={item.to} className="block py-4 font-display text-3xl">
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

function DemoNotice({ credit }: { credit?: string }) {
  const [offline, setOffline] = useState(dataSource.usingDemo);
  useEffect(() => dataSource.subscribe(setOffline), []);
  return (
    <p className="shell border-t border-seam py-4 text-center text-[0.8rem] text-graphite">
      VAELO Atelier is a fictional brand made for a portfolio project. Prices, stories and figures are demo content.{' '}
      {credit ?? 'Photography: Unsplash contributors, used under the Unsplash License.'}
      {offline && ' The API is offline, so you are seeing the bundled copy of the content.'}
    </p>
  );
}

function Footer({ company, credit }: { company?: Company; credit?: string }) {
  const c = company?.contact;
  return (
    <footer className="relative z-10 mt-36 border-t border-ink">
      <div className="shell grid gap-12 py-16 md:grid-cols-12">
        <div className="md:col-span-5">
          <Wordmark />
          <p className="t-body mt-6 max-w-sm">{company?.tagline}</p>
          <p className="t-small mt-2">Free repairs for life on everything we make.</p>
        </div>
        <div className="md:col-span-3">
          <h2 className="t-small mb-4">The house</h2>
          <ul className="space-y-2.5">
            {NAV.map((item) => (
              <li key={item.to}>
                <Link to={item.to} className="link-thread">
                  {item.label}
                </Link>
              </li>
            ))}
            <li>
              <Link to="/contact?type=MadeToMeasure" className="link-thread">
                Book a made-to-measure fitting
              </Link>
            </li>
          </ul>
        </div>
        <address className="not-italic md:col-span-4">
          <h2 className="t-small mb-4">Atelier</h2>
          <ul className="space-y-2.5">
            {(c?.addressLine || c?.city) && <li>{[c?.addressLine, c?.city, c?.country].filter(Boolean).join(', ')}</li>}
            {c?.email && (
              <li>
                <a href={`mailto:${c.email}`} className="link-thread">
                  {c.email}
                </a>
              </li>
            )}
            {c?.phone && (
              <li>
                <a href={`tel:${c.phone.replace(/\s/g, '')}`} className="link-thread">
                  {c.phone}
                </a>
              </li>
            )}
            <li className="text-graphite">Tuesday to Saturday, 10:00 to 18:00</li>
          </ul>
        </address>
      </div>
      <div className="shell flex flex-col gap-2 border-t border-seam py-5 text-[0.8rem] text-graphite md:flex-row md:justify-between">
        <p>
          © {new Date().getFullYear()} {company?.name ?? 'VAELO Atelier'}
        </p>
        <p>Built with ASP.NET Core, SQL Server, React and three.js</p>
      </div>
      <DemoNotice credit={credit} />
    </footer>
  );
}

export function Layout({ children }: { children: ReactNode }) {
  const { data: company } = useApi((s) => api.company(s), []);
  const { data: settings } = useApi((s) => api.settings(s), []);
  return (
    <>
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <Nav />
      {/* Content sits above the fixed WebGL canvas (z-0); its backgrounds stay transparent so the canvas shows through. */}
      <main id="main" tabIndex={-1} className="relative z-10 outline-none">
        {children}
      </main>
      <Footer company={company} credit={settings?.['site.photoCredit']} />
    </>
  );
}
