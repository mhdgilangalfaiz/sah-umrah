import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/Components/landing/lib';

interface PortalCardProps {
    title: string;
    icon: LucideIcon;
    action?: ReactNode;
    children: ReactNode;
    className?: string;
}

/** Kartu kaca putih untuk blok dashboard. */
export default function PortalCard({ title, icon: Icon, action, children, className }: PortalCardProps) {
    return (
        <section className={cn('rounded-3xl border border-white bg-gradient-to-br from-white/85 via-white/70 to-white/55 p-5 shadow-[0_10px_30px_-16px_rgba(11,77,42,0.3),inset_0_1px_0_#fff]', className)}>
            <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="flex items-center gap-2.5 font-jakarta text-base font-extrabold tracking-tight text-neutral-900 sm:text-lg">
                    <Icon className="h-5 w-5 text-primary-700" aria-hidden="true" /> {title}
                </h2>
                {action}
            </div>
            {children}
        </section>
    );
}
