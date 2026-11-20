import { Head, Link } from '@inertiajs/react';
import { CheckCircle2 } from 'lucide-react';
import { Flash } from '@/Components/ui';

export default function GuestLayout({ title, children }) {
    return (
        <div className="grid min-h-screen lg:grid-cols-2">
            {title && <Head title={title} />}
            <Flash />
            <div className="relative hidden overflow-hidden bg-brand-900 lg:block">
                <div className="absolute inset-0 bg-pattern opacity-50" />
                <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-gold-400/10 blur-3xl" />
                <div className="relative flex h-full flex-col justify-between p-12 text-white">
                    <Link href="/"><img src="/images/logo-sah-footer.png" alt="SAH" className="h-16 w-auto" /></Link>
                    <div>
                        <h2 className="max-w-md text-4xl leading-tight text-white">Satu akun untuk seluruh perjalanan ibadah Anda.</h2>
                        <ul className="mt-8 space-y-3 text-brand-100">
                            {['Pantau pesanan, cicilan & dokumen secara real-time', 'Pembayaran aman via VA Mandiri, BSI, Muamalat & QRIS', 'Invoice & kwitansi otomatis, siap diunduh', 'Pusat bantuan langsung terhubung ke admin'].map((t) => (
                                <li key={t} className="flex items-start gap-3"><CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-gold-300" />{t}</li>
                            ))}
                        </ul>
                    </div>
                    <p className="text-sm text-brand-300">“Dan sempurnakanlah ibadah haji dan umrah karena Allah.” — QS. Al-Baqarah: 196</p>
                </div>
            </div>
            <div className="flex flex-col items-center justify-center bg-sand-50 px-4 py-10 sm:px-8">
                <Link href="/" className="mb-8 lg:hidden"><img src="/images/logo-sah.png" alt="SAH" className="h-14 w-auto" /></Link>
                <div className="w-full max-w-md animate-fade-up">{children}</div>
            </div>
        </div>
    );
}
