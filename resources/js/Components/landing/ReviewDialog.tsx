import { useForm, usePage } from '@inertiajs/react';
import { CheckCircle2, Star } from 'lucide-react';
import { useState, type FormEvent, type ReactNode } from 'react';
import { cn } from './lib';
import type { SharedProps } from './types';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from './ui/dialog';

interface ReviewDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    packageOptions: string[];
}

const input = 'block w-full rounded-xl border border-primary-100 bg-white px-3.5 py-2.5 text-sm text-neutral-900 placeholder:text-neutral-600/60 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/30';
const thisMonth = new Date().toISOString().slice(0, 7);

/** Form "Tulis Ulasan": dikirim ke server, tampil di landing setelah disetujui admin. */
export default function ReviewDialog({ open, onOpenChange, packageOptions }: ReviewDialogProps) {
    const { auth } = usePage<SharedProps>().props;
    const [sent, setSent] = useState(false);
    const form = useForm({ name: auth.user?.name ?? '', city: '', rating: 5, departure_month: '', package_name: '', content: '', website: '' });

    const submit = (e: FormEvent) => {
        e.preventDefault();
        form.post(route('testimonials.store'), {
            preserveScroll: true,
            onSuccess: () => { setSent(true); form.reset(); },
        });
    };
    const change = (next: boolean) => {
        onOpenChange(next);
        if (!next) window.setTimeout(() => setSent(false), 300);
    };

    return (
        <Dialog open={open} onOpenChange={change}>
            <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl sm:p-8">
                {sent ? (
                    <div className="py-6 text-center">
                        <CheckCircle2 className="mx-auto h-14 w-14 text-primary-500" aria-hidden="true" />
                        <DialogTitle className="mt-4 font-jakarta text-xl font-extrabold text-neutral-900">Jazakallahu khairan!</DialogTitle>
                        <DialogDescription className="mt-2 text-sm text-neutral-600">Ulasan Anda sudah kami terima dan akan tampil setelah diperiksa admin.</DialogDescription>
                        <button type="button" onClick={() => change(false)} className="mt-6 rounded-full border-2 border-primary-700 px-6 py-2.5 text-sm font-bold text-primary-700 hover:bg-primary-50">Tutup</button>
                    </div>
                ) : (
                    <form onSubmit={submit} noValidate>
                        <DialogTitle className="pr-10 font-jakarta text-xl font-extrabold tracking-tight text-neutral-900">Tulis Ulasan</DialogTitle>
                        <DialogDescription className="mt-1 text-sm text-neutral-600">Bagikan pengalaman ibadah umrah Anda bersama kami.</DialogDescription>

                        <fieldset className="mt-5">
                            <legend className="mb-1.5 text-sm font-semibold text-neutral-900">Rating</legend>
                            <div className="flex gap-1">
                                {[1, 2, 3, 4, 5].map((n) => (
                                    <button key={n} type="button" onClick={() => form.setData('rating', n)} aria-label={`${n} bintang`} aria-pressed={form.data.rating === n}
                                        className="rounded-lg p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500">
                                        <Star className={cn('h-8 w-8 transition', n <= form.data.rating ? 'fill-gold-500 text-gold-500' : 'fill-primary-100 text-primary-100')} aria-hidden="true" />
                                    </button>
                                ))}
                            </div>
                        </fieldset>

                        <div className="mt-4 grid gap-4 sm:grid-cols-2">
                            <Field label="Nama" error={form.errors.name}>
                                <input className={input} value={form.data.name} onChange={(e) => form.setData('name', e.target.value)} maxLength={100} required />
                            </Field>
                            <Field label="Kota asal" error={form.errors.city}>
                                <input className={input} value={form.data.city} onChange={(e) => form.setData('city', e.target.value)} maxLength={60} placeholder="mis. Medan" />
                            </Field>
                            <Field label="Bulan berangkat" error={form.errors.departure_month}>
                                <input type="month" max={thisMonth} className={input} value={form.data.departure_month} onChange={(e) => form.setData('departure_month', e.target.value)} />
                            </Field>
                            <Field label="Paket" error={form.errors.package_name}>
                                <select className={input} value={form.data.package_name} onChange={(e) => form.setData('package_name', e.target.value)}>
                                    <option value="">Pilih paket</option>
                                    {packageOptions.map((p) => <option key={p} value={p}>{p}</option>)}
                                </select>
                            </Field>
                        </div>
                        <Field label="Ulasan" error={form.errors.content} className="mt-4">
                            <textarea rows={4} className={input} value={form.data.content} onChange={(e) => form.setData('content', e.target.value)} maxLength={1500}
                                placeholder="Ceritakan pelayanan, hotel, pembimbing, dan pengalaman ibadah Anda…" required />
                        </Field>
                        {/* jebakan bot, disembunyikan dari pengguna */}
                        <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" value={form.data.website} onChange={(e) => form.setData('website', e.target.value)} />

                        <button type="submit" disabled={form.processing}
                            className="mt-6 w-full rounded-full bg-gradient-to-r from-primary-700 to-primary-900 py-3 font-bold text-white shadow-md shadow-primary-700/25 transition hover:shadow-lg disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2">
                            {form.processing ? 'Mengirim…' : 'Kirim Ulasan'}
                        </button>
                    </form>
                )}
            </DialogContent>
        </Dialog>
    );
}

function Field({ label, error, className, children }: { label: string; error?: string; className?: string; children: ReactNode }) {
    return (
        <label className={cn('block', className)}>
            <span className="mb-1.5 block text-sm font-semibold text-neutral-900">{label}</span>
            {children}
            {error && <span className="mt-1 block text-xs font-medium text-red-600">{error}</span>}
        </label>
    );
}
