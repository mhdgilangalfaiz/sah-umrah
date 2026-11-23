<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use App\Services\FileStorage;
use App\Support\Audit;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * Audio suasana galeri (mis. talbiyah). Tidak pernah diputar otomatis: pengunjung menekan tombol 🔊 di lightbox.
 * Sumber: file unggahan (disk public, galeri/audio) atau link URL langsung ke file audio.
 */
class GalleryAudioController extends Controller
{
    public const KEY = 'gallery_audio';

    public const TITLE_KEY = 'gallery_audio_title';

    /** URL siap putar untuk halaman publik (null bila belum diatur). */
    public static function url(): ?string
    {
        $v = Setting::get(self::KEY);

        return $v ? (Str::startsWith($v, ['http://', 'https://']) ? $v : asset('storage/'.$v)) : null;
    }

    public function update(Request $request)
    {
        $data = $request->validate([
            'audio' => ['nullable', 'file', 'mimetypes:audio/mpeg,audio/mp3,audio/mp4,audio/x-m4a,audio/aac,audio/ogg,audio/wav,audio/x-wav,audio/webm', 'max:10240'],
            'url' => ['nullable', 'url', 'max:500', 'regex:/^https:\/\//i'],
            'title' => ['nullable', 'string', 'max:80'],
        ], [
            'audio.mimetypes' => 'Format audio harus MP3, M4A, OGG, atau WAV.',
            'audio.max' => 'Ukuran audio maksimal 10 MB.',
            'url.regex' => 'Link harus diawali https://',
        ]);

        $old = Setting::get(self::KEY);
        if ($request->hasFile('audio')) {
            $new = FileStorage::storePublic($request->file('audio'), 'galeri/audio', $data['title'] ?? 'audio-galeri');
        } elseif (! empty($data['url'])) {
            if (preg_match('~(youtube\.com|youtu\.be|spotify\.com|soundcloud\.com)~i', $data['url'])) {
                throw ValidationException::withMessages(['url' => 'Link YouTube/Spotify/SoundCloud tidak bisa diputar langsung. Pakai link langsung ke file audio (berakhiran .mp3 dsb) atau unggah filenya.']);
            }
            $new = $data['url'];
        } else {
            $new = $old; // hanya mengubah judul
        }

        Setting::updateOrCreate(['key' => self::KEY], ['value' => $new]);
        Setting::updateOrCreate(['key' => self::TITLE_KEY], ['value' => $data['title'] ?? '']);
        if ($old !== $new) {
            FileStorage::deletePublic($old); // file lama dihapus (link URL tidak disentuh)
        }
        Audit::log('konten.galeri_audio', 'Mengubah audio suasana galeri');

        return back()->with('success', 'Audio galeri disimpan.');
    }

    public function destroy()
    {
        FileStorage::deletePublic(Setting::get(self::KEY));
        Setting::updateOrCreate(['key' => self::KEY], ['value' => '']);
        Audit::log('konten.galeri_audio', 'Menghapus audio suasana galeri');

        return back()->with('success', 'Audio galeri dihapus.');
    }
}
