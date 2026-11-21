import { Link, useForm } from '@inertiajs/react';
import { Lock, Mail, RefreshCw, Send, ShieldAlert, ShieldCheck } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { cn } from '@/Components/landing/lib';
import { Divider, GoogleSoon, IconInput, PasswordInput, submitBtn } from './fields';

interface LoginFormProps {
    status: string | null;
    canResetPassword: boolean;
    captchaEnabled: boolean;
    busy: boolean;
    onResult: (ok: boolean, redirectTo?: string) => void;
    onSwitch: () => void;
}

const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

export default function LoginForm({ status, canResetPassword, captchaEnabled, busy, onResult, onSwitch }: LoginFormProps) {
    const form = useForm({ email: '', password: '', captcha: '', remember: false });
    const errors = form.errors as Partial<Record<'email' | 'password' | 'captcha' | 'lockout', string>>;
    const [captchaKey, setCaptchaKey] = useState(() => Date.now());
    const [lockLeft, setLockLeft] = useState(0);

    // Server mengirim lama kunci (detik) setelah gagal berulang → hitung mundur
    useEffect(() => { if (errors.lockout) setLockLeft(Number(errors.lockout) || 0); }, [errors.lockout]);
    useEffect(() => {
        if (lockLeft <= 0) return undefined;
        const t = window.setTimeout(() => setLockLeft((s) => Math.max(0, s - 1)), 1000);
        return () => window.clearTimeout(t);
    }, [lockLeft]);

    const locked = lockLeft > 0;
    const refreshCaptcha = () => { setCaptchaKey(Date.now()); form.setData('captcha', ''); };

    const submit = (e: FormEvent) => {
        e.preventDefault();
        if (locked || busy) return;
        form.post(route('login'), {
            preserveState: true,
            preserveScroll: true,
            onSuccess: (page) => onResult(true, page.props.redirectTo as string | undefined),
            onError: () => onResult(false),
            onFinish: () => { form.reset('password', 'captcha'); setCaptchaKey(Date.now()); }, // captcha sekali pakai
        });
    };

    return (
        <form onSubmit={submit} noValidate className="space-y-3">
            <div className="text-center">
                <h1 className="font-jakarta text-2xl font-extrabold tracking-tight text-neutral-900">Selamat Datang Kembali!</h1>
                <p className="mt-1 text-sm text-neutral-600">Silakan masuk ke akun SAH Anda</p>
            </div>

            {status && <p className="rounded-xl bg-primary-100 px-3 py-2 text-sm text-primary-900" role="status">{status}</p>}

            <IconInput icon={Mail} label="Email" name="email" type="email" autoComplete="username" value={form.data.email}
                onChange={(e) => form.setData('email', e.target.value)} error={locked ? undefined : errors.email} />
            <PasswordInput icon={Lock} label="Kata sandi" name="password" autoComplete="current-password" value={form.data.password}
                onChange={(e) => form.setData('password', e.target.value)} error={errors.password} />

            <div className="flex items-center justify-between gap-3 text-sm">
                <label className="flex cursor-pointer items-center gap-2 text-neutral-900">
                    <input type="checkbox" checked={form.data.remember} onChange={(e) => form.setData('remember', e.target.checked)}
                        className="h-4 w-4 rounded border-primary-500 text-primary-700 focus:ring-primary-500" />
                    Ingat saya (30 hari)
                </label>
                {canResetPassword && <Link href={route('password.request')} className="font-semibold text-primary-700 underline-offset-2 hover:underline">Lupa password?</Link>}
            </div>

            {captchaEnabled && (
                <div className="flex items-start gap-2">
                        <IconInput icon={ShieldCheck} label="Kode" name="captcha" className="min-w-0 flex-1" autoComplete="off" autoCapitalize="characters" spellCheck={false} maxLength={5}
                            value={form.data.captcha} onChange={(e) => form.setData('captcha', e.target.value.toUpperCase())}
                            style={{ letterSpacing: form.data.captcha ? '0.35em' : undefined }} error={errors.captcha} />
                        <img src={`${route('captcha.login')}?t=${captchaKey}`} alt="Kode keamanan" width={180} height={56} draggable={false}
                            className="h-11 w-[118px] shrink-0 select-none rounded-xl border border-primary-900/10 bg-primary-50 object-cover sm:w-[132px]" />
                        <button type="button" onClick={refreshCaptcha} aria-label="Ganti kode keamanan" title="Ganti kode"
                            className="group grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-primary-900/10 bg-white/75 text-primary-700 transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500">
                            <RefreshCw className="h-4 w-4 transition-transform duration-500 group-hover:rotate-180" />
                        </button>
                </div>
            )}

            {locked && (
                <p className="flex items-start gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-700" role="alert">
                    <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                    <span>{errors.email?.startsWith('Terlalu') ? 'Terlalu banyak percobaan masuk yang gagal.' : 'Email atau kata sandi salah.'} Coba lagi dalam <b className="tabular-nums">{clock(lockLeft)}</b>.</span>
                </p>
            )}

            <button type="submit" disabled={form.processing || locked || busy} className={submitBtn}>
                <Send className={cn('h-4 w-4 transition-transform', !form.processing && 'group-hover:-translate-y-0.5 group-hover:translate-x-0.5')} aria-hidden="true" />
                {locked ? `Tunggu ${clock(lockLeft)}` : form.processing ? 'Memproses…' : 'Masuk'}
            </button>

            <Divider />
            <GoogleSoon label="Masuk dengan Google" />

            <p className="text-center text-sm text-neutral-600">
                Belum punya akun?{' '}
                <button type="button" onClick={onSwitch} className="font-bold text-primary-700 underline-offset-2 hover:underline">Daftar Sekarang</button>
            </p>
        </form>
    );
}
