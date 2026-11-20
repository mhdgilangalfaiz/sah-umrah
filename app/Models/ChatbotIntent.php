<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ChatbotIntent extends Model
{
    protected $fillable = ['title', 'category', 'keywords', 'answer', 'quick_replies', 'hits', 'is_active'];

    protected function casts(): array
    {
        return ['quick_replies' => 'array', 'is_active' => 'boolean'];
    }
}
