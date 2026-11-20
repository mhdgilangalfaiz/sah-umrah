<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Gallery extends Model
{
    protected $fillable = ['title', 'image', 'category'];

    protected $appends = ['image_url'];
    public function getImageUrlAttribute() { return Package::mediaUrl($this->image); }
}
