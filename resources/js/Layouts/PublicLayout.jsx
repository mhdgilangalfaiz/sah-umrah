import { Head } from '@inertiajs/react';
import SiteChrome from '@/Components/landing/SiteChrome';
import { Flash } from '@/Components/ui';

/**
 * Layout halaman publik (paket, detail paket, tiket, visa, checkout, blog, kontak, halaman statis).
 * Memakai kerangka yang sama dengan landing page: bar jam & konsultasi WhatsApp, navbar melayang
 * dengan dropdown Layanan Kami, footer, tombol Chat Bot, dan kembali ke atas.
 */
export default function PublicLayout({ title, children }) {
    return (
        <SiteChrome>
            {title && <Head title={title} />}
            <Flash />
            <div className="animate-page-in">{children}</div>
        </SiteChrome>
    );
}
