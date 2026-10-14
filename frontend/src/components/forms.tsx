import { useId, useState, type FormEvent, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ApiError, api } from '../api/client';
import type { OrderRequestType, ProductSummary, SubmissionResult } from '../api/types';

// ── Validation (mirrors the DataAnnotations on the API request DTOs) ─────────

type Rule = (value: string) => string | undefined;

const required = (label: string): Rule => (v) => (v.trim() ? undefined : `Enter ${label}.`);
const length = (min: number, max: number, label: string): Rule => (v) => {
  const n = v.trim().length;
  if (n && n < min) return `${label} needs at least ${min} characters.`;
  if (n > max) return `${label} can be at most ${max} characters.`;
  return undefined;
};
const email: Rule = (v) => (!v.trim() || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) ? undefined : 'Enter an email address like name@example.com.');
const phone: Rule = (v) => (!v.trim() || /^[+()\d\s.-]{6,40}$/.test(v.trim()) ? undefined : 'Use digits, spaces and + ( ) - only.');
const quantity: Rule = (v) => {
  if (!v.trim()) return undefined;
  const n = Number(v);
  return Number.isInteger(n) && n >= 1 && n <= 100000 ? undefined : 'Enter a whole number between 1 and 100,000.';
};

function validate(values: Record<string, string>, rules: Record<string, Rule[]>) {
  const errors: Record<string, string | undefined> = {};
  for (const [key, list] of Object.entries(rules)) {
    for (const rule of list) {
      const message = rule(values[key] ?? '');
      if (message) {
        errors[key] = message;
        break;
      }
    }
  }
  return errors;
}

// ── Building blocks ───────────────────────────────────────────────────────

function Field({
  label,
  hint,
  error,
  optional,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  optional?: boolean;
  children: (props: { id: string; 'aria-invalid': boolean; 'aria-describedby'?: string }) => ReactNode;
}) {
  const id = useId();
  const describedBy = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(' ') || undefined;
  return (
    <div>
      <label htmlFor={id} className="flex items-baseline justify-between gap-3 text-[0.9rem] text-graphite">
        <span>{label}</span>
        {optional && <span className="text-[0.8rem]">Optional</span>}
      </label>
      {children({ id, 'aria-invalid': !!error, 'aria-describedby': describedBy })}
      {hint && !error && (
        <p id={`${id}-hint`} className="t-small mt-2">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="mt-2 text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

/** Off-screen field that people never see; bots fill it and the API silently discards the submission. */
function Honeypot({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div aria-hidden="true" className="absolute -left-[10000px] h-px w-px overflow-hidden">
      <label>
        Website
        <input type="text" tabIndex={-1} autoComplete="off" value={value} onChange={(e) => onChange(e.target.value)} />
      </label>
    </div>
  );
}

function Success({ result, title, onReset }: { result: SubmissionResult; title: string; onReset: () => void }) {
  return (
    <motion.div
      key="success"
      role="status"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="border-t border-ink pt-8"
    >
      <h3 className="font-display text-3xl">{result.demo ? `${title} checked` : `${title} sent`}</h3>
      <p className="t-body mt-3">{result.message}</p>
      {!result.demo && result.reference !== 'received' && (
        <p className="t-small mt-4">
          Your reference: <span className="tabular-nums text-ink">{result.reference}</span>
        </p>
      )}
      <button type="button" className="btn btn-quiet mt-8" onClick={onReset}>
        Send another
      </button>
    </motion.div>
  );
}

function SubmitRow({ sending, error, label }: { sending: boolean; error?: string; label: string }) {
  return (
    <div className="flex flex-col gap-4 pt-2 sm:flex-row sm:items-center sm:justify-between">
      <p className="t-small max-w-sm">We use your details only to answer this request.</p>
      <div className="flex flex-col items-start gap-3 sm:items-end">
        <button type="submit" className="btn btn-primary" disabled={sending}>
          {sending ? 'Sending…' : label}
        </button>
        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}

function serverErrors(err: unknown): { fields: Record<string, string>; message: string } {
  if (err instanceof ApiError) {
    if (err.status === 429) return { fields: {}, message: 'Too many requests from this connection. Wait a few minutes and send it again.' };
    if (err.status === 400) return { fields: err.fieldErrors, message: 'Some fields need attention.' };
    return { fields: {}, message: `The server couldn't save your request (status ${err.status}). Try again in a moment.` };
  }
  return { fields: {}, message: "The request couldn't be sent. Check your connection and try again." };
}

function useForm<T extends Record<string, string>>(initial: T) {
  const [values, setValues] = useState<T>(initial);
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [status, setStatus] = useState<'idle' | 'sending' | 'done'>('idle');
  const [result, setResult] = useState<SubmissionResult>();
  const [formError, setFormError] = useState<string>();

  const set = (key: keyof T) => (v: string) => {
    setValues((prev) => ({ ...prev, [key]: v }));
    if (errors[key as string]) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  async function submit(rules: Record<string, Rule[]>, send: () => Promise<SubmissionResult>) {
    const found = validate(values, rules);
    setErrors(found);
    if (Object.values(found).some(Boolean)) {
      setFormError('Some fields need attention.');
      return;
    }
    setFormError(undefined);
    setStatus('sending');
    try {
      setResult(await send());
      setStatus('done');
    } catch (err) {
      const { fields, message } = serverErrors(err);
      setErrors(fields);
      setFormError(message);
      setStatus('idle');
    }
  }

  const reset = () => {
    setValues(initial);
    setStatus('idle');
  };

  return { values, errors, set, status, result, formError, submit, reset, setErrors };
}

// ── Contact form ──────────────────────────────────────────────────────────

export function ContactForm({ initialSubject = '' }: { initialSubject?: string }) {
  const f = useForm({ name: '', email: '', phone: '', subject: initialSubject, message: '', website: '' });
  const rules = {
    name: [required('your name'), length(2, 100, 'Name')],
    email: [required('your email address'), email],
    phone: [phone],
    subject: [required('a subject'), length(3, 150, 'Subject')],
    message: [required('a message'), length(20, 4000, 'Message')],
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const v = f.values;
    void f.submit(rules, () =>
      api.sendContact({
        name: v.name.trim(),
        email: v.email.trim(),
        phone: v.phone.trim() || undefined,
        subject: v.subject.trim(),
        message: v.message.trim(),
        website: v.website,
      }),
    );
  };

  return (
    <AnimatePresence mode="wait">
      {f.status === 'done' && f.result ? (
        <Success result={f.result} title="Message" onReset={f.reset} />
      ) : (
        <motion.form key="form" onSubmit={onSubmit} noValidate className="relative space-y-7" exit={{ opacity: 0 }}>
          <Honeypot value={f.values.website} onChange={f.set('website')} />
          <div className="grid gap-7 sm:grid-cols-2">
            <Field label="Name" error={f.errors.name}>
              {(p) => <input {...p} className="field" autoComplete="name" value={f.values.name} onChange={(e) => f.set('name')(e.target.value)} />}
            </Field>
            <Field label="Email" error={f.errors.email}>
              {(p) => <input {...p} type="email" className="field" autoComplete="email" value={f.values.email} onChange={(e) => f.set('email')(e.target.value)} />}
            </Field>
          </div>
          <Field label="Phone" optional error={f.errors.phone}>
            {(p) => <input {...p} type="tel" className="field" autoComplete="tel" value={f.values.phone} onChange={(e) => f.set('phone')(e.target.value)} />}
          </Field>
          <Field label="Subject" error={f.errors.subject}>
            {(p) => <input {...p} className="field" value={f.values.subject} onChange={(e) => f.set('subject')(e.target.value)} />}
          </Field>
          <Field label="Message" error={f.errors.message} hint="At least 20 characters.">
            {(p) => <textarea {...p} rows={5} className="field resize-y" value={f.values.message} onChange={(e) => f.set('message')(e.target.value)} />}
          </Field>
          <SubmitRow sending={f.status === 'sending'} error={f.formError} label="Send message" />
        </motion.form>
      )}
    </AnimatePresence>
  );
}

// ── Reservation / made-to-measure / wholesale ─────────────────────────────

const REQUEST_COPY: Record<OrderRequestType, { title: string; action: string; detailsLabel: string; detailsHint: string }> = {
  Reservation: {
    title: 'Reservation',
    action: 'Reserve this piece',
    detailsLabel: 'When would you like to come in?',
    detailsHint: 'We hold reserved pieces for seven days.',
  },
  MadeToMeasure: {
    title: 'Fitting request',
    action: 'Request a fitting',
    detailsLabel: 'What would you like made?',
    detailsHint: 'The piece, the cloth if you know it, and anything about fit we should know.',
  },
  Wholesale: {
    title: 'Wholesale enquiry',
    action: 'Send enquiry',
    detailsLabel: 'Tell us about your shop',
    detailsHint: 'Where you are, what you stock, and roughly how many pieces a season.',
  },
};

interface RequestFormProps {
  type: OrderRequestType;
  products?: ProductSummary[];
  /** When the form sits on a product page, the piece, colour and size come from the page. */
  fixed?: { productSlug: string; productName: string; color?: string; size?: string };
  /** Preselects a piece in the dropdown (e.g. coming from a product page). */
  initialProduct?: string;
}

export function RequestForm({ type, products = [], fixed, initialProduct = '' }: RequestFormProps) {
  const copy = REQUEST_COPY[type];
  const f = useForm({
    name: '',
    email: '',
    phone: '',
    companyName: '',
    country: '',
    productSlug: fixed?.productSlug ?? initialProduct,
    quantity: '',
    details: '',
    website: '',
  });

  const rules: Record<string, Rule[]> = {
    name: [required('your name'), length(2, 100, 'Name')],
    email: [required('your email address'), email],
    phone: [phone],
    details: [required('a few details'), length(10, 4000, 'Details')],
    ...(type === 'Wholesale' ? { companyName: [required('your shop or company name'), length(2, 120, 'Company')], quantity: [quantity] } : {}),
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (type === 'Reservation' && (!fixed?.color || !fixed?.size)) {
      f.setErrors({ size: 'Choose a colour and a size first.' });
      return;
    }
    const v = f.values;
    void f.submit(rules, () =>
      api.sendRequest({
        type,
        name: v.name.trim(),
        email: v.email.trim(),
        phone: v.phone.trim() || undefined,
        companyName: v.companyName.trim() || undefined,
        country: v.country.trim() || undefined,
        productSlug: (fixed?.productSlug ?? v.productSlug) || undefined,
        color: fixed?.color,
        size: fixed?.size,
        quantity: v.quantity ? Number(v.quantity) : undefined,
        details: v.details.trim(),
        website: v.website,
      }),
    );
  };

  return (
    <AnimatePresence mode="wait">
      {f.status === 'done' && f.result ? (
        <Success result={f.result} title={copy.title} onReset={f.reset} />
      ) : (
        <motion.form key={`form-${type}`} onSubmit={onSubmit} noValidate className="relative space-y-7" exit={{ opacity: 0 }}>
          <Honeypot value={f.values.website} onChange={f.set('website')} />

          {fixed ? (
            <p className="border-l-2 border-cobalt pl-4">
              {fixed.productName}
              {fixed.color && `, ${fixed.color}`}
              {fixed.size && `, size ${fixed.size}`}
              {(f.errors.size || f.errors.productSlug) && (
                <span role="alert" className="mt-1 block text-sm text-danger">
                  {f.errors.size ?? f.errors.productSlug}
                </span>
              )}
            </p>
          ) : (
            products.length > 0 && (
              <Field label="Piece" optional hint="Leave blank if it's something we don't make yet.">
                {(p) => (
                  <select {...p} className="field" value={f.values.productSlug} onChange={(e) => f.set('productSlug')(e.target.value)}>
                    <option value="">No specific piece</option>
                    {products.map((pr) => (
                      <option key={pr.slug} value={pr.slug}>
                        {pr.name}
                      </option>
                    ))}
                  </select>
                )}
              </Field>
            )
          )}

          {type === 'Wholesale' && (
            <div className="grid gap-7 sm:grid-cols-2">
              <Field label="Shop or company" error={f.errors.companyName}>
                {(p) => <input {...p} className="field" autoComplete="organization" value={f.values.companyName} onChange={(e) => f.set('companyName')(e.target.value)} />}
              </Field>
              <Field label="Pieces per season" optional error={f.errors.quantity}>
                {(p) => <input {...p} inputMode="numeric" className="field" value={f.values.quantity} onChange={(e) => f.set('quantity')(e.target.value)} />}
              </Field>
            </div>
          )}

          <div className="grid gap-7 sm:grid-cols-2">
            <Field label="Name" error={f.errors.name}>
              {(p) => <input {...p} className="field" autoComplete="name" value={f.values.name} onChange={(e) => f.set('name')(e.target.value)} />}
            </Field>
            <Field label="Email" error={f.errors.email}>
              {(p) => <input {...p} type="email" className="field" autoComplete="email" value={f.values.email} onChange={(e) => f.set('email')(e.target.value)} />}
            </Field>
            <Field label="Phone" optional error={f.errors.phone}>
              {(p) => <input {...p} type="tel" className="field" autoComplete="tel" value={f.values.phone} onChange={(e) => f.set('phone')(e.target.value)} />}
            </Field>
            <Field label="Country" optional>
              {(p) => <input {...p} className="field" autoComplete="country-name" value={f.values.country} onChange={(e) => f.set('country')(e.target.value)} />}
            </Field>
          </div>

          <Field label={copy.detailsLabel} error={f.errors.details} hint={copy.detailsHint}>
            {(p) => <textarea {...p} rows={4} className="field resize-y" value={f.values.details} onChange={(e) => f.set('details')(e.target.value)} />}
          </Field>

          <SubmitRow sending={f.status === 'sending'} error={f.formError} label={copy.action} />
        </motion.form>
      )}
    </AnimatePresence>
  );
}
