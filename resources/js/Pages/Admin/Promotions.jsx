import { useForm } from '@inertiajs/react';
import { Megaphone } from 'lucide-react';
import AdminLayout from '@/Layouts/AdminLayout';
import { Card, Empty, Input, PageHeader, Pagination, Textarea } from '@/Components/ui';
import { dateTime } from '@/lib/format';

export default function Promotions({ promotions, customerCount }) {
    const { data, setData, post, processing, errors, reset } = useForm({ title: '', message: '', link: '/paket-umrah', send_email: true });
    return (
        <AdminLayout title="Kirim Promo">
            <PageHeader title="Promo Terbaru" subtitle={`Kirim notifikasi promo ke ${customerCount} pelanggan aktif (in-app, opsional email).`} />
            <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
                <Card title="Promo baru">
                    <form onSubmit={(e) => { e.preventDefault(); if (confirm(`Kirim ke ${customerCount} pelanggan?`)) post(route('admin.promotions.store'), { onSuccess: () => reset() }); }} className="space-y-3">
                        <Input label="Judul" value={data.title} onChange={(e) => setData('title', e.target.value)} error={errors.title} required />
                        <Textarea rows={5} label="Pesan" value={data.message} onChange={(e) => setData('message', e.target.value)} error={errors.message} required />
                        <Input label="Tautan (opsional)" value={data.link} onChange={(e) => setData('link', e.target.value)} hint="Mis. /paket-umrah/nama-paket" />
                        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={data.send_email} onChange={(e) => setData('send_email', e.target.checked)} />Kirim juga melalui email</label>
                        <button disabled={processing} className="btn-gold w-full"><Megaphone className="h-4 w-4" />Kirim Promo</button>
                    </form>
                </Card>
                <Card title="Riwayat promo" pad={false}>
                    {promotions.data.length === 0 ? <Empty title="Belum ada promo terkirim" /> : (
                        <ul className="divide-y divide-slate-100">{promotions.data.map((p) => (
                            <li key={p.id} className="p-4"><p className="font-semibold">{p.title}</p><p className="mt-1 text-sm text-slate-600">{p.message}</p><p className="mt-1 text-xs text-slate-400">{dateTime(p.sent_at)} · {p.recipients} penerima · oleh {p.sender?.name}</p></li>
                        ))}</ul>
                    )}
                    <Pagination meta={promotions} />
                </Card>
            </div>
        </AdminLayout>
    );
}
