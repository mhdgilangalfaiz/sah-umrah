import { Head, usePage } from '@inertiajs/react';
import { useEffect } from 'react';
import About from '@/Components/landing/About';
import Gallery from '@/Components/landing/Gallery';
import Hero from '@/Components/landing/Hero';
import Packages from '@/Components/landing/Packages';
import Services from '@/Components/landing/Services';
import SiteChrome from '@/Components/landing/SiteChrome';
import Testimonials from '@/Components/landing/Testimonials';
import type { LandingProps, SharedProps } from '@/Components/landing/types';

const DESCRIPTION = 'SAH - PT. Sumatera Andalan Haramain, travel umrah amanah & profesional dari Kota Medan. Paket umrah terbaik, tiket pesawat, dan layanan visa dengan pembimbing berpengalaman.';

/** Landing page (route "/"). Semua isi berasal dari App\Support\LandingPage. */
export default function Landing({ content, services, packages, packageOptions, galleries, galleryVideos = [], testimonials, rating, galleryAudio }: LandingProps) {
    const { company } = usePage<SharedProps>().props;

    // Datang dari halaman lain lewat "/#galeri" dsb → langsung ke section tujuan
    useEffect(() => {
        const id = window.location.hash.slice(1);
        if (id) requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ block: 'start' }));
    }, []);

    return (
        <SiteChrome onHome className="landing-ds font-jakarta text-neutral-900 antialiased">
            <Head title="SAH - Travel Umrah Amanah & Profesional">
                <meta head-key="description" name="description" content={DESCRIPTION} />
            </Head>
            <Hero hero={content.hero} />
            <About about={content.about} />
            <Services heading={content.services_heading} services={services} />
            <Packages heading={content.packages} packages={packages} whatsapp={company.whatsapp} />
            <Testimonials heading={content.testimonials} testimonials={testimonials} rating={rating} packageOptions={packageOptions} />
            <Gallery heading={content.gallery} photos={galleries} videos={galleryVideos} audio={galleryAudio} />
        </SiteChrome>
    );
}
