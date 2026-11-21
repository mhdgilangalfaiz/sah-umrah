import { Eye, EyeOff, type LucideIcon } from 'lucide-react';
import { motion } from 'motion/react';
import { useState, type InputHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/Components/landing/lib';

export type AuthMode = 'login' | 'register';

export interface AuthSlide {
    title: string[];
    subtitle: string;
    image: string;
}

/** Status pesawat: melayang, jatuh (gagal), terbang (berhasil). */
export type PlaneState = 'idle' | 'crash' | 'fly';

interface IconInputProps extends InputHTMLAttributes<HTMLInputElement> {
    icon: LucideIcon;
    label: string;
    error?: string;
    trailing?: ReactNode;
}

/** Input ber-ikon h-11. Label untuk pembaca layar, placeholder untuk mata. Error di bawah + border merah. */
export function IconInput({ icon: Icon, label, error, trailing, className, id, ...props }: IconInputProps) {
    const inputId = id ?? `f-${props.name}`;
    return (
        <div className={className}>
            <label htmlFor={inputId} className="sr-only">{label}</label>
            <div className="relative">
                <Icon className={cn('pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2', error ? 'text-red-500' : 'text-neutral-600/70')} aria-hidden="true" />
                <input id={inputId} placeholder={label} aria-invalid={!!error} aria-describedby={error ? `${inputId}-err` : undefined}
                    className={cn('block h-11 w-full rounded-xl border bg-white/75 pl-11 text-sm text-neutral-900 placeholder:text-neutral-600/70 transition focus:bg-white focus:outline-none focus:ring-2',
                        trailing ? 'pr-11' : 'pr-3.5',
                        error ? 'border-red-400 focus:border-red-500 focus:ring-red-500/25' : 'border-primary-900/10 shadow-[0_1px_2px_rgba(11,77,42,0.06)] focus:border-primary-500 focus:ring-primary-500/25')}
                    {...props} />
                {trailing && <div className="absolute inset-y-0 right-0 flex items-center pr-1.5">{trailing}</div>}
            </div>
            {error && <p id={`${inputId}-err`} className="mt-1 text-xs font-medium text-red-600">{error}</p>}
        </div>
    );
}

/** Input kata sandi dengan tombol mata. */
export function PasswordInput(props: Omit<IconInputProps, 'type' | 'trailing'>) {
    const [show, setShow] = useState(false);
    return (
        <IconInput {...props} type={show ? 'text' : 'password'}
            trailing={(
                <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                    className="grid h-8 w-8 place-items-center rounded-lg text-neutral-600 transition hover:bg-primary-100 hover:text-primary-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500">
                    {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
            )} />
    );
}

/** Tab pill Login | Registrasi dengan highlight hijau yang bergeser. */
export function AuthTabs({ mode, onChange, tabs }: { mode: AuthMode; onChange: (m: AuthMode) => void; tabs: Array<{ key: AuthMode; label: string; icon: LucideIcon }> }) {
    return (
        <div role="tablist" aria-label="Pilih Login atau Registrasi" className="grid grid-cols-2 gap-1 rounded-full border border-white bg-white/60 p-1 shadow-[inset_0_1px_0_#fff]">
            {tabs.map(({ key, label, icon: Icon }) => (
                <button key={key} type="button" role="tab" aria-selected={mode === key} onClick={() => onChange(key)}
                    className={cn('relative flex h-10 items-center justify-center gap-2 rounded-full text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
                        mode === key ? 'text-white' : 'text-primary-700 hover:text-primary-900')}>
                    {mode === key && (
                        <motion.span layoutId="auth-tab" className="absolute inset-0 rounded-full bg-gradient-to-r from-primary-700 to-primary-900 shadow-md shadow-primary-700/30"
                            transition={{ type: 'spring', stiffness: 420, damping: 34 }} />
                    )}
                    <Icon className="relative h-4 w-4" aria-hidden="true" /><span className="relative">{label}</span>
                </button>
            ))}
        </div>
    );
}

export function Divider() {
    return (
        <div className="flex items-center gap-3 text-xs text-neutral-600">
            <span className="h-px flex-1 bg-primary-900/10" /> atau <span className="h-px flex-1 bg-primary-900/10" />
        </div>
    );
}

/** Login Google belum dibuka: tombol nonaktif dengan badge emas. */
export function GoogleSoon({ label }: { label: string }) {
    return (
        <button type="button" disabled aria-disabled="true"
            className="relative flex h-11 w-full cursor-not-allowed items-center justify-center gap-2.5 rounded-full border border-primary-900/10 bg-white/70 text-sm font-semibold text-neutral-600">
            <svg viewBox="0 0 48 48" className="h-5 w-5 opacity-60" aria-hidden="true">
                <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
                <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
                <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
                <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
            </svg>
            {label}
            <span className="absolute -top-2 right-4 rounded-full bg-gold-500 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-neutral-900 shadow">Segera hadir</span>
        </button>
    );
}

export const submitBtn = 'group flex h-11 w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-primary-700 to-primary-900 text-sm font-bold text-white shadow-md shadow-primary-700/25 transition hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2';
