import { Head, Link, router } from '@inertiajs/react';
import { LogIn, UserPlus } from 'lucide-react';
import { AnimatePresence, MotionConfig, motion, useReducedMotion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import AuthBackground from '@/Components/auth/AuthBackground';
import { PLANE_SRC } from '@/Components/auth/AuthPlane';
import { AuthTabs, type AuthMode, type AuthSlide, type PlaneState } from '@/Components/auth/fields';
import LoginForm from '@/Components/auth/LoginForm';
import RegisterForm from '@/Components/auth/RegisterForm';
import VisualPanel from '@/Components/auth/VisualPanel';

interface AuthScreenProps {
    mode: AuthMode;
    status: string | null;
    canResetPassword: boolean;
    captchaEnabled: boolean;
    slides: AuthSlide[];
    /** Diisi setelah login Google berhasil: pesawat langsung terbang lalu menuju alamat ini */
    autoFly?: string | null;
}

const TABS = [
    { key: 'login' as const, label: 'Login', icon: LogIn },
    { key: 'register' as const, label: 'Registrasi', icon: UserPlus },
];
const SWAP = { duration: 0.6, ease: [0.65, 0, 0.35, 1] as const };

function useDesktop(): boolean {
    const query = '(min-width: 1024px)';
    const [desktop, setDesktop] = useState(() => window.matchMedia(query).matches);
    useEffect(() => {
        const mq = window.matchMedia(query);
        const on = () => setDesktop(mq.matches);
        mq.addEventListener('change', on);
        return () => mq.removeEventListener('change', on);
    }, []);
    return desktop;
}

/**
 * Login & Registrasi dalam satu komponen. Desktop: double slider (panel visual & form bertukar tempat).
 * Pesawat: melayang (idle), jatuh saat gagal, terbang lalu menuju dashboard saat berhasil.
 */
export default function AuthScreen({ mode: initialMode, status, canResetPassword, captchaEnabled, slides, autoFly = null }: AuthScreenProps) {
    const [mode, setMode] = useState<AuthMode>(initialMode);
    const [plane, setPlane] = useState<PlaneState>('idle');
    const [planeKey, setPlaneKey] = useState(0);
    const redirectTo = useRef<string | null>(null);
    const desktop = useDesktop();
    const reduce = useReducedMotion();
    const swapped = desktop && mode === 'register';

    const switchMode = (next: AuthMode) => {
        if (next === mode || plane === 'fly') return;
        setMode(next);
        // URL ikut berubah tanpa memuat ulang (state Inertia dipertahankan)
        window.history.replaceState(window.history.state, '', route(next));
    };

    const onResult = (ok: boolean, to?: string) => {
        if (ok) {
            redirectTo.current = to ?? route('dashboard');
            if (reduce) router.visit(redirectTo.current); else setPlane('fly');
            return;
        }
        if (reduce) return;
        setPlane('crash');
    };

    // Kembali dari Google (sudah login): pesawat melayang sebentar lalu terbang, sama seperti login biasa
    useEffect(() => {
        if (!autoFly) return undefined;
        window.history.replaceState(window.history.state, '', route('login')); // alamat rapi selama animasi
        const t = window.setTimeout(() => onResult(true, autoFly), 700);
        return () => window.clearTimeout(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [autoFly]);

    // pesawat jatuh → kembali melayang setelah 1,7 detik
    useEffect(() => {
        if (plane !== 'crash') return undefined;
        const t = window.setTimeout(() => { setPlane('idle'); setPlaneKey((k) => k + 1); }, 1700);
        return () => window.clearTimeout(t);
    }, [plane]);

    const onPlaneDone = () => { if (plane === 'fly' && redirectTo.current) router.visit(redirectTo.current); };

    const visual = <VisualPanel slides={slides} mode={mode} plane={plane} planeKey={planeKey} onPlaneDone={onPlaneDone} />;
    const formPanel = (
        <div className="flex h-full flex-col justify-center rounded-[1.4rem] border border-white bg-gradient-to-br from-white/80 via-white/65 to-white/50 p-5 shadow-[inset_0_1px_0_#fff] sm:p-7">
            <AuthTabs mode={mode} onChange={switchMode} tabs={TABS} />
            <AnimatePresence mode="wait" initial={false}>
                <motion.div key={mode} className="mt-5"
                    initial={{ opacity: 0, x: mode === 'register' ? 28 : -28 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: mode === 'register' ? -28 : 28 }}
                    transition={{ duration: 0.3, ease: 'easeOut' }}>
                    {mode === 'login'
                        ? <LoginForm status={status} canResetPassword={canResetPassword} captchaEnabled={captchaEnabled} busy={plane === 'fly' || !!autoFly} onResult={onResult} onSwitch={() => switchMode('register')} />
                        : <RegisterForm busy={plane === 'fly'} onResult={onResult} onSwitch={() => switchMode('login')} />}
                </motion.div>
            </AnimatePresence>
        </div>
    );

    return (
        <MotionConfig reducedMotion="user">
            <Head title={mode === 'login' ? 'Masuk' : 'Daftar Akun'}>
                <link head-key="preload-slide" rel="preload" as="image" href={slides[0]?.image} />
                <link head-key="preload-plane" rel="preload" as="image" href={PLANE_SRC} />
            </Head>
            <AuthBackground />

            <main className="landing-ds flex min-h-screen items-center justify-center px-4 py-6 font-jakarta text-neutral-900 [color-scheme:light] sm:px-6">
                <div className="auth-fit w-full max-w-[940px]">
                    <Link href={route('home')} className="mx-auto mb-4 block w-fit lg:hidden">
                        <img src="/images/logo-sah.png" alt="SAH - kembali ke beranda" className="h-14 w-auto" />
                    </Link>

                    <div className="glassy relative grid gap-[10px] rounded-[1.75rem] p-[10px] lg:grid-cols-2">
                        {/* panel visual di atas: pesawat yang terbang melintas di depan form */}
                        <motion.div className="relative z-30" initial={false} animate={{ x: swapped ? 'calc(100% + 10px)' : '0%' }} transition={SWAP}>
                            {visual}
                        </motion.div>
                        <motion.div className="relative z-20" initial={false} animate={{ x: swapped ? 'calc(-100% - 10px)' : '0%' }} transition={SWAP}>
                            {formPanel}
                        </motion.div>
                    </div>

                    <p className="mt-4 text-center text-xs text-neutral-600">
                        <Link href={route('home')} className="font-semibold text-primary-700 hover:underline">← Kembali ke beranda</Link>
                    </p>
                </div>
            </main>
        </MotionConfig>
    );
}
