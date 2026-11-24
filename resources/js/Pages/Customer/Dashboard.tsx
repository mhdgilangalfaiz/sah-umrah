import { Link, usePage } from '@inertiajs/react';
import { FileWarning } from 'lucide-react';
import UserAvatar from '@/Components/portal/UserAvatar';
import { Reveal } from '@/Components/landing/motion';
import ActiveTrip from '@/Components/portal/ActiveTrip';
import PromoBanner from '@/Components/portal/PromoBanner';
import { NotificationsCard } from '@/Components/portal/SideCards';
import TripCalendar from '@/Components/portal/TripCalendar';
import StatCards from '@/Components/portal/StatCards';
import type { DashboardProps } from '@/Components/portal/types';
import PortalLayout from '@/Layouts/PortalLayout';

/** Dashboard jamaah (/dashboard). */
export default function Dashboard({ stats, activeTrip, calendarEvents = [], notifications }: DashboardProps) {
    const { auth } = usePage<{ auth: { user: { name: string; avatar: string | null } } }>().props;
    const name = auth.user.name;

    return (
        <PortalLayout title="Dashboard">
            <Reveal className="flex items-center gap-4">
                <UserAvatar name={name} src={auth.user.avatar} className="h-12 w-12 text-lg shadow-lg shadow-primary-900/20 sm:h-14 sm:w-14" />
                <div className="min-w-0">
                    <h1 className="font-jakarta text-lg leading-snug font-extrabold tracking-tight text-neutral-900 sm:text-xl lg:text-2xl">
                        Assalamu'alaikum, {name} <span aria-hidden="true">👋</span>
                    </h1>
                    <p className="text-sm text-neutral-600">Selamat datang di portal jamaah SAH.</p>
                </div>
            </Reveal>

            <div className="mt-5"><StatCards stats={stats} /></div>

            {stats.documents_pending > 0 && (
                <Reveal delay={0.1}>
                    <Link href={route('customer.documents.index')} className="mt-4 flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50/90 p-4 text-sm font-medium text-amber-900">
                        <FileWarning className="h-5 w-5 shrink-0" aria-hidden="true" />
                        {stats.documents_pending} dokumen belum terverifikasi. Pastikan dokumen lengkap sebelum keberangkatan →
                    </Link>
                </Reveal>
            )}

            <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
                <div className="space-y-6">
                    <Reveal delay={0.1}><ActiveTrip trip={activeTrip} /></Reveal>
                    <Reveal delay={0.2}><PromoBanner /></Reveal>
                </div>
                <div className="space-y-6">
                    {/* kalender berisi jatuh tempo cicilan + keberangkatan (menggantikan kartu Jadwal Cicilan) */}
                    <Reveal delay={0.15}><TripCalendar events={calendarEvents} /></Reveal>
                    <Reveal delay={0.25}><NotificationsCard items={notifications} /></Reveal>
                </div>
            </div>
        </PortalLayout>
    );
}
