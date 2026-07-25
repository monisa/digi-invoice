<?php

namespace App\Models;

use App\Models\Concerns\SerializesCamelCase;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class QuoteActivityLog extends Model
{
    use HasUuids, SerializesCamelCase;

    const UPDATED_AT = null;

    protected $fillable = [
        'quote_id',
        'user_id',
        'action',
        'details_json',
    ];

    protected function casts(): array
    {
        return [
            'details_json' => 'array',
            'created_at' => 'datetime',
        ];
    }

    public function quote()
    {
        return $this->belongsTo(Quote::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
