import { useForm } from '@inertiajs/react';
import AdminLayout from '@/Layouts/AdminLayout';
import { Card, Input, PageHeader, Textarea } from '@/Components/ui';

const FIELDS = [
    ['company_name', 'Nama perusahaan'], ['company_tagline', 'Tagline'], ['license_ppiu', 'Nomor izin PPIU'],
    ['company_phone', 'Telepon kantor'], ['company_email', 'Email'], ['office_hours', 'Jam layanan'],
];

export default function Settings({ settings }) {
    const { data, setData, put, processing, errors } = useForm(settings);
    return (
        <AdminLayout title="Pengaturan">
            <PageHeader title="Pengaturan Perusahaan" subtitle="Ditampilkan di footer, invoice PDF, dan halaman kontak." />
            <form onSubmit={(e) => { e.preventDefault(); put(route('admin.settings.update')); }} className="space-y-6">
                <Card title="Identitas & kontak">
                    <div className="grid gap-4 sm:grid-cols-2">
                        {FIELDS.map(([k, l]) => <Input key={k} label={l} value={data[k] ?? ''} onChange={(e) => setData(k, e.target.value)} error={errors[k]} />)}
                        <Textarea className="sm:col-span-2" rows={2} label="Alamat kantor" value={data.company_address ?? ''} onChange={(e) => setData('company_address', e.target.value)} error={errors.company_address} />
                        <Input className="sm:col-span-2" label="URL embed Google Maps" value={data.map_embed ?? ''} onChange={(e) => setData('map_embed', e.target.value)} error={errors.map_embed} hint="Google Maps → Bagikan → Sematkan peta → salin nilai src" />
                    </div>
                </Card>
                <Card title="Kurs mata uang">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Input label="Kurs USD → Rupiah" type="number" value={data.usd_rate ?? ''} onChange={(e) => setData('usd_rate', e.target.value)} error={errors.usd_rate}
                            hint="Dipakai untuk layanan berharga USD (mis. visa). Perbarui sesuai kurs hari ini — pengajuan baru memakai kurs ini." />
                    </div>
                </Card>
                <Card title="Beranda">
                    <div className="space-y-4">
                        <Input label="Judul hero" value={data.hero_title ?? ''} onChange={(e) => setData('hero_title', e.target.value)} error={errors.hero_title} />
                        <Textarea rows={3} label="Subjudul hero" value={data.hero_subtitle ?? ''} onChange={(e) => setData('hero_subtitle', e.target.value)} />
                    </div>
                </Card>
                <button disabled={processing} className="btn-primary px-8">Simpan Pengaturan</button>
            </form>
        </AdminLayout>
    );
}
