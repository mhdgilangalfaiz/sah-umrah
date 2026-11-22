<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Item galeri.
 *  - Foto  = album: judul + subjudul + banyak foto (`photos`, urut tampil). `image` = foto sampul (foto pertama).
 *  - Video = satu file di `image`.
 * Semua path berada di disk public (galeri/foto/… atau galeri/video/…).
 */
class Gallery extends Model
{
    public const TYPES = ['foto' => 'Foto', 'video' => 'Video'];

    public const MAX_PHOTOS = 30;

    protected $fillable = ['title', 'subtitle', 'type', 'image', 'photos'];

    protected $attributes = ['type' => 'foto'];

    protected $casts = ['photos' => 'array'];

    protected $appends = ['image_url', 'file_name', 'photo_items'];

    public function getImageUrlAttribute() { return Package::mediaUrl($this->image); }

    public function getFileNameAttribute(): ?string { return $this->image ? basename($this->image) : null; }

    /** Path semua file media item ini (album foto → semua foto; video → satu file). */
    public function paths(): array
    {
        if ($this->isVideo()) {
            return array_filter([$this->image]);
        }

        return array_values(array_filter($this->photos ?: [$this->image]));
    }

    /** [{path, url, name}] untuk tampilan admin & halaman utama */
    public function getPhotoItemsAttribute(): array
    {
        if ($this->isVideo()) {
            return [];
        }

        return array_map(fn ($p) => ['path' => $p, 'url' => Package::mediaUrl($p), 'name' => basename($p)], $this->paths());
    }

    /** Simpan daftar foto album; foto pertama sekaligus jadi sampul. */
    public function setPhotoPaths(array $paths): void
    {
        $paths = array_values($paths);
        $this->photos = $paths;
        $this->image = $paths[0] ?? null;
    }

    public function isVideo(): bool { return $this->type === 'video'; }
}
