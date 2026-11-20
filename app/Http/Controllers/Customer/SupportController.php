<?php

namespace App\Http\Controllers\Customer;

use App\Http\Controllers\Controller;
use App\Models\SupportTicket;
use Illuminate\Http\Request;
use Inertia\Inertia;

/** Riwayat percakapan pusat bantuan (pengganti konsultasi WhatsApp) */
class SupportController extends Controller
{
    public function index(Request $request)
    {
        return Inertia::render('Customer/Support', [
            'customerCode' => $request->user()->customer_code,
            'tickets' => SupportTicket::with(['messages.sender:id,name'])->where('user_id', $request->user()->id)->latest('last_message_at')->get()
                ->map(fn ($t) => [
                    'code' => $t->code, 'status' => $t->status, 'status_label' => SupportTicket::STATUSES[$t->status] ?? $t->status,
                    'created_at' => $t->created_at->format('d/m/Y H:i'),
                    'messages' => $t->messages->map(fn ($m) => [
                        'id' => $m->id, 'sender_type' => $m->sender_type, 'sender_name' => $m->sender?->name, 'message' => $m->message,
                        'created_at' => $m->created_at->format('d/m H:i'),
                    ]),
                ]),
        ]);
    }
}
