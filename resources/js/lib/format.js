export const rupiah = (n) =>
    'Rp' + new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(Math.round(Number(n || 0)));

export const shortRupiah = (n) => {
    const v = Number(n || 0);
    if (v >= 1e9) return 'Rp' + (v / 1e9).toFixed(1).replace('.', ',') + ' M';
    if (v >= 1e6) return 'Rp' + (v / 1e6).toFixed(1).replace('.', ',') + ' jt';
    return rupiah(v);
};

const parse = (d) => (d ? new Date(String(d).length === 10 ? d + 'T00:00:00' : d) : null);

export const date = (d, opts = { day: 'numeric', month: 'short', year: 'numeric' }) => {
    const x = parse(d);
    return x && !isNaN(x) ? x.toLocaleDateString('id-ID', opts) : '-';
};

export const longDate = (d) => date(d, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

export const dateTime = (d) => {
    const x = parse(d);
    return x && !isNaN(x)
        ? x.toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
        : '-';
};

export const time = (d) => {
    const x = parse(d);
    return x && !isNaN(x) ? x.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-';
};

export const daysUntil = (d) => {
    const x = parse(d);
    if (!x) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return Math.round((x - today) / 86400000);
};

export const uuid = () =>
    (crypto?.randomUUID?.() ||
        'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
            const r = (Math.random() * 16) | 0;
            return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
        }));

export const fileSize = (b) => (b > 1048576 ? (b / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB');

/** Contoh: usd(135) → "USD 135", usd(135.5) → "USD 135,50" */
export const usd = (n) => {
    const v = Number(n || 0);
    return 'USD ' + new Intl.NumberFormat('id-ID', { minimumFractionDigits: Number.isInteger(v) ? 0 : 2, maximumFractionDigits: 2 }).format(v);
};
