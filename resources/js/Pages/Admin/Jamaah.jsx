import { Link } from '@inertiajs/react';
import { AlertTriangle, BookUser, ChevronRight, Crown, FileX2, Users } from 'lucide-react';
import AdminLayout from '@/Layouts/AdminLayout';
import FilterBar from '@/Components/FilterBar';
import UserAvatar from '@/Components/portal/UserAvatar';
import { Empty, PageHeader, Pagination } from '@/Components/ui';

/** Data jamaah per akun perwakilan. Satu baris = satu akun; tombol Detail → halaman akun berisi semua jamaahnya. */
export default function Jamaah({ accounts, summary, filters }) {
    const filtered = !!(filters.gender || filters.paspor);
    const tiles = [
        ['Akun perwakilan', summary.accounts, Users, 'text-primary-700 bg-primary-100', null],
        ['Total jamaah', summary.total, BookUser, 'text-sky-700 bg-sky-100', null],
        ['Paspor < 6 bulan', summary.segera, AlertTriangle, 'text-amber-700 bg-amber-100', 'segera'],
        ['Paspor kedaluwarsa / kosong', summary.habis + summary.kosong, FileX2, 'text-red-600 bg-red-100', 'habis'],
    ];

    return (
        <AdminLayout title="Data Jamaah" icon={BookUser}>
            <PageHeader title="Data Jamaah" subtitle="Dikelompokkan per akun perwakilan (yang memesan). Buka Detail untuk melihat semua jamaah, dokumen, dan riwayat pesanan akun tersebut." />

            <div className="mb-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
                {tiles.map(([label, value, Icon, tone, key]) => (
                    <Link key={label} href={route('admin.jamaah.index', key ? { paspor: key } : {})}
                        className="flex items-center gap-3 rounded-2xl border border-white bg-white/85 p-4 shadow-[0_8px_24px_-16px_rgba(11,77,42,0.35)] transition hover:-translate-y-0.5">
                        <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${tone}`}><Icon className="h-5 w-5" /></span>
                        <span className="min-w-0"><span className="block truncate text-xs font-semibold text-slate-500">{label}</span><span className="block text-xl font-extrabold text-slate-900">{value}</span></span>
                    </Link>
                ))}
            </div>

            <FilterBar routeName="admin.jamaah.index" filters={filters} fields={[
                { name: 'q', type: 'search', label: 'Nama / email / kode akun, atau nama jamaah' },
                { name: 'gender', type: 'select', label: 'Semua jenis kelamin', options: { L: 'Laki-laki', P: 'Perempuan' } },
                { name: 'paspor', type: 'select', label: 'Semua status paspor', options: { aman: 'Berlaku', segera: 'Kurang dari 6 bulan', habis: 'Kedaluwarsa', kosong: 'Belum diisi' } },
                { name: 'dokumen', type: 'select', label: 'Semua dokumen', options: { menunggu: `Dokumen menunggu verifikasi (${summary.dokumen ?? 0})` } },
            ]} />
            {filters.dokumen === 'menunggu' && (
                <p className="-mt-2 mb-4 rounded-xl bg-amber-50 px-4 py-2.5 text-sm text-amber-900 ring-1 ring-amber-200">Menampilkan akun yang punya dokumen jamaah menunggu verifikasi. Buka <b>Detail</b> untuk memeriksa dan memverifikasi dokumennya.</p>
            )}

            {accounts.data.length === 0 ? (
                <div className="card"><Empty icon={BookUser} title="Belum ada data jamaah" text="Jamaah otomatis tercatat saat pelanggan memesan, atau saat mereka menambahkannya di menu Data Jamaah portal." /></div>
            ) : (
                <ul className="space-y-3">
                    {accounts.data.map((a) => {
                        const rest = (filtered ? a.matched : a.jamaah_count) - a.names.length;
                        return (
                            <li key={a.id}>
                                <Link href={route('admin.jamaah.show', a.code)}
                                    className="group flex flex-col gap-3 rounded-2xl border border-white bg-white/90 px-4 py-3.5 shadow-[0_8px_24px_-16px_rgba(11,77,42,0.35)] transition hover:-translate-y-0.5 hover:shadow-[0_14px_30px_-16px_rgba(11,77,42,0.45)] sm:flex-row sm:items-center sm:px-5">
                                    <span className="flex min-w-0 flex-1 items-center gap-3">
                                        <UserAvatar name={a.name} className="h-11 w-11 text-sm" />
                                        <span className="min-w-0">
                                            <span className="flex items-center gap-2 font-bold text-slate-900"><Crown className="h-4 w-4 shrink-0 text-gold-500" aria-label="Perwakilan" /><span className="truncate">{a.name}</span></span>
                                            <span className="block truncate text-xs text-slate-500"><span className="font-mono font-semibold text-primary-700">{a.code}</span> · {a.email}</span>
                                            <span className="mt-1 block truncate text-xs text-slate-600">
                                                {filtered && <span className="font-semibold text-amber-700">Cocok: </span>}
                                                {a.names.join(', ')}{rest > 0 && <span className="text-slate-400"> +{rest} lainnya</span>}
                                            </span>
                                        </span>
                                    </span>
                                    <span className="flex flex-wrap items-center gap-2">
                                        <span className="rounded-full bg-primary-100 px-3 py-1 text-xs font-bold text-primary-900">{a.jamaah_count} jamaah</span>
                                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{a.bookings} pesanan</span>
                                        {a.pending_docs > 0 && <span className="flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-1 text-xs font-bold text-red-700" title="Dokumen menunggu verifikasi"><FileX2 className="h-3.5 w-3.5" />{a.pending_docs} dokumen baru</span>}
                                        {a.warnings > 0 && <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-800" title="Paspor perlu dicek"><AlertTriangle className="h-3.5 w-3.5" />{a.warnings} paspor</span>}
                                        <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-primary-700 to-primary-900 px-4 py-2 text-xs font-bold text-white shadow-md shadow-primary-700/25 sm:ml-2">
                                            Detail <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                                        </span>
                                    </span>
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            )}
            <div className="mt-3"><Pagination meta={accounts} /></div>
        </AdminLayout>
    );
}
