import { Link, useForm } from '@inertiajs/react';
import { ExternalLink } from 'lucide-react';
import { useState } from 'react';
import AdminLayout from '@/Layouts/AdminLayout';
import { Card, Input, PageHeader, cx } from '@/Components/ui';

export default function Pages({ pages }) {
    const [sel, setSel] = useState(pages[0]);
    const form = useForm({ title: sel?.title ?? '', content: sel?.content ?? '' });
    const pick = (p) => { setSel(p); form.setData({ title: p.title, content: p.content }); };

    return (
        <AdminLayout title="Halaman">
            <PageHeader title="Halaman Informasi" subtitle="Tentang Kami, Kontak, Syarat & Ketentuan, Kebijakan Privasi, Kebijakan Refund. HTML sederhana diperbolehkan." />
            <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
                <div className="space-y-1">
                    {pages.map((p) => <button key={p.id} onClick={() => pick(p)} className={cx('w-full rounded-xl px-3 py-2.5 text-left text-sm font-medium', sel?.id === p.id ? 'bg-brand-700 text-white' : 'bg-white text-slate-600 hover:bg-slate-100')}>{p.title}</button>)}
                </div>
                {sel && (
                    <div className="grid gap-6 2xl:grid-cols-2">
                        <Card title="Editor" actions={<a href={sel.slug === "kontak" ? route("pages.contact") : route("pages.show", sel.slug)} target="_blank" rel="noreferrer" className="btn-ghost btn-sm"><ExternalLink className="h-4 w-4" />Lihat</a>}>
                            <form onSubmit={(e) => { e.preventDefault(); form.put(route('admin.pages.update', sel.id), { preserveScroll: true }); }} className="space-y-3">
                                <Input label="Judul" value={form.data.title} onChange={(e) => form.setData('title', e.target.value)} error={form.errors.title} />
                                <div><label className="label">Isi (HTML)</label><textarea rows={22} className="input font-mono text-xs" value={form.data.content} onChange={(e) => form.setData('content', e.target.value)} />{form.errors.content && <p className="error">{form.errors.content}</p>}</div>
                                <button disabled={form.processing} className="btn-primary">Simpan</button>
                            </form>
                        </Card>
                        <Card title="Pratinjau"><div className="prose-app" dangerouslySetInnerHTML={{ __html: form.data.content }} /></Card>
                    </div>
                )}
            </div>
        </AdminLayout>
    );
}
