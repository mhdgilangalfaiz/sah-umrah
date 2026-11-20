<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\SupportTicket;
use App\Notifications\SystemNotification;
use App\Support\Audit;
use Illuminate\Http\Request;
use Inertia\Inertia;

/** Pusat bantuan admin: menerima eskalasi dari chatbox, melihat riwayat percakapan, membalas langsung */
class SupportController extends Controller
{
    public function index(Request $request)
    {
        $status = $request->string('status', 'aktif')->toString();

        return Inertia::render('Admin/Support/Index', [
            'tickets' => SupportTicket::with('user:id,name,customer_code', 'assignee:id,name', 'latestMessage')
                ->whereNotNull('user_id')
                ->when($status === 'aktif', fn ($q) => $q->whereIn('status', ['menunggu_admin', 'ditangani']))
                ->when(! in_array($status, ['aktif', 'semua'], true), fn ($q) => $q->where('status', $status))
                ->when($request->q, fn ($q, $s) => $q->where(fn ($w) => $w->where('code', 'like', "%$s%")
                    ->orWhereHas('user', fn ($u) => $u->where('name', 'like', "%$s%")->orWhere('customer_code', 'like', "%$s%"))))
                ->orderByRaw("CASE status WHEN 'menunggu_admin' THEN 0 WHEN 'ditangani' THEN 1 ELSE 2 END")
                ->latest('last_message_at')->paginate(25)->withQueryString()
                ->through(fn ($t) => [
                    'code' => $t->code, 'status' => $t->status, 'status_label' => SupportTicket::STATUSES[$t->status],
                    'user' => $t->user?->name, 'customer_code' => $t->user?->customer_code, 'assignee' => $t->assignee?->name,
                    'last' => $t->latestMessage?->message, 'last_at' => $t->last_message_at?->diffForHumans(),
                    'escalated_at' => $t->escalated_at?->diffForHumans(),
                ]),
            'filters' => ['status' => $status, 'q' => $request->q],
        ]);
    }

    private function messages(SupportTicket $ticket, int $after = 0)
    {
        return $ticket->messages()->where('id', '>', $after)->with('sender:id,name')->get()->map(fn ($m) => [
            'id' => $m->id, 'sender_type' => $m->sender_type, 'sender_name' => $m->sender?->name, 'message' => $m->message,
            'options' => $m->options, 'created_at' => $m->created_at->format('d/m H:i'),
        ]);
    }

    public function show(SupportTicket $ticket)
    {
        $ticket->load('user');
        // Admin pertama yang membuka tiket otomatis menangani
        if ($ticket->status === 'menunggu_admin') {
            $ticket->update(['status' => 'ditangani', 'assigned_to' => auth()->id()]);
            $ticket->messages()->create(['sender_type' => 'system', 'message' => auth()->user()->name.' (Admin) telah bergabung dalam percakapan.']);
            Audit::log('bantuan.ditangani', "Menangani tiket {$ticket->code}", $ticket);
        }

        $user = $ticket->user;

        return Inertia::render('Admin/Support/Show', [
            'ticket' => $ticket->only('code', 'status', 'created_at') + ['status_label' => SupportTicket::STATUSES[$ticket->status]],
            'customer' => $user ? [
                'name' => $user->name, 'email' => $user->email, 'phone' => $user->phone, 'customer_code' => $user->customer_code,
                'bookings' => $user->bookings()->latest()->take(5)->get(['code', 'status', 'total_amount', 'paid_amount']),
                'flights' => $user->flightOrders()->latest()->take(3)->get(['code', 'status']),
                'visas' => $user->visaApplications()->latest()->take(3)->get(['code', 'status']),
            ] : null,
            'messages' => $this->messages($ticket),
            'history' => SupportTicket::where('user_id', $ticket->user_id)->where('id', '!=', $ticket->id)->latest()->take(10)->get(['code', 'status', 'created_at']),
        ]);
    }

    public function messagesJson(SupportTicket $ticket, Request $request)
    {
        return response()->json(['messages' => $this->messages($ticket, (int) $request->query('after', 0)), 'status' => $ticket->status]);
    }

    public function reply(Request $request, SupportTicket $ticket)
    {
        $data = $request->validate(['message' => 'required|string|max:3000']);
        abort_if($ticket->status === 'selesai', 422, 'Tiket sudah ditutup.');

        $ticket->messages()->create(['sender_type' => 'admin', 'sender_id' => $request->user()->id, 'message' => strip_tags($data['message'])]);
        $ticket->update(['status' => 'ditangani', 'assigned_to' => $ticket->assigned_to ?? $request->user()->id, 'last_message_at' => now()]);
        Audit::log('bantuan.balas', "Membalas tiket {$ticket->code}", $ticket);

        $ticket->user?->notify(new SystemNotification('bantuan', 'Balasan Admin — '.$ticket->code,
            \Illuminate\Support\Str::limit($data['message'], 140), route('customer.support.index'), 'Buka Percakapan', false));

        if ($request->wantsJson()) {
            return response()->json(['messages' => $this->messages($ticket, (int) $request->input('after', 0))]);
        }

        return back();
    }

    public function status(Request $request, SupportTicket $ticket)
    {
        $data = $request->validate(['status' => 'required|in:ditangani,selesai,bot']);
        $ticket->update(['status' => $data['status'], 'closed_at' => $data['status'] === 'selesai' ? now() : null]);
        $ticket->messages()->create(['sender_type' => 'system', 'message' => match ($data['status']) {
            'selesai' => 'Percakapan ditutup oleh admin. Terima kasih telah menghubungi kami. Jika ada pertanyaan lain, silakan mulai percakapan baru. 🙏',
            'bot' => 'Percakapan dikembalikan ke asisten otomatis.',
            default => 'Percakapan dibuka kembali oleh admin.',
        }]);
        Audit::log('bantuan.status', "Tiket {$ticket->code} → {$data['status']}", $ticket);

        return back()->with('success', 'Status tiket diperbarui.');
    }
}
