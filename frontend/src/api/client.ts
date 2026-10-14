import { demo, DemoNotFoundError } from './demo';
import type {
  Company,
  ContactPayload,
  LookbookDetail,
  LookbookSummary,
  OrderRequestPayload,
  PagedResult,
  ProblemDetails,
  ProductCategory,
  ProductDetail,
  ProductQuery,
  ProductSummary,
  ServiceDetail,
  ServiceSummary,
  SubmissionResult,
  Testimonial,
} from './types';

const API_BASE = (import.meta.env.VITE_API_URL ?? 'http://localhost:5090').replace(/\/$/, '');
const DEMO_ONLY = import.meta.env.VITE_DEMO_ONLY === 'true';
const DEMO_FALLBACK = DEMO_ONLY || import.meta.env.VITE_DEMO_FALLBACK !== 'false';
const TIMEOUT_MS = 8000;

/** HTTP error from the API, carrying the RFC 7807 body when there is one. */
export class ApiError extends Error {
  readonly status: number;
  readonly problem?: ProblemDetails;

  constructor(status: number, problem?: ProblemDetails) {
    super(problem?.detail ?? problem?.title ?? `Request failed with status ${status}`);
    this.status = status;
    this.problem = problem;
  }

  get fieldErrors(): Record<string, string> {
    const out: Record<string, string> = {};
    for (const [key, messages] of Object.entries(this.problem?.errors ?? {})) {
      // ASP.NET returns PascalCase keys ("Email"); forms use camelCase.
      const field = key.charAt(0).toLowerCase() + key.slice(1);
      out[field] = messages[0];
    }
    return out;
  }
}

class NetworkError extends Error {}

// Lets the UI show a quiet "showing demo content" notice when the API was unreachable.
type Listener = (usingDemo: boolean) => void;
const listeners = new Set<Listener>();
let usingDemo = DEMO_ONLY;
export const dataSource = {
  get usingDemo() {
    return usingDemo;
  },
  subscribe(fn: Listener) {
    listeners.add(fn);
    return () => void listeners.delete(fn);
  },
};
function markDemo() {
  if (!usingDemo) {
    usingDemo = true;
    listeners.forEach((fn) => fn(true));
  }
}

async function request<T>(path: string, init: RequestInit = {}, signal?: AbortSignal): Promise<T> {
  const timeout = AbortSignal.timeout(TIMEOUT_MS);
  const combined = signal ? AbortSignal.any([signal, timeout]) : timeout;

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...init,
      signal: combined,
      headers: { Accept: 'application/json', ...(init.body ? { 'Content-Type': 'application/json' } : {}), ...init.headers },
    });
  } catch (err) {
    if (signal?.aborted) throw err; // caller cancelled; not a connectivity problem
    throw new NetworkError(err instanceof Error ? err.message : 'Network error');
  }

  if (!response.ok) {
    let problem: ProblemDetails | undefined;
    try {
      problem = (await response.json()) as ProblemDetails;
    } catch {
      /* body was not JSON */
    }
    throw new ApiError(response.status, problem);
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

/** GET with demo fallback: used only when the API can't be reached at all, never to hide a 4xx/5xx. */
async function get<T>(path: string, fallback: () => T, signal?: AbortSignal): Promise<T> {
  const fromDemo = () => {
    try {
      return fallback();
    } catch (err) {
      if (err instanceof DemoNotFoundError) throw new ApiError(404, { title: 'Not found' });
      throw err;
    }
  };

  if (DEMO_ONLY) return fromDemo();
  try {
    return await request<T>(path, {}, signal);
  } catch (err) {
    if (err instanceof NetworkError && DEMO_FALLBACK) {
      markDemo();
      return fromDemo();
    }
    throw err;
  }
}

async function post<T extends object>(path: string, body: T, demoMessage: string): Promise<SubmissionResult> {
  const demoResult = (): SubmissionResult => ({
    reference: 'DEMO',
    message: demoMessage,
    demo: true,
  });

  if (DEMO_ONLY) return demoResult();
  try {
    return await request<SubmissionResult>(path, { method: 'POST', body: JSON.stringify(body) });
  } catch (err) {
    if (err instanceof NetworkError && DEMO_FALLBACK) {
      markDemo();
      return demoResult();
    }
    throw err;
  }
}

const qs = (params: Record<string, string | number | boolean | undefined>) => {
  const s = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== '') s.set(k, String(v));
  const str = s.toString();
  return str ? `?${str}` : '';
};

const DEMO_SENT =
  'This is the offline portfolio demo, so your request was checked but not sent anywhere. With the API running it is stored in SQL Server.';

export const api = {
  company: (signal?: AbortSignal) => get<Company>('/api/company', demo.company, signal),
  testimonials: (signal?: AbortSignal) => get<Testimonial[]>('/api/company/testimonials', () => [], signal),
  settings: (signal?: AbortSignal) => get<Record<string, string>>('/api/settings', demo.settings, signal),

  categories: (signal?: AbortSignal) => get<ProductCategory[]>('/api/product-categories', demo.categories, signal),
  products: (q: ProductQuery = {}, signal?: AbortSignal) =>
    get<PagedResult<ProductSummary>>(`/api/products${qs({ ...q })}`, () => demo.products(q), signal),
  product: (slug: string, signal?: AbortSignal) =>
    get<ProductDetail>(`/api/products/${encodeURIComponent(slug)}`, () => demo.product(slug), signal),

  services: (signal?: AbortSignal) => get<ServiceSummary[]>('/api/services', demo.services, signal),
  service: (slug: string, signal?: AbortSignal) =>
    get<ServiceDetail>(`/api/services/${encodeURIComponent(slug)}`, () => demo.service(slug), signal),

  lookbooks: (featured?: boolean, signal?: AbortSignal) =>
    get<LookbookSummary[]>(`/api/lookbooks${qs({ featured })}`, () => demo.lookbooks(featured), signal),
  lookbook: (slug: string, signal?: AbortSignal) =>
    get<LookbookDetail>(`/api/lookbooks/${encodeURIComponent(slug)}`, () => demo.lookbook(slug), signal),

  sendContact: (payload: ContactPayload) => post('/api/contact', payload, DEMO_SENT),
  sendRequest: (payload: OrderRequestPayload) => post('/api/requests', payload, DEMO_SENT),
};
