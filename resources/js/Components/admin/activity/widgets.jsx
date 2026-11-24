import { Link } from '@inertiajs/react';
import { ArrowDown, ArrowUp, Minus } from 'lucide-react';
import { cx } from '@/Components/ui';

export const panel = 'rounded-3xl border border-white bg-gradient-to-br from-white/95 via-white/85 to-white/70 shadow-[0_10px_30px_-16px_rgba(11,77,42,0.3),inset_0_1px_0_#fff]';

/** Grafik garis mini 7 hari (SVG, tanpa library). */
export function Sparkline({ values, color = '#2E8B57', className }) {
    const w = 84; const h = 30;
    const max = Math.max(1, ...values);
    const pts = values.map((v, i) => `${(i / (values.length - 1)) * w},${h - 3 - (v / max) * (h - 6)}`).join(' ');
    return (
        <svg viewBox={`0 0 ${w} ${h}`} className={cx('h-8 w-24', className)} aria-hidden="true">
            <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

/** Persentase perubahan dibanding kemarin. */
function Trend({ change, invert = false }) {
    const up = change > 0;
    const good = invert ? !up : up;
    const Icon = change === 0 ? Minus : up ? ArrowUp : ArrowDown;
    return (
        <span className={cx('inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-bold',
            change === 0 ? 'bg-slate-100 text-slate-500' : good ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600')}
            title="Dibanding kemarin">
            <Icon className="h-3 w-3" />{change > 0 && '+'}{change}%
        </span>
    );
}

/** Kartu statistik: ilustrasi kiri, label, angka + tren, grafik mini 7 hari. */
export function LogStatCard({ label, metric, image, color, invert, href }) {
    const Tag = href ? Link : 'div';
    return (
        <Tag href={href} preserveScroll className={cx(panel, 'flex items-center gap-3 overflow-hidden p-3 pr-4', href && 'transition hover:-translate-y-0.5 hover:shadow-[0_16px_36px_-16px_rgba(11,77,42,0.4)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500')}>
            <img src={image} alt="" aria-hidden="true" className="h-[86px] w-[38%] max-w-[150px] shrink-0 object-contain mix-blend-multiply" />
            <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-slate-800">{label}</p>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                    <span className="font-jakarta text-3xl font-extrabold leading-none text-slate-900">{metric.today}</span>
                    <Trend change={metric.change} invert={invert} />
                </div>
                <Sparkline values={metric.series} color={color} className="mt-1.5 ml-auto block" />
            </div>
        </Tag>
    );
}

const DONUT_COLORS = { 'auth.login': '#13693A', 'auth.logout': '#CBD5E1', 'auth.login_gagal': '#DC2626' };

/** Diagram donut jumlah aktivitas 7 hari terakhir. */
export function ActivityDonut({ stats }) {
    const total = stats.reduce((s, x) => s + x.count, 0);
    const r = 42; const c = 2 * Math.PI * r;
    let offset = 0;

    return (
        <div className="flex flex-col items-center gap-6 sm:flex-row">
            <div className="relative h-36 w-36 shrink-0">
                <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90" aria-hidden="true">
                    <circle cx="50" cy="50" r={r} fill="none" stroke="#EEF2F0" strokeWidth="11" />
                    {total > 0 && stats.map((s) => {
                        const len = (s.count / total) * c;
                        const seg = <circle key={s.action} cx="50" cy="50" r={r} fill="none" stroke={DONUT_COLORS[s.action]} strokeWidth="11" strokeDasharray={`${len} ${c - len}`} strokeDashoffset={-offset} />;
                        offset += len;
                        return seg;
                    })}
                </svg>
                <div className="absolute inset-0 grid place-items-center text-center">
                    <div><p className="font-jakarta text-3xl font-extrabold leading-none text-slate-900">{total}</p><p className="mt-1 text-[11px] font-semibold leading-tight text-slate-500">Total<br />Aktivitas</p></div>
                </div>
            </div>
            <ul className="w-full flex-1 space-y-3">
                {stats.map((s) => (
                    <li key={s.action} className="flex items-center justify-between gap-3 text-sm">
                        <span className="flex items-center gap-2.5 font-semibold text-slate-800"><span className="h-3 w-3 rounded-full" style={{ background: DONUT_COLORS[s.action] }} />{s.label}</span>
                        <span className="tabular-nums text-slate-600"><b className="text-slate-900">{s.count}</b> ({total ? Math.round((s.count / total) * 100) : 0}%)</span>
                    </li>
                ))}
            </ul>
        </div>
    );
}

/** Ikon browser berwarna kecil. */
export function BrowserIcon({ name }) {
    if (name === 'Chrome') {
        return (
            <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" aria-hidden="true">
                <circle cx="12" cy="12" r="11" fill="#DB4437" />
                <path d="M12 12 2.5 6.5A11 11 0 0 0 7.2 21.9L12 12Z" fill="#0F9D58" />
                <path d="M12 12h11A11 11 0 0 1 7.2 21.9L12 12Z" fill="#F4B400" />
                <circle cx="12" cy="12" r="5" fill="#fff" /><circle cx="12" cy="12" r="3.8" fill="#4285F4" />
            </svg>
        );
    }
    const color = { Edge: '#0C8FD8', Firefox: '#E66000', Safari: '#1E90FF', Opera: '#E0242C' }[name] ?? '#94A3B8';
    return <span className="h-4 w-4 shrink-0 rounded-full" style={{ background: color }} aria-hidden="true" />;
}
