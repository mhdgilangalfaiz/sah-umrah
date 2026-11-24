import { Link } from '@inertiajs/react';
import { FileDown, Receipt } from 'lucide-react';
import AdminLayout from '@/Layouts/AdminLayout';
import FilterBar from '@/Components/FilterBar';
import IllustratedStat from '@/Components/admin/IllustratedStat';
import { Badge, Card, Empty, PageHeader, Pagination } from '@/Components/ui';
import { date, dateTime, rupiah } from '@/lib/format';

const STATUS = {
    belum_lunas: ['Belum lunas', 'bg-amber-50 text-amber-800 ring-amber-200'],
    lunas: ['Lunas', 'bg-emerald-50 text-emerald-700 ring-emerald-200'],
    batal: ['Batal', 'bg-slate-100 text-slate-500 ring-slate-200'],
    direvisi: ['Direvisi', 'bg-slate-100 text-slate-500 ring-slate-200'],
};

/** Laporan invoice & kwitansi seluruh pembelian (Admin & Super Admin). */
export default function Invoices({ invoices, summary, filters }) {
    return (
        <AdminLayout title="Laporan Invoice" icon={Receipt}>
            <PageHeader title="Laporan Invoice" subtitle={`Invoice & kwitansi yang terbit ${date(filters.dari)} – ${date(filters.sampai)}`} />
            <FilterBar routeName="admin.invoices.index" filters={filters} fields={[
                { name: 'q', type: 'search', label: 'No. invoice / nama / email pelanggan' },
                { name: 'jenis', type: 'select', label: 'Invoice & kwitansi', options: { invoice: 'Invoice', kwitansi: 'Kwitansi' } },
                { name: 'layanan', type: 'select', label: 'Semua layanan', options: { umrah: 'Paket Umrah', tiket: 'Tiket Pesawat', visa: 'Visa' } },
                { name: 'status', type: 'select', label: 'Semua status', options: { belum_lunas: 'Belum lunas', lunas: 'Lunas', batal: 'Batal', direvisi: 'Direvisi' } },
                { name: 'dari', type: 'date', label: 'Dari' }, { name: 'sampai', type: 'date', label: 'Sampai' },
            ]} />

            <div className="mb-6 grid gap-4 md:grid-cols-3">
                <IllustratedStat label="Total Invoice" value={rupiah(summary.invoice_total)} sub={`${summary.invoice_count} invoice`} image="/images/admin/kartu/invoice-total.webp" tone="green" />
                <IllustratedStat label="Belum Lunas" value={rupiah(summary.unpaid_total)} sub="Sisa tagihan dari invoice berlaku" image="/images/admin/kartu/invoice-belum.webp" tone="gold" />
                <IllustratedStat label="Kwitansi (Uang Diterima)" value={rupiah(summary.receipt_total)} sub={`${summary.receipt_count} kwitansi`} image="/images/admin/kartu/invoice-kwitansi.webp" tone="blue" />
            </div>

            <Card pad={false}>
                {invoices.data.length === 0 ? <Empty title="Belum ada invoice pada periode ini" /> : (
                    <div className="overflow-x-auto"><table className="table-app">
                        <thead><tr><th>No. dokumen</th><th>Tanggal</th><th>Pelanggan</th><th>Layanan</th><th className="text-right">Nominal</th><th>Status</th><th></th></tr></thead>
                        <tbody className="divide-y divide-slate-100">
                            {invoices.data.map((i) => {
                                const [label, tone] = STATUS[i.status] ?? [i.status, 'bg-slate-100 text-slate-600 ring-slate-200'];
                                return (
                                    <tr key={i.id}>
                                        <td>
                                            <p className="font-semibold text-slate-900">{i.number}</p>
                                            <p className="text-xs text-slate-500">{i.type === 'kwitansi' ? 'Kwitansi' : 'Invoice'}{i.revision > 0 && ` · revisi ke-${i.revision}`}</p>
                                        </td>
                                        <td className="whitespace-nowrap">{i.issued_at ? dateTime(i.issued_at) : '-'}</td>
                                        <td><p className="font-medium">{i.customer ?? '-'}</p><p className="text-xs text-slate-500">{i.email}</p></td>
                                        <td>
                                            <p>{i.service}</p>
                                            {i.order_code && (i.order_url
                                                ? <Link href={i.order_url} className="text-xs font-semibold text-brand-700 hover:underline">{i.order_code}</Link>
                                                : <p className="text-xs text-slate-500">{i.order_code}</p>)}
                                        </td>
                                        <td className="whitespace-nowrap text-right font-semibold">{rupiah(i.amount)}</td>
                                        <td><Badge className={tone}>{label}</Badge></td>
                                        <td><a href={i.pdf_url} target="_blank" rel="noreferrer" className="btn-ghost btn-sm"><FileDown className="h-4 w-4 text-red-600" />PDF</a></td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table></div>
                )}
                <Pagination meta={invoices} />
            </Card>
        </AdminLayout>
    );
}
