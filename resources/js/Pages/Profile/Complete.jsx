import { Link, useForm, usePage } from '@inertiajs/react';
import { ShieldCheck } from 'lucide-react';
import GuestLayout from '@/Layouts/GuestLayout';
import ProfileFields from '@/Components/ProfileFields';

export default function Complete({ profile, needsConsent }) {
    const { auth } = usePage().props;
    const { data, setData, post, processing, errors } = useForm({ ...profile, consent: false });

    return (
        <GuestLayout title="Lengkapi Profil">
            <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-gold-600">Langkah terakhir</p>
                <h1 className="mt-1 text-2xl">Lengkapi data profil Anda</h1>
                <p className="mt-1 text-sm text-slate-500">
                    Data ini diperlukan agar admin dapat mengenali Anda dan untuk keperluan dokumen perjalanan. Kode pelanggan Anda: <b className="text-brand-700">{auth.user.customer_code}</b>
                </p>
                <form onSubmit={(e) => { e.preventDefault(); post(route('profile.complete.store')); }} className="mt-6 space-y-5">
                    <ProfileFields data={data} setData={setData} errors={errors} />
                    {needsConsent && (
                        <label className="flex items-start gap-3 rounded-xl bg-sand-100 p-3 text-xs leading-relaxed text-slate-600">
                            <input type="checkbox" className="mt-0.5" checked={data.consent} onChange={(e) => setData('consent', e.target.checked)} />
                            <span>Saya menyetujui pemrosesan data pribadi sesuai <Link href={route('pages.show', 'kebijakan-privasi')} target="_blank" className="font-semibold text-brand-700 underline">Kebijakan Privasi</Link> (UU PDP).</span>
                        </label>
                    )}
                    {errors.consent && <p className="error">{errors.consent}</p>}
                    <button disabled={processing} className="btn-primary w-full py-3">Simpan & Lanjutkan</button>
                    <p className="flex items-center justify-center gap-1.5 text-xs text-slate-500"><ShieldCheck className="h-3.5 w-3.5 text-brand-600" />NIK disimpan terenkripsi dan tidak dibagikan ke pihak lain.</p>
                </form>
            </div>
        </GuestLayout>
    );
}
