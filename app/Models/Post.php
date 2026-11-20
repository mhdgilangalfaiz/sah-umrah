<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Post extends Model
{
    protected $fillable = ['title', 'slug', 'excerpt', 'content', 'cover_image', 'author_id', 'published_at'];

    protected function casts(): array
    {
        return ['published_at' => 'datetime'];
    }

    protected $appends = ['cover_url'];
    public function getCoverUrlAttribute() { return Package::mediaUrl($this->cover_image); }
    public function author() { return $this->belongsTo(User::class, 'author_id'); }
    public function scopePublished($q) { return $q->whereNotNull('published_at')->where('published_at', '<=', now()); }
    public function getRouteKeyName(): string { return 'slug'; }
}
