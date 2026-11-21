import defaultTheme from 'tailwindcss/defaultTheme';
import forms from '@tailwindcss/forms';

/** @type {import('tailwindcss').Config} */
export default {
    content: [
        './vendor/laravel/framework/src/Illuminate/Pagination/resources/views/*.blade.php',
        './storage/framework/views/*.php',
        './resources/views/**/*.blade.php',
        './resources/js/**/*.jsx',
        './resources/js/**/*.js',
        './resources/js/**/*.tsx',
        './resources/js/**/*.ts',
    ],

    theme: {
        extend: {
            // layar pendek (laptop dengan skala 125–150%): sidebar portal dipadatkan
            screens: { short: { raw: '(max-height: 820px)' } },
            fontFamily: {
                sans: ['"Plus Jakarta Sans"', ...defaultTheme.fontFamily.sans],
                serif: ['"Playfair Display"', ...defaultTheme.fontFamily.serif],
                jakarta: ['"Plus Jakarta Sans"', ...defaultTheme.fontFamily.sans],
            },
            colors: {
                // Design system landing page
                primary: { 900: '#0B4D2A', 700: '#13693A', 500: '#2E8B57', 100: '#E8F3EC', 50: '#F4F9F5' },
                neutral: { 900: '#1A1A1A', 600: '#555555' },
                // Hijau khas perusahaan (mengikuti desain landing page)
                brand: {
                    50: '#f1f8ec', 100: '#e1f1d5', 200: '#c8e6ae', 300: '#9fd07f', 400: '#63ad55',
                    500: '#2f8f3a', 600: '#137a2c', 700: '#04632A', 800: '#025222', 900: '#004322', 950: '#002612',
                },
                // Emas lembut (tidak menyilaukan)
                gold: {
                    // 100 & 500 lewat CSS variable: nilai lama di halaman lain, nilai design system di dalam .landing-ds (app.css)
                    50: '#fbf7ec', 100: 'rgb(var(--gold-100) / <alpha-value>)', 200: '#ead59f', 300: '#ddbb6c', 400: '#C9A24B', 500: 'rgb(var(--gold-500) / <alpha-value>)',
                    600: '#9a742c', 700: '#7b5a26', 800: '#664a25', 900: '#563f23',
                },
                sand: { 50: '#faf8f3', 100: '#f4f1e8', 200: '#e9e4d6' },
            },
            boxShadow: {
                soft: '0 1px 2px rgba(16,24,40,.04), 0 4px 16px rgba(16,24,40,.06)',
                lift: '0 10px 30px -10px rgba(11,93,59,.25)',
            },
            keyframes: {
                'fade-up': { '0%': { opacity: 0, transform: 'translateY(8px)' }, '100%': { opacity: 1, transform: 'none' } },
                'pop': { '0%': { opacity: 0, transform: 'scale(.96)' }, '100%': { opacity: 1, transform: 'none' } },
                'page-in': { '0%': { opacity: 0 }, '100%': { opacity: 1 } },
                // Kilau berkala badge Best Seller: lewat cepat lalu diam
                shimmer: { '0%, 70%': { transform: 'translateX(-120%)' }, '100%': { transform: 'translateX(220%)' } },
                // Testimoni berjalan: daftar digandakan, geser setengah lebar
                marquee: { '0%': { transform: 'translateX(0)' }, '100%': { transform: 'translateX(-50%)' } },
            },
            animation: {
                'fade-up': 'fade-up .45s ease-out both',
                pop: 'pop .2s ease-out both',
                'page-in': 'page-in .25s ease-out',
                shimmer: 'shimmer 3.2s ease-in-out infinite',
                marquee: 'marquee 45s linear infinite',
            },
        },
    },

    plugins: [forms],
};
