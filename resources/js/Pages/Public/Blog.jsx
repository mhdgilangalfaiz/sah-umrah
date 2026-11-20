import { Link } from '@inertiajs/react';
import PublicLayout from '@/Layouts/PublicLayout';
import { CoverImage, Empty, Pagination } from '@/Components/ui';
import { date } from '@/lib/format';

export default function Blog({ posts }) {
    return (
        <PublicLayout title="Blog">
            <div className="container-app py-10">
                <h1 className="text-3xl sm:text-4xl">Blog & Panduan Umrah</h1>
                <p className="mt-2 text-slate-600">Artikel, tips, dan panduan ibadah dari tim PT. Sumatera Andalan Haramain.</p>
                {posts.data.length === 0 ? <div className="card mt-8"><Empty title="Belum ada artikel" /></div> : (
                    <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        {posts.data.map((p) => (
                            <Link key={p.id} href={route('blog.show', p.slug)} className="card group overflow-hidden transition hover:shadow-lift">
                                <div className="aspect-[16/9] overflow-hidden"><CoverImage src={p.cover_url} alt={p.title} className="transition group-hover:scale-105" /></div>
                                <div className="p-5">
                                    <p className="text-xs text-slate-400">{date(p.published_at)}</p>
                                    <h2 className="mt-1 text-lg leading-snug group-hover:text-brand-700">{p.title}</h2>
                                    <p className="mt-2 line-clamp-2 text-sm text-slate-600">{p.excerpt}</p>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
                <div className="mt-6"><Pagination meta={posts} /></div>
            </div>
        </PublicLayout>
    );
}
