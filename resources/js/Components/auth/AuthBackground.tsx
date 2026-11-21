import { IslamicStar } from '@/Components/landing/shared';

/** Latar mint + gelombang hijau & garis emas di pojok kiri atas dan kanan bawah + ornamen islami. */
export default function AuthBackground({ compact = false }: { compact?: boolean }) {
    // compact (portal): gelombang hanya di layar lebar agar tidak menutupi teks di HP
    const wave = compact ? 'hidden lg:block ' : '';
    return (
        <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-gradient-to-br from-[#EAF5EE] via-[#F7FBF8] to-[#E4F1E8]">
            <svg viewBox="0 0 600 300" preserveAspectRatio="none" className={`${wave}absolute -left-10 -top-6 h-[34vh] w-[62vw] max-w-[760px] sm:w-[48vw]`}>
                <defs>
                    <linearGradient id="auth-wave-a" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0" stopColor="#0B4D2A" /><stop offset="1" stopColor="#2E8B57" />
                    </linearGradient>
                </defs>
                <path d="M0 0h600C520 40 430 50 330 90 220 135 150 220 0 250z" fill="url(#auth-wave-a)" />
                <path d="M0 270c150-30 230-120 340-165 100-41 190-50 262-95" fill="none" stroke="#E8B923" strokeWidth="5" strokeLinecap="round" />
                <path d="M0 292c170-34 250-128 360-172 92-37 170-48 240-82" fill="none" stroke="#E8B923" strokeOpacity=".45" strokeWidth="2" />
            </svg>
            <svg viewBox="0 0 600 300" preserveAspectRatio="none" className={`${wave}absolute -bottom-6 -right-10 h-[34vh] w-[62vw] max-w-[760px] rotate-180 sm:w-[48vw]`}>
                <path d="M0 0h600C520 40 430 50 330 90 220 135 150 220 0 250z" fill="url(#auth-wave-a)" />
                <path d="M0 270c150-30 230-120 340-165 100-41 190-50 262-95" fill="none" stroke="#E8B923" strokeWidth="5" strokeLinecap="round" />
            </svg>
            <IslamicStar className="absolute right-[8%] top-[10%] h-40 w-40 text-primary-700 opacity-[0.08]" />
            <IslamicStar className="absolute bottom-[12%] left-[6%] h-52 w-52 text-primary-700 opacity-[0.07]" />
            <IslamicStar className="absolute left-[40%] top-[4%] h-24 w-24 text-gold-500 opacity-[0.12]" />
        </div>
    );
}
