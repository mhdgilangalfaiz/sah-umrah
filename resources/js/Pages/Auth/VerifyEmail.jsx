import { Link, useForm } from '@inertiajs/react';
import { MailCheck } from 'lucide-react';
import GuestLayout from '@/Layouts/GuestLayout';

export default function VerifyEmail({ status }) {
    const { post, processing } = useForm({});

    return (
        <GuestLayout title="Verifikasi Email">
            <div className="card card-pad text-center">
                <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-brand-50 text-brand-700"><MailCheck className="h-7 w-7" /></div>
                <h1 className="mt-4 text-2xl">Verifikasi email Anda</h1>
                <p className="mt-2 text-sm text-slate-600">
                    Terima kasih telah mendaftar! Kami telah mengirim tautan verifikasi ke email Anda. Silakan klik tautan tersebut untuk mengaktifkan akun dan mulai melakukan pemesanan.
                </p>
                {status === 'verification-link-sent' && <div className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">Tautan verifikasi baru telah dikirim.</div>}
                <form onSubmit={(e) => { e.preventDefault(); post(route('verification.send')); }} className="mt-6 space-y-3">
                    <button disabled={processing} className="btn-primary w-full">Kirim ulang email verifikasi</button>
                    <Link href={route('logout')} method="post" as="button" className="btn-ghost w-full">Keluar</Link>
                </form>
            </div>
        </GuestLayout>
    );
}
