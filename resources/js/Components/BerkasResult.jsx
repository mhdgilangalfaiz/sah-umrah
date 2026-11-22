import { CheckCircle2, Download, XCircle } from 'lucide-react';
import { StatusBadge } from '@/Components/ui';
import { fileSize } from '@/lib/format';

/** Berkas yang sudah diperiksa: hasil per dokumen */
export default function BerkasResult({ doc }) {
    return (
        <div className="rounded-xl border border-slate-100 p-3">
            <div className="flex flex-wrap items-center gap-3">
                <div className="min-w-0 flex-1"><a href={doc.url} className="flex items-center gap-1.5 font-medium text-brand-700 hover:underline"><Download className="h-4 w-4" />{doc.file_name}</a><p className="text-xs text-slate-500">{doc.size ? `${fileSize(doc.size)} · ` : ''}{doc.created_at}</p></div>
                <StatusBadge status={doc.status} />
            </div>
            {doc.review?.length > 0 ? (
                <ul className="mt-2 space-y-1 text-sm">
                    {doc.review.map((r, i) => (
                        <li key={i} className="flex gap-2">
                            {r.ok ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /> : <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />}
                            <span className="min-w-0"><span className="break-all">{r.name}</span>{!r.ok && r.note && <span className="block text-xs text-red-600">{r.note}</span>}</span>
                        </li>
                    ))}
                </ul>
            ) : doc.rejection_note && <p className="mt-1 text-xs text-red-600">{doc.rejection_note}</p>}
        </div>
    );
}
