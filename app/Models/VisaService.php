<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class VisaService extends Model
{
    protected $fillable = ['name', 'description', 'requirements', 'processing_days', 'price', 'is_active'];

    protected function casts(): array
    {
        return ['requirements' => 'array', 'is_active' => 'boolean', 'price' => 'integer'];
    }

    public function applications() { return $this->hasMany(VisaApplication::class); }
}
