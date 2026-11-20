<?php

namespace App\Providers;

use Carbon\Carbon;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Facades\Vite;
use Illuminate\Support\ServiceProvider;
use Illuminate\Validation\Rules\Password;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        Vite::prefetch(concurrency: 3);
        Carbon::setLocale('id');
        setlocale(LC_TIME, 'id_ID.UTF-8', 'id_ID', 'Indonesian');

        if ($this->app->isProduction()) {
            URL::forceScheme('https');
        }

        Password::defaults(fn () => Password::min(8)->letters()->numbers());
    }
}
