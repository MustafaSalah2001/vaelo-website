// Offline demo data source. Builds API-shaped objects from the same JSON the backend seeds,
// so the static portfolio build looks identical to the full-stack one.
import raw from '../content/demo-content.json';
import type {
  Color,
  Company,
  LookbookDetail,
  LookbookSummary,
  PagedResult,
  ProductCategory,
  ProductDetail,
  ProductQuery,
  ProductSummary,
  ServiceDetail,
  ServiceSummary,
  Variant,
} from './types';

const data = raw as typeof raw;
type RawProduct = (typeof data.products)[number];

const SIZE_ORDER = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'];
const sizeRank = (s: string) => {
  const i = SIZE_ORDER.indexOf(s.toUpperCase());
  if (i >= 0) return i;
  const n = Number(s);
  return Number.isFinite(n) ? 100 + n : 1000;
};

/** Same deterministic stock rule as DbSeeder.BuildVariants, so sold-out sizes match the API. */
function variants(p: RawProduct, productIndex: number): Variant[] {
  const out: Variant[] = [];
  p.colors.forEach((c, ci) => {
    const code = c.name.replace(/[^a-z]/gi, '').slice(0, 3).toUpperCase();
    p.sizes.forEach((size, si) => {
      const stock = (productIndex * 5 + ci * 3 + si * 2) % 7 === 0 ? 0 : 2 + ((productIndex + ci + si) % 9);
      out.push({ colorName: c.name, size, sku: `${p.styleCode}-${code}-${size}`.toUpperCase(), inStock: stock > 0 });
    });
  });
  return out;
}

const categories: ProductCategory[] = data.categories.map((c, i) => ({
  id: i + 1,
  name: c.name,
  slug: c.slug,
  description: c.description,
  productCount: data.products.filter((p) => p.categorySlug === c.slug).length,
}));

const categoryName = (slug: string) => categories.find((c) => c.slug === slug)?.name ?? slug;

function summary(p: RawProduct, i: number): ProductSummary {
  return {
    id: i + 1,
    slug: p.slug,
    name: p.name,
    styleCode: p.styleCode,
    summary: p.summary,
    categorySlug: p.categorySlug,
    categoryName: categoryName(p.categorySlug),
    price: p.price,
    currency: p.currency,
    isFeatured: p.isFeatured,
    isNew: p.isNew,
    imageUrl: p.images[0]?.url ?? null,
    imageAlt: p.images[0]?.alt ?? null,
    hoverImageUrl: p.images[1]?.url ?? null,
    colors: p.colors as Color[],
    isDemo: true,
  };
}

const summaries = data.products.map(summary);

export class DemoNotFoundError extends Error {}

export const demo = {
  company(): Company {
    const c = data.company;
    return {
      name: c.name,
      tagline: c.tagline,
      headline: c.headline,
      introduction: c.introduction,
      story: c.story,
      mission: c.mission,
      vision: c.vision,
      values: c.values,
      foundedYear: c.foundedYear,
      logoUrl: null,
      contact: { email: c.email, phone: c.phone, addressLine: c.addressLine, city: c.city, country: c.country },
      social: { linkedIn: null, instagram: null, youTube: null, x: null },
      metrics: c.metrics,
      milestones: c.milestones,
      isDemo: true,
    };
  },

  settings: (): Record<string, string> => ({ ...data.settings }),

  categories: () => categories,

  products(q: ProductQuery = {}): PagedResult<ProductSummary> {
    const term = q.search?.trim().toLowerCase();
    const color = q.color?.toLowerCase();
    let items = summaries.filter(
      (p) =>
        (!q.category || p.categorySlug === q.category) &&
        (!q.featured || p.isFeatured) &&
        (!color || p.colors.some((c) => c.name.toLowerCase() === color)) &&
        (!term ||
          p.name.toLowerCase().includes(term) ||
          p.summary.toLowerCase().includes(term) ||
          p.categoryName.toLowerCase().includes(term) ||
          (p.styleCode ?? '').toLowerCase().includes(term)),
    );
    const byOrder = (a: ProductSummary, b: ProductSummary) => a.id - b.id;
    items = [...items].sort(
      q.sort === 'price-asc'
        ? (a, b) => a.price - b.price || a.name.localeCompare(b.name)
        : q.sort === 'price-desc'
          ? (a, b) => b.price - a.price || a.name.localeCompare(b.name)
          : q.sort === 'newest'
            ? (a, b) => Number(b.isNew) - Number(a.isNew) || byOrder(a, b)
            : (a, b) => Number(b.isFeatured) - Number(a.isFeatured) || byOrder(a, b),
    );
    const pageSize = Math.min(Math.max(q.pageSize ?? 24, 1), 48);
    const page = Math.max(q.page ?? 1, 1);
    return {
      items: items.slice((page - 1) * pageSize, page * pageSize),
      page,
      pageSize,
      totalCount: items.length,
      totalPages: Math.ceil(items.length / pageSize),
    };
  },

  product(slug: string): ProductDetail {
    const i = data.products.findIndex((x) => x.slug === slug);
    if (i < 0) throw new DemoNotFoundError(slug);
    const p = data.products[i];
    return {
      id: i + 1,
      slug: p.slug,
      name: p.name,
      styleCode: p.styleCode,
      summary: p.summary,
      description: p.description,
      categorySlug: p.categorySlug,
      categoryName: categoryName(p.categorySlug),
      price: p.price,
      currency: p.currency,
      isNew: p.isNew,
      colors: p.colors as Color[],
      sizes: [...new Set(p.sizes)].sort((a, b) => sizeRank(a) - sizeRank(b)),
      variants: variants(p, i),
      specifications: p.specifications,
      features: p.features,
      media: p.images.map((m) => ({ type: 'Image' as const, url: m.url, altText: m.alt, caption: null, colorName: m.color, credit: 'Unsplash' })),
      lookbooks: data.lookbooks
        .filter((l) => l.products.includes(p.slug))
        .map((l) => ({ slug: l.slug, title: l.title, season: l.season })),
      metaTitle: null,
      metaDescription: null,
      isDemo: true,
    };
  },

  services(): ServiceSummary[] {
    return data.services.map((s, i) => ({
      id: i + 1,
      slug: s.slug,
      title: s.title,
      summary: s.summary,
      imageUrl: s.imageUrl,
      imageAlt: s.imageAlt,
      benefits: s.benefits,
      isDemo: true,
    }));
  },

  service(slug: string): ServiceDetail {
    const s = data.services.find((x) => x.slug === slug);
    if (!s) throw new DemoNotFoundError(slug);
    const base = demo.services().find((x) => x.slug === slug)!;
    return { ...base, description: s.description, metaTitle: null, metaDescription: null };
  },

  lookbooks(featured?: boolean): LookbookSummary[] {
    return data.lookbooks
      .filter((l) => !featured || l.isFeatured)
      .map((l) => ({
        id: data.lookbooks.indexOf(l) + 1,
        slug: l.slug,
        title: l.title,
        season: l.season,
        year: l.year,
        location: l.location,
        summary: l.summary,
        coverUrl: l.images[0]?.url ?? null,
        coverAlt: l.images[0]?.alt ?? null,
        imageCount: l.images.length,
        isDemo: true,
      }));
  },

  lookbook(slug: string): LookbookDetail {
    const l = data.lookbooks.find((x) => x.slug === slug);
    if (!l) throw new DemoNotFoundError(slug);
    return {
      id: data.lookbooks.indexOf(l) + 1,
      slug: l.slug,
      title: l.title,
      season: l.season,
      year: l.year,
      location: l.location,
      summary: l.summary,
      story: l.story,
      credits: l.credits,
      media: l.images.map((m) => ({ url: m.url, altText: m.alt, caption: null, credit: 'Unsplash' })),
      products: summaries.filter((p) => l.products.includes(p.slug)),
      metaTitle: null,
      metaDescription: null,
      isDemo: true,
    };
  },
};
