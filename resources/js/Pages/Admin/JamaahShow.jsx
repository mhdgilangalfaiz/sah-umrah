import { Link } from '@inertiajs/react';
import { ArrowLeft, BookUser, CalendarDays, Crown, FileCheck2, FileText, Mail, MapPin, Phone, Plane, ShieldCheck, UserCog, Users } from 'lucide-react';
import AdminLayout from '@/Layouts/AdminLayout';
import UserAvatar from '@/Components/portal/UserAvatar';
import { Badge, StatusBadge, cx } from '@/Components/ui';
import { date, rupiah } from '@/lib/format';

const PASSPORT = {
    aman: ['Berlaku', 'bg-emerald-50 text-emerald-700 ring-emerald-600/20'],
    segera: ['< 6 bulan', 'bg-amber-50 text-amber-800 ring-amber-600/20'],
    habis: ['Kedaluwarsa', 'bg-red-50 text-red-700 ring-red-600/20'],
    kosong: ['Belum diisi', 'bg-slate-100 text-slate-500 ring-slate-300'],
};
const panel = 'rounded-3xl border border-white bg-white/90 shadow-[0_10px_30px_-16px_rgba(11,77,42,0.3),inset_0_1px_0_#fff]';

/** Detail akun perwakilan: profil, semua jamaah yang ia daftarkan, dan riwayat pesanannya. */
export default function JamaahShow({ account, jamaah, bookings, flightOrders }) {
    const orders = [...bookings, ...flightOrders];

    return (
        <AdminLayout title="Detail Jamaah" icon={BookUser}>
            <Link href={route('admin.jamaah.index')} className="mb-4 inline-flex items-center gap-1.5 text-sm font-bold text-primary-700 hover:underline">
                <ArrowLeft className="h-4 w-4" /> Kembali ke Data Jamaah
            </Link>

            {/* Profil perwakilan */}
            <section className={cx(panel, 'flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:p-6')}>
                <UserAvatar name={account.name} src={account.avatar} className="h-16 w-16 text-xl" />
                <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gold-600"><Crown className="h-4 w-4 text-gold-500" />Akun perwakilan</p>
                    <h2 className="mt-0.5 truncate font-jakarta text-2xl font-extrabold tracking-tight">{account.name}</h2>
                    <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600">
                        <span className="font-mono font-semibold text-primary-700">{account.code}</span>
                        <span className="flex items-center gap-1.5"><Mail className="h-4 w-4" />{account.email}</span>
                        {account.phone && <span className="flex items-center gap-1.5"><Phone className="h-4 w-4" />{account.phone}</span>}
                        {account.city && <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4" />{account.city}</span>}
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        {account.is_active ? <Badge className="bg-emerald-50 text-emerald-700 ring-emerald-600/20">Aktif</Badge> : <Badge className="bg-red-50 text-red-700 ring-red-600/20">Nonaktif</Badge>}
                        {account.verified ? <Badge className="bg-emerald-50 text-emerald-700 ring-emerald-600/20">Email terverifikasi</Badge> : <Badge className="bg-amber-50 text-amber-700 ring-amber-600/20">Belum verifikasi</Badge>}
                        {!account.profile_completed && <Badge className="bg-slate-100 text-slate-500 ring-slate-300">Profil belum lengkap</Badge>}
                        <span className="text-xs text-slate-500">Bergabung {account.joined} · login {account.last_login ?? 'belum pernah'}</span>
                    </div>
                </div>
                <div className="flex shrink-0 gap-3 sm:flex-col sm:items-end">
                    <div className="flex gap-2">
                        <Stat icon={Users} value={jamaah.length} label="Jamaah" />
                        <Stat icon={CalendarDays} value={orders.length} label="Pesanan" />
                    </div>
                    <Link href={route('admin.users.index', { q: account.code })} className="btn-outline btn-sm"><UserCog className="h-4 w-4" />Kelola akun</Link>
                </div>
            </section>

            {/* Jamaah */}
            <h3 className="mb-3 mt-6 flex items-center gap-2 font-jakarta text-lg font-extrabold"><Users className="h-5 w-5 text-primary-700" />Jamaah yang didaftarkan ({jamaah.length})</h3>
            {jamaah.length === 0 ? <p className={cx(panel, 'p-6 text-sm text-slate-500')}>Akun ini belum mendaftarkan jamaah.</p> : (
                <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-2 2xl:grid-cols-3">
                    {jamaah.map((j) => <JamaahCard key={j.id} j={j} />)}
                </div>
            )}

            {/* Pesanan */}
            <h3 className="mb-3 mt-6 flex items-center gap-2 font-jakarta text-lg font-extrabold"><CalendarDays className="h-5 w-5 text-primary-700" />Riwayat pesanan ({orders.length})</h3>
            <section className={cx(panel, 'overflow-hidden')}>
                {orders.length === 0 ? <p className="p-6 text-sm text-slate-500">Belum ada pesanan.</p> : (
                    <div className="overflow-x-auto"><table className="table-app">
                        <thead><tr><th>Kode</th><th>Layanan</th><th>Berangkat</th><th className="!text-center">Jamaah</th><th className="!text-right">Dibayar / Total</th><th>Status</th></tr></thead>
                        <tbody className="divide-y divide-slate-100">
                            {orders.map((o) => (
                                <tr key={o.code}>
                                    <td><Link href={o.url} className="font-mono font-semibold text-primary-700 hover:underline">{o.code}</Link></td>
                                    <td><span className="mr-1.5 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-slate-600">{o.kind}</span>{o.title ?? '-'}</td>
                                    <td>{o.date ? date(o.date) : '-'}</td>
                                    <td className="text-center">{o.pax}</td>
                                    <td className="text-right">{rupiah(o.paid)} <span className="text-slate-400">/ {rupiah(o.total)}</span></td>
                                    <td><StatusBadge status={o.status} /></td>
                                </tr>
                            ))}
                        </tbody>
                    </table></div>
                )}
            </section>
        </AdminLayout>
    );
}

function Stat({ icon: Icon, value, label }) {
    return (
        <span className="flex items-center gap-2 rounded-2xl bg-primary-50 px-3 py-2">
            <Icon className="h-4 w-4 text-primary-700" /><span className="leading-tight"><span className="block text-lg font-extrabold">{value}</span><span className="block text-[11px] text-slate-500">{label}</span></span>
        </span>
    );
}

function JamaahCard({ j }) {
    const [label, cls] = PASSPORT[j.passport_status];
    const verified = j.documents.filter((d) => d.status === 'diverifikasi').length;

    return (
        <article className={cx(panel, 'flex flex-col p-5', j.passport_status === 'habis' && 'ring-1 ring-red-200', j.passport_status === 'segera' && 'ring-1 ring-amber-200')}>
            <div className="flex items-start gap-3">
                <UserAvatar name={j.name} className="h-11 w-11 text-sm" />
                <div className="min-w-0 flex-1">
                    <p className="truncate font-bold text-slate-900">{j.name}</p>
                    <p className="text-xs text-slate-500">{j.relation}{j.is_self && <span className="ml-1.5 rounded bg-gold-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-gold-800">Pemilik akun</span>}</p>
                </div>
            </div>

            <dl className="mt-4 grid grid-cols-2 gap-x-3 gap-y-2.5 text-sm">
                <Item label="Jenis kelamin" value={j.gender === 'P' ? 'Perempuan' : j.gender === 'L' ? 'Laki-laki' : '-'} />
                <Item label="Umur" value={j.age != null ? `${j.age} tahun` : '-'} />
                <Item label="Tempat, tgl lahir" value={j.birth ?? '-'} wide />
                <Item label="No. HP" value={j.phone ?? '-'} />
                <Item label="NIK" value={j.has_nik ? 'Sudah diisi' : 'Belum diisi'} />
                {j.mahram && <Item label="Mahram" value={j.mahram} wide />}
            </dl>

            <div className="mt-4 rounded-2xl bg-slate-50 p-3">
                <p className="flex items-center justify-between gap-2 text-xs font-bold uppercase tracking-wide text-slate-500"><span className="flex items-center gap-1.5"><ShieldCheck className="h-4 w-4" />Paspor</span><Badge className={cls}>{label}</Badge></p>
                <p className="mt-1 font-mono text-sm">{j.passport ?? '-'}</p>
                <p className="text-xs text-slate-500">{j.passport_expiry ? `Berlaku s.d. ${j.passport_expiry}` : 'Masa berlaku belum diisi'}{j.passport_place && ` · ${j.passport_place}`}</p>
            </div>

            <div className="mt-3">
                <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-500"><FileText className="h-4 w-4" />Dokumen {j.documents.length > 0 && `(${verified}/${j.documents.length} terverifikasi)`}</p>
                {j.documents.length === 0 ? <p className="mt-1 text-xs text-slate-400">Belum ada dokumen.</p> : (
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {j.documents.map((d, i) => (
                            <span key={i} className={cx('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1',
                                d.status === 'diverifikasi' ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20' : d.status === 'ditolak' ? 'bg-red-50 text-red-700 ring-red-600/20' : 'bg-amber-50 text-amber-800 ring-amber-600/20')}>
                                {d.status === 'diverifikasi' && <FileCheck2 className="h-3 w-3" />}{d.type}
                            </span>
                        ))}
                    </div>
                )}
            </div>

            <div className="mt-3 border-t border-slate-100 pt-3">
                <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-500"><Plane className="h-4 w-4" />Perjalanan</p>
                {j.trips.length === 0 ? <p className="mt-1 text-xs text-slate-400">Belum pernah ikut pesanan.</p> : (
                    <ul className="mt-1.5 space-y-1">
                        {j.trips.map((t) => (
                            <li key={t.code} className="flex items-center justify-between gap-2 text-xs">
                                <Link href={t.url} className="min-w-0 truncate font-semibold text-primary-700 hover:underline">{t.kind} · {t.title ?? t.code}</Link>
                                <span className="shrink-0 text-slate-500">{t.date ? date(t.date) : ''}</span>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </article>
    );
}

function Item({ label, value, wide }) {
    return (
        <div className={wide ? 'col-span-2' : ''}>
            <dt className="text-[11px] text-slate-500">{label}</dt>
            <dd className="font-medium text-slate-900">{value}</dd>
        </div>
    );
}
