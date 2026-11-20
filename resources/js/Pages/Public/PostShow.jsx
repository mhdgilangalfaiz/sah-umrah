import { Link } from '@inertiajs/react';
import PublicLayout from '@/Layouts/PublicLayout';
import { CoverImage } from '@/Components/ui';
import { longDate } from '@/lib/format';

export default function PostShow({ post, others }) {
    return (
        <PublicLayout title={post.title}>
            <article className="container-app max-w-3xl py-10">
                <Link href={route('blog.index')} className="text-sm text-brand-700 hover:underline">← Semua artikel</Link>
                <h1 className="mt-3 text-3xl leading-tight sm:text-4xl">{post.title}</h1>
                <p className="mt-2 text-sm text-slate-500">{longDate(post.published_at)} · {post.author?.name}</p>
                <div className="mt-6 aspect-[16/8] overflow-hidden rounded-2xl"><CoverImage src={post.cover_url} alt={post.title} /></div>
                <div className="prose-app mt-8" dangerouslySetInnerHTML={{ __html: post.content }} />
            </article>
            {others.length > 0 && (
                <div className="container-app max-w-3xl border-t border-slate-200 pt-8">
                    <p className="font-serif text-xl">Artikel lainnya</p>
                    <div className="mt-4 grid gap-3 sm:grid-cols-3">
                        {others.map((o) => <Link key={o.id} href={route('blog.show', o.slug)} className="card p-4 text-sm font-semibold hover:text-brand-700">{o.title}</Link>)}
                    </div>
                </div>
            )}
        </PublicLayout>
    );
}
