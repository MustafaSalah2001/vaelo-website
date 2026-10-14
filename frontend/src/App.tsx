import { lazy, Suspense } from 'react';
import { BrowserRouter, HashRouter, Route, Routes, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { GLProvider } from './gl/GLProvider';
import { FirstLoad } from './components/FirstLoad';
import { Layout } from './components/Layout';
import { Loading, NotFoundBlock } from './components/ui';
import { useReducedMotion } from './hooks/useMedia';
import Home from './pages/Home';

const Shop = lazy(() => import('./pages/Shop'));
const ProductDetail = lazy(() => import('./pages/ProductDetail'));
const Lookbooks = lazy(() => import('./pages/Lookbooks').then((m) => ({ default: m.Lookbooks })));
const LookbookDetail = lazy(() => import('./pages/Lookbooks').then((m) => ({ default: m.LookbookDetail })));
const Services = lazy(() => import('./pages/Services').then((m) => ({ default: m.Services })));
const ServiceDetail = lazy(() => import('./pages/Services').then((m) => ({ default: m.ServiceDetail })));
const Atelier = lazy(() => import('./pages/Atelier'));
const Contact = lazy(() => import('./pages/Contact'));

function AnimatedRoutes() {
  const location = useLocation();
  const reduced = useReducedMotion();

  return (
    // The old page fades while its WebGL images fade with it (see useGLElement); the new page
    // starts at the top once the old one is gone.
    <AnimatePresence mode="wait" initial={false} onExitComplete={() => window.scrollTo(0, 0)}>
      <motion.div
        key={location.pathname}
        initial={reduced ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={reduced ? undefined : { opacity: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
      >
        <Suspense fallback={<div className="pt-32"><Loading /></div>}>
          <Routes location={location}>
            <Route path="/" element={<Home />} />
            <Route path="/shop" element={<Shop />} />
            <Route path="/shop/:slug" element={<ProductDetail />} />
            <Route path="/lookbooks" element={<Lookbooks />} />
            <Route path="/lookbooks/:slug" element={<LookbookDetail />} />
            <Route path="/services" element={<Services />} />
            <Route path="/services/:slug" element={<ServiceDetail />} />
            <Route path="/atelier" element={<Atelier />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="*" element={<NotFoundBlock />} />
          </Routes>
        </Suspense>
      </motion.div>
    </AnimatePresence>
  );
}

// Hash routing works on any static host (e.g. GitHub Pages) without rewrite rules.
const Router = import.meta.env.VITE_ROUTER === 'hash' ? HashRouter : BrowserRouter;

export default function App() {
  return (
    <Router>
      <GLProvider>
        <FirstLoad />
        <Layout>
          <AnimatedRoutes />
        </Layout>
      </GLProvider>
    </Router>
  );
}
