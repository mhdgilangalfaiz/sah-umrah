import PublicLayout from '@/Layouts/PublicLayout';

export default function Page({ page }) {
    return (
        <PublicLayout title={page.title}>
            <section className="relative overflow-hidden bg-brand-900 py-12">
                <div className="absolute inset-0 bg-pattern opacity-40" />
                <div className="container-app relative"><h1 className="text-3xl text-white sm:text-4xl">{page.title}</h1></div>
            </section>
            <div className="container-app max-w-3xl py-10">
                {/* konten disanitasi di server (strip_tags whitelist) */}
                <div className="card card-pad prose-app" dangerouslySetInnerHTML={{ __html: page.content }} />
            </div>
        </PublicLayout>
    );
}
