import '../css/app.css';
import './bootstrap';

import { createInertiaApp, router } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { createRoot } from 'react-dom/client';

const appName = 'Sumatera Andalan Haramain';

// Ingat halaman terakhir di luar halaman login/daftar, untuk tombol "Kembali" di halaman autentikasi
const AUTH_PATH = /^\/(login|register|forgot-password|reset-password|verify-email|confirm-password|lengkapi-profil)(\/|$)/;
router.on('navigate', (e) => {
    const url = e.detail.page.url;
    if (!AUTH_PATH.test(url.split('?')[0])) {
        try { sessionStorage.setItem('sah.lastPage', url); } catch { /* penyimpanan tidak tersedia */ }
    }
});

createInertiaApp({
    // Judul yang sudah memuat merek ("SAH - …") dipakai apa adanya
    title: (title) => (!title ? appName : title.startsWith('SAH - ') ? title : `${title} — ${appName}`),
    // Halaman lama .jsx, halaman baru boleh .tsx (mis. landing)
    resolve: (name) => resolvePageComponent([`./Pages/${name}.tsx`, `./Pages/${name}.jsx`], import.meta.glob('./Pages/**/*.{jsx,tsx}')),
    setup({ el, App, props }) {
        createRoot(el).render(<App {...props} />);
    },
    progress: { color: '#C9A24B', showSpinner: false },
});
