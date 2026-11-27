<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Jobs\SendAgentBroadcast;
use App\Models\AgentBroadcast;
use App\Models\AgentBroadcastRecipient;
use App\Models\User;
use App\Support\AgentMessage;
use App\Support\Audit;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

/**
 * Agen: pelanggan yang ditandai admin karena sering memesan banyak / menjual kembali layanan SAH.
 * Penanda hanya terlihat admin. Dari sini admin menyiarkan paket, tiket, visa, atau promo
 * lewat WhatsApp otomatis ke semua agen sekaligus.
 */
class AgentController extends Controller
{
    public function index(Request $request)
    {
        $agents = User::agents()
            ->when($request->q, fn ($q, $s) => $q->where(fn ($w) => $w->where('name', 'like', "%$s%")->orWhere('phone', 'like', "%$s%")
                ->orWhere('email', 'like', "%$s%")->orWhere('customer_code', 'like', "%$s%")))
            ->withCount(['bookings', 'flightOrders'])
            ->orderBy('name')->get()
            ->map(fn (User $u) => [
                'id' => $u->id, 'name' => $u->name, 'email' => $u->email, 'phone' => $u->phone, 'code' => $u->customer_code,
                'note' => $u->agent_note, 'marked_at' => $u->agent_marked_at?->format('d/m/Y'), 'is_active' => $u->is_active,
                'orders' => $u->bookings_count + $u->flight_orders_count,
            ]);

        return Inertia::render('Admin/Agents', [
            'agents' => $agents,
            'filters' => $request->only('q'),
            'options' => AgentMessage::options(),
            'types' => AgentBroadcast::TYPES,
            'broadcasts' => AgentBroadcast::with('sender:id,name')->withCount([
                'recipientsList as sent_count' => fn ($q) => $q->whereIn('status', ['terkirim', 'simulasi']),
                'recipientsList as failed_count' => fn ($q) => $q->where('status', 'gagal'),
                'recipientsList as queued_count' => fn ($q) => $q->where('status', 'antri'),
            ])->latest('id')->take(15)->get()->map(fn ($b) => [
                'id' => $b->id, 'type' => AgentBroadcast::TYPES[$b->item_type] ?? $b->item_type, 'title' => $b->title, 'message' => $b->message,
                'recipients' => $b->recipients, 'sent' => $b->sent_count, 'failed' => $b->failed_count, 'queued' => $b->queued_count,
                'by' => $b->sender?->name, 'at' => $b->created_at->format('d/m/Y H:i'),
            ]),
            'waActive' => (bool) config('services.whatsapp.token'),
        ]);
    }

    /** Cari pelanggan yang belum menjadi agen (untuk ditambahkan) */
    public function search(Request $request)
    {
        $s = trim((string) $request->query('q'));
        if (mb_strlen($s) < 2) return response()->json([]);

        return response()->json(User::customers()->where('is_agent', false)
            ->where(fn ($w) => $w->where('name', 'like', "%$s%")->orWhere('email', 'like', "%$s%")
                ->orWhere('phone', 'like', "%$s%")->orWhere('customer_code', 'like', "%$s%"))
            ->orderBy('name')->take(10)->get(['id', 'name', 'email', 'phone', 'customer_code']));
    }

    public function mark(Request $request, User $user)
    {
        abort_if($user->isAdmin(), 422, 'Akun admin tidak bisa ditandai sebagai agen.');
        $data = $request->validate(['note' => 'nullable|string|max:255']);
        $user->forceFill(['is_agent' => true, 'agent_marked_at' => now(), 'agent_note' => $data['note'] ?? null])->save();
        Audit::log('pengguna.agen_tandai', "Menandai {$user->name} ({$user->customer_code}) sebagai agen", $user);

        return back()->with('success', "{$user->name} ditandai sebagai agen.");
    }

    public function note(Request $request, User $user)
    {
        abort_unless($user->is_agent, 404);
        $data = $request->validate(['note' => 'nullable|string|max:255']);
        $user->forceFill(['agent_note' => $data['note'] ?? null])->save();

        return back()->with('success', 'Catatan agen disimpan.');
    }

    public function unmark(User $user)
    {
        $user->forceFill(['is_agent' => false, 'agent_marked_at' => null, 'agent_note' => null])->save();
        Audit::log('pengguna.agen_hapus', "Menghapus tanda agen {$user->name} ({$user->customer_code})", $user);

        return back()->with('success', "{$user->name} tidak lagi ditandai sebagai agen.");
    }

    /** Draf pesan otomatis dari layanan yang dipilih (bisa diedit admin sebelum dikirim) */
    public function preview(Request $request)
    {
        $data = $request->validate([
            'item_type' => ['required', Rule::in(array_keys(AgentBroadcast::TYPES))],
            'item_id' => 'nullable|integer',
        ]);
        $draft = AgentMessage::build($data['item_type'], $data['item_id'] ?? null);
        abort_unless($draft, 404, 'Layanan tidak ditemukan.');

        return response()->json($draft);
    }

    /** Kirim serentak ke semua agen aktif lewat WhatsApp */
    public function send(Request $request)
    {
        $data = $request->validate([
            'item_type' => ['required', Rule::in(array_keys(AgentBroadcast::TYPES))],
            'item_id' => ['nullable', 'integer', Rule::requiredIf(fn () => $request->item_type !== 'bebas')],
            'title' => 'required|string|max:200',
            'message' => 'required|string|min:10|max:4000',
        ], ['item_id.required' => 'Pilih layanan yang akan disebarkan.', 'message.required' => 'Isi pesan tidak boleh kosong.']);

        $agents = User::agents()->where('is_active', true)->get(['id', 'name', 'phone']);
        if ($agents->isEmpty()) {
            return back()->withErrors(['message' => 'Belum ada agen aktif. Tandai pelanggan sebagai agen terlebih dahulu.']);
        }

        $broadcast = AgentBroadcast::create([
            'item_type' => $data['item_type'], 'item_id' => $data['item_id'] ?? null, 'title' => $data['title'],
            'message' => $data['message'], 'recipients' => $agents->count(), 'sent_by' => $request->user()->id,
        ]);
        AgentBroadcastRecipient::insert($agents->map(fn ($a) => [
            'agent_broadcast_id' => $broadcast->id, 'user_id' => $a->id, 'name' => $a->name, 'phone' => $a->phone,
            'status' => 'antri', 'created_at' => now(), 'updated_at' => now(),
        ])->all());

        SendAgentBroadcast::dispatchAfterResponse($broadcast->id);
        Audit::log('konten.agen_siaran', "Siaran WA \"{$broadcast->title}\" ke {$agents->count()} agen", $broadcast);

        return back()->with('success', "Pesan sedang dikirim ke {$agents->count()} agen. Status tiap agen ada di Riwayat siaran.");
    }

    /** Kirim satu pesan tes untuk memastikan sambungan WhatsApp (Fonnte) berjalan */
    public function test(Request $request, \App\Services\WhatsAppService $wa)
    {
        $data = $request->validate(['phone' => ['required', 'regex:/^(\+?62|0)8[0-9]{7,12}$/']], ['phone.regex' => 'Nomor WhatsApp tidak valid, mis. 0856xxxxxxxx.']);
        $res = $wa->sendDetailed($data['phone'], "Tes WhatsApp otomatis SAH ✅
Jika pesan ini sampai, pengiriman informasi ke agen sudah aktif.

_".now()->translatedFormat('d M Y H:i').'_');
        Audit::log('konten.agen_tes_wa', 'Kirim pesan tes WhatsApp ke '.$wa->normalize($data['phone']).' — '.($res['ok'] ? 'berhasil' : 'gagal'));

        return match (true) {
            $res['simulated'] => back()->with('error', 'WhatsApp masih mode simulasi: WHATSAPP_TOKEN di .env belum diisi.'),
            $res['ok'] => back()->with('success', 'Pesan tes terkirim ke '.$data['phone'].'. Cek WhatsApp Anda.'),
            default => back()->with('error', 'Gagal mengirim: '.$res['reason']),
        };
    }

    /** Status kirim per agen untuk satu siaran (dipantau berkala dari halaman) */
    public function status(AgentBroadcast $broadcast)
    {
        return response()->json($broadcast->recipientsList()->orderBy('name')->get(['id', 'name', 'phone', 'status', 'error', 'sent_at'])
            ->map(fn ($r) => $r->only('id', 'name', 'phone', 'status', 'error') + ['status_label' => AgentBroadcastRecipient::STATUSES[$r->status] ?? $r->status, 'sent_at' => $r->sent_at?->format('d/m H:i')]));
    }
}
