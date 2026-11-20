import { useForm } from '@inertiajs/react';
import { Lock, Mail, ShieldAlert, ShieldCheck, ShieldX } from 'lucide-react';
import AdminLayout from '@/Layouts/AdminLayout';
import { Card, Input, PageHeader, Select, StatusBadge, cx } from '@/Components/ui';

export default function FinanceSecurity({ accounts, alerts, ownerEmail }) {
    const { data, setData, post, processing, errors, reset } = useForm({ bank_name: '', account_number: '', account_holder: '', purpose: 'settlement', password: '' });

    return (
        <AdminLayout title="Keamanan Keuangan">
            <PageHeader title="Keamanan Data Keuangan" subtitle="Rekening perusahaan dilindungi persetujuan pemilik via email + segel integritas (HMAC)." />
            <div className="mb-6 grid gap-4 md:grid-cols-3">
                {[[Mail, 'Persetujuan via email', `Setiap perubahan dikirim ke ${ownerEmail} (diatur di server, tidak bisa diubah dari web).`],
                  [ShieldX, 'Batalkan = blokir', 'Bila pemilik membatalkan, rekening baru langsung diblokir & akun admin pengaju dinonaktifkan.'],
                  [Lock, 'Segel integritas', 'Perubahan langsung di database terdeteksi otomatis tiap 15 menit dan rekening diblokir.']].map(([Icon, t, d]) => (
                    <div key={t} className="card flex gap-3 p-4"><Icon className="h-5 w-5 shrink-0 text-brand-700" /><div><p className="text-sm font-semibold">{t}</p><p className="text-xs text-slate-500">{d}</p></div></div>
                ))}
            </div>
            <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
                <div className="min-w-0 space-y-6">
                    <Card title="Rekening perusahaan" pad={false}>
                        <div className="overflow-x-auto"><table className="table-app">
                            <thead><tr><th>Bank</th><th>No. rekening</th><th>Atas nama</th><th>Tujuan</th><th>Status</th><th>Segel</th><th>Diajukan</th></tr></thead>
                            <tbody className="divide-y divide-slate-100">
                                {accounts.length === 0 && <tr><td colSpan={7} className="text-center text-slate-400">Belum ada rekening</td></tr>}
                                {accounts.map((a) => (
                                    <tr key={a.id} className={a.status === 'blocked' ? 'bg-red-50/40' : ''}>
                                        <td className="font-medium">{a.bank_name}</td><td className="font-mono">{a.masked_number}</td><td>{a.account_holder}</td><td>{a.purpose}</td>
                                        <td><StatusBadge status={a.status} />{a.blocked_reason && <p className="max-w-[220px] whitespace-normal text-xs text-red-600">{a.blocked_reason}</p>}{a.status === 'pending_verification' && <p className="text-xs text-slate-500">batas {a.approval_expires_at}</p>}</td>
                                        <td>{a.intact ? <ShieldCheck className="h-5 w-5 text-emerald-600" /> : <ShieldX className="h-5 w-5 text-red-600" />}</td>
                                        <td>{a.requester}<p className="text-xs text-slate-500">{a.created_at} · {a.requested_ip}</p></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table></div>
                    </Card>
                    <Card title="Peringatan keamanan">
                        {alerts.length === 0 ? <p className="text-sm text-slate-500">Tidak ada peringatan.</p> : (
                            <ul className="space-y-2">{alerts.map((a) => (
                                <li key={a.id} className={cx('flex gap-3 rounded-xl p-3 text-sm', a.type.includes('blocked') || a.type.includes('integrity') ? 'bg-red-50 text-red-800' : 'bg-amber-50 text-amber-900')}>
                                    <ShieldAlert className="h-4 w-4 shrink-0" /><div><p>{a.message}</p><p className="text-xs opacity-70">{new Date(a.created_at).toLocaleString('id-ID')}</p></div>
                                </li>
                            ))}</ul>
                        )}
                    </Card>
                </div>
                <Card title="Ajukan rekening baru / perubahan">
                    <form onSubmit={(e) => { e.preventDefault(); post(route('admin.finance.bank.store'), { onSuccess: () => reset() }); }} className="space-y-3">
                        <Input label="Nama bank" value={data.bank_name} onChange={(e) => setData('bank_name', e.target.value)} error={errors.bank_name} required />
                        <Input label="Nomor rekening" value={data.account_number} onChange={(e) => setData('account_number', e.target.value)} error={errors.account_number} required />
                        <Input label="Atas nama" value={data.account_holder} onChange={(e) => setData('account_holder', e.target.value)} error={errors.account_holder} required />
                        <Select label="Tujuan" options={{ settlement: 'Settlement payment gateway', refund: 'Sumber dana refund' }} value={data.purpose} onChange={(e) => setData('purpose', e.target.value)} />
                        <Input label="Konfirmasi kata sandi Anda" type="password" value={data.password} onChange={(e) => setData('password', e.target.value)} error={errors.password} required />
                        <p className="rounded-lg bg-amber-50 p-2 text-xs text-amber-900">Rekening TIDAK langsung aktif. Pemilik perusahaan harus menyetujui melalui tautan di email dalam 24 jam.</p>
                        <button disabled={processing} className="btn-primary w-full">Kirim Permintaan</button>
                    </form>
                </Card>
            </div>
        </AdminLayout>
    );
}
