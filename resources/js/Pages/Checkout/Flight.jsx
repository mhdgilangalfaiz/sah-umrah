import { useForm } from '@inertiajs/react';
import { Building2, Clock, FileSpreadsheet, Minus, Plus, Receipt, User, Users, Wallet } from 'lucide-react';
import PublicLayout from '@/Layouts/PublicLayout';
import { FlightCard } from '@/Components/Cards';
import { cx, Input, PageHeader, Stepper, Textarea } from '@/Components/ui';
import { rupiah } from '@/lib/format';

const BUYERS = [
    { value: 'agen', label: 'Agen / Travel', hint: 'Pembelian grup atas nama travel atau perusahaan', icon: Building2 },
    { value: 'perorangan', label: 'Perorangan / Keluarga', hint: 'Beberapa seat untuk diri sendiri atau keluarga', icon: User },
];

/**
 * Pesan seat tiket pesawat: pilih jumlah seat sendiri + data penerima invoice.
 * Data penumpang tidak diisi di sini — manifest (Excel) diunggah setelah tagihan lunas.
 */
export default function CheckoutFlight({ flight, seats, billing, holdHours, dpPercent, settlementDue }) {
    const { data, setData, post, processing, errors } = useForm({ flight_id: flight.id, seats, agree: false, ...billing });
    const max = Math.max(1, flight.seats_available);
    const qty = Math.min(max, Math.max(1, Number(data.seats) || 0));
    const total = flight.price * qty;
    const dp = Math.min(total, Math.ceil((total * dpPercent) / 100 / 1000) * 1000);
    const agent = data.buyer_type === 'agen';
    const setSeats = (n) => setData('seats', Math.min(max, Math.max(1, n)));

    return (
        <PublicLayout title="Pesan Tiket">
            <div className="container-app max-w-4xl py-8">
                <PageHeader title="Pemesanan Seat Tiket Pesawat" back={route('flights.index')} />
                <div className="card mb-6 p-4"><Stepper steps={['Pilih Penerbangan', 'Jumlah Seat & Invoice', 'Bayar / Cicil', 'Upload Manifest', 'E-Ticket']} current={1} /></div>
                <FlightCard f={flight} pax={qty} />

                <form onSubmit={(e) => { e.preventDefault(); post(route('checkout.flight.store')); }} className="mt-6 space-y-4">
                    {/* 1. Jumlah seat */}
                    <div className="card card-pad">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <p className="font-semibold">Jumlah seat</p>
                                <p className="text-sm text-slate-500">Tentukan sesuai kebutuhan · sisa <b className="text-slate-700">{flight.seats_available}</b> seat · {rupiah(flight.price)}/seat</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button type="button" onClick={() => setSeats(qty - 1)} disabled={qty <= 1} className="btn-outline h-11 w-11 !p-0" aria-label="Kurangi seat"><Minus className="h-4 w-4" /></button>
                                <input type="number" inputMode="numeric" min={1} max={max} value={data.seats}
                                    onChange={(e) => setData('seats', e.target.value)} onBlur={() => setSeats(qty)}
                                    className="input h-11 w-24 text-center text-lg font-bold" aria-label="Jumlah seat" />
                                <button type="button" onClick={() => setSeats(qty + 1)} disabled={qty >= max} className="btn-outline h-11 w-11 !p-0" aria-label="Tambah seat"><Plus className="h-4 w-4" /></button>
                            </div>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                            {[1, 2, 4, 10, 20, 30, 45].filter((n) => n <= max).map((n) => (
                                <button type="button" key={n} onClick={() => setSeats(n)} className={cx('rounded-full border px-3 py-1 text-xs font-medium', qty === n ? 'border-brand-600 bg-brand-50 text-brand-800' : 'border-slate-200 text-slate-600 hover:border-slate-300')}>{n} seat</button>
                            ))}
                        </div>
                        {errors.seats && <p className="error mt-2">{errors.seats}</p>}
                    </div>

                    {/* 2. Penerima invoice */}
                    <div className="card card-pad space-y-4">
                        <div>
                            <p className="font-semibold">Pembeli & penerima invoice</p>
                            <p className="text-sm text-slate-500">Data ini dicantumkan sebagai penerima pada invoice.</p>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                            {BUYERS.map((b) => (
                                <label key={b.value} className={cx('flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition', data.buyer_type === b.value ? 'border-brand-600 bg-brand-50 ring-1 ring-brand-600' : 'border-slate-200 hover:border-slate-300')}>
                                    <input type="radio" name="buyer_type" className="mt-1" checked={data.buyer_type === b.value} onChange={() => setData('buyer_type', b.value)} />
                                    <b.icon className="mt-0.5 h-5 w-5 shrink-0 text-brand-700" />
                                    <span><span className="block text-sm font-semibold">{b.label}</span><span className="block text-xs text-slate-500">{b.hint}</span></span>
                                </label>
                            ))}
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2">
                            {agent && <Input label="Nama travel / perusahaan" placeholder="PT. Contoh Travel Umrah" value={data.bill_company} onChange={(e) => setData('bill_company', e.target.value)} error={errors.bill_company} />}
                            <Input label={agent ? 'Nama penanggung jawab' : 'Nama pemesan'} value={data.bill_name} onChange={(e) => setData('bill_name', e.target.value)} error={errors.bill_name} />
                            <Input label="Email" type="email" value={data.contact_email} onChange={(e) => setData('contact_email', e.target.value)} error={errors.contact_email} />
                            <Input label="No. HP / WhatsApp" value={data.contact_phone} onChange={(e) => setData('contact_phone', e.target.value)} error={errors.contact_phone} />
                            <div className="sm:col-span-2">
                                <Textarea label={agent ? 'Alamat kantor (opsional)' : 'Alamat (opsional)'} rows={2} value={data.bill_address ?? ''} onChange={(e) => setData('bill_address', e.target.value)} error={errors.bill_address} />
                            </div>
                        </div>
                    </div>

                    {/* 3. Alur setelah memesan */}
                    <div className="card card-pad">
                        <p className="mb-3 font-semibold">Langkah setelah memesan</p>
                        <ol className="grid gap-3 text-sm sm:grid-cols-3">
                            <li className="flex gap-3 rounded-xl bg-sand-50 p-3"><Receipt className="h-5 w-5 shrink-0 text-brand-700" /><span><b>Invoice terbit</b><br /><span className="text-slate-600">{qty} seat langsung dipotong dari stok & ditahan {holdHours} jam.</span></span></li>
                            <li className="flex gap-3 rounded-xl bg-sand-50 p-3"><Wallet className="h-5 w-5 shrink-0 text-brand-700" /><span><b>Bayar DP lalu cicil</b><br /><span className="text-slate-600">DP min. {dpPercent}% mengunci seat; lunasi paling lambat {settlementDue}.</span></span></li>
                            <li className="flex gap-3 rounded-xl bg-sand-50 p-3"><FileSpreadsheet className="h-5 w-5 shrink-0 text-brand-700" /><span><b>Upload manifest</b><br /><span className="text-slate-600">Setelah lunas, unggah data penumpang dalam Excel (template disediakan).</span></span></li>
                        </ol>
                    </div>

                    <div className="card card-pad space-y-3">
                        <div className="grid gap-3 text-sm sm:grid-cols-2">
                            <div className="rounded-xl bg-sand-100 p-3"><p className="font-semibold">Kebijakan Refund</p><p className="mt-1 text-slate-600">{flight.refund_policy}</p></div>
                            <div className="rounded-xl bg-sand-100 p-3"><p className="font-semibold">Kebijakan Reschedule</p><p className="mt-1 text-slate-600">{flight.reschedule_policy}</p></div>
                        </div>
                        <label className="flex items-start gap-3 text-sm"><input type="checkbox" className="mt-0.5" checked={data.agree} onChange={(e) => setData('agree', e.target.checked)} />Saya memahami kebijakan refund & reschedule di atas, dan akan mengunggah manifest penumpang sesuai paspor setelah pembayaran lunas.</label>
                        {errors.agree && <p className="error">{errors.agree}</p>}
                        {errors.flight_id && <p className="error">{errors.flight_id}</p>}
                        <div className="flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <p className="flex items-center gap-1.5 text-sm text-slate-500"><Users className="h-4 w-4" />Total {qty} seat × {rupiah(flight.price)}</p>
                                <p className="text-2xl font-bold text-brand-700">{rupiah(total)}</p>
                                <p className="text-xs text-slate-500">DP minimal {rupiah(dp)}, sisanya bisa dicicil</p>
                            </div>
                            <button disabled={processing || !data.agree} className="btn-gold px-8 py-3">{processing ? 'Memproses…' : 'Pesan Seat & Terbitkan Invoice'}</button>
                        </div>
                        <p className="flex items-center gap-1.5 text-xs text-slate-500"><Clock className="h-3.5 w-3.5" />Seat ditahan {holdHours} jam sampai DP dibayar; lewat dari itu pesanan otomatis batal dan seat kembali ke stok.</p>
                    </div>
                </form>
            </div>
        </PublicLayout>
    );
}
