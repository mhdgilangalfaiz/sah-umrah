/**
 * Utilitas gambar di browser: crop, perkecil, dan kompres sebelum diunggah.
 * Hasil crop disimpan apa adanya di server, jadi tampilan di halaman utama sama persis dengan hasil crop.
 */

export const MAX_SIDE = 2560; // sisi terpanjang maksimal (px), cukup tajam untuk layar besar

export function loadImage(src) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('Gambar tidak dapat dibaca.'));
        img.src = src;
    });
}

/** Tipe keluaran: PNG/WEBP dipertahankan, selain itu JPEG */
export function outputType(mime) {
    return mime === 'image/png' || mime === 'image/webp' ? mime : 'image/jpeg';
}

export function extFor(mime) {
    return { 'image/png': 'png', 'image/webp': 'webp' }[mime] ?? 'jpg';
}

/**
 * Gambar bagian `crop` (piksel asli) dari `img` ke canvas lalu jadikan Blob.
 * crop: { sx, sy, sw, sh } — default seluruh gambar.
 */
export function renderToBlob(img, { crop, mime = 'image/jpeg', maxSide = MAX_SIDE, quality = 0.9 } = {}) {
    const { sx = 0, sy = 0, sw = img.naturalWidth, sh = img.naturalHeight } = crop ?? {};
    const scale = Math.min(1, maxSide / Math.max(sw, sh));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(sw * scale));
    canvas.height = Math.max(1, Math.round(sh * scale));
    const ctx = canvas.getContext('2d');
    const type = outputType(mime);
    if (type === 'image/jpeg') {
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);

    return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Gagal memproses gambar.'))), type, quality));
}

export function blobToFile(blob, baseName) {
    const name = `${String(baseName).replace(/\.[^.]+$/, '') || 'foto'}.${extFor(blob.type)}`;
    return new File([blob], name, { type: blob.type, lastModified: Date.now() });
}

/** Pastikan ukuran file ≤ limit (byte). Bila lebih, perkecil & kompres bertahap (JPEG). */
export async function shrinkToLimit(file, limit) {
    if (!limit || file.size <= limit) return file;
    const url = URL.createObjectURL(file);
    try {
        const img = await loadImage(url);
        for (const [maxSide, quality] of [[MAX_SIDE, 0.85], [1920, 0.8], [1600, 0.75], [1280, 0.7]]) {
            const blob = await renderToBlob(img, { mime: 'image/jpeg', maxSide, quality });
            if (blob.size <= limit) return blobToFile(blob, file.name);
        }
        throw new Error(`Foto "${file.name}" terlalu besar dan tidak bisa dikompres di bawah batas server.`);
    } finally {
        URL.revokeObjectURL(url);
    }
}

export function formatBytes(n) {
    if (!n && n !== 0) return '-';
    if (n >= 1024 ** 3) return `${(n / 1024 ** 3).toFixed(1)} GB`;
    if (n >= 1024 ** 2) return `${(n / 1024 ** 2).toFixed(1)} MB`;
    return `${Math.max(1, Math.round(n / 1024))} KB`;
}

/** Nama dasar file galeri, sama dengan server: "Kota Malam" pada 20 Nov 2026 → "20-11-26-kota-malam" */
export function fileBase(title, date = new Date()) {
    const d = new Date(date);
    const pad = (n) => String(n).padStart(2, '0');
    return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${pad(d.getFullYear() % 100)}-${fileSlug(title)}`;
}

/** Perkiraan slug nama file, sama dengan Str::slug di server: "Kota Mekah" → "kota-mekah" */
export function fileSlug(title) {
    return String(title ?? '').normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase()
        .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'galeri';
}
