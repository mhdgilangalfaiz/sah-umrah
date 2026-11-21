import { CalendarDays, Clock } from 'lucide-react';
import { motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { waLink } from './lib';
import { WhatsAppIcon } from './shared';

const TZ = 'Asia/Jakarta';
const longDate = new Intl.DateTimeFormat('id-ID', { timeZone: TZ, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const shortDate = new Intl.DateTimeFormat('id-ID', { timeZone: TZ, weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
const clock = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });

function useNow(): Date {
    const [now, setNow] = useState(() => new Date());
    useEffect(() => {
        const t = window.setInterval(() => setNow(new Date()), 1000);
        return () => window.clearInterval(t);
    }, []);
    return now;
}

/** Bar 36px di paling atas: tanggal & jam WIB real-time + konsultasi WhatsApp. Tertutup saat halaman digulir. */
export default function TopBar({ whatsapp, collapsed }: { whatsapp: string; collapsed: boolean }) {
    const now = useNow();
    return (
        <motion.div
            className="fixed inset-x-0 top-0 z-50 h-9 bg-primary-900 text-xs text-white"
            initial={false} animate={{ y: collapsed ? '-100%' : '0%' }} transition={{ duration: 0.3, ease: 'easeOut' }}
            aria-hidden={collapsed}
        >
            <div className="mx-auto flex h-full max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
                <p className="flex items-center gap-2">
                    <CalendarDays className="h-3.5 w-3.5 text-primary-100" aria-hidden="true" />
                    <span className="hidden sm:inline">{longDate.format(now)}</span>
                    <span className="sm:hidden">{shortDate.format(now)}</span>
                </p>
                <div className="flex items-center gap-3 sm:gap-5">
                    <p className="flex items-center gap-2" aria-label="Waktu Indonesia Barat">
                        <Clock className="h-3.5 w-3.5 text-primary-100" aria-hidden="true" />
                        <time className="font-semibold tabular-nums">{clock.format(now).replace(/\./g, ':')}</time>
                        <span className="rounded bg-white/15 px-1.5 py-px text-[10px] font-bold tracking-wide">WIB</span>
                    </p>
                    <a href={waLink(whatsapp, "Assalamu'alaikum, saya ingin konsultasi umrah.")} target="_blank" rel="noopener noreferrer"
                        tabIndex={collapsed ? -1 : 0} aria-label="Konsultasi gratis via WhatsApp"
                        className="flex items-center gap-1.5 rounded-full font-semibold transition hover:text-gold-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">
                        <WhatsAppIcon className="h-4 w-4" />
                        <span className="hidden sm:inline">Konsultasi Gratis</span>
                    </a>
                </div>
            </div>
        </motion.div>
    );
}
