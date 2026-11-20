import { Link, useForm } from '@inertiajs/react';
import { Eye, EyeOff, LogIn } from 'lucide-react';
import { useState } from 'react';
import GuestLayout from '@/Layouts/GuestLayout';
import { Input } from '@/Components/ui';
import GoogleButton from './GoogleButton';

export default function Login({ status, canResetPassword, googleEnabled }) {
    const [show, setShow] = useState(false);
    const { data, setData, post, processing, errors, reset } = useForm({ email: '', password: '', remember: false });

    const submit = (e) => {
        e.preventDefault();
        post(route('login'), { onFinish: () => reset('password') });
    };

    return (
        <GuestLayout title="Masuk">
            <div className="card card-pad">
                <h1 className="text-3xl">Masuk</h1>
                <p className="mt-1 text-sm text-slate-500">Pelanggan & admin masuk melalui halaman yang sama.</p>

                {status && <div className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{status}</div>}

                {googleEnabled && (
                    <>
                        <GoogleButton className="mt-6" />
                        <div className="my-5 flex items-center gap-3 text-xs text-slate-400"><span className="h-px flex-1 bg-slate-200" />atau dengan email<span className="h-px flex-1 bg-slate-200" /></div>
                    </>
                )}

                <form onSubmit={submit} className="mt-6 space-y-4">
                    <Input label="Email" type="email" autoComplete="username" value={data.email} onChange={(e) => setData('email', e.target.value)} error={errors.email} hint="Pelanggan wajib menggunakan alamat @gmail.com" required autoFocus />
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
                    <div className="flex items-center justify-between">
                        <label className="flex items-center gap-2 text-sm text-slate-600">
                            <input type="checkbox" checked={data.remember} onChange={(e) => setData('remember', e.target.checked)} /> Ingat saya
                        </label>
                        {canResetPassword && <Link href={route('password.request')} className="text-sm font-medium text-brand-700 hover:underline">Lupa kata sandi?</Link>}
                    </div>
                    <button disabled={processing} className="btn-primary w-full py-3"><LogIn className="h-4 w-4" />{processing ? 'Memproses…' : 'Masuk'}</button>
                </form>
                <p className="mt-6 text-center text-sm text-slate-600">
                    Belum punya akun? <Link href={route('register')} className="font-semibold text-brand-700 hover:underline">Daftar sekarang</Link>
                </p>
            </div>
        </GuestLayout>
    );
}
