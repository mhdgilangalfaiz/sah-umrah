import { usePage } from '@inertiajs/react';
import { Clock, Headset, Mail, MapPin, Phone, ShieldCheck } from 'lucide-react';
import PublicLayout from '@/Layouts/PublicLayout';

export default function Contact({ page, mapEmbed }) {
    const { company } = usePage().props;
    const items = [
        [MapPin, 'Alamat kantor', company.address],
        [Phone, 'Telepon kantor', company.phone],
        [Mail, 'Email', company.email],
        [Clock, 'Jam layanan', company.hours],
        [ShieldCheck, 'Izin resmi', company.license],
    ];

    return (
        <PublicLayout title="Kontak">
            <section className="relative overflow-hidden bg-brand-900 py-12">
                <div className="absolute inset-0 bg-pattern opacity-40" />
                <div className="container-app relative"><h1 className="text-3xl text-white sm:text-4xl">{page?.title ?? 'Kontak & Alamat Kantor'}</h1></div>
            </section>
            <div className="container-app grid gap-8 py-10 lg:grid-cols-[1fr_1.3fr]">
                <div className="space-y-4">
                    {page && <div className="prose-app" dangerouslySetInnerHTML={{ __html: page.content }} />}
                    <div className="card divide-y divide-slate-100">
                        {items.map(([Icon, k, v]) => (
                            <div key={k} className="flex gap-4 p-4">
                                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700"><Icon className="h-5 w-5" /></div>
                                <div><p className="text-xs uppercase tracking-wide text-slate-400">{k}</p><p className="font-medium text-slate-800">{v}</p></div>
                            </div>
                        ))}
                    </div>
                    <div className="flex gap-3 rounded-2xl bg-gold-50 p-4 text-sm text-gold-900 ring-1 ring-gold-200">
                        <Headset className="h-5 w-5 shrink-0" />
                        <p>Untuk konsultasi, pemesanan, dan pembayaran gunakan <b>Pusat Bantuan</b> (tombol di kanan bawah). Semua percakapan tercatat agar kami dapat melayani Anda lebih baik.</p>
                    </div>
                </div>
                <div className="card overflow-hidden">
                    <iframe src={mapEmbed} title="Peta kantor" className="h-[420px] w-full lg:h-full" loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
                </div>
            </div>
        </PublicLayout>
    );
}
