import { Link } from '@inertiajs/react';
import { cx } from '@/Components/ui';

/** Warna lembut kartu: latar gradasi + gelombang bawah. */
const TONES = {
    green: ['from-white via-white to-[#E5F5E9]', '#CDEBD5'],
    red: ['from-white via-white to-[#FCE6E6]', '#F7CFCF'],
    blue: ['from-white via-white to-[#E3EFFB]', '#CBE0F5'],
    gold: ['from-white via-white to-[#FCF0DA]', '#F5DFB5'],
};

/**
 * Kartu statistik bergaya ilustrasi: label, angka besar, keterangan; gambar 3D di kanan bawah
 * dengan tepi kiri/atas memudar ke latar kartu. Bila diberi href, kartu bisa diklik.
 */
export default function IllustratedStat({ label, value, sub, image, tone = 'green', href, className }) {
    const [bg, wave] = TONES[tone] ?? TONES.green;
    const Tag = href ? Link : 'div';

    return (
        <Tag href={href}
            className={cx('group relative flex min-h-[148px] overflow-hidden rounded-3xl border border-white bg-gradient-to-br p-5 shadow-[0_10px_30px_-16px_rgba(11,77,42,0.3),inset_0_1px_0_#fff] transition',
                href && 'hover:-translate-y-0.5 hover:shadow-[0_16px_36px_-16px_rgba(11,77,42,0.4)]', bg, className)}>
            <svg viewBox="0 0 400 60" preserveAspectRatio="none" aria-hidden="true" className="absolute inset-x-0 bottom-0 h-12 w-full">
                <path d="M0 30c70-22 140-22 210-4s130 18 190-6v40H0z" fill={wave} opacity=".55" />
            </svg>
            <img src={image} alt="" aria-hidden="true" loading="lazy"
                className="pointer-events-none absolute bottom-0 right-0 h-auto max-h-[80%] w-[44%] max-w-[190px] object-contain object-right-bottom mix-blend-multiply transition-transform duration-300 [mask-image:linear-gradient(to_right,transparent,#000_28%),linear-gradient(to_bottom,transparent,#000_18%)] [mask-composite:intersect] group-hover:scale-105" />
            <div className="relative z-10 max-w-[58%]">
                <p className="text-sm font-bold text-slate-700">{label}</p>
                <p className="mt-1 whitespace-nowrap font-jakarta text-[clamp(1.35rem,1.7vw,1.85rem)] font-extrabold leading-tight tracking-tight text-slate-900">{value}</p>
                {sub && <p className="mt-1 text-xs leading-snug text-slate-500">{sub}</p>}
            </div>
        </Tag>
    );
}
