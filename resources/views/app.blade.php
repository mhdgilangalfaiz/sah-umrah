<!DOCTYPE html>
<html lang="id">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
        <meta name="theme-color" content="#0B5D3B">
        @php($pageFile = file_exists(resource_path("js/Pages/{$page['component']}.tsx")) ? "{$page['component']}.tsx" : "{$page['component']}.jsx")
        @if ($page['component'] === 'landing')
            <meta name="description" content="SAH - PT. Sumatera Andalan Haramain, travel umrah amanah & profesional dari Kota Medan. Paket umrah terbaik, tiket pesawat, dan layanan visa dengan pembimbing berpengalaman." inertia="description">
            <link rel="preload" as="image" href="{{ $page['props']['content']['hero']['image'] ?? '' }}" fetchpriority="high">
        @else
            <meta name="description" content="PT. Sumatera Andalan Haramain — biro perjalanan umrah resmi berizin Kemenag di Kota Medan. Paket umrah, tiket pesawat, dan layanan visa dengan pembayaran aman melalui sistem.">
        @endif

        <title inertia>{{ config('app.name', 'Sumatera Andalan Haramain') }}</title>
        <link rel="icon" type="image/png" href="{{ asset('images/logo-sah.png') }}">

        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">

        @routes
        @viteReactRefresh
        @vite(['resources/js/app.jsx', "resources/js/Pages/{$pageFile}"])
        @inertiaHead
    </head>
    <body class="font-sans antialiased">
        @inertia
    </body>
</html>
