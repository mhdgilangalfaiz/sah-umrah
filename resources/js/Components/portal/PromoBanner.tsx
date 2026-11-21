import { Link } from '@inertiajs/react';
import { ArrowRight } from 'lucide-react';
import { arrowShift, IslamicStar } from '@/Components/landing/shared';

/** Banner ajakan pesan paket: foto Ka'bah memudar ke kiri, gelombang hijau + garis emas di bawah. */
export default function PromoBanner() {
    return (
        <section className="relative overflow-hidden rounded-3xl border border-white bg-gradient-to-br from-white via-[#F4FAF6] to-[#E6F2EA] p-6 shadow-[0_10px_30px_-16px_rgba(11,77,42,0.3),inset_0_1px_0_#fff] sm:p-8">
            <img src="/images/landing/hero-kaabah.webp" alt="" aria-hidden="true" loading="lazy"
                className="absolute inset-y-0 right-0 hidden h-full w-[60%] object-cover sm:block object-[40%_45%] [mask-image:linear-gradient(to_right,transparent,#000_55%)]" />
            <IslamicStar className="absolute right-6 top-4 h-24 w-24 text-white opacity-20" />
            <svg viewBox="0 0 800 90" preserveAspectRatio="none" aria-hidden="true" className="absolute inset-x-0 bottom-0 h-16 w-full">
                <path d="M0 60c140-30 300-40 430-18s250 26 370-12v60H0z" fill="#13693A" />
                <path d="M0 70c140-30 300-40 430-18s250 26 370-12v50H0z" fill="#0B4D2A" />
                <path d="M0 56c140-30 300-40 430-18s250 26 370-12" fill="none" stroke="#E8B923" strokeWidth="3" />
            </svg>

            <div className="relative max-w-sm pb-8">
                <h2 className="font-jakarta text-2xl font-extrabold leading-tight tracking-tight text-primary-900 sm:text-[1.75rem]">
                    <span className="block">Wujudkan</span>
                    <span className="block">Perjalanan Umrah Anda</span>
                    <span className="block text-primary-700">Bersama SAH</span>
                </h2>
                <p className="mt-2 text-sm font-medium text-neutral-900/75">Aman, Nyaman, dan Profesional.</p>
                <Link href={route('packages.index')}
                    className="group mt-5 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-primary-700 to-primary-900 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-primary-700/25 transition hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2">
                    Lihat Paket Umrah <ArrowRight className={arrowShift} aria-hidden="true" />
                </Link>
            </div>
        </section>
    );
}
