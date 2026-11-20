<?php

namespace App\Http\Controllers;

use App\Models\SupportTicket;
use App\Services\ChatbotService;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

/**
 * API chatbox (JSON, dipanggil widget). Satu percakapan aktif per pengguna;
 * riwayat tersimpan dengan kode tiket + kode pelanggan unik.
 */
class ChatController extends Controller
{
    public function __construct(private ChatbotService $bot) {}

    private function guestToken(Request $request): string
    {
        if (! $request->session()->has('chat_guest_token')) {
            $request->session()->put('chat_guest_token', Str::random(40));
        }

        return $request->session()->get('chat_guest_token');
    }

    private function current(Request $request, bool $create = true): ?SupportTicket
    {
        $user = $request->user();
        $q = SupportTicket::query();
        $user ? $q->where('user_id', $user->id) : $q->whereNull('user_id')->where('guest_token', $this->guestToken($request));
        $ticket = $q->where('status', '!=', 'selesai')->latest('id')->first();

        // Tamu yang baru login: pindahkan percakapan tamu ke akunnya (riwayat tidak hilang)
        if (! $ticket && $user && $request->session()->has('chat_guest_token')) {
            $ticket = SupportTicket::whereNull('user_id')->where('guest_token', $request->session()->get('chat_guest_token'))
                ->where('status', '!=', 'selesai')->latest('id')->first();
            $ticket?->update(['user_id' => $user->id, 'guest_token' => null]);
        }

        if (! $ticket && $create) {
            $ticket = SupportTicket::create([
                'user_id' => $user?->id,
                'guest_token' => $user ? null : $this->guestToken($request),
                'subject' => 'Percakapan Pusat Bantuan',
            ]);
            $this->bot->greet($ticket);
        }

        return $ticket;
    }

    private function payload(SupportTicket $ticket, int $after = 0): array
    {
        return [
            'ticket' => $ticket->only('code', 'status') + ['status_label' => SupportTicket::STATUSES[$ticket->status] ?? $ticket->status],
            'customer_code' => $ticket->user?->customer_code,
            'messages' => $ticket->messages()->where('id', '>', $after)->with('sender:id,name')->get()
                ->map(fn ($m) => [
                    'id' => $m->id, 'sender_type' => $m->sender_type, 'sender_name' => $m->sender?->name,
                    'message' => $m->message, 'options' => $m->options, 'created_at' => $m->created_at->format('H:i'),
                ]),
        ];
    }

    public function show(Request $request)
    {
        $ticket = $this->current($request);
        // tandai pesan admin sudah dibaca
        $ticket->messages()->where('sender_type', 'admin')->whereNull('read_at')->update(['read_at' => now()]);

        return response()->json($this->payload($ticket, (int) $request->query('after', 0)));
    }

    public function send(Request $request)
    {
        $data = $request->validate(['message' => 'required|string|max:2000']);
        $ticket = $this->current($request);
        $this->bot->handleUserMessage($ticket->load('user'), strip_tags($data['message']));

        return response()->json($this->payload($ticket->fresh(), (int) $request->input('after', 0)));
    }

    public function restart(Request $request)
    {
        if ($t = $this->current($request, false)) {
            $t->update(['status' => 'selesai', 'closed_at' => now()]);
        }

        return response()->json($this->payload($this->current($request)));
    }
}
