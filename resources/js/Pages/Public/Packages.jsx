import { router } from '@inertiajs/react';
import { SlidersHorizontal } from 'lucide-react';
import PublicLayout from '@/Layouts/PublicLayout';
import { PackageCard } from '@/Components/Cards';
import { Empty, Pagination } from '@/Components/ui';

const MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

export default function Packages({ packages, filters, types }) {
    const set = (k, v) => router.get(route('packages.index'), { ...filters, [k]: v || undefined }, { preserveState: true, preserveScroll: true, replace: true });

    return (
        <PublicLayout title="Paket Umrah">
            <section className="relative overflow-hidden bg-brand-900 py-12 text-white">
                <div className="absolute inset-0 bg-pattern opacity-40" />
                <div className="container-app relative">
                    <h1 className="text-3xl text-white sm:text-4xl">Paket Umrah</h1>
                    <p className="mt-2 max-w-2xl text-brand-100">Pilih paket sesuai kebutuhan. Sisa kuota ditampilkan secara real-time dan kursi langsung terkunci setelah deposit dibayar.</p>
                </div>
            </section>
            <div className="container-app py-8">
                <div className="card mb-8 p-4">
                    <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700"><SlidersHorizontal className="h-4 w-4 text-gold-500" />Filter paket</div>
                    <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
                        <select className="input" value={filters.bulan ?? ''} onChange={(e) => set('bulan', e.target.value)}>
                            <option value="">Semua bulan</option>
                            {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                        </select>
                        <select className="input" value={filters.durasi ?? ''} onChange={(e) => set('durasi', e.target.value)}>
                            <option value="">Semua durasi</option>
                            {[9, 12, 15].map((d) => <option key={d} value={d}>{d} hari</option>)}
                        </select>
                        <select className="input" value={filters.jenis ?? ''} onChange={(e) => set('jenis', e.target.value)}>
                            <option value="">Semua jenis</option>
                            {Object.entries(types).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                        </select>
                        <select className="input" value={filters.harga_maks ?? ''} onChange={(e) => set('harga_maks', e.target.value)}>
                            <option value="">Semua harga</option>
                            {[25, 30, 35, 45, 60].map((h) => <option key={h} value={h * 1e6}>≤ Rp{h} juta</option>)}
                        </select>
                        <select className="input col-span-2 md:col-span-1" value={filters.urut ?? 'termurah'} onChange={(e) => set('urut', e.target.value)}>
                            <option value="termurah">Harga termurah</option>
                            <option value="termahal">Harga termahal</option>
                        </select>
                    </div>
                </div>
                {packages.data.length === 0 ? (
                    <div className="card"><Empty title="Paket tidak ditemukan" text="Coba ubah filter pencarian Anda." /></div>
                ) : (
                    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        {packages.data.map((p) => <PackageCard key={p.id} p={p} />)}
                    </div>
                )}
                <div className="mt-6"><Pagination meta={packages} /></div>
            </div>
        </PublicLayout>
    );
}
