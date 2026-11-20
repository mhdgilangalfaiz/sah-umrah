import { router } from '@inertiajs/react';
import { Search } from 'lucide-react';
import { useState } from 'react';

/**
 * Bar filter admin. fields: [{ name, type: 'search'|'select'|'date'|'checkbox', label, options }]
 */
export default function FilterBar({ routeName, routeParams, filters = {}, fields, children }) {
    const [f, setF] = useState(filters);
    const apply = (next) => router.get(route(routeName, routeParams), Object.fromEntries(Object.entries(next).filter(([, v]) => v !== '' && v != null && v !== false)), { preserveState: true, replace: true });
    const set = (k, v, instant) => {
        const next = { ...f, [k]: v };
        setF(next);
        if (instant) apply(next);
    };

    return (
        <form onSubmit={(e) => { e.preventDefault(); apply(f); }} className="card mb-4 flex flex-wrap items-end gap-3 p-3">
            {fields.map((fd) => {
                if (fd.type === 'search') return (
                    <div key={fd.name} className="relative min-w-[200px] flex-1">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input className="input pl-9" placeholder={fd.label ?? 'Cari…'} value={f[fd.name] ?? ''} onChange={(e) => set(fd.name, e.target.value)} />
                    </div>
                );
                if (fd.type === 'select') return (
                    <select key={fd.name} className="input w-auto" value={f[fd.name] ?? ''} onChange={(e) => set(fd.name, e.target.value, true)}>
                        <option value="">{fd.label}</option>
                        {Object.entries(fd.options).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                );
                if (fd.type === 'date') return (
                    <div key={fd.name}><label className="mb-0.5 block text-[11px] text-slate-500">{fd.label}</label><input type="date" className="input w-auto py-2" value={f[fd.name] ?? ''} onChange={(e) => set(fd.name, e.target.value, true)} /></div>
                );
                if (fd.type === 'checkbox') return (
                    <label key={fd.name} className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-sm"><input type="checkbox" checked={!!f[fd.name]} onChange={(e) => set(fd.name, e.target.checked ? 1 : '', true)} />{fd.label}</label>
                );
                return null;
            })}
            <button className="btn-primary">Terapkan</button>
            {children}
        </form>
    );
}
