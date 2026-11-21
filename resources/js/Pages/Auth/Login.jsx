import { Link, useForm } from '@inertiajs/react';
import { Eye, EyeOff, LogIn, RefreshCw, ShieldAlert } from 'lucide-react';
import { useEffect, useState } from 'react';
import GuestLayout from '@/Layouts/GuestLayout';
import { Input } from '@/Components/ui';
import GoogleButton from './GoogleButton';

const clock = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

export default function Login({ status, canResetPassword, googleEnabled, captchaEnabled }) {
    const [show, setShow] = useState(false);
    const [captchaKey, setCaptchaKey] = useState(() => Date.now());
    const [lockLeft, setLockLeft] = useState(0); // detik tersisa sebelum boleh mencoba lagi
    const { data, setData, post, processing, errors, reset } = useForm({ email: '', password: '', captcha: '', remember: false });

    // Server mengirim lama kunci (detik) setelah gagal → hitung mundur
    useEffect(() => { if (errors.lockout) setLockLeft(Number(errors.lockout) || 0); }, [errors]);
    useEffect(() => {
        if (lockLeft <= 0) return undefined;
        const t = setTimeout(() => setLockLeft((s) => Math.max(0, s - 1)), 1000);
        return () => clearTimeout(t);
    }, [lockLeft]);

    const refreshCaptcha = () => { setCaptchaKey(Date.now()); setData('captcha', ''); };

    const submit = (e) => {
        e.preventDefault();
        if (lockLeft > 0) return;
        post(route('login'), {
            onFinish: () => { reset('password', 'captcha'); setCaptchaKey(Date.now()); }, // captcha sekali pakai
        });
    };

    const locked = lockLeft > 0;

    return (
        <GuestLayout title="Masuk">
            <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-600">Selamat datang kembali</p>
                <h1 className="mt-1">Masuk ke akun Anda</h1>
                <p className="mt-1 text-sm text-slate-500">Kelola pesanan umrah, tiket, dan visa Anda dalam satu tempat.</p>

                {status && <div className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{status}</div>}

                {googleEnabled && (
                    <>
                        <GoogleButton className="mt-6" />
                        <div className="my-5 flex items-center gap-3 text-xs text-slate-400"><span className="h-px flex-1 bg-slate-200" />atau dengan email<span className="h-px flex-1 bg-slate-200" /></div>
                    </>
                )}

                <form onSubmit={submit} className="mt-5 space-y-3">
                    <Input label="Email" type="email" autoComplete="username" value={data.email} onChange={(e) => setData('email', e.target.value)} error={locked ? null : errors.email} required autoFocus />
                    <div>
                        <label className="label">Kata sandi</label>
                        <div className="relative">
                            <input type={show ? 'text' : 'password'} autoComplete="current-password" className="input pr-11" value={data.password} onChange={(e) => setData('password', e.target.value)} required />
                            <button type="button" onClick={() => setShow((s) => !s)} className="absolute inset-y-0 right-0 px-3 text-slate-400 hover:text-slate-600" aria-label="Tampilkan kata sandi">
                                {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                        </div>
                        {errors.password && <p className="error">{errors.password}</p>}
                    </div>

                    {captchaEnabled && (
                        <div>
                            <label className="label" htmlFor="captcha">Kode keamanan</label>
                            <div className="flex items-center gap-2">
                                <input id="captcha" className="input min-w-0 flex-1 uppercase tracking-[0.2em]" autoComplete="off" autoCapitalize="characters" spellCheck={false} maxLength={10}
                                    placeholder="Ketik kode" value={data.captcha} onChange={(e) => setData('captcha', e.target.value.toUpperCase())} required />
                                <img src={`${route('captcha.login')}?t=${captchaKey}`} alt="Kode captcha" width={180} height={56}
                                    className="h-11 w-[142px] shrink-0 select-none rounded-lg border border-slate-200 bg-brand-50" draggable={false} />
                                <button type="button" onClick={refreshCaptcha} className="btn-ghost btn-sm shrink-0 px-2" aria-label="Ganti kode" title="Ganti kode">
                                    <RefreshCw className="h-4 w-4" />
                                </button>
                            </div>
                            {errors.captcha && <p className="error">{errors.captcha}</p>}
                        </div>
                    )}

                    {locked && (
                        <div className="flex items-start gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-700" role="alert">
                            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
                            <span>
                                {errors.email?.startsWith('Terlalu') ? 'Terlalu banyak percobaan masuk yang gagal.' : 'Email atau kata sandi salah.'}
                                {' '}Demi keamanan, coba lagi dalam <b className="tabular-nums">{clock(lockLeft)}</b>.
                            </span>
                        </div>
                    )}

                    <div className="flex items-center justify-between">
                        <label className="flex items-center gap-2 text-sm text-slate-600">
                            <input type="checkbox" checked={data.remember} onChange={(e) => setData('remember', e.target.checked)} /> Ingat saya
                        </label>
                        {canResetPassword && <Link href={route('password.request')} className="text-sm font-medium text-brand-700 hover:underline">Lupa kata sandi?</Link>}
                    </div>
                    <button disabled={processing || locked} className="btn-primary w-full py-2.5">
                        <LogIn className="h-4 w-4" />{locked ? `Tunggu ${clock(lockLeft)}` : processing ? 'Memproses…' : 'Masuk'}
                    </button>
                </form>
                <p className="mt-4 text-center text-sm text-slate-600">
                    Belum punya akun? <Link href={route('register')} className="font-semibold text-brand-700 hover:underline">Daftar sekarang</Link>
                </p>
            </div>
        </GuestLayout>
    );
}
