import { useState } from 'react';
import { cn, initials } from '@/Components/landing/lib';

/** Foto profil bulat; tanpa foto (atau gagal dimuat) → inisial di lingkaran hijau. */
export default function UserAvatar({ name, src, className }: { name: string; src?: string | null; className?: string }) {
    const [failed, setFailed] = useState(false);
    const base = cn('grid shrink-0 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-primary-700 to-primary-900 font-jakarta font-extrabold text-white', className);
    if (src && !failed) {
        return <img src={src} alt={`Foto ${name}`} onError={() => setFailed(true)} className={cn(base, 'object-cover')} />;
    }
    return <span className={base} aria-hidden="true">{initials(name)}</span>;
}
