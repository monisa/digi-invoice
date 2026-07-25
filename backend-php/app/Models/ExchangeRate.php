<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use App\Models\Concerns\SerializesCamelCase;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class ExchangeRate extends Model
{
    use BelongsToTenant, HasUuids, SerializesCamelCase;

    const UPDATED_AT = null;

    protected $fillable = [
        'tenant_id',
        'base_currency',
        'target_currency',
        'rate',
        'effective_date',
    ];

    protected function casts(): array
    {
        return [
            'rate' => 'decimal:6',
            'effective_date' => 'date',
            'created_at' => 'datetime',
        ];
    }
}
