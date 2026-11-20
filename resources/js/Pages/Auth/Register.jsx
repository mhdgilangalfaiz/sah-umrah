import { Link, useForm } from '@inertiajs/react';
import { UserPlus } from 'lucide-react';
import GuestLayout from '@/Layouts/GuestLayout';
import { Input } from '@/Components/ui';
import GoogleButton from './GoogleButton';

export default function Register({ googleEnabled }) {
    const { data, setData, post, processing, errors, reset } = useForm({ name: '', email: '', password: '', password_confirmation: '', consent: false });

    const submit = (e) => {
        e.preventDefault();
        post(route('register'), { onFinish: () => reset('password', 'password_confirmation') });
    };
    const gmailWarn = data.email.includes('@') && !data.email.toLowerCase().endsWith('@gmail.com');

    return (
        <GuestLayout title="Daftar Akun">
            <div className="card card-pad">
                <h1 className="text-3xl">Daftar Akun</h1>
                <p className="mt-1 text-sm text-slate-500">Buat akun untuk memesan paket umrah, tiket, dan visa.</p>

                {googleEnabled && (
                    <>
                        <GoogleButton className="mt-6" />
                        <div className="my-5 flex items-center gap-3 text-xs text-slate-400"><span className="h-px flex-1 bg-slate-200" />atau daftar dengan email<span className="h-px flex-1 bg-slate-200" /></div>
                    </>
                )}

                <form onSubmit={submit} className="mt-6 space-y-4">
                    <Input label="Nama lengkap" value={data.name} onChange={(e) => setData('name', e.target.value)} error={errors.name} required autoFocus autoComplete="name" />
                    <Input label="Email Gmail" type="email" placeholder="nama@gmail.com" value={data.email} onChange={(e) => setData('email', e.target.value)}
                        error={errors.email || (gmailWarn ? 'Pendaftaran wajib menggunakan alamat @gmail.com.' : null)} required autoComplete="username" />
                    <Input label="Kata sandi" type="password" value={data.password} onChange={(e) => setData('password', e.target.value)} error={errors.password} hint="Minimal 8 karakter, berisi huruf dan angka" required autoComplete="new-password" />
                    <Input label="Ulangi kata sandi" type="password" value={data.password_confirmation} onChange={(e) => setData('password_confirmation', e.target.value)} error={errors.password_confirmation} required autoComplete="new-password" />
                    <label className="flex items-start gap-3 rounded-xl bg-sand-100 p-3 text-xs leading-relaxed text-slate-600">
                        <input type="checkbox" className="mt-0.5" checked={data.consent} onChange={(e) => setData('consent', e.target.checked)} />
                        <span>
                            Saya menyetujui <Link href={route('pages.show', 'syarat-ketentuan')} className="font-semibold text-brand-700 underline" target="_blank">Syarat & Ketentuan</Link> serta
                            pemrosesan data pribadi sesuai <Link href={route('pages.show', 'kebijakan-privasi')} className="font-semibold text-brand-700 underline" target="_blank">Kebijakan Privasi</Link> (UU No. 27/2022 tentang Pelindungan Data Pribadi).
                        </span>
                    </label>
                    {errors.consent && <p className="error">{errors.consent}</p>}
                    <button disabled={processing || gmailWarn} className="btn-primary w-full py-3"><UserPlus className="h-4 w-4" />{processing ? 'Mendaftarkan…' : 'Daftar'}</button>
                </form>
                <p className="mt-6 text-center text-sm text-slate-600">
                    Sudah punya akun? <Link href={route('login')} className="font-semibold text-brand-700 hover:underline">Masuk</Link>
                </p>
            </div>
        </GuestLayout>
    );
}
