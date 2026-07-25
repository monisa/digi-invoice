<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use App\Models\Concerns\SerializesCamelCase;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class SalesOrder extends Model
{
    use BelongsToTenant, HasUuids, SerializesCamelCase, SoftDeletes;

    protected $fillable = [
        'tenant_id',
        'quote_id',
        'order_number',
        'status',
    ];

    protected $attributes = [
        'status' => 'OPEN',
    ];

    public function quote()
    {
        return $this->belongsTo(Quote::class);
    }

    public function invoices()
    {
        return $this->hasMany(Invoice::class);
    }
}
