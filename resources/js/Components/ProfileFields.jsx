import { Input, Select, Textarea } from './ui';

export default function ProfileFields({ data, setData, errors, nikPlaceholder }) {
    return (
        <div className="grid gap-4 sm:grid-cols-2">
            <Input className="sm:col-span-2" label="Nama lengkap (sesuai KTP)" value={data.name} onChange={(e) => setData('name', e.target.value)} error={errors.name} required />
            <Input label="Nomor HP / WhatsApp" inputMode="tel" placeholder="081234567890" value={data.phone ?? ''} onChange={(e) => setData('phone', e.target.value)} error={errors.phone} hint="Untuk pengingat otomatis pembayaran & keberangkatan" required />
            <Input label="NIK (16 digit)" inputMode="numeric" maxLength={16} placeholder={nikPlaceholder} value={data.nik ?? ''} onChange={(e) => setData('nik', e.target.value.replace(/\D/g, ''))} error={errors.nik} hint="Disimpan terenkripsi" required />
            <Input label="Tempat lahir" value={data.birth_place ?? ''} onChange={(e) => setData('birth_place', e.target.value)} error={errors.birth_place} required />
            <Input label="Tanggal lahir" type="date" value={data.birth_date ?? ''} onChange={(e) => setData('birth_date', e.target.value)} error={errors.birth_date} required />
            <Select label="Jenis kelamin" value={data.gender ?? ''} onChange={(e) => setData('gender', e.target.value)} options={{ L: 'Laki-laki', P: 'Perempuan' }} placeholder="Pilih" error={errors.gender} required />
            <Input label="Kota / Kabupaten" value={data.city ?? ''} onChange={(e) => setData('city', e.target.value)} error={errors.city} required />
            <Textarea className="sm:col-span-2" rows={2} label="Alamat lengkap" value={data.address ?? ''} onChange={(e) => setData('address', e.target.value)} error={errors.address} required />
        </div>
    );
}
