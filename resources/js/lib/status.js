// Peta status → label & warna badge (satu sumber kebenaran untuk seluruh UI)
const C = {
    amber: 'bg-amber-50 text-amber-800 ring-amber-600/20',
    blue: 'bg-sky-50 text-sky-800 ring-sky-600/20',
    indigo: 'bg-indigo-50 text-indigo-800 ring-indigo-600/20',
    green: 'bg-emerald-50 text-emerald-800 ring-emerald-600/20',
    red: 'bg-red-50 text-red-700 ring-red-600/20',
    gray: 'bg-slate-100 text-slate-600 ring-slate-500/20',
    orange: 'bg-orange-50 text-orange-800 ring-orange-600/20',
    purple: 'bg-violet-50 text-violet-800 ring-violet-600/20',
    gold: 'bg-gold-50 text-gold-800 ring-gold-600/30',
};

export const STATUS = {
    // umum pesanan & pembayaran
    menunggu_pembayaran: ['Menunggu Pembayaran', C.amber],
    cicilan_berjalan: ['Cicilan Berjalan', C.blue],
    lunas: ['Lunas', C.green],
    dibatalkan: ['Dibatalkan', C.red],
    kedaluwarsa: ['Kedaluwarsa', C.gray],
    selesai: ['Selesai', C.green],
    dibayar: ['Dibayar', C.green],
    gagal: ['Gagal', C.red],
    refund: ['Refund', C.purple],
    tiket_terbit: ['E-Ticket Terbit', C.green],
    // visa
    menunggu_invoice: ['Menunggu Invoice', C.gray],
    menunggu_dokumen: ['Menunggu Dokumen', C.orange],
    diverifikasi: ['Diverifikasi', C.blue],
    diproses: ['Diproses', C.indigo],
    terbit: ['Terbit', C.green],
    ditolak: ['Ditolak', C.red],
    // cicilan
    belum_dibayar: ['Belum Dibayar', C.gray],
    sebagian: ['Dibayar Sebagian', C.blue],
    terlambat: ['Terlambat', C.red],
    // dokumen
    menunggu: ['Menunggu Verifikasi', C.amber],
    // refund
    diajukan: ['Diajukan', C.amber],
    disetujui: ['Disetujui', C.blue],
    // invoice
    belum_lunas: ['Belum Lunas', C.amber],
    batal: ['Batal', C.red],
    // bantuan
    bot: ['Asisten Otomatis', C.gray],
    menunggu_admin: ['Menunggu Admin', C.amber],
    ditangani: ['Ditangani Admin', C.blue],
    // keberangkatan & rekening
    open: ['Dibuka', C.green],
    closed: ['Ditutup', C.gray],
    departed: ['Sudah Berangkat', C.indigo],
    pending_verification: ['Menunggu Persetujuan Pemilik', C.amber],
    active: ['Aktif', C.green],
    blocked: ['DIBLOKIR', C.red],
    replaced: ['Diganti', C.gray],
};

export const statusLabel = (s) => STATUS[s]?.[0] ?? String(s ?? '-').replace(/_/g, ' ');
export const statusClass = (s) => STATUS[s]?.[1] ?? C.gray;
export const COLORS = C;
