import { Head, Link, router } from '@inertiajs/react';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { Flash } from '@/Components/ui';

const PERKS = [
    'Pantau pesanan, cicilan & dokumen secara real-time',
    'Pembayaran aman via Virtual Account & QRIS',
    'Invoice otomatis lengkap dengan riwayat pembayaran',
];

/** Kembali ke halaman terakhir sebelum masuk halaman login/daftar (dicatat di app.jsx), atau ke beranda. */
function goBack() {
    let last = null;
    try { last = sessionStorage.getItem('sah.lastPage'); } catch { /* abaikan */ }
    router.visit(last || '/');
}

export default function GuestLayout({ title, children }) {
    return (
        <div className="relative flex min-h-screen flex-col overflow-hidden bg-gradient-to-br from-brand-50 via-white to-amber-50/60">
            {title && <Head title={title} />}
            <Flash />

            {/* Ornamen latar yang lembut */}
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-pattern opacity-30 [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)]" />
            <div aria-hidden="true" className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-brand-200/40 blur-3xl" />
            <div aria-hidden="true" className="pointer-events-none absolute -bottom-40 -right-24 h-[28rem] w-[28rem] rounded-full bg-amber-100/60 blur-3xl" />

            <header className="container-app relative flex items-center py-3">
                <button type="button" onClick={goBack}
                    className="group inline-flex items-center gap-2 rounded-full border border-brand-100 bg-white/80 px-4 py-2 text-sm font-semibold text-brand-800 shadow-sm backdrop-blur transition hover:border-brand-300 hover:bg-white">
                    <ArrowLeft className="h-4 w-4 transition group-hover:-translate-x-0.5" /> Kembali
                </button>
            </header>

            <main className="container-app relative flex flex-1 items-center justify-center pb-5 pt-0">
                <div className="grid w-full max-w-[880px] animate-fade-up overflow-hidden rounded-[26px]  bg-white/95 shadow-[0_30px_80px_-30px_rgba(4,99,42,.35)] ring-1 ring-brand-100 backdrop-blur lg:grid-cols-[0.9fr_1.1fr]">
                    {/* Panel foto — menyatu di dalam kartu, tidak membelah layar */}
                    <aside className="relative hidden min-h-0 p-2.5 lg:block">
                        <div className="relative h-full overflow-hidden rounded-[20px]">
                            <img src="/images/landing/hero-kaabah.jpg" alt="" className="absolute inset-0 h-full w-full object-cover object-[45%_40%]" />
                            <div className="absolute inset-0 bg-gradient-to-t from-brand-950/90 via-brand-900/45 to-brand-900/5" />
                            <div className="relative flex h-full flex-col justify-end p-6 text-white">
                                <span className="w-fit rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur">PT. Sumatera Andalan Haramain</span>
                                <h2 className="mt-4 font-sans text-2xl font-extrabold leading-tight tracking-tight text-white">Satu akun untuk seluruh perjalanan ibadah Anda.</h2>
                                <ul className="mt-4 space-y-2 text-sm text-brand-50">
                                    {PERKS.map((t) => (
                                        <li key={t} className="flex items-start gap-2.5"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-200" />{t}</li>
                                    ))}
                                </ul>
                                <p className="mt-5 border-t border-white/20 pt-3 text-xs italic text-brand-100/90">“Dan sempurnakanlah ibadah haji dan umrah karena Allah.” — QS. Al-Baqarah: 196</p>
                            </div>
                        </div>
                    </aside>

                    <section className="flex min-h-0 flex-col px-6 py-6 sm:px-9 [&_h1]:font-sans [&_h1]:text-2xl [&_h1]:font-extrabold [&_h1]:tracking-tight [&_h1]:text-slate-900">
                        <div className="m-auto w-full max-w-sm">
                            {children}
                        </div>
                    </section>
                </div>
            </main>
        </div>
    );
}
