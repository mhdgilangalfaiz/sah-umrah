import { Link, useForm } from '@inertiajs/react';
import { Lock, LockKeyhole, Mail, User, UserPlus } from 'lucide-react';
import type { FormEvent } from 'react';
import { Divider, GoogleSoon, IconInput, PasswordInput, submitBtn } from './fields';
import PasswordStrength from './PasswordStrength';

interface RegisterFormProps {
    busy: boolean;
    onResult: (ok: boolean, redirectTo?: string) => void;
    onSwitch: () => void;
}

export default function RegisterForm({ busy, onResult, onSwitch }: RegisterFormProps) {
    const form = useForm({ name: '', email: '', password: '', password_confirmation: '', consent: false });
    const { data, errors } = form;

    const gmailWarn = data.email.includes('@') && !data.email.trim().toLowerCase().endsWith('@gmail.com')
        ? 'Pendaftaran wajib menggunakan alamat @gmail.com.' : undefined;
    const mismatch = data.password_confirmation && data.password_confirmation !== data.password ? 'Kata sandi tidak sama.' : undefined;

    const submit = (e: FormEvent) => {
        e.preventDefault();
        if (busy) return;
        form.post(route('register'), {
            preserveState: true,
            preserveScroll: true,
            onSuccess: (page) => onResult(true, page.props.redirectTo as string | undefined),
            onError: () => onResult(false),
            onFinish: () => form.reset('password', 'password_confirmation'),
        });
    };

    return (
        <form onSubmit={submit} noValidate className="space-y-3">
            <div className="text-center">
                <h1 className="font-jakarta text-2xl font-extrabold tracking-tight text-neutral-900">Buat Akun Baru</h1>
                <p className="mt-1 text-sm text-neutral-600">Daftar untuk memesan paket umrah, tiket, dan visa</p>
            </div>

            <IconInput icon={User} label="Nama lengkap" name="name" autoComplete="name" value={data.name}
                onChange={(e) => form.setData('name', e.target.value)} error={errors.name} />
            <IconInput icon={Mail} label="Email (nama@gmail.com)" name="email" type="email" autoComplete="username" value={data.email}
                onChange={(e) => form.setData('email', e.target.value)} error={errors.email ?? gmailWarn} />
            <div className="grid gap-3 sm:grid-cols-2">
                <PasswordInput icon={Lock} label="Kata sandi" name="password" autoComplete="new-password" value={data.password}
                    onChange={(e) => form.setData('password', e.target.value)} error={errors.password} />
                <PasswordInput icon={LockKeyhole} label="Ulangi sandi" name="password_confirmation" autoComplete="new-password" value={data.password_confirmation}
                    onChange={(e) => form.setData('password_confirmation', e.target.value)} error={errors.password_confirmation ?? mismatch} />
            </div>
            <PasswordStrength password={data.password} />

            <div>
                <label className="flex cursor-pointer items-start gap-2.5 text-xs leading-relaxed text-neutral-900">
                    <input type="checkbox" checked={data.consent} onChange={(e) => form.setData('consent', e.target.checked)} required aria-invalid={!!errors.consent}
                        className={`mt-0.5 h-4 w-4 shrink-0 rounded text-primary-700 focus:ring-primary-500 ${errors.consent ? 'border-red-500' : 'border-primary-500'}`} />
                    <span>
                        Saya menyetujui <Link href={route('pages.show', 'syarat-ketentuan')} target="_blank" className="font-bold text-primary-700 underline">Syarat &amp; Ketentuan</Link> serta{' '}
                        <Link href={route('pages.show', 'kebijakan-privasi')} target="_blank" className="font-bold text-primary-700 underline">Kebijakan Privasi</Link> SAH
                    </span>
                </label>
                {errors.consent && <p className="mt-1 text-xs font-medium text-red-600">{errors.consent}</p>}
            </div>

            <button type="submit" disabled={form.processing || busy || !!gmailWarn || !!mismatch} className={submitBtn}>
                <UserPlus className="h-4 w-4" aria-hidden="true" /> {form.processing ? 'Mendaftarkan…' : 'Daftar'}
            </button>

            <Divider />
            <GoogleSoon label="Daftar dengan Google" />

            <p className="text-center text-sm text-neutral-600">
                Sudah punya akun?{' '}
                <button type="button" onClick={onSwitch} className="font-bold text-primary-700 underline-offset-2 hover:underline">Masuk di sini</button>
            </p>
        </form>
    );
}
