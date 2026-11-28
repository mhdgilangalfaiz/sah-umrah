import { Link } from '@inertiajs/react';
import { MapPin } from 'lucide-react';
import { NAV_ITEMS, SectionLink } from './Navbar';
import { waLink } from './lib';
import { SOCIAL_PATHS, WhatsAppIcon } from './shared';
import type { SharedProps } from './types';

interface FooterProps {
    company: SharedProps['company'];
    onHome: boolean;
}

export default function Footer({ company, onHome }: FooterProps) {
    return (
        <footer id="kontak" className="relative scroll-mt-24 bg-primary-900 pb-24 text-white/80 lg:pb-0">
            {/* gelombang di atas footer */}
            <svg viewBox="0 0 1440 80" preserveAspectRatio="none" aria-hidden="true" className="absolute inset-x-0 bottom-full h-10 w-full text-primary-900 sm:h-16">
                <path fill="currentColor" d="M0 48c120-24 240-36 360-30s240 30 360 30 240-24 360-30 240 6 360 18v44H0z" />
                <path fill="none" stroke="#E8B923" strokeOpacity=".5" strokeWidth="1.5" d="M0 52c120-24 240-36 360-30s240 30 360 30 240-24 360-30 240 6 360 18" />
            </svg>

            <div className="mx-auto grid max-w-7xl gap-10 px-4 pb-10 pt-12 sm:grid-cols-2 sm:px-6 lg:grid-cols-[1.3fr_0.8fr_1.3fr_0.9fr] lg:px-8">
                <div>
                    <img src="/images/logo-sah-footer.png" alt="SAH" loading="lazy" className="h-14 w-auto" />
                    <p className="mt-3 font-jakarta text-base font-extrabold uppercase tracking-wide text-white">{company.name}</p>
                    <p className="mt-2 max-w-xs text-sm leading-relaxed">{company.tagline || 'Melayani perjalanan ibadah umrah dengan amanah & profesional.'}</p>
                </div>

                <div>
                    <FooterHeading>Navigasi</FooterHeading>
                    <ul className="space-y-2.5 text-sm">
                        {NAV_ITEMS.map(({ id, label }) => (
                            <li key={id}>
                                <SectionLink id={id} onHome={onHome} className="rounded transition hover:text-gold-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500">{label}</SectionLink>
                            </li>
                        ))}
                    </ul>
                </div>

                <div>
                    <FooterHeading>Alamat</FooterHeading>
                    <p className="flex gap-2.5 text-sm leading-relaxed"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gold-500" aria-hidden="true" />{company.address}</p>
                    <a href={waLink(company.whatsapp, "Assalamu'alaikum, saya ingin bertanya tentang layanan umrah.")} target="_blank" rel="noopener noreferrer"
                        className="mt-5 inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-bold text-primary-900 transition hover:bg-gold-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 focus-visible:ring-offset-2 focus-visible:ring-offset-primary-900">
                        <WhatsAppIcon className="h-4 w-4 text-primary-700" /> Hubungi via WhatsApp
                    </a>
                </div>

                <div>
                    <FooterHeading>Ikuti Kami</FooterHeading>
                    <ul className="flex gap-3">
                        {company.socials.map((s) => (
                            <li key={s.key}>
                                <a href={s.url ?? '#'} target={s.url ? '_blank' : undefined} rel="noopener noreferrer" aria-label={s.label}
                                    className="grid h-10 w-10 place-items-center rounded-full bg-white text-primary-900 transition hover:-translate-y-0.5 hover:bg-gold-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 focus-visible:ring-offset-2 focus-visible:ring-offset-primary-900">
                                    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="currentColor" aria-hidden="true"><path d={SOCIAL_PATHS[s.key]} /></svg>
                                </a>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>

            <div className="border-t border-white/10">
                <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-5 text-xs sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
                    <p>© {new Date().getFullYear()} {company.name}. All rights reserved.</p>
                    <p className="flex items-center gap-3">
                        <Link href={route('pages.show', 'kebijakan-privasi')} className="hover:text-gold-500">Kebijakan Privasi</Link>
                        <span className="text-white/30" aria-hidden="true">|</span>
                        <Link href={route('pages.show', 'syarat-ketentuan')} className="hover:text-gold-500">Syarat &amp; Ketentuan</Link>
                    </p>
                </div>
            </div>
        </footer>
    );
}

function FooterHeading({ children }: { children: string }) {
    return (
        <p className="mb-4 font-jakarta text-sm font-extrabold uppercase tracking-wider text-white">
            {children}
            <span className="mt-2 block h-0.5 w-8 rounded-full bg-gold-500" />
        </p>
    );
}
