import { Link } from '@inertiajs/react';
import { FileDown, FileSpreadsheet, History, Receipt, X } from 'lucide-react';
import { useState } from 'react';
import Modal from '@/Components/Modal';
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

/** H-xx menuju tanggal (berdasarkan tanggal saja) */
const daysUntil = (iso) => {
    if (!iso) return null;
    const t = new Date(); t.setHours(0, 0, 0, 0);
    return Math.round((new Date(`${iso}T00:00:00`) - t) / 86400000);
};

/**
 * Laporan invoice (Admin & Super Admin): satu baris per pesanan = invoice terbaru, urut No. Invoice dari yang pertama.
 * Kolom tanggal = tanggal keberangkatan + batas pelunasan, agar terlihat tagihan mana yang mendesak.
 * Tombol "Riwayat" → semua invoice pesanan itu, dari invoice pertama sampai yang terbaru.
 */
export default function Invoices({ invoices, summary, filters }) {
    const [history, setHistory] = useState(null);
    return (
        <AdminLayout title="Laporan Invoice" icon={Receipt}>
            <PageHeader title="Laporan Invoice" subtitle={`Invoice terbaru tiap pesanan, terbit ${date(filters.dari)} – ${date(filters.sampai)}`} actions={<>
                <a href={route('admin.invoices.export', { ...filters, format: 'xlsx' })} className="btn-outline"><FileSpreadsheet className="h-4 w-4 text-emerald-700" />Excel</a>
                <a href={route('admin.invoices.export', { ...filters, format: 'pdf' })} className="btn-outline"><FileDown className="h-4 w-4 text-red-600" />PDF</a>
            </>} />
            <FilterBar routeName="admin.invoices.index" filters={filters} fields={[
                { name: 'q', type: 'search', label: 'No. invoice / nama / email pelanggan' },
                { name: 'layanan', type: 'select', label: 'Semua layanan', options: { umrah: 'Paket Umrah', tiket: 'Tiket Pesawat', visa: 'Visa' } },
                { name: 'status', type: 'select', label: 'Semua status', options: { belum_lunas: 'Belum lunas', lunas: 'Lunas', batal: 'Batal' } },
                { name: 'dari', type: 'date', label: 'Dari' }, { name: 'sampai', type: 'date', label: 'Sampai' },
            ]} />

            <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 [&>*:last-child:nth-child(odd)]:col-span-2 md:[&>*:last-child:nth-child(odd)]:col-span-1">
                <IllustratedStat label="Total Invoice" value={rupiah(summary.invoice_total)} sub={`${summary.invoice_count} invoice`} image="/images/admin/kartu/invoice-total.webp" tone="green" />
                <IllustratedStat label="Belum Lunas" value={rupiah(summary.unpaid_total)} sub="Sisa tagihan dari invoice berlaku" image="/images/admin/kartu/invoice-belum.webp" tone="gold" />
                <IllustratedStat label="Uang Diterima" value={rupiah(summary.receipt_total)} sub={`${summary.receipt_count} pembayaran`} image="/images/admin/kartu/invoice-kwitansi.webp" tone="blue" />
            </div>

            <Card pad={false}>
                {invoices.data.length === 0 ? <Empty title="Belum ada invoice pada periode ini" /> : (
                    <div className="overflow-x-auto"><table className="table-app">
                        <thead><tr><th>No. Invoice</th><th>Keberangkatan</th><th>Pelanggan</th><th>Layanan</th><th className="text-right">Nominal</th><th>Status</th><th></th></tr></thead>
                        <tbody className="divide-y divide-slate-100">
                            {invoices.data.map((i) => {
                                const [label, tone] = STATUS[i.status] ?? [i.status, 'bg-slate-100 text-slate-600 ring-slate-200'];
                                const versions = i.history?.length ?? 1;
                                const h = daysUntil(i.deadline);
                                return (
                                    <tr key={i.id}>
                                        <td>
                                            <p className="font-semibold text-slate-900">{i.number}</p>
                                            <p className="text-xs text-slate-500">{versions > 1 ? `${versions} versi invoice · revisi ke-${i.revision}` : 'Invoice'}</p>
                                        </td>
                                        <td className="whitespace-nowrap">
                                            <p className="font-medium text-slate-900">{i.departure_date ? date(i.departure_date) : '-'}</p>
                                            {i.deadline && i.outstanding > 0 && (
                                                <p className={`text-xs font-semibold ${h < 0 ? 'text-red-600' : h <= 14 ? 'text-amber-700' : 'text-slate-500'}`}>
                                                    Lunas {date(i.deadline)} · {h < 0 ? `lewat ${-h} hari` : h === 0 ? 'hari ini' : `H-${h}`}
                                                </p>
                                            )}
                                        </td>
                                        <td><p className="font-medium">{i.customer ?? '-'}</p><p className="text-xs text-slate-500">{i.email}</p></td>
                                        <td>
                                            <p>{i.service}</p>
                                            {i.order_code && (i.order_url
                                                ? <Link href={i.order_url} className="text-xs font-semibold text-brand-700 hover:underline">{i.order_code}</Link>
                                                : <p className="text-xs text-slate-500">{i.order_code}</p>)}
                                        </td>
                                        <td className="whitespace-nowrap text-right font-semibold">{rupiah(i.amount)}{i.outstanding > 0 && <p className="text-xs font-normal text-amber-700">sisa {rupiah(i.outstanding)}</p>}</td>
                                        <td><Badge className={tone}>{label}</Badge></td>
                                        <td className="whitespace-nowrap text-right">
                                            <button type="button" onClick={() => setHistory(i)} className="btn-outline btn-sm"><History className="h-4 w-4" />Riwayat</button>
                                            <a href={i.pdf_url} target="_blank" rel="noreferrer" className="btn-ghost btn-sm"><FileDown className="h-4 w-4 text-red-600" />PDF</a>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table></div>
                )}
                <Pagination meta={invoices} />
            </Card>

            <Modal show={!!history} onClose={() => setHistory(null)} maxWidth="2xl">
                {history && (
                    <div className="p-5 sm:p-6">
                        <div className="mb-4 flex items-start justify-between gap-3">
                            <div>
                                <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-brand-800"><History className="h-4 w-4" />Riwayat invoice</p>
                                <h2 className="mt-1 font-sans text-lg font-bold text-slate-900">{history.order_code} · {history.service}</h2>
                                <p className="text-sm text-slate-500">{history.customer}{history.departure_date && ` · berangkat ${date(history.departure_date)}`} · {history.history.length} versi</p>
                            </div>
                            <button type="button" onClick={() => setHistory(null)} className="btn-ghost btn-sm" aria-label="Tutup"><X className="h-4 w-4" /></button>
                        </div>
                        <ol className="space-y-2">
                            {history.history.map((h, n) => {
                                const [hl, ht] = STATUS[h.status] ?? [h.status, 'bg-slate-100 text-slate-600 ring-slate-200'];
                                return (
                                    <li key={h.id} className={`flex flex-wrap items-center gap-3 rounded-xl border px-4 py-3 text-sm ${h.current ? 'border-brand-300 bg-brand-50/40 ring-1 ring-brand-200' : 'border-slate-200 bg-white'}`}>
                                        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">{n + 1}</span>
                                        <span className="min-w-0 flex-1">
                                            <span className="flex flex-wrap items-center gap-2">
                                                <b className="text-slate-900">{h.number}</b>
                                                <Badge className={ht}>{hl}</Badge>
                                                {h.current && <span className="text-xs font-semibold text-brand-700">terbaru</span>}
                                            </span>
                                            <span className="block text-xs text-slate-500">Terbit {h.issued_at ? dateTime(h.issued_at) : '-'}{h.revision > 0 ? ` · revisi ke-${h.revision}` : ' · invoice awal'}</span>
                                            {h.notes && <span className="mt-1 block text-xs text-slate-600 [overflow-wrap:anywhere]">{h.notes}</span>}
                                        </span>
                                        <span className="font-semibold text-slate-900">{rupiah(h.amount)}</span>
                                        <a href={h.pdf_url} target="_blank" rel="noreferrer" className="btn-ghost btn-sm"><FileDown className="h-4 w-4 text-red-600" />PDF</a>
                                    </li>
                                );
                            })}
                        </ol>
                    </div>
                )}
            </Modal>
        </AdminLayout>
    );
}
