<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use App\Models\Concerns\SerializesCamelCase;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Product extends Model
{
    use BelongsToTenant, HasUuids, SerializesCamelCase, SoftDeletes;

    protected $fillable = [
        'tenant_id',
        'name',
        'sku',
        'unit_price',
        'currency',
        'tax_rate_id',
        'description',
    ];

    protected $attributes = [
        'currency' => 'USD',
    ];

    public function taxRate()
    {
        return $this->belongsTo(TaxRate::class);
    }
}
