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
        'account_id',
        'contact_id',
        'owner_id',
        'template_id',
        'invoice_number',
        'status',
        'currency',
        'exchange_rate',
        'overall_discount_type',
        'overall_discount_value',
        'subtotal',
        'discount_total',
        'tax_total',
        'grand_total',
        'due_date',
    ];

    protected $attributes = [
        'status' => 'DRAFT',
        'currency' => 'USD',
        'exchange_rate' => 1,
        'overall_discount_type' => 'PERCENT',
        'overall_discount_value' => 0,
        'subtotal' => 0,
        'discount_total' => 0,
        'tax_total' => 0,
        'grand_total' => 0,
    ];

    protected function casts(): array
    {
        return [
            'due_date' => 'datetime',
            'exchange_rate' => 'decimal:6',
            'overall_discount_value' => 'decimal:4',
            'subtotal' => 'decimal:2',
            'discount_total' => 'decimal:2',
            'tax_total' => 'decimal:2',
            'grand_total' => 'decimal:2',
        ];
    }

    public function tenant()
    {
        return $this->belongsTo(Tenant::class);
    }

    public function salesOrder()
    {
        return $this->belongsTo(SalesOrder::class);
    }

    public function account()
    {
        return $this->belongsTo(Account::class);
    }

    public function contact()
    {
        return $this->belongsTo(Contact::class);
    }

    public function owner()
    {
        return $this->belongsTo(User::class);
    }

    public function template()
    {
        return $this->belongsTo(QuoteTemplate::class, 'template_id');
    }

    public function lineItems()
    {
        return $this->hasMany(InvoiceLineItem::class)->orderBy('position');
    }
}
