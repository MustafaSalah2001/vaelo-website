import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import type { Color, ProductSort } from '../api/types';
import { useApi } from '../hooks/useApi';
import { useDocumentMeta } from '../hooks/useDocumentMeta';
import { ProductCard } from '../components/ProductCard';
import { ErrorState, Loading, PageHeader, Swatch } from '../components/ui';

const SORTS: { value: ProductSort; label: string }[] = [
  { value: 'featured', label: 'Featured' },
  { value: 'newest', label: 'New first' },
  { value: 'price-asc', label: 'Price, low to high' },
  { value: 'price-desc', label: 'Price, high to low' },
];

export default function Shop() {
  const [params, setParams] = useSearchParams();
  const category = params.get('category') ?? '';
  const color = params.get('color') ?? '';
  const sort = (params.get('sort') as ProductSort) || 'featured';
  const urlSearch = params.get('q') ?? '';
  const [search, setSearch] = useState(urlSearch);

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: key === 'q' });
  };

  useEffect(() => {
    const id = window.setTimeout(() => {
      if (search.trim() !== urlSearch) setParam('q', search.trim());
    }, 260);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const categories = useApi((s) => api.categories(s), []);
  const everything = useApi((s) => api.products({ pageSize: 48 }, s), []);
  const products = useApi(
    (s) => api.products({ category: category || undefined, color: color || undefined, search: urlSearch || undefined, sort, pageSize: 48 }, s),
    [category, color, urlSearch, sort],
  );

  // Every colour that exists in the catalogue, once.
  const colors = useMemo(() => {
    const map = new Map<string, Color>();
    everything.data?.items.forEach((p) => p.colors.forEach((c) => map.set(c.name, c)));
    return [...map.values()];
  }, [everything.data]);

  useDocumentMeta({
    title: 'Shop',
    description: 'Coats, knitwear, shirts, jersey, denim and tailoring, cut and sewn in one atelier.',
    path: '/shop',
  });

  const count = products.data?.totalCount;

  return (
    <>
      <PageHeader title="The collection" intro="Every piece is cut in small runs and repaired for free for as long as you own it." />

      <div className="shell">
        <div className="flex flex-col gap-5 border-y border-seam py-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div role="group" aria-label="Filter by kind" className="flex flex-wrap gap-2">
              {[{ slug: '', name: 'Everything' }, ...(categories.data ?? [])].map((c) => (
                <button key={c.slug || 'all'} type="button" className="chip" aria-pressed={category === c.slug} onClick={() => setParam('category', c.slug)}>
                  {c.name}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <label className="relative block w-full sm:w-64">
                <span className="sr-only">Search the collection</span>
                <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search: linen, coat, VA-OC01" className="field" />
              </label>
              <label className="flex items-center gap-2 text-sm">
                <span className="text-graphite">Sort</span>
                <select value={sort} onChange={(e) => setParam('sort', e.target.value === 'featured' ? '' : e.target.value)} className="field !min-h-[40px] !w-auto pr-6">
                  {SORTS.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          {colors.length > 0 && (
            <div role="group" aria-label="Filter by colour" className="flex flex-wrap items-center gap-2">
              <span className="t-small mr-2">Colour</span>
              {colors.map((c) => (
                <button
                  key={c.name}
                  type="button"
                  className="chip !min-h-[34px] !px-3"
                  aria-pressed={color.toLowerCase() === c.name.toLowerCase()}
                  onClick={() => setParam('color', color.toLowerCase() === c.name.toLowerCase() ? '' : c.name)}
                >
                  <Swatch hex={c.hex} size={12} />
                  {c.name}
                </button>
              ))}
            </div>
          )}
        </div>

        <p className="t-small mt-6" aria-live="polite">
          {count === undefined ? '' : count === 1 ? '1 piece' : `${count} pieces`}
        </p>
      </div>

      {products.loading && !products.data && <Loading label="Loading the collection" />}
      {products.error && <ErrorState error={products.error} retry={() => window.location.reload()} />}

      {products.data && products.data.items.length === 0 && (
        <div className="shell py-20">
          <h2 className="t-h3">Nothing matches those filters</h2>
          <p className="t-body mt-2">Try another colour or word, or clear the filters to see every piece.</p>
          <button
            type="button"
            className="btn btn-quiet mt-6"
            onClick={() => {
              setSearch('');
              setParams(new URLSearchParams());
            }}
          >
            Clear filters
          </button>
        </div>
      )}

      {products.data && products.data.items.length > 0 && (
        <ul className="shell mt-6 grid grid-cols-2 gap-x-4 gap-y-14 md:grid-cols-3 md:gap-x-8">
          {products.data.items.map((p, i) => (
            // Every fifth piece runs larger, which breaks the grid into an editorial rhythm.
            <li key={p.id} className={i % 5 === 3 ? 'col-span-2 md:col-span-1 md:row-span-1' : ''}>
              <ProductCard product={p} sizes="(min-width: 768px) 30vw, 50vw" />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
