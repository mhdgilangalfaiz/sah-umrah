// Tahapan visa — dipakai halaman pelanggan & admin (jangan impor antar-halaman: membuat halaman hilang dari manifest Vite)
export const VISA_STEPS = ['Pengajuan', 'Invoice', 'Pembayaran', 'Menunggu Dokumen', 'Diverifikasi', 'Diproses', 'Terbit'];
export const visaStep = (s) => ({ menunggu_invoice: 1, menunggu_pembayaran: 2, menunggu_dokumen: 3, diverifikasi: 4, diproses: 5, terbit: 6, ditolak: 5 }[s] ?? 0);
