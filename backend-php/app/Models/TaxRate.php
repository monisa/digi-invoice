<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use App\Models\Concerns\SerializesCamelCase;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class TaxRate extends Model
{
    use BelongsToTenant, HasUuids, SerializesCamelCase, SoftDeletes;

    protected $fillable = [
        'tenant_id',
        'name',
        'percentage',
    ];

    protected function casts(): array
    {
        return [
            'percentage' => 'decimal:4',
        ];
    }

    public function products()
    {
        return $this->hasMany(Product::class);
    }
}
