import { Link } from '@inertiajs/react';
import { Clock, FileArchive, FileText, Receipt, ShieldCheck, Stamp, Upload, CreditCard, Search } from 'lucide-react';
import PublicLayout from '@/Layouts/PublicLayout';
import { rupiah, usd } from '@/lib/format';

const FLOW = [
    [FileText, 'Ajukan visa', 'Isi jumlah pemohon & data singkat.'],
    [Receipt, 'Invoice terbit', 'Admin menerbitkan invoice (dapat disesuaikan).'],
    [CreditCard, 'Bayar via sistem', 'VA Mandiri/BSI/Muamalat atau QRIS.'],
    [Upload, 'Unggah berkas', 'Seluruh dokumen dalam 1 file ZIP/RAR.'],
    [Search, 'Verifikasi & proses', 'Admin memverifikasi lalu mengajukan.'],
    [Stamp, 'Visa terbit', 'Unduh visa langsung dari dashboard.'],
];

export default function Visa({ services }) {
    return (
        <PublicLayout title="Layanan Visa Umrah">
            <section className="relative overflow-hidden bg-brand-900 py-12 text-white">
                <div className="absolute inset-0 bg-pattern opacity-40" />
                <div className="container-app relative">
                    <h1 className="text-3xl text-white sm:text-4xl">Layanan Visa Umrah</h1>
                    <p className="mt-2 max-w-2xl text-brand-100">Pengurusan visa resmi dengan status yang dapat dipantau real-time: Menunggu Dokumen → Diverifikasi → Diproses → Terbit.</p>
                </div>
            </section>
            <div className="container-app space-y-10 py-10">
                <div>
                    <h2 className="mb-5 text-2xl">Alur pengajuan</h2>
                    <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
                        {FLOW.map(([Icon, t, d], i) => (
                            <li key={t} className="card relative p-5">
                                <span className="absolute right-4 top-3 font-serif text-3xl text-gold-200">{i + 1}</span>
                                <Icon className="h-6 w-6 text-brand-700" />
                                <p className="mt-3 font-semibold">{t}</p>
                                <p className="mt-1 text-xs text-slate-500">{d}</p>
                            </li>
                        ))}
                    </ol>
                </div>
                {services.map((s) => (
                    <div key={s.id} className="card grid gap-8 p-6 lg:grid-cols-[1fr_320px] lg:p-8">
                        <div>
                            <h2 className="text-2xl">{s.name}</h2>
                            <p className="mt-2 text-slate-600">{s.description}</p>
                            <p className="mt-6 flex items-center gap-2 font-semibold"><FileArchive className="h-5 w-5 text-gold-500" />Persyaratan dokumen</p>
                            <ul className="mt-3 space-y-2">
                                {(s.requirements ?? []).map((r) => <li key={r} className="flex gap-2 text-sm text-slate-700"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />{r}</li>)}
                            </ul>
                        </div>
                        <div className="rounded-2xl bg-sand-100 p-6">
                            <p className="text-sm text-slate-500">Biaya</p>
                            {s.price_usd ? (
                                <>
                                    <p className="text-3xl font-bold text-brand-700">{usd(s.price_usd)}<span className="text-sm font-normal text-slate-500">/orang</span></p>
                                    <p className="mt-1 text-sm text-slate-600">≈ {rupiah(s.price)} <span className="text-xs text-slate-500">(kurs Rp{Number(s.usd_rate).toLocaleString('id-ID')}/USD hari ini)</span></p>
                                    <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-900 ring-1 ring-amber-200">* Kurs menyesuaikan waktu pembelian. Pembayaran dalam Rupiah sesuai kurs yang berlaku saat invoice diterbitkan.</p>
                                </>
                            ) : (
                                <p className="text-3xl font-bold text-brand-700">{rupiah(s.price)}<span className="text-sm font-normal text-slate-500">/orang</span></p>
                            )}
                            <p className="mt-3 flex items-center gap-2 text-sm text-slate-600"><Clock className="h-4 w-4 text-gold-500" />Estimasi proses ±{s.processing_days} hari kerja</p>
                            <p className="mt-2 text-xs text-slate-500">Biaya final tercantum pada invoice yang diterbitkan admin setelah pengajuan.</p>
                            <Link href={route('checkout.visa', { layanan: s.id })} className="btn-primary mt-6 w-full py-3">Ajukan Visa</Link>
                        </div>
                    </div>
                ))}
            </div>
        </PublicLayout>
    );
}
