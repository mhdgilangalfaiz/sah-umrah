import { Head } from '@inertiajs/react';
import { Ellipsis, FileText, House, Landmark, Receipt } from 'lucide-react';
import { MotionConfig } from 'motion/react';
import { useState, type ReactNode } from 'react';
import AuthBackground from '@/Components/auth/AuthBackground';
import BottomNav from '@/Components/landing/BottomNav';
import FloatingActions from '@/Components/landing/FloatingActions';
import { useScrollState } from '@/Components/landing/hooks';
import { cn } from '@/Components/landing/lib';
import { Sheet } from '@/Components/landing/ui/sheet';
import SidebarNav from '@/Components/portal/Sidebar';
import Topbar from '@/Components/portal/Topbar';
import { Flash } from '@/Components/ui';

const KEY = 'sah.portal.sidebar';

function readCollapsed(): boolean {
    try { return window.localStorage.getItem(KEY) === '1'; } catch { return false; }
}

/** Menu yang tampil langsung di BottomNav HP; sisanya lewat tombol "Lainnya". */
const MOBILE_MENU = [
    { label: 'Dashboard', route: 'dashboard', icon: House },
    { label: 'Umrah', route: 'customer.bookings.index', match: 'customer.bookings.*', icon: Landmark },
    { label: 'Tagihan', route: 'customer.billing', icon: Receipt },
    { label: 'Dokumen', route: 'customer.documents.index', icon: FileText },
];
const isCurrent = (m: { route: string; match?: string }) => route().current(m.route) || (!!m.match && route().current(m.match));

/**
 * Layout area pribadi jamaah: latar mint seperti halaman login, sidebar kaca yang bisa dilipat
 * (status di localStorage), topbar dengan tautan situs, notifikasi, dan menu akun.
 */
export default function PortalLayout({ title, children }: { title?: string; children: ReactNode }) {
    const [collapsed, setCollapsed] = useState(readCollapsed);
    const [sheet, setSheet] = useState(false);
    const scroll = useScrollState();

    const toggle = () => setCollapsed((c) => {
        try { window.localStorage.setItem(KEY, c ? '0' : '1'); } catch { /* penyimpanan tidak tersedia */ }
        return !c;
    });

    return (
        <MotionConfig reducedMotion="user">
            {title && <Head title={title} />}
            <AuthBackground compact />
            <Flash />

            <div className="landing-ds mx-auto flex min-h-screen max-w-[1680px] gap-6 p-4 font-jakarta text-neutral-900 [color-scheme:light] sm:p-6">
                <aside className={cn('glassy sticky top-6 from-white/95 via-white/85 to-white/75 hidden h-[calc(100vh-3rem)] shrink-0 rounded-[1.75rem] p-4 transition-[width] duration-300 lg:block', collapsed ? 'w-[84px] px-3' : 'w-[268px]')}>
                    <SidebarNav collapsed={collapsed} pillId="portal-pill" onToggle={toggle} />
                </aside>

                <div className="min-w-0 flex-1">
                    <Topbar />
                    <main className="mt-6 pb-24 lg:pb-0">{children}</main>
                </div>
            </div>

            {/* Chat Bot (chatbot internal) + kembali ke atas, sama seperti di situs */}
            <div className="landing-ds font-jakarta">
                <FloatingActions showTop={scroll.far} chat />
                {/* HP/tablet: 4 menu utama + "Lainnya" (membuka daftar menu lengkap) di bar kaca bawah */}
                <BottomNav label="Menu portal jamaah" idPrefix="portal-bnav" items={[
                    ...MOBILE_MENU.map((m) => ({ key: m.route, label: m.label, icon: m.icon, href: route(m.route), active: !sheet && isCurrent(m) })),
                    { key: 'more', label: 'Lainnya', icon: Ellipsis, expanded: sheet, onClick: () => setSheet(true), active: sheet || !MOBILE_MENU.some(isCurrent) },
                ]} />
            </div>

            <Sheet open={sheet} onOpenChange={setSheet} title="Menu portal jamaah" side="left" className="bg-gradient-to-b from-[#F4FAF6] to-white p-4">
                <SidebarNav pillId="portal-pill-sheet" onNavigate={() => setSheet(false)} />
            </Sheet>
        </MotionConfig>
    );
}
