import { Link, router } from '@inertiajs/react';
import { ProofUpload } from '@/Components/PaymentProof';
import axios from 'axios';
import { CheckCircle2, Copy, Download, FlaskConical, Hourglass, QrCode, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import PublicLayout from '@/Layouts/PublicLayout';
import { StatusBadge } from '@/Components/ui';
import { dateTime, rupiah } from '@/lib/format';

const GUIDES = {
    va_mandiri: ['Buka Livin\' by Mandiri / ATM Mandiri', 'Pilih Bayar → Multipayment / Virtual Account', 'Masukkan nomor VA di atas', 'Pastikan nama & nominal sesuai, lalu konfirmasi'],
    va_bsi: ['Buka BSI Mobile / ATM BSI', 'Pilih Pembayaran → Virtual Account', 'Masukkan nomor VA di atas', 'Periksa detail lalu konfirmasi dengan PIN'],
    va_muamalat: ['Buka Muamalat DIN / ATM Muamalat', 'Pilih Pembayaran → Virtual Account', 'Masukkan nomor VA di atas', 'Periksa detail lalu konfirmasi'],
    qris: ['Buka aplikasi m-banking atau e-wallet (GoPay, OVO, DANA, ShopeePay, dll.)', 'Pilih menu Scan / QRIS', 'Pindai kode QR di atas', 'Periksa nominal lalu konfirmasi pembayaran'],
};

function useCountdown(to) {
    const [left, setLeft] = useState(() => Math.max(0, new Date(to) - Date.now()));
    useEffect(() => {
        const t = setInterval(() => setLeft(Math.max(0, new Date(to) - Date.now())), 1000);
        return () => clearInterval(t);
    }, [to]);
    const h = Math.floor(left / 36e5), m = Math.floor((left % 36e5) / 6e4), s = Math.floor((left % 6e4) / 1000);
    return [left, `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`];
}

export default function PaymentShow({ payment, order, canSimulate }) {
    const [status, setStatus] = useState(payment.status);
    const [copied, setCopied] = useState(false);
    const [left, countdown] = useCountdown(payment.expires_at);

    // Polling status → otomatis berubah setelah webhook diterima
    useEffect(() => {
        if (status !== 'menunggu_pembayaran') return;
        const t = setInterval(async () => {
            const { data } = await axios.get(route('payments.status', payment.code));
            if (data.status !== status) {
                setStatus(data.status);
                router.reload({ only: ['payment', 'order'] });
            }
        }, 5000);
        return () => clearInterval(t);
    }, [status]);

    const copy = () => {
        navigator.clipboard?.writeText(payment.va_number);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    };

    return (
        <PublicLayout title="Instruksi Pembayaran">
            <div className="container-app max-w-xl py-8">
                <div className="card overflow-hidden">
                    <div className="relative bg-brand-800 px-6 py-5 text-white">
                        <div className="absolute inset-0 bg-pattern opacity-40" />
                        <div className="relative">
                            <p className="text-xs text-brand-200">{order.label}</p>
                            <p className="mt-1 text-3xl font-bold">{rupiah(payment.amount)}</p>
                            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                                <StatusBadge status={status} />
                                {payment.installment && <span className="rounded-full bg-white/10 px-2 py-0.5">{payment.installment}</span>}
                                <span className="text-brand-200">#{payment.code}</span>
                            </div>
                        </div>
                    </div>

                    {status === 'dibayar' ? (
                        <div className="p-6 text-center">
                            <CheckCircle2 className="mx-auto h-16 w-16 text-emerald-600" />
                            <h1 className="mt-3 text-2xl">Pembayaran berhasil</h1>
                            <p className="mt-1 text-sm text-slate-600">Alhamdulillah, pembayaran Anda telah diterima dan sudah tercatat di invoice.</p>
                            <p className="mt-3 text-sm">Sisa tagihan: <b>{rupiah(order.outstanding)}</b></p>
                            <div className="mt-5"><ProofUpload payment={payment} /></div>
                            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
                                {payment.invoice_id && <a target="_blank" rel="noopener" href={route('invoices.pdf', payment.invoice_id)} className="btn-outline"><Download className="h-4 w-4" />Unduh Invoice</a>}
                                <Link href={order.url} className="btn-primary">Lihat Pesanan</Link>
                            </div>
                        </div>
                    ) : status !== 'menunggu_pembayaran' || left === 0 ? (
                        <div className="p-6 text-center">
                            <XCircle className="mx-auto h-14 w-14 text-red-500" />
                            <h1 className="mt-3 text-xl">Transaksi {status === 'gagal' ? 'dibatalkan' : 'kedaluwarsa'}</h1>
                            <p className="mt-1 text-sm text-slate-600">Silakan buat transaksi pembayaran baru dari halaman pesanan.</p>
                            <Link href={order.url} className="btn-primary mt-5">Kembali ke Pesanan</Link>
                        </div>
                    ) : (
                        <div className="space-y-6 p-6">
                            <div className="flex items-center justify-between rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
                                <span className="flex items-center gap-2"><Hourglass className="h-4 w-4" />Bayar sebelum {dateTime(payment.expires_at)}</span>
                                <span className="font-mono font-bold">{countdown}</span>
                            </div>
                            {payment.method === 'qris' ? (
                                <div className="text-center">
                                    <p className="mb-3 text-sm font-semibold">Pindai QRIS</p>
                                    <div className="mx-auto w-fit rounded-xl border border-slate-200 bg-white p-3"><QRCodeSVG value={payment.qr_string} size={240} level="M" /></div>
                                    <p className="mt-2 flex items-center justify-center gap-1 text-xs text-slate-500"><QrCode className="h-3.5 w-3.5" />Dapat dibayar dengan semua aplikasi pendukung QRIS</p>
                                </div>
                            ) : (
                                <div>
                                    <p className="text-sm text-slate-500">{payment.method_label}</p>
                                    <div className="mt-1 flex items-center justify-between gap-3 rounded-xl border-2 border-dashed border-brand-200 bg-brand-50 p-4">
                                        <span className="break-all font-mono text-2xl font-bold tracking-wider text-brand-900">{payment.va_number}</span>
                                        <button onClick={copy} className="btn-outline btn-sm shrink-0"><Copy className="h-3.5 w-3.5" />{copied ? 'Tersalin' : 'Salin'}</button>
                                    </div>
                                    <p className="mt-2 text-xs text-slate-500">Nominal harus tepat {rupiah(payment.amount)}. VA hanya dapat dibayar satu kali.</p>
                                </div>
                            )}
                            <div>
                                <p className="mb-2 text-sm font-semibold">Cara pembayaran</p>
                                <ol className="space-y-2 text-sm text-slate-600">
                                    {GUIDES[payment.method].map((g, i) => <li key={i} className="flex gap-3"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-gold-100 text-xs font-bold text-gold-800">{i + 1}</span>{g}</li>)}
                                </ol>
                            </div>
                            <p className="text-center text-xs text-slate-500">Status akan diperbarui otomatis setelah pembayaran diterima — tidak perlu mengirim bukti transfer.</p>
                            {canSimulate && (
                                <div className="rounded-xl border border-dashed border-amber-400 bg-amber-50 p-4">
                                    <p className="flex items-center gap-2 text-sm font-semibold text-amber-900"><FlaskConical className="h-4 w-4" />Mode sandbox / simulasi</p>
                                    <p className="mt-1 text-xs text-amber-800">Kirim webhook bertanda tangan seolah-olah dari payment gateway.</p>
                                    <div className="mt-3 flex gap-2">
                                        <button onClick={() => router.post(route('payments.simulate', payment.code), { status: 'PAID' })} className="btn-primary btn-sm">Simulasikan Bayar</button>
                                        <button onClick={() => router.post(route('payments.simulate', payment.code), { status: 'EXPIRED' })} className="btn-outline btn-sm">Simulasikan Kedaluwarsa</button>
                                    </div>
                                </div>
                            )}
                            <div className="flex justify-between border-t border-slate-100 pt-4">
                                <Link href={order.url} className="btn-ghost btn-sm">Kembali ke pesanan</Link>
                                <button onClick={() => confirm('Batalkan transaksi ini? Anda dapat membuat transaksi baru dengan nominal/metode lain.') && router.post(route('payments.cancel', payment.code))} className="btn-ghost btn-sm text-red-600">Ganti metode / nominal</button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </PublicLayout>
    );
}
