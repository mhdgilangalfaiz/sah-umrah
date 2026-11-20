<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Testimonial extends Model
{
    protected $fillable = ['name', 'city', 'content', 'rating', 'photo', 'is_active'];

    protected function casts(): array
    {
        return ['is_active' => 'boolean', 'rating' => 'integer'];
    }

    protected $appends = ['photo_url'];
    public function getPhotoUrlAttribute() { return Package::mediaUrl($this->photo); }
}
