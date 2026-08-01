<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class QuoteNumberSequence extends Model
{
    use BelongsToTenant, HasUuids;

    public $timestamps = false;

    protected $fillable = [
        'tenant_id',
        'prefix',
        'year',
        'last_value',
    ];

    protected $attributes = [
        'prefix' => 'QT',
        'last_value' => 0,
    ];
}
