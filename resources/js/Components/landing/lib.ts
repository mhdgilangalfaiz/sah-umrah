/** Helper format & utilitas kecil untuk landing page. */

export function cn(...classes: Array<string | false | null | undefined>): string {
    return classes.filter(Boolean).join(' ');
}

const IDR = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0, minimumFractionDigits: 0 });

/** 28250000 → "Rp 28.250.000" */
export function formatRupiah(value: number): string {
    return IDR.format(value).replace(/ /g, ' ');
}

/** "2024-12-02" → "02 Desember 2024" */
export function formatDate(iso: string): string {
    const d = new Date(`${iso}T00:00:00`);
    return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
}

/** "2026-03" → "Maret 2026" */
export function formatMonth(ym: string): string {
    const d = new Date(`${ym}-01T00:00:00`);
    return d.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
}

/** Tautan wa.me dengan pesan otomatis. */
export function waLink(phone: string, message?: string): string {
    const digits = phone.replace(/\D/g, '');
    return `https://wa.me/${digits}${message ? `?text=${encodeURIComponent(message)}` : ''}`;
}

/** Inisial maksimal 2 huruf, tanpa gelar ("Hj. Siti Aminah" → "SA"). */
export function initials(name: string): string {
    const words = name.replace(/^(hj?\.|bapak|ibu|bpk\.?)\s*/i, '').trim().split(/\s+/);
    return words.slice(0, 2).map((w) => w.charAt(0).toUpperCase()).join('');
}

/** Gulir halus ke section dan perbarui hash tanpa menambah riwayat. */
export function scrollToSection(id: string): void {
    const el = document.getElementById(id);
    if (!el) return;
    const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'start' });
    history.replaceState(null, '', id === 'beranda' ? location.pathname : `#${id}`);
}
