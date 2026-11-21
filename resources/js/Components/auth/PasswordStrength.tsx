import { Check, X } from 'lucide-react';
import { cn } from '@/Components/landing/lib';

const LABELS = ['Sangat lemah', 'Lemah', 'Cukup', 'Kuat', 'Sangat kuat'];
const COLORS = ['bg-red-500', 'bg-orange-500', 'bg-gold-500', 'bg-primary-500', 'bg-primary-700'];
const TEXT = ['text-red-600', 'text-orange-600', 'text-amber-700', 'text-primary-500', 'text-primary-700'];

/** Skor 1–5: panjang ≥8, panjang ≥12, huruf besar & kecil, angka, simbol. */
export function passwordScore(pw: string): number {
    if (!pw) return 0;
    const checks = [pw.length >= 8, pw.length >= 12, /[a-z]/.test(pw) && /[A-Z]/.test(pw), /\d/.test(pw), /[^A-Za-z0-9]/.test(pw)];
    return Math.max(1, checks.filter(Boolean).length);
}

/** 5 bar kekuatan + checklist syarat server (min 8, huruf & angka). */
export default function PasswordStrength({ password }: { password: string }) {
    const score = passwordScore(password);
    const rules: Array<[boolean, string]> = [
        [password.length >= 8, 'Minimal 8 karakter'],
        [/[A-Za-z]/.test(password) && /\d/.test(password), 'Huruf & angka'],
    ];

    return (
        <div aria-live="polite">
            <div className="flex items-center gap-3">
                <div className="grid flex-1 grid-cols-5 gap-1" aria-hidden="true">
                    {[0, 1, 2, 3, 4].map((i) => (
                        <span key={i} className={cn('h-1.5 rounded-full transition-colors duration-300', i < score ? COLORS[score - 1] : 'bg-primary-900/10')} />
                    ))}
                </div>
                <span className={cn('w-20 text-right text-xs font-bold', score ? TEXT[score - 1] : 'text-neutral-600/70')}>
                    {score ? LABELS[score - 1] : 'Kekuatan'}
                </span>
            </div>
            <ul className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                {rules.map(([ok, label]) => (
                    <li key={label} className={cn('flex items-center gap-1', ok ? 'text-primary-700' : 'text-neutral-600')}>
                        {ok ? <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden="true" /> : <X className="h-3.5 w-3.5" aria-hidden="true" />}
                        {label}<span className="sr-only">{ok ? ' terpenuhi' : ' belum terpenuhi'}</span>
                    </li>
                ))}
            </ul>
        </div>
    );
}
