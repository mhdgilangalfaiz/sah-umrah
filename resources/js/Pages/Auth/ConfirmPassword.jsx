import { useForm } from '@inertiajs/react';
import GuestLayout from '@/Layouts/GuestLayout';
import { Input } from '@/Components/ui';

export default function ConfirmPassword() {
    const { data, setData, post, processing, errors, reset } = useForm({ password: '' });

    return (
        <GuestLayout title="Konfirmasi Kata Sandi">
            <div className="card card-pad">
                <h1 className="text-2xl">Konfirmasi kata sandi</h1>
                <p className="mt-1 text-sm text-slate-500">Ini area aman. Mohon konfirmasi kata sandi Anda untuk melanjutkan.</p>
                <form onSubmit={(e) => { e.preventDefault(); post(route('password.confirm'), { onFinish: () => reset('password') }); }} className="mt-6 space-y-4">
                    <Input label="Kata sandi" type="password" value={data.password} onChange={(e) => setData('password', e.target.value)} error={errors.password} required autoFocus />
                    <button disabled={processing} className="btn-primary w-full">Konfirmasi</button>
                </form>
            </div>
        </GuestLayout>
    );
}
