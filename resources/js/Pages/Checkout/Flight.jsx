import { useForm, usePage } from '@inertiajs/react';
import { Clock, Info } from 'lucide-react';
import PublicLayout from '@/Layouts/PublicLayout';
import PassengerFields, { emptyPassenger } from '@/Components/PassengerFields';
import { FlightCard } from '@/Components/Cards';
import { Input, PageHeader, Stepper } from '@/Components/ui';
import { rupiah } from '@/lib/format';

export default function CheckoutFlight({ flight, pax, jamaah, holdHours }) {
    const { auth } = usePage().props;
    const { data, setData, post, processing, errors } = useForm({
        flight_id: flight.id,
        contact_email: auth.user.email,
        contact_phone: auth.user.phone ?? '',
        agree: false,
        passengers: Array.from({ length: pax }, emptyPassenger),
    });
    const usedIds = data.passengers.map((x) => String(x.jamaah_id)).filter(Boolean);

    return (
        <PublicLayout title="Pesan Tiket">
            <div className="container-app max-w-4xl py-8">
                <PageHeader title="Pemesanan Tiket Pesawat" back={route('flights.index')} />
                <div className="card mb-6 p-4"><Stepper steps={['Pilih Penerbangan', 'Data Penumpang', 'Pembayaran', 'E-Ticket']} current={1} /></div>
                <FlightCard f={flight} pax={pax} />

                <form onSubmit={(e) => { e.preventDefault(); post(route('checkout.flight.store')); }} className="mt-6 space-y-4">
                    <p className="flex gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-900"><Info className="h-4 w-4 shrink-0" />Nama & nomor paspor wajib sama persis dengan paspor. Kesalahan data dapat menyebabkan penolakan boarding.</p>
                    {data.passengers.map((ps, i) => (
                        <PassengerFields key={i} index={i} value={ps} passportRequired showMahram={false} showTitle errors={errors}
                            saved={jamaah.filter((j) => !usedIds.includes(String(j.id)) || String(ps.jamaah_id) === String(j.id))}
                            onChange={(v) => setData('passengers', data.passengers.map((x, j) => (j === i ? v : x)))} />
                    ))}
                    <div className="card card-pad grid gap-4 sm:grid-cols-2">
                        <p className="font-semibold sm:col-span-2">Kontak pemesan (pengiriman e-ticket)</p>
                        <Input label="Email" type="email" value={data.contact_email} onChange={(e) => setData('contact_email', e.target.value)} error={errors.contact_email} />
                        <Input label="No. HP" value={data.contact_phone} onChange={(e) => setData('contact_phone', e.target.value)} error={errors.contact_phone} />
                    </div>
                    <div className="card card-pad space-y-3">
                        <div className="grid gap-3 text-sm sm:grid-cols-2">
                            <div className="rounded-xl bg-sand-100 p-3"><p className="font-semibold">Kebijakan Refund</p><p className="mt-1 text-slate-600">{flight.refund_policy}</p></div>
                            <div className="rounded-xl bg-sand-100 p-3"><p className="font-semibold">Kebijakan Reschedule</p><p className="mt-1 text-slate-600">{flight.reschedule_policy}</p></div>
                        </div>
                        <label className="flex items-start gap-3 text-sm"><input type="checkbox" className="mt-0.5" checked={data.agree} onChange={(e) => setData('agree', e.target.checked)} />Saya memahami kebijakan refund & reschedule di atas serta data penumpang telah sesuai paspor.</label>
                        {errors.agree && <p className="error">{errors.agree}</p>}
                        {errors.flight_id && <p className="error">{errors.flight_id}</p>}
                        <div className="flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
                            <div><p className="text-sm text-slate-500">Total {pax} penumpang</p><p className="text-2xl font-bold text-brand-700">{rupiah(flight.price * pax)}</p></div>
                            <button disabled={processing || !data.agree} className="btn-gold px-8 py-3">{processing ? 'Memproses…' : 'Lanjut ke Pembayaran'}</button>
                        </div>
                        <p className="flex items-center gap-1.5 text-xs text-slate-500"><Clock className="h-3.5 w-3.5" />Kursi ditahan {holdHours} jam untuk menyelesaikan pembayaran.</p>
                    </div>
                </form>
            </div>
        </PublicLayout>
    );
}
