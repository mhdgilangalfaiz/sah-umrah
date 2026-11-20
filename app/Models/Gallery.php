<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Item galeri: foto atau video. `image` menyimpan path file di disk public (galeri/foto/… atau galeri/video/…).
 */
class Gallery extends Model
{
    public const TYPES = ['foto' => 'Foto', 'video' => 'Video'];

    public const CATEGORIES = ['umum' => 'Umum', 'makkah' => 'Makkah', 'madinah' => 'Madinah', 'hotel' => 'Hotel', 'manasik' => 'Manasik'];

    protected $fillable = ['title', 'type', 'image', 'category'];

    protected $attributes = ['type' => 'foto'];

    protected $appends = ['image_url', 'file_name'];

    public function getImageUrlAttribute() { return Package::mediaUrl($this->image); }

    public function getFileNameAttribute(): ?string { return $this->image ? basename($this->image) : null; }

    public function isVideo(): bool { return $this->type === 'video'; }
}
