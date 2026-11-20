<?php

namespace App\Http\Controllers;

abstract class Controller
{
    /** Pastikan resource milik user login (admin boleh melihat semua). 404 agar tidak membocorkan keberadaan data. */
    protected function ensureOwner($model): void
    {
        $user = auth()->user();
        abort_unless($user && ($user->isAdmin() || (int) $model->user_id === (int) $user->id), 404);
    }
}
