import { UserCheck, UserPlus } from 'lucide-react';
import { cx } from './ui';

/** Sapaan penumpang (harus sama dengan validasi di CheckoutController) */
export const PASSENGER_TITLES = ['Bapak', 'Ibu', 'Abang', 'Kakak'];

export const emptyPassenger = () => ({ jamaah_id: '', title: '', full_name: '', gender: '', birth_date: '', nik: '', passport_number: '', passport_expiry: '', mahram_name: '', mahram_relation: '', save: true, relation: 'lainnya' });

/** Form data jamaah/penumpang: pilih dari data tersimpan atau isi manual (opsional simpan) */
export default function PassengerFields({ index, value, onChange, saved, errors, passportRequired, showMahram = true, showTitle = false }) {
    const err = (k) => errors?.[`passengers.${index}.${k}`];
    const set = (k, v) => onChange({ ...value, [k]: v });
    const picked = saved.find((s) => String(s.id) === String(value.jamaah_id));

    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold text-slate-900">{passportRequired ? 'Penumpang' : 'Jamaah'} {index + 1}</p>
                {saved.length > 0 && (
                    <select className="input w-auto py-1.5 text-xs" value={value.jamaah_id} onChange={(e) => onChange({ ...value, jamaah_id: e.target.value })}>
                        <option value="">+ Isi data baru</option>
                        {saved.map((s) => <option key={s.id} value={s.id}>{s.full_name}</option>)}
                    </select>
                )}
            </div>

            {picked ? (
                <div className="flex items-start gap-3 rounded-xl bg-brand-50 p-3 text-sm">
                    <UserCheck className="mt-0.5 h-5 w-5 text-brand-700" />
                    <div className="min-w-0">
                        <p className="font-semibold">{picked.full_name}</p>
                        <p className="text-xs text-slate-600">{picked.gender === 'P' ? 'Perempuan' : 'Laki-laki'} · lahir {picked.birth_date ?? '-'} · paspor {picked.masked_passport ?? <span className="text-amber-700">belum ada</span>}{picked.mahram_name && ` · mahram ${picked.mahram_name}`}</p>
                        {passportRequired && !picked.has_passport && (
                            <div className="mt-2 grid gap-2 sm:grid-cols-2">
                                <input className="input" placeholder="Nomor paspor" value={value.passport_number} onChange={(e) => set('passport_number', e.target.value.toUpperCase())} />
                                <input type="date" className="input" value={value.passport_expiry} onChange={(e) => set('passport_expiry', e.target.value)} />
                            </div>
                        )}
                        {(err('passport_number') || err('passport_expiry')) && <p className="error">{err('passport_number') || err('passport_expiry')}</p>}
                    </div>
                </div>
            ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                    {showTitle && (
                        <F label="Sapaan" err={err('title')}>
                            <select className="input" value={value.title} onChange={(e) => set('title', e.target.value)}><option value="">Pilih</option>{PASSENGER_TITLES.map((t) => <option key={t}>{t}</option>)}</select>
                        </F>
                    )}
                    <F label={passportRequired ? 'Nama lengkap (sesuai paspor)' : 'Nama lengkap'} err={err('full_name')} className={showTitle ? '' : 'sm:col-span-2'}>
                        <input className="input" value={value.full_name} onChange={(e) => set('full_name', e.target.value)} />
                    </F>
                    <F label="Jenis kelamin" err={err('gender')}>
                        <select className="input" value={value.gender} onChange={(e) => set('gender', e.target.value)}><option value="">Pilih</option><option value="L">Laki-laki</option><option value="P">Perempuan</option></select>
                    </F>
                    <F label="Tanggal lahir" err={err('birth_date')}><input type="date" className="input" value={value.birth_date} onChange={(e) => set('birth_date', e.target.value)} /></F>
                    {!passportRequired && <F label="NIK (opsional)" err={err('nik')}><input className="input" inputMode="numeric" maxLength={16} value={value.nik} onChange={(e) => set('nik', e.target.value.replace(/\D/g, ''))} /></F>}
                    <F label={`Nomor paspor${passportRequired ? '' : ' (bila sudah ada)'}`} err={err('passport_number')}><input className="input uppercase" value={value.passport_number} onChange={(e) => set('passport_number', e.target.value.toUpperCase())} /></F>
                    <F label="Masa berlaku paspor" err={err('passport_expiry')}><input type="date" className="input" value={value.passport_expiry} onChange={(e) => set('passport_expiry', e.target.value)} /></F>
                    {showMahram && (
                        <>
                            <F label="Nama mahram (opsional)"><input className="input" value={value.mahram_name} onChange={(e) => set('mahram_name', e.target.value)} /></F>
                            <F label="Hubungan mahram"><input className="input" placeholder="suami / ayah / saudara" value={value.mahram_relation} onChange={(e) => set('mahram_relation', e.target.value)} /></F>
                        </>
                    )}
                    <label className={cx('flex items-center gap-2 text-xs text-slate-600 sm:col-span-2')}>
                        <input type="checkbox" checked={!!value.save} onChange={(e) => set('save', e.target.checked)} /><UserPlus className="h-3.5 w-3.5" />Simpan ke Data Jamaah saya untuk pemesanan berikutnya
                    </label>
                </div>
            )}
        </div>
    );
}

const F = ({ label, err, children, className = '' }) => (
    <div className={className}>
        <label className="label">{label}</label>
        {children}
        {err && <p className="error">{err}</p>}
    </div>
);
