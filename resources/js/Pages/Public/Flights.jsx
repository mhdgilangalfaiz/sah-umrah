import { Link, router } from '@inertiajs/react';
import { ArrowLeftRight, Info, Search } from 'lucide-react';
import { useState } from 'react';
import PublicLayout from '@/Layouts/PublicLayout';
import { FlightCard } from '@/Components/Cards';
import { Empty } from '@/Components/ui';

export default function Flights({ criteria, results, searched, airports }) {
    const [f, setF] = useState({ asal: criteria.asal ?? 'KNO', tujuan: criteria.tujuan ?? 'JED', tanggal: criteria.tanggal ?? '', penumpang: criteria.penumpang ?? 1, kelas: criteria.kelas ?? 'ekonomi' });
    const [policy, setPolicy] = useState(null);
    const pax = Number(criteria.penumpang ?? 1);

    const search = (e) => {
        e.preventDefault();
        router.get(route('flights.index'), f, { preserveState: true });
    };

    return (
        <PublicLayout title="Tiket Pesawat">
            <section className="relative overflow-hidden bg-brand-900 pb-24 pt-12 text-white">
                <div className="absolute inset-0 bg-pattern opacity-40" />
                <div className="container-app relative">
                    <h1 className="text-3xl text-white sm:text-4xl">Tiket Pesawat Umrah</h1>
                    <p className="mt-2 max-w-2xl text-brand-100">Fokus rute Indonesia ↔ Jeddah / Madinah. Jadwal & harga diperbarui langsung oleh tim kami.</p>
                </div>
            </section>
            <div className="container-app -mt-16 relative">
                <form onSubmit={search} className="card grid gap-3 p-4 sm:p-5 md:grid-cols-[1fr_auto_1fr_1fr_110px_140px_auto] md:items-end">
                    <Airport label="Dari" value={f.asal} onChange={(v) => setF({ ...f, asal: v })} airports={airports} />
                    <button type="button" onClick={() => setF({ ...f, asal: f.tujuan, tujuan: f.asal })} className="btn-outline mx-auto h-10 w-10 !p-0 md:mb-0.5" aria-label="Tukar"><ArrowLeftRight className="h-4 w-4" /></button>
                    <Airport label="Ke" value={f.tujuan} onChange={(v) => setF({ ...f, tujuan: v })} airports={airports} />
                    <div><label className="label">Tanggal berangkat</label><input type="date" className="input" value={f.tanggal} onChange={(e) => setF({ ...f, tanggal: e.target.value })} /></div>
                    <div><label className="label">Penumpang</label><select className="input" value={f.penumpang} onChange={(e) => setF({ ...f, penumpang: e.target.value })}>{[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => <option key={n} value={n}>{n} org</option>)}</select></div>
                    <div><label className="label">Kelas</label><select className="input" value={f.kelas} onChange={(e) => setF({ ...f, kelas: e.target.value })}><option value="ekonomi">Ekonomi</option><option value="bisnis">Bisnis</option><option value="first">First</option></select></div>
                    <button className="btn-primary h-[42px]"><Search className="h-4 w-4" />Cari</button>
                </form>

                <div className="mt-8">
                    <h2 className="mb-4 font-sans text-lg font-semibold">{searched ? `${results.length} penerbangan ditemukan` : 'Jadwal penerbangan terdekat'}</h2>
                    {results.length === 0 ? (
                        <div className="card"><Empty title="Tidak ada penerbangan" text="Coba ubah tanggal (kami mencari ±3 hari) atau rute lain. Anda juga dapat bertanya melalui Pusat Bantuan." /></div>
                    ) : (
                        <div className="space-y-4">
                            {results.map((fl) => (
                                <div key={fl.id}>
                                    <FlightCard f={fl} pax={pax} action={
                                        <div className="flex gap-2">
                                            <button type="button" onClick={() => setPolicy(policy === fl.id ? null : fl.id)} className="btn-ghost btn-sm"><Info className="h-4 w-4" />Kebijakan</button>
                                            <Link href={route('checkout.flight', { flight: fl.id, penumpang: pax })} className="btn-gold btn-sm">Pilih</Link>
                                        </div>
                                    } />
                                    {policy === fl.id && (
                                        <div className="mt-2 grid animate-fade-up gap-3 rounded-2xl bg-gold-50 p-4 text-sm ring-1 ring-gold-200 sm:grid-cols-2">
                                            <div><p className="font-semibold text-gold-900">Kebijakan Refund</p><p className="mt-1 text-gold-900/80">{fl.refund_policy || '-'}</p></div>
                                            <div><p className="font-semibold text-gold-900">Kebijakan Reschedule</p><p className="mt-1 text-gold-900/80">{fl.reschedule_policy || '-'}</p></div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </PublicLayout>
    );
}

function Airport({ label, value, onChange, airports }) {
    return (
        <div>
            <label className="label">{label}</label>
            <select className="input" value={value} onChange={(e) => onChange(e.target.value)}>
                {airports.map((a) => <option key={a.code} value={a.code}>{a.city} ({a.code})</option>)}
            </select>
        </div>
    );
}
