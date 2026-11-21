import { Link } from '@inertiajs/react';
import { ArrowRight } from 'lucide-react';
import { Stagger, StaggerItem } from './motion';
import PackageCard from './PackageCard';
import { arrowShift, btnSecondary, SectionHeading } from './shared';
import type { LandingContent, LandingPackage } from './types';

interface PackagesProps {
    heading: LandingContent['packages'];
    packages: LandingPackage[];
    whatsapp: string;
}

export default function Packages({ heading, packages, whatsapp }: PackagesProps) {
    const allLink = (
        <Link href={route('packages.index')} className={`${btnSecondary} !px-5 !py-2.5 !text-sm`}>
            Lihat Semua Paket <ArrowRight className={arrowShift} aria-hidden="true" />
        </Link>
    );

    return (
        <section id="paket" className="scroll-mt-24 py-16 sm:py-20">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <SectionHeading title={heading.title} subtitle={heading.subtitle} action={allLink} />
                {packages.length ? (
                    <Stagger gap={0.1} className="grid gap-x-5 gap-y-8 pt-3 sm:grid-cols-2 lg:grid-cols-4">
                        {packages.map((p) => (
                            <StaggerItem key={p.id} className="h-full">
                                <PackageCard p={p} badge={heading.badge} whatsapp={whatsapp} />
                            </StaggerItem>
                        ))}
                    </Stagger>
                ) : (
                    <p className="rounded-2xl border border-dashed border-primary-100 p-10 text-center text-neutral-600">Paket umrah segera hadir.</p>
                )}
                <div className="mt-10 flex justify-center xl:hidden">{allLink}</div>
            </div>
        </section>
    );
}
