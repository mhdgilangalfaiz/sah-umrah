import { Link, useForm } from '@inertiajs/react';
import GuestLayout from '@/Layouts/GuestLayout';
import { Input } from '@/Components/ui';

export default function ForgotPassword({ status }) {
    const { data, setData, post, processing, errors } = useForm({ email: '' });

    return (
        <GuestLayout title="Lupa Kata Sandi">
            <div className="card card-pad">
                <h1 className="text-2xl">Lupa kata sandi?</h1>
                <p className="mt-1 text-sm text-slate-500">Masukkan email akun Anda, kami akan mengirim tautan untuk mengatur ulang kata sandi.</p>
                {status && <div className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{status}</div>}
                <form onSubmit={(e) => { e.preventDefault(); post(route('password.email')); }} className="mt-6 space-y-4">
                    <Input label="Email" type="email" value={data.email} onChange={(e) => setData('email', e.target.value)} error={errors.email} required autoFocus />
                    <button disabled={processing} className="btn-primary w-full">Kirim tautan reset</button>
                </form>
                <p className="mt-6 text-center text-sm"><Link href={route('login')} className="text-brand-700 hover:underline">Kembali ke halaman masuk</Link></p>
            </div>
        </GuestLayout>
    );
}
