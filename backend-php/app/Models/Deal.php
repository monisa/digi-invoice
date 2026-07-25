<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use App\Models\Concerns\SerializesCamelCase;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Deal extends Model
{
    use BelongsToTenant, HasUuids, SerializesCamelCase, SoftDeletes;

    protected $fillable = [
        'tenant_id',
        'account_id',
        'name',
        'stage',
        'amount',
        'currency',
        'expected_close_date',
    ];

    protected $attributes = [
        'stage' => 'PROSPECTING',
        'currency' => 'USD',
    ];

    protected function casts(): array
    {
        return [
            'expected_close_date' => 'date',
        ];
    }

    public function account()
    {
        return $this->belongsTo(Account::class);
    }
}
