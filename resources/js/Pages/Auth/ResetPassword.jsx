import { useForm } from '@inertiajs/react';
import GuestLayout from '@/Layouts/GuestLayout';
import { Input } from '@/Components/ui';

export default function ResetPassword({ token, email }) {
    const { data, setData, post, processing, errors, reset } = useForm({ token, email, password: '', password_confirmation: '' });

    return (
        <GuestLayout title="Atur Ulang Kata Sandi">
            <div>
                <h1 className="text-2xl">Atur ulang kata sandi</h1>
                <form onSubmit={(e) => { e.preventDefault(); post(route('password.store'), { onFinish: () => reset('password', 'password_confirmation') }); }} className="mt-6 space-y-4">
                    <Input label="Email" type="email" value={data.email} onChange={(e) => setData('email', e.target.value)} error={errors.email} required />
                    <Input label="Kata sandi baru" type="password" value={data.password} onChange={(e) => setData('password', e.target.value)} error={errors.password} required autoFocus />
                    <Input label="Ulangi kata sandi" type="password" value={data.password_confirmation} onChange={(e) => setData('password_confirmation', e.target.value)} error={errors.password_confirmation} required />
                    <button disabled={processing} className="btn-primary w-full">Simpan kata sandi</button>
                </form>
            </div>
        </GuestLayout>
    );
}
