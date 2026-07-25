<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use App\Models\Concerns\SerializesCamelCase;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Invoice extends Model
{
    use BelongsToTenant, HasUuids, SerializesCamelCase, SoftDeletes;

    protected $fillable = [
        'tenant_id',
        'sales_order_id',
        'invoice_number',
        'status',
        'due_date',
    ];

    protected $attributes = [
        'status' => 'DRAFT',
    ];

    protected function casts(): array
    {
        return [
            'due_date' => 'datetime',
        ];
    }

    public function salesOrder()
    {
        return $this->belongsTo(SalesOrder::class);
    }
}
