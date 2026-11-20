import { Check, Crop, Loader2, RotateCcw, SkipForward } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { renderToBlob } from '@/lib/image';

const MIN = 0.03; // ukuran minimum area crop (fraksi lebar/tinggi gambar)
const FULL = { x: 0, y: 0, w: 1, h: 1 };
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const HANDLES = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];
const HANDLE_POS = {
    nw: 'left-0 top-0 -translate-x-1/2 -translate-y-1/2 cursor-nwse-resize',
    n: 'left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 cursor-ns-resize',
    ne: 'right-0 top-0 translate-x-1/2 -translate-y-1/2 cursor-nesw-resize',
    e: 'right-0 top-1/2 translate-x-1/2 -translate-y-1/2 cursor-ew-resize',
    se: 'bottom-0 right-0 translate-x-1/2 translate-y-1/2 cursor-nwse-resize',
    s: 'bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 cursor-ns-resize',
    sw: 'bottom-0 left-0 -translate-x-1/2 translate-y-1/2 cursor-nesw-resize',
    w: 'left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize',
};

/**
 * Crop bebas (tanpa rasio tetap).
 *  - Geser kotak untuk memindahkan, tarik titik sudut/sisi untuk mengubah ukuran,
 *  - atau tarik di luar kotak untuk menggambar area crop baru.
 * Hasil (Blob) dikirim ke onApply. Area yang dipilih = persis yang tampil di halaman utama.
 */
export default function ImageCropper({ src, mime = 'image/jpeg', heading, onApply, onSkip, skipLabel = 'Lewati', onCancel, cancelLabel = 'Batal' }) {
    const imgRef = useRef(null);
    const drag = useRef(null);
    const [rect, setRect] = useState(FULL);
    const [natural, setNatural] = useState(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => { setRect(FULL); setNatural(null); setError(null); }, [src]);

    useEffect(() => {
        const move = (e) => {
            const d = drag.current;
            if (!d) return;
            e.preventDefault();
            const dx = (e.clientX - d.sx) / d.bw;
            const dy = (e.clientY - d.sy) / d.bh;
            let { x, y, w, h } = d.r;
            if (d.mode === 'new') {
                const px = clamp(d.ax + dx, 0, 1);
                const py = clamp(d.ay + dy, 0, 1);
                x = Math.min(d.ax, px); y = Math.min(d.ay, py);
                w = Math.max(MIN, Math.abs(px - d.ax)); h = Math.max(MIN, Math.abs(py - d.ay));
                x = Math.min(x, 1 - w); y = Math.min(y, 1 - h);
            } else if (d.mode === 'move') {
                x = clamp(x + dx, 0, 1 - w);
                y = clamp(y + dy, 0, 1 - h);
            } else {
                if (d.mode.includes('w')) { const nx = clamp(x + dx, 0, x + w - MIN); w += x - nx; x = nx; }
                if (d.mode.includes('e')) w = clamp(w + dx, MIN, 1 - x);
                if (d.mode.includes('n')) { const ny = clamp(y + dy, 0, y + h - MIN); h += y - ny; y = ny; }
                if (d.mode.includes('s')) h = clamp(h + dy, MIN, 1 - y);
            }
            setRect({ x, y, w, h });
        };
        const up = () => { drag.current = null; };
        window.addEventListener('pointermove', move, { passive: false });
        window.addEventListener('pointerup', up);
        window.addEventListener('pointercancel', up);
        return () => {
            window.removeEventListener('pointermove', move);
            window.removeEventListener('pointerup', up);
            window.removeEventListener('pointercancel', up);
        };
    }, []);

    const begin = (mode) => (e) => {
        if (e.button !== undefined && e.button !== 0) return;
        e.preventDefault();
        e.stopPropagation();
        const box = imgRef.current.getBoundingClientRect();
        drag.current = {
            mode, sx: e.clientX, sy: e.clientY, r: rect, bw: box.width, bh: box.height,
            ax: (e.clientX - box.left) / box.width, ay: (e.clientY - box.top) / box.height,
        };
    };

    const apply = async () => {
        if (!natural) return;
        setBusy(true);
        setError(null);
        try {
            const crop = {
                sx: Math.round(rect.x * natural.w), sy: Math.round(rect.y * natural.h),
                sw: Math.max(1, Math.round(rect.w * natural.w)), sh: Math.max(1, Math.round(rect.h * natural.h)),
            };
            onApply(await renderToBlob(imgRef.current, { crop, mime }));
        } catch (err) {
            setError(err.message);
        } finally {
            setBusy(false);
        }
    };

    const isFull = rect.x === 0 && rect.y === 0 && rect.w === 1 && rect.h === 1;
    const outW = natural ? Math.round(rect.w * natural.w) : 0;
    const outH = natural ? Math.round(rect.h * natural.h) : 0;

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                    <h3 className="flex items-center gap-2 text-lg font-semibold"><Crop className="h-5 w-5 text-brand-700" />Crop Foto {heading && <span className="text-sm font-normal text-slate-500">— {heading}</span>}</h3>
                    <p className="text-xs text-slate-500">Geser kotak, tarik titik di sudut/sisi, atau tarik di luar kotak untuk membuat area baru. Bentuk bebas.</p>
                </div>
                {natural && <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium tabular-nums text-slate-600">{outW} × {outH} px</span>}
            </div>

            <div className="grid place-items-center rounded-xl bg-slate-900 p-3 sm:p-5">
                <div className="relative inline-block touch-none select-none overflow-hidden" onPointerDown={begin('new')}>
                    <img ref={imgRef} src={src} alt="" draggable={false}
                        onLoad={(e) => setNatural({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
                        className="block max-h-[55vh] max-w-full cursor-crosshair" />
                    {natural && (
                        <div onPointerDown={begin('move')} className="absolute cursor-move border-2 border-white"
                            style={{ left: `${rect.x * 100}%`, top: `${rect.y * 100}%`, width: `${rect.w * 100}%`, height: `${rect.h * 100}%`, boxShadow: '0 0 0 9999px rgba(2,6,23,.6)' }}>
                            {/* garis bantu 1/3 */}
                            <div className="pointer-events-none absolute inset-0">
                                <span className="absolute inset-y-0 left-1/3 w-px bg-white/40" />
                                <span className="absolute inset-y-0 left-2/3 w-px bg-white/40" />
                                <span className="absolute inset-x-0 top-1/3 h-px bg-white/40" />
                                <span className="absolute inset-x-0 top-2/3 h-px bg-white/40" />
                            </div>
                            {HANDLES.map((h) => (
                                <span key={h} onPointerDown={begin(h)}
                                    className={`absolute h-4 w-4 rounded-sm border-2 border-brand-700 bg-white shadow sm:h-3.5 sm:w-3.5 ${HANDLE_POS[h]}`} />
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {error && <p className="error">{error}</p>}

            <div className="flex flex-wrap items-center justify-between gap-2">
                <button type="button" onClick={() => setRect(FULL)} disabled={isFull} className="btn-ghost btn-sm"><RotateCcw className="h-4 w-4" />Seluruh foto</button>
                <div className="flex flex-wrap gap-2">
                    {onCancel && <button type="button" onClick={onCancel} className="btn-outline">{cancelLabel}</button>}
                    {onSkip && <button type="button" onClick={onSkip} className="btn-outline"><SkipForward className="h-4 w-4" />{skipLabel}</button>}
                    <button type="button" onClick={apply} disabled={busy || !natural} className="btn-primary">
                        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}Terapkan Crop
                    </button>
                </div>
            </div>
        </div>
    );
}
