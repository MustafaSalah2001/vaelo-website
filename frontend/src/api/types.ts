// Mirrors the DTOs in CompanyWebsite.Application/Dtos. Keep the two in sync.

export interface PagedResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

export interface Metric {
  label: string;
  value: string;
  suffix: string | null;
}

export interface Milestone {
  year: number;
  title: string;
  description: string;
}

export interface Company {
  name: string;
  tagline: string;
  headline: string;
  introduction: string;
  story: string;
  mission: string;
  vision: string;
  values: string[];
  foundedYear: number | null;
  logoUrl: string | null;
  contact: { email: string | null; phone: string | null; addressLine: string | null; city: string | null; country: string | null };
  social: { linkedIn: string | null; instagram: string | null; youTube: string | null; x: string | null };
  metrics: Metric[];
  milestones: Milestone[];
  isDemo: boolean;
}

export interface Testimonial {
  id: number;
  authorName: string;
  authorRole: string | null;
  companyName: string | null;
  quote: string;
}

export interface ProductCategory {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  productCount: number;
}

export interface Color {
  name: string;
  hex: string;
}

export interface ProductSummary {
  id: number;
  slug: string;
  name: string;
  styleCode: string | null;
  summary: string;
  categorySlug: string;
  categoryName: string;
  price: number;
  currency: string;
  isFeatured: boolean;
  isNew: boolean;
  imageUrl: string | null;
  imageAlt: string | null;
  hoverImageUrl: string | null;
  colors: Color[];
  isDemo: boolean;
}

export interface Specification {
  group: string;
  label: string;
  value: string;
  unit: string | null;
}

export interface Media {
  type: 'Image' | 'Video' | 'Document' | 'Model';
  url: string;
  altText: string;
  caption: string | null;
  colorName: string | null;
  credit: string | null;
}

export interface Variant {
  colorName: string;
  size: string;
  sku: string;
  inStock: boolean;
}

export interface ProductDetail {
  id: number;
  slug: string;
  name: string;
  styleCode: string | null;
  summary: string;
  description: string;
  categorySlug: string;
  categoryName: string;
  price: number;
  currency: string;
  isNew: boolean;
  colors: Color[];
  sizes: string[];
  variants: Variant[];
  specifications: Specification[];
  features: { title: string; description: string }[];
  media: Media[];
  lookbooks: { slug: string; title: string; season: string }[];
  metaTitle: string | null;
  metaDescription: string | null;
  isDemo: boolean;
}

export type ProductSort = 'featured' | 'newest' | 'price-asc' | 'price-desc';

export interface ProductQuery {
  category?: string;
  search?: string;
  featured?: boolean;
  color?: string;
  sort?: ProductSort;
  page?: number;
  pageSize?: number;
}

export interface ServiceSummary {
  id: number;
  slug: string;
  title: string;
  summary: string;
  imageUrl: string | null;
  imageAlt: string | null;
  benefits: string[];
  isDemo: boolean;
}

export interface ServiceDetail extends ServiceSummary {
  description: string;
  metaTitle: string | null;
  metaDescription: string | null;
}

export interface LookbookSummary {
  id: number;
  slug: string;
  title: string;
  season: string;
  year: number;
  location: string | null;
  summary: string;
  coverUrl: string | null;
  coverAlt: string | null;
  imageCount: number;
  isDemo: boolean;
}

export interface LookbookDetail {
  id: number;
  slug: string;
  title: string;
  season: string;
  year: number;
  location: string | null;
  summary: string;
  story: string;
  credits: string | null;
  media: { url: string; altText: string; caption: string | null; credit: string | null }[];
  products: ProductSummary[];
  metaTitle: string | null;
  metaDescription: string | null;
  isDemo: boolean;
}

export interface ContactPayload {
  name: string;
  email: string;
  phone?: string;
  companyName?: string;
  subject: string;
  message: string;
  website?: string; // honeypot
}

export type OrderRequestType = 'Reservation' | 'MadeToMeasure' | 'Wholesale';

export interface OrderRequestPayload {
  type: OrderRequestType;
  name: string;
  email: string;
  phone?: string;
  companyName?: string;
  country?: string;
  productSlug?: string;
  color?: string;
  size?: string;
  quantity?: number;
  details: string;
  website?: string; // honeypot
}

export interface SubmissionResult {
  reference: string;
  message: string;
  /** Set by the client when the API was unreachable and nothing was actually sent. */
  demo?: boolean;
}

/** RFC 7807 body returned by the API for errors. */
export interface ProblemDetails {
  title?: string;
  detail?: string;
  status?: number;
  errors?: Record<string, string[]>;
}
