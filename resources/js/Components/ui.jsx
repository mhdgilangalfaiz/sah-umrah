import { Link, router, usePage } from '@inertiajs/react';
import { Check, CheckCircle2, Inbox, X, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import { statusClass, statusLabel } from '@/lib/status';

export const cx = (...c) => c.filter(Boolean).join(' ');

export function Badge({ className = '', children }) {
    return (
        <span className={cx('inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset', className)}>
            {children}
        </span>
    );
}

export function StatusBadge({ status, label }) {
    return <Badge className={statusClass(status)}>{label ?? statusLabel(status)}</Badge>;
}

export function Field({ label, error, hint, children, className = '', required }) {
    return (
        <div className={className}>
            {label && (
                <label className="label">
                    {label} {required && <span className="text-red-500">*</span>}
                </label>
            )}
            {children}
            {hint && !error && <p className="hint">{hint}</p>}
            {error && <p className="error">{error}</p>}
        </div>
    );
}

export function Input({ label, error, hint, className = '', required, ...props }) {
    return (
        <Field label={label} error={error} hint={hint} className={className} required={required}>
            <input className={cx('input', error && 'border-red-400')} required={required} {...props} />
        </Field>
    );
}

export function Select({ label, error, hint, className = '', options = {}, placeholder, required, ...props }) {
    const entries = Array.isArray(options) ? options.map((o) => (typeof o === 'object' ? [o.value, o.label] : [o, o])) : Object.entries(options);
    return (
        <Field label={label} error={error} hint={hint} className={className} required={required}>
            <select className={cx('input', error && 'border-red-400')} required={required} {...props}>
                {placeholder !== undefined && <option value="">{placeholder}</option>}
                {entries.map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                ))}
            </select>
        </Field>
    );
}

export function Textarea({ label, error, hint, className = '', rows = 4, required, ...props }) {
    return (
        <Field label={label} error={error} hint={hint} className={className} required={required}>
            <textarea rows={rows} className={cx('input', error && 'border-red-400')} required={required} {...props} />
        </Field>
    );
}

export function PageHeader({ title, subtitle, actions, back }) {
    return (
        <div className={cx('mb-6 flex flex-col gap-3 sm:flex-row sm:justify-between', title ? 'sm:items-end' : 'sm:items-center')}>
            <div className="min-w-0">
                {back && (
                    <Link href={back} className={cx('inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-white px-3.5 py-1.5 text-sm font-semibold text-brand-700 shadow-sm transition hover:border-brand-600 hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600', title && 'mb-2')}>
                        <ChevronLeft className="h-4 w-4" /> Kembali
                    </Link>
                )}
                {title && <h1 className="text-2xl sm:text-3xl">{title}</h1>}
                {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
            </div>
            {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
        </div>
    );
}

export function Card({ title, actions, children, className = '', pad = true }) {
    return (
        <section className={cx('card', className)}>
            {(title || actions) && (
                <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
                    <h2 className="min-w-0 font-sans text-base font-semibold text-slate-900">{title}</h2>
                    {actions}
                </div>
            )}
            <div className={cx('min-w-0', pad && 'card-pad')}>{children}</div>
        </section>
    );
}

export function Stat({ label, value, icon: Icon, tone = 'brand', sub }) {
    const tones = {
        brand: 'bg-brand-50 text-brand-700',
        gold: 'bg-gold-50 text-gold-700',
        red: 'bg-red-50 text-red-600',
        blue: 'bg-sky-50 text-sky-700',
        slate: 'bg-slate-100 text-slate-600',
    };
    return (
        <div className="card flex items-start gap-4 p-5">
            {Icon && (
                <div className={cx('grid h-11 w-11 shrink-0 place-items-center rounded-xl', tones[tone])}>
                    <Icon className="h-5 w-5" />
                </div>
            )}
            <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
                <p className="mt-1 truncate text-xl font-bold text-slate-900">{value}</p>
                {sub && <p className="mt-0.5 text-xs text-slate-500">{sub}</p>}
            </div>
        </div>
    );
}

export function Empty({ title = 'Belum ada data', text, action, icon: Icon = Inbox }) {
    return (
        <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-sand-100 text-gold-600">
                <Icon className="h-7 w-7" />
            </div>
            <p className="mt-4 font-semibold text-slate-800">{title}</p>
            {text && <p className="mt-1 max-w-sm text-sm text-slate-500">{text}</p>}
            {action && <div className="mt-5">{action}</div>}
        </div>
    );
}

/** Stepper horizontal (checkout & status visa) */
export function Stepper({ steps, current, failed = false }) {
    return (
        <ol className="flex w-full items-start overflow-x-auto pb-2 scrollbar-none">
            {steps.map((s, i) => {
                const done = i < current;
                const active = i === current;
                return (
                    <li key={s} className="flex min-w-[84px] flex-1 flex-col items-center text-center">
                        <div className="flex w-full items-center">
                            <div className={cx('h-0.5 flex-1', i === 0 ? 'opacity-0' : done || active ? 'bg-brand-600' : 'bg-slate-200')} />
                            <div
                                className={cx(
                                    'grid h-9 w-9 shrink-0 place-items-center rounded-full border-2 text-sm font-bold transition',
                                    done && 'border-brand-700 bg-brand-700 text-white',
                                    active && !failed && 'border-gold-400 bg-gold-50 text-brand-800 ring-4 ring-gold-100',
                                    active && failed && 'border-red-500 bg-red-50 text-red-600',
                                    !done && !active && 'border-slate-200 bg-white text-slate-400',
                                )}
                            >
                                {done ? <Check className="h-4 w-4" /> : active && failed ? <X className="h-4 w-4" /> : i + 1}
                            </div>
                            <div className={cx('h-0.5 flex-1', i === steps.length - 1 ? 'opacity-0' : done ? 'bg-brand-600' : 'bg-slate-200')} />
                        </div>
                        <span className={cx('mt-2 px-1 text-[11px] font-medium leading-tight sm:text-xs', active ? (failed ? 'text-red-600' : 'text-brand-800') : done ? 'text-slate-700' : 'text-slate-400')}>
                            {s}
                        </span>
                    </li>
                );
            })}
        </ol>
    );
}

export function Pagination({ meta }) {
    if (!meta?.links || meta.last_page <= 1) return null;
    return (
        <nav className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 text-sm">
            <p className="text-slate-500">
                {meta.from}–{meta.to} dari {meta.total}
            </p>
            <div className="flex flex-wrap gap-1">
                {meta.links.map((l, i) => {
                    const label = i === 0 ? <ChevronLeft className="h-4 w-4" /> : i === meta.links.length - 1 ? <ChevronRight className="h-4 w-4" /> : l.label;
                    return l.url ? (
                        <Link
                            key={i}
                            href={l.url}
                            preserveScroll
                            className={cx('grid min-w-[34px] place-items-center rounded-lg px-2 py-1.5', l.active ? 'bg-brand-700 font-semibold text-white' : 'text-slate-600 hover:bg-slate-100')}
                        >
                            {label}
                        </Link>
                    ) : (
                        <span key={i} className="grid min-w-[34px] place-items-center px-2 py-1.5 text-slate-300">{label}</span>
                    );
                })}
            </div>
        </nav>
    );
}

/** Toast flash message dari server */
export function Flash() {
    const { flash, errors } = usePage().props;
    const [msg, setMsg] = useState(null);

    useEffect(() => {
        const firstError = errors && Object.keys(errors).length && !document.querySelector('form') ? Object.values(errors)[0] : null;
        const m = flash?.success ? { type: 'ok', text: flash.success } : flash?.error ? { type: 'err', text: flash.error } : firstError ? { type: 'err', text: firstError } : null;
        if (m) {
            setMsg(m);
            const t = setTimeout(() => setMsg(null), 5000);
            return () => clearTimeout(t);
        }
    }, [flash, errors]);

    if (!msg) return null;
    return (
        <div className="fixed inset-x-0 top-3 z-[60] flex justify-center px-4">
            <div className={cx('flex max-w-lg animate-pop items-start gap-3 rounded-xl px-4 py-3 text-sm font-medium shadow-lg', msg.type === 'ok' ? 'bg-brand-800 text-white' : 'bg-red-600 text-white')}>
                {msg.type === 'ok' ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />}
                <span>{msg.text}</span>
                <button onClick={() => setMsg(null)} className="opacity-70 hover:opacity-100" aria-label="Tutup">
                    <X className="h-4 w-4" />
                </button>
            </div>
        </div>
    );
}

/** Tombol aksi dengan konfirmasi (POST/DELETE via Inertia) */
export function ConfirmButton({ href, method = 'post', data = {}, confirm = 'Yakin?', className = 'btn-outline btn-sm', children }) {
    return (
        <button
            type="button"
            className={className}
            onClick={() => {
                if (window.confirm(confirm)) router.visit(href, { method, data, preserveScroll: true });
            }}
        >
            {children}
        </button>
    );
}

export function DefList({ items }) {
    return (
        // auto-fit: card sempit (kolom samping) → 1 kolom; card lebar → 2+ kolom. Teks panjang (email) tidak keluar card.
        <dl className="grid grid-cols-[repeat(auto-fit,minmax(12rem,1fr))] gap-x-6 gap-y-3 text-sm">
            {items.filter(Boolean).map(([k, v]) => (
                <div key={k} className="min-w-0">
                    <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">{k}</dt>
                    <dd className="mt-0.5 font-medium text-slate-800 [overflow-wrap:anywhere]">{v ?? '-'}</dd>
                </div>
            ))}
        </dl>
    );
}

export function Progress({ value, className = '' }) {
    return (
        <div className={cx('h-2 w-full overflow-hidden rounded-full bg-slate-100', className)}>
            <div className="h-full rounded-full bg-gradient-to-r from-brand-600 to-gold-400 transition-all" style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
        </div>
    );
}

export function Stars({ n = 5 }) {
    return <span className="text-gold-400">{'★'.repeat(n)}<span className="text-slate-200">{'★'.repeat(5 - n)}</span></span>;
}

/** Placeholder sampul paket bila belum ada foto */
export function CoverImage({ src, alt, className = '' }) {
    if (src) return <img src={src} alt={alt} loading="lazy" className={cx('h-full w-full object-cover', className)} />;
    return (
        <div className={cx('relative grid h-full w-full place-items-center overflow-hidden bg-gradient-to-br from-brand-800 via-brand-700 to-brand-900', className)}>
            <div className="absolute inset-0 bg-pattern opacity-60" />
            <img src="/images/logo-sah-footer.png" alt="" className="relative h-20 w-auto opacity-90" />
        </div>
    );
}
