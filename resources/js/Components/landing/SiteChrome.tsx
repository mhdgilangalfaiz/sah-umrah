import { usePage } from '@inertiajs/react';
import { MotionConfig } from 'motion/react';
import type { ReactNode } from 'react';
import FloatingActions from './FloatingActions';
import Footer from './Footer';
import { useScrollState } from './hooks';
import { cn } from './lib';
import Navbar from './Navbar';
import TopBar from './TopBar';
import type { SharedProps } from './types';

interface SiteChromeProps {
    children: ReactNode;
    /** beranda: menu menggulir antar-section & hero mengatur jarak atasnya sendiri */
    onHome?: boolean;
    className?: string;
}

/**
 * Kerangka situs publik bergaya landing: bar jam, navbar melayang, footer, Chat Bot & kembali ke atas.
 * Dipakai landing page dan semua halaman yang memakai PublicLayout.
 */
export default function SiteChrome({ children, onHome = false, className }: SiteChromeProps) {
    const { auth, company } = usePage<SharedProps>().props;
    const scroll = useScrollState();
    const user = auth.user;
    const account = user ? { label: 'Dashboard', href: route(user.is_admin ? 'admin.dashboard' : 'dashboard') } : null;

    return (
        <MotionConfig reducedMotion="user">
            <div className={cn('flex min-h-screen flex-col overflow-x-clip bg-white [color-scheme:light]', className)}>
                <a href="#konten" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[80] focus:rounded-full focus:bg-white focus:px-4 focus:py-2 focus:font-bold focus:text-primary-900 focus:shadow-lg">
                    Lewati ke konten
                </a>
                {/* .landing-ds + contents: token warna design system hanya untuk kerangka, tanpa mengubah tata letak */}
                <div className="landing-ds contents font-jakarta">
                    <TopBar whatsapp={company.whatsapp} collapsed={scroll.scrolled} />
                    <Navbar scroll={scroll} account={account} onHome={onHome} />
                </div>

                <main id="konten" className={cn('flex-1', !onHome && 'pt-32 sm:pt-36')}>{children}</main>

                <div className="landing-ds pt-16 font-jakarta sm:pt-20">
                    <Footer company={company} onHome={onHome} />
                </div>
                <div className="landing-ds contents font-jakarta">
                    <FloatingActions showTop={scroll.far} chat />
                </div>
            </div>
        </MotionConfig>
    );
}
